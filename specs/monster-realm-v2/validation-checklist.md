# Validation & assumptions register

**Date:** 2026-06-24 · **Purpose:** the corpus flags many load-bearing assumptions as "confirm against the
pinned version" — scattered across specs. This register **consolidates them into one verify-first checklist**
so the build team de-risks the highest-stakes unknowns *before* (or as) they build, not after. It is the
artifact form of the recommended **validation spike**. Pair it with the **fun-validation** gate in
`game-design.md` §4 (this register = technical assumptions; the GDD = "is it fun").

> **How to use:** confirm Tier-1 items in a short spike *before* committing to the build order; confirm
> Tier-2 at the start of the owning milestone; Tier-3 at their (later) milestone. A failed assumption is a
> design change, not a surprise.

## Tier 1 — verify in a pre-build spike (highest stakes; failure reshapes many specs)

| # | Assumption | Used by | Risk if wrong | How to verify |
|---|---|---|---|---|
| 1 | **RLS (`client_visibility_filter`) actually filters** on the pinned SpacetimeDB version (it was experimental / "not fully enforced") | ADR-0015, M6, M16, M21 — all owner-private data | Hidden genes / ranked PvP picks / PII leak | Two identities, one subscribes; confirm it receives **none** of the other's rows. If it doesn't filter → move must-never-leak data to **private tables** (already the ADR-0015 fallback) |
| 2 | **Scheduled-reducer privacy + the module-identity accessor** (2.x made scheduled reducers private-by-default and renamed the accessor) | M2, ADR-0011 (the tick) | The tick is client-callable (world-speed exploit) or the guard mis-compiles | Try to call `movement_tick` from a client (must reject); confirm the accessor name in the pinned docs |
| 3 | **The harness generator scaffolds a green build** (`just new monster-realm spacetimedb-game`) on the real toolchain (Rust 1.96.0, spacetime 2.6.0, wasm-pack 0.15.0, `just`) | M0 | The whole build order assumes the template works | Scaffold, `just ci` → empty-but-green |
| 4 | **Per-transaction / `onApplied` batch-update mechanism** exists (atomic reconcile) | ADR-0013, M4 (anti-rubberband) | Reconcile on a half-applied batch → rubberband (the v1 feel bug) | Inspect the SDK update callbacks; confirm a per-transaction batch hook, or coalesce per frame |
| 5 | **The netcode actually *feels* smooth** (empirical, not provable on paper) | ADR-0013, M3/M4/M5 | v1 was clean and still felt bad | Build M0–M5, play two windows; watch the divergence/reconcile metrics; *feel* it |

## Tier 2 — confirm at the start of the owning milestone

| # | Assumption | Used by | Verify |
|---|---|---|---|
| 6 | `spacetimedb` **crate version ≠ product version** (e.g. crate 1.x for product 2.6) | M0 | Match the crate to the installed CLI; confirm vs docs |
| 7 | `ctx.timestamp` → `Millis` conversion + `Timestamp` representation | M1/M2 | Confirm the unit/epoch; pin `Millis = i64` ms accordingly |
| 8 | **Automigration + incremental migration** semantics (additive vs breaking) | ADR-0006, M11 | Migration smoke-test: additive republish preserves data |
| 9 | `ScheduleAt::Interval` API shape | M2 | Confirm against the pinned crate |
| 10 | **Serializable isolation + reducer re-execution** (the double-submit guard relies on it) | M16 | Confirm the concurrency semantics in the docs (the in-code guard suffices only if true) |
| 11 | **Vite + wasm** (`vite-plugin-wasm` + top-level-await) builds the `client-wasm` pkg | M3/M4 | Build the frontend consuming the wasm |
| 12 | **`spacetime` runs in a CI container** for in-CI e2e | ADR-0009, M5 | Stand up the service container; publish + e2e |

## Tier 3 — confirm at their (later) milestone

| # | Assumption | Used by | Verify |
|---|---|---|---|
| 13 | **OIDC / identity-from-token** mechanism on the pinned version | M21, ADR-0030 | A real account yields a stable `Identity` across devices |
| 14 | **OTel → Datadog** integration (the harness plugin) | M20, ADR-0029 | Exporters emit; dashboards render |
| 15 | **PixiJS HD-2D path** (`pixi-lights` normal maps + `pixi-filters`) at the target resolution/perf | ADR-0004 | An HD-2D lighting prototype (the art-cost + look spike) |
| 16 | **Per-zone tick + subscription cost** holds at target concurrency | M2/M11/M20 | The sim-harness load test against the budget |

## Notes
- **Most Tier-1 risk is SpacetimeDB-capability risk** — a half-day connecting to the pinned version and
  poking RLS, scheduled-reducer privacy, the batch-update hook, and the scaffold would retire the bulk of it.
- A failed assumption usually has a **documented fallback already in the specs** (e.g. RLS → private tables;
  no batch hook → frame-coalesce). The point of verifying early is to choose the fallback *before* building on
  the assumption, not after.
- Keep this register current: a new "confirm vs pinned version" flag in any spec gets a row here.
