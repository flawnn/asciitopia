import type { AsciiPattern } from '../types.js';

/**
 * Placeholder: class shape only. AuroraConfig and DEFAULT_AURORA_CONFIG land
 * with the real implementation, which uses simplex-noise for its noise field.
 */
export class AuroraPattern implements AsciiPattern {
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
