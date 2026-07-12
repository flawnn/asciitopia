import type { AsciiPattern, EngineOptions, PatternId } from '@asciitopia/core';
import type { CSSProperties, JSX } from 'react';

/**
 * Placeholder: component shape only. The real mount/resize/pattern effects
 * (CanvasEngine wiring, ResizeObserver, id resolution) land with the
 * implementation.
 */
export interface AsciiBackgroundProps {
  /** An AsciiPattern instance, or a registry id string ('fire' | 'rain' | ...). */
  pattern: AsciiPattern | PatternId;
  /** Pattern config — only honored when `pattern` is an id string. */
  config?: Record<string, unknown>;
  /** Forwarded to `new CanvasEngine(canvas, engineOptions)`. */
  engineOptions?: EngineOptions;
  className?: string;
  style?: CSSProperties;
}

export function AsciiBackground(props: AsciiBackgroundProps): JSX.Element {
  return <canvas className={props.className} style={props.style} />;
}
