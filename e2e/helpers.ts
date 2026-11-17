import type { Locator, Page } from '@playwright/test';

/** Collects anything that would indicate a broken or leaky page. */
export function watchForProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`console ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
  page.on('requestfailed', (req) => problems.push(`request failed: ${req.url()}`));
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });
  return problems;
}

export const scene = (page: Page): Locator => page.locator('#scene');

/** Moves a range slider to a value the way a user drag would (fires the input event). */
export async function setSlider(slider: Locator, value: number): Promise<void> {
  await slider.evaluate((input, v) => {
    if (!(input instanceof HTMLInputElement)) throw new Error('Not an input');
    input.value = String(v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
