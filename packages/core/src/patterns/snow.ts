import type { AsciiPattern } from '../types.js';

/**
 * Placeholder: class shape only. SnowConfig and DEFAULT_SNOW_CONFIG land
 * with the real implementation.
 */
export class SnowPattern implements AsciiPattern {
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
