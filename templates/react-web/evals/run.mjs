#!/usr/bin/env node
// Eval: presentation logic stays pure (no fetch/DOM) so it is unit-testable.
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../src/format.ts', import.meta.url), 'utf8');
const leaks = ['fetch(', 'document.', 'window.'].filter((s) => src.includes(s));
console.log(
  leaks.length
    ? `eval FAIL: format.ts touches ${leaks.join(', ')}`
    : 'eval PASS: pure presentation logic',
);
process.exit(leaks.length ? 1 : 0);
