# M-postgate-twentieth-review-residuals — verified twentieth-review findings

**Review ordinal:** 20 (weekly generate-improvement-plan) · **Pinned SHA:** `4ba39b5b9bc37949f73a3e5dd049c03675ed3427` · **Review UTC:** 2026-09-18T22:29Z
**Provenance:** standard multi-lens review of master @ `4ba39b5` (the `9434dfb..4ba39b5` delta —
rb-73..rb-89 residual fixes, m23-s8/s9 contrast slices, the 2026-09-18 residual triage pass —
plus a bounded full-repo sweep). 8 sonnet lenses, 0 lens contradictions, 3 independent verifier
agents re-checked all 9 reportable claims: 8 CONFIRMED (two with severity/precision
corrections), 1 DROPPED (battle_challenge public-table visibility — already tracked as M25 S4
"Residual 2", so excluded). One decision issue opened this cycle:
https://github.com/mdrewt/monster-realm/issues/479 (rev20-trade-raising-reset).

## 1. Why this milestone exists

The delta is structurally clean where prior reviews have concentrated: determinism/netcode,
test integrity (every `just ci` dep verified wired; the new m23-s9 contrast oracle's WCAG math
independently re-computed and confirmed biting), observability/ops cross-checks, and dependency
hygiene all returned explicit "no findings". What remains is concentrated in ONE client-side
defect class and three disclosed-but-untracked spec/ADR follow-ups: (a) server-bound UI actions
that lack the in-flight guard their own siblings already implement — with two paths
(`submit_attack`, `attempt_recruit`) where the server cannot distinguish an accidental
double-fire from two intents, so one click can run two full battle turns or spend two bait;
(b) the ADR-0175 essence SSOT promotion whose EG5 trigger fired without the promotion, leaving
the content validator unable to reject permanently-unsatisfiable essence thresholds; (c) the
ADR-0173 `quest_defs_load_error` rate-limiter follow-up that exists only as a dangling
"11r-j" mention no spec file ever created; (d) the post-evolve notification whose fully-written
server design in M-evolution-essence-graph.spec.md §6 lost its home when the uxd milestones
completed without it — auto-evolution can still change a party monster's species with zero
client-visible signal.

## 2. Slices (ROI order)

### 20r-a — in-flight guards for server-bound client actions: PvE battle, train, evolve, pvp lifecycle (HIGH product defect, LIGHT)
touches: client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/main.ts
after: []
- Evidence @ 4ba39b5: the five PvE battle actions wire straight through with no guard —
  battleView.ts:379 (`onAttack`), :399 (`onFlee`), :468-471 (`onRecruit`), :507-512
  (`onUseItem`), :530/:534 (`onSwap`); `.disabled` appears nowhere in the file. The PvP path in
  the SAME file suppresses via `vm.pvpPendingSubmit` (:353, :520; tested as RT-PVP-DS-01,
  battleView.test.ts:931/:988) with main.ts:2519-2547 setting `pvpPendingTurnNumber` before the
  call + synchronous `refreshBattle()`. `sendGuarded` (main.ts:948-953) has no re-entrancy lock
  (frozen-link short-circuit only). Server tolerance was traced per reducer: `flee`,
  `swap_active` (same index), and `use_battle_item` are incidentally protected by state-shape
  checks, but `submit_attack` (battle.rs:617) runs `resolve_full_turn` TWICE on a double-fire
  (no turn-sequence guard in wild battles) and `attempt_recruit` (taming.rs:43) consumes bait
  via `consume_one` before the roll with the battle typically still Ongoing after a miss — so a
  held Enter (native key-repeat on a focused button) or fast double-click turns one intent into
  two combat turns or two spent bait. Same class: raisingView.ts:238-245 Train button has no
  guard while the Care button on the same card (raisingView.ts:201-235) carries a documented
  `#pending` Set<bigint> + `.finally()` reset; server `train` (raising.rs:149) has no
  idempotency guard, so a double-fire spends two food items. evolutionView.ts:246-256 sets
  `btn.disabled = true` on click but the ONLY re-enable path is `refreshEvolution()` off
  `store.onBatchApplied` (main.ts:1749); `sendGuarded`'s rejection path (`reportError`,
  main.ts:884-889) never refreshes it, so a rejected/frozen-link `evolve` wedges the button
  until an unrelated batch arrives (tradeProposeView.ts:131-147/:238-253 documents and solves
  this exact mode with `.finally()`). pvpView.ts:144/:150/:168/:192 have no guards; the four
  pvp reducers are naturally duplicate-safe (row deleted / status-checked), so that arm is
  defensive polish only (LOW).
- EARS: WHEN a PvE battle action (attack, flee, swap, recruit, use-item) is dispatched for a
  battle, further PvE action dispatch for that battle SHALL be suppressed until the reducer
  call settles or the next authoritative batch re-renders the actions — using the same
  view-model-gated shape RT-PVP-DS-01 pins for PvP (the slice may generalize
  `pvpPendingSubmit` rather than invent a parallel mechanism). WHEN `train` is dispatched for
  a monster, further `train` dispatch for that monster SHALL be suppressed until settle
  (extend the Care `#pending` set or a sibling keyed set). WHEN `evolve` rejects or
  short-circuits on a frozen link, the clicked choice button SHALL be re-enabled without
  waiting for an unrelated batch (thread the promise; reset in `.finally()`). WHEN a pvpView
  lifecycle button (accept/decline/cancel/challenge) is dispatched, it SHALL be disabled until
  settle. In every case the guard SHALL release on settle-with-rejection (never a permanently
  dead control — the tradeProposeView `hide()`-time release pattern applies).
- Failing-test seeds (fail today): battleView test dispatching two synchronous clicks on the
  same skill button asserting exactly one `onAttack` callback reaches the harness while the
  view model reports pending; raisingView sibling for Train (two clicks → one `onTrain`);
  evolutionView test rejecting the `onEvolve` promise and asserting the button is re-enabled
  without a batch event.
- NOT in scope: server-side turn sequencing for wild battles. The server cannot distinguish an
  accidental double-fire from two deliberate rapid intents — duplicate suppression at the
  intent source (client) is the correct layer; adding wild-battle turn stamps is a
  design-changing fix nobody has asked for.

### 20r-b — promote essence reward/cap into game-core; validator rejects unsatisfiable essence thresholds (MED SSOT/content-safety, LIGHT)
touches: game-core/src/currency.rs, game-core/src/content.rs, server-module/src/battle.rs, server-module/src/raising.rs
after: []
- Evidence @ 4ba39b5: `ESSENCE_BST_DIVISOR`/`essence_battle_reward` live at
  server-module/src/battle.rs:1123-1128 and `ESSENCE_SOFT_CAP: u32 = 999` at
  server-module/src/raising.rs:437, while the sibling `battle_currency_reward` correctly lives
  in game-core/src/currency.rs:30. ADR-0175 (docs/adr/0175-essence-graph-reducers.md:191-194)
  promises verbatim to "promote `essence_battle_reward` and `ESSENCE_SOFT_CAP` into game-core
  beside `battle_currency_reward` when EG5 opens it, so the content validator can reject
  unsatisfiable essence thresholds (> cap)". EG5 = ADR-0177, Accepted, and it DID touch
  content.rs — the trigger fired — yet ADR-0177 contains zero mention of the promotion.
  Live consequence: `EssenceRequirement.amount: u32` (game-core/src/content.rs:228-231) is
  unbounded and R7 validation (content.rs:1076-1084) checks only `essence.len() <= 3`, so RON
  content with `amount: 5000` validates cleanly while `grant_essence`
  (raising.rs:454-478) clamps every pool at 999 forever — a permanently unreachable evolution
  edge no pipeline stage can catch. Untracked anywhere (verified against rb-1..106, all review
  residual milestones, open residuals, ARCHITECTURE follow-ups).
- EARS: `ESSENCE_BST_DIVISOR`, `essence_battle_reward`, and `ESSENCE_SOFT_CAP` SHALL be
  defined once in game-core beside `battle_currency_reward` (values unchanged: 30, max(1,
  bst/30), 999) with server-module consuming the game-core definitions (re-export or direct
  use; no behavior change — existing reward/clamp tests stay green unmodified). WHEN an
  evolution path carries an `EssenceRequirement.amount > ESSENCE_SOFT_CAP`, content validation
  (`validate_evolution_paths`) SHALL reject it naming the path and the cap; a red-first test
  SHALL prove rejection on an `amount: 5000` fixture and acceptance at `amount: 999`. The
  ADR-0175 promotion promise SHALL be recorded as executed per the ADR-0104 amendment process
  (digest regenerated via `just adr-digest`).

### 20r-c — rate-limit the `quest_defs_load_error` log line (LOW obs-hardening, LIGHT)
touches: server-module/src/npc.rs, server-module/src/npc_tests.rs
after: []
- Evidence @ 4ba39b5: npc.rs:161-168 — the `Err` arm of `cached_quest_defs()` in
  `apply_quest_trigger` emits an unguarded `log::error!` (`evt=quest_defs_load_error`) and
  content_cache.rs:40-41/:85-86 caches that `Err` for the process lifetime (LazyLock), while
  the public `talk` reducer (npc.rs:231, call site :308) invokes the path unconditionally
  behind only joined/zone/range checks — so after a malformed-content republish, any player
  looping `talk` produces an unbounded ERROR-level log stream. ADR-0173:293-301 discloses this
  verbatim with the named follow-up ("give it its own `RateLimiter` static alongside
  `QUEST_DEF_MISSING_LIMITER`"); the only follow-up pointer ever written is an "11r-j" label in
  ARCHITECTURE.md's 11r-i narration — a slice the eleventh-review spec never created. The
  sibling branch (`quest_def_missing`, npc.rs:188-195) already carries the exact pattern to
  copy (npc.rs:29-36).
- EARS: WHEN `cached_quest_defs()` returns `Err` on the talk path, the
  `quest_defs_load_error` emission SHALL be gated by its own process-static `RateLimiter`
  (mirroring `QUEST_DEF_MISSING_LIMITER`, including the `suppressed` count in the emitted
  line); a red-first test SHALL prove the second immediate emission is suppressed. Reducer
  semantics stay unchanged (swallow-and-return; the caller-visible contract of `talk` does not
  change).

### 20r-d — post-evolve notification: build the §6 server design + minimal client reveal (MED feature-completeness, MODERATE)
touches: server-module/src/schema.rs, server-module/src/evolution.rs, server-module/src/evolution_tests.rs, client/src/net/connection.ts, client/src/net/store.ts, client/src/main.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/generated
after: [20r-a]
- Evidence @ 4ba39b5: M-evolution-essence-graph.spec.md:148-150 specifies the complete design
  — private table `pending_evolution_notice` (`owner_identity` PK, `entries:
  Vec<EvolutionRevealRow>`), owner-scoped view `my_pending_evolution_notices`,
  `apply_evolution` pushing an entry in the same transaction, reducer
  `ack_evolution_notices(ctx, count: u32)` with at-least-once semantics — and none of those
  identifiers exist anywhere in the repo (grep-verified). The spec assigned it to the uxd
  milestones, which completed without it; the sibling item from the same paragraph
  (pre-evolve warning) IS catalogued (fifteenth-review Wave-6, `S-pre-evolve-warning`) while
  this one appears in no queue. Player-facing consequence: EG2-11 auto-evolution changes a
  party monster's species with zero client signal (`apply_evolution`,
  server-module/src/evolution.rs:123-168, writes monster/monster_pub only).
- EARS: WHEN any evolution completes (auto-triggered via `check_and_evolve` OR player-chosen
  via `evolve()`), a `pending_evolution_notice` entry (from-species, to-species, monster id,
  timestamp) SHALL be written in the same transaction; the table SHALL be private with an
  owner-scoped `my_pending_evolution_notices` view (ADR-0194 pattern, body-pinned like
  `my_battle`); `ack_evolution_notices(ctx, count)` SHALL remove exactly the acknowledged
  prefix (at-least-once: an unacked notice re-delivers on reconnect). The client SHALL
  surface each notice as a visible reveal (a modest overlay/banner through the ADR-0162
  overlay registry satisfies this slice; cutscene polish MAY be disclosed as a residual, not
  silently dropped). Schema change is additive-only (new table; bindings regenerated,
  bindings-drift gate green).
- Decision-hook: none — the spec's SHALL is explicit and pre-dates this review; scope
  judgment (minimal reveal vs full cutscene) is documented above as the accepted default.

## 3. Sequencing & fan-out

20r-a, 20r-b, 20r-c are pairwise disjoint by `touches:` (client/src/ui+main vs
game-core+server battle/raising vs server npc). 20r-d shares client/src/main.ts (and possibly
the overlay registry surface) with 20r-a — hence `after: [20r-a]`; its server files are
disjoint from 20r-b/c. mr-disjoint not run (grouping is disjoint by construction on explicit
path sets; advisory only).

## 4. Decisions

- https://github.com/mdrewt/monster-realm/issues/479 — DECISION(rev20-trade-raising-reset):
  trade-time treatment of raising state (wholesale transfer today lets a buyer bypass every
  pacing gate; reset/discount/keep is a game-design call). Non-blocking; whichever option Drew
  picks becomes its own slice in a later cycle. No slice in THIS milestone depends on it.
- decision-defaulted (reversible, recorded in the handoff): severity labels and slice grouping
  as documented above; 20r-d scoped to minimal-reveal-with-disclosed-residual rather than full
  cutscene.

## 5. Explicitly NOT in scope

- battle_challenge public-table visibility (M25 S4 "Residual 2" owns it — verification moved
  this review's candidate OUT of the report for that reason; do not double-queue).
- Server-side wild-battle turn sequencing (see 20r-a NOT-in-scope rationale).
- Trade-time raising-state reset (awaits issue #479).
- Everything in the rb-1..106 backlog, open residuals, and 18r/19r queued slices.

## 6. Notes for the runner

All four slices are ordinary rooted-run slices; no new dependencies anticipated (20r-d adds a
table + reducer + view via existing SpacetimeDB patterns — if a dependency appears it needs its
own ADR per workspace rules). No tier hints per convention (derive from `touches:`). 20r-d
regenerates bindings; keep the bindings-drift gate green in the same PR. Red-first test seeds
are named per slice; the implementer does not grade its own tests per workspace rules.
