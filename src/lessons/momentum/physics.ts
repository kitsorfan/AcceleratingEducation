/**
 * Physics of two trucks braking on a straight, level road.
 *
 * Friction is the only horizontal force, and it is constant while a truck slides, so each truck
 * has a constant deceleration until it stops. That has an exact solution, so the simulation
 * evaluates it directly instead of integrating step by step: any moment can be shown exactly,
 * whatever the frame rate or playback speed.
 */

/** Gravitational acceleration near the Earth's surface (m/s²). */
export const G = 9.81;

/** Mass of a truck with nothing on it (kg). Anything above this is cargo. */
export const EMPTY_TRUCK_MASS = 5_000;

/** Slider ranges, in SI units. */
export const LIMITS = {
  /** From an empty truck to a fully loaded one (kg). */
  mass: { min: EMPTY_TRUCK_MASS, max: 40_000, step: 500 },
  /** Initial speed of a truck (m/s). 30 m/s = 108 km/h. */
  speed: { min: 0, max: 30, step: 0.5 },
  /** Friction force when both trucks feel the same force (N). */
  force: { min: 0, max: 50_000, step: 500 },
  /** Coefficient of friction when both trucks share the same road. */
  mu: { min: 0, max: 1, step: 0.01 },
} as const;

/**
 * - `force`: both trucks feel the same friction force, whatever their mass (like the same brakes).
 *   The truck with more momentum takes longer to stop. This is the classic momentum demonstration.
 * - `coefficient`: both trucks are on the same road, so friction is μ·m·g and grows with mass.
 *   Both decelerate at μ·g and stop together, even though their momenta differ.
 */
export type FrictionMode = 'force' | 'coefficient';

export interface Setup {
  massA: number;
  massB: number;
  /** Initial speed of each truck (m/s). */
  speedA: number;
  speedB: number;
  frictionMode: FrictionMode;
  /** Friction force used in `force` mode (N). */
  frictionForce: number;
  /** Coefficient of friction used in `coefficient` mode. */
  mu: number;
}

/** An empty truck next to a loaded one, at the same speed, braking with the same force. */
export const DEFAULT_SETUP: Readonly<Setup> = {
  massA: 5_000,
  massB: 25_000,
  speedA: 15,
  speedB: 15,
  frictionMode: 'force',
  frictionForce: 25_000,
  mu: 0.3,
};

/** Everything about one truck's run that follows from the setup. */
export interface Motion {
  mass: number;
  /** Initial speed (m/s). */
  v0: number;
  /** Initial momentum p = m·v (kg·m/s). */
  p0: number;
  /** Friction force while sliding (N). */
  friction: number;
  /** Magnitude of the deceleration a = f/m (m/s²). */
  decel: number;
  /** When the truck stops (s): Infinity if nothing slows it down. */
  stopTime: number;
  /** Where the truck stops, measured from the start line (m): Infinity if it never stops. */
  stopDistance: number;
}

/** A truck at one moment. */
export interface Snapshot {
  /** Distance travelled from the start line (m). */
  x: number;
  /** Speed (m/s). */
  v: number;
  /** Momentum (kg·m/s). */
  p: number;
  stopped: boolean;
}

/** Friction force on a truck of this mass (N). */
export function frictionOn(mass: number, setup: Pick<Setup, 'frictionMode' | 'frictionForce' | 'mu'>): number {
  return setup.frictionMode === 'force' ? setup.frictionForce : setup.mu * mass * G;
}

/** Plans one truck's run: a constant deceleration from v0 down to rest. */
export function planMotion(mass: number, v0: number, friction: number): Motion {
  const p0 = mass * v0;
  const decel = friction / mass;
  if (v0 <= 0) return { mass, v0: 0, p0: 0, friction, decel, stopTime: 0, stopDistance: 0 };
  if (decel <= 0) return { mass, v0, p0, friction, decel: 0, stopTime: Infinity, stopDistance: Infinity };
  return {
    mass,
    v0,
    p0,
    friction,
    decel,
    // Impulse-momentum theorem: f·Δt = Δp, so Δt = p0 / f, the same as v0 / a.
    stopTime: v0 / decel,
    stopDistance: (v0 * v0) / (2 * decel),
  };
}

export interface Plan {
  a: Motion;
  b: Motion;
}

export function planBoth(setup: Readonly<Setup>): Plan {
  return {
    a: planMotion(setup.massA, setup.speedA, frictionOn(setup.massA, setup)),
    b: planMotion(setup.massB, setup.speedB, frictionOn(setup.massB, setup)),
  };
}

/** Where a truck is, and how fast it goes, at time t (s) after the start. */
export function snapshotAt(motion: Motion, t: number): Snapshot {
  if (t >= motion.stopTime) return { x: motion.stopDistance, v: 0, p: 0, stopped: true };
  const time = Math.max(0, t);
  const v = motion.v0 - motion.decel * time;
  const x = motion.v0 * time - 0.5 * motion.decel * time * time;
  return { x, v, p: motion.mass * v, stopped: false };
}

/** Without friction the trucks never stop, so a run lasts this long (s). */
export const FRICTIONLESS_RUN_TIME = 10;

/** How long a run lasts: until both trucks have stopped, or a fixed time if they never do. */
export function runDuration(plan: Plan): number {
  const end = Math.max(plan.a.stopTime, plan.b.stopTime);
  return Number.isFinite(end) ? end : FRICTIONLESS_RUN_TIME;
}

/** Which truck has the larger value, or `same` when they match (up to rounding). */
export function larger(valueA: number, valueB: number): 'a' | 'b' | 'same' {
  const tolerance = 1e-9 * Math.max(Math.abs(valueA), Math.abs(valueB));
  if (Math.abs(valueA - valueB) <= tolerance) return 'same';
  return valueA > valueB ? 'a' : 'b';
}

/** The answer to "which truck needs more distance to stop?". */
export type Outcome = 'a' | 'b' | 'same' | 'never-stop' | 'at-rest';

export function outcomeOf(plan: Plan): Outcome {
  const { a, b } = plan;
  if (a.v0 === 0 && b.v0 === 0) return 'at-rest';
  if (!Number.isFinite(a.stopDistance) || !Number.isFinite(b.stopDistance)) return 'never-stop';
  return larger(a.stopDistance, b.stopDistance);
}

export const MS_TO_KMH = 3.6;
