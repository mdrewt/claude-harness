# M-postgate-twentyfirst-review-residuals — verified twenty-first-review findings

**Status:** in progress · 21r-a MERGED (PR #528) · 21r-b MERGED (PR #527) · 21r-e remaining ·
**Triaged:** 2026-09-28 (harness-revision Phase 3) against monster-realm master `4f36de2`
(post-de-bloat); every premise below re-verified at that SHA. Doctrine: `standards/testing-tdd.md`.
**Provenance:** twenty-first weekly review of master @ `2f5ae9d` (2026-09-25; 9 lenses, 3 verifiers,
all claims CONFIRMED).

**Triage outcome (slices removed from this file):**
- 21r-c (i18n scanner indirect sinks + nightly `i18n-completion` job) — DROPPED: extending a
  project-authored source-text scanner is a forbidden check shape (testing-tdd.md:46-50); the
  nightly half's recipe, job, policy doc and wiring eval were all deleted by the de-bloat
  (`justfile` has no `i18n-completion-check`; `.github/workflows/nightly.yml` has no i18n job;
  `docs/nightly-red-response-policy.md` and `evals/nightly-smoke-wiring.eval.mjs` do not exist).
- 21r-d (changelog-freshness regen) — MOOT: `just changelog` and `scripts/changelog-freshness.mjs`
  deleted; no freshness gate exists.
- 21r-f (sim-harness no-player-row guard asymmetry) — ALREADY PROTECTED: the real
  `movement_tick` is exercised on both no-player-row defaults by
  `server-module/src/movement_tests.rs:820` `nh_movement_tick_warps_a_player_but_never_an_npc`
  (the NPC must drain its step — drain-lock default `false` — and must stay in its home zone —
  warp-skip default `true`; unifying to either value fails it). A harness-side copy would test the
  harness's reimplementation, not production.
- 21r-g (predictor `#lastAuthQueueLen` rebuild seed) — DROPPED: no reachable failure today
  (`held.clear()` in `resetPredictionState`, `client/src/main.ts:986`, means nothing emits into
  the gap; the hazard is disclosed in place at `client/src/prediction/predictor.ts:377-395` for any
  future held-key-retention change) — a hypothetical-future-refactor guard (testing-tdd.md:62-69).
- 21r-h (ARCHITECTURE.md :426/:903 + `docs/knowledge`) — MOOT: ARCHITECTURE.md was rewritten
  (484 lines, no hardcoded manifest count, no `QUEST_DEFS` mention); `docs/knowledge/` deleted.

## Slices

### 21r-a — taming.rs write-backs: log-and-commit instead of bare `?`
**DONE — merged 2026-09-28 (PR #528); kept for the record. Not launchable.**
category: correctness (softlock) · severity: MED · size: LIGHT
touches: server-module/src/taming.rs, server-module/src/taming_tests.rs
after: []
- Evidence @ 4f36de2: `attempt_recruit` calls `write_back_party_hp(ctx, &battle)?`
  (taming.rs:166, recruit success path, AFTER `ctx.db.monster().insert(row)` at :159) and
  `write_back_battle_results(ctx, &battle)?` (taming.rs:267, failure/terminal path) with bare `?`.
  Every sibling battle-settlement caller logs and commits instead: battle.rs:759/:901/:943/:1477
  and pvp.rs:556/:576 (`if let Err(e) = ... { observability::mr_log(...) }` then
  `ctx.db.battle().battle_id().update(battle)`). battle.rs:750-758 documents why: a `?` aborts the
  whole transaction, the battle row stays `Ongoing`, and an `Ongoing` row freezes movement and
  blocks new encounters — every retry reproduces it. On the recruit success path the bare `?`
  also rolls back a genuinely successful recruit.
- EARS: WHEN `write_back_party_hp` or `write_back_battle_results` returns `Err` inside
  `attempt_recruit`, THE SYSTEM SHALL log it via `observability::mr_log` (reason json-escaped via
  `guards::json_escape`, same shape as battle.rs's `submit_attack_writeback_err`) AND SHALL still
  run the terminal `ctx.db.battle().battle_id().update(battle)`, on both the success and the
  failure/terminal paths; the recruit success path SHALL NOT roll back the inserted monster on a
  write-back failure. A red-first native-host test (`taming_tests.rs`) SHALL show the battle row
  leaving `Ongoing` and the recruited monster surviving when a write-back invariant check fails.

### 21r-b — route the uncatalogued player-facing strings through the i18n catalog
**DONE — merged 2026-09-28 (PR #527); kept for the record. Not launchable.**
category: product defect (i18n; violates the recorded "no hard-coded UI strings" decision,
docs/DECISIONS.md:441) · severity: HIGH · size: LIGHT-MODERATE
touches: client/src/main.ts, client/src/ui/sessionModel.ts, client/src/ui/sessionModel.test.ts, client/src/ui/careAction.ts, client/src/ui/careAction.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: []
- Evidence @ 4f36de2: 24 raw-English literal sites, 15 distinct messages, reach players without
  passing through `t()`/`tf()`:
  - main.ts `showFeedback(...)` — 8× `'disconnected — try again'` (:2638, :2653, :2670, :2682,
    :2694, :2706, :2824, :2847) and 8 success lines (`'Purchase complete!'` :2643,
    `'Sale complete!'` :2658, `'Trade accepted!'` :2675, `'Trade rejected.'` :2687,
    `'Trade complete!'` :2699, `'Trade cancelled.'` :2711, `'Name updated!'` :2829,
    `'Offer sent!'` :2860);
  - sessionModel.ts — `SESSION_DISCONNECTED_FEEDBACK` (:31) plus six overlay constants
    `EXPIRED_TITLE`/`EXPIRED_BODY`/`UNREACHABLE_TITLE`/`UNREACHABLE_BODY`/`CONTINUE_LABEL`/
    `CONFIRM_PROMPT` (:124-134), rendered through sessionView.ts:55-59 `.textContent`;
  - careAction.ts:32 `DISCONNECTED_MESSAGE` — a third copy of the disconnected line.
  The catalog already has the parameterised form: catalog.en.ts:60 / catalog.fr.ts:80
  `chrome.status.disconnected` (`{where}`), consumed via `tf()` at main.ts:961. A French-locale
  player sees raw English on every shop/trade/rename/propose feedback line and on the
  session-expiry overlay; the strings never reach the resolver, so its throw-on-miss never fires.
- EARS: ALL 15 messages SHALL move into catalog.en.ts + catalog.fr.ts under keys in the existing
  namespaces (the disconnected copies (three known at triage; a fourth, claimModel.ts, surfaced in the 2026-09-28 review) collapsed onto one key — `chrome.status.disconnected`
  or a parameterless sibling if `{where}` does not fit the call sites); EVERY listed call site
  SHALL consume `t()`/`tf()`. English output SHALL be byte-identical. Existing tests stay green
  unmodified except where they assert the moved literals (sessionModel/careAction tests updated to
  assert via the catalog). A red-first vitest SHALL show one representative per group (a shop/trade
  feedback line, a session-overlay string) rendering its French catalog text under `fr`.

### 21r-e — trade-time raising reset per answered decision #479
category: design debt (answered decision with no implementation) · severity: MED · size: MODERATE
touches: game-core/src/raising/rules.rs, game-core/src/raising/rules_tests.rs, server-module/src/trading.rs, server-module/src/trading_tests.rs, docs/DECISIONS.md
after: []
- Evidence @ 4f36de2: https://github.com/mdrewt/monster-realm/issues/479 was answered 2026-09-19
  ("partial-preservation discount": on trade, keep level/species/IVs and essence pools; reset
  Trust and Quality-Time to 0 — relationship-with-THIS-trainer stats by design; essence NOT
  halved). Nothing implements it: `confirm_trade`'s transfer loop (trading.rs:686-715) changes
  only `owner_identity` and `party_slot`. The fields in question are the monster row's
  `trust_favorable_count`, `trust_unfavorable_count`, `trust_favorable_battle_day_epoch`,
  `quality_time_ticks_total`, `quality_time_accum_ms`, `quality_time_window_ms`, **and
  `quality_time_window_start_ms`** (server-module/src/schema.rs:270-293 — the window anchor MUST
  also reset to 0, the documented fresh-monster state, or the new owner's first QT tick is
  credited with time that ran under the old trainer via `apply_quality_time_credit`,
  raising.rs:481-531); tiers derive via `game_core::trust_tier_of` /
  `quality_time_tier_of` (game-core/src/evolution/eligibility.rs:175/:202). No schema change.
- EARS: WHEN a trade executes, EACH transferred monster's Trust and Quality-Time state (all
  SEVEN bond fields above) SHALL be reset to 0 while level, species, IVs and essence pools
  transfer unchanged; the reset rule SHALL live once in game-core (`confirm_trade` consumes it).
  Shape: the four window/epoch columns have no `MonsterInstance` counterpart, so add a small
  game-core `TrainerBond { 7 fields }` value with one `reset_bond_on_trade(&mut TrainerBond)`
  (taking state, so the zero-miss mutation gate can kill a no-op body); the server copies the
  columns through it. No wasm export — the rule is server-only. Red-first tests SHALL pin the
  reset fields and the preserved fields on a traded monster (incl. the `monster_pub` tiers),
  plus a property test that no NON-BOND monster field changes. docs/DECISIONS.md SHALL gain a NEW short entry (do not extend the ~20-line Economy entry) with the
  decision and its why — Trust/Quality-Time measure the bond with the current trainer; essence is
  the monster's own — linking the issue URL rather than restating the question.
- Same DECISIONS.md edit also lands the two adjudicated gap entries from the 2026-09 triage
  (fold, don't split into a doc-only slice): (1) warps resolve only server-side in
  `movement_tick` — the client never predicts a zone crossing, and an NPC never leaves its home
  zone (fold into "Bounded client prediction"); (2) content row tables never carry a `locale`
  column — content stays locale-agnostic; localization lives in the client catalog layer
  (fold into the "Content is data" entry).

### 21r-b2 — finish the uncatalogued-strings class (claimModel + privacyBanner)
category: ux-a11y · severity: HIGH · size: MOD
touches: client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/privacyBanner.ts, client/src/ui/privacyBanner.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/sessionModel.ts, client/src/ui/privacyView.test.ts, client/src/main.privacyWiring.test.ts
after: []
- Found by the 2026-09-28 pre-merge review: 21r-b (PR #527) fixed the three copies its triage
  named, but the class is wider. `claimModel.ts:93` carries a fourth
  `'disconnected — try again'` copy plus ~10 raw overlay strings (:96, :320-353) that reach the
  DOM via `claimView.ts` `.textContent`; `privacyBanner.ts:31-33, 131-159` carries ~15 raw
  strings and imports no i18n at all. Both break DECISIONS.md "no hard-coded UI strings".
- EARS: WHEN any claim-overlay or privacy-surface text renders THE CLIENT SHALL source it from
  the typed catalog (en+fr), with no raw string literals reaching the DOM; the two stale
  AUTH-46/47 process-comment stragglers in sessionModel.ts are removed in passing (`client/src/ui/sessionModel.ts:3` and `:15`).
- Scope notes (park of run 2026-09-29, PR #530): `Catalog` is a total mapped type over the `MessageId`
  union, so ~33 new keys need `messageIds.ts` (plus `MessageParams` for the countdown/chunk-count
  lines). Copy constants in `privacyBanner.ts` must become resolve-at-render (a module-load `t()`
  freezes the boot locale), which changes what `privacyView.test.ts` and `main.privacyWiring.test.ts`
  consume. `evals/account-e2e.eval.mjs` `PIN_PSEUDONYMIZATION` pins en wording via
  `privacyBanner.test.ts`; keep that pin on the en catalog only.
- Build notes (run 2026-09-30, PR #530): the 45 keys landed under the existing `claim.*` / `privacy.*`
  namespaces (roster 133 → 178); `catalog.test.ts` and `catalogParity.test.ts` grew under `touches-delta:`
  as the catalogs' sibling roster tests (the 21r-b precedent). ONE privacy-surface string stays raw by
  necessity: `PRIVACY_PSEUDONYMIZATION_DISCLOSURE` is painted by `privacyView.ts:150` in the constructor
  and pinned raw by `privacyView.i18n.test.ts:279` (both outside `touches:`), and `Catalog` totality would
  force a French rendering of a sentence M22 §9 mandates verbatim in UI copy — cataloguing it needs a
  DECISIONS.md ruling first. Registered as an mr-gates residual (ux-a11y/LOW, backlog); the en pin
  (`PIN_PSEUDONYMIZATION`) is unchanged. New fr text has no byte-identity constraint, so the two export
  chunk sentences are count-after-label ("fragments livrés : 2 sur 5") rather than mirroring en's
  "1 chunks" plural defect, and "claim code" is rendered "code de transfert" ("réclamation" reads as
  *complaint*).

## Sequencing & fan-out

21r-b2 (client i18n surfaces) and 21r-e (game-core raising + server trading + DECISIONS.md) are
disjoint by `touches:` and may run in parallel. (21r-a and 21r-b merged 2026-09-28.)

## Explicitly NOT in scope (parked = tracked; next review's exclusion set inherits these)

- **propose_trade TradeSide struct refactor** (the two bare-u64 currency params are the one
  transposition-unsafe pair). Parked: reducer-signature change regenerates bindings (frozen
  surface) for a blast radius bounded by the counterparty-accept flow; queue when trade surface
  next opens.
- **cargo-deny / deny.toml** — absent; `cargo audit` is the only Rust SCA gate. Adopting it is a
  new lint needing a DECISIONS.md entry, or record that audit-only is the accepted posture.
- **Re-challenge cooldown / decline-and-mute** — belongs to the unbuilt social milestone; fold it
  in when that spec is written.
- Declined (not re-litigated): newtyping content ids — the checked call site fails closed on
  transposition.
