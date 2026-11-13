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
  parked slice gains it in `after:`), or by the operator. Never by a build run, and never invented to fill the
  share. Structural findings are not
  residuals.
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

### st-2 — client shell: module map and state ownership
type: design · tier: hard
touches: docs/DECISIONS.md, docs/refactors/client-shell.md
after: []

`client/src/main.ts` holds the client shell in one module with no exports and about a hundred
module-level `let` bindings. `ARCHITECTURE.md` names owners for some of that state (the context
stack lives in `ui/contextStack.ts`), but nothing says where the rest belongs, so each extraction
would have to invent its own seam. This slice decides it and changes no code.

It reads `client/src/main.ts` in full, with the modules it wires and the `main.*.test.ts` suites
that boot it; the code graphs (`code-intel` skill) answer what reads each binding. It has a
`judge` score at least two decompositions on what each costs in moved state, test re-pointing
and import cycles. The result conforms to the `docs/DECISIONS.md` entries "Context stack
ownership" and "Client UI: virtual buttons, one context stack, one overlay frame", or
supersedes in place only what they say about which module owns what; what a player sees or
presses is not this slice's to change.

`docs/refactors/client-shell.md` records:

- the target module map: each module, its one responsibility, and what it may import;
- an owner for every module-level mutable binding in `client/src/main.ts`, grouped (context
  stack and overlays, session and claim, prediction and input, per-feature view state, DEV
  hooks), and how other modules reach it;
- the extractions still to make, in order, one line each: the symbols it moves and
  whether it is a plain move or changes ownership.

`docs/DECISIONS.md` gets one entry for the decomposition chosen and the one it rules out.

- **ST2.1:** WHEN the client is type-checked and the `client/src/main.*.test.ts` suites run THEY
  SHALL pass.

Confirmed by reading at merge, not by a criterion: the plan names an owner for as many bindings
as `client/src/main.ts` has module-level `let`s at head, none twice; the allowed imports form no
cycle; every symbol an extraction line names exists; and the run's log shows the `judge`.

### st-1 — e2e SQL helpers have one home
type: refactor · tier: routine
touches: client/e2e/stdb.ts, client/e2e/battle-dpad.spec.ts, client/e2e/encounter-battle.spec.ts, client/e2e/evolution.spec.ts, client/e2e/tactics-pvp.spec.ts, client/e2e/tactics-wild.spec.ts, client/e2e/menu-flow.spec.ts, client/e2e/my-battle-privacy.spec.ts, client/e2e/pointer.spec.ts, client/e2e/ui-inventory.spec.ts, client/e2e/ui-whole.spec.ts
after: []

Five e2e specs each define the same `sqlRows` (`battle-dpad`, `encounter-battle`, `evolution`,
`tactics-pvp`, `tactics-wild`) and five define the same `ownerSql` (`menu-flow`,
`my-battle-privacy`, `pointer`, `ui-inventory`, `ui-whole`). One copy of each moves into a new
`client/e2e/stdb.ts`; each of the ten specs imports the helper it called and its local copy is
deleted. The `ownerSql` definitions in `recruit`, `tactics-pvp`, `tactics-wild` and `ui-chrome`
differ in body and stay where they are. This is a move of test scaffolding, so it is the
tester's edit end to end (`standards/testing-tdd.md` §Behavior-preserving changes).

Pins: none. No test reads these specs for their helper text; `client/src/ui/reachability.test.ts`
scans every e2e file for retired control ids, and the moved bodies name none. Covering tests: the
ten specs themselves.

- **ST1.1:** WHEN the ten listed specs run against a live module THEY SHALL pass with every
  assertion unedited.
- **ST1.2:** WHEN the client is type-checked and linted THE e2e tree SHALL pass.

Confirmed in the diff at merge, not by a criterion: each of the ten specs imports its helper from
`./stdb` and its local copy is gone.

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
