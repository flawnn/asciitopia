import { defineConfig } from 'vitest/config';

// Root runner for both packages. environment: 'jsdom' is wired now because
// pattern smoke tests need a document/canvas available; jsdom's
// getContext('2d') itself resolves to null (no real canvas backend), so a
// 2D-context mock will be added alongside the real pattern tests.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
  },
});
