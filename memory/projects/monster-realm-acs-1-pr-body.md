## What & why

Adds `account-service/`, the OpenID Connect issuer game modules will trust for player accounts (spec `M-account-service.spec.md` §acs-1, the first slice of the milestone). After this PR `just account-dev` serves `http://localhost:4455/.well-known/openid-configuration` and an ES256 key set it generated on its first start and reuses on every later one. The service has no client and no sign-in step, so it issues no token: acs-2 adds sign-in on top.

- `src/config.ts` loads one of three profiles (`local-dev`, `hosted-dev`, `production`) from the environment and refuses a dev-only setting in production, or a production setting in a dev profile, naming the setting and never repeating its value.
- `src/keys.ts` loads P-256 signing keys by `kid` from a key file marked with its profile; `local-dev` generates the file on first start (0600, in a 0700 directory ignored by git).
- `src/store/sqliteAdapter.ts` is the provider's storage adapter over Node's built-in `node:sqlite`.
- `src/provider.ts` configures `oidc-provider` 9.15.1 and puts one request handler in front of it.
- `src/server.ts` is the entry point. Node runs the TypeScript sources directly; there is no build step.
- `just account-dev`, `account-typecheck`, `account-test`; the last two join `just ci` and a new `account-service` CI job (which also audits the runtime dependencies). `just lint` already lints the package.
- `docs/account-service.md` records the design, profiles, settings, operator inputs and runbook headings.

## What to read first

Four things here are not in the spec's plan. Each was measured against the library before it was built.

1. **The provider builds every published URL from the request, not the issuer.** A default provider answered discovery with `Host: evil.example` by publishing `jwks_uri: http://evil.example/jwks`. A module fetches discovery and then whatever `jwks_uri` it names, so the handler answers only requests whose `Host` is the issuer's host (others get 421), refuses absolute-form targets (400), drops `Forwarded` and every `X-Forwarded-*` header, and takes the scheme from the issuer.
2. **A request carrying any `_session` cookie made the provider store a session and set a cookie for an anonymous caller** (found by the red-team on the built artifact: 20,000 requests wrote 10 MB and stalled `/jwks` for over a second). The handler removes `Cookie`; acs-2 must stop removing it when it wires sessions (note n2).
3. **Two library defaults are switched off**: the built-in sign-in form that accepts any name, and the logout page that stores a session for a caller who never signed in. The error page is plain text (the library's own loads a font from a third party).
4. **acs-1.3 is deferred and replaced by gate X1.** Its second clause ("a consumed … record SHALL read as absent") contradicts its first ("meet the provider's adapter contract"): oidc-provider detects a replayed code or refresh token only when `find` returns the record carrying `consumed`, and then revokes the grant, which acs-2.4 needs. Built: a consumed record reads back carrying `consumed` and never as an unconsumed record; an expired record reads as absent. A wrong implementation that makes consumed records read as absent fails 7 tests, including the ones that drive the provider's own models. Please adjudicate; note n1 asks for the spec text to be amended.

The `production` profile checks its settings and then refuses to start: this build holds no external signer (acs-11).

## Acceptance

Acceptance: 5/6 met, 1 deferred, 0 unmet — acs-1 seed:58b4401347a1b8ac
Deferred: acs-1.3 -> wontfix — its second clause (a consumed record reads as absent) contradicts the provider's adapter contract its first clause requires: oidc-provider 9.15.1 refuses a replayed code or refresh token and revokes its grant only when find returns the record carrying consumed (lib/helpers/grant_source.js, lib/actions/grants/refresh_token.js), which acs-2.4 depends on. Built instead as X1 (consumed reads back marked, never as live; expired reads as absent); the spec text is to be amended at merge (note filed).

Ledger: `memory/projects/gates/acs-1.gates.md` (5 gates with a CHECK each, re-run with `mr-gates verify`). acs-1.5 has no test of its own, since a test of CI wiring would be a check of a check: its CHECK reads `just --dry-run ci`, the existing `scripts/ci-parity.test.mjs` holds the workflow to the `ci:` list, and the bite proof below shows each step failing.

## Test-first evidence

- **Red:** the tester's five test files at commit `c9ed0943`, before any product module existed: `Test Files 5 failed (5)`, each at the import of the module it gates (`gates/acs-1.red-proof.log`).
- **Wrong implementations** (`gates/acs-1.mutants.log`): 83 deliberate defects of mine and 38 of the verifier's, each applied alone and the tests run. Every one that survived a pass and touched a protected behaviour got a test from the tester and was re-run killed: a temp copy of the private key left behind, a forged `X-Forwarded-For`, a group-readable data directory, a wrong-curve key (secp256k1 has 32-byte members too), an unbounded or non-regular key file, the cookie, stale lookup columns after a second upsert. What still survives is listed there with its reason (equivalent under other checks, or invisible resource hygiene).
- **acs-1.5 bite proof** (`gates/acs-1.red-proof.log`): a `debugger;` statement, a type error and a failing test planted in the package turn the biome line of `just lint`, `just account-typecheck` and `just account-test` red in turn (exit 1 each); the tree was clean afterwards.
- **By hand, on the defaults:** `just account-dev` twice on a checkout with no `.data`: discovery and `/jwks` at `http://localhost:4455`, the same `kid` on the second start, `git status` clean, modes 0700/0600.
- The tester wrote and edited every test (four rounds); the implementer changed none.

## Local gate

`just ci` green at `bb6d3617` (this head, with `master` 505d749d merged in): Rust 3417 + 1120 + 3089 tests, node doors 141 / 83 / 3, 15/15 evals, account-service 5 files / 309 tests and its typecheck, client typecheck and 245 files / 6256 tests, verify-build OK, observability 9 checks. `gitleaks` over the PR's commits: no leaks. `npm audit --omit=dev`: 0 vulnerabilities.

## plan-delta

- acs-1.3's consumed clause → X1 (above). Evidence: `oidc-provider/lib/helpers/grant_source.js`, `lib/actions/grants/refresh_token.js`.
- "an external signer (production)" → the config names the source and the service refuses to start with it; the signer belongs to the slice that knows the key service (acs-11's contract names it). Nothing is abstracted for an implementation that cannot run yet.
- Added on measurement: the issuer-only request handler; `Cookie` and forwarded headers removed; `devInteractions` and `rpInitiatedLogout` off; `responseTypes: ['code']`; ES256 as the only ID-token algorithm; a plain-text error page.
- Stricter than the criterion asks: an unknown or wrong-case `MR_ACCOUNT_*` name is refused (a misspelt setting never falls back to a default); dev profiles take no `MR_ACCOUNT_ISSUER` at all; a `hosted-dev` key file must grant group and others nothing; the production issuer must be a canonical `https:` origin on a DNS name.
- The recipes install the package's dependencies themselves when absent or stale (`npm ci --ignore-scripts`), so `just account-dev` works on a clean checkout and `just setup` is unchanged.
- `biome.json` is in `touches:` and needed no change.

## touches-delta

- `account-service/src/server.test.ts` (sibling test of `server.ts`).
- `docs/DECISIONS.md`: one clause added in place to "The account service is our own small OIDC issuer…" (the SQLite file is opened with Node's built-in `node:sqlite`, no native SQLite package). No new entry.

No `mr-touches` widen. `mr-touches scope`: IN-SCOPE, 19 files.

## boyscout-delta

- `.github/workflows/ci.yml:16-20` — the comment said four jobs and that every job has a rust-cache prefix; it now says five, and that each Rust job has one.

## comment-scan

`mr-comment-scan`: CLEAN.

## Lenses

Plan: reviewer and red-team (no blocker; their findings are in the contracts). Built artifact: reviewer (4 should-fix, all closed), red-team (1 high, the cookie; closed with a gating test; the rest closed or answered below), verifier (PASS; its one real gap closed). `reducer-security-auditor` and `desync-guard` do not apply: no reducer, no `game-core`.

Answered, not changed:
- Duplicate JSON members in a key file are accepted as `JSON.parse` reads them (last wins). Only this loader reads the file, and whoever can write duplicates can write the mark directly.
- A `kid` need not be the key's thumbprint, and one key may appear under two `kid`s: operators name keys for rotation.
- `0.0.0.0` is accepted as a listen address: acs-4.2 runs `local-dev` in a container. The default is loopback.
- Non-string ids, a clock returning NaN and an `expiresIn` near the float maximum reach the store unchecked: the provider produces none of them.
- A key path naming a character device such as `/dev/zero` is refused by the regular-file rule, which has no test: one would exhaust memory on the day it failed.

## Notes and follow-ups (`mr-gates notes list --slice acs-1`)

- n1: amend acs-1.3; the external signer.
- n2: inputs for acs-2 (cookies and `cookies.keys`, `config.ts` not in its `touches:`, the ES256 client default, the parallel-refresh race, CORS).
- n3: inputs for acs-4, acs-9, acs-11 (the Host rule behind a proxy and for health checks, no key-generation command, backups, per-IP limits).
- `R-acs-1-TOKEN-IDS-AT-REST` [security-privacy/MED]: record ids are stored in the clear, so a database backup will hold live refresh tokens once acs-2 issues them.
- `R-acs-1-DOCS-NAME-PACKAGE` [loop-ops/LOW]: `ARCHITECTURE.md`, `AGENTS.md` and `README.md` do not name the package (outside `touches:`).

Items: none

## Checklist
- [x] `just ci` green (no netcode, reducer or client flow changed, so no `just e2e`)
- [x] Failing test written before the change
- [x] `docs/DECISIONS.md` updated if a design decision changed
- [x] No secrets; inputs validated at the boundary (the service's settings and its key file)

## not-verified

- The new `account-service` CI job, its `npm audit` step and the tools action on a GitHub runner: first exercised by this PR's own run. If branch protection lists required checks, `account-service` is a new name.
- Remote-only gates (gitleaks in the workflow, `cargo audit`, the e2e shards) were not run locally; gitleaks was run by hand over the same commit range.
- Windows: the mode assertions and the key-file permission rule are POSIX-only by design, and nothing was run on Windows.
- `hosted-dev` was exercised only in process with a key file the test wrote; no instance was deployed (acs-4, acs-5).
- That the first key in the file is the one that signs is read from the library's key selection, not tested: no token is issued in this slice.
- The once-a-minute purge timer has no test (`purgeExpired` itself does).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
