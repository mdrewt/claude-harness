# Spec: M-trade-sessions — multi-stage trade sessions

**Status:** elaborated 2026-11-10 against monster-realm `master` @ `efefab5d` (M-stack-ownership
so-2, M-ui-foundation, M-battle-tactics and M-world-art-pass all merged) · 7 slices, head `ts-0a`, closed by the `ts-6` residual sweep ·
**Project:** monster-realm (game-core + server-module + client) · **Source:** operator directive,
`playtest-feedback-2026-10.md` L237–250 · **Decisions:** monster-realm #585 (`pt3-trade-scope`)
ANSWERED 2026-10-24; `memory/projects/decisions/issue-585.answer.md` is the SSOT and is folded
below, not reopened.
Anchors cite files and symbols; line numbers are orientation at `efefab5d` only.

**Feedback items:** pt3-2026-10-080, pt3-2026-10-081, pt3-2026-10-082, pt3-2026-10-083,
pt3-2026-10-084, pt3-2026-10-085, pt3-2026-10-086.
**Absorbs residuals:** R-weekly-review-2026-10-02-F5, R-weekly-review-2026-10-16-F1,
R-ctl-PROXGUARD (map in §Residual map).

## Problem / intent

`monster` is private and exposed only through the owner-scoped `my_monster_pub` view, so a
proposer cannot see the other player's side. The shipped flow — `propose_trade` →
`respond_trade(accepted)` → `confirm_trade` (`server-module/src/trading.rs`) — therefore cannot
work as designed: the client hard-codes an empty ask side (`counterpartyMonsterIds: []`,
`counterpartyItems: []` in `client/src/main.ts` `dispatch`), the wizard's Ask step
(`client/src/ui/tradeProposeModel.ts` `ProposeStep`) is dead, and the reducer still accepts and
validates counterparty asset lists. Those validations are a read oracle on another player's
private wallet and inventory: `propose_trade` returns "counterparty has insufficient currency for
this trade" and "counterparty has insufficient inventory for item N" (R-weekly-review-2026-10-16-F1,
MED), and it accepts counterparty assets the counterparty never offered (R-weekly-review-2026-10-02-F5).

The operator replaces the flow, not the privacy model (feedback L237–243): a player opens a blank
**session** face to face; each side edits only its own offer; each side confirms; any edit clears
every confirmation; the trade executes atomically when every side has confirmed; either side may
cancel until then; executed trades are final. Nobody ever names, probes or lists the other side's
holdings. Offered assets are shown only as server-built snapshot cards of what their owner put in.

## Decisions folded (#585 — answer file is SSOT)

| # | Ruling | Where it lands |
|---|---|---|
| D1 | Monsters, items and currency are tradable on both sides. | `TradeSessionOffer` carries all three (ts-1); the editor offers all three pickers (ts-3, item 085). |
| D2 | No one-sided gifts. Add simple soft-lock checks — "90% of cases with 0 false positives" beats a frustrating 95%. | Empty-side confirm reject + the last-monster guard, nothing cleverer (ts-1 rules, ts-2 enforcement). |
| D3 | Initiation face to face only; Social›Trades is where open sessions are edited, confirmed and cancelled. One active trade per pair of players. | `open_trade_session` + server proximity guard + per-pair cap (ts-2); the world sheet's Trade verb opens a session (ts-3). |
| D4 | A received monster goes to the first open party slot, else Storage; the outgoing monster's slot is freed by the swap. | Pure `arrival_slots` (ts-1), applied at execute (ts-2). Receiver party size is never a reject reason. |
| D5 | Assets lock only once THAT side confirms. | Lock-at-confirm escrow semantics (ts-2); execute re-validates live state (preservation item 2). |

### Elaboration defaults (the loop's call, flagged so the operator can object)

- **E1 — no separate execute reducer.** The confirm that completes the set executes in the same
  reducer call. There is no "everyone confirmed, nobody executed" state to strand.
- **E2 — a session revision.** Every accepted edit advances `revision`; a confirm names the
  revision it reviewed and is rejected when stale. This is what makes "re-confirm the edited
  state they can see" true under concurrent edits.
- **E3 — snapshot drift counts as an edit.** Lock-at-confirm lets an unconfirmed side's monster
  be trained, cared for, evolved, levelled or renamed after it was offered, and the public card
  (`MonsterCard`: species, nickname, level, HP) does not show most of that. So the server also
  keeps a PRIVATE snapshot of each offered monster — its `monster` row with the owner, party slot,
  current HP and the seven bond columns masked (the bond resets on trade anyway) — in a companion
  table with no client read path. A confirm, or the execute, that finds an offered monster's live
  masked row differing from its snapshot refreshes the snapshot and cards, advances the revision
  and clears every confirm instead of confirming; nothing executes on a monster nobody reviewed.
  Current HP is excluded on purpose: it heals for free, and 0 HP auto-cancels.
- **E4 — other-side failures reset, never answer.** At execute, a failure attributable to the
  caller's own side is an `Err` with the specific reason (their own data). A failure attributable
  to the other side clears that side's confirm and returns `Ok` with nothing moved, so the other
  side re-confirms and hears its own reason. The caller learns one bit ("they must re-confirm"),
  which costs the other player a fresh confirm per bit — not a value oracle.
- **E5 — per-player cap.** At most `MAX_OPEN_TRADE_SESSIONS = 4` sessions the caller OPENED
  are active at once. Sessions others opened with the caller never count (or four sockpuppets
  could lock a player out of opening any), and the partner's count is never consulted (that
  would be an oracle). The per-pair cap is the operator's rule; this one is a DoS bound.
- **E9 — a confirmed side cannot edit.** Feedback L240 has a player who confirms "stop making
  changes", and L241 resets others "if the trade offer is changed by a player who has not yet
  confirmed". So `set_trade_offer` rejects a caller whose side is confirmed; cancelling is the
  way out. An edit therefore always comes from an unconfirmed side and clears the other side's
  confirm.

## Scope

**In:** the session protocol and its game-core rules; a private `trade_session` table and the
participant-scoped `my_trade_session` view; five reducers plus the scheduler reaper; escrow guard
widening with lock-at-confirm; auto-cancel at the monster write seam; account-deletion and
disconnect integration; the server proximity guard on `open_trade_session` and `challenge_pvp`;
the client editor frame, one Trades-tab row per session, the incoming banner, the face-to-face
Trade verb; retirement of the propose wizard and the legacy reducers; every trade e2e moved onto
sessions.

**Named deferrals:**

| Deferral | Target |
|---|---|
| Multi-party (>2) sessions. The protocol text says "all participants"; only two ship, and the row shape is two-sided. | backlog (a participants table is the additive extension) |
| Trade history, undo, a completed-vs-cancelled outcome notice for the partner (E8). | backlog |
| Activity-refreshed session TTL (E6). | backlog |
| An explicit "unconfirm" reducer — cancelling unlocks (E9: a confirmed side cannot edit). | backlog |
| A per-pair reopen cooldown against banner griefing. | backlog |
| Deleting the drained legacy path: the `trade_offer` table (non-additive), the stub reducers and their bindings, the drain code, and the game-core propose-era rules that lose their last caller in ts-4 (`validate_proposal`, `authorize_respond`, `authorize_confirm`). | `structure.spec.md` follow-up, sectioned by the supervisor after ts-4 |
| A `sim-harness` `mr_load_driver` load check. Sessions are human-paced and bounded by the per-pair and per-player caps; no reducer here is on a hot path. | backlog |
| The Social IA flatten and the name discriminator. | M-ui-foundation (built) / M-identity-handles |
| M19 friendship/consent machinery. | M19 |

## Design

### Session protocol

```
open_trade_session(partner)              face to face; blank; caller = opener
set_trade_offer(session_id, monster_ids, items, currency)
                                         replaces the CALLER's own side; revision += 1;
                                         clears every confirm
confirm_trade_session(session_id, revision)
                                         own-side validation → set own flag;
                                         all flags set → execute in this call
cancel_trade_session(session_id)         either participant, any time before execute
trade_session_reaper(schedule row)       scheduler-only; TTL
```

`set_trade_offer` takes no argument naming the other side's assets by construction: its asset
arguments are always interpreted as the caller's own. A monster id the caller does not own and a
monster id that does not exist return the same error. A session the caller is not party to and a
session that does not exist return the same "trade session not found".

### Data (ts-1 types, ts-2 table)

```rust
// game-core/src/trading/session.rs — cfg-gated SpacetimeType, like MonsterCard/TradeItem
pub struct TradeSessionOffer {
    pub monster_ids: Vec<u64>,
    pub items: Vec<TradeItem>,
    pub currency: u64,
    pub cards: Vec<MonsterCard>,   // server-built snapshots of monster_ids, same order
}

// server-module/src/schema.rs — PRIVATE (no `public`)
#[spacetimedb::table(accessor = trade_session)]
pub struct TradeSession {
    #[primary_key] #[auto_inc] pub session_id: u64,
    #[index(btree)] pub opener: Identity,
    #[index(btree)] pub partner: Identity,
    pub opener_offer: TradeSessionOffer,
    pub partner_offer: TradeSessionOffer,
    pub opener_confirmed: bool,
    pub partner_confirmed: bool,
    pub revision: u64,
    pub created_at_ms: i64,
}
// view my_trade_session: either participant, the `my_battle` two-arm shape
// (opener arm ∪ partner arm filtered `opener != sender`); takes only the context.
```

A private companion table `trade_session_snapshot` (session id btree, monster id, the masked row
of E3; no view, no client read path) is written with each edit and deleted at every session delete
site. `TradeSessionOffer` is a nested type and is frozen once shipped; an extension is a new
`#[default]` column on `TradeSession`. There is no session status enum: a live row is open; a
terminal row is deleted. Future columns append with `#[default]`; a status union, if one is ever added, is append-only with the client's
literal-union + `satisfies never` arm (the `TradeStatus` discipline in `client/src/ui/tradeModel.ts`).
The reaper schedule table is co-located in `trading_session.rs` (the `TradeOfferReaperSchedule`
precedent).

### Rules (game-core, pure, integer)

`game-core/src/trading/session.rs` (new file; `rules.rs` is already 2895 lines and is not grown):

- `TradeSessionError` — one variant per caller-facing reason; `Display` is the wire string.
- Offer eligibility for the caller's own side: owned, in party, `current_hp >= 1`, in no other
  active session, not in an ongoing battle, not in an active legacy offer (the existing
  `reject_if_monster_locked` read); no duplicate monster id, no duplicate item id, no
  zero quantity, no unknown item id; per-side size caps (`MAX_TRADE_MONSTERS_PER_SIDE` and
  `MAX_TRADE_ITEMS_PER_SIDE`, defined in `game-core/src/trading/rules.rs`; the private
  `trading.rs` twin goes in ts-4 with `propose_trade`, its only user); item qty and currency within
  holdings net of what the caller's OTHER confirmed sessions lock. A side is non-empty when it
  holds a monster, an item of positive quantity or positive currency.
- `apply_edit` — the side replaced, `revision + 1`, both flags cleared.
- `side_check` — the full own-side check, used at confirm for the confirmer and at execute for
  BOTH sides: both sides non-empty (D1/D2); the eligibility rule on live state; holdings netted
  against every other confirmed session; the side's exact post-trade monster count (live owned −
  outgoing + incoming) ≥ 1 (the last-monster guard); the side's own receipt headroom via the
  per-receiver `check_item_headroom` / `check_currency_headroom` (the combined `check_headroom`
  does not say which side failed). `can_confirm` adds the revision comparison.
- `judge_execute(own, other) -> ExecuteVerdict { Execute, RejectCaller(TradeSessionError), ResetOther }` (E4).
- `snapshot_drifted(stored, live)` over the masked row (E3).
- `arrival_slots(occupied_after_outgoing, incoming) -> Vec<u8>` — lowest free party slots in
  ascending order, then `PARTY_SLOT_NONE` (Storage) (D4).
- `pair_has_open_session`, `open_session_count` predicates over plain rows; the constants
  `MAX_OPEN_TRADE_SESSIONS` and `TRADE_SESSION_TTL_MS`; `is_session_stale`.
- `within_interact_range(zone_a, pos_a, zone_b, pos_b)` in `game-core/src/interact.rs`: same zone
  and `in_talk_range` (Manhattan ≤ `TALK_RANGE`, 2). It reuses the NPC rule's range on purpose —
  the server range is a latency margin, not reach ("Interaction target: the tile in front, then
  your own tile").

The swap plan itself reuses the existing `build_swap_plan` and `check_headroom` with
opener ↦ initiator and partner ↦ counterparty; no swap rule is written twice.

### Escrow: lock-at-confirm (D5)

| Guard | Legacy `trade_offer` | Session |
|---|---|---|
| Monster exclusivity (offer a monster twice) | every active offer | every active session, confirmed or not, and every active legacy offer |
| `reject_if_monster_in_trade` call sites (rename, battle entry, care/train, evolve, PvP, tactics) | every active offer | the monster's side is confirmed |
| `escrowed_item_qty` / `escrowed_currency_amount` (sell, use, shop, train costs) | every active offer | the side is confirmed |
| Quality-Time accrual skip in `movement.rs` (no auto-evolve under a snapshot) | every active offer | the side is confirmed (an unconfirmed side's drift is E3's) |
| `set_party_slot` | rejects while escrowed | never rejects; moving the monster to Storage auto-cancels |

ts-0b routes every call site except `set_party_slot` through context wrappers in `guards.rs`, so
ts-2 widens one place; `set_party_slot` keeps its direct legacy-offer check.

### Auto-cancel seam

Every write that can move a monster out of the party or to 0 HP goes through
`monster_mgmt::update_monster_synced` (`set_party_slot`, `battle::write_back_party_hp` incl. the
flee and disconnect-GC paths, the tactical finish, the PvP side-B write-back). The direct
`monster` writes elsewhere (`evolution.rs`, `raising.rs` Quality-Time accrual, `content.rs`
re-derive, the trade apply itself) change neither `party_slot` nor drive HP below 1. The hook
sits after the write in `update_monster_synced` and calls a `trading_session` write half (each
table is written only by its own module): WHEN the written row has `party_slot == PARTY_SLOT_NONE`,
`current_hp == 0` or an owner other than the session side that offered it (the guest-claim
`rekey_monsters` path), every active session listing that monster is deleted (snapshot rows and
reaper disarmed). The executing session deletes its own row before applying
transfers, so the hook never sees it. Battle entry still rejects for a CONFIRMED side's monsters,
so the HP trigger mostly matters for an unconfirmed offer taken into battle; it is a ruling and is
encoded.

### Account deletion and disconnect

- `open_trade_session` and `set_trade_offer` call `require_not_deleting` (an edit is a new
  commitment). `confirm_trade_session` calls `require_commitment_predates_deletion(session.created_at_ms)`
  for a deletion-gated caller (pre-request sessions stay completable, as offers do).
  `cancel_trade_session` is never gated. No reducer checks the PARTNER's deletion state: that
  would be an oracle on a private fact.
- The guest claim (`accounts::rekey_all`) gives sessions `trade_offer`'s disposition in the
  `NOT_REKEYED` roster and deletes the claimer's sessions.
- `accounts::cancel_account_deletion` declines the canceller's post-request incoming sessions via
  the same `plan_declines_at_cancel` policy, through a `trading_session` write half
  (`open_sessions_addressed_to` / `decline_sessions`), so `accounts.rs` never touches the table.
- `accounts::account_deletion_reaper` erases every session naming the owner in either role.
- `lib.rs` `resolve_all_live_interactions` cancels the disconnecting player's sessions (both
  roles) beside `trading::cancel_trades_on_disconnect`.

### Client (ts-3)

- **Open path (so-2 shape, verified at `efefab5d`):** `openFrame(id: FrameId, open: FrameOpen,
  show)` and `openSeated` in `client/src/main.ts`; `FrameId = OverlayId | 'social'`
  (`client/src/ui/contextStack.ts`). The editor takes the roster slot the wizard frees:
  `tradeProposeView` → `tradeSessionView` (GUARD_ONLY), so the exact-16-id roster pins are
  rewritten once, as a rename.
- **Face to face:** `interactModel`'s `trade` action now calls `open_trade_session(target)`; when
  the caller's `my_trade_session` gains that row (or one with that player already exists, D3),
  the editor opens on it.
- **Editor frame:** both sides' cards, items and coins; the caller's own pickers for party
  monsters (the eligibility rules shown, not just enforced), inventory items and coins (D1, item
  085); both confirm marks; Confirm (sends the revision it shows) and Cancel. D-pad navigable end
  to end, no mouse-only element.
- **Social›Trades:** one row per session (item 086), shaped like challenge rows; a row opens the
  editor. `shownTradeOffer`'s single-offer model is deleted.
- **Incoming banner:** a session where the caller is partner and that this client has not opened
  shows the non-modal notice banner (several collapse into one "N trade requests" line) and the world sheet entry — never a frame ("server-owned
  frames"). `noticeModel` reads sessions, not offers.
- New logic lives in new modules (`tradeSessionModel.ts`, `tradeSessionView.ts`,
  `screens/tradeSessionScreen.ts`); `main.ts` receives wiring only. The client-shell plan
  (`docs/refactors/client-shell.md`) lists extractions of `main.ts` regions this slice wires into
  (`notices.ts`, `commands.ts`, `interact.ts`, `devHooks.ts`); none is sectioned yet, so ts-3
  wires into `main.ts` and whichever lands second moves the other's lines (flag below).

## Preservation checklist (BINDING)

Each item is an existing invariant; the decision titles are `docs/DECISIONS.md` headings.

1. **Battle↔trade interlock, both directions** ("Battle lifecycle and PvP"; "Economy: bounded
   balances, headroom before transfer"). `reject_if_in_battle` over both the player and opponent
   indexes runs for the caller's monsters at every `set_trade_offer` (fail early) and for BOTH
   sides at execute (mandatory). The reverse direction — every `reject_if_monster_in_trade` call
   site in battle, PvP, tactics, raising, evolution and monster management — keeps working against
   both sources via the ts-0b wrappers. Proof: ts-0b.1, ts-2.6, ts-2.7.
2. **Netted headroom at execute** ("Economy: bounded balances, headroom before transfer";
   "Reject, don't clamp"). With editable offers the edit-time checks do not bind; the execute-time
   `check_headroom` over post-debit counts (same-item netting, saturating balance netting) is the
   receiver-cap guard. Debits before credits (`SwapPlan::ordered_steps`); one reducer; whole
   rollback on any `Err`. Proof: ts-2.7, ts-2.8.
3. **Status types append-only** ("Schema changes are additive"). No session status enum ships; the
   legacy `TradeStatus` is untouched. Proof: ts-2.12 (the append-only schema and type snapshots).
4. **Reaper disarm pairing and disconnect-cancel.** Every session delete site — cancel, execute,
   auto-cancel, disconnect, deletion decline/erase, per-pair-cap replacement (none: the second
   open is rejected) — disarms its schedule row; the reaper itself is scheduler-only and re-checks
   staleness. Proof: ts-2.10, ts-2.11.
5. **Bond reset on trade** ("Trading resets the bond, not the monster"): `reset_trainer_bond`
   (moved by ts-0a) runs on every transferred monster; essence, IVs and EVs transfer unchanged.
   Proof: ts-2.9.
6. **Escrow is a guard in place, never asset movement** — amended by D5 (lock-at-confirm) and the
   two ruled inversions (party-leave, HP-drop). Proof: ts-2.5, ts-2.6.

## Security surface

- **TS-A4 no-oracle invariant — killing tests (ts-2):**
  `ts2_no_oracle_outcome_independent_of_partner_private_state` runs each of
  `open_trade_session`, `set_trade_offer`, `confirm_trade_session` and `cancel_trade_session`
  twice over fixtures that differ ONLY in the partner's wallet balance, inventory counts,
  un-offered monsters (count, HP, party slots) and account-deletion state, each fixture keeping
  the partner's own side valid, and asserts an identical caller outcome (`Ok` vs `Err`, the exact
  `Err` payload, and the caller's `my_trade_session` projection). The one stated exception is E4's
  bit: when the partner's confirmed side has become invalid, the executing confirm clears the
  partner's mark — `ts2_execute_other_side_failure_resets_not_errors` pins exactly that and that
  the caller's `Err`/`Ok` and payload still do not vary with which partner fact failed.
  `ts2_foreign_and_missing_monster_same_error` asserts a partner-owned id and a nonexistent id
  return byte-identical errors from `set_trade_offer`; `ts2_non_participant_same_as_missing`
  does the same for a foreign versus a nonexistent `session_id`. Each fails against a reducer
  that formats partner state into an error (the mutant the F1 oracle is).
- **Atomic execute — killing tests (ts-2):** `ts2_execute_rechecks_battle_both_sides` inserts an
  `Ongoing` battle row naming an already-confirmed side's monster directly (bypassing the entry
  guard), then the last confirm: nothing moves and that side's confirm is cleared — fails if the
  execute-time `reject_if_in_battle` is removed. `ts2_execute_netted_headroom_same_item_near_cap`
  executes a symmetric same-item swap at 9990/9999 (fails if netting is removed: false reject);
  `ts2_execute_headroom_overflow_moves_nothing` fails if the check is removed (the grant clamps);
  `ts2_execute_apply_failure_rolls_back` drains a confirmed sender's stack under the guards'
  noses and asserts no partial transfer; `ts2_execute_two_sessions_last_monster` confirms two
  sessions that each give away one of a player's two monsters and asserts the second execute
  resets instead of leaving them with none (the execute re-runs the full side check for both
  sides).
- **M25 S1 overlap.** M25 S1 (`blocked:checkpoint-2-ratification`) targets the propose-time
  oracles: SEC-1..6 in `server-module/src/trading_tests.rs` and the cases `1b` and `3b` of
  `client/e2e/trade-zz-negative.spec.ts`, which assert the leak strings as intended behaviour,
  plus `nh_trade_propose_bounds_listed_assets_by_holdings`. This milestone removes the oracle
  structurally: ts-4 stubs `propose_trade` before any read. Those tests are rewritten ONCE, in
  ts-4: the two e2e cases become session no-oracle assertions (identical partner-visible outcome
  across partner states), and the server test is deleted with `ts2_no_oracle_*` as its named
  survivor. M25 S1 then has nothing left to change in those files; its SEC-1..3 are satisfied by
  ts-2's tests, SEC-4/6 by the own-side confirm checks, SEC-5 by lock-at-confirm (an unconfirmed
  side locks nothing). Adjudication basis for rewriting tests that encode the old behaviour: the
  operator's #585 answer and feedback L237–243 retire that flow; the verifier cites them. If the
  operator wants checkpoint-2 ratification to cover the rewrite too, ts-4 waits on it (flag).

## Acceptance — milestone invariants

Each is proven by a named slice criterion; the slice criteria below are what `mr-gates` seeds.

- **TS-A1:** WHEN any participant's offer changes (an edit, or a snapshot drift found at confirm),
  THE SERVER SHALL clear every confirm and advance the revision, and SHALL NOT execute until every
  participant confirms the current revision. → ts-1.2, ts-2.3, ts-2.4.
- **TS-A2:** WHEN the last confirm lands, THE SERVER SHALL execute the swap in that reducer call —
  re-running `reject_if_in_battle` and the netted `check_headroom` for both sides first — so the
  trade happens completely or not at all. → ts-2.7, ts-2.8.
- **TS-A3:** WHEN an offered monster leaves its owner's party or reaches 0 HP, THE SERVER SHALL
  delete every active session listing it, and the partner's client SHALL drop it through its
  scoped subscription. → ts-2.5, ts-3.6.
- **TS-A4:** THE session reducers SHALL accept no argument naming another player's assets and
  SHALL return no error derived from another player's private state (the only signal is E4's
  partner-must-re-confirm bit, which carries no value). → ts-2.2, ts-4.2.
- **TS-A5:** WHILE either side is empty, THE SERVER SHALL reject every confirm; WHEN execution
  would leave a participant with zero monsters, THE SERVER SHALL refuse it. → ts-1.3, ts-2.4.
- **TS-A6:** WHEN a trade executes, each transferred monster's bond SHALL reset and its essence,
  IVs and EVs SHALL transfer unchanged, and it SHALL arrive in the first open party slot, else
  Storage. → ts-1.5, ts-2.9.
- **TS-A7:** THE SERVER SHALL let a player open a session only with a joined player within
  interact range, at most one per pair. → ts-1.6, ts-2.1, ts-5.1.

## Residual map

| Residual | Closing slice | Closing criterion |
|---|---|---|
| R-weekly-review-2026-10-02-F5 (propose accepts counterparty assets) | ts-4 | ts-4.1 |
| R-weekly-review-2026-10-16-F1 (propose error oracle, MED) | ts-4 | ts-4.2 |
| R-ctl-PROXGUARD (server proximity guard on trade and challenge) | ts-5 | ts-5.1 (the trade half is ts-2.1; the residual closes when both halves are in) |

## Cross-slice contracts (each with its post-merge proof)

| Contract | Producer → consumer | Post-merge proof |
|---|---|---|
| `trading_session.rs` swap helpers (`snapshot_cards`, `reset_trainer_bond`, `netted_receiver_stacks`, `apply_swap`) | ts-0a → ts-2, ts-4 | the existing `confirm_trade` suite in `trading_tests.rs` green after ts-0a; `ts2_execute_*` after ts-2 |
| Escrow wrappers in `guards.rs` (`reject_if_monster_locked`, `escrowed_item_qty_of`, `escrowed_currency_of`, `escrowed_monster_ids_of`) | ts-0b → ts-2 | `ts0b_*` wrapper tests; `ts2_lock_at_confirm_*` |
| `game_core::trading` session API + `within_interact_range` | ts-1 → ts-2, ts-5 | `session_tests.rs`, `interact_tests.rs`; the server suites that call them |
| `trade_session` row shape + `my_trade_session` view + the five reducer signatures | ts-2 → ts-3, ts-4 | `just gen` then `bindings-drift` 0; `table-schemas.json` / `spacetime-types.json` / `client-visible-tables.json` / `client-callable-reducers.json` snapshots; `just smoke-republish` |
| `__mrTrade` session functions (`openTradeSession`, `setTradeOffer`, `confirmTradeSession`, `cancelTradeSession`, `mySessions`, `allPlayers`) | ts-3 → ts-4 | `client/e2e/trade-session.spec.ts` (ts-3); the rewritten hook specs (ts-4) |
| Legacy reducer symbols stay callable (stubs) | ts-4 → bindings | `bindings-drift` 0 with no regen in ts-4; `client-callable-reducers.json` unchanged |

## Post-integration verification (the integrated whole, after ts-5)

The trade work is verified here after ts-5; the milestone itself closes only when the ts-6 sweep's
last batch merges (see ts-6a).

- Full `just ci` green on `master`; `just gen` produces no diff (`bindings-drift` 0); `just eval`
  green incl. the schema, type and client-surface snapshots; `just smoke-republish` over a DB that
  holds live `trade_offer` rows and an open `trade_session`.
- `just e2e` green, incl. `trade-session.spec.ts` end to end in two browser contexts: face to face
  open → both edit → an edit clears the other's confirm → both re-confirm → execute; the received
  monster sits in the first open party slot; a cancel; an auto-cancel when the offered monster is
  moved to Storage.
- `just mutate-diff` over the milestone's server and game-core diff: no new missed mutants.
- TS-A1..TS-A7 each traced to a green named test above; no `propose_trade` path reads partner
  state (ts-4.2) and the residual map rows are closed via `mr-gates residuals close`.

## Risks / flags

- **Client-shell extractions (flag for the supervisor).** `docs/refactors/client-shell.md` (st-2,
  built) lists `main.ts` extractions not yet sectioned in `structure.spec.md`; four of them
  (`notices.ts`, `commands.ts`, `interact.ts`, `devHooks.ts`) cover regions ts-3 and ts-4 wire
  into. Sectioning them is the supervisor's job; order them before or after ts-3, not concurrent.
- **Hostile-client window ts-2 → ts-4.** Until ts-4 stubs it, a hostile client can still call
  `propose_trade`, so the F1 oracle stays live exactly as today. It could also list a monster or
  coins that sit in one of its own sessions and let the legacy swap spend them; that voids only its
  own partner's reviewed lock, and the execute's both-sides re-check resets the session — nothing
  is duplicated or lost. No interim interlock code is added for a window ts-4 closes.
- **Banner griefing.** Per-pair and opener-only caps plus the proximity guard bound it; a
  per-pair reopen cooldown is a named deferral.
- **ts-3 is HEAVY.** It is one slice because the editor, the rows, the banner, the i18n catalogs and
  the frame roster share files; splitting it would reopen them serially for no fan-out gain.
- **M25 S1 rewrite adjudication** (above): rewritten once in ts-4 on #585's authority.
- **M25 spec reconciliation (follow-up outside this PR).** `M25-security-audit.spec.md` S1 still
  states SEC-1..6 against `propose_trade`. They stay true until ts-4 merges; when it does, S1
  should be re-pointed at the session tests named in §Security surface. That file is outside this
  spec PR's touches, so the supervisor owns the edit.

## Slices

Order: ts-0a ‖ ts-0b ‖ ts-1 → ts-2 → ts-3 → ts-4 → ts-5 → ts-6a → the 14 fix batches ts-6a wrote,
`ts-6b-1` … `ts-6b-14`, in the order their `after:` lines give: ts-6b-1 alone; then three tracks
side by side — the server batches (ts-6b-2 → ts-6b-3 ‖ ts-6b-6), the `main.ts` client chain (ts-6b-4
→ ts-6b-5 → ts-6b-7) and the list views (ts-6b-8); then ts-6b-9 → ts-6b-10 → ts-6b-11 → ts-6b-12 →
ts-6b-13, which share `main.ts` or the i18n catalogs; then ts-6b-14. The milestone closes on
ts-6b-14, not on ts-5. Concurrency-eligible pairs (the seed trio; batches on different tracks) are
file-disjoint per `mr-disjoint`. Only ts-2 changes structural surfaces (schema, bindings), and it
has no concurrent partner; ts-6b-1 and ts-6b-14 edit comments in `schema.rs`, which `mr-disjoint`
also treats as structural, so each runs alone. Serially ordered slices may reopen a file their
ancestor touched; each such reopen is named in the later slice.

### ts-0a — move the trade swap machinery into `trading_session.rs`
type: refactor · tier: routine
category: trade/structure · severity: MED · size: LIGHT
touches: server-module/src/trading.rs, server-module/src/trading_session.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs
after: []
Feedback items: pt3-2026-10-081

Moves, behaviour unchanged, from `trading.rs` into the new `trading_session.rs` (the module the
feature lands in, per the structure pass): `build_cards` (as `snapshot_cards`),
`reset_trainer_bond`, the netted receiver-stack construction inside `confirm_trade` (as
`netted_receiver_stacks`) and the monster/item/currency apply loop (as `apply_swap`, taking the
plan, the two identities and each transferred monster's destination slot). `confirm_trade` calls
them and passes `PARTY_SLOT_NONE` for every monster, so legacy trades keep arriving in Storage.
`lib.rs` gains `mod trading_session;`. Pins: `privacy_enforcement_tests.rs` reads `lib.rs` and pins
the module list exactly (`EXPECTED_MODULES`) — re-pointed with the new module; `.cargo/mutants.toml`
names none of the moved functions (entry 16 is `propose_trade`, not moved); `trading_tests.rs`
reaches the moved code only through the reducers and is not touched. Covering tests: the
`confirm_trade` suite in `server-module/src/trading_tests.rs` (swap, netting, debits-before-credits,
bond reset, Storage arrival).

- **ts-0a.1:** WHEN the move lands, THE `confirm_trade` behaviour SHALL be unchanged, received
  monsters still arriving in Storage: the existing `server-module/src/trading_tests.rs` suite passes
  unedited (`cargo nextest run -p server-module trading_tests`).
- **ts-0a.2:** THE module census SHALL list `trading_session` and pass, and
  `cargo clippy -p server-module --all-targets -- -D warnings` SHALL pass
  (`cargo nextest run -p server-module privacy_enforcement_tests`).

### ts-0b — one context-wrapper per escrow guard
type: refactor · tier: hard
category: trade/structure · severity: MED · size: MODERATE
touches: server-module/src/guards.rs, server-module/src/guards_tests.rs, server-module/src/monster_mgmt.rs, server-module/src/pvp.rs, server-module/src/raising.rs, server-module/src/tactics.rs, server-module/src/evolution.rs, server-module/src/economy.rs, server-module/src/movement.rs
after: []
Feedback items: pt3-2026-10-082

Interface change, behaviour unchanged: adds `reject_if_monster_locked(ctx, owner, monster_id)`,
`escrowed_item_qty_of(ctx, owner, item_id)`, `escrowed_currency_of(ctx, owner)` and
`escrowed_monster_ids_of(ctx, owner)` in `guards.rs`, each building today's initiator ∪
counterparty `trade_offer` iterator and calling a pure predicate: the three existing ones, plus
`escrowed_monster_ids`, which is `movement.rs`'s inline collect moved into `guards.rs` (the
monster-id case had no predicate to call). Every call site
calls the wrapper instead: `monster_mgmt.rs` `set_nickname` (1), `pvp.rs` (1), `raising.rs`
(4 guard, 3 escrow), `tactics.rs` (4 guard, 1 escrow), `evolution.rs` (1), `economy.rs` (2 escrow)
and `movement.rs`'s Quality-Time accrual skip in `enqueue_move` (it collects the caller's escrowed
party ids so an offered monster cannot auto-evolve under a snapshot), still only inside its
has-a-party arm (hot path). Two sites stay direct on purpose: `set_party_slot` (sessions must never
make it reject, so it keeps a legacy-offer-only check) and `trading.rs`'s four `propose_trade` reads
(stubbed in ts-4). The pure predicates and their tests stay. Pins: no `mutants.toml` entry names a
call site; the one text-reading test over these files (`movement_tests.rs`, over `movement.rs`) does
not read the edited lines.

- **ts-0b.1:** WHEN a monster is in an active `trade_offer`, every reducer that rejected it before
  this slice SHALL still reject it with the same message, proven by the existing
  `monster_mgmt_tests.rs`, `raising_tests.rs`, `tactics_tests.rs`, `evolution_tests.rs`, `pvp_tests.rs`,
  `economy_tests.rs` and `movement_tests.rs` suites passing unedited.
- **ts-0b.2:** EACH wrapper SHALL return what its pure predicate returns over the owner's offers in
  both roles, proven by one `guards_tests.rs` test per wrapper (`ts0b_wrapper_*`) seeding offers as
  initiator and as counterparty (`cargo nextest run -p server-module guards_tests`).

### ts-1 — game-core session rules and `within_interact_range`
type: feature · tier: hard
category: trade/rules · severity: HIGH · size: MODERATE
touches: game-core/src/trading/session.rs, game-core/src/trading/session_tests.rs, game-core/src/trading/mod.rs, game-core/src/trading/rules.rs, game-core/src/interact.rs, game-core/src/interact_tests.rs
after: []
Feedback items: pt3-2026-10-081, pt3-2026-10-082, pt3-2026-10-083, pt3-2026-10-084

Pure, integer, no I/O; types cfg-gated `SpacetimeType` as in `trading/types.rs`; `mod.rs`
re-exports the session API so the server imports `game_core::trading::…` (no `lib.rs` edit).
`rules.rs` gains only `MAX_TRADE_ITEMS_PER_SIDE` (64, the value of today's private server
constant). Not client-predicted, so no wasm export and no parity test.

Build note (ts-1): the session types ship as plain structs. A cfg-gated `SpacetimeType` derive in
`game-core/src` reds `spacetime-type-snapshot` until `evals/baselines/spacetime-types.json` is
regenerated, and that baseline is in ts-2's `touches:`, not ts-1's. ts-2 adds the derive on
`TradeSessionOffer` (and on `MonsterSnapshot` if it stores it nested) with the regen, so it also needs
`game-core/src/trading/session.rs` in its `touches:`. Additions to the function list above:
`check_offer_size`, `reset_confirms` (the edit and drift transition) and `check_session_open`
(self-trade, per-pair and per-opener limits); `TRADE_SESSION_TTL_MS` is 1 h.

- **ts-1.1:** THE eligibility rule SHALL accept an offer side only when every monster is owned by
  the offerer, in the party, has `current_hp >= 1`, is in no other active session and in no ongoing
  battle, no monster id or item id repeats, every item quantity is positive and every item id is
  known, and both per-side caps hold, and SHALL return a distinct `TradeSessionError` for each
  failure (table-driven test per reason).
- **ts-1.2:** WHEN `apply_edit` replaces a side, THE rule SHALL advance the revision by one and
  clear both confirm flags, SHALL refuse an edit from a confirmed side, and `can_confirm` SHALL
  reject a revision other than the current one.
- **ts-1.3:** WHILE either side holds no monster, no positive-quantity item and zero currency,
  `side_check` SHALL reject for both participants, and WHEN a side's live owned-monster count minus
  outgoing plus incoming is zero it SHALL reject with the last-monster reason; a property test SHALL
  show it never rejects a trade that leaves both players at least one monster (zero false positives).
- **ts-1.4:** `judge_execute` SHALL return `RejectCaller` for a failure on the caller's side,
  `ResetOther` for a failure only on the other side and `Execute` otherwise, `side_check` SHALL
  attribute a receipt-headroom failure to the receiving side, and `snapshot_drifted` SHALL ignore
  current HP, owner, party slot and the bond columns and detect a change in any other column.
- **ts-1.5:** `arrival_slots` SHALL assign incoming monsters to the lowest free party slots in
  ascending order after outgoing monsters vacate theirs and the rest to `PARTY_SLOT_NONE`, never
  exceeding `PARTY_SIZE` (property test over random occupancies).
- **ts-1.6:** `within_interact_range` SHALL be true exactly when both positions share a zone and
  are within `TALK_RANGE` Manhattan distance (`interact_tests.rs` boundary cases at 2 and 3 and a
  cross-zone case), and `pair_has_open_session` SHALL match a pair in either orientation.

### ts-2 — server spine: table, view, reducers, lock-at-confirm, auto-cancel
type: feature · tier: hard
category: trade/server-authority · severity: HIGH · size: HEAVY
touches: server-module/src/trading_session.rs, game-core/src/trading/session.rs, server-module/src/trading_session_tests.rs, server-module/src/schema.rs, server-module/src/guards.rs, server-module/src/guards_tests.rs, server-module/src/monster_mgmt.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/lib.rs, server-module/src/lifecycle_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/privacy_enforcement_tests.rs, client/src/module_bindings/*, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, evals/baselines/client-visible-tables.json, evals/baselines/client-callable-reducers.json, docs/DECISIONS.md, ARCHITECTURE.md
after: [ts-0a, ts-0b, ts-1]
Feedback items: pt3-2026-10-080, pt3-2026-10-081, pt3-2026-10-082, pt3-2026-10-083, pt3-2026-10-084

Reopens (serial): `trading_session.rs`, `lib.rs` and `privacy_enforcement_tests.rs` from ts-0a; `guards.rs`, `guards_tests.rs` and `monster_mgmt.rs` from ts-0b. Reducers, the
reaper schedule table and the table write halves live in `trading_session.rs`; `trade_session`,
`trade_session_snapshot` and the view in `schema.rs`, with `DATA_LIFECYCLE_MANIFEST` entries for
both tables and the schedule (`ViaJoin`); the auto-cancel call in `monster_mgmt::update_monster_synced`;
the deletion and claim calls in `accounts.rs` (`NOT_REKEYED` roster in `accounts_tests.rs`).
`trading.rs` is not touched. `privacy.rs` is listed
because the account data export emits the owner's `trade_offer` rows (`rows_trade_offer`) and
must emit their sessions too; `privacy_tests.rs` because its RB107 test reads `accounts.rs` as
text and its export tests enumerate the exported tables; `privacy_enforcement_tests.rs` because
it pins the reducer census (`EXPECTED_GATED`, `EXPECTED_SCHEDULED`, the deletion-check exemptions,
`REDUCER_FLOOR`), which gains the five reducers and the reaper. Every new reducer logs rejects
through `guards::log_reject` with the specific reason and emits one JSON `evt` line on success.
Bindings regenerate only via `just gen`; baselines via the evals' `--write`. Decision entries (doc
set): amend "Table privacy" (`trade_session` and its snapshot private, `my_trade_session`),
"Economy: bounded balances, headroom before transfer" (lock-at-confirm, sessions), "Interaction
target" (the server now enforces range for trades) and "Trading resets the bond" (the execute site).

- **ts-2.1:** WHEN `open_trade_session(partner)` is called, THE SERVER SHALL insert a blank session
  only if the caller is joined, not deletion-gated, the partner is a
  joined other player, both characters (looked up via `p.entity_id`) pass `within_interact_range`,
  no session exists for the pair in either orientation and the caller has opened fewer than
  `MAX_OPEN_TRADE_SESSIONS`; the range check SHALL run after the joined, `require_not_deleting` and
  partner-joined checks and SHALL return one error string for wrong zone, too far and missing
  character (`ts2_open_*` in `trading_session_tests.rs`, with co-located fixtures).
- **ts-2.2:** THE outcome of each session reducer SHALL be identical across fixtures that differ
  only in the partner's wallet, inventory, un-offered monsters and account-deletion state (each
  keeping the partner's side valid), a partner-owned monster id SHALL get the same error as a
  nonexistent one, and a non-participant SHALL get the same error as a nonexistent session
  (`ts2_no_oracle_outcome_independent_of_partner_private_state`,
  `ts2_foreign_and_missing_monster_same_error`, `ts2_non_participant_same_as_missing`).
- **ts-2.3:** WHEN `set_trade_offer` is accepted, THE SERVER SHALL replace only the caller's side,
  rebuild its cards and snapshot rows, advance the revision and clear the other side's confirm, and
  SHALL reject a caller whose side is confirmed, a deletion-gated caller and an offer that fails the ts-1 eligibility rule or the caller's holdings net of
  their other confirmed sessions (`ts2_edit_*`).
- **ts-2.4:** WHEN `confirm_trade_session` names a stale revision or the caller's side fails
  `side_check`, THE SERVER SHALL reject it with the caller's own reason; WHEN an offered monster's
  live masked row differs from its snapshot, THE SERVER SHALL refresh the snapshot and cards,
  advance the revision and clear both confirms without recording the confirm
  (`ts2_confirm_*`, incl. `ts2_confirm_drift_resets` driven by an EV-only change).
- **ts-2.5:** WHEN `update_monster_synced` writes a monster with `party_slot == PARTY_SLOT_NONE`,
  `current_hp == 0` or a new owner, THE SERVER SHALL delete every active session listing it with
  its snapshot rows and reaper row, through `set_party_slot`, the flee write-back, the PvP settle
  write-back of a player who did not disconnect and the guest-claim re-key alike
  (`ts2_auto_cancel_on_box`, `ts2_auto_cancel_on_faint_writeback`,
  `ts2_auto_cancel_on_pvp_settle_writeback`, `ts2_auto_cancel_on_rekey`).
- **ts-2.6:** WHILE a session side is confirmed, THE wrappers SHALL lock its monsters, items and
  currency for every guarded reducer and the Quality-Time skip, WHILE it is unconfirmed they SHALL
  lock nothing except exclusivity, and `set_party_slot` SHALL never reject because of a session
  (`ts2_lock_at_confirm_*` in `guards_tests.rs` and `monster_mgmt_tests.rs`).
- **ts-2.7:** WHEN the last confirm lands, THE SERVER SHALL re-run, for both sides, the snapshot
  comparison, `side_check` (eligibility, netted holdings, the last-monster count) and
  `reject_if_in_battle` over both identities' player and opponent indexes, plus the netted
  `check_headroom`, SHALL reject with the specific reason when the failure is the caller's side and
  SHALL clear the other side's confirm and move nothing when it is the other side's
  (`ts2_execute_rechecks_battle_both_sides`, `ts2_execute_other_side_failure_resets_not_errors`,
  `ts2_execute_two_sessions_last_monster`).
- **ts-2.8:** THE execute SHALL apply debits before credits in one reducer and SHALL leave no
  partial transfer on any failure (`ts2_execute_netted_headroom_same_item_near_cap`,
  `ts2_execute_headroom_overflow_moves_nothing`, `ts2_execute_apply_failure_rolls_back`).
- **ts-2.9:** WHEN a session executes, THE SERVER SHALL delete the session and its snapshot rows
  before applying, reset each transferred monster's bond, keep its essence, IVs and EVs, and place
  it per `arrival_slots` (`ts2_execute_bond_reset_and_arrival`).
- **ts-2.10:** WHEN a player disconnects, THE SERVER SHALL delete every session they are in, in
  either role, and WHEN the reaper fires it SHALL refuse a non-scheduler caller and SHALL delete
  only a stale session (`ts2_disconnect_cancels_sessions` in `lifecycle_tests.rs`, `ts2_reaper_*`).
- **ts-2.11:** WHEN `cancel_account_deletion` runs, THE SERVER SHALL decline the canceller's
  post-request incoming sessions by the `plan_declines_at_cancel` policy, WHEN the deletion reaper
  runs it SHALL erase every session naming the owner, a deletion-gated caller SHALL NOT confirm a
  session created at or after their request (`ts2_deletion_*` in `accounts_tests.rs`), and the
  owner's data export SHALL include every session they are in (`ts2_export_*` in `privacy_tests.rs`).
- **ts-2.12:** THE `trade_session` and `trade_session_snapshot` tables SHALL be private, sessions
  readable only through `my_trade_session` by their two participants and snapshots by no client
  (`privacy_enforcement_tests.rs`), and `just eval` SHALL pass over the regenerated bindings and
  baselines.

Build note (ts-2): eleven criteria are met; ts-2.11 is DEFERRED to ts-6a for its export clause only.
Its three deletion clauses ship and are tested (`ts2_deletion_*`). Making `trade_session` an 18th
exportable table moves `EXPORT_MIN_BUNDLE_ROWS` 17 → 18, and the export reaper's bound tests
(`privacy_tests.rs` rb111, rb115, the m22s4 exporter floor; two `accounts_tests.rs` export rosters) are
sized against 17 — rb111 needs a 256-row window to touch exactly 16 minimum bundles so the 16-stamp
cap binds, and at 18 it touches 15. Re-deriving those bounds is its own change, so `trade_session` is
classified `Erase`, `exportable: false` and `privacy.rs` / `privacy_tests.rs` are untouched.
Other deviations from the text above: the protocol has FOUR client reducers plus the scheduler
reaper (five reducers in all; "five reducers plus the reaper" above is a count slip, E1 has no execute
reducer); the snapshot table stores the 43 `MonsterSnapshot` columns FLAT (the derive lands on
`TradeSessionOffer` only), so a later `monster` column is one more `#[default]` column there;
`apply_swap` also runs the auto-cancel hook, so a legacy `confirm_trade` that moves a session-listed
monster deletes that session; a confirm that finds an offered monster with no snapshot row treats it
as drift; a reaper fire on a not-yet-stale session re-arms its schedule row; the guest claim deletes
the sessions of BOTH identities; every failure after the execute verdict returns one fixed string.
`server-module/src/native_host_tests.rs` (the test host's table and view registry, `lib.rs`'s test
module) is a touches-delta: a new table is invisible to the generated-module tests until registered
there. Accepted and recorded, not changed: E3's drift reset tells a confirming caller that an offered
monster changed in a column the card does not show; inbound sessions per player are uncapped (E5), so
the lock wrappers scan one row per live session naming the owner; `apply_swap` debits one unit per
write (`inventory.rs`); the confirm stamp gate keys on `created_at_ms` although terms can change
after it; `raising.rs` consumes a heal-location cost item without an escrow read (no content has one).
### ts-3 — client: session editor, one row per session, banner, face-to-face open
type: feature · tier: hard
category: trade/client-ux · severity: HIGH · size: HEAVY
touches: client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/ui/tradeSessionModel.ts, client/src/ui/tradeSessionModel.test.ts, client/src/ui/tradeSessionView.ts, client/src/ui/tradeSessionView.test.ts, client/src/ui/screens/tradeSessionScreen.ts, client/src/ui/screens/tradeSessionScreen.test.ts, client/src/ui/tradePropose*.ts, client/src/ui/screens/tradeProposeScreen*.ts, client/src/ui/tradeModel.ts, client/src/ui/tradeModel.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/interactModel.ts, client/src/ui/interactModel.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/battlePolicy.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/screens/index.ts, client/src/ui/screens/index.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/hardcodedStrings.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/resolver.test.ts, client/src/ui/a11yCopy.ts, client/src/ui/overlayA11y.ts, client/src/ui/focusTrap.ts, client/src/ui/focusTrap.test.ts, client/src/ui/menuModel.test.ts, client/src/ui/dialogueView.test.ts, client/src/ui/reachability.test.ts, client/src/ui/screens/requestHost.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/screens/worldScreen.test.ts, client/src/input/router.test.ts, client/src/tactics/deployPanel.ts, client/src/main.ts, client/src/main.*.test.ts, client/e2e/trade-session.spec.ts, client/e2e/trade.spec.ts, client/e2e/trade-propose.spec.ts, client/e2e/respond-request.spec.ts, client/e2e/ui-screens.spec.ts, client/e2e/controls.ts
after: [ts-2]
Feedback items: pt3-2026-10-080, pt3-2026-10-081, pt3-2026-10-082, pt3-2026-10-083, pt3-2026-10-085, pt3-2026-10-086

Strangler: the wizard (`tradePropose*`, its screen adapter, boot test and i18n test) is deleted in
this slice, its `tradePropose.*` keys removed and `trade.*`/`tradeSession.*` keys added en + fr.
Roster pins rewritten once, as the `tradeProposeView` → `tradeSessionView` rename:
`OR-MANIFEST-COMPLETE`, `OR-TIERS-PARTITION`, `OR-ANYVISIBLE-PROBES-EVERY-ID`, `OR-VISIBLEIDS-EXACT`,
`UIF16B.7` (exact 16-id roster), `CTL6B-1-ADAPTERS-TOTAL`, `S10-WIRE-TOTALITY`, `QF1-1-HEADING-ROSTER`,
`QF1-1-SCOPE-NATIVE-ANCHORS`, `PARITY-02` (resolver roster and `main.ts` key list). The same rename
reaches every other file naming the frame id or the legacy trade surface at `efefab5d` (measured by
`git grep`): `a11yCopy.ts`, `overlayA11y.ts`, `focusTrap.ts`, `deployPanel.ts` (a comment citing the
wizard's hide-time precedent), the `main.*.test.ts` boot suites (dispatch, notices, social,
feedback, input, controls, hint bar, reconnect, claim, dialogue), `router.test.ts`,
`menuModel.test.ts`, `dialogueView.test.ts`, `reachability.test.ts`, `catalog.test.ts`,
`resolver.test.ts`, `requestHost.test.ts`, `socialScreen.boot.test.ts`, `worldScreen.test.ts` and
`e2e/ui-screens.spec.ts`. Two references stay true and are not touched: `net/buildInfo.ts`'s
comment naming `__mrTrade` and `net/devLog.test.ts`'s `proposeTrade` sample name (the stub keeps the
binding). `e2e/controls.ts` is touched only to correct `openFaceToFace`'s comment (it says the
helper opens the wizard); its `__mrTrade.allPlayers()` read stays. The legacy
Command kinds (`respondTrade`, `confirmTrade`, `cancelTrade`, `proposeTrade`) are replaced in
`screens/types.ts` and `COMMAND_BATTLE_POLICY`. Legacy client plumbing for `trade_offer`
(`connection.ts` callbacks and subscription, `store.ts` offer functions) stays: the `__mrTrade`
legacy functions still read it until ts-4. `__mrTrade` gains the session functions additively.
e2e: `trade-session.spec.ts` is new (two contexts); `trade-propose.spec.ts` is deleted with
`trade-session.spec.ts` as its survivor; `trade.spec.ts` and `respond-request.spec.ts`
(`CTL13-4-RESPOND-TRADE`) are re-pointed onto sessions; the hook-only legacy specs are untouched
and stay green. CTL13-4 opens its session in range (the server now checks it), then stands apart
to answer from the banner. Face-to-face setup uses `openFaceToFace` from `client/e2e/controls.ts`.

- **ts-3.1:** WHEN the player presses A on a faced player and picks Trade, THE client SHALL call
  `open_trade_session` for that player and open the editor on the resulting session, or on the
  existing session with that player, and SHALL never open a session from a menu
  (`main.dispatch.test.ts`, `trade-session.spec.ts`).
- **ts-3.2:** THE editor SHALL show both sides' cards, items and coins and both confirm marks, SHALL
  offer pickers for the player's own party monsters, items and coins only, and SHALL mark a monster
  the eligibility rule refuses as unavailable with its reason, and WHILE the player's side is
  confirmed it SHALL offer no edit, only Cancel (`tradeSessionModel.test.ts`).
- **ts-3.3:** WHEN the player confirms, THE client SHALL send the revision the editor displays, and
  WHEN the revision changes while the editor is open, THE editor SHALL show both confirm marks
  cleared and an "offer changed" notice (`tradeSessionModel.test.ts`, `trade-session.spec.ts`).
- **ts-3.4:** THE editor, the Trades rows and the banner SHALL be operable end to end with the
  D-pad and A/B buttons, with no mouse-only element (`tradeSessionScreen.test.ts`, `trade-session.spec.ts`).
- **ts-3.5:** THE Social›Trades tab SHALL render one row per session the player is in, each opening
  the editor on that session, and an incoming session this client has not opened SHALL raise the
  non-modal banner (several collapsing into one line) and never a frame (`socialModel.test.ts`, `noticeModel.test.ts`, `respond-request.spec.ts`).
- **ts-3.6:** WHEN a session row leaves `my_trade_session`, THE client SHALL close its editor if
  open, drop its row and show the "trade closed" notice (`tradeSessionModel.test.ts`,
  `trade-session.spec.ts` auto-cancel case).
- **ts-3.7:** EVERY new string SHALL resolve through the typed catalog in en and fr with fr distinct
  from en, and no `tradePropose.*` key SHALL survive (`catalogParity.test.ts` PARITY-01/02/04, FR-04).
- **ts-3.8:** `trade-session.spec.ts` SHALL drive two contexts through open, both edits, an edit
  clearing the other's confirm, both re-confirms and execute, then assert conservation and that
  the received monster sits in the first open party slot, plus one cancel case and one auto-cancel
  case (`just e2e`).

Build note (ts-3): all eight criteria are met. Deviations from the text above, each forced by a file
outside `touches:` and each recorded, not silently taken:
- **The legacy single-offer Trades block stays.** `client/e2e/ui-social.spec.ts` (its page-evaluated
  fixture calls `new TradeView({…})`, `buildTradeViewModel(offers, …)`, `buildSocialVm(null, offers, …)` and
  pins `#trade-status` as the trade cursor row) and `client/e2e/monster-privacy.spec.ts` (13r-e-2 opens
  Social on a legacy `trade_offer` and asserts its cards render) are outside ts-3's `touches:`, so the
  sentence "the hook-only legacy specs are untouched and stay green" and the sentences that delete
  `shownTradeOffer` and replace the legacy Command kinds could not both hold. ts-3 is ADDITIVE on
  Social › Trades: the legacy row and its sheet are unchanged, one session row per session is listed
  after it (`#trade-sessions`), `respondTrade` / `confirmTrade` / `cancelTrade` stay and only
  `proposeTrade` goes with the wizard. Residual `R-ts-3-LEGACYBLOCK` → ts-4, whose `touches:` need those
  two e2e specs plus `socialModel` / `socialScreen` / `tradeModel` / `tradeView` / `screens/types` /
  `battlePolicy` and the catalogs for it.
- **The editor mounts on the wizard's static shell.** `client/index.html` and
  `client/src/indexShell.smoke.test.ts` are outside `touches:`, and the smoke test requires every
  non-constructed overlay's focus anchor to be a static native control of index.html. `TradeSessionView`
  takes `#tradepropose-overlay` as its dialog root, removes the shell's other static children and keeps
  its static `#tradepropose-submit` button as an always-enabled Close control and the registry anchor
  (`QF1-1-SCOPE-NATIVE-ANCHORS` is therefore the pure rename the Strangler paragraph describes). The
  first paint after an open puts focus on the picker listbox. Renaming the static shell is a follow-up.
- **The eligibility marks are a display projection in TypeScript** (`tradeSessionModel.ts`), because
  `client-wasm` is outside `touches:` and exports no session rule; it never gates a send. A wasm export
  of `check_offered_monster` is a follow-up.
- The world request sheet keeps Accept / Decline / View (`worldScreen.ts` is outside `touches:`): for a
  trade session Accept opens its editor and Decline cancels the session.
- `client/src/net/connection.runtime.test.ts` is a touches-delta (it pins the subscription count, now 31).
- Accepted and recorded: every revision change raises the "offer changed" notice, the player's own
  Update included (ts-3.3 as written); one "Trade closed." notice covers execute, cancel and auto-cancel
  (E8); the pickers clamp to raw holdings, not net of the player's other confirmed sessions, and the
  per-side item-line cap is not shown (the server refuses both with its reason).

### ts-4 — retire the legacy propose path; move the hook specs onto sessions
type: feature · tier: hard
category: trade/security-privacy · severity: HIGH · size: MODERATE
touches: server-module/src/trading.rs, server-module/src/trading_tests.rs, server-module/src/tactics_tests.rs, server-module/src/privacy_enforcement_tests.rs, .cargo/mutants.toml, evals/account-e2e.eval.mjs, client/src/main.ts, client/src/main.*.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/e2e/trade-full.spec.ts, client/e2e/trade-interlock.spec.ts, client/e2e/trade-zz-negative.spec.ts, client/e2e/monster-privacy.spec.ts, client/e2e/ui-social.spec.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/tradeModel.ts, client/src/ui/tradeModel.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/battlePolicy.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/hardcodedStrings.ts, docs/DECISIONS.md, ARCHITECTURE.md, game-core/src/combat/battle_core_tests.rs, server-module/src/trading_session.rs, server-module/src/trading_session_tests.rs, client/src/ui/screens/tradeSessionScreen.ts, client/src/ui/screens/tradeSessionScreen.test.ts, client/src/ui/screens/index.test.ts, client/src/ui/reachability.test.ts, client/src/ui/contextStack.test.ts, client/src/ui/noticeModel.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/i18n/catalog.test.ts, client/src/net/connection.runtime.test.ts
after: [ts-3]
Feedback items: pt3-2026-10-080

Reopens (serial): `trading.rs` and `privacy_enforcement_tests.rs` from ts-0a/ts-2;
`main.ts`, the `main.*.test.ts` suites (only where a boot test still reads a legacy hook function)
and the three net files from ts-3. Server: `propose_trade`, `respond_trade` and `confirm_trade`
return one fixed error as their first statement; their bodies, private helpers and the private
`MAX_TRADE_ITEMS_PER_SIDE` twin go; signatures stay (no bindings change). The drain path stays (`trade_offer_reaper`,
`cancel_trade`, `cancel_trades_on_disconnect`, `erase_trade_offers`, `open_offers_addressed_to`,
`decline_offers`). The reducer census in `privacy_enforcement_tests.rs` re-classifies the three
stubs (`respond_trade` leaves the deletion-check exemptions: a stub reads nothing). Test
disposition, listed in the PR's `moved-tests:` table: tests of the three reducers' bodies in
`trading_tests.rs` are deleted, each with its named survivor in `trading_session_tests.rs`
(swap/netting → `ts2_execute_*`, interlock → `ts2_execute_rechecks_battle_both_sides`, bond →
`ts2_execute_bond_reset_and_arrival`, the oracle-strings test
`nh_trade_propose_bounds_listed_assets_by_holdings` → `ts2_no_oracle_*`); `tactics_tests.rs`'s
`propose_trade_refuses_a_party_monster_of_a_deploying_tactical_battle_bt8_4` is re-pointed onto
`set_trade_offer`; drain tests stay. `evals/account-e2e.eval.mjs` `S9-trade-open` (which opens a
legacy offer and counts its reaper rows) moves onto `open_trade_session` + `set_trade_offer`, so it
also proves on a real host that account deletion erases sessions. `.cargo/mutants.toml` entry 16
(`propose_trade` `currency > 0`) is deleted with its comment. Client: the `__mrTrade` legacy
functions and the `trade_offer` subscription, callbacks, store functions and `TradeStatus` row
conversion (`HANDLED_ENUM_VARIANTS` entry, T4-5/T4-6) are removed. e2e: `trade-full.spec.ts`
(conservation), `trade-interlock.spec.ts` (battle↔trade) and `monster-privacy.spec.ts`'s trade-hook
cases move onto the session hook; `trade-zz-negative.spec.ts` cases `1b` and `3b` — the M25 S1
overlap — are rewritten once, as session no-oracle cases (adjudication: #585 + feedback
L237–243). Social › Trades loses the legacy single-offer block ts-3 left in place
(R-ts-3-LEGACYBLOCK): the `trade_offer` row and its sheet, `shownTradeOffer`, `buildTradeViewModel`'s
legacy path, `tradeActions` and the `respondTrade` / `confirmTrade` / `cancelTrade` Command kinds go,
`ui-social.spec.ts`'s page-evaluated fixture moves onto session rows, and their catalog ids go with
them. Two `main.ts` wirings ts-3's verifier mutants survived get one boot test each
(R-ts-3-WIRINGTESTS). Decision entries: "Economy" drops "a trade offer from the client can only request
currency"; "Table privacy" keeps `trade_offer` public with a drain-only note.
A legacy offer present at deploy has no client cancel: the server drain (`cancel_trade`, the TTL,
either party's disconnect, deletion) is its escape. `account-e2e.eval.mjs`'s `S9_VACUITY_ALLOWLIST`
cap goes 7 → 9 for `trade_offer` and `trade_offer_reaper_schedule`, drained tables no reducer writes.

- **ts-4.1:** WHEN `propose_trade`, `respond_trade` or `confirm_trade` is called with any arguments,
  THE SERVER SHALL return the one retired-path error and change no row, whatever offers, wallets
  and inventories exist, so no offer naming another player's assets can be created (closes
  R-weekly-review-2026-10-02-F5; `ts4_legacy_reducers_reject_before_any_read` in `trading_tests.rs`).
- **ts-4.2:** THE caller-visible outcome of every trade reducer SHALL be independent of another
  player's wallet, inventory and monsters (closes R-weekly-review-2026-10-16-F1), proven server-side
  by `ts2_no_oracle_*` and end to end by the rewritten `trade-zz-negative.spec.ts` cases `1b` and
  `3b`, which assert an identical outcome across two partner states.
- **ts-4.3:** THE drain path SHALL keep working: an offer row present at deploy SHALL still be
  cancellable, reaped at its TTL and swept on disconnect and deletion, by the drain tests in
  `trading_tests.rs` passing unedited (`cargo nextest run -p server-module trading_tests trading_session_tests tactics_tests`).
- **ts-4.4:** WHEN a `trade_offer` row exists on the server, THE client store SHALL hold no
  trade-offer state and `__mrTrade` SHALL expose only the session functions and `allPlayers`
  (`connection.test.ts` subscription list, `store.test.ts`, `rowConvert.test.ts`), with
  `bindings-drift` 0 and `just eval` green incl. the moved `S9-trade-open`.
- **ts-4.5:** `trade-full.spec.ts`, `trade-interlock.spec.ts` and `monster-privacy.spec.ts` SHALL
  pass on the session hook, the interlock spec asserting that a confirmed side's monster cannot
  enter battle and an unconfirmed one can (`just e2e`).
- **ts-4.6:** THE Social › Trades screen SHALL list only session rows: no legacy `trade_offer` row,
  sheet or `respondTrade` / `confirmTrade` / `cancelTrade` Command remains, and `ui-social.spec.ts`
  SHALL pass on session rows (closes R-ts-3-LEGACYBLOCK; `socialModel.test.ts`, `tradeView.test.ts`,
  `just e2e`).
- **ts-4.7:** WHEN a monster is on a confirmed session side, THE client SHALL not offer it to a
  challenge or a deploy, and WHEN the identity changes, THE client SHALL clear the opened-session set
  so an incoming session raises its banner (closes R-ts-3-WIRINGTESTS; one boot test each in the
  `main.*.test.ts` suites, each failing with its wiring removed).

### ts-5 — server proximity guard on `challenge_pvp`
type: feature · tier: hard
category: security-privacy · severity: LOW · size: LIGHT
touches: server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/trading_tests.rs, evals/account-e2e.eval.mjs, client/e2e/pvp-full.spec.ts, client/e2e/pvp.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/respond-request.spec.ts, docs/DECISIONS.md
after: [ts-4]
Feedback items: pt3-2026-10-082

Reopens (serial): `pvp.rs` from ts-0b; `trading_tests.rs` and `account-e2e.eval.mjs` from ts-4;
`respond-request.spec.ts` from ts-3. The guard mirrors ts-2.1's placement and uniform error. Every
caller of `challenge_pvp` that may stand out of range is listed: `pvp-full.spec.ts`, `pvp.spec.ts`
and `ranked-forfeit.spec.ts` (no walk-to step — the planner measures whether fresh players share an
in-range spawn and co-locates with `walkTo` from `controls.ts`, unedited, where not);
`respond-request.spec.ts`'s challenge case, which calls `challengePvp` after `standApart` moved the
players 3–6 tiles apart (challenge in range, then stand apart); the control case of
`nh_escrowed_monster_is_refused_by_every_guarded_reducer` in `trading_tests.rs`, which must still
reach `Ok` (co-located fixture); and `account-e2e.eval.mjs` `S9-challenge2-pending`. Decision entry:
"Interaction target" — the server enforces range for challenges too.

- **ts-5.1:** WHEN `challenge_pvp` is called, THE SERVER SHALL reject it unless both characters,
  looked up via `p.entity_id`, pass `within_interact_range`, checked after the joined,
  `require_not_deleting` and target-joined checks, with one error string for wrong zone, too far
  and missing character; with ts-2.1 this closes R-ctl-PROXGUARD
  (`ts5_challenge_*` in `pvp_tests.rs` with co-located and distant fixtures).
- **ts-5.2:** THE existing PvP and challenge callers SHALL pass with their challengers in range
  (`cargo nextest run -p server-module pvp_tests trading_tests`, `just eval`, `just e2e`).

Build note (ts-5): both criteria are met. `pvp-full.spec.ts`, `pvp.spec.ts`, `ranked-forfeit.spec.ts`
and `account-e2e.eval.mjs` are unedited: measured, their challengers stand on the shared zone-0 spawn
tile or walk face to face (`openFaceToFace`), and they pass against the guarded server; only
`respond-request.spec.ts`'s challenge case changed (challenge in range, then stand apart). The cargo
package in ts-5.2's command is `monster-realm-module` (the directory is `server-module`). The range
check sits directly after "target joined and online", before the ranked account gate and every later
guard; its order against the ranked gate is unobservable while that gate is inert
(R-ts-5-RANKEDORDER, backlog). `accept_challenge`, `decline_challenge` and `cancel_challenge` have no
range rule, and a test holds that. The two-character lookup repeats `open_trade_session`'s because
`guards.rs` and `trading_session.rs` are outside `touches:`; one shared `guards.rs` helper is a
follow-up.

### ts-6a — residual sweep, part 1: triage every open residual and section the fix batches
type: design · tier: hard
category: residuals/triage · severity: MED · size: HEAVY
touches: specs/monster-realm-v2/M-trade-sessions.spec.md, specs/monster-realm-v2/residuals.spec.md
after: [ts-5]

Operator directive (2026-11-10, restated 2026-11-11): one sweep over every open residual, closing
the current milestone, with the goal of improving the game overall, not of emptying a list. This
slice is the investigation half. It reads the game repo at `origin/master` (read-only) and writes
only this spec and `residuals.spec.md`.

**Scope.** Every residual open at launch (`mr-gates residuals list --json`, `open[]`), except a row a live,
unbuilt slice of another milestone names as its closing slice. The three rows this milestone's §Residual map
assigns to ts-4/ts-5 are triaged like any other row while they are open.

**Per residual**, in category order (security-privacy and data-integrity first):
1. Read its ledger row (`reason`, `source_slice`, `touches`) and, where it has one, its
   `residuals.spec.md` section.
2. Reproduce or refute against current `master`: find the code it names (symbol, not line), and
   check whether later work (the tactical cutover, M-ui-foundation, M-world-art-pass,
   M-stack-ownership, this milestone) already fixed it or removed the surface. A claim of "fixed"
   names the PR/commit and the test that now covers it. A claim of "obsolete" names the design
   change and the decision entry (game `docs/DECISIONS.md` title) that retired the surface.
3. Assign exactly one verdict:
   - `resolved-fixed`: already fixed; evidence = PR/commit + covering test.
   - `resolved-obsolete`: the surface or premise is gone; evidence = decision title or PR.
   - `fix`: still real and worth fixing; record root cause, the change, the test that will prove it
     (per `standards/testing-tdd.md` — behaviour tests, no source-text scans), and its touches.
   - `wontfix`: real but not worth fixing; record why (cost vs value for the game). Every MED
     `wontfix` carries a one-line player-facing impact statement.
   - `ask`: a fix that would change a recorded decision, a schema in a way that needs operator
     ratification, or a security/privacy trade-off — raise via `mr-ask-drew` and treat as
     `wontfix` until answered (reversible choices take the documented default instead).
4. Re-grade severity/category where the evidence says the ledger is wrong; give the 24
   uncategorised rows a category.

Also dedupe: rows that describe one defect collapse onto one `fix` (the others `resolved-fixed`
by that batch, evidence = the batch id).

**Output (this slice's PR).**
- A `#### Triage table (ts-6a)` subsection under this slice: one row per residual —
  `id | sev | category | verdict | evidence or root cause | batch` — sorted by batch, then id.
- Fix batches appended below as slices `ts-6b-1` … `ts-6b-N` in this spec, each a normal slice
  section (`type: feature` or `type: refactor` · `tier:` per the model-routing rule · category ·
  severity · size · `touches:` · `after:` · the residual ids it closes · one id-led EARS criterion
  per residual (`**ts-6b-K.n:**`) naming its proving test). Batch rules:
  - at most ~10 residuals and one coherent area per batch (a module, a screen, a reducer family),
    so each batch is one reviewable PR of at most MODERATE size;
  - order: security-privacy and data-integrity first, then netcode, gameplay, content, ux-a11y,
    loop-ops; within that, MED before LOW;
  - any batch touching a table, schema, migration or bindings is `tier: hard`, runs alone, and
    says so; batches that are file-disjoint per `mr-disjoint` may share an `after:` so fan-out can
    run them in parallel;
  - the last batch's `after:` names every other batch, and its final criterion is the sweep's
    closing check (below).
- `residuals.spec.md`: sections of rows triaged `resolved-*` or `wontfix` are removed; rows routed
  to a batch point at their batch id.

- **ts-6a.1:** THE triage table SHALL list every residual in scope exactly once, with one of the
  five verdicts, and every `resolved-*` row SHALL carry a PR, commit or decision-title reference
  that resolves in the game repo (the supervisor re-checks a sample of at least ten, including
  every MED, before merge).
- **ts-6a.2:** EVERY `fix` row SHALL be assigned to exactly one `ts-6b-K` batch section, and every
  batch section SHALL carry `touches:`, `after:`, a tier and one EARS criterion per residual.
- **ts-6a.3:** NO residual SHALL be dispositioned by this slice's run; the supervisor applies the
  verdicts at merge (`mr-gates residuals disposition --as fixed|wontfix --reason "<evidence>"`;
  `fixed` cites the PR the evidence names). HIGH/CRITICAL rows, if any appear, go to `mr-ask-drew`.

**At merge (supervisor).** Apply the `resolved-*` and `wontfix` dispositions; `ask` rows go out as
issues; then the fix batches are this milestone's next unbuilt slices. An `ask` the operator answers
with a fix becomes a further `ts-6b-K` section ordered before the last batch, which adds it to its
`after:`; one answered no, or still unanswered when the last batch is ready, closes as `wontfix`
citing its issue.

#### Fix-batch contract (part 2 of the sweep: every `ts-6b-K` inherits this)

The fix loop. ts-6a writes it out as `ts-6b-1` … `ts-6b-N`; the supervisor launches them as the
milestone's next unbuilt slices in order (fan-out where ts-6a marked batches disjoint). This
section is the contract every batch inherits:

- Each residual is fixed test-first: a failing behaviour test that shows the defect, then the
  fix, then the test green (`standards/testing-tdd.md`). Fix the root cause the triage recorded,
  not the symptom; if the investigation shows the triage was wrong, say so in the PR and fix what
  is actually wrong.
- Improve the game, not the ledger: where a residual's best fix is a small redesign of the
  surrounding code (a dead path removed, a duplicated rule given one home), do that within the
  batch's touches; a larger refactor is recorded as a `type: refactor` slice in
  `structure.spec.md` by the supervisor, not done in-batch.
- A residual that proves bigger than its batch can absorb is not deferred to new backlog: it is
  either finished in the batch (widen touches with the supervisor's park→widen→relaunch rule) or
  recorded `wontfix` with the reason, per the DEFER rule.
- Each batch PR lists the residual ids it closes; at merge the supervisor runs
  `mr-gates residuals disposition --id <R> --as fixed --pr <N>` for each.

- The last batch carries the sweep's closing criterion, written by ts-6a as its final id-led
  EARS bullet: when it merges, no residual from the triage table is still open in
  `mr-gates residuals list --json` (each closed as fixed with a PR or wontfix with a reason), and
  `just ci` and `just e2e` are green on `master`. That merge closes the milestone.

#### Triage table (ts-6a)

Triaged 2026-11-13 against monster-realm `master` @ `3278f6b5`. 174 residuals were open at launch;
170 are in scope and listed here once each. Verdicts: 59 `fix` in 14 batches, 25 `resolved-fixed`,
15 `resolved-obsolete`, 64 `wontfix`, 3 `ask`, and 4 duplicates that close with the batch fixing
their defect.

Reading the table: `sev` is the triaged grade, with the ledger's grade in brackets where it changed;
every row the ledger left uncategorised has a category. A `resolved-*` row names the PR, the commit,
a covering test (its name cut at 72 characters) and the decision title where one retired the
surface. A `resolved-fixed` row that names a batch is a duplicate: it is dispositioned when that
batch merges, not when this slice does. A MED `wontfix` or an `ask` ends with its player-facing
impact. An `ask` row is treated as `wontfix` until the operator answers.

Out of scope, each owned by a live, unbuilt slice of another milestone: `R-weekly-review-2026-10-02-F1` → M-netcode-presence `np-d` (NPD.1); `R-weekly-review-2026-10-23-F2` → M-netcode-presence `np-d` (NPD.2); `R-weekly-review-2026-10-09-F1` → M-econ-onboarding `eo-2` (EO2.1); `R-weekly-review-2026-10-23-F1` → M-econ-onboarding `eo-1` (EO1.2).

| id | sev | category | verdict | evidence or root cause | batch |
|---|---|---|---|---|---|
| `R-bt-7-GUESTTACTICAL` | MED (was LOW) | security-privacy | resolved-fixed | Same defect as `R-weekly-review-2026-10-16-F2`; closed with it by ts-6b-1. | ts-6b-1 |
| `R-rb-128-X2` | LOW (was MED) | ux-a11y | fix | guards.rs REJECT_DELETION_GATED still says 'new trades, battles and challenges are unavailable', yet require_not_deleting gates join, move, care, evolve, rename, party edits, talk, shop and recruit. Players see a wrong reason. Tests compare against the const; only two client tests hold the literal as sample data. | ts-6b-1 |
| `R-rb-65-RUNBOOK-LOGCAVEAT` | LOW (was MED) | security-privacy | fix | Still missing. docs/runbooks/observability-dr.md section 8 lists shared historical rows and backups but not the logs. Every cascade logs account_deletion_cascade with the subject identity (cascade_fields), and every claim logs guest_claim_export_purge with the guest identity. Loki keeps both for 30 days. | ts-6b-1 |
| `R-weekly-review-2026-10-09-F3` | LOW | gameplay | fix | Still real. accept_challenge (pvp.rs) neither refuses nor ends a party's player_conversation. The suspended dialogueView frame stays on top (contextStack reconcile keeps it while view.conversation), and dialogueScreen returns unhandled for D-pad/A while inBattle, so ScreenHost never reaches the battle base. talk/advance_dialogue already refuse in battle, so the conversation is dead. | ts-6b-1 |
| `R-weekly-review-2026-10-16-F2` | MED | security-privacy | fix | Still real. rekey_all moves no battle rows. battle_gc keeps the anchor, battle_tactical and battle_summary. sweep_prior_terminals runs only on that identity's next battle, which a claimed guest never has. account_deletion_reaper runs erase_tactical_rows and anonymize_battles for the account identity only, so the guest's rows escape both the export and the erasure. | ts-6b-1 |
| `R-ts-5-NOTE1BC25F` | LOW | security-privacy | fix | One rule has two copies: pvp::characters_in_interact_range and an inline match in trading_session::open_trade_session both look up the two characters through player.entity_id and call within_interact_range. A missing character counts as out of range in each copy. | ts-6b-2 |
| `R-weekly-review-2026-10-02-F2` | MED | security-privacy | fix | Still real at 3278f6b5: economy::buy and economy::sell read no position at all and raising::heal_party checks ch.zone_id against loc.zone_id but never tile_x/tile_y, while npc::talk enforces in_talk_range. A modified client can shop from anywhere and heal from anywhere in the heal zone. | ts-6b-2 |
| `R-ctl-7d-CTL7D.4` | LOW | gameplay | fix | Wider than filed. A plain shortfall also gets the escrow message: buy says 'currency is in an active trade' when total exceeds the balance with nothing escrowed, as does evaluate_heal_currency; sell says the item twin. Buy quantity goes up to SHOP_BUY_MAX whatever the balance, and reduceErrorMessage passes the text through. | ts-6b-3 |
| `R-ts-0b-HEALITEMESCROW` | LOW | data-integrity | resolved-fixed | Same defect as `R-ts-2-HEALCOSTLOCK`; closed with it by ts-6b-3. | ts-6b-3 |
| `R-ts-2-HEALCOSTLOCK` | LOW | data-integrity | fix | Still real but latent: raising::heal_party step 7 consumes loc.cost_item_id with no escrowed_item_qty_of netting, unlike sell, train and consume_crystalized_essence. The Economy decision says a guarded asset cannot be spent. Today no heal location has a cost item. | ts-6b-3 |
| `R-ts-2-SWAPCOST` | MED | data-integrity | fix | Still real: trading_session::apply_swap loops consume_one qty times per ItemDebit, each an owner-index scan plus update or delete. economy::sell does the same, up to 9999 writes per call with no partner needed. heal_party's cost loop is a third copy. There is no consume-n primitive in inventory.rs. | ts-6b-3 |
| `R-weekly-review-2026-10-16-F3` | LOW | data-integrity | fix | Still real: npc::apply_quest_trigger's QuestComplete arm deletes the player_quest row and marks the quest done, then calls grant_item and grant_currency, which saturate at MAX_ITEM_STACK and MAX_BALANCE. apply_effects_to_db's GrantItem does the same. A player at a cap silently loses part of a one-time reward, which breaks reject-don't-clamp. | ts-6b-3 |
| `R-bt-10-APPIPSMIRROR` | LOW | gameplay | fix | client/src/tactics/hud.ts AP_PIPS = 6 still copies ap_turn although the rules port already exports freshBudget() (TurnBudget::fresh over loaded tuning), which tacticsBattle.ts uses elsewhere; hud.test pins the literal 6, so a tuning change draws the wrong pip count. | ts-6b-4 |
| `R-bt-11-SHAREDJOIN` | LOW | netcode-determinism | fix | client-wasm unit_of_row rebuilds the UnitKit join (species affinity, kit base_speed, movement, [light, heavy], row level/stats) that server-module TacticsContent::unit_kit also hand-writes; tests compare client-wasm only to a third hand copy, so a server join change breaks nothing and forecasts/overlays silently diverge. | ts-6b-4 |
| `R-bt-12-DEPLOYCAP` | LOW | netcode-determinism | fix | The cap min(MAX_PACK, spawn_a.len()) is still hand-written twice in server-module tactics.rs (deploy close and the picks check) and restated in client main.ts as Math.min(tuningOf().max_pack, spawns); only max_pack is pinned, the formula is not, so a cap-rule change desyncs the deploy slot count. | ts-6b-4 |
| `R-bt-15-STRIKESMAX` | LOW | netcode-determinism | fix | client/src/tactics/clock.ts STRIKES_MAX = 4 still copies TacticsTuning.autopass_forfeit; TacticsTuningOut exports only surge_start_round, wild_round_cap, max_pack, and clock.test pins the literal 4, so retuning tactics_tuning.ron shows players the wrong number of strikes before forfeit. | ts-6b-4 |
| `R-ctl-11a-XQUICKMOVE` | LOW | ux-a11y | fix | Still missing: the router now asks an uncovered nav screen for X (bt-12), but monstersScreen ignores X in the list phase (its test pins X as not the screen's), though the controls design names X = quick Move on Monsters and X is a primary pad button. | ts-6b-5 |
| `R-ctl-13-CTL13.5` | MED | ux-a11y | fix | Still real. EvolutionNoticeBanner is a DOM button that only a click or Tab-focus plus Enter dismisses. No virtual button reaches it: noticeModel Notice is request or error only, and ScreenHost worldButton never acks evolution notices. A controller-only player cannot clear the reveal. | ts-6b-5 |
| `R-ctl-15-DRIVEN` | LOW | ux-a11y | fix | PointerSource provenDriven scopes single-row elimination to the aria-modal frame before the context sheet, so a one-row picker sheet over a one-row base list (one food, one monster: the early game) ties and a click does nothing; world sheets already scope to the sheet. | ts-6b-5 |
| `R-pgcc-d-monstersScreen-sentinel` | LOW | ux-a11y | fix | monstersScreen.ts Move arm still emits setPartySlot slot: toParty ? -1 : vm.partySlotNone instead of boxModel.NEXT_FREE_PARTY_SLOT; values equal, so it is a duplicated literal, not a behaviour bug. | ts-6b-5 |
| `R-weekly-review-2026-10-09-F2` | MED | gameplay | fix | Still real: PointerSource click on [data-choice-idx] calls deps.choice, which main.ts wires to dispatch advanceDialogue directly, skipping dialogueScreen's reveal gate and DIALOGUE_RESEND_MS guard; advance_dialogue(choice_idx) applies to the current node, so a double click answers the next node blind. | ts-6b-5 |
| `R-bt-17-MARSHALTESTONLY` | LOW | loop-ops | fix | Still present: marshal.rs (wild_battle_monster, build_ability_store, battle_monster_from_row, type_chart_from_rows) and content_cache.rs (SKILLS, ABILITIES, cached_skills, cached_abilities, TypeChartCell, type_chart_cache_lookup) compile only under cfg(test), have no production caller, and are kept alive only by their own tests. | ts-6b-6 |
| `R-bt-17-SETTLEFAILPATHS` | LOW | gameplay | fix | Still uncovered. No test reaches battle::credit_monster's level-up branch (stat recompute and heal) or its check_and_evolve call through a tactical win, and the failed-write-back fixtures have no fainted party member. Statement-drop hand mutants there pass, and the cargo-mutants nightly does not generate them. | ts-6b-6 |
| `R-bt-4-TERRITORIALTILE` | LOW | gameplay | fix | Still uncovered: every Territorial plan_of test in ai_tests.rs uses melee_kit or an AoE kit, so ai::plan's farthest predicate can wrongly include Territorial (farthest = !exhausted && stance != Aggressive) and the suite stays green. The wild AI drives the forecast chips and wild turns, so this is protected gameplay. | ts-6b-6 |
| `R-bt-12-RESULTSDRAIN` | LOW | ux-a11y | fix | Still real: refreshBattle routes a Finished row straight to buildResultsPanel and hideOtherBattleViews, whose hide() skips the shell's Playback queue, so the final KO beats never play and the battle cuts to results mid-animation. | ts-6b-7 |
| `R-bt-15-CLOCKSKEW` | LOW | ux-a11y | resolved-fixed | Same defect as `R-weekly-review-2026-11-06-F3`; closed with it by ts-6b-7. | ts-6b-7 |
| `R-weekly-review-2026-11-06-F1` | MED | ux-a11y | fix | Still real: ticker.ts carries no live region by design and nothing routes tactical events to ui/liveRegion; main.ts announces only the frame title and the wild Still-there countdown, so a screen-reader player never hears whose turn it is, a KO, or the battle end. | ts-6b-7 |
| `R-weekly-review-2026-11-06-F3` | MED | ux-a11y | fix | Still real: pumpStillThere and pumpClock pass raw Date.now() to stillThereSeconds and clockVM against server epoch deadline_ms; client/src has no server-time offset, so a skewed device clock hides the Still-there warning before an auto-pass or paints a wrong PvP ring. | ts-6b-7 |
| `R-ci-fix-20261002T0901Z-VIEWREBUILD` | MED | ux-a11y | fix | Box, dialogue (polish-1) and raising (ctl-7b #rendered key) were fixed, but ShopView.render, HealView.render, QuestLogView.render and EvolutionView.refresh still replaceChildren their rows on every store batch, so a pointer press spanning a batch loses its row and shop buy/sell buttons lose their disabled lock. | ts-6b-8 |
| `R-ctl-8a-CTL8A.2` | LOW | ux-a11y | fix | shopScreen settle() still calls navReconcile(layout, layout, state.nav) with no previous layout, so reseat cannot find the vanished key's index and lands on row 0 after a sell-all or sold-out row. bagScreen and journalScreen already keep state.layout for this. | ts-6b-8 |
| `R-uif-10-SHOPFOCUS` | LOW | ux-a11y | fix | shopView #apply toggles #forSaleList/#inventoryList hidden on a tab switch without checking focus; a Tab-focused list container (the nav tab stop) is left inside a hidden subtree and focus heals to the world canvas. raisingView already re-homes via #hiddenInFrame. | ts-6b-8 |
| `R-uif-10-TITLES` | LOW | ux-a11y | fix | Half obsolete: ts-3 replaced trade-propose, and the session editor paints an h2 from tradeSession.title. The heal half is still real: healView.ts paints no title and the catalog has no heal.title key, so the heal frame starts without the frame anatomy's title bar. | ts-6b-8 |
| `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL` | LOW | ux-a11y | fix | openOverlayA11y's setTimeout(0) still calls initialFocusSelector .focus() with no options; when a nav key moved the cursor first (not DOM focus), focus() scrolls the frame back to its anchor. The same-macrotask skip only covers focus already inside root. | ts-6b-9 |
| `R-ctl-13-REANNOUNCE` | LOW | ux-a11y | resolved-fixed | Same defect as `R-uif-4-REPEATSAY`; closed with it by ts-6b-9. | ts-6b-9 |
| `R-polish-1-CLAIMRESULTCATCHREENTRY` | LOW | ux-a11y | fix | connection.ts still chains pendingClaim.then(ok callback).catch(reject callback), so a throw inside main.ts onClaimResult's claim-succeeded path (applyClaim/render) re-enters onClaimResult as a rejection after the stored code was already cleared. | ts-6b-9 |
| `R-rb-52-GRACEANNOUNCE` | MED | ux-a11y | fix | rb-92 never landed. The #privacy-countdown banner is deliberately not live, and main.ts's change-detected privacy block only pumps account-changed; nothing announces the active to grace phase edge, including a deletion requested from another session. | ts-6b-9 |
| `R-rb-53-E1` | LOW (was MED) | ux-a11y | fix | rb-94 never landed. main.ts's onBatchApplied recomputes exportAssembly and repaints the privacy status label in place; nothing announces the incomplete to complete edge, so a screen-reader user waiting for the export is not told it is ready. | ts-6b-9 |
| `R-uif-4-REPEATSAY` | LOW | ux-a11y | fix | LiveRegion.announce returns early when message equals #pending ?? #lastWritten, so any repeat of the last painted text is never spoken: a second identical toast (the same refusal twice) and a second identical request line both go silent. The callers read as edge-driven; the batch confirms each before the dedup goes. | ts-6b-9 |
| `R-weekly-review-2026-10-02-F4` | LOW | ux-a11y | fix | a11yCopy.ts is still a frozen English-only map with its own t(); overlayA11y.ts, announcements.ts, render/world.ts and main.ts resolve the 16 overlay names and a11y.world.region through it, catalog.fr.ts has no a11y keys and messageIds A11yKey is never. | ts-6b-9 |
| `R-21r-e-E1` | MED | ux-a11y | fix | The wizard is gone, but the session editor inherited the gap: tradeSession.prompt.confirm reads 'Confirm this trade? A completed trade cannot be undone.' It never says that confirm_trade_session resets each traded monster's Trust and Quality-Time (reset_trainer_bond), or that trading it back does not restore them. | ts-6b-10 |
| `R-ctl-8g-CTL8G.1-DEADPATH` | LOW | ux-a11y | fix | Still present: contextStack.socialPanel maps 'players' to tradeView, socialScreen paint overrides it to leaderboardView, and tradeView #applySocial keeps an unreachable social.players.placeholder branch (the trade root is hidden on Players, so its kept paint is null). Catalog key is dead. | ts-6b-10 |
| `R-uif-9-UIF9.2` | LOW (was MED) | ux-a11y | fix | paintSocialChrome (tradeView.ts) still renders #social-sheet via renderNav as a plain listbox, not createContextSheet, with no Back row (pvp.spec.ts pins exactly Accept, Decline). The Monsters ContextSheet decision says Social reuses the kit placement and kit.sheet.back row. | ts-6b-10 |
| `R-21r-b2-E1` | LOW | ux-a11y | fix | privacyView.ts writes PRIVACY_PSEUDONYMIZATION_DISCLOSURE once in its constructor, raw English, so a fr player reads the account-deletion disclosure in English. Every other privacy string is in the catalog; this one stayed out because a module-level t() would freeze the boot locale, and privacyView.i18n.test.ts pins it as raw. The English wording is pinned byte-identical to the eval's PIN_PSEUDONYMIZATION and stays so. | ts-6b-11 |
| `R-qf-13-QF13.4` | LOW | ux-a11y | fix | #claim-privacy-btn and ClaimViewHandlers.onPrivacy survive: in the combined Profile the button only moves the cursor to the Privacy section directly below (main.ts onPrivacy calls profileView.focusSection). It is a now-pointless extra row in the Account section. | ts-6b-11 |
| `R-uif-17-KITPOLISH` | LOW | ux-a11y | fix | Of the row's five cosmetic items one is worth a change: Monsters, Inventory and Controls paint a plain h2 where every other frame uses the kit title bar, and Inventory repeats the title as an in-panel h3. Profile's native buttons and overflow, the list focus outline, the Help band and the How to Play line stay as shipped. | ts-6b-11 |
| `R-ctl-15-LAUNCHERATTR` | LOW | ux-a11y | fix | Still present: index.html chips keep data-menu-launcher and data-help-launcher and a comment saying clicks are delegated on them; no client source reads them (chips press via data-button in pointerSource). indexShell.smoke.test.ts pins the dead attributes and several test comments narrate the delegate. | ts-6b-12 |
| `R-ts-3-STATICSHELL` | LOW | ux-a11y | fix | Still real: index.html keeps the wizard's #tradepropose-target select, monsters div and two currency inputs, which TradeSessionView.replaceChildren discards at construction. Close is still #tradepropose-submit. Stale tradePropose comments remain in profileScreen.ts:11, careAction.ts:2, bagScreen.boot.test.ts:24 and journalScreen.boot.test.ts:21. | ts-6b-12 |
| `R-ts-4-CLIENTDEADENDS` | LOW | ux-a11y | fix | Still present: tradeSessionModel input legacyOfferMonsterIds is only ever passed new Set(); feedbackPolicy kinds trade-answered and trade-settled have no producer; careAction onRejected is never passed by performCare callers; index.html trade-my-side, trade-their-side, trade-actions and trade-feedback exist only for trade.spec.ts's DOM-existence test. | ts-6b-12 |
| `R-ctl-10a-BOXCB` | LOW | ux-a11y | fix | BoxViewCallbacks.onHealParty is still declared optional and unread in boxView.ts; overlayA11yWiring.test.ts still passes onHealParty. main.ts no longer wires it. | ts-6b-13 |
| `R-ctl-10a-HEALTARGET` | LOW | ux-a11y | fix | healModel.healTargetLocationId has no production caller (only healModel.test.ts). Command healParty.locationId stays optional in screens/types.ts with a stale 'until ctl-10a ... takes the first loaded one' comment; healScreen is the only emitter and always sets it, so main.ts dispatch's heal-unavailable branch is unreachable. | ts-6b-13 |
| `R-ctl-10b-PVPCB` | LOW | ux-a11y | fix | PvpViewCallbacks.onChallenge remains optional and unread in pvpView.ts (its comment cites this residual); overlayA11yWiring.test.ts and pvpView.test.ts still pass it. main.dispatch.test.ts already pins that main.ts wires none. | ts-6b-13 |
| `R-ctl-10b-PVPPLAYERS` | LOW | ux-a11y | fix | buildPvpChallengeViewModel still computes challengeablePlayers and its own busyIdentities set, but no production code reads challengeablePlayers (only pvpView.test.ts fixtures). Pending-busy logic is duplicated by interactModel.pendingChallengeIdentities, which main.ts uses. | ts-6b-13 |
| `R-qf-9-RAISINGVESTIGES` | LOW | loop-ops | fix | Half true. RaisingView still takes an ignored _retired ctor param, passed only by overlayA11yWiring.test.ts. buildRaisingViewModel's monsters half is no longer unread: the Bag picker reads vm.monsters (raisingView.ts picker fill and bagScreen picker). | ts-6b-13 |
| `R-21r-e-E2` | LOW | netcode-determinism | fix | Both stale comments survive at master: schema.rs on struct Npc ('kept in sync on zone crossings, M12c') and movement.rs in the NPC wander loop ('NPC zone crossings deferred to M12c'). They contradict the decision that an NPC never leaves its home zone. | ts-6b-14 |
| `R-bt-11-DOCROT` | LOW | loop-ops | fix | ARCHITECTURE.md 'client-wasm: the prediction boundary' still lists only the movement/zone exports (no tactics_* exports, terrain_kinds missing); game-core tactics/golden.rs module doc and golden_tests.rs still say BT11.7 follows/joins the harness. | ts-6b-14 |
| `R-ci-fix-20261002T0501Z-E2EARTIFACTS` | LOW | loop-ops | fix | e2e-shard job uploads only e2e.json and e2e-list.json timings; no Playwright traces, test-results dir or /tmp/stdb.log on failure, and playwright.config.ts use sets no trace option. | ts-6b-14 |
| `R-ci-fix-20261101T0505-CTXSTACK-FLOOR` | LOW | loop-ops | fix | contextStack.test.ts runs an unseeded fc.assert (500 runs) and then asserts keptStamped > 50; the measured minimum is 47 in 32000 runs, so the non-vacuity floor fails on rare seeds. The floor is still 50 at master. | ts-6b-14 |
| `R-ctl-10a-DOCS` | LOW | ux-a11y | fix | Still stale: dialogueModel.ts:4 cites removed nearestInteractable, healScreen.ts:5 says T, net/rowConvert.ts:584 and contextStack.test.ts:2282 say KeyT, game-core npc/mod.rs:12 says the client reads talk_range for its prompt. ARCHITECTURE and DECISIONS cites are gone. | ts-6b-14 |
| `R-ctl-11b-STALENARRATION` | LOW | ux-a11y | fix | Still present: overlayA11y.ts production comments (near lines 72 and 194) narrate a worldHasFocus predicate deleted by ctl-11b, as do overlayA11y.test.ts (an assertion message), main.accel.test.ts, main.input.test.ts and main.a11yFocus.test.ts. | ts-6b-14 |
| `R-ctl-7a-CTL7A.4` | LOW | loop-ops | fix | Still stale: evolutionNotice.ts:17 and evolutionNotice.test.ts:578 cite the deleted #help-hint at z-index 50; menuView.ts:102 says most child shells are in-flow. privacyView, battleView.test and PLAYTEST.md were already fixed (PLAYTEST by #699). | ts-6b-14 |
| `R-pgcc-c-RESEEDDOCBLOCK` | LOW | loop-ops | fix | main.battle-reseed.test.ts still quotes removed latch code (battleReseedPending, lines ~641-742) and stale main.ts:1828/:2174/:1852 line cites. | ts-6b-14 |
| `R-qf-6-QF6.1` | LOW | loop-ops | fix | wallet-balance.spec.ts:~934 still says a rejected advance leaves the overlay open; since qf-6 dismiss closes it. | ts-6b-14 |
| `R-ts-4-STALECOMMENTS` | LOW | loop-ops | fix | Stale text is still at master: guards.rs 115 and 299, movement.rs 355, schema.rs 753 and 766, monster_mgmt_tests.rs 245, game-core trading/rules.rs, wallet-balance.spec.ts 86, index.html 40, worldScreen.test.ts 373, SKILL.md 28, and recording.rules.yml 29 and 32, whose regexes still name propose_trade and accept_trade. | ts-6b-14 |
| `R-20r-d-B1-ack` | LOW (was MED) | ux-a11y | wontfix | Still count-based: ack_evolution_notices(count) drains a prefix and the client sends count 1 per dismissed banner. Losing a banner needs two tabs on one identity acking inside one batch latency, and the evolution itself persists. Keying the ack changes the reducer signature and the bindings for a cosmetic two-tab race. Decision: "Evolution graph and the auto-evolve rule". Impact: With two tabs open, rarely, one evolution reveal banner is never shown; the evolved monster is unaffected. | — |
| `R-20r-d-B1-cap` | LOW (was MED) | data-integrity | wontfix | Still uncapped (evolution.rs has no length bound on pending_evolution_notice.entries), but growth is self-inflicted only, bounded by owned monsters times evolution tiers (24 bytes each), and removed by the deletion cascade. Any cap must drop the newest notice, and nobody is harmed today. Decision: "Evolution graph and the auto-evolve rule". Impact: None: only a player who never dismisses banners grows their own small private row. | — |
| `R-21r-a-CONTENTLOAD` | LOW | gameplay | resolved-fixed | The tactical recruit resolves ShellHooks::recruitable and bait_bonus (content species, level, seed row) in the pre-debit validation, before consume_one, and resolve_delegated only logs, never errors or rolls back, after the debit. game-core recruit.rs documents the same order. The 1v1 attempt_recruit is gone. Refs: #629 #672 `9d5f7e84` `d90c32c9`; test `server-module/src/tactics_settle_tests.rs` :: "a_live_recruit_of_a_wild_without_its_seed_row_is_refused_target_gone_bef…"; `server-module/src/tactics_settle_tests.rs` :: "a_live_recruit_with_a_bait_that_is_no_bait_or_not_held_is_refused_before…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-21r-a-FAINTPENALTY` | LOW | gameplay | resolved-fixed | bt-9 made the tactical settle call battle::apply_faint_penalties on every Settled close with a good HP write-back, a recruit success included (its doc names R-21r-a-FAINTPENALTY); the 1v1 attempt_recruit was deleted in bt-17. Refs: #629 #672 `9d5f7e84` `d90c32c9`; test `server-module/src/tactics_settle_tests.rs` :: "a_recruit_win_with_a_fainted_party_member_adds_exactly_one_unfavorable_t…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-21r-a-TERMINALSWEEP` | LOW | data-integrity | resolved-fixed | bt-9 routed every tactical finish (recruit included) through tactics_settle::settle, which always calls battle::sweep_prior_terminals; bt-17 then deleted taming::attempt_recruit entirely. The sweep test runs Finish::Recruit among its finishes. Refs: #629 #672 `9d5f7e84` `d90c32c9`; test `server-module/src/tactics_settle_tests.rs` :: "every_finish_sweeps_the_players_prior_terminal_anchors_with_their_tactic…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-21r-a-WBALERT` | LOW | loop-ops | wontfix | The six named 1v1 sites were deleted by bt-17. Successors exist (tactical_writeback_err, tactical_settle_err, tactical_recruit_resolve_err, wild_disconnect_writeback_err) and ops/observability still has no rule or panel on them, but they are invariant-fault logs searchable in Loki on a loopback-only stack. An alert is speculative hardening. Decision: "Observability: the module never times itself or calls out". | — |
| `R-bt-11-ITEMROW` | LOW | gameplay | wontfix | Not a defect: the greyed Item row matches the server, which rejects Item entries with ITEMS_NOT_AVAILABLE. In-battle items are an unbuilt feature recorded in M-battle-tactics-design.md (Item verb cost 3, items gain battle_use); the sub-list belongs to that feature slice. | — |
| `R-bt-11-RULEHOME` | LOW | netcode-determinism | wontfix | Both restated predicates in client-wasm forecast_of (stab, status_blocked) are differentially tested against the real game-core damage_pipeline and resolve_attack, so a game-core edit to either rule fails the client-wasm suite rather than drifting silently. Forecast is display-only. Decision: "Rules are written once, in game-core". | — |
| `R-bt-12-INITPARITY` | LOW | netcode-determinism | wontfix | The only assumption, strict per-round alternation, is pinned in game-core: priority_for_round is tested over rounds 0..65535 and an upkeep test asserts tie_priority flips and initiative is rebuilt after run_upkeep. next_initiative_of calls those same functions; the result is a display forecast. Decision: "Rules are written once, in game-core". | — |
| `R-bt-12-SHELLKIND` | LOW | netcode-determinism | wontfix | shellKind in client/src/tactics/wasm.ts is an exhaustive switch (satisfies never) over the append-only BattleKind with a unit test pinning Wild to wild and Pvp/Practice to pvp; it only picks UI rows and the countdown. Remapping a kind is a design change that touches the client anyway. Decision: "Rules are written once, in game-core". | — |
| `R-bt-17-FIGHTSTALL` | MED | loop-ops | resolved-fixed | fc035a5e taught fightToOutcome to answer a kiting Skittish wild by Move-then-Skill from the ghost tile (moveThenAttackByButtons) and added E1b covering that turn by buttons. Refs: #677 `fc035a5e`; test `client/e2e/encounter-battle.spec.ts` :: "E1b: an out-of-reach foe is hit in one turn by Move then Skill from the…"; `client/e2e/battle-dpad.spec.ts` :: "CTL8J-2-DPAD-BATTLE-B: a second battle on the buttons alone reaches an o…". | — |
| `R-bt-17-HPCUE` | LOW (was MED) | ux-a11y | wontfix | The colour band is not the only cue: boardRender sets the fill width to hpPermille, so bar length already encodes HP (WCAG 1.4.1 satisfied), and the HUD info rows give numeric HP and maxHp as text. A pattern or glyph would duplicate both. Impact: Colour-blind players read HP from bar length and the numeric HUD row; only the band colour is lost. | — |
| `R-bt-17-HPFILLINLINE` | LOW | ux-a11y | wontfix | boardRender paints only fill.style.width; nothing sets an inline transition, and the stylesheet reduced-motion guard is tested. The surviving 'mutant' is a hand-inserted line with no plausible real failure, a test-only wish on unprotected behaviour. | — |
| `R-bt-17-PVPHPOK` | LOW | gameplay | resolved-fixed | PR 737 added a behaviour test that kills the settle_pvp_battle and-to-or mutant (side_a_ok and side_b_ok): a PvP settle where one side's HP write-back fails pays nothing to either side. Refs: #737 `a27fa7bc`; test `server-module/src/tactics_settle_tests.rs` :: "a_pvp_settle_with_one_sides_hp_write_back_failed_pays_nothing". | — |
| `R-bt-17-UNDOWILDSTART` | LOW | data-integrity | wontfix | Still true that undo_wild_start skips battle_unit, event, queue and schedule rows, but no failure can happen after those inserts: the materialize dry run already checked deploy_unit and TacticalState::new with the same inputs, and TacticalBattle::start fails only on invalid tuning (rejected at content load) or on NotStartable (impossible on a fresh battle). | — |
| `R-bt-6-BT6.2` | LOW (was MED) | content | wontfix | Still true: kit_outside_learnable_set_is_pinned_bt6_2 pins species 2,6,7,8,9,20,21,22,23,30 with kits outside learnable_skill_ids. Since bt-17 deleted the 1v1 engine, battles use only tactical kits, and no client UI reads learnableSkillIds. Closing the gap means authoring new Water, Dark, Earth and Wind Heavy skills for zero player-visible change. Decision: "Tactical content lives in sidecar registries keyed by id". Impact: None visible: monsters fight with their tactical kit, and the learnable list is not shown anywhere. | — |
| `R-bt-7-QUEUEVOIDED` | LOW | security-privacy | wontfix | Still true at master (my_battle_events serves every battle_event to both participants, QueueVoided included), but DECISIONS records it as an accepted reveal in both the tactical-privacy and halt-and-return entries (added with bt-14). The design contradiction the row named was closed by recording the reveal, the row's option (b). Decision: "Tactical battle privacy is structural, and tactical rows are not exportable"; "Queued actions halt-and-return; the idle clock resets on every accepted submit". | — |
| `R-bt-7-SUMMARYEXPORT` | MED | security-privacy | ask | battle_summary and player_formation are still exportable: false (schema.rs manifest). The tactical-privacy decision leaves this as an open spec question and rules out adding an exporter for a tactical table. The new export-scope rule (#753) favours including them. Ask: export both? Default: yes, as owner-keyed index queries with no schema change. Impact: A player's data export leaves out their per-battle telemetry and their saved formation. | — |
| `R-bt-8-CASCADESCHED` | LOW | data-integrity | wontfix | Still uncovered. accounts_tests registers the three schedule tables but seeds no row, so dropping the three deletes in schema::erase_tactical_rows survives. A leftover row carries only battle_id (no identity), fires once as a no-op on a missing battle and is then removed by the scheduler. This is a test-only wish with no real failure. Decision: "Tactical battle privacy is structural, and tactical rows are not exportable". | — |
| `R-bt-9-LEDGERHOME` | LOW | netcode-determinism | wontfix | DECISIONS defers this on purpose: moving the fold and attribution into game-core tactics::rewards is due with the first slice that adds a heal or revive. No tactical heal or revive exists at master (tactics_items, resolve.rs), so the reconstruction stays exact and nothing on the client recomputes the killer. Decision: "Tactical settlement derives the reward ledger from the transcript". | — |
| `R-bt-9-RECRUITHEADROOM` | LOW | gameplay | wontfix | DECISIONS rules out a check_headroom for recruits on purpose: no monster-storage rule exists and the predicate is that the unit has an owner. A box cap is a game-design feature (storage limits), not a defect, and it would need a design decision first. Decision: "Tactical settlement derives the reward ledger from the transcript". | — |
| `R-ci-fix-20261002T0501Z-DIALOGUESPECCLICK` | LOW (was MED) | loop-ops | wontfix | The swallowed click is deliberate: the attempt loop retries, and post-loop assertions (advanced true within MAX_ADVANCE_ATTEMPTS, overlay hidden) still fail a genuinely stuck advance. Only diagnostics are lost; no player effect. Impact: None for players; test-diagnostics only. | — |
| `R-ci-fix-20261002T0901Z-HELPHINTCOVERSACCEPT` | MED | ux-a11y | resolved-obsolete | Both surfaces are gone. ctl-7a replaced #help-hint with Start/Select chips (8fc9e14b, #549), and qf-8 deleted the PvP overlay Accept button (pvp-accept-btn), so accepting is the Social sheet row or the request sheet (b55806da, #604). Refs: #549 #604 `8fc9e14b` `b55806da`. | — |
| `R-ci-fix-20261002T0901Z-PVPSPECCLICKS` | LOW | loop-ops | resolved-obsolete | qf-8 removed pvp-accept-btn and migrated pvp-side-b.spec.ts and monster-privacy.spec.ts to the Social sheet (b55806da, #604). Neither spec clicks a PvP Accept selector at master. Refs: #604 `b55806da`. | — |
| `R-ci-fix-20261101T0505-ID0-ROWS` | LOW | ux-a11y | wontfix | shopOpenModel.shopOpenStep has no truthiness site: every pendingShopId check is === null, and the step table already includes shopPicked shopId 0. No shop id 0 exists in game-core/content/shops/000-core.ron. Surviving id-opaque mutants with no plausible real failure. | — |
| `R-ci-fix-20261107T0300-tactics-wild-bait-budget` | LOW | loop-ops | resolved-fixed | 8026c3c8 set BAIT_SEED = MAX_BATTLES * MAX_OWN_TURNS in tactics-wild.spec.ts, one bait per possible live Recruit, exactly the proposed fix. Refs: #670 `8026c3c8`; test `client/e2e/tactics-wild.spec.ts` :: "BT12-5-WILD-RECRUIT: a grass encounter with a one-monster party is a pac…". | — |
| `R-ctl-10a-TALKRANGE` | LOW | loop-ops | wontfix | talk_range still has a consumer: e2e dialogue.spec.ts reads it via readWasmU32Constant, and a wasm test pins it to game-core TALK_RANGE. The mock stubs are harmless. Removal saves almost nothing. | — |
| `R-ctl-10b-DOCS` | LOW | ux-a11y | resolved-fixed | PLAYTEST.md was rewritten for the delivered menu: no T or O controls remain, and P Challenges is a live shortcut (KeyP bound). Refs: #699 `a60796e6`. | — |
| `R-ctl-11a-DRAFTLOSS` | LOW | ux-a11y | wontfix | The trade wizard is gone. In the session editor an accelerator closes only the local unsent draft, while the session and stored offer survive on the server and reopen face to face. The Name draft is a short string. Behaviour matches the one-context-stack pop rule. Decision: "Client UI: virtual buttons, one context stack, one overlay frame". | — |
| `R-ctl-11b-E2ESECONDMONSTER` | LOW | ux-a11y | wontfix | Coverage wish: menu-flow.spec.ts still plays one monster (enum column unseedable by owner SQL); picker navigation and Move are covered by bagScreen and monstersScreen unit tests, and the real flow is exercised once end to end. No plausible failure the extra e2e would catch. | — |
| `R-ctl-12-CTL12.1` | MED | ux-a11y | resolved-fixed | ctl-12b shipped Options > Controls: controlsView with Buttons and Shortcuts tabs (uif-13 added Display), twelve button rows with Primary and Alt slots, A on a slot starts capture with the Press a key prompt; SCREEN_POLICY and the menu leaf landed with it. Refs: #571 `17ac40f5`; test `client/src/ui/controlsView.test.ts` :: "CTL12B-1-VIEW-ROWS: painted on the Buttons tab the view shows the three…"; `client/src/ui/controlsView.test.ts` :: "CTL12B-1-VIEW-PROMPT: painting a capture shows #controls-capture with ex…"; decision "Client UI: virtual buttons, one context stack, one overlay frame". | — |
| `R-ctl-12-CTL12.6` | MED | ux-a11y | resolved-fixed | ctl-12b added the remap e2e: through the real menu A is rebound to K; without and after a reload K confirms and Enter does not, and the healer chip shows the K keycap. Boot-time load of the saved table was ctl-12. Refs: #571 #569 `17ac40f5` `6d7d0a8c`; test `client/e2e/remap.spec.ts` :: "CTL12B-2-REMAP-FLOW: Options > Controls through the menu, the Confirm (A…". | — |
| `R-ctl-12b-PROSEHINTS` | LOW | ux-a11y | resolved-obsolete | battle.continueHint and battle.swap.hint were deleted with battleView.ts in bt-17 (64f66cca, #671). The tactics.* catalog copy contains no literal key names. Refs: #671 `64f66cca`; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-ctl-13-ANSWERFAIL` | LOW | ux-a11y | resolved-fixed | C5 added releaseAnswered: the cancelTradeSession, acceptChallenge and declineChallenge arms pass it to sendGuarded, which deletes the optimistic answeredRequests key when the reducer rejects, so the banner and Y offer the request again. Refs: `0373cac0`; test `client/src/main.dispatch.test.ts` :: "C5: an answer the server REJECTS releases its optimistic answeredRequest…". | — |
| `R-ctl-13-HINTCOST` | LOW | ux-a11y | wontfix | Still true (paintPrompt calls livePending and the frame loop calls buildNotices, each building noticeInput), but it is a few array reads per frame; the Nov perf campaign profiled the frame loop and did not flag it, and no behaviour test can prove the change. | — |
| `R-ctl-15-FOCUSSEAM` | LOW | ux-a11y | wontfix | Real but cosmetic: hover seeks press real D-pad buttons (pointerSource says so) and monstersScreen expires a pending move on the next button, so hovering can drop the Moved line; the move itself lands and shows in the other tab. A ScreenHost focus seam is a MODERATE redesign. | — |
| `R-ctl-15-KEYHOLD` | LOW | ux-a11y | wontfix | Not a defect: InputRouter refcounts D-pad holders across every source (holders map, since ctl-1), so a pointer press's up edge with a key still held is swallowed and the repeat is handed back to the held key. Other buttons do not hold. | — |
| `R-ctl-15-SHEETTOP` | LOW | ux-a11y | resolved-fixed | uif-12 added a real-browser test: with the world action sheet open, a click on the canvas closes it and does nothing else; mutant W05 (pointerTop returns world while screenHost.sheetOpen) would press A and run the sheet row, failing it. Refs: #689 `9a9c13c4`; test `client/e2e/ui-world-sheets.spec.ts` :: "UIF12.4 a real click on the world canvas away from the open sheet closes…". | — |
| `R-ctl-4-X1` | LOW | ux-a11y | wontfix | Surviving mutants only: navRender.ts renderNav already deletes navScrolled, deletes a stale navTab and guards insertBefore; the code is correct and untouched since ctl-4. A missed re-scroll or stale attribute is cosmetic; no plausible player failure justifies the tests. | — |
| `R-ctl-7a-CTL7A.1` | LOW | ux-a11y | resolved-fixed | ctl-13 turned the F9 error overlay into the error toast: its root now carries .mr-toast, which styles.css positions absolute (top-centred, z-index 130), so it no longer sits in page flow after #game-screen. Refs: #572 `5418a2a2`; test `client/src/ui/errorOverlayView.test.ts` :: "CTL13-3-TOAST: the root is a…". | — |
| `R-ctl-7a-EVONOTICEUNDERSHELL` | LOW | ux-a11y | wontfix | By design. The evolutionNotice.ts header puts the banner at z 60, under every frame at 100, so a passive no-focus-trap banner is never reachable behind a modal. It is announced once through the live region on arrival and repaints when the shell closes. | — |
| `R-ctl-7a-MOVEFLAKE` | LOW | loop-ops | resolved-fixed | recenter() was rewritten as a closed loop that steps only from a settled tile (converged) with an explicit 12-step assertion; movement intent then moved to a private table. Refs: #716 #744 `7f691c3c` `8d48f95b`. | — |
| `R-ctl-7b-CTL7A3REST` | LOW (was MED) | ux-a11y | resolved-fixed | uif-10 and uif-16b added Chromium axe scans (wcag2aa tags include color-contrast) over Shop, Heal, Journal, the trade editor and the Profile dialog (rename, claim, privacy sections), so most former index.html shells are now contrast-measured in a real browser. Refs: #688 #697 `62391e4c` `e6d33b7d`; test `client/e2e/ui-screens.spec.ts` :: "UIF10.4 axe is clean on Shop (confirm phase), Heal, an empty Journal and…"; `client/e2e/ui-profile.spec.ts` :: "UIF16B.3 Profile is exactly one live modal dialog named Profile, Tab fro…"; decision "Menu chrome draws from `--mr-*` tokens; the listbox ring stays `#cc5500`". | — |
| `R-ctl-7c-HEALGUARDTEST` | LOW | loop-ops | resolved-fixed | uif-4 added a per-site rejection test with a healParty row: a healParty arm bypassing sendGuarded would not land the rejection on the toast, so it fails. Refs: #678 `9607aaa4`; test `client/src/main.dispatch.test.ts` :: "UIF4.5 a rejected $label send lands on #toast and leaves #status empty". | — |
| `R-ctl-7d-CTL7D.3` | LOW | data-integrity | wontfix | Still true: main.ts dispatch validates only qty (refusedShopQty) for buy and sell. But a bad id needs an adapter bug, has no remote vector, and the server still checks stocking and sell_price. pickShop now comes from the greet button, not a data-shop-id click. | — |
| `R-ctl-8g-CTL8G.1` | LOW | ux-a11y | wontfix | The operator chose lead-monster level, not zone, for the Players tab (#588 D2); the harness spec M-identity-handles.spec.md records the zone absorb as conditional and not activated. Zone name is not a wanted feature. | — |
| `R-ctl-8j-MASHRECRUIT` | LOW | gameplay | resolved-obsolete | attempt_recruit and the 1v1 recruit confirm were removed in bt-17 (64f66cca, #671). A tactical Recruit is a plan action that needs the full AP budget and closes the plan, so a second recruit in the same turn is unaffordable and refused by the rules. Refs: #671 `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-REASONS: each greyed row carries the rules…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-ctl-BINDSYNC` | LOW | ux-a11y | wontfix | Feature idea: operator chose per-browser localStorage bindings (bindingStore mr.controls v1); account sync is a named deferral in console-controls-design.md section 17 targeting the M21b account/platform follow-on. Not built. Decision: "Client UI: virtual buttons, one context stack, one overlay frame". | — |
| `R-ctl-COMPASS` | LOW | ux-a11y | wontfix | Feature idea: Social Players ships zone plus a Nearby badge (socialModel NEARBY_TILES); compass and distance text are a named deferral in console-controls-design.md section 17, revisit only on playtest evidence. Not built. | — |
| `R-ctl-LAYOUTMAP` | LOW | ux-a11y | wontfix | Feature idea: glyphs.ts reads the e.key learned per code with a catalog fallback; getLayoutMap is async and Chromium-only and is a named deferral in console-controls-design.md section 17 (glyphs.ts header says so). No AZERTY report. | — |
| `R-ctl-OBJINTERACT` | LOW | content | wontfix | Feature idea needing content data: game-core interact.rs InteractKind is still Npc, Heal, Player; signs and objects are a named deferral in console-controls-design.md section 17 with the interact_candidates plug point. Belongs to a content milestone. | — |
| `R-ctl-PROXGUARD` | LOW | security-privacy | resolved-fixed | ts-2 gave open_trade_session a within_interact_range guard with one out-of-range string, ts-4 reduced propose_trade to a fixed-error stub, and ts-5 added the same guard to challenge_pvp right after the joined/online checks. DECISIONS records both server guards. Refs: #729 #733 #734 `b40c8d09` `204b6e59` `618a28f2`; test `server-module/src/trading_session_tests.rs` :: "ts2_open_out_of_range_is_one_string_for_zone_distance_and_missing_charac…"; `server-module/src/pvp_tests.rs` :: "ts5_challenge_out_of_range_is_one_string_for_zone_distance_and_missing_c…"; decision "Interaction target: the tile in front, then your own tile". | — |
| `R-ctl-RUN` | LOW | gameplay | wontfix | Feature idea, not a defect: walk speed and hold-to-run are recorded in console-controls-design.md section 17 and M-netcode-presence.spec.md as feel-tuning after that milestone; needs a game-core speed rule and smoothness review. Not built at master. | — |
| `R-ctl-TOUCHWALK` | LOW | ux-a11y | wontfix | Feature idea, out of scope by operator 2026-10-01: touch walking and gestures are a named deferral in console-controls-design.md section 17 and are listed in M-gamepad.spec.md as residual R-ctl-TOUCHWALK. Not built. | — |
| `R-ctl-WELCOME` | LOW | ux-a11y | wontfix | Feature idea cut by the spec review: the hint bar and the generated Help teach controls; the welcome card is a named deferral in console-controls-design.md section 17. Not built (the only first-run UI is the claim-code nudge). | — |
| `R-pgcc-c-RANKEDWIRING` | LOW | loop-ops | wontfix | The ranked listener only feeds the F9 event ring, a diagnostic. The rating baseline and reset are exercised by the booted BT15-3 rating-line test, and rankedStep is unit-tested; the ring push alone has no player effect. | — |
| `R-polish-1-MENUREASONANNOUNCE` | LOW | ux-a11y | wontfix | The step.state.battle branch the mutant targeted no longer exists (menuModel has no battle state); the battle refusal is spoken by refusedInBattle via announceNow and pinned by CTL6C-3-ANNOUNCE-REFUSAL, and the shared feedbackAnnouncement path by POLISH1-P5-MENU-ANNOUNCES. Remaining wish is test-only on unprotected behaviour. | — |
| `R-qf-1-X1` | LOW | ux-a11y | resolved-fixed | uif-1 added a Chromium tooth: ui-chrome.spec.ts focuses #menu-rows and asserts the computed 2px dashed rgb(204,85,0) outline, which kills the @supports-not(outline:auto) bypass in a real browser. Refs: #674 `dde4dffc`; test `client/e2e/ui-chrome.spec.ts` :: "UIF1.1 chip focus: a keyboard-focused chip rings in --mr-focus, and in t…"; decision "Menu chrome draws from `--mr-*` tokens; the listbox ring stays `#cc5500`". | — |
| `R-qf-13-QF13.3` | LOW | ux-a11y | resolved-obsolete | uif-16b made Privacy a section of the one Profile dialog: #privacy-close-btn is gone, the frame's single Close row is last in the column after the Privacy rows, and the frame owns the one initial-focus anchor. The standalone Privacy overlay this criterion targeted no longer exists. Refs: #697 `e6d33b7d`; test `client/src/ui/profileView.test.ts` :: "UIF16B.2 sectionRows() is the Name rows, then the Account rows, then the…"; `client/src/ui/profileView.test.ts` :: "UIF16B.1 show() writes the frame title (menu.profile.title) and the Clos…"; decision "Profile is one dialog; the rename, claim and privacy views are its sections". | — |
| `R-qf-17-E2E-PAYOUT` | LOW | gameplay | resolved-obsolete | The qf-17 KO-win payout lines (battle-rewards) and their store-batch delta derivation were deleted with the 1v1 client in bt-17; the tactical results panel folds rewards from transcript Awards events. E2 already asserts the server wallet credit. Refs: #671 `64f66cca`; test `client/e2e/encounter-battle.spec.ts` :: "E2: fighting to a win by buttons shows the victory title, the server rec…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-3-QF3.3-announce` | LOW | ux-a11y | wontfix | Still silent (monstersScreen act care returns consumed while cooling), but the cooldown reason is visible and part of the focused row's accessible name. No DECISIONS rule mandates a live announcement for a disabled row, and Feed behaves the same way. | — |
| `R-qf-6-PLAYERQUESTPUBLIC` | MED | security-privacy | ask | Still real: schema.rs PlayerQuestRow is public and the client subscribes SELECT * FROM player_quest, so every client sees every player's active quests, steps and completion deletes (npc.rs QuestComplete deletes the row). DECISIONS lists player_quest as public on purpose. Ask: make it private behind an owner-scoped my_quest view? Default: yes. Impact: Any player's client receives every other player's quest list, step progress and the moment each quest completes. | — |
| `R-qf-6-QF6.4` | LOW | ux-a11y | wontfix | The z-index part is gone: uif-4 routes quest-complete to the toast, layered above every shell. The ack is still inferred (statusModel questCompletionAck over batch snapshots); an exact server ack needs a new event table for a rare misstated amount or lost toast on a link drop. Decision: "Four message channels, chosen by one policy table". | — |
| `R-qf-7-QF7.1` | MED | ux-a11y | resolved-obsolete | Legacy Flee button was deleted by qf-7c (57cf7b62, #607), then bt-17 deleted ui/battleView.ts and every 1v1 battle surface (64f66cca, #671). The tactical menu has one Flee root row only. Refs: #607 #671 `57cf7b62` `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-ROWS: the root menu is move, skills, item, recruit, flee, en…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-7-QF7.3` | MED | ux-a11y | resolved-obsolete | qf-7b gated the skills grid behind Fight and bait behind Recruit (fb386b1b, #606); bt-17 then deleted battleView.ts (64f66cca, #671). Tactical commandModel menuRows offers Skills and Recruit as root rows that open their sub-lists, so the command-first shape holds. Refs: #606 #671 `fb386b1b` `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-ROWS: the root menu is move, skills, item, recruit, flee, en…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-7b-CURELIST` | LOW | ux-a11y | resolved-obsolete | cure-item-selector and #renderCureItems went with battleView.ts in bt-17 (64f66cca, #671). The tactical Items root row (commandModel menuRows, greyed Not available) is command-first, and no list renders at rest. Refs: #671 `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-ROWS: the root menu is move, skills, item, recruit, flee, en…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-7b-QF7B.1` | MED | ux-a11y | resolved-obsolete | qf-7c deleted the legacy Flee button, retired battle.action.flee and migrated the e2e (57cf7b62, #607); bt-17 then deleted battleView.ts entirely (64f66cca, #671). Grep finds no battle.action.flee requester at master. Refs: #607 #671 `57cf7b62` `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-ROWS: the root menu is move, skills, item, recruit, flee, en…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-7b-QF7B.3` | MED | ux-a11y | resolved-obsolete | qf-7c added the battle Flee row to QF8_RETIRED (57cf7b62, #607); bt-17 deleted battleView.ts and dropped that legacy row from reachability.test.ts with the surface (64f66cca, #671). Refs: #607 #671 `57cf7b62` `64f66cca`; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-qf-8-QF8.1` | MED | ux-a11y | resolved-fixed | qf-8 deleted all four mouse-only duplicates (To Box/To Party cards, trade-row and PvP buttons, evo-choice) and pinned pointer routes through nav rows; the trade rows were later replaced by ts-* session rows reached the same way. No button construction remains in boxView, tradeView, pvpView, evolutionView. Refs: #604 `b55806da`; test `client/src/ui/reachability.test.ts` :: "QF8-1-EVOLVE-POINTER: from the Evolve list"; `client/src/ui/reachability.test.ts` :: "the Social sheet answers trades and challenges by pointer (qf-8, QF8.1)". | — |
| `R-qf-8-QF8.2` | MED | ux-a11y | resolved-fixed | The QF8_RETIRED sweep now holds every retired duplicate (box, trade, pvp, evolution, Social sheet labels, raising); qf-7c added the legacy battle Flee row, later deleted with the 1v1 BattleView by bt-17. Each row also asserts no native control outside the nav model. Refs: #604 #607 `b55806da` `57cf7b62`; test `client/src/ui/reachability.test.ts` :: "the retired mouse-only duplicates render no more (qf-8, QF8.2)". | — |
| `R-qf-9-STALERAISINGREFS` | LOW | loop-ops | resolved-fixed | Comment-only. qf-8 rewrote evolutionView.ts and pvpView.ts (b55806da, #604), and neither file mentions raisingView, onCare or Care-Train at master. Refs: #604 `b55806da`. | — |
| `R-qf-9-TRAINDOUBLEFEED` | LOW (was MED) | gameplay | wontfix | Not reproducible as a fast double press. The Monsters sheet food A and the Bag picker A both send train and leave that list in the same step (monstersScreen phase back, bagScreen LIST), and btn.repeat is consumed. A second train needs a fresh multi-step navigation, which is a deliberate feed that the server correctly charges. | — |
| `R-rb-107-BYTEBOUND` | LOW (was MED) | security-privacy | wontfix | Bytes are bounded indirectly: row cap times EXPORT_CHUNK_ROWS times row width, and per-player content caps limit row counts. A byte measure would need a scan or new state, and the export rules forbid adding state for the export. This is speculative storage hardening. Decision: "Account deletion and data export". | — |
| `R-rb-107-REJECTWALK` | LOW (was MED) | security-privacy | wontfix | Still true: gate two in request_data_export rejects after the walk, and an Err cannot persist a cooldown. The cost is bounded: playtest_event is capped at 20000 rows, battle_action is retired and near empty, and it only bites in the near-cap band. Gate one already rejects before the walk for the minimum bundle. | — |
| `R-rb-111-CONTENTION` | LOW (was MED) | security-privacy | wontfix | mint_export_stamp refuses only when all 16 ms of the probe window hold live stamps, which needs at least one export per millisecond from many identities. The refusal is retryable and short, and the 60 s cooldown plus admission tiers already bound the burst. Speculative hardening. | — |
| `R-rb-111-STAMPORACLE` | LOW (was MED) | security-privacy | wontfix | The stamp offset leaks at most 4 bits of anonymous third-party export timing, with no identity or content. An owner-scoped probe is impossible because the stamp must be globally unique for the reaper's per-stamp delete bound. Negligible. | — |
| `R-rb-121-DEFER-FOCUS-RECHECK` | LOW (was MED) | ux-a11y | resolved-fixed | ctl-5 added the fire-time check: the deferred-focus timer in openOverlayA11y returns early when connectedInside(root, document.activeElement), exactly the requested skip. Refs: #541 `8e315102`; test `client/src/ui/overlayA11y.test.ts` :: "CTL5-7-DEFER-SKIP-INSIDE: when focus is already on a connected element i…". | — |
| `R-rb-125-X7` | LOW (was MED) | ux-a11y | wontfix | Feature polish, not a defect. The passive reveal banner (evolutionNotice.ts) is the accepted default; a transformation cutscene needs new copy and reduced-motion animation work and belongs to a presentation milestone if the operator wants one. | — |
| `R-rb-128-X1` | LOW (was MED) | ux-a11y | wontfix | Still real: enqueue_move and set_move reject a mid-grace caller, the client does not block input, so a held key jitters and logs one reject per press. There is no desync. The flow is rare and self-inflicted after delete_account, the profile shows the pending banner, and a fix needs a new wasm-exposed predicate. | — |
| `R-rb-132-NEWCOMERSHED` | LOW (was MED) | security-privacy | wontfix | Organic shedding needs about 10,735 live rows, roughly 600 never-credited guest bundles alive within one 7-day TTL, which is implausible at the documented scale. A refused guest moves tier by earning a wallet row (one quest or one won battle). A reserved newcomer floor would add state for the export, which the export rules forbid. Decision: "Account deletion and data export". | — |
| `R-rb-132-WALLETSYBIL` | MED | security-privacy | ask | Wider than filed. ALLOWED_ISSUERS is a placeholder, so provision_or_touch_account creates no account row and every caller draws on the anonymous export tier: about 1,265 throwaway identities a week, each winning one wild battle and requesting one export, can refuse every player's data export for 7 days at a time. A fix needs sign-in or per-identity state, which decision "Account deletion and data export" rules out storing for the export. Ask: accept until a real sign-in issuer ships and make that a launch condition, or bound it sooner? Default: accept as a launch condition. The ledger title says HIGH; its severity field and the earlier triage say MED. Impact: Until sign-in exists, a bot fleet can leave every player unable to export their data for a week at a time; after it, only guests without an account are exposed and claiming one restores the export. | — |
| `R-rb-56-FOLLOWUP-ACC` | MED | ux-a11y | resolved-obsolete | The 1v1 skill buttons and their btn.title were deleted with battleView.ts in bt-17 (64f66cca, #671). The tactical forecast panel shows the hit percent as visible text (tactics.forecast.hit "Hit N%") for the aimed target. Refs: #671 `64f66cca`; test `client/src/tactics/forecast.test.ts` :: "BT11-7-FORECAST-VM-LINES: lines follow type, stab, flank, guard with the…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-rb-57-X4` | LOW (was MED) | ux-a11y | wontfix | Still true: CharacterView sets no accessible properties. But Idle/Walking/Jumping are cosmetic world-sprite states that no decision or interaction depends on. Exposing them would mean opting the world canvas into the Pixi AccessibilitySystem, which is a world-a11y feature, not a defect. | — |
| `R-rb-59-X6` | LOW (was MED) | ux-a11y | resolved-obsolete | The PvP opponent card (#opponentCardEl, vm.pvpOpponentName) was deleted with battleView.ts in bt-17 (64f66cca, #671). The tactical PvP shell has no opponent card and the deploy panel never paints the opponent roster. Refs: #671 `64f66cca`; test `client/src/tactics/commandModel.test.ts` :: "BT11-1-MENU-PVP: in a player battle the menu omits Recruit and Flee and…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle"; decision "The battle frame has one owner per tactical phase". | — |
| `R-rb-73-ABORT-PHANTOM` | MED | data-integrity | wontfix | A phantom needs on_disconnect itself to abort, which only a host or datastore failure can cause (no reachable panic). The module API cannot list the host's live clients, and clearing every player_session at sync_content would run cleanup while other tabs are still connected, the multi-tab bug that last-connection-out gating exists to prevent. Cost outweighs an unreachable trigger. Impact: Only after a host failure during a logout: that player's character stays visible after they leave and their later logouts skip cleanup, until the stale session row is removed by hand. | — |
| `R-rb-73-TOKEN-WEDGE` | LOW (was MED) | security-privacy | wontfix | Anyone holding a live socket as the identity holds the account. Keeping presence rows while that socket lives is correct behaviour. The wild-battle half is now bounded: tactical wild battles auto-flee on idle-clock expiry (clock::expire returns AutoFlee for wild). Trades and challenges have TTL reapers. | — |
| `R-rb-73-WILD-HOLD` | LOW (was MED) | gameplay | resolved-fixed | Every wild battle is now tactical (bt-16 flip). Its deploy window and every turn window arm a scheduled tactical_deadline_fire, and wild expiry returns AutoFlee (game-core tactics/clock.rs expire), so a held or idle wild battle ends without a disconnect. Refs: #627 #668 `96391886` `a1f93f8f`; test `server-module/src/tactics_tests.rs` :: "deadline_fire_at_the_deadline_auto_flees_persists_hp_and_voids_ready_row…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-rb-76-CHALLENGERGRACE` | LOW (was MED) | security-privacy | resolved-fixed | accept_challenge now opens battles only through tactics::start_pvp_tactical, which calls require_subject_not_deleting for both challenger and opponent. A mid-grace challenger's challenge is refused, stays Pending and expires under the 2-minute CHALLENGE_TTL_MS. No battle names the deleting account. Refs: #660 #668 `ccba5d43` `a1f93f8f`; test `server-module/src/pvp_tests.rs` :: "nh_accept_challenge_refuses_a_format_0_or_deleting_challenger_and_keeps_…"; decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle". | — |
| `R-rb-83-CHALLENGELAUNDER` | LOW (was MED) | security-privacy | wontfix | Cancel, accept, re-request is an Active account playing a legitimate battle, and it restarts the grace clock. Nothing is laundered: tactical PvP settlement moves no currency, items or monsters (essence to both sides, rating only), and challenges die after the 2-minute CHALLENGE_TTL_MS. Decision: "Tactical battle privacy is structural, and tactical rows are not exportable". | — |
| `R-rb-86-TICKBOUND` | LOW (was MED) | data-integrity | wontfix | Per-player game caps bound a bundle's rows: about 17 chunks of owner rows plus at most the PLAYTEST_EVENT_CAP 20000 share, so roughly 60 chunks at worst. Sixteen stamps per tick is a few hundred to about a thousand index deletes, well inside a transaction budget. The scenario is speculative. | — |
| `R-ts-2-INBOUNDSCAN` | LOW | security-privacy | wontfix | The scan is bounded. Each inbound row needs a distinct joined opener standing within TALK_RANGE when it opens, with at most MAX_OPEN_TRADE_SESSIONS 4 per opener, one session per pair, a 1h TTL and deletion on disconnect. sessions_of is two btree lookups. An inbound cap would make the victim's session count observable. | — |
| `R-ts-2-ts-2.11` | LOW | security-privacy | wontfix | Only the export clause is open; the three deletion clauses shipped with ts2_deletion_* tests. The manifest classifies trade_session as Erase and exportable false, with a basis: open-only, at most 1h old, live only while both are connected. The Export scope rule lets such a row stay out with its reason recorded. Decision: "Account deletion and data export". | — |
| `R-ts-4-UNSCHEDULEDOFFER` | LOW | data-integrity | resolved-obsolete | No reducer writes trade_offer since ts-4, because propose_trade is a fixed-error stub. Any surviving row is removed by cancel_trade, cancel_trades_on_disconnect when either party's last connection closes, or erase_trade_offers. DECISIONS calls the table drain-only. Refs: #733 `204b6e59`; test `server-module/src/trading_tests.rs` :: "ts4_legacy_reducers_reject_before_any_read"; decision "Economy: bounded balances, headroom before transfer". | — |
| `R-ts-5-RANKEDORDER` | LOW | security-privacy | wontfix | Test-only wish on an inert gate: ranked_enforcement_active() is false until a real issuer exists. DECISIONS says the challenge_pvp order is not a privacy guarantee because walking up yields the same answers. The range-before-observable-guards order is already pinned. Decision: "Interaction target: the tile in front, then your own tile". | — |
| `R-uif-1-WHITEBAND` | LOW | ux-a11y | wontfix | Seen once in headless SwiftShader Chromium only, never on a real GPU, no root cause; the renderer background is a dark colour (viewport.ts appInitOptions), so a white canvas strip points at a software-rasteriser artefact. Not actionable without a GPU reproduction. | — |
| `R-uif-10-CURRENCYLABELS` | LOW | ux-a11y | resolved-obsolete | ts-3 deleted the trade-propose wizard and its currency inputs, and no tradePropose.* catalog keys remain. The session editor names currency with tradeSession.row.coins ('Coins: amount of balance'). The dead static inputs left in index.html are covered by R-ts-3-STATICSHELL. Refs: #730 `4a7c442c`. | — |
| `R-uif-2-DPRONLY` | LOW | ux-a11y | wontfix | Recorded accepted behaviour: the viewport decision states a dpr change with no size change fires no resize in Chromium and the seam stays resize-driven, so the world catches up at the next resize; uiScale ignores dpr, so chrome never goes stale. Decision: "One viewport number scales the world by integers and the chrome continuously". | — |
| `R-uif-6-UIF6.8` | LOW | ux-a11y | wontfix | Only the no-loop clause is unmet: nav.ts wraps every fresh D-pad edge kit-wide (clamps only repeats), and clamping the Party grid breaks pointerSource #provenDriven probing. A wrapping 2x3 grid harms nobody; diverging one grid from the kit rule costs more than it buys. | — |
| `R-uif-7-UIF7.6` | LOW (was MED) | ux-a11y | wontfix | Moved/Fed lines still paint on boxView's own .mr-frame-feedback strip (zero layout height, sticky, so no shift) from the batch-derived vm.feedback; feedbackPolicy rows monsters-move-ok and feed-ok have no producer. Only the channel differs from the toast; the decision already names boxView/raisingView strips as view-owned until they join the seam. Decision: "Four message channels, chosen by one policy table". Impact: A move or feed success shows as a check-marked line on the frame strip instead of a timed toast; nothing is lost or shifted. | — |
| `R-uif-8-UIF8.3` | LOW (was MED) | ux-a11y | wontfix | Same gap as UIF7.6: raisingView #bag-status (.mr-frame-feedback, zero layout height) paints Fed and the battleOnly refusal itself rather than via main.ts route(); feed-ok has no producer. No layout shift, the raising feedback gate is green; only the channel differs. Decision: "Four message channels, chosen by one policy table". Impact: A feed success or battle-only refusal shows on the Inventory frame strip rather than a toast; the player still sees it. | — |
| `R-wap-3-roster-registry-rows` | LOW | content | wontfix | The premise is already guarded: registry.test.ts WAP0.4 fails if any served PNG (a new species' sheet included) lacks exactly one registry row, and the spritesheet eval fails on a species with no files. The frameless backdrop kind is cosmetic naming. Decision: "Every served asset carries a provenance row; image-model output never ships". | — |
| `R-weekly-review-2026-10-02-F5` | LOW | security-privacy | resolved-fixed | propose_trade is now a stub whose only statement returns LEGACY_TRADE_RETIRED, so no offer naming counterparty monsters or items can be created. Trade sessions let each side name only its own assets. Refs: #733 `204b6e59`; test `server-module/src/trading_tests.rs` :: "ts4_legacy_reducers_reject_before_any_read"; `server-module/src/trading_session_tests.rs` :: "ts2_foreign_and_missing_monster_same_error"; decision "Economy: bounded balances, headroom before transfer". | — |
| `R-weekly-review-2026-10-16-F1` | MED | security-privacy | resolved-fixed | The propose_trade wallet and inventory oracle is gone because the reducer reads nothing and returns one fixed error. Session reducers return outcomes that do not depend on the partner's private state. Refs: #733 #729 `204b6e59` `b40c8d09`; test `server-module/src/trading_tests.rs` :: "ts4_legacy_reducers_reject_before_any_read"; `server-module/src/trading_session_tests.rs` :: "ts2_no_oracle_outcome_independent_of_partner_private_state"; decision "Economy: bounded balances, headroom before transfer". | — |
| `R-weekly-review-2026-10-23-F3` | LOW | ux-a11y | wontfix | Still true that releaseAnswered only deletes the key, but renderMenu runs on every menu step and open, so the Social badge corrects on the next press; the request is not re-voiced because the player just acted on it and the rejection is reported by sendGuarded. | — |
| `R-weekly-review-2026-11-06-F2` | LOW (was MED) | gameplay | wontfix | geometry::is_flanked has no side check, and resolve_attack and the wasm flank_of forecast both apply it to every target. But no shipped tactics skill can hit an ally (all 15 are ff_filter Enemies), and design 2.4 literally defines flank by the attacker's side. The flaw is latent and costs nothing today. Decision: "Tactical rule conventions carried from bt-2". Impact: None today. If friendly-fire AoE content ships, an ally standing beside two teammates would take 25 percent more damage from its own side's AoE. | — |
| `R-weekly-review-2026-11-06-F4` | LOW | gameplay | wontfix | Still true that sendGuarded's frozen arm skips onRejected after #send set #inflight and dropped the draft, but a frozen link always ends in a reconnect whose resetPredictionState calls tacticsBattle.reset(), which clears in-flight keys and drafts anyway; the player sees the disconnected notice meanwhile. | — |
| `R-weekly-review-2026-11-06-F5` | LOW | gameplay | wontfix | Friendly fire is an engine mechanic (geometry FfFilter AllButSelf and All, design ff_filter), but all 15 shipped tactics_skills use ff_filter Enemies, so no ally can hit an ally and ledger_of's last-opposite-side-hit credit is unreachable. Settle this with R-bt-9-LEDGERHOME when the fold moves to game-core. Decision: "Tactical settlement derives the reward ledger from the transcript". | — |

### ts-6b-1 — guest-claim erasure, the deletion-gate reason, conversations at challenge accept, the runbook's log caveat
type: feature · tier: hard
category: security-privacy · severity: MED · size: MODERATE
touches: server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/battle.rs, server-module/src/schema.rs, server-module/src/guards.rs, server-module/src/guards_tests.rs, client/src/ui/statusModel.test.ts, client/src/main.dialogueEnded.test.ts, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, docs/runbooks/observability-dr.md
after: [ts-6a]
Closes residuals: `R-weekly-review-2026-10-16-F2`, `R-bt-7-GUESTTACTICAL` (duplicate of `R-weekly-review-2026-10-16-F2`), `R-rb-128-X2`, `R-weekly-review-2026-10-09-F3`, `R-rb-65-RUNBOOK-LOGCAVEAT`

Runs alone: it edits `server-module/src/schema.rs`, a structural path for `mr-disjoint`. The edit is
the doc comments on `erase_tactical_rows` and the `NOT_REKEYED` rationale; no table, column or
reducer signature changes, so there is no `just gen` and no bindings diff.

The claim fix reuses the deletion cascade's two helpers for the retired guest identity. Re-keying
the battle rows onto the account was considered and not chosen: battle rows are listed `NOT_REKEYED`
on purpose, and re-keying needs new helpers. If a test pins the two helpers as reaper-only, the
tester re-points that pin.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-weekly-review-2026-10-16-F2` — In complete_guest_claim, after rekey_all and beside
  purge_export_bundles, call schema::erase_tactical_rows(ctx, guest) then
  battle::anonymize_battles(ctx, guest). Guard 10 already rules out an ongoing battle. Update the
  'only from the reaper' doc comments and the NOT_REKEYED rationale.
- `R-rb-128-X2` — Reword the const to the criterion's string and update the literal in the two
  client test samples.
- `R-weekly-review-2026-10-09-F3` — In accept_challenge, after start_pvp_tactical succeeds, delete
  player_conversation for both the acceptor and the challenger. The client already pops a dialogue
  frame silently when its conversation ends, which hands D-pad/A back to the battle base.
- `R-rb-65-RUNBOOK-LOGCAVEAT` — Add one bullet to section 8: the account_deletion_cascade and
  guest_claim_export_purge lines name the erased or retired Identity and stay in Loki for its 30-day
  retention (section 4).

- **ts-6b-1.1:** WHEN a guest claim completes, THE SERVER SHALL leave no `battle` or
  `battle_summary` row naming the retired guest identity, treating the opponent's side of those rows
  as the deletion cascade does — closes `R-weekly-review-2026-10-16-F2` and its duplicate
  `R-bt-7-GUESTTACTICAL` (`guest_claim_tombstones_the_guests_terminal_battle_and_summary_rows` in
  `server-module/src/accounts_tests.rs`).

- **ts-6b-1.2:** WHEN `require_not_deleting` refuses a caller, THE SERVER SHALL return `account
  deletion requested; this action is unavailable until the deletion is cancelled` for every gated
  reducer — closes `R-rb-128-X2` (`a_mid_grace_caller_gets_the_same_reason_from_move_talk_and_buy`
  in `server-module/src/guards_tests.rs`).

- **ts-6b-1.3:** WHEN a PvP challenge is accepted, THE SERVER SHALL end any open NPC conversation of
  either party in the transaction that starts the battle — closes `R-weekly-review-2026-10-09-F3`
  (`accept_challenge_ends_both_parties_open_conversations` in `server-module/src/pvp_tests.rs`).

- **ts-6b-1.4:** WHEN the runbook lists where an erased identity survives, IT SHALL name the
  deletion-cascade and claim-purge log lines and their 30-day Loki retention — closes
  `R-rb-65-RUNBOOK-LOGCAVEAT` (doc-only; the line names `account_deletion_cascade` and
  `guest_claim_export_purge`, each emitted by a server test the PR cites).

### ts-6b-2 — shop and heal reach: the server checks where the caller stands
type: feature · tier: hard
category: security-privacy · severity: MED · size: MODERATE
touches: game-core/src/interact.rs, game-core/src/interact_tests.rs, server-module/src/economy.rs, server-module/src/economy_tests.rs, server-module/src/raising.rs, server-module/src/raising_tests.rs, docs/DECISIONS.md, server-module/src/guards.rs, server-module/src/pvp.rs, server-module/src/trading_session.rs, server-module/src/battle_tests.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/trading_tests.rs, client/e2e/recruit.spec.ts
after: [ts-6b-1]
Closes residuals: `R-weekly-review-2026-10-02-F2`, `R-ts-5-NOTE1BC25F`

Reopens (serial): `guards.rs`, `pvp.rs` from ts-6b-1.

The reach rule for a shop measures from the NPC's home tile plus its `wander_radius`, because NPCs
wander and an open shop must not strand its customer; the heal rule is `within_interact_range` of
the heal location's tile. The refusal mirrors ts-2.1: one error string, placed before any read of
the caller's private state.

Callers measured at `3278f6b5`: 31 `buy`, `sell` and `heal_party` calls in `economy_tests.rs`,
`raising_tests.rs`, `trading_tests.rs`, `battle_tests.rs` and `monster_mgmt_tests.rs`;
`client/e2e/recruit.spec.ts` is the only e2e that calls these reducers outside the menu flow. Their
fixtures need a character in reach. The menu flows already open the shop through a talk and the heal
through the faced tile.

Decision entry: "Interaction target: the tile in front, then your own tile" gains the server-side
reach rule for shop and heal.

Contract (the tests are written to it; the builder adapts it under `plan-delta:`):
`game_core::interact::within_npc_reach(zone: u32, pos: TilePos, npc_zone: u32, npc_home: TilePos,
wander_radius: u8) -> bool`; `guards::characters_in_interact_range(ctx: &ReducerContext, a:
Identity, b: Identity) -> bool`.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-weekly-review-2026-10-02-F2` — heal_party refuses unless within_interact_range(caller, loc zone
  and tile). Add game-core interact::within_npc_reach (same zone, Manhattan to npc home at most
  TALK_RANGE plus wander_radius) so a wandering NPC never strands an open shop; buy requires an npc
  with Shop(shop_id) in reach, sell any Shop npc in reach.
- `R-ts-5-NOTE1BC25F` — Move characters_in_interact_range(ctx, a, b) into guards.rs as pub(crate);
  pvp::challenge_pvp and trading_session::open_trade_session both call it; delete the inline match
  and the pvp copy.

- **ts-6b-2.1:** WHEN `buy`, `sell` or `heal_party` is called by a character outside reach of the
  offering shop NPC or the heal tile, THE SERVER SHALL reject the call with one error string for
  wrong zone, too far and missing character, before any read of wallet, inventory or cooldown, and
  SHALL change nothing — closes `R-weekly-review-2026-10-02-F2`
  (`buy_and_sell_are_refused_away_from_a_shop_npc_and_accepted_beside_it` in
  `server-module/src/economy_tests.rs`, `heal_party_is_refused_off_the_heal_tile` in
  `server-module/src/raising_tests.rs`, `within_npc_reach_*` in `game-core/src/interact_tests.rs`).

- **ts-6b-2.2:** WHEN `open_trade_session` or `challenge_pvp` judges range, THE SERVER SHALL use one
  shared guard that treats a missing character as out of range — closes `R-ts-5-NOTE1BC25F`
  (`ts2_open_out_of_range_is_one_string_for_zone_distance_and_missing_characters` in
  `server-module/src/trading_session_tests.rs` and
  `ts5_challenge_out_of_range_is_one_string_for_zone_distance_and_missing_characters` in
  `server-module/src/pvp_tests.rs` pass unedited).

- **ts-6b-2.3:** THE existing shop, heal, recruit, trade and PvP flows SHALL pass with their
  characters in reach (`cargo nextest run -p monster-realm-module`, `just e2e`).

### ts-6b-3 — economy debits and one-time rewards
type: feature · tier: hard
category: data-integrity · severity: MED · size: MODERATE
touches: server-module/src/inventory.rs, server-module/src/inventory_tests.rs, server-module/src/trading_session.rs, server-module/src/economy.rs, server-module/src/raising.rs, server-module/src/raising_tests.rs, server-module/src/economy_tests.rs, server-module/src/npc.rs, server-module/src/npc_tests.rs
after: [ts-6b-2]
Closes residuals: `R-ts-2-SWAPCOST`, `R-ts-2-HEALCOSTLOCK`, `R-ts-0b-HEALITEMESCROW` (duplicate of `R-ts-2-HEALCOSTLOCK`), `R-ctl-7d-CTL7D.4`, `R-weekly-review-2026-10-16-F3`

Reopens (serial): `economy.rs`, `economy_tests.rs`, `raising.rs`, `raising_tests.rs`,
`trading_session.rs` from ts-6b-2.

`economy::sell` and `heal_party`'s cost loop repeat `apply_swap`'s one-write-per-unit debit, and
`sell` needs no partner, so the consume-n primitive replaces all three loops.

The reward fix applies "Reject, don't clamp" to `npc::apply_quest_trigger` and
`apply_effects_to_db`: headroom is checked over the whole reward before any write, and the refusal
rolls the talk back so the quest stays completable. The tester confirms the quest-completion
acknowledgement (the quest row leaving while the conversation row is present) is unaffected.

Contract (adaptable under `plan-delta:`): `inventory::consume_n(ctx: &ReducerContext, owner:
Identity, item_id: u32, qty: u32) -> Result<(), String>`; `consume_one` becomes `consume_n(.., 1)`.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-ts-2-SWAPCOST` — Add inventory::consume_n(ctx, owner, item_id, qty): one find, checked_sub(qty)
  reject on shortfall, delete-at-zero, zombie cleanup as consume_one. Route the apply_swap ItemDebit
  arm, economy::sell and heal_party's cost loop through it; consume_one becomes consume_n(…,1).
- `R-ts-2-HEALCOSTLOCK` — In heal_party, before any write and next to evaluate_heal_currency, refuse
  with 'item is in an active trade' when cost_qty exceeds the raw count minus
  escrowed_item_qty_of(caller, cost_item_id).
- `R-ctl-7d-CTL7D.4` — In economy::buy, economy::sell and raising::evaluate_heal_currency, refuse
  the raw shortfall first ('not enough currency' / 'not enough of that item'); return the
  active-trade message only when the raw holding covers the request but the escrow-netted one does
  not.
- `R-weekly-review-2026-10-16-F3` — apply_quest_trigger and apply_effects_to_db return Result;
  before any write they run check_item_headroom and check_currency_headroom over the whole reward;
  talk and choose propagate the Err so the transaction rolls back and the quest stays completable.

- **ts-6b-3.1:** WHEN a reducer debits `qty` units of one item from one owner, THE SERVER SHALL
  remove exactly `qty`, delete a drained stack, and reject a shortfall leaving the stack unchanged,
  through one primitive that `sell`, `heal_party` and `apply_swap` share — closes `R-ts-2-SWAPCOST`
  (`consume_n_removes_the_quantity_deletes_a_drained_stack_and_rejects_a_shortfall_unchanged` in
  `server-module/src/inventory_tests.rs`; the existing sell, heal and swap debit tests pass
  unedited, `ts4_apply_swap_deletes_a_drained_stack_row_and_leaves_a_bystander_untouched` among
  them. The write count is not observable from a test; the per-unit loops leaving is read in
  review).

- **ts-6b-3.2:** IF a heal location's cost item is locked by the caller's confirmed trade side, THEN
  THE SERVER SHALL reject `heal_party` before any write — closes `R-ts-2-HEALCOSTLOCK` and its
  duplicate `R-ts-0b-HEALITEMESCROW`
  (`heal_party_refuses_a_cost_item_locked_by_a_confirmed_trade_session` in
  `server-module/src/raising_tests.rs`).

- **ts-6b-3.3:** IF a buy, sell or heal exceeds the caller's raw holding, THEN THE SERVER SHALL
  reject with a shortfall reason, and SHALL name an active trade only when the raw holding covers
  the request and the escrow-netted holding does not — closes `R-ctl-7d-CTL7D.4`
  (`buy_beyond_the_balance_with_nothing_in_trade_says_not_enough_currency` in
  `server-module/src/economy_tests.rs`, with the sell and heal twins beside it).

- **ts-6b-3.4:** IF a quest or dialogue reward would exceed the receiver's stack or balance cap,
  THEN THE SERVER SHALL reject the call and leave the quest, dialogue, inventory and wallet state
  unchanged — closes `R-weekly-review-2026-10-16-F3`
  (`quest_completion_at_a_full_stack_is_refused_and_the_quest_stays_active` and
  `a_dialogue_reward_at_a_full_stack_is_refused_and_the_dialogue_does_not_advance` in
  `server-module/src/npc_tests.rs`).

### ts-6b-4 — tactical rules have one home: the unit join, deploy slots, strike and AP counts
type: feature · tier: hard
category: netcode-determinism · severity: LOW · size: MODERATE
touches: game-core/src/tactics/content.rs, game-core/src/tactics/content_tests.rs, game-core/src/tactics/mod.rs, server-module/src/tactics.rs, client-wasm/src/lib.rs, game-core/src/tactics/encounter.rs, game-core/src/tactics/encounter_tests.rs, client-wasm/src/tactics_tests.rs, client/src/tactics/wasm.ts, client/src/tactics/wasm.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.accel.test.ts, client/src/main.controls.test.ts, client/src/main.help.test.ts, client/src/main.input.test.ts, client/src/main.reconnectStack.test.ts, client/src/tactics/clock.ts, client/src/tactics/clock.test.ts, client/src/tactics/hud.ts, client/src/tactics/hud.test.ts, client/src/tactics/tacticsBattle.ts, server-module/src/tactics_tests.rs
after: [ts-6b-1]
Closes residuals: `R-bt-11-SHAREDJOIN`, `R-bt-12-DEPLOYCAP`, `R-bt-15-STRIKESMAX`, `R-bt-10-APPIPSMIRROR`

Applies "Rules are written once, in game-core" to four values the client or the server restates. It
changes the client-wasm export surface (`TacticsTuningOut`, one new export), not a SpacetimeDB
table, reducer or generated binding; `client/src/module_bindings/` is untouched.

Most of the client diff is the wasm package stub in the `main.*.test.ts` files, which mirrors
`TacticsTuningOut`.

Contract (adaptable under `plan-delta:`): `game_core::tactics::unit_kit(species, kit, level, stats)
-> UnitKit`; `game_core::tactics::deploy_slots(map) -> u8`; wasm export
`tactics_deploy_slots(map_id: u32) -> u8`; `TacticsTuningOut` gains `autopass_forfeit` and loses
`max_pack`; `clockVM` takes `strikesMax` and `infoBoxes` takes `apMax` as inputs.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-bt-11-SHAREDJOIN` — Add game-core tactics::content unit_kit(species, kit, level, stats) ->
  UnitKit; server TacticsContent::unit_kit and client-wasm unit_of_row both call it. The
  row-to-TacticalUnit field copy stays per shell (row types differ).
- `R-bt-12-DEPLOYCAP` — Add game-core deploy_slots(map) -> u8 beside MAX_PACK; both server sites
  call it; client-wasm exports tactics_deploy_slots(map_id) and the client sizes the deploy panel
  from it; drop max_pack from TacticsTuningOut and the pkg stubs.
- `R-bt-15-STRIKESMAX` — Add autopass_forfeit to client-wasm TacticsTuningOut (tuning_out_of);
  clockVM takes strikesMax as input from tuningOf() in main.ts pumpClock; delete STRIKES_MAX.
- `R-bt-10-APPIPSMIRROR` — infoBoxes takes apMax in its options; tacticsBattle passes
  this.#rulesPort().freshBudget().ap; delete AP_PIPS and use apMax for pips and the aria label.

- **ts-6b-4.1:** WHEN a `battle_unit` row is joined into a `TacticalUnit`, THE SERVER and THE CLIENT
  SHALL build its `UnitKit` through the one game-core function — closes `R-bt-11-SHAREDJOIN`
  (`unit_kit_joins_species_affinity_and_kit_moves_with_the_row_level_and_stats` in
  `game-core/src/tactics/content_tests.rs`; the unit-join comparison in
  `client-wasm/src/tactics_tests.rs` is re-pointed from its hand-written copy to the game-core
  function, and a case in `server-module/src/tactics_tests.rs` holds `TacticsContent::unit_kit`
  equal to it for a content species).

- **ts-6b-4.2:** WHEN the client sizes a deploy panel, THE CLIENT SHALL use the game-core deploy
  slot count the server enforces for that map — closes `R-bt-12-DEPLOYCAP`
  (`deploy_slots_is_the_pack_cap_bounded_by_the_side_a_spawns` in
  `game-core/src/tactics/encounter_tests.rs`; a host test in `client-wasm/src/tactics_tests.rs` that
  the export equals it for every content map; a `client/src/main.dispatch.test.ts` case that the
  deploy panel offers as many slots as the export answers).

- **ts-6b-4.3:** WHEN the PvP strike pips are painted, THE CLIENT SHALL draw as many pips as the
  loaded tuning's `autopass_forfeit` — closes `R-bt-15-STRIKESMAX`
  (`tuning_out_carries_autopass_forfeit` in `client-wasm/src/tactics_tests.rs`; a
  `client/src/tactics/clock.test.ts` case that a view model built with seven strikes paints seven
  pips).

- **ts-6b-4.4:** WHEN the active unit's AP pips are drawn, THE CLIENT SHALL draw the tuning's turn
  AP as read through the rules port — closes `R-bt-10-APPIPSMIRROR` (`the active row draws apMax
  pips from its input` in `client/src/tactics/hud.test.ts`).

### ts-6b-5 — pointer and controller reach: dialogue clicks, the evolution notice, sheet rows, quick Move
type: feature · tier: routine
category: gameplay · severity: MED · size: MODERATE
touches: client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/input/pointerSource.ts, client/src/input/pointerSource.test.ts, client/src/main.ts, client/src/main.controls.test.ts, client/src/ui/noticeModel.ts, client/src/ui/noticeModel.test.ts, client/src/ui/screens/index.ts, client/src/main.notices.test.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/monstersScreen.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts
after: [ts-6b-4]
Closes residuals: `R-weekly-review-2026-10-09-F2`, `R-ctl-13-CTL13.5`, `R-ctl-15-DRIVEN`, `R-ctl-11a-XQUICKMOVE`, `R-pgcc-d-monstersScreen-sentinel`

Reopens (serial): `main.controls.test.ts`, `main.ts` from ts-6b-4.

The dialogue fix gives the guards one home: choice and shop buttons become ordinary nav rows, so a
click is a seek plus A through `dialogueScreen`, and the direct `choice` and `shop` paths leave
`PointerSource` and `main.ts`. The tests that pin the direct path are rewritten by the tester.

The evolution notice is dismissed with B, not the A that ctl-13's criterion named: A at the bare
world is interact, and B already dismisses the error toast and the request banner.

X as quick Move on Monsters is the secondary action M-ui-foundation's control table names for that
screen.

The batch is filed under gameplay for its lead row: a double click on a dialogue choice answers the
next node unread.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-weekly-review-2026-10-09-F2` — Give dialogueView's choice and shop buttons data-nav-key
  (c<idx>, shop) so a click is an ordinary seek plus A through dialogueScreen; delete the choice and
  shop deps from PointerSource and main.ts. One home for the guards.
- `R-ctl-13-CTL13.5` — Add an evolution kind to noticeModel Notice, built from ownEvolutionNotices
  head. Let world B dismiss it as it does the error toast and request banner (worldButton dismiss to
  port.dismiss), sending ackEvolutionNotices(count 1) through the banner's existing generation-token
  lock.
- `R-ctl-15-DRIVEN` — In provenDriven, when the clicked container lies inside the open shown context
  sheet, treat it as driven (or scope elimination to that sheet first, frame second), matching the
  world-sheet rule; leave the tie refusal for two base lists.
- `R-ctl-11a-XQUICKMOVE` — In monstersScreen list phase, X on a monster returns the same
  setPartySlot command and pendingMove as the sheet's Move row; the hint bar lists X Move on
  Monsters reusing box.sheet.move.
- `R-pgcc-d-monstersScreen-sentinel` — Import NEXT_FREE_PARTY_SLOT from ui/boxModel and use it in
  place of the -1 literal (and the header comment).

- **ts-6b-5.1:** WHEN the player clicks a dialogue choice, THE CLIENT SHALL apply the same reveal
  and resend guards as pressing A on it, so a double click sends `advanceDialogue` once — closes
  `R-weekly-review-2026-10-09-F2` (`a double click on a dialogue choice sends advanceDialogue once,
  and a click during the text reveal only finishes the reveal` in
  `client/src/main.controls.test.ts`).

- **ts-6b-5.2:** WHILE an evolution notice is shown at the bare world, WHEN the player presses B,
  THE CLIENT SHALL acknowledge that notice once and show the next — closes `R-ctl-13-CTL13.5` (`B at
  the bare world acknowledges the shown evolution notice once and the next queued notice shows` in
  `client/src/main.notices.test.ts`).

- **ts-6b-5.3:** WHEN the player clicks the only row of a list inside an open context sheet, THE
  CLIENT SHALL press A for that row whatever single-row lists lie under the sheet — closes
  `R-ctl-15-DRIVEN` (`a click on the only row of an open frame sheet presses A even when the base
  list under it has one row` in `client/src/input/pointerSource.test.ts`).

- **ts-6b-5.4:** WHEN the player presses X on a monster in the Monsters list, THE CLIENT SHALL move
  it between Party and Storage as the sheet's Move row does, and the hint bar SHALL list X as Move
  there — closes `R-ctl-11a-XQUICKMOVE` (`X on a Party monster sends the same setPartySlot as the
  sheet Move; X on an empty slot does nothing` in `client/src/ui/screens/monstersScreen.test.ts`).

- **ts-6b-5.5:** WHEN the Monsters screen sends a monster to the party, THE CLIENT SHALL send the
  one exported next-free-slot sentinel, `NEXT_FREE_PARTY_SLOT` — closes
  `R-pgcc-d-monstersScreen-sentinel` (no new test, the two values being equal today: `npm --prefix
  client run typecheck` and the existing Move cases in
  `client/src/ui/screens/monstersScreen.test.ts` pass).

### ts-6b-6 — tactical settlement and wild AI: tests on unreached protected paths, and the dead 1v1 helpers
type: feature · tier: routine
category: gameplay · severity: LOW · size: MODERATE
touches: server-module/src/tactics_settle_tests.rs, game-core/src/tactics/ai_tests.rs, server-module/src/marshal.rs, server-module/src/marshal_tests.rs, server-module/src/content_cache.rs, server-module/src/content_cache_tests.rs, docs/DECISIONS.md
after: [ts-6b-2]
Closes residuals: `R-bt-17-SETTLEFAILPATHS`, `R-bt-4-TERRITORIALTILE`, `R-bt-17-MARSHALTESTONLY`

Reopens (serial): `DECISIONS.md` from ts-6b-2.

Two rows add behaviour tests on protected gameplay no test reaches (level-up, heal and auto-evolve
through a tactical win; a ranged Territorial wild's attack tile). There is no defect to fail on, so
each new test is watched failing once against a deliberate local break that is never committed
(`standards/testing-tdd.md` §Behavior-preserving changes). A test that fails on `master` as it
stands is a defect found: the batch fixes it and says so.

The third row deletes ten `cfg(test)` helpers of the retired 1v1 engine in `marshal.rs` and
`content_cache.rs` with the tests that only exercise them, and amends the sentence about them in
decision "Battles run on one engine at a time; the tactical cutover was a flip, not a toggle".

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-bt-17-SETTLEFAILPATHS` — Add tactical-settle behaviour tests in the existing World fixture: a
  win whose award levels a monster up, a win that leaves one level-only evolution edge eligible, and
  a failed write-back with a fainted party member.
- `R-bt-4-TERRITORIALTILE` — Add the verifier's probe as a behaviour test: a Territorial wild with
  ranged_kit at (3,3) and P1 at (3,1) attacks from its own cheapest tile and does not move away to
  the farthest attack tile.
- `R-bt-17-MARSHALTESTONLY` — Delete the ten cfg(test) helpers and the marshal_tests and
  content_cache_tests cases that only exercise them. tactics_settle_tests keeps its own local
  wild_battle_monster. Amend the DECISIONS cutover entry's sentence about the ten test-only helpers.

- **ts-6b-6.1:** WHEN a tactical win levels up a party monster, THE SERVER SHALL recompute its
  stats, apply the level-up heal and run the evolution check, and IF the HP write-back failed it
  SHALL apply no faint penalty — closes `R-bt-17-SETTLEFAILPATHS`
  (`a_tactical_win_that_levels_a_monster_up_recomputes_stats_heals_and_auto_evolves` and
  `a_failed_write_back_with_a_fainted_member_adds_no_unfavorable_trust` in
  `server-module/src/tactics_settle_tests.rs`, each watched failing once against a local break of
  the path it covers).

- **ts-6b-6.2:** WHEN a Territorial wild has several attack tiles in reach, THE SYSTEM SHALL plan
  the attack from the cheapest tile, never the tile farthest from the player — closes
  `R-bt-4-TERRITORIALTILE`
  (`a_territorial_ranged_wild_attacks_from_the_cheapest_tile_not_the_farthest` in
  `game-core/src/tactics/ai_tests.rs`, watched failing once with Territorial added to the
  farthest-tile stances).

- **ts-6b-6.3:** THE server module SHALL contain no 1v1 marshaling or content-cache helper that only
  tests call — closes `R-bt-17-MARSHALTESTONLY` (`cargo nextest run -p monster-realm-module` and
  clippy pass after the deletion; `marshal_tests.rs` and `content_cache_tests.rs` keep their
  live-helper cases, and the PR lists each deleted test with its reason).

### ts-6b-7 — tactical battle client: spoken turn events, server-time countdowns, results after playback
type: feature · tier: routine
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/main.ts, client/src/tactics/strings.ts, client/src/net/serverClock.ts, client/src/net/serverClock.test.ts, client/src/main.dispatch.test.ts
after: [ts-6b-5]
Closes residuals: `R-weekly-review-2026-11-06-F1`, `R-weekly-review-2026-11-06-F3`, `R-bt-15-CLOCKSKEW` (duplicate of `R-weekly-review-2026-11-06-F3`), `R-bt-12-RESULTSDRAIN`

Reopens (serial): `main.ts` from ts-6b-5; `main.dispatch.test.ts`, `tacticsBattle.ts` from ts-6b-4.

The results panel waits for the shell's playback rather than opening over it, which keeps decision
"The battle frame has one owner per tactical phase".

Contract (adaptable under `plan-delta:`): `client/src/net/serverClock.ts` exports `observe(serverMs:
number, localNowMs: number): void` (the latest window wins) and `now(localNowMs: number): number`;
`TacticsBattleDeps` gains `announce(text: string): void`; `TacticsBattle` exposes `playing:
boolean`.

New files: `client/src/net/serverClock.ts`, `client/src/net/serverClock.test.ts`.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-weekly-review-2026-11-06-F1` — Add an announce dep to TacticsBattleDeps; ingest() announces a
  curated subset (own unit turn start, KO, halt, battle finished) using the existing ticker lines,
  only while visible and not replaying history; main.ts wires it to announceNow.
- `R-weekly-review-2026-11-06-F3` — Add a ServerClock offset estimator fed with each newly opened
  battle_clock window_open_ms at receipt (offset = server ms minus local now, latest window);
  pumpStillThere and pumpClock use Date.now() + offset.
- `R-bt-12-RESULTSDRAIN` — Expose TacticsBattle.playing; refreshBattle defers the results switch
  while the visible shell is playing; the frame pump re-runs refreshBattle once playback drains
  (bounded by CAPS). Keeps one owner at a time.

- **ts-6b-7.1:** WHEN a visible tactical battle ingests an own-turn start, a KO or the battle end,
  THE CLIENT SHALL announce it once through the live region, and SHALL NOT announce damage lines or
  replayed history — closes `R-weekly-review-2026-11-06-F1` (`announces own turn start, a KO and the
  finish through the announce dep but not damage lines or replayed history` in
  `client/src/tactics/tacticsBattle.test.ts`).

- **ts-6b-7.2:** WHILE a battle clock window is open, THE CLIENT SHALL compute the Still-there
  countdown and the PvP clock ring from a server-time estimate, not the raw device clock — closes
  `R-weekly-review-2026-11-06-F3` and its duplicate `R-bt-15-CLOCKSKEW` (`a client clock 60 s behind
  still counts the last minute of a window` in `client/src/net/serverClock.test.ts`; a
  `client/src/main.dispatch.test.ts` case that both pumps read the estimate).

- **ts-6b-7.3:** WHEN a Finished batch arrives while the tactical shell is playing beats, THE CLIENT
  SHALL show the results panel only after the playback drains — closes `R-bt-12-RESULTSDRAIN` (`a
  Finished batch waits for the shell playback to drain before the results panel takes the frame` in
  `client/src/main.dispatch.test.ts`).

### ts-6b-8 — list views keep their rows: Shop, Heal, Journal, Evolve
type: feature · tier: routine
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/shopView.ts, client/src/ui/healView.ts, client/src/ui/questLogView.ts, client/src/ui/evolutionView.ts, client/src/ui/shopView.test.ts, client/src/ui/healView.test.ts, client/src/ui/questLogView.test.ts, client/src/ui/evolutionView.test.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/shopScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts
after: [ts-6b-1]
Closes residuals: `R-ci-fix-20261002T0901Z-VIEWREBUILD`, `R-ctl-8a-CTL8A.2`, `R-uif-10-SHOPFOCUS`, `R-uif-10-TITLES`

Store batches arrive more often in a crowded zone, so a view that rebuilds its rows on every batch
drops pointer presses there. Box, Dialogue and Inventory already skip an unchanged render; the same
guard goes on the four views that still rebuild.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-ci-fix-20261002T0901Z-VIEWREBUILD` — Give each of the four views raisingView's render-key
  guard: compute a key from the view-model rows and skip the row rebuild when it is unchanged (keep
  the kept-paint reapply). Alternatively move the lists onto renderNav's keyed diff.
- `R-ctl-8a-CTL8A.2` — Keep the last NavLayout in ShopScreenState (as bagScreen does) and call
  navReconcile(state.layout, layout, state.nav) in settle.
- `R-uif-10-SHOPFOCUS` — In shopView #apply, after toggling the lists, if document.activeElement
  sits in the now-hidden list move focus to the active list container (else the title).
- `R-uif-10-TITLES` — Add heal.title to catalog.en and catalog.fr. healView paints it as the frame's
  leading h2 through t, resolved at each show so a locale switch applies.

- **ts-6b-8.1:** WHEN a store batch re-renders an open Shop, Heal, Journal or Evolve view whose view
  model is unchanged, THE CLIENT SHALL keep the existing row and control nodes, and a Shop button's
  disabled lock SHALL survive the batch — closes `R-ci-fix-20261002T0901Z-VIEWREBUILD` (`a batch
  render with an unchanged view model keeps the same row and button nodes` in
  `client/src/ui/shopView.test.ts`, with the same case in `healView.test.ts`, `questLogView.test.ts`
  and `evolutionView.test.ts`).

- **ts-6b-8.2:** WHEN the shop row under the cursor disappears, THE CLIENT SHALL re-seat the cursor
  on its nearest neighbour — closes `R-ctl-8a-CTL8A.2` (`selling out the cursor's stack seats the
  cursor on the neighbouring row, not the first` in `client/src/ui/screens/shopScreen.test.ts`).

- **ts-6b-8.3:** WHEN the shop tab changes while focus is in the list being hidden, THE CLIENT SHALL
  move focus to the shown list — closes `R-uif-10-SHOPFOCUS` (`switching tabs with focus on the Buy
  list moves focus to the Sell list` in `client/src/ui/shopView.test.ts`).

- **ts-6b-8.4:** WHEN the heal frame is shown, THE CLIENT SHALL show a localized title bar first —
  closes `R-uif-10-TITLES` (`the heal frame opens with a localized title` in
  `client/src/ui/healView.test.ts`).

### ts-6b-9 — announcements and focus: grace and export edges, repeats, French overlay names, the claim result
type: feature · tier: routine
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/main.ts, client/src/main.privacyWiring.test.ts, client/src/ui/liveRegion.ts, client/src/ui/liveRegion.test.ts, client/src/ui/a11yCopy.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/overlayA11y.test.ts, client/src/ui/overlayA11y.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/catalogShape.test.ts, client/src/ui/i18n/i18nTypes.compile.test.ts, client/src/ui/i18n/resolver.ts, client/src/ui/announcements.ts, client/src/render/world.ts
after: [ts-6b-7, ts-6b-8]
Closes residuals: `R-rb-52-GRACEANNOUNCE`, `R-rb-53-E1`, `R-uif-4-REPEATSAY`, `R-ctl-13-REANNOUNCE` (duplicate of `R-uif-4-REPEATSAY`), `R-weekly-review-2026-10-02-F4`, `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL`, `R-polish-1-CLAIMRESULTCATCHREENTRY`

Reopens (serial): `catalog.en.ts`, `catalog.fr.ts`, `catalog.test.ts`, `catalogParity.test.ts`,
`messageIds.ts` from ts-6b-8; `main.ts` from ts-6b-7.

The repeat fix removes the dedup against the last written text and keeps the merge inside one
coalescing window. Before it lands the builder confirms every `announce` caller is edge-driven; one
that announces on every batch gets its own edge guard in this batch.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-rb-52-GRACEANNOUNCE` — In the frame's change-detected block, when lastPrivacyCountdown.phase is
  active and the new phase is grace, announceNow(privacyBannerLabel(countdown)) once; boot into an
  existing grace (unknown to grace) stays silent.
- `R-rb-53-E1` — In the export onBatchApplied listener, keep the previous assembly; when it was
  incomplete and the new one is complete for the same requestId, announceNow the
  privacy.export.complete line once (a reconnect's none to complete stays silent).
- `R-uif-4-REPEATSAY` — Dedup only against #pending (coalescing inside a window); when the emitted
  text equals the node's current text, alter it invisibly (toggle a trailing U+00A0) so assistive
  technology sees a change. Invert S1-LIVE-DEDUP-CONSECUTIVE.
- `R-weekly-review-2026-10-02-F4` — Move the 17 a11y.* entries into catalog.en.ts and catalog.fr.ts
  (en values unchanged), set A11yKey from the catalog, and make a11yCopy.t delegate to the i18n
  resolver (or delete a11yCopy and repoint its four importers).
- `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL` — Call .focus({ preventScroll: true }) in the
  deferred-focus timer of openOverlayA11y.
- `R-polish-1-CLAIMRESULTCATCHREENTRY` — Use the two-argument form pendingClaim.then(() =>
  onClaimResult(ok), (err) => onClaimResult(rejected)) so the reject arm only sees reducer
  rejections.

- **ts-6b-9.1:** WHEN the account moves from active to deletion grace, including through another
  session's request, THE CLIENT SHALL announce the grace deadline once through the live region, and
  a boot into an existing grace SHALL stay silent — closes `R-rb-52-GRACEANNOUNCE` (`an account
  entering deletion grace is announced once` in `client/src/main.privacyWiring.test.ts`).

- **ts-6b-9.2:** WHEN a data export goes from incomplete to complete, THE CLIENT SHALL announce it
  once through the live region, and a reconnect that replays the chunks SHALL NOT announce it again
  — closes `R-rb-53-E1` (`a data export that finishes assembling is announced once` in
  `client/src/main.privacyWiring.test.ts`).

- **ts-6b-9.3:** WHEN the same announcement is made again after it was spoken, THE CLIENT SHALL
  write it to the live region again, while identical announcements inside one coalescing window
  SHALL still merge — closes `R-uif-4-REPEATSAY` and its duplicate `R-ctl-13-REANNOUNCE` (`a
  repeated identical announcement after the first was painted is written again` in
  `client/src/ui/liveRegion.test.ts`; the suite's consecutive-dedup case is rewritten by the
  tester).

- **ts-6b-9.4:** WHILE the locale is fr, THE CLIENT SHALL name and announce every overlay and the
  world region with the fr catalog copy — closes `R-weekly-review-2026-10-02-F4` (`under the fr
  locale an opened overlay is named and announced in French` in
  `client/src/ui/overlayA11y.test.ts`).

- **ts-6b-9.5:** WHEN the deferred initial focus fires, THE CLIENT SHALL focus the anchor without
  scrolling the frame — closes `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL` (`the deferred initial
  focus does not scroll the frame` in `client/src/ui/overlayA11y.test.ts`).

- **ts-6b-9.6:** IF the claim-success handler throws, THEN THE CLIENT SHALL NOT report the claim as
  rejected — closes `R-polish-1-CLAIMRESULTCATCHREENTRY` (`a throw in the claim-success handler is
  not reported as a claim rejection` in `client/src/net/connection.runtime.test.ts`).

### ts-6b-10 — Social: the row sheet is the kit sheet, Players opens on its panel, the trade confirm names the bond reset
type: feature · tier: routine
category: ux-a11y · severity: MED · size: MODERATE
touches: client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/tradeSessionView.ts, client/src/ui/tradeSessionView.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/e2e/pvp.spec.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/catalogParity.test.ts
after: [ts-6b-9]
Closes residuals: `R-21r-e-E1`, `R-uif-9-UIF9.2`, `R-ctl-8g-CTL8G.1-DEADPATH`

Reopens (serial): `catalog.en.ts`, `catalog.fr.ts`, `catalog.test.ts`, `catalogParity.test.ts`,
`messageIds.ts` from ts-6b-9.

Decision "The Monsters action sheet is one corner-anchored ContextSheet; Summary is a page in the
frame" has Social reuse the kit sheet and its Back row; this batch delivers that.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-21r-e-E1` — When the viewer's own offer lists at least one monster, the confirm prompt uses a
  new key tradeSession.prompt.confirmMonsters (en and fr) adding that traded monsters lose their
  trust and time together with you, even if traded back.
- `R-uif-9-UIF9.2` — Paint the Social row sheet through createContextSheet/renderContextSheet with a
  trailing Back row (kit.sheet.back, BACK_KEY); A on Back takes B's step in socialScreen;
  Decline/Confirm prompts use the confirm variant, No default; update pvp.spec.ts row pin.
- `R-ctl-8g-CTL8G.1-DEADPATH` — Make socialPanel('players') return leaderboardView and drop the
  override in socialScreen paint; delete the players branch in tradeView #applySocial and the
  social.players.placeholder key (en, fr, messageIds, catalog.test).

- **ts-6b-10.1:** WHEN a player is asked to confirm a trade whose own side offers a monster, THE
  CLIENT SHALL state that the monster's trust and quality time reset and are not restored by trading
  back, and a side offering no monster SHALL see the plain prompt — closes `R-21r-e-E1` (`the
  confirm prompt warns of the bond reset only when your offer includes a monster` in
  `client/src/ui/tradeSessionView.test.ts`).

- **ts-6b-10.2:** WHEN the player opens a Social row's sheet, THE CLIENT SHALL render it as the kit
  ContextSheet ending with a Back row whose A closes the sheet and sends nothing — closes
  `R-uif-9-UIF9.2` (`the Social row sheet ends with a Back row whose A closes the sheet and sends
  nothing` in `client/src/ui/screens/socialScreen.test.ts`; `client/e2e/pvp.spec.ts` answers a
  challenge through the sheet).

- **ts-6b-10.3:** WHEN the Social frame opens on Players, THE CLIENT SHALL show the leaderboard
  panel directly, with no trade-root placeholder path — closes `R-ctl-8g-CTL8G.1-DEADPATH`
  (`socialPanel opens the Players tab on the leaderboard panel` in
  `client/src/ui/contextStack.test.ts`).

### ts-6b-11 — frame chrome and Profile: one title bar, no Privacy door, the disclosure in the player's language
type: feature · tier: routine
category: ux-a11y · severity: LOW · size: MODERATE
touches: client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/e2e/ui-whole.spec.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/src/main.accel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.i18n.test.ts, client/src/ui/privacyBanner.ts, client/src/ui/i18n/catalogParity.test.ts, client/e2e/accounts.spec.ts
after: [ts-6b-10]
Closes residuals: `R-uif-17-KITPOLISH`, `R-qf-13-QF13.4`, `R-21r-b2-E1`

Reopens (serial): `catalog.en.ts`, `catalog.fr.ts`, `catalog.test.ts`, `catalogParity.test.ts`,
`messageIds.ts` from ts-6b-10; `main.ts` from ts-6b-9; `main.accel.test.ts`, `main.input.test.ts`
from ts-6b-4.

The disclosure's English wording is the pinned compliance text and does not change; the fr value is
a translation of it, like every other privacy string in the catalog.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-uif-17-KITPOLISH` — Give Monsters, Inventory and Controls the kit mr-frame-titlebar (replacing
  their plain h2) and delete raisingView's inventory h3; update ui-whole AS-SHIPPED title literals.
- `R-qf-13-QF13.4` — Delete #claim-privacy-btn, ClaimViewHandlers.onPrivacy, the main.ts handler and
  the claim.privacyButton catalog/messageId keys; drop the row from claimView rows and the tests
  that click it.
- `R-21r-b2-E1` — Add a catalog key whose en value is the exported constant and whose fr value is
  its translation; privacyView paints it through t() at show(), not in the constructor. The
  byte-identity pin on the English constant is untouched.

- **ts-6b-11.1:** WHEN the Monsters, Inventory or Controls frame shows, THE CLIENT SHALL render its
  title in the one kit title bar, with no repeated in-panel heading — closes `R-uif-17-KITPOLISH`
  (`the Inventory frame has one title bar and no in-panel heading` in
  `client/src/ui/raisingView.test.ts`, with the same case in `boxView.test.ts` and
  `controlsView.test.ts`; `client/e2e/ui-whole.spec.ts` measures the three titles).

- **ts-6b-11.2:** WHEN Profile shows the Account section, THE CLIENT SHALL offer no separate Privacy
  door, Privacy staying reachable as its own section — closes `R-qf-13-QF13.4` (`the Account
  section's rows are its claim actions only, with no privacy door` in
  `client/src/ui/claimView.test.ts`).

- **ts-6b-11.3:** WHILE the locale is fr, THE CLIENT SHALL show the pseudonymization disclosure in
  French, and the English text SHALL stay byte-identical to the pinned wording — closes
  `R-21r-b2-E1` (`the privacy disclosure follows the locale` in
  `client/src/ui/privacyView.i18n.test.ts`, which replaces that file's stays-raw case; the
  byte-identity case in `client/src/ui/privacyBanner.test.ts` passes unedited).

### ts-6b-12 — retired trade and launcher markup
type: feature · tier: routine
category: ux-a11y · severity: LOW · size: MODERATE
touches: client/index.html, client/src/indexShell.smoke.test.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/careAction.ts, client/src/ui/screens/bagScreen.boot.test.ts, client/src/ui/screens/journalScreen.boot.test.ts, client/src/ui/tradeSessionModel.ts, client/src/ui/tradeSessionModel.test.ts, client/src/ui/screens/tradeSessionScreen.ts, client/src/ui/screens/tradeSessionScreen.test.ts, client/src/ui/tradeSessionView.test.ts, client/src/ui/feedbackPolicy.ts, client/e2e/trade.spec.ts, client/src/main.controls.test.ts, client/src/main.chips.test.ts, client/src/main.a11yFocus.test.ts, client/e2e/movement-input.spec.ts, client/e2e/a11y.spec.ts, client/src/ui/feedbackPolicy.test.ts, client/e2e/ui-screens.spec.ts, client/src/main.input.test.ts, client/src/main.reconnectStack.test.ts, client/src/ui/hintBar.test.ts
after: [ts-6b-11]
Closes residuals: `R-ts-3-STATICSHELL`, `R-ts-4-CLIENTDEADENDS`, `R-ctl-15-LAUNCHERATTR`

Reopens (serial): `main.input.test.ts` from ts-6b-11; `tradeSessionView.test.ts` from ts-6b-10;
`main.controls.test.ts` from ts-6b-5; `main.reconnectStack.test.ts` from ts-6b-4.

Deletions only. The shell keeps its element ids: renaming them touches 19 files and a player sees
nothing.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-ts-3-STATICSHELL` — Strip the dead static children from the #tradepropose-overlay shell,
  leaving only the Close button. Update the indexShell smoke rosters and reword the stale comments.
  Keep the ids: a rename touches 19 files and the player sees nothing.
- `R-ts-4-CLIENTDEADENDS` — Delete legacyOfferMonsterIds and its check, the trade-answered and
  trade-settled feedback kinds and their policy rows, careAction's onRejected, and the four unused
  trade-overlay nodes with their e2e existence assertions.
- `R-ctl-15-LAUNCHERATTR` — Delete both attributes and the delegate comment from index.html, drop
  their pins in indexShell.smoke.test.ts, select #chip-start by id in main.controls.test.ts, and
  rewrite the stale delegate comments to the pointer dispatcher.

- **ts-6b-12.1:** WHEN the page loads, THE CLIENT SHALL ship the trade editor shell with no retired
  wizard control — closes `R-ts-3-STATICSHELL` (deletion only, with no new roster assertion:
  `client/src/indexShell.smoke.test.ts` passes once its pins on the deleted nodes are dropped, and
  `tradeSessionView.test.ts` and `client/e2e/trade-session.spec.ts` pass unedited).

- **ts-6b-12.2:** THE CLIENT SHALL carry no input, message kind or DOM node that only the retired
  offer path produced, and a monster in another session SHALL stay blocked from an offer — closes
  `R-ts-4-CLIENTDEADENDS` (the eligibility cases in `client/src/ui/tradeSessionModel.test.ts`; `npm
  --prefix client run typecheck`; `client/e2e/trade.spec.ts` passes without the four retired nodes).

- **ts-6b-12.3:** THE hint-bar chips SHALL carry no markup attribute that no code reads, and a click
  on a chip SHALL still press its button — closes `R-ctl-15-LAUNCHERATTR`
  (`client/src/main.chips.test.ts`, `client/src/main.controls.test.ts` and `client/e2e/a11y.spec.ts`
  pass selecting the chips by id).

### ts-6b-13 — unread view members and the heal fallback
type: feature · tier: routine
category: ux-a11y · severity: LOW · size: MODERATE
touches: client/src/ui/healModel.ts, client/src/ui/healModel.test.ts, client/src/ui/screens/types.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/ui/feedbackPolicy.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/boxView.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/boxView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/raisingView.ts, client/src/main.controls.test.ts, client/src/ui/feedbackPolicy.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/resolver.test.ts, client/src/ui/reachability.test.ts
after: [ts-6b-12]
Closes residuals: `R-ctl-10a-HEALTARGET`, `R-ctl-10a-BOXCB`, `R-ctl-10b-PVPCB`, `R-ctl-10b-PVPPLAYERS`, `R-qf-9-RAISINGVESTIGES`

Reopens (serial): `main.controls.test.ts`, `feedbackPolicy.test.ts`, `feedbackPolicy.ts` from
ts-6b-12; `main.ts`, `boxView.test.ts`, `boxView.ts`, `catalog.en.ts`, `catalog.fr.ts`,
`catalog.test.ts`, `catalogParity.test.ts`, `messageIds.ts`, `raisingView.ts` from ts-6b-11;
`reachability.test.ts` from ts-6b-10; `main.dispatch.test.ts` from ts-6b-7.

Deletions only; the compiler proves each member has no reader. `BoxViewCallbacks.onSetPartySlot`,
`partySlotNone` and `PvpViewCallbacks.onAccept`, `onDecline`, `onCancel` are documented as unread
since qf-8 and leave in the same edit where the type checker agrees.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-ctl-10a-HEALTARGET` — Delete healTargetLocationId and its tests; make healParty.locationId
  required; delete the dispatch undefined branch, the heal-unavailable kind and
  chrome.status.healUnavailable catalog/messageId entries and the absent-id dispatch tests.
- `R-ctl-10a-BOXCB` — Delete onHealParty from BoxViewCallbacks and the overlayA11yWiring.test.ts
  argument; drop the now-moot Object.hasOwn onHealParty probes in main.dispatch.test.ts and
  boxView.test.ts.
- `R-ctl-10b-PVPCB` — Delete onChallenge from PvpViewCallbacks and the test fixtures that pass it.
- `R-ctl-10b-PVPPLAYERS` — Remove challengeablePlayers, PvpChallengeablePlayer and the
  busyIdentities loop from buildPvpChallengeViewModel (the name map stays for names); update
  pvpView.test.ts fixtures.
- `R-qf-9-RAISINGVESTIGES` — Drop the _retired parameter and its comment from RaisingView's
  constructor, and drop the second argument at overlayA11yWiring.test.ts. Keep buildRaisingViewModel
  as it is.

- **ts-6b-13.1:** WHEN a heal frame issues `healParty`, THE CLIENT SHALL always carry the bound
  location id, with no first-location fallback path — closes `R-ctl-10a-HEALTARGET` (`npm --prefix
  client run typecheck` with `locationId` required; `client/src/main.dispatch.test.ts`,
  `client/src/ui/screens/healScreen.test.ts` and the catalog parity suite pass).

- **ts-6b-13.2:** THE Box view SHALL declare no heal callback, the Box Heal Party control being
  retired — closes `R-ctl-10a-BOXCB` (`npm --prefix client run typecheck`;
  `client/src/ui/boxView.test.ts` and `client/src/ui/overlayA11yWiring.test.ts` pass).

- **ts-6b-13.3:** THE PvP view SHALL declare no challenge-initiate callback, a challenge starting
  only face to face — closes `R-ctl-10b-PVPCB` (`npm --prefix client run typecheck`;
  `client/src/ui/pvpView.test.ts` and `client/src/ui/overlayA11yWiring.test.ts` pass).

- **ts-6b-13.4:** THE CLIENT SHALL compute challenge-busy players in one place,
  `interactModel.pendingChallengeIdentities` — closes `R-ctl-10b-PVPPLAYERS` (`npm --prefix client
  run typecheck`; `client/src/ui/pvpModel.test.ts` and `client/src/ui/pvpView.test.ts` pass without
  `challengeablePlayers`).

- **ts-6b-13.5:** THE CLIENT SHALL construct `RaisingView` from its parent element only — closes
  `R-qf-9-RAISINGVESTIGES` (`npm --prefix client run typecheck`; `client/src/ui/raisingView.test.ts`
  and `client/src/ui/overlayA11yWiring.test.ts` pass).

### ts-6b-14 — comment, doc and test-infrastructure accuracy; closes the sweep
type: feature · tier: hard
category: loop-ops · severity: LOW · size: MODERATE
touches: server-module/src/guards.rs, server-module/src/movement.rs, server-module/src/schema.rs, server-module/src/monster_mgmt_tests.rs, game-core/src/trading/rules.rs, client/e2e/wallet-balance.spec.ts, client/index.html, client/src/ui/screens/worldScreen.test.ts, client/src/ui/screens/requestHost.test.ts, .claude/skills/spacetimedb-client/SKILL.md, ops/observability/rules/recording.rules.yml, ARCHITECTURE.md, game-core/src/tactics/golden.rs, game-core/src/tactics/golden_tests.rs, client/src/ui/overlayA11y.ts, client/src/ui/overlayA11y.test.ts, client/src/main.accel.test.ts, client/src/main.input.test.ts, client/src/main.a11yFocus.test.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/ui/menuView.ts, client/src/main.battle-reseed.test.ts, client/src/ui/dialogueModel.ts, client/src/ui/screens/healScreen.ts, client/src/net/rowConvert.ts, client/src/ui/contextStack.test.ts, game-core/src/npc/mod.rs, .github/workflows/ci.yml, client/playwright.config.ts
after: [ts-6b-1, ts-6b-2, ts-6b-3, ts-6b-4, ts-6b-5, ts-6b-6, ts-6b-7, ts-6b-8, ts-6b-9, ts-6b-10, ts-6b-11, ts-6b-12, ts-6b-13]
Closes residuals: `R-ts-4-STALECOMMENTS`, `R-21r-e-E2`, `R-bt-11-DOCROT`, `R-ctl-11b-STALENARRATION`, `R-ctl-7a-CTL7A.4`, `R-pgcc-c-RESEEDDOCBLOCK`, `R-qf-6-QF6.1`, `R-ctl-10a-DOCS`, `R-ci-fix-20261002T0501Z-E2EARTIFACTS`, `R-ci-fix-20261101T0505-CTXSTACK-FLOOR`

Runs alone, as the last batch: it edits comment text in `server-module/src/schema.rs`, a structural
path for `mr-disjoint`. No table, column or reducer signature changes.

Every comment states current behaviour and its present-tense reason. A site another batch already
rewrote is skipped; the PR lists the sites it found.

`game-core/src/trading/rules.rs` still holds the propose-era rules with no caller
(`validate_proposal`, `authorize_respond`, `authorize_confirm`); their deletion is the legacy-path
follow-up in §Scope's named deferrals, so this batch leaves them in place.

Suggested change per row (the root cause is in the triage table; the builder adapts the change under
the Fix-batch contract):

- `R-ts-4-STALECOMMENTS` — Rewrite the comments to name the session reducers or the drain-only path;
  drop trade_offer from the skill's subscription list; replace the retired reducer names in the two
  recording-rule regexes with open_trade_session, set_trade_offer and confirm_trade_session.
- `R-21r-e-E2` — Reword both comments to the present rule: an NPC never leaves its home zone, so
  npc.zone_id equals character.zone_id from spawn on and the wander step never writes zone_id.
- `R-bt-11-DOCROT` — List the tactics_* export family (and terrain_kinds) in ARCHITECTURE.md's
  client-wasm section and drop the BT11.7 forward references in golden.rs and golden_tests.rs.
- `R-ctl-11b-STALENARRATION` — Rewrite the comments and the assertion message to state the current
  rule (a key whose target is outside #game-screen is the browser's) with no reference to the
  deleted worldHasFocus.
- `R-ctl-7a-CTL7A.4` — Reword the #help-hint z-index comments in evolutionNotice.ts and its test to
  name the hint bar; drop the in-flow remark in menuView.ts.
- `R-pgcc-c-RESEEDDOCBLOCK` — Reword the comments to name battleEmitModel latches and cite symbols
  not lines.
- `R-qf-6-QF6.1` — Rewrite the comment: a refused advance dismisses the overlay; the next attempt
  re-talks.
- `R-ctl-10a-DOCS` — Reword the five comments to the current Face-and-Y interact flow; drop the
  prompt claim on TALK_RANGE.
- `R-ci-fix-20261002T0501Z-E2EARTIFACTS` — Set use.trace retain-on-failure in playwright.config.ts;
  in ci.yml e2e-shard add an if failure upload-artifact step for client/test-results and
  /tmp/stdb.log.
- `R-ci-fix-20261101T0505-CTXSTACK-FLOOR` — Seed the fc.assert run so the generated sample, and with
  it the two non-vacuity floors, is the same on every run. Lowering the floors under the measured
  minimum is the fallback if a seeded run loses cases the oracle needs.

- **ts-6b-14.1:** WHEN a comment, skill file or recording rule names a trade reducer, IT SHALL name
  a live trade-session reducer or the drain-only offer path — closes `R-ts-4-STALECOMMENTS`
  (`mr-comment-scan` is CLEAN on the diff; the observability rules check the repository runs on
  `recording.rules.yml` passes; the server, game-core and client suites pass).

- **ts-6b-14.2:** THE comments on the `Npc` table and the NPC wander step SHALL describe an NPC's
  zone as fixed at its home zone — closes `R-21r-e-E2` (comment-only; `mr-comment-scan` CLEAN and
  the server `movement_tests` suite passes).

- **ts-6b-14.3:** THE client-wasm section of `ARCHITECTURE.md` SHALL name the export families
  client-wasm ships, and the golden harness docs SHALL describe the harness as it is — closes
  `R-bt-11-DOCROT` (doc-only; `mr-comment-scan` CLEAN and the game-core `golden_tests` suite
  passes).

- **ts-6b-14.4:** THE focus-rule comments and the assertion message in the overlay a11y files SHALL
  state the current rule and name no deleted function — closes `R-ctl-11b-STALENARRATION`
  (comment-only; `client/src/ui/overlayA11y.test.ts` and `client/src/main.a11yFocus.test.ts` pass).

- **ts-6b-14.5:** THE comments in the evolution notice and menu view files SHALL name only elements
  that exist — closes `R-ctl-7a-CTL7A.4` (comment-only; `client/src/ui/evolutionNotice.test.ts`
  passes).

- **ts-6b-14.6:** THE comments in the battle reseed test SHALL describe the latch code that exists
  and cite symbols, not line numbers — closes `R-pgcc-c-RESEEDDOCBLOCK` (comment-only;
  `client/src/main.battle-reseed.test.ts` passes).

- **ts-6b-14.7:** THE wallet-balance e2e comments SHALL describe a refused advance as dismissing the
  overlay — closes `R-qf-6-QF6.1` (comment-only; `client/e2e/wallet-balance.spec.ts` passes).

- **ts-6b-14.8:** THE interact comments in the client and in game-core `npc` SHALL describe the
  face-and-Y interact flow and name no removed key or function — closes `R-ctl-10a-DOCS`
  (comment-only; `cargo nextest run -p game-core` and the client vitest suite pass).

- **ts-6b-14.9:** WHEN an e2e shard fails, THE CI job SHALL keep the Playwright traces and the
  SpacetimeDB log as a run artifact — closes `R-ci-fix-20261002T0501Z-E2EARTIFACTS` (CI config; the
  PR links a deliberately failed shard run on the branch that carries the artifact).

- **ts-6b-14.10:** THE reconcile property test SHALL run from a fixed seed, so its generated sample
  and its non-vacuity floors are the same on every run — closes
  `R-ci-fix-20261101T0505-CTXSTACK-FLOOR` (test infrastructure: the seed is passed in the
  `fc.assert` options of `reconcile over generated stacks of stamped, unstamped and foreign-battle
  frames follows the independent oracle and is idempotent` in `client/src/ui/contextStack.test.ts`,
  and the suite passes).

- **ts-6b-14.11:** WHEN this batch merges, NO residual in the ts-6a triage table SHALL still be open
  in `mr-gates residuals list --json` (each closed as fixed with a PR or as wontfix with a reason),
  and `just ci` and `just e2e` SHALL be green on `master`; that merge closes the milestone.
