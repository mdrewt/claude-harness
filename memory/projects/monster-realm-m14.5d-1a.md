---
name: monster-realm-m14.5d-1a
description: m14.5d-1a: additive cure_status column on item_row — StatusKind SpacetimeType, CONTENT_VERSION 12, EA-6 gate, PR #162
metadata:
  type: project
---

m14.5d-1a DONE (PR #162, ADR-0105, tip 85fcdd5). Server half of the re-serialized 14.5d-1 pair.

**Why:** ADR-0101 parked the Use-Item battle UI because `item_row` lacked `cure_status`, leaving clients with no data path to classify cure items. This server slice adds the additive column.

**How to apply:** m14.5d-1b can now build the client Use-Item UI using `cureStatus !== null` on `item_row` subscriptions, mirroring the bait-selector pattern.

## Key decisions

- `StatusKind` derives `#[cfg_attr(feature = "spacetimedb", derive(spacetimedb::SpacetimeType))]` (cfg-gated, ADR-0003) — first SpacetimeType enum in game-core/src/combat/ability.rs
- `ItemRow.cure_status` is the LAST field (additive discipline, ADR-0006). Wire tag: None=0, Some(variant)=1
- Reducer `use_battle_item` still reads `cached_items()` (content SSOT) — `item_row.cure_status` is client-classification-only (D3)
- `CONTENT_VERSION` bumped 11→12 — CRITICAL: without this, deployed DBs at v11 skip the entire item_row upsert loop (`sync_content_inner` returns early at line 36-40)
- `ItemRow.cure_status` needs NO `#[serde(default)]` — top-level SpacetimeDB table columns are handled at engine level on publish; only embedded types in BSATN blobs (like `BattleMonster.status`) need serde(default) for the serde/RON codec path (ADR-0103 §FINDING)

## Traps

- **CONTENT_VERSION trap**: Any schema change to `item_row` requires bumping CONTENT_VERSION or deployed DBs will silently skip re-seeding. EA-6 gates this permanently.
- **SpacetimeType enum eval trap (MINOR-1)**: `spacetime-type-snapshot.eval.mjs` regex terminates at first `\n\s*}` — multi-line struct-body enum variants would drop trailing variants. ALL SpacetimeType enum variants must use inline or unit form; comment added to eval.
- **Two-source-of-truth (NOTE-2)**: `item_row.cure_status` (table) and `cached_items()` (in-process) hold the same logical value. If `sync_content` fails, client sees None but game logic is still correct. Accepted as design per ADR-0105 D3.

## Baseline changes

- `spacetime-types.json`: StatusKind enum added (Poison/Burn/Paralysis/Sleep/Freeze)
- `table-schemas.json`: item_row gains `"cure_status": "Option<StatusKind>"`
- `content-hash.json`: version 11→12 (same hash — content RON files unchanged)

## Gates

55 eval PASS (0 FAIL). 1104 Rust tests. 833 TS tests. EA-1 through EA-6 source-guard tests GREEN. Reviewer BLOCKER-1 + MAJOR-1 addressed. Red-team no BLOCKER/MAJOR. Verifier PASS.

[[monster-realm-m14.5d-1a-progress]]
