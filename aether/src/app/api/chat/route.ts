import { NextResponse } from 'next/server';
import { z } from 'zod';
import { streamChat } from '@/lib/llm/router';
import { checkRateLimit, checkDailyUsage, recordDailyUsage } from '@/lib/rate-limit/limiter';
import { db, schema } from '@/lib/db';
import { logger } from '@/lib/logger';

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1)
    })
  ).min(1),
  conversationId: z.string().optional(),
  modelTier: z.enum(['fast', 'smart']).default('smart'),
  system: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Per-minute rate limit check
    const rateCheck = await checkRateLimit(`chat:${ip}`, 60, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    // 2. Daily token cap check
    const dailyCheck = await checkDailyUsage(`user:${ip}`, 1000);
    if (!dailyCheck.allowed) {
      return NextResponse.json({ error: dailyCheck.error }, { status: 429 });
    }

    const json = await req.json();
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid request body' }, { status: 400 });
    }

    const { messages, conversationId, modelTier, system } = parsed.data;

    // Upstream abort controller linked to client disconnect
    const abortController = new AbortController();
    req.signal.addEventListener('abort', () => {
      logger.info('Client closed connection or aborted generation');
      abortController.abort();
    });

    const stream = streamChat({
      messages,
      system,
      modelTier,
      signal: abortController.signal
    });

    let fullAssistantContent = '';
    let fullReasoningContent = '';

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (abortController.signal.aborted) break;

            if (event.type === 'text') {
              fullAssistantContent += event.delta;
            } else if (event.type === 'reasoning') {
              fullReasoningContent += event.delta;
            }

            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }

          // Record token usage (approx 4 chars per token)
          const estimatedTokens = Math.ceil(fullAssistantContent.length / 4);
          await recordDailyUsage(`user:${ip}`, estimatedTokens);

          // Save completed or partial message into database if DB is configured
          if (db && conversationId) {
            try {
              await db.insert(schema.messages).values({
                conversationId,
                sender: 'assistant',
                content: fullAssistantContent || '(Empty response)',
                thinkingContent: fullReasoningContent || null,
                inputTokens: Math.ceil(messages.reduce((acc, m) => acc + m.content.length, 0) / 4),
                outputTokens: estimatedTokens
              });
            } catch (dbErr) {
              logger.warn({ dbErr }, 'Could not persist message into database');
            }
          }

          controller.close();
        } catch (err) {
          logger.error({ err }, 'Stream piping error');
          controller.error(err);
        }
      }
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (err) {
    logger.error({ err }, 'Chat endpoint error');
    return NextResponse.json({ error: 'Internal server error processing chat request.' }, { status: 500 });
  }
}
