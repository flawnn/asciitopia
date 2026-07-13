import '@fontsource/fira-mono/400.css';
import '@fontsource/fira-mono/500.css';
import '@fontsource/fira-mono/700.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';

const mount = (): void => {
  const root = document.getElementById('root');
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Engines measure char metrics at construction — make sure the mono face is
// loaded first so charW/charH reflect the real font.
document.fonts.load('16px "Fira Mono"').then(mount, mount);
