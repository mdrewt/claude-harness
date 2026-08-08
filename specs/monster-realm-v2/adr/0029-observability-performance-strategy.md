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

## Amendment — 2026-08-08 (self-hosted OSS stack replaces Datadog)

**Trigger:** Drew explicitly overrode the Datadog choice for M20 (interactive, 2026-08-08): a self-hosted,
free, OSS observability stack instead of the harness-default Datadog plugin — no ongoing third-party
dependency, no recurring cost, full data control for a solo-operator project. This override was run through
the full `mr-feedback-doctrine.md` §6 heavy-ceremony pipeline (investigation → 6-way independent ideation,
each refined by its own adversarial reviewer → judge synthesis → a second, independent adversarial-refinement
pass) rather than swapped in unilaterally. The refinement pass went further than reading the judge's
evidence: it spun up fresh SpacetimeDB 2.6.0 standalone instances, published the real
`monster_realm_module.wasm`, and independently reproduced nearly every load-bearing claim (metric-family
counts, log-line shape, CLI flags, file/commitlog sizes) against a live instance. Full evidence log,
attribution table, and decision record: **ADR-0180** (`docs/adr/`), which elaborates this amendment the same
way ADR-0106 elaborates ADR-0024 or ADR-0179 elaborates ADR-0030 — this amendment records the top-level
override; ADR-0180 records the concrete tool selection and data-path architecture.

**Pointer note, added on review (2026-08-08 — this ADR is not updated further below; noted here so a
reader isn't left with a stale picture of what ADR-0180 now contains):** ADR-0180 was itself amended a
second time, same day, after this amendment landed — a brainstorm/debate/review pass reconsidered
server-side tracing (rejected a beta SpacetimeDB API after live-testing found it stalls the whole
scheduler; added a new log-relay service, `mr-trace-relay`, instead) and re-litigated the backend-stack
choice at 96GB RAM (kept, not defaulted to). That second amendment is entirely inside ADR-0180's own scope
(concrete tool selection / data-path architecture) and does not change anything this top-level ADR-0029
amendment decided — no update to *this* document's own content is warranted, only this pointer.

**Finding: this ADR's own Consequences line is also corrected, not just the tool choice.** "M0 gains the
substrate + the always-on benchmark/perf-budget gate" was written as an accomplished fact. Live verification
found it never fully happened: `Cargo.toml` names `criterion`/`opentelemetry` only in code comments, no
`benches/` directory exists anywhere in the workspace, and `M0-foundation.spec.md`'s EARS line `:142` ("WHEN
a reducer/tick/wasm-boundary executes THE SYSTEM SHALL emit OTel spans/metrics through the instrumentation
seam") was never implemented. More importantly, that line's own model — module code emitting OTel spans/
metrics from inside a reducer — is the **wrong** model: independently reproduced against a freshly-published
copy of the real module, the SpacetimeDB host itself (pinned 2.6.0) already supplies full RED-per-reducer
metrics, table/subscription/queue metrics, a health signal, and structured, host-attributed logs, entirely
free, with zero module-side OTel SDK and zero wasm-sandbox-crossing risk. So the substrate was simultaneously
over-claimed (the CI benchmark/perf-budget gate was never built) and over-specified (the OTel-seam item
describes work that turns out to be unnecessary once the host's free signals are used instead). M20's
retrofit now targets what's actually still missing — a structured-logging helper, a correlation-id
convention, and the `criterion`/perf-budget gate — not what the original wording assumed was already done.

**Decision: the top-level Decision Outcome's dashboard/alert sink changes from "OTel→Datadog" to a
self-hosted, 7-container, all-open-source stack** — Prometheus (scraping + recording rules), Grafana Alloy
(the sole telemetry agent: log-tail→Loki plus log→metric derivation, browser-OTLP→Tempo/Prometheus-exporter
— a genuine CNCF OTel Collector distribution), Loki (log storage), Tempo (client trace storage), Grafana OSS
(dashboards **and** 100% of alert-rule evaluation/routing via its unified alerting — no separate
Alertmanager), node_exporter (host metrics), and Caddy (the only externally reachable process, with two
distinct exposure policies: authenticated for Grafana, public+CORS+rate-limited for the browser-OTLP
ingress a public game client must be able to reach without a login). Licensing: Loki/Tempo/Grafana OSS are
AGPLv3; the rest are Apache-2.0. Run as stock, unmodified vendor images (config only, to a single solo
operator) — the AGPL network-copyleft clause, which triggers on distributing a *modified* copy to other
users over a network, has nothing to trigger on either count under that posture. See ADR-0180 for the full
per-tool rationale, the rejected-alternatives list, and the WASM-sandbox-crossing data-path design.

**Everything else in this ADR's original Decision Outcome stands, unreversed:** the three-layer strategy
shape (always-on substrate + per-milestone invariant + M20 capstone), RED/domain metrics, `criterion`
benchmarks with a perf-budget CI gate (now actually being built — see ADR-0180 and the M20 spec), sim-harness
load testing, health/readiness, and the ADR-0013 smoothness-metrics-become-prod-observable tie-back (still
true — delivered via client-side OTel to the new stack instead of Datadog). This amendment is a tool-and-
correction change, not a redesign of the strategy.

**Consequences:** M20 (`M20-observability-performance.spec.md`) is rewritten to build against this stack, with
EARS acceptance criteria and task checkboxes for both the retrofit and the stack wiring. `observability-
performance-plan.md` §4 ("Tooling") is updated to name the new stack; §1/§5's stale "Datadog" mentions and
the "M0 already built it" claim carry small inline corrections pointing here, without a full rewrite of those
sections. `M0-foundation.spec.md`'s EARS line `:142` still needs its own correcting edit — flagged as a
tracked task in the M20 spec, not done here (out of this amendment's own write scope). No shipped code,
gate, or milestone is reversed by this amendment; it is additive/corrective only, consistent with the DRAFT
action-taxonomy treatment Drew specified for this ceremony.
