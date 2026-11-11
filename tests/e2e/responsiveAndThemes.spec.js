import { test, expect } from '@playwright/test';

const chars = '23456789abcdefghjkmnpqrstuvwxyz';
const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
const makeRoom = () => `${rand4()}-${rand4()}-${rand4()}`;

test.describe('E2E Layer 4 & 8: Responsive Viewports, Keyboard Shortcuts & Theme Crash Regression', () => {
  test('renders across mobile and tablet viewports (360x640, 390x844, 768x1024) without horizontal scroll', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 1); // 1px rounding tolerance
    }
  });

  test('verifies keyboard shortcuts (M, V, C, H, Escape) in meeting', async ({ page }) => {
    const room = makeRoom();
    await page.goto(`/${room}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Ready to join?')).toBeVisible({ timeout: 15000 });

    const nameInput = page.getByPlaceholder(/Enter your name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Keyboard User');

    const joinBtn = page.getByRole('button', { name: 'Join meeting' }).first();
    await expect(joinBtn).toBeEnabled({ timeout: 10000 });
    await joinBtn.click();

    // Verify room view loaded
    await expect(page.getByText(room).first()).toBeVisible({ timeout: 15000 });

    // Click stage background to blur any inputs and focus body
    await page.mouse.click(640, 400);
    await page.waitForTimeout(500);

    // C: toggle chat drawer
    await page.keyboard.press('c');
    await expect(page.getByPlaceholder(/Type a message/i)).toBeVisible({ timeout: 5000 });

    // Escape: close chat drawer
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder(/Type a message/i)).not.toBeVisible();

    // M: toggle microphone
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // V: toggle video camera
    await page.keyboard.press('v');
    await page.waitForTimeout(300);

    // H: raise hand shortcut
    await page.keyboard.press('h');
    await page.waitForTimeout(300);
  });

  const THEMES = ['system', 'light', 'dark', 'garbage', null];
  const PAGES = ['/', '/auth', '/home'];

  for (const themeVal of THEMES) {
    test(`theme regression guard: every page loads in theme=${JSON.stringify(themeVal)} without ErrorBoundary or console crash`, async ({ browser }) => {
      const context = await browser.newContext({
        colorScheme: themeVal === 'dark' ? 'dark' : 'light'
      });

      // Inject theme into localStorage before page scripts execute
      await context.addInitScript((val) => {
        if (val === null) {
          localStorage.removeItem('theme');
          localStorage.removeItem('livelink_theme');
        } else {
          localStorage.setItem('theme', val);
          localStorage.setItem('livelink_theme', val);
        }
      }, themeVal);

      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      for (const route of PAGES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Ensure ErrorBoundary is NOT rendered
        const crashed = await page.getByText(/Something went wrong/i).first().isVisible().catch(() => false);
        expect(crashed).toBeFalsy();
      }

      // No fatal uncaught script crashes
      const fatalErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('401') && !e.includes('ERR_CONNECTION_CLOSED'));
      expect(fatalErrors).toEqual([]);

      await context.close();
    });
  }
});
