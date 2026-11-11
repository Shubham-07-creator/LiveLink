import { test, expect } from '@playwright/test';

const chars = '23456789abcdefghjkmnpqrstuvwxyz';
const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const makeRoom = (prefix = '') => `${prefix}${rand4()}-${rand4()}-${rand4()}`;

const CTX_OPTIONS = {
  permissions: ['camera', 'microphone'],
  viewport: { width: 1280, height: 800 }
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

const getActiveVideos = (page) => page.evaluate(() => 
  Array.from(document.querySelectorAll('video')).filter(v => v.videoWidth > 0 || (v.srcObject && v.srcObject.active))
);

test.describe('E2E Layer 4: Mesh Scaling, 4-User Cap, 5th-User Rejection & Ghost Tile Cleanup', () => {
  test('2, 3, and 4 users join standard room, 5th sees Room Full dialog', async ({ browser }) => {
    test.setTimeout(180000);
    const room = makeRoom();
    const contexts = [];
    const pages = [];

    // Join 4 participants
    for (let i = 1; i <= 4; i++) {
      const ctx = await browser.newContext(CTX_OPTIONS);
      contexts.push(ctx);
      const page = await ctx.newPage();
      pages.push(page);
      await joinRoom(page, room, `Peer ${i}`);
      await page.waitForTimeout(1000);
    }

    // Verify User 1 sees 4 video tiles rendered
    await pages[0].waitForFunction(() => {
      const vids = document.querySelectorAll('video');
      return vids.length >= 4;
    }, { timeout: 20000 });

    const videoCount1 = await pages[0].evaluate(() => document.querySelectorAll('video').length);
    expect(videoCount1).toBeGreaterThanOrEqual(4);

    // 5th participant attempts to join standard room
    const ctx5 = await browser.newContext(CTX_OPTIONS);
    contexts.push(ctx5);
    const page5 = await ctx5.newPage();

    await page5.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(page5.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });
    const nameInput5 = page5.getByPlaceholder(/Enter your name/i).first();
    await expect(nameInput5).toBeVisible({ timeout: 10000 });
    await nameInput5.fill('Intruder 5');

    const joinBtn5 = page5.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtn5).toBeEnabled({ timeout: 10000 });
    await joinBtn5.click();

    // 5th participant MUST see the Room Full dialog
    await expect(
      page5.getByText(/room is full|maximum 4 participants|capacity/i).first()
    ).toBeVisible({ timeout: 20000 });

    // Clean up
    for (const ctx of contexts) {
      await ctx.close().catch(() => {});
    }
  });

  test('closing a tab removes the peer tile for others (no ghost tiles)', async ({ browser }) => {
    test.setTimeout(60000);
    const room = makeRoom();
    const ctxA = await browser.newContext(CTX_OPTIONS);
    const ctxB = await browser.newContext(CTX_OPTIONS);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await joinRoom(pageA, room, 'Alice');
    await joinRoom(pageB, room, 'Bob');

    // Both see 2 videos
    await pageA.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });

    // Bob abruptly closes tab
    await pageB.close();
    await ctxB.close();

    // Alice should see video count reduce to 1 (only self view remains) within 25s
    await expect.poll(
      async () => (await pageA.evaluate(() => document.querySelectorAll('video').length)),
      { timeout: 25000, message: 'ghost tile stayed after peer left' }
    ).toBeLessThanOrEqual(1);

    await ctxA.close();
  });

  test('refresh mid-call: user rejoins cleanly without duplicate ghost tile', async ({ browser }) => {
    test.setTimeout(60000);
    const room = makeRoom();
    const ctxA = await browser.newContext(CTX_OPTIONS);
    const ctxB = await browser.newContext(CTX_OPTIONS);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await joinRoom(pageA, room, 'Alice');
    await joinRoom(pageB, room, 'Bob');

    await pageA.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });

    // Bob refreshes page
    await pageB.reload({ waitUntil: 'domcontentloaded' });
    await expect(pageB.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameInput = pageB.getByPlaceholder(/Enter your name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Bob');

    const joinBtn = pageB.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtn).toBeEnabled({ timeout: 10000 });
    await joinBtn.click();

    // Alice should settle to exactly 2 active videos (Alice + Bob) once old socket tears down
    await expect.poll(
      async () => (await pageA.evaluate(() => document.querySelectorAll('video').length)),
      { timeout: 25000, message: 'duplicate video tile remained after refresh' }
    ).toBe(2);

    await ctxA.close();
    await ctxB.close();
  });
});
