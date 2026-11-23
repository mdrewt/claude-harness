# lpw-4 plan — the client refuses a server it cannot speak to, naming which side to update

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-4 · base `origin/master` d6d80547 ·
worktree `.claude/worktrees/lpw-4` · branch `slice/lpw-4` · tier hard.

## What is true today (measured)

- `connect()` (`client/src/net/connection.ts`) opens ONE subscription per build, in the SDK's
  `onConnect`: the base set of 30 queries. Its applied callback unfreezes the link
  (`onConnected`), joins, opens the world scope and fires `onReady` / `onReconnect`. Nothing
  reads `module_info`; the client has no version check.
- lpw-3 (merged, #829) publishes `module_info { id: 0, protocol, min_client_protocol }` (public,
  one row) and `client-wasm` exports `protocol_version()`. Both constants are 1 today.
- Live probe, SDK 2.11.0 against a 2.11.0 in-memory host with this module
  (`/tmp/lpw-4-sb.Aja8zx/probe/driver.mjs`):
  - `SELECT * FROM module_info` → `onApplied`, cache holds
    `[{id:0,protocol:1,minClientProtocol:1}]`; the object handed to `onConnect` IS the built
    connection (`c === conn`, `ctx.db === c.db`). Round trip about 5 ms on loopback.
  - after the owner's SQL `DELETE FROM module_info` → `onApplied` with an empty cache (the
    "delivers no row" case); the owner's `sync_content` puts the row back.
  - `SELECT * FROM no_such_table` (what a module older than lpw-3 answers for `module_info`)
    → the handle's `onError` ("no such table…"); the socket STAYS open (still active 1 s
    later); `c.disconnect()` then fires `onDisconnect` within milliseconds.
  - SDK source (`dist/index.mjs` `#processServerMessage`): `SubscribeApplied` fills the cache,
    emits `applied`, then runs row callbacks; a `SubscriptionError` that carries a request id
    only calls the handle's `onError`.
  - Row changes on a live `module_info` subscription (`probe/watch.mjs`, `watch3.log`): the
    owner's SQL `UPDATE` and the owner's `sync_content` each arrive as `onUpdate`, a `DELETE`
    as `onDelete`, the re-insert as `onInsert`; at every callback the cache already holds the
    new state.
  - A row that gained a column cannot be read by an older client. A scratch module with one
    `u32` appended to `module_info` (and, separately, to `zone_def`) was published and read
    with today's bindings: the SDK throws `RangeError` inside `#parseRowList` (it decodes rows
    back to back with the client's own row type), in the socket's message handler, so neither
    `onApplied` nor `onError` runs (`publish2.log`, `publish3.log`). So `module_info`'s three
    columns can never change, and an appended column on any table a client subscribes is a
    change an older client cannot talk across.
- `main.ts` shows persistent states through `reportError(kind, text)` → `route` →
  `setWorldHint` (painted on `#status`, said once per new text by `paintWorldHint` →
  `announceNow`). `content-stale` is the one kind `resetFeedbackSinks` keeps across a
  reconnect; its policy row is `acts('hint', 'the world hint line until reload')`. The frame
  loop (which pumps the live region) starts whether or not the client ever joins.
- Every reducer send in `main.ts` goes through `conn?.live()?.reducers…`; `live()` is
  connection.ts's `current`.
- Scope probe (the whole change prototyped, full client suite run, then reverted;
  `/tmp/lpw-4-sb.Aja8zx/probe.patch`, `probe2.json`): 8 files outside `touches:` go red.
  Six boot tests mock the wasm pkg inline and lack `protocol_version`
  (`main.frameErrorWiring`, `main.input`, `ui/screens/{bag,journal,profile,social}Screen.boot`);
  `catalogParity.test.ts` pins the roster of literal keys `main.ts` resolves;
  `resolver.test.ts` pins every plain `chrome.*` value. All 8 widened (`mr-touches`, granted).
  `main.targetKindGate.test.ts` (real `connect()` over a faked SDK that never applies) stays
  green. No eval reads `connection.ts` or `main.ts`.

## Functional core / imperative shell

Core — `client/src/net/protocolCheck.ts` (new; pure, no SDK, no DOM):

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

- `checkProtocol`, in this order: `'missing'` or `'refused'` → `'update-server'`;
  NOT(`server.protocol >= client`) → `'update-server'`;
  NOT(`server.minClientProtocol <= client`) → `'update-game'`; else `'ok'`.
- Written as negated admissions, so a `NaN` anywhere is a refusal, never `'ok'`.
- A row that breaks the module's own invariant (`minClientProtocol > protocol`, which lpw-3.4
  rules out) can satisfy both criteria's WHEN at once; the verdict is `'update-server'`,
  because only the host can repair that row (a newer game only moves further above `protocol`).
  For every row that keeps the invariant the two conditions are exclusive, so lpw-4.1 and
  lpw-4.2 never compete.
- `serverProtocolFrom`: the numbers of the row whose `id` is 0 (lpw-3 note n1); rows with any
  other id are ignored; none → `'missing'`.

Shell:

- `shell/config.ts`: `export const PROTOCOL_VERSION = protocol_version();` beside the other
  wasm constants.
- `connection.ts` (wiring): `ConnectionOptions` gains two REQUIRED fields,
  `clientProtocol: number` and `onProtocolMismatch: (side: ProtocolMismatch) => void`.
  In `onConnect`, after the token and identity handling that is there today, the build
  subscribes the bare string `'SELECT * FROM module_info'` (not an array). Its applied
  callback judges `serverProtocolFrom(c.db.moduleInfo.iter())`, where `c` is the connection
  handed to `onConnect`; a read that throws is judged `'refused'`. Its error callback judges
  `'refused'`. Callbacks of a superseded build do nothing.
  - `'ok'` → the build is admitted: the existing base-set subscription opens, unchanged (the
    block moves into a local `openBaseSet` closure; view the diff with whitespace hidden), and
    `c.db.moduleInfo` gets `onInsert` / `onUpdate` / `onDelete` handlers.
  - An admitted build is judged again on every `module_info` row change, from the cache, and
    only toward refusal: `'ok'` changes nothing, a mismatch is the refusal below. A refused page
    is never admitted. An error callback of the `module_info` set after admission is ignored.
  - a mismatch → the refusal, terminal for the page: `refused = true`; the drop path's own
    teardown (`handleDrop`: the world scope stops, the store resets, the link freezes) without
    its `'link'` report and without a rebuild; `sessionMode = 'hidden'`; `current = undefined`
    (so `live()` and `conn` are undefined and no reducer can be sent); `c.disconnect()`; then
    `opts.onProtocolMismatch(side)` once. `scheduleRebuild` and `attemptBuild` return at once
    while `refused`, so the SDK's own `onDisconnect`, `reconnectNow()`,
    `continueAnonymously()`, a pending timer and a bfcache `pageshow` build nothing.
    `linkFrozen()` is true from then on.
  - The SDK's error text of a refused query, and a throwing cache read, go to `console.error`.
- `main.ts` (wiring): `clientProtocol: PROTOCOL_VERSION`; `onProtocolMismatch: (side) => …`
  clears a session terminal overlay (`applySession({ kind: 'connected' })`, the one event
  that hides it) and calls `reportError('protocol-mismatch', protocolMismatchLine(side))`,
  where `protocolMismatchLine` is a literal switch over the two catalog keys.
  `resetFeedbackSinks` is not changed: it runs only from `onReconnect`, which a refused
  connection never calls.
- `ui/feedbackPolicy.ts`: kind `'protocol-mismatch'`, row
  `acts('hint', 'the world hint line until reload')`, and `hintRank` 4 for it alone (decision 6).
- i18n (`messageIds.ts`, `catalog.en.ts`, `catalog.fr.ts`), two plain keys:
  - `chrome.status.serverNewer` — en "This server runs a newer Monster Realm. Update the game
    to join." · fr "Ce serveur utilise une version plus récente de Monster Realm. Mettez le
    jeu à jour pour le rejoindre."
  - `chrome.status.serverOlder` — en "This server runs an older Monster Realm. Its host must
    update it." · fr "Ce serveur utilise une version plus ancienne de Monster Realm. Son hôte
    doit le mettre à jour."
- `test-util/mainBootHarness.ts` and the six inline wasm mocks answer `protocol_version`.

No server change, no schema change, no new dependency, no data model change.

## Decisions taken in the plan (each recorded under `plan-delta:` or `decisions` in the PR)

1. **A mismatch is terminal until reload; the connection ends and never rebuilds.** lpw-4.4
   says the message is kept until reload. A client that re-ran the check on a later connection
   and was admitted would then play under a line saying it cannot join; clearing the line on
   admission would contradict lpw-4.4, and what a player sees is not the builder's to change.
   So the refusal is the page's last connection state, and a reload is the retry.
2. **lpw-3 note n1 is not built here; it is filed as a spec note with a follow-up row.** n1
   asks lpw-4 to re-evaluate when the row arrives or changes, because a client that connects
   between a publish and the owner's `sync_content` reads the previous numbers (or no row). That
   conflicts with lpw-4.4 as written (decision 1). Measured exposure: a client older than or
   equal to the row is admitted in that window; only a client NEWER than the server it reaches
   (a new bundle loaded before the publish and sync finish) is refused, and it is right at
   that moment, then stale until reload. Deploying the module (publish + sync) before the
   client bundle avoids it. The follow-up carries the alternative (hold the verdict, or clear
   the line on a later admission) for the operator, since it changes lpw-4.4.
3. **An admitted connection is judged again when the row changes, and only toward refusal**
   (plan review, both lenses). A client that reconnects between a publish and the owner's
   `sync_content` is judged on the previous numbers; when the row then changes to numbers
   that rule the client out, lpw-4.1's WHEN holds on a connection that is sending reducers.
   The row handlers close that. The other direction (a refused page admitted later) stays
   out, by decision 1.
4. **Both-conditions precedence is `'update-server'`** (core, above).
5. **Key names `chrome.status.serverNewer` / `serverOlder`**: they are status-line strings and
   sit beside `chrome.status.contentStale`; that namespace is what puts them under
   `resolver.test.ts`'s snapshot (widened).
6. **`protocol-mismatch` is the one hint of rank 4** (plan review, both lenses). At rank 3 a
   later action-required hint (`download-blocked`, from a blocked F9 bundle download, is the
   one that can arrive with no session) would be painted over it for the rest of the page,
   and uncovering it would say it a second time; both break lpw-4.4. At rank 4 nothing
   replaces it. Cost, stated in the PR: while refused, a blocked F9 download shows no hint
   (it is still logged).
7. **No new timeout on the `module_info` set.** A server that neither applies nor refuses it
   leaves the client connecting, as an unanswered base set does today.
8. **A refusal clears a session terminal** (plan review). A build refused after a
   session-expired or auth-unreachable overlay would otherwise leave that overlay up with
   buttons that can no longer do anything.
9. **Accepted, stated in the PR's risks, not built:** any refused `module_info` query reads as
   an older server, whatever the host's reason (the spec's rule; matching the host's error
   text would be a guess); while refused, a send still toasts the link-down line and
   `startSignIn` still reports `'transient-error'` (both say "try again"); a frame opened
   within the live region's 500 ms window of the refusal takes its announcement, as it would
   any hint's (the line stays painted).
10. **`docs/DECISIONS.md`, the lpw-3 entry, gains the client rule**: the check runs before any
   other subscription, an admitted connection is re-judged only toward refusal, a refusal
   lasts until reload, `module_info`'s columns never change, and the bump rule's list of
   breaking changes gains "a column appended to a table or view a client subscribes"
   (measured above; the entry's "additive change" sentence is narrowed to match).

## Tests (tester, opus; titles end with the criterion tag `[lpw-4.N]`)

- `net/protocolCheck.test.ts` (new): the total function — examples for every branch, the
  boundaries (`protocol == client`, `minClientProtocol == client`), the precedence, `NaN`
  refusals, a fast-check property over u32 triples that keep `min <= protocol`;
  `serverProtocolFrom` (row 0 among others, no row 0, empty).
- `net/connection.runtime.test.ts`: the gate before the subscription set, over the real
  `connect()` and the faked SDK — the first and only subscribe on connect is the
  `module_info` string; each mismatch (floor above the client; protocol below; no row;
  refused; a throwing read) opens nothing else, calls no reducer, reports the side once,
  disconnects, and nothing rebuilds (timers, SDK disconnect, `reconnectNow`,
  `continueAnonymously`, `pageshow`); admission opens the 30-query set and joins as today; a
  reconnect build is judged again; an admitted build whose row changes to a mismatch is
  refused (store reset, scope stopped, link frozen, no `'link'` report), and one whose row
  changes to admitting numbers carries on; a refusal clears `sessionState()`. Existing tests
  keep every assertion; only the harness learns the gate.
- `net/connection.test.ts`: `ts-4.4` pins the two-stage list (the gate string, then exactly the
  30 queries).
- `shell/config.test.ts`: `PROTOCOL_VERSION` is the wasm export's value.
- `main.protocolCheck.test.ts` (new): the booted page over the REAL `connect()` and a faked SDK
  builder — each message on `#status` and in the live region once, no reducer call, kept
  across time, frames, an earlier connect failure and a later `download-blocked` hint; the
  admitted case joins; a session overlay is cleared; French boot shows both French lines.
- `ui/feedbackPolicy.test.ts`, `ui/i18n/catalog.test.ts`, `catalogParity.test.ts`,
  `resolver.test.ts`: the kind, the keys, the exact strings, the rosters.
- No new e2e (spec): every existing e2e is the admitted case through the real UI and a real
  host; the full e2e run is part of the DoD.

## Order of work

plan review (reviewer + red-team, parallel) → tester (opus) → red proof per criterion →
implement → targeted green → lenses (reviewer, red-team, netcode review, verifier) →
`just ci` + full e2e → `mr-gates check` → docs (ARCHITECTURE.md "Connection and store", the
lpw-3 decision entry (decision 10), the `spacetimedb-client` skill line; each widened as a
stale claim) → spec notes (n1's window with the operator's options; the bump-rule finding for
the spec's lpw-3 contract text; lpw-13 loads the page after publish and sync) → PR.

## Plan review (reviewer + red-team, 2026-11-21) — dispositions

- Re-judge an admitted connection toward refusal (reviewer HIGH, red-team F4): built, decision 3.
- Session overlay left up (reviewer MEDIUM): built, decision 8.
- Mismatch covered by `download-blocked`, then said twice (both): built, decision 6.
- `module_info`'s row shape is a contract (reviewer MEDIUM): measured (it is), decision 10.
- Test contract asked for unreachable sequences (reviewer MEDIUM): contract rewritten; the
  `resetFeedbackSinks` change dropped as dead.
- Throwing cache read hangs the client (red-team F5): built (judged `'refused'`).
- Unspecified details (reviewer LOW): the query is a bare string; `identity()` after a refusal
  is unspecified (tests do not pin it); the SDK's error text goes to `console.error`.
- Terminal refusal strands a client newer than a server mid-upgrade (red-team F2, lpw-3 n1):
  not built, decision 2; spec note with a follow-up row.
- Any subscription error reads as an older server (red-team F3), link-down toast and
  `startSignIn` copy while refused (red-team F6, reviewer LOW), announcement taken by a frame
  transition (red-team F1; the pump announces only on a frame change, so not at an idle
  boot): accepted, decision 9.
- Token saved before the verdict (red-team F7): intended; the server accepted the token.
