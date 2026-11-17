/**
 * Lesson 1: momentum, in four steps.
 *
 * 1. Simulation: two trucks, five sliders (each truck's mass and speed, the shared friction), Run.
 * 2. Graph: the same road, plus the p–t graph and a table.
 * 3. Calculations: p = m·v and F·Δt = Δp, with the numbers from the simulation.
 * 4. Challenge: on the same road friction is μ·m·g; predict, then run. New problem deals another one.
 *
 * A stepper at the top lets the teacher jump between the steps at any time.
 *
 * The text stays minimal on purpose: the teacher explains, the page shows.
 */
import { escapeHtml, formatNumber, onLangChange, translate, translateDom, type Params } from '../../i18n/i18n';
import { clamp, niceCeil, ratioDigits } from '../../lib/nice';
import { challengeFromSetup, planChallenge, randomChallenge, type Challenge } from './challenge';
import { drawGraph, type GraphSeries, type GraphTheme } from './graph';
import {
  DEFAULT_SETUP,
  MS_TO_KMH,
  outcomeOf,
  planBoth,
  runDuration,
  snapshotAt,
  type Motion,
  type Outcome,
  type Plan,
  type Setup,
  type Snapshot,
} from './physics';
import { onThemeChange } from '../../theme';
import { drawScene, naturalSceneHeight, type SceneTruck } from './scene';
import { STRINGS, type MomentumKey } from './strings';
import { TEMPLATE } from './template';

export type RunState = 'ready' | 'running' | 'paused' | 'finished';
export type Step = 1 | 2 | 3 | 4;
type TruckId = 'a' | 'b';
type Prediction = TruckId | 'same';

const STEPS: readonly Step[] = [1, 2, 3, 4];
/** The step where friction is μ·m·g (same road) instead of the same force on both trucks. */
const CHALLENGE: Step = 4;
const TRUCK_IDS: readonly TruckId[] = ['a', 'b'];
/** Longest real-time step per frame (s), so a hidden tab doesn't make the trucks jump. */
const MAX_FRAME_STEP = 0.1;
/** Runs longer than this (s) play faster, so a class never waits much longer than this. */
const MAX_RUN_SECONDS = 20;
/** How much faster the fast-forward button plays, on top of the automatic speed-up. */
export const FAST_FORWARD = 4;
/** Canvas heights (px): the road never gets shorter than this; the graph stays within these and this share of the window. */
const MIN_SCENE_HEIGHT = 220;
const MIN_GRAPH_HEIGHT = 200;
const MAX_GRAPH_HEIGHT = 400;
const GRAPH_SHARE = 0.42;

const COLORS: Record<TruckId, { color: string; ink: string }> = {
  a: { color: '#2563eb', ink: '#1d4ed8' },
  b: { color: '#f97316', ink: '#c2410c' },
};

const t = (key: MomentumKey, params?: Params): string => translate(STRINGS, key, params);
const num = (value: number, digits = 0): string => formatNumber(value, digits);
const name = (id: TruckId): string => t(id === 'a' ? 'truckA' : 'truckB');
const sub = (id: TruckId): string => t(id === 'a' ? 'subA' : 'subB');
const other = (id: TruckId): TruckId => (id === 'a' ? 'b' : 'a');
const meters = (value: number): string => `${num(value, Number.isInteger(value) ? 0 : 1)} m`;
const metersPerSecond = (value: number): string => `${num(value, Number.isInteger(value) ? 0 : 1)} m/s`;
const seconds = (value: number): string => `${num(value, 1)} s`;
const newtons = (value: number): string => `${num(value)} N`;
/** A symbol with the truck's letter as subscript, e.g. p_A, as safe HTML. */
const symbol = (letter: string, id: TruckId): string => `<i>${letter}</i><sub>${escapeHtml(sub(id))}</sub>`;

/** How much faster than real time a run of this length plays (1 = real time), with or without fast forward. */
export function playbackSpeed(duration: number, fast = false): number {
  return Math.max(1, Math.ceil(duration / MAX_RUN_SECONDS)) * (fast ? FAST_FORWARD : 1);
}

/** Reads the step from a URL hash like "#step-3". */
export function stepFromHash(hash: string): Step {
  const n = Number(/^#step-(\d)$/.exec(hash)?.[1]);
  return STEPS.find((step) => step === n) ?? 1;
}

function query<T extends Element>(root: ParentNode, selector: string, type: { new (): T; prototype: T }): T {
  const found = root.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`Momentum lesson: ${selector} is missing`);
  return found;
}

function queryAll<T extends Element>(root: ParentNode, selector: string, type: { new (): T; prototype: T }): T[] {
  return [...root.querySelectorAll(selector)].filter((node): node is T => node instanceof type);
}

/** Sets text only when it changed, so per-frame updates don't churn the DOM. */
function setText(node: Element, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

const htmlCache = new WeakMap<Element, string>();
function setHtml(node: Element, html: string): void {
  if (htmlCache.get(node) === html) return;
  htmlCache.set(node, html);
  node.innerHTML = html;
}

function lookup(root: HTMLElement) {
  const cell = (id: string): HTMLTableCellElement => query(root, `#${id}`, HTMLTableCellElement);
  const truck = (id: TruckId) => ({
    mass: query(root, `#mass-${id}`, HTMLInputElement),
    massOut: query(root, `#mass-${id}-out`, HTMLOutputElement),
    speed: query(root, `#speed-${id}`, HTMLInputElement),
    speedOut: query(root, `#speed-${id}-out`, HTMLOutputElement),
    cells: {
      mass: cell(`${id}-mass`),
      speed: cell(`${id}-speed`),
      momentum: cell(`${id}-momentum`),
      distance: cell(`${id}-distance`),
      stop: cell(`${id}-stop`),
    },
    calcP: query(root, `#calc-p${id}`, HTMLParagraphElement),
    calcT: query(root, `#calc-t${id}`, HTMLParagraphElement),
  });
  return {
    steps: queryAll(root, '#steps > li', HTMLLIElement),
    tabs: queryAll(root, '[data-step]', HTMLButtonElement),
    head: query(root, '.step-head', HTMLElement),
    panels: queryAll(root, '[data-panel]', HTMLElement),
    title: query(root, '#step-title', HTMLHeadingElement),
    lede: query(root, '#step-lede', HTMLParagraphElement),
    sim: query(root, '#sim', HTMLElement),
    scene: query(root, '#scene', HTMLCanvasElement),
    sceneWrap: query(root, '#scene-wrap', HTMLDivElement),
    lesson: query(root, '.lesson', HTMLDivElement),
    transport: query(root, '.transport', HTMLDivElement),
    graph: query(root, '#graph', HTMLCanvasElement),
    graphWrap: query(root, '#graph-wrap', HTMLDivElement),
    run: query(root, '#run', HTMLButtonElement),
    runLabel: query(root, '#run-label', HTMLSpanElement),
    runIcon: query(root, '#run-icon', SVGUseElement),
    reset: query(root, '#reset', HTMLButtonElement),
    speedButtons: queryAll(root, '[data-fast]', HTMLButtonElement),
    fastLabel: query(root, '#fast-label', HTMLSpanElement),
    newProblem: query(root, '#new-problem', HTMLButtonElement),
    clock: query(root, '#clock', HTMLOutputElement),
    friction: query(root, '#friction', HTMLInputElement),
    frictionOut: query(root, '#friction-out', HTMLOutputElement),
    ratios: query(root, '#ratios', HTMLDivElement),
    lawMomentum: query(root, '#law-momentum', HTMLParagraphElement),
    predictions: queryAll(root, '[data-predict]', HTMLButtonElement),
    predictHint: query(root, '#predict-hint', HTMLParagraphElement),
    result: query(root, '#result', HTMLDivElement),
    verdict: query(root, '#verdict', HTMLParagraphElement),
    explain: query(root, '#explain', HTMLParagraphElement),
    trucks: { a: truck('a'), b: truck('b') },
  };
}

type Elements = ReturnType<typeof lookup>;

export class MomentumLesson {
  /** What the sliders set. The friction mode comes from the step (see `planForStep`). */
  private setup: Setup = { ...DEFAULT_SETUP };
  /** A random challenge from New problem; null while the challenge uses the trucks from the sliders. */
  private randomProblem: Challenge | null = null;
  private step: Step = stepFromHash(location.hash);
  private plan: Plan = this.planForStep();
  private state: RunState = 'ready';
  /** Simulated time since the start (s). */
  private time = 0;
  /** Fast forward stays on across runs and resets until normal speed is chosen again. */
  private fast = false;
  private prediction: Prediction | null = null;
  private lastFrame: number | null = null;
  private frameRequested = false;
  private graphTheme: GraphTheme & Record<TruckId, string>;
  private readonly els: Elements;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = TEMPLATE;
    this.els = lookup(root);
    this.graphTheme = readTheme();
    this.els.trucks.a.mass.value = String(this.setup.massA);
    this.els.trucks.b.mass.value = String(this.setup.massB);
    this.els.trucks.a.speed.value = String(this.setup.speedA);
    this.els.trucks.b.speed.value = String(this.setup.speedB);
    this.els.friction.value = String(this.setup.frictionForce);
    this.wire();
    this.translate();
  }

  private planForStep(): Plan {
    return this.step === CHALLENGE ? planChallenge(this.challenge()) : planBoth({ ...this.setup, frictionMode: 'force' });
  }

  private challenge(): Challenge {
    return this.randomProblem ?? challengeFromSetup(this.setup);
  }

  private wire(): void {
    const { els } = this;
    for (const id of TRUCK_IDS) {
      const { mass, speed } = els.trucks[id];
      mass.addEventListener('input', () =>
        this.changeSetup(id === 'a' ? { massA: Number(mass.value) } : { massB: Number(mass.value) }),
      );
      speed.addEventListener('input', () =>
        this.changeSetup(id === 'a' ? { speedA: Number(speed.value) } : { speedB: Number(speed.value) }),
      );
    }
    els.friction.addEventListener('input', () => this.changeSetup({ frictionForce: Number(els.friction.value) }));

    els.run.addEventListener('click', () => this.toggleRun());
    els.reset.addEventListener('click', () => this.reset());
    for (const button of els.speedButtons) {
      button.addEventListener('click', () => this.setFast(button.dataset['fast'] === 'true'));
    }
    els.newProblem.addEventListener('click', () => this.newProblem());
    for (const tab of els.tabs) tab.addEventListener('click', () => this.goTo(stepFromHash(`#step-${tab.dataset['step']}`)));
    for (const button of els.predictions) {
      button.addEventListener('click', () => {
        if (this.state !== 'ready') return;
        const choice = button.dataset['predict'];
        if (choice === 'a' || choice === 'b' || choice === 'same') {
          this.prediction = this.prediction === choice ? null : choice;
          this.invalidate();
        }
      });
    }

    window.addEventListener('keydown', (event) => this.onKey(event));
    window.addEventListener('hashchange', () => this.goTo(stepFromHash(location.hash)));
    const resize = new ResizeObserver(() => this.invalidate());
    resize.observe(els.sceneWrap);
    resize.observe(els.graphWrap);
    // The canvases also follow the window height (a phone turned sideways), not just their width.
    window.addEventListener('resize', () => this.invalidate());
    onLangChange(() => this.translate());
    onThemeChange(() => {
      this.graphTheme = readTheme();
      this.invalidate();
    });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || this.step === 3) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.code === 'Space' && tag !== 'BUTTON') {
      event.preventDefault();
      this.toggleRun();
    } else if (event.code === 'KeyR') {
      this.reset();
    } else if (event.code === 'KeyF') {
      this.setFast(!this.fast);
    } else if (event.code === 'KeyN') {
      this.newProblem();
    }
  }

  private translate(): void {
    translateDom(this.root, STRINGS);
    document.title = t('docTitle');
    this.invalidate();
  }

  // ---- State changes -------------------------------------------------------------------------

  private goTo(step: Step): void {
    if (step === this.step) return;
    const modeChanges = (step === CHALLENGE) !== (this.step === CHALLENGE);
    this.step = step;
    if (modeChanges) {
      // A different experiment (same force vs same road): start it from the start line.
      this.plan = this.planForStep();
      this.reset();
    }
    if (location.hash !== `#step-${step}`) history.replaceState(history.state, '', `#step-${step}`);
    window.scrollTo({ top: 0 });
    this.invalidate();
  }

  private changeSetup(patch: Partial<Setup>): void {
    if (this.state === 'running') return;
    this.setup = { ...this.setup, ...patch };
    this.randomProblem = null; // the challenge follows the sliders again
    this.plan = this.planForStep();
    if (this.state !== 'ready') this.reset();
    this.invalidate();
  }

  private toggleRun(): void {
    if (this.state === 'running') {
      this.state = 'paused';
    } else {
      if (this.state === 'finished') this.time = 0; // run the same experiment again
      this.lastFrame = null;
      if (this.time >= runDuration(this.plan)) this.finish();
      else this.state = 'running';
    }
    this.invalidate();
  }

  /** Fast forward or normal speed, from now on: a run in progress keeps going. */
  private setFast(fast: boolean): void {
    this.fast = fast;
    this.invalidate();
  }

  private finish(): void {
    this.time = runDuration(this.plan);
    this.state = 'finished';
  }

  /** A new challenge (other trucks, speeds and road), from the start line. */
  private newProblem(): void {
    if (this.step !== CHALLENGE) return;
    this.randomProblem = randomChallenge(this.challenge());
    this.plan = this.planForStep();
    this.reset();
  }

  /** Back to the start line, ready for a new prediction. */
  private reset(): void {
    this.state = 'ready';
    this.time = 0;
    this.lastFrame = null;
    this.prediction = null;
    this.invalidate();
  }

  // ---- Frame loop ----------------------------------------------------------------------------

  private invalidate(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  private frame(now: number): void {
    this.frameRequested = false;
    if (this.state === 'running') {
      const duration = runDuration(this.plan);
      if (this.lastFrame !== null) {
        const step = Math.min((now - this.lastFrame) / 1000, MAX_FRAME_STEP) * playbackSpeed(duration, this.fast);
        this.time = Math.min(this.time + step, duration);
      }
      this.lastFrame = now;
      if (this.time >= duration) this.finish();
      else this.invalidate();
    }
    this.render();
  }

  private render(): void {
    const snaps = { a: snapshotAt(this.plan.a, this.time), b: snapshotAt(this.plan.b, this.time) };
    this.renderStep();
    this.renderTransport();
    this.renderControls();
    if (this.step !== 3) this.renderScene(snaps);
    if (this.step === 2) {
      this.renderReadouts(snaps);
      this.renderGraph();
    }
    if (this.step === 3) this.renderTheory();
    if (this.step === CHALLENGE) this.renderChallenge();
  }

  // ---- Rendering -----------------------------------------------------------------------------

  private renderStep(): void {
    const { els, step } = this;
    this.root.dataset['step'] = String(step);
    for (const tab of els.tabs) {
      if (tab.dataset['step'] === String(step)) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    }
    // Steps before the current one are "done": their connector line is coloured in.
    els.steps.forEach((item, i) => item.classList.toggle('done', i + 1 < step));
    // The stepper already names the Graph and Calculations steps, so their heading is for screen readers only.
    els.head.classList.toggle('visually-hidden', step === 2 || step === 3);
    for (const panel of els.panels) panel.hidden = panel.dataset['panel'] !== String(step);
    els.sim.hidden = step === 3;
    const titles: Record<Step, MomentumKey> = { 1: 'step1Title', 2: 'step2Title', 3: 'step3Title', 4: 'step4Title' };
    setText(els.title, t(titles[step]));
    els.lede.hidden = step !== CHALLENGE;
    els.newProblem.hidden = step !== CHALLENGE;
    if (step === CHALLENGE) setText(els.lede, t('step4Lede', { mu: num(this.challenge().mu, 2) }));
  }

  private renderTransport(): void {
    const { els, state } = this;
    const runLabel: Record<RunState, MomentumKey> = {
      ready: 'run',
      running: 'pause',
      paused: 'resume',
      finished: 'runAgain',
    };
    setText(els.runLabel, t(runLabel[state]));
    const icon = state === 'running' ? '#i-pause' : '#i-play';
    if (els.runIcon.getAttribute('href') !== icon) els.runIcon.setAttribute('href', icon);
    els.run.dataset['state'] = state;
    setText(els.fastLabel, `×${FAST_FORWARD}`);
    for (const button of els.speedButtons) {
      const fast = button.dataset['fast'] === 'true';
      button.setAttribute('aria-pressed', String(fast === this.fast));
      const label = fast ? t('fastForward', { k: FAST_FORWARD }) : t('normalSpeed');
      if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    }
    const speed = playbackSpeed(runDuration(this.plan), this.fast);
    const time = num(this.time, 1);
    setText(els.clock, speed > 1 ? t('clockFast', { t: time, k: speed }) : t('clock', { t: time }));
  }

  private renderControls(): void {
    const { els, setup } = this;
    // Changing the setup in the middle of a run would make it meaningless.
    const locked = this.state === 'running';
    const { a, b } = els.trucks;
    for (const input of [a.mass, a.speed, b.mass, b.speed, els.friction]) {
      input.disabled = locked;
      // How full the slider track is drawn (CSS reads --fill).
      const min = Number(input.min);
      const fill = ((Number(input.value) - min) / (Number(input.max) - min)) * 100;
      input.style.setProperty('--fill', `${clamp(fill, 0, 100)}%`);
    }
    const speedText = (speed: number): string => t('speedValue', { ms: num(speed, 1), kmh: num(speed * MS_TO_KMH) });
    setText(a.massOut, t('massValue', { kg: num(setup.massA) }));
    setText(b.massOut, t('massValue', { kg: num(setup.massB) }));
    setText(a.speedOut, speedText(setup.speedA));
    setText(b.speedOut, speedText(setup.speedB));
    setText(
      els.frictionOut,
      setup.frictionForce === 0 ? t('noFriction') : t('forceValue', { n: num(setup.frictionForce) }),
    );
  }

  /**
   * The tallest the road can be (px) with everything from the top of the page down to the road's
   * buttons, and the page footer, on one screen. On a laptop the sliders sit beside the road, so
   * they fit too.
   */
  private roomForRoad(): number {
    const { sceneWrap, transport, lesson } = this.els;
    const top = sceneWrap.getBoundingClientRect().top + window.scrollY;
    // What the page shows under the lesson (the footer): stays the same whatever the road's height.
    const pageBelow = document.documentElement.scrollHeight - (this.root.getBoundingClientRect().bottom + window.scrollY);
    const lessonBelow = Number.parseFloat(getComputedStyle(lesson).paddingBottom) || 0;
    const cardBorder = 2;
    return window.innerHeight - top - transport.offsetHeight - cardBorder - lessonBelow - Math.max(0, pageBelow);
  }

  private renderScene(snaps: Record<TruckId, Snapshot>): void {
    const width = this.els.sceneWrap.clientWidth;
    // Tall enough to show the trucks at their natural size, short enough that the road and its buttons fit the window.
    const maxHeight = Math.max(MIN_SCENE_HEIGHT, this.roomForRoad());
    const height = Math.round(clamp(naturalSceneHeight(width), MIN_SCENE_HEIGHT, maxHeight));
    const ctx = fitCanvas(this.els.scene, width, height);
    this.els.scene.dataset['state'] = this.state;
    if (!ctx) return;
    const ran = this.state !== 'ready';
    const truck = (id: TruckId): SceneTruck => {
      const snap = snaps[id];
      const motion = this.plan[id];
      const title = [name(id), t('massValue', { kg: num(motion.mass) })];
      // When the speeds differ (always possible in the challenge), each truck shows its own.
      if (this.step === CHALLENGE || this.plan.a.v0 !== this.plan.b.v0) title.push(metersPerSecond(motion.v0));
      return {
        ...COLORS[id],
        mass: motion.mass,
        x: snap.x,
        p: snap.p,
        title: title.join(' · '),
        momentum: t('momentumLabel', { p: num(snap.p) }),
        letter: sub(id),
        stopLabel: ran && snap.stopped ? meters(snap.x) : null,
      };
    };
    drawScene(ctx, width, height, { trucks: [truck('a'), truck('b')], startLabel: t('startLabel'), meters });
  }

  private renderReadouts(snaps: Record<TruckId, Snapshot>): void {
    for (const id of TRUCK_IDS) {
      const motion = this.plan[id];
      const snap = snaps[id];
      const { cells } = this.els.trucks[id];
      setText(cells.mass, `${num(motion.mass)} kg`);
      setText(cells.speed, `${num(snap.v, 1)} m/s`);
      setText(cells.momentum, `${num(snap.p)} kg·m/s`);
      setText(cells.distance, `${num(snap.x, 1)} m`);
      setText(cells.stop, this.stopText(motion, snap));
    }
    setHtml(this.els.ratios, this.ratiosHtml());
  }

  private stopText(motion: Motion, snap: Snapshot): string {
    if (this.state === 'ready' && motion.v0 > 0) return t('stopUnknown');
    if (snap.stopped) return seconds(motion.stopTime);
    if (!Number.isFinite(motion.stopTime)) return t('stopNever');
    return t('stopPending');
  }

  /** The comparison as formulas: p_B = 5 × p_A, then (once both stopped) the same for t and x. */
  private ratiosHtml(): string {
    const { a, b } = this.plan;
    if (a.p0 === 0 && b.p0 === 0) return `<p>${symbol('p', 'a')} = ${symbol('p', 'b')} = 0</p>`;
    const compare = (letter: string, valueA: number, valueB: number): string => {
      if (Math.abs(valueA - valueB) <= 1e-9 * Math.max(valueA, valueB)) return `<p>${symbol(letter, 'a')} = ${symbol(letter, 'b')}</p>`;
      const big: TruckId = valueB > valueA ? 'b' : 'a';
      const ratio = Math.max(valueA, valueB) / Math.min(valueA, valueB);
      return `<p>${symbol(letter, big)} = ${escapeHtml(num(ratio, ratioDigits(ratio)))} × ${symbol(letter, other(big))}</p>`;
    };
    let html = compare('p', a.p0, b.p0);
    if (this.state === 'finished' && Number.isFinite(a.stopTime) && Number.isFinite(b.stopTime)) {
      html += compare('t', a.stopTime, b.stopTime) + compare('x', a.stopDistance, b.stopDistance);
    }
    return html;
  }

  private renderGraph(): void {
    const width = this.els.graphWrap.clientWidth;
    const maxHeight = Math.max(MIN_GRAPH_HEIGHT, Math.min(MAX_GRAPH_HEIGHT, window.innerHeight * GRAPH_SHARE));
    const height = Math.round(clamp(width * 0.6, MIN_GRAPH_HEIGHT, maxHeight));
    const ctx = fitCanvas(this.els.graph, width, height);
    if (!ctx) return;
    const series: GraphSeries[] = TRUCK_IDS.map((id) => ({
      color: this.graphTheme[id],
      points: trace(this.plan[id], this.time),
    }));
    drawGraph(ctx, width, height, {
      // A fixed time axis for the whole run, so the slopes keep their meaning as the lines grow.
      xMax: niceCeil(Math.max(runDuration(this.plan), 0.5)),
      yMax: niceCeil(Math.max(this.plan.a.p0, this.plan.b.p0, 1000)),
      xLabel: t('axisT'),
      yLabel: t('axisP'),
      yUnit: 1000,
      series,
      format: num,
      theme: this.graphTheme,
    });
  }

  /** The two laws, worked out with the numbers from the experiment. */
  private renderTheory(): void {
    const { els, plan, setup } = this;
    const v = escapeHtml(t('vSym'));
    setHtml(els.lawMomentum, `p = m · ${v}`);
    for (const id of TRUCK_IDS) {
      const motion = plan[id];
      const { calcP, calcT } = els.trucks[id];
      setHtml(
        calcP,
        `${symbol('p', id)} = ${escapeHtml(num(motion.mass))} kg × ${escapeHtml(num(motion.v0, 1))} m/s = ` +
          `<strong>${escapeHtml(num(motion.p0))} kg·m/s</strong>`,
      );
      if (setup.frictionForce === 0) {
        // Without a force the momentum cannot change: say it once, as a formula.
        calcT.hidden = id === 'b';
        setHtml(calcT, 'F = 0 &nbsp;⇒&nbsp; Δp = 0');
      } else {
        calcT.hidden = false;
        setHtml(
          calcT,
          `Δ${symbol('t', id)} = ${escapeHtml(num(motion.p0))} / ${escapeHtml(num(setup.frictionForce))} = ` +
            `<strong>${escapeHtml(seconds(motion.stopTime))}</strong>`,
        );
      }
    }
  }

  private renderChallenge(): void {
    const { els, state, prediction } = this;
    for (const button of els.predictions) {
      button.setAttribute('aria-pressed', String(button.dataset['predict'] === prediction));
      button.disabled = state !== 'ready';
    }
    els.predictHint.hidden = state !== 'ready';
    els.result.hidden = state !== 'finished';
    if (state !== 'finished') return;
    const result = this.result(outcomeOf(this.plan));
    els.result.dataset['verdict'] = result.mood;
    setText(els.verdict, result.verdict);
    els.verdict.hidden = result.verdict === '';
    setText(els.explain, result.explain);
  }

  /** The verdict on the prediction, and one line on why. */
  private result(outcome: Outcome): { mood: 'right' | 'wrong' | 'neutral'; verdict: string; explain: string } {
    const { plan, prediction } = this;
    if (outcome === 'at-rest' || outcome === 'never-stop') {
      return { mood: 'neutral', verdict: '', explain: outcome === 'at-rest' ? t('explainAtRest') : '' };
    }
    const answer = outcome === 'same' ? t('predictSame') : name(outcome);
    let mood: 'right' | 'wrong' | 'neutral' = 'neutral';
    let verdict = t('verdictNone', { answer });
    if (prediction === outcome) {
      mood = 'right';
      verdict = t('verdictRight');
    } else if (prediction !== null) {
      mood = 'wrong';
      verdict = t('verdictWrong', { answer });
    }

    if (plan.a.v0 !== plan.b.v0) {
      // Same road, so the same deceleration: only the speed decides.
      const fast: TruckId = plan.b.v0 > plan.a.v0 ? 'b' : 'a';
      const f = plan[fast];
      const s = plan[other(fast)];
      const explain = t('explainSpeed', {
        fast: name(fast),
        vFast: metersPerSecond(f.v0),
        vSlow: metersPerSecond(s.v0),
        dFast: meters(round1(f.stopDistance)),
        dSlow: meters(round1(s.stopDistance)),
        a: `${num(f.decel, 2)} m/s²`,
      });
      return { mood, verdict, explain };
    }
    if (plan.a.mass === plan.b.mass) {
      return { mood, verdict, explain: t('explainSameMass', { d: meters(round1(plan.a.stopDistance)) }) };
    }
    const heavy: TruckId = plan.b.mass > plan.a.mass ? 'b' : 'a';
    const h = plan[heavy];
    const l = plan[other(heavy)];
    const ratio = h.p0 / l.p0;
    const explain = t('explainMu', {
      heavy: name(heavy),
      ratio: num(ratio, ratioDigits(ratio)),
      fHeavy: newtons(h.friction),
      fLight: newtons(l.friction),
      a: `${num(h.decel, 2)} m/s²`,
      d: meters(round1(h.stopDistance)),
    });
    return { mood, verdict, explain };
  }
}

/** The part of a truck's p–t line up to `time`: a straight drop, then flat at zero. */
export function trace(motion: Motion, time: number): Array<readonly [number, number]> {
  const points: Array<readonly [number, number]> = [[0, motion.p0]];
  if (time <= 0) return points;
  const bend = Math.min(time, motion.stopTime);
  if (bend > 0) points.push([bend, snapshotAt(motion, bend).p]);
  if (time > bend) points.push([time, 0]);
  return points;
}

/** Rounds to one decimal, so a distance like 22.4999… reads as 22.5. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Sizes a canvas for its CSS box and the screen's pixel density, and returns a context in CSS pixels. */
function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  if (width <= 0) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function readTheme(): GraphTheme & Record<TruckId, string> {
  const css = getComputedStyle(document.documentElement);
  const read = (property: string, fallback: string): string => css.getPropertyValue(property).trim() || fallback;
  return {
    background: read('--surface', '#ffffff'),
    text: read('--muted', '#5b6577'),
    grid: read('--grid', '#e8ecf3'),
    axis: read('--text', '#172033'),
    a: read('--truck-a-line', COLORS.a.color),
    b: read('--truck-b-line', COLORS.b.color),
  };
}

export function mountMomentumLesson(root: HTMLElement): MomentumLesson {
  return new MomentumLesson(root);
}
