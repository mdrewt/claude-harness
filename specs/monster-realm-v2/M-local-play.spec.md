# Spec: M-local-play — single-player worlds and friends hosting

**Status:** elaborated 2026-11-16 (`lp-spec`); the slices are the `### lpw-` sections under "Slices" (lpw-28 and lpw-31 are not used); against game `master`
`63fc0b0a` (`84e3cd96` plus the doc-only #820) and `lpg-0`'s record (the game's
`docs/local-play.md`). The groundwork (LP0, LP1, LP10 as `lpg-0`, `lpg-1`, `lpg-10`) is built:
PLAN §Built · **Project:** monster-realm (client, server module, `game-core`, a new desktop shell
package) · **Design SSOT:** `game-design.md` §14 · **Target:** the early-access release.
**Anchors are symbols and files, never line numbers.** **Doctrine:** `standards/testing-tdd.md`
(no new eval scripts, source-text scans or checks-of-checks).

Slice ids use the `lpw-` prefix (`lp-` names the harness loop-infrastructure slices; `lpg-` the
groundwork). Build order is file order. A slice carrying `blocked:` is skipped until its lifting
event; lpw-1 to lpw-9 carry none and build first.

## Problem / intent

Early access is the Steam build: a player installs the game, plays a single-player world on a server
the game starts for them, and can open that world to friends or join a friend's. The same module and
the same client run as a local and a privately hosted game, without forking either.

The connection target is run-time configuration (a shell document the page receives before the
client starts); telemetry and the build's account sign-in go only to servers we operate; and
`docs/local-play.md` records the licence state, the desktop shell, the sign-in answers, the
footprint and the budgets. The groundwork's decisions are the game's `docs/DECISIONS.md` entries "The connection
target is run-time configuration", "The desktop shell is Electron", "Local-play budgets are
measured medians" and "A target's kind gates telemetry and account sign-in".

## Where each sketch item went

| Sketch item                    | Slices                                                                                                                                                          | Re-verified at `63fc0b0a`                                                                                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LP2 Desktop shell              | lpw-10 (overlay proof), lpw-11 (shell, join by address), lpw-12 (bundled host behind a host gate)                                                               | No shell package exists (no `desktop/`, no Electron dependency). The Steam overlay over an Electron window is still unmeasured (`docs/local-play.md` §2)                                                                                                                                                   |
| LP3 Worlds                     | lpw-13 (worlds), lpw-16 (telemetry opt-in)                                                                                                                      | No world registry; `init` stores the publisher as `config.owner_identity`, and `sync_content` refuses every other caller                                                                                                                                                                                   |
| LP4 Sign in once, then offline | lpw-1 (sign-in off), lpw-2 (identity across launches), lpw-15 (world binding)                                                                                   | `createAuthTokenGate` keeps the reconnect token in `sessionStorage` (`client/src/net/authToken.ts`); `ALLOWED_ISSUERS` in `server-module/src/accounts.rs` is the `.invalid` placeholder, so no account issuer exists                                                                                       |
| LP5 Open to friends            | lpw-18 (transport: per-world certificate, TLS at the gate, pinned invites), lpw-14                                                                              | Nothing listens beyond what the host is started with; the host fetches any issuer a token names (`docs/local-play.md` §5)                                                                                                                                                                                  |
| LP6 Private-server access      | lpw-7 (verifier spike), lpw-8 (access design), lpw-9 (access rule), lpw-15 (account check and allowlist)                                                        | The module has no access rule: `on_connect` opens a session for every connection and checks issuer and audience only for a token that carries a JWT                                                                                                                                                        |
| LP7 Standalone server package  | lpw-17 (with automatic certificates for a domain)                                                                                                               | Nothing packaged                                                                                                                                                                                                                                                                                           |
| LP8 Unattended upgrade         | lpw-3 (protocol numbers, every publish path re-seeds as the owner), lpw-4 (the client refuses a server it cannot speak to), lpw-13 (the shell upgrades a world) | `init` runs only at database creation; `just publish` makes no `sync_content` call (`playtest-up`, `playtest-wipe` and `scripts/smoke-republish.sh` do); the client has no version check, only the `content-stale` hint a failed zone switch raises                                                        |
| LP9 Alone is complete          | lpw-5 (content audit), lpw-6 (empty Challenges tab)                                                                                                             | No evolution path names a trade or PvP condition (`EvolutionPath` gates are level, essence, trust, quality time, nutrition). Players shows `social.players.none` (`leaderboardView.ts`), Trades `trade.status.none` (`tradeView.ts`), Rankings `leaderboard.empty`; only Challenges (`pvpView.ts`) is bare |

## What later slices consume

| Contract                                                                                                                                                                                                                 | Consumers                             | Where it is held                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LP1 — the shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, its resolution rules (the `db` charset `[A-Za-z0-9_-]+`, a `uri` path that ends in `/` with no dot segment)              | lpw-2, lpw-11, lpw-13, lpw-16, lpw-14 | `docs/DECISIONS.md` "The connection target is run-time configuration" and `ARCHITECTURE.md` "Connection and store"; `shellDocument.test.ts`, `connectionConfig.test.ts`, `client/e2e/shell-config.spec.ts`                 |
| The desktop shell (Electron) sets `__MR_SHELL_CONFIG__` from a preload script before the page's module script runs                                                                                                       | lpw-11                                | "The desktop shell is Electron"; it stands on the Steam overlay drawing over an Electron window on Windows, proved by lpw-10 before anything else is built on the shell                                                    |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for a single-player world and a friends server                                                                                                    | lpw-12, lpw-14, lpw-17                | "Local-play budgets are measured medians"; `docs/local-play.md` §6. Each consuming slice's criteria cite a number from it                                                                                                  |
| LP10 — a `local`/`private` target gets no telemetry, and `connect` gets neither the build's issuer nor its client id                                                                                                     | lpw-1, lpw-16, lpw-15                 | "A target's kind gates telemetry and account sign-in"; `observability/config.test.ts`, `main.targetKindGate.test.ts`. lpw-16's opt-in, lpw-15's binding and lpw-1's sign-in-off mode are the only paths that may change it |
| The protocol numbers (lpw-3): `module_info.protocol` and `module_info.min_client_protocol`, and the client's own `protocol_version()`                                                                                    | lpw-4, lpw-13, lpw-17                 | lpw-3's `docs/DECISIONS.md` entry                                                                                                                                                                                          |
| The access design (lpw-8): how an unadmitted connection is held off world rows, how the official server refuses binding, how relay is closed                                                                             | lpw-9, lpw-14, lpw-15                 | lpw-8's `docs/local-play.md` §3 update and `docs/DECISIONS.md` entries                                                                                                                                                     |
| The host gate (lpw-12): the only listener a page or a friend reaches; a route allow-list, an `Origin` rule and the issuer rule in front of the host                                                                      | lpw-13, lpw-18, lpw-14, lpw-17        | lpw-12's `docs/DECISIONS.md` entry                                                                                                                                                                                         |
| The transport rule and the world certificate (lpw-18): TLS beyond loopback, the certificate fingerprint in the invite and the shell document, the shell's pin, the reconnect key `(fingerprint, db)` for a pinned target | lpw-14, lpw-17, lpw-8 (relay lead)    | the game's `docs/DECISIONS.md` "Private servers carry their own encryption: a real certificate for a domain, a pinned self-signed one otherwise; plaintext only on loopback"                                               |

## Named deferrals (declared, not dropped)

| Deferred                                                                                                                | Target                                                                                                                                                                                                                                       | Why                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A player opt-in that turns telemetry on in a `local` or `private` world                                                 | lpw-16                                                                                                                                                                                                                                       | It needs a settings surface and a stored choice per world (lpw-13); until then the rule is simply off                                                                                                                                                                                            |
| The bundled and standalone server sending nothing to our stack                                                          | lpw-12 (bundled host) and lpw-17 (standalone package)                                                                                                                                                                                        | Our stack only receives what we configure it to scrape; what the SpacetimeDB host itself sends off the machine is measured in `docs/local-play.md` §5 and held by the packaging slices                                                                                                           |
| Account sign-in toward a `local` or `private` world                                                                     | lpw-15                                                                                                                                                                                                                                       | The account token is the account issuer's id_token, addressed to the build-wide client id; a host that received it could replay it. lpw-1 makes sign-in off complete for those kinds; only the attestation binding (lpw-15) brings an account to such a world, and never as the connection token |
| OIDC issuer, client id and redirect as run-time configuration                                                           | lpw-15                                                                                                                                                                                                                                       | A world that is its own issuer changes what those values mean; they stay build-time until that design is verified                                                                                                                                                                                |
| A transport rule for plaintext `ws:` to a non-loopback host                                                             | the operator (decided 2026-11-16, monster-realm#821, revised the same day: plaintext only on loopback; a domain uses a real certificate, a bare IP or LAN address a pinned self-signed one), lpw-18 (enforces), lpw-17 (domain certificates) | The resolver accepts plaintext `ws:` to any host; with lpw-2 the token it carries also lives across launches                                                                                                                                                                                     |
| A friends-server footprint under battles and trades, not walking alone                                                  | follow-up row R-lp-spec-NOTED803F5 (`mr_load_driver` battle and trade load)                                                                                                                                                                  | `mr_load_driver` drives movement only; the friends-server memory and disk budgets stay a walking-only floor until the driver can battle and trade                                                                                                                                                |
| The opening notice that a host can read a joiner's data                                                                 | lpw-9                                                                                                                                                                                                                                        | Part of private-server access (decision-defaulted below)                                                                                                                                                                                                                                         |
| Steamworks in the shell: overlay enable, Steam Input                                                                    | `M21b-3 Steamworks in the shell` (PLAN §9); the Steam sign-in is M-account-service acs-12                                                                                                                                                    | lpw-10 proves the overlay can draw; wiring Steamworks into the shipped shell is the Steam build's integration, which M21b-3 scopes on top of lpw-11's shell                                                                                                                                      |
| A movement tick that commits a transaction five times a second while only idle players are in a zone (R-lpg-0-IDLETICK) | backlog (the open row)                                                                                                                                                                                                                       | NPCs step on that tick while a player is present, so an idle player's zone is not idle; whether a transaction that writes no row still appends to the commit log at 2.11.0 is unmeasured. 1.24 MiB an hour is a tenth of the single-player disk budget (12 MiB an hour, `docs/local-play.md` §6) |
| A rule in front of the official host that drops a token naming an unlisted issuer (R-lpg-0-ISSUERFETCH, official half)  | M25 (PLAN §9 item 3; follow-up row R-lp-spec-NOTEC8F763)                                                                                                                                                                                     | The official deployment is not this milestone; lpw-12, lpw-14 and lpw-17 close it for local, friends and standalone servers                                                                                                                                                                      |
| A wrong-audience account token on the host's HTTP call and sql routes (R-lpg-0-HTTPAUDIENCE)                            | lpw-8 measures it; it binds only on the audience-scoped fallback                                                                                                                                                                             | The own-issuer design never hands a private host an account token; the fallback makes the official module's audience check the single defence                                                                                                                                                    |
| A server-side refusal of a client older than `min_client_protocol`                                                      | none (by design)                                                                                                                                                                                                                             | lpw-4 is a player-facing message, not a security gate: every reducer already validates its own input against authoritative state                                                                                                                                                                 |

## Decisions the operator owns (defaults recorded; each reversible)

Each default stands unless the operator overrules it:

- Account checks at connection (operator, 2026-11-22, monster-realm#848; replaces the default
  `private-server-idp-unreachable=accept-seen-refuse-new`, which it keeps as cases 2 and 3): a
  world checks each player's account as part of every connection, in every kind of world. (1) An
  answer about the account arrives: the connection is admitted or refused by that answer, and the
  identity's stored status is written or updated. (2) No answer, an identity the world does not
  know: refused until an answer arrives and the account is verified. (3) No answer, a known
  identity: admitted or refused by its last known status, with no expiry; the next answer updates
  it. The host's own account is checked once a day the same way. A binding is therefore not
  "checked once and kept": lpw-23 (module and attestation route) and lpw-24 (client) build it, and
  lpw-24 replaces lpw-15.6. The operator allows adjusting the workflow per kind of world, with
  judgement.
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by lpw-9).
- A player's character follows their account, not their client (operator, 2026-11-22,
  monster-realm#855): a world keeps a player's state per world against their Steam-backed account,
  whatever client they join with, so a player who joins a friend's server from the desktop app and
  later from another computer's browser, signed in to the same account, continues the same
  character. At sign-in the account service supplies the identity the world authenticates and
  authorizes; a desktop client may keep that identity so its player need not sign in each launch;
  a browser keeps nothing that outlives the browser session (no `localStorage`, no persistent
  cookie or cache of a token), so closing the browser ends it and the next visit signs in. Neither
  client creates a new character at every visit. This overrules the device-storage default below
  for a browser, and lpw-19's open question 3 (a public computer; a character per browser,
  R-lpw-19-SHAREDCOMPUTER). Its open question 2 (operator correction, 2026-11-22): the
  once-a-day re-check is the server's own and covers only the account hosting the server, never a
  joining player's; a joining player is checked at each connection (monster-realm#848), which for
  a browser means a sign-in at the start of every browser session and no daily re-check within
  it. lpw-24.3's client-side host re-check therefore moves to the server. lpw-35 designs the
  identity mechanism and names the slices that build it, including lpw-2's and lpw-24's changes.
- `decision-defaulted:address-changes-hands=accept-narrowed-for-early-access` — the two cases
  lpw-19 left open where a server's address changes hands (a browser still running an earlier
  holder's page; a moved server still accepting its old address until its certificate expires)
  are accepted for early access, mitigated by a random port per world, and narrowed by the plan
  above (the operator asked for question 1 to be re-evaluated against it, 2026-11-22,
  monster-realm#855): since a browser keeps nothing past its session, a friend's server serves
  its page with no persistent cache and no service worker, so an earlier holder's code survives
  only in a tab left open across the change; and the server's own daily call to the account
  service confirms the public address it is reached at, so a moved server stops accepting its
  old address within a day instead of the certificate's 160 hours. lpw-35 designs both against
  its chosen alternative (lpw-35.6); a name service stays the upgrade path
  (R-lpw-19-CHANGEDHANDS).
- `decision-defaulted:local-private-reconnect-token=device-storage` — toward a `local` or `private`
  target the anonymous reconnect token is kept in the origin's persistent storage, so a relaunch
  resumes the player; `official` and `test` keep per-tab storage (consumed by lpw-2). Reverting
  is a storage choice per kind; tokens already written stay until the player clears them.
- `decision-defaulted:publish-reseed=owner-sync-after-every-publish` — every publish path that keeps
  data calls `sync_content` as the owner right after the publish, and `sync_content` refreshes the
  protocol numbers whether or not content changed (consumed by lpw-3, lpw-13, lpw-17). Content still
  changes only on the owner's call.
- `decision-defaulted:world-address=fixed-loopback-port-per-world` — each world gets a loopback port
  when it is created and keeps it, so its reconnect key never changes (consumed by lpw-12).
- `decision-defaulted:bundled-host-module-http=disabled` — the host the shell starts runs with
  `[module-http] enabled = false` (consumed by lpw-12).
- `decision-defaulted:world-owner-credential=shell-held-never-in-page` — the token that published a
  world (its `config.owner_identity`) stays in the world's directory, readable by the user alone,
  never reaches the page and never enters a backup copy (consumed by lpw-13).
- `decision-defaulted:world-upgrade-backup=copy-before-publish` — before a new module is published
  over an existing world, the shell copies the world's data (not its owner token) beside it and
  keeps the last copy; deleting the world deletes the copy (consumed by lpw-13).
- `decision-defaulted:world-access-default=open-until-opened-to-friends` — a world with no access
  rule is `Open`; opening it to friends requires the host to choose a rule first (consumed by lpw-9,
  lpw-14).
- `decision-defaulted:world-telemetry=off-until-opted-in` — a world sends no telemetry until its
  player turns it on for that world (consumed by lpw-16).
- `decision-defaulted:invite-link=copyable-text-no-url-handler` — an invite is a `uri` and `db` as
  text the shell's address form accepts; the shell registers no URL scheme (consumed by lpw-14).

## Operator questions

- **Licence (operator-owned, open).** Packaging (lpw-12, lpw-13, lpw-14, lpw-16, lpw-17) waits on
  the terms the operator has been negotiating with the licensor since 2026-11-12;
  `docs/local-play.md` §1 records the state and decides nothing. Lifting event: the operator records
  the negotiated terms (or that none are needed) in `docs/local-play.md` §1. Fallback if the terms
  do not allow bundling: the shell drives a host the player installs separately (lpw-12's `host.ts`
  with a configured binary path), and the shell document does not change.
- **Who signs the attestation, and plaintext `ws:` for friends servers — ANSWERED 2026-11-16
  (monster-realm#821; the game's `docs/DECISIONS.md` "A private world verifies an account by a
  per-world attestation our account service signs" and "Private servers carry their own encryption…" (revised the same day)).** (1) A small attestation route beside the
  account service we deploy (the sign-in broker), with its own signing key and issuer name; the
  account service is otherwise unchanged. A holder-bound credential (the client signs each world's
  proof with a device key) was weighed and not chosen; it stays the named upgrade path. The service is M-account-service (PLAN §9): acs-3 builds the route, acs-5 hosts the dev and test instance, acs-11 deploys production; lpw-15 builds against the dev issuer. (2) Revised the same day (the operator's concern is Minecraft-style hosting over the internet, by bare IP or registered domain, more than LAN): plaintext `ws:` only on loopback; a server with a domain serves `wss:` with a real certificate (lpw-17 obtains and renews one, or the host's own reverse proxy); a server with a bare IP, public or LAN, or a shell world opened to friends serves `wss:` with a per-world self-signed certificate whose fingerprint the invite carries and the shell pins (lpw-18); a browser joiner accepts that certificate once. Game `docs/DECISIONS.md` "Private servers carry their own encryption: a real certificate for a domain, a pinned self-signed one otherwise; plaintext only on loopback".
- **A browser joins a friends server by its address — ANSWERED 2026-11-22 (monster-realm#833).**
  The lpw-8 default (on an enforcing build a friends server is joined from the desktop app only) is
  overruled: a player at a public computer with no desktop build must be able to join a friend's
  cloud server from a browser by navigating to its address, a static IP address included, with
  security kept. lpw-19 designs it (the sign-in on the account service's own origin that lpw-8
  weighed as "C2 with a browser flow", extended to a server reached by IP address); until it is
  built, lpw-18.7's browser joiner plays only on a build that does not enforce ownership.
  R-lpw-8-BROWSERBIND is lpw-19's residual.
- **Where the world password is checked — ANSWERED 2026-11-22 (monster-realm#840).** The operator
  wants a password exposed as little as possible, hashed or not, with a reader of logs as the
  attacker, leaned to checking it at the gate and left the choice to the build. Chosen: the gate
  checks the password and the module never receives one (alternative 3). The gate keeps the
  Argon2id salt and hash in the world's directory beside the owner credential, counts wrong
  attempts itself, and admits a joiner through the owner's outright admission; no reducer argument
  ever carries a typed password or a value derived from one, so the host's commit log holds
  neither the password nor a joiner's wrong guesses. A host with no gate has no password door: its
  owner admits identities from the command line. lpw-20 changes the module; lpw-14 builds the
  gate's check. It replaces the remedy R-lpw-9-COMMITLOG names (callers stretch the password
  before the call), which still put a password-equivalent in the log.

## Risks / flags

- **Identity continuity at a deployment.** The reconnect key is the raw `(uri, db)` pair, so a host
  whose document spells the target differently from the one it replaces (case, trailing slash,
  port) gives every returning anonymous player a new identity. Each deployment's document is checked against the previous spelling; lpw-12 fixes each world's port for this reason. A pinned target (lpw-18) keys the token on `(fingerprint, db)` instead, so a host whose address changes (a home or LAN address reassigned) keeps its returning players.
- **The host reaches out on a stranger's word.** A 2.11.0 standalone host given a token whose `iss`
  is any `http` or `https` issuer fetches that host's `/.well-known/openid-configuration` (no issuer
  allow-list). lpw-12's host gate drops such a token before the host sees it (R-lpg-0-ISSUERFETCH);
  the official deployment's rule is M25's.
- **A loopback host is reachable by every local process and every web page.** A WebSocket is not
  subject to CORS, so any site open in the player's browser can connect to `127.0.0.1:<port>`. The
  host is therefore never the listener: lpw-12's gate is, with an `Origin` rule and a route
  allow-list.
- **Device-kept tokens (lpw-2; overruled for a browser by monster-realm#855, lpw-35 names the change).** A token in persistent storage outlives the tab: anyone using the
  same OS account and browser profile resumes that player, and a script running in the page's
  origin can read every world's token. lpw-11's content security policy and the client's existing
  text discipline are the defence; a shared machine is out of scope.
- **The protocol bump is a rule, not a gate (lpw-3).** A schema change that should raise
  `min_client_protocol` and does not lets an old client meet a server it cannot speak to; it then
  fails as it does today (an SDK error). No test can tell a breaking change from an additive one
  without being a check of the check, so the rule lives in lpw-3's decision entry and in review.
- **Schema chain.** lpw-3, lpw-9 and lpw-15 change the schema. They are ordered (lpw-3, then
  lpw-9, then lpw-15), and each is published to a live server only knowing that a schema-changing
  publish disconnects connected clients.
- **Admission at 2.11.0 is unsolved until lpw-8.** A connection `on_connect` accepts can subscribe
  public tables at once. lpw-9's `touches:` are measured for the module files it must add; the
  guard sites its mechanism reaches are widened by its build (`mr-touches widen`).
- **mr-prune census** (game `63fc0b0a`, recorded as `M-local-play`): no `duplicates` and no
  `orphans` rows for the touched files. Named here as the loop requires, none a reason to change a
  test: `orphan-protected` `client/src/ui/i18n/plural.ts` ("cldr") and
  `client/src/ui/privacyBanner.ts` (`PRIVACY_PSEUDONYMIZATION_DISCLOSURE`), reached through
  `catalog.test.ts` (lpw-4, lpw-6, lpw-9, lpw-15 add keys beside them); `protected-churn` on
  `catalog.test.ts`, `accounts_tests.rs` and `privacy_enforcement_tests.rs` (the schema slices
  lpw-3, lpw-9 and lpw-15 change their pinned counts and lists, never their rules); source-text
  `signals` in `authToken.test.ts` (it reads the SDK's `dist`; lpw-2), `connection.test.ts`
  (`E1-MAIN` reads `main.ts`; lpw-4), `catalog.test.ts` and `privacy_enforcement_tests.rs`; churn
  on `native_host_tests.rs`, `pvpView.test.ts`, `connection.runtime.test.ts` and
  `main.targetKindGate.test.ts`; literal variants in `authToken.test.ts`, `connection.test.ts` and
  `feedbackPolicy.test.ts`.

## Sign-in design (lpw-7, lpw-8, lpw-9 and lpw-15 build against `docs/local-play.md` §3; the operator is open to alternatives)

The protocol stays **OpenID Connect** — OAuth 2.0 authorization code with PKCE, tokens as signed
JWTs. It is what SpacetimeDB consumes (an identity is derived from a token's issuer and subject) and
what the account issuer already speaks. SAML is not a fit: it is browser-redirect XML for workplace
single sign-on, SpacetimeDB does not accept it, and it has no good desktop or offline flow.

The isolation comes from **who vouches for the player in each world**, not from a new protocol:

- **Official server:** accepts account tokens only from the account issuer, addressed to it
  (`aud`); any other token is anonymous, and on an enforcing build an anonymous connection cannot join (every player must own the game; M-account-service acs-6). The
  official module checks issuer and audience only in its connect reducer (`provision_or_touch_account`);
  the host does not check `aud`, and whether a wrong-audience token is refused on the HTTP call and
  sql routes is untested (R-lpg-0-HTTPAUDIENCE; lpw-8 measures it).
- **Private server and single-player world:** a standalone host mints only anonymous tokens and a
  module cannot sign, so a world cannot issue its own account tokens. The player connects under the
  world's own anonymous token; to join, the client asks the account issuer for a short-lived
  **attestation** — "this account is valid" — addressed to that one server and bound to a nonce the
  server chose, and passes it as a reducer argument. A verifier compiled into the module checks it,
  then the host's access rule applies. The attestation is issued only to an account that owns the game and carries the entitlement, and every player binds, the world's own included (lpw-15).
- **Offline single-player** falls out of the same shape: the attestation is needed once, when the
  world is bound to the account; later sessions resume the world's own anonymous token, which the
  client keeps across launches (lpw-2, R-lpg-0-SESSIONTOKEN).
- The design holds on four conditions `docs/local-play.md` §3 leaves open: the in-module verifier
  spike (lpw-7); an endpoint beside the account service that signs the attestation (decided by the operator,
  see below; it ships with the account service); the official server refusing attestation binding, since the same module
  runs there; and the relay of an attestation from one private world to another closed, which
  audience and nonce do not stop because every standalone host calls itself `localhost` and its
  operator can sign any subject (R-lpg-0-ATTESTRELAY). lpw-8 designs the last two and lpw-15 tests
  them, with a hostile-host rig, before a private server sees a real attestation. With all four
  met, nothing the host ever holds is a login anywhere else.

**Decided shape of the attestation (operator, 2026-11-16, monster-realm#821).** The attestation is
signed by a route beside the account service, not by the account issuer's own key, so the official
server never trusts it. It is a compact signed JWT carrying a key id (`kid`); the module holds a
list of accepted attestation keys as module data, so a key can be rotated by shipping the next key
before the old one retires. The attestation lives minutes and names one world and that world's
nonce; the route rate-limits binds per account and does not keep the world it was addressed to
past the request. In the client the attestation is fetched behind one source interface (as
`ConnectCredential` isolates sign-in), so a second source can be added without touching the bind
path. Upgrade path, not built: a holder-bound credential (a JWT carrying the device key in `cnf`,
about a day long, with a client-signed proof per world) as a second source, if first binds on a LAN
with no internet, or keeping who-plays-with-whom from our service, become requirements.

Fallback if the verifier spike fails: audience-scoped tokens from the account issuer, with the
official module's audience check as the single defence (its HTTP-route question answered first);
a private host then learns official identities.

## Notes

- Private worlds run the official rules until `M-modding`; a host controls only who may join.
- **A LAN with no internet** gets encrypted, authenticated connections (checking a pinned fingerprint is local), and the open and password rules work. A first account bind needs the attestation route, so an `Allowlist` world cannot admit a new joiner until the network is back; earlier binds keep working.
- **Idle rule (operator, 2026-11-12):** a zone with no player in it does not update, or updates as
  little as possible. With nobody connected a world runs one
  write-free heartbeat call a minute and writes nothing to disk, and a player who returns appears
  on the tile they left. While any player is connected the movement tick commits a transaction
  every 200 ms whether or not anyone moves, about 1.24 MiB of commit log per hour with one player
  standing still (R-lpg-0-IDLETICK, deferred above).
- The cost that matters more on a player's machine than on ours is commit-log growth: 8.21 MiB per
  hour for one player walking, 44.99 for eight, with no shrink seen within an hour
  (`docs/local-play.md` §4).
- Nothing in the client sends data off the machine but the SpacetimeDB connection, the OTLP
  exporter (loaded only through the telemetry loader) and the OIDC flow; the F9 bug bundle is a
  player-initiated local download, and `playtest_event` is a private table in the world's own
  database, which its host can read.
- The privacy model (private tables behind owner-scoped views) still keeps one player's data from
  another player's client in every world. It does not keep it from the host, who owns the database.
- `M21b-3 Steamworks in the shell` (its own PLAN §9 item) builds the Steamworks wiring (overlay,
  Steam Input) on top of lpw-11's shell; the Steam sign-in is M-account-service's acs-12.
- The shell's own screens (address form, world list, world settings) are shell UI, not client
  frames; each is navigable with the keys the virtual-button layer maps (arrows, Enter as A,
  Escape as B), and gamepad input reaches them with M-gamepad.

## Post-integration verification

Each slice is green alone; the milestone is done when the merged whole is:

- Full `just ci` green on `master` with every merged `lpw-` slice; `bindings-drift` clean after
  lpw-3, lpw-9 and lpw-15; `evals/baselines/client-visible-tables.json` gains `module_info` and
  nothing else.
- The browser build, with a shell document of kind `local` against a loopback host, makes no
  request to any origin but the page's and the host's (lpw-1), and a second page load in the same
  browser profile resumes the first player (lpw-2).
- A world created on an older module and opened by a newer build plays with no operator step: the
  publish keeps the data, the owner's `sync_content` re-seeds and refreshes the protocol numbers
  (lpw-3, lpw-13), and a client older than the server's `min_client_protocol` shows the update
  message (lpw-4).
- Once the licence and the overlay proof lift: from a clean install the shell creates a world,
  plays it, quits, reopens it as the same player within the `docs/local-play.md` §6 single-player
  budgets, opens it to a friend who joins under the host's rule, and closes it again (lpw-11 to lpw-14 and lpw-18, one e2e flow in lpw-14), the friend's shell connecting over `wss:` to the pinned certificate the invite names.
- Once the account service exists: a world bound to an account opens later with the network down
  (lpw-15), and no attestation a private host received is accepted by the official server or by
  another private world (lpw-15's hostile-host rig).

## Slices

### lpw-1 — a local or private target gets an explicit sign-in-off mode

type: feature · tier: hard
touches: client/src/net/connection.ts, client/src/net/credentialDecision.ts, client/src/net/credentialDecision.test.ts, client/src/net/connection.runtime.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, README.md
after: []

- Residuals: R-lpg-10-NOTEBFC99B (closes it).
- Contract: `ConnectionOptions` gains `signIn: 'oidc' | 'off'`; `main.ts` passes `'off'` unless the kind is `official` or `test` and the build names an issuer (wiring only, beside `OIDC_ISSUER`). The decision whether a credential attempt may reach the OIDC client is a pure function in `credentialDecision.ts`; with `'off'`, `connect` constructs no OIDC client at all. `connection.ts` receives wiring only.
- Re-verified: the Sign In offer is already gated (`SIGN_IN_OFFER` reads the empty issuer), but `resolveCredential` still calls `oidc.renewOrExchange()` when `wasEverAuthenticated` or the return leg is set, and with an empty issuer the discovery fetch goes to the page's own origin.
- Docs (no gate): the two `connection.ts` comments that say an absent issuer "contacts no network" describe the sign-in-off mode instead, and the game's `README.md` paragraph on `kind` says the OIDC variables and `VITE_MR_OTLP_ENDPOINT` take effect only for a target of kind `official` or `test`.

- **lpw-1.1:** WHEN the booted client's shell document names kind `local` or `private`, THE CLIENT SHALL make zero OIDC requests (no discovery, token or revocation fetch) from boot through every reconnect, even when the page URL carries an OIDC `code` and `state` and this target's storage holds an `account` kind marker and a stored verifier.

- **lpw-1.2:** WHEN `connect` runs with `signIn: 'off'`, THE CLIENT SHALL hand `.withToken()` only the anonymous reconnect token for every build.

- **lpw-1.3:** WHEN `startSignIn` is called on a connection with `signIn: 'off'`, THE CLIENT SHALL mint no claim code, call no reducer and make no request, and SHALL report `onSignInFailed('sign-in-off')`.

- **lpw-1.4:** WHEN the booted client's shell document names kind `local` or `private`, THE CLIENT SHALL pass `signIn: 'off'` to `connect` whatever the build's OIDC variables hold.

- **lpw-1.5:** WHEN the booted client's shell document names kind `official` with a configured issuer, THE CLIENT SHALL pass `signIn: 'oidc'` and keep today's sign-in behaviour (the existing `main.targetKindGate.test.ts` official cases stay green unchanged).
- Tests: `credentialDecision.test.ts` (the pure decision, every combination of mode, marker and return leg), `connection.runtime.test.ts` (a fetch spy over `connect`), `main.targetKindGate.test.ts` (a fetch spy over the whole booted page per kind).
- DoD: lpw-1.1 to lpw-1.5 green, the docs bullet done; `just ci` green.

### lpw-2 — a local or private world keeps its player across launches

type: feature · tier: hard
touches: client/src/net/authToken.ts, client/src/net/authToken.test.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/src/main.ts, client/e2e/local-identity.spec.ts
after: [lpw-1]

- Residuals: R-lpg-0-SESSIONTOKEN (client half; lpw-11's relaunch criterion and lpw-12's fixed port close the rest).
- Decision: `decision-defaulted:local-private-reconnect-token=device-storage`.
- Contract: `createAuthTokenGate(uri, db, host, persistence)` with `persistence: 'tab' | 'device'`; `'device'` reads and writes `localStorage` under the existing `storageKey` derivation, `'tab'` is today's `sessionStorage`. `ConnectionOptions` gains the target kind (wiring from `TARGET_KIND`); the kind-to-persistence rule is a pure function in `authToken.ts`. Claim codes and the OIDC flow stay per tab (lpw-1 turns them off for these kinds).
- New e2e: `client/e2e/shell-config.spec.ts` shows how a test serves a shell document; the new spec reuses that approach and `client/e2e/stdb.ts`, adding no helper.

- **lpw-2.1:** WHEN the target kind is `local` or `private`, THE CLIENT SHALL store and read the anonymous reconnect token in the origin's `localStorage` under the `storageKey` derivation `authToken.ts` uses today.

- **lpw-2.2:** WHEN the target kind is `official` or `test`, THE CLIENT SHALL keep the reconnect token in per-tab `sessionStorage` exactly as today.

- **lpw-2.3:** WHEN persistent storage throws on access or on write, THE CLIENT SHALL connect anonymously and keep playing, as the per-tab gate does today.

- **lpw-2.4:** WHEN the connection's credential is of kind `account`, THE CLIENT SHALL write nothing to persistent storage.

- **lpw-2.5:** WHEN a page for a `local` target is closed and a new page for the same target opens in the same browser profile, THE CLIENT SHALL resume the first page's identity and character (e2e, a fresh page in one persistent context).

- **lpw-2.6:** WHEN a new page for an `official` target opens in a fresh tab, THE CLIENT SHALL join as a new identity, as today (the same e2e, the control case).

- **lpw-2.7:** WHEN a second page opens the same `local` target while the first is connected, THE CLIENT SHALL join under the same identity, and closing either page SHALL leave the character in the world while the other stays connected.

- **lpw-2.8:** WHEN a token stored for a `local` target is rejected twice since the last success, THE CLIENT SHALL withhold it and connect anonymously, with the same `AUTH_REJECT_SUPPRESS_THRESHOLD` rule as the per-tab gate.
- DoD: lpw-2.1 to lpw-2.8 green; `just ci` and the new e2e green.

### lpw-3 — the module publishes its protocol numbers, and every publish path re-seeds as the owner

type: feature · tier: hard
touches: game-core/src/lib.rs, game-core/src/protocol_tests.rs, client-wasm/src/lib.rs, server-module/src/schema.rs, server-module/src/module_info.rs, server-module/src/module_info_tests.rs, server-module/src/lib.rs, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, server-module/src/privacy_enforcement_tests.rs, client/src/module_bindings/index.ts, client/src/module_bindings/module_info_table.ts, client/src/module_bindings/types.ts, evals/baselines/client-visible-tables.json, evals/baselines/table-schemas.json, justfile, scripts/smoke-republish.sh
after: []

- Residuals: R-sr-4b-NOTE505D57 (closes it for this repository's publish paths; lpw-13 and lpw-17 carry it into theirs).
- Decision: `decision-defaulted:publish-reseed=owner-sync-after-every-publish`.
- Schema change (always-serial): one new public single-row table, `module_info { id: u32 (primary key, always 0), protocol: u32, min_client_protocol: u32 }`, classified `NotOwned` in `DATA_LIFECYCLE_MANIFEST` (module metadata, no player data). Adding a table is additive; a schema-changing publish to a live server disconnects its clients, so it ships at a publish window. Bindings regenerate only through `just gen`. Pins that count tables or modules change with it: `accounts_tests.rs` (`generated_table_set_equals_the_lifecycle_manifest_bt7_1`), `native_host_tests.rs` (`TABLE_DESCRIBERS`), `privacy_enforcement_tests.rs` (`EXPECTED_MODULES`), and the eval baselines `client-visible-tables.json` and `table-schemas.json` (data the evals read; the evals do not change).
- Contract: `game_core::PROTOCOL_VERSION` and `game_core::MIN_CLIENT_PROTOCOL` (both `u32`) are the single source; `client-wasm` exports `protocol_version()`. `module_info.rs` owns `ensure_module_info(ctx)` (write only when the row differs), called from `init` and from `sync_content` after the content step, outside its version gate (wiring in `lib.rs`; the owner check stays in `sync_content`'s own body, which `content.rs`'s `sync_content_guard_references_owner_identity` reads as text). The bump rule (the decision entry this slice writes): `PROTOCOL_VERSION` rises with every change to the module's tables or reducers; `MIN_CLIENT_PROTOCOL` rises only when an older client can no longer speak to the server (a removed or re-typed reducer argument or table column).

- **lpw-3.1:** WHEN the module is published to an empty database, THE SYSTEM SHALL hold exactly one `module_info` row whose `protocol` and `min_client_protocol` equal `game_core::PROTOCOL_VERSION` and `game_core::MIN_CLIENT_PROTOCOL`.

- **lpw-3.2:** WHEN the owner's `sync_content` runs on a database whose `module_info` row is missing or holds other numbers, THE SYSTEM SHALL write the module's numbers into exactly one row, whether or not `config.content_version` was current.

- **lpw-3.3:** WHEN `sync_content` runs on a database whose `module_info` row already holds the module's numbers, THE SYSTEM SHALL write no `module_info` row.

- **lpw-3.4:** THE SYSTEM SHALL keep `MIN_CLIENT_PROTOCOL` at or below `PROTOCOL_VERSION` (a `game-core` test).

- **lpw-3.5:** WHEN `just publish` publishes over a database that holds data, THE SYSTEM SHALL then call `sync_content` as the owner and exit non-zero when that call is refused.

- **lpw-3.6:** WHEN `scripts/smoke-republish.sh` republishes over live data with an unchanged `CONTENT_VERSION` and a `module_info` row it first overwrote with other numbers, THE SYSTEM SHALL show the module's numbers again after the owner's `sync_content`.
- DoD: lpw-3.1 to lpw-3.6 green; `just ci` green, `bindings-drift` clean, the surface and schema evals green with their edited baselines; `just smoke-republish` green.

### lpw-4 — the client refuses a server it cannot speak to, naming which side to update

type: feature · tier: hard
touches: client/src/net/protocolCheck.ts, client/src/net/protocolCheck.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/connection.runtime.test.ts, client/src/shell/config.ts, client/src/shell/config.test.ts, client/test-util/mainBootHarness.ts, client/src/main.ts, client/src/main.protocolCheck.test.ts, client/src/ui/feedbackPolicy.ts, client/src/ui/feedbackPolicy.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts
after: [lpw-2, lpw-3]

- Contract: `protocolCheck.ts` exports a total pure `checkProtocol(server: { protocol: number; minClientProtocol: number } | 'missing' | 'refused', client: number): 'ok' | 'update-game' | 'update-server'`. `shell/config.ts` reads `protocol_version()` once beside the other wasm constants; `main.ts` passes it to `connect` and shows the outcome through the existing feedback sink as a new `protocol-mismatch` kind (wiring). `connection.ts` subscribes `SELECT * FROM module_info` alone, before the existing subscription set, and opens that set only on `'ok'` (wiring). `connection.test.ts` `ts-4.4` pins the exact subscription list, `feedbackPolicy.test.ts` the kinds, `catalog.test.ts` the keys, and `mainBootHarness.ts` mocks the wasm exports; each changes with it.
- A player-facing message, not a security gate (Named deferrals): every reducer already validates its own input.

- **lpw-4.1:** WHEN the server's `module_info.min_client_protocol` exceeds the client's `protocol_version()`, THE CLIENT SHALL subscribe nothing else, send no reducer call and show "This server runs a newer Monster Realm. Update the game to join."

- **lpw-4.2:** WHEN the server's `module_info.protocol` is below the client's `protocol_version()`, or the `module_info` subscription is refused or delivers no row, THE CLIENT SHALL subscribe nothing else, send no reducer call and show "This server runs an older Monster Realm. Its host must update it."

- **lpw-4.3:** WHEN the server's numbers admit the client, THE CLIENT SHALL open the full subscription set and join as today.

- **lpw-4.4:** WHEN the mismatch message is shown, THE CLIENT SHALL announce it through the live region once and keep it until reload.

- **lpw-4.5:** WHEN the locale is French, THE CLIENT SHALL show both mismatch messages from the French catalog.
- Tests: `protocolCheck.test.ts` (the total function), `connection.runtime.test.ts` (the gate before the subscription set), `main.protocolCheck.test.ts` (the booted client shows each message through the real UI). No new e2e: a mismatched server needs a second module build, and the booted-client test drives the real UI over the same seam; every existing e2e is the same-version case.
- DoD: lpw-4.1 to lpw-4.5 green; `just ci` and the full e2e green.

### lpw-5 — the content audit for playing alone

type: feature · tier: routine
touches: game-core/tests/solo_complete.rs
after: []

- Re-verified: `EvolutionPath` gates are level, essence, trust tier, quality-time tier and nutrition; no content registry names a trade or PvP condition. The audit makes that a test so a later content drop cannot lock a species or item behind another player.
- Contract: one integration test file over the public `game_core` loaders (`load_starter_kit`, `load_encounters`, `load_evolution_paths`, `load_shops`, `load_quest_defs`, `load_npc_defs`, `load_species`, `load_items`). It computes what a lone player can obtain from the content's own sources and compares it with every species and item id. Exceptions are a named list in the test, each with the content it belongs to (group content per `game-design.md` §14). If the audit starts red, the slice either fixes the content or lists each exception with its owner; it never weakens the reachability rule.

- **lpw-5.1:** WHEN the audit runs over the compiled content, THE SYSTEM SHALL find every species id obtainable by a lone player, or listed as a named exception.

- **lpw-5.2:** WHEN the audit runs over the compiled content, THE SYSTEM SHALL find every item id obtainable by a lone player, or listed as a named exception.
- DoD: lpw-5.1 and lpw-5.2 green; `just ci` green.

### lpw-6 — the Challenges tab says why it is empty

type: feature · tier: routine
touches: client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/ui-social.spec.ts
after: [lpw-4]

- Re-verified: Players (`social.players.none`), Trades (`trade.status.none`) and Rankings (`leaderboard.empty`) already show an empty line; Challenges (`pvpView.ts`) renders a bare panel. The shared kit `client/src/ui/emptyState.ts` (`createEmptyState`) is the shape to use; the two existing lines keep their wording.

- **lpw-6.1:** WHEN the Challenges tab has no request and no sent challenge, THE CLIENT SHALL show "No challenges" through `createEmptyState`, with no focusable row in the panel.

- **lpw-6.2:** WHEN a lone player opens Social in a fresh world, THE CLIENT SHALL show an empty line on each of the four tabs (one e2e flow in `ui-social.spec.ts`).
- DoD: lpw-6.1 and lpw-6.2 green; `just ci` and the e2e green.

### lpw-40 — the Profile screen shows the player their own tag

type: feature · tier: routine
touches: client/src/ui/renameModel.ts, client/src/ui/renameModel.test.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/index.html, client/src/main.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/e2e/identity-handles.spec.ts
after: []

- Operator, 2026-11-23: pulled forward from M19 (deferred past early access with M18). Friends who trade and challenge each other see one another as a name and a tag (`noticeModel.ts` and `socialModel.ts` use `taggedName` and `formatTag`), but no surface shows a player their own tag, so a player cannot tell a friend which of several same-named players they are.
- Re-verified at harness `2192a1c`: the Profile frame's Name section (`renameView.ts`, `#rename-current`) shows the stored name alone, from `buildRenameViewModel(store.player(identity)?.name ?? '', '')` in `main.ts` `showProfile`; `StorePlayer.discriminator` is on the client (0 means no tag), and a tag is minted once per identity and never changes on a rename (the game's `docs/DECISIONS.md` "A player's tag is a minted sequence value").
- Contract: `buildRenameViewModel` takes the player's discriminator and returns `displayTag: string | null` from `formatTag` (`client/src/ui/playerTag.ts`), the one formatter, never a copy of its padding; `renameView.ts` writes it as text (never markup) in its own element after the current name, styled as the Players tab styles a tag. Client-only, no schema or reducer change.

- **lpw-40.1:** WHEN the Profile frame opens for a player whose row carries a tag, THE CLIENT SHALL show that tag, as `formatTag` gives it, beside the current name in the Name section.

- **lpw-40.2:** WHEN the player's row carries no tag (discriminator 0) or the store holds no row for the player, THE CLIENT SHALL show the current name alone, with no tag element text and no placeholder.

- **lpw-40.3:** WHEN the player renames and the new name arrives, THE CLIENT SHALL show the new name with the same tag.

- **lpw-40.4:** WHEN two identities join with the same default name and each opens Profile, THE CLIENT SHALL show each the tag the other's Players tab lists for them, both read against the minted `player.discriminator` from owner SQL (`identity-handles.spec.ts`).
- DoD: lpw-40.1 to lpw-40.4 green; `just ci` and the e2e green (the i18n completeness suite included, when the section gains a label).

### lpw-7 — an attestation verifier compiled into the module (spike)

type: design · tier: hard
touches: docs/local-play.md
after: []

- The question `docs/local-play.md` §3 leaves open: what one signature check costs inside a reducer, and whether a pure-Rust ES256 or Ed25519 verifier builds for the module's `wasm32-unknown-unknown` target with no clock or randomness. The spike's code lives in a scratch directory and is not merged; a `judge` scores the two candidates.

- **lpw-7.1:** WHEN the spike is recorded, THE SYSTEM SHALL state in `docs/local-play.md` §3, for an ES256 and an Ed25519 verifier, whether it builds for the module target, the module's size change, and the median of 101 verifies inside one reducer on a 2.11.0 standalone host.

- **lpw-7.2:** WHEN neither candidate builds, or the median verify costs more than 5 ms (the budget this spec sets: a bind runs once per world, so the cost matters as a lever for flooding the reducer, not for play), THE SYSTEM SHALL record that the fallback (audience-scoped tokens) is the route.
- DoD: the record and a `docs/DECISIONS.md` entry naming the chosen verifier or the fallback.

### lpw-8 — the access and attestation design

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-7]

- Residuals: R-lpg-0-ATTESTRELAY (designed here, tested in lpw-15), R-lpg-0-HTTPAUDIENCE (measured here).
- Decides, with a `judge` over at least two alternatives each: (a) how a connection the host's rule has not admitted is kept from every world row and reducer (at 2.11.0 a connection `on_connect` accepts can subscribe public tables at once); (b) how the official server refuses attestation binding when the same module runs everywhere; (c) what the attestation names so a hostile host cannot relay one world's attestation to another (`docs/local-play.md` §3: the verifying key of the client's own world token, checked by the client, is the starting direction; a second candidate, from the operator's ruling on monster-realm#821, is the server certificate fingerprint the client pinned (lpw-18), named in the attestation request and compared by the world against its own, as Minecraft's online mode binds its session check to the server's key; it reaches every pinned server but not a domain server the client did not pin, which the design must cover). (d), plaintext `ws:` to a friends server, is decided (operator, 2026-11-16: plaintext only on loopback; lpw-18 enforces). (e) How a build says it enforces ownership (operator, 2026-11-16: every player must own the game on Steam, for now): the official module and every module the shell or the standalone server ships enforce it, test and dev builds do not, and the switch is shared by acs-6 (`entitled(ctx)` on the official server and the build's trusted issuer list) and lpw-15 (a binding that carried the entitlement); also how an unadmitted, unbound connection reaches the admission and binding calls before `join_game`.

- **lpw-8.1:** WHEN the design is recorded, THE SYSTEM SHALL name in `docs/local-play.md` §3 the chosen answer to each of (a) to (c) and (e), the rejected alternatives, and the test lpw-9 or lpw-15 runs to prove each.

- **lpw-8.2:** WHEN answer (b) is recorded, THE SYSTEM SHALL derive the official server's refusal from something a private host cannot set or unset (a build of the module or a key the official deployment alone holds), never from a row or flag the host controls.

- **lpw-8.3:** WHEN the design is recorded, THE SYSTEM SHALL record the result of one wrong-audience account token sent to `/v1/database/<db>/call/<reducer>` and `/v1/database/<db>/sql` on a 2.11.0 host, using the issuer rig `evals/account-e2e.eval.mjs` builds.

- **lpw-8.4:** WHEN answer (e) is recorded, THE SYSTEM SHALL name the build input that switches ownership on, show that the recipe producing shipped modules cannot omit it, and name the test acs-6 and lpw-15 run to prove both sides of the switch.
- DoD: the record and a `docs/DECISIONS.md` entry per decided fork.

### lpw-9 — a private server applies the host's open or password rule

type: feature · tier: hard
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/schema.rs, server-module/src/lib.rs, server-module/src/accounts.rs, server-module/Cargo.toml, Cargo.lock, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, server-module/src/privacy_enforcement_tests.rs, evals/baselines/table-schemas.json, evals/baselines/client-callable-reducers.json, evals/baselines/spacetime-types.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/set_world_access_reducer.ts, client/src/module_bindings/admit_reducer.ts, client/src/ui/hostNoticeModel.ts, client/src/ui/hostNoticeModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/main.ts, client/src/main.hostNotice.test.ts
after: [lpw-8, lpw-3, lpw-6]

- Decisions: `decision-defaulted:private-server-host-notice=yes-once-per-server`, `decision-defaulted:world-access-default=open-until-opened-to-friends`.
- Schema change (always-serial, after lpw-3): a private `world_access` table (rule `Open | Password`, a salted password hash; `NotOwned`, no player data) and a private `world_admission` table (an admitted identity and when; `Erase` at the deletion cascade, not exported), an owner-only `set_world_access` reducer and one admission reducer (named by lpw-8's mechanism). A hashing crate enters `server-module/Cargo.toml`. The guard sites lpw-8's mechanism reaches are widened by the build.

- **lpw-9.1:** WHEN a world has no `world_access` row, THE SYSTEM SHALL treat its rule as `Open`.

- **lpw-9.2:** WHEN a connection not yet admitted joins a world whose rule is `Password`, THE SYSTEM SHALL deliver it no row of any table the module declares (the test lists the tables from the schema, not by hand) and refuse every reducer but the admission call.

- **lpw-9.3:** WHEN the admission call presents a wrong password, THE SYSTEM SHALL refuse it with no write to world state, and after five wrong attempts from one identity within ten minutes SHALL refuse that identity's attempts until the ten minutes pass.

- **lpw-9.4:** WHEN anyone but `config.owner_identity` calls `set_world_access`, THE SYSTEM SHALL refuse it.

- **lpw-9.5:** WHEN the owner admits an identity through `set_world_access`, THE SYSTEM SHALL admit that identity without a password (the shell admits its own player this way).

- **lpw-9.6:** WHEN a player first joins a `private` target, THE CLIENT SHALL show once, for that server, that its host can read and change their data in that world.
- DoD: lpw-9.1 to lpw-9.6 green; `just ci` green, `bindings-drift` clean.

### lpw-10 — the Steam overlay draws over the desktop shell's window: Electron, and Tauri beside it

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-8]
blocked: operator-steam-machine — lifted when the operator runs the probe below on a Windows machine with the Steam client and records the result in `docs/local-play.md` §2 (the loop has no Steam client); who lifts it: the operator; fallback if the overlay cannot draw: lpw-11 onward waits on a `type: design` slice that re-scores the shells with `docs/local-play.md` §2's evidence (Electron 44, the launcher 44, Tauri 43 without an overlay).

- Probe: Electron 45 with `steamworks.js`, the main process calling `electronEnableSteamOverlay()`, app id 480, the unchanged client bundle loaded from a custom protocol; Shift+Tab opens the overlay over the game window. `after: [lpw-8]` serializes the edits to `docs/local-play.md`, nothing more. The operator leans to Tauri (a smaller download, and a Rust shell), and neither shell's overlay has been measured, so the same session on the same machine also runs a Tauri window (WebView2 on Windows) with the same bundle and app id. An overlay that does not draw over Tauri rules it out at once. If it draws over both, the choice is a `type: design` slice, since a Tauri shell rewrites more than the decision entry: lpw-11's page contract (a preload and `contextBridge`, the Electron window flags, "no IPC channel to the page"), lpw-12's child process, acs-12's hand-off and the desktop e2e's driver; and Tauri renders in WebKit on the Steam Deck, where the suite does not run. That slice is preceded by a second operator probe on a Steam Deck: the overlay, and the client's frame time in one named zone for sixty seconds as a median and a 95th percentile, under each shell.

- **lpw-10.1:** WHEN the probe runs under the Steam client on Windows, THE SYSTEM SHALL record in `docs/local-play.md` §2 whether the overlay draws over the game window, with and without GPU flags, for the Electron window and for the Tauri window, with the versions of each shell and of its Steamworks binding.
- DoD: the record; a `docs/DECISIONS.md` amendment to "The desktop shell is Electron" either way.

### lpw-11 — the desktop shell joins a world by address

type: feature · tier: hard
touches: desktop/package.json, desktop/package-lock.json, desktop/tsconfig.json, desktop/vitest.config.ts, desktop/playwright.config.ts, desktop/src/main.ts, desktop/src/preload.ts, desktop/src/worldEntry.ts, desktop/src/worldEntry.test.ts, desktop/src/window.ts, desktop/src/window.test.ts, desktop/src/appProtocol.ts, desktop/src/appProtocol.test.ts, desktop/src/launcher/addressForm.ts, desktop/src/launcher/addressForm.test.ts, desktop/e2e/shell.spec.ts, justfile, .github/workflows/ci.yml, biome.json, .gitignore
after: [lpw-10, lpw-2, lpw-3]
blocked: operator-steam-machine — transitively, through lpw-10 (the shell is built only once the overlay is proved); fallback: as lpw-10.

- Not licence-dependent: the shell hosts the unchanged web client and joins a server someone else runs.
- Contract: a new `desktop/` package (Electron main + preload). `worldEntry.ts` turns a stored or typed entry into the shell document, validating it with the client's own `resolveConnectionConfig` (imported from `client/src/net/connectionConfig.ts`, never copied). `appProtocol.ts` registers the app's scheme as standard and secure (so `localStorage` persists) and serves `client/dist`. The preload exposes the document with `contextBridge.exposeInMainWorld('__MR_SHELL_CONFIG__', doc)` and nothing else. `justfile` gains `desktop-test` and `desktop-e2e`; `ci.yml` runs them.

- **lpw-11.1:** WHEN the shell opens a world entry, THE SYSTEM SHALL expose it as `__MR_SHELL_CONFIG__`, an own non-writable property of the page's global, before the client's module script runs, in a window created with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true` and `webviewTag: false`.

- **lpw-11.2:** WHEN the page asks to navigate or redirect to an origin other than the app's own scheme, calls `window.open`, attaches a webview or requests a permission (camera, microphone, notifications or any other), THE SYSTEM SHALL refuse it.

- **lpw-11.3:** WHEN the shell serves a page, THE SYSTEM SHALL send a content security policy whose `connect-src` names only the world's server, and SHALL expose no IPC channel to the page.

- **lpw-11.4:** WHEN the app scheme receives a path outside `client/dist` (a `..` segment, an encoded one, or an absolute path) or `/shell-config.js`, THE SYSTEM SHALL answer 404.

- **lpw-11.5:** WHEN the player types or pastes an address, THE SYSTEM SHALL build a document of kind `private` from its `uri` and `db` alone, refusing any input that carries a `kind` or `telemetry` field, and SHALL show the resolver's reason for an address it refuses.

- **lpw-11.6:** WHEN the address form is open, THE SYSTEM SHALL move between its fields and buttons with the arrow keys, submit with Enter and close with Escape.

- **lpw-11.7:** WHEN the shell is quit and started again and the player opens the same entry, THE SYSTEM SHALL resume the same player (e2e: two launches over one user-data directory against one loopback host).
- Tests: `worldEntry.test.ts` includes a property test that no typed or pasted input yields kind `official`, `test` or `local`, or a `telemetry` field.
- DoD: lpw-11.1 to lpw-11.7 green; `just ci`, `just desktop-test` and `just desktop-e2e` green.

### lpw-12 — the shell starts a bundled host behind a host gate

type: feature · tier: hard
touches: desktop/src/host.ts, desktop/src/host.test.ts, desktop/src/hostGate.ts, desktop/src/hostGate.test.ts, desktop/src/main.ts, desktop/e2e/host.spec.ts, desktop/package.json, docs/local-play.md
after: [lpw-11]
blocked: licence — lifted when the operator records negotiated terms (or that none are needed) in the game's `docs/local-play.md` §1; who lifts it: the operator; fallback: `host.ts` drives a host the player installed separately (a configured binary path, no bundled binary), behind the same gate.

- Residuals: R-lpg-0-ISSUERFETCH (local half).
- Decisions: `decision-defaulted:world-address=fixed-loopback-port-per-world`, `decision-defaulted:bundled-host-module-http=disabled`.
- Contract: `host.ts` owns the child process: `spacetimedb-standalone start --data-dir <world>/data --jwt-key-dir <world>/keys --listen-addr 127.0.0.1:<internal port> --non-interactive` with a `config.toml` setting `[module-http] enabled = false`. `hostGate.ts` is the only listener a page reaches (the world's fixed port, loopback): it forwards the SDK's WebSocket route and `/v1/ping` and nothing else, checks `Origin`, and drops a token naming any issuer but `localhost`. The token is read from every place the SDK puts one (the `Authorization` header and the WebSocket upgrade's query string), checked against the pinned SDK when built.

- **lpw-12.1:** WHEN the shell opens a world, THE SYSTEM SHALL start its host, confirm that the process answering is the child it started, and open the page only after `/v1/ping` answers through the gate.

- **lpw-12.2:** WHEN a request reaches the gate for any route but the WebSocket route and `/v1/ping` (`/v1/identity`, `publish`, `sql`, `logs`, `call` and any other), THE SYSTEM SHALL refuse it without forwarding it.

- **lpw-12.3:** WHEN a WebSocket upgrade reaches the gate with an `Origin` other than the app's own scheme, THE SYSTEM SHALL refuse it.

- **lpw-12.4:** WHEN a token reaches the gate whose `iss` is not exactly `localhost`, or that does not parse as a JWT (bad base64, an `iss` that is not a string, an oversized token), THE SYSTEM SHALL drop the request, and the host SHALL log no issuer lookup (asserted on the host's log in the e2e).

- **lpw-12.5:** WHEN the shell quits, THE SYSTEM SHALL stop the host it started, and WHEN the shell starts and finds a recorded host for the world, THE SYSTEM SHALL stop it only if its executable and start time match the record.

- **lpw-12.6:** WHEN the world's port or the host's internal port is taken by another process, THE SYSTEM SHALL tell the player and start nothing.

- **lpw-12.7:** WHEN a single-player world is measured by `docs/local-play.md` §7's method under the shell, THE SYSTEM SHALL stay within §6's single-player budgets (330 MiB peak memory, 1.4 % idle CPU, 800 ms start-up to playable excluding the shell's own start, 12 MiB an hour of disk while walking), and a number over budget is a failure unless a `docs/DECISIONS.md` entry raises that budget.

- **lpw-12.8:** WHEN the bundled host runs for 65 minutes under the §5 capture, THE SYSTEM SHALL record no connection attempt off the machine.
- DoD: lpw-12.1 to lpw-12.8 green, the measurements recorded in `docs/local-play.md` §4 and §5; `just desktop-test` and `just desktop-e2e` green.

### lpw-13 — worlds: create, list, open, upgrade and delete

type: feature · tier: hard
touches: desktop/src/worlds.ts, desktop/src/worlds.test.ts, desktop/src/publish.ts, desktop/src/publish.test.ts, desktop/src/launcher/worldList.ts, desktop/src/launcher/worldList.test.ts, desktop/src/main.ts, desktop/e2e/worlds.spec.ts
after: [lpw-12, lpw-4, lpw-9]
blocked: licence — as lpw-12, and transitively operator-steam-machine; fallback: as lpw-12.

- Residuals: R-sr-4b-NOTE505D57 (the shell's publish path).
- Decisions: `decision-defaulted:world-owner-credential=shell-held-never-in-page`, `decision-defaulted:world-upgrade-backup=copy-before-publish`, `decision-defaulted:publish-reseed=owner-sync-after-every-publish`.
- Contract: one world is one database with its own directory (data, keys, owner token, port, module hash). `publish.ts` talks to the host directly on its internal port, never through the gate: `POST /v1/identity` once at creation for the owner token, `PUT /v1/database/<db>` with the module wasm the build embeds, then `sync_content` as the owner. It never requests data deletion. On Windows the token file's permissions are an ACL for the user alone.

- **lpw-13.1:** WHEN the player creates a world, THE SYSTEM SHALL create its directory, publish the module the build embeds into a new database, keep the owner token in the world's directory readable by the user alone, and admit the shell's own player through `set_world_access`.

- **lpw-13.2:** WHEN the shell builds a page or writes a backup copy, THE SYSTEM SHALL put the owner token in neither.

- **lpw-13.3:** WHEN the world list is shown, THE SYSTEM SHALL list every world directory with its name and last-played time, navigable with the arrow keys, Enter to open and Escape to close.

- **lpw-13.4:** WHEN the player opens a world whose recorded module hash differs from the module the build embeds, THE SYSTEM SHALL copy the world's data, publish the embedded module over the data, call `sync_content` as the owner and open it.

- **lpw-13.5:** WHEN that publish or `sync_content` is refused, or the shell dies between the copy and a finished upgrade, THE SYSTEM SHALL restore the copied data and old module on the next open and tell the player this build cannot open the world.

- **lpw-13.6:** WHEN the player deletes a world after confirming, THE SYSTEM SHALL stop its host and remove its directory and its backup copy, and no other world's directory SHALL change.
- DoD: lpw-13.1 to lpw-13.6 green; `just desktop-test` and `just desktop-e2e` green.

### lpw-18 — the friends-server transport: a per-world certificate, TLS at the gate, pinned invites

type: feature · tier: hard
touches: desktop/src/worldCert.ts, desktop/src/worldCert.test.ts, desktop/src/tlsPin.ts, desktop/src/tlsPin.test.ts, desktop/src/hostGate.ts, desktop/src/hostGate.test.ts, desktop/src/worlds.ts, desktop/src/worlds.test.ts, desktop/src/launcher/addressForm.ts, desktop/src/launcher/addressForm.test.ts, desktop/src/main.ts, desktop/e2e/tls.spec.ts, client/src/net/shellDocument.ts, client/src/net/shellDocument.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/net/authToken.ts, client/src/net/authToken.test.ts
after: [lpw-13]
blocked: licence — as lpw-12, and transitively operator-steam-machine; fallback: as lpw-12.

- Decision: the operator's transport rule (monster-realm#821, 2026-11-16; game `docs/DECISIONS.md` "Private servers carry their own encryption…").
- Contract: `worldCert.ts` makes one key pair and self-signed certificate per world, kept in the world's directory (readable by the user alone, kept across restarts and upgrades, in the world's backup copy so a restore keeps every friend's pin). The fingerprint is the SHA-256 of the certificate's public key (SPKI), printed in a form the invite and the address form share. Beyond loopback the gate ends TLS with that certificate and forwards to the host on loopback; it also serves the client's built page and a shell document naming itself, so a browser joiner loads the page and its `wss:` from one origin. The shell document gains an optional `connection.fingerprint`; the shell pins it for every connection its window makes (`tlsPin.ts`, through Electron's session certificate check). The client's reconnect key for a target with a fingerprint is `(fingerprint, db)`; without one it stays `(uri, db)` (the `storageKey` derivation, one function in `authToken.ts`).

- **lpw-18.1:** WHEN a world is created, THE SYSTEM SHALL create its key pair and certificate, and WHEN the world is restarted, upgraded, or restored from its backup copy, THE SYSTEM SHALL serve the same certificate.

- **lpw-18.2:** WHEN the gate listens beyond loopback, THE SYSTEM SHALL accept only TLS with the world's certificate on that interface and refuse a plaintext connection.

- **lpw-18.3:** WHEN the shell connects to a target whose shell document carries a fingerprint, THE SYSTEM SHALL complete the connection only if the server's certificate matches it, refuse a mismatch with a named error even when a certificate authority would accept that certificate, and open no WebSocket on a refused connection.

- **lpw-18.4:** WHEN a shell document names a `ws:` uri whose host is not a loopback address, THE CLIENT SHALL refuse the document with a named error and open no connection.

- **lpw-18.5:** WHEN a shell document names a `wss:` uri with no fingerprint, THE CLIENT SHALL connect under the platform's ordinary certificate checks (the registered-domain case).

- **lpw-18.6:** WHEN a pinned target's address changes and its certificate does not, THE CLIENT SHALL resume the identity stored for `(fingerprint, db)`.

- **lpw-18.7:** WHEN a browser loads the client page from the gate over `https:`, THE SYSTEM SHALL serve the page and a shell document whose `uri` is the gate's own `wss:` origin, and the joiner SHALL play without any other origin.
- Operator ruling monster-realm#833: lpw-18.7's browser joiner plays on an enforcing build once lpw-19's design is built; until then only on a build that does not enforce ownership.
- DoD: lpw-18.1 to lpw-18.7 green; `just desktop-test`, `just desktop-e2e` and `just ci` green.

### lpw-14 — open a world to friends, and close it again

type: feature · tier: hard
touches: desktop/src/openToFriends.ts, desktop/src/openToFriends.test.ts, desktop/src/hostGate.ts, desktop/src/hostGate.test.ts, desktop/src/launcher/worldSettings.ts, desktop/src/launcher/worldSettings.test.ts, desktop/src/main.ts, desktop/e2e/friends.spec.ts
after: [lpw-18, lpw-9]
blocked: licence — as lpw-12, and transitively operator-steam-machine; fallback: as lpw-12.

- Residuals: R-lpg-0-ISSUERFETCH (friends half).
- Decisions: `decision-defaulted:invite-link=copyable-text-no-url-handler`, `decision-defaulted:world-access-default=open-until-opened-to-friends`.
- Contract: opening makes the gate (lpw-12) listen on the chosen interface as well, with the same route allow-list and issuer rule; beyond loopback it serves only TLS with the world's certificate (lpw-18), and the `Origin` rule admits a joiner's page served by the gate itself or the app's own scheme. The host stays on loopback. Joiners use kind `private`.

- Operator ruling monster-realm#840: the gate checks the world password itself (lpw-20 takes it out of the module). It keeps an Argon2id salt and hash in the world's directory with the owner credential's permissions, never in a backup copy's readable part or a log, counts wrong attempts by source address and by identity (five in ten minutes, as lpw-9.3), and on the right password admits the joiner through the owner's `set_world_access` admission.

- **lpw-14.1:** WHEN the player asks to open a world whose rule is still the default `Open`, THE SYSTEM SHALL ask the host to choose `Open` or `Password` first and open nothing until they do.

- **lpw-14.2:** WHEN the player opens a world to friends, THE SYSTEM SHALL accept joiners on the chosen interface under lpw-9's rule, and each joiner's character SHALL be their own in that world.

- **lpw-14.3:** WHEN the gate listens beyond loopback, THE SYSTEM SHALL hold at most 32 connections in all and 4 from one address, and SHALL close a connection that has not completed its upgrade within 10 seconds.

- **lpw-14.4:** WHEN the player closes the world to friends, THE SYSTEM SHALL stop listening beyond loopback and close every connection that came in that way, upgraded WebSockets included, while the host's own player keeps playing.

- **lpw-14.5:** WHEN a player copies the invite, THE SYSTEM SHALL produce the world's `wss:` `uri`, `db` and certificate fingerprint as text that lpw-11's address form accepts as kind `private`.

- **lpw-14.6:** WHEN a joiner gives the gate's door the world's password, THE SYSTEM SHALL admit that identity without any call to the module that carries the password or a value derived from it, and WHEN the password is wrong SHALL admit nobody, write nothing to the world's database and refuse that identity and that address after five wrong attempts in ten minutes.
- DoD: lpw-14.1 to lpw-14.6 green; the milestone's one e2e flow (create, play, quit, reopen, open to a friend, the friend joins, close) green in `desktop/e2e/friends.spec.ts`.

### lpw-19 — a browser binds a friends server it reached by address (design)

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-8]

- Residuals: R-lpw-8-BROWSERBIND.
- Operator ruling monster-realm#833 (2026-11-22): a player with no desktop build joins a friend's
  cloud server from a browser by its address, a static IP address included, with security kept.
  Fork (c) of the access design binds only from the desktop shell, because a page a world's gate
  serves may be the hostile host's code and must never hold a login token. The design to judge,
  over at least two alternatives: the page sends the browser to the account service's own origin,
  the player signs in there, and the service returns only an attestation whose `aud` it derives
  from the address it returns to. lpw-8's note lists the checks for a domain server (WHATWG parse,
  `https:` only, no user-info, one fixed return path, the database inside the signed name, a state
  value the page made, a scrubbed fragment, `frame-ancestors 'none'`, no cookie as a way into the
  attest route, consent each time with the server's name shown, the return address kept out of
  access logs). The open question is what names a server reached by IP address: a browser has no
  trustworthy name for a self-signed certificate, so the candidates are a publicly trusted
  certificate for the IP address (the gate or the standalone server obtains and renews one) named
  as an address, and a name the account service issues for the server's own key.

- **lpw-19.1:** WHEN the design is recorded, THE SYSTEM SHALL name in `docs/local-play.md` §3 how a browser joiner of a friends server at a domain name and at a bare IP address obtains an attestation, what the attestation's `aud` is in each case and what authenticated it, the rejected alternatives, and the test that proves each.

- **lpw-19.2:** WHEN the design is recorded, THE SYSTEM SHALL show that a page a hostile host's gate serves never holds a login token the official server accepts, and that the relay of fork (c) stays closed for a browser joiner by relay, by proxy and by an address that changes hands.

- **lpw-19.3:** WHEN the design is recorded, THE SYSTEM SHALL list the changes it makes to lpw-15's client bind flow, lpw-17, lpw-18.7, acs-3's route and the world's names, and state what a joiner at a server whose address has no publicly trusted certificate is shown.
- DoD: the record, a `docs/DECISIONS.md` update of "An attestation names the server as the player's own software authenticated it" (the desktop-only default is overruled), and the slices that build it named in this spec by a note.

### lpw-20 — the module never receives a world password

type: feature · tier: hard
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/privacy_enforcement_tests.rs, evals/baselines/client-callable-reducers.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/set_world_access_reducer.ts, client/src/module_bindings/admit_reducer.ts, docs/local-play.md, client/src/net/wireContract.json, game-core/src/lib.rs
after: [lpw-15]

- Residuals: R-lpw-9-COMMITLOG (the module half; lpw-14 builds the gate's check).
- Operator ruling monster-realm#840 (2026-11-22). Measured in lpw-9: the host's commit log keeps the arguments of every committed reducer call in the clear. Schema stays additive: `world_access`'s salt and hash columns stay and are written empty. Always-serial after lpw-15 (both edit `access.rs`).

- **lpw-20.1:** WHEN the owner sets the rule to `Password`, THE SYSTEM SHALL store the rule with no salt and no hash and admit only the owner and admitted identities, and no reducer the module declares SHALL take a password, a hash of one or a value derived from one as an argument.

- **lpw-20.2:** WHEN a world holds a salt and hash stored by an earlier module, THE SYSTEM SHALL clear them at the owner's next `set_world_access` and admit nobody by them meanwhile.

- **lpw-20.3:** WHEN an identity the owner admitted outright joins a `Password` world, THE SYSTEM SHALL admit it as lpw-9.5 does, and an identity never admitted SHALL be refused at connect and in every reducer as lpw-9.2 does.
- DoD: lpw-20.1 to lpw-20.3 green; `just ci` green, `bindings-drift` clean; `docs/DECISIONS.md` "The door records a wrong password and answers Ok…" rewritten to the gate's check.

### lpw-15 — every player binds a world once with an attestation; ownership and the allowlist

type: feature · tier: hard
touches: server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/schema.rs, server-module/src/lib.rs, server-module/src/accounts.rs, server-module/src/privacy.rs, server-module/Cargo.toml, Cargo.lock, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, server-module/src/privacy_enforcement_tests.rs, evals/baselines/table-schemas.json, evals/baselines/client-callable-reducers.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/bind_world_account_reducer.ts, client/src/net/attestation.ts, client/src/net/attestation.test.ts, client/src/net/oidc.ts, client/src/net/oidc.test.ts, client/src/main.targetKindGate.test.ts, client/src/ui/profileView.ts, client/src/ui/profileView.test.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/screens/profileScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/main.ts, client/src/main.worldBinding.test.ts
after: [lpw-9, lpw-7, acs-3, acs-6, acs-7]

- Residuals: R-lpg-0-ATTESTRELAY (closes it with the hostile-host rig).
- Decision: `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new`.
- Schema change (always-serial, after lpw-9): a private `world_binding` table (identity, account subject, bound at; `Erase` at the deletion cascade and included in the player's data export) and a private nonce table (one outstanding nonce per identity, from `ctx.rng()`, expiring in minutes), the reducer `bind_world_account(attestation)`, and `Allowlist` added to `world_access`'s rule. The verifier lpw-7 chose, with the accepted attestation keys (published by M-account-service acs-3) as a `kid`-keyed list in module data. **Every player of a `local` or `private` world binds** (operator, 2026-11-16: every player must own the game on Steam, for now): the attestation is issued only to an entitled account and carries `mr_ent`, the binding records it, and `entitled(ctx)` (acs-6) accepts a binding that carried it, so on an enforcing build (lpw-8 (e)) no unbound connection reaches `join_game` under any access rule. The client asks for the attestation once per world, before the first `join_game` there: in a browser it signs in to our issuer (M-account-service acs-2's flow; acs-10 adds Steam behind the same flow) in a sign-in that never reaches `connect` or the host, which amends lpw-1.1 to allow requests to our issuer during a bind and nowhere else (`main.targetKindGate.test.ts` updated, not weakened: a boot that does not bind still makes zero OIDC requests); in the shell it uses acs-12's Steam source (phase 2). Builds and tests against the account service's `local-dev` profile (acs-1, acs-2); production binds wait on acs-11.

- **lpw-15.1:** WHEN `bind_world_account` receives an attestation that verifies, names this world as lpw-8 defines it, carries this identity's outstanding nonce and has not expired, THE SYSTEM SHALL record the binding for `ctx.sender()` and spend the nonce.

- **lpw-15.2:** WHEN the attestation fails any of those checks, or its nonce was spent or expired, THE SYSTEM SHALL refuse it with no write.

- **lpw-15.3:** WHEN `bind_world_account` runs on an official build, THE SYSTEM SHALL refuse it with no write (lpw-8 (b)).

- **lpw-15.4:** WHEN a hostile-host rig relays to this world an attestation the player's client fetched for the rig's own world, by lpw-8 (c)'s attack, THE SYSTEM SHALL refuse it.

- **lpw-15.5:** WHEN a world's rule is `Allowlist`, THE SYSTEM SHALL admit a joiner only with a binding whose account is on the list, and a joiner who presents no attestation only if that identity was admitted before.

- **lpw-15.6:** WHEN a bound world is opened later, THE CLIENT SHALL make no request to the account service and resume the world's own identity.

- **lpw-15.7:** WHEN a connection with no binding, or with a binding whose attestation carried no `mr_ent`, calls `join_game` in a `local` or `private` world on an enforcing build, THE SYSTEM SHALL refuse it with acs-6.1's error and write nothing, under `Open`, `Password` and `Allowlist` alike.

- **lpw-15.8:** WHEN an account that is not entitled asks for an attestation through the client, THE CLIENT SHALL show acs-7.2's not-owned message and call no reducer.
- DoD: lpw-15.1 to lpw-15.8 green; `just ci` green, `bindings-drift` clean.

### lpw-16 — a world's player may turn telemetry on

type: feature · tier: hard
touches: client/src/net/shellDocument.ts, client/src/net/shellDocument.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/shell/config.ts, client/src/observability/config.ts, client/src/observability/config.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, README.md, desktop/src/worlds.ts, desktop/src/worldEntry.ts, desktop/src/worlds.test.ts, desktop/src/launcher/worldSettings.ts, desktop/src/launcher/worldSettings.test.ts
after: [lpw-14, lpw-15]
blocked: licence — transitively, through lpw-14; and account-service, transitively through lpw-15, which it follows only because both edit `client/src/main.ts`; fallback: none needed, telemetry stays off.

- Decision: `decision-defaulted:world-telemetry=off-until-opted-in`.
- Contract: the shell document gains an optional `connection.telemetry: 'on'`, accepted only with kind `local`; kind `local` itself is accepted only for a loopback `uri` host. `shell/config.ts` exports the resolved flag and `main.ts` passes it to `resolveTelemetryConfig`, which enables telemetry for `local` only when it is set. The shell writes it from the world's stored setting; `README.md`'s shell-document paragraph names the field.

- **lpw-16.1:** WHEN a `local` document carries `telemetry: 'on'`, THE CLIENT SHALL start telemetry toward the build's endpoint, as for `official`.

- **lpw-16.2:** WHEN a document of any other kind carries `telemetry`, or a `local` document names a `uri` whose host is not loopback, THE CLIENT SHALL refuse the document at start-up with the resolver's error.

- **lpw-16.3:** WHEN a world is created, THE SYSTEM SHALL store telemetry off for it, and only the player's toggle in that world's settings SHALL change it, leaving every other world's setting as it was.
- DoD: lpw-16.1 to lpw-16.3 green; `just ci` and `just desktop-test` green.

### lpw-17 — a standalone server package

type: feature · tier: hard
touches: desktop/src/serverCli.ts, desktop/src/serverCli.test.ts, desktop/src/acme.ts, desktop/src/acme.test.ts, desktop/e2e/acme.spec.ts, desktop/package.json, docs/hosting.md
after: [lpw-14]
blocked: licence — as lpw-12, and transitively operator-steam-machine; fallback: a host installs SpacetimeDB themselves and follows `docs/hosting.md` to publish the module and run the gate.

- Residuals: R-lpg-0-ISSUERFETCH (standalone half), R-sr-4b-NOTE505D57 (the package's publish path).
- Contract: a headless command built from the same `worlds.ts`, `publish.ts`, `host.ts` and `hostGate.ts` as the shell, distributed outside the Steam store; `docs/hosting.md` is the host's guide (install, access rule, backup without the owner token, upgrade, and the three ways to serve TLS: a domain name the command certifies itself, the host's own certificate or reverse proxy, or the world's self-signed certificate and its fingerprint). `acme.ts` obtains and renews a certificate over ACME (HTTP-01 on port 80, or TLS-ALPN-01 on 443); its tests run against Pebble, the ACME test server, never a public CA.

- **lpw-17.1:** WHEN a host runs the standalone command to create, start or upgrade a world, THE SYSTEM SHALL do what the shell does for the same step, with the same gate and access rule.

- **lpw-17.2:** WHEN a host backs up and restores a world as `docs/hosting.md` describes, THE SYSTEM SHALL restore every row (a test restores a backup into a fresh directory and compares).

- **lpw-17.3:** WHEN the standalone host runs idle with nobody connected, measured by `docs/local-play.md` §7's method, THE SYSTEM SHALL stay within the friends-server idle budget (1.0 % of one thread, §6), and a number over budget is a failure unless a `docs/DECISIONS.md` entry raises it.
- **lpw-17.4:** WHEN a host gives the standalone command a domain name, THE SYSTEM SHALL obtain a certificate for it over ACME, serve `wss:` and `https:` with it, and renew it before it expires without a restart.

- **lpw-17.5:** WHEN a host gives a certificate and key path instead, THE SYSTEM SHALL serve those, and WHEN the host gives neither, THE SYSTEM SHALL serve the world's self-signed certificate (lpw-18) and print its fingerprint with the invite.

- **lpw-17.6:** WHEN certificate issuance or renewal fails, THE SYSTEM SHALL keep serving the last valid certificate, log the failure, and never fall back to plaintext beyond loopback.
- DoD: lpw-17.1 to lpw-17.6 green; `just desktop-test` and `just desktop-e2e` green.

### lpw-21 — the allowlist is seeded when switched on and always lists the host

type: feature · tier: hard
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/lib.rs, client/src/net/wireContract.json, game-core/src/lib.rs
after: [lpw-15]

- Decision: operator, 2026-11-22, monster-realm#846. A bound identity is governed by the list alone (lpw-15's default stands), and the list is each world's own (one module database is one world). On top of it: switching a world to `Allowlist` creates the list from the players already let in, the host's own account is always on it, the host adds or removes accounts, and switching the rule off restores the rule lpw-9 built. No new table: the seed is read from the existing `world_binding` and `world_admission` rows. `decision-defaulted:allowlist-reenable=union-with-kept-list` (the list is kept while the rule is off, and a later switch back adds the seed to it rather than replacing it; reversible).
- Contract: no schema change. `set_world_access` seeds the list inside the same transaction as the rule change; `set_world_allowlist` (lpw-15) keeps the owner's account whatever the call names. The game's `docs/DECISIONS.md` entry for the allowlist (written by lpw-15) is amended in place to state these rules.

- **lpw-21.1:** WHEN the owner changes a world's rule to `Allowlist`, THE SYSTEM SHALL add to the list the account of every binding whose identity the rule in force before the call admitted (under `Open` every binding, under `Password` each identity holding an admission), and the owner's own bound account, keeping every account already listed.

- **lpw-21.2:** WHEN that seed would put more than `MAX_ALLOWLIST_ACCOUNTS` accounts on the list, THE SYSTEM SHALL refuse the rule change with lpw-15's too-many error and write nothing.

- **lpw-21.3:** WHEN a world's rule is `Allowlist` and the owner's identity is bound, THE SYSTEM SHALL keep the owner's account on the list: a `set_world_allowlist` call that omits it stores it anyway, and an owner who binds while the rule is `Allowlist` has their account added.

- **lpw-21.4:** WHEN the owner removes an account from the list, THE SYSTEM SHALL refuse every later reducer call (`join_game` included) from each bound identity whose account it was, connected or not, and WHEN the owner adds an account, THE SYSTEM SHALL admit an identity bound to it at its next call.

- **lpw-21.5:** WHEN the owner changes the rule from `Allowlist` to `Open` or `Password`, THE SYSTEM SHALL admit exactly as lpw-9 defines for that rule, the list unread until the rule is `Allowlist` again.
- DoD: lpw-21.1 to lpw-21.5 green; `just ci` green; the game's `docs/DECISIONS.md` allowlist entry amended.

### lpw-22 — a player erases and reads their own world binding without the host

type: feature · tier: hard
touches: server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/lib.rs, evals/baselines/client-callable-reducers.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/unbind_world_account_reducer.ts, client/src/net/wireContract.json, game-core/src/lib.rs
after: [lpw-15, lpw-21]

- Decision: operator, 2026-11-22, monster-realm#847. In a world we do not operate, a player erases their own binding by a reducer and reads it through the owner-scoped view lpw-15 already ships; keep what a world holds about accounts and identities minimal and secure. No new table, column or export machinery (export is data about the person through simple queries on existing tables).
- Decision: operator, 2026-11-23, monster-realm#861 (recommendation accepted). An unbind of a binding the build counts also deletes the caller's `world_admission` row under every rule, so an account the owner removed can never get back in through an unbind; a removed player reaches the unbind only over a connection opened while admitted (the owner can still delete the binding row over SQL).
- Contract: `unbind_world_account()` deletes the caller's `world_binding` row, any outstanding nonce for `ctx.sender()` and, when the binding is one the build counts, the caller's `world_admission` row, and nothing else; on an official build it is refused with no write (lpw-8 (b)). It is the one reducer the access rule does not gate, so a player the host has removed can still erase their link. The game's `docs/DECISIONS.md` world-binding entry (written by lpw-15) is amended in place to state this.

- **lpw-22.1:** WHEN a bound identity calls `unbind_world_account` in a `local` or `private` world, THE SYSTEM SHALL delete that identity's binding, outstanding nonce and (for a counted binding) admission row, and write nothing else.

- **lpw-22.2:** WHEN the caller has no binding, THE SYSTEM SHALL succeed with no write.

- **lpw-22.3:** WHEN the world's rule (`Open`, `Password` or `Allowlist`) refuses the caller, including an account the owner removed from the list, THE SYSTEM SHALL still run `unbind_world_account` for that caller.

- **lpw-22.4:** WHEN `unbind_world_account` runs on an official build, THE SYSTEM SHALL refuse it with no write.

- **lpw-22.5:** WHEN an identity reads the owner-scoped binding view, THE SYSTEM SHALL return only that identity's own binding, and after lpw-22.1 none.

- **lpw-22.6:** WHEN an unbound identity later calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it as lpw-15.7 defines, until it binds again.
- DoD: lpw-22.1 to lpw-22.6 green; `just ci` green, `bindings-drift` clean; the game's `docs/DECISIONS.md` world-binding entry amended.

### lpw-23 — a world re-checks a bound account with every answer and keeps the last known status

type: feature · tier: hard
touches: server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/schema.rs, evals/baselines/table-schemas.json, account-service/src/attest.ts, account-service/src/attest.test.ts, docs/account-service.md, docs/local-play.md, client/src/net/wireContract.json, game-core/src/lib.rs
after: [lpw-15, lpw-22, lpw-35]

- Decision: operator, 2026-11-22, monster-realm#848 (the "Account checks at connection" entry above). An answer can be negative, so the attestation route must be able to say "this account is not entitled" in a form the world can verify.
- Contract: `POST /attest` for a valid token whose account is not entitled returns an attestation with `mr_ent` false instead of refusing (this amends acs-3.2 for that case only; a missing, expired or foreign token is still refused). `bind_world_account` on an identity that already has a binding replaces its status and check time with the new attestation's, positive or negative, under the same checks as lpw-15.1 and lpw-15.2. `entitled(ctx)` reads the last stored status, with no expiry. The binding row holds the entitlement and the time of its last check; a column is added only if lpw-15's row lacks one (then this slice is schema-serial). The host's daily check is the owner's own binding re-checked the same way (lpw-24 sends it); this slice adds no timer and no outgoing request from the module.

- **lpw-23.1:** WHEN a bound identity's new attestation verifies and carries `mr_ent`, THE SYSTEM SHALL update that binding's status to entitled and its check time, and admit it as lpw-15.7 defines.

- **lpw-23.2:** WHEN a bound identity's new attestation verifies and carries `mr_ent` false, THE SYSTEM SHALL update that binding's status to not entitled, and refuse its later `join_game` calls with acs-6.1's error until a later attestation says entitled.

- **lpw-23.3:** WHEN a known identity calls `join_game` with no new attestation, THE SYSTEM SHALL admit or refuse it by its stored status, however old.

- **lpw-23.4:** WHEN an identity with no binding calls `join_game` on an enforcing build, THE SYSTEM SHALL refuse it as lpw-15.7 defines.

- **lpw-23.5:** WHEN the attestation route receives a valid token for an account that is not entitled, THE SYSTEM SHALL return an attestation with `mr_ent` false and the other claims of acs-3's contract, and SHALL still refuse a missing, expired or foreign token with none.

- **lpw-23.6:** WHEN a new attestation fails any lpw-15.2 check, THE SYSTEM SHALL leave the stored binding unchanged.
- DoD: lpw-23.1 to lpw-23.6 green; `just ci` green, `bindings-drift` clean; the game's `docs/DECISIONS.md` world-binding entry amended in place for #848 (no longer "checked once and kept").

### lpw-24 — the client checks the player's account at every connection to a world

type: feature · tier: hard
touches: client/src/net/attestation.ts, client/src/net/attestation.test.ts, client/src/net/oidc.ts, client/src/net/oidc.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/shellDocument.ts, client/src/net/connectionConfig.ts, client/src/shell/session.ts, client/src/main.ts, client/src/main.worldBinding.test.ts, client/src/main.targetKindGate.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts
after: [lpw-15, lpw-19, lpw-23, lpw-35]

- Decision: operator, 2026-11-22, monster-realm#848. This is the client bind flow lpw-15 deferred (lpw-15.6 and lpw-15.8, plan "Sizing"), shaped by the ruling: it replaces lpw-15.6 (no request on a later open) with a check at every connection, and carries lpw-15.8 unchanged. lpw-15's development recipe (a `justfile` entry, which a run cannot be granted) is named in the PR body for the supervisor.
- Contract: before each `join_game` in a `local` or `private` world the client asks our issuer for an attestation (lpw-15's sign-in, which never reaches `connect` or the host) and binds with it, positive or negative. When the issuer cannot be reached it joins with no attestation and the module decides (lpw-23.3, lpw-23.4). While a world the player hosts is running, the host's client re-checks the host's own account once a day, the same way. lpw-1.1's rule (requests to our issuer during a bind and nowhere else) holds; a boot that opens no world makes zero OIDC requests.

- **lpw-24.1:** WHEN the client opens a `local` or `private` world and the issuer answers, THE CLIENT SHALL bind with the new attestation before calling `join_game`.

- **lpw-24.2:** WHEN the issuer cannot be reached, THE CLIENT SHALL call `join_game` with no new attestation and show the module's answer.

- **lpw-24.3:** WHEN a world the player hosts has been running a day since the host's last check, THE CLIENT SHALL re-check the host's account as in lpw-24.1, and retry while the issuer cannot be reached.

- **lpw-24.4:** WHEN an account that is not entitled asks for an attestation through the client, THE CLIENT SHALL show acs-7.2's not-owned message (lpw-15.8).

- **lpw-24.5:** WHEN the client boots toward any target and opens no `local` or `private` world, THE CLIENT SHALL make zero requests to the account service.
- DoD: lpw-24.1 to lpw-24.5 green; `just ci` green.

### lpw-25 — a change an older client cannot read fails the build until `MIN_CLIENT_PROTOCOL` rises

type: feature · tier: hard
touches: client/src/net/wireContract.test.ts, client/src/net/wireContract.json, client-wasm/src/lib.rs, game-core/src/lib.rs, docs/DECISIONS.md
after: [lpw-15, lpw-34]

- Operator, 2026-11-22 (decision review, concern 2). "The module publishes its protocol numbers…" says its bump rule has no test, and the failure it guards is silent: the 2.11.0 SDK throws inside its row decoder on a subscribed row that gained a column, with neither an applied nor an error callback.
- Contract: one committed file, `client/src/net/wireContract.json`, holds one entry per `PROTOCOL_VERSION`, appended and never rewritten; entries below `MIN_CLIENT_PROTOCOL` may be deleted. An entry is read from the generated bindings (`client/src/module_bindings/`), never from hand-written source, with names as they travel on the wire, in two parts. Server to client: every subscribable table and view with its columns in order and its primary key, and every type reachable from a column, with its fields or variants in order. Client to server: every reducer with its arguments in order, and every type reachable only from an argument. The check: the current bindings must keep every entry from `MIN_CLIENT_PROTOCOL` up to the current number. For the server-to-client part any difference in something an entry holds breaks it. For the client-to-server part a removed, re-typed or reordered argument, field or variant breaks it, and an added variant or a new reducer does not. The test reads both numbers through wasm exports; `min_client_protocol()` is added to `client-wasm` beside `protocol_version()`, with the parity test its neighbour has. The test's update mode writes only a missing entry for the current `PROTOCOL_VERSION` and never overwrites one; a slice still iterating deletes its own new entry by hand, so the deletion shows in its diff. Bootstrap: nothing is deployed, so this slice raises `MIN_CLIENT_PROTOCOL` to the current `PROTOCOL_VERSION` and records that one entry. Every later slice that changes the bindings appends its entry: the two files it needs for that (`client/src/net/wireContract.json`, `game-core/src/lib.rs`) are in the `touches:` of lpw-20 to lpw-23 and lpw-32.

- **lpw-25.1:** WHEN the generated bindings differ in any way from the entry recorded for the current `PROTOCOL_VERSION`, or the file holds no entry for it, THE SYSTEM SHALL fail the client test run until `PROTOCOL_VERSION` rises and its entry is recorded.

- **lpw-25.2:** WHEN the generated bindings break, as the contract defines for each direction, anything held by any entry from `MIN_CLIENT_PROTOCOL` to the current number, THE SYSTEM SHALL fail the client test run until `MIN_CLIENT_PROTOCOL` rises above every entry the change breaks.

- **lpw-25.3:** WHEN the bindings differ from those entries only by tables, views, reducers or types none of them holds, or by a variant added to a type reachable only from a reducer argument, THE SYSTEM SHALL pass with `MIN_CLIENT_PROTOCOL` unchanged.

- **lpw-25.4:** WHEN a table an entry above `MIN_CLIENT_PROTOCOL` first recorded gains a column, THE SYSTEM SHALL fail as lpw-25.2 does (a client at that entry's number subscribes it).
- DoD: lpw-25.1 to lpw-25.4 green, each watched failing once on bindings regenerated from an uncommitted scratch schema edit; `just ci` green; "The module publishes its protocol numbers…" in the game's `docs/DECISIONS.md` rewritten to name the check.

### lpw-26 — a zone's movement tick runs only while there is work for it (design)

type: design · tier: hard
touches: docs/refactors/idle-tick.md, docs/DECISIONS.md
after: [lpw-25, lpw-34]

- Residuals: R-lpg-0-IDLETICK.
- Operator, 2026-11-22 (decision review, concern 3). A zone with a player in it commits a `movement_tick` transaction every `STEP_MS` whether or not anything moves: 1.24 MiB of commit log an hour for one player standing still, 8.21 walking and 44.99 for eight, with no shrink seen (`docs/local-play.md` §4). The operator wants the empty transactions gone for disk, bandwidth and reducer-thread reasons, client prediction kept, and a remote player's stop never left wrong on another client. Ordered after lpw-25 by the operator; nothing in it depends on that slice.
- The design to judge, over at least two alternatives: a tick armed as a one-shot only while work is pending (an undrained input that can drain, a character whose row still shows a step that has ended, an NPC move coming due), which does not re-arm when it finds none; NPC wander derived from the clock or scheduled at its next move. Alternatives include a slower interval while a zone is quiescent and leaving the interval and shrinking what each tick writes. The smoothness contract ("Bounded client prediction", "Held keys", "Remote interpolation") is the constraint. Each alternative is measured from an unmerged prototype branch whose commit the record names; the slice merges no code. Whether an event table (rows broadcast and not stored) fits any of it is answered for the SpacetimeDB version the game pins.

- **lpw-26.1:** WHEN the design is recorded, THE SYSTEM SHALL state in `docs/refactors/idle-tick.md`, for each alternative and for today, the transactions per hour (from the host's `/v1/metrics` reducer counters) and commit-log bytes per hour (by `docs/local-play.md` §7's method) for one player standing still, one walking and eight walking, in a zone with NPCs and in one without, and the bytes of one transaction that writes no row.

- **lpw-26.2:** WHEN the design is recorded, THE SYSTEM SHALL show by measurement on the pinned host (2.16.1 after lpw-34) that under the chosen alternative a walking player's step-timing distribution is no wider than today's (`docs/send-pipeline-depth.md`), that a remote client receives the row that ends a walk no later than it does today, what a client that reconnects mid-walk is sent, and what arming from the intake reducers adds to a walking player's rows.

- **lpw-26.3:** WHEN the design is recorded, THE SYSTEM SHALL name everything the interval tick does today with how it is done under the chosen alternative: NPC wander; releasing an NPC from a conversation that ended; the drain lock while a battle holds a queue (a held queue is not work); the grass trigger; warps; publishing the standing row and settling it to Idle; the disarm and the NPC reset when the last player leaves; the recovery after a tick whose transaction failed (a one-shot row is consumed and its re-arm rolled back); and converting the interval rows a live database holds at publish. It SHALL name the slices that build it, by a note in this spec.
- **lpw-35.5:** WHEN the design is recorded, THE SYSTEM SHALL state, for the chosen design, how a world maps a signed-in account to one player identity whatever the client, what the desktop client keeps and where, that a browser keeps nothing past its session (lpw-2's `localStorage` for `local` and `private` targets in a browser removed), what a player who signed in at one client sees on joining from another, and the test that proves each.

- DoD: the record, a judge's scores over the alternatives, and "An empty zone does no work; no state depends on a tick having run" amended in the game's `docs/DECISIONS.md`.

### lpw-27 — tactical content joins the rows it describes, and a test builds a content row in one place (design)

type: design · tier: hard
touches: docs/refactors/tactics-content.md, docs/DECISIONS.md
after: [lpw-25]

- Operator, 2026-11-22 (decision review, concern 4). "Tactical content lives in sidecar registries keyed by id" gives two reasons: a new field breaks about 100 hand-built struct literals in tests, and the 1v1 system was not yet retired. bt-17 retired it. The first reason is test brittleness shaping content, which `standards/decisions.md` no longer accepts as a reason.
- The design to judge, over at least two alternatives: one constructor per carried content struct that tests call, so a new field edits one place; then the tactical fields folded onto `SkillDef`, `Species`, `ItemDef`, `ZoneDef` and the encounter row, with the `encounter` table's schema change taken at the second consolidation (lpw-33). Alternatives: a test-only `Default` per carried struct, used as `..Default::default()`, with the sidecars kept; and keeping the sidecars as they are with a product reason recorded. The fold adds no column to a public content table (`species_row`, `skill_row`, `item_row`, `zone_def`, `encounter`) except through lpw-33.

- **lpw-27.1:** WHEN the design is recorded, THE SYSTEM SHALL state in `docs/refactors/tactics-content.md` the count of struct literals of each carried content type outside its constructor, the chosen home of each tactical field, what the fold changes in `CONTENT_VERSION`, the content tables and the client's wasm exports, and the slices that build it, each small enough to merge alone.

- **lpw-27.2:** WHEN the alternative kept is the sidecars, THE SYSTEM SHALL record in the game's `docs/DECISIONS.md` a reason that names no test, tool or file list.
- DoD: the record, a judge's scores, the `docs/DECISIONS.md` entry rewritten to the outcome, and the building slices named in this spec by a note.

### lpw-29 — a PvP battle's anchor hides the opponent's roster until the battle is Active

type: feature · tier: hard
touches: server-module/src/schema.rs, server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, server-module/src/privacy_enforcement_tests.rs, client/src/net/store.ts, client/src/net/store.test.ts, client/src/main.ts, client/e2e/tactics-pvp.spec.ts, docs/DECISIONS.md
after: []

- Operator, 2026-11-22 (decision review, concern 5). "Tactical battle privacy is structural…" records as an accepted reveal that `my_battle` returns the whole `Battle` row, so from Deploying each PvP player sees the opponent's species, levels, stats and known skills. No schema or bindings change and no data wipe: this is not the consolidation (lpw-32) and is not schema-serial.
- Contract: only for a `Pvp` battle whose `battle_tactical` phase is Deploying and whose two identities differ, `my_battle` returns the caller a copy of the row with the other side's `team` empty; a wild battle, a Practice battle and every Active or Finished battle are returned as stored. The stored row is unchanged, so settlement, forfeit and disconnect during Deploying write back as today. The client's own-perspective conversion and its DEV battle hook accept an empty opponent team. The e2e named in `touches:` is the tactical PvP spec; the slice confirms its path at the start and widens if it differs.

- **lpw-29.1:** WHEN a PvP battle between two players is Deploying, THE SYSTEM SHALL deliver to each participant, through every view, no species, level, stat or skill of the opponent's monsters.

- **lpw-29.2:** WHEN that battle becomes Active, THE SYSTEM SHALL deliver the opponent's side as it does today, and a wild or Practice battle SHALL be delivered whole in every phase.

- **lpw-29.3:** WHEN a participant forfeits or disconnects while the battle is Deploying, THE SYSTEM SHALL settle and write back HP as it does today.

- **lpw-29.4:** WHEN the client receives a battle row whose opponent team is empty, THE CLIENT SHALL show the deploy panel and report no error.
- DoD: lpw-29.1 to lpw-29.4 green; `just ci` and the e2e green; the "Accepted reveals" sentence of "Tactical battle privacy is structural…" reworded in place.

### lpw-32 — the schema is consolidated: the retired 1v1 tables, their reaper and a retired column go

type: feature · tier: hard
touches: server-module/src/schema.rs, server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/evolution.rs, server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, server-module/src/privacy_enforcement_tests.rs, game-core/src/lib.rs, game-core/src/combat/pvp.rs, game-core/src/combat/mod.rs, evals/battle-schema-snapshot.eval.mjs, evals/spacetime-type-snapshot.eval.mjs, evals/account-e2e.eval.mjs, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, client/src/net/wireContract.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/player_table.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, docs/DECISIONS.md, docs/runbooks/playtest-ops.md
after: [lpw-20, lpw-25, lpw-34]

- Operator, 2026-11-22 (decision review, concern 5): a wipe-and-consolidate pass now, and a second before early access (lpw-33). No database holds data worth keeping yet, so what "Schema changes are additive" has kept only for live data goes in one declared break.
- Contract: always-serial, and the one slice allowed a change the automatic migration refuses. It launches only when no unmerged slice touches `server-module/src/schema.rs`, `game-core/src/lib.rs` or `evals/baselines/table-schemas.json`, and a schema slice queued meanwhile waits on it. It removes: the tables `battle_action`, `battle_wild` and `pvp_deadline_schedule` with their manifest entries, exporters and cascade steps; the scheduled reducer `pvp_deadline_reaper` and `disarm_pvp_deadlines`; `player.last_input_seq` (`seed_intent` then reads `acked_seq` alone); `world_access`'s salt and hash columns (dead after lpw-20); and the game-core items left with no caller (`PvpAction`, `pvp_deadline_forfeit_side`). `battle_wild_unit` stays: it is live. It neither keeps nor removes anything of the world binding (lpw-15): lpw-35 decides that, and lpw-33 removes what it leaves dead. Both protocol numbers rise and the wire contract gains its entry. The two append-only evals skip their merge-base comparison only when the working baseline carries a top-level `consolidation` marker naming this slice that its merge-base copy lacks; the next schema change removes the marker. `evals/account-e2e.eval.mjs` stops querying the dropped tables. The data deletion is one step the runbook names: `just playtest-wipe` for the playtest database and a local `--delete-data` publish (the nightly republish check already starts from an empty in-memory host). "Schema changes are additive" is rewritten: additive between consolidations, and a consolidation is a slice the spec declares.

- **lpw-32.1:** WHEN the module's tables and reducers are listed from its generated definition, THE SYSTEM SHALL hold no `battle_action`, `battle_wild` or `pvp_deadline_schedule` table and no `pvp_deadline_reaper`, `player` SHALL have no `last_input_seq` column, and `world_access` no salt or hash column.

- **lpw-32.2:** WHEN an account is deleted, exported or claimed on the consolidated module, THE SYSTEM SHALL do as it does today for every table that remains.

- **lpw-32.3:** WHEN a later schema change removes or reorders a column, table or variant without a consolidation marker for its own slice, THE SYSTEM SHALL fail the two append-only checks as it does today.

- **lpw-32.4:** WHEN a client built before the consolidation connects, THE CLIENT SHALL be told to update the game, shown by lpw-4.1's test under the raised `MIN_CLIENT_PROTOCOL`.
- DoD: lpw-32.1 to lpw-32.4 green; `just ci`, the e2e and the nightly republish check green; `bindings-drift` clean; the wipe of the playtest database recorded in the PR; the `docs/DECISIONS.md` entries "Schema changes are additive" and "Battles run on one engine at a time…" rewritten.

### lpw-33 — the second schema consolidation, before early access (reserved)

type: feature · tier: hard
touches: server-module/src/schema.rs
after: [lpw-32]
blocked: early-access-schema-freeze — the last consolidation runs once every schema-changing slice of the early-access milestones (M-local-play, M-account-service, M-gamepad) has merged; lifted by the supervisor then, when this section is elaborated from what those slices retired; fallback: none, early access is gated on it (PLAN §9).

- Operator, 2026-11-22: a second wipe-and-consolidate pass is planned and performed before early access. Reserved so the gate has an id; its contract and criteria are written when it is unblocked, on lpw-32's model, and it takes the `encounter` table change of lpw-27's fold if that design chose the fold.

### lpw-30 — the mutation gates judge rules, not log lines: game-core stays zero-tolerance nightly, the server is gated on a pull request's changed lines

type: feature · tier: hard
touches: .cargo/mutants.toml, justfile, .github/workflows/nightly.yml, .github/workflows/ci.yml, CONTRIBUTING.md, docs/DECISIONS.md
after: []

- Operator, 2026-11-22 (decision review, concern 6), on the condition that the gates do not grow. The harness standard reads mutation scores as reports; the game's nightly gates are a recorded exception, and the server gate also requires killing a mutant that changes only a log line, which is paid for in tests that assert log text.
- Contract: `mutation` (game-core, nightly, every shard zero-tolerance) is unchanged. On the server, the bodies of the logging functions (`guards::log_reject`, `observability::mr_log`, `mr_log_breadcrumb`, `json_escape`) are excluded from mutation by function name in `.cargo/mutants.toml`, with one line of reason. The server's zero-tolerance gate moves from the nightly full sweep to the pull request: CI runs `just mutate-diff origin/master` restricted to `monster-realm-module`, so its base is the merge base. The full server sweep runs weekly, sharded as today, and files its survivors as one report issue on the default branch; it fails nothing. Accepted in writing in the `docs/DECISIONS.md` entry: a diff gate does not see a test weakened or deleted with no source line changed, which the weekly report is read for. A test that asserts only a log line's text is deleted, under `standards/testing-tdd.md` §Deleting a check, only when no tool parses the line it asserts (the `mr_log` envelope and its `evt` keys are parsed and stay tested); the files are widened as the slice measures them.

- **lpw-30.1:** WHEN cargo-mutants lists the server's mutants (`cargo mutants --list`), THE SYSTEM SHALL list none that replaces the body of `log_reject`, `mr_log`, `mr_log_breadcrumb` or `json_escape`.
- Verified by run, not by a test (CI wiring is not tested): one pull-request run with a planted server survivor that is never committed fails the diff gate and passes without it; one workflow-dispatch run of the weekly sweep on the branch exits zero with survivors listed, its issue step dry-run. Both run ids are in the PR.
- DoD: lpw-30.1 green; the two runs recorded; `just ci` green; "The nightly mutation gates run sharded and both are zero-tolerance" and `CONTRIBUTING.md`'s survivor rule rewritten.

### lpw-38 — the native test host on SpacetimeDB 2.12.0 and later (design)

type: design · tier: hard
touches: docs/refactors/native-test-host.md, docs/DECISIONS.md
after: []

- Residuals: R-lpw-34-NOTE7A6229.
- Found when lpw-34 parked (2026-11-22, its note n2): from crate 2.12.0 on, `spacetimedb-bindings-sys`
  defines `native_link_stubs` on every non-wasm target (`src/lib.rs:990` at 2.12.0, 2.14.1 and 2.16.1),
  strong `no_mangle` definitions of the host ABI that answer NOT_IN_TRANSACTION, with no feature to turn
  them off. `server-module/src/native_host_tests.rs` implements the host by defining the same symbols, so
  the server-module test binary fails to link on 18 duplicates; forced with
  `-Wl,--allow-multiple-definition`, the vendor stubs win and 769 of 1311 tests fail. The vendor's own
  harness is the `test-utils` feature (2.12.0 on), which dispatches at the Rust level through a
  `TestDatastore` in the table handle, not at the ABI. Until the Fixture has a host on 2.12.0 or later,
  no hop of lpw-34 can go green.
- Contract: a design slice; it changes no code. Probes run in a throwaway target directory and are
  reverted. The workspace `cargo check` is already clean on crate 2.12.0 with no source change.

- **lpw-38.1:** WHEN the design is recorded, THE SYSTEM SHALL state in `docs/refactors/native-test-host.md`, for at least two alternatives (the vendor's `test-utils` feature among them), how the Fixture in `native_host_tests.rs` gets its host on crate 2.12.0 and later, what of the Fixture's API and of the server-module tests it changes, and what each costs a test run, each measured on crate 2.12.0.

- **lpw-38.2:** WHEN the design is recorded, THE SYSTEM SHALL name the chosen alternative, whether it lands on crate 2.11.0 or as lpw-34's first hop to 2.12.0 (CLI, host, crate and SDK in lockstep), the files lpw-39 touches, and each server-module test whose assertion it would change, with the reason; a test changed without a named reason SHALL NOT be in the plan.

- **lpw-38.3:** WHEN the design is recorded, THE SYSTEM SHALL show, by a throwaway probe on crate 2.12.0, that the chosen alternative links the server-module test binary, with the count of tests that pass and the name of each that does not.
- DoD: lpw-38.1 to lpw-38.3 met; the plan merged; a `docs/DECISIONS.md` entry for the test host's design; lpw-39's `touches:` and `moved-tests:` written into the PR body for the supervisor to copy here.

Build note (lpw-38): Under lpw-38's chosen design the crates spacetimedb and
spacetimedb-bindings-sys become path packages (vendor/, [patch.crates-io]), and cargo audit 0.22.2
(rustsec 0.33, query_vulnerabilities) skips every package not sourced from crates.io, so CI's
blocking SCA step stops covering those two crates once lpw-39 merges. No advisory exists for them
today (OSV and GitHub, 2026-11-22). A slice cannot edit .github/workflows/ci.yml; the step needed is
a cargo audit over a lockfile naming the two crates at their vendored versions with a crates.io
source. Until then the upgrade runbook checks their advisories at each hop (lpw-39 writes that
step).

Build note (lpw-38): lpw-39's DoD says the plan file is updated to the built state, while
standards/spec-driven.md says the slice that makes a design's last extraction deletes its plan file.
lpw-38's file list follows lpw-39's DoD (the plan, docs/refactors/native-test-host.md, is brought to
the built state), because the plan holds the measurements behind the docs/DECISIONS.md entry and
lpw-34's later hops re-apply its patch. The supervisor may settle which rule binds before copying
lpw-39's touches.

Build note (lpw-38): For lpw-35 (a world's server checks a player's account itself, by procedures):
under lpw-38's chosen test host the vendored spacetimedb keeps its native-only ProcedureContext
branches (2.12.0 src/lib.rs:1563, :1609, :1808 panic; src/http.rs:559 returns an error), so a native
test of a procedure needs the same kind of cfg edit in vendor/native-host.patch plus procedure_*
host functions in native_host_tests.rs. The docs/DECISIONS.md entry 'Server-module tests run on our
own host ABI, over the two vendor crates patched where they refuse a native host' allows exactly
that. lpw-35's design should count those files.

Build note (lpw-38): SDK 2.12.0's token-rejection message carries the HTTP status
(dist/index.mjs:5219: 'Failed to verify token: ${status} ${statusText}').
client/src/net/authToken.ts never deletes a stored token on one rejection because the 2.11.0 message
could not tell a 401 from a transient 5xx. That reason stops holding at 2.12.0. lpw-39 keeps the
behaviour, since it is a refactor. A later slice may let a 401 count differently from a 5xx.

### lpw-39 — the native test host moves to the host lpw-38 chose, with the Fixture's API kept

type: refactor · tier: hard
touches: Cargo.toml, Cargo.lock, vendor/spacetimedb/**, vendor/spacetimedb-bindings-sys/**, vendor/native-host.patch, vendor/PRISTINE.sha256, vendor/README.md, .gitattributes, server-module/Cargo.toml, server-module/src/native_host_tests.rs, evals/account-e2e.eval.mjs, scripts/ci-tools.sh, client/package.json, client/package-lock.json, client/src/module_bindings/index.ts, client/src/net/authToken.test.ts, client/src/net/authToken.ts, docs/runbooks/spacetimedb-upgrade.md, docs/DECISIONS.md, ARCHITECTURE.md, AGENTS.md, README.md, docs/PLAYTEST.md, docs/runbooks/playtest-ops.md, docs/e2e-flakes.md, docs/local-play.md, scripts/playtest-report.mjs, .claude/skills/spacetimedb-reducer/SKILL.md, .claude/skills/spacetimedb-client/SKILL.md, docs/refactors/native-test-host.md
after: [lpw-38]

- `moved-tests:` `client/src/net/authToken.test.ts :: SDK-DRIFT (nh4): the spacetimedb SDK still throws the exact token-rejection message string > BITES: dist/index.mjs contains the literal substring "Failed to verify token: ${response.statusText}"` -> `client/src/net/authToken.test.ts :: SDK-DRIFT (nh4): the spacetimedb SDK still throws the exact token-rejection message string > BITES: dist/index.mjs contains the literal substring "Failed to verify token: ${status} ${statusText}"`
- Unblocked 2026-11-22 when lpw-38 merged (monster-realm #858): `touches:` and `moved-tests:` copied from its PR body; the plan is `docs/refactors/native-test-host.md` (alternative B, the two vendor crates patched in `#[cfg]` attributes, landing as lpw-34's first lockstep hop to 2.12.0). No server-module test changes; the one moved test above is the SDK-drift needle.
- Supervisor, 2026-11-22 (lpw-38 note n2), decision-defaulted: plan-file-lifecycle=keep — lpw-39 brings `docs/refactors/native-test-host.md` to the built state rather than deleting it, because lpw-34's later hops re-apply its patch and the `docs/DECISIONS.md` entry rests on its measurements; it is deleted when lpw-34 closes the upgrade.
- Always-serial, like lpw-34: it rewrites `Cargo.lock`, the client lockfile and the bindings, so it launches only when no unmerged slice touches the module, the bindings or a lockfile. The 2.12.0 host runs only under an isolated `HOME` with the 2.12.0 binaries first on `PATH` (a newer host stamps the shared data directory one-way).
- Contract: the extraction lpw-38's plan names, done as a refactor: every server-module test that passes before it passes after it, unchanged except where lpw-38's plan names the test and the reason. If the plan lands it as a hop to 2.12.0, the CLI, the host, the crate and the SDK move together by `docs/runbooks/spacetimedb-upgrade.md` and that hop counts as lpw-34's first.

- **lpw-39.1:** WHEN the server-module tests run after the change, THE SYSTEM SHALL link and pass every test that passed before it, on the crate version lpw-38's plan names, with the Fixture's public API unchanged.

- **lpw-39.2:** WHEN the server-module tests are built against crate 2.12.0, THE SYSTEM SHALL link the test binary with no duplicate host-ABI symbol and no linker flag that permits one.
- DoD: lpw-39.1 and lpw-39.2 green; `just ci` green; `ARCHITECTURE.md` and the plan updated to the built state.

### lpw-34 — SpacetimeDB moves from 2.11.0 to 2.16.1, with every measured fact re-measured

type: feature · tier: hard
touches: Cargo.toml, Cargo.lock, server-module/Cargo.toml, scripts/ci-tools.sh, scripts/smoke-republish.sh, client/package.json, client/package-lock.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, game-core/src/lib.rs, evals/baselines/table-schemas.json, evals/baselines/spacetime-types.json, server-module/src/native_host_tests.rs, AGENTS.md, README.md, .claude/skills/spacetimedb-reducer/SKILL.md, .claude/skills/spacetimedb-client/SKILL.md, docs/runbooks/spacetimedb-upgrade.md, docs/runbooks/playtest-ops.md, docs/runbooks/account-service.md, docs/PLAYTEST.md, docs/DECISIONS.md, docs/local-play.md, docs/send-pipeline-depth.md, docs/spacetimedb-2.16.md, scripts/verify-release-reducers.mjs, scripts/verify-release-reducers.test.mjs, justfile, server-module/src/privacy_enforcement_tests.rs, docs/e2e-flakes.md, scripts/playtest-report.mjs, .tool-versions, .npmrc, client/.npmrc, .github/workflows/ci.yml, .github/workflows/nightly.yml, .devcontainer/devcontainer.json, account-service/Dockerfile, vendor/spacetimedb/**, vendor/spacetimedb-bindings-sys/**, vendor/native-host.patch, vendor/PRISTINE.sha256, vendor/README.md, docs/refactors/native-test-host.md
after: [lpw-39]
- Parked 2026-11-23 (note n3; lpw-34.6 built on `slice/lpw-34` @ 2ca7d0a1): lpw-39 put the two patched crates under `vendor/` after this section was written, and the runbook re-vendors both at every hop, so `touches:` now declares `vendor/spacetimedb/**`, `vendor/spacetimedb-bindings-sys/**`, `vendor/native-host.patch`, `vendor/PRISTINE.sha256` and `vendor/README.md` (the 2.14.1 hop adds a file 2.16.1 replaces, hence the globs). It also declares `docs/refactors/native-test-host.md`, which this slice deletes when it closes the upgrade (lpw-39's plan-file-lifecycle default above).
- Unblocked 2026-11-23 (operator). All three park blockers are cleared: the native test host moved to a host that links on >= 2.12.0 (lpw-39, monster-realm #864); the operator raised Node to 24.22.3; and the operator approved installing SDK 2.16.1 ahead of the 7-day `min-release-age` cooldown, for that package only (`--min-release-age=0` for the one install; `.npmrc` keeps the rule). The operator also moved `happy-dom` to 21.0.4 for a security fix in 20.x. The starting point is the `wip:` commit `93643fa4` on `slice/lpw-34`: `.tool-versions`, `client/package.json` and `client/package-lock.json`. In that commit, five transitive versions the bypass let in younger than the cooldown were re-resolved under it, and everything else in the lockfile is at least 7 days old. Measured there, with the bindings still generated by 2.11: `npm ci` clean, client vitest 6694/6694, `tsc --noEmit` clean. Keep those three files as they are, except where a later hop needs a change. Any further npm install runs with the cooldown on, so no other package goes in younger than 7 days.
- Node 24.22.3 is pinned at every site on master (operator 2ade9cda, and #869: the account-service image digest, both `engines` ranges `>=24.22.1 <25`, and the cooldown-clean client lockfile). The client files are identical to `93643fa4`, so `slice/lpw-34` holds no diff from master (merged at 2705a5d5). Master is on crate, CLI and host 2.12.0 since lpw-39, with the npm SDK already at 2.16.1. The 2.12.0 hop is therefore built, and the hops left are 2.14.x and 2.16.1. lpw-34.2's "before" database is one the 2.12.0 host made. The harness gate CHECKs that put `nodejs/24.22.0/bin` on `PATH` still run, because `engine-strict` binds installs, not `npx` runs; say so in the PR body's list for the harness.
- Parked 2026-11-22 (no code shipped; `monster-realm-lpw-34-progress.md`): no version past 2.11.0 links the native test host (lpw-38, lpw-39 come first); and the SDK from 2.14.0 on declares `engines.node` `^22.23.4 || ^24.22.1 || >=26.12.1`, so under `engine-strict` the Node pin rises to 24.22.1 or later at every site note n1 lists (`.tool-versions`, both workflows, the `.npmrc` comments, the devcontainer, the account-service image digest, and the version named in `AGENTS.md`, `README.md` and `docs/PLAYTEST.md`). The marked hops: 2.12.0 (commit log), 2.14.0 (generated TS bindings' import extensions), 2.16.1 (old clients skip new columns; TS SDK callback errors fail the connection); 2.13.0 and 2.15.0 mark none.
- Operator, 2026-11-22: upgrade SpacetimeDB to its latest version, carefully and safely, bring every reference and document with it, and do it next: this slice launches ahead of every other queued slice of this spec, as soon as the slices in flight when it was written (lpw-19, lpw-21, st-13) have merged or parked with nothing left broken. The CLI, the host, the Rust crate and the npm SDK move together ("SpacetimeDB versions move in lockstep"), by `docs/runbooks/spacetimedb-upgrade.md`. Always-serial: it rewrites `Cargo.lock` and regenerates every binding, so it launches only when no unmerged slice touches the module, the bindings or a lockfile, and such a slice queued meanwhile waits on it.
- Contract: one hop per minor version the runbook or the vendor's release notes mark as changing the wire format, the commit log or the generated bindings, each hop green before the next; where none is marked, one hop. This slice turns on the crate's `unstable` feature (operator, 2026-11-22) in the workspace's `spacetimedb` dependency, with nothing using it yet, so that one slice measures and records what it does. The feature is not inert: at 2.11.0 it adds an exported entry point for HTTP handlers and two sections to the module definition whether or not a handler exists. The slice records the built module's export list, its imports and its size with the feature off and on, and proves the native test binary links with it on. The access design's guarantee that the module can declare no HTTP handler and no row filter rested on the feature being off; it is replaced here by a check of the generated module definition (no HTTP handler, no HTTP route, no row filter) that runs as a test on the default build and, through `scripts/verify-release-reducers.mjs`, on each artefact `just release-module` makes, since a declaration behind a release feature is invisible to the test build. The reducer census stays the one guard on procedures: it refuses every `procedure` attribute until a slice lists one there. Every statement in the game's documents that says "measured on 2.11.0" is measured again or removed: the host's HTTP routes run the connect reducer first (`docs/local-play.md` §3, the table the access design says is repeated at every host upgrade); a subscribed row that gained a column and an older SDK (lpw-25's premise); the commit log holding reducer arguments; the query sharing and pruning "World rows are subscribed by zone" rests on; the local-play budgets of §6. `docs/spacetimedb-2.16.md` records what changed between the two versions that this game uses or could use, each with its source: every API the `unstable` feature gates at 2.16.1 (the HTTP client, HTTP handlers, row filters and any other), and whether procedures, event tables, view arguments and the vendor's unit-test harness are stable; for each, whether the game uses it (none at merge), one concrete use here with what it would replace and what it would cost, and whether it could make the game better for a player (the hand-written test host in `native_host_tests.rs`, the host gate's door endpoint, a world's own account checks, stored battle transcripts and the idle tick's commits are the candidates to assess). It corrects any statement in the game's documents and skills that the vendor's "common misconceptions" page contradicts. The harness's own notes (`docs/research/spacetimedb.md`, `memory/spacetime-db-testing.md`, the SpacetimeDB documentation server's version) are outside a game slice: the PR body lists each statement there that is now wrong, and the supervisor ships them as a doc-only PR at merge. If lpw-25 has merged, the wire contract gains its entry when the bindings change (its file is then widened).

- **lpw-34.1:** WHEN the workspace is built and tested after the upgrade, THE SYSTEM SHALL use 2.16.1 for the CLI, the host, the crate and the SDK, with `just ci`, the e2e suite and the nightly jobs green and `bindings-drift` clean.

- **lpw-34.2:** WHEN a database created and played on by the 2.11.0 host with the module before this slice is opened by the 2.16.1 host and published over with the upgraded module, THE SYSTEM SHALL keep every row, and a returning player SHALL resume the same identity and position.

- **lpw-34.3:** WHEN a client built before the upgrade connects to the upgraded server, THE CLIENT SHALL either play or be told which side to update (lpw-4), never fail silently.

- **lpw-34.4:** WHEN the upgrade is recorded, THE SYSTEM SHALL hold no statement in the game's documents, skills or `AGENTS.md` that names 2.11.0 as the version in use, and each re-measured fact SHALL state the version it was measured on.

- **lpw-34.5:** WHEN a re-measured fact differs from the recorded one, THE SYSTEM SHALL amend the `docs/DECISIONS.md` entry that rests on it, and file a note for any slice of this spec whose contract it changes.
- **lpw-34.6:** WHEN the module's generated definition, on the default build or on an artefact `just release-module` made, holds an HTTP handler, an HTTP route or a row filter, THE SYSTEM SHALL fail (the test, or the recipe), watched failing once on a planted handler that is never committed.

- **lpw-34.7:** WHEN the module is built with `unstable` on, THE SYSTEM SHALL build for the module target, link its native tests, publish and run on the 2.16.1 host, and the record SHALL list what the feature added to the artefact.
- DoD: lpw-34.1 to lpw-34.7 green; the statements in `docs/local-play.md` §3 and `docs/DECISIONS.md` that rest on `unstable` being off rewritten; the live two-client e2e the lockstep entry requires for an SDK bump; `docs/spacetimedb-2.16.md` merged; the list for the harness in the PR body.

### lpw-35 — a world's server checks a player's account itself (design)

type: design · tier: hard
touches: docs/refactors/account-checks.md, docs/DECISIONS.md
after: [lpw-34]

- Operator, 2026-11-22: the crate's `unstable` feature may be turned on for procedures, which can make HTTP requests and run from a schedule table. lpw-23 and lpw-24 carry every account re-check on the client, so a client that never asks is never re-checked; a server that asks for itself closes that. The operator also asks whether the server can ask by a token instead of by account, and how much of the attestation and identity machinery is still needed.
- Operator, 2026-11-22 (monster-realm#855): a player's character in a world follows their account, not their client: the same Steam-backed account joining the same world from the desktop app or from any browser continues the same character. At sign-in the account service supplies the identity the world authenticates and authorizes; the desktop client may keep it, a browser keeps nothing past its session and signs in again. Every alternative is judged on meeting this, with fork (c)'s relay still closed (a hostile host given that identity can reach no other world as the player). Correction, same issue: the once-a-day re-check is done by the server and covers only the hosting account; a joining player is checked at each connection only (a browser: once per browser session).
- The design to judge, over at least three alternatives. (A) Keep the attestation (lpw-15) and add a scheduled procedure that re-checks each binding through a handle the account service issued at bind: opaque, one per account per world, revocable, so the world never names an account to ask about it. (B) Replace the in-module signature check with a join ticket, as Minecraft's session check does: the client tells the account service which world it is joining and gets a one-use ticket, the world's procedure presents the ticket with its own name, and the service answers with the handle and the entitlement; no attestation key in any build, no verifier crate, no nonce table. (C) For the desktop build, the ticket is Steam's own: a Web API ticket whose identity string names the world, verified by the account service for the world's procedure; (B) for a browser. What lpw-15 and acs-3 already built is not a criterion (operator, 2026-11-22: only the best final design counts): the cost of removing it is reported, not scored. In every alternative the publisher key never leaves the account service, the world's name is still the one the player's own software authenticated (fork (c)), and a first bind needs the world's host online.

- **lpw-35.1:** WHEN the design is recorded, THE SYSTEM SHALL state in `docs/refactors/account-checks.md`, for each alternative: what the world, its host, the account service and a reader of the world's data directory each learn and keep about a player; what a hostile host can replay or relay and where it is refused; what happens to a first bind and to a re-check when the world's host, the player or the service is offline; and which tables, reducers, crates, build key lists and account-service routes it adds or removes against what lpw-15 and acs-3 built.

- **lpw-35.2:** WHEN the design is recorded, THE SYSTEM SHALL show by measurement on the pinned host: a procedure's HTTP request from a standalone host, its timeout and its behaviour with no network; that a scheduled procedure's failed run leaves the stored status unchanged and is tried again; and what it costs the reducer thread.

- **lpw-35.3:** WHEN the design is recorded, THE SYSTEM SHALL name each procedure the chosen design declares and what lpw-34's module-definition check and the reducer census must then allow, and nothing wider.

- **lpw-35.4:** WHEN the design is recorded, THE SYSTEM SHALL list the changes it makes to lpw-2, lpw-23, lpw-24, lpw-19, lpw-22, lpw-36, acs-3 and acs-12, the slices that build it, and every table, view, reducer and crate of lpw-15 the chosen design leaves dead, which lpw-33 removes, by a note in this spec.
- **lpw-35.6:** WHEN the design is recorded, THE SYSTEM SHALL state, for the chosen design, how the server's own daily check of its hosting account runs (no client involved) and that no joining player is re-checked within a connection, and how it narrows the two cases where an address changes hands: a friend's page served with no persistent cache and no service worker, and the daily check confirming the server's public address so a moved server stops accepting its old one within a day; each with the test that proves it, or the measured reason it cannot.

- DoD: the record, a judge's scores over the alternatives, the `docs/DECISIONS.md` entries "A private world verifies an account by a per-world attestation our account service signs" and "The official build holds no attestation key…" amended to the outcome, and the building slices named.

### lpw-36 — a caller who is not entitled is refused by every reducer, not only at the join

type: feature · tier: hard
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/accounts.rs, server-module/src/accounts_tests.rs, server-module/src/privacy_enforcement_tests.rs, docs/DECISIONS.md, server-module/src/lib.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs, server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs
after: [lpw-23]

- Residuals: R-acs-6-NOPLAYERROWREDUCERS.
- Operator, 2026-11-22 (decision review, concern 1). `accounts::require_entitled` is called by `join_game` alone, so on an enforcing build an identity that has joined keeps moving, battling and trading after its account stops being entitled (lpw-23 can store that), and the five reducers that need no player row never ask. "Ownership is enforced unless a dev feature switches it off" records the gap.
- Contract: on an enforcing build the ownership rule is made where the admission rule is: one shared gate at the head of every client-callable reducer, never a call copied into each. The reducers it does not gate are the ones a player who is not entitled must still reach: the bind and nonce reducers, `unbind_world_account`, the account's own deletion, export and claim reducers, and the owner-only ones. The roster comes from the generated bindings, as the admission roster does, so a reducer added later is gated or fails the test. What "entitled" means stays inside `entitled(ctx)`; lpw-35 may change it without touching this gate. A build that does not enforce gates nothing.

- **lpw-36.1:** WHEN an identity that is not entitled calls any client-callable reducer on an enforcing build, other than the ones the contract exempts, THE SYSTEM SHALL refuse it with acs-6.1's error and write nothing, whether or not it has joined.

- **lpw-36.2:** WHEN an identity that is not entitled calls an exempt reducer, THE SYSTEM SHALL run it as it does today.

- **lpw-36.3:** WHEN a build does not enforce ownership, THE SYSTEM SHALL run every reducer for an identity with no token and no binding as it does today.
- DoD: lpw-36.1 to lpw-36.3 green, on the dev-enforcing build and on the test build; `just ci` green; the `docs/DECISIONS.md` entry rewritten.

### lpw-37 — a build that names no feature enforces ownership

type: feature · tier: hard
touches: server-module/Cargo.toml, justfile, justfile.test.mjs, scripts/smoke-republish.sh, .github/workflows/nightly.yml, .github/workflows/ci.yml, .cargo/mutants.toml, client/e2e/global-setup.ts, evals/bindings-drift.eval.mjs, README.md, docs/PLAYTEST.md, docs/runbooks/playtest-ops.md, docs/runbooks/spacetimedb-upgrade.md, docs/local-play.md, docs/DECISIONS.md, evals/account-e2e.eval.mjs
after: [lpw-34, lpw-30, lpw-36]

- Residuals: R-acs-6-DEFAULTOPEN.
- Operator, 2026-11-22 (decision review, concern 1). `default = ["open_join"]`, so the module cargo builds when nobody says anything admits anonymous players and trusts the dev keys; "Ownership is enforced unless a dev feature switches it off" states the aim as the opposite and lists the sites. acs-6 could not make the change: the files are ones a run is never granted, so this section declares them.
- Contract: `open_join` leaves `default`. Every site that builds, tests, publishes or generates for anonymous play names it: found by listing every `spacetime build`, `spacetime publish`, `spacetime generate`, `cargo build`, `cargo check`, `cargo nextest` and `cargo mutants` invocation in the repository (recipes, scripts, workflows, e2e set-up, evals, documents), each one named in the PR as changed or as needing no change. Whether a feature given through `--build-options` reaches cargo on a `--module-path` publish is measured first; where it does not, the site builds the module itself and publishes the artefact. The generated bindings are the same for every feature set, so `just gen` and `bindings-drift` are unchanged in result.

- **lpw-37.1:** WHEN the module is built with no feature named, THE SYSTEM SHALL refuse an anonymous `join_game` with acs-6.1's error and trust no login issuer and no attestation key.

- **lpw-37.2:** WHEN `just test`, `just ci`, the e2e suite, the nightly jobs and the README's first-run steps are run after the change, THE SYSTEM SHALL pass, each joining anonymously only through a build that names `open_join`.
- Verified by run for the wiring (CI wiring is not tested): one full `just ci`, one e2e run and one workflow-dispatch nightly on the branch, their run ids in the PR.
- DoD: lpw-37.1 green; the runs recorded; the `docs/DECISIONS.md` entry and `docs/local-play.md` §3 fork (e) rewritten to the built state.
