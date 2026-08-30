#!/usr/bin/env node
// rb-18 mutation bite-proof driver (ADR-0010 RED-before / PASS-after, executed).
//
// THE MUTANT, one per view: delete the single `if (!wasVisible) ` guard in
// `client/src/ui/<view>.ts`, turning the guarded open into an UNGUARDED re-open — the exact
// defect residual R-m23-s10-X21 names. Every view carries EXACTLY ONE occurrence of that
// literal (claimView's second open site reads `if (vm.visible && !wasVisible)` and is a
// different string), so the substitution is unambiguous; the driver asserts the count is 1
// and refuses otherwise rather than mutating the wrong site.
//
// TWO ARMS, and the pre-arm is why this file exists rather than a transcript:
//   --arm before : reconstructs the PRE-SLICE spec from `git show origin/master:<spec>` into a
//                  throwaway sibling and asserts all 16 mutants SURVIVE it. That is the RED-before
//                  state; it stays re-executable after the fix has landed, which a plain
//                  `vitest run <spec>` cannot be.
//   --arm after  : runs the 16 mutants against the LIVE spec and asserts each one reds EXACTLY
//                  its own `S10-WIRE-REPEAT-NO-REOPEN:<id>` tooth. Pinning the FG label per mutant
//                  is load-bearing: an exit code alone cannot distinguish a hollowed target tooth
//                  from a neighbour catching the same mutant.
//   --arm latch  : the CHEAT red-team MEASURED, executed against all sixteen. Replaces the guard's
//                  live-visibility read with a per-instance one-shot latch (`WeakSet`), which is
//                  indistinguishable from correct code to the repeat tooth AND to twelve of the
//                  sixteen per-view specs, while leaving the overlay permanently unlabelled,
//                  untrapped and unfocused after its first close. It must red EXACTLY
//                  `S10-WIRE-REOPEN-AFTER-CLOSE:<id>` and must NOT red the repeat tooth -- if it
//                  reddened both, the two teeth would not be measuring different things.
//   --arm anchor : a SURGICAL mutant for the clause the other arms structurally cannot reach.
//                  `expect()` throws on first failure, so the guard-deletion mutant reds at the
//                  FIRST assertion of the repeat tooth and every later clause is unreached --
//                  meaning "16/16 bit" does NOT prove the anchor-identity clause bites. This arm
//                  keeps the guard CORRECT and instead rebuilds the manifest anchor node on every
//                  open, so the ONLY thing that can red is `root.querySelector(sel) === anchor`.
//                  Weakening that line to `.not.toBeNull()` would go unnoticed without this arm.
//   --arm wrongid: the same problem for the UNFILTERED call-count clause. A repeat branch that
//                  opens a DIFFERENT overlay leaves the per-id count at 1, so the first assertion
//                  passes and only the unfiltered count can red.
//   --arm perview: the residual's OWN claim (a), executed. Runs each mutant against that view's
//                  own spec and asserts it is caught BY a repeat-open tooth. This is what decides
//                  disposition (b) vs (c), and it is deliberately independent of anything this
//                  slice writes -- it passes identically on origin/master.
//
// NEVER `git stash` / `git checkout --` anything: a sibling agent may hold this worktree. The
// original bytes are held in memory and written back in a `finally`, and a failed restore throws.
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const WORKTREE = process.argv[2];
const ARM = (process.argv[3] ?? '').replace(/^--arm=?/, '') || 'after';
if (!WORKTREE || !['before', 'after', 'perview', 'latch', 'anchor', 'wrongid'].includes(ARM)) {
  console.error('usage: rb-18.bite-proof.mjs <worktree> before|after|perview|latch|anchor|wrongid');
  process.exit(64);
}
const CLIENT = path.join(WORKTREE, 'client');
const SPEC_REL = 'src/ui/overlayA11yWiring.test.ts';
const BASELINE_REL = 'src/ui/rb18BaselineSnapshot.tmp.test.ts';
const GUARD = 'if (!wasVisible) ';
const TOOTH = 'S10-WIRE-REPEAT-NO-REOPEN:';
// The per-view idiom, in the two spellings that actually ship: fifteen specs use
// `-REPEAT-NO-REOPEN`, `menuView.test.ts:1254` uses `MV-A11Y-REOPEN-EDGE-01`. Matching only the
// first would report a FALSE gap on menuView and push this slice down disposition (c).
const PER_VIEW_TOOTH = /REPEAT-NO-REOPEN|REOPEN-EDGE/;
const REOPEN_TOOTH = 'S10-WIRE-REOPEN-AFTER-CLOSE:';
// `OVERLAY_A11Y[id].initialFocusSelector`, transcribed from `client/src/ui/overlayRegistry.ts`.
// Transcribed rather than imported because this driver is plain node and the registry is TS; the
// `anchor` arm asserts a RED, so a stale selector here shows up as a missing bite, not a false pass.
const ANCHORS = {
  battleView: '[data-testid="battle-title"]',
  boxView: '[data-testid="box-title"]',
  raisingView: '[data-testid="raising-title"]',
  evolutionView: '[data-testid="evolution-title"]',
  dialogueView: '#dialogue-npc-name',
  questLogView: '#quest-log-list',
  healView: '#heal-list',
  shopView: '#shop-title',
  tradeView: '#trade-status',
  pvpView: '#pvp-challenge-status',
  leaderboardView: '#leaderboard-title',
  renameView: '#rename-input',
  tradeProposeView: '#tradepropose-target',
  helpView: '#help-title',
  menuView: '#menu-rows',
  claimView: '#claim-signin-btn',
};
const VIEWS = [
  'battleView', 'boxView', 'raisingView', 'evolutionView', 'dialogueView', 'questLogView',
  'healView', 'shopView', 'tradeView', 'pvpView', 'leaderboardView', 'renameView',
  'tradeProposeView', 'helpView', 'menuView', 'claimView',
];

function runSpec(specRel, tag) {
  const out = `/tmp/rb18-${ARM}-${tag}.json`;
  rmSync(out, { force: true }); // a stale report from a prior run reads as this run's result
  let code = 0;
  try {
    execFileSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`, specRel],
      { cwd: CLIENT, stdio: 'pipe' });
  } catch (e) { code = e.status ?? 1; }
  if (!existsSync(out)) throw new Error(`${tag}: vitest wrote no JSON report`);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const asserts = j.testResults.flatMap((f) => f.assertionResults);
  return {
    code,
    total: j.numTotalTests,
    failed: asserts.filter((a) => a.status === 'failed').map((a) => a.fullName),
    messages: asserts.filter((a) => a.status === 'failed')
      .flatMap((a) => a.failureMessages ?? []).join('\n'),
    pending: j.numPendingTests + j.numTodoTests,
  };
}

/** Run `fn` with one view's guard deleted, then restore that ONE file byte-for-byte. */
function withMutant(view, fn) {
  const file = path.join(CLIENT, 'src/ui', `${view}.ts`);
  const orig = readFileSync(file, 'utf8');
  const n = orig.split(GUARD).length - 1;
  if (n !== 1) throw new Error(`${view}: expected exactly 1 '${GUARD}', found ${n}`);
  const mutated = orig.split(GUARD).join('');
  writeFileSync(file, mutated);
  if (readFileSync(file, 'utf8') === orig) throw new Error(`${view}: mutation did not apply`);
  try { return fn(); } finally {
    writeFileSync(file, orig);
    if (readFileSync(file, 'utf8') !== orig) throw new Error(`${view}: RESTORE FAILED`);
  }
}

/**
 * Rewrite one view's guard into a per-instance one-shot latch, preserving everything else.
 *
 * `if (!wasVisible) <call>;`  ->  `if (!__rb18Latch.has(this)) { __rb18Latch.add(this); <call>; }`
 * plus a module-level `WeakSet`. `wasVisible` stays computed and used-once so no lint/type error
 * appears; the ONLY behavioural change is that a close no longer re-arms the open.
 */
function latchMutate(orig) {
  const line = orig.split('\n').find((l) => l.includes(GUARD));
  if (line === undefined) throw new Error('no guard line');
  const call = line.slice(line.indexOf(GUARD) + GUARD.length);
  const indent = line.slice(0, line.length - line.trimStart().length);
  const patched =
    `${indent}void wasVisible;\n` +
    `${indent}if (!__rb18Latch.has(this)) {\n` +
    `${indent}  __rb18Latch.add(this);\n` +
    `${indent}  ${call}\n` +
    `${indent}}`;
  let out = orig.split(line).join(patched);
  if (out === orig) throw new Error('latch substitution did not apply');
  // Declare the WeakSet after the LAST import, so it is module scope and hoisting is irrelevant.
  const imports = [...out.matchAll(/^import .*?;$/gms)];
  if (imports.length === 0) throw new Error('no import to anchor the latch declaration to');
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  return `${out.slice(0, at)}\n\nconst __rb18Latch = new WeakSet();${out.slice(at)}`;
}

/** The `<root>` expression a view hands `openOverlayA11y`, read off its own guard line. */
function rootExprOf(line, view) {
  const m = new RegExp(`openOverlayA11y\\('${view}', ([^)]+)\\)`).exec(line);
  if (m === null) throw new Error(`${view}: cannot read the root expression from its guard line`);
  return m[1];
}

/**
 * Run one surgical mutant per view and require it to red EXACTLY the named clause.
 *
 * `expectMsg` is matched against the failure output, not just the test name: the whole point of
 * these two arms is that the TEST already reds under coarser mutants, so only the MESSAGE tells us
 * which clause did it.
 */
function surgicalArm(tag, mutate, expectMsg, label) {
  const rows = [];
  for (const view of VIEWS) {
    const file = path.join(CLIENT, 'src/ui', `${view}.ts`);
    const orig = readFileSync(file, 'utf8');
    const line = orig.split('\n').find((l) => l.includes(GUARD));
    if (line === undefined) throw new Error(`${view}: no guard line`);
    const next = mutate(orig, line, view);
    if (next === orig) throw new Error(`${view}: ${tag} mutation did not apply`);
    writeFileSync(file, next);
    let r;
    try { r = runSpec(SPEC_REL, `${tag}-${view}`); } finally {
      writeFileSync(file, orig);
      if (readFileSync(file, 'utf8') !== orig) throw new Error(`${view}: RESTORE FAILED`);
    }
    const own = r.failed.filter((n) => n.includes(`${TOOTH}${view} `)).length;
    const stray = r.failed.length - own;
    const msg = r.messages.includes(expectMsg);
    rows.push({ view, code: r.code, own, stray, msg });
    console.log(`${view.padEnd(17)} exit=${r.code} failed=${r.failed.length} repeatTooth=${own} ` +
      `stray=${stray} clauseMsg=${msg ? 'Y' : 'N'}`);
  }
  const bit = rows.filter((x) => x.own === 1 && x.stray === 0 && x.msg).length;
  const ok = bit === 16;
  console.log(`\nRB18-${label} cheats=16 bitByClause=${bit} verdict=${ok ? 'Y' : 'N'}`);
  if (!ok) console.error(rows.filter((x) => !(x.own === 1 && x.stray === 0 && x.msg))
    .map((x) => `${x.view}: exit=${x.code} own=${x.own} stray=${x.stray} msg=${x.msg}`).join('\n'));
  process.exit(ok ? 0 : 1);
}

if (ARM === 'anchor') {
  // Guard left CORRECT; the anchor node is swapped for a clone on every open. Only the
  // `root.querySelector(sel) === anchor` clause can see this.
  surgicalArm('anchor', (orig, line, view) => {
    const indent = line.slice(0, line.length - line.trimStart().length);
    const root = rootExprOf(line, view);
    const sel = ANCHORS[view];
    if (sel === undefined) throw new Error(`${view}: no anchor selector`);
    const inject = `\n${indent}{ const __rb18a = ${root}.querySelector('${sel}');` +
      ` if (__rb18a !== null) __rb18a.replaceWith(__rb18a.cloneNode(true)); }`;
    return orig.split(line).join(line + inject);
  }, 'the repeat rebuilt the manifest anchor node', 'ANCHOR');
}

if (ARM === 'wrongid') {
  // Guard left CORRECT for the first open; the REPEAT branch opens a DIFFERENT overlay, so the
  // per-id count stays 1 and only the UNFILTERED count can see it.
  surgicalArm('wrongid', (orig, line, view) => {
    const other = VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length];
    const root = rootExprOf(line, view);
    return orig.split(line).join(`${line} else openOverlayA11y('${other}', ${root});`);
  }, 'the repeat must not open some OTHER overlay either', 'WRONGID');
}

if (ARM === 'latch') {
  const rows = [];
  for (const view of VIEWS) {
    const file = path.join(CLIENT, 'src/ui', `${view}.ts`);
    const orig = readFileSync(file, 'utf8');
    if (orig.split(GUARD).length - 1 !== 1) throw new Error(`${view}: guard count != 1`);
    writeFileSync(file, latchMutate(orig));
    let r;
    try { r = runSpec(SPEC_REL, `latch-${view}`); } finally {
      writeFileSync(file, orig);
      if (readFileSync(file, 'utf8') !== orig) throw new Error(`${view}: RESTORE FAILED`);
    }
    const mirror = r.failed.filter((n) => n.includes(`${REOPEN_TOOTH}${view} `)).length;
    const repeat = r.failed.filter((n) => n.includes(`${TOOTH}${view} `)).length;
    const stray = r.failed.length - mirror - repeat;
    rows.push({ view, code: r.code, mirror, repeat, stray });
    console.log(`${view.padEnd(17)} exit=${r.code} failed=${r.failed.length} ` +
      `mirrorTooth=${mirror} repeatTooth=${repeat} stray=${stray}`);
  }
  const bit = rows.filter((r) => r.mirror === 1).length;
  const survived = rows.filter((r) => r.code === 0).map((r) => r.view);
  // The repeat tooth MUST stay green under this cheat: that is the evidence the two teeth measure
  // different defects rather than one tooth doing both jobs.
  const repeatAlsoRed = rows.filter((r) => r.repeat !== 0).map((r) => r.view);
  const ok = bit === 16 && survived.length === 0 && repeatAlsoRed.length === 0;
  console.log(`\nRB18-LATCH cheats=16 bitByMirrorTooth=${bit} survived=${survived.length}` +
    ` repeatToothAlsoRed=${repeatAlsoRed.length} verdict=${ok ? 'Y' : 'N'}`);
  if (!ok) console.error(`survived=${survived.join(',')} repeatAlsoRed=${repeatAlsoRed.join(',')}`);
  process.exit(ok ? 0 : 1);
}

if (ARM === 'perview') {
  const rows = [];
  for (const view of VIEWS) {
    const r = withMutant(view, () => runSpec(`src/ui/${view}.test.ts`, view));
    const tooth = r.failed.filter((n) => PER_VIEW_TOOTH.test(n));
    rows.push({ view, code: r.code, failed: r.failed.length, tooth: tooth.length });
    console.log(`${view.padEnd(17)} exit=${r.code} total=${r.total} failed=${r.failed.length} ` +
      `reopenTooth=${tooth.length}`);
  }
  const survived = rows.filter((r) => r.code === 0).map((r) => r.view);
  const noTooth = rows.filter((r) => r.code !== 0 && r.tooth === 0).map((r) => r.view);
  const ok = survived.length === 0 && noTooth.length === 0;
  console.log(`\nRB18-PREMISE specs=16 caught=${16 - survived.length} byReopenTooth=` +
    `${16 - survived.length - noTooth.length} survived=${survived.length} verdict=${ok ? 'Y' : 'N'}`);
  if (!ok) console.error(`survived=${survived.join(',')} caughtWithoutTooth=${noTooth.join(',')}`);
  process.exit(ok ? 0 : 1);
}

let specRel = SPEC_REL;
let cleanup = () => {};
if (ARM === 'before') {
  // The PRE-SLICE spec, reconstructed from origin/master. A sibling file, never an overwrite of
  // the live spec — an interrupted run must not be able to leave the real spec reverted.
  const baseline = execFileSync('git', ['show', `origin/master:client/${SPEC_REL}`],
    { cwd: WORKTREE, encoding: 'utf8', maxBuffer: 8 << 20 });
  if (baseline.indexOf(TOOTH) !== -1) {
    throw new Error('origin/master ALREADY carries the tooth — the RED-before arm is meaningless');
  }
  const dest = path.join(CLIENT, BASELINE_REL);
  writeFileSync(dest, baseline);
  specRel = BASELINE_REL;
  cleanup = () => rmSync(dest, { force: true });
}

const rows = [];
try {
  const control = runSpec(specRel, 'control');
  if (control.code !== 0) throw new Error(`CONTROL is not green (exit ${control.code}) — ` +
    `nothing below is interpretable: ${control.failed.slice(0, 3).join(' | ')}`);
  if (control.pending !== 0) throw new Error(`CONTROL has ${control.pending} pending/todo test(s)`);
  console.log(`control: exit=0 total=${control.total} pend=0`);

  for (const view of VIEWS) {
    const r = withMutant(view, () => runSpec(specRel, view));
    const own = r.failed.filter((n) => n.indexOf(`${TOOTH}${view} `) !== -1);
    const other = r.failed.filter((n) => n.indexOf(TOOTH) !== -1 && own.indexOf(n) === -1);
    rows.push({ view, ...r, own: own.length, other: other.length });
    console.log(`${view.padEnd(17)} exit=${r.code} total=${r.total} failed=${r.failed.length} ` +
      `ownTooth=${own.length} otherTooth=${other.length}`);
  }
} finally { cleanup(); }

const survived = rows.filter((r) => r.code === 0).map((r) => r.view);
const bitByOwn = rows.filter((r) => r.code !== 0 && r.own === 1 && r.other === 0);
const collateral = rows.filter((r) => r.other !== 0).map((r) => r.view);

if (ARM === 'before') {
  const ok = survived.length === 16;
  console.log(`\nRB18-RED-BEFORE mutants=16 survived=${survived.length} caught=${16 - survived.length}` +
    ` verdict=${ok ? 'Y' : 'N'}`);
  process.exit(ok ? 0 : 1);
}
const ok = survived.length === 0 && bitByOwn.length === 16 && collateral.length === 0;
console.log(`\nRB18-BITE-AFTER mutants=16 bit=${16 - survived.length} byOwnTooth=${bitByOwn.length}` +
  ` survived=${survived.length} collateral=${collateral.length} verdict=${ok ? 'Y' : 'N'}`);
if (!ok) console.error(`survived=${survived.join(',')} collateral=${collateral.join(',')}`);
process.exit(ok ? 0 : 1);
