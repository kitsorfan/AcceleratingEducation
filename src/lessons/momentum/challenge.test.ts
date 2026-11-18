import { describe, expect, it } from 'vitest';
import {
  MIN_MASS_GAP,
  MIN_MOMENTUM_RATIO,
  MIN_SPEED_GAP,
  QUESTIONS,
  RANDOM_MU,
  answerOf,
  challengeFromSetup,
  planChallenge,
  randomChallenge,
  type Challenge,
  type Question,
} from './challenge';
import { DEFAULT_SETUP, G, LIMITS, outcomeOf, runDuration, type Plan } from './physics';

/** A small seeded random source (mulberry32), so the random tests are repeatable. */
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

/** Random challenges, each dealt from the one before, as a teacher pressing New problem again and again. */
function newProblems(count: number, seed = 1): Challenge[] {
  const random = seeded(seed);
  const dealt: Challenge[] = [];
  let current: Challenge | null = challengeFromSetup(DEFAULT_SETUP);
  for (let i = 0; i < count; i++) {
    current = randomChallenge(current, random);
    dealt.push(current);
  }
  return dealt;
}

const momentumOf = (c: Challenge): [number, number] => [c.massA * c.speedA, c.massB * c.speedB];

/** The answer to every question about the same two trucks. */
const answers = (plan: Plan): Record<Question, string> =>
  Object.fromEntries(QUESTIONS.map((q) => [q, answerOf(q, plan)])) as Record<Question, string>;

describe('the challenge from the simulation', () => {
  const challenge = challengeFromSetup(DEFAULT_SETUP);

  it('asks about the distance, with the trucks from the sliders, on a road with μ from the setup', () => {
    expect(challenge).toEqual({ question: 'distance', massA: 5_000, massB: 25_000, speedA: 15, speedB: 15, mu: 0.3 });
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
    const plan = planChallenge({ question: 'distance', massA: 40_000, massB: 5_000, speedA: 10, speedB: 20, mu: 0.5 });
    expect(plan.a.stopDistance).toBeCloseTo(100 / (2 * 0.5 * G));
    expect(plan.b.stopDistance).toBeCloseTo(400 / (2 * 0.5 * G));
    expect(outcomeOf(plan)).toBe('b');
  });

  it('with the same momentum, sends the lighter (faster) truck further', () => {
    const plan = planChallenge({ question: 'distance', massA: 8_000, massB: 16_000, speedA: 20, speedB: 10, mu: 0.4 });
    expect(plan.a.p0).toBe(plan.b.p0);
    expect(plan.a.stopDistance / plan.b.stopDistance).toBeCloseTo(4);
    expect(outcomeOf(plan)).toBe('a');
  });
});

describe('answerOf', () => {
  it('answers each question with its own quantity: x and t follow the speed, p = m·v, f = μ·m·g the mass', () => {
    // A heavy, slow truck A with more momentum, and a light, fast truck B.
    const plan = planChallenge({ question: 'momentum', massA: 30_000, massB: 10_000, speedA: 10, speedB: 20, mu: 0.5 });
    expect([plan.a.p0, plan.b.p0]).toEqual([300_000, 200_000]);
    expect(answers(plan)).toEqual({ distance: 'b', time: 'b', momentum: 'a', friction: 'a' });
  });

  it('says "the same" to every question about two identical trucks', () => {
    const plan = planChallenge({ question: 'time', massA: 12_000, massB: 12_000, speedA: 9, speedB: 9, mu: 0.6 });
    expect(answers(plan)).toEqual({ distance: 'same', time: 'same', momentum: 'same', friction: 'same' });
  });

  it('with the trucks from the simulation: the same distance and time, but B has 5× the momentum and the friction', () => {
    const plan = planChallenge(challengeFromSetup(DEFAULT_SETUP));
    expect(answers(plan)).toEqual({ distance: 'same', time: 'same', momentum: 'b', friction: 'b' });
  });

  it('has no answer when both trucks stand still', () => {
    const plan = planChallenge({ question: 'distance', massA: 5_000, massB: 9_000, speedA: 0, speedB: 0, mu: 0.3 });
    for (const q of QUESTIONS) expect(answerOf(q, plan)).toBe('at-rest');
  });
});

describe('randomChallenge', () => {
  const dealt = newProblems(800);

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
      expect(RANDOM_MU).toContain(c.mu);
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

  it('asks a different question each time, and every question about as often', () => {
    let current = challengeFromSetup(DEFAULT_SETUP);
    for (const next of dealt) {
      expect(next.question).not.toBe(current.question);
      current = next;
    }
    for (const q of QUESTIONS) expect(dealt.filter((c) => c.question === q).length).toBeGreaterThan(dealt.length / 6);
  });

  it.each(QUESTIONS)('gives every answer to the %s question, A, B and the same, about equally often', (question) => {
    const asked = dealt.filter((c) => c.question === question);
    const counts: Record<string, number> = {};
    for (const c of asked) {
      const answer = answerOf(question, planChallenge(c));
      counts[answer] = (counts[answer] ?? 0) + 1;
    }
    expect(Object.keys(counts).toSorted()).toEqual(['a', 'b', 'same']);
    for (const count of Object.values(counts)) expect(count).toBeGreaterThan(asked.length / 5);
  });

  it('includes trucks with the same momentum but different speeds', () => {
    const sameP = dealt.filter((c) => c.massA * c.speedA === c.massB * c.speedB && c.speedA !== c.speedB);
    expect(sameP.length).toBeGreaterThan(dealt.length / 10);
  });

  it('asks about momentum with a clear answer: the same, or one at least 1.25× the other', () => {
    const unclear = dealt.filter((c) => {
      const [pA, pB] = momentumOf(c);
      return c.question === 'momentum' && pA !== pB && Math.max(pA, pB) / Math.min(pA, pB) < MIN_MOMENTUM_RATIO - 1e-9;
    });
    expect(unclear).toEqual([]);
  });

  it('asks about momentum where sometimes the faster truck has more, and sometimes the heavier, slower one', () => {
    const asked = dealt.filter((c) => c.question === 'momentum' && c.massA * c.speedA !== c.massB * c.speedB);
    const fasterHasMore = asked.filter((c) => {
      const [pA, pB] = momentumOf(c);
      return pA > pB === c.speedA > c.speedB;
    });
    expect(fasterHasMore.length).toBeGreaterThan(asked.length / 4);
    expect(asked.length - fasterHasMore.length).toBeGreaterThan(asked.length / 4);
  });

  it('asks about friction with traps: the same mass at different speeds, or a lighter truck with more momentum', () => {
    const asked = dealt.filter((c) => c.question === 'friction');
    const sameMass = asked.filter((c) => c.massA === c.massB && c.speedA !== c.speedB);
    const lighterHasMoreP = asked.filter((c) => {
      const [pA, pB] = momentumOf(c);
      return c.massA !== c.massB && c.massA < c.massB === pA > pB;
    });
    expect(sameMass.length).toBeGreaterThan(asked.length / 5);
    expect(lighterHasMoreP.length).toBeGreaterThan(asked.length / 5);
  });

  it('plays every run in real time, in under 10 s', () => {
    for (const c of dealt) expect(runDuration(planChallenge(c))).toBeLessThan(10);
  });

  it('still deals valid challenges, with a new question each time, from a random source that never changes', () => {
    for (const random of [stuck, () => 0.5, () => 0.999_999]) {
      const dealtStuck: Challenge[] = [];
      let current: Challenge | null = null;
      for (let i = 0; i < 8; i++) {
        current = randomChallenge(current, random);
        dealtStuck.push(current);
      }
      const repeats = dealtStuck.filter((c, i) => i > 0 && c.question === dealtStuck[i - 1]?.question);
      expect(repeats).toEqual([]);
      for (const c of dealtStuck) expect(['a', 'b', 'same']).toContain(answerOf(c.question, planChallenge(c)));
    }
  });
});
