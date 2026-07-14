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
