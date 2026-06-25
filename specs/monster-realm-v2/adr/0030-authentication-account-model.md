# 0030. Authentication & account model
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M21; consumed by M22.

## Context and problem statement
v1/the POC keyed everything on SpacetimeDB's **anonymous `Identity`** (per-token). For launch a player must
keep their data across devices and recover access — which an anonymous, unrecoverable token can't provide.
The game must add real accounts **without handling passwords/crypto itself** and without rewriting the
`Identity`-keyed data model.

## Considered alternatives
- **OIDC-backed stable identity (chosen).** Delegate authentication to an OIDC provider; SpacetimeDB derives
  the `Identity` from a verified token, so a real account yields a **stable identity** across devices and the
  existing `Identity`-keyed data follows it with no per-table change. A lightweight owner-private `account`
  record + a one-time guest-claim migration are the only additions. The server still trusts only `ctx.sender`.
- **Anonymous-only (v1).** No recovery/cross-device; a lost token loses the account. Rejected for launch.
- **Custom username/password auth in the game.** Storing/verifying passwords is a large security liability
  (breach surface, crypto correctness). Rejected — never roll your own auth.
- **A bespoke session/token system.** Reinvents OIDC poorly. Rejected.

## Decision outcome
- Chosen: **delegate authentication to an OIDC provider; derive a stable SpacetimeDB `Identity` from the
  verified token; add an owner-private `account` record + a one-time guest→account claim.**
- Consequences: no game-data schema churn (the M2 identity keying pays off); passwords/crypto stay out of the
  game; email/PII is must-never-leak (ADR-0015 → hashed/private); the `delete_account` hook feeds M22
  privacy; confirm the exact OIDC/identity-from-token mechanism against the pinned STDB version. Providers,
  MFA, and account-merge are product/provider concerns layered on this.
