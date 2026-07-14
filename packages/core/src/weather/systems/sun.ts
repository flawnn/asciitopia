import type { WeatherSystem } from '../types.js';

// Daytime sun: warm disc with rays that stretch and settle on a slow breath.

const AT_X = 0.76;
const AT_Y = 0.16;
const RADIUS_ROWS = 1.6;
const CHAR_ASPECT = 2;
const BREATH_SPEED = 0.45; // rad/sec
const RAY_BASE = 2.4; // cols from the rim
const RAY_STRETCH = 1.4;

const CORE = '#ffd685';
const RIM = '#e0aa55';
const RAY = '#b98f4e';

// eight compass rays: dx, dy, glyph
const RAY_DIRS: ReadonlyArray<readonly [number, number, string]> = [
  [1, 0, '-'],
  [-1, 0, '-'],
  [0, 1, '|'],
  [0, -1, '|'],
  [1, 1, '\\'],
  [-1, -1, '\\'],
  [1, -1, '/'],
  [-1, 1, '/'],
];

export class SunSystem implements WeatherSystem {
  private centerCol = 0;
  private centerRow = 0;
  private visible = false;
  private breath = Math.random() * Math.PI * 2;

  init(cols: number, rows: number): void {
    this.centerCol = Math.round(cols * AT_X);
    this.centerRow = Math.round(rows * AT_Y);
    this.visible = rows >= 12 && cols >= 30;
  }

  update(dt: number): void {
    this.breath += (dt / 1000) * BREATH_SPEED;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (!this.visible) return;
    const ry = RADIUS_ROWS;
    const rx = RADIUS_ROWS * CHAR_ASPECT;

    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        const d = (dx / rx) ** 2 + (dy / ry) ** 2;
        if (d > 1) continue;
        const col = this.centerCol + dx;
        const row = this.centerRow + dy;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        ctx.fillStyle = d > 0.6 ? RIM : CORE;
        ctx.fillText(d > 0.6 ? '*' : '@', col * charW, (row + 1) * charH);
      }
    }

    const reach = RAY_BASE + (Math.sin(this.breath) * 0.5 + 0.5) * RAY_STRETCH;
    ctx.fillStyle = RAY;
    for (const [dx, dy, glyph] of RAY_DIRS) {
      const col = this.centerCol + Math.round(dx * (rx + reach));
      const row = this.centerRow + Math.round(dy * (ry + reach / CHAR_ASPECT));
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      ctx.fillText(glyph, col * charW, (row + 1) * charH);
    }
  }
}
