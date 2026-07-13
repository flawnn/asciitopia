import { type EngineOptions, type PatternRegistryEntry, patterns } from '@asciitopia/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveCanvas } from './live-canvas';

// Smaller glyphs for the miniature stages.
const CARD_ENGINE: EngineOptions = { fontSize: 10 };

// Hover corners, drawn clockwise: ┌ ┐ ┘ └ (delays live in the stylesheet).
const CORNERS = ['┌', '┐', '└', '┘'] as const;

interface PatternCellProps {
  entry: PatternRegistryEntry;
  index: number;
}

const PatternCell = ({ entry, index }: PatternCellProps) => {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [visible, setVisible] = useState(false);
  const pattern = useMemo(() => entry.create(), [entry]);

  // A dozen simultaneous 60fps canvases would melt laptops — only the cells
  // near the viewport animate.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '120px',
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <a className="cell" href={`#/pattern/${entry.id}`} ref={ref}>
      {CORNERS.map((glyph, i) => (
        <i aria-hidden="true" className={`cell__corner cell__corner--${i}`} key={glyph}>
          {glyph}
        </i>
      ))}
      <div className="cell__stage">
        <LiveCanvas
          className="cell__canvas"
          engineOptions={CARD_ENGINE}
          pattern={pattern}
          running={visible}
        />
      </div>
      <div className="cell__meta">
        <span className="cell__no">{String(index + 1).padStart(2, '0')}</span>
        <h3 className="cell__name">{entry.name.toLowerCase()}</h3>
        <span className="cell__go">→</span>
      </div>
    </a>
  );
};

export const Gallery = () => (
  <section className="gallery" id="gallery">
    <div className="gallery__head">
      <h2 className="label">index</h2>
      <span className="label label--faint">
        {String(patterns.length).padStart(2, '0')} patterns
      </span>
    </div>
    <div className="gallery__grid">
      {patterns.map((entry, index) => (
        <PatternCell entry={entry} index={index} key={entry.id} />
      ))}
      {/* the leftover row space stays on the grid — and invites the next pattern */}
      <a
        className="cell cell--filler"
        href="https://github.com/flawnn/asciitopia/blob/main/CONTRIBUTING.md"
        rel="noreferrer"
        target="_blank"
      >
        {CORNERS.map((glyph, i) => (
          <i aria-hidden="true" className={`cell__corner cell__corner--${i}`} key={glyph}>
            {glyph}
          </i>
        ))}
        <span aria-hidden="true" className="cell__blank">
          ░ ▒ ▓
        </span>
        <div className="cell__meta">
          <span className="cell__no">{String(patterns.length + 1).padStart(2, '0')}</span>
          <h3 className="cell__name">yours</h3>
          <span className="cell__go">↗</span>
        </div>
      </a>
    </div>
  </section>
);
