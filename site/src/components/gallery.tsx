import { type EngineOptions, type PatternRegistryEntry, patterns } from '@asciitopia/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveCanvas } from './live-canvas';

// Smaller glyphs for the miniature stages.
const CARD_ENGINE: EngineOptions = { fontSize: 10 };

interface PatternCardProps {
  entry: PatternRegistryEntry;
  index: number;
}

const PatternCard = ({ entry, index }: PatternCardProps) => {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [visible, setVisible] = useState(false);
  const pattern = useMemo(() => entry.create(), [entry]);

  // A dozen simultaneous 60fps canvases would melt laptops — only the cards
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
    <a className="card" href={`#/pattern/${entry.id}`} ref={ref}>
      <div className="card__stage">
        <LiveCanvas
          className="card__canvas"
          engineOptions={CARD_ENGINE}
          pattern={pattern}
          running={visible}
        />
      </div>
      <div className="card__meta">
        <div className="card__head">
          <span className="card__no">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="card__name">{entry.name}</h3>
          <span className="card__open">tune →</span>
        </div>
        <p className="card__desc">{entry.description}</p>
      </div>
    </a>
  );
};

export const Gallery = () => (
  <section className="gallery" id="gallery">
    <div className="gallery__head">
      <h2 className="label">Pattern index</h2>
      <span className="label label--faint">{patterns.length} registered</span>
    </div>
    <div className="gallery__grid">
      {patterns.map((entry, index) => (
        <PatternCard entry={entry} index={index} key={entry.id} />
      ))}
    </div>
  </section>
);
