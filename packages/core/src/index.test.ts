import { describe, expect, it } from 'vitest';
import { patterns } from './registry.js';

// Placeholder smoke test wiring the runner. Real per-pattern init/update/
// render tests against a mock 2D context land alongside the implementation.
describe('@asciitopia/core skeleton', () => {
  it('exposes a patterns registry', () => {
    expect(Array.isArray(patterns)).toBe(true);
  });
});
