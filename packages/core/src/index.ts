// Root export surface.
// weather is intentionally excluded until its clean-room rewrite lands and
// must never be re-exported from root before then (it'll be subpath-only).

export type { AsciiPattern } from './types.js';

export { CanvasEngine, DEFAULT_ENGINE_OPTIONS } from './engine.js';
export type { EngineOptions } from './engine.js';

export { createPattern, getPattern, patterns } from './registry.js';
export type { PatternId, PatternRegistryEntry } from './registry.js';

export { DEFAULT_FIRE_CONFIG, FirePattern } from './patterns/fire.js';
export type { FireCharset, FireConfig, FireMode, FirePalette } from './patterns/fire.js';

export { DEFAULT_RAIN_CONFIG, RainPattern } from './patterns/rain.js';
export type { RainConfig } from './patterns/rain.js';

export { DEFAULT_SNOW_CONFIG, SnowPattern } from './patterns/snow.js';
export type { SnowConfig } from './patterns/snow.js';

export { DEFAULT_WAVE_CONFIG, WavePattern } from './patterns/waves.js';
export type { WaveConfig } from './patterns/waves.js';

export { AuroraPattern, DEFAULT_AURORA_CONFIG } from './patterns/aurora.js';
export type { AuroraConfig } from './patterns/aurora.js';

export { BonsaiPattern, DEFAULT_BONSAI_CONFIG } from './patterns/bonsai.js';
export type { BonsaiConfig, BonsaiPalette, BonsaiPot } from './patterns/bonsai.js';
