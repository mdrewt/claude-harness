#!/usr/bin/env node
// rb-26.scope-probe.mjs — the slice is prose+ADR only: zero production code,
// zero test-LOGIC change to the gate under discussion, and no line inserted
// above any existing ADR-0207 line (which would drift inbound citations).
//
// Diffs against a PINNED SHA, never a ref: a rewritable ref is a forgeable
// diff baseline.
import { execFileSync } from 'node:child_process';

const WT = '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-26';
const BASE = '11cac7e3f1156ffb6c2d63fbfaa3d69eae196036';
const git = (...a) => execFileSync('git', ['-C', WT, ...a], { encoding: 'utf8' });

// The pinned SHA is only a meaningful baseline if it is actually an ancestor of
// HEAD: git diff happily diffs two unrelated commits, so without this the probe
// would report a green scope on a rebased-onto-divergent-history worktree.
try {
  execFileSync('git', ['-C', WT, 'merge-base', '--is-ancestor', BASE, 'HEAD'], { stdio: 'ignore' });
} catch {
  console.log('rb-26 SCOPE PROBE FAILED: pinned BASE ' + BASE.slice(0, 7) + ' is not an ancestor of HEAD — the diff baseline is meaningless');
  process.exit(1);
}

const failures = [];
const files = git('diff', '--name-only', BASE, 'HEAD').trim().split('\n').filter(Boolean);

// 1. no production code
const prod = files.filter((f) => f.endsWith('.rs') || f.startsWith('client/src/') || f.startsWith('game-core/') || f.startsWith('server-module/'));
if (prod.length > 0) failures.push(`production code changed: ${prod.join(', ')}`);

// 2. the G6 gate module itself is untouched (the oracle must stay independent)
if (files.includes('evals/guest-claim-integrity.eval.mjs')) failures.push('evals/guest-claim-integrity.eval.mjs was modified — the oracle must stay independent of the slice');

// 3. every changed file is inside the declared touch-set
const ALLOWED = ['evals/rekey-contract-surface.eval.mjs', 'docs/adr/DIGEST.md', 'ARCHITECTURE.md'];
const outside = files.filter((f) => !ALLOWED.includes(f) && !f.startsWith('docs/adr/0207-') && !f.startsWith('docs/adr/0223-'));
if (outside.length > 0) failures.push(`outside declared touches: ${outside.join(', ')}`);

// 4. T1/T2/T3 bodies byte-unchanged: the ONLY removed lines in the eval are the
//    two declared replacements (the import line and the hardcoded teeth count).
const evalDiff = git('diff', BASE, 'HEAD', '--', 'evals/rekey-contract-surface.eval.mjs');
const removed = evalDiff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
const EXPECTED_REMOVALS = [
  "-import { existsSync } from 'node:fs';",
  '-  return { name, pass: true, detail: `${notes} (3 teeth verified)` };',
];
const unexpected = removed.filter((l) => !EXPECTED_REMOVALS.includes(l));
if (unexpected.length > 0) failures.push(`unexpected removals in the eval (T1/T2/T3 must be byte-unchanged):\n    ${unexpected.join('\n    ')}`);

// 5. ADR-0207 gained NO lines (end-of-line appends + one in-line rewrite only)
const adrDiff = git('diff', '--numstat', BASE, 'HEAD', '--', 'docs/adr/0207-data-lifecycle-manifest-and-terminal-schema.md').trim();
const [add, del] = adrDiff.split(/\s+/).map(Number);
if (add !== del) failures.push(`ADR-0207 line count changed (+${add}/-${del}) — an insert drifts inbound line citations`);

// 6. ARCHITECTURE.md likewise gained no lines
const archDiff = git('diff', '--numstat', BASE, 'HEAD', '--', 'ARCHITECTURE.md').trim();
if (archDiff) {
  const [a2, d2] = archDiff.split(/\s+/).map(Number);
  if (a2 !== d2) failures.push(`ARCHITECTURE.md line count changed (+${a2}/-${d2})`);
}

if (failures.length > 0) {
  console.log('rb-26 SCOPE PROBE FAILED:\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log(
  `rb-26-SCOPE:PROSE-ONLY ${files.length} file(s) changed vs ${BASE.slice(0, 7)}, ` +
    `0 production, guest-claim-integrity untouched, ${removed.length} eval removal(s) all declared, ` +
    `ADR-0207 +${add}/-${del} (net 0)`,
);
