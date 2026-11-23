# lpw-2 plan — a local or private world keeps its player across launches

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-2 · base `origin/master` 5ceb483e ·
worktree `.claude/worktrees/lpw-2` · branch `slice/lpw-2`.

## What is true today (measured)

- `createAuthTokenGate(uri, db, host)` reads and writes only `host.sessionStorage`
  (`storageMethod` hard-codes the property). One production caller: `connection.ts` `connect()`.
- `connect()` calls `auth.onConnected(token)` only for an `anon` build; the kind marker
  (`writeAuthKind`), the claim code (`claimCode.ts`) and the OIDC flow (`oidc.ts`) all use
  `sessionStorage`.
- `main.ts` holds `TARGET_KIND` (from `shell/config.ts`) and passes `signIn` to `connect`; it
  does not pass the kind.
- Server: `on_disconnect` deletes the presence rows only when the identity's LAST connection
  ends and saves the position; `join_game` restores it (`take_start`) and refuses a second join
  with `already joined`. So a second page under one identity is already safe server-side.
- The client seeds its send seq from the server ack, so a later page under the same identity
  can move.

## Functional core / imperative shell

Core (`authToken.ts`, pure over an injected host):

```ts
export type TokenPersistence = 'tab' | 'device';
export interface TokenStorageHost {
  readonly sessionStorage?: unknown;
  readonly localStorage?: unknown;
}
/** 'device' for exactly 'local' and 'private'; 'tab' for 'official', 'test' and any run-time
 *  value outside the type (exhaustive switch, `kind satisfies never` in the default arm). */
export function tokenPersistenceFor(kind: TargetKind): TokenPersistence;
export function createAuthTokenGate(
  uri: string, db: string, host: TokenStorageHost | undefined, persistence: TokenPersistence,
): AuthTokenGate;
```

- `'device'` reads and writes `host.localStorage`; any other value `host.sessionStorage`
  (fail to the per-tab side). Same `storageKey(uri, db)`, same parse rules, same suppression
  rule, same silent degradation. No fallback from one area to the other: a blocked
  `localStorage` is an anonymous connect, exactly as a blocked `sessionStorage` is today.
- A `'device'` gate never touches `sessionStorage`; a `'tab'` gate never touches `localStorage`.
- `readAuthKind` / `writeAuthKind` / `wasEverAuthenticated` keep their signatures and stay on
  `sessionStorage` (the spec keeps the claim code and the OIDC flow per tab).
- `persistence` is a REQUIRED parameter: one production caller, and a default would let a
  missed wiring silently pick an area.

Shell:

- `connection.ts`: `ConnectionOptions` gains `readonly targetKind: TargetKind` (required, as
  lpw-1 made `signIn`); the one gate construction becomes
  `createAuthTokenGate(opts.uri, opts.db, globalThis, tokenPersistenceFor(opts.targetKind))`.
  Nothing else in `connect()` changes. lpw-4 edits this file later: the diff is one import,
  one option and one call argument.
- `main.ts`: `targetKind: TARGET_KIND` in the `connect({...})` literal.

No data model change, no server change, no new dependency.

## Tests (tester, opus; titles end with the criterion tag `[lpw-2.N]`)

| File | Covers |
|---|---|
| `client/src/net/authToken.test.ts` | the pure rule (2.1, 2.2), the device gate's area, key and isolation (2.1), the tab gate unchanged (2.2), every throwing/absent storage shape for the device gate with no fallback (2.3), the suppression rule on the device gate (2.8). Existing three-argument calls gain `'tab'`, assertions unchanged |
| `client/src/net/connection.runtime.test.ts` | `connect()` with `targetKind` per kind: where the anon token lands and is read from (2.1, 2.2), throwing `localStorage` (2.3), an account build writes nothing to `localStorage` while an anon build on the same kind does (2.4), two rejections withhold a device token (2.8) |
| `client/src/main.targetKindGate.test.ts` (sibling test of `main.ts`) | the booted page hands `connect` the document's kind, for all four kinds (2.1, 2.2) |
| `client/e2e/local-identity.spec.ts` (new) | 2.5 resume identity + tile after a page close; 2.6 the `official` control joins as a new identity; 2.7 a second page shares the identity and either close leaves the character |

## Docs

- `authToken.ts` comments state the two areas (current behaviour).
- `ARCHITECTURE.md` "Connection and store" (widened: named stale claim) states the per-kind rule.
- `docs/DECISIONS.md`: one entry, placed after "A target's kind gates telemetry and account
  sign-in" (a security-posture choice a maintainer would plausibly undo or extend to
  `official`; the spec's `decision-defaulted:local-private-reconnect-token=device-storage`).
- `docs/local-play.md` §3 "What identifies a player between launches" becomes stale, but the
  concurrent sibling lpw-7 holds that file: recorded as a note for the supervisor, not widened.

## Risks handed to the lenses

1. A device token is readable by any script in the page's origin and outlives the tab (spec
   risk; lpw-11's CSP is the defence). The account JWT must never reach `localStorage` (2.4).
2. Two pages that boot at the same instant with no stored token each mint an identity; the
   last writer's token is the one a later launch resumes.
3. Suppression is per page: after a host reset with two pages open, each page can mint its
   own identity before either re-reads storage. Same rule as the per-tab gate by the
   criterion (2.8); recorded as a note.
4. A token written to `sessionStorage` before this change for a `local`/`private` target is
   not migrated. A production document that names no kind resolves to `private`
   (`connectionConfig.ts` `kindOf`), so such a deployment's returning anonymous players join
   once as new players.
5. Withhold-then-overwrite outlives the tab: two verify failures the SDK cannot tell from a
   rejection, then a successful anonymous connect, replace the stored token for good. The
   criterion (2.8) fixes the rule; recorded as a follow-up note for the host gate (lpw-12).
6. A token stays in `localStorage` when a target's kind later changes (the spec's reversal
   note: tokens already written stay until the player clears them).

## Plan review (reviewer + red-team, 2026-11-21)

No blocker. Folded into the tester brief: positive preconditions inside the 2.3 / 2.4 / 2.8
tests, no-fallback in both directions, zero cross-area accesses, out-of-type rule inputs,
kind crossed with URI shape, whole-`localStorage` snapshots, the marker staying per tab, and
the e2e details (fresh `context.newPage()`, off-spawn tile, both close orders, the survivor
still moves). Recorded as notes, not built: risks 2, 3, 5 and concurrent driving of one
character from two pages.

## Gate

`just ci` with no SpacetimeDB running, then the new e2e against a side server
(`spacetime start --in-memory`), then `mr-gates check --slice lpw-2`.
