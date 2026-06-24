import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Security invariants encoded as a test (defense-in-depth alongside the eval).
describe('electron security', () => {
  const main = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
  it('keeps contextIsolation on and nodeIntegration off', () => {
    expect(main).toMatch(/contextIsolation:\s*true/);
    expect(main).toMatch(/nodeIntegration:\s*false/);
  });
});
