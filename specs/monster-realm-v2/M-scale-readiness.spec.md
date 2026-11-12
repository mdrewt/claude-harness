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

What the target implies, from the per-call costs measured on 2026-11-12 (extrapolated, not load
tested at this size — SR9 exists to replace these with measurements):

- **Zone scoping (SR5) is the first fix, not the last.** With `character` and `player` subscribed
  world-wide, each client receives every one of 1,000 players' updates; row deliveries grow with
  the world population squared, five times past the largest level measured (200). Scoped to a zone,
  a client sees 10 players on average and 50 at peak.
- **Inside a peak zone the intent broadcast (SR1) is the remaining cost:** 55 KB/s download per
  client at 50 movers before the fix, about 5 KB/s after.
- **The reducer thread is one writer for the whole world.** 1,000 players all walking is 5,000
  `enqueue_move` calls a second at ~70 µs each: about 35% of the thread in the worst case. SR1's
  owner view doubled reducer-thread time in the prototype, so at this target SR1 must be measured
  at 1,000 movers across zones before its design is fixed; taking the ack from the reducer call's
  result instead of a view is the fallback.
- **100 zone ticks at 5 Hz** is 500 scheduled calls a second: about 3% of the thread with every
  zone empty, plus about 2% for 1,000 movers. Affordable on the official server, and removed by
  SR10 because the same code runs on a player's laptop.
- **Budgets for SR9's load run:** 1,000 clients spread over 100 zones with one zone at 50; tick p95
  under `STEP_MS`, input round-trip p95 under 50 ms, download per client under 20 KB/s, reducer
  thread under 50%.

## Decisions still open (ask at elaboration; reversible defaults in brackets)

- **Total accounts:** how many registered accounts the stored tables must hold. [default: 50k —
  sizes SR3, SR4 and SR7]
- **Storage cap:** whether an account's monster Storage is capped. [default: no cap; SR2 and SR6
  make the uncapped case cheap]
- **`battle_summary` retention:** what the per-battle telemetry is for and how long it is kept.
  [default: keep the newest N rows, N from the account count]

## Scope (sketch) — one slice per item; build SR9 and SR5 first, then by value per size

- **SR1 Movement intent is owner-only.** `enqueue_move`, `set_move` and `clear_queue` write
  `character.move_queue` and (through `guards::authorize_move`) `player.last_input_seq`, both public
  rows every client subscribes, though only the sender reads them. Row deliveries grow with
  players squared: measured 64 KB/s download per client at 100 movers. Move the queue and the ack to
  a private table behind an owner-scoped view (the `my_wallet` pattern); `movement_tick` drains from
  it. Measured with a prototype at 100 movers: download per client 64 → 9 KB/s, input round-trip
  p95 29 → 10 ms, server CPU −33%. The view re-evaluation doubles reducer-thread time (to ~10% of a
  core at 100 movers) and grows the commit log 27%. Touches schema, movement, guards, `join_game`,
  `on_disconnect`, the erase/export paths, client reconciliation, bindings, sim-harness. The netcode
  evals and movement e2e specs are the gate.
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
- **SR5 Zone-scoped world subscriptions.** `character` and `player` are subscribed with no zone
  filter, so every client receives every player in the world. Scope them to the caller's zone,
  re-subscribing on a zone change; the interact-chip
  marshalling (`interactModel.marshalInteract`) then stops walking other zones' entities.
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
  and subscribes `character` and `player` as the client does; the nightly runs it for a few seconds
  at 20 clients and fails when no move is accepted. A recording rule and panel for reducer-thread
  share by reducer (`spacetime_txn_elapsed_time_sec`) joins the dashboard. The host's
  `spacetime_num_bytes_sent_to_clients_total` counts each delta once, not once per subscriber, so it
  cannot stand in for this.

- **SR10 A zone with no player in it does no work** (operator, 2026-11-12: such zones "should
  either not update or keep updates to a minimum"). Every zone's `movement_tick` fires at 5 Hz
  whether or not anyone is there (~58 µs per empty tick: ~3% of the reducer thread for 100 empty
  zones, and constant wake-ups and commit-log writes on a player's own machine). A zone's tick is
  armed when a player's character enters it (join, warp, reconnect) and disarms itself on the first
  tick that finds none; NPCs in an empty zone hold still. Anything that must still advance with
  nobody present (a timer a returning player would notice) is computed from elapsed time on
  re-arm, not ticked. Builds after SR1, which rewrites the same reducer.

## Watch items (graph in the load run; no slice unless a budget is breached)

- `content::sync_content` rewrites two rows per stored monster in one transaction on each content
  version bump: 0.5 s at 128k monsters, linear.
- Monsters screen Storage grid: unvirtualised, visible hitch near 1,000 stored monsters.
- `client-wasm` `overlays_of` recomputes every result per call and is called up to four times per
  derive (~1 ms each, event-driven).
- Commit log growth: ~168 KB/s at 100 continuous movers.
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
- SR1 and SR3 change table visibility; coordinate with `M25-security-audit.spec.md` S2 (frozen
  schema) at elaboration.
