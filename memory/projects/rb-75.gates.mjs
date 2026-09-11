#!/usr/bin/env node
// rb-75 acceptance gates — harness-side, deliberately OUTSIDE the project repo
// and outside `evals/` (ADR-0224 bars new/grown evals). Modes:
//
//   redbefore   strip every `[rb-75: …]` bracket out of ARCHITECTURE.md (i.e.
//               replay the pre-fix tree), run the Rust oracle, require the RED
//               labels, restore, verify the tree is byte-identical.
//   mutants     proof of teeth — apply each registered mutant one at a time,
//               require the Rust oracle to fail BY LABEL, restore, verify.
//   diffset     ADR-0224 compliance (no eval touched), touches discipline, and
//               the byte-preservation invariant: every modified ARCHITECTURE.md
//               line minus its `[rb-75: …]` span must EQUAL the removed line
//               (historical numerals and prose untouched), and the driver's
//               pinned `:76-89` range must be unchanged.
//
// Usage: node rb-75.gates.mjs <worktree-abs-path> <redbefore|mutants|diffset>
// All pattern matching uses literal regexes / indexOf — no `new RegExp`.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT = process.argv[2];
const MODE = process.argv[3];
if (!WT || !MODE) {
  console.log('usage: node rb-75.gates.mjs <worktree> <redbefore|mutants|diffset>');
  process.exit(2);
}
const R = (p) => readFileSync(path.join(WT, p), 'utf8');
const W = (p, s) => writeFileSync(path.join(WT, p), s);

const ARCH = 'ARCHITECTURE.md';
const DRIVER = 'sim-harness/src/bin/mr_load_driver.rs';
const BASE = 'origin/master';

// ---------------------------------------------------------------------------
// bracket helpers — a bracket is ` [rb-75: … ]` (leading space included so
// stripping it restores the pre-fix line byte-for-byte). Brackets never nest
// and never contain a `]` in this slice's text (asserted by diffset).
// ---------------------------------------------------------------------------
const OPEN = '[rb-75:';

/** End (exclusive) of the bracket opening at `at`: the line's last `]`
 *  (R-5 requires the bracket to close the line, so a `]` inside a code
 *  span never closes it early). */
function bracketClose(src, at) {
  let eol = src.indexOf('\n', at);
  if (eol < 0) eol = src.length;
  const close = src.lastIndexOf(']', eol);
  return close < at ? -1 : close + 1;
}

function stripBrackets(src) {
  let out = '';
  let i = 0;
  for (;;) {
    const at = src.indexOf(OPEN, i);
    if (at < 0) { out += src.slice(i); break; }
    const end = bracketClose(src, at);
    if (end < 0) { out += src.slice(i); break; }
    // drop the single separating space the annotation was appended with
    const cut = at > 0 && src[at - 1] === ' ' ? at - 1 : at;
    out += src.slice(i, cut);
    i = end;
  }
  return out;
}

/** Returns the bracket span (start,end exclusive) inside the entry whose
 *  column-0 label line is `**label**`, or null. */
function bracketOfEntry(src, label) {
  const head = '\n**' + label + '**';
  const at = src.indexOf(head);
  if (at < 0) return null;
  // entry ends at the next column-0 `**` or `#` line
  let end = src.length;
  let p = at + 1;
  for (;;) {
    const nl = src.indexOf('\n', p);
    if (nl < 0) break;
    const nx = src[nl + 1];
    if (nx === '*' && src[nl + 2] === '*') { end = nl; break; }
    if (nx === '#') { end = nl; break; }
    p = nl + 1;
  }
  const b = src.indexOf(OPEN, at);
  if (b < 0 || b >= end) return null;
  // span includes the single separating space before the token
  return { start: b - 1, end: bracketClose(src, b), entryStart: at, entryEnd: end };
}

function replaceFirst(src, needle, repl) {
  const at = src.indexOf(needle);
  if (at < 0) return src;
  return src.slice(0, at) + repl + src.slice(at + needle.length);
}

// ---------------------------------------------------------------------------
// mutants — each is [id, file, fn(orig) -> mutated, expectedLabel]
// ---------------------------------------------------------------------------
const MUTANTS = [
  // M1: a numeral inside the 11r-f bracket lies about 11r-h's live value.
  ['M1-wrong-numeral', ARCH, (s) => {
    const b = bracketOfEntry(s, '11r-f');
    if (!b) return s;
    const span = s.slice(b.start, b.end);
    return s.slice(0, b.start) + span.replace('= 0173', '= 0174') + s.slice(b.end);
  }, '[rb75/numeral-mismatch:11r-f/11r-h]'],
  // M2: the 11r-f bracket moved onto the 11r-h entry (neighbour) — the
  // annotation now sits where a reader of the DROP will not see it.
  ['M2-bracket-on-neighbour', ARCH, (s) => {
    const b = bracketOfEntry(s, '11r-f');
    if (!b) return s;
    const span = s.slice(b.start, b.end);
    const without = s.slice(0, b.start) + s.slice(b.end);
    // append the bracket to the END of the 11r-h entry's last line
    const h = without.indexOf('\n**11r-h**');
    if (h < 0) return s;
    const hb = bracketOfEntry(without, '11r-h');
    const entryEnd = hb ? hb.entryEnd : (() => {
      let p = h + 1; let end = without.length;
      for (;;) {
        const nl = without.indexOf('\n', p);
        if (nl < 0) break;
        const nx = without[nl + 1];
        if ((nx === '*' && without[nl + 2] === '*') || nx === '#') { end = nl; break; }
        p = nl + 1;
      }
      return end;
    })();
    return without.slice(0, entryEnd) + span + without.slice(entryEnd);
  }, '[rb75/bracket-missing:11r-f]'],
  // M3: swap the 11r-h and 11r-f entries — the bracket's "immediately above"
  // claim is now false (11r-h is BELOW 11r-f).
  ['M3-swap-adjacent', ARCH, (s) => {
    const h = s.indexOf('\n**11r-h**');
    const f = s.indexOf('\n**11r-f**');
    if (h < 0 || f < 0 || f < h) return s;
    // find end of 11r-f entry
    let p = f + 1; let fEnd = s.length;
    for (;;) {
      const nl = s.indexOf('\n', p);
      if (nl < 0) break;
      const nx = s[nl + 1];
      if ((nx === '*' && s[nl + 2] === '*') || nx === '#') { fEnd = nl; break; }
      p = nl + 1;
    }
    const hEntry = s.slice(h, f);
    const fEntry = s.slice(f, fEnd);
    return s.slice(0, h) + fEntry + hEntry + s.slice(fEnd);
  }, '[rb75/not-adjacent:11r-f'],
  // M4: a column-0 decoy `**11r-f**` heading planted before the real one.
  ['M4-decoy-label', ARCH, (s) => replaceFirst(s, '\n**11r-h**', '\n**11r-f** (decoy heading) ADR next-free = 0172.\n\n**11r-h**'), '[rb75/label-ambiguous:11r-f]'],
  // M5: the rb-15 bracket wrapped in an HTML comment — invisible to a reader,
  // plain bytes to a naive substring scan.
  ['M5-html-comment', ARCH, (s) => {
    const b = bracketOfEntry(s, 'rb-15');
    if (!b) return s;
    return s.slice(0, b.start) + ' <!--' + s.slice(b.start, b.end) + ' -->' + s.slice(b.end);
  }, '[rb75/bracket-missing:rb-15]'],
  // M6: the M15b heading's PR number changed — the M15a bracket's "rewritten
  // by M15b, PR #168" claim no longer corresponds to the neighbour entry.
  ['M6-neighbour-pr', ARCH, (s) => replaceFirst(s, '**M15b** (trade client UI — ADR-0107, PR #168)', '**M15b** (trade client UI — ADR-0107, PR #169)'), '[rb75/rewrite-correspondence:M15a'],
  // M7: ux2's DISCHARGED clause deleted — the bracket's "clause above" claim
  // is orphaned.
  ['M7-orphaned-claim', ARCH, (s) => replaceFirst(s, 'DISCHARGED by ux2b', 'discharged later'), '[rb75/claim-correspondence:ux2'],
  // M8: a fabricated bracket at column 0 (no leading space) right after
  // uxd2's note — invisible to a space-prefixed token scan.
  ['M8-col0-bracket', ARCH, (s) => replaceFirst(s, '**ADR next-free: 0162.**\n', '**ADR next-free: 0162.**\n[rb-75: fabricated note planted at column 0.]\n'), '[rb75/bracket-roster] 6 != 5'],
  // M9: the M15b heading's PR number gains a trailing digit — a substring
  // match on `PR #168` would still pass.
  ['M9-pr-prefix', ARCH, (s) => replaceFirst(s, '**M15b** (trade client UI — ADR-0107, PR #168)', '**M15b** (trade client UI — ADR-0107, PR #1680)'), '[rb75/rewrite-correspondence:M15a'],
  // M10: ux2's DISCHARGED clause hidden in an HTML comment — still bytes,
  // invisible to a reader.
  ['M10-hidden-claim', ARCH, (s) => replaceFirst(s, 'DISCHARGED by ux2b', '<!-- DISCHARGED by ux2b -->'), '[rb75/claim-correspondence:ux2'],
];

const CONTROLS = [
  // C1: a benign re-wording inside a bracket that touches no numeral/PR/label.
  ['C1-benign-reword', ARCH, (s) => replaceFirst(s, 'so the higher numeral precedes the lower', 'so the higher numeral sits above the lower')],
  // C2: an unrelated entry edit far from any site.
  ['C2-unrelated-entry', ARCH, (s) => replaceFirst(s, '**rb-74** (residual R-18r-b-LIBRSCITES', '**rb-74** (residual R-18r-b-LIBRSCITES, control-edit')],
  // C3: a code span with a `]` inside a truthful bracket must not close it early.
  ['C3-codespan-in-bracket', ARCH, (s) => replaceFirst(s, 'so the higher numeral precedes the lower.]', 'so the higher numeral precedes the lower (see `idx[0]`).]')],
];

function settle() {
  execFileSync('sleep', ['1.1']);
}

function runOracle() {
  try {
    settle();
    const out = execFileSync(
      'bash',
      ['-lc', `source ~/.cargo/env && cd ${JSON.stringify(WT)} && cargo nextest run -p sim-harness -E 'test(rb75_)' --no-fail-fast 2>&1`],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

function treeState() {
  return execFileSync('git', ['status', '--porcelain'], { cwd: WT, encoding: 'utf8' })
    + execFileSync('git', ['diff', '--stat'], { cwd: WT, encoding: 'utf8' });
}

function mutants() {
  const before = treeState();
  let killed = 0;
  let controlsGreen = 0;
  const notes = [];
  for (const [id, file, fn, label] of MUTANTS) {
    const orig = R(file);
    const next = fn(orig);
    if (next === orig) {
      notes.push(`${id}: UNAPPLIED (the text it edits is gone) — mutant proves nothing`);
      continue;
    }
    W(file, next);
    const r = runOracle();
    W(file, orig);
    if (r.out.indexOf('error[E') >= 0 || r.out.indexOf('could not compile') >= 0) {
      notes.push(`${id}: INVALID (mutant did not compile)`);
      continue;
    }
    if (!r.ok && r.out.indexOf(label) >= 0) killed++;
    else notes.push(`${id}: SURVIVED or wrong label (expected ${label}, exit ${r.ok ? 0 : 1})`);
  }
  for (const [id, file, fn] of CONTROLS) {
    const orig = R(file);
    const next = fn(orig);
    if (next === orig) { notes.push(`${id}: control was a no-op`); continue; }
    W(file, next);
    const r = runOracle();
    W(file, orig);
    if (r.ok) controlsGreen++;
    else notes.push(`${id}: CONTROL WENT RED — the oracle over-fires on a benign edit`);
  }
  const after = treeState();
  const restored = before === after;
  for (const n of notes) console.log('  ' + n);
  console.log(
    `RB75-MUTANTS ${killed}/${MUTANTS.length} KILLED ${controlsGreen}/${CONTROLS.length} CONTROLS-GREEN TREE-${restored ? 'RESTORED' : 'DIRTY'}`,
  );
  if (killed !== MUTANTS.length || controlsGreen !== CONTROLS.length || !restored) process.exit(1);
}

// ---------------------------------------------------------------------------
// redbefore — the pre-fix ARCHITECTURE.md is origin/master's copy; run the
// oracle against it and require the five missing-bracket labels + the roster.
// ---------------------------------------------------------------------------
const SITES = ['11r-c', '11r-f', 'rb-15', 'M15a', 'ux2'];

function redbefore() {
  const before = treeState();
  const saved = R(ARCH);
  const old = execFileSync('git', ['show', `${BASE}:${ARCH}`], {
    cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  W(ARCH, old);
  const r = runOracle();
  W(ARCH, saved);
  const after = treeState();
  const missing = SITES.filter((s) => r.out.indexOf(`[rb75/bracket-missing:${s}]`) >= 0).length;
  const roster = r.out.indexOf('[rb75/bracket-roster]') >= 0;
  const restored = before === after;
  const confirmed = !r.ok && missing === SITES.length && roster;
  console.log(
    `RB75-REDBEFORE ${confirmed ? 'CONFIRMED' : 'NOT-RED'} missing=${missing} roster=${roster ? 'fired' : 'absent'} TREE-${restored ? 'RESTORED' : 'DIRTY'}`,
  );
  if (!confirmed || !restored) process.exit(1);
}

// ---------------------------------------------------------------------------
// diffset — touches discipline + byte-preservation of every edited line.
// ---------------------------------------------------------------------------
const DECLARED = [ARCH, DRIVER].sort();

function diffset() {
  const files = execFileSync('git', ['diff', '--name-only', `${BASE}...HEAD`], {
    cwd: WT, encoding: 'utf8',
  }).split('\n').filter(Boolean).sort();
  const evals = files.filter((p) => p.indexOf('evals/') === 0);
  const same = files.length === DECLARED.length && files.every((p, i) => p === DECLARED[i]);
  const tag = ['RB75', 'DIFFSET'].join('-');
  if (!same || evals.length !== 0) {
    console.log(`${tag} DRIFT files=${JSON.stringify(files)} evals=${evals.length}`);
    process.exit(1);
  }
  // Byte preservation: strip brackets from the live ARCHITECTURE.md; the result
  // must equal origin/master's copy PLUS exactly one added terminal entry.
  const live = R(ARCH);
  const old = execFileSync('git', ['show', `${BASE}:${ARCH}`], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const stripped = stripBrackets(live);
  const preserved = stripped.startsWith(old);
  const tail = stripped.slice(old.length);
  const oneEntry = tail.startsWith('\n**rb-75**') && tail.indexOf('\n**', 3) < 0 && tail.indexOf('ADR next-free = 0246') >= 0;
  const brackets = live.split(OPEN).length - 1;
  // The driver's pinned :76-89 range must be byte-identical.
  const drvOld = execFileSync('git', ['show', `${BASE}:${DRIVER}`], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n');
  const drvNew = R(DRIVER).split('\n');
  const pinned = drvOld.slice(75, 89).join('\n') === drvNew.slice(75, 89).join('\n');
  // The driver diff must be additions at/after the old EOF plus at most the
  // two `pub(super)` visibility widenings inside the rb-71 module.
  const drvDiff = execFileSync('git', ['diff', `${BASE}...HEAD`, '--', DRIVER], { cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const removed = drvDiff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
  const removedOk = removed.length <= 2 && removed.every((l) => l.indexOf('fn rb71_hidden_ranges(') >= 0 || l.indexOf('fn rb71_in_hidden_range(') >= 0);
  if (!preserved || !oneEntry || brackets !== SITES.length || !pinned || !removedOk) {
    console.log(`${tag} DRIFT preserved=${preserved} oneEntry=${oneEntry} brackets=${brackets} pinned76-89=${pinned} driverRemovedLines=${removed.length}`);
    process.exit(1);
  }
  console.log(`${tag} OK ${files.length} declared files, ${evals.length} eval files, numerals byte-preserved, brackets=${brackets}, 76-89 intact`);
}

switch (MODE) {
  case 'redbefore': redbefore(); break;
  case 'mutants': mutants(); break;
  case 'diffset': diffset(); break;
  default:
    console.log(`unknown mode ${MODE}`);
    process.exit(2);
}
