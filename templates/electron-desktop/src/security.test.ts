import { describe, expect, it } from 'vitest';
import { secureWindowOptions } from './window-options';

// Executes the options builder main.ts passes to `new BrowserWindow(...)`.
describe('electron window security', () => {
  const prefs = secureWindowOptions('/preload.js').webPreferences;

  it('keeps contextIsolation on, nodeIntegration off, and the sandbox on', () => {
    expect(prefs?.contextIsolation).toBe(true);
    expect(prefs?.nodeIntegration).toBe(false);
    expect(prefs?.sandbox).toBe(true);
  });

  it('loads the given preload script', () => {
    expect(prefs?.preload).toBe('/preload.js');
  });
});
