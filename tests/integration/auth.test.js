import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './setupMongo.js';
import { User } from '../../backend/src/models/user.model.js';

describe('Backend Integration: Authentication Flow', () => {
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
    name: 'Alice Wonder',
    username: 'alice_wonder',
    email: 'alice@example.com',
    password: 'Password123!',
    avatar: 'https://images.unsplash.com/alice.jpg'
  };

  it('registers a new user and sets secure httpOnly cookies', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Account created successfully');

    // Verify user saved in MongoDB
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).not.toBeNull();
    expect(userInDb.name).toBe(testUser.name);
    expect(userInDb.password).not.toBe(testUser.password); // Password must be bcrypt-hashed
  });

  it('rejects registration with duplicate email or username', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);

    const dupRes = await request(app)
      .post('/api/v1/users/register')
      .send(testUser);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toMatch(/already registered|already exists/i);
  });

  it('logs in with email and password, setting token and refreshToken cookies', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe(testUser.email);

    // Verify cookies set
    const setCookieHeaders = loginRes.headers['set-cookie'];
    expect(setCookieHeaders).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeaders) ? setCookieHeaders.join(';') : setCookieHeaders;
    expect(cookieStr).toContain('token=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('rejects login with incorrect password', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: 'WrongPassword999!' });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toContain('Invalid credentials');
  });

  it('refreshes token using valid refreshToken cookie', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);
    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: testUser.password });

    const cookies = loginRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/v1/users/refresh_token')
      .set('Cookie', cookies);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toBeDefined();
  });

  it('clears auth cookies on logout', async () => {
    const res = await request(app).post('/api/v1/users/logout');
    expect(res.status).toBe(200);

    const setCookieHeaders = res.headers['set-cookie'];
    if (setCookieHeaders) {
      const cookieStr = Array.isArray(setCookieHeaders) ? setCookieHeaders.join(';') : setCookieHeaders;
      // Cleared cookies have expires in the past or max-age=0
      expect(cookieStr).toMatch(/expires=|Max-Age=0/i);
    }
  });

  it('invalidates all active sessions on logout_all (tokenVersion increment)', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);
    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: testUser.password });

    const initialToken = loginRes.body.token;

    // Verify initial token works for profile
    const profileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(profileRes.status).toBe(200);

    // Call logout_all with the initial token
    const logoutAllRes = await request(app)
      .post('/api/v1/users/logout_all')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(logoutAllRes.status).toBe(200);

    // Initial token MUST now be rejected as tokenVersion was incremented
    const postLogoutProfileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${initialToken}`);
    expect(postLogoutProfileRes.status).toBe(401);
  });

  it('deletes user account and invalidates authentication permanently', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);
    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.token;

    const delRes = await request(app)
      .delete('/api/v1/users/delete_account')
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    // User should no longer exist in DB
    const userInDb = await User.findOne({ email: testUser.email });
    expect(userInDb).toBeNull();

    // Subsequent access with deleted user token fails
    const profileRes = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.status).toBe(401);
  });

  it('completes full password reset flow', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);

    // 1. Request password reset
    const forgotRes = await request(app)
      .post('/api/v1/users/forgot_password')
      .send({ email: testUser.email });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.resetToken).toBeDefined();

    const resetToken = forgotRes.body.resetToken;

    // 2. Submit new password
    const newPassword = 'NewSecretPassword456!';
    const resetRes = await request(app)
      .post('/api/v1/users/reset_password')
      .send({ token: resetToken, newPassword });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain('reset successfully');

    // 3. Old password should fail
    const oldLogin = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(oldLogin.status).toBe(401);

    // 4. New password should succeed
    const newLogin = await request(app)
      .post('/api/v1/users/login')
      .send({ email: testUser.email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.token).toBeDefined();
  });

  it('completes email verification flow with valid verification token', async () => {
    await request(app).post('/api/v1/users/register').send(testUser);

    const user = await User.findOne({ email: testUser.email });
    expect(user.verificationToken).toBeDefined();
    expect(user.emailVerified).toBe(false);

    const verifyRes = await request(app)
      .post('/api/v1/users/verify_email')
      .send({ token: user.verificationToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.message).toContain('Email verified successfully');

    const verifiedUser = await User.findOne({ email: testUser.email });
    expect(verifiedUser.emailVerified).toBe(true);
  });
});
