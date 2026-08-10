# m20e — M20 evals tail: build plan (DRAFT — planner output, pre-adjudication)

**Slice:** m20e · **Branch:** `feat/m20e-evals-tail` · **Worktree:** `.claude/worktrees/m20e` · **Base:** `origin/master` 323cee1
**Spec:** `specs/monster-realm-v2/M20-observability-performance.spec.md` §5 m20e row (:681) · **ADR:** 0180 (Accepted — body-only amendment, no new number) · **Tier:** HARD · **Budget:** $150

**Context (orchestrator preamble):** mr-trace-relay does NOT exist on master — m20b (PR#302) shipped only the 7-container stack and parked the relay as "m20b-2" (handoff m20b entry; ADR-0180 "Slice-scope deviation, declared" ~:918-935: relay-then = dead code, OBS-41 unowned). m20e's brief assumes the relay exists; its integration files (docker-compose.yml, prometheus.yml, grafana alerting rules) are OUTSIDE m20e's declared touches. Orchestrator triage: right-size — build everything inside declared touches (incl. relay pure core + G8, since `ops/observability/relay/**` is declared and G8 is impossible without the reconstruction rules), park the integration + its eval assertions as m20e-2 for supervisor re-serialization. Planner adopted with one cut (OBS-46 parked as a unit; batch CLI, no daemon).

---

## 0. Right-sizing — planner amendment to the orchestrator's proposal (smaller, cleaner seam)

Adopted orchestrator ruling, with one cut: **park all of OBS-46 as a unit, not two-thirds of it.** OBS-46 (spec:539-547) is three inseparable halves — `/health` endpoint, `job="mr-trace-relay"` scrape target, distinct dead-man's-switch alert rule. Two of three are already outside touches. A `/health` server nothing scrapes, in a process nothing runs, is precisely the dead code ADR-0180:918-935 declined to ship — on unchanged facts. Same reasoning cuts the tail-follow daemon: what m20e needs for OBS-44 falsifiability is one live smoke via a **batch** shell, not a daemon.

**Ships (all inside declared touches):**

| Ships | Why it is not dead code |
|---|---|
| Relay **functional core** — parse → pair → OTLP encode (pure) | Subject of G8 (spec:663, ADR-0180:792); executable specification of OBS-42/43/44 |
| Committed **`$trace_pair_set`** config, membership **∅** | Subject of G9's exact-set-equality half (spec:652-655, OBS-50 :560-564) |
| **`mr-trace-relay.mjs`** — main-guard batch CLI only (`--logs-dir`, `--trace-pair-set`, `--out`), no network, no daemon, no `/health` | ~40 lines; makes the OBS-44 live smoke a real POST to Alloy → Tempo query (evidence, not a claim) |
| Cross-language **golden fixture** + Rust mirror | Kills D6-envelope drift (the m20a↔ops contract risk the ADR names twice) |
| Stack-config eval, G5 third assertion, G11 | Spec-mandated m20e scope |

**Parked as m20e-2** (§9): compose service, scrape job, alert rule, `/health`, tail-follow + OTLP POST client, and the 4 eval assertions needing them. **Park tripwire (G9g)** keeps the park honest: eval asserts 7 services exactly / no relay scrape job / no relay alert rule — the moment m20e-2 lands any, the eval reds naming P1–P4.

**$trace_pair_set stays ∅; A10 stays** (`evals/observability-log-wrapper.eval.mjs:1589-1605`) + Rust twin `g7_trace_pair_set_stays_empty` (`observability_tests.rs:939-959`); OBS-41's WHEN-clause vacuously satisfied over ∅; G9's set-equality supersedes both at first membership; supersession tripwire (G9h) fires the day a paired call site appears.

---

## 1. Phase/task breakdown (vertical, test-first)

tester writes RED from EARS → orchestrator proves RED → specialist implements → orchestrator proves GREEN + mutation bite-proofs.

### Phase 0 — spikes (orchestrator, no code)
- **S1 (blocks T7):** exact Alloy-exposed metric name for `config.alloy:83-91`'s `stage.metrics` counter (`prefix="mr_"`, `name="log_events_total"`). Do NOT assume `mr_log_events_total`. Discover live via `curl 127.0.0.1:12345/metrics`; pin as constant; record in ADR amendment.
- **S2:** confirm Alloy OTLP HTTP receiver (`config.alloy:106-119`, 127.0.0.1:4318) accepts server-side JSON POST to `/v1/traces` without Origin header.
- **S3:** measure `node --test` wall time over checks suites (2048 lines) + stub relay test; gates G9k decision (budget ≤3s added to `just ci`).
- **S4:** capture one real `module_logs` line (level spelling, `ts` unit, `function` value) to seed golden fixture; `config.alloy:31-40` documents shape — confirm, don't copy blind.

### T1 — relay parser (pure)
Files: `ops/observability/relay/parse.mjs` + `.test.mjs`, `fixtures/breadcrumb-golden.json`
- D6 envelope (ADR-0180:942; observability.rs:49-69): `parseHostLine` returns outer fields + inner module payload parsed from `message`; `{ok:false,reason}` (never throw, never partial) for non-JSON / non-object / non-object-message.
- OBS-43: `ts` carried as unmodified digit STRING, never JS Number.
- G8 non-vacuity: golden fixture case count ≥ committed floor; every case id consumed.
- Teeth: prose message → parsed with evt:null (not error); duplicate `"evt"` key (last-key-wins forgery, AM6 threat) → rejected; ts 1782197246180474 round-trips byte-identical.

### T2 — pairing (pure) + G8 seeded-ambiguity fixture
Files: `ops/observability/relay/pair.mjs` + `.test.mjs`
- OBS-43: pair/order by `ts`, not input order. Tooth: reverse-arrival shuffle → byte-identical result.
- OBS-42: `durationMicros` ONLY from matched enter/exit; NO span (not even zero-duration) for unpaired; `unpaired[]` diagnostic.
- G8: two interleaved zone-tick chains, distinct `cause` keys (`enter(A)@t1, enter(B)@t2, exit(A)@t3, exit(B)@t4`) → exactly two spans A:(t1,t3), B:(t2,t4), no cross-pollination.
- **G8 proof-of-teeth: deliberately-broken LIFO/stack pairer inline; same fixture through it must produce wrong pairing** — the fixture discriminates.
- More teeth: exit with no open enter for exact `(reducer,key)` → unpaired, never cross-matched; two enters + two exits same key → FIFO by ts; crumb with no correlation key → skippedNoKey, counted, never guessed.

### T3 — OTLP encoder (pure)
Files: `otlp.mjs` + `.test.mjs`, `reconstruct.mjs` + `.test.mjs`
- OBS-44: traceId exactly 32 / spanId exactly 16 lowercase-hex; never base64; never all-zero. Teeth: char-class over whole id; base64 mutant must fail.
- OBS-3/4 relay-side: ids = deterministic pure fn of correlation key (sha256 truncation, node:crypto) — no clock, no RNG. Tooth: two runs byte-identical.
- Precision: `microsToNanosString` exact above 2^53 (1782197246180474×1000 ≈ 1.78e18 silently loses precision as Number) — BigInt or string append. Tooth pins exact digits.
- OBS-50: `reconstruct(lines,{tracePairSet})` drops crumbs whose reducer ∉ set; ∅ → zero spans + diagnostic.
- **Declared deviation (§8): D16 parent/child nesting CUT** — flat spans grouped by trace id satisfy OBS-42/43/44 + G8; ADR:752 flags mis-parenting as falsifier risk. Cut-ladder #1, taken up-front.

### T4 — `$trace_pair_set` config + batch CLI + README
Files: `trace-pair-set.json`, `mr-trace-relay.mjs`, `README.md`
- OBS-50: committed JSON `{"schema":1,"trace_pair_set":[]}` — array key present even when empty.
- OBS-45: no module-owner credential accepted/read; logs dir opened read-only; static (G9i) + behavioral test.
- Config-path integrity: `defaultTracePairSetPath()` resolves to committed file; `--trace-pair-set` overrides for smoke only; test pins default.

### T5 — Rust mirror (observability_tests.rs, append-only block)
- D6 cross-language golden: for EVERY case in `fixtures/breadcrumb-golden.json`, `build_log_line(evt, extra, Breadcrumb{…})` == `expected_line` byte-for-byte; fail loud if fixture missing/unparseable/below committed case count.
- OBS-50 Rust half: independently scan `server-module/src/*.rs` (non-test, reuse `scan_tree()` :471) for reducers with paired phase enter/exit literals; assert set-equality vs committed config (second implementation across toolchain boundary, per file's own §"WHY A SECOND SCANNER" :9-15).
- Non-vacuity: scanner proven on inline fixture w/ synthetic paired reducer (must be DETECTED) — `∅==∅` never green-by-broken-scanner.
- Hazards (observability_tests.rs:37-47): assemble needles with `concat!` (idiom :945-946); no double-quote char literals; no slash-asterisk anywhere. `scan_tree()` + eval's `collectServerSrc` both exclude `_tests.rs` — use `concat!` anyway.
- JSON hand-parsed in Rust (strict, fail-loud) — serde_json dep is outside touches. Teeth: malformed fixture fails BOTH sides.

### T6 — evals/observability-stack-config.eval.mjs (new) — see §3
### T7 — G5 third assertion in metrics-contract eval — see §4 (removes TODO(m20e) at :3-4)
### T8 — live verification + G11 — see §5/§6
### T9 — docs: ADR-0180 EOF amendment (header untouched, adr-digest zero drift), ARCHITECTURE.md one clause, knowledge zero drift, never hand-edit CHANGELOG.

Order: T1→T2→T3→T4 serial; T5/T6/T7 parallelizable after T4; T8 after T6/T7; T9 last.

---

## 2. Relay module shape

```
ops/observability/relay/
  README.md, trace-pair-set.json
  parse.mjs/.test.mjs, pair.mjs/.test.mjs, otlp.mjs/.test.mjs, reconstruct.mjs/.test.mjs   (pure)
  mr-trace-relay.mjs                     imperative shell — main-guard batch CLI only
  fixtures/breadcrumb-golden.json        read by BOTH observability_tests.rs and parse.test.mjs
```

Pure API: `parseHostLine(rawLine)`, `parseBreadcrumb(record)`, `correlationKey(crumb)` (cause, else sched.target_reducer+scheduled_at), `pairBreadcrumbs(crumbs)` → {spans, unpaired, counts}, `traceIdFor(key)` 32-hex, `spanIdFor(key,reducer,startMicros)` 16-hex, `microsToNanosString` (BigInt-exact), `encodeTraceDocument(spans,{serviceName})`, `reconstruct(lines,{tracePairSet,serviceName})` → {document, diagnostics}. No Date.now in core; no node:child_process anywhere in relay/**.

`$trace_pair_set` config + ∅ semantics (load-bearing for G9): 4-stage fail-loud read — (1) file missing → FAIL "absence is not ∅"; (2) unparseable → FAIL verbatim; (3) schema≠1 or key absent → FAIL; (4) present array → positively-read Set. Keep `note` free of key/token/secret/password words (check-secrets + gitleaks memory).

Shell: `node mr-trace-relay.mjs --logs-dir <dir> [--trace-pair-set <p>] [--out <f>]` — reads `module_logs/*.log` read-only, reconstruct, write OTLP JSON to stdout/--out. No sockets/timers/health/tail.

---

## 3. Stack-config eval — exact assertion inventory

Imports `ops/observability/checks/stack-config-checks.mjs` (SSOT per its header :7-9). Real files from repo root. No new RegExp; spawnSync array-args only. Order: teeth first, then C-carryover, then G9, then tripwires.

**C1–C18 carryover** (predicate → enforces): C1 checkNoAlertingBlock(prometheus.yml)→OBS-18 · C2 checkRulesAreRecordOnly(resolved from `rule_files:` not filename convention)→OBS-18 · C3 checkServiceSetExact(compose, SEVEN=[prometheus,alloy,loki,tempo,grafana,node_exporter,caddy])→OBS-19/37/D3 · C4 checkServiceImagesPinned(compose, digests from compose:33,59,81,98,115,141)→OBS-33 · C5 checkModuleLogsMountReadOnly(compose)→OBS-11/45 (Alloy's) · C6 checkListenAddrsLoopback→OQ1/OBS-17 · C7 checkNoExecLogSource→OBS-11 · C8 checkStageMetricsLabelsBounded(config.alloy,['reducer','evt'])→OBS-36/D12 · C9 checkS4MetricLabelsBounded→OBS-34 · C10 checkS4AttributeValuesBounded→OBS-34 · C11 checkRemoteWriteBothEnds→OBS-38 · C12 checkCaddyDualPosture→OBS-20/21/D5 · C13 checkAlertRuleHasReceiver(rules,contact-points,notification-policies)→OBS-39/D4 · C14 checkDashboardPanelsReal→OBS-22..26 · C15 checkQueriedSeriesAreDefined (read exact signature :938 at build time) · C16 checkRetentionConfigured→D11 · C17 checkNoQuotedCredential(all ops/observability/** texts) · C18 checkRunbookHasRunnableSteps(docs/observability-dr-runbook.md)→OBS-30/31/32/40.

**G9 inline (m20e's own):**
- G9a: datasources.yml Tempo entry has `tracesToLogsV2` with `datasourceUid: mr-loki` AND query naming `connection_id` — key-path scoped, not file-wide substring (present :65-72) → D17(1)/G9.
- G9b: BOTH correlation directions: Loki→mr-tempo (:43-53) and Tempo→mr-loki (:80-89), each `field: connection_id`; assert two, not ≥1 → D17(2)/G9.
- G9c: `connection_id` never a Loki/Prom label: absent from stage.labels values + every `by (...)` in recording.rules.yml → OBS-35/D12.
- G9d: $trace_pair_set 4-stage fail-loud read → OBS-50.
- G9e: banned membership: configSet ∩ BANNED = ∅; BANNED = {movement_tick} ∪ PARSED $slo_set (from `reducer=~"…"` matcher recording.rules.yml:29,32 — parsed never re-spelled) ∪ 7 criterion bench ids; fail loud if matcher parse yields <1 name → OBS-50.
- G9f: EXACT set equality configSet === pairedReducers(server-module/src/*.rs), both directions reported separately → OBS-50 SSOT extension spec:652-655.
- G9g: PARK TRIPWIRE: pass iff (7 services exactly) ∧ (no mr-trace-relay job in prometheus.yml) ∧ (no relay rule in alerting rules); any change → FAIL "the m20e-2 park has ended — enable parked assertions P1–P4".
- G9h: SUPERSESSION TRIPWIRE: pairedReducers non-empty → FAIL naming supersession sites (observability-log-wrapper.eval.mjs:1589, observability_tests.rs:944) + "G11 must run before membership merges" (OBS-51).
- G9i: relay credential-freeness: no token/authorization/password/--auth surface in relay/*.mjs; no write-mode fs call targeting logs dir → OBS-45 static.
- G9j: relay hygiene: no `new RegExp(` in relay/**; no `Date.now(` in the 4 pure files; no node:child_process in relay/**.
- G9k: `spawnSync('node',['--test',…relayTests,…checksTests])` — activates G8 + m20b predicates. Guards: explicit file list (no glob); parse runner summary requiring fail===0 AND pass ≥ committed floor; exit code too; timeout set; S3 wall time in header. Precedent: adr-digest.eval.mjs:38, knowledge-bundle-conformance.eval.mjs:104. Rationale: `just test` is cargo-only (justfile:24-26); NOTHING runs the checks suites (ops README :172-174) or would run relay tests; justfile outside touches → the eval is the only door; copying teeth banned by checks header.

**PARKED (verbatim header comment):** P1 checkServiceSetExact(compose,[...SEVEN,'mr-trace-relay']) (spec:650) · P2 checkModuleLogsMountReadOnly for the RELAY's own mount, ro not rw (OBS-45; spec:650-651) · P3 prometheus.yml `job_name: mr-trace-relay` → /health (OBS-46; spec:655-656) · P4 grafana alerting dead-man's-switch on up{job="mr-trace-relay"}==0, distinct from AlloyDown, routed (OBS-46; spec:656-657). G9g reds the moment any becomes landable.

**Teeth (inline fixtures, run FIRST):** T-a 8-service compose → FAIL C3 (proves G9g detector) · T-b `["movement_tick"]` → FAIL G9e · T-c synthetic source w/ paired reducer → DETECTED + FAIL G9f vs ∅ (**the tooth that makes ∅==∅ honest — most important in the slice**) · T-d absent/blank/{}/{"schema":1} → 4 distinct G9d failures · T-e tracesToLogsV2 w/o connection_id; only one correlation direction → FAIL G9a/G9b · T-f unparseable reducer=~ matcher → FAIL LOUD G9e · T-g non-vacuity floor: <N files read → FAIL.

---

## 4. G5 third assertion (OBS-12/OBS-13)

Pure half (always in CI): predicate `logDerivedCounter(promText, nameNeedle, labels)` reusing collectMetricNames/labelKeysIn walkers (:110-207). Teeth in existing TEETH array (:435): value 0 → FAIL; family absent → DISTINCT loud failure; needle only in # HELP → not counted; right name wrong labels → no match; good fixture value 3 → pass.

Live half: gated `MR_OBS_LIVE=1` AND new `MR_OBS_STACK=1` (Alloy ≠ SpacetimeDB precondition). DELTA protocol, never bare >0 (non-zero-by-accident from real traffic): (1) read V0 from `127.0.0.1:12345/metrics`; (2) append N=5 synthetic host-envelope lines to `<MR_SPACETIME_DATA_DIR>/replicas/<scratch>/module_logs/mr-m20e-<runid>.log` (shape from config.alloy:31-40 + S4 spike; message = `{"evt":"heartbeat","content_version":N}`); (3) poll ≤20s for V ≥ V0+N; timeout → FAIL with V0/V/elapsed/path.

Third leg vs silent aging (mirrors B4 pin tripwire): static always-run assertion that config.alloy still declares `name = "log_events_total"` + `prefix = "mr_"` (:83-91).

WSL hazards: dir-bind not file-bind (compose:70) OK, but `mkdir -p` the replicas tree BEFORE compose up (root-owned auto-create); run-id-unique fixture filename (Alloy positions file may skip same-name smaller file); .gitignore:79 `*.log` — fixture generated outside repo, never committed; must match Alloy glob `/data/replicas/*/module_logs/*.log` (config.alloy:21). Skip wording per existing idiom (:669-677): pass:true "skipped: … by design" + tripwire, never silent.

---

## 5. G11 protocol (OBS-51)

**Null A/B, said out loud.** With ∅ there is no toggle — both runs are the same binary against the same module; the comparison measures run-to-run variance = **the noise floor** the first-membership slice's real A/B is judged against. Labeling: NOT -pairing-on/-pairing-off (would misread later as a measured cost) — use **`-pairing-off-a` / `-pairing-off-b`** (AM18 convention-shaped, honest).

Invocations (flags verified mr_load_driver.rs:349-362):
```
cargo run -p sim-harness --bin mr_load_driver --release -- \
  --server http://127.0.0.1:3000 --db mr-m20e-g11 \
  --clients-start 50 --clients-step 1 --clients-max 50 \
  --hold-scrapes 8 --scrape-interval-ms 1000 \
  --move-rate 100 --seed 20260809 \
  --run-id mr-m20e-g11-pairing-off-a --report /tmp/mr-m20e-g11-a.json
```
…identical with `-pairing-off-b` / `-b.json`. Fixed concurrency (start==max) per m20d handoff item 4; --move-rate 100 max pressure; `not_reached` on both sides is a valid documented outcome (OBS-27 already recorded by m20d). Recorded: per-level p95 + p95_bucket_width_s + queue gauges + verdict from both schema:1 reports; A−B delta = noise floor → PR body + ADR amendment + handoff standing rule (first membership re-runs this exact invocation with a real toggle vs this floor). Watch m20d C3 residual notes (clients_short/send_errors).

---

## 6. Live-verification runbook (ordered)

0. export PATH (node v18 default / cargo absent — harness memory).
1. `mkdir -p "$MR_SPACETIME_DATA_DIR/replicas/mr-m20e/module_logs"` BEFORE compose up.
2. `cd ops/observability && cp .env.example .env`; fill GF_SECURITY_ADMIN_PASSWORD, MR_ALERT_WEBHOOK_URL, MR_GRAFANA_BASIC_AUTH_HASH, MR_SPACETIME_DATA_DIR, MR_OTLP_ALLOWED_ORIGIN (compose fails loud on `:?` vars :132,136,180). .env gitignored, never commit.
3. spacetime start loopback:3000 on that data dir; publish scratch `mr-m20e-g11` (orchestrator publishes; eval never does — metrics-contract:40-46).
4. `docker compose up -d`; verify `curl 127.0.0.1:12345/metrics | head` + Prometheus targets up.
5. `MR_OBS_LIVE=1 MR_OBS_STACK=1 MR_OBS_DB=mr-m20e-g11 node evals/observability-metrics-contract.eval.mjs` → B1–B5 + G5 evidence of record.
6. `node evals/observability-stack-config.eval.mjs`; `node evals/run.mjs`; full `just ci`.
7. Relay live smoke (OBS-44 evidence): synthetic paired-breadcrumb log + scratch pair-set in /tmp → batch CLI → curl POST document to Alloy OTLP /v1/traces → query Tempo /api/traces/<traceid>, confirm span + lowercase-hex id. Build endpoint URLs from parts in committed files (R1 Semgrep).
8. G11 runs (§5).
9. Teardown: compose down, stop host, drop scratch db.

Hazards: gitleaks scans 0 commits in worktree (vacuous) + remote-only — remote is the real gate; squash-onto-fresh-branch if red (force-push hook-blocked). Semgrep remote-only: run `~/.local/bin/semgrep --config auto` locally over every new .mjs pre-PR.

---

## 7. Named anti-patterns

1 green-by-absence ($trace_pair_set missing read as ∅ — closed G9d) · 2 vacuous set-equality (broken scanner — closed T-c) · 3 fixture that cannot fail (G8 needs inline broken-LIFO pairer) · 4 relay tests re-implementing the parser (literal golden values only, never expected=parse(line)) · 5 A10/G7/G9 triple-maintenance drift (each names other two path:line; G9h) · 6 skip-shaped permanent green in G5 (closed 3 ways mirroring :30-38) · 7 non-zero-by-accident (delta-around-injection only) · 8 timestamp precision laundering (Number multiply above 2^53) · 9 synthesized durations incl. "emit as 0" disguise · 10 credential surface on relay (--token flag / env read) · 11 park laundering (vague TBD instead of P1–P4 verbatim + G9g) · 12 G11 massaging (null A/B presented as measured pairing cost) · 13 alert-on-nonexistent-target (do NOT helpfully add relay scrape/rule — parked AND out of touches) · 14 mechanical bans: new RegExp anywhere; shell-string spawns; committed *.log fixtures; Date.now in relay core; editing evals/run.mjs; touching ADR-0180 header; hand-editing CHANGELOG.

---

## 8. ADR-0180 body-only m20e amendment — outline

(1) right-sizing as built: relay pure core + ∅ config in-slice; ALL of OBS-46 parked as a unit; m20e-2 file list; G9g park tripwire as the mechanism ending the park. (2) OBS-41 disposition: still unowned (:927-934 stands); ∅ membership; vacuous satisfaction via WHEN-clause; G9 set-equality = SSOT gate; A10 + g7 stay until first membership. (3) relay wire contract as built: envelope parse, correlation-key rule, deterministic sha256-truncated ids, µs→ns BigInt, unpaired-dropped-and-counted, ∅ ⇒ zero spans. (4) declared deviation: flat spans, no D16 nesting (+falsifier: re-open when mis-parenting costs a real debugging session). (5) G5 discovered counter name (S1) + delta protocol + WSL constraints. (6) G11 null-A/B: exact invocations, verdicts, noise floor, why null, standing rule for first membership. (7) connection_id gap: D17 pivot keys on span.connection_id (datasources.yml:53,72,89); no call site emits it; forward obligation on first-membership slice. (8) checks-suite activation: 2048 lines CI-dark until this eval; justfile outside touches is why the eval is the door.

---

## 9. Park / handoff list for supervisor

m20e-2: (a) compose +1 mr-trace-relay service w/ :ro module_logs mount; checkServiceSetExact 7→8 · (b) prometheus.yml +1 job mr-trace-relay → /health · (c) grafana alerting +1 dead-man's-switch up{job="mr-trace-relay"}, distinct from AlloyDown · (d) relay imperative shell: /health server, tail-follow loop, OTLP POST client · (e) eval assertions P1–P4 (G9g reds if (a)/(b)/(c) land without them).

Beyond m20e-2: (f) A10/G7 supersession at first membership (observability-log-wrapper.eval.mjs:1589-1605, observability_tests.rs:939-959) · (g) OBS-41 ownership — blocking prerequisite for any membership (ADR-0180:927-934) · (h) m20c recording-rules contract (ADR-0180:966-968,995) → ops/observability/rules/** outside touches · (i) m20c `?? 0` mutation survivor in client/src/main.ts (tooth candidate) · (j) AM6 reserved-key debug_assert → runtime guard/static scan BEFORE second mr_log call site i.e. before first membership (ADR-0180:948) · (k) m20c residual: file-wide string-aware stripper port in main.wiring.test.ts · (l) resource-cap re-sizing from m20d figures (compose:22-24 placeholders) · (m) MR_OTLP_ALLOWED_ORIGIN default mismatch (ADR-0180:986-988) · (n) evolution_tests.rs scheduled_scan_sources() misses observability.rs (m20a residual).

---

## 10. Risks + cut ladder

R1 Semgrep reds on relay URL literals (HIGH — killed m20c attempt 1; build URLs from parts, local semgrep pre-PR) · R2 node --test slow/flaky (S3 measures; guards; cut-ladder #2) · R3 Alloy counter name guessed wrong (S1 pins; static tripwire) · R4 WSL docker root-owned dirs / positions-file skip (pre-mkdir; unique filename) · R5 G11 not_reached both sides (EXPECTED; deliverable = noise floor) · R6 park becomes permanent (G9g + §9) · R7 relay core blows budget (cut ladder) · R8 2^53 precision bug (dedicated tooth) · R9 Rust hand-parser diverges from JSON.parse (same file; malformed fixture fails BOTH) · R10 Rust mirror trips crate-wide scan (concat! idiom; full eval suite after T5) · R11 gitleaks vacuous in worktree (remote is real gate).

Cut ladder (each leaves mergeable tree): 1 D16 nesting (already cut) · 2 G9k checks-suite half (keep relay-tests half — G8 has no other CI home) · 3 batch CLI shell (OBS-44 live smoke degrades to encoder teeth; say so in ADR) · 4 G5 third assertion (last resort; TODO re-pointed m20e-2, spec-bullet miss recorded). NEVER cut: G8 fixture + broken-pairer proof; G9d/e/f + T-c; ∅ config; G9g/G9h; G11.

Workflow: solo orchestrator + tester(opus) + specialist; lenses: reviewer + red-team on eval/teeth surface (T2/T5/T6), /simplify on relay core; desync-guard + reducer-security-auditor skipped (empty surface — no game rule, no reducer change).
