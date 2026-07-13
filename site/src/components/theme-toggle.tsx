import { toggleTheme, useTheme } from '../theme';

/** Glyph toggle — shows the density of the surface you'd switch to. */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const theme = useTheme();

  return (
    <button
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={className ? `theme-toggle ${className}` : 'theme-toggle'}
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? '░' : '▓'}
    </button>
  );
};
