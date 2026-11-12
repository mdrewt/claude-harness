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
  its server inside the game and in a standalone package, and record the answer. Choose the desktop
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
  identity provider, then applies the host's rule: allowlist, password, or open.
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

## Decisions the operator owns (ask at elaboration; reversible defaults in brackets)

- Resource budgets for a single-player world and a friends server. [default: set from LP0's
  measurements on one modest laptop and on one host with eight players]
- What a private server does when the identity provider cannot be reached. [default: accept players
  it has already seen, refuse new ones]
- Whether a player sees a notice before joining a private server that its host can read and change
  their data in that world. [default: yes, once per server]

## Notes

- Private worlds run the official rules until `M-modding`; a host controls only who may join.
- Costs that matter more on a player's machine than on ours, found on 2026-11-12: empty-zone ticks,
  commit-log growth, `battle_summary` never reaped (`M-scale-readiness` SR7), the device-resolution
  terrain bake (SR8).
- The privacy model (private tables behind owner-scoped views) still keeps one player's data from
  another player's client in every world. It does not keep it from the host, who owns the database.
- `M21b-3 Steam login` (PLAN §9) is the Steam build's sign-in protocol and is consumed here.
