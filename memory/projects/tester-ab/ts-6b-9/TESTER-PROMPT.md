# Tester brief — monster-realm slice ts-6b-9 (RED phase)

Write the failing gating tests for slice ts-6b-9 in the worktree
**/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-9**
(all paths below are relative to it). Edit ONLY test files listed under "Files you may edit". Do
not implement anything. You have no shell: the orchestrator runs every test and proves each new
one fails for the right reason, and will send failures back to you.

Read first: the spec section `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md`
lines 1556-1620 (EARS criteria ts-6b-9.1..6), the plan `/tmp/ts-6b-9.6GCn/plan.md`, the
project's `AGENTS.md`, and `~/.claude/harness/standards/testing-tdd.md`. Each test file you touch has
a header and house conventions (no regex literals / `new RegExp` in some files, happy-dom
environment lines, harness helpers) — follow the file's own conventions.

## Contracts

The production surface the tests call. All signatures are UNCHANGED from today except where marked.

- `client/src/ui/liveRegion.ts`: `class LiveRegion { announce(message: string, nowMs: number): void; flush(nowMs: number): void }`, `LIVE_REGION_ID = 'a11y-live'`, `COALESCE_WINDOW_MS = 500`.
  NEW BEHAVIOUR: dedup only inside one coalescing window (identical — or different — messages announced
  before the window elapses merge into ONE write, last wins). A message announced after the previous
  one was painted is written again. When the text to paint equals the node's current `textContent`,
  the node is written with a trailing U+00A0 appended (and a further repeat writes it bare again), so
  the node's content always changes on a repeat; the spoken text with any trailing U+00A0 removed equals
  the announced message.
- `client/src/ui/overlayA11y.ts`: `openOverlayA11y(...)` / `closeOverlayA11y(...)` (read the file for
  the exact signatures). NEW: the deferred initial-focus timer calls `.focus({ preventScroll: true })`
  on the anchor.
- `client/src/ui/i18n/resolver.ts`: `setLocale(locale: string)`, `currentLocale()`, `t(key)`, `tf(key, params)`, `CATALOGS`.
- `client/src/ui/i18n/catalog.en.ts` `CATALOG_EN`, `client/src/ui/i18n/catalog.fr.ts` `CATALOG_FR`:
  NEW: each carries the 17 `a11y.*` keys — `a11y.overlay.<OverlayId>.title` for the 16 ids in
  `OVERLAY_IDS` (`client/src/ui/overlayRegistry.ts`) and `a11y.world.region`. en values are
  byte-identical to today's `client/src/ui/a11yCopy.ts` values; fr values are French and (except
  possibly 'Menu' / 'Conversation') differ from en.
- `client/src/ui/i18n/messageIds.ts`: NEW `A11yKey` = the literal union of those 17 keys (kept OUT of
  `MessageId`); `Catalog` is total over `MessageId | A11yKey`.
- `client/src/ui/a11yCopy.ts`: `a11yCopy: Readonly<Record<string,string>>` (now the frozen en view of
  the catalog's a11y.* entries) and `t(key: string): string` — NEW: resolves through the i18n resolver
  in the CURRENT locale (throws on a key that is not an a11y key, as today).
- `client/src/ui/announcements.ts`: `announcementsFor(prev: A11ySnapshot, next: A11ySnapshot): readonly string[]` (unchanged; resolves names through a11yCopy.t, so NEW: the current locale).
- `client/src/net/connection.ts`: `opts.onClaimResult?: (r: { ok: boolean; message: string }) => void`,
  called after `c.reducers.completeGuestClaim({ code })` settles. NEW: `ok:false` ONLY when the reducer
  promise rejects; a throw inside the `ok:true` handler is logged (console.error) and NEVER produces an
  `ok:false` call and never an unhandled rejection.
- `client/src/main.ts` (driven through the existing runtime harness in `client/src/main.privacyWiring.test.ts` — `bootMain`, `runFrame`, the injected `store.ownAccount` fixture):
  - NEW (ts-6b-9.1): on the frame where the derived deletion phase goes `active` → `grace`, `main.ts`
    announces `privacyBannerLabel(countdown)` (the same line the HUD `#privacy-countdown` banner shows
    that frame; `tf('privacy.countdown.grace', {duration})`) once through the live region. A boot whose
    first account row is already in grace announces no grace line. The line is never re-announced
    while the phase stays grace.
  - NEW (ts-6b-9.2): in the export `store.onBatchApplied` listener, when the newly assembled export is
    `complete` and the previous assembly (computed on this connection) was not the same complete
    request — `none`→`complete` (all chunks in one batch, the normal server shape),
    `incomplete`→`complete`, or an older complete requestId → a newer one — it announces
    `tf('privacy.export.complete', { received })` once. The FIRST assembly after boot or after a
    reconnect (`exportAssembly` cleared by onReconnect) is silent even if complete; later batches
    with the same complete assembly are silent. You will need to inject `store.ownExportChunks`
    the way the harness injects `ownAccount`, and fire a batch (the real store's `flushBatch()` on the
    instance main.ts handed the connect mock). Read `client/src/ui/exportAssembly.ts` for the chunk
    shape and what makes an assembly complete.

## Gating tests — exact names (the acceptance ledger runs each with `vitest -t "<name>"` and requires exactly 1 passed)

1. `client/src/main.privacyWiring.test.ts`: `an account entering deletion grace is announced once`
   — active→grace announces the grace line exactly once across many frames (≥ one coalescing window
   later it is in `#a11y-live`, and later frames do not write it again); AND a separate boot straight
   into grace never writes a grace line (a second `it` with a different name, or both phases in the
   one test — your call; the named one must cover the announce-once half). Note `Date.now()` is not
   stubbed in that harness: compare against what the banner shows the same frame, or stub Date.now
   with a discriminating pair (see memory: runFrame stubs performance.now only).
2. `client/src/main.privacyWiring.test.ts`: `a data export that finishes assembling is announced once`
   — a live-connection completion announces exactly once; a boot whose first batch already holds a
   complete export announces nothing (reconnect replay is the same `exportAssembly === undefined`
   path; cover a real reconnect too if the harness can drive `onReconnect`).
3. `client/src/ui/liveRegion.test.ts`: `a repeated identical announcement after the first was painted is written again`
   — and REWRITE the existing `S1-LIVE-DEDUP-CONSECUTIVE BITES` case (it pins the old drop-the-repeat
   behaviour) to pin the new one: the node's content changes on the repeat, and identical
   announcements inside ONE window still produce ONE write. Check every other case in that file
   for the old `#lastWritten` dedup assumption and adjust it as a named intentional change.
4. `client/src/ui/overlayA11y.test.ts`: `under the fr locale an opened overlay is named and announced in French`
   — under `setLocale('fr')` (restore `'en'` after, in a finally/afterEach), for EVERY id in
   `OVERLAY_IDS`: the opened root's `aria-label` equals `CATALOG_FR['a11y.overlay.<id>.title']`, and
   `announcementsFor({topOverlay:null,message:''},{topOverlay:id,message:''})` yields that same fr
   string; `a11yCopy.t('a11y.world.region')` equals `CATALOG_FR['a11y.world.region']`; and an
   anti-copy-through check that at least the boxView/shopView/world names differ from CATALOG_EN.
   (`announcementsFor` lives in ui/announcements.ts; importing it into overlayA11y.test.ts is fine.)
5. `client/src/ui/overlayA11y.test.ts`: `the deferred initial focus does not scroll the frame`
   — spy the anchor's `focus` and assert the deferred call passed `{ preventScroll: true }`
   (and that it IS the deferred call: not called synchronously at open).
6. `client/src/net/connection.runtime.test.ts`: `a throw in the claim-success handler is not reported as a claim rejection`
   — with `completeGuestClaim` resolving and `onClaimResult` throwing on the ok:true call, after the
   promise chain settles `onClaimResult` was called exactly once (ok:true), never with ok:false; and a
   rejecting `completeGuestClaim` still yields exactly one ok:false call (keep or extend an existing
   test for that). Make sure the thrown error does not surface as an unhandled rejection that fails
   the run (the implementation logs it via console.error — spy and silence console.error).

## Collateral pins to update (named intentional changes, same files)
These existing tests will break when the 17 a11y.* keys move into the catalogs; update them now so
the implementation needs no test edit (the implementer may not touch tests):
- `client/src/ui/i18n/catalog.test.ts`: the roster pin (`EXPECTED_KEYS` 528 → 545, +17 a11y keys with
  their en values if the roster pins values) and anything else that enumerates CATALOG_EN keys.
- `client/src/ui/i18n/catalogParity.test.ts`: PARITY-01 (key-set parity / union parser) if it derives
  the expected key set from the `MessageId` union only — it must also read the `A11yKey` union; check
  PARITY-04 DEAD-KEY still only scans `MessageId` (a11y keys are reached dynamically through
  `OVERLAY_A11Y[id].labelKey`; their orphan check is a11yCopy.test.ts's set equality).
- `client/src/ui/i18n/catalogShape.test.ts`: SHAPE-04's title says a11y keys stay "out of CATALOGS"
  — no longer true; make the title and any assertion state the new rule (a11y.* values are plain,
  brace-free strings in every catalog; never passed to `tf`).
- `client/src/ui/a11yCopy.test.ts`: keep it truthful for the delegating module (the set-equality gate
  vs OVERLAY_IDS stays).
- `client/src/ui/i18n/i18nTypes.compile.test.ts`: optional — a fixture where a catalog omits one a11y
  key must fail tsc, if that suite's fixture pattern makes it cheap.

## Files you may edit
client/src/main.privacyWiring.test.ts, client/src/ui/liveRegion.test.ts, client/src/ui/overlayA11y.test.ts,
client/src/net/connection.runtime.test.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/i18n/catalog.test.ts,
client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/catalogShape.test.ts,
client/src/ui/i18n/i18nTypes.compile.test.ts. Nothing else.

Report: each test name you added/changed, file:line, and the specific defect each one fails on today.
