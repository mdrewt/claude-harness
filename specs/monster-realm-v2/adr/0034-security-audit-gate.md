# 0034. Security audit & threat model as a launch gate
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M25; consolidates the security
  posture (ADR-0009/0015 + the per-reducer auditor).

## Context and problem statement
Security mitigations are designed in per system (intent-only reducers, RLS posture, escrow guards, supply-
chain gates), but nothing **audits the whole surface** or gates launch on a security sign-off. A multiplayer
game with an economy, trading, PvP, and untrusted chat has a large attack surface that deserves a
consolidated threat model and a real audit before launch.

## Considered alternatives
- **A maintained threat model (SSOT doc) + a tooled/manual audit + a blocking launch sign-off + a re-audit
  cadence (chosen).** Consolidates the existing mitigations into a surface view (`security-threat-model.md`),
  runs the harness `/audit` + `security-review` + `red-team` over it (with RLS-leak verification on the
  pinned version as the headline check), triages + remediates findings, and **blocks launch on open
  criticals**. Continuous mechanical gates (auditor/privacy/supply-chain/no-PII) keep it honest between
  audits.
- **Rely only on the per-reducer auditor + supply-chain gates (status quo).** Good for the continuous case,
  but no holistic surface review and no launch gate. Rejected — the gap this closes.
- **Defer security review to post-incident.** Reactive; a breach is far costlier than an audit. Rejected.
- **Only an external pen-test.** Valuable, but an external engagement is a complement, not a substitute for an
  internal threat model + standing gates. Recommended pre-launch; not the whole answer.

## Decision outcome
- Chosen: **a maintained threat-model SSOT + an audit pass + a blocking launch security sign-off + a re-audit
  cadence**, on top of the always-on mechanical gates.
- Consequences: the threat model is updated at each milestone close; RLS enforcement is *verified* at M25 on
  the pinned version (ADR-0015's defense-in-depth caveat is resolved or data moves to private tables); launch
  is blocked on open criticals; a disclosure/IR path + re-audit cadence are defined; an external pen-test is
  recommended and prepared for.
