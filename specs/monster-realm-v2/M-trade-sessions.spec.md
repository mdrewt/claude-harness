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

Order: ts-0a ‖ ts-0b ‖ ts-1 → ts-2 → ts-3 → ts-4 → ts-5 → ts-6a → the `ts-6b-K` batches ts-6a
writes. The milestone closes on the last `ts-6b-K` batch, not on ts-5. Concurrency-eligible pairs (the seed
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

### ts-6a — residual sweep, part 1: triage every open residual and section the fix batches
type: design · tier: hard
category: residuals/triage · severity: MED · size: HEAVY
touches: specs/monster-realm-v2/M-trade-sessions.spec.md, specs/monster-realm-v2/residuals.spec.md
after: [ts-5]

Operator directive (2026-11-10, restated 2026-11-11): one sweep over every open residual, closing
the current milestone, with the goal of improving the game overall, not of emptying a list. This
slice is the investigation half. It reads the game repo at `origin/master` (read-only) and writes
only this spec and `residuals.spec.md`.

**Scope.** Every row in the snapshot below, plus every residual opened after it and still open at
launch (`mr-gates residuals list --json`, `open[]`), except a row a live, unbuilt slice of another
milestone names as its closing slice. The three rows this milestone's §Residual map assigns to
ts-4/ts-5 are excluded from the snapshot; if one is still open at launch, it is triaged like any
other row.

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
issues; then the fix batches are this milestone's next unbuilt slices.

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

#### Residual snapshot (2026-11-11, 160 open rows; the ts-4/ts-5 three excluded)

**security-privacy** (5):
- `R-weekly-review-2026-10-02-F2` MED — buy/sell/heal_party enforce no server-side proximity (talk does)
- `R-qf-6-PLAYERQUESTPUBLIC` MED — player_quest is a public table: other players' completed quests are reconstructible f…
- `R-bt-7-SUMMARYEXPORT` MED — battle_summary and player_formation are personal data excluded from the export bundle
- `R-bt-7-GUESTTACTICAL` LOW — guest-claim leaves terminal tactical rows and battle_summary under the retired guest…
- `R-bt-7-QUEUEVOIDED` LOW — QueueVoided events reveal to the opponent that a READY plan existed on a KO'd unit

**data-integrity** (8):
- `R-weekly-review-2026-10-09-F1` MED — Practice self-battles are an uncapped currency/XP faucet (grant_currency not practice…
- `R-weekly-review-2026-10-16-F2` MED — Guest claim orphans the guest's last terminal battle row — never exported, never anon…
- `R-21r-a-TERMINALSWEEP` LOW — Recruit success never sweeps the player's prior terminal battle rows
- `R-ctl-7d-CTL7D.3` LOW — buy, sell and pickShop send shop and item ids the reducer u32 cannot carry
- `R-weekly-review-2026-10-16-F3` LOW — Quest and dialogue rewards silently clamp at stack/balance caps; one-time reward over…
- `R-bt-8-CASCADESCHED` LOW — Cascade deletes of the three tactical schedule tables are not exercised by the cascad…
- `R-weekly-review-2026-11-06-F5` LOW — KO reward ledger credits friendly-fire kills to the last enemy hitter
- `R-bt-17-UNDOWILDSTART` LOW — undo_wild_start leaves battle_unit/event/queue rows when a late step of start_wild_ta…

**netcode-determinism** (10):
- `R-weekly-review-2026-10-02-F1` MED — Pre-battle move queue survives the battle and self-executes afterwards
- `R-weekly-review-2026-10-23-F2` MED — Reconnect backoff never climbs on connect-then-drop-before-applied: clients retry a r…
- `R-21r-e-E2` LOW — Two comments still call NPC zone crossings deferred work (M12c) after DECISIONS.md ru…
- `R-bt-9-LEDGERHOME` LOW — Reward-ledger fold and killer attribution live in the server shell, not game-core rew…
- `R-bt-11-RULEHOME` LOW — Two rule predicates restated in client-wasm: STAB (combat/damage.rs:69) and the statu…
- `R-bt-11-SHAREDJOIN` LOW — The battle_unit row -> TacticalUnit / TacticalState join exists three times (server-m…
- `R-bt-12-DEPLOYCAP` LOW — the deploy slot cap min(MAX_PACK, spawn_a.len()) lives in three places
- `R-bt-12-INITPARITY` LOW — no test compares the client's next-round initiative forecast with the server's upkeep…
- `R-bt-12-SHELLKIND` LOW — shellKind and the countdown's kind === 'Wild' restate game-core's BattleKind::uses_pv…
- `R-bt-15-STRIKESMAX` LOW — STRIKES_MAX (the strike-pip count) mirrors game-core TacticsTuning.autopass_forfeit i…

**gameplay** (33):
- `R-ctl-12-CTL12.1` MED — WHEN Options › Controls opens, THE SYSTEM shall show tabs Buttons (12 rows) and Short…
- `R-ctl-12-CTL12.6` MED — WHEN a player remaps A to K and reloads the page, THE SYSTEM shall confirm with K and…
- `R-ctl-13-CTL13.5` MED — WHEN an evolution notice arrives, THE SYSTEM shall show it as a prompt that A dismiss…
- `R-weekly-review-2026-10-09-F2` MED — Pointer click on a dialogue choice bypasses adapter guards; double-click advances two…
- `R-weekly-review-2026-10-23-F1` MED — join_game re-grants a starter whenever the identity owns zero monsters: trade-away +…
- `R-qf-9-TRAINDOUBLEFEED` MED — No client in-flight lock on Train: a fast double Feed from the Monsters sheet or Bag…
- `R-qf-7-QF7.1` MED — THE legacy Flee button shall NOT render — the command list's Run is the only flee aff…
- `R-qf-7-QF7.3` MED — THE skills/move list shall render only after Fight is selected, and THE bait list onl…
- `R-qf-8-QF8.1` MED — THE four remaining mouse-only duplicates — `To Box`/`To Party` cards, trade-row actio…
- `R-qf-8-QF8.2` MED — A reachability-style sweep shall assert that none of the seven enumerated duplicates…
- `R-qf-7b-QF7B.1` MED — THE legacy Flee button shall NOT render — the command list's Run is the only flee aff…
- `R-qf-7b-QF7B.3` MED — THE battle Flee row shall join `reachability.test.ts`'s `QF8_RETIRED` sweep, completi…
- `R-weekly-review-2026-11-06-F2` MED — Flank damage bonus applies to friendly-fire targets
- `R-uif-7-UIF7.6` MED — WHEN a feed or move succeeds, THE view's success line shall appear through the toast…
- `R-uif-8-UIF8.3` MED — WHEN a feed succeeds or a battle-only item is refused, THE view's line shall use its…
- `R-uif-9-UIF9.2` MED — WHEN A opens a row's sheet, IT shall render as the ContextSheet with a last Back row,…
- `R-21r-a-FAINTPENALTY` LOW — Recruit success skips the wild-battle faint trust penalty
- `R-21r-a-CONTENTLOAD` LOW — attempt_recruit loads content after consuming bait and rolling
- `R-ctl-RUN` LOW — Walk speed / hold-to-run (playtest r2-088/090)
- `R-ctl-7d-CTL7D.4` LOW — sell answers a quantity above the owned count with an escrow message
- `R-ctl-10a-HEALTARGET` LOW — healModel.healTargetLocationId is dead; healParty.locationId still optional
- `R-qf-6-QF6.4` LOW — quest ack: exact server-side acknowledgement channel (merged-flush amount, lost ack o…
- `R-qf-7b-CURELIST` LOW — Battle Bag cure list renders at rest (ungated by Bag) while skills, bait and bench ar…
- `R-qf-17-E2E-PAYOUT` LOW — Live-server e2e assertion on the KO-win payout lines
- `R-bt-4-TERRITORIALTILE` LOW — Territorial attack-tile key covered only with melee kits (verifier survivor A)
- `R-bt-10-APPIPSMIRROR` LOW — AP_PIPS=6 mirrors Tuning::ap_turn
- `R-bt-9-RECRUITHEADROOM` LOW — No monster-storage headroom rule exists; recruit headroom is 'the unit has an owner'
- `R-ci-fix-20261101T0505-ID0-ROWS` LOW — shopOpenModel STEP-TABLE covers shop id 0 at only 2 of its truthiness sites
- `R-bt-11-ITEMROW` LOW — Command menu Item row is greyed 'Not available yet' while the server refuses Item ent…
- `R-weekly-review-2026-11-06-F4` LOW — Locally declined tactical submit keeps the unit locked and discards the draft
- `R-bt-17-PVPHPOK` LOW — settle_pvp_battle's hp_ok conjunction has no killing test (pre-existing nightly survi…
- `R-bt-17-SETTLEFAILPATHS` LOW — settlement failure paths lack killing tests: faint penalty on a failed write-back, cr…
- `R-uif-6-UIF6.8` LOW — WHEN the Party tab shows, ITS six slots shall render as a 2-column, 3-row grid with n…

**content** (5):
- `R-bt-6-BT6.2` MED — WHEN tactical species data loads, EVERY species id shall have exactly one `tactics_sp…
- `R-ctl-OBJINTERACT` LOW — Signs and objects as interactables (playtest r2-026)
- `R-qf-13-QF13.3` LOW — THE Privacy screen's Close option shall sit at the BOTTOM of its list, and the overla…
- `R-qf-13-QF13.4` LOW — THE redundant Privacy door on the Account screen shall be removed — Privacy stays rea…
- `R-wap-3-roster-registry-rows` LOW — No test ties every roster species to a monsters/<name> sprite registry row

**ux-a11y** (57):
- `R-21r-e-E1` MED — Trade UI does not announce the irreversible Trust/Quality-Time reset on confirm
- `R-ci-fix-20261002T0901Z-VIEWREBUILD` MED — Other overlay views may rebuild unchanged controls on every store batch
- `R-ci-fix-20261002T0901Z-HELPHINTCOVERSACCEPT` MED — The help-hint launcher covers the centre of the PvP Accept button
- `R-ctl-7b-CTL7A3REST` MED — Frame contrast e2e still skips 8 of the 9 index.html shells, the interact prompt and…
- `R-weekly-review-2026-11-06-F1` MED — Tactical battle UI announces nothing to assistive technology
- `R-weekly-review-2026-11-06-F3` MED — Still-there countdown compares the server deadline to the raw local clock
- `R-bt-17-HPCUE` MED — tactical HP bar has no non-colour severity cue
- `R-21r-b2-E1` LOW — Privacy pseudonymization disclosure stays raw English under fr (privacyView.ts paints…
- `R-ctl-BINDSYNC` LOW — Account sync of control bindings across devices
- `R-ctl-COMPASS` LOW — Social Players list: distance/compass direction to other players
- `R-ctl-LAYOUTMAP` LOW — Keyboard-layout-aware keycap glyphs via navigator.keyboard.getLayoutMap
- `R-ctl-TOUCHWALK` LOW — Touch walking and gestures (swipes) on the game screen
- `R-ctl-WELCOME` LOW — First-run controls welcome card
- `R-ctl-4-X1` LOW — ctl-4 navRender re-render hygiene: 3 test-blind mutants
- `R-weekly-review-2026-10-02-F4` LOW — Overlay aria-labels and open announcements stay English under the fr locale
- `R-ctl-7a-CTL7A.1` LOW — F9 error overlay is an in-flow body child, so the page scrolls while it shows
- `R-ctl-7a-EVONOTICEUNDERSHELL` LOW — Evolution-notice banner (z 60) now paints under an open shell (z 100)
- `R-ctl-8a-CTL8A.2` LOW — Shop cursor re-seats on the first row, not the neighbour, when its row vanishes
- `R-ctl-8g-CTL8G.1` LOW — Players rows show no zone name
- `R-ctl-8g-CTL8G.1-DEADPATH` LOW — Stale Players-on-trade-root code and comments
- `R-ctl-8j-MASHRECRUIT` LOW — Mashing A after a settled recruit can reopen the confirm before the turn refresh
- `R-ctl-10a-BOXCB` LOW — BoxViewCallbacks.onHealParty is an unread optional member
- `R-ctl-10a-DOCS` LOW — Stale KeyT / nearest-interactable / talk-range prose outside touches
- `R-ctl-10b-DOCS` LOW — docs/PLAYTEST.md section 3 still documents T, O and P-challenges
- `R-ctl-10b-PVPCB` LOW — PvpViewCallbacks.onChallenge optional and unread
- `R-ctl-10b-PVPPLAYERS` LOW — pvpModel computes unread challengeablePlayers + a duplicate Pending-busy set
- `R-ctl-11a-DRAFTLOSS` LOW — An accelerator discards a trade-wizard or Name draft with no confirm
- `R-ctl-11a-XQUICKMOVE` LOW — X quick Move still never reaches the Monsters screen
- `R-ctl-11b-E2ESECONDMONSTER` LOW — menu-flow e2e plays one monster: the picker Down and a pre-stored monster are not exe…
- `R-ctl-11b-STALENARRATION` LOW — Comments still narrate the deleted worldHasFocus
- `R-ctl-12b-PROSEHINTS` LOW — Battle prose hints name literal keys (Enter, Esc, B) and go stale after a remap
- `R-ctl-13-ANSWERFAIL` LOW — A server-rejected answer leaves the request hidden from the world until reconnect
- `R-ctl-13-HINTCOST` LOW — Frame loop builds the notice input twice per frame
- `R-ctl-13-REANNOUNCE` LOW — A second request with the same line is not voiced
- `R-ctl-15-DRIVEN` LOW — A click on the only row of a list beside another single-row list does nothing
- `R-ctl-15-FOCUSSEAM` LOW — Pointer seeks and hover press real D-pad buttons, so a screen's button side effects run
- `R-ctl-15-KEYHOLD` LOW — A pointer press's up edge can end a keyboard hold of the same button
- `R-ctl-15-LAUNCHERATTR` LOW — Vestigial data-menu-launcher / data-help-launcher markup and stale delegate comments
- `R-ctl-15-SHEETTOP` LOW — pointerTop's open-world-sheet branch has no boot test
- `R-pgcc-d-monstersScreen-sentinel` LOW — monstersScreen.ts still emits the -1 next-free-slot literal instead of NEXT_FREE_PART…
- `R-polish-1-CLAIMRESULTCATCHREENTRY` LOW — connection.ts onClaimResult .then(ok).catch(!ok) re-enters as a reject if the ok hand…
- `R-polish-1-MENUREASONANNOUNCE` LOW — No runtime test that a battle-disabled menu entry's reason is announced
- `R-weekly-review-2026-10-09-F3` LOW — PvP accept mid-dialogue leaves battle D-pad/A dead until B/Start while the turn timer…
- `R-weekly-review-2026-10-23-F3` LOW — releaseAnswered after a rejected trade/challenge answer leaves the menu badge stale a…
- `R-qf-1-X1` LOW — qf-1 focus-ring policy has no real-browser tooth
- `R-qf-3-QF3.3-announce` LOW — A on a cooling Care (and on a disabled Feed) is silent beyond the row's accessible name
- `R-bt-12-RESULTSDRAIN` LOW — the results panel can take the frame while the shell's playback still drains
- `R-bt-15-CLOCKSKEW` LOW — The clock ring and the Still-there countdown compare server epoch deadlines against t…
- `R-bt-17-HPFILLINLINE` LOW — tactical HP fill inline-transition guard is untested
- `R-uif-1-WHITEBAND` LOW — White band on the world canvas under a full menu frame
- `R-uif-2-DPRONLY` LOW — A devicePixelRatio change with no size change fires no resize, so the world keeps a s…
- `R-uif-4-REPEATSAY` LOW — A repeated identical toast is not re-announced
- `R-uif-10-CURRENCYLABELS` LOW — Trade-propose currency inputs named by step keys Coins/Ask
- `R-uif-10-SHOPFOCUS` LOW — Shop tab switch strands focus on a hidden Buy/Sell button
- `R-uif-10-TITLES` LOW — Heal and Trade-propose have no title bar
- `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL` LOW — An overlay's deferred initial focus scrolls an already-navigated frame back to its top
- `R-uif-17-KITPOLISH` LOW — Menu kit polish left after M-ui-foundation (proposed uif-18)

**loop-ops** (18):
- `R-ci-fix-20261002T0501Z-DIALOGUESPECCLICK` MED — dialogue.spec.ts 13.5c-5 swallows a 5 s pointer click on a rebuilt button
- `R-bt-17-FIGHTSTALL` MED — e2e fightToOutcome stalls 16 own turns against a kiting wild
- `R-21r-a-WBALERT` LOW — No alert or dashboard consumes *_writeback_err events
- `R-ci-fix-20261002T0501Z-E2EARTIFACTS` LOW — CI e2e job keeps no Playwright artifacts on failure
- `R-ci-fix-20261002T0901Z-PVPSPECCLICKS` LOW — Two e2e specs click PvP Accept with no timeout
- `R-ctl-7a-CTL7A.4` LOW — Stale #help-hint / one-corner references outside ctl-7a touches
- `R-ctl-7a-MOVEFLAKE` LOW — movement-input.spec B/C intermittent on the ctl-7a branch (1 of 6 on a fresh db; mast…
- `R-ctl-7c-HEALGUARDTEST` LOW — The healParty send guard (sendGuarded: frozen link, rejection report) has no test on…
- `R-ctl-10a-TALKRANGE` LOW — talk_range wasm export has no client consumer
- `R-pgcc-c-RANKEDWIRING` LOW — ranked-delta listener wiring in main.ts has no boot-level test
- `R-pgcc-c-RESEEDDOCBLOCK` LOW — main.battle-reseed.test.ts comments cite removed main.ts latch code
- `R-qf-6-QF6.1` LOW — wallet-balance.spec.ts comments still say a rejected advance leaves the overlay open
- `R-qf-9-RAISINGVESTIGES` LOW — Retire RaisingView's ignored ctor param and raisingModel's unread monsters half
- `R-qf-9-STALERAISINGREFS` LOW — Comments in evolutionView.ts and pvpView.ts still cite raisingView's deleted onCare/C…
- `R-ci-fix-20261101T0505-CTXSTACK-FLOOR` LOW — contextStack.test.ts:1986 unseeded fast-check floor (keptStamped > 50) flakes about 1…
- `R-bt-11-DOCROT` LOW — ARCHITECTURE.md client-wasm export list and golden.rs 'BT11.7 follows' doc are stale…
- `R-ci-fix-20261107T0300-tactics-wild-bait-budget` LOW — tactics-wild.spec.ts seeds 9 baits against an 80-attempt recruit loop (same exhaustio…
- `R-bt-17-MARSHALTESTONLY` LOW — ten 1v1 marshaling helpers stay compiled test-only after the body purge

**uncategorised (the oldest rows; the triage assigns a category)** (24):
- `R-rb-52-GRACEANNOUNCE` MED — One-shot AT announcement on the active->grace deletion edge
- `R-rb-53-E1` MED — a11y one-shot announcement on the export incomplete->complete edge
- `R-rb-56-FOLLOWUP-ACC` MED — Skill ACCURACY is still hover-only in btn.title on the battle skill buttons
- `R-rb-57-X4` MED — [the SECOND, separable arm of the EARS line — "no DOM representation"] WHEN a sprite'…
- `R-rb-59-X6` MED — [the screen-reader half of the same defect] WHEN a battle is PvP AND an opponent play…
- `R-rb-65-RUNBOOK-LOGCAVEAT` MED — DR runbook §9 documents row and backup retention caveats but not the operational log…
- `R-rb-73-ABORT-PHANTOM` MED — A client_disconnected transaction abort strands a player_session row that no launch r…
- `R-rb-73-TOKEN-WEDGE` MED — Stolen-token holder can suppress a victim's disconnect cleanup by holding a live WS a…
- `R-rb-73-WILD-HOLD` MED — No reaper covers wild battle rows; a held second connection stalls a wild battle
- `R-rb-76-CHALLENGERGRACE` MED — accept_challenge still opens a NEW battle row naming a mid-grace CHALLENGER (A challe…
- `R-rb-83-CHALLENGELAUNDER` MED — pvp accept_challenge is blanket-gated with no stamp-aware sibling: a deletion-gated t…
- `R-rb-86-TICKBOUND` MED — export_bundle_reaper write set is bounded in stamps, not rows
- `R-20r-d-B1-ack` MED — Count-based ack_evolution_notices is not strictly at-least-once across two sessions
- `R-20r-d-B1-cap` MED — pending_evolution_notice.entries is uncapped (self-inflicted growth only)
- `R-rb-107-REJECTWALK` MED — The exact admission gate rejects only after the manifest walk for callers whose bundl…
- `R-rb-107-BYTEBOUND` MED — The export admission cap bounds rows, not bytes
- `R-rb-111-CONTENTION` MED — contention refusal under a ≥1 bundle/ms multi-identity burst (untiered 16 ms stamp wi…
- `R-rb-111-STAMPORACLE` MED — the minted stamp a caller reads back is a ≤4-bit anonymous third-party timing channel
- `R-rb-121-DEFER-FOCUS-RECHECK` MED — openOverlayA11y deferred focus does not re-check activeElement at fire time
- `R-rb-125-X7` MED — [CUTSCENE] WHEN an evolution reveal is shown THE SYSTEM shall play a cutscene/transfo…
- `R-rb-128-X1` MED — R-rb-128-HELDKEY: a connected mid-grace player holding a movement key gets one predic…
- `R-rb-128-X2` MED — R-rb-128-REASONSCOPE: REJECT_DELETION_GATED text names only new trades/battles/challe…
- `R-rb-132-NEWCOMERSHED` MED — (MED) Never-credited guests are shed at 10 735 live export_bundle rows (rb-107 admitt…
- `R-rb-132-WALLETSYBIL` MED — (HIGH) Newcomer export tier: the wallet-row signal is cheap and permanent — quest_001…
