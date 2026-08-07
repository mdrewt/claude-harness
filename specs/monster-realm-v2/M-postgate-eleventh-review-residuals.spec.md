# M-postgate-eleventh-review-residuals — verified 2026-07-30 review findings

> **Status:** NEW, queued. Inserted 2026-07-31 between `M-postgate-ux-design` (in flight: uxd1)
> and `M-evolution-essence-redesign`, per the weekly-review insertion convention (cf. M8.5, M8.6).
> **Source:** eleventh multi-lens review @ `3063149` (2026-07-31T00:38Z UTC), 8 independent lenses,
> every finding independently re-verified by separate verifier agents against the pinned SHA.
> **Scope:** no new game-design surface except the two DECISION items in §4 (Drew sign-off).
> All `path:line` citations are @ `306314953dda32a814eed2db9f02ed30122a6649`.

## 1. Why this milestone exists

The post-gate wave (nh1–nh4, ux1–ux4, battle-0hp, dev-observability, movement-investigation,
feel-polish; PRs #247–#261) shipped with three disclosed-but-untracked defects and skipped the
customary ledger-reconciliation close. This milestone converts the verified review findings into
tracked slices. The three HIGH slices are real product defects on the PvP / anti-cheat surface;
the rest are hardening, gate-coverage, and ledger hygiene.

## 2. Slices (ROI order; `touches:` per the M8.9 domain map)

### 11r-a — PvP server-guard parity (HIGH, LIGHT) — `touches: server-module/{pvp,movement,trading}.rs (+tests)`
Ports the PvE-only halves of existing fixes to PvP and closes two small guard gaps.
- `start_pvp_battle` (`pvp.rs:259-267`) builds `BattleSide { active: 0, team }` raw at both sites;
  adopt `BattleSide::with_lead` (ADR-0156 D1 explicitly parked the PvP half — this is the named
  follow-up `M-postgate-battle-0hp-fix-pvp`, folded in here).
- `submit_pvp_action` Attack arm (`pvp.rs:~1017`) has no fainted-active reject; mirror
  `battle.rs:555` (`calc_damage` never reads attacker HP — a corpse deals FULL damage in ranked).
- Warp guard (`movement.rs:209-221`) checks only the `player_identity` battle role; replace the
  inline filter with `guards::is_in_ongoing_battle` (both roles, ADR-0122 SSOT).
- `propose_trade` runs unbounded O(N) dedup on client vectors before any size bound
  (`trading.rs:~193` vs the `battle.rs:62-66` bound-before-scan precedent); add O(1) length caps.
- EARS: E1 PvP start seats the first hp>0 lead on both sides (or rejects when none). E2 Attack
  from a fainted active → `Err`, no damage dealt. E3 warp rejected for EITHER battle role.
  E4 oversized propose lists rejected before any O(N) work. Each with a pvp_tests/movement/trading
  test authored from these criteria.

### 11r-b — PvP side-B battle overlay (HIGH) — `touches: client/src/net/store.ts, client/src/main.ts, client/e2e/`
`ongoingBattle()`/`latestPlayerBattle()` (`store.ts:724-743`) filter `playerIdentity === identity`
only; a PvP accepter is stored in `opponent_identity`, so side B gets NO battle UI in production
builds (cards, skills, forfeit) until the 60s deadline reaper acts. The e2e suite masks this via
the DEV-gated role-agnostic `battleById` hook (`main.ts:1613-1620`) — green CI, broken real path.
This is ADR-0155 D6's disclosed CRITICAL (`M-postgate-pvp-side-b-overlay`), folded in here.
- Make the accessors role-agnostic (match either role, expose own-side/opponent-side views);
  wire the overlay + forfeit for side B; add a production-path (non-DEV-hook) e2e for side B.
- SEQUENCING: `main.ts`-SERIAL with uxd3 — land after uxd3 or coordinate rebase explicitly.

### 11r-c — Real server battle movement lock (HIGH) — `touches: server-module/{movement,guards}.rs, evals/`
The sim-harness models a drain-time battle lock (`sim-harness/src/world.rs:88-104`, comment:
"mirroring the server's battle-lock check in `movement_tick`") **that the server does not have**:
the real `movement_tick` drain has no battle check (only the warp branch queries Ongoing battles),
and `enqueue_move`/`set_move`/`clear_queue` pass `authorize_move` with no battle guard. The
`battle_lock_convergence` criterion in `evals/netcode-convergence.eval.mjs:39` therefore certifies
a fictional invariant; a modified client can walk mid-battle (only honest-client overlay
suppression prevents it).
- Add the drain-time battle guard to `movement_tick` (skip drain, queue intact — matching the
  harness semantics) and a battle reject to the movement reducers (reject-not-clamp at intake).
- EARS: E1 in-battle character with queued moves stays at its pre-lock tile across ticks (server
  integration test — fails today). E2 `enqueue_move` while in an Ongoing battle → `Err`.
  E3 the harness comment is now true; `battle_lock_convergence` certifies real server behavior.
- **Delivered (ADR-0168, PR pending):** drain-time battle lock in `movement_tick` + intake rejects in `enqueue_move`/`set_move`; `clear_queue` deliberately unguarded; W3 R3 de-vacuified + new eval W6; sim-harness R10 drift closed (comment now true).

### 11r-d — Ledger & backlog reconciliation (MED, docs-only, run EARLY) — `touches: CHANGELOG.md, docs/adr/README.md, docs/adr/{0119,0122}, ARCHITECTURE.md, PLAN.md, docs/adr/DIGEST.md`
The customary post-wave reconciliation never ran: CHANGELOG stops at #239 (HEAD is #261, ~19 ADRs
missing) while ARCHITECTURE.md:259-267 promises at-most-one-milestone lag; `docs/adr/README.md`
is internally contradictory (range says 0035–0144, next-free says 0160, catalog table stops at
0134; files exist through 0159); 0119/0122 lack `Amended-by:` back-links (0122/0125/0132/0136
amend them); the ARCHITECTURE registry table has no `shops` row and a stale species file list.
- `just changelog`; fix README range + catalog (or replace the hand table with a DIGEST pointer);
  add the back-links; regen `just adr-digest`; PLAN.md close-marks for the merged wave
  (netcode-hardening CLOSED, ux-hardening merged-with-ux2b-partial, battle-0hp PvE-half caveat,
  movement-investigation/dev-observability/feel-polish CLOSED).
- See DECISION D4 (§4) for whether changelog freshness gets a mechanical gate.

### 11r-e — ux2b: wallet view completion (MED) — `touches: client/src/net/{connection,rowConvert}.ts, client/src/main.ts, client/e2e/`
Executes ADR-0154 D7 exactly as specified there: `my_wallet` subscription in `connection.ts`
(absent at :550-590), a `rowConvert.ts` converter, pass `ownWallet` at BOTH `buildShopViewModel`
call sites (`main.ts:719, 1286`), plus the two-identity e2e privacy tooth D7 names (ux2's proof
is structural only). Resolves the original playtest complaint (player can't see their gold).
`main.ts`-SERIAL with uxd3/11r-b.
- **Delivered (PR #TBD — PR not yet open at close-out time; supervisor fills the number, 2026-07-31):**
  ADR-0169 (amends ADR-0154). `'SELECT * FROM my_wallet'` in the single `.subscribe([...])` array +
  an **insert-only** `conn.db.my_wallet.onInsert` handler (deliberately no `onDelete`/`onUpdate` —
  ADR-0154 D4) in `connection.ts`; pure pass-through `playerWalletRowToStore` in `rowConvert.ts`
  (`balance: bigint` uncoerced); `store.ownWallet(identity)` at every `buildShopViewModel*` call
  site; and the two-identity behavioral privacy e2e `client/e2e/wallet-balance.spec.ts`, funded by
  the deterministic `quest_001` 50-gold faucet and asserting **first paint** via a
  `MutationObserver` (a retrying `toHaveText` cannot red a batch-listener-only patch, since
  `movement_tick` re-renders an open overlay every ~200 ms). Resolves the playtest complaint.
- **Two factual corrections this slice established — the spec text above is WRONG, do not trust it:**
  1. The `touches:` line and body say `main.ts:719, 1286` and "BOTH `buildShopViewModel` call
     sites". There are **THREE** (`main.ts:1378` dialogue-open, `:1437`/`:1445` the shop batch
     listener's bound/unbound arms, as merged): ADR-0154 D7 — which this spec restates — predates
     uxd2/ADR-0161 D5, which added `buildShopViewModelForShop`. ADR-0169 D4 corrects the count and
     freezes it at 3 with a count tooth.
  2. The `main.ts`-SERIAL constraint against uxd3/11r-b (also stated in §3) is **discharged**: both
     merged before this slice (uxd3-c, and 11r-b at #271).

### 11r-f — Resume-from-idle interpolation smoothness (MED) — `touches: client/src/net/store.ts, client/src/render/interpolation.ts (+unit tests)`
Two verified pure-core defects make every remote/NPC pause-resume ugly:
- Jitter EWMA (`store.ts:431-440`) has no gap bound — an idle remote's resume feeds
  `deviation ≈ gap` into the estimator (one 5s pause → instant clamp to the 2.5-step max delay,
  ~2s decay). Gate the update when `interval > K×stepMs` (K≈3) — idleness is not jitter.
- Bracket math (`interpolation.ts:~160-215`): after gap G the first resume frame lerps at
  `a ≈ (G−D)/G` — a ~0.9-tile pop then a crawl. Re-anchor the lower bracket when span > ~2×stepMs
  (treat `prev.receivedAt` as `next.receivedAt − stepMs`).
- EARS: E1 a 1-tile step after a ≥5s idle renders as one smooth ≤stepMs slide (unit-test the pure
  cores; no pop, no post-resume max-delay clamp).
- **DELIVERED (ADR-0171, PR #277, 2026-08-01):** both fixes shipped exactly as
  specified — `JITTER_IDLE_GAP_STEPS = 3` gate (`<=` admits / `>` skips, one-sided, baseline +
  ring append unconditional, EWMA carried across gaps) and `interpolateHistory(…, stepMs = 0)`
  re-anchor (`REANCHOR_SPAN_STEPS = 2`, strictly `>`, window `[next−stepMs, next]`, dead-zone
  hold at prev). The spec's `touches:` line was incomplete: the fix is inert without the sole
  production consumer forwarding `stepMs` — `renderResolver.ts` (1 line) + its sibling test
  shipped as declared touches-delta. 25 gating tests (19 started red; 6 executed reward-hack
  holes closed pre-implementation; 12/12 hand-run source mutants killed). E1's "no post-resume
  max-delay clamp" clause is scoped in ADR-0171: the resume interval itself must not cause the
  clamp — genuine pre-idle jitter may legitimately keep the delay high across a gap.
  Known band recorded as D-D evidence: sustained cadences in `(2×stepMs, 3×stepMs]` render
  correctly but hold the delay at the clamp (never a regression). ≥2-tile resumes still snap
  (M12.5d-2, intended).

### 11r-g — Server hardening basket (MED, independent items) — `touches: server-module/{movement,battle,raising,guards,content_cache,schema}.rs, client/src/ui/healModel.ts`
- Silent wild-encounter failures: `movement.rs:268-283` (`let Ok(..) else continue`,
  `let _ = begin_encounter`) and `begin_encounter`'s Err paths log nothing — a content/data fault
  kills encounters in a zone invisibly. Log both (rate-limited), matching the sibling
  `movement_tick_error` pattern.
- ADR-0089 completion: `cached_abilities()` in `content_cache.rs` (7 uncached `load_abilities()`
  RON parses per battle action: battle.rs 242/412/596/733, pvp.rs 274/386, taming.rs 205) and a
  cached type chart (`type_chart_from_rows` full-table rebuild per action at battle.rs 574/719,
  pvp.rs 377, taming.rs 191; NOTE: type relations come from DB rows — rebuild on `sync_content`,
  not a plain `LazyLock`).
- `HealLocationRow` lacks `cost_currency` (schema.rs:426-436; additive column, `#[default(0)]`
  precedent) — `heal_party` re-parses the RON registry per call (raising.rs:323-329) and
  `healModel.ts:43` computes `isFree` ignoring currency, so a pure content edit arms a
  silent-debit trap. Add the column, read the row, surface currency in the heal UI.
- `log_reject` (`guards.rs:16-17`) interpolates reasons into hand-built JSON unescaped; RON/serde
  parse errors embed quotes → malformed log lines. Add a `json_escape` at the choke point.

**DELIVERED (11r-g, ADR-0170, PR pending merge):** items 1/2/4 shipped for the declared touch-set;
item 3 SPLIT. Shipped: rate-limited gated logging of both swallow sites (RateLimiter struct,
routine fainted-party reason filtered at source via shared const — hostile-client limiter
saturation closed); `cached_abilities()` + a `content_version`-keyed rebuildable type-chart cache
(NOT a sync_content hook — that would need out-of-touches `content.rs`; version-key is coherent by
the single-writer + same-txn-stamp proof) with `battle.rs` swaps only; `cached_heal_locations()`
ending `heal_party`'s per-call re-parse + the `healModel.ts` `costCurrency`/`isFree` seam (inert).
**PARKED as hidden dependency (spec's touches line was incomplete):** the `cost_currency` COLUMN —
its seed site is a `content.rs:702` struct literal, and the column amends ADR-0083 §A; needs a
follow-up slice with touches `server-module/{schema,content}.rs` + bindings regen +
`client/src/net/{store,rowConvert}.ts` + `client/src/ui/healView.ts` (currency display arm is a
non-optional pairing). Also residual: `pvp.rs`/`taming.rs` cache swaps; unescaped JSON log sites
in `battle.rs:1087/:1124/:1310`, `pvp.rs`, `content.rs`, `npc.rs`. Full list: ADR-0170 residuals.

### 11r-h — Test-integrity & diagnostics residuals (LOW) — `touches: client tests, game-core tests, evals/spec-gap-revival.eval.mjs, client/src/{main.ts,net/devLog.ts}`
- RT-SZ-02 (`client/src/net/switchZoneAtomicity.test.ts:262`) is `expect(true).toBe(true)` —
  replace with a real seeding-reconcile-returns-false assertion (directly unit-testable).
- `redteam_m14d_weather_desync.rs:~215`: stated kill condition (`let _valid`) no longer exists in
  content.rs (now an exhaustive match); rewrite as a positive pin or delete.
- F-5f (`main.wiring.test.ts:244-265`): assertions gated on `if (gateIdx >= 0)` + trailing
  `expect(true)`; make the gate presence a hard assert (match F-5e).
- R4 `test.fixme` (`recruit.spec.ts:1004`) sits outside spec-gap-revival's expiry/tripwire reach;
  add a `grantBait`-in-client tripwire token.
- Movement rejections are invisible in diagnostics: `main.ts:483-508` catch repairs prediction
  with no console/ring/devLog trace, so an F9 bundle from a rubber-banding player shows nothing.
  Keep silent-to-user (M2 §3), add a rate-limited errorRing breadcrumb + a devLog fate line.

### 11r-i — Gate-coverage extensions (LOW-MED) — `touches: evals/, scripts/smoke-republish.sh, server-module/src/npc.rs`
- `dialogue-client-integrity.eval.mjs:830` reads only `000-core.ron` while build.rs glob-loads the
  directory (latent: gate goes blind the moment `010-*.ron` appears), and compares ids/counts but
  never node/choice TEXT. Read the whole dir; compare text.
- Append-only gate covers 5/14 registries, numeric ids only; add numeric baselines for
  abilities/shops and a string-id variant for quests/dialogue_trees/npcs (exclude heal_locations
  deliberately — ptc5e-2 reaper makes them removable-by-design; comment it). Add a once-per-sync
  `log::warn` to `npc.rs:158-160`'s silent unknown-quest `continue`.
- BSATN additive-nested-schema assumption is untested: `bsatn-compat-smoke` checks the serde codec
  (its own header admits BSATN differs) and `smoke-republish.sh` only patches CONTENT_VERSION.
  Add a nightly phase that republishes with one additive `BattleState` field while a live `battle`
  row exists, asserting survival — converts the engine-level assumption into a tested fact.

## 3. Sequencing & fan-out

- 11r-d (docs-only) is disjoint from everything — run it FIRST (it also prevents the next
  planning pass reading stale state).
- Server slices 11r-a → 11r-c → 11r-g overlap on `movement.rs`/`battle.rs` — serialize in that
  order (or merge a+c if sized together). All are client-disjoint.
- Client slices: 11r-f is pure-core (disjoint, can fan out anytime); 11r-b and 11r-e both touch
  `main.ts` — serial with each other AND with uxd3 (uxd3 is `main.ts`-SERIAL per its spec).
- 11r-h/11r-i are tails; 11r-i's smoke-republish phase is nightly-infra only.
- Priority: a, b, c (HIGH, product-defect class) ≥ d (cheap, compounding) > e, f, g > h, i.

## 4. DECISIONS for Drew (defaults stated; do not silently decide)

- **D1 — Public `battle` table exposes both PvP teams' full detail** (schema.rs:291-311: stats,
  movesets, per-slot HP incl. bench, world-readable; `battle_action` privacy protects picks but
  team-sheet scouting is open to any subscriber). Options: (a) ADR explicitly accepting
  team-sheet-open PvP for now (DEFAULT — cheap, revisit at M25 audit); (b) participant-scoped
  view of `battle` (larger; `my_wallet`/`my_conversation` precedent, but see ux2's view-gotchas).
- **D2 — Unsolicited trade escrow griefing**: `propose_trade` escrows the VICTIM's listed
  monsters at `Pending` with no consent (blocks battle/pvp/evolve/fuse/care/train/set_party_slot/
  set_nickname + the victim's own proposals via `has_active_trade`; 1h TTL, no re-propose limit —
  a hostile client can keep a target's roster perpetually locked). DEFAULT: `Pending` locks the
  INITIATOR's side only; both sides lock at `ConfirmedByCounterparty` (confirm re-validates
  everything already). Alternative: per-pair proposal cooldown. Either changes trade semantics +
  escrow-eval fixtures → design sign-off required.
- **D3 — Held-key cadence is pinned to LAN-class RTT** (`main.ts:2144` re-issues only at
  `outstandingSteps === 0`; `hold-commit-step-budget.eval.mjs:37` `LATENCY_MARGIN_MS = 1`;
  MOVE_QUEUE_CAP=2 can never be kept filled — per-step stutter past RTT+frame ≳ 200ms). DEFAULT:
  ADR note documenting the ADR-0129 local-deployment assumption now; an RTT-aware gate
  (`outstandingSteps ≤ 1` when RTT > STEP_MS/2) before any non-local deployment.
- **D4 — Changelog freshness**: no mechanical gate exists (`just changelog` is manual; C14
  verified nothing in CI/lefthook checks it). Options: per-PR drift gate (loud, may nag),
  nightly check (DEFAULT), keep manual + close-chore checklist line.

## 5. Explicitly NOT in scope

- Shop buy/sell arbitrage validation — already gated by `game-core/tests/pt_d3_tuning.rs:486-509`
  (review finding dropped after verification). Optional locality move into `validate_shops` only.
- Dead `setMove`/`clearQueue` predictor ops + server reducers (no production caller): leave;
  revisit if a caller appears (documented residual, low risk — they pass `authorize_move`).
- `hp_permille` floor-vs-round telemetry drift, weather `_ =>` Affinity arms, clippy ban-list
  proactive gaps (`getrandom::u32/u64`, `SeedableRng::from_entropy/from_os_rng`,
  `js_sys::Date::now`), devLog outer-proxy bind memoization — batch opportunistically into any
  slice touching those files; not worth standalone slices.
