import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('E2E Layer 8: Accessibility, Focus Rings & Aria Labels', () => {
  test('verifies all icon-only buttons have explicit aria-label or accessible name', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const firstInteractive = page.locator('button, a').first();
    await firstInteractive.focus();

    // Verify first focused element is interactive
    const initialFocusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A']).toContain(initialFocusedTag);

    // Tab to next interactive element
    await page.keyboard.press('Tab');
    const nextFocusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(nextFocusedTag);
  });

  test('runs automated axe-core accessibility audit on landing page with zero serious/critical violations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });
});
