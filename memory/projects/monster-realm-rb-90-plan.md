# rb-90 plan — M23 A11Y ledger gap: mint A11Y-37 (same-key toggle-close SUCCESS)

**Slice:** rb-90 · residual R-17r-d-B2 · repo: harness · doc-only · LOW/LIGHT · budget target $60.
**Touches:** `specs/monster-realm-v2/M23-accessibility.spec.md` (+ standard companions: this plan, the gate ledger).
**ADR:** none (supervisor-assigned number = None). The "why" already lives in ADR-0206 Amendment A1;
this slice only closes the acceptance-tier ledger gap A1 left behind.

## Problem
ADR-0206 A1 exempted the pressed overlay's OWN hotkey from the world-focus gate (same-key toggle-CLOSE
always works, even with focus inside the overlay). A11Y-19 was rewritten to state the cross-overlay
OPEN exemption only; the SUCCESS half (same key → closes) is covered ONLY at the unit tier
(`client/src/main.a11yFocus.test.ts` `S5T-GATE-SAMEKEY-CLOSE` ×6, `S5T-GATE-REOPEN-AFTER-SAMEKEY-CLOSE`)
and has no A11Y-* acceptance criterion.

## Change (one coherent increment)
1. §6 "S5 / S6" block: add **A11Y-37 [UNIT]** directly after A11Y-19 — WHEN an overlay's own
   single-letter hotkey is pressed while that overlay is already open and `document.activeElement` is
   inside it THE SYSTEM SHALL close it (and, focus having returned to the world, a following DIFFERENT
   hotkey opens normally). Proof-of-teeth = the two existing named unit tests, cited by name, not duplicated.
2. A11Y-19's parenthetical → point at A11Y-37 for the SUCCESS half (one clause, no meaning change).
3. §8.4 item 4 → one cross-reference clause naming A11Y-37 as the acceptance-tier pin of the resolution.
No new client code, no new tests, no evals (ADR-0224). Ids: highest existing is A11Y-36 → new id A11Y-37.

## Gate (ledger E1)
CHECK = `node -e` that (a) parses the live spec for exactly one `**A11Y-37** [UNIT]` SHALL line naming
both tests + ADR-0206, and (b) runs `npx vitest run src/main.a11yFocus.test.ts --reporter=json` in the
project client (absolute cwd — `mr-gates check` runs from the harness cwd) and requires
SAMEKEY-CLOSE passes == 6 and REOPEN passes == 1. Proof-of-teeth for the gate itself: run the CHECK
BEFORE the spec edit → `TEETH-MISSING` (RED); after → `TEETH-BITE`.

## Lenses (CONTENT tier, doc-only)
reviewer + verifier on declared models. Tester lens: n/a (doc slice; the gate CHECK is the test and its
RED→green is recorded in the PR body). Red-team/domain auditors not warranted — no parsing/security surface.
