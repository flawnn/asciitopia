import { describe, expect, it } from 'vitest';
import { FirePattern } from './patterns/fire.js';
import { createPattern, getPattern, patterns } from './registry.js';

describe('pattern registry', () => {
  it('registers the five shipped patterns in gallery display order', () => {
    expect(patterns.map((entry) => entry.id)).toEqual(['fire', 'rain', 'snow', 'waves', 'aurora']);
  });

  it('looks up entries by id', () => {
    expect(getPattern('fire')?.name).toBe('Fire');
    expect(getPattern('nope')).toBeUndefined();
  });

  it('creates configured instances via createPattern', () => {
    expect(createPattern('fire')).toBeInstanceOf(FirePattern);
    expect(createPattern('fire', { mode: 'campfire' })).toBeInstanceOf(FirePattern);
    expect(createPattern('nope')).toBeUndefined();
  });

  it('exposes each pattern defaults on its entry', () => {
    for (const entry of patterns) {
      expect(Object.keys(entry.configDefaults).length).toBeGreaterThan(0);
    }
  });
});
