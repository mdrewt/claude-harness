import { defineConfig } from 'vitest/config';

// Coverage gate over the headless simulation. The renderer (render.ts) and the
// browser entrypoint (main.ts) need a DOM/Pixi runtime and are excluded.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/render.ts', 'src/main.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
