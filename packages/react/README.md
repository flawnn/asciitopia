# @asciitopia/react

React bindings for [`@asciitopia/core`](https://www.npmjs.com/package/@asciitopia/core): a single `<AsciiBackground>` component. React is a peer dependency (`>=18`).

```bash
npm install @asciitopia/react @asciitopia/core
```

```tsx
import { AsciiBackground } from '@asciitopia/react';

// Size the canvas via CSS; the component sizes off the observed box.
export const App = () => (
  <AsciiBackground className="ascii-bg" pattern="fire" />
);
```

Full docs, pattern gallery, and configuration reference: [github.com/flawnn/asciitopia](https://github.com/flawnn/asciitopia).

MIT, see [LICENSE](./LICENSE).
