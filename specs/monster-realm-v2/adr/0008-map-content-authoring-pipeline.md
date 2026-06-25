# 0008. Map / content authoring pipeline
- Status: accepted
- Date: 2026-06-24 (accepted at M11, its milestone)

## Context and problem statement
v1's map was a single `const` grid (`poc_map()`) shared verbatim by both sides — fine for a POC, but the
expanded world (multi-zone, towns, warps, encounter zones; PLAN.md Phase B) needs real authored content.
Per `standards/principles.md`, things that vary (maps, collision, warps, encounter tables) are **data,
not code**.

## Considered alternatives
- **Tiled → RON pipeline (recommended)** — author maps in Tiled; a pure, tested importer compiles them
  to RON consumed by `game-core` (data-driven collision, warps, encounter zones, `zone_id`s). Keeps the
  core pure (no runtime fs); leverages a standard editor. Cost: build the importer.
- **Hand-authored RON** — no editor dependency; tedious and error-prone for large maps.
- **In-engine map editor** — best authoring UX; rejected as YAGNI for now (large bespoke surface).
- **Const grids (v1)** — rejected: doesn't scale past a POC.

## Decision outcome
- Chosen (accepted at M11): **Tiled → RON pipeline**, the importer kept **pure + tested**, **no in-engine
  editor**. Tiled authors maps; a build-time importer compiles them to RON that `game-core` consumes
  (collision, warps, grass/encounter tags, `zone_id`).
- Consequences: closes v1 gap G5; feeds ADR-0007 (zones) + ADR-0020 (warps); the importer is unit-tested
  like every other content loader (`validate_content` integrity: warps target existing walkable tiles;
  append-only `zone_id`s). The M1 const-map (`zone_0()`) YAGNI ends; the swap was localized to `map_for()`.
