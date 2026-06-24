// Eval: presentation logic stays pure (no fetch/DOM) so it is unit-testable.
import { readFile } from 'node:fs/promises';
export default async function () {
  const src = await readFile(new URL('../src/format.ts', import.meta.url), 'utf8');
  const leaks = ['fetch(', 'document.', 'window.'].filter((s) => src.includes(s));
  return {
    name: 'presentation logic is pure (no fetch/DOM)',
    pass: leaks.length === 0,
    detail: leaks.length ? `format.ts touches ${leaks.join(', ')}` : 'pure',
  };
}
