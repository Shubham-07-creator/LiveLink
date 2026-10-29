import type { LLMAdapter, StreamChatOptions, StreamEvent } from '../types';
import { logger } from '../../logger';

export class OpenRouterAdapter implements LLMAdapter {
  id = 'openrouter';
  name = 'OpenRouter (Free Models)';

  async *streamChat({
    messages,
    system,
    modelTier = 'fast',
    modelOverride,
    signal
  }: StreamChatOptions): AsyncGenerator<StreamEvent, void, unknown> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      yield {
        type: 'error',
        error: 'OPENROUTER_API_KEY is not configured in .env. Please configure your OpenRouter API key.'
      };
      return;
    }

    const defaultModel =
      modelTier === 'smart'
        ? process.env.OPENROUTER_MODEL_SMART || 'google/gemini-2.0-flash-exp:free'
        : process.env.OPENROUTER_MODEL_FAST || 'meta-llama/llama-3.2-3b-instruct:free';

    const model = modelOverride || defaultModel;

    const formattedMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Aether'
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          stream: true
        }),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        const is429 = response.status === 429 || errorText.toLowerCase().includes('rate limit');
        logger.warn({ status: response.status, errorText }, 'OpenRouter API call failed');

        yield {
          type: 'error',
          error: is429
            ? 'Free limit reached for OpenRouter. Try again in a minute.'
            : `OpenRouter error (${response.status}): ${errorText.slice(0, 200)}`,
          isRateLimit: is429
        };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'No response stream received from OpenRouter' };
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
              // Ignore partial parse
            }
          }
        }
      }

      yield { type: 'done', finishReason: 'stop' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        logger.info('OpenRouter stream aborted by user');
        yield { type: 'done', finishReason: 'abort' };
        return;
      }
      logger.error({ err }, 'OpenRouter stream error');
      yield { type: 'error', error: 'Failed to communicate with OpenRouter API.' };
    }
  }
}
