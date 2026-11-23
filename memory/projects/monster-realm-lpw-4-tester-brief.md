# lpw-4 tester brief — write the gating tests (red phase)

You write the tests for slice `lpw-4` of the Monster Realm v2 client BEFORE the implementation
exists. Someone else implements against them and may not edit them. You have no shell: the
orchestrator runs what you write and reports each red back to you.

- Worktree (the only tree you write in):
  `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-4/`
  (pristine `origin/master` d6d80547; the feature does not exist there yet).
- Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-local-play.spec.md`,
  section `### lpw-4` (near line 330). The five criteria lpw-4.1 to lpw-4.5 are the source.
- Plan (read it; its "measured" section and decisions bind):
  `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-lpw-4-plan.md`
- Rules: `/home/mdrewt/.claude/harness/standards/testing-tdd.md` (the verification SSOT).
  In short: tests execute behaviour; a NEW test never reads a hand-written source file as text,
  never pins prose, never tests another test. Test names lead with the behaviour they prove
  and END with the criterion tag, exactly `[lpw-4.N]` as the last characters of the `it` title
  (the acceptance ledger counts passed titles by that suffix per file). A test that serves no
  single criterion (a harness fixture, a roster row) carries no tag.
- A prototype of the implementation exists only as a diff, for orientation about seams, NOT as
  the oracle: `/tmp/lpw-4-sb.Aja8zx/probe.patch`. It predates the plan review, so where it
  disagrees with `## Contracts` below, the contracts win (it has no re-judge on row change, no
  rank 4, no session clear, no guarded read, and it edits `resetFeedbackSinks`, which the plan
  no longer does).

## Files you may write

New: `client/src/net/protocolCheck.test.ts`, `client/src/main.protocolCheck.test.ts`.

Edit: `client/src/net/connection.runtime.test.ts`, `client/src/net/connection.test.ts`,
`client/src/shell/config.test.ts`, `client/test-util/mainBootHarness.ts`,
`client/src/ui/feedbackPolicy.test.ts`, `client/src/ui/i18n/catalog.test.ts`,
`client/src/ui/i18n/catalogParity.test.ts`, `client/src/ui/i18n/resolver.test.ts`, and the six
boot tests that mock the wasm pkg inline (fixture line only, see Fixtures):
`client/src/main.frameErrorWiring.test.ts`, `client/src/main.input.test.ts`,
`client/src/ui/screens/bagScreen.boot.test.ts`, `client/src/ui/screens/journalScreen.boot.test.ts`,
`client/src/ui/screens/profileScreen.boot.test.ts`, `client/src/ui/screens/socialScreen.boot.test.ts`.

Nothing else. No production file (`protocolCheck.ts`, `connection.ts`, `main.ts`, `config.ts`,
`feedbackPolicy.ts`, the catalogs, `messageIds.ts`) is yours.

## Contracts (what the tests call; the implementer builds exactly this)

### `client/src/net/protocolCheck.ts` (new, pure)

```ts
export type ServerProtocol =
  | { readonly protocol: number; readonly minClientProtocol: number }
  | 'missing'
  | 'refused';
export type ProtocolMismatch = 'update-game' | 'update-server';
export type ProtocolVerdict = 'ok' | ProtocolMismatch;

export function checkProtocol(server: ServerProtocol, client: number): ProtocolVerdict;
export function serverProtocolFrom(
  rows: Iterable<{ readonly id: number; readonly protocol: number; readonly minClientProtocol: number }>,
): { readonly protocol: number; readonly minClientProtocol: number } | 'missing';
```

`checkProtocol`, evaluated in this order:
1. `'missing'` or `'refused'` → `'update-server'`.
2. NOT(`server.protocol >= client`) → `'update-server'`.
3. NOT(`server.minClientProtocol <= client`) → `'update-game'`.
4. otherwise `'ok'`.

Consequences to pin: `protocol == client` and `minClientProtocol == client` both admit; a
server newer than the client whose floor the client meets is `'ok'`; a row whose floor is above
its own protocol with the client between them (for example protocol 3, floor 7, client 5)
satisfies both mismatch conditions and is `'update-server'`; `NaN` for any of the three
numbers is never `'ok'` (`NaN` protocol or `NaN` client → `'update-server'`; only the floor
`NaN`, with protocol admitting → `'update-game'`). It never throws and returns one of the three
strings for every input. For every u32 triple with `minClientProtocol <= protocol` the verdict
is `'update-game'` iff `minClientProtocol > client`, `'update-server'` iff `protocol < client`,
else `'ok'`, and the two mismatch conditions never hold together (a fast-check property;
`fast-check` is a dev dependency, see the `vitest-fast-check` usage elsewhere in `client/src`).

`serverProtocolFrom`: returns the numbers of the row whose `id` is `0`; rows with any other id
are ignored wherever they sit; no row with id 0 (or no rows) → `'missing'`. The result holds
exactly `protocol` and `minClientProtocol`.

### `client/src/shell/config.ts`

`export const PROTOCOL_VERSION: number` — the value client-wasm's `protocol_version()` export
returns, read once at module scope beside `STEP_MS` and the others. (`config.test.ts` imports
the REAL wasm pkg; add `protocol_version` to its import and one expectation in the existing
"takes every game-core constant" test or a sibling. No tag.)

### `client/src/net/connection.ts` — `ConnectionOptions` gains two REQUIRED fields

```ts
/** The protocol this client speaks (client-wasm's `protocol_version()`). */
readonly clientProtocol: number;
/** The server cannot be spoken to; `side` says who must update. */
readonly onProtocolMismatch: (side: ProtocolMismatch) => void;
```

Behaviour of each build (each `DbConnection` the real `connect()` builds), inside the SDK's
`onConnect(c, identity, token)` callback, AFTER what happens there today (the anonymous token is
saved for an anon build, the account marker written for an account build, `identity` set):

1. **The gate.** Exactly one subscription is opened: `c.subscriptionBuilder()` with an
   `onApplied` and an `onError` callback, then `.subscribe('SELECT * FROM module_info')` — the
   argument is that bare string, not an array. Nothing else is subscribed and no reducer is
   called until a verdict.
2. **Verdict on applied.** The applied callback reads `c.db.moduleInfo.iter()` (the connection
   handed to `onConnect`; property name `moduleInfo`; rows are
   `{ id: number, protocol: number, minClientProtocol: number }`) and takes
   `checkProtocol(serverProtocolFrom(rows), opts.clientProtocol)`. If that read throws, the
   verdict is as for `'refused'`.
3. **Verdict on error.** The error callback, before admission, is the `'refused'` verdict.
4. **`'ok'` → admitted.** The base set opens exactly as today: one more
   `c.subscriptionBuilder()…subscribe([...30 strings...])` whose applied callback does
   everything today's does (unfreeze, join or claim reissue, world scope, `onReady` /
   `onReconnect`, hydration edge). Also at admission, row handlers are registered on
   `c.db.moduleInfo` (`onInsert`, `onUpdate`, `onDelete`).
5. **Re-judge on row change, only toward refusal.** When any of those three handlers fires on
   an admitted, current build, the cache is read again (`c.db.moduleInfo.iter()`, not the
   callback's row argument) and judged: `'ok'` changes nothing (no second base subscription, no
   callback); a mismatch is the refusal of step 6. After admission, an error callback of the
   `module_info` subscription does nothing.
6. **Mismatch → refusal, terminal for the life of the page.** In effect:
   - `opts.onProtocolMismatch(side)` is called exactly once, with `'update-game'` or
     `'update-server'`.
   - Nothing else is subscribed on that connection, ever; no reducer is called from then on
     (`joinGame`, `startGuestClaim`, `completeGuestClaim`); `onReady`, `onReconnect` and
     `onHydrated` are not called by that build after the refusal.
   - `c.disconnect()` is called exactly once (on the connection handed to `onConnect`).
   - The returned `Connection`: `live()` and `.conn` are `undefined`, `linkFrozen()` is `true`,
     `sessionState()` is `'hidden'` (also when a session terminal such as `'expired'` was
     showing before this build), `join()` does nothing.
   - No connection is ever built again: not when the SDK then fires that build's
     `onDisconnect`, not on any timer (advance well past the 30 s backoff cap), not on
     `reconnectNow()`, `continueAnonymously()`, or a bfcache
     `window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))`.
   - `opts.onError('link', …)` is NOT called because of the refusal (neither at the refusal
     nor when the SDK's `onDisconnect` for that build follows), including when the refused
     build had been admitted and connected.
   - When the refused build had been admitted (step 5): the store is reset (rows it held are
     gone, as on a dropped link), the world scope stops (its sets are no longer driven:
     `worldScope()` reports the initial scope and `onScopeSettled(false)` fires if it had
     settled), and the link is frozen.
7. **Superseded builds.** A gate callback (applied, error, or a row handler) of a build that a
   newer build has superseded does nothing.
8. **Every build is gated.** A reconnect build (after a drop of an admitted session) opens the
   gate again on its own connection: admitted → `onReconnect(identity)` as today; mismatch →
   the refusal.

Unspecified (do not pin): what `identity()` returns after a refusal; `console.error` output;
whether `store.reset()` runs on a never-admitted refusal; the order of `disconnect()` relative
to `onProtocolMismatch`.

### `client/src/main.ts`

- Passes `clientProtocol: PROTOCOL_VERSION` (from `shell/config.ts`, so the mocked wasm
  export's value) and an `onProtocolMismatch` handler to `connect`.
- On a mismatch the page shows, as the world hint (`#status` text, and through the live region
  `#a11y-live`), the catalogued line for the side:
  - `'update-game'` → message id `chrome.status.serverNewer`
  - `'update-server'` → message id `chrome.status.serverOlder`
  resolved in the page's locale. It goes through the existing sink
  (`reportError('protocol-mismatch', text)`), so it is also `console.error`-logged and pushed to
  the error ring.
- It also clears a session terminal overlay if one is showing (the session view goes back to
  hidden), so a refusal that follows a session-expired / auth-unreachable overlay does not
  leave that overlay up.
- The line stays until reload: time passing, frames running, a toast expiring, the SDK
  disconnect that follows the refusal, a connect failure or link loss that was reported
  BEFORE the refusal, and a later `download-blocked` hint (the F9 bug-bundle or data-export
  blocked line) all leave `#status` showing the mismatch line; the live region is given the
  line once.

### `client/src/ui/feedbackPolicy.ts`

- `MessageKind` gains `'protocol-mismatch'`; `FEEDBACK_POLICY['protocol-mismatch']` is
  `{ channel: 'hint', actionRequired: true, alsoCarriedBy: 'the world hint line until reload' }`.
- `hintRank('protocol-mismatch')` is `4`, alone at that rank; every other kind keeps its rank
  (the other action-required hints stay 3). So `outranks(x, 'protocol-mismatch')` is `false`
  for every other kind `x` (including `'download-blocked'` and `'content-stale'`), and
  `outranks('protocol-mismatch', x)` is `true` for every kind `x` on the hint channel.
- Counts that move: 17 hint kinds (was 16); 59 kinds in all (was 58); the non-hint count (42)
  is unchanged.

### i18n — two new plain (string-valued) message ids, exact text

| id | en | fr |
|---|---|---|
| `chrome.status.serverNewer` | `This server runs a newer Monster Realm. Update the game to join.` | `Ce serveur utilise une version plus récente de Monster Realm. Mettez le jeu à jour pour le rejoindre.` |
| `chrome.status.serverOlder` | `This server runs an older Monster Realm. Its host must update it.` | `Ce serveur utilise une version plus ancienne de Monster Realm. Son hôte doit le mettre à jour.` |

The English strings are the spec's, character for character. Both catalogs hold 548 keys (was
546). In `messageIds.ts` and both catalogs the two ids sit directly after
`chrome.status.contentStale`, `serverNewer` first. Each catalog entry carries a `// @desc:`
comment as every entry does (the implementer writes it; `catalog.test.ts`'s existing adjacency
rule checks it).

## Fixtures (no tag; they only keep existing suites loading)

- `client/test-util/mainBootHarness.ts`: each of the three wasm factories
  (`wasmPkgWalkingMock`, `wasmPkgStubMock`, `wasmPkgIdentityMoveMock`) answers
  `protocol_version: () => 1`. Give `wasmPkgWalkingMock` (the one `main.protocolCheck.test.ts`
  should boot on) an optional `protocolVersion?: () => number` in its `opts`, default `() => 1`,
  so a page test can boot a client that speaks another number.
- The six inline wasm mocks: add `protocol_version: () => 1` next to `party_slot_none`. One line
  each, nothing else in those files.
- `connection.test.ts` and `connection.runtime.test.ts`: every existing test drives
  `b.onConnect?.(conn0(b), ID, tok)` and then the base set's applied callback. Make the harness
  admit by default so those tests keep EVERY assertion and their drive sequences: `makeOpts()`
  gains `clientProtocol: 1` and `onProtocolMismatch: vi.fn()`; the object handed to `onConnect`
  gains a `db` whose `moduleInfo` answers `iter()` (default one row
  `{ id: 0, protocol: 1, minClientProtocol: 1 }`) and records `onInsert` / `onUpdate` /
  `onDelete`; and the gate subscription is recorded apart from `rec.subs` (for example
  `rec.gate`), with its applied callback fired synchronously inside `.subscribe(...)` unless a
  test asked to hold it. `rec.subs` then still means "the base set first, then the world
  scope's", `rec.onApplied` / `rec.queries` still belong to the base set, and no existing
  assertion changes. A hold switch (per build) lets the new tests apply the gate by hand with
  chosen rows, fire its error callback, or make `iter()` throw. Keep the existing header
  comments true (they describe `subs` and the first subscribe).
- If an existing assertion in those two files truly cannot hold under the contracts, do not
  loosen it: report it under Findings.

## Tests to write (titles end with the tag shown)

### `net/protocolCheck.test.ts` — the total function
- `[lpw-4.1]`: floor above the client → `'update-game'` (examples incl. floor = client + 1 with
  protocol far above); the boundary `minClientProtocol == client` is NOT `'update-game'`.
- `[lpw-4.2]`: protocol below the client → `'update-server'` (incl. protocol = client − 1);
  `'missing'` → `'update-server'`; `'refused'` → `'update-server'`; both conditions at once →
  `'update-server'`; the boundary `protocol == client` is NOT `'update-server'`.
- `[lpw-4.3]`: equal numbers admit; a newer server whose floor the client meets admits; the
  fast-check property over invariant-keeping u32 triples (stated above); `NaN` never admits;
  totality (never throws, always one of the three) over arbitrary doubles incl. `NaN`,
  `±Infinity`, negatives.
- `serverProtocolFrom` cases: tag each with the criterion it serves (`'missing'` from no row 0
  → `[lpw-4.2]`; row 0 found among other ids, in any position → `[lpw-4.3]`).
- Wrong implementations these must kill: comparing with `>` / `<` swapped; `>=` where `>` is
  meant (a client equal to the floor refused; a server equal to the client refused);
  `'missing'` treated as admit; taking the first row instead of the row with id 0; returning
  `'update-game'` for the both-conditions row; a fail-open on `NaN`.

### `net/connection.runtime.test.ts` — the gate before the subscription set (real `connect()`)
New describe(s); `{ sequential: true }` and the file's fake-timer discipline as its neighbours.
- `[lpw-4.1]` floor above the client (`clientProtocol` 2, row `{0, 5, 3}`): after `onConnect`
  the only subscribe is the bare string `'SELECT * FROM module_info'`; after the gate applies:
  no other subscribe on any builder of that connection, `joinGame` / `startGuestClaim` /
  `completeGuestClaim` never called, `onProtocolMismatch` called once with `'update-game'`,
  `disconnect` called once, `onReady` / `onReconnect` / `onHydrated` not called, `live()` and
  `.conn` undefined, `linkFrozen()` true.
- `[lpw-4.1]` the refusal is terminal: then fire that build's `onDisconnect`, advance timers
  far past the backoff cap, call `reconnectNow()` and `continueAnonymously()`, dispatch a
  persisted `pageshow` — `H.builds` still has that one build, no `'link'` error was reported,
  `onProtocolMismatch` still called once.
- `[lpw-4.1]` an admitted connection whose row changes to a floor above the client is refused:
  boot admitted through the base applied (joined, a store row present, world scope opened),
  change the cache to `{0, 9, 9}` and fire the `moduleInfo` update handler → the refusal
  effects above, plus store reset, `onScopeSettled(false)`/initial `worldScope()`, no `'link'`
  error, and no rebuild afterwards. Do the same once through `onInsert` and once through
  `onDelete` (cache emptied → `'update-server'`, tag `[lpw-4.2]`).
- `[lpw-4.2]` protocol below the client (`clientProtocol` 3, row `{0, 2, 1}`) →
  `'update-server'`, same refusal effects.
- `[lpw-4.2]` the gate applies with no row 0 (empty cache; and a cache holding only a row with
  another id) → `'update-server'`.
- `[lpw-4.2]` the gate's error callback fires → `'update-server'`; nothing else subscribed.
- `[lpw-4.2]` a cache read that throws → `'update-server'` (the client is not left with no
  verdict).
- `[lpw-4.3]` admitting numbers (equal; and server newer with a floor the client meets): the
  base set of exactly 30 queries opens only AFTER the gate applies (hold the gate: before it,
  zero base subscriptions and zero reducer calls; after it, the base set), then the base
  applied joins (`joinGame({ name })` once), fires `onReady(identity)`, unfreezes the link;
  `onProtocolMismatch` never called; `disconnect` never called.
- `[lpw-4.3]` an admitted connection whose row changes to other admitting numbers carries on:
  no second base subscription, no callback, still live, not frozen.
- `[lpw-4.3]` a reconnect build is gated again and, admitted, fires `onReconnect(identity)`;
  and `[lpw-4.1]` or `[lpw-4.2]` (your choice, say which): a reconnect build that meets a
  mismatch is refused (the server changed under a connected client).
- `[lpw-4.3]` a superseded build's gate callbacks do nothing: build 0's gate held, a newer
  build exists (for example after `reconnectNow()`), then build 0's applied fires with
  admitting rows → no base subscription on build 0; and with mismatching rows → no
  `onProtocolMismatch`, the newer build is unaffected and can still be admitted.
- `[lpw-4.3]` after admission the gate's error callback does nothing (still live, no
  mismatch).
- `[lpw-4.1]` a refusal clears a session terminal: drive a build to `'session-expired'`
  (`sessionState()` `'expired'`), then `continueAnonymously()` → anon build → gate mismatch →
  `sessionState()` is `'hidden'`. (Read the existing session-terminal tests in this file for
  the drive sequence.)
- Wrong implementations these must kill: the base set subscribed in the same tick as the
  gate; the gate query inside the base array; verdict ignored (always admit); refusing but
  still joining; refusing without disconnecting; refusing but rebuilding on the SDK's
  disconnect (a reconnect loop); `refused` not checked by `reconnectNow` /
  `continueAnonymously`; reading the callback's row instead of the cache on re-judge;
  re-judging toward admission (a second base subscription); a `'link'` "reconnecting…" report
  on refusal; judging a stale build.

### `net/connection.test.ts`
- `ts-4.4` (existing test, existing id in the title; append ` [lpw-4.3]`): the gate subscription
  is exactly the string `'SELECT * FROM module_info'`, and the base batch is still exactly the
  30 queries, none of them naming `module_info`. Keep every existing expectation in it.

### `main.protocolCheck.test.ts` — the booted page (new; `// @vitest-environment happy-dom`)
Model the boot on `client/src/main.targetKindGate.test.ts`'s whole-page cases: the REAL
`main.ts` over the real `index.html` shell, `vi.mock('./net/connection')` that hands the boot
the REAL `connect` (`vi.importActual`), `vi.mock('./module_bindings')` with a faked
`DbConnection.builder` you control (record every subscribe call and every reducer call per
build; expose the gate's applied / error callbacks and a `db.moduleInfo` cache), the wasm pkg
from `wasmPkgWalkingMock({ interact: () => [], protocolVersion: … })`, renderer and telemetry
mocked as that file does, listeners detached and `pagehide` dispatched in teardown. Drive
frames with the harness clock (`stubRaf`, `frame`, `clock`) so the live region's pump runs
(it writes on the trailing edge of a 500 ms window; read `client/src/ui/liveRegion.ts` and
how `main.zoneCue.test.ts` / `main.feedbackCore.test.ts` observe `#a11y-live`).
- `[lpw-4.1]` booted client speaking protocol 2 meets row `{0, 5, 3}`: `#status` text is
  exactly `This server runs a newer Monster Realm. Update the game to join.`; the faked SDK
  saw no subscribe but the gate and no reducer call at all, also after key presses that
  would send in a joined session (for example movement keys and a menu action) and after
  further frames.
- `[lpw-4.2]` three cases, each ending with `#status` exactly
  `This server runs an older Monster Realm. Its host must update it.` and no other subscribe /
  no reducer call: client 3 vs row `{0, 2, 1}`; the gate applied with no row; the gate's
  error callback.
- `[lpw-4.3]` client 2 vs row `{0, 2, 2}` (and/or `{0, 4, 1}`): the base set opens, the base
  applied joins (`joinGame` recorded once), `#status` shows neither mismatch line. This also
  proves `main.ts` hands `connect` the wasm export's number (a client booted with
  `protocolVersion: () => 2` against floor 3 is refused, the same server admits a client
  booted with `() => 3`).
- `[lpw-4.4]` announced once: after the refusal and enough frames for the live region to
  flush, `#a11y-live` holds the mismatch line, and across many later frames (several
  seconds of clock) it was written with that line exactly once (observe writes with a
  `MutationObserver` or by sampling per frame; a repeat write would show as the line plus a
  trailing U+00A0, see `liveRegion.ts`).
- `[lpw-4.4]` kept until reload: `#status` still shows the line after (a) 60 s of clock and
  frames, (b) the faked SDK firing that build's `onDisconnect`, (c) an `onConnectError` on an
  EARLIER build before the refusing one (the connect-failure line was up first; the mismatch
  replaces it and stays), (d) a later `download-blocked` hint (press F9 with the download
  blocked the way `main.ts`'s bug-bundle path detects it; read how an existing test raises
  `chrome.status.bugBundleBlocked`, e.g. grep `bugBundleBlocked` in `client/src/*.test.ts`);
  and no new `DbConnection` was built in any of them.
- `[lpw-4.4]` a session overlay showing before the refusal is hidden after it. If driving the
  real OIDC path to a session terminal is impractical in this file, use a second
  `describe` on the recording connection (`connectionRecordingMock`): call
  `H.connectOpts.onSessionExpired()` then `H.connectOpts.onProtocolMismatch('update-game')`
  and assert the session view is hidden and `#status` shows the line. Say which you did.
- `[lpw-4.5]` French: boot with the French locale (see `main.i18nBoot.test.ts` for how a boot
  selects `fr`, e.g. `?locale=fr`) and assert `#status` is exactly the French string for each
  side (two tests or one table-driven test; if table-driven, one `it` per side so each
  carries the tag).
- Wrong implementations these must kill: `main.ts` not passing `clientProtocol` (or passing a
  literal); the two message ids swapped; the handler routed to a toast (gone after its
  timer); the line cleared by the disconnect that follows; English shown under `fr`.

### `ui/feedbackPolicy.test.ts`
Update the pinned literals the new kind moves (kind roster, kind-to-channel map, the hint
count 17, the action-required roster, the `alsoCarriedBy` map), and add:
- `[lpw-4.4]` `protocol-mismatch` is a hint the player must act on, carried by
  `'the world hint line until reload'`.
- `[lpw-4.4]` `hintRank('protocol-mismatch')` is 4 and no other kind's is; it outranks every
  hint kind and no kind outranks it (`download-blocked`, `content-stale`, `world-disconnect`
  named explicitly).
The existing "hintRank is 3 for every action-required hint kind" test becomes "…every other
action-required hint kind" with `protocol-mismatch` out of its list.

### `ui/i18n/catalog.test.ts`, `catalogParity.test.ts`, `resolver.test.ts`
- `catalog.test.ts`: every pinned count 546 → 548 and the pinned roster (`EXPECTED_KEYS`, the
  English value table near `'chrome.status.contentStale'`, any sample-params or ordering
  table the two plain keys must join); add one describe "lpw-4: the protocol mismatch lines in
  both catalogs" with `[lpw-4.1]` (en `serverNewer` exact), `[lpw-4.2]` (en `serverOlder`
  exact) and `[lpw-4.5]` (both fr strings exact, each differing from its en string), read
  through the catalogs / resolver as the neighbouring per-slice describes do.
- `catalogParity.test.ts`: the "main.ts i18n-bound literal keys" roster gains
  `'chrome.status.serverNewer'` and `'chrome.status.serverOlder'` (sorted position), with a
  one-line comment in the style of its neighbours. Nothing else.
- `resolver.test.ts`: the `chrome.*` plain-value snapshot gains the two English strings.
  Nothing else.

## Findings (report apart from the tests)

Return, after the list of files you wrote:
- **Defects**: anything in the spec, plan or contracts that is wrong or untestable as stated,
  and any existing assertion you could not keep.
- **Questions**: ambiguities you resolved yourself, with the choice you made.
- For each new test: the one-line reason it fails today (missing export, missing option,
  missing key, wrong count…), so the orchestrator can check each red is the right red.
- The exact count of titles ending in each tag, per file (the ledger pins them).
