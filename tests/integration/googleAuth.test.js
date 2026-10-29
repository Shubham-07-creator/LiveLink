import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { OAuth2Client } from 'google-auth-library';
import { app } from '../../backend/src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './setupMongo.js';
import { User } from '../../backend/src/models/user.model.js';

describe('Backend Integration: Google OAuth Verification Flow', () => {
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

  const validPayload = {
    sub: 'google-sub-id-1234567890',
    email: 'realgoogleuser@gmail.com',
    email_verified: true,
    name: 'Real Google User',
    aud: '968910378805-07msgdo5roiq6ko7em1mk8g2371ebq6r.apps.googleusercontent.com',
    azp: '968910378805-07msgdo5roiq6ko7em1mk8g2371ebq6r.apps.googleusercontent.com',
    picture: 'https://lh3.googleusercontent.com/a/valid-avatar-pic'
  };

  it('authenticates valid Google ID token, creating user and returning session token', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => validPayload
    });

    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'valid-cryptographic-id-token-string' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validPayload.email);
    expect(res.body.user.isGoogleUser).toBe(true);
    expect(res.body.user.emailVerified).toBe(true);

    const userInDb = await User.findOne({ email: validPayload.email });
    expect(userInDb).not.toBeNull();
    expect(userInDb.googleId).toBe(validPayload.sub);
  });

  it('rejects Google token with mismatched/unauthorized audience (wrong recipient)', async () => {
    const wrongAudiencePayload = {
      ...validPayload,
      aud: '111111111111-wrong-client-id.apps.googleusercontent.com',
      azp: '111111111111-wrong-client-id.apps.googleusercontent.com'
    };

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => wrongAudiencePayload
    });

    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'token-for-another-client-app' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid Google token recipient');
  });

  it('rejects Google accounts where email_verified is false', async () => {
    const unverifiedEmailPayload = {
      ...validPayload,
      email_verified: false
    };

    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => unverifiedEmailPayload
    });

    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'unverified-email-id-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Google account email is not verified');
  });

  it('rejects expired Google ID tokens with friendly error', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
      new Error('Token used too late, crypto timestamp expired')
    );

    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'expired-google-id-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Google authentication failed');
  });

  it('rejects tampered or forged Google ID tokens', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
      new Error('Invalid token signature')
    );

    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'forged-or-tampered-token' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid token signature');
  });

  it('ignores client-supplied email and identity fields, strictly enforcing payload claims', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => validPayload
    });

    // Attacker tries to impersonate admin@company.com by sending it in the request body
    const res = await request(app)
      .post('/api/v1/users/google_auth')
      .send({
        credential: 'valid-google-id-token-string',
        email: 'attacker-spoofed-admin@company.com',
        name: 'Spoofed Admin'
      });

    expect(res.status).toBe(200);
    // Verified user in response and DB MUST be the one from Google payload
    expect(res.body.user.email).toBe(validPayload.email);
    expect(res.body.user.email).not.toBe('attacker-spoofed-admin@company.com');

    const spoofedInDb = await User.findOne({ email: 'attacker-spoofed-admin@company.com' });
    expect(spoofedInDb).toBeNull();
  });
});
