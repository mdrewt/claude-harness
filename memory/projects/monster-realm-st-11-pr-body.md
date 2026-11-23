Extraction 4 of `docs/refactors/client-shell.md`, an ownership change. A new module, `client/src/shell/feedback.ts`, owns where a message goes: the toast, the world hint, the one live-region announcer, the error ring with its overlay, and the session event ring. `main.ts` imports what it still names and reaches the owner's state through four owner functions. Nothing a player, a test or another module can observe changes.

What the diff is:
- `shell/feedback.ts` (new): `route`, `reportError`, `showToast`, `queueNotice`, `paintToast`, `tickToast`, `setWorldHint`, `topHint`, `hintOnMenu`, `paintWorldHint`, `resetFeedbackSinks`, `announceNow`, `dismissErrorToast`, `pushError`, `reportPaintError`, `eventRing`, `errorRing`, `liveRegion`, `MOVE_REJECT_PREFIX` and the twelve bindings, each an `export let` only this module assigns. Bodies are the base text; the two code changes inside a moved body are `hintOnMenu` asking the hint host (`menuOnTop()`) where it called `menuPlace() === 'top'`, and `paintWorldHint` calling the host's `repaintMenu()` where it called `renderMenu()`. It imports `./views` and no other shell module, registers nothing on `store`, `window` or `document`, and resolves no catalog string at module scope.
- Owner functions: `installHintHost(host)` (a host member read before the install throws); `mountFeedback(mounts)` (a partial: an omitted element keeps its value); `pumpAnnouncements({ now, topOverlay, countdownSaid, returnFocus })`, which is the frame loop's announcement edge and notice step statement for statement, with `returnFocus()` where the focus statement stood; `resetStatusNotice()`.
- `main.ts`: the declarations leave. It installs the hint host at module scope ahead of `const store` (so ahead of every registration), calls `mountFeedback` once per element in place of each of the two assignments in `main()`, calls `resetStatusNotice()` in `onReconnect` where it assigned `statusNotice`, and calls the pump in the frame loop where the edge and the step stood (after the care tick, before the privacy step). The `window` `error` and `unhandledrejection` registrations stay where they were ("Registration order" item 3) and call the imported `pushError`. `lastFrameErrorMessage` stays. Imports only the moved code used are dropped.
- Import time: three constructions (`new EventRing`, `new ErrorRing`, `new LiveRegion`) now run while `main.ts`'s imports evaluate. None reads the DOM, storage, the locale or a clock at construction.
- Docs: plan line 4 and the four `feedback.ts` rows of "Owner functions the extractions add" are deleted; the plan's Ports, Pumps and Owners rows read as built; `docs/DECISIONS.md` "Four message channels, chosen by one policy table" names `client/src/shell/feedback.ts` for the sinks and says which of `main.ts`'s senders name a kind; `ARCHITECTURE.md` §Client describes the module.

## Acceptance
Acceptance: 2/2 met, 0 deferred, 0 unmet — st-11 seed:0d75126ef38ddf5e

- ST11.1: client `tsc`, `biome check .`, `git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts' client/test-util` (no `main.*` suite and no boot stub is in the diff), then the `main.*` suites plus `src/shell/`: 37 files, 857 tests. Before the move: 36 files, 837 tests.
- ST11.2: the full client vitest suite: 248 files, 6329 tests. Before the move: 247 files, 6309 tests. `catalogParity.test.ts` PARITY-02 asserts the union directly: the i18n keys `main.ts` and `shell/feedback.ts` resolve together equal `main.ts`'s list (that key-list assertion is byte-identical to the base), and the a11y keys they resolve together equal `['a11y.world.region']`.
- Full local `just ci` at the slice head `5f87ce03` on `16e2cb3c`: exit 0. Rust nextest 3417, 1120 and 3089 tests; account-service 12 files / 596 tests; 15 of 15 evals; client 248 files / 6329 tests; `verify-build-hooks` OK; observability validate 9 checks, 0 failed.
- `just e2e-shards` at the same head against a private in-memory SpacetimeDB: 8/8 shards ok, 260 passed and 1 skipped. The skip is `recruit.spec.ts` R4, a `test.fixme` that predates this slice. No e2e file is in the diff.

Red seam (testing-tdd §Behavior-preserving changes): the tester's files were committed alone (`c7092814`) before the move (`428073bd`). At that commit `client/src/shell/feedback.test.ts` failed to load (`Failed to resolve import "./feedback"`) and PARITY-02 failed with `shell/feedback.ts missing from the census walk`. The seam file boots the real `main.ts` on the real `index.html` shell and reads the owner back through `./feedback` from the same module registry, with no mock of the destination; a second block drives the owner functions directly on a fresh registry. It has 20 tests.

Wrong implementations, each written out and run (the orchestrator's 72 in the worktree with the committed text restored after each; the red-team's and the verifier's in sandbox copies): of the 72, the seam file kills 64, existing `main.*` suites kill 6 more, and 2 survive every test (a storage read at import, which the plan allows, and a second clock read, which nothing can observe).

| Wrong implementation | Result |
|---|---|
| `main.ts` keeps the whole base text (private copies of everything) while the owner module exists | killed by every boot test |
| hint host always true, always false, a no-op repaint, never installed; `installHintHost` ignoring its argument; a host that answers silently before the install; `hintOnMenu` inverted; the menu repainted on every paint or never (9) | killed |
| the status element or the toast never mounted, or mounted detached; `mountFeedback` ignoring a member or clobbering the one it omits (8) | killed |
| `resetStatusNotice` not called on reconnect, or a no-op; `resetFeedbackSinks` not called; `tickToast` not called (4) | killed |
| `resetStatusNotice` also called in `onReady` (red-team) | killed by the ready-edge test added after that lens; before it, this survived the seam file and every `main.*` suite |
| the pump not called, called twice per frame, or handed a top overlay that is always null (3) | killed |
| inside the pump: the focus return on every frame, never, or before the world region is announced; the top overlay read twice; `announcedSinceFrame` never cleared or not counted; the flush dropped or on the wall clock; the countdown line not said or not counted; the snapshot never advanced or advanced before the focus return; the world region or the edges not said; the notice not spoken or its state dropped; a flush ahead of the edges; the notice step on the wall clock (18) | killed |
| inside the pump: the world edge, or the edges, not counted as a transition (2); in `main.ts`: the countdown line passed as null; the focus-return closure unconditional or a no-op (3) | survive the seam file, killed by `main.dialogueEnded`, `main.dispatch` and `main.a11yFocus` |
| the `error` listener gone, or pushing into a private ring (2) | killed |
| the `unhandledrejection` listener gone | killed by a test added after the first battery; before it, no test in the client suite killed it |
| `pushError` without its re-entrancy guard | killed by a test added after the first battery; before it, no test in the client suite killed it |
| the owner at import: its own `error` listener on `window`, a `document` listener, a document write, a storage write, a catalog resolve (5) | killed |
| the owner at import: a storage read | survives. Plan rule 5 allows a shell module a storage read at import |
| moved-body logic: `announceNow` not marking the frame, `showToast` not queueing, the channel inverted, `reportError` skipping the ring, a dismissal that keeps its sequence, breadcrumbs on the overlay, the reconnect reset keeping link hints, dropping `content-stale` or keeping the toast, a toast that never expires, a paint error not deduped (11) | killed |
| the hint said on every paint | survives the seam file, killed by `main.input` (5 tests) |
| `main.ts` passing a second `performance.now()` read as the pump's `now` | survives everything. The harness clock holds one value across a frame, and so does a real frame to within the cost of the statements between the two reads. The tester named this limit before the run |
| red-team's own: a second `installHintHost` later in `main()`; the pump also called under the session-gate return; the reset keeping the toast state; the a11y key through a template literal; a second `t('a11y.world.region')` in the owner | killed |
| red-team's own: `tickToast(now)` also called at the end of the pump | survives. `tickToast` already runs at the top of every frame and `toastStep` returns the same state when nothing expired |
| verifier's own: the countdown not counted as a transition; a covered menu counted as on top; `setWorldHint` not evicting `download-blocked`; the focus return without its close guard | killed |
| a census that credits every call of a two-import file to the i18n resolver | killed by fixture (j) of the PARITY-02 fixtures test, after the reviewer's finding; it survived the first version of the pin edit (measured against `d357c662`) |

Production bundle (red-team, `vite build` of the base and of the slice head in sandboxes): 130 assets in both; entry chunk 863.80 kB at the base and 864.24 kB at the head; `verify-build-hooks` OK on both. In the unminified head bundle the only statements that now run ahead of the locale block are the three constructions and the port's initial value.

## plan-delta
- **`queueNotice` moved, though the section's list omits it.** It assigns `statusNotice`, and only the owner may. Its one outside caller, `tacticsShellDeps().announce` in `main.ts`, also reads `statusNotice.queued` through the live import, so the plan's Owners row for `statusNotice` now lists a reader (`battleFrame`, where that code goes in extraction 8). `protocolMismatchLine` sits in the same line range, is named by no extraction line, and stayed in `main.ts`.
- **The resolver roster did not gain the module.** `shell/feedback.ts` resolves only `a11y.world.region`, through a11yCopy's `t`, and imports no i18n resolver. The roster assertion is unedited.
- **The two-binding proof did not move to a real file.** After the move no non-test file under `client/src` imports both `t` functions. PARITY-02 pins each binding on its own file (`main.ts`: the i18n list, unedited, and no a11y call; `shell/feedback.ts`: exactly the one a11y literal call and no i18n call), and fixture (j) of the fixtures test, which holds the dual-import shape, now asserts the module of each call.
- **The pump's parameter object has four members.** `now`, the frame's clock reading, is a local of the frame loop and arrives in the object beside the three the plan names; the plan's Pumps row says so now.
- **`client/src/net/oidc.test.ts` is not edited.** Both of its comments stay true: the path to the error ring still runs through `main.ts`'s callback, and `main.ts` still holds the `reportError` call sites. The tester judged each.
- **`topHint` is not exported.** Nothing outside the owner reads it.
- **The seam file grew twice after the move, each time for a measured survivor**: the `unhandledrejection` test and the re-entrancy test, then the ready-edge test. Their red run is the wrong implementation each kills, not the base tree.
- **ST11.1's EXPECT pins the exact counts** (37 files, 857 tests).
- **The orchestrator wrote the plan from measurement and a probe; no `planner` subagent ran.** Before any test existed the move was applied once, type-checked, linted and run against the full client suite with no test edit: 246 of 247 files passed and the one failure was the PARITY-02 pin the spec names. It was then reversed and kept as a patch outside the tree until the tester's files were committed.

## moved-tests
- `client/src/ui/i18n/catalogParity.test.ts :: m24s7/21r-b PARITY-02: I18N-27 — import-binding resolution + the 28-file resolver roster + main.ts dual bindings` -> `client/src/ui/i18n/catalogParity.test.ts :: m24s7/21r-b PARITY-02: I18N-27 — import-binding resolution + the resolver roster + the main.ts and shell/feedback.ts keys per binding`. One assertion is replaced (`main.ts` a11y keys equal `['a11y.world.region']`) by three: `main.ts` makes no a11y call, `shell/feedback.ts` makes exactly that one literal a11y call and no i18n call, and the per-binding unions. The roster and `main.ts`'s i18n key list are byte-identical.

No test was deleted or cut from one file into another. `client/src/shell/feedback.test.ts` is new.

## touches-delta
none

## boyscout-delta
- `client/src/main.ts:2593-2594` — the movement-rejection comment said what an F9 bundle "used to show"; it states the reason in the present tense.
- `client/src/main.ts:4762`, `client/src/main.ts:4928` — two comments beside edited statements lose a slice-id prefix; the second says "the dropped link".
- `client/src/shell/feedback.ts` — the comments that moved with the code carry no slice, criterion or finding ids.
- `docs/DECISIONS.md` "Four message channels" — "the qf-6 notice pump" reads "the notice pump".
- `client/src/ui/i18n/catalogParity.test.ts` — the PARITY-02 title drops "28-file": the roster lists 33 files (the tester's edit).

## Spec notes filed (`mr-gates notes`, pending for the supervisor)
- n1: `queueNotice` and the `statusNotice` reader; `protocolMismatchLine` has no extraction line.
- n2: the catalogParity disposition as measured.
- n3: the pump's four members; every binding an `export let`; `mountFeedback` once per element.
- n4 -> residual `R-st-11-X-comments` [loop-ops/LOW]: six comment sites outside `touches:` still name `main.ts` for what moved (`ui/feedbackPolicy.ts:161`, `ui/liveRegion.ts:5-6,14`, `ui/announcements.ts:28-29`, `ui/errorOverlayView.ts:18,33`, `tactics/tacticsBattle.ts:143`, `client/vite.config.ts:161`). A refactor slice never widens, and none is a pin.
- n5: `oidc.test.ts` left unedited, and the two behaviours that had no test at any level.

## Review lenses
- **Plan (before the tests):** reviewer and red-team, no blocker. Adopted: every binding an `export let` (rule 1); `now` inside the pump's parameter object; `mountFeedback` once per element so no statement order changes; the port's private binding renamed so `route`'s `hintHost` parameter does not shadow it; no new "imports both" roster in the pin.
- **reviewer (artifact):** no blocker. One major, closed by the tester: fixture (j) did not assert which import each call is credited to. Minors closed: the DECISIONS sentence implied the battle refusal names a kind; the plan named one later extraction for that entry where two edit it; the plan's roster row said "resolves a catalog key" where it means "imports the resolver"; ids in the edited pin and the owner's comments. Kept, with the reason: `WF1-A9` and `M2 §3` stay in the owner's comments because they cite the wireframe table and the spec section the rule comes from, as the DECISIONS entry itself does.
- **red-team (artifact):** no behaviour difference between the base and the head; the bundle comparison and the table rows above. Its one real survivor, a reset added to `onReady`, is closed by the ready-edge test.
- **simplify:** nothing to remove from what the move added. The throwing initial host is the port with no accessor function; the partial mount follows `mountViews`; `topHint` lost its export.
- **verifier:** PASS on ST11.1, ST11.2, the red seam's commit order, test integrity, the spec's five merge-time confirmations, scope and the doc hunks; its four own mutants were killed.
- **reducer-security-auditor / desync-guard:** not applicable; the diff has no server-module, game-core or client-wasm file.
- **doc-keeper:** not spawned; the orchestrator made the three doc edits and the reviewer and the verifier each checked them against the code. No new `docs/DECISIONS.md` entry: the owner-module decision is recorded and this slice applies it; the "Four message channels" entry is rewritten in place as the spec orders.

Tester findings, apart from tests: the PARITY-02 title's roster count was wrong before this slice (fixed in the title); `ui/announcements.ts` and `ui/errorOverlayView.ts` comments name `main.ts` (in n4); whether `installHintHost` may be called twice is not stated by the plan (it replaces the host; `main.ts` calls it once).

comment-scan: CLEAN

Items: none

## not-verified
- gitleaks and cargo-audit run remote-only.
- The remote e2e job on the PR merge ref; the local sharded run is reported above.
- The red-team's bundle comparison and its own variants, and the verifier's four mutants, ran in their sandboxes (`/tmp/st11-rt.vDLxWk`, `/tmp/st11-vf.rsysC1`) and were not re-run by the orchestrator. The red-team's `tickToast`-in-the-pump variant was not run against the `main.*` suites.
- The six `main.*`-suite kills of seam-file survivors were measured at `428073bd`; the commits after it change comments, docs, tests and one `export` keyword.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
