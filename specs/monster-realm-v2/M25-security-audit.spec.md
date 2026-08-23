# Sketch: M25 — Security audit & threat-model gate

**Status:** design sketch (provisional) · **Phase D — final pre-launch gate** · **Decision:** ADR-0034 ·
See `security-threat-model.md`.

> Provisional sketch — EARS criteria + tasks deferred to build time. The threat model + the gate decision are
> the durable content (here, the ADR, and the threat-model doc).

## Problem / intent
Per-system security is designed in + gated, but nothing **audits the whole surface** or gates launch on a
sign-off. M25 consolidates the threat model, runs a **structured audit**, tracks remediation, and **blocks
launch on open criticals** — so security is a *verified, signed-off* property.

## Scope (condensed)
- Maintain **`security-threat-model.md`** (STRIDE over movement/battles/economy/trade/PvP/chat/auth/privacy/
  platform/supply-chain) as the SSOT.
- **Audit pass:** the harness `/audit` + `security-review` skill + a `red-team`, covering authz, injection
  (chat-XSS), economy/dupe, **RLS-leak verification on the pinned version** (the headline check — resolves
  ADR-0015's defense-in-depth caveat or moves data to private tables), auth/account-takeover, rate-limit/DoS,
  deletion/export.
- **Remediation tracking + a blocking launch security sign-off** (no launch with open criticals); a
  disclosure/IR path + a **re-audit cadence**.
- **Out of scope:** a third-party pen-test (recommended; M25 preps for it); bug bounty; formal certification.

## Key design + boundary
Consolidation + a gate, not new per-system controls — the standing mechanical gates (auditor/privacy/supply-
chain/no-PII) do the continuous work; M25 is the periodic human+tooled assurance. The final pre-launch item.

## Risks / decisions
RLS confirmed not enforcing at 2.8.1 (see Recency check — this is settled, not a thing to discover) →
private-table-plus-scoped-view migration, audited for completeness. Audit theater → severity-triaged
findings + a blocking sign-off, not a checkbox.

## Recency check (2026-08-23, review pass — ceremony AUTHORIZED, PLAN.md §9)

**The "RLS-leak verification on the pinned version" headline check's premise moved from open question to
settled fact.** RLS (`client_visibility_filter`) is confirmed **unenforced** at 2.8.1 — `ADR-0197` FF3/W0-6
verified it byte-identically `unstable`-gated and unimplemented on the pinned toolchain, corroborated by
`OBS-47`'s standing instruction to build any future read-path as a `#[view]` "unless a subsequent
SpacetimeDB release documents RLS as stable" (still not the case). This is stronger than
`security-threat-model.md`'s current wording ("RLS is experimental... accepted as defense-in-depth,"
"verified per-version") suggests — that doc (this milestone's own SSOT) has been corrected in the same
session (2026-08-23) to say RLS is confirmed unenforced, not merely unverified; re-read it fresh at ceremony
time rather than trusting a cached summary. **The mitigation this sketch deferred a choice on ("verify RLS,
or move data to private tables") has already been exercised twice in production**: `ADR-0194`
(`monster_pub`) and `ADR-0198` (`battle`), both private-table + owner/participant-scoped `#[view]`. M25's
actual audit job is now narrower and more concrete than "resolve ADR-0015's caveat" — **verify completeness**
of that migration: enumerate every stakes-classified table in the threat model and confirm each either (a)
has no real confidentiality stakes, or (b) is private with a scoped view proven to match its stakes class,
with no table silently still relying on RLS for anything that matters. Per the 2026-08-23 unstable-feature
policy ruling (`mdrewt/monster-realm#342`), do not let this finding read as "avoid all unstable/beta
SpacetimeDB surface forever" — the ruling is specifically that RLS *itself* is not usable (still unstable,
zero evidence of stabilization), not a blanket stance against newly-stable features elsewhere in the audit
scope. Everything else (STRIDE coverage, chat-XSS/economy-dupe/auth audit scope, the blocking sign-off gate,
re-audit cadence) is unaffected.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
