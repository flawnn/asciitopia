/**
 * The community contribution contract every pattern implements. Its
 * stability matters more than elegance — breaking it is a major version.
 */
export interface AsciiPattern {
  /** Called by the engine on setPattern() and on every resize, with the new grid size.
   *  Must fully (re)initialize internal state. */
  init(cols: number, rows: number): void;

  /** Advance simulation by dt MILLISECONDS.
   *  dt semantics: wall-clock elapsed time since the previous frame, capped by the
   *  engine at maxDt (default 100 ms) so tab-switches / long GC pauses never produce
   *  a giant step. The first frame after start() or after the tab becomes visible
   *  again delivers dt = 0. Patterns convert to seconds themselves (dt / 1000). */
  update(dt: number): void;

  /** Draw one frame. The engine has already cleared the canvas and set ctx.font.
   *  (col, row) cell → pixel: x = col * charW, y = row * charH (patterns choose
   *  their own baseline convention; existing patterns use (row + 1) * charH or
   *  row * charH). Patterns own ALL color: set ctx.fillStyle before fillText. */
  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void;

  /** Optional cleanup (timers, fetches, listeners). Called by the engine when the
   *  pattern is replaced via setPattern(), and by engine.destroy(). */
  dispose?(): void;
}
