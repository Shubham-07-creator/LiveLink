import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSignalingTestServer } from './setupSocketServer.js';

describe('Signaling Layer: Connection, Capacity & Single Presenter Rule', () => {
  let signaling;

  beforeAll(async () => {
    signaling = await startSignalingTestServer();
  });

  afterAll(async () => {
    await signaling.teardown();
  });

  it('rejects join with invalid room code format', async () => {
    const client = await signaling.createClient();
    const errorPromise = signaling.waitForEvent(client, 'join-error');

    client.emit('join-call', 'invalid_room_code!@#', 'TestUser', null, null);

    const error = await errorPromise;
    expect(error.message).toContain('Invalid room code format');
    client.disconnect();
  });

  it('allows 4 participants in standard group room and rejects 5th with room-full', async () => {
    const roomCode = 'abcd-efgh-2345';
    const clients = [];

    // Connect 4 users
    for (let i = 1; i <= 4; i++) {
      const client = await signaling.createClient();
      clients.push(client);
      const joinedPromise = signaling.waitForEvent(client, 'user-joined');
      client.emit('join-call', roomCode, `User_${i}`, null, null);
      await joinedPromise;
    }

    // 5th user attempts to join
    const client5 = await signaling.createClient();
    const roomFullPromise = signaling.waitForEvent(client5, 'room-full');

    client5.emit('join-call', roomCode, 'User_5', null, null);

    const fullInfo = await roomFullPromise;
    expect(fullInfo.max).toBe(4);
    expect(fullInfo.message).toContain('maximum capacity of 4 participants');

    // Clean up
    client5.disconnect();
    for (const c of clients) c.disconnect();
  });

  it('allows exactly 2 participants in private room (p- prefix) and rejects 3rd with room-full', async () => {
    const privateRoom = 'p-abcd-efgh-9876';
    const clients = [];

    // Connect 2 users
    for (let i = 1; i <= 2; i++) {
      const client = await signaling.createClient();
      clients.push(client);
      const joinedPromise = signaling.waitForEvent(client, 'user-joined');
      client.emit('join-call', privateRoom, `PrivateUser_${i}`, null, null);
      await joinedPromise;
    }

    // 3rd user attempts to join private room
    const client3 = await signaling.createClient();
    const roomFullPromise = signaling.waitForEvent(client3, 'room-full');

    client3.emit('join-call', privateRoom, 'PrivateUser_3', null, null);

    const fullInfo = await roomFullPromise;
    expect(fullInfo.max).toBe(2);
    expect(fullInfo.isPrivate).toBe(true);
    expect(fullInfo.message).toContain('private 1-on-1 call');

    // Clean up
    client3.disconnect();
    for (const c of clients) c.disconnect();
  });

  it('enforces single screen-share presenter rule and rejects second presenter', async () => {
    const roomCode = 'pres-test-3456';
    const clientA = await signaling.createClient();
    const clientB = await signaling.createClient();

    const joinAPromise = signaling.waitForEvent(clientA, 'user-joined');
    clientA.emit('join-call', roomCode, 'PresenterA', null, null);
    await joinAPromise;

    const joinBPromise = signaling.waitForEvent(clientB, 'user-joined');
    clientB.emit('join-call', roomCode, 'PresenterB', null, null);
    await joinBPromise;

    // Client A starts screen share
    const sharedBroadcastPromise = signaling.waitForEvent(clientB, 'screen-presenter-changed');
    clientA.emit('start-screen-share');
    const presenterAEvent = await sharedBroadcastPromise;
    expect(presenterAEvent.presenterId).toBe(clientA.id);

    // Client B attempts to share screen while Client A is active
    const rejectedPromise = signaling.waitForEvent(clientB, 'screen-share-rejected');
    clientB.emit('start-screen-share');

    const rejection = await rejectedPromise;
    expect(rejection.message).toContain('is already sharing their screen');

    // Client A stops sharing
    const stoppedBroadcastPromise = signaling.waitForEvent(clientB, 'screen-presenter-changed');
    clientA.emit('stop-screen-share');
    const presenterStopEvent = await stoppedBroadcastPromise;
    expect(presenterStopEvent.presenterId).toBeNull();

    // Now Client B can share successfully
    const secondShareBroadcast = signaling.waitForEvent(clientA, 'screen-presenter-changed');
    clientB.emit('start-screen-share');
    const secondShare = await secondShareBroadcast;
    expect(secondShare.presenterId).toBe(clientB.id);

    clientA.disconnect();
    clientB.disconnect();
  });
});
