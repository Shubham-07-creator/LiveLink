import type { LLMAdapter, StreamChatOptions, StreamEvent } from './types';
import { GeminiAdapter } from './adapters/gemini';
import { GroqAdapter } from './adapters/groq';
import { OpenRouterAdapter } from './adapters/openrouter';
import { OllamaAdapter } from './adapters/ollama';
import { recordProviderCall } from '../telemetry/metrics';
import { logger } from '../logger';

const adapters: Record<string, LLMAdapter> = {
  gemini: new GeminiAdapter(),
  groq: new GroqAdapter(),
  openrouter: new OpenRouterAdapter(),
  ollama: new OllamaAdapter()
};

export function getAdapter(id: string): LLMAdapter {
  const normalized = id.toLowerCase().trim();
  return adapters[normalized] || adapters.gemini;
}

/**
 * Executes a streaming chat request with automatic fallback on 429 or provider errors
 */
export async function* streamChat(options: StreamChatOptions): AsyncGenerator<StreamEvent, void, unknown> {
  const primaryId = (process.env.LLM_PROVIDER || 'gemini').toLowerCase().trim();
  const fallbackList = (process.env.FALLBACK_PROVIDERS || 'groq,openrouter,ollama')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id) => id && id !== primaryId && adapters[id]);

  const providerChain = [primaryId, ...fallbackList];

  let lastError: StreamEvent | null = null;
  let didEmitContent = false;

  for (let i = 0; i < providerChain.length; i++) {
    const currentProviderId = providerChain[i];
    const adapter = adapters[currentProviderId];

    if (!adapter) continue;

    logger.info({ provider: currentProviderId, attempt: i + 1 }, 'Initiating LLM stream');
    recordProviderCall({ provider: currentProviderId, isFallback: i > 0 });

    let providerFailed = false;
    let streamGenerator: AsyncGenerator<StreamEvent, void, unknown>;

    try {
      streamGenerator = adapter.streamChat(options);
    } catch (err) {
      logger.warn({ err, provider: currentProviderId }, 'Could not initialize adapter stream');
      recordProviderCall({ provider: currentProviderId, isError: true });
      continue;
    }

    try {
      for await (const event of streamGenerator) {
        if (event.type === 'error') {
          lastError = event;
          const is429 = Boolean(event.isRateLimit || (event.error && /rate\s*limit|429/i.test(event.error)));
          recordProviderCall({ provider: currentProviderId, isError: true, is429 });

          // If we haven't emitted text to the user yet and there are remaining fallback providers, failover
          if (!didEmitContent && i < providerChain.length - 1) {
            logger.warn(
              { error: event.error, failedProvider: currentProviderId, nextProvider: providerChain[i + 1] },
              'Provider failed or hit free rate limit. Failing over to backup provider.'
            );
            providerFailed = true;

            // Short jittered backoff on 429 to avoid hammering free endpoints
            if (is429) {
              const backoffMs = 150 + Math.floor(Math.random() * 150);
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
            }
            break;
          } else {
            yield event;
            return;
          }
        }

        if (event.type === 'text' || event.type === 'reasoning') {
          didEmitContent = true;
        }

        yield event;
      }

      if (!providerFailed) {
        return; // Successfully completed stream
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        yield { type: 'done', finishReason: 'abort' };
        return;
      }
      logger.error({ err, provider: currentProviderId }, 'Unexpected error during stream execution');
      recordProviderCall({ provider: currentProviderId, isError: true });

      if (i < providerChain.length - 1 && !didEmitContent) {
        continue;
      }
      yield { type: 'error', error: 'An error occurred while streaming response.' };
      return;
    }
  }

  // If all providers failed before emitting text
  yield (
    lastError || {
      type: 'error',
      error: 'Free limit reached across available providers. Please wait a minute and try again.',
      isRateLimit: true
    }
  );
}
