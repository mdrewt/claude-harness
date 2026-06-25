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
  client loop; the **exporter is no-op/local in dev, Datadog in prod** (wired, off by default).
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
Production monitoring (OTel→Datadog dashboards + alerts, log aggregation, health/readiness), **full-system
load testing** (the sim-harness scaled to target concurrency across all systems), **profiling** the named
hot paths under load, the **measured performance-tuning pass** (finally execute the "scaling path" against
data), and ops reporting / SLO baselines.

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

## 4. Tooling (pragmatic + harness Datadog — ADR-0029)

- **Instrumentation:** OpenTelemetry (traces + metrics) from server + client.
- **Dashboards/alerts:** **Datadog** (the harness engineering plugin) — RED + domain dashboards, alerts on
  error rate / tick overrun / divergence-rate spikes / saturation.
- **Logs:** structured JSON; aggregated; correlation ids; no PII.
- **Benchmarks:** criterion (Rust `game-core`); a perf-budget eval in `just ci`.
- **Load:** the **M2 sim-harness scaled** (headless multi-client) — the single load engine, reused per
  milestone and comprehensively at M20.
- **Profiling:** flamegraphs on the named hot paths under load (M20).

## 5. Where this lands in the corpus
- **M0** builds Layer 1 (the substrate + the CI benchmark/perf-budget gate). *(refined)*
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
