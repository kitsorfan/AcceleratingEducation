import { expect, test } from '@playwright/test';
import { scene } from './helpers';

test('fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.goto('./');
  await expect(scene(page)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('runs the experiment with taps', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Truck B' }).tap();
  await page.getByRole('button', { name: '▶ Run' }).tap();
  await page.getByRole('button', { name: '⏭ Skip to end' }).tap();
  await expect(scene(page)).toHaveAttribute('data-state', 'finished');
  await expect(page.locator('#verdict')).toHaveText('✓ Correct! You predicted: Truck B.');
});
