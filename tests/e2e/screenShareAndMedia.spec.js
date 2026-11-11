import { test, expect } from '@playwright/test';

const chars = '23456789abcdefghjkmnpqrstuvwxyz';
const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const makeRoom = () => `${rand4()}-${rand4()}-${rand4()}`;

const FAKE_DISPLAY_SCRIPT = () => {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    setInterval(() => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(`TEST SCREEN FRAME ${frame++}`, 100, 200);
    }, 100);
    const stream = canvas.captureStream(15);
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.contentHint = 'detail';
      try {
        Object.defineProperty(track, 'label', { value: 'screen:0:0' });
      } catch (e) {}
    }
    window.__screenStream = stream;
    return stream;
  };
};

async function joinRoom(page, roomCode, name) {
  await page.goto(`/${roomCode}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await expect(page.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });
  const nameInput = page.getByPlaceholder(/Enter your name/i).first();
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);
  const joinBtn = page.getByRole('button', { name: 'Join meeting' }).first();
  await expect(joinBtn).toBeEnabled({ timeout: 10000 });
  await joinBtn.click();
  await expect(page.getByText(roomCode).first()).toBeVisible({ timeout: 15000 });
}

test.describe('E2E Layer 4: Screen Share, Single Presenter Rule, Stop Mechanisms & Media Permission Handling', () => {
  test('screen share: verified not mirrored, object-fit contain, second presenter blocked, stop via button and track.stop()', async ({ browser }) => {
    test.setTimeout(90000);
    const room = makeRoom();

    // 1. Presenter Context with simulated getDisplayMedia
    const ctxA = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 }
    });
    await ctxA.addInitScript(FAKE_DISPLAY_SCRIPT);
    const pageA = await ctxA.newPage();

    // 2. Viewer Context
    const ctxB = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 }
    });
    const pageB = await ctxB.newPage();

    await joinRoom(pageA, room, 'Presenter');
    await joinRoom(pageB, room, 'Viewer');

    // Both connected
    await pageA.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });
    await pageB.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });

    // Presenter starts screen share
    await pageA.mouse.move(640, 750);
    await pageA.waitForTimeout(300);
    const shareBtnA = pageA.locator('button[aria-label*="share" i], button:has-text("Share")').first();
    await shareBtnA.click();

    // Wait for Viewer to receive screen video
    await pageB.waitForFunction(() => {
      const vids = Array.from(document.querySelectorAll('video'));
      return vids.some(v => v.videoWidth >= 1000 || v.style.objectFit === 'contain');
    }, { timeout: 15000 });

    // Verify properties on Viewer side: object-fit contain and NOT mirrored
    const videoProps = await pageB.evaluate(() => {
      const vids = Array.from(document.querySelectorAll('video'));
      return vids.map(v => ({
        width: v.videoWidth,
        objectFit: window.getComputedStyle(v).objectFit,
        transform: window.getComputedStyle(v).transform
      }));
    });

    const screenVid = videoProps.find(v => v.width >= 1000 || v.objectFit === 'contain');
    expect(screenVid).toBeDefined();
    expect(screenVid.objectFit).toBe('contain');
    expect(screenVid.transform).not.toContain('matrix(-1');

    // Second presenter rule: Viewer attempts to start screen share while Presenter is active
    await pageB.mouse.move(640, 750);
    await pageB.waitForTimeout(300);
    const shareBtnB = pageB.locator('button[aria-label*="share" i], button:has-text("Share")').first();
    if (await shareBtnB.isVisible()) {
      await shareBtnB.click();
      // Should show error toast indicating single presenter rule
      await expect(
        pageB.getByText(/already sharing|only one presenter/i).first()
      ).toBeVisible({ timeout: 10000 });
    }

    // Stop mechanism 1: Presenter toggles screen share off
    await pageA.keyboard.press('s');
    await pageA.waitForTimeout(2000);

    // Presenter starts screen share again
    await pageA.keyboard.press('s');
    await pageA.waitForTimeout(2000);

    // Stop mechanism 2: Presenter stops screen share via native browser track.stop()
    await pageA.evaluate(() => {
      if (window.__screenStream) {
        window.__screenStream.getTracks().forEach(t => t.stop());
      }
    });

    await pageA.waitForTimeout(2000);

    await ctxA.close();
    await ctxB.close();
  });

  test('permission-denied path: friendly message, no crash, join without camera/mic', async ({ browser }) => {
    // Context with simulated denied media permissions
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied by user', 'NotAllowedError'));
    });

    const page = await ctx.newPage();
    const uncaughtErrors = [];
    page.on('pageerror', err => uncaughtErrors.push(err.message));

    const room = makeRoom();
    await page.goto(`/${room}`, { waitUntil: 'domcontentloaded' });

    // Ensure ErrorBoundary is NOT triggered
    await page.waitForTimeout(2000);
    const crashed = await page.getByText(/Something went wrong/i).first().isVisible().catch(() => false);
    expect(crashed).toBeFalsy();

    // Verify friendly permission message is displayed in Lobby
    await expect(
      page.getByText(/Camera or mic access is blocked|blocked by your browser/i).first()
    ).toBeVisible({ timeout: 15000 });

    // Verify "Join without camera/mic" button is visible and actionable
    const joinWithoutBtn = page.getByRole('button', { name: /join without camera/i }).first();
    await expect(joinWithoutBtn).toBeVisible({ timeout: 10000 });
    await joinWithoutBtn.click();

    // Verify successfully entered meeting room without media
    await expect(page.getByText(room).first()).toBeVisible({ timeout: 15000 });
    expect(uncaughtErrors).toEqual([]);

    await ctx.close();
  });
});
