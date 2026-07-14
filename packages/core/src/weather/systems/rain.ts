import type { SceneAnchors, WeatherCondition, WeatherData, WeatherSystem } from '../types.js';

// Rain over the scene: streaking drops that land on the grass line and kick
// up short-lived splash particles.

const DROPS_PER_COL: Partial<Record<WeatherCondition, number>> = {
  drizzle: 0.14,
  rain: 0.42,
  'heavy-rain': 0.85,
  thunderstorm: 1.25,
};
const FALL_MIN = 14; // rows/sec
const FALL_VAR = 18;
const WIND_SLANT_DIVISOR = 22; // cols/sec of drift per km/h
const SLANT_LIMIT = 1.4; // ratio of horizontal to vertical speed

const SPLASH_CHANCE = 0.5;
const MAX_SPLASHES = 60;
const SPLASH_RISE = -4.5; // rows/sec initial kick
const SPLASH_GRAVITY = 14;
const SPLASH_TTL = 0.55; // seconds

const DROP_TONE = '#5a7d9a';
const DROP_DIM = '#3d5568';
const SPLASH_TONE = '#7d9db8';

interface Drop {
  deep: boolean;
  speed: number;
  x: number;
  y: number;
}

interface Splash {
  age: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export class RainSystem implements WeatherSystem {
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private cols = 0;
  private rows = 0;
  private density = DROPS_PER_COL.rain ?? 0.42;
  private slant = 0;
  private drizzle = false;

  constructor(private readonly anchors: SceneAnchors) {}

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.splashes = [];
    this.rebuild(true);
  }

  configure(weather: WeatherData): void {
    this.density = DROPS_PER_COL[weather.condition] ?? this.density;
    this.drizzle = weather.condition === 'drizzle';

    const towardEast = -Math.sin((weather.windDirection * Math.PI) / 180);
    this.slant = Math.max(
      -SLANT_LIMIT,
      Math.min(SLANT_LIMIT, (towardEast * weather.windSpeed) / WIND_SLANT_DIVISOR),
    );
    this.rebuild(false);
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    const ground = this.anchors.groundRow;

    for (const drop of this.drops) {
      drop.y += drop.speed * dtSec;
      drop.x += drop.speed * this.slant * dtSec;
      if (drop.y >= ground) {
        if (!drop.deep && this.splashes.length < MAX_SPLASHES && Math.random() < SPLASH_CHANCE) {
          const side = Math.random() < 0.5 ? -1 : 1;
          this.splashes.push({
            age: 0,
            vx: side * (2 + Math.random() * 4),
            vy: SPLASH_RISE * (0.6 + Math.random() * 0.6),
            x: drop.x,
            y: ground - 0.5,
          });
        }
        drop.y = -Math.random() * 4;
        drop.x = Math.random() * this.cols;
      }
    }

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.age += dtSec;
      s.vy += SPLASH_GRAVITY * dtSec;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      if (s.age > SPLASH_TTL || s.y > this.anchors.groundRow + 1) {
        this.splashes.splice(i, 1);
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const glyph = this.drizzle ? ',' : this.slant > 0.3 ? '\\' : this.slant < -0.3 ? '/' : '|';

    for (const drop of this.drops) {
      const col = Math.round(drop.x);
      const row = Math.round(drop.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      ctx.fillStyle = drop.deep ? DROP_DIM : DROP_TONE;
      ctx.fillText(drop.deep && !this.drizzle ? ',' : glyph, col * charW, (row + 1) * charH);
    }

    ctx.fillStyle = SPLASH_TONE;
    for (const s of this.splashes) {
      const col = Math.round(s.x);
      const row = Math.round(s.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      ctx.fillText(s.age < SPLASH_TTL * 0.4 ? "'" : '.', col * charW, (row + 1) * charH);
    }
  }

  private rebuild(scatter: boolean): void {
    const target = Math.round(this.cols * this.density);
    while (this.drops.length > target) this.drops.pop();
    while (this.drops.length < target) {
      this.drops.push({
        deep: Math.random() < 0.35, // a dimmer far layer for depth
        speed: FALL_MIN + Math.random() * FALL_VAR,
        x: Math.random() * this.cols,
        y: scatter ? Math.random() * this.rows : -Math.random() * this.rows * 0.5,
      });
    }
  }
}
