# acs-3 — tester brief

You write the gating tests for slice `acs-3` of Monster Realm: the account service's attestation
route, `POST /attest`. You do not implement the feature and you do not write configuration.
Everything you write goes under the slice worktree:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/acs-3`

(`WT` below; paths in this brief are relative to `WT/account-service/` unless they start with `/`).
The package exists (acs-1 and acs-2 are merged) with `node_modules` installed (`oidc-provider`
9.15.1, `jose` 6.2.18, `vitest` 4, TypeScript 7, Node 24.22.3). **`src/attest.ts` does not exist,
and `src/keys.ts`, `src/rateLimit.ts` and `src/server.ts` have none of the new behaviour**, so the
new test file fails at import and every appended test fails on behaviour until the implementer
lands it. That is the expected red state. You have no shell: I run everything and report back.
Write code that typechecks under the package's `tsconfig.json` (strict, `noUnusedLocals`,
`noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`: use `import type` for types;
relative imports carry `.ts`) and is clean under biome (single quotes, semicolons, 100 columns, 2
spaces; in test files a non-null `!` is allowed).

## Doctrine (binding)

`/home/mdrewt/.claude/harness/standards/testing-tdd.md`. The parts that bind here:

- A test executes code. It never reads hand-written source, config, recipes or docs as text, never
  checks another check, never pins prose: do not assert the wording of an error message or a log
  line. Assert structure (status, headers, JSON members, claims), equality or inequality between
  two outputs, and the absence of a value that must not appear. The one file you read is the
  generated artifact `attestation-public-keys.json` (regenerate from the code and compare).
- Deterministic: the route's injected `now`, no sleeping for a result, no fixed ports (listen on
  port 0), no dependence on test order. Temp files go under `mkdtempSync(join(tmpdir(), 'acs3-'))`
  and are removed in `afterEach` (as `src/server.test.ts` and `src/keys.test.ts` do).
- Test names lead with the behaviour they prove. **A gate id is the last token of the title of
  each test that carries a gate**, written exactly ` acs-3.N` (for example
  `test('an expired token is refused with no attestation acs-3.2', …)`): the acceptance ledger
  selects passed tests whose full name ends with that token. Every gate needs at least one such
  test in each file the table below lists for it. Tests that carry no gate get no id.
- Tests earn their place by protecting something: who gets an attestation, what it says, the key
  that signs it, the limit, what reaches a log. No trivia.
- Write assertions that a wrong implementation fails, not only a missing one. For each rule ask
  what the cheapest wrong implementation is (a limiter keyed on nothing, a hit taken on every
  request, `exp` checked against the system clock, `aud` copied from the token instead of the
  body, the login key used to sign, a log line that prints the body) and make sure a test of yours
  fails on it. One assertion per behaviour beats one long test whose first `expect` hides the rest.

## The criteria (verbatim from the spec)

- **acs-3.1:** WHEN an entitled account's valid token asks for an attestation, THE SYSTEM SHALL return one signed by the attestation key whose claims are exactly those in the contract.
- **acs-3.2:** WHEN the bearer token is missing, expired, from another issuer, or lacks `mr_ent`, THE SYSTEM SHALL refuse with no attestation.
- **acs-3.3:** WHEN an account exceeds 20 attestations in an hour, THE SYSTEM SHALL refuse further ones until the window passes.
- **acs-3.4:** WHEN an attestation is checked against the login key set, THE SYSTEM SHALL not verify it, and a login token checked against the attestation keys SHALL not verify (the keys are disjoint).
- **acs-3.5:** WHEN any request to the route is logged, THE SYSTEM SHALL log no world identifier and no nonce.

Spec contract (verbatim): "`POST /attest` takes a bearer ID token from this issuer and `{world,
nonce}` (the world's identifier as M-local-play lpw-8 (c) defines it, and the nonce that world
issued). It returns a compact JWT signed with the attestation key (its own `kid`, its own issuer
name `<issuer>/attest`, never the login key): `sub` the account, `aud` the world, `nonce`,
`mr_ent`, `iat`, `exp` five minutes, `jti`. The route logs the account and the time, never the
world. The public attestation keys of each profile are published as a file the module embeds as
data (lpw-15); a dev build embeds the dev profiles' keys, a release build the production keys."

## Contracts

The names, signatures, data shapes, status codes and orderings are fixed in the plan's
**"Contracts"** section:

`/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-acs-3-plan.md`

Read that section in full, and "Design" above it (why each rule exists). Call exactly those
exports. Where the contract gives a status, header, member name, count or constant, assert it;
where it is silent, do not invent a requirement: report the gap under Findings. Spec values (20 an
hour, five minutes, `<issuer>/attest`, `base-game`) are asserted as literals from the criteria and
the contract, and also against the exported constants where one exists.

## Files and gates

| File                    | New or existing                     | Gates it must carry                         | What goes there                                         |
| ----------------------- | ----------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `src/attest.test.ts`    | new                                 | acs-3.1, acs-3.2, acs-3.3, acs-3.4, acs-3.5 | the route over real HTTP with fake dependencies         |
| `src/keys.test.ts`      | existing, append                    | acs-3.1, acs-3.4                            | attestation keys: generate, load, publish, disjointness |
| `src/rateLimit.test.ts` | existing, append                    | acs-3.3                                     | `retryAfter`                                            |
| `src/server.test.ts`    | existing, append and one setup edit | acs-3.1, acs-3.5                            | the route served by `startServer`, end to end           |

Read each existing test file before you append: reuse its helpers and its style, add `describe`
blocks at the end, and leave existing tests as they are except for the one setup edit named below.

### `src/attest.test.ts`

Drive `createAttestRoute` through a real `http.createServer` on port 0 whose handler is
`(req, res) => { if (!route(req, res)) fallback(req, res); }`, where your `fallback` answers a
status no route row uses (for example 418) and records that it ran. Send requests with
`node:http`'s `request` to `127.0.0.1:<port>` and an explicit `Host` header (see `send` in
`src/interactions/flow.integration.test.ts` for the shape). Dependencies are fakes you control:
`loginKeys` from `generateSigningKey()`, `attestationKeys` from `generateAttestationKey()`,
`account` a function over a `Map` you mutate, `log` pushing into an array, `now` reading a variable
you advance.

Make bearer tokens yourself, two ways:

- ordinary ones with `jose`'s `SignJWT` and the login key (the private JWK is in your hands);
- hostile ones by hand (base64url header, base64url payload, signature from `node:crypto`), which
  lets you write any header and any payload: `alg: 'none'` with an empty signature, `HS256` keyed
  with the public key, a valid signature over a payload with no `exp`, with `exp` as a string,
  with an array `aud`, with an empty `sub`, with the right claims under another key, with the
  right key and another `iss`, an Ed25519-signed token, a payload changed after signing.

Check attestations independently of the code under test: `jose`'s `jwtVerify` with a key set built
from **public** halves only (`createLocalJWKSet`), and for at least one test `node:crypto`'s own
`verify(null, signingInput, publicKey, signature)` on the raw segments, so a signature that only
this library accepts cannot pass.

Cover, each as its own test (group with `describe`; use `test.each` for the refusal table):

- **acs-3.1.** The 200 answer and its headers; the protected header is exactly `{ alg, kid }` with
  the first attestation key's `kid`; the payload's keys are exactly the eight claims; each claim's
  value (`iss`, `sub`, `aud` equal to the body's `world` byte for byte including a `world` at the
  512 bound and one using the punctuation of both name forms, `nonce`, `mr_ent`, `iat` equal to the
  injected clock, `exp - iat === 300`); `jti` differs between two attestations; with two
  attestation keys the first signs; the token's own `aud` (the client id) does not leak into the
  attestation; `mr_ent` comes out as exactly `['base-game']` even when the token's array holds more.
- **acs-3.2.** Every refusal row of the contract table from the method row down to the body rows,
  each alone, each asserting the status, the error code, the headers the row names, that the body
  holds no `attestation` member, and that it took no hit (after the refusals, 20 good requests
  still pass). Include: no `Authorization`; `Basic`; `Bearer` with nothing; a token of two
  segments; every hostile token above; `exp` equal to `now` (refused) and `now + 1` (accepted); a
  token that was valid, then the clock passes its `exp`; a token signed by a login key that is not
  in `loginKeys`; a token from a second key that **is** in `loginKeys` (accepted: both published
  keys verify); `mr_ent` absent, a string, an empty array, an array without `base-game`; the
  account gone and the account not entitled (403 `not_entitled`); the order rule (an expired token
  with a bad body is 401, a token without `mr_ent` with a bad body is 403); the body rows (wrong
  and absent content type, `application/json; charset=utf-8` accepted, `APPLICATION/JSON`
  accepted, 1025 bytes, a declared `Content-Length` over the cap, not JSON, an array, `null`, a
  missing member, a third member, `__proto__` and `constructor` as extra members, non-string
  members, empty strings, 513 and 129 characters, a space, a control character, a non-ASCII
  character); which requests are taken (`/attest?x=1`, `/attest/`, `/ATTEST`, another `Host` reach
  your fallback; `Host: LOCALHOST:4455` is taken); `OPTIONS` (204 and its headers, with and without
  a token); `GET`, `PUT`, `DELETE` (405 with `allow`).
- **acs-3.3.** 20 pass and the 21st is 429 with `rate_limited` and a `retry-after` equal to the
  seconds until the first hit turns an hour old; one second before that it is still 429; at the
  hour the next passes; the limit is per account (a second `sub` is untouched by the first's 20);
  a 429 holds no attestation; a request refused by the account row keeps its hit (20 such, then
  the account becomes entitled: 429); a request that ended in 500 gives its hit back (25 such, then
  20 pass); hits are not shared between two routes made by two `createAttestRoute` calls only if
  the contract says so (it does not: do not test it).
- **acs-3.4.** An attestation does not verify under the login key set (jose rejects); a login
  token does not verify under the attestation key set; an attestation sent as the bearer token is
  401; a token signed by the attestation private key with `alg: 'ES256'` written in its header is
  401.
- **acs-3.5.** Use a `world` and a `nonce` that could not occur by chance (long distinctive
  markers). After one success, each kind of refusal, a 429 and both 500 paths, with those markers
  in every request: no logged line contains either marker, the bearer token or the attestation;
  the success logged exactly one line, containing the `sub` and the ISO time of the injected clock;
  each 500 logged exactly one line containing the `sub`; every other answer logged none. Also spy
  on `console.log`, `console.error`, `console.warn`, `process.stdout.write` and
  `process.stderr.write` for the whole of that test: the route calls none of them.
- **Never throws** (no gate id): an `account` that rejects with a non-`Error` (a string, `undefined`)
  and one that throws synchronously both answer 500 and the next request is answered 200; a
  request destroyed after its headers and half its body leaves the server answering the next one.
  Register an `unhandledRejection` listener for the test and assert it never fired.

### `src/keys.test.ts` (append)

- **acs-3.1.** `generateAttestationKey()`: the shape, `kid` equal to the RFC 7638 thumbprint you
  compute yourself, two calls differ, Node loads it as an Ed25519 private key whose public half is
  `x`. `publicAttestationKey`: exactly the six members, no `d`. `loadAttestationKeys` on
  `local-dev`: one key, equal across calls and across different `config.keys.path` values
  (including a path in a directory that does not exist), nothing written; its public half is
  `publishedAttestationKeys()['local-dev'][0]`; a signature made with it verifies under that
  published entry. `publishedAttestationKeys()`: the three profiles, no entry with `d`, no
  `hosted-dev` or `production` entry sharing `x` or `kid` with a `local-dev` entry. The generated
  file: `JSON.parse(readFileSync(<package root>/attestation-public-keys.json))` deep-equals
  `publishedAttestationKeys()`. `loadAttestationKeys` on `hosted-dev`: a good file loads in file
  order with `alg`/`use` filled in; a key file with two keys keeps both; `production` refuses with
  `setting === 'MR_ACCOUNT_PROFILE'`.
- **acs-3.4.** Each refusal the contract lists for the `hosted-dev` attestation key file, each
  alone (`test.each`), asserting a `ConfigError` with `setting === 'MR_ACCOUNT_KEY_FILE'`, a
  message that contains `ATTESTATION_KEY_FILE_NAME` and does not contain the file's `d` value, and
  that nothing was written beside it. Among them: a P-256 login key in the attestation key file;
  a `kid` shared with a login key; the fixed `local-dev` key copied into a `hosted-dev` file (by
  `x`, and by `kid` with another key's material); a `d` from another key. And the other direction:
  `loadSigningKeys` refuses a login key file that holds an Ed25519 attestation key.
  (Follow how the existing tests in this file build key files, modes and configs.)

### `src/rateLimit.test.ts` (append)

- **acs-3.3.** `retryAfter`: 0 for an unknown key and below the limit; at the limit, the seconds
  until the oldest live hit dies, with the injected clock moving (and rounded up for a fractional
  clock); after that many seconds `take` returns true; it records nothing (calling it many times
  changes neither `take`'s answer nor `size`); after `giveBack` it is 0 again; keys are independent.

### `src/server.test.ts` (append, plus one setup edit)

- **The setup edit.** The existing test `hosted-dev starts on a key file the operator provided and
  serves the hosted issuer` starts `hosted-dev` on a login key file alone. Under this slice
  `hosted-dev` also needs `attestation-keys.json` beside it. Add that file to this test's setup
  (a `generateAttestationKey()` key, mode 0600) and change nothing else in it. If any other
  existing test starts `hosted-dev` successfully, give it the same setup and tell me which.
- **acs-3.1.** End to end on `local-dev`, reusing what the last existing `describe` does to make a
  client and an account with the admin command and complete a sign-in to an ID token: post that
  real ID token to `/attest` with a `world` and `nonce`; the answer is 200 and its attestation
  verifies under a key set built from `publishedAttestationKeys()['local-dev']`, with `iss`
  `http://localhost:4455/attest`, `sub` the ID token's `sub`, `aud` the world. It does not verify
  under the key set the server publishes at `/jwks`. A start on an empty `local-dev` data
  directory writes no attestation key file. `hosted-dev` without `attestation-keys.json` rejects
  with a `ConfigError` whose `setting` is `MR_ACCOUNT_KEY_FILE`, having written nothing new into
  the data directory and listening on nothing; with it, an attestation from that server verifies
  under that file's public half (mint the bearer the way the existing tests reach a signed-in
  state, or report under Findings if `hosted-dev` cannot be signed in to in a test). `POST /attest`
  under another `Host` is 421. After an account's entitlement is cleared with the admin command, a
  still-valid ID token gets 403 `not_entitled`.
- **acs-3.5.** With `startServer`'s `log` capturing: after the end-to-end success and a few
  refusals carrying distinctive `world`/`nonce` markers, no captured line contains a marker; the
  start line is still the only line before the first attestation; the success added exactly one
  line containing the `sub`.

## What to hand back

1. The files written or changed, with a count of tests per gate id per file.
2. **Findings**, apart from the tests, in two lists:
   - **Defects**: places where the contract is inconsistent, cannot be tested as written, or
     contradicts the spec or the existing code.
   - **Questions**: where the contract is silent and you chose not to invent a requirement.
3. Anything you could not write because it needs a shell (I can run probes for you).
