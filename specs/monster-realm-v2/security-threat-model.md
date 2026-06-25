# Security threat model (cross-cutting)

**Date:** 2026-06-24 · **Decision:** ADR-0034 · **Scope:** the whole v2 system (M0–M24).
**Status:** the SSOT for the security posture — mirrors `netcode-quality-review.md` (feel) and
`observability-performance-plan.md` (robustness); this one secures the **attack surface**. The audit + sign-
off that exercises it is **M25**.

## 0. Posture recap (already designed in)

Security is not a bolt-on: every reducer takes identity from `ctx.sender`, accepts **intent only**,
**rejects (never clamps)**, and re-validates ownership/legality (the M0 reducer-security-auditor eval);
RLS is **defense-in-depth, stakes-classified** (ADR-0015); supply chain is gated (gitleaks/Semgrep/SCA/SBOM,
M0); and the netcode is integer-tile + server-authoritative so position/damage/odds can't be forged. This
threat model **consolidates** those into one surface view and names what M25 must audit.

## 1. Attack surface & threats (STRIDE-style)

| Surface | Threat | Mitigation (spec) |
|---|---|---|
| **Movement** | client forges position / moves too fast | integer tiles + intent-only + server-paced queue/tick (M1/M2, ADR-0011) |
| **Battles** | client forges damage / unknown skill / outcome | server-resolved, validate skill known, integer damage (M7, ADR-0017) |
| **Recruit/encounter** | client sets catch odds / reads spawn weights | server computes odds; `encounter` is a **private** table (M8) |
| **Economy** | client-set prices/totals; negative/overflow balance | server-priced, server-computed totals; saturating + reject-on-insufficient (M13, ADR-0018/0022) |
| **Trading** | dupe / theft / trade an in-use asset | dual-consent escrow, atomic re-verified swap, `reject_if_in_*` guard family (M15, ADR-0024) |
| **PvP** | read opponent's pick; rage-quit voids loss; double-submit | secret picks (private/RLS-verified), turn-deadline reaper, forfeit-not-delete, serialized double-submit guard (M16, ADR-0025) |
| **Ranked** | self-report a win; double-count rating | server applies rating once from the authoritative outcome; module-write-only profile (M17, ADR-0026) |
| **Chat / social** | XSS/markup injection; spam; harassment; channel leak | server-validate + **escaped render** + rate-limit + RLS scope + moderation (M19, ADR-0028) |
| **Privacy (RLS)** | hidden genes/picks leak (RLS experimental) | stakes-classified: scout-level→RLS (verified per-version); must-never-leak→**private table** (ADR-0015) |
| **Auth / accounts** | account takeover; guest-claim steal; PII leak | delegate to OIDC (no in-game passwords); atomic one-time guest-claim; email hashed/private (M21, ADR-0030) |
| **Data / privacy** | incomplete deletion retains PII; export of another's data | registry-driven deletion-completeness eval; owner-scoped export (M22, ADR-0031) |
| **Platform / DoS** | reducer flood / bot abuse | per-action rate limits (chat M19, move-queue cap M2) + infra rate-limiting (ops) |
| **Supply chain** | secret leak / malicious dep / SAST hole | gitleaks + Semgrep + SCA + SBOM + Renovate (M0, ADR-0009) |
| **Determinism** | desync exploited / float divergence | integer-only rules + determinism gate + parity evals (M0–M3) |

## 2. Standing controls (mechanical, always-on)
- **reducer-security-auditor eval** (identity/intent/reject/ownership/no-panic) on every reducer.
- **privacy evals + proof-of-teeth** per owner-private table; the **deletion-completeness eval** (M22).
- **supply-chain gates** (gitleaks/Semgrep/SCA/SBOM) in CI.
- **no-PII logs** (ADR-0029) as a privacy check.

## 3. What M25 (the audit) adds beyond the standing controls
- A **structured threat review** (this doc, kept current) against the surface above.
- A **manual + tooled security audit** (the harness `/audit` + `security-review` skill + a `red-team` pass)
  before launch: authz review, injection (chat/SQL-ish), economy/dupe exploits, RLS-leak verification on the
  **pinned** STDB version, auth/account-takeover, rate-limit/DoS.
- **Remediation tracking** + a **pre-launch security sign-off gate** (no launch with open criticals).
- A **disclosure/response** path (how a reported vuln is handled) and a recurring re-audit cadence.

## 4. Known accepted risks (documented, not hidden)
- **RLS is experimental** in the pinned STDB version — accepted as defense-in-depth for scout-level data;
  must-never-leak data uses private tables (ADR-0015). Re-verify each version.
- **Bot/automation** at scale is mitigated, not eliminated (rate limits + active-only growth M9); deeper
  anti-bot is a post-launch, measured response.

## 5. Verdict
The per-system mitigations are already in place and gated; what was missing was the **consolidated surface
view + an audit gate**, which this doc + M25 provide. Security becomes a *signed-off, re-audited* property,
not an assumption.
