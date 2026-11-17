import { LIMITS } from './physics';

/**
 * Markup for the momentum lesson. It holds no text of its own: `data-i18n*` attributes are
 * filled from strings.ts in the current language, and the numbers are filled in by lesson.ts.
 * No inline styles or scripts, so it works under the site's strict Content-Security-Policy.
 */
export const TEMPLATE = /* html */ `
<div class="lesson">
  <header class="lesson-intro">
    <p class="eyebrow" data-i18n="eyebrow"></p>
    <h1 data-i18n="title"></h1>
    <p class="lede" data-i18n="lede"></p>
  </header>

  <section class="card sim" aria-labelledby="sim-heading">
    <h2 id="sim-heading" class="visually-hidden" data-i18n="simHeading"></h2>
    <div class="canvas-wrap" id="scene-wrap">
      <canvas id="scene" data-state="ready" role="img" data-i18n-label="sceneLabel"></canvas>
    </div>
    <div class="transport">
      <button type="button" class="btn btn-primary" id="run"></button>
      <button type="button" class="btn" id="reset" data-i18n="reset"></button>
      <button type="button" class="btn" id="skip" data-i18n="skip"></button>
      <div class="rate" role="group" data-i18n-label="playback">
        <span class="rate-label" data-i18n="playback"></span>
        <button type="button" class="chip" data-rate="0.5" aria-pressed="false"></button>
        <button type="button" class="chip" data-rate="1" aria-pressed="true"></button>
        <button type="button" class="chip" data-rate="2" aria-pressed="false"></button>
        <button type="button" class="chip" data-rate="4" aria-pressed="false"></button>
      </div>
      <output class="clock" id="clock"></output>
    </div>
  </section>

  <section class="card controls" aria-labelledby="controls-heading">
    <h2 id="controls-heading" data-i18n="controlsHeading"></h2>

    <div class="field truck-a">
      <div class="field-head">
        <label for="mass-a" data-i18n="massA"></label>
        <output id="mass-a-out" for="mass-a"></output>
      </div>
      <input type="range" id="mass-a" min="${LIMITS.mass.min}" max="${LIMITS.mass.max}" step="${LIMITS.mass.step}" />
      <p class="field-note" id="mass-a-note"></p>
    </div>

    <div class="field truck-b">
      <div class="field-head">
        <label for="mass-b" data-i18n="massB"></label>
        <output id="mass-b-out" for="mass-b"></output>
      </div>
      <input type="range" id="mass-b" min="${LIMITS.mass.min}" max="${LIMITS.mass.max}" step="${LIMITS.mass.step}" />
      <p class="field-note" id="mass-b-note"></p>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="speed" data-i18n="speed"></label>
        <output id="speed-out" for="speed"></output>
      </div>
      <input type="range" id="speed" min="${LIMITS.speed.min}" max="${LIMITS.speed.max}" step="${LIMITS.speed.step}" />
    </div>

    <fieldset class="field friction">
      <legend data-i18n="friction"></legend>
      <div class="segmented">
        <label><input type="radio" name="friction-mode" value="force" /><span data-i18n="modeForce"></span></label>
        <label><input type="radio" name="friction-mode" value="coefficient" /><span data-i18n="modeMu"></span></label>
      </div>
      <div class="field-head">
        <label for="friction" id="friction-label"></label>
        <output id="friction-out" for="friction"></output>
      </div>
      <input type="range" id="friction" />
      <p class="field-note" id="friction-note"></p>
    </fieldset>

    <p class="shortcuts" data-i18n="shortcuts"></p>
  </section>

  <section class="card predict" aria-labelledby="predict-heading">
    <h2 id="predict-heading" data-i18n="predictHeading"></h2>
    <p class="question" data-i18n="predictQuestion"></p>
    <div class="choices" role="group" data-i18n-label="predictQuestion">
      <button type="button" class="choice choice-a" data-predict="a" aria-pressed="false" data-i18n="truckA"></button>
      <button type="button" class="choice choice-b" data-predict="b" aria-pressed="false" data-i18n="truckB"></button>
      <button type="button" class="choice" data-predict="same" aria-pressed="false" data-i18n="predictSame"></button>
    </div>
    <p class="hint" id="predict-hint"></p>
    <div class="result" id="result" aria-live="polite">
      <p class="verdict" id="verdict"></p>
      <p class="explain" id="explain"></p>
      <p class="tip" id="tip"></p>
    </div>
  </section>

  <div class="results">
  <section class="card data" aria-labelledby="data-heading">
    <h2 id="data-heading" data-i18n="dataHeading"></h2>
    <div class="table-scroll">
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
          <tr><th scope="row" data-i18n-html="rowFrictionHtml"></th><td id="a-friction"></td><td id="b-friction"></td></tr>
          <tr><th scope="row" data-i18n-html="rowDecelHtml"></th><td id="a-decel"></td><td id="b-decel"></td></tr>
          <tr><th scope="row" data-i18n-html="rowDistanceHtml"></th><td id="a-distance"></td><td id="b-distance"></td></tr>
          <tr><th scope="row" data-i18n-html="rowStopTimeHtml"></th><td id="a-stop"></td><td id="b-stop"></td></tr>
        </tbody>
      </table>
    </div>
    <div class="bars" aria-hidden="true">
      <p class="bars-title" data-i18n="momentumBars"></p>
      <div class="bar-row bar-a">
        <span class="bar-label" data-i18n="truckA"></span>
        <div class="bar-track"><div class="bar-fill" id="bar-a"></div></div>
      </div>
      <div class="bar-row bar-b">
        <span class="bar-label" data-i18n="truckB"></span>
        <div class="bar-track"><div class="bar-fill" id="bar-b"></div></div>
      </div>
    </div>
    <p class="ratio" id="ratio"></p>
    <p class="formula-line" id="formula-a"></p>
    <p class="formula-line" id="formula-b"></p>
  </section>

  <section class="card graph" aria-labelledby="graph-heading">
    <div class="card-head">
      <h2 id="graph-heading" data-i18n="graphHeading"></h2>
      <div class="segmented compact" role="group" data-i18n-label="graphHeading">
        <button type="button" data-graph="p" aria-pressed="true" data-i18n="graphP"></button>
        <button type="button" data-graph="v" aria-pressed="false" data-i18n="graphV"></button>
      </div>
    </div>
    <div class="canvas-wrap" id="graph-wrap">
      <canvas id="graph" role="img" data-i18n-label="graphLabel"></canvas>
    </div>
    <p class="caption" id="graph-caption"></p>
  </section>
  </div>

  <section class="card theory" aria-labelledby="theory-heading">
    <h2 id="theory-heading" data-i18n="theoryHeading"></h2>
    <div class="prose" data-i18n-html="theoryHtml"></div>
  </section>
</div>
`;
