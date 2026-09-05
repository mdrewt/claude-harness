#!/usr/bin/env node
// 17r-e.claim-truth.mjs — acceptance-gate runner for slice 17r-e (comment-truth micro-sweep).
//
// Design rules (harness doctrine):
//   * Every success MARKER is printed ONLY on the success path, after every assertion for that
//     gate has held. `fail()` never prints a marker and always exits non-zero, so a red can never
//     become evidence.
//   * No dynamic `RegExp` anywhere (Semgrep `detect-non-literal-regexp`) — literal patterns,
//     String.includes / indexOf / split only.
//   * Every gate executes the REAL code or content it claims about. Nothing here greps for the
//     slice's own new wording: that would be theatre (and `mr-gates lint` rejects a static grep).
//
// Usage: node 17r-e.claim-truth.mjs <E1|E3|E4|E5|E6|all>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/17r-e';
// The FORK point, not the moving `origin/master`: a sibling slice merging first must not silently
// widen what E3 compares against.
const FORK = '0ed602f';
const TOOL_PATH = `${process.env.HOME}/.asdf/installs/nodejs/24.13.1/bin:${process.env.HOME}/.asdf/shims:${process.env.HOME}/.cargo/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
const ENV = { ...process.env, PATH: TOOL_PATH };

function fail(gate, why) {
  // No marker on this path, by construction.
  console.error(`17r-e-${gate} FAILED: ${why}`);
  process.exit(1);
}

function wt(rel) {
  return path.join(WT, rel);
}

/** The file's content at the fork commit, read out of the worktree's shared object store. */
function atFork(rel) {
  return execFileSync('git', ['show', `${FORK}:${rel}`], {
    cwd: WT,
    env: ENV,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

/** Non-overlapping occurrence count of a literal needle. */
function countOf(haystack, needle) {
  let n = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    n += 1;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return n;
}

// ===========================================================================
// E1 — the four #app-mounted views really do get distinct roots.
// Drives the EXISTING pinned test rather than asserting the comment's wording.
// ===========================================================================
function e1() {
  const out = mkdtempSync(path.join(tmpdir(), '17r-e-e1-'));
  const jsonPath = path.join(out, 'vitest.json');
  try {
    try {
      execFileSync(
        'npx',
        [
          'vitest',
          'run',
          '--reporter=json',
          `--outputFile=${jsonPath}`,
          'src/ui/boxView.test.ts',
          '-t',
          'S4-CROSS-VIEW-DISTINCT-ROOTS',
        ],
        { cwd: path.join(WT, 'client'), env: ENV, encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (e) {
      fail('E1', `vitest exited non-zero: ${String(e.stdout || '')}${String(e.stderr || '')}`);
    }

    let report;
    try {
      report = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      fail('E1', `could not read the vitest JSON report: ${e.message}`);
    }

    // A `-t` filter that matches nothing reports numTotalTests: 0 and exits 0. Requiring the pin
    // name to appear in an assertionResults TITLE is what makes this non-vacuous — a deleted or
    // renamed spec reds here instead of passing silently.
    const titles = [];
    for (const suite of report.testResults ?? []) {
      for (const a of suite.assertionResults ?? []) {
        if (a.status === 'passed') titles.push(a.title ?? a.fullName ?? '');
      }
    }
    const pinned = titles.filter((t) => t.includes('S4-CROSS-VIEW-DISTINCT-ROOTS'));
    if (report.numFailedTests !== 0) fail('E1', `numFailedTests=${report.numFailedTests}`);
    if (report.numPassedTests !== 1) fail('E1', `numPassedTests=${report.numPassedTests}, want 1`);
    if (pinned.length !== 1) {
      fail('E1', `passing tests titled S4-CROSS-VIEW-DISTINCT-ROOTS = ${pinned.length}, want 1`);
    }

    // Proof-of-teeth hole closed: a title match alone is satisfied by gutting the real test's BODY
    // down to a vacuous assertion while keeping the pinned title text (title-only decoy). Anchor on
    // structural fragments of the REAL behavioural body (boxView.test.ts:287-332, outside this
    // slice's touches:) within a bounded window after the title line, so a body-swap reds here even
    // though the title-match count above still reads 1.
    // Anchor on the `it(` DECLARATION, not the first mention: boxView.test.ts:95 names the pin in
    // its file header, so a findIndex on the bare pin lands 192 lines above the real body.
    const testSrc = readFileSync(wt('client/src/ui/boxView.test.ts'), 'utf8');
    const testLines = testSrc.split('\n');
    const declLines = [];
    for (let i = 0; i < testLines.length; i += 1) {
      if (testLines[i].includes("it('S4-CROSS-VIEW-DISTINCT-ROOTS")) declLines.push(i);
    }
    if (declLines.length !== 1) {
      fail('E1', `it('S4-CROSS-VIEW-DISTINCT-ROOTS declarations = ${declLines.length}, want 1`);
    }
    // Strip whole-line comments from the window BEFORE scanning: a raw `includes` is satisfied by
    // `// battleView.hide();`, so commenting the call out was a measured survivor (mutant M9).
    const body = testLines
      .slice(declLines[0], declLines[0] + 60)
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n');
    const roleAssertions = countOf(body, "boxRoot.getAttribute('role')");
    if (roleAssertions < 2) {
      fail(
        'E1',
        `only ${roleAssertions} boxRoot role assertion(s) within 60 lines of the pinned title — ` +
          'the "both before AND after closing" behaviour the title claims looks gutted',
      );
    }
    if (!body.includes('battleView.hide();')) {
      fail('E1', 'no battleView.hide() call within 60 lines of the pinned title — the close half of the cross-view check is gone');
    }
    if (!body.includes('new BattleView(app,')) {
      fail('E1', 'no second view opened on the SAME #app mount within 60 lines of the pinned title — the cross-view half is gone');
    }

    console.log('17r-e-E1:DISTINCT-ROOTS-PROVEN pin=S4-CROSS-VIEW-DISTINCT-ROOTS passed=1 failed=0');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// ===========================================================================
// E3 — diff hygiene. overlayA11y.ts is line-cited 102x from 18 files outside this slice's
// touches:, so the edit must be line-count neutral and confined to lines 51-54. Also proves the
// deferral of claims 2/3 was honored (both .ron files byte-identical to the fork).
// ===========================================================================
const OVERLAY = 'client/src/ui/overlayA11y.ts';
const RON_FILES = [
  'game-core/content/species/070-wave3.ron',
  'game-core/content/species/071-wave3-derived.ron',
];
const REGION_FIRST = 51; // 1-based, inclusive
const REGION_LAST = 54;

function e3() {
  const before = atFork(OVERLAY).split('\n');
  const after = readFileSync(wt(OVERLAY), 'utf8').split('\n');
  if (before.length !== after.length) {
    fail('E3', `line count ${before.length} -> ${after.length}; 102 citations would drift`);
  }
  for (let i = 0; i < before.length; i += 1) {
    const lineNo = i + 1;
    if (lineNo >= REGION_FIRST && lineNo <= REGION_LAST) continue;
    if (before[i] !== after[i]) {
      fail('E3', `line ${lineNo} changed outside the declared 51-54 region`);
    }
  }
  let changedInRegion = 0;
  for (let lineNo = REGION_FIRST; lineNo <= REGION_LAST; lineNo += 1) {
    if (before[lineNo - 1] !== after[lineNo - 1]) changedInRegion += 1;
  }
  if (changedInRegion === 0) fail('E3', 'lines 51-54 are unchanged — the fix did not land');

  for (const rel of RON_FILES) {
    if (atFork(rel) !== readFileSync(wt(rel), 'utf8')) {
      fail('E3', `${rel} was edited — claims 2/3 are DEFERred (content-hash coupling)`);
    }
  }
  console.log(
    `17r-e-E3:CITATION-SAFE lines=unchanged changed-region=51-54 ron-untouched=${RON_FILES.length}/${RON_FILES.length}`,
  );
}

// ===========================================================================
// E4 — claim 4 is a LIVE FACT, not an assertion: the real coerceRow throws on both fixtures the
// T3p/T3q teeth use, the accept branch the stale comment named is gone, and the eval is green.
// (Dynamic import, not `node evals/x.eval.mjs` — the adr-* evals have no main guard and exit 0
// silently, so a CLI invocation would be unsatisfiable.)
// ===========================================================================
const SCRIPT = 'scripts/playtest-report.mjs';
const EVAL = 'evals/playtest-report.eval.mjs';
const ACCEPT_BRANCH = "typeof rawIdentity === 'string'";

// Byte-for-byte the fixtures at evals/playtest-report.eval.mjs T3p / T3q.
const T3P_FIXTURE = {
  event_id: 10,
  kind: 1,
  identity: '0xc20081c5a6e7ac231130aae44dd6ed6215bb09537a4ce925da87f1afed767da6',
  species_id: 7,
  hp_permille: 300,
  bait_item_id: 0,
  success: true,
};
const T3Q_FIXTURE = {
  event_id: 10,
  kind: 1,
  identity: [''],
  species_id: 7,
  hp_permille: 300,
  bait_item_id: 0,
  success: true,
};

async function e4() {
  process.chdir(WT); // the eval reads repo-relative paths
  const { coerceRow } = await import(wt(SCRIPT));
  if (typeof coerceRow !== 'function') fail('E4', 'coerceRow is not exported');

  let threw = 0;
  for (const [tag, fixture] of [
    ['T3p', T3P_FIXTURE],
    ['T3q', T3Q_FIXTURE],
  ]) {
    try {
      coerceRow(fixture);
      fail('E4', `coerceRow did NOT throw on the ${tag} fixture — the tightening is not landed`);
    } catch (e) {
      if (String(e.message).startsWith('17r-e-E4')) throw e;
      threw += 1;
    }
  }

  const scriptSrc = readFileSync(wt(SCRIPT), 'utf8');
  const branches = countOf(scriptSrc, ACCEPT_BRANCH);
  if (branches !== 0) {
    fail('E4', `the accept branch the stale comment named still occurs ${branches}x in ${SCRIPT}`);
  }

  const mod = await import(wt(EVAL));
  const result = await mod.default();
  if (result?.pass !== true) fail('E4', `eval did not pass: ${result?.detail ?? 'no detail'}`);

  console.log(`17r-e-E4:T3P-T3Q-GREEN threw=${threw}/2 accept-branch=absent eval=PASS`);
}

// ===========================================================================
// E5 — the stale qualifier is gone AND the teeth it qualified SURVIVED.
//
// The anti-deletion half is the load-bearing one (red-team [HIGH]): the cheapest way to satisfy
// E4 + a naive E5 + `just ci` is to DELETE the T3p/T3q blocks outright — the eval already returns
// pass:true, `EXPECTED RED` trivially hits 0, and evals/run.mjs only knows filenames, so nothing
// counts the sub-checks. Pinning each marker at EXACTLY one occurrence reds both deletion (0) and
// a planted decoy (2).
// ===========================================================================
const STALE_QUALIFIER = 'EXPECTED RED';
const T3P_MARKER = 'T3p (tightened identity contract';
const T3Q_MARKER = 'T3q (tightened identity contract';
const SUMMARY_ECHO = '(T3p/T3q, tightened contract)';

function soleLineContaining(src, needle, gate, label) {
  const hits = src.split('\n').filter((l) => l.includes(needle));
  if (hits.length !== 1) fail(gate, `${label} occurs on ${hits.length} lines, want exactly 1`);
  return hits[0];
}

// Proof-of-teeth hole closed: pinning the MARKER COMMENT at exactly one occurrence is satisfied by
// a mutant that deletes the tooth's real `{ ... coerceRow(raw) ... }` behavioural block but leaves a
// one-line stub comment carrying the marker phrase (e.g. "// T3p (tightened identity contract):
// verified elsewhere"). That mutant keeps count===1 and the qualifier gone, yet the eval no longer
// actually re-proves the throw on every run. Anchor on structural fragments of the REAL test body
// within a bounded window after the marker line so a body-swap reds here too.
function markerGuardsRealThrow(lines, markerLineIdx, gate, label) {
  const window = lines.slice(markerLineIdx, markerLineIdx + 30).join('\n');
  if (!window.includes('coerceRow(raw)')) {
    fail(gate, `${label}: no coerceRow(raw) call within 30 lines of the marker — the tooth's behavioural body looks deleted`);
  }
  if (!window.includes('threw = true')) {
    fail(gate, `${label}: no "threw = true" within 30 lines of the marker — the throw-detection body looks deleted`);
  }
  if (!window.includes('if (!threw)')) {
    fail(gate, `${label}: no "if (!threw)" failure branch within 30 lines of the marker — the tooth cannot fail even if coerceRow stops throwing`);
  }
}

function e5() {
  const src = readFileSync(wt(EVAL), 'utf8');
  const stale = countOf(src, STALE_QUALIFIER);
  if (stale !== 0) fail('E5', `"${STALE_QUALIFIER}" still occurs ${stale}x in ${EVAL}`);

  const p = countOf(src, T3P_MARKER);
  const q = countOf(src, T3Q_MARKER);
  if (p !== 1) fail('E5', `T3p tooth marker occurs ${p}x, want exactly 1 (deleted? decoyed?)`);
  if (q !== 1) fail('E5', `T3q tooth marker occurs ${q}x, want exactly 1 (deleted? decoyed?)`);

  const srcLines = src.split('\n');
  const pLineIdx = srcLines.findIndex((l) => l.includes(T3P_MARKER));
  const qLineIdx = srcLines.findIndex((l) => l.includes(T3Q_MARKER));
  markerGuardsRealThrow(srcLines, pLineIdx, 'E5', 'T3p');
  markerGuardsRealThrow(srcLines, qLineIdx, 'E5', 'T3q');

  // The Section-3 summary echo is ALREADY accurate; touching it can only introduce a defect.
  const now = soleLineContaining(src, SUMMARY_ECHO, 'E5', 'the Section-3 summary echo');
  const then = soleLineContaining(atFork(EVAL), SUMMARY_ECHO, 'E5', 'the fork summary echo');
  if (now !== then) fail('E5', 'the already-accurate Section-3 summary echo was modified');

  console.log('17r-e-E5:QUALIFIER-CLEARED occurrences=0 teeth=T3p+T3q summary-echo=unchanged');
}

// ===========================================================================
// B1 (seeded umbrella) — all FOUR cited claims true. Claims 2 and 3 are DEFERred to backlog
// (game-core/content/** is raw-byte hashed by evals/content-version.eval.mjs against a baseline +
// CONTENT_VERSION, both outside this slice's touches:), so this cannot print today. It is written
// now so the successor slice has a ready green button.
// ===========================================================================
const CLAIM2_FALSEHOOD = 'Electric resists nothing but its own mirror';
const CLAIM3_FALSEHOOD = 'Tempestrix owns the Regeneration pivot';
const TYPE_CHART = 'game-core/content/type_chart.ron';
const SPECIES_DIR = 'game-core/content/species';
const REGEN = 'ability: Some(3)';

function claim2() {
  // The content fact the comment must describe: Electric resists BOTH Electric and Water.
  const chart = readFileSync(wt(TYPE_CHART), 'utf8');
  const mirror = 'attacker: Electric, defender: Electric, effectiveness: 5';
  const water = 'attacker: Water,    defender: Electric, effectiveness: 5';
  if (!chart.includes(mirror)) return 'type_chart.ron no longer has Electric->Electric at 0.5x';
  if (!chart.includes(water)) return 'type_chart.ron no longer has Water->Electric at 0.5x';
  const ron = readFileSync(wt(RON_FILES[0]), 'utf8');
  if (ron.includes(CLAIM2_FALSEHOOD)) return '070-wave3.ron still claims Electric resists only itself';
  return null;
}

function claim3() {
  // The content fact: THREE species carry Regeneration, so no one species "owns" it.
  const names = execFileSync('ls', [wt(SPECIES_DIR)], { env: ENV, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.ron'));
  let carriers = 0;
  for (const f of names) carriers += countOf(readFileSync(path.join(wt(SPECIES_DIR), f), 'utf8'), REGEN);
  if (carriers < 2) return `only ${carriers} species carry Regeneration — the claim may be true now`;
  const ron = readFileSync(wt(RON_FILES[1]), 'utf8');
  if (ron.includes(CLAIM3_FALSEHOOD)) {
    return `071-wave3-derived.ron still says Tempestrix OWNS Regeneration, but ${carriers} species carry it`;
  }
  return null;
}

async function b1() {
  e1();
  e3();
  await e4();
  e5();
  const two = claim2();
  if (two) fail('B1', `claim 2 unmet: ${two}`);
  const three = claim3();
  if (three) fail('B1', `claim 3 unmet: ${three}`);
  console.log('17r-e-B1:ALL-FOUR-CLAIMS-TRUE claims=4/4');
}

// ===========================================================================
// E6 — the full `just ci` gate, actually executed (so the supervisor's independent re-run is real).
// ===========================================================================
function e6() {
  try {
    execFileSync('just', ['ci'], {
      cwd: WT,
      env: ENV,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 2_400_000,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (e) {
    const tail = `${String(e.stdout || '')}${String(e.stderr || '')}`.split('\n').slice(-25).join('\n');
    fail('E6', `just ci did not exit 0:\n${tail}`);
  }
  console.log('17r-e-E6:JUST-CI-GREEN');
}

const GATE = process.argv[2];
switch (GATE) {
  case 'E1':
    e1();
    break;
  case 'E3':
    e3();
    break;
  case 'E4':
    await e4();
    break;
  case 'E5':
    e5();
    break;
  case 'E6':
    e6();
    break;
  case 'all':
    await b1();
    break;
  default:
    console.error('usage: node 17r-e.claim-truth.mjs <E1|E3|E4|E5|E6|all>');
    process.exit(2);
}
