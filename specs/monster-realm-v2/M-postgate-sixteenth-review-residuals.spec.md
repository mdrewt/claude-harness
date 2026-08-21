# M-postgate-sixteenth-review-residuals — verified sixteenth-review findings

**Review ordinal:** 16 (weekly generate-improvement-plan) · **Pinned SHA:** `064e627bc2d4d1b5097b2206acd9ff43799e42b1` · **Review UTC:** 2026-08-21T00:45Z
**Provenance:** standard multi-lens review of the `67fbff8..064e627` delta (2.8.1 SDK migration ADR-0197, 15r-sec-a/sec-vis/a2, lp-03) plus full-repo sweep. 8 sonnet lenses, 0 lens contradictions, every reported claim re-verified by 2 independent verifier agents (9 verified, 1 dropped — the view-PK "untracked" claim was refuted: adoption is already tracked in `M-stdb-2x-module-sdk` sdk-d and the 15r-sec-a slice text; only its doc language is fixed here, in 16r-a).

## 1. Why this milestone exists

The delta code itself is clean: the security, test-integrity, and correctness lenses each
returned an explicit "no findings" (15r-sec-a's `my_battle` view was verified byte-for-byte
against ADR-0198 D2; the ctx.sender() migration is complete at all ~103 call sites; the
essence-graph core survived a dedicated pass). What remains is the enforcement-and-truth
layer around the code: stale post-migration doc instructions that actively mislead agents,
and the disclosed-but-untracked class — items named in ADR Consequences/postscripts
(0177 D3, 0195, 0196, 0197) that exist in no queue. One Drew decision is open as
https://github.com/mdrewt/monster-realm/issues/342 (rev16-obs48-procedures); no slice
depends on it.

## 2. Slices (ROI order)

### 16r-a — Post-2.8.1 doc-truth sweep (HIGH doc-drift, LIGHT)
touches: AGENTS.md, ARCHITECTURE.md, server-module/Cargo.toml, docs/adr/0197-spacetimedb-2.8.1-upgrade.md, docs/spacetimedb-2.8.1-upgrade-runbook.md
after: []
- AGENTS.md's toolchain bullet contains BOTH "Write 2.x module syntax" AND the stale
  "**Write 1.x module syntax** (`#[table(name = x)]`, `ctx.sender` as a *field*) until the
  `M-stdb-2x-module-sdk` migration lands." — the migration landed 2026-08-16; the 1.x
  sentence instructs agents to write code that no longer compiles. Delete it.
- ARCHITECTURE.md:25 (current-state overview): "validate `ctx.sender` + legality" →
  "validate `ctx.sender()` + legality".
- server-module/Cargo.toml:16-19 comment still says "crate 1.12.0 (last 1.x)… write 1.x
  syntax" — correct to 2.8.1 reality.
- ADR-0197 (~299-302) + upgrade-runbook (~163): view primary keys are "now available…
  removes the constraint" — overstated; none of the five `#[view]` declarations adopts
  `primary_key`, and `store.ts`'s hand-rolled reconciliation remains load-bearing. Reword
  to "available, NOT yet adopted — adoption tracked as sdk-d opportunistic follow-up".
- EARS: WHEN an agent reads AGENTS.md/ARCHITECTURE.md THE SYSTEM SHALL present only 2.x
  module syntax as current; WHEN a reader consults ADR-0197/runbook on view PKs THE
  record SHALL state adoption status accurately.
- Tests: doc-only; `just ci` green (adr-digest regen if ADR headers touched).

### 16r-c — ADR-0196 follow-ups: close the changelog-freshness gate blind spot (HIGH gate-integrity, LIGHT-MED)
touches: evals/nightly-smoke-wiring.eval.mjs, justfile, .github/workflows/nightly.yml
after: []
- ADR-0196:250-268 names four follow-ups; none queued. Priority is #3: the guarded-job
  predicates (`jobIsNotNeutered` etc.) are applied only to mutation/mutation-server/
  coverage — a future `continue-on-error: true` on the `changelog-freshness` nightly job
  is invisible to `just ci` forever. Extend the guarded-job list to `changelog-freshness`
  with a proof-of-teeth fixture (neutered-job variant must fail).
- Also deliver #2: `just changelog-check` recipe + pin the git-cliff version in the
  `just changelog` path. Items #1 (move gating into a dedicated
  `changelog-freshness-teeth.eval.mjs`) and #4 (shell `main()` coverage) are OPTIONAL —
  deliver or record a dated deferral in the ADR, not silence.
- EARS: WHEN the nightly `changelog-freshness` job is neutered (continue-on-error,
  removed from needs-fan-in, or deleted) THE `nightly-smoke-wiring` eval SHALL fail.
- Tests: new fixture cases inside evals/nightly-smoke-wiring.eval.mjs.

### 16r-b — ADR-0195 scanner-machinery residuals (MED, MED-HEAVY)
touches: evals/**, server-module/src/accounts_tests.rs, server-module/src/observability.rs (read), evals/rust-scan.mjs
after: []  # but SERIAL-REQUIRED vs 15r-sec-mig-a/b/c/d + 13r-c-2 (scanner-migration-audit STRUCTURAL rule) — schedule after that family or between its waves
- ADR-0195:136-152 names seven open residuals, none queued and none overlapping the 15r
  scanner-migration family (verified: those slices touch the JS `*-reducer-security`
  evals; these items are the Rust-side mirror machinery + three DIFFERENT evals):
  G12 identifier-list parity; `write_target_accessors`' unbounded `rfind`; the
  `//`-before-strings stripper ordering in wallet-privacy/ranking-security/
  currency-integrity; a shared Rust-side scanner library; the char-literal brace-walk
  truncation class; the identity-constructor ban list gap; phantom-brace local-truncation
  of `build_log_line`'s stripped body.
- Fix the concrete defect classes (stripper ordering, brace-walk truncation, rfind bound,
  ban-list gap, phantom-brace) with canary/teeth fixtures each; G12 parity + the shared
  scanner library may be delivered together or split with a recorded disposition for the
  remainder — no silent drops.
- EARS: WHEN a Rust source file under scan contains a char literal `'}'` or a `//` inside
  a string literal THE scanners SHALL not truncate or mis-strip the scanned body (teeth:
  canary fixture per class); WHEN the ADR-0195 residual list is revisited THE ADR SHALL
  carry per-item dispositions.
- Tests: per-class proof-of-teeth fixtures in the touched evals.

### 16r-d — playtest-report on `spacetime sql --format json` (MED, LIGHT-MED)
touches: scripts/playtest-report.mjs, scripts/smoke-republish.sh
after: []
- `parseSqlTable` hand-parses pipe tables behind a comment asserting "2.6.0 has no --json
  output mode"; the CLI pin is 2.8.1 and `--format json` exists since 2.7.0 (ADR-0197
  follow-up, queued nowhere). Replace the parser with `--format json` consumption (or, if
  the pipe format is deliberately kept, say why in the comment and record the declined
  follow-up in ADR-0197). Re-validate smoke-republish.sh's per-arg JSON encoding comment
  against the 2.8.1 CLI and update its stated version either way.
- EARS: WHEN `just playtest-report` runs against a 2.8.1 CLI THE report SHALL parse rows
  via a stable machine-readable format (or a documented, dated decision to keep the
  pipe-table parser); WHEN a reader consults either script's CLI-version comment THE
  stated constraint SHALL match the pinned CLI.
- Tests: parser unit fixtures updated; smoke-republish stays green in nightly.

### 16r-f — battleReseedPending sticky latch (LOW-MED netcode-telemetry, LIGHT)
touches: client/src/main.ts, client/src/main.wiring.test.ts
after: []
- main.ts:1719-1751 consumes the one-shot reconnect latch BEFORE knowing whether the
  `my_battle` post-reconnect snapshot has landed (`battleReseedPending = false` precedes
  the `latest` check; `latest === undefined` still burns the latch). Since ADR-0198 the
  battle store is filled by a batched view pull whose subscription-batch atomicity D7
  calls "assumed", so a partial-flush ordering emits a spurious `battleStart` into the
  event ring / F9 bundle after a fast reconnect race. Fix: do not clear the flag on a
  flush where `latest === undefined` — leave it set and let the next flush retry
  (removes the atomicity dependency entirely). Gameplay overlay is unaffected
  (independent state) — scope is telemetry correctness.
- EARS: WHEN a reconnect completes and the first store flush carries no battle rows THE
  reseed latch SHALL survive until a flush that observes definite battle state; WHEN an
  Ongoing battle survives a reconnect THE event ring SHALL NOT receive a new battleStart.
- Tests: runtime (not source-scan) test driving flush order around onReconnect — authored
  from these criteria by a different agent than the implementer.

### 16r-e — scheduled-function-delay wiring (LOW-MED, LIGHT)
touches: ops/observability/prometheus.yml, ops/observability/rules/recording.rules.yml, ops/observability/grafana/**
after: []
- `spacetime_scheduled_function_delay_seconds` (host metric, 2.8.0+; runbook §5 —
  NOTE the source threshold is 30 ms, the release note's "50ms" is wrong) appears nowhere
  in the committed stack. Add a recording rule + dashboard panel + warning-severity alert
  scoped to `movement_tick` and the trade/PvP reapers, mirroring the AlloyIngestStalled
  alert pattern.
- EARS: WHEN a scheduled reducer's start delay exceeds the warning threshold THE Grafana
  alert SHALL fire; WHEN the dashboard is opened THE per-scheduled-function delay series
  SHALL be visible.
- Tests: observability-stack-config eval extended to pin the new rule/panel presence.

### 16r-g — retire Bond/apply_care/CareError from game-core (LOW, LIGHT)
touches: game-core/src/monster/types.rs, game-core/src/raising/rules.rs, game-core/src/raising/types.rs, game-core/src/raising/mod.rs, game-core/src/raising/m9a_gating_tests.rs
after: []
- ADR-0177 D3's named follow-up ("retire Bond/apply_care/CareError from game-core in a
  dedicated cleanup slice") exists in no queue. `Bond(u8)`, `apply_care`,
  `CARE_BOND_AMOUNT`, `CareError` are server-unused since Migration B removed the `bond`
  column; they model a field the schema no longer has and are kept alive only by their
  own tests. Delete them + their re-exports + their now-orphaned tests; update ADR-0177
  with the delivered disposition.
- EARS: WHEN game-core compiles THE crate SHALL contain no Bond/apply_care/CareError/
  CARE_BOND_AMOUNT symbols; WHEN `just ci` runs THE suite SHALL be green with the
  orphaned tests removed (test-deletion audit note: these tests gate only the deleted
  symbols — record in the PR body for mr-audit).
- Tests: compile + existing suite; no replacement tests needed.

### 16r-h — nightly red-response policy for mutation/coverage (MED, MED; Drew-directed)
touches: .github/workflows/nightly.yml, docs/, evals/nightly-smoke-wiring.eval.mjs
after: [16r-c]
- Implements the answered decision mdrewt/claude-harness#14 (consumed 2026-08-21):
  "mirror the smoke-republish insertion policy for mutation/coverage and add a
  lightweight issue-on-failure step to nightly.yml". lp-03 (#341) delivered the
  issue-on-failure half; THIS slice delivers the policy half — a documented red-response
  policy for the mutation/coverage nightly jobs mirroring the smoke-republish precedent
  (red job ⇒ a queued fix slice per the fix-nightly-mutants pattern, with the ADR-0118 §4
  re-baseline ladder as the escalation path), wired so a red night is never
  policy-ambiguous again (the 14r-a five-red-nights incident is the motivating case).
  Elaborate the exact mechanism at build time against the smoke-republish precedent; keep
  15r-tst-i's rate-based ratchet as the measurement substrate (do not duplicate it).
- EARS: WHEN a mutation or coverage nightly job goes red THE repo SHALL contain a written
  policy naming the required response and its owner; WHEN the policy file drifts from the
  wired workflow THE nightly-smoke-wiring eval SHALL fail (extend its fixtures).
- Tests: eval fixture for the policy-wiring check.

## 3. Sequencing & fan-out

Serial constraints: 16r-b is SERIAL-REQUIRED against 15r-sec-mig-a/b/c/d + 13r-c-2
(shared scanner-migration surface; mr-disjoint's STRUCTURAL `*migration*` rule). 16r-h
after 16r-c (shared `evals/nightly-smoke-wiring.eval.mjs`). Everything else —
16r-a/16r-d/16r-e/16r-f/16r-g — is pairwise disjoint; fan out per PLAN §9 (N ≤ 2).
`after:` metadata above is advisory for the supervisor's planning read.

## 4. Decisions

- OPEN: https://github.com/mdrewt/monster-realm/issues/342 (rev16-obs48-procedures) —
  M20 OBS-48 export-path re-adjudication now that Procedures are stable at 2.8.1. No
  slice here depends on it; when answered, the consumer is the next weekly review (or an
  M20 build slice if one launches first — the answer amends ADR-0180/M20 spec text).
- decision-defaulted:view-pk-adoption=left-to-sdk-d (docs corrected in 16r-a only).
- decision-defaulted:rev14-issue-14-implementation-home=16r-h.

## 5. Explicitly NOT in scope

- View primary_key ADOPTION (sdk-d owns it; 16r-a only fixes the overstated docs).
- The 15r scanner-migration family and everything else queued in
  M-postgate-fifteenth-review-residuals (in flight ahead of this milestone).
- mr-trace-relay breadcrumb-pairing re-verification (runbook §4): pair set is empty
  (`trace-pair-set.json` = `[]`) — nothing live to verify; becomes real when M20
  instrumentation lands. Recorded here so it isn't lost, deliberately sliceless.
- M20 remaining capstone scope, M21b-2/b-3, M22–M25, roster-wave-3.

## 6. Notes for the runner

- Verification-dropped finding (for the record): "view-PK adoption untracked" — refuted
  (tracked via sdk-d + 15r-sec-a slice text); only the doc language ships, in 16r-a.
- The review's full report lives in the 2026-08-21 Cowork task chat; headline counts:
  9 verified findings, 0 Critical/High product defects, 3 lenses explicitly clean.
- No tier hints on purpose (derive HARD/routine from `touches:`); no ADR numbers
  pre-allocated (adr_next_free is supervisor-owned).
