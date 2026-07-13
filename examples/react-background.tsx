// Full-bleed ASCII background behind an app. The component renders a bare
// <canvas>; sizing, layering, and opacity are plain CSS. Put this recipe in
// your global stylesheet:
//
//   .ascii-bg {
//     position: fixed;
//     inset: 0;
//     width: 100%;
//     height: 100%;
//     z-index: -1;
//     opacity: 0.5;         /* your choice */
//     pointer-events: none;
//   }

import { RainPattern } from '@asciitopia/core';
import { AsciiBackground } from '@asciitopia/react';
import { useMemo } from 'react';

// Registry-id form: one prop, but bundles all registered patterns.
export const App = () => (
  <>
    <AsciiBackground className="ascii-bg" pattern="rain" />
    <main>Your app renders on top.</main>
  </>
);

// Instance form: tree-shaken + fully typed config. Memoize so re-renders
// don't rebuild the pattern.
export const AppWithInstance = () => {
  const pattern = useMemo(() => new RainPattern({ density: 0.7 }), []);

  return (
    <>
      <AsciiBackground className="ascii-bg" pattern={pattern} />
      <main>Your app renders on top.</main>
    </>
  );
};
