# Sketch: M19 — Guilds, chat & social

**Status:** design sketch (provisional) · **Phase C** · **Decision:** ADR-0028 · No v1 precedent (security-led).

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
