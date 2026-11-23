Extraction 6 of `docs/refactors/client-shell.md`, an ownership change. A new module, `client/src/shell/screenContext.ts`, owns what a screen adapter reads: the one `screenCtx`, the shop, heal location, Social tab, Monsters tab and trade session each open bound, and the motion preference. `main.ts` imports what it still names and changes the owner's state through seven owner functions. Nothing a player, a test or another module can observe changes.

What the diff is:
- `shell/screenContext.ts` (new, 106 lines): `screenCtx`, `motionPreference`, `boundShopId`, `boundHealLocationId`, `boundSocialTab`, `boundMonstersTab`, `boundTradeSessionId`. The moved bodies are the base text; the additions are `export`, the owner functions and reworded comments. It imports `./inputState` and `./session` and no other shell module. At import it constructs the motion preference (one `matchMedia` query, one `change` listener on that query object) and the context object, and nothing else.
- Owner functions: `bindShop(shopId)`, `bindHealLocation(locationId)`, `bindSocialTab(tab)`, `bindMonstersTab(tab)`, `bindTradeSession(sessionId)`, `unbindTradeSession()`, `unbindForReconnect()`.
- `main.ts` (5393 lines at the base, 5344 at the head): the three declaration blocks leave. Each outside write becomes the owner call in the same position: `openPendingShop` calls `bindShop` after its `blocksPlayerOpen` return; `runInteract`'s heal arm calls `bindHealLocation`; `openSocial` calls `bindSocialTab` ahead of the seated open; `openMenuTarget` calls `bindMonstersTab(tab === 'storage' ? 'storage' : 'party')`; `openTradeEditor` calls `bindTradeSession` after `held.clear()`; `resetTradeSessionState` and the closed-session batch listener call `unbindTradeSession()`; `onReconnect` calls `unbindForReconnect()` where the four clears stood, still ahead of `resetTradeSessionState()` and `screenHost.forget()`. No registration moves: `main.ts` registered nothing for these names.
- Import time: the motion preference is now constructed while `main.ts`'s imports evaluate, ahead of the locale block, the text-step apply and the hint-host install. Nothing between the old and the new point reads or stubs `matchMedia`. In the unminified production build there is one `matchMedia` call site at the base and at the head; at the head it runs at line 47251 of the entry chunk and the first `store.onBatchApplied(` registration is at line 56491.
- Docs: plan line 6 and the `screenContext.ts` row of "Owner functions the extractions add" are deleted; the `boundProposeTarget` Owners row is `boundTradeSessionId` with its real writers and its reader. `ARCHITECTURE.md` §Client describes the module. The header of `render/motionPreference.ts` names `shell/screenContext.ts` as the caller.

## Acceptance
Acceptance: 2/2 met, 0 deferred, 0 unmet — st-13 seed:90db94d6ecf76f5a

- ST13.1: client `tsc`, `biome check .`, `git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts' client/test-util`, then the `main.*` suites plus `src/shell/`: 41 files, 940 tests. Before the move: 40 files, 919 tests. The diff step is byte for byte: no `main.*` suite and no boot stub changes in this slice, comments included.
- ST13.2: the full client vitest suite: 253 files, 6492 tests. Before the move: 252 files, 6471 tests. The move applied with no test edit at all gave 252 files, 6471 tests (the probe, below).
- Full local `just ci` at the slice head `d113191b` on `88a3c8cb`: exit 0, 189 s. Rust nextest 3588, 1291, 3260 and 18 tests; account-service 14 files / 885 tests; 15 of 15 evals; `check-secrets` clean; client 253 files / 6492 tests; `verify-build-hooks` OK; observability validate 9 checks, 0 failed. It was the fourth direct run. The first three exited 1 at `account-test`, each on one test of `account-service/src/deployment.test.ts` whose container bring-up never answered (`discovery did not answer 200 within 60 s: connect ECONNREFUSED 127.0.0.1:<port>`; the restart test once, the first discovery test twice), with the other 884 account tests green each time. `account-service/` is not in the diff. Between the third and the fourth run, at the same head: that file alone passed 11 of 11, and every other recipe of `ci` in one call (`just lint typecheck account-typecheck test eval security wasm client-typecheck client-test client-verify-build observability-validate`) exited 0. No sibling `just` and no other SpacetimeDB was running. This is the red recorded on the two slices before this one (residual `R-acs-7-DEPLOYFLAKE`).
- `just e2e-shards` at `d113191b` against a private in-memory SpacetimeDB 2.11.0 (own data directory and port): exit 0 in one invocation, 8 of 8 shards ok, 274 passed, 1 skipped (`recruit.spec.ts` R4, skipped in the source). The section has no end-to-end criterion; this run is extra evidence, because `client/e2e/reduced-motion.spec.ts` is the one place the moved preference runs in a real browser.

Red seam (testing-tdd §Behavior-preserving changes): the tester's file was committed alone (`42a4c02c`) before the move (`f11803bf`). At that commit `client/src/shell/screenContext.test.ts` fails to load (`Failed to resolve import "./screenContext"`); the verifier re-ran it in its own copy. The seam file boots the real `main.ts` on the real `index.html` shell, drives each open path, the reconnect, the join and the closed-session batch through the real views, and reads the owner back through `./screenContext` from the same module registry. It has no mock of the destination or of anything the destination imports as a value (the four module mocks are the ones `shell/session.test.ts` uses). A second block drives the owner alone on a fresh registry. It has 21 tests.

Wrong implementations, each written out and run, with the committed text restored after each (the orchestrator's 46 in a scratch tree; the red-teams' and the verifier's in their own).

| Wrong implementation | Result |
|---|---|
| `main.ts` keeps the whole base text (private copies of all seven names) while the owner module exists | killed by 12 of the 21 tests. Survived all 6471 tests that existed before the seam file |
| in `main.ts`: each of the five `bind*` calls never made; `onReconnect` never calling `unbindForReconnect`; `resetTradeSessionState` not unbinding; the closed-session listener not unbinding (8) | killed |
| `unbindForReconnect` missing one of its four clears (4); also clearing the trade session; returning early when no shop, or no heal location, is bound; clearing the tabs only when a shop is bound | killed. The early returns survived until the tester's second round |
| `unbindTradeSession` also clearing the other four | killed |
| `screenCtx`: `identity`, `bindings`, `shopId` or `reduceMotion` snapshotted at module scope; a second store; `wallNowMs` on the frame clock; `now()` cached (7) | killed |
| the preference built lazily on first read; built after the first batch listener; a second one built by `main.ts` for the frame loop (3) | killed |
| the owner at import: a batch listener on the store; a `window` listener; a `document` listener; a document write (4) | killed |
| zero ids read as none (`bindShop(0)`, `bindHealLocation(0)`, `bindTradeSession(0n)`, two shapes); `bindSocialTab(null)` keeping the last tab; `bindMonstersTab` always Party; `bindShop` also binding the heal location (7) | killed |
| the shop refresh listener in `main.ts` reading a copy of `boundShopId` taken at load, or ignoring the bound shop (2) | killed by a test added in the tester's second round. Before it, both survived every client test, at the base as well: no test refreshed a bound shop that was not the first-row default |
| the heal refresh listener reading a copy of `boundHealLocationId` taken at load | survives the seam file; killed by `client/src/main.input.test.ts` (`CTL10A-1-BOOT-IN-FRAME`) |
| `openTradeEditor` binding before its not-my-session return, or before its `canOpen` return; `openPendingShop` binding before its `blocksPlayerOpen` return; the talk arm of `runInteract` also binding a heal location (4) | survive the seam file and the red-team's 62-file run (not run against the whole suite). All four survive at the base too. The tester left them out: a value bound by an open that was dropped is read only while that frame shows, and every open of that frame binds first |
| plan-phase red-team, 40 on the planned move against the suites that existed then | its table lists 27 killed and 13 survivors (its summary line says 12). Eleven were the seam file's brief and the seam file kills all eleven; the other two (`bindShop` or `bindHealLocation` after its `openFrame`) survive at the base too: the open renders from the explicit id |
| artifact red-team, 30 new | its table lists 16 killed and 14 survivors of its 62-file run (its summary line says 22 and 8). Two were real holes and are closed (the early return and the shop refresh, above). Four are the dropped-open row above. Eight have no observable difference: the reset calls of `onReconnect` in three other orders, `resetTradeSessionState` unbinding last, `screenCtx` frozen, `screenCtx` rebuilt per access, a wrapper around the preference, a bind that skips a same-value write |
| verifier's own 6 | all killed |

Production bundle (red-team, `vite build` of the base and of `f11803bf` in sandboxes): 132 files in `dist` in both; entry chunk 871,580 bytes at the base and 871,748 at the head; `verify-build-hooks` OK on both.

## plan-delta
- **`unbindForReconnect` clears four bindings and `unbindTradeSession` the fifth.** The plan file proposed one function, `unbindScreens`, for five clears, written when all five sat in `onReconnect`. Today the fifth clear is inside `resetTradeSessionState`, which `onReady` also calls, and the closed-session listener clears it too. One outside write, one owner call, in the same position. The plan-phase reviewer found `unbindScreens` read as "all five", so the function is named for its event and its comment says the trade session is not touched there.
- **The plan's proposed `bindProposeTarget` is `bindTradeSession`** (ts-3 replaced the binding).
- **The corrected Owners row names `screens` as the reader of `boundTradeSessionId`.** The closed-session listener reads it, and that listener is registered in the position "Registration order" item 9 gives to `screens` (between the shop refresh and the challenge refresh). The row says `resetTradeSessionState` runs on a join and on a reconnect.
- **ST13.1's diff step compares the `main.*` suites and the boot stubs byte for byte.** st-12's step ignored whole-line comment changes with `-I'^\s*/?\*'`; the plan-phase reviewer showed that pattern also skips a hunk that only adds `/*` and `*/` around assertions. This section orders no comment re-point in those suites, so nothing in them changes.
- **The header of `render/motionPreference.ts` is rewritten, not re-pointed word for word.** Swapping the file name into its sentences would have left two of them false (see `boyscout-delta`).
- **The seam file changed once after the move** (`08b240dd`), for measured survivors and the reviewer's findings: two tests added, one test's body made to prove its name, the listener recorder restoring by assignment, and two redundant tests cut (see `moved-tests`). The red run of the two added tests is the wrong implementation each kills, not the base tree.
- **The full end-to-end suite was run** though the section has no end-to-end criterion and the slice moves no `main()` boot wiring and no DEV hook.
- **The orchestrator wrote the plan from measurement and a probe; no `planner` subagent ran.** Before any test existed the move was applied once, type-checked, linted and run against the full client suite with no test edit (252 of 252 files, 6471 of 6471 tests), then reversed and kept as a patch outside the tree until the tester's file was committed.

## moved-tests
none

No existing test was re-pointed, renamed, replaced or deleted, and no `main.*` suite changed. `client/src/shell/screenContext.test.ts` is new. Two tests the tester wrote in it at `42a4c02c` were cut by the tester at `08b240dd`, before any merge; neither was failing, and the verifier wrote the wrong implementation each guarded and watched the named survivor fail:
- "the motion preference and the context follow each change event from the initial value, and no read asks a second query" -> `client/src/shell/screenContext.test.ts` :: "the owner`s motion preference and the context follow each change event from an initial $initial, …" (both initial values, on the booted shell) and "importing the module asks the media query once and adds its one change listener at once, …".
- "the context`s identity follows each adoptIdentity, and its store is the session module`s" -> `client/src/shell/screenContext.test.ts` :: "the context the screens read holds the store main() handed to connect, follows the identity of the join and of a reconnect that mints a new one, …".

## touches-delta
none. `mr-touches scope --slice st-13` reports `IN-SCOPE`, 6 files changed, none outside.

## boyscout-delta
- `client/src/render/motionPreference.ts:6-9` — the header said a source scan in `motionPreference.test.ts` pins the one `matchMedia` caller; that test reads no source. It says what holds: the client asks once per page, and the owner module constructs the one preference at import.
- `client/src/render/motionPreference.ts:61` — "The ONE line in client/src that names `matchMedia`" was false of its own file; it says "the one call".
- `docs/refactors/client-shell.md:64` — module map row 6 said "the id each open bound"; two of the five are tabs.

## Spec notes filed (`mr-gates notes`, pending for the supervisor)
- n1: `docs/refactors/client-shell.md` carries ts-3 drift beyond line 6 that this slice did not decide: extraction 12 names `openPropose`, which `main.ts` does not declare; `openTradeEditor`, `closeTradeEditor`, `resetTradeSessionState`, `openedTradeSessions`, the trade-session batch listener and the `let`s `pendingTradeOpen` and `knownSessionIds` belong to no extraction and have no Owners row. Which module owns them is a design choice no slice has recorded.
- n2: the block-comment hole in st-12's ST12.1 diff step (above).
- n3 -> residual `R-st-13-X-comments` [loop-ops/LOW]: comments that still name `main.ts` for what the owner module holds. Outside `touches:`: `client/src/ui/screens/index.ts:7`. Inside it but held byte for byte by ST13.1: `client/src/main.reducedMotionWiring.test.ts:302` and its header lines 20-22 (a stale line number). None is a pin.

## Review lenses
- **Plan (before the tests):** reviewer and red-team, no blocker and no behaviour difference. Adopted: the byte-for-byte diff step; the name `unbindForReconnect`; the header rewrite; the drift note. The red-team's 12 survivors became the seam file's brief.
- **reviewer (artifact, `f11803bf`):** no blocker, no major; the spec's four merge-time confirmations each answered yes. Closed: `motionPreference.ts:61`; the `ARCHITECTURE.md` sentence on who reads the preference (`main.ts` reads it in the frame loop and hands the tactical shell a getter); "reset" in the Owners row; a comment that tied product prose to a test inventory; in the seam file, the listener recorder, a test name that claimed more than its body, and two redundant tests.
- **red-team (artifact, `f11803bf`):** no observable difference; the bundle comparison; the seam file run 5 times, shuffled with 3 seeds and each test alone, all green; 30 new wrong implementations (table above).
- **simplify:** nothing to remove. Each owner function replaces one outside write in place; a generic bind would add a layer; folding the trade unbind into `bindTradeSession(null)` would hide a reset inside a bind.
- **verifier (`d113191b`):** APPROVE on ST13.1, ST13.2, the red seam and its commit order, test integrity and the two cuts, the four merge-time confirmations, behaviour unchanged, scope and the doc hunks.
- **reducer-security-auditor / desync-guard:** not applicable; the diff has no server-module, game-core or client-wasm file.
- **doc-keeper:** not spawned; the orchestrator made the doc edits and the reviewer and the verifier each checked every added sentence against the code. No `docs/DECISIONS.md` entry: the owner-module decision is recorded and this slice applies it.

Tester findings, apart from tests: no defect in the code at the base or in the contract. Its two questions were answered by running: every boot recipe passed first time against the move, and importing `../net/store` ahead of `../main` to spy on the store class changes nothing the file observes.

comment-scan: CLEAN

Items: none

## not-verified
- gitleaks and cargo-audit run remote-only.
- The remote e2e job on the PR merge ref.
- `origin/master` gained one commit after the gate ran (`52e202f6`, `docs/DECISIONS.md` only). The local `just ci` and the e2e run are on `88a3c8cb` plus this branch; `git merge-tree` of the two is conflict-free and the commit shares no file with this diff.
- Why a bring-up in `account-service/src/deployment.test.ts` goes unanswered inside the full account suite was not investigated here; three of four local `just ci` runs hit it.
- The four dropped-open wrong implementations were not run against the whole client suite, only against the seam file and the red-team's 62-file set.
- The red-teams' and the verifier's own runs happened in their sandboxes (`/tmp/st13-rt.t2KB3a`, `/tmp/st13-rt2.Bszsuf`, `/tmp/st13-vf.YRvfAr`); the orchestrator re-ran the two real holes, the heal twin and the four dropped-open rows in its own battery, and nothing else of theirs.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
