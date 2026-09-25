# M-residual-backlog — the standing drain for deferred acceptance criteria

**Status: standing (never "closed").** Created 2026-08-22 by `lp-gates`.

## 1. Why this file exists

Measured across the corpus: **58.8% of uniquely-named slices live in a remediation milestone**;
**61%** of a 46-slice classified sample exist because an earlier slice left *declared* work undone;
and **12 of 18** named continuation slice ids (`14r-c-2`, `m20b-2`, `pt-c1b2`, …) **never got a spec
section at all**. The postmortem named the class RF-3, *"records are not queues"*: 130 defer/park
phrases across the ADR corpus, 45 ADRs with a Residuals section, **zero mechanical consumers**, mean
disclosure→remediation latency **13.1 days**.

The failure was never dishonesty — parks were declared, loudly and in writing. They were declared
into prose nothing consumed, and rediscovered weeks later by the most expensive detector available:
a whole new review milestone.

This file is the sink's drain. Every section below was **promoted mechanically** by
`mr-gates residuals promote` from a `DEFER:` line in a slice's acceptance ledger. The criterion text
is verbatim from the spec section it was deferred from, so promotion is a copy, not spec authoring.

## 2. Slices

*(Generated. `mr-gates residuals promote` appends here; `mr-record queue-add` schedules; the section
is closed when its criterion passes a gate in the slice that picks it up.)*

<!-- PROMOTED SECTIONS APPEND BELOW THIS LINE -->

### rb-123 — movement.rs RateLimiter::check has no source pin: a #[cfg(not(test))] twin of check return (from 20r-c CHECK-TWIN, deferred 2026-09-19)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 20r-c · residual: R-20r-c-CHECK-TWIN

Deferred with reason: Measured on 20r-c (2026-09-19): a cfg(not(test)) twin of crate::movement::RateLimiter::check that always returns Some(suppressed) keeps 978 tests + clippy + observability-log-wrapper green while every limiter (ENCOUNTER_TABLE_ERR, BEGIN_ENCOUNTER_ERR, LEAD_LEVEL_ERR, UNRECOGNIZED_ISSUER, QUEST_DEF_MISSING, QUEST_DEFS_LOAD_ERR) emits unbounded in production. movement.rs is outside 20r-c's touches; 

EARS: movement.rs RateLimiter::check has no source pin: a #[cfg(not(test))] twin of check returning Some(..) defangs all limiters in the shipped wasm CI-clean (red-team N7b)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-122 — raising_tests.rs:2167 RETUNE note 'the only pin of ESSENCE_SOFT_CAP value' is stale — game (from 20r-b B1, deferred 2026-09-19)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 20r-b · residual: R-20r-b-B1

Deferred with reason: 20r-b's own gate byte-pins battle_tests.rs/raising_tests.rs unmodified (EARS: existing reward/clamp tests stay green unmodified), so the wording fix cannot ride this slice; comment-only, no behaviour

EARS: raising_tests.rs:2167 RETUNE note 'the only pin of ESSENCE_SOFT_CAP value' is stale — game-core now pins 999/1000 boundaries too; reword to point at the currency.rs/content.rs RETUNE markers
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-121 — Settle-released locks drop keyboard focus to <body> on the no-batch paths (rejection / fro (from 20r-a FOCUS, deferred 2026-09-19)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 20r-a · residual: R-20r-a-FOCUS

Deferred with reason: 20r-a disables the clicked button synchronously; on a SUCCESSFUL action the next batch's replaceChildren already dropped focus on master, but on rejection/short-circuit master kept focus on the button and 20r-a now loses it (red-team Part 3). Fix: in each .finally release, if the view is visible and document.activeElement is body/outside root, focus the first re-enabled live button or the registry

EARS: Settle-released locks drop keyboard focus to <body> on the no-batch paths (rejection / frozen-link / dead-handle) for Train, Evolve and pvp lifecycle; overlay focus trap goes inert until a click
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-120 — Shipped Care lock (raisingView.ts careBtn listener) keeps the membership-keyed release and (from 20r-a CARE-GEN, deferred 2026-09-19)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 20r-a · residual: R-20r-a-CARE-GEN

Deferred with reason: Byte-pinned block (C4/C6 in raisingView.test.ts; keyboard-operable-rows eval cites its lines in prose) so 20r-a left it untouched and shipped the fixed shape beside it for Train (Map<bigint, object> generation token + new Promise((resolve) => resolve(cb()))). Port that shape to Care and re-pin C4/C6; ADR-0159 D1 amendment recommended in the same slice.

EARS: Shipped Care lock (raisingView.ts careBtn listener) keeps the membership-keyed release and the Promise.resolve(cb()) shape: a stale Care settle across hide()/reopen re-enables the live Care button while a second care is in flight, and a sync throw strands the lock until hide()
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-119 — [the operator alarm half — R-rb-85-X10, targeted to rb-87] WHEN the hourly export_bundle_r (from rb-87 X10, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-X10

Deferred with reason: the alarm consumes the line this slice creates and cannot precede it; its files (ops/observability/rules/recording.rules.yml, ops/observability/grafana/provisioning/alerting/*, ops/observability/checks/stack-config-checks*.mjs, evals/observability-stack-config.eval.mjs) are a distinct file family outside the inherited touches with their own rb-66/rb-84 test surface (a new rule or panel forces stac

EARS: [the operator alarm half — R-rb-85-X10, targeted to rb-87] WHEN the hourly export_bundle_reap line is absent for longer than two intervals, or a tick reports read at EXPORT_REAP_MAX_DELETE_PER_TICK or planned at EXPORT_REAP_MAX_STAMPS_PER_TICK for consecutive ticks, THE SYSTEM SHALL raise an operator alarm (Grafana unified alerting over the Loki/Prometheus feed), and export_bundle row/byte growth 
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-118 — [the execution proof] WHEN an expired synthetic export_bundle population is seeded into th (from rb-87 X9, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-X9

Deferred with reason: the same mechanism rb-85 and rb-86 recorded as R-rb-85-X9 (unpromoted, harness residual log): datastore_index_scan_range_bsatn is still undefined in server-module/src/native_host_tests.rs (a test path reaching the helper link-fails the WHOLE lib-test binary), datastore_delete_by_index_scan_point_bsatn aborts there, ctx.database_identity() is unstubbed, and no capturing log sink exists in the nativ

EARS: [the execution proof] WHEN an expired synthetic export_bundle population is seeded into the in-memory native host, one reaper tick executes under a capturing log sink, and the host log is read back THE SYSTEM SHALL contain exactly one `{"evt":"export_bundle_reap",…}` line whose read/planned/reaped counts equal the population's expired rows / stamps / deleted rows — RED on the pre-slice silent body
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-117 — docs/observability-dr-runbook.md §9 export section does not name the new evt=export_bundle (from rb-87 RUNBOOKEVT, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-RUNBOOKEVT

Deferred with reason: rb-87 plan §7: the runbook makes no observability claim about the reaper so nothing there is FALSE, but an operator reading §9.4 has no pointer to the hourly beat, its absence = abort-loop meaning, or the consecutive-tick backlog hint; evals/account-e2e.eval.mjs G24 pins §9's body, so the edit is a small runbook+eval slice

EARS: docs/observability-dr-runbook.md §9 export section does not name the new evt=export_bundle_reap beat or its dead-man semantics (G24 exact-body-checked, outside rb-87's touches)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-116 — No test anywhere proves an observability::mr_log line is DELIVERED: an early return inside (from rb-87 MRLOGDELIVERY, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-MRLOGDELIVERY

Deferred with reason: MEASURED by the rb-87 tests red-team (sandbox /tmp/rb-87-rt2):  as mr_log's first statement -> 969/969 green. rb-87's oracles compose through build_log_line, never through mr_log; the G7 census counts log::info! SITES, not reachability; observability.rs is outside rb-87's touches. The dead-man design (absence of the hourly export_bundle_reap beat = abort loop) therefore rests on the heartbeat pipe

EARS: No test anywhere proves an observability::mr_log line is DELIVERED: an early return inside mr_log silences every line crate-wide (the reaper beat, data_export, the heartbeat) and the 969-test server-module suite still passes
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-115 — export_bundle_reap's read/planned counts are a necessary-not-sufficient backlog HINT; the  (from rb-87 BACKLOGAMBIG, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-BACKLOGAMBIG

Deferred with reason: rb-87 plan reviewer M2 + ADR-0238 rb-87 amendment: planned==16 may be exactly-sixteen rather than truncated, read==256 may still have drained everything (whole-stamp deletes take tails, reaped can exceed read), and a saturated stamp cap can show read far below 256; exposing the pre-truncation count reshapes the equality-pinned rb-86 seam (plan_export_reap_stamps) and is its own slice; until then t

EARS: export_bundle_reap's read/planned counts are a necessary-not-sufficient backlog HINT; the exact signal (the window's distinct-stamp count BEFORE truncate(max_stamps)) is swallowed inside rb-86's frozen plan_export_reap_stamps
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-114 — ADR-0243 D10 sentence 'The same identifier census holds privacy.rs at one' is superseded b (from rb-87 ADR0243D10, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-87 · residual: R-rb-87-ADR0243D10

Deferred with reason: rb-87 plan §7/§9: the ADR-0238 rb-87 amendment records the supersession; a one-paragraph dated amendment on ADR-0243 (plus no header change — Amends: is not used) needs the supervisor to widen touches; a stale sentence in a decision record, not a code defect

EARS: ADR-0243 D10 sentence 'The same identifier census holds privacy.rs at one' is superseded by rb-87 (two emissions, attributed per body) and ADR-0243 is outside rb-87's touches
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-113 — [the execution proof] WHEN an oversized synthetic export_bundle population (several owners (from rb-86 X9, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-86 · residual: R-rb-86-X9

Deferred with reason: the same mechanism rb-85 recorded as R-rb-85-X9 (unpromoted, harness residual log): datastore_index_scan_range_bsatn is still undefined in server-module/src/native_host_tests.rs (a test path reaching the helper link-fails the WHOLE lib-test binary) and datastore_delete_by_index_scan_point_bsatn aborts there (native_host_tests.rs:452-458). Modelling the range scan (ordered by key) and the index-poi

EARS: [the execution proof] WHEN an oversized synthetic export_bundle population (several owners x ragged chunk counts, total > EXPORT_REAP_MAX_DELETE_PER_TICK) is seeded into the in-memory native host and one reaper tick executes THE SYSTEM SHALL delete whole bundles only — every owner's surviving row count is 0 or its full pre-tick count — RED on the pre-slice chunk-id delete body, GREEN on the whole-
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-112 — export_bundle_reaper write set is bounded in stamps, not rows (from rb-86 TICKBOUND, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-86 · residual: R-rb-86-TICKBOUND

Deferred with reason: rb-86 deletes whole bundles per creation stamp (EXPORT_REAP_MAX_STAMPS_PER_TICK = 16), so rb-85's 256-row DELETE cap is gone: rows per stamp are unbounded (a bundle can run to hundreds of chunks at EXPORT_CHUNK_ROWS) and sixteen large bundles are more rows than one tick used to delete. If a tick ever exceeds the transaction budget it aborts and retries the identical head-of-range work every hour, 

EARS: export_bundle_reaper write set is bounded in stamps, not rows
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-111 — same-millisecond export bursts form one reaper delete unit (from rb-86 SAMEMS, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-86 · residual: R-rb-86-SAMEMS

Deferred with reason: rb-86 keys the whole-bundle delete on created_at_ms; every bundle committed inside the same millisecond shares a stamp and is reaped in one index-point delete. request_data_export is cheap for a low-state anonymous identity and the host serialises reducers at millisecond granularity, so N same-millisecond exports expire as one unit seven days later — the per-tick write set is 16 stamps x (bundles 

EARS: same-millisecond export bursts form one reaper delete unit
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-110 — EXPORT_REAP_MAX_DELETE_PER_TICK is now a misnomer for the read window (from rb-86 READCAP-NAME, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-86 · residual: R-rb-86-READCAP-NAME

Deferred with reason: Since rb-86 the constant bounds only the rows the reaper DECODES per tick (the btree range read's .take); the write bound is EXPORT_REAP_MAX_STAMPS_PER_TICK. The name was kept because it is pinned in ~10 privacy_tests.rs clauses (rb48_reap_interval_and_batch_cap_pinned, the rb85 take-adjacent/body pins) and quoted in ADR-0238/ADR-0231/ARCHITECTURE.md; a rename is a crate-visible refactor with its 

EARS: EXPORT_REAP_MAX_DELETE_PER_TICK is now a misnomer for the read window
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-109 — [the spec's execution proof] WHEN an oversized synthetic export_bundle population (many ow (from rb-85 X9, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-85 · residual: R-rb-85-X9

Deferred with reason: a RED/GREEN test that EXECUTES the bounded read + delete over an oversized population needs server-module/src/native_host_tests.rs (outside rb-85's declared touches) to model datastore_index_scan_range_bsatn over the existing row store ordered by key (ascending) and datastore_delete_by_index_scan_point_bsatn; today the range syscall is undefined in the native host (a test reaching it fails the WHO

EARS: [the spec's execution proof] WHEN an oversized synthetic export_bundle population (many owners × ≥17 chunks × large payload_json) is seeded into the in-memory native host and one reaper tick executes THE SYSTEM SHALL complete without abort, materialise no more than EXPORT_REAP_MAX_DELETE_PER_TICK rows, and delete exactly the expired ones — RED on the pre-slice `.iter()` body, GREEN on the bounded 
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-108 — m22_declared_mod_names skips any mod whose name ends in tests without a cfg(test) check, s (from rb-85 MODCENSUS, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-85 · residual: R-rb-85-MODCENSUS

Deferred with reason: MEASURED by the rb-85 round-5 red-team re-probe: a NON-cfg(test) production module declared as pub(crate) mod reach_privacy_tests; (via #[path]) was invisible to accounts_tests.rs data_lifecycle_manifest_totality_bidirectional because m22_declared_mod_names (~accounts_tests.rs:3600) drops every name ending in tests on the suffix alone. rb-85 closed its own vector (the #[path] escape ban keeps such

EARS: m22_declared_mod_names skips any mod whose name ends in tests without a cfg(test) check, so a production module named *tests escapes the M22 manifest totality census
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-107 — No global admission control on request_data_export: unlimited anonymous identities x >=17  (from rb-85 EXPORTADMIT, deferred 2026-09-18)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-85 · residual: R-rb-85-EXPORTADMIT

Deferred with reason: rb-85 bounds the reaper's READ (btree range, .take(256)) but not the WRITE side of the sybil vector: join_game needs no JWT, so unlimited anonymous identities can each request an export (>=17 chunks, up to EXPORT_CHUNK_ROWS payload bytes) and storage grows without bound at ~361 bundles/day beyond the 256/h drain; the failure mode became bounded drain + unbounded growth. Needs a global/anonymous ad

EARS: No global admission control on request_data_export: unlimited anonymous identities x >=17 chunks outgrow the fixed 256/h reaper drain
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-106 — pvp accept_challenge is blanket-gated with no stamp-aware sibling: a deletion-gated target (from rb-83 CHALLENGELAUNDER, deferred 2026-09-12)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-83 · residual: R-rb-83-CHALLENGELAUNDER

Deferred with reason: rb-83 closed the trade_offer half with a cancel-time sweep (ADR-0252); pvp.rs is outside rb-83 touches and needs its own sweep or a stamp-aware accept gate (ADR-0252 Consequences)

EARS: pvp accept_challenge is blanket-gated with no stamp-aware sibling: a deletion-gated target can cancel, accept a post-request challenge while momentarily Active, and re-request (the CANCELLAUNDER shape for battle_challenge; bounded by the 2-minute CHALLENGE_TTL_MS)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-105 — accept_challenge still opens a NEW battle row naming a mid-grace CHALLENGER (A challenges  (from rb-76 CHALLENGERGRACE, deferred 2026-09-11)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-76 · residual: R-rb-76-CHALLENGERGRACE

Deferred with reason: ADR-0246 consequences + reducer-security-auditor + artifact red-team confirmed real: no cascade cancels outstanding battle_challenge rows at request time so the window is the full grace period; a naive challenger-state gate inside accept_challenge WOULD be an ADR-0227 D4 third-party oracle (B learns A's lifecycle state), so the non-oracle shape (disarm/consume the requester's outbound Pending chal

EARS: accept_challenge still opens a NEW battle row naming a mid-grace CHALLENGER (A challenges while Active, A requests deletion, B accepts -> start_pvp_battle inserts Ongoing battle with player_identity = A)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-104 — No reaper covers wild battle rows; a held second connection stalls a wild battle (from rb-73 WILD-HOLD, deferred 2026-09-11)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-73 · residual: R-rb-73-WILD-HOLD

Deferred with reason: battle.rs:1451-1453 says no scheduled reaper covers the wild battle/battle_wild row class; resolve_wild_battle_on_disconnect is the only resolver. PRE-EXISTING (never disconnect + never move stalls it identically today); ADR-0245's last-connection-out gate only changes the mechanism. A wild-battle idle reaper is its own slice.

EARS: No reaper covers wild battle rows; a held second connection stalls a wild battle
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-103 — Stolen-token holder can suppress a victim's disconnect cleanup by holding a live WS as the (from rb-73 TOKEN-WEDGE, deferred 2026-09-11)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-73 · residual: R-rb-73-TOKEN-WEDGE

Deferred with reason: Directional inverse of R-18r-b-DISCONNECTSELF: with last-connection-out gating (ADR-0245), a token holder who keeps a live socket open as the victim makes the victim's own disconnects skip cleanup. Trades/challenges fall to TTL reapers, PvP to the 60 s pvp_deadline_reaper; wild battles and player/character/player_conversation presence rows have no independent backstop while that socket lives (30 s

EARS: Stolen-token holder can suppress a victim's disconnect cleanup by holding a live WS as the victim
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-102 — A client_disconnected transaction abort strands a player_session row that no launch replay (from rb-73 ABORT-PHANTOM, deferred 2026-09-11)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-73 · residual: R-rb-73-ABORT-PHANTOM

Deferred with reason: reducer-security-auditor M-1 on ADR-0245: if on_disconnect's transaction aborts after its own-row delete (host energy/datastore failure; no reachable panic in the four resolvers or presence deletes today), the delete rolls back while the host still removes the st_client row, so the phantom keeps has_live_session true for that identity and every later disconnect skips cleanup. Durable and identity-

EARS: A client_disconnected transaction abort strands a player_session row that no launch replay drains
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-101 — DR runbook §9 documents row and backup retention caveats but not the operational log that  (from rb-65 RUNBOOK-LOGCAVEAT, deferred 2026-09-07)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-65 · residual: R-rb-65-RUNBOOK-LOGCAVEAT

Deferred with reason: docs/observability-dr-runbook.md §9/§9.1 (G24 exact-body-checked by evals/account-e2e.eval.mjs, outside rb-65's touches) names the non-purged Identity in 'multi-user or historical rows' and host backups/snapshots/WAL, but says nothing about the operational log: since rb-65 / ADR-0243 the deletion cascade emits one INFO line naming the erased identity (subject hex, no PII) that lives in Loki (reten

EARS: DR runbook §9 documents row and backup retention caveats but not the operational log that now names an erased subject
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-100 — [the screen-reader half of the same defect] WHEN a battle is PvP AND an opponent player na (from rb-59 X6, deferred 2026-09-06)
`touches: client/src/ui/battleView.ts, client/src/ui/battleView.test.ts`
`after:` — · source: rb-59 · residual: R-rb-59-X6

Deferred with reason: the PvP opponent-card header is the SCREEN-READER half of

EARS: [the screen-reader half of the same defect] WHEN a battle is PvP AND an opponent player name is available THE BATTLEVIEW SHALL name the opponent card's ROLE in its header text rather than rendering the rival's bare player name, so that the card's role reaches assistive technology and not only sighted users. TODAY `client/src/ui/battleView.ts:261` renders `${vm.pvpOpponentName}` alone, which is why
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-99 — [the SECOND, separable arm of the EARS line — "no DOM representation"] WHEN a sprite's act (from rb-57 X4, deferred 2026-09-06)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-57 · residual: R-rb-57-X4

Deferred with reason: a DOM/assistive-tech representation of sprite action needs client/src/render/characterView.ts (the Sprite; PixiJS v8 AccessibilitySystem reads sprite.accessible/accessibleTitle/accessibleType, natural home is CharacterView.update() on animation-key change), client/src/render/world.ts (enables the accessibility system on the Application and owns the CharacterView lifecycle), and client/e2e/golden.s

EARS: [the SECOND, separable arm of the EARS line — "no DOM representation"] WHEN a sprite's action changes THE CLIENT SHALL expose that action to assistive technology as a DOM/accessibility-tree representation (not merely as a baked-in visual glyph), so a screen-reader user perceives the action state.
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-98 — Skill ACCURACY is still hover-only in btn.title on the battle skill buttons (from rb-56 FOLLOWUP-ACC, deferred 2026-09-06)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-56 · residual: R-rb-56-FOLLOWUP-ACC

Deferred with reason: rb-56 moved the skill AFFINITY out of the hover-only btn.title into the visible button label, but narrowed the title to 'Acc <n>%' — so accuracy is now the ONLY thing left in the tooltip and is still invisible to no-hover, touch and screen-reader users. Same defect class as rb-56's own criterion, deliberately not widened into this slice. Fix is the same shape (append to the visible label) but need

EARS: Skill ACCURACY is still hover-only in btn.title on the battle skill buttons
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-97 — normalizeError is not total: unguarded .message / .length throw out of callers (from 17r-f B1-NORMALIZE-TOTAL, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-f · residual: R-17r-f-B1-NORMALIZE-TOTAL

Deferred with reason: MEASURED: client/src/ui/errorRing.ts:33-34 reads raw.message and :44 reads message.length OUTSIDE its own try/catch, so an Error whose message is undefined/null/a Symbol, a revoked Proxy, or a throwing message getter all throw — contradicting the function's own 'TOTAL, never throws' docstring. Every caller except the 17r-f frame catch is shielded by pushError's try/catch, so 17r-f guards locally; 

EARS: normalizeError is not total: unguarded .message / .length throw out of callers
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-96 — distinct frame faults collapse: identical .message, and double truncation at ERROR_MSG_MAX (from 17r-f B1-MSG-COLLAPSE, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-f · residual: R-17r-f-B1-MSG-COLLAPSE

Deferred with reason: TWO measured collapse paths now that a dedupe exists. (a) normalizeError keeps only .message, discarding .name and .stack, so two V8 TypeErrors with site-independent text ('Cannot read properties of undefined (reading x)') from different call sites in the frame body record once. (b) Ordering is truncate(512) -> prefix 'frame: ' -> push -> normalize again -> truncate(512), so a tagged frame error k

EARS: distinct frame faults collapse: identical .message, and double truncation at ERROR_MSG_MAX_LEN
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-95 — frame-error dedupe is a 1-deep exact-string memo, not a cap; interpolated messages defeat  (from 17r-f B1-DEDUPE-BOUND, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-f · residual: R-17r-f-B1-DEDUPE-BOUND

Deferred with reason: MEASURED: 200 frames throwing a11yCopy's "no entry for key '${key}'" over 7 rotating keys fill 64/64 ring slots, i.e. the full ADR-0172 D1 eviction the dedupe is justified as preventing — and that throw (client/src/ui/a11yCopy.ts:93, reached from the frame body via announcementsFor/t('a11y.world.region')) is the amendment's own motivating example. The honest fix is a bounded set or an ADR-0172-sty

EARS: frame-error dedupe is a 1-deep exact-string memo, not a cap; interpolated messages defeat it
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-94 — a11y one-shot announcement on the export incomplete->complete edge (from rb-53 E1, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-53 · residual: R-rb-53-E1

Deferred with reason: Needs a ui/a11yCopy.ts catalog entry and the live-region custody surface, both outside rb-53's touches. ADR-0231 A3 defers it by name; sibling of R-rb-52-GRACEANNOUNCE.

EARS: a11y one-shot announcement on the export incomplete->complete edge
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-93 — Promote the privacy surface to a top-level menu leaf + documented hotkey (from rb-52 MENULEAF, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-52 · residual: R-rb-52-MENULEAF

Deferred with reason: rb-52 reaches the privacy surface from a button in the Account & Sign-in overlay, not a menu leaf (ADR-0231 A2-D5). The better-discoverability version needs client/src/ui/menuModel.ts (a MenuLeafId + system leaf), client/src/ui/helpModel.ts (a CONTROLS glyph) AND docs/PLAYTEST.md, whose Controls table is bidirectionally set-equality gated against CONTROLS by ui/playtestControlsDoc.test.ts. docs/PL

EARS: Promote the privacy surface to a top-level menu leaf + documented hotkey
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-92 — One-shot AT announcement on the active->grace deletion edge (from rb-52 GRACEANNOUNCE, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-52 · residual: R-rb-52-GRACEANNOUNCE

Deferred with reason: rb-51 ADR-0231 A1-D4's named follow-up, re-deferred once: not part of rb-52's E1 (delete/cancel controls + terminal notice) and it is an M23 a11y rule about rb-51's HUD banner, not this overlay. Needs client/src/ui/announcements.ts plus the a11yCopy entry it implies.

EARS: One-shot AT announcement on the active->grace deletion edge
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-91 — claimView's five original buttons ship blank and display:none (from rb-52 CLAIMBTNS, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-52 · residual: R-rb-52-CLAIMBTNS

Deferred with reason: MEASURED with the real ClaimView under happy-dom during rb-52's plan red-team: ensureElement creates every node display:none and claimView.render() never un-hides or labels the five buttons, so they ship invisible while a programmatic .click() still fires them. #claim-signin-btn is also claimView's initialFocusSelector, so opening the claim overlay focuses a display:none node (a silent no-op in a 

EARS: claimView's five original buttons ship blank and display:none
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-90 — [M23 A11Y ledger gap] WHEN the pressed overlay is already open and focus is inside it THE  (from 17r-d B2, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-d · residual: R-17r-d-B2

Deferred with reason: Post-A1 the self toggle-close SUCCESS half is covered only at the unit tier (main.a11yFocus.test.ts:587 S5T-GATE-SAMEKEY-CLOSE, :652 S5T-GATE-REOPEN-AFTER-SAMEKEY-CLOSE). A11Y-19's old 'or toggle' clause was the only acceptance-tier mention and it necessarily inverted in this slice. Adding a new A11Y-* id is scope creep for a doc-only wording-alignment slice; the M23 owner should mint one.

EARS: [M23 A11Y ledger gap] WHEN the pressed overlay is already open and focus is inside it THE SYSTEM SHALL close it on the same key — no A11Y-* acceptance criterion asserts this post-ADR-0206-A1
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-89 — Five present-tense citations of overlayA11y.ts contract (a) go stale the moment 17r-e land (from 17r-e VIEWHDR, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-e · residual: R-17r-e-VIEWHDR

Deferred with reason: red-team MEDIUM + desync-guard NIT. battleView.ts:29-30, boxView.ts:29-30, raisingView.ts:30-31, evolutionView.ts:40-41 each say overlayA11y.ts's contract (a) 'says the four #app-mounted views share ONE root'; ARCHITECTURE.md:1908 (the m23-s1 block) says the same. After 17r-e's retraction contract (a) says the opposite, so all five are false present-tense claims about the CURRENT content of overla

EARS: Five present-tense citations of overlayA11y.ts contract (a) go stale the moment 17r-e lands
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-88 — focusTrap.ts:58-62 still carries the retracted close-before-open instruction as a LIVE pre (from 17r-e E3, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-e · residual: R-17r-e-E3

Deferred with reason: desync-guard MEDIUM. client/src/ui/focusTrap.ts:58-62 independently repeats the falsehood 17r-e retracted: 'overlayA11y.ts keys its record by OverlayId, not by root, so an S4 wiring that opens the next id BEFORE closing the previous one installs TWO capture listeners on ONE node ... S4 must close-before-open.' Refuted by focusTrap.ts:150 itself (installTrap attaches to the passed root, and the fou

EARS: focusTrap.ts:58-62 still carries the retracted close-before-open instruction as a LIVE prescription
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-87 — export_bundle_reaper emits no observation on a tick (privacy.rs bans logging; no owning ca (from rb-48 OBS, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-48 · residual: R-rb-48-OBS

Deferred with reason: ADR-0238 D6/R-rb-48-OBS: privacy.rs header contract bans logging in-module and no other module owns the scheduled reducer's calling context; needs a crate-level decision (observability.rs hook or lifting the ban for scheduled reducers)

EARS: export_bundle_reaper emits no observation on a tick (privacy.rs bans logging; no owning caller module) — abort loops and backlogs are invisible
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-86 — global 256/tick cap can leave a bundle k-of-N deleted for up to an hour; client assembler  (from rb-48 PARTIALREAP, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-48 · residual: R-rb-48-PARTIALREAP

Deferred with reason: ADR-0238 R-rb-48-PARTIALREAP (security M2 / desync N2): drain rate ~360 bundles/day; unreachable today (no client subscribes to my_export_bundle). Follow-up: one-shot ScheduleAt::Time drain when a tick returns exactly the cap, or per-request atomic reap — either reshapes and re-pins the frozen reaper body

EARS: global 256/tick cap can leave a bundle k-of-N deleted for up to an hour; client assembler reads it as 'incomplete' (a wait that never resolves until the next tick)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-85 — hourly export_bundle().iter() materialises every payload_json under the global write lock; (from rb-48 SCANCOST, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-48 · residual: R-rb-48-SCANCOST

Deferred with reason: ADR-0238 R-rb-48-SCANCOST (security audit M1): cost driver is payload bytes not row count; if the scan exceeds the transaction budget the reaper aborts every tick silently. Remediation: #[index(btree)] on ExportBundle.created_at_ms + bounded range read, or an operator alarm on export_bundle rows/bytes

EARS: hourly export_bundle().iter() materialises every payload_json under the global write lock; inflatable by anonymous sybil exports (>=17 chunks each, no JWT needed)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-84 — ops/observability/rules/recording.rules.yml SLO roster neither allowlists nor explicitly e (from rb-48 SLOCLASS, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-48 · residual: R-rb-48-SLOCLASS

Deferred with reason: reviewer m3: the file lists three deliberately-excluded scheduled functions so exclusions are auditable; two reapers are now in neither list. Outside rb-48's touches — classify both in a follow-up

EARS: ops/observability/rules/recording.rules.yml SLO roster neither allowlists nor explicitly excludes export_bundle_reaper (nor rb-24's account_deletion_reaper)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-83 — [by-design admit — spec-change class] WHEN a deletion-gated identity cancels its deletion, (from rb-47 CANCELLAUNDER, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-47 · residual: R-rb-47-CANCELLAUNDER

Deferred with reason: rb-47 ADR-0237 D7/Consequences: Flow B — cancel_account_deletion clears the stamp and status, so the stamp-conditioned gate correctly admits; the re-request stamps a fresh t_req and restarts the full grace period. Only a policy that binds a re-request to the ORIGINAL deadline would close it — spec change.

EARS: [by-design admit — spec-change class] WHEN a deletion-gated identity cancels its deletion, accepts a pending offer, lets the initiator confirm, and re-requests deletion THE SYSTEM currently admits the swap (it is trading while Active)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-82 — 17r-e claims 2+3: the two .ron comment falsehoods stay unfixed (content-hash coupling) (from 17r-e B1, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 17r-e · residual: R-17r-e-B1

Deferred with reason: 070-wave3.ron:17 ('Electric resists nothing but its own mirror' — type_chart.ron:9 Electric->Electric 0.5x AND :25 Water->Electric 0.5x, so it resists BOTH) and 071-wave3-derived.ron:36 ('Tempestrix owns the Regeneration pivot' — THREE species carry ability: Some(3): 000-core.ron:24 Sproutlet, 020-playtest-wave1.ron:64 Stoneward, 051-wave2-derived.ron:39 Tempestrix). evals/content-version.eval.mjs

EARS: 17r-e claims 2+3: the two .ron comment falsehoods stay unfixed (content-hash coupling)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-81 — [census shape gap — NOT rb-47] WHEN a reducer file other than trading.rs gains a new #[spa (from rb-47 ROSTER-PVP, deferred 2026-09-05)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-47 · residual: R-rb-47-ROSTER-PVP

Deferred with reason: rb-47 artifact red-team A4: a byte-identical ungated twin reducer (respond_trade_v1) passed every existing census (m22-s5 gated-set + already-open list constrain only the names they enumerate) and evals/trade-reducer-security (hard-coded name list). rb-47 added rb47_trading_reducer_roster_is_closed for trading.rs only; pvp.rs / battle.rs / economy.rs / ranking.rs keep the enumerating shape. Candid

EARS: [census shape gap — NOT rb-47] WHEN a reducer file other than trading.rs gains a new #[spacetimedb::reducer] THE SYSTEM SHALL fail a closed-roster test naming the file (today only trading.rs has one)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-80 — [§4.7 trigger-predicate completeness — NOT rb-46] WHEN raising::heal_party, npc::advance_d (from rb-46 ERASEWRITERS, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-46 · residual: R-rb-46-ERASEWRITERS

Deferred with reason: reducer-security-auditor finding on rb-46: the §4.7 trigger predicate (every reducer writing an ERASE/ANONYMIZE/JOIN_ONLY table) also selects heal_party (raising.rs ~:300, spend_currency + consume), advance_dialogue (npc.rs ~:324, grant_item/grant_currency at quest turn-in) and taming.rs ~:295 grant_item; none is gated and all three files are outside rb-46's declared touches; §4.7 names only shop 

EARS: [§4.7 trigger-predicate completeness — NOT rb-46] WHEN raising::heal_party, npc::advance_dialogue (quest turn-in grants) or the taming recruit grant_item path writes an ERASE-policy table (player_wallet/inventory) for a mid-grace or terminal caller THE SYSTEM SHALL refuse before the write (or the PRV1-7 mechanism SHALL classify each deliberately)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-79 — [m22-s5 pin hardening — NOT rb-46] WHEN a #[cfg(test)]/#[cfg(debug_assertions)] attribute  (from rb-46 TRADINGCFG, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-46 · residual: R-rb-46-TRADINGCFG

Deferred with reason: rb-46's plan red-team measured that a #[cfg(test)] on trading.rs:252's gate statement passes every m22-s5 pin (m22s5_assert_deletion_gate_pinned / m22s5_gate_precedes_first_write_in_every_gated_reducer carry no cfg clause; the census bans only cfg_attr) while the wasm ships ungated; pvp.rs's two sites are incidentally covered by ranking-security's body-wide #[cfg ban. trading_tests.rs is outside r

EARS: [m22-s5 pin hardening — NOT rb-46] WHEN a #[cfg(test)]/#[cfg(debug_assertions)] attribute or a non-statement-boundary predecessor precedes the propose_trade deletion-gate statement THE SYSTEM SHALL fail the trading_tests pin (the rb-46 statement-boundary + #[/cfg!( + early-exit clauses ported to trading_tests.rs)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-78 — [reviewer-checklist class, ADR-0224] WHEN a macro_rules! that expands to a conditional ear (from rb-46 MACRORET, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-46 · residual: R-rb-46-MACRORET

Deferred with reason: rb-46's artifact red-team closed the depth-0 early-return twin (sender-keyed or cfg-const-keyed) with a prefix count(return)==count(return Err(e);) clause; a macro expanding to the return is the disclosed remainder — a scanner is barred by ADR-0224, so this is a reducer-security-auditor checklist item until the PRV1-7 crate-wide mechanism decides otherwise

EARS: [reviewer-checklist class, ADR-0224] WHEN a macro_rules! that expands to a conditional early return is placed above a deletion-gate call site THE SYSTEM SHALL be caught at review (no textual return, so the rb-46 early-exit clause cannot see it)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-77 — [reviewer-checklist class, ADR-0224] WHEN lib.rs selects the guards module by #[cfg(target (from rb-46 LIBRSMOD, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-46 · residual: R-rb-46-LIBRSMOD

Deferred with reason: rb-46 artifact red-team PoC X4 (executed): #[cfg(not(target_arch = wasm32))] mod guards; + #[cfg(target_arch = wasm32)] #[path = guards_wasm.rs] mod guards; in lib.rs leaves all 8 rb46 tests and the m22-s5 byte-for-byte guards.rs pin green; lib.rs is outside rb-46's touches and the edit is visible in the touches-delta audit, so it is a supervisor/reviewer checklist item, not a scanner (ADR-0224)

EARS: [reviewer-checklist class, ADR-0224] WHEN lib.rs selects the guards module by #[cfg(target_arch)] (a wasm-only guards twin) THE SYSTEM SHALL be caught at review — every pin on the real guards.rs stays green while the wasm build swaps the wrapper
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-76 — [grass-path wild encounter — NOT rb-46] WHEN movement_tick → begin_encounter opens a wild  (from rb-46 GRASSPATH, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-46 · residual: R-rb-46-GRASSPATH

Deferred with reason: movement.rs is outside rb-46's touches; the caller there is the scheduler (ctx.sender() = database identity) so the caller-only wrapper is structurally wrong and an identity-parameterised gate is exactly what ADR-0227 D2 made unwritable; joined to the [DEL-06]/S6 enforcement residual (ARCHITECTURE.md:524-526) for the PRV1-7 crate-wide slice (ADR-0236 D-d)

EARS: [grass-path wild encounter — NOT rb-46] WHEN movement_tick → begin_encounter opens a wild battle for a walker whose account is mid-grace or terminal THE SYSTEM SHALL decide (design) whether that is a §4.7 new commitment and, if so, refuse it via an identity-parameterised seam
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-75 — ARCHITECTURE.md per-slice ADR next-free notes are non-monotonic and some were back-edited (from 18r-b LOGORDER, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 18r-b · residual: R-18r-b-LOGORDER

Deferred with reason: Red-team MEASURED two entries rewritten by a later unrelated slice: M15a added in PR 165 and rewritten next day by PR 168; ux2 added in PR 255 and rewritten by PR 273. Also non-monotonic adjacent pairs at 1502 vs 1722, 1868 vs 1870, 2146 vs 2148. 18r-b CUT its planned explanatory clause because no true general rule over the class survived measurement.

EARS: ARCHITECTURE.md per-slice ADR next-free notes are non-monotonic and some were back-edited
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-74 — Unmeasured stale server-module/src/lib.rs line citations across at least 9 doc sites (from 18r-b LIBRSCITES, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 18r-b · residual: R-18r-b-LIBRSCITES

Deferred with reason: m22-s3b extracted resolve_all_live_interactions and shifted on_disconnect, so ranges cited before that merge are suspect. Candidates NOT measured by 18r-b: docs/adr/0230 at 132 and 135, docs/adr/0221 at 94, docs/adr/0054 at 37 and 238, docs/m8.7b-plan.md at 7 and 54, docs/m8.7d-plan.md at 19, docs/specs/nh2-plan.md at 73, docs/adr/0148 at 188. Most live under docs/adr so closing the class needs a 

EARS: Unmeasured stale server-module/src/lib.rs line citations across at least 9 doc sites
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-73 — Disconnect side effects are client-triggerable on demand by any identity token holder (from 18r-b DISCONNECTSELF, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 18r-b · residual: R-18r-b-DISCONNECTSELF

Deferred with reason: reducer-security-auditor observation while verifying the driver comment. One HTTP reducer call opens and closes an ephemeral connection, firing client_disconnected and force-resolving that identity live trades, PvP battle as a forfeit, and wild battle, without dropping its WebSocket. Strictly self-directed so not privilege escalation, but it is a token-leak amplifier and means disconnect is not a 

EARS: Disconnect side effects are client-triggerable on demand by any identity token holder
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-72 — ADR-0232 at 47-50 misattributes the disconnect row deletes to resolve_all_live_interaction (from 18r-b ADR0232MECH, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 18r-b · residual: R-18r-b-ADR0232MECH

Deferred with reason: reducer-security-auditor finding. The resolver bundle performs no row write itself, per its own doc comment; the player and character deletes live in the on_disconnect body. Harmless to that ADR conclusion, wrong about the mechanism. ADR-0232 is outside 18r-b touches.

EARS: ADR-0232 at 47-50 misattributes the disconnect row deletes to resolve_all_live_interactions
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-71 — docs/m8.5c-plan.md:85 cites AGENTS.md:8 for a bullet that lives at AGENTS.md:7 (from 18r-b B1, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: 18r-b · residual: R-18r-b-B1

Deferred with reason: Same defect class as 18r-b item 4, found while measuring it. Outside this slice declared touches set, so not fixed here. One-line doc fix.

EARS: docs/m8.5c-plan.md:85 cites AGENTS.md:8 for a bullet that lives at AGENTS.md:7
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-70 — X10-extends-vocabulary-unmodelled (from rb-42 X10-extends-vocabulary-unmodelled, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-42 · residual: R-rb-42-X10-extends-vocabulary-unmodelled

Deferred with reason: `scripts/adr-digest.mjs` gives

EARS: X10-extends-vocabulary-unmodelled
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-69 — X9-harness-spec-false-premise (from rb-42 X9-harness-spec-false-premise, deferred 2026-09-04)
`touches: specs/monster-realm-v2/M-residual-backlog.spec.md, scripts/tests/invariants.test.mjs, memory/projects/monster-realm-rb-69-plan.md`
`after:` — · source: rb-42 · residual: R-rb-42-X9-harness-spec-false-premise

Deferred with reason: `specs/monster-realm-v2/M-residual-backlog.spec.md`

EARS: X9-harness-spec-false-premise
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-68 — ADR-0230's PRV1-17 evidence sentence ('accounts.rs has zero log::/mr_log calls') is false  (from rb-40 ADR0230, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-40 · residual: R-rb-40-ADR0230

Deferred with reason: ADR-0230:114-117 records 'server-module/src/accounts.rs contains zero log::/mr_log calls of its own (measured)' as PRV1-17's evidence chain. Since rb-40 (ADR-0235) accounts.rs carries exactly one observability::mr_log call, inside complete_guest_claim, pinned at 1 file-wide by rb40 [emit/count-in-file]. PRV1-17 itself still holds (its SHALL names delete_account, cancel_account_deletion and the rea

EARS: ADR-0230's PRV1-17 evidence sentence ('accounts.rs has zero log::/mr_log calls') is false since rb-40
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-67 — ADR-0220 Decision 2 still spells the pre-rb-40 purge_export_bundles signature (from rb-40 ADR0220, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-40 · residual: R-rb-40-ADR0220

Deferred with reason: ADR-0220 Decision 2 spells purge_export_bundles(ctx: &ReducerContext, owner: Identity) with no return type and cites privacy.rs:33-44; since rb-40 (ADR-0235) the helper returns usize and lives at privacy.rs ~:59-80. ADR-0235 uses Extends (not Amends) because an Amends marker forces a reciprocal Amended-by edit inside 0220, outside the reserved-number allowance. Prose-only and CI-neutral (the diges

EARS: ADR-0220 Decision 2 still spells the pre-rb-40 purge_export_bundles signature
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-66 — No Grafana panel or alert consumes evt=guest_claim_export_purge (from rb-40 DASH, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-40 · residual: R-rb-40-DASH

Deferred with reason: rb-40 emits {evt:guest_claim_export_purge, guest:<hex>, chunks:N} once per successful guest claim via observability::mr_log. ops/observability/** is outside rb-40's touches, so no dashboard panel, recording rule or alert consumes the event; it is queryable in Loki under the bounded {reducer, evt} label set (config.alloy stage.labels), which is the shipped consumption path. Follow-up: a Grafana sta

EARS: No Grafana panel or alert consumes evt=guest_claim_export_purge
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-65 — The deletion cascade and request_data_export discard the purge count; cascade-wide erasure (from rb-40 CASCADE, deferred 2026-09-04)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-40 · residual: R-rb-40-CASCADE

Deferred with reason: purge_export_bundles now returns the purged chunk count (rb-40, ADR-0235) but the m22-s3b deletion-cascade site (accounts.rs account_deletion_reaper) and request_data_export's purge-before-write (privacy.rs) discard it. Cascade-wide observability is its own design: thirteen delegated erase_*/anonymize_* steps want ONE line, not thirteen, it touches every owning module, and PRV1-20 bars any line at

EARS: The deletion cascade and request_data_export discard the purge count; cascade-wide erasure observability is undesigned
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-64 — privacy_tests.rs local write-attribution copy still uses the weaker rb22p ;-boundary rule (from rb-39 PRIVACY-LOCAL-PORT, deferred 2026-09-03)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-39 · residual: R-rb-39-PRIVACY-LOCAL-PORT

Deferred with reason: rb-39 hardened the SHARED write_target_accessors (rooted receiver-chain walk, ADR-0234) but privacy_tests.rs keeps its local rb22p_write_targets (rfind + ;-poison) per the per-module local-copy convention. reducer-security-auditor MEASURED on rb-39: a same-statement foreign write in a NEW privacy.rs fn (if ctx.db.export_bundle()...is_some(){db.account().identity().delete(v)}) is misattributed to e

EARS: privacy_tests.rs local write-attribution copy still uses the weaker rb22p ;-boundary rule
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-63 — A11Y-27's RENDERER arm SHALL be honoured end to end in a real browser — the OS (from rb-38 E1, deferred 2026-09-03)
`touches: client/playwright.config.ts, client/e2e/a11y.spec.ts, client/e2e/reduced-motion.spec.ts, evals/ci-gate-wiring.eval.mjs, .github/workflows/nightly.yml, justfile`
`after:` — · source: rb-38 · residual: R-rb-38-E1

Deferred with reason: HIDDEN DEPENDENCY (a touches-set scoping outcome, not slice sizing).

EARS: A11Y-27's RENDERER arm SHALL be honoured end to end in a real browser — the OS
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-62 — overlayA11yWiring.test.ts:289-296 carries the stale main.ts:1574 citation plus a meta-cita (from rb-36 R-rb36-WIRINGCITE, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-36 · residual: R-rb-36-R-rb36-WIRINGCITE

Deferred with reason: Same citation-drift class as rb-36. client/src/ui/overlayA11yWiring.test.ts is outside rb-36's declared touches: set. Prose-only comment, no assertion, CI-neutral. Its line 294 says the other two sites are 'flagged, not touched' — rb-36 touched them, so that sentence is now false. Fix: retarget to the M12d store.onBatchApplied listener landmark, same treatment as rb-36.

EARS: overlayA11yWiring.test.ts:289-296 carries the stale main.ts:1574 citation plus a meta-citation that rb-36's own edit falsifies
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-61 — main.a11yFocus.test.ts:782 carries the same stale main.ts:1574 citation (from rb-36 R-rb36-FOCUSCITE, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-36 · residual: R-rb-36-R-rb36-FOCUSCITE

Deferred with reason: Same citation-drift class as rb-36; client/src/main.a11yFocus.test.ts is outside rb-36's declared touches: set. Rationale comment inside a test body, not an assertion; CI-neutral. Fix: same landmark treatment.

EARS: main.a11yFocus.test.ts:782 carries the same stale main.ts:1574 citation
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-60 — docs/adr/0206:194 carries the same stale main.ts:1574 citation (from rb-36 R-rb36-ADR0206CITE, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-36 · residual: R-rb-36-R-rb36-ADR0206CITE

Deferred with reason: Same citation-drift class as rb-36. docs/adr/** is admitted to a slice only for its own reserved ADR number and rb-36 had none reserved, so this existing ADR was outside the admitted set. ADR body prose; the adr-digest gate is header-only so CI cannot see it. Fix: same landmark treatment. Sweep all three R-rb36-* together.

EARS: docs/adr/0206:194 carries the same stale main.ts:1574 citation
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-59 — battle card borders (#844/#484 red/green pair) are the same colour-only defect class one s (from m23-s8 postmerge-border, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge-border

Deferred with reason: S8 did not survey this area; S9 should not read it as cleared

EARS: battle card borders (#844/#484 red/green pair) are the same colour-only defect class one screenful away from S8's fix
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-58 — client fallback token has only 2 chars of entropy after its '?' prefix (from m23-s8 postmerge-fallback, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge-fallback

Deferred with reason: found during review, low severity, not core to A11Y-29

EARS: client fallback token has only 2 chars of entropy after its '?' prefix
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-57 — canvas sprite ACTION_TINT (client/src/render/placeholderAssets.ts:15) still colour-only, n (from m23-s8 postmerge-tint, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge-tint

Deferred with reason: declared out of scope by spec section 8.2 default (a); tracked art residual per X10

EARS: canvas sprite ACTION_TINT (client/src/render/placeholderAssets.ts:15) still colour-only, no DOM representation
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-56 — skill affinity exposed only via btn.title (battleView.ts:308), not a persistent visible cu (from m23-s8 postmerge-title, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge-title

Deferred with reason: found during review, out of S8's declared scope

EARS: skill affinity exposed only via btn.title (battleView.ts:308), not a persistent visible cue
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-55 — the five status a11y tokens are duplicated between game-core content.rs and client battleM (from m23-s8 postmerge-tsdup, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge-tsdup

Deferred with reason: dedup deferred, not core to A11Y-29 acceptance

EARS: the five status a11y tokens are duplicated between game-core content.rs and client battleModel.ts
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-54 — content-pipeline validation runs at CI time, not content-sync time — a new enum variant fa (from m23-s8 postmerge, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s8 · residual: R-m23-s8-postmerge

Deferred with reason: idiomatic fix is a sibling validator in server-module/src/content.rs, out of m23-s8 touches

EARS: content-pipeline validation runs at CI time, not content-sync time — a new enum variant fails CI rather than validate_content
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-53 — [PRV1-11/12/13 live transport + download] WHEN request_data_export completes THE CLIENT SH (from m22-s8 X11, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s8 · residual: R-m22-s8-X11

Deferred with reason: the export transport needs `'SELECT * FROM my_export_bundle'` in `client/src/net/connection.ts`, whose subscription set is exact-set pinned by `evals/monster-privacy.eval.mjs:1292-1319` (`EXPECTED_SUBSCRIPTIONS`, check `[S/set]`) — a file OUTSIDE this slice`s declared `touches: client/**`. That eval invites the edit by name ("a deliberate eval edit … in the PR that privacy-reviews it"), so this is

EARS: [PRV1-11/12/13 live transport + download] WHEN request_data_export completes THE CLIENT SHALL read my_export_bundle from a live subscription, assemble it via assembleExportBundle, and offer the artifact as a downloadable file
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-52 — [PRV1-3/PRV1-4 UI surface] WHEN the player opens the privacy surface THE CLIENT SHALL expo (from m22-s8 X10, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s8 · residual: R-m22-s8-X10

Deferred with reason: same overlay fan-out as X9; the reducer call sites live in `client/src/main.ts`, which this slice does not touch (grep confirms ZERO occurrences of deleteAccount/cancelAccountDeletion/requestDataExport in client/src outside module_bindings today, so no half-reachable state ships). The decision core is gated HERE by X2/X3/X4. Successor slice id: m22-s8b.

EARS: [PRV1-3/PRV1-4 UI surface] WHEN the player opens the privacy surface THE CLIENT SHALL expose reachable delete/cancel controls wired to conn.reducers and render the distinct terminal notice once terminal_at_ms is Some
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-51 — [PRV1-1 UI surface] WHEN the deletion grace window is live THE PLAYER SHALL see a ticking  (from m22-s8 X9, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s8 · residual: R-m22-s8-X9

Deferred with reason: the live countdown needs `client/src/ui/privacyView.ts` + a `main.ts` frame tick + the `deletion_grace_ms_default()` wasm read (`client/src/main.ts` is the repo`s SOLE importer of `client-wasm/pkg`). One new `client/src/ui/*View.ts` is mechanically forced into ~17 files by OR-MANIFEST-COMPLETE (`client/src/ui/overlayRegistry.test.ts:184`, an exact readdir-derived set) plus the menu/a11y/index.html

EARS: [PRV1-1 UI surface] WHEN the deletion grace window is live THE PLAYER SHALL see a ticking countdown to the reaper fire in a rendered surface (DOM shell + main.ts frame tick + the deletion_grace_ms_default() wasm read)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-50 — [mechanical CI enforcement of PRV1-17/PRV1-20] WHEN a future edit adds a log line naming a (from m22-s7 X8, deferred 2026-09-02)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s7 · residual: R-m22-s7-X8

Deferred with reason: the spec's named vehicle (evals/account-privacy.eval.mjs seed-set extension) is both outside this slice's declared touches AND retired as a category by ADR-0224. The correct replacement is an in-crate #[test] in server-module/src/accounts_tests.rs asserting the reject-reason constants reachable from the three reducers are &'static str and that the cascade body contains no log call — which requires

EARS: [mechanical CI enforcement of PRV1-17/PRV1-20] WHEN a future edit adds a log line naming a player-authored or pre-tombstone field to any deletion-path reducer THE SYSTEM SHALL fail CI. The property is true today (X6/X7); nothing enforces it mechanically.
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-49 — [PRV1-7 crate-wide enforcement, [DEL-06]] WHEN a reducer writes any manifest-classified ta (from m22-s3b X18, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s3b · residual: R-m22-s3b-X18

Deferred with reason: the [DEL-06] enforcement MECHANISM needs the supervisor's ADR-0224 ruling (no new eval scanners; syn-based check vs reviewer-checklist are the candidates, per ADR-0225); its natural home is the M22 S6 evals slice once ruled. The S5 gate call sites already landed (PR #406), and this slice added the set_profile_name call site; join_game (movement.rs, out of touches) is named in ADR-0228 as the known

EARS: [PRV1-7 crate-wide enforcement, [DEL-06]] WHEN a reducer writes any manifest-classified table outside STATE_TRANSITION_OWNERS THE SYSTEM SHALL require a preceding should_reject_for_deletion guard call, mechanically enforced.
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-48 — X17 (from m22-s4 X17, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s4 · residual: R-m22-s4-X17

Deferred with reason: PRV1-14 export TTL reaper (target slice: S4b). A scheduled(...) table is automigration-frozen (ADR-0221), so table + reducer must ship atomically, and the table forces schema.rs (DATA_LIFECYCLE_MANIFEST set-equality, accounts_tests.rs:3508+), evals/baselines/table-schemas.json and evals/battle-schema-snapshot.eval.mjs T-VIS-ANCHORS — all out of the declared touches (the ADR-0225 defer shape). No R

EARS: X17
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-47 — [PRV1-9 completeness — confederate role-swap, NOT this slice] WHEN a trade offer NAMING a  (from m22-s5 X13, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s5 · residual: R-m22-s5-X13

Deferred with reason: reducer-security-auditor M1 (m22-s5 impl review): D requests deletion, confederate C proposes a trade TO D (caller-only gate passes for C by design/D4), D calls the ungated respond_trade(accepted=true), C confirms — a new commitment consummated mid-grace. Out of m22-s5 by the slice brief's explicit "do not touch reducers that only act on an already-open interaction", AND the precise fix needs desi

EARS: [PRV1-9 completeness — confederate role-swap, NOT this slice] WHEN a trade offer NAMING a deletion-gated identity as counterparty was created AFTER that identity's deletion request THE SYSTEM SHALL reject that identity's accepting response before any write (offers predating the request stay completable per PRV1-10).
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-46 — [remaining §4.7 opening reducers — NOT this slice] WHEN battle::start_battle (PvE wild bat (from m22-s5 X12, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s5 · residual: R-m22-s5-X12

Deferred with reason: battle.rs and economy.rs are outside m22-s5's declared touches; spec §4.7 names PvE battle start and shop buy/sell as gate targets ("DECIDED IN"). Fold into the PRV1-7 crate-wide slice or its own follow-up; ADR-0227 records the residual. NOTE for the successor: submit_pvp_action must NOT be gated despite §4.7's list (ADR-0227 D5 anti-decision — deadline-forfeit would force-terminate, violating PRV

EARS: [remaining §4.7 opening reducers — NOT this slice] WHEN battle::start_battle (PvE wild battle) or economy::buy/sell open a commitment for a deletion-gated identity THE SYSTEM SHALL reject before any write.
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-45 — [PRV1-7 crate-wide enforcement — NOT this slice] WHEN a reducer writes any manifest-classi (from m22-s5 X11, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s5 · residual: R-m22-s5-X11

Deferred with reason: PRV1-7's crate-wide mechanism needs a supervisor decision under ADR-0224 (no new eval scanners; syn-based check vs reviewer-checklist are the candidates, per ADR-0225 Consequences); explicitly out of m22-s5 by the slice brief. The aspirational CHECK documents what the successor must build.

EARS: [PRV1-7 crate-wide enforcement — NOT this slice] WHEN a reducer writes any manifest-classified table without the gate call or STATE_TRANSITION_OWNERS membership THE SYSTEM SHALL fail CI.
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-44 — RESOLVED, do not build (from rb-34 X5, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-34 · residual: R-rb-34-X5

Deferred with reason: BLOCKED ON S3b; FOLD into the slice that lands R-m22-s3-X13 (same file

EARS: WHEN the S3b cascade lands ITS name writes SHALL reference
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).

RESOLVED 2026-09-04 (mr-gates residuals close --slice rb-44 --force): the fold target
(m22-s3b, PR#408) already shipped before this section was queued, and independently
satisfies X5 in full — `ranking.rs:260-276` (`player_with_deleted_name` /
`profile_with_deleted_name`) write `game_core::TOMBSTONE_DISPLAY_NAME` by symbol through
owning-module helpers taking no name parameter; `ranking_tests.rs` (PRV1-6c /
`m22s3b_*` suite, ~L2317-2600) executes the required per-table value-equality,
never-delete, wrong-tombstone-name and split-binding pins. `anonymize_display_names`
never calls `tombstoned_profile`, so the second-writer collision X5 guarded against does
not exist. Do not re-launch this section as a slice; it names no remaining work.
### rb-43 — X11-adr-readme-next-free (from rb-26 X11-adr-readme-next-free, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-26 · residual: R-rb-26-X11-adr-readme-next-free

Deferred with reason: `docs/adr/README.md`'s next-free-ADR number goes one

EARS: X11-adr-readme-next-free
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-42 — X9-spec-false-premise (from rb-26 X9-spec-false-premise, deferred 2026-09-01)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-26 · residual: R-rb-26-X9-spec-false-premise

Deferred with reason: `specs/monster-realm-v2/M-residual-backlog.spec.md:65`

EARS: X9-spec-false-premise
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-41 — WHEN a REKEY entry's `exists` predicate is HOLLOWED in Rust (its body still reads the (from rb-25 X9, deferred 2026-08-31)
`touches: evals/guest-claim-integrity.eval.mjs (+ docs/adr/0222-*.md, ARCHITECTURE.md minimal)`
`after:` — · source: rb-25 · residual: R-rb-25-X9

Deferred with reason: the exists-half HOLLOWING hole (a predicate that reads its table and returns a

EARS: WHEN a REKEY entry's `exists` predicate is HOLLOWED in Rust (its body still reads the
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-40 — WHEN a guest's pre-claim chunks are purged THE SYSTEM SHALL be observable doing so (from rb-22 EO-9, deferred 2026-08-31)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-22 · residual: R-rb-22-EO-9

Deferred with reason: no writer of export_bundle exists (S4 absent), the table is private with no

EARS: WHEN a guest's pre-claim chunks are purged THE SYSTEM SHALL be observable doing so
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-39 — WHEN a write verb in a server module cannot be attributed to a same-statement (from rb-22 EO-11, deferred 2026-08-31)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-22 · residual: R-rb-22-EO-11

Deferred with reason: statement-boundary + fail-loud hardening of `write_target_accessors`

EARS: WHEN a write verb in a server module cannot be attributed to a same-statement
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-38 — A11Y-27's RENDERER arm SHALL be honoured end to end in a real browser — the OS (from rb-20 RM-7, deferred 2026-08-31)
`touches: client/playwright.config.ts, client/e2e/a11y.spec.ts, client/e2e/reduced-motion.spec.ts, evals/ci-gate-wiring.eval.mjs, .github/workflows/nightly.yml, justfile`
`after:` — · source: rb-20 · residual: R-rb-20-RM-7

Deferred with reason: MEASURED, not assumed: `motionPreferenceFromWindow` has zero production

EARS: A11Y-27's RENDERER arm SHALL be honoured end to end in a real browser — the OS
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-37 — overlayA11yWiring.test.ts is not safe under vitest --sequence.concurrent (pre-existing, co (from rb-18 R-rb18-CONCURRENT, deferred 2026-08-30)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-18 · residual: R-rb-18-R-rb18-CONCURRENT

Deferred with reason: Measured by the verifier: --sequence.concurrent gives 76 failed/40 passed on the rb-18 branch and 43 failed/41 passed on origin/master @ 3455155 — same root cause, so it is a pre-existing file-wide property, NOT introduced by rb-18. Cause: the whole file shares module-scope mutable state (one happy-dom document, one spy on openOverlayA11y/closeOverlayA11y, and OPEN_OVERLAYS inside the real overlay

EARS: overlayA11yWiring.test.ts is not safe under vitest --sequence.concurrent (pre-existing, confirmed on master)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-36 — main.ts:1574 citation for the fresh-view-model-per-batch fact has drifted in two files (from rb-18 R-rb18-MAINCITE, deferred 2026-08-30)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-18 · residual: R-rb-18-R-rb18-MAINCITE

Deferred with reason: dialogueView.ts:16 and dialogueView.test.ts:243 both cite main.ts:1574 for 'main.ts builds a fresh view model on every store batch'. main.ts:1574 is unrelated code (a flatMap building cureItems); the real site is the store.onBatchApplied block at main.ts:1627-1641. rb-18 corrected its own copy in overlayA11yWiring.test.ts and flagged these two: dialogueView.ts is a production file outside rb-18's 

EARS: main.ts:1574 citation for the fresh-view-model-per-batch fact has drifted in two files
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-35 — WONTFIX (already covered, no behavioural difference) — claimView's cross-view opener drives show(), but the live production open door is render() (from rb-18 R-rb18-CLAIMDOOR, deferred 2026-08-30)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-18 · residual: R-rb-18-R-rb18-CLAIMDOOR

**Status: WONTFIX, dispositioned 2026-09-02T21:00Z.** `claimView.test.ts:268`'s
`S4-claimView-THREE-DOORS` (from m23-s4, PR#367, 2026-08-24 — predates rb-18) already replays the
real production sequence (`main.ts` `openClaim()`: `renderClaim() -> show() -> renderClaim()`) and
passes today. rb-18's own reviewer already recorded this has no behavioural difference: `render()`
and `show()` derive `visible` from the same live guard, and `questLogView`/`healView` close via
`render(null)` where `main.ts` uses `hide()` under the identical equivalence. Nothing to build; left
in place per doctrine as the disposition record, not an open item.

Deferred with reason: main.ts openClaim() (:454-462) runs applyClaim -> renderClaim() BEFORE show(), so render() has already flipped wasVisible and show()'s guard (claimView.ts:118) is a structural no-op in every current call path. overlayA11yWiring.test.ts's OPENERS.claimView therefore pins a real class invariant but NOT the live production edge; that one is owned by claimView.test.ts's S4-claimView-THREE-DOORS. Re-po

EARS: claimView's cross-view opener drives show(), but the live production open door is render() (claimView.ts:107)
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-34 — X8-residual (from rb-7 X8-residual, deferred 2026-08-29)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-7 · residual: R-rb-7-X8-residual

Deferred with reason: the `accounts.rs` half of the guest-claim-value ban cannot be

EARS: X8-residual
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-33 — WONTFIX (stale — fix already shipped) — accounts_tests.rs:2057 g2_reducer_name_set_is_pinned still carried the exact-5 Rust pin (from rb-6 R-rb-6-X1, deferred 2026-08-29)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-6 · residual: R-rb-6-R-rb-6-X1

**Status: WONTFIX, dispositioned 2026-09-01T06:00Z.** rb-24 (PR#398, 2026-08-31) already added
`account_deletion_reaper` to `g2_reducer_name_set_is_pinned`'s expected vector
(`accounts_tests.rs:2104`), and `accounts.rs:707` already defines the reducer — the premise this
residual was about to hard-RED on had already landed by the time it reached the promote queue.
Nothing to build; left in place per doctrine as the disposition record, not an open item.

Deferred with reason: rb-6 fixed the JS half only: evals/guest-claim-integrity.eval.mjs now admits a PLANNED account_deletion_reaper. The Rust twin at server-module/src/accounts_tests.rs:2057 asserts found == a hardcoded 5-name concat! vector and panics under 'just test' the moment S3 declares the reducer. accounts_tests.rs is OUTSIDE rb-6's declared touches (it is the co-located twin of accounts.rs, not of the declare

EARS: accounts_tests.rs:2057 g2_reducer_name_set_is_pinned still carries the exact-5 Rust pin and will hard-RED when M22 S3 ships
Tests: proof-of-teeth — an ordinary Rust/TS test for this criterion must RED before the fix and pass after (ADR-0224; supersedes ADR-0010 — no new evals/*.eval.mjs).
### rb-32 — WHEN an eval ends the harness process by a route that never emits `'exit'` (from rb-5 X9, deferred 2026-08-29)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-5 · residual: R-rb-5-X9

Deferred with reason: Not closable in-process, and the only in-process fix (running each eval in

EARS: WHEN an eval ends the harness process by a route that never emits `'exit'`
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-31 — WONTFIX (scanner-script scope retired) — WHEN an alias of Identity is declared OUTSIDE the scanned input set (`game-core` carries a (from rb-4 X12, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-4 · residual: R-rb-4-X12

**Status: WONTFIX, dispositioned 2026-09-12T11:11Z.** This residual's entire scope is
`evals/*.eval.mjs` identity-alias-scanner coverage outside its own scanned input set — exactly
the scanner-script-correctness category ADR-0224 (operator directive 2026-09-01) retired: "a
residual whose entire scope is an eval script's own scanner correctness is NOT a promotable
class anymore." No new eval/scanner patch will be written to chase this gap. If the adjacent
identity-alias code is next touched, port the underlying invariant into an ordinary Rust/TS
test in that module instead. Nothing to build; left in place per doctrine as the disposition
record, not an open item.

Deferred with reason: aliases declared outside the scanned input set (game-core's optional spacetimedb

EARS: WHEN an alias of Identity is declared OUTSIDE the scanned input set (`game-core` carries an
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-30 — WHEN a table field is declared without `pub` (`owner_backup: Identity,` — the 2.8.1 (from rb-4 X11, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-4 · residual: R-rb-4-X11

Deferred with reason: field-level parse non-vacuity, a PARSER defect distinct from this WALKER residual:

EARS: WHEN a table field is declared without `pub` (`owner_backup: Identity,` — the 2.8.1
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-29 — WHEN a SpacetimeType product column carries an Identity (a named-field struct, an enum (from rb-4 X10, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-4 · residual: R-rb-4-X10

Deferred with reason: LIVE-REACHABLE product-type hole, outside touches: `encounter.entries:

EARS: WHEN a SpacetimeType product column carries an Identity (a named-field struct, an enum
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-28 — WHEN `Object.prototype` carries a table name THE schema-drift eval SHALL still report (from rb-3 X10, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-3 · residual: R-rb-3-X10

Deferred with reason: PRE-EXISTING and outside touches: `evals/battle-schema-snapshot.eval.mjs`

EARS: WHEN `Object.prototype` carries a table name THE schema-drift eval SHALL still report
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-27 — RESOLVED, do not build (from rb-3 X9, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-3 · residual: R-rb-3-X9

Deferred with reason: no ADR number was reserved for rb-3 (the supervisor-assigned slot is empty)

EARS: WHEN a slice records a new gate-hygiene pattern (an in-process Object.prototype write with
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).

RESOLVED 2026-09-01 (mr-gates residuals close --slice rb-27 --force): the deferral premise
recorded above is MOOT, and is kept verbatim because it is a mechanical copy of the residual
row's own reason. The reservation it names never happened and never needed to: rb-3's decision
was recorded inside rb-4's ADR-0208, whose Decision 2 is headed `(rb-3)` and documents the
in-process `Object.prototype` write-hygiene pattern in full. rb-26's own review
(R-rb-26-X8-rb-3-x9-fg72c, 2026-09-01) independently confirmed that, and R-rb-3-X9 was closed as
moot the same day. Do not re-launch this section as a slice; it names no remaining work.
### rb-26 — WHEN the classifier no longer infers policy from typeof THE four consumers that STATE (from rb-2 X9, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-2 · residual: R-rb-2-X9

Deferred with reason: the corrections are doc/comment-only edits in four files OUTSIDE the declared

EARS: WHEN the classifier no longer infers policy from typeof THE four consumers that STATE
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-25 — WHEN a REKEY entry's `exists`/`rekey` needle names ANOTHER table's live helper (from rb-2 X10, deferred 2026-08-28)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: rb-2 · residual: R-rb-2-X10

Deferred with reason: the needle↔key correspondence hole is PRE-EXISTING in [G6/consumed]

EARS: WHEN a REKEY entry's `exists`/`rekey` needle names ANOTHER table's live helper
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-24 — WHEN the S2 schema ships THE SYSTEM SHALL declare the `AccountDeletionReaperSchedule` (from m22-s2 X15, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s2 · residual: R-m22-s2-X15

Deferred with reason: INTENDED OWNER m22-s3 (`mr-gates lint` rejects slice-id targets with no

EARS: WHEN the S2 schema ships THE SYSTEM SHALL declare the `AccountDeletionReaperSchedule`
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-23 — [A11Y-33 / MANUAL] WHEN the manual protocol is executed THE SYSTEM SHALL confirm that `ari (from m23-s11 X9, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s11 · residual: R-m23-s11-X9

Deferred with reason: A11Y-33's EXECUTION, same reasoning and same run. `docs/a11y-manual-protocol.md:75` (Protocol B) is authored and covers all four `#app`-nested overlays (battleView, boxView, raisingView, evolutionView) with a CONTROL step — B4 re-checks reachability AFTER closing the overlay, because a "nothing outside the dialog was read" result on a document that reads nothing anywhere passes for the wrong reaso

EARS: [A11Y-33 / MANUAL] WHEN the manual protocol is executed THE SYSTEM SHALL confirm that `aria-modal` on the four `#app`-nested overlays actually renders the rest of the document inert to the tested AT — a browser/AT implementation detail the source tree cannot prove
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-22 — Pre-claim export_bundle chunks orphan under the retired guest identity — S3 cascade cannot (from m22-s2 S3-GUEST-EXPORT-ORPHAN, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s2 · residual: R-m22-s2-S3-GUEST-EXPORT-ORPHAN

Deferred with reason: Found by the reducer-security-auditor and independently by red-team on m22-s2: export_bundle.owner_identity is EXEMPT from claim-time rekey (correct — object REKEY entries are the R-m22-s0-X1 trap), so chunks a guest exports before claiming sit under the retired guest identity; the S3 cascade keys on the deleting account identity and structurally cannot reach them, and the S4 TTL reaper does not e

EARS: Pre-claim export_bundle chunks orphan under the retired guest identity — S3 cascade cannot reach them via identity
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-21 — S3 MUST guard cancel_account_deletion against terminal accounts (PRV1-4) — the schema now  (from m22-s2 S3-CANCEL-TERMINAL, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s2 · residual: R-m22-s2-S3-CANCEL-TERMINAL

Deferred with reason: MEASURED by two independent lenses on the m22-s2 tree: needs_cancel_write is matches!(status, PendingDeletion) and a terminal account IS PendingDeletion; cancelled_deletion carries terminal_at_ms through ..existing; the only guard is a debug_assert compiled OUT of release wasm ([profile.release] has no debug-assertions — red-team built both profiles and showed the release path does not panic). Lat

EARS: S3 MUST guard cancel_account_deletion against terminal accounts (PRV1-4) — the schema now makes the resurrected-tombstone state mintable
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-20 — X11 (from m23-s11 X11, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s11 · residual: R-m23-s11-X11

Deferred with reason: a browser-tier reduced-motion oracle (a Playwright project with `use: { reducedMotion: 'reduce' }`). The cheapest real-browser a11y oracle available: it needs NO axe dependency and would gate A11Y-27 in a real browser rather than in happy-dom, where `renderResolver.test.ts` proves the pure branch but nothing proves the media query actually reaches it end to end. Blocked solely by `client/playwrigh

EARS: X11
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-19 — X10 (from m23-s11 X10, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s11 · residual: R-m23-s11-X10

Deferred with reason: the axe-core + real-browser a11y tier that spec §5.7 names as `just a11y-e2e`'s payload ("axe-core + Playwright"). It requires `client/e2e/a11y.spec.ts` (new), `@axe-core/playwright` in `client/package.json`, and a lockfile update — ALL THREE outside m23-s11's declared `touches:`, and, more importantly, **owned by no slice in the spec's own §4 table**: S10 owns "the five evals + baseline + happy-d

EARS: X10
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-18 — X21 (from m23-s10 X21, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X21

Deferred with reason: the cross-view RE-OPEN edge. `client/src/ui/overlayA11yWiring.test.ts` constructs a fresh view per id and calls the open path once, so it never exercises a repeat `show()` on an already-visible overlay; deleting a view's `if (!wasVisible)` guard would ship green there. NOT a coverage gap today — every one of the sixteen per-view specs already ships its own `-REPEAT-NO-REOPEN` tooth (the m23-s3/s6 

EARS: X21
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-17 — X20 (from m23-s10 X20, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X20

Deferred with reason: three residuals this slice MEASURED but deliberately did not close, each because the fix needs files outside its `touches:`. (a) **R-m23-s10-RMCSS**: a `@media (prefers-reduced-motion: reduce){:root{--mr-reduce:1}}` block in `client/src/styles.css`, read back via `getComputedStyle(...).getPropertyValue`, escapes all three `[A11Y-RM2]` scans — the walker collects `.ts`-family files only and the sty

EARS: X20
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-16 — X19 (from m23-s10 X19, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X19

Deferred with reason: retire the three now-superseded hand-kept `.focus(` file lists that X1/X2 subsume: `client/src/ui/renameView.test.ts:501` (`S3-NO-VIEW-LOCAL-FOCUS`, 10 files — its own `it()` title says "delete when S10 ships"), `renameView.test.ts:1300` (`S4-VIEW-LOCAL-FOCUS-5`) and `client/src/ui/menuView.test.ts:1755` (`MV-NO-FOCUS-CALL`). Blocked: both files are outside this slice's `touches:`, and `renameView

EARS: X19
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-15 — X18 (from m23-s10 X18, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X18

Deferred with reason: consolidate the CSS oracle so `[A11Y-06]`/`[A11Y-07]` need no delegation pin. `parseCssRules`/`findIdSelectors`/`srOnlyIsAccessible` exist exactly ONCE, module-locally, at `client/src/indexShell.test.ts:1001`/`:1113`/`:1408`. This slice deliberately did NOT duplicate them (X6, and the plan memo section 1 D3): red-team MEASURED that the shared-fixture-corpus mechanism correction (3) [R-m23-s2-X6] p

EARS: X18
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-14 — X16 (from m23-s10 X16, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s10 · residual: R-m23-s10-X16

Deferred with reason: `evals/contrast-ratio.eval.mjs` + `evals/baselines/contrast-unresolved.json` (spec section 5.3; criteria A11Y-30/A11Y-31, tags [A11Y-09]/[A11Y-10]/[A11Y-11]). Its ONLY subjects are the inline `style.cssText` literals that slices S8 and S9 remediate, and BOTH are BLOCKED on the spec section 8.1 palette ruling and the section 8.2 art-direction ruling (S9 is `after: S8`). A `NO_BG_UNRESOLVED` baselin

EARS: X16
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-13 — A11Y-25 (from m23-s6 A11Y-25, deferred 2026-08-25)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s6 · residual: R-m23-s6-A11Y-25

Deferred with reason: INTENDED OWNER m23-s10 (M23 spec section 4, row S10). The [SCAN] tier of "an element with a click listener, no paired keydown and no native button/anchor child fails CI" is `evals/keyboard-operable-rows.eval.mjs` ([A11Y-12]/[A11Y-13]), which does not exist and is in S10's declared `touches:` (spec section 4). S6 ships the SUBJECT the eval will scan -- exactly spec section 5.4's GOOD hostile-but-co

EARS: A11Y-25
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-12 — The [A11Y-07] CSS scanner will exist twice once S10 lands its eval, with no agreement gate (from m23-s2 X6, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X6

Deferred with reason: A .mjs eval cannot import the .ts helper, so S10 re-implements parseCssRules/findIdSelectors/srOnlyIsAccessible. Forced by touches:, but two oracles for one criterion drift invisibly -- each keeps passing against its own idea of the file. S10 should carry an explicit gate that both scanners agree over the same fixture corpus, or a third variant appears.

EARS: The [A11Y-07] CSS scanner will exist twice once S10 lands its eval, with no agreement gate
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-11 — aria-modal=true on the eleven shells puts the single #a11y-live region in the AT-inert sub (from m23-s2 X5, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X5

Deferred with reason: Spec 2.4 places the live region as a direct <body> child; A11Y-13 puts aria-modal=true on every shell root. While any overlay is open, AT is instructed to ignore everything outside the dialog -- including the one node S1 announces through. NVDA/JAWS usually still speak it, VoiceOver/Safari frequently do not, so the failure is silent and AT-dependent. The two decisions were made in different spec s

EARS: aria-modal=true on the eleven shells puts the single #a11y-live region in the AT-inert subtree
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-10 — The spec-2.5 reduced-motion CSS guard for the battle HP bar is owned by NO slice (from m23-s2 X4, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X4

Deferred with reason: Spec 2.5 puts it in the new stylesheet, but S7's touches: has no styles.css, the transition is an INLINE cssText declaration in ui/battleView.ts, and the element carries no class -- so no selector can reach it at any specificity and no current slice can land it. Cheapest fix: S4/S8 sets hpFill.className='hp-fill' and drops the inline transition; S9 (which already owns styles.css) adds the rule plu

EARS: The spec-2.5 reduced-motion CSS guard for the battle HP bar is owned by NO slice
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-9 — A11Y-12 bans the '#' character, not reachability: attribute/universal/positional selectors (from m23-s2 X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m23-s2 · residual: R-m23-s2-X3

Deferred with reason: Red-team measured a biome-clean styles.css -- [id="help-overlay"]{visibility:hidden} etc -- that reds nothing, prints X3 GATE-GREEN, and in Chromium hides #help-overlay, blanks #help-hint and removes #a11y-live from the AX tree. Also measured: [id^=], div[id*=], :where([id=]), body>div:nth-child(11) and *{} each reproducing ADR-0151 D1's below-the-fold regression with H6/H7 green. m23-s2 closes th

EARS: A11Y-12 bans the '#' character, not reachability: attribute/universal/positional selectors defeat it
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-8 — S8's grace countdown will duplicate DELETION_GRACE_MS_DEFAULT in TypeScript unless a wasm  (from m22-s1 R-m22-s1-X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X3

Deferred with reason: S8's scope (spec §7.2) is a deletion/cancel UX with a grace countdown, but DELETION_GRACE_MS_DEFAULT is unreachable from TS: client-wasm/pkg exports only the pre-existing 10 functions (verified by an actual wasm-pack build of this worktree), and the schema carries only deletion_requested_at_ms. The path of least resistance is a TS literal that silently drifts the moment the operator resolves escal

EARS: S8's grace countdown will duplicate DELETION_GRACE_MS_DEFAULT in TypeScript unless a wasm accessor is added
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-7 — No display-name tombstone is single-sourced; PROFILE_TOMBSTONE_NAME is a wrong-but-plausib (from m22-s1 R-m22-s1-X2, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X2

Deferred with reason: Spec §3 requires player.name and profile.name to be overwritten with a tombstone, but §7.2's S1 row lists only six symbols and omits a name tombstone, so S1 shipped none. The only existing constant is server-module/src/ranking.rs:161 PROFILE_TOMBSTONE_NAME = '(claimed guest)', used by tombstoned_profile() for the GUEST-CLAIM flow, which also zeroes rating/wins/losses. If S3 reuses it a deleted acc

EARS: No display-name tombstone is single-sourced; PROFILE_TOMBSTONE_NAME is a wrong-but-plausible duplicate S3 will reach for
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-6 — S3 will hard-RED [R/name-set]: SANCTIONED_REDUCERS is exact-set equality and does not cont (from m22-s1 R-m22-s1-X1, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s1 · residual: R-m22-s1-R-m22-s1-X1

Deferred with reason: evals/guest-claim-integrity.eval.mjs:388-394 pins SANCTIONED_REDUCERS as an exact set of 5 names, compared by set EQUALITY at :564-572 (deliberately not >=5). STATE_TRANSITION_OWNERS (shipped by this slice) names account_deletion_reaper, which does not exist yet. The moment S3 declares that reducer in accounts.rs, [R/name-set] fails. The Rust twin over ACCOUNTS_RS in server-module/src/accounts_tes

EARS: S3 will hard-RED [R/name-set]: SANCTIONED_REDUCERS is exact-set equality and does not contain account_deletion_reaper
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).

Resolution (rb-6, 2026-08-28). DONE — fixed in PR #384 (ADR-0210). The `SANCTIONED_REDUCERS` flat array became a frozen `REDUCER_SANCTIONS` ledger with REQUIRED/PLANNED status (5 REQUIRED, 1 PLANNED = `account_deletion_reaper`). `[R/name-set]` is now membership (own keys only) + required-presence. `[R/sanction-shape]` closes the status discriminator to {REQUIRED, PLANNED} with closed field sets (red-team measured a third-status bypass on an unguarded implementation). `[R/planned-set]` pins the PLANNED keys by exact equality. `[R/planned-shape]` asserts that a PLANNED name, if present, is a same-file scheduled reducer with the right argument and guard. Gate red-teaming and re-check against pre-fix revealed that membership checking is orthogonal to set pinning — the first implementation passed all 95 evals and every new fixture while still admitting an unsanctioned reducer that reused the name, because the carve-out was reached only after type-safety failed.

### rb-5 — evals/run.mjs has no completeness check: an eval that process.exit()s at module scope trun (from m22-s0 X4, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X4

Deferred with reason: MEASURED on the live tree: with a main guard widened to compare dirname, node evals/run.mjs ran 37 of 90 evals, swallowed 3 already-printed 'eval FAIL:' lines, and exited 0. run.mjs guards only files.length === 0; nothing asserts every discovered eval produced a result. OUT of this slice's declared touches (evals/run.mjs is explicitly off-limits and the M22 spec forbids slices editing it), so flag

EARS: evals/run.mjs has no completeness check: an eval that process.exit()s at module scope truncates CI silently with exit 0
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-4 — findIdentityColumns matches literal type TEXT, so an aliased Identity column is invisible  (from m22-s0 X3, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X3

Deferred with reason: MEASURED: adding 'pub type OwnerId = Identity;' and 'pub delegate: OwnerId,' to a table leaves both gates green while the column carries no D6 policy. Pre-existing walker limitation, but S0 freezes this walker as the shared contract, so a consumer building a completeness gate over it inherits an incomplete column set. Documented as a KNOWN LIMITATION in the contract comment. Real fix: gate 'type X

EARS: findIdentityColumns matches literal type TEXT, so an aliased Identity column is invisible to the frozen walker
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-3 — [G6/declared] uses 'key in manifest', so Object.prototype pollution greens an unclassified (from m22-s0 X2, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X2

Deferred with reason: MEASURED both ways by red-team; independently confirmed byte-identical on origin/master by the reducer-security-auditor, so PRE-EXISTING, not introduced by S0. 'in' walks the prototype chain, which Object.freeze does not seal: a co-resident eval setting Object.prototype['table.col'] makes [G6/declared] skip a genuinely unpoliced column while Object.keys and the detail-string count stay at 23. Veri

EARS: [G6/declared] uses 'key in manifest', so Object.prototype pollution greens an unclassified Identity column
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-2 — REKEY_MANIFEST object-ification is red-on-arrival: checkRekeyCompleteness infers REKEY fro (from m22-s0 X1, deferred 2026-08-24)
`touches: (inherit from source slice — REVIEW)`
`after:` — · source: m22-s0 · residual: R-m22-s0-X1

Deferred with reason: MEASURED by red-team on the live tree: converting one BLOCKED string entry to an object keeps the S0 contract eval green and reds guest-claim-integrity with FG47 '[G6/consumed] the manifest marks battle.player_identity as REKEY via undefined'. Any object entry is REKEY by definition. The only green workaround forces a lie (borrowed rekey/exists needles advertise a BLOCKED column as re-keyed). The 

EARS: REKEY_MANIFEST object-ification is red-on-arrival: checkRekeyCompleteness infers REKEY from typeof policy === 'string'
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).
### rb-1 — RW3-08 (verbatim) — THE SLICE SHALL NOT modify Rust source other than `CONTENT_VERSION` an (from rw3b X8, deferred 2026-08-23)
`touches: specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md, specs/monster-realm-v2/M-residual-backlog.spec.md, memory/projects/mr-content-scope, memory/projects/mr-selfcheck`
`after:` — · source: rw3b · residual: R-rw3b-X8

Deferred with reason: RW3-08 as written is mechanically unsatisfiable for ANY slice that appends an evolution edge or a derived species. `game-core/tests/eg3_evolution_graph.rs` pinned the edge set EXACTLY (`t2`: `paths.len() == 10`; `t7`: `edge_ids == (1..=10)`) and `game-core/src/content.rs`'s `EG1_TIER_ONE_IDS` pins the derived-species set EXACTLY, so both go RED the instant wave-3 content lands. Both were EXTENDED,

EARS: RW3-08 (verbatim) — THE SLICE SHALL NOT modify Rust source other than `CONTENT_VERSION` and its own new test files, and SHALL NOT edit `Affinity`, `AbilityEffect`, or `content/type_chart.ron`.
Tests: proof-of-teeth — this criterion's own gate must RED before the fix and pass after (ADR-0010).

Resolution (rb-1, 2026-08-28). The `EARS:` line above is the criterion AS DEFERRED — verbatim, and
deliberately frozen. This whole section is hashed into the slice's acceptance ledger
`memory/projects/gates/rb-1.gates.md` (`Seed: 6d97183777f61762`), and reseeding is a supervisor-only
operation, so a promoted criterion is never edited in place: it records what was deferred, not what
was concluded. The CORRECTED criterion lives in
`specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` under RW3-08, amended 2026-08-28 to carry
one narrow extra exception for a STRICTLY-ADDITIVE extension of a pre-existing exactly-pinned test
or registry set that the slice's own new content would otherwise make unsatisfiable: adding ids to a
set pinned by equality, raising a pinned count, appending expected tuples, replacing a pinned range
with the explicit list that supersets it, or updating an assertion message or test name stating that
count.

What stays forbidden is everything the deferred wording was actually protecting. No assertion may be
deleted or commented out, no `#[test]` removed, no `#[ignore]` or `#[cfg(feature = "…")]` added, no
`assert_eq!` downgraded to `assert!` or `debug_assert_eq!`, no `==` relaxed to `>=` / `is_subset` /
`is_superset`, no id dropped from a pinned set, no pinned count lowered. Every other Rust-source
change still fails the criterion, including any incidental refactor and including a pure addition
— a new `fn`, `struct` or `mod tests` block — inside a pre-existing `src/*.rs` file the slice
legitimately extends: that file is production code, and an allow-list that waved a pure-`+` hunk
through it would miss the exact attack it exists to catch.

That prohibition is deliberately NOT stated for a pre-existing TEST file, and the classifier does
not enforce it there. A pure, BRACE-BALANCED addition to a file that is already a test file is
permitted, because it cannot remove or weaken a pin that is already there. Adding a test is not a
licence to delete one: every removal path still bites — a deleted or commented-out assertion, a
removed `#[test]`, a removed line with no extension partner, a lowered count, a dropped id — and a
pure addition that is brace-UNBALANCED is read as wrapping or splicing into pre-existing code and
bites as well, as does an added `#[ignore]`, an added `#[cfg(feature = "…")]`, and a `macro_rules!`
redefinition or `use … as` alias of one of the six reserved assertion names. This paragraph and the
matching one under RW3-08 in `specs/monster-realm-v2/M-postgate-roster-wave-3.spec.md` say the same
thing on purpose, and both say what `memory/projects/mr-content-scope` actually does: an
unqualified "any pure addition fails" was FALSE of the shipped tool, which is precisely the class of
stale claim this slice exists to kill. `Affinity` (`game-core/src/monster/types.rs`),
`AbilityEffect` (`game-core/src/combat/ability.rs`) and `game-core/content/type_chart.ron` stay
untouchable, exactly as before.

Proof of teeth. The amended criterion is classified mechanically by
`memory/projects/mr-content-scope`, an ALLOW-LIST classifier over a slice's unified Rust diff: every
changed line in a Rust file bites unless it positively matches a permitted shape, because a
deny-list waves through the pure-addition case this criterion most needs to catch.
`memory/projects/mr-content-scope --selftest` runs the fixture battery and prints
`CONTENT-SCOPE-SELFTEST-OK 42 fixtures (permit=8 bite=30 link=2 cli=2)`. It PERMITs the three real
merged diffs this residual is about (rw3b's `EG1_TIER_ONE_IDS` extension in `game-core/src/content.rs`,
rw3b's edge/count/range extensions in `game-core/tests/eg3_evolution_graph.rs`, and rw3c's
set-equality and count extensions in `game-core/tests/pt_d3_tuning.rs`), plus a `CONTENT_VERSION`
bump, a brand-new test file, a rustfmt-wrapped id list, and a non-Rust content edit. It BITEs a
`pub fn` and a `mod tests` block smuggled into an existing `src/*.rs` file, an edit to any of the
three banned paths, a commented-out assertion, an `assert_eq!` weakened to `assert!(… >= …)`, a
`debug_assert_eq!`, an `|| true`, an added `#[ignore]` or `#[cfg(feature = …)]`, a `#[test]`
deletion laundered behind two additions in a brand-new file, a dropped id, a lowered count, a
pairing-shift attack that defeats positional diff reading, and a new non-test `.rs` file. Tool and
spec are tied together by the `rw3-scope-rules` token anchor printed under the amended criterion:
the tool asserts its implemented rule set equals that token set, so deleting the exception from the
spec, or silently narrowing the tool, breaks the equality and reds the check. `mr-selfcheck` runs
that selftest daily and parses BOTH the marker and its fixture count against a floor, so the tool
cannot quietly decay into decoration once this slice's ledger closes at merge.

Two notes for a future reader. `mr-gates` reports exactly one `shall-uncaptured` line against this
section, and it is the `###` header line's own truncated restatement of the criterion already
captured below it, not a second requirement that went unrecorded. And the sibling residual
`R-rw3c-X3` is this same criterion deferred a second time, by rw3c: it is resolved by this same
amendment and needs no backlog section of its own.

## 3. How an entry gets worked

1. A slice cannot meet a seeded gate and writes `DEFER: <gate> -> backlog — <reason>`.
2. `mr-gates verify` (supervisor, pre-merge) emits an append-only row into `mr-residuals.jsonl`
   with `status: unpromoted`.
3. At Pick-work the supervisor **promotes** it: a `### <id>` section is appended here from the
   criterion's verbatim EARS text, and `mr-record queue-add` puts it on the fast path.
4. **Aging decides priority, not a fixed rank.** Past `t1_promote_days` a residual outranks new
   PLAN §9 work; past `t2_stale_days` it outranks everything below CI-red and WIP. Debt-first
   starves features and features-first starves debt; aging is self-balancing, because preempting
   clears the debt and normal order resumes. Constants live once, in `mr-gates`
   (`mr-gates residuals policy --json`); `mr-selfcheck` reads them from there rather than
   restating them — lp-11b's defect was two copies of one constant in two files.
5. The promoted slice's own ledger re-seeds the same criterion as a gate. **It is closed only when
   the promoted slice's own ledger is fully resolved** — `mr-gates residuals close` refuses on a
   missing ledger or any unmet gate, and `--force` is recorded on the row. Closing on "something
   merged with the right branch name" would let a residual be retired by a slice that did not
   deliver it.

## 4. Anti-rot

`mr-selfcheck` fails on `residual-unpromoted` (promote stalled past T1), `residual-stale` (open past
T2) and `residual-graveyard` (rows exist, the oldest is past the window, and none has ever
closed — a MATURITY test, so it stays quiet on day 0 and does NOT go silent once rows age out). The last is
the direct falsification test for this whole mechanism, and it is not hypothetical: **`mr-feedback`
holds 189 rows of which 0 ever reached a terminal state**, which is why `lp-15` retires it. A sink
without a drain is a graveyard with better lighting.

## 5. Explicitly NOT in scope

- **Seeding the 329 pre-existing OUTSTANDING items.** That stays `lp-registry`'s, with its own
  disposition-on-day-one requirement; bulk-seeding them here would rebuild the graveyard inside the
  new mechanism and make the alarms fire hundreds of times on their first run.
- **Being a general backlog.** Only deferred *acceptance criteria* land here. Feature ideas, feedback
  and operator decisions have their own channels.
