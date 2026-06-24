// Invariant guard tests — mechanical enforcement of the patterns found in review.
// Run: node --test scripts/tests/*.test.mjs

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HARNESS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tpl = (...p) => path.join(HARNESS, 'templates', ...p);
// Stacks are DERIVED from templates/ (single source of truth) so a newly added
// stack is automatically covered by these invariants — no hand-maintained list
// to drift out of sync (the exact "hand-maintained list" failure mode these
// guards exist to prevent elsewhere).
const STACKS = readdirSync(tpl(), { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== '_base')
  .map((e) => e.name);
// Node stacks = those whose template ships a package.json; the Biome-lint and
// package.json invariants below only apply to these.
const NODE_STACKS = STACKS.filter((s) => existsSync(tpl(s, 'package.json')));

async function tempHarness() {
  const dir = await mkdtemp(path.join(tmpdir(), 'inv-'));
  await cp(path.join(HARNESS, 'templates'), path.join(dir, 'templates'), { recursive: true });
  await cp(path.join(HARNESS, 'scripts'), path.join(dir, 'scripts'), { recursive: true });
  return dir;
}
const gen = (dir, name, stack) =>
  execFileSync('node', [path.join(dir, 'scripts', 'new-project.mjs'), name, stack], {
    cwd: dir,
    stdio: 'ignore',
  });

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
    assert.doesNotMatch(
      jf,
      /not overridden by the stack template/,
      `${s}: leftover placeholder recipe`,
    );
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
    assert.ok(
      !existsSync(tpl(s, 'biome.json')),
      `${s} must NOT keep its own biome.json (inherits _base's)`,
    );
  }
});

// Pattern 1: lint must be a real linter, not an "|| echo" no-op.
test('every node stack lints with Biome (real gate, not a no-op)', async () => {
  for (const s of NODE_STACKS) {
    const pkg = JSON.parse(await readFile(tpl(s, 'package.json'), 'utf8'));
    assert.match(pkg.scripts.lint, /biome/, `${s}: lint script must run biome`);
    assert.doesNotMatch(
      pkg.scripts.lint,
      /\|\|\s*echo/,
      `${s}: lint must not swallow failure with "|| echo"`,
    );
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

// Security parity guard: `just security` must run the portable check-secrets
// scanner in EVERY stack (defense-in-depth alongside the lefthook hook + CI
// gitleaks). rust-lib once ran only `cargo audit` and silently skipped it; this
// catches that regression and forces any new stack to wire the scanner in too.
test('every stack runs the portable secret scanner in `just security`', async () => {
  for (const s of STACKS) {
    const jf = await readFile(tpl(s, 'justfile'), 'utf8');
    const m = jf.match(/(^|\n)security:\n((?:[ \t].*\n?)*)/);
    assert.ok(m, `${s}: justfile missing 'security' recipe`);
    const body = m[2];
    let runsScanner = /check-secrets/.test(body);
    // Node stacks delegate to `npm run security`; follow that to package.json.
    if (!runsScanner && /npm run security/.test(body)) {
      const pkg = JSON.parse(await readFile(tpl(s, 'package.json'), 'utf8'));
      runsScanner = /check-secrets/.test(pkg.scripts?.security ?? '');
    }
    assert.ok(runsScanner, `${s}: 'just security' must run the portable check-secrets scanner`);
  }
});

// Docs-drift guard: the README must name every real stack (the just stacks bug
// slipped through because nothing exercised it; this catches silent doc drift).
test('README documents every stack', async () => {
  const readme = await readFile(path.join(HARNESS, 'README.md'), 'utf8');
  for (const s of STACKS) {
    assert.ok(readme.includes(s), `README.md must mention the '${s}' stack`);
  }
});
