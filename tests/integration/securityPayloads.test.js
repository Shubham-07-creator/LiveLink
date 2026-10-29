import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './setupMongo.js';

describe('Backend Integration: Security Payloads, CORS & Rate Limits', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    vi.restoreAllMocks();
  });

  describe('NoSQL Injection Defenses', () => {
    it('rejects NoSQL injection operator in login email payload', async () => {
      const maliciousPayload = {
        email: { $gt: '' },
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/v1/users/login')
        .send(maliciousPayload);

      // Zod schema validation will fail because email must be a string
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Validation failed|expected string/i);
    });

    it('rejects NoSQL injection operator in token parameter', async () => {
      // Query injection: /profile?token[$gt]=
      const res = await request(app)
        .get('/api/v1/users/profile?token[$gt]=');

      // extractToken enforces (typeof raw === "string"), so object injection fails
      expect(res.status).toBe(401);
    });
  });

  describe('Payload Size & Parsing Defenses', () => {
    it('rejects oversized JSON request bodies exceeding 40kb limit with 413 Payload Too Large', async () => {
      const hugeObject = {
        name: 'HugePayload',
        padding: 'X'.repeat(45 * 1024) // 45KB > 40KB limit
      };

      const res = await request(app)
        .post('/api/v1/users/register')
        .send(hugeObject);

      expect(res.status).toBe(413);
    });

    it('handles malformed JSON payloads gracefully without leaking stack traces', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .set('Content-Type', 'application/json')
        .send('{"bad_json": ');

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
      expect(res.body.stack).toBeUndefined(); // Never leak stack trace
    });
  });

  describe('CORS Fixed Allowlist Enforcements', () => {
    it('accepts requests from allowlisted origins (e.g. http://localhost:3000)', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('rejects requests from unauthorized/evil origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://evil-attacker-site.com');

      // CORS handler returns error, resulting in 500 or omitted allow header
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('ICE / TURN Credentials Safety', () => {
    it('returns STUN/TURN servers without exposing permanent TURN_SECRET', async () => {
      process.env.TURN_URL = 'turn:relay.example.com:3478';
      process.env.TURN_SECRET = 'ultra-secret-key-that-must-never-be-leaked';

      const res = await request(app).get('/api/v1/users/ice_servers');

      expect(res.status).toBe(200);
      expect(res.body.iceServers).toBeDefined();
      expect(Array.isArray(res.body.iceServers)).toBe(true);

      const resString = JSON.stringify(res.body);
      // Permanent secret must NEVER appear anywhere in the HTTP response
      expect(resString).not.toContain('ultra-secret-key-that-must-never-be-leaked');
    });
  });

  describe('AI Summary Endpoint & Rate Limiting', () => {
    it('returns 503 when GEMINI_API_KEY is not configured', async () => {
      const oldKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const res = await request(app)
        .post('/api/v1/users/ai_summary')
        .send({ roomCode: 'room-1', transcript: 'Hello world meeting transcript' });

      expect(res.status).toBe(503);
      expect(res.body.message).toContain('not configured');

      process.env.GEMINI_API_KEY = oldKey;
    });

    it('generates summary when Gemini API responds with 200 and mocks fetch', async () => {
      process.env.GEMINI_API_KEY = 'fake-gemini-api-key-test';

      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{ text: '### Executive Summary\nAll project goals were agreed upon.' }]
          }
        }]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiResponse
      });

      const res = await request(app)
        .post('/api/v1/users/ai_summary')
        .send({
          roomCode: `ai-room-${Date.now()}`,
          transcript: 'Speaker A: Let us launch tomorrow. Speaker B: Agreed.'
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toContain('Executive Summary');
    });

    it('enforces rate limiting on rapid requests and returns friendly 429 message', async () => {
      process.env.GEMINI_API_KEY = 'fake-gemini-api-key-test';

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Summary' }] } }]
        })
      });

      // Rapid back-to-back request triggers the user/room rate limit
      const res = await request(app)
        .post('/api/v1/users/ai_summary')
        .send({ roomCode: 'rapid-room-1', transcript: 'Rapid transcript' });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/AI rate limit reached/i);
    });
  });
});
