#!/usr/bin/env node
// 17r-b acceptance-gate runner. ONE arm (b1); every printed number is DERIVED from the run.
//
// WHY A SCRIPT AND NOT AN INLINE CHECK: `mr-gates lint` requires a seeded gate's CHECK to *start*
// with a real runner (`command_head` skips only `VAR=value` tokens), so a `cd … && … && node …`
// one-liner is rejected. Same shape as `17r-a.gates.mjs` / `rb-37.gates.mjs`, minus 17r-a's purity
// arm (ADR-0224: this slice adds no eval; its proof-of-teeth is ordinary vitest).
//
// THE LOAD-BEARING ASSERTIONS ARE THE CHILD'S EXIT STATUS + the report's own `success` flag, never
// the counters alone. MEASURED (17r-a red-team, vitest 4.1.x): a spec that throws at COLLECTION
// time gets a `testResults[i]` entry with `status:"failed"` and `assertionResults:[]` but
// contributes ZERO to `numFailedTests` — only `numFailedTestSuites` moves.
//
// TWO CENSUSES, DELIBERATELY DIFFERENT IN SHAPE:
//   teeth — each RSD17B-* id occurs in EXACTLY ONE test title across the five specs (a deleted or
//           renamed tooth reds; a duplicated id reds — the census is by substring, so ids are
//           prefix-free by construction and re-checked at runtime).
//   floor — `src/main.battle-reseed.test.ts` must run AT LEAST `RESEED_FLOOR` tests. MEASURED by
//           this slice's plan red-team (F2): with only the teeth census, deleting the pre-existing
//           T3 + T6 — the ONLY two tests that prove the latch RESOLVES under the ignore-signal
//           mutant — left the gate green at teeth=7/7. The floor is what makes 16r-f's T1..T10
//           load-bearing rather than decorative.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WORKTREE = process.argv[2];
const ARM = process.argv[3];
if (WORKTREE === undefined || ARM === undefined) {
  console.log('usage: 17r-b.gates.mjs <worktree> <b1>');
  process.exit(2);
}
const CLIENT = path.join(WORKTREE, 'client');
const VITEST_BIN = path.join(CLIENT, 'node_modules', '.bin', 'vitest');
// Node 24 must be first on the child's PATH: the vitest shim is `#!/usr/bin/env node` and the
// default PATH in this harness resolves node to v18, which cannot load the project's config.
const NODE_BIN_DIR = path.join(process.env.HOME ?? '', '.asdf', 'installs', 'nodejs', '24.13.1', 'bin');
const CHILD_ENV = { ...process.env, PATH: `${NODE_BIN_DIR}:${process.env.PATH ?? ''}`, FORCE_COLOR: '0' };

const RESEED_SPEC = 'src/main.battle-reseed.test.ts';
const SPECS = [
  RESEED_SPEC, // the slice's own gate (EARS (d) + (e), runtime import of main.ts)
  'src/net/connection.test.ts', // the connection.ts source-scan pins this slice edits (SIGNAL/CARRIES)
  'src/main.wiring.test.ts', // the onReconnect-region + exact-signature pins the main.ts edit could trip
  'src/main.a11yFocus.test.ts', // co-run: the other two runtime importers of ./main execute the new
  'src/main.reducedMotionWiring.test.ts', //   module-scope declarations and the widened connect options
];
// 11 pre-existing (T1,T2,T3,T4,T5,T6,T7,T7b,T8,T9,T10) + 7 new (the RSD17B-* teeth below minus the two
// connection.test.ts pins). A LOWER count means a pre-existing tooth was deleted.
const RESEED_FLOOR = 18;
// PREFIX-FREE BY CONSTRUCTION, and re-checked at runtime below (17r-a precedent: an id that is a
// substring of another makes the exactly-once census both unsatisfiable and forgeable).
const TEETH = [
  'RSD17B-STALEROW',
  'RSD17B-ONGOINGROW',
  'RSD17B-REARM',
  'RSD17B-NOBATTLE',
  'RSD17B-IDROT',
  'RSD17B-ORPHAN',
  'RSD17B-TWOFLUSH', // red-team survivor (d): a self-arming listener needs TWO pre-hydration flushes to expose
  'RSD17B-SIGNAL',
  'RSD17B-CARRIES',
];

function fail(line) {
  console.log(line);
  process.exit(1);
}

/** Run vitest once and return { exit, report } — a MISSING report is a hard failure, never a zero. */
function runVitest(specs) {
  if (!existsSync(VITEST_BIN)) fail(`B1 FAIL vitest-binary-missing at ${VITEST_BIN} (run: cd client && npm ci)`);
  const dir = mkdtempSync(path.join(tmpdir(), '17r-b-gate-'));
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

  // The floor: located by path SUFFIX (the report carries absolute paths), and every counted test
  // must itself be `passed` — a floor met by pending/failed entries would be a hollow floor.
  const reseedFile = report.testResults.filter((f) => String(f.name).endsWith(RESEED_SPEC));
  if (reseedFile.length !== 1) fail(`B1 FAIL reseed-spec-entries=${reseedFile.length} (expected exactly 1 for ${RESEED_SPEC})`);
  const reseedTests = (reseedFile[0].assertionResults ?? []).filter((a) => a.status === 'passed');
  if (reseedTests.length < RESEED_FLOOR) {
    fail(`B1 FAIL reseed-file-tests=${reseedTests.length} below floor ${RESEED_FLOOR} — a pre-existing 16r-f tooth (T1..T10) was deleted or is not passing`);
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
  console.log(
    `B1 RECONNECT HYDRATION LATCH OK teeth=${hit}/${TEETH.length} files=${report.testResults.length} tests=${report.numTotalTests} reseed-file-tests=${reseedTests.length} failed=0 pending=0 todo=0 suites-failed=0 vitest-exit=0`,
  );
}

if (ARM === 'b1') armB1();
else fail(`B1 FAIL unknown-arm ${ARM}`);
