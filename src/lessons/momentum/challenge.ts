/**
 * The challenge: two trucks on the same road, so friction is μ·m·g and every truck decelerates at
 * μ·g, whatever its mass. Only the speed decides the stopping distance: x = v² / (2·μ·g).
 *
 * At first the challenge uses the trucks from the simulation. They share one speed, so they always
 * stop together. New problem deals a random one, where the trucks can also differ in speed. The
 * answer can then be truck A, truck B or "same distance".
 */
import { G, LIMITS, planMotion, type Plan, type Setup } from './physics';

export interface Challenge {
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

/** The challenge with the trucks from the simulation: the same speed for both. */
export function challengeFromSetup(setup: Readonly<Setup>): Challenge {
  return { massA: setup.massA, massB: setup.massB, speedA: setup.speed, speedB: setup.speed, mu: setup.mu };
}

export function planChallenge(challenge: Readonly<Challenge>): Plan {
  const { massA, massB, speedA, speedB, mu } = challenge;
  return {
    a: planMotion(massA, speedA, mu * massA * G),
    b: planMotion(massB, speedB, mu * massB * G),
  };
}

type Random = () => number;
interface Truck {
  mass: number;
  speed: number;
}

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
  const slow = pickSpeed(random, 8, SPEED.max - MIN_SPEED_GAP);
  const fast = pickSpeed(random, slow + MIN_SPEED_GAP);
  return [
    { mass: pickMass(random), speed: slow },
    { mass: pickMass(random), speed: fast },
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

const DEALS = [sameSpeed, differentSpeeds, sameMomentum] as const;

function deal(random: Random): Challenge {
  const [first, second] = pick(random, DEALS)(random);
  const [a, b] = random() < 0.5 ? [first, second] : [second, first];
  return { massA: a.mass, massB: b.mass, speedA: a.speed, speedB: b.speed, mu: pick(random, RANDOM_MU) };
}

const sameChallenge = (x: Readonly<Challenge>, y: Readonly<Challenge>): boolean =>
  x.massA === y.massA && x.massB === y.massB && x.speedA === y.speedA && x.speedB === y.speedB && x.mu === y.mu;

/** A new random challenge, never the same as the one on screen. */
export function randomChallenge(current: Readonly<Challenge> | null, random: Random = Math.random): Challenge {
  let next = deal(random);
  if (!current) return next;
  // A repeat is rare; a few more deals avoid it (and a broken random source can't loop forever).
  for (let attempt = 0; attempt < 20 && sameChallenge(next, current); attempt++) next = deal(random);
  return next;
}
