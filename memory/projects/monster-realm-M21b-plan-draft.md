# M21b — RAW planner draft (client half of accounts/auth)

Branch `feat/m21b-accounts-auth-client`, worktree `.claude/worktrees/M21b`, base `b5bbe1d`.
This is the UNADJUDICATED planner output. The adjudicated memo is `monster-realm-M21b-plan.md`.

## Graph-first impact (UNION, per code-intel)
CodeGraph `codegraph_explore` and cbm `trace_path` agree exactly on the auth seam's blast radius:
`createAuthTokenGate` ← `connect` ← `main`; `connect` ← `main`. Grep for dynamically-referenced
symbols (`mr.authToken`, `sessionStorage`, `tokenForNextAttempt`) adds NO runtime call sites — the
only extra hits are docs (ARCHITECTURE.md, docs/adr/0150, docs/adr/0169, docs/specs/nh4-plan.md,
docs/playtest-ops.md) and the two test files. No e2e spec touches sessionStorage. So the CODE blast
radius is exactly the four declared files. The GATE blast radius is not — see §8.

### New hard constraint found by the planner (not in the brief)
`client/src/ui/overlayRegistry.test.ts:158` (`OR-MANIFEST-COMPLETE`) does
`readdirSync(uiDir).filter(f => f.endsWith('View.ts') && !f.endsWith('.test.ts'))` then
`expect(scanned.size).toBe(OVERLAY_IDS.length + 1)`. This is a SECOND, independent reason no
`claimView.ts` can exist — even a perfectly pure one. Any new `client/src/ui/*View.ts` reds
`overlayRegistry.test.ts` (outside touches:) AND forces `overlayRegistry.ts`'s compile-enforced
`Record<OverlayId, _>` (also outside). Hardens into a NAMING RULE: no new file in `client/src/ui/`
may end in `View.ts`. Names must be `claimFlow.ts` / `claimSession.ts`.

## 1. File-by-file plan

### NEW `client/src/ui/claimSession.ts` (PURE core)
The only storage/CSPRNG seam. Injected hosts, zero `globalThis`, every throwing property access
inside try/catch — structural clone of the `authToken.ts` house pattern.
- `interface ClaimStorageHost { readonly sessionStorage?: unknown }`, `interface RandomHost { readonly getRandomValues?: unknown }`
- `CLAIM_CODE_TTL_MS = 15 * 60_000` (D3 — orphan hygiene, not security)
- `type AuthKind = 'anon' | 'account'`
- `readAuthKind(host, uri, db)` / `writeAuthKind(host, uri, db, kind)`
- `mintClaimCode(rng)` → 64 lowercase hex from 32 bytes; `undefined` when `getRandomValues` absent/
  not-a-function/throws (fail-closed). NO `new RegExp` — char-scan validation (Semgrep repo ban).
- `readClaimRecord(host, uri, db, nowMs)` / `writeClaimRecord` / `clearClaimRecord`

Why not in authToken.ts: existing logic must not move or be re-entered; and this module needs a
clock + CSPRNG host that authToken.ts has no business knowing about.

### NEW `client/src/ui/claimFlow.ts` (PURE core — carries the whole proof burden)
Every substantive decision for AUTH-32 and AUTH-33, plus the OQ1 fail-closed config resolver and
the user-visible copy. No storage, crypto, DOM, or clock — plain in/out, total, never throws
(the `statusModel.ts` contract).
- `resolveOidcConfig(env: unknown): OidcConfig | undefined` — `OidcConfig = { readonly authorizeUrl: string }`.
  `undefined` unless a non-blank string. NO default, no hardcoded provider, no `.well-known`, no
  protocol knowledge. Mirrors `resolveDevLogLevel`/`resolveConnectionConfig`.
- `decideConnectCredential(input): { token: string | undefined; sessionExpired: boolean }` — AUTH-31/32 core.
  - `storedKind === 'anon'` → `{ token: storedToken, sessionExpired: false }` (unmodified pass-through)
  - `storedKind === 'account'` → NEVER `storedToken`; only `renewedToken`. Renewal absent/failed/
    unconfigured → `{ token: undefined, sessionExpired: true }`, and the caller must not build.
- `shouldJoinGame(input): boolean` — AUTH-33 core.
- `nextClaimPhase(phase, event)` — total transition over `started|declined|completedOk|completedErr|expired|timedOut`;
  phases `idle|pending|completing|blocked|declined|done`.
- `claimStatusLine(state): string` — total, NEVER empty, distinct strings for session-expired,
  sign-in-not-configured, claim-pending, D5 collision ("already has game data"), timed-out, done.
- `CLAIM_JOIN_DEADLINE_MS = 20_000`, `FIRST_RUN_MULTI_DEVICE_NUDGE`.

YAGNI: deliberately NO third `claimConfig.ts` — `resolveOidcConfig` has one consumer, ~15 lines.

### CHANGED (additive only) `client/src/net/authToken.ts`
Two exports, zero edits to anything existing:
- `export const AUTH_KIND_KEY_PREFIX = 'mr.authToken.v1.kind';`
- `export function authKindStorageKey(uri, db): string` — same two-axis, `encodeURIComponent`-per-
  segment injective derivation as the private `storageKey`, over the new prefix.
Why here: the marker's namespace IS authToken.ts's namespace. Re-deriving `(uri, db)` scoping
elsewhere is exactly the drift that makes the marker describe a token from a different host.
`storageKey`'s body is NOT refactored; a differential tooth in `authToken.test.ts` pins that both
derivations stay injective over the `'a|b','c'` vs `'a','b|c'` fixture already in that file.

### CHANGED (thin wiring) `client/src/net/connection.ts`
New optional `ConnectionOptions`: `renewAuthToken?: () => Promise<string|undefined>`,
`onSessionExpired?: (message: string) => void`, `shouldJoin?: () => boolean`.
New `Connection` member: `resumeJoin(): void`.
Internal: `let renewedToken`, `let rebuildInFlight`, `let joinPending: (() => void) | undefined`.
Plus a TRIPWIRE comment in `.subscribe([...])` explaining why `my_account` is deliberately absent.

### CHANGED (glue only) `client/src/main.ts`
Module-scope `const OIDC = resolveOidcConfig(import.meta.env.VITE_MR_OIDC_AUTHORIZE_URL)`.
Dynamically-created DOM (`document.createElement`, `textContent` only — never `innerHTML`): claim
prompt with Claim / Continue-without-claiming buttons + status line. Wires
`renewAuthToken`/`onSessionExpired`/`shouldJoin`; calls `startGuestClaim({code})` on the anonymous
connection, `completeGuestClaim({code})` on the authenticated one; arms the deadline timer; calls
`conn.resumeJoin()`.
Why not a modal overlay: during the gated window the player has no character row and no world —
the join-gate IS the modality. That keeps `overlayRegistry.ts` out of touches:.

## 2. Pure/shell split per criterion + the exact proving assertion

### AUTH-31 (anonymous path unchanged)
PURE: `decideConnectCredential` with `storedKind:'anon'` returns `storedToken` verbatim (incl.
`undefined` when suppressed).
THE PROOF: the existing 27 tests in `authToken.test.ts` pass with the file's pre-existing region
BYTE-UNCHANGED. The only legitimate edit is an APPENDED block for `authKindStorageKey`. Any diff
above the appended block IS the AUTH-31 violation.
SHELL tooth (connection.test.ts): `auth.tokenForNextAttempt()` occurs exactly once file-wide and
appears literally as the `storedToken:` argument to `decideConnectCredential({`; `auth.onConnectFailed(err)`
and `auth.onConnected(token)` counts and stale-guard ordering unchanged (the four existing
`W-NH4-*` teeth stay green untouched, except `W-NH4-TOKEN-SUPPLIED` — re-pinned, see below).

### AUTH-32 (silent renewal, never replay, explicit session-expired)
PURE (claimFlow.test.ts): exhaustive truth table over `{storedKind} × {storedToken present/absent}
× {renewedToken present/absent} × {oidcConfigured}`. Load-bearing: for every `storedKind:'account'`
row, `result.token !== storedToken`; and `renewedToken === undefined ⇒ sessionExpired === true`.
SHELL teeth (connection.test.ts, source-scan):
- `W-M21B-RENEW-BEFORE-BUILD` — `await` appears in `scheduleRebuild`'s timer callback BEFORE
  `build()`, and the `build()` region contains ZERO `await` (region-bounded).
- `W-NH4-TOKEN-SUPPLIED` re-pinned to `.withToken(credential.token)` + `.withToken(` exactly once
  + a negative on `credential.token ??`.
- `W-M21B-NO-ANON-FALLTHROUGH` — the `sessionExpired` branch region contains `opts.onSessionExpired(`
  and contains NO `build()` call.

MARKER FAIL-DIRECTION, justified: `readAuthKind` returns `'anon'` on missing/corrupt/unknown.
(a) every tab that exists today has no marker — failing to `'account'` would break every existing
anonymous reconnect the instant storage is blocked or quota-full, converting a storage quirk into
total loss of ADR-0150's feature; (b) the safety property is "never replay an ACCOUNT JWT", and an
absent marker corresponds to a token that was never an account token. The one residual — marker
write fails while an account token is stored — is closed by ORDERING, not by the read:
`writeAuthKind(…, 'account')` fires BEFORE the account credential is ever handed to `.withToken()`.
The only reachable skew is then "marker=account, token=anon", which merely forces one unnecessary
renewal + prompt. Ordering tooth in `main.wiring.test.ts`.

SUPPRESSION-COUNTER INTERACTION: none, by construction. `auth.tokenForNextAttempt()` is evaluated
first and its result DISCARDED on the account branch; an account tab supplies no stored token, so
the host has nothing to reject and the counter cannot advance. `auth.onConnectFailed(err)` stays
unconditional.

### AUTH-33 (join-gate)
PURE: `shouldJoinGame({kind, hadSession, claimCodePresent, claimPhase, deadlineElapsed})` — join
IFF NOT (`kind==='account'` AND `hadSession===false` AND `claimCodePresent` AND
`claimPhase ∈ {pending, completing}` AND `!deadlineElapsed`). Every one of the five conjuncts gets
its own falsifying row.
SHELL teeth: `W-M21B-JOIN-GATED` (the `.reducers.joinGame(` call site is inside a closure whose
invocation is guarded by `opts.shouldJoin`), `joinGame` still occurs exactly once,
`W-M21B-RESUME-JOIN` (`resumeJoin` clears `joinPending` BEFORE invoking it — no re-entrant loop),
and the pre-existing `W-DEVLOG-WRAP` joinGame tooth must remain green (its 140-char
`wrapReducerLogging(` receiver window is fragile against relocation — re-verify as a TASK).
SHELL tooth (main.wiring.test.ts): D7-style fan-out checklist — `resumeJoin()` is called on ALL
THREE unblock paths (Ok, decline, deadline).

CONFLICT WITH ADR-0085 A4, RESOLVED: A4 says a reconnect MUST re-join because `on_disconnect`
deleted the player row. The gate applies to EXACTLY ONE connection: the first `onApplied` of a
build made with an account credential in a tab holding a live claim record. Never an anonymous
connection (AUTH-31 untouched, and the anon tab must keep joining — `start_guest_claim` requires a
`player` row). Never once `hadSession === true` (the anti-deadlock invariant: any RE-connect joins
unconditionally).
NAMED FAILURE MODE: ADR-0085 D3 — in-flight reducer promises never settle after a drop. So
`complete_guest_claim`'s promise may never resolve and a `.finally()` unblock would deadlock
permanently. ESCAPE HATCH: a TIMER, not a promise — `CLAIM_JOIN_DEADLINE_MS = 20_000` armed in
main.ts when the gate engages, moving the phase to `declined` with a visible "claim timed out —
continuing without claiming". Second, free hatch: the record's own 15-min TTL makes
`claimCodePresent` false.

### .withToken() sync-vs-async reconciliation
`build()` stays FULLY SYNCHRONOUS. Renewal happens in `scheduleRebuild()`'s timer callback, BEFORE
`build()`, writing into a `connect()`-scope `renewedToken`. To keep ADR-0085 A7's single-timer
guard intact across the new `await` (the existing code sets `rebuildTimer = undefined` as its first
statement, so awaiting after that would reopen the double-schedule window), add a second latch:
`if (teardown || rebuildTimer !== undefined || rebuildInFlight) return;`
set `rebuildInFlight = true` when the timer fires, clear it in a `finally` after `build()` returns
or throws. The existing RT-01 synchronous try/catch around `build()` and the `buildGen`/`stale()`
machinery are UNCHANGED — `renewedToken` is read inside `build()`, still one synchronous block, so
no stale-guard reasoning shifts.
COLD START: `let current = build()` at connect() scope cannot await. It doesn't need to: a fresh tab
has empty sessionStorage ⇒ no marker ⇒ `'anon'` ⇒ today's exact behavior. A tab can only be
`'account'` after this tab authenticated, by which time `scheduleRebuild` owns every subsequent
build. This is precisely why the fail direction must be `'anon'` — the two decisions are the same
decision.

## 3. Proof-of-teeth — mutation ↔ gate
| Mutation | Gate that must bite |
|---|---|
| `decideConnectCredential` returns `storedToken` on `kind==='account'` | claimFlow AUTH-32 core row |
| …returns `sessionExpired:false` on account+renewal-failure | session-expired row |
| …returns `undefined` on `kind==='anon'` | AUTH-31 pass-through row |
| `readAuthKind` returns `'account'` on a missing key | claimSession missing-marker test |
| `shouldJoinGame` → `return true` | gated-case row |
| `shouldJoinGame` → `return false` | anonymous-reconnect + deadline rows |
| drop `hadSession` from the conjunction | reconnect-of-authenticated row |
| drop `deadlineElapsed` | escape-hatch row |
| `resolveOidcConfig` returns a default object / accepts `''` | fail-closed + blank-string rows |
| `claimStatusLine` returns `''` for the D5 collision | never-empty row |
| collision and expiry return the same string | distinctness row |
| `mintClaimCode` emits 63 chars / uppercase / uses `Math.random` | length + charset + injected-host rows |
| remove the try/catch around the `sessionStorage` property access | throwing-getter test |
| `readClaimRecord` ignores TTL | TTL boundary test (`now === createdAt + TTL` is EXPIRED) |
| move the renewal `await` inside `build()` | `W-M21B-RENEW-BEFORE-BUILD` |
| delete `rebuildInFlight` from the early return | `W-M21B-A7-LATCH` (contiguous needle on the full condition) |
| restore the unconditional `joinGame` | `W-M21B-JOIN-GATED` |
| `.withToken(credential.token ?? auth.tokenForNextAttempt())` | re-pinned `W-NH4-TOKEN-SUPPLIED` |
| add `'SELECT * FROM my_account'` | `W-M21B-NO-MY-ACCOUNT-SUBSCRIBE` |
| call `build()` inside the `sessionExpired` branch | `W-M21B-NO-ANON-FALLTHROUGH` |
| move `joinGame` outside the `wrapReducerLogging(` window | existing `W-DEVLOG-WRAP` (regression proof) |
| write the kind marker AFTER the connect | main.wiring ordering tooth |
| drop `resumeJoin()` from the decline path | fan-out checklist |
| inline a literal issuer/`/authorize` URL in main.ts | no-hardcoded-provider negative |
| call `startGuestClaim` from the authenticated branch | region-bounded ordering tooth |

## 4. Ordered task list
T0 (BLOCKING, no code) two sanctions: (a) does `main.wiring.test.ts` count as main.ts's sibling
`*.test.ts`? (b) is ticking the §4 client checkboxes an accepted touches-delta or the integrator's job?
T1 tester RED `claimFlow.test.ts` · T2 tester RED `claimSession.test.ts` · T3 tester RED appended
block in `authToken.test.ts` · T4 impl claimSession · T5 impl claimFlow · T6 impl authToken additive
· T7 tester RED connection.test.ts teeth · T8 impl connection.ts wiring · T9 tester RED appended
block in main.wiring.test.ts · T10 impl main.ts glue · T11 orchestrator executes every §3 mutation,
observe RED, revert · T12 docs (ADR-0179 body only; ARCHITECTURE.md; docs/knowledge regen — verify,
likely no-op) · T13 single full `just ci`.

## 5. Right-sizing verdict
All four spec bullets fit ONE mergeable slice — with four cuts:
1. The OIDC redirect is an OPAQUE ENV STRING, not a protocol implementation. `startSignIn` is one
   `location.assign(config.authorizeUrl)` behind `config !== undefined`. No PKCE builder, no
   `.well-known`, no `oidc-client-ts`.
2. Ship SAME-TAB REDIRECT only; park popup + postMessage. sessionStorage survives a same-tab
   navigation — the exact property D8.4 requires.
3. Do NOT subscribe `my_account`. Nothing in AUTH-31/32/33 consumes it; subscribing drags
   `rowConvert.ts` + `store.ts` (outside touches:) in. Tripwire comment + negative tooth instead.
4. No new `client/src/ui/*View.ts`.
PARK as M21b-2 (blocked on OQ1): popup+postMessage return flow; real authorize-URL/PKCE builder +
the OIDC dependency (needs its own ADR); `my_account` subscription + rowConvert/store plumbing; an
e2e claim round-trip spec.

## 6. Named anti-patterns
1. Creating `client/src/ui/claimView.ts` — or any new `*View.ts`.
2. Adding anything to `client/vite.config.ts` `coverage.exclude`.
3. Putting a DECISION in connection.ts or main.ts (both coverage-excluded; a source scan can pin
   wiring but structurally cannot catch `return true`).
4. Reaching for `globalThis`/`window`/`sessionStorage`/`crypto`/`Date.now()` from inside `claim*.ts`.
5. Touching `tokenForNextAttempt`/`onConnected`/`onConnectFailed`/`isStoredCredentialRejected`/
   `AUTH_REJECT_SUPPRESS_THRESHOLD`. AUTH-31 is a no-change criterion.
6. Clearing the stored token on session expiry (ADR-0150 D2 is suppress-not-clear).
7. Making `build()` async or awaiting inside it.
8. Awaiting after `rebuildTimer = undefined` without the second in-flight latch.
9. Adding `'SELECT * FROM my_account'`.
10. Any hardcoded provider URL, issuer, `.well-known` path, or an OIDC npm dependency.
11. Falling through to an anonymous connect on renewal failure (D8/AUTH-32).
12. `new RegExp` anywhere (Semgrep repo-wide ban) — hex validation is a char-scan.
13. Swallowing the D5 collision. `"already has game data"` must reach a persistent, visible state
    with an explicit "continue without claiming" action.
14. Unblocking the join-gate with `.finally()` instead of a timer.
15. Re-deriving the `(uri, db)` storage-key scoping for the marker independently of authToken.ts.
16. `innerHTML` anywhere in the claim prompt.

## 7. Residual risks
- OQ1 unanswered ⇒ the authenticated branch is UNEXERCISED at runtime in every build M21b produces.
  This also means the spec's own §5 post-integration DoD — the e2e `connect (JWT) → account
  provisioned → start_guest_claim → complete_guest_claim → re-key verified` flow — CANNOT run at
  M21b/M21c merge. Surface to the supervisor now.
- Multi-device race (D8.6): mitigated only by nudge copy, undetectable server-side.
- Nightly coverage: two new pure modules enter the 96% denominator — must be near-100%.
- Nightly mutation: `claimFlow.ts` is boolean-dense; truth tables must be exhaustive, not sampled.
- Re-pinning `W-NH4-TOKEN-SUPPLIED` is a legitimate but review-sensitive edit to a GATING test.
  The tester owns it; the implementer must never be the one who loosens it.
- `W-DEVLOG-WRAP`'s joinGame tooth uses a 140-char lookbehind window for the `wrapReducerLogging(`
  receiver — fragile against relocating the call into a closure. Re-verify as an explicit task.

## 8. Hidden-dependency STOP candidates
| # | File(s) outside touches: | Triggered by | Avoidance |
|---|---|---|---|
| 1 | `client/vite.config.ts` + `evals/dom-shell-coverage-exclusion.eval.mjs` | any new DOM-shell file | no new shell; all new code pure |
| 2 | `client/src/ui/overlayRegistry.ts` + `.test.ts` | any new `ui/*View.ts`, or a mutual-exclusion modal | naming rule + the join-gate IS the modality |
| 3 | `client/src/net/rowConvert.ts` + `store.ts` | subscribing `my_account` | do not subscribe |
| 4 | `client/index.html` + `client/src/indexShell.test.ts` | a static container element | `document.createElement` in main.ts |
| 5 | `client/package.json` / lockfile | adding an OIDC library | opaque `authorizeUrl` env string |
| 6 | `client/src/net/connectionConfig.ts` | centralizing OIDC config there | resolver in claimFlow.ts |
| 7 | harness `specs/monster-realm-v2/M21-accounts-auth.spec.md` | ticking §4 client checkboxes | needs T0 sanction |
| 8 | `client/src/main.wiring.test.ts` | any main.ts source-scan tooth | needs T0 sanction |
