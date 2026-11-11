import { test, expect } from '@playwright/test';

const chars = '23456789abcdefghjkmnpqrstuvwxyz';
const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const makeRoom = () => `${rand4()}-${rand4()}-${rand4()}`;

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

test.describe('E2E Layer 4: Chat Security (XSS Escaping & 2MB Image Limit) and Duplicate Tab Warning', () => {
  test('chat strictly escapes XSS injection and blocks image uploads exceeding 2MB', async ({ browser }) => {
    const room = makeRoom();
    const ctxA = await browser.newContext(CTX_OPTIONS);
    const ctxB = await browser.newContext(CTX_OPTIONS);
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await joinRoom(pageA, room, 'Alice');
    await joinRoom(pageB, room, 'Bob');

    // Wait for both peers to be connected in WebRTC mesh
    await pageA.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });
    await pageB.waitForFunction(() => document.querySelectorAll('video').length >= 2, { timeout: 15000 });

    // 1. XSS Escaping Test
    const xssPayload = '<img src=x onerror="window.__xss=1"><b>bold text</b>';
    await pageA.mouse.move(640, 750);
    await pageA.waitForTimeout(300);
    await pageA.getByRole('button', { name: 'In-call chat' }).click();
    const chatInputA = pageA.getByPlaceholder(/Type a message/i);
    await expect(chatInputA).toBeVisible({ timeout: 10000 });

    await chatInputA.fill(xssPayload);
    await chatInputA.press('Enter');

    // Bob opens chat and verifies message rendered as text
    await pageB.mouse.move(640, 750);
    await pageB.waitForTimeout(300);
    await pageB.getByRole('button', { name: 'In-call chat' }).click();
    await pageB.waitForTimeout(1500);

    const chatContentB = await pageB.locator('.MuiDrawer-root').textContent();
    expect(chatContentB).toContain('bold text');

    // Ensure JavaScript from payload did NOT execute and no injected img tag exists
    const xssFlagA = await pageA.evaluate(() => window.__xss);
    const xssFlagB = await pageB.evaluate(() => window.__xss);
    expect(xssFlagA).toBeUndefined();
    expect(xssFlagB).toBeUndefined();

    const imgCountA = await pageA.evaluate(() => document.querySelectorAll('img[src="x"]').length);
    const imgCountB = await pageB.evaluate(() => document.querySelectorAll('img[src="x"]').length);
    expect(imgCountA).toBe(0);
    expect(imgCountB).toBe(0);

    // 2. Chat Image 2MB Limit Test
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024, 'a');
    const fileInput = pageA.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: 'huge_screenshot.png',
        mimeType: 'image/png',
        buffer: largeBuffer
      });

      // Verify inline error appears
      await expect(
        pageA.getByText(/image must be smaller than 2MB/i).first()
      ).toBeVisible({ timeout: 5000 });
    }

    await ctxA.close();
    await ctxB.close();
  });

  test('duplicate-tab warning: opening the same meeting in another tab alerts the user', async ({ browser }) => {
    const room = makeRoom();
    const context = await browser.newContext(CTX_OPTIONS);

    // Tab 1 joins meeting
    const page1 = await context.newPage();
    await joinRoom(page1, room, 'User Tab 1');

    // Tab 2 opens the exact same room within the same browser context (sharing BroadcastChannel)
    const page2 = await context.newPage();
    await page2.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(page2.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameInput2 = page2.getByPlaceholder(/Enter your name/i).first();
    await expect(nameInput2).toBeVisible({ timeout: 10000 });
    await nameInput2.fill('User Tab 2');

    const joinBtn2 = page2.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtn2).toBeEnabled({ timeout: 10000 });
    await joinBtn2.click();

    // Tab 2 should receive the broadcast from Tab 1 and display duplicate tab warning
    await expect(
      page2.getByText(/meeting open in another tab|duplicate tab/i).first()
    ).toBeVisible({ timeout: 15000 });

    await context.close();
  });
});
