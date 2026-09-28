# Spec: M2 — The server brain (SpacetimeDB module, zoned)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0 (gates), M1 (movement core)
**Decisions:** ADR-0002 (SpacetimeDB 2.x), 0003 (shared core), 0006 (schema evolution + content-sync),
0007 (zoned subscriptions/tick), 0009 (CI), 0010 (proof-of-teeth), 0011 (server-paced movement),
0013 (netcode smoothness — transaction atomicity + soak). See `netcode-quality-review.md`.
**Workflow:** harvest v1 M2 chapter → plan/design → draft → review/red-team (see §7). Test-first: §3 is the
source for the `tester`; reducers stay thin so correctness lives in the M1 `game-core` rule + the
sim-harness, sidestepping SpacetimeDB's weak in-module test harness.

## 1. Problem / intent

Stand up the **authoritative backend**: the tables that hold the world's truth and the **reducers** (the
only things allowed to write them), so a character moves but the **server** decides every move, at a fixed
pace, **per zone**, by calling the M1 `game-core` rule. This is the imperative shell on the server side —
it owns state and effects; `game-core` owns rules; they meet in thin reducers. v2's M2 improves on v1 in
three structural ways: the movement tick is **per-zone from day one** (not a global O(all-rows) loop),
netcode is **tested headlessly in CI** via the sim-harness (not deferred to local e2e), and the
schema/bindings/security disciplines are **mechanical gates** (not review notes). Success = a living,
authoritative, zoned world with no eyes yet (the client is M3/M4), proven by reducer + netcode tests.

## 2. Scope

**In scope (`server-module/` + bindings + sim-harness)**
- **Tables** (additive, ADR-0006; every world table carries an **indexed `zone_id`**, ADR-0007):
  - `character` (public): `entity_id` (pk, auto_inc), **`zone_id` (`#[index(btree)]`)**, `tile_x`,
    `tile_y`, `facing: Direction`, `action: ActionState`, `move_started_at_ms: i64`, `sprite_id`,
    `move_queue: Vec<MoveInput>` (bounded). The enum/queue columns are the **exact M1 `game-core` types**
    (SpacetimeType under the `spacetimedb` feature) — the shared type *is* the schema, never re-declared.
  - `player` (public): `identity` (pk = `ctx.sender`), `entity_id` (indexed), `name`, `online`,
    `last_input_seq` (reconciliation ack — **never trusted for authority**).
  - `config` (public singleton) and `movement_tick_schedule` (`scheduled(movement_tick)`, carrying
    **`zone_id`** so the tick is per-zone).
- **Lifecycle/presence reducers:** `init` (seed config, insert one schedule row per initial zone, call
  `sync_content`), `client_connected` (minimal), `client_disconnected` (delete the caller's `player` **and**
  `character` rows), `join_game` (validate name, reject double-join, insert `player` with `online = true`
  and `last_input_seq = 0` + `character` at `game_core::spawn()` in zone 0). Presence = the `player` row
  exists; `online` is reserved for a future tabbed-out/reconnect state and is `true` while present at M2.
- **Observability & performance** (ADR-0029): every reducer emits a structured (JSON) error log
  (level/reason/correlation id, fail-loud) **and RED metrics** (rate/errors/duration) through the M0 OTel
  seam; the **per-zone tick** emits a duration metric and has a **criterion benchmark + perf budget**
  (`< STEP_MS`, scaling O(chars-in-zone)) plus a **sim-harness concurrency/load test** (N clients in a zone).
  The per-zone subscription fan-out emits a size metric.
- **Thin move reducers** (intent only): `enqueue_move(input, seq)`, `set_move(input, seq)`, `clear_queue(seq)`
  — ownership- + monotonic-`seq`-validated; they buffer intent and **never** compute movement.
- **Per-zone scheduled `movement_tick`**: drains ≤1 move per character in its zone, calls
  `game_core::apply_move(now = ctx.timestamp → Millis)`, writes back; scheduler-only guarded.
- **`sync_content`** reducer (idempotent, ADR-0006), separate from `init` (content minimal at M2).
- **TS bindings** regenerated into `frontend/src/module_bindings/` (committed, **drift-gated**, never hand-edited).
- **sim-harness netcode suite** (ADR-0009, `domain/game`): headless multi-client over the published module
  with injected latency/loss/reorder → convergence, server-paced rate limit, zoned isolation, replay-determinism.
- **Migration smoke-test** (additive republish preserves `character` data) + schema-snapshot eval.
- The **reducer-security-auditor** eval (M0) extended to the new reducers.

**Out of scope (named deferrals)**
- **Client prediction / reconciliation / rendering / input** → M3/M4 (M2 has no eyes).
- **NPCs (`npc` entity + `npc_decide` + wander)** → **M12** (NPCs/dialogue). The entity/component split
  makes them a later additive role row; the sim-harness + two-window e2e cover multi-entity movement
  without them, so building them now is speculative (supersedes M1 rev3's tentative "npc → M2").
- **Monsters / battles / items / RLS-filtered owner-scoped tables / private `encounter` table** → M6+.
- **Cross-zone warps + a second authored zone + per-zone *subscription* wiring on a client** → M11/M4
  (the schema is ready — indexed `zone_id` — so these are queries/data, not migrations).
- **Two-window browser e2e** → M5 (M2's integration testing is headless via the sim-harness).
- **Inter-entity collision** (characters blocking each other) is a **deliberate non-goal**: movement uses
  map walkability only, so multiple characters may share a tile (avoids MMO grief-blocking and keeps
  `apply_move` independent of other entities — it stays a pure `(state,input,map,now)` function).
  Revisit only if a design need appears.

## 3. Acceptance criteria (EARS)

**Schema & shared types**
- WHEN the module is published THE SYSTEM SHALL define the `character` and `player` tables as above, with
  `character.facing/action/move_queue` using the exact M1 `game-core` types (no re-declaration).
- IF a world table lacks an indexed `zone_id` THEN the architecture eval SHALL fail (ADR-0007).
- IF a schema change is non-additive on a non-event table THEN the schema-snapshot eval SHALL fail (ADR-0006).

**Join / presence / identity**
- WHEN `join_game(name)` is called by a new identity THE SYSTEM SHALL validate the name (length + charset),
  insert exactly one `player` (`identity = ctx.sender`, `last_input_seq = 0`) and one `character` at
  `game_core::spawn()` in zone 0, and SHALL reject a second join from the same identity with `Err`.
- IF a reducer accepts an identity as an argument THEN the security-auditor eval SHALL fail (identity comes
  only from `ctx.sender`).
- WHEN a client disconnects THE SYSTEM SHALL despawn its `character` and clear its presence.

**Move intent (thin reducers — ADR-0011)**
- WHEN `enqueue_move(input, seq)` is called by the character's owner with a non-full queue and
  `seq > last_input_seq` THE SYSTEM SHALL append `input` and set `last_input_seq = seq`, and SHALL NOT move
  the character.
- IF the queue already holds `MOVE_QUEUE_CAP` entries THEN `enqueue_move` SHALL reject with `Err`
  (anti-flood; never silently drop/clamp — Postel inverted).
- IF `seq ≤ last_input_seq` THEN any move reducer SHALL reject with `Err` (monotonic ack; defends
  replay/reorder; never used for authority).
- IF the caller does not own the target character THEN any move reducer SHALL reject with `Err`.
- THE SYSTEM SHALL provide `set_move` (replace the **entire** un-drained queue with the single new input —
  a responsive turn/direction change) and `clear_queue` (empty the queue — key release), each ownership- +
  monotonic-`seq`-validated; neither lets `move_queue` exceed `MOVE_QUEUE_CAP`.
- IF any move reducer computes a position/facing/action outcome itself (instead of only buffering intent)
  THEN review/the desync eval SHALL fail.

**Reconciliation contract (the M2→M3 coupling — ADR-0003/0011)**
- THE SYSTEM SHALL set `last_input_seq` at the moment an input is **accepted into the queue** (it means
  "received," not "applied"), so the client can confirm receipt before the paced tick drains the move.
- THE SYSTEM SHALL keep `character.move_queue` on the **public** row, so the owner's client reconciles its
  prediction against the authoritative tile/facing/action **plus the server's still-undrained `move_queue`**
  (then replays its own un-acked inputs). Exposing intent (directions) is not sensitive.
- WHEN a move reducer rejects (full queue / stale `seq`) THE SYSTEM SHALL treat it as **normal flow
  control**, not a surfaced error: the client flow-controls against `MOVE_QUEUE_CAP` so it never overflows,
  and reconciliation absorbs any rejection (unlike the user-facing action reducers in later milestones).

**Per-zone tick (server-paced, zoned)**
- WHILE the module runs THE SYSTEM SHALL invoke `movement_tick` once per `STEP_MS` **per active zone** via
  an interval-scheduled table whose row carries `zone_id`.
- WHEN `movement_tick` runs for a zone THE SYSTEM SHALL process only that zone's characters (via the
  `zone_id` index), drain at most one queued move per character, compute the outcome by calling
  `game_core::apply_move` with `now` derived from `ctx.timestamp`, and write the result back.
- WHEN a character's queue is empty at its tick THE SYSTEM SHALL set its `action` to `Idle` if not already.
- WHEN `movement_tick` iterates THE SYSTEM SHALL snapshot entity ids before mutating (never mutate the
  table mid-iteration).
- IF `movement_tick` is invoked by a sender other than the module identity THEN THE SYSTEM SHALL reject
  with `Err` (scheduler-only guard; on STDB 2.x scheduled reducers are private by default, so this is
  belt-and-suspenders — confirm the module-identity accessor against the pinned version's docs).
- WHEN a client issues N `enqueue_move` calls within one `STEP_MS` THE SYSTEM SHALL still advance the
  character by at most one tile that tick (rate limit lives in the cadence, not a per-call cooldown).
- IF any movement outcome is computed outside `game_core::apply_move` (in a reducer or TS) THEN the desync
  eval SHALL fail (SSOT).

**Init, content-sync & migration (ADR-0006)**
- WHEN the module initializes THE SYSTEM SHALL, in `init`, seed the `config` singleton, insert one
  `movement_tick_schedule` row per initial zone (`ScheduleAt::Interval(STEP_MS)`), and call `sync_content`.
- WHEN `sync_content` is called on republish THE SYSTEM SHALL upsert content by stable id idempotently (no
  row churn on unchanged content).
- WHEN the module is republished with additive schema changes over existing data THE SYSTEM SHALL migrate
  automatically without data loss (migration smoke-test on `character`).

**Bindings (ADR-0009)**
- IF committed `frontend/src/module_bindings` differ from a fresh `spacetime generate` THEN the
  bindings-drift gate SHALL fail; generated bindings SHALL NOT be hand-edited.

**Netcode (sim-harness; `domain/game`; ADR-0009)**
- WHEN headless clients drive the published module under injected latency/loss/reorder THE SYSTEM SHALL
  keep every client converged to the authoritative `character` rows (no-desync netcode test in CI).
- WHEN two characters occupy different zones THE SYSTEM SHALL process each only by its own zone's tick
  (zoned-isolation test) and a zone's tick cost SHALL scale with that zone's character count, not the world's.
- WHEN a fixed reducer/input sequence is replayed with the same seed THE SYSTEM SHALL reach identical final
  state (replay-determinism).
- WHEN thousands of randomized move ops are driven under injected latency/loss/reorder (a **soak** run)
  THE SYSTEM SHALL leave every client converged to authority with no permanent desync (ADR-0013 §F — a
  convergence regression net beyond the scripted scenarios).
- WHEN N concurrent clients move within one zone (a **load** run; ADR-0029) THE SYSTEM SHALL keep the
  per-zone `movement_tick` duration within its budget (`< STEP_MS`) and subscription fan-out bounded by the
  zone population; IF the tick benchmark regresses beyond budget THEN CI SHALL fail (the always-on perf gate).

**Transaction atomicity for client reconcile (ADR-0013 §B)**
- WHEN a reducer updates fields a client reconciles together THE SYSTEM SHALL write them in **one
  transaction** — `enqueue`/`set_move` update `move_queue` **and** `last_input_seq` atomically; the tick
  updates `character` position **and** `move_queue` atomically — so a client consuming a per-transaction
  snapshot never observes a half-updated `(ack, queue, position)` (the rubberband race). The client-side
  atomic *consumption* is M3/M4; M2 guarantees the server-side atomic *production*.

**Observability (`observability.md`)**
- WHEN any reducer returns `Err` THE SYSTEM SHALL emit one structured (JSON) log line with level + reason
  and SHALL NOT silently swallow it.

**Security auditor (M0 eval, extended) + proof-of-teeth (ADR-0010)**
- THE SYSTEM SHALL pass the reducer-security-auditor eval: identity only from `ctx.sender`; outcomes from
  intent only (no client-supplied position ever accepted); every reducer re-validates ownership + legality
  against authoritative state; reject-not-clamp; scheduler-only guard present; names validated; no
  `panic`/`unwrap` on reachable paths; no mutable globals.
- THE SYSTEM SHALL exercise every reject path (not-owner, stale-`seq`, full-queue, scheduler-only) through
  **sim-harness reducer tests** that drive the published module and assert `Err`, since SpacetimeDB's
  in-module test harness is weak — validation branches are security-critical and must be tested, not just
  statically audited.
- For each new gate/invariant THE SYSTEM SHALL ship a proof-of-teeth fixture: an identity-from-arg reducer
  fails the auditor; a **direct client call to `movement_tick` is rejected** (scheduler guard bites
  regardless of 2.x default-privacy); a cross-zone tick leak fails the isolation test; a queue-overflow-
  clamps variant fails the reject-not-clamp check.

## 4. Plan (high level)

Thin imperative shell over the M1 pure core. Table + reducer sketch (contract-level):

```rust
#[spacetimedb::table(name = character, public)]
struct Character { #[primary_key] #[auto_inc] entity_id: u64,
                   #[index(btree)] zone_id: u32,
                   tile_x: i32, tile_y: i32, facing: Direction, action: ActionState,
                   move_started_at_ms: i64, sprite_id: u32, move_queue: Vec<MoveInput> }

#[spacetimedb::table(name = player, public)]
struct Player { #[primary_key] identity: Identity, #[index(btree)] entity_id: u64,
                name: String, online: bool, last_input_seq: u64 }

#[spacetimedb::table(name = movement_tick_schedule, scheduled(movement_tick))]
struct MovementTickSchedule { #[primary_key] #[auto_inc] id: u64, zone_id: u32, scheduled_at: ScheduleAt }

// reducers (thin): init · sync_content · client_connected · client_disconnected · join_game(name)
//                  enqueue_move(input, seq) · set_move(input, seq) · clear_queue(seq) · movement_tick(sched)
```

Key mechanics & contracts:
- **`convert` seam** — a thin module-local mapping flattens `game-core::CharacterState` ↔ `character`
  columns (`char_state(&row)` / `apply_state(&mut row, &next)`); the shared types stay the SSOT while the
  table stays queryable/indexable. This boilerplate is *intentionally* repetitive (DRY does not cross the
  marshaling boundary).
- **Server-paced, zoned tick (ADR-0011)** — clients buffer intent; the per-zone scheduled reducer drains
  one move/character/tick and calls `apply_move`. Rate-limit = cadence × `MOVE_QUEUE_CAP`, not a cooldown.
  Iterate by snapshotting `entity_id`s for the zone first, then mutating.
- **Security (client is hostile)** — identity only from `ctx.sender`; intent-only (no position accepted);
  monotonic `seq`; reject-not-clamp; scheduler-only guard. These are the reducer-security-auditor's checks.
- **Time** — `now = ctx.timestamp → Millis` (i64 ms, M1 decision); `game-core` never reads a clock.
- **Version-sensitive (confirm vs pinned-version docs before coding):** scheduled-reducer privacy +
  module-identity accessor name (2.x changed these), `ScheduleAt` interval API, RLS syntax, automigration
  semantics. Pin the `spacetimedb` crate to the installed CLI (ADR-0002).

**Boundary preview — what M3 (client-wasm prediction) will consume:**
- The generated bindings for `character`/`player`/`MoveInput` and the `enqueue_move`/`set_move`/`clear_queue`
  reducers (each takes `seq`).
- The **reconciliation protocol** (M2 provides the two server-side inputs it needs): on each authoritative
  own-row update the client (1) drops pending ops with `seq ≤ last_input_seq`, (2) resets to the
  authoritative tile/facing/action, (3) replays — on top of the server's still-undrained **`move_queue`** —
  its own un-acked ops via the same `apply_move`, (4) re-drains to now. So M2 must expose `move_queue` on
  the public row and ack at accept-time (both criteria above). The reconcile returns whether the corrected
  tile diverged (true only on a genuine server disagreement) so the loop can re-issue a held key — a real
  v1 edge case, captured at M1.
- The client **flow-controls** against `MOVE_QUEUE_CAP` (`server move_queue.len + pending < cap`) so the
  server never rejects it for a full queue; move-reducer rejections are normal flow control, not surfaced.
- `STEP_MS` for client pacing; the authoritative `character` row as reconcile target; `move_started_at_ms`
  is bookkeeping the reconciler ignores (M1 contract).

## 5. Tasks (vertical slices — M2a substrate, then M2b netcode)

**M2a — authoritative zoned movement loop**
- [ ] `character` (indexed `zone_id`) + `player` tables using the M1 shared types; schema-snapshot baseline.
- [ ] `convert` seam (`char_state`/`apply_state`) + unit tests.
- [ ] `init` + `config` + per-zone `movement_tick_schedule` insert + `sync_content` wiring.
- [ ] `join_game` (name validation, single player+character at `spawn()`), `client_disconnected` cleanup.
- [ ] `enqueue_move`/`set_move`/`clear_queue` (ownership + monotonic `seq` + cap; intent-only) — reducer tests.
- [ ] per-zone `movement_tick` (snapshot-then-drain-one, `apply_move`, idle-on-empty, scheduler-guard).
- [ ] `spacetime generate` bindings committed + bindings-drift gate green.
- [ ] reducer-security-auditor eval extended + proof-of-teeth fixtures.

**M2b — netcode & evolution proof**
- [ ] sim-harness: headless multi-client over the published module; latency/loss/reorder injection.
- [ ] netcode tests: convergence/no-desync, server-paced rate limit, zoned isolation, replay-determinism (CI).
- [ ] migration smoke-test (additive republish preserves `character` data).
- [ ] doc-keeper: changelog + memory; link M2 in `ARCHITECTURE.md`.

## 6. Risks / decisions

- **STDB version-sensitive APIs** — scheduled-reducer privacy + module-identity accessor, `ScheduleAt`,
  automigration. Confirm against the pinned version's docs before coding; keep the scheduler guard as
  belt-and-suspenders even if 2.x makes it private by default. (ADR-0002 condition.)
- **NPCs deferred to M12** (supersedes M1 rev3's tentative "npc → M2") — the entity/component split keeps
  them a cheap additive role row; multi-entity movement is covered headlessly without them.
- **`last_input_seq` included now** though only M3 consumes it — adding it later is a schema + reducer-
  signature change; cheap-now/expensive-later, like the `zone_id` index. Never trusted for authority.
- **Platform maturity** — ADR-0002 already weighed SpacetimeDB vs a Node/Postgres+WS stack ("trading
  maturity for fit"); the tutorial's own verdict agrees. No re-litigation here.
- **sim-harness vs e2e** — the sim-harness is headless/fast (every CI run); the two-window browser e2e
  (M5) covers the real client. No duplicated coverage.
- **Tick safety & cost** — the per-zone `movement_tick` must be safe under SpacetimeDB reducer
  re-execution (errors-as-values, no mutable globals, time/RNG only from `ctx`); reducers are serialized so
  ticks never overlap. Per-zone scheduling bounds each tick to its zone's character count; a tick that
  exceeds `STEP_MS` is the *measured* signal to split a zone — now *measured* by the tick benchmark + the
  concurrency/load test + the prod tick-duration metric (ADR-0029), not just asserted (don't pre-optimize).
- **No inter-entity collision at M2** (map-only walkability) — a deliberate non-goal (see §2), revisitable.
- Open: exact `sprite_id` scheme and `config` fields → minimal at M2, grown later.

## 7. Review / red-team notes

### Netcode-quality review (ADR-0013)
Added a **soak** convergence netcode test (thousands of randomized ops under jitter) and pinned
**server-side transaction atomicity** — `enqueue`/`set_move` write `move_queue` + `last_input_seq`
together, the tick writes position + `move_queue` together — so the M3/M4 client can reconcile on a
coherent per-transaction snapshot and never rubberband on a half-updated world. See `netcode-quality-review.md`.

### Pre-M3 hardening (reviewer + red-team + simplify)
Read the v1 prediction/reconciliation chapter to pin the M2→M3 contract, then applied:
- **Reconciliation contract (the key M3 coupling):** `last_input_seq` is an **accept-time** ack and
  `character.move_queue` is **public**, so the client reconciles against authoritative state **+ the
  server's remaining queue** + its un-acked replay. Promoted to explicit criteria + an expanded M3 boundary
  preview (the 4-step reconcile, flow-control, divergence-return).
- **`set_move` precision** — replaces the *entire* un-drained queue with one input (responsive turn); cap-safe.
- **Move-reducer rejections are normal flow control** (queue-full/stale-`seq`), absorbed by reconciliation —
  not surfaced (unlike later action reducers).
- **Reject paths exercised by the sim-harness** (not-owner/stale-seq/full-queue/scheduler) + a proof-of-teeth
  fixture that a **direct `movement_tick` call is rejected** (guard bites regardless of 2.x privacy).
- **Observability** — structured fail-loud logs on every reducer `Err`; OTel/RED seam reserved (load-gated).
- **Explicit non-goal: no inter-entity collision** (map-only walkability; keeps `apply_move` entity-
  independent). **Presence semantics pinned** (`player` row = presence; disconnect deletes player+character).
- **Tick safety/cost** noted (re-execution-safe; per-zone cost-bound; over-`STEP_MS` tick = split-a-zone signal).
- **ADRs/plans:** added one consequence to ADR-0011 (accept-time ack + public queue feed reconciliation);
  no new ADR (these refine within ADR-0003/0007/0011); the full reconcile *protocol* is an M3 decision
  (candidate ADR-0012 at M3). PLAN unchanged (M2 line already points here).

### Tutorial harvest (`tutorial-DrEnc_Nk.js`, M2 chapter)
Adopted: tables-as-structs with shared `game-core` enum columns; thin-reducer discipline ("no game rules
here"); the monotonic-`seq` guard; the scheduled-reducer heartbeat + `ScheduleAt::Interval`; `init`/
presence/`join_game` with `identity: ctx.sender`; `spacetime generate` bindings (never hand-edit). v2
upgrades the v1 design: **per-zone tick** (v1's was global `character().iter()` over all rows — v1 even
flagged the missing `zone_id` index as "the cheap unlock"; v2 indexes + filters from row one), **netcode
tests in CI** via the sim-harness (v1 had none — e2e was local-only), and the bindings/schema/security
disciplines become **mechanical gates** (v1's recurring "contract left to discipline" class).

### Red-team
- **Mutate-while-iterating** the `character` table corrupts the tick → snapshot ids first (explicit criterion).
- **Scheduler reachability** — guard `ctx.sender == module identity`; verify 2.x privacy + accessor name.
- **`seq` as an authority vector** — it is ack-only; rejected when stale; never decides an outcome.
- **Cross-zone tick leak** — the isolation netcode test + proof-of-teeth fixture catch a tick that touches
  another zone's rows.
- **Clamp-instead-of-reject** on a full queue — explicit reject-not-clamp criterion + fixture.

### Simplify
Deferred NPCs (M12), monsters/RLS/private tables (M6+), warps/2nd zone (M11), and the browser e2e (M5).
M2 stays the thin authoritative loop; all game logic remains the single M1 `apply_move`.
