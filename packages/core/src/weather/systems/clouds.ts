import type { WeatherCondition, WeatherData, WeatherSystem } from '../types.js';

// Clouds as soft stipple masses (original shapes) drifting with the wind.

const CLOUD_SHAPES: readonly (readonly string[])[] = [
  ['  .:::.  ', ' ::::::: ', "  ':::'  "],
  ['   ..::::..   ', ' .::::::::::. ', " '::::::::::' ", "    '::::'    "],
  [
    '     ..:::::::..     ',
    '  .::::::::::::::..  ',
    ' ::::::::::::::::::: ',
    "  '::::::::::::::'   ",
  ],
];

const BAND_FRACTION = 0.34; // clouds live in the top band of the sky
const BASE_DRIFT = 0.6; // cols/sec with no wind
const WIND_DRIFT_DIVISOR = 16; // cols/sec per km/h of the east-west component
const WRAP_MARGIN = 24;

const COUNT_BY_SKY: Partial<Record<WeatherCondition, number>> = {
  clear: 1,
  'partly-cloudy': 3,
  overcast: 6,
};
const DEFAULT_COUNT = 4; // precipitation conditions keep a full sky

const DAY_TONE = '#9aa2ad';
const DAY_SHADE = '#6e7681';
const NIGHT_TONE = '#4c515c';
const NIGHT_SHADE = '#383c46';

interface Cloud {
  shape: readonly string[];
  x: number;
  y: number;
}

export class CloudSystem implements WeatherSystem {
  private clouds: Cloud[] = [];
  private cols = 0;
  private bandRows = 0;
  private drift = BASE_DRIFT;
  private count = COUNT_BY_SKY.clear ?? 1;
  private dark = false;
  private night = true;

  init(cols: number, rows: number): void {
    this.cols = cols;
    this.bandRows = Math.max(1, Math.floor(rows * BAND_FRACTION));
    this.populate(true);
  }

  configure(weather: WeatherData): void {
    this.count = COUNT_BY_SKY[weather.condition] ?? DEFAULT_COUNT;
    this.night = !weather.isDay;
    this.dark = weather.condition !== 'clear' && weather.condition !== 'partly-cloudy';

    const towardEast = -Math.sin((weather.windDirection * Math.PI) / 180);
    const speed = BASE_DRIFT + (Math.abs(towardEast) * weather.windSpeed) / WIND_DRIFT_DIVISOR;
    this.drift = towardEast >= 0 ? speed : -speed;

    this.populate(false);
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const cloud of this.clouds) {
      cloud.x += this.drift * dtSec;
      const w = cloud.shape[0].length;
      if (this.drift > 0 && cloud.x > this.cols + WRAP_MARGIN) {
        cloud.x = -w - Math.random() * WRAP_MARGIN;
        cloud.y = Math.random() * this.bandRows;
      } else if (this.drift < 0 && cloud.x < -w - WRAP_MARGIN) {
        cloud.x = this.cols + Math.random() * WRAP_MARGIN;
        cloud.y = Math.random() * this.bandRows;
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
    const body = this.night ? NIGHT_TONE : DAY_TONE;
    const shade = this.night ? NIGHT_SHADE : DAY_SHADE;

    for (const cloud of this.clouds) {
      const left = Math.round(cloud.x);
      const top = Math.round(cloud.y);
      for (let r = 0; r < cloud.shape.length; r++) {
        const line = cloud.shape[r];
        const row = top + r;
        if (row < 0 || row >= rows) continue;
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          if (char === ' ') continue;
          const col = left + c;
          if (col < 0 || col >= cols) continue;
          // undersides read heavier when the sky is loaded
          ctx.fillStyle = this.dark && r >= cloud.shape.length - 2 ? shade : body;
          ctx.fillText(char, col * charW, (row + 1) * charH);
        }
      }
    }
  }

  /** Grow/shrink toward the configured count; spread=true scatters across the width. */
  private populate(spread: boolean): void {
    while (this.clouds.length > this.count) this.clouds.pop();
    while (this.clouds.length < this.count) {
      const shape = CLOUD_SHAPES[Math.floor(Math.random() * CLOUD_SHAPES.length)];
      this.clouds.push({
        shape,
        x: spread || this.clouds.length === 0 ? Math.random() * this.cols : -shape[0].length,
        y: Math.random() * this.bandRows,
      });
    }
    if (spread) for (const cloud of this.clouds) cloud.x = Math.random() * this.cols;
  }
}
