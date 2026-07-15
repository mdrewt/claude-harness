---
name: monster-realm-m16.5f
description: "m16.5f trade SSOT polish — authorize_* delegation gates + 1h TTL reaper + InsufficientCurrency deleted (ADR-0117)"
metadata:
  type: project
---

**ADR-0117** (PR #TBD, branch `feat/m16.5f-trade-ssot-polish`). ADR next-free = 0118.

## What shipped

**D1 — Role+status authorization refactored** (`game-core/src/trading/rules.rs`)
Pure functions `authorize_respond(offer_id, responder_id, responder_status)` and `authorize_confirm(offer_id, confirmer_id, confirmer_status)` — role-first ordering (check role before status) prevents status leaks to non-participants. Shells delegate with `.map_err(log_reject)?` (matches `validate_proposal` pattern). Two privacy-trap variants deleted from `TradeError`: `MonsterNotOwned` (dead code, duplicated `validate_proposal` logic) and `InsufficientCurrency { available }` (would expose counterparty's private `player_wallet` balance via retry probe).

**D2 — Symmetric escrow subtraction** (`server-module/src/trading.rs`)
Both `propose_trade` and `confirm_trade` subtract items + currency for both parties atomically (btree indexes chained). Escrow math provably sums to 0 under ADR-0106 D4; subtraction kept for future auction-house extension where temporary escrow accrual is needed.

**D3 — Privacy documentation** (`docs/adr/0117.md` + inline comments)
`player_wallet` is NOT a world-readable precedent — it is private must-never-leak (distinct from the "world-readable private table" antipattern). Recorded exposure: offered-currency lower-bound leak (binary-probe via trial-and-error proposes; bounded — attacker must burn trades) + propose-error distinguishability accepted as acceptable risk (ADR-0106 M-2 amended). All higher-confidence leaks eliminated.

**D4 — TTL reaper for stale trade offers** (`game-core/src/trading/rules.rs` + `server-module/src/trading.rs`)
`TRADE_OFFER_TTL_MS = 3_600_000` (1 hour, game-core const). Per-offer one-shot scheduled task: `ScheduleAt::Time(created_at_ms + TTL_MS)` fires automatically. `is_offer_stale(created_at_ms)` re-checks at fire time (clock skew + race guard). Scheduled table `trade_offer_reaper_schedule` private, colocated in trading.rs (ADR-0056 exception). At all four offer-deletion sites (cancel, respond accept/reject, confirm) call `disarm_trade_reaper(offer_id)` to remove the one-shot row before deletion (prevents stale tombstone fires). Design: extends PvP precedent — 1-hour rows would accumulate under propose/cancel loops without disarm. SpacetimeDB schedule-tables §Row Lifecycle: fired rows auto-delete AFTER the scheduled reducer runs (no self-delete race).

## Gates evolved

**trade-reducer-security.eval.mjs** — 16 criteria (was 11 in m16.5c)
New delegation-shape checks: statement-terminator `?` scan (every `authorize_*` call must chain with `?`); argument-span field-check (correct `offer.field` inside parens); string-literal strip (no false-positive from log messages). 4 new ea_ source-scan tests; 13 new rules unit tests (authorize calls, symmetric escrow, TTL const, reaper scheduling). Verifier spot-checked 6 mutation kill sites — all produce RED teeth, gaps now guarded.

**30 tables** total (no schema change; trade_offer_reaper_schedule is private scheduled table, no row data serialization surface).

## Key traps & follow-ups

**Delegation-shape gate is brittle to refactors** — If `authorize_respond`/`authorize_confirm` calls move outside the reducer body or lose the `.map_err(log_reject)?` chain, or if the call argument no longer refers to a field inside `offer.`, the eval goes RED. Future PvP/trade refactors MUST maintain: (1) call lives directly in reducer body, (2) statement terminator is `?`, (3) argument is `offer.<field>` or `offer_id`, not computed expressions.

**TTL deadline from ms-floored created_at_ms, not raw micros** — SpacetimeDB stores `i64` timestamps; if code divides by 1000 to floor to ms, the deadline `created_at_ms + TTL_MS` truncates cleanly. Inspect the column type at content sync to catch any future column-type drift that would break the deadline math.

**trade_offer_reaper_schedule is private and in trading.rs** — Per ADR-0056, private scheduled tables are an exception (allowed to live in domain modules). Do not move this table to schema.rs or make it public; it is a transient one-shot-per-offer implementation detail.

**Knowledge-bundle line-number drift** — The `just knowledge` regeneration will stale the bundle if ANY doc-comment line is added/removed in trading.rs (verifier compares byte-exact line counts). Coordinate knowledge regeneration with trading.rs edits, or accept a stale-bundle gate failure until next full knowledge run.

**Why:** M16.5 ninth-review residuals closed; trade SSOT polish hardens the authorization model against future drift.
**How to apply:** When extending the trade system or PvP, use the delegation-shape pattern (authorize_* functions, ? chaining); never expose private balances in error variants; schedule long-lived cleanup via one-shot reaper + disarm at deletion sites.
