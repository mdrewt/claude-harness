#!/usr/bin/env node
// memory/projects/rb-71.gates.mjs — rb-71 bite-proof harness (harness-side).
//
// ADR-0224 bars a new `evals/*.eval.mjs`, and `justfile` is outside rb-71's
// declared `touches:`, so the SHIPPED proof is an ordinary Rust test appended at
// EOF of `sim-harness/src/bin/mr_load_driver.rs`. THIS file is not that proof —
// it is the mutation harness that shows the shipped test BITES, following the
// `memory/projects/18r-b.gates.mjs` / `17r-a.gates.mjs` precedent.
//
// Modes: g3 (digit mutants), g4 (gutted-oracle control), g8 (label matrix).
//   node memory/projects/rb-71.gates.mjs <worktree-abs-path> <g3|g4|g8>
//
// SAFETY (red-team MEDIUM #3): every mutation is wrapped in try/finally so a
// throw restores the tree, and each mode re-asserts `git status --porcelain` is
// EMPTY after restoring. A killed run leaving a mutant in the tree is a measured
// hazard in this corpus; a non-empty status makes the gate print a FAIL token.
//
// LABEL CONTRACT (the shipped Rust collectors must emit these verbatim):
//   [cite/count] [cite/line-mismatch] [anchor/missing] [anchor/not-unique]
//   [anchor/doc-missing] [doc/empty] [claim/stale-tense] [claim/premature-past]

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const NL = String.fromCharCode(10);
const [, , ROOT, MODE] = process.argv;
if (!ROOT || !MODE) {
  console.log('RB71 USAGE <worktree> <g3|g4|g8>');
  process.exit(2);
}

const PLAN = join(ROOT, 'docs/m8.5c-plan.md');
const AGENTS = join(ROOT, 'AGENTS.md');
const DRIVER = join(ROOT, 'sim-harness/src/bin/mr_load_driver.rs');
const ANCHOR = '- **Done =**';

const read = (p) => readFileSync(p, 'utf8');
const write = (p, s) => writeFileSync(p, s);

// Run a nextest filter. Returns {status, out}. nextest writes its summary to
// STDERR, so both streams are joined (a measured trap in this corpus).
function nextest(filter) {
  const r = spawnSync(
    'cargo',
    ['nextest', 'run', '-p', 'sim-harness', '-E', `test(${filter})`, '--no-fail-fast'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 268435456 },
  );
  return { status: r.status, out: String(r.stdout) + String(r.stderr) };
}

function treeDirty() {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  return String(r.stdout).trim() !== '';
}

// Apply `mutate` (a map of path -> new content), run `filter`, restore, and
// report whether the run FAILED carrying `label`.
function probe({ files, filter, label, requireCompile = true }) {
  const originals = new Map();
  for (const p of Object.keys(files)) originals.set(p, read(p));
  try {
    for (const [p, content] of Object.entries(files)) write(p, content);
    const { status, out } = nextest(filter);
    // A COMPILE error also exits non-zero (red-team MEDIUM #4): that would mask
    // a mutation that never actually ran the assertions. Reject it explicitly.
    const brokenBuild =
      out.indexOf('error[E') !== -1 || out.indexOf('could not compile') !== -1;
    if (requireCompile && brokenBuild) return { killed: false, why: 'BUILD-BROKE' };
    if (status === 0) return { killed: false, why: 'SURVIVED' };
    if (label !== null && out.indexOf(label) === -1) {
      return { killed: false, why: 'WRONG-LABEL' };
    }
    return { killed: true, why: 'ok' };
  } finally {
    for (const [p, content] of originals) write(p, content);
  }
}

function anchorIndex(agents) {
  const lines = agents.split(NL);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].lastIndexOf(ANCHOR, 0) === 0) return i; // 0-based
  }
  return -1;
}

function finish(token) {
  if (treeDirty()) {
    console.log(`RB71-${MODE.toUpperCase()} TREE DIRTY AFTER RESTORE`);
    process.exit(1);
  }
  console.log(token);
}

// --------------------------------------------------------------------- g3
// The digit mutants: :7 (the promoted residual's OWN wrong number), :8 (the
// pre-fix state) and :10. Each must RED T1 carrying [cite/line-mismatch].
if (MODE === 'g3') {
  const plan = read(PLAN);
  const ns = [7, 8, 10];
  let killed = 0;
  for (const n of ns) {
    const mutated = plan.replace(/AGENTS\.md:[0-9]+/g, `AGENTS.md:${n}`);
    if (mutated === plan) continue; // citation not found -> not killed
    const r = probe({
      files: { [PLAN]: mutated },
      filter: 'rb71_m85c_cites',
      label: '[cite/line-mismatch]',
    });
    if (r.killed) killed++;
  }
  finish(`RB71-G3 ${killed}/${ns.length} MUTANTS KILLED BY ${'LABEL'}`);
}

// --------------------------------------------------------------------- g4
// Gut the collector at its marker. The build MUST still compile (else the
// control never ran) and the control test MUST fail.
else if (MODE === 'g4') {
  const driver = read(DRIVER);
  const MARK = '// RB71-GUT-POINT';
  if (driver.indexOf(MARK) === -1) {
    console.log('RB71-G4 NO GUT MARKER');
    process.exit(1);
  }
  const r = probe({
    files: { [DRIVER]: driver.replace(MARK, 'return found;') },
    filter: 'rb71_citation_oracle_control',
    label: null,
  });
  finish(
    r.killed
      ? `RB71-G4 GUTTED ORACLE ${'KILLED'}`
      : `RB71-G4 GUTTED ORACLE NOT-KILLED (${r.why})`,
  );
}

// --------------------------------------------------------------------- g8
// The label matrix: one representative per remaining oracle leg (red-team
// HIGH #1 — G3/G4 alone gate only 4 of the 14 planned mutants).
else if (MODE === 'g8') {
  const plan = read(PLAN);
  const agents = read(AGENTS);
  const ai = anchorIndex(agents);
  if (ai < 0) {
    console.log('RB71-G8 NO LIVE ANCHOR');
    process.exit(1);
  }
  const aLines = agents.split(NL);
  const anchorLine = aLines[ai];

  const withAgents = (lines) => ({ [AGENTS]: lines.join(NL) });
  const dropAnchor = () => aLines.filter((_, i) => i !== ai);
  const dupAnchor = () => [...aLines.slice(0, ai), anchorLine, ...aLines.slice(ai)];
  const insertAbove = () => [
    ...aLines.slice(0, ai),
    '- **Injected:** a bullet that pushes the anchor down one line.',
    ...aLines.slice(ai),
  ];
  // Re-attribute coverage to `just ci` itself: inject into the parenthetical
  // that follows the `just ci` token on the anchor line.
  const premature = () => {
    const flipped = anchorLine.replace('(lint', '(lint + coverage');
    if (flipped === anchorLine) return null;
    return [...aLines.slice(0, ai), flipped, ...aLines.slice(ai + 1)];
  };

  const mutants = [
    // M4 — path typo: the census finds 0 citations.
    { id: 'M4', files: { [PLAN]: plan.replace(/AGENTS\.md:/g, 'AGENT.md:') },
      filter: 'rb71_m85c_cites', label: '[cite/count]' },
    // M5 — repointed at the REAL harness file one level up.
    { id: 'M5', files: { [PLAN]: plan.replace(/AGENTS\.md:/g, '../../AGENTS.md:') },
      filter: 'rb71_m85c_cites', label: '[cite/count]' },
    // M6 — a decoy second citation pasted at EOF.
    { id: 'M6', files: { [PLAN]: `${plan}${NL}<!-- decoy AGENTS.md:${ai + 1} -->${NL}` },
      filter: 'rb71_m85c_cites', label: '[cite/count]' },
    // M7 — the landmark bullet deleted from AGENTS.md.
    { id: 'M7', files: withAgents(dropAnchor()),
      filter: 'rb71_m85c_cites', label: '[anchor/missing]' },
    // M8 — the landmark bullet duplicated.
    { id: 'M8', files: withAgents(dupAnchor()),
      filter: 'rb71_m85c_cites', label: '[anchor/not-unique]' },
    // M9 — THE EXACT DRIFT BEING FIXED: a bullet inserted above the anchor.
    { id: 'M9', files: withAgents(insertAbove()),
      filter: 'rb71_m85c_cites', label: '[cite/line-mismatch]' },
    // M10 — landmark stripped from the plan block, bare number kept.
    { id: 'M10', files: { [PLAN]: plan.replace(/\*\*Done =\*\*/g, 'Done') },
      filter: 'rb71_m85c_cites', label: '[anchor/doc-missing]' },
    // M11 — the stale present-tense claim is re-introduced into the block while
    // the live AGENTS.md parenthetical does NOT name coverage/mutation.
    { id: 'M11',
      files: {
        [PLAN]: plan.replace(
          '**Doc reconciliation',
          '**Doc reconciliation (both FALSELY claim it today)',
        ),
      },
      filter: 'rb71_m85c_bullet', label: '[claim/stale-tense]' },
    // M12 — AGENTS.md re-attributes coverage to `just ci`; doc stays past-tense.
    { id: 'M12', files: premature() === null ? null : withAgents(premature()),
      filter: 'rb71_m85c_bullet', label: '[claim/premature-past]' },
    // M14 — the anchor file is gutted: the oracle must fail LOUD, never pass.
    { id: 'M14', files: { [AGENTS]: '' },
      filter: 'rb71_m85c_cites', label: null },
  ];

  const survivors = [];
  let killed = 0;
  for (const m of mutants) {
    if (m.files === null) {
      survivors.push(`${m.id}:UNAPPLIABLE`);
      continue;
    }
    const r = probe({ files: m.files, filter: m.filter, label: m.label });
    if (r.killed) killed++;
    else survivors.push(`${m.id}:${r.why}`);
  }
  const tail = survivors.length ? ` survivors=${survivors.join(',')}` : '';
  finish(`RB71-G8 ${killed}/${mutants.length} LABEL MUTANTS ${'KILLED'}${tail}`);
} else {
  console.log('RB71 UNKNOWN MODE');
  process.exit(2);
}
