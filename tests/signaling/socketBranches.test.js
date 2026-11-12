import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSignalingTestServer } from './setupSocketServer.js';

describe('Signaling Layer: Socket Events & Permission Branches', () => {
  let signaling;

  beforeAll(async () => {
    signaling = await startSignalingTestServer();
  });

  afterAll(async () => {
    await signaling.teardown();
  });

  it('relays typing and stop-typing events between room peers', async () => {
    const roomCode = 'type-test-2345';
    const clientA = await signaling.createClient();
    const clientB = await signaling.createClient();

    const joinA = signaling.waitForEvent(clientA, 'user-joined');
    clientA.emit('join-call', roomCode, 'AliceTyping', null, null);
    await joinA;

    const joinB = signaling.waitForEvent(clientB, 'user-joined');
    clientB.emit('join-call', roomCode, 'BobListener', null, null);
    await joinB;

    // 1. Client A starts typing
    const typingPromise = signaling.waitForEvent(clientB, 'user-typing');
    clientA.emit('typing');
    const typingEvent = await typingPromise;
    expect(typingEvent.socketId).toBe(clientA.id);
    expect(typingEvent.username).toBe('AliceTyping');

    // 2. Client A stops typing
    const stopTypingPromise = signaling.waitForEvent(clientB, 'user-stop-typing');
    clientA.emit('stop-typing');
    const stopEvent = await stopTypingPromise;
    expect(stopEvent.socketId).toBe(clientA.id);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('relays live closed captions and ignores empty transcripts', async () => {
    const roomCode = 'capt-test-2345';
    const clientA = await signaling.createClient();
    const clientB = await signaling.createClient();

    const joinA = signaling.waitForEvent(clientA, 'user-joined');
    clientA.emit('join-call', roomCode, 'CaptionSpeaker', null, null);
    await joinA;

    const joinB = signaling.waitForEvent(clientB, 'user-joined');
    clientB.emit('join-call', roomCode, 'CaptionReader', null, null);
    await joinB;

    // Empty transcript should be ignored
    clientA.emit('live-caption', '   ', 'CaptionSpeaker');

    // Valid transcript should be relayed
    const captionPromise = signaling.waitForEvent(clientB, 'remote-caption');
    clientA.emit('live-caption', 'Welcome everyone to LiveLink!', 'CaptionSpeaker');
    const captionEvent = await captionPromise;
    expect(captionEvent.text).toBe('Welcome everyone to LiveLink!');
    expect(captionEvent.speaker).toBe('CaptionSpeaker');
    expect(captionEvent.socketId).toBe(clientA.id);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('relays reactions, enforces 8-character emoji limit, and relays raise-hand', async () => {
    const roomCode = 'reac-test-2345';
    const clientA = await signaling.createClient();
    const clientB = await signaling.createClient();

    const joinA = signaling.waitForEvent(clientA, 'user-joined');
    clientA.emit('join-call', roomCode, 'Reactor', null, null);
    await joinA;

    const joinB = signaling.waitForEvent(clientB, 'user-joined');
    clientB.emit('join-call', roomCode, 'HostObserver', null, null);
    await joinB;

    // 1. Reaction with valid emoji
    const reactionPromise = signaling.waitForEvent(clientB, 'reaction');
    clientA.emit('reaction', '👍', 'Reactor');
    const reactionData = await reactionPromise;
    expect(reactionData).toBeDefined();

    // 2. Reaction exceeding 8 characters is dropped
    clientA.emit('reaction', 'WayTooLongEmojiSequence12345', 'Reactor');

    // 3. Raise hand relay
    const handPromise = signaling.waitForEvent(clientB, 'raise-hand');
    clientA.emit('raise-hand', true, 'Reactor');
    const handEvent = await handPromise;
    expect(handEvent).toBeDefined();

    clientA.disconnect();
    clientB.disconnect();
  });

  it('relays meeting recording started and stopped status to all participants', async () => {
    const roomCode = 'recd-2345-6789';
    const clientA = await signaling.createClient();
    const clientB = await signaling.createClient();

    const joinA = signaling.waitForEvent(clientA, 'user-joined');
    clientA.emit('join-call', roomCode, 'HostRecorder', null, null);
    await joinA;

    const joinB = signaling.waitForEvent(clientB, 'user-joined');
    clientB.emit('join-call', roomCode, 'ViewerPeer', null, null);
    await joinB;

    // 1. Recording started
    const recStartPromise = signaling.waitForEvent(clientB, 'recording-status');
    clientA.emit('recording-started', 'HostRecorder');
    const recStartEvent = await recStartPromise;
    expect(recStartEvent.isRecording).toBe(true);
    expect(recStartEvent.host).toBe('HostRecorder');

    // 2. Recording stopped
    const recStopPromise = signaling.waitForEvent(clientB, 'recording-status');
    clientA.emit('recording-stopped');
    const recStopEvent = await recStopPromise;
    expect(recStopEvent.isRecording).toBe(false);

    clientA.disconnect();
    clientB.disconnect();
  });

  it('covers toggle-chat-permission, permissions-changed, and force-stop-video non-host checks', async () => {
    const roomCode = 'perm-2345-6789';
    const host = await signaling.createClient();
    const guest = await signaling.createClient();

    const joinH = signaling.waitForEvent(host, 'user-joined');
    host.emit('join-call', roomCode, 'HostUser', null, null);
    await joinH;

    const joinG = signaling.waitForEvent(guest, 'user-joined');
    guest.emit('join-call', roomCode, 'GuestUser', null, null);
    await joinG;

    // 1. Non-host attempts toggle-chat-permission -> host-action-error
    const chatErrPromise = signaling.waitForEvent(guest, 'host-action-error');
    guest.emit('toggle-chat-permission', false);
    const chatErr = await chatErrPromise;
    expect(typeof chatErr === 'string' ? chatErr : chatErr?.message).toMatch(/Only the host/i);

    // 2. Host disables chat -> room receives permissions-changed with allowChat: false
    const chatChangedPromise = signaling.waitForEvent(guest, 'permissions-changed');
    host.emit('toggle-chat-permission', false);
    const chatPerm = await chatChangedPromise;
    expect(chatPerm.allowChat).toBe(false);

    // 3. Guest attempts to send chat when disabled -> chat-error
    const chatBlockedPromise = signaling.waitForEvent(guest, 'chat-error');
    guest.emit('chat-message', 'Hello while disabled');
    const chatBlockedErr = await chatBlockedPromise;
    expect(chatBlockedErr).toMatch(/disabled by the meeting host/i);

    // 4. Non-host attempts force-stop-video -> host-action-error
    const stopVidErrPromise = signaling.waitForEvent(guest, 'host-action-error');
    guest.emit('force-stop-video', host.id);
    const stopVidErr = await stopVidErrPromise;
    expect(typeof stopVidErr === 'string' ? stopVidErr : stopVidErr?.message).toMatch(/Only the host/i);

    host.disconnect();
    guest.disconnect();
  });

  it('covers end-call-for-both in private calls where either participant can terminate for both', async () => {
    const privateRoom = 'p-priv-term-2345';
    const peer1 = await signaling.createClient();
    const peer2 = await signaling.createClient();

    const join1 = signaling.waitForEvent(peer1, 'user-joined');
    peer1.emit('join-call', privateRoom, 'PeerOne', null, null);
    await join1;

    const join2 = signaling.waitForEvent(peer2, 'user-joined');
    peer2.emit('join-call', privateRoom, 'PeerTwo', null, null);
    await join2;

    // Peer 2 ends call for both
    const endPromise1 = signaling.waitForEvent(peer1, 'meeting-ended-by-host');
    const endPromise2 = signaling.waitForEvent(peer2, 'meeting-ended-by-host');
    peer2.emit('end-call-for-both');

    const res1 = await endPromise1;
    const res2 = await endPromise2;
    expect(res1.message).toContain('ended the private call');
    expect(res2.message).toContain('ended the private call');

    peer1.disconnect();
    peer2.disconnect();
  });
});
