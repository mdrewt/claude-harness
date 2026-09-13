# rb-83 plan (v2, post plan-review) — close R-rb-47-CANCELLAUNDER with a cancel-time sweep of gate-refused incoming offers

Slice: rb-83 · repo: project (mdrewt/monster-realm) · worktree `.claude/worktrees/rb-83` (branch rb-83) from origin/master 2941e94 · ADR number **0252** (the supervisor reserved 0251, but `docs/adr/0251-*.md` already exists from rb-81 — next free, disclosed in the PR).
Declared touches: `server-module/src/{accounts,accounts_tests,trading,trading_tests,guards,guards_tests}.rs` + docs companions (`docs/adr/**`, `docs/knowledge/**`, `ARCHITECTURE.md`; CHANGELOG is git-cliff generated). guards.rs / guards_tests.rs are NOT needed by this design and stay untouched.

Revision log: v1 = planner output. v2 folds in the plan reviewer (REJECT on process → resolved by §A.1 below; M1 two-function shape adopted; M2 spec gap → residual + handoff; m1/m2/m3 applied), the plan red-team (Finding 1 CRITICAL measured: the accounts_tests.rs `stripped_for_scan` pipeline strips strings BEFORE comments, so a bare `"` in a `//` comment hides a real statement from every wiring pin → §C uses a comments-then-strings view + a polarity precondition + a named no-rebind clause; timing-oracle residual registered), and /simplify (no closure, no unused return value, `[rb83/table-stranger]` cut, GRACERESTART recorded as by-design in the ADR rather than queued).

## 0. Measured context

- Gate mechanics: `accounts::opened_commitment_is_refused(&Account, opened_at_ms)` (accounts.rs:342-349) = `terminal || (should_reject_for_deletion && match stamp { None => true, Some(req) => opened_at_ms >= req })`; consumer chain `refuses_commitment_opened_at` → `guards::require_commitment_predates_deletion` → `respond_trade` (trading.rs:468). `confirm_trade` has no deletion gate (ADR-0237 D5). An Active account is never gated.
- `cancel_account_deletion` (accounts.rs:906-936): terminal guard → AUTH-38 gate → `.update(cancelled_deletion(account))` (Active, stamp None) → `disarm_deletion_reaper(ctx, me)`.
- The literal deferred mechanism (retain the stamp / bind a re-request to the original deadline) conflicts with M21 AUTH-29 and M22 PRV1-3 (both: cancel SHALL clear `deletion_requested_at_ms`), ADR-0195 D3 (`account_state_is_legal`: Active ⇒ None), the `my_account` view and the PRV1 export bundle; an anchor column is a schema slice outside touches (schema.rs, module_bindings, table-schemas baseline, every `Account{..}` literal in privacy_tests/npc_tests/+4).
- `cancel_trade` (trading.rs:765-783) lets EITHER party delete an active offer and is ungated for a mid-grace caller (ADR-0227 D5), so a deletion-gated D can already destroy the confederate's offer by hand at any time — the sweep automates a decline D already owns; it grants no new capability. Escrow is guard-in-place (ADR-0106 D8): no assets move on a decline.
- The native host aborts the process on any write syscall → cancel cannot be executed to its write; proof = pure seams + refusal/no-write-direction execution + source pins on the wiring.
- `evals/account-e2e.eval.mjs` S9: A proposes as INITIATOR before `deleteAccount`; D never proposes → unchanged by a counterparty-side sweep.
- Baseline default suite at 2941e94: `919 tests run: 919 passed, 0 skipped` (dev_reducers: 920).
- `trade_offer.counterparty` already carries `#[index(btree)]` (schema.rs:663-664) and is used by `erase_trade_offers`/`cancel_trades_on_disconnect` — not a risk.
- `TradeStatus` has exactly two variants and `is_active()` is true for both (game-core/src/trading/types.rs:48-60): the liveness filter is forward-defensive against a future third variant, not live protection today (mirrors `cancel_trades_on_disconnect`).

## A. Design

**Mechanism.** In `cancel_account_deletion`, between the AUTH-38 gate and the status write, decline (delete + `disarm_trade_reaper`) every ACTIVE `trade_offer` naming the caller as **counterparty** whose `created_at_ms` the rb-47 SSOT refuses **for the pre-cancel row** — `opened_commitment_is_refused(&account, created_at_ms)` evaluated BEFORE `cancelled_deletion(account)` moves the row. The stamp still clears; the re-request still restarts the full grace (AUTH-29/PRV1-3 untouched).

**Why it closes the residual.** cancel→accept: the laundering offer no longer exists after cancel (accept → "trade offer not found"). cancel→re-request→accept: same offer already swept at the first cancel. Second confederates / repeated cycles: every cancel sweeps the whole counterparty-side set. Offers created BEFORE the request (Flow A, R-rb-47-PREDATING — wontfix, by design) and offers created AFTER the cancel (plain Active trading) stay completable. `ConfirmedByCounterparty` offers naming D as counterparty necessarily predate the request (the respond gate refused any other accept) and are correctly not swept.

**PRV1-10 / §4.7.** PRV1-10 forbids force-terminating an ALREADY-LIVE commitment at REQUEST time; the sweep runs at CANCEL time on offers created after the request — never live when D entered PendingDeletion, never completable by D. §4.7's "rejects NEW commitments only; does not retroactively void in-flight state" describes the gate; the swept set is exactly what the gate refuses. Cost: C's offer is destroyed without consent and C must re-propose (bounded: TTL 1 h; D could already `cancel_trade` it).

**Scope.** Counterparty column ONLY (`propose_trade` is blanket-gated at trading.rs:252, so D cannot originate a post-request offer; every initiator-side offer predates the request and is PRV1-10-protected). `is_active()` liveness (forward-defensive). Fail-closed arm by delegation: on the illegal stamp-less PendingDeletion shape the SSOT refuses at every stamp → every active incoming offer is swept. On the AUTH-38 no-op path nothing runs (the statement sits behind the gate).

### A.1 Escalation decision (reviewer B1 — recorded here, not off-artifact)
ADR-0237 filed this residual as "spec-change class" because the only closure its author saw was binding a re-request to the ORIGINAL deadline — a change to AUTH-29/PRV1-1/PRV1-3. This slice does NOT make that change. The cancel-time sweep is a bounded hardening fix: inside PRV1-3's letter (its SHALL list is extended, not contradicted — status, stamp, claim pair and reaper row behave exactly as specified), inside PRV1-10 (cancel time, offers never completable by D), no new capability for D (`cancel_trade`, either party, ungated mid-grace), no asset movement, no schema change, in touches. The supervisor's brief authorised exactly this fork ("treat the deferred direction as the target unless the code reveals a real conflict" — it did) and named `mr-ask-drew` for genuine policy calls. Decision: proceed under this documented default AND raise a NON-blocking `mr-ask-drew` decision issue (default = ship the sweep; alternative = wontfix like R-rb-47-PREDATING) so the operator gets the push notification the residual's 4-tick history warrants; the PR body carries the issue link and asks the supervisor to hold the merge if the operator objects. The harness-spec gap (PRV1-3 gains no sibling clause from a project PR) is registered as R-rb-83-SPECPRV13 for the supervisor.

**By design afterwards (ADR text, not queue rows).** Flow A unchanged; Active trading on offers created after the cancel; grace restarts on re-request (binding it to the original deadline is the AUTH-29/PRV1-3 spec change this slice declines to make — after the sweep it buys nothing for this attack).

## B. Seams (reviewer M1: two plain functions, no closure — the `plan_deletion_rearms` / `ensure_deletion_reapers_armed` collect→plan→write idiom)

1. **accounts.rs** — pure planner, after `plan_deletion_rearms` (:447), before the `// --- Context-bound predicates` banner:
```rust
pub(crate) fn plan_declines_at_cancel(account: &Account, offers: &[(u64, i64)]) -> Vec<u64> {
    offers
        .iter()
        .filter(|(_, opened_at_ms)| opened_commitment_is_refused(account, *opened_at_ms))
        .map(|(trade_id, _)| *trade_id)
        .collect()
}
```
   Tuple = `(trade_id, created_at_ms)`; input order preserved; names the SSOT exactly once; never touches `deletion_requested_at_ms`, `unwrap_or`, `now_ms`.
2. **trading.rs** — in the gap between `disarm_trade_reaper` (ends :162) and the `trade_offer_reaper` doc block (:164) — the only placement outside every EA-REAPER-01/02 and `squashed_fn_slice` marker pair:
```rust
pub(crate) fn open_offers_addressed_to(
    ctx: &ReducerContext,
    counterparty: Identity,
) -> Vec<(u64, i64)> {
    ctx.db
        .trade_offer()
        .counterparty()
        .filter(counterparty)
        .filter(|o| o.status.is_active())
        .map(|o| (o.trade_id, o.created_at_ms))
        .collect()
}

pub(crate) fn decline_offers(ctx: &ReducerContext, trade_ids: &[u64]) {
    for &trade_id in trade_ids {
        disarm_trade_reaper(ctx, trade_id);
        ctx.db.trade_offer().trade_id().delete(trade_id);
    }
}
```
   (rustfmt output verified with the workspace's default config.) Names are prefix-free w.r.t. every pinned needle (`require_not_deleting`, `should_reject_for_deletion(`, `is_pending_deletion(`, `erase_trade_offers(`, `cancel_trades_on_disconnect(`, `disarm_trade_reaper(`) and no `m22s3b_nd_*` cascade needle is a substring of them.
3. **One depth-0 statement in the cancel body**, after `needs_cancel_write(` and BEFORE `.update(cancelled_deletion(account))` — exact rustfmt bytes:
```rust
    crate::trading::decline_offers(
        ctx,
        &plan_declines_at_cancel(&account, &crate::trading::open_offers_addressed_to(ctx, me)),
    );
```
   Squashed (whitespace-free) needle: `crate::trading::decline_offers(ctx,&plan_declines_at_cancel(&account,&crate::trading::open_offers_addressed_to(ctx,me)),);` — note the trailing comma rustfmt inserts on the vertical wrap. Final order: JWT → lookup → PRV1-4 guard → AUTH-38 gate → sweep → update → disarm. Every existing clause survives (auth38 order-only; rb24 disarm-after-gate/after-update/no-return-between/depth0/`letme=` once/arm arithmetic; m22s3 guard clauses; no `letaccount`/`letmutaccount` rebind). New comments in accounts.rs/trading.rs must contain NO double-quote character (the strings-before-comments stripper hazard).

Anti-patterns: a second spelling of the stamp comparison outside accounts.rs (reds `rb47_no_reducer_module_reaches_the_stamp_seam_directly` + the guards_tests bypass arrays — never name the seam in trading.rs, comments included); `unwrap_or` on the stamp; a shared account-row helper; gating `confirm_trade`; `ctx.db.account(` in trading.rs; `now_ms(ctx)` in the cancel body; a closure-taking shell; a new reducer; touching the rb-46/rb-79 frozen `propose_trade` prefix.

## C. Tests (ordinary Rust `#[test]`s; ADR-0224) — N = 4 new tests + one extension (the liveness test below was CUT at tests review as a duplicate of `trade_status_is_active_covers_both_variants`; its rationale now sits on that test's doc comment)

accounts_tests.rs:
- **`rb83_cancel_declines_refused_offers_before_the_status_write`** — the headline; REDs at HEAD by ASSERTION (statement count 0 ≠ 1). Uses a SAFE view built inside the test: `squash_ws(&strip_rust_strings(&strip_comments_keep_strings(ACCOUNTS_RS)))` (comments removed string-aware FIRST, then strings blanked) — never the file's `stripped_for_scan` for positional clauses. Clauses: `[rb83/scan-polarity]` precondition — the cancel body extracted from the safe view is byte-identical to the one from `stripped_for_scan` (a bare `"` inside a comment in the body makes the two views diverge; this is the measured red-team payload); `[rb83/sweep-statement]` the squashed statement above exactly once; `[rb83/sweep-depth0]`; `[rb83/sweep-after-gate]` (after `needs_cancel_write(`); `[rb83/sweep-before-write]` (before `.update(cancelled_deletion(account))`); `[rb83/no-account-rebind]` `letaccount` and `letmutaccount` count 0 in the body; `[rb83/no-clock-in-cancel]` `now_ms(` count 0; `[rb83/no-return-between]` no return token between the gate's closing brace and the sweep statement (reuse `rb24_has_return_token`); `[rb83/cancel-prefix-frozen]` the squashed safe-view prefix from body start to the statement equals a hand-derived literal (rb-79 shape).
- **`rb83_plan_declines_at_cancel_truth_table`** — pure: five account shapes (Active; Active+marker illegal; PendingDeletion+stamp; PendingDeletion+None illegal; terminal) × offsets around a NON-ZERO stamp (`-1, 0, +1`, a negative stamp, `i64::MIN`, `i64::MAX`); `[rb83/table-boundary]` at-the-millisecond ⇒ swept; `[rb83/table-multi]` two refused ⇒ both ids; `[rb83/table-order]` input order preserved; `[rb83/table-empty]`; the laundering pair `[rb83/table-laundering]`: the same offers judged against the row vs `cancelled_deletion(row)` ⇒ non-empty then empty (the residual as data — why the read must precede the write).

trading_tests.rs:
- **`rb83_open_offers_addressed_to_reads_only_the_counterparty_column`** — native host: register `trade_offer` keyed on `counterparty` (`fx.table_keyed("trade_offer", "counterparty", |r| r.counterparty)`), seed a stranger's offer, an offer where the caller is INITIATOR, and two where the caller is counterparty (different stamps/statuses) ⇒ returns exactly the two counterparty-side `(trade_id, created_at_ms)` pairs; `fx.requested_indexes()` contains `trade_offer_counterparty_idx_btree`; no write (an abort is the RED). Also `[rb83/decline-empty]`: `decline_offers(&ctx, &[])` returns without touching the host.
- **`rb83_new_seams_are_declared_once_and_frozen`** — via `rb47_stripped`/`rb47_squash`/`rb47_body` over `TRADING_RS` and over `include_str!("accounts.rs")` read locally: WHOLE-BODY EQUALITY on `plan_declines_at_cancel`, `open_offers_addressed_to`, `decline_offers`; declaration counts 1 each; `#[cfg` 1 / `#![cfg` 0 in accounts.rs, guards.rs, trading.rs; the planner names `opened_commitment_is_refused(` exactly once and never `deletion_requested_at_ms`/`unwrap_or`/`now_ms(`; trading.rs never names `opened_commitment_is_refused(`/`refuses_commitment_opened_at(`/`ctx.db.account(`; `open_offers_addressed_to` names `.counterparty()` once and `.initiator()` zero; `decline_offers` names `disarm_trade_reaper(` once, ordered before `.delete(`; no new bare `log::`.
- **`rb83_game_core_liveness_is_total_today`** — `TradeStatus::Pending.is_active() && TradeStatus::ConfirmedByCounterparty.is_active()` with a message stating the filter is forward-defensive (reviewer m1). (Cheap; keeps the vacuity documented in a test rather than a comment.)
- Extend **`ea_reaper_02_disarm_called_at_all_offer_deletion_sites`** with a FIFTH site: `decline_offers` body (marker pair `fn decline_offers(` → `fn trade_offer_reaper(` — verify the actual next fn marker in the file), containment of the disarm needle.

Mutant register (`memory/projects/gates/rb-83.mutants.py` + `rb-83.red-before.md`): M1 statement deleted → `[rb83/sweep-statement]`; M2 moved above the gate → `[rb83/sweep-after-gate]`; M3 moved below the update → INVALID (borrow of moved value; recorded, never KILLED); M4 planner complement (`!opened_commitment_is_refused`) → `[rb83/table-boundary]`+frozen body; M5 `>=`→`>` in the SSOT → rb47 truth table + `[rb83/table-boundary]`; M6 planner first-id-only → `[rb83/table-multi]`; M7 shell `.initiator()` → native-host read test + frozen body; M8 shell stamp replaced by `now_ms(ctx)` → frozen body; M9 planner `unwrap_or(i64::MIN)` re-spelling → frozen body + delegation census; M10 disarm dropped → EA-REAPER-02 fifth site; M11 `#[cfg(test)]` on the statement → `#[cfg` count + `[rb83/sweep-statement]`; M12 early `return Ok(())` above the sweep → `[rb83/cancel-prefix-frozen]` / `[rb83/no-return-between]`; M13 decoy string literal carrying the needle → `[rb83/sweep-statement]` count 0 on the blanked view; M14 `decline_offers` ignores its argument (deletes nothing) → frozen body; M15 hidden same-name rebind behind a `// guard "` comment pair (the red-team payload) → `[rb83/scan-polarity]`; M16 `open_offers_addressed_to` drops the liveness filter → frozen body (documented as forward-defensive). Controls: pristine, a comment naming the statement (quote-free), a rustfmt reflow — GREEN.

## D. Ledger — `memory/projects/gates/rb-83.gates.md` (X1 rb83 count 4 · X2 923 · X3 924 · X4 lint · X5 docs-fresh + ADR/ARCH/touches boundary · X6 `just ci` · X7 MANUAL register · X8 automated M1/M7/M14 rows).

## E. Files, risks, ADR-0252

Touched: accounts.rs, accounts_tests.rs, trading.rs, trading_tests.rs, docs/adr/0252-*.md, docs/adr/0237-*.md (reciprocal `**Extended-by:**` header line + dated amendment discharging the CANCELLAUNDER bullet), docs/adr/DIGEST.md (`just adr-digest`), docs/knowledge/** (`just knowledge` — inserts shift the accounts.rs#L871/906/943/959/990/1029 and trading.rs#L176/224/439/490/765 stamps), ARCHITECTURE.md (one rb-83 paragraph; ADR next-free = 0253).
Risks: the needle must match rustfmt output (pre-computed above; verify after `cargo fmt`); knowledge regen ordering; the e2e S9 leg (confirm in X6); the timing oracle (residual).
Residuals to register after the lenses: R-rb-83-CHALLENGELAUNDER (pvp `accept_challenge` blanket gate — cancel→accept while momentarily Active; 2-min TTL; pvp.rs outside touches), R-rb-83-CANCELORACLE (batch delete at cancel is a sharper timing oracle than TTL death or a per-offer decline), R-rb-83-SPECPRV13 (harness spec PRV1-3 needs a sibling clause naming the sweep — supervisor-owned), R-rb-83-SCANORDER (accounts_tests.rs `stripped_for_scan` strips strings before comments; every pre-existing rb24/m22 wiring pin in that file is blind to a bare `"` in a comment — measured by the plan red-team; the rb-83 clauses carry their own safe view + polarity precondition).
