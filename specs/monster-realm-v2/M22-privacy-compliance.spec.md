# Sketch: M22 — Privacy, data deletion & compliance

**Status:** design sketch (provisional) · **Phase D** · **Decision:** ADR-0031 (builds on 0030).

> Provisional sketch — EARS criteria + tasks deferred to build time.

## Problem / intent
A defensible **data-lifecycle** story for user data (names, chat, social graph, profiles): right-to-be-
forgotten, data export, retention — done **mechanically** so a new table can't silently retain PII.

## Scope (condensed)
- **Deletion cascade:** `delete_account` (the M21 hook) **erases** purely-personal rows and **anonymizes**
  shared records to a tombstone (a deleted user's old chat shows "deleted user", others' views/integrity
  hold) — one audited operation, identity from `ctx.sender`.
- A **registry of owner-keyed tables** is the SSOT for the cascade + a **deletion-completeness eval** (a new
  owner-keyed table not wired in fails the build — proof-of-teeth).
- **Data export** (owner-scoped, machine-readable); **retention** windows for chat/logs (a scheduled reaper);
  **no PII in logs** (the ADR-0029 rule, enforced).
- **Out of scope:** jurisdiction-specific legal text/DPA/ToS (legal, not engineering — this provides the
  mechanisms).

## Key design + boundary
The registry turns "delete all my data" from discipline into a mechanical, eval-gated property. **→ M25** the
privacy/deletion surface is part of the threat model + audit.

## Risks / decisions
Incomplete deletion → registry + completeness eval. Erase vs anonymize → erase personal, anonymize shared.
Export leaks another user → owner-scoped + fixture.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
