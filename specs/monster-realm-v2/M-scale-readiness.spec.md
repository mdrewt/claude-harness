# Spec: M-scale-readiness — costs that grow faster than the population (SKETCH)

**Status:** sketch, 2026-11-12. Elaborate with `milestone-loop-prompt.md` when PLAN §9 reaches it,
against the CURRENT game repo · **Project:** monster-realm (server-module, client) ·
**Target:** before any playtest above ~20 concurrent players, and before launch.

## Problem / intent

Nothing here costs anything visible at playtest scale (2–5 players, a handful of monsters each).
Each item is a cost that grows with a population axis and has no cap, found by a static scaling
audit and confirmed by a doubling probe or a load run (2026-11-12, game repo `618a28f2`/`c3f239be`).
The milestone removes them while they are cheap to remove, and makes the load tool able to see the
ones that remain.

## Population target — the official server (operator, 2026-11-12)

The official server is one of three ways to play (`game-design.md` §14); these numbers size it
alone. Single-player and private worlds are budgeted in `M-local-play.spec.md`.

- **Per zone:** a long-tailed distribution — 8–12 players on average, about 50 in a small share of
  zones.
- **World:** up to about 100 zones of various sizes; about 600 concurrent players on average and
  about 1,000 at peak.
- Revisit if the game outgrows it. Today only a few developers are connected at once.

What the target implies, from measurements on 2026-11-12 (one zone, up to 100 walkers; larger
figures are extrapolated — SR9 exists to replace them with measurements):

- **A client's download follows the walkers in its subscription scope:** about 0.85 KB/s plus
  0.077 KB/s per walker (8.55 KB/s at 100, 4.71 at 50, 2.39 at 20). World-wide that is about
  78 KB/s per client at 1,000 players. The client subscribes `character` per zone, so its scope
  is its own zone (plus a warp destination while it stands within 4 tiles of the warp): 4.8 KB/s
  measured in a zone of 50, about 2 KB/s in a zone of 10. The 20 KB/s budget is reached near 220
  walkers in one zone.
- **Every session starts in zone 0** and the character is deleted on the last disconnect, so the
  spawn zone, not a 50-player zone, is the real peak: about 170 players there if a 30-minute session
  spends 5 minutes in it, about 330 at 10 minutes (over budget: 58.9 KB/s per client was measured
  at 500 in one zone). SR11 is therefore the next slice for the byte budget.
- **The reducer thread is one writer for the whole world.** Measured at 750 walking players: 15.5%
  of it, of which the per-player own-row query is about 3.3–4.0 µs per step (1.6–2.0% at 1,000).
  SR2 removes the part that grows with monsters owned.
- **Budgets for SR9's load run:** 1,000 clients spread over 100 zones with one zone at 50; tick p95
  under `STEP_MS`, input round-trip p95 under 50 ms, download per client under 20 KB/s, reducer
  thread under 50% at a 30% walking share.

## Decisions still open (ask at elaboration; reversible defaults in brackets)

- **Total accounts:** how many registered accounts the stored tables must hold. [default: 50k —
  sizes SR3, SR4 and SR7]
- **Storage cap:** whether an account's monster Storage is capped. [default: no cap; SR2 and SR6
  make the uncapped case cheap]
- **`battle_summary` retention:** what the per-battle telemetry is for and how long it is kept.
  [default: keep the newest N rows, N from the account count]

## Scope (sketch) — one slice per item; SR11 and SR9 first, then by value per size

- **SR2 Party lookup by index.** `battle::lead_party_ids` filters `monster` by owner and then drops
  Storage rows, on every accepted move input. Measured linear: ~3k fuel and 0.4 µs per owned monster
  (0.4 ms per input at 1,000 owned). Add a `(owner_identity, party_slot)` btree index and read the
  party slots through it; `set_party_slot` can use the same index. Verify the multi-column range
  filter against the pinned `spacetimedb` crate first.
- **SR3 `player_quest` is owner-only.** The table is public and subscribed whole, so every client
  downloads and keeps every account's open quest rows (offline accounts included) and scans them on
  each store batch; it also shows every player's quest progress to every client. Make it private
  behind a `my_player_quest` view on the existing owner index (the `my_inventory` pattern). The
  quest-completion ack must still see the row leave in the same batch as the conversation row.
- **SR4 Bounded leaderboard.** `profile` is public, never deleted and subscribed whole; the
  leaderboard sorts every row and rebuilds one DOM row per profile on every store batch while Social
  is open (measured ~18 µs per row per batch). Step 1, client only: re-render only when a profile row
  changed, and render top K plus the caller's row. Step 2: serve a bounded top-K view or table kept
  at ranked settle plus an owner-scoped `my_profile` view, and drop the whole-table subscription.
- **SR6 Owner views reconcile only when dirty.** The client rebuilds every owner-scoped view from
  the SDK cache on every store batch, so cost per second is batch rate × monsters owned. Set a dirty
  flag in each view's own row handlers and on snapshot, reconnect and `store.reset()`; reconcile only
  flagged views.
- **SR7 `battle_summary` reaper.** One row per battle is kept forever with no reader, cap or reaper
  (~30k rows a day at 1,000 daily players), and account erase rewrites all of a player's rows in one
  transaction. Add a capped scheduled reaper shaped like `playtest_reaper`, per the retention
  decision.
- **SR8 Terrain bake at resolution 1.** A zone's whole terrain is baked into GPU textures at device
  resolution on entry (~4 KB × scale² per tile: 165 MB for today's zone on a 4K display). Bake at
  resolution 1 and let the integer stage scale upsample with nearest sampling; re-check the
  screenshot baselines. Camera-windowed baking waits for zones near 100×100.
- **SR9 The load tool sees fan-out.** `mr_load_driver` reports `rx_bytes_per_client_per_s` per level
  (it already subscribes as the client does: its own character, its zone, and `player`). A load-only build
  (about 100 small generated zones and a `dev_reducers` placement reducer, never shipped) lets it
  spread 1,000 clients over 100 zones; the nightly runs it for a few seconds
  at 20 clients and fails when no move is accepted. A recording rule and panel for reducer-thread
  share by reducer (`spacetime_txn_elapsed_time_sec`) joins the dashboard. The host's
  `spacetime_num_bytes_sent_to_clients_total` counts each delta once, not once per subscriber, so it
  cannot stand in for this.

- **SR11 A session resumes where it left off.** `join_game` spawns every session in zone 0, which
  makes the spawn zone the peak (see the population target) and, in a single-player world, sends
  the player back to the start each time they open the game. Keep the character's zone and tile
  across a disconnect (or restore them at join) so a returning player appears where they left.
  The rule (operator, 2026-11-13): decide each case on its merits, defaulting to the last position
  when no action is clearly correct.

## Watch items (graph in the load run; no slice unless a budget is breached)

- `content::sync_content` rewrites two rows per stored monster in one transaction on each content
  version bump: 0.5 s at 128k monsters, linear.
- Monsters screen Storage grid: unvirtualised, visible hitch near 1,000 stored monsters.
- `client-wasm` `overlays_of` recomputes every result per call and is called up to four times per
  derive (~1 ms each, event-driven).
- Commit log growth: ~140 KB/s at 100 continuous movers.
- An empty world keeps the 60 s `mr_heartbeat` on purpose (operator, 2026-11-13: it is how a broken
  server is noticed when nobody is on it; it writes nothing). The `playtest_reaper` and
  `export_bundle_reaper` intervals are the other two recurring jobs; they should run only when
  something is owed.
- `battle_challenge` is public and subscribed whole; rows are bounded per online player and reaped.
- The post stack on software or integrated GPUs, unmeasured on real hardware; it is off in
  production builds.

## Checked and fine (do not re-investigate without a new measurement)

`movement_tick` (linear, ~4 µs per mover against a 200 ms period), the per-entity reapers (primary
key reads), sender-scoped views (refresh cost does not grow with bystanders), battle reducers at
human turn rates, content parsing (once per process), the client frame loop (0.4–0.6 ms of JS per
frame), build, bundle and startup.

## Notes

- Evidence and reproduction scripts were session artefacts; each slice re-measures its own before
  and after with SR9's tool, which is why SR9 may run first even though it is listed last.
- SR3 changes a table's visibility; coordinate with `M25-security-audit.spec.md` S2 (frozen
  schema) at elaboration.
- Built: movement intent is a private table and the tick publishes the queue and the ack with the
  position (game #743, #744); a zone ticks only while a player is in it (game #745); `character`
  is subscribed for the own row and per zone, with `player` world-wide (game #746–#748). Their
  rules are the game repo's `docs/DECISIONS.md` entries on movement intent, empty zones and world
  scope. Scope `player` too only if it measures above 1 KB/s per client or the target passes about
  5,000 concurrent; hold the own-row query only at login if reducer-thread share ever binds.
