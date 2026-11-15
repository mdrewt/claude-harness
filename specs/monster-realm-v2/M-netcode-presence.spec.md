# Spec: M-netcode-presence — remote-player smoothness + turn in place

**Status:** elaborated 2026-11-14 (from the 2026-10-24 sketch) against game `master` `4ba7aa45`
(after lpg-0). lpg-10 (game PR #777, open) edits `client/src/main.ts` and
`client/src/observability/config.ts`; it is treated as landed first, and no np- slice edits the
telemetry or token lines it changes. · **Project:** monster-realm · **Slices:** 5 — `np-a`,
`np-c1`, `np-d` start in parallel; `np-c2` after `np-a` and `np-c1`; the study `np-b` last. Anchors are symbols, never line numbers.

**Feedback items:** pt3-2026-10-158 (remote players pause on every tile) → `np-a`, with the supply
side studied in `np-b`; pt3-2026-10-159 (continue the last walk for a short window, then idle —
the operator's ruling) → `np-a`; pt3-2026-10-165 (face a direction without moving; a tap turns,
a press you already face steps) → `np-c1` + `np-c2`.
**Absorbed residuals:** R-weekly-review-2026-10-02-F1 → `np-d` (criterion `np-d.1`, the sketch's
NPD.1); R-weekly-review-2026-10-23-F2 → `np-d` (criterion `np-d.2`, the sketch's NPD.2). The two
stay bundled, as `M-trade-sessions.spec.md` routes them: two contained fixes that share no file
with any other slice.
**Cross-links, not absorbed:** R-ctl-RUN (walk speed, hold-to-run) is feel tuning after this
milestone.

## Problem

**Remote walkers pause on every tile (158).** Measured on `4ba7aa45`:
- The own client sends one step at a time. Both held-key continuation emitters in `main.ts` (the
  frame loop's world step and the `reconcileFromStore` divergence branch) wait for
  `predictor.outstandingSteps === 0` and `owed.count === 0`.
- `movement_tick` (`server-module/src/movement.rs`) drains one input per character per tick.
  When a tick finds the queue empty, `publish_standing` writes `action = Idle` on the public
  `character` row at the same tile.
- So a walker's public row stream is a position change, then often a same-tile Idle write, then
  the next position change.
- `AuthoritativeStore.upsertCharacter` (`client/src/net/store.ts`) appends every row update to
  the snapshot ring, the Idle write included. `interpolateHistory`
  (`client/src/render/interpolation.ts`) therefore brackets B→B, draws the walker standing for
  that interval, and then holds at the newest snapshot ("never extrapolate").
- Every gap shows as a stop. `RenderResolver.resolve` (`client/src/render/renderResolver.ts`)
  also hands the renderer `c.row.action`, so the sprite plays the idle animation during the
  transient Idle.

**No turning in place (165).** `game_core::apply_move` (`game-core/src/world.rs`) handles
`MoveInput::Step(dir)` by turning and moving in one input. `MoveInput` has `Step` and `Jump`
only, and the router's `dirDown` arm in `main.ts` (`applyRouterEffect`) sends `Step` on every
press. `game_core::interact_candidates` targets `pos.step(facing)`, so today the only way to
face a tile is to step.

**Absorbed defects.** The `movement_tick` drain lock keeps a battler's `move_intent.queue`
intact, and no client calls `clear_queue`. Steps queued before a battle therefore run after it
ends (F1). `reconnectPolicy.onDisconnected` (`client/src/prediction/reconnectPolicy.ts`) does
nothing when the link is `reconnecting`, and `onConnected` (the only reset) runs on the first
applied subscription. A socket that opens and then drops before that point never climbs the
backoff ladder: the client retries a restarting host at a fixed 1 s (F2).

## Scope

In:
- Bounded continued-walk extrapolation on the remote render arm only (`np-a`).
- A turn-or-step press input as one game-core rule, carried on the existing movement reducers
  (`np-c1`), and the client press path that sends it (`np-c2`).
- The server dropping a battler's queued moves at battle start, and the reconnect backoff
  climbing on open-then-drop (`np-d`).
- A send-pipeline depth study with a go/no-go and no behaviour change (`np-b`).

Named deferrals:
- **A send-depth change** → the follow-up slice `np-b` names if its record says go. No depth
  change merges on study evidence alone.
- **Walk speed, hold-to-run, `STEP_MS` and `HOLD_COMMIT_MS` retuning** → R-ctl-RUN, after this
  milestone.
- **The turn pause when changing direction mid-walk.** A press of a direction you do not face
  turns first, mid-walk included. Whether to soften this is a feel question for the next §10
  playtest; it is reversible in the one game-core rule.
- **NPC wander cadence and the NPC conversation freeze** → M-pt3-quickfix (built). This milestone
  does not change NPC rules. NPCs step once every `NPC_STEP_TICKS` (5) ticks, which is longer
  than the continuation window, so no NPC is ever extrapolated.
- **Remote zone-warp prediction** → wontfix (standing ruling: only the server resolves a warp).
- **`apply_move_coded` covering `Face`** → wontfix. The coded helper exists only for the
  movement-parity eval of `Step`/`Jump` (`input_kind != 0` is `Jump`). The predictor uses the
  serde path `apply_move`, which `np-c1.7` covers with the real wasm.
- **Reconnect delay jitter, and a host that applies the subscription and then drops** (each
  reconnect restarts at the first rung) → backlog, tracked as residual `R-np-d-NOTE58586B` (a note on
  `np-d`). `np-d` fixes only the frozen rung.
- **Help text for turning in place** → none. Turning needs no new control, so no string is added
  (en+fr untouched).

Non-goals: own-player prediction changes (epoch guard and send-seq floor, own-path divergence snap,
`MOVE_QUEUE_CAP`, op replay — unchanged), interest management, transport changes.

## Prior rulings that bind

- **Operator, item 159.** It supersedes "hold rather than extrapolate" for the REMOTE render path
  only. The server stays the truth, the window is short and keyed to update recency, and the
  character then settles to idle.
- **ADR-0148 (nh2).** No step is sent and then cancelled on keyup: turning is its own input
  before the first step. **ADR-0146 (nh1).** `e.repeat` stays ignored; D-pad edges stay
  refcounted; every push of a non-base frame clears the held set.
- **ADR-0152 / ADR-0141.** Remote smoothing is render-side: no change to predictor epoch or seq,
  or to the own-path snap.
- **Rules once.** When a press turns and when it steps is decided in `game-core`, evaluated by
  the server tick and by the predictor's wasm `apply_move` from the same code.
- **Additive schema, generated bindings.** `MoveInput` is a positional `SpacetimeType` stored in
  `move_intent.queue` and `character.move_queue`. A new variant is tail-appended (the
  spacetime-type snapshot gate enforces it), and the bindings are regenerated, never hand-edited.

## Decisions (reversible; documented defaults — no operator question)

- `decision-defaulted:remote-idle-debounce=store-ring-skips-same-tile` — the debounce lives in the
  store, so the ring can supply the last position changes:
  - `AuthoritativeStore.upsertCharacter` replaces the row on a same-tile update (`facing` and
    `action` stay current), but appends no snapshot and takes no jitter sample;
  - the stored character records the arrival time and direction of its last two position
    changes;
  - the 4-deep ring therefore holds four distinct tiles of a walk, as the `remote-walk.spec.ts`
    header already intends. Today a same-tile write fills half of it.
- `decision-defaulted:remote-continuation-window=JITTER_IDLE_GAP_STEPS*STEP_MS` — 600 ms at
  `STEP_MS` 200, on the wall clock, from the arrival of the newest position change. It reuses the
  existing idleness threshold. Continuation runs only once the render clock (`now − adaptive
  delay`) passes the newest snapshot. The adaptive delay therefore covers what it can, and
  continuation covers only the rest of the window. With the debounce, a walker whose steps come
  two `STEP_MS` apart has a jitter estimate near `STEP_MS`, its delay reaches the 2.5-step cap, and
  plain interpolation already brackets it. Continuation is for late arrivals, not for every gap.
- `decision-defaulted:remote-continuation-predicate=two-same-direction-steps-in-window` —
  continuation needs all of these:
  - the remote's last two position changes are single-tile moves in the same direction;
  - they arrived at most one window apart;
  - the newer one arrived within the window;
  - no later row faces another way. A same-tile row whose `facing` differs from the walk
    direction (a turn, a `Face`, a bump into a wall at an angle) ends continuation at once.
  A lone step (a tap) and NPC wander (one step per `NPC_STEP_TICKS` = 5 ticks = 1000 ms, longer
  than the window) never extrapolate.
- `decision-defaulted:remote-continuation-bound=half-tile-and-walkable` — the sketch's two
  bounds, with a tighter cap:
  - continuation goes at most 0.5 tile (Manhattan) past the newest authoritative tile;
  - only toward an in-bounds tile the zone's game-core walkability data allows. The wasm
    `zone_map` grid, which `main.ts` already holds as `rawMap`, is injected into the resolver as
    a predicate.
  Half a tile, not the sketch's one: a stop is detected only when the window expires, so the cap
  is the backward correction every stop can show. Half a tile bridges a late arrival without
  turning each stop into a full-tile rubberband. The walkability bound stops a remote that walks
  into a wall: a straight bump writes a same-tile row with an unchanged facing, the same shape as
  a transient Idle write.
- `decision-defaulted:remote-continuation-speed=observed-cadence` — one tile per the interval
  between the last two position-change arrivals, clamped to [`STEP_MS`, window]. It is never
  faster than the server can move a character.
- `decision-defaulted:remote-render-state=per-entity-slew` — the remote arm keeps each remote's
  last rendered position and moves it toward the target (interpolated or continued) at no more
  than one tile per `STEP_MS`. A change of target therefore never jumps, including the handover
  when the next position change arrives during continuation and the re-anchor
  (`REANCHOR_SPAN_STEPS`) would otherwise put the render back on the previous tile. The state is
  dropped:
  - when the character leaves the store;
  - when it changes zone (the existing `shouldSnap` reset: the render snaps, as today);
  - on `RenderResolver.reset()`;
  - while reduced motion is on.
  The resolver's header ("owns ONLY the own SlideClock") changes with it.
- `decision-defaulted:remote-settle=slew-back-to-authority` — when the window expires, or a row
  contradicts the continuation, the render slews back to the authoritative path at the same
  speed limit, so a correction never snaps and is at most the 0.5-tile cap.
- `decision-defaulted:turn-transport=moveinput-face-variant` — `MoveInput::Face(Direction)`,
  tail-appended, on the existing `enqueue_move`/`set_move`. Its rule in `apply_move`:
  - when not facing `dir`, set `facing` to `dir`, keep the tile, set `action` Idle and stamp
    `move_started_at`;
  - when already facing `dir`, behave exactly as `Step(dir)`.
  Rejected:
  - a new facing reducer: a second intake path that needs its own battle lock, deletion gate and
    seq;
  - an extra reducer argument: it breaks the client-callable-reducers baseline and every caller;
  - changing `Step` itself: that changes NPC wander and the bump rule.
  Because the decision is made when the input drains, the server and the predictor's replay
  both judge it against the facing left by the inputs queued before it. The client never
  computes "effective facing".
- `decision-defaulted:turn-duration=one-movement-slot` — a turn takes one drain slot (`STEP_MS`)
  on the server and in the predictor. No new constant. `HOLD_COMMIT_MS` (150 ms) stays the
  client's hold threshold, but the continuation `Step` also waits for the `Face` to be
  acknowledged (the existing `outstandingSteps === 0` and `owed.count === 0` gates). In practice,
  then, a press turns only unless it is still held at the later of 150 ms and the `Face`'s
  acknowledgement, which is about one tick plus the round trip.
- `decision-defaulted:continuation-input=step` — held continuation and two-key fallback keep
  sending `Step(dir)`, which turns and moves in one input. Only a fresh press (`dirDown`)
  sends `Face`. The DEV hook `__game().step(dir)` keeps sending `Step`.
- `decision-defaulted:pre-battle-queue=server-drops-at-battle-start` — `start_wild_tactical` and
  `start_pvp_tactical` empty each battler's private `move_intent.queue` (seq unchanged) after
  their last fallible step. `start_wild_tactical`'s caller (`movement_tick`) swallows an `Err`,
  with no rollback, so a refused start must leave the queue as it was. The next tick publishes
  the empty queue through `publish_standing`, so the tick stays the only writer of
  `character.move_queue`. For one tick the public row still shows the queue the triggering tick
  published. The predictor may show that step and take it back as the battle overlay opens, which
  is accepted as cosmetic.
  Rejected: a client-sent `clear_queue` on battle push, because a stale or hostile client would
  keep the queue. The drain lock stays as defence in depth.
- `decision-defaulted:reconnect-climb=one-rung-per-attempt` — every attempt that ends without an
  applied subscription climbs exactly one rung. That covers a connect error, a drop after the
  socket opened, and both together, in either order. The policy marks an attempt that has already
  failed, so its second event does nothing. Every build path starts an attempt: the timer, the
  first boot, `reconnectNow` and `continueAnonymously`.

No `mr-ask-drew`: every choice above is reversible. The schema change is a tail-appended enum
variant, which the project's migration rule already permits.

## Contracts between slices

- **C1 (`np-c1` → `np-c2`):** the wire variant `MoveInput::Face` and its `apply_move` rule, plus
  the client marshaling and predictor support for it: `convert.ts` `WasmMoveInput`/`SdkMoveInput`
  and `Predictor.lastQueuedDir`. `np-c1` ships them with no client sender. Proof after merge:
  `np-c2`'s tap-to-turn e2e passes on `master`.
- **C2 (`np-a` → `np-c2`):** a remote's tap-turn arrives as a same-tile row with a new facing.
  Under `np-a`'s predicate it never starts continuation, and it ends any continuation in
  progress. Proof after merge: `np-c2.6`, a two-context check that a watcher renders a remote
  tap-turn without leaving its tile.
- **C3 (`np-d` ↔ predictor):** an authoritative queue emptied at battle start reconciles through
  the existing replay. Proof after merge: the manual playtest pass below, where a walk into tall
  grass that starts a battle does not continue when the battle ends.
- **C4 (`np-a`, `np-c2` → `np-b`):** the study measures the pipeline with both merged, so its
  numbers include continuation and the turn slot.

## Structure

`client/src/main.ts` is edited by `np-a` (one wiring line: the walkability predicate passed to
`resolver.resolve`) and by `np-c2` (the `dirDown` arm sends `Face`). Both edits are wiring in
the file's existing call sites, with no new logic in `main.ts`, so no seam needs extracting
first. The pair is ordered (`np-c2` after `np-a`). Every other pair of slices shares no
code or test file. The movement code moves to `shell/movement.ts` at extraction 10 of
`docs/refactors/client-shell.md`, which is not yet sectioned in `structure.spec.md`. Whichever
of those lands second re-points its edit. The st-5…st-7 sections and lpg-10 also edit `main.ts`
at other symbols, and the supervisor's overlap check serialises them.

## Slices

### np-a — remote continued-walk extrapolation
type: feature · tier: hard
category: netcode-render (operator-ruled) · severity: HIGH · size: MODERATE
touches: client/src/render/interpolation.ts, client/src/render/interpolation.test.ts, client/src/render/renderResolver.ts, client/src/render/renderResolver.test.ts, client/src/render/config.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/main.ts, client/e2e/remote-walk.spec.ts, projects/monster-realm/.claude/skills/netcode-smoothness/SKILL.md, ARCHITECTURE.md, docs/DECISIONS.md
after: []

The store keeps the debounce and the position-change record. The remote arm of
`RenderResolver.resolve` keeps the per-entity rendered state. The continuation and bound
arithmetic are pure functions in `interpolation.ts`, and their constants go in `render/config.ts`.
`ResolveInput` gains the walkability predicate, and `main.ts` passes one built from the current
`rawMap` (replaced on warp, so the closure reads the live map).

Pins and dispositions, each a named intentional change:
- `renderResolver.test.ts` "remote entity hold-not-extrapolate" and `interpolation.test.ts`'s
  HOLD-past-newest cases: HOLD stays the rule outside the window.
- `store.test.ts` cases that expect a same-tile update to append a snapshot or move the jitter
  estimate.
- `remote-walk.spec.ts`'s "the sprite never moves backwards" holds through the walk. After the
  key's release it allows one settle of at most 0.5 tile within one `STEP_MS`.

The own-path, reduced-motion (`S7T-*`) and re-anchor cases stay unedited. The `interpolation.ts`
header comment, the `renderResolver.ts` header, the game skill `netcode-smoothness` and
`ARCHITECTURE.md`'s render paragraph change in this slice, because they state the superseded
invariant. `docs/DECISIONS.md` "Remote interpolation: adaptive delay, hold rather than
extrapolate" is superseded in place, citing item 159. No bindings, game-core or i18n change.
`reduced-motion.spec.ts` is unaffected (its arm is bypassed).

Each unit criterion below feeds rows through a real `AuthoritativeStore` (built with `STEP_MS` 200)
into `RenderResolver` at the adaptive delay the store's jitter estimate gives. A criterion that
needs the delay pinned says so.

- **np-a.1:** WHEN a remote's last two position changes are one-tile moves in the same direction arriving at most one window apart, the newer within the window, no later row faces another way, and the render clock passes the newest snapshot, THE resolver SHALL keep moving the remote in that direction at the walk's observed cadence (`client/src/render/renderResolver.test.ts`, delay pinned at one `STEP_MS` so the render clock passes the newest snapshot).

- **np-a.2:** WHILE a remote is continued past its newest authoritative tile, THE resolver SHALL keep it within 0.5 tile (Manhattan) of that tile and SHALL hold it short of any tile the injected walkability predicate rejects or that lies outside the map (`client/src/render/renderResolver.test.ts`).

- **np-a.3:** WHEN same-tile row updates with `action` Idle arrive between the position changes of a straight walk whose steps arrive two `STEP_MS` apart, THE store SHALL append no snapshot for them, and THE rendered position SHALL advance along the walk with no interval of 100 ms or more in which it stands still and with the Walking action (`client/src/net/store.test.ts`, `client/src/render/renderResolver.test.ts`, sampled every 16 ms after the jitter estimate settles).

- **np-a.4:** WHEN no position change arrives within the window after the newest one, THE rendered position SHALL return to the newest authoritative tile within one `STEP_MS` without moving faster than one tile per `STEP_MS`, and once there SHALL show the row's action (`client/src/render/renderResolver.test.ts`).

- **np-a.5:** WHEN a row contradicts the continuation (a position change in another direction, or a same-tile row facing another way), THE rendered position SHALL never be more than 0.5 tile (Manhattan) from the segment joining the remote's two newest authoritative tiles, never move faster than one tile per `STEP_MS`, and reach the authoritative path within one `STEP_MS` (`client/src/render/renderResolver.test.ts`, covering a reversal, a perpendicular turn and a same-tile turn).

- **np-a.6:** WHEN the next same-direction position change arrives while a remote is continued, THE rendered position SHALL not move backward along the walk direction at any sampled frame, including when the new bracket's span exceeds `REANCHOR_SPAN_STEPS` steps (`client/src/render/renderResolver.test.ts`).

- **np-a.7:** WHEN a remote's position changes do not meet the continuation predicate (a lone step, two same-direction steps 1000 ms apart as an NPC wanders, or a zone change), THE resolver SHALL render it as today: interpolation, then HOLD at the newest snapshot (`client/src/render/renderResolver.test.ts`).

- **np-a.8:** THE own-character path and the reduced-motion arm SHALL be unchanged: `client/src/render/slideClock.test.ts`, `client/src/prediction/predictor.test.ts` and the own-path and `S7T-*` cases of `client/src/render/renderResolver.test.ts` pass with their assertions unedited.

- **np-a.9:** WHEN one browser context holds a direction for a straight walk and a second context watches, THE watcher's rendered position for the walker SHALL not stand still for `STEP_MS` or longer between the walker's second authoritative position change and the key's release, and SHALL equal the walker's authoritative tile within the window plus two `STEP_MS` after the walk ends (`client/e2e/remote-walk.spec.ts`).

Build note (np-a): The existing test '(xix) T-A' in client/src/render/renderResolver.test.ts was
amended, although this section says the re-anchor cases stay unedited. Its two steps (6000, 6040,
same direction) are a straight walk, and np-a.6 forbids the 0.199-tile back-step it pinned; only the
exact value changed (now: no back-step), its two bound assertions are unchanged. Two store pins
named here and main.worldReveal.test.ts [WS-GAP-ZONE] (touches widened: its fixture built jitter
from same-tile rows) were amended for the debounce.

Build note (np-a): np-a.9 as worded does not fail on the defect. Measured in the browser: on
localhost a held walk delivers a step every tick with no Idle row between steps, so the pre-change
client shows no pause; with 150 ms each-way delay on the walker's WebSocket (Playwright
routeWebSocket) every step misses one tick and the watcher receives step / Idle / step, on which the
pre-change client stands 183 ms per tile as sampled on frames, under the criterion's 'STEP_MS or
longer'. client/e2e/remote-walk.spec.ts therefore runs a delayed walk asserting np-a.3's bound (no
stand-still of 100 ms or more: 183 ms before, 33 ms after) and an undelayed walk; np-a.9 should name
the delayed stream and the 100 ms bound.

Build note (np-a): Mechanism built differently from the sketch, each for a measured reason (PR
plan-delta): (1) for a walking remote (two one-tile position changes at most the window apart, the
newer within it, any direction) a bracket up to the window is lerped across instead of re-anchored,
via a new idleSpanMs parameter of interpolateHistory: after the debounce a held walk's brackets span
two steps plus or minus jitter, exactly on REANCHOR_SPAN_STEPS, and every bracket a few ms over 400
ms was held ~210 ms and then slid; REANCHOR_SPAN_STEPS itself is unchanged and now decides only
brackets that open at first sight, at a snap, or span more than the window. (2) A remote two tiles
or more (Manhattan) from its target is drawn at the target (REMOTE_SNAP_TILES): the slew cap equals
the fastest walk, so a remote left behind by a burst never caught up while the walker kept moving.
(3) The store's record is the tile delta and arrival of the last two position changes plus
turnedInPlace (sticky until the next position change); it carries no facing, so no
direction-to-delta table exists in TypeScript, and a turn away and back does not restart the
continuation. (4) JITTER_IDLE_GAP_STEPS lives in client/src/shared/interpConfig.ts (touches
widened), read by net/store.ts and render/.

Build note (np-a): Consequences for np-b and the playtest: with the debounce a remote walking one
step per two ticks has a jitter estimate near one step, so it is drawn at the 2.5-step delay cap and
the interp-gap gauge reads 500 ms for it; a stop shows up to half a tile of overshoot held until the
600 ms window ends, then a 100 ms return drawn Walking; a tap-turn (np-c2's Face row) sets
turnedInPlace, so contract C2 holds.

Build note (np-a): A same-tile row with action Jumping and the walk's facing does not end a
continued walk: the remote is drawn Jumping while drifting up to half a tile ahead until the window
ends. The spec's predicate has no clause for it.

### np-c1 — the press rule: `MoveInput::Face` turns, or steps when already facing
type: feature · tier: hard
category: movement/rules (operator directive, item 165) · severity: HIGH · size: MODERATE
touches: game-core/src/types.rs, game-core/src/world.rs, server-module/src/privacy.rs, server-module/src/privacy_tests.rs, server-module/src/movement_tests.rs, sim-harness/src/lib.rs, sim-harness/src/bin/mr_load_driver.rs, evals/baselines/spacetime-types.json, client/src/module_bindings/types.ts, client/src/convert/convert.ts, client/src/convert/convert.test.ts, client/src/prediction/predictor.ts, client/src/prediction/predictor.test.ts, client/src/prediction/movementSim.test.ts, client/src/prediction/heldKeys.test.ts, client/src/prediction/ackOnRow.property.test.ts, client/src/net/switchZoneAtomicity.test.ts, projects/monster-realm/.claude/skills/spacetimedb-client/SKILL.md, docs/DECISIONS.md
after: []

Rule → wire → client marshaling, with no client sender (that is `np-c2`). `Face(Direction)` is
appended after `Jump` in `game-core/src/types.rs`. `apply_move` gains its arm. Every exhaustive
`MoveInput` match gains one:
- `server-module/src/privacy.rs` `json_move_input_into` (the data export);
- `sim-harness/src/bin/mr_load_driver.rs` `sats_move_input` (`{"face":{"<dir>":[]}}`);
- the scenario-coverage test match in `sim-harness/src/lib.rs`.

`movement.rs` needs no change: a `Face` that only turns leaves the tile unchanged, so the
`prev != next.pos` warp guard and `stepped_onto_grass` already skip it. `enqueue_move`'s
Quality-Time credit is time-gated per call (`apply_quality_time_credit`), so `Face` spam earns no
more than a wall bump does today.

On the client, `convert.ts` `WasmMoveInput`/`SdkMoveInput`/`moveInputToWasm`/`moveInputToSdk` gain
`Face`. Today `moveInputToWasm` maps every non-`Jump` tag to `Step`, which would silently turn a
queued `Face` into a move. `Predictor.lastQueuedDir` returns a trailing `Face`'s direction.

These test fakes read `input.Step` once `'Jump'` is excluded, so `tsc` fails when the union
widens; each gains the `Face` arm:
- `movementSim.test.ts`, `heldKeys.test.ts` and `switchZoneAtomicity.test.ts` (their `applyMove`
  fakes);
- `ackOnRow.property.test.ts` (`moved`).

Regeneration: the bindings are regenerated, which changes only `module_bindings/types.ts` (the
reducer and table files import the type). The spacetime-type baseline is rewritten by its own
`--write`.

The game skill `spacetimedb-client`'s marshaling table names `MoveInput` as Step/Jump and gains
`Face`.

Unchanged: the client-callable-reducers baseline (the argument type is still `MoveInput`); the 44
test files that mock the wasm package (no new wasm export); `rowConvert.ts` (it reads queues
through `moveInputToWasm`).

`docs/DECISIONS.md` gains "Turning in place: `Face` turns, or steps when already facing".

- **np-c1.1:** WHEN `apply_move` receives `Face(d)` for a character not facing `d`, THE rule SHALL set facing to `d`, keep the tile, set action Idle and stamp `move_started_at` to `now`, for every pair of distinct directions and whether or not the faced tile is walkable (`game-core/src/world.rs` tests).

- **np-c1.2:** WHEN `apply_move` receives `Face(d)` for a character already facing `d`, THE rule SHALL return exactly what `Step(d)` returns for the same state, map and time (`game-core/src/world.rs` tests, over every direction on open, blocked and edge tiles).

- **np-c1.3:** WHEN a player enqueues `Face(d)` while not facing `d` and the zone ticks, THE server SHALL publish the character facing `d` on the same tile with `acked_seq` advanced, and SHALL roll no encounter and resolve no warp, even on a tall-grass or warp tile (`server-module/src/movement_tests.rs`).

- **np-c1.4:** WHEN two `Face(d)` inputs drain in order for a character not facing `d`, THE server SHALL turn on the first tick and step on the second (`server-module/src/movement_tests.rs`).

- **np-c1.5:** WHEN a mid-battle player sends `Face` through `enqueue_move` or `set_move`, THE server SHALL reject it with the existing battle-lock error and queue nothing (`server-module/src/movement_tests.rs`).

- **np-c1.6:** WHEN a character's published queue holds `Face`, THE data export SHALL encode it as a tagged `Face` with its direction (`server-module/src/privacy_tests.rs`).

- **np-c1.7:** WHEN a `Face` op is pending at reconcile, THE predictor SHALL replay it with the same result as the server, and `lastQueuedDir` SHALL report the direction of a trailing `Face` (`client/src/prediction/predictor.test.ts`, with the real wasm `apply_move` in the parity case).

- **np-c1.8:** THE client marshaling SHALL round-trip `Face` for every direction between the SDK and wasm shapes, and SHALL map no `Face` to `Step` (`client/src/convert/convert.test.ts`).

### np-c2 — a press of a direction you do not face turns first
type: feature · tier: hard
category: movement/input (operator directive, item 165) · severity: HIGH · size: MODERATE
touches: client/src/main.ts, client/src/main.input.test.ts, client/src/main.accel.test.ts, client/src/main.boot.test.ts, client/src/main.chips.test.ts, client/src/main.controls.test.ts, client/src/main.dispatch.test.ts, client/src/main.menu.test.ts, client/src/main.notices.test.ts, client/src/main.noticesRt.test.ts, client/src/main.remap.test.ts, client/test-util/mainBootHarness.ts, client/e2e/controls.ts, client/e2e/world-art.spec.ts, client/e2e/movement-input.spec.ts, client/e2e/tap-to-turn.spec.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: [np-a, np-c1]

The `dirDown` arm of `applyRouterEffect` sends `Face(dir)` where it sends `Step(dir)` today, through
the same `sendIntent`. The `held.isHeld` dual-key dedup and the `held.press` stamp are kept.
Continuation emitters, `step`/`jump` and the DEV hook are unchanged (decision above).

Pins and dispositions, measured on `4ba7aa45`:
- `mainBootHarness.ts`'s wasm stub `apply_move`, and the inline stub in `main.input.test.ts`, learn
  `Face`.
- The ten `client/src/main.*.test.ts` suites listed pair world arrow keydowns with a `Step`-send
  assertion or the stub. Each assertion of a `Step` on a fresh press from a non-facing start is
  amended as a named intentional change.
- `client/e2e/controls.ts` `dpadWalkPath` presses once per step and throws when the tile does not
  move. Its "FACING FACTS" block says "a Step always turns AND moves". Both are re-pointed: a
  press that changes direction turns first, so the walker presses again until the tile moves.
  `world-art.spec.ts` (WAP10.1, WAP10.2), the helper's caller, is listed in case its expected
  step counts change.
- `movement-input.spec.ts` scenario A (single taps → one tile each) is re-pointed to taps in the
  faced direction. Its NH2 no-cancel and dual-code scenarios stay unedited.
- `zone-scope.spec.ts` and `remote-walk.spec.ts` hold ArrowRight from the South-facing spawn and
  so gain one turn slot. Their assertions do not count steps, so they are left out of `touches:`.
  A red run is the proof to widen.

`tap-to-turn.spec.ts` (new) uses `client/e2e/stdb.ts` and the `controls.ts` helpers. The e2e
waits for the row's facing before pressing A, because the `Face` sits in the queue for up to a
tick. `docs/DECISIONS.md` "Held keys: commit threshold and warp continuity" is amended in place: a
press sends `Face`, and a press you face steps.

- **np-c2.1:** WHEN a direction that is not held is pressed at the world base, THE client SHALL send exactly one `enqueue_move` carrying `Face` in that direction for the press and no `Step` (`client/src/main.input.test.ts`).

- **np-c2.2:** WHILE a direction pressed from a non-facing start stays held past `HOLD_COMMIT_MS`, THE client SHALL send `Step` in that direction once the `Face` is acknowledged, without a second press (`client/src/main.input.test.ts`).

- **np-c2.3:** WHEN the player taps a direction they do not face, THE character SHALL turn to it and stay on its tile, and WHEN they tap it again THE character SHALL move one tile (`client/e2e/tap-to-turn.spec.ts`, keyboard taps, authoritative row read through `__game()`).

- **np-c2.4:** WHEN the player holds a direction they do not face, THE character SHALL turn and then walk at least two tiles without a second press (`client/e2e/tap-to-turn.spec.ts`).

- **np-c2.5:** WHEN the player tap-turns toward an adjacent NPC, the row shows the new facing, and the player presses A, THE conversation that opens SHALL be that NPC's (`client/e2e/tap-to-turn.spec.ts`).

- **np-c2.6:** WHEN a remote player tap-turns, THE watching context SHALL render that player on its tile at every sampled frame until the next position change (`client/e2e/tap-to-turn.spec.ts`, two contexts — contract C2).

- **np-c2.7:** THE input guardrails SHALL hold: OS key-repeat sends nothing, a keyup sends no `clear_queue` or `set_move`, a frame push clears the held set, and the NH2 no-cancel and dual-code scenarios of `client/e2e/movement-input.spec.ts` pass unedited.

### np-d — movement-pipeline hygiene: queued moves end at battle start; the backoff climbs
type: feature · tier: hard
category: netcode-determinism (R-weekly-review-2026-10-02-F1, R-weekly-review-2026-10-23-F2) · severity: MED · size: SMALL
touches: server-module/src/movement.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, client/src/prediction/reconnectPolicy.ts, client/src/prediction/reconnectPolicy.test.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, docs/DECISIONS.md
after: []

The two contained fixes the sketch bundled.

F1 (`np-d.1`, `np-d.3`, `np-d.4`):
- `movement.rs` gains one `pub(crate)` helper that empties a player's `move_intent.queue` and
  keeps `last_input_seq`.
- `start_wild_tactical` and `start_pvp_tactical` call it for each battler after their last
  fallible step. `nh_movement_tick_refused_wild_start_leaves_no_half_written_battle_bt16_1` is the
  precedent for the refused path.
- The drain-time lock in `movement_tick` stays, and so does `clear_queue` being exempt from the
  battle guard.
- `sim-harness` models the drain lock, which is unchanged, so the sim does not change.
- The `docs/DECISIONS.md` "Battle lifecycle and PvP" entry gains one clause: a battle start drops
  the battlers' queued moves.

F2 (`np-d.2`, `np-d.5`, `np-d.6`, `np-d.7`):
- The policy's transitions carry the one-rung-per-attempt rule.
- `connection.ts` starts an attempt on every build path and keeps `handleDrop`'s
  "connection lost" notice on the connected→disconnected edge only.
- No UI string changes.

- **np-d.1:** WHEN a wild tactical battle starts for a player with queued moves, THE server SHALL empty that player's `move_intent` queue in the same transaction and leave its `last_input_seq` unchanged, and WHEN the start is refused THE queue SHALL stay as it was (`server-module/src/tactics_tests.rs`).

- **np-d.2:** WHEN a reconnect attempt's link drops before its first applied subscription, THE reconnect policy SHALL climb one rung of the backoff ladder (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-d.3:** WHEN a PvP tactical battle starts, THE server SHALL empty both battlers' queues the same way (`server-module/src/tactics_tests.rs`).

- **np-d.4:** WHEN that battle ends and the zone ticks, THE server SHALL publish an empty `character.move_queue` and SHALL move neither battler (`server-module/src/tactics_tests.rs`).

- **np-d.5:** WHEN one failed attempt reports both a connect error and a drop, in either order, THE policy SHALL climb exactly one rung, whichever build path started the attempt (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-d.6:** WHEN a connected link drops, or an applied subscription arrives, THE policy SHALL behave as today: the drop keeps the rung, and the subscription resets it to zero (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-d.7:** WHEN successive attempts each open and drop before the first applied subscription, THE scheduled reconnect delays SHALL follow the ladder rung by rung, skipping none, up to its cap (`client/src/net/connection.runtime.test.ts`).

### np-b — send-pipeline depth: a study with a go/no-go
type: design · tier: hard
category: netcode-supply (study) · severity: MED · size: SMALL
touches: docs/send-pipeline-depth.md, docs/DECISIONS.md
after: [np-a, np-c2]

The study asks whether allowing one more in-flight step (`outstandingSteps <= 1`; `MOVE_QUEUE_CAP`
is already 2) would smooth every viewer's authoritative stream. The hard constraint is the
press-phase teleport metric that the gate brought from 88% to about 2%. Measurements run against
a local server with the depth change applied only in a scratch worktree; nothing but the record
is committed. The record goes in `docs/send-pipeline-depth.md`. Its outcome goes in the
"Held keys" `docs/DECISIONS.md` entry's Why.

- **np-b.1:** THE record SHALL give, for a held 20-tile walk at depth 1 and at depth 2, the watcher-side distribution of authoritative position-change intervals (median, p90, share above `STEP_MS`) and the rate of stand-still intervals in the watcher's render with `np-a` merged.

- **np-b.2:** THE record SHALL re-run the press-phase teleport metric at both depths at 60 Hz and 30 Hz, with the method needed to repeat it.

- **np-b.3:** THE record SHALL end in go or no-go: a go names a follow-up `np-` slice with its `touches:` and the teleport bound it must hold; a contested tradeoff becomes an `mr-ask-drew` question instead of a decision.

## Post-integration verification (the milestone is done when all hold on `master`)

- Full `just ci` green. Bindings drift is 0 after `np-c1`'s regeneration, and the spacetime-type
  snapshot stays append-only. Nightly mutation: the game-core zero-miss config covers the new
  `apply_move` arm.
- `client/e2e/remote-walk.spec.ts` (np-a.9) and `client/e2e/tap-to-turn.spec.ts` (np-c2.3–np-c2.6)
  pass together on `master`. That pair is the integrated proof of contracts C1 and C2.
- One manual two-client playtest pass, recorded in the last code slice's PR:
  - a remote walker under a held key looks smooth;
  - a stop settles with at most a half-tile correction and no snap;
  - a tap turns, and a second tap steps;
  - a direction change shows no backward teleport;
  - a walk into grass that starts a battle does not continue when the battle ends (C3);
  - a server restart during play shows the reconnect delay climbing.
- `np-b`'s record exists. A go is a new, separately specced slice.

## Risks

- **np-a reverses a codified invariant.** The DECISIONS supersession, the two header comments, the
  game skill and ARCHITECTURE.md change in the same slice, or the docs contradict the code.
- **A stop can show a half-tile backward correction.** This is the accepted cost of the
  operator's continuation, capped by the decisions above. If the playtest finds stops worse than
  the pauses were, the remedy is the cap, window or speed default (reversible constants), not a
  reversal of the ruling.
- **np-c2 sits in the most regression-prone input path** (the nh1/nh2/ADR-0152 history). Its
  measured pins are in `touches:`. A widen refused because another live slice holds the file is a
  hidden-dependency STOP.
- **A turn adds one movement slot before every walk from a non-facing start**, mid-walk direction
  changes included. That is the operator's literal design ("before you move in a direction, you
  should be required to face that direction"); the softer variant is a named deferral.
- **A client bundle older than `np-c1` cannot decode a public `character.move_queue` holding
  `Face`.** The rollout order:
  1. `np-c1` deploys client and module together;
  2. `np-c2`, the first sender of `Face`, deploys after every open session runs an `np-c1` bundle.
  Before launch this means reloading playtest tabs between the two deploys; `np-c2`'s PR states
  it. Publishing the module with the widened stored type may also disconnect connected clients,
  as a column add does.
