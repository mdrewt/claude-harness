---
name: monster-realm-m12.5b6
description: M12.5b6 nightly republish smoke test — critical RT-SR-01 finding (on_disconnect clears player rows), monster-table assertion, JSON-array CLI args
metadata:
  type: project
---

M12.5b6 COMPLETE (PR #98 open, tip 9ac5357, ADR-0079).

**What shipped:** nightly GitHub Actions job that exercises publish → join_game → CONTENT_VERSION bump → republish-without-delete → sync_content → assert data survived.

**RT-SR-01 (CRITICAL):** `on_disconnect` in `lib.rs:131-141` deletes `player` + `character` rows the moment the CLI disconnects after a one-shot `spacetime call`. Assertions MUST use session-independent tables. `join_game` also creates a starter `monster` row (NOT cleared by on_disconnect). The script asserts `FROM monster`, not `FROM player`.

**Gate:** `evals/smoke-republish-on-disconnect-compat.eval.mjs` permanently blocks regression to player-table assertions after CLI join_game.

**join_game CLI args:** JSON-array format `'["SmokePlayer"]'` per SpacetimeDB 2.x CLI convention.

**CONTENT_VERSION bump:** `sed -i` anchored to `^pub(crate) const CONTENT_VERSION` declaration line; `+1` not `+100`; `trap EXIT` restores `lib.rs`.

**Failure policy:** any nightly failure → inserted as NEXT slice in milestone queue (same tier as fix-red-master).

**Why:** `spacetime call` is one-shot (connect → call → disconnect) — on_disconnect fires synchronously, deletes player rows before any SQL query can see them.

**How to apply:** Never assert player/character rows after a one-shot CLI `spacetime call` in smoke tests. Always use session-independent tables (monster, inventory, species_row, config, etc.).

ADR next-free = 0080.
