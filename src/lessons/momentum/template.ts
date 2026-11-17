import { LIMITS } from './physics';

/** Line icons (24×24, stroked), referenced with <use href="#i-…">. */
const ICONS = /* html */ `
<svg class="sprite" aria-hidden="true" focusable="false">
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-forward" viewBox="0 0 24 24"><path d="M2.5 6v12l9-6z" fill="currentColor" stroke="none"/><path d="M12.5 6v12l9-6z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-reset" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></symbol>
  <symbol id="i-shuffle" viewBox="0 0 24 24"><path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.46-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.43 1.94l.48.74"/><path d="M22 18h-6.04a4 4 0 0 1-3.3-1.8l-.36-.45"/></symbol>
</svg>`;

const icon = (name: string, id = ''): string =>
  `<svg class="icon" aria-hidden="true" focusable="false"><use ${id ? `id="${id}" ` : ''}href="#i-${name}"></use></svg>`;

/** One slider with its label, an optional small note after the label, and its current value. */
const slider = (
  id: string,
  key: string,
  range: { min: number; max: number; step: number },
  extraClass = '',
  noteKey = '',
): string => /* html */ `
      <div class="field ${extraClass}">
        <div class="field-head">
          ${
            noteKey
              ? `<label for="${id}"><span data-i18n="${key}"></span> <small class="field-note" data-i18n="${noteKey}"></small></label>`
              : `<label for="${id}" data-i18n="${key}"></label>`
          }
          <output class="badge" id="${id}-out" for="${id}"></output>
        </div>
        <input type="range" id="${id}" min="${range.min}" max="${range.max}" step="${range.step}" />
      </div>`;

/** One truck's own sliders (mass and initial speed), under its name, in its colour. */
const truckGroup = (id: 'a' | 'b'): string => /* html */ `
      <fieldset class="truck-group truck-${id}">
        <legend data-i18n="${id === 'a' ? 'truckA' : 'truckB'}"></legend>
${slider(`mass-${id}`, 'mass', LIMITS.mass)}
${slider(`speed-${id}`, 'speed', LIMITS.speed)}
      </fieldset>`;

/**
 * Markup for the momentum lesson: a stepper, the road (shared by the steps that need it), one
 * panel per step, and Back / Next. It holds no text of its own: `data-i18n*` attributes are
 * filled from strings.ts, and lesson.ts fills in the numbers and shows one step at a time.
 * No inline styles or scripts, so it works under the site's strict Content-Security-Policy.
 */
export const TEMPLATE = /* html */ `
${ICONS}
<div class="lesson">
  <nav class="lesson-nav" data-i18n-label="stepsLabel">
    <p class="eyebrow"><span data-i18n="eyebrow"></span> · <span data-i18n="title"></span></p>
    <ol class="steps" id="steps">
      <li><button type="button" class="step-tab" data-step="1"><span class="step-num">1</span><span class="step-label" data-i18n="step1"></span></button></li>
      <li><button type="button" class="step-tab" data-step="2"><span class="step-num">2</span><span class="step-label" data-i18n="step2"></span></button></li>
      <li><button type="button" class="step-tab" data-step="3"><span class="step-num">3</span><span class="step-label" data-i18n="step3"></span></button></li>
      <li><button type="button" class="step-tab" data-step="4"><span class="step-num">4</span><span class="step-label" data-i18n="step4"></span></button></li>
    </ol>
  </nav>

  <header class="step-head">
    <h1 id="step-title"></h1>
    <p class="lede" id="step-lede"></p>
  </header>

  <section class="card sim" id="sim">
    <div class="canvas-wrap" id="scene-wrap">
      <canvas id="scene" data-state="ready" role="img" data-i18n-label="sceneLabel"></canvas>
    </div>
    <div class="transport">
      <button type="button" class="btn btn-primary btn-run" id="run">${icon('play', 'run-icon')}<span id="run-label"></span></button>
      <button type="button" class="btn btn-outline" id="reset">${icon('reset')}<span data-i18n="reset"></span></button>
      <div class="speed-switch" role="group" data-i18n-label="playbackSpeed">
        <button type="button" data-fast="false" aria-pressed="true">${icon('play')}<span>×1</span></button>
        <button type="button" data-fast="true" aria-pressed="false">${icon('forward')}<span id="fast-label"></span></button>
      </div>
      <button type="button" class="btn btn-outline" id="new-problem" hidden>${icon('shuffle')}<span data-i18n="newProblem"></span></button>
      <output class="clock" id="clock"></output>
    </div>
  </section>

  <section class="step-panel" data-panel="1">
    <div class="card controls">
${truckGroup('a')}
${truckGroup('b')}
${slider('friction', 'friction', LIMITS.force, 'field-wide', 'frictionNote')}
    </div>
  </section>

  <section class="step-panel" data-panel="2">
    <div class="results">
      <div class="card data">
        <h2 data-i18n="dataHeading"></h2>
        <table class="readouts">
          <thead>
            <tr>
              <th scope="col"><span class="visually-hidden" data-i18n="quantity"></span></th>
              <th scope="col" class="col-a" data-i18n="truckA"></th>
              <th scope="col" class="col-b" data-i18n="truckB"></th>
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row" data-i18n-html="rowMassHtml"></th><td id="a-mass"></td><td id="b-mass"></td></tr>
            <tr><th scope="row" data-i18n-html="rowSpeedHtml"></th><td id="a-speed"></td><td id="b-speed"></td></tr>
            <tr class="row-momentum"><th scope="row" data-i18n-html="rowMomentumHtml"></th><td id="a-momentum"></td><td id="b-momentum"></td></tr>
            <tr><th scope="row" data-i18n-html="rowDistanceHtml"></th><td id="a-distance"></td><td id="b-distance"></td></tr>
            <tr><th scope="row" data-i18n-html="rowStopTimeHtml"></th><td id="a-stop"></td><td id="b-stop"></td></tr>
          </tbody>
        </table>
        <div class="ratios" id="ratios" aria-live="polite"></div>
      </div>
      <div class="card graph">
        <h2 data-i18n="graphHeading"></h2>
        <div class="canvas-wrap" id="graph-wrap">
          <canvas id="graph" role="img" data-i18n-label="graphLabel"></canvas>
        </div>
      </div>
    </div>
  </section>

  <section class="step-panel" data-panel="3">
    <div class="theory">
      <div class="card">
        <h2 data-i18n="theoryMomentum"></h2>
        <p class="law" id="law-momentum"></p>
        <p class="calc calc-a" id="calc-pa"></p>
        <p class="calc calc-b" id="calc-pb"></p>
      </div>
      <div class="card">
        <h2 data-i18n="theoryImpulse"></h2>
        <p class="law">F · Δt = Δp &nbsp;⇒&nbsp; Δt = p / F</p>
        <p class="calc calc-a" id="calc-ta"></p>
        <p class="calc calc-b" id="calc-tb"></p>
      </div>
    </div>
  </section>

  <section class="step-panel" data-panel="4">
    <div class="card predict">
      <p class="question" data-i18n="challengeQuestion"></p>
      <div class="choices" role="group" data-i18n-label="challengeQuestion">
        <button type="button" class="choice choice-a" data-predict="a" aria-pressed="false" data-i18n="truckA"></button>
        <button type="button" class="choice choice-b" data-predict="b" aria-pressed="false" data-i18n="truckB"></button>
        <button type="button" class="choice choice-same" data-predict="same" aria-pressed="false" data-i18n="predictSame"></button>
      </div>
      <p class="hint" id="predict-hint" data-i18n="predictHint"></p>
      <div class="result" id="result" aria-live="polite">
        <p class="verdict" id="verdict"></p>
        <p class="explain" id="explain"></p>
      </div>
    </div>
  </section>
</div>
`;
