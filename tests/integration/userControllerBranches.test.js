import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './setupMongo.js';
import { User } from '../../backend/src/models/user.model.js';
import { Feedback } from '../../backend/src/models/feedback.model.js';
import { OAuth2Client } from 'google-auth-library';
import { vi } from 'vitest';

describe('Backend Integration: User Controller Branch & Function Coverage', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const testUser = {
    name: 'Coverage User',
    username: 'coverage_user',
    email: 'coverage@example.com',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/photo-test.jpg'
  };

  async function registerAndLogin(userData = testUser) {
    await request(app).post('/api/v1/users/register').send(userData);
    const loginRes = await request(app).post('/api/v1/users/login').send({
      email: userData.email,
      password: userData.password
    });
    return loginRes.body.token;
  }

  it('covers sendVerificationEmail for unauthenticated, verified, and unverified users', async () => {
    // 1. Unauthenticated request
    const unauthRes = await request(app).post('/api/v1/users/send_verification_email');
    expect(unauthRes.status).toBe(401);

    // 2. Unverified user generates link
    const token = await registerAndLogin();
    const sendRes = await request(app)
      .post('/api/v1/users/send_verification_email')
      .set('Authorization', `Bearer ${token}`);
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.verifyLink).toBeDefined();

    // 3. Mark user verified, then request again -> rejected with 400
    const user = await User.findOne({ email: testUser.email });
    user.emailVerified = true;
    await user.save();

    const alreadyVerifiedRes = await request(app)
      .post('/api/v1/users/send_verification_email')
      .set('Authorization', `Bearer ${token}`);
    expect(alreadyVerifiedRes.status).toBe(400);
    expect(alreadyVerifiedRes.body.message).toMatch(/already verified/i);
  });

  it('covers forgotPassword for non-existent email and resetPassword with invalid token', async () => {
    // 1. Non-existent email returns generic 200 message
    const forgotRes = await request(app)
      .post('/api/v1/users/forgot_password')
      .send({ email: 'nonexistent_account@example.com' });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toMatch(/If an account exists/i);

    // 2. Reset password with invalid token
    const resetRes = await request(app)
      .post('/api/v1/users/reset_password')
      .send({ token: 'bogus-expired-token-hex', newPassword: 'BrandNewPassword123!' });
    expect(resetRes.status).toBe(400);
    expect(resetRes.body.message).toMatch(/Invalid or expired password reset link/i);
  });

  it('covers verifyEmail with invalid or expired token', async () => {
    const res = await request(app)
      .post('/api/v1/users/verify_email')
      .send({ token: 'fake-verification-token' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid or expired email verification link/i);
  });

  it('covers updateUserProfile and updatePreferences flows and avatar validations', async () => {
    const token = await registerAndLogin();

    // 1. Reject non-https avatar
    const badAvatarRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'http://insecure.com/pic.png' });
    expect(badAvatarRes.status).toBe(400);
    expect(badAvatarRes.body.message).toMatch(/https:\/\//i);

    // 2. Successful profile update
    const updateRes = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', phone: '+1234567890', avatar: 'https://secure.com/pic.png' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.user.name).toBe('Updated Name');
    expect(updateRes.body.user.phone).toBe('+1234567890');

    // 3. Update preferences
    const prefRes = await request(app)
      .put('/api/v1/users/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark', audioMutedOnEntry: true, videoOffOnEntry: true });
    expect(prefRes.status).toBe(200);
    expect(prefRes.body.preferences.theme).toBe('dark');
  });

  it('covers submitFeedback for both authenticated and anonymous attendees', async () => {
    const token = await registerAndLogin();

    // 1. Authenticated feedback
    const authFbRes = await request(app)
      .post('/api/v1/users/feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ meetingCode: 'abcd-efgh-2345', rating: 5, feedback: 'Super fast WebRTC video!' });
    expect(authFbRes.status).toBe(201);

    // Verify saved in DB with user_id
    const fbInDb = await Feedback.findOne({ meetingCode: 'abcd-efgh-2345' });
    expect(fbInDb).not.toBeNull();
    expect(fbInDb.user_id).toBe('coverageuser');

    // 2. Anonymous feedback
    const anonFbRes = await request(app)
      .post('/api/v1/users/feedback')
      .send({ meetingCode: 'p-1234-5678-9012', rating: 4, feedback: 'Good private call' });
    expect(anonFbRes.status).toBe(201);
  });

  it('covers logout with active token clearing database session fields', async () => {
    const token = await registerAndLogin();

    // User should have active session in DB
    const userBefore = await User.findOne({ email: testUser.email });
    expect(userBefore.token).toBeDefined();

    // Logout with Authorization header
    const logoutRes = await request(app)
      .post('/api/v1/users/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Database fields should be null
    const userAfter = await User.findOne({ email: testUser.email });
    expect(userAfter.token).toBeNull();
    expect(userAfter.refreshToken).toBeNull();
  });

  it('covers Google Auth account linking, avatar updating, and username collision incrementation', async () => {
    // 1. Existing local user with email 'google_link@example.com' (no googleId yet)
    await User.create({
      name: 'Local Existing',
      username: 'exist_user',
      email: 'google_link@example.com',
      password: 'HashedPassword123!',
      emailVerified: false
    });

    // Mock verifyIdToken for account linking
    const verifySpy = vi.spyOn(OAuth2Client.prototype, 'verifyIdToken');
    verifySpy.mockResolvedValueOnce({
      getPayload: () => ({
        aud: '968910378805-4g8t21a6rql0c8l8n3d0v5v6e0f8n3k9.apps.googleusercontent.com',
        sub: 'google-sub-link-999',
        email: 'google_link@example.com',
        name: 'Linked Google Name',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        email_verified: true
      })
    });

    const linkRes = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'valid-linking-credential' });
    expect(linkRes.status).toBe(200);

    const linkedUser = await User.findOne({ email: 'google_link@example.com' });
    expect(linkedUser.googleId).toBe('google-sub-link-999');
    expect(linkedUser.emailVerified).toBe(true);
    expect(linkedUser.name).toBe('Linked Google Name');

    // 2. Test candidate username collision counter in new Google user creation
    await User.create({
      name: 'First Collision',
      username: 'john',
      email: 'john1@example.com',
      emailVerified: true
    });

    verifySpy.mockResolvedValueOnce({
      getPayload: () => ({
        aud: '968910378805-4g8t21a6rql0c8l8n3d0v5v6e0f8n3k9.apps.googleusercontent.com',
        sub: 'google-sub-john-2',
        email: 'john@gmail.com',
        name: 'John Doe',
        picture: 'http://insecure-avatar.com/pic.png', // Tests line 273 (avatar nullification)
        email_verified: true
      })
    });

    const collisionRes = await request(app)
      .post('/api/v1/users/google_auth')
      .send({ credential: 'collision-credential' });
    expect(collisionRes.status).toBe(200);

    const newJohn = await User.findOne({ email: 'john@gmail.com' });
    expect(newJohn.username).toBe('john1'); // Counter incremented to avoid collision
    expect(newJohn.avatar).toContain('api.dicebear.com'); // Insecure avatar replaced by fallback
  });
});
