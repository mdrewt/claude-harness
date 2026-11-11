# Spec: M-trade-sessions — multi-stage trade sessions

**Status:** elaborated 2026-11-10 against monster-realm `master` @ `efefab5d` (M-stack-ownership
so-2, M-ui-foundation, M-battle-tactics and M-world-art-pass all merged) · 7 slices, head `ts-0a` ·
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

Order: ts-0a ‖ ts-0b ‖ ts-1 → ts-2 → ts-3 → ts-4 → ts-5. Concurrency-eligible pairs (the seed
trio) are file-disjoint per `mr-disjoint`; only ts-2 touches structural surfaces (schema, bindings),
and it has no concurrent partner. Serially ordered slices may reopen a file their ancestor touched;
each such reopen is named in the later slice.

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
counterparty `trade_offer` iterator and calling the existing pure predicate. Every call site
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
touches: server-module/src/trading_session.rs, server-module/src/trading_session_tests.rs, server-module/src/schema.rs, server-module/src/guards.rs, server-module/src/guards_tests.rs, server-module/src/monster_mgmt.rs, server-module/src/monster_mgmt_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/lib.rs, server-module/src/lifecycle_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/privacy_enforcement_tests.rs, client/src/module_bindings/*, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, evals/baselines/client-visible-tables.json, evals/baselines/client-callable-reducers.json, docs/DECISIONS.md, ARCHITECTURE.md
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

### ts-4 — retire the legacy propose path; move the hook specs onto sessions
type: feature · tier: hard
category: trade/security-privacy · severity: HIGH · size: MODERATE
touches: server-module/src/trading.rs, server-module/src/trading_tests.rs, server-module/src/tactics_tests.rs, server-module/src/privacy_enforcement_tests.rs, .cargo/mutants.toml, evals/account-e2e.eval.mjs, client/src/main.ts, client/src/main.*.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/e2e/trade-full.spec.ts, client/e2e/trade-interlock.spec.ts, client/e2e/trade-zz-negative.spec.ts, client/e2e/monster-privacy.spec.ts, docs/DECISIONS.md, ARCHITECTURE.md
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
L237–243). Decision entries: "Economy" drops "a trade offer from the client can only request
currency"; "Table privacy" keeps `trade_offer` public with a drain-only note.

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
