# Spec: M-account-service — Steam sign-in, ownership, and attestations

**Status:** authored 2026-11-16 from the operator's rulings on monster-realm#821 and the same
day's follow-ups (in a supervisor session), against game `master` `08d4d12f`, into 10 `acs-`
slices · **Project:** monster-realm (a new `account-service/` package, the server module, the
client, the desktop shell) · **Design SSOT:** the game's `docs/DECISIONS.md` entries "Every player
must own the game on Steam", "The account service is our own small OIDC issuer; Steam is the only
player sign-in" and "A private world verifies an account by a per-world attestation our account
service signs" · **Target:** the early-access release (ownership on every world) and the official
server (sign-in). **Anchors are symbols and files, never line numbers.** **Doctrine:**
`standards/testing-tdd.md` (no new eval scripts, source-text scans or checks-of-checks).

Slice ids use the `acs-` prefix. Build order is file order. A slice carrying `blocked:` is skipped
until its lifting event; acs-1 to acs-6 carry none, need no Steam account, and build first against
a Steam stub.

## Problem / intent

The operator ruled (2026-11-16): **for now, every player must own the game on Steam to play**,
browser players included, in every way to play — the official server, a friend's server and a
single-player world. Three things follow, and none exists today:

1. **An issuer the official server trusts.** SpacetimeDB accepts only signed JWTs from an issuer
   with OIDC discovery and a key set. Steam issues none (its browser sign-in is OpenID 2.0, its
   tickets are opaque and checked with our secret publisher key), so a service of ours must check
   Steam and sign the JWT. `ALLOWED_ISSUERS` in `server-module/src/accounts.rs` is still the
   fail-closed `.invalid` placeholder.
2. **Proof of ownership in worlds we do not run.** A friend's host cannot call Steam's publisher
   APIs (it would need our key), and a browser has no Steam ticket at all. The attestation design
   (M-local-play lpw-15) already carries a signed statement from our service to one world; it now
   also carries the entitlement, and every player of a `local` or `private` world binds, not only
   joiners of an allowlisted one.
3. **A sign-in for browser players that proves ownership.** Steam's OpenID 2.0 proves a Steam
   account, not a purchase, so the service checks the licence with `CheckAppOwnership` before it
   issues anything.

One service does all three: an OIDC provider built on `oidc-provider` (MIT, OpenID Certified,
v9.x), with two Steam sign-in methods, a dev-only email method, and the attestation route. Every
method yields the same token shape, and both Steam methods yield the same subject, so a player's
browser and desktop sessions are one account.

## Research record (2026-11-16)

- **Valve.** `ISteamUserAuth/AuthenticateUserTicket` takes the publisher key, the app id, the hex
  ticket and an `identity` string ("only tickets created with that parameter will successfully
  authenticate"; the ticket comes from `GetAuthTicketForWebApi(identity)`, SDK 1.57+), returns the
  player's SteamID, and must be called from a secure server. `ISteamUser/CheckAppOwnership` (v4,
  partner host, publisher key) returns `ownsapp`, `permanent` (false for Family Sharing, free
  weekends and PC café), `ownersteamid` (the true owner under Family Sharing) and `sitelicense`.
  Steam's browser sign-in is OpenID 2.0, verified by posting the reply back with
  `openid.mode=check_authentication`.
- **SpacetimeAuth** (Clockwork Labs' hosted OIDC issuer, beta) exchanges a Steam session ticket
  (grant `urn:spacetimeauth:steam-ticket`, identity `spacetimeauth`) for an ID token carrying
  `steam_owned_games`. It has no Steam sign-in for a browser, its subject is its own user id (not
  the SteamID), and it has no per-world attestation; rejected (see Named deferrals).
- **Better Auth** (the game repo's never-deployed recipe in `ops/auth/`, with no `docs/DECISIONS.md` entry behind it) has no official Steam method; a third-party OpenID 2.0 plugin is at 0.1.1, and a
  ticket grant and the attestation route would be ours either way; rejected.
- **`oidc-provider` 9.15.0** (`panva/node-oidc-provider`): authorization code with PKCE,
  `registerGrantType` for a custom grant, `rotateRefreshToken`, app-owned interactions
  (`interactions.url`), a storage `adapter`, ES256 keys, and external signing keys (a KMS holds the
  private key).
- **`steamworks.js`** exposes `getAuthTicketForWebApi` (typings fixed in 0.3.2); Electron 21+'s
  memory cage broke older versions' ticket calls, so the shell slice pins a version measured
  against its Electron.
- **BitCraft** (Clockwork Labs' own SpacetimeDB game, on Steam) appears, from a third-party tool,
  to sign in through its own API rather than SpacetimeAuth's Steam path: an issuer of its own in
  front of SpacetimeDB, the shape chosen here. Unconfirmed; BitCraft has no browser client and no
  player-hosted servers.

## Named deferrals (declared, not dropped)

| Deferred | Target | Why |
|---|---|---|
| Guest (anonymous) play on the official server | the operator ("for now") | Ownership is required; the guest claim flow (`start_guest_claim`/`complete_guest_claim`) stays built and tested but no guest reaches `join_game` on an enforcing build (acs-8) |
| High availability (a second instance, Postgres) | after the official server's first month | One instance with SQLite on a volume and an hourly backup; discovery and keys are cached by every host for minutes to hours, so a short outage blocks only new sign-ins and new binds |
| SpacetimeAuth as the issuer | revisit if it gains Steam sign-in for browsers and pairwise subjects | Browser players must prove ownership; its subject is not the SteamID, so a browser and a desktop session would be two accounts |
| Steam game-server auth (`BeginAuthSession`) on friends' servers | none for now | Browser players need the attestation anyway; one mechanism, not two. It stays the alternative if the service's availability ever blocks friends play |
| A holder-bound credential instead of the per-world attestation | the "upgrade path" in the attestation decision | Unchanged from monster-realm#821 |
| Non-Steam sign-in methods for players (Google, Discord, …) | none while ownership is Steam-only | A method that cannot prove a Steam licence cannot satisfy the ownership rule |
| Account linking across methods | none needed | Both Steam methods yield `steam:<steamid64>`; dev accounts are a separate issuer |
| Ownership re-checked inside an existing world binding | accepted risk (below) | A binding is permanent and offline by design |

## Decisions the operator owns (defaults recorded; each reversible)

- `decision-defaulted:account-service-stack=node-ts-oidc-provider-in-game-repo` — TypeScript on the
  Node version the repo pins, `oidc-provider` 9.x, `jose` for the attestation, one package at
  `account-service/` in the game repo with its own lockfile and CI job (consumed by acs-1).
- `decision-defaulted:account-store=sqlite-single-instance` — `oidc-provider` storage, refresh
  tokens, Steam reply nonces, pending sign-ins, the deny-list and dev accounts in one SQLite file
  (consumed by acs-1).
- `decision-defaulted:ownership=permanent-licence-held-by-the-player` — entitled when
  `CheckAppOwnership` reports `ownsapp`, `permanent`, not `sitelicense`, and `ownersteamid` equal to
  the player's SteamID: a Family Sharing borrower, a free weekend and a PC café do not count, a
  refund removes entitlement at the next issuance (consumed by acs-2). Relaxing it is one policy
  function.
- `decision-defaulted:token-lifetimes=id-1h-refresh-30d-rotating-attestation-5m` — ownership is
  re-checked at every issuance, so a refund or ban reaches the official server within an hour
  (consumed by acs-3, acs-4, acs-6).
- `decision-defaulted:subjects=steam-steamid64-and-dev-uuid` — `sub` is `steam:<steamid64>` for both
  Steam methods and `dev:<uuid>` on the dev issuer (consumed by acs-3, acs-4, acs-5).
- `decision-defaulted:entitlement-claim=mr_ent-base-game` — the ID token and the attestation carry
  `mr_ent: ["base-game"]`, issued only to entitled players; the module checks the claim, not the
  issuer alone, so a later free tier is an issuance change (consumed by acs-3, acs-6, acs-8, lpw-15).
- `decision-defaulted:steam-ticket-identity=monster-realm-account` — the identity string the shell
  passes to `GetAuthTicketForWebApi` and the service passes to `AuthenticateUserTicket` (consumed
  by acs-3, acs-10).
- `decision-defaulted:rate-limits=ticket-30h-per-steamid-60m-per-ip-attest-20h-dev-5-per-10m` —
  ticket exchanges 30 an hour per SteamID and 60 a minute per IP; attestations 20 an hour per
  account; dev password failures 5 per 10 minutes per account (consumed by acs-3, acs-5, acs-6).

## Operator questions (open)

- **Steamworks app and publisher key (operator-owned).** The service needs the game's Steam app id
  and a publisher Web API key; the shell needs the app id. Lifting event: the operator records the
  app id in the game's `docs/account-service.md` and stores the publisher key in the deployment's
  secret store. Until then acs-1 to acs-6 build and test against the Steam stub; acs-7 waits.
- **Hosting and domain (operator-owned).** Where the one container and its volume run, and the
  issuer's domain (the `iss` every module will trust). Lifting event: the operator records both in
  `docs/account-service.md`. Recommended: one small container with a persistent volume on any
  managed host, the discovery and key files behind a CDN, the signing keys in that host's KMS.

## Risks / flags

- **The issuer is a single point of failure for new sign-ins and new binds.** Hosts cache the key
  set (SpacetimeDB 2.11.0: refreshed after 300 s, dropped after 7,200 s), so play continues for
  connected and bound players; the CDN serves discovery and keys independently of the container.
- **Ownership inside a bound world is checked once.** A player refunded after binding keeps
  playing in that world until its host removes them; every other world and the official server
  see the refund at the next issuance. Accepted: a binding is offline by design.
- **A host can patch the module it runs** and switch ownership off on its own server. Accepted:
  ownership on a self-hosted server is as strong as the host's own build; the official server and
  every unmodified build enforce it.
- **The publisher key opens every partner API for the app.** It lives only in the deployment's
  secret store, is read by one module (`steam/webApi.ts`), and never appears in a log, an error or
  a response.
- **Steam's reply is the weakest input.** The OpenID 2.0 reply is checked by Steam
  (`check_authentication`), and its return address, endpoint, claimed id and single-use nonce are
  checked by us; a failure of any one ends the sign-in.

## Slices

### acs-1 — the account service: a provider that serves discovery and keys

type: feature · tier: hard
touches: account-service/package.json, account-service/package-lock.json, account-service/tsconfig.json, account-service/vitest.config.ts, account-service/src/server.ts, account-service/src/config.ts, account-service/src/config.test.ts, account-service/src/provider.ts, account-service/src/provider.test.ts, account-service/src/store/sqliteAdapter.ts, account-service/src/store/sqliteAdapter.test.ts, account-service/src/keys.ts, account-service/src/keys.test.ts, account-service/test-util/steamStub.ts, docs/account-service.md, justfile, .github/workflows/ci.yml, biome.json, .gitignore
after: []
- Contract: `server.ts` starts `oidc-provider` 9.x from `config.ts` (issuer URL, client list, key source, database path, Steam app id and key reference), with every feature off but what later slices enable. `keys.ts` loads ES256 signing keys by `kid` from a file or an external signer and publishes only public keys. `sqliteAdapter.ts` implements the provider's adapter contract. `steamStub.ts` is a local fake of the Steam Web API and OpenID endpoints every later test uses; no test reaches Steam. `docs/account-service.md` records the design, the operator inputs and the runbook headings. `just account-test` runs the package's tests and joins `just ci`.

- **acs-1.1:** WHEN the service starts, THE SYSTEM SHALL serve `/.well-known/openid-configuration` naming the configured issuer, and a key set holding only public ES256 keys, each with its `kid`.

- **acs-1.2:** WHEN `config.ts` is given a production issuer together with any dev-only setting (the dev password method, the stub Steam host, a key file marked dev), THE SYSTEM SHALL refuse to start and name the setting.

- **acs-1.3:** WHEN an adapter record is written, read, consumed and expired through `sqliteAdapter.ts`, THE SYSTEM SHALL meet the provider's adapter contract, and a consumed or expired record SHALL read as absent.

- **acs-1.4:** WHEN `just ci` runs, THE SYSTEM SHALL run the package's lint, typecheck and tests.
- DoD: acs-1.1 to acs-1.4 green; `just ci` green.

### acs-2 — Steam checks and the ownership rule

type: feature · tier: hard
touches: account-service/src/steam/webApi.ts, account-service/src/steam/webApi.test.ts, account-service/src/steam/ownership.ts, account-service/src/steam/ownership.test.ts, account-service/src/denyList.ts, account-service/src/denyList.test.ts, account-service/test-util/steamStub.ts
after: [acs-1]
- Contract: `webApi.ts` is the only reader of the publisher key: `authenticateTicket(ticket, identity)` and `checkAppOwnership(steamId)`, each with a timeout and no retry on a 4xx. `ownership.ts` is the pure rule `entitled(ownership, steamId)` from the ownership default. `denyList.ts` holds our own bans by SteamID. Before building, the slice confirms the response fields against Valve's current partner documentation and records them in `docs/account-service.md`.

- **acs-2.1:** WHEN `entitled` is given each combination of `ownsapp`, `permanent`, `sitelicense` and an `ownersteamid` equal to or different from the player's, THE SYSTEM SHALL return true only for an owned, permanent, non-site licence held by the player.

- **acs-2.2:** WHEN Steam answers with an error, a timeout or a body that does not parse, THE SYSTEM SHALL treat the player as not entitled and SHALL put no Steam response text in the error it returns.

- **acs-2.3:** WHEN any request, response or error is logged, THE SYSTEM SHALL log neither the publisher key nor a ticket (a test captures every log line of a full exchange against the stub).

- **acs-2.4:** WHEN a SteamID is on the deny-list, THE SYSTEM SHALL treat it as not entitled whatever Steam answers.
- DoD: acs-2.1 to acs-2.4 green; `just ci` green.

### acs-3 — the desktop sign-in: a Steam ticket for an ID token

type: feature · tier: hard
touches: account-service/src/grants/steamTicket.ts, account-service/src/grants/steamTicket.test.ts, account-service/src/claims.ts, account-service/src/claims.test.ts, account-service/src/rateLimit.ts, account-service/src/rateLimit.test.ts, account-service/src/provider.ts
after: [acs-2]
- Contract: a grant `urn:monster-realm:steam-ticket` (`registerGrantType`) takes `steam_ticket` (hex) and the client id, calls `authenticateTicket` with the identity default and `checkAppOwnership`, and returns an ID token from `claims.ts`: `iss`, `sub` `steam:<steamid64>`, `aud` the client id, `mr_ent`, `iat`, `exp` one hour. No refresh token: the desktop exchanges a fresh ticket. `rateLimit.ts` holds the per-SteamID and per-IP windows.

- **acs-3.1:** WHEN a ticket that Steam authenticates for an entitled player is exchanged, THE SYSTEM SHALL return an ID token signed with the current key whose claims are exactly those `claims.ts` names.

- **acs-3.2:** WHEN the ticket is refused by Steam, was made for another identity string, or belongs to a player who is not entitled, THE SYSTEM SHALL return `invalid_grant` with one fixed description and issue nothing.

- **acs-3.3:** WHEN a SteamID or an IP exceeds its window, THE SYSTEM SHALL refuse further exchanges until the window passes, without calling Steam.

- **acs-3.4:** WHEN a token from this grant is checked with the key set from acs-1.1, THE SYSTEM SHALL verify it, and a token whose `exp` has passed SHALL not verify.
- DoD: acs-3.1 to acs-3.4 green; `just ci` green.

### acs-4 — the browser sign-in: Steam OpenID behind authorization code and PKCE

type: feature · tier: hard
touches: account-service/src/interactions/router.ts, account-service/src/interactions/router.test.ts, account-service/src/interactions/steamOpenId.ts, account-service/src/interactions/steamOpenId.test.ts, account-service/src/interactions/pages.ts, account-service/src/interactions/pages.test.ts, account-service/src/interactions/flow.integration.test.ts, account-service/src/provider.ts, account-service/src/claims.ts
after: [acs-3]
- Contract: the provider's authorization endpoint (code flow, PKCE S256 required, one registered redirect per client) hands its interaction to `router.ts`, which redirects to Steam's OpenID login with `return_to` exactly our callback and `realm` our origin. `steamOpenId.ts` verifies the reply: Steam answers `is_valid:true` to `check_authentication`; `op_endpoint`, `return_to` and the interaction's state match exactly; `claimed_id` matches `^https://steamcommunity\.com/openid/id/(\d{17})$`; `response_nonce` was not seen within its window. The ownership rule then decides; an entitled player finishes the interaction as `steam:<steamid64>`. Refresh tokens rotate; reuse of a rotated one revokes its chain; every refresh re-checks ownership. `pages.ts` renders the not-owned page with the store link and nothing about the player.

- **acs-4.1:** WHEN an entitled player completes the flow against the stub, THE SYSTEM SHALL return an authorization code exchangeable once, within 60 seconds, with the matching PKCE verifier, for the same token shape as acs-3.1 plus a refresh token.

- **acs-4.2:** WHEN Steam's reply fails any one of the checks in the contract (each tested alone: `is_valid:false`, another endpoint, another `return_to`, a mismatched state, a malformed claimed id, a reused nonce), THE SYSTEM SHALL end the sign-in with no code and no account.

- **acs-4.3:** WHEN the player is not entitled, THE SYSTEM SHALL show the not-owned page and issue no code.

- **acs-4.4:** WHEN a refresh token is used, THE SYSTEM SHALL issue a new one and invalidate it, and WHEN an invalidated one is presented, THE SYSTEM SHALL revoke every token of that chain.

- **acs-4.5:** WHEN a refresh finds the player no longer entitled or on the deny-list, THE SYSTEM SHALL refuse it and revoke the chain.

- **acs-4.6:** WHEN the same player signs in through the ticket grant and through the browser, THE SYSTEM SHALL issue tokens with the same `sub`.
- DoD: acs-4.1 to acs-4.6 green; `just ci` green.

### acs-5 — the dev issuer: email and password for development and QA

type: feature · tier: routine
touches: account-service/src/interactions/devPassword.ts, account-service/src/interactions/devPassword.test.ts, account-service/src/admin/cli.ts, account-service/src/admin/cli.test.ts, account-service/src/interactions/router.ts, account-service/src/config.ts, account-service/src/config.test.ts, docs/account-service.md
after: [acs-4]
- Contract: a deployment whose config enables the dev method serves a password form in place of Steam (argon2id hashes, accounts created and reset only by `admin/cli.ts`, no sign-up and no reset mail) and issues `sub` `dev:<uuid>` with `mr_ent`, under its own issuer name and keys. acs-1.2 already refuses it beside a production issuer.

- **acs-5.1:** WHEN a dev account signs in with the right password, THE SYSTEM SHALL issue tokens through the same code flow as acs-4.1 with `sub` `dev:<uuid>`.

- **acs-5.2:** WHEN a wrong password is given five times for one account within ten minutes, THE SYSTEM SHALL refuse that account's attempts until the ten minutes pass, and the answer SHALL not say whether the account exists.

- **acs-5.3:** WHEN the admin command creates or resets an account, THE SYSTEM SHALL store only the argon2id hash, and the command SHALL refuse to run against a production config.
- DoD: acs-5.1 to acs-5.3 green; `just ci` green.

### acs-6 — the attestation route

type: feature · tier: hard
touches: account-service/src/attest.ts, account-service/src/attest.test.ts, account-service/src/keys.ts, account-service/src/keys.test.ts, account-service/src/server.ts, account-service/src/rateLimit.ts, account-service/src/rateLimit.test.ts, docs/account-service.md
after: [acs-3]
- Contract: `POST /attest` takes a bearer ID token from this issuer and `{world, nonce}` (the world's identifier as lpw-8 (c) defines it, and the nonce that world issued). It returns a compact JWT signed with the attestation key (its own `kid`, its own issuer name `<issuer>/attest`, never the login key): `sub` the account, `aud` the world, `nonce`, `mr_ent`, `iat`, `exp` five minutes, `jti`. The route logs the account and the time, never the world. The public attestation keys are published as a file the module embeds as data (lpw-15).

- **acs-6.1:** WHEN an entitled account's valid token asks for an attestation, THE SYSTEM SHALL return one signed by the attestation key whose claims are exactly those in the contract.

- **acs-6.2:** WHEN the bearer token is missing, expired, from another issuer, or lacks `mr_ent`, THE SYSTEM SHALL refuse with no attestation.

- **acs-6.3:** WHEN an account exceeds 20 attestations in an hour, THE SYSTEM SHALL refuse further ones until the window passes.

- **acs-6.4:** WHEN an attestation is checked against the login key set, THE SYSTEM SHALL not verify it, and a login token checked against the attestation keys SHALL not verify (the keys are disjoint).

- **acs-6.5:** WHEN any request to the route is logged, THE SYSTEM SHALL log no world identifier and no nonce.
- DoD: acs-6.1 to acs-6.5 green; `just ci` green.

### acs-7 — deployment: the container, the runbook, and the official issuer turned on

type: feature · tier: hard
touches: account-service/Dockerfile, ops/auth/docker-compose.yml, ops/auth/.env.example, ops/auth/README.md, docs/runbooks/observability-dr.md, docs/runbooks/account-service.md, docs/account-service.md, server-module/src/accounts.rs, server-module/src/accounts_tests.rs
after: [acs-4, acs-6, acs-8]
blocked: operator-steamworks-and-hosting — lifted when the operator records the Steam app id, stores the publisher key in the deployment's secret store, and records the host and the issuer's domain in `docs/account-service.md` (operator questions); fallback: none — the official server's sign-in and every world's binding wait.
- Contract: the account service replaces the never-deployed Better Auth recipe in `ops/auth/` and its section in `docs/runbooks/observability-dr.md` (§7, identity provider): the recipe becomes this service's compose file and README, and §7 points at the new runbook. One container image with a non-root user and a read-only root file system; the database on a volume with an hourly backup; discovery and keys copied to the CDN on every key change; keys in the host's KMS through `oidc-provider`'s external signing. The runbook covers deploy, key rotation (next key published, then promoted, then the old retired), restore, and revoking a player. `ALLOWED_ISSUERS` and `ALLOWED_AUDIENCE` in `accounts.rs` take the real values, and `audience_allowed` tightens to exact single-value equality, as that constant's sequencing note requires.

- **acs-7.1:** WHEN the image runs, THE SYSTEM SHALL run as a non-root user with a read-only root file system and refuse to start without its secrets.

- **acs-7.2:** WHEN the deployed service is exercised with a real Steam ticket and a real browser sign-in by an owning account and by a non-owning account (the operator's two accounts), THE SYSTEM SHALL issue tokens only to the owner, recorded in the runbook.

- **acs-7.3:** WHEN a token from the deployed issuer connects to a module built with the real `ALLOWED_ISSUERS`, THE SYSTEM SHALL provision its account, and a token whose audience list holds any other value SHALL be disconnected.

- **acs-7.4:** WHEN the backup is restored into a fresh volume, THE SYSTEM SHALL keep every refresh-token chain and dev account (a restore drill recorded in the runbook).
- DoD: acs-7.1 to acs-7.4 green; `just ci` green; the runbook complete.

### acs-8 — the official server admits only entitled accounts

type: feature · tier: hard
touches: server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/lib.rs, server-module/Cargo.toml, evals/account-e2e.eval.mjs, justfile
after: [lpw-9, acs-3]
- Contract: one function `entitled(ctx)` in `accounts.rs`, called by `join_game` before any write: on a build that enforces ownership (lpw-8 (e), merged before lpw-9, decides how a build says so; test and dev builds do not), the caller's connection must carry a token from an allowed issuer whose `mr_ent` names `base-game`, or (from lpw-15) a world binding that carried it. `join_game` is the only door to a player row, so every gameplay reducer inherits the rule. The game's `docs/DECISIONS.md` "Accounts, guest identity and the claim flow" is amended in place: anonymous connections are accepted but cannot join on an enforcing build.

- **acs-8.1:** WHEN an anonymous connection calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with one fixed error and write nothing.

- **acs-8.2:** WHEN a connection whose token lacks `mr_ent` (or names no `base-game`) calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with the same error.

- **acs-8.3:** WHEN an entitled account calls `join_game`, THE SYSTEM SHALL proceed as today.

- **acs-8.4:** WHEN the e2e suite runs on a test build, THE SYSTEM SHALL let anonymous connections join as today (the suite's existing joins are the control).

- **acs-8.5:** WHEN a release build is produced by the recipe that ships modules, THE SYSTEM SHALL enforce ownership (the recipe's test builds the module and checks the switch).
- DoD: acs-8.1 to acs-8.5 green; `just ci` and the e2e suite green.

### acs-9 — the client asks a player to sign in before playing

type: feature · tier: hard
touches: client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/signin-gate.spec.ts
after: [acs-4, acs-8, lpw-4]
- Contract: toward an `official` or `test` target on an enforcing server, the first screen offers only "Sign in with Steam" (the existing OIDC flow, pointed at our issuer) before play; the error from acs-8.1 shows a "You need to own Monster Realm on Steam" message with the store link, never a raw reducer string. The provider label stays the build value (`VITE_MR_OIDC_PROVIDER_NAME`).

- **acs-9.1:** WHEN the client connects to an enforcing server without an account, THE CLIENT SHALL show the sign-in screen and call `join_game` only after sign-in.

- **acs-9.2:** WHEN `join_game` is refused for ownership, THE CLIENT SHALL show the not-owned message with the store link and offer sign-in again.

- **acs-9.3:** WHEN the target is `local` or `private`, THE CLIENT SHALL not show this screen (lpw-15 owns the binding prompt there).

- **acs-9.4:** WHEN the sign-in screen is shown, THE CLIENT SHALL be navigable with the arrow keys, Enter as A and Escape as B, and every string SHALL come from the catalogs in both locales.
- DoD: acs-9.1 to acs-9.4 green; `just ci` and the new e2e green.

### acs-10 — the desktop shell signs in with Steam

type: feature · tier: hard
touches: desktop/src/steamTicket.ts, desktop/src/steamTicket.test.ts, desktop/src/preload.ts, desktop/src/main.ts, desktop/package.json, desktop/package-lock.json, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/main.ts
after: [lpw-11, acs-3, acs-9]
blocked: operator-steam-machine — transitively, through lpw-11 (M-local-play); fallback: the shell uses acs-4's browser sign-in in its own window.
- Contract: the shell's main process gets a ticket with `steamworks.js` `getAuthTicketForWebApi("monster-realm-account")` (version pinned against the shell's Electron), exchanges it at acs-3's grant, and hands the page an ID token through the preload hook as one more `ConnectCredential` source; the page never sees the ticket. The same source serves lpw-15's attestation request in the shell.

- **acs-10.1:** WHEN the shell starts toward an `official` target with Steam running, THE SYSTEM SHALL sign the player in with no prompt and connect with the issued token.

- **acs-10.2:** WHEN Steam is not running or the exchange is refused, THE SYSTEM SHALL show acs-9's sign-in screen with the reason, and SHALL not fall back to anonymous play on an enforcing server.

- **acs-10.3:** WHEN a token nears expiry, THE SYSTEM SHALL exchange a fresh ticket before it expires.
- DoD: acs-10.1 to acs-10.3 green; `just desktop-test` and `just ci` green.

## Post-integration verification

- `just ci` green with every merged `acs-` slice; the account service's tests never reach Steam.
- Against the deployed issuer (acs-7): an owning operator account signs in on the desktop and in a
  browser as one `sub`; a non-owning account is refused in both; a refund or deny-list entry stops
  the official server within an hour.
- With M-local-play lpw-15: a browser player and a desktop player each bind a friend's world with an
  attestation and play; a non-owner cannot bind; a bound world reopens with the network down.
