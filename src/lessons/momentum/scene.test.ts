import { describe, expect, it } from 'vitest';
import { FAST_FORWARD, playbackSpeed, stepFromHash, trace } from './lesson';
import { planMotion } from './physics';
import { crateCount, followCamera, frameRoad, shade } from './scene';

describe('followCamera', () => {
  it('starts with the trucks at the start line in view', () => {
    expect(followCamera(0, 60)).toBe(-13);
  });

  it('then keeps the leading truck a fixed way across the view', () => {
    expect(followCamera(100, 60)).toBeCloseTo(100 - 0.42 * 60);
  });
});

describe('frameRoad', () => {
  it('shows the start line before anything moves', () => {
    expect(frameRoad(0, 0, 60)).toEqual({ left: -13, meters: 60 });
  });

  it('follows two trucks driving side by side without zooming', () => {
    const view = frameRoad(80, 80, 60);
    expect(view.meters).toBeCloseTo(60);
    expect(view.left).toBeCloseTo(80 - 0.42 * 60);
  });

  it('zooms out to keep a truck that has stopped behind in view', () => {
    const view = frameRoad(22.5, 112.5, 60);
    expect(view.left).toBeLessThanOrEqual(22.5 - 10); // the whole of the truck behind
    expect(view.left + view.meters).toBeGreaterThan(112.5); // and the leader's front
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
    expect(trace(motion, 0)).toEqual([[0, 200_000]]);
  });

  it('is a straight drop while braking', () => {
    expect(trace(motion, 4)).toEqual([
      [0, 200_000],
      [4, 120_000],
    ]);
  });

  it('bends at the stop and stays at zero', () => {
    expect(trace(motion, 12)).toEqual([
      [0, 200_000],
      [10, 0],
      [12, 0],
    ]);
  });

  it('stays flat at zero for a truck at rest', () => {
    expect(trace(planMotion(10_000, 0, 20_000), 3)).toEqual([
      [0, 0],
      [3, 0],
    ]);
  });
});

describe('playbackSpeed', () => {
  it('plays short runs in real time and speeds up long ones', () => {
    expect(playbackSpeed(15)).toBe(1);
    expect(playbackSpeed(20)).toBe(1);
    expect(playbackSpeed(45)).toBe(3);
  });

  it('multiplies the speed-up by the fast-forward factor', () => {
    expect(playbackSpeed(15, true)).toBe(FAST_FORWARD);
    expect(playbackSpeed(45, true)).toBe(3 * FAST_FORWARD);
  });
});

describe('stepFromHash', () => {
  it('reads #step-N and falls back to the first step', () => {
    expect(stepFromHash('#step-3')).toBe(3);
    expect(stepFromHash('#step-9')).toBe(1);
    expect(stepFromHash('')).toBe(1);
    expect(stepFromHash('#nonsense')).toBe(1);
  });
});
