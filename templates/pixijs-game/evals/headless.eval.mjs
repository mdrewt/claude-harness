// Eval: simulation must not import the renderer (sim is headless & testable).
import { readFile } from 'node:fs/promises';
export default async function () {
  const sim = await readFile(new URL('../src/sim.ts', import.meta.url), 'utf8');
  const leaks = ['pixi.js', './render', 'document.', 'window.'].filter((s) => sim.includes(s));
  return {
    name: 'simulation is headless (no renderer imports)',
    pass: leaks.length === 0,
    detail: leaks.length ? `sim imports ${leaks.join(', ')}` : 'headless & deterministic',
  };
}
