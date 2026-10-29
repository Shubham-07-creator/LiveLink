import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../backend/src/app.js';
import { connectTestDb, clearTestDb, closeTestDb } from './setupMongo.js';
import { ScheduledMeeting } from '../../backend/src/models/scheduledMeeting.model.js';
import { Meeting } from '../../backend/src/models/meeting.model.js';
import { User } from '../../backend/src/models/user.model.js';

describe('Backend Integration: Multi-Tenant Authorization & Data Isolation', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  const userA = {
    name: 'Alice User',
    username: 'alice_tenant',
    email: 'alice.tenant@example.com',
    password: 'Password123!'
  };

  const userB = {
    name: 'Bob User',
    username: 'bob_tenant',
    email: 'bob.tenant@example.com',
    password: 'Password123!'
  };

  const setupUsers = async () => {
    const resA = await request(app).post('/api/v1/users/register').send(userA);
    const loginA = await request(app).post('/api/v1/users/login').send({ email: userA.email, password: userA.password });
    const tokenA = loginA.body.token;

    const resB = await request(app).post('/api/v1/users/register').send(userB);
    const loginB = await request(app).post('/api/v1/users/login').send({ email: userB.email, password: userB.password });
    const tokenB = loginB.body.token;

    return { tokenA, tokenB };
  };

  it('ensures User B cannot read User A meeting history', async () => {
    const { tokenA, tokenB } = await setupUsers();

    // User A adds a meeting to history
    await request(app)
      .post('/api/v1/users/add_to_activity')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        meeting_code: 'conf-alice-room-1',
        duration: 1200,
        participantCount: 4
      });

    // User A should see 1 meeting
    const resA = await request(app)
      .get('/api/v1/users/get_all_activity')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.length).toBe(1);
    expect(resA.body[0].meetingCode).toBe('conf-alice-room-1');

    // User B should see 0 meetings (isolated)
    const resB = await request(app)
      .get('/api/v1/users/get_all_activity')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.length).toBe(0);
  });

  it('ensures User B cannot delete User A meeting history', async () => {
    const { tokenA, tokenB } = await setupUsers();

    await request(app)
      .post('/api/v1/users/add_to_activity')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ meeting_code: 'conf-alice-room-2', duration: 600 });

    const meetingA = await Meeting.findOne({ meetingCode: 'conf-alice-room-2' });
    expect(meetingA).not.toBeNull();

    // User B attempts to delete User A's meeting
    await request(app)
      .delete('/api/v1/users/delete_activity')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ id: meetingA._id });

    // Meeting A must still exist in database
    const meetingAfterAttempt = await Meeting.findById(meetingA._id);
    expect(meetingAfterAttempt).not.toBeNull();
  });

  it('ensures User B cannot read or delete User A scheduled meetings', async () => {
    const { tokenA, tokenB } = await setupUsers();

    // User A schedules a meeting
    const scheduleRes = await request(app)
      .post('/api/v1/users/schedule_meeting')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Confidential Alice Strategy',
        meetingCode: 'strat-room-01',
        startTime: '2026-11-15T14:00:00Z',
        durationMinutes: 60
      });
    expect(scheduleRes.status).toBe(201);

    const scheduledMeeting = await ScheduledMeeting.findOne({ meetingCode: 'strat-room-01' });
    expect(scheduledMeeting).not.toBeNull();

    // User B fetches scheduled meetings: should be empty
    const resB = await request(app)
      .get('/api/v1/users/scheduled_meetings')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.length).toBe(0);

    // User B attempts to delete User A's scheduled meeting
    await request(app)
      .delete(`/api/v1/users/scheduled_meeting/${scheduledMeeting._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    // Scheduled meeting must still exist
    const meetingStillExists = await ScheduledMeeting.findById(scheduledMeeting._id);
    expect(meetingStillExists).not.toBeNull();
  });

  it('ensures unauthenticated requests are rejected across all sensitive routes', async () => {
    const sensitiveEndpoints = [
      { method: 'get', url: '/api/v1/users/profile' },
      { method: 'put', url: '/api/v1/users/profile', body: { name: 'Unauthorized' } },
      { method: 'put', url: '/api/v1/users/preferences', body: { theme: 'dark' } },
      { method: 'get', url: '/api/v1/users/scheduled_meetings' },
      { method: 'post', url: '/api/v1/users/schedule_meeting', body: { title: 'Hack', meetingCode: 'hack', startTime: new Date().toISOString() } },
      { method: 'get', url: '/api/v1/users/get_all_activity' },
      { method: 'post', url: '/api/v1/users/add_to_activity', body: { meeting_code: 'room-1' } },
      { method: 'post', url: '/api/v1/users/logout_all' }
    ];

    for (const ep of sensitiveEndpoints) {
      const req = request(app)[ep.method](ep.url);
      if (ep.body) {
        req.send(ep.body);
      }
      const res = await req;
      expect(res.status).toBe(401);
    }
  });
});
