// Root export surface. Grows as pattern Config types/defaults land.
// bonsai and weather are intentionally excluded from this release and must
// never be re-exported from root when they do land (they're subpath-only).

export type { AsciiPattern } from './types.js';

export { CanvasEngine, DEFAULT_ENGINE_OPTIONS } from './engine.js';
export type { EngineOptions } from './engine.js';

export { createPattern, getPattern, patterns } from './registry.js';
export type { PatternId, PatternRegistryEntry } from './registry.js';

export { FirePattern } from './patterns/fire.js';
export { RainPattern } from './patterns/rain.js';
export { SnowPattern } from './patterns/snow.js';
export { WavePattern } from './patterns/waves.js';
export { AuroraPattern } from './patterns/aurora.js';
