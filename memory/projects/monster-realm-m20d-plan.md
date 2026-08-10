# m20d — `mr-load-driver` — ADJUDICATED plan (binding)

Slice: m20d (M20 load driver, HARD tier). Branch `feat/m20d-load-driver`, worktree `.claude/worktrees/m20d`, base master d45b3c3.
Raw planner output: `monster-realm-m20d-plan-draft.md` (the draft stands except where a ruling below overrides it).
Plan-review lenses: reviewer (a32bff0) + red-team (a5e251b) + /simplify (orchestrator, in-context). Every finding ruled on below. Rulings AM1–AM24 are binding on tester + implementer.

## Rulings

**AM1 (reviewer B1, red-team C2 — BLOCKER, ACCEPTED with design correction): pacing is OPEN-LOOP, clock-free.**
"Sleep the pacing remainder" is unimplementable under the workspace determinism gate (no `Instant::now` anywhere, no `#[allow]`). Corrected design: each client-thread iteration = bounded drain (AM2) → send one intent → `thread::sleep(PACING_SLEEP)` where `PACING_SLEEP` is a constant derived purely from `--move-rate` (e.g. `1000/rate` ms, `saturating_sub` a fixed drain allowance). Documented open-loop: real per-client rate ≤ nominal, never measured locally, never corrected. The honesty instrument is AM3's attempted-send counter vs S1's accepted+rejected deltas.

**AM2 (reviewer B2, red-team H3 — BLOCKER, ACCEPTED, then simplified): drain until would-block; reader is a streaming SKIP loop, no reassembly.**
Per-iteration drain runs until the socket read would block/times out (5ms read timeout), with only a generous safety ceiling (e.g. 4096 frames) against a pathological server; hitting the ceiling increments a per-level `drain_cap_hits` diagnostic (report-visible receive-lag signal — distinguishes "server backed up" from "driver fell behind"). Because the reader NEVER parses data payloads (accept/reject truth comes from S1 counters), it needs no fragment reassembly: parse frame header (7/16/64-bit lengths) from a persistent per-connection buffer; control frames (ping/pong/close — always complete, ≤125B per RFC 6455) are read fully and answered (ping→pong, close→close+drop); data/continuation frames are discarded by a streaming remaining-bytes-to-skip counter that survives partial reads. T14 must cover: header split across reads, 64-bit length, interleaved control frame between data fragments, skip-counter resumption.

**AM3 (red-team C2a — ACCEPTED): per-client `attempted_sends` AtomicU64**, summed per level into the report. Gap between attempted and S1's (accepted+rejected) delta = driver-side starvation/write-failure signal, clock-free.

**AM4 (red-team C2b — ACCEPTED as documentation + note): loopback co-location contamination.** When total driver threads > `std::thread::available_parallelism()`, the report gains a fixed `note` ("driver thread count exceeds host parallelism; co-located results may be contaminated by the driver's own scheduling"). Module docs state the number-of-record should come from a non-co-located target where possible. No behavioral change.

**AM5 (red-team C1 + reviewer M6 — ACCEPTED, redesigned validity semantics):** three distinct level-validity outcomes replace the draft's single `no_offered_load`:
- `join_failed`: at each level start, after the join wave, the S1 `spacetime_num_txns_total{reducer="join_game",committed="true"}` cumulative delta since run start must be ≥ total clients; else the level (and run) fails LOUD — this catches driver-side auth/name/validation drift (red-team S1) as a tool error, never a server verdict.
- `no_load_reached`: (accepted + rejected) `enqueue_move` delta == 0 — nothing reached the server (driver stall / connection collapse) → level invalid, never a breaking point.
- `counter_reset`: any cumulative counter decreases → invalid (host restart).
A level with accepted==0 but rejected>0 (queue-full storm at saturation) stays **VALID** — its p95/queue readings are real measurements of a saturated server — and gains a `rejection_storm` note. Rejection volume is NEVER a breach reason (OBS-27 names exactly two) and NEVER blended into an error rate (D8).

**AM6 (red-team C3 — ACCEPTED): warm-up discard applies to every per-level series uniformly** — the first post-ramp-step scrape is dropped from BOTH the p95 window and the queue-gauge growth window (`WARMUP_SCRAPES=1` drops the first raw reading; deltas derive from the remaining readings). T6 gains a connect-burst-shaped fixture proving the first reading is excluded.

**AM7 (red-team C4 vs reviewer M7 — ADJUDICATED, split ruling): within-level growth is the OBS-27 breach signal; cross-level plateau growth is a reported diagnostic, not a breach.**
Rationale (recorded here + ADR): a queue flat-at-elevated-plateau within a held level means the server keeps up at that concurrency (stable backlog); divergence AT HELD LOAD is the honest reading of "begins monotonically growing". But the plateau curve is real saturation evidence, so: per-level plateau = median of the usable-window readings; the report carries `plateau_by_level` per family plus a `cross_level_growth: [family…]` note when plateaus are strictly increasing across ≥3 consecutive levels. Humans/G11 re-judge from the raw series either way.

**AM8 (reviewer H3 — ACCEPTED, simplified): per-level p95 = ONE windowed histogram delta** — cumulative buckets at last usable scrape minus cumulative buckets at first usable scrape; interpolated p95 over that whole-window delta. No per-delta p95 series, no aggregation choice. (Growth detection still uses the per-scrape gauge readings — gauges, not deltas.)

**AM9 (reviewer H4 — ACCEPTED): the breach comparator is INCLUSIVE and stated once:** breach iff `p95_s >= STEP_MS/1000` (consistent with the AboveTop rule `top_finite >= STEP_MS`). OBS-24's "staying under STEP_MS" = healthy iff p95 < STEP_MS. T5/T7 gain the `p95 == STEP_MS` boundary fixture.

**AM10 (red-team H1 — ACCEPTED): coarse-bucket honesty.** The pinned host almost certainly uses the `prometheus` crate DEFAULT_BUCKETS (red-team found the literal 11-float array in the binary), so STEP_MS=0.2s falls inside the 150ms-wide (0.1, 0.25] bucket. T5 MUST include a DEFAULT_BUCKETS-shaped fixture straddling 0.2; the per-level report exposes `p95_bucket_width_s` (width of the bucket containing the p95) as the resolution/uncertainty indicator. Phase 0 records the real bounds.

**AM11 (red-team H2 — ACCEPTED): `set_write_timeout` on every client socket AND the scraper socket;** a write timeout increments `send_errors` (distinct cause tracked; never a silent hang).

**AM12 (red-team H5 — ACCEPTED): scraper HTTP GET gets explicit connect+read timeouts and bounded retries (e.g. 3);** exhaustion = fail-loud run abort with a partial report to stdout, never an indefinite hang.

**AM13 (red-team H4 — ACCEPTED, simplified per /simplify): database-identity ambiguity guard.** If candidate series for any required family disagree on / carry more than one distinct `database_identity` value, FAIL LOUD (multi-db host detected) rather than silently summing. Full name→identity resolution is NOT built in v1 (YAGNI); Phase 0 records whether the label appears and whether single-db is the practical case. The fail-loud guard makes the OBS-51 repeated-invocation case safe (it aborts rather than lies).

**AM14 (red-team M3 — ACCEPTED): summed histogram series must share an identical `le` set; mismatch = fail loud.**

**AM15 (red-team S1 — ACCEPTED-as-mitigated, game-core export REJECTED as a touches violation):** bot names are conservative ASCII (`"LoadBot <i>"` — alphanumeric+space, len ≤ 12, far inside `validate_name`'s charset/length rules), with a comment citing `server-module/src/guards.rs::validate_name`; the duplicated-rule drift risk is named in the ADR amendment, and AM5's `join_failed` S1-counter guard converts any future drift into a loud tool error at run time. T12 pins the generated charset/length.

**AM16 (reviewer M5 vs slice contract — KEEP `--scenario`):** the slice descriptor explicitly assigns OBS-28 to this slice; `--scenario movement|chat-flood` with chat-flood → exit 2 naming OBS-28/M19 is the minimal honest encoding and freezes the CLI seam M19 will extend. Cost ~10 lines + T2.

**AM17 (/simplify — CUT `--queue-metric`):** hard-code `QUEUE_FAMILIES = ["spacetime_subscription_send_queue_length", "spacetime_worker_instance_operation_queue_length"]` (const, cited to OBS-26/27). A repeatable flag has no current consumer. Follow-up if a need appears.

**AM18 (/simplify — REJECT reviewer L9's `--label`):** `--run-id` is already a free-text echoed field; G11 encodes pairing state in it by documented convention (module docs state: `--run-id "$(date -u +%Y%m%dT%H%M%SZ)-pairing-on"`).

**AM19 (/simplify — `hybrid` transport is CONDITIONAL):** ship `--transport ws|http` if Phase 0 pins the WS CallReducer envelope; `hybrid` enters the CLI only if Phase 0 fails on CallReducer (then hybrid = default-of-record per draft R1). Either way `http` mode's report + docs carry the not-the-OBS-27-number caveat (subscription fan-out absent).

**AM20 (reviewer M8 — ACCEPTED): the `json_escape` citation was wrong;** the driver writes its own (~10 lines, `"`/`\`/control chars), stated as its own copy (crate boundaries prevent reuse of `guards::json_escape`; DRY-across-boundaries is not a goal per standards).

**AM21 (reviewer L10 + red-team M2 — ACCEPTED as Phase-3 checklist + docs):** live verification watches the DRIVER process's own CPU alongside the server's; open-loop burstiness (sleep-loop re-synchronization) is a documented limitation in module docs.

**AM22 (red-team M1 — ACCEPTED, tester-binding): the three named cheat-shape fixtures are mandatory:** T6 gets the oscillating net-gain series `[1,100,1,100,2]` (kills a `last>first` detector); T5 gets the DEFAULT_BUCKETS-shaped fixture (kills convenient-bounds-only fixtures); T8 tests the AM5 semantics (kills a verbatim `accepted==0→invalid` implementation: fixture with accepted==0/rejected>0 must stay VALID with a rejection_storm note, and a fixture with joins short must fail loud).

**AM23 (red-team surface-3 resolution — RECORD): no occupancy/collision rule exists anywhere in the movement pipeline** (`apply_move`/`is_walkable`/`movement_tick` verified line-by-line by red-team); N bots stack freely on zone-0 row 1. Stated in the ADR amendment as a verified premise, so future content changes that ADD collision invalidate the bot model loudly (join/move rejection storms → AM5 guards).

**AM24 (reviewer citation checks): draft's other citations verified accurate** (justfile gate list, tiled_import idiom, connection.ts:611-632 subscription, movement.rs:133-137 battle lock, zone-0 row-1 grass-free, no-eval-scans-new-bins).

## Net deltas to the draft
- CLI: drop `--queue-metric`; no `--label`; `--transport ws|http` (hybrid conditional per AM19). All other flags stand.
- Report schema additions: per-level `attempted_sends`, `drain_cap_hits`, `p95_bucket_width_s`, `plateau_by_level`, `rejection_storm`/`join_failed` in validity vocabulary, `cross_level_growth` + co-location note in `notes`.
- Reader design: streaming skip-loop (AM2), no reassembly.
- Validity semantics: AM5 replaces draft `no_offered_load` wholesale.
- p95: single windowed delta per level (AM8); inclusive breach comparator (AM9).
- Warm-up: uniform first-reading discard (AM6).
- Growth: within-level = breach; cross-level plateau = diagnostic (AM7).

## Phase plan (unchanged from draft except as amended)
Phase 0 live wire probe (orchestrator; pins envelopes, bucket bounds, status codes, energy check; gate for AM19) → Phase 1 tester RED (T1–T18 as amended by AM5/AM6/AM9/AM10/AM22; skeleton+tests in `#[cfg(test)] mod tests` of the single bin file; RED proven by orchestrator via `cargo nextest run -p sim-harness`; `just lint` red-during-RED is expected, not the gate) → scoped test-review (red-team on T5/T6/T7/T8 per draft §9; reviewer if warranted) → Phase 2 implementer GREEN (never edits mod tests; per-step `cargo nextest`, exit `just ci-fast sim-harness` clean, zero `#[allow]`) → Phase 3 live verification (L1–L6 + AM21 driver-health check; OBS-27 outcome recorded as evidence) → Phase 4 docs (ADR-0180 body amendment; ARCHITECTURE.md ×2 minimal; harness-spec annotation UNCOMMITTED for supervisor) → impl-review lenses (reviewer + red-team + /simplify; domain auditors: desync-guard scoped to "does the driver reimplement rules" — expected trivial; reducer-security-auditor N/A, no server-module change — skip with justification) → verifier (full `just ci`, anti-weakening audit, own mutations) → PR open + STOP.

## APPENDIX — Phase 0 live wire probe results (2026-08-09, host 2.6.0, module @ d45b3c3, scratch db `mr-m20d-probe`, torn down)

All facts below are LIVE-VERIFIED, not recalled. They are binding on tester + implementer (AM25–AM27 supersede earlier rulings where noted).

**Wire contract:**
- `POST /v1/identity` (no auth) → `{"identity":"<hex>","token":"<JWT eyJ...>"}` (JWT-shaped ⇒ gitleaks fixture rule confirmed).
- `GET /v1/database/<name>` → `{"database_identity":{"__identity__":"0x<hex>"},...}` — name→identity resolution exists.
- HTTP reducer call `POST /v1/database/<db>/call/<reducer>`: body = JSON ARRAY of SATS-JSON args, `Authorization: Bearer`. 200 = committed; **530 + plain-text error body** = reducer Err. **BUT each HTTP call is an ephemeral connection and `on_disconnect` (server-module/src/lib.rs:213-239) deletes player+character rows BY IDENTITY** → HTTP cannot sustain join state (verified live: join_game 200 then enqueue_move 530 "not joined" 5ms later), and an HTTP call would likewise destroy a concurrent WS session's join state for the same identity.
- WS: `ws://<host>/v1/database/<db>/subscribe`, subprotocol `v1.json.spacetimedb`; auth header (upstream auth.rs, header precedence) or `?token=` query param (live-verified). Server frames are uncompressed text (JSON path never compressed).
- Client messages — externally-tagged serde, live-verified end-to-end:
  - `{"Subscribe":{"query_strings":["SELECT * FROM character"],"request_id":1}}`
  - `{"CallReducer":{"reducer":"join_game","args":"[\"LoadBot 3\"]","request_id":2,"flags":0}}` — **`args` is a JSON STRING containing the args array**; `flags` numeric 0.
  - MoveInput args: `{"Step":{"East":[]}}` / `{"Jump":[]}` — decode-verified; bot moved (1,1)→(2,1) by movement_tick.
- Server messages (drain-only, shapes for docs): `{"IdentityToken":{...}}` first, `{"InitialSubscription":{...}}`, `{"TransactionUpdate":{"status":{"Committed":{...}}|{"Failed":"<reason>"},...}}`.
- Per-connection sequence: Subscribe → join_game → enqueue_move stream; disconnect auto-sweeps join state.
- Energy: standalone unthrottled (100-call burst, zero quota rejections; `energy_quanta_used` tracked but unenforced).
- Zone 0 contains a wandering NPC (sprite 10) — constant background movement_tick load, identical across runs.

**Metrics contract (live scrape, families + labels + bounds):**
- `spacetime_txn_elapsed_time_sec_bucket{db="<identity-hex-no-0x>",reducer="movement_tick",txn_type="Reducer",le=…}` — le set: `.00001 .00005 .0001 .0005 .001 .005 .01 .05 .1 .5 1 5 10 +Inf`. **NOT prometheus DEFAULT_BUCKETS** (red-team H1's binary-forensic guess was wrong for this family). STEP_MS=0.2 falls in **(0.1, 0.5] — a 400ms-wide bucket**; `p95_bucket_width_s` resolution indicator is essential (AM10 vindicated, worse than feared). T5's realistic fixture uses THIS bound set.
- `spacetime_num_txns_total{committed,db,reducer,txn_type}` — **an `txn_type="Update"` row exists per reducer alongside `txn_type="Reducer"`; matching MUST pin `txn_type="Reducer"` or accepted/rejected deltas double-count.**
- Queue gauges: `spacetime_subscription_send_queue_length{database_identity="<hex>"}` and `spacetime_worker_instance_operation_queue_length{database_identity="<hex>"}` (plain gauges; an unused companion `_histogram` exists for the latter).
- **Label-name asymmetry:** txn families use `db=`, queue gauges use `database_identity=` — both hold the identity hex WITHOUT `0x`.

**Post-probe rulings (supersede where noted):**
- **AM25 (supersedes AM19): `--transport` flag DELETED.** WS is the only viable transport; HTTP and hybrid are structurally dead (disconnect sweep). Report carries a fixed `"transport":"ws"` literal. If the WS path had failed there would have been NO fallback — it did not fail.
- **AM26: the driver resolves `--db` name→identity at startup (`GET /v1/database/<name>`, strip `0x`) and pins the identity value in every label match** (`db=` for txn families, `database_identity=` for gauges); zero matching series after pinning = fail loud. This supersedes AM13's ambiguity guard (pinning makes ambiguity unrepresentable; the fail-loud remains).
- **AM27: `txn_type="Reducer"` is pinned on all txn-family matches.**

## APPENDIX 2 — test-phase record (2026-08-09)

- Tester (opus, agent abe74714) authored `sim-harness/src/bin/mr_load_driver.rs` (4,238 lines: docs + §1–§9 stubs + 176 tests). **RED proven by orchestrator:** `cargo nextest run -p sim-harness --no-fail-fast` → 213 run, 43 pass, 170 fail; the 6 passing NEW tests are constant-pins/oracle-teeth (constants_are_frozen, queue-families pin, OBS-28 message pin, budget==STEP_MS, 2× T13 real-map teeth) — legitimate greens by construction. Checkpoint fa88894 pushed.
- **Process note:** the tester wrote the file to the MAIN CHECKOUT path first (untracked); orchestrator moved it into the worktree — main checkout verified clean after. Future tester briefs: state the worktree path twice and warn against the canonical path.
- **Scoped red-team on T5/T6/T7/T8 (agent acfcab5):** 4 CRITICAL (all-integer ranks hide floor/ceil/round rank bugs — total=17 fixture added; AboveTop-over-budget must stay VALID — only-below-budget fixture existed; join_failed>no_load_reached and no_load_reached>insufficient_samples precedences unpinned; p95_from_delta doc pseudocode ordered TooFew before Reset, contradicting the all-negative-delta Reset fixture), 2 HIGH (rank==count boundary at top finite bucket Value-vs-AboveTop; cross_level_growth 0/1-element panic risk on the PRIMARY single-level G11 use case), 3 MEDIUM, 2 LOW. T6 survived 5 named attack shapes cleanly; T7 core precedence machinery survived (incl. ==STEP_MS routed through the real state machine). All T5 fixture arithmetic independently re-derived and confirmed. Corrections sent to the TESTER (owner-returned; implementer never edits tests).
- **Phase-3 L-series additions (from red-team M7/M10 — unit-untestable shell obligations):** new **L7**: capture one level's raw scrape sequence to a file during the live run; hand-recompute `join_committed_total_delta`, `counter_decreased`, the windowed p95, and the growth verdict from the raw captures and diff against the driver's own report (proves the shell populates `LevelSample` RAW and discards exactly once). Also verify the driver process's own CPU health near the cap (AM21).

## APPENDIX 3 — Phase-3 live verification + OBS-27 evidence of record (2026-08-09, host 2.6.0, module @ d45b3c3, scratch db mr-m20d-live, torn down)

**Shell bugs found live + fixed (untested §9 shell only; pure core untouched, 187/187 held throughout):**
1. Scrape path was `/metrics` (404) → fixed to `/v1/metrics` (orchestrator).
2. Every client shared ONE identity/token ⇒ only ONE character regardless of N ⇒ fan-out collapsed to O(N), OBS-27 rationale defeated → fixed: each client mints its own identity (`POST /v1/identity` per client in `run_level` before the thread scope); N distinct characters (implementer).
3. `join_committed_total_delta` measured inside the scrape window (joins already done) ⇒ every level spuriously `join_failed` → fixed: a baseline scrape at level start; all four counter deltas measured from that baseline (implementer).

**OBS-27 evidence of record (the criterion says "SHALL record the concurrency level at which movement-tick p95 first crosses STEP_MS, or any queue-depth metric begins monotonically growing"):**
- **Canonical ramp** `--clients-start 5 --clients-max 50 --step 5 --hold-scrapes 5 --move-rate 5`: **breaking_point=null, not_reached=true** — a legitimate dev-box recording. All 10 levels VALID; movement_tick p95 ≈0.46 ms (≪ 200 ms STEP_MS); queues flat at 0; accepted-move delta EXACTLY linear in N (45,90,135,…,450 = concurrency×9), which proves N distinct characters actually load the server (a shared identity would flat-line accepted regardless of N — the bug-2 fix is confirmed live).
- **Aggressive ramp** `100→400 step 100 --move-rate 5`: still `not_reached`, but the O(N²) fan-out is visibly real — at 400, subscription_send_queue raw `[8,0,101,99]` and instance_operation_queue `[481,0,0,3]`; p95 rose 0.85 ms(100)→4.6 ms(300)→4.5 ms(400). The breach detector correctly did NOT fire: the queue SPIKES then DRAINS (0→101→99, last pair drops), which is not the sustained strict-monotonic climb OBS-27 defines — the server is (barely) keeping up. Teeth are calibrated, not trigger-happy (AM7 live-confirmed). The raw series ships in the report for a human/G11 to re-judge.
- **D8 check** `move-rate 20` (floods the 2-slot per-character queue) at N=5: 40 accepted / 100 rejected, level stays **VALID**, rejections never become a breach reason and never a `rejection_storm` at low N — correct anti-flood classification.
- **Co-location note** fired correctly whenever driver threads > host parallelism (AM4).
- **Energy:** standalone unthrottled at 400 concurrent × 5/s (no quota rejections).
- **G11 readiness:** the CLI + `schema:1` report support the fixed-concurrency A/B (`--clients-start N --clients-max N` + `--run-id "…-pairing-on/off"`); m20e can invoke this binary directly. NOTE the observed dev-box floor: to produce a real breaking point for a G11 A/B, either a weaker/remote target or a higher move-rate is needed; on this host the movement loop does not saturate at ≤400. This is documented, not massaged.

Reports saved (evidence): `/tmp/m20d-L3.json` (canonical), `/tmp/m20d-L3b.json` (aggressive). Scratch host+db torn down.

## APPENDIX 4 — impl-review lenses (2026-08-09)

**/simplify (orchestrator, in-context):** implementation is appropriately minimal — no premature abstraction, no dead code (clippy-clean under `--all-targets` proves reachability), no unjustified generality (ClientCounters is a plain atomic struct, no mpsc — correct YAGNI). No cuts warranted. ONE robustness asymmetry noted for the reviewer/red-team to adjudicate (a correctness finding, not a simplification): `build_level_sample:2385` reads the queue gauges with `.unwrap_or(0.0)` while the p95 histogram path (`:2374`) uses `?` (fail-loud). A vanished/renamed queue family would silently become a flat-0 series → "no growth" → a possible false `not_reached` on one of OBS-27's two signals. The counter-delta `.unwrap_or(0.0)` (`:2393/2395`) fails toward invalid (safe); the queue one fails toward healthy (unsafe). Candidate fix: make the queue series fail loud like the histogram, OR record an explicit "queue family absent" invalidation.

## APPENDIX 4 (cont.) — reviewer + red-team verdicts (2026-08-09)

**reviewer (a9bbf30, sonnet@xhigh):** 2 BLOCKERs + findings. BLOCKER-1: AM2 "drain until would-block" not implemented (single read/iter → drain_cap_hits neutered + client backpressure can inflate the server's subscription_send_queue = false breach). BLOCKER-2: AM12 "partial report to stdout on abort" never implemented (any level error discards all prior levels). HIGH: #3 the `.unwrap_or(0.0)` fail-loud defeat; #4 no connect timeout; #5 ADR-0180 D9 amendment doesn't exist yet (Phase-4 doc, pending). MED: allow-scope too wide (movable to the `#[cfg(test)] mod tests` decl line — implementer scaffolding, not frozen body); rejection_storm note not gated on validity; DRY recompute nit; "256 KiB stacks" doc claim unimplemented. Pure core §3–§8 + determinism + secret hygiene + resource-leak/thread-scope: verified CLEAN.

**red-team (aa5c898, fable@xhigh) — PoC-verified:** C1 (== reviewer#3) queue-gauge/counter `.unwrap_or(0.0)` defeats AM26 fail-loud → a zeroed mid-window reading kills the growth signal (false not_reached) — the unsafe direction is the QUEUE GAUGE (counters fail toward invalid, safe). C2 no monotonicity guard on cumulative buckets → PoC produced BOTH false-healthy and false-breach from a single corrupted bucket (requires an inconsistent scrape; the prometheus text encoder is atomic so unlikely live, but defensive gap). C3 client_thread breaks forever on any read/drain error + clients_connected never decremented → a mass mid-level disconnect (a shedding server) stays valid with light load → false not_reached (red-team: "the single most dangerous lie"). C4 (== BLOCKER-2) no partial report. H1 connect timeout; H2 unbounded body read; H3 20ms connect-phase write timeout too aggressive → load-induced join_failed mislabel. Verified CLEAN: control-frame length ordering, no u64 overflow, all expect/unwrap panic-safe, write timeouts present, no clock reads, token never leaks, bot-name reuse safe, baseline immune to slow on_disconnect sweep.

**Adjudication → FIX before PR (union of blockers/criticals + cheap honesty items):** C1(queue-gauge `?`), C2(non-decreasing-delta→Reset guard, pure core, frozen-test-safe), AM2-drain-loop, AM12-partial-report, C3(light: decrement-on-exit + clients_short/send_errors notes + invalidate if survivors collapse), H1(connect_timeout), H2(bounded body), H3(generous connect-phase write timeout), allow-scope→test-mod, rejection_storm-gate-on-validity, stack_size(256KiB via Builder::spawn_scoped). DEFER to handoff (nits): DRY recompute, attempted_sends naming doc, M1 dup-le-within-series (cheap, include if free). ADR-0180 D9 amendment = the pending Phase-4 doc (writes next).
