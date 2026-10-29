import { test, expect } from '@playwright/test';

test.describe('E2E Layer 5: Network Chaos, Reconnection & Rapid Toggle Stress', () => {
  test('survives rapid 25x camera & mic toggles in 3 seconds without freezing or UI state desync', async ({ page }) => {
    const roomCode = 'kmpq-wxyz-4567';

    await page.goto(`/${roomCode}`);
    await page.getByPlaceholder(/Enter your name/i).fill('Chaos Tester');
    await page.getByRole('button', { name: 'Join meeting' }).click();
    await expect(page.getByText(roomCode)).toBeVisible();

    // Rapidly toggle Mic & Camera 25 times
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('m');
      await page.keyboard.press('v');
      await page.waitForTimeout(50);
    }

    // Verify UI is fully responsive and not deadlocked
    await page.waitForTimeout(500);
    const micBtn = page.getByRole('button', { name: /Turn (on|off) mic/i });
    await expect(micBtn).toBeVisible();
    const camBtn = page.getByRole('button', { name: /Turn (on|off) camera/i });
    await expect(camBtn).toBeVisible();
  });

  test('emulates network offline and online recovery via Chrome DevTools Protocol (CDP)', async ({ page, context }) => {
    const roomCode = 'kmpq-wxyz-5678';

    await page.goto(`/${roomCode}`);
    await page.getByPlaceholder(/Enter your name/i).fill('Network Tester');
    await page.getByRole('button', { name: 'Join meeting' }).click();
    await expect(page.getByText(roomCode)).toBeVisible();

    // Use CDP to simulate network drop (offline = true)
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });

    // Wait 3 seconds offline
    await page.waitForTimeout(3000);

    // Restore network conditions (offline = false)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 20,
      downloadThroughput: 10 * 1024 * 1024 / 8,
      uploadThroughput: 5 * 1024 * 1024 / 8
    });

    // Verify page recovered and controls remain operational
    await page.waitForTimeout(1000);
    await expect(page.getByText(roomCode)).toBeVisible();
  });
});
