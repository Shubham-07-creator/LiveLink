import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startSignalingTestServer } from './setupSocketServer.js';

describe('Signaling Layer: Host Controls, Waiting Room & Succession', () => {
  let signaling;

  beforeAll(async () => {
    signaling = await startSignalingTestServer();
  });

  afterAll(async () => {
    await signaling.teardown();
  });

  it('rejects host actions from non-host sockets with host-action-error', async () => {
    // Valid room code using unambiguous alphabet [2-9a-km-z]
    const roomCode = 'kmpq-wxyz-2345';
    const hostClient = await signaling.createClient();
    const guestClient = await signaling.createClient();

    // Host joins first
    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'HostUser', null, null);
    await hostJoin;

    // Guest joins second
    const guestJoin = signaling.waitForEvent(guestClient, 'user-joined');
    guestClient.emit('join-call', roomCode, 'GuestUser', null, null);
    await guestJoin;

    // Guest attempts unauthorized host actions
    const unauthorizedActions = [
      { event: 'lock-room', payload: true },
      { event: 'mute-participant', payload: hostClient.id },
      { event: 'mute-all', payload: null },
      { event: 'remove-participant', payload: hostClient.id },
      { event: 'spotlight-participant', payload: guestClient.id },
      { event: 'admit-user', payload: 'some-socket-id' },
      { event: 'deny-user', payload: 'some-socket-id' }
    ];

    for (const act of unauthorizedActions) {
      const errPromise = signaling.waitForEvent(guestClient, 'host-action-error');
      guestClient.emit(act.event, act.payload);
      const errMsg = await errPromise;
      expect(typeof errMsg === 'string' ? errMsg : errMsg?.message).toMatch(/Only the host|host/i);
    }

    hostClient.disconnect();
    guestClient.disconnect();
  });

  it('handles waiting room admission and denial when room is locked', async () => {
    const roomCode = 'bcde-fghj-3456';
    const hostClient = await signaling.createClient();

    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'HostUser', null, null);
    await hostJoin;

    // Host locks the room
    const lockBroadcast = signaling.waitForEvent(hostClient, 'room-lock-changed');
    hostClient.emit('lock-room', true);
    const lockRes = await lockBroadcast;
    expect(lockRes.isLocked).toBe(true);

    // Guest 1 attempts to join locked room -> placed in waiting room
    const guest1 = await signaling.createClient();
    const waitingPromise = signaling.waitForEvent(guest1, 'waiting-for-admission');
    const hostWaitUpdatePromise = signaling.waitForEvent(hostClient, 'waiting-users-list');

    guest1.emit('join-call', roomCode, 'WaitingGuest1', null, null);

    const waitInfo = await waitingPromise;
    expect(waitInfo.message).toMatch(/wait/i);

    const hostWaitList = await hostWaitUpdatePromise;
    expect(Array.isArray(hostWaitList)).toBe(true);
    expect(hostWaitList.some(u => u.socketId === guest1.id)).toBe(true);

    // Host admits Guest 1
    const admitPromise = signaling.waitForEvent(guest1, 'admission-granted');
    hostClient.emit('admit-user', guest1.id);
    await admitPromise;

    // Guest 2 attempts to join -> placed in waiting room -> Host denies
    const guest2 = await signaling.createClient();
    const waiting2Promise = signaling.waitForEvent(guest2, 'waiting-for-admission');
    guest2.emit('join-call', roomCode, 'DeniedGuest2', null, null);
    await waiting2Promise;

    const deniedPromise = signaling.waitForEvent(guest2, 'admission-denied');
    hostClient.emit('deny-user', guest2.id);
    const deniedInfo = await deniedPromise;
    expect(deniedInfo.message).toMatch(/declined|denied/i);

    hostClient.disconnect();
    guest1.disconnect();
    guest2.disconnect();
  });

  it('promotes next participant to host when current host leaves (host succession)', async () => {
    const roomCode = 'rstu-vwxy-4567';
    const hostClient = await signaling.createClient();
    const guestClient = await signaling.createClient();

    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'InitialHost', null, null);
    await hostJoin;

    const guestJoin = signaling.waitForEvent(guestClient, 'user-joined');
    guestClient.emit('join-call', roomCode, 'NextHostCandidate', null, null);
    await guestJoin;

    // Host disconnects
    const hostChangedPromise = signaling.waitForEvent(guestClient, 'host-changed');
    hostClient.disconnect();

    const newHostEvent = await hostChangedPromise;
    // Guest should now be promoted to host
    expect(newHostEvent.hostSocketId).toBe(guestClient.id);

    // Guest can now successfully execute host actions without error
    const lockBroadcast = signaling.waitForEvent(guestClient, 'room-lock-changed');
    guestClient.emit('lock-room', true);
    const lockRes = await lockBroadcast;
    expect(lockRes.isLocked).toBe(true);

    guestClient.disconnect();
  });

  it('allows host to execute force-stop-video, spotlight, mute-all, toggle-ai-summary and end-meeting-for-all', async () => {
    const roomCode = 'host-exec-2345';
    const hostClient = await signaling.createClient();
    const guestClient = await signaling.createClient();

    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'HostUser', null, null);
    await hostJoin;

    const guestJoin = signaling.waitForEvent(guestClient, 'user-joined');
    guestClient.emit('join-call', roomCode, 'GuestUser', null, null);
    await guestJoin;

    // 1. Host force-stop-video
    const forceVideoPromise = signaling.waitForEvent(guestClient, 'force-video-off');
    hostClient.emit('force-stop-video', guestClient.id);
    const videoOffEvent = await forceVideoPromise;
    expect(videoOffEvent.requestedBy).toBe('HostUser');

    // 2. Host spotlight participant
    const spotlightPromise = signaling.waitForEvent(guestClient, 'spotlight-changed');
    hostClient.emit('spotlight-participant', guestClient.id);
    const spotlightEvent = await spotlightPromise;
    expect(spotlightEvent.spotlightId).toBe(guestClient.id);

    // 3. Host mute all
    const muteAllPromise = signaling.waitForEvent(guestClient, 'force-mute');
    hostClient.emit('mute-all');
    const muteEvent = await muteAllPromise;
    expect(muteEvent.mutedBy).toBe('HostUser');

    // 4. Host toggle AI summary
    const aiPromise = signaling.waitForEvent(guestClient, 'ai-summary-status-changed');
    hostClient.emit('toggle-ai-summary', true);
    const aiEvent = await aiPromise;
    expect(aiEvent.enabled).toBe(true);

    // 5. Non-host cannot end-meeting-for-all
    const nonHostEndPromise = signaling.waitForEvent(guestClient, 'host-action-error');
    guestClient.emit('end-meeting-for-all');
    const nonHostEndErr = await nonHostEndPromise;
    expect(typeof nonHostEndErr === 'string' ? nonHostEndErr : nonHostEndErr?.message).toMatch(/Only the host/i);

    // 6. Host ends meeting for all
    const endForAllPromise = signaling.waitForEvent(guestClient, 'meeting-ended-by-host');
    hostClient.emit('end-meeting-for-all');
    const endEvent = await endForAllPromise;
    expect(endEvent.hostName).toBe('HostUser');

    hostClient.disconnect();
    guestClient.disconnect();
  });

  it('enforces host screen-share permissions and releases presenter lock when host kicks presenter', async () => {
    const roomCode = 'perm-pres-2345';
    const hostClient = await signaling.createClient();
    const guestClient = await signaling.createClient();

    const hostJoin = signaling.waitForEvent(hostClient, 'user-joined');
    hostClient.emit('join-call', roomCode, 'HostUser', null, null);
    await hostJoin;

    const guestJoin = signaling.waitForEvent(guestClient, 'user-joined');
    guestClient.emit('join-call', roomCode, 'GuestUser', null, null);
    await guestJoin;

    // 1. Host disables screen share for participants
    hostClient.emit('toggle-screen-share-permission', false);

    // 2. Guest attempts screen share -> rejected
    const rejectedPromise = signaling.waitForEvent(guestClient, 'screen-share-rejected');
    guestClient.emit('start-screen-share');
    const rejEvent = await rejectedPromise;
    expect(rejEvent.message).toMatch(/disabled by the meeting host/i);

    // 3. Host re-enables screen share
    hostClient.emit('toggle-screen-share-permission', true);

    // 4. Guest starts screen share -> approved
    const approvedPromise = signaling.waitForEvent(guestClient, 'screen-share-approved');
    guestClient.emit('start-screen-share');
    await approvedPromise;

    // 5. Host removes guest who is actively presenting -> screen lock is released immediately
    const presenterReleasePromise = signaling.waitForEvent(hostClient, 'screen-presenter-changed');
    hostClient.emit('remove-participant', guestClient.id);
    const releaseEvent = await presenterReleasePromise;
    expect(releaseEvent.presenterId).toBeNull();

    hostClient.disconnect();
    guestClient.disconnect();
  });
});
