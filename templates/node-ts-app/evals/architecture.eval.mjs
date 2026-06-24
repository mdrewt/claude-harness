// Architecture invariant: the domain (src/money) must not import IO/node builtins.
import { readFile } from 'node:fs/promises';
export default async function () {
  const src = await readFile(new URL('../src/money.ts', import.meta.url), 'utf8');
  const leaks = ['node:fs', 'node:net', 'node:http', 'fetch('].filter((s) => src.includes(s));
  return {
    name: 'domain has no IO dependencies',
    pass: leaks.length === 0,
    detail: leaks.length ? `found ${leaks.join(', ')}` : 'clean',
  };
}
