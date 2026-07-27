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

## 4. Notes

Weight: LIGHT (well-scoped bug fix, no schema/economy/net-protocol touch — size does not
promote to HEAVY under §5 of the feedback doctrine). Independent of the movement-investigation and
UX milestones; safe to fan out alongside them once `touches:` disjointness is confirmed.
