import { describe, expect, it } from 'vitest';
import {
  MIN_MASS_GAP,
  MIN_SPEED_GAP,
  SHUFFLE_MU,
  challengeFromSetup,
  planChallenge,
  shuffleChallenge,
  type Challenge,
} from './challenge';
import { DEFAULT_SETUP, G, LIMITS, outcomeOf, runDuration } from './physics';

/** A small seeded random source (mulberry32), so the shuffle tests are repeatable. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A broken random source that always returns the same number. */
const stuck = (): number => 0;

/** A run of shuffles, each dealt from the one before, as a teacher pressing Shuffle again and again. */
function shuffles(count: number, seed = 1): Challenge[] {
  const random = seeded(seed);
  const dealt: Challenge[] = [];
  let current: Challenge | null = challengeFromSetup(DEFAULT_SETUP);
  for (let i = 0; i < count; i++) {
    current = shuffleChallenge(current, random);
    dealt.push(current);
  }
  return dealt;
}

describe('the challenge from the simulation', () => {
  const challenge = challengeFromSetup(DEFAULT_SETUP);

  it('keeps the trucks from the sliders, on a road with μ from the setup', () => {
    expect(challenge).toEqual({ massA: 5_000, massB: 25_000, speedA: 15, speedB: 15, mu: 0.3 });
  });

  it('stops both trucks together: same speed, same deceleration μ·g', () => {
    const plan = planChallenge(challenge);
    expect(plan.a.friction).toBeCloseTo(0.3 * 5_000 * G);
    expect(plan.b.friction).toBeCloseTo(0.3 * 25_000 * G);
    expect(plan.a.decel).toBeCloseTo(plan.b.decel);
    expect(outcomeOf(plan)).toBe('same');
  });
});

describe('planChallenge', () => {
  it('sends the faster truck further, whatever the masses: x = v² / (2·μ·g)', () => {
    const plan = planChallenge({ massA: 40_000, massB: 5_000, speedA: 10, speedB: 20, mu: 0.5 });
    expect(plan.a.stopDistance).toBeCloseTo(100 / (2 * 0.5 * G));
    expect(plan.b.stopDistance).toBeCloseTo(400 / (2 * 0.5 * G));
    expect(outcomeOf(plan)).toBe('b');
  });

  it('with the same momentum, sends the lighter (faster) truck further', () => {
    const plan = planChallenge({ massA: 8_000, massB: 16_000, speedA: 20, speedB: 10, mu: 0.4 });
    expect(plan.a.p0).toBe(plan.b.p0);
    expect(plan.a.stopDistance / plan.b.stopDistance).toBeCloseTo(4);
    expect(outcomeOf(plan)).toBe('a');
  });
});

describe('shuffleChallenge', () => {
  const dealt = shuffles(600);

  it('deals trucks inside the slider ranges, in whole tonnes and whole m/s', () => {
    for (const c of dealt) {
      for (const mass of [c.massA, c.massB]) {
        expect(mass).toBeGreaterThanOrEqual(LIMITS.mass.min);
        expect(mass).toBeLessThanOrEqual(LIMITS.mass.max);
        expect(mass % 1_000).toBe(0);
      }
      for (const speed of [c.speedA, c.speedB]) {
        expect(Number.isInteger(speed)).toBe(true);
        expect(speed).toBeGreaterThan(0);
        expect(speed).toBeLessThanOrEqual(LIMITS.speed.max);
      }
      expect(SHUFFLE_MU).toContain(c.mu);
    }
  });

  it('always has a clear difference to spot: in mass when the speeds match, else in speed', () => {
    const unclear = dealt.filter((c) =>
      c.speedA === c.speedB
        ? Math.abs(c.massA - c.massB) < MIN_MASS_GAP
        : Math.abs(c.speedA - c.speedB) < MIN_SPEED_GAP,
    );
    expect(unclear).toEqual([]);
  });

  it('never deals the challenge already on screen', () => {
    let current = challengeFromSetup(DEFAULT_SETUP);
    for (const next of dealt) {
      expect(next).not.toEqual(current);
      current = next;
    }
  });

  it('gives every answer, A, B and the same distance, about equally often', () => {
    const counts = { a: 0, b: 0, same: 0 } as Record<string, number>;
    for (const c of dealt) {
      const outcome = outcomeOf(planChallenge(c));
      counts[outcome] = (counts[outcome] ?? 0) + 1;
    }
    expect(Object.keys(counts).toSorted()).toEqual(['a', 'b', 'same']);
    for (const count of Object.values(counts)) expect(count).toBeGreaterThan(dealt.length / 5);
  });

  it('includes trucks with the same momentum but different speeds', () => {
    const sameP = dealt.filter((c) => c.massA * c.speedA === c.massB * c.speedB && c.speedA !== c.speedB);
    expect(sameP.length).toBeGreaterThan(dealt.length / 10);
  });

  it('plays every run in real time, in under 10 s', () => {
    for (const c of dealt) expect(runDuration(planChallenge(c))).toBeLessThan(10);
  });

  it('still returns a valid challenge from a random source that never changes', () => {
    const first = shuffleChallenge(null, stuck);
    expect(shuffleChallenge(first, stuck)).toEqual(first);
    expect(outcomeOf(planChallenge(first))).not.toBe('never-stop');
  });
});
