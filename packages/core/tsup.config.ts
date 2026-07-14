import { defineConfig } from 'tsup';

// Entry points mirror the exports map in package.json exactly.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'patterns/fire': 'src/patterns/fire.ts',
    'patterns/rain': 'src/patterns/rain.ts',
    'patterns/snow': 'src/patterns/snow.ts',
    'patterns/waves': 'src/patterns/waves.ts',
    'patterns/aurora': 'src/patterns/aurora.ts',
    'patterns/bonsai': 'src/patterns/bonsai.ts',
    'weather/index': 'src/weather/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
