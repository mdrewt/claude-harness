# M-postgate-thirteenth-review-residuals — verified 2026-08-09 review findings

> **Status:** NEW, queued. Inserted 2026-08-09 after `M-postgate-twelfth-review-residuals`
> (fully merged 12r-a..f), per the weekly-review insertion convention (cf. M8.5, 11r, 12r).
> **Review ordinal:** thirteenth multi-lens review.
> **Pinned SHA:** `f9a063dd2d98382af4d5edee285132b96e74b385` (short `f9a063d`), 2026-08-09T23:33Z UTC.
> **Method:** 9 independent sonnet lenses over an isolated `--no-hardlinks` clone; every
> reported finding independently re-verified by separate verifier agents given only the
> claim and location, not the finder's framing or confidence. Sixteen claims verified,
> zero dropped.
> **Scope:** one slice (13r-e) carries game-visible surface and implements a decision Drew
> has already made (issue #284 answer, 2026-08-08); everything else is enforcement,
> ops-config, docs, and feel-defect closure — no new game-design surface.
> All `path:line` citations are @ `f9a063d`.

## 1. Why this milestone exists

The ~16-PR delta since the twelfth review (`3c1cf08..f9a063d`) landed the whole 12r basket,
ADR-0179/0180, the M21 accounts/auth spine (m21a/b/c) and all of M20 observability
(m20a-e). The shipped *code* is again unusually clean: the correctness/error-handling lens
returned an explicit "no findings" after reading all of `accounts.rs` and the six rekey
helpers, and the security lens's only finding is in eval machinery, not the server. What
remains is, once more, the **disclosed-but-untracked** class this review process keeps
producing — now in its starkest form yet: m20e's own ADR amendment records that the first
real boot of the delivered observability stack crash-looped four of eight containers, names
the root causes, verifies the fixes live — and then parks the fixes to a slice (`m20e-2`)
that exists in **no queue anywhere** (an exhaustive grep of `PLAN.md` and every `*.spec.md`
finds zero matches for `m20e-2`/`m20b-2`). M20 is recorded closed while two of its EARS
criteria (OBS-45/46) are unmet and its deliverable does not start. The same
recording-is-not-queueing failure covers the eval comment-stripper hazard (which becomes
live the moment the answered issue #301 issuer URL lands), the `nh5` held-key feel defect,
and the ADR-0165 changelog check whose absence let CHANGELOG re-drift 18 PRs one milestone
after 12r-f reconciled it.

## 2. Slices (ROI order; `touches:` per the M8.9 domain map)

### 13r-a — Observability stack boots as committed (CRITICAL, LIGHT) — `touches: ops/observability/docker-compose.yml, ops/observability/Dockerfile, ops/observability/grafana/provisioning/alerting/rules.yml, ops/observability/alloy/config.alloy, evals/observability-stack-config.eval.mjs`
`after:` none

Four committed-config defects, all live-reproduced and root-caused in ADR-0180's m20e
amendment (`docs/adr/0180-observability-stack-selection.md:1031`), fixes never committed:

1. **tempo** — compose passes `-server.http-listen-address=127.0.0.1`, a flag Tempo 2.10.7
   does not define → start-loop crash (`docker-compose.yml:110`; `tempo/tempo-config.yml:9`
   already binds loopback in YAML). Fix: drop the CLI flag.
2. **alloy** — `cap_drop: [ALL]`, no `user:`, `/var/lib/alloy` is `770 alloy:alloy` while
   the container runs root → `mkdir` EACCES crash-loop (`docker-compose.yml:58-71`). Fix:
   run as the image's `alloy` user, or `cap_add: [DAC_OVERRIDE]`, or a chown'd data path.
3. **caddy** — the xcaddy-built binary carries the `cap_net_bind_service=ep` file
   capability; `USER 10001` + `cap_drop: [ALL]` + `no-new-privileges:true` → EPERM on exec
   (`Dockerfile:16,23`; `docker-compose.yml:167-170`). Fix: `RUN setcap -r /usr/bin/caddy`
   in the final stage (stack only binds ≥8443 loopback; the capability buys nothing).
4. **grafana** — `meta-monitoring` alert group `interval: 15s` is rejected by Grafana 13's
   fixed 10s scheduler tick → crash-loop of the dead-man's-switch host itself
   (`grafana/provisioning/alerting/rules.yml:21`). Fix: `20s` or `30s`.

Also fold in the ADR-0180:992 residual: pin Alloy's `build_sha` value grammar on the public
OTLP path (fixed 40-hex length or a deployed-SHA allowlist) — currently any 7-40 lowercase
hex string, a scriptable ~120 series/min/IP cardinality vector within the rate limit.

EARS: WHEN `docker compose up -d` is run with a populated `.env`, THE SYSTEM SHALL reach a
non-restarting running state for all seven services. Tests: extend
`observability-stack-config.eval.mjs` with static tripwires for each fixed shape (tempo
`command:` flag allowlist; rules.yml interval ≡ 0 mod 10s; Dockerfile contains `setcap -r`;
alloy service carries a uid/cap line; build_sha grammar pinned) — each proven against a BAD
fixture first. Boot evidence recorded manually per the G11 precedent (runtime facts are not
statically checkable; the tripwires pin the known-bad shapes).

### 13r-b — mr-trace-relay integration: the parked m20e-2/m20b-2 scope (HIGH, MED) — `touches: ops/observability/relay/*, ops/observability/docker-compose.yml, ops/observability/prometheus.yml, ops/observability/grafana/provisioning/alerting/rules.yml, evals/observability-stack-config.eval.mjs, docs/adr/0180-observability-stack-selection.md`
`after:` 13r-a (the stack must boot before an eighth service can be integrated and proven)

`M20-observability-performance.spec.md:537-539` states OBS-45/OBS-46 as unconditional SHALL
criteria, yet the delivered relay is a pure core only: `relay/mr-trace-relay.mjs:9` parks
the tail-follow daemon, OTLP POST client and `/health` endpoint to "m20e-2";
`docker-compose.yml:26-29`, `prometheus.yml:43` and alerting `rules.yml:11` park the
compose service, scrape job and dead-man's-switch to "m20b-2". Neither slice id occurs in
PLAN.md or any spec. Deliver the parked scope: tail-follow over `module_logs/*.log` (no
module-owner credential), OTLP POST to Alloy, `/health`, the compose service, the
Prometheus scrape job, the Grafana dead-man alert; graduate the P1-P4 park assertions in
`observability-stack-config.eval.mjs:53-60` from tripwires to real checks. Update
ADR-0180's stale "m20b-2" labels (its :1019 amendment already notes the real park target
was m20e-2).

EARS: per OBS-45/46 verbatim. Tests: the existing pure-core suites (parse/pair/reconstruct/
otlp) stay; add daemon-boundary unit tests + static config assertions; live behavior behind
the eval's `MR_OBS_STACK=1` gated section.

### 13r-c — String-literal-aware source scanners (HIGH, LIGHT-MED) — `touches: evals/rust-scan.mjs (new), evals/currency-integrity.eval.mjs, evals/ranking-security.eval.mjs, evals/conversation-privacy.eval.mjs, evals/wallet-privacy.eval.mjs, evals/account-privacy.eval.mjs, evals/guest-claim-integrity.eval.mjs, client/src/main.wiring.test.ts, server-module/src/accounts.rs`
`after:` none — MUST land before the OQ1 issuer URL (issue #301 is answered; M21b-2 wiring is imminent)

Three security gates strip `//`-comments with no string-literal awareness:
`currency-integrity.eval.mjs:48` (no string-strip at all, feeding
`hasDirectBalanceWrite`/`hasWalletAccessorBypass`), `ranking-security.eval.mjs:77-111`
(comment-strip runs BEFORE string-strip), `conversation-privacy.eval.mjs:77-83` (imported
by `wallet-privacy.eval.mjs:127`). All three scan `accounts.rs`. A real `https://` issuer
URL written as a normal string literal truncates the line mid-string, unbalances quote
pairing, and can blank arbitrary later code from the scan — **false-GREEN capable**
(`accounts.rs:33-48` documents the hazard and hides behind a `concat!()` workaround;
trade-escrow-guards TR-11 historically went red from this same class). The correct
quote-first walker already exists in-tree (`account-privacy.eval.mjs:293`,
`guest-claim-integrity.eval.mjs:333` `stripRustSource`). Port it into the three evals via a
shared `evals/rust-scan.mjs` (the consolidation ADR-0179 §9 itself names: ~420 duplicated
scanner lines with already-diverged `splitArgs` copies); port the string-aware scanner
file-wide in `client/src/main.wiring.test.ts` (ADR-0180:993 residual); then delete the
`accounts.rs` `concat!()` workaround and write `ALLOWED_ISSUERS` naturally, updating its
hazard comment to point at the fixed scanners.

Proof-of-teeth (MUST start RED): a BAD fixture containing a `"https://…"` literal followed
by a genuine violation later in the same file — the violation must still be caught.

### 13r-d — Append-at-end schema-gate generalization (HIGH, LIGHT) — `touches: evals/battle-schema-snapshot.eval.mjs, evals/baselines/table-schemas.json, evals/bsatn-compat-smoke.eval.mjs`
`after:` none

The additive-schema gate compares columns as an unordered name→type map
(`checkSchemaDrift`, `battle-schema-snapshot.eval.mjs:96`) and cannot see column position,
while the codebase's own measured invariant (`schema.rs:251-254`; bsatn-compat-smoke
header) is that live spacetime 2.6.0 accepts ONLY tail-appended, `#[default(...)]`-annotated
columns. Order-aware checking exists solely as three hardcoded EG1 anchors
(`bsatn-compat-smoke.eval.mjs:1625-1632`, fixed column lists). Empirically reproduced
during review: a mid-struct insert plus the sanctioned re-baseline workflow passes the gate
green, deferring the failure to `spacetime publish` against the live self-hosted DB.
Generalize `checkAppendedColumns`/`parseStructFieldOrder` into the always-on gate: for
every baseline table, any column present in parsed-but-not-baseline must (a) sit after
every baseline column in source order and (b) carry `#[default(`. Extend the baseline
format to record column order. Proof-of-teeth (MUST start RED): mid-struct-insert fixture
goes RED even after re-baseline of the name→type map.

### 13r-e — monster_pub need-to-know privacy (HIGH, HEAVY; Drew-directed) — `touches: server-module/src/schema.rs, server-module/src/{battle,pvp,trading,taming,monster_mgmt,raising,movement,evolution,npc}.rs, client/module_bindings/*, client/src/net/{connection,store,rowConvert}.ts, evals/monster-privacy.eval.mjs (new), e2e/`
`after:` 13r-d (this slice appends schema surface; harden the gate first)

Implements the decision Drew has already made —
https://github.com/mdrewt/monster-realm/issues/284 (answered 2026-08-08, consumed and
closed by this review): players always receive all data about their OWN monsters;
information about monsters owned by OTHER players is revealed only on a need-to-know basis
(while actively engaged in battle with them, during trading for them, and in other cases
where the client requires it for UI/prediction — e.g. some quests/interactions) and is
private at all other times.

Current state @ `f9a063d`: `MonsterPub` is a public table (`schema.rs:306-360`) carrying 8
`essence_*` pools, `trust_tier`, `quality_time_tier`, `nutrition_pct`, `tier`; the client
subscribes `'SELECT * FROM monster_pub'` unfiltered (`connection.ts:619`); **zero
need-to-know machinery exists anywhere** — this is a from-scratch mechanism, not a
refinement. The mechanism choice (owner-filtered views vs contextual mirror rows vs
parameterized subscriptions) is an implementation ADR for the build loop; it MUST stay
additive-schema-safe (13r-d gate), preserve client prediction/battle-overlay/trade-window
needs, and note that ADR-0015/0046's V1 "unfiltered subscribe + client-side owner filter"
pattern is superseded by this decision for other-player rows. The mechanism ADR must cite
issue #284 as the deciding authority.

EARS: WHILE a player is not engaged with another player's monster, THE SYSTEM SHALL NOT
deliver that monster's rows to that player's client. WHEN a battle/trade involving it
starts, THE SYSTEM SHALL deliver the rows required for UI and prediction. WHEN the
engagement ends, THE SYSTEM SHALL cease delivering updates for it. Tests: new privacy eval
(subscription-shape + reducer scan), e2e battle/trade reveal-and-revoke, sim-harness
convergence unaffected.

### 13r-f — Held-key warp continuation, nh5 (MED, LIGHT-MED) — `touches: client/src/main.ts, client/src/prediction/heldKeys.ts, client/src/prediction/*.test.ts, client/src/main.wiring.test.ts`
`after:` none

Deterministic feel defect, disclosed twice (`docs/adr/0152:74` "nh5 candidate";
`docs/specs/nh3-plan.md:251` R6 "candidate slice nh5") and queued nowhere (grep of the
whole tree and this corpus: only self-referential mentions). `switchZone` →
`resetPredictionState` → `held.clear()` (`main.ts:689,731`) while the physical key is still
down; the keydown handler ignores `e.repeat` (`main.ts:962-966`) and `held.press` only runs
on non-repeat keydown (`main.ts:1301`), so movement halts dead at every zone boundary
crossed while holding a key, until release+re-press. Fix per ADR-0152's own analysis:
preserve (capture + re-press) the held stack across the WARP arm only; the reconnect arm's
`held.clear()` is load-bearing (ADR-0152 gap-closing guarantee) and MUST NOT change.
Regression teeth: held direction survives warp-path `resetPredictionState`; is cleared on
the reconnect path. Review the fix against ADR-0152's per-path invariant section before
landing (it changes a named assumption).

### 13r-g — Docs/ledger freshness (MED, LIGHT, docs+tooling) — `touches: CHANGELOG.md, .github/workflows/nightly.yml, scripts/, m13.5r-plan.md, docs/`
`after:` none

CHANGELOG has re-drifted 18 PRs (#291-#306 absent; Features ends at #286, Fixes at #288)
one milestone after 12r-f reconciled it — because ADR-0165's Accepted decision (nightly
changelog-freshness check) was assigned to 11r-i and silently never implemented (no
changelog automation exists in `.github/workflows/` or `scripts/`; 11r-i's delivered scope
per `ARCHITECTURE.md:1290` contains no such item). Deliver: (1) `just changelog` regen +
commit; (2) the ADR-0165 nightly check itself, proof-of-teeth against a stale fixture;
(3) move the root-orphan `m13.5r-plan.md` into `docs/` beside its siblings (added once in
PR #130, referenced nowhere, targets long-superseded mutation baselines).

### 13r-h — Rust test-mirror parity tail (LOW-MED, LIGHT) — `touches: server-module/src/accounts_tests.rs, server-module/src/evolution_tests.rs, server-module/src/schema.rs, server-module/src/accounts.rs`
`after:` 13r-c (overlapping `accounts.rs` edits; also shares the scanner-hygiene theme)

Three bundled parity wounds, all ADR-disclosed (ADR-0179 §9), none queued:

1. `accounts_tests.rs:1517-1525` — the G2 Rust mirror checks a hardcoded 5-reducer needle
   list, blind to an added reducer taking `Identity` (its JS twin
   `guest-claim-integrity.eval.mjs` derives the set via `parseReducers` and fails loud on
   an empty set). Port dynamic enumeration.
2. `evolution_tests.rs:2591` — `scheduled_scan_sources()` hardcodes 10 files, omitting
   `accounts.rs` (`guest_claim_reaper`) and `observability.rs` (`mr_heartbeat`): EG2-9's
   Rust mirror does not cover the two newest scheduled reducers (the JS twin
   `no-idle-accrual.eval.mjs:197` reads the directory dynamically). Replace with a
   `read_dir` over `server-module/src/*.rs` minus `*_tests.rs` — the same fix ADR-0179
   already applied to `pvp_tests.rs` for this exact bug class.
3. `schema.rs:685-700` — `Account` permits illegal states: `status: AccountStatus` +
   independent `deletion_requested_at_ms: Option<i64>`, and half-settable
   `claimed_from`/`claimed_at_ms`. If SpacetimeDB codegen permits, fold the timestamp into
   `PendingDeletion { requested_at_ms }` (and pair the claim provenance); otherwise add a
   debug_assert'd invariant in the four pure constructors + an eval-gated struct-shape
   tripwire. M22 will extend `delete_account` — land this before then. Deliberately
   EXCLUDES the tombstone rating re-anchor (pending issue #307 / OQ2).

## 3. Sequencing & fan-out

Serial chains: 13r-a → 13r-b; 13r-c → 13r-h; 13r-d → 13r-e. Independent: 13r-f, 13r-g.
Advisory pairwise-disjoint fan-out candidates (NECESSARY-NOT-SUFFICIENT; supervisor derives
the truth from `touches:`): (13r-a, 13r-c), (13r-a, 13r-d), (13r-c, 13r-f), (13r-d, 13r-g),
(13r-f, 13r-g). `mr-disjoint` was not run this cycle (decision-defaulted). No tier hints
(supervisor derives HARD/routine from `touches:`). No ADR numbers pre-allocated
(supervisor-owned via `adr_next_free`).

## 4. DECISIONS for Drew

- OPEN: https://github.com/mdrewt/monster-realm/issues/307
  (`DECISION(rev13-ranked-requires-account)`) — ADR-0179 OQ2 plus the tombstoned-profile
  0-anchor consequence. No slice in this milestone depends on the answer; 13r-h explicitly
  excludes the re-anchor fix pending it.
- CONSUMED & CLOSED this cycle: https://github.com/mdrewt/monster-realm/issues/284 — the
  answer is implemented as 13r-e.
- Process bootstrap (harness repo): https://github.com/mdrewt/claude-harness/issues/13
  (`DECISION(rev-ledger-row)`).

## 5. Explicitly NOT in scope

- Playwright CI retries (decision-defaulted: leave at zero — the supervisor's targeted
  `gh run rerun --failed` doctrine covers transients; blanket retries would mask real
  flakes and weaken the gate).
- M21b-2 OIDC-dependent work (supervisor-owned; issue #301 is answered and follows its own
  path).
- `battle_challenge.target` / terminal `battle.*` re-key cascade (tracked to M22 per the
  `guest-claim-integrity.eval.mjs` REKEY_MANIFEST corrections).
- G12 reject-reason value-pin (verified already implemented in
  `account-privacy.eval.mjs` `[G12/value-pin]` — ADR-0179's follow-up note is
  stale-satisfied; no work needed).
- The dev-box load-driver saturation caveat (documented in the m20e handoff; 13r-b does not
  re-attempt a breaking-point measurement).

## 6. Notes for the runner

- Eight slices; ADR per slice reserved at build time (verify `adr_next_free` in
  `mr-state.json` at spawn, per convention).
- Every slice is test-first with a proof-of-teeth per ADR-0010. **13r-c and 13r-d proofs
  MUST start RED against the current gates** — a green-from-the-start test there means the
  fix was not actually applied. 13r-f's warp-survival tooth must likewise fail against the
  current `held.clear()` behavior.
- 13r-a's boot proof is manual-evidence + static tripwires (G11 precedent — runtime
  container facts are not statically checkable).
- 13r-e is the only slice with game-visible surface; its mechanism ADR must cite issue
  #284 as the deciding authority and confirm additive-schema safety against the 13r-d gate.
