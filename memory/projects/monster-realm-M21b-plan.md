# M21b — ADJUDICATED build plan (client half of accounts/auth)

Branch `feat/m21b-accounts-auth-client`, worktree `.claude/worktrees/M21b`, base `b5bbe1d`.
Raw planner draft: `monster-realm-M21b-plan-draft.md`. **Where the draft and THIS memo differ,
THIS memo wins.** Adjudicated from planner + reviewer + red-team + one decisive static probe (P3).

---

## Probes / verified facts (all established from source — no live DB needed)

**P3 (RESOLVED — the probe both review lenses demanded).** `client/node_modules/spacetimedb/dist/index.mjs:5765`
sets `this.token = token` from `.withToken(...)` at construction; `:6226-6231` adopts the host's
token **only** `if (!this.token && serverMessage.value.token)` before
`emit("connect", this, this.identity, this.token)`. **⇒ a client-supplied JWT is echoed back
verbatim as `onConnect`'s third argument.** The host does NOT mint a durable replacement for an
authenticated connect. Therefore:
- D8's premise is CORRECT (an OIDC token is short-lived and must not be replayed), and
- `auth.onConnected(token)` (`connection.ts:541`, unconditional) **would persist the account JWT
  into the anonymous token slot** — red-team C4 is CONFIRMED, not hypothetical.

**F1 — the account path is UNREACHABLE in every build M21b can produce.**
`server-module/src/accounts.rs:48`: `ALLOWED_ISSUERS = [concat!("https:/", "/auth.monster-realm.invalid/")]`
(the fail-closed OQ1 placeholder). Per D1″ (`accounts.rs:300-311`) an unrecognized issuer returns
`Ok` with **no `account` row**, leaving the connection anonymous. So `complete_guest_claim` guard 2
(`accounts.rs:378-380`) returns `"no account"` **always**, for every possible token, today.

**F2 — `join_game` is IRREVERSIBLE with respect to claiming.** `server-module/src/movement.rs:86-115`
inserts a starter `monster` + `monster_pub` on first join. `on_disconnect` (`lib.rs:211-236`)
deletes `player` + `character` **only** — the monster is permanent. `account_has_game_data`
(`accounts.rs:209-216`) short-circuits on `has_monsters`, and guard 11 (`accounts.rs:423-425`)
then rejects `"already has game data"` — fail-closed by D5, forever; AUTH-14 makes it
one-claim-per-account-ever anyway. **⇒ a single `join_game` on a destination account permanently
and unrecoverably destroys that account's ability to ever claim any guest save.** There is no
server path in M21 or M22 that reverses it.

**F3 — exact server reject literals** (`accounts.rs`, for any future client classifier — the repo's
discipline is EXACT match, per `connection.ts:569`'s `'already joined'` precedent):
`"sign in required"` · `"no account"` · `"account pending deletion"` · `"account already claimed"` ·
`"invalid or already-used code"` (`ERR_INVALID_CODE`, shared by AUTH-15/AUTH-35 — no oracle) ·
`"code expired"` · `"cannot claim your own session"` · `"close your other tab, then retry"` ·
`"already in an ongoing battle"` · `"already has game data"` · `"already signed in"` ·
`"invalid claim code"` · `"not joined"`.

---

## THE ADJUDICATION — what ships and what is parked, and why

The two independent adversarial lenses converged on the same conclusion from different directions,
and F1+F2 make it unarguable: **the draft's AUTH-33 join-gate, as designed, would be guaranteed to
destroy player data on the modal path, in a flow that cannot succeed at all today.** Trace it with
F1+F2 in hand: marker `'account'` → connect (anonymous in fact, per F1) → gate engages →
`complete_guest_claim` → `"no account"` → `completedErr` → phase `blocked` → `blocked ∉ {pending,
completing}` → `shouldJoinGame` returns true → `join_game` → starter monster on the account
identity → **guest save orphaned permanently (F2)**. Every other unblock path in the draft (the 20 s
deadline, the `hadSession===true` reconnect bypass) reaches the same terminus.

Three further findings independently rule out shipping the redirect half:
- **C5 (red-team, CRITICAL):** the draft's `location.assign(authorizeUrl)` carries no `state`/nonce.
  An attacker who gets a victim's mid-claim tab to load the attacker's own OIDC callback URL causes
  the victim's client to complete the claim **onto the attacker's account** — re-keying monsters,
  inventory, wallet and ranked profile atomically and irreversibly (`accounts.rs:428-433`), needing
  no secret at all. A `state` parameter cannot be built from an opaque single-string `authorizeUrl`;
  building one requires knowing the provider, i.e. OQ1.
- **H2 (red-team):** `resolveOidcConfig → { authorizeUrl }` cannot express a *renewal* endpoint,
  `client_id`, or `scope`. AUTH-32's silent-renewal mechanism is unimplementable from that surface.
- **H4 (red-team) / B3, H5 (reviewer):** adding `await` + a `rebuildInFlight` latch to the SHARED
  reconnect ladder changes behavior for every anonymous player (build-throw freeze via
  `catch`-before-`finally`; hung-renewal freeze with no timeout; `pagehide` mid-await spawning a
  socket on a dying page; `pageshow` wedging on a stuck latch). That is a direct **AUTH-31**
  violation ("no behavior change to the anonymous path") in service of a branch that cannot run.

### RULING 1 — SHIP the OQ1-independent safety core (AUTH-31 + AUTH-32). PARK AUTH-33.
What ships is live, provable, fail-closed, and is precisely the guard that must land **before** the
account path exists so M21b-2 cannot accidentally ship the C4 replay hole. What is parked is
everything whose only reachable outcome today is irreversible data loss or an exploitable redirect.

### RULING 2 — the anonymous reconnect ladder stays LITERALLY SYNCHRONOUS.
No `await`, no `rebuildInFlight` latch, no renewal call wiring in `connection.ts` this slice. This
closes B3/H3/H4/H5/C2 **by construction rather than by tooth**, and makes AUTH-31's "no behavior
change" claim actually true instead of asserted. The async prelude lands in M21b-2 *with* the
renewal implementation it exists to serve, where its latch/timeout/teardown teeth can be written
against a branch that can actually execute.

### RULING 3 — "never replay an account JWT" is made STRUCTURAL, not marker-dependent (closes C4/H3).
The account credential must never enter the anon slot in the first place. `auth.onConnected(token)`
is guarded **at its `connection.ts` call site** (inside `touches:`) on the kind decided for *this
build*. `authToken.ts`'s existing function bodies stay byte-unchanged; only the call site gains a
condition. This means no companion-key desync (quota/private-mode partial write) can ever produce a
replay, so the marker's fail-direction stops being load-bearing for the safety property.
`W-NH4-SAVE-WIRED` is re-pinned by the **tester** (never the implementer) with written justification.

### RULING 4 — the marker lives in `authToken.ts`, not a new `claimSession.ts` (closes reviewer M3, /simplify).
It is a net-layer sessionStorage seam, structurally the twin of the token key, and it reuses the
existing private `storageMethod`/`storageKey` machinery. A separate `ui/claimSession.ts` would have
duplicated that machinery and put a storage boundary in the view-model directory. **One fewer
module.** Additive only: new exports, zero edits to existing bodies.

### RULING 5 — session-expired MUST offer an explicit affordance (closes reviewer B2, red-team H9).
AUTH-32 says the client "SHALL NOT connect anonymously **without an explicit user choice to do
so**" — so the choice must exist. `Connection` gains `continueAnonymously()`: flip the marker to
`'anon'`, then re-arm the rebuild. This does NOT breach ADR-0150 D2 (suppress-not-clear): flipping
the *marker* is not clearing the *token*. Without it, session-expired is a terminal freeze
(`rebuildTimer` already `undefined`, nothing re-arms it).

### RULING 6 — cold start is safe by construction, not by argument (closes reviewer B1, red-team C3).
The draft's cold-start proof was falsified by its own same-tab-redirect cut. With RULING 1 there is
no redirect and no renewal, so `decideConnectCredential` at cold start can only return
`sessionExpired: true` when the marker says `'account'` — a state nothing in this slice can write.
`build()` stays synchronous and `let current = build()` keeps its non-optional contract. The
cold-start-with-populated-sessionStorage hazard is recorded as **the first design constraint
M21b-2 must solve**, not silently inherited.

### RULING 7 — CUT `nextClaimPhase`, `claimStatusLine`'s claim arms, `mintClaimCode`,
`classifyClaimReject`, `shouldJoinGame`, `resumeJoin`, `shouldJoin`, `CLAIM_JOIN_DEADLINE_MS`,
`readClaimRecord`/`writeClaimRecord`/`clearClaimRecord`, and the `my_account` subscription.
Every one of them has **zero reachable callers** under RULING 1. Shipping them is dead code that
lands in the nightly mutation denominator and invites exactly the reward-hacked "exhaustive truth
table over an unreachable machine" the tester lens exists to prevent. They return in M21b-2
together with the flow that calls them. (Reviewer M4 reached the same cut independently on YAGNI
grounds even before the reachability argument.)

### RULING 8 — `resolveOidcConfig` ships, fail-closed and SILENT-but-documented (reviewer M6).
It is the one seam that lets `main.ts` render the sign-in/claim prompt **only** when a provider is
configured — i.e. never, today. Unlike `resolveConnectionConfig` (which fails loud because a
misconfigured URI is a broken build), an absent OIDC config is the **expected, correct** production
state until OQ1 lands, so failing loud would fire on every build. Documented in `ARCHITECTURE.md`.

---

## Final file set (4 files + 3 sibling test files)

### CHANGED — `client/src/net/authToken.ts` (ADDITIVE ONLY; deliverable #1)
New exports; **zero edits to any existing body** (AUTH-31 is a no-change criterion):
- `export type AuthKind = 'anon' | 'account';`
- `export const AUTH_KIND_KEY_PREFIX = 'mr.authToken.v1.kind';`
- `export function authKindStorageKey(uri: string, db: string): string` — same two-axis
  `encodeURIComponent`-per-segment injective derivation as the private `storageKey`, over the new
  prefix. The two key SPACES are provably disjoint (`encodeURIComponent` strips `|` from every
  segment, so `mr.authToken.v1|A|B` can never equal `mr.authToken.v1.kind|C|D`) — pin disjointness
  DIRECTLY, not merely per-derivation injectivity (red-team L2).
- `export function readAuthKind(host, uri, db): AuthKind` — `'anon'` on missing/corrupt/unknown/throw.
  Fail-direction justified: every tab that exists today has no marker, so failing to `'account'`
  would break every existing anonymous reconnect the moment storage is blocked. Safety no longer
  rests on this (RULING 3).
- `export function writeAuthKind(host, uri, db, kind): void` — degrades silently on throw, exactly
  as `onConnected`'s `setItem` does.
Reuses the existing private `storageMethod` — no duplicated storage machinery.

### NEW — `client/src/ui/claimFlow.ts` (PURE core; carries the whole proof burden)
Total, never throws, no DOM/storage/crypto/clock (the `statusModel.ts` contract):
- `resolveOidcConfig(env: unknown): OidcConfig | undefined` — `OidcConfig = { readonly authorizeUrl: string }`.
  `undefined` unless a non-blank string. No default, no hardcoded provider, no `.well-known`.
- `decideConnectCredential(input): { token: string | undefined; sessionExpired: boolean }`
  - `storedKind === 'anon'` → `{ token: storedToken, sessionExpired: false }` — verbatim
    pass-through incl. `undefined` when suppression withheld it (AUTH-31).
  - `storedKind === 'account'` → **never** `storedToken`; only `renewedToken`. Absent/failed →
    `{ token: undefined, sessionExpired: true }` (AUTH-32).
  `renewedToken` is a real, proven seam — M21b-2 supplies its producer; `connection.ts` passes
  `undefined` today, which is exactly AUTH-32's IF-branch.
- `SESSION_EXPIRED_MESSAGE`, `FIRST_RUN_MULTI_DEVICE_NUDGE` (deliverable #4 copy) — non-empty consts.

### CHANGED — `client/src/net/connection.ts` (thin wiring; ladder stays synchronous)
- `ConnectionOptions` gains **required** `onSessionExpired: (message: string) => void` — REQUIRED,
  not optional, so `tsc` catches a `main.ts` omission (red-team H7's fail-open; the repo's
  compile-enforced `Record<OverlayId, _>` idiom).
- `Connection` gains `continueAnonymously(): void` (RULING 5).
- `build()`: `const credential = decideConnectCredential({ storedKind: readAuthKind(...),
  storedToken: auth.tokenForNextAttempt(), renewedToken: undefined })`. On `sessionExpired`:
  contiguous `{ opts.onSessionExpired(SESSION_EXPIRED_MESSAGE); return; }` — see the tooth note.
  Else `.withToken(credential.token)`.
- `onConnect`: `auth.onConnected(token)` guarded on the build's kind (RULING 3).
- TRIPWIRE comment in `.subscribe([...])` recording why `my_account` is deliberately absent.

### CHANGED — `client/src/main.ts` (glue only)
`const OIDC = resolveOidcConfig(import.meta.env.VITE_MR_OIDC_AUTHORIZE_URL)` (the `VITE_MR_DEVLOG`
cast idiom — L1 verified there is no `client/.env*`, no `vite-env.d.ts`, no `ImportMetaEnv`, so no
file outside `touches:` is needed). Supplies `onSessionExpired`, rendering a persistent, explicit
choice ("Sign in again" — hidden unless `OIDC !== undefined` — and "Continue without an account",
wired to `conn.continueAnonymously()`). Renders `FIRST_RUN_MULTI_DEVICE_NUDGE`. `document.createElement`
+ `textContent` only — **never `innerHTML`** (server-supplied SenderError text flows through this
surface). Renders through the existing `#status`/`reportError` pipeline so the claim line and the
link line cannot contradict each other (reviewer M5).

---

## Teeth (source-scan teeth are the ONLY proof for the two coverage-excluded shells)

Hardened against the specific evasions red-team constructed:
- **`W-M21B-NO-ANON-FALLTHROUGH`** — the draft's version passed on a fall-through impl (red-team H6:
  `if (sessionExpired) { onSessionExpired(...) }` with no `return`, then `build()` outside the
  region). Pin the **contiguous** `{ opts.onSessionExpired(` … `return;` `}` shape, AND that the
  guarded `return` textually PRECEDES the `.withToken(` call, AND `.withToken(` occurs exactly once.
- **`W-M21B-NEVER-REPLAY`** — `.withToken(credential.token)` contiguous; negative on
  `credential.token ??` / `||` / `?? auth.tokenForNextAttempt()`.
- **`W-NH4-TOKEN-SUPPLIED`** (re-pinned, tester-owned, with written justification) — must preserve
  all three properties the current form at `connection.test.ts:269-306` carries: `.withToken(`
  exactly once file-wide; `auth.tokenForNextAttempt()` appearing **literally** as the `storedToken:`
  argument (contiguity is what kills the hoist-to-`connect()`-scope mutant — its documented WRONG
  IMPL KILLED (d), and `authToken.ts:59-61` requires a fresh read per build); and a `??`/`||` negative.
- **`W-NH4-SAVE-WIRED`** (re-pinned, tester-owned) — was "exactly one UNCONDITIONAL call site"; now
  "exactly one call site, guarded on the build's kind, under the stale guard". The re-pin is a real
  loosening of a gating test and goes on the reviewer checklist explicitly.
- **`W-M21B-KIND-DISJOINT`** (authToken.test.ts) — the two key spaces are disjoint, pinned directly.
- **`W-M21B-SYNC-LADDER`** — `connection.ts` contains **zero** `await` and zero `async` (RULING 2
  made mechanical: this is what makes AUTH-31's no-change claim checkable rather than asserted).
- **`W-M21B-NO-MY-ACCOUNT-SUBSCRIBE`** — kept, acknowledged as scope-pinning not safety-pinning.
- Regression-verify (do not modify): `W-NH4-GATE-CONSTRUCTED`, `W-NH4-FAILURE-WIRED`,
  `W-NH4-NO-CLEAR-ON-DROP`, `SDK-DRIFT`, and **`W-DEVLOG-WRAP`** (its 140-char `wrapReducerLogging(`
  lookbehind at `connection.test.ts:588` is fragile — re-verifying it is an explicit TASK, not an
  assumption).
- `main.wiring.test.ts` — `onSessionExpired` supplied; `continueAnonymously` wired to the explicit
  control; no hardcoded provider URL/issuer/`.well-known` literal in `main.ts`.

## Mutations that must bite (orchestrator executes; tester has no Bash)
`decideConnectCredential` returns `storedToken` on `'account'` · returns `sessionExpired:false` on
account+no-renewal · returns `undefined` on `'anon'` · `readAuthKind` returns `'account'` on a
missing key · returns `'account'` on a throwing getter · `resolveOidcConfig` returns a default /
accepts `''` / accepts a non-string · `authKindStorageKey` drops `encodeURIComponent` (collides the
two spaces) · drop the `return` in the sessionExpired branch · `.withToken(credential.token ??
auth.tokenForNextAttempt())` · hoist `tokenForNextAttempt()` to `connect()` scope · un-guard
`auth.onConnected(token)` · add `'SELECT * FROM my_account'` · add an `await` in `connection.ts` ·
`SESSION_EXPIRED_MESSAGE`/`FIRST_RUN_MULTI_DEVICE_NUDGE` → `''` · move `joinGame` outside the
`wrapReducerLogging(` window (W-DEVLOG-WRAP regression).

## Ordered steps
T1 tester RED: appended block in `client/src/net/authToken.test.ts` (marker: read/write/injectivity/
disjointness/throwing-host) — nothing above the appended block may change (AUTH-31's own proof).
T2 tester RED: `client/src/ui/claimFlow.test.ts` (exhaustive truth table over
`{storedKind} × {storedToken} × {renewedToken}`; `resolveOidcConfig` totality; copy non-emptiness).
T3 tester RED: `connection.test.ts` teeth (new + the two justified re-pins).
T4 impl `authToken.ts` additive → T1 green; re-run the pre-existing 27 tests UNMODIFIED.
T5 impl `claimFlow.ts` → T2 green.
T6 impl `connection.ts` wiring → T3 green; re-verify all surviving `W-NH4-*`, `SDK-DRIFT`, `W-DEVLOG-WRAP`.
T7 tester RED: appended block in `client/src/main.wiring.test.ts`. T8 impl `main.ts` glue → green.
T9 orchestrator: execute every mutation above, observe RED, revert.
T10 lens batch (reviewer + red-team + /simplify + desync-guard) → T11 verifier.
T12 docs: ADR-0179 **body only** (Amendments: P3, F1, F2, C4, C5, and the M21b-2 constraint list);
`ARCHITECTURE.md` (VITE_MR_OIDC_AUTHORIZE_URL + the marker); `docs/knowledge/**` regen (verify —
likely a no-op, the bundle is schema-driven); harness spec §4 client-checkbox ticks + an AUTH-33
deferral note (harness repo — NOT in the PR; supervisor commits, same as M21a).
T13 single full `just ci` + `just coverage` (nightly gate lands after merge — don't trust `just ci`).

## Sanctions taken (recorded for the audit)
- **`main.wiring.test.ts` IS main.ts's sibling test.** Verified: no `main.test.ts` exists; it is the
  only test for `main.ts`. Reading `sibling *.test.ts` as covering it is the only reading under
  which `main.ts` can carry teeth at all. Declared in `touches-delta:`.
- **Harness spec ticks are done in the HARNESS repo**, which is not part of the project PR and
  cannot collide with a sibling slice's PR. Same precedent as M21a. Flagged in the handoff.
- **ADR-0085 A7 is NOT amended** — RULING 2 means no latch is added, so A7 is untouched. (Had the
  latch shipped, `docs/adr/0085-*.md` would have been a hidden-dependency STOP.)

## Parked to M21b-2 (blocked on OQ1) — hand these to the supervisor
1. The OIDC redirect + return leg, **with a `state`/nonce bound to sessionStorage and verified
   before any token is accepted** (C5), plus mandatory `history.replaceState` scrubbing of
   `location.search`/`hash` after extraction.
2. `renewAuthToken` + the async rebuild prelude, **with a timeout** (`Promise.race`), a
   `rebuildInFlight` latch cleared BEFORE the catch's `scheduleRebuild()` (B3/C2), a post-await
   `teardown` re-check, and a latch clear in `pagehide` (H5/H3).
3. AUTH-33's join-gate — **redesigned so no path auto-joins while a live claim record exists.**
   No 20 s deadline hatch, no `hadSession` bypass; only an explicit, consequence-labelled decline
   ("this permanently abandons the guest save"), plus reconnect re-issue of `complete_guest_claim`
   (the pre-drop promise never settles, ADR-0085 D3). F2 is the reason.
4. Retryable-vs-terminal reject classification against F3's exact literals (`"close your other tab,
   then retry"` and `"already in an ongoing battle"` are RETRYABLE and are the *expected* same-tab
   race, not errors).
5. `my_account` subscription so the client can tell an authenticated connection from an anonymous
   one (C6) — accepts a `rowConvert.ts`/`store.ts` touches-delta.
6. The cold-start-with-populated-sessionStorage contract (B1/C3) — the redirect return IS a cold
   start; `let current = build()` cannot await.
7. Client/server claim-TTL divergence (M3): derive expiry from the reducer's `Ok`, or make the
   client TTL strictly longer so the server stays authoritative (`Date.now()` is user-settable).
8. The `main.wiring.test.ts` / `overlayRegistry` naming rule: **no new `client/src/ui/*View.ts`**
   (`overlayRegistry.test.ts:158` `readdirSync` + exact count).

## Named anti-patterns (unchanged from the draft where still applicable)
No new `client/src/ui/*View.ts`; nothing added to `vite.config.ts` `coverage.exclude`; no DECISION
in `connection.ts`/`main.ts` (both coverage-excluded — a source scan pins wiring but cannot catch
`return true`); no `globalThis`/`window`/`sessionStorage`/`crypto`/`Date.now()` inside `claim*.ts`;
no edit to any existing `authToken.ts` body; never clear the stored token on session expiry
(ADR-0150 D2); `build()` stays sync; no `'SELECT * FROM my_account'`; no hardcoded provider URL,
issuer, `.well-known`, or OIDC npm dependency; **no `new RegExp`** (Semgrep `detect-non-literal-regexp`,
ADR-0064 — hex/format validation is a char-scan); no `innerHTML`; exact-match (never substring) on
server reject strings.

## Residual risks
- The account branch is UNREACHABLE today (F1) — it is a fail-closed guard landing ahead of the
  feature, deliberately. Named, not hidden.
- **The spec's own §5 post-integration DoD (the e2e `connect (JWT) → account provisioned →
  start_guest_claim → complete_guest_claim → re-key verified` flow) CANNOT run at M21b/M21c merge**
  — it needs a real issuer (OQ1). Surface to the supervisor NOW, not at the integration gate.
- AUTH-33 is deferred: a spec deviation, recorded as a spec/ADR amendment in this milestone's own
  amendment style (cf. the AUTH-2 / AUTH-16 amendments).
- Nightly coverage: `claimFlow.ts` enters the 96% denominator — it is pure precisely so it can be
  ~100%. Run `just coverage` in T13; `just ci` does not gate it.
- Semgrep is remote-first and `--config auto`; run it locally before the PR (memory: gitleaks/ReDoS
  have bitten twice).

---

# ADDENDUM — /simplify adjudication (SUPERSEDES the file set / teeth above where they differ)

`/simplify` caught a real contradiction in the rulings above: RULING 7 cut nine symbols for having
"zero reachable callers", while RULINGS 5 and 8 kept `continueAnonymously` and `resolveOidcConfig`,
which are unreachable by exactly the same argument. Applying RULING 7 consistently forces the
following. **Accepted, with one overrule (S11).**

**S1 — CUT `renewedToken`.** Decisive: parked item 2 says the producer is `await renewAuthToken()`,
and RULING 2 forbids `await` in `connection.ts` this slice — so the call site that would supply it
cannot exist here, and H2 already records that the config surface can't express a renewal endpoint.
This is a *guessed* seam, not a proven one, in the one dimension already documented as unsettled.
`decideConnectCredential` becomes 2-arm; the safety property gets STRONGER (on `'account'` the token
is unconditionally `undefined`, with no third input to get wrong). 4 of 8 truth-table cells go.

**S2 — CUT `resolveOidcConfig`, `OidcConfig`, `VITE_MR_OIDC_AUTHORIZE_URL`, the `main.ts` cast, and
the `ARCHITECTURE.md` OIDC section (RULING 8 is WITHDRAWN).** Nothing breaks: "no hardcoded provider
literal in `main.ts`" is satisfied by not writing one, pinned directly by a `main.wiring.test.ts`
negative. The harm is worse than deadness — H2 records that `{ authorizeUrl }` cannot express
`client_id`/`scope`/the renewal endpoint/C5's mandatory `state`+nonce, so this would ship a
documented-inadequate type as the apparent SSOT for OIDC config, with an `ARCHITECTURE.md` entry
advertising an env var whose NAME encodes the wrong model. M21b-2 would have to delete it first.

**S3 — CUT `continueAnonymously()` and the `Connection` widening (RULING 5 is WITHDRAWN).** You
cannot freeze in a state you cannot enter. It also adds new mutable control flow to a
coverage-excluded file, guarding the ADR-0085 A7 double-schedule invariant, for an unreachable
state — the highest risk-per-value item in the slice. AUTH-32's "SHALL NOT connect anonymously
without an explicit user choice" is still satisfied: the client surfaces session-expired and does
NOT connect at all. The *affordance* ships with the state that makes it reachable (M21b-2).

**S4 — CUT `client/src/ui/claimFlow.ts` entirely; fold `decideConnectCredential` +
`SESSION_EXPIRED_MESSAGE` into `authToken.ts`.** RULING 4 killed `ui/claimSession.ts` for splitting
a net-layer seam into the view-model directory, then re-created the same split. `authToken.ts:3-5`
states its charter verbatim: *"the one decision `connection.ts` must not make inline: which auth
token (if any) to hand `.withToken(...)`"* — a second module answering that same question is a
duplicated SSOT. Net: −1 module, −1 test file, −1 coverage-denominator entry. **This slice creates
NO `client/src/ui/claim*.ts` file at all** (`touches:` is a ceiling, not a floor).

**S5 — CUT `FIRST_RUN_MULTI_DEVICE_NUDGE`.** It would be the only user-visible new string, and it
would tell players to sign in for cross-device play in a build with no sign-in path (F1) — false
copy, and it would tick spec checkbox `M21-accounts-auth.spec.md:333` on a string constant with no
feature behind it. Checkbox stays UNTICKED with a deferral note.

**S6 — CUT the `main.ts` claim/sign-in UI.** Reduce to `onSessionExpired: (message) => reportError(message)`.
`reportError` (`main.ts:576-581`) is already `textContent`-only, already console-errors, already
feeds the F9 error ring. One line, one assertion, instead of two buttons + conditional visibility
proved only by source scan.

**S7 — CUT `W-M21B-SYNC-LADDER`.** Over-broad AND evadable: it bans `await`/`async` file-wide
forever across a 678-line adapter (it would red M21b-2's own scheduled async prelude, and any
unrelated future `await`), while passing cleanly on `.then()` chains that reintroduce the same
interleaving hazard. The repo has already reasoned against this shape at `connection.test.ts:851-863`.
RULING 2 is true by construction in the reduced slice; it needs no tooth.

**S8 — MERGE `W-M21B-NEVER-REPLAY` into the `W-NH4-TOKEN-SUPPLIED` re-pin.** Two teeth on one line
is a duplicated SSOT for that line's shape; the failure mode is a legitimate future edit redding
both and someone "fixing" the weaker one. A contiguous exact-substring pin including the closing
paren, plus the exactly-once file-wide count, already excludes the `??`/`||` mutants.

**S9 — CUT `W-M21B-NO-MY-ACCOUNT-SUBSCRIBE`; KEEP the 3-line TRIPWIRE comment.** The tooth pins
slice scope, not safety, and the reduced slice does not touch the `.subscribe([...])` array. The
house mechanism for a deliberate absence is a tripwire comment — `connection.ts` carries three
(`:328-336`, `:446-462`, `:504-510`), none with an accompanying tooth.

**S10 — CUT C5 from the ADR-0179 body amendment;** it is a finding about code this slice no longer
writes, and recording it as an amendment invites a reader to think the mitigation shipped. It stays
in the parked list + the handoff. P3/F1/F2 stay in the amendment — they are facts about *shipped
server code*.

**S11 — OVERRULED: KEEP `writeAuthKind`.** /simplify would cut it (no producer) unless a named YAGNI
exception is written. Writing the exception: the spec's deliverable is the *marker*
(`M21-accounts-auth.spec.md:328`), and a marker is a read/write pair — shipping only the reader is a
stranger artifact than shipping both, and it is 6 lines mirroring `readAuthKind` over the same
private `storageMethod`. Per `standards/principles.md` "YAGNI with **named** exceptions", the
exception is recorded here, in the ADR body, and in a code comment: **M21b-2's OIDC return leg is
the producer.**

**S12 — RENAME the prefix to `mr.authKind.v1`** (the spec's `mr.authToken.v1.kind` is prefixed
"e.g.", i.e. illustrative). `'mr.authToken.v1.kind'` is a SUPERSTRING of the existing
`KEY_PREFIX = 'mr.authToken.v1'` (`authToken.ts:49`), so disjointness would hold only by a subtle
argument about the 16th character plus `encodeURIComponent` stripping `|`. With `mr.authKind.v1`
neither prefix is a prefix of the other and disjointness is structural — `W-M21B-KIND-DISJOINT`
demotes from *sole proof* to *cheap regression pin*. Cheaper mechanism beats a tooth.

**S13 — ADD to the ADR body: the marker is INTENT, never FACT.** It records build-time intent;
parked item 5's `my_account` subscription records the connection fact from the server. They WILL
disagree (an `'account'` marker on a connection the server left anonymous is exactly F1). Rule now
that `my_account` is authoritative once it lands, so M21b-2 doesn't inherit two truths and no ruling.
Also state the invariant in prose, not only in a tooth message: **the anon token slot must never
contain an account JWT**; the guarded `auth.onConnected` call site is currently its sole enforcer.

## FINAL file set (post-addendum)
1. `client/src/net/authToken.ts` — ADDITIVE ONLY: `AuthKind`, `AUTH_KIND_KEY_PREFIX = 'mr.authKind.v1'`,
   `authKindStorageKey`, `readAuthKind`, `writeAuthKind`, `decideConnectCredential` (2-arm),
   `SESSION_EXPIRED_MESSAGE`. Zero edits to any existing body.
2. `client/src/net/authToken.test.ts` — APPENDED block only.
3. `client/src/net/connection.ts` — 3 wiring points: `decideConnectCredential` before `.withToken()`;
   the contiguous `{ opts.onSessionExpired(...); return; }` guard; the kind-guarded
   `auth.onConnected(token)`. Plus required `onSessionExpired` on `ConnectionOptions` and the
   `my_account` tripwire comment. **No `await`, no `async`, no latch, `build()` stays synchronous.**
4. `client/src/net/connection.test.ts` — `W-M21B-NO-ANON-FALLTHROUGH` (new) + `W-NH4-TOKEN-SUPPLIED`
   and `W-NH4-SAVE-WIRED` re-pins (tester-owned, written justification, reviewer checklist).
5. `client/src/main.ts` — ONE line: `onSessionExpired: (message) => reportError(message)`.
6. `client/src/main.wiring.test.ts` — APPENDED: `onSessionExpired` supplied; no provider literal.
7. `docs/adr/0179-*.md` — body amendment (P3, F1, F2, S11's named exception, S13, M21b-2 constraints).
**NO `client/src/ui/claim*.ts`. NO env var. NO `ARCHITECTURE.md` OIDC section.**

## FINAL mutations that must bite (7 + 1 regression task)
`decideConnectCredential` returns `storedToken` on `'account'` · returns `sessionExpired:false` on
`'account'` · `readAuthKind` returns `'account'` on a missing key · `readAuthKind` returns
`'account'` on a throwing getter · `authKindStorageKey` drops `encodeURIComponent` · drop the
`return` in the sessionExpired branch · un-guard `auth.onConnected(token)`.
Regression TASK (not a tooth): re-verify `W-DEVLOG-WRAP` (`connection.test.ts:588`, fragile 140-char
lookbehind), `W-NH4-GATE-CONSTRUCTED`, `W-NH4-FAILURE-WIRED`, `W-NH4-NO-CLEAR-ON-DROP`, `SDK-DRIFT`.

## Scope honesty (state plainly in the PR)
Ships spec deliverable #1 (marker) in full and #2 (session-expired) in part — the renewal CALL is
parked with its provider. Deliverables #3 (claim UI) and #4 (nudge copy) are parked entire.
**AUTH-31 satisfied** (proven no-change). **AUTH-32 partially satisfied**: never-replay + the
session-expired state ship and are structural; the silent-renewal attempt and the explicit-choice
affordance are parked to M21b-2 with their provider. **AUTH-33 parked entire** — F2 makes every
designed unblock path irreversible player-data loss, and F1 makes the flow unable to succeed at all
today. Spec §4 client checkboxes stay UNTICKED except the marker bullet.

---

# ADDENDUM 2 — the RED phase forced one more descope (SUPERSEDES both sections above)

The tester hit a hard blocker writing the gating tests, and it is the type system reporting a real
dependency rather than a puzzle to be worked around.

**The blocker.** `build()` is annotated `function build(): DbConnection {` and `let current = build();`
is non-optional. The `sessionExpired` path requires "surface the state and do NOT build" — i.e. a
bare `return;` — which does not typecheck. Widening `build()` / `current` to `DbConnection |
undefined` cascades into `get conn()` and every `conn.conn.reducers.*` call site in `main.ts`, and
the anchor `'function build(): DbConnection {'` bounds SIX existing teeth
(`connection.test.ts:249/253/263/380/383/651/656`). That is reviewer B1's "public-surface decision"
in concrete form.

**S14 — RULING: the READ-side guard ships with the cold-start contract in M21b-2. This slice ships
the WRITE-side guard plus the discriminator it needs.** There is no correct behavior for
`sessionExpired` without an affordance to leave it (S3 cut `continueAnonymously` as unreachable) AND
a `current`-may-be-absent contract (parked item 6). Those three are one indivisible unit; splitting
them is what produced the contradiction. **CUT from this slice:** `decideConnectCredential`,
`SESSION_EXPIRED_MESSAGE`, `onSessionExpired`, the `ConnectionOptions`/`Connection` widening, the
whole `sessionExpired` branch, `W-M21B-NO-ANON-FALLTHROUGH`, and the `main.ts` + `main.wiring.test.ts`
changes.

**Bonus: `W-NH4-TOKEN-SUPPLIED` is no longer touched at all.** `.withToken(auth.tokenForNextAttempt())`
stays byte-identical to master, so AUTH-31's "no behavior change to the anonymous path" becomes
literally true rather than argued — and the slice loosens exactly ONE gating test instead of two.

**S15 — the write-side guard alone is NOT sufficient; this MUST be pinned in prose.** With the
marker at `'account'` the account token would not be stored (correct), but the next build still
supplies the stale *anon* token through the unchanged `.withToken(auth.tokenForNextAttempt())` — a
silent drop to a different identity. So `writeAuthKind` carries a comment stating that **no
production caller may write `'account'` until M21b-2's read-side credential guard lands**, and a
source-scan tooth asserts that comment's presence so it cannot be silently deleted. This is S11's
named YAGNI exception, now load-bearing rather than decorative.

## FINAL file set (post-ADDENDUM-2) — 4 files
1. `client/src/net/authToken.ts` — ADDITIVE ONLY: `AuthKind`, `AUTH_KIND_KEY_PREFIX = 'mr.authKind.v1'`,
   `authKindStorageKey`, `readAuthKind`, `writeAuthKind` (+ the S15 hazard comment). Zero edits to
   any existing body.
2. `client/src/net/authToken.test.ts` — APPENDED block only (lines 1-630 byte-unchanged = AUTH-31's
   own proof).
3. `client/src/net/connection.ts` — TWO wiring points: `const buildKind = readAuthKind(globalThis,
   opts.uri, opts.db);` fresh per build inside `build()`; `if (buildKind === 'anon')
   auth.onConnected(token);` in `onConnect` under the stale guard. Plus the `my_account` tripwire
   comment. **`build()`'s signature, `.withToken(...)`, `ConnectionOptions`, `Connection`, and every
   other existing line are UNCHANGED.**
4. `client/src/net/connection.test.ts` — `W-NH4-SAVE-WIRED` re-pin (the slice's one gating-test
   loosening; tester-owned, justified in-file, reviewer-audited) + new `W-M21B-KIND-READ`.
Plus `docs/adr/0179-*.md` body amendment. **NO `claim*.ts`, NO env var, NO `main.ts` change, NO
`ARCHITECTURE.md` OIDC section.**

## FINAL mutations that must bite (5 + regression task)
un-guard `auth.onConnected(token)` (today's shape) · invert the guard (`!== 'anon'` / `=== 'account'`) ·
re-read the marker inside the `onConnect` callback instead of the build-scoped binding (TOCTOU) ·
`readAuthKind` returns `'account'` on a missing key · `readAuthKind` returns `'account'` on a
throwing getter · `authKindStorageKey` drops `encodeURIComponent` / reuses `KEY_PREFIX` (key
collision) · delete the S15 hazard comment.
Regression TASK: re-verify `W-NH4-GATE-CONSTRUCTED`, `W-NH4-TOKEN-SUPPLIED` (must be byte-identical
to master), `W-NH4-FAILURE-WIRED`, `W-NH4-NO-CLEAR-ON-DROP`, `SDK-DRIFT`, `W-DEVLOG-WRAP`.

## Scope honesty (FINAL — state plainly in the PR)
**AUTH-31 satisfied** — and now provably, since the anonymous path's source is byte-unchanged.
**AUTH-32 NOT satisfied this slice** — the never-replay *write* half ships and is structural; the
credential decision, silent renewal, session-expired state and explicit-choice affordance are one
indivisible unit with the cold-start contract, parked to M21b-2.
**AUTH-33 NOT satisfied this slice** — F2 makes every designed unblock path irreversible player-data
loss and F1 makes the flow unable to succeed at all today.
Spec §4: tick ONLY the `authToken.ts` companion-marker bullet; the other three client bullets stay
unticked with a deferral note.

**What this slice IS, in one sentence:** the anonymous token slot must never receive an account JWT,
and the discriminator + write-side guard land *before* the path that could violate it — so M21b-2
cannot ship the C4 replay hole by accident.

## Toolchain: `export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"`
