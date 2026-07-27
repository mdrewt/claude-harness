# Spec: M-postgate-battle-0hp-fix — 0hp lead-monster battle-start defect

**Status:** queued, post-gate, un-blocked (spawned by r2 playtest feedback 2026-07-26, episode `r2-2026-07-26`, ledger items 005/030/031/036-039) · **Owner:** Drew · **Decision:** ADR at build time (project-level, next-free numbering).
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** none (independent of the UX/evolution milestones).

## 1. Problem / intent

Drew's r2 report: when a player's lead party monster has 0 HP at battle start, that monster is
still sent out for round 1; clicking an attack button appears to process the attack (even at 0hp);
round 2 then silently swaps to the next monster. This is a genuine correctness bug in turn/lead
resolution, not a UI complaint — no player-visible swap prompt exists to explain the round-2 switch.

## 2. Acceptance criteria (EARS, to be finalized against live code at build time)

- WHEN a battle begins, THE system SHALL select the first party monster with `hp > 0` as the
  active lead — never a monster at 0 HP — for both PvE and PvP starts.
- WHEN a player attempts to submit an action for a monster at 0 HP (already active, e.g. dropped to
  0 by a prior hit this round), THE system SHALL reject the action rather than silently resolving
  it as a no-op-that-looks-like-a-hit.
- WHEN a player attempts to swap INTO a 0 HP monster mid-battle, THE system SHALL reject the swap
  (existing `PARTY_SLOT_NONE`/bench-filter precedent in `taming.rs`/`lead_party` may already cover
  part of this — verify, don't assume).
- Double-KO / drops-to-0-mid-round edge cases: research how comparable turn-based monster battlers
  handle simultaneous-KO and speed-tie 0hp cases; document the chosen rule in the ADR with the
  comparator evidence (ledger item 039, delegation kind — judgment call, not dictated).
- Tests: unit/contract coverage on lead-selection and 0hp-action-rejection; a regression case
  reproducing Drew's exact reported sequence (0hp lead sent out → attack click → silent swap).

## 3. Touches (declared for fan-out eligibility)

`server-module/src/battle*.rs` (turn resolution, lead-selection, action validation),
`game-core/src/battle/*` if lead-selection logic lives there, `server-module/src/battle_tests.rs`.
No client changes expected unless the reject-path needs a surfaced error message.

## 3b. DELIVERED (2026-07-27, PR #258, ADR-0156) — PvE only

Slice `battle-0hp-fix`. `just ci` green locally; `just mutate-core` `missed=0`.

- **E1 — PvE: DONE.** `BattleSide::with_lead(team) -> Option<BattleSide>` in
  `game-core/src/combat/types.rs` seats the first `hp > 0` slot (team order preserved — `team[i]`
  is positionally coupled to `party_monster_ids[i]` for HP write-back/XP). Adopted at all four
  PvE sites (`start_battle` ×2, `begin_encounter` ×2).
  **E1 — PvP: NOT DONE.** See the `touches:` correction below.
- **E2 — PvE: DONE.** `submit_attack` rejects a fainted active with `Err` (reject-not-clamp).
  `submit_pvp_action` NOT covered.
- **E3 — VERIFIED, no code change needed.** The swap-in reject already bites at two layers
  (`swap_active`'s `team[idx].is_fainted()` and `BattleSide::set_active`'s `SwapError::Fainted`).
  Gating tests pin both. This was a result, not a gap.
- **E4 — DONE.** ADR-0156 §D4 pins the lead/fainted-actor/double-KO/speed-tie/replacement rules
  as-built, with comparator evidence + citations (Pokémon mainline, Showdown engine, Temtem,
  Cassette Beasts, Coromon; Nexomon recorded as unknown rather than guessed).
- **E5 — DONE.** `game-core/src/combat/battle_0hp_tests.rs` reproduces Drew's exact sequence,
  with a control test proving the assertion is not vacuous.

**A planned change was deliberately REJECTED and must not be "completed" later** — a fainted-actor
early return in `resolve_one_attack`. It makes the both-actives-fainted state a permanent
non-terminating fixpoint (verified 100 turns) where today it self-repairs in 2. ADR-0156 D3 has
the evidence; a sentinel test fails if anyone adds it.

### `touches:` correction + the one real scope shortfall

1. **`game-core/src/battle/*` does not exist** in the repo — the module is `game-core/src/combat/`.
   The work landed where the code actually lives; fix this path in §3 so the next fan-out
   disjointness check is meaningful.
2. **`server-module/src/pvp.rs` was NOT in `touches:` but carries the identical defect**
   (`start_pvp_battle` has the same `any(conscious)`-then-`active: 0` shape; `submit_pvp_action`'s
   attack arm accepts a skill for a fainted active). Treated as a hidden dependency and left
   untouched. §2's "for both PvE and PvP starts" is therefore **half-delivered**. PvP is not made
   worse (no `game-core` behavior changed), but the live sac-lead exploit remains on the
   rating-affecting surface: a deliberately 0 HP lead deals full damage, absorbs the opponent's
   turn-1 attack, and buys a free switch costing no turn. **Follow-up slice
   `M-postgate-battle-0hp-fix-pvp` — a mechanical two-call adoption of `BattleSide::with_lead`
   plus a `submit_pvp_action` mirror of the `submit_attack` guard. Recommended next.**

## 4. Notes

Weight: LIGHT (well-scoped bug fix, no schema/economy/net-protocol touch — size does not
promote to HEAVY under §5 of the feedback doctrine). Independent of the movement-investigation and
UX milestones; safe to fan out alongside them once `touches:` disjointness is confirmed.
