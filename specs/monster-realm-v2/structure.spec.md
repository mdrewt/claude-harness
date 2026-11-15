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

### st-8 — game-core content: the single-string `parse_*` wrappers leave the API
type: refactor · tier: routine
touches: game-core/src/content.rs, game-core/src/lib.rs, game-core/src/taming/rules_tests.rs, game-core/src/combat/ability_tests.rs, game-core/src/combat/weather_tests.rs
after: []

From the M-econ-onboarding elaboration census (`mr-prune census`, game `9fb5bd25`; callers
re-measured at `5fdc4712`). Ten `pub` wrappers in `game-core/src/content.rs` — `parse_shops`,
`parse_heal_locations`, `parse_quest_defs`, `parse_npc_defs`, `parse_zones`,
`parse_dialogue_trees`, `parse_evolution_paths`, `parse_encounters`, `parse_species`,
`parse_abilities` — are re-exported from `game-core/src/lib.rs` and called only by tests: the
`content.rs` test module, `taming/rules_tests.rs`, `combat/ability_tests.rs` and
`combat/weather_tests.rs`. Every one has a `*_parts` form, which the loaders use. The wrappers and
their re-exports are removed; each caller passes the same RON to the `*_parts` form as one part.
A test whose only subject is a wrapper itself goes under `standards/testing-tdd.md` "Deleting a
check", naming the `*_parts` test that survives it.

The M-econ-onboarding close census (`mr-prune close`, game `cee8c4f2`) routes these ten rows here
and one more: `clamp_position` in `game-core/src/lib.rs`, a `pub fn` that only its own test
`clamp_position_bounds` calls. It is a candidate: the build confirms that no production file or
other crate names it, then removes it with that test under the same "Deleting a check" rule, or
keeps it and gives the caller it found in the PR.

- **ST8.1:** WHEN `cargo nextest run -p game-core` runs IT SHALL pass, with no assertion edited
  other than a re-pointed call.
- **ST8.2:** WHEN `just ci` runs on the slice's head IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: none of the ten names is declared or
re-exported; every deleted test names its survivor in the PR body.

### st-9 — server raising: the test-only `HEAL_COOLDOWN_MS` constant goes
type: refactor · tier: routine
touches: server-module/src/raising.rs, server-module/src/raising_tests.rs
after: []

From the M-identity-handles elaboration census (`mr-prune census`, game `9fb5bd25`; re-measured
at `5fdc4712`). `pub(crate) const HEAL_COOLDOWN_MS` in `server-module/src/raising.rs` is read
only by the `evaluate_heal` boundary cases in `raising_tests.rs`, which pass it as the
`cooldown` argument. The constant is removed. Those cases keep their boundary values (elapsed ==
cooldown is allowed, one ms short is refused, a clock that runs backwards is refused) with a
cooldown local to the test module.

- **ST9.1:** WHEN `cargo nextest run -p monster-realm-module` runs IT SHALL pass, and the three
  `evaluate_heal` boundary cases SHALL still assert the same outcomes.
- **ST9.2:** WHEN `just ci` runs on the slice's head IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: `HEAL_COOLDOWN_MS` is declared nowhere.

### st-10 — M-trade-sessions: twin tests and unreached symbols from the close census
type: refactor · tier: routine
touches: client/src/input/glyphs.test.ts, client/src/input/glyphs.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsView.test.ts, client/src/ui/feedbackPolicy.test.ts, client/src/ui/feedbackPolicy.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/overlayRegistry.ts
after: []

`mr-prune close` listed these rows for `M-trade-sessions` at `0e7a089de2e46fbad06b1c83b170878de3a6940c`.
Each is a candidate, never a reason to delete (`standards/testing-tdd.md` §Deleting a check
is legitimate). The run that builds this section reads each pair and each symbol's tests
first and removes only the rows it confirms. A row it does not confirm stays, with its
reason in the PR body; a pair kept on purpose is recorded with `mr-prune keep`. A twin's
candidate is deleted and its survivor stays; a symbol is deleted with the tests that reach
only it. Each deleted test has a `moved-tests:` row in the PR body. A name below is a JSON
string. The census's fourth row, `game-core/src/combat/resolve.rs` :: "resolve_player_swap", is
not here: `docs/refactors/combat-carried-rules.md` removes it in its extraction line 3.

- `client/src/input/glyphs.ts` :: "resetLearnedKeys"
  - reason: a symbol no production file names
  - surviving check: the compiler, and the suites that still run
  - confirmed at merge: the supervisor, who is not the tester that made the deletion, checks that `mr-prune census` on the PR base lists the symbol under `orphans`, and reads the `moved-tests:` rows of the tests removed with it from `client/src/input/glyphs.test.ts`, `client/src/ui/controlsModel.test.ts`, `client/src/ui/controlsView.test.ts`
- `client/src/ui/feedbackPolicy.ts` :: "MESSAGE_KINDS"
  - reason: a symbol no production file names
  - surviving check: the compiler, and the suites that still run
  - confirmed at merge: the supervisor, who is not the tester that made the deletion, checks that `mr-prune census` on the PR base lists the symbol under `orphans`, and reads the `moved-tests:` rows of the tests removed with it from `client/src/ui/feedbackPolicy.test.ts`
- `client/src/ui/overlayRegistry.ts` :: "OverlayHandles"
  - reason: a symbol no production file names
  - surviving check: the compiler, and the suites that still run
  - confirmed at merge: the supervisor, who is not the tester that made the deletion, checks that `mr-prune census` on the PR base lists the symbol under `orphans`, and reads the `moved-tests:` rows of the tests removed with it from `client/src/ui/overlayRegistry.test.ts`

Pins: none known. Before the first edit the run looks for tests that read a listed file
as text, and for `.cargo/mutants.toml` entries and bench budgets that name a removed
symbol; each is disposed of under `standards/testing-tdd.md` §Behavior-preserving changes.
A removed symbol can still be named outside `touches:`: by a `use` or a re-export, a bench,
a test file the census does not read, or another symbol that only tests reach. The
compiler finds each. A row whose removal needs a file or a symbol not listed here stays,
with that reason in the PR body.

- **ST10.1:** WHEN the client is type-checked and its vitest suites run THEY SHALL pass.

Confirmed in the diff at merge, not by a criterion: each deleted test has its
`moved-tests:` row, and the run removed no row it did not confirm.
