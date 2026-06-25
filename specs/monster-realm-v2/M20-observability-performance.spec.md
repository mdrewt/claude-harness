# Sketch: M20 — Observability, performance & load hardening

**Status:** design sketch (provisional) · **Phase D — production readiness** · **Decision:** ADR-0029 ·
See `observability-performance-plan.md`.

> Provisional sketch — EARS criteria + tasks deferred to build time. The strategy + decisions are the durable
> content (here, the ADR, and the plan doc).

## Problem / intent
Stand up the **production** observability stack + run the **comprehensive perf/load/profiling** pass so the
game is *shown* robust + performant before launch. M0 already wired the always-on substrate (logging, OTel
seams, a benchmark/perf-budget CI gate, health/readiness) and each milestone instrumented + benchmarked +
load-tested what it added; **M20 consolidates**, it doesn't invent.

## Scope (condensed)
- **Production monitoring:** turn on OTel→**Datadog** dashboards/alerts (RED + domain + **netcode-smoothness**
  divergence/reconcile rates + client fps); log aggregation; health/readiness wired to the monitor.
- **Full-system load test:** the M2 sim-harness scaled to target concurrency (multi-zone, concurrent battles/
  PvP/raids, chat flood); record the breaking point + safe envelope.
- **Profiling** the named hot paths under load; a **measurement-gated tuning pass** (execute the "scaling
  path" only where data shows a problem; revert non-improvements; perf + smoothness gates hold).
- **SLOs + error budgets + a baseline report.** **Backup/DR runbook** (RPO/RTO) for persistent data.
- **Out of scope:** chaos/synthetic/multi-region (beyond pragmatic scope); autoscaling infra (ops).

## Key design + boundary
Consolidation, not new instrumentation — the signals already flow from the per-milestone work; M20
exports/visualizes + loads + tunes. The ADR-0013 smoothness metrics becoming **prod-observable** is the tie-back.

## Risks / decisions
Optimize on measurement only (revert non-improvements). Tuning must keep correctness + smoothness evals green.
No PII in logs/metrics. Confirm Datadog/OTel/criterion vs the pinned env.
