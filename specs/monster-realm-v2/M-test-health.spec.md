# Spec: M-test-health — flakes, slow tests and unmeasured hardware

**Status:** elaborated 2026-11-15 (from the 2026-11-12 sketch) against game `master` `5fdc4712`
(after ih-4, #789; every fact below was measured at `0c491981` and re-checked at `5fdc4712`, where
ih-4 changed only `client/playwright.config.ts`'s web-server `env` among the files cited here).
Queued next: `ih-1` (schema, server module, bindings). No th- slice touches a file `ih-1` lists
except the append-only `docs/DECISIONS.md`. · **Project:** monster-realm (CI script, server dev
reducer, e2e, docs) · **Slices:** 4, all heads: `th-3` ‖ `th-4` ‖ `th-1` ‖ `th-6`. The sketch's TH2
is a ruling with no build and TH5 a named deferral (below). Anchors are files and symbols, never
line numbers. · **Target:** closes before the Playtest-4 gate.

**Feedback items:** none. **Residuals mapped:** R-ci-fix-20261109T0400-LATEFOCUS-SCROLL → resolved,
no build (see "Rulings with no build"); R-np-a-flake → stays with its np-a follow-up (named
deferral); R-ci-fix-20261101T0505-CTXSTACK-FLOOR → stays a backlog row (named deferral).

## Problem

Measured at `0c491981`/`5fdc4712` and on the CI runs since 2026-11-12:

- **Five e2e tests failed on CI with no code defect behind the failure** (2026-11-12 to
  2026-11-15). Each failure either passed when its shard was rerun or failed once on a tree that
  was green on another run. They were found by reading the attempt-1 jobs of every rerun run.
  Playwright `retries` is unset in `client/playwright.config.ts`, so a rerun of failed jobs is the
  only second attempt:

  | Test | Runs (attempt 1) | Cause | Status |
  |---|---|---|---|
  | `ui-feedback.spec.ts` UIF4B.2 Controls (`#controls-tabs` y 13.4 → −18.6 at 640×240) | 43177899663 (`ci/e2e-shards`, green on attempt 2); 43502080006 (`master` 2170be97, not rerun; the same client tree was green on PR #763) | the overlay's deferred initial focus landed between two rect reads and scrolled the frame | fixed: the test settles on the rows' focus (#765); `openOverlayA11y` focuses with `preventScroll` (#768) |
  | `recruit.spec.ts` R1 ("an own turn adjacent to the wild within 3 battles") | 43175445374 (`ci/e2e-shards`), PR #729 | a kiting (Skittish) wild held its distance for the whole approach bound in 3 battles | fixed: `MAX_R1_BATTLES` 3 → 8, about 7e-6 a run (#742) |
  | `ui-feedback.spec.ts` UIF4B.2 rename (`[data-testid="rename-input"]` stayed hidden 10 s after `N`) | 43554594387 (PR #770, shard 4) | unknown: the first window, 14.4 s into the shard's first file, straight after `page.goto` + `ready` | **th-1** |
  | `tactics-wild.spec.ts` BT12-5-WILD-RECRUIT (`readOwnMonsters` stayed 3, 2 expected) | 43362803625 (PR #751, shard 3; the shard passed on attempt 2, and the run stayed red on another job) | unknown | **th-1** |
  | `remote-walk.spec.ts` np-a.9 (sprite stood still past its bound) | 43637897095 (PR #780), 43648331632 (`master` 630369c3) | CI step-arrival jitter against a timing threshold | R-np-a-flake (np-a follow-up) |

  Nothing tells anyone this list exists. The `e2e` job (`scripts/e2e-shard-union.mjs`) downloads
  every attempt's shard reports, judges each shard by its highest attempt and prints only the
  per-shard stats, so a test that passed on a rerun leaves no mark on the run.
- **One test spends 136 s waiting on real time.** `tactics-pvp.spec.ts` BT15-4-SECRECY-AFK ran
  135.9 s on `0c491981` (the shards' `e2e.json`), 14% of the 947 s the whole e2e suite spends in
  tests, and twice the next slowest. 120 s of it is four real 30 s PvP turn windows that B lets
  expire (`AFK_STRIKES = 4`), plus slack. `tactical_deadline_fire` (`server-module/src/tactics.rs`)
  is scheduler-only, and an early fire changes nothing: `game_core::tactics::clock::expire` returns
  `NotDue` while `now < deadline_ms`, and the reducer re-arms at the real deadline. So a reducer that
  only fires the schedule proves nothing, but a window whose `battle_clock.deadline_ms` has passed
  expires on the next fire. The native host already covers the AutoPass and forfeit rules
  (`server-module/src/tactics_tests.rs`, `fire_deadline`). The e2e is the only test of the
  two-browser AFK flow.
- **Dev reducers are absent from production by construction.** `dev_reducers` is a cargo feature
  (`server-module/Cargo.toml`); `just gen` runs `spacetime generate` on the default build, so
  `client/src/module_bindings/` holds no dev reducer (`grant_bait`, `server-module/src/taming.rs`,
  is the one that exists); CI's e2e jobs build the dev wasm and publish it through
  `MR_DEV_MODULE_WASM`. The e2e calls no reducer from the page or the CLI today: it seeds through
  owner SQL (`client/e2e/stdb.ts` `ownerSql`).
- **Every frame-time number is from a fast desktop.** The only recorded frame costs are the post
  stack's per-pass costs on software GL at 1280×720 on a 16-core Ryzen under WSL2
  (`docs/art/style-guide.md` §Post stack: 2.0 ms unfiltered, 35.1 ms with all four passes). The
  live game runs with the stack off (`NO_POST_STACK`, `client/src/render/postStack.ts`;
  `setPostStack` is a test switch). `MAX_BATCH_TEXTURES = 4` (`client/src/render/config.ts`) is the
  one software-rasteriser fix shipped. The client-fps SLO is p50 ≥ 55 fps
  (`ops/observability/rules/recording.rules.yml`, OBS-25). No number exists under CPU throttling or
  on an integrated GPU. `planPostStack` disables the stack for an unsupported renderer or a failed
  pass, not for a software one.
- **Playwright runs one worker** (`workers: 1`, `client/playwright.config.ts`) because specs assert the
  live population of the one database they share (`golden.spec.ts` asserts an exact presence
  count; the files' SHARED-WORLD HYGIENE notes keep it true); parallelism comes from
  shards, each with its own database and Vite port (`just e2e-shards`, CI's `e2e-shard` matrix).
  Nightly `e2e-serial` runs every spec in one process on one database.

## Scope

In:
- **`th-3`**: the `e2e` job lists every test that passed only on a rerun, in the job summary and
  as one workflow annotation per test. Pass/fail rules are unchanged.
- **`th-4`**: a `dev_reducers`-only reducer that expires a tactical battle's open turn window now.
  BT15-4-SECRECY-AFK keeps its first AutoPass strike on the real scheduler and takes the other
  three through the reducer.
- **`th-1`**: a root-cause study of the two flakes whose cause is unknown (UIF4B.2 rename,
  BT12-5-WILD-RECRUIT). It records each cause with a forcing recipe and names the fix slice.
- **`th-6`**: a low-end frame-time study, recorded beside the existing per-pass costs, plus the
  software-renderer rule for the post stack written into its `docs/DECISIONS.md` entry.

Named deferrals:
- **TH5, population-agnostic specs** (one database shared by several Playwright workers) → backlog
  row R-th-spec-POPAGNOSTIC. Lifting event: a shard count the CI
  matrix or a developer machine cannot hold, measured by whoever hits it. Until then
  multi-worker Playwright stays rejected (test-speed findings, 2026-11).
- **The post stack's software-renderer guard in code** → the slice that first turns the stack on in
  a production build. `th-6.4` writes the rule into the decision so that slice cannot skip it.
  Today no caller would run the guard.
- **An aggregate flake count across runs** (a ranking of the most frequent rerun-passed tests) →
  backlog row R-th-spec-FLAKERANK. th-3's annotations are the data: the check-runs annotations API
  returns them per run, so a later tool can count them without reading logs.
- **np-a.9 remote-walk timing** → R-np-a-flake, the np-a follow-up already holding it. th-3 makes
  its next occurrence visible.
- **The unseeded fast-check floor in `client/src/ui/contextStack.test.ts`** (a unit-test flake,
  about 1 run in 12,000) → stays R-ci-fix-20261101T0505-CTXSTACK-FLOOR, backlog. th-3 counts e2e
  tests only.
- **Integrated-GPU numbers** when the loop host exposes no integrated GPU → an operator measurement
  at the Playtest-4 gate, filed by `th-6.3` as a row with the method.

## Rulings with no build

- **Sketch TH2, Recruit R1: fixed, no slice.** The one R1 failure (run 43175445374, and PR #729
  before it) reads "an own turn adjacent to the wild within 3 battles". Zone 0's one Skittish entry
  can hold its distance for the whole `MAX_APPROACH_TURNS` bound, and three such battles in a row
  happened. #742 raised `MAX_R1_BATTLES` to 8 with its measured odds (4 of 32 first battles ran the
  bound, about 7e-6 for 8 in a row). eo-1 (#787) rewrote R1's bait half for the starter kit. No R1
  failure appears in any run since #742. th-3 lists it if it recurs.
- **Sketch TH1's Controls half: fixed, no slice.** The UIF4B.2 Controls failure was measured to
  the deferred initial focus of `openOverlayA11y` (`client/src/ui/overlayA11y.ts`) landing between
  the test's two reads (ci-fix-20261113T2045's diagnosis). The test now settles on the rows' focus
  (#765). Since ts-6b-9 (#768) the product focuses the frame's anchor with `preventScroll`, and
  `ui-feedback.spec.ts`'s late-deferred-focus test proves that a late focus moves no box at 640×240.
  The tab strip cannot leave the viewport through that path; it is not a layout defect.
  R-ci-fix-20261109T0400-LATEFOCUS-SCROLL's disposition: fixed by #768, with this evidence.

## Decisions (reversible; documented defaults, no operator question)

- `decision-defaulted:rerun-listing=summary+annotation, verdict-unchanged`: th-3 adds output, not
  a rule. A highest attempt that is green still passes the job. Failing a run that needed a rerun
  would turn every flake into a red `master` and push reruns into fix slices.
- `decision-defaulted:rerun-source=earlier-attempt-reports`: a test "passed on rerun" when an
  attempt below its shard's highest has it `unexpected` and the highest has it `expected`. There
  are no Playwright retries (`retries` unset), so a report's `flaky` count is 0 and stays a failure
  as today.
- `decision-defaulted:dev-expire-shape=move-deadline-then-arm-now`: `dev_expire_tactical_window`
  sets the open window's `battle_clock.deadline_ms` to the call's time and arms one fire at that
  time through `arm_deadline`, for the unit and `window_seq` of that window's pending
  `tactical_deadline_sched` row. The scheduler's own `tactical_deadline_fire` then expires the
  window in the next transaction. Nothing else in the expiry path changes, and every timestamp stays real. Overriding `now` would leave
  later windows opening ahead of real time.
- `decision-defaulted:dev-expire-scope=any-active-tactical-window`: the reducer acts on any Active
  tactical battle with an open turn window, wild or PvP. A wild expiry is an AutoFlee, as the real
  deadline would be. It refuses a Deploying battle, which has no turn window, rather than reaching
  into the deploy path.
- `decision-defaulted:dev-expire-caller=module-owner-only`: the e2e calls it from the CLI
  (`spacetime call`), whose identity is the publisher, the one `ownerSql` already runs as. The
  reducer admits only the database owner, checked against the `config` row's `owner_identity` as
  `sync_content` does (`server-module/src/content.rs`), never against `ctx.identity()`. A player
  calling it gets `Err` even in a dev build. The first boundary is still the build: the reducer
  exists only under `dev_reducers`, which only the e2e jobs and local e2e recipes build, and
  `th-4.6`/`th-4.7` prove a production or published module lacks it. The reducer also passes the
  deletion gate first (`grant_bait` precedent) and joins `EXPECTED_GATED`.
- `decision-defaulted:dev-expire-side=named-by-the-caller`: the call names the side whose window
  it expires (`side: u8`, 0 for A, 1 for B). A call that reaches the battle during the other
  side's window is refused, so a slow test cannot strike the wrong player.
- `decision-defaulted:dev-expire-home=server-module/src/dev_clock.rs`: a new module in the
  `taming.rs` shape, declared without a `cfg` on the last line of `server-module/src/lib.rs` as
  `mod dev_clock;`. Every item in it, its `use` lines included, carries
  `#[cfg(feature = "dev_reducers")]`. Its test module is a plain `#[cfg(test)] #[path =
  "dev_clock_tests.rs"] mod dev_clock_tests;`, and the feature gate goes on the test items inside
  that file. `privacy_enforcement_tests.rs`'s module parser refuses any other `cfg` on a module
  line: `classify_root_mod` and `scan_mod` accept only `#[cfg(test)]`, measured by applying a
  `cfg(feature)` module line to a copy of `master`, which failed three of its tests with
  `UnsupportedShape`. `tactics.rs` changes one keyword: `arm_deadline` becomes `pub(crate)`. No
  other line of the production build moves, so no panic location baked into the wasm moves. A
  build of that shape (the keyword, a trailing module line, a gated stub) gave the same sha256 as
  `master` (`49c4b9bf…`), and `th-4.6` re-proves it on the real slice.
- `decision-defaulted:real-time-path=first-strike-real`: BT15-4-SECRECY-AFK keeps its first AutoPass
  strike on the real scheduler, measured at ≥ one live window after B's window opened, and takes
  strikes 2–4 through the reducer. The real fire therefore stays covered inside the same two-browser
  test, and no second slow test is kept.
- `decision-defaulted:flake-register=docs/e2e-flakes.md`: th-1's record is a register of the e2e
  flakes whose fix has not merged. Each entry gives the test, the runs, the cause, the forcing
  recipe and the fixing slice, and leaves when its fix merges. The fixing slice deletes it.
- `decision-defaulted:frame-record-home=docs/art/style-guide.md`: th-6's numbers sit beside the
  existing per-pass record, as the sketch asks, under a new "Low-end frame times" table. The method
  is in the table's lead-in.

## Contracts between slices

- **C1 (`th-3` → `th-1`):** the summary rows th-3 writes are what the register triages: a test the
  union lists that neither the register nor an existing row holds (np-a.9 is R-np-a-flake's) is a
  new flake. Proof after merge: a CI run on `master` whose failed shard was rerun lists that test
  in its `e2e` job summary.
- **C2 (`th-4` ↔ `ih-1`):** `ih-1` adds a column to `player` and sweeps every server test file that
  holds a `Player` literal. `th-4`'s new test file builds its players only through the
  `tactics::tactics_tests` fixtures (`world`, `start_pvp`), never with a `Player` literal, so the
  two slices stay disjoint in either merge order. Proof after merge: `just test` green on `master`
  with both merged.

## Structure

No production file is touched by two th- slices. `tactics.rs` gets one keyword; the new logic goes
in `dev_clock.rs`, so no refactor slice comes first. The two studies commit docs only. th-3 edits a
CI script and its test. The only file the th- slices share with each other is `docs/DECISIONS.md`
(`th-4`, `th-6`), which is append-only.

## Slices

### th-3 — the e2e job lists the tests that passed only on a rerun
type: feature · tier: routine
category: loop-ops (test health) · severity: MED · size: SMALL
touches: scripts/e2e-shard-union.mjs, scripts/e2e-shard-union.test.mjs
after: []

`e2e-shard-union.mjs` reads every attempt's report, not only the highest one's. It also writes the
listing to `$GITHUB_STEP_SUMMARY` when that variable names a file. GitHub sets it in the `e2e` job,
so `.github/workflows/ci.yml` does not change. A shard that dies before writing any file uploads
no artifact (`if-no-files-found: warn`), so that attempt is invisible to the script. GitHub shows
a bounded number of warning annotations per step, so the summary table, not the annotations, is
the complete list. The existing tests run through `just ci`
(`door "scripts node suites"`). They build artifacts in a temporary directory and spawn the
script; the new cases extend that file and its `report` fixture with per-test results and titles.

- **th-3.1:** WHEN an attempt below a shard's highest attempt holds a test as unexpected and the highest attempt holds it as expected, THE union script SHALL print one `rerun-passed:` line for it naming its spec file and line, its title, the shard, the failing attempts and the passing attempt, and SHALL exit 0 when every existing rule holds (`scripts/e2e-shard-union.test.mjs`).

- **th-3.2:** WHEN `GITHUB_STEP_SUMMARY` names a file, THE union script SHALL append to it a table with one row per test of `th-3.1`, or the line "No e2e test passed only on a rerun." when there is none, whether the script then exits 0 or 1 (`scripts/e2e-shard-union.test.mjs`).

- **th-3.3:** WHEN the script lists a test under `th-3.1`, THE script SHALL also print one `::warning` workflow command for it whose `file` is the test's repository path (`client/e2e/<file>`), whose `line` is its line and whose message holds its title (`scripts/e2e-shard-union.test.mjs`).

- **th-3.4:** WHEN a test is unexpected on its shard's highest attempt, THE script SHALL exit 1 as today and SHALL NOT list it as passed on a rerun (`scripts/e2e-shard-union.test.mjs`).

- **th-3.5:** WHEN the artifact directory of an attempt below a shard's highest holds no readable `e2e.json`, THE script SHALL name that attempt as unreadable in the listing and SHALL NOT fail for it when the highest attempt is complete (`scripts/e2e-shard-union.test.mjs`).

### th-4 — a dev reducer expires a tactical turn window now; the AFK e2e stops waiting
type: feature · tier: hard
category: test-speed · severity: MED · size: MODERATE
touches: server-module/src/dev_clock.rs, server-module/src/dev_clock_tests.rs, server-module/src/tactics.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs, .cargo/mutants.toml, scripts/verify-release-reducers.mjs, scripts/verify-release-reducers.test.mjs, client/e2e/stdb.ts, client/e2e/tactics-pvp.spec.ts, docs/DECISIONS.md
after: []

`dev_expire_tactical_window(ctx, battle_id: u64, side: u8) -> Result<(), String>` (`dev_clock.rs`,
under `#[cfg(feature = "dev_reducers")]`):
1. `require_not_deleting(ctx, "dev_expire_tactical_window")` first, then the owner check
   (`dev-expire-caller`).
2. It refuses, with `log_reject` and no write, when the battle has no `battle_tactical` row, is not
   `Phase::Active`, holds no clock row with `window_open_ms` set, or that row's side is not `side`.
3. Otherwise it sets that clock row's `deadline_ms` to `marshal::now_ms(ctx)` and arms one fire at
   that time (`arm_deadline`, with the unit and `window_seq` of that window's pending
   `tactical_deadline_sched` row).
4. The scheduler's fire at that time expires the window, and `tactical_deadline_fire`'s
   `disarm_deadlines` deletes the battle's other deadline rows, the original one included. A
   re-armed row whose `window_seq` is stale, or the deploy unit's under Active, is a no-op.

Its tests (`dev_clock_tests.rs`, a plain `#[cfg(test)]` module declared from `dev_clock.rs`, each
test item gated by the feature; `just test` passes the feature) drive the native host through the
`tactics::tactics_tests` fixtures (C2). Gates: `cargo nextest run --features
monster-realm-module/dev_reducers -E 'package(monster-realm-module)'` for the reducer;
`just e2e` (or the CI shard) for the spec.

Measured pins:
- `privacy_enforcement_tests.rs` pins `EXPECTED_GATED` as a set in both directions and scans
  `grant_bait` "even though its cfg hides it": the new reducer joins the set. The scanner parses
  every module `lib.rs` declares and refuses a `cfg(feature)` module line, so `dev_clock.rs` takes
  the `taming.rs` shape (`dev-expire-home`). The scanner itself does not change.
- `scripts/verify-release-reducers.mjs` (`just playtest-verify-release`, run on a published
  module through `spacetime describe`) refuses a module exporting a name in `FORBIDDEN_REDUCERS`.
  The new name joins that list, and `scripts/verify-release-reducers.test.mjs`'s exact-set
  assertion moves with it. That list is what catches a playtest publish built with the feature by
  mistake.
- `client/e2e/tactics-pvp.spec.ts`: the header's "no reducer is called from the page or the CLI"
  and its TIMING note change (named intentional change). The AFK loop's
  `elapsed ≥ (AFK_STRIKES - 1) × windowMs` becomes "the first strike lands ≥ one live window after
  B's window opened". "Exactly four AutoPass strikes", "A never struck" and "side A wins" stay.
- `client/e2e/stdb.ts` gains `ownerCall(reducer, args, label)` beside `ownerSql`. It is
  charset-checked the same way (a reducer name matching `^dev_[a-z_]+$`, decimal arguments only)
  and runs `spacetime call -s <server> <db>` without a shell. No other e2e helper calls a reducer
  from the CLI today (grep `'call'` over `client/e2e/`: none).
- `privacy_enforcement_tests.rs` also pins `EXPECTED_MODULES`, the crate-root module list in
  declaration order: `"dev_clock"` joins it last.
- `.cargo/mutants.toml` (declared, not widened: it is test-runner config). The nightly server
  mutation run builds without `dev_reducers`, so the new reducer's mutants survive vacuously, as
  entry 8 records for `grant_bait`. Each surviving mutant gets an `exclude_re` key by file,
  function, operator and column, and entry 8's comment names the reducer and the
  `--features dev_reducers` test that kills it for real.
- No bindings, schema baseline or CI workflow changes. The e2e jobs already build and publish the
  dev wasm.

The `docs/DECISIONS.md` entry records the rule: an e2e may expire a tactical window through the
dev-only reducer; one real-time strike stays in the same test; a dev reducer never reaches the
production module.

- **th-4.1:** WHEN the module owner calls `dev_expire_tactical_window` for an Active PvP tactical battle with side B's window open and `side` 1, THE SERVER SHALL set that window's `deadline_ms` to the call's time and arm a deadline fire at that time, and THE fire at that time SHALL book one AutoPass strike on B exactly as `tactical_deadline_fire` does at a real deadline (`server-module/src/dev_clock_tests.rs`).

- **th-4.2:** WHEN the reducer is called four times across B's successive windows with A acting live in between, THE fourth fire SHALL forfeit B and finish the battle with side A winning (`server-module/src/dev_clock_tests.rs`).

- **th-4.3:** WHEN the reducer is called for an Active wild tactical battle whose player window is open, with `side` 0, THE fire SHALL end the battle in the AutoFlee a real deadline gives (`server-module/src/dev_clock_tests.rs`).

- **th-4.4:** WHEN the caller is not the module owner, or the battle does not exist, is Deploying or Finished, has no open window, or has the other side's window open, THE SERVER SHALL return `Err`, log a structured reject and write no row (`server-module/src/dev_clock_tests.rs`).

- **th-4.5:** WHEN a fire carrying the expired window's original `(unit_id, window_seq)` runs after the expiry, THAT fire SHALL change nothing (`server-module/src/dev_clock_tests.rs`).

- **th-4.6:** THE release wasm built without `dev_reducers` from the slice SHALL be byte-identical to the one built from its base: one checkout path and one target dir, the toolchain `rust-toolchain.toml` pins, `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown`, the base built first, with both sha256 sums recorded in the PR.

- **th-4.7:** WHEN a published module's reducer list holds `dev_expire_tactical_window`, THE release-reducer check SHALL refuse it, as it refuses `grant_bait` (`scripts/verify-release-reducers.test.mjs`).

- **th-4.8:** WHEN B goes AFK in BT15-4-SECRECY-AFK, THE battle SHALL book exactly four AutoPass strikes on B, the first by the real scheduler at least one live window after B's window opened and the other three through `dev_expire_tactical_window`, and SHALL end with side A winning and A never struck (`client/e2e/tactics-pvp.spec.ts`).

- **th-4.9:** THE BT15-4-SECRECY-AFK test SHALL take at most 75 s in its CI shard's `e2e.json` (135.9 s at `0c491981`), read from the PR run's `e2e-timings-*` artifact and recorded in the PR.

### th-1 — root-cause study: the two e2e flakes with no known cause
type: design · tier: hard
category: test-health (study) · severity: MED · size: SMALL
touches: docs/e2e-flakes.md
after: []

The study reproduces each failure first, with a forcing recipe in the style of
ci-fix-20261113T2045: hold or delay the page's timers, throttle the CPU, or replay the shard's
spec order (the rename failure was the shard's first file, straight after load). Only then does
it judge product or test. Probes run in a scratch worktree; only the register is committed. A
product cause is a defect in the game, so its fix is a feature slice with a red-first regression
test, never a widened test bound.

- **th-1.1:** THE register SHALL record, for UIF4B.2 rename (run 43554594387 attempt 1: `[data-testid="rename-input"]` stayed hidden 10 s after `N` in the first window, straight after `page.goto` and `ready`), every forcing attempt tried, each with its runs and failures (k of n), and WHEN one reproduces the CI signature on `master`'s code, the cause it shows and whether the product or the test is wrong.

- **th-1.2:** THE register SHALL record the same for BT12-5-WILD-RECRUIT (run 43362803625 attempt 1: `readOwnMonsters` stayed 3 where 2 was expected after the recruit).

- **th-1.3:** WHEN a forcing attempt reproduces a flake, THE register SHALL name a follow-up `th-` slice (its `touches:`, its forcing regression test, product or test), filed with `mr-gates notes add --followup`; WHEN none does, THE register SHALL say "not reproduced" and file a residual row whose lifting event is the flake's next listing by th-3.

- **th-1.4:** THE register SHALL list every e2e test that failed on attempt 1 and passed on a rerun of the same tree in a CI run between 2026-11-15 and the study's start, found by the method of this spec's Problem table, each mapped to a register entry, an existing row or a named fix.

Build note (th-1): th-1 result for BT12-5-WILD-RECRUIT (run 43362803625): the cause is the test's
loop answering no-recruit before a Recruit pressed on its sixteenth own turn resolves; PR #752
(merged two hours after the run) fixed that copy of the loop, and the study reproduces the signature
by forcing with the failing tree's loop on master's product (7 of 8 runs at the real bound, 0 of 6
with master's loop). recruit.spec.ts R2 holds a second copy of the loop in the unfixed shape: forced
on master, 5 of 12 runs fail Expected 2 Received 3. Follow-up slice th-7 (test, not product): the
weaken-then-recruit loop moves to client/e2e/controls.ts and both specs call it, keeping R2's three
answers and bookkeeping and BT12-5-WILD-RECRUIT's forecast-attack count as arguments; touches
client/e2e/controls.ts, client/e2e/controls.spec.ts, client/e2e/recruit.spec.ts,
client/e2e/tactics-wild.spec.ts; forcing regression test: a fake-page case in controls.spec.ts where
a Recruit pressed on the last allowed own turn resolves after the loop's last iteration and the loop
answers recruited, run red against R2's present shape and green against the waiting shape; after the
move the Recruit-held recipe of docs/e2e-flakes.md entry 2 is run on both specs.

Build note (th-1): th-1 result for UIF4B.2 rename (run 43554594387): not reproduced. The CI call log
is reproduced only by injecting a second document (join held after a reload: 5 of 5; a reload issued
300 ms before the press: 5 of 6); 81 runs of shard-order replay, one-core, CPU-throttle and
timer-hold recipes gave 0. The client drops an accelerator without a word while identity is empty
(before join), and nothing found replaces the document ready() saw. The residual row lifts at the
test's next rerun listing; a failed shard has kept its traces since commit 0e7a089d, so that
occurrence is decidable.

Build note (th-1): th-1.4 census (runs created 2026-11-15T00:00Z to 11:56Z): 27 runs, none rerun, so
no test passed only on a rerun. One e2e test failed once with no rerun on code that was green on
another run: zone-scope.spec.ts A walks to the warp (run 43690080900, PR #791, shard 5),
ANTI-VACUITY frames were sampled on both sides of the warp, Expected > 0 Received 0. It is new to
the Problem table, is register entry 3, and is not studied; its residual row lifts at its next rerun
listing or when the kept trace is read.

Build note (th-1): For the th-7 planner, two things the th-1 lenses found. (1) The loop's steps
(openMenu, recruitByButtons, waitOwnTurnOrEnd) read the tactical shell's DOM as well as __mrTactics
and __game, so the controls.spec.ts regression case either fakes that much of the shell or drives
the loop through its steps passed as arguments; the loop also needs its own-turn bound as an
argument. (2) An unmeasured neighbour of the same shape: fightToOutcome (client/e2e/controls.ts)
re-reads the tactical state right after its last iteration's End Turn and throws 'did not finish
within maxOwnTurns' when the reply that ends the battle lands after that read; its callers treat the
throw as a kiting wild and re-hunt, so the cost is a lost win, not a wrong pass. Read by a reviewer,
not reproduced.

### th-6 — low-end frame times, and the post stack's software-renderer rule
type: design · tier: hard
category: performance (study) · severity: MED · size: SMALL
touches: docs/art/style-guide.md, docs/DECISIONS.md
after: []

The client is measured as players run it: zone 0, the post stack off, the HUD up. Each
measurement is a frame-interval sample of at least 600 frames, taken by a Playwright page through
`requestAnimationFrame` deltas with Chromium's CPU throttling (CDP
`Emulation.setCPUThrottlingRate`). It reports median, p95, and the shares above 16.7 ms and above
33.3 ms. The look-dev scene's per-pass method stays as recorded.

- **th-6.1:** THE record SHALL give frame intervals for the live client (stack off, zone 0, 1280×720, DPR 1) on the host's hardware GL at CPU throttling 1×, 4× and 6× and on SwiftShader at 1× and 4×, each row naming the GL renderer string, the host and the method needed to repeat it; WHEN Chromium on the host reaches no hardware GL, THE record SHALL say so with the renderer string it got, and the hardware rows SHALL join `th-6.3`'s operator measurement.

- **th-6.2:** THE record SHALL read each row against the client-fps SLO (p50 ≥ 55 fps, OBS-25; a median frame interval ≤ 18.2 ms), and a row that misses it SHALL name its largest per-frame cost and a follow-up row or `th-` slice.

- **th-6.3:** THE record SHALL state whether the host exposes an integrated GPU; WHEN it does not, THE integrated-GPU row SHALL be filed as an operator measurement at the Playtest-4 gate with the method, through `mr-gates notes add --followup`.

- **th-6.4:** THE post-stack entry in `docs/DECISIONS.md` SHALL state that a production build that turns the stack on keeps it off on a software rasteriser (SwiftShader, llvmpipe), recognised from the WebGL renderer string, with the 35.1 ms/frame software-GL record as its Why.

## Post-integration verification (the milestone is done when all hold on `master`)

- Full `just ci` green, with `just eval` included: `bindings-drift`, `spacetime-type-snapshot`
  and `client-surface-privacy` unchanged (th-4 adds no production surface).
- The nightly `e2e-serial` job passes with th-4's `tactics-pvp.spec.ts`. It is the one process that
  runs every spec on one database, and with it the dev reducer's calls.
- A CI run on `master` or a PR whose failed e2e shard was rerun and passed shows the test in its
  `e2e` job summary and as an annotation (C1). The first such run after th-3 merges is recorded in
  the th-1 register's PR, or in th-3's PR when th-1 merged first.
- `docs/e2e-flakes.md` holds an entry for every flake that has no merged fix, and each follow-up
  `th-` slice th-1 named is either merged or a tracked row.
- `docs/art/style-guide.md` has the low-end table, and the post-stack decision states the
  software-renderer rule.

## Risks

- **A dev reducer is a production risk if the feature leaks.** A release
  built with `--features dev_reducers` would let the database owner expire any battle's window. The
  release recipes (`just build`, `just publish`) pass no feature. `th-4.6`'s one-time byte identity
  and the unchanged bindings (`bindings-drift`) prove the production module is untouched, and
  `th-4.7` makes the published playtest check (`scripts/verify-release-reducers.mjs`) the standing
  proof. Any later dev reducer carries the same proofs.
- **The AFK e2e now trusts the dev path for three of its four strikes.** The native host's AutoPass
  tests and th-4's first real strike cover the real scheduler. A defect that only shows on the
  second or later real window would be caught by the native-host tests, not the e2e.
- **The studies may find product defects bigger than a slice.** th-1 and th-6 name follow-ups. They
  do not size them, and a follow-up too big for this milestone becomes a row with a target, not
  scope here.
- **The flake table is a five-day window.** The sketch counted 9 red `master` runs in the 300
  before 2026-11-12, all same-tree flakes, but rerun-passed tests on PRs were never counted. th-3
  makes the count continuous from its merge.
- **Census rows for the touched area** are listed under "Census" below.

## Census

`mr-prune census --spec M-test-health.spec.md --ci --record M-test-health` at game `5fdc4712`
(recorded): `duplicates=0`, no `orphans` row in the touched area, so no `pruned-tests:` line and
no `structure.spec.md` section. Two rows name `th-4`'s file:

- `signals server-module/src/privacy_enforcement_tests.rs source-text churn=5 widened=2` and
  `protected-churn … churn=5 token=priv`. The file is the deletion-gate census that reads module
  source as text, and it churns with every new reducer. th-4 adds one name to `EXPECTED_GATED`. It
  does not extend the scanner: a scanner that misses the `cfg`-attributed `mod` line is a measured
  widen of that file only. Replacing the text scan is not this milestone's work.
- The CI line reads `nightly=success reruns-to-green=20`: 20 of the last 300 `master` CI runs
  went green only on a rerun. No record names the tests behind them; th-3 does from its merge on.
