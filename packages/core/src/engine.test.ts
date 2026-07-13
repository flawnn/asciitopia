import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { CanvasEngine } from './engine.js';
import type { AsciiPattern } from './types.js';

// charW = 8, charH = 12 + 4 = 16
const createMockCtx = (): CanvasRenderingContext2D =>
  ({
    font: '',
    fillStyle: '',
    fillText: () => {},
    clearRect: () => {},
    measureText: () => ({ width: 8, fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 4 }),
  }) as unknown as CanvasRenderingContext2D;

const createStubPattern = () => ({
  init: vi.fn<AsciiPattern['init']>(),
  update: vi.fn<AsciiPattern['update']>(),
  render: vi.fn<AsciiPattern['render']>(),
  dispose: vi.fn<() => void>(),
});

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

// the engine keeps at most one pending rAF callback; tick() fires it with a controlled timestamp
let pendingFrame: FrameRequestCallback | null;
let getContextSpy: MockInstance;

const tick = (timestamp: number): void => {
  const frame = pendingFrame;
  pendingFrame = null;
  frame?.(timestamp);
};

beforeEach(() => {
  pendingFrame = null;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: FrameRequestCallback) => {
      pendingFrame = cb;
      return 1;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn(() => {
      pendingFrame = null;
    }),
  );
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => createMockCtx());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CanvasEngine', () => {
  it('derives the grid from canvas size and measured char metrics', () => {
    const engine = new CanvasEngine(createCanvas(800, 600));
    const pattern = createStubPattern();

    engine.setPattern(pattern);

    // floor(800 / 8) × floor(600 / 16)
    expect(pattern.init).toHaveBeenCalledWith(100, 37);
  });

  it('caps dt at maxDt across long rAF gaps', () => {
    const engine = new CanvasEngine(createCanvas(800, 600));
    const pattern = createStubPattern();
    engine.setPattern(pattern);

    engine.start();
    tick(1000);
    tick(6000);

    expect(pattern.update).toHaveBeenNthCalledWith(1, 0);
    expect(pattern.update).toHaveBeenNthCalledWith(2, 100);
  });

  it('setPattern disposes the previous pattern without recreating the engine', () => {
    const engine = new CanvasEngine(createCanvas(800, 600));
    const first = createStubPattern();
    const second = createStubPattern();

    engine.setPattern(first);
    engine.setPattern(second);

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.init).toHaveBeenCalledTimes(1);
    expect(getContextSpy).toHaveBeenCalledTimes(1);
  });

  it('destroy() stops the loop and is idempotent', () => {
    const engine = new CanvasEngine(createCanvas(800, 600));
    const pattern = createStubPattern();
    engine.setPattern(pattern);
    engine.start();
    tick(1000);
    expect(pattern.render).toHaveBeenCalledTimes(1);

    engine.destroy();
    expect(() => engine.destroy()).not.toThrow();

    expect(pendingFrame).toBeNull();
    expect(pattern.render).toHaveBeenCalledTimes(1);
    expect(pattern.dispose).toHaveBeenCalledTimes(1);
  });

  it('fps throttle skips ticks deterministically until the frame budget elapses', () => {
    const engine = new CanvasEngine(createCanvas(800, 600), { fps: 30 });
    const pattern = createStubPattern();
    engine.setPattern(pattern);
    engine.start();

    // ~60 Hz as integer 17 ms steps — exact arithmetic at the 1000/30 ms budget,
    // so exactly every second tick renders (34 ≥ budget, 17 < budget)
    const rendered: number[] = [];
    for (const t of [1000, 1017, 1034, 1051, 1068, 1085, 1102]) {
      const before = pattern.render.mock.calls.length;
      tick(t);
      if (pattern.render.mock.calls.length > before) rendered.push(t);
    }

    expect(rendered).toEqual([1000, 1034, 1068, 1102]);
  });
});
