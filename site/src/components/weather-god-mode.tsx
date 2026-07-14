import type { WeatherCondition, WeatherData } from '@asciitopia/core/weather';
import type { SliderHint } from '../lib/control-hints';
import { Slider } from './controls';

// mirrors the WeatherCondition union — typed so drift breaks the build
const CONDITIONS: readonly WeatherCondition[] = [
  'clear',
  'partly-cloudy',
  'overcast',
  'fog',
  'drizzle',
  'rain',
  'heavy-rain',
  'snow',
  'heavy-snow',
  'thunderstorm',
];

const TEMP_HINT: SliderHint = { kind: 'slider', min: -10, max: 35, step: 1 };
const WIND_HINT: SliderHint = { kind: 'slider', min: 0, max: 40, step: 1 };

type LabConfig = Record<string, unknown>;

/** Override = fallbackWeather built from the knobs + the demo reel pinned off.
 *  null hands the scene back to the reel. */
export const applyWeatherOverride = (
  config: LabConfig,
  defaults: Readonly<LabConfig>,
  weather: WeatherData | null,
): LabConfig => {
  if (weather) return { ...config, fallbackWeather: weather, demoReel: false };
  const { demoReel: _off, ...rest } = config;
  return { ...rest, fallbackWeather: defaults.fallbackWeather };
};

export interface WeatherGodModeProps {
  config: LabConfig;
  defaults: Readonly<LabConfig>;
  onOverride: (weather: WeatherData | null) => void;
}

/** Weather-only lab extension: force condition / time of day / temperature /
 *  wind instead of riding the demo reel. */
export const WeatherGodMode = ({ config, defaults, onOverride }: WeatherGodModeProps) => {
  const active = config.demoReel === false;
  const weather = (config.fallbackWeather ?? defaults.fallbackWeather) as WeatherData;

  const patch = (changes: Partial<WeatherData>): void => onOverride({ ...weather, ...changes });

  return (
    <div className="controls">
      <div className="field">
        <div className="field__row">
          <span className="field__name">condition</span>
        </div>
        <select
          onChange={(e) =>
            e.target.value === 'auto'
              ? onOverride(null)
              : patch({ condition: e.target.value as WeatherCondition })
          }
          value={active ? weather.condition : 'auto'}
        >
          <option value="auto">auto (demo reel)</option>
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </select>
      </div>

      {active && (
        <>
          <label className="field field--toggle">
            <span className="field__name">night</span>
            <input
              checked={!weather.isDay}
              onChange={(e) => patch({ isDay: !e.target.checked })}
              type="checkbox"
            />
            <span aria-hidden="true" className="toggle" />
          </label>

          <div className="field">
            <div className="field__row">
              <span className="field__name">temperature</span>
              <span className="field__value">{weather.temperature}°C</span>
            </div>
            <Slider
              hint={TEMP_HINT}
              onInput={(temperature) => patch({ temperature })}
              value={weather.temperature}
            />
          </div>

          <div className="field">
            <div className="field__row">
              <span className="field__name">wind</span>
              <span className="field__value">{weather.windSpeed} km/h</span>
            </div>
            <Slider
              hint={WIND_HINT}
              onInput={(windSpeed) => patch({ windSpeed })}
              value={weather.windSpeed}
            />
          </div>
        </>
      )}
    </div>
  );
};
