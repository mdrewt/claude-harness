#!/usr/bin/env node
// Eval: simulation must not import the renderer (sim is headless & testable).
import { readFile } from 'node:fs/promises';

const sim = await readFile(new URL('../src/sim.ts', import.meta.url), 'utf8');
const leaks = ['pixi.js', './render', 'document.', 'window.'].filter((s) => sim.includes(s));
console.log(
  leaks.length
    ? `eval FAIL: sim imports ${leaks.join(', ')}`
    : 'eval PASS: simulation is headless & deterministic',
);
process.exit(leaks.length ? 1 : 0);
