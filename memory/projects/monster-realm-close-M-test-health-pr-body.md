## Summary

Closes **M-test-health**: all four slices are merged on the game's `master` — th-3 (#792, `221a1196`), th-4 (#794, `218e6020`), th-1 (#799, `e66239ca`) and th-6 (#802, `a0288900`).

- Folds the ten pending Build notes into the spec (th-1: 4, th-4: 3, th-6: 3; th-3 had none), one commit per slice. `mr-gates notes harvest` passes on the folded spec: `NOTES-HARVESTED M-test-health.spec.md (10 note(s), 7 follow-up row(s))`.
- Deletes `specs/monster-realm-v2/M-test-health.spec.md`. PLAN names no unbuilt scope from it. Every open gap is a residual row: the `th-7` recruit-loop follow-up (R-th-1-RECRUIT-LASTTURN), the rename and zone-scope flakes (R-th-1-RENAME-HIDDEN, R-th-1-ZONESCOPE-FRAMES), the post-stack guard plus the weak-GPU bound and native-driver measurement (R-th-6-POSTSTACK-GUARD), software rasterisers at large canvases (R-th-6-SWRASTER-PIXELS), the e2e dev-publish target (R-th-4-E2E-DEV-PUBLISH-TARGET), and the spec's named deferrals (R-th-spec-POPAGNOSTIC, R-th-spec-FLAKERANK, R-np-a-flake, R-ci-fix-20261101T0505-CTXSTACK-FLOOR). This close files one more, **R-close-M-test-health-NOTEFB9D77** (ux-a11y/LOW, backlog): th-6's integrated-GPU numbers went through WSL2's D3D12 layer, so the iGPU still needs a native-driver measurement and a laptop iGPU needs one too. th-6's note n3 assigned both to R-th-6-POSTSTACK-GUARD, but that row's reason is cut at 400 characters before it names them.
- PLAN §9: removes the M-test-health item and renumbers 1–11. §Built gets a Test health line naming M-test-health, its two game DECISIONS entries, `docs/e2e-flakes.md` and the low-end frame-time record.
- `structure.spec.md`: no section is due. The close record (`$MEM/prune/close/M-test-health.json`) was taken at `a0288900`, which is the game's `origin/master` head and contains all four th- commits. It has 0 rows and `section: null`.
- Deletes the uncited, untracked `$MEM/monster-realm-th-4-plan.md` and `$MEM/monster-realm-th-4-pr-body.md`. No other `monster-realm-th-*` record existed.
- Nothing else cites `M-test-health.spec.md`: not the branch tree, not the `mr-*` tools or the `$MEM` markdown, and not the game's `origin/master`. The handoff log is history. The game's `server-module/src/dev_clock_tests.rs` header names "spec M-test-health §th-4". That is a milestone id, and §Built resolves it.

## Post-integration verification

| Bullet | State | Evidence |
|---|---|---|
| Full `just ci` with `just eval` green | met | CI run 43721451018 on `f81d0bdb` (contains th-3, th-4, th-1): every job passed, including `eval` and `e2e`. th-6's `a0288900` (docs only) also has a green CI run, 43729497734 |
| Nightly `e2e-serial` passes with th-4's `tactics-pvp.spec.ts` | met | Nightly run 43726348382 on `f81d0bdb` (contains `218e6020`): `e2e-serial` succeeded |
| C1: a rerun-passed test is shown in the `e2e` job summary and as an annotation | met; recorded here | Master run 43717305033 (`e66239ca`) failed `e2e-shard (3)` on attempt 1 and passed on attempt 2. That attempt's `e2e` job (check run 132825350387) logged `rerun-passed: client/e2e/tap-to-turn.spec.ts:429 shard 3 failed on attempt 1 passed on attempt 2: … [np-c2.6]` and carries a warning annotation at `client/e2e/tap-to-turn.spec.ts:429`. This was the first rerun after th-3 merged. It ran on th-1's own merge commit, after th-1's PR had merged, so this PR is its record |
| `docs/e2e-flakes.md` holds an entry for every flake with no merged fix; each th- follow-up th-1 named is merged or a tracked row | **partly unmet** → existing row | The register holds entries 1–4. `th-7` is tracked as R-th-1-RECRUIT-LASTTURN. The np-c2.6 tap-to-turn flake that C1 surfaced has no register entry. It is held by its own row, **R-np-c2-tap-turn-flake** (netcode-determinism/MED, target backlog), filed 2026-11-15T13:23Z for the register. The register itself counts a flake with "a row of its own" as known, so no second row is filed. The row's "intended slice" text names this closing register work, and the row stays backlog. Under the drafted register rule, a flake that its own row holds may stay a row until a study takes it, and that study adds the entry |
| `docs/art/style-guide.md` has the low-end table; the post-stack decision states the software-renderer rule | met | `## Low-end frame times` is on `origin/master`. "The world post stack is `pixi-filters`, …" states the SwiftShader/llvmpipe rule (#802) |

## decisions

Present title-keyed on the game's `origin/master` `docs/DECISIONS.md`:
- **First AFK strike stays real-time**: "Dev-only reducers never ship" says "a test that does so keeps one real-time expiry in the same test".
- **dev_expire_tactical_window shape**: that entry gives the window shape (the deadline moves to the call's time, one fire is armed there, and the scheduler expires the window). It also has the module-owner-only caller (the `config` row's `owner_identity`) and the production proofs `FORBIDDEN_REDUCERS` and `bindings-drift`.
- **Frame-record home and the post-stack software-rasteriser rule**: "The world post stack is `pixi-filters`, on the world layer only, planned from injected time" cites `docs/art/style-guide.md` §Post stack and §Low-end frame times and states the rule (amended by #802).

Missing, drafted verbatim below for the supervisor's game doc-only PR:

### New entry (append)

## The e2e job lists the tests that passed only on a rerun; a flake stays in `docs/e2e-flakes.md` until its fix merges

**Decision.** The CI `e2e` job (`scripts/e2e-shard-union.mjs`) judges each shard by its highest
attempt. When that attempt's reports are readable, it also reads every lower attempt of the shard.
A test that is `unexpected` on a lower attempt and `expected` on the highest passed only on a
rerun. The script prints a `rerun-passed:` line and one `::warning` annotation for each such test.
It also appends a table of them to `$GITHUB_STEP_SUMMARY`, or "No e2e test passed only on a
rerun." when there are none, on a failing run too. A lower attempt with no readable `e2e.json`
gets a `rerun-unreadable:` line. The listing changes no verdict: a green highest attempt still
passes the job. Playwright `retries` is unset, so a rerun of failed jobs is the only second
attempt, and a report's `flaky` count stays a failure. The game's `docs/e2e-flakes.md` registers
the e2e flakes whose fix has not merged. Each entry gives the test, the runs, the signature, every
forcing recipe tried with its counts, the verdict (product or test) and the next step. The change
that fixes a flake deletes its entry. A test the listing names that has neither an entry nor a
residual row of its own is a new flake and gets an entry. A flake that its own row holds may stay
a row until a study takes it.

**Why.** Before the listing, a test that failed and then passed on a rerun left no mark on the run.
The only way to find one was to read the attempt-1 jobs of every rerun run by hand. Failing a run
that needed a rerun would instead turn every flake into a red `master` and push reruns into fix
slices. GitHub caps a step's annotations, so the summary table is the complete list. Up to that
cap, the annotations let a later tool count rerun-passed tests per run through the check-runs API
without reading logs. A single register keeps a flake's evidence in one place until a merged fix
makes it history.

**Rules out.** Failing the `e2e` job for a test that passed on a rerun; a flake entry that outlives
its merged fix; a second flake list beside the register.

### Amendment: Dev-only reducers never ship

Insert after "a test that does so keeps one real-time expiry in the same test." in **Decision.**:

`dev_expire_tactical_window` names the side whose window it expires and refuses a call that finds
the other side's window open, so a slow test cannot strike the wrong player. It acts on any Active
tactical battle, wild, PvP or Practice; a wild expiry is the AutoFlee a real deadline gives. It
refuses a Deploying or Finished battle. A change that adds a dev reducer must also:

- call the deletion gate first;
- join the census's `EXPECTED_GATED` (`privacy_enforcement_tests.rs`), and, when it adds a module,
  `EXPECTED_MODULES`. That module's `mod` line carries no `cfg`, because the census refuses every
  `cfg` but `cfg(test)`, so the feature gate goes on the module's items;
- add `exclude_re` keys for its surviving mutants to `.cargo/mutants.toml` entry 8;
- prove the default release wasm byte-identical to its base's: one checkout path and one target
  dir, the pinned toolchain, the base built first, and both sha256 sums in the PR.

A dev caller reaches a private production function through a dev-gated forwarder placed after the
file's last production item (`tactics.rs` `dev_arm_deadline`). It never widens the function itself.

Insert after "One real-time expiry per test keeps the real scheduler covered by the two-browser flow." in **Why.**:

Widening `arm_deadline` to `pub(crate)` pushes its signature past rustfmt's width. th-4 (#794)
measured the result: the reflow moves every later line of `tactics.rs`, and with them the panic
locations baked into the release wasm, so the default build changed. With the forwarder, th-4
recorded identical sums for base and slice, and `arm_deadline` stays callable only from
`tactics.rs`.

In **Rules out.**, replace "an e2e that takes every expiry through the dev path." with:

an e2e that takes every expiry through the dev path; a `cfg(feature)` module line; widening a
production function's visibility for a dev caller.

touches-delta: none
boyscout-delta: none
plan-delta:
- Notes were folded through `mr-gates`'s `cmd_notes` with the worktree's spec dir. The CLI hard-codes the main checkout's spec path, and the brief forbids writing there.
- The `structure.spec.md` append is none-due: the close record has 0 rows.

## Acceptance gates

Acceptance: 8/8 met, 0 deferred, 0 unmet — close-M-test-health seed:e3b0c44298fc1c14

comment-scan: CLEAN

Items: none

not-verified:
- The `e2e` job's `$GITHUB_STEP_SUMMARY` table for run 43717305033 was not read: no API returns step summaries. The `rerun-passed:` log line and the annotation were read, and the script writes the table from the same listing.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
