const { test } = require('@playwright/test');
const cfg = require('../config');

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function roomCode(prefix = '') {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  const g = (n) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
  return `${prefix}${g(4)}-${g(4)}-${g(4)}`;
}

// Non-failing note, shown in REPORT.md under "Warnings"
function warn(msg) {
  test.info().annotations.push({ type: 'warning', description: msg });
}

// Collects page errors and console errors (this is what catches crashes like the Toast.jsx one)
function guard(page) {
  const errors = [];
  page.on('pageerror', (e) => {
    if (cfg.IGNORED_CONSOLE.some((r) => r.test(e.message))) return;
    errors.push('pageerror: ' + e.message);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (cfg.IGNORED_CONSOLE.some((r) => r.test(t))) return;
    errors.push('console.error: ' + t.slice(0, 300));
  });
  return errors;
}

const api = (p) => cfg.API_URL + cfg.API_PREFIX + p;

// Registers a fresh user and logs in. Returns auth info usable by request, sockets and browser.
async function createUser(request) {
  const id = uniq();
  const u = { name: 'QA ' + id, username: 'qa_' + id, email: `qa_${id}@example.com`, password: cfg.PASSWORD };
  const reg = await request.post(api('/register'), { data: cfg.registerBody(u), failOnStatusCode: false });
  const out = { user: u, registerStatus: reg.status(), loggedIn: false, headers: {}, cookie: '', token: null, loginStatus: null, loginHeaders: [] };
  for (const body of cfg.loginBodies(u)) {
    const r = await request.post(api('/login'), { data: body, failOnStatusCode: false });
    out.loginStatus = r.status();
    if (r.ok()) {
      out.loggedIn = true;
      out.loginHeaders = r.headersArray();
      const json = await r.json().catch(() => ({}));
      out.token = json.token || json.accessToken || (json.data && json.data.token) || null;
      if (out.token) out.headers.Authorization = 'Bearer ' + out.token;
      const sc = r.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value.split(';')[0]);
      out.cookie = sc.join('; ');
      if (out.cookie) out.headers.Cookie = out.cookie;
      break;
    }
  }
  return out;
}

async function loginBrowser(context, auth) {
  if (auth.token) await context.addInitScript((t) => localStorage.setItem('token', t), auth.token);
  if (auth.cookie) {
    const url = new URL(cfg.API_URL);
    const cookies = auth.cookie.split('; ').map((c) => {
      const i = c.indexOf('=');
      return { name: c.slice(0, i), value: c.slice(i + 1), domain: url.hostname, path: '/' };
    });
    await context.addCookies(cookies).catch(() => {});
  }
}

module.exports = { uniq, roomCode, warn, guard, api, createUser, loginBrowser };
