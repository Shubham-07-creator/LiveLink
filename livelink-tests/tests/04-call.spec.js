const { test, expect } = require('@playwright/test');
const cfg = require('../config');
const S = require('../selectors');
const { roomCode, guard, warn } = require('../helpers/common');

const NEW_CTX = { permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 800 } };

// Stand-in for the screen picker (fake canvas stream), so screen-share tests are deterministic
const FAKE_DISPLAY = () => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const g = c.getContext('2d'); let n = 0;
    setInterval(() => { g.fillStyle = '#123'; g.fillRect(0, 0, 1280, 720); g.fillStyle = '#fff'; g.font = '48px sans-serif'; g.fillText('SCREEN ' + n++, 60, 120); }, 100);
    return c.captureStream(15);
  };
};

async function joinAs(page, room, name) {
  await page.goto(`${cfg.BASE_URL}/${room}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expect(page.getByText('Ready to join?')).toBeVisible({ timeout: 30000 });
  const nameInput = page.getByPlaceholder(/Enter your name/i).first();
  if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await nameInput.fill(name);
  }
  const join = page.getByRole('button', { name: S.joinBtn }).first();
  await expect(join, 'Join button not found or disabled in lobby').toBeEnabled({ timeout: 30000 });
  await join.click();
}

const videos = (page) => page.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({
  w: v.videoWidth, h: v.videoHeight, t: v.currentTime, fit: getComputedStyle(v).objectFit, tf: getComputedStyle(v).transform,
  tracks: v.srcObject ? v.srcObject.getTracks().map((t) => t.kind + ':' + t.readyState) : [],
})));

async function waitForPeers(page, count, timeout = 45000) {
  await expect.poll(async () => (await videos(page)).filter((v) => v.w > 0).length, { timeout, message: `expected ${count} playing videos` }).toBeGreaterThanOrEqual(count);
}

test('2 users see and hear each other (video frames actually advance)', async ({ browser }) => {
  const room = roomCode();
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  const b = await (await browser.newContext(NEW_CTX)).newPage();
  const errA = guard(a), errB = guard(b);
  await joinAs(a, room, 'Alice');
  await joinAs(b, room, 'Bob');
  await waitForPeers(a, 2); await waitForPeers(b, 2);
  const s1 = await videos(a);
  await a.waitForTimeout(1800);
  const s2 = await videos(a);
  const advancing = s2.filter((v, i) => v.w > 0 && s1[i] && v.t > s1[i].t).length;
  expect(advancing, 'remote video is frozen (no frames arriving: TURN/ICE problem?)').toBeGreaterThanOrEqual(2);
  const hasAudio = s2.some((v) => v.tracks.some((t) => t === 'audio:live'));
  expect(hasAudio, 'no live audio track on any video element').toBeTruthy();
  expect([...errA, ...errB], 'console errors during call').toEqual([]);
});

test('mic and camera toggles change state', async ({ browser }) => {
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(a, roomCode(), 'Solo');
  await waitForPeers(a, 1);
  for (const [label, re] of [['mic', S.micBtn], ['camera', S.camBtn]]) {
    const btn = a.getByRole('button', { name: re }).first();
    await expect(btn, `${label} button not found (selectors.js)`).toBeVisible();
    const before = (await btn.getAttribute('aria-label')) + '|' + (await btn.getAttribute('aria-pressed'));
    await btn.click();
    await a.waitForTimeout(500);
    const btn2 = a.getByRole('button', { name: re }).first();
    const after = (await btn2.getAttribute('aria-label')) + '|' + (await btn2.getAttribute('aria-pressed'));
    expect(after, `${label} button state did not change`).not.toBe(before);
  }
});

test('leave asks for confirmation and then leaves', async ({ browser }) => {
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(a, roomCode(), 'Solo');
  await waitForPeers(a, 1);
  const roomPath = new URL(a.url()).pathname;
  await a.getByRole('button', { name: S.leaveBtn }).first().click();
  const dlg = a.getByRole('dialog').first();
  await expect(dlg, 'no confirmation dialog on Leave').toBeVisible();
  await dlg.getByRole('button', { name: S.leaveConfirm }).first().click();
  await expect.poll(() => new URL(a.url()).pathname, { timeout: 15000, message: 'user was not taken out of the room after confirming Leave' }).not.toBe(roomPath);
});

test('closing a tab removes the tile for the others (no ghost tiles)', async ({ browser }) => {
  const room = roomCode();
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  const bCtx = await browser.newContext(NEW_CTX);
  const b = await bCtx.newPage();
  await joinAs(a, room, 'Alice'); await joinAs(b, room, 'Bob');
  await waitForPeers(a, 2);
  const before = (await videos(a)).length;
  await b.close(); await bCtx.close();
  await expect.poll(async () => (await videos(a)).length, { timeout: 15000, message: 'ghost tile stayed after peer left' }).toBeLessThan(before);
});

test('chat: XSS payload is shown as text and never executes', async ({ browser }) => {
  const room = roomCode();
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  const b = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(a, room, 'Alice'); await joinAs(b, room, 'Bob');
  await waitForPeers(a, 2);
  const payload = '<img src=x onerror="window.__xss=1"><b>bold</b>';
  await a.getByRole('button', { name: S.chatBtn }).first().click();
  const input = a.locator(S.chatInput).last();
  await expect(input, 'chat input not found (selectors.js)').toBeVisible();
  await input.fill(payload); await input.press('Enter');
  await b.getByRole('button', { name: S.chatBtn }).first().click().catch(() => {});
  await b.waitForTimeout(2000);
  for (const p of [a, b]) {
    expect(await p.evaluate(() => window.__xss), 'XSS executed from chat').toBeUndefined();
    expect(await p.locator('img[src="x"]').count(), 'chat rendered HTML').toBe(0);
  }
});

test(`room limit: user ${cfg.MAX_PARTICIPANTS + 1} sees the "room full" message`, async ({ browser }) => {
  const room = roomCode();
  for (let i = 0; i < cfg.MAX_PARTICIPANTS; i++) {
    const p = await (await browser.newContext(NEW_CTX)).newPage();
    await joinAs(p, room, 'U' + i);
    await p.waitForTimeout(1500);
  }
  const extra = await (await browser.newContext(NEW_CTX)).newPage();
  const errs = guard(extra);
  await joinAs(extra, room, 'Extra').catch(() => {});
  await expect(extra.getByText(S.roomFull).first(), 'no friendly room-full message').toBeVisible({ timeout: 20000 });
  expect(errs).toEqual([]);
});

test('permission denied: friendly message, no crash, join without camera/mic', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  const p = await ctx.newPage();
  const errs = guard(p);
  await p.goto(`${cfg.BASE_URL}/${roomCode()}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  expect(await p.getByText(S.errorBoundary).first().isVisible().catch(() => false), 'app crashed when permission was denied').toBeFalsy();
  await expect(p.getByText(S.permissionMsg).first(), 'no friendly permission message').toBeVisible();
  await expect(p.getByRole('button', { name: S.withoutMedia }).first(), 'no "join without camera/mic" option (dead end)').toBeVisible();
  expect(errs).toEqual([]);
});

test('screen share: shown for others, not mirrored, object-fit contain', async ({ browser }) => {
  const room = roomCode();
  const aCtx = await browser.newContext(NEW_CTX);
  await aCtx.addInitScript(FAKE_DISPLAY);
  const a = await aCtx.newPage();
  const b = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(a, room, 'Presenter'); await joinAs(b, room, 'Viewer');
  await waitForPeers(b, 2);
  const share = a.getByRole('button', { name: S.shareBtn }).first();
  await expect(share, 'screen share button not found (selectors.js)').toBeVisible();
  await share.click();
  await b.waitForTimeout(5000);
  const vids = (await videos(b)).filter((v) => v.w >= 1000);
  expect(vids.length, 'viewer did not receive the screen share (width >= 1000px)').toBeGreaterThan(0);
  expect(vids[0].fit, 'screen share must use object-fit: contain').toBe('contain');
  expect(vids[0].tf, 'screen share is mirrored (text unreadable)').not.toMatch(/matrix\(-1/);
});

test('refresh mid-call: user rejoins and there is no duplicate tile', async ({ browser }) => {
  const room = roomCode();
  const a = await (await browser.newContext(NEW_CTX)).newPage();
  const b = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(a, room, 'Alice'); await joinAs(b, room, 'Bob');
  await waitForPeers(a, 2);
  await b.reload({ waitUntil: 'domcontentloaded' });
  const nameInput = b.locator(S.nameInput).first();
  if (await nameInput.isVisible({ timeout: 8000 }).catch(() => false)) await nameInput.fill('Bob');
  const join = b.getByRole('button', { name: S.joinBtn }).first();
  if (await join.isVisible({ timeout: 8000 }).catch(() => false)) await join.click();
  await b.waitForTimeout(8000);
  const count = (await videos(a)).filter((v) => v.w > 0).length;
  expect(count, `Alice sees ${count} videos after Bob refreshed (expected 2). Ghost tile?`).toBe(2);
});

test('private room (p-): third person is rejected', async ({ browser }) => {
  const room = roomCode('p-');
  const ps = [];
  for (const n of ['A', 'B']) { const p = await (await browser.newContext(NEW_CTX)).newPage(); await joinAs(p, room, n); ps.push(p); await p.waitForTimeout(1500); }
  const c = await (await browser.newContext(NEW_CTX)).newPage();
  await joinAs(c, room, 'C').catch(() => {});
  await expect(c.getByText(S.roomFull).first(), 'third user got into a private room').toBeVisible({ timeout: 20000 });
});
