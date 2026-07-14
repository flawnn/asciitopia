import type { WeatherSystem } from '../types.js';

// Rolling fog: layered drift bands whose density comes from summed sines, so
// banks thicken and thin as they slide past each other.

const BAND_COUNT = 5;
const BAND_ZONE_TOP = 0.35; // bands occupy the lower sky and the scene
const SPEED_MIN = 1.2; // cols/sec
const SPEED_VAR = 2.4;
const GLYPHS = ['-', '~', ':'] as const;
const TONES = ['#565c64', '#6a707a', '#7e858f'] as const;

interface Band {
  glyph: string;
  offset: number;
  rowFrac: number;
  speed: number;
  tone: string;
  waveA: number; // wavelengths in columns
  waveB: number;
}

export class FogSystem implements WeatherSystem {
  private bands: Band[] = [];
  private rows = 0;

  init(_cols: number, rows: number): void {
    this.rows = rows;
    this.bands = Array.from({ length: BAND_COUNT }, (_, i) => ({
      glyph: GLYPHS[i % GLYPHS.length],
      offset: Math.random() * 1000,
      rowFrac: BAND_ZONE_TOP + ((i + Math.random() * 0.6) / BAND_COUNT) * (1 - BAND_ZONE_TOP),
      speed: (SPEED_MIN + Math.random() * SPEED_VAR) * (i % 2 === 0 ? 1 : -1),
      tone: TONES[i % TONES.length],
      waveA: 11 + Math.random() * 10,
      waveB: 23 + Math.random() * 14,
    }));
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    for (const band of this.bands) band.offset += band.speed * dtSec;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const band of this.bands) {
      const row = Math.round(band.rowFrac * Math.min(rows, this.rows || rows));
      if (row < 0 || row >= rows) continue;
      const y = (row + 1) * charH;
      ctx.fillStyle = band.tone;
      for (let col = 0; col < cols; col++) {
        const t = col + band.offset;
        const density =
          Math.sin((t / band.waveA) * Math.PI * 2) + Math.sin((t / band.waveB) * Math.PI * 2);
        if (density > 0.35) ctx.fillText(band.glyph, col * charW, y);
        else if (density > -0.1 && col % 2 === 0) ctx.fillText('.', col * charW, y);
      }
    }
  }
}
