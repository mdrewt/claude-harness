#!/usr/bin/env node
// rb-37 acceptance-gate runner. ONE arm per gate; every printed number is derived from the run.
//
// WHY A SCRIPT AND NOT AN INLINE CHECK: `mr-gates lint` requires a seeded gate's CHECK to *start*
// with a real runner (`command_head` skips only `VAR=value` tokens), so a `cd … && … && node …`
// one-liner is rejected — and inlining the census as a `node -e` blob would put the EXPECT string
// inside the CHECK, which is the echo-your-own-answer BLOCK. A script keeps each CHECK a single
// `node <this> <worktree> <arm>` invocation that the supervisor re-executes verbatim.
//
// THE LOAD-BEARING ASSERTION IN EVERY ARM IS THE CHILD'S EXIT STATUS + the report's own `success`
// flag, never `numFailedTests` alone. MEASURED on this worktree: neutering one `checked++` in
// overlayA11yWiring.test.ts makes its `afterAll` coverage floor fail as a SUITE-level error and the
// report reads `numTotalTests=116 numFailedTests=0 numPassedTests=116` — green by every counter —
// while `success` is false and the process exits 1. A gate reading counters alone ships over a
// fully-blinded spec file, which is exactly the bypass red-team produced for this slice.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WORKTREE = process.argv[2];
const ARM = process.argv[3];
if (WORKTREE === undefined || ARM === undefined) {
  console.log('usage: rb-37.gates.mjs <worktree> <g1|g2|g3|g4|g5>');
  process.exit(2);
}
const CLIENT = path.join(WORKTREE, 'client');
const VITEST_BIN = path.join(CLIENT, 'node_modules', '.bin', 'vitest');
const TARGET = 'src/ui/overlayA11yWiring.test.ts';
const PROOF = 'src/ui/overlayA11yWiring.concurrency.test.ts';
// Node 24 must be first on the child's PATH: the vitest shim is `#!/usr/bin/env node` and the
// default PATH in this harness resolves node to v18, which cannot load the project's config.
const NODE_BIN_DIR = path.join(process.env.HOME ?? '', '.asdf', 'installs', 'nodejs', '24.13.1', 'bin');
const CHILD_ENV = { ...process.env, PATH: `${NODE_BIN_DIR}:${process.env.PATH ?? ''}`, FORCE_COLOR: '0' };

function fail(line) {
  console.log(line);
  process.exit(1);
}

/** Run vitest once and return { exit, report } — a MISSING report is a hard failure, never a zero. */
function runVitest(extraArgs, specs) {
  if (!existsSync(VITEST_BIN)) fail(`RB37 FAIL vitest-binary-missing at ${VITEST_BIN}`);
  const dir = mkdtempSync(path.join(tmpdir(), 'rb37-gate-'));
  const out = path.join(dir, 'report.json');
  try {
    const r = spawnSync(
      VITEST_BIN,
      ['run', '--no-file-parallelism', ...extraArgs, '--reporter=json', `--outputFile=${out}`, ...specs],
      { cwd: CLIENT, encoding: 'utf8', env: CHILD_ENV, timeout: 300000 },
    );
    if (r.error !== undefined) fail(`RB37 FAIL spawn-error ${r.error.code ?? r.error.message}`);
    if (r.signal !== null) fail(`RB37 FAIL child-killed-by-signal ${r.signal}`);
    if (!existsSync(out)) fail('RB37 FAIL no-json-report-written');
    return { exit: r.status, report: JSON.parse(readFileSync(out, 'utf8')) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function census(j) {
  const rows = j.testResults.flatMap((f) => f.assertionResults);
  return {
    files: j.testResults.length,
    base: j.testResults.length === 1 ? path.basename(j.testResults[0].name) : '<multi>',
    total: j.numTotalTests,
    failed: j.numFailedTests,
    pending: j.numPendingTests,
    todo: j.numTodoTests,
    rows: rows.length,
    allPassed: rows.length > 0 && rows.every((r) => r.status === 'passed'),
    s10: rows.filter((r) => r.title.startsWith('S10-WIRE-')).length,
    success: j.success === true,
  };
}

/** Titles that PASSED and contain `needle`. Counting passes (not presence) is the point: a
 *  `-t` filter marks non-matching tests PENDING, so presence alone proves nothing ran. */
function passedMatching(j, needle) {
  return j.testResults
    .flatMap((f) => f.assertionResults)
    .filter((r) => r.status === 'passed' && r.title.indexOf(needle) >= 0).length;
}

if (ARM === 'g1' || ARM === 'g3') {
  // g1 = the concurrent mode alone. g3 = all four sequence modes must agree.
  const modes = ARM === 'g1' ? [['--sequence.concurrent']] : [[], ['--sequence.shuffle'], ['--sequence.concurrent'], ['--sequence.concurrent', '--sequence.shuffle']];
  let agreed = 0;
  let last = null;
  for (const m of modes) {
    const { exit, report } = runVitest(m, [TARGET]);
    const c = census(report);
    last = c;
    const ok =
      exit === 0 &&
      c.success &&
      c.files === 1 &&
      c.base === 'overlayA11yWiring.test.ts' &&
      c.total === 116 &&
      c.failed === 0 &&
      c.pending === 0 &&
      c.todo === 0 &&
      c.rows === 116 &&
      c.allPassed &&
      c.s10 === c.rows;
    if (!ok) {
      fail(`RB37-${ARM.toUpperCase()} FAIL mode='${m.join(' ')}' exit=${exit} success=${c.success} files=${c.files} base=${c.base} total=${c.total} f=${c.failed} pend=${c.pending} todo=${c.todo} allPassed=${c.allPassed} s10=${c.s10}/${c.rows}`);
    }
    agreed += 1;
  }
  if (ARM === 'g1') {
    console.log(`RB37-G1 PASS exit=0 success=true files=1 tests=${last.total} s10=${last.s10} f=0 pend=0 todo=0`);
  } else {
    console.log(`RB37-G3 PASS modes=${agreed}/${modes.length} tests=${last.total} exit=0 success=true delta=0`);
  }
} else if (ARM === 'g2' || ARM === 'g4') {
  // The WHOLE spec, never a `-t` filter. MEASURED: `-t` marks the non-matching arms PENDING, and
  // the spec's own `afterAll` floor (`armsRun === 4`) then fails as a SUITE-level error — exit 1,
  // `success:false`, `numFailedTests:0`. Filtering would therefore have to be paid for by weakening
  // that floor, which is the one device stopping a quarantined arm from going unnoticed.
  const { exit, report } = runVitest([], [PROOF]);
  if (exit !== 0 || report.success !== true || report.numFailedTests !== 0) {
    fail(`RB37-${ARM.toUpperCase()} FAIL exit=${exit} success=${report.success} f=${report.numFailedTests}`);
  }
  if (ARM === 'g2') {
    const neg = passedMatching(report, 'RB37-FLAG-CONTROL-NEGATIVE');
    const pos = passedMatching(report, 'RB37-FLAG-CONTROL-POSITIVE');
    if (neg !== 1 || pos !== 1) fail(`RB37-G2 FAIL negative=${neg} positive=${pos}`);
    console.log(`RB37-G2 PASS exit=0 success=true negative=${neg} positive=${pos} flag=LIVE`);
  } else {
    const n = passedMatching(report, 'RB37-RATIONALE-DURABLE');
    if (n !== 1) fail(`RB37-G4 FAIL rationale=${n}`);
    console.log(`RB37-G4 PASS exit=0 success=true rationale=${n}`);
  }
} else if (ARM === 'g5') {
  const SURFACES = ['justfile', 'evals/', 'client/vite.config.ts', 'client/tsconfig.json', 'client/package.json', 'client/package-lock.json'];
  const d = spawnSync('git', ['diff', '--name-only', 'origin/master', '--', ...SURFACES], { cwd: WORKTREE, encoding: 'utf8' });
  if (d.status !== 0) fail(`RB37-G5 FAIL git-diff-exit=${d.status}`);
  const changed = d.stdout.split('\n').filter((l) => l.trim() !== '');
  if (changed.length !== 0) fail(`RB37-G5 FAIL gate-surface-files-changed=${changed.length} ${changed.join(',')}`);
  const ci = spawnSync('just', ['ci'], { cwd: WORKTREE, encoding: 'utf8', env: CHILD_ENV, timeout: 3600000 });
  if (ci.status !== 0) fail(`RB37-G5 FAIL just-ci-exit=${ci.status}`);
  console.log(`RB37-G5 PASS gate-surface-delta=${changed.length} just-ci-exit=${ci.status}`);
} else {
  fail(`RB37 FAIL unknown-arm ${ARM}`);
}
