import type { WeatherData, WeatherSystem } from '../types.js';

// Phase-correct moon: a small shaded disc whose lit side follows tonight's
// actual lunar phase (synodic month from the 2000-01-06 18:14 UTC new moon).

const SYNODIC_DAYS = 29.530588;
const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);
const RADIUS_ROWS = 2.2;
const CHAR_ASPECT = 2; // one row spans about two columns of visual space
const AT_X = 0.78; // fraction of cols
const AT_Y = 0.16; // fraction of rows

const LIT_CORE = '#e6e2cf';
const LIT_EDGE = '#b9b4a0';
const DARK_LIMB = '#3a3a40';

/** 0 = new, 0.5 = full, →1 back to new. */
export const lunarPhase = (now: number): number => {
  const days = (now - NEW_MOON_EPOCH_MS) / 86_400_000;
  return days / SYNODIC_DAYS - Math.floor(days / SYNODIC_DAYS);
};

export class MoonSystem implements WeatherSystem {
  private centerCol = 0;
  private centerRow = 0;
  private visible = false;
  private phase = lunarPhase(Date.now());
  private veiled = false;

  init(cols: number, rows: number): void {
    this.centerCol = Math.round(cols * AT_X);
    this.centerRow = Math.round(rows * AT_Y);
    this.visible = rows >= 12 && cols >= 30;
    this.phase = lunarPhase(Date.now());
  }

  configure(weather: WeatherData): void {
    this.veiled =
      weather.condition === 'overcast' ||
      weather.condition === 'thunderstorm' ||
      weather.condition === 'heavy-snow';
  }

  update(_dt: number): void {}

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (!this.visible || this.veiled) return;

    // illumination fraction of the disc width; a slim crescent is the floor so
    // the moon never dissolves into noise around the new phase
    const lit = Math.max(0.22, 1 - Math.abs(this.phase - 0.5) * 2);
    const waxing = this.phase < 0.5;
    const ry = RADIUS_ROWS;
    const rx = RADIUS_ROWS * CHAR_ASPECT;

    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2;
        if (d > 1) continue;
        const col = this.centerCol + dx;
        const row = this.centerRow + dy;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;

        // terminator: how far across the disc (0 dark limb → 1 lit limb)
        const across = waxing ? (dx / rx + 1) / 2 : (1 - dx / rx) / 2;
        const isLit = across > 1 - lit;
        if (isLit) {
          ctx.fillStyle = d > 0.62 ? LIT_EDGE : LIT_CORE;
          ctx.fillText(d > 0.62 ? '#' : '@', col * charW, (row + 1) * charH);
        } else if ((dx + dy) % 2 === 0) {
          // earthshine: the dark side dithers into a faint haze
          ctx.fillStyle = DARK_LIMB;
          ctx.fillText('.', col * charW, (row + 1) * charH);
        }
      }
    }
  }
}
