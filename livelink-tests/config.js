// Everything app-specific lives here. If a test fails with "not found", edit this file or selectors.js.
try { require('dotenv').config(); } catch (_) {
  try { require('../backend/node_modules/dotenv').config(); } catch (__) {}
}

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const API_URL = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '');
const SOCKET_URL = (process.env.SOCKET_URL || API_URL).replace(/\/$/, '');

module.exports = {
  BASE_URL,
  API_URL,
  SOCKET_URL,
  DESTRUCTIVE: process.env.DESTRUCTIVE === '1',

  API_PREFIX: '/api/v1/users',
  HEALTH_PATH: '/health',
  ICE_PATH: '/ice_servers',
  PROTECTED_API: ['/profile', '/get_all_activity'],
  PROTECTED_PAGES: ['/home', '/history', '/profile'],
  PUBLIC_PAGES: ['/', '/auth'],
  MAX_PARTICIPANTS: 4,
  PASSWORD: 'Test@12345-Strong',

  // Socket event names (adjust if you renamed them)
  EVENTS: {
    join: 'join-call',
    chat: 'chat-message',
    signal: 'signal',
    rejected: ['room-full', 'join-error', 'error', 'join-rejected', 'invalid-room'],
    hostOnly: ['mute-participant', 'remove-participant', 'mute-all', 'lock-room', 'admit-user', 'deny-user', 'spotlight-participant'],
  },
  // Payload sent with the join event. Default: just the room string.
  joinPayload: (room, name) => room,
  // Payload for host-only attempts
  hostPayload: (room, targetSocketId) => ({ room, target: targetSocketId, targetId: targetSocketId, socketId: targetSocketId }),

  // Console errors we do not care about (third party GSI / favicons / expected 401 guest auth checks)
  IGNORED_CONSOLE: [
    /favicon/i,
    /Failed to load resource.*(favicon|manifest|401|Unauthorized|ERR_CONNECTION_CLOSED)/i,
    /accounts\.google\.com/i,
    /gsi/i,
    /localStorage.*Access is denied/i
  ],

  // Request bodies. Edit if your validation is strict.
  registerBody: (u) => ({ name: u.name, username: u.username, email: u.email, password: u.password }),
  loginBodies: (u) => [{ email: u.email, password: u.password }, { username: u.username, password: u.password }],
};
