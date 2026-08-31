// rb-24 X13 — scope gate: (a) every changed file since the fork is inside the
// declared touches + touches-delta allowlist; (b) REKEY_MANIFEST value-diff
// between the fork and the worktree — every pre-existing key deep-equal,
// exactly ONE new key. The fork copy is imported from a /tmp mirror of evals/
// (a DIFFERENT specifier — the same-path double-import returns one cached
// frozen object, a measured tautology; and a second *.eval.mjs inside the repo
// evals/ would join the run.mjs glob). CONTROL: fork keys must be 24, live 25.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-24';
const FORK = 'efdae74dd7ffaa1eeb89f77b3b12561c280d051a';
const NEW_KEY = 'account_deletion_reaper_schedule.account_identity';

function die(msg) {
  console.error(`rb-24 scope-gate FAILED: ${msg}`);
  process.exit(1);
}

const ALLOW_EXACT = new Set([
  'server-module/src/accounts.rs',
  'server-module/src/accounts_tests.rs',
  'server-module/src/schema.rs',
  'evals/guest-claim-integrity.eval.mjs',
  'evals/battle-schema-snapshot.eval.mjs',
  'evals/baselines/table-schemas.json',
  'client/src/module_bindings/types.ts',
  'docs/adr/0221-account-deletion-reaper-schedule-declared.md',
  'docs/adr/0207-data-lifecycle-manifest-and-terminal-schema.md',
  'docs/adr/DIGEST.md',
  'ARCHITECTURE.md',
]);
const ALLOW_PREFIX = ['docs/knowledge/'];

const diff = execFileSync('git', ['diff', '--name-only', `${FORK}..HEAD`], {
  cwd: WT,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
if (diff.length === 0) die('empty diff — wrong fork SHA or wrong tree');
const extra = diff.filter(
  (f) => !ALLOW_EXACT.has(f) && !ALLOW_PREFIX.some((p) => f.startsWith(p)),
);
if (extra.length > 0) die(`files outside the declared allowlist: ${JSON.stringify(extra)}`);

// --- REKEY_MANIFEST value diff -------------------------------------------
function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
    .join(',')}}`;
}

const tmp = '/tmp/rb24-manifestdiff';
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
cpSync(path.join(WT, 'evals'), path.join(tmp, 'evals'), { recursive: true });
const forkSrc = execFileSync('git', ['show', `${FORK}:evals/guest-claim-integrity.eval.mjs`], {
  cwd: WT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
// The fork's sibling imports must also be the FORK versions, or the fork module
// would resolve against this slice's edited copies.
for (const sib of ['evals/battle-schema-snapshot.eval.mjs', 'evals/rust-scan.mjs']) {
  const s = execFileSync('git', ['show', `${FORK}:${sib}`], {
    cwd: WT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(path.join(tmp, sib), s);
}
writeFileSync(path.join(tmp, 'evals/guest-claim-integrity.eval.mjs'), forkSrc);

const forkMod = await import(
  pathToFileURL(path.join(tmp, 'evals/guest-claim-integrity.eval.mjs')).href
);
const headMod = await import(
  pathToFileURL(path.join(WT, 'evals/guest-claim-integrity.eval.mjs')).href
);
const fm = forkMod.REKEY_MANIFEST;
const hm = headMod.REKEY_MANIFEST;
if (!fm || !hm) die('REKEY_MANIFEST missing from one side');
if (fm === hm) die('fork and head manifest are the SAME object — the import tautology; probe void');
const fkeys = Object.keys(fm).sort();
const hkeys = Object.keys(hm).sort();
if (fkeys.length !== 24) die(`CONTROL: fork manifest has ${fkeys.length} keys, expected 24`);
if (hkeys.length !== 25) die(`CONTROL: live manifest has ${hkeys.length} keys, expected 25`);
let changed = 0;
for (const k of fkeys) {
  if (!Object.hasOwn(hm, k)) die(`pre-existing key REMOVED: ${k}`);
  if (stable(fm[k]) !== stable(hm[k])) {
    changed += 1;
    console.error(`changed key ${k}: fork=${stable(fm[k]).slice(0, 150)} head=${stable(hm[k]).slice(0, 150)}`);
  }
}
if (changed !== 0) die(`${changed} pre-existing REKEY_MANIFEST value(s) changed`);
const added = hkeys.filter((k) => !Object.hasOwn(fm, k));
if (added.length !== 1 || added[0] !== NEW_KEY)
  die(`added keys ${JSON.stringify(added)}, want exactly [${NEW_KEY}]`);
const nv = hm[NEW_KEY];
if (!nv || nv.policy !== 'EXEMPT' || typeof nv.reason !== 'string' || nv.reason.length < 40)
  die(`new entry is not a reasoned EXEMPT object: ${stable(nv).slice(0, 200)}`);
rmSync(tmp, { recursive: true, force: true });
console.log(`rb-24-X13:IN-SCOPE extra=0 rekeyChanged=0 rekeyNew=1 files=${diff.length}`);
