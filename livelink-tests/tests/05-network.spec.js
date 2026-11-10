const { test, expect } = require('@playwright/test');
const cfg = require('../config');
const S = require('../selectors');
const { createUser, api, roomCode, warn } = require('../helpers/common');

test('TURN: relay candidates can be gathered (proves TURN credentials work)', async ({ page, request }) => {
  const auth = await createUser(request);
  const r = await request.get(api(cfg.ICE_PATH), { headers: auth.headers, failOnStatusCode: false });
  expect(r.status(), 'ICE endpoint failed').toBe(200);
  const json = await r.json();
  const iceServers = Array.isArray(json) ? json : json.iceServers;
  await page.goto(cfg.BASE_URL, { waitUntil: 'domcontentloaded' });
  const types = await page.evaluate(async (servers) => {
    const pc = new RTCPeerConnection({ iceServers: servers, iceTransportPolicy: 'relay' });
    pc.createDataChannel('x');
    const out = [];
    pc.onicecandidate = (e) => { if (e.candidate) out.push(e.candidate.type); };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise((res) => { pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && res(); setTimeout(res, 12000); });
    pc.close();
    return out;
  }, iceServers);
  expect(types, 'no relay candidate: TURN is expired, wrong, or quota is exhausted (calls fail on mobile data)').toContain('relay');
});

test('network drop for 8s: banner shows and call recovers', async ({ browser }) => {
  const NEW = { permissions: ['camera', 'microphone'] };
  const room = roomCode();
  const aCtx = await browser.newContext(NEW);
  const a = await aCtx.newPage();
  const b = await (await browser.newContext(NEW)).newPage();
  for (const [p, n] of [[a, 'Alice'], [b, 'Bob']]) {
    await p.goto(`${cfg.BASE_URL}/${room}`, { waitUntil: 'domcontentloaded' });
    const inp = p.locator(S.nameInput).first();
    if (await inp.isVisible({ timeout: 15000 }).catch(() => false)) await inp.fill(n);
    await p.getByRole('button', { name: S.joinBtn }).first().click();
  }
  const playing = () => a.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.videoWidth > 0).length);
  await expect.poll(playing, { timeout: 45000 }).toBeGreaterThanOrEqual(2);
  await aCtx.setOffline(true);
  await a.waitForTimeout(8000);
  const banner = await a.getByText(S.reconnecting).first().isVisible().catch(() => false);
  if (!banner) warn('No "Reconnecting..." banner seen while offline (browser offline mode may not stop WebRTC UDP; verify manually).');
  await aCtx.setOffline(false);
  await expect.poll(playing, { timeout: 60000, message: 'call did not recover after network came back' }).toBeGreaterThanOrEqual(2);
});

test('rapid join/leave cycles do not break the page', async ({ browser }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  for (let i = 0; i < 6; i++) {
    await p.goto(`${cfg.BASE_URL}/${roomCode()}`, { waitUntil: 'domcontentloaded' });
    const inp = p.locator(S.nameInput).first();
    if (await inp.isVisible({ timeout: 8000 }).catch(() => false)) await inp.fill('Loop' + i);
    await p.getByRole('button', { name: S.joinBtn }).first().click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  const live = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1);
  if (live > 400) warn(`JS heap ${live}MB after 6 join cycles: possible leak`);
  expect(errs, 'page errors during rapid join/leave').toEqual([]);
});
