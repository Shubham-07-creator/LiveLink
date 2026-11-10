const { io } = require('socket.io-client');
const cfg = require('../config');

function connect(auth = {}) {
  return new Promise((resolve, reject) => {
    const headers = { origin: cfg.BASE_URL };
    if (auth.cookie) headers.cookie = auth.cookie;
    const s = io(cfg.SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 20000,
      extraHeaders: headers,
      auth: auth.token ? { token: auth.token } : undefined,
    });
    s.__events = [];
    s.onAny((name, ...args) => s.__events.push({ name, args }));
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(new Error('socket connect_error: ' + e.message)));
  });
}

// Emits join and decides if the server admitted or rejected us.
function tryJoin(s, room, name = 'QA', wait = 2500) {
  return new Promise((resolve) => {
    let t;
    const done = (r) => { clearTimeout(t); resolve(r); };
    t = setTimeout(() => done({ admitted: true }), wait);
    s.once('user-joined', () => done({ admitted: true }));
    cfg.EVENTS.rejected.forEach((e) => s.once(e, () => done({ admitted: false, why: e })));
    s.once('disconnect', () => done({ admitted: false, why: 'disconnect' }));
    s.emit(cfg.EVENTS.join, room, name);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const closeAll = (list) => list.forEach((s) => { try { s.close(); } catch (_) {} });

module.exports = { connect, tryJoin, sleep, closeAll };
