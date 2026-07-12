import { AuroraPattern, DEFAULT_AURORA_CONFIG } from './patterns/aurora.js';
import { DEFAULT_FIRE_CONFIG, FirePattern } from './patterns/fire.js';
import { DEFAULT_RAIN_CONFIG, RainPattern } from './patterns/rain.js';
import { DEFAULT_SNOW_CONFIG, SnowPattern } from './patterns/snow.js';
import { DEFAULT_WAVE_CONFIG, WavePattern } from './patterns/waves.js';
import type { AsciiPattern } from './types.js';

// --- types ---

export type PatternId = 'fire' | 'rain' | 'snow' | 'waves' | 'aurora';

export interface PatternRegistryEntry<C extends object = Record<string, unknown>> {
  readonly id: PatternId;
  /** Human-readable display name, e.g. 'Fire'. */
  readonly name: string;
  /** One-liner for the gallery card / docs table. */
  readonly description: string;
  /** The pattern's exported DEFAULT_XXX_CONFIG (drives gallery knobs + docs). */
  readonly configDefaults: Readonly<C>;
  /** Construct a fresh instance. Merges config over configDefaults. */
  create(config?: Partial<C>): AsciiPattern;
}

// --- helpers ---

// Entries are authored fully typed against their own Config, then widened to the
// registry's Record<string, unknown> shape. The narrow, type-safe path for
// consumers is the pattern class itself, not the registry.
const entry = <C extends object>(e: {
  id: PatternId;
  name: string;
  description: string;
  configDefaults: Readonly<C>;
  create(config?: Partial<C>): AsciiPattern;
}): PatternRegistryEntry => e as unknown as PatternRegistryEntry;

// --- registry ---

/** All registered patterns, in gallery display order. Static and readonly:
 *  no runtime register() — community patterns land in-repo via PR, and a mutable
 *  global registry would invite side-effect imports and defeat tree-shaking. */
export const patterns: ReadonlyArray<PatternRegistryEntry> = [
  /* @__PURE__ */ entry({
    id: 'fire',
    name: 'Fire',
    description: 'Rising flames with fuel modes, embers, sparks, and multiple palettes.',
    configDefaults: DEFAULT_FIRE_CONFIG,
    create: (config) => new FirePattern(config),
  }),
  /* @__PURE__ */ entry({
    id: 'rain',
    name: 'Rain',
    description: 'Falling drops with fading trails, impact flashes, and splash particles.',
    configDefaults: DEFAULT_RAIN_CONFIG,
    create: (config) => new RainPattern(config),
  }),
  /* @__PURE__ */ entry({
    id: 'snow',
    name: 'Snow',
    description: 'Drifting flakes on two depth layers with sway and wind.',
    configDefaults: DEFAULT_SNOW_CONFIG,
    create: (config) => new SnowPattern(config),
  }),
  /* @__PURE__ */ entry({
    id: 'waves',
    name: 'Waves',
    description: 'Layered sine-and-noise ocean swell in ocean or mono colors.',
    configDefaults: DEFAULT_WAVE_CONFIG,
    create: (config) => new WavePattern(config),
  }),
  /* @__PURE__ */ entry({
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights from drifting fractal noise.',
    configDefaults: DEFAULT_AURORA_CONFIG,
    create: (config) => new AuroraPattern(config),
  }),
];

/** Lookup by id. Returns undefined for unknown ids (accepts plain string so apps
 *  can pass user/persisted input without casting). */
export const getPattern = (id: string): PatternRegistryEntry | undefined =>
  patterns.find((e) => e.id === id);

/** Convenience: getPattern(id)?.create(config). Returns undefined for unknown ids. */
export const createPattern = (
  id: string,
  config?: Record<string, unknown>,
): AsciiPattern | undefined => getPattern(id)?.create(config);
