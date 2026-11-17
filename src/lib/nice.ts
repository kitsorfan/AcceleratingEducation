/** Helpers for round, readable axis and ruler values. */

/** A tick step of 1, 2, 2.5 or 5 × 10ⁿ that splits `range` into about `targetTicks` parts. */
export function niceStep(range: number, targetTicks = 5): number {
  if (!(range > 0) || !Number.isFinite(range)) return 1;
  const raw = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Rounds `value` up to a multiple of a nice step, so an axis ends on a labelled tick. */
export function niceCeil(value: number, targetTicks = 5): number {
  if (!(value > 0) || !Number.isFinite(value)) return 1;
  const step = niceStep(value, targetTicks);
  return Math.ceil(value / step - 1e-9) * step;
}

/** The smallest of the candidate steps whose length on screen is at least `minPixels`. */
export function stepForPixels(pixelsPerUnit: number, minPixels: number, candidates: readonly number[]): number {
  for (const step of candidates) if (step * pixelsPerUnit >= minPixels) return step;
  return candidates.at(-1) ?? 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Digits to show for a ratio: none when it is (almost) a whole number, one otherwise. */
export function ratioDigits(ratio: number): number {
  return Math.abs(ratio - Math.round(ratio)) < 0.005 ? 0 : 1;
}
