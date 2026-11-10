const { test, expect } = require('@playwright/test');
const cfg = require('../config');
const { warn, api, createUser, uniq } = require('../helpers/common');

let auth;
test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  auth = await createUser(request);
  await request.dispose();
});

test.describe('availability', () => {
  test('site loads (also measures Render cold start)', async ({ request }) => {
    const t = Date.now();
    const r = await request.get(cfg.BASE_URL, { timeout: 90000 });
    const ms = Date.now() - t;
    expect(r.status(), 'home page status').toBe(200);
    if (ms > 8000) warn(`Home took ${ms}ms. Server cold start? Lobby needs a "waking up" message.`);
  });

  test('health endpoint exists', async ({ request }) => {
    const r = await request.get(cfg.API_URL + cfg.HEALTH_PATH, { failOnStatusCode: false });
    expect(r.status(), `GET ${cfg.HEALTH_PATH} (add a /health route for uptime pings)`).toBe(200);
  });
});

test.describe('auth', () => {
  test('register + login works for a new user', async () => {
    expect(auth.registerStatus, 'register status').toBeLessThan(300);
    expect(auth.loggedIn, `login failed (status ${auth.loginStatus}). Edit loginBodies in config.js if your API expects other fields`).toBeTruthy();
  });

  test('JWT is in an httpOnly cookie (not readable by JS)', async () => {
    test.skip(!auth.loggedIn, 'login failed');
    const sc = auth.loginHeaders.filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);
    expect(sc.length, 'no Set-Cookie on login: token is not stored in a cookie').toBeGreaterThan(0);
    for (const c of sc) {
      expect(c, `cookie not HttpOnly: ${c.split('=')[0]}`).toMatch(/httponly/i);
      expect(c, `cookie missing SameSite: ${c.split('=')[0]}`).toMatch(/samesite/i);
      if (cfg.BASE_URL.startsWith('https')) expect(c, `cookie missing Secure: ${c.split('=')[0]}`).toMatch(/secure/i);
    }
    if (auth.token) warn('Login response body also returns the token. Make sure the frontend does not store it in localStorage.');
  });

  test('duplicate registration is rejected (no 500)', async ({ request }) => {
    const r = await request.post(api('/register'), { data: cfg.registerBody(auth.user), failOnStatusCode: false });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test('wrong password is rejected', async ({ request }) => {
    for (const body of cfg.loginBodies({ ...auth.user, password: 'wrong-pass-123' })) {
      const r = await request.post(api('/login'), { data: body, failOnStatusCode: false });
      expect(r.status(), JSON.stringify(Object.keys(body))).toBeGreaterThanOrEqual(400);
      expect(r.status()).toBeLessThan(500);
    }
  });

  for (const p of cfg.PROTECTED_API) {
    test(`protected endpoint ${p} rejects anonymous users`, async ({ request }) => {
      const r = await request.get(api(p), { failOnStatusCode: false });
      expect([401, 403], `${p} returned ${r.status()} without login`).toContain(r.status());
    });
  }

  test('forged / garbage token is rejected', async ({ request }) => {
    const r = await request.get(api(cfg.PROTECTED_API[0]), {
      headers: { Authorization: 'Bearer aaa.bbb.ccc', Cookie: 'token=aaa.bbb.ccc; accessToken=aaa.bbb.ccc' },
      failOnStatusCode: false,
    });
    expect([401, 403]).toContain(r.status());
  });

  test('NoSQL injection in login is blocked', async ({ request }) => {
    const bodies = [
      { email: { $gt: '' }, password: { $gt: '' } },
      { username: { $ne: null }, password: { $ne: null } },
    ];
    for (const b of bodies) {
      const r = await request.post(api('/login'), { data: b, failOnStatusCode: false });
      expect(r.status(), 'NoSQL injection payload must never log in: ' + JSON.stringify(b)).toBeGreaterThanOrEqual(400);
      expect(r.status()).toBeLessThan(500);
    }
  });

  test('registration validation: bad input gives 4xx, never 500', async ({ request }) => {
    const bad = [
      {}, { name: '', username: '', email: '', password: '' },
      { ...cfg.registerBody({ name: 'x', username: 'x' + uniq(), email: 'not-an-email', password: 'Test@12345' }) },
      { ...cfg.registerBody({ name: 'x', username: 'y' + uniq(), email: `a${uniq()}@e.com`, password: '1' }) },
      { ...cfg.registerBody({ name: 'A'.repeat(50000), username: 'z' + uniq(), email: `b${uniq()}@e.com`, password: 'Test@12345' }) },
      { name: ['array'], username: { obj: 1 }, email: 123, password: true },
    ];
    for (const b of bad) {
      const r = await request.post(api('/register'), { data: b, failOnStatusCode: false });
      expect(r.status(), 'payload: ' + JSON.stringify(b).slice(0, 120)).toBeGreaterThanOrEqual(400);
      expect(r.status(), 'server error on bad input: ' + JSON.stringify(b).slice(0, 120)).toBeLessThan(500);
    }
  });

  test('weak password is rejected', async ({ request }) => {
    const u = { name: 'Weak', username: 'weak_' + uniq(), email: `weak_${uniq()}@example.com`, password: '123' };
    const r = await request.post(api('/register'), { data: cfg.registerBody(u), failOnStatusCode: false });
    expect(r.status(), 'password "123" was accepted').toBeGreaterThanOrEqual(400);
  });
});

test.describe('google auth (critical)', () => {
  test('fake Google credential is rejected', async ({ request }) => {
    const r = await request.post(api('/google_auth'), { data: { credential: 'fake.jwt.token' }, failOnStatusCode: false });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test('client-supplied email/googleId is NOT trusted (account takeover check)', async ({ request }) => {
    const r = await request.post(api('/google_auth'), {
      data: { email: auth.user.email, googleId: '1234567890', name: 'Attacker', credential: 'x' },
      failOnStatusCode: false,
    });
    expect(r.status(), 'google_auth logged in using only email+googleId. Anyone can take over any account!').toBeGreaterThanOrEqual(400);
  });
});

test.describe('hardening', () => {
  test('CORS: evil origin is not allowed', async ({ request }) => {
    const evil = 'https://evil.example';
    const r = await request.get(api(cfg.PROTECTED_API[0]), { headers: { Origin: evil }, failOnStatusCode: false });
    const allow = r.headers()['access-control-allow-origin'];
    expect(allow, 'server reflects arbitrary Origin or uses *').not.toBe(evil);
    expect(allow).not.toBe('*');
    const pre = await request.fetch(api('/login'), {
      method: 'OPTIONS',
      headers: { Origin: evil, 'Access-Control-Request-Method': 'POST' },
      failOnStatusCode: false,
    });
    expect(pre.headers()['access-control-allow-origin']).not.toBe(evil);
  });

  test('security headers (helmet)', async ({ request }) => {
    const r = await request.get(cfg.API_URL + cfg.HEALTH_PATH, { failOnStatusCode: false });
    const h = r.headers();
    expect(h['x-content-type-options'], 'missing X-Content-Type-Options: nosniff').toBe('nosniff');
    expect(h['x-powered-by'], 'X-Powered-By leaks Express').toBeUndefined();
    if (!h['content-security-policy']) warn('No Content-Security-Policy header on API');
    if (cfg.BASE_URL.startsWith('https') && !h['strict-transport-security']) warn('No HSTS header');
  });

  test('errors do not leak stack traces', async ({ request }) => {
    const r1 = await request.post(api('/login'), { headers: { 'content-type': 'application/json' }, data: '{bad json', failOnStatusCode: false });
    const r2 = await request.get(api('/does-not-exist-' + uniq()), { failOnStatusCode: false });
    for (const r of [r1, r2]) {
      const body = await r.text();
      expect(body, 'stack trace or file path leaked').not.toMatch(/node_modules|\.js:\d+:\d+|at \w+ \(/);
      expect(r.status()).toBeLessThan(500);
    }
  });

  test('huge request body is refused cleanly', async ({ request }) => {
    const r = await request.post(api('/login'), { data: { email: 'a@b.com', password: 'x'.repeat(6 * 1024 * 1024) }, failOnStatusCode: false });
    expect(r.status(), 'server accepted a 6MB body').toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });

  test('ICE/TURN endpoint returns TURN servers and no stack info', async ({ request }) => {
    test.skip(!auth.loggedIn, 'login failed');
    const r = await request.get(api(cfg.ICE_PATH), { headers: auth.headers, failOnStatusCode: false });
    expect(r.status(), `GET ${cfg.ICE_PATH}. Edit ICE_PATH in config.js if different`).toBe(200);
    const json = await r.json();
    const servers = Array.isArray(json) ? json : json.iceServers || [];
    expect(servers.length, 'no iceServers').toBeGreaterThan(0);
    const urls = servers.flatMap((s) => [].concat(s.urls || s.url || []));
    expect(urls.some((u) => /^turns?:/i.test(u)), 'only STUN returned: calls fail on mobile data / office WiFi').toBeTruthy();
  });

  test('rate limit kicks in on repeated bad logins', async ({ request }) => {
    test.skip(!cfg.DESTRUCTIVE, 'set DESTRUCTIVE=1 (local/staging only)');
    let limited = false;
    for (let i = 0; i < 60 && !limited; i++) {
      const r = await request.post(api('/login'), { data: cfg.loginBodies({ ...auth.user, password: 'bad' + i })[0], failOnStatusCode: false });
      limited = r.status() === 429;
    }
    expect(limited, 'no 429 after 60 bad logins: brute force is possible').toBeTruthy();
  });
});
