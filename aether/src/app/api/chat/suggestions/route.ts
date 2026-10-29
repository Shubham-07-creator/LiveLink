import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdapter } from '@/lib/llm/router';
import { logger } from '@/lib/logger';

const suggestionsSchema = z.object({
  userPrompt: z.string().min(1),
  assistantResponse: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = suggestionsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { userPrompt, assistantResponse } = parsed.data;

    // Use fast model tier
    const adapter = getAdapter(process.env.LLM_PROVIDER || 'gemini');

    const prompt = `Based on this exchange:
User: "${userPrompt.slice(0, 300)}"
Assistant: "${assistantResponse.slice(0, 300)}"

Respond strictly in valid JSON format:
{
  "title": "3 to 5 words concise title without quotes",
  "suggestions": [
    "Short follow-up question 1",
    "Short follow-up question 2",
    "Short follow-up question 3"
  ]
}`;

    const stream = adapter.streamChat({
      messages: [{ role: 'user', content: prompt }],
      modelTier: 'fast'
    });

    let rawJson = '';
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        rawJson += chunk.delta;
      }
    }

    try {
      const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleaned);
      return NextResponse.json(parsedData);
    } catch {
      // Fallback
      return NextResponse.json({
        title: userPrompt.slice(0, 35) + '...',
        suggestions: [
          'Can you elaborate on this?',
          'How can I implement this in code?',
          'What are the key trade-offs?'
        ]
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Could not generate title or follow-ups');
    return NextResponse.json({
      title: 'New Conversation',
      suggestions: []
    });
  }
}
