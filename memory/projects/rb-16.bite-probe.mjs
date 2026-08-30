#!/usr/bin/env node
// rb-16 bite-probe: proves `evals/overlay-a11y-manifest.eval.mjs` actually bites on the REAL
// bytes of every `client/src/ui/*View.ts` file BEFORE the two hand-kept `.focus(` gating tests
// (`S3-NO-VIEW-LOCAL-FOCUS`, `S4-VIEW-LOCAL-FOCUS-5`) are deleted from `renameView.test.ts`.
//
// Every one of the eval's 19 shipped teeth runs on synthetic strings; none of them proves the
// real-tree loop at :681-719 reads the real bytes of e.g. `helpView.ts`. This is that proof.
//
// SAFETY (this repo has been burned by all three, more than once):
//   * the tree is extracted with `git archive HEAD | tar -x` into a throwaway /tmp dir. AFTER
//     the extract, NO git command runs anywhere in this script.
//   * every mutation is `fs.writeFileSync` into that /tmp copy, restored from an in-memory
//     snapshot taken immediately after extraction — never `git checkout`, never `git stash`.
//   * the main checkout (`.../projects/monster-realm`, no `.claude/worktrees/...` suffix) is
//     never referenced.
//   * every mutation is verified to have actually landed on disk (re-read + length/needle
//     check) before its result is trusted — a silently unapplied edit reads exactly like "the
//     gate accepted the cheat".
//
// `git archive HEAD` gives the COMMITTED tree. The eval and all 18 views are committed and
// unmodified by this slice, so pinning to HEAD (not the live worktree) is the point: this probe
// is evidence tied to a SHA, not to a mutable directory.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const WT =
  '/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-16';
const EVAL_REL = 'evals/overlay-a11y-manifest.eval.mjs';
const UI_REL = 'client/src/ui';

// The 18-file roster, hard-coded from the slice brief. Verified below against BOTH
// `KNOWN_VIEW_FILES` (the eval's declared roster) and `discoverViewFiles('client/src/ui')` (the
// real directory listing) — importing the roster from the eval alone would make this probe's
// denominator forgeable by editing the eval itself.
const KNOWN_18 = [
  'battleView.ts',
  'boxView.ts',
  'claimView.ts',
  'dialogueView.ts',
  'errorOverlayView.ts',
  'evolutionView.ts',
  'healView.ts',
  'helpView.ts',
  'leaderboardView.ts',
  'menuView.ts',
  'pvpView.ts',
  'questLogView.ts',
  'raisingView.ts',
  'renameView.ts',
  'sessionView.ts',
  'shopView.ts',
  'tradeProposeView.ts',
  'tradeView.ts',
].sort();

// The 8 FOCUS_SPELLINGS from the eval, as literal snippets. Only ONE of the 8 (the leading
// `.\s*focus\b` "member" shape) is anything the deleted `renameView.test.ts` lists ever matched
// (they grepped literal `.focus(`); the other 7 are the eval's measured strengthening.
const SPELLINGS_B = [
  ['optional-chain', "el?.focus?.()"],
  ['computed-single', "el['focus']()"],
  ['computed-double', 'el["focus"]()'],
  ['whitespace-member', 'el . focus()'],
  ['prototype', 'HTMLElement.prototype.focus.call(el)'],
  ['autofocus', "el.setAttribute('autofocus', '')"],
  ['computed-string', "const k = 'foc' + 'us'"],
  ['string-literal', "const K = 'focus'"],
];

function setEq(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  const SANDBOX = mkdtempSync(path.join(tmpdir(), `rb16-bite-${process.pid}-`));
  const log = (msg) => process.stderr.write(`${msg}\n`);

  try {
    // --- extract the COMMITTED tree; no git command runs after this line ------------------
    execFileSync('bash', ['-c', `git -C ${WT} archive HEAD | tar -x -C ${SANDBOX}`]);
    process.chdir(SANDBOX);

    // Snapshot every view file's PRISTINE bytes right after extraction, before any mutation —
    // Loop A/B/C all restore from this map, never from a "live" re-read that could be wrong if
    // an earlier iteration's restore silently failed.
    const PRISTINE = new Map();
    for (const file of KNOWN_18) {
      PRISTINE.set(file, readFileSync(path.join(SANDBOX, UI_REL, file), 'utf8'));
    }

    let mod;
    try {
      mod = await import(pathToFileURL(path.join(SANDBOX, EVAL_REL)).href);
    } catch (e) {
      log(`RB16-BITE-FAIL: import of ${EVAL_REL} threw: ${e.stack || e.message}`);
      process.exitCode = 1;
      return;
    }

    // One import, one call each time — the eval reads files at CALL time (relative to
    // `process.cwd()`, which we pinned above with `chdir`), not at import time.
    async function runEval() {
      try {
        return await mod.default();
      } catch (e) {
        return { pass: false, detail: `HARNESS-THREW: ${e.stack || e.message}` };
      }
    }

    // ================================================================================
    // CONTROL 0 — baseline. If this is not exactly as predicted, every later result is
    // meaningless, so abort loud rather than limping on.
    // ================================================================================
    const c0 = await runEval();
    const c0Needles = ['views=18', 'hits=0', 'diverge=0', 'spellings=8', 'teeth=19/19'];
    const c0Ok = c0.pass === true && c0Needles.every((n) => c0.detail.indexOf(n) !== -1);
    log(`CONTROL-0 pass=${c0.pass} detail=${c0.detail}`);
    if (!c0Ok) {
      log('RB16-BITE-FAIL: CONTROL-0 baseline did not match the predicted GREEN — aborting');
      process.exitCode = 1;
      return;
    }

    // ================================================================================
    // Roster from TWO independent sources.
    // ================================================================================
    const knownFromEval = mod.KNOWN_VIEW_FILES.map((pair) => pair[0])
      .slice()
      .sort();
    const discovered = mod.discoverViewFiles(UI_REL).slice().sort();
    if (!setEq(KNOWN_18, knownFromEval)) {
      log(
        `RB16-BITE-FAIL: hard-coded roster != KNOWN_VIEW_FILES: ${JSON.stringify(knownFromEval)}`,
      );
      process.exitCode = 1;
      return;
    }
    if (!setEq(KNOWN_18, discovered)) {
      log(`RB16-BITE-FAIL: hard-coded roster != discoverViewFiles(): ${JSON.stringify(discovered)}`);
      process.exitCode = 1;
      return;
    }
    log('ROSTER-CHECK OK: 18/18 matches KNOWN_VIEW_FILES and discoverViewFiles');

    // ================================================================================
    // LOOP A — per-file bite, 18 iterations, ONE FILE AT A TIME (the eval is fail-fast: a
    // two-file plant would only ever prove the alphabetically-first file bites).
    // ================================================================================
    let filesBit = 0;
    let restoredOk = 0;
    const failRows = [];

    for (const file of KNOWN_18) {
      const abs = path.join(SANDBOX, UI_REL, file);
      const original = PRISTINE.get(file);
      try {
        const needle = '\nfunction __rb16Probe(el){ el.focus(); }\n';
        const mutated = original + needle;
        writeFileSync(abs, mutated);

        // VERIFY THE MUTATION ACTUALLY APPLIED.
        const reread = readFileSync(abs, 'utf8');
        if (reread.indexOf(needle) === -1) {
          throw new Error(`plant did not land on disk for ${file} (needle absent after write)`);
        }
        if (reread.length === original.length) {
          throw new Error(`plant did not change ${file}'s byte length`);
        }

        const red = await runEval();
        if (red.pass !== false) {
          throw new Error(`expected RED after planting into ${file}, got pass=${red.pass}`);
        }
        if (red.detail.indexOf(`client/src/ui/${file}`) === -1) {
          throw new Error(`RED detail did not name client/src/ui/${file}: ${red.detail}`);
        }
        if (red.detail.indexOf('member@') === -1) {
          throw new Error(`RED detail lacked a 'member@' tag for ${file}: ${red.detail}`);
        }
        log(`LOOP-A ${file}: RED OK -> ${red.detail.slice(0, 160)}`);

        writeFileSync(abs, original);
        const restored = readFileSync(abs, 'utf8');
        if (restored !== original) {
          throw new Error(`restore verification failed for ${file}: bytes differ from pristine`);
        }

        const green = await runEval();
        if (green.pass !== true) {
          throw new Error(
            `expected GREEN again after restoring ${file}, got pass=${green.pass}: ${green.detail}`,
          );
        }
        log(`LOOP-A ${file}: GREEN-AFTER-RESTORE OK (this is what proves the red was caused ` +
          `by THIS plant, not residue)`);

        // Only counted as "bit" once EVERY check for this file — the RED-naming check, the
        // byte-exact restore, AND the GREEN-after-restore check — has passed. Incrementing
        // earlier (e.g. right after the RED check) would let a later failure in this same
        // iteration be logged to `failRows` while the counter that gates the verdict never
        // reflects it — exactly the defect class this fix closes.
        filesBit += 1;
        restoredOk += 1;
      } catch (e) {
        failRows.push(`LOOP-A ${file} FAIL: ${e.message}`);
        log(`LOOP-A ${file}: *** FAIL *** ${e.message}`);
      } finally {
        // Unconditional restore, even if an assertion threw mid-sequence.
        writeFileSync(abs, original);
      }
    }

    // ================================================================================
    // LOOP B — the strengthening proof. `menuView.ts` only, all 8 FOCUS_SPELLINGS, one at a
    // time, including the 7 the deleted lists' literal `.focus(` matcher never saw.
    // ================================================================================
    const menuFile = 'menuView.ts';
    const menuAbs = path.join(SANDBOX, UI_REL, menuFile);
    const menuOriginal = PRISTINE.get(menuFile);
    let spellingsBit = 0;

    for (const [label, snippet] of SPELLINGS_B) {
      try {
        const needle = `\n${snippet};\n`;
        const mutated = menuOriginal + needle;
        writeFileSync(menuAbs, mutated);

        const reread = readFileSync(menuAbs, 'utf8');
        if (reread.indexOf(needle) === -1) {
          throw new Error(`plant did not land on disk for spelling '${label}'`);
        }

        const red = await runEval();
        if (red.pass !== false) {
          throw new Error(
            `expected RED for spelling '${label}' (${snippet}), got pass=${red.pass}`,
          );
        }
        if (red.detail.indexOf(`client/src/ui/${menuFile}`) === -1) {
          throw new Error(`RED detail did not name menuView.ts for spelling '${label}': ${red.detail}`);
        }
        log(`LOOP-B ${label}: RED OK -> ${red.detail.slice(0, 160)}`);

        writeFileSync(menuAbs, menuOriginal);
        const restored = readFileSync(menuAbs, 'utf8');
        if (restored !== menuOriginal) {
          throw new Error(`restore verification failed for spelling '${label}'`);
        }

        const green = await runEval();
        if (green.pass !== true) {
          throw new Error(
            `expected GREEN after restoring spelling '${label}', got pass=${green.pass}`,
          );
        }
        log(`LOOP-B ${label}: GREEN-AFTER-RESTORE OK`);

        // Same fix as Loop A: only counted once the RED check, the byte-exact restore, AND the
        // GREEN-after-restore check have all passed for this spelling.
        spellingsBit += 1;
      } catch (e) {
        failRows.push(`LOOP-B ${label} FAIL: ${e.message}`);
        log(`LOOP-B ${label}: *** FAIL *** ${e.message}`);
      } finally {
        writeFileSync(menuAbs, menuOriginal);
      }
    }

    // ================================================================================
    // CONTROL C — the MEASURED, ACCEPTED BLIND SPOT. A comment-only focus MENTION must stay
    // GREEN: this is the measured evidence basis for the slice's DEFER of MV-NO-FOCUS-CALL.
    // Not suppressed, not "fixed" — reported exactly as measured.
    // ================================================================================
    let commentAxis = 'UNKNOWN';
    // Set ONLY in the `finally` below, after the post-hoc restore re-check — this is what a
    // "comment-only plant" needs that Loop A/B don't: the eval is BLIND to this plant by design
    // (that is the whole point of the control), so `commentAxis === 'EVAL-BLIND'` alone cannot
    // prove menuView.ts actually made it back to pristine bytes. This flag is the only witness.
    let controlCRestoredOk = false;
    try {
      const commentPlant =
        '\n// NOTE: do not call this.#listboxEl.focus() here — see overlayA11y.ts\n';
      const mutated = menuOriginal + commentPlant;
      writeFileSync(menuAbs, mutated);

      const reread = readFileSync(menuAbs, 'utf8');
      if (reread.indexOf(commentPlant) === -1) {
        throw new Error('CONTROL-C plant did not land on disk');
      }

      const res = await runEval();
      if (res.pass === true) {
        commentAxis = 'EVAL-BLIND';
        log(
          `CONTROL-C: comment-only focus mention stayed GREEN, as predicted (measured blind ` +
            `spot underlying the MV-NO-FOCUS-CALL DEFER) -> ${res.detail.slice(0, 160)}`,
        );
      } else {
        commentAxis = 'EVAL-CAUGHT-IT';
        log(
          `CONTROL-C: *** UNEXPECTED *** a comment-only focus mention went RED -- this contradicts ` +
            `the brief's prediction and means the MV-NO-FOCUS-CALL DEFER may be unnecessary: ${res.detail}`,
        );
      }
    } catch (e) {
      commentAxis = 'ERROR';
      log(`CONTROL-C: *** FAIL *** ${e.message}`);
      failRows.push(`CONTROL-C FAIL: ${e.message}`);
    } finally {
      writeFileSync(menuAbs, menuOriginal);
      const restored = readFileSync(menuAbs, 'utf8');
      if (restored !== menuOriginal) {
        failRows.push('CONTROL-C restore verification failed for menuView.ts');
        log('CONTROL-C: *** FAIL *** menuView.ts failed to restore to pristine bytes');
      } else {
        controlCRestoredOk = true;
      }
    }

    // Final sanity: the whole tree must read back to the EXACT baseline detail string, proving
    // every mutation above was fully undone and nothing leaked between iterations.
    const final = await runEval();
    const finalOk = final.pass === true && final.detail === c0.detail;
    log(`FINAL-GREEN pass=${final.pass} detail=${final.detail}`);
    if (!finalOk) failRows.push(`FINAL-GREEN mismatch: ${final.detail}`);

    // ================================================================================
    // Verdict.
    // ================================================================================
    const filesOk = filesBit === KNOWN_18.length && restoredOk === KNOWN_18.length;
    const spellingsOk = spellingsBit === SPELLINGS_B.length;
    // `commentAxis === 'EVAL-BLIND'` alone only proves the eval didn't red on the plant; it says
    // nothing about whether menuView.ts actually made it back to pristine bytes afterward — that
    // is what `controlCRestoredOk` (set solely in the CONTROL-C `finally`, after the plant is
    // long gone) is for.
    const controlCOk = commentAxis === 'EVAL-BLIND' && controlCRestoredOk === true;
    const unexpectedGreen =
      (KNOWN_18.length - filesBit) +
      (SPELLINGS_B.length - spellingsBit) +
      (controlCOk ? 0 : 1) +
      (finalOk ? 0 : 1);

    const line =
      `RB16-BITE-OK files=${filesBit}/${KNOWN_18.length} bit=${filesBit} ` +
      `spellings=${spellingsBit}/${SPELLINGS_B.length} restored=${restoredOk}/${KNOWN_18.length} ` +
      `commentAxis=${commentAxis} unexpected-green=${unexpectedGreen}`;

    // `failRows.length === 0` is a first-class, STRUCTURAL conjunct — not merely implied by the
    // four flags above. Every `failRows.push(...)` site in this file (LOOP A catch, LOOP B
    // catch, CONTROL-C catch, CONTROL-C finally restore-check, FINAL-GREEN mismatch) must be
    // load-bearing: if a future edit adds a new failure path and forgets to also fail one of the
    // named *Ok flags, this conjunct is what still stops the success line from printing.
    const verdictOk = filesOk && spellingsOk && controlCOk && finalOk && failRows.length === 0;

    if (!verdictOk) {
      for (const r of failRows) log(r);
      log(line.replace('RB16-BITE-OK', 'RB16-BITE-FAIL'));
      process.exitCode = 1;
      return;
    }
    // Success marker on stdout ONLY on the success path, so stdout stays parseable and a
    // failing run can never emit it.
    console.log(line);
  } finally {
    rmSync(SANDBOX, { recursive: true, force: true });
  }
}

main().catch((e) => {
  process.stderr.write(`RB16-BITE-FAIL: unhandled: ${e.stack || e.message}\n`);
  process.exitCode = 1;
});
