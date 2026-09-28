# Spec: M-postgate-movement-investigation — residual double-move defect

**Status:** queued, post-gate, un-blocked (spawned by r2 playtest feedback 2026-07-26, episode
`r2-2026-07-26`, ledger items 003/015/029/040-042) · **Owner:** Drew · **Decision:** ADR at build
time. **Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** nh1 (ADR-0146) and
nh2 (ADR-0148) already merged — this milestone targets what's LEFT after those two landed.

## 1. Problem / intent

Drew: movement is "much easier... but still a little glitchy" and specifically: walking to the left
edge, pausing, then tapping right sometimes moves one tile, sometimes two, inconsistently. nh1/nh2
fixed two concrete input/movement defects at the 2026-07-25 gate; this is a THIRD, distinct residual
reported fresh in r2 — do not assume it's the same root cause already fixed.

## 2. Acceptance criteria (EARS)

- WHEN the investigation begins, THE system SHALL determine whether the double-move is client-side
  (input queueing/prediction) or server-side (reducer-level step accumulation) before attempting a
  fix — ledger item 041 explicitly leaves this open.
- IF a reproducible root cause is found, THE fix SHALL close it with a regression test that
  reproduces Drew's exact sequence (walk-to-edge, pause, single tap) — non-author verification
  required (doctrine I-5).
- IF no reproducible root cause is found within the diagnosis budget (LIGHT: 2h agent-time per
  doctrine §8 PARKED budget), THE milestone SHALL ship an OBSERVABILITY improvement instead
  (structured movement-event tracing/logging sufficient to catch the NEXT occurrence) and the
  original item PARKs — it does not silently close (doctrine §4 OBSERVABILITY note).
- Closable only by: a landed fix + regression test, OR two consecutive clean playtests reporting no
  recurrence of this specific symptom (doctrine §8 PARKED→terminal rule).

## 3. Touches (declared for fan-out eligibility)

Client input/movement path (likely `client/src/prediction/*` or `main.ts` movement handlers per
prior ADR-0146/0148 sites) AND/OR server movement reducer(s) — scope narrows once root-caused.
Overlaps `M-postgate-dev-observability` if the OBSERVABILITY branch is taken; coordinate touches
before fan-out if both are in flight simultaneously.

## 4. Notes

Weight: LIGHT per item, but treat as a single investigation unit (don't split diagnosis budget
across the 6 ledger items pointing here — they're one symptom family).
