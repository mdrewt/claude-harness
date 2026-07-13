---
name: monster-realm-m14.5h
description: M14.5h — nightly mutate-core fix (4 missed mutants) + ADR-0100 D6 closure; apply_ko_switch_entry_abilities; PR #158
metadata:
  type: project
---

Nightly mutate-core fix + ADR-0100 D6 gap closure (PR #158, pending merge).

**Why:** 2026-07-13 nightly on fae0479 failed mutate-core with 4 missed mutants (zero-tolerance ADR-0050). Mutants 1-3 (delete-match-arm on StatusKind::matches true arms) were already killed by EARS-21 merged in M14.5g PR #157 — confirmed via `--list` output; exhaustive match makes them non-compilable. Mutant 4 (`replace < with <=` at ability.rs:169:60 in `apply_entry_ability`) is an **equivalent mutant** — the `.min(max_hp)` clamp makes both branches produce identical output at `current_hp == max_hp`. Cannot be killed by testing.

**How to apply:** ADR next-free is still 0104. PR targets `mdrewt/monster-realm`.

## Key decisions

**Mutant 4 (equivalent):** Added second blessed exclusion to `.cargo/mutants.toml`:
```
"ability\\.rs:169:60: replace < with <= in apply_entry_ability"
```
Equivalence: at `current_hp == max_hp`, `<` guard → branch not taken (HP stays at max). `<=` guard → branch taken, `current_hp.saturating_add(heal).min(max_hp) = max_hp` (same result). Proved by EARS-h-1a (`boundary_full_hp_no_heal`).

**D6 wiring:** `apply_ko_switch_entry_abilities` (private fn in resolve.rs) post-processes a `&[BattleEvent]` slice looking for adjacent `Faint { side: X } + Switch { side: X, .. }` pairs using `events.windows(2)`. Calls `apply_entry_ability` for each KO auto-switch. Wired after `resolve_turn`/`resolve_enemy_turn` in all three outer resolvers (Phase 2.5), followed by `sync_status_to_monsters`. Avoids threading AbilityStore/BattleStatusStore through resolve_one_attack/resolve_turn inner stack.

**Eval update:** `mutate-core-recipe-integrity.eval.mjs` updated to require EXACTLY TWO entries (was one). TEETH 8 retargeted to 3-entry fixture; TEETH 14 added (single entry → fail). CANONICAL_MUTANTS_TOML updated.

## Traps to remember

- `mutants.toml` is in `.cargo/` (not root) — worktree has its own copy that must match
- TEETH 8 in the integrity eval was previously "2 entries = bad"; changing to "3 entries = bad" is a CORRECTION not a weakening (the new blessed count is 2)
- `apply_ko_switch_entry_abilities` only fires for KO auto-switches (Faint→Switch adjacent pair for same side); player-initiated Switch events (in `resolve_player_swap`) don't have a preceding Faint so they're not double-counted
- BattleEnd replaces Switch when no conscious member remains → `windows(2)` correctly doesn't fire (BattleEnd ≠ Switch)
- In a single `resolve_turn`, at most ONE Faint→Switch pair can occur (per the "faster KO → slower doesn't act" rule)

## Files changed

- `game-core/src/combat/resolve.rs` — `apply_ko_switch_entry_abilities` helper + 3 call sites
- `game-core/src/combat/m14_5h_tests.rs` — 4 tests (2 boundary GREEN, 2 D6 RED→GREEN)
- `game-core/src/combat/mod.rs` — test module declaration (no `#[path]` needed)
- `.cargo/mutants.toml` — second blessed exclusion
- `evals/mutate-core-recipe-integrity.eval.mjs` — updated for 2 entries
- `docs/adr/0100-m14.5c-ability-system-wiring.md` — D6 section amended to "closed"
