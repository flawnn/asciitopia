// Optional UI hints for known config fields, keyed '<patternId>.<field>'.
// Patterns absent from this map still get working controls via the heuristics
// in controls.tsx — hints only tighten slider ranges and turn known string
// unions into selects (unions aren't detectable from a runtime default value).
export interface SliderHint {
  kind: 'slider';
  min: number;
  max: number;
  step: number;
}

export interface SelectHint {
  kind: 'select';
  options: readonly string[];
}

export type ControlHint = SliderHint | SelectHint;

const slider = (min: number, max: number, step: number): ControlHint => ({
  kind: 'slider',
  min,
  max,
  step,
});

const select = (...options: string[]): ControlHint => ({ kind: 'select', options });

export const CONTROL_HINTS: Readonly<Record<string, ControlHint>> = {
  'aurora.palette': select('aurora', 'mono'),
  'aurora.scaleX': slider(0.005, 0.1, 0.005),
  'aurora.scaleY': slider(0.01, 0.2, 0.005),
  'aurora.speed': slider(0.02, 1, 0.01),
  'aurora.threshold': slider(0, 0.8, 0.02),
  'fire.charset': select('classic', 'blocks', 'sparks'),
  'fire.decay': slider(0.5, 3, 0.05),
  'fire.fps': slider(10, 60, 1),
  'fire.intensity': slider(1, 10, 1),
  'fire.mode': select('wall', 'campfire', 'torch', 'candles'),
  'fire.palette': select('classic', 'blue', 'lava', 'matrix', 'mono'),
  'fire.thickness': slider(1, 5, 1),
  'fire.turbulence': slider(1, 10, 1),
  'fire.wind': slider(-5, 5, 0.5),
  'rain.density': slider(0, 1, 0.05),
  'rain.lengthRange': slider(1, 40, 1),
  'rain.speedRange': slider(0.5, 10, 0.5),
  'rain.trailDecay': slider(0.01, 0.9, 0.01),
  'snow.density': slider(0, 1.5, 0.05),
  'snow.speedRange': slider(0.5, 10, 0.5),
  'snow.swayAmount': slider(0, 3, 0.1),
  'snow.wind': slider(-5, 5, 0.25),
  'waves.amplitude': slider(0, 2, 0.05),
  'waves.choppiness': slider(0, 1, 0.05),
  'waves.frequency': slider(0.2, 5, 0.1),
  'waves.palette': select('ocean', 'mono'),
  'waves.speed': slider(0, 3, 0.05),
};

/** Fallback range for numeric fields with no hint: centered on the default. */
export const heuristicSlider = (value: number): SliderHint => {
  const magnitude = Math.max(Math.abs(value), 1);
  const integer = Number.isInteger(value) && magnitude >= 1;
  return {
    kind: 'slider',
    min: value < 0 ? -magnitude * 4 : 0,
    max: magnitude * 4,
    step: integer ? 1 : magnitude / 50,
  };
};

export const resolveHint = (
  patternId: string,
  field: string,
  defaultValue: unknown,
): ControlHint | undefined => {
  const hint = CONTROL_HINTS[`${patternId}.${field}`];
  if (hint) return hint;
  if (typeof defaultValue === 'number') return heuristicSlider(defaultValue);
  return undefined;
};
