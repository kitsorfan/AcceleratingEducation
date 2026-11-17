/** A small line graph (momentum or speed against time) drawn on a canvas. */
import { niceStep } from '../../lib/nice';

export interface GraphTheme {
  background: string;
  text: string;
  grid: string;
  axis: string;
}

export interface GraphSeries {
  color: string;
  /** [time, value] points, in order of time. */
  points: ReadonlyArray<readonly [number, number]>;
}

export interface GraphModel {
  xMax: number;
  yMax: number;
  xLabel: string;
  yLabel: string;
  /** Tick labels show value / yUnit (e.g. 1000 for "× 1000 kg·m/s"). */
  yUnit: number;
  series: readonly GraphSeries[];
  /** Formats a tick label in the current language. */
  format: (value: number, digits: number) => string;
  theme: GraphTheme;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';

/** Fewest decimals that show every multiple of `step` exactly (2.5 → 1, 0.25 → 2, 5 → 0). */
export function decimalsFor(step: number): number {
  for (let digits = 0; digits < 4; digits++) {
    const scaled = step * 10 ** digits;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return digits;
  }
  return 4;
}

export function drawGraph(ctx: CanvasRenderingContext2D, width: number, height: number, model: GraphModel): void {
  const { theme } = model;
  const margin = { left: 46, right: 14, top: 26, bottom: 34 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const px = (t: number): number => margin.left + (t / model.xMax) * plotW;
  const py = (v: number): number => margin.top + plotH - (v / model.yMax) * plotH;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `11px ${FONT}`;
  ctx.lineWidth = 1;

  // Grid lines and tick labels.
  const xStep = niceStep(model.xMax, Math.max(3, Math.floor(plotW / 70)));
  const yStep = niceStep(model.yMax, 4);
  const xDigits = decimalsFor(xStep);
  const yDigits = decimalsFor(yStep / model.yUnit);
  ctx.strokeStyle = theme.grid;
  ctx.fillStyle = theme.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let t = 0; t <= model.xMax + 1e-9; t += xStep) {
    const x = Math.round(px(t)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.stroke();
    ctx.fillText(model.format(t, xDigits), x, margin.top + plotH + 6);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= model.yMax + 1e-9; v += yStep) {
    const y = Math.round(py(v)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.fillText(model.format(v / model.yUnit, yDigits), margin.left - 6, y);
  }

  // Axes and their labels.
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top - 6);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW + 6, margin.top + plotH);
  ctx.stroke();
  ctx.fillStyle = theme.axis;
  ctx.font = `600 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(model.yLabel, 8, 15);
  ctx.textAlign = 'right';
  ctx.fillText(model.xLabel, width - margin.right, height - 4);

  // The curves so far, each ending in a dot at "now".
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const series of model.series) {
    const last = series.points.at(-1);
    if (!last) continue;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    series.points.forEach(([t, v], i) => (i === 0 ? ctx.moveTo(px(t), py(v)) : ctx.lineTo(px(t), py(v))));
    ctx.stroke();
    ctx.fillStyle = series.color;
    ctx.strokeStyle = theme.background;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px(last[0]), py(last[1]), 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}
