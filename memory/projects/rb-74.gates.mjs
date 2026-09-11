#!/usr/bin/env node
// rb-74 acceptance gates — harness-side, deliberately OUTSIDE the project repo
// and outside `evals/` (ADR-0224 bars new/grown evals). Three modes:
//
//   census      independent re-derivation of the citation census in a DIFFERENT
//               language from the Rust oracle, sharing no code with it.
//   historical  the leg the Rust oracle cannot run hermetically: for every row,
//               `git show <base>:server-module/src/lib.rs` line N must actually
//               contain the historical subject the retarget claims it did.
//   mutants     proof of teeth — apply each registered mutant one at a time,
//               require the Rust oracle to fail BY LABEL, restore, and verify
//               the tree is byte-identical afterwards.
//
// Usage: node rb-74.gates.mjs <worktree-abs-path> <census|historical|mutants>
// All pattern matching uses literal regexes / indexOf — no `new RegExp`.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT = process.argv[2];
const MODE = process.argv[3];
if (!WT || !MODE) {
  console.log('usage: node rb-74.gates.mjs <worktree> <census|historical|mutants>');
  process.exit(2);
}
const R = (p) => readFileSync(path.join(WT, p), 'utf8');
const W = (p, s) => writeFileSync(path.join(WT, p), s);

const D0221 = 'docs/adr/0221-account-deletion-reaper-schedule-declared.md';
const D0054 = 'docs/adr/0054-dev-reducer-release-gating.md';
const D87B = 'docs/m8.7b-plan.md';
const D87D = 'docs/m8.7d-plan.md';
const DNH2 = 'docs/specs/nh2-plan.md';
const D0148 = 'docs/adr/0148-held-key-continuation-outstanding-gate.md';


// ---------------------------------------------------------------------------
// census — independent token grammar, written from the spec, not from the Rust.
// A citation token is `<path>lib.rs:<N>[-<M>]`. We walk LEFT from the literal
// `lib.rs:` over [A-Za-z0-9._/-] to recover the full path prefix (so
// `sim-harness/src/lib.rs:222-226` is FOREIGN, not a server-module cite), and
// require the byte after the last digit to be neither a digit, `-` nor `/` (so
// `lib.rs:67` is not satisfiable by `lib.rs:678`, and a smuggled compound
// `lib.rs:1484/9999` is reported as MALFORMED rather than swallowed as one).
// ---------------------------------------------------------------------------
const PATHCH = /[A-Za-z0-9._/-]/;

function collect(src) {
  const out = { own: [], foreign: [], malformed: [] };
  const NEEDLE = 'lib.rs:';
  let i = 0;
  for (;;) {
    const at = src.indexOf(NEEDLE, i);
    if (at < 0) break;
    i = at + NEEDLE.length;
    // digits
    let j = i;
    while (j < src.length && src[j] >= '0' && src[j] <= '9') j++;
    if (j === i) continue; // `lib.rs:` with no number — not a citation
    if (src[j] === '-') {
      let k = j + 1;
      while (k < src.length && src[k] >= '0' && src[k] <= '9') k++;
      if (k > j + 1) j = k;
    }
    const after = src[j];
    // left walk for the path prefix
    let s = at;
    while (s > 0 && PATHCH.test(src[s - 1])) s--;
    const token = src.slice(s, j);
    if (after === '/' || (after >= '0' && after <= '9') || after === '-') {
      out.malformed.push(token + (after || ''));
      continue;
    }
    const prefix = src.slice(s, at);
    if (prefix === '' || prefix === 'server-module/src/') out.own.push(token);
    else out.foreign.push(token);
  }
  return out;
}

const EXPECT = [
  { doc: D0221, own: 1, foreign: 0 },
  { doc: D0054, own: 8, foreign: 0 },
  { doc: D87B, own: 4, foreign: 0 },
  { doc: D87D, own: 2, foreign: 0 },
  { doc: DNH2, own: 0, foreign: 1 },
  { doc: D0148, own: 0, foreign: 1 },
];

// Every own-citation must be immediately followed by a retarget bracket.
const BRACKET = '[rb-74: ';

function census() {
  const bad = [];
  let totalOwn = 0;
  let totalForeign = 0;
  let totalBrackets = 0;
  for (const e of EXPECT) {
    const src = R(e.doc);
    const got = collect(src);
    if (got.own.length !== e.own) {
      bad.push(`${e.doc}: own citations ${got.own.length}, want ${e.own}`);
    }
    if (got.foreign.length !== e.foreign) {
      bad.push(`${e.doc}: foreign citations ${got.foreign.length}, want ${e.foreign}`);
    }
    if (got.malformed.length !== 0) {
      bad.push(`${e.doc}: malformed citation(s) ${JSON.stringify(got.malformed)}`);
    }
    // Adjacency, per SITE not per token: EVERY occurrence of an own citation
    // must carry the bracket. A token that appears once bracketed and once bare
    // would otherwise pass on the strength of the bracketed one.
    for (const tok of new Set(got.own)) {
      let from = 0;
      let sites = 0;
      let bracketed = 0;
      for (;;) {
        const at = src.indexOf(tok, from);
        if (at < 0) break;
        from = at + tok.length;
        // Skip a longer token that merely starts with this one.
        const nx = src[from];
        if (nx === '/' || nx === '-' || (nx >= '0' && nx <= '9')) continue;
        sites++;
        let k = from;
        if (src[k] === '`') k++;
        if (src[k] === ' ' && src.startsWith(BRACKET, k + 1)) bracketed++;
      }
      if (sites !== bracketed) {
        bad.push(`${e.doc}: citation ${tok} appears at ${sites} site(s) but only ${bracketed} carry the ${BRACKET.trim()} bracket`);
      }
    }
    const nb = src.split(BRACKET).length - 1;
    if (nb !== e.own) bad.push(`${e.doc}: ${nb} retarget bracket(s), want ${e.own}`);
    totalOwn += got.own.length;
    totalForeign += got.foreign.length;
    totalBrackets += nb;
  }
  if (bad.length) {
    console.log('RB74-CENSUS MISMATCH');
    for (const b of bad) console.log('  ' + b);
    process.exit(1);
  }
  console.log(
    `RB74-CENSUS OK own=${totalOwn} foreign=${totalForeign} brackets=${totalBrackets} malformed=0`,
  );
}

// ---------------------------------------------------------------------------
// historical — the retarget keeps each number as a DATED hint. This is the only
// leg that checks the hint's VALUE: it reads the cited line out of the cited
// base commit and requires the claimed historical subject to be there.
// ---------------------------------------------------------------------------
const PREAMBLE_OPEN = '**rb-74 retarget note (2026-09-11, ADR-0056):**';
const SHA_OPEN = 'base commit `';

// Read the base SHA out of the document itself. Hardcoding it here would make
// this gate self-referential: it could never detect a base-commit lie in the
// shipped artifact, which is the one thing it exists to detect.
function baseShaOf(doc) {
  const src = R(doc);
  const p = src.indexOf(PREAMBLE_OPEN);
  if (p < 0) throw new Error(`${doc}: no rb-74 preamble`);
  const q = src.indexOf(SHA_OPEN, p);
  if (q < 0) throw new Error(`${doc}: preamble names no base commit`);
  const start = q + SHA_OPEN.length;
  const end = src.indexOf('`', start);
  const sha = src.slice(start, end);
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`${doc}: malformed base sha ${sha}`);
  return sha;
}

// [row id, doc whose preamble supplies the base sha, cited line, historical subject]
const HIST = [
  ['R1a', D0221, 214, '#[spacetimedb::reducer(client_disconnected)]'],
  ['R1b', D0221, 215, 'pub fn on_disconnect('],
  ['R2', D0054, 1484, 'pub fn start_wild_battle('],
  ['R3', D0054, 2064, 'pub fn grant_bait('],
  ['R4', D0054, 939, 'pub fn movement_tick('],
  ['R5', D0054, 1494, '.character()'],
  ['R6', D0054, 940, 'if ctx.sender != ctx.identity() {'],
  ['R7', D0054, 1868, 'fn grant_item('],
  ['R8', D0054, 67, 'pub content_version: u32,'],
  ['R9a', D0054, 273, 'PUBLIC so a client sees its OWN items'],
  ['R9b', D0054, 274, 'RLS by'],
  ['R10', D87B, 1483, '#[spacetimedb::reducer]'],
  ['R11', D87B, 2063, '#[spacetimedb::reducer]'],
  ['R12', D87B, 1494, '.character()'],
  ['R13a', D87B, 273, 'PUBLIC so a client sees its OWN items'],
  ['R13b', D87B, 274, 'RLS by'],
  ['R14a', D87D, 275, 'PUBLIC so a client sees its OWN items'],
  ['R14b', D87D, 276, 'RLS by'],
  ['R15', D87D, 152, 'pub struct EncounterEntryRow {'],
];


const histCache = new Map();
function histLines(sha) {
  if (!histCache.has(sha)) {
    const out = execFileSync('git', ['show', `${sha}:server-module/src/lib.rs`], {
      cwd: WT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    histCache.set(sha, out.split('\n'));
  }
  return histCache.get(sha);
}

function historical() {
  const bad = [];
  const docs = new Set();
  for (const [id, doc, n, needle] of HIST) {
    const sha = baseShaOf(doc);
    docs.add(`${doc}@${sha}`);
    const lines = histLines(sha);
    const line = lines[n - 1];
    if (line === undefined || line.indexOf(needle) < 0) {
      bad.push(`${id}: ${doc}'s declared base ${sha}, server-module/src/lib.rs:${n} does not contain ${JSON.stringify(needle)} — got ${JSON.stringify(line)}`);
    }
  }
  if (bad.length) {
    console.log('RB74-HISTORICAL MISMATCH');
    for (const b of bad) console.log('  ' + b);
    process.exit(1);
  }
  console.log(`RB74-HISTORICAL OK ${HIST.length} dated hints across ${docs.size} document base(s) resolve at the base commit each document declares`);
}

// ---------------------------------------------------------------------------
// mutants — proof of teeth. Each row edits ONE file, runs the Rust oracle, and
// requires the named label in the failure output. The tree is restored from the
// captured original bytes on BOTH branches, and the whole run is bracketed by a
// `git status --porcelain` equality check so a killed process cannot leave a
// mutant behind unnoticed.
// ---------------------------------------------------------------------------
const RS = 'server-module/src/schema.rs';
const SIM = 'sim-harness/src/lib.rs';

// [id, file, mutate(src) -> string, expected label]
const MUTANTS = [
  ['M1-drop-bracket', D0054, (s) =>
    s.split(' [rb-74: -> `pub fn movement_tick(` in `server-module/src/movement.rs`]').join(''),
    '[rb74/L1-COMPOSED]'],
  ['M2-swap-anchors', D0054, (s) =>
    s.split('[rb-74: -> `pub fn start_wild_battle(` in `server-module/src/battle.rs`]')
      .join('[rb-74: -> `pub fn grant_bait(` in `server-module/src/taming.rs`]'),
    '[rb74/L1-COMPOSED]'],
  ['M3-prefix-collision', D0054, (s) =>
    s.split('`lib.rs:67` [rb-74:').join('`lib.rs:678` [rb-74:'),
    '[rb74/L1-COMPOSED]'],
  // Ambiguity, not a rename: a rename would fail to COMPILE, and a compile
  // error is not proof that the resolution leg fired. A second occurrence in a
  // comment compiles cleanly and can only be caught by the exactly-once rule.
  ['M4-anchor-becomes-ambiguous', 'server-module/src/inventory.rs', (s) =>
    '// see pub(crate) fn grant_item( below\n' + s,
    '[rb74/L2-RESOLUTION]'],
  ['M5-live-row-reclassified-removed', D0054, (s) =>
    s.split('[rb-74: -> `pub(crate) fn grant_item(` in `server-module/src/inventory.rs`]')
      .join('[rb-74: helper deleted by ADR-0056; no live anchor exists]'),
    '[rb74/L1-COMPOSED]'],
  ['M6-deleted-clause-returns', RS, (s) =>
    s.split('/// form cannot express per-id membership')
      .join('/// PUBLIC so a client sees its OWN items (RLS by `owner_identity`).\n/// form cannot express per-id membership'),
    '[rb74/L4-REMOVED]'],
  ['M7-assertion-leaves-cited-range', SIM, (s) =>
    s.split('/// Each intent is enqueued')
      .join('///\n///\n///\n///\n///\n///\n/// Each intent is enqueued'),
    '[rb74/L5-RANGE]'],
  ['M8-confirm-token-deleted', DNH2, (s) =>
    s.split('`sim-harness/src/lib.rs:222-226`').join('`sim-harness/src/lib.rs`'),
    '[rb74/L5-RANGE]'],
  ['M9-decoy-bracket', D0054, (s) => s + '\n\nDecoy [rb-74: -> nothing] tail.\n',
    '[rb74/L6-ROSTER]'],
  ['M10-wrong-base-sha', D0054, (s) =>
    s.split('base commit `6187102`').join('base commit `deadbee`'),
    '[rb74/L6-ROSTER]'],
  ['M11-smuggled-extra-citation', D0054, (s) =>
    s.split('## Consequences').join('An extra pointer at `lib.rs:9999` hides here.\n\n## Consequences'),
    '[rb74/L3-CENSUS]'],
  ['M12-preamble-hoisted-to-top', D0054, (s) => {
    const lines = s.split('\n');
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].indexOf('**rb-74 retarget note') === 0) { idx = i; break; }
    }
    if (idx < 0) throw new Error('M12: no rb-74 preamble to hoist — mutant cannot be applied');
    const note = lines[idx];
    lines.splice(idx, 1);
    lines.unshift(note, '');
    return lines.join('\n');
  }, '[rb74/L6-ROSTER]'],
  // --- teeth for the post-red-team hardening (L7 / L6-NAMESPACE / L2-ATTRID) ---
  // M13 is the measured subject-swap: the bracket stays well-formed and every
  // anchor still resolves, but each one is now attached to the OTHER identifier.
  ['M13-subject-swap', D87B, (s) => {
    const a = '`start_wild_battle` (lib.rs:1483';
    const b = '`grant_bait` (lib.rs:2063';
    if (s.indexOf(a) < 0 || s.indexOf(b) < 0) return s;
    return s.split(a).join('\u0000A').split(b).join('\u0000B')
      .split('\u0000A').join('`grant_bait` (lib.rs:1483')
      .split('\u0000B').join('`start_wild_battle` (lib.rs:2063');
  }, '[rb74/L7-SUBJECT]'],
  // M14 spells the namespace without the leading space and without the space
  // after the colon — invisible to a contiguous-run check alone.
  ['M14-bare-namespace-decoy', D0054, (s) =>
    s.split('## Consequences').join('Also see [rb-74:-> `pub fn nowhere(` in `server-module/src/nowhere.rs`] for the rest.\n\n## Consequences'),
    '[rb74/L6-NAMESPACE]'],
  // M15 leaves the reducer attribute present but no longer ADJACENT, so an
  // attribute-sigil check passes while the cited historical subject moves.
  ['M15-attribute-displaced', 'server-module/src/battle.rs', (s) =>
    s.split('pub fn start_wild_battle(ctx: &ReducerContext')
      .join('#[allow(clippy::needless_pass_by_value)]\npub fn start_wild_battle(ctx: &ReducerContext'),
    '[rb74/L2-ATTRID]'],
];

// Controls: must stay GREEN.
const CONTROLS = [
  ['C1-trailing-whitespace', D0054, (s) => s + '\n'],
  ['C2-unrelated-doc-sentence', D0054, (s) =>
    s.split('## Consequences').join('A neutral sentence with no citation and no bracket.\n\n## Consequences')],
];

// Cargo's change detection is mtime-based at 1-second granularity: two builds
// inside the same second can reuse the previous row's binary and report the
// PREVIOUS mutant's result. Sleep a full second before every build.
function settle() {
  execFileSync('sleep', ['1.1']);
}

function runOracle() {
  try {
    settle();
    const out = execFileSync(
      'bash',
      ['-lc', `source ~/.cargo/env && cd ${JSON.stringify(WT)} && cargo nextest run -p monster-realm-module -E 'test(rb74_)' --no-fail-fast 2>&1`],
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
      notes.push(`${id}: MUTATION WAS A NO-OP (the text it edits is gone) — mutant proves nothing`);
      continue;
    }
    W(file, next);
    const r = runOracle();
    W(file, orig);
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
    `RB74-MUTANTS ${killed}/${MUTANTS.length} KILLED ${controlsGreen}/${CONTROLS.length} CONTROLS-GREEN TREE-${restored ? 'RESTORED' : 'DIRTY'}`,
  );
  if (killed !== MUTANTS.length || controlsGreen !== CONTROLS.length || !restored) process.exit(1);
}

// ---------------------------------------------------------------------------
// redbefore — restore the four retargeted documents to their origin/master
// content, run the oracle, require the RED labels, then restore. This is the
// "it was red before the fix" gate as an executable check rather than a claim.
// ---------------------------------------------------------------------------
const RETARGETED = [D0221, D0054, D87B, D87D];

function redbefore() {
  const before = treeState();
  const saved = RETARGETED.map((f) => [f, R(f)]);
  for (const f of RETARGETED) {
    const old = execFileSync('git', ['show', `origin/master:${f}`], {
      cwd: WT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    W(f, old);
  }
  const r = runOracle();
  for (const [f, s] of saved) W(f, s);
  const after = treeState();
  const l1 = r.out.indexOf('[rb74/L1-COMPOSED] 15 failure(s):') >= 0;
  // L6 and L7 both fire on the unretargeted tree; pin the leg labels, not a
  // failure count, so hardening a leg does not silently retire this gate.
  const l6 = r.out.indexOf('[rb74/L6-') >= 0;
  const l7 = r.out.indexOf('[rb74/L7-SUBJECT') >= 0;
  const restored = before === after;
  console.log(
    `RB74-REDBEFORE ${!r.ok && l1 && l6 && l7 ? 'CONFIRMED' : 'NOT-RED'} L1=${l1 ? '15-rows' : 'absent'} L6=${l6 ? 'fired' : 'absent'} L7=${l7 ? 'fired' : 'absent'} TREE-${restored ? 'RESTORED' : 'DIRTY'}`,
  );
  if (r.ok || !l1 || !l6 || !l7 || !restored) process.exit(1);
}

// ---------------------------------------------------------------------------
// diffset — ADR-0224 compliance (no eval touched) and touches discipline, in
// one place so neither EXPECT string has to be spelled inside its own command.
// ---------------------------------------------------------------------------
const DECLARED = [
  'docs/adr/0054-dev-reducer-release-gating.md',
  'docs/adr/0221-account-deletion-reaper-schedule-declared.md',
  'docs/m8.7b-plan.md',
  'docs/m8.7d-plan.md',
  'ARCHITECTURE.md',
  'server-module/src/lib.rs',
  'server-module/src/rb74_citation_tests.rs',
].sort();

function diffset() {
  const files = execFileSync('git', ['diff', '--name-only', 'origin/master...HEAD'], {
    cwd: WT, encoding: 'utf8',
  }).split('\n').filter(Boolean).sort();
  const evals = files.filter((p) => p.indexOf('evals/') === 0);
  const same = files.length === DECLARED.length && files.every((p, i) => p === DECLARED[i]);
  const tag = ['RB74', 'DIFFSET'].join('-');
  if (!same || evals.length !== 0) {
    console.log(`${tag} DRIFT files=${JSON.stringify(files)} evals=${evals.length}`);
    process.exit(1);
  }
  console.log(`${tag} OK ${files.length} declared files, ${evals.length} eval files touched`);
}

// ---------------------------------------------------------------------------
// shalie — move a document's declared base commit AND the Rust roster's copy of
// it in lockstep. Every leg that compares the two stays green by construction;
// only `historical`, which re-reads the SHA from the document and then reads
// that commit, can still catch it. This is the tooth for deriving the SHA
// rather than hardcoding it.
// ---------------------------------------------------------------------------
const TESTS_RS = 'server-module/src/rb74_citation_tests.rs';

function shalie() {
  const before = treeState();
  const d = R(D0054);
  const t = R(TESTS_RS);
  const from = '6187102';
  const to = 'd0c265e';
  if (d.indexOf(from) < 0 || t.indexOf(from) < 0) {
    console.log('RB74-SHALIE INAPPLICABLE — the base sha is not where the mutant expects it');
    process.exit(1);
  }
  W(D0054, d.split(from).join(to));
  W(TESTS_RS, t.split(from).join(to));
  const oracle = runOracle();
  let histRed = false;
  try {
    execFileSync(process.execPath, [process.argv[1], WT, 'historical'], { encoding: 'utf8' });
  } catch (e) {
    histRed = String(e.stdout || '').indexOf('RB74-HISTORICAL MISMATCH') >= 0;
  }
  W(D0054, d);
  W(TESTS_RS, t);
  const restored = treeState() === before;
  console.log(
    `RB74-SHALIE oracle=${oracle.ok ? 'GREEN' : 'red'} historical=${histRed ? 'CAUGHT' : 'MISSED'} TREE-${restored ? 'RESTORED' : 'DIRTY'}`,
  );
  if (!histRed || !restored) process.exit(1);
}

if (MODE === 'census') census();
else if (MODE === 'historical') historical();
else if (MODE === 'mutants') mutants();
else if (MODE === 'redbefore') redbefore();
else if (MODE === 'diffset') diffset();
else if (MODE === 'shalie') shalie();
else {
  console.log(`unknown mode ${MODE}`);
  process.exit(2);
}
