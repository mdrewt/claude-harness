# 13r-b — mr-trace-relay integration (OBS-45/OBS-46) — BUILD PLAN

**Status:** PARKED at the planning boundary on a confirmed hidden dependency (see §0).
Plan is complete and reviewed-ready; resume implements it verbatim once the scope call is made.

Slice branch: none created (no project-repo commits — see §10). Fork point: `origin/master@1d68c33`.
ADR number reserved by the supervisor: **0191** (`docs/adr/0191-mr-trace-relay-integration.md`, `Amends: ADR-0180`).

---

## 0. THE BLOCKER (confirmed empirically, not inferred)

Landing the 8th compose service **requires** editing
`ops/observability/checks/stack-config-checks.test.mjs` — a file **outside** 13r-b's declared
`touches:` set, and not an always-in-scope companion (it is the sibling of
`checks/stack-config-checks.mjs`, which is not a declared code file).

**Empirical proof (run in the worktree, then reverted; tree left byte-clean):** a stub
`mr-trace-relay` service was added to `docker-compose.yml` and the checks suite run under
node 24.13.1. **Exactly one** test failed:

```
✖ REAL FILES: checkServiceSetExact passes against ops/observability/docker-compose.yml (exact 7)
  OBS-19/OBS-37: service set mismatch — unexpected [mr-trace-relay], missing []
  at checks/stack-config-checks.test.mjs:1629
```

`EXPECTED_SERVICE_NAMES` is hardcoded to the 7 names at `checks/stack-config-checks.test.mjs:57-65`.
The needed edit is **2 lines**: add `'mr-trace-relay'` to that constant, and change `(exact 7)` →
`(exact 8)` in the title at `:1629`.

**No in-scope escape route exists.** Verified:
- `evals/observability-stack-config.eval.mjs:229` **explicitly spawns** that suite (G9k), and the
  eval's own header (`:220-227`) calls the explicit list deliberate — a glob was rejected. The eval
  is the *only* door that suite has, and it is inside `just ci`.
- Writing the assertion in the eval instead does **not** stop the out-of-scope test from reddening.
- `parseComposeServices` fails closed on quoted/flow keys **by design**; hiding the service from the
  parser is precisely the bypass `checks/stack-config-checks.redteam.test.mjs` exists to catch. Not
  an option, ever.

**Everything else the planner checked came back CLEAR** (no edit needed, verified by reading the
predicate bodies and by the probe — the probe's stub passed all of them):
- `checkServiceSetExact` (`stack-config-checks.mjs:334`) is fully parameterised on the name set →
  7→8 is one constant **in the eval**. Handoff claim confirmed.
- `checkServiceImagesPinned` (`:380-388`) iterates only the 6 named services then requires every
  `image:` to carry `@sha256:` → a digest-pinned relay image passes without touching `PINNED_IMAGES`.
- `checks/stack-config-checks.redteam.test.mjs` — its `EXPECTED_SERVICE_NAMES` (`:29`) is used only
  against synthetic fixtures; its REAL-FILES assertions touch only `config.alloy` + `.env.example`.
- `checkModuleLogsMountReadOnly` (`:395-443`) — **AM18 is HALF true**, see §3/P2 below.

**Resolution required from the supervisor (one of):**
- (A) extend `touches:` by `ops/observability/checks/stack-config-checks.test.mjs`, edits restricted
  to those 2 lines — *recommended*, after confirming no concurrent sibling owns `checks/**`; or
- (B) re-park 13r-b and fold the relay integration into a slice that already owns `checks/**`.

---

## 1. Right-sizing verdict: OBS-45 + OBS-46 are ATOMIC

Both naive splits are illegal, and this is load-bearing — do not "helpfully" re-split at resume:
- **config without service** pins `up=0` forever and trains the operator to ignore a dead-man's
  switch (the objection written verbatim into `docker-compose.yml:26-29`, `prometheus.yml:43-45`,
  `rules.yml:11-13`).
- **service without config** is the dead code ADR-0180 already rejected — `docs/adr/0180-*.md:1020`
  says verbatim that "a `/health` server nothing scrapes is the dead code the m20b park declined to
  ship", and parks **all of OBS-46 as a unit**.

**Corollary that justified the park rather than a partial land:** shipping *any* piece of this slice
alone (even the pure `tail.mjs`) creates a module nothing uses — dead code that YAGNI and ADR-0180's
own recorded objection reject, and that `/simplify` would rightly flag. The slice is atomic by
design; a clean park beats a partial land.

**The one genuinely separable leg — park boundary for a follow-up (13r-c-obs):** the **OTLP POST
client**. In 13r-b the daemon emits its OTLP/HTTP JSON document to **stdout**, the identical contract
the batch CLI already carries (`relay/mr-trace-relay.mjs:4-12`), so G9i's write-API ban and the whole
OBS-45 story stay unweakened; `docker compose logs mr-trace-relay` is the sink. Why this costs zero
observability today: `$trace_pair_set` is **∅** (`ADR-0180:1022`, `relay/README.md:27-34`), so the
reconstructed document is `{"resourceSpans":[]}` *regardless of sink*. Land it only if budget allows
(Task 10); otherwise write the P5 park block in the G9g idiom (Task 11) — **verbatim, never a TBD**.

---

## 2. Architecture decisions (all → ADR-0191)

- **D1 — file layout** (reconciled with G9j's exact-set anti-smuggling gate, eval `:3343-3360`):
  two new production files, *not* one, and *not* folded into `mr-trace-relay.mjs`.
  - `relay/tail.mjs` — **pure** tail state machine: `{path, prevOffset, prevSize, prevIdentity}` +
    a fresh observation → `{readFrom, readTo, reason}`. No fs/clock/timers/sockets. Joins
    `RELAY_PURE_FILES` (eval `:212`) and keeps all 8 current hygiene bans.
  - `relay/daemon.mjs` — the imperative shell: `statSync`/`createReadStream`, the `node:http`
    `/health` server, timers, clock. Narrow explicitly-listed allowances only.
  - `RELAY_SHELL_FILE` (`:213`) → `RELAY_SHELL_FILES = ['mr-trace-relay.mjs','daemon.mjs']`;
    `RELAY_TEST_FILES` (`:215`) gains `'daemon.test.mjs'` **manually** (G9j's `allowed` set at `:3346`
    is the union — an unlisted test file fails the gate).
- **D2 — no offset checkpoint file, ever.** OBS-45's never-writes rule (G9i `WRITE_APIS`, eval
  `:1051-1066`) forbids persisting an offset. Offsets in-memory only. Startup: files present at boot
  seek to **EOF**; files first seen later read from 0. **Stated, accepted gap:** breadcrumbs emitted
  while the relay was down are never exported. A decision, not an accident.
- **D3 — read API.** `fs.openSync` is banned (`opensync` ∈ `WRITE_APIS`, eval `:1060`). Use
  `statSync` + `createReadStream(path,{start,end})` — `createreadstream` is **not** banned, only
  `createwritestream`. No change to `WRITE_APIS` is needed or permitted.
- **D4 — `/health` body. HIGHEST-SEVERITY LANDMINE.** OBS-46 says "a bare 200 is sufficient", but
  Prometheus **parses the scrape body**: a 200 carrying `ok`/`OK\n` is a parse error → `up=0` →
  the dead-man's switch pinned permanently firing, i.e. the exact failure the park warned about.
  `/health` must return **200 with an EMPTY body** + `content-type: text/plain; version=0.0.4`
  (an empty exposition document parses to zero samples → scrape success → `up=1`). Assert in a unit
  test **and** confirm via the live L2 probe.
- **D5 — image:** `node:<current-LTS>-alpine@sha256:<digest>`, **not** a second build stage —
  ADR-0180 D3 makes caddy "the ONE image built rather than pulled" (`ops/observability/Dockerfile:1-7`)
  with a differentiated CVE obligation. Consequence: the eval's `ALLOWED_IMAGE_REPOS` (`:196-203`)
  **must** gain `'mr-trace-relay': 'node'` — C4 (`:3134-3141`) requires the image-bearing service set
  to equal that map's key set exactly.
- **D6 — port `127.0.0.1:9101`** (Prometheus exporter band, adjacent to node_exporter's 9100).
  Verified unclaimed: 2019/3000/3001/3100/3200/4317/4318/5173/8443/9090/9100/12345 are taken.
- **D7 — dead-man honesty (discharged, not waived):** this slice lands the service, the target and
  the alert **in one change**, so the recorded objection is answered. Say so in the ADR.
- **D8 — declared residual (mirrors ADR-0180 "Correction 3", `:910-917`):** `up{job="mr-trace-relay"}`
  proves the HTTP server answers, **not** that the tail is advancing. A stalled tail keeps `up=1`.
  Closing it needs a real `/metrics` throughput counter + a cardinality review. **Explicitly parked
  and named** so no reader mistakes `up=1` for pipeline health.
- **D9 — the flag name is `--web.listen-address=`, `=`-joined, one compose list item.**
  `LISTEN_FLAGS` (`stack-config-checks.mjs:448-454`) is a hardcoded 5-entry literal list and
  `checkListenAddrsLoopback` (`:456-512`) **fails closed** at `:494-499` for a service matching none.
  A natural `--health-listen-addr=` would fail C6 and force an out-of-scope checks-module edit.
  This is not a trick: it is the Prometheus-ecosystem convention, and the relay *is* a scrape target.
  Record the alternative (teach `LISTEN_FLAGS` a 6th entry in a follow-up) in the ADR.
  **Consequence:** `parseCliArgs` (`relay/mr-trace-relay.mjs:34-54`) handles only space-separated
  pairs — the daemon's parser must accept `--flag=value`.

---

## 3. File-by-file change list

### In the declared touch set
- **`relay/tail.mjs`** (new, pure) — growth (`size > offset` → read `[offset,size)`), truncation
  (`size < offset` → restart at 0), rotation (identity change at same path → restart at 0),
  no-change, first-sight parameterised by `startAtEnd`.
- **`relay/daemon.mjs`** (new, shell) — `=`/space-tolerant arg parser; required `--logs-dir`,
  `--web.listen-address`, `--trace-pair-set`; poll loop over discovery + `tail.mjs` decisions +
  `createReadStream`; line buffering across chunk boundaries; `reconstruct()` from the **untouched**
  pure core; sink = stdout; injected `{now,setTimer}` seam with production defaults.
  **Must contain no `://` substring and no `0.0.0.0` literal.**
- **`relay/tail.test.mjs`**, **`relay/daemon.test.mjs`** (new) — see §4.
- **`relay/README.md`** — replace the "Parked to m20e-2" section (`:65-79`) + batch-smoke note (`:80`);
  document the daemon invocation, the stdout sink, D2's EOF-start gap, and the 13r-c park if Task 10
  is dropped.
- **`docker-compose.yml`** — replace the park comment `:26-29`; add the 8th service mirroring the
  prometheus/node_exporter hardening shape (`:32-56`, `:169-185`): `image` (D5), `network_mode: host`,
  `restart: unless-stopped`, `user: "65534:65534"`, `read_only: true`,
  `security_opt: [no-new-privileges:true]`, `cap_drop: [ALL]`, `mem_limit: 256m`, `cpus: 0.5`;
  volumes `./relay:/opt/relay:ro` + `${MR_SPACETIME_DATA_DIR:-/var/lib/spacetime}/replicas:/data/replicas:ro`
  (**byte-identical mount shape to `:91`**); `command:` with `--web.listen-address=127.0.0.1:9101`.
  **No `ports:` key** (`checkListenAddrsLoopback:464-472` fails on a `ports:` line *anywhere* in the
  file). **No `entrypoint:`.**
- **`prometheus.yml`** — replace `:43-45` with the real job: `job_name: mr-trace-relay`,
  `metrics_path: /health`, `targets: ['127.0.0.1:9101']`.
- **`grafana/provisioning/alerting/rules.yml`** — replace the park comment `:11-13`; add
  `uid: mr-trace-relay-down` / `title: TraceRelayDown` into the existing `meta-monitoring` group,
  mirroring `mr-alloy-down` (`:40-69`) on `expr: up{job="mr-trace-relay"}`, `for: 60s`.
  **60s is forced twice over:** it equals OBS-39's threshold, and G12b requires every `for:` to be an
  exact multiple of its own group's 20s `interval:` (`:26`).
- **`evals/observability-stack-config.eval.mjs`** — the big one, §5.
- **`docs/adr/0180-observability-stack-selection.md`** — correct the stale `m20b-2` at `:923`;
  annotate `:1020`/`:1032`'s forward obligations as discharged by ADR-0191.

### Requires the §0 scope extension
- **`checks/stack-config-checks.test.mjs`** — `EXPECTED_SERVICE_NAMES` (`:57-65`) gains
  `'mr-trace-relay'`; title at `:1629` → `(exact 8)`. **Two lines. Nothing else.**

### Always-in-scope companions
- **`docs/adr/0191-mr-trace-relay-integration.md`** (new, `Amends: ADR-0180`) — D1–D9, the D4
  empty-body rationale, D7's discharge statement, D8's declared residual, live evidence of record
  (m20e precedent, `ADR-0180:1026-1032`), and the 13r-c park if Task 10 is dropped.
- **`ARCHITECTURE.md`** — one `13r-b` paragraph after `:1387`; correct the `m20b-2` labels at
  `:1382`/`:1387`.
- **`docs/knowledge/**`** — regen only if a bundle covers `ops/observability/**`, and **after** the
  code commit (OKF ordering memory). **`CHANGELOG.md` — cliff-generated, do NOT hand-edit.**

### OUT of scope but now doc-false — flag, do not edit
`ops/observability/README.md:18-26` (port table, will be missing the 8th service), `:30`, `:153`,
`:167`; `tempo/tempo-config.yml:5`; `grafana/provisioning/datasources/datasources.yml:16`.
Either request a second scope extension, or record a named forward obligation in ADR-0191 exactly as
`ADR-0180:1020` did. **Do not leave them silently false.**

---

## 4. Test list (mapped to EARS criteria + P1–P4)

### `tail.test.mjs` (pure) → OBS-45
U1 first sight `startAtEnd=true` → reads nothing, offset := size · U2 first sight `startAtEnd=false`
→ reads `[0,size)` · U3 append → reads exactly `[prevOffset,size)`, offsets monotonic · U4
**truncation** (`size < prevOffset`) → restart at 0, reason `truncated`, no stale-offset re-emit ·
U5 **rotation** (same path, changed identity, size ≥ prevOffset) → restart at 0, reason `rotated`;
negative control: identical identity + size → `noChange`, reads nothing · U6 structural: no clock,
fs or timer reachable from any path.

### `daemon.test.mjs` (boundary, injected transports) → OBS-45 + OBS-46
U7 `/health` → **200, EMPTY body**, `content-type: text/plain; version=0.0.4` (**D4**) ·
U8 other path → 404; non-GET/HEAD → 405 (surface is exactly one endpoint) ·
U9 `--web.listen-address` **absent → loud exit 1, never a default**; `=`-joined and space-separated
forms parse identically · U10 `--token`/`--auth`/`--password`/`--api-key` each → exit 1 "unknown
argument" (**OBS-45's "SHALL NOT accept" proven at runtime, not just by static scan**) ·
U11 `--logs-dir` absent → exit 1, no default logs dir in code · U12 line buffering: a chunk boundary
splitting a JSON line mid-token neither corrupts nor drops it; a final line without a trailing
newline is held, not half-emitted · U13 poll loop over **injected fs + injected clock**: N polls → N
rounds, zero real sleeping, assertions on the injected clock, **never `Date.now()`** ·
U14 *(Task 10 only)* OTLP retry/backoff over an injected transport: 500 → retry with the pinned
backoff; 4xx → no retry; bounded, never blocks the poll loop; **no Authorization/x-api-key header
ever set** (assert the outgoing header key set exactly) · U15 the daemon never calls a write API on
any path — a fake fs whose write methods throw, driven through a full cycle incl. truncation +
rotation.

### Static gates in the eval
| Gate | Assertion | Maps to |
|---|---|---|
| **C3** (retargeted) | `checkServiceSetExact(compose, EIGHT_SERVICES)` | **P1**, OBS-46 |
| **C4** | `ALLOWED_IMAGE_REPOS` gains `mr-trace-relay: 'node'`; digest pin enforced | D5 |
| **C5** | `checkModuleLogsMountReadOnly` now counts 2 mounts, both `:ro` | **P2** (corroboration) |
| **G9n** (new) | the relay's **service block** declares ≥1 `replicas`-sourced mount and every one ends `:ro` — closes the `found===0`-only vacuity floor at `stack-config-checks.mjs:436` | **P2**, OBS-45 |
| **C6** | `checkListenAddrsLoopback` reads `--web.listen-address=127.0.0.1:9101` | OBS-46 |
| **G9o** (new) | `job_name: mr-trace-relay` exists, `metrics_path: /health`, host `127.0.0.1`, **port equals the compose `--web.listen-address` port** (cross-file resolution — "co-occurrence is not wiring") | **P3**, OBS-46 |
| **G9p** (new) | exactly one rule whose `expr` contains `up{job="mr-trace-relay"}`; `uid` ≠ `mr-alloy-down`; its `for:` **≥ the `for:` of the `up{job="alloy"}` rule read from the same document** — never re-spelling 60s | **P4**, OBS-46 |
| **G9i** (extended) | credential-surface/word + write-API scan now covers `daemon.mjs`+`tail.mjs`; positive-read check extends `RELAY_SHELL_FILE`→`RELAY_SHELL_FILES` (`:3414-3422`) | OBS-45 |
| **G9q** (new) | `daemon.mjs` contains no `0.0.0.0` and no `://` in code lines | constraint 1, Semgrep |

**P2 detail — AM18 is HALF true (do not skip G9n).** `checkModuleLogsMountReadOnly:426-433` matches
*any* `- ...replicas...` item anywhere in the file and requires `:ro`, so the relay's mount **is**
checked automatically. **But `found === 0` is the only non-vacuity floor (`:436`)** — a relay with
**no mount at all** leaves `found === 1` (alloy's) and C5 still passes. C5 rejects a `:rw` relay
mount but cannot prove the relay *has* one. G9n closes that.

### Proof-of-teeth (`TEETH` array, `:2278`+) — each must REJECT the bad shape **and** ACCEPT the good
- **T-a (rewrite, `:2278-2306`)** — currently asserts an 8-service compose is *rejected*. Invert:
  8 accepted; 7 (relay missing) rejected; a `datadog`-substituted 8 rejected.
- **T-m** — G9n: relay with **no** mount → REJECT; `:rw` → REJECT; `:ro` → ACCEPT.
- **T-n** — G9o: job absent → REJECT; job with **no** `metrics_path` (silently `/metrics`) → REJECT;
  port ≠ compose port → REJECT; matching → ACCEPT.
- **T-o** — G9p: no relay rule → REJECT; **AlloyDown's own expr widened to
  `or up{job="mr-trace-relay"}`** → REJECT (the exact "fold into OBS-39's rule" shape the spec at
  `:542-547` calls unbuildable); distinct rule with `for: 20s` → REJECT; distinct + `for: 60s` → ACCEPT.
- **T-p** — retiered ban list: a pure-core fixture containing `node:http` → REJECT; a daemon fixture
  containing `node:child_process` or the dynamic-regexp constructor → REJECT; the real shape → ACCEPT.
- **T-q** — G9q: daemon fixture with `0.0.0.0` → REJECT; with `://` → REJECT; clean → ACCEPT.

> Per the **red-team-tests-by-writing-the-cheat** memory: for T-m/T-n/T-o the tester must **write the
> cheating config and run it through the detector**, not review the detector.

### Live section, `MR_OBS_STACK=1`
Mirror `evals/observability-metrics-contract.eval.mjs:1213` **exactly** — the stated-skip note
(`:1210-1212`), the `if (process.env.MR_OBS_STACK === '1')` guard, and the `MR_OBS_ALLOY_FETCH`-style
**JSON argv-array** seam (`:1247-1269`). The seam is **mandatory, not optional**: Docker Desktop
scopes `network_mode: host` to its own VM and WSL-native Node cannot reach the stack's loopback
(recorded memory + `ADR-0180:1032`).
- **L1** — `GET http://127.0.0.1:9101/health` → 200.
- **L2** — `GET http://127.0.0.1:9090/api/v1/targets` shows `job="mr-trace-relay"` with
  `health: "up"`. **This is the criterion-level proof and the only thing that catches D4's
  empty-body landmine.**
Heavier evidence (alert firing under a killed relay; the Tempo round trip) is captured by hand into
ADR-0191 as live evidence of record, per the m20e precedent (`ADR-0180:1026-1032`).

---

## 5. The eval rework (the risky part)

`HYGIENE_BANS` (`:1075-1084`) currently bans `node:http`, `node:net`, `.listen(`, `setinterval(`,
`settimeout(`, `date.now(`, `node:child_process` and the dynamic-regexp constructor across **every**
`.mjs` in `relay/` (`:3365-3372`). The daemon needs four of those. **Deleting the list is how G9i/G9j
go vacuous.**

**Retier, do not relax:**
```
PURE_BANS   = all 8 as today                                → RELAY_PURE_FILES + their tests + mr-trace-relay.mjs
DAEMON_BANS = dynamic-regexp ctor, node:child_process, node:net → daemon.mjs + daemon.test.mjs
```
Keep the fragment-assembly trick for the first needle (`:1076`) — **no code line of the eval may
spell the dynamic-regexp constructor contiguously.**

**Replace the lost teeth with positive assertions** (this decides whether the gate still bites):
1. `daemon.mjs` contains **exactly one** `.listen(` (a second listener = a second unreviewed surface).
2. `daemon.mjs` contains no `0.0.0.0` and no `://` (G9q) — forces the endpoint through config and
   sidesteps the remote-Semgrep raw-URL rule.
3. `daemon.mjs` stays in `RELAY_PRODUCTION_FILES` so `CREDENTIAL_SURFACE` (`:1001-1015`),
   `CREDENTIAL_WORDS` (`:1029`) and `WRITE_APIS` (`:1051-1066`) scan it automatically —
   **OBS-45's static half survives on the new surface unchanged.**
4. The `RELAY_SHELL_FILE` positive-read check (`:3414-3422`) extends to both shell files.
5. The runtime half of "SHALL NOT accept a credential" moves to U10, so a future credential-flag
   rename cannot slip past a substring list.

**Bookkeeping that will silently break the build if missed:**
- `NODE_TEST_FILES` (`:228-232`) gains `tail.test.mjs` (automatic via `RELAY_PURE_FILES`) **and**
  `daemon.test.mjs` (**manual**).
- `NODE_TEST_PASS_FLOOR` (`:233`, currently **181**) must be **re-derived with the documented command
  at `:225`**, never guessed:
  `grep -c '^test(' ops/observability/relay/*.test.mjs ops/observability/checks/*.test.mjs`.
  Update the derivation comment at `:220-227` with the new arithmetic.
- `FILE_FLOOR` (`:248`) stays **15** — no new `readReal` call site is added (relay sources are read
  via `readFileSync` in G9j). **Do not bump it.**
- The header's `PARKED — m20e-2` block (`:118-132`) is **deleted**; the G9g entry in the
  "WHAT THIS PROVES" map (`:30-32`) rewritten. **Leave the 13r-a park block (`:90-116`) byte-identical**
  — its own comment at `:114-116` explains why the two blocks are separate.
- `checkNoRelayScrapeJob`/`checkNoRelayAlertRule` (`:923-951`) are **replaced by new, differently-named**
  functions, **not edited in place** — a same-named inverted predicate is a polarity trap. Keep their
  non-vacuity guards (zero jobs / zero rules → fail).
- The final success `detail` string (`:3540-3557`) must stop claiming "7 services … the m20e-2 park is
  intact".

---

## 6. Numbered tasks

1. **Scope gate** — obtain the §0 extension. **Blocks Task 4.** If refused → the slice is unbuildable
   as scoped; re-park per §0(B).
2. **`tail.mjs` + `tail.test.mjs`** — U1–U6 RED first. The 4 existing suites stay untouched + green.
3. **`daemon.mjs` + `daemon.test.mjs`** — arg parser (`=`-form!), health handler (D4), poll loop with
   injected clock/fs, stdout sink. U7–U13, U15 RED first.
4. **Compose service** + the 2-line `checks/stack-config-checks.test.mjs` edit. Confirm C3/C4/C5/C6.
5. **`prometheus.yml` job + `rules.yml` alert rule.**
6. **Eval: P1–P4 graduation** — `EIGHT_SERVICES`, `ALLOWED_IMAGE_REPOS`, G9n/G9o/G9p, delete the park
   block, rewrite T-a, add T-m/T-n/T-o.
7. **Eval: ban retiering + G9i/G9j/G9q** — §5, with T-p/T-q. Re-derive `NODE_TEST_PASS_FLOOR`.
8. **Eval: `MR_OBS_STACK=1` live section** — L1/L2 with the argv seam.
9. **Live boot** — `docker compose up -d` all 8; capture L1/L2 evidence; verify the
   `read_only: true` + uid-65534 + `cap_drop: ALL` node container actually boots (R1/R2).
10. **DECISION POINT — OTLP POST client** (U14). Land if budget allows; else → 11.
11. **Docs** — ADR-0191, ADR-0180 label fixes, `relay/README.md`, `ARCHITECTURE.md`, the 13r-c park
    block + tripwire if Task 10 was skipped, knowledge regen **after** the code commit.

---

## 7. Named anti-patterns to avoid

1. Naming the flag `--health-listen-addr` → C6 fails closed (D9).
2. **A non-empty `/health` body** → Prometheus parse error → `up=0` forever → the trained-to-ignore
   dead-man's switch the park warned about (D4).
3. Relaxing `HYGIENE_BANS` globally instead of retiering per file (§5).
4. **Any write:** an `--out` flag, an offset checkpoint, a lock file, `openSync` (D2/D3).
5. **Any dynamic regex** — remote Semgrep `detect-non-literal-regexp` has red-ed this repo 3×.
   Assemble literals from fragments (`:1076` idiom). `spawnSync` **array args only**. No `Date.now()`
   in any assertion.
6. A `://` or `0.0.0.0` literal in `daemon.mjs`.
7. Re-spelling `60s` in the P4 gate — derive it from the AlloyDown rule in the same document.
8. Folding the relay into OBS-39's rule — spec `:542-547` calls that unbuildable; T-o must reject it.
9. Adding a `ports:` key (`checkListenAddrsLoopback:464-472`) or a `docker-compose.override.yml`
   (eval `:3456-3470`). Either fails instantly.
10. Editing `NODE_TEST_PASS_FLOOR` or `FILE_FLOOR` by guess — re-derive; `FILE_FLOOR` must not move.
11. Paraphrasing a park block into a TBD (the eval's own anti-pattern 11).
12. Multi-line commit messages with backticks via `-m` — use `-F` + a quoted heredoc.

---

## 8. Open risks

- **R1 (high)** — `read_only: true` + node: the entrypoint runs under uid 65534 with `cap_drop: ALL`
  on a read-only rootfs. **ADR-0190 exists precisely because m20b shipped a stack never booted.**
  Verify at Task 9 *before* writing the ADR; fall back to `tmpfs: [/tmp]` only if empirically
  required, and record why.
- **R2 (high)** — mount permissions: uid 65534 needs host-side `r-x` on
  `${MR_SPACETIME_DATA_DIR}/replicas` (alloy already needs the same for uid 473,
  `docker-compose.yml:74-76`). A wrong mode is a **silent tail stall**, not a crash — and per D8 `up`
  will not catch it. Document the precondition in ADR-0191 + the runbook.
- **R3 (high)** — D4's empty body: only L2 catches it. If L2 cannot run here, capture it manually;
  **do not merge on the static gate alone.**
- **R4 (medium)** — Docker Desktop / WSL host networking → the argv-fetch seam is mandatory.
- **R5 (medium)** — ban retiering going vacuous; mitigated by T-p/T-q written as **executed cheats**.
- **R6 (medium)** — doc lies outside the touch set (§3).
- **R7 (medium, inherited)** — no integration coverage of the span path is possible: `$trace_pair_set`
  is ∅, so the document is `{"resourceSpans":[]}` and nothing end-to-end can prove spans reach Tempo.
  This is the original m20b objection (`ADR-0180:928-935`); it does **not** block OBS-45/46 but must
  be **stated** in ADR-0191, not papered over.
- **R8 (medium)** — gitleaks + Semgrep are **remote-only**, run before every other gate, and local
  `just ci` cannot catch them; force-push is hook-blocked, so a red means squashing onto a new branch.
  Budget one round trip.
- **R9 (low)** — G9k wall time: two more suites under the 60s `NODE_TEST_TIMEOUT_MS` (`:234`); record
  the new wall time in the handoff as `:134-136` requires.
- **R10 (low)** — a live e2e/eval run can clobber a sibling's stack; check `docker ps`/`ps` before
  blaming a red on this diff.

---

## 9. Recommended workflow at resume

Full loop, but **concentrate the adversarial budget on Tasks 6–7 (the eval diff)**. The config and
daemon halves are mechanical and fully gated; the `HYGIENE_BANS` retiering is the one place where a
plausible-looking edit turns a live gate vacuous **while `just ci` stays green**. This repo's own
history says a reviewer *reading* gate tests finds zero bypasses while one who *writes the cheat*
finds four — so the red-team pass on the eval must execute cheats, not review code.

## 10. Why no branch/commit exists

`feat/13r-b-trace-relay-integration` was created and then removed: the park happened before any
project-repo file changed (the only edit was the §0 probe, reverted; tree verified byte-clean).
An empty branch identical to `master` is clutter, and re-creating the worktree is one command.
**Resume from this memo**, not from a diff.
