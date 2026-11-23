A connection target of kind `local` or `private` now keeps its anonymous reconnect token in the origin's `localStorage`, so a page closed and opened again in the same browser profile resumes the same player, and a second page joins as the same identity. `official` and `test` targets keep it in per-tab `sessionStorage`, as before.

## What changes

- **`client/src/net/authToken.ts`:** `TokenPersistence` (`'tab' | 'device'`) and the pure rule `tokenPersistenceFor(kind)`, an exhaustive `switch`: `local` and `private` are `'device'`, `official`, `test` and any run-time value outside the type are `'tab'`. `createAuthTokenGate(uri, db, host, persistence)` takes the persistence as a required fourth parameter. Exactly `'device'` reads and writes `host.localStorage`; anything else `host.sessionStorage`. Same `(uri, db)` key, same parse rules, same withhold-after-two-rejections rule. A gate uses one area and never the other: a blocked area is an anonymous connect, not a fall back. The account-kind marker functions stay on `sessionStorage`.
- **`client/src/net/connection.ts`:** `ConnectionOptions.targetKind` (required); `connect()` builds its one gate with `tokenPersistenceFor(opts.targetKind)`. Nothing else in `connect()` moves: only an anonymous build's token is saved, and the marker, the claim code and the OIDC flow stay per tab.
- **`client/src/main.ts`:** the `connect({...})` call passes `targetKind: TARGET_KIND`.
- **Tests (tester-written, three rounds):**
  - `client/src/net/authToken.test.ts`: the rule for all four kinds and 19 out-of-type values; the device gate's exact key, cross-page read, re-read on every call and verbatim round trip; zero accesses to the other area in both directions, including when the gate's own write throws; 14 broken-storage shapes, each with a healthy control and a different token planted in the other area; the withhold rule on a device gate; the marker staying per tab. Existing three-argument calls gain `'tab'`; no existing assertion changed.
  - `client/src/net/connection.runtime.test.ts`: the real `connect()` per kind: where the token lands and is read from, kind crossed with URI shape, throwing `localStorage`, an account build writing nothing to `localStorage` for all four kinds (with the anonymous build as the positive half), two rejections withholding a device token.
  - `client/src/main.targetKindGate.test.ts`: the booted page hands `connect` the document's kind (six documents), and through the real connection the token lands in the right area.
  - `client/e2e/local-identity.spec.ts` (new): three browser tests against a real SpacetimeDB.
- **Docs:** `ARCHITECTURE.md` "Connection and store" states the per-kind rule; one new `docs/DECISIONS.md` entry (below).

Production diff: 3 files, +80 −27. Whole diff: 9 files, +1593 −51.

Items: none

## Acceptance

Acceptance: 8/8 met, 0 deferred, 0 unmet — lpw-2 seed:d6f5764b6bd23be9
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- ARCHITECTURE.md — named stale claim: ARCHITECTURE.md 'Connection and store' (lines 507-509) says the anonymous token is stored in sessionStorage, 'so an identity survives a reload but not closing the tab, and a second tab is a separate identity'; lpw-2.1/2.5/2.7 make that false for a local or private target (localStorage, a relaunch resumes, a second page shares the identity), so the passage must state the per-kind rule

Each unit gate runs its files whole with vitest's JSON reporter and requires `success`, zero failed, pending and todo tests, and an exact count of passed tests whose title ends with the gate's tag, per file (`at` = `authToken.test.ts`, `rt` = `connection.runtime.test.ts`, `kg` = `main.targetKindGate.test.ts`). Each browser gate runs `e2e/local-identity.spec.ts` and requires its one test passed with `expected=3 unexpected=0 flaky=0 skipped=0`.

- **lpw-2.1:** `lpw2-g1:GREEN at=8 rt=5 kg=4`
- **lpw-2.2:** `lpw2-g2:GREEN at=7 rt=7 kg=4`
- **lpw-2.3:** `lpw2-g3:GREEN at=15 rt=2`
- **lpw-2.4:** `lpw2-g4:GREEN at=2 rt=5`
- **lpw-2.5:** `lpw2-g5:GREEN n=1 expected=3 unexpected=0 flaky=0 skipped=0` (`LPW2-5-RESUME`: page 1 walks off its spawn tile and closes; once the server has ended its session, a new page of the same context holds the same identity, stands on the walked tile, and has the token key in `localStorage` and none in `sessionStorage`)
- **lpw-2.6:** `lpw2-g6:GREEN …` (`LPW2-6-CONTROL`: the same flow toward an `official` document gives a different identity, token key in `sessionStorage` only)
- **lpw-2.7:** `lpw2-g7:GREEN …` (`LPW2-7-SHARED`: page B joins as page A's identity with one `player` row; B closes, the row holds and A walks a tile; page C joins, A closes, the row holds and C walks a tile; closing the context removes the row)
- **lpw-2.8:** `lpw2-g8:GREEN at=3 rt=2`

The three browser gates need a SpacetimeDB on the default `local` server (`127.0.0.1:3000`); `mr-gates check` ran them against a 2.11.0 in-memory host started for the run.

**Red proof** (`memory/projects/gates/lpw-2.red-proof.log`): at the tester's commit `b4915bc1`, before any production change, 44 of the new unit tests failed on behaviour (`tokenPersistenceFor` missing, a `'device'` gate still reading `sessionStorage`, `connect` never told the kind) and all 233 earlier tests passed; `LPW2-5` and `LPW2-7` failed with a new identity on the second page. The as-today cases (lpw-2.2, lpw-2.6, and the account-build half of lpw-2.4) pass on unchanged code by design and are held by the wrong implementations below.

**Wrong implementations** (`memory/projects/gates/lpw-2.mutants.log`): 27 applied one at a time against the three unit files, all killed, file restored each time. They cover the rule wrong for each kind and for out-of-type values; a fall back between areas on read and on a throwing write, in both directions; mirrored writes; the marker moved to `localStorage`; the kind ignored, hard-coded, defaulted or derived from the URI in `connect()`; the kind hard-coded or collapsed in `main.ts`; every build saving its token; an account JWT saved for `private` or `official`; storage captured at construction; a device token never withheld; write-only-if-empty; a device key missing the database axis; a trimmed device read. Four of them (a junk persistence value picking `localStorage`, the account JWT for kinds other than `local`, the fall back on a throwing write, the trimmed read) survived an earlier round and went back to the tester, whose added tests now kill them. Against the browser spec: every kind on the device fails `LPW2-6`; a hard-coded `test` kind fails `LPW2-5`; an always-per-tab `connect()` fails `LPW2-7`. The red-team ran 20 further cheats in a sandbox clone, and the verifier one of its own (killed by 7 tests).

## Gate

`just ci` at `bd05d9be`: exit 0.
- Rust: 3417, 1120 (`dev_reducers`) and 3089 (`load_test_zones`) tests passed.
- Evals: 15 of 15 pass.
- Client: typecheck clean; 245 files, 6256 tests passed; build-hook check OK.
- Observability validate: 9 checks, 0 failed.

`client/e2e/local-identity.spec.ts`: 3 passed (about 21 s) against a 2.11.0 in-memory host, at `bd05d9be`.

## Decision

`docs/DECISIONS.md`, "A single-player or friends world keeps its anonymous reconnect token on the device; a server we operate keeps it per tab" (the spec's `decision-defaulted:local-private-reconnect-token=device-storage`). It records the rule, why (sign-in is off toward those kinds, so the token is the only thing that identifies the player), what it rules out (`localStorage` for every kind, a fall back between areas, saving an account token), and the costs accepted.

## Lenses

- **Plan:** reviewer and red-team. No blocker. Applied to the tester's brief: positive preconditions inside the lpw-2.3, 2.4 and 2.8 tests, no fall back in either direction, zero cross-area accesses, out-of-type inputs, kind crossed with URI shape, whole-`localStorage` snapshots, and the browser spec's details (a fresh `ctx.newPage()`, an off-spawn tile, both close orders, the surviving page still walks).
- **Code:** reviewer (no blocker or major; four minors, answered below), red-team (three surviving cheats, all closed by tester-added tests; one false comment, fixed), verifier (APPROVE: scope, no test weakened, the five unit CHECKs re-run verbatim, each criterion biting, docs claims true), `/simplify` (removed a private type alias in favour of `keyof TokenStorageHost`).
- **Not run, no surface:** `reducer-security-auditor` and `desync-guard`. The diff touches no server module, `game-core` or wasm export.
- **Tester's findings:** no defect in the contract. Assumptions accepted: the runtime cases keep `signIn: 'oidc'` so the kind is the only varying input; the browser tests end by requiring no `player` row that was not there before, since other spec files' players may leave meanwhile.
- **Reviewer minors, answered:**
  - No migration: a token a `local` or `private` page kept in `sessionStorage` is not read by the device gate, so that tab joins once as a new player. Accepted: the Vite plugin writes kind `test` for every build it configures, and no shell reaches `local` or `private` yet. Not written into the decision entry, which states current behaviour.
  - Two pages racing on the shared slot: recorded as R-lpw-2-SHAREDPAGES.
  - A describe title too broad for its tab-mode body: retitled by the tester.
  - Stale line citations into `authToken.ts` from files outside `touches:`: recorded as R-lpw-2-AUTHTOKENCITATIONS.

## Notes for the spec (`mr-gates notes`, five pending)

- **R-lpw-2-DEVICETOKENOVERWRITE** [data-integrity/MED → lpw-12]: the withhold rule lpw-2.8 keeps costs more on a device-kept token. The SDK reports a non-2xx from the verify route with the same message as a rejection, so two such answers followed by a successful anonymous connect replace a single-player world's only credential for good. A host gate that answers that route with a 5xx while the host boots would trigger it on an ordinary launch.
- **R-lpw-2-SHAREDPAGES** [data-integrity/LOW → backlog]: pages share the slot but not their state: a start-up race mints two identities, and two pages can drive one character.
- **R-lpw-2-LOCALPLAYDOC** [loop-ops/LOW → lpw-8]: `docs/local-play.md` §3 still says nothing identifies a player between launches. The concurrent lpw-7 held that file, so this build did not edit it.
- **R-lpw-2-AUTHTOKENCITATIONS** [loop-ops/LOW → backlog]: line-range citations into `authToken.ts` in five client files.
- A plain note: how "one persistent context" was read, the three files edited outside `touches:`, and that R-lpg-0-SESSIONTOKEN's client half is built (the row stays open for lpw-11 and lpw-12).

touches-delta:
- `client/src/main.targetKindGate.test.ts` — sibling test of `main.ts`: the booted page hands `connect` the document's kind.
- `ARCHITECTURE.md` — widened (above).
- `docs/DECISIONS.md` — one entry, at the bar: a storage-lifetime choice per kind that a maintainer would plausibly undo or extend to `official`.

boyscout-delta:
- `client/src/net/authToken.ts:234-235` — the marker section's header claimed nothing above it had changed; it now states that the marker stays per tab for every target.
- `client/src/net/authToken.ts:343` — a self-citation by line range became a reference to `readAuthKind`.
- `client/src/net/connection.ts:1068-1069` — the `onConnectError` comment said a non-auth failure resets the rejection counter; the gate leaves it as it is.

plan-delta:
- Three tester rounds instead of one: the orchestrator's and the red-team's wrong implementations found four survivors, and each went back to the tester.
- "A fresh page in one persistent context" (lpw-2.5) is one Playwright `BrowserContext` kept open across the page close, as `shell-config.spec.ts` builds its contexts. A browser restart is lpw-11's relaunch criterion.
- `docs/local-play.md` was not widened though §3 goes stale: lpw-7 holds it.

comment-scan: CLEAN

not-verified:
- Remote CI (gitleaks, cargo-audit, the sharded e2e job) has not run on this branch. Locally only the new browser spec was run, not the whole e2e suite.
- The token surviving a browser or shell restart (on-disk `localStorage`): not tested here; lpw-11.
- Two pages opened at the same instant, and two pages driving one character at once: not tested (R-lpw-2-SHAREDPAGES).
- Firefox and WebKit: the browser spec runs on Chromium only, as the suite does.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
