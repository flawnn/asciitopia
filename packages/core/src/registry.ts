import type { AsciiPattern } from './types.js';

/**
 * Placeholder: registry shape only. Entries for fire/rain/snow/waves/aurora
 * (each with configDefaults + create()) are wired once the patterns'
 * Config interfaces exist.
 */
export type PatternId = 'fire' | 'rain' | 'snow' | 'waves' | 'aurora';

export interface PatternRegistryEntry<C extends object = Record<string, unknown>> {
  readonly id: PatternId;
  readonly name: string;
  readonly description: string;
  readonly configDefaults: Readonly<C>;
  create(config?: Partial<C>): AsciiPattern;
}

export const patterns: ReadonlyArray<PatternRegistryEntry> = [];

export const getPattern = (id: string): PatternRegistryEntry | undefined =>
  patterns.find((entry) => entry.id === id);

export const createPattern = (
  id: string,
  config?: Record<string, unknown>,
): AsciiPattern | undefined => getPattern(id)?.create(config);
