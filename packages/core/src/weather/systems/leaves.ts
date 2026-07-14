import type { SceneAnchors, WeatherData, WeatherSystem } from '../types.js';

// Loose leaves tumbling across on the wind — glyph cycles as they turn over.

const SPAWN_WAIT_MIN = 3; // seconds
const SPAWN_WAIT_VAR = 9;
const MAX_LEAVES = 5;
const TUMBLE_GLYPHS = ['-', '\\', '|', '/'] as const;
const TUMBLE_SPEED_MIN = 3; // glyph steps/sec
const TUMBLE_SPEED_VAR = 4;
const CARRY_MIN = 3.5; // cols/sec
const CARRY_VAR = 3;
const WIND_CARRY_DIVISOR = 9;
const BOB_FREQ = 1.8;
const BOB_AMPLITUDE = 0.8; // rows/sec of vertical wobble
const SINK = 0.5; // rows/sec net descent

const TONES = ['#a8763e', '#8a5a34', '#b08a48'] as const;

interface Leaf {
  phase: number;
  tone: string;
  tumble: number;
  tumbleSpeed: number;
  vx: number;
  x: number;
  y: number;
}

export class LeavesSystem implements WeatherSystem {
  private leaves: Leaf[] = [];
  private timer = 0;
  private cols = 0;
  private windCarry = 0;
  private windDir: 1 | -1 = 1;

  constructor(private readonly anchors: SceneAnchors) {}

  init(cols: number, _rows: number): void {
    this.cols = cols;
    this.leaves = [];
    this.timer = Math.random() * SPAWN_WAIT_VAR;
  }

  configure(weather: WeatherData): void {
    const towardEast = -Math.sin((weather.windDirection * Math.PI) / 180);
    this.windDir = towardEast >= 0 ? 1 : -1;
    this.windCarry = (Math.abs(towardEast) * weather.windSpeed) / WIND_CARRY_DIVISOR;
  }

  update(dt: number): void {
    const dtSec = dt / 1000;

    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      leaf.phase += BOB_FREQ * dtSec;
      leaf.tumble += leaf.tumbleSpeed * dtSec;
      leaf.x += leaf.vx * dtSec;
      leaf.y += (SINK + Math.sin(leaf.phase) * BOB_AMPLITUDE) * dtSec;
      const gone = leaf.x < -3 || leaf.x > this.cols + 3 || leaf.y >= this.anchors.groundRow + 0.5;
      if (gone) this.leaves.splice(i, 1);
    }

    this.timer -= dtSec;
    if (this.timer <= 0 && this.leaves.length < MAX_LEAVES && this.cols >= 20) {
      this.timer = SPAWN_WAIT_MIN + Math.random() * SPAWN_WAIT_VAR;
      const vx = (CARRY_MIN + Math.random() * CARRY_VAR + this.windCarry) * this.windDir;
      this.leaves.push({
        phase: Math.random() * Math.PI * 2,
        tone: TONES[Math.floor(Math.random() * TONES.length)],
        tumble: Math.random() * TUMBLE_GLYPHS.length,
        tumbleSpeed: TUMBLE_SPEED_MIN + Math.random() * TUMBLE_SPEED_VAR,
        vx,
        x: this.windDir === 1 ? -2 : this.cols + 2,
        y: Math.max(1, this.anchors.groundRow - 3 - Math.random() * 8),
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const leaf of this.leaves) {
      const col = Math.round(leaf.x);
      const row = Math.round(leaf.y);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      ctx.fillStyle = leaf.tone;
      ctx.fillText(
        TUMBLE_GLYPHS[Math.floor(leaf.tumble) % TUMBLE_GLYPHS.length],
        col * charW,
        (row + 1) * charH,
      );
    }
  }
}
