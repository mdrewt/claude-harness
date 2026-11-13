# Spec: M-local-play — single-player worlds and friends hosting (SKETCH)

**Status:** sketch, 2026-11-12. Elaborate with `milestone-loop-prompt.md` when PLAN §9 reaches it,
against the CURRENT game repo · **Project:** monster-realm (client shell, packaging, server-module
access rules, auth) · **Design SSOT:** `game-design.md` §14 · **Target:** the early-access release.

## Problem / intent

Early access is the Steam build: a player installs the game, plays a single-player world on a server
the game starts for them, and can open that world to friends or join a friend's. Everything built so
far assumes one server that we operate and a browser client pointed at it. This milestone makes the
same module and the same client run as a local and a privately hosted game, without forking either.

## Scope (sketch)

- **LP0 Feasibility (first; `type: design`).** Confirm that SpacetimeDB's licence permits shipping
  its server inside the game and in a standalone package, and record the answer. The licence
  (Business Source License 1.1, read 2026-11-12 at 2.16.0) grants redistribution, and grants
  production use "provided your application or service uses the Licensed Work with no more than one
  SpacetimeDB instance in production" and is not a "Database Service" (a commercial offering where
  third parties create tables whose schemas they control). One instance per player's machine is not
  plainly inside that grant, and a moddable server whose mods add tables may touch the second
  clause. The operator is negotiating a usage licence with the licensor directly (2026-11-12);
  packaging work waits on its terms, and LP0 records them. The public licence converts to AGPL v3
  with a linking exception on 2031-11-10. Choose the desktop
  shell. Measure a one-player world on a modest machine: memory, idle CPU (every zone ticks at 5 Hz
  whether or not anyone is in it), start-up to playable, and disk growth per hour of play (the commit
  log grows ~6 MB per hour of one player walking and is not compacted). Set the budgets the later
  slices hold.
- **LP1 Connection target is configuration.** The client reads its server address and database from
  the shell at start-up; no build-time server address remains in shared client code.
- **LP2 Desktop shell.** A shell that hosts the existing web client unchanged, starts and stops the
  bundled server, and owns only shell concerns (window, local server lifecycle, sign-in hand-off,
  save location). The browser build stays a full client for every way to play.
- **LP3 Worlds.** Create, list, open and delete single-player worlds; each world is one database with
  its own save directory. Publishing the module into a new world and upgrading an existing one happen
  without the player seeing a tool.
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
- **LP8 Unattended upgrade.** A world saved by an older build opens in a newer one: schema and
  content migration run without an operator, and a client refuses a server it cannot speak to with a
  message that says which side to update.
- **LP9 Alone is complete.** Audit content against the solo rule in `game-design.md` §14 (nothing
  needed to progress or complete the collection requires another player) and fix or list each
  exception. Multiplayer-only screens show a clear empty state in a one-player world.
- **LP10 No telemetry by default.** A single-player or private world sends nothing to our
  observability stack unless the player opts in; the official server's client keeps its telemetry.

## Sign-in design (proposed 2026-11-12; LP0 verifies it against SpacetimeDB's auth, the operator is open to alternatives)

The protocol stays **OpenID Connect** — OAuth 2.0 authorization code with PKCE, tokens as signed
JWTs. It is what SpacetimeDB consumes (an identity is derived from a token's issuer and subject) and
what the account issuer already speaks. SAML is not a fit: it is browser-redirect XML for workplace
single sign-on, SpacetimeDB does not accept it, and it has no good desktop or offline flow.

The isolation comes from **who issues the token a server accepts**, not from a new protocol:

- **Official server:** accepts only tokens from the account issuer, addressed to it (`aud`), as today.
- **Private server and single-player world:** each world's server is its own issuer. To join, the
  client asks the account issuer for a short-lived **attestation** — "this account is valid" —
  addressed to that one server and bound to a nonce the server chose. The server checks it, applies
  the host's access rule, and then issues its **own** token for that world. The player's identity in
  that world is derived from the world's issuer, so it is a different identity from the official
  one by construction, and nothing the host ever holds is a login anywhere else.
- **Offline single-player** falls out of the same shape: the attestation is needed once, when the
  world is bound to the account; afterwards the local server issues its own tokens with no
  connection.
- The attestation is signed under an issuer name the official server does not trust, so even a
  server that ignores `aud` cannot be fooled by a replayed one. `aud` and the nonce are the second
  and third locks.

To verify in LP0: which token claims a module can read at connect, whether a standalone server can
be given its own signing key per world, and whether the account issuer can mint an attestation as a
second token type. Fallback if a world cannot be its own issuer: audience-scoped tokens from the
account issuer, with the official server rejecting any other audience.

## Decisions the operator owns (ask at elaboration; reversible defaults in brackets)

- Resource budgets for a single-player world and a friends server. [default: set from LP0's
  measurements on one modest laptop and on one host with eight players]
- What a private server does when the identity provider cannot be reached. [default: accept players
  it has already seen, refuse new ones]
- Whether a player sees a notice before joining a private server that its host can read and change
  their data in that world. [default: yes, once per server]

## Notes

- Private worlds run the official rules until `M-modding`; a host controls only who may join.
- **Idle rule (operator, 2026-11-12):** a zone with no player in it does not update, or updates as
  little as possible. Built (game #745, #750, #751): with nobody connected a world runs one
  write-free heartbeat call a minute and writes nothing to disk, and a player who returns appears
  on the tile they left. LP0 measures what is left.
- Costs that matter more on a player's machine than on ours, found on 2026-11-12: commit-log growth, `battle_summary` never reaped (`M-scale-readiness` SR7), the device-resolution
  terrain bake (SR8).
- The privacy model (private tables behind owner-scoped views) still keeps one player's data from
  another player's client in every world. It does not keep it from the host, who owns the database.
- `M21b-3 Steam login` (PLAN §9) is the Steam build's sign-in protocol and is consumed here.
- **Groundwork that runs ahead of the rest (PLAN §9 item 2):** LP0, LP1 and LP10. They are small,
  they unblock everything else here, and LP1 and LP10 are true of the official server too.
- **Tester A/B experiment:** the PR that sections the groundwork slices also adds the ids of its
  tester-bearing slices (LP1, LP10) to `required_slices` in
  `memory/projects/mr-tester-ab.config.json`: their ids match none of the prefixes it ships.
