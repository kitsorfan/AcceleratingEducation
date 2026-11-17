import { expect, test, type Page } from '@playwright/test';
import { scene, setSlider, watchForProblems } from './helpers';

const step = (page: Page, n: number) => page.locator(`.step-tab[data-step="${n}"]`);
const panel = (page: Page, n: number) => page.locator(`[data-panel="${n}"]`);

/** A quick experiment: truck A stops after 1 s and 5 m, truck B after 2 s and 10 m. */
async function quickSetup(page: Page): Promise<void> {
  await setSlider(page.locator('#mass-b'), 10_000);
  await setSlider(page.locator('#speed'), 10);
  await setSlider(page.locator('#friction'), 50_000);
}

test('loads cleanly, branded, and never contacts third parties', async ({ page, baseURL }) => {
  const problems = watchForProblems(page);
  const thirdParty: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(baseURL ?? '') && !url.startsWith('data:')) thirdParty.push(url);
  });

  await page.goto('./');
  await expect(page).toHaveTitle('Momentum · Accelerating Education');
  await expect(page.locator('.brand-name')).toHaveText('ACCELERATING EDUCATION');
  await expect(page.locator('.brand-teacher')).toHaveText('Dr. Kontokostas George');
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

test('starts on the simulation: just the trucks and four sliders', async ({ page }) => {
  await page.goto('./');
  await expect(step(page, 1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which truck is harder to stop?');
  await expect(scene(page)).toBeVisible();
  await expect(panel(page, 1).locator('input[type="range"]')).toHaveCount(4);
  await expect(page.locator('#mass-a-out')).toHaveText('5,000 kg');
  await expect(page.locator('#mass-b-out')).toHaveText('25,000 kg');
  await expect(page.locator('#speed-out')).toHaveText('15.0 m/s (54 km/h)');
  await expect(page.locator('#friction-out')).toHaveText('25,000 N');
  await expect(page.getByLabel('Friction same on both')).toBeVisible();
  for (const n of [2, 3, 4]) await expect(panel(page, n)).toBeHidden();
  await expect(page.getByRole('button', { name: /back|next/i })).toHaveCount(0);
});

test('the stepper moves freely between steps and remembers the step in the address', async ({ page }) => {
  await page.goto('./');
  await step(page, 3).click();
  await expect(step(page, 3)).toHaveAttribute('aria-current', 'step');
  await expect(page).toHaveURL(/#step-3$/);
  await expect(scene(page)).toBeHidden();
  await expect(page.locator('#calc-pb')).toHaveText('pB = 25,000 kg × 15.0 m/s = 375,000 kg·m/s');
  await expect(page.locator('#calc-tb')).toHaveText('ΔtB = 375,000 / 25,000 = 15.0 s');

  await step(page, 2).click();
  await expect(panel(page, 2)).toBeVisible();
  await expect(page.locator('#b-momentum')).toHaveText('375,000 kg·m/s');
  await expect(page.locator('#ratios')).toHaveText('pB = 5 × pA');

  await page.reload();
  await expect(step(page, 2)).toHaveAttribute('aria-current', 'step');
  await step(page, 1).click();
  await expect(panel(page, 1)).toBeVisible();
});

test('a run started on the simulation keeps going on the graph step', async ({ page }) => {
  const problems = watchForProblems(page);
  await page.goto('./');
  await quickSetup(page);
  await page.locator('#run').click();
  await expect(scene(page)).toHaveAttribute('data-state', 'running');
  await expect(page.locator('#mass-a')).toBeDisabled();

  await step(page, 2).click();
  await expect(scene(page)).toHaveAttribute('data-state', 'finished', { timeout: 6000 });
  await expect(page.locator('#a-stop')).toHaveText('1.0 s');
  await expect(page.locator('#b-stop')).toHaveText('2.0 s');
  await expect(page.locator('#a-distance')).toHaveText('5.0 m');
  await expect(page.locator('#b-distance')).toHaveText('10.0 m');
  await expect(page.locator('#ratios')).toContainText('tB = 2 × tA');
  await expect(page.locator('#ratios')).toContainText('xB = 2 × xA');
  await expect(page.locator('#run-label')).toHaveText('Run again');
  expect(problems).toEqual([]);
});

test('pauses with the button and Space, and resets with R', async ({ page }) => {
  await page.goto('./');
  await page.locator('#run').click();
  await page.waitForTimeout(600);
  await page.locator('#run').click();
  await expect(scene(page)).toHaveAttribute('data-state', 'paused');
  await expect(page.locator('#run-label')).toHaveText('Continue');

  await page.locator('h1').click(); // move focus off the buttons, as a teacher would before using keys
  await page.keyboard.press('Space');
  await expect(scene(page)).toHaveAttribute('data-state', 'running');
  await page.keyboard.press('KeyR');
  await expect(scene(page)).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#clock')).toHaveText('t = 0.0 s');
});

test('without friction the calculations say the momentum cannot change', async ({ page }) => {
  await page.goto('./');
  await setSlider(page.locator('#friction'), 0);
  await expect(page.locator('#friction-out')).toHaveText('0 N (none)');
  await step(page, 3).click();
  await expect(page.locator('#calc-ta')).toHaveText('F = 0  ⇒  Δp = 0');
  await expect(page.locator('#calc-tb')).toBeHidden();
});

test('challenge: on the same road both trucks stop together', async ({ page }) => {
  await page.goto('./');
  await setSlider(page.locator('#speed'), 5); // a short run: about 1.7 s
  await step(page, 4).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Same road');
  await expect(page.locator('#step-lede')).toHaveText('f = μ·m·g (μ = 0.30)');

  await page.getByRole('button', { name: 'Truck B' }).click();
  await page.locator('#run').click();
  await expect(page.getByRole('button', { name: 'Truck A' })).toBeDisabled();
  await expect(scene(page)).toHaveAttribute('data-state', 'finished', { timeout: 6000 });
  await expect(page.locator('#result')).toHaveAttribute('data-verdict', 'wrong');
  await expect(page.locator('#verdict')).toHaveText('✗ Not quite. Answer: Same distance.');
  await expect(page.locator('#explain')).toContainText('a = μ·g = 2.94 m/s²');
});

test('challenge: New problem deals another challenge, from the start line', async ({ page }) => {
  const problems = watchForProblems(page);
  await page.clock.install(); // so a run can be played to the end without waiting for it
  await page.goto('./');
  const newProblem = page.getByRole('button', { name: 'New problem' });
  await expect(newProblem).toBeHidden();
  await step(page, 4).click();
  await expect(newProblem).toBeVisible();

  await page.getByRole('button', { name: 'Truck A' }).click();
  await page.locator('#run').click();
  await newProblem.click();
  await expect(scene(page)).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#clock')).toHaveText('t = 0.0 s');
  await expect(page.getByRole('button', { name: 'Truck A' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#step-lede')).toHaveText(/^f\s=\sμ·m·g\s\(μ\s=\s0\.[3-7]0\)$/); // no-break spaces

  await page.locator('h1').click();
  await page.keyboard.press('KeyN'); // N deals a new problem too
  await page.locator('#run').click();
  await page.clock.runFor(10_000); // every random run is over in under 10 s
  await expect(scene(page)).toHaveAttribute('data-state', 'finished');
  await expect(page.locator('#verdict')).toHaveText(/^Answer: (Truck A|Truck B|Same distance)\.$/);
  await expect(page.locator('#explain')).toContainText('μ·g =');

  // Moving a slider brings back the trucks from the simulation.
  await step(page, 1).click();
  await setSlider(page.locator('#speed'), 5);
  await step(page, 4).click();
  await expect(page.locator('#step-lede')).toHaveText('f = μ·m·g (μ = 0.30)');
  expect(problems).toEqual([]);
});

test('switches to Greek, with Greek numbers, and remembers the choice', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'ΕΛ' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'el');
  await expect(page).toHaveTitle('Ορμή · Accelerating Education');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ποιο φορτηγό σταματά πιο δύσκολα;');
  await expect(step(page, 1)).toContainText('Προσομοίωση');
  await expect(page.locator('#mass-b-out')).toHaveText('25.000 kg');
  await expect(page.locator('#speed-out')).toHaveText('15,0 m/s (54 km/h)');
  await expect(page.locator('#run-label')).toHaveText('Εκκίνηση');

  await page.reload();
  await expect(page.locator('#run-label')).toHaveText('Εκκίνηση');

  // A link with ?lang= wins over the saved choice.
  await page.goto('./?lang=en');
  await expect(page.locator('#run-label')).toHaveText('Run');
});
