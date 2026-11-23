# acs-2 — tester brief

You write the gating tests for slice `acs-2` of Monster Realm. You do not implement the feature and
you do not write configuration. Everything you write goes under the slice worktree:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/acs-2`

(called `WT` below; paths in this brief are relative to `WT/account-service/` unless they start
with `/`). The package exists (acs-1 is merged): `src/config.ts`, `src/keys.ts`, `src/provider.ts`,
`src/server.ts`, `src/store/sqliteAdapter.ts`, each with a test file beside it, and `node_modules`
installed (`oidc-provider` 9.15.1, `vitest` 4, TypeScript 7). **None of the acs-2 modules exists
yet** (`src/claims.ts`, `src/rateLimit.ts`, `src/interactions/*.ts`, `src/admin/cli.ts`), and
`provider.ts` has none of the new behaviour, so every new test file fails at import and every
appended test fails on behaviour until the implementer lands them. That is the expected red state.
You have no shell: I run everything and report back. Write code that typechecks under the package's
`tsconfig.json` (strict, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`,
`verbatimModuleSyntax`: use `import type` for types) and is clean under biome (single quotes,
semicolons, 100 columns, 2 spaces).

## Doctrine (binding)

`/home/mdrewt/.claude/harness/standards/testing-tdd.md`. The parts that bind here:

- A test executes code. It never reads hand-written source, config, recipes or docs as text, never
  checks another check, never pins prose: do not assert the wording of a page or an error message.
  Assert structure (status, headers, form fields, which element is present), equality or
  inequality between two outputs, and the absence of a value that must not appear. A SQLite
  database file the product wrote is program output: reading its rows or bytes is fine.
- Deterministic: injected clocks or vitest's fake `Date`, no sleeping for a result, no fixed ports,
  no dependence on test order. Temp files go under `mkdtempSync(join(tmpdir(), 'acs2-'))` and are
  removed in `afterEach`/`afterAll` (as `src/server.test.ts` does).
- Test names lead with the behaviour they prove. **A gate id is the last token of the title of
  each test that carries a gate**, written exactly ` acs-2.N` (for example
  `test('a second exchange of the code is refused and ends the chain acs-2.1', …)`): the acceptance
  ledger selects passed tests whose full name ends with that token. Every gate needs at least one
  such test in each file the table below lists for it. Tests that carry no gate get no id.
- Tests earn their place by protecting something: account security, token correctness, the
  entitlement rule, data at rest, the sign-in flow. Do not test log lines or trivia.

## The criteria (verbatim from the spec)

- **acs-2.1:** WHEN an entitled dev account signs in with the right password, THE SYSTEM SHALL return an authorization code exchangeable once, within 60 seconds, with the matching PKCE verifier, for an ID token whose claims are exactly those `claims.ts` names, and a refresh token.
- **acs-2.2:** WHEN a dev account created without entitlement signs in, THE SYSTEM SHALL show the not-owned page and issue no code.
- **acs-2.3:** WHEN a wrong password is given five times for one account within ten minutes, THE SYSTEM SHALL refuse that account's attempts until the ten minutes pass, and no answer SHALL say whether the account exists.
- **acs-2.4:** WHEN a refresh token is used, THE SYSTEM SHALL issue a new one and invalidate it, and WHEN an invalidated one is presented, THE SYSTEM SHALL revoke every token of that chain.
- **acs-2.5:** WHEN a refresh finds the account's entitlement removed, THE SYSTEM SHALL refuse it and revoke the chain.
- **acs-2.6:** WHEN the admin command creates or resets an account, THE SYSTEM SHALL store only the argon2id hash, and the command SHALL refuse to run against the `production` profile.
- **acs-2.7:** WHEN a token from this flow is checked with the key set from acs-1.1, THE SYSTEM SHALL verify it, and a token whose `exp` has passed SHALL not verify.

## Contracts

The names, signatures, data shapes and behaviours are fixed in the plan's **"Contracts"** section:

`/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-acs-2-plan.md`

Read that section in full (and "What is measured" above it, which says how the library behaves).
Call exactly those exports. Relative imports carry the `.ts` suffix. Where the contract gives a
status, header, field name, count or constant, assert it; where it is silent, do not invent a
requirement: report the gap under Findings. Spec values (60 seconds, one hour, 30 days, five
failures, ten minutes) are asserted as literals from the criteria; this service's own numbers
(`MAX_PENDING_SIGN_INS`, `MAX_CONCURRENT_HASHES`, the 8192-byte limit) are imported or taken from
the contract.

## Files and gates

| File | Gate ids it must carry | What it covers |
|---|---|---|
| `src/claims.test.ts` | acs-2.1 | claim names; `mr_ent` only when entitled; `devSubject` |
| `src/rateLimit.test.ts` | acs-2.3 | window edges, `take`/`giveBack`, `size` and forgetting, odd keys, bad options |
| `src/interactions/devPassword.test.ts` | acs-2.3, acs-2.6 | accounts, the hash format, `attempt` (each numbered step), lock timing with an injected limiter clock, unknown email identical to a wrong password, one `verifyPassword` call per attempt, `busy`, parallel attempts |
| `src/interactions/pages.test.ts` | acs-2.2 | `PAGE_HEADERS`, the three pages, escaping of `action`, nothing but fixed text |
| `src/admin/cli.test.ts` | acs-2.6 | `runAdmin` in process; one spawned run of the entry point; production refused with nothing written |
| `src/interactions/router.test.ts` | acs-2.2, acs-2.3 | `/interaction/<uid>` over HTTP with a stub `PasswordStep`: each outcome, the refusal order, cookies, cookie keys per instance |
| `src/interactions/flow.integration.test.ts` | acs-2.1, acs-2.2, acs-2.4, acs-2.5, acs-2.7 | the whole flow over HTTP with the SQLite store and the real password step |
| `src/provider.test.ts` (append only) | none | `registerClient` rules; discovery with a sign-in step; without `signIn` the service is as before |
| `src/server.test.ts` (append only) | none | a `local-dev` server completes a sign-in |

In the two existing files, append new `describe` blocks at the end and add imports at the top;
never change or delete an existing test.

## How to drive things

- **HTTP.** `createAccountProvider({ issuer, keys: { keys: [generateSigningKey()] }, adapter, signIn })`
  returns `{ provider, handler }`; serve `handler` with `http.createServer` on port 0. Every
  request must carry the issuer's `Host` (`localhost:4455` for `http://localhost:4455`) or it gets
  421, and `fetch` cannot set `Host`: use `node:http`'s `request` as the `send` helper at the top of
  `src/provider.test.ts` does (copy the helper into your file; there is no shared test-util module).
  Nothing redirects for you: follow each `Location` by hand, and keep a small cookie jar that
  stores each `Set-Cookie` with its `Path` and sends a cookie only to a path it covers (the
  interaction cookies are scoped to `/interaction/<uid>` and `/auth/<uid>`).
- **The flow.** Register a client (`registerClient(store.adapter, { clientId: 'monster-realm', redirectUri: 'http://localhost:5290/' })`),
  make an account (`devAccounts(store.adapter).create(email, { entitled: true })` returns the
  generated password), then: `GET /auth?response_type=code&client_id=…&redirect_uri=…&scope=openid&state=…&code_challenge=<base64url(sha256(verifier))>&code_challenge_method=S256`
  → 303 `/interaction/<uid>` → `GET` it (the form) → `POST` it with `email`, `password`
  (`content-type: application/x-www-form-urlencoded`, `origin: http://localhost:4455`) → 303
  `<issuer>/auth/<uid>` → `GET` that → 303 to the redirect address with `code`, `state`, `iss` →
  `POST /token` with `grant_type=authorization_code`, `code`, `code_verifier`, `client_id`,
  `redirect_uri` → JSON. Refresh: `POST /token` with `grant_type=refresh_token`, `refresh_token`,
  `client_id`.
- **The store.** `openAccountStore(path)` from `src/store/sqliteAdapter.ts` (`':memory:'` or a file
  under your temp directory); its `adapter` is what `createAccountProvider`, `registerClient`,
  `devAccounts` and `devPasswordStep` take. To look at what is stored, open the same file with
  `new DatabaseSync(path, { readOnly: true })` from `node:sqlite` (table `oidc_record`, columns
  `model`, `id`, `payload`, `expires_at`, `consumed_at`, `grant_id`, `uid`), or read the file's
  bytes.
- **Time.** The provider and the store's default clock both read `Date.now()`. Use
  `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(…)` (restore with
  `vi.useRealTimers()` in `afterEach`); only `Date` is faked, so sockets and promises run normally.
  `createRateLimiter` and `devPasswordStep`'s `failures` take an injected `now` for the unit tests.
- **acs-2.7.** Verify with `jose` (installed as `oidc-provider`'s dependency; the package does not
  list it and must not, so import it as `import { createLocalJWKSet, jwtVerify } from 'jose';`):
  build the key set from the JSON `/jwks` serves, call `jwtVerify(idToken, keySet, { issuer, audience, currentDate })`.
  Also cover: a token with one payload byte changed does not verify; the header's `kid` is the
  first signing key's.
- **acs-2.6.** Prove the stored value is an argon2id hash of the generated password by recomputing
  it: parse the PHC string, call `crypto.argon2Sync('argon2id', { message: Buffer.from(password), nonce: salt, parallelism, tagLength: 32, memory, passes })`
  and compare with the stored tag. Prove nothing else is stored: no row and no byte of the
  database file holds the password.
- **The admin command.** `runAdmin(argv, env, io)` with `env = { MR_ACCOUNT_PROFILE: 'local-dev', MR_ACCOUNT_DATA_DIR: <absolute temp dir> }`
  and an `io` that collects lines. Production: `{ MR_ACCOUNT_PROFILE: 'production', MR_ACCOUNT_ISSUER: 'https://accounts.example.com', MR_ACCOUNT_DATA_DIR: <a temp path that does not exist> }`,
  and also with only the profile set. For the spawned run, see how `src/server.test.ts` finds the
  package directory and spawns `process.execPath`; run `node src/admin/cli.ts …` with `cwd` the
  package directory and assert the exit code, stdout and stderr. A password made by `create-account`
  must sign in through `devPasswordStep` on the same database.
- **A stub step** for the router tests is an object `{ kind: 'password', attempt, account }` whose
  `attempt` returns a scripted `SignInOutcome` and records its calls. `account` must answer for the
  subject a `signed-in` outcome names (the provider asks it when the sign-in resumes).

## Behaviours I most want pinned (beyond one happy path per criterion)

These are where a wrong implementation would hurt and still look fine:

1. A code is exchangeable once; the second exchange ends the chain (the refresh token from the
   first exchange stops working; no record of the grant remains). Not exchangeable at 60 s; a wrong
   verifier is refused; no `code_challenge` or `plain` starts no sign-in.
2. The ID token's payload members are exactly `ID_TOKEN_CLAIMS` for the game client's request (no
   `nonce`, no `max_age`), with the right values; with `nonce` in the request the token adds only
   `nonce`.
3. An account without entitlement: 403 not-owned page, no grant row, no code by any continuation;
   the page is byte-identical for two different such accounts and holds neither email nor subject.
4. Lockout: the fifth wrong attempt is still answered `refused`, the sixth `locked`, the right
   password while locked `locked`, and one second after ten minutes from the first failure an
   attempt is evaluated again. An email with no account goes through exactly the same sequence of
   answers (compare the two sequences whole), and over HTTP the pages for the two are
   byte-identical. A right password does not use up a slot: after four wrong attempts and then a
   right one, a fifth wrong attempt is still answered `refused`, and only the one after it `locked`.
5. Refresh: new token differs; the old one is refused and takes the newest with it; a rotated
   token keeps the first one's expiry (refresh works 60 s before 30 days, the newest fails 1 s after).
6. Entitlement cleared → refresh refused, the grant's records gone, and with the flag back on the
   chain stays dead. Same at a code exchange. A stub step whose `account` rejects → 5xx and nothing
   revoked.
7. At rest: after a sign-in and a refresh, neither the code, nor any access token, nor any refresh
   token appears in any row or in the database file's bytes.
8. No session reuse: after a completed sign-in, `GET /auth` with every cookie the browser now holds
   still answers 303 to a sign-in step and issues no code.
9. Cookies: another provider instance over the same store refuses the first one's interaction
   cookies; a changed cookie value or signature is refused; forged cookies write nothing.
10. The cap, through `maxPendingSignIns` (use a small number): the request after the cap gets 503
    and stores nothing; `/token`, `/jwks`, `/interaction/<uid>` and the resume still answer; after
    `SIGN_IN_TTL_SECONDS` the next `/auth` is let through.
11. `POST /interaction/<uid>`: each refusal in the contract's order (send a request that fails two
    checks and assert the earlier one answers), none calling the step; a second POST after
    `signed-in` gets the same 303 with no second call and no second grant.
12. CORS at the token endpoint: the client's origin is allowed, another origin is not.
13. The admin command: exit codes and `name=value` lines; `create-account` twice → exit 1, the
    first account unchanged; production → exit 1 naming `MR_ACCOUNT_PROFILE`, and the data directory
    still does not exist; the password only on `out`.

## What to hand back

1. The test files, written in place.
2. **Findings**, apart from the tests, in two lists: **defects** (the contract is wrong, contradicts
   itself or the spec, or cannot be tested as written) and **questions** (something you had to
   guess). Do not paper over either in a test.
3. For each gate id, the titles of the tests that carry it.
