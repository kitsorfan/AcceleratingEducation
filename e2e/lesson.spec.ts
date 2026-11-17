import { expect, test } from '@playwright/test';
import { scene, setSlider, watchForProblems } from './helpers';

test('loads cleanly and never contacts third parties', async ({ page, baseURL }) => {
  const problems = watchForProblems(page);
  const thirdParty: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL ?? '') && !url.startsWith('data:')) thirdParty.push(url);
  });

  await page.goto('./');
  await expect(page).toHaveTitle('Momentum · Physics AI Teacher');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Momentum');
  await expect(scene(page)).toHaveAttribute('data-state', 'ready');
  await page.waitForTimeout(500);

  expect(thirdParty).toEqual([]);
  expect(problems).toEqual([]);
});

test('ships a strict Content-Security-Policy with no unsafe sources', async ({ page }) => {
  await page.goto('./');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain('unsafe-');
});

test('shows the momentum of each truck before anything moves', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#a-momentum')).toHaveText('75,000 kg·m/s');
  await expect(page.locator('#b-momentum')).toHaveText('375,000 kg·m/s');
  await expect(page.locator('#ratio')).toHaveText('At the start, truck B has 5× the momentum of truck A.');

  // Loading truck A up to the same mass makes the momenta equal.
  await setSlider(page.locator('#mass-a'), 25_000);
  await expect(page.locator('#a-momentum')).toHaveText('375,000 kg·m/s');
  await expect(page.locator('#ratio')).toHaveText('Both trucks start with the same momentum.');
  await expect(page.locator('#mass-a-note')).toHaveText('Truck 5,000 kg + cargo 20,000 kg');
});

test('a correct prediction with the same braking force: the loaded truck needs 5× the road', async ({ page }) => {
  const problems = watchForProblems(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Truck B' }).click();
  await expect(page.getByRole('button', { name: 'Truck B' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '▶ Run' }).click();
  await expect(scene(page)).toHaveAttribute('data-state', 'running');
  await expect(page.getByRole('button', { name: 'Truck A' })).toBeDisabled();
  await expect(page.locator('#mass-a')).toBeDisabled();

  await page.getByRole('button', { name: '⏭ Skip to end' }).click();
  await expect(scene(page)).toHaveAttribute('data-state', 'finished');
  await expect(page.locator('#a-stop')).toHaveText('3.0 s');
  await expect(page.locator('#b-stop')).toHaveText('15.0 s');
  await expect(page.locator('#a-distance')).toHaveText('22.5 m');
  await expect(page.locator('#b-distance')).toHaveText('112.5 m');
  await expect(page.locator('#b-momentum')).toHaveText('0 kg·m/s');
  await expect(page.locator('#result')).toHaveAttribute('data-verdict', 'right');
  await expect(page.locator('#verdict')).toHaveText('✓ Correct! You predicted: Truck B.');
  await expect(page.locator('#explain')).toContainText('5× as long to lose it');
  await expect(page.locator('#run')).toHaveText('▶ Run again');
  expect(problems).toEqual([]);
});

test('same road (μ): both trucks stop together, so "Truck B" is wrong', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: 'Same road (μ)' }).check();
  await expect(page.locator('#friction-out')).toHaveText('μ = 0.30');
  await page.getByRole('button', { name: 'Truck B' }).click();
  await page.getByRole('button', { name: '▶ Run' }).click();
  await page.getByRole('button', { name: '⏭ Skip to end' }).click();

  await expect(page.locator('#result')).toHaveAttribute('data-verdict', 'wrong');
  await expect(page.locator('#verdict')).toHaveText('✗ Not quite. You predicted: Truck B. Answer: Same distance.');
  await expect(page.locator('#a-distance')).toHaveText(await page.locator('#b-distance').innerText());
  await expect(page.locator('#explain')).toContainText('a = μ·g = 2.94 m/s²');
});

test('without friction the trucks never stop and keep their momentum', async ({ page }) => {
  await page.goto('./');
  await setSlider(page.locator('#friction'), 0);
  await expect(page.locator('#friction-note')).toHaveText('No friction at all: nothing slows the trucks down.');
  await page.getByRole('button', { name: '▶ Run' }).click();
  await page.getByRole('button', { name: '⏭ Skip to end' }).click();

  await expect(page.locator('#verdict')).toHaveText('Neither truck stops!');
  await expect(page.locator('#b-momentum')).toHaveText('375,000 kg·m/s');
  await expect(page.locator('#b-stop')).toHaveText('never');
});

test('runs in real time, pauses with the button and Space, and resets with R', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '×4' }).click();
  await page.getByRole('button', { name: '▶ Run' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '⏸ Pause' }).click();
  await expect(scene(page)).toHaveAttribute('data-state', 'paused');
  const distance = Number.parseFloat(await page.locator('#b-distance').innerText());
  expect(distance).toBeGreaterThan(5);

  // While paused, nothing moves.
  await page.waitForTimeout(300);
  expect(Number.parseFloat(await page.locator('#b-distance').innerText())).toBe(distance);

  await page.locator('h1').click(); // move focus off the buttons, as a teacher would before using keys
  await page.keyboard.press('Space');
  await expect(scene(page)).toHaveAttribute('data-state', 'running');
  await page.keyboard.press('KeyR');
  await expect(scene(page)).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#b-distance')).toHaveText('0.0 m');
});

test('switches to Greek, with Greek numbers, and remembers the choice', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'ΕΛ' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page).toHaveTitle('Ορμή · Physics AI Teacher');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ορμή');
  await expect(page.locator('#b-momentum')).toHaveText('375.000 kg·m/s');
  await expect(page.locator('#speed-out')).toHaveText('15,0 m/s (54 km/h)');
  await expect(page.locator('#run')).toHaveText('▶ Εκκίνηση');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ορμή');

  // A link with ?lang= wins over the saved choice.
  await page.goto('./?lang=en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Momentum');
});

test('explains the result in Greek', async ({ page }) => {
  await page.goto('./?lang=el');
  await page.getByRole('button', { name: 'Φορτηγό Β' }).click();
  await page.getByRole('button', { name: '▶ Εκκίνηση' }).click();
  await page.getByRole('button', { name: '⏭ Στο τέλος' }).click();
  await expect(page.locator('#verdict')).toHaveText('✓ Σωστά! Πρόβλεψες: Φορτηγό Β.');
  await expect(page.locator('#explain')).toContainText('Το φορτηγό Β ξεκίνησε με 5 φορές μεγαλύτερη ορμή από το φορτηγό Α');
  await expect(page.locator('#b-distance')).toHaveText('112,5 m');
});
