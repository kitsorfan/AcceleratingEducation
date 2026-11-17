import type { Dictionary } from '../../i18n/i18n';

/** Keeps a short formula on one line inside a sentence (no-break spaces). */
const nb = (formula: string): string => formula.replaceAll(' ', ' ');

/**
 * Text for the momentum lesson, kept short on purpose: the teacher does the explaining, the page
 * shows the experiment, the numbers and the formulas. Greek follows the school textbook
 * conventions: υ for velocity, T for friction, α for acceleration, Α / Β (Greek capitals).
 * Keys ending in `Html` hold trusted markup; everything else is plain text.
 */
const en = {
  docTitle: 'Momentum · Accelerating Education',
  eyebrow: 'Lesson 1',
  title: 'Momentum',
  stepsLabel: 'Lesson steps',

  step1: 'Simulation',
  step2: 'Graph',
  step3: 'Calculations',
  step4: 'Challenge',
  step1Title: 'Which truck is harder to stop?',
  step2Title: 'Graph',
  step3Title: 'Calculations',
  step4Title: 'Same road',
  step4Lede: `${nb('f = μ·m·g')} (${nb('μ = {mu}')})`,

  sceneLabel: 'Two trucks braking on parallel roads, each with an arrow showing its momentum.',
  run: 'Run',
  pause: 'Pause',
  resume: 'Continue',
  runAgain: 'Run again',
  reset: 'Reset',
  newProblem: 'New problem',
  clock: 't = {t} s',
  clockFast: 't = {t} s (×{k})',

  massA: 'Truck A',
  massB: 'Truck B',
  massValue: '{kg} kg',
  speed: 'Speed',
  speedValue: '{ms} m/s ({kmh} km/h)',
  friction: 'Friction',
  frictionNote: 'same on both',
  forceValue: '{n} N',
  noFriction: '0 N (none)',

  truckA: 'Truck A',
  truckB: 'Truck B',
  subA: 'A',
  subB: 'B',
  vSym: 'v',

  dataHeading: 'Measurements',
  quantity: 'Quantity',
  rowMassHtml: 'Mass <i>m</i>',
  rowSpeedHtml: 'Speed <i>v</i>',
  rowMomentumHtml: 'Momentum <i>p</i>',
  rowDistanceHtml: 'Distance <i>x</i>',
  rowStopTimeHtml: 'Time to stop <i>t</i>',
  stopUnknown: '?',
  stopPending: '…',
  stopNever: 'never',

  graphHeading: 'Momentum over time',
  graphLabel: 'Graph of the momentum of each truck against time.',
  axisT: 't (s)',
  axisP: 'p (× 1000 kg·m/s)',

  theoryMomentum: 'Momentum',
  theoryImpulse: 'Impulse',

  challengeQuestion: 'Which truck needs more distance to stop?',
  predictSame: 'Same distance',
  predictHint: 'Predict, then press Run.',
  verdictRight: '✓ Correct!',
  verdictWrong: '✗ Not quite. Answer: {answer}.',
  verdictNone: 'Answer: {answer}.',
  explainMu: `{heavy}: {ratio}× the momentum, but also {ratio}× the friction ({fHeavy} instead of {fLight}). Same deceleration ${nb('a = μ·g = ')}{a}, so both stop at {d}.`,
  explainSpeed: `{fast}: faster ({vFast} instead of {vSlow}), so more distance ({dFast} instead of {dSlow}). Same deceleration ${nb('a = μ·g = ')}{a}, whatever the mass.`,
  explainSameMass: 'Same mass: same momentum, same friction. Both stop at {d}.',
  explainAtRest: `${nb('v = 0')}, so ${nb('p = 0')}.`,

  startLabel: 'START',
  momentumLabel: 'p = {p} kg·m/s',
} as const;

export type MomentumKey = keyof typeof en;

const el: Record<MomentumKey, string> = {
  docTitle: 'Ορμή · Accelerating Education',
  eyebrow: 'Μάθημα 1',
  title: 'Ορμή',
  stepsLabel: 'Βήματα μαθήματος',

  step1: 'Προσομοίωση',
  step2: 'Διάγραμμα',
  step3: 'Υπολογισμοί',
  step4: 'Πρόκληση',
  step1Title: 'Ποιο φορτηγό σταματά πιο δύσκολα;',
  step2Title: 'Διάγραμμα',
  step3Title: 'Υπολογισμοί',
  step4Title: 'Ίδιος δρόμος',
  step4Lede: `${nb('T = μ·m·g')} (${nb('μ = {mu}')})`,

  sceneLabel: 'Δύο φορτηγά φρενάρουν σε παράλληλους δρόμους, το καθένα με ένα βέλος που δείχνει την ορμή του.',
  run: 'Εκκίνηση',
  pause: 'Παύση',
  resume: 'Συνέχεια',
  runAgain: 'Ξανά',
  reset: 'Επαναφορά',
  newProblem: 'Νέο πρόβλημα',
  clock: 't = {t} s',
  clockFast: 't = {t} s (×{k})',

  massA: 'Φορτηγό Α',
  massB: 'Φορτηγό Β',
  massValue: '{kg} kg',
  speed: 'Ταχύτητα',
  speedValue: '{ms} m/s ({kmh} km/h)',
  friction: 'Τριβή',
  frictionNote: 'ίδια και στα δύο',
  forceValue: '{n} N',
  noFriction: '0 N (καθόλου)',

  truckA: 'Φορτηγό Α',
  truckB: 'Φορτηγό Β',
  subA: 'Α',
  subB: 'Β',
  vSym: 'υ',

  dataHeading: 'Μετρήσεις',
  quantity: 'Μέγεθος',
  rowMassHtml: 'Μάζα <i>m</i>',
  rowSpeedHtml: 'Ταχύτητα <i>υ</i>',
  rowMomentumHtml: 'Ορμή <i>p</i>',
  rowDistanceHtml: 'Απόσταση <i>x</i>',
  rowStopTimeHtml: 'Χρόνος ακινητοποίησης <i>t</i>',
  stopUnknown: '?',
  stopPending: '…',
  stopNever: 'ποτέ',

  graphHeading: 'Η ορμή με τον χρόνο',
  graphLabel: 'Διάγραμμα της ορμής κάθε φορτηγού σε συνάρτηση με τον χρόνο.',
  axisT: 't (s)',
  axisP: 'p (× 1000 kg·m/s)',

  theoryMomentum: 'Ορμή',
  theoryImpulse: 'Ώθηση',

  challengeQuestion: 'Ποιο φορτηγό χρειάζεται μεγαλύτερη απόσταση για να σταματήσει;',
  predictSame: 'Την ίδια',
  predictHint: 'Πρόβλεψε και πάτα Εκκίνηση.',
  verdictRight: '✓ Σωστά!',
  verdictWrong: '✗ Όχι. Σωστή απάντηση: {answer}.',
  verdictNone: 'Απάντηση: {answer}.',
  explainMu: `{heavy}: {ratio} φορές μεγαλύτερη ορμή, αλλά και {ratio} φορές μεγαλύτερη τριβή ({fHeavy} αντί για {fLight}). Ίδια επιβράδυνση ${nb('α = μ·g = ')}{a}, άρα σταματούν και τα δύο στα {d}.`,
  explainSpeed: `{fast}: μεγαλύτερη ταχύτητα ({vFast} αντί για {vSlow}), άρα μεγαλύτερη απόσταση ({dFast} αντί για {dSlow}). Ίδια επιβράδυνση ${nb('α = μ·g = ')}{a}, όποια κι αν είναι η μάζα.`,
  explainSameMass: 'Ίδια μάζα: ίδια ορμή, ίδια τριβή. Σταματούν και τα δύο στα {d}.',
  explainAtRest: `${nb('υ = 0')}, άρα ${nb('p = 0')}.`,

  startLabel: 'ΑΦΕΤΗΡΙΑ',
  momentumLabel: 'p = {p} kg·m/s',
};

export const STRINGS: Dictionary<MomentumKey> = { en, el };
