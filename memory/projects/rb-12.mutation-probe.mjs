// rb-12 mutation bite-proof harness (ADR-0010 proof-of-teeth, ledger gate X8).
//
// Each mutant is applied to a SCRATCH COPY of the worktree file, the named tooth is run, and the
// mutant must RED that tooth. Two failure modes this harness refuses to conflate:
//   * a mutation that never applied (a silently-unmatched replace reads EXACTLY like "the gate
//     accepted the cheat") -> every mutant asserts its edit changed the file, and that the anchor
//     matched exactly once;
//   * a mutant caught by a NEIGHBOURING tooth rather than its own -> each mutant pins the expected
//     tooth LABEL, not merely a non-zero exit.
// Originals are restored from an in-memory snapshot in a finally block; no git command runs here
// (a directory-wide `git checkout --` in a mutation loop has wiped uncommitted gate work before).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const WT = '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-12';
const EVAL = `${WT}/evals/a11y-static-shell.eval.mjs`;
const TS = `${WT}/client/src/indexShell.test.ts`;
const ENV = { ...process.env, PATH: `${process.env.HOME}/.asdf/shims:${process.env.HOME}/.cargo/bin:${process.env.HOME}/.local/bin:${process.env.PATH}` };

const SLASH_STAR = ['/', '*'].join('');

/** Run the eval tier; return the concatenated failure detail (empty string when it passes). */
function runEvalTier() {
  const code = `import('./evals/a11y-static-shell.eval.mjs').then(m=>m.default()).then(r=>{const a=Array.isArray(r)?r:[r];const bad=a.filter(c=>c.pass===false);process.stdout.write(bad.map(b=>b.detail).join(' | '));}).catch(e=>process.stdout.write('THREW:'+e.message))`;
  return execFileSync('node', ['-e', code], { cwd: WT, env: ENV, encoding: 'utf8', timeout: 180000 });
}

/** Run one vitest gate by RB12 prefix; return 'passed' | 'failed' | 'missing'. */
function runVitestGate(prefix) {
  const out = `/tmp/rb12-mut-${prefix.replace(/[^A-Za-z0-9]/g, '')}.json`;
  try {
    execFileSync('npx', ['vitest', 'run', 'src/indexShell.test.ts', '--reporter=json', `--outputFile=${out}`],
      { cwd: `${WT}/client`, env: ENV, encoding: 'utf8', timeout: 300000, stdio: 'ignore' });
  } catch { /* non-zero exit is expected when a gate REDs */ }
  let report;
  try { report = JSON.parse(readFileSync(out, 'utf8')); } catch { return 'missing'; }
  const hits = report.testResults.flatMap((f) => f.assertionResults).filter((a) => a.title.indexOf(prefix) === 0);
  if (hits.length !== 1) return `count=${hits.length}`;
  return hits[0].status;
}

const MUTANTS = [
  { id: 'M1', file: EVAL, tooth: 'TEETH T10c', why: 'revert the owner to the naive body verbatim',
    from: `export function stripCssComments(src) {`,
    to: `export function stripCssComments(src) {\n  return fixtureUnhardenedCssStripper(src);` },
  { id: 'M2', file: EVAL, tooth: 'TEETH T10c', why: 'drop the double-quote string state',
    from: `    if (ch === '"') state = 'dq';`, to: `    if (ch === '"') state = 'normal';` },
  { id: 'M3', file: EVAL, tooth: 'TEETH T10c', why: 'drop the unterminated-string throw (fail-open)',
    from: `    throw new Error('CSS parse failed: unterminated string literal at end of input');`, to: `    return out;` },
  { id: 'M4', file: EVAL, tooth: 'TEETH T10c', why: 'drop newline preservation inside comments',
    from: `      if (ch === '\\n') out += '\\n';`, to: `      if (ch === '\\n') out += '';` },
  { id: 'M5', file: EVAL, tooth: 'TEETH T10d', why: 'delete a corpus cell', vitestGate: 'RB12-G3',
    from: `  'normal/empty',\n]);`, to: `]);` },
  { id: 'M6', file: EVAL, tooth: 'TEETH T10e', why: 'point the naive fixture at the real oracle',
    from: `export function fixtureUnhardenedCssStripper(src) {`, to: `export function fixtureUnhardenedCssStripper(src) {\n  return stripCssComments(src);` },
  { id: 'M7', file: TS, vitestGate: 'RB12-G1', why: 're-add a local duplicate definition',
    from: `function parseCssRules(src: string): CssRule[] {`,
    to: `function stripCssComments(src: string): string {\n  return src;\n}\n\nfunction parseCssRules(src: string): CssRule[] {` },
  { id: 'M8', file: EVAL, vitestGate: 'RB12-G6', why: 'corrupt a shared kill-cell expectation',
    from: `    expect: { kind: 'value', out: CELL_DQ_COMMENT_OPEN_INERT_CSS },`,
    to: `    expect: { kind: 'value', out: '.a{content:"' },` },
  // M9/M10 close the two bypasses the rb-12 red-team MEASURED against the first landed gate set.
  { id: 'M9', file: TS, vitestGate: 'RB12-G7', why: 'detach parseCssRules from the owner (red-team Finding 1)',
    from: `  const clean = stripCssComments(src);`,
    to: `  const clean = rb12DetachedStrip(src);` },
  { id: 'M10', file: EVAL, vitestGate: 'RB12-G6', why: 'trivialise a non-kill cell payload, self-consistently (red-team Finding 2)',
    from: `    css: '@media (min-width:1px){.a{font:14px/1.6 monospace}}',\n    expect: { kind: 'value', out: '@media (min-width:1px){.a{font:14px/1.6 monospace}}' },`,
    to: `    css: '.trivial{color:red}',\n    expect: { kind: 'value', out: '.trivial{color:red}' },` },
  // M11 closes the gap the /simplify lens found: both tiers only asserted NAIVE_KILLS was
  // non-empty, so shrinking it silently un-tested three cells in the discrimination teeth.
  { id: 'M11', file: EVAL, tooth: 'TEETH T10e', why: 'shrink NAIVE_KILLS to one entry (/simplify finding)',
    from: `  'dq/backslash-escape',\n  'EOF/in-comment',\n  'EOF/in-string',\n]);`,
    to: `]);` },
];

const snapshots = new Map([[EVAL, readFileSync(EVAL, 'utf8')], [TS, readFileSync(TS, 'utf8')]]);
let applied = 0, bit = 0, unexpectedGreen = 0;

try {
  for (const m of MUTANTS) {
    const original = snapshots.get(m.file);
    const occurrences = original.split(m.from).length - 1;
    if (occurrences !== 1) { console.log(`${m.id} ANCHOR-MISS occurrences=${occurrences} — ${m.why}`); continue; }
    let mutated = original.replace(m.from, m.to);
    if (m.id === 'M9') {
      // Give the repoint a real, quote-aware-but-ESCAPE-BLIND target, matching the red-team's
      // cheat: it passes the pre-existing A6a fixture, so only G7 should catch it.
      mutated = mutated.replace(
        'function parseCssRules(src: string): CssRule[] {',
        'function rb12DetachedStrip(s: string): string {\n  let o = \'\';\n  let st = 0;\n  for (let i = 0; i < s.length; i++) {\n    const c = s.charAt(i);\n    if (st === 2) { if (c === \'*\' && s.charAt(i + 1) === \'/\') { st = 0; i++; } continue; }\n    if (st === 1) { o += c; if (c === \'"\') st = 0; continue; }\n    if (c === \'/\' && s.charAt(i + 1) === \'*\') { st = 2; i++; continue; }\n    if (c === \'"\') st = 1;\n    o += c;\n  }\n  if (st !== 0) throw new Error(\'CSS parse failed: unterminated comment at end of input\');\n  return o;\n}\n\nfunction parseCssRules(src: string): CssRule[] {',
      );
    }
    if (mutated === original) { console.log(`${m.id} NOT-APPLIED — ${m.why}`); continue; }
    writeFileSync(m.file, mutated);
    applied++;
    try {
      let red = false, observed = '';
      if (m.vitestGate) {
        observed = runVitestGate(m.vitestGate);
        red = observed !== 'passed';
      } else {
        observed = runEvalTier();
        red = observed.indexOf(m.tooth) !== -1;
      }
      if (red) { bit++; console.log(`${m.id} BIT ${m.vitestGate || m.tooth} — ${m.why}`); }
      else { unexpectedGreen++; console.log(`${m.id} UNEXPECTED-GREEN (${m.vitestGate || m.tooth}) observed="${String(observed).slice(0, 160)}" — ${m.why}`); }
    } finally {
      writeFileSync(m.file, original);
    }
  }
} finally {
  for (const [f, src] of snapshots) writeFileSync(f, src);
}

console.log(`RB12-X8-OK mutants=${MUTANTS.length} applied=${applied} bit=${bit} unexpected-green=${unexpectedGreen}`);
if (applied !== MUTANTS.length || bit !== MUTANTS.length || unexpectedGreen !== 0) process.exit(1);
