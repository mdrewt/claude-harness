# Spec: M-local-play — single-player worlds and friends hosting

**Status:** elaborated 2026-11-16 (`lp-spec`) into 18 `lpw-` slices, with lpw-19 and lpw-20 added 2026-11-22 by the operator's rulings on monster-realm#833 and #840; lpw-8 and lpw-15 revised the same day for the ownership rule (every player owns the game on Steam; M-account-service) (lpw-18, the friends-server transport, added 2026-11-16 by the operator's ruling on monster-realm#821), against game `master`
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

| Sketch item | Slices | Re-verified at `63fc0b0a` |
|---|---|---|
| LP2 Desktop shell | lpw-10 (overlay proof), lpw-11 (shell, join by address), lpw-12 (bundled host behind a host gate) | No shell package exists (no `desktop/`, no Electron dependency). The Steam overlay over an Electron window is still unmeasured (`docs/local-play.md` §2) |
| LP3 Worlds | lpw-13 (worlds), lpw-16 (telemetry opt-in) | No world registry; `init` stores the publisher as `config.owner_identity`, and `sync_content` refuses every other caller |
| LP4 Sign in once, then offline | lpw-1 (sign-in off), lpw-2 (identity across launches), lpw-15 (world binding) | `createAuthTokenGate` keeps the reconnect token in `sessionStorage` (`client/src/net/authToken.ts`); `ALLOWED_ISSUERS` in `server-module/src/accounts.rs` is the `.invalid` placeholder, so no account issuer exists |
| LP5 Open to friends | lpw-18 (transport: per-world certificate, TLS at the gate, pinned invites), lpw-14 | Nothing listens beyond what the host is started with; the host fetches any issuer a token names (`docs/local-play.md` §5) |
| LP6 Private-server access | lpw-7 (verifier spike), lpw-8 (access design), lpw-9 (access rule), lpw-15 (account check and allowlist) | The module has no access rule: `on_connect` opens a session for every connection and checks issuer and audience only for a token that carries a JWT |
| LP7 Standalone server package | lpw-17 (with automatic certificates for a domain) | Nothing packaged |
| LP8 Unattended upgrade | lpw-3 (protocol numbers, every publish path re-seeds as the owner), lpw-4 (the client refuses a server it cannot speak to), lpw-13 (the shell upgrades a world) | `init` runs only at database creation; `just publish` makes no `sync_content` call (`playtest-up`, `playtest-wipe` and `scripts/smoke-republish.sh` do); the client has no version check, only the `content-stale` hint a failed zone switch raises |
| LP9 Alone is complete | lpw-5 (content audit), lpw-6 (empty Challenges tab) | No evolution path names a trade or PvP condition (`EvolutionPath` gates are level, essence, trust, quality time, nutrition). Players shows `social.players.none` (`leaderboardView.ts`), Trades `trade.status.none` (`tradeView.ts`), Rankings `leaderboard.empty`; only Challenges (`pvpView.ts`) is bare |

## What later slices consume

| Contract | Consumers | Where it is held |
|---|---|---|
| LP1 — the shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, its resolution rules (the `db` charset `[A-Za-z0-9_-]+`, a `uri` path that ends in `/` with no dot segment) | lpw-2, lpw-11, lpw-13, lpw-16, lpw-14 | `docs/DECISIONS.md` "The connection target is run-time configuration" and `ARCHITECTURE.md` "Connection and store"; `shellDocument.test.ts`, `connectionConfig.test.ts`, `client/e2e/shell-config.spec.ts` |
| The desktop shell (Electron) sets `__MR_SHELL_CONFIG__` from a preload script before the page's module script runs | lpw-11 | "The desktop shell is Electron"; it stands on the Steam overlay drawing over an Electron window on Windows, proved by lpw-10 before anything else is built on the shell |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for a single-player world and a friends server | lpw-12, lpw-14, lpw-17 | "Local-play budgets are measured medians"; `docs/local-play.md` §6. Each consuming slice's criteria cite a number from it |
| LP10 — a `local`/`private` target gets no telemetry, and `connect` gets neither the build's issuer nor its client id | lpw-1, lpw-16, lpw-15 | "A target's kind gates telemetry and account sign-in"; `observability/config.test.ts`, `main.targetKindGate.test.ts`. lpw-16's opt-in, lpw-15's binding and lpw-1's sign-in-off mode are the only paths that may change it |
| The protocol numbers (lpw-3): `module_info.protocol` and `module_info.min_client_protocol`, and the client's own `protocol_version()` | lpw-4, lpw-13, lpw-17 | lpw-3's `docs/DECISIONS.md` entry |
| The access design (lpw-8): how an unadmitted connection is held off world rows, how the official server refuses binding, how relay is closed | lpw-9, lpw-14, lpw-15 | lpw-8's `docs/local-play.md` §3 update and `docs/DECISIONS.md` entries |
| The host gate (lpw-12): the only listener a page or a friend reaches; a route allow-list, an `Origin` rule and the issuer rule in front of the host | lpw-13, lpw-18, lpw-14, lpw-17 | lpw-12's `docs/DECISIONS.md` entry |
| The transport rule and the world certificate (lpw-18): TLS beyond loopback, the certificate fingerprint in the invite and the shell document, the shell's pin, the reconnect key `(fingerprint, db)` for a pinned target | lpw-14, lpw-17, lpw-8 (relay lead) | the game's `docs/DECISIONS.md` "Private servers carry their own encryption: a real certificate for a domain, a pinned self-signed one otherwise; plaintext only on loopback" |

## Named deferrals (declared, not dropped)

| Deferred | Target | Why |
|---|---|---|
| A player opt-in that turns telemetry on in a `local` or `private` world | lpw-16 | It needs a settings surface and a stored choice per world (lpw-13); until then the rule is simply off |
| The bundled and standalone server sending nothing to our stack | lpw-12 (bundled host) and lpw-17 (standalone package) | Our stack only receives what we configure it to scrape; what the SpacetimeDB host itself sends off the machine is measured in `docs/local-play.md` §5 and held by the packaging slices |
| Account sign-in toward a `local` or `private` world | lpw-15 | The account token is the account issuer's id_token, addressed to the build-wide client id; a host that received it could replay it. lpw-1 makes sign-in off complete for those kinds; only the attestation binding (lpw-15) brings an account to such a world, and never as the connection token |
| OIDC issuer, client id and redirect as run-time configuration | lpw-15 | A world that is its own issuer changes what those values mean; they stay build-time until that design is verified |
| A transport rule for plaintext `ws:` to a non-loopback host | the operator (decided 2026-11-16, monster-realm#821, revised the same day: plaintext only on loopback; a domain uses a real certificate, a bare IP or LAN address a pinned self-signed one), lpw-18 (enforces), lpw-17 (domain certificates) | The resolver accepts plaintext `ws:` to any host; with lpw-2 the token it carries also lives across launches |
| A friends-server footprint under battles and trades, not walking alone | follow-up row R-lp-spec-NOTED803F5 (`mr_load_driver` battle and trade load) | `mr_load_driver` drives movement only; the friends-server memory and disk budgets stay a walking-only floor until the driver can battle and trade |
| The opening notice that a host can read a joiner's data | lpw-9 | Part of private-server access (decision-defaulted below) |
| Steamworks in the shell: overlay enable, Steam Input | `M21b-3 Steamworks in the shell` (PLAN §9); the Steam sign-in is M-account-service acs-12 | lpw-10 proves the overlay can draw; wiring Steamworks into the shipped shell is the Steam build's integration, which M21b-3 scopes on top of lpw-11's shell |
| A movement tick that commits a transaction five times a second while only idle players are in a zone (R-lpg-0-IDLETICK) | backlog (the open row) | NPCs step on that tick while a player is present, so an idle player's zone is not idle; whether a transaction that writes no row still appends to the commit log at 2.11.0 is unmeasured. 1.24 MiB an hour is a tenth of the single-player disk budget (12 MiB an hour, `docs/local-play.md` §6) |
| A rule in front of the official host that drops a token naming an unlisted issuer (R-lpg-0-ISSUERFETCH, official half) | M25 (PLAN §9 item 3; follow-up row R-lp-spec-NOTEC8F763) | The official deployment is not this milestone; lpw-12, lpw-14 and lpw-17 close it for local, friends and standalone servers |
| A wrong-audience account token on the host's HTTP call and sql routes (R-lpg-0-HTTPAUDIENCE) | lpw-8 measures it; it binds only on the audience-scoped fallback | The own-issuer design never hands a private host an account token; the fallback makes the official module's audience check the single defence |
| A server-side refusal of a client older than `min_client_protocol` | none (by design) | lpw-4 is a player-facing message, not a security gate: every reducer already validates its own input against authoritative state |

## Decisions the operator owns (defaults recorded; each reversible)

Each default stands unless the operator overrules it:

- `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new` — when the identity
  provider cannot be reached, a private server accepts players it has already seen and refuses new
  ones (consumed by lpw-15, where "cannot be reached" is a joiner who presents no attestation: one
  admitted before is admitted again, a new one is refused).
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by lpw-9).
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
- **Device-kept tokens (lpw-2).** A token in persistent storage outlives the tab: anyone using the
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

### lpw-10 — the Steam overlay draws over an Electron window

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-8]
blocked: operator-steam-machine — lifted when the operator runs the probe below on a Windows machine with the Steam client and records the result in `docs/local-play.md` §2 (the loop has no Steam client); who lifts it: the operator; fallback if the overlay cannot draw: lpw-11 onward waits on a `type: design` slice that re-scores the shells with `docs/local-play.md` §2's evidence (Electron 44, the launcher 44, Tauri 43 without an overlay).
- Probe: Electron 45 with `steamworks.js`, the main process calling `electronEnableSteamOverlay()`, app id 480, the unchanged client bundle loaded from a custom protocol; Shift+Tab opens the overlay over the game window. `after: [lpw-8]` serializes the edits to `docs/local-play.md`, nothing more.

- **lpw-10.1:** WHEN the probe runs under the Steam client on Windows, THE SYSTEM SHALL record in `docs/local-play.md` §2 whether the overlay draws over the game window, with and without GPU flags, and the Electron and `steamworks.js` versions.
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
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/privacy_enforcement_tests.rs, evals/baselines/client-callable-reducers.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/set_world_access_reducer.ts, client/src/module_bindings/admit_reducer.ts, docs/local-play.md
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
