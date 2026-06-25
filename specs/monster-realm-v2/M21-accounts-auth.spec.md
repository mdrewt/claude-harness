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
