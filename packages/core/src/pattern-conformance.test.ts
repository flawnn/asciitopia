import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { patterns } from './registry.js';
import type { AsciiPattern } from './types.js';

// Every registry entry passes the same contract checks — a contributed
// pattern is covered by registering it, no per-pattern tests needed.

const FRAMES = 100;
const COLS = 80;
const ROWS = 24;
const CHAR_W = 8;
const CHAR_H = 16;

interface RecordingCtx {
  ctx: CanvasRenderingContext2D;
  numericArgs: number[];
}

const createRecordingCtx = (): RecordingCtx => {
  const numericArgs: number[] = [];
  const record = (...args: unknown[]): void => {
    for (const arg of args) {
      if (typeof arg === 'number') numericArgs.push(arg);
    }
  };
  const ctx = {
    fillStyle: '',
    fillText: record,
    fillRect: record,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, numericArgs };
};

const runFrames = (pattern: AsciiPattern, ctx: CanvasRenderingContext2D): void => {
  for (let i = 0; i < FRAMES; i++) {
    pattern.update(16);
    pattern.render(ctx, COLS, ROWS, CHAR_W, CHAR_H);
  }
};

// mulberry32 — seeded Math.random so probabilistic spawns (e.g. rain's
// off-screen stagger) can't flake the draw-call assertions
const seededRandom = (seed: number) => (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(1));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each(
  patterns.map((entry) => [entry.id, entry] as const),
)('pattern conformance: %s', (_id, entry) => {
  it('constructs with no config and with {}', () => {
    expect(() => entry.create()).not.toThrow();
    expect(() => entry.create({})).not.toThrow();
  });

  it('inits at grid extremes (1×1, 500×200)', () => {
    const pattern = entry.create();

    expect(() => {
      pattern.init(1, 1);
      pattern.init(500, 200);
    }).not.toThrow();
  });

  it(`survives a ${FRAMES}-frame update(16)/render run`, () => {
    const pattern = entry.create();
    const { ctx } = createRecordingCtx();

    expect(() => {
      pattern.init(COLS, ROWS);
      runFrames(pattern, ctx);
    }).not.toThrow();
  });

  it('tolerates dt edges: update(0) and update(100)', () => {
    const pattern = entry.create();
    const { ctx } = createRecordingCtx();

    expect(() => {
      pattern.init(COLS, ROWS);
      pattern.update(0);
      pattern.render(ctx, COLS, ROWS, CHAR_W, CHAR_H);
      pattern.update(100);
      pattern.render(ctx, COLS, ROWS, CHAR_W, CHAR_H);
    }).not.toThrow();
  });

  it(`never writes NaN to the canvas over the ${FRAMES}-frame run`, () => {
    const pattern = entry.create();
    const { ctx, numericArgs } = createRecordingCtx();

    pattern.init(COLS, ROWS);
    runFrames(pattern, ctx);

    // non-empty, or the NaN check passes vacuously
    expect(numericArgs.length).toBeGreaterThan(0);
    expect(numericArgs.filter(Number.isNaN)).toEqual([]);
  });

  it('dispose (when present) is idempotent', () => {
    const pattern = entry.create();
    pattern.init(COLS, ROWS);

    expect(() => {
      pattern.dispose?.();
      pattern.dispose?.();
    }).not.toThrow();
  });
});
