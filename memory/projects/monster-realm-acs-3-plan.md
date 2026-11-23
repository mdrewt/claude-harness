# acs-3 plan — the attestation route

Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-3 (EARS acs-3.1 to acs-3.5).
Worktree: `projects/monster-realm/.claude/worktrees/acs-3`, branch `slice/acs-3`, base `origin/master` 16e2cb3c.
Tier: hard (a security surface). Design SSOT: game `docs/DECISIONS.md` "A private world verifies an
account by a per-world attestation our account service signs", "The attestation is signed with
Ed25519 and checked by `ed25519-dalek` compiled into the module", "An attestation names the server
as the player's own software authenticated it"; `docs/local-play.md` §3 forks (b), (c), (e).

## What is measured

- **jose 6.2.18 signs and verifies Ed25519 under the `alg` name `Ed25519`** (RFC 9864) and under
  `EdDSA`; a set of ES256 keys answers an Ed25519 token with `ERR_JWKS_NO_MATCHING_KEY`. A compact
  attestation with the eight claims is about 330 bytes plus the world and nonce.
- **An Ed25519 private key is 32 bytes**; Node builds one from them alone as PKCS#8 (the 16-byte
  prefix `302e020100300506032b657004220420` then the bytes) and exports `x`. Node 24.22.0 refuses
  an OKP JWK whose `d` is not the private half of `x`; the EC case was accepted by 24.13.1, so the
  loader derives `x` from `d` itself and compares.
- **`mr-touches` refuses `account-service/package.json`** ("gate or loop-control file: never
  self-granted"): a manifest at any depth is in a slice's set only when its spec declares it. So
  R-acs-2-JOSE-UNDECLARED cannot close here. jose stays what it is today: `oidc-provider`'s own
  dependency, pinned at 6.2.18 by the lock file and installed by `npm ci`.
- **The provider answers a CORS preflight for any origin** (`oidc-provider/lib/shared/cors.js`) and
  applies `clientBasedCORS` to the real request.
- **`server.test.ts` holds the start line to one line** (`expect(lines).toHaveLength(1)`, a regex
  ending at the login `kids`), and one test starts `hosted-dev` on a login key file alone.
- Baseline: `npm test` in `account-service/`, 12 files, 596 tests, 6.3 s, green on Node 24.22.0.

## Design

Functional core / imperative shell. The core is three pure or near-pure steps (check the bearer
token, parse the body, sign the claims); the shell is one request handler that orders them, reads
the clock, the limiter and the account, and writes the answer and the log line.

1. **The attestation key is Ed25519** (closes R-lpw-7-ATTESTKEY's signing half). Header
   `{ alg: 'Ed25519', kid }`: the fully specified name of RFC 9864, which deprecates `EdDSA`; the
   module never reads `alg`. A generated key's `kid` is its RFC 7638 thumbprint; a key file names
   each key's `kid` (required, as for a login key).
2. **Where each profile's attestation key lives.**
   - `local-dev`: one fixed key, the same on every machine, derived in `keys.ts` from a constant
     label (SHA-256 of the label is the 32 private bytes). A dev build of the module embeds
     attestation keys as data and cannot fetch them, so a key generated per machine, as the login
     key is, could be embedded by nobody (`docs/local-play.md` §3 fork (e): a build's keys are
     constants computed from its features). The repository is public, so this key's private half
     is public: anyone can sign with it. A build that embeds it (every `dev_issuers` build, as
     designed) therefore accepts a binding anyone can forge; its ownership check in a `local` or
     `private` world rehearses the flow and stops nobody. `docs/DECISIONS.md` records that in
     "Ownership is enforced unless a dev feature switches it off" (amended in place), the doc says
     it, and a note tells lpw-15 and acs-6 that a dev build meant to hold against strangers embeds
     only the `hosted-dev` list. No other profile may sign with or publish this key: a key file
     holding it is refused.
   - `hosted-dev`: a key file the operator provides, `attestation-keys.json` beside the login key
     file, same shape (`{ "profile", "keys": [ … ] }`) and same rules (regular file, at most 64
     KiB, owner-only, marked for the profile, distinct `kid`s). It must exist: a hosted instance
     with no attestation key refuses to start.
   - `production`: an external signer, as for the login key; this build holds none and refuses.
   - A `kid` that a login key also carries is refused at start: the two key sets are disjoint by
     key type and by name.
3. **Publication.** The public half of every attestation key a module build may accept is listed
   per profile by `publishedAttestationKeys()` in `keys.ts`, and written as the generated file
   `account-service/attestation-public-keys.json` (the doc gives the one-line command that prints
   it from that function). A test regenerates and compares. `hosted-dev` and `production` are empty lists until those keys exist.
   The service does not check at start that the key it signs with is published: a `hosted-dev`
   key the operator has not yet added to the list signs attestations no build accepts (a note
   for acs-4 and acs-5).
4. **The route** is `POST /attest` in `attest.ts`, composed in `server.ts` in front of the
   provider's handler. It takes a request only at exactly that path and under the issuer's `Host`;
   anything else goes to the provider's handler untouched (so a wrong `Host` still gets its 421).
5. **Checks, in order:** bearer token (signature under a login key, ES256 only, `iss` the issuer,
   `exp` in the future, `sub` and `aud` strings); `mr_ent` names `base-game`; the body; the
   account's limit; the account read afresh (an ID token outlives a cleared flag by up to an hour,
   and a binding is permanent); sign. The token is checked before the body is read.
6. **`world` and `nonce` are opaque, bounded strings**: visible ASCII (`0x21` to `0x7E`), 1 to 512
   and 1 to 128 characters. The names fork (c) defines are ASCII; the bound keeps an attestation
   under 2 KiB, inside the cap the module's bind will set.
7. **The limit** is 20 per account per 3600 seconds, sliding, in the process. A hit is taken once a
   request has a valid token and a valid body, before the account is read; it is given back only
   when the service itself failed. `rateLimit.ts` gains `retryAfter(key)` for the `Retry-After`
   header.
8. **Logging.** One line per attestation issued, with the account and the time. A refusal writes
   no line (a caller could write lines without bound). A failure of the service writes one line
   with the account, the time, the step and the error's class name, never its message. The route
   never passes the world, the nonce, the body or a token to the log function.
9. **CORS.** The route reads no cookie; the bearer token is the only way in. Every answer carries
   `Access-Control-Allow-Origin: *` and exposes `Retry-After` and `WWW-Authenticate`, and
   `OPTIONS` answers the preflight, so a page at a registered sign-in origin (the dev client,
   lpw-15) can call it and read refusals. Restricting the answer to the token's client's origin
   would protect nothing (a page that holds a token can send it from anywhere) and would make a
   401 unreadable to our own page.
10. **What a stolen ID token buys** (accepted, documented, a follow-up filed): whoever holds an
    account's ID token can bind worlds as that account while the token lasts (an hour at most, 20
    an hour), and a binding outlasts the token. The spec gives the route the ID token as its
    credential; requiring a freshly issued one would narrow the window and is not built.
11. **The handler never throws and never rejects.** Whatever a dependency does (an `account` that
    rejects with a non-`Error`, a request that ends mid-body), the route answers or drops that one
    request and the process keeps serving.

## Contracts

Paths are relative to `account-service/`. Relative imports carry `.ts`.

### `src/keys.ts` (additions; `loadSigningKeys`, `generateSigningKey`, `SigningJwk`, `SigningKeys` unchanged)

```ts
/** A private Ed25519 attestation key, as a JWK. */
export interface AttestationJwk {
  readonly kty: 'OKP';
  readonly crv: 'Ed25519';
  readonly alg: 'Ed25519';
  readonly use: 'sig';
  readonly kid: string;
  readonly x: string; // 32 bytes, unpadded base64url (43 characters)
  readonly d: string; // 32 bytes, unpadded base64url (43 characters)
}
/** Its public half: every member but `d`. */
export type PublicAttestationJwk = Omit<AttestationJwk, 'd'>;
/** The attestation keys: the first signs. */
export interface AttestationKeys {
  readonly keys: readonly AttestationJwk[];
}

/** The attestation key file's name; it sits in the directory of the login key file. */
export const ATTESTATION_KEY_FILE_NAME = 'attestation-keys.json';

/** A fresh random key whose `kid` is the RFC 7638 thumbprint of its public half. */
export function generateAttestationKey(): AttestationJwk;

/** `key` without `d`: exactly the members kty, crv, alg, use, kid, x. */
export function publicAttestationKey(key: AttestationJwk): PublicAttestationJwk;

/**
 * The profile's attestation keys. `login` is the profile's login keys (from `loadSigningKeys`).
 * Every refusal is a `ConfigError` whose `setting` is 'MR_ACCOUNT_KEY_FILE' (or
 * 'MR_ACCOUNT_PROFILE' for `production`); none carries key material.
 */
export function loadAttestationKeys(
  config: Pick<Config, 'profile' | 'keys'>,
  login: SigningKeys,
): AttestationKeys;

/** The public attestation keys a module build may accept, per profile. */
export function publishedAttestationKeys(): Readonly<Record<Profile, readonly PublicAttestationJwk[]>>;
```

Behaviour:

- `generateAttestationKey()`: `kid` = base64url(SHA-256(`{"crv":"Ed25519","kty":"OKP","x":"<x>"}`)).
  Two calls give different keys.
- `loadAttestationKeys`, `local-dev`: returns exactly one key, the same value on every call and
  whatever `config.keys.path` is; reads and writes no file. It equals (as a public key)
  `publishedAttestationKeys()['local-dev'][0]`.
- `loadAttestationKeys`, `hosted-dev` (`config.keys` is `{ kind: 'file', path, generateIfMissing: false }`):
  reads `join(dirname(path), ATTESTATION_KEY_FILE_NAME)`. Returns the file's keys in file order,
  each normalised to the `AttestationJwk` shape (`alg: 'Ed25519'`, `use: 'sig'` filled in). Refuses
  (ConfigError, setting `MR_ACCOUNT_KEY_FILE`), writing nothing, when the file: is absent; is not a
  regular file; is larger than 65,536 bytes; on POSIX grants group or others any access; is not
  JSON; is not an object with exactly `profile` and `keys`; names another profile; has an empty
  `keys`; holds an entry that is not an object with only `kty, crv, x, d, kid, alg, use`; an entry
  whose `kty`/`crv` is not `OKP`/`Ed25519` (a P-256 login key is refused here); `alg` present and
  not `Ed25519`; `use` present and not `sig`; a `kid` outside `^[A-Za-z0-9_-]{1,64}$`; `x` or `d`
  not 43 characters of unpadded base64url; a `d` that is not the private half of `x`; two entries
  sharing a `kid`; an entry whose `kid` equals a `kid` in `login`; an entry whose `x` or `kid` is the
  fixed `local-dev` key's. Every such refusal's message contains `ATTESTATION_KEY_FILE_NAME`, so the
  operator can tell it from a refusal of the login key file.
- `loadAttestationKeys`, `production` (`config.keys.kind === 'external'`): ConfigError, setting
  `MR_ACCOUNT_PROFILE`.
- The other direction of disjointness: `loadSigningKeys` already refuses anything that is not a
  P-256 key, so an attestation key file given as the login key file is refused (existing rule; a
  test proves it for an Ed25519 key).
- `publishedAttestationKeys()`: `{ 'local-dev': [<the fixed key's public half>], 'hosted-dev': [],
  'production': [] }`. No entry has a `d`. No `hosted-dev` or `production` entry has the `x` or the
  `kid` of a `local-dev` entry (true of two empty lists today; the test holds it when they fill).
- The generated file `attestation-public-keys.json` (package root): `JSON.parse` of it deep-equals
  `publishedAttestationKeys()`.

### `src/rateLimit.ts` (one addition to `RateLimiter`)

```ts
  /** Whole seconds until `take(key)` would record a hit: 0 when it would now, otherwise at least 1. */
  retryAfter(key: string): number;
```

With `limit` L and window W: 0 while `key` has fewer than L live hits; otherwise the time until its
oldest live hit turns W old, rounded up. After that many seconds pass, `take(key)` returns true.
`retryAfter` records nothing.

### `src/attest.ts` (new)

```ts
export const ATTEST_PATH = '/attest';
export const ATTESTATION_TTL_SECONDS = 300;
export const ATTESTATION_LIMIT = 20;
export const ATTESTATION_WINDOW_SECONDS = 3600;
export const MAX_WORLD_LENGTH = 512;
export const MAX_NONCE_LENGTH = 128;
export const MAX_ATTEST_BODY_BYTES = 1024;
/** Every claim of an attestation. */
export const ATTESTATION_CLAIMS = ['iss', 'sub', 'aud', 'nonce', 'mr_ent', 'iat', 'exp', 'jti'] as const;

/** The issuer name an attestation carries: `<issuer>/attest`. */
export function attestationIssuer(issuer: string): string;

export interface AttestRouteOptions {
  /** The login issuer, as tokens carry it (for example 'http://localhost:4455'). */
  readonly issuer: string;
  /** The login keys: a bearer token must verify under the public half of one of them. */
  readonly loginKeys: SigningKeys;
  /** The attestation keys: the first signs. */
  readonly attestationKeys: AttestationKeys;
  /** The account behind a subject, read for every attestation; undefined when there is none. */
  readonly account: (sub: string) => Promise<Account | undefined>; // Account from interactions/router.ts
  /** Receives every line the route logs. */
  readonly log: (line: string) => void;
  /** Whole epoch seconds; default `Math.floor(Date.now() / 1000)`. The only clock the route reads. */
  readonly now?: () => number;
}

/**
 * The handler of `POST /attest`. It returns true when it took the request (it will answer it),
 * and false, having touched nothing, when the request is not for the route.
 */
export function createAttestRoute(
  options: AttestRouteOptions,
): (req: IncomingMessage, res: ServerResponse) => boolean;
```

**Which requests it takes.** Exactly those whose request target is the string `/attest` and whose
`Host` header, lower-cased, is the issuer's host (`new URL(issuer).host`). `/attest?x=1`,
`/attest/`, `/ATTEST`, an absolute-form target and any other `Host` are not taken (returns false).
`Host: LOCALHOST:4455` is taken for the issuer `http://localhost:4455` (the provider's handler
lower-cases the same way).

**Every answer** of a taken request carries `content-type: application/json; charset=utf-8`
(except the 204), `cache-control: no-store`, `x-content-type-options: nosniff`,
`access-control-allow-origin: *` and `access-control-expose-headers: retry-after, www-authenticate`.
An error body is exactly `{"error":"<code>"}`. An answer sent before the body was read (405, 401,
the first 403, 415) and the 413 also carry `connection: close`.

| Request | Status | Body / headers |
|---|---|---|
| `OPTIONS` | 204 | no body; `access-control-allow-methods: POST`, `access-control-allow-headers: authorization, content-type`, `access-control-max-age: 600` |
| any method but `POST`, `OPTIONS` | 405 | `method_not_allowed`; `allow: POST, OPTIONS` |
| no `Authorization` header, or not `Bearer <compact JWT>` (scheme case-insensitive, one space) | 401 | `invalid_token`; `www-authenticate: Bearer` |
| token not signed by a login key with ES256 (another key, `alg` `none`/`HS256`/`Ed25519`, an attestation, a changed payload) | 401 | `invalid_token`; `www-authenticate: Bearer` |
| token's `iss` is not the issuer | 401 | same |
| token's `exp` absent, not a number, or `exp <= now()` (the injected clock, never the system's) | 401 | same |
| token's `sub` not a string of 1 to 255 characters of `0x21`–`0x7E`, or `aud` not a string | 401 | same |
| token's `mr_ent` absent, not an array, or without `base-game` | 403 | `not_entitled` |
| `Content-Type` absent, or its media type (the part before any `;`, trimmed, lower-cased) not `application/json`; parameters are ignored | 415 | `invalid_request` |
| body over 1024 bytes, counted as raw bytes as they arrive (a `Content-Length` over 1024 is refused before any is read) | 413 | `invalid_request` |
| body not JSON; not an object with exactly the members `world` and `nonce`; either not a string; `world` not 1 to 512, or `nonce` not 1 to 128, characters of `0x21`–`0x7E` | 400 | `invalid_request` |
| the account already has 20 live hits | 429 | `rate_limited`; `retry-after: <whole seconds, at least 1>` |
| `account(sub)` resolves undefined or `entitled: false` | 403 | `not_entitled` |
| `account(sub)` rejects or throws (with anything, an `Error` or not), or signing fails | 500 | `server_error` |
| otherwise | 200 | `{"attestation":"<compact JWT>"}` |

The rows are in checking order: a request that fails two rows gets the earlier row's answer (an
expired token with a bad body is 401; a token without `mr_ent` and a bad body is 403). No refusal
carries an attestation, and a refusal before the limit row takes no hit. The body is parsed as
UTF-8 JSON; member checks are on the parsed object's own keys (`{"world":"w","nonce":"n","__proto__":{}}`
and a body with a third member such as `constructor` are 400).

**It never throws.** The returned function never throws and no promise it starts rejects: after an
`account` that rejects with a non-`Error`, or a request destroyed mid-body, the next request is
answered normally.

**The limit.** One hit is taken per request that reaches the limit row with room. A request
answered 403 by the account row keeps its hit; one answered 500 gives it back. Hits are keyed by
`sub`. A hit is live for 3600 seconds from `now()` at the time it was taken (the limiter reads the
same `now`). `retry-after` is the limiter's `retryAfter(sub)`.

**The attestation.** A compact JWS. Protected header: exactly `{ alg: 'Ed25519', kid }`, `kid` that
of `attestationKeys.keys[0]`. Payload: exactly the eight claims of `ATTESTATION_CLAIMS`:
`iss` = `attestationIssuer(issuer)`; `sub` = the token's `sub`, byte for byte (the same string is
given to `account`); `aud` = the body's `world`, a
string, byte for byte; `nonce` = the body's `nonce`; `mr_ent` = `['base-game']`; `iat` = `now()`;
`exp` = `iat + 300`; `jti` = a fresh random id, different for every attestation. The signature
verifies under the public half of `attestationKeys.keys[0]` and under no login key.

**The log.** For a 200: exactly one call of `log`, a single line that contains the `sub` and the
ISO-8601 time of `now()` (`new Date(now() * 1000).toISOString()`). For a 500: exactly one line with
the `sub`. For every other answer: no call. No line ever contains the `world`, the `nonce`, the
bearer token or the attestation. The route writes to nothing but `log`.

### `src/server.ts`

`startServer` loads the attestation keys after the login keys (a refused attestation key file
rejects with its `ConfigError` before anything listens or is written), and serves the route in
front of the provider's handler with `account` the profile's sign-in step's `account` (the one
step instance the provider is given) and `log` `startServer`'s own `log` argument. A profile with
no sign-in step serves no route (none starts in this build). The start line is unchanged (still
exactly one line at start).

- `local-dev` needs no attestation key file: a start on an empty data directory serves the route,
  signing with the fixed key, and writes no attestation key file.
- `hosted-dev` needs `attestation-keys.json` beside the login key file; without it `startServer`
  rejects with a `ConfigError` (setting `MR_ACCOUNT_KEY_FILE`) and writes nothing.
- `POST /attest` under another `Host` gets the provider handler's 421.
- End to end on `local-dev`: an ID token from a real sign-in (client and account made by the admin
  command, as the existing last test of `server.test.ts` does) posted to `/attest` gets an
  attestation that verifies under `publishedAttestationKeys()['local-dev']`.

### `docs/DECISIONS.md` (allowed at the decision bar; amended in place)

"Ownership is enforced unless a dev feature switches it off" gains what the `local-dev`
attestation key is worth: it is fixed and public, so a build that embeds it accepts a forged
binding. It constrains lpw-15 and acs-6 (which key lists a build embeds) and is not evident from
the module's code.

### Out of scope, recorded

- R-acs-2-JOSE-UNDECLARED stays open (the manifest is not grantable); a note carries the two-line fix.
- R-acs-2-NO-PER-ADDRESS-LIMIT: a limit per address needs the trusted-proxy rule (`config.ts`,
  `provider.ts`), outside this slice's files. The route's own limit is per account.
- R-acs-1-TOKEN-IDS-AT-REST was fixed by acs-2 (its note n2).
- No deadline of the route's own on a slow body: Node's request timeout bounds it, as it does the
  sign-in form's. A caller needs a valid token to make the route read a body at all.
- The limit lives in one process, as the service's other limits do.

## Tests (tester; gate id is the last token of the title)

| Gate | Files | What proves it |
|---|---|---|
| acs-3.1 | `src/attest.test.ts`, `src/keys.test.ts`, `src/server.test.ts` | the 200 answer; header and the eight claims exactly; signature under the attestation key; `aud`/`nonce` byte for byte; fresh `jti`; `iat`/`exp`; the fixed local-dev key and the published file; end to end with a real ID token |
| acs-3.2 | `src/attest.test.ts` | every refusal row before the limit, each alone, each with no attestation and no hit taken |
| acs-3.3 | `src/attest.test.ts`, `src/rateLimit.test.ts` | 20 pass, the 21st is 429 with `retry-after`, the window's end readmits; per account; `retryAfter` |
| acs-3.4 | `src/attest.test.ts`, `src/keys.test.ts` | an attestation does not verify under the login key set; a login token does not verify under the attestation keys; an attestation as bearer is 401; key files of the other type are refused; a shared `kid` is refused |
| acs-3.5 | `src/attest.test.ts`, `src/server.test.ts` | every line logged across the success, each refusal and the failures holds neither the world nor the nonce |

## Ledger CHECK shape

As acs-2: run the gate's whole files through `npm --prefix account-service test -- <files>
--reporter=json`, then require success, no failed, pending or todo tests, every file passed, and at
least one passed test whose full name ends with the gate id.

## Order of work

1. Plan review (reviewer, red-team), fold findings; checkpoint.
2. Tester writes the red tests; orchestrator proves each gate red; widen for
   `attestation-public-keys.json` on its red test; checkpoint.
3. Implement `rateLimit.ts`, `keys.ts`, `attest.ts`, `server.ts`, the generated file; targeted loop.
4. Docs. Lens batch (reviewer, red-team with written cheats, verifier). Full `just ci`. PR.

## plan-delta

- jose is used by `attest.ts` and stays undeclared: `mr-touches` refuses the manifest
  (R-acs-2-JOSE-UNDECLARED stays open, note filed).
- The contract's "published as a file" is the generated `account-service/attestation-public-keys.json`,
  outside the spec's `touches:` (widened on its red test).
- The route is composed in `server.ts`, not inside `provider.ts`'s handler as acs-2's note n3
  suggested: `provider.ts` is outside `touches:`, and the route falls through to that handler for
  any request it does not take, so the handler's `Host` refusal still applies.

## Plan review (folded)

Reviewer: B1 the fixed `local-dev` key against "still enforces" (kept, recorded in DECISIONS.md,
the doc and notes; the per-machine alternative needs a build input the merged fork (e) design does
not have); S1 `kid` required; S2 one sign-in step instance, no route without one; S3 exposed
headers; S4 the 415 and 413 rules; S5 refusals name the attestation key file; S6 whole seconds and
one clock; S7 notes for acs-4 and acs-5; the `node src/keys.ts` printer cut. Red-team: HIGH-1 a
key file holding the `local-dev` key is refused, and the published lists never share it; MED-1
`exp` required; MED-2 one clock; MED-3 the stolen-token window documented and filed; LOW-1 never
throws; LOW-2 `connection: close` on early answers; LOW-3 one process. Not taken: a `typ` header
(the key type and issuer name already separate the two tokens); a body deadline.

## Lens batch (folded)

Reviewer (no blocker): S1 the DECISIONS.md amendment and the doc named a dev build "given only the
`hosted-dev` keys", which no feature set produces: reworded as the open constraint it is, and filed
as a follow-up; N1 a failed success log was reported as a signing failure (the step is named
`log`); N3 and N5 doc wording; N4 the doc gives the command that makes a `hosted-dev` key; N2
(`giveBack` takes back the newest hit) left as documented. Red-team (79 wrong implementations, 7
survived, no exploit): LOW-1 a `sub` with a line feed would reach a log line unescaped, and only
the issuer mints a `sub`, so the route refuses a `sub` that is not 1 to 255 characters of visible
ASCII (contract row above; tests from the tester); survivors X20 (`sub` case-folded) and 15a
(attestation keys loaded after the data directory is made) get a test each; survivors 7, 10a, 15c,
X24, X25 are equivalent or unreachable and get none. LOW-2 (a signature's twin verifies) changes
nothing without a replay set; LOW-3 (a held connection) is the body deadline already recorded.
