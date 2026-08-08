# M20 — Observability, Performance & Load Hardening

**Status:** design sketch → **elaborated at build time** (heavy ceremony, 2026-08-08) · **Phase D** · **Decision:** ADR-0029 (amended 2026-08-08) + ADR-0180

> Provisional sketch promoted to build-ready spec via the harness heavy-ceremony pipeline (investigation →
> 6-way independent ideation, each adversarially reviewed → judge synthesis → a second, independent
> adversarial-refinement pass — `memory/projects/mr-feedback-doctrine.md` §6). The refinement pass did not
> just re-read the judge's evidence: it spun up fresh SpacetimeDB 2.6.0 standalone instances, published the
> real `monster_realm_module.wasm`, and reproduced nearly every load-bearing claim (metric-family counts,
> log-line shape, CLI flags, file sizes) against a live instance before this spec was written. It found and
> fixed four defects in the synthesis (a factual error on the logs-endpoint auth posture, a mis-cited GitHub
> issue date, an alerting-role incoherence, and a missing metrics-ingestion hop) — all closed below, not
> hand-waved. See ADR-0180 for the full decision record and evidence log.

## Problem / intent

**Correction to this milestone's own prior framing:** the pre-ceremony sketch claimed "M0 already wired the
always-on substrate ... M20 consolidates, it doesn't invent." **Live verification found this false for half
of it.** `Cargo.toml` mentions `criterion`/`opentelemetry` only in comments (lines 16, 39); no `benches/`
directory exists anywhere in the workspace; `M0-foundation.spec.md`'s EARS line `:142` ("WHEN a
reducer/tick/wasm-boundary executes THE SYSTEM SHALL emit OTel spans/metrics through the instrumentation
seam") was never built, and its own model — module code emitting spans — turns out to be the **wrong**
model: reducer RED metrics, table/subscription/queue metrics, health, and structured host-attributed logs
are all already supplied **free, today, by the SpacetimeDB host itself** (pinned 2.6.0), independently
reproduced against a freshly-published copy of the real module in this ceremony. So M20 has two genuinely
different jobs, not one:

1. **Retrofit the small piece of Layer 1 that is real and still missing** — a structured-logging wrapper, a
   correlation-id convention, and (the one substantial gap) a `criterion` benchmark + perf-budget CI gate on
   `game-core`'s hot paths, plus a minimal readiness heartbeat.
2. **Stand up the production observability stack** on top of the host's free signals — dashboards, alerting,
   log aggregation, client-side real OTel, SLOs, load testing, profiling, and a backup/DR runbook — so the
   game can be *shown* robust and performant before launch, not just hoped to be.

The **tool-stack half of the original Decision** (OTel→Datadog) is separately, explicitly overridden: Drew
authorized replacing the harness-default Datadog sink with a self-hosted, free, OSS stack (ADR-0029
Amendment, 2026-08-08). This spec builds to that replacement stack. **This is a DRAFT (additive) action, not
a reversal of any shipped decision** — no game code, no shipped milestone, and no already-built gate changes;
this milestone adds a small server retrofit, ops-only configuration, and client instrumentation on top of
what's already merged.

## Scope (condensed)

- **Layer-1 retrofit (the real gap):** a `mr_log` structured-event helper (complements, does not replace,
  `guards::log_reject`); a `connection_id`-based correlation convention; `criterion` benchmarks + a
  perf-budget CI gate for the named hot paths in `observability-performance-plan.md` §2; an `mr_heartbeat`
  scheduled reducer for readiness.
- **Production monitoring, self-hosted OSS stack (replaces Datadog):** Prometheus + Grafana Alloy + Loki +
  Tempo + Grafana OSS (dashboards **and** 100% of alert evaluation/routing) + node_exporter + Caddy — 7
  containers, one purpose each, all reachable through host-native SpacetimeDB signals (`/v1/metrics`,
  `module_logs/*.log`, `/v1/health`) plus client-side real OTel. Zero new module-owner credentials.
- **Full-system load test:** a scaled `sim-harness` driver (`mr-load-driver`) measuring the breaking point
  via the same host metrics the dashboards already read. Chat flood deferred (no M19 yet).
- **Profiling** the named hot paths under load, cheapest tool first (`--enable-tracy` before any eBPF/jitdump
  tooling). A **measurement-gated tuning pass** (execute the "scaling path" only where data shows a problem;
  revert non-improvements; correctness + smoothness evals stay green).
- **SLOs + error budgets** (with a named reducer allowlist that separates real failures from correct guard
  rejections) and a **backup/DR runbook** (RPO/RTO — RTO measured from the host's own replay metrics, not
  estimated).
- **Out of scope:** chaos/synthetic/multi-region monitoring; autoscaling infra (ops); a private
  domain-metric table + polling exporter (cut for v1 — see D2's escape hatch); rolling any part of this into
  the harness-wide `standards/observability.md` default (this is a project-specific deviation, recorded only
  in ADR-0180 and the ADR-0029 amendment).

## Open questions for Drew (do not let a build tick guess these)

**OQ1 — Where does the observability stack run relative to the game server, and is SpacetimeDB's port
publicly reachable?** This cannot be guessed by an unattended tick — it is a security decision, not taste.
Independently reproduced, twice: `/v1/metrics` is unauthenticated by a **confirmed, permanent gap** in the
shipped 2.6.0 binary (`MetricsAuthMiddleware` is written but commented out in
`crates/client-api/src/routes/metrics.rs` upstream — not a config toggle) and discloses table names, row
counts, per-reducer call volumes, and connected-player counts. `/v1/database/<id>/logs` (the HTTP endpoint,
**not** the on-disk file S2 tails) is **not** part of this risk — it requires the module-owner identity and
rejected anonymous requests with `403 Forbidden` on two independent fresh instances.

1. **Is the SpacetimeDB port exposed to the internet?** If yes, this milestone must add a reverse proxy in
   front of *SpacetimeDB itself* that blocks `/v1/metrics` from outside — a scope addition to D3/D5 below.
   If no (bound to loopback/private network), the posture in D3/D5 as written is sufficient.
2. **Same box or a separate box for the observability stack?** Co-locating shares the failure domain (an OOM
   takes out both the game and the ability to see why) and skews the perf measurements this milestone exists
   to produce; separating adds a network hop for Alloy's log-file tail (it must run beside the data dir,
   shipping to a remote Loki).

If `M-playtest-a-deployment.spec.md` already fixes the hosting topology, read it first and treat this as
answered. **Everything else in this spec is decided** and does not need Drew's input mid-build.

## Key design decisions (ADR-0029 amendment + ADR-0180)

- **D1 — Governing invariant: the server module never times itself and never initiates an outbound call.**
  Every server-side signal is either (a) computed by the SpacetimeDB *host*, outside the wasm sandbox, and
  exposed on an HTTP endpoint, or (b) written by the *host* to a rotated NDJSON file an external agent tails.
  Real OTel spans/metrics exist **client-side only**. This is why the "OTel seam inside reducers" model in
  M0's EARS line `:142` was the wrong model from the start — the host already does the job the seam was
  designed for, with zero wasm-sandbox-crossing risk.
- **D2 — Three-surface data path; the fourth (private metric table) is cut, not built.** S1 (Prometheus
  pulls `/v1/metrics`), S1b (Prometheus also pulls Alloy's own self-metrics endpoint — closes the log-derived
  half of a gap the refinement pass found: without this second scrape target, S2's log-derived counters have
  nowhere to land), S2 (Alloy tails `module_logs/*.log`, ships to Loki, derives bounded-label counters that
  surface on Alloy's self-metrics endpoint, i.e. what S1b scrapes), S4 (browser OTel Web SDK pushes OTLP to
  Alloy → Tempo for traces via `otelcol.exporter.otlp`, **and**, for metrics, `otelcol.exporter.prometheus` →
  a `prometheus.remote_write` component **pushing** to Prometheus's remote-write receiver — a second,
  independent wiring, since S1b's scrape does not carry S4's numbers; see OBS-38, which closes this second
  half of the same missing-ingestion-hop defect). **S3** (a
  private `perf_event`-style table + a polling exporter reducer) is **cut for v1** — RED-per-reducer and
  table/queue metrics are already free — and recorded as a pre-approved escape hatch: if ever exercised, the
  new table needs an explicit row-level-security policy and must be read via
  `POST /v1/database/<id>/sql`, never a `spacetime sql` CLI subprocess (the CLI has no stable JSON output at
  the pin; the HTTP endpoint's tagged-object wire encoding is documented in ADR-0180).
- **D3 — 7-container self-hosted OSS stack replaces Datadog:** Prometheus (storage, scraping S1 + S1b, **and**
  a remote-write receiver — `--web.enable-remote-write-receiver` — for S4's pushed metrics; **recording rules
  only** for its own rule evaluation), Grafana Alloy (the *sole* telemetry agent — file-tail→Loki plus
  log→metric derivation, browser-OTLP→Tempo/Prometheus-exporter — a genuine distribution built on the
  CNCF-hosted OpenTelemetry Collector project, not itself a separately CNCF-governed project, and not a
  rebrand), Loki (log storage), Tempo (client trace storage), Grafana OSS (dashboards **and** unified
  alerting — see D4), node_exporter (host metrics), Caddy (the only externally reachable process — see D5;
  its `caddy-ratelimit` plugin is compiled in via `xcaddy`, so unlike the other six stock, `docker pull`-able
  images, Caddy carries its own build-pipeline and upstream-CVE-tracking maintenance line — see the task
  checklist's `Dockerfile` item and Consequences below). Licensing: Loki/Tempo/Grafana OSS are AGPLv3
  (confirmed via Grafana Labs' own 2021 relicensing announcement); Alloy, Prometheus, node_exporter, Caddy are
  Apache-2.0. AGPL's network-copyleft clause triggers on distributing a **modified** copy to other users over
  a network — this design runs **stock, unmodified** vendor images, configured only, to a single solo
  operator, so nothing triggers it; this conclusion is contingent on staying stock (OBS-33 makes that a
  standing criterion, not a one-time check). **Meta-monitoring:** because Alloy is the *sole* telemetry
  agent, its own failure would silently black out both S2 and S4 ingestion at once with nothing else in the
  stack noticing; the S1b scrape target Prometheus already polls doubles as a liveness probe with no new
  signal or container needed — a Grafana OSS alert rule on that scrape target's `up` metric being `0` past 3
  consecutive scrape intervals catches it (OBS-39).
- **D4 — Alerting is owned entirely by Grafana OSS, not split with Alertmanager.** Prometheus's native
  `alerting:` block has no sink except Alertmanager — giving Prometheus "alert rule evaluation" while
  separately excluding Alertmanager (the pre-refinement draft's mistake) means an evaluated alert fires into
  nothing. The coherent split: Prometheus computes and stores **recording rules only**; Grafana OSS unified
  alerting (available in OSS since Grafana 8, not Enterprise-gated) owns 100% of alert-rule evaluation
  **and** notification routing, querying Prometheus/Loki as datasources. No Alertmanager container.
- **D5 — Caddy has two different exposure policies, not one.** The pre-refinement draft gave Caddy one
  blanket "TLS + auth" rule covering both Grafana and the browser-OTLP ingress — incoherent, since an
  anonymous game client structurally cannot present Grafana's login. Corrected: the **Grafana route** gets
  TLS + authentication (operator-only); the **browser-OTLP ingest route** (feeds S4) gets TLS + **public**
  reachability + CORS origin scoping + rate limiting and payload-size caps (`caddy-ratelimit` via `xcaddy` —
  stock Caddy has no rate limiting). **These two controls defend different threats, not one layered defense:**
  CORS origin scoping is browser-enforced — it stops another website from using a victim's browser to
  cross-origin-post telemetry to this endpoint, but a direct scripted client (curl, a bot, a load tool) simply
  omits or forges the `Origin` header and is unaffected, since no browser is present to honor the
  restriction. Against that scripted-flood threat, the rate-limit and payload-size caps are the actual
  control; CORS is not a redundant third leg against it.
- **D6 — Layer-1 retrofit, scoped narrowly, no new metaprogramming.** A new domain module
  `server-module/src/observability.rs` (ADR-0056/M8.9 convention: one new domain file) holds: (a)
  `pub(crate) fn mr_log(evt: &str, extra_fields_json: &str)` — a general-purpose structured-event helper,
  hand-rolled JSON (reusing `guards::json_escape`) exactly like the existing `guards::log_reject`, **not** a
  `macro_rules!` (zero precedent for declarative macros anywhere in this codebase — ADR-0179 D6 already
  rejected introducing one; no reason to be the first). `mr_log` is for **non-reject** structured events
  only; `guards::log_reject` stays the unchanged SSOT for reject-path logging — two blessed low-level
  emission points, not a blanket rewrite of working, tested code. (b) `MrHeartbeatSchedule` (a scheduled
  table colocated with its reducer, mirroring `movement_tick_schedule`/`battle_challenge_reaper_schedule`)
  and `mr_heartbeat`, a scheduled reducer that logs one `mr_log("heartbeat", …)` line per interval and
  mutates no table. (c) Correlation is `ctx.connection_id` (session-scoped) — no shared mutable counter
  table; a scheduled reducer's `connection_id` is always `None`, so its lines correlate by `(function, ts)`
  plus a natural key already in the payload (e.g. `zone_id`).
- **D7 — Perf-budget gate is a `criterion` dev-dependency scoped to `game-core` only.** Zero
  `spacetimedb`/wasm coupling (the feature-isolation invariant M0 already enforces stays intact — `criterion`
  never becomes a `server-module` or `client-wasm` dependency). Benchmarks cover the named hot paths already
  listed in `observability-performance-plan.md` §2; a regression beyond the committed budget fails `just
  ci`, proven by a seeded-regression proof-of-teeth fixture.
- **D8 — SLO definition splits "bug" from "correctly rejected."** `committed="false"` on
  `spacetime_num_txns_total` conflates a real reducer failure with a guard correctly rejecting a bad request
  (independently reproduced: an unauthenticated `talk`/`set_profile_name` call both produce
  `committed="false"` from a correct `"not joined"` rejection). The reducer-success SLO is computed only over
  a **named allowlist** (`$slo_set`), `committed="true"` vs total; guard-rejection rate is a **separate**
  panel fed by S2's `evt:"reject"` lines, never blended into the success ratio.
- **D9 — Load testing measures with the same instrument the dashboards use.** `mr-load-driver`
  (`sim-harness/src/bin/mr_load_driver.rs`) scales real SpacetimeDB SDK clients against a target
  concurrency; the breaking point is read directly off S1 (movement-tick p95 crossing `STEP_MS`, or any
  queue-depth metric growing monotonically) — no separate measurement path to keep in sync. Chat flood is
  out of scope until M19 exists (a reserved, stubbed dashboard panel only).
- **D10 — Profiling is cost-ordered, cheapest first.** T1 `criterion` (=D7) → T2 `cargo flamegraph`
  (on-demand SVG, no service) → T3 `spacetime start --enable-tracy` (confirmed present on the pinned
  binary — **try this first under load**) → T4 wasmtime `--profile=jitdump` + `perf` (**deferred spike, only
  if T3 fails**). T4's justification is corrected from the pre-refinement draft: the debuginfo-preserving fix
  (`clockworklabs/SpacetimeDB` PR #1013) merged 2024-04-05 — sixteen months before this ADR, comfortably
  inside the 2.6.0 pin — not the miscited "2024-10-01"; wasm-opt stripping debug symbols is not a live
  blocker for the pinned toolchain.
- **D11 — Backup/DR is decided, not deferred.** Backup surface:
  `<data-dir>/replicas/<id>/{clog,snapshots}`, `control-db/`, `program-bytes/` (via `restic` or
  `borgbackup`), plus Prometheus/Loki/Tempo data dirs. Retention: Prometheus 30d, Loki compactor 30d, Tempo
  block retention 7d. Crash-consistency: for a solo operator with no HA requirement, v1 takes the backup
  inside a brief stop-the-world window or an atomic filesystem snapshot — never a live copy of an in-use
  commitlog file. **RTO is measured, not estimated**: `spacetime_replay_total_time_seconds` +
  `spacetime_replay_commitlog_time_seconds` + `spacetime_replay_commitlog_num_commits` are emitted by the
  host on every restart, so a restore drill produces the real number directly; repeat the drill as the
  (append-only, never-compacted) commitlog grows.
- **D12 — PII and cardinality rules, made enforceable, not just stated.** No player-authored text (names,
  chat) in any log line, metric label, or trace attribute, ever. `sender` identity hex is permitted in
  WARN/ERROR log lines only (confirmed already logged today via `guards::log_reject`'s `Identity` `Display`)
  — never promoted to a Prometheus/Loki label. Every Alloy `stage.metrics` label set is a bounded enum
  (`reducer`, `table`, `zone_id`, `evt`); an eval rejects a configuration proposing an unbounded label. The
  client's F9 telemetry beacon (ADR-0130) carries no identity fields — unchanged.
- **D13 — Relationship to M-playtest-b: no new private table, no boundary change.** S3 being cut removes the
  only reason M20 might have needed a new private table of its own — `pt-b2`'s `playtest_event` table (ADR-
  0131), its reaper, and `just playtest-report` are **untouched**. The existing boundary note (`M-playtest-
  b-observability-feedback.spec.md`: "Out of scope: Datadog/OTel export, dashboards, load testing, SLOs,
  alerting (all M20)") holds unchanged — `playtest_event` answers **product** questions (H1/H2/H3 proxies);
  M20 answers **operational** questions (is the server healthy, fast, and recoverable). The pull-forward
  framing there ("M20 keeps the production capstone") is now concretely this stack, not Datadog.

## EARS acceptance criteria

**Layer-1 retrofit**
- **OBS-1** — WHEN `mr_heartbeat` fires THE SYSTEM SHALL emit exactly one `mr_log` line with
  `evt = "heartbeat"` and the current `content_version`, and SHALL NOT insert, update, or delete any row.
- **OBS-2** — IF any file in `server-module/src` (excluding `guards.rs` and `observability.rs` themselves,
  and excluding `_tests.rs` files) calls `log::info!`, `log::warn!`, or `log::error!` directly THEN a CI
  lint/eval SHALL fail. *(proof-of-teeth: a seeded bare-`log::` fixture must be caught)*
- **OBS-3** — WHEN a reducer call carries `ctx.connection_id = Some(_)` THE SYSTEM SHALL use that
  `connection_id` as the sole correlation key for that call's log lines; no shared mutable counter table
  SHALL be introduced anywhere in `server-module/src` for correlation purposes.
- **OBS-4** — WHEN `mr_heartbeat` (a scheduled reducer, `ctx.connection_id = None`) logs THE SYSTEM SHALL
  correlate its lines by `(function, ts)` plus `content_version`, not by a synthesized id.
- **OBS-5** — WHEN `cargo bench -p game-core` runs THE SYSTEM SHALL execute a `criterion` benchmark for each
  named hot path in `observability-performance-plan.md` §2, each compared against a committed perf budget.
- **OBS-6** — IF a benchmarked hot path regresses beyond its committed budget THEN `just ci` SHALL fail.
  *(proof-of-teeth: a seeded-regression fixture proves the gate bites)*
- **OBS-7** — THE `game-core` `criterion` dev-dependency SHALL introduce zero coupling to `spacetimedb` or
  any wasm-boundary crate (the feature-isolation eval's existing scope SHALL stay green with no exemption
  added for benches).
- **OBS-8** — `M0-foundation.spec.md`'s EARS line `:142` (module-emitted OTel spans/metrics) SHALL be
  recorded here as misspecified and superseded by D1; correcting the line's text in that file is a
  bookkeeping edit **out of this ceremony's execution-stage write scope** — track it as a `§4` task so it is
  not silently lost. *(This is a documentation-tracking item, not an observable system-behavior test — it
  doesn't fit the EARS pattern the other 39 criteria follow; its pass/fail condition is "the §4 task exists
  and is eventually done," not something a build-time gate exercises.)*

**Metrics & log data path**
- **OBS-9** — WHEN Prometheus scrapes `/v1/metrics` on a published module THE SYSTEM SHALL expose no fewer
  than 80 metric families, including `spacetime_num_txns_total`, `spacetime_txn_elapsed_time_sec`,
  `spacetime_num_table_rows`, and `spacetime_subscription_connections`, verified by the
  `observability-metrics-contract` eval (listed in §4).
- **OBS-10** — WHEN `spacetime logs --format json` emits a line for a rejected reducer call THE SYSTEM SHALL
  populate that line's `function` field with the name of the reducer that was executing, even when the log
  call originates inside a helper in a different file — verified by the same eval reproducing the
  `guards.rs:55` cross-file attribution.
- **OBS-11** — Alloy's `loki.source.file` component SHALL tail `<data-dir>/replicas/*/module_logs/*.log` in
  read-only mode via a bind mount; THE SYSTEM SHALL NOT execute any subprocess (`exec` source or equivalent)
  to obtain log lines.
- **OBS-12** — WHEN a `module_logs` line matches an Alloy `stage.metrics` derivation rule THE SYSTEM SHALL
  expose a corresponding counter, keyed only by the bounded label set in D12, on Alloy's own self-metrics
  endpoint.
- **OBS-13** — WHEN Prometheus scrapes Alloy's self-metrics endpoint (S1b) THE SYSTEM SHALL ingest the
  counters described in OBS-12, so S2-derived log metrics are queryable from Prometheus. *(closes the
  log-derived half of the missing-ingestion-hop defect the refinement pass found; S4's browser-OTLP metrics
  reach Prometheus by a separate mechanism — see OBS-38 — since S1b's scrape does not carry them)*
- **OBS-14** — THE SYSTEM SHALL NOT include a `perf_event`/`ops_metric`-style private domain-metric table, a
  scheduled polling-exporter reducer, or a module-owner-identity credential in the M20 v1 deployment (S3
  stays cut per D2). *(mechanically enforced by the project's existing schema-snapshot gate, which flags any
  new `schema.rs` table including a private one, plus code review — no new eval is needed for this
  criterion.)*
- **OBS-15** — IF a future milestone un-cuts S3 THEN the new table SHALL declare an explicit row-level-
  security policy before use, and SHALL be accessed only via `POST /v1/database/<id>/sql`, never a
  `spacetime sql` CLI subprocess.
- **OBS-16** — WHEN the browser client emits telemetry via the OTel Web SDK THE SYSTEM SHALL send it over
  OTLP/HTTP to Alloy's `otelcol.receiver.otlp` endpoint, and THE SYSTEM SHALL NOT require or accept an
  authentication credential from the browser on that path.
- **OBS-17** — WHILE the SpacetimeDB module's port is reachable from any network the operator does not fully
  trust THE SYSTEM SHALL block `/v1/metrics` at a reverse proxy in front of SpacetimeDB itself, or keep that
  port bound to loopback/private network only (deployment target fixed by OQ1's answer).

**Alerting & Caddy exposure posture**
- **OBS-18** — THE Prometheus configuration SHALL contain recording rules only; it SHALL NOT contain an
  `alerting:` block, and every `rule_files:`-loaded YAML file SHALL contain only `record:` rule groups —
  never an `alert:` stanza (the absence of an `alerting:`/Alertmanager target does not by itself stop
  Prometheus from evaluating an `alert:` rule it has nowhere to route; both checks are required).
- **OBS-19** — THE SYSTEM SHALL perform 100% of alert-rule evaluation and 100% of notification routing
  inside Grafana OSS unified alerting, querying Prometheus and Loki as datasources; no Alertmanager
  container SHALL be present in the deployment.
- **OBS-20** — WHEN a request reaches Caddy's Grafana route THE SYSTEM SHALL require TLS and an
  authenticated session.
- **OBS-21** — WHEN a request reaches Caddy's browser-OTLP ingest route THE SYSTEM SHALL require TLS, SHALL
  NOT require authentication, and SHALL apply CORS origin scoping plus request-rate and payload-size limits
  (D5: CORS scopes browser cross-origin abuse; the rate/payload limits, not CORS, are what scopes a direct
  scripted client).

**SLOs & dashboards**
- **OBS-22** — THE SYSTEM SHALL define a named reducer allowlist (`$slo_set`) used only for the reducer-
  success SLO, excluding any reducer whose primary rejection mode is a functioning guard.
- **OBS-23** — WHEN the reducer-success SLO is computed THE SYSTEM SHALL compute it only over
  `committed="true"` vs total transactions within `$slo_set`, and SHALL present guard-rejection rate as a
  separate panel sourced from S2's `evt:"reject"` lines, never blended into the success ratio.
- **OBS-24** — THE SYSTEM SHALL define the movement-tick latency SLO as p95 of
  `spacetime_txn_elapsed_time_sec{reducer="movement_tick"}` staying under `STEP_MS`.
- **OBS-25** — THE SYSTEM SHALL define a client-fps SLO of p50 ≥ 55, sourced only from S4 browser metrics.
- **OBS-26** — THE SYSTEM SHALL define connect-success from `spacetime_worker_ws_clients_aborted` vs
  `spacetime_worker_ws_clients_spawned`, and saturation early-warnings from
  `spacetime_subscription_send_queue_length`, `spacetime_worker_instance_operation_queue_length`,
  `spacetime_reducer_wait_time_sec` p95, and `spacetime_worker_wasm_memory_bytes`.

**Load testing**
- **OBS-27** — WHEN `mr-load-driver` runs against a target concurrency THE SYSTEM SHALL record the
  concurrency level at which movement-tick p95 first crosses `STEP_MS`, or any queue-depth metric begins
  monotonically growing, as the measured breaking point.
- **OBS-28** — Chat-flood load scenarios SHALL remain a stubbed, reserved dashboard panel until M19 (chat)
  exists; THE SYSTEM SHALL NOT block M20 completion on chat-flood load testing.

**Profiling**
- **OBS-29** — WHEN a profiling session under load is requested THE SYSTEM SHALL attempt
  `spacetime start --enable-tracy` first; wasmtime `--profile=jitdump` + `perf` SHALL be used only if that
  attempt fails to produce actionable output.

**Backup / DR**
- **OBS-30** — THE SYSTEM SHALL back up `<data-dir>/replicas/<id>/{clog,snapshots}`, `control-db/`, and
  `program-bytes/` via `restic` or `borgbackup` on an operator-configured schedule.
- **OBS-31** — WHEN a restore drill is performed THE SYSTEM SHALL derive RTO from
  `spacetime_replay_total_time_seconds` (+ the two companion replay metrics), not from an estimate.
- **OBS-32** — THE SYSTEM SHALL take backups inside a brief stop-the-world window or an atomic filesystem
  snapshot; a live copy of an in-use commitlog file without one of these SHALL NOT be treated as crash-
  consistent.

**PII, cardinality & licensing governance**
- **OBS-33** — Loki, Tempo, and Grafana OSS SHALL run as stock, unmodified vendor images (configuration
  only). IF any of the three is ever forked/patched and redistributed to other users over a network THEN
  the AGPLv3 network-copyleft analysis in ADR-0180 SHALL be re-reviewed before doing so.
- **OBS-34** — THE SYSTEM SHALL NOT include player-authored text (names, chat) in any log line, metric
  label, or trace attribute.
- **OBS-35** — WHILE `sender` (identity hex) appears in a WARN/ERROR log line THE SYSTEM SHALL permit it
  there only, and SHALL NOT promote it to a Prometheus or Loki label on any metric. *(OBS-34/35's log-content
  half is enforced by code review scoped to the two blessed emission points D6 establishes — `guards::
  log_reject` and `observability::mr_log` — not by an automated content scanner; the label-cardinality half
  is mechanically gated by G6/OBS-36.)*
- **OBS-36** — THE SYSTEM SHALL restrict every Alloy `stage.metrics` label set to the bounded enum in D12; an
  eval SHALL reject a configuration proposing an unbounded label (e.g. raw identity, raw message text).
- **OBS-37** — THE SYSTEM SHALL NOT include Datadog, Vector, a standalone OTel Collector, Alertmanager,
  Pushgateway, or any bespoke metrics-exporter binary anywhere in the M20 stack.

**Ingestion completeness & meta-monitoring** *(added post-refinement — closes the second half of the
missing-ingestion-hop defect and the "who watches the watcher" gap both adversarial reviews of this ceremony
found)*
- **OBS-38** — WHEN Alloy's `otelcol.exporter.prometheus` converts S4's browser-OTLP metrics THE SYSTEM SHALL
  forward them via a `prometheus.remote_write` component to Prometheus's remote-write receiver
  (`--web.enable-remote-write-receiver`), so S4 metrics are queryable from Prometheus. S1b's scrape (OBS-13)
  does not carry this path; this is a separate, independently-wired push. *(closes the S4 half of the
  missing-ingestion-hop defect S1b alone does not cover)*
- **OBS-39** — THE SYSTEM SHALL define a Grafana OSS alert rule that fires when Prometheus has not
  successfully scraped Alloy's self-metrics endpoint (S1b) for longer than 3 consecutive scrape intervals, so
  a failure of the sole telemetry agent is not silently invisible.
- **OBS-40** — THE SYSTEM SHALL record, in `docs/observability-dr-runbook.md`, the timestamp of the most
  recent successful backup, and SHALL define an alert or a documented manual check that fires when that age
  exceeds twice the operator-configured backup interval (OBS-30).

## §4 Task checkboxes

- [ ] `server-module/src/observability.rs` (new domain module, ADR-0056/M8.9 convention): `mr_log` helper
  (D6), `MrHeartbeatSchedule` table + `mr_heartbeat` scheduled reducer
- [ ] `server-module/src/observability_tests.rs` (new)
- [ ] Wire `mr_heartbeat`'s schedule arm in `server-module/src/lib.rs` (`init`/`sync_content`, mirrors
  `movement_tick_schedule` wiring)
- [ ] `evals/observability-log-wrapper.eval.mjs` (new) — OBS-2's bare-`log::` ban + proof-of-teeth fixture
- [ ] `game-core/Cargo.toml`: `criterion` dev-dependency + `[[bench]]` entries; `game-core/benches/*.rs` for
  each named hot path in `observability-performance-plan.md` §2
- [ ] Root `Cargo.toml`: uncomment/populate the `criterion` line in `[workspace.dependencies]` (currently a
  comment only, per the M0 SSOT convention)
- [ ] `justfile`: perf-budget CI step wired into `just ci`'s `eval` stage; committed perf-budget file(s) per
  benchmarked hot path
- [ ] Seeded-regression proof-of-teeth fixture for the perf-budget gate (OBS-6)
- [ ] `evals/observability-metrics-contract.eval.mjs` (new) — publishes a scratch module, scrapes
  `/v1/metrics`, asserts OBS-9's family count + label keys (`reducer`, `committed`, `txn_type`,
  `table_name`, `le`); asserts OBS-10's cross-file `function`-attribution reproduction; asserts OBS-13's
  Alloy self-metrics non-zero-counter reproduction against a synthetic `module_logs` fixture — this covers
  S2's log-derived path only, not S4 (OBS-38's remote-write path is a static config check, see the
  `observability-stack-config.eval.mjs` bullet below) (three assertions, one file — cheap and hermetic per
  this project's existing proof-of-teeth idiom)
- [ ] `ops/observability/docker-compose.yml` (new dir, new file) — the 7-container SSOT: Prometheus (with
  `--web.enable-remote-write-receiver` in its command args, for S4's push — OBS-38), Alloy, Loki, Tempo,
  Grafana OSS, node_exporter, Caddy; set a `mem_limit`/`cpus` resource cap per container once D9's load test
  produces a real footprint figure to size against — not guessed at spec time, but not left unset either
- [ ] `ops/observability/prometheus.yml` — S1 (`/v1/metrics`) + S1b (Alloy self-metrics) + node_exporter
  scrape jobs; recording rules only, no `alerting:` block and no `alert:` stanza in any loaded rule file
  (OBS-18)
- [ ] `ops/observability/alloy/config.alloy` — `loki.source.file` + `loki.process` (`stage.metrics`,
  bounded labels per D12) + `loki.write`; `otelcol.receiver.otlp` (CORS) + `otelcol.exporter.otlp` (Tempo) +
  `otelcol.exporter.prometheus` → a `prometheus.remote_write` component pointed at Prometheus's remote-write
  endpoint (OBS-38 — the exporter's only sink is a push, not a scrape target Prometheus can pull from)
- [ ] `ops/observability/grafana/` provisioning — RED/domain/netcode-smoothness/client-fps dashboards
  (including the named `$slo_set` allowlist variable, the movement-tick and client-fps SLO panels, and the
  connect-success/saturation panel set — OBS-22–26) + unified alerting rules (including the S1b-scrape
  dead-man's-switch rule, OBS-39) + contact points (ntfy self-hosted is an acceptable optional contact point)
- [ ] `ops/observability/Caddyfile` — dual posture (D5/OBS-20/OBS-21); `caddy-ratelimit` built via `xcaddy`
- [ ] `ops/observability/Dockerfile` (new, for Caddy's `xcaddy` build) — pinned Caddy + `caddy-ratelimit`
  versions; this is the build-pipeline artifact D3 flags as Caddy's differentiated maintenance line versus
  the other six stock, `docker pull`-able images
- [ ] `ops/observability/retention.md` or inline config comments — Prometheus 30d / Loki 30d / Tempo 7d
  (D11)
- [ ] `docs/observability-dr-runbook.md` (new) — backup commands (`restic`/`borgbackup`), the stop-the-world/
  fs-snapshot crash-consistency procedure, the first measured-RTO restore drill's result, and the most recent
  successful backup's timestamp + the freshness check/alert that watches its age (OBS-40)
- [ ] `evals/observability-stack-config.eval.mjs` (new) — static scan of `ops/observability/**`: no
  `alerting:` in `prometheus.yml` **and** no `alert:` stanza in any `rule_files:`-loaded YAML (OBS-18); no
  `alertmanager` service in `docker-compose.yml`, **and** none of the OBS-37 banned tool names (`datadog`,
  `vector`, `otel-collector`, `pushgateway`, or a bespoke exporter) appear as a service name there either
  (OBS-37); `cors` sub-block present on Alloy's `otelcol.receiver.otlp`; a `prometheus.remote_write`
  component present in `config.alloy` forwarding `otelcol.exporter.prometheus`'s output, and
  `--web.enable-remote-write-receiver` present in Prometheus's `docker-compose.yml` command args (OBS-38);
  no subprocess/`exec`-based log source configured for Alloy's log tail (OBS-11); Caddy's OTLP route has no
  auth directive while the Grafana route does; every `stage.metrics` label matches the D12 bounded enum; the
  Grafana provisioning JSON names the `$slo_set` allowlist variable and includes the movement-tick,
  client-fps, and connect-success/saturation dashboard panels (OBS-22–26) and the S1b dead-man's-switch
  alert rule (OBS-39)
- [ ] `client/src/observability/` (new dir) — OTel Web SDK wiring: fps/frame-time, prediction-divergence
  rate, reconcile-correction rate, remote-interp gap, RTT, wasm-init time; OTLP/HTTP export to Alloy (S4)
- [ ] Wire client observability init in `client/src/main.ts`
- [ ] `sim-harness/src/bin/mr_load_driver.rs` (new) — scaled multi-client load driver (D9); reads S1 metrics
  to report the measured breaking point (OBS-27)
- [ ] Update `M0-foundation.spec.md`'s EARS line `:142` and annotate the unchecked `:211` checkbox as
  deferred-to-M20 — bookkeeping edit, **out of this ceremony's write scope**, do at the next build tick
  (OBS-8)
- [ ] `just adr-digest` regeneration after ADR-0180 lands

## §5 Slice decomposition

| Slice | Touches | Notes |
|-------|---------|-------|
| **m20a — Layer-1 retrofit** | `server-module/src/observability.rs` (new), `server-module/src/observability_tests.rs` (new), `server-module/src/lib.rs`, `game-core/Cargo.toml`, `game-core/benches/**` (new), root `Cargo.toml`, `justfile`, `evals/observability-log-wrapper.eval.mjs` (new), `evals/observability-metrics-contract.eval.mjs` (new) | **SERIAL relative to any other server-module slice touching `schema.rs`/`lib.rs`** (none exist in this milestone) — the new `mr_heartbeat_schedule` scheduled table is a schema-touching addition per the M8.9 exception (colocated with its reducer, mirrors `movement_tick_schedule`). Bundles the `criterion`/perf-budget-gate work in with `mr_log`/heartbeat rather than splitting further — both are small, and `Cargo.toml`/`justfile` are shared files a second slice would just conflict on (mirrors M21a's own bundling rationale). |
| **m20b — self-hosted stack config** | `ops/observability/**` (all new), `docs/observability-dr-runbook.md` (new) | **Touches-disjoint from m20a — may start immediately alongside it, not blocked on its merge.** Alloy's `stage.metrics` rules target the `evt` vocabulary this spec fixes (D6: `"heartbeat"`, `"reject"`). The `"reject"` half is a genuine no-dependency case — `guards.rs` already emits `evt:"reject"` today, unchanged by this milestone. The `"heartbeat"` half is narrower: `mr_log`/`mr_heartbeat` don't exist yet, and ADR-0180's own code sample is explicitly flagged illustrative-only, refined at build time — so m20b's heartbeat-derivation rule is written against a contract m20a is still free to adjust before it lands. This is a real, if narrow, Layer-1→Layer-3 contract dependency, not zero dependency; it is deliberately not serialized (the two slices are small and the shared surface is one `evt` string), but the mitigation is explicit: m20e's post-merge integration eval is what catches any drift, not a pre-merge check. |
| **m20c — client real OTel** | `client/src/observability/**` (new), `client/src/main.ts`, sibling tests | Touches-disjoint from m20a/m20b/m20d; no bindings dependency (client-side instrumentation only, no server schema read). Full end-to-end verification needs m20b's Alloy OTLP ingress reachable, but unit-level SDK wiring can build and test against a mocked endpoint independently. |
| **m20d — load driver** | `sim-harness/src/bin/mr_load_driver.rs` (new), `sim-harness/src/lib.rs`/`world.rs` only if a shared helper is needed | Touches-disjoint from all above; depends only on the already-published live module and S1 metrics (host-native, zero coupling to m20a/b/c). Could in principle build first of all. |
| **m20e — evals tail** | `evals/observability-stack-config.eval.mjs` (new), the third (Alloy self-metrics) assertion in `evals/observability-metrics-contract.eval.mjs` if not completed in m20a, Rust-side mirror additions to `observability_tests.rs` | **SERIAL, after m20a AND m20b merge** — needs both `mr_log`/heartbeat artifacts (m20a) and the committed `ops/observability/**` config files (m20b) to scan/exercise. |

**Post-integration verification** (after m20a + m20b + m20c + m20d + m20e all merge): full `just ci`
green-and-meaningful; bindings-drift = 0 (client bindings are untouched by this milestone but the gate still
runs); schema-snapshot updated to include `mr_heartbeat_schedule`; the `observability-metrics-contract` and
`observability-stack-config` evals both green against the real `docker-compose.yml` stack brought up via
`docker compose up -d`; a real restore drill run once, with its measured RTO recorded in
`docs/observability-dr-runbook.md`; every OBS-1..OBS-40 criterion satisfied against the integrated whole
(config files + running containers + a published module), not merely per-slice.

## Risks / decisions

- `/v1/metrics`'s permanent unauthenticated-by-design gap is the one real, confirmed network-exposure risk
  this milestone surfaces — resolved by network topology (OQ1), not by anything M20 builds into the module
  (there is nothing to fix in the module; the host binary's gap is out of this project's control).
- Alerting role confusion (Prometheus `alerting:` + no Alertmanager is self-contradictory) → resolved by D4:
  Prometheus computes, Grafana OSS evaluates and routes, full stop.
- A public game client cannot authenticate to send telemetry, but the ingest port must not be wide open
  either → resolved by D5's two-policy Caddy split (CORS scopes browser cross-origin abuse; rate limiting +
  payload-size caps, not CORS, scope a direct scripted client, by design, not by oversight).
- The full 7-container + custom-Caddy stack is being built before `M-playtest-a-deployment.spec.md`'s hosting
  topology is decided — that spec's own scope note confirms deployment is rescoped to local-only, with hosted
  deployment an explicit, unscheduled YAGNI deferral to `M-playtest-a2`. Leaving OQ1 open rather than guessing
  is correct (a security decision, not taste), but it also means a solo operator pays the ongoing
  7-container + `xcaddy`-build maintenance tax for a stack that may sit pointed at nothing, or need its
  Caddy/network posture reworked once `M-playtest-a2` finally picks a host. This is a real, accepted
  sequencing cost, surfaced explicitly here rather than left implicit inside OQ1.
- Log→metric derivation inside Alloy could prove lossy or high-cardinality enough to be unusable for domain
  rates → if so, S3 is un-cut via the HTTP SQL endpoint (D2), with an RLS policy applied, not via a CLI
  subprocess.
- `--enable-tracy` might not build/run cleanly in the pinned distribution when actually tried under load → if
  so, T4 (wasmtime jitdump + perf) is promoted from deferred to scheduled; the corrected debug-symbol
  citation (D10) means this is not blocked by a stripped-symbols risk either way.
- The project's closed ADR `SUBSYSTEM_VOCAB` (`scripts/adr-digest.mjs`) has no observability/performance/
  infra tag — ADR-0180 uses the closest available fit (`ci-gates`, `tooling-docs`, `schema-persistence`) and
  says so explicitly rather than silently mis-tagging; adding a proper tag is a `scripts/adr-digest.mjs`
  change, out of this ceremony's write scope.
- Optimize the tuning pass on measurement only (revert non-improvements); correctness + smoothness evals
  must stay green throughout.
- Confirm Prometheus/Alloy/Loki/Tempo/Grafana OSS/node_exporter/Caddy versions against the pinned
  environment at build time (mirrors the original ADR-0029 wording, now applied to the new stack instead of
  Datadog/OTel).

## → Phase D (ongoing) / M22+

The self-hosted log pipeline (S2, Loki) and dashboards this milestone stands up are the operational baseline
the rest of Phase D reuses, not a one-off: M22 (privacy/deletion) can audit its cascade against the same
structured logs; M23/M24/M25 each still owe their own hot-path benchmark + load test per the Layer-2
cross-cutting invariant (`observability-performance-plan.md` §1), now backed by a real, working perf-budget
gate instead of a specified-but-unbuilt one. The D2 escape hatch (S3, RLS-gated) is the documented on-ramp if
any future milestone needs a genuine domain-specific metric the host's native signals + Alloy's log
derivation can't cover.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
