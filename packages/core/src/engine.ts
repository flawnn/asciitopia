import type { AsciiPattern } from './types.js';

/**
 * Engine configuration. Defaults reproduce the classic behavior exactly:
 * 16px "Fira Mono" stack, 100 ms dt cap, pure rAF cadence.
 */
export interface EngineOptions {
  /** CSS font-family list, WITHOUT size. Default: '"Fira Mono", "Consolas", monospace' */
  font?: string;
  /** Font size in px. Default: 16 */
  fontSize?: number;
  /** Simulation/render cap in frames per second. Default: undefined = run at the
   *  display's requestAnimationFrame rate. When set, the engine skips rAF ticks
   *  until 1000/fps ms have elapsed. */
  fps?: number;
  /** Maximum dt (ms) passed to pattern.update(). Default: 100 */
  maxDt?: number;
}

export const DEFAULT_ENGINE_OPTIONS: Required<Omit<EngineOptions, 'fps'>> = {
  font: '"Fira Mono", "Consolas", monospace',
  fontSize: 16,
  maxDt: 100,
};

/**
 * Drives an AsciiPattern against a canvas via requestAnimationFrame.
 * Per tick: capped dt → pattern.update(dt) → clearRect → reapply font →
 * recompute cols/rows from the canvas size → pattern.render(...).
 * The engine never paints a background and never sets fillStyle — patterns
 * own all color; the canvas stays transparent after clearRect.
 */
export class CanvasEngine {
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private pattern: AsciiPattern | null = null;
  private charW = 0;
  private charH = 0;
  private readonly font: string;
  private readonly maxDt: number;
  /** ms per rendered frame when fps throttling is on; null = pure rAF cadence. */
  private readonly frameInterval: number | null;

  /** Throws if a 2D context cannot be acquired. Measures charW via
   *  measureText('M').width and charH via fontBoundingBoxAscent + fontBoundingBoxDescent. */
  constructor(
    private canvas: HTMLCanvasElement,
    options: EngineOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;

    const font = options.font ?? DEFAULT_ENGINE_OPTIONS.font;
    const fontSize = options.fontSize ?? DEFAULT_ENGINE_OPTIONS.fontSize;
    this.font = `${fontSize}px ${font}`;
    this.maxDt = options.maxDt ?? DEFAULT_ENGINE_OPTIONS.maxDt;
    this.frameInterval = options.fps !== undefined ? 1000 / options.fps : null;

    this.applyFont();
    const m = this.ctx.measureText('M');
    this.charW = m.width;
    this.charH = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
  }

  /** Dispose the previous pattern (if any), init the new one at the current grid,
   *  and adopt it. Safe to call before start(). */
  setPattern(pattern: AsciiPattern): void {
    this.pattern?.dispose?.();
    const cols = Math.floor(this.canvas.width / this.charW);
    const rows = Math.floor(this.canvas.height / this.charH);
    pattern.init(cols, rows);
    this.pattern = pattern;
  }

  /** Set canvas pixel dimensions, reapply the font, re-init the current pattern
   *  at the new grid (floor(width/charW) × floor(height/charH)). */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.applyFont();

    if (this.pattern) {
      const cols = Math.floor(width / this.charW);
      const rows = Math.floor(height / this.charH);
      this.pattern.init(cols, rows);
    }
  }

  /** Begin the rAF loop and register the document visibilitychange handler
   *  (returning to a visible tab resets the dt clock so the next frame gets dt = 0). */
  start(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  /** Stop the rAF loop and unregister the visibility handler. Does NOT dispose the
   *  pattern — start() resumes where it left off. */
  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  /** stop() + dispose the current pattern + drop the reference. The engine must
   *  not be reused afterwards. */
  destroy(): void {
    this.stop();
    this.pattern?.dispose?.();
    this.pattern = null;
  }

  private applyFont(): void {
    this.ctx.font = this.font;
  }

  private onVisibilityChange = (): void => {
    if (!document.hidden) this.lastTime = 0;
  };

  private tick = (timestamp: number): void => {
    // fps throttle: skip this rAF tick entirely until the frame budget has elapsed.
    // dt keeps accumulating from lastTime, so simulation speed is unaffected.
    if (
      this.frameInterval !== null &&
      this.lastTime !== 0 &&
      timestamp - this.lastTime < this.frameInterval
    ) {
      this.animFrameId = requestAnimationFrame(this.tick);
      return;
    }

    const dt = this.lastTime === 0 ? 0 : Math.min(timestamp - this.lastTime, this.maxDt);
    this.lastTime = timestamp;

    this.pattern?.update(dt);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.applyFont();

    const cols = Math.floor(this.canvas.width / this.charW);
    const rows = Math.floor(this.canvas.height / this.charH);
    this.pattern?.render(this.ctx, cols, rows, this.charW, this.charH);

    this.animFrameId = requestAnimationFrame(this.tick);
  };
}
