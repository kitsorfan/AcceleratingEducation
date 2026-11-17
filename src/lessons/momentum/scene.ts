/**
 * Draws the road scene: one strip per truck, sharing a camera so their positions line up.
 * The camera follows the leading truck and zooms out when needed, so both trucks stay in view.
 *
 * Distances are in metres along the road (0 = start line). Each truck's momentum arrow is drawn
 * to one fixed scale, so arrow lengths can be compared between trucks and between runs.
 */
import { clamp, stepForPixels } from '../../lib/nice';
import { EMPTY_TRUCK_MASS, LIMITS } from './physics';

export interface SceneTruck {
  /** Paint colour for the cab, arrow and markers. */
  color: string;
  /** Darker shade of `color` for text and labels. */
  ink: string;
  mass: number;
  /** Front bumper position (m from the start line). */
  x: number;
  /** Momentum now (kg·m/s). */
  p: number;
  /** Strip header on the left, e.g. "Truck A · 5,000 kg" (in the challenge also "· 15 m/s"). */
  title: string;
  /** Strip header on the right, e.g. "p = 75,000 kg·m/s". */
  momentum: string;
  /** Letter painted on the cab door. */
  letter: string;
  /** Where it stopped, e.g. "22.5 m", once it has stopped in this run; otherwise null. */
  stopLabel: string | null;
}

export interface SceneModel {
  trucks: readonly [SceneTruck, SceneTruck];
  startLabel: string;
  /** Formats a distance, e.g. "10 m". */
  meters: (value: number) => string;
}

/** Bumper-to-bumper length of a truck (m). */
export const TRUCK_LENGTH = 10;

const LOAD_TOP = 3.3; // height of a full load (m)
const ARROW_LIFT = 0.9; // gap between the load and the momentum arrow (m)
const P_REF = LIMITS.mass.max * LIMITS.speed.max; // momentum drawn as the longest possible arrow
const MAX_ARROW = 0.4; // that longest arrow, as a fraction of the canvas width
const VIEW_START = -13; // left edge of the view before the trucks move (m)
const LEADER_AT = 0.42; // once moving, the leading truck's front stays this far across the view
const CRATE_SLOTS = 8; // two rows of four crates on a fully loaded truck

const HEADER = 24;
const ROAD = 26;
const RULER = 18;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';

interface View {
  /** World position of the left edge (m). */
  left: number;
  /** Pixels per metre. */
  scale: number;
  /** Visible length of road (m). */
  meters: number;
  width: number;
}

/** Left edge of the view (m): starts behind the start line, then follows the leading truck. */
export function followCamera(leaderX: number, viewMeters: number): number {
  return Math.max(VIEW_START, leaderX - LEADER_AT * viewMeters);
}

/**
 * The stretch of road to show (m): it follows the leading truck and, once the trucks drift
 * apart, zooms out so the one behind stays in view too.
 */
export function frameRoad(minX: number, maxX: number, minMeters: number): { left: number; meters: number } {
  const left = Math.min(followCamera(maxX, minMeters), minX - TRUCK_LENGTH - 3);
  const right = Math.max(left + minMeters, maxX + (1 - LEADER_AT) * minMeters);
  return { left, meters: right - left };
}

/** How many crates a truck of this mass carries (0 when empty, 8 when fully loaded). */
export function crateCount(mass: number): number {
  const load = clamp((mass - EMPTY_TRUCK_MASS) / (LIMITS.mass.max - EMPTY_TRUCK_MASS), 0, 1);
  return Math.round(load * CRATE_SLOTS);
}

/** Pixels per metre the road would like: about 60 m on a wide screen, at least 34 m on a phone. */
function preferredScale(width: number): number {
  return width / clamp(width / 14, 34, 64);
}

/** A strip's height besides the truck itself: the header, the road, the ruler and a margin. */
const STRIP_CHROME = HEADER + 14 + RULER + ROAD * 0.42;
/** Share of the sky the tallest load and its arrow fill at the natural height. */
const SKY_FILL = 0.83;

/**
 * The canvas height (px) at which the trucks are drawn at their preferred scale with a little
 * sky above. Shorter canvases still work: the road zooms out to make room.
 */
export function naturalSceneHeight(width: number): number {
  const truck = ((LOAD_TOP + ARROW_LIFT) * preferredScale(width)) / SKY_FILL;
  return 2 * Math.ceil(STRIP_CHROME + truck);
}

export function drawScene(ctx: CanvasRenderingContext2D, width: number, height: number, model: SceneModel): void {
  const stripHeight = Math.floor(height / 2);
  // Always room for the load and its arrow: a short canvas shows more road instead.
  const heightScale = (stripHeight - STRIP_CHROME) / (LOAD_TOP + ARROW_LIFT);
  const closest = Math.max(2, Math.min(preferredScale(width), heightScale));
  const xs = model.trucks.map((truck) => truck.x);
  const road = frameRoad(Math.min(...xs), Math.max(...xs), width / closest);
  const view: View = { left: road.left, scale: width / road.meters, meters: road.meters, width };

  ctx.clearRect(0, 0, width, height);
  model.trucks.forEach((truck, i) => drawStrip(ctx, view, i * stripHeight, stripHeight, truck, model));
  ctx.fillStyle = '#c7d0dc';
  ctx.fillRect(0, stripHeight, width, 1);
}

function drawStrip(
  ctx: CanvasRenderingContext2D,
  view: View,
  top: number,
  height: number,
  truck: SceneTruck,
  model: SceneModel,
): void {
  const { width, scale } = view;
  const sx = (x: number): number => (x - view.left) * scale;
  const rulerTop = top + height - RULER;
  const roadTop = rulerTop - ROAD;
  const groundY = roadTop + ROAD * 0.58; // where the wheels touch the road

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, width, height);
  ctx.clip();

  // Sky, hills, verge and road.
  const sky = ctx.createLinearGradient(0, top, 0, roadTop);
  sky.addColorStop(0, '#9fd3f5');
  sky.addColorStop(1, '#e9f6fc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, top, width, roadTop - top);
  drawHills(ctx, view, top + HEADER, roadTop - 5);
  ctx.fillStyle = '#7dbb5b';
  ctx.fillRect(0, roadTop - 5, width, 5);
  ctx.fillStyle = '#4a505a';
  ctx.fillRect(0, roadTop, width, ROAD);
  ctx.fillStyle = '#d9dde3';
  ctx.fillRect(0, roadTop, width, 2);
  ctx.fillRect(0, roadTop + ROAD - 2, width, 2);

  // Lane dashes, fixed to the road so they scroll past.
  const period = 7.5;
  ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
  for (let x = Math.floor(view.left / period) * period; x < view.left + view.meters; x += period) {
    ctx.fillRect(sx(x), roadTop + 5, 3 * scale, 2);
  }

  drawStartLine(ctx, sx(0), roadTop, model.startLabel);
  drawRuler(ctx, view, rulerTop, model.meters);
  drawTruck(ctx, sx(truck.x), groundY, scale, truck);

  // Momentum arrow, from the middle of the truck, to a fixed scale.
  const arrowY = groundY - (LOAD_TOP + ARROW_LIFT) * scale;
  const arrowX = sx(truck.x - TRUCK_LENGTH / 2);
  drawArrow(ctx, arrowX, arrowY, (truck.p / P_REF) * MAX_ARROW * width, truck.color);
  ctx.font = `italic 700 14px ${FONT}`;
  ctx.fillStyle = truck.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillText('p', arrowX - 6, arrowY + 5);
  ctx.textAlign = 'left';

  if (truck.stopLabel !== null) {
    const px = sx(truck.x);
    ctx.strokeStyle = truck.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, roadTop - 6);
    ctx.lineTo(px, rulerTop + RULER);
    ctx.stroke();
    ctx.setLineDash([]);
    pill(ctx, px + 4, roadTop - 24, truck.stopLabel, truck.ink);
  }

  // Header: which truck, and its momentum right now. The text shrinks to fit a narrow phone.
  ctx.fillStyle = 'rgb(255 255 255 / 0.78)';
  ctx.fillRect(0, top, width, HEADER);
  ctx.fillStyle = truck.color;
  ctx.fillRect(0, top, 5, HEADER);
  ctx.textBaseline = 'middle';
  ctx.font = `600 13px ${FONT}`;
  const titleWidth = ctx.measureText(truck.title).width;
  ctx.font = `700 13px ${FONT}`;
  const momentumWidth = ctx.measureText(truck.momentum).width;
  const size = clamp((13 * (width - 34)) / (titleWidth + momentumWidth), 9, 13);
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.fillStyle = '#172033';
  ctx.fillText(truck.title, 12, top + HEADER / 2 + 0.5);
  ctx.textAlign = 'right';
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.fillStyle = truck.ink;
  ctx.fillText(truck.momentum, width - 10, top + HEADER / 2 + 0.5);
  ctx.textAlign = 'left';


  ctx.restore();
}

function drawHills(ctx: CanvasRenderingContext2D, view: View, skyTop: number, horizon: number): void {
  const skyHeight = horizon - skyTop;
  const layers = [
    { parallax: 0.12, color: '#bfe0c6', amp: 0.75, period: 230, phase: 0 },
    { parallax: 0.3, color: '#9fcfa9', amp: 0.48, period: 150, phase: 2.1 },
  ];
  for (const layer of layers) {
    const offset = view.left * view.scale * layer.parallax;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let px = 0; px <= view.width + 8; px += 8) {
      const u = (px + offset) / layer.period + layer.phase;
      const rise = 0.6 + 0.26 * Math.sin(u) + 0.14 * Math.sin(2.7 * u + 1.3);
      ctx.lineTo(px, horizon - skyHeight * layer.amp * rise);
    }
    ctx.lineTo(view.width, horizon);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }
}

function drawStartLine(ctx: CanvasRenderingContext2D, x: number, roadTop: number, label: string): void {
  const square = ROAD / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#1f2329';
      ctx.fillRect(x + col * square, roadTop + row * square, square, square);
    }
  }
  ctx.font = `700 10px ${FONT}`;
  ctx.fillStyle = '#2f5a1f';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(label, x + 2 * square + 4, roadTop - 8);
}

/** A tape measure along the road, from the start line onwards. */
function drawRuler(ctx: CanvasRenderingContext2D, view: View, top: number, meters: (value: number) => string): void {
  const { scale, width } = view;
  const sx = (x: number): number => (x - view.left) * scale;
  ctx.fillStyle = '#f3ecd9';
  ctx.fillRect(0, top, width, RULER);
  ctx.fillStyle = '#c9bfa3';
  ctx.fillRect(0, top, width, 1);

  const right = view.left + view.meters;
  const major = stepForPixels(scale, 72, [5, 10, 20, 25, 50, 100, 200, 500, 1000]);
  const minor = stepForPixels(scale, 7, [1, 2, 5, 10, 20, 50, 100]);
  ctx.strokeStyle = '#8a7f63';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.max(0, Math.ceil(view.left / minor) * minor); x <= right; x += minor) {
    const px = Math.round(sx(x)) + 0.5;
    ctx.moveTo(px, top);
    ctx.lineTo(px, top + 4);
  }
  for (let x = Math.max(0, Math.ceil(view.left / major) * major); x <= right; x += major) {
    const px = Math.round(sx(x)) + 0.5;
    ctx.moveTo(px, top);
    ctx.lineTo(px, top + 9);
  }
  ctx.stroke();

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = '#5c5440';
  ctx.textBaseline = 'alphabetic';
  for (let x = Math.max(0, Math.ceil(view.left / major) * major); x <= right; x += major) {
    ctx.fillText(meters(x), Math.round(sx(x)) + 3, top + RULER - 3);
  }
}

/** A side view of a rigid truck facing right; `frontX` is the front bumper, on the road at `groundY`. */
function drawTruck(ctx: CanvasRenderingContext2D, frontX: number, groundY: number, scale: number, truck: SceneTruck): void {
  const load = clamp((truck.mass - EMPTY_TRUCK_MASS) / (LIMITS.mass.max - EMPTY_TRUCK_MASS), 0, 1);
  const sag = 0.14 * load; // the springs settle under a heavy load
  const pixel = 1 / scale;
  const outline = shade(truck.color, -0.4);

  ctx.save();
  ctx.translate(frontX, groundY);
  ctx.scale(scale, -scale); // metres, with y pointing up

  ctx.fillStyle = 'rgb(0 0 0 / 0.22)';
  ctx.beginPath();
  ctx.ellipse(-TRUCK_LENGTH / 2, 0, TRUCK_LENGTH / 2 + 0.3, 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -sag);

  // Chassis, flatbed, rear light and headboard.
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(-9.8, 0.72, 9.55, 0.3);
  ctx.fillStyle = '#6b4f3a';
  ctx.fillRect(-10, 1.0, 7.15, 0.32);
  ctx.fillStyle = '#e23b3b';
  ctx.fillRect(-10.05, 1.02, 0.12, 0.28);
  ctx.fillStyle = '#8b939e';
  ctx.fillRect(-3.0, 1.32, 0.16, 1.95);

  // Cargo: crates fill the bed from the cab backwards, bottom row first.
  const crates = crateCount(truck.mass);
  ctx.lineWidth = pixel * 1.2;
  ctx.strokeStyle = '#7a4f24';
  for (let i = 0; i < crates; i++) {
    const x = -4.7 - (i % 4) * 1.73;
    const y = 1.32 + Math.floor(i / 4) * 0.98;
    ctx.fillStyle = i % 2 === 0 ? '#c9924f' : '#bb8445';
    ctx.fillRect(x, y, 1.66, 0.94);
    ctx.strokeRect(x, y, 1.66, 0.94);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1.66, y + 0.94);
    ctx.moveTo(x, y + 0.94);
    ctx.lineTo(x + 1.66, y);
    ctx.stroke();
  }

  // Cab.
  ctx.fillStyle = truck.color;
  ctx.beginPath();
  ctx.moveTo(-2.75, 0.95);
  ctx.lineTo(-0.12, 0.95);
  ctx.lineTo(-0.08, 2.05);
  ctx.lineTo(-0.55, 3.2);
  ctx.lineTo(-2.75, 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = pixel * 1.5;
  ctx.stroke();
  ctx.fillStyle = '#d6ecf8';
  ctx.beginPath();
  ctx.moveTo(-0.32, 2.1);
  ctx.lineTo(-0.7, 3.0);
  ctx.lineTo(-1.75, 3.0);
  ctx.lineTo(-1.75, 2.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1.95, 1.15);
  ctx.lineTo(-1.95, 3.0);
  ctx.stroke();
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(-0.3, 0.6, 0.38, 0.42);
  ctx.fillStyle = '#ffe28a';
  ctx.fillRect(-0.17, 1.15, 0.1, 0.3);
  ctx.restore();

  // Wheels roll with the distance travelled, without the load's sag.
  for (const x of [-1.55, -7.0, -8.25]) drawWheel(ctx, x, 0.52, truck.x, pixel);
  ctx.restore();

  // The truck's letter on the cab door, drawn upright in screen space.
  const letterSize = 0.95 * scale;
  if (letterSize >= 8) {
    ctx.font = `800 ${letterSize}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truck.letter, frontX - 1.1 * scale, groundY - (1.6 - sag) * scale);
    ctx.textAlign = 'left';
  }
}

function drawWheel(ctx: CanvasRenderingContext2D, x: number, r: number, distance: number, pixel: number): void {
  ctx.fillStyle = '#1d1f24';
  ctx.beginPath();
  ctx.arc(x, r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aab3bf';
  ctx.beginPath();
  ctx.arc(x, r, r * 0.52, 0, Math.PI * 2);
  ctx.fill();
  // Rolling without slipping: the wheel turns (distance / r) radians, clockwise when moving right.
  const angle = -distance / r;
  ctx.strokeStyle = '#4f5763';
  ctx.lineWidth = pixel * 1.6;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = angle + (k * Math.PI * 2) / 5;
    ctx.moveTo(x, r);
    ctx.lineTo(x + Math.cos(a) * r * 0.5, r + Math.sin(a) * r * 0.5);
  }
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgb(255 255 255 / 0.9)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  if (length < 1) {
    // Zero momentum: just a dot where the arrow would start.
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
    return;
  }
  const head = Math.min(13, length);
  const halfShaft = 3.5;
  const halfHead = 9;
  const neck = x + length - head;
  ctx.beginPath();
  ctx.moveTo(x, y - halfShaft);
  ctx.lineTo(neck, y - halfShaft);
  ctx.lineTo(neck, y - halfHead);
  ctx.lineTo(x + length, y);
  ctx.lineTo(neck, y + halfHead);
  ctx.lineTo(neck, y + halfShaft);
  ctx.lineTo(x, y + halfShaft);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, background: string): void {
  ctx.font = `700 11px ${FONT}`;
  const w = ctx.measureText(text).width + 12;
  const h = 16;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 6, y + h / 2 + 0.5);
}

/** Mixes a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  const channel = (shift: number): number => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (target - c) * t);
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}
