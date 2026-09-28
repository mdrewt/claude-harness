# 0006. Schema evolution & content-sync
- Status: accepted (revised after ADR-0002 research)
- Date: 2026-06-24
- Accepted as a load-bearing decision for the M0 spec (final review pass)

## Context and problem statement
v1's single biggest deferred risk: content was seeded only in `init`, `init` does not re-run on
republish, and `--delete-data` was the only reset — so content edits never reached a live DB and there
was no migration story once real users exist.

**Key update (ADR-0002 research):** SpacetimeDB 2.x now provides this at the *platform* level —
**automatic migrations** (adding tables, indexes, and reducers on republish is always allowed and
preserves data) and **incremental migrations** as a production-ready pattern for complex/column-altering
changes. So v2 does **not** hand-roll a migration engine; it leans on the platform and adds only the
two project-specific concerns the platform does not cover: (a) re-running content seeding on republish,
and (b) re-deriving rows whose derivation inputs changed.

## Considered alternatives
- **Platform migrations + idempotent `sync_content` reducer + re-derive pass (recommended)** — rely on
  SpacetimeDB automatic/incremental migrations for *schema*; keep an **additive-first discipline** (add
  tables/columns; reserve column removal/reorder/type-change for an explicit incremental migration).
  Because `init` does not re-run on republish, content lives in a separate idempotent **`sync_content`**
  reducer that upserts content by stable id, followed by a **re-derive pass** for affected `monster`
  rows. Species ids are append-only. Enforced by a schema-snapshot eval (flags non-additive diffs that
  need an incremental migration) + an append-only-ids eval + a migration smoke-test in CI.
- **Hand-rolled versioned migration reducer chain** — rejected: duplicates what the platform now does;
  reserve only as the documented escape hatch for a change automigration refuses.
- **Export/import snapshots** — operational reset/seed; complementary, not a substitute for in-place
  evolution.

## Decision outcome
- Chosen: **platform migrations + `sync_content` + re-derive, with additive-first discipline; no bespoke
  migration engine.** Accepted; the M0 spec codifies the `sync_content` reducer, schema-snapshot eval,
  append-only-ids eval, and migration smoke-test.
- Consequences: closes v1 gap G1 with far less bespoke code than originally planned; adds the
  schema-snapshot + append-only-ids evals and a CI migration smoke-test; constrains routine schema
  changes to additive, with incremental migrations as the explicit, ADR-gated escape hatch.
