// Invariant guard tests — mechanical enforcement of the patterns found in review.
// Run: node --test scripts/tests/*.test.mjs

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Auto-format hook guard: generated projects must ship the PostToolUse formatter so
// the agent's edits are auto-formatted/linted immediately (Biome/Ruff/rustfmt) instead
// of failing late at `just ci` — and so it can't be silently dropped.
test('generated projects ship the PostToolUse auto-format hook', async () => {
  assert.ok(
    existsSync(tpl('_base', '.claude', 'hooks', 'format-edited.mjs')),
    '_base must ship .claude/hooks/format-edited.mjs',
  );
  const settings = JSON.parse(await readFile(tpl('_base', '.claude', 'settings.json'), 'utf8'));
  const post = JSON.stringify(settings.hooks?.PostToolUse ?? []);
  assert.ok(
    post.includes('format-edited.mjs'),
    '_base/.claude/settings.json must wire PostToolUse -> format-edited.mjs',
  );
});

// Destructive-command guard: generated projects must ship the PreToolUse guard-bash
// hook (defense-in-depth behind the permission deny-list — it also blocks ops the
// deny-list doesn't, e.g. `drop database` / `truncate table` / `reset --hard origin`).
// README promises every project "carries a minimal copy of those guardrails", so this
// guards that claim and stops the hook being silently dropped.
test('generated projects ship the PreToolUse destructive-command guard hook', async () => {
  assert.ok(
    existsSync(tpl('_base', '.claude', 'hooks', 'guard-bash.mjs')),
    '_base must ship .claude/hooks/guard-bash.mjs',
  );
  const settings = JSON.parse(await readFile(tpl('_base', '.claude', 'settings.json'), 'utf8'));
  const pre = JSON.stringify(settings.hooks?.PreToolUse ?? []);
  assert.ok(
    pre.includes('guard-bash.mjs'),
    '_base/.claude/settings.json must wire PreToolUse -> guard-bash.mjs',
  );
});

// Cross-platform guard: the commit-msg hook must be portable. A `grep` one-liner
// silently fails to run on Windows (no POSIX grep on PATH) — the same trap that
// turned guard-bash.sh into guard-bash.mjs. The hook must call the portable
// no-dep Node validator, which must ship in _base.
test('lefthook commit-msg validation is portable (Node, not grep)', async () => {
  const yml = await readFile(tpl('_base', 'lefthook.yml'), 'utf8');
  assert.doesNotMatch(yml, /\bgrep\b/, '_base/lefthook.yml must not use grep (not on Windows)');
  assert.match(
    yml,
    /check-commit-msg\.mjs/,
    'commit-msg hook must run scripts/check-commit-msg.mjs',
  );
  assert.ok(
    existsSync(tpl('_base', 'scripts', 'check-commit-msg.mjs')),
    '_base must ship scripts/check-commit-msg.mjs',
  );
});

// CI-side secret-scan parity: every CI workflow shipped in templates/ must run the
// gitleaks secret scan. Node stacks inherit _base's workflow; stacks that override
// it (python/rust/spacetimedb) must keep the scan. Secret scanning is the highest-
// stakes gate, so any new stack's CI must not silently drop it.
test('every template CI workflow runs the gitleaks secret scan', async () => {
  const ymls = [tpl('_base', '.github', 'workflows', 'ci.yml')];
  for (const s of STACKS) {
    const p = tpl(s, '.github', 'workflows', 'ci.yml');
    if (existsSync(p)) ymls.push(p);
  }
  for (const p of ymls) {
    const yml = await readFile(p, 'utf8');
    assert.match(yml, /gitleaks/, `${p} must run the gitleaks secret scan in CI`);
  }
});

// --- Enforcement added in the review follow-up (mutation, SCA, coverage, build) ---

// Resolve the CI workflow a generated project of this stack actually uses: its own
// if it overrides one, otherwise the inherited _base workflow.
const ciFor = (s) => {
  const own = tpl(s, '.github', 'workflows', 'ci.yml');
  return existsSync(own) ? own : tpl('_base', '.github', 'workflows', 'ci.yml');
};

// Standard contract (standards/testing-tdd.md + _base/justfile): EVERY stack must
// define a `mutate` recipe. The _base comment claimed this but nothing enforced it
// and 3 stacks shipped none.
test('every stack justfile defines a `mutate` recipe', async () => {
  for (const s of STACKS) {
    const jf = await readFile(tpl(s, 'justfile'), 'utf8');
    assert.match(jf, /(^|\n)mutate:/, `${s}: justfile missing 'mutate' recipe`);
  }
});

// StrykerJS wiring must be internally consistent: a stryker.conf.json, the
// `mutate: stryker run` script, and BOTH stryker deps travel together. Catches the
// original bug (node-ts-app had the config + recipe but no installed stryker deps).
test('node stacks wire StrykerJS consistently (config + script + deps together)', async () => {
  for (const s of NODE_STACKS) {
    const hasConf = existsSync(tpl(s, 'stryker.conf.json'));
    const pkg = JSON.parse(await readFile(tpl(s, 'package.json'), 'utf8'));
    const usesStryker = /stryker/.test(pkg.scripts?.mutate ?? '');
    if (!hasConf && !usesStryker) continue; // stack opts out (skip documented in its justfile)
    assert.ok(hasConf, `${s}: has a stryker mutate script but no stryker.conf.json`);
    assert.ok(usesStryker, `${s}: ships stryker.conf.json but no 'stryker run' mutate script`);
    for (const d of ['@stryker-mutator/core', '@stryker-mutator/vitest-runner']) {
      assert.ok(pkg.devDependencies?.[d], `${s}: missing devDependency ${d}`);
    }
  }
});

// Coverage gate (standards/testing-tdd.md DoD): where a node stack runs vitest with
// --coverage, the coverage provider dep AND numeric thresholds must be present, so
// the gate is real rather than a coverage report with no floor.
test('node coverage gates are real (provider dep + thresholds) where enabled', async () => {
  for (const s of NODE_STACKS) {
    const pkg = JSON.parse(await readFile(tpl(s, 'package.json'), 'utf8'));
    if (!/--coverage/.test(pkg.scripts?.test ?? '')) continue;
    assert.ok(
      pkg.devDependencies?.['@vitest/coverage-v8'],
      `${s}: test runs --coverage but @vitest/coverage-v8 is not a devDependency`,
    );
    const cfgPath = ['vite.config.ts', 'vitest.config.ts']
      .map((f) => tpl(s, f))
      .find((p) => existsSync(p));
    assert.ok(cfgPath, `${s}: --coverage enabled but no vite/vitest config found`);
    const cfg = await readFile(cfgPath, 'utf8');
    assert.match(cfg, /coverage/, `${s}: config has no coverage block`);
    assert.match(cfg, /thresholds/, `${s}: coverage block sets no thresholds (no real gate)`);
  }
});

// Coverage floor for the python stack: pytest must enforce --cov-fail-under and ship pytest-cov.
test('python stack enforces a coverage floor', async () => {
  if (!STACKS.includes('python-service')) return;
  const jf = await readFile(tpl('python-service', 'justfile'), 'utf8');
  assert.match(jf, /--cov-fail-under/, 'python `just test` must enforce --cov-fail-under');
  const pyproject = await readFile(tpl('python-service', 'pyproject.toml'), 'utf8');
  assert.match(pyproject, /pytest-cov/, 'python dev deps must include pytest-cov');
});

// SCA gate (standards/security.md + ci-cd.md §7): every stack's effective CI workflow
// must run a real dependency-vulnerability scan. This was entirely absent before —
// audits lived only in `just security`, which CI never invoked.
test('every stack CI runs a real SCA gate', async () => {
  for (const s of STACKS) {
    const yml = await readFile(ciFor(s), 'utf8');
    assert.match(
      yml,
      /npm audit|pip-audit|cargo audit/,
      `${s}: CI must run an SCA gate (npm audit / pip-audit / cargo audit)`,
    );
  }
});

// Mutation + build gates must actually run in the node CI pipeline (ci-cd.md §6/§8),
// not merely exist as recipes.
test('_base CI runs the mutation and build gates', async () => {
  const yml = await readFile(tpl('_base', '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.match(yml, /just mutate/, '_base CI must run `just mutate`');
  assert.match(yml, /just build/, '_base CI must run `just build`');
});

// Build recipe parity: every node stack must define a `build` recipe (the shared
// _base CI runs `just build` for all of them).
test('every node stack justfile defines a `build` recipe', async () => {
  for (const s of NODE_STACKS) {
    const jf = await readFile(tpl(s, 'justfile'), 'utf8');
    assert.match(jf, /(^|\n)build:/, `${s}: justfile missing 'build' recipe`);
  }
});

// Clobber regression guard (the sync-templates bug): evals/run.mjs is a MANAGED file,
// so any stack that ships one MUST keep it byte-identical to _base — otherwise
// `just sync --apply` would silently overwrite stack-specific eval logic. Real
// per-stack eval logic lives in discovered *.eval.mjs modules instead.
test('stack evals/run.mjs never diverges from _base (managed file)', async () => {
  const base = await readFile(tpl('_base', 'evals', 'run.mjs'), 'utf8');
  for (const s of STACKS) {
    const p = tpl(s, 'evals', 'run.mjs');
    if (!existsSync(p)) continue;
    assert.equal(
      await readFile(p, 'utf8'),
      base,
      `${s}: evals/run.mjs diverges from _base (sync would clobber it)`,
    );
  }
});

// Discovered eval modules must default-export a function (the run.mjs contract).
test('every *.eval.mjs default-exports a function', async () => {
  for (const s of STACKS) {
    const evalDir = tpl(s, 'evals');
    if (!existsSync(evalDir)) continue;
    for (const f of readdirSync(evalDir).filter((n) => n.endsWith('.eval.mjs'))) {
      const mod = await import(pathToFileURL(path.join(evalDir, f)).href);
      assert.equal(typeof mod.default, 'function', `${s}/evals/${f}: must default-export a function`);
    }
  }
});
