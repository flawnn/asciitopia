import { defineConfig } from 'tsup';

// Entry points mirror the exports map in package.json exactly.
//
// TODO: once a bonsai + weather implementation lands and is license-cleared,
// add:
//   - 'src/patterns/bonsai.ts'  -> exports["./patterns/bonsai"]
//   - 'src/weather/index.ts'    -> exports["./weather"]
// Until then these files do not exist and must NOT be referenced here or in
// package.json#exports (a dangling exports entry breaks `pnpm build` / `npm pack`).
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'patterns/fire': 'src/patterns/fire.ts',
    'patterns/rain': 'src/patterns/rain.ts',
    'patterns/snow': 'src/patterns/snow.ts',
    'patterns/waves': 'src/patterns/waves.ts',
    'patterns/aurora': 'src/patterns/aurora.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
