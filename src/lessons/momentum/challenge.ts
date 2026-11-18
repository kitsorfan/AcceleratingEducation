/**
 * The challenge: two trucks on the same road, so friction is μ·m·g and every truck decelerates at
 * μ·g, whatever its mass. Each challenge asks one question about the two trucks: which needs more
 * distance to stop, which takes longer to stop, which has more momentum at the start, or which
 * feels more friction. The answer can be truck A, truck B or "the same".
 *
 * At first the challenge asks about the distance, with the trucks from the simulation (masses and
 * speeds): at the default (same) speed they stop together. New problem deals another question with
 * random trucks, dealt so that every answer comes up about as often and there is a trap to avoid.
 */
import { G, LIMITS, larger, outcomeOf, planMotion, type Motion, type Outcome, type Plan, type Setup } from './physics';

/** What a challenge can ask: which truck needs more distance to stop, takes longer, has more momentum at the start, or feels more friction. */
export const QUESTIONS = ['distance', 'time', 'momentum', 'friction'] as const;
export type Question = (typeof QUESTIONS)[number];

export interface Challenge {
  question: Question;
  massA: number;
  massB: number;
  /** Initial speed of each truck (m/s). */
  speedA: number;
  speedB: number;
  /** Coefficient of friction of the road both trucks are on. */
  mu: number;
}

/** Road surfaces a random challenge can use: from wet asphalt to dry. */
export const RANDOM_MU = [0.3, 0.4, 0.5, 0.6, 0.7] as const;
/** Random masses are whole tonnes inside the slider range (kg). */
const MASS_STEP = 1_000;
/** Random speeds are whole m/s, up to 25 m/s = 90 km/h. */
const SPEED = { min: 6, max: 25 } as const;
/** Masses that differ less than this (kg) look too alike to be the point of a challenge. */
export const MIN_MASS_GAP = 10_000;
/** Speeds that differ less than this (m/s) stop too close together to tell apart. */
export const MIN_SPEED_GAP = 4;
/** When the momenta differ, the larger is at least this many times the smaller, so the arrows show it. */
export const MIN_MOMENTUM_RATIO = 1.25;

/** The challenge with the trucks from the simulation: their masses and speeds, on the same road. */
export function challengeFromSetup(setup: Readonly<Setup>): Challenge {
  return {
    question: 'distance',
    massA: setup.massA,
    massB: setup.massB,
    speedA: setup.speedA,
    speedB: setup.speedB,
    mu: setup.mu,
  };
}

export function planChallenge(challenge: Readonly<Challenge>): Plan {
  const { massA, massB, speedA, speedB, mu } = challenge;
  return {
    a: planMotion(massA, speedA, mu * massA * G),
    b: planMotion(massB, speedB, mu * massB * G),
  };
}

/** What each question compares between the two trucks. */
const MEASURE: Record<Question, (motion: Motion) => number> = {
  distance: (motion) => motion.stopDistance,
  time: (motion) => motion.stopTime,
  momentum: (motion) => motion.p0,
  friction: (motion) => motion.friction,
};

/** The answer to the question: truck A, truck B or the same (or no answer: both at rest, or no friction). */
export function answerOf(question: Question, plan: Plan): Outcome {
  const outcome = outcomeOf(plan);
  if (outcome === 'at-rest' || outcome === 'never-stop') return outcome;
  const measure = MEASURE[question];
  return larger(measure(plan.a), measure(plan.b));
}

type Random = () => number;
interface Truck {
  mass: number;
  speed: number;
}
type Deal = (random: Random) => [Truck, Truck];

/** A whole multiple of `step` from `min` to `max`, both included. */
function pickStep(random: Random, min: number, max: number, step: number): number {
  const count = Math.floor((max - min) / step) + 1;
  return min + step * Math.min(count - 1, Math.floor(random() * count));
}

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

const pickMass = (random: Random, min: number = LIMITS.mass.min, max: number = LIMITS.mass.max): number =>
  pickStep(random, min, max, MASS_STEP);
const pickSpeed = (random: Random, min: number = SPEED.min, max: number = SPEED.max): number =>
  pickStep(random, min, max, 1);

/** Two speeds at least MIN_SPEED_GAP apart, slower first. */
function twoSpeeds(random: Random, min: number = SPEED.min): [number, number] {
  const slow = pickSpeed(random, min, SPEED.max - MIN_SPEED_GAP);
  return [slow, pickSpeed(random, slow + MIN_SPEED_GAP)];
}

/** Different masses, the same speed: they stop together (the mass doesn't matter). */
function sameSpeed(random: Random): [Truck, Truck] {
  const light = pickMass(random, LIMITS.mass.min, LIMITS.mass.max - MIN_MASS_GAP);
  const heavy = pickMass(random, light + MIN_MASS_GAP);
  const speed = pickSpeed(random, 10);
  return [
    { mass: light, speed },
    { mass: heavy, speed },
  ];
}

/** Different speeds, any masses: the faster truck needs more road. */
function differentSpeeds(random: Random): [Truck, Truck] {
  const [slow, fast] = twoSpeeds(random, 8);
  return [
    { mass: pickMass(random), speed: slow },
    { mass: pickMass(random), speed: fast },
  ];
}

/** The same mass, different speeds: the same friction, but the faster truck needs more road. */
function sameMass(random: Random): [Truck, Truck] {
  const mass = pickMass(random);
  const [slow, fast] = twoSpeeds(random);
  return [
    { mass, speed: slow },
    { mass, speed: fast },
  ];
}

/** The same momentum: the lighter truck is faster, so it needs more road. */
function sameMomentum(random: Random): [Truck, Truck] {
  const k = pick(random, [2, 3]);
  const slow = pickSpeed(random, SPEED.min, Math.floor(SPEED.max / k));
  const light = pickMass(random, LIMITS.mass.min, Math.floor(LIMITS.mass.max / k / MASS_STEP) * MASS_STEP);
  return [
    { mass: k * light, speed: slow },
    { mass: light, speed: k * slow },
  ];
}

/**
 * A heavier, slower truck and a lighter, faster one, where the `winner` has clearly more momentum
 * (MIN_MOMENTUM_RATIO times or more): so neither "the faster" nor "the heavier" is always right.
 */
function crossed(winner: 'heavy' | 'light'): Deal {
  return (random) => {
    // Most draws allow a speed for the faster truck; the few that don't are drawn again.
    for (let attempt = 0; attempt < 50; attempt++) {
      const light = pickMass(random, LIMITS.mass.min, LIMITS.mass.max - MIN_MASS_GAP);
      const heavy = pickMass(random, light + MIN_MASS_GAP);
      const slow = pickSpeed(random, SPEED.min, SPEED.max - MIN_SPEED_GAP);
      // The faster truck's speeds that leave the winner MIN_MOMENTUM_RATIO times the other's momentum.
      const [min, max] =
        winner === 'light'
          ? [Math.max(slow + MIN_SPEED_GAP, Math.ceil((MIN_MOMENTUM_RATIO * heavy * slow) / light)), SPEED.max]
          : [slow + MIN_SPEED_GAP, Math.min(SPEED.max, Math.floor((heavy * slow) / (MIN_MOMENTUM_RATIO * light)))];
      if (min <= max) {
        return [
          { mass: heavy, speed: slow },
          { mass: light, speed: pickSpeed(random, min, max) },
        ];
      }
    }
    const fast = winner === 'light' ? 23 : 10; // 5 t × 23 m/s = 115,000, 5 t × 10 m/s = 50,000 against 15 t × 6 m/s = 90,000
    return [
      { mass: 15_000, speed: 6 },
      { mass: 5_000, speed: fast },
    ];
  };
}

/**
 * The trucks a question can be asked about: one kind of pair per answer (the same, or one truck
 * more), so with A and B shuffled each answer comes up about as often. Every pair has a trap.
 */
const DEALS: Record<Question, readonly Deal[]> = {
  // x = v² / (2·μ·g) and t = v / (μ·g): only the speed decides. The mass and the momentum are the traps.
  distance: [sameSpeed, differentSpeeds, sameMomentum],
  time: [sameSpeed, differentSpeeds, sameMomentum],
  // p = m·v: neither the faster nor the heavier truck always has more.
  momentum: [sameMomentum, crossed('heavy'), crossed('light')],
  // f = μ·m·g: only the mass decides. The speed and the momentum are the traps.
  friction: [sameMass, sameMomentum, crossed('light')],
};

/** A new random challenge: a different question from the one on screen, with new trucks and a new road. */
export function randomChallenge(current: Readonly<Challenge> | null, random: Random = Math.random): Challenge {
  const question = pick(
    random,
    QUESTIONS.filter((q) => q !== current?.question),
  );
  const [first, second] = pick(random, DEALS[question])(random);
  const [a, b] = random() < 0.5 ? [first, second] : [second, first];
  return { question, massA: a.mass, massB: b.mass, speedA: a.speed, speedB: b.speed, mu: pick(random, RANDOM_MU) };
}
