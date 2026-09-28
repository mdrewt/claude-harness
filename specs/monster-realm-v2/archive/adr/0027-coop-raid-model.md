# 0027. Co-op raid model (additive resolve_coop_turn)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M18 design. Builds on ADR-0017 (battle), 0023 (additive depth), 0025 (challenge/both-submit).

## Context and problem statement
A cooperative raid (two allies vs an AI boss) is a third battle shape. It must not regress the tested PvE/PvP
`resolve_turn`, must reuse the existing challenge/both-submit machinery, and must stay robust if an ally
disconnects mid-raid.

## Considered alternatives
- **A new additive `resolve_coop_turn` beside `resolve_turn`, on the same battle row with `is_raid` + ally
  `opponent_identity` (chosen).** Two allies act (speed order), then the boss AI acts; built to degrade to
  one ally (a missing lead = fainted). Reuses `battle_challenge.is_raid`, the M16 `battle_action` both-submit,
  and the deadline reaper. PvE/PvP untouched.
- **Generalize `resolve_turn` to N sides.** Tempting, but it rewrites the tested core and risks regressions
  for a distinct mode. Rejected (ADR-0017/0023: extend, don't rewrite).
- **A separate raid subsystem (own tables/flow).** Duplicates the battle/challenge machinery. Rejected —
  reuse the additive battle row + the M16 handshake.
- **Hard-require exactly two live allies.** Brittle — an ally drop would break the raid. Rejected — degrade
  gracefully.

## Decision outcome
- Chosen: **`resolve_coop_turn` as a new additive rule on the additive `is_raid` battle, reusing the M16
  challenge/both-submit + reaper, degrading to one ally.**
- Consequences: PvE/PvP `resolve_turn` is unchanged (regression-gated); the raid is 2-ally by construction
  (`build_raid_battle` builds two leads; a missing `team[1]` is treated as fainted — documented at both
  sites, with a one-ally proof-of-teeth); a schema-snapshot eval keeps the battle change additive; >2 allies
  and raid loot/matchmaking are additive later (M19 can organize raids).
