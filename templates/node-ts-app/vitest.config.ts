import { defineConfig } from 'vitest/config';

// Coverage is collected as a REPORT to find gaps worth judging — never a gated
// threshold (standards/testing-tdd.md).
export default defineConfig({
  test: {
    // Scope collection to src/: the synced .claude/hooks/quiet/quiet.test.mjs is a
    // node:test suite (run by the harness), not a vitest file.
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
