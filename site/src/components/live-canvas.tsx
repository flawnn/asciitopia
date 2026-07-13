import { type AsciiPattern, CanvasEngine, type EngineOptions } from '@asciitopia/core';
import { useEffect, useRef, useState } from 'react';

export interface LiveCanvasProps {
  pattern: AsciiPattern;
  /** false parks the engine (used by the gallery's IntersectionObserver). */
  running: boolean;
  /** Pass a stable reference — identity changes recreate the engine. */
  engineOptions?: EngineOptions;
  className?: string;
}

/** Site-local canvas host: like <AsciiBackground>, but with a running switch
 *  so off-viewport instances cost nothing. */
export const LiveCanvas = ({ pattern, running, engineOptions, className }: LiveCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const next = new CanvasEngine(canvas, engineOptions);
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) next.resize(width, height);
    });
    observer.observe(canvas);
    setEngine(next);

    return () => {
      observer.disconnect();
      next.destroy();
    };
  }, [engineOptions]);

  useEffect(() => {
    if (engine) engine.setPattern(pattern);
  }, [engine, pattern]);

  useEffect(() => {
    if (!engine) return;
    if (running) engine.start();
    else engine.stop();
  }, [engine, running]);

  return <canvas className={className} ref={canvasRef} />;
};
