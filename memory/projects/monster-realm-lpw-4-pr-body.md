Before it joins, the client now reads the server's protocol numbers and refuses a server it cannot speak to. Each connection subscribes `module_info` alone first and compares row 0 with its own `protocol_version()`. A server whose floor is above the client shows "This server runs a newer Monster Realm. Update the game to join."; a server that is older, has no row, or refuses the query shows "This server runs an older Monster Realm. Its host must update it." A refused client subscribes nothing else, calls no reducer, closes the connection and does not reconnect; the line stays on the world hint until reload. It is a player-facing message, not a security gate.

**Read `client/src/net/connection.ts` with whitespace hidden** (`git diff -w`): the base-set subscription moved into a closure and was re-indented, so the plain diff shows 383 changed lines where `-w` shows 93.

## What changes

- **`client/src/net/protocolCheck.ts` (new, pure):** `checkProtocol(server, client)` returns `'ok'`, `'update-game'` or `'update-server'`. It admits only when `server.protocol >= client` and `server.minClientProtocol <= client`; both tests are written as admissions, so a `NaN` is a refusal. `'missing'` and `'refused'` read as an older server. `serverProtocolFrom(rows)` takes the row whose `id` is 0 (lpw-3's note).
- **`client/src/net/connection.ts`:** `ConnectionOptions` gains `clientProtocol` and `onProtocolMismatch` (both required). In `onConnect` the build subscribes the bare string `SELECT * FROM module_info` and nothing else. Admitted, it opens the base set exactly as before. Refused, `refuse()` runs the drop path's teardown without its "reconnecting" report, hides a session terminal, drops `current`, closes the socket and tells the caller once; `attemptBuild` builds nothing on a refused page, which covers the rebuild timer, `reconnectNow`, `continueAnonymously` and a bfcache restore. An admitted connection is judged again whenever the row changes, from the cache, and only toward refusal.
- **`client/src/main.ts`:** passes `PROTOCOL_VERSION` and shows the catalogued line for the side through the existing sink (`reportError('protocol-mismatch', …)`), then hides a session overlay.
- **`client/src/shell/config.ts`:** `PROTOCOL_VERSION = protocol_version()`, read once beside the other wasm constants.
- **`client/src/ui/feedbackPolicy.ts`:** the kind `protocol-mismatch` (a hint the player must act on, carried by the world hint line until reload), alone at rank 4 so no later hint takes its line.
- **i18n:** `chrome.status.serverNewer` and `chrome.status.serverOlder` in `messageIds.ts`, `catalog.en.ts` and `catalog.fr.ts` (548 keys each).
- **Docs:** `ARCHITECTURE.md` "Connection and store"; `docs/DECISIONS.md` (see Decisions).
- **Tests (tester-written, three rounds):** `net/protocolCheck.test.ts` and `main.protocolCheck.test.ts` are new; `net/connection.runtime.test.ts` gains the gate's describe and `net/connection.test.ts` pins the two-stage subscribe; rosters and counts move in `feedbackPolicy.test.ts`, `catalog.test.ts`, `catalogParity.test.ts`, `resolver.test.ts`, `config.test.ts`; the wasm mocks answer `protocol_version`.

Items: none

## Acceptance

Acceptance: 5/5 met, 0 deferred, 0 unmet — lpw-4 seed:9848c4ee100331b4

Each gate runs whole test files and counts the passed titles that end in its tag:

| File | lpw-4.1 | lpw-4.2 | lpw-4.3 | lpw-4.4 | lpw-4.5 |
|---|---|---|---|---|---|
| `net/protocolCheck.test.ts` | 2 | 7 | 6 | | |
| `net/connection.runtime.test.ts` | 6 | 6 | 7 | | |
| `net/connection.test.ts` | | | 1 | | |
| `main.protocolCheck.test.ts` | 2 | 3 | 2 | 5 | 2 |
| `ui/feedbackPolicy.test.ts` | | | | 2 | |
| `ui/i18n/catalog.test.ts` | 1 | 1 | | | 1 |

- **Red proof** (`memory/projects/gates/lpw-4.red-proof.log`): at the tester's commit, before any production change, 55 tests failed and `protocolCheck.test.ts` (15 more) could not load its module; every failure names the missing gate, handler, key, kind or export.
- **Wrong implementations** (`memory/projects/gates/lpw-4.mutants.log`): 51 applied one at a time, 49 killed. The two survivors change nothing observable (the deprecated `module_info` accessor alias; a second stale check that only saves a console line). The first pass found one real gap (a second mismatching row refused twice); the tester closed it.
- **Real SDK, real host** (`memory/projects/gates/lpw-4.live-host.log`): the real `connect()` against a 2.11.0 host admits and joins on equal numbers, refuses a newer client, a floor above the client, a module that predates `module_info`, and a deleted row; refuses an admitted client when the owner raises the floor; keeps a refused page refused when the row returns; and re-admits after an ordinary drop.

touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- `client/src/main.frameErrorWiring.test.ts`, `client/src/main.input.test.ts`, `client/src/ui/screens/bagScreen.boot.test.ts`, `client/src/ui/screens/journalScreen.boot.test.ts`, `client/src/ui/screens/profileScreen.boot.test.ts`, `client/src/ui/screens/socialScreen.boot.test.ts` — probe edit and red run: these six boot tests mock the wasm pkg inline instead of through `mainBootHarness`, so every test in them fails once `shell/config.ts` reads `protocol_version()` ("No protocol_version export is defined on the mock"). One mocked export each.
- `client/src/ui/i18n/catalogParity.test.ts`, `client/src/ui/i18n/resolver.test.ts` — named pins: the roster of literal catalog keys `main.ts` resolves (39 became 41) and the value table of every plain `chrome.*` key (34 became 36).
- `ARCHITECTURE.md` — stale claim made by this slice: "Connection and store" said the base set is the first thing a connection subscribes.

## Gate

At `ba595b4c`, with no change after it:

- `just ci`: exit 0. Rust 3417 + 1120 + 3089 tests, 15/15 evals (bindings-drift and client-surface-privacy among them), client 247 files / 6309 tests, `verify-build-hooks` OK, observability 9 checks / 0 failed.
- `just e2e-shards` against a 2.11.0 host: 8/8 shards, 270 passed, 1 skipped (the suite's own skip; this PR changes no e2e file).
- `mr-gates check`: 5/5. `mr-touches scope`: IN-SCOPE, 26 files.

## Decisions

Two edits to `docs/DECISIONS.md`. The second one corrects a rule lpw-3 wrote, so it needs your read.

- **New entry, "A client checks the server's protocol numbers before anything else, and a refusal lasts until reload".** The refusal is terminal because lpw-4.4 keeps the line until reload: a page that reconnected, was admitted and played under "Update the game to join" would be saying something false. It also records that `module_info`'s three columns never change.
- **Edited entry, "The module publishes its protocol numbers…".** Measured against a 2.11.0 host: an older client cannot read a table whose rows gained a column. The SDK decodes a row list back to back with the client's own row type, throws inside its message handler, and the client gets neither an applied nor an error callback (`module_info` and `zone_def`, each with one column appended). So a column appended to a table or view a client subscribes is a change an older client cannot talk across and must raise `MIN_CLIENT_PROTOCOL`. The entry listed only removed or re-typed columns and ruled out raising it "for an additive change"; it now lists the appended column and narrows that sentence to a new table or a new reducer. The spec's lpw-3 contract text says the same as the old entry (note n4).

## Lenses

- **Plan:** reviewer and red-team. Both asked for the re-judge of an admitted connection, which is built. Also built from their findings: rank 4, the session overlay, a guarded cache read. The test contract was rewritten where it asked for sequences a refused page cannot reach.
- **Tester (opus), three rounds:** the tests; then a test-isolation defect (a `pageshow` dispatched on the shared window woke every earlier test's connection, because `connect()` never removes its listeners) and the gap the wrong-implementation pass found; then comments.
- **Artifact:** reviewer, red-team and a netcode lens found nothing above LOW. Fixed: the line is shown before the session overlay is hidden; doc wording. Answered: rows from the message being dispatched land in the wiped store until the SDK's close event wipes it again, as after the world scope's `drop` (now stated on `refuse()`); `judge` does not check `teardown`, as the base set's applied callback does not.
- **Verifier:** approve with notes. No existing test weakened (three renamed titles, bodies kept); the five ledger checks reproduce; its own mutant (a refused query read as "update the game") was killed. Its note: no test pins that `onProtocolMismatch` runs after the teardown. Nothing in the handler reads connection state, and the tester's brief left the order unspecified.
- **Not run:** `desync-guard` and `reducer-security-auditor`. No `game-core`, wasm export or server file changes.

## Risks

- **Serve the client after the module.** A client newer than the server it reaches is refused, correctly, and stays refused until reload. A bundle served before the module is published and the owner's `sync_content` has run, or a shell that opens the page mid-upgrade, strands that page (R-lpw-4-UPGRADE-WINDOW; lpw-13 must load or reload the page after its publish and sync).
- **Any server this client meets must be at lpw-3 or later, and synced.** A database with no `module_info` row refuses every client until its owner runs `sync_content`; `just publish` does that.
- **The bump rule has no test** (lpw-3's stated risk). A change that should raise `MIN_CLIENT_PROTOCOL` and does not still fails as an SDK error.
- **One more round trip per connection** before the base set, about 5 ms on loopback.
- **Any refused `module_info` query reads as an older server**, whatever the host's reason, and an unanswered one leaves the client connecting, as an unanswered base set does.
- **While refused:** a send still toasts the link-down line and `startSignIn` still reports `transient-error` (both say "try again"); a blocked F9 download shows no hint (it is logged); a frame opened within the live region's 500 ms window of the refusal takes its announcement, and the line stays painted.
- **An admitted session refused later keeps its open frames** over the emptied store until reload (R-lpw-4-REFUSED-FRAMES).

## Notes for the spec (`mr-gates notes`, five pending)

- n1 → R-lpw-4-UPGRADE-WINDOW [ux-a11y/MED]: lpw-3's note n1 is built toward refusal only; the alternatives change lpw-4.4 and are yours.
- n2 → R-lpw-4-REFUSED-FRAMES [ux-a11y/LOW].
- n3 → R-lpw-4-SKILL-DOC [loop-ops/LOW]: `.claude/skills/spacetimedb-client/SKILL.md` does not mention the check; `mr-touches` refuses that path to a running slice.
- n4: the appended-column measurement and the lpw-3 contract text.
- n5: the touches gaps, what was built beyond the contract's letter, and the accepted limits.

touches-delta:
- The nine widened files above.
- `docs/DECISIONS.md` — one new entry and one corrected entry (Decisions).

boyscout-delta:
- `client/src/net/connection.ts` (the base-set block, two comments) — the re-indent made them added lines for the comment scan; "was discarded pre-M13.5b" and the `bt-12 (BT12.1):` prefix are gone, the statements stay.
- `ARCHITECTURE.md` "Connection and store" — "29 queries" became 30, the count `ts-4.4` pins, in the sentence this slice rewrote.

plan-delta:
- Spec: the connection opens the base set only on `'ok'`. Built: that, and an admitted connection is judged again on every `module_info` row change, only toward refusal. Evidence: a client that reconnects between a publish and the owner's sync is judged on the previous numbers; row changes reach a live subscription with the cache already current (measured).
- Spec: a new `protocol-mismatch` kind, wiring. Built: the kind, and rank 4 for it alone. Evidence: at rank 3 a later `download-blocked` hint covers the line for the rest of the page and uncovering it says it twice, both against lpw-4.4.
- Spec: lpw-4.4 "keep it until reload". Built: the refusal is the page's last connection (closed, never rebuilt), and it hides a session overlay whose actions could no longer do anything.
- Spec contract: `checkProtocol`. Built: also `serverProtocolFrom` and the three types; a row whose floor is above its own protocol reads `'update-server'`, since only the host can repair it.
- lpw-3 note n1 (re-evaluate when the row arrives): built toward refusal only; toward admission it conflicts with lpw-4.4 (n1, R-lpw-4-UPGRADE-WINDOW).
- Plan: `scheduleRebuild` also checks the refusal. Built: one guard, at `attemptBuild`. Evidence: the second guard changed nothing any test could see.

comment-scan: CLEAN

not-verified:
- No browser met a mismatched server (the spec asks for no e2e: it needs a second module build). The real `connect()` and SDK ran against a live host outside the browser; the page's rendering of the line is tested in happy-dom over a faked SDK.
- No screen reader was used; the live region's writes are asserted in happy-dom.
- The French lines were written by the builder and not read by a native speaker.
- The remote-only jobs (gitleaks, cargo-audit, the CI e2e job) did not run locally.
- What an older client does after it is admitted in the publish-to-sync window and the base set no longer parses was not measured.
- The frames-left-open case was measured with the menu only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
