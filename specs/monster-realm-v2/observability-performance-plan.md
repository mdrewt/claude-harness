# Observability & performance plan (cross-cutting)

**Date:** 2026-06-24 · **Decision:** ADR-0029 · **Scope:** the whole v2 roadmap (M0–M25).
**Status:** the SSOT for observability, monitoring, logging, error tracing, metrics/reporting, benchmarking,
profiling, and load testing. Mirrors `netcode-quality-review.md` (which secures *feel*); this secures
*robustness + performance*.

## 0. The gap this closes

The pre-existing specs had **scattered logging + reserved seams + open-ended "later" deferrals** — not a
plan: structured error logs in M0/M2, an OTel/metrics seam deferred "until load exists," no benchmark suite
or perf budgets, and load testing punted from M5 with no home. For a multiplayer server that is a real risk
(`standards/observability.md`: realtime backends "need a lot"; `standards/evals.md`: a benchmark gate is
expected). This plan makes observability + performance a **designed-in, mechanically-enforced** property —
like determinism, security, and netcode smoothness — rather than a post-hoc bolt-on.

## 1. Strategy — three layers

**Why cross-cutting, not per-spec:** duplicating observability boilerplate into 20 specs would violate the
project's own SSOT/DRY discipline. Instead the concern is defined **once** (here + ADR-0029), wired **once**
(the M0 substrate), enforced **everywhere** (a per-milestone invariant), and consolidated **once** (the M20
capstone). That is how the harness already handles determinism/security/smoothness.

### Layer 1 — always-on discipline (built in M0; ADR-0029)
- **Structured logging** — JSON, levelled, one event per line; a correlation id threaded through a request/
  reducer; **never** secrets/PII. Every reducer `Err` logs loud (already in M0/M2 — formalized here).
- **Error capture seam** — server reducer errors aggregated; the client panic hook (M3) routes Rust panics to
  the console; an exporter seam for an error tracker (off in dev).
- **OTel instrumentation seam** — spans + metrics emitted from reducers, the tick, the wasm boundary, and the
  client loop; the **exporter is no-op/local in dev, Datadog in prod** (wired, off by default). **Correction
  (2026-08-08 observability ceremony, ADR-0180):** this item was never built, and its model (module code
  emitting spans/metrics) is superseded — the SpacetimeDB host already supplies RED/table/health metrics and
  structured logs for free, with zero module code; real OTel now applies **client-side only**. The exporter
  sink is the self-hosted stack in §4, not Datadog. See ADR-0180 §D1/D6 and `M20-observability-performance.spec.md`.
- **Benchmark harness + perf-budget eval gating CI** — `game-core` hot-path micro-benchmarks (criterion) with
  committed budgets; a **regression > threshold fails CI** (the `evals.md` benchmark gate) — always on, from
  day one, on the pure rules where it's cheap and deterministic.
- **Health / readiness** signal for the module + the client.

### Layer 2 — per-milestone invariant (a cross-cutting rule, re-applied each milestone)
> Added to the loop prompt's cross-cutting invariants. Where a milestone adds the thing:
- **A new `game-core` hot rule** → a criterion benchmark + a perf budget (gated).
- **A new reducer** → RED metrics (rate/errors/duration) + structured logs on the error path.
- **A new hot path / table fan-out** → a domain metric (size/rate/duration) + a perf budget.
- **A multiplayer / concurrency surface** (M2 tick, M16 PvP, M18 raids, M19 chat) → a **sim-harness
  concurrency/load test** (N clients) asserting throughput/latency/tick-time stay within budget.

### Layer 3 — the M20 capstone (Phase D — production readiness)
Production monitoring (log aggregation, health/readiness, and — **correction, 2026-08-08 observability
ceremony, ADR-0180:** the dashboard/alert sink is a self-hosted OSS stack, not OTel→Datadog; see §4 and
`M20-observability-performance.spec.md`), **full-system load testing** (the sim-harness scaled to target
concurrency across all systems), **profiling** the named hot paths under load, the **measured
performance-tuning pass** (finally execute the "scaling path" against data), and ops reporting / SLO
baselines.

## 2. Named hot paths & perf budgets

These are the only places to optimize, and only with a measurement (per `observability.md`). Each gets a
benchmark and/or a runtime metric + budget:

| Hot path | Where | Budget / signal |
|---|---|---|
| `game-core` rules (`apply_move`, `derive_stats`, `resolve_turn`, recruit/encounter, evolution) | M1/M6/M7/M8/M10 | criterion micro-bench; regression-gated |
| Per-zone **movement tick** | M2/M11 | tick duration < `STEP_MS`; scales O(chars-in-zone); exceeding it = split-the-zone signal |
| **Subscription fan-out** (per-zone) | M2/M11 | update size/rate bounded by zone population; metric + budget |
| **wasm marshaling boundary** (`apply_move`, `zone_map`) | M3 | per-call cost bench; batch only if profiled |
| Client **per-frame** (render + interpolation + drain) | M4 | 60 fps (< 16 ms/frame); fps + frame-time metric |
| **Battle resolution** (PvE/PvP/raid) | M7/M16/M18 | per-turn resolve bench; concurrent-battles metric |
| **content sync / re-derive** | M6/M11 | bounded; migration/re-derive duration metric |
| **chat** throughput | M19 | per-sender rate limit; message-rate metric + flood load test |

## 3. Metrics taxonomy (RED + domain + client)

- **RED (per reducer):** rate, error rate, duration (p50/p95/p99).
- **Server domain:** tick duration per zone, players per zone, subscription fan-out size, active battles/
  raids, content-sync duration, escrow/trade throughput, chat message rate, rate-limit/moderation hits.
- **Netcode/smoothness (runtime form of ADR-0013's evals):** **prediction divergence rate**, **reconcile
  correction rate**, remote interpolation gap — monitored in prod, not just gated in CI (smoothness becomes
  observable, so a regression in feel is *visible*, not just felt).
- **Client:** fps / frame time, prediction error, interp delay, RTT, wasm-init time.

## 4. Tooling (self-hosted OSS — ADR-0029 amendment 2026-08-08 + ADR-0180)

**Datadog is no longer the sink.** Drew explicitly overrode the harness-default Datadog plugin for a
self-hosted, free, OSS stack (2026-08-08, run through the full heavy-ceremony pipeline — investigation,
6-way ideation, judge synthesis, an independently-reproduced adversarial refinement pass). Full rationale,
licensing audit, and the WASM-sandbox-crossing data-path design: ADR-0180 (`projects/monster-realm/docs/
adr/0180-observability-stack-selection.md`).

- **Server signals — host-native, zero module code:** RED-per-reducer, table/subscription/queue metrics,
  and health come from SpacetimeDB's own `/v1/metrics` and `/v1/health` (pinned 2.6.0), confirmed free at
  publish time with no module-side instrumentation. Structured, host-attributed logs come from
  `module_logs/*.log` on disk. No OTel SDK runs inside the wasm sandbox — see ADR-0180 D1.
- **Client instrumentation:** the OpenTelemetry Web SDK, real spans + metrics (fps/frame-time, prediction
  divergence, reconcile rate, RTT, wasm-init), pushed via OTLP/HTTP.
- **Agent:** **Grafana Alloy** — the sole telemetry agent. Tails `module_logs/*.log` → Loki (+ a
  `stage.metrics` log→metric derivation stage, bounded labels only, surfaced on Alloy's own self-metrics
  endpoint); receives the client's OTLP push → Tempo (traces) + a Prometheus exporter →
  `prometheus.remote_write` (metrics, pushed). A genuine distribution built on the CNCF-hosted OpenTelemetry
  Collector project (not itself a separately CNCF-governed project).
- **Storage:** **Prometheus** (metrics — scrapes SpacetimeDB's `/v1/metrics` **and** Alloy's own
  self-metrics endpoint for log-derived counters, **and** runs a remote-write receiver
  (`--web.enable-remote-write-receiver`) so Alloy can push the client's browser metrics too; recording rules
  only), **Loki** (logs), **Tempo** (client traces).
- **Dashboards + alerting:** **Grafana OSS** — RED + domain + netcode-smoothness + client-fps dashboards,
  and **100% of alert-rule evaluation and notification routing** via unified alerting (no separate
  Alertmanager — Prometheus computes recording rules only, per ADR-0180 D4).
- **Host metrics:** node_exporter.
- **Ingress:** **Caddy**, the only externally reachable process, with two distinct exposure policies — TLS +
  auth in front of Grafana; TLS + public + CORS-scoped + rate-limited in front of the browser-OTLP ingress
  (ADR-0180 D5) — never one blanket rule, since an anonymous game client cannot present a login.
- **Benchmarks:** criterion (Rust `game-core`, scoped with zero `spacetimedb`/wasm coupling); a perf-budget
  eval in `just ci` (the M0 substrate item that was specified but never actually built — retrofitted in M20,
  ADR-0180 D6/D7).
- **Load:** the **M2 sim-harness scaled** (`mr-load-driver`, headless multi-client) — the single load engine,
  reused per milestone and comprehensively at M20, measuring the breaking point off the same Prometheus
  metrics the dashboards read.
- **Profiling:** `spacetime start --enable-tracy` first (confirmed present at the pin); flamegraphs on the
  named hot paths under load; a wasmtime jitdump + `perf` spike only if tracy proves insufficient (M20,
  ADR-0180 D10).
- **Backup/DR:** `restic`/`borgbackup` over the commitlog + snapshot directories; RTO measured from the
  host's own replay metrics, not estimated (M20, ADR-0180 D11).

## 5. Where this lands in the corpus
- **M0** builds Layer 1 (the substrate + the CI benchmark/perf-budget gate). *(refined)* — **correction
  (2026-08-08 ceremony, ADR-0180):** live verification found the benchmark/perf-budget gate and the
  OTel-seam item were never actually built (`Cargo.toml` names `criterion`/`opentelemetry` only in
  comments; no `benches/` dir exists). M20 retrofits this directly now — see §4 and
  `M20-observability-performance.spec.md`.
- **The loop's cross-cutting invariants** carry Layer 2 (every milestone instruments + benchmarks + load-
  tests what it adds). *(refined)*
- **M2** adds the per-zone-tick benchmark + a concurrency/load test (the canonical server hot path). *(refined)*
- **M5** points its load-test deferral at M20 + the per-milestone invariant. *(refined)*
- **M20** (new, Phase D) consolidates the production stack + comprehensive load/profiling/tuning. *(new)*

## 6. Net effect
Observability and performance stop being deferred-without-a-plan and become a **gated, designed-in property**:
every rule is benchmarked, every reducer is instrumented, every concurrency surface is load-tested as built,
and a capstone stands up production monitoring and a measured tuning pass — so the game can be shown to be
robust and performant, not just hoped to be.
