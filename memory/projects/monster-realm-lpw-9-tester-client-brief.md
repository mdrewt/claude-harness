# lpw-9 — tester brief (client, criterion lpw-9.6)

You write the gating TypeScript tests for the client half of slice `lpw-9` of Monster Realm. You do
not implement the feature and you do not edit production code. Everything you write goes under:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-9/client`

(`C` below; paths are relative to it). Read with Read/Grep on that path only. You have no shell; I
run everything and report failures back to you.

A compile-only skeleton of `src/ui/hostNoticeModel.ts` is committed (inert bodies). The catalog key
and the `main.ts` wiring do not exist yet. Your tests must fail on behaviour until they do.

Doctrine: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`. A test executes code; it never
reads hand-written source as text and never pins prose beyond the player-facing string a criterion
names. Test titles lead with the behaviour and END with the token `[lpw-9.6]` (the acceptance
ledger selects on that trailing tag); no other slice or criterion id in a title.

## The criterion (verbatim)

- **lpw-9.6:** WHEN a player first joins a `private` target, THE CLIENT SHALL show once, for that server, that its host can read and change their data in that world.

Decision default it implements: a player sees the notice once per server.

## Contracts (fixed)

```ts
// src/ui/hostNoticeModel.ts — pure; no DOM, no i18n, storage injected
import type { StorageLike } from '../input/bindingStore';   // Pick<Storage, 'getItem' | 'setItem'>
import type { TargetKind } from '../net/shellDocument';     // 'official' | 'test' | 'local' | 'private'

/** `mr.hostNotice.v1|<encodeURIComponent(uri)>|<encodeURIComponent(db)>` — the raw pair, never
 *  normalised, the way the reconnect token is keyed (`net/authToken.ts` `storageKey`). */
export function hostNoticeStorageKey(uri: string, db: string): string;

/** True only for a `private` target whose key does not hold `'1'`. A null storage, or one whose
 *  `getItem` throws, counts as not seen (the notice is owed). Never true for another kind. */
export function hostNoticeDue(kind: TargetKind, storage: StorageLike | null, uri: string, db: string): boolean;

/** Writes `'1'` under the key. Returns true when the write happened; false for a null storage or
 *  a `setItem` that throws (never throws itself). */
export function markHostNoticeSeen(storage: StorageLike | null, uri: string, db: string): boolean;
```

Catalog (`src/ui/i18n/messageIds.ts`, `catalog.en.ts`, `catalog.fr.ts`), one plain key:

- id: `chrome.status.privateHostNotice`
- en: `This server's host can read and change your data in this world.`
- fr: `L’hôte de ce serveur peut lire et modifier vos données dans ce monde.` (U+2019 apostrophe,
  as the French catalog writes `d’échange`)

`src/main.ts`, inside `connect({... onReady ...})` — the page's first successful join:

```ts
if (hostNoticeDue(TARGET_KIND, browserStorage(), URI, DB)) {
  route('privacy-notice', i18nT('chrome.status.privateHostNotice'));
  markHostNoticeSeen(browserStorage(), URI, DB);
}
```

`route('privacy-notice', ..)` is the standing world hint: it paints on `#status` (while no
higher-ranked hint stands) and is said once by the live region (`#a11y-live`). `browserStorage()`
is `window.localStorage` or null. `onReconnect` does not show it. Nothing is shown and nothing is
written for `official`, `test` or `local` targets.

## Files you write

1. `src/ui/hostNoticeModel.test.ts` (new) — the model: the key's exact shape, including a `uri`
   and `db` that need encoding, and that two spellings of one address are two keys (it is the
   reconnect token's rule); due only for `private`; not due once marked; marking one server leaves
   another server (other `uri`, or same `uri` and other `db`) due; a value other than `'1'` under
   the key is still due; a null storage and a throwing `getItem` are due; `markHostNoticeSeen`
   writes exactly one key with `'1'`, returns true, and returns false without throwing for a null
   storage and a throwing `setItem`. Use an in-memory `StorageLike` fake, not the DOM.
2. `src/main.hostNotice.test.ts` (new) — the wiring, booting the real `main.ts`. Follow
   `src/main.claimCode.test.ts` (`bootUnder(doc)` then `opts.onReady(H.identity)`, and its
   `spyStorage()`), with the shared harness in `test-util/mainBootHarness`; the shell document
   sets the kind (`SHELL_CONFIG_GLOBAL`). Prove, through the page:
   - a `private` target's first `onReady`: `#status` shows the English line (type the expected
     string in the test; do not read it off the catalog), the live region says it, and
     localStorage holds exactly the key `hostNoticeStorageKey(uri, db)` = `'1'`;
   - a second page boot against the same server (the mark is there): `#status` does not show the
     line and the live region does not say it;
   - the same page reconnecting (`onReconnect`) on a never-marked `private` target does not show
     it a second time;
   - a different `private` server (other `uri` or `db`) in the same browser profile shows it;
   - `local`, `official` and `test` targets: never shown, and no `mr.hostNotice` key is read or
     written;
   - `?locale=fr`: the French line;
   - localStorage that throws on read and write: the line is still shown.
3. `src/ui/i18n/catalog.test.ts` — the new key in the pinned rosters, exactly as the two most
   recent additions were made (`chrome.status.serverNewer`, `pvp.empty`): `EXPECTED_PLAIN`, the
   key count (549 -> 550, each place it is pinned, with the comment convention used there), and
   an exact en / fr pair test for the new line (French accents the way the neighbouring tests
   build them; fr differs from en).
4. `src/ui/i18n/catalogParity.test.ts` — its roster of the literal catalog keys `main.ts` names
   gains `chrome.status.privateHostNotice` (find how `chrome.status.serverNewer` is listed).
   `hostNoticeModel.ts` does not import the resolver, so the importer roster does not change.

## Kill list (each must fail at least one test)

- The notice shows for `local` (the player is the host there), `official` or `test`.
- It shows on every page load, or on every reconnect.
- The mark is keyed per browser, not per server (a second server never shows it), or keyed on
  `uri` alone.
- The mark is written but the line is never painted; or painted but never marked.
- Unreadable storage suppresses the notice.
- The French catalog entry is missing or equals the English one.

## What I need back

The files written; separately any **defect** in the contract or skeleton and any **question**;
and the count of titles ending `[lpw-9.6]` in each of `hostNoticeModel.test.ts` and
`main.hostNotice.test.ts`.
