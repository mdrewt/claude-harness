---
name: monster-realm-m14.5c
description: M14.5c ability-system end-to-end wiring (ADR-0100, PR #151) — species_row.ability column, build_ability_store, AbilityStore in 3 resolve functions + 5 reducers, CONTENT_VERSION 10→11
metadata:
  type: project
---

# Monster Realm M14.5c — Ability-System End-to-End Wiring

**Status:** TERMINAL — PR #151 open, local `just ci` EXIT=0, remote CI in-progress  
**ADR:** 0100 (CONSUMED). ADR next-free = 0101  
**Branch:** `feat/m14.5c-ability-wiring` tip `607fbc9`  
**PR:** https://github.com/mdrewt/monster-realm/pull/151

## What landed

**Why:** ADR-0094 (M14c) introduced `AbilityStore` / `apply_entry_ability` / `apply_ability_modifiers` in game-core but intentionally deferred server wiring. M14.5c closes that deferral.

### D1 — `species_row.ability: Option<u32>` (additive, ADR-0006)
Last field on `SpeciesRow` in `server-module/src/schema.rs`. Client bindings regenerated via `just gen`; `species_row_table.ts` gains `ability: __t.option(__t.u32())`. Old rows read as `None` (no migration needed).

### D2 — Content assignments
`game-core/content/species/000-core.ron`:
- Flameling (id=1): `ability: Some(1)` → Flame Body (StatusImmunity Burn)
- Sproutlet (id=3): `ability: Some(3)` → Regeneration (EntryHeal denom=4)
- Tidalin (id=2): no ability field (defaults None)

`SPECIES_GOLDEN` golden-snapshot const updated; `CONTENT_VERSION 10 → 11`; `evals/baselines/content-hash.json` updated to `{"version":11, "hash":"da39809f..."}`.

### D3 — `build_ability_store` pure helper in `marshal.rs`
Resolves `Option<u32>` ability IDs against loaded `AbilityDef` registry. Unknown IDs → `None` silently (stale def degrades gracefully, no crash). Signature: `build_ability_store(side_a_ids: &[Option<u32>], side_b_ids: &[Option<u32>], ability_defs: &[AbilityDef]) -> AbilityStore`.

### D4 — `AbilityStore` in 3 resolve functions
`resolve_full_turn`, `resolve_player_swap`, `resolve_recruit_failure` each gain `abilities: &AbilityStore` as final parameter:
- `resolve_full_turn`: Phase 0 calls `apply_ability_modifiers(state, status, abilities)` before Phase 1 action-blocking
- `resolve_player_swap`: calls `apply_entry_ability(state, swap_side, abilities, status)` after `set_active` + Switch event
- `resolve_recruit_failure`: calls `apply_ability_modifiers` after advance-turn check

All call sites in 8 test files updated to pass `AbilityStore::new(a, b)`.

### D5 — Five reducer paths build AbilityStore
`start_battle`, `begin_encounter`, `submit_attack`, `swap_active`, `attempt_recruit` all build `AbilityStore` and pass it. `start_battle` + `begin_encounter` additionally call `apply_entry_ability` for both sides' initial active slot before inserting the `Battle` row (using temporary `BattleStatusStore` written back).

### D6 (documented gap — Phase C)
Auto-switch on KO does NOT call `apply_entry_ability`. `TODO(ADR-0100 D6)` marker in `resolve.rs` at the `resolve_one_attack` auto-switch site. EntryHeal missed on KO-switch; StatusImmunity delayed one turn. Two RT-D6 gap-documentation tests in `m14_5c_tests.rs`.

### D7 — ability.rs doc comment superseded
Stale "intentionally NOT wired" comment removed; replaced with accurate pipeline integration note.

## Traps for future work

**`species_from_row` is the SSOT** for `SpeciesRow → game_core::Species`. The recruit-success path previously inlined the struct construction with `ability: None` — now fixed to call `species_from_row`. Any future add to `game_core::Species` must check ALL inline construction sites.

**`SPECIES_GOLDEN`** in `game-core/src/content.rs` is a frozen RON snapshot that is updated whenever 000-core.ron content changes. `m8_9e_species_migration_parity` + `m10a_derived_species_still_pass_validate_content` both fail if the golden is not in sync with actual content.

**content-hash baseline**: `evals/baselines/content-hash.json` must be updated (version + hash) whenever `game-core/content/**` changes. The hash is computed by `evals/content-version.eval.mjs`'s `hashContentDir()`. CONTENT_VERSION in `server-module/src/lib.rs` must match the baseline version.

**`just knowledge`** must be run after any server-module changes that alter reducer/table signatures (to regenerate `docs/knowledge/`), otherwise the knowledge-bundle-conformance eval fails.

## ADR cross-references
- [[monster-realm-m14.5b]] — m14.5b StatusApplied slot + Phase-4.5 drop-if-fainted (ADR-0099)
- [[monster-realm-m14a]] — StatusEffect enum + BattleStatusStore (ADR-0092)
- [[monster-realm-m10.5a]] — empty-moveset invariant (relevant to ability store sizing)
