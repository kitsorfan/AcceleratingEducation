import type { Dictionary } from '../../i18n/i18n';

/**
 * Text for the momentum lesson. Greek follows the school textbook conventions:
 * υ for velocity, T for friction, α for acceleration, and Α / Β (Greek capitals) for the trucks.
 * Keys ending in `Html` hold trusted markup; everything else is plain text.
 * Short formulas inside sentences (e.g. "Δp / Δt = −f") use no-break spaces (U+00A0) so they
 * never wrap across lines.
 */
const en = {
  docTitle: 'Momentum · Physics AI Teacher',
  eyebrow: 'Lesson 1',
  title: 'Momentum',
  lede: 'Two trucks drive side by side at the same speed. One is empty, the other is loaded. Which one is harder to stop?',

  simHeading: 'Simulation',
  sceneLabel:
    'Animation of two trucks braking on parallel roads, each with an arrow showing its momentum. The measurements table lists the same values.',
  run: '▶ Run',
  pause: '⏸ Pause',
  resume: '▶ Continue',
  runAgain: '▶ Run again',
  reset: '↺ Reset',
  skip: '⏭ Skip to end',
  playback: 'Playback speed',
  clock: 't = {t} s',

  controlsHeading: 'Set up the experiment',
  massA: 'Mass of truck A',
  massB: 'Mass of truck B',
  massValue: '{kg} kg',
  emptyNote: 'Empty truck',
  loadNote: 'Truck {empty} kg + cargo {cargo} kg',
  speed: 'Initial speed (same for both)',
  speedValue: '{ms} m/s ({kmh} km/h)',
  friction: 'Road friction',
  modeForce: 'Same force on both',
  modeMu: 'Same road (μ)',
  frictionForceLabel: 'Friction force f',
  muLabel: 'Coefficient of friction μ',
  forceValue: '{n} N',
  muValue: 'μ = {mu}',
  forceNote: 'Both trucks feel the same friction force, as if both drivers pressed the brakes equally hard.',
  muNote: 'On the same road, friction grows with weight: f = μ·m·g. Predict carefully!',
  zeroFrictionNote: 'No friction at all: nothing slows the trucks down.',
  shortcuts: 'Keyboard: Space = run / pause, R = reset',

  truckA: 'Truck A',
  truckB: 'Truck B',
  truckAInline: 'truck A',
  truckBInline: 'truck B',
  subA: 'A',
  subB: 'B',
  vSym: 'v',

  predictHeading: 'Predict first',
  predictQuestion: 'Which truck will need more distance to stop?',
  predictSame: 'Same distance',
  predictHintPick: 'Pick an answer, then press Run.',
  predictHintLocked: 'Your prediction is locked in. Watch closely!',
  predictHintNone: 'No prediction this time. Press Reset to make one.',
  verdictRight: '✓ Correct! You predicted: {choice}.',
  verdictWrong: '✗ Not quite. You predicted: {choice}. Answer: {answer}.',
  verdictNone: 'Answer: {answer}.',
  verdictNeverStop: 'Neither truck stops!',
  verdictAtRest: 'Nothing moves!',
  explainForce:
    'Both trucks felt the same friction force, f = {f}. {heavy} started with {ratio}× the momentum of {lightInline}, so it needed {ratio}× as long to lose it (Δt = p / f: {tHeavy} instead of {tLight}) and travelled {ratio}× as far ({dHeavy} instead of {dLight}).',
  explainSameMass:
    'Same mass and same speed means the same momentum. With the same friction, both trucks lose their momentum at the same rate and stop together after {t}, at {d}.',
  explainMu:
    'Surprise! {heavy} had {ratio}× the momentum, but on the same road friction grows with weight: f = μ·m·g is {fHeavy} on {heavyInline} and only {fLight} on {lightInline}, also {ratio}× bigger. So both slow down at the same rate (a = μ·g = {a}) and stop together after {t}, at {d}. The heavier truck had more momentum to lose, but also a bigger force taking it away.',
  explainFrictionless:
    'No friction means no force, so nothing changes the trucks’ momentum: they keep moving at {v} forever (Newton’s first law).',
  explainAtRest: 'Both trucks are standing still: v = 0, so p = m·v = 0, whatever the mass. Give them some speed!',
  tipTryMu: 'Next: switch the friction to “Same road (μ)” and predict again.',
  tipTryZero: 'Next: set the friction to 0. What happens to the momentum?',
  tipTryForce: 'Next: choose “Same force on both”, give the road some friction and run again.',

  dataHeading: 'Measurements',
  quantity: 'Quantity',
  rowMassHtml: 'Mass <i>m</i>',
  rowSpeedHtml: 'Speed <i>v</i>',
  rowMomentumHtml: 'Momentum <i>p</i> = <i>m</i>·<i>v</i>',
  rowFrictionHtml: 'Friction force <i>f</i>',
  rowDecelHtml: 'Deceleration <i>a</i> = <i>f</i> / <i>m</i>',
  rowDistanceHtml: 'Distance <i>x</i>',
  rowStopTimeHtml: 'Time to stop',
  stopUnknown: '?',
  stopPending: '…',
  stopNever: 'never',
  momentumBars: 'Momentum',
  ratioMore: 'At the start, {heavyInline} has {ratio}× the momentum of {lightInline}.',
  ratioEqual: 'Both trucks start with the same momentum.',
  ratioRest: 'At rest, both trucks have zero momentum.',

  graphHeading: 'Graph',
  graphP: 'Momentum p–t',
  graphV: 'Speed v–t',
  graphLabel: 'Graph of each truck’s momentum or speed against time.',
  axisT: 't (s)',
  axisP: 'p (× 1000 kg·m/s)',
  axisV: 'v (m/s)',
  captionP: 'The slope of each p–t line is the friction force on that truck: Δp / Δt = −f.',
  captionV: 'The slope of each v–t line is that truck’s deceleration: Δv / Δt = −a.',

  startLabel: 'START',
  overviewLabel: 'Whole road',
  momentumLabel: 'p = {p} kg·m/s',

  theoryHeading: 'The physics',
  theoryHtml: `<h3>Momentum</h3>
<p>The momentum of a body is its mass times its velocity: <span class="formula">p = m · v</span>. It is a vector that points the same way as the velocity, and it is measured in kg·m/s.</p>
<p>At the same speed, momentum is proportional to mass: a truck with 5 times the mass carries 5 times the momentum.</p>
<h3>Stopping a truck</h3>
<p>To stop, a truck has to lose all of its momentum. A force <i>F</i> acting for a time Δt changes the momentum by <span class="formula">Δp = F · Δt</span> (the impulse). So with the same braking force, the truck with more momentum needs more time, and more road, to stop: <span class="formula">Δt = p / F</span>.</p>
<h3>Why “same road (μ)” is a trick</h3>
<p>Sliding friction is <span class="formula">f = μ · m · g</span>, so it grows with mass. The deceleration <span class="formula">a = f / m = μ · g</span> is then the same for both trucks: they stop together, even though the heavy one has more momentum.</p>`,
} as const;

export type MomentumKey = keyof typeof en;

const el: Record<MomentumKey, string> = {
  docTitle: 'Ορμή · Physics AI Teacher',
  eyebrow: 'Μάθημα 1',
  title: 'Ορμή',
  lede: 'Δύο φορτηγά κινούνται το ένα δίπλα στο άλλο με την ίδια ταχύτητα. Το ένα είναι άδειο, το άλλο φορτωμένο. Ποιο σταματά πιο δύσκολα;',

  simHeading: 'Προσομοίωση',
  sceneLabel:
    'Κινούμενη εικόνα με δύο φορτηγά που φρενάρουν σε παράλληλους δρόμους, το καθένα με ένα βέλος που δείχνει την ορμή του. Ο πίνακας μετρήσεων δείχνει τις ίδιες τιμές.',
  run: '▶ Εκκίνηση',
  pause: '⏸ Παύση',
  resume: '▶ Συνέχεια',
  runAgain: '▶ Ξανά',
  reset: '↺ Επαναφορά',
  skip: '⏭ Στο τέλος',
  playback: 'Ταχύτητα αναπαραγωγής',
  clock: 't = {t} s',

  controlsHeading: 'Ρύθμισε το πείραμα',
  massA: 'Μάζα φορτηγού Α',
  massB: 'Μάζα φορτηγού Β',
  massValue: '{kg} kg',
  emptyNote: 'Άδειο φορτηγό',
  loadNote: 'Φορτηγό {empty} kg + φορτίο {cargo} kg',
  speed: 'Αρχική ταχύτητα (ίδια και για τα δύο)',
  speedValue: '{ms} m/s ({kmh} km/h)',
  friction: 'Τριβή δρόμου',
  modeForce: 'Ίδια δύναμη και στα δύο',
  modeMu: 'Ίδιος δρόμος (μ)',
  frictionForceLabel: 'Δύναμη τριβής T',
  muLabel: 'Συντελεστής τριβής μ',
  forceValue: '{n} N',
  muValue: 'μ = {mu}',
  forceNote: 'Και στα δύο φορτηγά ασκείται η ίδια δύναμη τριβής, σαν να πατάνε και οι δύο οδηγοί φρένο το ίδιο δυνατά.',
  muNote: 'Στον ίδιο δρόμο η τριβή μεγαλώνει με το βάρος: T = μ·m·g. Πρόβλεψε προσεκτικά!',
  zeroFrictionNote: 'Καθόλου τριβή: τίποτα δεν επιβραδύνει τα φορτηγά.',
  shortcuts: 'Πληκτρολόγιο: Space = εκκίνηση / παύση, R = επαναφορά',

  truckA: 'Φορτηγό Α',
  truckB: 'Φορτηγό Β',
  truckAInline: 'φορτηγό Α',
  truckBInline: 'φορτηγό Β',
  subA: 'Α',
  subB: 'Β',
  vSym: 'υ',

  predictHeading: 'Πρώτα πρόβλεψε',
  predictQuestion: 'Ποιο φορτηγό θα χρειαστεί μεγαλύτερη απόσταση για να σταματήσει;',
  predictSame: 'Την ίδια απόσταση',
  predictHintPick: 'Διάλεξε απάντηση και πάτα Εκκίνηση.',
  predictHintLocked: 'Η πρόβλεψή σου κλείδωσε. Παρακολούθησε προσεκτικά!',
  predictHintNone: 'Αυτή τη φορά δεν έκανες πρόβλεψη. Πάτα Επαναφορά για να κάνεις μία.',
  verdictRight: '✓ Σωστά! Πρόβλεψες: {choice}.',
  verdictWrong: '✗ Όχι ακριβώς. Πρόβλεψες: {choice}. Σωστή απάντηση: {answer}.',
  verdictNone: 'Απάντηση: {answer}.',
  verdictNeverStop: 'Κανένα φορτηγό δεν σταματά!',
  verdictAtRest: 'Τίποτα δεν κινείται!',
  explainForce:
    'Και στα δύο φορτηγά ασκήθηκε η ίδια δύναμη τριβής, T = {f}. Το {heavyInline} ξεκίνησε με {ratio} φορές μεγαλύτερη ορμή από το {lightInline}, οπότε χρειάστηκε {ratio} φορές περισσότερο χρόνο για να τη χάσει (Δt = p / T: {tHeavy} αντί για {tLight}) και διήνυσε {ratio} φορές μεγαλύτερη απόσταση ({dHeavy} αντί για {dLight}).',
  explainSameMass:
    'Ίδια μάζα και ίδια ταχύτητα σημαίνει ίδια ορμή. Με την ίδια τριβή, τα δύο φορτηγά χάνουν την ορμή τους με τον ίδιο ρυθμό και σταματούν μαζί μετά από {t}, στα {d}.',
  explainMu:
    'Έκπληξη! Το {heavyInline} είχε {ratio} φορές μεγαλύτερη ορμή, όμως στον ίδιο δρόμο η τριβή μεγαλώνει με το βάρος: η T = μ·m·g είναι {fHeavy} στο {heavyInline} και μόνο {fLight} στο {lightInline}, δηλαδή κι αυτή {ratio} φορές μεγαλύτερη. Έτσι και τα δύο επιβραδύνονται το ίδιο (α = μ·g = {a}) και σταματούν μαζί μετά από {t}, στα {d}. Το βαρύτερο φορτηγό είχε περισσότερη ορμή να χάσει, αλλά και μεγαλύτερη δύναμη να του την αφαιρεί.',
  explainFrictionless:
    'Χωρίς τριβή δεν ασκείται δύναμη, οπότε τίποτα δεν αλλάζει την ορμή των φορτηγών: συνεχίζουν να κινούνται με {v} για πάντα (1ος νόμος του Νεύτωνα).',
  explainAtRest: 'Και τα δύο φορτηγά είναι ακίνητα: υ = 0, άρα p = m·υ = 0, όποια κι αν είναι η μάζα. Δώσε τους λίγη ταχύτητα!',
  tipTryMu: 'Επόμενο βήμα: γύρισε την τριβή σε «Ίδιος δρόμος (μ)» και ξαναπρόβλεψε.',
  tipTryZero: 'Επόμενο βήμα: βάλε την τριβή στο 0. Τι γίνεται με την ορμή;',
  tipTryForce: 'Επόμενο βήμα: διάλεξε «Ίδια δύναμη και στα δύο», βάλε λίγη τριβή και ξανατρέξε το πείραμα.',

  dataHeading: 'Μετρήσεις',
  quantity: 'Μέγεθος',
  rowMassHtml: 'Μάζα <i>m</i>',
  rowSpeedHtml: 'Ταχύτητα <i>υ</i>',
  rowMomentumHtml: 'Ορμή <i>p</i> = <i>m</i>·<i>υ</i>',
  rowFrictionHtml: 'Τριβή <i>T</i>',
  rowDecelHtml: 'Επιβράδυνση <i>α</i> = <i>T</i> / <i>m</i>',
  rowDistanceHtml: 'Απόσταση <i>x</i>',
  rowStopTimeHtml: 'Χρόνος ακινητοποίησης',
  stopUnknown: '?',
  stopPending: '…',
  stopNever: 'ποτέ',
  momentumBars: 'Ορμή',
  ratioMore: 'Στην αρχή, το {heavyInline} έχει {ratio} φορές μεγαλύτερη ορμή από το {lightInline}.',
  ratioEqual: 'Τα δύο φορτηγά ξεκινούν με την ίδια ορμή.',
  ratioRest: 'Ακίνητα, τα δύο φορτηγά έχουν μηδενική ορμή.',

  graphHeading: 'Διάγραμμα',
  graphP: 'Ορμή p–t',
  graphV: 'Ταχύτητα υ–t',
  graphLabel: 'Διάγραμμα της ορμής ή της ταχύτητας κάθε φορτηγού σε συνάρτηση με τον χρόνο.',
  axisT: 't (s)',
  axisP: 'p (× 1000 kg·m/s)',
  axisV: 'υ (m/s)',
  captionP: 'Η κλίση κάθε ευθείας p–t είναι η δύναμη τριβής στο φορτηγό: Δp / Δt = −T.',
  captionV: 'Η κλίση κάθε ευθείας υ–t είναι η επιβράδυνση του φορτηγού: Δυ / Δt = −α.',

  startLabel: 'ΑΦΕΤΗΡΙΑ',
  overviewLabel: 'Όλη η διαδρομή',
  momentumLabel: 'p = {p} kg·m/s',

  theoryHeading: 'Η θεωρία',
  theoryHtml: `<h3>Ορμή</h3>
<p>Ορμή ενός σώματος ονομάζουμε το γινόμενο της μάζας του επί την ταχύτητά του: <span class="formula">p = m · υ</span>. Είναι διανυσματικό μέγεθος με την ίδια κατεύθυνση με την ταχύτητα, και μονάδα μέτρησης το 1 kg·m/s.</p>
<p>Με την ίδια ταχύτητα, η ορμή είναι ανάλογη της μάζας: ένα φορτηγό με 5 φορές μεγαλύτερη μάζα έχει 5 φορές μεγαλύτερη ορμή.</p>
<h3>Πώς σταματά ένα φορτηγό</h3>
<p>Για να σταματήσει, ένα φορτηγό πρέπει να χάσει όλη την ορμή του. Μια δύναμη <i>F</i> που ασκείται για χρόνο Δt μεταβάλλει την ορμή κατά <span class="formula">Δp = F · Δt</span> (ώθηση). Άρα, με την ίδια δύναμη πέδησης, το φορτηγό με τη μεγαλύτερη ορμή χρειάζεται περισσότερο χρόνο, και περισσότερο δρόμο, για να σταματήσει: <span class="formula">Δt = p / F</span>.</p>
<h3>Γιατί το «ίδιος δρόμος (μ)» είναι παγίδα</h3>
<p>Η τριβή ολίσθησης είναι <span class="formula">T = μ · m · g</span>, δηλαδή μεγαλώνει με τη μάζα. Τότε η επιβράδυνση <span class="formula">α = T / m = μ · g</span> είναι ίδια και για τα δύο φορτηγά: σταματούν μαζί, παρόλο που το βαρύ έχει μεγαλύτερη ορμή.</p>`,
};

export const STRINGS: Dictionary<MomentumKey> = { en, el };
