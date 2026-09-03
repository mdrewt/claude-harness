# 17r-a plan of record — wire the OS reduced-motion preference into the render loop

Branch `feat/17r-a-reduced-motion-wiring`, worktree
`projects/monster-realm/.claude/worktrees/17r-a`, forked from `origin/master` @ `71e1530`.

Lenses run on this plan: `planner` (author), `reviewer`, `red-team` (measured, ran code),
`/simplify`. Every §9 amendment below is a lens finding, attributed.

## §1 Defect

`motionPreferenceFromWindow()` (`client/src/render/motionPreference.ts:71`) has ZERO production
callers (confirmed by the UNION of CodeGraph + codebase-memory-mcp, plus a repo-wide grep for
dynamic dispatch). `resolver.resolve({...})` — the ONLY such call in non-test `client/src` — never
passes `reduceMotion`, so `ResolveInput.reduceMotion` (`client/src/render/renderResolver.ts:63`,
`= false` default at `:83`) is permanently false and BOTH reduced-motion render paths (own-entity
snap arm; `interpolateReducedMotion` for remotes) are dead code in the shipped client.

## §2 Production change (3 lines in `client/src/main.ts`)

1. `import { motionPreferenceFromWindow } from './render/motionPreference';` — biome sorts it
   between `'./render/map'` and `'./render/renderResolver'`.
2. At module scope immediately after `const resolver = new RenderResolver(STEP_MS);`:
   a ONE-LINE comment + `const motionPreference = motionPreferenceFromWindow();`
3. Inside the `resolver.resolve({...})` object literal, after `currentZoneId:`:
   `reduceMotion: motionPreference.reduceMotion,`

`createMotionPreference` returns `{ get reduceMotion() { return current } }`
(`motionPreference.ts:59-63`) and `current` is updated by the `change` listener, so ONE
module-scope construction plus a per-frame getter read IS a per-frame live read. Verified by the
`reviewer` lens against the source.

### HARD CONSTRAINT — the token ban
`client/src/main.ts` must contain neither `matchMedia` nor `prefers-reduced-motion` as RAW text,
**comments included**. Two independent, non-comment-stripped censuses enforce a single owner:
* `client/src/render/motionPreference.test.ts:371-377` — `expect(mentionsMatchMedia).toEqual(['render/motionPreference.ts'])`
* `evals/reduced-motion-purity.eval.mjs:122` (`MOTION_TOKENS`) + `:173-177` (`findMotionReaders`)

Post-edit proof obligation: `grep -c -e matchMedia -e prefers-reduced-motion client/src/main.ts`
must print `0`.

### Deliberately NOT done
`ResolveInput.reduceMotion` stays OPTIONAL. Tightening it to required would touch
`renderResolver.ts` (outside `touches:`) and ~18 `.resolve({...})` fixtures in
`renderResolver.test.ts` — larger than the fix itself. Follow-up flag, not this slice.

## §3 Gate — `client/src/main.reducedMotionWiring.test.ts` (NEW)

`// @vitest-environment happy-dom`, top-level `describe.sequential(...)` (see §9-D).
Runtime import of `./main` — the sanctioned exception documented at `main.wiring.test.ts:20-25`,
precedents `main.a11yFocus.test.ts` (drives real frames via `stubControllableRaf`/`runFrame`) and
`main.battle-reseed.test.ts` (no `#app`). Reuse the `recordListeners` cleanup harness: `main.ts`
registers module-scope listeners that STACK across `vi.resetModules()`.

Observation channel: `vi.mock('./render/renderResolver', …)` returning a subclass of the REAL
`RenderResolver` whose `resolve(input)` records `input` then returns `super.resolve(input)`.
NOT `vi.spyOn(RenderResolver.prototype, …)` on a statically-imported class — after
`vi.resetModules()` that class is a stale registry generation and records nothing (silent
false-green). Measured working by the `red-team` lens.

Preference stub: `vi.stubGlobal('matchMedia', …)` installed BEFORE `await import('./main')`, with
a precondition assertion that the stub really is what `window.matchMedia` resolves to — happy-dom
ships a real `matchMedia` reporting `matches:false`, which would make the OFF tooth pass for the
wrong reason.

### Teeth (ids are PREFIX-FREE — see §9-A)

| id | drives | asserts | wrong impl killed |
|---|---|---|---|
| `RM17A-ON` | `matches:true`, 3 frames | every recorded input has `reduceMotion === true`; exactly 1 new input per `runFrame`; shape anti-vacuity (`typeof input.now === 'number'`, `'snapped' in input`) | key absent (master today); computed-but-not-passed; hardcoded false; over-conjoined (`&& snapped`) |
| `RM17A-OFF` | `matches:false`, 3 frames | every recorded input strictly `=== false` (`undefined` fails) | unconditional `true`; "always snap" |
| `RM17A-LIVE` | starts false; frame 0; then set `mql.matches = true` AND fire every recorded `change` listener; frames 1-2 | frame 0 `false`, frames 1-2 `true`, NO re-import, NO `resetModules` | ★ read-once-at-boot into a plain boolean — the exact wrong impl `client/e2e/reduced-motion.spec.ts:460-463` names and cannot itself detect |
| `RM17A-SINGLEQ` | `matches:true`, 3 frames | exactly ONE reduced-motion query and ONE registered `change` listener | ★ per-frame re-instantiation — behaviourally green on ON/OFF/LIVE but leaks a `MediaQueryList` listener every ~16 ms; `motionPreference.ts:22-25` declares the listener page-lifetime BECAUSE it is created once |

Out of scope by design: asserting the RENDERED outcome. The resolver half is already unit-covered
(`renderResolver.test.ts`) and browser-covered; the EARS text says the new test pins the WIRING.

## §4 Proof of teeth (mutate `main.ts`, run, revert THAT FILE ONLY)

Commit the spec BEFORE mutating. After each edit `grep -c` the mutated fragment to prove it
applied — a first-occurrence replace that silently no-ops reads exactly like "the gate accepted
the cheat". Revert with `git checkout -- client/src/main.ts`, never a directory-wide revert.

| # | mutation | RED | PINNED tooth |
|---|---|---|---|
| T0 | break `runFrame` so the callback never fires | all 4 | harness anti-vacuity |
| M1 | delete the `reduceMotion:` line (= master) | ON, OFF*, LIVE | `RM17A-ON` |
| M2 | `reduceMotion: true,` | OFF, LIVE | `RM17A-OFF` |
| M3 | `reduceMotion: false,` | ON, LIVE | `RM17A-ON` |
| M4 ★ | read once at boot into a plain boolean | LIVE only | `RM17A-LIVE` |
| M5 ★ | construct `motionPreferenceFromWindow()` per frame | SINGLEQ only | `RM17A-SINGLEQ` |
| M6 | computed at module scope but key omitted | ON, LIVE | `RM17A-ON` |
| M9 | `reduceMotion: motionPreference.reduceMotion && snapped,` | ON | `RM17A-ON` |
| CONTROL | correct impl | none — 4/4 green | proves each RED is caused by the mutation |

DROPPED from the planner's list (§9-F): **M7** (key on a different call) — `resolver.resolve(`
has exactly ONE call site, so M7 collapses into M1. **M8** (pass the object not the boolean) —
`ResolveInput.reduceMotion` is typed `boolean`, so this is a `tsc` error caught by
`just client-typecheck`, not a runtime concern.

Record the exact failure MESSAGE for M4 and M5, not just the exit code: coarse exit-code probes
cannot distinguish a hollowed tooth from a neighbour catching the same mutant.

## §5 Declared scope extension — `client/e2e/reduced-motion.spec.ts`

**This is a hidden dependency relative to the seeded `touches:`, and it is REQUIRED.** rb-38 landed
a deliberate alarm whose stated design is to flip RED the instant this wiring lands:
`expect(after.sawFractionalOwnMotion).toBe(false)` wrapped in a try/catch feeding
`expect(rendererHonoursReducedMotion, '…DELETE this try/catch…').toBe(false)`.

It runs on the **PR path**, not just nightly: `client/package.json:10` `"e2e": "playwright test"`
is bare, so it runs BOTH declared projects (`client/playwright.config.ts:72-79`); `justfile`'s
`e2e:` recipe calls `npm run e2e`; `.github/workflows/ci.yml`'s `e2e` job calls `just e2e`.
`just ci` excludes e2e, so local green proves nothing about it. ⇒ the `main.ts` fix and this edit
MUST land in the same commit or the PR is unmergeable.

Minimal edit:
* DELETE the `try`/`catch` + the `rendererHonoursReducedMotion` guard; assert
  `expect(after.sawFractionalOwnMotion, '<diagnostic>').toBe(false)` directly — exactly what the
  guard's own message prescribes.
* UPDATE the now-false header/section prose that describes the defect as live.
* KEEP the still-true "KNOWN LIMIT" paragraph (the remote-branch blind spot is unchanged).
* KEEP both test TITLES byte-identical — `justfile` half-4 pins the substrings
  `'RENDERER ARM (E1, KNOWN DEFECT'` and `'RENDERER ARM mirror image'` (exactly 1 hit each), and
  the WHOLE `a11y-e2e` recipe body is byte-pinned as `A11Y_E2E_RECIPE_REGION` in
  `evals/ci-gate-wiring.eval.mjs:984-985`. Add a comment at the test declaration saying WHY the
  now-inaccurate title cannot be renamed here, so a future reader does not "fix" it and red the pin.
* RETARGET the drifted `main.ts:<N>` citations in this file onto stable landmarks (repo doctrine
  from rb-36 / `R-rb18-MAINCITE`) — this slice's own diff moves `resolver.resolve({` by +4 lines.

## §6 Docs

`ARCHITECTURE.md` only (ALWAYS-in-scope companion): the two now-false claims that the renderer arm
"is unwired in production" and that "S5 wires the live value there". Minimal, targeted.

**No ADR.** The supervisor assigned ADR number `None` — i.e. reserved none — and `/simplify`'s
verdict is that no new dependency or pattern is introduced: `ARCHITECTURE.md:1963-1979` and
`motionPreference.ts:12-20` already pre-wrote this exact code as an accepted cross-slice contract,
so the slice EXECUTES a decided plan rather than making a new call. Minting a number would also
race: `ARCHITECTURE.md:2126,2128` already record "next-free = 0234" from two prior slices, and ADR
numbers have raced a sibling merge in this repo before. The non-obvious calls (the scope
extension, the test-placement deviation, declining to tighten `reduceMotion`) are recorded here
and in the PR body.

`CHANGELOG.md` is NOT hand-edited (git-cliff generated from Conventional Commits).

## §7 Follow-up flags — outside `touches:`, deliberately NOT touched

1. `justfile:363-372` — prose above the byte-pinned region telling readers the renderer arm is
   unimplemented; false after this slice. Comment-only, not required for green. BOTH the
   `reviewer` and `/simplify` lenses wanted it promoted to required; the supervised-loop touch
   rule says a file outside `touches:` that merely invites cleanup gets a flag, not an edit.
2. `client/src/render/motionPreference.ts:12-20` — the S7→S5 contract header still says the module
   "ships UNCONSUMED" and cites `main.ts:236`/`:2719` (already stale before this slice).
3. `docs/adr/0219-*.md:37` and `CHANGELOG.md` — literal `main.ts:2807` citations this diff drifts.
4. Retiring the `KNOWN DEFECT` e2e test title + its justfile/eval pins (self-contained slice).
5. Tightening `ResolveInput.reduceMotion` to required (~18 fixture call sites).
6. `client/e2e/golden.spec.ts:158-168` and `zoneSync.spec.ts` assert `sawFractionalOwnMotion === true`
   under the DEFAULT playwright project. Correct today and after this slice (Playwright's default
   is `no-preference`, and only the `reduced-motion` project sets `contextOptions`), but the
   wiring makes that a NEW ambient-environment dependency. An explicit
   `page.emulateMedia({ reducedMotion: 'no-preference' })` would pin it.
7. Extracting the runtime-import harness shared verbatim by three `main.*.test.ts` files.

## §8 Anti-patterns

AP1 stale-class prototype spy · AP2 unstubbed `window` (happy-dom's real `matchMedia`) ·
AP3 writing a banned token into `main.ts`, comments included · AP4 renaming a pinned e2e title ·
AP5 adding the new spec to `a11y-e2e` half 2's byte-pinned roster · AP6 a source-scan presence pin
as the gate (forgeable) · AP7 formatting with unpinned `npx biome` instead of
`client/node_modules/.bin/biome` · AP8 `new RegExp`/`eval`/`new Function` (Semgrep, remote-only) ·
AP9 directory-wide `git checkout --` in the mutation loop · AP10 trusting `numTotalTests` alone ·
AP11 "fixing" the e2e by asserting today's behaviour (the false green ADR-0219 exists to prevent).

## §9 Amendments from the plan-review lenses

**A. CRITICAL, red-team, MEASURED — tooth ids must be prefix-free.** `RM17A-ON` is a literal
substring of `RM17A-ONE-QUERY`. With the planner's names the ledger's "each id appears exactly
once" census counts `RM17A-ON` **twice**, permanently red-ing a correct implementation; and
deleting the `RM17A-ON` test entirely still prints `teeth=4/4 … OK` (exit 0) because
`RM17A-ONE-QUERY`'s title still contains the substring. Both directions measured against synthetic
reports. ⇒ renamed to `RM17A-SINGLEQ`. The spec's `describe` title must contain no tooth id
(`fullName` concatenates describe + test).

**B. HIGH, red-team, MEASURED — the adjudicator was blind to a collection-time crash.** On vitest
4.1.11 a file that throws at import gets `testResults[i].status === "failed"` with
`assertionResults: []` but contributes **0** to `numFailedTests`; only `numFailedTestSuites` moves.
⇒ the CHECK additionally requires `success === true` and `numFailedTestSuites === 0`, and chains
with `&&` so vitest's own non-zero exit hard-fails before the adjudicator runs.

**C. HIGH, red-team, MEASURED — an inline raw-`matchMedia` reimplementation in `main.ts` passes
all 4 teeth.** It never imports `motionPreference.ts` at all (an A11Y-28 single-owner violation).
Caught only by the disjoint `evals/reduced-motion-purity.eval.mjs` (`[A11Y-RM2a]`), which DOES run
under `just ci` (`evals/run.mjs` globs `evals/*.eval.mjs`). ⇒ the B1 CHECK invokes that eval too,
so the ledger gate is sufficient standing alone rather than relying on a neighbouring CI step.

**D. HIGH, red-team, MEASURED — `--sequence.concurrent` flake inherited from the precedent.**
`npx vitest run --sequence.concurrent src/main.a11yFocus.test.ts` fails 4/26. happy-dom's
`document`/`window` is per-FILE, and the harness keeps module-scope rAF + hoisted state. The
precedent was never hardened (unlike `overlayA11yWiring.test.ts`, fixed at rb-37 for this exact
reason). ⇒ the new file uses `describe.sequential(...)` from the start.

**E. MAJOR, reviewer — `main.ts:<N>` citation drift.** This diff moves `resolver.resolve({` by +4.
Live literal citations exist in `ARCHITECTURE.md`, `docs/adr/0219-*.md:37`,
`client/e2e/reduced-motion.spec.ts`, `CHANGELOG.md`, `justfile:364`. None is a mechanical gate
(verified: `main.wiring.test.ts` anchors on string needles, never line numbers), so nothing REDS —
but this is the exact class rb-36 remediated. ⇒ retarget onto landmarks in the two files this
slice already touches; flag the rest (§7.3).

**F. red-team + /simplify — trim the mutant list.** M7 has no second `resolver.resolve(` call site
to misroute to; M8 is a compile error. Dropped from the runtime mutant set (§4).

**G. /simplify — no ADR, one-line comment, lighter harness.** ADR dropped (§6). The `main.ts`
comment is ONE line. The test harness takes only what it needs: the `#app` shell is included only
if removing it stops the frame loop from reaching the resolve call — decided by RUNNING it, not by
assumption. (`/simplify` argued for the no-`#app` `main.battle-reseed.test.ts` shape; the
`red-team` measured the `main.a11yFocus.test.ts` shape actually working end-to-end. Measured beats
theorised, so the a11yFocus shape is the fallback if the lighter one does not drive frames.)

**H. reviewer, process — torn reads on a live worktree.** The `reviewer` lens ran concurrently with
the `red-team`'s in-worktree mutation experiments and observed `main.ts` line numbers moving
mid-review (`2807 → 2809 → 2811`). Its line citations are point-in-time. The worktree was verified
clean (`git status --porcelain` empty, HEAD `71e1530`) before this plan was committed. Do not
run a read-only lens against a worktree another agent is mutating.

## §10 Tasks

T1 baseline green · T2 `tester` writes the spec, lands RED, spec committed FIRST ·
T3 `specialist` applies the 3 `main.ts` lines + the token grep · T4 the e2e scope extension ·
T5 proof-of-teeth T0/M1-M6/M9/CONTROL · T6 ARCHITECTURE.md · T7 full `just ci` + `mr-gates check` ·
T8 PR body with `touches-delta:`, `boyscout-delta:`, the ledger render, and §7's flags.
