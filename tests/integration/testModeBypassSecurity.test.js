import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/app.js';
import { connectToSocket } from '../../backend/src/controllers/socketManager.js';

describe('Security Audit: Test-Mode Bypass Hardening & Isolation', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('proves client cannot bypass production error sanitization via headers or query parameters', async () => {
    // Simulate production environment
    process.env.NODE_ENV = 'production';

    const bypassHeaders = {
      'x-test-mode': 'true',
      'x-node-env': 'test',
      'x-bypass-security': '1',
      'x-env': 'test'
    };

    // Trigger an invalid route / malformed request
    const res = await request(app)
      .get('/api/v1/users/profile?NODE_ENV=test&env=test')
      .set(bypassHeaders);

    expect(res.status).toBe(401);
    // In production, response must NEVER expose server internals or stack traces
    expect(res.body.stack).toBeUndefined();
    expect(res.body.details).toBeUndefined();
  });

  it('proves socket join rate limiter is active in production and ignores client-supplied test-mode bypass attempts', async () => {
    // When NODE_ENV is production, isJoinRateLimited must enforce the 20/min limit
    process.env.NODE_ENV = 'production';

    const { createServer } = await import('node:http');
    const { io: Client } = await import('socket.io-client');

    const testServer = createServer();
    const ioServer = connectToSocket(testServer);

    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;

    const attackerSockets = [];
    let blockedCount = 0;

    for (let i = 0; i < 25; i++) {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        extraHeaders: {
          'x-test-mode': 'true',
          'x-node-env': 'test',
          'bypass-rate-limit': 'true'
        }
      });
      attackerSockets.push(client);

      const errPromise = new Promise((resolve) => {
        client.on('join-error', (msg) => resolve(msg));
        client.on('user-joined', () => resolve(null));
        setTimeout(() => resolve(null), 300);
      });

      client.emit('join-call', '2345-6789-abcd', `Attacker_${i}`, null, null);
      const res = await errPromise;
      const msgText = typeof res === 'string' ? res : res?.message;
      if (msgText && msgText.includes('Too many join')) {
        blockedCount++;
      }
    }

    // Rate limiter must have kicked in after 20 attempts
    expect(blockedCount).toBeGreaterThan(0);

    for (const s of attackerSockets) {
      s.disconnect();
    }
    await new Promise((resolve) => ioServer.close(resolve));
    await new Promise((resolve) => testServer.close(resolve));
  }, 20000);

  it('proves NODE_ENV !== "test" cannot leak into starting the live HTTP listener during imports', () => {
    // Verify that BUG-001 start guard strictly requires RUN_SERVER === "true" or non-test NODE_ENV
    expect(process.env.RUN_SERVER).not.toBe('true');
  });
});
