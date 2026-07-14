import type { WeatherSystem } from '../types.js';

// Daytime birds: a loose diagonal string crosses the sky now and then,
// wingbeats alternating between two glyphs.

const FLOCK_WAIT_MIN = 9; // seconds between flocks
const FLOCK_WAIT_VAR = 16;
const FLOCK_SIZE_MIN = 3;
const FLOCK_SIZE_VAR = 3;
const SPEED_MIN = 7; // cols/sec
const SPEED_VAR = 5;
const FLAP_SECONDS = 0.32;
const SPACING_COLS = 3.2; // gap between birds along the string
const SPACING_ROWS = 0.6;

const TONE = '#8b8578';

interface Flock {
  count: number;
  dir: 1 | -1;
  flap: number;
  speed: number;
  x: number;
  y: number;
}

export class BirdSystem implements WeatherSystem {
  private flock: Flock | null = null;
  private wait = FLOCK_WAIT_MIN;
  private cols = 0;
  private rows = 0;

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.flock = null;
    this.wait = (FLOCK_WAIT_MIN + Math.random() * FLOCK_WAIT_VAR) * 0.4; // first flock sooner
  }

  update(dt: number): void {
    const dtSec = dt / 1000;

    if (this.flock) {
      this.flock.x += this.flock.speed * this.flock.dir * dtSec;
      this.flock.flap += dtSec;
      const span = this.flock.count * SPACING_COLS;
      if (
        (this.flock.dir === 1 && this.flock.x - span > this.cols) ||
        (this.flock.dir === -1 && this.flock.x + span < 0)
      ) {
        this.flock = null;
      }
      return;
    }

    this.wait -= dtSec;
    if (this.wait <= 0 && this.rows >= 14 && this.cols >= 30) {
      this.wait = FLOCK_WAIT_MIN + Math.random() * FLOCK_WAIT_VAR;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      this.flock = {
        count: FLOCK_SIZE_MIN + Math.floor(Math.random() * (FLOCK_SIZE_VAR + 1)),
        dir,
        flap: 0,
        speed: SPEED_MIN + Math.random() * SPEED_VAR,
        x: dir === 1 ? -2 : this.cols + 2,
        y: 2 + Math.random() * Math.max(1, this.rows * 0.25),
      };
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (!this.flock) return;
    ctx.fillStyle = TONE;

    for (let i = 0; i < this.flock.count; i++) {
      const col = Math.round(this.flock.x - i * SPACING_COLS * this.flock.dir);
      const row = Math.round(this.flock.y + i * SPACING_ROWS);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      // neighbors flap out of phase so the string ripples
      const up = Math.floor(this.flock.flap / FLAP_SECONDS + i) % 2 === 0;
      ctx.fillText(up ? 'v' : '~', col * charW, (row + 1) * charH);
    }
  }
}
