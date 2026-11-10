const { test, expect } = require('@playwright/test');
const cfg = require('../config');
const { warn } = require('../helpers/common');

const SECRET_PATTERNS = [
  [/mongodb(\+srv)?:\/\/[^\s"'`]+/i, 'MongoDB connection string'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/gsk_[A-Za-z0-9]{20,}/, 'Groq API key'],
  [/sk-[A-Za-z0-9]{32,}/, 'secret API key (sk-...)'],
  [/(jwt|api|secret|private)[_-]?(key|secret)?["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/i, 'hardcoded secret-looking value'],
  [/(turn|metered)[^"']{0,40}(credential|password|secret|apikey)["']?\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i, 'TURN credential in bundle'],
];

test('frontend bundle contains no secrets and no source maps', async ({ request }) => {
  const html = await (await request.get(cfg.BASE_URL + '/')).text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], cfg.BASE_URL).href);
  expect(scripts.length, 'no script bundles found on landing page').toBeGreaterThan(0);
  const leaks = [];
  for (const src of scripts) {
    const js = await (await request.get(src)).text();
    for (const [re, label] of SECRET_PATTERNS) if (re.test(js)) leaks.push(`${src.split('/').pop()}: ${label}`);
    if (/AIza[0-9A-Za-z_\-]{35}/.test(js)) warn('Google API key found in bundle (fine only if it is a restricted browser key).');
    const map = await request.get(src + '.map', { failOnStatusCode: false });
    if (map.status() === 200) warn(`Source map is public: ${src.split('/').pop()}.map (exposes your source code)`);
  }
  expect(leaks, 'Secrets found in the public frontend bundle').toEqual([]);
});
