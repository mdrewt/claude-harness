# Spec: M-account-service — accounts, ownership and attestations (dev issuer now, Steam later)

**Status:** authored 2026-11-16 from the operator's rulings on monster-realm#821 and the same
day's follow-ups; revised the same day into two phases (the operator supplies the Steam app id and
publisher key about two months before early access); the slices are the `### acs-` sections under "Slices", against game `master`
`08d4d12f` · **Project:** monster-realm (a new `account-service/` package, the server module, the
client, the desktop shell) · **Design SSOT:** the game's `docs/DECISIONS.md` entries "Every player
must own the game on Steam, for now", "The account service is our own small OIDC issuer; Steam is
the only player sign-in" and "A private world verifies an account by a per-world attestation our
account service signs" · **Target:** the early-access release (ownership on every world) and the
official server (sign-in). **Anchors are symbols and files, never line numbers.** **Doctrine:**
`standards/testing-tdd.md` (no new eval scripts, source-text scans or checks-of-checks).

Slice ids use the `acs-` prefix. Build order is file order. A slice carrying `blocked:` is skipped
until its lifting event.

- **Phase 1 — the dev and test account service (acs-1 to acs-7), now.** The same service and token
  shape as production, with an email-and-password sign-in step in place of Steam and an
  entitlement each dev account carries or lacks as an admin sets it. It runs on `localhost` for
  development and tests, and at `auth.monster-realm.spookyowltech.com` for testing from other
  machines. Everything that consumes accounts (the attestation, the module's ownership rule, the
  client's sign-in screen, M-local-play's world binding) builds and tests against it.
- **Phase 2 — Steam and production (acs-8 to acs-12),** `blocked:operator-steamworks` until the
  operator supplies the Steam app id and publisher Web API key (planned about two months before
  early access). It adds the Steam sign-in steps and the ownership check behind the same token
  shape, so nothing built in phase 1 changes but configuration.

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
   also carries the entitlement, and every player of a `local` or `private` world binds.
3. **A sign-in for browser players that proves ownership.** Steam's OpenID 2.0 proves a Steam
   account, not a purchase, so the service checks the licence with `CheckAppOwnership` before it
   issues anything.

One service does all three: an OIDC provider built on `oidc-provider` (MIT, OpenID Certified,
v9.x). Its sign-in step is a pluggable method: the dev method now, the two Steam methods in phase
2. Every method yields the same token shape (`sub`, `aud`, `mr_ent`), so the module, the client and
the attestation never learn which method signed a player in.

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
| The Steam sign-in methods and the ownership check | phase 2 (acs-8 to acs-12) | The operator supplies the Steam app id and publisher key about two months before early access; phase 1 uses the dev method's per-account entitlement in their place |
| The production issuer's location | acs-11 (the operator names it) | `spookyowltech.com` hosts dev and test only, until the operator chooses where production runs |
| Guest (anonymous) play on the official server | the operator ("for now") | Ownership is required; the guest claim flow (`start_guest_claim`/`complete_guest_claim`) stays built and tested but no guest reaches `join_game` on an enforcing build (acs-6) |
| High availability (a second instance, Postgres) | after the official server's first month | One instance with SQLite on a volume and an hourly backup; discovery and keys are cached by every host for minutes to hours, so a short outage blocks only new sign-ins and new binds |
| SpacetimeAuth as the issuer | revisit if it gains Steam sign-in for browsers and SteamID subjects | Browser players must prove ownership; its subject is not the SteamID, so a browser and a desktop session would be two accounts |
| Steam game-server auth (`BeginAuthSession`) on friends' servers | none for now | Browser players need the attestation anyway; one mechanism, not two |
| A holder-bound credential instead of the per-world attestation | the "upgrade path" in the attestation decision | Unchanged from monster-realm#821 |
| Non-Steam sign-in methods for players (Google, Discord, …) | none while ownership is Steam-only | A method that cannot prove a Steam licence cannot satisfy the ownership rule |
| Ownership re-checked inside an existing world binding | accepted risk (below) | A binding is permanent and offline by design |

## Decisions the operator owns (defaults recorded; each reversible)

- `decision-defaulted:account-service-stack=node-ts-oidc-provider-in-game-repo` — TypeScript on the
  Node version the repo pins, `oidc-provider` 9.x, `jose` for the attestation, one package at
  `account-service/` in the game repo with its own lockfile and CI job (consumed by acs-1).
- `decision-defaulted:account-store=sqlite-single-instance` — provider storage, refresh tokens,
  pending sign-ins, the deny-list, dev accounts and (phase 2) Steam reply nonces in one SQLite file
  (consumed by acs-1).
- `decision-defaulted:dev-issuers=localhost-4455-and-auth-monster-realm-spookyowltech-com` — the
  local dev issuer is `http://localhost:4455`, the hosted dev and test issuer
  `https://auth.monster-realm.spookyowltech.com` (the operator's domain; `monster-realm` gets its own
  subdomain, and services live under it). Each has its own keys; test and dev builds of the module
  trust both, release builds trust neither (consumed by acs-1, acs-5, acs-6).
- `decision-defaulted:dev-entitlement=per-account-admin-flag-default-entitled` — a dev account
  carries `mr_ent` unless the admin command creates it without, so the not-owned path is testable
  with no Steam account (consumed by acs-2).
- `decision-defaulted:hosted-dev-host=operator-choice-recommend-small-vps-or-tunnel` — the hosted dev
  instance runs acs-4's recipe on whatever host the operator points the subdomain at; recommended a
  small VPS, or the dev machine behind a tunnel, with Caddy obtaining the certificate (consumed by
  acs-5).
- `decision-defaulted:ownership=permanent-licence-held-by-the-player` — (phase 2) entitled when
  `CheckAppOwnership` reports `ownsapp`, `permanent`, not `sitelicense`, and `ownersteamid` equal to
  the player's SteamID: a Family Sharing borrower, a free weekend and a PC café do not count, a
  refund removes entitlement at the next issuance (consumed by acs-8). Relaxing it is one policy
  function.
- `decision-defaulted:token-lifetimes=id-1h-refresh-30d-rotating-attestation-5m` — entitlement is
  re-read at every issuance, so a refund, ban or dev-flag change reaches the official server within
  an hour (consumed by acs-2, acs-3, acs-9, acs-10).
- `decision-defaulted:subjects=steam-steamid64-and-dev-uuid` — `sub` is `steam:<steamid64>` for both
  Steam methods and `dev:<uuid>` for dev accounts (consumed by acs-2, acs-9, acs-10).
- `decision-defaulted:entitlement-claim=mr_ent-base-game` — the ID token and the attestation carry
  `mr_ent: ["base-game"]`, issued only to entitled players; the module checks the claim, not the
  issuer alone, so a later free tier is an issuance change (consumed by acs-2, acs-3, acs-6, lpw-15).
- `decision-defaulted:steam-ticket-identity=monster-realm-account` — (phase 2) the identity string
  the shell passes to `GetAuthTicketForWebApi` and the service passes to `AuthenticateUserTicket`
  (consumed by acs-9, acs-12).
- `decision-defaulted:rate-limits=ticket-30h-per-steamid-60m-per-ip-attest-20h-dev-5-per-10m` —
  ticket exchanges 30 an hour per SteamID and 60 a minute per IP; attestations 20 an hour per
  account; dev password failures 5 per 10 minutes per account (consumed by acs-2, acs-3, acs-9).

## Operator questions (open)

- **Hosted dev instance (operator-owned).** The operator points
  `auth.monster-realm.spookyowltech.com` at a host that can run acs-4's recipe and records the host
  in the game's `docs/account-service.md`. Until then development and tests use `localhost` only;
  acs-5 waits.
- **Steamworks app and publisher key (operator-owned; planned about two months before early
  access).** The service needs the game's Steam app id and a publisher Web API key; the shell needs
  the app id. Lifting event for `blocked:operator-steamworks`: the operator records the app id in
  `docs/account-service.md` and stores the publisher key in the production deployment's secret
  store.
- **Production host and issuer domain (operator-owned, with the Steam inputs).** Where production
  runs and the issuer URL every release module will trust. Recommended: one small container with a
  persistent volume on a managed host, discovery and keys behind a CDN, signing keys in that host's
  KMS.

## Risks / flags

- **Phase 2 lands about two months before early access.** Four slices (acs-8 to acs-11) and the
  shell's (acs-12) fit that window only because phase 1 already built the provider, the token
  shape, the attestation, the module's rule and the client screen; phase 2 adds sign-in steps and
  configuration. Valve's response fields are re-confirmed against its partner documentation when
  phase 2 starts (acs-8).
- **A dev issuer must never be trusted by a release build.** The dev issuers' keys are ours but
  their accounts are made by an admin command, so a release module that trusted one would admit
  anyone the admin made. acs-6 makes the trusted issuer list a property of the build, and its test
  checks the release recipe lists neither dev issuer.
- **The issuer is a single point of failure for new sign-ins and new binds.** Hosts cache the key
  set (SpacetimeDB 2.11.0: refreshed after 300 s, dropped after 7,200 s), so play continues for
  connected and bound players; the CDN serves discovery and keys independently of the container.
- **Ownership inside a bound world is checked once.** A player refunded after binding keeps
  playing in that world until its host removes them; every other world and the official server
  see the refund at the next issuance. Accepted: a binding is offline by design.
- **A host can patch the module it runs** and switch ownership off on its own server. Accepted:
  ownership on a self-hosted server is as strong as the host's own build; the official server and
  every unmodified build enforce it.
- **The publisher key opens every partner API for the app.** It lives only in the production
  deployment's secret store, is read by one module (`steam/webApi.ts`), and never appears in a log,
  an error or a response.
- **Steam's OpenID reply is the weakest input.** It is checked by Steam (`check_authentication`),
  and its return address, endpoint, claimed id and single-use nonce are checked by us; a failure of
  any one ends the sign-in.

## Slices

### acs-1 — the account service: a provider that serves discovery and keys, runnable on localhost

type: feature · tier: hard
touches: account-service/package.json, account-service/package-lock.json, account-service/tsconfig.json, account-service/vitest.config.ts, account-service/src/server.ts, account-service/src/config.ts, account-service/src/config.test.ts, account-service/src/provider.ts, account-service/src/provider.test.ts, account-service/src/store/sqliteAdapter.ts, account-service/src/store/sqliteAdapter.test.ts, account-service/src/keys.ts, account-service/src/keys.test.ts, docs/account-service.md, justfile, .github/workflows/ci.yml, biome.json, .gitignore
after: []
- Contract: `server.ts` starts `oidc-provider` 9.x from `config.ts`, which loads one of three profiles: `local-dev` (issuer `http://localhost:4455`), `hosted-dev` (issuer `https://auth.monster-realm.spookyowltech.com`) and `production` (issuer, Steam app id and key reference supplied in phase 2). `keys.ts` loads ES256 signing keys by `kid` from a file (dev) or an external signer (production) and publishes only public keys; `local-dev` generates its keys on first start into a gitignored directory. `sqliteAdapter.ts` implements the provider's adapter contract. `just account-dev` runs the `local-dev` profile; `just account-test` runs the package's tests and joins `just ci`. `docs/account-service.md` records the design, the profiles, the operator inputs and the runbook headings.

- **acs-1.1:** WHEN the service starts, THE SYSTEM SHALL serve `/.well-known/openid-configuration` naming its profile's issuer, and a key set holding only public ES256 keys, each with its `kid`.

- **acs-1.2:** WHEN the `production` profile is loaded with any dev-only setting (the dev password method, a dev issuer, a key file marked dev, an `http:` issuer), or a dev profile is loaded with a production issuer or a Steam publisher key, THE SYSTEM SHALL refuse to start and name the setting.

- **acs-1.3:** WHEN an adapter record is written, read, consumed and expired through `sqliteAdapter.ts`, THE SYSTEM SHALL meet the provider's adapter contract, and a consumed or expired record SHALL read as absent.

- **acs-1.4:** WHEN `just account-dev` runs on a clean checkout, THE SYSTEM SHALL serve discovery at `http://localhost:4455` with keys it generated, and a second start SHALL reuse them.

- **acs-1.5:** WHEN `just ci` runs, THE SYSTEM SHALL run the package's lint, typecheck and tests.
- DoD: acs-1.1 to acs-1.5 green; `just ci` green.

### acs-2 — the dev sign-in: email and password behind authorization code and PKCE

type: feature · tier: hard
touches: account-service/src/interactions/router.ts, account-service/src/interactions/router.test.ts, account-service/src/interactions/devPassword.ts, account-service/src/interactions/devPassword.test.ts, account-service/src/interactions/pages.ts, account-service/src/interactions/pages.test.ts, account-service/src/interactions/flow.integration.test.ts, account-service/src/claims.ts, account-service/src/claims.test.ts, account-service/src/rateLimit.ts, account-service/src/rateLimit.test.ts, account-service/src/admin/cli.ts, account-service/src/admin/cli.test.ts, account-service/src/provider.ts, docs/account-service.md
after: [acs-1]
- Contract: the provider's authorization endpoint (code flow, PKCE S256 required, one registered redirect per client; the game client is a public client) hands its interaction to `router.ts`, which in the dev profiles shows the password form (`devPassword.ts`, argon2id hashes). Accounts are created, reset and flagged only by `admin/cli.ts` (no sign-up, no reset mail); each carries an entitlement flag, entitled unless created without. `claims.ts` builds the ID token: `iss`, `sub` `dev:<uuid>`, `aud` the client id, `mr_ent` only when entitled, `iat`, `exp` one hour. Refresh tokens rotate; reuse of a rotated one revokes its chain; every refresh re-reads the account's flag. `pages.ts` renders the form and the not-owned page, which names nothing about the account. The router is the seam phase 2's Steam methods plug into.

- **acs-2.1:** WHEN an entitled dev account signs in with the right password, THE SYSTEM SHALL return an authorization code exchangeable once, within 60 seconds, with the matching PKCE verifier, for an ID token whose claims are exactly those `claims.ts` names, and a refresh token.

- **acs-2.2:** WHEN a dev account created without entitlement signs in, THE SYSTEM SHALL show the not-owned page and issue no code.

- **acs-2.3:** WHEN a wrong password is given five times for one account within ten minutes, THE SYSTEM SHALL refuse that account's attempts until the ten minutes pass, and no answer SHALL say whether the account exists.

- **acs-2.4:** WHEN a refresh token is used, THE SYSTEM SHALL issue a new one and invalidate it, and WHEN an invalidated one is presented, THE SYSTEM SHALL revoke every token of that chain.

- **acs-2.5:** WHEN a refresh finds the account's entitlement removed, THE SYSTEM SHALL refuse it and revoke the chain.

- **acs-2.6:** WHEN the admin command creates or resets an account, THE SYSTEM SHALL store only the argon2id hash, and the command SHALL refuse to run against the `production` profile.

- **acs-2.7:** WHEN a token from this flow is checked with the key set from acs-1.1, THE SYSTEM SHALL verify it, and a token whose `exp` has passed SHALL not verify.
- DoD: acs-2.1 to acs-2.7 green; `just ci` green.

### acs-3 — the attestation route

type: feature · tier: hard
touches: account-service/src/attest.ts, account-service/src/attest.test.ts, account-service/src/keys.ts, account-service/src/keys.test.ts, account-service/src/server.ts, account-service/src/rateLimit.ts, account-service/src/rateLimit.test.ts, docs/account-service.md
after: [acs-2]
- Contract: `POST /attest` takes a bearer ID token from this issuer and `{world, nonce}` (the world's identifier as M-local-play lpw-8 (c) defines it, and the nonce that world issued). It returns a compact JWT signed with the attestation key (its own `kid`, its own issuer name `<issuer>/attest`, never the login key): `sub` the account, `aud` the world, `nonce`, `mr_ent`, `iat`, `exp` five minutes, `jti`. The route logs the account and the time, never the world. The public attestation keys of each profile are published as a file the module embeds as data (lpw-15); a dev build embeds the dev profiles' keys, a release build the production keys.

- **acs-3.1:** WHEN an entitled account's valid token asks for an attestation, THE SYSTEM SHALL return one signed by the attestation key whose claims are exactly those in the contract.

- **acs-3.2:** WHEN the bearer token is missing, expired, from another issuer, or lacks `mr_ent`, THE SYSTEM SHALL refuse with no attestation.

- **acs-3.3:** WHEN an account exceeds 20 attestations in an hour, THE SYSTEM SHALL refuse further ones until the window passes.

- **acs-3.4:** WHEN an attestation is checked against the login key set, THE SYSTEM SHALL not verify it, and a login token checked against the attestation keys SHALL not verify (the keys are disjoint).

- **acs-3.5:** WHEN any request to the route is logged, THE SYSTEM SHALL log no world identifier and no nonce.
- DoD: acs-3.1 to acs-3.5 green; `just ci` green.

### acs-4 — the deployment recipe: one container, Caddy in front, a runbook

type: feature · tier: routine
touches: account-service/Dockerfile, ops/auth/docker-compose.yml, ops/auth/Caddyfile, ops/auth/.env.example, ops/auth/README.md, docs/runbooks/observability-dr.md, docs/runbooks/account-service.md, docs/account-service.md
after: [acs-3]
- Contract: the account service replaces the never-deployed Better Auth recipe in `ops/auth/` and its section in `docs/runbooks/observability-dr.md` (§7 points at the new runbook). The image runs as a non-root user with a read-only root file system; the database and keys sit on volumes; Caddy (as `ops/observability/` already uses) terminates TLS with an ACME certificate for the profile's host name, or serves plain `http://localhost:4455` for `local-dev`. The runbook covers start, admin accounts, key rotation (next key published, then promoted, then the old retired), backup and restore, and moving to another host.

- **acs-4.1:** WHEN the image runs, THE SYSTEM SHALL run as a non-root user with a read-only root file system and refuse to start without its profile's secrets.

- **acs-4.2:** WHEN `docker compose` brings up the recipe in `ops/auth/` with the `local-dev` profile, THE SYSTEM SHALL serve discovery at `http://localhost:4455` and keep its database and keys across a restart.

- **acs-4.3:** WHEN a backup is restored into fresh volumes, THE SYSTEM SHALL keep every account, refresh-token chain and key (a drill recorded in the runbook).
- DoD: acs-4.1 to acs-4.3 green; `just ci` green; the runbook complete.

### acs-5 — the hosted dev and test instance at auth.monster-realm.spookyowltech.com

type: feature · tier: routine
touches: docs/runbooks/account-service.md, docs/account-service.md
after: [acs-4]
blocked: operator-dev-host — lifted when the operator points `auth.monster-realm.spookyowltech.com` at a host that can run acs-4's recipe and records the host in `docs/account-service.md` (operator questions); fallback: development and tests use `localhost` only.
- Contract: acs-4's recipe with the `hosted-dev` profile on the operator's host; the runbook records the deployment, the admin accounts made for testers (no passwords in the repo) and the smoke results.

- **acs-5.1:** WHEN the hosted instance is deployed, THE SYSTEM SHALL serve discovery and keys at `https://auth.monster-realm.spookyowltech.com` under a publicly trusted certificate, and the runbook SHALL record the check.

- **acs-5.2:** WHEN a dev build of the client and module, run on another machine, signs in an entitled and a not-entitled tester account against the hosted instance, THE SYSTEM SHALL let only the entitled one join, recorded in the runbook.
- Testers use private worlds on dev builds only with acs-13's build (operator, 2026-11-22, monster-realm#849).
- DoD: acs-5.1 and acs-5.2 recorded; `just ci` green.

### acs-6 — the module trusts issuers by build and admits only entitled players

type: feature · tier: hard
touches: server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/lib.rs, server-module/Cargo.toml, evals/account-e2e.eval.mjs, justfile
after: [lpw-9, acs-2]
- Contract: the trusted issuer list becomes a property of the build (lpw-8 (e) designs the build input, merged before lpw-9): test and dev builds trust the two dev issuers; release builds trust only the production issuer, which stays the fail-closed `.invalid` placeholder until acs-11. One function `entitled(ctx)` in `accounts.rs`, called by `join_game` before any write: on an enforcing build the caller's connection must carry a token from a trusted issuer whose `mr_ent` names `base-game`, or (from lpw-15) a world binding that carried it. Release builds enforce; test builds do not, so the e2e suite's anonymous joins keep working; a dev-enforcing build (the dev issuers plus enforcement) is what developers and testers run against acs-1 or acs-5. `join_game` is the only door to a player row, so every gameplay reducer inherits the rule. The game's `docs/DECISIONS.md` "Accounts, guest identity and the claim flow" is amended in place: anonymous connections are accepted but cannot join on an enforcing build.

- **acs-6.1:** WHEN an anonymous connection calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with one fixed error and write nothing.

- **acs-6.2:** WHEN a connection whose token lacks `mr_ent` (or names no `base-game`) calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it with the same error.

- **acs-6.3:** WHEN an entitled account from a dev issuer calls `join_game` on a dev-enforcing build, THE SYSTEM SHALL proceed as today.

- **acs-6.4:** WHEN the e2e suite runs on a test build, THE SYSTEM SHALL let anonymous connections join as today (the suite's existing joins are the control).

- **acs-6.5:** WHEN a release build is produced by the recipe that ships modules, THE SYSTEM SHALL enforce ownership and trust neither dev issuer (the recipe's test builds the module and checks both).
- DoD: acs-6.1 to acs-6.5 green; `just ci` and the e2e suite green.

### acs-7 — the client asks a player to sign in before playing

type: feature · tier: hard
touches: client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/signin-gate.spec.ts
after: [acs-2, acs-6, lpw-4]
- Contract: toward an `official` or `test` target on an enforcing server, the first screen offers only sign-in (the existing OIDC flow, pointed at the build's issuer; the label is the build's `VITE_MR_OIDC_PROVIDER_NAME`, "Steam" in phase 2) before play; the error from acs-6.1 shows a "You need to own Monster Realm on Steam" message with the store link, never a raw reducer string. The e2e runs against the `local-dev` service with an entitled and a not-entitled dev account.

- **acs-7.1:** WHEN the client connects to an enforcing server without an account, THE CLIENT SHALL show the sign-in screen and call `join_game` only after sign-in.

- **acs-7.2:** WHEN `join_game` is refused for ownership, THE CLIENT SHALL show the not-owned message with the store link and offer sign-in again.

- **acs-7.3:** WHEN the target is `local` or `private`, THE CLIENT SHALL not show this screen (lpw-15 owns the binding prompt there).

- **acs-7.4:** WHEN the sign-in screen is shown, THE CLIENT SHALL be navigable with the arrow keys, Enter as A and Escape as B, and every string SHALL come from the catalogs in both locales.
- DoD: acs-7.1 to acs-7.4 green; `just ci` and the new e2e green.

### acs-8 — Steam checks and the ownership rule

type: feature · tier: hard
touches: account-service/src/steam/webApi.ts, account-service/src/steam/webApi.test.ts, account-service/src/steam/ownership.ts, account-service/src/steam/ownership.test.ts, account-service/src/denyList.ts, account-service/src/denyList.test.ts, account-service/test-util/steamStub.ts, docs/account-service.md
after: [acs-3]
blocked: operator-steamworks — lifted when the operator supplies the Steam app id and publisher Web API key (planned about two months before early access; operator questions); fallback: none — early access waits on phase 2.
- Contract: `webApi.ts` is the only reader of the publisher key: `authenticateTicket(ticket, identity)` and `checkAppOwnership(steamId)`, each with a timeout and no retry on a 4xx. `ownership.ts` is the pure rule `entitled(ownership, steamId)` from the ownership default. `denyList.ts` holds our own bans by SteamID. `steamStub.ts` is a local fake of the Steam Web API and OpenID endpoints every phase-2 test uses; no test reaches Steam. The slice first confirms the response fields against Valve's current partner documentation and records them in `docs/account-service.md`.

- **acs-8.1:** WHEN `entitled` is given each combination of `ownsapp`, `permanent`, `sitelicense` and an `ownersteamid` equal to or different from the player's, THE SYSTEM SHALL return true only for an owned, permanent, non-site licence held by the player.

- **acs-8.2:** WHEN Steam answers with an error, a timeout or a body that does not parse, THE SYSTEM SHALL treat the player as not entitled and SHALL put no Steam response text in the error it returns.

- **acs-8.3:** WHEN any request, response or error is logged, THE SYSTEM SHALL log neither the publisher key nor a ticket (a test captures every log line of a full exchange against the stub).

- **acs-8.4:** WHEN a SteamID is on the deny-list, THE SYSTEM SHALL treat it as not entitled whatever Steam answers.
- DoD: acs-8.1 to acs-8.4 green; `just ci` green.

### acs-9 — the desktop sign-in: a Steam ticket for an ID token

type: feature · tier: hard
touches: account-service/src/grants/steamTicket.ts, account-service/src/grants/steamTicket.test.ts, account-service/src/claims.ts, account-service/src/claims.test.ts, account-service/src/rateLimit.ts, account-service/src/rateLimit.test.ts, account-service/src/provider.ts
after: [acs-8]
blocked: operator-steamworks — as acs-8.
- Contract: a grant `urn:monster-realm:steam-ticket` (`registerGrantType`) takes `steam_ticket` (hex) and the client id, calls `authenticateTicket` with the identity default and `checkAppOwnership`, and returns an ID token from `claims.ts` with `sub` `steam:<steamid64>` and the same claims as acs-2.1. No refresh token: the desktop exchanges a fresh ticket.

- **acs-9.1:** WHEN a ticket that Steam authenticates for an entitled player is exchanged, THE SYSTEM SHALL return an ID token whose claims are exactly those `claims.ts` names, with `sub` `steam:<steamid64>`.

- **acs-9.2:** WHEN the ticket is refused by Steam, was made for another identity string, or belongs to a player who is not entitled, THE SYSTEM SHALL return `invalid_grant` with one fixed description and issue nothing.

- **acs-9.3:** WHEN a SteamID or an IP exceeds its window, THE SYSTEM SHALL refuse further exchanges until the window passes, without calling Steam.
- DoD: acs-9.1 to acs-9.3 green; `just ci` green.

### acs-10 — the browser sign-in: Steam OpenID as the production sign-in step

type: feature · tier: hard
touches: account-service/src/interactions/router.ts, account-service/src/interactions/router.test.ts, account-service/src/interactions/steamOpenId.ts, account-service/src/interactions/steamOpenId.test.ts, account-service/src/interactions/pages.ts, account-service/src/interactions/pages.test.ts, account-service/src/interactions/flow.integration.test.ts, account-service/src/claims.ts
after: [acs-9]
blocked: operator-steamworks — as acs-8.
- Contract: in the `production` profile `router.ts` redirects the interaction to Steam's OpenID login with `return_to` exactly our callback and `realm` our origin; the dev profiles keep the password form. `steamOpenId.ts` verifies the reply: Steam answers `is_valid:true` to `check_authentication`; `op_endpoint`, `return_to` and the interaction's state match exactly; `claimed_id` matches `^https://steamcommunity\.com/openid/id/(\d{17})$`; `response_nonce` was not seen within its window. The ownership rule then decides; an entitled player finishes as `steam:<steamid64>`, through acs-2's code, PKCE and refresh machinery; every refresh re-checks ownership.

- **acs-10.1:** WHEN an entitled Steam player completes the flow against the stub, THE SYSTEM SHALL return a code exchangeable for the same token shape as acs-2.1 with `sub` `steam:<steamid64>`.

- **acs-10.2:** WHEN Steam's reply fails any one of the checks in the contract (each tested alone: `is_valid:false`, another endpoint, another `return_to`, a mismatched state, a malformed claimed id, a reused nonce), THE SYSTEM SHALL end the sign-in with no code and no account.

- **acs-10.3:** WHEN the Steam player is not entitled, or a refresh finds them no longer entitled or on the deny-list, THE SYSTEM SHALL issue nothing and revoke any chain.

- **acs-10.4:** WHEN the same player signs in through the ticket grant and through the browser, THE SYSTEM SHALL issue tokens with the same `sub`.
- DoD: acs-10.1 to acs-10.4 green; `just ci` green.

### acs-11 — production: the issuer deployed and release builds turned on

type: feature · tier: hard
touches: docs/runbooks/account-service.md, docs/account-service.md, ops/auth/.env.example, server-module/src/accounts.rs, server-module/src/accounts_tests.rs
after: [acs-4, acs-6, acs-10]
blocked: operator-steamworks — as acs-8, and the operator names the production host and issuer domain (operator questions).
- Contract: acs-4's recipe with the `production` profile on the operator's production host; signing keys in its KMS through `oidc-provider`'s external signing; discovery and keys copied to a CDN on every key change. The release build's trusted issuer takes the real production value, and `audience_allowed` tightens to exact single-value equality, as that constant's sequencing note requires.

- **acs-11.1:** WHEN the deployed production service is exercised with a real Steam ticket and a real browser sign-in by an owning account and by a non-owning account (the operator's two accounts), THE SYSTEM SHALL issue tokens only to the owner, recorded in the runbook.

- **acs-11.2:** WHEN a token from the production issuer connects to a release module, THE SYSTEM SHALL provision its account, and a token whose audience list holds any other value SHALL be disconnected.

- **acs-11.3:** WHEN a release module is built, THE SYSTEM SHALL trust the production issuer and no dev issuer (acs-6.5's test, now with the real value).
- DoD: acs-11.1 to acs-11.3 green; `just ci` green; the runbook complete.

### acs-12 — the desktop shell signs in with Steam

type: feature · tier: hard
touches: desktop/src/steamTicket.ts, desktop/src/steamTicket.test.ts, desktop/src/preload.ts, desktop/src/main.ts, desktop/package.json, desktop/package-lock.json, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/main.ts
after: [lpw-11, acs-7, acs-9]
blocked: operator-steamworks — as acs-8, and operator-steam-machine transitively through lpw-11 (M-local-play); fallback: the shell uses acs-10's browser sign-in in its own window.
- Contract: the shell's main process gets a ticket with `steamworks.js` `getAuthTicketForWebApi("monster-realm-account")` (version pinned against the shell's Electron), exchanges it at acs-9's grant, and hands the page an ID token through the preload hook as one more `ConnectCredential` source; the page never sees the ticket. The same source serves lpw-15's attestation request in the shell.

- **acs-12.1:** WHEN the shell starts toward an `official` target with Steam running, THE SYSTEM SHALL sign the player in with no prompt and connect with the issued token.

- **acs-12.2:** WHEN Steam is not running or the exchange is refused, THE SYSTEM SHALL show acs-7's sign-in screen with the reason, and SHALL not fall back to anonymous play on an enforcing server.

- **acs-12.3:** WHEN a token nears expiry, THE SYSTEM SHALL exchange a fresh ticket before it expires.
- DoD: acs-12.1 to acs-12.3 green; `just desktop-test` and `just ci` green.

### acs-13 — a dev build for other machines holds the hosted-dev attestation key alone

type: feature · tier: hard
touches: server-module/Cargo.toml, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, docs/local-play.md, docs/account-service.md
after: [acs-5, lpw-15]
- Decision: operator, 2026-11-22, monster-realm#849 (accepted the recommendation). The local-dev attestation key is derivable from the public repository, so a build that accepts it stops nobody in a private world. Closes R-acs-3-DEVKEY-FORGEABLE.
- Contract: one more build feature, for dev builds that testers reach from other machines: it trusts the hosted-dev login issuer and accepts only the attestation key acs-5 publishes, never the local-dev key; local development keeps today's dev build and the public key. A binding made under a key the build does not hold counts for nothing (lpw-15 records each binding's key). A release feature still wins over it, as over every dev feature.

- **acs-13.1:** WHEN the hosted-dev build verifies an attestation signed with the local-dev key, THE SYSTEM SHALL refuse it with no write.

- **acs-13.2:** WHEN the hosted-dev build verifies an attestation signed with the hosted-dev key that passes lpw-15.1's checks, THE SYSTEM SHALL record the binding.

- **acs-13.3:** WHEN an identity bound under the local-dev key calls `join_game` on the hosted-dev build, THE SYSTEM SHALL refuse it as unbound.

- **acs-13.4:** WHEN the hosted-dev feature is named with a release feature, THE SYSTEM SHALL build the release profile and accept no dev key.
- DoD: acs-13.1 to acs-13.4 green; `just ci` green; the game's `docs/DECISIONS.md` entry "Ownership is enforced unless a dev feature switches it off" amended in place.

## Post-integration verification

- Phase 1: `just ci` green with acs-1 to acs-7 merged; a developer runs `just account-dev`, makes an
  entitled and a not-entitled account with the admin command, and on a dev-enforcing build only the
  entitled one plays; with M-local-play lpw-15, both bind a `local` world through the attestation
  route and only the entitled one joins. From another machine the same holds against
  `auth.monster-realm.spookyowltech.com` (acs-5).
- Phase 2: against the production issuer (acs-11), an owning operator account signs in on the
  desktop and in a browser as one `sub`; a non-owning account is refused in both; a refund or
  deny-list entry stops the official server within an hour. The account service's tests never
  reach Steam.
