import type { WeatherData, WeatherSystem } from '../types.js';

// A small plane crosses high up once in a while. By day you see the airframe;
// at night just its lights — a steady white and a blinking beacon.

const PASS_WAIT_MIN = 24; // seconds between passes
const PASS_WAIT_VAR = 50;
const SPEED_MIN = 9; // cols/sec
const SPEED_VAR = 5;
const BEACON_SECONDS = 0.45;

// original sprite, one per heading
const PLANE_RIGHT: readonly string[] = ['    _/|_____', '.:=[________\\>', '      \\|'];
const PLANE_LEFT: readonly string[] = ['   _____|\\_', '</________]=:.', '     |/'];

const BODY_TONE = '#7e848e';
const BEACON_TONE = '#d86a5a';
const LIGHT_TONE = '#e8e8e0';

interface Pass {
  dir: 1 | -1;
  t: number;
  x: number;
  y: number;
}

export class AirplaneSystem implements WeatherSystem {
  private pass: Pass | null = null;
  private wait = PASS_WAIT_MIN;
  private speed = SPEED_MIN;
  private cols = 0;
  private rows = 0;
  private night = true;

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.pass = null;
    this.wait = (PASS_WAIT_MIN + Math.random() * PASS_WAIT_VAR) * 0.3; // first pass sooner
  }

  configure(weather: WeatherData): void {
    this.night = !weather.isDay;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    const width = PLANE_RIGHT[0].length;

    if (this.pass) {
      this.pass.x += this.speed * this.pass.dir * dtSec;
      this.pass.t += dtSec;
      if (
        (this.pass.dir === 1 && this.pass.x > this.cols + 2) ||
        (this.pass.dir === -1 && this.pass.x < -width - 2)
      ) {
        this.pass = null;
      }
      return;
    }

    this.wait -= dtSec;
    if (this.wait <= 0 && this.rows >= 16 && this.cols >= 40) {
      this.wait = PASS_WAIT_MIN + Math.random() * PASS_WAIT_VAR;
      this.speed = SPEED_MIN + Math.random() * SPEED_VAR;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      this.pass = {
        dir,
        t: 0,
        x: dir === 1 ? -width - 2 : this.cols + 2,
        y: 1 + Math.random() * Math.max(1, this.rows * 0.12),
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
    if (!this.pass) return;
    const left = Math.round(this.pass.x);
    const top = Math.round(this.pass.y);
    const sprite = this.pass.dir === 1 ? PLANE_RIGHT : PLANE_LEFT;
    const width = sprite[0].length;

    if (this.night) {
      // nose light steady, tail beacon blinking
      const beaconOn = Math.floor(this.pass.t / BEACON_SECONDS) % 2 === 0;
      const noseCol = this.pass.dir === 1 ? left + width - 1 : left;
      const tailCol = this.pass.dir === 1 ? left : left + width - 1;
      const row = top + 1;
      if (row >= 0 && row < rows) {
        if (noseCol >= 0 && noseCol < cols) {
          ctx.fillStyle = LIGHT_TONE;
          ctx.fillText('*', noseCol * charW, (row + 1) * charH);
        }
        if (beaconOn && tailCol >= 0 && tailCol < cols) {
          ctx.fillStyle = BEACON_TONE;
          ctx.fillText('+', tailCol * charW, (row + 1) * charH);
        }
      }
      return;
    }

    ctx.fillStyle = BODY_TONE;
    for (let r = 0; r < sprite.length; r++) {
      const row = top + r;
      if (row < 0 || row >= rows) continue;
      const line = sprite[r];
      for (let c = 0; c < line.length; c++) {
        if (line[c] === ' ') continue;
        const col = left + c;
        if (col < 0 || col >= cols) continue;
        ctx.fillText(line[c], col * charW, (row + 1) * charH);
      }
    }
  }
}
