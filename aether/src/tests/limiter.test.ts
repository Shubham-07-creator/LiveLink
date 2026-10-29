import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { checkRateLimit, checkDailyUsage, recordDailyUsage } from '../lib/rate-limit/limiter';

describe('Aether Rate Limiter & Usage Tracker (Zero-Cost)', () => {
  beforeEach(() => {
    delete process.env.AI_KILL_SWITCH;
  });

  it('allows requests within the allowed rate limit', async () => {
    const testId = `user-test-${Date.now()}`;
    const result = await checkRateLimit(testId, 5, 1000);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.remaining, 4);
    assert.strictEqual(result.limit, 5);
  });

  it('rejects requests when rate limit is exceeded', async () => {
    const testId = `user-flood-${Date.now()}`;
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      const res = await checkRateLimit(testId, limit, 1000);
      assert.strictEqual(res.success, true);
    }
    // 4th request should fail
    const blocked = await checkRateLimit(testId, limit, 1000);
    assert.strictEqual(blocked.success, false);
    assert.strictEqual(blocked.remaining, 0);
    assert.ok(blocked.error?.includes('Rate limit exceeded'));
  });

  it('immediately blocks requests when AI_KILL_SWITCH is enabled', async () => {
    process.env.AI_KILL_SWITCH = 'true';
    const result = await checkRateLimit('any-user', 10, 1000);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.isKillSwitchActive, true);
    assert.ok(result.error?.includes('temporarily paused'));
  });

  it('tracks daily message and token caps properly', async () => {
    process.env.DAILY_USER_MESSAGE_LIMIT = '3';
    process.env.DAILY_USER_TOKEN_LIMIT = '5000';
    const userId = `cap-user-${Date.now()}`;

    // Initially allowed
    const check1 = await checkDailyUsage(userId, 500);
    assert.strictEqual(check1.allowed, true);

    // Record usage
    await recordDailyUsage(userId, 2000);
    await recordDailyUsage(userId, 2000);
    await recordDailyUsage(userId, 1000); // 3 messages, 5000 tokens

    // 4th message should be rejected
    const checkBlocked = await checkDailyUsage(userId, 100);
    assert.strictEqual(checkBlocked.allowed, false);
    assert.ok(checkBlocked.error?.includes('daily limit reached'));
  });
});
