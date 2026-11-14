# Spec: M-netcode-presence — remote-player smoothness + turn in place

**Status:** elaborated 2026-11-14 (from the 2026-10-24 sketch) against game `master` `4ba7aa45`
(after lpg-0). lpg-10 (game PR #777, open) edits `client/src/main.ts` and
`client/src/observability/config.ts`; it is treated as landed first, and no np- slice edits the
telemetry or token lines it changes. · **Project:** monster-realm · **Slices:** 6 — `np-a`,
`np-c1`, `np-d`, `np-e` start in parallel; `np-c2` after `np-a` and `np-c1`; the study `np-b`
last. Anchors are symbols, never line numbers.

**Feedback items:** pt3-2026-10-158 (remote players pause on every tile) → `np-a`, with the supply
side studied in `np-b`; pt3-2026-10-159 (continue the last walk for a short window, then idle —
the operator's ruling) → `np-a`; pt3-2026-10-165 (face a direction without moving; a tap turns,
a press you already face steps) → `np-c1` + `np-c2`.
**Absorbed residuals:** R-weekly-review-2026-10-02-F1 → `np-d`; R-weekly-review-2026-10-23-F2 →
`np-e` (split out of the sketch's bundled np-d: one is a server fix, the other a client
connection fix, and they share no file).
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
- The server dropping a battler's queued moves at battle start (`np-d`).
- The backoff climbing on open-then-drop (`np-e`).
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
- **`apply_move_coded` / the movement-parity eval covering `Face`** → backlog. The serde wasm
  path `apply_move` that the predictor uses covers `Face` through `np-c1`'s parity test, and no
  eval is added.
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

- `decision-defaulted:remote-continuation-window=JITTER_IDLE_GAP_STEPS*STEP_MS` — 600 ms at
  `STEP_MS` 200, measured on the wall clock from the arrival of the remote's newest position
  change. It reuses the existing idleness threshold: a gap longer than three steps already
  counts as idleness, not jitter.
- `decision-defaulted:remote-continuation-predicate=two-same-direction-steps-in-window` —
  continuation needs the remote's last two position changes to be single-tile moves in the same
  direction, the newer of them inside the window. A lone step, such as a tap or an NPC wander
  step, never extrapolates.
- `decision-defaulted:remote-continuation-bound=one-tile-and-walkable` — the sketch's
  conservative default, both bounds:
  - at most one tile beyond the newest authoritative tile;
  - only onto an in-bounds tile the zone's game-core walkability data allows. The wasm
    `zone_map` grid, which `main.ts` already holds as `rawMap`, is injected into the resolver as
    a predicate.
  The walkability bound is the one that stops a remote that bumped a wall: a bump writes a
  same-tile row, the same shape as a transient Idle write.
- `decision-defaulted:remote-continuation-speed=observed-cadence` — continuation moves at one
  tile per the interval between the last two position-change arrivals, clamped to
  [`STEP_MS`, window]. It is never faster than the server can move a character.
- `decision-defaulted:remote-settle=converge-within-one-step` — on staleness, or on an
  authoritative update that contradicts the extrapolation, the render converges to the
  authoritative path within one `STEP_MS`. It never sits more than one tile from the newest
  authoritative tile, and a correction never snaps.
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
  client's tap/hold threshold. A tap shorter than it turns only. A hold passes it, and the
  held-key continuation sends `Step` once the `Face` is acknowledged (the existing
  `outstandingSteps === 0` gate).
- `decision-defaulted:continuation-input=step` — held continuation and two-key fallback keep
  sending `Step(dir)`, which turns and moves in one input. Only a fresh press (`dirDown`)
  sends `Face`. The DEV hook `__game().step(dir)` keeps sending `Step`, so e2e positioning
  helpers are unchanged.
- `decision-defaulted:pre-battle-queue=server-drops-at-battle-start` — `start_wild_tactical` and
  `start_pvp_tactical` empty each battler's private `move_intent.queue` (seq unchanged) in the
  battle-start transaction. The next tick publishes the empty queue through
  `publish_intent`/`publish_standing`, so the tick stays the only writer of
  `character.move_queue`.
  Rejected: a client-sent `clear_queue` on battle push, because a stale or hostile client would
  keep the queue. The client predictor needs no change: the next reconcile replays onto the
  empty authoritative queue, out of sight under the battle overlay. The drain lock stays as
  defence in depth.

No `mr-ask-drew`: every choice above is reversible. The schema change is a tail-appended enum
variant, which the project's migration rule already permits.

## Contracts between slices

- **C1 (`np-c1` → `np-c2`):** the wire variant `MoveInput::Face` and its `apply_move` rule, plus
  the client marshaling and predictor support for it: `convert.ts` `WasmMoveInput`/`SdkMoveInput`
  and `Predictor.lastQueuedDir`. `np-c1` ships them with no client sender. Proof after merge:
  `np-c2`'s tap-to-turn e2e passes on `master`.
- **C2 (`np-a` → `np-c2`):** a remote's tap-turn arrives as a same-tile row with a new facing.
  `np-a`'s continuation predicate needs two same-direction position changes, so a turn is never
  extrapolated. Proof after merge: `np-c2.6`, a two-context check that a watcher renders a remote
  tap-turn without leaving its tile.
- **C3 (`np-d` ↔ predictor):** an authoritative queue emptied at battle start reconciles through
  the existing replay. Proof after merge: the manual playtest pass below, where a walk into tall
  grass that starts a battle does not continue when the battle ends.
- **C4 (`np-a`, `np-c2` → `np-b`):** the study measures the pipeline with both merged, so its
  numbers include extrapolation and the turn slot.

## Structure

`client/src/main.ts` is edited by `np-a` (one wiring line: the walkability predicate passed to
`resolver.resolve`) and by `np-c2` (the `dirDown` arm sends `Face`). Both edits are wiring in
the file's existing call sites, with no new logic in `main.ts`, so no seam needs extracting
first. The pair is ordered (`np-c2` after `np-a`). Every other pair of slices shares no
code or test file. The movement code moves to `shell/movement.ts` at extraction 10 of
`docs/refactors/client-shell.md`, which is not yet sectioned in `structure.spec.md`. Whichever
of those lands second re-points its edit. The st-5…st-7 sections and lpg-10 also edit `main.ts`
at other symbols, and the supervisor's overlap check serialises them.

### np-a — remote continued-walk extrapolation
type: feature · tier: hard
category: netcode-render (operator-ruled) · severity: HIGH · size: MODERATE
touches: client/src/render/interpolation.ts, client/src/render/interpolation.test.ts, client/src/render/renderResolver.ts, client/src/render/renderResolver.test.ts, client/src/render/config.ts, client/src/net/store.ts, client/src/net/store.test.ts, client/src/main.ts, client/e2e/remote-walk.spec.ts, projects/monster-realm/.claude/skills/netcode-smoothness/SKILL.md, ARCHITECTURE.md, docs/DECISIONS.md
after: []

The continuation lives in the remote arm of `RenderResolver.resolve` and in pure functions in
`interpolation.ts`; its constants go in `render/config.ts`. `ResolveInput` gains the walkability
predicate, and `main.ts` passes one built from the current `rawMap` (replaced on warp, so the
closure reads the live map). The Idle debounce goes in the render arm or in the store's ring,
whichever the builder's red tests favour; `store.ts` is listed for that reason.

Pins and dispositions:
- `renderResolver.test.ts` "remote entity hold-not-extrapolate" and `interpolation.test.ts`'s
  HOLD-past-newest cases are amended deliberately, as named intentional changes: HOLD stays the
  rule outside the window.
- The own-path, reduced-motion (`S7T-*`) and re-anchor cases stay unedited.
- The `interpolation.ts` header comment, the `renderResolver.ts` header, the game skill
  `netcode-smoothness` and `ARCHITECTURE.md`'s render paragraph change in this slice, because
  they state the superseded invariant.
- `docs/DECISIONS.md` "Remote interpolation: adaptive delay, hold rather than extrapolate" is
  superseded in place, citing item 159.

Hidden dependencies checked: no bindings, game-core or i18n change. `reduced-motion.spec.ts` is
unaffected (its arm is bypassed).

- **np-a.1:** WHEN a remote's last two position changes are one-tile moves in the same direction, the newer received within the window, and the render clock passes the newest snapshot, THE resolver SHALL keep moving the remote in that direction at the walk's observed cadence (`client/src/render/interpolation.test.ts`, `client/src/render/renderResolver.test.ts`).

- **np-a.2:** WHILE a remote is continued past its newest authoritative tile, THE resolver SHALL keep it within one tile of that tile and SHALL hold it short of any tile the injected walkability predicate rejects or that lies outside the map (`client/src/render/renderResolver.test.ts`).

- **np-a.3:** WHEN same-tile row updates with `action` Idle arrive between the position changes of a walk whose steps arrive two `STEP_MS` apart, THE rendered position SHALL advance along the walk with no interval of 100 ms or more in which it stands still, and the rendered action SHALL be Walking (`client/src/render/renderResolver.test.ts`, sampled every 16 ms).

- **np-a.4:** WHEN no position change arrives within the window after the newest one, THE rendered position SHALL converge to the newest authoritative tile within one `STEP_MS` and stay there, and the rendered action SHALL be the row's (`client/src/render/renderResolver.test.ts`).

- **np-a.5:** WHEN an authoritative position change contradicts the continued direction, THE rendered position SHALL reach the authoritative path within one `STEP_MS`, never sit more than one tile from the newest authoritative tile at any sampled frame, and never move more than one tile between consecutive frames (`client/src/render/renderResolver.test.ts`).

- **np-a.6:** WHEN a remote has a lone position change (none in the same direction before it within the window), or changes zone, THE resolver SHALL render it exactly as today: interpolation, then HOLD at the newest snapshot (`client/src/render/renderResolver.test.ts`).

- **np-a.7:** THE own-character path and the reduced-motion arm SHALL be unchanged: `client/src/render/slideClock.test.ts`, `client/src/prediction/predictor.test.ts` and the own-path and `S7T-*` cases of `client/src/render/renderResolver.test.ts` pass with their assertions unedited.

- **np-a.8:** WHEN one browser context holds a direction for a straight walk and a second context watches, THE watcher's rendered position for the walker SHALL not stand still for `STEP_MS` or longer between the walker's second authoritative position change and the key's release, and SHALL equal the walker's authoritative tile within the window plus two `STEP_MS` after the walk ends (`client/e2e/remote-walk.spec.ts`).

### np-c1 — the press rule: `MoveInput::Face` turns, or steps when already facing
type: feature · tier: hard
category: movement/rules (operator directive, item 165) · severity: HIGH · size: MODERATE
touches: game-core/src/types.rs, game-core/src/world.rs, server-module/src/privacy.rs, server-module/src/movement_tests.rs, sim-harness/src/lib.rs, sim-harness/src/bin/mr_load_driver.rs, evals/baselines/spacetime-types.json, client/src/module_bindings/types.ts, client/src/module_bindings/character_table.ts, client/src/module_bindings/enqueue_move_reducer.ts, client/src/module_bindings/set_move_reducer.ts, client/src/convert/convert.ts, client/src/convert/convert.test.ts, client/src/prediction/predictor.ts, client/src/prediction/predictor.test.ts, docs/DECISIONS.md
after: []

Rule → wire → client marshaling, with no client sender (that is `np-c2`). `Face(Direction)` is
appended after `Jump` in `game-core/src/types.rs`. `apply_move` gains its arm. Every exhaustive
`MoveInput` match gains one:
- `server-module/src/privacy.rs` `json_move_input_into` (the data export);
- `sim-harness/src/bin/mr_load_driver.rs` `sats_move_input` (`{"face":{"<dir>":[]}}`);
- the scenario-coverage test match in `sim-harness/src/lib.rs`.

`movement.rs` needs no change: a `Face` that only turns leaves the tile unchanged, so the
`prev != next.pos` warp guard and `stepped_onto_grass` already skip it.
`enqueue_move`'s Quality-Time accrual applies per accepted input, as a wall bump does today.

On the client, `convert.ts` `WasmMoveInput`/`SdkMoveInput`/`moveInputToWasm`/`moveInputToSdk` gain
`Face`. Today `moveInputToWasm` maps every non-`Jump` tag to `Step`, which would silently turn a
queued `Face` into a move. `Predictor.lastQueuedDir` returns a trailing `Face`'s direction. The
bindings are regenerated, and the spacetime-type baseline is rewritten by its own `--write`.

The client-callable-reducers baseline is unchanged: the argument type is still `MoveInput`. Not
touched: `apply_move_coded` (deferred above); the 44 test files that mock the wasm package, since
no new wasm export exists; `rowConvert.ts`, which reads queues through `moveInputToWasm`.
`docs/DECISIONS.md` gains "Turning in place: `Face` turns, or steps when already facing".

- **np-c1.1:** WHEN `apply_move` receives `Face(d)` for a character not facing `d`, THE rule SHALL set facing to `d`, keep the tile, set action Idle and stamp `move_started_at` to `now`, for every pair of distinct directions and whether or not the faced tile is walkable (`game-core/src/world.rs` tests).

- **np-c1.2:** WHEN `apply_move` receives `Face(d)` for a character already facing `d`, THE rule SHALL return exactly what `Step(d)` returns for the same state, map and time (`game-core/src/world.rs` tests, over every direction on open, blocked and edge tiles).

- **np-c1.3:** WHEN a player enqueues `Face(d)` while not facing `d` and the zone ticks, THE server SHALL publish the character facing `d` on the same tile with `acked_seq` advanced, and SHALL roll no encounter and resolve no warp, even on a tall-grass or warp tile (`server-module/src/movement_tests.rs`).

- **np-c1.4:** WHEN two `Face(d)` inputs drain in order for a character not facing `d`, THE server SHALL turn on the first tick and step on the second (`server-module/src/movement_tests.rs`).

- **np-c1.5:** WHEN a mid-battle player sends `Face` through `enqueue_move` or `set_move`, THE server SHALL reject it with the existing battle-lock error and queue nothing (`server-module/src/movement_tests.rs`).

- **np-c1.6:** THE client marshaling SHALL round-trip `Face` for every direction between the SDK and wasm shapes, and SHALL map no `Face` to `Step` (`client/src/convert/convert.test.ts`).

- **np-c1.7:** WHEN a `Face` op is pending at reconcile, THE predictor SHALL replay it with the same result as the server, and `lastQueuedDir` SHALL report the direction of a trailing `Face` (`client/src/prediction/predictor.test.ts`, with the real wasm `apply_move` in the parity case).

- **np-c1.8:** WHEN `just ci` runs, THE spacetime-type snapshot gate SHALL pass with `Face` as the last `MoveInput` variant, and the bindings-drift gate SHALL report the regenerated bindings clean.

### np-c2 — a press of a direction you do not face turns first
type: feature · tier: hard
category: movement/input (operator directive, item 165) · severity: HIGH · size: MODERATE
touches: client/src/main.ts, client/src/main.input.test.ts, client/test-util/mainBootHarness.ts, client/e2e/movement-input.spec.ts, client/e2e/tap-to-turn.spec.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: [np-a, np-c1]

The `dirDown` arm of `applyRouterEffect` sends `Face(dir)` where it sends `Step(dir)` today, through
the same `sendIntent`. The `held.isHeld` dual-key dedup and the `held.press` stamp are kept.
Continuation emitters, `step`/`jump` and the DEV hook are unchanged (decision above).

Pins and dispositions:
- `mainBootHarness.ts`'s wasm stub `apply_move` (and the inline stub in `main.input.test.ts`) learn
  `Face`.
- `main.input.test.ts` cases asserting a `Step` send on a fresh press are amended where the
  character does not face the pressed direction, as named intentional changes.
- `movement-input.spec.ts` scenario A (single taps → one tile each) is re-pointed to taps in the
  faced direction. Its NH2 no-cancel and dual-code scenarios stay unedited.

Measured candidate pins, to be confirmed by the slice's first red run and widened with that proof:
- the other `client/src/main.*.test.ts` suites that pair arrow keydowns with a `Step` send
  (`accel`, `boot`, `chips`, `controls`, `dispatch`, `menu`, `notices`, `noticesRt`, `remap`);
- `client/e2e/zone-scope.spec.ts` and `remote-walk.spec.ts`, which hold ArrowRight from the
  South-facing spawn and so gain one turn slot.

`tap-to-turn.spec.ts` (new) uses `client/e2e/stdb.ts` and `controls.ts` and adds no helper.
`docs/DECISIONS.md` "Held keys: commit threshold and warp continuity" is amended in place: a press
sends `Face`, and a press you face steps.

- **np-c2.1:** WHEN a direction that is not held is pressed at the world base, THE client SHALL send exactly one `enqueue_move` carrying `Face` in that direction for the press and no `Step` (`client/src/main.input.test.ts`).

- **np-c2.2:** WHILE a direction pressed from a non-facing start stays held past `HOLD_COMMIT_MS`, THE client SHALL send `Step` in that direction once the `Face` is acknowledged, without a second press (`client/src/main.input.test.ts`).

- **np-c2.3:** WHEN the player taps a direction they do not face, THE character SHALL turn to it and stay on its tile, and WHEN they tap it again THE character SHALL move one tile (`client/e2e/tap-to-turn.spec.ts`, keyboard taps, authoritative row read through `__game()`).

- **np-c2.4:** WHEN the player holds a direction they do not face, THE character SHALL turn and then walk at least two tiles without a second press (`client/e2e/tap-to-turn.spec.ts`).

- **np-c2.5:** WHEN the player tap-turns toward an adjacent NPC and presses A, THE server-side row SHALL face that NPC and that NPC's conversation SHALL open (`client/e2e/tap-to-turn.spec.ts`).

- **np-c2.6:** WHEN a remote player tap-turns, THE watching context SHALL render that player on its tile at every sampled frame until the next position change (`client/e2e/tap-to-turn.spec.ts`, two contexts — contract C2).

- **np-c2.7:** THE input guardrails SHALL hold: OS key-repeat sends nothing, a keyup sends no `clear_queue` or `set_move`, a frame push clears the held set, and the NH2 no-cancel and dual-code scenarios of `client/e2e/movement-input.spec.ts` pass unedited.

### np-d — queued moves do not survive a battle
type: feature · tier: hard
category: netcode-determinism (R-weekly-review-2026-10-02-F1) · severity: MED · size: SMALL
touches: server-module/src/movement.rs, server-module/src/tactics.rs, server-module/src/tactics_tests.rs, docs/DECISIONS.md
after: []

`movement.rs` gains one `pub(crate)` helper that empties a player's `move_intent.queue` and keeps
`last_input_seq`. `start_wild_tactical` and `start_pvp_tactical` call it for each battler. The
drain-time lock in `movement_tick` stays, and so does `clear_queue` being exempt from the battle
guard. `sim-harness` models the drain lock, which is unchanged, so the sim does not change. The
`docs/DECISIONS.md` "Battle lifecycle and PvP" entry gains one clause: a battle start drops the
battlers' queued moves.

- **np-d.1:** WHEN a wild tactical battle starts for a player with queued moves, THE server SHALL empty that player's `move_intent` queue in the same transaction and leave its `last_input_seq` unchanged (`server-module/src/tactics_tests.rs`).

- **np-d.2:** WHEN a PvP tactical battle starts, THE server SHALL empty both battlers' queues the same way (`server-module/src/tactics_tests.rs`).

- **np-d.3:** WHEN that battle ends and the zone ticks, THE server SHALL publish an empty `character.move_queue` and SHALL move neither battler (`server-module/src/tactics_tests.rs`).

### np-e — the reconnect backoff climbs on open-then-drop
type: feature · tier: hard
category: netcode-determinism (R-weekly-review-2026-10-23-F2) · severity: MED · size: SMALL
touches: client/src/prediction/reconnectPolicy.ts, client/src/prediction/reconnectPolicy.test.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts
after: []

The policy's transitions decide the climb. `connection.ts` changes only if the runtime test shows
that the SDK's event order needs it (for example, the `handleDrop`/`onConnectError` double event
for one failed attempt). No UI string changes: the existing `link` notice is reused.

- **np-e.1:** WHEN a reconnect attempt's link drops before its first applied subscription, THE reconnect policy SHALL climb one rung of the backoff ladder (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-e.2:** WHEN one failed attempt reports both a connect error and a drop, in either order, THE policy SHALL climb exactly one rung (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-e.3:** WHEN a connected link drops, or an applied subscription arrives, THE policy SHALL behave as today: the drop keeps the rung, and the subscription resets it to zero (`client/src/prediction/reconnectPolicy.test.ts`).

- **np-e.4:** WHEN successive attempts each open and drop before the first applied subscription, THE scheduled reconnect delays SHALL strictly increase until the ladder's cap (`client/src/net/connection.runtime.test.ts`).

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
- `client/e2e/remote-walk.spec.ts` (np-a.8) and `client/e2e/tap-to-turn.spec.ts` (np-c2.3–np-c2.6)
  pass together on `master`. That pair is the integrated proof of contracts C1 and C2.
- One manual two-client playtest pass, recorded in the last code slice's PR:
  - a remote walker under a held key looks smooth, and a stop settles without a visible
    backward glide;
  - a tap turns, and a second tap steps;
  - a direction change shows no backward teleport;
  - a walk into grass that starts a battle does not continue when the battle ends (C3);
  - a server restart during play shows the reconnect delay climbing (np-e).
- `np-b`'s record exists. A go is a new, separately specced slice.

## Risks

- **np-a reverses a codified invariant.** The DECISIONS supersession, the two header comments, the
  game skill and ARCHITECTURE.md change in the same slice, or the docs contradict the code.
- **Stop overshoot is the visible cost of continuation.** The bounds (one tile, walkable, converge
  within one step) cap it. If the playtest finds stops worse than pauses, the remedy is the window
  or speed default above, which are reversible constants, not a reversal of the ruling.
- **np-c2 sits in the most regression-prone input path** (the nh1/nh2/ADR-0152 history). Its
  measured candidate pins are listed rather than guessed into `touches:`. A widen refused because
  another live slice holds the file is a hidden-dependency STOP.
- **A turn adds one movement slot before every walk from a non-facing start**, mid-walk direction
  changes included. That is the operator's literal design; the softer variant is a named deferral.
- **Publishing a module whose stored `MoveInput` gains a variant** may disconnect connected clients,
  as a column add does (scale-readiness measurement). `np-c1`'s publish-over-data check in CI
  covers the data, and the disconnect is a deploy-time note.
