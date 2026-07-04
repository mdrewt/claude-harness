---
name: monster-realm-m10.5b-progress
description: M10.5b ARCHITECTURE.md reconcile — DONE/REMAINING/BLOCKERS/next-step memo
metadata:
  type: project
---

# M10.5b progress memo — ARCHITECTURE.md reconcile with M9/M10a

**Status:** TERMINAL — PR #108 open, local `just ci` GREEN, remote CI running.
**Branch:** `feat/m10.5b-architecture-reconcile`, tip `b03d980`
**Worktree:** `.claude/worktrees/m10.5b`

## DONE

All three remaining sub-items from the scope:

### 10.5b-1 — Module-map table
- Added `inventory.rs` row (`grant_item`/`consume_one` — single item-mutation surface, ADR-0059)
- Added `raising.rs` row (`care`/`train`/`evaluate_heal`/`heal_party` — ADR-0058/0059)
- Removed `grant_item`/`consume_one` from `taming.rs` row (taming now: `attempt_recruit`/`grant_bait`)
- Also fixed: removed `heal_party` from `battle.rs` row — it was stale there since M12b moved it to `raising.rs`

### 10.5b-2 — Content-registry table
- Updated species row: `000-core.ron` + `010-derived.ron` (was "currently `000-core.ron`")
- Added `evolutions` row (`content/evolutions.ron`, single file, ADR-0060)
- Added `fusion` row (`content/fusion.ron`, single file, ADR-0060)
- Added `npcs`, `dialogue_trees`, `quests`, `heal_locations` directory rows (all present on disk since M12)
- Fixed `zone_maps` row (removed spurious `|` separator)

### 10.5b-3 — ADR prose
Already done by m12.5g (ARCHITECTURE.md Decisions section references 0058–0061; range 0035–0080). Verified, not re-done.

### 10.5b-4 — New subsystem sections + Status block
- Added `## Raising subsystem` (M9 — ADR-0058/0059): pure rules + `raising.rs` server + `inventory.rs` + M9c client
- Added `## Evolution/Fusion content` (M10a — ADR-0060/0061): content shape + pure rules + M10b server + M10c client
- Status block already correctly marks M9 and M10a as complete; no stale forward-looking "M9 is future" wording found

### 10.5b-5 — README server-module/
Already done by m12.5g. Verified.

## VERIFICATION (spec §4 greps)

All pass:
- `grep -nE '^\s*(pub\s+)?mod ' server-module/src/lib.rs` → 12 mods; all 12 in module-map table ✓
- `grep -rn 'fn grant_item|fn consume_one' server-module/src` → `inventory.rs` only ✓
- `find game-core/content -name '*.ron'` → all 14 RON files have table entries ✓

## REMAINING

None for m10.5b. Remaining M10.5 slices:
- **10.5c** — docs/adr/ index + numbering reconcile (`docs/adr/README.md` prose range + next-free + table)
- **10.5d** — Gate hardening: `allowOnly:false`/`forbidOnly`, per-eval isolation in `evals/run.mjs`, `flushBatch` per-listener try/catch

## BLOCKERS

None.

## EXACT NEXT STEP

Supervisor: squash-merge PR #108 → master. Then launch 10.5c (docs/adr/ index residuals, disjoint from 10.5d). ADR next-free = 0081 unchanged.
