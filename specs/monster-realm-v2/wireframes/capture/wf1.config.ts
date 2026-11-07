import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'wf1-capture.spec.ts', timeout: 1_700_000, workers: 1,
  use: { baseURL: 'http://localhost:5597', headless: true, viewport: { width: 1280, height: 720 } },
  webServer: { command: 'MR_E2E_PORT=5597 VITE_STDB_URI=ws://127.0.0.1:3597 VITE_STDB_DB=wf1 npx vite', url: 'http://localhost:5597', reuseExistingServer: true, timeout: 90_000 },
});
