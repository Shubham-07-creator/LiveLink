const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const cfg = require('../config');
const S = require('../selectors');
const { guard, createUser, loginBrowser, warn } = require('../helpers/common');

let auth;
test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  auth = await createUser(request);
  await request.dispose();
});

const THEME_KEYS = ['theme', 'themeMode', 'theme-mode', 'livelink_theme', 'livelink-theme', 'mode', 'colorMode', 'color-mode'];
const THEME_VALUES = ['system', 'dark', 'light', 'garbage', null];
const ALL_PAGES = [...cfg.PUBLIC_PAGES, ...cfg.PROTECTED_PAGES];

async function visit(page, route, errors) {
  const before = errors.length;
  await page.goto(cfg.BASE_URL + route, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const crashed = await page.getByText(S.errorBoundary).first().isVisible().catch(() => false);
  return { crashed, newErrors: errors.slice(before) };
}

// This is the test that catches crashes like: "Cannot read properties of undefined (reading 'shadow')"
for (const value of THEME_VALUES) {
  test(`no crash and no console errors on every page with theme preference = ${JSON.stringify(value)}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: value === 'dark' ? 'dark' : 'light' });
    await loginBrowser(context, auth);
    await context.addInitScript(([keys, v]) => {
      keys.forEach((k) => (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)));
    }, [THEME_KEYS, value]);
    const page = await context.newPage();
    const errors = guard(page);
    const problems = [];
    for (const route of ALL_PAGES) {
      const { crashed, newErrors } = await visit(page, route, errors);
      if (crashed) problems.push(`${route}: ErrorBoundary "Something went wrong" is showing`);
      newErrors.forEach((e) => problems.push(`${route}: ${e}`));
    }
    await context.close();
    expect(problems, 'Crashes / console errors found').toEqual([]);
  });
}

test('protected pages redirect anonymous users to login', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const route of cfg.PROTECTED_PAGES) {
    await page.goto(cfg.BASE_URL + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    expect(new URL(page.url()).pathname, `${route} is visible without login`).not.toBe(route);
  }
  await context.close();
});

test('no horizontal scroll on mobile (360px) on any page', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  await loginBrowser(context, auth);
  const page = await context.newPage();
  const bad = [];
  for (const route of ALL_PAGES) {
    await page.goto(cfg.BASE_URL + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) bad.push(`${route}: overflows by ${over}px`);
  }
  await context.close();
  expect(bad).toEqual([]);
});

test('accessibility (axe): no serious or critical violations', async ({ browser }) => {
  const context = await browser.newContext();
  await loginBrowser(context, auth);
  const page = await context.newPage();
  const found = [];
  for (const route of ALL_PAGES) {
    await page.goto(cfg.BASE_URL + route, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(1000);
    const res = await new AxeBuilder({ page }).analyze();
    res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
      .forEach((v) => found.push(`${route}: [${v.impact}] ${v.id} (${v.nodes.length} elements) ${v.help}`));
  }
  await context.close();
  expect(found, 'Accessibility problems').toEqual([]);
});

test('icon-only buttons have an accessible name', async ({ browser }) => {
  const context = await browser.newContext();
  await loginBrowser(context, auth);
  const page = await context.newPage();
  const bad = [];
  for (const route of ALL_PAGES) {
    await page.goto(cfg.BASE_URL + route, { waitUntil: 'networkidle' }).catch(() => {});
    const n = await page.evaluate(() => [...document.querySelectorAll('button,[role=button]')].filter((b) => {
      const t = (b.innerText || '').trim();
      return !t && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby') && !b.getAttribute('title');
    }).length);
    if (n) bad.push(`${route}: ${n} button(s) without name`);
  }
  await context.close();
  expect(bad).toEqual([]);
});

test('landing page basics (one h1, honest claims, images have alt)', async ({ page }) => {
  await page.goto(cfg.BASE_URL + '/', { waitUntil: 'networkidle' });
  expect(await page.locator('h1').count(), 'landing needs exactly one h1').toBe(1);
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const bad of ['end-to-end encrypted', 'full hd', 'maang', 'zero latency', '60 fps', 'decentralized']) {
    expect(text.includes(bad), `landing page still says "${bad}"`).toBeFalsy();
  }
  const noAlt = await page.locator('img:not([alt])').count();
  if (noAlt) warn(`${noAlt} image(s) without alt text`);
});

test('auth page: inline validation, no alert() popups', async ({ page }) => {
  let dialog = null;
  page.on('dialog', async (d) => { dialog = d.message(); await d.dismiss(); });
  await page.goto(cfg.BASE_URL + '/auth', { waitUntil: 'networkidle' });
  const submit = page.getByRole('button', { name: /sign in|login|create/i }).first();
  await submit.click().catch(() => {});
  await page.waitForTimeout(800);
  expect(dialog, 'page uses alert()/confirm() instead of inline errors or toasts').toBeNull();
});
