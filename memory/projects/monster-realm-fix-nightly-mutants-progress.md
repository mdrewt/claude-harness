---
name: fix-nightly-mutants
description: fix-nightly-mutants DONE — PR #174, 6 tests + 2 re-pinned equivalent exclusions; line-drift + is_active traps
metadata:
  type: project
---

# fix-nightly-mutants slice — DONE

**Branch:** `fix/fix-nightly-mutants`  
**PR:** #174  
**Status:** PR open, local `just ci` EXIT=0, remote CI running  
**ADR:** None (test-only slice, no architectural decisions)  
**ADR next-free:** 0110 (unchanged)

---

## Summary

Killed 6 mutants in `trading/` test coverage to drive nightly mutate-core from missed=10 down to missed=5 (game-core files only; ability.rs + resolve.rs remain outside declared scope). Test-only changes; no schema, server, or client code touched. Discovered and documented three traps: line-drift in exemptions, is_active terminal-state equivalent, and eval-guard count coupling.

---

## Changes

### 1. `game-core/src/trading/rules.rs` — 5 new tests

Added `mod tests {}` block with five named tests:

- **`validate_accepts_counterparty_monster_only`** — kills mutant `39:9 +->*`
- **`validate_accepts_initiator_monster_counterparty_item`** — kills `40:9 +->-`, `69:12 delete!`, `84:21 ==->!=`
- **`validate_accepts_counterparty_items_only`** — kills `40:9 +->*` (alt path)
- **`validate_accepts_counterparty_currency_only`** — kills `42:36 >-><`
- **`swap_plan_includes_counterparty_currency_transfer`** — kills `220:30 >-><`

Each test uses fixture data to drive acceptance logic paths and verify the constraint guard operates correctly.

### 2. `game-core/src/trading/types.rs` — new test module

Added `mod tests {}` with:

- **`trade_error_display_is_meaningful`** — kills `89:9 ->Ok(Default)` in `Display` impl

Ensures error Display fallback does not replace actual error variant.

### 3. `.cargo/mutants.toml` — re-pinned + new entry

- Re-pinned `ability.rs` exemption: `169:60` → `170:60` (line drift from prior slices)
- Added entry 3 for `trading/types.rs:56:9 is_active` (equivalent mutant, see trap below)

### 4. `evals/mutate-core-recipe-integrity.eval.mjs` — updated fixture

- Updated blessed exclusions from 2 to 3 entries
- Re-pinned ability.rs needle to `:170:60`
- Added `is_active` entry-3 check (TS narrowing + row-deletion witness)
- Added TEETH 15 (new guard for entry-3 existence check)
- Updated CANONICAL_MUTANTS_TOML quoting to match mutants.toml count

---

## Three Key Traps Discovered

### 1. Line Drift in Exemptions

`ability.rs` exemption was originally at `169:60`. Between M14.5h and this slice, code shifted to `170:60` due to insertions or refactoring in prior slices. The nightly runner's line-based detection re-surfaced this as a "missed" mutant. **Lesson:** exemptions must be re-checked and re-pinned consciously after each slice; line numbers are brittle.

### 2. is_active Equivalent Mutant

`TradeStatus` enum has only 2 variants, both returning `true` from `is_active()`. Terminal state is represented by row deletion, not an enum variant. Therefore, replacing `is_active -> bool` with `true` (constant folding) is genuinely equivalent — the mutant cannot be killed without adding a third enum state. Documented in mutants.toml entry-3 as an exception.

### 3. Eval Guards the Count

The mutants.toml count (2→3) is guarded by multiple points in the eval:

- CANONICAL_MUTANTS_TOML quote-count check
- TEETH 15 fixture witness for entry-3 existence
- eval's loop-count assertion

All three must be updated together. A mismatch (e.g., adding an entry without updating CANONICAL_MUTANTS_TOML) causes eval to FAIL with a counting mismatch error.

---

## Gates

- **Local `just ci`:** EXIT=0 (all Rust + JS + eval tests pass)
- **Remote CI:** running at time of PR open
- **Full mutate-core:** 10 → 5 missed (game-core only; ability.rs/resolve.rs remain out of scope)

---

## No ADR

This slice is test-only (no new patterns, no schema, no server/client logic). No ADR was authored. ADR next-free stays 0110.

---

## Next Step

Remaining 5 missed mutants are in `ability.rs` (lines 54, 56, 58, 158) and `resolve.rs` (line 462). They fall outside the declared scope of this slice and require supervisor re-serialization + separate `fix-nightly-mutants-2` slice to address.
