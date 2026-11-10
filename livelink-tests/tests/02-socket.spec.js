const { test, expect } = require('@playwright/test');
const cfg = require('../config');
const { roomCode, warn, createUser } = require('../helpers/common');
const { connect, tryJoin, sleep, closeAll } = require('../helpers/socket');

let auth;
test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  auth = await createUser(request);
  await request.dispose();
});

test('socket server accepts a connection', async () => {
  const s = await connect(auth);
  expect(s.connected).toBeTruthy();
  s.close();
});

test('socket rejects a connection from an evil origin', async () => {
  const { io } = require('socket.io-client');
  const result = await new Promise((resolve) => {
    const s = io(cfg.SOCKET_URL, { transports: ['websocket'], reconnection: false, extraHeaders: { origin: 'https://evil.example' }, timeout: 8000 });
    s.on('connect', () => { s.close(); resolve('connected'); });
    s.on('connect_error', () => { s.close(); resolve('blocked'); });
  });
  expect(result, 'Socket.IO accepts any origin: set a fixed CORS allowlist for sockets too').toBe('blocked');
});

test('invalid room codes are rejected', async () => {
  const bad = ['', 'x', '../../etc/passwd', '<script>alert(1)</script>', 'A'.repeat(5000), 'abc def ghi'];
  const sockets = [];
  try {
    for (const room of bad) {
      const s = await connect(auth);
      sockets.push(s);
      const r = await tryJoin(s, room);
      expect(r.admitted, `invalid room "${room.slice(0, 30)}" was admitted`).toBeFalsy();
    }
  } finally { closeAll(sockets); }
});

test(`standard room: ${cfg.MAX_PARTICIPANTS} join, the next one is rejected`, async () => {
  const room = roomCode();
  const sockets = [];
  try {
    for (let i = 0; i < cfg.MAX_PARTICIPANTS; i++) {
      const s = await connect(auth);
      sockets.push(s);
      const r = await tryJoin(s, room, 'U' + i, 1200);
      expect(r.admitted, `user ${i + 1} was rejected: ${r.why}`).toBeTruthy();
    }
    const extra = await connect(auth);
    sockets.push(extra);
    const r = await tryJoin(extra, room, 'Extra');
    expect(r.admitted, `user ${cfg.MAX_PARTICIPANTS + 1} was admitted: room limit is broken`).toBeFalsy();
  } finally { closeAll(sockets); }
});

test('private 1-on-1 room admits exactly 2 even under a race', async () => {
  for (let round = 0; round < 5; round++) {
    const room = roomCode('p-');
    const sockets = await Promise.all(Array.from({ length: 8 }, () => connect(auth)));
    try {
      const results = await Promise.all(sockets.map((s, i) => tryJoin(s, room, 'R' + i, 3000)));
      const admitted = results.filter((r) => r.admitted).length;
      expect(admitted, `round ${round + 1}: ${admitted} users got into a private room (race condition)`).toBe(2);
    } finally { closeAll(sockets); }
  }
});

test('non-host cannot use host-only events', async () => {
  const room = roomCode();
  const [host, guest, victim] = await Promise.all([connect(auth), connect(auth), connect(auth)]);
  try {
    expect((await tryJoin(host, room, 'Host', 1200)).admitted).toBeTruthy();
    await tryJoin(guest, room, 'Guest', 1200);
    await tryJoin(victim, room, 'Victim', 1200);
    victim.__events.length = 0;
    for (const ev of cfg.EVENTS.hostOnly) {
      guest.emit(ev, cfg.hostPayload(room, victim.id));
      guest.emit(ev, victim.id);
    }
    await sleep(2000);
    const hit = victim.__events.filter((e) => /mute|force|kick|remove|disconnect-user|lock|spotlight/i.test(e.name));
    expect(hit.map((e) => e.name), 'a guest triggered host-only actions on another user').toEqual([]);
    expect(victim.connected, 'guest was able to disconnect another user').toBeTruthy();
  } finally { closeAll([host, guest, victim]); }
});

test('signals cannot be sent across rooms', async () => {
  const a = await connect(auth);
  const b = await connect(auth);
  try {
    await tryJoin(a, roomCode(), 'A', 1000);
    await tryJoin(b, roomCode(), 'B', 1000);
    b.__events.length = 0;
    a.emit(cfg.EVENTS.signal, b.id, JSON.stringify({ sdp: { type: 'offer', sdp: 'v=0' } }));
    a.emit(cfg.EVENTS.signal, { to: b.id, toId: b.id, signal: { type: 'offer' } });
    await sleep(1500);
    const got = b.__events.filter((e) => e.name === cfg.EVENTS.signal);
    expect(got.length, 'a user in another room received a WebRTC signal').toBe(0);
  } finally { closeAll([a, b]); }
});

test('server survives chat flooding and a 5MB message', async () => {
  const room = roomCode();
  const a = await connect(auth);
  const b = await connect(auth);
  try {
    await tryJoin(a, room, 'A', 1000);
    await tryJoin(b, room, 'B', 1000);
    for (let i = 0; i < 300; i++) a.emit(cfg.EVENTS.chat, 'flood ' + i, 'A', a.id);
    a.emit(cfg.EVENTS.chat, 'X'.repeat(5 * 1024 * 1024), 'A', a.id);
    await sleep(2500);
    const probe = await connect(auth);
    expect(probe.connected, 'server stopped accepting connections after abuse').toBeTruthy();
    probe.close();
    if (b.__events.filter((e) => e.name === cfg.EVENTS.chat).length >= 300) warn('No per-socket rate limit: 300 chat messages were all relayed.');
  } finally { closeAll([a, b]); }
});

test('room is cleaned after everyone leaves (can rejoin as a fresh room)', async () => {
  const room = roomCode();
  for (let cycle = 0; cycle < 5; cycle++) {
    const socks = await Promise.all(Array.from({ length: cfg.MAX_PARTICIPANTS }, () => connect(auth)));
    for (const s of socks) await tryJoin(s, room, 'c', 500);
    closeAll(socks);
    await sleep(600);
  }
  const s = await connect(auth);
  const r = await tryJoin(s, room, 'Fresh', 1200);
  s.close();
  expect(r.admitted, 'ghost participants stayed in the room after disconnect').toBeTruthy();
});
