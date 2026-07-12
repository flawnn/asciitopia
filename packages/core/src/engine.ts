import type { AsciiPattern } from './types.js';

/**
 * Engine configuration.
 * Placeholder: shape only, behavior to follow.
 */
export interface EngineOptions {
  /** CSS font-family list, WITHOUT size. Default: '"Fira Mono", "Consolas", monospace' */
  font?: string;
  /** Font size in px. Default: 16 */
  fontSize?: number;
  /** Simulation/render cap in frames per second. Default: undefined = run at the
   *  display's requestAnimationFrame rate. */
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
 * Placeholder: class shape and no-op bodies only. The real rAF loop, resize
 * handling, and char-metric measurement land next.
 */
export class CanvasEngine {
  constructor(canvas: HTMLCanvasElement, options?: EngineOptions) {
    void canvas;
    void options;
  }

  setPattern(pattern: AsciiPattern): void {
    void pattern;
  }

  resize(width: number, height: number): void {
    void width;
    void height;
  }

  start(): void {}

  stop(): void {}

  destroy(): void {}
}
