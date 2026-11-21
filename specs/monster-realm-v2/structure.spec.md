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

### st-11 — client shell: the message sinks get an owner
type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/feedback.ts, client/src/shell/feedback.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/statusModel.test.ts, client/src/net/oidc.test.ts, docs/refactors/client-shell.md, ARCHITECTURE.md, docs/DECISIONS.md
after: []

Extraction 4 of `docs/refactors/client-shell.md`, an ownership change.
`client/src/shell/feedback.ts` is created and takes `route`, `reportError`, `showToast`,
`paintToast`, `tickToast`, `setWorldHint`, `topHint`, `hintOnMenu`, `paintWorldHint`,
`resetFeedbackSinks`, `announceNow`, `dismissErrorToast`, `pushError`, `reportPaintError`,
`eventRing`, `errorRing`, `liveRegion`, `MOVE_REJECT_PREFIX` and the bindings `statusEl`,
`toastChrome`, `toastState`, `worldHints`, `saidHint`, `menuHint`, `statusNotice`,
`announcedSinceFrame`, `lastA11ySnapshot`, `toastDismissedSeq`, `handlingError` and
`lastPaintErrorMessage`. It imports only `shell/views.ts` among the shell modules. Three
writers sit outside it, each per the plan's "Ports", "Pumps" and "Owners": the hint-host port
(`hintOnMenu` reads whether the main menu is the top frame, `paintWorldHint` repaints the menu)
is installed by `main.ts` at module scope before its first listener; `main()` mounts
`statusEl` and `toastChrome` through owner functions; and the announcement edge and notice step
of the frame loop become one pump owned by `feedback.ts`, called from the frame loop in the
same position with the parameter object the plan names (the top overlay, the line
`pumpStillThere` returned, the world-edge focus return). The `onReconnect` reset of
`statusNotice` becomes an owner call. The `error` and `unhandledrejection` listeners stay
registered in `main.ts` in their place in "Registration order" (rule 4).

Pins, from the plan's "Tests and docs that follow the code": `client/src/ui/i18n/catalogParity.test.ts`
pins `main.ts` as the resolver of `a11y.world.region`, which the announcement edge resolves; the
key is pinned on `feedback.ts`, the roster of files that import the resolver gains the module,
and the two-binding proof moves to a file that still imports both `t` functions, with the union
of resolved keys unchanged. The tester makes that edit. Comments that name `main.ts` as the home
or caller of a moved symbol are re-pointed: `client/src/ui/statusModel.test.ts`,
`client/src/net/oidc.test.ts`, `client/src/ui/i18n/catalogParity.test.ts` (measured at
`16e2cb3c`). `docs/DECISIONS.md` "Four message channels, chosen by one policy table" names
`main.ts`'s sinks and is rewritten in place to name `shell/feedback.ts`. Covering tests:
`client/src/main.feedbackCore.test.ts`, `client/src/main.feedbackI18n.test.ts`,
`client/src/main.frameErrorWiring.test.ts`, `client/src/main.a11yFocus.test.ts` and the other
`client/src/main.*.test.ts` suites.

- **ST11.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST11.2:** WHEN the client's full vitest suite runs IT SHALL pass, with
  `client/src/ui/i18n/catalogParity.test.ts` asserting the same union of resolved keys.

Confirmed in the diff at merge, not by a criterion: the names above are declared in
`shell/feedback.ts` and nowhere in `main.ts`; each binding is assigned only inside the owner;
`feedback.ts` imports no shell module but `views`, registers nothing on `store`, `window` or
`document`, and resolves no catalog string at module scope; the frame loop calls the pump where
the edge and the step stood; its plan line is gone.

### st-12 — client shell: the server link gets an owner
type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/session.ts, client/src/shell/session.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, docs/refactors/client-shell.md, ARCHITECTURE.md, docs/DECISIONS.md
after: [st-11]

Extraction 5 of `docs/refactors/client-shell.md`, an ownership change.
`client/src/shell/session.ts` is created and takes `store`, `identity`, `conn`,
`hydratedSinceReconnect`, `resolveReady`, `ready`, `sessionGateBlocks`, `liveReducers`,
`privacyLinkLive`, `sendGuarded`, `SEND_REJECT_KIND`, `SendWhere`, `battleEmit`,
`lastOwnRating` and the two batch listeners that step the battle and ranked emit latches. It
imports only `shell/config.ts` and `shell/feedback.ts` among the shell modules. Writers outside
it become owner functions per the plan's "Owners": `main()` mounts `conn`; `onReady` and
`onReconnect` set `identity` (event); `onHydrated` and `onReconnect` set
`hydratedSinceReconnect` (event); `onReconnect` arming the reseed writes `battleEmit` (event);
`resetPredictionState` resets `battleEmit` and `lastOwnRating` (reset). The two emit-latch
listeners keep their place as item 12 of "Registration order": their bodies move to the owner
as named exports and `main.ts` registers them by name (rule 4). `store` is constructed at the
owner's import (rule 5) and is used through its own methods.

Pins: none in the plan's table for this line. `client/src/net/connection.test.ts` reads
`main.ts` for `applyClaim` and three absence checks; `applyClaim` moves with `account.ts`, so
the file is not edited here. Comments that name `main.ts` as the home of a moved symbol are
re-pointed: `client/src/main.battle-reseed.test.ts` and `client/src/main.privacyCountdown.test.ts`
(`sessionGateBlocks`; measured at `16e2cb3c`). None of the moved bodies resolves a catalog key at
`16e2cb3c`; a build that finds one adds `client/src/ui/i18n/catalogParity.test.ts` under the
plan's row for it. `docs/DECISIONS.md` "Four message channels, chosen by one policy table" is
re-pointed wherever it still names `main.ts` for `sendGuarded`'s refusal routing. Covering
tests: `client/src/main.battle-reseed.test.ts`, `client/src/main.reconnectStack.test.ts`,
`client/src/main.privacyCountdown.test.ts`, `client/src/main.boot.test.ts` and the other
`client/src/main.*.test.ts` suites; `client/src/net/connection.runtime.test.ts` covers the link
itself and is not edited.

- **ST12.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST12.2:** WHEN the client's full vitest suite runs IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: the names above are declared in
`shell/session.ts` and nowhere in `main.ts`; `identity`, `conn`, `hydratedSinceReconnect`,
`battleEmit` and `lastOwnRating` are assigned only inside the owner; the emit-latch listeners
are still registered by `main.ts` as item 12; its plan line is gone.

### st-13 — client shell: what a screen adapter reads gets an owner
type: refactor · tier: hard
touches: client/src/main.ts, client/src/shell/screenContext.ts, client/src/shell/screenContext.test.ts, client/src/main.*.test.ts, client/test-util/mainBootHarness.ts, client/src/render/motionPreference.ts, docs/refactors/client-shell.md, ARCHITECTURE.md
after: [st-12]

Extraction 6 of `docs/refactors/client-shell.md`, an ownership change.
`client/src/shell/screenContext.ts` is created and takes `screenCtx`, `motionPreference`,
`boundShopId`, `boundHealLocationId`, `boundSocialTab`, `boundMonstersTab` and
`boundTradeSessionId`. The plan's line and its "Owners" row name `boundProposeTarget`, which
`main.ts` no longer declares: ts-3 (#730) replaced it with `boundTradeSessionId`, the binding
`screenCtx.tradeSessionId` reads at `16e2cb3c`. The slice takes `boundTradeSessionId` and
corrects the plan's row: its writers are `openTradeEditor` (event), `resetTradeSessionState`
(reset) and the batch listener that drops a closed session (event). It imports only
`shell/inputState.ts` and `shell/session.ts` among the shell modules. The other writers become
owner functions per the plan: `openPendingShop`, `runInteract`, `openSocial` and
`openMenuTarget` bind (event), and `main` clears (reset). `motionPreference` is constructed at
the owner's import and keeps the one listener a shell module's scope may create, the media-query
listener, which still registers before the first batch listener (rule 5). `screenCtx`'s getters
read the owner's bindings through the live imports (rule 1).

Pins: none in the plan's table. The comment in `client/src/render/motionPreference.ts` that
names `main.ts` as the caller of `motionPreferenceFromWindow` is re-pointed (measured at
`16e2cb3c`). Covering tests: `client/src/main.reducedMotionWiring.test.ts`,
`client/src/main.shopBalance.test.ts`, `client/src/main.social.test.ts`,
`client/src/main.dispatch.test.ts` and the other `client/src/main.*.test.ts` suites; the
`client/src/ui/screens/*.boot.test.ts` suites read `screenCtx` through the screens they boot.

- **ST13.1:** WHEN the client is type-checked and linted and the `client/src/main.*.test.ts`
  suites run THEY SHALL pass with every assertion unedited.
- **ST13.2:** WHEN the client's full vitest suite runs IT SHALL pass.

Confirmed in the diff at merge, not by a criterion: the seven names are declared in
`shell/screenContext.ts` and nowhere in `main.ts`; each `bound*` binding is assigned only
inside the owner; the media-query listener still registers before the first batch listener;
the plan's line is gone and its `boundProposeTarget` row names `boundTradeSessionId`.
