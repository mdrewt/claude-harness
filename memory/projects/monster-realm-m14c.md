---
name: monster-realm-m14c
description: M14c passive-ability system — per-species abilities with StatusKind, AbilityEffect exhaustive enum, content-driven hooks, ADR-0094
metadata:
  type: project
---

## M14c — Passive per-species ability system (PR #137, ADR-0094)

**Status:** PR open, `just ci` EXIT=0, remote CI running. Supervisor owns merge.

**Why:** M14a–M14b shipped status effects with pure rules + server persistence. M14c adds passive per-species abilities (e.g., Flame Body = Burn immunity, Regeneration = entry heal) as data-driven content, wired into the `resolve_full_turn` pipeline via additive hooks. Abilities are purely informational in M14c; server wiring deferred to M14d.

## Key design decisions

### StatusKind: payload-free discriminant
`StatusKind` (Burn/Sleep/Poison/Paralysis/Freeze) is an enum with no payloads. This avoids RON payload syntax in ability content (`StatusImmunity Burn` not `StatusImmunity { status: Sleep { turns_remaining: 3 } }`). The immunity immunity is to the **kind**, not a specific instance; timing is the caller's job (per-turn resolution, M14d wiring).

### AbilityEffect: exhaustive enum (OCP inverted)
`AbilityEffect` is `#[non_exhaustive]`-free and ships two variants:
- `StatusImmunity { immune_to: StatusKind }` — blocks status application
- `EntryHeal { denom: u16 }` — heals 1/denom HP on battle entry

A new ability type (e.g., `WeatherSynergy`, `DamageBoost`) forces a compiler error at every match site. This is OCP inverted per ADR-0010: extensibility via exhaustive case analysis, not trait objects.

### validate_abilities: additive sibling, not signature change
`validate_abilities(abilities: &[AbilityDef], species: &[SpeciesDef]) → Result<(), String>` lives alongside the 4-param `validate_content(…)`. It's called from `sync_content_inner` but does NOT change the `validate_content` signature — preserving the ADR-0006 pattern. Cross-checks ability ids against species `ability` fields.

### apply_entry_ability returns ()
`apply_entry_ability(ability: &AbilityEffect, side: &mut BattleSide) → ()` modifies state in place (e.g., heal the active slot). It does **not** return `Vec<BattleEvent>` (no speculative event API) — the caller must emit events separately if needed (wired in M14d).

### debug_assert!(denom >= 2) on EntryHeal
Per ADR-0055 precondition policy: `EntryHeal { denom: 0 }` or `denom: 1` is developer error (0 heals nothing, 1 heals 100%). The bounds check is a debug_assert, not a content-validation gate (validation happens in `validate_abilities` as a `Result` gate; this is runtime safety).

### Server wiring hooks standalone (NOT in resolve_full_turn yet)
`apply_entry_ability` and `apply_ability_modifiers` are game-core exports, tested in isolation. They are **not** wired into the `resolve_full_turn` pipeline in M14c. Server reducer integration (loading abilities from species, calling the hooks at the right turn points) is M14d's job.

## Deferred residuals

- **Server wiring into `resolve_full_turn`** — M14d owns the reducer-side integration (construct `AbilityStore`, call `apply_entry_ability` at battle start, `apply_ability_modifiers` during turn resolution).
- **attempt_recruit ability population** — wild abilities not yet stored; M14d+ (same gap as status DoT in wild counter-attack from M14b).
- **DoT interaction with entry abilities** — e.g., Regeneration + Poison together; interaction rules/priority deferred.
- **RT-A14-01 HIGH fix wired** — documented in ADR-0094.

## Files changed

- `game-core/src/combat/ability.rs` — NEW: StatusKind, AbilityEffect, AbilityStore, apply_entry_ability, apply_ability_modifiers
- `game-core/src/combat/m14c_tests.rs` — NEW: 20 EARS tests
- `game-core/src/combat/redteam_m14c_tests.rs` — NEW: 4 red-team tests
- `game-core/src/combat/mod.rs` — re-exports ability module + test modules
- `game-core/src/lib.rs` — re-exports AbilityDef, AbilityEffect, AbilityStore, StatusKind, apply_entry_ability, apply_ability_modifiers, load_abilities, parse_abilities, validate_abilities
- `game-core/src/content.rs` — Species `#[serde(default)] ability`, AbilityDef struct, load_abilities/parse_abilities/validate_abilities functions
- `game-core/content/abilities/000-core.ron` — NEW: 3 starter abilities (Flame Body, Vital Spirit, Regeneration)
- `game-core/build.rs` — "abilities" added as 12th registry entry
- `server-module/src/lib.rs` — CONTENT_VERSION 7→8
- `server-module/src/content.rs` — load_abilities + validate_abilities wired into sync_content_inner
- `server-module/src/marshal.rs`, `movement.rs`, `taming.rs` — `ability: None` added to Species test literals
- `server-module/src/marshal_tests.rs` — `ability: None` in test Species
- `evals/baselines/content-hash.json` — version=8
- `docs/knowledge/reducers/` — 8 files regenerated

## Next per M14 plan

m14d (weather/field state) serial. ADR next-free: **0095**.

## Related

- [[monster-realm-m14b]] — server status persistence (RT-S14-01 fix, resolve_full_turn wiring)
- [[monster-realm-m14a]] — pure game-core status rules, M14 foundation
