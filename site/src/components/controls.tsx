import { resolveHint, type SliderHint } from '../lib/control-hints';

export interface ControlsProps {
  patternId: string;
  defaults: Readonly<Record<string, unknown>>;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

const isNumberPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number');

const fmt = (value: number): string => String(Number(value.toFixed(3)));

export interface SliderProps {
  hint: SliderHint;
  value: number;
  onInput: (value: number) => void;
}

export const Slider = ({ hint, value, onInput }: SliderProps) => (
  <input
    max={hint.max}
    min={hint.min}
    onChange={(e) => onInput(Number(e.target.value))}
    step={hint.step}
    type="range"
    value={value}
  />
);

/** One knob per configDefaults field: number → slider, boolean → toggle,
 *  hinted string union → select, [number, number] → min/max slider pair. */
export const Controls = ({ patternId, defaults, config, onChange }: ControlsProps) => (
  <div className="controls">
    {Object.entries(defaults).map(([key, defaultValue]) => {
      const value = config[key] ?? defaultValue;
      const hint = resolveHint(patternId, key, defaultValue);

      if (typeof defaultValue === 'boolean') {
        return (
          <label className="field field--toggle" key={key}>
            <span className="field__name">{key}</span>
            <input
              checked={Boolean(value)}
              onChange={(e) => onChange(key, e.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" className="toggle" />
          </label>
        );
      }

      if (typeof defaultValue === 'number' && hint?.kind === 'slider') {
        const num = typeof value === 'number' ? value : defaultValue;
        return (
          <div className="field" key={key}>
            <div className="field__row">
              <span className="field__name">{key}</span>
              <span className="field__value">{fmt(num)}</span>
            </div>
            <Slider hint={hint} onInput={(v) => onChange(key, v)} value={num} />
          </div>
        );
      }

      if (isNumberPair(defaultValue)) {
        const [lo, hi] = isNumberPair(value) ? value : defaultValue;
        const pairHint: SliderHint =
          hint?.kind === 'slider'
            ? hint
            : { kind: 'slider', min: 0, max: Math.max(hi, 1) * 4, step: 0.5 };
        return (
          <div className="field" key={key}>
            <div className="field__row">
              <span className="field__name">{key}</span>
              <span className="field__value">
                {fmt(lo)} – {fmt(hi)}
              </span>
            </div>
            <Slider
              hint={pairHint}
              onInput={(v) => onChange(key, [Math.min(v, hi), hi])}
              value={lo}
            />
            <Slider
              hint={pairHint}
              onInput={(v) => onChange(key, [lo, Math.max(v, lo)])}
              value={hi}
            />
          </div>
        );
      }

      if (typeof defaultValue === 'string') {
        return (
          <div className="field" key={key}>
            <div className="field__row">
              <span className="field__name">{key}</span>
            </div>
            {hint?.kind === 'select' ? (
              <select onChange={(e) => onChange(key, e.target.value)} value={String(value)}>
                {hint.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                onChange={(e) => onChange(key, e.target.value)}
                type="text"
                value={String(value)}
              />
            )}
          </div>
        );
      }

      // Unrenderable shape (future nested config) — skip rather than guess.
      return null;
    })}
  </div>
);
