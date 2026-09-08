// Invariant guard tests — mechanical enforcement of the patterns found in review.
// Run: node --test scripts/tests/*.test.mjs

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
      assert.equal(
        typeof mod.default,
        'function',
        `${s}/evals/${f}: must default-export a function`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Bash noise filter (ADR-0012)
// ---------------------------------------------------------------------------
// The hook ships in three places: the harness's own .claude/, templates/_base (so a
// generated project keeps the behaviour when opened standalone), and — via
// sync-templates — every scaffolded project. `guard-bash.mjs` demonstrates what
// happens without a drift gate: 24483 B in the harness, 1349 B in _base, 5260 B in
// monster-realm, three rule tables that no longer agree. These assertions exist so
// the same thing cannot happen to this one.

const QUIET_FILES = [
  'quiet-lib.mjs',
  'quiet-profiles.mjs',
  'quiet-run.mjs',
  'quiet-bash.mjs',
  'quiet.test.mjs',
];

test('generated projects ship the Bash noise-filter hook', async () => {
  for (const f of QUIET_FILES) {
    assert.ok(
      existsSync(tpl('_base', '.claude', 'hooks', 'quiet', f)),
      `_base must ship .claude/hooks/quiet/${f}`,
    );
  }
  const settings = JSON.parse(await readFile(tpl('_base', '.claude', 'settings.json'), 'utf8'));
  assert.match(
    JSON.stringify(settings.hooks?.PreToolUse ?? []),
    /quiet-bash\.mjs/,
    '_base/.claude/settings.json must wire PreToolUse -> quiet/quiet-bash.mjs',
  );
});

test('the noise-filter hook never diverges between the harness and _base', async () => {
  for (const f of QUIET_FILES) {
    const harness = await readFile(path.join(HARNESS, '.claude', 'hooks', 'quiet', f), 'utf8');
    const base = await readFile(tpl('_base', '.claude', 'hooks', 'quiet', f), 'utf8');
    assert.equal(harness, base, `.claude/hooks/quiet/${f} diverges from templates/_base`);
  }
});

// A rewrite that the permission layer reads as "multiple operations" is rejected
// outright (measured against Claude Code 2.1.240). The hook therefore has exactly
// one legal output shape, and this pins it end to end through the real process.
test('the noise filter rewrites to a single operator-free command, and only for noisy commands', () => {
  const hook = path.join(HARNESS, '.claude', 'hooks', 'quiet', 'quiet-bash.mjs');
  const ask = (command) => {
    const res = spawnSync(process.execPath, [hook], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, session_id: 's' }),
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, 'the hook must never block a tool call');
    return res.stdout.trim() ? JSON.parse(res.stdout) : null;
  };

  const rewritten = ask('cargo nextest run --workspace')?.hookSpecificOutput?.updatedInput?.command;
  assert.ok(rewritten, 'a noisy command must be rewritten');
  assert.doesNotMatch(rewritten, /[;&|<>`$()]/, 'the rewrite must contain no shell operator');

  for (const safe of ['ls -la', 'git status', 'cat README.md', 'cargo test 2>&1 | tail -5']) {
    assert.equal(ask(safe), null, `must not rewrite: ${safe}`);
  }
});

// The two settings files that govern REAL sessions were previously ungated: only
// templates/_base was asserted, so the harness's own wiring and monster-realm's
// could both be deleted with every gate still green.
test('the settings files that govern real sessions wire the noise filter', async () => {
  const targets = [
    path.join(HARNESS, '.claude', 'settings.json'),
    path.join(HARNESS, 'projects', 'monster-realm', '.claude', 'settings.json'),
  ];
  for (const file of targets) {
    if (!existsSync(file)) continue; // monster-realm is a separate, optional checkout
    const settings = JSON.parse(await readFile(file, 'utf8'));
    const pre = JSON.stringify(settings.hooks?.PreToolUse ?? []);
    assert.match(pre, /quiet-bash\.mjs/, `${file} must wire PreToolUse -> quiet/quiet-bash.mjs`);
    assert.match(pre, /guard-bash\.mjs/, `${file} must still wire the destructive-command guard`);
  }
});

// quiet.test.mjs reads its fixtures relative to itself, so a copy of the test
// without a matching copy of the fixtures is a test that cannot run.
test('the noise-filter fixtures never diverge between the harness and _base', async () => {
  const dirOf = (root) => path.join(root, '.claude', 'hooks', 'quiet', 'fixtures');
  const harnessDir = dirOf(HARNESS);
  const baseDir = dirOf(path.join(HARNESS, 'templates', '_base'));
  const names = readdirSync(harnessDir).sort();
  assert.deepEqual(
    readdirSync(baseDir).sort(),
    names,
    'fixture SETS differ between the harness and _base',
  );
  for (const n of names) {
    assert.equal(
      await readFile(path.join(harnessDir, n), 'utf8'),
      await readFile(path.join(baseDir, n), 'utf8'),
      `fixtures/${n} diverges from templates/_base`,
    );
  }
});

// ---------------------------------------------------------------------------
// rb-69 — `### rb-27` must retract its false deferral premise in place
// ---------------------------------------------------------------------------
// `M-residual-backlog.spec.md`'s `### rb-27` still reads as launchable work while
// its stated reason ("no ADR number was reserved") has been false since
// 2026-09-01, when R-rb-3-X9 was closed as moot. The shape enforced here is NOT
// invented for this slice: `### rb-44` was repaired in place on 2026-09-04 with a
// retitled heading plus a `RESOLVED <date> (mr-gates residuals close --slice
// <id> --force):` paragraph appended below `Tests:`, and this copies that live
// precedent. rb-44 itself is deliberately NOT named in any assertion below — a
// future slice re-titling it must not RED harness CI.
//
// The premise line is left VERBATIM on purpose: it is a mechanical copy of the
// residual row's `reason` and the spec's own §1 says promotion is a copy, not
// spec authoring. Quoted testimony gets marked, never silently rewritten.
//
// HONEST LIMIT: this oracle cannot verify that ADR-0208 exists. That ADR lives in
// `projects/`, a separate repo these tests are forbidden to read. What is verified
// is document<->document correspondence: rb-27's retraction says exactly what the
// tracked harness-side adjudication in `memory/projects/monster-realm-handoff*.md`
// says. That is not ground truth, and is not claimed to be.

const RB27_SPEC = path.join(HARNESS, 'specs', 'monster-realm-v2', 'M-residual-backlog.spec.md');
const RB27_MEMORY = path.join(HARNESS, 'memory', 'projects');

// The false premise. Pinned FILE-scoped, never repo-scoped: the archived handoff
// and rb-69's own plan both quote it verbatim, so a repo-wide count is a false-RED.
const RB27_PREMISE = 'no ADR number was reserved for rb-3';
const RB27_DEFERRED_LINE = `Deferred with reason: ${RB27_PREMISE} (the supervisor-assigned slot is empty)`;

// `\b` would still match `rb-27-x`, and a bare prefix would collide with `rb-2`.
const RB27_HEADING = /^### rb-27(?![\w.-])/gm;
// The heading's TITLE SLOT — immediately after the em dash (U+2014), immediately
// before ` (from `. Not a bare `includes('RESOLVED')`: the same file carries
// `NO_BG_UNRESOLVED`, and `UNRESOLVED` contains `RESOLVED`.
const RB27_HEADING_MARKER = /^### rb-27 — RESOLVED, do not build \(from /;
// The `rb-27` here is the literal slice id, so copying another section's
// retraction paragraph into rb-27 does not satisfy it.
const RB27_RETRACTION =
  /^RESOLVED (\d{4}-\d{2}-\d{2}) \(mr-gates residuals close --slice rb-27 --force\):/gm;
// The tracked adjudication, matched by shape and never by line number:
// "rb-27 (R-rb-3-X9) SHOULD NOT BE BUILT AS SPEC'D.** Its substance is already in ADR-0208 D2".
const RB27_ADJUDICATION = /rb-27[^\n]{0,200}?already in ADR-(\d{4}) D2/g;

// FROZEN. Free text is not gateable; frozen text is. A needle-based oracle was
// PROVEN to go green on an INVERTED retraction that carries every pinned token
// while affirming the false premise, on a fabricated date, and on a six-word stub.
// These fragments are the retraction's own hard-wrapped lines; joining them with a
// single space is exactly what whitespace-collapsing the paragraph produces.
const RB27_FROZEN = [
  'RESOLVED 2026-09-01 (mr-gates residuals close --slice rb-27 --force): the deferral premise',
  "recorded above is false and is kept only as the residual row's verbatim reason. ADR-0208",
  "Decision 2, headed `(rb-3)`, already records this section's subject in full — the in-process",
  "`Object.prototype` write-hygiene pattern — and rb-26's own review (R-rb-26-X8-rb-3-x9-fg72c,",
  '2026-09-01) independently confirmed the substance is already recorded there. R-rb-3-X9 was',
  'closed as moot the same day; no implementation work remains, and building this section would',
  'duplicate that decision. Do not re-launch this section as a slice; it names no remaining work.',
].join(' ');

// The window ends at the next level-1..3 heading of ANY kind, not just the next
// `### rb-`: an unparsed `### Addendum` inside the section would otherwise let a
// retraction planted below it count as in-window while `mr-gates`' own
// `NEXT_HEAD = ^### ` truncates there.
async function rb27Section() {
  const text = await readFile(RB27_SPEC, 'utf8');
  const heads = [...text.matchAll(RB27_HEADING)];
  assert.equal(
    heads.length,
    1,
    `M-residual-backlog.spec.md must carry exactly one '### rb-27' section (found ${heads.length})`,
  );
  const start = heads[0].index;
  const from = text.slice(start);
  const nl = from.indexOf('\n');
  assert.ok(nl > 0, "the '### rb-27' heading line is unterminated");
  const rest = from.slice(nl + 1);
  const next = /^#{1,3} /m.exec(rest);
  const body = next ? rest.slice(0, next.index) : rest;
  assert.ok(body.length > 0, "the '### rb-27' section body is empty");
  return {
    text,
    heading: from.slice(0, nl),
    body,
    bodyStart: start + nl + 1,
    bodyEnd: start + nl + 1 + body.length,
  };
}

const rb27Retraction = (body) => [...body.matchAll(RB27_RETRACTION)];

test('rb-27 retracts its false deferral premise in place', async () => {
  const { text, heading, body, bodyStart, bodyEnd } = await rb27Section();

  const premiseCount = text.split(RB27_PREMISE).length - 1;
  assert.equal(
    premiseCount,
    1,
    `the false premise must appear exactly once in M-residual-backlog.spec.md (found ${premiseCount}) — a second copy is a second thing to mislead a reader`,
  );

  assert.match(
    heading,
    RB27_HEADING_MARKER,
    `rb-27's heading must carry the 'RESOLVED, do not build' marker in its title slot (the scanning reader's and mr-gates.find_section's first surface); got: ${heading}`,
  );

  assert.ok(
    body.includes(RB27_DEFERRED_LINE),
    "the historical 'Deferred with reason:' line must be preserved verbatim — it is a mechanical copy of the residual row's reason, marked rather than rewritten",
  );

  const inWindow = rb27Retraction(body);
  assert.equal(
    inWindow.length,
    1,
    `rb-27's section must carry exactly one 'RESOLVED <date> (mr-gates residuals close --slice rb-27 --force):' paragraph (found ${inWindow.length}) — a second, contradicting paragraph is not a second record`,
  );

  const fileWide = [...text.matchAll(RB27_RETRACTION)];
  assert.equal(
    fileWide.length,
    1,
    `rb-27's retraction must appear exactly once file-wide (found ${fileWide.length}) — a copy parked in a neighbouring section annotates the wrong slice`,
  );
  assert.ok(
    fileWide[0].index >= bodyStart && fileWide[0].index < bodyEnd,
    "rb-27's retraction must sit inside rb-27's own section window",
  );

  const premiseAt = body.indexOf(RB27_PREMISE);
  assert.ok(premiseAt >= 0, "the premise line must be inside rb-27's own section window");
  assert.ok(
    inWindow[0].index > premiseAt,
    `the retraction must sit BELOW the premise it retracts (retraction at ${inWindow[0].index}, premise at ${premiseAt}) — presence alone does not gate reading order`,
  );
});

test('rb-27 retraction text is frozen and matches the tracked adjudication', async () => {
  const { body } = await rb27Section();
  const hits = rb27Retraction(body);
  assert.equal(
    hits.length,
    1,
    `expected exactly one rb-27 retraction paragraph to freeze, found ${hits.length}`,
  );

  const tail = body.slice(hits[0].index);
  const blank = tail.search(/\n[ \t]*\n/);
  const paragraph = (blank === -1 ? tail : tail.slice(0, blank)).trim();
  assert.ok(
    paragraph.length > 200,
    `the retraction paragraph is ${paragraph.length} chars — too short to be a real record (a six-word stub satisfies every needle)`,
  );

  assert.equal(
    paragraph.split(/\s+/).join(' '),
    RB27_FROZEN,
    'the rb-27 retraction paragraph must match the frozen text character for character (line-wrapping is free, wording is not)',
  );

  // Cross-document correspondence: the ADR id in the retraction must come from the
  // tracked adjudication, not from this test's own literal. Read as a UNION over
  // every handoff document so a monthly archive rotation cannot make it vacuous.
  const docs = readdirSync(RB27_MEMORY)
    .filter((n) => n.startsWith('monster-realm-handoff') && n.endsWith('.md'))
    .sort();
  assert.ok(docs.length > 0, `no monster-realm-handoff*.md documents found in ${RB27_MEMORY}`);
  const found = [];
  for (const d of docs) {
    const doc = await readFile(path.join(RB27_MEMORY, d), 'utf8');
    for (const m of doc.matchAll(RB27_ADJUDICATION)) found.push({ doc: d, adr: m[1] });
  }
  assert.ok(
    found.length > 0,
    `no tracked rb-27 adjudication sentence ('… already in ADR-nnnn D2') found across ${docs.length} handoff document(s): ${docs.join(', ')}`,
  );
  const adrs = [...new Set(found.map((f) => f.adr))];
  assert.equal(
    adrs.length,
    1,
    `the tracked handoff documents disagree on rb-27's ADR id: ${JSON.stringify(found)}`,
  );

  const cited = [...new Set([...paragraph.matchAll(/ADR-\d{4}/g)].map((m) => m[0]))].sort();
  assert.deepEqual(
    cited,
    [`ADR-${adrs[0]}`],
    `rb-27's retraction must cite exactly the ADR the tracked adjudication names: ${JSON.stringify(found)}`,
  );
});

test('the rb-27 annotation is inert and cannot inject a phantom gate', async () => {
  const { body } = await rb27Section();

  assert.ok(
    !body.includes('```'),
    "rb-27's section must contain no code fence — a fenced 'retraction' is invisible to a reader while its raw bytes still satisfy any regex",
  );
  assert.ok(
    !body.includes('<!--'),
    "rb-27's section must contain no HTML comment — a commented-out 'retraction' is invisible to a reader while its raw bytes still satisfy any regex",
  );
  assert.doesNotMatch(
    body,
    /\bSHALL\b/,
    "rb-27's section must contain no SHALL — mr-gates.extract_criteria would seed it as a live acceptance criterion",
  );
  assert.doesNotMatch(
    body,
    /^\s*[-*+]\s+/m,
    "rb-27's section must contain no bullet line — mr-gates.extract_criteria harvests bulleted lines",
  );

  const hits = rb27Retraction(body);
  assert.equal(
    hits.length,
    1,
    `expected exactly one rb-27 retraction paragraph to check for inertness, found ${hits.length}`,
  );
  // Scoped BELOW the retraction: the section legitimately carries `touches:`,
  // `EARS:` and `Tests:` lines above it, which are the promotion template's own.
  const below = body.slice(hits[0].index);
  assert.doesNotMatch(
    below,
    /^(### |touches:|EARS:|Tests:)/m,
    "no line at or below rb-27's retraction may open a new section or a promotion-template field (mr-gates would absorb it into _ears_span or seed a phantom gate)",
  );
});
