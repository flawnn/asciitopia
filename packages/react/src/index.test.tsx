import { describe, expect, it } from 'vitest';
import { AsciiBackground } from './index.js';

// Placeholder smoke test wiring the runner. Real render/behavior tests
// (mount effect, ResizeObserver, pattern id resolution) land alongside
// the implementation.
describe('@asciitopia/react skeleton', () => {
  it('exports the AsciiBackground component', () => {
    expect(typeof AsciiBackground).toBe('function');
  });
});
