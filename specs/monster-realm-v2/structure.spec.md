# Structure — open refactor slices

The standing backlog of structural work on the game repo: moves, extractions and interface
changes that leave behaviour unchanged, and the design slices that decide how. Every section is
a `type: refactor` or `type: design` slice bound by `standards/spec-driven.md` §Refactor slices,
in build order. This file is standing: it is never
deleted and never counts toward a playtest gate, and an empty `## Slices` means nothing is open.

- **Scheduled by** the supervisor's structural share: the first unbuilt, non-`blocked:` section
  whose `after:` slices are built and whose quiet window is clear. When no earlier PLAN §9 item
  has a launchable slice, sections launch in file order.
- **Written by** a milestone spec author's structure pass (`milestone-loop-prompt.md`, at most
  three sections per spec PR), by the supervisor from a merged design slice (the next three
  extractions a plan file under the game's `docs/refactors/` lists, written per that structure
  pass as a doc-only PR), by the supervisor when a parked slice or a spec author names an
  internal-design choice nobody has recorded (one `type: design` section, doc-only PR; the
  parked slice gains it in `after:`), by the supervisor at a milestone's close, from the section
  `mr-prune close` wrote for it (the bundle's `prune_close`; one section per close, appended in
  the doc-only PR that deletes the milestone's spec), or by the operator. Never by a build run,
  and never invented to fill the share. Structural findings are not residuals.
- **Built** means the game repo's `origin/master` carries a subject naming `<slice id> —`,
  whatever its type, that no later revert undoes. A built section is deleted by the next
  doc-only PR that edits this file. Ids are never reused.
- **Section shape:** heading `### st-<n> — <title>`; then the lines
  `type: refactor · tier: routine` (a move), `type: refactor · tier: hard` (an interface or
  ownership change) or `type: design · tier: hard`, `touches:`, `after: [...]`, and `blocked: <reason>` while an operator
  decision is open; then what moves (exported symbols, never line numbers), each pin with its
  disposition, the tests that already cover the moved behaviour, and id-led `SHALL` criteria
  whose checks are test-runner invocations.
- **`touches:`** names the source and destination files literally and test families as globs
  with a literal directory prefix (`client/src/main.*.test.ts`), never a bare directory. An
  extraction sectioned from a plan file also lists that plan file and `ARCHITECTURE.md`, and its
  confirm-at-merge line includes "its plan line is gone". A new section takes the id one above
  the highest `st-<n>` in this file or in a game-repo subject.
- **Design before dependence.** A slice that depends on an internal-design choice nobody has
  recorded lists, in `after:`, the `type: design` slice that makes it. The loop builds that
  slice itself. `blocked:` is only for the operator decisions `standards/spec-driven.md`
  §Refactor slices names.
- The doc set (`ARCHITECTURE.md`, `docs/DECISIONS.md`) never counts toward a quiet window.

## Slices

### st-3 — shared roster and count pins: one owner per fact
type: design · tier: hard
blocked: tester-ab-close
touches: docs/DECISIONS.md, docs/refactors/test-pins.md
after: []

Several client tests assert the same fact as a literal, so a slice that adds one screen, string or
subscription edits test files outside its own modules. The help overlay's 16 rows are asserted
eight times across `client/src/main.help.test.ts` and `client/src/ui/helpView.test.ts`; the 29
subscription queries four times across `client/src/net/connection.runtime.test.ts` and
`client/src/net/connection.test.ts`; `OVERLAY_IDS` is named in 33 test files.
The files changed most often by commits that did not change their subject are
`client/src/ui/i18n/catalog.test.ts`, `ui/screens/index.test.ts`, `ui/i18n/catalogParity.test.ts`,
`ui/contextStack.test.ts` and `ui/reachability.test.ts`. Most are accessibility, i18n,
reachability and privacy gates. This slice decides, for each fact pinned in more than one place,
which one test owns the literal and what every other test asserts instead. It changes no code and
removes no gate: every protected behaviour keeps an executing check.

It reads those files in full, with `memory/projects/mr-prune census --mem memory/projects` output
(`protected-churn`, `signals`) and the `gates/*.widened.jsonl` rows when the tool and rows exist.
It has a `judge` score at least two designs, one of which is "leave the pins as they are":
`mr-touches widen` already lets a run add a pin file to its own `touches:`, so the plan states
what the pins still cost.
The block lifts when `memory/projects/mr-tester-ab.jsonl` holds a `close` row: a shadow test that
edits a pin file stops applying once a consolidation rewrites it, which that experiment scores as
a brittle break.

`docs/refactors/test-pins.md` records:

- each shared fact: its name, the product value it comes from, and every test that asserts it;
- the owner test for each, and for every other assertion one disposition: derive the expected
  value from the product registry, assert on the test's own entity only, or delete with the
  surviving test named by path and name (`standards/testing-tdd.md` §Deleting a check; a
  protected-category deletion names how the survivor is demonstrated);
- for a pin that reads source text, its disposition under §Behavior-preserving changes;
- the slices still to make, in order, one line each: the fact and the test files it edits.

`docs/DECISIONS.md` gets one entry for the rule chosen and the one it rules out.

- **ST3.1:** WHEN the client is type-checked and the vitest suites of the files the plan names run
  THEY SHALL pass.

Confirmed by reading at merge, not by a criterion: every fact the plan lists names an owner test
that exists; no listed disposition leaves a protected behaviour with no executing check; the
run's log shows the `judge`.

### st-4 — what stays of the 1v1 battle rules in `game-core`
type: design · tier: hard
blocked: tester-ab-close
touches: docs/DECISIONS.md, docs/refactors/combat-carried-rules.md
after: []

`docs/DECISIONS.md` "Battles run on one engine at a time; the tactical cutover was a flip, not a
toggle" keeps `game-core`'s `combat::*` as the type home of the stored `Battle.state` and of the
rules the tactical engine reuses. Part of it has no production caller. No production file outside
`game-core/src/combat/` and the `lib.rs` re-export names `resolve_turn`, `resolve_full_turn`,
`resolve_enemy_turn`, `resolve_player_swap`, `resolve_recruit_failure`, `advance_turn`
(`combat/resolve.rs`), `weather_attack_modifier`, `apply_weather_damage`, `tick_weather`
(`combat/weather.rs`), `apply_entry_ability`, `apply_ability_modifiers` (`combat/ability.rs`),
`TurnChoice` or `TurnVariance`. Their tests are `combat/battle_core_tests.rs`,
`combat/battle_0hp_tests.rs`, `combat/weather_tests.rs`, `combat/ability_tests.rs`,
`monster/battle_redteam_tests.rs` and part of `combat/status_tests.rs`; `benches/hot_paths.rs`
and `benches/budgets.rs` time `resolve_turn`. The same decision leaves ten row-to-`BattleMonster`
helpers in `server-module/src/marshal.rs` and `content_cache.rs` compiled only under `cfg(test)`
"until they are deleted with named survivors". This slice decides what goes, what stays and in
what order. It changes no code.

It reads `game-core/src/combat/` and `game-core/src/tactics/` in full, with the tests named above
and `memory/projects/mr-prune census` `orphans` output when the tool exists; the code graphs
(`code-intel` skill) answer what calls each symbol. It has a `judge` score at least two designs,
one of which keeps everything. The result respects these, or says in the decision entry what it
supersedes:

- Types stored in `Battle.state` and every rule a production tactical path calls stay (schema
  changes are additive).
- Entry abilities and weather return with the tactical depth waves (PLAN §9, M-battle-tactics
  depth); the plan says whether their 1v1 rules stay as the source for that work.
- `tactics/resolve_tests.rs`, `tactics/queue_tests.rs` and `tactics/upkeep_tests.rs` execute
  `resolve_turn`, `apply_pre_turn_effects` and `apply_post_turn_effects` as the expected value for
  carried rules. The plan says what each compares against once its oracle goes.
- `monster/battle_redteam_tests.rs` holds tests written for past findings. Each gets one
  disposition: the rule is carried, with the surviving tactical test named and demonstrated as
  `standards/testing-tdd.md` §Deleting a check requires for a protected category; or the
  behaviour has no production path, with the symbol whose removal proves it.

The block lifts when `memory/projects/mr-tester-ab.jsonl` holds a `close` row: a shadow test that
calls a symbol an extraction deletes stops compiling, which that experiment scores as a brittle
break.

`docs/refactors/combat-carried-rules.md` records:

- every `pub` item of `game-core/src/combat/` as stored type, carried rule, test oracle, source
  for a deferred wave, or unreached;
- for each test file named above, which tests stay and, per removed test family, the surviving
  test or the removed symbol;
- the `.cargo/mutants.toml` entries, bench budgets and `budget_check_tests.rs` rows that name a
  removed function;
- the extractions still to make, in order, one line each: the symbols and test files it removes.

`docs/DECISIONS.md` gets the outcome under the existing battle-engine entry, superseding in place
what it says about `combat::*`.

- **ST4.1:** WHEN `cargo nextest run -p game-core -p server-module` runs THE suites SHALL pass.

Confirmed by reading at merge, not by a criterion: every symbol and test file the plan names
exists; no item classed unreached is named by a production file; each `battle_redteam_tests.rs`
test has a disposition; the run's log shows the `judge`.

### st-5 — client shell: the session constants leave `main.ts`
type: refactor · tier: routine
touches: client/src/main.ts, client/src/shell/config.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, docs/refactors/client-shell.md, ARCHITECTURE.md
after: []

Extraction 1 of `docs/refactors/client-shell.md`, a plain move. `client/src/shell/config.ts` is
created and takes `URI`, `DB`, `DEV_LOG_LEVEL`, `sendLogger`, `fateLogger`, `ZONE_ID`, `STEP_MS`,
`QUEUE_CAP`, `PARTY_SIZE`, `PARTY_SLOT_NONE`, `MAX_TRADE_MONSTERS_PER_SIDE`,
`DELETION_GRACE_MS_DEFAULT` and `WASM_READY_MS` as exports; `main.ts` imports them and its
bodies change only by that import. The module follows the plan's rules 5 and 6: it imports the
wasm package and the pure resolvers, writes nothing to the document, registers nothing, reads no
locale, and the throw on a misconfigured production build still happens at import. A wasm export
`main.ts` did not import by name joins the stubs in `client/test-util/mainBootHarness.ts` and the
inline ones (the plan's "Tests and docs that follow the code").

Pins: none. No test reads these names out of `main.ts` text; `client/src/main.claimCode.test.ts`
recomputes `URI` and `DB` from `resolveConnectionConfig` and does not read the shell's copy.
Covering tests: the `client/src/main.*.test.ts` suites, which boot the shell through `./main`
(`main.boot`, `main.claimCode`, `main.zoneCue`, `main.partyFull`, `main.exportTransport`).

- **ST5.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST5.2:** WHEN the client's full vitest suite runs IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: the thirteen names are declared in
`shell/config.ts` and nowhere in `main.ts`; `shell/config.ts` imports no other shell module and
registers no listener; its plan line is gone.

### st-6 — client shell: the boot-built view handles get an owner
type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/views.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, docs/refactors/client-shell.md, ARCHITECTURE.md
after: [st-5]

Extraction 2 of `docs/refactors/client-shell.md`, an ownership change. `client/src/shell/views.ts`
is created and owns, as `export let`, the handles `boxView`, `raisingView`, `evolutionView`,
`dialogueView`, `questLogView`, `healView`, `shopView`, `tradeView`, `pvpView`,
`leaderboardView`, `profileView`, `renameView`, `tradeProposeView`, `helpView`, `menuView`,
`claimView`, `privacyView`, `controlsView`, `controlsSavedLine`, `sessionView`,
`evolutionNoticeBanner`, `errorOverlayView` and `hintBarView`. `main()` keeps every construction
with its handler closures (rule 8) and hands each instance to the owner function the plan
proposes as `mountViews`, in the same statement order; it builds into a local any instance it
uses again in the same function and mounts that local (rule 3). `views.ts` imports no shell
module.

Pins: none in the plan's table. `client/src/ui/overlayRegistry.test.ts`,
`client/src/main.a11yFocus.test.ts` and `client/src/main.dispatch.test.ts` name these handles as
overlay ids, not as `main.ts` text, and are not edited. Covering tests: the
`client/src/main.*.test.ts` suites (`main.dispatch`, `main.a11yFocus`, `main.menu`, `main.help`,
`main.hintBar`, `main.frameErrorWiring`, `main.controls`).

- **ST6.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST6.2:** WHEN the client's full vitest suite runs IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: no handle above is declared in `main.ts`;
each is assigned only inside `shell/views.ts`; no construction left `main()`; its plan line is
gone.

### st-7 — client shell: the live input devices get an owner
type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/inputState.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, docs/refactors/client-shell.md, ARCHITECTURE.md
after: [st-6]

Extraction 3 of `docs/refactors/client-shell.md`, an ownership change.
`client/src/shell/inputState.ts` is created and takes `bindings`, `keyboard`, `held`,
`inputRouter`, `navHeldCodes`, `releaseAllInput` and `applyBindings`. `navHeldCodes` is exported
as a `ReadonlySet` (rule 2); its adds in `onKeyDown` and `captureControlsKey` and its delete in
the keyup listener become calls to the owner functions the plan proposes as `noteNavHeld` and
`releaseNavHeld`. `bindings` and `keyboard` are assigned only inside the owner. `held` and
`inputRouter` are used through their own methods. The keyup listener stays registered in
`main.ts` in its place in "Registration order" (rule 4). `inputState.ts` imports no shell module.

Pins: none in the plan's table. Covering tests: `client/src/main.input.test.ts`,
`client/src/main.remap.test.ts`, `client/src/main.controls.test.ts`,
`client/src/main.accel.test.ts` and the other `client/src/main.*.test.ts` suites; the
`client/e2e` controls and d-pad specs exercise the same paths in a browser.

- **ST7.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST7.2:** WHEN the client's full vitest suite runs IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: the seven names are declared in
`shell/inputState.ts` and nowhere in `main.ts`; no module outside the owner mutates
`navHeldCodes` or assigns `bindings` or `keyboard`; its plan line is gone.
