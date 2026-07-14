import type { SceneAnchors, WeatherCondition, WeatherData, WeatherSystem } from '../types.js';

// Snowfall in two depth layers; flakes settle out at the grass line.

const FLAKES_PER_COL: Partial<Record<WeatherCondition, number>> = {
  snow: 0.45,
  'heavy-snow': 0.95,
};
const FALL_NEAR_MIN = 2.2; // rows/sec
const FALL_NEAR_VAR = 1.6;
const FAR_SPEED_RATIO = 0.55;
const SWAY_FREQ = 0.7; // rad/sec
const SWAY_AMPLITUDE = 1.1; // cols
const WIND_DRIFT_DIVISOR = 26;

const NEAR_TONE = '#dde4ea';
const FAR_TONE = '#8a929c';

interface Flake {
  far: boolean;
  phase: number;
  speed: number;
  x: number;
  y: number;
}

export class SnowSystem implements WeatherSystem {
  private flakes: Flake[] = [];
  private cols = 0;
  private rows = 0;
  private density = FLAKES_PER_COL.snow ?? 0.45;
  private drift = 0;

  constructor(private readonly anchors: SceneAnchors) {}

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.rebuild(true);
  }

  configure(weather: WeatherData): void {
    this.density = FLAKES_PER_COL[weather.condition] ?? this.density;
    const towardEast = -Math.sin((weather.windDirection * Math.PI) / 180);
    this.drift = (towardEast * weather.windSpeed) / WIND_DRIFT_DIVISOR;
    this.rebuild(false);
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const flake of this.flakes) {
      flake.phase += SWAY_FREQ * dtSec;
      flake.y += flake.speed * dtSec;
      flake.x += (Math.sin(flake.phase) * SWAY_AMPLITUDE * 0.5 + this.drift) * dtSec;
      if (flake.y >= this.anchors.groundRow + 1) {
        flake.y = -1 - Math.random() * 3;
        flake.x = Math.random() * this.cols;
      }
      if (flake.x < -2) flake.x += this.cols + 4;
      else if (flake.x > this.cols + 2) flake.x -= this.cols + 4;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const flake of this.flakes) {
      const col = Math.round(flake.x);
      const row = Math.round(flake.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      ctx.fillStyle = flake.far ? FAR_TONE : NEAR_TONE;
      ctx.fillText(flake.far ? '.' : '*', col * charW, (row + 1) * charH);
    }
  }

  private rebuild(scatter: boolean): void {
    const target = Math.round(this.cols * this.density);
    while (this.flakes.length > target) this.flakes.pop();
    while (this.flakes.length < target) {
      const far = Math.random() < 0.45;
      const near = FALL_NEAR_MIN + Math.random() * FALL_NEAR_VAR;
      this.flakes.push({
        far,
        phase: Math.random() * Math.PI * 2,
        speed: far ? near * FAR_SPEED_RATIO : near,
        x: Math.random() * this.cols,
        y: scatter ? Math.random() * this.rows : -Math.random() * this.rows * 0.4,
      });
    }
  }
}
