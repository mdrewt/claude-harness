#!/usr/bin/env node
// 17r-e.bite-proof.mjs — proof-of-teeth register for slice 17r-e (ADR-0010).
//
// Each row applies ONE mutant to the worktree, runs ONE gate from 17r-e.claim-truth.mjs, and
// requires that gate to RED with a DISTINCT failure fragment. The mutant is restored from an
// in-memory byte-exact snapshot in a `finally`, and a `process.on('exit')` handler restores again
// if the run is interrupted — a SIGKILLed register otherwise leaves the mutant committed
// (observed on rb-48's M41).
//
// No dynamic RegExp (Semgrep detect-non-literal-regexp): literal needles + split/join only.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/17r-e';
const RUNNER = '/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/17r-e.claim-truth.mjs';
const TOOL_PATH = `${process.env.HOME}/.asdf/installs/nodejs/24.13.1/bin:${process.env.HOME}/.asdf/shims:${process.env.HOME}/.cargo/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
const ENV = { ...process.env, PATH: TOOL_PATH };

const OVERLAY = 'client/src/ui/overlayA11y.ts';
const EVAL = 'evals/playtest-report.eval.mjs';
const SCRIPT = 'scripts/playtest-report.mjs';
const BOXTEST = 'client/src/ui/boxView.test.ts';
const RON = 'game-core/content/species/070-wave3.ron';

const wt = (rel) => path.join(WT, rel);
const read = (rel) => readFileSync(wt(rel), 'utf8');

/** Files snapshotted before the register runs; restored on every exit path. */
const PRISTINE = new Map();
for (const rel of [OVERLAY, EVAL, SCRIPT, BOXTEST, RON]) PRISTINE.set(rel, read(rel));

function restoreAll() {
  for (const [rel, bytes] of PRISTINE) {
    try {
      if (readFileSync(wt(rel), 'utf8') !== bytes) writeFileSync(wt(rel), bytes);
    } catch {
      /* best effort on the exit path */
    }
  }
}
process.on('exit', restoreAll);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

/** Run a gate; return {red, output}. A gate that exits 0 has NOT bitten. */
function runGate(gate) {
  try {
    const out = execFileSync('node', [RUNNER, gate], {
      env: ENV,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 600_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { red: false, output: out };
  } catch (e) {
    return { red: true, output: `${String(e.stdout || '')}${String(e.stderr || '')}` };
  }
}

/** Replace the FIRST occurrence of `from` with `to`; fail loudly if absent or ambiguous. */
function substitute(rel, from, to) {
  const src = PRISTINE.get(rel);
  const at = src.indexOf(from);
  if (at === -1) throw new Error(`mutant needle absent in ${rel}: ${from.slice(0, 60)}`);
  if (src.indexOf(from, at + from.length) !== -1) {
    throw new Error(`mutant needle ambiguous in ${rel}: ${from.slice(0, 60)}`);
  }
  writeFileSync(wt(rel), src.slice(0, at) + to + src.slice(at + from.length));
}

const T3P_BLOCK_START = '  // ── T3p (tightened identity contract)';
const T3Q_BLOCK_END = "          'one bogus aggregation group.',\n      };\n    }\n  }\n";

const MUTANTS = [
  {
    id: 'M1',
    gate: 'E3',
    why: 'revert the overlayA11y.ts header to the FALSE "share ONE root" claim',
    expect: 'lines 51-54 are unchanged',
    apply: () =>
      substitute(
        OVERLAY,
        '// THREE CROSS-SLICE CONTRACTS S1 CANNOT ENFORCE — (a) is settled; S4 pinned the box/battle half:\n' +
          '//   (a) A12 — RETRACTED: the four `#app`-mounted views do NOT "share ONE root". Each creates its\n' +
          '//       OWN root under the shared mount, so FOUR `OverlayId`s key FOUR records that never collide;\n' +
          '//       S4 must NOT close-before-open (`S4-CROSS-VIEW-DISTINCT-ROOTS`, boxView.test.ts).',
        '// THREE CROSS-SLICE CONTRACTS S1 CANNOT ENFORCE:\n' +
          '//   (a) A12 — `battleView`, `boxView`, `raisingView` and `evolutionView` share ONE `#app`-mounted\n' +
          '//       root. The map is keyed by `OverlayId`, not by root, so S4 must CLOSE-BEFORE-OPEN; opening\n' +
          '//       the next id first stacks two capture traps on the same node and Tab moves twice per press.',
      ),
  },
  {
    id: 'M2',
    gate: 'E3',
    why: 'edit overlayA11y.ts OUTSIDE 51-54 while keeping the total line count equal',
    expect: 'changed outside the declared 51-54 region',
    apply: () =>
      substitute(
        OVERLAY,
        '// throws is a bug we want loud.',
        '// throws is a bug we want LOUD (drive-by reword).',
      ),
  },
  {
    id: 'M3',
    gate: 'E3',
    why: 'quietly land the DEFERred claim-2 .ron comment fix anyway',
    expect: 'was edited — claims 2/3 are DEFERred',
    apply: () =>
      substitute(
        RON,
        'Electric resists nothing but its own mirror',
        'Electric resists only itself and Water',
      ),
  },
  {
    id: 'M4',
    gate: 'E5',
    why: 'DELETE the T3p tooth wholesale instead of correcting its stale comment',
    expect: 'T3p tooth marker occurs 0x',
    apply: () => {
      const src = PRISTINE.get(EVAL);
      const start = src.indexOf(T3P_BLOCK_START);
      const end = src.indexOf(T3Q_BLOCK_END);
      if (start === -1 || end === -1) throw new Error('M4: could not locate the T3p..T3q span');
      writeFileSync(wt(EVAL), src.slice(0, start) + src.slice(end + T3Q_BLOCK_END.length));
    },
  },
  {
    id: 'M5',
    gate: 'E5',
    why: 'plant a DECOY line carrying the T3q marker text (forged tooth)',
    expect: 'T3q tooth marker occurs 2x',
    apply: () =>
      substitute(
        EVAL,
        '  // ── T3q (tightened identity contract)',
        '  // decoy: T3q (tightened identity contract) — see below\n' +
          '  // ── T3q (tightened identity contract)',
      ),
  },
  {
    id: 'M6',
    gate: 'E5',
    why: 'modify the already-accurate Section-3 summary echo',
    expect: 'summary echo was modified',
    apply: () =>
      substitute(
        EVAL,
        // The shipped literal is single-quoted with escaped inner quotes: identity:[\'\']
        '(T3p/T3q, tightened contract) a bare-string identity and an identity:[\\\'\\\'] both throw',
        '(T3p/T3q, tightened contract) identity shapes are validated',
      ),
  },
  {
    id: 'M7',
    gate: 'E5',
    why: 're-introduce the stale EXPECTED RED qualifier at one site',
    expect: 'still occurs 1x',
    apply: () =>
      substitute(EVAL, "'TEETH (real) T3p: '", "'TEETH (real) T3p [EXPECTED RED]: '"),
  },
  {
    id: 'M8',
    gate: 'E4',
    why: 'loosen coerceRow back to accepting a bare-string identity',
    expect: 'coerceRow did NOT throw on the T3p fixture',
    apply: () =>
      substitute(
        SCRIPT,
        '  const rawIdentity = raw.identity;\n  if (',
        "  const rawIdentity = typeof raw.identity === 'string' ? [raw.identity] : raw.identity;\n  if (",
      ),
  },
  {
    id: 'M9',
    gate: 'E1',
    why: 'gut the pinned cross-view test body (drop the close half)',
    expect: 'no battleView.hide() call within 60 lines',
    apply: () => substitute(BOXTEST, '    battleView.hide();', '    // battleView.hide();'),
  },
  {
    id: 'M10',
    gate: 'E1',
    why: 'rename the pinned test so the -t filter matches nothing',
    expect: 'numPassedTests=0, want 1',
    apply: () =>
      substitute(BOXTEST, "  it('S4-CROSS-VIEW-DISTINCT-ROOTS BITES:", "  it('S4-CROSS-VIEW-RENAMED BITES:"),
  },
];

const only = process.argv.slice(2);
const rows = only.length ? MUTANTS.filter((m) => only.includes(m.id)) : MUTANTS;

let caught = 0;
let survived = 0;
const seenFragments = new Set();

for (const m of rows) {
  try {
    m.apply();
    const { red, output } = runGate(m.gate);
    if (!red) {
      survived += 1;
      console.log(`17r-e-TEETH ${m.id} SURVIVED gate=${m.gate} — ${m.why}\n${output.trim()}`);
    } else if (!output.includes(m.expect)) {
      survived += 1;
      console.log(
        `17r-e-TEETH ${m.id} WRONG-REASON gate=${m.gate} — wanted "${m.expect}"\n${output.trim()}`,
      );
    } else {
      caught += 1;
      seenFragments.add(m.expect);
      console.log(`17r-e-TEETH ${m.id} CAUGHT gate=${m.gate} — ${m.expect}`);
    }
  } finally {
    restoreAll();
  }
}

// A distinct deciding fragment per mutant is what proves the gates discriminate rather than
// failing for one shared reason.
const distinct = seenFragments.size;
if (survived === 0 && caught === rows.length && distinct === rows.length) {
  console.log(
    `17r-e-TEETH-${caught}-RED mutants=${rows.length} caught=${caught} survived=0 distinct-reasons=${distinct}`,
  );
  process.exit(0);
}
console.error(
  `17r-e-TEETH INCOMPLETE mutants=${rows.length} caught=${caught} survived=${survived} distinct-reasons=${distinct}`,
);
process.exit(1);
