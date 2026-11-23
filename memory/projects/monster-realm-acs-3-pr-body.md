## What & why

`POST /attest` on the account service: a bearer ID token of this issuer and `{ world, nonce }` in, a five-minute attestation out, which a `local` or `private` world's module will check with a key it holds as data to bind an account (M-account-service acs-3; game `docs/DECISIONS.md`, "A private world verifies an account by a per-world attestation our account service signs").

- **The attestation** is a compact JWT signed with an Ed25519 key of its own, header `{ alg: "Ed25519", kid }`, and exactly eight claims: `iss` (`<issuer>/attest`), `sub`, `aud` (the world), `nonce`, `mr_ent: ["base-game"]`, `iat`, `exp` (+300 s), `jti`.
- **The checks, in order:** the token (a login key, ES256, this issuer, unexpired) → its `mr_ent` → the body → the account's limit (20 per sliding hour) → the account read again. The token is checked before any of the body is read.
- **The keys** are disjoint from the login keys by type and by name. `local-dev` signs with one fixed key; `hosted-dev` with the operator's `attestation-keys.json` beside the login key file; `production` through an external signer this build does not hold.
- **The published list**: `account-service/attestation-public-keys.json`, generated from `publishedAttestationKeys()`, is the file a module build embeds.
- **The log**: one line per attestation issued (account, time), one per failure of the service; a refusal logs nothing; no line holds a world, a nonce, a token or an error's message.

## What to read first (choices the spec leaves open)

1. **The `local-dev` attestation key is fixed and public.** A module holds attestation keys as constants (`docs/local-play.md` §3 fork (e)), so a key made per machine could be held by no build. Its private bytes are the SHA-256 of a label in `keys.ts`, and the repository is public: anyone can sign with it. Every `dev_issuers` build therefore accepts a forged binding in a `local` or `private` world. Recorded in `docs/DECISIONS.md` ("Ownership is enforced unless a dev feature switches it off", amended in place), in `docs/account-service.md`, and as `R-acs-3-DEVKEY-FORGEABLE` for lpw-15 / acs-6. No other profile may sign with it: a key file that holds it is refused.
2. **`jose` is used and still undeclared.** `mr-touches` refuses `account-service/package.json` ("gate or loop-control file: never self-granted"), so `R-acs-2-JOSE-UNDECLARED` could not close here. `attest.ts` imports jose; it resolves because `oidc-provider` depends on it and the lock file pins 6.2.18. Note n1 carries the two-edit fix.
3. **`hosted-dev` refuses to start without `attestation-keys.json`** (no new setting: the file sits in the login key file's directory). The doc gives the command that makes one.
4. **The account is read again for every attestation**, so a cleared entitlement stops binds at once rather than after the ID token's hour.
5. **`world` and `nonce` are opaque visible ASCII**, 1–512 and 1–128 characters, in a body of at most 1024 bytes that holds nothing else; the token's `sub` must be 1–255 characters of visible ASCII (it is the one caller-influenced value a log line holds). lpw-15's nonce and world names must fit.
6. **Every answer carries `Access-Control-Allow-Origin: *`**, and `OPTIONS` answers the preflight: the route reads no cookie, the token is the only way in, and the dev client's page (lpw-15) has to be able to call it and read refusals. An ID token issued to any registered client is taken.
7. **The limit's accounting:** a hit is taken once a request has a valid token and body; a request the account read refuses keeps it; one the service failed gives it back. It lives in one process.
8. **The route is composed in `server.ts`**, in front of the provider's handler, and takes exactly `/attest` under the issuer's `Host`; everything else, a wrong `Host` included, falls through to that handler (acs-2's note n3 suggested inside `provider.ts`, which is outside this slice's files).
9. **A held ID token can bind worlds for its whole hour** (`R-acs-3-IDTOKEN-BIND-WINDOW`, documented, not narrowed).

## Acceptance

Acceptance: 5/5 met, 0 deferred, 0 unmet — acs-3 seed:81a59a195972ef0f
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- account-service/attestation-public-keys.json — red test: keys.test.ts 'the generated attestation-public-keys.json is what the function returns acs-3.1' fails with ENOENT; the acs-3 contract publishes each profile's public attestation keys as a file the module embeds as data (lpw-15), and no declared path can hold a data file

The ledger's EVIDENCE lines were recorded at `151c7833` (`mr-gates check` does not re-run a met gate). The five CHECK commands run at head `9a07d666`:

```
acs-3.1:GREEN tagged=46 files=3 tests=344 of 344
acs-3.2:GREEN tagged=148 files=1 tests=196 of 196
acs-3.3:GREEN tagged=17 files=2 tests=240 of 240
acs-3.4:GREEN tagged=54 files=2 tests=320 of 320
acs-3.5:GREEN tagged=4 files=2 tests=220 of 220
```

## Test-first evidence

The tester (opus) wrote every test from the EARS criteria and the plan's contracts; the implementation never edited one. Log: `memory/projects/gates/acs-3.red-proof.log`.

- **Red before any implementation** (base `16e2cb3c`): 81 failed of 677; `attest.test.ts` red at import; every gated test in `keys.test.ts`, `rateLimit.test.ts` and `server.test.ts` failed, except one `server.test.ts` test that passed (the provider already answers 421 under another `Host`): the tester removed its gate id and it stays as an untagged guard.
- **Test defects the runs found**, fixed by the tester with no expected value changed: a default parameter swallowed an explicit `undefined` (the "no content type" rows sent `application/json`); a `test.each` title consumed a function as `%i`; a helper read a directory; one tuple failed `tsc`.
- **The `sub` rule** (added after the red-team pass): its eight rows were red (403 where 401 was expected) before the rule was written.
- **Guards proved by mutation**, in a sandbox copy with the worktree untouched: `sub` lower-cased, attestation keys loaded after the data directory is made, the success log swallowed, `host.startsWith(...)`, a signing failure keeping its hit. Each new test fails on its mutant.
- 874 tests in the package at head (596 before the slice).

## Local gate

`just ci` on `9a07d666`: exit 0 (`/tmp/acs-3-ci2.log`): account-service 13 files / 874 tests; client 247 files / 6309 tests; evals PASS, `account-e2e` and `bindings-drift` among them. An earlier full run on `151c7833` was also green. `tsc --noEmit` and `biome check account-service` clean. `node scripts/check-secrets.mjs .` clean.

## plan-delta

- jose is used by `attest.ts` and stays undeclared (`mr-touches` refuses the manifest).
- The contract's "published as a file" is the generated `account-service/attestation-public-keys.json`, outside the spec's `touches:` (widened on its red test).
- The route is composed in `server.ts`, not inside `provider.ts`'s handler.
- Added after the lens batch: the bound on the token's `sub`; the failed step named `log` when the success line cannot be written.
- Tester's questions, answered: a token whose `aud` is another registered client is accepted (every client is the admin's); `HEAD` is 405, a byte-order mark is 400, a tab after `Bearer` is 401; the 204 carries no content type; duplicate JSON members are last-wins in the one parser; a published key's `kid` need not be its thumbprint.

## touches-delta

- `account-service/attestation-public-keys.json` — widened via `mr-touches` (reason above).
- `docs/DECISIONS.md` — one entry amended in place at the decision bar: it constrains which attestation key lists a build holds (lpw-15, acs-6) and is not evident from the module's code.
- `account-service/src/server.test.ts` — the sibling test of `server.ts`.

## boyscout-delta

none

## comment-scan

`COMMENT-SCAN CLEAN` at `9a07d666` (seven slice ids in test divider comments and one history-worded doc sentence were reworded).

## Lenses

- **Plan:** reviewer and red-team. The reviewer's blocker (the fixed `local-dev` key against "still enforces") is answered by recording the limit, not by a per-machine key, which needs a build input fork (e) does not have; the red-team's findings became contract lines (`exp` required, one clock, never throws, a key file holding the `local-dev` key refused).
- **/simplify:** twice; four small cuts.
- **Reviewer (diff):** no blocker. S1 (the docs named a dev build "given only the `hosted-dev` keys", which no feature set produces) reworded as the open constraint and filed; N1, N3, N4, N5 fixed; N2 (`giveBack` takes back the account's newest hit, not necessarily this request's) left as documented in the code: the count stays right.
- **Red-team (artifact):** no exploit reached; 79 wrong implementations, 72 killed. Of 7 survivors, 5 are equivalent or unreachable and 2 got tests. LOW-1 (a line feed in `sub` would reach a log line; only the issuer mints a `sub`) closed by the `sub` bound. LOW-2 (a signature's twin also verifies) changes nothing without a replay set. LOW-3 (a valid token can hold a connection with a body that never ends, until Node's request timeout) is accepted, as for the sign-in form.
- **Verifier:** PASS. Three test gaps closed with tests proved against its mutants. Left: the failure line's `step=`/`error=` fields are not asserted (it would pin a log line's wording).
- Not run: `reducer-security-auditor` and `desync-guard` (no reducer, no game-core change).

## Residuals

- `R-lpw-7-ATTESTKEY` — signing is Ed25519 and each profile's key handling is recorded in `docs/account-service.md`, "Attestation keys". Its reverse condition (whether the production host's key service signs with Ed25519) stays an operator input, listed in that doc.
- `R-acs-2-JOSE-UNDECLARED` — **not closed** (see 2 above; note n1).
- `R-acs-1-TOKEN-IDS-AT-REST` — already fixed by acs-2 (#836); nothing to do here.
- `R-acs-2-NO-PER-ADDRESS-LIMIT` — not fixed: a limit per address needs the trusted-proxy rule in `config.ts` and `provider.ts`, outside this slice's files.
- New: `R-acs-3-DEVKEY-FORGEABLE` [security-privacy/MED → lpw-15]; `R-acs-3-IDTOKEN-BIND-WINDOW` [security-privacy/LOW → backlog].

## Notes and follow-ups (`mr-gates notes list --slice acs-3`)

- n1 the jose fix; n2 the attestation key as built; n3 acs-3 as built where the section is silent (inputs for lpw-15, acs-4, acs-5); n4 the dev-key follow-up; n5 the bind-window follow-up.
- `mediaType` and `readBody` in `attest.ts` are near-copies of private helpers in `interactions/router.ts` (outside this slice's files); a shared module is a small follow-up.

Items: none

## not-verified

- The local gate ran on `9a07d666`, which does not contain master's #837 (lpw-6, `client/` only, file-disjoint).
- The remote-only jobs (gitleaks, cargo-audit, the e2e job, `npm audit` of the account service) were not run locally.
- No game module checks an attestation yet (lpw-15): attestations were verified with jose and with `node:crypto` only, not with `ed25519-dalek`'s `verify_strict`.
- No browser exercised the preflight; the CORS headers are asserted over HTTP only.
- `hosted-dev` was started in tests with a generated key; no instance is deployed and no `hosted-dev` key is published.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
