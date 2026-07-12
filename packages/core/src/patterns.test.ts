import { describe, expect, it } from 'vitest';
import { patterns } from './registry.js';

// jsdom has no real canvas backend, so patterns render against a minimal
// 2D-context mock — they only ever touch fillStyle and fillText.
const createMockCtx = (): CanvasRenderingContext2D =>
  ({
    fillStyle: '',
    fillText: () => {},
  }) as unknown as CanvasRenderingContext2D;

// Smoke test per pattern: defaults-construct, init, a few update ticks, render.
// Deep behavior/visual tests are out of scope here — this guards the
// AsciiPattern contract and crash-free defaults.
describe.each(patterns.map((entry) => [entry.id, entry] as const))('%s', (_id, entry) => {
  it('runs init(80, 24) → update(16) ×3 → render without throwing', () => {
    const pattern = entry.create();

    expect(() => {
      pattern.init(80, 24);
      pattern.update(16);
      pattern.update(16);
      pattern.update(16);
      pattern.render(createMockCtx(), 80, 24, 8, 16);
    }).not.toThrow();
  });

  it('survives a 1×1 grid', () => {
    const pattern = entry.create();

    expect(() => {
      pattern.init(1, 1);
      pattern.update(16);
      pattern.render(createMockCtx(), 1, 1, 8, 16);
    }).not.toThrow();
  });

  it('tolerates update(0)', () => {
    const pattern = entry.create();

    expect(() => {
      pattern.init(80, 24);
      pattern.update(0);
      pattern.render(createMockCtx(), 80, 24, 8, 16);
    }).not.toThrow();
  });
});
