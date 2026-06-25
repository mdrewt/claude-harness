# 0028. Social subsystem (chat, guilds, moderation) — untrusted-content posture
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M19 design (closes the v2 roadmap). No v1 precedent.

## Context and problem statement
The social layer (chat, guilds, friends) introduces a new threat class the rest of the game didn't have:
**untrusted user content rendered to other users** (chat). Unlike fetched web content (treated as data, not
instructions — `AGENTS.md`), chat is *player* content shown to *players*, so the risks are XSS/markup
injection, spam/flood, harassment, and channel-scope leaks. The subsystem must be server-authoritative,
safely rendered, rate-limited, scoped, and moderatable — and built from established patterns, not invented
ad hoc.

## Considered alternatives
- **Server-authoritative chat with RLS-scoped channels + escaped/sanitized rendering + rate-limiting +
  moderation hooks; guilds with role-based permissions; consent-based friends + one-sided block (chosen).**
  Messages are validated server-side, stored on RLS-scoped channels, and **rendered as inert text** (never
  HTML the client executes); a per-sender rate limit, a block list, and report/mute/ban with an audit trail
  provide moderation. Guilds reuse the role/permission pattern; friends reuse the ADR-0024 consent handshake.
- **A third-party chat service.** Off-loads chat but fragments authority/moderation and the data model.
  Rejected — integrated + server-authoritative.
- **Render messages as rich content/markup.** Convenient but an XSS/abuse vector. Rejected — escape on
  render.
- **No moderation (add later).** Abuse from day one; retrofitting moderation is painful. Rejected — designed
  in.

## Decision outcome
- Chosen: **server-authoritative, RLS-scoped, escaped-rendered, rate-limited chat + role-based guilds +
  consent-based social graph + built-in moderation (report/mute/ban/audit).**
- Consequences: chat-as-untrusted-content is the security posture (escape + validate + rate-limit + scope +
  moderate, each gated incl. an XSS proof-of-teeth); guild/role and friend/consent reuse established
  patterns; automated content moderation is an additive hook on the report/mute/ban surface; logs carry
  abuse signals without message PII.
