# Contributing

asciitopia is a growing collection of animated ASCII patterns. New patterns are the contribution we want most: if it animates on a character grid and looks good, it qualifies.

## Adding a pattern

1. **Create** `packages/core/src/patterns/<name>.ts` implementing `AsciiPattern`:

   ```ts
   import type { AsciiPattern } from '../types.js';

   export interface StarfieldConfig {
     density: number; // every knob lives here, with a sane default
   }

   export const DEFAULT_STARFIELD_CONFIG: StarfieldConfig = {
     density: 0.5,
   };

   export class StarfieldPattern implements AsciiPattern {
     private config: StarfieldConfig;

     constructor(config: Partial<StarfieldConfig> = {}) {
       this.config = { ...DEFAULT_STARFIELD_CONFIG, ...config };
     }

     init(cols: number, rows: number): void {
       // build buffers here, not per frame
     }

     update(dt: number): void {
       // dt is milliseconds, capped at 100 by the engine
     }

     render(
       ctx: CanvasRenderingContext2D,
       cols: number,
       rows: number,
       charW: number,
       charH: number,
     ): void {
       // you own ctx.fillStyle; draw with fillText on the grid
     }
   }
   ```

2. **Register** it in `packages/core/src/registry.ts`: add your id to the `PatternId` union and an entry to `patterns`. The conformance suite picks it up on the next `pnpm test` run; you write no tests.

3. **Export** it from `packages/core/src/index.ts`, and mirror a subpath entry in `packages/core/tsup.config.ts` and `package.json#exports` (copy the `fire` lines).

4. **Verify**: `pnpm test` runs the conformance checks against your pattern; `pnpm dev` shows it live in the gallery with auto-generated knobs. The gallery reads the registry, so your pattern appears without any site changes.

5. **Open a PR** with a GIF or screenshot of the pattern running.

For anything beyond a pattern, or if you're unsure an idea fits, open an issue first.

## Ground rules

- **Original work.** Write your own code and art. Material from other projects is only OK when its license is MIT-compatible; credit the source in a header comment and in `ATTRIBUTION.md`. Take inspiration freely. AI-generated imitations of existing art count as copies.
- **dt-based animation.** Derive speed from `dt` (milliseconds), not from frame counts.
- **No per-frame allocations.** Build buffers in `init()`; you have a 60fps budget.
- **Config with defaults.** Every knob in a `Config` interface, `Partial<Config>` constructor, exported `DEFAULT_*_CONFIG`.
- **Any grid size.** 1×1 to 500×200 without crashing. The conformance suite checks this.

## Development

```bash
pnpm install && pnpm build && pnpm test   # Node 22+, pnpm 11
pnpm dev                                  # gallery as live playground
```

## Review

One maintainer, spare time: reviews may take days, and most PRs go a round or two of discussion. We check that the pattern looks good in the gallery, the code reads clean, and the rules above hold.

By contributing, you agree your contributions are licensed under the project's [MIT License](./LICENSE).
