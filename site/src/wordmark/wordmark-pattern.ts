import type { AsciiPattern } from '@asciitopia/core';

// --- letterforms ---

// 9-row glyph grid: row 0 = i-dot / t-ascender, rows 2-6 = x-height, rows 7-8 = descender.
const GLYPH_ROWS = 9;

const GLYPHS: Record<string, string[]> = {
  a: ['....', '....', '.##.', '...#', '.###', '#..#', '.###', '....', '....'],
  c: ['....', '....', '.###', '#...', '#...', '#...', '.###', '....', '....'],
  i: ['#', '.', '#', '#', '#', '#', '#', '.', '.'],
  o: ['....', '....', '.##.', '#..#', '#..#', '#..#', '.##.', '....', '....'],
  p: ['....', '....', '###.', '#..#', '#..#', '#..#', '###.', '#...', '#...'],
  s: ['....', '....', '.###', '#...', '.##.', '...#', '###.', '....', '....'],
  t: ['.#.', '.#.', '###', '.#.', '.#.', '.#.', '.##', '...', '...'],
};

const WORD = 'asciitopia';
const STACKED_LINES = ['ascii', 'topia'];
const LETTER_GAP = 1; // cols between glyphs
const LINE_GAP = 2; // rows between stacked lines

// --- animation constants ---

const RAMP = '░▒▓█'; // single material language: condensing density
const SWEEP_S = 0.5; // left-to-right settle sweep across the word
const JITTER_S = 0.3; // per-particle random delay on top of the sweep
const TRAVEL_S = 0.6; // flight time of one particle
const ASSEMBLE_S = SWEEP_S + JITTER_S + TRAVEL_S;
const CURSOR_PERIOD_S = 1.1; // matches the site's ▌ blink cadence
const CURSOR_ON_S = 0.62;
const FROZEN_T = 4.8; // field time used when reduced — chosen for even texture
const MAX_SCALE = 4;

// --- config ---

export interface WordmarkConfig {
  /** Glyph ink — any CSS color. The pattern paints nothing else. */
  ink: string;
  /** Play the particle fly-in on init; false starts settled. */
  assemble: boolean;
  /** Drift speed multiplier for the interior texture field. */
  flowSpeed: number;
  /** Trailing half-block cursor after the word. */
  cursor: boolean;
  /** Reduced motion: settled word, frozen texture, steady cursor. */
  reduced: boolean;
  /** Integer cell scale per letter pixel; 0 = auto-fit to the grid. */
  scale: number;
}

export const DEFAULT_WORDMARK_CONFIG: WordmarkConfig = {
  ink: '#eae7de',
  assemble: true,
  flowSpeed: 1,
  cursor: true,
  reduced: false,
  scale: 0,
};

// --- layout ---

interface Layout {
  pixels: { bx: number; by: number }[]; // filled letter pixels, layout-local coords
  cursor: { bx: number; by: number }[]; // cursor pixels (x-height of last line)
  w: number;
  h: number;
}

const measureLine = (line: string): number => {
  let w = 0;
  for (const ch of line) w += GLYPHS[ch][2].length + LETTER_GAP;
  return w - LETTER_GAP;
};

const layoutLines = (lines: string[]): Layout => {
  const widths = lines.map(measureLine);
  const w = Math.max(...widths);
  const h = lines.length * GLYPH_ROWS + (lines.length - 1) * LINE_GAP;
  const pixels: Layout['pixels'] = [];
  let lastEnd = 0;
  let lastTop = 0;

  lines.forEach((line, li) => {
    const top = li * (GLYPH_ROWS + LINE_GAP);
    let x = Math.floor((w - widths[li]) / 2);
    for (const ch of line) {
      const rows = GLYPHS[ch];
      for (let gy = 0; gy < GLYPH_ROWS; gy++) {
        for (let gx = 0; gx < rows[gy].length; gx++) {
          if (rows[gy][gx] === '#') pixels.push({ bx: x + gx, by: top + gy });
        }
      }
      x += rows[2].length + LETTER_GAP;
    }
    lastEnd = x; // one LETTER_GAP past the line's right edge
    lastTop = top;
  });

  // cursor: x-height column two cols after the last line, so it can't read as a letter
  const cursor: Layout['cursor'] = [];
  for (let gy = 2; gy <= 6; gy++) cursor.push({ bx: lastEnd + 1, by: lastTop + gy });

  return { pixels, cursor, w, h };
};

// --- pattern ---

export class WordmarkPattern implements AsciiPattern {
  private readonly config: WordmarkConfig;
  private t = 0;
  private scale = 1;
  private count = 0;
  // per-subcell state, allocated once in init
  private cellCol = new Int16Array(0);
  private cellRow = new Int16Array(0);
  private baseX = new Int16Array(0);
  private baseY = new Int16Array(0);
  private offCol = new Float32Array(0);
  private offRow = new Float32Array(0);
  private delay = new Float32Array(0);
  private phase = new Float32Array(0);
  private cursorCol = new Int16Array(0);
  private cursorRow = new Int16Array(0);

  constructor(config: Partial<WordmarkConfig> = {}) {
    this.config = { ...DEFAULT_WORDMARK_CONFIG, ...config };
  }

  init(cols: number, rows: number): void {
    this.t = this.config.reduced ? FROZEN_T : 0;

    const single = layoutLines([WORD]);
    const fit = (l: Layout): number =>
      Math.min(Math.floor((cols * 0.86) / l.w), Math.floor((rows * 0.7) / l.h), MAX_SCALE);
    // prefer one line; stack only when a single line can't fit at scale 1
    const layout = fit(single) >= 1 ? single : layoutLines(STACKED_LINES);
    const scale = this.config.scale > 0 ? this.config.scale : Math.max(1, fit(layout));
    this.scale = scale;

    // optical centering: nudge left by one letter pixel when the cursor adds weight on the right
    const cursorNudge = this.showCursor() ? scale : 0;
    const colOff = Math.floor((cols - layout.w * scale) / 2) - cursorNudge;
    const rowOff = Math.floor((rows - layout.h * scale) / 2);

    this.count = layout.pixels.length * scale * scale;
    this.cellCol = new Int16Array(this.count);
    this.cellRow = new Int16Array(this.count);
    this.baseX = new Int16Array(this.count);
    this.baseY = new Int16Array(this.count);
    this.offCol = new Float32Array(this.count);
    this.offRow = new Float32Array(this.count);
    this.delay = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);

    let i = 0;
    for (const { bx, by } of layout.pixels) {
      const pixelPhase = Math.random() * Math.PI * 2;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          this.cellCol[i] = colOff + bx * scale + sx;
          this.cellRow[i] = rowOff + by * scale + sy;
          this.baseX[i] = bx;
          this.baseY[i] = by;
          // flight start: random polar offset, widened on x so spread reads circular
          const angle = Math.random() * Math.PI * 2;
          const radius = 8 + Math.random() * 18;
          this.offCol[i] = Math.cos(angle) * radius * 1.7;
          this.offRow[i] = Math.sin(angle) * radius;
          this.delay[i] = (bx / layout.w) * SWEEP_S + Math.random() * JITTER_S;
          this.phase[i] = pixelPhase;
          i++;
        }
      }
    }

    // cursor subcells: left half of one scaled column, so it stays a ▌ at any scale
    const halfW = Math.ceil(scale / 2);
    const cursorCells = layout.cursor.length * halfW * scale;
    this.cursorCol = new Int16Array(cursorCells);
    this.cursorRow = new Int16Array(cursorCells);
    let j = 0;
    for (const { bx, by } of layout.cursor) {
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < halfW; sx++) {
          this.cursorCol[j] = colOff + bx * scale + sx;
          this.cursorRow[j] = rowOff + by * scale + sy;
          j++;
        }
      }
    }
  }

  update(dt: number): void {
    if (this.config.reduced) return; // frozen at FROZEN_T
    this.t += dt / 1000;
  }

  render(
    ctx: CanvasRenderingContext2D,
    _cols: number,
    _rows: number,
    charW: number,
    charH: number,
  ): void {
    ctx.fillStyle = this.config.ink;

    const assembling = this.config.assemble && !this.config.reduced && this.t < ASSEMBLE_S;
    if (assembling) this.renderAssembly(ctx, charW, charH);
    else this.renderSettled(ctx, charW, charH);

    if (this.showCursor() && !assembling && this.cursorVisible()) {
      for (let i = 0; i < this.cursorCol.length; i++) {
        ctx.fillText('█', this.cursorCol[i] * charW, (this.cursorRow[i] + 1) * charH);
      }
    }
  }

  // drifting waves of lighter density sweep through an otherwise solid word
  private fieldChar(i: number): string {
    const t = this.t * this.config.flowSpeed;
    const wave =
      Math.sin(this.baseX[i] * 0.45 - t * 1.9 + Math.sin(this.baseY[i] * 0.7 + t * 0.9) * 1.4) *
        0.5 +
      0.5;
    const sparkle = Math.sin(t * 2.1 + this.phase[i]) * 0.5 + 0.5;
    const v = wave * 0.8 + sparkle * 0.2;
    if (v < 0.55) return '█';
    if (v < 0.8) return '▓';
    if (v < 0.93) return '▒';
    return this.scale > 1 ? '░' : '▒'; // 1-cell strokes can't afford the lightest glyph
  }

  private renderSettled(ctx: CanvasRenderingContext2D, charW: number, charH: number): void {
    for (let i = 0; i < this.count; i++) {
      ctx.fillText(this.fieldChar(i), this.cellCol[i] * charW, (this.cellRow[i] + 1) * charH);
    }
  }

  private renderAssembly(ctx: CanvasRenderingContext2D, charW: number, charH: number): void {
    for (let i = 0; i < this.count; i++) {
      const p = (this.t - this.delay[i]) / TRAVEL_S;
      if (p <= 0) continue;

      if (p >= 1) {
        ctx.fillText(this.fieldChar(i), this.cellCol[i] * charW, (this.cellRow[i] + 1) * charH);
        continue;
      }

      // ease-out flight; the particle condenses ░→▒→▓→█ as it arrives
      const ease = 1 - (1 - p) ** 3;
      const col = Math.round(this.cellCol[i] + this.offCol[i] * (1 - ease));
      const row = Math.round(this.cellRow[i] + this.offRow[i] * (1 - ease));
      ctx.globalAlpha = 0.25 + 0.75 * p;
      ctx.fillText(RAMP[Math.min(3, Math.floor(p * 4))], col * charW, (row + 1) * charH);
      ctx.globalAlpha = 1;
    }
  }

  // a cursor that can't blink reads as a stray letter — reduced mode drops it
  private showCursor(): boolean {
    return this.config.cursor && !this.config.reduced;
  }

  private cursorVisible(): boolean {
    return this.t % CURSOR_PERIOD_S < CURSOR_ON_S;
  }
}
