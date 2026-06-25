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
