# 0029. Observability & performance strategy
- Status: accepted
- Date: 2026-06-24
- Surfaced by: a cross-cutting review (`observability-performance-plan.md`). Load-bearing for M0 (substrate),
  the loop's cross-cutting invariants, and M20 (capstone).

## Context and problem statement
The v2 specs had scattered logging + reserved seams + open-ended "later" deferrals for observability,
monitoring, error tracing, metrics/reporting, benchmarking, profiling, and load testing — not a plan. For a
multiplayer server that is a real robustness/performance risk; `standards/observability.md` says realtime
backends "need a lot" and `standards/evals.md` expects a benchmark gate. The question is how to make these
designed-in and mechanically enforced without over-building before there is load to observe.

## Considered alternatives
- **Three-layer strategy (chosen): always-on discipline in M0 + a per-milestone cross-cutting invariant + an
  M20 capstone.** M0 wires structured logging, an error/trace seam, OTel instrumentation (exporters off in
  dev), a benchmark + perf-budget CI gate, and health/readiness. Every milestone instruments + benchmarks +
  load-tests what it adds (defined once, applied everywhere — SSOT). M20 stands up the production stack
  (OTel→Datadog dashboards/alerts), comprehensive load testing (scaled sim-harness), profiling, and the
  measured tuning pass. Pragmatic scope.
- **Defer everything to launch (the prior state).** No data when you need it; perf regressions land unseen;
  load problems surface in production. Rejected — the gap this ADR closes.
- **Heavyweight from day one** (full SLOs/dashboards/synthetic monitoring before any load). Premature; YAGNI;
  dashboards with no traffic. Rejected — the seams are wired, the heavy stack is the M20 capstone.
- **Third-party APM only, no first-class instrumentation.** Vendor-coupled, shallow domain signals. Rejected
  — OTel instrumentation is first-class (vendor-portable); Datadog is the dashboard/alert sink.
- **Per-spec observability boilerplate in all 20 specs.** Violates SSOT/DRY. Rejected — a cross-cutting
  invariant + a shared substrate.

## Decision outcome
- Chosen: **the three-layer strategy, pragmatic scope, OTel instrumentation → Datadog dashboards/alerts +
  structured logs + RED/domain metrics + criterion benchmarks with a perf-budget CI gate + sim-harness load
  testing + health/readiness.**
- Consequences: M0 gains the substrate + the always-on benchmark/perf-budget gate (proof-of-teeth: a perf
  regression fails CI); the loop's cross-cutting invariants gain the observability/benchmark/load rule; M2
  adds the canonical tick benchmark + load test; M5's load deferral points at M20; **M20** (new, Phase D)
  consolidates production monitoring + comprehensive load/profiling/tuning. Smoothness metrics (ADR-0013)
  become runtime-observable (divergence/reconcile rates), so feel regressions are visible in prod. Tooling
  (Datadog/OTel/criterion versions) is confirmed against the pinned environment at build time.
