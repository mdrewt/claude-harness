# acs-2 plan — the dev sign-in: email and password behind authorization code and PKCE

Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-2 (EARS acs-2.1 to acs-2.7).
Worktree: `projects/monster-realm/.claude/worktrees/acs-2`, branch `slice/acs-2`, base `origin/master` d6d80547.
Tier: hard (an authentication surface). Sandbox: `/tmp/acs-2-sb.AOYgeY` (probes `p1.ts`–`p4.ts`, prototype `proto.ts`; left in place).

## What is measured (sandbox probes against oidc-provider 9.15.1, nothing committed)

- **No new dependency is possible or needed.** `package-lock.json` is a structural path: `mr-touches`
  refuses it while lpw-4 and lpw-8 are unmerged. Node's built-in `crypto.argon2('argon2id', …)` exists
  on 24.22.3 and 24.22.3 with no warning and reproduces RFC 9106's argon2id vector; m=19456 KiB, t=2,
  p=1 takes 20–40 ms. `jose` 6.2.18 is installed as `oidc-provider`'s own dependency (the lock
  file pins it), so a test can import it as an independent verifier without a lock-file change;
  acs-3 declares it when it signs attestations with it.
- **The whole flow works with the library's own machinery.** A public client, `interactions.url`
  pointing at `/interaction/<uid>`, `provider.interactionDetails` / `interactionFinished` with
  `{ login: { accountId, remember: false }, consent: { grantId } }` in one result, then
  `GET /auth/<uid>` and `POST /token`. The ID token's payload is exactly
  `{ sub, mr_ent, aud, exp, iat, iss }` (header `{ alg: 'ES256', kid }`), no `at_hash`, no `sid`.
  A request that sends `nonce` gets `nonce` back, and one that sends `max_age` or `prompt=login`
  gets `auth_time`, as OpenID Connect requires; the game client (`client/src/net/oidc.ts`) sends neither.
- **The game client's request:** `response_type=code`, `scope=openid`, `state`, PKCE `S256`;
  the token request is a cross-origin form POST with `client_id` and no secret, so the token
  endpoint must answer the client origin's CORS preflight. The module's `ALLOWED_AUDIENCE` is
  `monster-realm`, so that is the client id. The client's dev and e2e origin is
  `http://localhost:<MR_E2E_PORT or 5290>`: the port varies per e2e shard, so one redirect baked into
  the code cannot serve them.
- **Refresh:** with `rotateRefreshToken: true` each refresh consumes the old token and stores a new
  one; presenting the consumed one destroys it and revokes the grant (`AccessToken`, `RefreshToken`,
  `AuthorizationCode` by grant id, then the `Grant`). A second exchange of a code does the same. A
  wrong PKCE verifier is refused before the consumed test and does not burn the code. A static
  `ttl.RefreshToken` gives every rotated token a fresh 30 days (sliding); a function returning
  `ctx.oidc.entities.RotatedRefreshToken.remainingTTL` keeps the first token's expiry.
- **Entitlement removal is not handled by the library.** `findAccount` returning `undefined` at a
  refresh gives `invalid_grant`, but nothing is revoked: with the flag restored the same refresh
  token works again. acs-2.5 needs the grant revoked by us.
- **Two parallel refreshes of one token** (acs-1 note n2 (4)): 5 of 5 rounds gave one 200 and one
  400 and left no live refresh token (the second saw the consume mark and revoked the chain).
  Between the provider's `find` and `consume` nothing awaits real I/O, because `node:sqlite` is
  synchronous, so the two requests cannot interleave there. Phase 2's ownership check will await an
  HTTP call inside `findAccount`, which opens that window (a note for acs-10).
- **The library's defaults that write for an anonymous caller or serve nobody:** pushed
  authorization requests (`POST /request`) and `userinfo` are on; `offline_access` is a supported
  scope; refresh tokens are issued only for `offline_access` and expire with the browser session
  unless `issueRefreshToken` / `expiresWithSession` say otherwise. An anonymous `GET /auth` for a
  real client writes one `Interaction` row (535 bytes) and sets the two interaction cookies; it
  writes no `Session` row and sets no `_session` cookie when the request carries no session cookie.
- **Sessions.** With the `_session` cookie passed through, a second `/auth` skips the sign-in step,
  and a sign-in as another account in the same browser hits the library's logout form (switched off
  in acs-1). With only the interaction cookies passed through, every `/auth` starts the sign-in step,
  a forged `_session` cookie writes nothing, and refresh works with the `Session` row deleted
  (`expiresWithSession: false`).
- **An account that stops being entitled between the password step and the resume** makes the
  library throw a `TypeError` (500): `findAccount` returns nothing for a session that names an
  account. One `Check` added to the login prompt turns that into a new sign-in step.
- **Token ids at rest (R-acs-1-TOKEN-IDS-AT-REST).** A code, access token or refresh token is its
  record's id, and the payload repeats it as `jti`. An adapter in front of the store that keys those
  three models by the SHA-256 of the id (and stores that digest as `jti`, handing the real id back on
  `find`) leaves the database file holding none of the three values; exchange, rotation, replay
  detection and revocation behave as before.
- **Clients through the adapter.** The provider looks a client up in the adapter's `Client` model
  when its static list has none, so a client can be a stored record.
- **Plan red-team, measured on the prototype** (`/tmp/acs-2-rt.FmHYJs`): 300 password attempts on
  one sign-in ran the step 300 times; a hash queued behind 200 others took 888 ms against 24 ms
  alone (libuv's pool has four threads, shared with token signing); a million limiter keys cost
  about 180 MB; 40 successful posts on one sign-in left 40 `Grant` rows that live 30 days.
  `new URL` accepts `http://localhost/#`, an address with a tab or CR LF inside, `http://127.1/`.
- **Existing tests.** `provider.test.ts` (acs-1) calls `createAccountProvider({ issuer, keys, adapter })`
  and pins "no client and no sign-in step" (404 on `/interaction/abc`, no write, no cookie). Those
  stay as they are: the sign-in step is an option that is absent there.

## Design

One sign-in step object is handed to the provider; the composition root (`server.ts`) picks it
from the profile's `signIn` setting. Functional core: `claims.ts`, `rateLimit.ts`, `pages.ts`, the
password-hash format. Shell: `router.ts` (HTTP for `/interaction/<uid>`), `provider.ts`
(configuration, the request handler, the store-facing adapter), `admin/cli.ts`.

- **`claims.ts`** names the ID token's claims and builds the two the account supplies (`sub`,
  `mr_ent` only when entitled); the provider adds `iss`, `aud`, `iat`, `exp`.
- **`rateLimit.ts`** is a sliding-window limiter over an injected clock: `take` records a hit
  unless the key is at its limit, `giveBack` returns one. Password attempts take a slot before the
  hash is computed and give it back on success, so parallel guesses cannot exceed the limit. acs-3
  and acs-9 reuse it.
- **`interactions/devPassword.ts`** holds dev accounts (through the store's adapter, model
  `DevAccount`, id = the normalised email, `uid` = the subject, so no change to `sqliteAdapter.ts`),
  argon2id hashing in the PHC string format, and the password step: the same hashing work for an
  unknown email as for a wrong password, and the same answers; at most `MAX_CONCURRENT_HASHES`
  hashes run at once, so a flood of attempts cannot queue the hashing threads that token signing
  shares.
- **`interactions/router.ts`** is the seam: it owns the HTTP of the sign-in step and the
  interaction plumbing, and asks the step object who signed in. `signInStepFor(method, adapter)`
  maps the profile's method to its step (`dev-password` → the password step; `steam` → none in this
  build).
- **`interactions/pages.ts`** renders the form, the not-owned page and the "sign-in ended" page from
  fixed text; no page takes a string a caller supplies except the form's own action path.
- **`provider.ts`**: registers no static client; clients are stored records (`registerClient`), read
  through the adapter as public, one-redirect, code + refresh, ES256 clients whatever the record
  holds. PKCE required for every client. Codes 60 s, ID tokens 1 h, refresh tokens 30 days from the
  sign-in (a rotated token inherits the remaining time), every refresh rotates. `findAccount`
  re-reads the account at every issuance and, when it is gone or not entitled, revokes the grant of
  the code or refresh token it was asked about. The handler passes on only the sign-in step's own
  cookies, so there is no session to reuse and every authorization request signs in again. Codes,
  access tokens and refresh tokens are stored under digests. A cap on sign-ins started
  (`MAX_PENDING_SIGN_INS` per `SIGN_IN_TTL_SECONDS`) bounds the rows anonymous `/auth` requests can
  leave in the store, and keeps `/jwks` and `/token` answering under a flood of them. Pushed
  authorization requests and `userinfo` are off; `openid` is the only scope. Cookies are signed
  with 32 random bytes made per provider instance (a restart ends the sign-ins in progress).
- **`admin/cli.ts`**: `create-account`, `reset-password`, `set-entitlement`, `set-client`. Passwords
  are generated and printed once, never taken from the command line. Refuses the `production`
  profile before it touches the disk.
- **`server.ts`** (widened at the measuring step: a server started on `local-dev` shows no form
  until it passes the step): one argument, `signIn: signInStepFor(config.signIn, store.adapter)`.

### Contracts (the tester writes to these; the implementer builds to them)

```ts
// account-service/src/claims.ts
export const ENTITLEMENT_CLAIM = 'mr_ent';
export const BASE_GAME_ENTITLEMENT = 'base-game';
export const ID_TOKEN_TTL_SECONDS = 3600;
/** Every claim of an entitled account's ID token. */
export const ID_TOKEN_CLAIMS: readonly ['iss', 'sub', 'aud', 'mr_ent', 'iat', 'exp'];
/** Claims OpenID Connect adds when the authorization request asks: `nonce` echoes the request's, `auth_time` answers `max_age` or `prompt=login`. */
export const REQUESTED_ID_TOKEN_CLAIMS: readonly ['nonce', 'auth_time'];
export function devSubject(uuid: string): string;            // `dev:${uuid}`
export interface AccountClaims { readonly sub: string; readonly mr_ent?: readonly string[] }
export function accountClaims(account: { readonly sub: string; readonly entitled: boolean }): AccountClaims;
// entitled: { sub, mr_ent: ['base-game'] }. Not entitled: { sub } with no mr_ent member at all.
```

```ts
// account-service/src/rateLimit.ts
export interface RateLimiter {
	/** Records a hit for `key` and returns true, unless `key` already has `limit` live hits (then false, nothing recorded). */
	take(key: string): boolean;
	/** Removes the most recent hit of `key`, if it has one. */
	giveBack(key: string): void;
	/** How many keys have at least one live hit now. */
	readonly size: number;
}
export function createRateLimiter(options: {
	readonly limit: number; // a positive safe integer
	readonly windowSeconds: number; // a positive finite number
	readonly now?: () => number; // epoch seconds; default the wall clock (Math.floor(Date.now() / 1000))
}): RateLimiter;
```
A hit taken at `t` is live while `now() - t < windowSeconds`. Keys are exact strings (`__proto__`
is an ordinary key). A key with no live hit is not counted by `size` and holds no memory after the
next `take` or `size` read (expiry walks keys oldest first; it never scans every key). `giveBack`
on a key with no hit does nothing. `createRateLimiter` throws a `RangeError` for any other `limit`
or `windowSeconds`.

```ts
// account-service/src/interactions/router.ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type Provider from "oidc-provider";
import type { Adapter } from "oidc-provider";
import type { SignInMethod } from "../config.ts";
export interface Account {
	readonly sub: string;
	readonly entitled: boolean;
}
export type SignInOutcome =
	| { readonly kind: "signed-in"; readonly sub: string }
	| { readonly kind: "not-owned" } // the right password for an account that is not entitled
	| { readonly kind: "refused" } // wrong email or password; never says which
	| { readonly kind: "locked" } // this email has had too many failures
	| { readonly kind: "busy" }; // too many attempts are being checked at once; nothing was counted
export interface PasswordStep {
	readonly kind: "password";
	attempt(email: string, password: string): Promise<SignInOutcome>;
	/** The account behind a subject, read afresh at every issuance; undefined when there is none. */
	account(sub: string): Promise<Account | undefined>;
}
export type SignInStep = PasswordStep; // phase 2 adds the Steam steps here
export function signInStepFor(
	method: SignInMethod,
	adapter: (model: string) => Adapter,
): SignInStep | undefined;
// 'dev-password' → devPasswordStep(adapter); 'steam' → undefined (this build has no Steam step)
export function createInteractionRouter(options: {
	readonly provider: Provider;
	readonly issuer: string;
	readonly signIn: SignInStep;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
```
The router is reached through `createAccountProvider(...).handler` (below); tests drive it over HTTP
with a stub `PasswordStep` or the real one.

```ts
// account-service/src/interactions/devPassword.ts
import type { Adapter } from "oidc-provider";
import type { RateLimiter } from "../rateLimit.ts";
import type { PasswordStep } from "./router.ts";
export const PASSWORD_FAILURE_LIMIT = 5;
export const PASSWORD_FAILURE_WINDOW_SECONDS = 600;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_CONCURRENT_HASHES = 4;
export interface DevAccount {
	readonly sub: string;
	readonly email: string;
	readonly entitled: boolean;
}
export class DevAccountError extends Error {
	readonly reason: "invalid-email" | "exists" | "unknown";
}
export interface DevAccounts {
	create(
		email: string,
		options: { readonly entitled: boolean },
	): Promise<{ readonly account: DevAccount; readonly password: string }>;
	resetPassword(
		email: string,
	): Promise<{ readonly account: DevAccount; readonly password: string }>;
	setEntitled(email: string, entitled: boolean): Promise<DevAccount>;
	find(email: string): Promise<DevAccount | undefined>;
}
export function devAccounts(adapter: (model: string) => Adapter): DevAccounts;
/** An argon2id hash in the PHC string format, under a fresh 16-byte salt. */
export function hashPassword(password: string): Promise<string>;
/** Whether `password` is the one `hash` was made from. False, never a throw, for a hash it cannot parse. */
export function verifyPassword(
	hash: string,
	password: string,
): Promise<boolean>;
export function devPasswordStep(
	adapter: (model: string) => Adapter,
	deps?: {
		readonly failures?: RateLimiter;
		readonly verifyPassword?: (
			hash: string,
			password: string,
		) => Promise<boolean>;
	},
): PasswordStep;
```

- **Emails.** Normalised with NFKC then lower case. Valid: 3 to 254 UTF-16 code units (a string's
  `length`, as HTML's `maxlength` counts) after normalising, matching `/^[^\s@]+@[^\s@]+$/`, with
  no control character. Every `DevAccounts` method normalises
  first; an invalid email throws `DevAccountError` with reason `invalid-email` (`find` returns
  `undefined`).
- **Records.** Model `DevAccount` through the given adapter, id = the normalised email, payload
  exactly `{ uid: <sub>, email, passwordHash, entitled }`, no expiry. `sub` is
  `devSubject(crypto.randomUUID())`. The store never holds a password: only `passwordHash`.
- **`create`** refuses an email that already has an account (`exists`) and changes nothing then.
  Each method computes its hash first and then reads and writes the record with nothing awaited in
  between other than the store; two admin processes writing one account at the same instant can
  still overwrite each other (the adapter has no conditional write).
  The generated password is 24 characters of base64url (18 random bytes). **`resetPassword`** keeps
  `sub` and `entitled`, stores a new hash, returns a new password; the old password stops working.
  **`setEntitled`** changes only the flag. Both throw `unknown` for an email with no account.
- **Hash format.** `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<tag>`: salt 16 bytes, tag 32 bytes, both
  standard base64 without padding. Two hashes of one password differ. `verifyPassword` recomputes
  with the parameters and salt the string carries and compares in constant time
  (`crypto.timingSafeEqual`); it returns false for a string that is not this format, whose
  parameters exceed m=65536, t=10 or p=4, or whose salt or tag has another length.
- **`devPasswordStep(adapter, deps)`**. `failures` defaults to
  `createRateLimiter({ limit: 5, windowSeconds: 600 })` on the wall clock; `verifyPassword` defaults
  to this module's. `account(sub)` is the account whose record has that `uid`, or `undefined`.
  `attempt(email, password)`:
  1. An invalid email, an empty password or a password over 128 UTF-16 code units → `refused`;
     nothing is counted and no hash is computed.
  2. `MAX_CONCURRENT_HASHES` attempts of this step are already inside `verifyPassword` → `busy`;
     nothing is counted and no hash is computed.
  3. `failures.take(<normalised email>)` false → `locked`; no hash is computed.
  4. `verifyPassword` is called exactly once: with the account's hash, or, when the email has no
     account, with a well-formed argon2id hash of a random value under the same parameters. That
     hash is made once, when the step is created, so an attempt for an unknown email costs one
     hash, as a wrong password does.
  5. An account and a right password → the slot is given back; `signed-in` with its `sub` when
     entitled, `not-owned` when not.
  6. Otherwise `refused`; the slot stays taken.
     A `verifyPassword` that rejects makes `attempt` reject, with the slot still taken.
     So five wrong attempts for one email inside ten minutes lock that email until ten minutes after
     the first of them, the right password included; an email with no account locks the same way; and
     twenty attempts fired at once for one email compute at most five hashes.

```ts
// account-service/src/interactions/pages.ts
/** Sent with every page: no-store, nosniff, no framing, a CSP that loads nothing. */
export const PAGE_HEADERS: Readonly<Record<string, string>>;
export function signInPage(options: { readonly action: string; readonly notice?: 'refused' | 'locked' | 'busy' }): string;
export function notOwnedPage(): string;
export function endedPage(): string;
```

- `PAGE_HEADERS` has exactly: `content-type: text/html; charset=utf-8`, `cache-control: no-store`,
  `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: same-origin`, and
  `content-security-policy` whose directives include `default-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'none'` and a `style-src` that is a hash (no `unsafe-inline`), and no `form-action`
  directive (Chrome applies `form-action` to the redirect that follows the post, which goes to the
  game's origin).
- Every page is a complete HTML document (`<!doctype html>`, `<html lang="en">`, a `<title>`), with
  no `<script>`, no external URL, no inline event handler.
- `signInPage`: one `<form method="post" action="<action, HTML-escaped>">` with an input
  `name="email"` (`type="email"`, `autocomplete="username"`, `required`, `maxlength="254"`), an
  input `name="password"` (`type="password"`, `autocomplete="current-password"`, `required`,
  `maxlength="128"`), each with a `<label>`, and a submit button. `notice: 'refused'` adds the text
  `Wrong email or password.`; `notice: 'locked'` adds `Too many attempts. Try again in a few minutes.`;
  `notice: 'busy'` adds `The service is busy. Try again in a moment.`; each in an element with
  `role="alert"`. The page never contains an email or a password.
- `notOwnedPage()` takes no argument: it says the account does not own the game and names nothing
  about the account. `endedPage()` says the sign-in has ended and to start again from the game.

```ts
// account-service/src/provider.ts  (createAccountProvider gains one option; registerClient is new)
import type { SignInStep } from "./interactions/router.ts";
export const AUTHORIZATION_CODE_TTL_SECONDS = 60;
export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000; // 30 days
export const SIGN_IN_TTL_SECONDS = 600;
export const MAX_PENDING_SIGN_INS = 20_000;
export function createAccountProvider(options: {
	readonly issuer: string;
	readonly keys: SigningKeys;
	readonly adapter: (model: string) => Adapter;
	readonly signIn?: SignInStep;
	/** Sign-ins that may be started within `SIGN_IN_TTL_SECONDS`; default `MAX_PENDING_SIGN_INS`. */
	readonly maxPendingSignIns?: number;
}): AccountProvider;
/** Stores (or replaces) a public client with one redirect address. */
export function registerClient(
	adapter: (model: string) => Adapter,
	client: { readonly clientId: string; readonly redirectUri: string },
): Promise<void>;
```
`registerClient` throws a `TypeError` naming the rule, and stores nothing, unless `clientId` matches
`/^[A-Za-z0-9._-]{1,64}$/` and `redirectUri` is a URL written in its canonical form
(`new URL(redirectUri).href === redirectUri`, so `http://localhost:5290` without its `/`,
`http://127.1/`, upper case in the host, or a tab inside are refused) that is `https:`, or `http:`
on the host `localhost`, `127.0.0.1` or `[::1]`, with no user or password and no `#`. It stores
`{ redirectUri }` under model `Client`, id = `clientId`, no expiry.

Without `signIn`, the service behaves as acs-1 built it (every existing `provider.test.ts` test
holds unchanged); `POST /request` and `GET /me` are 404.

With `signIn` (everything below is through `handler`, with the issuer's `Host`):

- **Discovery.** `scopes_supported` is `['openid']`; `grant_types_supported` is
  `['authorization_code', 'refresh_token']`; `code_challenge_methods_supported` is `['S256']`; there
  is no `userinfo_endpoint` and no `pushed_authorization_request_endpoint`; acs-1's discovery
  assertions still hold.
- **Clients.** A registered client is public (`token_endpoint_auth_method: 'none'`), has exactly its
  one redirect address, the `authorization_code` and `refresh_token` grants and ES256 ID tokens,
  whatever else its stored record holds. An unknown client id, or a record without a string
  `redirectUri`, is `invalid_client` (400) and writes nothing. A `redirect_uri` other than the
  registered one is refused with 400 and is never redirected to.
- **`GET /auth`** for a registered client with `response_type=code`, `scope=openid`, the registered
  `redirect_uri` and an S256 `code_challenge` answers 303 to `/interaction/<uid>`, stores one
  `Interaction` record that expires after `SIGN_IN_TTL_SECONDS`, and sets `_interaction` (path
  `/interaction/<uid>`) and `_interaction_resume` (path `/auth/<uid>`) with their `.sig` cookies:
  `HttpOnly`, `SameSite=Lax`, and `Secure` when the issuer is `https:`. Without a `code_challenge`,
  or with `code_challenge_method=plain`, it redirects to the client with `error=invalid_request` and
  starts no sign-in. It never issues a code without the sign-in step, whatever cookie the request
  carries (a `_session` cookie from an earlier sign-in included).
- **The cap.** An authorization request counts when it is about to start a sign-in step, however
  it spells the endpoint: the provider answers `GET /auth`, `HEAD /auth`, `/AUTH` and `/auth/`
  alike, and each counts. When `maxPendingSignIns` sign-ins have been started within
  `SIGN_IN_TTL_SECONDS`, a further such request gets 503 `text/plain` (the body starts
  `temporarily_unavailable`), is not redirected to the client, sets no cookie and stores nothing,
  until the window moves on. A request the provider refuses for its own reasons (an unknown
  client, another redirect address, no PKCE) starts no sign-in and is not counted. `POST /auth` is
  404: the provider takes authorization requests by GET. Nothing else is counted or refused by the
  cap: not the resume (`/auth/<uid>`), `/interaction/<uid>`, `/token`, `/jwks` or discovery.
- **Request targets.** A request whose target (path and query) is longer than 2048 characters gets
  414 `text/plain` on every route and reaches neither the provider nor the router; one of exactly
  2048 is served. A sign-in's stored record holds its authorization request, so this bounds a
  record at about 5 KB.
- **A sign-in ends ten minutes after it started.** `GET /auth/<uid>` for a sign-in that has no
  result yet (nobody signed in, or the answer was not-owned) answers 303 to a new
  `/interaction/<other uid>`, and that new step's record expires when the first one would have:
  started at `T`, resumed at `T + 500`, the new step's form is served at `T + 599` and is the
  ended page at `T + 600`. So the cap on sign-ins started is a cap on the records alive.
- **At rest, positively.** The record of a code, an access token or a refresh token is stored
  with `id` equal to the base64url SHA-256 of the value (`createHash('sha256').update(value).digest('base64url')`),
  and its payload's `jti` is that same digest.
- **Cookie keys.** Cookies are signed with a key of 32 random bytes made for each
  `createAccountProvider` call: the cookies one instance sets are refused by another instance (the
  ended page), and an `_interaction` cookie with a changed value or signature is refused.
- **`GET /interaction/<uid>`** with that sign-in's cookies → 200, `PAGE_HEADERS`, `signInPage` whose
  action is `/interaction/<uid>`. Without the cookies, with a forged or another sign-in's cookie, or
  after the sign-in expired → 400 with `endedPage`; the step is not called and nothing is written.
- **`POST /interaction/<uid>`** is checked in this order, and the first failure answers:
  1. a method other than GET or POST → 405 with `Allow: GET, POST`;
  2. `Origin` not equal to the issuer's origin, or absent → 403 `text/plain`;
  3. a media type other than `application/x-www-form-urlencoded` (compared without its parameters
     and without regard to case, so `…; charset=UTF-8` passes) → 415 `text/plain`;
  4. no live sign-in for the request's cookies and `<uid>` → 400 with `endedPage`;
  5. a body over 8192 bytes, counted as it is read → 413 `text/plain`;
  6. not exactly one `email` and one `password` field → 400 `text/plain` (other fields are ignored).
     None of those calls the step or writes. A sign-in that has already succeeded answers a further
     POST with the same 303 again, without calling the step and without a second grant. Otherwise, by
     `signIn.attempt(email, password)`:
  - `signed-in` → 303 to `<issuer>/auth/<uid>`; one `Grant` for that subject and client with the
    `openid` scope is stored.
  - `not-owned` → 403 with `notOwnedPage`; no grant is stored. The sign-in stays open (the form
    accepts another attempt), and `GET /auth/<uid>` afterwards answers 303 to a new
    `/interaction/<other uid>` with no code.
  - `refused` → 400 with `signInPage` and the `refused` notice.
  - `locked` → 429 with `signInPage` and the `locked` notice.
  - `busy` → 503 with `signInPage` and the `busy` notice.
    An `attempt` that rejects → 500 `text/plain` with no detail of the error.
    Every reply of the router carries `cache-control: no-store` and `x-content-type-options: nosniff`;
    every page carries all of `PAGE_HEADERS`.
- **`GET /auth/<uid>`** (the resume) after `signed-in` → 303 to the registered redirect address with
  `code`, the request's `state` and `iss`. It sets no cookie the service ever reads back. If the
  account has stopped being entitled since the password step, it starts a new sign-in step instead
  (303 to `/interaction/<new uid>`), with no code and no 500.
- **`POST /token`, `grant_type=authorization_code`** with `code`, `code_verifier`, `client_id`,
  `redirect_uri`: 200 with `id_token`, `refresh_token`, `access_token`, `token_type: 'Bearer'`,
  `expires_in`. A request whose `Origin` is the client's redirect origin gets that origin in
  `Access-Control-Allow-Origin`; any other origin gets none. The ID token: header `alg: 'ES256'` and
  the `kid` of the first signing key; payload members exactly `ID_TOKEN_CLAIMS`: `iss` the issuer,
  `sub` the account's `dev:<uuid>`, `aud` the client id, `mr_ent: ['base-game']`, `exp - iat === 3600`.
  It verifies under the matching `/jwks` entry; with any byte of its payload changed it does not.
  `iat` is the second the token was issued (the fake clock's, in tests). Checked by `jose`'s
  `jwtVerify` against the key set `/jwks` serves, with `issuer` and `audience` given, it verifies
  at `iat + 3599` (`currentDate`) and is refused as expired at `iat + 3600`.
  A wrong `code_verifier` → `invalid_grant` (the code is not burnt). A second exchange of the code →
  `invalid_grant`; the refresh token that sign-in issued then gets `invalid_grant`, and no record
  of that grant remains in the store. A code presented `AUTHORIZATION_CODE_TTL_SECONDS` or more
  after it was issued → `invalid_grant`; one second earlier it is exchanged. Another client's code →
  `invalid_grant`.
- **`POST /token`, `grant_type=refresh_token`**: 200 with a new `refresh_token` (different from the
  one presented), a new `id_token` (claims as above, the flag read afresh) and an access token. The
  presented token is spent: presenting it again → `invalid_grant`, the newest refresh token of
  that chain then also gets `invalid_grant`, and no record of that grant remains in the store. A
  refresh token expires `REFRESH_TOKEN_TTL_SECONDS` after the code exchange that issued the
  chain's first one, and a rotated token keeps that expiry: 60 seconds before that moment a refresh
  succeeds, and one second after it the newest token gets `invalid_grant` (so the grant itself
  lasts at least as long).
- **Entitlement.** A refresh, or a code exchange, for an account whose flag is now off, or that no
  longer exists → `invalid_grant`, and the chain is revoked: no record of that grant remains, and
  with the flag back on neither the presented token nor any other refresh token of that chain
  works. An ID token already issued stays valid until its `exp` (an hour at most): nothing can
  recall it. A `signIn.account` that rejects is an error, not an answer: the token request gets a
  5xx `server_error`, nothing is revoked, and the same token works once `account` answers again.
- **At rest.** After a sign-in and a refresh, no row of the store (ids and payloads) and no byte of
  the database file holds the code, an access token or a refresh token.
- **Cookies.** A request's `_session` cookie is never honoured: with the `_session` and
  `_session.sig` cookies a completed sign-in set, `GET /auth` still answers 303 to a new sign-in
  step. Forged or stale cookies on any route write nothing. (The handler passes the provider only
  `_interaction`, `_interaction.sig`, `_interaction_resume` and `_interaction_resume.sig`, splitting
  each pair at its first `=` and dropping a pair without one.)
- **Errors.** Token-endpoint errors are JSON `{ error, error_description }`; a refused grant never
  says why (`grant request is invalid`).

```ts
// account-service/src/admin/cli.ts
export interface AdminIo {
	out(line: string): void;
	err(line: string): void;
}
/** Runs one admin command and returns the process exit code. */
export function runAdmin(
	argv: readonly string[],
	env: Readonly<Record<string, string | undefined>>,
	io: AdminIo,
): Promise<number>;
```
Run as `node src/admin/cli.ts <command> …` from `account-service/` with the service's own
`MR_ACCOUNT_*` environment (it loads the same `loadConfig(env)`), against the same database file,
while the service runs or not.

| Command                                          | On success (exit 0) prints to `out`, one `name=value` per line     |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `create-account <email> [--not-entitled]`        | `sub=`, `email=` (normalised), `entitled=true\|false`, `password=` |
| `reset-password <email>`                         | `sub=`, `email=`, `entitled=`, `password=` (the new one)           |
| `set-entitlement <email> entitled\|not-entitled` | `sub=`, `email=`, `entitled=`                                      |
| `set-client <client-id> <redirect-uri>`          | `client=`, `redirect_uri=`                                         |

- Exit 2 with a usage text on `err` and nothing on `out`: no command, an unknown command, a wrong
  number of arguments, an unknown flag. Nothing is opened or written.
- Exit 1 with one line on `err` and nothing on `out`: `MR_ACCOUNT_PROFILE` set to `production`
  (checked before the rest of the configuration is loaded, so the line names `MR_ACCOUNT_PROFILE`
  whatever else is set or missing; no directory or file is created, whatever the command); a
  `ConfigError` (its message); an account that exists (`create-account`) or does not (`reset-password`,
  `set-entitlement`); an invalid email; a client id or redirect address `registerClient` refuses.
- A password appears only on `out`, in the one `password=` line; never on `err`, never in the
  database. The command takes no password argument.
- It creates the data directory (0700) and the database (0600) when absent, as the server does.
- The file is also the entry point: `if (import.meta.main)` runs `runAdmin(process.argv.slice(2),
  process.env, io)` with an `io` that writes each line to `process.stdout` / `process.stderr`, and
  sets `process.exitCode`.

```ts
// account-service/src/server.ts — one changed call
createAccountProvider({
	issuer,
	keys,
	adapter: store.adapter,
	signIn: signInStepFor(config.signIn, store.adapter),
});
```
A server started on `local-dev` with a client and an account made by `runAdmin` against the same
data directory serves the form at `/interaction/<uid>` and completes a sign-in.

## Tests (the tester writes them; names lead with the behaviour, the gate id is a trailing token)

| File                                                         | Carries                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/claims.test.ts`                                         | acs-2.1 (claim names, `mr_ent` only when entitled)                                                                                                                                                                                                                  |
| `src/rateLimit.test.ts`                                      | acs-2.3 (window, `take`/`giveBack`, forgetting, bad options)                                                                                                                                                                                                        |
| `src/interactions/devPassword.test.ts`                       | acs-2.3 (five failures lock, unknown email identical, parallel attempts, one hash per attempt), acs-2.6 (argon2id PHC, recomputed with `node:crypto`; nothing but the hash stored)                                                                                  |
| `src/interactions/pages.test.ts`                             | acs-2.2 (the not-owned page takes nothing and names nothing), headers, escaping                                                                                                                                                                                     |
| `src/interactions/router.test.ts`                            | acs-2.2, acs-2.3 over HTTP with a stub step: each outcome's status and page, origin/content-type/size/method rules, cookies                                                                                                                                         |
| `src/interactions/flow.integration.test.ts`                  | acs-2.1, acs-2.2, acs-2.4, acs-2.5, acs-2.7 (verified with `jose` against `/jwks`; refused at `exp`) end to end over HTTP with the SQLite store and the real step; at rest; no session reuse; the cap (through `maxPendingSignIns`); time with vitest's fake `Date` |
| `src/admin/cli.test.ts`                                      | acs-2.6 (`runAdmin` in process; one spawned run of the entry point; production refused with nothing written)                                                                                                                                                        |
| `src/provider.test.ts` (sibling, appended)                   | `registerClient` rules; discovery with a sign-in step                                                                                                                                                                                                               |
| `src/server.test.ts` (sibling of the widened file, appended) | the `local-dev` server completes a sign-in (the widen's red proof)                                                                                                                                                                                                  |

Red proof: the new files fail at the import of the module they gate; the appended tests fail on
behaviour. After green: a hand-written wrong-implementation pass over the protected behaviours
(entitlement, lockout, replay, hashing, at-rest digests, cookie allowlist, origin rule), logged to
`$MEM/gates/acs-2.mutants.log`.

## Ledger

Each gate's CHECK runs the files that carry it with vitest's JSON reporter and prints
`<gate>:GREEN tagged=<n> files=<f> tests=<passed> of <total>` only when every test of those files
passed, none is skipped or todo, and at least one passed test's full name ends with the gate id.

## Docs

`docs/account-service.md` (in `touches:`): the sign-in step and its pages; clients as stored
records; accounts and the admin commands (Running it; Runbook "Admin accounts"); no session, the
cookie key per start; token lifetimes and rotation; what is stored and under what (digests); the
limits (five failures, four hashes, the sign-in cap) and what they do not cover; the first sentence
and the Storage bullet, which now say the opposite. `docs/DECISIONS.md` only if doc-keeper judges
the no-session rule or the absolute refresh lifetime at the bar (a clause in the existing entry).

## plan-delta (each is a choice the spec leaves open or a measured addition)

1. `server.ts` is outside `touches:` and must pass the sign-in step: widened with the red server test as proof.
2. Clients are stored records written by `set-client`, not a list in code: the client's origin
   differs per e2e shard and per deployment, and `config.ts` (which refuses unknown settings) is
   outside `touches:`.
3. The service keeps no sign-in session: every authorization request runs the sign-in step. Phase
   2's ownership check then runs at every authorization with no extra rule.
4. A refresh chain ends 30 days after its sign-in (a rotated token inherits the remaining time). The
   spec says "refresh-30d-rotating"; sliding 30 days is one function away.
5. R-acs-1-TOKEN-IDS-AT-REST is fixed here, in `provider.ts`: codes, access tokens and refresh tokens are stored under SHA-256 digests.
6. A cap of 20,000 sign-ins started per ten minutes, with request targets held to 2048
   characters and a resumed sign-in keeping its first deadline, bounds what anonymous
   authorization requests can write (acs-1 note n2 (1)) at about 100 MB, and keeps the rest of the service answering under a flood; it is also a way to refuse new
   sign-ins for ten minutes at 33 requests a second, accepted until per-address limits exist. The
   cap is a check inside the provider's own pre-sign-in policy, because the provider's router
   accepts `HEAD`, any letter case and a trailing slash (the artifact lenses measured all three
   past a path test). At most four password hashes run at once, for the same reason.
7. Pushed authorization requests and `userinfo` are off and `openid` is the only scope: nothing uses them, and the first writes for an anonymous caller.
8. Passwords are generated by the admin command and printed once; it takes none as an argument.
9. An ID token also carries `nonce` or `auth_time` when the request asks for them (OpenID Connect requires it); the game client asks for neither.
10. An account that stops being entitled between the password step and the resume gets a new sign-in step, not a 500.
11. acs-2.7's test verifies with `jose`, which the package does not declare: it is `oidc-provider`'s own pinned dependency, and the lock file cannot change in this slice (acs-3 declares it).

## Not built (notes or residuals to file at close)

- A password reset leaves the account's existing refresh chains alive (up to 30 days). Follow-up, security-privacy/MED (the plan red-team's rating): dev accounts only, and the fix is a `passwordSetAt` on the record that `findAccount` compares with the token's sign-in time.
- No per-address limit on `/auth` or on password attempts: a flood can fill the sign-in cap (new sign-ins get 503 for up to ten minutes) or hold the four hashing slots (`busy`). The lock is by design a way to lock a known email out for ten minutes, and it lives in the process: only a restart clears it. A trusted-proxy rule is needed first (acs-1 note n3; acs-9 builds the per-address limiter).
- An account holder can leave one 30-day `Grant` row per completed sign-in (a few hundred bytes); bounded only by the sign-in cap.
- Two admin commands writing one account at the same instant can overwrite each other: the adapter has no conditional write, and `sqliteAdapter.ts` is outside this slice.
- acs-9 / acs-11: the admin command refuses `production`, so production has no way to register a client yet.
- acs-10: its ownership check awaits HTTP inside `findAccount`, between the provider's find and consume of a refresh token, so two parallel refreshes can then both pass; and a Steam failure there must be an error (nothing revoked), never "not entitled", or an outage revokes every chain.
- acs-3: an ID token outlives a cleared flag by up to an hour, so the attestation route re-reads the account or accepts that hour.
- acs-7: the e2e registers its own origin with `set-client` and reads the generated password from `create-account`'s output; the issuer is one port on a machine and a client has one redirect, so the sign-in spec runs in one shard.
- The provider sets a `_session` cookie when a sign-in completes; the service never reads it and its record expires after a minute.
