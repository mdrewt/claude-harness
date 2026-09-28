import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    // Scope collection to src/: the synced .claude/hooks/quiet/quiet.test.mjs is a
    // node:test suite (run by the harness), not a vitest file.
    include: ['src/**/*.test.{ts,tsx}'],
    // Coverage is a report, never a gated threshold (standards/testing-tdd.md).
    // The browser entrypoint main.tsx is excluded.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
  },
});
