import type { PatternId } from '@asciitopia/core';

/** Point the adaptive --accent at a pattern's hue (tokens.css owns the map);
 *  null returns to the resting amber. */
export const setAccent = (id: PatternId | null): void => {
  if (id) document.documentElement.dataset.accent = id;
  else delete document.documentElement.dataset.accent;
};
