import {
  type AsciiPattern,
  CanvasEngine,
  createPattern,
  type EngineOptions,
  type PatternId,
} from '@asciitopia/core';
import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface AsciiBackgroundProps {
  /** An AsciiPattern instance (full type-safety, tree-shakeable), or a registry id
   *  string ('fire' | 'rain' | ...). Id strings resolve via the core registry —
   *  convenient, but bundles all registered patterns. */
  pattern: AsciiPattern | PatternId;
  /** Pattern config — ONLY honored when `pattern` is an id string (instances are
   *  already configured; passing both is a no-op for the instance case). Changing
   *  this object's identity recreates the pattern. */
  config?: Record<string, unknown>;
  /** Forwarded to `new CanvasEngine(canvas, engineOptions)`. Changing identity
   *  recreates the engine — pass a stable reference (module const / useMemo). */
  engineOptions?: EngineOptions;
  className?: string;
  style?: CSSProperties;
}

// Unknown ids warn once each — a background must never take the app down, and a
// prop that re-renders every frame must never spam the console.
const warnedIds = new Set<string>();
const warnUnknownId = (id: string): void => {
  if (warnedIds.has(id)) return;
  warnedIds.add(id);
  console.warn(`[asciitopia] Unknown pattern id '${id}' — the canvas stays empty.`);
};

/**
 * Renders a single <canvas> driven by a CanvasEngine. Sizing/layering is the
 * app's CSS (give the canvas explicit dimensions — the ResizeObserver reports
 * its CSS box and the engine sets the pixel buffer from it).
 */
export const AsciiBackground = forwardRef<HTMLCanvasElement, AsciiBackgroundProps>(
  ({ pattern, config, engineOptions, className, style }, forwardedRef) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Engine lives in state (not a ref) so the pattern effect below re-fires when
    // an engineOptions identity change swaps the engine out underneath it.
    const [engine, setEngine] = useState<CanvasEngine | null>(null);

    // Keep the internal ref and the forwarded canvas ref in sync.
    const setCanvasRef = useCallback(
      (node: HTMLCanvasElement | null) => {
        canvasRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    // Id strings resolve through the core registry; instances pass through as-is,
    // so a config-only change is referentially invisible in the instance case.
    const resolved = useMemo(() => {
      if (typeof pattern !== 'string') return pattern;
      const created = createPattern(pattern, config);
      if (!created) warnUnknownId(pattern);
      return created ?? null;
    }, [pattern, config]);

    // Engine lifecycle: created once per canvas (and per engineOptions identity),
    // resized from the canvas's observed CSS box, destroyed on unmount so the
    // active pattern's dispose() fires. Idempotent — StrictMode double-mount safe.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const nextEngine = new CanvasEngine(canvas, engineOptions);
      nextEngine.start();

      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          nextEngine.resize(width, height);
        }
      });
      observer.observe(canvas);
      setEngine(nextEngine);

      return () => {
        observer.disconnect();
        nextEngine.destroy();
      };
    }, [engineOptions]);

    // Pattern swaps go through setPattern — no engine recreation.
    useEffect(() => {
      if (!engine || !resolved) return;
      engine.setPattern(resolved);
    }, [engine, resolved]);

    return <canvas className={className} ref={setCanvasRef} style={style} />;
  },
);

AsciiBackground.displayName = 'AsciiBackground';
