---

## 2026-07-14 — fix-red-master TERMINAL STATE — PR #166 OPEN, local `just ci` EXIT=0

**Branch:** `fix/fix-red-master`, tip `5f3f6e8`, **PR:** https://github.com/mdrewt/monster-realm/pull/166
**ADR:** None needed — deterministic regen, not a new decision; **ADR next-free stays 0107**
**Worktree:** `.claude/worktrees/fix-red-master`

**Root cause:** UTC date rollover. m15a squash-merge landed at 2026-07-13T22:13:26-04:00 = 2026-07-14T02:13Z UTC. `gitDate(schema.rs)` in okf-export.mjs normalises via `new Date(iso).toISOString().slice(0,10)`, so all 59 knowledge-bundle files now generate with `updated: 2026-07-14` vs committed `2026-07-13` → drift.

**Fix:** `just knowledge` regen in a fresh worktree from master. 59 files, each a single `updated:` date line change. No schema or content change.

**Gates:** local full `just ci` EXIT=0 (knowledge-bundle-conformance eval PASS: "committed bundle matches source"). Remote CI running.

**Supervisor owns squash-merge.** After merge, master CI restores to GREEN. ADR-0107 remains free for m15b/m15c.

---

## 2026-07-13T22:23Z — supervisor tick (composite, mr-sup-cowork-20260713T220618Z-809144-19744) — IN PROGRESS

Launching **m15a** (M15 Trading spine part 1: finalize build-time EARS/slice decomposition per M15-trading.spec.md, then trade_offer additive table + reject_if_in_trade escrow guards + game-core atomic-swap rule module; client/evals tail parked as m15b/m15c). ADR-0106 reserved. Structural set touched — runs SOLO. Brief /tmp/mr_pass_m15a.md.

## 2026-07-14T00:14:52Z — supervisor mr-sup-cowork-20260714T000547Z-872891-17932 — IN PROGRESS: m15a-review launched
m15a build run finished (PR #165 open, remote CI+e2e green, EXIT=0 ATTEMPTS=1) but orchestration audit FLAGGED: only planner + plan-stage reviewer subagents — zero tester lens, zero review lenses on the implementation diff. Gating-test audit CLEAN (test diffs are lint-style rewrites; assertions balanced 9/9). Touches-overrun recorded (client UI/e2e/evals beyond declared set — no siblings, no conflict). Per audit rule, merge deferred; launched detached review-pass run m15a-review (tester + reviewer/red-team/auditors/verifier on PR #165 diff, fixes on-branch, stop-flag terminal). Supervisor merges only on MERGE-OK.

## 2026-07-14T02:20:55Z — supervisor tick mr-sup-cowork-20260714T020706Z-966302-25545
IN-PROGRESS: merged m15a PR #165 (c5fddc4, audits clean after review pass MERGE-OK). Master CI went RED post-merge (just eval knowledge DRIFT). Launched fix-red-master run to regenerate bundles and restore green. ADR-0106 index chore-PR deferred until master green.

## 2026-07-14T04:28:00Z — supervisor mr-sup-cowork-20260714T040641Z-1000312-12965 (cowork tick)
IN-PROGRESS: launched m15b (trade client UI) detached via mr-launch.sh, ADR reserved 0107.
Earlier this tick: merged PR #166 fix-red-master (knowledge-bundle date rollover; doc-only, orch-audit exempt) → master 15279c9 CI GREEN; merged chore PR #167 ADR index (0105/0106 rows, next-free 0107) → master 9754b03.

---

## 2026-07-14 — m15b TERMINAL STATE — PR #168 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m15b-trade-client-ui`, **PR:** https://github.com/mdrewt/monster-realm/pull/168
**ADR:** 0107 at `docs/adr/0107-m15b-trade-client-ui.md` — reserved from m15a
**Worktree:** `.claude/worktrees/m15b`

**Built (m15b — trade client UI spine):**
- `client/src/ui/tradeModel.ts` — pure `buildTradeViewModel` function; 4-state action table; mySide/theirSide orientation
- `client/src/ui/tradeView.ts` — DOM shell (`TradeView` class, KeyU toggle, double-spend `#pending` lock, `TradeCallbacks → Promise<void>`)
- `client/src/ui/tradeModel.test.ts` — 44 Vitest tests (all 4 action states, bigint, fast-check, identity filtering)
- `client/src/net/store.ts` — `StoreMonsterCard`, `StoreTradeItem`, `StoreTradeOffer` types + 4 methods + `reset()` clear
- `client/src/net/rowConvert.ts` — `SdkTradeOfferRow` + `tradeOfferRowToStore`
- `client/src/net/connection.ts` — `trade_offer` table insert/update/delete wiring + `SELECT * FROM trade_offer` subscription
- `client/src/main.ts` — KeyU handler, 4 reducer callbacks, batch listener, reconnect reset, frame-loop guard, mutual exclusivity (KeyB/KeyI/KeyE)
- `client/index.html` — `#trade-overlay` DOM block

**Gates:** local full `just ci` EXIT=0 (1142 Rust + 897 JS tests, all evals pass).

**Supervisor notes:** ADR-0107 design decisions in place; m15c (integrate evals/e2e tail) PARKED.
**ADR next-free:** 0108

## 2026-07-14T06:18Z — supervisor tick mr-sup-cowork-20260714T060532Z-1044076-8218

**m15b MERGED.** PR #168 squash-merged at 06:07:55Z → master a20507a; full CI green. ADR-0107 landed;
index reconciled via doc-only chore PR #169 (next-free → 0108; `--auto` rejected on clean status, merged
manually per 2026-07-04 fallback; its doc-only CI was in_progress at tick end). Audits clean: orchestration
(Sonnet, planner/tester/reviewer/red-team/doc-keeper subagents) + gating-test (no skips/deletions/removed
assertions in diff). Known touches-overrun recurred (diff included connection.ts, rowConvert.*, index.html,
vite.config.ts beyond declared set) — harmless serial, follow-up stays queued. m15b worktree + branches removed.

**Composite launch: m15c** (trade evals tail — `evals/trade-*.eval.mjs` + integration/e2e per
M15-trading.spec.md §5; final M15 slice). ADR-0108 reserved. Serial (no fan-out). Brief /tmp/mr_pass_m15c.md.

---

## 2026-07-14 — m15c TERMINAL STATE — PR #170 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m15c-trade-evals-e2e`, tip `4768305`, **PR:** https://github.com/mdrewt/monster-realm/pull/170
**ADR:** 0108 at `docs/adr/0108-m15c-trade-evals.md`
**Worktree:** `.claude/worktrees/m15c`

**Built (m15c — trade evals tail):**
- `evals/trade-reducer-security.eval.mjs` — 12 criteria (TR-19 no-genes, TR-18 disconnect, TR-13..17 role+status+reread+delete, cancel party-check, trade_offer public)
- `evals/trade-escrow-guards.eval.mjs` — 11 guard sites (TR-2..TR-12, fuse≥2, start_battle≥2)
- `evals/trade-conservation.eval.mjs` — TR-16 dual-write + item consume+grant + currency spend+grant + row deletion
- `client/e2e/trade.spec.ts` — DOM wiring, KeyU/Escape, "No active trade", mutual exclusivity (waitForFunction on box DOM state)

**Hardening delivered (reviewer + red-team):**
- RT-SEC-01: `hasCancelPartyCheck` requires `if`-gated expression (rejects log-macro bypass)
- RT-SEC-02: `bodyHasGuard` counts `guard + '('` call sites only (rejects string-literal bypass)
- `start_battle` minCount raised 1→2 (party + opponent loop coverage)

**Gates:** local full `just ci` EXIT=0 (all 48 evals PASS). Remote CI running.

**Supervisor owns squash-merge.** ADR-0108 complete; M15 Trading CLOSED (m15a + m15b + m15c).
**ADR next-free:** 0109

## 2026-07-14T08:29Z — supervisor tick mr-sup-cowork-20260714T080541Z-1080981-28883

**m15c MERGED.** PR #170 squash-merged at 08:12:32Z → master 3424c5c; full CI (ci + e2e) green.
**M15 Trading CLOSED** (m15a #165 + m15b #168 + m15c #170). ADR-0108 landed. ADR index reconciled via
doc-only chore PR #171 (adds missing 0107 AND 0108 rows, next-free → 0109, range line → 0035–0108;
`--auto` squash armed successfully, CI was pending at tick end — verify merged next tick).
Audits: orchestration CLEAN-test-artifact (Sonnet; planner/reviewer/red-team; no tester-role but
test-artifact carve-out satisfied — adversarial proof-of-teeth eval runs in-log, e2e tests/expects
unchanged RED→tip at 6/20, remote CI green). Gating-test audit CLEAN (no skips/only/ignore; RED→tip
deletions were e2e helper refactor only). m15c worktree + branch removed; old merged chore branches
(m12b/m14b/m14c-adr-index) deleted. Cost $11.89, attempts 1. Strays left untouched: .claire/, docs/memory-cards/.

**Composite launch: m16a** (M16 PvP spine per M16-pvp.spec.md — shared battle row, both-submit secret
picks, turn-deadline + forfeit-on-disconnect; game-core rules + server-module reducers; client ‖ evals
tail deferred to m16b/m16c per the spec's serial-spine note). ADR-0109 reserved. Serial (schema =
structural set; no fan-out). Brief /tmp/mr_pass_m16a.md.

---

## 2026-07-14 — m16a TERMINAL STATE — PR #172 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m16a-pvp-spine`, tip `a514775`, **PR:** https://github.com/mdrewt/monster-realm/pull/172
**ADR:** 0109 at `docs/adr/0109-m16a-pvp-spine.md`
**Worktree:** `.claude/worktrees/m16a`

**Built (m16a — PvP battle spine):**
- `game-core/src/combat/pvp.rs` — `PvpAction` enum (Attack/Swap), `pvp_forfeit_outcome`, `pvp_deadline_forfeit_side` (pure, deterministic, with inline tests)
- `server-module/src/pvp.rs` — Full PvP domain module (~570 LOC): `challenge_pvp`, `accept_challenge`, `decline_challenge`, `cancel_challenge`, `submit_pvp_action` (inline resolve), `pvp_deadline_reaper` (scheduler-only guard), `forfeit_on_disconnect`, `cancel_challenges_on_disconnect`, `start_pvp_battle` (internal, bypasses ADR-0048 guard), `resolve_pvp_turn_if_ready`, `write_back_party_hp_pvp_side_b`
- `server-module/src/pvp_tests.rs` — 10 source-guard tests (EA-PVP-01..10): battle_action not public, scheduler guard, baseline completeness, on_disconnect hooks, constant value, inline-resolve wire-up
- `server-module/src/schema.rs` — `ChallengeStatus` SpacetimeType enum + `BattleChallenge` (public) + `BattleAction` (private) tables; `Battle.opponent_identity` btree index added
- `server-module/src/guards.rs` — `require_pvp_participant(ctx, reducer, &battle) -> Result<SideId, String>`
- `server-module/src/lib.rs` — `mod pvp` declared + two `on_disconnect` hooks
- `evals/baselines/table-schemas.json` — 3 new tables (battle_challenge, battle_action, pvp_deadline_schedule)
- `evals/baselines/spacetime-types.json` — 2 new types (ChallengeStatus, PvpAction)
- TypeScript bindings regenerated (5 new files), knowledge bundle refreshed (71 files), ADR-0109 + DIGEST

**Key design invariants (ADR-0109):**
- `battle_action` PRIVATE — must-never-leak (ADR-0015). Clients detect turn resolution via `battle.state.turn_number` increment.
- `start_battle` ADR-0048 guard preserved; PvP via internal `start_pvp_battle`
- Forfeit → existing `SideAWins`/`SideBWins` (no new BattleOutcome variants — BSATN stability)
- Both-submitted resolution inline in same SpacetimeDB transaction
- Challenger-first tie-break at deadline (D5)
- Side-B HP write-back in both forfeit and natural-resolution terminal paths
- `pvp_deadline_reaper` scheduler-only: `ctx.sender != ctx.identity()` guard

**Gates (initial):** local full `just ci` EXIT=0 (238 Rust tests, 912 client tests, all evals PASS). Remote CI green.

**Review-pass (b25a73e + 83087e4):**
- RT-M16-02 CRITICAL FIXED: `is_practice = opponent_identity != WILD_IDENTITY` → `player_identity == opponent_identity`
- RT-M16-05 HIGH FIXED: `apply_pvp_forfeit` + `resolve_pvp_turn_if_ready` now update battle row BEFORE write-backs (log-and-continue ADR-0077); `Battle` gains `#[derive(Clone)]`
- RT-M16-01 HIGH FIXED: `challenge_pvp` guard 5a: `is_in_ongoing_battle(ctx, target)`
- H-2 FIXED: `challenge_pvp` guard 5b: `has_active_incoming_challenge(ctx, me)`
- RT-M16-06 MEDIUM FIXED: `pvp_deadline_forfeit_side` reads `b_submitted`; test inverted to `assert_ne!`
- M-1 FIXED: `debug_assert!(actions.len() == 2)` in `resolve_pvp_turn_if_ready`
- RT-M16-03 MEDIUM FIXED: `write_back_battle_results` GCs by `opponent_identity` for PvP side-B terminal rows
- 5 new red-team gating tests (RT-M16-01..03, RT-M16-05..06) GREEN
- `just ci` EXIT=0 after fixes (242 Rust tests, 912 client tests)
- ADR-0109 Consequences section updated; knowledge bundle regenerated

**Gates post-review:** local `just ci` EXIT=0 (242 Rust, 912 JS, 48 evals PASS). tip `83087e4`.

**Supervisor owns squash-merge.** m16b (client UI) + m16c (PvP evals) PARKED.
**ADR next-free:** 0110

## 2026-07-14T10:12:17Z — mr-sup-cowork-20260714T100626Z-1158375-18603
REVIEW PASS m16a-pvp COMPLETE — **APPROVE-MERGE**. PR #172 tip `3957a69`. All 5 lenses run (tester/reviewer/red-team/reducer-security-auditor/desync-guard/verifier). Three runs of PvP tests green; two teeth checks confirmed (RT-M16-06 mutation → red; EA-PVP-01 mutation → red; both reverted). `just ci` EXIT=0 (1169 Rust tests, 912 JS tests, 32 evals). Two code fixes pushed (3957a69): RT-M16-08 GC ordering violation (write_back_battle_results called after terminal update → deletes current battle row) + H-3 silent Ok on mismatch. Side-B XP gap documented as deferred (ADR-0109 D10, M17). Verdict memo at memory/projects/monster-realm-m16a-review.md. **Supervisor owns squash-merge.** m16b/m16c PARKED. ADR next-free: 0110.

## 2026-07-14T11:55Z — weekly ninth-review (generate-improvement-plan task) — NEW MILESTONE M16.5 INSERTED

Read-only multi-lens review of master @ `3424c5c` (isolated clone, no worktrees/branches touched; clone
torn down). 7 lenses → blind verification (20/20 verified, 0 dropped). Severity: 0 Critical, 1 High,
7 Medium, 12 Low.

**New milestone: `specs/monster-realm-v2/M16.5-ninth-review-residuals.spec.md`** — inserted between M16
and M17 (PLAN.md Phase C updated). Include it with your git commits. Chain it per your own judgement;
suggested: evals/docs slices (16.5e/16.5g) any time, 16.5a (HIGH — battle↔trade interlock; trade-away-
mid-battle permanently bricks the battler via the write_back_party_hp abort rollback) must rebase onto
merged m16a because the guard must also cover PvP battle rows. Note: docs-chore PR #171 (ADR README
0107/0108 rows + next-free 0109) was still unmerged on master at review time — 16.5g-1 asks to verify
or land it. Full ranked findings in the review tasks
 chat output (severity x ROI ranked, with verified evidence and repro for the High).

---

## 2026-07-14T12:18:38Z — mr-sup-cowork-20260714T120554Z-1223997-28122 (Cowork supervisor tick)

- **m16a MERGED**: review pass m16a-pvp returned APPROVE-MERGE (memo monster-realm-m16a-review.md). PR #172 squash-merged 12:09:23Z -> master 115daab; CI+e2e GREEN. Review pass fixed HIGH RT-M16-08 (GC write-back ordering), H-3, H-1 (3957a69).
- Audits: orchestration FLAGGED->cleared by review pass; gating-test audit CLEAN.
- ADR index reconciled via chore PR #173 (e433dc2): 0109 row added, next free 0110. --auto rejected (clean status); merged manually, doc-only.
- Worktree + feat/m16a-pvp-spine (local+remote) and chore branch cleaned.
- **Nightly RED** (run 29320384291, 09:04Z): mutate-core missed=10 — game-core/src/trading/rules.rs (39,40,42,69,84,220), trading/types.rs (56,89), combat/ability.rs (170). 5 timeouts in tiled_import.rs tolerated iff missed=0 (ADR-0088). Next target: fix-nightly-mutants (test-only slice to kill the 10 missed mutants).

## 2026-07-14 — fix-nightly-mutants TERMINAL STATE — PR #174 OPEN, local `just ci` EXIT=0

**Branch:** `fix/fix-nightly-mutants`, **PR:** https://github.com/mdrewt/monster-realm/pull/174  
**ADR:** None needed — test-only, no new patterns; **ADR next-free stays 0110**  
**Worktree:** `.claude/worktrees/fix-nightly-mutants`

**Summary:** 6 new tests in trading/rules.rs + trading/types.rs; re-pinned ability.rs line drift (169→170); added is_active equivalent-mutant exemption. Kills 6 mutants in declared scope (trading/); nightly mutate-core 10→5 missed. Discovered 3 traps: line-drift brittleness, is_active terminal-state equivalent, eval-guards-count coupling.

**Remaining 5 mutants:** ability.rs (54, 56, 58, 158) + resolve.rs (462) — outside declared scope; next follow-up requires supervisor re-brief.

**Gates:** local full `just ci` EXIT=0. Remote CI running. Supervisor owns merge; build loop stops at PR open pending CI verification.

## 2026-07-14T14:21Z — mr-sup-cowork-20260714T140528Z-1322725-1604 (Cowork supervisor tick)

- **fix-nightly-mutants MERGED**: PR #174 squash-merged 14:10:09Z -> master 35ebe3f; master CI GREEN (CI + e2e). Worktree + local/remote branch cleaned. `.done` EXIT=0 ATTEMPTS=2.
- Audits: orchestration CLEAN (Sonnet-class model; tester/reviewer/red-team/verifier all present). Gating-test audit CLEAN — no removed/skipped tests; 2 equivalent-mutant exclusions documented + line-pinned, integrity eval updated to 3 blessed exclusions.
- Touches overrun (again): `.cargo/mutants.toml` + `evals/mutate-core-recipe-integrity.eval.mjs` undeclared. No in-flight siblings so no collision; merged anyway. Follow-up "tighten brief touches declarations" stays in queue.
- No ADR added; adr_next_free stays 0110. No adr-index chore needed.
- **Nightly still expected RED**: 5 mutants remain outside merged scope — ability.rs (54, 56, 58, 158) + resolve.rs (462). Composite launch: **fix-nightly-mutants-r2** (test-only, game-core combat) targeting those 5.

## 2026-07-14T14:24Z — mr-sup-cowork-20260714T140528Z-1322725-1604 — IN-PROGRESS: launching fix-nightly-mutants-r2
- Composite launch after #174 merge. Test-only: kill remaining 5 mutants (ability.rs 54/56/58/158, resolve.rs 462). ADR 0110 reserved if needed.

## 2026-07-14 — fix-nightly-mutants-r2 TERMINAL STATE — PR #175 OPEN, local `just ci` EXIT=0

**Branch:** `fix/fix-nightly-mutants-r2`, tip `f8e94af`, **PR:** https://github.com/mdrewt/monster-realm/pull/175
**ADR:** None (test-only); **ADR next-free stays 0110**
**Worktree:** `.claude/worktrees/fix-nightly-mutants-r2`

**Key finding:** All 5 mutants the supervisor expected to survive were already caught by existing tests (EARS-21 for ability.rs:56; indirect path via resolve_recruit_failure for resolve.rs:467). Targeted cargo-mutants run showed 0 missed BEFORE any changes. Lines 54, 58, 158 in ability.rs and 462 in resolve.rs do not generate separate cargo-mutants 27.1.0 mutations.

**Gap found:** `resolve_enemy_turn_only_enemy_acts` does NOT assert `!events.is_empty()` — a `vec![]` stub passes vacuously. Added `resolve_enemy_turn_returns_events_for_skilled_enemy` to make the kill direct.

**Reviewer:** No blockers. m-1 (over-long assertion message) applied — shortened to essential claim, rationale stays in doc-comment. m-2 (blank line after `#[test]`) no action required (pre-existing quirk). Verifier PASS (all 5 checks confirmed).

**Evidence:** 60 mutants tested, 54 caught, 6 unviable, 0 missed. `.cargo/mutants.toml` unchanged (3 exclusions). Eval unchanged.

**Supervisor owns squash-merge. Next: M16b (PvP client UI) or M16.5 residuals per PLAN.md.**

## 2026-07-14T16:15Z — supervisor tick mr-sup-cowork-20260714T160530Z-1633022-7030
- **fix-nightly-mutants-r2 MERGED** — PR #175 squash-merged → master 57168cd, CI GREEN.
- Key finding (from run): all 5 brief mutants (ability.rs 54/56/58/158, resolve.rs 462) were already caught by existing tests; run added one direct liveness test for `resolve_enemy_turn` (empty-vec stub previously passed vacuous assertions). Targeted cargo-mutants: 60 mutants, 54 caught, 6 unviable, **0 missed**.
- Audits: orchestration CLEAN (sonnet; tester/reviewer/verifier roles present), gating-test integrity clean (1 test added, 0 removed/skipped). Cost $4.62, 1 attempt.
- Cleanup: worktree + local/remote branch removed; main checkout ff'd to 57168cd. ADR 0110 reserved but unused → adr_next_free stays 110.
- NEXT: verify next nightly shows missed=0; then next unfinished PLAN §9 slice.

## 2026-07-14T16:25:29Z — mr-sup-cowork-20260714T160530Z-1633022-7030 — IN-PROGRESS: launching m16b
- Composite launch after #175 merge. m16b = M16 PvP client UI (deferred tail of merged m16a spine). ADR 0110 reserved if needed. Touches: client/src/** (excl module_bindings) + client/e2e/**. Serial (no siblings).

---

## 2026-07-14 — m16b TERMINAL STATE — PR #176 OPEN, local gates GREEN

**Branch:** `feat/m16b-pvp-client-ui`, tip `ce89707`, **PR:** https://github.com/mdrewt/monster-realm/pull/176
**ADR:** 0110 at `docs/adr/0110-m16b-pvp-client-ui.md`
**Worktree:** `.claude/worktrees/m16b`

**Built (m16b — PvP client UI):**
- `client/src/ui/pvpModel.ts` — pure `buildPvpChallengeViewModel`; incoming/outgoing/challengeablePlayers
- `client/src/ui/pvpView.ts` — DOM shell; `refresh(vm, forceVisible)` auto-show/hide; show/hide/showFeedback
- `client/src/ui/pvpModel.test.ts` — 6 Vitest tests (incoming/outgoing/challengeable/fallback-name)
- `client/src/net/store.ts` — `StoreBattleChallenge` + `#challenges` map + `upsertChallenge`/`removeChallenge`/`allChallenges`/`allPlayers`
- `client/src/net/rowConvert.ts` — `SdkBattleChallengeRow` + `battleChallengeRowToStore`
- `client/src/net/connection.ts` — `battle_challenge` table insert/update/delete + `SELECT * FROM battle_challenge` subscription; comment: `battle_action` MUST NEVER be subscribed
- `client/src/ui/battleModel.ts` — `isPvP` detection, `pvpPendingSubmit`, `pvpOpponentName`, `canFlee: false` in PvP, `battleVMsEqual` extended; `makeBattle()` test fixture updated to `opponentIdentity: 'alice'`
- `client/src/ui/battleView.ts` — `onPvpAttack`/`onPvpSwap` callbacks, pvpStatusEl banner, locked UI when pending, PvP-labeled skill/swap buttons
- `client/src/main.ts` — full wiring: `pvpPendingTurnNumber` tracking, `PvpView` construction, `KeyP` handler (9-way guard), pvpView batch listener (anyOverlayVisible guard), `onReconnect` `pvpView?.hide()`, `new Identity(hex)` for challengePvp target
- `client/index.html` — `#pvp-challenge-overlay` DOM shell
- `client/vite.config.ts` — `pvpView.ts` in coverage.exclude
- `evals/dom-shell-coverage-exclusion.eval.mjs` — `pvpView.ts` in `DOM_SHELLS`
- `docs/adr/0110-m16b-pvp-client-ui.md` — ADR filed; DIGEST regenerated
- `client/e2e/pvp.spec.ts` — 7 DOM/key/mutual-exclusivity tests

**Key design invariants (ADR-0110):**
- `battle_action` PRIVATE — never subscribed (ADR-0015 must-never-leak). Only comments reference it.
- `pvpPendingTurnNumber` set INSIDE `sendGuarded` lambda (frozen-link no permanent lock); `.catch` clears on rejection
- pvpView auto-show gated by `anyOverlayVisible` (no pop-over-battle)
- `isPvP = !isWild && playerIdentity !== opponentIdentity`; canFlee=false in PvP
- Pre-existing m15b KeyQ/KeyH/KeyT `!tradeView?.visible` gaps closed in this slice

**Review-pass fixes:** 1 BLOCKER + 1 WARNING + 2 pre-existing gaps (all closed)
- BLOCKER RT-M16B-01: pvpPendingTurnNumber moved inside lambda + .catch clears on rejection
- WARNING RT-M16B-02: anyOverlayVisible guard on pvpView auto-show
- KeyQ/KeyH/KeyT !tradeView?.visible + KeyT !pvpView?.visible (pre-existing m15b gap)

**Gates:** TypeScript clean, 934/934 tests (34 files), 58 evals PASS. Remote CI pending.

**Supervisor owns squash-merge.** m16c (PvP evals) PARKED.
**ADR next-free:** 0111

## 2026-07-14T18:12:21Z — supervisor tick mr-sup-cowork-20260714T180656Z-1670398-693 — IN PROGRESS
m16b build run finished clean (EXIT=0 ATTEMPTS=1, PR #176 open, remote CI green, mergeStateStatus CLEAN). Pre-merge orchestration audit FLAGGED: zero tester-role invocations (planner/red-team/review-lens only, model sonnet OK). Gating-test audit clean (no removed/skipped tests in diff). Touches-overrun noted again: client/index.html, client/vite.config.ts, evals/dom-shell-coverage-exclusion.eval.mjs outside declared set (no siblings, no collision). Per protocol, launching mandated review pass (slice id m16b-review) on the PR diff with tester+verifier+auditor lenses before merge. Merge deferred to next tick pending VERDICT in memory/projects/monster-realm-m16b-review.md.

## 2026-07-14 — m16b review pass COMPLETE — VERDICT: FIXED (pushed 51e6f5d)

2 defects found and fixed. Branch `feat/m16b-pvp-client-ui` tip advanced `ce89707`→`51e6f5d`.

**Fixes:**
1. **WARNING RT-M16B-R1**: KeyG (shop) guard missing `!tradeView?.visible` — shop could open over active trade overlay. Pre-existing m15b gap; ADR-0110 fixed KeyQ/KeyH/KeyT but missed KeyG. Fixed: added at line 477 in main.ts.
2. **WARNING RT-M16B-R2**: pvpView `forceVisible` preservation bug — `|| (pvpView?.visible ?? false)` branch didn't check `anyOverlayVisible`, so pvpView stayed open over a newly-started battle when player accepted a challenge while pvpView was open. Fixed: `!anyOverlayVisible && (incoming || pvpView.visible)`.

**Lens results:**
- Tester: 934/934, 3× stable; Mutations A+B RED (teeth confirmed); Mutation C GREEN (main.ts orchestration not unit-testable — known gap, e2e only)
- Verifier: 934/934, just ci passes, no skip/only/removed assertions; fixture change `opponentIdentity: 'npc'→'alice'` is a CORRECTION; RT-PVP-DS-01 tests have real bite; pvpModel.test.ts lacks `// Kills:` comments (style gap only)
- Reviewer/red-team: still running at report time — direct pre-agent checks confirmed ADR-0015 clean, pvpPendingTurnNumber-inside-lambda pattern, 9-way KeyP guard complete, anyOverlayVisible covers all overlays

**Gates post-fix (51e6f5d):** 934/934 unit tests, 58/58 evals PASS.

**Second round (6e016bb) — 3 more defects from reviewer/red-team:**
- RT-PVP-01: pvpModel.ts was returning non-Pending outgoing challenges; pvpView.refresh's `hasActive` would auto-show overlay even when anyOverlayVisible=true. Fixed: `&& c.status === 'Pending'` filter + `if (!forceVisible)` in pvpView.refresh. 4 new gating tests.
- Forfeit clear: pvpPendingTurnNumber not cleared when opponent forfeits (apply_pvp_forfeit skips advance_turn). Fixed: `|| outcome !== 'Ongoing'` fallback.

**Final gates (6e016bb):** 938/938 unit tests (934 + 4 new RT-PVP-01), 58/58 evals PASS. Remote CI re-running.

**Supervisor owns merge.** ADR next-free: 0111. m16c (PvP evals) still PARKED.
