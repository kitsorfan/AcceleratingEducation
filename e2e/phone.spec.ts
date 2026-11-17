import { expect, test } from '@playwright/test';
import { scene } from './helpers';

test('every step fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.goto('./');
  await expect(scene(page)).toBeVisible();
  for (const n of [1, 2, 3, 4]) {
    await page.locator(`.step-tab[data-step="${n}"]`).tap();
    await expect(page.locator(`[data-panel="${n}"]`)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect({ step: n, overflow: Math.max(0, overflow) }).toEqual({ step: n, overflow: 0 });
  }
});

test('the stepper stays in reach after scrolling down', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.lesson-nav')).toBeInViewport();
});

test('runs the simulation with taps', async ({ page }) => {
  await page.goto('./');
  await page.locator('#run').tap();
  await expect(scene(page)).toHaveAttribute('data-state', 'running');
  await page.locator('#run').tap();
  await expect(scene(page)).toHaveAttribute('data-state', 'paused');
});
