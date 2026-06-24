// Invariant guard tests — mechanical enforcement of the patterns found in review.
// Run: node --test scripts/tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, cp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STACKS = [
  'rust-lib', 'python-service', 'node-ts-app', 'react-web',
  'electron-desktop', 'pixijs-game', 'spacetimedb-game',
];
const NODE_STACKS = ['node-ts-app', 'react-web', 'electron-desktop', 'pixijs-game'];
const tpl = (...p) => path.join(HARNESS, 'templates', ...p);

async function tempHarness() {
  const dir = await mkdtemp(path.join(tmpdir(), 'inv-'));
  await cp(path.join(HARNESS, 'templates'), path.join(dir, 'templates'), { recursive: true });
  await cp(path.join(HARNESS, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  return dir;
}
const gen = (dir, name, stack) =>
  execFileSync('node', [path.join(dir, 'scripts', 'new-project.mjs'), name, stack], { cwd: dir, stdio: 'ignore' });

// Pattern 1 (silent success) + security regression guard for the .gitignore merge.
test('every generated project ignores .env (no secret-leak regression)', async () => {
  const dir = await tempHarness();
  for (const s of STACKS) {
    gen(dir, `e-${s}`, s);
    const gi = await readFile(path.join(dir, 'projects', `e-${s}`, '.gitignore'), 'utf8');
    assert.match(gi, /(^|\n)\.env(\n|$)/, `${s}: generated .gitignore must ignore .env`);
  }
  await rm(dir, { recursive: true, force: true });
});

// Pattern 1: no stack ships a silent no-op gate (the _base fail-loud placeholder).
test('no stack justfile ships an unoverridden placeholder recipe', async () => {
  for (const s of STACKS) {
    const jf = await readFile(tpl(s, 'justfile'), 'utf8');
    assert.doesNotMatch(jf, /not overridden by the stack template/, `${s}: leftover placeholder recipe`);
    for (const r of ['setup', 'lint', 'typecheck', 'test']) {
      assert.match(jf, new RegExp(`(^|\\n)${r}:`), `${s}: justfile missing '${r}' recipe`);
    }
  }
});

// Pattern 2 (duplicated config drift): biome.json is single-sourced in _base,
// NOT duplicated per node stack (the generated project inherits _base's copy).
test('biome.json is single-sourced in _base (no per-stack duplication/drift)', async () => {
  assert.ok(existsSync(tpl('_base', 'biome.json')), '_base must ship biome.json');
  for (const s of NODE_STACKS) {
    assert.ok(!existsSync(tpl(s, 'biome.json')), `${s} must NOT keep its own biome.json (inherits _base's)`);
  }
});

// Pattern 1: lint must be a real linter, not an "|| echo" no-op.
test('every node stack lints with Biome (real gate, not a no-op)', async () => {
  for (const s of NODE_STACKS) {
    const pkg = JSON.parse(await readFile(tpl(s, 'package.json'), 'utf8'));
    assert.match(pkg.scripts.lint, /biome/, `${s}: lint script must run biome`);
    assert.doesNotMatch(pkg.scripts.lint, /\|\|\s*echo/, `${s}: lint must not swallow failure with "|| echo"`);
    assert.ok(pkg.devDependencies['@biomejs/biome'], `${s}: must depend on @biomejs/biome`);
  }
});

// Pattern 3 (hand-maintained list drift): every MANAGED sync file must exist in _base.
test('sync-templates MANAGED files all exist in _base', async () => {
  const src = await readFile(path.join(HARNESS, 'scripts', 'sync-templates.mjs'), 'utf8');
  const block = src.match(/const MANAGED = \[([\s\S]*?)\]/);
  assert.ok(block, 'MANAGED list not found in sync-templates.mjs');
  const files = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(files.length > 0, 'MANAGED list is empty');
  for (const f of files) {
    assert.ok(existsSync(tpl('_base', f)), `MANAGED file missing in _base: ${f}`);
  }
});
