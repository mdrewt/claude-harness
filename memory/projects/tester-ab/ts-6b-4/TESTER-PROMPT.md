# Tester brief — ts-6b-4 (red phase: you write the gating tests; you implement nothing)

Worktree (every path below is relative to it):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-4`

You have Read, Grep, Glob, Write and Edit — no shell. The orchestrator compiles and runs what you
write and proves each new test fails on today's code for the reason you state. Rust must compile
against the code AS IT IS NOW in the worktree (the new Rust signatures below already exist there as
stubs) and be rustfmt-clean. TypeScript tests are written to the TS contracts below, which do NOT
exist yet: vitest does not type-check, so they run and fail; `tsc` errors in test files that come
only from the not-yet-landed contract are expected and are not yours to work around.

Verification rules (binding): `/home/mdrewt/projects/ai-apps/claude-harness/standards/testing-tdd.md`.
In short: tests execute the shipped code and assert what it does; never read a source file as text
(`include_str!`, `readFileSync` of a `.rs`/`.ts`), never pin comment or doc wording, never write a
test whose subject is another test. Test names lead with the behaviour.

## What this slice fixes

Four tactical values are restated outside game-core. The slice gives each one home.

**ts-6b-4.1** — WHEN a `battle_unit` row is joined into a `TacticalUnit`, THE SERVER and THE CLIENT
SHALL build its `UnitKit` through the one game-core function.
- Today the join (species affinity; kit base speed, movement class and `[light, heavy]`; the row's
  level and stats) is hand-written in `server-module/src/tactics.rs` (`TacticsContent::unit_kit`,
  ~line 331) and again in `client-wasm/src/lib.rs` (`unit_of_row`, ~line 883). The only oracle is a
  third hand copy, `join` in `client-wasm/src/tactics_tests.rs` (~line 79).
- After: game-core `tactics::unit_kit` is the join; both shells call it; the row → `TacticalUnit`
  field copy stays in each shell.

**ts-6b-4.2** — WHEN the client sizes a deploy panel, THE CLIENT SHALL use the game-core deploy slot
count the server enforces for that map.
- Today the cap `min(MAX_PACK, spawn_a.len())` is written twice in `server-module/src/tactics.rs`
  and a third time in `client/src/main.ts` `buildDeployPanel` as
  `Math.min(tuningOf().max_pack, mapFactsOf(row.mapId).spawns)`.
- After: game-core `tactics::deploy_slots(map)` is the rule; client-wasm exports
  `tactics_deploy_slots(map_id)`; the WILD deploy panel's slot count is whatever that export answers
  for the tactical row's `mapId`. `max_pack` leaves `TacticsTuningOut` and the TS `TacticsTuning`.
  The PvP deploy path (`pvpDeployCount`) is unchanged.

**ts-6b-4.3** — WHEN the PvP strike pips are painted, THE CLIENT SHALL draw as many pips as the
loaded tuning's `autopass_forfeit`.
- Today `client/src/tactics/clock.ts` holds `STRIKES_MAX = 4`, a copy of the tuning value.
- After: `TacticsTuningOut` carries `autopass_forfeit`; `main.ts` `pumpClock` hands it to `clockVM`
  as `strikesMax`; the view model carries it to the painter; `STRIKES_MAX` is deleted.

**ts-6b-4.4** — WHEN the active unit's AP pips are drawn, THE CLIENT SHALL draw the tuning's turn AP
as read through the rules port.
- Today `client/src/tactics/hud.ts` holds `AP_PIPS = 6`.
- After: `infoBoxes` takes `apMax`; `tacticsBattle.ts` passes the rules port's
  `freshBudget().ap`; `AP_PIPS` is deleted.

## Contracts

### Rust (present in the worktree now; bodies marked FROZEN are `todo!()` or a placeholder until the implementation)

```rust
// game-core/src/tactics/content.rs, re-exported as game_core::tactics::unit_kit        (FROZEN: todo!())
pub fn unit_kit(species: &Species, kit: &SpeciesTactics, level: u8, stats: StatBlock) -> UnitKit;
//   UnitKit { species_id: species.id, affinity: species.affinity, level, stats,
//             base_speed: kit.base_speed, class: kit.movement,
//             skills: vec![kit.light.clone(), kit.heavy.clone()] }
//   `species` and `kit` are always the same species' rows (callers look both up by one id; the
//   implementation debug-asserts it). Do NOT test a mismatched pair.

// game-core/src/tactics/encounter.rs, re-exported as game_core::tactics::deploy_slots  (FROZEN: todo!())
pub fn deploy_slots(map: &BattleMapDef) -> u8;
//   min(MAX_PACK, map.spawn_a.len()); a map with more than 255 side-A cells still answers MAX_PACK.

// client-wasm/src/lib.rs (crate root; the test file is `mod tactics_tests`, reached as `super::…`)
pub struct TacticsTuningOut { pub surge_start_round: u16, pub wild_round_cap: u16, pub autopass_forfeit: u8 }
pub fn tuning_out_of(tuning: &TacticsTuning) -> TacticsTuningOut;  // FROZEN: autopass_forfeit is 0; after: tuning.autopass_forfeit
pub fn tuning_out() -> Result<TacticsTuningOut, String>;           // tuning_out_of over the loaded content
pub fn deploy_slots_of(map_id: u32) -> Result<u8, String>;         // FROZEN: todo!(). After: Ok(deploy_slots(map)) for a
//   content map; for an unknown id the same Err `map_of` gives (`battle map {id} not in content`).
pub fn unit_of_row(row: &UnitRow) -> Result<TacticalUnit, String>; // signature and error strings unchanged
pub fn map_of(map_id: u32) -> Result<&'static BattleMapDef, String>;

// server-module/src/tactics.rs (private; the test file is the child module `tactics_tests`)
fn content() -> Result<&'static TacticsContent, String>;           // call as super::content()
impl TacticsContent { fn unit_kit(&self, species_id: u32, level: u8, stats: StatBlock) -> Result<UnitKit, String>; }
//   unchanged signature; an unknown species is Err("species {id} not in content").
```

### TypeScript (the target contract; none of it exists yet)

```ts
// client/src/tactics/clock.ts
export interface ClockInput { /* the existing fields */ readonly strikesMax: number }
export interface StrikesVM { side; mine; name; strikes; readonly strikesMax: number }
//   clockVM: strikes = autopassCount clamped to 0..input.strikesMax; every StrikesVM.strikesMax = input.strikesMax.
//   renderClock: per player exactly p.strikesMax `span.tactics-strike`, the first p.strikes of them
//   `tactics-strike--hit`; aria-label = catalog `tactics.clock.strikes` {name, n: p.strikes, max: p.strikesMax}.
//   The export STRIKES_MAX is removed. CLOCK_AMBER_MS / CLOCK_RED_MS are unchanged.

// client/src/tactics/hud.ts
export function infoBoxes(units, o: { activeUnitId; focusUnitId; draftedAp; readonly apMax: number }): InfoBoxesVM;
//   the active, Active unit's `pips` has exactly o.apMax entries (full / drafted / spent by the
//   existing rule); every other row's `pips` is null.
//   renderInfoBoxes: the AP label is catalog `tactics.hud.ap` {ap: <non-spent pips>, max: pips.length}.
//   The export AP_PIPS is removed.

// client/src/tactics/wasm.ts
export interface TacticsTuning { readonly surge_start_round: number; readonly wild_round_cap: number; readonly autopass_forfeit: number }
export interface TacticsWasmExports { /* the 16 existing */ tactics_deploy_slots(mapId: number): number }
export interface TacticsClientRules extends TacticsRules { tuning(): TacticsTuning; nextInitiative(…): number[]; deploySlots(mapId: number): number }
//   The bind order: the 16 existing export names in their current order, then `tactics_deploy_slots` (17).
//   deploySlots(mapId) forwards an integer in 0..=u32::MAX to pkg.tactics_deploy_slots and returns its
//   answer; any other mapId throws a RangeError before the pkg is called (the port's existing `int` guard).
//   `deploySlots` is on TacticsClientRules only: fakes of the shell's `TacticsRules` do not gain it.

// client/src/main.ts (behaviour)
//   Wild deploy panel: slotCount = rules.deploySlots(<the tactical row's mapId>). The deploy path no
//   longer asks `tactics_map`. The Active shell still sizes its board from `tactics_map` (width, height).
//   pumpClock: clockVM({ …, strikesMax: <tactics_tuning().autopass_forfeit> }).

// client/src/tactics/tacticsBattle.ts (behaviour)
//   infoBoxes(vm.units, { …, apMax: <the rules port's freshBudget().ap> }).
```

### Tests to write, with exactly these names / tags (the acceptance ledger selects on them)

| Criterion | Name (Rust) or tag (TS) | File | Rust module path |
|---|---|---|---|
| .1 | `unit_kit_joins_species_affinity_and_kit_moves_with_the_row_level_and_stats` | `game-core/src/tactics/content_tests.rs` | `tactics::content_tests` |
| .1 | `bt11_unit_join` (existing; its oracle re-pointed, see below) | `client-wasm/src/tactics_tests.rs` | `tactics_tests` |
| .1 | `unit_kit_of_a_content_species_equals_the_game_core_join` | `server-module/src/tactics_tests.rs` | `tactics::tactics_tests` |
| .2 | `deploy_slots_is_the_pack_cap_bounded_by_the_side_a_spawns` | `game-core/src/tactics/encounter_tests.rs` | `tactics::encounter_tests` |
| .2 | `deploy_slots_export_equals_game_core_for_every_content_map` | `client-wasm/src/tactics_tests.rs` | `tactics_tests` |
| .2 | ONE `it(...)` whose name ends ` [ts-6b-4.2]` | `client/src/main.dispatch.test.ts` | — |
| .3 | `tuning_out_carries_autopass_forfeit` | `client-wasm/src/tactics_tests.rs` | `tactics_tests` |
| .3 | ONE `it(...)` whose name ends ` [ts-6b-4.3]` | `client/src/tactics/clock.test.ts` | — |
| .3 | ONE `it(...)` whose name ends ` [ts-6b-4.3]` | `client/src/main.dispatch.test.ts` | — |
| .4 | ONE `it(...)` whose name ends ` [ts-6b-4.4]` | `client/src/tactics/hud.test.ts` | — |
| .4 | ONE `it(...)` whose name ends ` [ts-6b-4.4]` | `client/src/tactics/tacticsBattle.test.ts` | — |

The ledger pins the COUNT of tagged tests per criterion (.2: 1, .3: 2, .4: 2). No other test, and no
`describe`, may carry the text `ts-6b-4` in its name. The Rust names must be exact and must not sit
inside a nested `mod`. You may add further untagged tests where a distinct behaviour needs its own.

## What each test must be able to tell apart

A reviewer attacked the plan; these are the wrong implementations the tests have to kill.

**`unit_kit` (game-core).** Hand-build one `Species` and one `SpeciesTactics` in which every source
differs from every other: `kit.base_speed` ≠ `species.base_stats.speed`; `light` ≠ `heavy` (ids,
tier, power, geometry); the `stats` argument ≠ `species.base_stats`; a `level` no other field holds;
an affinity that is not the skills' affinity. Assert the whole `UnitKit` by equality with a literal.
Kills: base speed read from the species row or from `stats.speed`; light/heavy swapped; level or
stats taken from the species; affinity taken from a skill; the movement class defaulted. A second
block over the live content (`build_kits` over the loaded registries) may pin one real species.

**`deploy_slots` (game-core).** Hand-built maps with 0, 1, 2, 3, 4, 255, 256, 258 and 300 `spawn_a`
cells answer 0, 1, 2, 3, 3, 3, 3, 3, 3 (`spawn_a` is a plain `Vec<Cell>`; the map need not validate).
`spawn_b` must not decide the answer (give it a different length). Kills: `len as u8` (256 → 0,
258 → 2); the count read from `spawn_b`; a constant 3; `max` instead of `min`. Also assert it answers
`MAX_PACK` for every shipped map.

**client-wasm host tests.**
- `bt11_unit_join`: the helper `join` (~line 79) is the hand copy the residual names. Re-point its
  `kit:` to `game_core::tactics::unit_kit(species, kit, r.level, r.stats)`; the rest of `join` (the
  row field copy) stays. Do NOT change the species-1 hand-built `want` (~lines 580-609) or any
  assertion of the test: that literal is the independent oracle. Bring the helper's doc comment and
  the file header (lines 10-12) in line with what the oracle now is.
- `deploy_slots_export_equals_game_core_for_every_content_map`: for every `load_battle_maps()` entry
  `super::deploy_slots_of(id) == Ok(game_core::tactics::deploy_slots(&entry.map))`; an anti-vacuity
  floor on the map count; an unknown id (e.g. 4242 and `u32::MAX`) is an `Err` naming the id. Every
  shipped map has three side-A cells, so equality alone cannot see an export that ignores `map_id`:
  the unknown-id refusals are what do.
- `tuning_out_carries_autopass_forfeit`: `tuning_out_of` over a hand-built tuning
  (`..TacticsTuning::DESIGN`) whose `autopass_forfeit` equals no other `u8` field of that tuning (7
  works) answers 7; over the loaded tuning it answers the loaded value; `tuning_out()` equals
  `tuning_out_of(&loaded)`. Kills: a literal 4; `ap_turn` or `max_windows_per_turn` read instead.
- `bt12_tuning_out_mirrors_the_loaded_tuning_and_max_pack` (~line 2179) builds `max_pack`, which no
  longer exists. Rewrite it to the new three-field shape, keeping every assertion that is not about
  `max_pack` and keeping the `bt12_` prefix (e.g. `bt12_tuning_out_mirrors_the_loaded_tuning`); drop
  the `GAME_MAX_PACK` import if nothing else uses it; correct the section comment above it.

**server test** `unit_kit_of_a_content_species_equals_the_game_core_join`: for every content species
that has a kit (game-core's `build_kits` over the loaded registries is the roster), with a level and
a `StatBlock` that are not the species' own, `super::content()?.unit_kit(id, level, stats)` equals
`Ok(game_core::tactics::unit_kit(species, kit, level, stats))`; an anti-vacuity floor on the roster;
an unknown species id is the documented `Err`. Model: `tactics_content_zone_finds_the_zone_with_that_id_mutw3`
(~line 6947). This test needs no fixture world.

**`client/src/tactics/clock.test.ts`.** Every `clockVM` input gains `strikesMax`; every expected
`StrikesVM` gains `strikesMax`; the `STRIKES_MAX` import and the "frozen display constants" read of
it go. The tagged case: a view model built with `strikesMax: 7` PAINTS seven pips per player through
`renderClock` — with an `autopassCount` of 9 (seven pips, seven hit, label "… 7 of 7 …" from the
catalog) and with a count below the max (seven pips, that many hit). Also cover a second max (e.g.
3) so a painter that keeps one max while the clamp uses another shows, and a repaint with the same
players but a different `strikesMax` (the strip must show the new count: the painter memoises on the
players list). The existing four-pip cases keep their expectations by passing `strikesMax: 4`.

**`client/src/tactics/hud.test.ts`.** Every `infoBoxes` call gains `apMax`; the `AP_PIPS` import and
the `expect(AP_PIPS).toBe(6)` read go. The tagged case, named so that it starts
`the active row draws apMax pips from its input`: with `apMax: 9` (not 6, not the unit's AP) the
active row has nine pips in full / drafted / spent order and `renderInfoBoxes` labels it
"<non-spent> of 9" from the catalog; with `apMax: 4` and a unit at 6 AP it has four pips. The existing
six-pip cases keep their expectations by passing `apMax: 6`.

**`client/src/tactics/tacticsBattle.test.ts`** (the shell; its fake rules port answers
`freshBudget()` with `ap: 7`, line ~203). The `StrikesVM` literals in `clockOn` (~line 4520) gain
`strikesMax`. The HUD read at ~line 3052 expects six pips and becomes false under the contract. The
tagged case: the active unit's info row shows as many pips as the port's fresh budget has AP (7) for a
unit whose own `ap` is 5 — five live, two spent — so "the unit's current AP passed as `apMax`" and
"a literal 6" both fail.

**`client/src/tactics/wasm.test.ts`** (runs against the BUILT pkg, already rebuilt from the frozen
Rust). `EXPORT_METHODS` gains `['tactics_deploy_slots', 'deploySlots']` last (17). Rewrite
`BT12-1-WASM-TUNING` to the new shape: the shipped tuning is exactly
`{ surge_start_round: 9, wild_round_cap: 30, autopass_forfeit: 4 }`; the fake-pkg leg uses a third
field value that is not 4. Add an untagged case for `deploySlots`: the built pkg answers 3 for every
content map id (1..=8, `game-core/content/battle_maps/000-core.ron`); an unknown id throws naming the
id; the port forwards exactly one integer argument and returns the pkg's answer unchanged (use a fake
answer that is not 3); `-1`, `1.5` and `2 ** 32` throw `RangeError` without reaching the pkg; a pkg
without the export fails to bind naming it.

**`client/src/main.dispatch.test.ts`.** The hoisted `T12` stub state and the pkg factory change:
- `T12.tuning` becomes `{ surge_start_round: 11, wild_round_cap: 37, autopass_forfeit: 7 }`.
- The factory gains `tactics_deploy_slots: (mapId) => …`, which records every `mapId` it is asked
  (a new list beside `mapCalls`) and answers PER MAP a number that is NOT that map's stubbed
  `spawn_a` length for at least the maps the slot-count cases use (map 13 has three stubbed cells:
  answer 2; the four-cell map 19: answer something other than 4 and other than 3 where the case
  allows), so `Math.min(x, spawns)`, a literal 3 and "the spawn count" all fail.
- Existing cases that drive the slot count through `T12.tuning.max_pack` (~lines 6055-6067, ~7679)
  or prove the deploy's map through `T12.mapCalls` (~line 5483; see also ~5618-5660 and ~5716) are
  re-expressed through the new stub and its recorded ids. Keep what each case proves; change only
  the mechanism. Where a case asserted "the rules port was asked for the battle's own map" for a
  DEPLOYING battle, the id now shows in the deploy-slots record, not in `mapCalls`.
- The tagged `.2` case: a Deploying WILD battle on a map whose stub answer differs from its spawn
  count offers and sends exactly that many picks, and the stub was asked with the tactical row's
  own `mapId`.
- The tagged `.3` case (model: the BT15-2 clock-pump case, ~line 7391): a PvP battle on the shell
  paints, for each player in `.tactics-players`, exactly seven `.tactics-strike` pips (the stubbed
  `autopass_forfeit`), the hit count from that player's `autopassCount`. Count painted pips; do not
  assert on the tuning object.
- Correct the header comments that describe the old `min(max_pack, spawn_a.length)` mechanism.

**The pkg stubs in `client/src/main.accel.test.ts`, `main.controls.test.ts`, `main.help.test.ts`,
`main.input.test.ts`, `main.reconnectStack.test.ts`.** Each mirrors the pkg: replace `max_pack` in
the `tactics_tuning` answer with `autopass_forfeit: 4`, add `tactics_deploy_slots: () => 3` beside
the other `tactics_*` entries, and correct the neighbouring comments that mention `max_pack`. Change
nothing else in those files.

## Rules for editing existing tests

- Change an existing assertion only where the contract change above makes it false or impossible to
  build. Keep its strength: an expectation of "four pips" becomes "four pips, given `strikesMax: 4`",
  never "some pips". List every such edit in your report as `file:line — old → new — why`.
- Do not delete, skip or weaken a test. If you believe an existing test must go, say so in the
  report instead and leave it.
- Do not edit production code, generated bindings (`client/src/module_bindings/`), or any file not
  named in this brief.

## What to hand back

1. The tests, written into the worktree files named above.
2. For each NEW test: its full name, its criterion, and one sentence saying why it FAILS on the code
   as it stands (the specific assertion and what the code does instead). Say plainly where the only
   red reason is a frozen `todo!()` body.
3. For each test, the wrong implementations it kills.
4. The list of edits to existing tests (rule above).
5. Anything in the code or fixtures that contradicts this brief, as a claim with `path:line`. Do not
   work around it silently.
