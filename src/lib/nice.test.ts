import { describe, expect, it } from 'vitest';
import { clamp, niceCeil, niceStep, ratioDigits, stepForPixels } from './nice';

describe('niceStep', () => {
  it('picks 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(100, 5)).toBe(20);
    expect(niceStep(375_000, 5)).toBe(100_000);
    expect(niceStep(15, 5)).toBe(5);
    expect(niceStep(12, 5)).toBe(2.5);
    expect(niceStep(3, 5)).toBe(1);
  });

  it('survives empty or broken ranges', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(Infinity)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
  });
});

describe('niceCeil', () => {
  it('rounds up to a tick', () => {
    expect(niceCeil(375_000)).toBe(400_000);
    expect(niceCeil(15)).toBe(15);
    expect(niceCeil(16)).toBe(20);
    expect(niceCeil(112.5)).toBe(125);
  });
});

describe('stepForPixels', () => {
  it('returns the first step that is long enough on screen', () => {
    expect(stepForPixels(16, 64, [5, 10, 20])).toBe(5);
    expect(stepForPixels(8, 64, [5, 10, 20])).toBe(10);
    expect(stepForPixels(1, 64, [5, 10, 20])).toBe(20);
  });
});

describe('clamp and ratioDigits', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });

  it('shows whole ratios without decimals', () => {
    expect(ratioDigits(5)).toBe(0);
    expect(ratioDigits(2.5)).toBe(1);
  });
});
