import { LRUCache } from 'lru-cache';
import { Redis } from '@upstash/redis';
import { logger } from '../logger';

// In-memory fallback caches
const memoryRateLimitCache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
  ttl: 60 * 1000 // 1 minute default
});

const memoryDailyUsageCache = new LRUCache<string, { messages: number; tokens: number; resetAt: number }>({
  max: 5000,
  ttl: 24 * 60 * 60 * 1000 // 24 hours
});

// Upstash Redis client (only instantiated if credentials exist)
const redis =
  process.env.REDIS_URL && process.env.REDIS_TOKEN
    ? new Redis({
        url: process.env.REDIS_URL,
        token: process.env.REDIS_TOKEN
      })
    : null;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  error?: string;
  isKillSwitchActive?: boolean;
}

export interface DailyUsageResult {
  allowed: boolean;
  messagesUsed: number;
  tokensUsed: number;
  messageLimit: number;
  tokenLimit: number;
  resetAt: number;
  error?: string;
}

/**
 * Checks per-minute rate limit for an identifier (e.g. IP address or User ID)
 */
export async function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60 * 1000
): Promise<RateLimitResult> {
  // 1. Global Kill-Switch Check
  if (process.env.AI_KILL_SWITCH === 'true') {
    return {
      success: false,
      limit,
      remaining: 0,
      resetAt: Date.now() + 60000,
      error: 'AI operations are temporarily paused by administrator.',
      isKillSwitchActive: true
    };
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  // 2. Upstash Redis strategy (if available)
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      const ttl = await redis.pttl(key);
      const remaining = Math.max(0, limit - count);

      return {
        success: count <= limit,
        limit,
        remaining,
        resetAt: now + (ttl > 0 ? ttl : windowMs),
        error: count > limit ? 'Rate limit exceeded. Please wait a minute before sending more requests.' : undefined
      };
    } catch (err) {
      logger.warn({ err }, 'Redis rate limiter failed, failing over to in-memory LRU');
    }
  }

  // 3. In-Memory LRU Cache Fallback (Zero Cost, No Redis Required)
  const existing = memoryRateLimitCache.get(key);
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    memoryRateLimitCache.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetAt
    };
  }

  existing.count += 1;
  memoryRateLimitCache.set(key, existing);

  const remaining = Math.max(0, limit - existing.count);
  const success = existing.count <= limit;

  return {
    success,
    limit,
    remaining,
    resetAt: existing.resetAt,
    error: !success ? 'Rate limit exceeded. Please wait a minute before sending more requests.' : undefined
  };
}

/**
 * Enforces per-user daily token & message caps to protect free tier quotas
 */
export async function checkDailyUsage(
  userId: string,
  estimatedTokens = 1000
): Promise<DailyUsageResult> {
  const maxMessages = parseInt(process.env.DAILY_USER_MESSAGE_LIMIT || '100', 10);
  const maxTokens = parseInt(process.env.DAILY_USER_TOKEN_LIMIT || '150000', 10);

  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const key = `daily:${userId}:${now.toISOString().slice(0, 10)}`;

  if (redis) {
    try {
      const data = await redis.hgetall<Record<string, string>>(key);
      const messagesUsed = parseInt(data?.messages || '0', 10);
      const tokensUsed = parseInt(data?.tokens || '0', 10);

      const allowed = messagesUsed < maxMessages && tokensUsed + estimatedTokens <= maxTokens;

      return {
        allowed,
        messagesUsed,
        tokensUsed,
        messageLimit: maxMessages,
        tokenLimit: maxTokens,
        resetAt: midnight,
        error: !allowed
          ? `Free daily limit reached (${messagesUsed}/${maxMessages} messages, ${tokensUsed}/${maxTokens} tokens). Resets at midnight.`
          : undefined
      };
    } catch (err) {
      logger.warn({ err }, 'Redis daily usage check failed, falling back to LRU');
    }
  }

  // In-Memory Fallback
  const record = memoryDailyUsageCache.get(key) || { messages: 0, tokens: 0, resetAt: midnight };
  const allowed = record.messages < maxMessages && record.tokens + estimatedTokens <= maxTokens;

  return {
    allowed,
    messagesUsed: record.messages,
    tokensUsed: record.tokens,
    messageLimit: maxMessages,
    tokenLimit: maxTokens,
    resetAt: record.resetAt,
    error: !allowed
      ? `Free daily limit reached (${record.messages}/${maxMessages} messages, ${record.tokens}/${maxTokens} tokens). Resets at midnight.`
      : undefined
  };
}

/**
 * Records tokens and messages after response completes
 */
export async function recordDailyUsage(userId: string, tokensUsed: number): Promise<void> {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const key = `daily:${userId}:${now.toISOString().slice(0, 10)}`;

  if (redis) {
    try {
      await redis.hincrby(key, 'messages', 1);
      await redis.hincrby(key, 'tokens', tokensUsed);
      await redis.pexpireat(key, midnight);
      return;
    } catch (err) {
      logger.warn({ err }, 'Redis record daily usage failed, recording in LRU');
    }
  }

  const record = memoryDailyUsageCache.get(key) || { messages: 0, tokens: 0, resetAt: midnight };
  record.messages += 1;
  record.tokens += tokensUsed;
  memoryDailyUsageCache.set(key, record);
}
