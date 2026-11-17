import { describe, expect, it } from 'vitest';
import { trace } from './lesson';
import { planMotion } from './physics';
import { crateCount, followCamera, shade } from './scene';

describe('followCamera', () => {
  it('starts with the trucks at the start line in view', () => {
    expect(followCamera(0, 60)).toBe(-13);
  });

  it('then keeps the leading truck a fixed way across the view', () => {
    expect(followCamera(100, 60)).toBeCloseTo(100 - 0.42 * 60);
  });
});

describe('crateCount', () => {
  it('shows an empty truck empty and a full one full', () => {
    expect(crateCount(5_000)).toBe(0);
    expect(crateCount(40_000)).toBe(8);
  });

  it('grows with the cargo', () => {
    expect(crateCount(25_000)).toBeGreaterThan(crateCount(10_000));
  });
});

describe('shade', () => {
  it('darkens and lightens a colour', () => {
    expect(shade('#808080', -0.5)).toBe('rgb(64 64 64)');
    expect(shade('#000000', 1)).toBe('rgb(255 255 255)');
  });
});

describe('trace (graph line so far)', () => {
  const motion = planMotion(10_000, 20, 20_000); // stops after 10 s

  it('is a single point before the run', () => {
    expect(trace(motion, 0, 'p')).toEqual([[0, 200_000]]);
  });

  it('is a straight drop while braking', () => {
    expect(trace(motion, 4, 'v')).toEqual([
      [0, 20],
      [4, 12],
    ]);
  });

  it('bends at the stop and stays at zero', () => {
    expect(trace(motion, 12, 'p')).toEqual([
      [0, 200_000],
      [10, 0],
      [12, 0],
    ]);
  });

  it('stays flat at zero for a truck at rest', () => {
    expect(trace(planMotion(10_000, 0, 20_000), 3, 'p')).toEqual([
      [0, 0],
      [3, 0],
    ]);
  });
});
