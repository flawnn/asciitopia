import type { SceneAnchors, WeatherData, WeatherSystem } from '../types.js';

// Chimney smoke: puffs climb from the flue, loosen with age, and lean
// downwind as they thin out.

const PUFF_INTERVAL_MIN = 0.55; // seconds
const PUFF_INTERVAL_VAR = 0.7;
const MAX_PUFFS = 18;
const RISE_MIN = 1.4; // rows/sec
const RISE_VAR = 0.9;
const WIND_LEAN_DIVISOR = 24; // cols/sec per km/h
const SWAY_FREQ = 1.3;
const SWAY_AMPLITUDE = 0.5;
const PUFF_TTL = 5.5; // seconds

// young puffs are tight, old ones unravel
const AGE_GLYPHS = ['.', ':', 'o', '~', '~'] as const;
const AGE_TONES = ['#9a948a', '#8a857c', '#767268', '#5e5b54', '#4a4842'] as const;

interface Puff {
  age: number;
  phase: number;
  rise: number;
  x: number;
  y: number;
}

export class SmokeSystem implements WeatherSystem {
  private puffs: Puff[] = [];
  private timer = 0;
  private lean = 0;
  private stoke = 1; // cold outside → the fire burns harder, puffs come faster

  constructor(private readonly anchors: SceneAnchors) {}

  init(_cols: number, _rows: number): void {
    this.puffs = [];
    this.timer = Math.random() * PUFF_INTERVAL_VAR;
  }

  configure(weather: WeatherData): void {
    const towardEast = -Math.sin((weather.windDirection * Math.PI) / 180);
    this.lean = (towardEast * weather.windSpeed) / WIND_LEAN_DIVISOR;
    const t = weather.temperature;
    this.stoke = t <= 0 ? 0.5 : t < 10 ? 0.75 : t > 18 ? 1.6 : 1;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;

    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      puff.age += dtSec;
      puff.phase += SWAY_FREQ * dtSec;
      // rise fades with age, drift grows — smoke bends over
      const lift = Math.max(0.15, 1 - puff.age / PUFF_TTL);
      puff.y -= puff.rise * lift * dtSec;
      puff.x += (this.lean * (2 - lift) + Math.sin(puff.phase) * SWAY_AMPLITUDE) * dtSec;
      if (puff.age > PUFF_TTL || puff.y < -1) this.puffs.splice(i, 1);
    }

    this.timer -= dtSec;
    if (this.timer <= 0 && this.puffs.length < MAX_PUFFS && this.anchors.chimneyRow > 1) {
      this.timer = (PUFF_INTERVAL_MIN + Math.random() * PUFF_INTERVAL_VAR) * this.stoke;
      this.puffs.push({
        age: 0,
        phase: Math.random() * Math.PI * 2,
        rise: RISE_MIN + Math.random() * RISE_VAR,
        x: this.anchors.chimneyCol + (Math.random() - 0.5) * 0.6,
        y: this.anchors.chimneyRow,
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const puff of this.puffs) {
      const col = Math.round(puff.x);
      const row = Math.round(puff.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const stage = Math.min(
        AGE_GLYPHS.length - 1,
        Math.floor((puff.age / PUFF_TTL) * AGE_GLYPHS.length),
      );
      ctx.fillStyle = AGE_TONES[stage];
      ctx.fillText(AGE_GLYPHS[stage], col * charW, (row + 1) * charH);
    }
  }
}
