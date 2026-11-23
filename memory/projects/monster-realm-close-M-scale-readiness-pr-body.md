Closes **M-scale-readiness**, a game milestone. All twelve slices are merged on the game's `master`: `sr-6a` #804, `sr-9d` #805, `sr-9a` #806, `sr-4a` #807, `sr-8` #808, `sr-6b` #809, `sr-9c` #810, `sr-2` #811, `sr-9b` #812, `sr-7` #813, `sr-3` #816 and `sr-4b` #819, the last one (`84e3cd96`). PLAN names no unbuilt scope of the spec, so the spec is deleted.

## What changed
- **Notes folded, then harvested.** The 40 pending Build notes were folded into this branch's copy of the spec, one `wip` commit per slice: `sr-9a` ×4, `sr-9d` ×2, `sr-9c` ×2, `sr-9b` ×6, `sr-2` ×2, `sr-7` ×5, `sr-6a` ×1, `sr-6b` ×4, `sr-8` ×2, `sr-4a` ×1, `sr-3` ×5, `sr-4b` ×6. `mr-gates notes harvest` then passed on the folded spec before it was deleted: `NOTES-HARVESTED M-scale-readiness.spec.md (40 note(s), 16 follow-up row(s))`. Every follow-up the notes name already has a residual row, so nothing is lost with the spec: 17 open `R-sr-*` rows (`mr-gates residuals list`), including `R-sr-4b-NOTE385E92` (MED: bound the leaderboard rescan rate under a colluding ranked loop).
- **`specs/monster-realm-v2/M-scale-readiness.spec.md` deleted.**
- **PLAN.md**:
  - The M-scale-readiness item is removed from §9, and the other items move up one. M-local-play is now the head.
  - §9 used no item numbers in its references, so none needed renaming.
  - The "Opening the official server" gate used to name M-scale-readiness. It now names the milestone's one unmet DoD item: the 1,000-client run of record within the official-server budgets (residual `R-close-M-scale-readiness-X8`).
  - §Built gains a **Scale** line for **M-scale-readiness** (`sr-*`). It names the game's `docs/DECISIONS.md` entries that hold its rules.
- **observability-performance-plan.md**: both citations of the deleted spec are repointed. The fan-out signal now cites the driver's `rx_bytes_per_client_per_s` in the game's `sim-harness/src/bin/mr_load_driver.rs`. The population target now cites `game-design.md` §14, which already holds the same numbers.
- **structure.spec.md: unchanged.** The stored close record `$MEM/prune/close/M-scale-readiness.json` was taken at `84e3cd96`, which is the game's freshly fetched `origin/master`. It has 0 rows and `section: null`, so no section is due.
- **$MEM**: deleted the twelve uncited records `monster-realm-sr-{2,3,4b,6b,9b}-*` (plan, pr-body, progress, tester-brief). No live file cites them or the spec: not the branch tree, an `mr-*` tool, or a `$MEM` markdown file (gate X4). Seven of them (`sr-2` ×4, `sr-6b` ×2, `sr-9b` plan) are staged but uncommitted in the main checkout's index. The run did no git operation there, so the supervisor will see those as staged-then-deleted.

## Post-integration verification (the spec's DoD)
- **Master `just ci` on `84e3cd96`**: CI run 43851247147, success. That run includes the `bindings-drift` eval (gate X7).
- **Nightly load-smoke, smoke-republish and e2e-serial: not yet run on a master that holds the milestone.** The latest master nightly is 43726348382 on `f81d0bdb` (2026-11-15), which predates every `sr-*` merge, and the `load-smoke` job did not exist yet. The job's only runs are `sr-9c`'s two dispatches on its branch: the first went red on a driver bug, and the second, on `02579c92`, was green (`$MEM/gates/sr-9c.x-nightly-evidence.md`). This item is DEFERred: X9 → `R-close-M-scale-readiness-X9`.
- **The run of record (1,000 clients, 100 zones, budgets): not run.** `sr-9b` built the load-only module and the driver flags, and its PR lists the run under `not-verified`. No numbers have replaced the spec's extrapolations. Those extrapolations are carried into the drafted population-target entry below, marked as extrapolated. DEFERred: X8 → `R-close-M-scale-readiness-X8` [netcode-determinism/MED]. It should run before any playtest above about 20 concurrent players, and it gates opening the official server.
- **Per-slice before/after, read from the PR bodies (gate X7):**
  - `sr-2` #811: `enqueue_move` at 1 vs 1,000 Storage monsters went from 13.9× (39.6 → 549.9 µs) to 1.37× (42.0 → 57.6 µs).
  - `sr-3` #816: initial subscription bytes at 50,003 quest rows went from 1,942,532 to 154.
  - `sr-4b` #819: initial download at 50,002 profiles went from 2,440,223 to 5,041 bytes. The rescan costs about 7.3–7.7 ms of reducer thread at 50,000 profiles.
  - `sr-6b` #809: a character-only batch with 1,000 Storage monsters went from 0.494–0.507 ms to 0.0005–0.0006 ms.
- **The combined behaviour** (walk, quest, ranked match, Social on one database) is the nightly `e2e-serial` job. It is part of X9.

## decisions
Five of the milestone's lasting decisions already stand title-keyed in the game's `docs/DECISIONS.md` at `84e3cd96` (gate X5):
- **"Table privacy: private tables plus owner-scoped views"** lists `my_player_quest`, and gives quest progress as the reason `player_quest` is private.
- **"The leaderboard is a membership table that the client joins"** covers `leaderboard_top` and the top 100. It includes the join, the rescan, the 7.5 ms cost at 50,000 profiles and the next step for a colluding loop.
- **"`battle_summary` keeps the newest 100,000 battles"** covers the cap and the on-demand reaper.
- **"Dev-only reducers never ship"** covers the load-only build, `load_test_zones` and `dev_place_in_load_zone`.
- **"World rows are subscribed by zone"** states the four budgets and the trigger for scoping `player`.

Four are missing: the `(owner, slot)` party index, the dirty owner-view reconcile, the load tool with its nightly smoke and reducer-share rule, and the population target. Two more are amendments: the resolution-1 terrain bake and the `100+` rank marker. All six are drafted below for the supervisor's game doc-only PR. I have not edited the game repo.

### New entry: The party is read through an `(owner_identity, party_slot)` index

```markdown
## The party is read through an `(owner_identity, party_slot)` index

**Decision.** The private `monster` table has two indexes over its owner
(`server-module/src/schema.rs`). The single-column `owner_identity` serves reads that need every
monster an owner holds: re-key, erase, export and `has_monsters`. `owner_party` is a btree over
`(owner_identity, party_slot)`. Every party read on a per-input or per-tick path goes through its
`(owner, 0..PARTY_SLOT_NONE)` range, which yields the party in slot order. Those reads are
`battle::lead_party_ids` (every accepted `enqueue_move`, the tick's band check, the tactical start,
`refresh_lead_level`) and `monster_mgmt::set_party_slot`'s occupied-slot read; `raising::heal_party`,
once per heal, still filters `owner_identity`. A compile-time
assert in `battle.rs` pins `PARTY_SLOT_NONE == u8::MAX`, because only then does the range mean
"not in Storage".

**Why.** Storage has no cap, and the owner filter read every monster the player held on every
input. With 1,000 Storage monsters, `enqueue_move` cost 13.9 times its cost with one (549.9 µs
against 39.6 µs). Through the range it costs 1.37 times (57.6 µs against 42.0 µs), and a control
shows that the remainder follows the table's size, not the owner's Storage (`mr_load_driver`, 20
clients, median of 5).

**Rules out.** Reading the party on a per-input path through `owner_identity` and dropping Storage
rows; capping
Storage to bound per-input cost; a `PARTY_SLOT_NONE` other than `u8::MAX` without changing the
range.
```

### New entry: Owner views are rebuilt only when dirty

```markdown
## Owner views are rebuilt only when dirty

**Decision.** `client/src/net/viewReconcile.ts` owns the owner-view reconciles and a dirty set
(`createOwnerViewReconciler`: `markDirty`, `markAllDirty`, `reconcileOwnerViews`). A batch rebuilds
a view from the SDK cache only when that view is dirty. Each view's `onInsert`/`onDelete` handler
marks it: `connection.ts` loops over `OWNER_VIEWS`, and there is no `onUpdate` and no per-row store
write. `markAllDirty` runs in three places: beside `store.reset()` on a drop, after every build's
`wireTables`, and first in the base subscription's `onApplied`. A view is cleared once its
reconcile returns. A throw leaves that view, and the later dirty views of its try group, dirty for
the next batch. Every non-view row handler is wrapped in `recoverViewsOnThrow`, which marks every
view, schedules the flush and rethrows. A new owner view gets a `RECONCILE` entry and a
`TRY_GROUPS` slot.

**Why.** Rebuilding every owner view (thirteen when measured) on every batch cost about 0.5 ms with 1,000 Storage
monsters. That included a batch of only `character` and `player` rows, which arrives on every
movement step. With the dirty set that batch costs about 0.0005 ms (node, median of 400). A view's
update arrives as an unordered insert and delete pair, so a rebuild stays whole-view and is read
from the cache; only how often it runs changed. The SDK's dispatch loop has no try/catch, so a
throwing row handler skips the rest of a message whose rows are already cached. Without marking
every view on a throw, those views would stay stale and clean.

**Rules out.** Rebuilding every view on every batch; writing a view's rows into the store from its
row handlers; a row handler that throws without marking every view.
```

### New entry: Load is measured at the client's scope: `mr_load_driver`, a nightly smoke, reducer share by reducer

```markdown
## Load is measured at the client's scope: `mr_load_driver`, a nightly smoke, reducer share by reducer

**Decision.** `sim-harness/src/bin/mr_load_driver.rs` is the load tool. Each bot holds what a
walking client holds of `player` and `character`: `SELECT * FROM player`, byte-identical to the
client's, plus its per-zone `character` queries. It holds none of the client's other tables, which
walking does not write. The report gives each level's received bytes per client per second,
as a mean and for the worst bot (`rx_bytes_per_client_per_s`, `rx_bytes_per_client_per_s_max`),
over the driver's own scrape window. `MAX_CLIENTS` is 1,000. With `--fail-on-invalid`, an invalid
level exits 3. The nightly `load-smoke` job publishes the default module build to an in-memory
host and runs `just load-smoke` (20 clients, one level, `--fail-on-invalid`), so the nightly goes
red when a level is invalid: no bot joins, a bot's zone scope never settles, or no move reaches
the server. A level where every move is rejected stays valid, as a measurement of a saturated
server. Runs over many zones use the load-only build from `just load-host`
(see "Dev-only reducers never ship"). Reducer-thread share is the recording rule
`mr:reducer_thread_share:rate5m`, `sum by (reducer) (rate(spacetime_txn_elapsed_time_sec_sum[5m]))`
(`ops/observability/rules/recording.rules.yml`). `promtool test rules` tests it under
`just observability-validate`.

**Why.** The host's `spacetime_num_bytes_sent_to_clients_total` counts a delta once, not once per
subscriber, so only a client's received bytes measure fan-out, and a bot that subscribes less than
the client under-counts it. The host series also holds each reducer's `Update` rows beside its
`Reducer` rows, and non-reducer transactions as one series with no reducer label. The rule's total
is therefore transaction-seconds per second and can exceed 1.0. It is a share by reducer, not a
utilisation.

**Rules out.** A host-side byte counter as the per-client budget signal; a driver whose
subscription differs from the client's; a CI load run that exits 0 on an invalid level.
```

### New entry: The official server is sized for 1,000 concurrent players over 100 zones

```markdown
## The official server is sized for 1,000 concurrent players over 100 zones

**Decision.** The operator set the official server's population target on 2026-11-12 (the
harness's `game-design.md` §14). The world has up to about 100 zones. A zone holds 8–12 players
on average, and about 50 in a few zones. The world holds about 600 concurrent players on average
and about 1,000 at peak. It stores 50,000 accounts; that count is a default, not an operator
figure. The budgets every population-scaled cost is held
to are:
- a zone tick's p95 under `STEP_MS`;
- input round-trip p95 under 50 ms;
- download under 20 KB/s per client;
- the reducer thread under 50% at a 30% walking share.

The run of record is `mr_load_driver` against `just load-host`: 1,000 clients over 100 zones, one
zone filled to 50, 30% walking. A breached budget becomes a follow-up. Revisit the target if the
game outgrows it.

**Why.** Single-player and private worlds run on a player's own machine and are budgeted in
`docs/local-play.md`. Only the official server holds many players, so it alone sizes scaling work.
A client's download follows the walkers in its subscription scope: about 0.85 KB/s plus 0.077 KB/s
per walker, measured in one zone up to 100 walkers. By that line the 20 KB/s budget is reached near
220 walkers in one zone; that figure is extrapolated, not measured. The reducer thread is one writer
for the whole world. The target also sets `battle_summary`'s cap and the leaderboard's rescan size.

**Rules out.** Sizing scale work from playtest populations, where 2–5 players hide every such cost;
a per-input, per-batch or per-join cost that grows with stored accounts or monsters owned.
```

### Amendment: Integer pixel scaling

The entry is rewritten in place. Three changes:
- At the end of **Decision**, append:

  ```markdown
  Terrain chunk textures bake at resolution 1 with nearest sampling at every device scale
  (`client/src/render/terrainLayout.ts` `CHUNK_TEXTURE_OPTIONS`). The integer device scale upsamples
  each texel to a whole number of device pixels, so a device-scale change re-bakes nothing; a
  context restore still re-bakes.
  ```
- At the end of **Why**, append:

  ```markdown
  A chunk baked at the device scale costs 4 KB × scale² per tile, about 165 MB for today's zone on a
  4K display. At resolution 1 it costs 4 KB per tile, about 10 MB.
  ```
- The **Rules out.** paragraph becomes:

  ```markdown
  **Rules out.** Fractional device scales; fitting the map by stretching; baking terrain at the
  device scale, or re-baking it when the device scale changes.
  ```

### Amendment: The leaderboard is a membership table that the client joins

The entry is rewritten in place. Two changes:
- In **Why**, "2,440,224 bytes at 50,002 profiles" becomes "2,440,223 bytes at 50,002 profiles", the figure in `sr-4b`'s transcript (#819: `subscribeBytes=2440223`).
- In **Decision**, after the sentence ending "so the own row survives leaving the top 100.", insert:

  ```markdown
  The client ranks the rows it holds (`ui/leaderboardModel.ts` `buildLeaderboardViewModel`). It
  shows the top `LEADERBOARD_TOP_K` with their ranks, and when the caller is not among them, it adds
  the caller's own row marked `100+` (`RANK_BELOW_TOP_K`). The client holds no profile below the top
  100, so a true rank there cannot be computed.
  ```

### Game citations of the deleted spec
Four game files cite `specs/monster-realm-v2/M-scale-readiness.spec.md` in `SOURCE OF TRUTH` test comments: `client/e2e/ui-social.spec.ts:799`, `client/src/net/connection.runtime.test.ts:1310`, `server-module/src/content_tests.rs:2972` and `server-module/src/ranking_tests.rs:1173`. Two more name the milestone and a slice without the file: `game-core/src/load_test_zones_tests.rs:1` and `server-module/src/load_dev_tests.rs:1`. Game tests already cite closed specs in the same way (for example, `M-trade-sessions.spec.md` ×7). The supervisor's game doc PR can repoint them to the entries above if it chooses. They are listed here, not edited.

touches-delta: none
boyscout-delta: none
plan-delta: fold and harvest ran through `mr-gates`'s `cmd_notes` with `_specs` pointed at this worktree, because the CLI hard-codes the main checkout's `specs/`, which a run must not edit. The PLAN gate line now names the unmet run of record instead of the milestone, because the milestone is built but its DoD item is not.
comment-scan: CLEAN
Items: none

## Acceptance
Acceptance: 7/9 met, 2 deferred, 0 unmet — close-M-scale-readiness seed:e3b0c44298fc1c14
Deferred: X8 -> backlog — the 1,000-client run of record was never run (sr-9b #812 not-verified); run `just load-host` + mr_load_driver --clients-max 1000 --zones 100 --hot-zone 50 --walking-share 30 and file a follow-up per breached budget; due before any playtest above ~20 concurrent players and before the official server opens
Deferred: X9 -> backlog — no master nightly has run since sr-9c added load-smoke; the next scheduled run (cron 07:17 UTC) on a master holding 84e3cd96 settles it; a red job there is a ci-fix

Gate: `memory/projects/mr-selfcheck` → SELFCHECK-OK. Each PLAN, deletion and citation probe (X3, X4, X6) fails when pointed at `origin/main`, so the checks have teeth. No `mr-*` tool was touched or added, so no `--selftest` is owed. `just ci` rc=0, which is not the gate.

## Risks
- `M-local-play.spec.md:155` (§Notes) still lists "`battle_summary` never reaped (`M-scale-readiness` SR7)" and "the device-resolution terrain bake (SR8)" as costs. `sr-7` and `sr-8` removed both. The line names the milestone, which §Built still resolves, not the deleted file. `mr-touches` refuses to widen to a spec file (`TOUCHES-REFUSED … gate or loop-control file`). M-local-play is now §9's head, so its elaboration rewrites that §Notes line.
- `raising::heal_party` still reads the party through `owner_identity` and drops Storage rows (`server-module/src/raising.rs`, step 7). It is once per heal, not per input, so the party-index draft scopes its rule to per-input and per-tick paths. Routing it through `owner_party` would be a one-line game change; it is not filed as a row because no budget measures heal cost.
- The run of record (X8) and a master nightly that holds the milestone (X9) are unverified. The scaling code shipped against extrapolated numbers.
- The four new entries plus two amendments sit at the top of the bar's "a few entries per milestone". The supervisor may merge the load-tool and population-target entries if it prefers fewer.
- The drafts reach the game repo only when the supervisor ships them. Until then, these rules live in code comments and in the folded notes, which are now in git history only.

not-verified: the drafted entries' wording and length were not checked by the game's doc gates. Those gates run on the supervisor's game PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
