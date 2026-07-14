import type { SceneAnchors, WeatherSystem } from '../types.js';

// Storm lightning: a random-walk bolt from the cloud deck to the ground with
// a couple of side branches; bright strike, brief afterglow.

const STRIKE_WAIT_MIN = 4; // seconds between strikes
const STRIKE_WAIT_VAR = 8;
const FLASH_SECONDS = 0.14;
const GLOW_SECONDS = 0.32;
const BRANCH_CHANCE = 0.16; // per bolt row
const MAX_BRANCHES = 2;
const BRANCH_LEN_MIN = 3;
const BRANCH_LEN_VAR = 4;

const FLASH_TONE = '#f2f0ff';
const GLOW_TONE = '#8a86b8';

interface BoltCell {
  char: string;
  col: number;
  row: number;
}

const glyphFor = (dx: number): string => (dx < 0 ? '/' : dx > 0 ? '\\' : '|');

export class LightningSystem implements WeatherSystem {
  private cols = 0;
  private bolt: BoltCell[] = [];
  private wait = STRIKE_WAIT_MIN;
  private flash = 0; // seconds remaining

  constructor(private readonly anchors: SceneAnchors) {}

  init(cols: number, _rows: number): void {
    this.cols = cols;
    this.bolt = [];
    this.flash = 0;
    this.wait = STRIKE_WAIT_MIN + Math.random() * STRIKE_WAIT_VAR;
  }

  /** True during the bright part of a strike — the pattern washes the canvas. */
  isFlashing(): boolean {
    return this.flash > GLOW_SECONDS;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    if (this.flash > 0) {
      this.flash -= dtSec;
      if (this.flash <= 0) this.bolt = [];
      return;
    }
    this.wait -= dtSec;
    if (this.wait <= 0) {
      this.wait = STRIKE_WAIT_MIN + Math.random() * STRIKE_WAIT_VAR;
      this.strike();
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (this.flash <= 0) return;
    ctx.fillStyle = this.isFlashing() ? FLASH_TONE : GLOW_TONE;
    for (const cell of this.bolt) {
      if (cell.col < 0 || cell.col >= cols || cell.row < 0 || cell.row >= rows) continue;
      ctx.fillText(cell.char, cell.col * charW, (cell.row + 1) * charH);
    }
  }

  private strike(): void {
    const ground = this.anchors.groundRow;
    if (ground < 6 || this.cols < 8) return;

    this.bolt = [];
    this.flash = FLASH_SECONDS + GLOW_SECONDS;
    let col = Math.floor(this.cols * (0.1 + Math.random() * 0.8));
    let branches = 0;

    for (let row = 1; row < ground; row++) {
      const dx = Math.floor(Math.random() * 3) - 1;
      col = Math.max(1, Math.min(this.cols - 2, col + dx));
      this.bolt.push({ char: glyphFor(dx), col, row });

      if (branches < MAX_BRANCHES && row > 2 && Math.random() < BRANCH_CHANCE) {
        branches++;
        this.branch(col, row, ground);
      }
    }
  }

  private branch(fromCol: number, fromRow: number, ground: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const length = BRANCH_LEN_MIN + Math.floor(Math.random() * BRANCH_LEN_VAR);
    let col = fromCol;
    for (let i = 1; i <= length; i++) {
      const row = fromRow + i;
      if (row >= ground) break;
      const dx = Math.random() < 0.7 ? side : 0;
      col += dx;
      this.bolt.push({ char: glyphFor(dx), col, row });
    }
  }
}
