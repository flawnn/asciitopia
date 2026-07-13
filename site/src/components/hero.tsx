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
            <svg aria-hidden="true" fill="currentColor" height="14" viewBox="0 0 16 16" width="14">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
};
