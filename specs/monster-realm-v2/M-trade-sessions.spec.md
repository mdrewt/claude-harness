# Spec: M-trade-sessions — multi-stage trade sessions (SKETCH)

**Status:** sketch, 2026-10-24 (Playtest-3 feedback processing). Elaborate with
`milestone-loop-prompt.md` when PLAN §9 reaches it, against the CURRENT game repo ·
**Project:** monster-realm (game-core + server-module + client) · **Source:** operator directive,
`playtest-feedback-2026-10.md` L237–250 · **Decision gate: ANSWERED 2026-10-24** — monster-realm
#585 (`pt3-trade-scope`); verbatim answers at `memory/projects/decisions/issue-585.answer.md`
(SSOT). All five recommendations accepted, with two operator ADDITIONS: (i) simple extra
soft-lock checks beyond the no-empty-side rule — "a solution that prevents 90% of potential
cases with 0 false positives is better than … 95% … but constantly frustrates players"; (ii)
only ONE active trade per PAIR of players at a time. The former *pending* rows below are
resolved in place and marked **DECIDED**.
Anchors below cite symbols; line numbers are fact-check orientation (2026-10-24) only.

**Feedback items:** pt3-2026-10-080, pt3-2026-10-081, pt3-2026-10-082, pt3-2026-10-083,
pt3-2026-10-084, pt3-2026-10-085, pt3-2026-10-086.
**Absorbs residuals:** R-weekly-review-2026-10-02-F5, R-weekly-review-2026-10-16-F1,
R-ctl-PROXGUARD.

## Problem / intent

The shipped propose→accept flow is broken by the privacy model the operator explicitly endorses
(feedback L237): `monster` is private and exposed only through the owner-scoped `my_monster_pub`
view, so a proposer cannot enumerate the counterparty's side. pt-c2/ADR-0134 papered over this
with a degenerate currency-only ask side (`counterpartyMonsterIds: []` hard-coded in the client),
the ctl-8e wizard's Ask step is dead by construction, and — worse — the reducer still ACCEPTS
counterparty asset lists it shouldn't (residual F5) whose validation errors are a read oracle on
another player's wallet and inventory (residual 2026-10-16-F1, MED).

The operator's directive (L238–243) supersedes the flow, not the privacy model: trades become
multi-stage **sessions**. A player initiates a blank trade; each side edits ONLY its own offer;
each side sets a confirm flag; ANY edit resets every other participant's confirmation; the trade
executes atomically only when all sides are confirmed; either side may cancel until execution;
executed trades are final. Privacy-compatible by construction: nobody ever specifies, probes or
enumerates the other side's holdings — offered assets are revealed through server-built snapshot
cards (the existing `build_cards` pattern), nothing else.

## Scope (sketch)

### Protocol (server spine)

- **Session lifecycle:** create (blank) → per-side edit (add/remove own assets) → per-side
  confirm → execute (atomic, single reducer, when ALL confirmed) → terminal; cancel by either
  participant at any pre-execute point. An edit by any participant clears every OTHER
  participant's confirm flag (the editor's own flag clears too — editing implies reviewing).
- **Schema:** a NEW `trade_session` table — cleanly additive (the recommended option; legacy
  `trade_offer` rows are deleted-on-terminal anyway, so the old table goes quiet rather than
  migrating). PRIVATE table + a participant-scoped `my_trade_session` view (two-identity scoping,
  precedent: `my_battle`) — do NOT repeat `trade_offer`'s public-table mistake. If elaboration
  instead amends `trade_offer`: appended `#[default]` columns and `TradeStatus` variants appended
  at the END only (DECISIONS.md "Schema changes are additive"; the client's exhaustive
  literal-union + satisfies-never arm, ADR-0114, turns new variants into compile errors by
  design). Bindings regen + publish-over-data proof required either way.
- **Initiation — DECIDED (#585 D3):** face-to-face ONLY; the Social›Trades tab is where you
  EDIT/confirm/cancel already-open sessions, never where you initiate. The world-interaction
  path ctl-10b built is retargeted at `create_trade_session`, and this milestone ACTIVATES the
  server-side proximity guard per R-ctl-PROXGUARD's recorded recipe (pure game-core
  `within_interact_range`; characters via `p.entity_id` as talk does; placed after
  joined/require_not_deleting/counterparty-joined checks; ONE uniform error string — no zone
  oracle; co-located fixtures in pvp_tests/trading_tests). ADDITION (same answer): at most ONE
  active session per PAIR of players — "no spamming the same person with a dozen different
  requests/offers"; a second create against the same counterparty is rejected naming the open
  session.
- **No-oracle invariant (closes 2026-10-16-F1):** no session reducer takes counterparty asset
  arguments, and no error string is derived from another player's private state. Each side's
  edits are validated against the EDITOR's own holdings only.

### Eligibility (new game-core rules + guards; reject-don't-clamp)

New rules the operator ruled (L244–247), encoded once in game-core and enforced by guards:

- A monster must be **in the offering player's party** and have **≥ 1 HP** to be added to an
  offer (reject the add otherwise — never silently drop it).
- **One active trade per monster.** Adding a monster already in another active session is
  REJECTED with a message naming the conflict ("cancel the old trade first" — the operator's own
  wording); no auto-cancel on double-offer.
- **Auto-cancel:** when an offered monster leaves the party or drops below 1 HP, every active
  session it is part of is cancelled server-side. This INVERTS today's block-the-mutation escrow
  for exactly these two triggers (`set_party_slot` currently rejects while escrowed); every other
  escrow guard (battle entry, evolve, care/train, QT-accrual skip) stays reject, per the
  preservation checklist. Hook the cancel at the party-slot and HP write seams (incl.
  `write_back_party_hp` on flee and the ADR-0138 disconnect-GC path, which persists damaged HP);
  with battle entry still rejected for escrowed monsters the HP trigger is mostly
  belt-and-braces, but it is a ruling — encode it.
- **No confirm while a side is empty — DECIDED (#585 D1/D2):** monsters, items AND currency are
  tradable on both sides (D1), so "non-empty" = at least one asset of any class; an
  items-or-currency-only side counts. One-sided gifts DIE (D2 — the rule is enforced exactly;
  gifting, if ever wanted, is a separate explicit future feature).
- **Additional simple soft-lock checks (operator ADDITION, #585 D2):** the empty-side rule alone
  doesn't stop value-losing trades like "your only monster for a single gold coin." Add a SMALL
  set of simple, zero-false-positive guards — the named case: WHEN executing would leave a player
  with zero monsters (their last monster goes out and no monster comes in), reject. Keep the set
  minimal ("prevents 90% of potential cases with 0 false positives" beats a frustrating 95%);
  anything cleverer (value heuristics, confirmation friction) is explicitly NOT wanted.
  Elaboration picks the final guard list under that bar.
- **Concurrency — DECIDED (#585 D3 addition):** one active session per PAIR of players; a player
  may hold multiple sessions concurrently only with DISTINCT counterparties. Per-monster
  exclusivity stays the binding asset rule; today's one-per-player `has_active_trade` cap relaxes
  to the per-pair cap. (086's "each active trade … its own row" renders per-pair rows.)

### Client (after so-2 lands — see Sequencing)

- **Trade overlay rebuilt for session editing** — own-side add/remove (party picker honoring the
  eligibility rules), both-side snapshot cards, per-player confirm indicators, cancel. The ctl-8e
  propose wizard (Offer/Coins/Ask/Review) retires in the same slice that replaces it (strangler
  rule); its Ask step is dead code walking.
- **Trades tab: each active trade is its own row** (item 086), shaped like challenge rows —
  rebuilt here on the session model, NOT patched beforehand on the single-offer overlay model
  (`shownTradeOffer` picks one offer today; that model dies with the redesign).
- Incoming session invitations stay a **non-modal banner + world sheet, never a frame**
  (DECISIONS.md "server-owned frames"); the session overlay itself is a player-opened frame on
  the context stack, D-pad navigable end-to-end — no mouse-only elements (standing ruling,
  feedback L117).
- All new strings via the typed i18n catalog, en + fr. No content RON touched; no
  CONTENT_VERSION change expected.

## Non-goals

- Multi-party (>2) trades — the protocol wording ("all involved players") is kept
  2-party-clean but only 2 participants ship.
- Trade history/undo (executed trades are final by ruling; "start a new trade to undo").
- The Social-menu IA flatten and the Discord-style name discriminator (own milestones/decision
  batches; the Players-tab rendering this overlay links into is reshaped there).
- Friendship/M19 handshake machinery (M19's planned ADR-0024 consent reuse is reducer-side and
  unaffected).
- Fixing the legacy `trade_offer` path in place — it is superseded, not repaired; it stays in
  the schema (additive-only) but the client stops driving it.

## Preservation checklist (BINDING — from the 2026-10-24 fact-check, agent0 findings 2/3/5)

Any elaboration MUST keep these working; each is an existing invariant with tests or an ADR:

1. **Battle↔trade interlock, both directions (ADR-0112).** `reject_if_in_battle` at
   session-create AND at execute; because offers are now mutable, the battle check is re-run at
   EVERY offer edit or, at minimum, at execute (execute-time is mandatory — edit-time is the
   recommended fail-early). The reverse direction — `reject_if_monster_in_trade` at its guard
   call sites across battle/pvp/monster_mgmt/raising/evolution (9 sites at fact-check time) —
   must keep working against the new table: the guard takes an iterator of `TradeOffer`, so a
   new `trade_session` table means mirroring `is_active` semantics or widening the guard to
   iterate both sources.
2. **Netted `check_headroom` re-run at execute (ADR-0113).** With editable offers the
   propose-time balance/inventory checks no longer bind; the execute-time netted check (the
   symmetric same-item netting and the saturating-sub balance netting are load-bearing —
   false-reject comment in `confirm_trade`) becomes the sole receiver-cap guard. Keep it netted,
   keep debits-before-credits, keep the swap atomic in one reducer.
3. **`TradeStatus` / session-status types append-only** (DECISIONS.md additive rules; ADR-0114
   client typing discipline carries to any new session-status union).
4. **TTL-reaper disarm pairing + disconnect-cancel.** Every session-delete path disarms its
   reaper schedule row (the existing offer code pairs disarm at every one of its delete sites —
   mirror that discipline), and `cancel_trades_on_disconnect` (TR-18) extends to sessions.
   Decide the session TTL at elaboration (offers use `TRADE_OFFER_TTL_MS` = 1 h; an editable
   session plausibly refreshes its TTL on activity).
5. **Bond reset on trade stands** (`reset_bond_on_trade`; essence/IVs/EVs transfer unchanged).
6. **Escrow stays guard-in-place, never asset movement** — with the two ruled inversions
   (party-leave, HP-drop) and lock-at-confirm (DECIDED, #585 D5).

## Decisions — ANSWERED 2026-10-24 (#585 `pt3-trade-scope`; answer file is SSOT)

1. **Tradable asset scope:** monsters + items + currency, both sides (recommendation accepted).
2. **Empty-side rule / gifts:** rule enforced exactly; one-sided gifts die. ADDITION: a small set
   of simple zero-false-positive soft-lock guards (last-monster rule; see Eligibility).
3. **Initiation locus:** face-to-face only; Trades tab = edit/confirm/cancel. PROXGUARD
   activates. ADDITION: one active session per pair of players.
4. **Arrival slot:** received monster goes to the FIRST OPEN PARTY SLOT, else to Storage; the
   outgoing monster's slot is freed by the swap (recommendation accepted). Receiver party
   headroom is therefore NOT a reject class — Storage is the overflow.
5. **Escrow window:** lock-at-confirm — while editing, nothing is locked; execute-time netted
   re-validation (preservation checklist #2) catches changes (recommendation accepted).

## Slices (provisional — final slicing at elaboration; serial rule→reducer spine, client tail)

- **ts-1 — game-core session rules** (pure, deterministic, integer): session state machine,
  eligibility predicates (in-party, ≥1 HP, per-monster exclusivity, per-pair session cap),
  confirm-reset-on-edit rule, empty-side confirm gate + the simple soft-lock guards (last-monster
  rule), execute validation, arrival-slot rule (first open party slot else Storage).
  touches: game-core/src/trading/ (new module + rules.rs, types.rs)
- **ts-2 — server spine**: `trade_session` table + `my_trade_session` view + reducers
  (create/edit/confirm/cancel/execute), guard widening (`reject_if_monster_in_trade` over both
  sources), auto-cancel hooks at the party-slot/HP seams, reaper + disconnect-cancel, PROXGUARD
  (decision-dependent). Bindings regen; publish-over-data proof.
  touches: server-module/src/ (schema.rs, trading.rs or a new trading_session.rs per the M8.9
  domain-module rule, guards.rs, monster_mgmt.rs, movement.rs, battle.rs), client/src/module_bindings/ (generated)
- **ts-3 — client overlay + Trades tab** (after so-2; the former decision rows are resolved):
  session overlay rebuild (asset pickers for monsters, items AND currency per D1), wizard
  retirement, per-trade rows (one per pair), banners, i18n en+fr.
  touches: client/src/ui/ (tradeModel, tradeView, tradeProposeModel/View retirement,
  socialModel/View, i18n/), client/src/main.ts (openFrame call sites per so-2's shape)
- **ts-4 — evals/e2e**: two-context session e2e on the M16.5d `__mrTrade` hook pattern
  (edit→confirm-reset→re-confirm→execute; cancel; auto-cancel), oracle-absence test, runtime
  trade coverage registry update.
  touches: evals/, client test registries

## Acceptance sketch (core invariants only — full EARS at elaboration)

- **TS-A1:** WHEN any participant edits either detail of their own offer, THE SERVER SHALL clear
  every participant's confirm flag, and the session SHALL NOT execute until all participants
  re-confirm the edited state they can see.
- **TS-A2:** WHEN all participants are confirmed, THE SERVER SHALL execute the swap atomically
  in one reducer — re-running `reject_if_in_battle` and the NETTED `check_headroom` against live
  state first — so the trade happens completely or not at all.
- **TS-A3:** WHEN an offered monster leaves its owner's party or its HP drops below 1, THE
  SERVER SHALL cancel every active session containing it (and the counterparty's client SHALL
  learn of the cancellation through its scoped subscription).
- **TS-A4:** THE session reducers SHALL accept no argument naming another player's assets, and
  SHALL return no error derived from another player's private state (closes the
  2026-10-16-F1 read oracle; a regression test probes for distinguishable errors).
- **TS-A5:** WHILE either side of a session is empty (no monster, item, or currency on it — #585
  D1/D2), THE SERVER SHALL reject confirm from every participant; and WHEN execution would leave
  a participant with zero monsters (last monster out, none in), THE SERVER SHALL reject the
  execute (the simple soft-lock guard — zero false positives, by design).
- **TS-A6:** WHEN the trade executes, bond SHALL reset on every traded monster and
  essence/IVs/EVs SHALL transfer unchanged (existing rule, re-proven on the new path).

## Sequencing / integration notes

- **Server spine (ts-1/ts-2) is independent of the corrective wave;** ts-3 lands AFTER
  M-stack-ownership so-2 (the overlay open path must be an `openFrame` conversion, and so-2's
  roster pins are rewritten exactly once — building the overlay first would rewrite them twice).
- **M25 overlap:** M25 S1 (blocked on checkpoint-2 ratification) rewrites two e2e tests that
  assert the trade-oracle leak as intended behavior; this milestone deletes the oracle
  structurally (TS-A4). Coordinate so those tests are rewritten once — whichever lands second
  rebases on the survivor, per PLAN §9's note that the file overlap is the trade-propose copy.
- The fan-out & integration doctrine from the other sketches applies verbatim: disjoint
  `touches:`, no new monolith (prefer a new `trading_session.rs` domain module over growing
  `trading.rs`), full `just ci` + bindings-drift 0 + schema-snapshot + e2e green on the
  INTEGRATED whole, and every cross-slice contract (session table shape, status union, reducer
  signatures, generated bindings) named with the test that proves it post-merge.
