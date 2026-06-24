// Eval: enforce Electron security posture (contextIsolation on, nodeIntegration off, CSP present).
import { readFile } from 'node:fs/promises';
export default async function () {
  const main = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8');
  const html = await readFile(new URL('../src/renderer/index.html', import.meta.url), 'utf8');
  const checks = [
    [/contextIsolation:\s*true/.test(main), 'contextIsolation: true'],
    [/nodeIntegration:\s*false/.test(main), 'nodeIntegration: false'],
    [/Content-Security-Policy/.test(html), 'CSP meta present'],
  ];
  const failed = checks.filter(([ok]) => !ok).map(([, n]) => n);
  return {
    name: 'Electron security posture enforced',
    pass: failed.length === 0,
    detail: failed.length ? `missing ${failed.join(', ')}` : 'contextIsolation+nodeIntegration+CSP ok',
  };
}
