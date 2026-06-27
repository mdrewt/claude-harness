# Sketch: M21 — Accounts & authentication

**Status:** design sketch (provisional) · **Phase D** · **Decision:** ADR-0030 · No v1 precedent (security-led).

> Provisional sketch — EARS criteria + tasks deferred to build time.

## Problem / intent
Replace anonymous SpacetimeDB identities with **real accounts** so a player keeps their data across devices
and can recover access — **without the game handling passwords**.

## Scope (condensed)
- **OIDC-backed identity:** delegate auth to an OIDC provider; the SpacetimeDB `Identity` is derived from a
  **verified token** (not anonymous). The server still trusts only `ctx.sender`.
- Because everything is keyed by `Identity` (since M2), an account-backed stable identity makes monsters/
  profile/guild **cross-device + recoverable** with **no game-data schema churn**. A lightweight owner-private
  `account` record (email **hashed**/private — PII is must-never-leak, ADR-0015).
- Lifecycle: sign-up/in/out/recover/link; a **delete-account** hook (M22 consumes it); a one-time atomic
  **guest→account claim** of an anonymous identity's data.
- **Out of scope:** rolling our own password store/crypto (never); MFA (provider); account-merge; payments.

## Key design + boundary
The identity keying makes accounts an **edge** concern, not a rewrite. **→ M22** consumes the delete hook +
account record. Confirm the OIDC/identity-from-token mechanism vs the pinned version (validation register #13).

## Risks / decisions
Account takeover → delegate to the provider; no passwords. Guest-claim steal/dupe → atomic, one-time,
server-validated. Email leak → hashed/private. Client-passed account id → identity from `ctx.sender`.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
