# Spec: M-local-play — single-player worlds and friends hosting

**Status:** elaborated 2026-11-16 (`lp-spec`) into 18 `lpw-` slices, against game `master`
`63fc0b0a` (`84e3cd96` plus the doc-only #820) and `lpg-0`'s record (the game's
`docs/local-play.md`). The groundwork (LP0, LP1, LP10 as `lpg-0`, `lpg-1`, `lpg-10`) is built:
PLAN §Built · **Project:** monster-realm (client, server module, `game-core`, a new desktop shell
package) · **Design SSOT:** `game-design.md` §14 · **Target:** the early-access release.
**Anchors are symbols and files, never line numbers.** **Doctrine:** `standards/testing-tdd.md`
(no new eval scripts, source-text scans or checks-of-checks).

Slice ids use the `lpw-` prefix (`lp-` names the harness loop-infrastructure slices; `lpg-` the
groundwork). Build order is file order. A slice carrying `blocked:` is skipped until its lifting
event; the slices with no block build first (lpw-1 to lpw-9).

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
| LP2 Desktop shell | lpw-10 (overlay proof), lpw-11 (shell, join by address), lpw-12 (bundled host) | No shell package exists (no `desktop/`, no Electron dependency). The Steam overlay over an Electron window is still unmeasured (`docs/local-play.md` §2) |
| LP3 Worlds | lpw-13 (worlds), lpw-14 (telemetry opt-in) | No world registry; `init` stores the publisher as `config.owner_identity`, and `sync_content` refuses every other caller |
| LP4 Sign in once, then offline | lpw-1 (sign-in off), lpw-2 (identity across launches), lpw-15 (world binding) | `createAuthTokenGate` keeps the reconnect token in `sessionStorage` (`client/src/net/authToken.ts`); `ALLOWED_ISSUERS` in `server-module/src/accounts.rs` is the `.invalid` placeholder, so no account issuer exists |
| LP5 Open to friends | lpw-17 | Nothing listens beyond what the host is started with; the host fetches any issuer a token names (`docs/local-play.md` §5) |
| LP6 Private-server access | lpw-8 (verifier spike), lpw-9 (access design), lpw-16 (access rule) | The module has no access rule: `on_connect` opens a session for every connection and checks issuer and audience only for a token that carries a JWT the account issuer signed |
| LP7 Standalone server package | lpw-18 | Nothing packaged |
| LP8 Unattended upgrade | lpw-3 (protocol numbers), lpw-4 (re-seed after upgrade), lpw-5 (client refuses a server it cannot speak to) | `init` runs only at database creation and every publish path calls `sync_content` by hand (`justfile` `playtest-up`, `playtest-wipe`); the client has no version check, only the `content-stale` hint a failed zone switch raises |
| LP9 Alone is complete | lpw-6 (content audit), lpw-7 (empty Social tabs) | No evolution path names a trade or PvP condition (`EvolutionPath` gates are level, essence, trust, quality time, nutrition); the Social tabs show nothing when a list is empty, except Rankings (`leaderboard.empty`) |

## What later slices consume

| Contract | Consumers | Where it is held |
|---|---|---|
| LP1 — the shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, its resolution rules (the `db` charset `[A-Za-z0-9_-]+`, a `uri` path that ends in `/` with no dot segment) | lpw-2, lpw-11, lpw-13, lpw-14, lpw-17 | `docs/DECISIONS.md` "The connection target is run-time configuration" and `ARCHITECTURE.md` "Connection and store"; `shellDocument.test.ts`, `connectionConfig.test.ts`, `client/e2e/shell-config.spec.ts` |
| The desktop shell (Electron) sets `__MR_SHELL_CONFIG__` from a preload script before the page's module script runs | lpw-11 | "The desktop shell is Electron"; it stands on the Steam overlay drawing over an Electron window on Windows, proved by lpw-10 before anything else is built on the shell |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for a single-player world and a friends server | lpw-12, lpw-13, lpw-17, lpw-18 | "Local-play budgets are measured medians"; `docs/local-play.md` §6. Each consuming slice's criteria cite a number from it |
| LP10 — a `local`/`private` target gets no telemetry, and `connect` gets neither the build's issuer nor its client id | lpw-1, lpw-14, lpw-15, lpw-16 | "A target's kind gates telemetry and account sign-in"; `observability/config.test.ts`, `main.targetKindGate.test.ts`. lpw-14's opt-in, lpw-15/lpw-16's binding and lpw-1's sign-in-off mode are the only paths that may change it |
| The protocol numbers (lpw-3): `module_info.protocol` and `module_info.min_client_protocol`, and the client's own `protocol_version()` | lpw-4, lpw-5, lpw-13, lpw-18 | lpw-3's `docs/DECISIONS.md` entry |
| The access design (lpw-9): how an unadmitted connection is held off world rows, how the official server refuses binding, how relay is closed, the friends-server transport rule | lpw-15, lpw-16, lpw-17, lpw-18 | lpw-9's `docs/local-play.md` §3 update and `docs/DECISIONS.md` entry |

## Named deferrals (declared, not dropped)

| Deferred | Target | Why |
|---|---|---|
| A player opt-in that turns telemetry on in a `local` or `private` world | lpw-14 | It needs a settings surface and a stored choice per world (lpw-13); until then the rule is simply off |
| The bundled and standalone server sending nothing to our stack | lpw-12 (bundled host) and lpw-18 (standalone package) | Our stack only receives what we configure it to scrape; what the SpacetimeDB host itself sends off the machine is measured in `docs/local-play.md` §5 and held by the packaging slices |
| Account sign-in toward a `local` or `private` world | lpw-15 / lpw-16 | The account token is the account issuer's id_token, addressed to the build-wide client id; a host that received it could replay it. lpw-1 makes sign-in off complete for those kinds; only the attestation binding (lpw-15) brings an account to such a world, and never as the connection token |
| OIDC issuer, client id and redirect as run-time configuration | lpw-15 / lpw-16 | A world that is its own issuer changes what those values mean; they stay build-time until that design is verified |
| A transport rule for plaintext `ws:` to a non-loopback host | lpw-9 (decides), lpw-17 (enforces) | The resolver accepts plaintext `ws:` to any host; who may serve plaintext is an access-design question |
| A friends-server footprint under battles and trades, not walking alone | lpw-17 | `mr_load_driver` drives movement only; the friends-server memory and disk budgets are a walking-only floor |
| The opening notice that a host can read a joiner's data | lpw-16 | Part of private-server access (decision-defaulted below) |
| Steamworks in the shell: overlay enable, Steam Input, the Steam sign-in protocol | `M21b-3 Steam login` (PLAN §9) | lpw-10 proves the overlay can draw; wiring Steamworks into the shipped shell is the Steam build's integration, which M21b-3 scopes |
| A movement tick that commits a transaction five times a second while only idle players are in a zone (R-lpg-0-IDLETICK) | backlog (the open row) | NPCs step on that tick while a player is present, so an idle player's zone is not idle; whether a transaction that writes no row still appends to the commit log at 2.11.0 is unmeasured. 1.24 MiB an hour is a tenth of the single-player disk budget (12 MiB an hour, `docs/local-play.md` §6) |
| A rule in front of the official host that drops a token naming an unlisted issuer (R-lpg-0-ISSUERFETCH, official half) | M25 (PLAN §9 item 2) | The official deployment is not this milestone; lpw-17 and lpw-18 close it for friends and standalone servers |
| A wrong-audience account token on the host's HTTP call and sql routes (R-lpg-0-HTTPAUDIENCE) | lpw-9 measures it; it binds only on the audience-scoped fallback | The own-issuer design never hands a private host an account token; the fallback makes the official module's audience check the single defence |

## Decisions the operator owns (defaults recorded; each reversible)

Each default stands unless the operator overrules it:

- `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new` — when the identity
  provider cannot be reached, a private server accepts players it has already seen and refuses new
  ones (consumed by lpw-16).
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by lpw-16).
- `decision-defaulted:local-private-reconnect-token=device-storage` — toward a `local` or `private`
  target the anonymous reconnect token is kept in the origin's persistent storage, so a relaunch
  resumes the player; `official` and `test` keep per-tab storage (consumed by lpw-2). Reverting
  is a storage choice per kind.
- `decision-defaulted:content-reseed=first-connect-after-upgrade` — a module whose stored content
  version differs from its own re-seeds on the first connection after the publish, on every server,
  so no publish path depends on an operator's `sync_content` call (consumed by lpw-4).
- `decision-defaulted:world-address=fixed-loopback-port-per-world` — each world gets a loopback port
  when it is created and keeps it, so its reconnect key never changes (consumed by lpw-12).
- `decision-defaulted:bundled-host-module-http=disabled` — the host the shell starts runs with
  `[module-http] enabled = false` (consumed by lpw-12).
- `decision-defaulted:world-owner-credential=shell-held-never-in-page` — the token that published a
  world (its `config.owner_identity`) stays in the world's directory, readable by the user alone,
  and never reaches the page (consumed by lpw-13).
- `decision-defaulted:world-upgrade-backup=copy-before-publish` — before a new module is published
  over an existing world, the shell copies the world's directory beside it and keeps the last copy
  (consumed by lpw-13).
- `decision-defaulted:world-telemetry=off-until-opted-in` — a world sends no telemetry until its
  player turns it on for that world (consumed by lpw-14).
- `decision-defaulted:invite-link=copyable-text-no-url-handler` — an invite is text the shell's
  address form accepts; the shell registers no URL scheme (consumed by lpw-17).

## Operator questions (open)

- **Licence (operator-owned, open).** Packaging (lpw-12, lpw-13, lpw-14, lpw-17, lpw-18) waits on
  the terms the operator has been negotiating with the licensor since 2026-11-12;
  `docs/local-play.md` §1 records the state and decides nothing. Lifting event: the operator records
  the negotiated terms (or that none are needed) in `docs/local-play.md` §1. Fallback if the terms
  do not allow bundling: the desktop shell joins a server the player installs separately (lpw-11
  already does), lpw-12 and lpw-13 drive that server instead of a bundled one, and the shell
  document does not change.
- **Who signs the attestation (operator-owned, open; asked through `mr-ask-drew` by lp-spec).**
  lpw-15 and lpw-16 need an account service that signs a short-lived attestation with a key and
  issuer name the official server does not trust (`docs/local-play.md` §3). No account issuer is
  deployed. Lifting event: the operator names the account service and where the attestation is
  signed. Fallback if none comes: single-player worlds stay unbound (lpw-2's device-kept identity),
  friends servers run lpw-16's password and open rules only, and the allowlist waits.

## Risks / flags

- **Identity continuity at a deployment.** The reconnect key is the raw `(uri, db)` pair, so a host
  whose document spells the target differently from the one it replaces (case, trailing slash,
  port) gives every returning anonymous player a new identity. Each deployment's document is checked
  against the previous spelling; lpw-12 fixes each world's port for this reason.
- **The host reaches out on a stranger's word.** A 2.11.0 standalone host given a token whose `iss`
  is any `http` or `https` issuer fetches that host's `/.well-known/openid-configuration` (no issuer
  allow-list). lpw-17 and lpw-18 put a rule in front of a reachable host that drops a token whose
  `iss` is not the host's own (R-lpg-0-ISSUERFETCH); the official deployment's rule is M25's.
- **Device-kept tokens (lpw-2).** A token in persistent storage outlives the tab: anyone using the
  same OS account and browser profile resumes that player. That is the point for a single-player
  world, and it is the same exposure a browser's saved session has. A shared machine is out of
  scope.
- **The protocol bump is a rule, not a gate (lpw-3).** A schema change that should raise
  `min_client_protocol` and does not lets an old client meet a server it cannot speak to; it then
  fails as it does today (an SDK error). No test can tell a breaking change from an additive one
  without being a check of the check, so the rule lives in lpw-3's decision entry and in review.
- **Schema chain.** lpw-3, lpw-15 and lpw-16 change the schema. They are ordered (lpw-3, then
  lpw-15, then lpw-16), and lpw-3's new table is published to a live server only knowing that a
  schema-changing publish disconnects connected clients.
- **mr-prune census** (game `63fc0b0a`, recorded as `M-local-play`): no `duplicates` and no
  `orphans` rows for the touched files. Signals, each named in its slice: source-text reads in
  `authToken.test.ts` (it reads the SDK's `dist`, not `authToken.ts`; lpw-2), `connection.test.ts`
  (`E1-MAIN` reads `main.ts`; lpw-5) and `content_tests.rs` (`bt6_5` reads `sync_content_inner`'s
  text; lpw-4); churn on `main.targetKindGate.test.ts`, `connection.runtime.test.ts`,
  `socialModel.test.ts` and `socialScreen.test.ts`; literal variants in `authToken.test.ts` and
  `connection.test.ts`.

## Sign-in design (lpw-8, lpw-9, lpw-15 and lpw-16 build against `docs/local-play.md` §3; the operator is open to alternatives)

The protocol stays **OpenID Connect** — OAuth 2.0 authorization code with PKCE, tokens as signed
JWTs. It is what SpacetimeDB consumes (an identity is derived from a token's issuer and subject) and
what the account issuer already speaks. SAML is not a fit: it is browser-redirect XML for workplace
single sign-on, SpacetimeDB does not accept it, and it has no good desktop or offline flow.

The isolation comes from **who vouches for the player in each world**, not from a new protocol:

- **Official server:** accepts account tokens only from the account issuer, addressed to it
  (`aud`); any other token plays as a guest. The
  official module checks issuer and audience only in its connect reducer (`provision_or_touch_account`);
  the host does not check `aud`, and whether a wrong-audience token is refused on the HTTP call and
  sql routes is untested (R-lpg-0-HTTPAUDIENCE; lpw-9 measures it).
- **Private server and single-player world:** a standalone host mints only anonymous tokens and a
  module cannot sign, so a world cannot issue its own account tokens. The player connects under the
  world's own anonymous token; to join, the client asks the account issuer for a short-lived
  **attestation** — "this account is valid" — addressed to that one server and bound to a nonce the
  server chose, and passes it as a reducer argument. A verifier compiled into the module checks it,
  then the host's access rule applies.
- **Offline single-player** falls out of the same shape: the attestation is needed once, when the
  world is bound to the account; later sessions resume the world's own anonymous token, which the
  client keeps across launches (lpw-2, R-lpg-0-SESSIONTOKEN).
- The design holds on four conditions `docs/local-play.md` §3 leaves open: the in-module verifier
  spike (lpw-8); an account issuer (or an endpoint beside it) that can sign the attestation (the
  operator question above); the official server refusing attestation binding, since the same module
  runs there; and the relay of an attestation from one private world to another closed, which
  audience and nonce do not stop because every standalone host calls itself `localhost` and its
  operator can sign any subject (R-lpg-0-ATTESTRELAY). lpw-9 designs the last two and lpw-15/lpw-16
  test them before a private server sees a real attestation. With all four met, nothing the host
  ever holds is a login anywhere else.

Fallback if the verifier spike fails: audience-scoped tokens from the account issuer, with the
official module's audience check as the single defence (its HTTP-route question answered first);
a private host then learns official identities.

## Notes

- Private worlds run the official rules until `M-modding`; a host controls only who may join.
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
- `M21b-3 Steam login` (its own PLAN §9 item) is the Steam build's sign-in protocol and is consumed here.

## Post-integration verification

Each slice is green alone; the milestone is done when the merged whole is:

- Full `just ci` green on `master` with every merged `lpw-` slice; `bindings-drift` clean after
  lpw-3, lpw-15 and lpw-16; `evals/baselines/client-visible-tables.json` lists `module_info` and
  nothing else new.
- The browser build, with a shell document of kind `local` against a loopback host, makes no
  request to any origin but the page's and the host's (lpw-1), and a second page load in the same
  browser profile resumes the first player (lpw-2).
- A world created on an older module and opened by a newer build plays with no operator step: the
  publish keeps the data, the first connection re-seeds content (lpw-4), and a client older than
  the server's `min_client_protocol` shows the update message (lpw-5).
- Once the licence lifts: from a clean install the shell creates a world, plays it, quits, reopens
  it as the same player within the `docs/local-play.md` §6 single-player budgets, opens it to a
  friend who joins under the host's rule, and closes it again (lpw-11 to lpw-17, one e2e flow in
  lpw-17).
- Once the account service exists: a world bound to an account opens later with the network down
  (lpw-15), and no attestation or token a private host received is accepted by the official server
  or by another private world (lpw-16).

## Slices

### lpw-1 — a local or private target gets an explicit sign-in-off mode

type: feature · tier: hard
touches: client/src/net/connection.ts, client/src/net/credentialDecision.ts, client/src/net/credentialDecision.test.ts, client/src/net/connection.runtime.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, README.md
after: []
- Residuals: R-lpg-10-NOTEBFC99B (closes it).
- Contract: `ConnectionOptions` gains `signIn: 'oidc' | 'off'`; `main.ts` passes `'off'` unless the kind is `official` or `test` and the build names an issuer (wiring only, beside `OIDC_ISSUER`). The decision whether a credential attempt may reach the OIDC client is a pure function in `credentialDecision.ts`; `connection.ts` receives wiring only.
- Re-verified: the Sign In offer is already gated (`SIGN_IN_OFFER` reads the empty issuer), but `resolveCredential` still calls `oidc.renewOrExchange()` when `wasEverAuthenticated` or the return leg is set, and with an empty issuer the discovery fetch goes to the page's own origin.

- **lpw-1.1:** WHEN `connect` runs with `signIn: 'off'`, THE CLIENT SHALL make zero OIDC requests (no discovery, token or revocation fetch) on the cold start and on every reconnect, even when this target's storage holds an `account` kind marker and an OIDC return leg.

- **lpw-1.2:** WHEN `connect` runs with `signIn: 'off'`, THE CLIENT SHALL hand `.withToken()` only the anonymous reconnect token for every build.

- **lpw-1.3:** WHEN `startSignIn` is called on a connection with `signIn: 'off'`, THE CLIENT SHALL mint no claim code, call no reducer and make no request, and SHALL report `onSignInFailed('sign-in-off')`.

- **lpw-1.4:** WHEN the booted client's shell document names kind `local` or `private`, THE CLIENT SHALL pass `signIn: 'off'` to `connect` whatever the build's OIDC variables hold.

- **lpw-1.5:** WHEN the booted client's shell document names kind `official` with a configured issuer, THE CLIENT SHALL pass `signIn: 'oidc'` and keep today's sign-in behaviour (the existing `main.targetKindGate.test.ts` official cases stay green unchanged).

- Docs (no gate): the two `connection.ts` comments that say an absent issuer "contacts no network" describe the sign-in-off mode instead, and the game's `README.md` paragraph on `kind` says the OIDC variables and `VITE_MR_OTLP_ENDPOINT` take effect only for a target of kind `official` or `test`.
- Tests: `credentialDecision.test.ts` (the pure decision, every combination of mode, marker and return leg), `connection.runtime.test.ts` (a fetch spy over `connect` with a seeded marker and return leg), `main.targetKindGate.test.ts` (the booted wiring per kind).
- DoD: lpw-1.1 to lpw-1.5 green, the docs bullet done; `just ci` green.

### lpw-2 — a local or private world keeps its player across launches

type: feature · tier: hard
touches: client/src/net/authToken.ts, client/src/net/authToken.test.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/src/main.ts, client/e2e/local-identity.spec.ts
after: [lpw-1]
- Residuals: R-lpg-0-SESSIONTOKEN (client half; lpw-11's relaunch criterion and lpw-12's fixed port close the rest).
- Decision: `decision-defaulted:local-private-reconnect-token=device-storage`.
- Contract: `createAuthTokenGate(uri, db, host, persistence)` with `persistence: 'tab' | 'device'`; `'device'` reads and writes `localStorage` under the same key derivation, `'tab'` is today's `sessionStorage`. `ConnectionOptions` gains the target kind (wiring from `TARGET_KIND`); the kind-to-persistence rule is a pure function in `authToken.ts`. Claim codes and the OIDC flow stay per tab (lpw-1 turns them off for these kinds).
- New e2e helper: none; `client/e2e/shell-config.spec.ts` shows how a test serves a shell document, and the new spec reuses its approach and `client/e2e/stdb.ts`.

- **lpw-2.1:** WHEN the target kind is `local` or `private`, THE CLIENT SHALL store and read the anonymous reconnect token in the origin's `localStorage` under the per-target key `mr.authToken.v1|<uri>|<db>`.

- **lpw-2.2:** WHEN the target kind is `official` or `test`, THE CLIENT SHALL keep the reconnect token in per-tab `sessionStorage` exactly as today.

- **lpw-2.3:** WHEN persistent storage throws on access or on write, THE CLIENT SHALL connect anonymously and keep playing, as the per-tab gate does today.

- **lpw-2.4:** WHEN a page for a `local` target is closed and a new page for the same target opens in the same browser profile, THE CLIENT SHALL resume the first page's identity and character (e2e, a fresh page in one persistent context).

- **lpw-2.5:** WHEN a new page for an `official` target opens in a fresh tab, THE CLIENT SHALL join as a new identity, as today (the same e2e, the control case).

- **lpw-2.6:** WHEN a token stored for a `local` target is rejected twice since the last success, THE CLIENT SHALL withhold it and connect anonymously, with the same `AUTH_REJECT_SUPPRESS_THRESHOLD` rule as the per-tab gate.
- DoD: lpw-2.1 to lpw-2.6 green; `just ci` and the new e2e green.

### lpw-3 — the module publishes its protocol numbers

type: feature · tier: hard
touches: game-core/src/lib.rs, game-core/src/protocol_tests.rs, client-wasm/src/lib.rs, server-module/src/schema.rs, server-module/src/module_info.rs, server-module/src/module_info_tests.rs, server-module/src/lib.rs, client/src/module_bindings/index.ts, client/src/module_bindings/module_info_table.ts, client/src/module_bindings/types.ts, evals/baselines/client-visible-tables.json
after: []
- Schema change (always-serial): one new public single-row table, `module_info { id: u32 (primary key, always 0), protocol: u32, min_client_protocol: u32 }`. Adding a table is additive; a schema-changing publish to a live server disconnects its clients, so it ships at a publish window, not mid-session. Bindings regenerate only through `just gen`.
- Contract: `game_core::PROTOCOL_VERSION` and `game_core::MIN_CLIENT_PROTOCOL` (both `u32`) are the single source; `client-wasm` exports `protocol_version()`; `module_info.rs` owns `ensure_module_info(ctx)`, called from `init` and `sync_content` (wiring in `lib.rs`). The bump rule (the decision entry this slice writes): `PROTOCOL_VERSION` rises with every change to the module's tables or reducers, `MIN_CLIENT_PROTOCOL` rises only when an older client can no longer speak to the server (a removed or re-typed reducer argument or table column).
- `evals/baselines/client-visible-tables.json` gains `module_info` on purpose (the surface eval's allowlist; the eval itself does not change).

- **lpw-3.1:** WHEN the module is published to an empty database, THE SYSTEM SHALL hold exactly one `module_info` row whose `protocol` and `min_client_protocol` equal `game_core::PROTOCOL_VERSION` and `game_core::MIN_CLIENT_PROTOCOL`.

- **lpw-3.2:** WHEN the owner's `sync_content` runs on a database whose `module_info` row holds other numbers, THE SYSTEM SHALL overwrite that row with the module's numbers and keep one row.

- **lpw-3.3:** THE SYSTEM SHALL offer no reducer that writes `module_info` other than `init`, `sync_content` and lpw-4's connect-time re-seed.

- **lpw-3.4:** WHEN the client's wasm is built, THE CLIENT SHALL read `protocol_version()` equal to `game_core::PROTOCOL_VERSION` (a `game-core` test pins `MIN_CLIENT_PROTOCOL <= PROTOCOL_VERSION`).
- DoD: lpw-3.1 to lpw-3.4 green; `just ci` green, `bindings-drift` clean, the surface eval green with the edited allowlist; a publish over a copy of a populated database keeps every row.

### lpw-4 — a world upgraded by a new module re-seeds itself

type: feature · tier: hard
touches: server-module/src/lib.rs, server-module/src/content_tests.rs, scripts/smoke-republish.sh
after: [lpw-3]
- Residuals: R-sr-4b-NOTE505D57 (closes it).
- Decision: `decision-defaulted:content-reseed=first-connect-after-upgrade`.
- Pins (keep, do not re-point): `server-module/src/content.rs`'s inline `sync_content_guard_references_owner_identity` reads `lib.rs` as text and needs `pub fn sync_content(ctx:` with its `owner_identity` check in that body; `content_tests.rs` `sync_content_validates_tactics_content_before_any_write_bt6_5` reads `sync_content_inner`'s text. The shared helper leaves both bodies where they are.
- Re-verified: `init` runs only at database creation (`sync_content`'s own refusal text says so) and the version gate in `sync_content_inner` returns early when `config.content_version` equals `CONTENT_VERSION`.
- Contract: `on_connect` runs, before it opens the session, the same steps the owner's `sync_content` runs after `sync_content_inner` (zone schedules, reapers, leaderboard refresh, `ensure_module_info`) whenever `config.content_version` differs from `CONTENT_VERSION`; one private helper in `lib.rs` serves both callers. The owner check stays on the `sync_content` reducer.

- **lpw-4.1:** WHEN a client connects to a database whose `config.content_version` differs from the module's `CONTENT_VERSION`, THE SYSTEM SHALL re-seed content and refresh `module_info` in that connection's transaction before the session opens.

- **lpw-4.2:** WHEN a client connects to a database whose content is current, THE SYSTEM SHALL write no content row.

- **lpw-4.3:** WHEN the connect-time re-seed fails, THE SYSTEM SHALL refuse the connection with the re-seed's error, log one structured `content_reseed_error` line and leave the stored content untouched.

- **lpw-4.4:** WHEN `scripts/smoke-republish.sh` republishes over live data with a bumped `CONTENT_VERSION` and makes no `sync_content` call, THE SYSTEM SHALL keep the data and re-seed on the first connection (the script's assertion moves from after the call to after a connect).
- DoD: lpw-4.1 to lpw-4.4 green; `just ci` and `just smoke-republish` green.

### lpw-5 — the client refuses a server it cannot speak to, naming which side to update

type: feature · tier: hard
touches: client/src/net/protocolCheck.ts, client/src/net/protocolCheck.test.ts, client/src/net/connection.ts, client/src/net/connection.test.ts, client/src/net/connection.runtime.test.ts, client/src/main.ts, client/src/main.protocolCheck.test.ts, client/src/ui/feedbackPolicy.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [lpw-2, lpw-3]
- Contract: `protocolCheck.ts` exports a total pure `checkProtocol(server: { protocol: number; minClientProtocol: number } | 'refused', client: number): 'ok' | 'update-game' | 'update-server'`. `connection.ts` subscribes `SELECT * FROM module_info` alone, before the existing subscription set, and opens that set only on `'ok'` (wiring). `main.ts` shows the outcome through the existing feedback sink as a new `protocol-mismatch` kind (wiring). `connection.test.ts` `ts-4.4` pins the exact subscription list and changes with it.

- **lpw-5.1:** WHEN the server's `module_info.min_client_protocol` exceeds the client's `protocol_version()`, THE CLIENT SHALL subscribe nothing else, send no reducer call and show "This server runs a newer Monster Realm. Update the game to join."

- **lpw-5.2:** WHEN the server's `module_info.protocol` is below the client's `protocol_version()`, or the `module_info` subscription is refused, THE CLIENT SHALL subscribe nothing else, send no reducer call and show "This server runs an older Monster Realm. Its host must update it."

- **lpw-5.3:** WHEN the server's numbers admit the client, THE CLIENT SHALL open the full subscription set and join as today.

- **lpw-5.4:** WHEN the mismatch message is shown, THE CLIENT SHALL announce it through the live region once and keep it until reload, and the French catalog SHALL carry both messages.
- Tests: `protocolCheck.test.ts` (the total function), `connection.runtime.test.ts` (the gate before the subscription set), `main.protocolCheck.test.ts` (the booted client shows each message through the real UI).
- DoD: lpw-5.1 to lpw-5.4 green; `just ci` and the full e2e green (every existing e2e is the same-version case).

### lpw-6 — the content audit for playing alone

type: feature · tier: routine
touches: game-core/tests/solo_complete.rs
after: []
- Re-verified: `EvolutionPath` gates are level, essence, trust tier, quality-time tier and nutrition; no content registry names a trade or PvP condition. The audit makes that a test so a later content drop cannot lock a species or item behind another player.
- Contract: one integration test file over the public `game_core` loaders; it computes what a lone player can obtain from the content's own sources (the starter kit, wild encounter tables, evolution paths from an obtainable species, shop stock, quest rewards, NPC gifts where the content defines them) and compares it with every species and item id. Exceptions are a named list in the test, each with the content it belongs to (group content per `game-design.md` §14); the list is empty today.

- **lpw-6.1:** WHEN the audit runs over the compiled content, THE SYSTEM SHALL find every species id obtainable by a lone player, or listed as a named exception.

- **lpw-6.2:** WHEN the audit runs over the compiled content, THE SYSTEM SHALL find every item id obtainable by a lone player, or listed as a named exception.

- **lpw-6.3:** WHEN a fixture adds a species reachable only through an evolution from an unobtainable species, THE SYSTEM SHALL name that species in the audit's failure.
- DoD: lpw-6.1 to lpw-6.3 green; `just ci` green.

### lpw-7 — the Social tabs say why they are empty

type: feature · tier: routine
touches: client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/ui-social.spec.ts
after: [lpw-5]
- Re-verified: the Players, Trades and Challenges tabs render nothing when their list is empty; Rankings already shows `leaderboard.empty`. In a one-player world all four are empty, which reads as broken.

- **lpw-7.1:** WHEN the Players tab has no other online player, THE CLIENT SHALL show "Nobody else is in this world right now."

- **lpw-7.2:** WHEN the Trades or Challenges tab has no row, THE CLIENT SHALL show a line naming that tab's empty state ("No trades" / "No challenges") instead of a blank panel.

- **lpw-7.3:** WHEN a tab's empty state shows, THE CLIENT SHALL keep D-pad and button navigation across the tab strip working, with no focusable row in the empty panel.

- **lpw-7.4:** WHEN a lone player opens Social in a fresh world, THE CLIENT SHALL show the empty state on each tab (one e2e flow in `ui-social.spec.ts`).
- DoD: lpw-7.1 to lpw-7.4 green; `just ci` and the e2e green.

### lpw-8 — an attestation verifier compiled into the module (spike)

type: design · tier: hard
touches: docs/local-play.md
after: []
- The question `docs/local-play.md` §3 leaves open: what one signature check costs inside a reducer, and whether a pure-Rust ES256 or Ed25519 verifier builds for the module's `wasm32-unknown-unknown` target with no clock or randomness. The spike's code lives in a scratch directory and is not merged; a `judge` scores the two candidates.

- **lpw-8.1:** WHEN the spike is recorded, THE SYSTEM SHALL state in `docs/local-play.md` §3, for an ES256 and an Ed25519 verifier, whether it builds for the module target, the module's size change, and the median of 101 verifies inside one reducer on a 2.11.0 standalone host.

- **lpw-8.2:** WHEN neither candidate builds, or the median verify costs more than 5 ms (the budget this spec sets: a bind runs once per world, so the cost matters as a lever for flooding the reducer, not for play), THE SYSTEM SHALL record that the fallback (audience-scoped tokens) is the route and file the HTTP-route measurement (R-lpg-0-HTTPAUDIENCE) as lpw-9's first input.
- DoD: the record and a `docs/DECISIONS.md` entry naming the chosen verifier or the fallback.

### lpw-9 — the access and attestation design

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-8]
- Residuals: R-lpg-0-ATTESTRELAY (designed here, tested in lpw-15/lpw-16), R-lpg-0-HTTPAUDIENCE (measured here).
- Decides, with a `judge` over at least two alternatives each: (a) how a connection the host's rule has not admitted is kept from every world row and reducer (at 2.11.0 a connection that `on_connect` accepts can subscribe public tables at once); (b) how the official server refuses attestation binding when the same module runs everywhere; (c) what the attestation names so a hostile host cannot relay one world's attestation to another (`docs/local-play.md` §3: the verifying key of the client's own world token, checked by the client, is the starting direction); (d) the transport rule for plaintext `ws:` to a non-loopback friends server.

- **lpw-9.1:** WHEN the design is recorded, THE SYSTEM SHALL name in `docs/local-play.md` §3 the chosen answer to each of (a) to (d), the rejected alternatives, and the test each of lpw-15, lpw-16 and lpw-17 runs to prove it.

- **lpw-9.2:** WHEN the design is recorded, THE SYSTEM SHALL record the result of one wrong-audience account token sent to `/v1/database/<db>/call/<reducer>` and `/v1/database/<db>/sql` on a 2.11.0 host, using the issuer rig `evals/account-e2e.eval.mjs` builds.

- **lpw-9.3:** WHEN the design accepts plaintext `ws:` to a non-loopback host for any case, THE SYSTEM SHALL put that posture to the operator through `mr-ask-drew` before lpw-17 is built.
- DoD: the record and a `docs/DECISIONS.md` entry per decided fork.

### lpw-10 — the Steam overlay draws over an Electron window

type: design · tier: hard
touches: docs/local-play.md
after: [lpw-9]
blocked: operator-steam-machine — lifted when the operator runs the probe below on a Windows machine with the Steam client and records the result in `docs/local-play.md` §2 (the loop has no Steam client); who lifts it: the operator; fallback if the overlay cannot draw: lpw-11 to lpw-18 wait on a `type: design` slice that re-scores the shells with `docs/local-play.md` §2's evidence (Electron 44, the launcher 44, Tauri 43 without an overlay).
- Probe: Electron 45 with `steamworks.js`, the main process calling `electronEnableSteamOverlay()`, app id 480, the unchanged client bundle loaded from a custom protocol; Shift+Tab opens the overlay over the game window. `after: [lpw-9]` serializes the edits to `docs/local-play.md`, nothing more.

- **lpw-10.1:** WHEN the probe runs under the Steam client on Windows, THE SYSTEM SHALL record in `docs/local-play.md` §2 whether the overlay draws over the game window, with and without GPU flags, and the Electron and `steamworks.js` versions.
- DoD: the record; a `docs/DECISIONS.md` amendment to "The desktop shell is Electron" either way.

### lpw-11 — the desktop shell joins a world by address

type: feature · tier: hard
touches: desktop/package.json, desktop/package-lock.json, desktop/tsconfig.json, desktop/vitest.config.ts, desktop/playwright.config.ts, desktop/src/main.ts, desktop/src/preload.ts, desktop/src/worldEntry.ts, desktop/src/worldEntry.test.ts, desktop/src/window.ts, desktop/src/window.test.ts, desktop/e2e/shell.spec.ts, justfile, .github/workflows/ci.yml, biome.json, .gitignore
after: [lpw-10, lpw-2]
blocked: operator-steam-machine — transitively, through lpw-10 (the shell is built only once the overlay is proved); fallback: as lpw-10.
- Not licence-dependent: the shell hosts the unchanged web client and joins a server someone else runs.
- Contract: a new `desktop/` package (Electron main + preload). `worldEntry.ts` turns a stored or typed entry `{ uri, db, kind }` into the shell document, validating it with the client's own `resolveConnectionConfig` (imported from `client/src/net/connectionConfig.ts`, never copied). The preload exposes the document with `contextBridge.exposeInMainWorld('__MR_SHELL_CONFIG__', doc)`. A typed address is kind `private`. `justfile` gains `desktop-test` and `desktop-e2e`; `ci.yml` runs them.

- **lpw-11.1:** WHEN the shell opens a world entry, THE SYSTEM SHALL expose it as `__MR_SHELL_CONFIG__`, an own non-writable property of the page's global, before the client's module script runs, in a window created with `contextIsolation: true`, `sandbox: true` and `nodeIntegration: false`.

- **lpw-11.2:** WHEN the page asks to navigate to an origin other than the shell's own protocol or calls `window.open`, THE SYSTEM SHALL refuse it.

- **lpw-11.3:** WHEN the shell loads the client, THE SYSTEM SHALL serve the unchanged `client/dist` build from a custom protocol, with no request to any network origin but the world's server.

- **lpw-11.4:** WHEN the player types an address the client's resolver refuses, THE SYSTEM SHALL show the resolver's reason and open nothing.

- **lpw-11.5:** WHEN the shell is quit and started again and the player opens the same entry, THE SYSTEM SHALL resume the same player (e2e: two launches over one user-data directory against one loopback host).
- DoD: lpw-11.1 to lpw-11.5 green; `just ci`, `just desktop-test` and `just desktop-e2e` green.

### lpw-12 — the shell starts and stops a bundled host

type: feature · tier: hard
touches: desktop/src/host.ts, desktop/src/host.test.ts, desktop/src/main.ts, desktop/e2e/host.spec.ts, desktop/package.json, docs/local-play.md
after: [lpw-11]
blocked: licence — lifted when the operator records negotiated terms (or that none are needed) in the game's `docs/local-play.md` §1; who lifts it: the operator; fallback: the shell drives a host the player installed separately (the same `host.ts` contract with a configured binary path, no bundled binary).
- Decisions: `decision-defaulted:world-address=fixed-loopback-port-per-world`, `decision-defaulted:bundled-host-module-http=disabled`.
- Contract: `host.ts` owns the child process: `spacetimedb-standalone start --data-dir <world>/data --jwt-key-dir <world>/keys --listen-addr 127.0.0.1:<port> --non-interactive` with a `config.toml` setting `[module-http] enabled = false`; ready when `/v1/ping` answers.

- **lpw-12.1:** WHEN the shell opens a world, THE SYSTEM SHALL start its host on that world's fixed loopback port and open the page only after `/v1/ping` answers.

- **lpw-12.2:** WHEN the shell quits, THE SYSTEM SHALL stop the host it started, and WHEN the shell starts and finds a host it left running for that world, THE SYSTEM SHALL stop it before starting a new one.

- **lpw-12.3:** WHEN the world's port is taken by another process, THE SYSTEM SHALL tell the player and start nothing.

- **lpw-12.4:** WHEN a single-player world is measured by `docs/local-play.md` §7's method under the shell, THE SYSTEM SHALL stay within §6's single-player budgets (330 MiB peak memory, 1.4 % idle CPU, 800 ms start-up to playable excluding the shell's own start), recorded in `docs/local-play.md` §4.

- **lpw-12.5:** WHEN the bundled host runs for 65 minutes under the §5 capture, THE SYSTEM SHALL record no connection attempt off the machine.
- DoD: lpw-12.1 to lpw-12.5 green or recorded; `just desktop-test` and `just desktop-e2e` green.

### lpw-13 — worlds: create, list, open, upgrade and delete

type: feature · tier: hard
touches: desktop/src/worlds.ts, desktop/src/worlds.test.ts, desktop/src/publish.ts, desktop/src/publish.test.ts, desktop/src/main.ts, desktop/e2e/worlds.spec.ts
after: [lpw-12, lpw-4, lpw-5]
blocked: licence — as lpw-12; fallback: the same, against a separately installed host.
- Decisions: `decision-defaulted:world-owner-credential=shell-held-never-in-page`, `decision-defaulted:world-upgrade-backup=copy-before-publish`.
- Contract: one world is one database with its own directory (data, keys, owner token, port, module hash). `publish.ts` publishes over the host's HTTP API: `POST /v1/identity` once at creation for the owner token, `PUT /v1/database/<db>` with the module wasm. It never requests data deletion. Content re-seeds itself on the first connection (lpw-4).

- **lpw-13.1:** WHEN the player creates a world, THE SYSTEM SHALL create its directory, publish the bundled module into a new database and keep the owner token in the world's directory with permissions for the user alone.

- **lpw-13.2:** WHEN the shell builds a page, THE SYSTEM SHALL never place the owner token in the shell document, the preload or the page.

- **lpw-13.3:** WHEN the player opens a world whose recorded module hash differs from the bundled module, THE SYSTEM SHALL copy the world's directory, publish the new module over its data and open it.

- **lpw-13.4:** WHEN that publish is refused (a schema change the host will not apply over data), THE SYSTEM SHALL keep the world's data and old module, open nothing, and tell the player that this build cannot open the world.

- **lpw-13.5:** WHEN the player deletes a world after confirming, THE SYSTEM SHALL stop its host and remove its directory, and no other world's directory SHALL change.
- DoD: lpw-13.1 to lpw-13.5 green; `just desktop-test` and `just desktop-e2e` green.

### lpw-14 — a world's player may turn telemetry on

type: feature · tier: hard
touches: client/src/net/shellDocument.ts, client/src/net/shellDocument.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/observability/config.ts, client/src/observability/config.test.ts, desktop/src/worlds.ts, desktop/src/worldEntry.ts, desktop/src/worlds.test.ts
after: [lpw-13]
blocked: licence — transitively, through lpw-13; fallback: none needed, telemetry stays off.
- Decision: `decision-defaulted:world-telemetry=off-until-opted-in`.
- Contract: the shell document gains an optional `connection.telemetry: 'on'`, accepted only with kind `local`; `resolveTelemetryConfig` enables telemetry for `local` only when it is present. The shell writes it from the world's stored setting.

- **lpw-14.1:** WHEN a `local` document carries `telemetry: 'on'`, THE CLIENT SHALL start telemetry toward the build's endpoint, as for `official`.

- **lpw-14.2:** WHEN a document of any other kind carries `telemetry`, THE CLIENT SHALL refuse the document at start-up with the resolver's error.

- **lpw-14.3:** WHEN a world is created, THE SYSTEM SHALL store telemetry off for it, and only the player's toggle in that world's settings SHALL change it.
- DoD: lpw-14.1 to lpw-14.3 green; `just ci` and `just desktop-test` green.

### lpw-15 — sign in once to bind a world, then play offline

type: feature · tier: hard
touches: server-module/src/world_binding.rs, server-module/src/world_binding_tests.rs, server-module/src/schema.rs, server-module/src/lib.rs, server-module/Cargo.toml, Cargo.lock, client/src/module_bindings/index.ts, client/src/module_bindings/bind_world_account_reducer.ts, client/src/net/attestation.ts, client/src/net/attestation.test.ts, client/src/main.ts, client/src/main.worldBinding.test.ts
after: [lpw-9, lpw-4, lpw-5]
blocked: account-service — lifted when the operator names the account service that signs attestations (the open operator question above); who lifts it: the operator; fallback: worlds stay unbound and keep lpw-2's device-kept identity.
- Residuals: R-lpg-0-ATTESTRELAY (the relay and official-refusal tests lpw-9 names).
- Schema change (always-serial, after lpw-3): a private `world_binding` table and one reducer, `bind_world_account(attestation)`; the verifier lpw-8 chose, with the attestation key as module data. The bindings gain the reducer. The client asks for the attestation once, in a `local` world, from Profile.

- **lpw-15.1:** WHEN `bind_world_account` receives an attestation that verifies, names this world, carries this world's outstanding nonce and has not expired, THE SYSTEM SHALL record the binding for `ctx.sender()` and spend the nonce.

- **lpw-15.2:** WHEN the attestation fails any of those checks, or its nonce was spent, THE SYSTEM SHALL refuse it with no write.

- **lpw-15.3:** WHEN `bind_world_account` runs on a server lpw-9's rule marks official, THE SYSTEM SHALL refuse it with no write.

- **lpw-15.4:** WHEN an attestation addressed to another world is presented here (lpw-9's relay test), THE SYSTEM SHALL refuse it.

- **lpw-15.5:** WHEN a bound world is opened later, THE CLIENT SHALL make no request to the account service and resume the world's own identity.
- DoD: lpw-15.1 to lpw-15.5 green; `just ci` green, `bindings-drift` clean.

### lpw-16 — a private server applies the host's access rule

type: feature · tier: hard
touches: server-module/src/access.rs, server-module/src/access_tests.rs, server-module/src/schema.rs, server-module/src/lib.rs, client/src/module_bindings/index.ts, client/src/module_bindings/set_world_access_reducer.ts, client/src/module_bindings/admit_reducer.ts, client/src/ui/hostNoticeModel.ts, client/src/ui/hostNoticeModel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/main.ts, client/src/main.hostNotice.test.ts
after: [lpw-15, lpw-7]
blocked: account-service — as lpw-15; fallback: the password and open rules ship and the allowlist waits.
- Decisions: `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new`, `decision-defaulted:private-server-host-notice=yes-once-per-server`.
- Schema change (always-serial, after lpw-15): a private `world_access` table (rule `Open | Password | Allowlist`, a salted password hash, allowlisted accounts) and an owner-only `set_world_access` reducer. Admission uses lpw-9's mechanism (a).

- **lpw-16.1:** WHEN a connection without a recorded binding or admission joins a world whose rule is not `Open`, THE SYSTEM SHALL expose no world row to it and refuse every reducer but the admission call.

- **lpw-16.2:** WHEN the admission call presents a wrong password, or an account not on the allowlist, THE SYSTEM SHALL refuse it with no write.

- **lpw-16.3:** WHEN anyone but `config.owner_identity` calls `set_world_access`, THE SYSTEM SHALL refuse it.

- **lpw-16.4:** WHEN the identity provider cannot be reached, THE SYSTEM SHALL admit an identity it has admitted before and refuse one it has not.

- **lpw-16.5:** WHEN a player first joins a private server, THE CLIENT SHALL show once, for that server, that its host can read and change their data in that world.

- **lpw-16.6:** WHEN a token or attestation this server received is presented to an official server or to another private world, THE SYSTEM SHALL refuse it (lpw-9's tests, run before a real attestation reaches a private server).
- DoD: lpw-16.1 to lpw-16.6 green; `just ci` green, `bindings-drift` clean.

### lpw-17 — open a world to friends, and close it again

type: feature · tier: hard
touches: desktop/src/openToFriends.ts, desktop/src/openToFriends.test.ts, desktop/src/issuerFilter.ts, desktop/src/issuerFilter.test.ts, desktop/src/host.ts, desktop/src/main.ts, desktop/e2e/friends.spec.ts, docs/local-play.md
after: [lpw-13, lpw-16]
blocked: licence — as lpw-12; fallback: a separately installed host, with the same filter in front.
- Residuals: R-lpg-0-ISSUERFETCH (friends half).
- Decision: `decision-defaulted:invite-link=copyable-text-no-url-handler`; the transport rule is lpw-9's (d).
- Contract: the host stays on loopback; opening starts `issuerFilter.ts`, a listener on the chosen interface that forwards HTTP and WebSocket traffic to the host and drops any request whose bearer token names an `iss` other than `localhost`. The world's kind for its joiners is `private`.

- **lpw-17.1:** WHEN the player opens a world to friends, THE SYSTEM SHALL accept joiners on the chosen interface under lpw-16's rule, and their characters SHALL be their own in that world.

- **lpw-17.2:** WHEN a request reaches the filter with a token whose `iss` is not `localhost`, THE SYSTEM SHALL drop it before the host sees it, so the host makes no issuer lookup.

- **lpw-17.3:** WHEN the player closes the world to friends, THE SYSTEM SHALL stop the filter and disconnect every connection that came through it, and the host's own player SHALL keep playing.

- **lpw-17.4:** WHEN eight players walk, battle and trade on an opened world for 30 minutes, THE SYSTEM SHALL record memory and disk growth in `docs/local-play.md` §4 and set the friends-server budget rows from them.
- DoD: lpw-17.1 to lpw-17.4 green or recorded; the milestone's one e2e flow (create, play, quit, reopen, open to a friend, the friend joins, close) green in `desktop/e2e/friends.spec.ts`.

### lpw-18 — a standalone server package

type: feature · tier: hard
touches: desktop/src/serverCli.ts, desktop/src/serverCli.test.ts, desktop/package.json, docs/hosting.md
after: [lpw-17]
blocked: licence — as lpw-12; fallback: none (a standalone host is the licensed artifact itself).
- Residuals: R-lpg-0-ISSUERFETCH (standalone half).
- Contract: a headless command, built from the same `worlds.ts`, `publish.ts`, `host.ts` and `issuerFilter.ts` as the shell, distributed outside the Steam store; `docs/hosting.md` is the host's guide (install, access rule, backup, upgrade).

- **lpw-18.1:** WHEN a host runs the standalone command to create, start or upgrade a world, THE SYSTEM SHALL do what the shell does for the same step, with the same access rule and filter.

- **lpw-18.2:** WHEN a host follows `docs/hosting.md` to back up and restore a world, THE SYSTEM SHALL restore every row (a test restores a backup into a fresh directory and compares).

- **lpw-18.3:** WHEN the standalone host runs idle with nobody connected, THE SYSTEM SHALL stay within the friends-server idle budget (1.0 % of one thread, `docs/local-play.md` §6).
- DoD: lpw-18.1 to lpw-18.3 green or recorded; `just desktop-test` green.
