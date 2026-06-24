#!/usr/bin/env node
// Eval: enforce Electron security posture (contextIsolation on, nodeIntegration off, CSP present).
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
const checks = [
  [/contextIsolation:\s*true/.test(main), 'contextIsolation: true'],
  [/nodeIntegration:\s*false/.test(main), 'nodeIntegration: false'],
  [/Content-Security-Policy/.test(html), 'CSP meta present'],
];
const failed = checks.filter(([ok]) => !ok).map(([, n]) => n);
console.log(
  failed.length
    ? `eval FAIL: ${failed.join(', ')}`
    : 'eval PASS: Electron security posture enforced',
);
process.exit(failed.length ? 1 : 0);
