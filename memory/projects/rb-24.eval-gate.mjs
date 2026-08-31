// rb-24 eval/doc/ci gates — X6 (guest-claim-integrity, 25 keys), X7 (schema
// snapshot, 40 tables), X11 (full eval suite, truncation-proof), X14 (doc
// freshness), X15 (full just ci). Runs INSIDE the rb-24 worktree regardless of
// caller cwd. Markers print ONLY on success.
import { execSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';
const HOME = process.env.HOME;
const env = {
  ...process.env,
  PATH: `${HOME}/.asdf/shims:${HOME}/.cargo/bin:${HOME}/.local/bin:${process.env.PATH}`,
};

function die(msg) {
  console.error(`rb-24 eval-gate FAILED: ${msg}`);
  process.exit(1);
}

async function runEval(rel) {
  const m = await import(pathToFileURL(path.join(WT, rel)).href);
  return m.default();
}

const gate = process.argv[2];

if (gate === 'X6') {
  const r = await runEval('evals/guest-claim-integrity.eval.mjs');
  if (!r.pass) die(`guest-claim-integrity red: ${String(r.detail).slice(0, 800)}`);
  const d = String(r.detail);
  if (d.indexOf('25 Identity columns carry a D6 policy') < 0)
    die(`detail lacks the 25-key phrase: ${d.slice(0, 400)}`);
  console.log('rb-24-X6:SURFACE-25');
  process.exit(0);
}

if (gate === 'X7') {
  const r = await runEval('evals/battle-schema-snapshot.eval.mjs');
  if (!r.pass) die(`battle-schema-snapshot red: ${String(r.detail).slice(0, 800)}`);
  const d = String(r.detail);
  if (d.indexOf('40 tables parsed') < 0) die(`detail lacks '40 tables parsed': ${d.slice(0, 400)}`);
  console.log('rb-24-X7:SNAPSHOT-GREEN');
  process.exit(0);
}

if (gate === 'X11') {
  let out = '';
  let code = 0;
  try {
    out = execSync('node evals/run.mjs 2>&1', {
      cwd: WT,
      env,
      maxBuffer: 256 * 1024 * 1024,
      timeout: 3_600_000,
    }).toString();
  } catch (e) {
    out = String(e.stdout) + String(e.stderr);
    code = 1;
  }
  if (code !== 0) die(`evals/run.mjs exited non-zero; tail: ${out.slice(-1500)}`);
  const failLines = out.split('\n').filter((l) => l.startsWith('eval FAIL:'));
  if (failLines.length > 0) die(`FAIL lines present: ${failLines.join(' | ').slice(0, 800)}`);
  // NB: these are eval `name` fields (run.mjs prints `res.name`), NOT filenames —
  // battle-schema-snapshot.eval.mjs's name is 'schema-snapshot'.
  const mustPass = [
    'guest-claim-integrity',
    'schema-snapshot',
    'bindings-drift',
    'account-privacy',
    'rekey-contract-surface',
    'knowledge-bundle-conformance',
  ];
  for (const name of mustPass) {
    // Anchor the eval NAME as a leading token: run.mjs prints
    // `eval PASS: <name> (<desc>) — <detail>`, and a DESCRIPTION can mention
    // another eval's name (rekey-contract-surface's desc names
    // guest-claim-integrity), so a loose substring double-counts.
    const n = out
      .split('\n')
      .filter((l) => l.startsWith(`eval PASS: ${name} `) || l === `eval PASS: ${name}`).length;
    if (n !== 1) die(`'${name}' printed ${n} PASS line(s), want exactly 1 (truncation/duplication guard)`);
  }
  const passCount = out.split('\n').filter((l) => l.startsWith('eval PASS:')).length;
  if (passCount < 90) die(`only ${passCount} PASS lines — suite looks truncated`);
  console.log(`rb-24-X11:SUITE-GREEN pass=${passCount} fail=0`);
  process.exit(0);
}

if (gate === 'X14') {
  for (const cmd of ['just knowledge-check', 'just adr-digest-check']) {
    try {
      execSync(`${cmd} 2>&1`, { cwd: WT, env, maxBuffer: 64 * 1024 * 1024, timeout: 600_000 });
    } catch (e) {
      die(`${cmd} failed: ${(String(e.stdout) + String(e.stderr)).slice(-800)}`);
    }
  }
  console.log('rb-24-X14:DOCS-FRESH');
  process.exit(0);
}

if (gate === 'X15') {
  try {
    execSync('just ci 2>&1', { cwd: WT, env, maxBuffer: 512 * 1024 * 1024, timeout: 5_400_000 });
  } catch (e) {
    die(`just ci failed; tail: ${(String(e.stdout) + String(e.stderr)).slice(-2000)}`);
  }
  console.log('rb-24-X15:CI-GREEN');
  process.exit(0);
}

die(`unknown gate id ${gate}`);
