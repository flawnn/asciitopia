import type { WeatherCondition, WeatherData, WeatherSystem } from '../types.js';

// Night sky: stars scattered on a jittered grid (one roll per cell, no
// rejection sampling), each breathing on its own sine. Rarely, one falls.

const CELL_W = 9;
const CELL_H = 4;
const OCCUPANCY = 0.34; // chance a grid cell holds a star
const SKY_FRACTION = 0.62; // stars keep to the upper sky
const TWINKLE_SPEED_MIN = 0.35; // rad/sec
const TWINKLE_SPEED_VAR = 0.9;
const BRIGHT_CUT = 0.72; // sine value above which a star peaks
const DIM_CUT = -0.2; // below: barely there

const SHOOTING_CHANCE_PER_SEC = 0.03;
const SHOOTING_SPEED = 26; // cells/sec along the streak
const STREAK_LENGTH = 7;
const STREAK_SLOPE = 0.45; // rows per col

const STAR_BRIGHT = '#e8e4d8';
const STAR_MID = '#a8a494';
const STAR_DIM = '#5c5a52';

interface Star {
  col: number;
  phase: number;
  row: number;
  speed: number;
}

interface Streak {
  dir: 1 | -1;
  distance: number;
  x: number;
  y: number;
}

export class StarsSystem implements WeatherSystem {
  private stars: Star[] = [];
  private streak: Streak | null = null;
  private skyRows = 0;
  private cols = 0;
  private veiled = false;

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.skyRows = Math.max(0, Math.floor(rows * SKY_FRACTION));
    this.streak = null;
    this.stars = [];

    for (let gy = 0; gy * CELL_H < this.skyRows; gy++) {
      for (let gx = 0; gx * CELL_W < cols; gx++) {
        if (Math.random() > OCCUPANCY) continue;
        this.stars.push({
          col: gx * CELL_W + Math.floor(Math.random() * CELL_W),
          phase: Math.random() * Math.PI * 2,
          row: gy * CELL_H + Math.floor(Math.random() * CELL_H),
          speed: TWINKLE_SPEED_MIN + Math.random() * TWINKLE_SPEED_VAR,
        });
      }
    }
  }

  configure(weather: WeatherData): void {
    // heavy sky hides the stars even at night
    const heavy: WeatherCondition[] = ['overcast', 'heavy-rain', 'heavy-snow', 'thunderstorm'];
    this.veiled = heavy.includes(weather.condition);
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const star of this.stars) star.phase += star.speed * dtSec;

    if (this.streak) {
      this.streak.distance += SHOOTING_SPEED * dtSec;
      this.streak.x += SHOOTING_SPEED * dtSec * this.streak.dir;
      this.streak.y += SHOOTING_SPEED * dtSec * STREAK_SLOPE;
      if (
        this.streak.y > this.skyRows + STREAK_LENGTH ||
        this.streak.x < -STREAK_LENGTH ||
        this.streak.x > this.cols + STREAK_LENGTH
      ) {
        this.streak = null;
      }
    } else if (
      !this.veiled &&
      this.skyRows > 6 &&
      Math.random() < SHOOTING_CHANCE_PER_SEC * dtSec
    ) {
      this.streak = {
        dir: Math.random() < 0.5 ? 1 : -1,
        distance: 0,
        x: this.cols * (0.15 + Math.random() * 0.7),
        y: 1 + Math.random() * this.skyRows * 0.4,
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
    if (this.veiled) return;

    for (const star of this.stars) {
      if (star.col >= cols || star.row >= rows) continue;
      const s = Math.sin(star.phase);
      if (s < DIM_CUT) {
        ctx.fillStyle = STAR_DIM;
        ctx.fillText('.', star.col * charW, (star.row + 1) * charH);
      } else if (s > BRIGHT_CUT) {
        ctx.fillStyle = STAR_BRIGHT;
        ctx.fillText('+', star.col * charW, (star.row + 1) * charH);
      } else {
        ctx.fillStyle = STAR_MID;
        ctx.fillText('.', star.col * charW, (star.row + 1) * charH);
      }
    }

    if (this.streak) {
      for (let i = 0; i < STREAK_LENGTH; i++) {
        const col = Math.round(this.streak.x - i * this.streak.dir);
        const row = Math.round(this.streak.y - i * STREAK_SLOPE);
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        ctx.fillStyle = i === 0 ? STAR_BRIGHT : i < 3 ? STAR_MID : STAR_DIM;
        ctx.fillText(i === 0 ? '*' : "'", col * charW, (row + 1) * charH);
      }
    }
  }
}
