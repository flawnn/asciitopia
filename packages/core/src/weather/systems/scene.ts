import type { SceneAnchors, WeatherData, WeatherSystem } from '../types.js';

// Original asciitopia scenery — every sprite below was drawn for this project.
// One scene: a hillside cabin clearing. Static art plus small living details
// (firelight, a cat, a wind chime, a birdhouse visitor) that keep it breathing.

// --- palette ---

interface SceneTones {
  bush: string;
  canopy: string;
  canopyFringe: string;
  chimney: string;
  door: string;
  glow: string;
  grass: string;
  grassBright: string;
  path: string;
  roof: string;
  soil: string;
  trunk: string;
  wall: string;
  window: string;
}

const DAY_TONES: SceneTones = {
  bush: '#3e7a44',
  canopy: '#35803f',
  canopyFringe: '#57a75a',
  chimney: '#8a8a92',
  door: '#6e4f36',
  glow: '#b8b09a',
  grass: '#4a7a46',
  grassBright: '#639a58',
  path: '#8f857a',
  roof: '#7a6350',
  soil: '#564840',
  trunk: '#755a40',
  wall: '#967452',
  window: '#a8c4d4',
};

const NIGHT_TONES: SceneTones = {
  bush: '#26502e',
  canopy: '#20512a',
  canopyFringe: '#356b3c',
  chimney: '#5b5b64',
  door: '#4a3626',
  glow: '#ffd98a',
  grass: '#2e5030',
  grassBright: '#3f6a40',
  path: '#5f594f',
  roof: '#4e4036',
  soil: '#38302b',
  trunk: '#4e3c2c',
  wall: '#63503c',
  window: '#ffcf7d',
};

// firelight: the night windows wander through these instead of holding one color
const FLICKER = ['#ffcf7d', '#f2bd66', '#ffd991', '#e8b158'] as const;
const CAT_SILHOUETTE = '#7a5a2a';
const CAT_FUR = '#8a8074';

const SNOW_BRIGHT = '#dde4ea';
const SNOW_DIM = '#a7b2bc';

// --- ground texture ---

// Teschner-style spatial hash with a wide prime modulus; picked so the
// speckle reads as soft turf rather than a repeating tile.
const groundRoll = (x: number, y: number): number => {
  const h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0;
  return (h >>> 4) % 97;
};

const TUFT_ROLL = 6; // '"' tall tuft
const BLADE_ROLL = 16; // "'"
const SPRIG_ROLL = 34; // ','
const SUBSOIL_DOT_ROLL = 5; // '.' on the rows below the grass line
const SUBSOIL_TICK_ROLL = 9; // ','
const SNOW_SALT = 31; // hash salt for per-cell snow thresholds

// --- sprites ---

interface Sprite {
  art: readonly string[];
  colorFor(char: string, tones: SceneTones): string;
}

// The cabin: squat log build, stone chimney, lattice windows, plank door.
const CABIN: Sprite = {
  art: [
    '          ___                  ',
    '          |=|                  ',
    '    ______|=|______________    ',
    "  .'                       '.  ",
    " .'  , ' , ' , ' , ' , ' ,  '. ",
    '.:_________________________:. ',
    ' |   .--.    .---.   .--.   | ',
    ' |   |++|    | . |   |++|   | ',
    ' |   |__|    |  o|   |__|   | ',
    "_'___________|___|__________'_",
  ],
  colorFor: (char, tones) => {
    switch (char) {
      case '=':
        return tones.chimney;
      case '+':
        return tones.window;
      case 'o':
      case '.':
        return tones.door;
      case ',':
      case "'":
        return tones.roof;
      default:
        return tones.wall;
    }
  },
};

// cabin geometry, relative to its top-left corner
const CABIN_CHIMNEY = { col: 11, row: -1 };
const CABIN_WINDOW_SPLIT = 15; // '+' cells left of this are window 0
const CABIN_DOOR_RIGHT = 18; // stones start past the door
const CABIN_CHIME = { col: 10, row: 6 }; // hook cell under the eave
const CABIN_HEIGHT = CABIN.art.length;

const BROADLEAF: Sprite = {
  art: [
    '    "o@@o"    ',
    '  "o@@@@@@o"  ',
    ' "@@@@@@@@@@" ',
    '  "o@@@@@@o"  ',
    "    ')||('    ",
    '      ||      ',
  ],
  colorFor: (char, tones) => {
    if (char === '@') return tones.canopy;
    if (char === 'o' || char === '"') return tones.canopyFringe;
    return tones.trunk;
  },
};

const LANTERN: Sprite = {
  art: ['[o]', ' | ', ' | '],
  colorFor: (char, tones) => (char === 'o' ? tones.glow : tones.trunk),
};

const BUSH: Sprite = {
  art: [' (""), ', '("""")'],
  colorFor: (_char, tones) => tones.bush,
};

const BIRDHOUSE: Sprite = {
  art: ['.^.', '|o|', ' | ', ' | '],
  colorFor: (char, tones) => (char === 'o' ? tones.soil : tones.trunk),
};

const WOODPILE: Sprite = {
  art: [' .-----. ', '(o)(o)(o)', '(o)(o)(o)'],
  colorFor: (char, tones) => {
    if (char === 'o') return tones.trunk;
    if (char === '.' || char === '-') return tones.roof;
    return tones.door;
  },
};

// --- placement ---

interface Placement {
  /** Fraction of cols the sprite center sits at. */
  at: number;
  sprite: Sprite;
}

const PROPS: readonly Placement[] = [
  { at: 0.11, sprite: BROADLEAF },
  { at: 0.6, sprite: LANTERN },
  { at: 0.68, sprite: BIRDHOUSE },
  { at: 0.78, sprite: BUSH },
  { at: 0.88, sprite: BROADLEAF },
];
const LANTERN_AT = 0.6;

const HOME_AT = 0.42; // building center, fraction of cols
const MIN_ROWS_FOR_HOME = 16;
const MIN_COLS_FOR_HOME = 44;
const STONE_SPACING = 3;
const MAX_STONES = 6;

// --- living details (seconds) ---

const CAT_HIDDEN_MIN = 45;
const CAT_HIDDEN_VAR = 85;
const CAT_VISIT_MIN = 14;
const CAT_VISIT_VAR = 14;

const VISITOR_AWAY_MIN = 18;
const VISITOR_AWAY_VAR = 40;
const VISITOR_PERCH_MIN = 7;
const VISITOR_PERCH_VAR = 11;
const VISITOR_TONE = '#8b8578';

const CHIME_TONE = '#9a9aa4';

interface Stamp {
  char: string;
  col: number;
  row: number;
  /** 0/1 = window '+' cell of that window; -1 = plain scenery. */
  window: number;
  tint(tones: SceneTones): string;
}

/** An upward-facing surface cell — where snow can settle. */
export interface Perch {
  col: number;
  /** 0–96 stable per-cell threshold; lower rolls whiten first. */
  roll: number;
  row: number;
}

type CatMode = 'hidden' | 'window' | 'doorstep';

// --- system ---

export class SceneSystem implements WeatherSystem {
  readonly anchors: SceneAnchors = { chimneyCol: 0, chimneyRow: 0, groundRow: 0 };
  /** 0–1, fed by the traces system each frame; whitens the ground progressively. */
  snowLevel = 0;

  private cols = 0;
  private rows = 0;
  private tones: SceneTones = NIGHT_TONES;
  private night = true;
  private wind = 5;
  private precip = false;
  private stamps: Stamp[] = [];
  private surfacePerches: Perch[] = [];
  private eaveHangs: Perch[] = [];
  private homeLeft = -1;
  private homeTop = 0;
  private reservedGround = new Set<number>();
  private time = 0;

  // details
  private cat: CatMode = 'hidden';
  private catTimer = CAT_HIDDEN_MIN;
  private catWindow = 0;
  private catCol = 0;
  private visitorPerched = false;
  private visitorTimer = VISITOR_AWAY_MIN;
  private visitorCol = -1;
  private visitorRow = -1;
  private chimeCol = -1;
  private chimeRow = 0;

  /** Cells snow may sit on (tops of the roofline, canopies, posts). */
  get perches(): readonly Perch[] {
    return this.surfacePerches;
  }

  /** Under-eave cells icicles may grow from. */
  get hangs(): readonly Perch[] {
    return this.eaveHangs;
  }

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.time = 0;
    this.snowLevel = 0;
    this.anchors.groundRow = rows - this.groundRows();
    this.anchors.chimneyCol = Math.floor(cols / 2);
    this.anchors.chimneyRow = Math.max(0, this.anchors.groundRow - 12);
    this.cat = 'hidden';
    this.catTimer = CAT_HIDDEN_MIN + Math.random() * CAT_HIDDEN_VAR;
    this.visitorPerched = false;
    this.visitorTimer = VISITOR_AWAY_MIN + Math.random() * VISITOR_AWAY_VAR;
    this.buildStamps();
    this.collectSurfaces();
  }

  configure(weather: WeatherData): void {
    this.tones = weather.isDay ? DAY_TONES : NIGHT_TONES;
    this.night = !weather.isDay;
    this.wind = weather.windSpeed;
    this.precip =
      weather.condition !== 'clear' &&
      weather.condition !== 'partly-cloudy' &&
      weather.condition !== 'overcast';
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    this.time += dtSec;
    this.updateCat(dtSec);
    this.updateVisitor(dtSec);
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    // one flicker pick per frame, shared by every lit window cell
    const flicker = this.night
      ? FLICKER[
          Math.min(
            FLICKER.length - 1,
            Math.floor(
              ((Math.sin(this.time * 6.1) + Math.sin(this.time * 9.7 + 1.3) + 2) / 4) *
                FLICKER.length,
            ),
          )
        ]
      : null;

    for (const s of this.stamps) {
      if (s.col < 0 || s.col >= cols || s.row < 0 || s.row >= rows) continue;
      if (s.window >= 0) {
        if (this.cat === 'window' && s.window === this.catWindow) {
          // the cat sits inside: ears against the glow
          ctx.fillStyle = this.night ? CAT_SILHOUETTE : this.tones.door;
          ctx.fillText('^', s.col * charW, (s.row + 1) * charH);
          continue;
        }
        ctx.fillStyle = flicker ?? this.tones.window;
      } else {
        ctx.fillStyle = s.tint(this.tones);
      }
      ctx.fillText(s.char, s.col * charW, (s.row + 1) * charH);
    }

    this.renderGround(ctx, cols, rows, charW, charH);
    this.renderDetails(ctx, cols, rows, charW, charH);
  }

  // --- living details ---

  private updateCat(dtSec: number): void {
    if (this.homeLeft < 0) return;
    this.catTimer -= dtSec;
    if (this.catTimer > 0) return;

    if (this.cat === 'hidden') {
      // wet or dark evenings: the window. Fair days: the doorstep.
      this.cat = this.precip || this.night ? 'window' : 'doorstep';
      this.catWindow = Math.random() < 0.5 ? 0 : 1;
      this.catCol = this.homeLeft + CABIN_DOOR_RIGHT + 1;
      this.catTimer = CAT_VISIT_MIN + Math.random() * CAT_VISIT_VAR;
    } else {
      this.cat = 'hidden';
      this.catTimer = CAT_HIDDEN_MIN + Math.random() * CAT_HIDDEN_VAR;
    }
  }

  private updateVisitor(dtSec: number): void {
    if (this.visitorCol < 0) return;
    this.visitorTimer -= dtSec;
    if (this.visitorTimer > 0) return;

    if (!this.visitorPerched && !this.night && !this.precip) {
      this.visitorPerched = true;
      this.visitorTimer = VISITOR_PERCH_MIN + Math.random() * VISITOR_PERCH_VAR;
    } else {
      this.visitorPerched = false;
      this.visitorTimer = VISITOR_AWAY_MIN + Math.random() * VISITOR_AWAY_VAR;
    }
  }

  private renderDetails(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    // wind chime under the eave — the harder the wind, the wider the swing
    if (this.chimeCol >= 0 && this.chimeCol < cols && this.chimeRow + 1 < rows) {
      const swing =
        Math.sin(this.time * (1.2 + this.wind / 14)) * Math.min(1, 0.2 + this.wind / 16);
      ctx.fillStyle = CHIME_TONE;
      ctx.fillText('.', this.chimeCol * charW, (this.chimeRow + 1) * charH);
      const tube = swing < -0.45 ? '/' : swing > 0.45 ? '\\' : '|';
      ctx.fillText(tube, this.chimeCol * charW, (this.chimeRow + 2) * charH);
    }

    if (this.cat === 'doorstep') {
      const row = this.anchors.groundRow;
      ctx.fillStyle = CAT_FUR;
      const cat = '=^.^=';
      for (let i = 0; i < cat.length; i++) {
        const col = this.catCol + i;
        if (col >= 0 && col < cols && row < rows) {
          ctx.fillText(cat[i], col * charW, (row + 1) * charH);
        }
      }
    }

    if (this.visitorPerched && this.visitorCol < cols && this.visitorRow >= 0) {
      ctx.fillStyle = VISITOR_TONE;
      ctx.fillText('v', this.visitorCol * charW, (this.visitorRow + 1) * charH);
    }
  }

  // --- ground ---

  private groundRows(): number {
    if (this.rows < 4) return 1;
    return Math.max(2, Math.min(4, Math.round(this.rows * 0.12)));
  }

  private isCatCell(col: number): boolean {
    return this.cat === 'doorstep' && col >= this.catCol && col < this.catCol + 5;
  }

  private renderGround(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    const top = this.anchors.groundRow;
    const snow100 = this.snowLevel * 110; // full blanket a touch before level 1

    for (let row = top; row < rows && row < this.rows; row++) {
      const y = (row + 1) * charH;
      const grassLine = row === top;
      for (let col = 0; col < cols && col < this.cols; col++) {
        if (grassLine && (this.reservedGround.has(col) || this.isCatCell(col))) continue;
        const roll = groundRoll(col, row);
        const snowed = snow100 > groundRoll(col, row + SNOW_SALT);
        let char = '';
        let color = snowed ? SNOW_DIM : this.tones.grass;
        if (grassLine) {
          if (roll < TUFT_ROLL) {
            char = snowed ? '*' : '"';
            color = snowed ? SNOW_BRIGHT : this.tones.grassBright;
          } else if (roll < BLADE_ROLL) {
            char = "'";
            if (!snowed) color = this.tones.grassBright;
          } else if (roll < SPRIG_ROLL) {
            char = ',';
          } else {
            char = '.';
          }
        } else if (roll < SUBSOIL_DOT_ROLL) {
          char = '.';
          if (!snowed) color = this.tones.soil;
        } else if (roll < SUBSOIL_TICK_ROLL) {
          char = ',';
          if (!snowed) color = this.tones.soil;
        }
        if (char === '') continue;
        ctx.fillStyle = color;
        ctx.fillText(char, col * charW, y);
      }
    }
  }

  // --- sprites ---

  private buildStamps(): void {
    this.stamps = [];
    this.reservedGround.clear();
    this.homeLeft = -1;
    this.chimeCol = -1;
    this.visitorCol = -1;
    const ground = this.anchors.groundRow;

    if (this.rows < MIN_ROWS_FOR_HOME || this.cols < MIN_COLS_FOR_HOME) return;

    const homeW = CABIN.art[0].length;
    this.homeLeft = Math.round(this.cols * HOME_AT) - Math.floor(homeW / 2);
    this.homeTop = ground - CABIN_HEIGHT;
    this.stampSprite(CABIN, this.homeLeft, this.homeTop, true);
    this.anchors.chimneyCol = this.homeLeft + CABIN_CHIMNEY.col;
    this.anchors.chimneyRow = this.homeTop + CABIN_CHIMNEY.row;
    this.chimeCol = this.homeLeft + CABIN_CHIME.col;
    this.chimeRow = this.homeTop + CABIN_CHIME.row;

    // woodpile stacked against the left wall
    const pileLeft = this.homeLeft - WOODPILE.art[0].length - 1;
    this.stampSprite(WOODPILE, pileLeft, ground - WOODPILE.art.length, false);

    for (const prop of PROPS) {
      const art = prop.sprite.art;
      const left = Math.round(this.cols * prop.at) - Math.floor(art[0].length / 2);
      // skip props that would collide with the building or its woodpile
      if (left + art[0].length > pileLeft - 1 && left < this.homeLeft + homeW + 2) continue;
      this.stampSprite(prop.sprite, left, ground - art.length, false);
      if (prop.sprite === BIRDHOUSE) {
        this.visitorCol = left + 1;
        this.visitorRow = ground - art.length - 1;
      }
    }

    this.placeStones(ground);
  }

  /** Stepping stones from the door toward the lantern. */
  private placeStones(ground: number): void {
    const from = this.homeLeft + CABIN_DOOR_RIGHT + 2;
    const to = Math.round(this.cols * LANTERN_AT) - 3;
    if (to - from < STONE_SPACING * 2) return;
    let placed = 0;
    for (let col = from; col <= to && placed < MAX_STONES; col += STONE_SPACING) {
      this.reservedGround.add(col);
      this.stamps.push({
        char: 'o',
        col,
        row: ground,
        window: -1,
        tint: (tones) => tones.path,
      });
      placed++;
    }
  }

  private stampSprite(sprite: Sprite, left: number, top: number, isHome: boolean): void {
    for (let r = 0; r < sprite.art.length; r++) {
      const line = sprite.art[r];
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === ' ') continue;
        const window = isHome && char === '+' ? (c < CABIN_WINDOW_SPLIT ? 0 : 1) : -1;
        this.stamps.push({
          char,
          col: left + c,
          row: top + r,
          window,
          tint: (tones) => sprite.colorFor(char, tones),
        });
      }
    }
  }

  /** Derive snow perches (open sky above) and icicle hangs (eave cells with air below). */
  private collectSurfaces(): void {
    this.surfacePerches = [];
    this.eaveHangs = [];
    const occupied = new Set<number>();
    for (const s of this.stamps) occupied.add(s.row * 8192 + s.col);

    const eaveRow = this.homeTop + 5;
    for (const s of this.stamps) {
      if (s.row === this.anchors.groundRow) continue; // stones — ground snow covers those
      if (s.row > 0 && !occupied.has((s.row - 1) * 8192 + s.col)) {
        this.surfacePerches.push({ col: s.col, roll: groundRoll(s.col, s.row), row: s.row });
      }
      // icicles only along the cabin's eave line
      if (
        this.homeLeft >= 0 &&
        s.row === eaveRow &&
        s.col >= this.homeLeft &&
        !occupied.has((s.row + 1) * 8192 + s.col)
      ) {
        this.eaveHangs.push({ col: s.col, roll: groundRoll(s.col, s.row + SNOW_SALT), row: s.row });
      }
    }
  }
}
