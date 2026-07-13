---
name: monster-realm-m14.5e
description: M14.5e content-cache expansion — cached_skills/cached_items, 4 call-site switches, comment corrections, ADR-0089 amended in place
metadata:
  type: project
---

M14.5e DONE (PR #153, ADR-0089 amended in place — NO new ADR number consumed, next-free still 0101, tip 561836d).

**Why:** Four hot-path reducers introduced by M14 slices (M14d/M14e/M14.5a) — `battle.rs` `submit_attack`, `swap_active`, `use_battle_item`, and `taming.rs` `attempt_recruit` — were calling bare `load_skills()` / `load_items()` per turn, re-parsing compile-time-embedded RON on every invocation.

**What shipped:**
- `content_cache.rs`: added `SKILLS` and `ITEMS` `LazyLock` statics + `cached_skills()` / `cached_items()` accessors (identical pattern to `ZONE_MAPS`; six statics total, up from four).
- Four call-site switches: `submit_attack` and `swap_active` use `cached_skills()`; `use_battle_item` uses `cached_items()` keeping its `.map_err(|e| format!("content error: {e}"))` wrapper byte-identical; `attempt_recruit` uses `cached_skills()`.
- Comment corrections: stale false-"content cache" comments in `battle.rs`/`taming.rs` removed; stale `marshal.rs` doc comments implying per-call parsing corrected.
- ADR-0089 amended in place (status stays `accepted`): context table gained four rows; Decision section updated to six statics; Amendment section appended.

**Gating-test design (proof-of-teeth):** `hot_path_reducers_use_cached_content_not_load` — `include_str!` source guard per reducer, comment-strip, fn-body extraction, module-qualified needles asserting `cached_skills` / `cached_items` present and bare `load_skills` / `load_items` absent. Two-part `use_battle_item` pin: asserts `cached_items().map_err` AND literal `"content error: "` are present contiguous on one line (rustfmt split would fail LOUD). Direct-equality transparency tests (`SkillDef`/`ItemDef` derive `PartialEq`) + `LazyLock` pointer-identity tests. Helper extraction logic inlined a third copy because `battle_tests` and `taming_tests` helpers are private — rule-of-three consolidation flagged as follow-up.

**Named residual — `load_abilities()` not yet cached.** Re-parses at five sites: `start_battle`/`begin_encounter` (per-battle) + `submit_attack`/`swap_active`/`attempt_recruit` (per-turn, per ADR-0100/M14.5c). Per-turn sites carry `// PARK(ADR-0089 amendment, M14.5e)` comments. `cached_abilities()` is the natural next slice.

**Trap for future slices:** the `use_battle_item` source guard pins `cached_items().map_err` contiguous on one line. A rustfmt reformat that splits that expression will break the gate loud, not silently — do not split it.

**Second trap (bitten in-branch):** an orphan `/*` inside a string/doc comment of ANY server-module .rs file blinds `stripRustComments` in `evals/battle-schema-snapshot.eval.mjs` (shared SSOT parser, also used by okf-export/knowledge gate) for everything concatenated after it alphabetically — schema.rs tables vanish (0 parsed). Write comment markers only as same-line `/* ... */` pairs in strings/docs. Eval-side hardening queued as follow-up (evals/** was outside 14.5e touches). Related: [[monster-realm-m13.5d]], [[monster-realm-m14.5c]].
