# M21b-2 progress — TERMINAL (PR OPEN), not a park

Updated 2026-08-10. **PR #312** open on `mdrewt/monster-realm` (branch
`feat/m21b-2-oidc-client-claim-ui`, HEAD `0d51756`). Local full `just ci` GREEN. Supervisor owns the
merge (`gh pr merge` was NOT run). See the handoff entry (2026-08-10 — M21b-2 BUILD SLICE: PR OPEN)
for full detail; this memo is superseded by that entry.

## DONE
Whole declared slice: OIDC modules (oidc/credentialDecision/claimCode), connection.ts D13–D16
restructure, my_account subscription + provenance write-guard + F2 join-gate, session/claim
models+views, overlay/menu/help KeyC wiring, main.ts UI entry-point (openClaim prompt phase,
startSignIn/reconnectNow, effect consumption, VITE_MR_OIDC_* config), store/rowConvert account slot,
ops/auth deployment recipe + runbook §8 DR, account-e2e (G22 live) + client-no-pii-logs (G21) evals.
Gates G13–G30 all pass. Reviewer/red-team/verifier closed (claim-code leak, oidc totality, ops
hardening fixed). ADR-0179 landing amendment + ARCHITECTURE section + knowledge/adr-digest regen.

## REMAINING (supervisor / next tick — NOT this slice)
1. Merge PR #312 on remote-CI green.
2. Tick harness spec §4/§5 M21b-2 checkboxes (cross-repo) with PR #312 ref.
3. Draft + land `13r-c-2` before M21b-2's deployment-timed real-issuer flip (accounts.rs
   ALLOWED_ISSUERS/ALLOWED_AUDIENCE + audience_allowed tightening + restore drill).
4. M21b-3 (Steam/native auth) — explicitly deferred (OQ5).

## BLOCKERS
None. HARD sequencing constraint honored (accounts.rs comment-only; trade-escrow-guards untouched;
package.json unchanged).
