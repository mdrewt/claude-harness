# M-postgate-twentyfirst-review-residuals — verified twenty-first-review findings

**Review ordinal:** 21 (weekly generate-improvement-plan) · **Pinned SHA:** `2f5ae9dc405451988dc60c0cb2d67de52d97f5ae` · **Review UTC:** 2026-09-25T10:11Z
**Provenance:** standard multi-lens review of master @ `2f5ae9d` (the `4ba39b5..2f5ae9d` delta —
20r-a..d fixes, rb-107/108/109 privacy-export hardening — plus a bounded full-repo sweep).
9 sonnet lenses, 0 lens contradictions, 3 independent verifier agents re-checked all reportable
claims: all CONFIRMED (two precision corrections absorbed: sim-harness methods are
`lock_battle`/`unlock_battle`, manifest counts are 17/26/43). One decision issue opened this
cycle, non-blocking: https://github.com/mdrewt/claude-harness/issues/134
(rev21-nightly-changelog-red — supervisor: record-and-ignore).

## 1. Why this milestone exists

Server security/authz (all 52 reducers enumerated; scheduled-reducer guards, ownership checks,
reject-not-clamp, private-table+view scoping all verified), schema/migration safety (43-table
baseline 1:1, gate un-gameable via merge-base resolution, 2.8.1 pins lockstep), and
spec-vs-code completeness (M24/M23/M22 headline criteria re-verified real) returned explicit
"no findings" this cycle. What remains: (a) the one battle-settlement caller that never got the
ADR-0185 D1 log-and-commit discipline — a disclosed-HIGH fifteenth-review residual
(S-taming-settle) that is in no queue; (b) a client i18n defect class: 19 raw-English strings
reach players through sinks the ADR-0257 scanner structurally cannot see, while a maintained
French catalog exists; (c) the ADR-0264 i18n-completion ratchet has zero mechanical enforcement
point (its X13 nightly-wiring deferral is tracked nowhere actionable); (d) nightly has been red
5 consecutive days (changelog-freshness only) with the policy-documented triage never fired;
(e) Drew's answered decision #479 (trade-time raising reset) has no implementation slice
anywhere; plus a sim-harness guard-fidelity gap, a self-disclosed predictor residual, and two
ARCHITECTURE.md drift items.

## 2. Slices (ROI order)

### 21r-a — taming.rs write-backs: apply ADR-0185 D1 log-and-commit (MED softlock-class, LIGHT)
touches: server-module/src/taming.rs, server-module/src/taming_tests.rs
after: []
- Evidence @ 2f5ae9d: `attempt_recruit` calls `write_back_party_hp(ctx, &battle)?`
  (taming.rs:169) and `write_back_battle_results(ctx, &battle)?` (taming.rs:270) with bare `?`,
  while every sibling battle-settlement caller uses log-and-commit: battle.rs:769/:911/:953/:1511
  (`if let Err(e) = ... { mr_log } ... update(battle)`) and pvp.rs:564/:584. battle.rs:758-768
  documents why: a `?` aborts the whole transaction, the row stays `Ongoing`, and post-ADR-0168
  an `Ongoing` row freezes movement and blocks new encounters — every retry reproduces it. On
  the recruit success path the bare `?` sits after `ctx.db.monster().insert(row)`, so a
  write-back failure also rolls back a genuinely successful recruit. Fifteenth-review spec
  records this verbatim as S-taming-settle (HIGH, "both still bare ?",
  M-postgate-fifteenth-review-residuals.spec.md:692) but no rb-* slice or residual tracks it —
  disclosed-but-untracked.
- EARS: WHEN `write_back_party_hp` or `write_back_battle_results` returns `Err` inside
  `attempt_recruit`, the error SHALL be logged via `observability::mr_log` (json-escaped, same
  shape as battle.rs's `submit_attack_writeback_err`) and the terminal
  `ctx.db.battle().battle_id().update(battle)` SHALL still run, on both the success and the
  failure/terminal paths; the recruit success path SHALL NOT roll back an inserted monster on
  write-back failure. A red-first test SHALL prove the battle row leaves `Ongoing` (and the
  recruited monster survives) when a write-back invariant check fails.

### 21r-b — route the 19 uncatalogued player-facing strings through the i18n catalog (HIGH product defect, LIGHT-MODERATE)
touches: client/src/main.ts, client/src/ui/sessionModel.ts, client/src/ui/sessionModel.test.ts, client/src/ui/careAction.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts
after: []
- Evidence @ 2f5ae9d: 16 raw-English literals pass through `showFeedback(...)` in main.ts
  (2656-2877: 8× 'disconnected — try again', 'Purchase complete!', 'Sale complete!',
  'Trade accepted!', 'Trade rejected.', 'Trade complete!', 'Trade cancelled.', 'Name updated!',
  'Offer sent!'); sessionModel.ts:31,124-133 defines 7 raw-English constants
  (session-expired/unreachable overlay) rendered via sessionView.ts:55-59 `.textContent`;
  careAction.ts:32 holds a third copy of the disconnected line — sessionModel.ts's own comment
  names the by-value duplication. catalog.fr.ts is real and maintained (537 lines, genuine
  French typography), and the same file already catalogs the same message correctly:
  catalog.en.ts:71 / catalog.fr.ts:80 `chrome.status.disconnected`, consumed via `tf()` at
  main.ts:972. A French-locale player sees raw English on every shop/trade/rename/propose
  feedback line and on the session-expiry overlay. This never trips ADR-0256's throw-on-miss
  (the strings never reach the resolver) nor ADR-0257's scanner (see 21r-c).
- EARS: All 19 strings SHALL move into catalog.en.ts + catalog.fr.ts under keys in the
  existing namespaces (e.g. `shop.feedback.*`, `trade.feedback.*`, `rename.feedback.*`,
  `tradePropose.feedback.*`, `session.*`), with the three 'disconnected — try again' copies
  collapsed onto the existing `chrome.status.disconnected` key (or a parameterless sibling if
  the `{where}` param does not fit the call sites); every listed call site SHALL consume
  `t()`/`tf()`. English output SHALL be byte-identical (M24 batch convention); existing tests
  stay green unmodified except sessionModel tests updated to assert catalog keys. A red-first
  vitest SHALL pin one representative per group (shop feedback, session overlay) resolving
  through the catalog in `fr`.

### 21r-c — i18n gate teeth: indirect-sink coverage + wire i18n-completion-check into nightly (MED gate-teeth, MODERATE)
touches: client/src/ui/i18n/hardcodedStrings.ts, client/src/ui/i18n/hardcodedStrings.test.ts, .github/workflows/nightly.yml, docs/nightly-red-response-policy.md, evals/nightly-smoke-wiring.eval.mjs
after: [21r-b]
- Evidence @ 2f5ae9d: (1) the ADR-0257 scanner's sink vocabulary is purely lexical —
  `.textContent`/`.title` assignment, `replaceChildren(`, `setAttribute(` — so a literal passed
  as a `showFeedback('...')` argument or held in a `*Model.ts` const contributes zero segments;
  the whole 21r-b class was structurally invisible and will recur with the next feedback-line
  feature. (2) ADR-0264 D8 defers the nightly `i18n-completion-check` job to backlog (ledger
  X13) — but no rb-* entry exists (grep: zero hits for i18n-completion/catalog-export/ICU/
  m24-s8 in M-residual-backlog.spec.md), justfile:557/:562 recipes are wired into NEITHER
  `ci:` (justfile:736) NOR nightly.yml (zero 'i18n' matches), so the locale-completion ratchet
  (evals/baselines/i18n-locale-completion.json) has no enforcement point at all.
- EARS: WHEN a string literal is passed as an argument to a `show*`/`render*`-named view method
  in a scanned file, or declared as a module-level string const in a `*Model.ts` file that
  flows to a view `.textContent`, the hardcoded-strings check SHALL count it as a sink (or a
  companion check SHALL flag it), with the ceiling ratchet staying shrink-only and SINK_FLOOR
  re-derived per ADR-0257's alive-check convention; red-first: a fixture with a literal
  `showFeedback('x')` fails before the scanner change is live... after 21r-b so the real tree
  is clean when the teeth arrive. WHEN nightly runs, a `i18n-completion` job SHALL run
  `just i18n-completion-check` (mirroring the changelog-freshness job shape), be listed in the
  notify job's `needs:`, have a row in docs/nightly-red-response-policy.md, and be asserted
  wired-and-unneutered by evals/nightly-smoke-wiring.eval.mjs — the exact 3-place edit
  ADR-0264 D8 scoped as X13.

### 21r-d — restore changelog freshness; nightly back to green (MED ops, LIGHT)
touches: CHANGELOG.md
after: []
- Evidence: nightly red 5 consecutive days (runs 35509521695 2026-09-20 .. 35999876580
  2026-09-24), sole red job `changelog-freshness` in first and latest; last green 2026-09-19.
  The uncovered ledger delta is the 2026-09-19..21 merge wave (20r-a..d PRs #480-#483,
  rb-107/108/109, m24 tail). nightly.yml:204 documents the failure policy ("triaged and
  inserted as the next slice in the milestone queue") — the standing-loop question is issue
  ch#134; this slice is the one-off remediation.
- EARS: `just changelog` SHALL be regenerated with the pinned git-cliff (2.13.1 — the recipe
  itself asserts the version and fails loud otherwise, justfile:291-300); `node
  scripts/changelog-freshness.mjs --check` SHALL exit 0 at the slice head; no other file
  changes. The next nightly run after merge SHALL be green on changelog-freshness.

### 21r-e — trade-time raising reset per answered DECISION #479 (MED design-debt, MODERATE)
touches: game-core/src/raising.rs, game-core/src/currency.rs, server-module/src/trading.rs, server-module/src/trading_tests.rs
after: []
- Evidence: https://github.com/mdrewt/monster-realm/issues/479 answered 2026-09-19 ("partial-
  preservation discount": on trade, keep level/species/IVs and essence pools; reset Trust and
  Quality-Time to 0 — relationship-with-THIS-trainer stats by design; essence NOT halved) and
  consumed by the loop, with "becomes its own slice in a later cycle" recorded — but no spec,
  backlog entry, or residual tracks it (grep-verified across M-residual-backlog.spec.md and
  mr-residuals.jsonl). This slice is that implementation. Exact touched files may vary with
  where Trust/Quality-Time live at implementation time — the rule itself (which fields reset)
  SHALL be defined once in game-core per SSOT discipline, applied at trade execution in
  trading.rs.
- EARS: WHEN a trade executes, each transferred monster's Trust and Quality-Time SHALL be
  reset to 0 while level, species, IVs, and essence pools transfer unchanged; the reset rule
  SHALL live in game-core (one function, server consumes it); red-first tests SHALL pin both
  the reset pair and the preserved quartet on a traded monster, plus a property test that no
  other raising field changes. ADR per ADR-0104 recording the #479 answer as the rationale,
  referencing the issue URL (never restating the question).

### 21r-f — sim-harness: make the no-player-row guard asymmetry representable (MED bug-prevention, LIGHT-MODERATE)
touches: sim-harness/src/world.rs, sim-harness/tests
after: []
- Evidence @ 2f5ae9d: `SimChar` models battle-lock as a plain bool (`lock_battle`/
  `unlock_battle`, world.rs:148/:155) with no player-row concept (world.rs:86 says so), while
  the real `movement_tick` derives lock/warp-skip from `ctx.db.player()` with two deliberately
  ASYMMETRIC no-player-row defaults — drain lock `unwrap_or(false)` ("a FACT"), warp-skip
  `unwrap_or(true)` (ADR-0070 POLICY) — whose comments explicitly warn "Do not unify". The
  harness (only game_core::apply_move is shared; tick_zone reimplements the control flow)
  cannot exercise either no-player-row branch, so an accidental unification — the exact
  regression the comments fear — reaches CI green.
- EARS: `SimChar` SHALL gain an optional has-player-row dimension (or equivalent tri-state)
  so both no-player-row branches are representable; red-first regression tests SHALL pin the
  drain-lock default (no player row ⇒ not locked) and the warp-skip default (no player row ⇒
  skip) independently, failing if either default flips or the two are unified. No production
  code changes; if the harness cannot represent this without touching movement.rs, the slice
  SHALL instead document the fidelity boundary in world.rs's header AND register a residual —
  never silently narrow the claim.

### 21r-g — predictor: seed #lastAuthQueueLen across rebuild (LOW netcode polish, LIGHT)
touches: client/src/prediction/predictor.ts, client/src/prediction/predictor.test.ts, client/src/main.ts
after: [21r-b]
- Evidence @ 2f5ae9d: predictor.ts:375-386 self-discloses an OPEN RESIDUAL "deliberately NOT
  fixed by nh3": a fresh Predictor after zone warp/reconnect starts with `#lastAuthQueueLen =
  0` while the server may still owe a queued step, so exactly one extra continuation can slip
  through per rebuild; the guarantee currently "rests on `held.clear()` ALONE" (called
  unconditionally, main.ts:997). Untracked (zero backlog hits for outstandingSteps/
  lastAuthQueueLen). Bounded and self-correcting today, but it is the one unclosed member of
  the ADR-0152/nh3 guard family and the comment itself flags any future held-key-retention
  change as hazardous.
- EARS: WHEN `resetPredictionState()` constructs a replacement Predictor, `#lastAuthQueueLen`
  SHALL be seeded from the pre-rebuild predictor (or last known server queue depth), the same
  way `seedSeq(lastSentSeq)` already carries the send floor; the OPEN RESIDUAL comment SHALL
  be updated to record closure; a red-first test SHALL pin `outstandingSteps` immediately
  after a rebuild with a non-empty authoritative queue. after: [21r-b] solely for the shared
  client/src/main.ts touch.

### 21r-h — ARCHITECTURE.md accuracy: export-manifest count + QUEST_DEFS role (LOW doc drift, LIGHT)
touches: ARCHITECTURE.md
after: []
- Evidence @ 2f5ae9d: (1) ARCHITECTURE.md:426 says the export manifest is "17 true, 23 false
  as of rb-24"; schema.rs's DATA_LIFECYCLE_MANIFEST actually counts 17 true / 26 false / 43
  total. (2) ARCHITECTURE.md:903 calls `QUEST_DEFS` a "placeholder for future quest-lookup
  optimization"; it is a live production consumer (content_cache.rs:85 `cached_quest_defs`
  → npc.rs:176 `apply_quest_trigger`, with its own rate-limited load-error path,
  npc.rs:46/:57/:194).
- EARS: line 426 SHALL read 17 true / 26 false (or drop the hardcoded count in favor of the
  drift-gated docs/knowledge/schema-overview.md pointer); line 903 SHALL describe the real
  consumer. No code changes; doc-only slice.

## 3. Sequencing & fan-out

21r-a (server taming), 21r-d (CHANGELOG only), 21r-e (game-core+trading), 21r-f (sim-harness),
21r-h (ARCHITECTURE.md) are pairwise disjoint by `touches:` and with everything else. 21r-b
and 21r-g share client/src/main.ts → `after: [21r-b]` on 21r-g. 21r-c must land after 21r-b
(the extended scanner would red on the pre-21r-b tree) and is otherwise disjoint (i18n infra +
workflows). mr-disjoint not run (grouping disjoint by construction on explicit path sets;
advisory only).

## 4. Decisions

- https://github.com/mdrewt/claude-harness/issues/134 — DECISION(rev21-nightly-changelog-red):
  should the loop gain a nightly-red watch that mechanically fires the policy-documented
  triage (nightly has been red 5 days with no response)? Non-blocking; 21r-d fixes the
  instance either way. No slice in this milestone depends on it.
- decision-defaulted (reversible, recorded in the handoff): severity labels and slice grouping
  as documented; 21r-e file set left flexible at the game-core-SSOT constraint; 21r-f's
  fallback (document + residual) accepted if representability requires production changes;
  propose_trade TradeSide refactor, cargo-deny adoption, and the ADR-0126 D3 M19-spec note
  PARKED in §5 rather than sliced (see rationale there).

## 5. Explicitly NOT in scope (parked here = tracked; next review's exclusion set inherits these)

- **propose_trade TradeSide struct refactor** (trading.rs:262-271: the two bare-u64 currency
  params are the one transposition-unsafe pair; monster/item lists are guard-corrected).
  Parked: reducer-signature change regenerates bindings and touches every trade caller for a
  blast radius bounded by the counterparty-accept flow; queue when trade surface next opens.
- **cargo-deny / deny.toml** — absent workspace-wide; cargo audit (ci.yml:85-87) is the only
  Rust SCA gate, so license/ban/duplicate-version policy is unenforced. Parked: dependency
  graph is small and clean today; adopting it is a new gate/pattern needing its own ADR —
  queue as a deliberate infra slice, or record an ADR that cargo-audit-only is the accepted
  posture (either resolves the gap; silence does not).
- **ADR-0126 D3 re-challenge cooldown** — deferred to "M19 decline-and-mute", but
  M19-social.spec.md contains no decline-and-mute/cooldown surface. Not buildable now (M19
  is post-gate provisional); the M19 spec author MUST fold the D3 primitive in when that
  ceremony runs. Flagged in the rev21 handoff for the supervisor's M19 spec-authoring pass.
- **ADR-0191 OTLP POST client** — deferred and parked as P5, verbatim, at
  evals/observability-stack-config.eval.mjs:179-199; adequately disclosed where it lives.
- Err(String) rejection-oracle class (M25 S-owned); RLS inertness (ADR-0197); everything in
  rb-1..rb-119, R-20r-*, and the M25 §8-3/§8-4 decision-hooks.
- Declined finding (recorded so it is not re-litigated): newtyping content ids (e.g.
  buy()'s shop_id/item_id) — ADR-0044/0060 explicitly considered and rejected id newtypes;
  the checked call site fails closed on transposition.

## 6. Notes for the runner

All eight slices are ordinary rooted-run slices; no new dependencies anticipated (21r-c adds a
nightly job from existing recipes; 21r-e needs an ADR recording the #479 answer per ADR-0104).
No tier hints per convention (derive from `touches:`). 21r-d requires pinned git-cliff 2.13.1
(the recipe asserts it). 21r-b/21r-c keep English output byte-identical and the ceiling ratchet
shrink-only per M24 conventions. Red-first test seeds are named per slice; the implementer
does not grade its own tests per workspace rules.
