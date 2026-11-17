import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETUP,
  FRICTIONLESS_RUN_TIME,
  G,
  LIMITS,
  frictionOn,
  outcomeOf,
  planBoth,
  planMotion,
  runDuration,
  snapshotAt,
  type Setup,
} from './physics';

const setup = (overrides: Partial<Setup> = {}): Setup => ({ ...DEFAULT_SETUP, ...overrides });
const inRange = (value: number, range: { min: number; max: number }): boolean => value >= range.min && value <= range.max;

describe('momentum', () => {
  it('is mass times velocity', () => {
    const { a, b } = planBoth(setup({ massA: 5_000, massB: 25_000, speed: 15 }));
    expect(a.p0).toBe(75_000);
    expect(b.p0).toBe(375_000);
  });

  it('at the same speed, grows in proportion to mass', () => {
    const { a, b } = planBoth(setup({ massA: 8_000, massB: 32_000, speed: 12 }));
    expect(b.p0 / a.p0).toBeCloseTo(4);
  });

  it('is zero at rest, whatever the mass', () => {
    const plan = planBoth(setup({ speed: 0 }));
    expect(plan.a.p0).toBe(0);
    expect(plan.b.p0).toBe(0);
    expect(plan.b.stopTime).toBe(0);
    expect(outcomeOf(plan)).toBe('at-rest');
    expect(runDuration(plan)).toBe(0);
  });
});

describe('same friction force on both trucks', () => {
  const plan = planBoth(setup({ frictionMode: 'force', frictionForce: 25_000 }));

  it('stops each truck after Δt = p / f (impulse-momentum theorem)', () => {
    expect(plan.a.stopTime).toBeCloseTo(plan.a.p0 / 25_000);
    expect(plan.b.stopTime).toBeCloseTo(plan.b.p0 / 25_000);
    expect(plan.a.stopTime).toBeCloseTo(3);
    expect(plan.b.stopTime).toBeCloseTo(15);
  });

  it('makes the heavier truck need more time and distance, in the ratio of the masses', () => {
    expect(plan.b.stopTime / plan.a.stopTime).toBeCloseTo(5);
    expect(plan.b.stopDistance / plan.a.stopDistance).toBeCloseTo(5);
    expect(plan.a.stopDistance).toBeCloseTo(22.5);
    expect(plan.b.stopDistance).toBeCloseTo(112.5);
    expect(outcomeOf(plan)).toBe('b');
  });

  it('says truck A when truck A is the heavier one', () => {
    expect(outcomeOf(planBoth(setup({ massA: 30_000, massB: 10_000 })))).toBe('a');
  });

  it('stops trucks of equal mass together', () => {
    expect(outcomeOf(planBoth(setup({ massA: 12_000, massB: 12_000 })))).toBe('same');
  });

  it('runs until the last truck stops', () => {
    expect(runDuration(plan)).toBeCloseTo(15);
  });
});

describe('same road (coefficient of friction)', () => {
  const plan = planBoth(setup({ frictionMode: 'coefficient', mu: 0.3 }));

  it('pushes harder on the heavier truck: f = μ·m·g', () => {
    expect(plan.a.friction).toBeCloseTo(0.3 * 5_000 * G);
    expect(plan.b.friction / plan.a.friction).toBeCloseTo(5);
  });

  it('gives both trucks the same deceleration μ·g, so they stop together', () => {
    expect(plan.a.decel).toBeCloseTo(0.3 * G);
    expect(plan.b.decel).toBeCloseTo(0.3 * G);
    expect(plan.a.stopTime).toBeCloseTo(plan.b.stopTime);
    expect(outcomeOf(plan)).toBe('same');
  });

  it('still gives the heavier truck more momentum', () => {
    expect(plan.b.p0).toBeGreaterThan(plan.a.p0);
  });
});

describe('no friction', () => {
  for (const frictionSetup of [
    { frictionMode: 'force', frictionForce: 0 },
    { frictionMode: 'coefficient', mu: 0 },
  ] as const) {
    it(`never stops (${frictionSetup.frictionMode} mode)`, () => {
      const plan = planBoth(setup(frictionSetup));
      expect(plan.b.stopTime).toBe(Infinity);
      expect(outcomeOf(plan)).toBe('never-stop');
      expect(runDuration(plan)).toBe(FRICTIONLESS_RUN_TIME);
    });
  }

  it('keeps the momentum constant (Newton’s first law)', () => {
    const motion = planMotion(20_000, 10, 0);
    const later = snapshotAt(motion, 7);
    expect(later.v).toBe(10);
    expect(later.p).toBe(200_000);
    expect(later.x).toBeCloseTo(70);
  });
});

describe('snapshotAt', () => {
  const motion = planMotion(10_000, 20, 20_000); // a = 2 m/s², stops after 10 s and 100 m

  it('starts at the start line with the initial momentum', () => {
    expect(snapshotAt(motion, 0)).toEqual({ x: 0, v: 20, p: 200_000, stopped: false });
  });

  it('loses momentum at the rate of the friction force: Δp/Δt = −f', () => {
    const before = snapshotAt(motion, 2);
    const after = snapshotAt(motion, 5);
    expect((after.p - before.p) / 3).toBeCloseTo(-20_000);
  });

  it('follows x = v0·t − a·t²/2 while braking', () => {
    expect(snapshotAt(motion, 4).x).toBeCloseTo(20 * 4 - 0.5 * 2 * 16);
  });

  it('stays put once stopped, exactly at the stopping distance', () => {
    expect(snapshotAt(motion, 10)).toEqual({ x: 100, v: 0, p: 0, stopped: true });
    expect(snapshotAt(motion, 60)).toEqual({ x: 100, v: 0, p: 0, stopped: true });
  });

  it('moves continuously right up to the stop', () => {
    const justBefore = snapshotAt(motion, 10 - 1e-6);
    expect(justBefore.x).toBeCloseTo(100, 5);
    expect(justBefore.v).toBeCloseTo(0, 4);
  });
});

describe('frictionOn', () => {
  it('uses the chosen force in force mode, whatever the mass', () => {
    const s = { frictionMode: 'force', frictionForce: 12_000, mu: 0.9 } as const;
    expect(frictionOn(5_000, s)).toBe(12_000);
    expect(frictionOn(40_000, s)).toBe(12_000);
  });
});

describe('defaults', () => {
  it('fit inside the slider ranges', () => {
    expect(inRange(DEFAULT_SETUP.massA, LIMITS.mass)).toBe(true);
    expect(inRange(DEFAULT_SETUP.massB, LIMITS.mass)).toBe(true);
    expect(inRange(DEFAULT_SETUP.speed, LIMITS.speed)).toBe(true);
    expect(inRange(DEFAULT_SETUP.frictionForce, LIMITS.force)).toBe(true);
    expect(inRange(DEFAULT_SETUP.mu, LIMITS.mu)).toBe(true);
  });

  it('compare an empty truck with a loaded one', () => {
    expect(DEFAULT_SETUP.massA).toBe(LIMITS.mass.min);
    expect(DEFAULT_SETUP.massB).toBeGreaterThan(DEFAULT_SETUP.massA);
  });
});
