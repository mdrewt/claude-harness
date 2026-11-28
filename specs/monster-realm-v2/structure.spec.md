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

### st-23 — decision log: the desktop-shell entry left by st-20

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-20, lpw-10]
- Supervisor, 2026-11-28 (st-20's section: an entry another open slice rewrites is left for that slice, then sectioned here `after:` it). st-20 (#913) left "The desktop shell is Electron; a preload script hands the client its connection" byte-identical, because lpw-10's DoD amends it. Once lpw-10 has merged, that one entry is brought to `standards/decisions.md` on st-20's terms: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer; mechanics move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to its record (`docs/local-play.md` §2) when one exists. The entry is not merged with another or deleted, and its title stays unless lpw-10's amendment changed it.

- **st-23.1:** WHEN the slice merges, THE SYSTEM SHALL state each reason and each "rules out" clause the entry held after lpw-10's amendment, or name its removal in the PR with the reason.

- **st-23.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of the entry in the document the PR's `moved:` row names, and every fact kept in the entry SHALL match the code at the merge base.
- DoD: st-23.1 and st-23.2 answered by the reviewer with citations; no file but the two in `touches:` changed.

### st-27 — client platform: the request notices

type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/notices.ts, client/src/shell/notices.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/catalogParity.test.ts, docs/refactors/client-platform.md, docs/refactors/client-shell.md, ARCHITECTURE.md
after: [st-26]

Extraction 4 of `docs/refactors/client-platform.md` §4, an interface change (owner functions).
`client/src/shell/notices.ts` takes `dismissedRequests`, `announcedRequests`,
`answeredRequests`, `noticeInput`, `livePending`, `requestLine`, `releaseAnswered` and
`openedTradeSessions`. `dispatch`, `worldPort`, `openTradeEditor`, `resetTradeSessionState`,
the listener that announces a new request, the listener that follows the trade sessions and the
`connect` callbacks in `main` mutate the four sets today; each mutation becomes a function the
module owns, and those callers stay in `main.ts` and call it. `dispatch` is reached through the
command port (`shell/commandPort.ts`, st-26), so the module imports no other shell module for
it. The sets' contents, the order of every mutation and every string the notices show stay as
they are. Measured at `af826856`: all eight names, `dispatch`, `worldPort`, `openTradeEditor`,
`resetTradeSessionState` and `main` are declared at the top level of `client/src/main.ts`; no
`client/src/shell/notices.ts` exists. The run measures the names again at its base.

Pins: none known. The source-text pin in `client/src/main.dispatch.test.ts` (SO2) reads
`movementGate`, `worldBaseLive`, `overlayProbes`, `overlayHandles` and `screenViews`, none of
which moves here. `catalogParity.test.ts` gains the module in its roster if the module resolves
a string. Covering tests: `client/src/main.notices.test.ts`, `client/src/main.noticesRt.test.ts`,
`client/src/main.reconnectStack.test.ts`; the run adds `client/src/shell/notices.test.ts` for
the owner functions.

- **ST27.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST27.2:** WHEN the client's full vitest suite runs IT SHALL pass, with
  `client/src/shell/notices.test.ts` passing.

Confirmed in the diff at merge, not by a criterion: the eight names are declared in
`shell/notices.ts` and nowhere in `main.ts`; no caller outside the module adds to or deletes from
the four sets except through an owner function; `notices.ts` registers nothing on `store`,
`window` or `document`; its plan line is gone.

### st-28 — client platform: the battle frame

type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/battleFrame.ts, client/src/shell/battleFrame.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/catalogParity.test.ts, docs/refactors/client-platform.md, docs/refactors/client-shell.md, ARCHITECTURE.md
after: [st-27]

Extraction 5 of `docs/refactors/client-platform.md` §4, an interface change (a battle port).
`client/src/shell/battleFrame.ts` takes the forty-four names the plan's row 5 lists, from
`battleViews` to `holdResultsForPlayback`, and the body of the listener that feeds
`serverClock`. The interface the module gives `main.ts`: the battle port (the stack reads and the
outcome edge), the `battleMount` mount, a reset for the lines `resetPredictionState` resets
(`resultsAwaitDrain` and `serverClock` among them) and the latch `closeFrame` writes.
`resetPredictionState` and `closeFrame` stay in `main.ts` and call it. `buildDeployPanel`,
`buildResultsPanel`, `tacticsShellDeps` and `popOverBattleBeforeSwitch` keep reaching `dispatch`
and `applyStack` through the command port. Registration order, the panels' DOM and every
asserted value stay as they are. Measured at `af826856`: all forty-four names,
`resetPredictionState` and `closeFrame` are declared at the top level of `client/src/main.ts`;
no `client/src/shell/battleFrame.ts` exists. The run measures the names again at its base. This
row moves boot wiring, so it runs the end-to-end suite as well.

Pins: none known; SO2 in `client/src/main.dispatch.test.ts` reads no name this row moves.
Covering tests: `client/src/main.dispatch.test.ts`, `client/src/main.battle-reseed.test.ts`,
`client/src/tactics/tacticsBattle.test.ts`, `client/src/tactics/deployPanel.test.ts`,
`client/src/tactics/results.test.ts`; the run adds `client/src/shell/battleFrame.test.ts` for
the port.

- **ST28.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST28.2:** WHEN the client's full vitest suite runs IT SHALL pass, with
  `client/src/shell/battleFrame.test.ts` passing.
- **ST28.3:** WHEN `just e2e` runs at the slice's head IT SHALL pass with no spec edited.

Confirmed in the diff at merge, not by a criterion: the forty-four names are declared in
`shell/battleFrame.ts` and nowhere in `main.ts`; `main.ts` reaches the battle state only through
the port; the listener that feeds `serverClock` registers in the same order as before; its plan
line is gone.

### st-29 — client platform: the frames and the context stack

type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/frames.ts, client/src/shell/frames.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/catalogParity.test.ts, docs/refactors/client-platform.md, docs/refactors/client-shell.md, ARCHITECTURE.md, docs/DECISIONS.md
after: [st-28]

Extraction 6 of `docs/refactors/client-platform.md` §4, an interface change.
`client/src/shell/frames.ts` takes the thirty-six names the plan's row 6 lists, from
`overlayProbes` to `worldIsBare` (`contextStack`, `syncStack`, `reconcileStack`, `movementGate`,
`worldBaseLive`, `openFrame` and `hideFrame` among them). The interface: `main` sweeps
`contextStack` on reconnect and writes `autoContinuedAtMs` and `lastCareTickAtMs` in the frame
loop, each through a function the module owns; the battle frame (st-28) clears
`outcomeShownAtMs` and `autoContinuedAtMs` through its port. Measured at `af826856`: all
thirty-six names are declared at the top level of `client/src/main.ts`, `contextStack` as a
`let`; no `client/src/shell/frames.ts` exists. The run measures the names again at its base.

Pins: SO2 in `client/src/main.dispatch.test.ts` reads `main.ts`'s source for `movementGate`,
`worldBaseLive` (SO2-5) and the three mirrored tables `overlayProbes`, `overlayHandles`,
`screenViews` (SO2-6), all of which move. Disposition: the two needles read
`client/src/shell/frames.ts` instead; the file path is the only edit, and every expectation and
message in SO2 stays byte-identical. `docs/DECISIONS.md` "Context stack ownership" names
`main.ts` as the stack's home and is rewritten in place to name `shell/frames.ts`. Covering
tests: `client/src/main.dispatch.test.ts`, `client/src/main.reconnectStack.test.ts`,
`client/src/main.a11yFocus.test.ts`; the run adds `client/src/shell/frames.test.ts` for the
owner functions.

- **ST29.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited, the SO2 source path the one change.
- **ST29.2:** WHEN the client's full vitest suite runs IT SHALL pass, with
  `client/src/shell/frames.test.ts` passing.

Confirmed in the diff at merge, not by a criterion: the thirty-six names are declared in
`shell/frames.ts` and nowhere in `main.ts`; nothing outside the module assigns `contextStack`;
SO2's diff is its path line only; the DECISIONS entry names the new home; its plan line is gone.
