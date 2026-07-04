# Monster Realm M11a — Tiled→RON importer + multi-zone zone maps

**Shipped in M11a:**
- `WarpDef { from: TilePos, to_zone: u32, to_tile: TilePos }` + `ZoneMapDef { zone_id, rows, warps }` data types in `game-core/src/content.rs`
- Content loaders: `load_zone_maps`, `parse_zone_maps`, `parse_zone_maps_parts` in content.rs
- Rule layer: `build_grid` (private), `map_for`, `warp_at`, `validate_zone_maps` in `game-core/src/world.rs`
- `TileMap.warps: Vec<WarpDef>` (Serialize-only, intentional M11c ABI gating)
- `TilePos` derives `Hash` for duplicate-warp-source checks
- Content: `game-core/content/zone_maps/000-core.ron` with zones 0+1 and mutual warps
- Tiled JSON→ZoneMapDef std-only importer: `game-core/src/bin/tiled_import.rs` (no serde_json; MAX_DEPTH=64 guard; fractional/zero-dimension/NaN/Inf rejection; UTF-8 safe)
- Eval: `zone-id-append-only.eval.mjs` with baseline `zone-map-ids.json`
- ADR-0065: zone-map warp data shape decision (warps-in-TileMap, content.rs/world.rs split, std-only importer, standalone validate_zone_maps)
- ARCHITECTURE.md updated: zone_maps registry row added

**Key decisions (ADR-0065):**
- Warps as overlay list on `TileMap` (not glyph, not side-table) → Serialize through `zone_map()` wasm export (M11c ABI)
- Content.rs owns `WarpDef`/`ZoneMapDef`; world.rs owns rule functions (one-directional import: world→content)
- Tiled importer is std-only recursive-descent JSON parser (no new deps; zero-new-deps constraint preserved)
- `validate_zone_maps` is standalone, called by M11b from `sync_content` (not from `validate_content`)

**M11b obligation:** call `validate_zone_maps(&zone_maps, &zones)` from `sync_content` when loading both registries to make the gate production-live.

**M11c obligation:** clients receive `warps` field through the `zone_map()` export; no additional ABI work needed.

**Residuals:** none flagged; content layout M11a-complete.
