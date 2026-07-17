# Sketch: M-playtest-b — Playtest observability & feedback loop

**Status:** design sketch (scheduled — playtest replan 2026-07) · **Pre-gate** · **Decision:** ADR at
build time · The **M20 pull-forward**: playtest-scale track/trace/debug + the gate's measurement
instrument. M20 keeps the production capstone (Datadog export, load testing, SLOs) — boundary note added
there. See `playtest-replan-2026-07.md`; validation plan = `game-design.md` §4.

## Problem / intent
A playtester who hits a bug today produces "it broke" — no error surface, no trace, no state snapshot.
And the playtest gate's H1/H2/H3 fun-hypotheses have **no measurement**: nothing records whether players
weaken before recruiting, re-catch for individuals, or return across sessions. Give testers the tools to
report usably, and give the gate its data.

## Scope (condensed)
- **Client error surface:** uncaught-error + unhandled-rejection overlay (dismissible, non-blocking) and
  reducer-rejection surfacing unified on the 13.5 UX seam; errors ring-buffered with timestamps.
- **Client event ring buffer:** structured session events (connect/disconnect, zone changes, battle
  start/end + outcome, pre-recruit target HP% (H1), recruit attempt/result (H1), box opens / release /
  re-catch of same species (H2), trade propose/confirm (H3), ranked match + Elo delta (H3)); capped
  memory, no PII beyond identity hex.
- **Bug-report bundle (F9):** one keypress → downloads JSON bundle {build SHA (M-playtest-a stamp),
  identity, zone, event ring, error ring, key store snapshot}; tester attaches it to the feedback
  channel. No network dependency (works when the connection is the bug).
- **Server-side proxy capture:** additive `playtest_event` table (append-only, capped/TTL-reaped like
  ADR-0117 offers; **additive schema — structural set, SERIAL slice**) fed by existing reducers at the
  H1/H2/H3 decision points; `just playtest-report` aggregates it into the §4 proxy report (weaken-first
  rate, re-catch rate, session return, trade/ranked participation).
- **Out of scope:** Datadog/OTel export, dashboards, load testing, SLOs, alerting (all M20); client
  telemetry upload (the F9 bundle is tester-initiated by design — closed-test privacy posture).

## Candidate slices (build-time slicing pass finalizes)
| slice | summary | candidate touches |
|---|---|---|
| pt-b1 | client error overlay + event ring + F9 bundle | `client/src/ui/*`, `client/src/net/store.ts`, `client/src/main.ts`, sibling tests |
| pt-b2 | `playtest_event` table + reducer hooks + reaper + `just playtest-report` | `server-module/src/*` (schema/battle/taming/trading/ranking hooks), `game-core` if a pure helper, `scripts/*`, `justfile` — **SERIAL (schema)** |
Pairing: pt-b1 ‖ M-playtest-d content OK. pt-b2 is structural → never fanned out.

## Risks / decisions
Event taxonomy = in-milestone ADR (name the H1/H2/H3 proxies explicitly so the gate report is
pre-committed, not post-hoc). `playtest_event` growth bounded by reaper + cap; measure write volume on
the hosted smoke. Instrumentation must not perturb determinism (events written outside `game-core`;
rule-core stays pure per ADR-0003).
