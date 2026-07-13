import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme';
import { Wordmark } from '../wordmark/wordmark';
import { ThemeToggle } from './theme-toggle';

const INSTALL_CMD = 'pnpm add @asciitopia/core';

export const Hero = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const copyInstall = (): void => {
    navigator.clipboard.writeText(INSTALL_CMD).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const scrollToGallery = (): void => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('gallery')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <header className="hero" ref={sectionRef}>
      <div className="hero__top">
        <span className="label">asciitopia</span>
        <ThemeToggle />
      </div>

      {/* the Convergence wordmark IS the title — key by theme so ink re-inits */}
      <div className="hero__stage">
        <Wordmark className="hero__wordmark" key={theme} mode={theme} running={visible} />
      </div>

      <div className="hero__foot">
        <p className="hero__tagline">
          A library of animated, beautiful ASCII patterns for everybody.
        </p>
        <div className="hero__install">
          <code>{INSTALL_CMD}</code>
          <button onClick={copyInstall} type="button">
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        <nav className="hero__links">
          <a href="https://github.com/flawnn/asciitopia" rel="noreferrer" target="_blank">
            github ↗
          </a>
          <button onClick={scrollToGallery} type="button">
            gallery ↓
          </button>
        </nav>
      </div>
    </header>
  );
};
