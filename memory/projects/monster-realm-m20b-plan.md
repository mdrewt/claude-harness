# monster-realm — m20b build plan (M20 observability stack config)

**Slice:** m20b · **Branch:** `feat/m20b-observability-stack` · **Worktree:** `.claude/worktrees/m20b`
**Spec:** `specs/monster-realm-v2/M20-observability-performance.spec.md` §5 (m20b row) · **ADR:** 0180 (Accepted — amendment only, no new reservation)
**Date:** 2026-08-08

---

## 0. Right-sizing decision — SHIP THE SPLIT

**This slice ships `m20b-1`: the 7-service backend stack config + DR runbook. `mr-trace-relay` is parked as `m20b-2`.**

> **CORRECTED after the plan-review pass.** The first draft's "decisive argument" was **wrong on the facts** and is
> retracted: it claimed OBS-50's G9 exact-set-equality gate and OBS-51's G11 pre-merge check force this split. They do
> not — per spec:681, **both G9 and G11 run at m20e**, after m20a+m20b+m20d have merged, so they fire identically
> whether the relay ships in m20b or m20b-2. They do not discriminate between the two slicings. The decision survives
> on the corrected grounds below; the retracted argument is left visible rather than quietly deleted.

**This is an explicit, declared deviation from the spec.** Spec:678 and ADR-0180:820-828 both say the relay fits inside
m20b's already-declared `ops/observability/**` wildcard with "**no new slice row needed**", mitigated by m20e's
post-merge integration eval rather than by serialization. I am deviating under the supervisor's standing right-sizing
instruction for this run ("if planning shows the slice is large — many files / several EARS criteria — ship the
smallest coherent mergeable increment and park the remainder as the next slice"). The deviation must be stated in the
PR body and the handoff, not buried here.

### The corrected justification

**(1) The relay would ship as dead code with no producible input — and the gap is a real spec defect, not a
sequencing inconvenience.** `mr-trace-relay` consumes exactly one input: `mr_log` breadcrumbs carrying
`phase:"enter"`/`phase:"exit"` emitted from inside domain reducers (OBS-41, spec:527-529). Verified against the §5
table and the whole §4 checkbox list this pass:

- m20a's `touches:` (spec:677) covers `observability.rs` gaining the `cause`/`sched`/`phase` **fields** — i.e. the
  helper's envelope — plus `observability_tests.rs`, `.log-baseline`, `lib.rs`, `Cargo.toml`s, `benches/**`,
  `justfile`, two evals. **No domain-reducer file** (`movement.rs`, `battle.rs`, `trading.rs`, …) is in its scope.
- **No §4 task checkbox anywhere assigns the paired call sites.** Grepped the whole §4 list: the closest entries are
  the relay itself and the G11 pre-merge check — neither writes a breadcrumb.

⇒ **OBS-41 currently has no implementing slice.** Nothing merged, in flight, or planned produces a single `phase`
breadcrumb. A relay shipped today would have `$trace_pair_set = ∅` (which, note, *is* G9-consistent — ∅ == ∅ — so G9
would not even flag it), zero input, and zero integration coverage, until some future unassigned slice writes the call
sites. That is YAGNI-violating dead code by the harness standard, and it is the honest reason to wait.

**⚠ ESCALATION (supervisor, must reach the handoff):** OBS-41 is unassigned in M20's slice table and §4 checklist.
This is a spec defect independent of how m20b is sliced — it needs an owner (extend m20a's touches, or add a slice)
before M20 can claim its EARS criteria are covered.

**(2) Size and review quality.** ~16 config artifacts across 6 config languages in one half; a ~500-line Node service
with an algorithmic test surface (ts-ordered pairing, trace-tree parenting under interleaving, OTLP hex encoding) in
the other. Mixing them means the pairing algorithm gets reviewed by whatever attention survived a dozen YAML files.

**(3) Half 1 is independently coherent and deployable.** `docker compose up -d` ⇒ metrics + logs + dashboards +
working alerting + a DR runbook. D17 already discloses that relay absence "degrades trace *assembly* only — logs still
reach Loki on the independent Alloy path (S2)" (ADR-0180:614). Half 1 also unblocks m20c, which needs the Alloy OTLP
ingress + Caddy public route to exist.

Supporting: half 1 is independently coherent and deployable (`docker compose up -d` ⇒ metrics + logs + dashboards +
working alerting + a DR runbook); D17 already discloses that relay absence "degrades trace *assembly* only — logs still
reach Loki on the independent Alloy path (S2)" (ADR-0180:614); and half 1 unblocks m20c, which needs the Alloy OTLP
ingress + Caddy public route to exist.

**Disclosed cost of the split (goes in the PR):** three files get touched twice — `docker-compose.yml` (+1 service),
`prometheus.yml` (+1 scrape job), `grafana/provisioning/alerting/rules.yml` (+1 rule). ~25 additive lines, all inside
m20b-2's own touches. Mitigation: the service-set assertion takes the expected set as a **parameter** (7 now, 8 in
m20b-2) — one constant to bump, not a rewrite.

**Sequencing after the split:** `m20a` → (`m20b-1` ∥ `m20c` ∥ `m20d`) → `m20b-2` → `m20e`.
**m20e is serial after m20b-2, not merely "after m20b"** — must be stated in the handoff so §5's wording isn't
misread.

### Rejected cuts
- Cut by signal path (metrics+logs now, traces+relay later) — strands m20c, which needs the OTLP ingress. Reject.
- Runbook as its own slice — too small, coheres with retention/backup config. Reject.
- Ship whole with a "pending" `$trace_pair_set` — the G9 exact-equality contradiction above. Reject.
- Ship whole (steelman): defensible **iff** m20a had merged and m20d existed. Neither holds. Reject on facts.

---

## 1. Build-time spike results (all resolved this pass — no guesses left)

| ID | Question | Verdict |
|---|---|---|
| **OQ1** | Is the SpacetimeDB port internet-reachable? Same box or separate? | **ANSWERED, not guessed.** `M-playtest-a-deployment.spec.md:3-4` fixes deployment as **local-only, no hosted deployment** (rescoped 2026-07-17 per Drew, sole tester). ⇒ SpacetimeDB stays loopback-bound; **OBS-17's "reverse proxy in front of SpacetimeDB itself" scope addition is NOT triggered**; D3/D5's posture as written is sufficient. Same box. The spec itself instructs this resolution path ("If `M-playtest-a-deployment.spec.md` already fixes the hosting topology, read it first and treat this as answered", spec:104-105). |
| **S-1** | D17(2): Grafana **Correlations** vs **Loki derived fields** for the `connection_id` pivot? | **Correlations.** Derived fields are one-way and Loki-source-only, so they structurally cannot do the Tempo→Loki leg the pivot needs. Correlations are any-source→any-target and **are file-provisionable in Grafana OSS** — as a nested `correlations:` list under the *source* datasource in `datasources.yaml` (this was the UNVERIFIED half; now confirmed). Two entries needed, one per direction. No ADR falsifier tripped. |
| **S-2** | xcaddy non-root build | Two-stage `caddy:2.11.4-builder-alpine` → `caddy:2.11.4-alpine`, `xcaddy build --with github.com/mholt/caddy-ratelimit`. Final stage runs as a **non-root numeric UID**; no privileged ports bound in-container (compose maps host ports), so no `CAP_NET_BIND_SERVICE` dance. |
| **S-3** | Alloy component syntax at the pin | Confirmed: `loki.source.file` → `loki.process` (`stage.json` + `stage.metrics`/`metric.counter`) → `loki.write`; `otelcol.receiver.otlp` with `http { cors { allowed_origins, allowed_headers, max_age } }`; `otelcol.exporter.otlp` (Tempo); **`otelcol.exporter.prometheus "x" { forward_to = [prometheus.remote_write.y.receiver] }`** is the literal OBS-38 wiring line (a `forward_to` argument, NOT an `output` block). Alloy self-metrics (S1b) = the Alloy HTTP server, `/metrics` on `:12345`. |
| **S-4** | Which validators exist locally? | `docker` 29.2.1 + `docker compose` v5.0.2 present. `promtool`/`alloy`/`caddy` NOT on PATH ⇒ run them **via the pinned images** (`docker run --rm <pinned> promtool check config ...`), which validates against the exact versions shipped. Skip-guarded when docker is unavailable, never a silent pass. |
| **S-5** | Image tags + digests | All 8 verified live via `docker manifest inspect` and pinned **by tag@sha256 digest** (resolves the researcher's year-ambiguity caveat empirically). Licenses: Loki/Tempo/Grafana = AGPLv3; Prometheus/Alloy/node_exporter/Caddy = Apache-2.0 (OBS-33). |

Pinned set:
```
prom/prometheus:v3.13.2@sha256:1147c92841726a6fef55fe6124491d6f85480f8de204f7d420304ca5bbd0a8f7
grafana/alloy:v1.18.1@sha256:754409730f1a4ed9781f8a2ea3b6a8c55750ee125a267ecf8fb449f9a25c109a
grafana/loki:3.7.6@sha256:83c76da7858a8f4f88117ac521864ac33896fdae7a352a1df4068556e7513f64
grafana/tempo:3.0.2@sha256:aa8df8d069f77b82e978464daf55169bb8d135852ad58700aa96880653c3d8f7
grafana/grafana:13.1.3@sha256:e27e68cfd5795c1bea54950766078a02e84dfa3bafe0a4d0e5382f713dfd8e4e
prom/node-exporter:v1.12.1@sha256:da83fae85603c4e47e6c68369a7d746e2dda683dc35ea2e234b4f171e0d92798
caddy:2.11.4-builder-alpine@sha256:a7963edd45496bb8962e91e75891937081113f08f34d148f04684c4e83243aca
caddy:2.11.4-alpine@sha256:98eb57d882ccd5213d1688764db10c1ca2c58a1ca3a6717a3411ad798f7a423a
```

---

## 2. Repo constraints this slice must survive (verified, not assumed)

| Fact | Evidence | Consequence |
|---|---|---|
| `just ci` = `lint typecheck test eval security wasm client-typecheck client-test` | `justfile:355` | Nothing under `ops/` is reachable by `just ci` without a justfile edit — and `justfile` is **m20a's** touches. The CI-wired gate is **m20e's**. |
| `lint` runs biome from the repo root | `justfile:19`, `biome.json:5-17` | Any new `.mjs` under `ops/` **is** linted + format-checked: single quotes, semicolons, 2-space, width 100, `recommended: true`. `**/*.json` is excluded ⇒ dashboard JSON unlinted but must still parse. |
| `security` walks the whole repo; `ops/` not in `SKIP` | `scripts/check-secrets.mjs:6-22`, pattern at `:28` | A quoted credential-shaped literal anywhere under `ops/` reds `just ci`. **Zero literals; env indirection only.** |
| gitleaks + Semgrep are remote-only | `.github/workflows/ci.yml:19,:87` | Semgrep `--config auto` newly loads the **Dockerfile + docker-compose rulesets** — this slice creates the repo's first of each. Run semgrep locally before the PR. |
| `new RegExp(...)` has bitten this repo 3× | `evals/build-ci-hygiene.eval.mjs:10-13` | Literal regex + String methods only in every new `.mjs`. |
| `.gitignore:79` = `*.log` | — | **Never name a fixture `*.log`** — it would be silently untracked. Use inline string constants / `.ndjson`. |
| `lefthook.yml` runs check-secrets + `just lint` pre-commit | `lefthook.yml:1-12` | Secret/biome failures bite at `git commit`, not CI. Good. |
| ADR digest is header-driven | `scripts/adr-digest.mjs` `generateDigest`/`checkRefs` | An **append-only** amendment that leaves ADR-0180's header block untouched keeps `DIGEST.md` byte-identical — no `DIGEST.md` edit needed (it is outside "ADR-0180 only"). **Do not touch the header block.** Verify with `node scripts/adr-digest.mjs --check`. |

---

## 3. File list — what ships, and which criteria it discharges

Under `ops/observability/` unless noted.

| # | File | Discharges |
|---|---|---|
| 1 | `docker-compose.yml` | Exactly **7** services: prometheus, alloy, loki, tempo, grafana, node_exporter, caddy (D3). No alertmanager (OBS-19), none of the OBS-37 banned names. Prometheus `command:` has `--web.enable-remote-write-receiver` (OBS-38) + `--storage.tsdb.retention.time=30d` (D11). Alloy mounts the SpacetimeDB data dir **`:ro`** (OBS-11/45). Digest-pinned stock images (OBS-33); caddy `build: .`. Only caddy publishes host ports, bound to loopback (OQ1/OBS-17). `security_opt: no-new-privileges`, `mem_limit`/`cpus` with a comment naming m20d as the re-sizing input (spec:605-606). Zero credential literals. |
| 2 | `prometheus.yml` | Scrape jobs: `spacetimedb` (S1 `/v1/metrics`), `alloy` (S1b, OBS-13), `node_exporter`. `rule_files:`. **No `alerting:` block** (OBS-18). **No `mr-trace-relay` job yet** — adding a scrape target for a service that doesn't exist would pin `up=0` forever and train the operator to ignore a dead-man's switch. |
| 3 | `rules/recording.rules.yml` | `record:`-only groups (OBS-18): `$slo_set` reducer-success ratio (OBS-22/23), movement_tick p95 (OBS-24), connect-success + the 4 saturation series (OBS-26). |
| 4 | `alloy/config.alloy` | `loki.source.file` on `replicas/*/module_logs/*.log`, **no exec/subprocess source** (OBS-11) → `loki.process` (`stage.json` + `stage.metrics`, labels ⊆ `{reducer,table,zone_id,evt}`, D12/OBS-12/OBS-36) → `loki.write`. `otelcol.receiver.otlp` + CORS, no auth (OBS-16/21) → `otelcol.exporter.otlp` (Tempo) **and** `otelcol.exporter.prometheus` → `prometheus.remote_write` (OBS-38). |
| 5 | `loki/loki-config.yml` | compactor `retention_period: 30d` (D11), stock image config-only (OBS-33). |
| 6 | `tempo/tempo-config.yml` | `block_retention: 168h` (D11). |
| 7 | `grafana/provisioning/datasources/datasources.yml` | Prometheus/Loki/Tempo. Tempo `tracesToLogsV2` with span-time-window shift (D17-1). **`correlations:` entries for the `connection_id` pivot, both directions** (D17-2, S-1 verdict). Shared time-range linkage (D17-3). |
| 8 | `grafana/provisioning/dashboards/dashboards.yml` + `grafana/dashboards/*.json` | `$slo_set` template variable + panels: reducer-success SLO **and a separate** guard-rejection panel from `evt:"reject"` (OBS-22/23), movement-tick p95 vs `STEP_MS` (OBS-24), client-fps p50 ≥ 55 (OBS-25), connect-success + 4 saturation panels (OBS-26), reserved/stubbed chat-flood panel (OBS-28). |
| 9 | `grafana/provisioning/alerting/{rules,contact-points,notification-policies}.yml` | OBS-39: `up{job="alloy"}==0` for > 3 scrape intervals (15s ⇒ `for: 45s`), routed to a **real, defined** contact point (D4 — an alert that evaluates into nothing is the exact failure D4 exists to prevent). OBS-40 backup-freshness. |
| 10 | `Caddyfile` | Dual posture (D5). Grafana route: TLS + auth, hash via `{env.…}` (OBS-20). OTLP ingest route: TLS, **no auth**, CORS origin scoping **plus** `rate_limit` **plus** `request_body max_size` (OBS-21 — the rate/size caps are the control against a scripted client; CORS is not). |
| 11 | `Dockerfile` | xcaddy build, pinned Caddy + `caddy-ratelimit`, **non-root `USER`**, no `latest`, no `curl \| sh` (new Semgrep surface). |
| 12 | `retention.md` | Prometheus 30d / Loki 30d / Tempo 7d, each naming the exact knob **and the file it lives in** (D11). |
| 13 | `README.md` | Topology, `docker compose up -d`, OQ1's resolution, the OBS-*→file map, and the explicit note that the 8th service lands in m20b-2. |
| 14 | `checks/stack-config-checks.mjs` + `checks/stack-config-checks.test.mjs` | The pure predicate library + its teeth (§4). The seam m20e imports rather than re-implements. |
| 15 | `validate.mjs` | Skip-guarded tool runner via the pinned images (§4 tier 2). |
| 16 | `docs/observability-dr-runbook.md` | OBS-30 (restic/borg, fenced+runnable), OBS-32 (stop-the-world / atomic-snapshot; explicit statement that a live commitlog copy is NOT crash-consistent), OBS-31 (RTO **derived** from `spacetime_replay_total_time_seconds` + companions — a procedure now, the measured number at post-integration), OBS-40 (most-recent-backup timestamp slot + the age > 2× interval check). |
| 17 | `docs/adr/0180-*.md` | **Append-only** dated amendment; header block untouched. |
| 18 | `ARCHITECTURE.md` | One short, targeted subsection pointing at `ops/observability/README.md`. |

### Design seams
- **`$slo_set` SSOT.** It naturally wants to live in two places (the recording-rule matcher and the dashboard variable) — the same two-representations trap ADR-0180 caught for `$trace_pair_set`. **Decision: the recording rule's matcher is the single source; the dashboard variable is `label_values(<recorded series>, reducer)`.** One writer, one scan target for m20e.
- **`connection_id` is a log FIELD, never a label.** The D17-2 pivot reads the log body. Promoting it to a Prometheus/Loki label is one series per session — the most likely D12/OBS-35 breach in this slice.
- **`evt` vocabulary contract with m20a.** Only `evt:"reject"` ships today (`guards::log_reject`). Derive the JSON shape from that real emitter; write the `heartbeat` rule with an inline comment naming m20e's integration eval as the drift-catcher — the spec's own declared mitigation (spec:678). Do not pretend the contract is verified.
- **OQ1 containment.** The topology lives in exactly one place (the published-ports block + a README paragraph), not smeared across three files.

---

## 4. Test strategy (what actually bites, inside `touches:`)

Honest framing for the PR: **`just ci` cannot see any of this under m20b-1** (justfile is m20a's). So the gate is a real,
locally-runnable, mutation-resistant predicate library with proof-of-teeth, shipped as the seam m20e imports — plus
tool-backed validation, plus a documented live smoke. m20e owns the CI *wiring* and the live-stack assertions, not the
predicates.

**Tier 1 — pure predicates + teeth.** `checks/stack-config-checks.mjs`: pure functions over **text**, never paths, so
fixtures and real files share a code path. `checks/stack-config-checks.test.mjs` (`node --test`): every predicate gets
≥1 GOOD it must pass, ≥1 BAD it must flag, and a **non-vacuity** fixture (scanning nothing is never green); then the
same predicates run against the real committed files. Fixtures are inline string constants.

Assertions (→ the BAD fixture each must reject):
`NO_ALERTING_BLOCK` (OBS-18; `# alerting:` comment and a `rule_files:` path must NOT trip it) ·
`RULES_ARE_RECORD_ONLY` (OBS-18; zero-group file must FAIL, not pass) ·
`SERVICE_SET_EXACT` (OBS-19/37/D3; **exact set equality**, parameterized 7→8 — catches alertmanager/vector/
otel-collector/pushgateway/datadog *and* silent drift, which `!includes()` would not) ·
`MODULE_LOGS_MOUNT_RO` (OBS-11/45; bare or `:rw` mount rejected) ·
`NO_EXEC_LOG_SOURCE` (OBS-11) ·
`REMOTE_WRITE_BOTH_ENDS` (OBS-38; flag present but no `prometheus.remote_write`, **and** a `forward_to` that doesn't
*name-resolve* to it — co-occurrence ≠ wiring) ·
`STAGE_METRICS_LABELS_BOUNDED` (OBS-36/D12; `sender`/`player_name`/`connection_id` rejected; zero-label block not a pass) ·
`CADDY_DUAL_POSTURE` (OBS-20/21/D5; auth on OTLP rejected, no-auth on Grafana rejected, CORS-without-rate-limit-or-body-cap rejected) ·
`ALERT_RULE_HAS_A_RECEIVER` (OBS-39/D4; a rule routed to an undefined contact point = evaluates into nothing) ·
`DASHBOARD_PANELS_REAL` (OBS-22..26; JSON parses, exact metric names present; a panel *titled* "Movement tick p95" with an empty `expr` must be rejected) ·
`NO_QUOTED_CREDENTIAL` (a local mirror of `check-secrets.mjs:28` scoped to `ops/**`) ·
`RUNBOOK_HAS_RUNNABLE_STEPS` (OBS-30/31/32/40; fenced standalone command lines, the literal
`spacetime_replay_total_time_seconds`, and the 2× freshness rule).

**Tier 2 — tool-backed, skip-guarded.** `validate.mjs`: `docker compose config -q`, `promtool check config`,
`promtool check rules`, `alloy fmt` — each run through the **pinned image**, each guarded; absent docker ⇒ explicit
`skipped: …`, never a silent pass.

**Tier 3 — live smoke (manual, documented).** `docker compose up -d`; the S-1 pivot verified by hand; **Alloy stopped ⇒
OBS-39's rule observed firing** — the only real evidence D4's "no alert evaluates into nothing" holds.

---

## 5. Anti-patterns to avoid (named, this slice)

1. **Vacuous existence tests** — `existsSync(...)` is not a gate. Content assertions + a BAD fixture each.
2. **Vacuous green** — `[].every()===true`; a zero-rule file "passing" record-only; a predicate whose anchor vanished passing by default. Explicit zero-length guards.
3. **Title/keyword decoys** — a correctly-titled panel with an empty query; an `AlloyDown` alert that cannot fire; a `# alerting:` comment satisfying a substring scan. Assert executable content; strip comments first.
4. **Secrets in committed config** — zero literals, env indirection only. gitleaks is remote-only and force-push is hook-blocked, so a leak means squashing onto a fresh branch. Design it out.
5. **Unbounded labels (D12/OBS-36)** — especially the `connection_id` inversion: required as a log *field*, forbidden as a *label*.
6. **Alerts that evaluate into nothing (D4)** — and its mirror, alerting on a target that doesn't exist yet (the relay's scrape job + rule land together in m20b-2, or not at all).
7. **Prometheus creeping back into alerting** — no `alerting:` block, no `alert:` stanza, no Alertmanager (OBS-18/19).
8. **Container-set drift** — exactly the declared set; no "while we're here" cAdvisor/blackbox_exporter/Pyroscope. Exact set equality, not absence checks.
9. **Self-inflicted Semgrep surface** — `latest` tags, root `USER`, `curl | sh`. Digest-pinned, non-root.
10. **Guessing OQ1** — resolved from `M-playtest-a-deployment.spec.md`, not invented; do not add a SpacetimeDB-fronting proxy as if the answer were "public".
11. **Fabricating the m20a contract** — the heartbeat rule is written against unmerged code; say so in a comment naming m20e as the catcher.
12. **Touching generated ledgers** — `CHANGELOG.md` (git-cliff), `docs/knowledge/**` (okf-export), `docs/adr/DIGEST.md` (adr-digest). Concretely: do **not** edit ADR-0180's header block.
13. **`new RegExp(...)`** in any new `.mjs`.
14. **`*.log` fixtures** under `ops/` — silently untracked by `.gitignore:79`.

---

## 5b. Addendum — plan-review + red-team findings folded in (binding on the implementation)

### Design changes (these override §3 where they conflict)

**A. Networking model — `network_mode: host`, every service bound to loopback (red-team C2).**
The original plan was internally contradictory: a bridge-networked Prometheus **cannot** scrape a loopback-bound
SpacetimeDB. A container's `127.0.0.1` is itself; a socket bound to `127.0.0.1` refuses a connection whose destination
is the bridge gateway, so `host-gateway`/`extra_hosts` does not rescue it either. The three candidate resolutions:

| Option | Verdict |
|---|---|
| Bridge + SpacetimeDB on `0.0.0.0` | **Reject** — reopens `/v1/metrics`'s confirmed-unauthenticated gap to the LAN. Contradicts OQ1's premise outright. |
| Bridge + SpacetimeDB on the bridge gateway IP | **Reject** — fragile (compose invents its own subnet) and still exposes `/v1/metrics` to every container on the box. |
| **`network_mode: host`, every service's own listen flag bound to `127.0.0.1`** | **ADOPT.** SpacetimeDB stays strictly loopback; Prometheus reaches it; nothing binds a non-loopback address. |

This makes each service's **own listen-address flag** the security boundary rather than compose's `ports:` block
(`network_mode: host` ignores `ports:` entirely), so it needs its own predicate — see B. The payoff is that it makes
OQ1 containment exact: **the single variable that changes when M-playtest-a2 later exposes the box is Caddy's bind
address.** Everything else stays loopback forever. Document that sentence in the README.

**B. New Tier-1 predicates (red-team C1, C3, H1, H5, M2, M4).**
- `LISTEN_ADDRS_LOOPBACK` — every service's listen-address flag/`environment` binds `127.0.0.1`. Rejects `0.0.0.0:`,
  a bare `:PORT`, and an omitted flag where the upstream default is `0.0.0.0` (Prometheus `--web.listen-address`,
  Grafana `GF_SERVER_HTTP_ADDR`, Loki/Tempo `http_listen_address`, Alloy `--server.http.listen-addr`, node_exporter
  `--web.listen-address`). **Omission must FAIL** — defaults are the trap. Also rejects any `ports:` key, which is
  silently inert under host networking and would be a false comfort.
- `S4_METRIC_LABELS_BOUNDED` — **red-team C3, the highest-severity finding.** The public, unauthenticated OTLP ingest
  converts attacker-chosen attributes 1:1 into Prometheus labels; `STAGE_METRICS_LABELS_BOUNDED` covers only S2's
  log-derived path, so a `curl` loop with a random attribute per request creates unbounded active series and OOMs
  Prometheus — taking down the store that OBS-39's own dead-man's switch depends on to evaluate. **Fix:** an explicit
  label **allowlist** filter on the S4 path (`otelcol.processor.attributes` keep-list, and/or
  `write_relabel_configs` with a `labeldrop`) before anything reaches storage; the predicate asserts that filter
  exists and is wired into the S4 chain. This discharges **OBS-34** ("SHALL NOT include player-authored text in any
  log line, **metric label**, or trace attribute") which already covers S4 even though OBS-36 names only
  `stage.metrics` — note the spec has no S4-specific cardinality criterion; flag that as a follow-up.
- `LOKI_RETENTION_ENFORCED` — `retention_period` without `compactor.retention_enabled: true` is a documented no-op
  (defaults `false`): D11's 30-day promise silently does nothing, logs grow forever, no error, no alert. Assert both
  keys.
- `QUERIED_SERIES_ARE_DEFINED` — cross-file: every recorded-metric name a dashboard panel or Grafana alert rule
  references must be a `record:` value in `rules/recording.rules.yml` (or a documented host-native S1/S1b exception).
  Two independently-green checks otherwise ship a panel querying a series nothing emits.
- `SERVICE_SET_EXACT` — the 7→8 parameter is an explicit **`Set` of service names**, never a count. A count-based
  check passes an 8-service file where `alertmanager` was substituted for `mr-trace-relay`. Additionally cross-check
  each service's `image:` against the pinned digest table — a service *named* `prometheus` running
  `otel/opentelemetry-collector` passes a name-only check while shipping an OBS-37-banned tool.
- `CADDY_DUAL_POSTURE` — assert **numeric ceilings and route-matcher scoping**, not directive presence.
  `rate_limit { events 999999999 window 1s }` is structurally compliant and functionally unlimited; directives sitting
  in a dead block due to a matcher typo leave the real OTLP path bare.

**C. Alert rules must watch the pipeline, not just the process (red-team H6).** OBS-39's `up{job="alloy"}==0` only
proves Alloy's HTTP server is alive. Alloy is one process running independent internal components: if the file-tail
stalls (bind-mount permission drift, a rotation edge case) or the OTLP receiver rejects everything, `up` stays `1`
while S2/S4 ingestion is fully dark — the meta-monitoring rationale that justified D3's "who watches Alloy" fails
exactly when needed. Ship OBS-39's rule as specified **plus** a companion rule on a sustained-zero Alloy-internal
pipeline metric (bytes read by `loki.source.file`, spans accepted by the receiver).

**D. Tier-2 gains Loki + Tempo config validation (red-team H2).** `promtool` and `alloy fmt` alone leave the two
strictest, most version-sensitive schemas unvalidated until a manual `docker compose up`. Add `loki -verify-config`
and Tempo's config check, both via the pinned images.

**E. Honest limitations to state in the PR, not paper over.**
- `mem_limit`/`cpus` in this slice are **placeholders**: §5 sequences m20b-1 **parallel** to m20d, so no real
  footprint figure exists yet. The spec's "not guessed at spec time" language cannot be honored here; say so and
  carry re-sizing as a post-integration task (red-team M3).
- The Tempo↔Loki `connection_id` Correlations config ships in this slice per D17 but is **end-to-end unverifiable
  until m20b-2 + m20c** put real spans in Tempo. It is inert declarative config, not a broken gate — but the Tier-3
  live smoke for the pivot is out of reach at this merge point (red-team M1).
- OQ1's answer is a **build-time snapshot**, not an enforced invariant: if the operator later runs
  `spacetime start --listen-addr 0.0.0.0:3000`, `/v1/metrics` leaks with no warning from this stack. Document the
  drift risk explicitly in the runbook (red-team H3).
- Secrets: `check-secrets.mjs`'s pattern requires **quotes**, so `export RESTIC_PASSWORD=hunter2value` evades it
  entirely, and there is no AWS secret-*value* pattern. The runbook must use only placeholder tokens
  (`<RESTIC_PASSWORD>`), never real-shaped strings — the first backstop otherwise is remote-only gitleaks (red-team
  H4). `scripts/check-secrets.mjs` is **outside `touches:`** — do not "fix" it here; flag as a follow-up.

**F. Semgrep pre-hardening (red-team CI predictions).** This slice creates the repo's first Dockerfile + compose, so
`--config auto` newly loads both rulesets. Pre-harden: digest-pinned bases, non-root numeric `USER`, `HEALTHCHECK`,
a **version-pinned** `xcaddy --with github.com/mholt/caddy-ratelimit@<ver>` (an unpinned module ref is itself a
finding), `cap_drop: [ALL]`, `read_only: true` + `tmpfs` where feasible, `security_opt: [no-new-privileges:true]`,
no `privileged`. Run `semgrep` **and** gitleaks locally before opening the PR — both are remote-only in `just ci`.

### Vacuous-green hardening folded into the tester's brief

`NO_ALERTING_BLOCK` (resolve the real `rule_files:` glob, never a filename convention) · `RULES_ARE_RECORD_ONLY`
(≥1 non-empty `record:` per required group; zero-rule groups must FAIL) · `MODULE_LOGS_MOUNT_RO` (**positively**
assert `:ro`/`read_only: true`; long-form compose syntax contains neither `:ro` nor `:rw`, so a reject-`:rw` check
passes a writable mount by omission) · `NO_EXEC_LOG_SOURCE` (also forbid `command:`/`entrypoint:` overrides on the
Alloy service — a shell pipeline there achieves the banned outcome outside `config.alloy`) ·
`STAGE_METRICS_LABELS_BOUNDED` (also assert values come from a fixed literal/enum mapping, not a raw regex capture —
a correctly-*named* `evt` label echoing free-form log content still blows up cardinality) ·
`ALERT_RULE_HAS_A_RECEIVER` (require ≥1 non-placeholder recipient; a contact point with `addresses: []` "exists" and
notifies nobody) · `DASHBOARD_PANELS_REAL` (a right-named metric in a neutered `expr` — `metric * 0`, an always-false
filter — passes any static check; **name this as an explicit Tier-1 limitation**, closable only live) ·
`RUNBOOK_HAS_RUNNABLE_STEPS` (strip comments first — `# restic backup …` contains the substring; require the literal
inside a fenced block, not in prose).

## 6. Lens plan

`reviewer` + `red-team` on the plan (parallel) → `tester` writes RED predicates+teeth → orchestrator proves RED →
`specialist` implements → `just ci` + semgrep → parallel close-out batch (`reviewer` + `red-team` + `/simplify` +
`verifier`) → `doc-keeper`.

**Domain auditors deliberately skipped, with justification:** `reducer-security-auditor` and `desync-guard` audit
SpacetimeDB reducers and client/server determinism respectively. This slice touches **zero** Rust, zero TS game code,
zero reducers, zero schema — their surface is literally empty here. Per the "add lenses that find *different* bugs,
never redundant agents" rule, that budget goes instead to an adversarial pass on the two things that *can* be wrong
here: the Caddy exposure posture and the predicate library's teeth.
