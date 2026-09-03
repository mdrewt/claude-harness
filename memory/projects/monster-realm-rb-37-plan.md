# rb-37 BUILD PLAN — REVISION 2 (post `/simplify` lens)

Slice: make `client/src/ui/overlayA11yWiring.test.ts` safe under `vitest --sequence.concurrent`.
Worktree: /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-37
(branch slice/rb-37 from origin/master@318eb70). Measurements are in /tmp/rb37-context.md — READ IT.

## 1. THE FIX
`client/src/ui/overlayA11yWiring.test.ts:492` — `describe(` -> `describe.sequential(`, plus a
rationale comment block immediately above it carrying a unique marker token
`RB37-SEQUENTIAL-RATIONALE`.

Rejected alternatives, with reasons:
 * `it.sequential` per test (~12 sites incl. 7 inside the per-id `for` loop): not total; the next
   tooth family added to the loop is silently unsafe again.
 * a `client/vite.config.ts` `sequence.concurrent: false` (or a `test.projects` per-file override):
   the CRITERION IS the CLI flag, and the CLI flag OVERRIDES config — so a config route cannot
   satisfy it. Also `evals/overlay-a11y-manifest.eval.mjs:434 includeSelectsTests` parses the
   `test: {` block positionally and `evals/dom-shell-coverage-exclusion.eval.mjs` exact-set-guards
   the coverage include/exclude in that same object.
 * There is no `// @vitest-sequential` pragma and `vi.setConfig` has no sequencing knob.

The rationale block must state: the four per-FILE/per-MODULE singletons that cannot be forked per
test (one happy-dom `document`; the module-scope beforeEach/afterEach that replaceChildren + adopt
index.html + `vi.clearAllMocks()`; the process-global spy from `vi.mock('./overlayA11y',{spy:true})`;
`overlayA11y.ts`'s module-private `OPEN_OVERLAYS` with no reset export); that every test awaits a
real macrotask so concurrent beforeEach wipes a peer mid-flight; why true isolation was rejected
(it means a happy-dom Window per test + injecting `document` into 16 view classes + overlayA11y /
focusTrap / liveRegion — a production refactor); the dated measurement (76 failed/40 passed at
origin/master@318eb70; 116/116 after, in all four sequence modes); "a vite.config.ts setting cannot
substitute — the CLI flag overrides config"; and the named consequence of deleting it.

## 2. PROOF-OF-TEETH  (ADR-0224: an ordinary TS test, never a new evals/*.eval.mjs)
NEW sibling spec `client/src/ui/overlayA11yWiring.concurrency.test.ts`, four teeth + an afterAll
arms-counter. It spawns CHILD vitest runs with `spawnSync` (explicit binary
`client/node_modules/.bin/vitest`, cwd = client root, `--reporter=json --outputFile=<mkdtemp>`),
never `npx`, never PATH. Precedent in-repo: `client/src/ui/overlayRegistry.test.ts:1111-1190`
spawns `tsc` the same way with a control probe asserted first.

One shared `const SEQUENCE_CONCURRENT_FLAG = '--sequence.concurrent'` and ONE `runVitest()` helper
used by all three arms — so a typo'd flag or a broken spawn reds the CONTROL first, which is what
transfers the control's verdict onto the target arm.

  T1 RB37-FLAG-CONTROL-NEGATIVE — control fixture, NO flag  -> total=2, failed=1, passed=1
  T2 RB37-FLAG-CONTROL-POSITIVE — control fixture, WITH flag -> total=2, failed=0
  T3 RB37-CONCURRENT-SAFE — the target file, WITH flag -> testResults.length===1, basename ===
     'overlayA11yWiring.test.ts', numTotalTests===116, failed/pending/todo===0, EVERY
     assertionResult.status==='passed', and a per-family census: exactly 16 tests titled with each
     of S10-WIRE-{MECHANISM,OPEN-ARIA,ROOT-IDENTITY,FOCUS-IDENTITY,REPEAT-NO-REOPEN,
     REOPEN-AFTER-CLOSE,CLOSE-RESTORE}: (7x16 + 4 standalone = 116).
  T4 RB37-RATIONALE-DURABLE — static: import `stripTsComments` + `stripTsCommentsAndStrings` from
     `evals/overlay-a11y-manifest.eval.mjs` (:138/:148, one import statement — biome merges
     same-specifier imports) and assert `describe.sequential(` occurs EXACTLY ONCE in each stripped
     form, the marker `RB37-SEQUENTIAL-RATIONALE` exactly once in RAW, and an anti-over-strip sanity
     set (`installSentinel`, `afterAll(`) still present in the stripped text.
  afterAll: armsRun === 4.
  Module scope: `if (process.env.MR_RB37_CHILD === '1') throw` (a THROW, never a skip — fail-closed,
  and a skip would red the nightly `numPendingTests !== 0` clause).
  A single derived success line whose every number is computed from the runs.

CONTROL FIXTURE (proves `--sequence.concurrent` is actually live in vitest 4.1.10 — without it the
target arm degrades to "the file passes vitest", which `just client-test` already proves for free):
  `client/concurrency-control/vitest.control.config.ts` + `.../rendezvous.control.test.ts`.
  Exclusion audit: vitest outer `include:['src/**/*.test.ts']` (client-root-relative) does NOT match;
  playwright `testDir: ./e2e` does not match; `client/tsconfig.json include ["src","e2e","*.config.ts"]`
  does not match; coverage `include:['src/**/*.ts']` does not match; not referenced from index.html.
  biome DOES lint it (files.includes `**`). Node resolution walks up to `client/node_modules/vitest`,
  which is why a /tmp fixture is wrong (`import {it} from 'vitest'` would not resolve).
  Fixture: two `it()`s sharing module-scope `aArrived`/`bArrived`; each sets its own flag then polls
  (real timers, `await setTimeout 5ms`) up to 1500 ms for the peer, and asserts the peer arrived.
  Sequential -> A fails, B passes (exactly 1 failed). Concurrent -> both pass. That 1-vs-0 asymmetry
  is what T1/T2 pin.
  Both fixture files carry a header saying the sequential arm is SUPPOSED to report one failure.

Cost: 3 child vitest boots per `just ci` (~2 light + 1 heavy). Deliberately NOT paid for: a 4th boot
under default order (the enclosing `just client-test` already runs it) and the shuffle arms (manual
gate evidence, run once).

## 3. GATES (the ledger seeded ZERO — promoted sections are narrative, no SHALL bullets)
 RB37-G1  the fix holds under the flag with the full 116/7x16 census (child vitest + node census)
 RB37-G2  the flag is LIVE and the harness can emit a RED (both control arms)
 RB37-G3  no weakening: same 116/7x16 in all four sequence modes (MANUAL, path:line evidence)
 RB37-G4  the rationale marker + `describe.sequential(` are unique and durable (stripper census)
 RB37-G5  gate-surface neutrality (justfile/evals/vite.config/tsconfig/package*.json byte-identical
          to origin/master) and `just ci` green

## 4. BITE-PROOFS (commit the gates BEFORE mutating; revert each immediately)
 M1 `describe.sequential(` -> `describe(`            => RB37-CONCURRENT-SAFE reds (76 failures)
 M2 gut the control fixture's rendezvous (both pass) => RB37-FLAG-CONTROL-NEGATIVE reds
 M3 typo the shared flag constant                    => RB37-FLAG-CONTROL-POSITIVE reds FIRST
 M4 `it.skip` one S10-WIRE-FOCUS-IDENTITY id         => RB37-CONCURRENT-SAFE reds (family=15, pending=1)
 M5 delete the RB37-SEQUENTIAL-RATIONALE marker      => RB37-RATIONALE-DURABLE reds
 M6 `it.skip` RB37-FLAG-CONTROL-NEGATIVE             => the afterAll armsRun counter reds
 M7 point the child filter at a different spec       => RB37-CONCURRENT-SAFE reds on basename

## 5. BOY SCOUT (in-touches, comment-only, 1 hunk, ~8 lines)
`overlayA11yWiring.test.ts:286-296` carries residual R-rb36-WIRINGCITE: it cites the drifted
`main.ts:1574` and claims "the other two are flagged, not touched" — rb-36 (PR#414, merged) fixed
both, so that clause is now false. Rewrite per rb-36's own ruling: name a landmark, carry the line
number only as an explicitly dated hint, and PARAPHRASE rather than reproduce any pinned marker
literal (quoting an anchor plants a second occurrence and reds
`evals/rekey-contract-surface.eval.mjs` — that trap bit rb-36's own ARCHITECTURE paragraph).

## 6. NO ADR
No number was reserved for this slice (the brief's slot is empty) and `ARCHITECTURE.md:2126` records
`ADR next-free = 0234`; minting an unreserved number races sibling merges. Precedent rb-15/rb-17/
rb-18/rb-36: record the rulings in the ARCHITECTURE.md append log and tell the supervisor it may
allocate one. CHANGELOG.md is git-cliff-generated — not hand-edited.

## 7. FILES
 EDIT  client/src/ui/overlayA11yWiring.test.ts     (declared touches)
 EDIT  ARCHITECTURE.md                             (always-in-scope companion)
 NEW   client/src/ui/overlayA11yWiring.concurrency.test.ts   (touches-delta: sibling spec)
 NEW   client/concurrency-control/vitest.control.config.ts   (touches-delta)
 NEW   client/concurrency-control/rendezvous.control.test.ts (touches-delta)
 READ-ONLY DEP  evals/overlay-a11y-manifest.eval.mjs (stripper import; NOT edited)
 MUST STAY BYTE-IDENTICAL: justfile, evals/**, client/vite.config.ts, client/tsconfig.json,
   client/package.json, client/package-lock.json

## 8. DECLARED RESIDUAL
R-rb37-SELFCOLLECT — nothing floors the client suite's FILE count, so deleting
`overlayA11yWiring.concurrency.test.ts` leaves `just ci` green with one fewer gate. Adding it to
`just a11y-e2e`'s explicit 8-file roster needs `justfile` AND the byte-verbatim recipe pin at
`evals/ci-gate-wiring.eval.mjs` (`A11Y_E2E_RECIPE_REGION`) in the same commit — both outside
`touches:`. Declare, do not fix (rb-18 R-rb18-NIGHTLYFLOOR precedent).

================================================================================
## REVISION 2 — the `/simplify` lens landed three changes. THESE OVERRIDE §2/§3/§7 ABOVE.

S1. **THE CONTROL FIXTURE IS EPHEMERAL, NOT COMMITTED.** `client/concurrency-control/` is DELETED
    from the plan, along with the whole 4-config exclusion audit. Instead the concurrency spec
    GENERATES the control config + fixture into `mkdtempSync(path.join(tmpdir(), 'rb37-ctl-'))` at
    run time and removes them in a `finally`, which is the idiom this repo ALREADY ships at
    `client/src/ui/overlayRegistry.test.ts:1126-1190` (`writeA11yProbe` / `compileA11yProbe`, the
    `tsc` control probe, ADR-0205 D6).
    MEASURED by me in the worktree, so this is not a hypothesis:
      * the generated config is a PLAIN OBJECT default export (`export default { root, test: {...} }`)
        — NO `import { defineConfig } from 'vitest/config'`, so nothing has to resolve from /tmp;
      * the generated fixture sets `test.globals: true` in that config, so it needs NO
        `import { it, expect } from 'vitest'` either. ZERO imports in both generated files is what
        makes a /tmp location legal where the original plan wrongly concluded it was not.
      * result: `--config <tmp>/vitest.control.config.ts` alone -> total=2 passed=1 failed=1;
        with `--sequence.concurrent` -> total=2 passed=2 failed=0. The 1-vs-0 asymmetry T1/T2 pin.
    Boot cost MEASURED: control ~0.3s each, target ~1.0s. Three boots ~1.6s total, not the 15-30s
    the first draft budgeted.

S2. **`RB37-RATIONALE-DURABLE` LOSES THE STRIPPER.** The `describe.sequential(` occurrence census is
    DROPPED: T3 + bite-proof M1 already own that claim at runtime and more strongly. The import of
    `stripTsComments`/`stripTsCommentsAndStrings` from `evals/overlay-a11y-manifest.eval.mjs` is
    therefore DROPPED too — it inverted the normal dependency direction (a shipped spec depending on
    an eval-harness helper) for a check that catches nothing new. What REMAINS is the one claim
    nothing else carries: the rationale comment's marker `RB37-SEQUENTIAL-RATIONALE` occurs EXACTLY
    ONCE in the RAW target source. A marker's only failure mode is deletion, so a raw substring count
    is the right oracle and needs no comment-awareness.

S3. **THE 7x16 PER-FAMILY CENSUS COLLAPSES TO ONE PREFIX COUNT.** Listing seven family literals
    coupled this spec to the target file's internal test-naming scheme for a narrow catch. Replaced
    by a single clause: exactly 112 of the 116 titles start with `S10-WIRE-`. That still kills
    "delete the racy teeth and pad the total with trivial ones" (the only thing the aggregate
    counters miss) at one literal instead of seven.

REVISED T3 census: `testResults.length === 1`, `basename === 'overlayA11yWiring.test.ts'`,
`numTotalTests === 116`, `numFailedTests === numPendingTests === numTodoTests === 0`, EVERY
`assertionResult.status === 'passed'`, and `titles.filter(t => t.startsWith('S10-WIRE-')).length === 112`.

REVISED §7 FILES:
 EDIT  client/src/ui/overlayA11yWiring.test.ts                (declared touches)
 EDIT  ARCHITECTURE.md                                        (always-in-scope companion)
 NEW   client/src/ui/overlayA11yWiring.concurrency.test.ts    (touches-delta: sibling spec)
 (no new directory, no new committed fixture, no new cross-file import)
