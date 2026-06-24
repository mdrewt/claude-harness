import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    // Coverage gate (standards/testing-tdd.md). The browser entrypoint main.tsx
    // is excluded; pure logic + components must stay covered.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
