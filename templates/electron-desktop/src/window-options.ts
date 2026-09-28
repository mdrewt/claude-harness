import type { BrowserWindowConstructorOptions } from 'electron';

// Secure-by-default window options. See standards/domain/desktop.md.
// Kept free of runtime `electron` imports so the security posture is testable
// by executing this function (src/security.test.ts), not by scanning source.
export function secureWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 1024,
    height: 768,
    webPreferences: {
      contextIsolation: true, // REQUIRED: isolate preload from renderer
      nodeIntegration: false, // REQUIRED: no Node in the renderer
      sandbox: true,
      preload: preloadPath,
    },
  };
}
