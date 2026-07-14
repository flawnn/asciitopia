import type { GeoLocation, WeatherCondition, WeatherData, WeatherProvider } from './types.js';

const DEFAULT_CACHE_TTL_SECONDS = 900;

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS =
  'weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,is_day,precipitation';

/** WMO 4677 weather code groups → scene condition (factual code table). */
const conditionForWmoCode = (code: number): WeatherCondition => {
  if (code <= 0) return 'clear';
  if (code <= 2) return 'partly-cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 56 && code <= 63) return 'rain';
  if (code >= 64 && code <= 67) return 'heavy-rain';
  if (code >= 71 && code <= 73) return 'snow';
  if (code >= 74 && code <= 77) return 'heavy-snow';
  if (code >= 80 && code <= 82) return 'heavy-rain';
  if (code === 85) return 'snow';
  if (code === 86) return 'heavy-snow';
  if (code >= 95) return 'thunderstorm';
  return 'clear';
};

interface OpenMeteoCurrent {
  weather_code: number;
  temperature_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  is_day: number;
  precipitation: number;
}

/** Default provider: Open-Meteo current-conditions endpoint (no API key).
 *  Caches for cacheTtlSeconds and never fetches concurrently; on failure it
 *  answers with the last good data (or null before the first success). */
export class OpenMeteoProvider implements WeatherProvider {
  private readonly location: GeoLocation;
  private readonly ttlMs: number;
  private cached: WeatherData | null = null;
  private cachedAt = 0;
  private inFlight: Promise<WeatherData | null> | null = null;

  constructor(location: GeoLocation, options: { cacheTtlSeconds?: number } = {}) {
    this.location = location;
    this.ttlMs = (options.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS) * 1000;
  }

  getWeather(): Promise<WeatherData | null> {
    if (this.cached && Date.now() - this.cachedAt < this.ttlMs) {
      return Promise.resolve(this.cached);
    }
    this.inFlight ??= this.fetchCurrent().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async fetchCurrent(): Promise<WeatherData | null> {
    try {
      const url = `${ENDPOINT}?latitude=${this.location.lat}&longitude=${this.location.lng}&current=${CURRENT_FIELDS}`;
      const res = await fetch(url);
      if (!res.ok) return this.cached;

      const body = (await res.json()) as { current?: OpenMeteoCurrent };
      const current = body.current;
      if (!current) return this.cached;

      this.cached = {
        condition: conditionForWmoCode(current.weather_code),
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        isDay: current.is_day === 1,
        precipitation: current.precipitation,
      };
      this.cachedAt = Date.now();
      return this.cached;
    } catch {
      return this.cached;
    }
  }
}
