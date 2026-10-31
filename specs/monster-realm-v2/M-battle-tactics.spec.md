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
  weakened = pct − 8 − bait — so a wild at 20 % HP with bait 150 ‰ shows 8 + 15 + 40 = 63 %.

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
  every battle kind), currency (wild: carried `battle_currency_reward(bst)` to the player; PvP:
  none); a recruit success SHALL never fire the hook.

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

- **BT8.6:** WHEN a battle finishes, THE reducer SHALL persist outcome and HP through the existing
  write-back primitive (`write_back_party_hp`), and `battle_gc` SHALL delete the battle's event,
  unit, queue, clock, secret and wild-unit rows 24 h after finish while `battle_summary` survives.

- **BT8.7:** WHEN the §2.2 worst-case round (6 units, 8×8, Diamond(2) AoEs, 3-action plans, AI
  plans for every wild) runs as one transaction in a native-host test, IT SHALL complete within the
  chain bound (≤ 18 resolved actions + one upkeep) and its duration on the pinned host SHALL be
  recorded in this slice's build note; if the host's reducer limit is exceeded, THE fallback is
  one unit-turn per transaction (design §12-F(g)) recorded as a build-note decision.

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

### bt-11 — client: hierarchical command menu, live draft, queue strip + badges, forecast panel, provisional board, wasm exports
category: ux + netcode-determinism (forecast parity) · severity: HIGH · size: HEAVY
touches: client/src/tactics/commandModel.ts, client/src/tactics/commandModel.test.ts, client/src/tactics/draft.ts, client/src/tactics/draft.test.ts, client/src/tactics/queueStrip.ts, client/src/tactics/queueStrip.test.ts, client/src/tactics/forecast.ts, client/src/tactics/forecast.test.ts, client/src/tactics/provisionalBoard.ts, client/src/tactics/provisionalBoard.test.ts, client/src/tactics/wasm.ts, client/src/tactics/wasm.test.ts, client/src/tactics/forecast.parity.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client-wasm/src/lib.rs, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/battleScreen.boot.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/ui/hintBarModel.ts, client/src/ui/hintBarModel.test.ts, client/src/main.help.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/styles.css
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

### bt-12 — client: subscriptions + store ingest, deploy confirm + formation editor, results, screen wiring, wild e2e
category: ux + critical user flow · severity: HIGH · size: HEAVY
touches: client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/connection.runtime.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/tactics/deployPanel.ts, client/src/tactics/deployPanel.test.ts, client/src/tactics/results.ts, client/src/tactics/results.test.ts, client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.battle-reseed.test.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/tactics-wild.spec.ts, client/e2e/controls.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, client/src/styles.css
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

### bt-17 — cutover purge: 1v1 reducers, screens, models and the 60 s reaper deleted; old tables retired in place; combined end-to-end proof
category: gameplay (hard replacement — D583.3, step 2) · severity: CRITICAL · size: HEAVY
touches: server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/taming.rs, server-module/src/taming_tests.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/lib.rs, server-module/src/privacy_enforcement_tests.rs, server-module/src/monster_mgmt_tests.rs, game-core/src/combat/status_tests.rs, evals/baselines/client-callable-reducers.json, client/src/module_bindings/, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/ui/battleModel.ts, client/src/ui/battleModel.test.ts, client/src/ui/screens/battleScreen.ts, client/src/ui/screens/battleScreen.test.ts, client/src/ui/screens/battleScreen.boot.test.ts, client/src/ui/i18n/hardcodedStrings.ts, client/src/ui/i18n/hardcodedStrings.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/main.claimCode.test.ts, client/src/main.pvpPending.test.ts, client/src/main.reconnectStack.test.ts, client/src/main.battleRewards.test.ts, client/src/main.accel.test.ts, client/src/main.controls.test.ts, client/src/main.input.test.ts, client/src/ui/boxView.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/reachability.test.ts, client/src/ui/screens/types.ts, client/src/ui/battlePolicy.ts, client/src/ui/contextStack.test.ts, client/e2e/a11y.spec.ts, client/vite.config.ts, client/src/styles.css, ARCHITECTURE.md, docs/DECISIONS.md
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
