import type { WeatherCondition, WeatherData, WeatherSystem } from '../types.js';
import type { SceneSystem } from './scene.js';

// Weather leaves traces — the scene remembers. Snow settles on every
// upward-facing surface and melts away; rain pools into shimmering puddles
// that dry out; a rainbow hangs in the first clear daylight after rain;
// icicles grow under the eave when a deep cover freezes.

// --- snow cover (0–1) ---

const SNOW_FILL_SECONDS = 90; // heavy-snow to full blanket
const LIGHT_SNOW_RATE = 0.55; // 'snow' fills at this fraction of the rate
const MELT_SECONDS = 160; // full blanket to bare at mild temperature
const MELT_TEMP_GAIN = 12; // °C at which melting runs twice as fast
const CAP_HEAVY = 0.4; // cover past a perch's roll where the cap thickens
const ICICLE_COVER = 0.5;
const ICICLE_ROLL = 45; // just under half the eave cells grow one
const LONG_ICICLE_ROLL = 8;

const SNOW_BRIGHT = '#dde4ea';
const SNOW_DIM = '#b9c4cc';
const ICE_TONE = '#9fb6c6';

// --- wetness / puddles (0–1) ---

const WET_SECONDS: Partial<Record<WeatherCondition, number>> = {
  drizzle: 80,
  rain: 40,
  'heavy-rain': 28,
  thunderstorm: 26,
};
const DRY_SECONDS = 130;
const CLEAR_DAY_DRY_FACTOR = 1.8;
const PUDDLE_EVERY_COLS = 14;
const PUDDLE_SPAN_MIN = 3;
const PUDDLE_SPAN_VAR = 4;
const PUDDLE_THRESHOLD_MIN = 0.12;
const PUDDLE_THRESHOLD_VAR = 0.45;
const SHIMMER_SPEED = 1.7;

const WATER_TONE = '#3d5568';
const WATER_GLINT = '#6a90ad';

// --- rainbow (seconds) ---

const RAINBOW_IN = 3;
const RAINBOW_HOLD = 16;
const RAINBOW_OUT = 8;
const RAINBOW_TOTAL = RAINBOW_IN + RAINBOW_HOLD + RAINBOW_OUT;
const RAINBOW_MIN_WET = 0.12;
const RAINBOW_ALPHA = 0.5;
const COL_ASPECT = 0.52; // cell width relative to height, for round arcs

// muted against the charcoal stage
const RAINBOW_BANDS: ReadonlyArray<readonly [number, number, number]> = [
  [201, 121, 116],
  [199, 178, 112],
  [118, 149, 197],
];

interface Puddle {
  col: number;
  row: number;
  span: number;
  threshold: number;
}

const isRainy = (c: WeatherCondition): boolean =>
  c === 'drizzle' || c === 'rain' || c === 'heavy-rain' || c === 'thunderstorm';

const isSnowy = (c: WeatherCondition): boolean => c === 'snow' || c === 'heavy-snow';

const isCalm = (c: WeatherCondition): boolean => c === 'clear' || c === 'partly-cloudy';

export class TracesSystem implements WeatherSystem {
  snowCover = 0;
  wetness = 0;

  private cols = 0;
  private rows = 0;
  private time = 0;
  private puddles: Puddle[] = [];
  private condition: WeatherCondition = 'clear';
  private temperature = 20;
  private isDay = false;
  private rainbowLeft = 0;

  constructor(private readonly scene: SceneSystem) {}

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.time = 0;
    this.snowCover = 0;
    this.wetness = 0;
    this.rainbowLeft = 0;
    this.buildPuddleSites();
  }

  configure(weather: WeatherData): void {
    const wasRaining = isRainy(this.condition);
    this.condition = weather.condition;
    this.temperature = weather.temperature;
    this.isDay = weather.isDay;

    // rain just broke into daylight: hang a rainbow if the ground is still wet
    if (
      wasRaining &&
      isCalm(weather.condition) &&
      weather.isDay &&
      this.wetness > RAINBOW_MIN_WET
    ) {
      this.rainbowLeft = RAINBOW_TOTAL;
    }
    if (!isCalm(weather.condition) || !weather.isDay) this.rainbowLeft = 0;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    this.time += dtSec;

    if (isSnowy(this.condition)) {
      const rate = this.condition === 'heavy-snow' ? 1 : LIGHT_SNOW_RATE;
      this.snowCover = Math.min(1, this.snowCover + (rate * dtSec) / SNOW_FILL_SECONDS);
    } else if (this.temperature > 0 && this.snowCover > 0) {
      const speed = 1 + Math.min(2, this.temperature / MELT_TEMP_GAIN);
      this.snowCover = Math.max(0, this.snowCover - (speed * dtSec) / MELT_SECONDS);
    }

    const wetSeconds = WET_SECONDS[this.condition];
    if (wetSeconds) {
      this.wetness = Math.min(1, this.wetness + dtSec / wetSeconds);
    } else if (this.wetness > 0) {
      const factor = isCalm(this.condition) && this.isDay ? CLEAR_DAY_DRY_FACTOR : 1;
      this.wetness = Math.max(0, this.wetness - (factor * dtSec) / DRY_SECONDS);
    }

    if (this.rainbowLeft > 0) this.rainbowLeft = Math.max(0, this.rainbowLeft - dtSec);

    this.scene.snowLevel = this.snowCover;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (this.rainbowLeft > 0) this.renderRainbow(ctx, cols, rows, charW, charH);
    if (this.wetness > PUDDLE_THRESHOLD_MIN) this.renderPuddles(ctx, cols, rows, charW, charH);
    if (this.snowCover > 0) this.renderSnow(ctx, cols, rows, charW, charH);
  }

  // --- snow on the scene ---

  private renderSnow(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const cover97 = this.snowCover * 97;

    for (const perch of this.scene.perches) {
      if (cover97 <= perch.roll) continue;
      const row = perch.row - 1; // the cap sits in the open cell above
      if (perch.col < 0 || perch.col >= cols || row < 0 || row >= rows) continue;
      const heavy = cover97 - perch.roll > CAP_HEAVY * 97;
      ctx.fillStyle = heavy ? SNOW_BRIGHT : SNOW_DIM;
      ctx.fillText(heavy ? '*' : '_', perch.col * charW, (row + 1) * charH);
    }

    if (this.snowCover > ICICLE_COVER && this.temperature <= 0) {
      ctx.fillStyle = ICE_TONE;
      for (const hang of this.scene.hangs) {
        if (hang.roll >= ICICLE_ROLL) continue;
        const row = hang.row + 1;
        if (hang.col < 0 || hang.col >= cols || row >= rows) continue;
        ctx.fillText("'", hang.col * charW, (row + 1) * charH);
        if (hang.roll < LONG_ICICLE_ROLL && this.snowCover > 0.85 && row + 1 < rows) {
          ctx.fillText('.', hang.col * charW, (row + 1.4) * charH);
        }
      }
    }
  }

  // --- puddles ---

  private buildPuddleSites(): void {
    this.puddles = [];
    const top = this.scene.anchors.groundRow + 1;
    if (top >= this.rows || this.cols < 20) return;

    for (let base = 4; base < this.cols - 6; base += PUDDLE_EVERY_COLS) {
      const h = (Math.imul(base + 3, 40503) ^ 0x2f) >>> 0;
      const col = base + (h % 7);
      const row = top + ((h >>> 5) % Math.max(1, this.rows - top));
      const span = PUDDLE_SPAN_MIN + ((h >>> 9) % (PUDDLE_SPAN_VAR + 1));
      const threshold = PUDDLE_THRESHOLD_MIN + (((h >>> 13) % 90) / 90) * PUDDLE_THRESHOLD_VAR;
      this.puddles.push({ col, row, span, threshold });
    }
  }

  private renderPuddles(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const puddle of this.puddles) {
      if (this.wetness <= puddle.threshold || puddle.row >= rows) continue;
      // puddles grow from their center as the ground soaks
      const grow = Math.min(1, (this.wetness - puddle.threshold) / 0.35);
      const half = Math.max(0, Math.round((puddle.span * grow) / 2));
      const y = (puddle.row + 1) * charH;
      for (let c = puddle.col - half; c <= puddle.col + half; c++) {
        if (c < 0 || c >= cols) continue;
        const glint = Math.sin(this.time * SHIMMER_SPEED + c * 0.9 + puddle.row) > 0.72;
        ctx.fillStyle = glint ? WATER_GLINT : WATER_TONE;
        ctx.fillText('~', c * charW, y);
      }
    }
  }

  // --- rainbow ---

  private renderRainbow(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const t = RAINBOW_TOTAL - this.rainbowLeft;
    const fade =
      t < RAINBOW_IN
        ? t / RAINBOW_IN
        : this.rainbowLeft < RAINBOW_OUT
          ? this.rainbowLeft / RAINBOW_OUT
          : 1;
    const alpha = fade * RAINBOW_ALPHA;
    const ground = Math.min(this.scene.anchors.groundRow, rows);
    if (ground < 8) return;

    const cx = cols * 0.55;
    const radius = ground * 0.82;

    for (let band = 0; band < RAINBOW_BANDS.length; band++) {
      const [r, g, b] = RAINBOW_BANDS[band];
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      const rb = radius - band * 1.4;
      for (let col = 0; col < cols; col++) {
        const dx = (col - cx) * COL_ASPECT;
        const under = rb * rb - dx * dx;
        if (under <= 0) continue;
        const row = Math.round(ground - Math.sqrt(under));
        if (row < 0 || row >= ground) continue;
        const glyph = Math.abs(dx) < rb * 0.45 ? '-' : col < cx ? '/' : '\\';
        ctx.fillText(glyph, col * charW, (row + 1) * charH);
      }
    }
  }
}
