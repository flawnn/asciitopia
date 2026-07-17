// Inspired by cbonsai by John Allbritten (https://gitlab.com/jallbrit/cbonsai).
// Growth model, art, and constants are original to asciitopia.
import { createNoise2D } from 'simplex-noise';
import type { AsciiPattern } from '../types.js';

// --- config ---

export type BonsaiPalette = 'classic' | 'sakura' | 'mono';
export type BonsaiPot = 'ridge' | 'saucer' | 'plinth';

export interface BonsaiConfig {
  /** Leaf highlight color (classic palette). */
  brightLeaf: string;
  /** Young wood / tip color (classic palette). */
  brightWood: string;
  /** Base leaf color (classic palette). */
  darkLeaf: string;
  /** Trunk wood color (classic palette). */
  darkWood: string;
  /** Limb growth steps per second; scales the whole growth tempo. ~0.6 ≈ a minute+ to maturity. */
  growthSpeed: number;
  /** Seconds of full canopy before autumn begins (when seasons is on). */
  holdDuration: number;
  /** -1 to +1 — windswept lean of the whole garden. */
  lean: number;
  palette: BonsaiPalette;
  pot: BonsaiPot;
  /** Cycle summer → autumn → shedding → winter → spring; seeds sprout new trees. */
  seasons: boolean;
  /** 0–1 — how far limbs reach toward horizontal. */
  sprawl: number;
  /** Max living trees; 0 = auto from grid width. The first tree grows in the pot. */
  treeCount: number;
  /** Trunk energy budget in growth steps; edge trees and seedlings get a fraction. */
  vitality: number;
}

export const DEFAULT_BONSAI_CONFIG: BonsaiConfig = {
  brightLeaf: '#4abb4a',
  brightWood: '#d4a017',
  darkLeaf: '#2d8a2d',
  darkWood: '#8b6914',
  growthSpeed: 0.6,
  holdDuration: 45,
  lean: 0.15,
  palette: 'classic',
  pot: 'plinth',
  seasons: true,
  sprawl: 0.8,
  treeCount: 0,
  vitality: 30,
};

// --- palettes ---

interface PaletteDef {
  autumn: readonly string[];
  leafBody: string;
  leafCore: string;
  leafFringe: string;
  moss: string;
  petal: string;
  potAccent: string;
  potBody: string;
  sand: string;
  sandBright: string;
  soil: string;
  stone: string;
  woodDark: string;
  woodLight: string;
}

const PALETTES: Record<BonsaiPalette, PaletteDef> = {
  classic: {
    autumn: ['#d2691e', '#b3452c', '#daa520', '#c9702a', '#8f3b1f'],
    leafBody: '#4abb4a',
    leafCore: '#2d8a2d',
    leafFringe: '#5cd35c',
    moss: '#3d7a35',
    petal: '#d8a8c0',
    potAccent: '#b5825a',
    potBody: '#7a5236',
    sand: '#262c33',
    sandBright: '#3d4650',
    soil: '#584232',
    stone: '#4a525c',
    woodDark: '#8b6914',
    woodLight: '#d4a017',
  },
  mono: {
    autumn: ['#9a9a9a', '#7e7e7e', '#b0b0b0', '#6a6a6a'],
    leafBody: '#c0c0c0',
    leafCore: '#a0a0a0',
    leafFringe: '#e8e8e8',
    moss: '#6a6a6a',
    petal: '#d0d0d0',
    potAccent: '#909090',
    potBody: '#606060',
    sand: '#23272b',
    sandBright: '#3a4046',
    soil: '#505050',
    stone: '#565b61',
    woodDark: '#787878',
    woodLight: '#a8a8a8',
  },
  sakura: {
    autumn: ['#c46a8e', '#a34e74', '#d98aa8', '#8e3f60'],
    leafBody: '#e895bd',
    leafCore: '#d977a8',
    leafFringe: '#f7c6dc',
    moss: '#707a5c',
    petal: '#ffd7e8',
    potAccent: '#8d8478',
    potBody: '#5c564d',
    sand: '#262a2c',
    sandBright: '#3e4448',
    soil: '#4a443c',
    stone: '#4e5459',
    woodDark: '#5e4a3a',
    woodLight: '#8a6f56',
  },
};

// --- growth tuning (chosen by eye in the playground) ---

const MAX_GEN = 2; // trunk → limb → twig
const CURVE_AMP = [0.13, 0.24, 0.34]; // meander radians per step, by generation
const BIAS_PULL = [0.06, 0.16, 0.17]; // heading pull toward bias per step, by generation
const PHASE_SPEED_MIN = 0.24;
const PHASE_SPEED_VAR = 0.18;
const DROOP_LIMIT = 0.25; // radians past horizontal a limb may sag

const FORK_THRESHOLD = 2.6;
const FORK_CHARGE_MIN = 0.35;
const FORK_CHARGE_VAR = 0.5;
const MIN_FORK_ENERGY = 6;
const TWIG_ENERGY_RATIO = 0.5; // limb (gen 1) ratio scales with sprawl instead
const CHILD_MAX_ENERGY = 16;
const CHILD_MIN_ENERGY = 3;
const FORK_SPREAD_MIN = 0.55; // radians between parent heading and child heading
const FORK_SPREAD_VAR = 0.55;

const GIRTH_FRACTION = 0.24; // fraction of trunk steps stamped three cells wide
const TAPER_FRACTION = 0.52; // fraction of trunk steps at least two cells wide
const KNOT_CHANCE = 0.05;
const UP = -Math.PI / 2;

// foliage and thickening cells materialize a few at a time, not per-tick
const SPROUT_RATE_FACTOR = 10; // queue cells/sec per unit of growthSpeed

// --- edge trees (permanent residents beside the potted centerpiece) ---

const EDGE_DELAY_MIN_MS = 5000;
const EDGE_DELAY_VAR_MS = 13000;
const EDGE_SPACING_FRAC = 0.15;
const EDGE_LIFE_MIN = 0.5;
const EDGE_LIFE_VAR = 0.25;
const EDGE_LEAN_VAR = 0.5; // every resident leans its own way

// --- seasons (seconds) ---

type Season = 'growing' | 'summer' | 'autumn' | 'shedding' | 'winter' | 'spring';

const AUTUMN_DURATION = 25;
const SHED_DURATION = 30;
const WINTER_DURATION = 20;
const SPRING_DURATION = 25;
const DRY_LEAF_CHAR = '*';
const DRY_LEAF_CHANCE = 0.35;

const LEAF_FALL_CHANCE = 0.3; // shed cells that become drifting leaves
const MAX_FALLING = 12;

// --- generations ---

const SEED_INTERVAL_MS = 7000; // between seed drops in autumn/shedding, + jitter
const SEED_INTERVAL_VAR_MS = 6000;
const MAX_SEED_SITES = 3;
const SEED_CHAR = '.';
const SPROUT_VITALITY_MIN = 0.4; // fraction of configured vitality
const SPROUT_VITALITY_VAR = 0.15;
const SPROUT_SPACING_FRAC = 0.12; // min distance to a living tree, fraction of cols
const RETIRE_RATE = 6; // cells/sec a retiring tree dissolves at

const MOSS_INTERVAL_MS = 12000;
const MOSS_PER_TREE = 4;
const MOSS_CHARS = ',."';

// --- karesansui layer ---

const SAND_GLYPHS = ' -~.()';
const RAKE_INTERVAL_MIN_MS = 60000;
const RAKE_INTERVAL_VAR_MS = 30000;
const RAKE_SPEED = 6; // cols/sec the invisible rake sweeps at
const RAKE_GLOW_DECAY = 0.25; // glow/sec fade behind the rake
const RING_SPACING = 2.6; // sand rings around stones
const RING_REACH = 8;

const MAX_PETALS = 4;
const PETAL_CHAR = '·';
const PETAL_INTERVAL_MS = 26000;
const PETAL_INTERVAL_VAR_MS = 14000;
const PETAL_SPRING_INTERVAL_MS = 9000;

const WIND_SPEED = 0.12; // noise-field scroll per second
const WIND_THRESHOLD = 0.62; // gust strength that shimmers a leaf

// --- types ---

interface Cell {
  char: string;
  color: string;
  leaf: boolean;
  tree: number;
}

interface Limb {
  bias: number;
  charge: number;
  energy: number;
  gen: number;
  girth: number;
  heading: number;
  phase: number;
  phaseSpeed: number;
  side: 1 | -1;
  total: number;
  tree: number;
  x: number;
  y: number;
}

interface Tree {
  id: number;
  permanent: boolean;
  x: number;
}

interface PendingTree {
  delayMs: number;
  lean: number;
  vitality: number;
  x: number;
}

interface QueuedCell {
  char: string;
  col: number;
  color: string;
  leaf: boolean;
  row: number;
  tree: number;
}

interface LeafCell {
  char: string;
  col: number;
  color: string;
  row: number;
  tree: number;
}

interface Drift {
  char: string;
  color: string;
  phase: number;
  phaseSpeed: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface Retirement {
  cells: { col: number; row: number }[];
  tree: number;
}

interface Tuft {
  char: string;
  col: number;
}

interface StoneCell {
  char: string;
  col: number;
  row: number;
}

interface SandRowParams {
  fill: number;
  glyph: number;
  period: number;
  phase: number;
}

interface PotLine {
  text: string;
  tone: 'accent' | 'body' | 'soil';
}

// --- helpers ---

const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Removes elements failing keep() in place — steady-state loops stay allocation-free. */
const compact = <T>(arr: T[], keep: (item: T) => boolean): void => {
  let write = 0;
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i])) arr[write++] = arr[i];
  }
  arr.length = write;
};

const brighten = (hex: string): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  const lift = (v: number) => Math.min(255, Math.round(v * 1.3 + 24));
  return `rgb(${lift((n >> 16) & 255)},${lift((n >> 8) & 255)},${lift(n & 255)})`;
};

const buildPot = (style: BonsaiPot, inner: number): PotLine[] => {
  switch (style) {
    case 'saucer':
      return [
        { text: `.-~${'='.repeat(inner)}~-.`, tone: 'accent' },
        { text: ` '-.${'_'.repeat(inner - 2)}.-'`, tone: 'body' },
        {
          text: `${' '.repeat(Math.floor(inner / 4) + 2)}(${'_'.repeat(inner - 2 * Math.floor(inner / 4))})`,
          tone: 'body',
        },
      ];
    case 'plinth':
      return [
        { text: `+${'-'.repeat(inner + 2)}+`, tone: 'accent' },
        { text: `|${':'.repeat(inner + 2)}|`, tone: 'body' },
        { text: `+${'-'.repeat(inner + 2)}+`, tone: 'accent' },
        { text: ` ${'~,'.repeat(Math.floor(inner / 2) + 1)}`, tone: 'soil' },
      ];
    default:
      return [
        { text: `,-${'='.repeat(inner)}-,`, tone: 'accent' },
        { text: `|${':'.repeat(inner + 2)}|`, tone: 'body' },
        { text: `'${'='.repeat(inner + 2)}'`, tone: 'accent' },
        { text: `   [__]${' '.repeat(Math.max(0, inner - 10))}[__]`, tone: 'body' },
      ];
  }
};

// --- pattern ---

export class BonsaiPattern implements AsciiPattern {
  private config: BonsaiConfig;
  private classicPal: PaletteDef;
  private cols = 0;
  private rows = 0;
  private grid: (Cell | null)[][] = [];
  private limbs: Limb[] = [];
  private trees: Tree[] = [];
  private treeSeq = 0;
  private pending: PendingTree[] = [];
  private accumulator = 0;
  private sproutQueue: QueuedCell[] = [];
  private sproutCarry = 0;
  private season: Season = 'growing';
  private seasonTimer = 0;
  private leafCells: LeafCell[] = [];
  private leafOrder: number[] = [];
  private leafProgress = 0;
  private falling: Drift[] = [];
  private seeds: Drift[] = [];
  private seedSites: number[] = [];
  private seedTimer = 0;
  private retiring: Retirement[] = [];
  private retireCarry = 0;
  private tufts: Tuft[] = [];
  private mossTimer = 0;
  private potLines: PotLine[] = [];
  private potLeft = 0;
  private potTop = 0;
  private potWidth = 0;
  // karesansui
  private sandRows = 0;
  private sandTop = 0;
  private sandChar = new Uint8Array(0);
  private sandFixed = new Uint8Array(0);
  private sandGlow = new Float32Array(0);
  private sandParams: SandRowParams[] = [];
  private rakeFront = 0;
  private rakeEnd = 0;
  private rakeTimer = 0;
  private stones: StoneCell[] = [];
  private petals: Drift[] = [];
  private petalTimer = 0;
  private windT = 0;
  private noise2D = createNoise2D();
  private brightCache = new Map<string, string>();

  constructor(config: Partial<BonsaiConfig> = {}) {
    this.config = { ...DEFAULT_BONSAI_CONFIG, ...config };
    // the classic preset takes its wood/leaf colors from the config knobs
    this.classicPal = {
      ...PALETTES.classic,
      leafBody: this.config.brightLeaf,
      leafCore: this.config.darkLeaf,
      woodDark: this.config.darkWood,
      woodLight: this.config.brightWood,
    };
  }

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.accumulator = 0;
    this.sproutQueue = [];
    this.sproutCarry = 0;
    this.season = 'growing';
    this.seasonTimer = 0;
    this.leafCells = [];
    this.leafOrder = [];
    this.leafProgress = 0;
    this.falling = [];
    this.seeds = [];
    this.seedSites = [];
    this.seedTimer = SEED_INTERVAL_MS;
    this.retiring = [];
    this.retireCarry = 0;
    this.tufts = [];
    this.mossTimer = 0;
    this.petals = [];
    this.petalTimer = PETAL_INTERVAL_MS * Math.random();
    this.windT = 0;
    this.grid = Array.from({ length: rows }, () =>
      Array.from<Cell | null>({ length: cols }).fill(null),
    );
    this.limbs = [];
    this.trees = [];
    this.treeSeq = 0;
    this.pending = [];
    this.buildPotArt();
    this.seedInitialTrees();
    this.buildGarden();
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    this.windT += dtSec * WIND_SPEED;
    this.promotePending(dt);

    // growth ticks in every season so spring sprouts keep growing
    this.accumulator += dt;
    const interval = 1000 / Math.max(0.05, this.config.growthSpeed);
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      this.growTick();
    }
    this.fillSprouts(dtSec);
    this.updateDrifts(dtSec);
    this.updatePetals(dt, dtSec);
    this.updateRake(dt, dtSec);
    this.processRetirement(dtSec);
    this.updateMoss(dt);

    switch (this.season) {
      case 'growing': {
        if (this.limbs.length === 0 && this.sproutQueue.length === 0 && this.pending.length === 0)
          this.enterSeason('summer');
        break;
      }
      case 'summer': {
        if (!this.config.seasons) break;
        this.seasonTimer += dtSec;
        if (this.seasonTimer >= this.config.holdDuration) this.enterSeason('autumn');
        break;
      }
      case 'autumn': {
        this.seasonTimer += dtSec;
        this.dropSeeds(dt);
        // each leaf takes its own random warm color — the speckled turning
        this.sweepLeaves(AUTUMN_DURATION, (leaf) => {
          const cell = this.grid[leaf.row][leaf.col];
          if (!cell?.leaf) return;
          cell.color = this.pal().autumn[Math.floor(Math.random() * this.pal().autumn.length)];
          if (Math.random() < DRY_LEAF_CHANCE) cell.char = DRY_LEAF_CHAR;
        });
        if (this.seasonTimer >= AUTUMN_DURATION) this.enterSeason('shedding');
        break;
      }
      case 'shedding': {
        this.seasonTimer += dtSec;
        this.dropSeeds(dt);
        this.sweepLeaves(SHED_DURATION, (leaf) => {
          const cell = this.grid[leaf.row][leaf.col];
          if (!cell?.leaf) return;
          this.grid[leaf.row][leaf.col] = null;
          if (this.falling.length < MAX_FALLING && Math.random() < LEAF_FALL_CHANCE) {
            this.falling.push(this.makeDrift(leaf.col, leaf.row, cell.char, cell.color, false));
          }
        });
        if (this.seasonTimer >= SHED_DURATION) this.enterSeason('winter');
        break;
      }
      case 'winter': {
        this.seasonTimer += dtSec;
        if (this.seasonTimer >= WINTER_DURATION) this.enterSeason('spring');
        break;
      }
      case 'spring': {
        this.seasonTimer += dtSec;
        // leaves return one by one in their original green
        this.sweepLeaves(SPRING_DURATION, (leaf) => {
          if (!this.grid[leaf.row][leaf.col] && this.isAlive(leaf.tree)) {
            this.grid[leaf.row][leaf.col] = {
              char: leaf.char,
              color: leaf.color,
              leaf: true,
              tree: leaf.tree,
            };
          }
        });
        if (this.seasonTimer >= SPRING_DURATION) this.enterSeason('summer');
        break;
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
    const pal = this.pal();

    this.renderSand(ctx, cols, rows, charW, charH);
    ctx.fillStyle = pal.stone;
    for (const s of this.stones) {
      if (s.col >= 0 && s.col < cols && s.row >= 0 && s.row < rows)
        ctx.fillText(s.char, s.col * charW, (s.row + 1) * charH);
    }
    this.renderPot(ctx, cols, rows, charW, charH);
    this.renderGroundLife(ctx, cols, rows, charW, charH);

    for (let row = 0; row < rows && row < this.grid.length; row++) {
      const line = this.grid[row];
      for (let col = 0; col < cols && col < line.length; col++) {
        const cell = line[col];
        if (!cell) continue;
        // a slow noise gust brightens leaves as it passes — the trees breathe
        if (cell.leaf) {
          const gust = this.noise2D(col * 0.06 - this.windT * 10, row * 0.12 + this.windT * 3);
          ctx.fillStyle = gust > WIND_THRESHOLD ? this.bright(cell.color) : cell.color;
        } else {
          ctx.fillStyle = cell.color;
        }
        ctx.fillText(cell.char, col * charW, (row + 1) * charH);
      }
    }

    for (const d of this.falling) this.renderDrift(ctx, d, cols, rows, charW, charH);
    for (const d of this.seeds) this.renderDrift(ctx, d, cols, rows, charW, charH);
    ctx.fillStyle = pal.petal;
    for (const d of this.petals) {
      const col = Math.round(d.x);
      const row = Math.round(d.y);
      if (col >= 0 && col < cols && row >= 0 && row < rows)
        ctx.fillText(PETAL_CHAR, col * charW, (row + 1) * charH);
    }
  }

  // --- palette ---

  private pal(): PaletteDef {
    return this.config.palette === 'classic' ? this.classicPal : PALETTES[this.config.palette];
  }

  private bright(color: string): string {
    let b = this.brightCache.get(color);
    if (!b) {
      b = color.startsWith('#') ? brighten(color) : color;
      this.brightCache.set(color, b);
    }
    return b;
  }

  // --- pot ---

  private buildPotArt(): void {
    const inner = Math.max(12, Math.min(30, Math.round(this.cols * 0.24)));
    const lines = buildPot(this.config.pot, inner);
    const wide = Math.max(...lines.map((l) => l.text.length));

    // pot is skipped entirely on grids too small to hold it
    if (this.rows < lines.length + 8 || this.cols < wide + 2) {
      this.potLines = [];
      this.potWidth = 0;
      return;
    }
    this.potLines = lines;
    this.potWidth = wide;
    this.potTop = this.rows - lines.length;
    this.potLeft = Math.floor(this.cols / 2) - Math.floor(wide / 2);
  }

  private renderPot(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const pal = this.pal();
    const tones = { accent: pal.potAccent, body: pal.potBody, soil: pal.soil };

    for (let i = 0; i < this.potLines.length; i++) {
      const row = this.potTop + i;
      if (row < 0 || row >= rows) continue;
      const { text, tone } = this.potLines[i];
      ctx.fillStyle = tones[tone];
      for (let j = 0; j < text.length; j++) {
        const char = text[j];
        if (char === ' ') continue;
        const col = this.potLeft + j;
        if (col < 0 || col >= cols) continue;
        ctx.fillText(char, col * charW, (row + 1) * charH);
      }
    }
  }

  private renderGroundLife(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const pal = this.pal();
    const groundY = rows * charH;

    ctx.fillStyle = pal.moss;
    for (const tuft of this.tufts) {
      if (tuft.col >= 0 && tuft.col < cols) ctx.fillText(tuft.char, tuft.col * charW, groundY);
    }
    ctx.fillStyle = pal.woodLight;
    for (const col of this.seedSites) {
      if (col >= 0 && col < cols) ctx.fillText(SEED_CHAR, col * charW, groundY);
    }
  }

  private renderDrift(
    ctx: CanvasRenderingContext2D,
    d: Drift,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const col = Math.round(d.x);
    const row = Math.round(d.y);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    ctx.fillStyle = d.color;
    ctx.fillText(d.char, col * charW, (row + 1) * charH);
  }

  // --- karesansui: sand, rake, stones ---

  private buildGarden(): void {
    this.sandRows = this.rows >= 14 ? 3 : this.rows >= 8 ? 2 : 0;
    this.sandTop = this.rows - this.sandRows;
    const n = this.sandRows * this.cols;
    this.sandChar = new Uint8Array(n);
    this.sandFixed = new Uint8Array(n);
    this.sandGlow = new Float32Array(n);
    this.rakeFront = 0;
    this.rakeEnd = 0;
    this.rakeTimer = RAKE_INTERVAL_MIN_MS * (0.7 + Math.random() * 0.5);
    this.stones = [];
    if (this.sandRows === 0) return;

    this.sandParams = Array.from({ length: this.sandRows }, () => this.makeSandRow());
    for (let r = 0; r < this.sandRows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.sandChar[r * this.cols + c] = this.sandGlyph(c, this.sandParams[r]);
      }
    }
    this.placeStones();
  }

  private makeSandRow(): SandRowParams {
    return {
      fill: 4 + Math.floor(Math.random() * 3),
      glyph: Math.random() < 0.6 ? 1 : 2, // '-' or '~'
      period: 7 + Math.floor(Math.random() * 4),
      phase: Math.floor(Math.random() * 16),
    };
  }

  private sandGlyph(col: number, p: SandRowParams): number {
    const pos = (col + p.phase) % p.period;
    if (pos < p.fill) return p.glyph;
    return pos === p.fill + 1 && col % 5 === 0 ? 3 : 0; // lone '.' grains in the gaps
  }

  private placeStones(): void {
    if (this.cols < 40 || this.sandRows < 2) return;
    const count = this.cols >= 90 ? 2 : 1;
    const shapes: string[][] = [
      [' oOo', 'oOOOo'],
      ['oO', 'OOo'],
    ];

    const centers: number[] = [];
    for (let s = 0; s < count; s++) {
      let x = -1;
      // wabi-sabi: random, off-center, clear of pot, trees, and other stones
      for (let attempt = 0; attempt < 24; attempt++) {
        const candidate = Math.floor(this.cols * (0.06 + Math.random() * 0.88));
        const clearPot =
          this.potWidth === 0 ||
          candidate < this.potLeft - 7 ||
          candidate > this.potLeft + this.potWidth + 7;
        const clearTrees =
          !this.trees.some((t) => Math.abs(t.x - candidate) < 9) &&
          !this.pending.some((t) => Math.abs(t.x - candidate) < 9);
        const clearStones = !centers.some((cx) => Math.abs(cx - candidate) < 18);
        if (clearPot && clearTrees && clearStones) {
          x = candidate;
          break;
        }
      }
      if (x < 0) continue;
      centers.push(x);

      const shape = shapes[s % shapes.length];
      const topRow = this.sandTop - (shape.length - 1);
      for (let r = 0; r < shape.length; r++) {
        const line = shape[r];
        const left = x - Math.floor(line.length / 2);
        for (let c = 0; c < line.length; c++) {
          if (line[c] !== ' ') this.stones.push({ char: line[c], col: left + c, row: topRow + r });
        }
      }
      this.rakeRings(x);
    }
  }

  /** Concentric rake hints curving around a stone. */
  private rakeRings(stoneX: number): void {
    for (let r = 0; r < this.sandRows; r++) {
      for (let dc = -RING_REACH; dc <= RING_REACH; dc++) {
        const col = stoneX + dc;
        if (col < 0 || col >= this.cols) continue;
        const dy = r * 2.1;
        const d = Math.sqrt(dc * dc + dy * dy);
        if (d > RING_REACH) continue;
        const idx = r * this.cols + col;
        this.sandFixed[idx] = 1;
        if (d < 2) {
          this.sandChar[idx] = 0; // clear directly under the stone
        } else if (d % RING_SPACING < 0.7) {
          this.sandChar[idx] = dc < 0 ? 4 : 5; // '(' left of the stone, ')' right
        } else {
          this.sandChar[idx] = 0;
        }
      }
    }
  }

  private updateRake(dt: number, dtSec: number): void {
    if (this.sandRows === 0) return;

    // glow fades behind the rake
    for (let i = 0; i < this.sandGlow.length; i++) {
      if (this.sandGlow[i] > 0)
        this.sandGlow[i] = Math.max(0, this.sandGlow[i] - RAKE_GLOW_DECAY * dtSec);
    }

    if (this.rakeFront < this.rakeEnd) {
      const next = Math.min(this.rakeEnd, this.rakeFront + RAKE_SPEED * dtSec);
      // redraw every column the front passed this frame
      for (let col = Math.ceil(this.rakeFront); col < next; col++) {
        if (col < 0 || col >= this.cols) continue;
        for (let r = 0; r < this.sandRows; r++) {
          const idx = r * this.cols + col;
          if (this.sandFixed[idx]) continue; // the rake curves around the stones
          this.sandChar[idx] = this.sandGlyph(col, this.sandParams[r]);
          this.sandGlow[idx] = 1;
        }
      }
      this.rakeFront = next;
      return;
    }

    this.rakeTimer -= dt;
    if (this.rakeTimer > 0) return;
    this.rakeTimer = RAKE_INTERVAL_MIN_MS + Math.random() * RAKE_INTERVAL_VAR_MS;
    // a monk redraws one stretch of the garden, left to right
    const width = Math.min(this.cols, 30 + Math.floor(Math.random() * 30));
    this.rakeFront = Math.floor(Math.random() * Math.max(1, this.cols - width));
    this.rakeEnd = this.rakeFront + width;
    this.sandParams = Array.from({ length: this.sandRows }, () => this.makeSandRow());
  }

  private renderSand(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    if (this.sandRows === 0) return;
    const pal = this.pal();

    for (let r = 0; r < this.sandRows; r++) {
      const row = this.sandTop + r;
      if (row < 0 || row >= rows) continue;
      const y = (row + 1) * charH;
      for (let c = 0; c < cols && c < this.cols; c++) {
        const idx = r * this.cols + c;
        const glyph = this.sandChar[idx];
        if (glyph === 0) continue;
        ctx.fillStyle = this.sandGlow[idx] > 0.05 ? pal.sandBright : pal.sand;
        ctx.fillText(SAND_GLYPHS[glyph], c * charW, y);
      }
    }
  }

  // --- petals on the wind ---

  private updatePetals(dt: number, dtSec: number): void {
    for (const d of this.petals) {
      d.phase += d.phaseSpeed * dtSec;
      d.x += d.vx * dtSec;
      d.y += (Math.sin(d.phase) * 0.5 + d.vy) * dtSec;
    }
    compact(this.petals, (d) => d.x < this.cols && d.y < this.sandTop + 1);

    if (this.rows < 10 || this.cols < 30) return;
    this.petalTimer -= dt;
    if (this.petalTimer > 0 || this.petals.length >= MAX_PETALS) return;
    const base = this.season === 'spring' ? PETAL_SPRING_INTERVAL_MS : PETAL_INTERVAL_MS;
    this.petalTimer = base + Math.random() * PETAL_INTERVAL_VAR_MS;
    this.petals.push({
      char: PETAL_CHAR,
      color: '',
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 1 + Math.random(),
      vx: 2 + Math.random() * 1.5 + this.config.lean * 2,
      vy: 0.15 + Math.random() * 0.25,
      x: -1,
      y: 2 + Math.random() * this.rows * 0.45,
    });
  }

  // --- trees & growth ---

  private effectiveVitality(vitality: number): number {
    return Math.max(4, Math.min(vitality, Math.floor(this.rows * 0.75)));
  }

  private maxTrees(): number {
    if (this.config.treeCount > 0) return this.config.treeCount;
    return this.cols < 80 ? 3 : this.cols < 140 ? 5 : this.cols < 200 ? 6 : 7;
  }

  private isAlive(tree: number): boolean {
    return this.trees.some((t) => t.id === tree);
  }

  /** Potted centerpiece plus permanent edge residents, staggered so nothing grows in sync. */
  private seedInitialTrees(): void {
    const { cols } = this;
    const cap = this.maxTrees();
    const centerX = Math.floor(cols / 2);
    const rootY = this.potLines.length > 0 ? this.potTop - 1 : this.rows - 1;
    this.spawnTrunk(
      centerX,
      rootY,
      this.effectiveVitality(this.config.vitality),
      this.config.lean,
      true,
    );
    if (cap < 3 || cols < 40) return;

    const placed = [centerX];
    const addResident = (x: number, spacing: number): void => {
      if (placed.length >= cap - 1) return; // keep a slot open for the seed generations
      if (placed.some((p) => Math.abs(p - x) < spacing)) return;
      placed.push(x);
      this.pending.push({
        delayMs: EDGE_DELAY_MIN_MS + Math.random() * EDGE_DELAY_VAR_MS,
        lean: this.config.lean + (Math.random() - 0.5) * EDGE_LEAN_VAR,
        vitality: this.effectiveVitality(
          Math.round(this.config.vitality * (EDGE_LIFE_MIN + Math.random() * EDGE_LIFE_VAR)),
        ),
        x,
      });
    };

    // one guaranteed on each side, never mirrored
    addResident(Math.floor(cols * (0.1 + Math.random() * 0.15)), cols * EDGE_SPACING_FRAC);
    addResident(Math.floor(cols * (0.75 + Math.random() * 0.15)), cols * EDGE_SPACING_FRAC);

    // extras squeeze into the remaining gaps at a tighter spacing
    let extras = 0;
    if (cols > 160) extras = 2 + Math.floor(Math.random() * 2);
    else if (cols > 100) extras = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < extras * 4; i++) {
      const before = placed.length;
      addResident(Math.floor(cols * (0.05 + Math.random() * 0.9)), cols * 0.1);
      if (placed.length > before && --extras === 0) break;
    }
  }

  private spawnTrunk(
    x: number,
    y: number,
    vitality: number,
    lean: number,
    permanent: boolean,
  ): void {
    const id = this.treeSeq++;
    this.trees.push({ id, permanent, x });
    this.limbs.push({
      bias: UP + lean * 0.5,
      charge: 0,
      energy: vitality,
      gen: 0,
      girth: Math.floor(vitality * GIRTH_FRACTION),
      heading: UP + lean * 0.3 + (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: (PHASE_SPEED_MIN + Math.random() * PHASE_SPEED_VAR) * 0.7,
      side: Math.random() < 0.5 ? 1 : -1,
      total: vitality,
      tree: id,
      x,
      y: y + 1, // limbs stamp after moving, so the first cell lands on the root row
    });
  }

  private promotePending(dt: number): void {
    if (this.pending.length === 0) return;
    for (const tree of this.pending) tree.delayMs -= dt;
    for (const tree of this.pending) {
      if (tree.delayMs <= 0) this.spawnTrunk(tree.x, this.rows - 1, tree.vitality, tree.lean, true);
    }
    compact(this.pending, (t) => t.delayMs > 0);
  }

  private growTick(): void {
    const count = this.limbs.length; // children forked this tick start next tick
    for (let i = 0; i < count; i++) this.stepLimb(this.limbs[i]);
    compact(this.limbs, (limb) => limb.energy > 0);
  }

  private stepLimb(limb: Limb): void {
    limb.phase += limb.phaseSpeed;
    const drift = Math.sin(limb.phase) * CURVE_AMP[limb.gen];
    limb.heading += drift + (limb.bias - limb.heading) * BIAS_PULL[limb.gen];
    // keep growth in the upward hemisphere, allowing a slight sag past horizontal
    limb.heading = Math.max(-Math.PI - DROOP_LIMIT, Math.min(DROOP_LIMIT, limb.heading));
    limb.x += Math.cos(limb.heading);
    limb.y += Math.sin(limb.heading);

    const col = Math.round(limb.x);
    const row = Math.round(limb.y);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      // ran off the grid: crown what's there and stop
      limb.x = Math.max(0, Math.min(this.cols - 1, limb.x));
      limb.y = Math.max(0, Math.min(this.rows - 1, limb.y));
      this.depositPad(limb);
      limb.energy = 0;
      return;
    }

    this.stampWood(col, row, limb, drift);

    // the flared lower trunk stays clean; forking starts above it
    if (limb.girth <= 0) limb.charge += FORK_CHARGE_MIN + Math.random() * FORK_CHARGE_VAR;
    if (limb.charge >= FORK_THRESHOLD && limb.energy > MIN_FORK_ENERGY && limb.gen < MAX_GEN) {
      limb.charge = 0;
      this.fork(limb);
    }

    limb.energy--;
    if (limb.energy <= 0) this.depositPad(limb);
  }

  private fork(parent: Limb): void {
    const dir = parent.side;
    parent.side = (dir * -1) as 1 | -1;
    const gen = parent.gen + 1;
    const ratio = gen === 1 ? 0.45 + this.config.sprawl * 0.35 : TWIG_ENERGY_RATIO;
    const energy = Math.max(
      CHILD_MIN_ENERGY,
      Math.min(CHILD_MAX_ENERGY, Math.round(parent.energy * ratio)),
    );

    // limbs off the trunk launch near-horizontal; twigs continue outward with lifted tips
    const rise = 0.18 + (1 - this.config.sprawl) * 0.5;
    let bias: number;
    let heading: number;
    if (gen === 1) {
      bias = (dir < 0 ? -Math.PI + rise : -rise) + this.config.lean * 0.3;
      heading = bias - dir * (0.2 + Math.random() * 0.3); // slight upward launch angle
    } else {
      const outward = parent.heading + dir * 0.5;
      bias = outward + (UP - outward) * 0.25;
      heading = parent.heading + dir * (FORK_SPREAD_MIN + Math.random() * FORK_SPREAD_VAR);
    }

    this.limbs.push({
      bias,
      charge: 0,
      energy,
      gen,
      girth: 0,
      heading,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: PHASE_SPEED_MIN + Math.random() * PHASE_SPEED_VAR,
      side: Math.random() < 0.5 ? 1 : -1,
      total: energy,
      tree: parent.tree,
      x: parent.x,
      y: parent.y,
    });
  }

  private woodChar(heading: number, drift: number): string {
    if (Math.random() < KNOT_CHANCE) return '%';
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    if (Math.abs(dx) < 0.35) return drift < -0.03 ? '(' : drift > 0.03 ? ')' : '|';
    if (Math.abs(dy) < 0.35) return Math.abs(dx) > 0.9 ? '=' : '-';
    return dx * dy > 0 ? '\\' : '/';
  }

  private woodColor(limb: Limb): string {
    const pal = this.pal();
    const age = 1 - limb.energy / limb.total;
    return age > 0.6 || Math.random() < 0.15 ? pal.woodLight : pal.woodDark;
  }

  private stampWood(col: number, row: number, limb: Limb, drift: number): void {
    const color = this.woodColor(limb);
    this.setCell(col, row, this.woodChar(limb.heading, drift), color, false, limb.tree);

    // tapered base: three cells wide at the flare, then two, then one — side
    // cells fill in through the sprout queue so the trunk visibly thickens
    const age = 1 - limb.energy / limb.total;
    if (limb.girth > 0) {
      limb.girth--;
      this.enqueueCell(col - 1, row, '(', color, false, limb.tree);
      this.enqueueCell(col + 1, row, ')', color, false, limb.tree);
    } else if (limb.gen === 0 && age < TAPER_FRACTION) {
      // second cell leans into the current curve
      if (drift < 0) this.enqueueCell(col - 1, row, '(', color, false, limb.tree);
      else this.enqueueCell(col + 1, row, ')', color, false, limb.tree);
    }
  }

  private setCell(
    col: number,
    row: number,
    char: string,
    color: string,
    leaf: boolean,
    tree: number,
  ): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    // leaves fill only empty cells so pads never erase the wood skeleton
    if (leaf && this.grid[row][col]) return;
    this.grid[row][col] = { char, color, leaf, tree };
  }

  private enqueueCell(
    col: number,
    row: number,
    char: string,
    color: string,
    leaf: boolean,
    tree: number,
  ): void {
    this.sproutQueue.push({ char, col, color, leaf, row, tree });
  }

  private fillSprouts(dtSec: number): void {
    if (this.sproutQueue.length === 0) return;
    this.sproutCarry += SPROUT_RATE_FACTOR * Math.max(0.05, this.config.growthSpeed) * dtSec;
    let n = Math.floor(this.sproutCarry);
    this.sproutCarry -= n;
    while (n-- > 0) {
      const cell = this.sproutQueue.shift();
      if (!cell) break;
      if (!this.isAlive(cell.tree)) continue;
      this.setCell(cell.col, cell.row, cell.char, cell.color, cell.leaf, cell.tree);
    }
  }

  private depositPad(limb: Limb): void {
    if (limb.gen === 0 && limb.total < 10) return; // stunted trunks stay bare
    const pal = this.pal();
    const spread = this.config.sprawl;
    const rx =
      (limb.gen === 0 ? 5 : limb.gen === 1 ? 3.4 + spread * 1.8 : 2.8) + Math.random() * 0.6;
    const ry = (limb.gen <= 1 ? 1.8 + spread * 0.5 : 1.5) + Math.random() * 0.3;

    const cells: (QueuedCell & { d2: number })[] = [];
    for (let iy = -Math.ceil(ry); iy <= Math.ceil(ry); iy++) {
      for (let ix = -Math.ceil(rx); ix <= Math.ceil(rx); ix++) {
        const d2 = (ix / rx) ** 2 + (iy / ry) ** 2;
        if (d2 > 1) continue;
        if (Math.random() > 1.05 - 0.4 * d2) continue; // ragged organic edge

        const roll = Math.random();
        let char: string;
        let color: string;
        if (d2 < 0.22) {
          char = '@';
          color = roll < 0.85 ? pal.leafCore : pal.leafBody;
        } else if (d2 < 0.6) {
          char = 'o';
          color = roll < 0.8 ? pal.leafBody : pal.leafFringe;
        } else {
          char = '"';
          color = roll < 0.8 ? pal.leafFringe : pal.leafBody;
        }
        cells.push({
          char,
          col: Math.round(limb.x) + ix,
          color,
          d2: d2 + Math.random() * 0.3, // jittered so the bloom edge stays organic
          leaf: true,
          row: Math.round(limb.y) + iy,
          tree: limb.tree,
        });
      }
    }

    // pads bloom from the center outward
    cells.sort((a, b) => a.d2 - b.d2);
    for (const cell of cells) this.sproutQueue.push(cell);
  }

  // --- seasons ---

  private enterSeason(season: Season): void {
    this.season = season;
    this.seasonTimer = 0;
    this.leafProgress = 0;
    if (season === 'autumn') this.collectLeafCells(); // include leaves grown since last cycle
    if (season === 'spring') this.sproutSeeds();
    this.leafOrder = shuffle(Array.from({ length: this.leafCells.length }, (_, i) => i));
  }

  private collectLeafCells(): void {
    this.leafCells = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.grid[row][col];
        if (cell?.leaf) {
          this.leafCells.push({ char: cell.char, col, color: cell.color, row, tree: cell.tree });
        }
      }
    }
  }

  /** Applies fn to leaves one by one in shuffled order, paced over the phase. */
  private sweepLeaves(duration: number, fn: (leaf: LeafCell) => void): void {
    if (this.leafCells.length === 0) return;
    const progress = Math.min(1, this.seasonTimer / duration);
    const target = Math.floor(progress * this.leafCells.length);

    while (this.leafProgress < target) {
      fn(this.leafCells[this.leafOrder[this.leafProgress]]);
      this.leafProgress++;
    }
  }

  // --- drifting leaves & seeds ---

  private makeDrift(x: number, y: number, char: string, color: string, isSeed: boolean): Drift {
    // seeds catch the wind and disperse well past the canopy; leaves mostly sway
    const vx = isSeed
      ? (Math.random() - 0.5) * 1.8 + this.config.lean * 0.8
      : (Math.random() - 0.5) * 0.6 + this.config.lean * 1.5;
    return {
      char,
      color,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 1.2 + Math.random(),
      vx,
      vy: isSeed ? 0.9 + Math.random() * 0.4 : 2 + Math.random() * 1.5,
      x,
      y,
    };
  }

  private dropSeeds(dt: number): void {
    this.seedTimer -= dt;
    if (this.seedTimer > 0) return;
    this.seedTimer = SEED_INTERVAL_MS + Math.random() * SEED_INTERVAL_VAR_MS;

    // seeds fall from a still-leafy spot in the canopy
    for (let attempt = 0; attempt < 6; attempt++) {
      const leaf = this.leafCells[Math.floor(Math.random() * this.leafCells.length)];
      if (!leaf || !this.grid[leaf.row][leaf.col]?.leaf) continue;
      this.seeds.push(this.makeDrift(leaf.col, leaf.row, SEED_CHAR, this.pal().woodLight, true));
      return;
    }
  }

  private updateDrifts(dtSec: number): void {
    const sway = 1.5;
    const ground = this.rows - 1;

    for (const d of this.falling) {
      d.phase += d.phaseSpeed * dtSec;
      d.x += (Math.sin(d.phase) * sway + d.vx) * dtSec;
      d.y += d.vy * dtSec;
    }
    compact(this.falling, (d) => d.y < ground);

    for (const d of this.seeds) {
      d.phase += d.phaseSpeed * dtSec;
      d.x += (Math.sin(d.phase) * sway * 0.5 + d.vx) * dtSec;
      d.y += d.vy * dtSec;
      if (d.y >= ground) this.landSeed(Math.round(d.x));
    }
    compact(this.seeds, (d) => d.y < ground);
  }

  private landSeed(col: number): void {
    if (col < 0 || col >= this.cols) return;
    if (this.seedSites.length >= MAX_SEED_SITES) return;
    // seeds vanish on the pot — only open ground takes
    if (this.potWidth > 0 && col >= this.potLeft - 2 && col <= this.potLeft + this.potWidth + 1)
      return;
    const spacing = this.cols * 0.08;
    if (this.seedSites.some((c) => Math.abs(c - col) < spacing)) return;
    this.seedSites.push(col);
  }

  private sproutSeeds(): void {
    const spacing = this.cols * SPROUT_SPACING_FRAC;
    for (const col of this.seedSites) {
      if (this.trees.some((t) => Math.abs(t.x - col) < spacing)) continue;
      if (this.trees.length >= this.maxTrees() && !this.retireOldest()) continue;
      const vitality = this.effectiveVitality(
        Math.round(
          this.config.vitality * (SPROUT_VITALITY_MIN + Math.random() * SPROUT_VITALITY_VAR),
        ),
      );
      this.spawnTrunk(
        col,
        this.rows - 1,
        vitality,
        this.config.lean + (Math.random() - 0.5) * 0.4,
        false,
      );
    }
    this.seedSites = [];
  }

  // --- population ---

  /** Permanent residents (potted tree + edge trees) never retire. */
  private retireOldest(): boolean {
    const victim = this.trees.find((t) => !t.permanent);
    if (!victim) return false;
    this.trees = this.trees.filter((t) => t.id !== victim.id);
    compact(this.limbs, (l) => l.tree !== victim.id);
    compact(this.sproutQueue, (c) => c.tree !== victim.id);

    const cells: { col: number; row: number }[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col]?.tree === victim.id) cells.push({ col, row });
      }
    }
    this.retiring.push({ cells: shuffle(cells), tree: victim.id });
    return true;
  }

  private processRetirement(dtSec: number): void {
    if (this.retiring.length === 0) return;
    this.retireCarry += RETIRE_RATE * dtSec;
    let n = Math.floor(this.retireCarry);
    this.retireCarry -= n;

    while (n-- > 0 && this.retiring.length > 0) {
      const entry = this.retiring[0];
      const pos = entry.cells.pop();
      if (pos && this.grid[pos.row][pos.col]?.tree === entry.tree) {
        this.grid[pos.row][pos.col] = null;
      }
      if (entry.cells.length === 0) this.retiring.shift();
    }
  }

  // --- moss ---

  private updateMoss(dt: number): void {
    this.mossTimer += dt;
    if (this.mossTimer < MOSS_INTERVAL_MS) return;
    this.mossTimer = 0;
    if (this.tufts.length >= 4 + this.trees.length * MOSS_PER_TREE) return;

    const tree = this.trees[Math.floor(Math.random() * this.trees.length)];
    if (!tree) return;
    // clustered near a trunk, irregular by construction
    const col = tree.x + Math.round((Math.random() - 0.5) * 18);
    if (col < 0 || col >= this.cols) return;
    if (this.potWidth > 0 && col >= this.potLeft - 1 && col <= this.potLeft + this.potWidth) return;
    if (this.tufts.some((t) => t.col === col)) return;
    this.tufts.push({ char: MOSS_CHARS[Math.floor(Math.random() * MOSS_CHARS.length)], col });
  }
}
