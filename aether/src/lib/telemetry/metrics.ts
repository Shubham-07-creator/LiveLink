import { logger } from '../logger';

export interface ProviderStat {
  requests: number;
  tokens: number;
  errors: number;
  rateLimits: number;
}

export interface AdminTelemetry {
  totalRequests: number;
  totalTokens: number;
  fallbackCount: number;
  rateLimitCount: number;
  errorCount: number;
  killSwitchActive: boolean;
  providers: Record<string, ProviderStat>;
}

const stats: AdminTelemetry = {
  totalRequests: 0,
  totalTokens: 0,
  fallbackCount: 0,
  rateLimitCount: 0,
  errorCount: 0,
  killSwitchActive: process.env.AI_KILL_SWITCH === 'true',
  providers: {
    gemini: { requests: 0, tokens: 0, errors: 0, rateLimits: 0 },
    groq: { requests: 0, tokens: 0, errors: 0, rateLimits: 0 },
    openrouter: { requests: 0, tokens: 0, errors: 0, rateLimits: 0 },
    ollama: { requests: 0, tokens: 0, errors: 0, rateLimits: 0 }
  }
};

export function recordProviderCall(params: {
  provider: string;
  tokens?: number;
  isFallback?: boolean;
  isError?: boolean;
  is429?: boolean;
}): void {
  const p = params.provider.toLowerCase();
  if (!stats.providers[p]) {
    stats.providers[p] = { requests: 0, tokens: 0, errors: 0, rateLimits: 0 };
  }

  stats.totalRequests += 1;
  stats.providers[p].requests += 1;

  if (params.tokens) {
    stats.totalTokens += params.tokens;
    stats.providers[p].tokens += params.tokens;
  }

  if (params.isFallback) {
    stats.fallbackCount += 1;
  }

  if (params.is429) {
    stats.rateLimitCount += 1;
    stats.providers[p].rateLimits += 1;
  }

  if (params.isError) {
    stats.errorCount += 1;
    stats.providers[p].errors += 1;
  }
}

export function getAdminMetrics(): AdminTelemetry {
  return {
    ...stats,
    providers: { ...stats.providers }
  };
}

export function setKillSwitch(active: boolean): void {
  stats.killSwitchActive = active;
  process.env.AI_KILL_SWITCH = active ? 'true' : 'false';
  logger.warn({ killSwitchActive: active }, 'AI Kill Switch state updated');
}

export function isKillSwitchActive(): boolean {
  return stats.killSwitchActive || process.env.AI_KILL_SWITCH === 'true';
}
