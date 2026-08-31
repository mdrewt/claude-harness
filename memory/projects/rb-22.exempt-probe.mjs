#!/usr/bin/env node
// rb-22 EO-3/EO-7 probe: (1) runs the guest-claim-integrity eval on the shipped
// tree (its G5/G6/[S/*]/[W/*] clauses must be green with privacy.rs in the
// scan set); (2) re-verifies LIVE that export_bundle.owner_identity is still
// policy EXEMPT with the manifest key-count unchanged at 24; (3) asserts the
// slice's diff vs the fork stays inside the declared touches+companions —
// in particular ZERO files under evals/.
// Usage: node rb-22.exempt-probe.mjs <worktree>
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const wt = process.argv[2];
const FORK = '48fc867';
if (!wt || !existsSync(path.join(wt, 'evals', 'guest-claim-integrity.eval.mjs'))) {
  console.log('RB22-EXEMPT usage-error verdict=N');
  process.exit(1);
}

// (1)+(2) in a spawned node with cwd=<worktree> (the eval scans relative paths).
const probe = spawnSync(
  process.execPath,
  [
    '-e',
    `import('./evals/guest-claim-integrity.eval.mjs').then(async (m) => {
      const r = await m.default();
      const entry = m.REKEY_MANIFEST['export_bundle.owner_identity'];
      const keys = Object.keys(m.REKEY_MANIFEST).length;
      console.log('EVAL_PASS=' + r.pass);
      console.log('POLICY=' + (entry ? entry.policy : 'MISSING'));
      console.log('KEYS=' + keys);
    }).catch((e) => { console.log('THREW=' + String(e).slice(0, 200)); process.exit(2); });`,
  ],
  { cwd: wt, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
const pout = `${probe.stdout || ''}`;
const evalPass = pout.includes('EVAL_PASS=true');
const policy = (pout.match(/POLICY=(\S+)/) || [])[1] || 'UNREAD';
const keys = (pout.match(/KEYS=(\d+)/) || [])[1] || '0';

// (3) diff scope vs the fork.
const diff = spawnSync('git', ['-C', wt, 'diff', '--name-only', `${FORK}..HEAD`], {
  encoding: 'utf8',
});
const files = diff.stdout.split('\n').filter(Boolean);
const allowed = (f) =>
  f === 'server-module/src/accounts.rs' ||
  f === 'server-module/src/privacy.rs' ||
  f === 'server-module/src/lib.rs' ||
  f === 'server-module/src/accounts_tests.rs' ||
  f === 'server-module/src/privacy_tests.rs' ||
  f === 'ARCHITECTURE.md' ||
  f.startsWith('docs/adr/') ||
  f.startsWith('docs/knowledge/');
const outside = files.filter((f) => !allowed(f));
const evalsTouched = files.filter((f) => f.startsWith('evals/'));

const ok =
  evalPass && policy === 'EXEMPT' && keys === '24' && evalsTouched.length === 0 && outside.length === 0;
console.log(
  `RB22-EXEMPT eval=${evalPass ? 'PASS' : 'FAIL'} policy=${policy} keys=${keys} ` +
    `evalsDiff=${evalsTouched.length} outside=${outside.length} verdict=${ok ? 'Y' : 'N'}`,
);
if (!ok) {
  console.log(`outside-files: ${outside.join(',') || '-'}`);
  console.log(pout.slice(0, 800));
  process.exit(1);
}
