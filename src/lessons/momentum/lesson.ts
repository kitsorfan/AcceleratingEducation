/**
 * Lesson 1: momentum. Two trucks start side by side at the same speed and brake; the student
 * sets the masses, the speed and the friction, predicts which truck needs more road to stop,
 * runs the experiment, and gets an explanation tailored to the setup.
 */
import { escapeHtml, formatNumber, onLangChange, translate, translateDom, type Params } from '../../i18n/i18n';
import { clamp, niceCeil, ratioDigits } from '../../lib/nice';
import { drawGraph, type GraphSeries, type GraphTheme } from './graph';
import {
  DEFAULT_SETUP,
  LIMITS,
  MS_TO_KMH,
  outcomeOf,
  planBoth,
  runDuration,
  snapshotAt,
  type FrictionMode,
  type Motion,
  type Plan,
  type Setup,
  type Snapshot,
} from './physics';
import { drawScene, type SceneTruck } from './scene';
import { STRINGS, type MomentumKey } from './strings';
import { TEMPLATE } from './template';

export type RunState = 'ready' | 'running' | 'paused' | 'finished';
type TruckId = 'a' | 'b';
type Prediction = TruckId | 'same';
type GraphKind = 'p' | 'v';

const TRUCK_IDS: readonly TruckId[] = ['a', 'b'];
/** Longest real-time step per frame (s), so a hidden tab doesn't make the trucks jump. */
const MAX_FRAME_STEP = 0.1;

const COLORS: Record<TruckId, { color: string; ink: string }> = {
  a: { color: '#2563eb', ink: '#1d4ed8' },
  b: { color: '#ea7317', ink: '#b45309' },
};

const t = (key: MomentumKey, params?: Params): string => translate(STRINGS, key, params);
const num = (value: number, digits = 0): string => formatNumber(value, digits);
const name = (id: TruckId): string => t(id === 'a' ? 'truckA' : 'truckB');
const inline = (id: TruckId): string => t(id === 'a' ? 'truckAInline' : 'truckBInline');
const other = (id: TruckId): TruckId => (id === 'a' ? 'b' : 'a');
const meters = (value: number): string => `${num(value, Number.isInteger(value) ? 0 : 1)} m`;
const seconds = (value: number): string => `${num(value, 1)} s`;
const newtons = (value: number): string => `${num(value)} N`;

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
  const truck = (id: TruckId) => ({
    mass: query(root, `#mass-${id}`, HTMLInputElement),
    massOut: query(root, `#mass-${id}-out`, HTMLOutputElement),
    massNote: query(root, `#mass-${id}-note`, HTMLParagraphElement),
    cells: {
      mass: query(root, `#${id}-mass`, HTMLTableCellElement),
      speed: query(root, `#${id}-speed`, HTMLTableCellElement),
      momentum: query(root, `#${id}-momentum`, HTMLTableCellElement),
      friction: query(root, `#${id}-friction`, HTMLTableCellElement),
      decel: query(root, `#${id}-decel`, HTMLTableCellElement),
      distance: query(root, `#${id}-distance`, HTMLTableCellElement),
      stop: query(root, `#${id}-stop`, HTMLTableCellElement),
    },
    bar: query(root, `#bar-${id}`, HTMLDivElement),
    formula: query(root, `#formula-${id}`, HTMLParagraphElement),
  });
  return {
    scene: query(root, '#scene', HTMLCanvasElement),
    sceneWrap: query(root, '#scene-wrap', HTMLDivElement),
    graph: query(root, '#graph', HTMLCanvasElement),
    graphWrap: query(root, '#graph-wrap', HTMLDivElement),
    run: query(root, '#run', HTMLButtonElement),
    reset: query(root, '#reset', HTMLButtonElement),
    skip: query(root, '#skip', HTMLButtonElement),
    rates: queryAll(root, '[data-rate]', HTMLButtonElement),
    clock: query(root, '#clock', HTMLOutputElement),
    speed: query(root, '#speed', HTMLInputElement),
    speedOut: query(root, '#speed-out', HTMLOutputElement),
    modes: queryAll(root, 'input[name="friction-mode"]', HTMLInputElement),
    friction: query(root, '#friction', HTMLInputElement),
    frictionLabel: query(root, '#friction-label', HTMLLabelElement),
    frictionOut: query(root, '#friction-out', HTMLOutputElement),
    frictionNote: query(root, '#friction-note', HTMLParagraphElement),
    predictions: queryAll(root, '[data-predict]', HTMLButtonElement),
    predictHint: query(root, '#predict-hint', HTMLParagraphElement),
    result: query(root, '#result', HTMLDivElement),
    verdict: query(root, '#verdict', HTMLParagraphElement),
    explain: query(root, '#explain', HTMLParagraphElement),
    tip: query(root, '#tip', HTMLParagraphElement),
    ratio: query(root, '#ratio', HTMLParagraphElement),
    graphKinds: queryAll(root, '[data-graph]', HTMLButtonElement),
    graphCaption: query(root, '#graph-caption', HTMLParagraphElement),
    trucks: { a: truck('a'), b: truck('b') },
  };
}

type Elements = ReturnType<typeof lookup>;

export class MomentumLesson {
  private setup: Setup = { ...DEFAULT_SETUP };
  private plan: Plan = planBoth(this.setup);
  private state: RunState = 'ready';
  /** Simulated time since the start (s). */
  private time = 0;
  private rate = 1;
  private prediction: Prediction | null = null;
  private graphKind: GraphKind = 'p';
  private lastFrame: number | null = null;
  private frameRequested = false;
  private graphTheme: GraphTheme & Record<TruckId, string>;
  private readonly els: Elements;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = TEMPLATE;
    this.els = lookup(root);
    this.graphTheme = readTheme();
    this.syncInputs();
    this.wire();
    this.translate();
  }

  private wire(): void {
    const { els } = this;
    for (const id of TRUCK_IDS) {
      const input = els.trucks[id].mass;
      input.addEventListener('input', () =>
        this.changeSetup(id === 'a' ? { massA: Number(input.value) } : { massB: Number(input.value) }),
      );
    }
    els.speed.addEventListener('input', () => this.changeSetup({ speed: Number(els.speed.value) }));
    for (const radio of els.modes) {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        this.changeSetup({ frictionMode: radio.value === 'coefficient' ? 'coefficient' : 'force' });
        this.syncFrictionSlider();
      });
    }
    els.friction.addEventListener('input', () => {
      const value = Number(els.friction.value);
      this.changeSetup(this.setup.frictionMode === 'force' ? { frictionForce: value } : { mu: value });
    });

    els.run.addEventListener('click', () => this.toggleRun());
    els.reset.addEventListener('click', () => this.reset());
    els.skip.addEventListener('click', () => this.skipToEnd());
    for (const button of els.rates) {
      button.addEventListener('click', () => {
        this.rate = Number(button.dataset['rate']) || 1;
        this.invalidate();
      });
    }
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
    for (const button of els.graphKinds) {
      button.addEventListener('click', () => {
        this.graphKind = button.dataset['graph'] === 'v' ? 'v' : 'p';
        this.invalidate();
      });
    }

    window.addEventListener('keydown', (event) => this.onKey(event));
    const resize = new ResizeObserver(() => this.invalidate());
    resize.observe(els.sceneWrap);
    resize.observe(els.graphWrap);
    onLangChange(() => this.translate());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      this.graphTheme = readTheme();
      this.invalidate();
    });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.code === 'Space' && tag !== 'BUTTON') {
      event.preventDefault();
      this.toggleRun();
    } else if (event.code === 'KeyR') {
      this.reset();
    }
  }

  private translate(): void {
    translateDom(this.root, STRINGS);
    document.title = t('docTitle');
    this.invalidate();
  }

  // ---- State changes -------------------------------------------------------------------------

  private changeSetup(patch: Partial<Setup>): void {
    if (this.state === 'running') return;
    this.setup = { ...this.setup, ...patch };
    this.plan = planBoth(this.setup);
    // A new experiment: a finished or paused run no longer matches the setup.
    if (this.state !== 'ready') this.reset();
    this.invalidate();
  }

  private toggleRun(): void {
    switch (this.state) {
      case 'ready':
      case 'paused':
        this.start();
        break;
      case 'running':
        this.state = 'paused';
        break;
      case 'finished':
        // Same experiment again: keep the setup and the prediction.
        this.time = 0;
        this.start();
        break;
    }
    this.invalidate();
  }

  private start(): void {
    this.lastFrame = null;
    if (this.time >= runDuration(this.plan)) this.finish();
    else this.state = 'running';
  }

  private finish(): void {
    this.time = runDuration(this.plan);
    this.state = 'finished';
  }

  private skipToEnd(): void {
    if (this.state === 'finished') return;
    this.finish();
    this.invalidate();
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
        const step = Math.min((now - this.lastFrame) / 1000, MAX_FRAME_STEP) * this.rate;
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
    this.renderScene(snaps);
    this.renderGraph();
    this.renderReadouts(snaps);
    this.renderControls();
    this.renderPrediction();
  }

  // ---- Rendering -----------------------------------------------------------------------------

  private renderScene(snaps: Record<TruckId, Snapshot>): void {
    const width = this.els.sceneWrap.clientWidth;
    const height = Math.round(clamp(width * 0.42, 300, 390));
    const ctx = fitCanvas(this.els.scene, width, height);
    this.els.scene.dataset['state'] = this.state;
    if (!ctx) return;
    const ran = this.state !== 'ready';
    const truck = (id: TruckId): SceneTruck => {
      const snap = snaps[id];
      return {
        ...COLORS[id],
        mass: this.plan[id].mass,
        x: snap.x,
        p: snap.p,
        title: `${name(id)} · ${t('massValue', { kg: num(this.plan[id].mass) })}`,
        momentum: t('momentumLabel', { p: num(snap.p) }),
        letter: t(id === 'a' ? 'subA' : 'subB'),
        stopLabel: ran && snap.stopped ? meters(snap.x) : null,
        behindLabel: `${t(id === 'a' ? 'subA' : 'subB')} · ${meters(snap.x)}`,
      };
    };
    drawScene(ctx, width, height, {
      trucks: [truck('a'), truck('b')],
      startLabel: t('startLabel'),
      overviewLabel: t('overviewLabel'),
      meters,
    });
  }

  private renderGraph(): void {
    const width = this.els.graphWrap.clientWidth;
    const height = Math.round(clamp(width * 0.62, 220, 300));
    const ctx = fitCanvas(this.els.graph, width, height);
    if (!ctx) return;
    const kind = this.graphKind;
    const peak = kind === 'p' ? Math.max(this.plan.a.p0, this.plan.b.p0) : this.setup.speed;
    const series: GraphSeries[] = TRUCK_IDS.map((id) => ({
      color: this.graphTheme[id],
      points: trace(this.plan[id], this.time, kind),
    }));
    drawGraph(ctx, width, height, {
      // A fixed time axis for the whole run, so the slopes keep their meaning as the lines grow.
      xMax: niceCeil(Math.max(runDuration(this.plan), 0.5)),
      yMax: niceCeil(Math.max(peak, kind === 'p' ? 1000 : 1)),
      xLabel: t('axisT'),
      yLabel: t(kind === 'p' ? 'axisP' : 'axisV'),
      yUnit: kind === 'p' ? 1000 : 1,
      series,
      format: num,
      theme: this.graphTheme,
    });
  }

  private renderReadouts(snaps: Record<TruckId, Snapshot>): void {
    const peak = Math.max(this.plan.a.p0, this.plan.b.p0);
    for (const id of TRUCK_IDS) {
      const motion = this.plan[id];
      const snap = snaps[id];
      const { cells, bar, formula } = this.els.trucks[id];
      setText(cells.mass, `${num(motion.mass)} kg`);
      setText(cells.speed, `${num(snap.v, 1)} m/s`);
      setText(cells.momentum, `${num(snap.p)} kg·m/s`);
      setText(cells.friction, newtons(motion.friction));
      setText(cells.decel, `${num(motion.decel, 2)} m/s²`);
      setText(cells.distance, `${num(snap.x, 1)} m`);
      setText(cells.stop, this.stopText(motion, snap));
      bar.style.width = `${peak > 0 ? (snap.p / peak) * 100 : 0}%`;

      // The definition with the starting numbers filled in.
      const sub = escapeHtml(t(id === 'a' ? 'subA' : 'subB'));
      setHtml(
        formula,
        `<i>p</i><sub>${sub}</sub> = <i>m</i><sub>${sub}</sub> · <i>${escapeHtml(t('vSym'))}</i> = ` +
          `${escapeHtml(num(motion.mass))} kg × ${escapeHtml(num(motion.v0, 1))} m/s = ` +
          `<strong>${escapeHtml(num(motion.p0))} kg·m/s</strong>`,
      );
    }
    setText(this.els.ratio, this.ratioText());
  }

  private stopText(motion: Motion, snap: Snapshot): string {
    if (this.state === 'ready' && motion.v0 > 0) return t('stopUnknown');
    if (snap.stopped) return seconds(motion.stopTime);
    if (!Number.isFinite(motion.stopTime)) return t('stopNever');
    return t('stopPending');
  }

  private ratioText(): string {
    const { a, b } = this.plan;
    if (a.p0 === 0 && b.p0 === 0) return t('ratioRest');
    if (a.p0 === b.p0) return t('ratioEqual');
    const heavy: TruckId = b.p0 > a.p0 ? 'b' : 'a';
    const ratio = this.plan[heavy].p0 / this.plan[other(heavy)].p0;
    return t('ratioMore', {
      heavyInline: inline(heavy),
      lightInline: inline(other(heavy)),
      ratio: num(ratio, ratioDigits(ratio)),
    });
  }

  private renderControls(): void {
    const { els, setup, state } = this;
    const runLabel: Record<RunState, MomentumKey> = {
      ready: 'run',
      running: 'pause',
      paused: 'resume',
      finished: 'runAgain',
    };
    setText(els.run, t(runLabel[state]));
    els.skip.disabled = state === 'finished';
    setText(els.clock, t('clock', { t: num(this.time, 1) }));
    for (const button of els.rates) {
      const rate = Number(button.dataset['rate']);
      setText(button, `×${num(rate, Number.isInteger(rate) ? 0 : 1)}`);
      button.setAttribute('aria-pressed', String(rate === this.rate));
    }

    // Changing the setup in the middle of a run would make it meaningless.
    const locked = state === 'running';
    for (const input of [els.trucks.a.mass, els.trucks.b.mass, els.speed, els.friction, ...els.modes]) {
      input.disabled = locked;
    }

    for (const id of TRUCK_IDS) {
      const { massOut, massNote } = els.trucks[id];
      const mass = this.plan[id].mass;
      setText(massOut, t('massValue', { kg: num(mass) }));
      const cargo = mass - LIMITS.mass.min;
      setText(
        massNote,
        cargo > 0 ? t('loadNote', { empty: num(LIMITS.mass.min), cargo: num(cargo) }) : t('emptyNote'),
      );
    }
    setText(els.speedOut, t('speedValue', { ms: num(setup.speed, 1), kmh: num(setup.speed * MS_TO_KMH) }));

    const byForce = setup.frictionMode === 'force';
    setText(els.frictionLabel, t(byForce ? 'frictionForceLabel' : 'muLabel'));
    setText(
      els.frictionOut,
      byForce ? t('forceValue', { n: num(setup.frictionForce) }) : t('muValue', { mu: num(setup.mu, 2) }),
    );
    const noFriction = byForce ? setup.frictionForce === 0 : setup.mu === 0;
    setText(els.frictionNote, t(noFriction ? 'zeroFrictionNote' : byForce ? 'forceNote' : 'muNote'));

    for (const button of els.graphKinds) {
      button.setAttribute('aria-pressed', String(button.dataset['graph'] === this.graphKind));
    }
    setText(els.graphCaption, t(this.graphKind === 'p' ? 'captionP' : 'captionV'));
  }

  private renderPrediction(): void {
    const { els, state, prediction } = this;
    for (const button of els.predictions) {
      button.setAttribute('aria-pressed', String(button.dataset['predict'] === prediction));
      button.disabled = state !== 'ready';
    }
    const hint: MomentumKey | null =
      state === 'ready' ? 'predictHintPick' : state === 'finished' ? null : prediction ? 'predictHintLocked' : 'predictHintNone';
    els.predictHint.hidden = hint === null;
    if (hint) setText(els.predictHint, t(hint));

    els.result.hidden = state !== 'finished';
    if (state !== 'finished') return;
    const result = this.result();
    els.result.dataset['verdict'] = result.mood;
    setText(els.verdict, result.verdict);
    setText(els.explain, result.explain);
    setText(els.tip, result.tip);
    els.tip.hidden = result.tip === '';
  }

  /** The verdict on the prediction, and an explanation that fits this particular setup. */
  private result(): { mood: 'right' | 'wrong' | 'neutral'; verdict: string; explain: string; tip: string } {
    const { plan, setup, prediction } = this;
    const outcome = outcomeOf(plan);
    const answer = (choice: Prediction): string => (choice === 'same' ? t('predictSame') : name(choice));
    const tip = t(
      outcome === 'never-stop' || outcome === 'at-rest'
        ? 'tipTryForce'
        : setup.frictionMode === 'force'
          ? 'tipTryMu'
          : 'tipTryZero',
    );

    if (outcome === 'at-rest') return { mood: 'neutral', verdict: t('verdictAtRest'), explain: t('explainAtRest'), tip };
    if (outcome === 'never-stop') {
      const explain = `${t('explainFrictionless', { v: `${num(setup.speed, 1)} m/s` })} ${this.ratioText()}`;
      return { mood: 'neutral', verdict: t('verdictNeverStop'), explain, tip };
    }

    let mood: 'right' | 'wrong' | 'neutral' = 'neutral';
    let verdict = t('verdictNone', { answer: answer(outcome) });
    if (prediction === outcome) {
      mood = 'right';
      verdict = t('verdictRight', { choice: answer(prediction) });
    } else if (prediction !== null) {
      mood = 'wrong';
      verdict = t('verdictWrong', { choice: answer(prediction), answer: answer(outcome) });
    }

    if (plan.a.mass === plan.b.mass) {
      const explain = t('explainSameMass', { t: seconds(plan.a.stopTime), d: meters(round1(plan.a.stopDistance)) });
      return { mood, verdict, explain, tip };
    }
    const heavy: TruckId = plan.b.mass > plan.a.mass ? 'b' : 'a';
    const light = other(heavy);
    const h = plan[heavy];
    const l = plan[light];
    const ratio = h.p0 / l.p0;
    const common = {
      heavy: name(heavy),
      heavyInline: inline(heavy),
      lightInline: inline(light),
      ratio: num(ratio, ratioDigits(ratio)),
    };
    const explain =
      outcome === 'same'
        ? t('explainMu', {
            ...common,
            fHeavy: newtons(h.friction),
            fLight: newtons(l.friction),
            a: `${num(h.decel, 2)} m/s²`,
            t: seconds(h.stopTime),
            d: meters(round1(h.stopDistance)),
          })
        : t('explainForce', {
            ...common,
            f: newtons(h.friction),
            tHeavy: seconds(h.stopTime),
            tLight: seconds(l.stopTime),
            dHeavy: meters(round1(h.stopDistance)),
            dLight: meters(round1(l.stopDistance)),
          });
    return { mood, verdict, explain, tip };
  }

  // ---- Inputs --------------------------------------------------------------------------------

  /** Puts the setup's values into the form controls. */
  private syncInputs(): void {
    const { els, setup } = this;
    els.trucks.a.mass.value = String(setup.massA);
    els.trucks.b.mass.value = String(setup.massB);
    els.speed.value = String(setup.speed);
    for (const radio of els.modes) radio.checked = radio.value === setup.frictionMode;
    this.syncFrictionSlider();
  }

  /** The friction slider is a force in one mode and a coefficient in the other. */
  private syncFrictionSlider(): void {
    const { friction } = this.els;
    const mode: FrictionMode = this.setup.frictionMode;
    const range = mode === 'force' ? LIMITS.force : LIMITS.mu;
    friction.min = String(range.min);
    friction.max = String(range.max);
    friction.step = String(range.step);
    friction.value = String(mode === 'force' ? this.setup.frictionForce : this.setup.mu);
  }
}

/** The part of a truck's p–t or v–t line up to `time`: a straight drop, then flat at zero. */
export function trace(motion: Motion, time: number, kind: GraphKind): Array<readonly [number, number]> {
  const value = (snap: Snapshot): number => (kind === 'p' ? snap.p : snap.v);
  const points: Array<readonly [number, number]> = [[0, value(snapshotAt(motion, 0))]];
  if (time <= 0) return points;
  const bend = Math.min(time, motion.stopTime);
  if (bend > 0) points.push([bend, value(snapshotAt(motion, bend))]);
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
