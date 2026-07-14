// Inspired by weathr by Veirt (https://github.com/veirt/weathr).
// Scene art, systems, and constants are original to asciitopia — see ATTRIBUTION.md.
import type { AsciiPattern } from '../types.js';
import { OpenMeteoProvider } from './open-meteo.js';
import { AirplaneSystem } from './systems/airplane.js';
import { BirdSystem } from './systems/birds.js';
import { CloudSystem } from './systems/clouds.js';
import { FireflySystem } from './systems/fireflies.js';
import { FogSystem } from './systems/fog.js';
import { LeavesSystem } from './systems/leaves.js';
import { LightningSystem } from './systems/lightning.js';
import { MoonSystem } from './systems/moon.js';
import { RainSystem } from './systems/rain.js';
import { SceneSystem } from './systems/scene.js';
import { SmokeSystem } from './systems/smoke.js';
import { SnowSystem } from './systems/snow.js';
import { StarsSystem } from './systems/stars.js';
import { SunSystem } from './systems/sun.js';
import { TracesSystem } from './systems/traces.js';
import type { GeoLocation, WeatherData, WeatherProvider, WeatherSystem } from './types.js';

// --- config ---

export interface WeatherConfig {
  /** Where weather data comes from:
   *  - GeoLocation → wrapped in OpenMeteoProvider automatically
   *  - WeatherProvider → used as-is (injection seam)
   *  - null → no fetching, ever; the scene opens on fallbackWeather and
   *    then drifts through a gentle built-in cycle (rain, a clearing
   *    rainbow, night snow) so it stays alive without a data source.
   *  Default: null. */
  source: GeoLocation | WeatherProvider | null;
  /** Seconds between provider polls. Default 900. */
  pollIntervalSeconds: number;
  /** Scene shown before the first fetch resolves / when source is null.
   *  Default: a calm, warm, clear night — stars, moon, and fireflies. */
  fallbackWeather: WeatherData;
}

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  source: null,
  pollIntervalSeconds: 900,
  fallbackWeather: {
    condition: 'clear',
    temperature: 20,
    windSpeed: 5,
    windDirection: 0,
    isDay: false,
    precipitation: 0,
  },
};

const FIREFLY_MIN_TEMP = 15; // °C — warm enough for fireflies

// sourceless demo reel: written so every trace system gets its moment —
// puddles fill, a rainbow breaks, snow settles and holds through a cold night
interface DemoPhase {
  seconds: number;
  weather: Omit<WeatherData, 'precipitation'>;
}

const DEMO_PHASES: readonly DemoPhase[] = [
  {
    seconds: 35,
    weather: { condition: 'clear', temperature: 22, windSpeed: 8, windDirection: 250, isDay: true },
  },
  {
    seconds: 30,
    weather: {
      condition: 'partly-cloudy',
      temperature: 18,
      windSpeed: 14,
      windDirection: 240,
      isDay: true,
    },
  },
  {
    seconds: 45,
    weather: { condition: 'rain', temperature: 13, windSpeed: 18, windDirection: 235, isDay: true },
  },
  {
    seconds: 35,
    weather: {
      condition: 'partly-cloudy',
      temperature: 14,
      windSpeed: 10,
      windDirection: 250,
      isDay: true,
    },
  },
  {
    seconds: 25,
    weather: {
      condition: 'overcast',
      temperature: 6,
      windSpeed: 12,
      windDirection: 260,
      isDay: false,
    },
  },
  {
    seconds: 55,
    weather: {
      condition: 'heavy-snow',
      temperature: -2,
      windSpeed: 10,
      windDirection: 265,
      isDay: false,
    },
  },
  {
    seconds: 45,
    weather: {
      condition: 'clear',
      temperature: -4,
      windSpeed: 4,
      windDirection: 250,
      isDay: false,
    },
  },
];
const DEMO_OPENING_SECONDS = 50; // how long the fallbackWeather scene holds

const isProvider = (source: GeoLocation | WeatherProvider): source is WeatherProvider =>
  'getWeather' in source;

interface Layer {
  active: boolean;
  system: WeatherSystem;
}

// --- pattern ---

export class WeatherPattern implements AsciiPattern {
  private readonly config: WeatherConfig;
  private readonly provider: WeatherProvider | null;
  private weather: WeatherData;
  private pollTimer = 0;
  private polledOnce = false;
  private disposed = false;
  private demoIndex = -1; // -1 = still on the fallbackWeather opening
  private demoTimer = DEMO_OPENING_SECONDS;

  private readonly scene: SceneSystem;
  private readonly stars: Layer;
  private readonly moon: Layer;
  private readonly sun: Layer;
  private readonly clouds: Layer;
  private readonly birds: Layer;
  private readonly airplane: Layer;
  private readonly smoke: Layer;
  private readonly leaves: Layer;
  private readonly rain: Layer;
  private readonly snow: Layer;
  private readonly fog: Layer;
  private readonly fireflies: Layer;
  private readonly lightning: LightningSystem;
  private lightningActive = false;
  private readonly layers: Layer[];

  constructor(config: Partial<WeatherConfig> = {}) {
    this.config = { ...DEFAULT_WEATHER_CONFIG, ...config };
    this.weather = this.config.fallbackWeather;

    const source = this.config.source;
    this.provider =
      source === null ? null : isProvider(source) ? source : new OpenMeteoProvider(source);

    this.scene = new SceneSystem();
    const anchors = this.scene.anchors;
    this.stars = { active: false, system: new StarsSystem() };
    this.moon = { active: false, system: new MoonSystem() };
    this.sun = { active: false, system: new SunSystem() };
    this.clouds = { active: true, system: new CloudSystem() };
    this.birds = { active: false, system: new BirdSystem() };
    this.airplane = { active: true, system: new AirplaneSystem() };
    this.smoke = { active: true, system: new SmokeSystem(anchors) };
    this.leaves = { active: true, system: new LeavesSystem(anchors) };
    this.rain = { active: false, system: new RainSystem(anchors) };
    this.snow = { active: false, system: new SnowSystem(anchors) };
    this.fog = { active: false, system: new FogSystem() };
    this.fireflies = { active: false, system: new FireflySystem(anchors) };
    this.lightning = new LightningSystem(anchors);
    const traces = { active: true, system: new TracesSystem(this.scene) };

    // back to front: sky bodies, clouds, travelers, the scene itself,
    // things rising from it, weather falling in front, ground-level haze
    this.layers = [
      this.stars,
      this.moon,
      this.sun,
      this.clouds,
      this.birds,
      this.airplane,
      { active: true, system: this.scene },
      traces,
      this.smoke,
      this.leaves,
      this.rain,
      this.snow,
      this.fog,
      this.fireflies,
    ];
  }

  init(cols: number, rows: number): void {
    for (const layer of this.layers) layer.system.init(cols, rows);
    this.lightning.init(cols, rows);
    this.applyWeather(this.weather);
    this.pollTimer = 0;
    this.polledOnce = false;
    this.demoIndex = -1;
    this.demoTimer = DEMO_OPENING_SECONDS;
  }

  update(dt: number): void {
    if (this.provider) {
      this.pollTimer -= dt / 1000;
      if (!this.polledOnce || this.pollTimer <= 0) {
        this.polledOnce = true;
        this.pollTimer = this.config.pollIntervalSeconds;
        this.poll();
      }
    } else {
      this.advanceDemo(dt / 1000);
    }

    for (const layer of this.layers) {
      if (layer.active) layer.system.update(dt);
    }
    if (this.lightningActive) this.lightning.update(dt);
  }

  render(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    charW: number,
    charH: number,
  ): void {
    for (const layer of this.layers) {
      if (layer.active) layer.system.render(ctx, cols, rows, charW, charH);
    }
    if (this.lightningActive) {
      this.lightning.render(ctx, cols, rows, charW, charH);
      if (this.lightning.isFlashing()) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(0, 0, cols * charW, rows * charH);
      }
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  // --- weather plumbing ---

  /** Sourceless mode: walk the demo reel, then loop it (skipping the opening). */
  private advanceDemo(dtSec: number): void {
    this.demoTimer -= dtSec;
    if (this.demoTimer > 0) return;
    this.demoIndex = (this.demoIndex + 1) % DEMO_PHASES.length;
    const phase = DEMO_PHASES[this.demoIndex];
    this.demoTimer = phase.seconds;
    this.weather = { ...phase.weather, precipitation: 0 };
    this.applyWeather(this.weather);
  }

  private poll(): void {
    this.provider?.getWeather().then((data) => {
      if (data && !this.disposed) {
        this.weather = data;
        this.applyWeather(data);
      }
    });
  }

  private applyWeather(weather: WeatherData): void {
    const { condition, isDay, temperature } = weather;
    const calmSky = condition === 'clear' || condition === 'partly-cloudy';
    const raining =
      condition === 'drizzle' ||
      condition === 'rain' ||
      condition === 'heavy-rain' ||
      condition === 'thunderstorm';
    const snowing = condition === 'snow' || condition === 'heavy-snow';

    this.stars.active = !isDay;
    this.moon.active = !isDay;
    this.sun.active = isDay && calmSky;
    this.birds.active = isDay && calmSky;
    this.fireflies.active = !isDay && calmSky && temperature >= FIREFLY_MIN_TEMP;
    this.smoke.active = condition !== 'heavy-rain' && condition !== 'thunderstorm';
    this.leaves.active = !snowing;
    this.airplane.active = condition !== 'thunderstorm' && condition !== 'fog';
    this.rain.active = raining;
    this.snow.active = snowing;
    this.fog.active = condition === 'fog';
    this.lightningActive = condition === 'thunderstorm';

    for (const layer of this.layers) layer.system.configure?.(weather);
  }
}
