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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
