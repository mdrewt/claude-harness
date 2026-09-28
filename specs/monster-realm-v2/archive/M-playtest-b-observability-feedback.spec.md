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

- **Delivered — pt-b1** (PR #220, 2026-07-19): ADR-0130. Client-only observability on the M13.5 UX seam: self-mounting non-blocking error overlay (`#mr-error-overlay`, `textContent`-only) unifying window `error`/`unhandledrejection` + augmented `reportError` into a capped error ring (`normalizeError`, cap 512/64); a capped event ring (256, monotonic `tSeq`, injected clock, identity-hex only) recording the H1/H2/H3 proxy taxonomy; and an F9 network-free JSON bug bundle (pure `bugBundle.ts`, bigint-total serializer, non-PII key-store allowlist, CSP-fallback). **6 core events wired** (connect/disconnect/zoneChange/battleStart/battleEnd/rankedMatch via dedicated unconditional `onBatchApplied` latches); `isPvpBattle` party guard fixes wild-as-PvP mislabel (reviewer H-1). Determinism untouched (game-core/wasm/RNG zero-touch). **Parked to pt-b1b:** the 8 handler-wired/correlation events (preRecruitHp, recruitAttempt/Result, boxOpen, monsterRelease, reCatch, tradePropose/Confirm) — full 14-variant taxonomy pre-committed in ADR-0130. **pt-b2** = additive server `playtest_event` table + reducer hooks + reaper + `just playtest-report` (SERIAL/structural).

- **Delivered — pt-b2** (2026-07-19): ADR-0131. Server-side capture for the H1/H2 proxies (SERIAL/structural).
  Additive **PRIVATE** append-only `playtest_event` table (must-never-leak per-identity behaviour; no client
  binding, ADR-0015) bounded by a **novel interval-singleton TTL+cap reaper** (first `ScheduleAt::Interval`
  reaper — cap 20k / TTL 7d / 5-min tick / 8192-batch; pure `plan_reap` delete-selection + self-healing
  singleton `plan_reaper_arm`, both unit-tested; scheduler-only guard). Fed by a **single-site emit** in
  `attempt_recruit` after the roll, before the branch (records both success+fail exactly once with pre-roll
  HP%; `record_recruit_event` infallible → zero determinism perturbation, game-core untouched). `kind` stored
  as a `u16` code (internal exhaustive `PlaytestKind` enum, explicit-literal `code()`, NOT a SpacetimeType —
  avoids the type-snapshot baseline + keeps `spacetime sql --json` parseable). `just playtest-report` +
  `scripts/playtest-report.mjs` (pure `aggregateReport`: H1 weaken-first-rate = per-(identity,species)
  first-encounter hp<500, H2 re-catch-rate = groups ≥2×, plus success/bait rates; execFileSync array-args,
  fail-loud, empty-vs-error distinction, rates-only output = PII firewall). **Parked to pt-b2b:** the H3 emit
  sites (session/trade/ranked) + battle-end + their report sections (pure-additive: new call-sites + additive
  columns, reserved `kind` codes 2–5). `touches-delta`: `client/src/module_bindings/types.ts` (mechanical
  `spacetime generate` regen — additive type defs only, serial slice) + `evals/baselines/table-schemas.json`
  (additive rebaseline) + 2 slice-own auto-discovered evals.

## Risks / decisions
Event taxonomy = in-milestone ADR (name the H1/H2/H3 proxies explicitly so the gate report is
pre-committed, not post-hoc). `playtest_event` growth bounded by reaper + cap; measure write volume on
the local playtest smoke (`just playtest-up`, M-playtest-a). Instrumentation must not perturb determinism (events written outside `game-core`;
rule-core stays pure per ADR-0003).
