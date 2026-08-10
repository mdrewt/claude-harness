# m20d — `mr-load-driver` — planner draft (pre-adjudication)

Slice: m20d (M20 load driver, HARD tier). Branch `feat/m20d-load-driver`, worktree `.claude/worktrees/m20d`, base master d45b3c3.
Status: DRAFT — planner output verbatim below; adjudication rulings recorded in `monster-realm-m20d-plan.md` after the 3-lens plan review.

---

# m20d — `mr-load-driver`: build plan

## 0. Grounding (verified this pass, beyond the brief)

Everything below was checked against the canonical checkout at `master d45b3c3` (graphs index the canonical checkout; edits land in `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/m20d`).

**Gate surface that will touch the new file** (`justfile:16-26`):
`cargo fmt --all --check` · `cargo clippy --workspace --all-targets --all-features -- -D warnings` (+ `clippy.toml`) · `cargo check --workspace --all-targets` · `cargo nextest run --workspace` (runs bin-target unit tests) · `cargo test --doc --workspace` (does **not** collect bin doctests — do not rely on a doc example as a test).

**No eval scans `sim-harness/src/bin/**`.** The four eval hits are `execSync('cargo run -q -p sim-harness --bin <name>')` in `movement-parity`, `prediction-parity`, `netcode-determinism`, `netcode-convergence` — all name a specific bin. `observability-log-wrapper.eval.mjs:122-129` lists `sim-harness/Cargo.toml` in `WORKSPACE_MANIFESTS` — but only to assert no `"unstable"` feature (OBS-48). **Conclusion: no hidden `evals/**` dependency. Adding the bin does not touch `Cargo.lock` (zero new deps, bins are auto-discovered).**

**Five findings that change the design (not in the brief):**

1. **Wild encounters silently kill offered load.** `movement_tick` (`server-module/src/movement.rs:413-490`) fires `stepped_onto_grass` → `begin_encounter`; once a bot is in an ongoing battle, `enqueue_move` rejects `"cannot move during an ongoing battle"` (`movement.rs:133-137`) **forever**. A naive "walk east" bot walks into `~` and goes dark, so measured concurrency decays and the breaking point is reported far too high. Zone 0 row `y=1` is `"#........#"` (`game-core/content/zone_maps/000-core.ron:10`) — **all floor, x=1..8**. Fix: the bot oscillates East/West on row 1 from spawn `(1,1)`; a CI test proves the generated walk, fed through the *real* `game_core::apply_move` on the *real* zone-0 map, never lands on TallGrass.
2. **Accept/reject counts come free from S1 — no client-side response parsing.** `spacetime_num_txns_total{reducer="enqueue_move",committed="true"|"false"}` (family + label names confirmed at `evals/observability-metrics-contract.eval.mjs:60-68`) gives per-level accepted vs guard-rejected deltas from the scrape alone. This is the measurement-validity guard *and* it honors D8 (rejections ≠ errors) *and* it means the WS reader can stay drain-only.
3. **`-D warnings` + `dead_code` bites the RED phase.** In `cargo clippy --all-targets`, the non-test build of the bin warns `dead_code` on any helper only reachable from `#[cfg(test)]`, and `unused_variables` on `todo!()` stub params. So: **RED is proven with `cargo nextest run -p sim-harness`, not `just lint`** (lint is expected red until GREEN), and the design must make `main()` genuinely call every pure helper.
4. **gitleaks (remote-only, runs before every other gate) will flag a JWT-shaped fixture.** `POST /v1/identity` returns a real JWT in `token`. The `extract_token` unit-test fixtures **must not** be `eyJ…`-shaped; use `"TOKEN-PLACEHOLDER-abc123"`. Local `just ci` cannot catch this (memory: gitleaks-remote-only), and force-push is hook-blocked, so a bad fixture costs a squash-onto-new-branch.
5. **`game-core/src/bin/tiled_import.rs` is the exact precedent shape** for this slice: a bin with pure functions + `#[cfg(test)] mod tests` in the same file + a thin `main()` doing `std::env::args()` parsing and `eprintln!` + `std::process::exit(1)` on bad input (`tiled_import.rs:519-555`). Reuse that idiom rather than inventing one.

---

## 1. Decisions

### D-m20d-1 — Transport: **WS primary, with `--transport ws|hybrid|http`** (default `ws`)

**Decision.** A std-only client speaking `v1.json.spacetimedb` over hand-rolled RFC6455. Three transport values, expressed as two orthogonal booleans (`subscribe: bool`, `call_via: Ws|Http`) so the cost is three match arms, not three code paths.

**Rationale — HTTP-only structurally fails OBS-27, not merely partially.** The dominant server cost at concurrency N is subscription fan-out: every accepted move updates a `character` row that is broadcast to all N subscribers → O(N²). With zero subscriptions, `spacetime_subscription_send_queue_length` is flat at 0 forever (one of OBS-27's two named signals is blind) *and* the work that most plausibly produces the real breaking point never happens. An HTTP-only number would be qualitatively wrong, not conservatively wrong. WS is the only honest primary.

**`hybrid` is the fallback that preserves both signals.** The single highest-risk unknown is the `ClientMessage::CallReducer` JSON envelope. `Subscribe` and `CallReducer` are separable: if the CallReducer envelope proves intractable in the timebox, `hybrid` keeps WS subscriptions (fan-out real, queue signal live) and sends reducer calls over the already-required HTTP path. This is strictly better than the brief's stated fallback, and it costs one match arm — the HTTP POST machinery is needed for `/v1/identity` regardless.

**`http` is retained as a diagnostic**, and the report + docs must state that an `http`-mode breaking point **excludes subscription fan-out and is therefore an upper bound, not the OBS-27 number of record.** Cap at exactly three values.

**Hand-rolled WS is cheaper than it looks:** the server never compresses on the JSON protocol (no inflate needed), and the client can skip `Sec-WebSocket-Accept` verification entirely (verify only `HTTP/1.1 101`), which removes SHA-1. Only a ~20-line base64 encoder is needed, for the `Sec-WebSocket-Key`. Mask bytes come from `game_core::tick_seed` (seeded, clippy-clean).

### D-m20d-2 — **Zero changes to `lib.rs` / `world.rs`; bin-only**

The only thing the driver would have wanted from `lib.rs` is `mix()` (private) — and `game_core::tick_seed` is public and is exactly what `mix()` wraps. Nothing else is shared. Putting a Prometheus parser + WS codec into a crate whose module docs assert "deterministic, no wall clock, replay-determinism, netcode-convergence" would dilute a load-bearing doc contract for zero reuse. **Declared touch set collapses to one new file.**

### D-m20d-3 — Functional core / imperative shell inside one file

Pure core (100% unit-tested in CI, never opens a socket): CLI parse+validate, Prometheus text parser, histogram p95 estimator, monotonic-growth detector, ramp planner, level verdict + breaking-point state machine, report renderer, bot behavior model (name/seq/input), base64, WS frame codec, handshake/HTTP request builders + status validators, `extract_token`, SATS-JSON arg encoders.
Thin shell (never runs in CI — needs a live host, same skip-by-design posture as the metrics-contract eval's live half): `TcpStream` connect/read/write, thread spawn, `thread::sleep`, stdout/file write.

**One thread per client** (not two). Socket gets `set_read_timeout(Some(5ms))`; each iteration drains up to a bounded number of frames (answer `ping`→`pong`, honor `close`), then sends one `enqueue_move`, then sleeps the pacing remainder. Halves thread count, removes `try_clone`, removes non-blocking-write complexity. Hard cap `MAX_CLIENTS = 500` (fail-loud parse error above it), `thread::Builder::stack_size(256 KiB)`. Plus one scraper thread. Cross-thread state = `Arc<AtomicU64>` counters (connected / send_errors); **no mpsc** (YAGNI).

### D-m20d-4 — Measurement semantics (this is where OBS-27 is won or lost)

- **Budget** = `game_core::STEP_MS` imported (SSOT; a test asserts the driver's budget constant *is* `STEP_MS`, killing a literal `200`).
- **p95** estimated from `spacetime_txn_elapsed_time_sec_bucket{reducer="movement_tick"}` **deltas between consecutive scrapes**, with bucket bounds read from the exposition (`le`, including `+Inf`), linear interpolation within the containing bucket — i.e. the same computation Prometheus `histogram_quantile` does over the same series, so this is *not* a second measurement path (D9).
- **Label matching is subset-based**, never exact-label-set equality (real exposition may carry `database_identity`/`txn_type`); multiple matching series are summed and the series count is recorded so silent aggregation is visible.
- **`+Inf` honesty:** if the 95th percentile falls above the top finite bound, return `AboveTop(top_finite)`. That is a breach iff `top_finite >= STEP_MS`; otherwise it is **indeterminate → fail loud**, never silently reported as the top finite bound.
- **Monotonic growth** operational definition: over a level's *usable* window, **strictly increasing across every consecutive pair AND `last - first >= 1`, over ≥3 readings.** The raw per-level series is emitted in the report so a human or G11 can re-judge.
- **Warm-up:** the first delta of each level is discarded (it contains the connect burst). Fixed at 1, not a flag. Therefore `--hold-scrapes` minimum is **4** (fail-loud below), default 10.
- **Cumulative ramp:** each level *adds* `step` clients and keeps existing ones (matches "concurrency level", avoids reconnect storms and TIME_WAIT churn).
- **Stop at the first breach** ("first crosses"); report every level run.
- **Validity guards (fail-loud, not silent):** absent required family → exit non-zero; counter decrease (host restart) → level `invalid: counter_reset`; zero accepted-`enqueue_move` delta → level `invalid: no_offered_load`. An invalid level can never be the reported breaking point.
- **Offered-load-collapse annotation:** record accepted moves per client per scrape; if it falls below 50% of target, add a `notes` entry. Not a breach reason (OBS-27 names only two) — an honesty annotation.

### D-m20d-5 — Bot model does **not** model game rules

The bot fires intents blindly with a strictly-increasing per-client `seq`; the authority accepts or rejects. No legality check, no map read at runtime, no client-side prediction. The one map fact the driver depends on (row 1 of zone 0 is grass-free) is enforced **by a CI test using the real map and the real `apply_move` as an oracle**, not by runtime logic. If the live server runs different content, the empirical guard is `enqueue_move committed="false"` spiking → level flagged invalid.

### D-m20d-6 — Subscription set = one query

`SELECT * FROM character` — the single hot, per-move-updated public table, and the client's own first query (`client/src/net/connection.ts:611-632`). A fuller 15-query set adds subscription-evaluation cost but almost no per-move churn. Named `const SUBSCRIBE_QUERIES` with the citation; widening it is a named follow-up.

### D-m20d-7 — Report to **stdout** by default

One JSON object, `schema:1`, stable key order, hand-rolled with `json_escape` (idiom: `sim-harness/src/bin/netcode_check.rs:25-29`). `--report <path>` is optional and operator-chosen. **Rationale:** a default in-repo path would need a `.gitignore` edit, which is outside the touch set. The token never appears in the report; a test asserts it.

### D-m20d-8 — D9 deviation is recorded, not smuggled

D9's literal "real SpacetimeDB SDK clients" is not implementable inside this touch set (`spacetimedb-sdk` 2.6 ⇒ tokio + tokio-tungstenite + native-tls + `spacetime generate --lang rust` bindings + `Cargo.toml`/`Cargo.lock` — all outside). The driver is **protocol-real, not SDK-real**. ADR-0180 body amendment + an uncommitted harness-spec annotation (m21b precedent).

---

## 2. Architecture — module layout inside `sim-harness/src/bin/mr_load_driver.rs`

Single file (forced by the touch set), organized as banner-separated sections. `#![forbid(unsafe_code)]` at the top, matching crate doctrine.

```
//! module docs  ← the primary "documented" deliverable (usage, flags, report schema,
//!               OBS-27 definitions, determinism posture, SDK deviation, CI-skip note)

§1 CONSTANTS      STEP_MS re-export use, QUEUE_FAMILIES, SUBSCRIBE_QUERIES, MAX_CLIENTS,
                  WARMUP_DELTAS=1, MIN_HOLD_SCRAPES=4, MIN_P95_SAMPLES
§2 CONFIG         Config, Transport, Scenario, parse_args(&[String]) -> Result<Config,String>
§3 PROM PARSE     Sample, parse_line, label_unescape, select_subset,
                  counter_sum, histogram_buckets   (bounds READ from text)
§4 ESTIMATORS     BucketDelta, p95_from_delta -> P95{Value(f64)|AboveTop(f64)|TooFew|Reset},
                  is_monotonic_growth(&[f64]) -> bool
§5 RAMP + VERDICT ramp_levels, LevelSample, LevelVerdict, evaluate_level, breaking_point
§6 REPORT         json_escape, render_report(&Run) -> String
§7 BOT MODEL      bot_name(i), seq_for(i,n), next_input(client,seq,seed)
§8 WIRE (pure)    b64_encode, encode_text_frame, encode_pong, encode_close,
                  parse_frame_header, handshake_request, handshake_is_101,
                  http_post_request, http_status, extract_json_string_field,
                  sats_move_input, args_join_game, args_enqueue_move,
                  client_msg_call_reducer, client_msg_subscribe
§9 SHELL          fn main(), connect_client, client_thread, scraper_thread   ← only IO
§10 #[cfg(test)] mod tests   ← tester-owned; implementer NEVER edits
```

**Accepted consequence + named follow-up:** ~1000–1300 lines with tests in one file is a smell. Promoting to `src/bin/mr_load_driver/main.rs` + submodules when a second scenario (M19 chat-flood) lands is a named follow-up, not this slice.

---

## 3. CLI contract (frozen for G11/OBS-51)

| Flag | Default | Notes |
|---|---|---|
| `--server <url>` | `http://127.0.0.1:3000` | host:port; also derives the WS target |
| `--db <name>` | `monster-realm` | database name or identity |
| `--transport ws\|hybrid\|http` | `ws` | D-m20d-1; `http` = no subscriptions, documented as not-the-OBS-27-number |
| `--scenario movement\|chat-flood` | `movement` | `chat-flood` ⇒ **exit 2** with an OBS-28/M19 message, no report |
| `--clients-start <n>` | `5` | ≥1 |
| `--clients-step <n>` | `5` | ≥1 |
| `--clients-max <n>` | `50` | ≥start, ≤`MAX_CLIENTS`(500) |
| `--hold-scrapes <n>` | `10` | ≥4 (1 warm-up delta discarded + ≥2 usable for a growth judgment) |
| `--scrape-interval-ms <n>` | `1000` | ≥100 |
| `--move-rate <n>` | `5` | intents/sec/client; 5 ≈ 1 per `STEP_MS` = max useful accepted rate |
| `--queue-metric <name>` | ×2 defaults | repeatable; **absent family ⇒ fail loud**, never "no growth" |
| `--seed <u64>` | `0x5EED_0D20` | seeds masks, name suffixes, per-client phase offsets |
| `--run-id <string>` | **required** | injected wall-clock label; the driver never reads a clock |
| `--report <path>` | — | optional; default is stdout |

`--clients-start N --clients-max N` ⇒ exactly one level. **This is how G11 runs the fixed-concurrency pairing-on/off A/B.**

**Report schema (`schema:1`):**

```
{ "tool":"mr_load_driver", "schema":1, "run_id":…, "server":…, "db":…,
  "transport":…, "scenario":"movement", "step_ms":<game_core::STEP_MS>,
  "scrape_interval_ms":…, "hold_scrapes":…, "seed":…,
  "breaking_point": {"concurrency":K,"reason":"movement_tick_p95_over_step_ms"
                                            | "queue_growth:<family>"} | null,
  "not_reached": <bool>,
  "levels":[ {"concurrency":N,"scrapes":M,
              "movement_tick_p95_s":<f64>|null,"p95_state":"value|above_top|too_few|reset",
              "queues":{"<family>":[v0,v1,…]}, "queue_growth":["<family>",…],
              "enqueue_move_accepted_delta":…, "enqueue_move_rejected_delta":…,
              "movement_tick_txn_delta":…, "clients_connected":…, "send_errors":…,
              "valid":<bool>, "invalid_reason":null|"counter_reset"|"no_offered_load"} ],
  "notes":[…] }
```

Key order is fixed and asserted by a test. **No token, ever.**

---

## 4. Phases and task breakdown

### Phase 0 — Live wire-format probe (**orchestrator**, blocks Phase 1's §8 tests)

1. Start a scratch host from an empty data dir; `spacetime publish` the repo wasm to a scratch db (never `monster-realm`).
2. `POST /v1/identity` → record exact JSON shape; confirm `{identity, token}`; confirm the token is a JWT (drives the gitleaks fixture rule).
3. **Pin the SATS-JSON enum encoding over HTTP first** (cheap, no WS): `POST /v1/database/<db>/call/join_game` body `["Bot 1"]`; then `…/call/enqueue_move` with `[{"Step":{"East":[]}},1]`. Hypothesis is `{"Variant": <payload>}` with `[]` for unit variants. If it fails, try `{"Step":"East"}` and read the row back to confirm which encoding actually moved the character. **Do not conflate with `spacetime call`, which takes per-arg JSON literals — the HTTP body is a single JSON array.**
4. Pin the WS `ClientMessage` envelope: connect to `/v1/database/<db>/subscribe`, subprotocol `v1.json.spacetimedb`, `Authorization: Bearer`. Cheapest authoritative source: read the installed `@clockworklabs/spacetimedb-sdk` dist WS connect code (`client/src/net/connection.ts:553` already cites `dist/index.mjs:5765`, `:6226-6231`) — a browser cannot set headers, so whatever the SDK does is a header-free path our raw client can also use, and its `ClientMessage` serializer is the ground truth for `Subscribe`/`CallReducer`. Confirm the `args` field is a JSON string vs a raw value.
5. Confirm standalone is unthrottled (no energy/quota rejections at ~5 calls/s × 10 clients).
6. Record: exact envelopes, whether the `Authorization` header is accepted at handshake, whether `?connection_id=` is required, the observed `le` bucket bounds, and the full label set on `spacetime_txn_elapsed_time_sec_bucket`. **Tear down the scratch host/db.**

**Gate:** if step 4 fails but step 3 succeeds → the slice proceeds on `--transport hybrid` as the default-of-record, with `ws` shipped-but-unproven and marked as such in the report `notes` and the ADR amendment.

### Phase 1 — Tester (RED). Owns `#[cfg(test)] mod tests` + the file skeleton

The tester authors: module docs, all pure-fn signatures with `todo!()` bodies, and the complete test module. Tests are RED via `todo!()` panics. **The tester has no Bash — the orchestrator runs `cargo nextest run -p sim-harness` to prove RED** and records the failure count. `just lint` is expected red in this phase (dead_code / unused_variables on stubs); it is not the RED gate.

Test groups T1–T18 (see the plan table in the session log; binding on the tester):
T1 parse_args bounds & hold-scrapes≥4 · T2 chat-flood reserved (OBS-28) · T3 Prometheus parse + subset matching · T4 bucket bounds read from text (non-default bounds honored) · T5 p95 interpolation + AboveTop + TooFew + Reset · T6 monotonic growth (strict, noise-immune) · T7 breaking_point state machine (first crossing = K exactly; invalid never reported) · T8 evaluate_level validity guards · T9 render_report key order + escaping + no-token/no-Bearer · T10 budget == game_core::STEP_MS · T11 ramp_levels seeded property loop · T12 bot model (names pass validate_name rules; seq monotonic; deterministic) · T13 grass oracle via real apply_move on real zone-0 map · T14 b64 + WS frame codec vectors (125/126/65535/65536 boundaries) · T15 handshake request (token only in Authorization) · T16 extract_json_string_field incl. decoy-key fixture, non-JWT-shaped fixtures · T17 envelope builders == Phase-0-verified strings · T18 determinism: same inputs ⇒ byte-identical report.

### Phase 2 — Implementer (GREEN)

Fills bodies only; **never edits `mod tests`**. I1 config → I2 prom parser → I3 estimators → I4 ramp/verdict → I5 report → I6 bot model → I7 wire pure layer → I8 shell → I9 module docs. Per-step gate: `cargo nextest run -p sim-harness`; at I8 `just ci-fast sim-harness` fully green (clippy `-D warnings`, **zero `#[allow]`**, `cargo fmt`).

### Phase 3 — Live verification (**orchestrator**)

L1 scratch host + publish → L2 smoke 2-client ws run (report valid, accepted>0) → L3 full ramp 5→50 step 5; **record the OBS-27 outcome as evidence in the PR/handoff** (a `not_reached` result on a dev box is legitimate and must not be massaged) → L4 one `hybrid` + one `http` run to demonstrate the differential → L5 confirm no rejection-storm (D8) → L6 tear down.

### Phase 4 — Docs (ADR-0180 m20d amendment · ARCHITECTURE.md ×2 minimal edits · harness-spec annotation UNCOMMITTED for supervisor · CHANGELOG via commit message) and PR.

---

## 5. Anti-patterns (binding on tester + implementer)

1. Re-implementing game rules in the driver (bot fires blind; map touched only in a test oracle).
2. Hard-coding histogram bucket bounds or assuming a family exists (absent family = loud exit, never silent "no growth").
3. Any local stopwatch (no Instant/SystemTime, no #[allow], no "just for the report" timestamp — the timestamp is `--run-id`).
4. Unbounded threads/buffers (hard client cap, bounded frame drain, bounded read buffer, explicit stack size).
5. Parsing server messages beyond need (drain and discard; only `token` is parsed; accept/reject truth from S1 counters).
6. Misreading guard rejections as errors (D8) — own field, never blended, never a breach reason.
7. Reporting a breaking point off an invalid level.
8. Exact-label-set matching on Prometheus series (vacuous-green shape).
9. A JWT-shaped test fixture, or a token in the report/stdout/logs.
10. Weakening the determinism gate (no clippy.toml edit, no feature carve-out, no #[allow(clippy::disallowed_methods)]).
11. Scope leak into Cargo.toml/Cargo.lock/justfile/evals/** — STOP + escalate, not a quiet edit.
12. Treating an HTTP-mode number as the OBS-27 breaking point.

---

## 6. Risks and fallbacks

R1 WS CallReducer envelope wrong/intractable → Phase 0 pins it; fallback `--transport hybrid` default-of-record. · R2 handshake Authorization rejected → read installed TS SDK dist for the header-free path. · R3 server ping/idle-timeout closes bots → pong + close handling; dropping clients_connected annotated. · R4 wild-encounter content drift on live host → T13 (local) + rejected-delta spike ⇒ invalid (live). · R5 thread/port ceilings → MAX_CLIENTS=500, 256KiB stacks, cumulative ramp. · R6 detector never fires on dev box → `not_reached` legit outcome; raw series in report. · R7 gitleaks JWT-shaped fixture → non-JWT fixtures (T16 brief). · R8 spacetime-call vs HTTP arg-form confusion → both documented. · R9 one-file size → accepted, named follow-up. · R10 offered-load collapse at high N → surfaced in notes, not hidden.

---

## 7. Doc tasks

7a ADR-0180 dated body amendment (protocol-real-not-SDK-real deviation; D9 core intent preserved — all measurement off S1; http-mode caveat; named follow-up). · 7b ARCHITECTURE.md two minimal edits (sim-harness spine clause + ≤8-line load-driver section). · 7c harness spec §5 m20d row + D9 annotation — LEFT UNCOMMITTED for supervisor (m21b precedent). · 7d docs/knowledge — n/a (no schema/reducer). · 7e CHANGELOG via Conventional Commit only (use `git commit -F` heredoc; backticks in -m shell-expand).

## 8. Impact

Added: `sim-harness/src/bin/mr_load_driver.rs`. Edited: `docs/adr/0180-*.md` (append-only), `ARCHITECTURE.md` (2 small edits). Uncommitted (handoff): harness spec. NOT touched: lib.rs, world.rs, Cargo.toml, Cargo.lock, justfile, evals/**, .gitignore. Blast radius: zero inbound callers (both graphs + grep; evals name specific bins only). New bin only ADDS consumers of stable public game-core surface.

## 9. Recommended workflow pattern

Solo (tester ≠ implementer, orchestrator runs all Bash) + ONE scoped redteam pass on the T5/T6/T7/T8 tests after RED, before GREEN. Rationale: design space closed by verified hard constraints; the repo's dominant failure mode is green-but-vacuous gates, so adversarial budget goes to the detector/verdict tests that decide whether the OBS-27 number is real.
