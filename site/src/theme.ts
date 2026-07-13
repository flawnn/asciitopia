import { useSyncExternalStore } from 'react';

// System default with dark fallback; explicit choice persists in localStorage.
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'asciitopia:theme';
const listeners = new Set<() => void>();

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

const apply = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  for (const fn of listeners) fn();
};

export const initTheme = (): void => {
  const stored = localStorage.getItem(STORAGE_KEY);
  apply(stored === 'light' || stored === 'dark' ? stored : systemTheme());
  // follow the OS until the user picks a side
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (!localStorage.getItem(STORAGE_KEY)) apply(systemTheme());
  });
};

// ░▒▓ dissolve: a glyph veil fades in over the old theme, the swap happens
// under it (the veil re-tints with the new tokens), then it dissolves away.
const buildVeil = (): HTMLDivElement => {
  const veil = document.createElement('div');
  veil.className = 'veil';
  veil.setAttribute('aria-hidden', 'true');
  const count = Math.ceil(window.innerWidth / 8) * Math.ceil(window.innerHeight / 14);
  let text = '';
  for (let i = 0; i < count; i++) text += '░▒▓'[Math.floor(Math.random() * 3)];
  veil.textContent = text;
  return veil;
};

export const toggleTheme = (): void => {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, next);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply(next);
    return;
  }

  const veil = buildVeil();
  document.body.append(veil);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      veil.classList.add('veil--in');
      veil.addEventListener(
        'transitionend',
        () => {
          apply(next);
          veil.classList.remove('veil--in');
          veil.addEventListener('transitionend', () => veil.remove(), { once: true });
        },
        { once: true },
      );
    }),
  );
};

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useTheme = (): Theme => useSyncExternalStore(subscribe, currentTheme);
