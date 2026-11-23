## What & why

Adds the dev sign-in to `account-service/` (spec `M-account-service.spec.md` §acs-2). On the two dev profiles a player signs in with an email and a password through authorization code with PKCE, and the game client gets an ES256 ID token (`iss`, `sub` `dev:<uuid>`, `aud`, `mr_ent`, `iat`, `exp` one hour later) and a refresh token that is spent on every use. Accounts and clients are made by an admin command; there is no sign-up.

- `src/claims.ts` names the ID token's claims and builds the two the account supplies; `mr_ent` is there only for an entitled account.
- `src/interactions/router.ts` answers `/interaction/<uid>`, the sign-in step, and is where a profile's sign-in method is chosen (`dev-password` now; `steam` has no step in this build).
- `src/interactions/devPassword.ts` holds dev accounts (argon2id hashes, Node's built-in `crypto.argon2`) and the password step; `src/interactions/pages.ts` renders the form, the not-owned page and the "sign-in ended" page.
- `src/rateLimit.ts` is a sliding-window limiter (acs-3 and acs-9 reuse it).
- `src/admin/cli.ts`: `create-account`, `reset-password`, `set-entitlement`, `set-client`. It refuses the `production` profile before it touches the disk.
- `src/provider.ts` wires it all; `src/server.ts` passes the profile's sign-in step (one call).
- `docs/account-service.md` describes the sign-in, tokens, clients, accounts, limits and the admin commands.

No new dependency: the lock file could not change during fan-out, and Node's own argon2id reproduces RFC 9106's test vector.

## What to read first

Choices the spec leaves open, and things measured against the library before they were built.

1. **No sign-in session.** Every authorization request runs the sign-in step, whatever cookie the browser holds: the handler passes the provider only the step's own four cookies. With the library's session passed through, a second request skipped the step, and a sign-in as another account hit the logout form acs-1 switched off. Phase 2's ownership check then runs at every authorization with no extra rule.
2. **Entitlement is read again at every exchange and refresh, and a refusal revokes the chain.** The library only refuses when `findAccount` returns nothing: with the flag restored the same refresh token worked again. `findAccount` now revokes the grant of the code or refresh token it was asked about. A step that fails to answer is an error and revokes nothing.
3. **A refresh chain ends 30 days after its sign-in**: a rotated token inherits what its predecessor had left. The spec says "refresh-30d-rotating"; sliding 30 days is one function away.
4. **Clients are stored records** written by `set-client`, not a list in code. The dev client's origin differs per e2e shard and per deployment, and `config.ts` (which refuses unknown settings) is outside `touches:`. Whatever a record holds, the provider sees a public client with that one redirect address.
5. **Codes, access tokens and refresh tokens are stored under SHA-256 digests** (R-acs-1-TOKEN-IDS-AT-REST, fixed here in `provider.ts`): a copy of the database holds nothing that can be presented.
6. **Limits beyond the criterion's five failures.** At most four password hashes run at once (hashing shares its threads with token signing; a fifth attempt is told the service is busy). At most 20,000 sign-ins can be started per ten minutes, a request target is at most 2048 characters, and a resumed sign-in keeps its first deadline, which together bound what anonymous callers can leave in the store at about 100 MB. The cap is a check inside the provider's own sign-in policy: the provider's router answers `HEAD`, any letter case and a trailing slash, and both artifact lenses measured all three walking past a path test.
7. **Passwords are generated** by the admin command and printed once; it takes none.

## Acceptance

Acceptance: 7/7 met, 0 deferred, 0 unmet — acs-2 seed:f37ac57c90a9e27c
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- account-service/src/server.ts — probe: server.ts builds the provider itself (createAccountProvider({issuer, keys, adapter}) inside startServer, no injection point), so a local-dev server never gets the sign-in step and /interaction/<uid> stays 404; the one call must pass signIn. server.test.ts carries the red test of that wiring.
- account-service/src/server.test.ts — probe: server.ts builds the provider itself (createAccountProvider({issuer, keys, adapter}) inside startServer, no injection point), so a local-dev server never gets the sign-in step and /interaction/<uid> stays 404; the one call must pass signIn. server.test.ts carries the red test of that wiring.

Ledger: `memory/projects/gates/acs-2.gates.md`. Each gate's CHECK runs the test files that carry it and passes only when every test in them passed, none is skipped, and at least one passed test's title ends with the gate id.

## Test-first evidence

- **Red:** the tester's tests at commit `e4f7a500`, before any acs-2 module existed: 7 new files failed at the import of the module they gate and 10 appended tests failed on behaviour, with all 332 existing tests passing (`gates/acs-2.red-proof.log`).
- **Wrong implementations** (`gates/acs-2.mutants.log`): 94 deliberate defects of mine, each applied alone with the whole suite run: 93 killed, 1 equivalent survivor (a grant that also names scopes the provider does not support). The red-team wrote 8 more and the verifier 19. Each survivor a lens rated a finding got a test from the tester and was re-run killed: a tag compared on its first byte, a hash-parameter ceiling never enforced, a password hashed only to its 72nd character, `Origin` compared by prefix, a `Referer` taken in place of `Origin`, a cookie allowlist matched by substring, clients served without a sign-in step, and ids stored under a reversible encoding instead of a digest (the verifier's first verdict was FAIL on that one; PASS on re-check). Its last survivor, a `Sec-Fetch-Site` shortcut it rated a note, is answered below.
- **Timing, measured by the red-team** (400 interleaved rounds): a wrong password for an entitled account, for an account that is not entitled, and for an email with no account have the same median (14.8 / 14.9 / 14.8 ms) and byte-identical answers.
- The two testers wrote and edited every test; the implementer changed none.

## Local gate

`just ci` green at `713c7467`: Rust 3417 + 1120 + 3089 tests, node doors 141 / 83 / 3, 15/15 evals, account-service typecheck and 12 files / 596 tests, client typecheck and 245 files / 6256 tests, verify-build OK, observability 9 checks, `check-secrets` clean. `gitleaks` in filesystem mode over `account-service/src` and `docs`: no leaks.

## plan-delta

- `server.ts` is outside `touches:` and had to pass the sign-in step: widened (above).
- Items 1 to 7 of "What to read first".
- Pushed authorization requests and `userinfo` are off and `openid` is the only scope: nothing uses them, and the first is a record any caller can make the store write.
- An ID token also carries `nonce` or `auth_time` when the request asks for them, as OpenID Connect requires; the game client asks for neither, and `claims.ts` names both.
- An account that stops being entitled between the password step and the resume gets a new sign-in step (the library alone answered 500).
- The acs-2.7 test verifies with `jose`, which the package does not declare: it is `oidc-provider`'s own pinned dependency. acs-3 declares it (R-acs-2-JOSE-UNDECLARED).
- The plan red-team's and both artifact lenses' findings changed the design: the hash ceiling, one grant per sign-in, the canonical-form rule for redirect addresses, the cap moved into the provider's policy, the request-target limit, the resumed sign-in's deadline.

## touches-delta

- `account-service/src/server.ts`, `account-service/src/server.test.ts`: widened through `mr-touches` (reason above).
- `account-service/src/provider.test.ts`: sibling test of `provider.ts`; blocks appended, no existing test changed.

`mr-touches scope`: IN-SCOPE, 18 files. `package.json` and `package-lock.json` are unchanged. No `docs/DECISIONS.md` edit: the existing entry already says ID tokens live an hour and refresh tokens 30 days, rotating, with reuse revoking the chain, and the no-session rule is stated where it is enforced and in `docs/account-service.md`.

## boyscout-delta

None.

## comment-scan

`mr-comment-scan`: CLEAN.

## Lenses

Plan: reviewer (1 blocker: the expired-token half of acs-2.7 had no contract; closed) and red-team (2 high: unbounded hashing per sign-in, the cap as a kill switch; both changed the design). Built artifact: reviewer and red-team (both found the cap skipped by `HEAD /auth`, `/AUTH` and `/auth/`; closed with tests for each spelling), a re-read of the fix diff (a resumed sign-in got a fresh ten minutes outside the cap; closed with a test), verifier (FAIL, then PASS). `reducer-security-auditor` and `desync-guard` do not apply: no reducer, no `game-core`.

Answered, not changed:
- An attempt that ends in an internal error (the store, the hash) keeps its slot of the five: an error path never yields a free guess. Five store errors in ten minutes therefore lock an email.
- A sender that declares a large `Content-Length` and sends nothing holds its connection until Node's request timeout, as any slow client can.
- `Sec-Fetch-Site` is not consulted and no test pins that: the `Origin` rule is tested for absent, foreign, `null`, prefix and `Referer`-only requests.
- Cookies on `localhost` are shared across ports, so a script on another local origin could plant an attacker's interaction cookies; the code still goes only to the registered redirect address, and the game client refuses a `state` it did not make.
- `POST /auth` is 404: the provider takes authorization requests by GET, which is what the game client sends.
- The refresh lifetime's floor of one second (a token reaching its last second between the expiry test and the save) has no test: it needs the clock to tick inside one request.

## Notes and follow-ups (`mr-gates notes list --slice acs-2`)

- n1: acs-2 as built where the section is silent. n2: R-acs-1-TOKEN-IDS-AT-REST is fixed by this PR.
- n3 to n5: inputs for acs-3 (where `/attest` goes, the limiter's API, declare `jose`), acs-6 / acs-7 (`set-client`, the generated password, one shard) and acs-9 / acs-10 / acs-11 (production has no way to register a client; an ownership check that awaits HTTP opens a parallel-refresh window; a Steam failure must be an error, never "not entitled").
- `R-acs-2-RESET-KEEPS-CHAINS` [security-privacy/MED]: a password reset leaves the account's existing refresh chains alive.
- `R-acs-2-NO-PER-ADDRESS-LIMIT` [security-privacy/MED]: the cap, the hash ceiling and the lock can each be held by one caller; a per-address limit needs a trusted-proxy rule first.
- `R-acs-2-ADMIN-WRITE-RACE` [data-integrity/LOW]: two admin commands on one account at once can overwrite each other.
- `R-acs-2-JOSE-UNDECLARED` [loop-ops/LOW], target acs-3.

Items: none

## Checklist
- [x] `just ci` green (no netcode, reducer or client flow changed, so no `just e2e`)
- [x] Failing test written before the change
- [x] `docs/DECISIONS.md` updated if a design decision changed (none did)
- [x] No secrets; inputs validated at the boundary (the form post, the redirect address, the admin command's arguments)

## not-verified

- A real browser: the form, its `Origin` header on post, the cookies and the redirect chain to the game were driven over HTTP by tests, not by a browser. The first browser run is acs-7's e2e.
- The game client against this issuer end to end (acs-7), and a module accepting these tokens (acs-6).
- `hosted-dev` (an `https:` issuer behind a proxy): `Secure` cookies and the `Host` rule were not exercised on a deployed instance (acs-4, acs-5).
- Remote-only gates (gitleaks in the workflow over the commit range, `cargo audit`, the e2e shards) were not run locally; gitleaks was run by hand in filesystem mode.
- Windows: file-mode assertions are POSIX-only, and nothing was run on Windows.
- Node 24.13.1, the low end of the `engines` range: `crypto.argon2` was probed there, the suite was run on 24.22.0 only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
