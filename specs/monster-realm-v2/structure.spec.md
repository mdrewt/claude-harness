# Structure — open refactor slices

The standing backlog of structural work on the game repo: moves, extractions and interface
changes that leave behaviour unchanged, and the design slices that decide how. Every section is
a `type: refactor`, `type: design` or `type: docs` slice bound by `standards/spec-driven.md` §Refactor slices,
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
  ownership change) `type: design · tier: hard` or `type: docs · tier: routine`, `touches:`, `after: [...]`, and `blocked: <reason>` while an operator
  decision is open; then what moves (exported symbols, never line numbers), each pin with its
  disposition, the tests that already cover the moved behaviour, and id-led `SHALL` criteria
  whose checks are test-runner invocations (a `type: docs` section moves no code: its criteria
  are checked by reading, per `standards/spec-driven.md`).
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

### st-21 — client platform: one client, any desktop shell (design)

type: design · tier: hard
touches: docs/refactors/client-platform.md, docs/refactors/client-shell.md, ARCHITECTURE.md, docs/DECISIONS.md
after: []

- Operator, 2026-11-23. Before M-local-play's overlay probe (lpw-10), the client gets a cross-cutting refactor that adds and removes no feature. The aim is code that is clean, DRY, reusable and extensible, and easy to maintain and change, with most of it shared by an Electron shell and a Tauri shell whatever the probe finds. The two shells differ only where their frameworks force it. In the best case both draw the overlay and run the same bundle, and lpw-10 compares them like for like. The standing rule is PLAN's "Three ways to play, one codebase": client code is shared across shells, never forked.
- The design is the plan file `docs/refactors/client-platform.md`, in three parts:
  - **The host seam.** Every place the client reaches something a shell provides differently, measured from the code by symbol and file. These are: how the shell document and connection target arrive (`__MR_SHELL_CONFIG__`, `client/src/net/shellDocument.ts`); persistent storage; opening an external link and saving a file (the data export, the bug bundle); window, fullscreen and visibility; input sources (the keyboard, the gamepad, and later Steam Input onto the same virtual buttons); and the Steam calls a shell may offer (overlay activation, the auth ticket acs-12 hands over, achievements). Each concern gets one port. The browser build is the only adapter this work writes, and no Electron or Tauri code is written. A port is cut from concrete call sites: one with a single implementation and no second host that needs it is not added.
  - **The rest of `docs/refactors/client-shell.md`**, its extractions 7 to 18. Each is kept, reordered or superseded by name, and none is dropped silently.
  - **Duplication and structure across `client/src/`** (`ui/`, `render/`, `net/`, `input/`, `tactics/`, `shell/`). Each finding is either an extraction with its owner module or recorded as not worth moving, with the reason.
- At least two seam shapes are judged, for example one host object injected at boot, and per-concern ports under `client/src/platform/` with the adapter chosen at build time. They are scored on what each shell must write, how they test with the client's existing fakes, and what leaves `main.ts`. A `judge` scores them.
- The plan lists its extractions in order, one slice each, per `standards/spec-driven.md` §Refactor slices: move or interface, never both, with `touches:` measured. The supervisor sections them three at a time as usual. The PR that sections the last one adds that id to lpw-10's `after:` in `M-local-play.spec.md`.

- **ST21.1:** WHEN the design is recorded, THE SYSTEM SHALL list in `docs/refactors/client-platform.md` every client call site that reaches a host-provided capability (symbol and file), the port that owns it, and what a browser, an Electron and a Tauri adapter would each provide for it.
- **ST21.2:** WHEN the design is recorded, THE SYSTEM SHALL list its extractions in order, each with whether it is a move or an interface change, its tier, the modules it creates and the tests that already cover the moved behaviour, and SHALL name every remaining extraction of `docs/refactors/client-shell.md` as kept, reordered or superseded.
- **ST21.3:** WHEN the design is recorded, THE SYSTEM SHALL state, for each extraction, that it adds and removes no feature, and SHALL list every defect found along the way as a finding for a tracked follow-up, never a fix inside a refactor slice.
- DoD: the plan; a judge's scores over the seam shapes; a `docs/DECISIONS.md` entry for the chosen seam; `ARCHITECTURE.md`'s client section naming the plan.

### st-14 — decision log: foundations and rules

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [lpw-27]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "One repository, one cargo workspace" to "Tactical content lives in sidecar registries keyed by id", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-14.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-14.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-14.1 and st-14.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-15 — decision log: server authority, privacy, zones and sessions

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-14, lpw-26, lpw-29]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "Server authority: thin reducers in domain modules" to "World rows are subscribed by zone", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-15.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-15.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-15.1 and st-15.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-16 — decision log: prediction, movement input and scaling

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-15]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "Bounded client prediction" to "Integer pixel scaling", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-16.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-16.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-16.1 and st-16.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-17 — decision log: gameplay rules: evolution, trade, economy, battle

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-16]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "Evolution graph and the auto-evolve rule" to "Wild AI plans are a pure function of the public board", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-17.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-17.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-17.1 and st-17.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-18 — decision log: accounts, lifecycle, schema and operations

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-17, lpw-32, lpw-34, lpw-36]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "Accounts, guest identity and the claim flow" to "Observability: the module never times itself or calls out", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-18.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-18.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-18.1 and st-18.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-19 — decision log: client UI and rendering

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-18, lpw-30]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "Client UI: virtual buttons, one context stack, one overlay frame" to "The world post stack is `pixi-filters`, on the world layer only, planned from injected time", in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-19.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-19.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-19.1 and st-19.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-20 — decision log: local play, access and the account service

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-19, lpw-35, lpw-37]
- Operator, 2026-11-22 (decision review, concern 7). The entries of the game's `docs/DECISIONS.md` from "The connection target is run-time configuration: a shell document set before the client module runs" to the last entry of the file, in file order, are brought to `standards/decisions.md`: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer. Mechanics (which function, which table, which test) move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to the record that made it when one exists, and otherwise stays as one sentence with its date; a fact a reader can re-derive from the code in a few minutes is dropped. A reason that names a test, a file list, a baseline or a hash is rewritten or reported as a finding. An entry another open slice's section says it rewrites is left for that slice: the PR lists each entry left, and the supervisor appends one `type: docs` section for them, `after:` the slices that hold them. No entry is merged with another or deleted here.

- **st-20.1:** WHEN the slice merges, THE SYSTEM SHALL state, for every entry in the range, each reason and each "rules out" clause it held before, or name its removal in the PR with the reason.

- **st-20.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of an entry in the document the PR's `moved:` row names, and every fact kept in an entry SHALL match the code at the merge base.
- DoD: st-20.1 and st-20.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-22 — M-gamepad: twin tests and unreached symbols from the close census
type: refactor · tier: routine
touches: client/src/input/bindingStore.test.ts, client/src/input/glyphs.test.ts, client/src/input/glyphs.ts, client/src/ui/controlsModel.test.ts, client/src/ui/controlsModel.ts, client/src/ui/controlsView.test.ts
after: []

`mr-prune close` listed these rows for `M-gamepad` at `40bc77085557469f0ac0f1c2f97050d1c281571e`.
Each is a candidate, never a reason to delete (`standards/testing-tdd.md` §Deleting a check
is legitimate). The run that builds this section reads each pair and each symbol's tests
first and removes only the rows it confirms. A row it does not confirm stays, with its
reason in the PR body; a pair kept on purpose is recorded with `mr-prune keep`. A twin's
candidate is deleted and its survivor stays; a symbol is deleted with the tests that reach
only it. Each deleted test has a `moved-tests:` row in the PR body. A name below is a JSON
string.

- `client/src/input/glyphs.ts` :: "resetLearnedKeys"
  - reason: a symbol no production file names
  - surviving check: the compiler, and the suites that still run
  - confirmed at merge: the supervisor, who is not the tester that made the deletion, checks that `mr-prune census` on the PR base lists the symbol under `orphans`, and reads the `moved-tests:` rows of the tests removed with it from `client/src/input/glyphs.test.ts`, `client/src/ui/controlsModel.test.ts`, `client/src/ui/controlsView.test.ts`
  - M-gamepad's spec judged it a test-reset hook kept on purpose: it resets the `learnKey` state in the `beforeEach`/`afterEach` of three suites, so no test reaches only it. The build confirms that judgement and records `mr-prune keep`, or names the reset that replaces it in the PR body.
- `client/src/ui/controlsModel.ts` :: "controlsRows"
  - reason: a symbol no production file names
  - surviving check: the compiler, and the suites that still run
  - confirmed at merge: the supervisor, who is not the tester that made the deletion, checks that `mr-prune census` on the PR base lists the symbol under `orphans`, and reads the `moved-tests:` rows of the tests removed with it from `client/src/input/bindingStore.test.ts`, `client/src/ui/controlsModel.test.ts`

Pins: none known. Before the first edit the run looks for tests that read a listed file
as text, and for `.cargo/mutants.toml` entries and bench budgets that name a removed
symbol; each is disposed of under `standards/testing-tdd.md` §Behavior-preserving changes.
A removed symbol can still be named outside `touches:`: by a `use` or a re-export, a bench,
a test file the census does not read, or another symbol that only tests reach. The
compiler finds each. A row whose removal needs a file or a symbol not listed here stays,
with that reason in the PR body.

- **ST22.1:** WHEN the client is type-checked and its vitest suites run THEY SHALL pass.

Confirmed in the diff at merge, not by a criterion: each deleted test has its
`moved-tests:` row, and the run removed no row it did not confirm.
