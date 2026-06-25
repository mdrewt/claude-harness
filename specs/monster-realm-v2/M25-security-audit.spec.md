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
RLS silently not enforcing → verify on the pinned version; fall back to private tables. Audit theater →
severity-triaged findings + a blocking sign-off, not a checkbox.
