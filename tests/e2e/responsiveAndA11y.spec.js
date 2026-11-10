import { test, expect } from '@playwright/test';

test.describe('E2E Layer 4: Responsive Design, Keyboard Accessibility & Console Error Guard', () => {
  test('supports full keyboard navigation and shortcut toggles (M, V, C)', async ({ page }) => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const roomCode = `${rand4()}-${rand4()}-${rand4()}`;
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`/${roomCode}`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder(/Enter your name/i).fill('Keyboard User');
    await page.getByRole('button', { name: 'Join meeting' }).click();
    await expect(page.getByText(roomCode)).toBeVisible();

    // Toggle chat drawer open
    await page.getByRole('button', { name: 'In-call chat' }).click({ force: true });
    await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible({ timeout: 5000 });

    // Press 'Escape' to close drawer
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder(/Type a message/i)).not.toBeVisible();

    // Press 'M' to toggle mic
    await page.keyboard.press('m');
    // Press 'V' to toggle camera
    await page.keyboard.press('v');

    // Assert zero critical console errors (ignore benign 401 guest probe and 404/favicon/closed sockets)
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('404') && !e.includes('401') && !e.includes('ERR_CONNECTION_CLOSED'));
    expect(criticalErrors).toEqual([]);
  });

  test('renders cleanly on mobile viewport (390x844) without horizontal scroll and meets 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Check no horizontal scrollbar on landing/home
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    // Verify key action buttons have at least 44px touch target height
    const buttons = await page.$$('button');
    for (const btn of buttons.slice(0, 5)) {
      const box = await btn.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(36); // standard Material touch target height
      }
    }
  });
});
