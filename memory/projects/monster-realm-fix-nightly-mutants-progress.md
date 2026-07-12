# fix-nightly-mutants slice — progress memo

**Branch:** `feat/fix-nightly-mutants`  
**PR:** https://github.com/mdrewt/monster-realm/pull/145  
**Status:** PR open, local `just ci` EXIT=0. Supervisor owns merge.

---

## DONE

- **Scoped mutants before:** 11 missed in status.rs + weather.rs (9 XOR/shift in from_ctx_random + 2 constant-replacement in turns_remaining)
- **Scoped mutants after:** 0 missed in those two files
- **Tests written:**
  - `game-core/src/combat/status.rs` — `mod status_variance_exact_tests` (lines 337+):
    - 6 named-seed exact-value tests (`from_ctx_random_exact_seed_0/1/42/0x12345678/deadbeef/max`)
    - 1 proptest comparing production vs independent `splitmix64_derive_expected` reference
  - `game-core/src/combat/weather.rs` — `mod weather_turns_remaining_tests` (lines 290+):
    - 4 per-variant tests (`rain/sun/sandstorm/hail_turns_remaining_is_stored_value`)
    - 1 proptest `turns_remaining_identity` over all u8 × 4 variants
- **AC-M7 compliance:** `// kills:` comments with exact `file:line:col mutant` identifiers added
- **Reference scope disclaimer:** `splitmix64_derive_expected` documented as detecting single-operator mutations only
- **Review gates:** tester ✓, reviewer ✓ (2 MAJOR fixed), red-team ✓ (1 MEDIUM fixed), verifier in-progress
- **`just ci`:** EXIT=0 (lint/typecheck/test/eval/security/wasm/client)
- **Full `cargo mutants -p game-core --jobs 8`:** 5 missed (down from 16)
- No ADR authored (ADR-0098 reserved but not consumed; test-only slice, no new pattern)

---

## REMAINING

**5 pre-existing missed mutants in files OUTSIDE declared touches path:**

| File | Location | Mutant description |
|------|----------|--------------------|
| `ability.rs` | 54:13 | delete match arm `(StatusKind::Poison, StatusEffect::Poison)` in `StatusKind::matches` |
| `ability.rs` | 56:13 | delete match arm `(StatusKind::Paralysis, StatusEffect::Paralysis)` in `StatusKind::matches` |
| `ability.rs` | 58:13 | delete match arm `(StatusKind::Freeze, StatusEffect::Freeze)` in `StatusKind::matches` |
| `ability.rs` | 158:60 | replace `<` with `<=` in `apply_entry_ability` |
| `resolve.rs` | 462:22 | replace `==` with `!=` in `resolve_full_turn` |

These were in the nightly's "16 missed" but NOT in the brief's stated scope (status.rs + weather.rs). `just mutate-core` will still exit 1 until they're fixed.

---

## BLOCKERS

1. **Full nightly gate not yet green:** `just mutate-core` exits 1 (5 missed in ability.rs + resolve.rs). This slice reduces from 16→5, but the gate requires 0.
2. **Touches constraint:** ability.rs and resolve.rs are outside declared `touches:`. Expanding requires supervisor re-serialization.
3. **Verifier:** running in background (may need to confirm result before merge)

---

## EXACT NEXT STEP (to resume or follow up)

Create a follow-up slice `fix-nightly-mutants-2` with:
- `touches:` game-core/src/combat/ability.rs (test additions only), game-core/src/combat/resolve.rs (test additions only)
- Kill the 5 remaining mutants:
  - `ability.rs` StatusKind::matches — need tests for Poison, Paralysis, Freeze arm coverage
  - `ability.rs` apply_entry_ability line 158 — boundary condition `<` vs `<=`
  - `resolve.rs` resolve_full_turn line 462 — the `==` check (likely a flag or outcome comparison)

Once those 5 are killed, `just mutate-core` achieves missed=0 and the nightly gate goes fully green.
