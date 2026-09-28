# 0025. PvP orchestration (handshake, secret both-submit, liveness)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M16 design. Builds on ADR-0017 (PvP-ready battle) + ADR-0024 (handshake) + ADR-0011.

## Context and problem statement
Two humans must battle fairly and to a definite result. The rules engine is already there (M7's symmetric
`resolve_turn`, depth-symmetric since M14), and the battle table is already PvP-ready (M7). What's missing
is the *orchestration*: how a battle is agreed, how simultaneous turns stay secret and fair, and how the
match reaches a result even if someone stalls or quits (v1 left a rage-quit-voids-the-loss exploit and no
turn timeout).

## Considered alternatives
- **Challenge handshake + shared additive battle + private per-chooser `battle_action` (secret both-submit)
  + scheduled turn-deadline reaper + forfeit-on-disconnect (chosen).** Reuses the M15 directed two-party RLS
  shape for the challenge; the shared battle differs only by `opponent_identity` (additive); each side's pick
  is RLS-hidden from the other and the turn resolves when both exist via the **unchanged** `resolve_turn`; a
  reaper + disconnect-forfeit guarantee a result.
- **Sequential turns (one picks, then the other sees it).** Unfair (information asymmetry). Rejected — picks
  must be simultaneous and secret.
- **Delete the battle on disconnect (v1).** A rage-quit voids the loss. Rejected — forfeit to the opponent.
- **No turn timeout (v1).** A stalling player hangs the match. Rejected — a scheduled deadline reaper.
- **Re-key the battle for PvP (v1's path).** Already avoided — M7 keyed it PvP-ready. N/A.

## Decision outcome
- Chosen: **orchestration over the existing symmetric resolver** — handshake, additive shared battle,
  RLS-hidden simultaneous picks, deadline reaper, forfeit-on-disconnect.
- Consequences: PvP needs no rule change (depth inherited from M14); a schema-snapshot eval keeps the battle
  change additive; the `battle_challenge`/shared-battle machinery is the template for M18 raids; ranked
  stakes layer on at M17. Documented tie-break: challenger acts first on a speed tie (PvE tie-break
  unchanged).
