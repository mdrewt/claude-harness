# 0055. Server-module internal module boundary (modularization for fan-out)

- Status: proposed
- Date: 2026-06-27
- Milestone: M8.9
- Surfaced by: the 2026-06-27 structural review (file-size census + blast-radius). Load-bearing for M8.9.
- Numbering note: **provisional.** 0035–0053 are implementation ADRs in the project repo (`projects/monster-realm/docs/adr/`); 0054 is proposed by M8.8. This record lives in the harness spec corpus because M8.9 is a harness-spec'd milestone; the **project-side implementation ADR is filed at the confirmed next-free number when M8.9 is built** (re-confirm — M8.7/M8.8 consume numbers first). The decision below is the SSOT regardless of the eventual project-side number.

## Context and problem statement

`server-module/src/lib.rs` reached ~2081 production lines (15 `#[table]` structs, 18 `#[reducer]`s, 27 helper fns) in a single flat namespace — every other crate is healthy (the client's largest production file is ~310 lines; game-core's large file *totals* are inline tests, not logic). The monolith is not just a readability cost: under the fleet's `touches:`-disjoint parallel-build model (`PLAN.md` §9, `WORKSPACE-PLAN.md` §7), the supervisor runs two slices concurrently **only when their `touches:` sets are disjoint**. Because *all* server gameplay (battle, taming, movement, content, monster-mgmt) lives in that one file, every server-side slice declares `touches: server-module/src/lib.rs` and is therefore forced **serial** — the bottleneck observed across M7/M8/M8.5–M8.8. `standards/adr-process.md` requires an ADR to introduce a new module boundary.

## Considered alternatives

- **Split `server-module` into cohesive domain submodules of the same crate (chosen).** `schema`, `guards`, `marshal`, `content`, `movement`, `monster_mgmt`, `battle`, `taming`, with `lib.rs` reduced to module wiring + the lifecycle reducers (`init`/`sync_content`/`on_disconnect`); consolidate the repeated per-reducer ownership-check preamble into `guards::require_owner`; extract inline `#[cfg(test)]` modules to sibling `*_tests.rs` (matching the convention game-core already uses). This module map becomes the canonical `touches:` vocabulary so downstream slices name a domain module instead of the whole file.
- **Leave it as one file.** Rejected — the parallelism bottleneck persists and worsens as M11–M16 add server surface; review and impact analysis stay coarse.
- **Split `game-core`/`server-module` into additional *crates*.** Rejected as YAGNI (ADR-0005, single cohesive workspace) — intra-crate modules give the boundary without the crate-graph overhead.
- **Lighter "logic-in-modules, macros-in-`lib.rs`" split (fallback).** Retained as the fallback **iff** the M8.9a spike shows `#[spacetimedb::table]`/`#[reducer]` do not register from a submodule on `spacetime 2.6.0`: keep the macro definitions in `lib.rs` but move helper/inner logic into domain modules. Cuts the file substantially with less `touches:` benefit.

## Decision outcome

- Chosen: **the domain-submodule split**, gated by a verify-first spike (M8.9a) confirming submodule macro registration on the pinned `spacetime 2.6.0`, else the lighter fallback.
- **Behavior is provably unchanged** — table/reducer names are explicit (`name = character`, …), so regenerated TypeScript bindings are **byte-identical** and the `schema-snapshot` eval is unchanged; the `bindings-drift` + `schema-snapshot` evals plus full `just ci` are the acceptance gate (no behavior is added, so there is nothing new to test beyond "the integrated whole is identical").
- Consequences: (+) server slices touching different domains become `touches:`-disjoint and parallelizable (the milestone's own test-extraction tail demonstrates it); smaller diffs; tighter blast radius. (−) a one-time serial reorg (M8.9's move slices share `lib.rs`); (−) `schema.rs` becomes a single serialization point for table-adds (acceptable — additive schema changes are rare and want one reviewable diff); (−) a modest learning cost to know which module owns a reducer, mitigated by recording the module map (in `ARCHITECTURE.md`) as the `touches:` vocabulary. The SSOT/parity/determinism/privacy-split spine is untouched.
- Scope boundary: M8.9 must **not** relocate reducer-resident *rules* into `game-core` (the level-up HP-heal, the recruit-path turn advance) — those are SSOT/correctness items owned by M8.8; M8.9 inherits whatever shape M8.8 leaves and only moves code between files.
