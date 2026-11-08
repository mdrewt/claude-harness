# Spec: M-battle-tactics — tactical combat overhaul (P1 wild core + P2 PvP, one big-bang cutover)

**Status:** elaborated 2026-10-30 from the 2026-10-24 sketch · **build-ready: 17 slices** — P1
`bt-1`…`bt-13` (tactical wild core, internal build phase), P2 `bt-14`…`bt-17` (PvP, flip, purge) ·
**Project:** monster-realm (game-core + server-module + client + content) · **Design SSOT:**
[`M-battle-tactics-design.md`](M-battle-tactics-design.md) — the P0 ceremony synthesis BINDS this
elaboration; every number below is that document's, cited by section · **Depends on:** the
M-pt3-quickfix wave merged (touches measured against monster-realm `master` `40bd3c6e`, qf-17 #616,
2026-10-30) · **Doctrine:** `standards/testing-tdd.md` — every criterion is an ordinary colocated
test; the `evals/` set is closed, so machine-contract checks land as cargo/vitest/Playwright tests ·
**Anchors** cite file + symbol as of 2026-10-30 — **anchors are symbols, not lines** · **DECISIONS
ANSWERED 2026-10-24** (monster-realm #583 `pt3-battle-scope`, #584 `pt3-battle-design`, #587 D1;
verbatim answers at `memory/projects/decisions/issue-583.answer.md` / `issue-584.answer.md` are the
SSOT; the rulings are reproduced below and BIND every slice).

**Feedback items:** pt3-2026-10-018, pt3-2026-10-121, pt3-2026-10-122, pt3-2026-10-126,
pt3-2026-10-127, pt3-2026-10-128, pt3-2026-10-129, pt3-2026-10-130, pt3-2026-10-131,
pt3-2026-10-132, pt3-2026-10-133, pt3-2026-10-134, pt3-2026-10-135, pt3-2026-10-136,
pt3-2026-10-137, pt3-2026-10-138, pt3-2026-10-139, pt3-2026-10-140, pt3-2026-10-141,
pt3-2026-10-142, pt3-2026-10-143, pt3-2026-10-144, pt3-2026-10-145, pt3-2026-10-146,
pt3-2026-10-147, pt3-2026-10-148, pt3-2026-10-149, pt3-2026-10-185. The battle-presentation
subset (-126…-131) is scoped INSIDE this milestone (bt-10); the -132 legacy-button defect was the
quickfix wave's (qf-7/7b/7c, shipped).

**Absorbed residuals (mapped to slices — see Backlog reconciliation):** rb-104 / R-rb-73-WILD-HOLD
→ bt-8 · R-21r-a-FAINTPENALTY, R-21r-a-TERMINALSWEEP, R-21r-a-CONTENTLOAD → bt-9. They stay valid
as *invariants*; their fix sites move into the new pipeline and are proven there, not before.

## Problem / intent

The operator ruled the 1v1 Pokemon-style core superseded: "Instead of Pokemon-style combat where
it's mostly 1v1 battles without any kind of positioning, I want to move toward a style of combat
closer to 'Sword of Convallaria' and 'Final Fantasy Tactics Advance'" (feedback :404) — a tile
battlefield, 1–3 deployed monsters per side, attacks modeled as range/origin/target/AoE, and a
costed action economy (:404–419). "Start simple with the new battle system and gradually add new
features and mechanics" (:406). The bar is explicit: combat is a cornerstone — "It has to be fun,
interesting, novel, and rewarding" (:423); the tactical-RPG × monster-taming synergy is the stated
differentiator. This supersedes game-design.md:107's "1v1-active readable core first".

The P0 ceremony (2026-10-24, doctrine §6, 21 agents) produced the binding design: a 6-pip AP economy
with strides, Light 2 / Heavy 4 / Item 3 / Recruit 6 / Flee 6 and an Exert surcharge; round-based
speed order; the operator's per-monster action queue with halt-and-return pop validation and the
literal reset-on-submit idle clock; a Manhattan grid with shaped AoE and friendly-fire filters;
First-Stand, Guard, flank and the disengage tax as positional levers; seed-free wild AI with three
stances plus Exhausted; recruit as a full-turn adjacent verb with shown-equals-rolled odds; PvP
with secret deploy, secret queues, a 30 s per-window clock, Surge from round 9 and a deterministic
adjudication tuple. This spec slices that design into mergeable, test-first increments against
the repo as it stands today. Research substrate: `docs/research/tactical-rpg-combat-design.md` and
`docs/research/tactical-combat-player-reception.md` (design §1–§2.1.4 carry their premise checks).

## Operator rulings 2026-10-24 (#583 + #584 — BINDING; answer files are SSOT)

**Scope & sequencing (#583, pt3-battle-scope):**

- **D1 — M14 depth carry-over (recommendation accepted):** carry the DATA and rules forward but
  re-enable gradually — the tactical core ships with types/stats/status only; abilities and
  weather re-enable in later depth waves once the grid core is fun.
- **D2 — cutover is BIG-BANG (alternative A):** wild battles AND PvP/ranked convert to tactical
  in ONE cutover — no player-facing phase where tactical wild coexists with 1v1 PvP. P1/P2 are
  internal BUILD phases; nothing ships to players until both are done. PLUS the operator's
  **per-monster action queue + idle-only turn clock** (full text in D583.2 of the answer file;
  design §2.3 integrates it so "everything feels like one coherent battle system").
- **D3 — hard replacement (recommendation accepted):** at cutover the 1v1 system is GONE (no
  parallel modes, no toggle); the schema stays additive (new tables/columns; old ones retired
  from use, never reordered or dropped).
- **D4 — M-gamepad ordering (recommendation accepted):** M-gamepad runs AFTER the tactical battle
  UI stabilizes.
- **D5 — next playtest is STRICT §10 (alternative A):** ONE gate after every coverage milestone
  closes. No interim playtest.

**Design parameters (#584, pt3-battle-design):**

- **Inspiration set (preamble):** all six games are valid sources (FFTA, Triangle Strategy, Sword
  of Convallaria, Pokemon Conquest, Devil Survivor, Brigandine); the directed reception research
  was persisted as `docs/research/tactical-combat-player-reception.md` and consumed by the ceremony.
- **D1 — tuned AP accepted** (costs tuned so a typical turn resolves as move + one attack); the
  directed AP-vs-move+act research informed the design's §2.1.4 departures.
- **D2 — round-based speed order accepted** (every unit acts once per round, ordered by speed); a
  visible turn-order bar follows.
- **D3 — recruit percentage SHOWN on the preview** ("transparency beats superstition"); failure
  still consumes the turn.
- **D4 — forecast & undo INTEGRATED with the action queue:** an undo inside a queued-but-unsubmitted
  plan is cheap; a submitted queue is cancel-and-clear.
- **D5 — PvP clock = per-UNIT 30 s cap with AFK auto-pass, then forfeit**, replacing the 60 s
  secret-pick deadline — combined with D583.2's idle-only semantics (counts only while the battle
  is idle waiting on that player; resets on submit; animation/resolution time never counts).

**Cross-batch ruling (#587 D1):** successful recruiting pays NOTHING — no currency, no XP, no
essence; the monster is the reward (quest faucets compensate, owned by M-econ-onboarding).

**Action queue + idle-only clock (D583.2, operator's words, integrated in design §2.2–§2.3):** a
player may queue each monster's NEXT turn's worth of actions at any time; submitting marks it
ready; a ready plan executes, in order, when it is that monster's turn; the player can cancel/clear
before that turn; invalid actions still queued at turn start are **wasted** (the design reads
"wasted" as halt-and-return: never executed, no AP charged, control of the remainder returns —
§12 Q2, the operator may object); the clock counts only while the battle is idle on the player's
turn and resets the moment they submit (literal reset per accepted submit, ≤ 3 windows per
unit-turn by the AP floor — §12 Q1).

## Binding constraints (prior rulings; bind every slice)

1. **Turn-based, not real-time/action (ADR-0017).** Reinforced.
2. **Rules once · determinism · integer · content-as-data.** Every rule lives in `game-core`
   exactly once (`tactics::*`); wall-clock and unseeded RNG are clippy-banned; same inputs produce
   byte-identical output natively and in wasm; damage is integer-only with seeded variance. AP
   costs, terrain weights, geometry and turn resolution are game-core rules; tactical skill/species
   /item/zone data, battle maps and `tactics_tuning.ron` are RON under `game-core/content/` with
   CONTENT_VERSION bumps.
3. **Privacy + server authority.** Battle tables are PRIVATE behind participant- or owner-scoped
   views; a public battle table is a CRITICAL defect; `battle_secret` (seed), `battle_wild_unit`
   and `battle_summary` have no client read path; `battle_queue` and `battle_deploy` are owner-only.
   Reducers validate `ctx.sender()`, call game-core, write tables. RLS is unenforced at the pinned
   SpacetimeDB and is never the boundary.
4. **0-HP rulings (r2).** Conscious-only deployment; fainted units neither act nor deploy; mid-turn
   KO and double-KO semantics re-proven on the tactical substrate (bt-2).
5. **Interlocks + disconnect GC.** `guards::is_in_ongoing_battle` is the one predicate (unchanged;
   keys on the anchor `battle` row's `Ongoing`, so a tactical battle is visible to every existing
   caller — movement, raising, economy, npc, accounts, pvp, trading, evolution — without edits);
   battle↔trade (ADR-0112) and care/train (ADR-0136) stay wired; last-connection disconnect
   auto-resolves and PERSISTS damaged HP (ADR-0138).
6. **Recruit rulings.** Weakening is the lever; success rebuilds the exact wild from the private
   seed at full HP, awards no XP; wild-only; adjacency + full turn's budget; bait raises odds at
   no extra cost (:419).
7. **Essence-from-defeat (r2).** Preserved through the ledger hook (bt-5/bt-9).
8. **No gacha / P2W / energy-gated grinding.**
9. **Controls/UI doctrine.** Battle is a base under the ONE context stack; frames ride
   SCREEN_POLICY and B17 battle-never-hidden; every element D-pad-reachable; every string from
   the typed i18n catalog (en+fr); schema additive-only; bindings generated-only.

**Keep-signals:** the red/green per-unit info boxes (name/level/HP/type, pt3-2026-10-121) and the
health bar (pt3-2026-10-122) carry forward, re-laid-out for multiple units (bt-10).

## Scope — phases

### P0 — design ceremony: DONE 2026-10-24

Output: `M-battle-tactics-design.md` (binds). Its §12 lists ten operator options (Q1–Q10) where the
literal ruling or carried rule was adopted as default; elaboration proceeds on those defaults and
the Risks section below names the last safe override point for each.

### P1 — tactical core for WILD battles (internal build phase; slices bt-1…bt-13)

The design's T1–T10, sliced as a serial rule→reducer spine (bt-1…bt-8) and a parallel tail
(client chain bt-10→bt-11→bt-12 ‖ server settlement bt-9 → telemetry bt-13). Nothing here is
player-reachable: the live encounter path keeps starting 1v1 battles until bt-16; tactical battles
are started through dev-gated reducers (the `start_wild_battle`/`grant_bait` `dev_reducers` cfg
gate, published via `MR_DEV_MODULE_WASM`, invoked from tests and from e2e by `spacetime call`).

### P2 — PvP tactical, flip and purge (slices bt-14…bt-17; ships together with P1)

T11 (PvP server + client), then T12 in two serial steps: bt-16 flips the live encounter and
challenge-accept paths to tactical and migrates every 1v1 e2e; bt-17 deletes the 1v1 reducers,
screens and reaper and retires the old tables in place. Then the strict §10 playtest gate
(D583.5) is the go/no-go.

### P3 — DEFER-authorized future features (named deferrals)

- Obstacles/cover that impair movement and block ranged/AoE (pt3-2026-10-138) →
  `deferred → M-battle-tactics P3 (post-cutover; spec after the Playtest-4 read)`. P1 leaves it
  additive: `blocks_los` tile column + LoS(blockers) signature (BT1.3, BT1.8).
- Tile elevation with attack bonuses (-139) → same target; `elevation: u8 = 0` column (BT1.8).
- Line/cone AoE with propagation direction (-141) → same target; reserved `Line`/`Cone` shape
  variants (BT1.2).
- **Depth re-enable waves** (D583.1, post-cutover, each re-runs the §10 gates): D1 abilities
  (entry abilities on deploy; `apply_ko_switch_entry_abilities` re-homed) + 4-AP Swap/reserve;
  D2 weather/field (upkeep slot 3); D3 signature wave + one 2×2-footprint line →
  `deferred → M-battle-tactics depth waves (spec after cutover)`.
- **Hold-to-act inputs** (design §9.2 Hold Y cancel, Hold B skip): the router emits press edges
  only (`input/router.ts`, `nav.ts` `NavInput`) and `input/longPress.ts` is touch-only, so a hold
  edge is an input-layer feature → `deferred → M-gamepad (hold/long-press edges on the
  virtual-button layer)`. P1 maps cancel-and-clear to a confirmed menu row and skip to a B tap
  during playback (BT11.3, BT10.5); the design's hold gestures layer on later without a flow change.
- Free-placement deployment (Wakfu-style), per-zone gimmick maps, a reconnect-grace window for PvP
  disconnects (§12 Q7), a cumulative per-unit-turn clock (§12 Q1) → operator options, not adopted.

## Non-goals

- Real-time/action combat (ADR-0017 stands). Gacha / P2W / energy-gated grinding.
- Economy design (starter grants, faucets, item prices) — M-econ-onboarding; the flat 3-AP item cost
  makes item PRICES a combat-balance lever — named, not owned.
- An animation framework (Spine carries a license flag): P1 ships basic action feedback only.
- Final art: shared placeholders suffice "until a professional artist can be hired"; M-world-art-pass
  feeds placeholder battle sprites/background (item 6 of PLAN §9) — this milestone reuses the
  existing `client/public/assets/monster-*` sheets (frame 0 cropped by CSS; no loader) and ONE
  CSS-authored battlefield background.
- Resolution scaling: follows M-ui-foundation's single-scale-authority decision; no battle-only fork.
- A Pixi battle board: the battle screen is DOM over the world canvas today and the Pixi
  `WorldRenderer` is mocked by 38 tests; the P1 board is a DOM grid inside the battle frame.
- M18 raid content (re-sketch hook only: `battle_unit.side + owner` make allies additive rows) and
  M19 social surfaces. The legacy -132 button defect (quickfix, shipped).

## Backlog reconciliation

| Residual | Owner slice | How it closes |
|---|---|---|
| rb-104 / R-rb-73-WILD-HOLD (no reaper bounds a stalled wild battle) | bt-8 (BT8.5) | every wild phase is time-bounded: 300 s deploy window, 300 s inactivity window → AutoFlee, round cap 30, last-connection disconnect; all four release `is_in_ongoing_battle` |
| R-21r-a-FAINTPENALTY (recruit success skips the faint trust penalty) | bt-9 (BT9.3) | one terminal funnel for every outcome, recruit success included |
| R-21r-a-TERMINALSWEEP (recruit success never sweeps prior terminal rows) | bt-9 (BT9.4) | sweep at upkeep step 4 / battle end, once, for all causes |
| R-21r-a-CONTENTLOAD (bait consumed before content loads) | bt-9 (BT9.2) | content row loads and validates before the inventory debit, same transaction as the roll |

- **Lifts a fence:** M-postgate-console-controls' "no visual redesign" non-goal is lifted for battle
  presentation; that work lands in bt-10, not as a second pass on the 1v1 layout bt-17 deletes.
- **Does not duplicate:** qf-7/7b/7c (legacy buttons, shipped), M-ui-foundation (frame visuals,
  scaling), M-econ-onboarding (faucets).
- **Reshapes:** M18 (re-sketch after bt-17); the M14 depth systems (dormant data, re-enabled in
  the depth waves — D583.1).

## Milestone acceptance criteria (integrated whole — proven end-to-end at bt-17)

- **BT1:** WHEN a wild battle starts, THE SYSTEM SHALL build the battlefield from a content RON
  battle map and deploy 1–3 conscious party monsters per side; a 0-HP monster SHALL NOT be
  deployable or act (r2 rulings re-proven on the new substrate).
- **BT2:** WHEN any unit acts, THE SYSTEM SHALL resolve movement, targeting geometry
  (range/origin/target/AoE + LoS + friendly-fire filter) and damage as integer, seeded,
  deterministic game-core rules — byte-identical natively and in wasm — and the server SHALL
  recompute legality and target sets, never trusting client-sent tiles.
- **BT3:** WHEN the player aims a move or attack, THE CLIENT SHALL show range/AoE overlays and a
  forecast computed from the same wasm rule the server runs, and SHALL allow free undo of a drafted
  (unsubmitted) move.
- **BT4:** WHEN a recruit attempt is made, THE SYSTEM SHALL require an adjacent wild target and a
  full turn's action budget, apply the bait bonus to displayed odds at no extra AP, and on success
  rebuild the exact wild from the private seed at full HP with no XP, essence or currency — with
  the faint-penalty, terminal-sweep and load-before-spend invariants (R-21r-a-*) proven, and H1/H2
  telemetry still reporting.
- **BT5:** WHILE a tactical battle is live, ITS state SHALL live in private tables readable only
  through participant- or owner-scoped views, every `is_in_ongoing_battle` interlock SHALL hold
  (including during Deploying), disconnect GC SHALL auto-resolve and persist damaged HP, and every
  phase of a wild battle SHALL be time-bounded (rb-104).
- **BT6:** THE tactical HUD SHALL carry forward per-unit info boxes (name/level/HP/type) and
  health bars, with every string from the typed i18n catalog (en+fr) and every element
  D-pad-reachable.
- **BT7:** WHEN a player submits a monster's action queue, THE SYSTEM SHALL execute it in order at
  that monster's turn, SHALL allow cancel/clear at any time before that turn, SHALL waste the first
  invalid remaining entry and everything after it by halt-and-return (never executed, no AP
  charged), and SHALL count clock time only while the battle is idle on that player's turn —
  resetting on every accepted submit, never on a rejected one, with at most 3 windows per
  unit-turn — proven in both PvE (300 s windows → AutoFlee) and PvP (30 s windows → AutoPass;
  the 4th auto-pass forfeits).

## Milestone-wide rules

- House rules bind every slice: rules live once in game-core (deterministic, integer, seeded,
  exhaustive `match`, parse-don't-validate at boundaries); content is RON under
  `game-core/content/` with a CONTENT_VERSION bump; schema changes are ADDITIVE-ONLY (appended
  `#[default]` columns, appended enum variants, new tables; nothing reordered or dropped — tables
  are *retired from use*); every battle table is private behind a view; bindings are generated-only
  (`just gen`); every UI string goes through the typed i18n catalog (en+fr, total); the
  virtual-button/context-stack controls doctrine stands.
- **Reject, don't clamp:** every invalid submit/deploy/cancel is refused with a typed reason and a
  structured fail-loud log; nothing is silently corrected.
- **Hidden-dependency STOP:** if a slice needs a file outside its `touches:`, stop, record it in the
  handoff and let the supervisor re-serialize — never widen silently. The `touches:` below were
  measured against `master` `40bd3c6e` (three read-only sweeps over server, game-core/content and
  client) and include the pin/roster/baseline files known to red; the first slice to find another
  writes a build note here. Files declared but found unchanged at build are fine (quickfix idiom).
- **No new eval files.** Native=wasm parity, privacy proofs, pacing and content lints are ordinary
  cargo/vitest/Playwright tests. The grandfathered evals are re-baselined (`--write`, baselines
  only) by the structural slices and the two hand-kept transcriptions inside `account-e2e` are
  extended — never a new eval, never a widened check.
- **Structural serial set:** `server-module/src/schema.rs`, `client/src/module_bindings/`,
  `evals/baselines/{table-schemas,spacetime-types,client-visible-tables,client-callable-reducers}.json`
  change only in bt-7, bt-8, bt-14 and bt-17, which never run beside another slice (X4 gate).
- **Server roster discipline (measured):** `privacy_enforcement_tests.rs` pins `EXPECTED_MODULES`
  (declaration order), `EXPECTED_SCHEDULED`, `EXPECTED_GATED` and `DELIBERATE_EXEMPTIONS`; every
  new module and reducer joins them in its slice; a scheduled reducer's first statement is the
  `ctx.sender() != ctx.database_identity()` guard; new tables join `DATA_LIFECYCLE_MANIFEST`
  (schema.rs) plus the `accounts_tests.rs` partition/registry/rekey arrays and the `account-e2e`
  transcription; new views join `native_host_tests.rs` `VIEW_DESCRIBERS` to be testable; the
  disconnect bundle (`resolve_all_live_interactions`) keeps its exact signature and its new
  resolver uses index reads only (the unregistered-table test host aborts on scans).
- **Client roster discipline (measured):** the battle screen stays ONE frame id (`battleView`) —
  the tactical renderer mounts inside it by phase (Deploying / Active / Finished) so no new
  `OverlayId`, `FrameId` or `SCREEN_POLICY` row is minted (each would red ~25 pinned tests); new
  client files live under `client/src/tactics/` (never `ui/*View.ts`, which forces an `OverlayId`);
  ONE module (`client/src/tactics/strings.ts`) imports the i18n resolver, so PARITY-02's requester
  roster grows by one entry once; new wasm names are reached through a lazily-imported adapter
  (`client/src/tactics/wasm.ts`) at call time, so existing `client_wasm.js` test mocks need no new
  names; every new `Command` arm updates `screens/types.ts`, `battlePolicy.ts`
  (`COMMAND_BATTLE_POLICY`), `contextStack.test.ts` (12/25/37 literals) and `main.dispatch.test.ts`.
- **Test ownership:** the tester writes the gating tests from these criteria; the implementer
  never edits them; HEAVY slices name a split seam the builder may use to ship the smallest
  coherent increment and DEFER the rest to the same slice id's continuation.
- **Tuning constants** live in `tactics_tuning.ron` (bt-6) and load into one `TacticsTuning` struct
  (bt-2); rules take it as a parameter; tests assert the design's values on the loaded file.

## Sequencing & fan-out

The spine is **serial**: every game-core slice touches `game-core/src/tactics/mod.rs` and
`game-core/src/lib.rs`; every server slice touches `server-module/src/lib.rs`. After bt-8 the tail
fans out: the client chain **bt-10 → bt-11 → bt-12** (shared `main.ts`, i18n catalogs,
`styles.css`, `client/src/tactics/tacticsBattle.ts`) runs **in parallel with bt-9 → bt-13**
(server settlement, then telemetry; file-disjoint from the client chain). P2 follows the whole P1
tail: bt-14 (structural) after both tails, bt-15 (client), bt-16 (flip + e2e migration), bt-17
(purge; client-first seam). Bounded N ≤ 2 (`docs/routing.md`).

```
bt-1 → bt-2 → bt-3 → bt-4 → bt-5 → bt-6 → bt-7 → bt-8 ─┬→ bt-9 → bt-13 ───────┐
                                                        └→ bt-10 → bt-11 → bt-12 ─┴→ bt-14 → bt-15 → bt-16 → bt-17 → ⛩ strict §10 gate
```

Design-step mapping: T1 = bt-1 · T2 = bt-2 · T3 = bt-3 · T6 = bt-4 · T7/T8 rules = bt-5, server
= bt-9 · T4 = bt-6 · T5 = bt-7 + bt-8 · T9 = bt-10/11/12 · T10 = bt-12 (e2e) + bt-13 · T11 = bt-14
+ bt-15 · T12 = bt-16 + bt-17.

## Slices — P1 (tactical wild core)

### bt-1 — game-core `tactics::geometry` + `tactics::movement` + battle-map schema/validator + the native=wasm golden harness
category: gameplay (rules core) · severity: HIGH · size: MODERATE
touches: game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/geometry.rs, game-core/src/tactics/geometry_tests.rs, game-core/src/tactics/movement.rs, game-core/src/tactics/movement_tests.rs, game-core/src/tactics/map.rs, game-core/src/tactics/map_tests.rs, game-core/src/tactics/golden.rs, game-core/src/tactics/golden_tests.rs, game-core/tests/fixtures/tactics_golden.json, game-core/src/combat/mod.rs, client-wasm/src/lib.rs, client/src/tactics/golden.parity.test.ts, client/test-util/wasmPkg.ts, ARCHITECTURE.md
after: []
Design: §3.1, §2.1 (stride, terrain, occupancy, disengage), §3.2 (map schema + validator), §11 T1.
Measured: `game-core/src/lib.rs` declares modules alphabetically (`pub mod`) and re-exports a flat
surface; `clippy.toml` bans wall-clock and unseeded RNG but not HashMap (the no-HashMap-iteration
rule is enforced by the golden byte-identity test, not a lint); the existing parity harnesses are
evals (closed set), so the new harness is a cargo test + a vitest over `test-util/wasmPkg.ts`
`loadWasmPkg` (the `evolutionModel.parity.test.ts` idiom) sharing one JSON fixture; `combat/mod.rs`
says "the client does NOT predict battles" — retruthed (the client computes forecasts via wasm).

- **BT1.1:** WHEN tiles, ranges, adjacency or AoE are measured, THE geometry module SHALL use the
  Manhattan metric everywhere and SHALL expose ONE target-set function over a skill geometry that
  the server validator, the client highlighter, the forecast and the wild AI all call.

- **BT1.2:** WHEN a skill geometry `{range_min, range_max, origin: Caster|TargetUnit, shape:
  Single|Diamond(r≤2)|Burst(1), radius, ff_filter: Enemies|AllButSelf|All}` is applied to a board,
  THE target-set function SHALL return exactly the units of design §3.1 (range 0 = self, 1 = melee;
  radius 0 = the target tile only; Burst excludes its origin; the filter applied per unit), and the
  reserved `Line`/`Cone` variants SHALL return a typed `Unsupported` error, never an empty set.

- **BT1.3:** WHEN line of sight is queried, THE function SHALL take a blocker grid and SHALL return
  true for every tile pair on a map with no blockers (all P1 maps), so P3 obstacles are content plus
  a function body with no signature change.

- **BT1.4:** WHEN flank is evaluated, THE predicate SHALL be true iff the target is Manhattan-adjacent
  to at least 2 living units of the attacker's side, counting the attacker only when it is itself
  adjacent — so a ranged attacker flanks when two allies pin the target.

- **BT1.5:** WHEN a unit's stride is derived, THE movement module SHALL map species BASE speed ≤ 49
  → 2, 50–89 → 3, ≥ 90 → 4 (never the levelled stat; the live roster splits 6 / 9 / 5), and SHALL
  weight each entered tile by movement class × terrain per design §2.1 (Walk 1/2/✗, Nimble 1/1/✗,
  Swim 1/2/1, Fly 1/1/1 over Plain/Rough/Water; Blocked impassable for every class).

- **BT1.6:** WHEN a path is computed, THE movement module SHALL run Dijkstra with the explicit
  `(weight, y, x)` tie-break and no HashMap iteration, SHALL pass through allies but never end on
  one, SHALL never pass through enemies, and SHALL produce byte-identical paths natively and in
  wasm on the adversarial golden maps (equal-weight forks, ally corridors).

- **BT1.7:** WHEN a Move starts on a tile Manhattan-adjacent to a living enemy, THE disengage
  predicate SHALL flag the +1 tax once for that Move entry and SHALL exempt Fly-class units.

- **BT1.8:** WHEN a battle map is parsed, THE validator SHALL accept only width and height in 6..=8,
  tiles `{terrain: Plain|Rough|Water|Blocked, elevation: u8 = 0, blocks_los: bool = false}`
  (defaulted, unread in P1), three ordered spawn slots per side, a minimum opposing-slot distance of
  4 on 7×7 and 5 on 8×8, a maximum opposing distance ≤ 11, every spawn tile Walk-passable and a
  Walk path connecting the sides — rejecting any violation with a typed error naming the rule,
  never clamping.

- **BT1.9:** WHEN the golden fixture (distances, target sets, flank, paths, costs on the adversarial
  maps) is run, THE native cargo test and a wasm-side vitest SHALL both assert the same JSON fixture
  through one `tactics_golden` wasm export — the byte-identity harness that every later `tactics`
  module joins (BT2.5, BT4.8, BT11.7).

### bt-2 — game-core `tactics::economy` + `initiative` + `resolve` + `upkeep` + `outcome` + the `TacticsTuning` struct
category: gameplay (rules core) · severity: HIGH · size: HEAVY
touches: game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/tuning.rs, game-core/src/tactics/tuning_tests.rs, game-core/src/tactics/economy.rs, game-core/src/tactics/economy_tests.rs, game-core/src/tactics/initiative.rs, game-core/src/tactics/initiative_tests.rs, game-core/src/tactics/resolve.rs, game-core/src/tactics/resolve_tests.rs, game-core/src/tactics/upkeep.rs, game-core/src/tactics/upkeep_tests.rs, game-core/src/tactics/outcome.rs, game-core/src/tactics/outcome_tests.rs, game-core/src/tactics/golden.rs, game-core/src/tactics/golden_tests.rs, game-core/tests/fixtures/tactics_golden.json, client/src/tactics/golden.parity.test.ts, client-wasm/src/lib.rs, evals/baselines/spacetime-types.json
after: [bt-1]
Split seam: economy + initiative + tuning ‖ resolve + upkeep + outcome. Design: §2.1–§2.1.3 (AP, Guard, degenerate-optimum audit), §2.2 (round flow, upkeep order), §2.4
(damage pipeline, First-Stand), §6.4 (Surge, adjudication), §11 T2. Measured: carried
`calc_damage(attacker, defender, skill, type_chart, variance, weather) -> (u16, Effectiveness)` and
`accuracy_check(skill_accuracy, roll) -> bool` (`combat/damage.rs`) are reused by value; rules take
a `UnitKit`/`SkillTactics` view type defined here (not `SkillDef`/`Species`), so no content struct
changes; `BattleOutcome` (`combat/types.rs`) is pinned by exhaustive matches in `ranking.rs` and
`battle_core_tests.rs` and by the type-snapshot baseline; any new storage enum (`BattleKind`,
`UnitState`) derives `SpacetimeType` behind `cfg_attr(feature = "spacetimedb")` (feature-isolation
eval) as a non-generic `pub enum` (type-snapshot parser) and re-baselines `spacetime-types.json`.

- **BT2.1:** WHEN a unit-turn starts, THE economy SHALL refresh `AP_TURN = 6` with no carry-over
  and SHALL cost entries as Move 2 per stride (at most 2 strides per unit-turn across all Move
  entries), Light 2, Heavy 4, Exert +2 on the second and later attack of the turn, Item 3,
  Recruit 6, Flee 6, EndTurn 0, disengage +1 — every value read from `TacticsTuning`, asserted at
  the design's numbers.

- **BT2.2:** WHEN any multiset of entries is costed, THE economy SHALL make Heavy + Light (8) and
  Heavy + Heavy (10) unaffordable in one turn and two stationary Lights (2 + 4 = 6) the only
  double attack (property test over all entry combinations ≤ 4 long).

- **BT2.3:** WHEN a unit-turn ends, THE unit SHALL gain Guard iff the turn ended by player
  commitment (EndTurn entry, pre-queued drain or AI End — never an auto-pass) AND no attack skill
  executed AND ≥ 2 AP remain unspent AND the last action was not Recruit or Flee; Guard SHALL
  multiply incoming ATTACK damage by 3/4 (floor, min 1) until the unit's next TurnStart, SHALL never
  stack and SHALL NOT reduce status ticks or Surge.

- **BT2.4:** WHEN a round starts, THE initiative SHALL sort living deployed units by the total
  order `(eff_speed desc, base_speed desc, tie_rank asc, side_slot asc)` with tie priority
  alternating each round (round 1: the player side in PvE, `splitmix64(seed ^ 0x5EED) & 1` in
  PvP), and SHALL freeze the list for the round except for KO and recruit removals.

- **BT2.5:** WHEN an attack resolves, THE pipeline SHALL run in the pinned order `hit =
  accuracy_check(skill.accuracy, roll % 100)` (carried) → `d0 = calc_damage(…, weather = None)`
  (carried, variance 85..=100) → flank ×5/4 → Guard ×3/4 → immune ? 0 : max(d, 1), drawing a
  separate accuracy and variance roll per AoE target from `splitmix64(secret_seed ^ action_seq)`;
  a miss SHALL spend the AP, apply no status and emit `Missed`; golden vectors SHALL pin the order
  natively and in wasm.

- **BT2.6:** WHEN a deployed unit has not yet activated, THE First-Stand flag SHALL prevent attack
  damage from reducing it below 1 HP (emitting `StoodGround` and clearing the flag), SHALL clear at
  its first TurnStart (an auto-pass counts), and SHALL NOT apply to status ticks or Surge — an
  exhaustive max-burst round-1 simulation over the P1 kits finds no pre-activation attack KO.

- **BT2.7:** WHEN a round ends, THE upkeep SHALL run in the fixed order: status damage ticks (in
  initiative order) → Surge if PvP and r ≥ 9 → the reserved depth-wave slot → KO sweep + battle-end
  check + adjudication → status duration decrement/expiry → round caps (wild r == 30 → AutoFlee) →
  r += 1 and rebuild initiative; THE battle-end check SHALL also run after every resolved entry.

- **BT2.8:** WHEN a PvP round r ≥ 9 reaches upkeep, THE Surge SHALL deal `max_hp × 5 × (r − 8) /
  100` (floor, min 1) true damage to every living unit, bypassing Guard and First-Stand; wild
  battles SHALL never Surge; a property test SHALL show every PvP match terminates by round 14.

- **BT2.9:** WHEN both sides empty in the same step, THE outcome SHALL be adjudicated by the exact
  tuple (higher Σ cur_hp×100/max_hp at step start, more conscious units at step start, higher
  cumulative attack damage dealt, `splitmix64(seed ^ round) & 1`) and THE carried `BattleOutcome`
  SHALL gain NO new variant (outcomes remain `SideAWins | SideBWins | Fled`; PvE double-KO follows
  the standing r2 ruling).

- **BT2.10:** WHEN the r2 0-HP family is replayed on the tactical substrate, THE rules SHALL deploy
  conscious units only, SHALL refuse any action by a 0-HP unit, SHALL drop a mid-turn-KO'd unit from
  the remaining order (its READY plan voided with a visible event), SHALL end the actor's turn when
  it KOs itself through an `All`-filter AoE, and SHALL resolve PvE double-KO per r2 and PvP double-KO
  by BT2.9.

### bt-3 — game-core `tactics::queue` + `tactics::clock` + the storage enums
category: gameplay (queue/clock semantics — D583.2) · severity: HIGH · size: HEAVY
touches: game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/types.rs, game-core/src/tactics/types_tests.rs, game-core/src/tactics/queue.rs, game-core/src/tactics/queue_tests.rs, game-core/src/tactics/clock.rs, game-core/src/tactics/clock_tests.rs, game-core/src/tactics/events.rs, game-core/src/tactics/events_tests.rs, evals/baselines/spacetime-types.json, docs/DECISIONS.md
after: [bt-2]
Split seam: queue + types ‖ clock + events. Design: §2.2 (unit-turn state machine, transaction chain rule), §2.3 (queue states, submit gate,
execution gate, halt-and-return, idle clock table), §6.2–§6.3 (PvP parameters, event emission),
§11 T3. Decision record: the halt-and-return waste rule and the literal reset-on-submit clock are
the forks this slice resolves (design §12 Q1/Q2 defaults) — `docs/DECISIONS.md` entry. Measured:
`QueuedAction`, `TurnState`, `Phase` and the event payload are stored in tables, so they derive
`SpacetimeType` here behind the feature gate (the M14.5f lesson: no `serde(default)` compatibility
assumption on BSATN types; append-only variants) and re-baseline `spacetime-types.json`.

- **BT3.1:** WHEN a plan is represented, THE `QueuedAction` closed enum SHALL be exactly
  `Move{dest, strides: 1|2}`, `Skill{skill_id, target: Unit(id)|SelfTarget}`, `Item{item_id,
  target}`, `Recruit{target, bait: Option<item_id>}`, `Flee`, `EndTurn`, SpacetimeType-derived for
  storage with no `serde(default)` compatibility assumption.

- **BT3.2:** WHEN a queue is submitted, THE submit gate SHALL accept only ≤ 3 action entries plus an
  optional trailing `EndTurn` (appending `EndTurn` to a pre-queue when absent, so a stored plan
  never exceeds 4 entries), SHALL require Recruit and Flee to be the only action and SHALL reject
  both in PvP, SHALL cost the plan on the board as it stands (strides × 2 + tiers + Exert + 3 ×
  items + the disengage tax for each Move whose start tile is enemy-adjacent at submit) against 6
  for a pre-queue or current AP for a live submit, SHALL cap strides at 2, SHALL require every
  skill in the unit's kit, every item held in the quantity used and every target id present, and
  SHALL reject with a typed reason — never store a plan that is unaffordable on the unchanged board.

- **BT3.3:** WHEN an entry pops, `validate_at_pop` SHALL re-cost the path including the tax,
  recompute range, geometry and target sets through the ONE geometry function, re-check adjacency,
  headroom and affordability, re-read the owner's inventory through an injected reader for Item and
  bait entries, re-path a Move at equal or lower weight to its bound destination (unreachable or
  occupied → the whole Move invalid, no partial walk) and re-centre a Skill on its bound unit's
  current tile — never trusting a client-sent tile.

- **BT3.4:** WHEN an entry fails at pop, THE executor SHALL discard it and every later entry
  (wasted: never executed, 0 AP charged), SHALL emit `PlanHalted{unit, idx, reason_kind}`, and
  SHALL return control to the owner in `Waiting(U)` iff the unit is player-owned, conscious and has
  ≥ 2 AP — otherwise `TurnEnd(committed = true)`; a drained pre-queued or AI plan, a trailing
  `EndTurn` or < 2 AP SHALL end the turn committed, while a live drain with ≥ 2 AP SHALL re-enter
  `Waiting(U)`.

- **BT3.5:** WHEN a unit's turn starts, THE machine SHALL skip fainted, recruited or removed units,
  SHALL reset `ap = 6, strides_used = 0, attacks = 0, guard = false` and clear First-Stand, SHALL
  void a READY row under a turn-skip status (`QueueVoided`, `TurnEnd(committed = false)`), SHALL
  execute `ai::plan` for a wild (origin AI), SHALL consume and execute a READY row (origin
  PreQueued) and otherwise SHALL enter `Waiting(U)`.

- **BT3.6:** WHEN turns are chained, THE pure step function SHALL keep starting pre-queued and AI
  turns until the battle reaches `Waiting`, `Finished`, or completes the current round's upkeep,
  SHALL never cross a round boundary (returning an `Advancing{battle_id, round}` marker for the shell
  to schedule), and SHALL be bounded at ≤ 6 unit-turns × ≤ 3 actions plus one upkeep per step.

- **BT3.7:** WHEN a READY row's unit faints, is recruited, the battle ends or a turn-skip status
  voids it, THE row SHALL be deleted with a visible event; a READY row SHALL survive the round
  boundary (it is the unit's NEXT turn, whenever that is); a cancel arriving after TurnStart SHALL
  return typed `Err(AlreadyActing)`; and when the same consumable sits in two READY plans, THE second
  to pop SHALL halt at that entry (no server-side double spend).

- **BT3.8:** WHEN a live submit's first entry fails `validate_at_pop`, THE gate SHALL reject with
  typed `Err(InvalidNow{reason})`, execute nothing and leave the clock window running (no reset).

- **BT3.9:** WHEN `Waiting(U)` is entered at server time t0, THE clock module SHALL open a window at
  `t0 + pad` where `pad = Σ presentation caps of events since the last Waiting` capped at 5 000 ms,
  set `deadline = t0 + pad + BUDGET` and `window_seq += 1`; an accepted submit SHALL close the
  window and add `max(0, t − (t0 + pad))` to `idle_ms_total`; re-entering `Waiting(U)` SHALL open
  a FRESH full window; a unit-turn SHALL never exceed 3 windows (6 → 4 → 2 AP); a submit or cancel
  for a different unit SHALL leave U's deadline untouched; BUDGET SHALL be 30 000 ms in PvP (expiry →
  AutoPass, no Guard, `autopass_count += 1`, the 4th of the match → forfeit, never reset) and
  300 000 ms in PvE (expiry → AutoFlee); deploy windows SHALL be 45 000 ms in PvP and 300 000 ms in PvE.

- **BT3.10:** WHEN anything resolves, THE executor SHALL emit `battle_event` payloads only at
  execution — `Executed{per-target dmg, hit, flank, guard}`, `Missed`, `PlanHalted`, `QueueVoided`,
  `AutoPass`, `StoodGround`, `Status`, `Surge`, `KO`, `RecruitResult`, `Awards` — and a halted
  plan's discarded tail SHALL never appear in any event.

Build note (bt-3, 2026-10-31, measured): the machine is `tactics::queue::TacticalBattle` with
the inputs `start` / `advance(AdvancePin{battle_id, round})` / `submit_queue(sender: Side, …)` /
`cancel_queue(sender, unit)` / `expire(now, unit, window_seq)` / `conclude(outcome, how)`; a hook
trait `queue::Hooks` is the seam later slices use (the planner — bt-4, inventory — bt-8, recruit
headroom and Item/Recruit/Flee resolution — bt-5/bt-9), because none of their `touches:` includes
`queue.rs`; hooks see the state with `seed`/`action_seq` zeroed and may emit only
`RecruitResult`/`Awards`/`Status`. The SpacetimeType derive accepts only unit or one-field
variants, so every payload variant wraps a struct (`Move(MoveAction)`, `Executed(ExecutedEvent)`);
`EventPayload` adds `Moved`, `ItemUsed`, `TurnEnded`, `RoundEnded`, `BattleStarted`, `BattleEnd`
after the design's list. `BattleEndHow` (bt-2, out of touches) has no Forfeit/Fled/AutoFlee, so
the storage `EndHow` carries them and `queue.rs` sets the outcome itself (residual → bt-14).
Persisted fields design §8.1 lacks: `battle_tactical.pending_pad_ms`,
`battle_tactical.attack_damage_dealt`, `battle_unit.budget_last`; `battle_clock` is keyed by
side (Practice: one player, both sides, strikes per side) — residual → bt-7. A submit landing
after its deadline but before the fire commits is accepted (the fire is then `StaleWindow`).
Turn-skip (`status_blocks_turn`) is a third restated carried rule, pinned, retired with bt-17.

### bt-4 — game-core `tactics::ai` (seed-free stances) + `tactics::encounter` (packs, clamp, per-wild seeds, map pick)
category: gameplay (wild AI + encounter generation) · severity: MED · size: MODERATE
touches: game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/ai.rs, game-core/src/tactics/ai_tests.rs, game-core/src/tactics/encounter.rs, game-core/src/tactics/encounter_tests.rs, game-core/src/tactics/golden.rs, game-core/src/tactics/golden_tests.rs, game-core/tests/fixtures/tactics_golden.json, client/src/tactics/golden.parity.test.ts, client-wasm/src/lib.rs, docs/DECISIONS.md
after: [bt-3]
Design: §4.2 (stances, Exhausted, telegraph source), §3.4 (multi-wild generation), §11 T6.
Decision record: the seed-free `ai::plan` signature as a structural rule (randomness must become
server-pushed events, never a hidden seed) — `docs/DECISIONS.md` entry. Measured: the encounter
rules take `PackWeights` and `BattleMapPool` parameters (content joins them in bt-6) — the carried
`EncounterTable`/`resolve_encounter` (`taming/types.rs`, `taming/rules.rs`) stay untouched, so no
`marshal.rs` or `encounter` table change.

- **BT4.1:** WHEN the wild AI plans, `ai::plan(board, unit) -> Vec<QueuedAction>` SHALL take no RNG
  or seed parameter (pinned by the compile shape), SHALL be a pure function of the live board, and
  SHALL break every tie by `(Manhattan distance, cur_hp, side_slot, y, x)` ascending.

- **BT4.2:** WHEN an Aggressive wild can attack this turn (Heavy after ≤ 1 stride, else Light after
  ≤ 2 strides), IT SHALL pick the target by the tie-break, move to the cheapest attack tile and
  attack (Heavy if affordable); otherwise IT SHALL move 2 strides minimizing distance to the
  nearest player unit.

- **BT4.3:** WHEN a Territorial wild plans, IT SHALL behave as Aggressive but SHALL never end a move
  more than 2 tiles from its spawn tile, and SHALL `EndTurn` (gaining Guard) when no attack is
  possible.

- **BT4.4:** WHEN a Skittish wild has a target within its Heavy's range after 1 stride, IT SHALL
  choose the attack tile maximizing distance to the nearest player unit; otherwise IT SHALL move 2
  strides maximizing that distance while staying within `range_max + 2` of it.

- **BT4.5:** WHEN a wild's `cur_hp × 4 < max_hp`, THE universal Exhausted rule SHALL override its
  stance: it never moves, attacks from its tile if anything is in range, else ends its turn.

- **BT4.6:** WHEN any stance plans, THE AI SHALL never emit `Item`, `Recruit` or `Flee`.

- **BT4.7:** WHEN an encounter is generated, THE encounter module SHALL roll pack size from the
  zone's `pack_weights` (per-mille, default 1: 600 / 2: 300 / 3: 100) using the existing encounter
  seed, clamp `effective = min(rolled, 3, conscious_party_count)`, derive each wild's seed as
  `splitmix64(encounter_seed ^ i) as u32`, pick the map as `battle_map_pool[encounter_seed % len]`,
  place wilds on `spawn_b` slots in order, and leave species/level selection to the zone's existing
  pool rules unchanged.

- **BT4.8:** WHEN the sampled frozen boards of the golden fixture are planned, THE wasm `ai::plan`
  SHALL return byte-identical plans to the native one (intent-chip parity joins the bt-1 harness).

Build note (bt-4, 2026-10-31, measured): `ai::plan(state, unit, stance, spawn, &TacticsTuning)` —
the stance (`battler.stance`, bt-6) and the spawn tile (`spawn_b[slot]`) are not in `TacticalState`, and
every rule reads the tuning, so the shell's `Hooks::plan_ai` impl passes them; the signature still carries
no RNG or seed (the compile shape). The planner costs from `TurnBudget::fresh` (the intent chip sees idle
budgets), costs the trailing `EndTurn`, and derives the candidate set from the economy (`plan_cost`), which
at the design tuning IS "Heavy after ≤ 1 stride, else Light after ≤ 2 strides" and demotes the taxed
cases the literal reading would halt at pop; it prefers the tier before the tile (a Heavy after one stride
beats a stationary Light), emits the minimal stride count, breaks every tile tie by `(primary, path cost,
y, x)` (the own tile costs 0: a move needs a strict improvement), never self-hits, ignores a later kit
entry repeating an earlier `skill_id`, and a Skittish wild with no in-band tile in reach approaches (no
Heavy in kit → band 2). "Distance" is Manhattan: an approach no reachable tile improves stays put. The
Territorial leash (2), the Skittish band pad (2) and the Exhausted factor (4) are consts in `ai.rs`, not
`TacticsTuning` fields (residual → bt-6). `encounter`: `roll_pack_size` = `encounter_seed % 1000` against the
cumulative per-mille thresholds, `wild_seed(i)` = `splitmix64(encounter_seed ^ i) as u32`, `pick_map_index`
= `encounter_seed % pool_len` in u64, `spawn_tiles` = `spawn_b[..pack]`, `generate_encounter(weights,
pool_len, seed, conscious)` → `{map_index, seeds}`; `conscious_party_count == 0` is an error; species/level
per slot are untouched (bt-9 must not re-run the trigger gate per slot). BT4.8 joined the golden harness as
`GoldenCase::AiPlan {rows, units, seed, action_seq, unit, stance, spawn}` (20 cases; the state passed as
given — the planner's blindness, not the runner's); no `client-wasm` change (serde dispatch); the direct
`tactics_ai_plan` export is bt-11's.

### bt-5 — game-core `tactics::recruit` + `tactics::rewards` (rules only; server glue is bt-9)
category: gameplay (recruit + reward rules) · severity: HIGH · size: MODERATE
touches: game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/recruit.rs, game-core/src/tactics/recruit_tests.rs, game-core/src/tactics/rewards.rs, game-core/src/tactics/rewards_tests.rs
after: [bt-4]
Design: §5 (tactical recruit), §3.6/5a (Flee), §7 (rewards table), §11 T7/T8 rule halves.
Measured: carried `recruit_chance(max_hp, current_hp, base_rate, bait_bonus) -> u16` per-mille
(`taming/rules.rs`, `RECRUIT_BASE_RATE = 80`, `MISSING_HP_FACTOR = 500`), `battle_xp_reward`
(`combat/xp.rs`), `essence_battle_reward(bst) -> u32` and `battle_currency_reward(bst) -> u64`
(`currency.rs`) are called by value — none is modified; headroom reuses game-core
`check_headroom`/`check_item_headroom` (`trading/rules.rs`) through an injected result.

- **BT5.1:** WHEN a Recruit entry is validated, THE rule SHALL require a wild target Manhattan-adjacent
  to the unit, 6 of 6 AP at execution, Recruit as the only entry of the turn, bait as a 0-AP
  parameter, and SHALL reject Recruit in any PvP battle kind.

- **BT5.2:** WHEN recruit odds are computed, THE rule SHALL call the carried `recruit_chance(max_hp,
  hp, base_rate = 80, bait_bonus)` unchanged, quantize `pct = permille / 10`, succeed iff
  `roll % 100 < pct`, and expose line items that always sum — base ⌊80/10⌋ = 8, bait ⌊b/10⌋,
  weakened = pct − 8 − bait — so a wild at 20 % HP with bait 150 ‰ shows 8 + 15 + 40 = 63 %. (Built: the bait line
  is `min(⌊b/10⌋, pct − 8)` — it only bites at the 1000 ‰ cap, so the lines still sum; bait > 1000 ‰ is rejected.)

- **BT5.3:** WHEN headroom is absent at execution (injected `check_headroom` result), THE Recruit
  entry SHALL be invalid — halt-and-return, nothing charged — and the same predicate SHALL be
  consulted at submit so the client can grey the verb with its reason.

- **BT5.4:** WHEN a recruit succeeds, THE wild SHALL leave the board and the initiative immediately,
  be rebuilt from its per-wild seed at full HP with exact genes, receive zero XP, essence and
  currency, be non-deployable for the rest of this battle, and end the battle in a win when it was
  the last wild; WHEN it fails, THE turn SHALL be consumed, the bait consumed, and later odds
  unchanged.

- **BT5.5:** WHEN a Flee entry is validated, THE rule SHALL require it to be the only entry with
  6 of 6 AP from any tile, succeed deterministically, exit the whole player side with outcome
  `Fled`, and THE voluntary, auto (clock or round-cap) and disconnect triggers SHALL share this one
  rule.

- **BT5.6:** WHEN a unit is defeated, THE `on_unit_defeated(killer, victim)` hook SHALL write to the
  in-battle ledger: XP (wild battles: 50 % to the killer and 50 % split evenly over the other
  deployed allies conscious at that moment, integer division with the remainder to the killer, 100 %
  when alone; PvP: none), essence (carried `essence_battle_reward(bst)`, 100 % to the killer in
  every rewarded battle kind — Wild and Pvp; Practice pays nothing, design §6.1), currency (wild: carried `battle_currency_reward(bst)` to the player; PvP:
  none); a recruit success SHALL never fire the hook. (Built: a same-side KO and a wild's kill pay
  nothing; a level outside `Level`'s range skips the XP only; a KO is credited at most once.)

- **BT5.7:** WHEN the ledger is paid, EACH monster's share SHALL be paid only if it is conscious at
  battle end (fainted shares forfeited, not redistributed; benched members receive nothing) and
  SHALL be paid on every terminal path — win, loss, Flee, auto-flee, disconnect.

### bt-6 — content: tactical sidecar registries (skills/species/items/zones), power retune, 8 battle maps, `tactics_tuning.ron`, kit builder + lints, CONTENT_VERSION
category: content · severity: MED · size: MODERATE
touches: game-core/build.rs, game-core/src/content.rs, game-core/src/lib.rs, game-core/src/tactics/mod.rs, game-core/src/tactics/content.rs, game-core/src/tactics/content_tests.rs, game-core/content/skills/000-core.ron, game-core/content/skills/070-wave3.ron, game-core/content/tactics_skills/000-core.ron, game-core/content/tactics_species/000-core.ron, game-core/content/tactics_items/000-core.ron, game-core/content/tactics_zones/000-core.ron, game-core/content/battle_maps/000-core.ron, game-core/content/tactics_tuning.ron, server-module/src/lib.rs, server-module/src/content.rs, server-module/src/content_cache.rs, server-module/src/content_cache_tests.rs, evals/baselines/content-hash.json, client/e2e/encounter-battle.spec.ts, client/e2e/battle-dpad.spec.ts
after: [bt-5]
Design: §4.1 (identity levers, kits, lints, retune), §3.2 (P1 maps), §3.4 (`pack_weights`,
`battle_map_pool`), §8.2 (RON shapes), §11 T4. **Measured layout deviation from §8.2, flagged
(see Risks):** the tactical data lands as SIDECAR registries keyed by id (`tactics_skills/`,
`tactics_species/`, `tactics_items/`, `tactics_zones/`, `battle_maps/` under `game-core/build.rs`
`REGISTRIES`; `tactics_tuning.ron` as an `include_str!` singleton like `type_chart.ron`) instead of
new fields on `SkillDef`/`Species`/`ItemDef`/`EncounterTable`/`ZoneDef` — a field on those structs
breaks ~100 hand-built struct literals across game-core and server tests plus production code in
`marshal.rs`, `movement.rs`, `evolution/transform.rs`, `rolls.rs`, and `pack_weights` would be lost
on the `encounter` table round trip without a schema change. The semantics are identical; the join
(`tactics::content::build_kits`) is the parse-don't-validate boundary and the lints run over the
join. The power retune edits the live skill rows, which reds the frozen golden
`m8_9e_skills_migration_parity` (`content.rs` `SKILLS_GOLDEN`, ids 1–6) — updated values-only. The
content-hash eval walks `game-core/content/` recursively, so new dirs enter the hash automatically;
`append-only-ids` has an explicit registry list and is NOT extended (closed set). The e2e attack
budgets `MAX_ATTACKS = 30` (encounter-battle, battle-dpad) are declared in case the halved Light
power lengthens the 1v1 fights those specs still drive before cutover.

- **BT6.1:** WHEN tactical skill data loads, EVERY skill id SHALL have exactly one `tactics_skills`
  entry `(skill_id, tier: Light|Heavy, range_min, range_max, origin, shape, radius, ff_filter)`;
  THE Lights (Ember, Water Gun, Spark, Glimmer, Aqua Jet, Vine Whip; Toxic Sting already 20) SHALL
  have power 20 and THE Heavies 65–75 (Razor Leaf 55 → 65) in the live skill rows; weather-setter
  skills (Rain Dance, Sunny Slam, Sandblast, Hailstrike) SHALL carry an entry but appear in no P1
  kit; `accuracy` SHALL be unchanged.

- **BT6.2:** WHEN tactical species data loads, EVERY species id SHALL have exactly one
  `tactics_species` entry `(species_id, movement: Walk|Nimble|Swim|Fly, role: Striker|Guardian|
  Skirmisher|Support|Artillery, stance: Aggressive|Territorial|Skittish, kit: [light_skill_id,
  heavy_skill_id], signature: None, footprint: 1)`, and ITS kit SHALL be exactly one Light and one
  Heavy from its `learnable_skill_ids` with distinct geometry (range band or shape differs), at least
  one with `range_min = 1`.

- **BT6.3:** WHEN tactical item and zone data loads, `tactics_items` SHALL map battle-usable item ids
  to `(range, target_filter)`, and `tactics_zones` SHALL give every zone `pack_weights` summing to
  1 000 ‰ and a non-empty `battle_map_pool` whose ids resolve to loaded maps.

- **BT6.4:** WHEN battle maps load, THE six P1 maps (three 7×7, three 8×8: open field, water
  channel, rough choke) and two mirrored 8×8 PvP maps under `game-core/content/battle_maps/` SHALL
  pass bt-1's validator, and `tactics_tuning.ron` SHALL load into `TacticsTuning` with every
  constant of the design (6 / 2 / 2 / 4 / +2 / 3 / 6 / 6 / +1, Guard 3/4, flank 5/4, Surge start 9,
  windows 30 000 / 300 000 / 45 000 / 300 000 ms, 3 windows, 4 strikes, round cap 30, pad cap 5 000).

- **BT6.5:** WHEN content validates, THE lints (ordinary tests over the joined kits) SHALL require
  `dmg_ref(heavy) > 2 · dmg_ref(light)` for every kit at every level 5..=100 (dmg_ref = carried
  `calc_damage` at neutral type, no STAB, atk = def, variance 100), `range_max ≥ 3 ⇒ range_min = 2`,
  `stride + heavy.range_max ≤ 6`, `stride + any.range_max ≤ 7`, and `ff_filter = All ⇒ origin =
  TargetUnit`, failing with the offending id; THE server `sync_content` validate phase SHALL run the
  same join-and-lint before any write.

- **BT6.6:** WHEN the content lands, CONTENT_VERSION SHALL bump once (24 → 25), `validate_content`
  SHALL be green, the content-hash baseline SHALL be regenerated, the five tactical registries SHALL
  be cached by `LazyLock` accessors in `content_cache.rs`, and the frozen skills golden SHALL be
  updated to the retuned values (values only — ids and names unchanged).

**Build note (bt-6, measured):** (1) **Heavies → 70, not 65.** The BT6.5 lint is unsatisfiable at
Heavy 65 / Light 20: at L8–9 (`2L/5+2 = 5`) `dmg_ref` is 8 vs 4, and `8 > 2·4` fails; 70 is the
smallest Heavy power that holds at every level 5..=100 (computed). Fire Fang (2) 65→70, Razor Leaf
(6) 55→70, Thunder Fang (41) 65→70, Radiant Lance (43) stays 70 — inside BT6.1's "65–75" band;
BT6.1's "Razor Leaf 55 → 65" is superseded by the lint. (2) **BT6.2's kit ⊆ `learnable_skill_ids`
is DEFERRED** — a hidden dependency on `game-core/content/species/*.ron` (outside touches): species
2, 6, 7, 8, 9, 20, 21, 22, 23, 30 learn only Lights and/or weather setters, and no Water, Dark,
Earth or Wind Heavy exists. They ship provisional kits (an existing Heavy, all lints green) and a
test pins that exact off-learnable set; the follow-up adds species Heavies, flips the pin to ∅ and
adds the subset check to `build_kits`. (3) RON writes the fixed-size `kit` pair as a tuple
`(light, heavy)`. (4) R-bt-3-TUNINGVALID's floors land as `TacticsContentError::TuningFloor` in
`tactics/content.rs` (`tuning.rs` is outside touches); R-bt-4-TUNINGCONSTS: the ai/encounter
consts stay where they are (BT6.4 enumerates only the `TacticsTuning` constants).

**Build note (ci-fix-20261031T1900, 2026-10-31, measured):** the `MAX_ATTACKS = 30` widening above guarded
the wrong budget. `encounter-battle.spec.ts` attacks with the FIRST skill cell (Ember, now 20) on a starter
whose SQL level seed leaves its level-5 creation stats in place (attack 8–12, HP 19–21); against the seeded
defense 250 the wild's Heavy lands the floor 1 per turn, so the fight is an HP race, not an attack count.
Enumerating all 2^32 encounter seeds through the real roll/derive/damage path: P(win | fought non-Water
wild) = 79.4 % on the natural roll (species 1: 69.1 %) — master red on ~21 % of runs after the retune (CI run
41227281094). Fix, e2e-side as this note intends: seed `stat_attack = 100` the way `battle-dpad.spec.ts`
already seeds all six stats → ≤ 4 Ember hits against the toughest draw (Lv7 Flameling, def 15, HP 25),
P(win) = 100 %, plus a read-back assertion of the seeded row. Content, lints and CONTENT_VERSION untouched;
BT6.1/BT6.5 forbid the content revert (Light 40 would need Heavy ≥ 113 at L5).

### bt-7 — server schema: the tactical tables, participant/owner views, manifest + cascade, bindings, privacy proofs
category: security-privacy + data-integrity (schema) · severity: CRITICAL · size: MODERATE
touches: server-module/src/schema.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, client/src/module_bindings/, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, evals/baselines/client-visible-tables.json, evals/account-e2e.eval.mjs, docs/DECISIONS.md, ARCHITECTURE.md
after: [bt-6]
Structural — serial. Design: §8.1 (tables, views, turn_state, GC lifecycle), §6.3 (secrecy scope), §11 T5 privacy
audit. Decision record: tactical battle privacy by structure (no ready flag on `battle_unit`,
secret tables with no view, owner-only staging; new tables are NOT exportable — transcripts are
GC'd at 24 h and the summary is telemetry) — `docs/DECISIONS.md` entry. Measured: tables follow
the `#[spacetimedb::table(accessor = x)]` + field-level `#[primary_key]`/`#[index(btree)]`
idiom (derives BEFORE the attribute; no table-level `index(...)` — the schema eval throws on it);
the schema eval's zoning heuristic indexes any `zone_id`/`map_id`/`tile_x`/`tile_y` column, so
`battle_tactical.map_id` carries `#[index(btree)]` and unit coordinates are `x`/`y`; views are
`#[spacetimedb::view(accessor = my_x, public)] fn(ctx: &ViewContext)` whose body is the whole
boundary (`my_battle` two-identity `.chain()` + de-dup, `my_wallet` owner `find`); every new table
joins `DATA_LIFECYCLE_MANIFEST` (Erase, except `battle_summary` Anonymize) and the
`accounts_tests.rs` partition/row-type/group-size/rekey arrays (`player_formation` REKEYED, the
rest NOT_REKEYED — a live battle blocks `complete_guest_claim`), the `account-e2e`
`M22S9_MANIFEST_TRANSCRIPTION`, and the deletion cascade in `accounts.rs`; new views join
`client-visible-tables.json` (baseline) and `native_host_tests.rs` `VIEW_DESCRIBERS`; the `battle`
anchor row keeps its schema (`state.outcome` drives `is_in_ongoing_battle`). Scheduled tables live
in the owning module (pvp.rs idiom) and land with their reducers in bt-8.

- **BT7.1:** WHEN the module publishes, THE schema SHALL add the PRIVATE tables `battle_tactical`
  (PK battle_id; kind, format, map_id (indexed), content_version, phase, round, initiative,
  turn_idx, turn_state ∈ {NotActive, Waiting(unit_id), Advancing}, tie_priority_side), `battle_unit`
  (PK unit_id, btree battle_id; `side: u8` and `owner: Option<Identity>` stored separately; `x`,
  `y`, HP, stats, skill_ids, status, ap, strides_used, attacks, guard, first_stand, movement,
  stride, stance, state ∈ {Active, Fainted, Recruited}), `battle_queue` (unique (battle_id,
  unit_id)), `battle_deploy`, `battle_clock`, `battle_secret`, `battle_wild_unit`, `battle_event`
  (append; btree battle_id), `battle_summary` and `player_formation` — additive only; `battle` and
  `battle_challenge` unchanged in this slice; bindings regenerated by `just gen`.

- **BT7.2:** WHEN a participant subscribes, THE views `my_tactical_battle`, `my_battle_units`,
  `my_battle_events` and `my_battle_clock` SHALL return rows to both participants; `my_battle_queue`,
  `my_battle_deploy` and `my_formation` SHALL return rows to their owner only; and `battle_secret`,
  `battle_wild_unit` and `battle_summary` SHALL have no view at all.

- **BT7.3:** WHEN two identities share a battle, A native-host test SHALL prove the non-owner
  receives no `battle_queue` or `battle_deploy` row, neither receives a `battle_secret` or
  `battle_wild_unit` row, and `battle_unit` exposes no queue or ready field; THE
  `client-surface-privacy` eval SHALL stay green with only its `client-visible-tables.json` baseline
  extended (no hidden field name or hidden type reachable through any new view).

- **BT7.4:** WHEN a player deletes or anonymizes their account, THE cascade SHALL cover every new
  table (manifest entries, partition arrays, rekey roster and the cascade step all extended), and
  THE export bundle SHALL be unchanged (no new exportable table).

- **BT7.5:** WHEN the structural baselines are regenerated, `battle-schema-snapshot` and
  `spacetime-type-snapshot` SHALL be re-baselined additively (every pre-existing table and type
  byte-identical), `bindings-drift` SHALL be 0, and the publish-over-data proof SHALL pass.

**Build note (bt-7, 2026-10-31, measured):** (1) **Tables with no Identity column are
`ViaJoin("battle")`, not `Erase`** — `battle_tactical`, `battle_secret`, `battle_wild_unit` and
`battle_event`; the manifest's typed rule (`m22s6_owner_keyed_tables_are_erase_or_anonymize`) requires an
Identity column on every Erase/Anonymize table, and these rows hang off the anchor by `battle_id`. The
five identity-bearing tables are Erase (`battle_unit`, `battle_queue`, `battle_deploy`, `battle_clock`,
`player_formation`) and `battle_summary` is Anonymize with `player_identity` + `opponent_identity`
columns mirroring `battle`. (2) **Keys decided at first publish** (a later PK/unique change is
automigration-forbidden): `battle_unit.unit_id` is a global `auto_inc` u32, so `battle_queue`'s
"unique (battle_id, unit_id)" is PK `unit_id`; `battle_deploy`, `battle_clock`, `battle_wild_unit` and
`battle_event` carry synthetic `auto_inc` keys (their natural keys are pairs); `player_formation` is
keyed by the owner identity. (3) `battle_unit.owner` is `Option<Identity>` as designed and carries no
index (sum types are not indexable); the cascade collects battle ids from every row that still names
the identity (the reaper's first step can delete an ongoing wild anchor first) and sweeps the whole
battle's rows by `battle_id`. (4) game-core's `MoveClass`, `Side`, `ai::Stance` and `economy::Entry`
are not wire types, so schema.rs carries `SpacetimeType` twins (`SideRow`, `MoveClassRow`, `StanceRow`,
`BudgetLastEntry` + `BudgetMoveSpend`); `max_hp` is not stored (it is `stats.hp`); `battle_deploy`
carries `side` (one owner stages both sides of a Practice battle); `battle_summary` carries BT9.5's
`unit_turns_prequeued`, `unit_turns_live`, `halted_plans`, `se_kos_after_r1` now (bt-9 has no
schema.rs in touches); R-bt-3-PERSIST's columns land as `battle_tactical.{pending_pad_ms,
attack_damage_dealt_a, attack_damage_dealt_b}` and `battle_unit.{slot, budget_last}`. (5) The three
cascade and claim-flow helpers (`has_formation`, `rekey_formation`, `erase_tactical_rows`) live in
schema.rs (the module that declares the tables; `accounts.rs` writes only its own). (6) The
`account-e2e` vacuity allowlist grows from 3 to 10 with seven `(until bt-8)` rows: the tactical tables
have no organic writer until bt-8's reducers and their columns are not DML-expressible;
`battle_secret` and `battle_wild_unit` are SQL-seeded under the subject's terminal battle so their
sweep is proven live. (7) **bt-8's `touches:` must widen** to `server-module/src/schema.rs` (manifest
entries for its three scheduled tables, `ViaJoin("battle")`), `server-module/src/accounts_tests.rs`
(the rosters), and `evals/account-e2e.eval.mjs` (the transcription + retiring the `(until bt-8)`
rows); `accounts.rs` too if the helpers re-home into `tactics.rs`. (8) **Review findings carried as residuals** (reducer-security-auditor, bt-7): `battle_summary`
and `player_formation` are personal data kept out of the export bundle by BT7.4 — the DECISIONS
rationale no longer claims the summary holds no personal data; widening the export is the spec
owner's call (R-bt-7-SUMMARYEXPORT); `QueueVoided` events reach both sides, so the opponent learns a
READY plan existed on a KO'd unit — design §2.3 approves the event, §6.3 reads otherwise
(R-bt-7-QUEUEVOIDED); bt-8's disconnect / forced-terminal paths must sweep tactical rows by
`battle_id` whenever they end or delete a `battle` row, since the reaper's 6a step can delete an
ongoing wild anchor before `erase_tactical_rows` runs (R-bt-7-BT8ORPHANS). The cascade test gained
two anchor-only battles (one per anchor role) after both review lenses measured the `battle` anchor
lookups as untested.

### bt-8 — server `tactics.rs`: wild engine reducers, turn chain, clock scheduling, dev start, disconnect GC, GC
category: gameplay + security-privacy (reducers) · severity: CRITICAL · size: HEAVY
touches: server-module/src/lib.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, server-module/src/privacy_enforcement_tests.rs, client/src/module_bindings/, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, evals/baselines/client-callable-reducers.json, scripts/verify-release-reducers.mjs, scripts/verify-release-reducers.test.mjs, ARCHITECTURE.md
after: [bt-7]
Split seam: reducers + chain ‖ scheduling + disconnect GC + GC. Design: §2.2 (chain rule), §2.3 (scheduling with arg-identity pins), §3.3 (wild deploy paths),
§3.7 (wild bounds), §8.1 (reducers, GC), §11 T5. The new domain module is a flat `tactics.rs` +
`tactics_tests.rs` (the deletion-gate test reads `{name}.rs`; `mod tactics;` sits between
`taming` and `trading` in `lib.rs`); `battle.rs` does not grow (its `write_back_party_hp` is
called, not extended). Measured: the scheduled tables (`tactical_deadline_sched`,
`tactical_advance_sched`, `battle_gc_sched`) are defined here with their reducers (pvp.rs idiom:
`scheduled(reducer)`, `ScheduleAt::Time`, arg = the schedule row, first statement the
database-identity guard); the dev start reducer is cfg-gated like `start_wild_battle` and joins
`FORBIDDEN_REDUCERS` (`scripts/verify-release-reducers.mjs`, exact-pair test); reducers join
`client-callable-reducers.json` (argument names and types) and the `privacy_enforcement_tests.rs`
rosters; the disconnect resolver added to `resolve_all_live_interactions` uses index reads only.

- **BT8.1:** WHEN `deploy_units`, `submit_queue` or `cancel_queue` is called, THE reducer SHALL take
  identity only from `ctx.sender()`, re-validate ownership and legality against authoritative state
  through game-core (bt-3/bt-5), write tables, and on `Err` SHALL emit a structured fail-loud log;
  a native-host test SHALL call each with a non-owner, a fainted unit, an unaffordable plan and a
  stale cancel and assert refusal.

- **BT8.2:** WHEN `start_wild_tactical` runs, IT SHALL insert the anchor `battle` row (Ongoing),
  `battle_tactical`, `battle_secret` (seed, action_seq = 0), one `battle_wild_unit` per wild and the
  `battle_unit` rows from bt-4's encounter rules; a pack of 1 SHALL auto-deploy the remembered
  formation and start Active immediately, a pack ≥ 2 SHALL start Deploying with a 300 s deploy
  window; during the build phase IT SHALL be reachable only through the cfg-gated dev reducer
  `dev_start_tactical_wild` (invoked by tests and by e2e through `spacetime call`; the live
  encounter path flips in bt-16).

- **BT8.3:** WHEN a reducer resolves turns, IT SHALL run bt-3's chain inside the transaction and, on
  an `Advancing` marker, insert a zero-delay `tactical_advance_sched` row pinned by `(battle_id,
  round)`; every clock window SHALL arm one `tactical_deadline_sched` row pinned by `(battle_id,
  unit_id, window_seq)` and disarm it on an accepted submit; a stale fire SHALL be a no-op; every
  scheduled reducer SHALL refuse any sender but the database identity.

- **BT8.4:** WHILE a tactical row exists (Deploying included), `is_in_ongoing_battle` SHALL hold
  for its participants — the trade (ADR-0112), care/train (ADR-0136), movement and evolution guards
  each refuse (one test per caller) — and a Deploying window expiry SHALL close the battle as `Fled`
  with no HP write, releasing the interlock.

- **BT8.5:** WHEN a participant's last connection drops, THE disconnect path SHALL auto-flee an
  Active wild battle, persist the damaged HP of every deployed unit (ADR-0138) and discard READY
  rows unexecuted, and SHALL close a Deploying battle as `Fled` persisting nothing; with the 300 s
  deploy window, the 300 s inactivity window and the round cap 30 this makes every wild phase
  time-bounded and closes R-rb-73-WILD-HOLD (rb-104).

- **BT8.6:** WHEN a battle finishes, THE reducer SHALL write the outcome on the anchor `battle` row
  and persist damaged HP through the existing write-back primitive (`write_back_party_hp`), and
  `battle_gc` SHALL delete the battle's event, unit, queue, clock, secret and wild-unit rows 24 h
  after finish while `battle_summary` survives.

- **BT8.7:** WHEN the §2.2 worst-case round (6 units, 8×8, Diamond(2) AoEs, 3-action plans, AI
  plans for every wild) runs as one transaction in a native-host test, IT SHALL complete within the
  chain bound (≤ 18 resolved actions + one upkeep) and its duration on the pinned host SHALL be
  recorded in this slice's build note; if the host's reducer limit is exceeded, THE fallback is
  one unit-turn per transaction (design §12-F(g)) recorded as a build-note decision.

**Build note (bt-8, 2026-11-01, measured):** (1) **`mod tactics;` sits between `schema` and `taming`**, not
"between taming and trading": rustfmt's `reorder_modules` sorts the declarations and the census
`EXPECTED_MODULES` pins declaration order. (2) **`dev_start_tactical_wild(player: Identity, pack: Option<u8>)`**
takes the subject and a forced pack: `spacetime call` runs as the publisher, never the browser identity, so the
e2e seeding bt-12 describes needs a third-party start; allowed for the caller itself or the module owner; the
caller is gated by `require_not_deleting`, the subject by `require_subject_not_deleting` inside
`start_wild_tactical`; `Some(n)` must be `1..=3` and `≤` the conscious party (reject). (3) **The battle seed is
`splitmix64(encounter_seed ^ BATTLE_SEED_SALT)`**, never the encounter seed: `resolve::draw` and
`encounter::wild_seed` are the same mixer, so roll `i` would equal wild `i`'s individuality seed. (4) **Per-wild
species/level come from ONE `resolve_encounter` call** over the zone table with `encounter_rate` made total (the
grass trigger already happened upstream) with the roll seed `splitmix64(wild_seed(seed, i) ^ SPAWN_ROLL_SALT) >> 32`
— `resolve_encounter` and `roll_individuality` share one splitmix32 mixer, so rolling from the individuality seed
itself would tie a wild's level band to its IVs (verifier F6); `individuality_seed = wild_seed(seed, i)` for rolled and
forced packs alike. (5) **`Item` and `Recruit` entries are refused at submit** (`"submit_queue: items and recruit are not
available until bt-9"`) and in `Hooks::validate_delegated` (`NotAllowed`): design §8.3 names no game-core home
for item range / Ally filter / cure match (R-bt-8-ITEMRULE → bt-9) and the recruit glue is BT9.2; the reward
ledger and `battle_summary` are bt-9's. (6) **A wild `deploy_units` never writes a `battle_deploy` staging row**
(it materialises directly; staging is PvP's secret deploy, bt-14), so the e2e's `battle_deploy` vacuity row is
permanent. (7) **The Deploying window rides `tactical_deadline_sched` as `(battle_id, unit_id 0, window_seq 0)`**
— frozen once shipped; a deadline row is armed at the clock's own `deadline_ms` (`t0 + pad + budget`) and a
premature fire re-arms there; an advance row is armed only when a step ends in `Advancing` AND moved the
boundary (a pre-queue or cancel during `Advancing` arms nothing). (8) **`battle_gc` also deletes
`battle_tactical` when the anchor row is already gone** (the legacy prior-terminal sweep deletes terminal
anchors; R-bt-8-TACTICALSWEEP → bt-9); otherwise the BT8.6 roster holds (`battle_tactical`, `battle_summary`,
the anchor survive). (9) **The anchor mirrors the units' HP on every write**, so a legacy `flee` on a tactical
anchor persists the current tactical HP (no disconnect-to-heal) — the legacy 1v1 reducers still accept a
tactical anchor until bt-16 (R-bt-8-LEGACYREDUCERS). (10) **BT8.7 measured the SHIPPED worst case**: the
largest AoE in content is Diamond radius 1 (skill 6; a Diamond(2) kit does not exist and the kit join refuses an
unknown skill) — 3 player units with the Heavy-6 kits vs a forced pack of 3 on an 8×8 map, every player unit
pre-queued with a 3-entry plan, one `tactical_advance` transaction: `TurnEnded == 6`, executed + moved ==
authored entries, ≤ 18 resolved actions, one `RoundEnded`; **0.029 s** on the pinned host under
`cargo nextest` (native, warm content cache — NOT the wasm reducer limit, which no local gate measures). The
chain rule stands; the §12-F(g) one-unit-turn fallback was not needed. (11) **The account-e2e `(until bt-8)`
vacuity rows were re-tagged `(until bt-16)`, not retired**: the e2e module is built without `dev_reducers`, so no
reducer can seed a tactical battle there (an owner-run `spacetime call dev_start_tactical_wild <A>` would, but only
on a dev build sequenced into the exact-order S9 roster); the three schedule tables join the allowlist (cap 10 → 13;
`tactical_advance_sched` is permanently unobservable — zero-delay) — R-bt-8-E2EVACUITY → bt-16. (12) **Measured
census constraints for bt-9/bt-14** (`privacy_enforcement_tests.rs`): the gate must be spelled
`crate::guards::require_*` at depth 0 in the reducer body (a gate inside a helper reads as UNGATED), `use … as`
rename bindings are refused, and an impl-block fn whose signature names `ReducerContext` is refused (a `Hooks`
impl may hold `ctx` in a struct field but must be built by a free fn). (13) Content for the shell is the
game-core embedded registry parsed once per process (`validate_tactics_content`, `TypeChart::new(load_type_chart())`,
`load_encounters`); native tests seed no `species_row` / `skill_row` / `type_relation_row`.

### bt-9 — server `tactics_settle.rs`: rewards funnel, `battle_summary`, recruit/flee execution glue, the R-21r-a trio, H1/H2 continuity
category: gameplay + data-integrity (settlement) · severity: HIGH · size: MODERATE
touches: server-module/src/lib.rs, server-module/src/tactics_settle.rs, server-module/src/tactics_settle_tests.rs, server-module/src/tactics.rs, server-module/src/privacy_enforcement_tests.rs, server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/taming.rs, ARCHITECTURE.md
after: [bt-8]
Design: §5 (recruit at execution), §7 (payout condition), §8.1 (`battle_summary`), §11 T7/T8
server halves. Runs beside the client chain (file-disjoint). Measured: the faint trust penalty
and the prior-terminal sweep live only inside `battle::write_back_battle_results` — this slice
extracts them into `pub(crate)` helpers (extract-only; the `battle_core_tests.rs` text pins on
`write_back_party_hp` keep holding; `battle.rs` does not grow); the recruit seed rebuild
(`build_monster(seed, species, level)` + `monster`/`monster_pub` inserts) is exposed from
`taming.rs` as a `pub(crate)` primitive; `check_headroom` is NOT called by today's
`attempt_recruit` and is added here for the tactical path; the H1/H2 proxies
(`scripts/playtest-report.mjs`) read `playtest_event` kind-1 rows written by
`playtest::record_recruit_event` — continuity means the tactical recruit path keeps writing them
with the same fields; the script itself is unchanged.

- **BT9.1:** WHEN a battle reaches any terminal path (win, loss, Flee, auto-flee, disconnect), THE
  ledger SHALL be paid once through the existing write-back funnel to the conscious deployed
  monsters, `Awards` events SHALL name every per-monster line, and a recruit success SHALL pay
  nothing.

- **BT9.2:** WHEN a Recruit entry executes, THE server SHALL run `check_headroom` at submit and
  again at execution, SHALL load and validate the bait's content row BEFORE debiting inventory
  (R-21r-a-CONTENTLOAD), SHALL debit and roll in the same transaction, and on success SHALL rebuild
  the wild from `battle_wild_unit.individuality_seed` at full HP with exact genes and no XP through
  the taming primitive.

- **BT9.3:** WHEN a recruit succeeds with fainted party members, THE server SHALL apply the
  wild-battle faint trust penalty exactly as every other terminal path (R-21r-a-FAINTPENALTY).

- **BT9.4:** WHEN any terminal path runs, recruit success included, THE server SHALL sweep the
  player's prior terminal battle rows exactly once (R-21r-a-TERMINALSWEEP).

- **BT9.5:** WHEN a battle finishes, ONE `battle_summary` row SHALL record kind, outcome, rounds,
  wall_ms, idle_ms per player, the windows-per-unit-turn histogram, autopasses, pre-queued vs live
  unit-turns, halted plans, recruit attempts/successes, weaken_first, items used, damage totals,
  hits/misses and single-hit super-effective KOs after round 1 (the §12-F trigger inputs).

- **BT9.6:** WHEN a wild is defeated, THE essence-from-defeat primitive (`essence_battle_reward`) and
  the currency faucet (`battle_currency_reward`) SHALL be paid from the ledger at battle end (call
  sites moved into KO settlement, amounts unchanged).

- **BT9.7:** WHEN a tactical recruit attempt resolves, THE server SHALL write a `playtest_event`
  kind-1 row with the same `hp_permille`, `bait_item_id` and `success` semantics as today's
  `record_recruit_event`, so the H1/H2 proxies keep reporting across the cutover.

**Build note (bt-9, 2026-11-01, measured):** (1) **Nothing in game-core calls
`rewards::on_unit_defeated`** (`rewards.rs` says "the shell calls it after the KO sweep"); the shell sees the
board only between transactions, so the ledger is a FOLD of the persisted transcript at finish
(`tactics_settle::ledger_of`): each `Ko` is credited to the attacker of the LAST opposite-side hit on the victim
(any `hit`, a status-only one included; a never-hit victim earns nobody anything) against the board as it stood
at that moment — the final board with the units not yet fallen restored (`board_at`), exact while consciousness
is monotone (no heal/revive item) and `sweep_kos` emits KOs in `(side, slot)` order; `rewards::pay` then pays only
the units conscious at the end, on every terminal path alike. The fold and the attribution are the shell's —
residual R-bt-9-LEDGERHOME (→ the game-core slice that also takes R-bt-8-ITEMRULE). (2) **Payout runs through the
1v1 funnel's own per-monster credit** (`battle::credit_monster`, extracted) over the WHOLE conscious party,
benched members included: the ledger supplies the XP/essence shares ("conscious deployed" in BT9.1 is the
ledger's rule) and the carried win-only credits (daily trust-favorable, Quality Time, the evolution check) keep
the legacy party scope — but need a wild actually DEFEATED: a recruit-only win pays none of them (BT9.1 "a
recruit success SHALL pay nothing"; a KO-then-recruit win does). (3) **`Awards` lines** are appended after
`BattleEnd` with the final round: one per credited monster in ascending unit order (`essence` summed over pools),
plus ONE line with `unit 0` (`CURRENCY_AWARD_UNIT`; unit ids are `auto_inc` from 1) carrying the player's
currency; the amounts are the ledger's (pre-cap: a pool at `ESSENCE_SOFT_CAP` or a wallet at `MAX_BALANCE` keeps
less). bt-12 renders them as-is and never recomputes a killer or a split in TS. (4) **No monster-storage
headroom rule exists**: the only `check_headroom` is the trade item/currency headroom; recruits go to the box
(uncapped, as the 1v1 path), so `Hooks::recruit_headroom` stays "the unit has an owner" — BT9.2's
`check_headroom` clause names a rule that does not exist (R-bt-9-RECRUITHEADROOM, spec-owner decision).
(5) **Close kinds**: `finish` takes `Close::{Settled, Deploying, LegacyEnded, Fallback}` and is idempotent against
the STORED row; `Settled` pays + penalises iff the HP write-back succeeded, `Deploying` neither, `LegacyEnded`
neither (that reducer's funnel ran), `Fallback` penalises only; every kind sweeps the player's prior terminal
anchors (`sweep_prior_terminals(keep = the finishing battle)` — the anchor is already terminal in the store when
the tactical finish sweeps, the 1v1 callers' is not) and takes each swept anchor's tactical rows with it
(R-bt-8-TACTICALSWEEP, both funnels). (6) **`battle_summary` is one row per battle, inserted at the Active start**
(`outcome == Ongoing` marks an unfinished one), accumulated by every `store` step (`step_delta`: live turn =
the waiting unit's, bucket = windows opened; pre-queued = any other player `TurnEnded`; a `BattleEnd` that cuts
the waiting turn counts it; `halted_plans` = pre-queued player halts; hits/misses from `TargetHit`s of both
sides; `se_kos_after_r1` = both sides, round > 1, SuperEffective, target at full HP at step start with no
earlier damage that step) and finalised at finish (a Deploying close gets its zero row then; a swept
legacy-ended battle is finalised with `wall_ms 0`); `weaken_first` is the battle's FIRST attempt below 500 ‰
(`WEAKEN_FIRST_PERMILLE`, the script's default). Residual R-bt-9-SUMMARYDENOM → bt-14 (the §12-F(c) denominator
column, a TTL, the `Ongoing` leftovers). (7) **Recruit glue**: the bait's content row (`recruit_bonus > 0`),
the wild's `battle_wild_unit` seed row, its content species and `Level::new` are all resolved in
`validate_delegated` — BEFORE the executor's `take_item` — so a miss halts the entry (`ItemNotHeld` /
`TargetGone`) with nothing debited and no draw (R-21r-a-CONTENTLOAD at the tactical site); the roll is
`recruit::resolve_recruit` (private stream); the H1/H2 `playtest_event` row carries the PRE-roll `hp_permille`;
a success rebuilds through `taming::insert_recruited` (the 1v1 primitive, now shared). `Item` entries stay
refused at submit and at pop (R-bt-8-ITEMRULE: no game-core home; game-core is outside this slice's touches —
re-target ask, together with R-bt-4-GATEPREDICATES which needs `queue.rs`). (8) **The 1v1 reducers
`submit_attack`, `swap_active`, `use_battle_item`, `flee` and `attempt_recruit` refuse a tactical anchor**
(`battle::reject_if_tactical_anchor`, after the owner check): one anchor, one payout path — this delivers
R-bt-8-LEGACYREDUCERS (→ bt-16) two slices early. (9) The faint penalty helper (`apply_faint_penalties`) and the
credit helper refuse a monster whose owner changed (the write-back's abort contract at every site). (10) The
PvP opponent-arm sweep now takes a third party's terminal PvP battle's tactical rows too (pre-existing anchor
deletion; relevant once bt-14 ships tactical PvP). (11) Legacy test fixtures that run the 1v1 funnel past a
prior terminal anchor must register the tactical tables' indexes (`bn_register_tactical_tables`).

### bt-10 — client: tactical board, HUD keep-signals, overlays, turn-order bar, event ticker, presentation constitution
category: ux (battle presentation; items -121/-122/-126…-131) · severity: HIGH · size: HEAVY
touches: client/src/tactics/strings.ts, client/src/tactics/boardModel.ts, client/src/tactics/boardModel.test.ts, client/src/tactics/boardRender.ts, client/src/tactics/boardRender.test.ts, client/src/tactics/hud.ts, client/src/tactics/hud.test.ts, client/src/tactics/turnBar.ts, client/src/tactics/turnBar.test.ts, client/src/tactics/ticker.ts, client/src/tactics/ticker.test.ts, client/src/tactics/presentation.ts, client/src/tactics/presentation.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/battleScreen.boot.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.claimCode.test.ts, client/src/main.pvpPending.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/styles.css
after: [bt-8]
Split seam: board + HUD ‖ overlays + turn bar + ticker. Design: §9.1 (layout, info boxes, turn-order bar, overlays), §9.4 (presentation caps, skip,
reduced-motion). Measured: the battle screen is DOM (`BattleView` appends to `#app`; Pixi renders
the world beneath) — the tactical renderer `client/src/tactics/tacticsBattle.ts` mounts inside the
existing `battleView` frame identity (same `mr-shell--battle` root classes and `battle-title`
anchor, z-index 110) so no `OverlayId` is minted; `screens/battleScreen.ts` returns `unhandled`
for X/Y/LB/RB today and is extended (its key table is pinned by `battleScreen.test.ts`); every
text sink goes through `tactics/strings.ts` (the one resolver importer — PARITY-02 roster +1; the
tree-wide I18N-17 sink scan and the no-HTML-sink scan apply automatically); new keys touch
`messageIds.ts`, both catalogs (`@desc` each) and `catalog.test.ts` (`EXPECTED_PLAIN`/
`SAMPLE_PARAMS` + the six 365 pins); main tests that mock `./ui/battleView` get a sibling stub for
the tactical module where it is constructed; reduced-motion arrives through `ScreenContext.reduceMotion`
(`motionPreference.ts`), the biome `no-waapi` plugin bans `.animate`; species sprites are the
existing `monster-<slug>.png` 96×128 sheets (frame 0 via CSS background crop, no loader) and the
background is CSS-authored.

- **BT10.1:** WHEN a tactical battle is on screen, THE field (top ~70 %) SHALL render the grid with
  species sprites at their tile positions over ONE shared background and a health bar over each
  unit, and THE command dock SHALL be a visually separated bottom band (border + darker value).

- **BT10.2:** WHEN units are shown, THE per-side info boxes SHALL carry name / level / HP / type one
  compact row per unit, THE hovered or targeted unit's box SHALL expand with status icons, Guard
  shield, First-Stand pip, role chip and stance icon, and THE active unit's box SHALL show 6 AP pips
  with drafted spend blinking.

- **BT10.3:** WHEN a round is in progress, THE turn-order bar SHALL show the frozen order with the
  current unit highlighted, acted units dimmed, KO'd chips dropped and the next round ghosted, a lock
  on OWN READY chips and never on opponent chips, the round counter, "Surge in N" from PvP round 7
  and "Retreat at 30" from wild round 25, and SHALL never recentre on selection.

- **BT10.4:** WHEN the player aims, THE overlays SHALL show 1-stride reach (blue), 2-stride reach
  (light blue), the selected skill's range (red), the AoE ghost including the caster's own tile when
  hit (yellow), the danger union of every enemy's next-turn attackable tiles (purple hatched, X
  toggles), wild intent chips, and shield pips on enemy-adjacent tiles — all computed by the wasm
  geometry/movement/AI exports, with no TypeScript re-implementation of a rule.

- **BT10.5:** WHEN events arrive, THE ticker SHALL render every `battle_event` as an i18n line
  (waste with the reason, miss, auto-pass, StoodGround, Surge, status tick, award) and playback SHALL
  respect the caps 400 ms per action, 100 ms per tile (max 400), 1 000 ms per upkeep batch, 2 000 ms
  battle start, 3 000 ms results, with a B tap during playback skipping it, no turn banner for READY
  or AI turns, and reduced-motion replacing every slide/flash with an instant state change plus the
  ticker line.

- **BT10.6:** WHEN the board is navigated, THE tile cursor SHALL remember its position per unit, and
  every new element SHALL be D-pad-reachable with every string from the typed catalog (en+fr).

**Build note (bt-10, 2026-11-01, measured):** (1) **BT10.4 DEFERred → bt-11**: `client-wasm/src/lib.rs`
exports only `tactics_golden`, so "computed by the wasm exports" cannot hold yet; bt-10 ships the overlay
LAYER (`tactics/boardModel.ts` `OverlaySets` port → fixed layer order, reach1 over reach2, de-duplicated
danger union behind `TacticsBattle.toggleDanger()`, AoE on the caster tile, intent chips, shield pips) and
bt-11 must build `OverlaySets` from `tactics_targets`/`tactics_path`/`tactics_ai_plan` and re-close the
clause (R-bt-10-OVERLAYWASM). (2) **No key-table change**: `ui/screens/index.test.ts:3648-3650` (+`:3732`)
pins X/Y/LB/RB `unhandled` at a bare battle base and is outside the touches, so `battleScreen.ts` is
unchanged; the shell exposes `toggleDanger()` / `cycleUnit(±1)` and BT11.6 binds them — bt-11's touches
must add `index.test.ts` (R-bt-10-INDEXTESTPIN). (3) **No main.ts wiring**: `TacticsBattle` is a
constructed shell nobody constructs until BT12.1; it reuses the `battleView` overlay id, so bt-12 must keep
it and the legacy `BattleView` mutually exclusive (R-bt-10-OVERLAYIDREUSE). (4) **Caps mirror the Rust
SSOT** `game-core/src/tactics/events.rs` `presentation_cap_ms`: zero-cap events (Missed, Ko, Status, Awards,
…) JOIN the preceding beat (RoundEnded is the upkeep batch header), so Σ beat ms = the server pad;
`presentation.test.ts` parses events.rs to pin parity. (5) The server emits standalone `Missed`/`Ko`
events, so the Executed ticker line carries hits only. (6) The ticker is a visible, focusable list — no
live region (A11Y-05b); AT announcement is bt-12's (R-bt-10-TICKERANNOUNCE). (7) +60 `tactics.*` keys
(365 → 425); `tactics/strings.ts` joins the PARITY-02 roster; `tactics/strings.test.ts` (sibling) adds the
tactics-local hard-coded-string / sink / live-region scans the tree-wide I18N-17 roster does not cover.

### bt-11 — client: hierarchical command menu, live draft, queue strip + badges, forecast panel, provisional board, wasm exports
category: ux + netcode-determinism (forecast parity) · severity: HIGH · size: HEAVY
touches: client/src/tactics/commandModel.ts, client/src/tactics/commandModel.test.ts, client/src/tactics/draft.ts, client/src/tactics/draft.test.ts, client/src/tactics/queueStrip.ts, client/src/tactics/queueStrip.test.ts, client/src/tactics/forecast.ts, client/src/tactics/forecast.test.ts, client/src/tactics/provisionalBoard.ts, client/src/tactics/provisionalBoard.test.ts, client/src/tactics/wasm.ts, client/src/tactics/wasm.test.ts, client/src/tactics/forecast.parity.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client-wasm/src/lib.rs, client-wasm/src/tactics_tests.rs, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/battleScreen.boot.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.help.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/styles.css, client/src/tactics/strings.ts, client/src/tactics/strings.test.ts, client/src/ui/screens/index.test.ts
after: [bt-10]
Split seam: menu + live draft ‖ queue strip + forecast + provisional board. Design: §9.2 (controller map), §9.3 (flows, forecast tiers, provisional board), §2.3 (DRAFT →
READY), §4.2 (intent chips). Delivers item -133's floating-menu intent natively. Measured: reducer
calls go through `dispatch(command)` → `sendGuarded(() => conn.live().reducers.x({...}))` (dotted,
never bracketed — E1-MAIN-04), so `submitQueue`/`cancelQueue` are new `Command` arms with
`COMMAND_BATTLE_POLICY` rows and `contextStack.test.ts` literal updates (12/25/37); the battle
hint-bar chips `[A, Start, Select]` are pinned (`hintBarModel.test.ts`, `main.help.test.ts`) and
grow X/LB/RB; new wasm exports (`tactics_targets`, `tactics_path`, `tactics_forecast`,
`tactics_recruit_odds`, `tactics_ai_plan`) are reached through `client/src/tactics/wasm.ts` at call
time, so the 38 `client_wasm.js` mocks need no new names (the harness factory is declared in case
main.ts imports one); no hold edge exists in the router, so cancel-and-clear is a confirmed menu row.

- **BT11.1:** WHEN A is pressed on an own unit, THE command menu SHALL open Move ▸ / Skills ▸ / Item
  ▸ / Recruit ▸ (bait sub-list) / Flee / End Turn|Guard, SHALL grey illegal options with a one-line
  reason ("Needs all 6 AP — start your turn adjacent", "Out of range", "Party full"), SHALL omit
  Recruit and Flee in PvP, and THE Start label SHALL read "Guard" when the Guard conditions hold and
  "End Turn" otherwise.

- **BT11.2:** WHEN the player acts live, THE turn SHALL be a client-local DRAFT (Move picks a tile
  in a band and shows a ghost; B pops the last chip for free, in PvE and PvP alike) and committing
  an irreversible action (attack, item, recruit, flee or End) SHALL submit the draft through
  `submit_queue`; UNDO and CANCEL SHALL never be offered together.

- **BT11.3:** WHEN LB/RB cycles to an own unit at any time, THE pre-queue SHALL use the same menu and
  cursor, append chips with AP pips (tax on the current board) and ✓ / ~ / ✗ badges re-evaluated on
  every subscription update, badge an over-planned consumable `~ only N held`, submit on Start
  (strip locks), clear through a confirmed "Clear plan" menu row that calls `cancel_queue`, and SHALL
  show "Too late — already acting" on `AlreadyActing`.

- **BT11.4:** WHEN the player aims, THE forecast panel SHALL show hit % (carried accuracy), damage
  min–max (variance 85 and 100) with line items (type ×2/×½, STAB, flank ×5/4, target Guard ×3/4),
  a skull only when the minimum roll kills, a hollow skull when only the maximum kills, a
  First-Stand marker ("survives at 1 HP"), status chance, and the recruit % with its summing line
  items and a live bait selector — every number computed by the wasm rules, never TypeScript
  arithmetic.

- **BT11.5:** WHEN plans exist, THE provisional board SHALL apply this player's own READY and DRAFT
  plans to the live board in initiative order, apply each wild's `ai::plan` in PvE and freeze
  enemies in PvP ("assumes enemies hold"), and render provisional numbers in the Projected style
  (dashed border, `~` prefix, the i18n label, the assumption line) with `—` for hidden-state
  dependencies and solid numbers on a live turn.

- **BT11.6:** WHEN input arrives, THE controller map SHALL be D-pad cursor/menu, A select/confirm,
  B back/undo (and skip during playback), X danger toggle, LB/RB cycle own units, Start End
  Turn/Guard (live) or Submit (pre-queue), Select battle log/help — keyboard and pointer mirror it
  and the pointer is never the only path.

- **BT11.7:** WHEN the forecast, highlights and intent chips are computed, THEY SHALL call the wasm
  exports of bt-1/bt-4 and a vitest SHALL assert the forecast output equals the golden fixture.

**Build note (bt-11, increment A, 2026-11-01, measured — PARKED on hidden dependencies):** (1) **Two
hidden dependencies outside the touches block BT11.1–BT11.6.** Every string-bearing criterion
(BT11.1–BT11.5) needs `client/src/tactics/strings.ts` + `strings.test.ts` (bt-10 made it the ONE
tactics resolver importer; `ui/i18n/catalogParity.test.ts` PARITY-02 pins the exact importer roster and
PARITY-04 DEAD-KEY forbids a catalog key with no literal requester; `strings.test.ts` pins exactly 60
`tactics.*` keys and bans text sinks in any other tactics module), so no in-touches module can add a
string. BT11.6 needs `ui/screens/index.test.ts` (R-bt-10-INDEXTESTPIN; X/Y/LB/RB pinned `unhandled` at
a bare battle base) and a tactical/legacy discriminator for the hint chips that only bt-12's store
ingest provides. The continuation needs those three files added to `touches:` (bt-12 has the same
`strings.ts` gap for BT12.6). (2) **Increment A ships the rules port** (BT11.7 + bt-10's deferred
BT10.4): 13 `client-wasm` exports (`tactics_map`, `tactics_fresh_budget`, `tactics_unit`,
`tactics_targets`, `tactics_path`, `tactics_disengage`, `tactics_flank`, `tactics_forecast`,
`tactics_recruit_odds`, `tactics_ai_plan`, `tactics_is_exhausted`, `tactics_plan`, `tactics_overlays`),
the typed port `client/src/tactics/wasm.ts` (`bindTacticsRules(pkg)` by dependency injection — main.ts
hands in the pkg namespace it already imports, so the `client_wasm.js` test mocks need no new names;
`overlaySets()` feeds bt-10's `OverlaySets`; `unitRowOf()` maps the `my_battle_units` row), and the pure
`forecast.ts` view-model. (3) **No new golden kind** (game-core is outside the touches): forecast parity
is proven against the fixture's existing `Pipeline` cases (variance 85 = min, 100 = max) plus a seeded
fast-check differential against `tactics_golden`; every other export is compared with `tactics_golden`
on the same scenarios. (4) **Rule-home facts:** reach bands call the real execution gate
(`queue::validate_at_pop` with an inert `Hooks`); range/aoe/danger use a probe-unit sweep over
`geometry::target_set` (a conscious opposing probe on each empty tile; the aim is the standing tile for
a Caster-origin skill) so Caster-origin Bursts and empty area tiles need no shape logic in the shell;
the only restated predicates are STAB (`combat/damage.rs:69`) and the status preconditions
(`resolve.rs:675`), both differentially tested (R-bt-11-RULEHOME asks game-core for helpers). (5) The
client composes `TacticalState` field by field from `battle_unit` rows (never `TacticalState::new`,
which refuses fainted units), joined by a copy of the server's `unit_of_row` (R-bt-11-SHAREDJOIN).
(6) `tactics_overlays` on an 8×8 3v3 board measures 1.2 ms per call. (7) Design flags for the
continuation: the probe id `u32::MAX` is reserved; a status is shown as null when the minimum roll
already KOs; `tactics_disengage` takes an optional start tile for chained Moves; the overlay query
should omit `aim` for the stable sets so an aim change does not recompute danger/intents.

**Build note (bt-11, increment B, 2026-11-01, measured):** (1) **Shipped:** the hierarchical command
menu (`tactics/commandModel.ts`, codes only; every row predicate is a `TacticsRules` call), the
client-local draft (`tactics/draft.ts`: push/pop, `costEntries` with the disengage tax judged at each
Move's CHAINED start tile, the ONE `applyPlan` walk, the binding-shaped `toWire`), the pre-queue
(same menu, `rules.freshBudget()` basis, Submit row + Start, a confirmed Clear plan row →
`cancel_queue`, the "Too late — already acting" notice on `AlreadyActing`), the controller map
(`battleScreen.ts`: X → danger, LB/RB → cycle, Start → start; `battleButton(…, tactical)` leaves Start
to the adapter; `hintBar(…, battle)` grows B undo/back, X, LB, RB, Start end turn/guard/submit), the
Command arms `submitQueue`/`cancelQueue` (policy safe; `contextStack.test.ts` literals 14/25/39),
one more wasm export `tactics_recruit_targets(board, unit, budget)` (the Recruit targets = the
execution gate's own Recruit chain per candidate, headroom answered true; the party-full predicate is
the VM's `partyFull`), `ForecastOut.type_factor` (the chart multiplier over 10, reduced), 28
`tactics.*` + 7 `chrome.chip.*` keys (catalog 425 → 460). (2) **Hidden dependency (recorded, not
widened):** `client/src/input/router.ts:255` swallows X before any screen adapter is asked, so the X →
danger binding is unreachable from a key until `router.ts` + `router.test.ts` route X to `ctx.screen`
at a nav screen (R-bt-11-ROUTERX → bt-12 or a widened bt-11); the dock's Danger button is the working
pointer twin meanwhile. (3) **Deviations:** the Item row is greyed "Not available yet" (the server
refuses Item entries in P1, R-bt-11-ITEMROW); LB/RB cycle own units in EVERY mode (§9.2's "any time"
wins over §9.3's "LB/RB cycle targets in aim"; the D-pad cycles targets); the type line will print
the wasm-exported factor (×2 / ×1/2) rather than a catalog literal; a status is listed without a
percent (P1 `applies_status` has no chance). (4) **Not wired in main.ts (BT12.1):** `TacticsBattle`
is still not constructed — a hidden second `battle-title` root under `#app` would collide with the e2e
and main.*.test.ts `querySelector` chains — so main.ts gains only the two dispatch arms; bt-12 passes
`battleButton`'s `tactical` flag and the hint's `battle` arg from the live shell. (5) **Increment C
DEFERred to the same slice id** on the budget warn flag: BT11.3's pips/badges/`only N held`
(`tactics/queueStrip.ts`), BT11.4 (the forecast panel over `forecastVM`), BT11.5
(`tactics/provisionalBoard.ts` + the Projected style). The plan's REV 4 §R4.5/§R4.6/§R4.8 + REV 5
A31–A33/A38 are the continuation's contract; the shell already computes a per-unit cost board and a
`Planning` frame the panel and the projection plug into. (6) Residuals registered: R-bt-11-ROUTERX
(MED → bt-12), R-bt-11-ITEMROW (LOW), R-bt-11-PRACTICEKIND (LOW → bt-12), R-bt-11-PARTYFULL (LOW →
bt-12). (7) **One more pin file the measured touches missed:** `client/src/ui/i18n/resolver.test.ts`
snapshots the exact table of every plain `chrome.*` value (25 → 32 with the seven `chrome.chip.*` hint
verbs), so it reds on any new `chrome.*` key — edited as a named intentional change and declared under
the PR's `touches-delta:`; bt-12/bt-15 (more hint verbs) should list it in `touches:`.

**Build note (bt-11, increment C, 2026-11-01, measured):** (1) **Shipped (BT11.3 / BT11.4 / BT11.5
closed):** the strip model `tactics/queueStrip.ts` (`stripVM`: a chip's cost is the rules' plan of the
steps up to it on the CURRENT board, tax included; ✓ firm / ~ provisional / ✗ stale judged step by step
on the board the unit will ACT on, and once stale every later chip is stale; `~ only N held` from the bait
counts over every own unit's plan), the forecast panel (`forecastVM` over `tactics_forecast` /
`tactics_recruit_odds`: hit %, min–max, the type factor the wasm now exports, STAB, flank, Guard, the
full / hollow skull, First Stand, the status, the recruit % with its four line items as the rules give
them and the live bait selector), the projection `tactics/provisionalBoard.ts` (`project`: own plans in
initiative order, each wild's `ai::plan` in PvE asked of the board as it stands at its turn, enemies
frozen in PvP, a KO'd unit acts no more, an asleep wild skips) and the Projected style (a dashed wrapper
with the i18n label, a tilde node before every number, "if X is still at C4" in A1 notation, "assumes
enemies hold" in PvP, `—` for a PvP enemy that acts first). `draft.ts` exports `applyAction`, the ONE step
`applyPlan`, the strip and the projection all fold. 26 `tactics.*` keys (catalog 460 → 486). (2) **Board
policy, decided in review:** a chip's LEGALITY is judged on the projection up to the unit's turn (the same
board the menu offered the aim on), its COST on the live board; the danger overlay and the intent chips are
computed on the live board with every own plan applied and every enemy HELD — the literal "full projection"
reading of the plan (wilds already moved) produced the turn-after-next, so a wild's chip is its plan given
this player's plans and danger is where enemies can strike on their upcoming turn; the planning unit keeps
its LIVE row on its aim board (an enemy plan that would KO it must not grey its menu). (3) **Three increment-B
defects found by the reviews and fixed here:** the in-flight submit key never re-armed after "Clear plan" or
when a READY row landed, so a re-plan in the same turn was silently swallowed (game-core replaces a unit's
plan on resubmit) — it now re-arms on both; every input op is atomic (a rules throw while entering an aim
restores the pre-op state, the frame stays byte-identical); and `applyPlan` judged flank on the board the
earlier hits of an AoE had already changed, where game-core judges it on the pre-attack board for every
target (resolve.rs) — fixed in `applyAction`, covered by game-core's own pin; a client-side draft test
with an AoE that KOs a flanker mid-hit-set is left to the tester (disclosed). (4) **Disclosed, not fixed:** the strip
empties between a pre-queue Start and the READY row's arrival; the `—` line has no accessible name beyond
the dash; the ✓ / ~ / ✗ and skull glyphs are CSS `::before` (no runner proves they draw); the forecast is not
announced to assistive technology while aiming (R-bt-11-FORECASTANNOUNCE, LOW → bt-12). (5) **Process:**
the plan (REV 6) was reviewed by reviewer + red-team (seven MAJORs folded in as REV 6.1/6.2 before the
tester); `/tmp/mr_warn_bt-11` rose after green, so the implementation got ONE combined review lens
(correctness + rule-home: one MAJOR — the flank board — and five MINORs, all applied except an optional
overlay-reuse perf item) instead of the four-lens fan-out and no separate verifier — the full `just ci`
and `mr-gates check` ran. `docs/DECISIONS.md` (outside the touches) still says intent chips are computed
"on the shared provisional board"; under (2) that board is the live rows with own plans applied and the
enemies held — a one-clause correction for the supervisor or bt-12. `TacticsBattle` is still not constructed by main.ts (BT12.1); R-bt-11-ROUTERX
stays with bt-12.

### bt-12 — client: subscriptions + store ingest, deploy confirm + formation editor, results, screen wiring, wild e2e
category: ux + critical user flow · severity: HIGH · size: HEAVY
touches: client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/connection.runtime.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/tactics/deployPanel.ts, client/src/tactics/deployPanel.test.ts, client/src/tactics/results.ts, client/src/tactics/results.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.battle-reseed.test.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/tactics-wild.spec.ts, client/e2e/controls.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, client/src/styles.css, client/src/tactics/strings.ts, client/src/tactics/strings.test.ts, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, client-wasm/src/lib.rs, client-wasm/src/tactics_tests.rs, client/src/tactics/wasm.ts, client/src/tactics/wasm.test.ts, client/src/input/router.ts, client/src/input/router.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.help.test.ts
after: [bt-11]
Split seam: subscriptions + ingest + deploy ‖ results + wiring + e2e. Design: §3.3 (deployment UX, remembered formation), §9.3 (results), §8.1 (views), §11 T9/T10.
Measured: `connection.ts` holds one `subscribe([...])` list of 23 `SELECT * FROM` strings pinned at
exactly 23 by `connection.runtime.test.ts` (QF15-1); adding a view = the string + `onInsert`/
`onDelete → batcher.schedule()` + a `store.reconcile…FromView` rebuild for primary-key-less views
(the `my_battle` idiom; views never fire `onUpdate`); `rowConvert.ts` `HANDLED_ENUM_VARIANTS` is
pinned at exactly 10 keys and grows for `QueuedAction`/`TurnState`/`Phase`/event payloads; the
`__mrPvp` dev hook is fingerprinted by `scripts/verify-build-hooks.mjs` (`just client-verify-build`),
so the `__mrTactics` e2e hook joins it; e2e seeds through owner `spacetime sql` + `spacetime call
dev_start_tactical_wild` via `execSync` (dev reducers are not page-callable), closes its browsers
(`golden.spec` presence count) and avoids the QF8-3 retired-token list; `resetPredictionState`
(`main.battle-reseed.test.ts`) gains the tactical draft/cursor state.

- **BT12.1:** WHEN the client connects, IT SHALL subscribe to `my_tactical_battle`, `my_battle_units`,
  `my_battle_queue`, `my_battle_deploy`, `my_battle_clock`, `my_battle_events` and `my_formation`,
  ingest them into the store with exhaustive typed unions (`satisfies never`), and WHILE a
  `my_tactical_battle` row exists THE tactical renderer SHALL own the `battleView` frame (SCREEN_POLICY,
  B17 battle-never-hidden), with the 1v1 renderer otherwise until bt-17.

- **BT12.2:** WHEN a wild pack of 1 starts, NO deploy panel SHALL appear (the remembered formation
  auto-deployed server-side); WHEN a pack ≥ 2 starts, THE Deploying phase SHALL show the wild
  composition, A SHALL deploy the remembered formation, X SHALL open the editor (LB/RB cycles
  conscious party monsters, D-pad picks a slot, A assigns, Start confirms through `deploy_units`),
  fainted monsters SHALL never be listed, there SHALL be no back-out, and a "Still there?" countdown
  SHALL appear from 240 s into any PvE window.

- **BT12.3:** WHEN a deploy is confirmed, THE remembered formation (`my_formation`) SHALL update;
  it SHALL default to the first 3 conscious party members and auto-replace fainted or traded-away
  members by the next conscious member in party order.

- **BT12.4:** WHEN a battle ends, THE Finished phase SHALL list XP, essence and currency per
  monster, recruits, and the outcome, auto-advancing after 3 s and skippable.

- **BT12.5:** WHEN the wild flow is exercised end-to-end, ONE Playwright e2e SHALL drive the real UI
  by virtual buttons only: dev start → (pack ≥ 2) deploy confirm → move + attack with forecast →
  weaken → adjacent recruit success → results; and a second path SHALL flee and observe persisted
  damaged HP.

- **BT12.6:** WHEN the new panels mount, EVERY string SHALL come from the typed catalog (en+fr) and
  THE reachability sweep SHALL cover every new panel and row.

**Build note (bt-12, increment A, 2026-11-01, measured):** (1) **Split + DEFERs (3 of 6, the legal
maximum):** A meets BT12.3, BT12.4 and BT12.6 and ships the ingest / deploy / results halves of BT12.1 and
BT12.2; BT12.1 (the Active-phase owner), BT12.2 (three clauses) and BT12.5 (the wild e2e) are DEFERred to
the same slice id's continuation on FOUR hidden dependencies outside the touches, recorded as residuals:
R-bt-12-TACTICSEXPORTS (MED — `TacticsBattleVM.surgeStartRound` / `wildRoundCap` are game-core tuning and
`nextInitiative` is `initiative::order` + `priority_for_round`; no wasm export carries them, copying is banned,
so main.ts cannot build an honest Active-phase VM: client-wasm `lib.rs` + `tactics_tests.rs` + `tactics/wasm.ts`
+ `wasm.test.ts` need a `tactics_tuning()` (incl. `MAX_PACK`) and a next-round initiative export),
R-bt-12-WILDCOMPOSITION (HIGH — `start_wild_tactical` seats only wild 0 in the anchor's `side_b`, `battle_unit`
rows exist only after `materialize` and `battle_wild_unit` has no view, so the client cannot show the pack
during Deploying), R-bt-12-DEPLOYDEADLINE (MED — the Deploying deadline lives only in the private
`tactical_deadline_sched` row; the side-A clock starts with `window_open_ms` / `deadline_ms` None, so the
"Still there?" countdown has no client-visible source in Deploying) and R-bt-11-ROUTERX (X never reaches a
screen adapter at a non-world base: "X opens the editor" is reachable by the Edit formation row, D-pad + A and
the pointer twin until `router.ts` routes it). The supervisor is asked to widen the continuation's touches by
those files or re-home BT12.2's composition / countdown clauses to bt-14. (2) **Shipped:** the seven views
subscribed (`connection.ts`: 23 → 30 queries; `onInsert` / `onDelete` → the one batcher, no `onUpdate`, no
per-row write; seven reconciles each in its OWN try BEFORE `flushBatch()`, so a throwing converter is contained
to its view and `refreshBattle` reads the phase in the same batch), seven converters + `queuedActionToRule`
(the exact inverse of `draft.ts toWire`) with `HANDLED_ENUM_VARIANTS` 10 → 21 keys (an unknown payload-carrying
tag — `TurnState`, `QueuedAction`, `ActionTarget` — DROPS that one row with one `console.warn`, never a throw;
a malformed row still propagates to the per-view guard), seven authoritative store maps (`deepRowEq`, dirty
only on a real change; `my_formation` is an Option-view slot; `reset()` clears all seven; units carry the ONE
bt-11 `unitRowOf` join as `row`), `tactics/deployPanel.ts` (pure `resolveFormation` / `deployVM` / `picksOf`
+ the `DeployPanel` shell: confirm screen, editor, a TOKEN lock released on settle, hide() or a new battle,
pointer twins), `tactics/results.ts` (pure `resultsVM` folding `Awards` / `RecruitResult` over the RAW anchor's
side + the `ResultsPanel`, built once, compute-then-write), `battlePolicy.ts` (`battleRenderer`,
`hideOtherBattleViews`, `shouldAutoContinue`, `structurallyEqual`; `deployUnits: 'safe'`, 15/25/40), the
`deployUnits` Command arm, and the main.ts wiring: `refreshBattle` routes by phase (Deploying → the deploy panel,
Finished → the results panel, Active → the 1v1 view as on master until the continuation), the three
`battleView` table rows go through one set of battle-frame helpers, the panels are built LAZILY on the first
batch that routes to them (a second `battle-title` root under `#app` would collide with every legacy selector),
a renderer SWITCH under a frame over the battle base first pops to the base (the three roots share one overlay
a11y record), the results auto-advance runs from the frame pump on `outcomeShownAtMs` + `CAPS.resultsMs` once per
shown edge (a frame over the outcome pauses and restarts it), `battleButton`'s `tactical` flag and the hint
bar's `battle` arg are true only while the deploy EDITOR is open. 18 `tactics.*` keys (114 → 132; catalog 486 →
504; the results title reuses `battle.outcome.*`). (3) **Deviations, disclosed:** `resolveFormation` is a TS
mirror of `server-module/src/tactics.rs::resolve_formation` (server glue, not game-core; the server validates
every pick but not that A sent the resolved default, so the mirror IS the pack≥2 default rule until the export
lands — R-bt-8-FORMATIONRULE stays targeted, a `docs/DECISIONS.md` exception is requested of the supervisor);
at the CONFIRM screen Start opens the main menu (CTL6C.1) rather than sending — Escape is Start's key and the
spec binds Start only in the editor; currency is per PLAYER (one `+N gold` line summing every `Awards` line) since
the server writes 0 on every per-monster line; the editor's hint chips reuse the shell's (R-bt-12-DEPLOYHINT,
LOW); monsters in the player's open trade are still offered (R-bt-12-TRADEDEPLOY, LOW). (4) **Tests:** 45
BT12 tags over 10 files, 42 of the first 43 RED on the API freeze (the `deployUnits: 'safe'` row shipped with the freeze: the
total policy table is a typecheck error without it); named pin moves 23 → 30, 10 → 21, 14/25/39 → 15/25/40,
114 → 132, 486 → 504, and SO2-6-SHAPE drops its `battleView` value clause (a grandfathered source scan; the
runtime survivors are BOOT-FRAME-OWNER and BOOT-DEPLOY). The tester corrected ONE case from the code: Help cannot
open over the outcome frame (`battleView` is EXCLUSIVE_TOP in the overlay registry), so the covered-outcome
countdown case uses a server conversation. The implementation lens found two MAJORs, fixed and gated by two
round-3 tests watched RED on the pre-fix commit: a renderer switch under frames over the battle base popped
EVERY upper frame and would have ended a suspended server conversation (now `popPlayerFramesOverBattle`
keeps the dialogue frame), and the deploy cursor moved with no focus move (silent to assistive technology;
the listbox is focused on every cursor paint). Not taken: a `visibilitychange` re-stamp of the results
countdown (a tab hidden across the whole cap pops on return — R-bt-12-HIDDENTAB, LOW). (5) **Process:** plan reviewed by reviewer + red-team (5 + 5
MAJORs folded in as REV 2 / REV 2b before the tester); `/tmp/mr_warn_bt-12` rose after RED, so the
implementation got ONE combined lens and no separate verifier (the orchestrator ran the full `just ci`, the
test-diff audit and `mr-gates check`). X2 (the shipped golden e2e against a live local server) proves the seven
subscriptions apply for real: one bad entry would error the whole batch and hang every session.

**Build note (bt-12, increment B, 2026-11-05, measured; the continuation on the same slice id):** (1) **Met:**
BT12.1 (the tactical shell owns the Active frame), BT12.2 (the composition list, the deploy countdown, X
from a key, the deploy hint chips, the open-trade exclusion) and BT12.5 (the wild e2e), with BT12.3, BT12.4
and BT12.6 re-run green on the new HEAD; the eight residuals the increment A note named are resolved by this
PR (R-bt-12-TACTICSEXPORTS, -WILDCOMPOSITION, -DEPLOYDEADLINE, -DEPLOYHINT, -TRADEDEPLOY, R-bt-11-ROUTERX,
-PRACTICEKIND, -PARTYFULL). (2) **Shipped:** client-wasm `tactics_tuning()` (surge start, wild round cap,
`MAX_PACK`) and `tactics_next_initiative(board, thisRoundPriority)` (= `order(contenders,
priority_for_round(this, 2))`, EXPORT_NAMES 14 → 16); the server's `start_wild_tactical` seats EVERY wild in
the anchor's `side_b` (wild 0 the lead) and writes the Deploying deadline into the side-A clock at the
instant the deploy window row is armed (`deploy_deadline_ms` = game-core's `deploy_budget_ms(Wild)`; the
pack-1 path keeps `None`; `clock_of_row` never loads a deadline without an open window); the router sends X
to a nav-capable SCREEN (consumed whatever it answers; the world jump, the menu and a covered frame are
unchanged); `hintBar` deploy chips (`HintDeploy`: confirm = A Deploy / X Edit formation / Start menu /
Select help; edit = A Assign / B Back / LB RB / Start Submit / Select help, +5 `chrome.chip.*` keys);
`stillThereSeconds` (the last `STILL_THERE_LEAD_MS` = 60 s before the server's deadline, 1..60, pumped on
the WALL clock from the frame loop with one live-region announcement per deadline, Wild only); the deploy
panel's `tactics-deploy-wilds` list before the formation, its countdown node kept last across repaints and
its mode-aware `hint()`; `TacticsBattle.setCountdown` / `reset` / `release`; `shellKind` / `activeUnitOf` /
`statusTagOf`; main.ts `refreshTacticsShell` (a per-battle event watermark keyed by the bigint id, a first
sighting feeds the whole transcript while HIDDEN then shows, later batches show then feed; an identical
VM paints nothing; a render throw leaves the watermark unmoved; an ingest throw feeds event by event; a
visible shell whose batch fails to build keeps the frame), `tacticalOwnsStart` / `battleHint` /
`activeBattleView` over four views on the one overlay id, the `submitQueue` arm's rejection release, the
slot count `min(max_pack, spawn_a)`, the `__mrTactics` read-only DEV hook (fingerprinted, bare name
included), the wild e2e (`tactics-wild.spec.ts` + `controls.ts` helpers: virtual buttons only, owner SQL
seeding, forecast-gated attacks, bounded restarts; 2 tests, ~13 s). Catalog 504 → 511, `tactics.*` 132 →
134. (3) **A measured defect fixed outside the plan:** the bt-11 shell guarded `#send` once per turn KEY
and re-armed only on a READY row, but game-core executes a live plan at once and leaves the unit Waiting
with its remaining budget when the plan does not end the turn — so a live attack locked End Turn / Flee
for the rest of the turn (the e2e's unit sat Waiting at ap 2 until the window expired → AutoFlee). The
in-flight entry now snapshots the unit's own row budget at send and `#reconcile` re-arms when that budget
moves on the same key (`[BT12-5-SHELL-LIVE-REARM]`, tester round 3, RED on the old guard). (4)
**Deviations, disclosed:** the countdown lead is 60 s before the DEADLINE (the spec's "240 s into" holds
exactly for the 300 s window and tracks any other length); the BT12.5 pack ≥ 2 deploy confirm is the
SECOND battle's (the party at join is one monster; battle 1's recruit is moved into party slot 1 by owner
SQL — plan-b F2); the anchor's `side_b` now carries every wild's stats during Deploying, so a Deploying
close (Fled, nothing persisted) shows the pack's stats at no cost — the composition list itself shows
species and level only; `resolveFormation` stays a TS mirror (R-bt-8-FORMATIONRULE reads closed in the
residual sink but the copy remains — the supervisor should reconcile); `TacticsBattleVM.partyFull` is
honestly `false` (a tactical recruit lands in the box; the server never refuses one for a full party).
(5) **Tests:** 25 new tags + 2 client-wasm host tests + 5 server tests + 1 node:test case, all RED on the
API-freeze stubs (memory/projects/gates/bt-12.red-before-b.md) and GREEN after; named pin moves: catalog
504 → 511 (catalog.test.ts, resolver.test.ts — the pin file the bt-11 note foresaw, listed under
`touches-delta:`), 132 → 134, EXPORT_NAMES 14 → 16, the pack-2 clock pin `(0, None, Some(T0 +
pve_deploy_ms))`, FRAME-OWNER / PACK1-NO-PANEL read the shell at Active, router "D-pad and X never ask the
screen" drops X. The BT12.5 CHECK rebuilds the pkg and the dev-reducers module wasm, runs the spec with the
JSON reporter and pins both titles passed once (a `just ci` run rebuilds the module WITHOUT dev_reducers at
the same artifact path — the CHECK's own rebuild is what keeps it honest). (6) **Lenses:** reviewer,
red-team, reducer-security-auditor and desync-guard, 2 MAJOR + 6 MINOR + 4 MED fixed in-tree (the deploy
panel's repaint detached the adopted live region — every announcement silent while it showed — so it now
paints into an inner body and never rebuilds its root; the shell
countdown's positioning; per-event ingest fallback; the map cache; the e2e observer root and vacuous
oracle; `deploy_budget_ms` from game-core; `clock_of_row`), eight recorded as residuals (R-bt-12-SEEDENTROPY
MED → bt-16, -HALTEDPLAN MED → bt-14, -ADVANCINGACTIVE, -VMFIXTURES → bt-14, -DEPLOYCAP, -INITPARITY,
-SHELLKIND, -RESULTSDRAIN → backlog); `/tmp/mr_warn_bt-12` rose after the lenses, so no separate verifier
(the orchestrator ran `mr-gates check` with the full `just ci` as X1 and both browser gates). Follow-up
flags (outside the touches): the three-hook rosters at `justfile:72` (and its `scripts node suites` door
floor 18 → 19), `ARCHITECTURE.md:463`, `docs/runbooks/playtest-ops.md:73`, `client/src/net/buildInfo.ts:6`;
"the router still swallows X" at `client/src/ui/screens/battleScreen.ts:55-57`; the one-wild `side_b` comment
at `client/src/ui/battleModel.ts:274`; the clock-row doc at `server-module/src/schema.rs:1148` (a Deploying
row carries a deadline with no open window).

### bt-13 — pacing simulation gate + H1/H2 continuity proof (after bt-9, beside the client chain)
category: gameplay (pacing) + loop-ops (telemetry) · severity: MED · size: LIGHT
touches: game-core/tests/tactics_pacing.rs, server-module/src/tactics_settle_tests.rs, server-module/src/playtest_tests.rs
after: [bt-9]
Design: §10 (match-length budget), §5 (H1/H2 proxies), §12-F (overturn triggers), §11 T10.
Measured: `scripts/playtest-report.mjs` reads `playtest_event` kind 1 (`hp_permille`,
`bait_item_id`, `success`) — unchanged; the `just test` scripts node suite is pinned at exactly 3
test files, so no new script test is added.

- **BT13.1:** WHEN the §10 reference fights are simulated in game-core (wild 1v1 on 7×7, wild 1v1
  recruit path, wild 3v3 on 8×8; a scripted player policy vs the bt-4 AI; both STAB mixes), THE
  simulation test SHALL assert round counts at or under the design's pessimistic column plus one
  (≤ 7 / ≤ 8 / ≤ 7 rounds) and SHALL report unit-turn counts for the build note.

- **BT13.2:** WHEN a tactical recruit attempt (success and failure) runs on the native host, THE
  `playtest_event` kind-1 row SHALL carry `hp_permille`, `bait_item_id` and `success` exactly as the
  1v1 path writes them, so `scripts/playtest-report.mjs` computes weaken-first, recatch and success
  rates without modification.

**Build note (bt-13, 2026-11-01, measured):** (1) **Test-only slice** — `game-core/tests/tactics_pacing.rs`
(7 `_bt13_1` tests) + 8 `_bt13_2` tests appended to `server-module/src/tactics_settle_tests.rs`;
`playtest_tests.rs` untouched (the 2/3 → 666 floor pin already exists). (2) **Reference fight =
a controlled experiment**: species 10 (Umbrafang, Aggressive, Nimble, kit Toxic Sting Light r1–2 +
Fire Fang Heavy melee) on both sides at **L19, HP 57**, neutral genes; the ONLY overrides are unit and
skill `affinity`, chosen so every hit is neutral on the real chart; the wild side is no-STAB in both
mixes, the player side no-STAB / STAB on both skills. Player policy = `ai::plan(Aggressive)` (the bt-4
planner is side-agnostic) + a recruit override (adjacent wild < 250‰ → `Recruit{bait: Lure Berry 150‰}`;
Heavy → Light below 50% HP). Maps: id 1 (7×7, opposing spawns 4 apart) and id 4 (8×8 — closest
opposing spawns are **6**, not the design's 5). 32 seeds per cell; median = `sorted[N/2]`.
(3) **Measured (median / p90 / max rounds · median unit-turns · player wins of 32):**

| Cell | no-STAB | STAB | bound |
|---|---|---|---|
| wild 1v1 7×7 | 4 / 5 / 5 · 7 · 12 | 3 / 4 / 4 · 5 · 28 | ≤ 7 |
| wild 1v1 recruit 7×7 | 4 / 5 / 5 · 7 · 8 (16 attempts, 8 succeeded) | 4 / 4 / 5 · 7 · 25 (36 attempts, 25 succeeded) | ≤ 8 |
| wild 3v3 8×8 | 6 / 7 / 7 · 20 · 10 | 5 / 6 / 7 · 17 · 25 | ≤ 7 |

Wild fights run **~2 rounds shorter than design §10's ≈ 6 / ≈ 4** in the 1v1 cells (3v3 lands on the
design). Unit-turn medians (7 / 5 for 1v1, 20 / 17 for 3v3) sit under §10's 12 / 8 and 31 / 21, so the time
budgets carry margin. The symmetric no-STAB fight is a near coin-flip (12/32). (4) **The bound has slack:**
halving all damage moves the no-STAB medians to exactly the bound (1v1 7, 3v3 7). An exact per-cell
**golden snapshot** (Σ rounds, Σ unit-turns, wins, Σ final HP per side, recruit attempts/successes) is
the change detector. A rule or tuning change that moves pacing must re-record it with `--no-capture`
and update this note. Bite-proofs: 26 of 30 wrong-impl mutants RED. The survivors are Guard-ignored and
First-Stand-off (the reference fights never grant Guard or reach a one-hit KO; pinned by their own
suites), plus two server mutants unreachable in PvE. Record: `memory/projects/gates/bt-13.red-before.md`.
(5) **BT13.2:** the tactical row equals the SHIPPED 1v1 `attempt_recruit` row field for field
(identity, kind 1, species, hp_permille 666, bait 1|0, success), against literals, for success and
failure × bait / no bait. The 1v1 outcome is steered by a clock probe, the tactical one by `force_recruit`.
The test set also covers whole-table row counts (no duplicate, pre-queued pop writes one) and a
second-wild species. A bait-odds window test catches a server that rolls at no-bait odds while
recording the bait.

## Slices — P2 (PvP tactical, flip, purge)

### bt-14 — PvP server: challenge `format`, secret deploy by copy, PvP clock parameters, Surge, adjudication, `forfeit`, disconnect, settle mapping
category: gameplay + security-privacy (PvP) · severity: CRITICAL · size: HEAVY
touches: server-module/src/schema.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/accounts_tests.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, server-module/src/tactics_settle.rs, server-module/src/tactics_settle_tests.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs, server-module/src/native_host_tests.rs, client/src/module_bindings/, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, evals/baselines/client-callable-reducers.json, scripts/verify-release-reducers.mjs, scripts/verify-release-reducers.test.mjs, docs/DECISIONS.md
after: [bt-12, bt-13]
Structural — serial; split seam: format + deploy + clock ‖ forfeit + disconnect + settle. Design: §6.1–§6.4, §3.3 (PvP deploy), §7 (PvP rewards), §11 T11. Decision record: PvP secrecy by
structure and the no-draw adjudication tuple — covered by bt-7's entry; this slice amends it in
place if the shape changes. Measured: `battle_challenge` is PUBLIC with no defaulted column, so
`format: u8` is appended with `#[default(0)]` and derived at insert from
`challenger_party_ids.len().min(3)` (no `challenge_pvp` signature change — the client already
passes `partyIds`); the appended column breaks `privacy.rs` `json_battle_challenge` (full
destructure → export-or-omit decision: exported), the `privacy_tests.rs` challenge fixture, and
challenge literals in `accounts_tests.rs` and `pvp_tests.rs`; `settle_pvp_battle(ctx, battle)`
stays the single funnel (`ranking::apply_pvp_rating` unchanged); the dev reducer
`dev_start_tactical_pvp` joins `FORBIDDEN_REDUCERS`; `forfeit` joins `client-callable-reducers.json`.

- **BT14.1:** WHEN a challenge is issued, `battle_challenge.format: u8` (appended, 1..=3) SHALL be
  derived from the challenger's party pick (fixed at 3 for ranked; 1–3 for casual); accepting SHALL
  require at least 1 conscious monster, and each side SHALL deploy exactly `format` or all it has if
  fewer.

- **BT14.2:** WHEN `start_pvp_tactical` runs, IT SHALL open Deploying with owner-only `battle_deploy`
  staging rows and a 45 s deploy clock; WHEN both sides lock or the clock expires (auto-filling the
  remembered formation, else the first conscious monsters in slot order), ONE reducer SHALL copy
  both stagings into `battle_unit` rows and flip the phase to Active in a single transaction
  (reveal-by-copy); during the build phase IT SHALL be reachable only through the cfg-gated
  `dev_start_tactical_pvp` (the live challenge-accept path flips in bt-16).

- **BT14.3:** WHILE a PvP battle waits on a unit, THE clock SHALL run 30 000 ms windows that reset on
  every accepted submit (≤ 3 per unit-turn), expire to AutoPass without Guard, count strikes in
  `battle_clock` visible to both participants, and SHALL forfeit the player on the 4th auto-pass of
  the match (count never resets).

- **BT14.4:** WHEN a PvP battle is live, NO participant-visible row SHALL carry a ready flag,
  `battle_event` rows SHALL be emitted only at execution, and a two-identity native-host test SHALL
  prove the opponent never receives a `battle_queue`, `battle_deploy` or `battle_secret` row nor an
  unexecuted entry.

- **BT14.5:** WHEN a PvP battle ends, THE `forfeit` reducer (client-confirmed, not a queue entry, 0
  AP), the carried immediate `forfeit_on_disconnect` on the last session (READY rows deleted; a
  Deploying battle cancelled with no rating change), Surge from round 9 and the adjudication tuple
  SHALL all funnel through `settle_pvp_battle` as `SideAWins | SideBWins`, with the adjudication
  reason recorded in `battle_summary`.

- **BT14.6:** WHEN PvP settles, THE M17 rating machinery SHALL be unchanged, no XP and no currency
  SHALL be granted, essence per KO SHALL be paid symmetrically to both sides, practice (self vs self)
  SHALL use the PvP ruleset with no rating and no rewards, and Recruit and Flee SHALL be rejected at
  the submit gate.

**Build note (bt-14, 2026-11-06, measured):** (1) **Met:** BT14.1–BT14.6, 6/6 gates; 40 gating tests
(42 with `dev_reducers`) plus three updated existing tests, red on the API freeze (65bb5080), green at
cf0cd5c2; three bite-proof mutants (unchanged-row rewrite, the 1v1 write-back on a tactical anchor, a
forfeit mapped to the forfeiter) all killed. (2) **Shape:** `start_pvp_tactical(challenger, party_a, opponent,
party_b, format, seed)` opens Deploying with TWO `battle_clock` rows (both on the 45 s deadline), TWO owner-only
`battle_deploy` rows (empty, unlocked) and ONE deploy window row; `deploy_units` in a PvP battle stages the
sender's row — exactly `pvp_deploy_count(format, conscious of its OWN list)` picks, validated against its own list
only — and the SECOND lock copies both stagings into `battle_unit` rows and starts the battle in that one
transaction; the deploy expiry auto-fills every unlocked side (remembered formation, else slot order, capped at
the format) or cancels unrated (`Fled`) when a side has nothing to field; a premature deploy fire re-arms (PvP
ruleset only). `load`/`store` carry both clocks and **`store` writes only rows that changed** (an unchanged
`update` is a subscription event the opponent receives; the native host now counts write syscalls per table,
`Fixture::writes_to`, so the two-identity test pins ZERO participant-visible writes on a pre-queue, re-submit and
cancel). A PvP-ruleset `finish` commits through `pvp::settle_pvp_battle(ctx, battle, SideAWriteBack::HpOnly)`
(its only `apply_pvp_rating` caller; the 1v1 callers pass `Legacy1v1`; returns `Ok(both HP write-backs ok)` as the
settlement's `hp_ok`); `pay_ledger` pays both sides (essence only; Practice's ledger is empty). `forfeit`
reducer (Active only; Deploying is "battle is not active" — the 45 s window ends it; Practice forfeits side A);
`resolve_tactical_on_disconnect` forfeits PvP/Practice anchors in either role (Deploying cancels unrated) and
`forfeit_on_disconnect` skips tactical anchors; the legacy `submit_pvp_action` refuses a tactical anchor (the
plan lens's CRITICAL catch — a 1v1 pick would have settled the battle). **Practice = one party split into two
DISJOINT side lists** (`start_pvp_tactical` refuses an overlap; the dev reducer splits in slot order, A =
`ceil(n/2)`); `dev_start_tactical_pvp(challenger, opponent, format?)`: a non-owner may start only its own
Practice, the module owner pairs two players; it joins `FORBIDDEN_REDUCERS`. `battle_challenge.format` =
`min(pick, 3)` (the server has no ranked flag — "ranked fixed at 3" is the client's pick, bt-15) and is
exported by the privacy serializer. (3) **Residual folds:** R-bt-9-SUMMARYDENOM partially — `battle_summary`
gains `kos_after_r1` (both sides, rounds > 1) and `end_how: Option<EndHow>` (the adjudication reason,
`Forfeit`, …), and an anchor-less finish finalises its row `Fled`; the TTL half stays open. R-bt-3-ENDHOW
(`game-core/src/tactics/{outcome,queue}.rs`) and R-bt-12-HALTEDPLAN / -ADVANCINGACTIVE / -VMFIXTURES (client
files) are outside the touches → re-target asks in the handoff (the client three → bt-15). (4) **Lenses:**
planner, reviewer, red-team on the plan (REV 2: disjoint Practice lists, write-only-changed rows, dev-reducer
consent, funnel mode instead of a DB probe, `except` threaded into `materialize`); reviewer, red-team,
reducer-security-auditor, desync-guard on the artifact: HIGH staging-probe oracle (a foreign monster's refusal
text depended on the opponent's lock) fixed by reading only the side's own list + one tester probe test; the
guard order in `submit_pvp_action` (participation first); `fallback_close` sweeps unit rows of a Deploying
battle. New residuals: R-bt-14-ROSTERREVEAL (the `my_battle` anchor shows the opponent's roster from Deploying;
→ bt-17), R-bt-14-FORMATRULE (`pvp_deploy_count`/`challenge_format`/`PVP_FORMAT_MAX` belong in game-core + a
wasm export before bt-15's panel re-derives them; → bt-15, needs game-core/client-wasm touches),
R-bt-14-ESSENCECOLLUSION (feed-KO essence between cooperating accounts; → bt-16). (5) **Accepted / decided:** the
`QueueVoided` reveal and the late-submit-beats-the-fire ruling stand; `hp_ok` couples both sides' write-backs
(no rewards on a failed write-back, the wild rule carried). (6) **Docs:** "Tactical battle privacy is
structural" amended in place (reveal-by-copy, two clock rows, write-only-changed, the forfeit reducer, the
funnel mode, the accepted reveals) — now ~45 lines, past the 10–25 bar; a split is a doc-chore candidate.

### bt-15 — PvP client: party-size pick, secret deploy panel, clock ring + strike pips, forfeit confirm, Surge badge, results rating, two-context secrecy e2e
category: ux + security-privacy (client surface) · severity: HIGH · size: HEAVY
touches: client/src/tactics/deployPanel.ts, client/src/tactics/deployPanel.test.ts, client/src/tactics/clock.ts, client/src/tactics/clock.test.ts, client/src/tactics/results.ts, client/src/tactics/results.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/tactics/commandModel.ts, client/src/tactics/commandModel.test.ts, client/src/ui/actionSheetModel.ts, client/src/ui/actionSheetModel.test.ts, client/src/ui/screens/worldScreen.ts, client/src/ui/screens/worldScreen.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.pvpPending.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/tactics-pvp.spec.ts, client/e2e/controls.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, client/src/styles.css
after: [bt-14]
Split seam: pick + deploy + clock ‖ forfeit + results + e2e. Design: §6.2 (both clocks visible), §9.1 (clock ring, strikes), §9.3 (results), §11 T11 e2e.
Measured: challenges start from the world action sheet's `interact.confirm.challenge` Yes/No rows
dispatching `{kind: 'challenge'}` → `challengePvp({target, partyIds})`; the party-size pick trims
`partyIds` (no reducer signature change); `forfeit` is a new `Command` arm; the two-context idiom
is two `chromium.launch()` browsers (`pvp-full`/`trade-full`), driven through the `__mrPvp` hook
re-declared in the spec file; there is no 60 s-deadline or forfeit UI today.

- **BT15.1:** WHEN a casual challenge is composed, THE confirm flow SHALL let the challenger pick
  1–3 party monsters (ranked always 3), and THE Deploying panel in PvP mode SHALL require exactly
  `format` conscious picks, lock on confirm and show the 45 s deploy countdown.

- **BT15.2:** WHILE a PvP battle waits on a unit, A radial clock ring on that unit's portrait SHALL be
  visible to both players, refill on every accepted submit, turn amber at 10 s and red at 5 s, and
  strike pips (0–4) SHALL sit by each player's name.

- **BT15.3:** WHEN the player opens Forfeit, A confirm row SHALL precede the `forfeit` call; the
  turn-order bar SHALL show "Surge in N" from round 7; and THE Finished phase SHALL show the rating
  change and the adjudication reason when one applied.

- **BT15.4:** WHEN two browser contexts play a PvP battle, THE e2e SHALL assert the opponent context
  never receives a queue, deploy or secret row and never sees a pre-commit indicator, that four AFK
  auto-passes forfeit, and that closing the opponent's last connection forfeits immediately.

- **BT15.5:** WHEN the PvP panels mount, EVERY string SHALL come from the typed catalog (en+fr) and
  every element SHALL be D-pad-reachable.

**Build note (bt-15 increment A, 2026-11-06, measured):** (1) **Met:** BT15.1, BT15.4, BT15.5 (for the shipped
surfaces); BT15.2 and BT15.3 DEFERred to a bt-15 continuation on a HIDDEN DEPENDENCY: the declared `touches:`
omit `client/src/tactics/strings.ts` (+ `strings.test.ts`) — the ONE resolver importer for the tactics panels
(BT10-6-SCAN-LIVE; the exact `tactics.*` roster; `menuRowLabel`'s exhaustive switch) — so no new panel string, no
forfeit row and no results line can land without it; the pick needed `client/src/ui/screens/index.ts` (the
`WorldPort` seam: an optional `challengeSizes?()` member) and the honest lock needed `client/src/net/store.ts`
(a `battleDeploys` getter), both shipped under `touches-delta:`; the continuation's touches should add
strings.ts, strings.test.ts, hintBarModel.ts/resolver.test.ts (if new hint verbs), turnBar.ts/hud.ts (the ring on
the chip; player names for the strike pips), wasm.ts (R-bt-12-ADVANCINGACTIVE) and, for R-bt-14-FORMATRULE,
game-core/client-wasm/server. (2) **Shape:** the Challenge confirm is the party-size pick — rows `N vs N` for
N in `[min(3, eligible)…1]` (eligible = party-slotted ∧ conscious ∧ untraded, slot order; the largest first =
the default) then No; the chosen size is re-validated against the LIVE sizes at A; a confirmed pick leaves as a
sized `challenge` Command and the dispatch sends the first N eligible ids read at send time (nothing when fewer
are eligible). The PvP deploy panel is a `pvp` `DeployInput` variant with NO roster field (the anchor's side B is
the opponent's party), `pvpDeployCount(format, conscious)` slots (a disclosed TS mirror under
R-bt-14-FORMATRULE), Deploy / Confirm disabled while a slot is empty, every row disabled once the server's own
`battle_deploy.locked` row arrives (never a promise latch: `sendGuarded` resolves on a refusal), and the 45 s
deploy countdown through `countdownDeadline` (Wild always; Pvp / Practice while the panel shows; interim
"Still there?" wording, not announced). (3) **Secrecy e2e** `client/e2e/tactics-pvp.spec.ts` (two browsers,
`dev_start_tactical_pvp` as the owner): the pick's `format`, B's SDK cache holding only its own unlocked deploy
row and zero queue rows (a row-callback probe counts zero deliveries) while A is locked / pre-queued, no roster
list, A's nickname never in B's page, B's turn bar byte-identical across A's pre-queue, both lock BEFORE Active
and ≥ 5 s before the deadline, four AFK auto-passes forfeit (exactly 4 `AutoPass` on B's unit, 0 strikes on A),
the server refuses `battle_deploy` / `battle_queue` / `battle_secret` subscriptions (`my_battle_deploy` as the
control), and closing B's browser forfeits within 20 s with 0 `AutoPass`. GREEN 4/4 locally; remote CI's e2e job
re-runs it. (4) **Interpretations:** no ranked / casual toggle exists client-side ("ranked always 3" is the
default row, not an enforced state); until bt-16 flips accept, a picked challenge opens a LEGACY 1v1 battle with
N vs the accepter's full party (the spec orders the pick before the flip); the pick chooses HOW MANY, not WHICH;
`consciousPartyIds`' `hp > 0` is a disclosed CLIENT rule narrower than `challenge_pvp`'s acceptance set.
(5) **Lenses:** planner, reviewer, red-team (plan); reviewer, red-team, desync-guard (artifact — HIGH fixed: Practice
staged side B from side A's list); reducer-security-auditor not run (no server change). New residuals
R-bt-15-FALLTHROUGH (→ bt-17), R-bt-15-PRACTICESTAGE (→ bt-16). The three R-bt-12 residuals re-targeted to
bt-15 by bt-14 read `closed` in the sink although unfixed.

**Build note (bt-15 increment B, 2026-11-06, measured):** (1) **Met:** BT15.2 and BT15.3 (the two gates DEFERred by
increment A), 9 + 10 tagged vitest tests red on f40af724 (the missing `tactics/clock.ts`, `setClock`/`onForfeit`,
the `forfeit` row, `ResultsVM.rating`/`endHow`, `ratingChange`, 13 `tactics.*` keys), green at ddd1214c; the two-browser
e2e grows to 5 (T2 gains the ring / strip / strike-pip oracles with the turn-bar byte-identity compare normalised on a
ring-stripped clone; T5 `BT15-3-E2E-FORFEIT` drives the menu row → the confirm (opens on "Keep fighting") → Yes →
Finished with the forfeit reason and a rating line on both pages). (2) **Shape:** `tactics/clock.ts` — pure `clockVM`
(the ring is the WAITING unit's side's clock row with an OPEN window: `fraction = (deadline − now)/(deadline − open)`
rounded to 2 decimals, so "refill on every accepted submit" is the server re-opening the window, no client rule; amber
≤ 10 s / red ≤ 5 s are display thresholds; one strike row per clock row, side A then B, `autopassCount` clamped to
`STRIKES_MAX`) + DOM `renderClock` (one `span.tactics-clock-ring[role=img][data-band][data-fraction]` on the chip,
`--clock-fraction` for the conic gradient; a `div.tactics-players` strip under the bar with `span.tactics-strikes`
of 4 pips); `TacticsBattle.setClock` memoises the VM (an equal VM writes nothing) and `#reapplyClock` re-paints the
ring after every turn-bar render only onto the chip that is still CURRENT; main.ts's `pumpClock` runs on the wall
clock beside `pumpStillThere`, keyed on `turnState.kind === 'Waiting'` (never the Advancing gap). Forfeit: a pvp-only
LAST root row (`MenuRowId 'forfeit'`, never greyed) → the `forfeit` menu level (`forfeitYes` / `forfeitNo`, cursor
on No) → `deps.onForfeit` → Command `{kind:'forfeit'}` (battle-safe) → `reducers.forfeit({battleId})`. Results:
`endHow` from the LAST `BattleEnd` event (the four Adjudicated* + Forfeit print a line; SideEmpty / FixedOrder /
RoundCap / Fled / AutoFlee none) leads the list; the rating line closes it — `ratingChange()` (ui/battlePolicy.ts) is
non-null only for kind Pvp + a decisive outcome + the baseline this client took at the battle's first non-Finished
sighting (`before: null` = no profile row yet, the server creates it lazily at the first settle → "Rating N"); the
result is frozen at the first Finished build. The Surge badge was already shipped (bt-10); a shell wiring test pins it
under BT15-3. (3) **Disclosed:** `STRIKES_MAX = 4` mirrors `TacticsTuning.autopass_forfeit` (client-wasm's
`TacticsTuningOut` does not export it; R-bt-15-STRIKESMAX → backlog, LOW); `Date.now()` vs server epoch deadlines is
unsynced (the BT12.2 countdown's precedent; R-bt-15-CLOCKSKEW → backlog, LOW); the ring sits on the turn-bar CHIP (the
bar is the portrait strip); Practice shows one name on both strip rows; a reload after the finish shows no rating line;
a second Yes on a finished battle is a reported refusal (no latch); the forfeit row needs an own conscious unit's menu
(live or pre-queue). (4) **Lenses:** reviewer + red-team on the plan (REV 3 → §8 fold: the lazily-created profile row,
unrated `Fled` ends, the frozen after, the STRIKES_MAX disclosure, the Waiting gate); reviewer + red-team + desync-guard
(PASS) on the artifact: 22 hand-applied mutants, 17 killed by the tester's suite, 1 survivor (a baseline taken at a
first-seen-Finished battle) closed by a tester-added boot case, 4 equivalent; reducer-security-auditor not run (no
server change). R-bt-14-FORMATRULE stays out of scope by the brief (game-core / client-wasm) and reads `closed` by
#661 in the sink although unfixed — a bookkeeping ask, as do the three R-bt-12 rows closed by #660.

### bt-16 — cutover flip: encounter + challenge-accept paths start tactical battles; dev start reducers deleted; every 1v1 e2e migrated
category: gameplay (hard replacement — D583.3, step 1) · severity: CRITICAL · size: HEAVY
touches: server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs, scripts/verify-release-reducers.mjs, scripts/verify-release-reducers.test.mjs, evals/account-e2e.eval.mjs, client/e2e/encounter-battle.spec.ts, client/e2e/battle-dpad.spec.ts, client/e2e/recruit.spec.ts, client/e2e/my-battle-privacy.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/pvp-full.spec.ts, client/e2e/ranked-forfeit.spec.ts, client/e2e/monster-privacy.spec.ts, client/e2e/trade-interlock.spec.ts, client/e2e/tactics-wild.spec.ts, client/e2e/tactics-pvp.spec.ts, client/e2e/controls.ts, client/src/main.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, ARCHITECTURE.md, docs/DECISIONS.md
after: [bt-15]
Split seam: server flip ‖ e2e migration — both must land before bt-17. Design: §11 T12, §12 risk 2. Decision record: the strangler cutover (dev-gated start → live
paths) and "1v1 tables are retired in place, never dropped" — `docs/DECISIONS.md` entry (bt-17
amends in place). Measured: the grass path is `movement_tick` → `begin_encounter` (battle.rs) at
`movement.rs` ≈466 and the PvP path is `accept_challenge` → `start_pvp_battle` (pvp.rs); after
the flip the 1v1 reducers are unreachable from any live path but still compiled, so the client
keeps typechecking and bt-17 can delete both sides consistently; the 1v1 e2e specs lose their
`battle-command-*`/`Submit:`/`outcome-text` selectors and migrate to the tactical flows here
(never deleted for convenience); `movement_tests.rs` and the `account-e2e` S9-wild-live scenario
pin the `battle_wild` writer and are retargeted; the `__mrPvp` hook is re-fingerprinted.

- **BT16.1:** WHEN a wild encounter triggers on the live movement path, IT SHALL start a tactical
  battle (`start_wild_tactical`), WHEN a challenge is accepted IT SHALL start a tactical PvP battle
  (`start_pvp_tactical`), and THE dev-gated `dev_start_tactical_*` reducers SHALL be deleted (the
  `FORBIDDEN_REDUCERS` pair test updated).

- **BT16.2:** WHEN a 1v1 e2e is migrated, ITS flow SHALL be re-proven through the tactical UI by
  virtual buttons (encounter → battle, recruit, battle D-pad, battle privacy, PvP side B, PvP full,
  ranked forfeit, monster privacy's PvP leg, trade interlock) with the surviving check named per
  retired check — no spec is deleted for convenience.

- **BT16.3:** WHEN the flip lands, `just e2e` SHALL be green with every battle flow tactical, the
  `account-e2e` live scenario SHALL observe a tactical wild anchor row through `my_battle`, and no
  1v1 battle SHALL be startable from any live path.

**Build note (bt-16, 2026-11-06, measured):** (1) **Shape:** `movement_tick`'s trigger roll (`resolve_encounter` on the zone's
`encounter` row — rate + bands unchanged) now calls `tactics::start_wild_tactical(ctx, player, encounter_seed, battle_seed, None)` with
two separate `ctx.random()` draws (the secret roll stream no longer derives from the recoverable encounter seed — folds
R-bt-8/R-bt-12-SEEDENTROPY); a late refusal inside the pack-1 auto-deploy undoes the writer's own inserts (`undo_wild_start`) because
the tick swallows the `Err`. `accept_challenge` guard 6 is `tactics::start_pvp_tactical(.., challenge.format, seed)` — format 0 (a
pre-bt-14 row) is refused, the 60 s `pvp_deadline_schedule` is never armed, and a challenger-side deletion gate is reported as
"challenge is no longer available" (the acceptor already passed its own gate; the bare reason would disclose a third party's state).
The two `dev_start_tactical_*` reducers are deleted; `FORBIDDEN_REDUCERS` is exactly `start_wild_battle` + `grant_bait`. (2) **Kept
compiled, disclosed:** `pvp::start_pvp_battle` / `build_pvp_team` behind `cfg_attr(not(test), allow(dead_code))` because
`trading_tests.rs:2790` (outside the touches) calls the former as its escrow-matrix accept site; `battle::begin_encounter` is dead in
the default build (a `cargo build` warning only — `just lint` runs `--all-features`, where `start_wild_battle` keeps it live).
(3) **HIDDEN DEPENDENCY (recorded, not widened):** `battle.rs:58 start_battle` is client-callable and still opens a 1v1 self-battle by
raw reducer call, so BT16.3's "no 1v1 battle startable from any live path" holds for the two player-reachable paths only →
R-bt-16-STARTBATTLE (bt-17 / a 6-line reject). (4) **E2E:** every 1v1 spec migrated by virtual buttons through shared `controls.ts`
helpers (`awaitTacticalActive`, `fightToOutcome`, `attackByButtons`, `recruitByButtons`, `fleeByButtons`, `acceptChallengeByButtons`,
`startPvpByButtons`); retired checks name their survivors in the specs. Two contract changes surfaced: Start over the tactical shell is
End Turn (`tacticalOwnsStart`), so the ctl-6c "Start opens the menu over a battle" round trips (encounter-battle E0, battle-dpad 3x)
open the menu by its accelerator; the anchor's HP mirror covers only units with a `monster_id`, so an "anchor row changed mid-battle"
oracle must take a hit on an own monster (my-battle-privacy (v)); Skittish wilds kite, so adjacency steps re-hunt with a bound
(battle-dpad 2-A). `account-e2e`: battle1 deploys both sides by SDK before D disconnects (a Deploying cancel is unrated — no `profile`
row), the S9 wild anchor is checked through `my_tactical_battle` (`kind: Wild`), the hand seeds of `battle_secret` / `battle_wild_unit`
are gone (organic), the vacuity allowlist drops the five now-organic tactical tables and gains `battle_wild` (cap 13 → 9). The CI e2e
job's `dev_reducers` build step is inert (nothing calls a dev reducer). (5) **Re-target asks:** R-bt-14-ESSENCECOLLUSION is LIVE from
this flip (tactics_settle.rs, outside the touches); R-bt-15-PRACTICESTAGE is moot (no Practice entry point remains).

### bt-17 — cutover purge: 1v1 reducers, screens, models and the 60 s reaper deleted; old tables retired in place; combined end-to-end proof
category: gameplay (hard replacement — D583.3, step 2) · severity: CRITICAL · size: HEAVY
touches: server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/taming.rs, server-module/src/taming_tests.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs, server-module/src/monster_mgmt_tests.rs, game-core/src/combat/status_tests.rs, evals/baselines/client-callable-reducers.json, client/src/module_bindings/, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/battleScreen.boot.test.ts, client/src/ui/i18n/hardcodedStrings.ts, client/src/ui/i18n/hardcodedStrings.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.claimCode.test.ts, client/src/main.pvpPending.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.battleRewards.test.ts, client/src/main.accel.test.ts, client/src/main.controls.test.ts, client/src/main.input.test.ts, client/src/ui/boxView.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/reachability.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/e2e/a11y.spec.ts, client/vite.config.ts, client/src/styles.css, ARCHITECTURE.md, docs/DECISIONS.md, server-module/src/trading_tests.rs, server-module/src/guards.rs, server-module/src/guards_tests.rs, server-module/src/movement_tests.rs, server-module/src/tactics_tests.rs, server-module/src/tactics_settle_tests.rs, game-core/src/combat/battle_0hp_tests.rs, game-core/src/combat/types.rs
after: [bt-16]
Structural — serial; split seam: CLIENT purge first, then server purge + bindings. Design: §11 T12. Measured: the client purge goes FIRST (the 1v1 `dispatch` arms and `BattleView`
stop referencing `submitAttack`/`swapActive`/`flee`/`attemptRecruit`/`useBattleItem`/
`submitPvpAction`), then the server deletes those reducers and regenerates bindings — the other
order fails typecheck between steps; `battleView.ts` deletion drops it from `hardcodedStrings.ts`
`SCAN_TARGETS` (19 targets / 18 `ui/*View.ts` pins) and lowers the tree sink count below
`SINK_FLOOR = 235`, so the floor is re-measured; the 35 `battle.*` keys become DEAD-KEYs (PARITY-04)
and leave with the 365 pins; `status_tests.rs` text-pins `use_battle_item` in `battle.rs` and is
retargeted; `pvp_deadline_schedule` and its reducer stay (scheduled-ness is fixed at first
publish) but are never armed; `battle_action`/`battle_wild`/`BattleAction`/`PvpAction` stay in the
schema and bindings (client-surface check C) with no writer; `reachability.test.ts` QF8-2-BATTLE
and the a11y CTL7B root fixture migrate to the tactical renderer; `vite.config.ts` drops the
stale coverage exclusion.

- **BT17.1:** WHEN the purge lands, THE 1v1 reducers (`submit_attack`, `swap_active`, `flee`,
  `use_battle_item`, `attempt_recruit`, `submit_pvp_action`, `start_battle`, `begin_encounter`,
  `start_wild_battle`), the 60 s secret-pick deadline arming and the 1v1 client renderer/model/screen
  adapter SHALL be deleted; `battle_action` and `battle_wild` SHALL be retired from use (no new rows
  written) while every table, column, type and scheduled reducer stays in place, unreordered and
  undropped.

- **BT17.2:** WHEN a 1v1 unit test or fixture is removed, ITS behavior SHALL be re-proven by a named
  tactical test (surviving check cited by path and name) — no check is deleted for convenience, and
  every protected-category deletion is adjudicated by someone other than the deleter.

- **BT17.3:** WHEN the purge branch is verified, THE full `just ci` SHALL be green, `bindings-drift`
  SHALL be 0, the schema snapshot SHALL show the retired tables intact, `just e2e` SHALL be green
  including the tactical wild and PvP flows, and THE combined BT1–BT7 criteria SHALL be proven
  end-to-end on master before the strict §10 playtest gate (D583.5) is raised.

**Build note (bt-17 increment A, 2026-11-07, measured):** (1) **Sizing:** the reducer FUNCTIONS cannot be deleted inside the
touches — `trading_tests.rs:2782-2794,2966-2969` (the escrow matrix asserts the EXACT escrow error on its `start_battle` rows, so a
reject is out too), `guards_tests.rs:1714`, `tactics_tests.rs:3230-3259,3333,6057` and `tactics_settle_tests.rs:4118` call them
directly; recorded as a hidden dependency before the build. Increment A therefore DE-ATTRIBUTES the seven client-callable 1v1
reducers (`#[spacetimedb::reducer]` dropped; `pub(crate)` bodies kept behind `cfg_attr(not(test), allow(dead_code))` — an allowed
item seeds liveness for its callees, so `clippy --all-features --all-targets -D warnings` stays clean with no helper edits), deletes
the dev-only `start_wild_battle`, regenerates the bindings (−7 reducer files; `index.ts` + `types/reducers.ts` rewritten — `spacetime
generate` asks before deleting stale files, pass `-y`) and trims `client-callable-reducers.json` −7; R-bt-16-STARTBATTLE closes here.
Increment B (continuation, touches widened with the four test files) deletes the bodies + `begin_encounter`, retargets the matrices
(R-bt-16-TRADINGMATRIX), `status_tests.rs:5618`, R-bt-2-m14-restated, R-bt-14-ROSTERREVEAL and resolves any still-Ongoing 1v1 anchor
(R-bt-17-LEGACYANCHORS: a pre-publish SQL check is owed first). BT17.1 is DEFERred to that continuation with the honest state. (2)
**Client:** `ui/battleView.ts` deleted; `ui/battleModel.ts` is slim (`isPvpBattle`, `BaitItem`, `buildBaitItems`,
`decideBattleOverlay` + types, `CursorDir` — four out-of-touches importers keep it alive); `ui/screens/battleScreen.ts` STAYS (it is
the battle-base adapter the tactical shell and the deploy panel implement — the spec's "screen adapter deleted" predates bt-10's
one-frame elaboration); the seven 1v1 `Command` kinds and policy rows are gone; `battleRenderer(undefined)` → `'none'` and
`renderableBattle` (anchor + tactical row) is shared by `reconcileStack` and `refreshBattle`: a row-less Ongoing anchor builds
nothing (a shown owner stays, the stack keeps the battle base, Start opens the menu), a row-less TERMINAL anchor is dismissed in the
same batch (R-bt-15-FALLTHROUGH closed); the qf-17 payout machinery and the PvP pending state leave main.ts (the results panel shows
XP/essence/gold; `ownMonsterName` falls back on an EMPTY species name too); 31 of the 35 `battle.*` keys were dead (`battle.title`
and `battle.outcome.*` survive, read by the tactical views) — 525 → 494, not 511 → 480 as sketched; `SCAN_TARGETS` 19 → 18 and
`SINK_FLOOR` RE-MEASURED UP (277 sinks: the tactical views added more than the deleted view carried) and pinned at 275. (3) **Hidden
dependencies, client (two test files + one found at green):** `catalogShape.test.ts:526` (roster entry → `ui/pvpView.ts`),
`store.test.ts:4542-4615` (two downstream-tooth tests deleted; survivors `T-OWNP-SWAP`/`T-OWNP-OUTCOME` + a new accepter boot case),
`overlayRegistry.test.ts` (the manifest `*View.ts` census: `battleView` is an id with no file — exempted BY NAME, membership-guarded);
`client/src/styles.test.ts` is NEW (the two stylesheet-wide CTL7B guards moved there verbatim from battleView.test.ts). (4)
**Deletions:** the ledger `memory/projects/monster-realm-bt-17-deletions.md` names a survivor by title or "subject deleted" for every
`it`; the verifier measured two over-claims (the results panel's name fallback — closed by a tester round-3 test red on the mutant;
the tactical HP fill's inline-transition guard — R-bt-17-HPFILLINLINE, its test belongs outside the touches); residual
R-bt-17-HPCUE (no non-colour HP cue on the tactical bar). (5) **a11y e2e:** the four eager roots are three (the tactical roots are
lazy); the CTL7B battle fixture mounts the deploy and results panels; at 640×360 the nine-row results panel FITS, so the non-vacuity
short viewport is 640×240. (6) **Lenses:** reviewer + red-team on the plan (REV 3; a compile probe of the de-attribution settled the
dead-code question); reviewer, verifier (FAIL → fixed → the two survivors added/recorded), reducer-security-auditor (PASS; M1 =
R-bt-17-LEGACYANCHORS, M2 = the re-wiring window the continuation's body deletion closes) on the artifact; desync-guard not run (no
game-core or rules change); artifact red-team not run (the warn flag rose mid-slice; the plan red-team's 14 attacks were folded). (7) **Gates:** BT17.2 met (1138/1138 over the 25 survivor files), BT17.3 met on the FOURTH verbatim
`just e2e` run (130 passed + the pre-existing recruit R4 fixme skipped) — runs 1–3 were each red on one pre-existing flake class in a
spec this slice does not touch (movement-input's "recenter within 12 steps"; the 16-own-turn fight stall on battle-dpad B and
encounter-battle E2, traces under R-bt-17-FIGHTSTALL); `mr-gates lint` BLOCKs a second DEFER (67% > the 50% cap), so a flaky CHECK
has to be re-run, never deferred, once BT17.1 is deferred. PR mdrewt/monster-realm#671.

**Continuation touches (2026-11-07, supervisor, measured):** increment B widened by the hidden dependencies increment A recorded plus a fresh `begin_encounter` reference census — `trading_tests.rs`, `guards.rs` + `guards_tests.rs` (the `rb76_..._begin_encounter_..._contained_crate_wide` containment pin), `movement_tests.rs`, `tactics_tests.rs`, `tactics_settle_tests.rs`, `game-core/src/combat/{battle_0hp_tests,types}.rs`.

**Build note (bt-17 increment B, 2026-11-07, measured):** (1) **Purge:** the Rust bodies of the seven de-attributed 1v1 reducers,
`begin_encounter`, the 60 s secret-pick deadline arming (`pvp::schedule_deadline` ← `resolve_pvp_turn_if_ready`), `build_pvp_team`,
`start_pvp_battle`, `battle::reject_if_tactical_anchor`, `guards::require_pvp_participant`, `PVP_TURN_DEADLINE_MS` and
`content_cache::cached_type_chart` are deleted; the reducer set is unchanged (54), `just gen` produces no diff, the schema diff is empty.
BT17.1 MET (A's DEFER line removed); its CHECK keeps the one census test (`no_reducer_writes_a_retired_1v1_table_bt17_1`, EXPECT pinned to
exactly 1 passed) — the deletion half is compiler-proven (`-D warnings` dead_code, no allow attribute on any 1v1 item). (2) **Hidden
dependency (recorded before the build, proceeded under A's precedent):** TEN 1v1 marshaling helpers in `marshal.rs` / `content_cache.rs`
(outside the touches) go dead in every non-test build once the bodies leave — kept `#[cfg(test)]` (with their imports) for their
tests, so a production re-use is a compile error (residual R-bt-17-MARSHALTESTONLY owes the deletion with survivors). Method: run `clippy --all-targets` on the tester's tree BEFORE
deleting — its dead-code list is exactly the set with no remaining test caller (a lib-only probe under-reports). (3) **Tests (BT17.2):**
no new source-scan test (REV 1's two census tests were dropped at plan review: a hand-source parse is a forbidden shape, and one was
unsatisfiable — `disarm_pvp_deadlines` legitimately deletes from `pvp_deadline_schedule`); nine REPLACEMENT tests were written first and
watched red on 19 hand-applied mutants (six-state deletion gate on both tactical starts — the status-only gate was a measured survivor —,
wild seeds live only in `battle_wild_unit` under the returned id, a recruit success whose party write-back fails still commits once and
pays nothing, PvP start escrow on either side, a terminal PvP anchor admits a new wild start; acceptor-side party ownership on the live accept; the Deploying-pack start-time escrow
guard; disconnect auto-flee pays nothing; a pre-queued recruit is owned by the player); 22 1v1 tests deleted with named survivors
(ledger `memory/projects/monster-realm-bt-17b-deletions.md`, verifier-adjudicated APPROVE), the trading escrow matrix's four 1v1 rows and
two item rows deleted (R-bt-16-TRADINGMATRIX: the live sites are covered in their own suites), the BT13 parity tests keep the tactical
half against the pinned 1v1 literals, `dw_insert_sites` targets `taming::insert_recruited`, the source-scan
`rt_m14e_use_battle_item_ownership_guard` and its text helpers deleted. Module suite 850 (all features) / 848 (default), game-core 1797,
client 4658 (BT17.2 CHECK 1138/1138). (4) **R-bt-17-LEGACYANCHORS:** pre-publish SQL check run FIRST on every stored local DB
(`monster-realm`, `-playtest`, `-smoke`, `-m135h`): 0 Ongoing anchors (none has `battle_tactical`; `maincloud` has no database); no
connect-time sweep (`resolve_wild_battle_on_disconnect` has no tactical-row exclusion — a reconnect sweep would be new predicate code with a
live-tactical-wipe failure mode for a population measured at zero; a session-bound anchor still resolves at its disconnect). (5)
**Re-target asks:** R-bt-2-m14-restated (`game-core/src/tactics/upkeep.rs`, `combat/{status,resolve}.rs`) and R-bt-14-ROSTERREVEAL
(`tactics::start_pvp_tactical` + the client's anchor readers) need files outside the touches — both were closed at #671's merge but are
NOT done. New: R-bt-17-UNDOWILDSTART (data-integrity/LOW: `undo_wild_start` leaves unit/event/queue rows on a late `?`). Apparatus:
the privacy census compares idents without `unraw()` (an `r#` accessor is invisible) — flagged, not tracked (policy). (6) **Lenses:**
plan reviewer + red-team (REV 2); artifact reviewer (3 MAJOR fixed), reducer-security-auditor PASS, red-team (no survivor introduced by B — every one also survives on
master; holes in T2/T4 and two overstated ledger survivors folded in a third tester round from its PoC tests: acceptor-side party
ownership on the live accept, the Deploying-pack start-time escrow guard, disconnect auto-flee pays nothing, a pre-queued recruit is
owned by the player; the helpers' `allow(dead_code)` became `cfg(test)` on its advice), verifier APPROVE;
desync-guard N/A (no rule change). Scoped `cargo mutants` report on battle.rs / taming.rs / pvp.rs / guards.rs: 213 mutants: 205 caught, 1 missed, 7 unviable; the one survivor (`settle_pvp_battle`'s `Ok(side_a_ok && side_b_ok)` → `||`) is MISSED on master 64f66cca too (pre-existing; R-bt-17-PVPHPOK, gameplay/LOW → backlog).
(7) **Gates:** BT17.3 MET on the FIRST verbatim `just e2e` run (130 passed, 12.8 m; the recruit R4 fixme skipped as before) — no R-bt-17-FIGHTSTALL or movement-input recenter flake this time; BT17.1 1 test run: 1 passed; BT17.2 1138/1138; full `just ci` green on the PR head (two detached runs wedged on the observability-validate `docker run --rm` client for `alloy fmt` — the container had exited with its output printed; killing the client PID let the run record 8/8 PASS and CI-EXIT=0, and a standalone `just observability-validate` passed in 6 s; `ops/` is untouched by this slice). PR mdrewt/monster-realm#672 (branch slice/bt-17 @ 4ab9809b)..

## Post-integration verification

After bt-17 merges, on master (the integrated whole, not per-slice green):

1. Full `just ci` green and meaningful: nextest (game-core + server-module), client vitest,
   `client-typecheck`, `client-verify-build`, `wasm`, the grandfathered evals including
   `bindings-drift` (= 0), `battle-schema-snapshot` and `spacetime-type-snapshot` (re-baselined
   additively by bt-7/bt-8/bt-14; every pre-existing table and type byte-identical),
   `content-version` (one bump, 24 → 25), `client-surface-privacy` (baselines extended, check
   unmodified), `account-e2e` (transcriptions extended).
2. `just e2e` green, including the new flows: tactical wild (bt-12), tactical PvP two-context
   (bt-15), and every migrated 1v1 flow (bt-16), by virtual buttons only.
3. **Combined BT1–BT7 end-to-end:** one wild battle and one PvP battle played on master through
   the real client prove BT1 (map + conscious-only deploy), BT2 (byte-identical rules, server
   recompute), BT3 (overlays + forecast + free draft undo), BT4 (adjacent full-budget recruit, bait
   at 0 AP, zero yield, R-21r-a trio), BT5 (private tables, interlocks incl. Deploying, disconnect
   GC, every wild phase bounded), BT6 (HUD keep-signals, en+fr, D-pad), BT7 (queue execution,
   cancel, halt-and-return waste, idle-only clock with reset-on-submit, PvE and PvP parameters).
4. Cross-slice contracts named and proven after integration: the `QueuedAction` enum (bt-3 ↔
   bt-7 bindings ↔ bt-11 client), the view set (bt-7 ↔ bt-12 subscriptions), the reducer
   signatures (bt-8/bt-14 ↔ bt-11/bt-12/bt-15 calls), the golden fixture (bt-1 ↔ every wasm
   consumer), `TacticsTuning` (bt-2 struct ↔ bt-6 RON), `battle_summary` fields (bt-9 ↔ bt-13),
   the tactical content join (bt-6 kits ↔ bt-8 reducers ↔ bt-11 forecast).
5. Publish-over-data proof for the cumulative schema delta; `is_in_ongoing_battle` callers
   unchanged; the H1/H2 report runs against a seeded `playtest_event` set.
6. **Manual before the strict §10 gate:** one playtest-style session per mode under `en` and `fr`
   (wild pack 1, wild pack 3 with recruit, casual 1v1 PvP, ranked 3v3 with one AFK strike); an
   NVDA pass over the Deploying panel, the command menu and the Finished panel. Findings become
   residuals, not slice re-opens.

## Risks / decisions

- **Design §12 defaults adopted (operator may override; last safe override point):** Q1 literal
  reset-on-submit clock (override before bt-3); Q2 halt-and-return waste (before bt-3); Q3 Light
  power 20 / Heavies 65–75 (before bt-6); Q4 accuracy live at cutover (before bt-2); Q5 carried
  ×2/×½ type multipliers (content, any time); Q6 PvP no XP/currency, symmetric essence (before
  bt-5); Q7 PvP disconnect = immediate forfeit (before bt-14); Q8 no Swap at cutover (depth wave
  D1); Q9 free move-undo in PvP (before bt-11); Q10 Recruit needs 6/6 AP so the turn starts
  adjacent (before bt-5).
- **Elaboration shapes that depart from the design's literal text (measured; semantics kept;
  flagged for the operator/judge, who may object before the named slice):** (a) tactical content
  as SIDECAR registries keyed by id instead of new fields on the five content structs (bt-6 —
  ~100 struct literals + production marshaling + an `encounter` schema change avoided); (b) the
  tactical UI renders INSIDE the existing `battleView` frame by phase instead of as new frames on
  the stack (bt-10/12 — each new frame id reds ~25 pinned tests and the design's §9.1 is one
  screen); (c) Hold Y / Hold B replaced by a confirmed "Clear plan" menu row and a B tap during
  playback (bt-11/10 — no hold edge exists on the virtual-button layer; the gestures are deferred
  to M-gamepad); (d) PvP `format` derived from the challenger's party pick instead of a new
  reducer argument (bt-14 — no `challenge_pvp` signature change); (e) the build-phase tactical
  path is reached through cfg-gated dev reducers invoked by `spacetime call` (bt-8/14), flipped to
  the live paths in bt-16 — the "no toggle" ruling holds for players (nothing is player-reachable
  before bt-16).
- **Decision entries the build slices owe (`standards/decisions.md` bar met — names the fork, not
  routine):** bt-3 (queue waste = halt-and-return; clock = literal reset, ≤ 3 windows), bt-4
  (seed-free AI signature; randomness only via server-pushed events), bt-7 (tactical privacy by
  structure: no ready flag, secret tables without views, owner-only staging, not exportable),
  bt-16 (strangler cutover; tables retired in place) with bt-17 amending in place. Every other
  slice makes none.
- **Reducer-transaction cost is unmeasured until bt-8** (design risk 11): BT8.7 measures; the
  fallback (one unit-turn per transaction) is a build-note decision, not a redesign.
- **Power retune reaches the live 1v1 game between bt-6 and bt-17** (internal master only; nothing
  ships before the cutover). The declared e2e attack budgets absorb any pacing drift.
- **Big-bang concentration** (risk 2): nothing player-facing before bt-16; the internal wild loop
  is playable from bt-12 via the dev-gated start; tables retired, never dropped.
- **Byte identity across a large rule surface** (risk 3): the golden harness lands in bt-1 and every
  later module joins it; explicit tie-breaks, no HashMap iteration (enforced by the golden test, not
  a lint — `clippy.toml` has no HashMap ban).
- **Nightly mutation gates:** `mutate-core` tolerates zero missed mutants, so every `tactics`
  module's tests must be mutation-tight from its own slice; `mutate-server` caps survivors at 34.
- **Legal PvP slow-play** ≈ 128.7 min theoretical under the literal clock (design §10): knobs are
  `SURGE_START`, Q1, a per-match bank — all operator sign-off; telemetry (BT9.5) feeds §12-F(h).
- **Pacing margin:** pessimistic PvP 3v3 median 5.6 min vs ≤ 6 min target; BT13.1 and the
  `battle_summary` medians are the gate inputs.
- **Stale doc claims found by measurement (not this spec's to fix; flagged):** a manifest-totality
  test cited by `schema.rs`, `accounts_tests.rs`, `DECISIONS.md` and `ARCHITECTURE.md` no longer
  exists — a table missing from `DATA_LIFECYCLE_MANIFEST` fails nothing mechanically, so bt-7's
  manifest work relies on review; `lib.rs` cites `rb77_` guard tests that do not exist;
  `focusTrap.ts` and `playwright.config.ts` carry stale counts.
- **Party-full recruit path** (design risk 9): BT5.3/BT9.2 reuse the existing `check_headroom`
  semantics and the standing overflow destination; no new storage rule.

## Resolved questions (the sketch's open list)

- Recruit yield → #587 D1: zero (BT5.4).
- Waste rule → halt-and-return (BT3.4, §12 Q2). PvP queue secrecy → structural (BT7.2, BT14.4).
  Provisional-forecast presentation → Projected style (BT11.5). Queue-vs-undo → DRAFT is
  client-local and free; READY is cancel-and-clear (BT11.2/BT11.3).
- Deployment UX → fixed spawn slots + remembered formation; confirm panel only for packs ≥ 2;
  PvP secret staging (BT12.2, BT14.2). Free placement → P3 option.
- Per-species identity levers in P1 → movement class, stride band, 2-skill distinct-geometry kit,
  role tag, stance (BT6.2); abilities/weather/signatures → depth waves.
- Multi-wild generation → `pack_weights` + clamp + per-wild seeds in `battle_wild_unit` (BT4.7,
  BT7.1).
- Match-length target → design §10 budgets; BT13.1 simulates, BT9.5 measures.
