# Structure — open refactor slices

The standing backlog of structural work on the game repo: moves, extractions and interface
changes that leave behaviour unchanged. Every section is a `type: refactor` slice bound by
`standards/spec-driven.md` §Refactor slices, in build order. This file is standing: it is never
deleted and never counts toward a playtest gate, and an empty `## Slices` means nothing is open.

- **Scheduled by** the supervisor's structural share: the first unbuilt, non-`blocked:` section
  whose `after:` slices are built and whose quiet window is clear. When no earlier PLAN §9 item
  has a launchable slice, sections launch in file order.
- **Written by** a milestone spec author's structure pass (`milestone-loop-prompt.md`, at most
  three sections per spec PR) or the operator. Never by a build run, never by the supervisor
  outside that structure pass, and never to fill the share. Structural findings are not
  residuals.
- **Built** means the game repo's `origin/master` carries a subject naming `<slice id> —`,
  whatever its type, that no later revert undoes. A built section is deleted by the next
  doc-only PR that edits this file. Ids are never reused.
- **Section shape:** heading `### st-<n> — <title>`; then the lines
  `type: refactor · tier: routine` (a move) or `type: refactor · tier: hard` (an interface or
  ownership change), `touches:`, `after: [...]`, and `blocked: <reason>` while an operator
  decision is open; then what moves (exported symbols, never line numbers), each pin with its
  disposition, the tests that already cover the moved behaviour, and id-led `SHALL` criteria
  whose checks are test-runner invocations.
- **`touches:`** names the source and destination files literally and test families as globs
  with a literal directory prefix (`client/src/main.*.test.ts`), never a bare directory.
- A slice that relocates shared mutable state out of `client/src/main.ts` carries
  `blocked: state-ownership` until the game repo's `ARCHITECTURE.md` names the module that owns
  that state.

## Slices

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
