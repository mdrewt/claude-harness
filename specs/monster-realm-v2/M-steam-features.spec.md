# Sketch: M-steam-features — Steam lobbies, P2P networking and achievements

**Status:** design sketch, authored 2026-11-23 from the operator's request (order and
preconditions in `PLAN.md` §9). It goes **after the closed beta and before early access**
(operator, 2026-11-23). EARS criteria and slices are deferred until it is elaborated through
`milestone-loop-prompt.md` against the current game repo. **Project:** monster-realm (the desktop
shell, the client, possibly the server module) · **Doctrine:** `standards/testing-tdd.md`.

> **Ways to play (`game-design.md` §14):** each feature must work for a single-player world and a
> friends server and hold at the official server's population. None may make the client assume we
> operate the server. Client code is shared across shells, never forked: Steam calls reach the
> client only through the host ports of `structure.spec.md` st-21's plan.

## Problem / intent

Steam's own social and progression features, in the desktop shell:

- **Lobbies and invites.** A friend joins a world through Steam: a lobby per open world, and Steam
  friends' "Join game" or an invite carrying the world entry. The address form and pinned invites
  (M-local-play lpw-11, lpw-14, lpw-18) stay the way in for players who don't use Steam's friends
  list.
- **P2P networking.** Connections relayed by Steam (Steam Datagram Relay through
  `ISteamNetworkingSockets`), so a host opens a world to friends without forwarding a port or
  exposing an address.
- **Achievements**, and stats if the design needs them, unlocked from game state.

## Open questions for the elaboration

- **P2P under SpacetimeDB.** The client speaks WebSocket to the host. Can a Steam relay carry that
  connection, through a local tunnel in each shell with the host's gate as one end? What does it do
  to the TLS and pinning lpw-18 builds, to the access rule (lpw-9) and to the world binding
  (lpw-15)? This is a `type: design` slice with a measured prototype, whatever the outcome.
- **Who decides an unlock.** The client sets Steam achievements. On the official server the unlock
  can follow a server-owned row. On a private world the host owns the database. Is an unlock earned
  there acceptable, and is it recorded as such?
- **Which shell.** The bindings differ between Electron (`steamworks.js`) and Tauri (the Rust
  `steamworks` crate). The elaboration follows lpw-10's decision and its comparison.

## Constraints known now

- **App ID 480** (Spacewar) is the development app until the game's own app exists (operator,
  2026-11-23). Its achievements and stats are Spacewar's fixed set, so development maps our
  achievement ids onto them through one table, and the real ids need the game's own app (an
  operator input, like M-account-service acs-11). Its lobbies share one namespace with every
  developer using 480, so every lobby query filters on a key of ours.
- The Steamworks SDK is never committed: the game repo is public and the SDK's licence forbids
  redistributing it.
- Steam Input onto the virtual buttons is `M21b-3 Steamworks in the shell`, not this milestone.
