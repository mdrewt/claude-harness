# M-postgate-fourteenth-review-residuals — verified 2026-08-13 review findings

> **Review ordinal:** fourteenth. **Pinned SHA:** `8814416`
> (`88144164c3aaffeab9983907d661f58dada70ff2`), reviewed 2026-08-14T00:41Z (UTC).
> 7 lenses + 3 independent verifiers; 15 findings verified, 2 dropped in verification.
> Decisions live as GitHub issues only: mdrewt/monster-realm#313, mdrewt/claude-harness#14.

## 1. Why this milestone exists

The master delta since the thirteenth review (#308–#311) is clean — the 13r-c scanner
rework survived adversarial re-review with zero regressions found. What this review
surfaced instead: (1) an OPERATIONAL failure — the nightly `mutation-server` ratchet
(ADR-0050/0118) has been red for 5 consecutive days (324 survivors vs cap 299) with no
reaction, because nightly failures have no alerting and no fix-red insertion policy;
(2) the gates guarding the stakes-classified trading subsystem are entirely static
source-scanners — no dynamic negative-path test exists anywhere in the repo for any of
the four trade reducers; and (3) the recurring disclosed-but-untracked class: six ADR
residuals explicitly routed "to a future slice" that never entered any queue.

## 2. Slices (ROI order; `touches:` per the M8.9 domain map)

### 14r-a — Nightly mutation gate: triage, re-baseline, failure visibility (HIGH, LIGHT-MED)
`touches: justfile, .github/workflows/nightly.yml, evals/nightly-smoke-wiring.eval.mjs, docs/adr/`
`after:` (none)

Nightly `mutation-server` red 2026-08-09..08-13: "753 mutants tested: 324 missed, 377
caught, 52 unviable; survivor count 324 exceeds cap 299 — mutation ratchet violated
(ADR-0050)". No re-baseline since m17.5a (2026-07-17, 299/513). Total mutants grew
513→753; trading/accounts/observability/evolution were all touched after the baseline, so
attribution requires the ADR-0118 §4 procedure (run locally, diff missed.txt, classify
new survivors as legitimate-shell vs weak-test). Nightly has zero notification wiring
(verified: no slack/webhook/issue step in nightly.yml) and a documented failure-insertion
policy exists only for smoke-republish (nightly.yml:78-81), not mutation/coverage.

Tasks: (1) run the ADR-0118 §4 re-baseline procedure at the slice head; record the triage
in a new ADR; adjust `justfile` cap AND `MUTATE_SERVER_CAP_BASELINE` in
`evals/nightly-smoke-wiring.eval.mjs` together (ADR-0137 rule: ceiling tracks cap).
(2) Wire failure visibility for `mutation`, `mutation-server`, `coverage` jobs per the
answer to mdrewt/claude-harness#14 (decision-hook below); until answered, implement the
reversible default: a documented failure-policy comment mirroring smoke-republish's.

EARS: WHEN the nightly mutation-server job fails, THE SYSTEM SHALL surface the failure
through the wired channel (issue/insertion per #14 answer) within one nightly cycle.
WHEN the cap is re-baselined, THE SYSTEM SHALL change justfile cap and the wiring-eval
baseline in the same commit, with an ADR recording the survivor triage.
Tests: `evals/nightly-smoke-wiring.eval.mjs` (extend: failure-policy comment presence for
mutation jobs); proof-of-teeth per ADR-0010 for any new gate logic.
Decision-hook: mdrewt/claude-harness#14 (rev14-nightly-red-policy) — wiring shape only;
triage + re-baseline proceed regardless.

### 14r-b — Trading reducer behavioral negative-path suite (HIGH, MED)
`touches: server-module/src/trading_tests.rs, client/e2e/, evals/trade-reducer-security.eval.mjs, scripts/`
`after:` 14r-a (re-baseline first so new kill-tests ratchet DOWN from a fresh cap)

Verified: `trading_tests.rs` tests only pure game-core functions plus static
`include_str!("trading.rs")` source checks; `trade-reducer-security.eval.mjs` /
`trade-conservation.eval.mjs` are pure static scanners; the three e2e trade specs
construct only single-monster, zero-item, one-directional, legitimate-party trades.
Consequence: NO automated gate would catch a regression in — propose_trade
insufficient-inventory rejection (trading.rs:330/:355, `qty > count.saturating_sub(escrowed)`
exact boundary unpinned), respond_trade decline (`accepted=false`, :439), cancel_trade
non-party rejection (:747), or an `==`→`!=` inversion at the authorize_respond/confirm
call sites (:433/:472 — the structural checkers verify field presence in the arg span,
never the operator; an inversion would let a third party accept someone else's trade).

Tasks: add dynamic reducer-level tests (spacetime start --in-memory + published module
round-trip, pattern per `scripts/smoke-republish.sh`, or Playwright where UI-reachable)
covering: (1) propose with qty exceeding on-hand → Err "insufficient inventory";
(2) exact-boundary qty == available → Ok; (3) insufficient currency → Err;
(4) respond_trade(id, false) → row deleted, escrow released, reaper disarmed;
(5) cancel_trade by non-party → Err "not a party" (and counterparty-cancels → Ok);
(6) respond/confirm by wrong role → Err (kills the operator-inversion class);
(7) multi-item bilateral trade near receiver cap (exercises the :548-597 net-headroom
find closures with a discriminating multi-stack inventory). Additionally tighten
`hasCancelPartyCheck` (trade-reducer-security.eval.mjs:339-360) to anchor the `&&`
between the two inequality clauses (currently `[^{]*?` — operator-blind).

EARS: WHEN a non-party calls cancel_trade or a wrong-role identity calls
respond/confirm, THE SYSTEM SHALL reject, and a dynamic test SHALL fail if it does not.
WHEN a trade offers exactly the full available stack, THE SYSTEM SHALL accept it.
Tests: new `client/e2e/trade-negative.spec.ts` (or Rust integration harness file) + the
tightened eval; proof-of-teeth: each new dynamic test must be shown RED against a
deliberately inverted operator before merge (ADR-0010).

### 14r-c — Scanner-migration wave: remaining evals onto rust-scan (HIGH, MED-HEAVY, mechanical, split-friendly)
`touches: evals/*.eval.mjs, evals/rust-scan.mjs, client/src/main.wiring.test.ts, server-module/src/lib.rs, server-module/src/*_tests.rs`
`after:` (none; coordinate with 13r-c-2 — see exclusion)

ADR-0181's own measurement: 26 evals strip `//`-comments with no string pass, 9 run the
string pass after the strip; 13r-c fixed three; ~29 remain false-GREEN-capable, several
named `*-security.eval.mjs` / `*-privacy.eval.mjs`. Only `trade-escrow-guards.eval.mjs`
is tracked (13r-c-2 — EXCLUDED here; it keeps its M21b-2-deploy gate role and its own
drafting pass). Tasks: enumerate the remaining evals (re-run ADR-0181's measurement at
the slice head), migrate security/privacy-named ones first onto `stripRustSource` /
the shared TS scanner, tail the rest; wire `assertStripperSound` per migrated file.
Fold in two verified residuals: (a) the TS `startsRegexLiteral` preceding-char set
includes `}` (conversation-privacy.eval.mjs:~128 and main.wiring.test.ts:7859 — object
literal followed by division misclassifies; drop `}` from the set, the safe direction);
(b) ADR-0166 R5: give the 4x-duplicated `strip_rust_comments` test helper its shared
`scan_helpers` home in lib.rs, and move the trade-size cap to its guards.rs SSOT home.

EARS: WHEN any migrated eval scans Rust/TS source, THE SYSTEM SHALL strip comments
string-literal-aware (stripRustSource / shared TS scanner) with assertStripperSound
wired. WHEN the migration lands, THE SYSTEM SHALL leave zero *-security/*-privacy evals
on comment-strip-without-string-pass (re-run the ADR-0181 measurement as the gate).
Tests: per-eval proof-of-teeth fixtures preserved; new regression teeth only where a
migration changes matching behavior.

### 14r-d — PvE settle log-and-commit hardening (MED, LIGHT)
`touches: server-module/src/battle.rs, server-module/src/battle_tests.rs`
`after:` (none)

ADR-0168 disclosure, verified live: `submit_attack` (battle.rs:737), `swap_active`
(:871), `flee` (:905) end with `write_back_battle_results(ctx, &battle)?;` — a write-back
error aborts the reducer leaving the row `Ongoing`, which (post-ADR-0168 D1) also
movement-freezes the player while connected: a rare data-invariant fault becomes a
softlock. The disconnect path (:1443) already uses the hardened
`if let Err(e) = ... { log::error!(...) }` log-and-commit shape, as does the PvP funnel.
Task: apply the same shape at the three PvE sites (commit the terminal outcome, log the
write-back error), matching the PvP funnel's semantics.

EARS: WHEN write_back_battle_results errors during PvE resolution, THE SYSTEM SHALL
still commit the terminal battle outcome and log the error, not abort with the row
Ongoing. Tests: a battle_tests.rs case (or static-shape test mirroring the existing
ea_* conventions) pinning that no PvE resolution path `?`-propagates the write-back call;
proof-of-teeth: shown RED against the current `?` shape.

### 14r-e — dualkey-dedup + mvi-e2e runtime proof (MED, LIGHT-MED)
`touches: client/src/main.ts, client/src/prediction/, client/e2e/`
`after:` (none)

ADR-0158 residuals 3+4, verified: (a) `main.ts:932-933` binds ArrowRight and KeyD both
to 'East' unconditionally — the SOLE remaining same-direction double-move path
(ADR-0148 residual 1b); fix per the ADR's own sketch (skip the first step when the
direction is already held via the other key code). (b) `mvi-e2e` parked: no test
executes main.ts's frame body; add a Playwright keyboard-driven e2e that proves the
hold-commit gate at runtime (closes the two "un-killable mutant classes" ADR-0158 names,
and while in the area may pin the ADR-0152 fresh-Predictor outstandingSteps residual
if cheap — do not expand scope for it).

EARS: WHEN both key codes for one direction are pressed in overlap, THE SYSTEM SHALL
produce exactly one step per movement cadence window (no double-move). WHEN the e2e
runs, THE SYSTEM SHALL drive main.ts's real frame body via synthetic keyboard events.
Tests: `client/e2e/movement-input.spec.ts` (new) + prediction unit additions;
proof-of-teeth RED against current dual-bind behavior.

### 14r-f — Small-hygiene sweep: routed-but-never-queued residuals (MED, LIGHT)
`touches: server-module/src/evolution.rs, server-module/src/movement.rs, client/src/ui/tradeProposeModel.ts, client/src/ui/tradeProposeModel.test.ts, evals/baselines/, evals/`
`after:` (none)

Four independently verified disclosed-but-untracked items, batched: (1) ADR-0170
residual 8 ("queue it, not re-disclose it"): evolution.rs:202-203/:220-221/:234
interpolate `{e}` into hand-built JSON logs unescaped — route through the existing
`json_escape()` (same fix 12r-d applied to battle/npc/pvp/content). (2) ADR-0166 R4:
movement_tick's grass-encounter `already` pre-check (movement.rs:420-425) is
side-A-only — swap to the both-role `is_in_ongoing_battle` its two neighbor guards use.
(3) ADR-0166 R6: `buildProposeSubmission` (tradeProposeModel.ts:138-140) has no
selection-count upper bound — add the `<= 64` clause (server cap
MAX_TRADE_MONSTERS_PER_SIDE, trading.rs:37) so over-cap offers fail in-UI, not as an
opaque reducer reject. (4) species/item/skill id-baseline blind spot (self-disclosed in
evals/baselines/species-ids.json header): extend to map-shaped (id → name/content-hash)
form mirroring evolution-path-edge-ids.json so id reuse/rebinding reds the gate.

EARS: WHEN a reducer error is interpolated into a JSON log line in evolution.rs, THE
SYSTEM SHALL escape it. WHEN either battle role is Ongoing, THE SYSTEM SHALL skip the
grass-encounter roll. WHEN a player selects >64 monsters for a trade, THE SYSTEM SHALL
disable submission client-side. WHEN a content id is rebound to different content, THE
SYSTEM SHALL red the registry gate. Tests: per-site unit/eval additions with
proof-of-teeth (notably: id-rebind BAD fixture shown RED).

### 14r-g — Ranked-requires-account enforcement (MED-HIGH, LIGHT-MED; Drew-directed) — game-visible
`touches: server-module/src/pvp.rs, server-module/src/pvp_tests.rs, evals/ranking-security.eval.mjs, client/src/ui/`
`after:` (none)

Implements Drew's rev13 answer (issue mdrewt/monster-realm#307, consumed+closed
2026-08-13): ranked play requires a full (non-guest) account (resolves ADR-0179 OQ2).
Current state (verified): `challenge_pvp` (pvp.rs:669) and `accept_challenge` (:820)
gate only on a `player` presence row — guests can enter ranked; every human-vs-human
battle is ranked (`is_ranked_pvp`, guards.rs:350). Enforcement: reject in
`challenge_pvp` when `!accounts::is_account_holder(ctx, me)` or the target is not an
account holder, and re-check `me` (and ideally the challenger) in `accept_challenge`
(status may change between challenge and accept). `is_account_holder`
(accounts.rs:190) is the correct SSOT predicate — NOT `has_jwt()` (true for every
connection, per accounts.rs's own doc). Client: surface the rejection reason and gate
the PvP challenge UI affordance for guests with a claim-account prompt. The mechanism
ADR must cite issue #307 as the deciding authority.

EARS: WHEN a guest identity calls challenge_pvp or accept_challenge, THE SYSTEM SHALL
reject with a distinct reason. WHEN both parties hold accounts, THE SYSTEM SHALL admit
the challenge unchanged. WHEN a guest views the PvP UI, THE SYSTEM SHALL show the
account-required affordance instead of an opaque failure.
Tests: pvp_tests.rs structural + dynamic coverage per 14r-b's harness if landed;
`evals/ranking-security.eval.mjs` extended with an account-gate criterion
(proof-of-teeth BAD fixture: gate absent → RED).
Decision-hook: mdrewt/monster-realm#313 (rev14-guest-rating-legacy) — governs ONLY the
pre-enforcement guest-rating migration sub-step (recommended default: leave in place,
inert until claimed; claim-flow rekey preserves continuity). Build everything else.

## 3. Sequencing & fan-out

Serial: 14r-a → 14r-b (re-baseline before new kill-tests move the count). All others
mutually independent by touches:. Disjoint sibling candidates for fan-out: {14r-c,
14r-d}, {14r-e, 14r-f, 14r-g} — c/d touch evals+battle.rs, e/f/g touch client
main.ts / evolution+movement / pvp respectively; 14r-f and 14r-b both touch evals but
different files. `mr-disjoint` verdicts advisory at spawn time.

## 4. DECISIONS for Drew

- OPEN: https://github.com/mdrewt/monster-realm/issues/313 (rev14-guest-rating-legacy)
- OPEN: https://github.com/mdrewt/claude-harness/issues/14 (rev14-nightly-red-policy)
- CONSUMED & CLOSED this cycle: https://github.com/mdrewt/monster-realm/issues/307
  (rev13-ranked-requires-account) — implemented as 14r-g.
- CONSUMED, close pending: https://github.com/mdrewt/claude-harness/issues/13
  (rev-ledger-row, answered "yes"; ledger row written; close was blocked by the Cowork
  permission classifier — next cycle closes it).

## 5. Explicitly NOT in scope

- 13r-c-2 (trade-escrow-guards.eval.mjs migration) — separately tracked; gates M21b-2's
  deployment-timed issuer flip (ADR-0182 D18). 14r-c must not touch that file.
- The remaining 13r slices (a,b,d,e,f,g,h) — queued ahead of this milestone.
- M21b-2 / PR #312 content (supervisor-owned, in flight).
- ADR-0159 residuals (overlay await-guards for 4 remaining views, NPC wander lockstep),
  ADR-0171 D-A..D-F (JitterEstimator dead class etc.), ADR-0152 fresh-Predictor
  outstandingSteps residual — verified real but below this cycle's ROI bar; recorded
  here as the long-tail appendix for a future sweep (14r-e may opportunistically pin
  the ADR-0152 item only if free).
- Mutation-survivor kill-tests beyond trading (accounts/observability/evolution shells)
  — 14r-a's triage decides whether they are legitimate-shell (priced into the new
  baseline) or demand their own slice next cycle.

## 6. Notes for the runner

- Seven slices; ADR per slice reserved at build time (verify `adr_next_free` in
  mr-state.json at spawn, per convention). No tier hints — derive from `touches:`.
- Every slice test-first with proof-of-teeth per ADR-0010. 14r-b's teeth MUST start RED
  against a deliberately inverted operator; 14r-d's against the current `?` shape;
  14r-e's against the current dual-bind; 14r-f(4)'s against an id-rebind fixture.
- 14r-g is the only game-visible slice; its mechanism ADR must cite issue #307.
- 14r-a re-baseline commits justfile cap + wiring-eval baseline together (ADR-0137).
