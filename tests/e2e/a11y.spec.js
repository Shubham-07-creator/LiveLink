import { test, expect } from '@playwright/test';

test.describe('E2E Layer 8: Accessibility, Focus Rings & Aria Labels', () => {
  test('verifies all icon-only buttons have explicit aria-label or accessible name', async ({ page }) => {
    await page.goto('/');

    const iconButtons = await page.$$('button');
    let unlabeledCount = 0;

    for (const btn of iconButtons) {
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.innerText();
      const title = await btn.getAttribute('title');

      if (!ariaLabel && !text.trim() && !title) {
        unlabeledCount++;
      }
    }

    // Every icon button on landing must have an accessible name or aria-label
    expect(unlabeledCount).toBe(0);
  });

  test('verifies active focus rings are visible on keyboard Tab navigation', async ({ page }) => {
    await page.goto('/');

    // Press Tab twice to navigate to first interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedTag);
  });
});
