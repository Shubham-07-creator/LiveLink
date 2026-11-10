import { test, expect } from '@playwright/test';

test.describe('E2E Layer 4: Private 1-on-1 Calls & Capacity Enforcement', () => {
  test('strictly limits private room to 2 participants and blocks 3rd user with room-full modal', async ({ browser }) => {
    // Valid unique private room code using p- prefix and unambiguous alphabet [2-9a-km-z]
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const privateRoom = `p-${rand4()}-${rand4()}-${rand4()}`;

    // 1. Peer 1 joins private room
    const context1 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page1 = await context1.newPage();
    await page1.goto(`/${privateRoom}`, { waitUntil: 'domcontentloaded' });
    await page1.getByPlaceholder(/Enter your name/i).fill('User One');
    await page1.getByRole('button', { name: 'Join meeting' }).click();
    await expect(page1.getByText(privateRoom)).toBeVisible();

    // 2. Peer 2 joins private room
    const context2 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page2 = await context2.newPage();
    await page2.goto(`/${privateRoom}`, { waitUntil: 'domcontentloaded' });
    await page2.getByPlaceholder(/Enter your name/i).fill('User Two');
    await page2.getByRole('button', { name: 'Join meeting' }).click();
    await expect(page2.getByText(privateRoom)).toBeVisible();
    await page2.waitForTimeout(1000);

    // 3. Peer 3 attempts to join private room
    const context3 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page3 = await context3.newPage();
    await page3.goto(`/${privateRoom}`, { waitUntil: 'domcontentloaded' });
    await page3.getByPlaceholder(/Enter your name/i).fill('User Three (Intruder)');
    await page3.getByRole('button', { name: 'Join meeting' }).click();

    // Peer 3 MUST see Room Full dialog stating maximum 2 participants
    await expect(
      page3.getByText(/private 1-on-1 call|full capacity|maximum 2 participants/i)
    ).toBeVisible({ timeout: 10000 });

    // Peer 3 should NOT see in-call TopBar or video grid
    await expect(page3.getByRole('button', { name: /In-call chat/i })).not.toBeVisible();

    // Clean up
    await context1.close();
    await context2.close();
    await context3.close();
  });
});
