export interface MessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChatOptions {
  messages: MessagePayload[];
  system?: string;
  modelTier?: 'fast' | 'smart';
  modelOverride?: string;
  signal?: AbortSignal;
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'reasoning'; delta: string }
  | { type: 'error'; error: string; isRateLimit?: boolean }
  | { type: 'done'; finishReason?: string; tokensUsed?: number };

export interface LLMAdapter {
  id: string;
  name: string;
  streamChat(options: StreamChatOptions): AsyncGenerator<StreamEvent, void, unknown>;
}
