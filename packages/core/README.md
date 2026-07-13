# @asciitopia/core

Framework-agnostic ASCII canvas animation engine, patterns, and registry. Zero React, zero app coupling.

```bash
npm install @asciitopia/core
```

```ts
import { CanvasEngine, FirePattern } from '@asciitopia/core';

const canvas = document.querySelector('canvas')!;
canvas.width = 800;
canvas.height = 400;

const engine = new CanvasEngine(canvas);
engine.setPattern(new FirePattern());
engine.start();
```

Full docs, pattern gallery, and configuration reference: [github.com/flawnn/asciitopia](https://github.com/flawnn/asciitopia).

MIT — see [LICENSE](./LICENSE).
