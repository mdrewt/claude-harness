# 0023. Additive battle-depth framework (status / abilities / weather)
- Status: accepted (default set; final set confirmed at the Phase B checkpoint)
- Date: 2026-06-24
- Surfaced by: M14 design. Extends ADR-0017 (battle model). No v1 precedent (v1 deferred this).

## Context and problem statement
M7 shipped a deliberately shallow, **tested**, **symmetric** `resolve_turn`. Adding tactical depth (status,
abilities, weather, later multi-active) risks two failures: breaking M7's tested behavior, and making the
battle asymmetric so M16 PvP / M18 raids can't reuse `resolve_turn`. The depth must be additive, data-driven,
deterministic, and symmetric.

## Considered alternatives
- **Additive effect layers on `resolve_turn`'s event pipeline, behind exhaustive enums + content (chosen).**
  New effects are new branches in a pre-turn / action / post-turn / weather-tick pipeline that emit
  `BattleEvent`s; the plain-attack path is unchanged (M7 tests pass); a new variant flags every match site.
  `resolve_turn` stays symmetric → PvP/raids inherit the depth for free.
- **Rewrite `resolve_turn`.** Breaks M7's tested behavior and risks asymmetry. Rejected (ADR-0017: extend,
  don't rewrite).
- **Hardcode each effect in reducers/TS.** Not data → every effect is a code change + a duplication/desync
  risk. Rejected.
- **A generic effect-scripting engine.** Powerful but over-engineered for the scope and a large surface.
  Deferred (YAGNI) — exhaustive enums + data suffice.
- **Multi-active now.** Changes `BattleSide` structure (a bigger additive step); deferred to a checkpoint
  decision.

## Decision outcome
- Chosen: **additive depth layers on the existing `resolve_turn` event pipeline, data-driven, behind
  exhaustive enums, symmetric.** Default set: status effects + abilities + weather; multi-active deferred.
- Consequences: M7's tests are the regression guardrail (a proof-of-teeth fixture proves plain-attack
  resolution is unchanged); content carries the effects; M16/M18 inherit the depth symmetrically; the final
  set (and whether to add multi-active) is confirmed at the Phase B checkpoint.
