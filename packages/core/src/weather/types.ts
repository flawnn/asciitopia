// --- public data types ---

export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'heavy-snow'
  | 'thunderstorm';

export interface WeatherData {
  condition: WeatherCondition;
  /** °C */
  temperature: number;
  /** km/h */
  windSpeed: number;
  /** degrees, meteorological (wind FROM this direction) */
  windDirection: number;
  isDay: boolean;
  /** mm */
  precipitation: number;
}

/** Core-owned location. Display names are an app concern; providers only need coordinates. */
export interface GeoLocation {
  lat: number;
  lng: number;
}

/** Anything that can answer "what's the weather right now".
 *  null = "no data yet / fetch failed, keep last known". */
export interface WeatherProvider {
  getWeather(): Promise<WeatherData | null>;
}

// --- internal composition (not exported from the package) ---

/** Fixed points of the drawn scene that living systems attach to. */
export interface SceneAnchors {
  /** Column the chimney mouth sits in. */
  chimneyCol: number;
  /** Row just above the chimney mouth — smoke spawns here. */
  chimneyRow: number;
  /** Top row of the ground band (the grass line everything stands on). */
  groundRow: number;
}

/** One layer of the weather scene. Same lifecycle as AsciiPattern, plus a
 *  configure() hook the orchestrator calls whenever fresh weather arrives. */
export interface WeatherSystem {
  init(cols: number, rows: number): void;
  update(dt: number): void;
  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void;
  configure?(weather: WeatherData): void;
}
