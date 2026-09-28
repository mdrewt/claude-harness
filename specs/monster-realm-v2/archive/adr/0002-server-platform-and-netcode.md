# 0002. Server platform & netcode
- Status: accepted
- Date: 2026-06-24
- Decided via: `/debate` (see PLAN.md "Debate 1"), ratified by Drew 2026-06-24

## Context and problem statement
The game is server-authoritative: the server holds canonical state, clients send *intent* and never
mutate authority. v1 used **SpacetimeDB 2.6** — relational tables + reducers + RLS + scheduled reducers
+ generated TS bindings — which fit the model well, but left no schema-migration story (`--delete-data`
was the only reset; see ADR-0006) and a global subscription/tick fan-out (ADR-0007). v2 re-opens the
platform choice deliberately. Resolve via `/debate` before M2; the objective scorer becomes an eval.

## Considered alternatives
- **SpacetimeDB 2.x (recommended)** — keep the relational-subscription + reducer model that worked; the
  cost is owning migration tooling and zoned subscriptions, both planned. Vendored skill/`llms.txt`
  available; least churn vs. v1's proven spine.
- **Custom authoritative Rust server (Axum/Tokio + Postgres + a sync layer)** — maximal control over
  migrations + spatial queries; large bespoke netcode/sync surface to build and test.
- **Nakama / Colyseus / other game-server framework** — batteries-included matchmaking/presence; less
  natural fit for a pure-Rust shared rule core and integer-tile authority.

## Decision outcome
- Chosen: **SpacetimeDB 2.x**, because it is the only candidate that runs the *exact same compiled Rust
  `game-core`* authoritatively that the client predicts with — the anti-desync spine (SSOT, Tier-1).
  Decisive on the rule-core-fit criterion; production-proven at our use case (BitCraft, an MMORPG with
  thousands of concurrent players, runs as one module; 2.0 benchmarks ~150k tps for Rust modules).
- Migration concern resolved: SpacetimeDB now provides **automatic migrations** (adding tables/indexes/
  reducers is always allowed) and **incremental migrations** as a production pattern — this neutralizes
  v1's #1 deferred risk and is folded into ADR-0006 (we no longer hand-roll a migration story).
- Lock-in mitigation: keep **all** rules in portable `game-core`; only the thin reducer/table shell is
  SpacetimeDB-specific, so a future port re-wraps the same core (functional-core / imperative-shell).
- Rejected: Colyseus (TS↔TS sharing abandons the deterministic Rust core + clippy/proptest rigor; Node
  throughput orders below STDB), Nakama (Go/Lua server cannot share the Rust core), custom Axum/Tokio +
  Postgres (re-implements subscriptions/RLS/persistence STDB gives for free — bespoke netcode surface,
  against YAGNI).
- Conditions / follow-ups: pin the SpacetimeDB SDK + CLI version; add a migration smoke-test to CI;
  re-validate scheduled-reducer + RLS syntax against current docs before M2.
