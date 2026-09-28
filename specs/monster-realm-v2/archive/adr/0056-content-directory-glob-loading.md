# 0056. Content as glob-loaded directories (build.rs)

- Status: proposed
- Date: 2026-06-27
- Milestone: M8.9 (workstream B)
- Surfaced by: the 2026-06-27 fan-out analysis. Companion to ADR-0055 (server-module boundary) — both split a monolith into glob-discovered units so additions are disjoint files.
- Numbering note: **provisional** (harness corpus, Status: proposed). The project-side implementation ADR is filed in `projects/monster-realm/docs/adr/` at the confirmed next-free number at build (M8.6c/6d/M8.7/M8.8 and ADR-0055 consume numbers first — confirm before creating).

## Context and problem statement

The six content registries (`species`/`skills`/`items`/`encounters`/`zones`/`type_chart`) are each a **single RON file** embedded at compile time via `include_str!` in `game-core/src/content.rs`. Under the fleet's `touches:`-disjoint fan-out model (`PLAN.md` §9, `WORKSPACE-PLAN.md` §7), two slices adding content to the same registry **collide on the one file** — even though `PLAN.md` §9 names pure content-data additions a *natural leaf* for parallelism. Phase B/C is content-heavy (M9 items, M10 fusions, M11 zones, M12 dialogue/quests, M13 shop items, M14 abilities). Because `game-core` is the pure, determinism-critical core, content is embedded at **compile time** — there is no runtime filesystem load to glob, so granularity must be solved at build time.

## Considered alternatives

- **`build.rs` codegen (chosen).** A host build script enumerates `content/<registry>/*.ron` (sorted) and emits the per-registry `include_str!` list; the loader concatenates the parsed `Vec`s. **No runtime dependency** — keeps the pure core dependency-free; deterministic (sorted, compile-time embed, pure parse); ~20 lines.
- **`include_dir` crate.** Embeds the directory tree via a proc-macro; simpler loader but **adds a runtime dependency to the pure core** — rejected as the default (a dep in the determinism-critical crate is heavier than a build script). Retained as a fallback if `build.rs` proves awkward on the pinned toolchain.
- **Keep single files / a fixed `include_str!` set.** Rejected — adding content still edits `content.rs`, so it does **not** achieve disjoint content additions (the whole point).
- **Defer to M11.** Viable, but M9/M10 add content immediately and an early migration (≤ 2 KB/file today) is far cheaper than a later one.

## Decision outcome

- Chosen: a `build.rs` glob per registry; loaders concatenate the parsed `Vec`s in **sorted filename order**; registries that grow in parallel become directories (`content/<registry>/*.ron`), while `type_chart` may stay a single file (one coherent matrix). Each content file is an independent RON list; **adding content = a new file in the registry dir, no loader edit** (the fan-out property).
- **Behavior-preserving:** the merged registry is **row-identical** to the pre-migration single file (content-parity proof-of-teeth); `validate_content` + the `append-only-ids` eval stay green; `module_bindings` and the schema snapshot are **unaffected** (content is data, not schema).
- Consequences: (+) content additions become disjoint files → parallelizable across slices, realizing the Phase B/C "natural leaf." (+) malformed content fails loudly at build/`validate_content` (parse-don't-validate preserved). (−) adds a `build.rs` to `game-core` (host-only; no runtime/wasm dependency). (−) a one-time content migration (move each registry into its directory, ids unchanged). The determinism / SSOT / parse-don't-validate spine is untouched. Per-zone/domain grouping (`content/zones/<zone>/…`) is a later evolution adopted with M11 if zone-scoped content slices become the norm.
