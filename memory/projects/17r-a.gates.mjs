#!/usr/bin/env node
// 17r-a acceptance-gate runner. ONE arm per gate; every printed number is DERIVED from the run.
//
// WHY A SCRIPT AND NOT AN INLINE CHECK: `mr-gates lint` requires a seeded gate's CHECK to *start*
// with a real runner (`command_head` skips only `VAR=value` tokens), so a `cd … && … && node …`
// one-liner is rejected. Same shape as `rb-37.gates.mjs`.
//
// THE LOAD-BEARING ASSERTIONS ARE THE CHILD'S EXIT STATUS + the report's own `success` flag, never
// the counters alone. MEASURED by this slice's red-team on vitest 4.1.11: a spec that throws at
// COLLECTION time gets a `testResults[i]` entry with `status:"failed"` and `assertionResults:[]`
// but contributes ZERO to `numFailedTests` — only `numFailedTestSuites` moves. A gate reading
// `numFailedTests === 0` alone ships over a spec file that never ran a single assertion.
//
// TWO ARMS, DELIBERATELY DISJOINT:
//   purity — `evals/reduced-motion-purity.eval.mjs`. MEASURED bypass this closes: an inline raw
//            preference read written directly into main.ts (never importing the owner module) is
//            a real A11Y-28 single-owner violation and passes ALL FOUR behavioural teeth 4/4.
//            Only this eval sees THAT shape, which is why the arm is here.
//            HONEST LIMIT, MEASURED by this slice's artifact red-team — do not read this arm as
//            proving single-ownership. The eval's census is a RAW SUBSTRING scan for two literal
//            tokens, so splitting either literal across a `+` / `.join('')` boundary in a new
//            module evades it entirely: a decoy reader built that way, wired into main.ts in
//            place of the owner, was measured passing BOTH arms (`intruders=0`, `teeth=4/4`)
//            while `render/motionPreference.ts` became unconsumed dead code. Token-splitting is
//            a pre-existing DECLARED residual of that eval, compensated by the mandatory
//            desync-guard review, not something this gate closes. Tracked as R-17ra-PURITYSPLIT.
//   teeth  — the four RM17A behavioural teeth over the live render loop.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WORKTREE = process.argv[2];
const ARM = process.argv[3];
if (WORKTREE === undefined || ARM === undefined) {
  console.log('usage: 17r-a.gates.mjs <worktree> <b1>');
  process.exit(2);
}
const CLIENT = path.join(WORKTREE, 'client');
const VITEST_BIN = path.join(CLIENT, 'node_modules', '.bin', 'vitest');
// Node 24 must be first on the child's PATH: the vitest shim is `#!/usr/bin/env node` and the
// default PATH in this harness resolves node to v18, which cannot load the project's config.
const NODE_BIN_DIR = path.join(process.env.HOME ?? '', '.asdf', 'installs', 'nodejs', '24.13.1', 'bin');
const CHILD_ENV = { ...process.env, PATH: `${NODE_BIN_DIR}:${process.env.PATH ?? ''}`, FORCE_COLOR: '0' };

const SPECS = [
  'src/main.reducedMotionWiring.test.ts', // the slice's own gate
  'src/main.a11yFocus.test.ts', // co-run: the other two runtime importers of ./main now
  'src/main.battle-reseed.test.ts', //          execute the new module-scope preference read
];
// PREFIX-FREE BY CONSTRUCTION, and re-checked at runtime below. MEASURED (this slice's red-team):
// with the originally-planned `RM17A-ONE-QUERY`, the id `RM17A-ON` is a literal SUBSTRING of it,
// which made the exactly-once census BOTH unsatisfiable for a correct impl (counts 2) AND a false
// green when the RM17A-ON test was deleted outright (the longer title still carried the substring).
const TEETH = ['RM17A-ON', 'RM17A-OFF', 'RM17A-LIVE', 'RM17A-SINGLEQ'];

function fail(line) {
  console.log(line);
  process.exit(1);
}

/** The disjoint purity arm. Imports the eval and CALLS its default export: running
 *  `node evals/<x>.eval.mjs` directly exits 0 VACUOUSLY (these evals carry no main guard). */
function armPurity() {
  const src =
    'import("./evals/reduced-motion-purity.eval.mjs")' +
    '.then((m) => m.default())' +
    '.then((r) => { if (!r.pass) { console.log("PURITY-FAIL " + r.detail); process.exit(1) } ' +
    'console.log("PURITY-PASS " + r.detail) })' +
    '.catch((e) => { console.log("PURITY-THREW " + e.message); process.exit(1) })';
  const r = spawnSync(process.execPath, ['-e', src], {
    cwd: WORKTREE,
    encoding: 'utf8',
    env: CHILD_ENV,
    timeout: 300000,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  if (r.error !== undefined) fail(`B1 FAIL purity-spawn-error ${r.error.code ?? r.error.message}`);
  if (r.status !== 0) fail(`B1 FAIL purity-arm exit=${r.status} :: ${out.split('\n').slice(-2).join(' | ')}`);
  if (out.indexOf('PURITY-PASS') === -1) fail(`B1 FAIL purity-arm-no-verdict :: ${out.slice(-300)}`);
  return out.split('\n').filter((l) => l.indexOf('PURITY-PASS') !== -1)[0] ?? '';
}

/** Run vitest once and return { exit, report } — a MISSING report is a hard failure, never a zero. */
function runVitest(specs) {
  if (!existsSync(VITEST_BIN)) fail(`B1 FAIL vitest-binary-missing at ${VITEST_BIN} (run: cd client && npm ci)`);
  const dir = mkdtempSync(path.join(tmpdir(), '17r-a-gate-'));
  const out = path.join(dir, 'report.json');
  try {
    const r = spawnSync(
      VITEST_BIN,
      ['run', '--no-file-parallelism', '--reporter=json', `--outputFile=${out}`, ...specs],
      { cwd: CLIENT, encoding: 'utf8', env: CHILD_ENV, timeout: 600000 },
    );
    if (r.error !== undefined) fail(`B1 FAIL spawn-error ${r.error.code ?? r.error.message}`);
    if (r.signal !== null) fail(`B1 FAIL child-killed-by-signal ${r.signal}`);
    if (!existsSync(out)) fail(`B1 FAIL no-json-report-written (vitest exit=${r.status})`);
    return { exit: r.status, report: JSON.parse(readFileSync(out, 'utf8')) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function armB1() {
  const purityLine = armPurity();

  // Re-derive the prefix-free property from TEETH itself, so a future edit that renames a tooth
  // into a prefix of another reds HERE instead of silently hollowing the census below.
  for (const a of TEETH) {
    for (const b of TEETH) {
      if (a !== b && b.indexOf(a) !== -1) {
        fail(`B1 FAIL tooth-id ${a} is a SUBSTRING of ${b} — the exactly-once census is then both unsatisfiable and forgeable`);
      }
    }
  }

  const { exit, report } = runVitest(SPECS);
  if (exit !== 0) fail(`B1 FAIL vitest-exit=${exit}`);
  if (report.success !== true) fail(`B1 FAIL report.success=${report.success}`);
  if (report.numFailedTestSuites !== 0) {
    fail(`B1 FAIL numFailedTestSuites=${report.numFailedTestSuites} — a spec that throws at COLLECTION contributes 0 to numFailedTests`);
  }
  if (report.numFailedTests !== 0 || report.numPendingTests !== 0 || report.numTodoTests !== 0) {
    fail(`B1 FAIL failed=${report.numFailedTests} pending=${report.numPendingTests} todo=${report.numTodoTests} — a skipped tooth is a silently ungated one`);
  }
  if (report.testResults.length !== SPECS.length) {
    fail(`B1 FAIL ${report.testResults.length} spec file(s) ran, expected ${SPECS.length} — a MISSING spec file is silently dropped from the report, not padded`);
  }

  const names = report.testResults.reduce(
    (acc, f) => acc.concat((f.assertionResults ?? []).map((a) => a.fullName ?? a.title)),
    [],
  );
  const counts = TEETH.map((t) => ({ t, n: names.filter((x) => x.indexOf(t) !== -1).length }));
  const bad = counts.filter((c) => c.n !== 1);
  if (bad.length !== 0) {
    fail(`B1 FAIL teeth ${TEETH.length - bad.length}/${TEETH.length} — wrong occurrence count for: ${bad.map((c) => `${c.t}=${c.n}`).join(',')}`);
  }
  const hit = counts.length - bad.length;
  console.log(purityLine);
  console.log(
    `B1 REDUCED-MOTION WIRING OK teeth=${hit}/${TEETH.length} files=${report.testResults.length} tests=${report.numTotalTests} failed=0 pending=0 todo=0 suites-failed=0 vitest-exit=0`,
  );
}

if (ARM === 'b1') armB1();
else fail(`B1 FAIL unknown-arm ${ARM}`);
