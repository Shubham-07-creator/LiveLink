import type { LLMAdapter, StreamChatOptions, StreamEvent } from '../types';
import { logger } from '../../logger';

export class GeminiAdapter implements LLMAdapter {
  id = 'gemini';
  name = 'Google Gemini (Free Tier)';

  async *streamChat({
    messages,
    system,
    modelTier = 'fast',
    modelOverride,
    signal
  }: StreamChatOptions): AsyncGenerator<StreamEvent, void, unknown> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      yield {
        type: 'error',
        error: 'GEMINI_API_KEY is not configured in .env. Please configure your free Google Gemini API key or switch provider.'
      };
      return;
    }

    const defaultModel =
      modelTier === 'smart'
        ? process.env.GEMINI_MODEL_SMART || 'gemini-3.5-flash'
        : process.env.GEMINI_MODEL_FAST || 'gemini-3.5-flash';

    const model = modelOverride || defaultModel;

    const formattedMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          stream: true,
          temperature: 0.7
        }),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        const is429 = response.status === 429 || errorText.includes('RESOURCE_EXHAUSTED');
        logger.warn({ status: response.status, errorText }, 'Gemini API call failed');

        yield {
          type: 'error',
          error: is429
            ? 'Free limit reached for Google Gemini. Try again in a minute.'
            : `Gemini API error (${response.status}): ${errorText.slice(0, 200)}`,
          isRateLimit: is429
        };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'No response stream received from Gemini API' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta;

              if (delta?.content) {
                yield { type: 'text', delta: delta.content };
              }
              if (delta?.reasoning_content || delta?.reasoning) {
                yield { type: 'reasoning', delta: delta.reasoning_content || delta.reasoning };
              }
            } catch {
              // Ignore partial parse failures
            }
          }
        }
      }

      yield { type: 'done', finishReason: 'stop' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        logger.info('Gemini stream aborted by user');
        yield { type: 'done', finishReason: 'abort' };
        return;
      }
      logger.error({ err }, 'Gemini stream error');
      yield { type: 'error', error: 'Failed to communicate with Gemini API.' };
    }
  }
}
