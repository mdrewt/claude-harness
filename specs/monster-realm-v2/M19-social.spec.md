# Sketch: M19 — Guilds, chat & social

**Status:** design sketch (provisional; **post-gate** — demoted by `playtest-replan-2026-07.md`, do not build before the playtest gate) · **Phase C** · **Decision:** ADR-0028 · No v1 precedent (security-led).

> Provisional sketch — EARS criteria + tasks deferred to build time. The defining concern (untrusted user
> content) is captured here + in the ADR + the threat model.

## Problem / intent
The community layer — **chat**, **guilds**, **friends/block** — all server-authoritative, with **untrusted
user content handled safely** (no XSS/abuse) and **moderation built in**. The security-heaviest milestone:
chat is user content rendered to *other* users.

## Scope (condensed)
- **Chat** on RLS-scoped channels (global/zone/guild/whisper): validated server-side, **rendered escaped/
  sanitized** (never raw HTML), **rate-limited**; a block list suppresses blocked senders.
- **Guilds** (`guild` + `guild_member` with roles): create/invite/join/leave/kick/promote, **role-permission-
  checked**; guild chat + roster.
- **Social graph:** `friendship` (mutual consent, reuses the ADR-0024 handshake) + one-sided `block`.
- **Moderation:** `report` + mute/ban (mod-gated, audited); structured logs for abuse signals (no PII).
- **Out of scope:** voice/rich media; ML moderation (a hook now, automation later); chat translation (no).

## Key design + boundary
**Chat = untrusted user content** — the security posture *is* the design: server-validate + **escape on
render** + rate-limit + RLS-scope + moderate (`AGENTS.md` "untrusted by default" applied to *player* content).
Final Phase-C milestone.

## Risks / decisions
XSS/markup → escape on render (inert text) + fixture. Spam → rate limit. Harassment → block + report + mute/
ban. Channel leak → RLS scoping + fixture. Client-set role/mute → server role-checks, mod-gated. PII in logs →
no-PII discipline.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
