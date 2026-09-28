import { defineConfig } from 'vitest/config';

// Coverage report (never a gated threshold — standards/testing-tdd.md) over the
// headless simulation. The renderer (render.ts) and the
// browser entrypoint (main.ts) need a DOM/Pixi runtime and are excluded.
export default defineConfig({
  test: {
    // Scope collection to src/: the synced .claude/hooks/quiet/quiet.test.mjs is a
    // node:test suite (run by the harness), not a vitest file.
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/render.ts', 'src/main.ts'],
    },
  },
});
