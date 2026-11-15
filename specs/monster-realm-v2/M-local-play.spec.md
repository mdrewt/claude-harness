# Spec: M-local-play — single-player worlds and friends hosting

**Status:** LP2–LP9 are an unelaborated sketch (2026-11-12), elaborated with
`milestone-loop-prompt.md` when PLAN §9 item 7 is reached, against the current game repo and
`lpg-0`'s record (the game's `docs/local-play.md`). The groundwork (LP0, LP1, LP10 as `lpg-0`,
`lpg-1`, `lpg-10`) is built: PLAN §Built · **Project:** monster-realm (client shell, packaging,
server-module access rules, auth) · **Design SSOT:** `game-design.md` §14 · **Target:** the
early-access release.

Slice ids use the `lpg-` prefix: `lp-` names the harness loop-infrastructure slices.

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

## What later slices consume

| Contract | Consumers | Where it is held |
|---|---|---|
| LP1 — the shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, its resolution rules (the `db` charset `[A-Za-z0-9_-]+`, a `uri` path that ends in `/` with no dot segment) | LP2, LP3, LP5 | `docs/DECISIONS.md` "The connection target is run-time configuration" and `ARCHITECTURE.md` "Connection and store"; `shellDocument.test.ts`, `connectionConfig.test.ts`, `client/e2e/shell-config.spec.ts` |
| The desktop shell (Electron) sets `__MR_SHELL_CONFIG__` from a preload script before the page's module script runs | LP2 | "The desktop shell is Electron"; it stands on the Steam overlay drawing over an Electron window on Windows, proved before anything else is built on the shell |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for a single-player world and a friends server | LP2, LP3, LP5, LP7 | "Local-play budgets are measured medians"; `docs/local-play.md` §6. Each consuming slice's EARS cite a number from it |
| LP10 — a `local`/`private` target gets no telemetry, and `connect` gets neither the build's issuer nor its client id | LP2, LP3, LP4, LP6 | "A target's kind gates telemetry and account sign-in"; `observability/config.test.ts`, `main.targetKindGate.test.ts`. LP3's opt-in, LP4/LP6's sign-in design and the sign-in-off mode (R-lpg-10-NOTEBFC99B) are the only paths that may change it |

## Named deferrals (declared, not dropped)

| Deferred | Target | Why |
|---|---|---|
| A player opt-in that turns telemetry on in a `local` or `private` world | LP3 (world settings) | It needs a settings surface and a stored choice per world; until then the rule is simply off |
| The bundled and standalone server sending nothing to our stack | LP2 (bundled server) and LP7 (standalone package) | Our stack only receives what we configure it to scrape; what the SpacetimeDB host itself sends off the machine is measured in `docs/local-play.md` §5 and held by the packaging slices |
| Account sign-in toward a `local` or `private` world | LP4 / LP6 | The account token is the account issuer's id_token, addressed to the build-wide client id; a host that received it could replay it. The kind gate withholds the build's issuer and client id and the Sign In offer, but an empty issuer is not a complete off switch: a tab holding a stored refresh token or a sign-in redirect's code still runs the token exchange at connect, which fetches discovery from the page's own origin. Gated kinds need an explicit sign-in-off mode in `connect` (R-lpg-10-NOTEBFC99B; re-read the row against the code before it is built, since the Sign In offer is already gated) |
| OIDC issuer, client id and redirect as run-time configuration | LP4 / LP6 | A world that is its own issuer changes what those values mean; they stay build-time until that design is verified |
| A transport rule for plaintext `ws:` to a non-loopback host | LP5 / LP6 | The resolver accepts plaintext `ws:` to any host; who may serve plaintext is an access-design question |
| A player kept across launches, at an address that stays the same | LP2 / LP3 / LP4 | The anonymous reconnect token is per-tab session storage (`client/src/net/authToken.ts`), so an app that starts with empty session storage joins as a new player (R-lpg-0-SESSIONTOKEN); the shell carries that token across launches (an account binding does not replace it offline: binding again needs a new attestation, so the network). The token is also keyed by the exact `uri` and `db` strings, so a local server on a new port each launch would orphan the identity |
| A friends-server footprint under battles and trades, not walking alone | LP5 | `mr_load_driver` drives movement only; the friends-server memory and disk budgets are a walking-only floor |
| The opening notice that a host can read a joiner's data | LP6 | Part of private-server access (decision-defaulted below) |

## Decisions the operator owns (defaults recorded; each reversible)

Each default stands unless the operator overrules it:

- `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new` — when the identity
  provider cannot be reached, a private server accepts players it has already seen and refuses new
  ones (consumed by LP6).
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by LP6).

## Risks / flags

- **Licence (operator-owned, open).** Packaging (LP2, LP7) waits on the terms the operator has been
  negotiating with the licensor since 2026-11-12; `docs/local-play.md` §1 records the state and
  decides nothing. Lifting event: the operator records the negotiated terms (or that none are
  needed). Fallback if the terms do not allow bundling: the desktop shell connects to a server the
  player installs separately (the LP7 package), which changes LP2's scope but not the shell
  document.
- **Identity continuity at a deployment.** The reconnect key is the raw `(uri, db)` pair, so a host
  whose document spells the target differently from the one it replaces (case, trailing slash,
  port) gives every returning anonymous player a new identity. Each deployment's document is checked
  against the previous spelling.
- **The host reaches out on a stranger's word.** A 2.11.0 standalone host given a token whose `iss`
  is any `http` or `https` issuer fetches that host's `/.well-known/openid-configuration` (no issuer
  allow-list). LP6 and LP7, and the official deployment, need a rule in front of the host that drops
  a token whose `iss` is not the host's own or a listed issuer (R-lpg-0-ISSUERFETCH).

## Unelaborated sketch — LP2 to LP9 (2026-11-12; NOT buildable, no slice ids)

Elaborate with `milestone-loop-prompt.md` when PLAN §9 item 7 is reached, against the current game
repo and `docs/local-play.md`. Nothing below is a slice yet.

- **LP2 Desktop shell.** An Electron shell that hosts the existing web client unchanged, starts and
  stops the bundled server, and owns only shell concerns (window, local server lifecycle, sign-in
  hand-off, save location). It supplies the shell document for each world it opens, at an address
  that stays the same across launches, and carries the player's token across launches. The browser
  build stays a full client for every way to play. Waits on the licence terms.
- **LP3 Worlds.** Create, list, open and delete single-player worlds; each world is one database with
  its own save directory. Publishing the module into a new world and upgrading an existing one happen
  without the player seeing a tool: the module publishes over the host's HTTP API (`PUT
  /v1/database/<name>` with the wasm body and a token from `POST /v1/identity`; the host needs
  `--jwt-key-dir` and listens on `0.0.0.0:3000` unless `--listen-addr` is given). Owns the telemetry
  opt-in.
- **LP4 Sign in once, then offline.** A world is bound to the account at creation; later sessions
  start with no connection. The auth seam stays pluggable per build (the browser build, the dev
  build and the Steam build each supply their own protocol).
- **LP5 Open to friends.** A running single-player world accepts other players and can be closed
  again; joiners get their own characters in that world. Joining is by address or invite link.
- **LP6 Private-server access.** A private server confirms each joiner holds a valid account with the
  identity provider, then applies the host's rule: allowlist, password, or open. A token a private
  host receives must be useless against the official server; prove that with a test before a private
  server ever sees a real account token. Design in "Sign-in design" below.
- **LP7 Standalone server package.** The server runs by itself for an always-on host, installed
  outside the Steam store, with the same access rule and a documented way to back up and upgrade.
  Waits on the licence terms.
- **LP8 Unattended upgrade.** A world saved by an older build opens in a newer one: schema and
  content migration run without an operator, and a client refuses a server it cannot speak to with a
  message that says which side to update.
- **LP9 Alone is complete.** Audit content against the solo rule in `game-design.md` §14 (nothing
  needed to progress or complete the collection requires another player) and fix or list each
  exception. Multiplayer-only screens show a clear empty state in a one-player world.

## Sign-in design (LP4 and LP6 elaborate against `docs/local-play.md` §3; the operator is open to alternatives)

The protocol stays **OpenID Connect** — OAuth 2.0 authorization code with PKCE, tokens as signed
JWTs. It is what SpacetimeDB consumes (an identity is derived from a token's issuer and subject) and
what the account issuer already speaks. SAML is not a fit: it is browser-redirect XML for workplace
single sign-on, SpacetimeDB does not accept it, and it has no good desktop or offline flow.

The isolation comes from **who vouches for the player in each world**, not from a new protocol:

- **Official server:** accepts account tokens only from the account issuer, addressed to it
  (`aud`); any other token plays as a guest. The
  official module checks issuer and audience only in its connect reducer (`provision_or_touch_account`);
  the host does not check `aud`, and whether a wrong-audience token is refused on the HTTP call and
  sql routes is untested (R-lpg-0-HTTPAUDIENCE).
- **Private server and single-player world:** a standalone host mints only anonymous tokens and a
  module cannot sign, so a world cannot issue its own account tokens. The player connects under the
  world's own anonymous token; to join, the client asks the account issuer for a short-lived
  **attestation** — "this account is valid" — addressed to that one server and bound to a nonce the
  server chose, and passes it as a reducer argument. A verifier compiled into the module checks it,
  then the host's access rule applies.
- **Offline single-player** falls out of the same shape: the attestation is needed once, when the
  world is bound to the account; later sessions resume the world's own anonymous token, which the
  shell carries across launches (R-lpg-0-SESSIONTOKEN).
- The design holds on four conditions `docs/local-play.md` §3 leaves open: the in-module verifier
  spike; an account issuer (or an endpoint beside it) that can sign the attestation; the official
  server refusing attestation binding, since the same module runs there; and the relay of an
  attestation from one private world to another closed, which audience and nonce do not stop because
  every standalone host calls itself `localhost` and its operator can sign any subject
  (R-lpg-0-ATTESTRELAY). LP6 builds and tests the last two before a private server sees a real
  attestation. With all four met, nothing the host ever holds is a login anywhere else.

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
  standing still (R-lpg-0-IDLETICK; a tick that changes no row could skip its commit).
- Costs that matter more on a player's machine than on ours: commit-log growth (8.21 MiB per hour
  for one player walking, 44.99 for eight, with no shrink seen within an hour; `docs/local-play.md`
  §4), `battle_summary` never reaped (`M-scale-readiness` SR7), the device-resolution terrain bake
  (SR8).
- Nothing in the client sends data off the machine but the SpacetimeDB connection, the OTLP
  exporter (loaded only through the telemetry loader) and the OIDC flow; the F9 bug bundle is a
  player-initiated local download, and `playtest_event` is a private table in the world's own
  database, which its host can read.
- The privacy model (private tables behind owner-scoped views) still keeps one player's data from
  another player's client in every world. It does not keep it from the host, who owns the database.
- The game's `README.md` paragraph on the shell document's `kind` does not say that the OIDC
  variables and `VITE_MR_OTLP_ENDPOINT` take effect only for a target of kind `official` or `test`
  (`ARCHITECTURE.md` and `docs/DECISIONS.md` do). Two comments in `client/src/net/connection.ts` still say
  that with no issuer the OIDC flow "contacts no network"; they go with the sign-in-off mode
  (R-lpg-10-NOTEBFC99B).
- `M21b-3 Steam login` (PLAN §9 item 14) is the Steam build's sign-in protocol and is consumed here.
