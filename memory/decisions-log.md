# Cross-project decisions log

Append-only summary of notable decisions (one line each) with a pointer to the
full ADR in the project repo.

| Date | Project | Decision | ADR |
|------|---------|----------|-----|
| 2026-06-23 | (harness) | Workspace setup per WORKSPACE-PLAN.md v2.1 | — |
| 2026-06-23 | (harness) | Built all 7 stack templates, sync-templates drift tool, harness test suite (5/5), SDD spec template + example | — |
| 2026-06-23 | (harness) | Fixed justfile syntax (just uses indented bodies, not `recipe: ; cmd`); added per-stack CI toolchain setup; added justfile-syntax guard test | — |
| 2026-06-23 | (harness) | Adopted from external CLAUDE.md: tiered+inverted principles, mechanical-enforcement map + /simplify, cost-aware doc routing, compaction/curation/honesty/diff rules, impact-analysis + code-graph MCP note | — |
| 2026-06-24 | (harness) | Ship PreToolUse destructive-command guard hook to generated projects | `docs/adr/0002-pretooluse-destructive-command-guard.md` |
| 2026-06-24 | (harness) | Auto-format edited files via PostToolUse hook (Biome/Ruff/rustfmt) | `docs/adr/0003-posttooluse-auto-format-hook.md` |
| 2026-06-24 | (harness) | Pin GitHub Actions to digests via Renovate preset | `docs/adr/0004-pin-github-actions-digests-via-renovate.md` |
| 2026-06-24 | (harness) | Cancel superseded CI runs via workflow concurrency group | `docs/adr/0005-cancel-superseded-ci-runs.md` |
| 2026-06-24 | (harness) | Mechanically enforce mutation/coverage/SCA gates (CI + invariants tests) | `docs/adr/0006-mechanical-enforcement-of-test-and-supply-chain-gates.md` |
| 2026-06-27 | monster-realm | M8c: wild individuality stored as `individuality_seed` in private `battle_wild` side-table (1:1 by `battle_id`), NOT on the public `battle` row; `battle` is client-subscribable (ADR-0042) and raw RNG-derived genes are must-never-leak (ADR-0015) | `monster-realm/docs/adr/0045-wild-individuality-private-table.md` |
| 2026-06-27 | monster-realm | M8.5a: `start_battle` opponent-provenance authz rejects non-self/non-WILD_IDENTITY (reject-not-clamp), P0 closes conscription/grief/XP-farm; party bounds on both sides (O(1) guards before DB read); write-back asserts positional coupling via checked `.get(i)`; side-B no-write intentional PvE semantics deferred to M16/PvP | `monster-realm/docs/adr/0048-start-battle-opponent-provenance-authz.md` |
| 2026-06-27 | monster-realm | M8.5a: ADR-0042 amended — side-B no-write is intentional, not a bug; symmetric write-back only with real PvP + per-side authority (M16/ADR-0017) | `monster-realm/docs/adr/0042-private-battle-table-design.md` (amended) |
| 2026-06-27 | monster-realm | M8.6d closed/subsumed by M8.5b (BST relocated to `game_core::base_stat_total`, ADR-0049 §4); doc-comment verified accurate; no code/behavior change, no new test | — |
| 2026-07-02 | monster-realm | M11a: zone-map warp data shape — warps-in-TileMap as serialized overlay (not glyph, not side-table); content.rs data layer / world.rs rule layer split (one-way import); std-only Tiled JSON importer (no serde_json); `validate_zone_maps` standalone gate called by M11b from `sync_content` | `monster-realm/docs/adr/0065-zone-map-warp-data-shape.md` |
| 2026-07-04 | monster-realm | M10.5a: empty-moveset guard closes panic path — 3-point defense (validate_content load-time check, wild_battle_monster boundary guard, battle_monster_from_row owned-monster defense-in-depth); ADR-0049 amended | `monster-realm/docs/adr/0049-empty-moveset-panic-guard.md` (amended) |
| 2026-07-10 | monster-realm | M13.5d: content parse caching — hot-path registries cached via `LazyLock<Result<Vec<T>, String>>` statics in server-module; client-wasm two-level cache (registry + thread_local active-zone); game-core stays pure (functional-core/imperative-shell); determinism/parity evals green | `monster-realm/docs/adr/0089-content-parse-caching.md` |
| 2026-07-10 | monster-realm | M13.5e: client UX correctness — bait save/restore across re-renders [e-1], zone-switch early-return + N=3 reload msg [e-2], rationale comment on unfiltered battle subscription [e-3], sortableChildren+zIndex O(n log n) [e-4], EWMA adaptive interp delay + depth-4 ring buffer (ADR-0090, supersedes ADR-0075) [e-5] | `monster-realm/docs/adr/0090-adaptive-interp-delay.md` |
| 2026-07-13 | monster-realm | M14.5d: client battle UX completeness — weather pipeline (StoreWeather + VM + DOM banner; value→turnsRemaining rename; zero-falsy trap), BattleOutcomeTag literal union + exhaustive switch with never-check, bindings-derived parity guards (length-anchor + known-member proof-of-teeth), battleVMsEqual VM-compare + shouldSkipBattleRefresh visibility guard (JSON.stringify rejected for bigint); 14.5d-1 cure-item UI PARKED as spec gap | `monster-realm/docs/adr/0101-m14.5d-client-battle-ux.md` |
