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
- Input: `$MEM/readshare-2026-11-26.txt` (per-file read volume into agent contexts, 40 runs: `client/src/main.ts` is read in 22 of 40 at about 73k characters per reading run). Among the orders the module map allows, the plan prefers extractions that move the most code out of `client/src/main.ts`, and names the extraction after which those reads are measured again the same way; a drop under 25% is a non-blocking operator question, not a ranking tool (harness DECISIONS "Structural work is not ranked by a tool").
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

Build note (st-20): st-20: twenty-one of the twenty-four entries stay over standards/decisions.md's
25 lines after the rewrite (heading to pointer line, blanks included): A private world checks an
account itself 109, A world that is not open 79, Ownership is enforced 64, One character per account
60, An attestation names the server 50, Every player must own the game on Steam 50, A target's kind
49, Private servers 47, The account service 43, A browser binds 42, The official build 37, The
client learns 36, The connection target 33, Local-play budgets 31, Ports 31, Ed25519 30, The gate
checks a world's password 29, Sized for 1,000 28, Desktop token 27, Electron 27 (left for lpw-10),
e2e rerun listing 26. st-20.1 keeps every held reason and rules-out clause verbatim; the Why and
Rules-out paragraphs alone pass 25 lines in the long entries, and no reviewer pass named a clause
that could go. 'Every player…' and 'The account service…' grew in physical lines only because their
before-text held lines of 1,000+ characters. Several entries hold more than one decision (the
private-world check holds first contact, the re-check, the host check and the address rule); a split
is outside a docs slice.

Build note (st-20): st-20 finding: docs/DECISIONS.md 'The connection target is run-time
configuration…' Why keeps 'and the unit suites that import main.ts issue no request', a reason
resting on tests (standards/decisions.md). Two product rewrites were tried and the reviewer refused
both as false: importing main.ts runs main(), which fetches chunks and connects
(client/src/main.ts:5634), and the page's /shell-config.js is itself a request
(client/index.html:155). The fetch's real cost (the throw leaves module scope) is already in the
entry's Rules out. The next edit of the entry drops the clause or gives a product reason.

Build note (st-20): st-20 finding (reviewer pass 3): the code comment at
server-module/src/accounts.rs:75-76 says a world build with no published production key 'accepts no
binding and entitles nobody', mixing two reasons: the missing key stops binding (accounts.rs:75-77),
and the placeholder world-check address stops entitlement (accounts.rs:92-96). docs/DECISIONS.md
'The official build holds no attestation key…' and ARCHITECTURE.md Build profiles now give each its
reason. A comment-accuracy fix outside st-20's touches.

Build note (st-20): st-20 -> acs-15: acs-15's DoD ('no document but the design record states the
attestation as current') will need to rewrite docs/DECISIONS.md 'The attestation is signed with
Ed25519…', 'An attestation names the server…', 'A browser binds a friends server…', 'The official
build holds no attestation key…' (its key half) and the attestation sentence of 'The account service
is our own small OIDC issuer…', and ARCHITECTURE.md Private worlds (The attestation check, World
names, Build profiles). acs-15's section names none of these entries, so st-20 rewrote them to the
decision-log shape; acs-15 does not list docs/DECISIONS.md's sibling ARCHITECTURE.md in touches.

Build note (st-20): st-20 gate run: just ci went red at account-test in 2 of 2 full runs, and just
account-test alone red in 2 of 2, each time one test, account-service/src/deployment.test.ts 'the
local-dev recipe > discovery is served through Caddy…' (connect ECONNREFUSED 127.0.0.1:<port> after
60 s), the Docker Desktop port-forward flake of R-lpw-39-NOTE8318F6. The same file alone passed
14/14 and the whole account-service suite with --no-file-parallelism passed 2862/2862; the slice
changes only docs/DECISIONS.md and ARCHITECTURE.md. The flake has grown from 'a different test each
run' to the same test every parallel run on this host; a stale container
mr-auth-test-d236a0ce-account-local-dev-1 had been Up 29 hours.

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

Build note (st-22): structure.spec.md st-22 asks for 'mr-prune keep' on the resetLearnedKeys orphan,
but mr-prune keep records twin pairs only: 'mr-prune keep --file client/src/input/glyphs.ts --test
resetLearnedKeys' returns PRUNE-KEEP-FAIL missing. The kept orphan therefore stays in every census;
a census-row keep for orphans (or the spec wording) needs a decision. Also: controlsModel.test.ts
'lists the two tabs, the twelve button rows...' lines that compare controlsRows(...) with
VBUTTONS.map/ACCELS.map now compare the file-local enumerator with its own definition (the deleted
export was their only subject); a test-health slice may drop those two expectations.

### st-23 — decision log: the desktop-shell entry left by st-20

type: docs · tier: routine
touches: docs/DECISIONS.md, ARCHITECTURE.md
after: [st-20, lpw-10]
- Supervisor, 2026-11-28 (st-20's section: an entry another open slice rewrites is left for that slice, then sectioned here `after:` it). st-20 (#913) left "The desktop shell is Electron; a preload script hands the client its connection" byte-identical, because lpw-10's DoD amends it. Once lpw-10 has merged, that one entry is brought to `standards/decisions.md` on st-20's terms: the claim, the reason and what it rules out, in 10 to 25 lines with one pointer; mechanics move to `ARCHITECTURE.md` under the subsystem's heading; a measurement moves to its record (`docs/local-play.md` §2) when one exists. The entry is not merged with another or deleted, and its title stays unless lpw-10's amendment changed it.

- **st-23.1:** WHEN the slice merges, THE SYSTEM SHALL state each reason and each "rules out" clause the entry held after lpw-10's amendment, or name its removal in the PR with the reason.

- **st-23.2:** WHEN the slice merges, THE SYSTEM SHALL hold every passage it moved out of the entry in the document the PR's `moved:` row names, and every fact kept in the entry SHALL match the code at the merge base.
- DoD: st-23.1 and st-23.2 answered by the reviewer with citations; no file but the two in `touches:` changed.
