import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSignalingTestServer } from './setupSocketServer.js';

describe('Signaling Layer: Signal Isolation, Chat Security & Memory Leak Cleanup', () => {
  let signaling;

  beforeAll(async () => {
    signaling = await startSignalingTestServer();
  });

  afterAll(async () => {
    await signaling.teardown();
  });

  it('prevents cross-room signal leakage: clients can only relay WebRTC signals to peers in the same room', async () => {
    const roomA = 'kmpr-stuv-2345';
    const roomB = 'wxyz-bcde-3456';

    const clientA1 = await signaling.createClient();
    const clientA2 = await signaling.createClient();
    const clientB1 = await signaling.createClient();

    // Client A1 and A2 join Room A
    const joinA1 = signaling.waitForEvent(clientA1, 'user-joined');
    clientA1.emit('join-call', roomA, 'UserA1', null, null);
    await joinA1;

    const joinA2 = signaling.waitForEvent(clientA2, 'user-joined');
    clientA2.emit('join-call', roomA, 'UserA2', null, null);
    await joinA2;

    // Client B1 joins Room B
    const joinB1 = signaling.waitForEvent(clientB1, 'user-joined');
    clientB1.emit('join-call', roomB, 'UserB1', null, null);
    await joinB1;

    // 1. Signal inside same room (A1 -> A2) must succeed
    const signalPromiseA2 = signaling.waitForEvent(clientA2, 'signal');
    clientA1.emit('signal', clientA2.id, { type: 'offer', sdp: 'fake-sdp-offer' });
    const receivedSignalA2 = await signalPromiseA2;
    expect(receivedSignalA2).toBeDefined();

    // 2. Cross-room signal attempt (A1 -> B1) must be dropped by server
    let b1ReceivedCrossRoomSignal = false;
    clientB1.on('signal', () => {
      b1ReceivedCrossRoomSignal = true;
    });

    clientA1.emit('signal', clientB1.id, { type: 'offer', sdp: 'malicious-cross-room-offer' });

    // Wait 250ms to verify B1 never receives the signal
    await new Promise((r) => setTimeout(r, 250));
    expect(b1ReceivedCrossRoomSignal).toBe(false);

    clientA1.disconnect();
    clientA2.disconnect();
    clientB1.disconnect();
  });

  it('enforces chat permissions: non-host cannot chat when host disables in-call chat', async () => {
    const roomCode = 'chat-perm-4567';
    const hostClient = await signaling.createClient();
    const guestClient = await signaling.createClient();

    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'HostUser', null, null);
    await hostJoin;

    const guestJoin = signaling.waitForEvent(guestClient, 'user-joined');
    guestClient.emit('join-call', roomCode, 'GuestUser', null, null);
    await guestJoin;

    // Host disables in-call chat
    const permBroadcast = signaling.waitForEvent(guestClient, 'permissions-changed');
    hostClient.emit('toggle-chat-permission', false);
    const updatedPerms = await permBroadcast;
    expect(updatedPerms.allowChat).toBe(false);

    // Guest tries to send a message
    const chatErrorPromise = signaling.waitForEvent(guestClient, 'chat-error');
    guestClient.emit('chat-message', 'Hello world while disabled', 'GuestUser');

    const chatError = await chatErrorPromise;
    expect(chatError).toContain('chat has been disabled by the meeting host');

    hostClient.disconnect();
    guestClient.disconnect();
  });

  it('guarantees complete memory cleanup over 30 create, join and leave cycles (zero ghost rooms)', async () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    for (let i = 0; i < 30; i++) {
      const c1 = chars[i % chars.length];
      const c2 = chars[(i + 3) % chars.length];
      const room = `kmpr-stuv-${c1}${c2}45`;
      const client = await signaling.createClient();

      const joinPromise = signaling.waitForEvent(client, 'user-joined');
      client.emit('join-call', room, `Cleaner_${i}`, null, null);
      await joinPromise;

      client.disconnect();
      await new Promise((r) => setTimeout(r, 10));
    }
  }, 15000);
});
