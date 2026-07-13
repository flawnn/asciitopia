import { useEffect, useState } from 'react';

// Hash routing: survives GitHub Pages' lack of SPA rewrites, no dependency.
export type Route = { view: 'home' } | { view: 'detail'; id: string };

const parse = (hash: string): Route => {
  const match = /^#\/pattern\/([\w-]+)$/.exec(hash);
  return match ? { view: 'detail', id: match[1] } : { view: 'home' };
};

export const useHashRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = (): void => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
};
