import type { SceneAnchors, WeatherSystem } from '../types.js';

// Fireflies on warm clear nights: a handful of slow wanderers near the grass,
// each pulsing on its own blink clock.

const COUNT_DIVISOR = 14; // one firefly per this many columns
const MAX_COUNT = 12;
const BAND_ROWS = 6; // rows above the grass line they roam in
const WANDER_SPEED = 1.6; // cols/sec
const RETARGET_SECONDS = 2.5;
const ON_MIN = 0.5; // glow seconds
const ON_VAR = 0.9;
const OFF_MIN = 1.2; // dark seconds
const OFF_VAR = 2.8;

const GLOW = '#d8e06a';
const EMBER = '#8a8f4a';

interface Firefly {
  clock: number;
  lit: boolean;
  retarget: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export class FireflySystem implements WeatherSystem {
  private flies: Firefly[] = [];
  private cols = 0;

  constructor(private readonly anchors: SceneAnchors) {}

  init(cols: number, _rows: number): void {
    this.cols = cols;
    const top = Math.max(0, this.anchors.groundRow - BAND_ROWS);
    const count = Math.min(MAX_COUNT, Math.floor(cols / COUNT_DIVISOR));
    this.flies = Array.from({ length: count }, () => ({
      clock: Math.random() * OFF_MIN,
      lit: Math.random() < 0.3,
      retarget: Math.random() * RETARGET_SECONDS,
      vx: 0,
      vy: 0,
      x: Math.random() * cols,
      y: top + Math.random() * BAND_ROWS,
    }));
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    const bandTop = Math.max(0, this.anchors.groundRow - BAND_ROWS);
    const bandBottom = this.anchors.groundRow - 0.5;

    for (const fly of this.flies) {
      fly.retarget -= dtSec;
      if (fly.retarget <= 0) {
        fly.retarget = RETARGET_SECONDS * (0.5 + Math.random());
        const angle = Math.random() * Math.PI * 2;
        fly.vx = Math.cos(angle) * WANDER_SPEED;
        fly.vy = Math.sin(angle) * WANDER_SPEED * 0.4;
      }
      fly.x += fly.vx * dtSec;
      fly.y += fly.vy * dtSec;
      if (fly.x < 0) fly.x += this.cols;
      else if (fly.x >= this.cols) fly.x -= this.cols;
      fly.y = Math.max(bandTop, Math.min(bandBottom, fly.y));

      fly.clock -= dtSec;
      if (fly.clock <= 0) {
        fly.lit = !fly.lit;
        fly.clock = fly.lit ? ON_MIN + Math.random() * ON_VAR : OFF_MIN + Math.random() * OFF_VAR;
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
    for (const fly of this.flies) {
      if (!fly.lit) continue;
      const col = Math.round(fly.x);
      const row = Math.round(fly.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      // the glow softens at the ends of the blink
      const soft = fly.clock < 0.18;
      ctx.fillStyle = soft ? EMBER : GLOW;
      ctx.fillText(soft ? '.' : '*', col * charW, (row + 1) * charH);
    }
  }
}
