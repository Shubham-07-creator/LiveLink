import type { LLMAdapter, StreamChatOptions, StreamEvent } from '../types';
import { logger } from '../../logger';

export class OllamaAdapter implements LLMAdapter {
  id = 'ollama';
  name = 'Ollama (Local / Free)';

  async *streamChat({
    messages,
    system,
    modelTier = 'fast',
    modelOverride,
    signal
  }: StreamChatOptions): AsyncGenerator<StreamEvent, void, unknown> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';

    const defaultModel =
      modelTier === 'smart'
        ? process.env.OLLAMA_MODEL_SMART || 'llama3.2:latest'
        : process.env.OLLAMA_MODEL_FAST || 'llama3.2:latest';

    const model = modelOverride || defaultModel;

    const formattedMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          stream: true
        }),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({ status: response.status, errorText }, 'Ollama call failed');
        yield {
          type: 'error',
          error: `Ollama error (${response.status}): ${errorText.slice(0, 200)}. Ensure Ollama is running locally.`
        };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'No response stream received from local Ollama instance' };
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
              // Ignore partial chunk
            }
          }
        }
      }

      yield { type: 'done', finishReason: 'stop' };
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        logger.info('Ollama stream aborted by user');
        yield { type: 'done', finishReason: 'abort' };
        return;
      }
      logger.error({ err }, 'Ollama stream error');
      yield {
        type: 'error',
        error: 'Could not connect to Ollama. Make sure Ollama is installed and running (`ollama serve`).'
      };
    }
  }
}
