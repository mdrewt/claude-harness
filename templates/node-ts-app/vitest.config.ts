import { defineConfig } from 'vitest/config';

// Coverage gate (standards/testing-tdd.md): tests must meaningfully cover the
// domain logic. Thresholds are a conservative floor — projects should raise them.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
