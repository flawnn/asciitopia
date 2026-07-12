import type { AsciiPattern } from '../types.js';

/**
 * Placeholder: class shape only. RainConfig and DEFAULT_RAIN_CONFIG land
 * with the real implementation.
 */
export class RainPattern implements AsciiPattern {
  init(cols: number, rows: number): void {
    void cols;
    void rows;
  }

  update(dt: number): void {
    void dt;
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    void ctx;
    void cols;
    void rows;
    void charW;
    void charH;
  }
}
