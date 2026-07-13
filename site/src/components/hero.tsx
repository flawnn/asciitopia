import { patterns } from '@asciitopia/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LiveCanvas } from './live-canvas';

const ROTATE_MS = 9000;
const INSTALL_CMD = 'pnpm add @asciitopia/core';

export const Hero = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % patterns.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const entry = patterns[index];
  const pattern = useMemo(() => entry.create(), [entry]);

  const copyInstall = (): void => {
    navigator.clipboard.writeText(INSTALL_CMD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <header className="hero" ref={sectionRef}>
      <LiveCanvas className="hero__canvas" pattern={pattern} running={visible} />
      <div className="hero__scrim" />

      <div className="hero__top">
        <span className="label">asciitopia</span>
        <a
          className="hero__link"
          href="https://github.com/flawnn/asciitopia"
          rel="noreferrer"
          target="_blank"
        >
          github ↗
        </a>
      </div>

      <div className="hero__body">
        <h1 className="hero__title">asciitopia</h1>
        <p className="hero__tagline">
          Live ASCII animation backgrounds for the web. Framework-agnostic canvas engine, five
          patterns and counting, first-class React bindings. MIT.
        </p>
        <div className="hero__install">
          <code>{INSTALL_CMD}</code>
          <button onClick={copyInstall} type="button">
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      </div>

      <div className="hero__bottom">
        <button
          className="hero__now"
          onClick={() => setIndex((i) => (i + 1) % patterns.length)}
          title="Next pattern"
          type="button"
        >
          ░▒▓ {entry.name.toLowerCase()}
        </button>
        <button
          className="hero__down"
          onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })}
          type="button"
        >
          pattern index ↓
        </button>
      </div>
    </header>
  );
};
