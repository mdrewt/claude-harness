# Spec: M-scale-readiness — costs that grow faster than the population

**Status:** elaborated 2026-11-15 from the 2026-11-12 sketch, against game `master` `8be26b0f`
with nothing else in flight. Anchors are symbols and files, never line numbers.
**Project:** monster-realm (server-module, client, sim-harness, ops) ·
**Target:** before any playtest above ~20 concurrent players, and before launch.
**Slices:** 12. The heads are `sr-9a`, `sr-9d`, `sr-6a`, `sr-8` and `sr-4a`, which start in
parallel. The schema chain runs one slice at a time: `sr-2` → `sr-7` → `sr-3` → `sr-4b`.
`sr-9c` → `sr-9b` follow `sr-9a`, and `sr-6b` follows `sr-6a`. The full graph is in §Order.
**Absorbed residuals:** R-qf-6-PLAYERQUESTPUBLIC → `sr-3`.
**Cross-linked, not absorbed:** R-bt-7-SUMMARYEXPORT (whether `battle_summary` is exported is
a data-export question; `sr-7` does not change that table's exportability).
**Feedback items:** none.

## Problem / intent

Nothing here costs anything visible at playtest scale (2–5 players, a handful of monsters each).
Each item is a cost that grows with a population axis and has no cap. A static scaling audit
found them, and a doubling probe or a load run confirmed each (2026-11-12, game repo
`618a28f2`/`c3f239be`). The milestone removes them while they are cheap to remove, and makes the
load tool able to see the ones that remain.

## Population target — the official server (operator, 2026-11-12)

The official server is one of three ways to play (`game-design.md` §14); these numbers size it
alone. Single-player and private worlds are budgeted in `M-local-play.spec.md`.

- **Per zone:** a long-tailed distribution — 8–12 players on average, about 50 in a small share of
  zones.
- **World:** up to about 100 zones of various sizes; about 600 concurrent players on average and
  about 1,000 at peak.
- **Stored accounts:** 50,000 (`decision-defaulted:total-accounts=50000`). This sizes `sr-3`,
  `sr-4b` and `sr-7`.
- Revisit if the game outgrows it. Today only a few developers are connected at once.

What the target implies, from measurements on 2026-11-12. These used one zone with up to 100
walkers; larger figures are extrapolated, and `sr-9b`'s run replaces them with measurements:

- **A client's download follows the walkers in its subscription scope:** about 0.85 KB/s plus
  0.077 KB/s per walker (8.55 KB/s at 100, 4.71 at 50, 2.39 at 20). The client subscribes
  `character` per zone, so its scope is its own zone, plus a warp destination while it stands
  within 4 tiles of the warp. That measured 4.8 KB/s in a zone of 50 and about 2 KB/s in a zone
  of 10. The 20 KB/s budget is reached near 220 walkers in one zone.
- **A returning session resumes on the tile it left;** only a first-ever join starts at the zone-0
  spawn. The spawn zone peaks only when new accounts arrive together (58.9 KB/s per client was
  measured at 500 walkers in one zone).
- **The reducer thread is one writer for the whole world.** At 750 walking players it was 15.5%
  busy. The per-player own-row query is about 3.3–4.0 µs of that per step (1.6–2.0% at 1,000).
  `sr-2` removes the part that grows with monsters owned.
- **Budgets for `sr-9b`'s load run:** 1,000 clients spread over 100 zones with one zone at 50;
  tick p95 under `STEP_MS`, input round-trip p95 under 50 ms, download per client under 20 KB/s,
  reducer thread under 50% at a 30% walking share.

## Live re-verification at `8be26b0f` (what holds, what the sketch got wrong)

- **SR2 holds.** `battle::lead_party_ids` filters `monster` on the single-column
  `owner_identity` index, drops Storage rows (`party_slot == PARTY_SLOT_NONE`) and sorts the rest.
  It runs on every accepted `movement::enqueue_move` (Quality-Time accrual), in
  `battle::lead_party` (`movement_tick`'s band check, `tactics::start_wild_tactical`) and in
  `battle::refresh_lead_level`. `monster_mgmt::set_party_slot` runs the same owner scan to collect
  occupied slots. The pinned `spacetimedb` crate (2.11.0) has two-column btree indexes
  (`index(accessor = …, btree(columns = [a, b]))`). Their `RangedIndex::filter` takes a
  `(T, Range<U>)` bound, so `(owner, 0..PARTY_SLOT_NONE)` is a supported range scan. Range
  iterators are not double-ended.
- **SR3 holds.** `player_quest` is `public`, and `client/src/net/connection.ts` subscribes it
  whole (`SELECT * FROM player_quest`) with per-row `onInsert`/`onUpdate`/`onDelete` handlers;
  the store filters with `AuthoritativeStore.ownQuests`. The game's `docs/DECISIONS.md`
  "Table privacy" lists it as public on purpose, and the `PlayerQuestRow` doc comment names the
  `my_inventory` pattern as possible but not done.
- **SR4 holds, with two render paths.** `profile` is `public`, never deleted (its
  `DATA_LIFECYCLE_MANIFEST` row is the ladder's never-delete invariant) and subscribed whole.
  `ui/leaderboardModel.ts` `buildLeaderboardViewModel` sorts every profile. Two callers do this
  on every store batch while they are open: `main.ts`'s leaderboard batch listener
  (`leaderboardView`) and the Social frame's rankings tab (`ui/screens/socialScreen.ts`
  `viewModel` → `ui/socialModel.ts` `buildSocialVm`). `main.ts` also reads `store.profile(id)`
  as a name fallback after `store.player(id)`. The crate's index iterators run ascending only, so
  a view cannot read a top-K from a `rating` index without a full scan.
- **SR6 holds.** The `MicrotaskBatcher` callback in `connect()` rebuilds every owner-scoped view
  from the SDK cache on every batch. That is fourteen `reconcile*FromView` calls (`my_monster_pub`,
  `my_battle`, `my_export_bundle`, `my_pending_evolution_notices`, `my_inventory`, the seven
  tactical views, `my_trade_session`) before `store.flushBatch()`.
- **SR7 holds.** `battle_summary` is private, one row per battle (inserted at the Active start by
  `tactics_settle.rs`, updated through the battle). It has no reader in the module. It has no cap
  or reaper. Account erase (`erase_tactical_rows`) rewrites every row naming the owner with
  `TOMBSTONE_IDENTITY` in one transaction. Its manifest row says it survives and is never exported.
- **SR8 holds.** `render/world.ts` `bakeChunk` bakes each terrain chunk with
  `terrainLayout.ts` `chunkTextureRequest` at `resolution: deviceScale`. `WorldRenderer.resize`
  re-bakes the whole map whenever the device scale changes.
- **SR9 — two corrections to the sketch.** (1) The sketch says `mr_load_driver` already
  subscribes "its own character, its zone, and `player`". It subscribes its own `player` row
  only (`own_player_query`: `SELECT * FROM player WHERE identity = 0x…`), while the client
  subscribes `player` world-wide. The driver therefore under-counts the `player` fan-out a real
  client receives. (2) `MAX_CLIENTS` is 500, below the 1,000-client target. Also: the driver
  reports no received bytes. It exits 0 when a level is invalid (`run` returns non-zero only on
  an abort). It never runs in CI (its header says so). Only two zones exist
  (`game-core/content/zones/000-core.ron`).
- **Watch items still hold.** `content.rs`'s version-bump re-derive rewrites every `monster` and
  `monster_pub` row in one pass. The Monsters screen Storage grid (`ui/boxView.ts`) is
  unvirtualised. `client-wasm` `overlays_of` is reached four times per tactical derive
  (`tactics/tacticsBattle.ts`, `tactics/commandModel.ts`). `battle_challenge` is public and
  reaped by its TTL reaper. The 60 s `mr_heartbeat` still runs on purpose.
- **Checked and fine — not re-investigated** (no new measurement): `movement_tick`, the
  per-entity reapers, sender-scoped views, battle reducers at human turn rates, content parsing,
  the client frame loop, build, bundle and startup.

## Scope

In: SR2, SR3, SR4 (client step and server step), SR6, SR7, SR8 and SR9 (fan-out reporting, the
nightly smoke, the load-only build and the reducer-share rule), as the twelve slices below.

Named deferrals:
- **Camera-windowed terrain baking** → after this milestone, when a zone nears 100×100 tiles
  (`sr-8` bakes the whole zone at resolution 1).
- **Subscribing `player` per zone** → only if `sr-9b`'s run measures `player` above 1 KB/s per
  client, or the target passes about 5,000 concurrent. Holding the own-row query only at login →
  only if reducer-thread share ever binds.
- **Watch items** (`sync_content` re-derive, Storage grid, `overlays_of`, commit-log growth, the
  post stack on integrated GPUs) → no slice unless `sr-9b`'s run breaches a budget. A breach is a
  follow-up row filed by that slice.
- **The driver holding the client's other tables** (`profile`, `npc`, content and the owner views)
  → wontfix for load: walking writes none of them, so they add no per-step fan-out.
- **Exporting `battle_summary`** (R-bt-7-SUMMARYEXPORT) → stays a backlog residual; a data-export
  question, not a scale one.
- **Moving `M25-security-audit.spec.md` S3/S5's public-table lists** (they name `player_quest` and
  `profile` as public on purpose) → a follow-up row on this slice; that spec re-elaborates when
  M25 is unblocked.

Non-goals: Storage caps (`decision-defaulted:storage-cap=none`; `sr-2` and `sr-6b` make the
uncapped case cheap), interest management beyond the existing per-zone scope, transport changes.

## Decisions (reversible; documented defaults — no operator question)

None of these is irreversible or security-bearing. Each moves data toward less exposure or less
retention, or changes cost only. So none goes to `mr-ask-drew`.

- `decision-defaulted:total-accounts=50000` — the sketch's default.
- `decision-defaulted:storage-cap=none` — the sketch's default.
- `decision-defaulted:battle-summary-retention=newest-100000` — keep the newest 100,000 rows,
  twice the account count, by `battle_id`. At ~30k battles a day (1,000 daily players) that is
  about three days, which is more than enough rows for the H1/H2 match-length and BT9.5 tuning
  reads. Rows of a battle that is still live are never reaped.
- `decision-defaulted:summary-reaper=on-demand-one-shot` — `playtest_reaper`'s shape. An insert
  that takes the table over the cap arms one run. Each run deletes at most 8,192 rows
  (`PLAYTEST_REAP_MAX_DELETE_PER_TICK`'s value) and re-arms while the table is still over. With
  nothing owed, no row is scheduled.
- `decision-defaulted:leaderboard-top-k=100`.
- `decision-defaulted:leaderboard-shape=membership-table-plus-join` — a public `leaderboard_top`
  table holds only the identities of the top 100 profiles. `ranking.rs`, the sole owner of
  `profile` writes, keeps it. The client subscribes the profile rows of its members through a
  join subscription, plus its own row by identity. Display data stays in `profile`, so a rename
  or a cascade tombstone reaches the leaderboard with no second write. If the join subscription
  is refused by the pinned host, the fallback is a `leaderboard_top` that carries the four
  display columns, written by every `ranking.rs` profile writer. Either way the client
  contract below is the same.
- `decision-defaulted:dirty-flag-owner=net/viewReconcile.ts` — the dirty set lives with the
  reconciles it gates (§Structure).
- `decision-defaulted:terrain-bake-resolution=1`.
- `decision-defaulted:driver-player-scope=world-wide` — the bot subscribes `SELECT * FROM player`
  as the client does (the sketch's correction 1).
- `decision-defaulted:driver-max-clients=1000`.
- `decision-defaulted:load-zones=game-core-feature-load_test_zones` — 100 generated all-walkable
  16×16 zones with ids from 10000, appended by `content::load_zones` and `content::load_zone_maps`
  only under a `load_test_zones` cargo feature. The feature is never in `default`. Neither
  `client-wasm` nor the `dev_reducers` build (the e2e build) enables it.
- `decision-defaulted:load-placement=dev_place_in_load_zone` — a `dev_reducers` reducer that
  moves the caller's own character to a load-band zone's spawn tile. It follows every rule of the
  game's "Dev-only reducers never ship" entry.
- `decision-defaulted:nightly-load-smoke=20-clients-default-build` — the default module build,
  20 clients, one level, a few seconds.
- `decision-defaulted:reducer-share-rule=mr:reducer_thread_share:rate5m` — the per-reducer
  `rate(spacetime_txn_elapsed_time_sec_sum[5m])`, i.e. seconds of reducer thread per second.

## Structure

`client/src/net/connection.ts` (1,376 lines: auth, reconnect, scope, table wiring and the
batcher) would receive additions from `sr-6b`, `sr-3` and `sr-4b`. So `sr-6a` first moves the
batcher's owner-view reconcile block into `client/src/net/viewReconcile.ts` without changing
behaviour. Then `sr-6b` adds the dirty set there, and `sr-3` and `sr-4b` register their view
there. `connection.ts` keeps only wiring: the subscription strings, the row handlers that mark a
view dirty, and the call. The moved block writes only to the store, which `store.ts` owns, so the
move is `tier: routine`. No test reads `connection.ts` as text (measured:
`connection.test.ts`'s `readFileSync` reads `main.ts`). Every behaviour the block has is covered
through `connect()` by `connection.runtime.test.ts`, `connection.test.ts` and
`connection.conversationCoalesce.test.ts`, which stay unedited in `sr-6a`.

`ranking.rs` already owns every `profile` write (`get_or_init_profile`, `apply_pvp_rating`,
`set_profile_name`, `rekey_profile`, `anonymize_display_names`). `sr-4b`'s membership upkeep
goes there, so no new module is needed. The `battle_summary` reaper is new state, so it goes in
a new module `server-module/src/summary_reaper.rs`. `tactics_settle.rs` gains only the arm call
after its insert. The load-only reducer goes in a new module `server-module/src/load_dev.rs`.
Its `mod` line has no `cfg`, and its items carry the feature gate. It reaches `movement.rs`'s
private character placement through a `dev_reducers`-gated forwarder placed after `movement.rs`'s
last production item.

No `docs/refactors/` plan lists an unsectioned extraction for these files, and the census below
found no orphan in the touched area, so no `structure.spec.md` section is added.

## Order

```
sr-9a ──> sr-9c ──> sr-9b ──┐
sr-9d ───────────────────────┤
sr-9a ──> sr-2 ──> sr-7 <────┘ (sr-7 also after sr-9d, sr-9b)
sr-6a ──> sr-6b ──┐
sr-4a ────────────┼──> sr-3 (after sr-7) ──> sr-4b
sr-8 (independent)
```

- **SR9 first.** `sr-2`, `sr-7` and `sr-9b` measure with `sr-9a`'s report.
- **Schema work is serial.** `sr-2` adds an index to the private `monster`. `sr-7` adds a schedule
  table. `sr-3` turns a subscribed public table private and adds a view. `sr-4b` adds a public
  table and changes the client's subscription. None adds a column to an existing table.
- **Disconnects.** A publish that changes a subscribed table's shape disconnects every client, so
  the module and the client ship together. `sr-2` (private table) and `sr-7` (new table) disturb no
  subscription, so they go first. `sr-3` and `sr-4b`, which change what the client subscribes,
  are adjacent at the end of the chain, so a deploy can take both together.

## Slices

### sr-9a — the load driver reports per-client download at the client's scope
type: feature · tier: routine
category: loop-ops/observability · severity: HIGH · size: SMALL
touches: sim-harness/src/bin/mr_load_driver.rs
after: []

The driver already drains every bot's socket (`t19`'s payload sink). This slice counts the bytes
each bot receives during a level's usable scrape window and reports two fields per level:
`rx_bytes_per_client_per_s` (the mean over bots) and `rx_bytes_per_client_per_s_max` (the
worst bot). Both are integers, on the JSON report and in the rendered table. The window is the
driver's own scrape schedule, so the driver still reads no wall clock. The bot's opening query
becomes `SELECT * FROM player`, byte-identical to the client's, and `RowScan` picks the bot's
own row out of the world-wide rows by its identity. `MAX_CLIENTS` rises to 1,000. The tests that
pin 500 (`MAX_CLIENTS`'s CLI cap and `total_driver_threads`) and the opening-query tests that
expect `own_player_query` change in this slice, as named intentional changes. The module
header's "What a bot subscribes to" section is restated. All tests are the file's inline
`#[cfg(test)] mod tests` (no sockets, no clocks).

- **sr-9a.1:** WHEN a level's usable scrape window ends, THE driver SHALL report `rx_bytes_per_client_per_s` as the bytes all bots received in the window divided by the bot count and the window's seconds, and `rx_bytes_per_client_per_s_max` as the largest single bot's rate, in both the JSON report and the rendered table (`sim-harness/src/bin/mr_load_driver.rs` inline tests, fed byte counts and a scrape schedule).

- **sr-9a.2:** WHEN a bot opens its subscription, THE driver SHALL send `SELECT * FROM player` byte-identical to the client's query in `client/src/net/connection.ts`, and SHALL still read the bot's own `entity_id` from its own row when other players' rows arrive before, after or around it in the same message (`sim-harness/src/bin/mr_load_driver.rs` inline tests).

- **sr-9a.3:** WHEN `--clients-max` is 1,000, THE driver SHALL accept it, and WHEN it is 1,001, THE driver SHALL reject it with the cap in the message (`sim-harness/src/bin/mr_load_driver.rs` inline tests).

### sr-9d — reducer-thread share by reducer, recorded and graphed
type: feature · tier: routine
category: loop-ops/observability · severity: MED · size: SMALL
touches: ops/observability/rules/recording.rules.yml, ops/observability/rules/recording.rules.test.yml, ops/observability/validate.mjs, ops/observability/grafana/dashboards/monster-realm.json
after: []

A recording rule `mr:reducer_thread_share:rate5m` is
`sum by (reducer) (rate(spacetime_txn_elapsed_time_sec_sum[5m]))`. A second rule,
`mr:reducer_thread_share_total:rate5m`, is the sum over reducers. The dashboard gains one panel
stacking the first rule by reducer, with the total as a line. The rule's behaviour is tested with
`promtool test rules` over fixture series in the new `recording.rules.test.yml`. `validate.mjs`
runs it in the Prometheus image beside its existing `promtool check rules` step, so CI's
`observability` job (`just observability-validate`) executes it. `validate.mjs` is a test-runner
file and this slice declares it. The host's `spacetime_num_bytes_sent_to_clients_total` counts
each delta once, not once per subscriber, so no rule here stands in for `sr-9a`'s per-client
download.

- **sr-9d.1:** WHEN `promtool test rules` evaluates `recording.rules.test.yml` over fixture series in which `movement_tick` spends 0.12 s and `enqueue_move` 0.03 s of transaction time per second, THE recorded `mr:reducer_thread_share:rate5m` SHALL be 0.12 and 0.03 for those reducers and `mr:reducer_thread_share_total:rate5m` 0.15 (`ops/observability/rules/recording.rules.test.yml`, run by `ops/observability/validate.mjs`).

- **sr-9d.2:** WHEN the rule file fails its rule tests, THE observability validation SHALL exit non-zero and name the failing test (`ops/observability/validate.mjs` under `just observability-validate`, proven by one run against a deliberately wrong expected value in the PR's red step).

### sr-9c — the nightly runs the load driver for a few seconds
type: feature · tier: routine
category: loop-ops/observability · severity: MED · size: SMALL
touches: sim-harness/src/bin/mr_load_driver.rs, .github/workflows/nightly.yml, justfile
after: [sr-9a]

A `--fail-on-invalid` flag makes `run` return a non-zero exit when any level is invalid
(`no_load_reached`, `join_failed`, `scope_unsettled`, …), and the report names the reason. A
`just load-smoke` recipe runs one level of 20 clients against a host on `127.0.0.1:3000` with the
default module build published. A nightly job starts an in-memory host as `e2e-serial` and
`smoke-republish` do, publishes, and runs the recipe. The job is in the summary job's `needs:`,
so the nightly goes red when no move is accepted. The driver's "This binary never runs in CI"
header section is restated.

- **sr-9c.1:** WHEN `--fail-on-invalid` is given and any level's verdict is invalid, THE driver SHALL exit non-zero after writing its report, and WHEN every level is valid it SHALL exit 0 (`sim-harness/src/bin/mr_load_driver.rs` inline tests over the verdict-to-exit mapping).

- **sr-9c.2:** WHEN the nightly workflow runs, THE load-smoke job SHALL publish the default module to a fresh in-memory host, run `just load-smoke` (20 clients, one level, `--fail-on-invalid`), and fail the nightly when the driver exits non-zero (`.github/workflows/nightly.yml`; evidence: one `workflow_dispatch` run of the nightly on the PR branch, linked in the PR).

### sr-9b — a load-only build spreads 1,000 clients over 100 zones
type: feature · tier: hard
category: loop-ops/observability · severity: HIGH · size: MODERATE
touches: game-core/Cargo.toml, game-core/src/lib.rs, game-core/src/load_test_zones.rs, game-core/src/content.rs, server-module/Cargo.toml, server-module/src/lib.rs, server-module/src/load_dev.rs, server-module/src/load_dev_tests.rs, server-module/src/movement.rs, server-module/src/privacy_enforcement_tests.rs, scripts/verify-release-reducers.mjs, .cargo/mutants.toml, sim-harness/src/bin/mr_load_driver.rs, justfile, docs/DECISIONS.md
after: [sr-9c]

`game-core/src/load_test_zones.rs` builds the 100 zones as data: 16×16 all-walkable maps with no
grass, no warps and no NPCs, with ids 10000–10099 and a spawn tile each. `content::load_zones`
and `content::load_zone_maps` append them only under `cfg(feature = "load_test_zones")`.
`server-module`'s `load_test_zones` feature forwards to game-core's and also enables
`dev_reducers`. `load_dev.rs` holds `dev_place_in_load_zone(zone_id)`, which follows each rule of
the game's "Dev-only reducers never ship" entry:
- the deletion gate first;
- a place in the census's `EXPECTED_GATED` and `EXPECTED_MODULES`;
- `FORBIDDEN_REDUCERS` gains its name;
- `.cargo/mutants.toml` entry 8 gains its `exclude_re` keys;
- the default release wasm is proven byte-identical to the base's, with both sha256 sums in the
  PR.

The reducer moves only the caller's own character (`ctx.sender()`), to the zone's spawn tile,
through the `movement.rs` forwarder. That forwarder arms the zone's tick as a join does. The
entry's list of dev reducers names the new reducer. The driver gains `--zones <n>`, which makes
each bot call the reducer for zone `10000 + (bot index mod n)` after it joins, and
`--walking-share <pct>`, which makes only that share of bots send moves. `just load-host` builds
and publishes the load build. The run of record is in DoD.

- **sr-9b.1:** WHEN game-core is built with `load_test_zones`, THE zone registry and the zone maps SHALL each hold the 2 shipped zones plus 100 generated zones with ids 10000–10099, every generated tile walkable and each spawn tile in bounds, and `validate_content` SHALL pass; WHEN built without the feature, THE registry SHALL hold exactly the shipped zones (`game-core/src/load_test_zones.rs` tests run with and without the feature).

- **sr-9b.2:** WHEN a caller invokes `dev_place_in_load_zone` with a zone id in 10000–10099, THE reducer SHALL move only the caller's own character to that zone's spawn tile and arm that zone's tick, and WHEN the id is outside that band or the caller has no character, THE reducer SHALL reject with an error and change no row (`server-module/src/load_dev_tests.rs`, native host).

- **sr-9b.3:** WHEN the module is built without `dev_reducers`, THE published reducer list SHALL not contain `dev_place_in_load_zone` (`scripts/verify-release-reducers.mjs` against the default build, and the release wasm's sha256 equal to the base's).

- **sr-9b.4:** WHEN the driver runs with `--zones 100` and `--walking-share 30`, THE bots SHALL be placed round-robin over zones 10000–10099 and only 30% of them SHALL send moves (`sim-harness/src/bin/mr_load_driver.rs` inline tests over the placement and walking-set plans).

### sr-2 — the party is read through an `(owner, slot)` index
type: feature · tier: hard
category: performance/server · severity: HIGH · size: SMALL
touches: server-module/src/schema.rs, server-module/src/battle.rs, server-module/src/battle_tests.rs, server-module/src/monster_mgmt.rs, server-module/src/monster_mgmt_tests.rs, evals/baselines/table-schemas.json
after: [sr-9a]

`monster` gains `index(accessor = owner_party, btree(columns = [owner_identity, party_slot]))`.
The single-column `owner_identity` index stays, because the re-key, erase and export read every
owned monster. `lead_party_ids` reads `owner_party().filter((owner, 0..PARTY_SLOT_NONE))`. The
range is ascending by slot, so the explicit sort goes. `set_party_slot` collects occupied slots
through the same range. Every caller of `lead_party_ids` keeps its signature. The schema baseline
is re-recorded. `monster` is private, so no binding changes. Measured in DoD: the per-input
cost at 1 vs 1,000 Storage monsters, before and after, with `sr-9a`'s driver.

- **sr-2.1:** WHEN an owner holds party monsters in non-contiguous slots and 1,000 Storage monsters, THE `lead_party_ids` helper SHALL return exactly the party ids ordered by slot, and `None` WHEN the owner holds only Storage monsters (`server-module/src/battle_tests.rs`, native host).

- **sr-2.2:** WHEN `set_party_slot` assigns a slot while the owner holds Storage monsters, THE reducer SHALL accept a free slot and reject an occupied or out-of-range slot exactly as before, with the existing `set_party_slot` cases passing unedited (`server-module/src/monster_mgmt_tests.rs`).

- **sr-2.3:** WHEN this module is published without `--delete-data` over a database the base module filled with monsters, THE publish SHALL succeed and every owner's party SHALL read back through the new index unchanged (publish-over-data proof; the command transcript is in the PR).

### sr-7 — `battle_summary` is capped by an on-demand reaper
type: feature · tier: hard
category: data-integrity/performance · severity: MED · size: MODERATE
touches: server-module/src/schema.rs, server-module/src/summary_reaper.rs, server-module/src/summary_reaper_tests.rs, server-module/src/lib.rs, server-module/src/tactics_settle.rs, server-module/src/privacy_enforcement_tests.rs, server-module/src/native_host_tests.rs, server-module/src/accounts_tests.rs, evals/account-e2e.eval.mjs, evals/baselines/table-schemas.json, ops/observability/rules/recording.rules.yml, docs/DECISIONS.md
after: [sr-2, sr-9d, sr-9b]

`summary_reaper.rs` holds `BATTLE_SUMMARY_CAP` (100,000), the per-run delete limit (8,192), the
schedule table `battle_summary_reaper_schedule` (`scheduled(battle_summary_reaper)`), and its
arm and run functions, in `playtest.rs`'s on-demand one-shot shape. The reaper deletes from the
lowest `battle_id` upward. It skips a row whose `battle` anchor exists and is not terminal. Live
rows are the newest by construction, so a skip is rare. `tactics_settle.rs` calls the arm after
its insert. The new table gets a `DATA_LIFECYCLE_MANIFEST` row (`NotOwned`, not exportable).
`battle_summary`'s basis states the cap. The census bumps follow: `TABLE_DESCRIBERS`, the
account-e2e transcription, the re-key census, and `EXPECTED_MODULES`. The new scheduled function
is classified in `recording.rules.yml`'s scheduled-function list (as the other reapers are).
`docs/DECISIONS.md` records the retention rule (the bar: a data-retention decision).

- **sr-7.1:** WHEN an insert takes `battle_summary` above `BATTLE_SUMMARY_CAP` and no reaper run is scheduled, THE module SHALL schedule exactly one run, and WHEN the table is at or below the cap, THE module SHALL schedule none (`server-module/src/summary_reaper_tests.rs`).

- **sr-7.2:** WHEN the reaper runs with the table over the cap, THE reaper SHALL delete the lowest-`battle_id` rows down to the cap, at most 8,192 per run, never a row whose `battle` anchor is live, and SHALL schedule one more run only while the table is still over the cap (`server-module/src/summary_reaper_tests.rs`).

- **sr-7.3:** WHEN a client calls `battle_summary_reaper`, THE reducer SHALL reject it as scheduler-only and change no row (`server-module/src/summary_reaper_tests.rs`, native host).

- **sr-7.4:** WHEN an account is erased, THE surviving `battle_summary` rows naming it SHALL carry `TOMBSTONE_IDENTITY` on its side as before, with the existing erase cases passing unedited (`server-module/src/accounts_tests.rs`).

- **sr-7.5:** WHEN this module is published without `--delete-data` over a database holding `battle_summary` rows, THE publish SHALL succeed and the rows SHALL survive (publish-over-data proof; transcript in the PR).

### sr-6a — move the owner-view reconciles out of `connection.ts`
type: refactor · tier: routine
category: structure/client · severity: LOW · size: SMALL
touches: client/src/net/connection.ts, client/src/net/viewReconcile.ts, client/src/net/viewReconcile.test.ts
after: []

Moves the batcher callback's reconcile block (the fourteen `reconcile*FromView` calls, their
`guarded` and `present` helpers, and their try/catch grouping) into `viewReconcile.ts`
`reconcileOwnerViews(store, db)`. The batcher calls it, then runs the hydration edge and
`store.flushBatch()` as today. The throw-containment grouping is kept exactly: the monster,
battle, export and evolution-notice reconciles share one try, inventory has its own, and each
tactical view and `my_trade_session` is guarded alone. Dependents: `sr-6b`, `sr-3`, `sr-4b`.
moved-tests: none (no test reads the moved source as text; the behaviour tests run through
`connect()` and stay unedited). `viewReconcile.test.ts` covers the moved function directly.

- **sr-6a.1:** WHEN `reconcileOwnerViews` runs over a fake view cache, THE store SHALL receive the same fourteen reconciles with the same rows as the inline block delivered, and a converter that throws for one view SHALL leave the other groups' reconciles applied (`client/src/net/viewReconcile.test.ts`).

- **sr-6a.2:** THE connection's behaviour SHALL be unchanged: `client/src/net/connection.runtime.test.ts`, `client/src/net/connection.test.ts` and `client/src/net/connection.conversationCoalesce.test.ts` pass with their assertions unedited.

### sr-6b — owner views reconcile only when dirty
type: feature · tier: hard
category: performance/client · severity: MED · size: SMALL
touches: client/src/net/viewReconcile.ts, client/src/net/viewReconcile.test.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts
after: [sr-6a]

`viewReconcile.ts` gains a per-view dirty set: `markDirty(view)`, `markAllDirty()`, and a
`reconcileOwnerViews` that runs only the dirty views and then clears them. A view's
`onInsert`/`onDelete` handlers in `wireTables` mark that view. `markAllDirty()` runs on every
applied snapshot, on a rebuild (reconnect), and beside `store.reset()`. A reconcile that throws
leaves its view dirty, so the next batch retries it. Cost per batch then follows the views that
changed, not batch rate × monsters owned.

- **sr-6b.1:** WHEN a batch changes rows of no owner view (only `character` or `player` rows), THE batcher SHALL run no owner-view reconcile and still flush the batch (`client/src/net/viewReconcile.test.ts`, `client/src/net/connection.runtime.test.ts`).

- **sr-6b.2:** WHEN a batch changes rows of one owner view, THE batcher SHALL reconcile that view and no other (`client/src/net/viewReconcile.test.ts`).

- **sr-6b.3:** WHEN a snapshot is applied, a rebuild connects, or the store is reset, THE next batch SHALL reconcile every owner view (`client/src/net/connection.runtime.test.ts`).

- **sr-6b.4:** WHEN a view's reconcile throws, THE view SHALL stay dirty and be reconciled again on the next batch, and the other views and the flush SHALL proceed (`client/src/net/viewReconcile.test.ts`).

### sr-8 — terrain chunks bake at resolution 1
type: feature · tier: routine
category: performance/render · severity: MED · size: SMALL
touches: client/src/render/world.ts, client/src/render/terrainLayout.ts, client/src/render/terrainLayout.test.ts, client/e2e/world-art.spec.ts
after: []

`chunkTextureRequest` returns `resolution: 1` with nearest sampling for every device scale, and
the integer stage scale upsamples the chunks. `WorldRenderer.resize` no longer re-bakes chunks
on a device-scale change (the post-stack rebuild on a resolution change stays). The WAP4.6 cases
in `terrainLayout.test.ts` that expect the device scale ("every create call receives the
deviceScale", "a rebuild at a new deviceScale uses the new scale", the `chunkTextureRequest`
mapping) are re-pointed at resolution 1, as a named intentional change. The `world.ts` header
comment on device-scale baking is restated. `world-art.spec.ts` gains a second browser context
at `deviceScaleFactor: 2` for its existing pixel proof. Texture bytes per tile drop from
4 KB × scale² to 4 KB (165 MB → about 10 MB for today's zone on a 4K display).

- **sr-8.1:** WHEN chunks are built at any device scale, THE cache SHALL request every chunk texture at resolution 1 with nearest sampling (`client/src/render/terrainLayout.test.ts`).

- **sr-8.2:** WHEN `world-art.spec.ts`'s pixel proof runs in a `deviceScaleFactor: 2` context as well as the existing `deviceScaleFactor: 1` one, THE proof SHALL pass in both with its thresholds unedited (`client/e2e/world-art.spec.ts`).

### sr-4a — the leaderboard renders top 100 plus the caller, only when a profile changed
type: feature · tier: routine
category: performance/client · severity: MED · size: SMALL
touches: client/src/ui/leaderboardModel.ts, client/src/ui/leaderboardModel.test.ts, client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/ui/socialModel.ts, client/src/ui/socialModel.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/main.ts
after: []

`AuthoritativeStore` gains `profilesVersion()`, bumped by `upsertProfile` and by `reset`.
`buildLeaderboardViewModel` keeps the total order (rating desc, raw name asc, identity asc). It
returns the top `LEADERBOARD_TOP_K` (100) rows, each with its 1-based `rank`, plus the caller's
own row with its rank when it ranks below 100. It memoises on `(profilesVersion, identity)`:
an unchanged pair returns the same object without sorting. `main.ts`'s leaderboard batch listener
re-renders only when that object changed. The Social screen reads the same memoised model through
`buildSocialVm`. The view shows the rank number on every row and needs no new string. The
`RL15-structural` source scans in both leaderboard test files are unaffected (no write path is
added). Their existing cases with ≤100 profiles stay unedited.

- **sr-4a.1:** WHEN the store holds more than 100 profiles, THE leaderboard view model SHALL hold the top 100 in the existing total order with ranks 1–100, plus the caller's own row with its true rank WHEN the caller ranks below 100 (`client/src/ui/leaderboardModel.test.ts`).

- **sr-4a.2:** WHEN a store batch changes no profile row and the identity is unchanged, THE leaderboard model SHALL return the previous view model without sorting, and THE leaderboard view and the Social rankings tab SHALL not re-render (`client/src/ui/leaderboardModel.test.ts`, `client/src/ui/leaderboardView.test.ts`, `client/src/ui/socialModel.test.ts`).

- **sr-4a.3:** WHEN the caller's own row is shown below the top 100, THE view SHALL render its rank number and mark it as the caller's row, in the Social rankings tab and the leaderboard overlay alike (`client/src/ui/leaderboardView.test.ts`, `client/src/ui/socialModel.test.ts`).

### sr-3 — `player_quest` is owner-only
type: feature · tier: hard
category: security-privacy/performance · severity: MED · size: MODERATE
touches: server-module/src/schema.rs, server-module/src/npc_tests.rs, server-module/src/native_host_tests.rs, evals/baselines/table-schemas.json, evals/baselines/client-visible-tables.json, client/src/module_bindings/index.ts, client/src/module_bindings/player_quest_table.ts, client/src/module_bindings/my_player_quest_table.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/src/net/viewReconcile.ts, client/src/net/viewReconcile.test.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/e2e/dialogue.spec.ts, docs/DECISIONS.md, ARCHITECTURE.md
after: [sr-7, sr-6b, sr-4a]

`player_quest` loses `public`. A `my_player_quest` view (`ViewContext` only, the
`owner_identity` index filtered by `ctx.sender()`) projects it, shaped like `my_inventory`.
Reducers keep reading the table directly, so `npc.rs` and the server's quest tests are
unchanged; `npc_tests.rs` gains the view test. The client subscribes
`SELECT * FROM my_player_quest` and drops the table subscription and its three row handlers. The
view is PK-less, so it is registered in `viewReconcile.ts` as an authoritative, dirty-gated
reconcile (`store.reconcileQuestsFromView`). `ownQuests` and its callers are unchanged. The
bindings regenerate with `just gen`. The two baselines are re-recorded. `VIEW_DESCRIBERS` gains
the view. `docs/DECISIONS.md` "Table privacy" moves `player_quest` from the public-on-purpose list
to the owner-scoped views, and `ARCHITECTURE.md`'s public-world-state row drops it. Hidden
consumer checked: the quest-completion toast (`ui/statusModel.ts`) diffs `pqId`s across batches.
An authoritative reconcile keeps a step advance's `pqId` and removes a completed one, and the
completion transaction delivers the quest delete and the conversation row in one batch.

- **sr-3.1:** WHEN a client queries `my_player_quest`, THE view SHALL return only rows whose `owner_identity` is the caller, and a caller with no quests SHALL receive none (`server-module/src/npc_tests.rs`, native host).

- **sr-3.2:** WHEN any client subscribes, THE module SHALL expose `my_player_quest` and not `player_quest` to clients (the regenerated `evals/baselines/client-visible-tables.json`, checked by the existing client-surface-privacy eval).

- **sr-3.3:** WHEN the view cache changes, THE store's quests SHALL equal the cache's rows exactly (a removed row gone, an advanced step updated in place with its `pqId`), and WHEN no quest row changed, the quest reconcile SHALL not run (`client/src/net/store.test.ts`, `client/src/net/viewReconcile.test.ts`, `client/src/net/connection.runtime.test.ts`).

- **sr-3.4:** WHEN the player re-talks the elder to complete `quest_001`, THE reward toast SHALL name the quest and its 150 gold above the open dialogue frame, through the real UI with the e2e's assertions unedited (`client/e2e/dialogue.spec.ts` UIF4.2).

- **sr-3.5:** WHEN this module is published without `--delete-data` over a database holding `player_quest` rows, THE publish SHALL succeed and each owner's rows SHALL be readable through `my_player_quest` (publish-over-data proof; transcript in the PR).

### sr-4b — the client subscribes a bounded leaderboard, not every profile
type: feature · tier: hard
category: performance/server · severity: MED · size: MODERATE
touches: server-module/src/schema.rs, server-module/src/ranking.rs, server-module/src/ranking_tests.rs, server-module/src/accounts_tests.rs, server-module/src/native_host_tests.rs, evals/account-e2e.eval.mjs, evals/baselines/table-schemas.json, evals/baselines/client-visible-tables.json, client/src/module_bindings/index.ts, client/src/module_bindings/types.ts, client/src/module_bindings/leaderboard_top_table.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/e2e/ui-social.spec.ts, docs/DECISIONS.md, ARCHITECTURE.md
after: [sr-3, sr-4a]

A public `leaderboard_top` table (`identity` primary key) holds the identities of the top 100
profiles in the leaderboard's total order. `ranking.rs` keeps it inside the transactions that
already write `profile`:
- `apply_pvp_rating` updates it incrementally. A full rescan of `profile` runs only when a
  member's rating falls below the 100th, the one case that needs the next candidate.
- `rekey_profile` re-keys a member.
- `set_profile_name` and `anonymize_display_names` need nothing, because names stay in `profile`.

The client replaces `SELECT * FROM profile` with two queries. One is the join subscription that
delivers the members' profile rows. The other is the caller's own row,
`SELECT * FROM profile WHERE identity = 0x<own>`. `profile` stays public and never deleted. The
new table gets its manifest row (not exportable; its identity follows the profile's re-key), the
census bumps (`TABLE_DESCRIBERS`, the account-e2e transcription, the re-key census), and both
baselines. `docs/DECISIONS.md` "Table privacy" names `leaderboard_top`. Name fallback: `main.ts`
reads `store.profile(id)` after `store.player(id)`. A counterpart outside the top 100 who is
offline now resolves to the existing empty-name fallback. This is accepted: names shown for
online players come from `player`. `sr-4b.4` pins the online case.

- **sr-4b.1:** WHEN a ranked match settles, THE `leaderboard_top` table SHALL hold exactly the identities of the top 100 profiles by rating desc, name asc, identity asc, including WHEN a member falls below the 100th and the next profile enters (`server-module/src/ranking_tests.rs`).

- **sr-4b.2:** WHEN a guest claim re-keys a member's profile, THE member's `leaderboard_top` row SHALL carry the claiming identity and the retired guest's SHALL be gone (`server-module/src/ranking_tests.rs`, `server-module/src/accounts_tests.rs` re-key census).

- **sr-4b.3:** WHEN the client subscribes, THE subscription SHALL contain the `leaderboard_top`-scoped profile query and the own-row profile query and no whole-table `profile` query (`client/src/net/connection.runtime.test.ts`).

- **sr-4b.4:** WHEN two players finish a ranked match, THE Social rankings tab of each SHALL list both with their new ratings and ranks through the real UI, and a trade or challenge counterpart who is online SHALL still show their name (`client/e2e/ui-social.spec.ts`).

- **sr-4b.5:** WHEN this module is published without `--delete-data` over a database holding more than 100 profiles, THE publish SHALL succeed and the first ranked settle afterwards SHALL fill `leaderboard_top` with the true top 100 (publish-over-data proof; transcript in the PR).

## Post-integration verification (the milestone's DoD)

- Full `just ci` green on `master` after the last slice; `bindings-drift` clean; the nightly's
  load-smoke, smoke-republish and e2e jobs green.
- **The run of record (`sr-9b`'s DoD).** `just load-host`, then the driver at 1,000 clients over
  100 zones, with one zone filled to 50 (`--zones` plus a 50-bot block) and a 30% walking share.
  The run is repeated after the last slice. The report gives tick p95, input round-trip p95,
  `rx_bytes_per_client_per_s` and its max, and `mr:reducer_thread_share_total:rate5m` against
  the four budgets. A breached budget becomes a follow-up row naming the Watch item or deferral
  that owns it. The numbers replace this spec's extrapolations through a spec note. The
  co-location caveat applies: a run on one machine records it.
- **Per-slice before/after.** `sr-2`, `sr-3`, `sr-4b` and `sr-6b` each record one measurement in
  their PR body:
  - `sr-2`: the per-input reducer time at 1 vs 1,000 Storage monsters, now flat;
  - `sr-3` and `sr-4b`: the subscription's initial bytes at 50,000 seeded profiles and quest rows;
  - `sr-6b`: client batch time with a full Storage.
- **The combined behaviour:** a player walks, talks to complete a quest, fights a ranked match and
  opens Social. The e2e suite covers each step through the real UI (`dialogue.spec.ts`,
  `ui-social.spec.ts`, `world-art.spec.ts`), all on one database in the nightly `e2e-serial` job.

## mr-prune census (elaboration step, game `origin/master` `8be26b0f`)

Run: `memory/projects/mr-prune census --spec specs/monster-realm-v2/M-scale-readiness.spec.md
--mem memory/projects --ci --record M-scale-readiness`.

CENSUS-PENDING

## Risks / flags

- **Join subscriptions at the pinned host (`sr-4b`).** If the host refuses the join, the
  documented fallback copies the four display columns into `leaderboard_top`. That fallback
  makes every `ranking.rs` profile writer also write the copy. The builder proves the join first,
  with a two-client probe in the slice's plan.
- **A view's update arrives as an unordered insert+delete pair.** `sr-3`'s reconcile must be
  authoritative from the cache, never per-row. `sr-6b`'s dirty set is what keeps that cheap.
- **`load_test_zones` must never reach a shipped or e2e build.** It is a separate feature from
  `dev_reducers`. `cargo clippy --all-features` compiles it, and `nextest` and the e2e build do
  not enable it. `sr-9b.1`'s without-feature case is the guard.
- **Publishing `sr-3` or `sr-4b` disconnects connected clients**, and an old bundle's whole-table
  subscription fails. Ship the module and the client together, as every schema slice does.
- **Census rows** are named under §mr-prune census.

## Notes

- Built before this elaboration: movement intent is a private table, and the tick publishes the
  queue and the ack with the position (game #743, #744). A zone ticks only while a player is in
  it (game #745). `character` is subscribed for the own row and per zone, with `player`
  world-wide (game #746–#748). A session resumes where it left off (game #750). The playtest and
  export-bundle reapers run only when something is owed (game #751). Their rules are the game
  repo's `docs/DECISIONS.md` entries on movement intent, empty zones, world scope and resuming a
  session.
- The saved position is not in the data export (an account that exports before joining gets
  none); exporting it needs the export reaper's caps retuned.
