import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base stays '/' for local dev/preview; the Pages workflow builds with
// --base=/asciitopia/ (project pages serve from a subpath).
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Workspace packages are served from their linked dist so tsup --watch
    // rebuilds show up live; their own deps still get prebundled.
    exclude: ['@asciitopia/core', '@asciitopia/react'],
    include: ['react', 'react-dom/client', 'simplex-noise'],
  },
});
