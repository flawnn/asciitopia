// Public surface of "@asciitopia/core/weather" — subpath-only by design,
// never re-exported from the package root (keeps fetch-capable code opt-in).

export { OpenMeteoProvider } from './open-meteo.js';
export { DEFAULT_WEATHER_CONFIG, WeatherPattern } from './weather-pattern.js';
export type { WeatherConfig } from './weather-pattern.js';
export type { GeoLocation, WeatherCondition, WeatherData, WeatherProvider } from './types.js';
