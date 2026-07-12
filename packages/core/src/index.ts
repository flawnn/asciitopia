// Root export surface.
// bonsai and weather are intentionally excluded from this release and must
// never be re-exported from root when they do land (they're subpath-only).

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
