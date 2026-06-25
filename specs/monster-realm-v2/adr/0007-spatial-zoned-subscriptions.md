# 0007. Spatial / zoned subscriptions & per-zone tick
- Status: accepted
- Date: 2026-06-24
- Accepted as a load-bearing decision for the M0 spec (final review pass)

## Context and problem statement
v1 subscribed `SELECT *` per table and ran one global `movement_tick` over every character — O(all
rows) fan-out. RLS protected private data but `character`/`player` fanned out globally. v1 left
per-zone subscriptions and per-zone ticks as a deferred "scaling path" (schema was seeded with
`map_id`/`zone_id` to make it a query change, not a migration). v2 promotes this to the default so
concurrency never requires a schema change.

## Considered alternatives
- **Zoned from day one (recommended)** — every world table carries an indexed `zone_id`/`map_id`;
  clients subscribe to their zone (+ neighbors) via SQL-filtered subscriptions; ticks are scheduled
  per-zone. Slightly more setup at M2; no later migration.
- **Global subscription until measured (v1's choice)** — simplest now; rejected because the expanded
  multi-zone world (M11+) makes the fan-out a near-term certainty, not a hypothetical.

## Decision outcome
- Chosen: **zoned from day one.** Every world table carries an indexed `zone_id`/`map_id`; subscriptions
  are SQL-filtered per zone; ticks are scheduled per-zone. Enforced from M0 by an architecture eval that
  fails any world table lacking an indexed `zone_id` (the M0 `presence` table is the first to comply).
- Consequences: closes v1 gap G2; couples to ADR-0008 (zones come from authored maps); the M0 architecture
  eval makes the convention mechanical, so M1+ tables inherit it by construction rather than by discipline.
