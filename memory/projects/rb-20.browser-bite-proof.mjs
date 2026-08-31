#!/usr/bin/env node
// rb-20 ledger gate RM-3 — the REAL-BROWSER bite proof.
//
// This is the only oracle in the slice that launches Chromium. Everything else
// (`rb-20.collection-proof.mjs`, `rb-20.bite-proof.mjs`, the eval teeth) is text over
// source files, and text can only prove the reduced-motion option is PRESENT. Presence
// is not the claim. `use: { reducedMotion: 'reduce' }` — the spelling every Playwright
// doc page shows — is present, and is a TS2769 compile error plus a runtime no-op on
// this repo's pinned @playwright/test 1.61.1 (ADR-0219 D5). Only a browser can tell the
// two apart, and telling them apart is the entire point of a browser tier.
//
// SHAPE: baseline must PASS, then each mutant must RED. Baseline-first is load-bearing —
// a spec that cannot pass at all "catches" every mutant and proves nothing.
//
// THE THREE MUTANTS, each aimed at a different link in the chain the residual says is
// unproven end to end:
//   M1  the project's `contextOptions.reducedMotion` — does the PROJECT CONFIG reach the
//       page? Kills a spec that emulates in-test instead of reading the config.
//   M2  styles.css's `@media (prefers-reduced-motion: reduce)` guard — is the media query
//       actually EVALUATED by Chromium? This is the claim happy-dom structurally cannot make.
//   M3  styles.css's BASE `.hp-fill { transition: width 0.3s }` rule — is the guard
//       CONDITIONAL? Kills a blanket `transition: none` and a stylesheet that never loaded.
//
// SAFETY. Mutations are applied in place and restored from bytes captured before the run,
// in a `finally`, never with `git checkout` — a directory-wide revert in a mutation loop
// has previously destroyed uncommitted work in this repo. The worktree is asserted clean
// before starting and re-asserted after, so a crashed run cannot be mistaken for a pass.
// NOTE `client/src/styles.css` is outside rb-20's declared `touches:`; it is mutated only
// transiently here and is never committed — the post-run `git status` assert is what proves it.
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const WT = process.argv[2];
if (!WT) {
  console.error('usage: rb-20.browser-bite-proof.mjs <worktree-abs-path>');
  process.exit(2);
}
const CLIENT = path.join(WT, 'client');
const CONFIG = path.join(CLIENT, 'playwright.config.ts');
const STYLES = path.join(CLIENT, 'src', 'styles.css');

const dirty = execSync('git status --porcelain', { cwd: WT, encoding: 'utf8' }).trim();
if (dirty !== '') {
  console.error(`RB20-BROWSER-BITE refusing to run: worktree is dirty —\n${dirty}`);
  process.exit(2);
}

const ORIGINALS = new Map([
  [CONFIG, readFileSync(CONFIG, 'utf8')],
  [STYLES, readFileSync(STYLES, 'utf8')],
]);

// CRASH-DURABLE RESTORE (rb-20 artifact red-team, finding 4, reproduced with a PoC).
// A `finally` is not a restore guarantee: SIGKILL, an OOM-kill, or a harness timeout that
// kills the process group during any of the four multi-second `runSpec()` windows leaves a
// MUTATED `client/src/styles.css` — a file outside this slice's declared `touches:` — sitting
// uncommitted in the live worktree with nothing to raise an alarm. This repo has already lost
// uncommitted work twice to mutation-loop cleanup that did not run.
//
// So the originals are also written to an on-disk sentinel BEFORE the first mutation, and a
// stale sentinel found at startup is restored from and then refused — a run that crashed is
// visible and self-healing rather than silent. `process.on('SIGINT'/'SIGTERM')` covers the
// catchable signals; the sentinel covers the ones nothing can catch.
const SENTINEL = '/tmp/rb-20.browser-bite-proof.restore.json';
if (existsSync(SENTINEL)) {
  const stale = JSON.parse(readFileSync(SENTINEL, 'utf8'));
  for (const [file, text] of Object.entries(stale.files)) writeFileSync(file, text);
  rmSync(SENTINEL, { force: true });
  console.error(
    `RB20-BROWSER-BITE refusing to run: a STALE restore sentinel was found (a previous run was killed mid-mutation, started ${stale.startedAt}).\n` +
      `Its ${Object.keys(stale.files).length} file(s) have now been restored from it. Re-run to proceed.`,
  );
  process.exit(2);
}
writeFileSync(
  SENTINEL,
  JSON.stringify({ startedAt: new Date().toISOString(), pid: process.pid, files: Object.fromEntries(ORIGINALS) }),
);

const restore = () => {
  for (const [file, text] of ORIGINALS) writeFileSync(file, text);
};
const finish = () => {
  restore();
  rmSync(SENTINEL, { force: true });
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    finish();
    process.exit(130);
  });
}

// A mutation that does not apply is the measured way a bite-proof reports "the gate
// accepted the cheat" when in fact nothing was cheated. Throw instead.
function mutate(file, find, replaceWith) {
  const before = ORIGINALS.get(file);
  const occurrences = before.split(find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`anchor occurs ${occurrences}x in ${path.basename(file)} (need exactly 1): ${find.slice(0, 70)}`);
  }
  writeFileSync(file, before.split(find).join(replaceWith));
}

// Runs the real suite for the reduced-motion project. Returns {passed, code, tail}.
function runSpec() {
  const env = {
    ...process.env,
    STDB_SERVER: process.env.STDB_SERVER ?? 'http://127.0.0.1:3000',
    VITE_STDB_URI: process.env.VITE_STDB_URI ?? 'ws://127.0.0.1:3000',
    VITE_STDB_DB: process.env.VITE_STDB_DB ?? 'monster-realm-rb20',
    MR_E2E_PORT: process.env.MR_E2E_PORT ?? '5293',
  };
  try {
    const out = execFileSync('npx', ['playwright', 'test', '--project=reduced-motion', '--reporter=line'], {
      cwd: CLIENT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env,
    });
    return { passed: true, code: 0, tail: out.trim().split('\n').slice(-2).join(' | ') };
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    return { passed: false, code: err.status ?? -1, tail: out.trim().split('\n').slice(-3).join(' | ') };
  }
}

const MUTANTS = [
  {
    id: 'M1-config-option-removed',
    apply: () =>
      mutate(CONFIG, "      use: { contextOptions: { reducedMotion: 'reduce' } },\n", ''),
    why: 'the project config must be what reaches the page (not an in-test emulateMedia)',
  },
  {
    id: 'M2-media-guard-removed',
    apply: () =>
      mutate(
        STYLES,
        '@media (prefers-reduced-motion: reduce) {\n  .hp-fill {\n    transition: none;\n  }\n}',
        '',
      ),
    why: 'Chromium must actually EVALUATE the media query — the claim happy-dom cannot make',
  },
  {
    id: 'M3-base-rule-removed',
    apply: () => mutate(STYLES, '.hp-fill {\n  transition: width 0.3s;\n}', ''),
    why: 'the guard must be CONDITIONAL — a blanket `transition: none` must not pass',
  },
];

let baseline = null;
let caught = 0;
let survived = 0;
try {
  console.log('--- BASELINE (healthy tree must PASS) ---');
  baseline = runSpec();
  console.log(`  baseline: ${baseline.passed ? 'PASS' : `FAIL (code ${baseline.code})`} — ${baseline.tail}`);
  restore();

  if (baseline.passed) {
    console.log('--- MUTANTS (each must RED) ---');
    for (const m of MUTANTS) {
      try {
        m.apply();
        const r = runSpec();
        if (r.passed) {
          survived += 1;
          console.log(`  ${m.id}: SURVIVED (still green!) — ${m.why}`);
        } else {
          caught += 1;
          console.log(`  ${m.id}: caught (red, code ${r.code}) — ${m.why}`);
        }
      } catch (e) {
        survived += 1;
        console.log(`  ${m.id}: MUTATION FAILED TO APPLY — ${e.message}`);
      } finally {
        restore();
      }
    }
  }
} finally {
  finish();
}

const stillDirty = execSync('git status --porcelain', { cwd: WT, encoding: 'utf8' }).trim();
const restored = stillDirty === '' ? 'Y' : 'N';
if (restored !== 'Y') console.error(`  FAIL: worktree not restored —\n${stillDirty}`);

const ok = baseline?.passed === true && survived === 0 && caught === MUTANTS.length && restored === 'Y';
console.log(
  `\nRB20-BROWSER-BITE baseline=${baseline?.passed ? 'PASS' : 'FAIL'} mutants=${MUTANTS.length} ` +
    `caught=${caught}/${MUTANTS.length} survived=${survived} restored=${restored} verdict=${ok ? 'Y' : 'N'}`,
);
process.exit(ok ? 0 : 1);
