# Spec: M3 — The prediction layer (client-wasm bridge + Predictor)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0 (gates+parity harness),
M1 (movement rule), M2 (authoritative server + reconciliation contract).
**Decisions:** ADR-0003 (shared core), 0010 (proof-of-teeth), 0011 (server-paced), 0012 (client
prediction & reconciliation), 0013 (netcode smoothness). See `netcode-quality-review.md`. **Workflow:** harvest v1 M3/marshaling → plan/design → draft →
review/red-team → pre-M4 hardening (see §7). Test-first: §3 is the source for the `tester` (vitest +
fast-check for TS; parity for wasm).

## 1. Problem / intent

Make the browser move the player **the instant a key is pressed** while the server stays the final
authority — by running the *identical* compiled `game-core` rule locally and reconciling against the
authoritative stream. M3 delivers the **prediction layer** only: the JS-consumable `client-wasm` API, the
`convert` marshaling boundary (including the no-clock-sync time rebasing), and the **Predictor** (a local
intent queue + `reconcile` + `drain`). It does **not** connect, subscribe, render, capture input, or run
the per-frame loop — those are M4 and *consume* this layer. Because M0/M1 already build the wasm and the
native==wasm parity eval, M3's new surface is the *frontend-consumable* API + the Predictor, both
headlessly unit-testable (vitest/fast-check) against a faked authoritative stream. Success = a tested
Predictor whose prediction converges to authority with no visible jolt, proven without a live server or a
canvas.

## 2. Scope

**In scope**
- **`client-wasm` JS API** (the thin marshaling boundary; *no game rules here*): a `#[wasm_bindgen]`
  `apply_move(state, input, now) -> CharacterState` that deserializes JS → `game-core` types via
  `serde_wasm_bindgen`, delegates to `game_core::apply_move`, and serializes back; exported constants
  `step_ms()`/`move_queue_cap()` so TS never hard-codes them; **a `zone_map(zone_id)` export** returning the
  `game-core` `TileMap` so the M4 renderer draws the *same* map bytes the rule uses (single-sourced — a
  hard-coded TS map would visually desync, e.g. a wall the rule doesn't have); a `#[wasm_bindgen(start)]`
  panic-hook init; `--target bundler` build consumed by Vite (`vite-plugin-wasm` + `vite-plugin-top-level-
  await`); an `isWasmReady()` gate. (No `spawn()` export — the client never spawns; the server places it.)
- **`convert.ts` marshaling boundary** (`frontend/src/convert/`): translate between the SpacetimeDB SDK
  binding shapes (camelCase, `bigint` ids, tagged-union enums `{tag:"West"}`) and the wasm/serde shapes
  (plain strings/numbers), for `Direction`/`MoveInput`/`CharacterState`/`move_queue`. Includes the
  **time-rebasing** `characterToPredictedBaseline(row, localNow, stepMs)`. Entity ids stay `bigint`
  (never downcast to `number`); only bounded-magnitude `CharacterState` fields cross to wasm as numbers.
- **The `Predictor`** (`frontend/src/prediction/`): `predicted: CharacterState`, a local intent `queue`,
  `pending: {seq, op}[]` where **`op` is a queue-operation** (`Enqueue(MoveInput)` | `SetMove(MoveInput)` |
  `Clear`), and `nextSeq`. Methods: `enqueue/setMove/clearQueue` (assign `seq`, mutate the local queue,
  record the op in `pending`, surface the intent+`seq` for M4 to send), `reconcile(authBaseline, authQueue,
  ackedSeq, now) -> boolean`, `drain(now)`, and read-accessors `pendingCount`/`queueDepth`/`lastQueuedDir`.
  The Predictor is **uninitialized until the first authoritative own-row seeds it** (via `reconcile`).
- **Tests:** vitest + **fast-check** for `convert` (round-trip + rebasing clamps) and the `Predictor`
  (ack-drop, op-replay on the server queue, divergence-return, drain cadence + time-gap catch-up,
  convergence/idempotence properties) against a *faked* authoritative stream; the **JS-path parity** check
  (marshaled wasm `apply_move` == native) extending the M0/M1 harness; a **no-logic-in-wrapper** eval.

**Out of scope (named deferrals → M4 unless noted)**
- **Connect / subscribe / `DbConnection`** and the **`AuthoritativeStore`** (subscription mirror) → M4.
- **PixiJS rendering, sprite pooling, sub-tile interpolation, remote-entity interpolation** → M4.
- **Input capture + the per-frame game loop** (input→Predictor→net; subscription→store→reconcile) → M4;
  the **debug HUD** and **screen routing** → M4.
- **Two-window browser e2e** → M5.
- Battles/monsters/etc. use **no prediction** (server-resolved) → not this layer, ever (ADR-0011/0012).

## 3. Acceptance criteria (EARS)

**WASM bridge (`client-wasm`)**
- WHEN `apply_move(state, input, now)` is called from JS THE SYSTEM SHALL deserialize the JS values to
  `game-core` types, call `game_core::apply_move`, and return the resulting `CharacterState` — with **no
  game logic** in the wrapper (only marshal → delegate → marshal).
- IF `client-wasm` source contains a movement rule (a `match` on `Direction`, a walkability check, etc.)
  THEN the no-logic-in-wrapper architecture eval SHALL fail.
- THE SYSTEM SHALL export `step_ms()` and `move_queue_cap()` from wasm so TS reads them from the single
  `game-core` source rather than hard-coding values.
- THE SYSTEM SHALL export the zone map (`zone_map(zone_id)` → `TileMap`) from wasm so the renderer draws the
  same map the rule evaluates; the client reads it **once on init** (the map is static), never per frame,
  and never hard-codes tile data in TS. IF the TS renderer hard-codes map geometry THEN review SHALL reject
  it (visual-SSOT; at M11 this may shift to a subscribed map table when zones become RON data).
- WHEN the wasm module loads THE SYSTEM SHALL install a panic hook and expose `isWasmReady()`; calling an
  export before init resolves is a caller error the M4 loop prevents by gating on readiness.
- IF a non-integer or out-of-range time value is marshaled into `Millis` THEN serde SHALL reject it; the TS
  side SHALL `floor` (and clamp ≥ 0) before crossing the boundary.

**Marshaling (`convert.ts`)**
- WHEN a faithful conversion (`Direction`/`MoveInput`/`CharacterState`/`move_queue`) is applied to the wasm
  shape and back THE SYSTEM SHALL recover an equal value (round-trip property), handling tagged-union enums
  and `bigint` ids correctly; entity ids SHALL remain `bigint` (never downcast to `number`).
- WHEN `characterToPredictedBaseline(row, localNow, stepMs)` rebases `move_started_at` THE SYSTEM SHALL set
  it to `max(0, floor(localNow) - 2*stepMs)` — a *local-time* baseline "two steps ago" so the first queued
  move is immediately due — never feeding the raw server epoch into the local drain. (This conversion is
  lossy by design and is not round-tripped.)
- THE SYSTEM SHALL keep `convert` dumb and explicit (no clever shared abstraction across the marshaling
  boundary — "DRY, but not across marshaling boundaries").

**Predictor (ADR-0012)**
- WHEN the player inputs a move THE SYSTEM SHALL assign a strictly increasing `seq`, mutate the **local
  intent queue** (`enqueue` appends, `setMove` replaces it with the single op, `clearQueue` empties it),
  record `{seq, op}` in `pending`, and surface the intent (+`seq`) for M4 to send. Input updates the
  *queue*, not `predicted` directly; `drain` advances `predicted`.
- WHEN an authoritative own-row update arrives THE SYSTEM SHALL `reconcile`: (1) drop `pending` with
  `seq ≤ ackedSeq`; (2) rebuild the local queue from the server's `authQueue`, then **replay the still-
  unacked pending ops** onto it (`Enqueue` appends, `SetMove` replaces, `Clear` empties); (3) reset
  `predicted` to the rebased authoritative baseline; (4) `drain(now)` forward.
- WHEN reconciliation completes THE SYSTEM SHALL return `true` iff the corrected tile differs from the
  pre-reconcile predicted tile (a genuine server disagreement) and `false` when prediction was correct — so
  the M4 loop can clear the committed direction and re-issue a held key (the documented v1 stall bug).
- WHEN `drain(now)` runs THE SYSTEM SHALL apply each due queued move via wasm `apply_move`, advancing
  logical time by `step_ms` per applied move (not snapping to `now`), so a large local time gap (a
  backgrounded tab) catches up as discrete one-tile steps rather than a teleport; the last applied move's
  `move_started_at` ends within `step_ms` of `now`.
- THE SYSTEM SHALL NOT predict before it is seeded; the first authoritative own-row `reconcile` SHALL
  initialize `predicted`.
- THE SYSTEM SHALL expose `pendingCount`/`queueDepth`/`lastQueuedDir` so the M4 loop can flow-control
  against `MOVE_QUEUE_CAP` (`authQueue.len + pendingCount < cap`) and avoid issuing duplicate directions.

**Predictor properties (fast-check)**
- WHEN `reconcile` is given an authoritative state that already equals the prediction (no message loss)
  THE SYSTEM SHALL return `false` (convergence — agreement never reports divergence).
- WHEN `reconcile` is applied twice with the same authoritative update THE SYSTEM SHALL be idempotent
  (the second call changes nothing and returns `false`).

**Netcode smoothness (ADR-0013) — *feel*, not just correctness**
- THE SYSTEM SHALL run `reconcile` only on a **transaction-consistent** snapshot of `(last_input_seq,
  character incl. move_queue, position)` — never on a half-applied update batch (prevents rubberband). M3
  exposes a `reconcile` that takes one coherent snapshot; M4's store provides the per-transaction trigger.
- THE SYSTEM SHALL bound prediction so `predicted` never leads authority by more than
  `MOVE_QUEUE_CAP + pendingCount`; WHEN the local time gap since the last `drain` exceeds `N·step_ms`
  (backgrounded tab) THE SYSTEM SHALL surface a **snap** signal so M4 jumps the render to `predicted`
  rather than animating the backlog.
- WHEN `reconcile` agrees with the prediction THE SYSTEM SHALL NOT change the predicted tile (monotonic
  prediction — the predicted tile never moves backward along the input path except on a genuine divergence;
  enforced as a smoothness eval with a proof-of-teeth fixture).
- WHEN the player bumps a wall (a `Step` into a non-walkable tile) THE SYSTEM SHALL end with **predicted
  position == authoritative position** after reconcile (the canonical desync regression net — v1's "single
  most valuable assertion"; covered headlessly in M3 and again in the M5 two-window e2e).
- THE own-character renderer SHALL NOT consume `move_started_at` for animation (M4 uses a self-owned slide
  clock, ADR-0013) — `move_started_at` is drain-pacing bookkeeping only; M3 documents this for M4.

**Parity & determinism (ADR-0003)**
- WHEN the same input sequence is applied through native `game-core` and through the **marshaled JS wasm
  path** from the same initial state THE SYSTEM SHALL produce identical `CharacterState` sequences
  (JS-path parity eval — catches a *marshaling* bug, not just a build bug).

**Proof-of-teeth (ADR-0010)**
- THE SYSTEM SHALL ship fixtures proving each new gate bites: a wrapper-with-logic fails the no-logic eval;
  a fractional `now` is rejected at the boundary; a `reconcile` that ignores `authQueue` (or treats
  `pending` as raw moves rather than ops) diverges in the paced-drain scenario so the test catches it.

## 4. Plan (high level)

Thin wasm boundary + a TS Predictor; all rules remain `game-core`. Sketches:

```rust
// client-wasm/src/lib.rs — marshal at the edge, delegate in the center, marshal back. NO rules.
#[wasm_bindgen]
pub fn apply_move(state: JsValue, input: JsValue, now: f64) -> Result<JsValue, JsValue> {
    let state: CharacterState = serde_wasm_bindgen::from_value(state)?;
    let input: MoveInput = serde_wasm_bindgen::from_value(input)?;
    let next = game_core::apply_move(&state, input, &game_core::zone_0(), Millis(now.floor().max(0.0) as i64));
    Ok(serde_wasm_bindgen::to_value(&next)?)
}
#[wasm_bindgen] pub fn step_ms() -> u32 { game_core::STEP_MS as u32 }
#[wasm_bindgen] pub fn move_queue_cap() -> u32 { game_core::MOVE_QUEUE_CAP as u32 }
#[wasm_bindgen] pub fn zone_map(zone_id: u32) -> Result<JsValue, JsValue> {  // renderer's map source (read once)
    Ok(serde_wasm_bindgen::to_value(&game_core::zone_0())?)  // zone_id reserved for M11 multi-zone
}
#[wasm_bindgen(start)] pub fn main() { console_error_panic_hook::set_once(); }
```

```typescript
// frontend/src/prediction/predictor.ts
type QueueOp = { Enqueue: MoveInput } | { SetMove: MoveInput } | { Clear: true };
class Predictor {
  predicted?: WasmCharacterState;                 // undefined until first own-row seeds it
  reconcile(authBaseline, authQueue, ackedSeq, now): boolean {  // ADR-0012 four-step
    this.#pending = this.#pending.filter(p => p.seq > ackedSeq);            // 1 drop acked
    let q = [...authQueue]; for (const p of this.#pending) q = applyOp(q, p.op); // 2 replay OPS on server queue
    this.#queue = q; const before = this.predicted?.pos; this.predicted = authBaseline; // 3 reset to truth
    this.drain(now);                                                       // 4 re-drain forward
    return !!before && (this.predicted.pos.x !== before.x || this.predicted.pos.y !== before.y);
  }
}
```

Key contracts:
- **Identical compiled rule, three homes** — server (M2), native tests (M1), browser prediction (here). The
  wrapper has no logic; an eval enforces it (v1 left this to discipline).
- **`pending` holds queue *ops*, not raw moves** — so a `SetMove` issued mid-flight replays as a *replace*
  during reconcile, not an append; getting this wrong silently mispredicts during the paced drain.
- **Why divergence is rare** — client and server share the *same* map (`zone_0`) and rule, so walkability
  *never* mispredicts. `reconcile` returns `true` only on message loss/reorder, a teleport/warp, or a
  server rejection the client didn't model — and snapping-to-truth + op-replay handles all of them.
- **No clock sync; rebase at the boundary** (ADR-0012) — server `move_started_at` is epoch ms; the local
  drain uses `performance.now()` (starts at 0). `characterToPredictedBaseline` rebases to "two steps ago";
  `floor` is required (a fractional value fails the integer `Millis` serde), `max(0)` is a sane-baseline
  logic clamp (with M1's `i64` Millis it is no longer a serde requirement as it was for v1's `u64`).
- **`drain` advances logical time by `step_ms` per move** (not to `now`), giving deterministic catch-up
  after a backgrounded tab and matching the server cadence; reconciliation bounds any residual error.
- **Boundary types:** ids are `bigint` end-to-end (no `number` downcast → no precision loss); `seq` is a
  session-monotonic integer (a session won't exceed 2^53 moves), converted to the reducer's `u64` when
  sent and compared to the `bigint` ack via relational operators (or normalized to one type).

**Boundary preview — what M4 will consume:**
- `isWasmReady()` to gate the loop; `step_ms()` for pacing; `convert.ts` (`characterToWasm` for rendering,
  `characterToPredictedBaseline`/`moveQueueToWasm` for reconcile, `*ToSdk` for sending intent).
- M4 identifies the **own** character: connection `identity` → `player` row → `entity_id` → `character`
  row; it seeds/reconciles the Predictor from that row only, and gates the loop on (wasm ready AND own row).
- The `Predictor` API: input → `enqueue`/`setMove`/`clearQueue` (+ send `seq` to M2 reducers); on a
  **per-transaction batch applied** (not per-row), once → `reconcile(coherentSnapshot)` → if diverged,
  clear the committed direction; per frame → `drain(now)`.
- **Rendering (ADR-0013, built in M4):** the **own** character animates from a **self-owned slide clock**
  keyed to target-tile changes (it does *not* read `move_started_at`); a no-divergence reconcile leaves the
  tile unchanged ⇒ no slide restart ⇒ no stutter. **Remote** characters render through an **interpolation
  delay buffer** (`now − interpDelay`, between the two latest snapshots) — never slid raw from `receivedAt`.
  On the `drain` snap signal, the render jumps instead of animating a backlog. Store keyed by `bigint`
  entity id, keeping a 2-snapshot history per entity for interpolation. The tile layer is drawn from
  `zone_map()` read once from wasm (not hard-coded in TS).
- Flow-control: `authQueue.len + pendingCount < cap`; move-reducer rejections are normal (M2 §3), absorbed.

## 5. Tasks (vertical slices — M3a bridge, M3b predictor)

**M3a — wasm bridge + marshaling**
- [ ] `client-wasm` JS API: `apply_move` (serde_wasm_bindgen), `step_ms`/`move_queue_cap`/`zone_map` exports, panic-hook `start`.
- [ ] Vite wasm consumption (`vite-plugin-wasm` + top-level-await), `isWasmReady()` gate; build wired into the frontend.
- [ ] `convert.ts`: SDK↔wasm for `Direction`/`MoveInput`/`CharacterState`/`move_queue` (ids stay `bigint`) + round-trip tests.
- [ ] `characterToPredictedBaseline` rebasing + clamp tests (fractional/negative `now`).
- [ ] no-logic-in-wrapper architecture eval + proof-of-teeth fixture; JS-path parity eval.

**M3b — Predictor**
- [ ] `Predictor` state + `enqueue`/`setMove`/`clearQueue` (seq assignment, **queue-op** recording, local queue mutation).
- [ ] `reconcile` (4-step, op-replay) + divergence-return; `drain` (step_ms-paced catch-up); seed-on-first-own-row; accessors.
- [ ] vitest + fast-check: ack-drop, op-replay, divergence true/false, drain cadence + time-gap, convergence/idempotence.
- [ ] doc-keeper: changelog + memory; link the prediction layer in `ARCHITECTURE.md`.

## 6. Risks / decisions

- **`pending` = queue ops, not raw moves** (decided this pass) — required for correct `SetMove`/`Clear`
  replay; a proof-of-teeth fixture catches the "raw moves" mistake.
- **`drain` catch-up** — advance by `step_ms` per move (not to `now`) so a backgrounded-tab time gap catches
  up as discrete steps; exact catch-up-all vs one-per-frame is tunable, with a time-gap test either way.
- **`seq` boundary type** — session integer on the client; converted to `u64` for reducers; ack compared via
  relational operators. Ids stay `bigint` to avoid precision loss.
- **WASM async init** — exports throw before init; M4 gates on `isWasmReady()`. **Rebuild-wasm-after-
  `game-core`-change** — a stale wasm silently runs the old rule; the **wasm build + parity eval run in CI**
  (M0) so this is caught.
- **`--target bundler` + Vite plugins** — needs `vite-plugin-wasm` + `vite-plugin-top-level-await` (one-time
  config); confirm against current plugin versions.
- **Predictor test isolation** — reconcile tested against a faked auth stream; `apply_move` may be real wasm
  or mocked (the rule is tested in Rust at M1), so vitest stays node-only.
- Open: the rebase offset (`2*stepMs`) and whether `clearQueue` carries a `seq` → settle in the loop
  (leaning yes, for consistent ack/replay).

## 7. Review / red-team notes

### v1 tutorial harvest (M2/M3 re-read)
Re-read the foundational "three big bets" and the integration-test sections to check for un-applied
M2/M3 concepts. Most confirmed existing coverage; one genuine gap found and fixed:
- **Export the zone map from wasm** (`zone_map()`) so the M4 renderer draws the *same* map the rule
  evaluates — v1 exported `poc_map()` for exactly this; my rev-1..3 omitted it. A hard-coded TS map would
  **visually desync** (the rendering-layer cousin of netcode desync). Added to the wasm API + a
  visual-SSOT review gate; read once on init.
- **Adopted v1's "single most valuable assertion"** as a named golden case: after a wall bump,
  **predicted == authoritative** — the canonical desync regression net, asserted headlessly (M3) and in the
  M5 two-window e2e.
- Confirmed (no change): Bet 3's rubber-band-from-logic-disagreement is already designed out by the shared
  rule; the dev-only `window.__game()` introspection hook + `--delete-data` known-preconditions are M5
  testing hygiene already noted; RLS is "experimental in 2.6" — a version flag carried to M6 (no M2/M3 RLS).

### Netcode-quality review (`netcode-quality-review.md`, ADR-0013)
Targeting v1's stutter/skip/rubberband. Added the **netcode smoothness** criteria: the **atomic
(transaction-consistent) reconcile snapshot** (closes the rubberband-from-partial-update race); the
**bounded prediction + snap-on-large-gap** (closes own-character skip-ahead); the **monotonic-prediction**
smoothness eval; and the contract that the **own renderer ignores `move_started_at`** (decoupled slide
clock, built in M4). Expanded the M4 boundary preview with the **interpolation delay buffer** for remote
entities (the chief cause of v1's remote stutter) and the per-transaction reconcile trigger. New ADR-0013
records these as accepted decisions; PLAN updated.

### Pre-M4 hardening (reviewer + red-team + simplify)
- **`pending` holds queue ops** (`Enqueue`/`SetMove`/`Clear`), and `reconcile` replays *ops* onto the server
  queue — the key correctness fix (a mid-flight `setMove` must replay as a replace, not an append).
- **`drain` catch-up** pinned (advance by `step_ms`/move, not to `now`) for deterministic backgrounded-tab
  recovery; input mutates the *queue*, `drain` advances `predicted` (corrected an imprecise rev-1 phrasing).
- **Predictor lifecycle** — uninitialized until the first own-row seeds it; M4 gates on (wasm ready AND own row).
- **Dropped the `spawn()` wasm export** (YAGNI — the client never spawns; the server does).
- **Boundary types** — ids stay `bigint` (no precision loss); `seq` type pinned across the reducer/ack boundary.
- **Why divergence is rare** recorded (shared map+rule ⇒ walkability never mispredicts) — clarifies what
  reconcile actually covers (loss/reorder/teleport/unmodeled-rejection).
- **fast-check property tests** added (reconcile convergence + idempotence).
- **M4 boundary preview** expanded (own-character identification, reconcile trigger, post-reconcile slide).
- **ADRs/plans:** one consequence added to ADR-0012 (pending = ops; drain step_ms-paced). No new ADR; PLAN
  unchanged (M3 line already points here).

### Tutorial harvest (`tutorial-DrEnc_Nk.js`, M3 + marshaling)
Adopted: the tiny `apply_move` marshaling wrapper (`serde_wasm_bindgen`, no rules); re-exported constants;
`--target bundler` + the honest Vite-plugin caveat; the `#[wasm_bindgen(start)]` panic hook + async-init
gate; `convert.ts` kept dumb (DRY-not-across-marshaling); the **time-rebasing** baseline and *why* (no clock
sync); the four-step `reconcile` + the **divergence-return** (the documented v1 stall bug). v2 upgrades:
**no-logic-in-wrapper** becomes a mechanical eval; the **JS-path parity** eval catches a marshaling
divergence, not just a build one.

### Simplify
Deferred net/store/render/input/loop/HUD/routing to M4; battles never predict. M3 stays the prediction
layer, unit-testable headlessly — the user sees nothing until M4, same as M1/M2.
