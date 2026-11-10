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
  pass as a doc-only PR), or by the operator. Never by a build run, and never invented to fill the
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
  with a literal directory prefix (`client/src/main.*.test.ts`), never a bare directory.
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
supersedes them in place.

`docs/refactors/client-shell.md` records:

- the target module map: each module, its one responsibility, and what it may import;
- an owner for every module-level mutable binding in `client/src/main.ts`, grouped (context
  stack and overlays, session and claim, prediction and input, per-feature view state, DEV
  hooks), and how other modules reach it;
- the extractions still to make, in order, one line each: the exported symbols it moves and
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
