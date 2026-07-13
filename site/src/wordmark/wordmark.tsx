import { useEffect, useMemo, useState } from 'react';
import { LiveCanvas } from '../components/live-canvas';
import { WordmarkPattern } from './wordmark-pattern';

export type WordmarkMode = 'dark' | 'light';

// site ink tones — the pattern's only chroma on either theme
const INK: Record<WordmarkMode, string> = {
  dark: '#eae7de',
  light: '#1d1c18',
};

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (): void => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

export interface WordmarkProps {
  mode: WordmarkMode;
  className?: string;
  running?: boolean;
}

/** The asciitopia wordmark as a live pattern in the library's own engine. */
export const Wordmark = ({ mode, className, running = true }: WordmarkProps) => {
  const reduced = usePrefersReducedMotion();
  const pattern = useMemo(() => new WordmarkPattern({ ink: INK[mode], reduced }), [mode, reduced]);

  return <LiveCanvas className={className} pattern={pattern} running={running} />;
};

const systemMode = (): WordmarkMode =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

/** Temporary #/wordmark preview: full viewport, theme toggle, click to replay. */
export const WordmarkPage = () => {
  const [mode, setMode] = useState<WordmarkMode>(systemMode);
  const [take, setTake] = useState(0);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: preview-only replay surface
    // biome-ignore lint/a11y/useKeyWithClickEvents: preview-only replay surface
    <div
      className={`wordmark-page wordmark-page--${mode}`}
      onClick={() => setTake((n) => n + 1)}
      title="Click to replay"
    >
      <Wordmark className="wordmark-page__canvas" key={take} mode={mode} />
      <button
        className="wordmark-page__toggle"
        onClick={(e) => {
          e.stopPropagation();
          setMode((m) => (m === 'dark' ? 'light' : 'dark'));
        }}
        type="button"
      >
        {mode === 'dark' ? '░ light' : '▓ dark'}
      </button>
    </div>
  );
};
