# Spec: M1 — Movement core (pure `game-core`, test-first)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0 (gates + harness)
**Decisions:** ADR-0003 (shared rule core), 0005 (single repo), 0006 (content-sync),
0007 (zoned), 0010 (proof-of-teeth). Builds on the M0 determinism/safety/parity gates.
**Workflow:** plan → design → draft → review/red-team → tutorial harvest → pre-M2 hardening (see §7).
Built **test-first** (TDD): the §3 acceptance criteria are the source for the `tester` subagent's failing
tests; the implementing agent does not author the gating tests (`testing-tdd.md`).

## 1. Problem / intent

Deliver the **one movement rule** that the server (M2) and the client predictor (M3) will both call —
pure, deterministic, integer-tile, and totally tested — so prediction can never numerically diverge from
authority. M1 builds *only* the `game-core` rule + its zone-tagged map + the determinism and prediction-
parity evals. It writes no reducer, no move queue, no predictor, and no rendering; those are M2/M3/M4 and
call this rule. Success = `apply_move` is a genuinely total, deterministic function with full behavioral
+ property coverage, runs **byte-identically native and in wasm** (parity eval), exposes the exact surface
M2 needs, and registers under the existing M0 gates with proof-of-teeth.

## 2. Scope

**In scope (`game-core` only)**
- Movement value types (`Direction`, `TilePos`, `Millis`, `ActionState`, `MoveInput`, `TileKind`,
  `CharacterState`) — deriving `SpacetimeType` **only** under the `spacetimedb` feature (M2 stores them;
  `client-wasm` builds without it — M0 feature-isolation / ADR-0003). `Millis` is **`i64` ms since the
  unix epoch** (round-trips SpacetimeDB `ctx.timestamp`; matches the M2 `*_ms` columns), deriving `Ord`.
- A **zone-tagged `TileMap`** (`zone_id` + `width`/`height` + a row-major walkability grid). The single M1
  zone is **hand-authored string-art returned from a `const`-style function** (`zone_0()`), *not* loaded
  from a file — exactly one zone until M11 (YAGNI, named exception; ADR-0008 adds Tiled→RON then, and the
  swap is localized to this function). `in_bounds`/`is_walkable` are bounds-safe lookups.
- An **authoritative spawn** for the M1 zone (`spawn()` → a guaranteed-walkable `TilePos`), so the server
  (M2) and tests read the spawn from one source instead of hard-coding it.
- The total rule **`apply_move(state, input, map, now) -> CharacterState`**: `Step` (move or bump) and
  `Jump` (hop or hop-in-place), stamping `move_started_at`.
- The movement constants the M2 server tick/queue consumes: `STEP_MS` (start value **200**) and
  `MOVE_QUEUE_CAP` (start value **2**), defined **once**, here.
- A thin `client-wasm` **export of `apply_move`** and a **movement prediction-parity eval** (native ==
  wasm) extending the M0 trivial-rule harness, with proof-of-teeth fixtures (ADR-0010).
- Unit + **property tests** (`proptest`) for every behavior and invariant; determinism + totality.

**Out of scope (named deferrals — declared, not dropped)**
- The server **move queue + per-tick drain + reducers + `last_input_seq` ack** → M2.
- **Client prediction / reconciliation / pending-input queue / `seq`** → M3.
- **Rendering, sub-tile interpolation, input capture** → M4.
- **NPC movement (`npc_decide`)** → **M12** (NPCs/dialogue, where the NPC entity first exists —
  grow-not-speculate; refined from "M2" once M2's scope was drawn).
- **Map file loading / multiple zones / cross-zone warps / Tiled authoring** → M11 (ADR-0008).
- **Tall grass / encounters** → M8 (`TileKind` starts `{Floor, Wall}`; `TallGrass` is added then, and the
  exhaustive `match` will flag every site — intended, OCP-inverted per principles).

## 3. Acceptance criteria (EARS)

> Each becomes a `tester` test/property. `now` is always the injected `Millis`, never a wall clock. Tests
> read `STEP_MS`/`spawn()` from their authoritative source — never hard-code them (a v1 pitfall).

**Step**
- WHEN a `Step(dir)` is applied and the tile one step in `dir` is in-bounds and walkable THE SYSTEM SHALL
  move the character one tile in `dir`, set `facing = dir`, `action = Walking`, and `move_started_at = now`.
- WHEN a `Step(dir)` is applied and that tile is out-of-bounds or non-walkable THE SYSTEM SHALL keep the
  character's position, set `facing = dir`, and set `action = Idle` (a bump is a legal no-op, not an error;
  you always turn to face, even into a wall).
- WHEN any `Step` is applied THE SYSTEM SHALL change the character's position by at most one tile.

**Jump**
- WHEN a `Jump` is applied and the tile one step in the current `facing` is in-bounds and walkable THE
  SYSTEM SHALL move the character one tile in `facing`, set `action = Jumping`, `move_started_at = now`,
  and leave `facing` unchanged.
- WHEN a `Jump` is applied and that tile is out-of-bounds or non-walkable THE SYSTEM SHALL keep the
  character's position, set `action = Jumping` (hop in place), and leave `facing` unchanged.

**Totality, determinism & invariants (`proptest`)**
- WHEN `apply_move` is called with ANY `(state, input, map, now)` — including `TilePos` coordinates near
  the `i32` bounds — THE SYSTEM SHALL return a `CharacterState` and SHALL NOT panic or error (total).
- WHEN `apply_move` is called twice with identical `(state, input, map, now)` THE SYSTEM SHALL return
  identical output (determinism).
- WHEN `apply_move` resolves THE SYSTEM SHALL stamp `move_started_at = now` on every call (move, bump, or
  hop-in-place); the renderer reads it only while `action ∈ {Walking, Jumping}` and the M3 reconciler
  never diffs it.
- THE SYSTEM SHALL hold these invariants for all inputs: a *successful* `Step(dir)` ends at
  `old.pos.step(dir)` which is walkable; a *bump* leaves `pos` unchanged; after any `Step` `facing` equals
  the input `dir`; `pos` never changes by more than one tile; the result `pos` is always in-bounds for
  `map` (`debug_assert!`).
- WHILE resolving movement THE SYSTEM SHALL read no wall clock and no RNG (M0 workspace-wide clippy guard).

**Map (zone-tagged, bounds-safe)**
- WHEN the M1 zone is constructed (`zone_0()`/`from_rows`) THE SYSTEM SHALL produce a `TileMap` carrying
  `zone_id`, `width`, `height`, and a row-major walkability grid of length `width × height`.
- IF the authored rows are ragged or contain an unknown tile char THEN construction SHALL fail loudly at
  that single site (parse-don't-validate; not a silent default) — a proof-of-teeth fixture confirms it.
- THE SYSTEM SHALL guarantee `spawn()` returns an in-bounds, walkable tile of the M1 zone (unit test — a
  character must be placeable).
- WHEN `is_walkable` / `in_bounds` is queried for an out-of-bounds tile THE SYSTEM SHALL return `false`
  via a checked `get(..).unwrap_or(false)` (an out-of-range tile is a wall, never a panic — M0 safety gate).

**Boundary marshaling**
- WHEN any cross-boundary value type is serialized and deserialized THE SYSTEM SHALL recover an equal value
  (serde round-trip identity property — the wire contract the WASM/TS and STDB boundaries depend on).

**Prediction parity (ADR-0003)**
- WHEN an identical input sequence is applied from the same initial `(state, map)` through the native build
  and the `wasm-pack` build THE SYSTEM SHALL produce identical `CharacterState` sequences (movement
  prediction-parity eval, extending the M0 harness; movement has no RNG, so no seed is involved).

**Contracts / constants**
- THE SYSTEM SHALL expose `STEP_MS`, `MOVE_QUEUE_CAP`, and `spawn()` as `game-core` items, defined once,
  for the M2 tick/queue/spawn to consume.
- THE SYSTEM SHALL keep `apply_move` the SOLE movement rule (SSOT); no movement logic in a reducer or in
  TypeScript (verified by review; M2/M3 call this function).
- THE SYSTEM SHALL keep `MoveInput` free of any position-bearing variant, so a client physically cannot
  assert "I am at tile (x,y)" — only intent crosses the wire (make illegal states unrepresentable).

**Gate extension / proof-of-teeth (ADR-0010)**
- WHEN the movement rules land THE SYSTEM SHALL register them under the existing determinism + parity evals
  with proof-of-teeth fixtures: a clock-reading variant fails the determinism gate; a wasm-divergent
  variant fails the parity gate; a ragged-map fixture fails construction.

## 4. Plan (high level)

Functional-core, test-first. API sketch (contract-level; signatures may refine in the loop):

```rust
// game-core/src/types.rs
pub struct Millis(pub i64);                 // ms since unix epoch; derive PartialOrd+Ord.
                                            // Round-trips ctx.timestamp; confirm conversion vs STDB docs @ M2.
pub enum Direction { North, South, East, West }
pub struct TilePos { pub x: i32, pub y: i32 }
impl TilePos {
    /// Saturating, never wrapping: an extreme coord stays at the i32 bound (an out-of-range tile, which
    /// is_walkable treats as a wall -> bump), so apply_move is TOTAL over arbitrary state. wrapping_add
    /// would be a bug (it could teleport to a valid in-bounds tile).
    pub fn step(self, d: Direction) -> TilePos;
}

// game-core/src/world/mod.rs
pub enum ActionState { Idle, Walking, Jumping }
pub enum MoveInput  { Step(Direction), Jump }       // NO position variant — intent only.
pub enum TileKind   { Floor, Wall }                 // grows: TallGrass @ M8
pub struct TileMap  { pub zone_id: u32, pub width: i32, pub height: i32, walkable: Vec<bool> }
impl TileMap {
    pub fn from_rows(zone_id: u32, rows: &[&str]) -> TileMap;  // '#'=wall, '.'=floor; ragged => fail loud
    pub fn in_bounds(&self, p: TilePos) -> bool;
    pub fn is_walkable(&self, p: TilePos) -> bool;            // in_bounds && get(..).unwrap_or(false)
}
pub fn zone_0() -> TileMap;            // the single M1 zone (zone_id = 0); const until M11 (ADR-0008)
pub fn spawn()  -> TilePos;           // authoritative, guaranteed-walkable spawn for zone_0

pub struct CharacterState { pub pos: TilePos, pub facing: Direction,
                            pub action: ActionState, pub move_started_at: Millis }

/// Total, pure, deterministic. A bump/blocked-jump is a legal no-op, never an Err.
pub fn apply_move(state: &CharacterState, input: MoveInput, map: &TileMap, now: Millis) -> CharacterState;

pub const STEP_MS: i64 = 200;        // server tick cadence / step duration (one tile / STEP_MS ms)
pub const MOVE_QUEUE_CAP: usize = 2; // bounded move-buffer (M2 anti-flood; cadence is the real limit)
```

Key design contracts:
- **Integer tiles only** — `TilePos` is `i32`; no floats in the rule, so client/server can't *numerically*
  diverge (float math isn't bit-identical across the native and wasm builds — FMA fusion, fast-math,
  transcendentals — and drift accumulates). Sub-tile sliding is computed only in the M4 renderer.
- **`step` saturates, never wraps** — the precise choice that makes `apply_move` total over *arbitrary*
  `CharacterState` without a debug-overflow panic, and without a wrap-around teleport.
- **`move_started_at` is bookkeeping/ordering, not an interpolation clock** — stamped from `now` on every
  call; M3's reconciler compares `pos`/`facing`/`action` only.
- **`CharacterState` is zone-agnostic** — the entity's `zone_id` lives on the table (M2); `apply_move`
  works within the single `TileMap` it is handed. Cross-zone warps are M11.
- **Feature-gated types** — `SpacetimeType` derives only under `spacetimedb`; the M0 `resolver = "2"`
  workspace + feature-isolation eval guard against leakage.

**Boundary preview — what M2 will consume (so M2 drafts against a frozen surface):**
- M2 calls `apply_move` unchanged at queue-drain time with `now = ctx.timestamp → Millis`; `seq`/queue
  metadata wrap the rule, never enter it.
- M2 **flattens `CharacterState` into `character`-table columns** (`tile_x`,`tile_y`,`facing`,`action`,
  `move_started_at_ms`) through a thin `convert` seam — it is *not* stored as one opaque column — so the
  shared types stay the SSOT while the table stays queryable/indexable (incl. the `zone_id` index, ADR-0007).
- M2 consumes `MoveInput` as the `enqueue_move`/`set_move` reducer argument, `STEP_MS`/`MOVE_QUEUE_CAP` for
  the tick cadence + bounded buffer, and `spawn()` to place a new character.
- `zone_0()` generalizes to a `map_for(zone_id)` lookup when zone #2 arrives (M11); M2 may introduce that
  seam with a single entry today.

## 5. Tasks (small vertical slices — one mergeable behavior each)

- [ ] Value types (`Direction`/`TilePos`/`Millis`(i64,+`Ord`)/`ActionState`/`MoveInput`/`TileKind`/`CharacterState`) + `SpacetimeType` under feature; serde round-trip property test; `TilePos::step` saturating + property test.
- [ ] `TileMap` + `from_rows` (string-art, ragged⇒fail) + `zone_0()` + `spawn()` (zone_id-tagged, guaranteed-walkable) + bounds-safe `in_bounds`/`is_walkable`; construction invariants + spawn-walkable test.
- [ ] `apply_move` **Step** (move + bump) — test-first from the Step criteria.
- [ ] `apply_move` **Jump** (hop + hop-in-place) — test-first from the Jump criteria.
- [ ] Totality + determinism + invariant property tests (`proptest`, incl. extreme coords) + `debug_assert!` in-bounds.
- [ ] `STEP_MS` / `MOVE_QUEUE_CAP` constants (single definition site).
- [ ] `client-wasm`: export `apply_move`; movement prediction-parity eval (native == wasm) + proof-of-teeth fixtures (clock-reading, wasm-divergent, ragged-map).
- [ ] doc-keeper: changelog + memory; link the movement core in `ARCHITECTURE.md`.

## 6. Risks / decisions

- **Map source = `const` string-art (NOT a data file)** — exactly one static zone at M1; ADR-0007's
  "zoned from day one" is met by zone-tagging *entities*, not by making one map's geometry a file. RON/Tiled
  arrives at M11 (ADR-0008); the swap is localized to `zone_0()`. (Set in rev 2 from the v1 tutorial's YAGNI
  verdict.)
- **`Millis` = `i64` ms since the unix epoch** (RESOLVED, was open) — round-trips SpacetimeDB `ctx.timestamp`
  and matches the v1 `*_ms` table columns; derives `Ord`. Confirm the exact `ctx.timestamp → ms` conversion
  against current STDB docs when M2 wires it (version-sensitive).
- **`TilePos::step` saturates** — chosen over plain `+` (debug-overflow panic on extreme coords would break
  the totality guarantee under `proptest`) and over `wrapping_add` (a wrap could teleport to a valid tile).
- **`npc_decide` deferred to M2** — movement logic, but speculative before the NPC entity exists.
- **Jump kept** for input-enum completeness + v1 parity (cheap; second `MoveInput` variant). Cut it for a
  Step-only M1 if you prefer — say so.
- **`TileKind` minimalism** — `{Floor, Wall}` now; new kinds arrive with their milestone and the exhaustive
  `match` deliberately breaks (compiler-flags every site).
- Open: the M1 zone's dimensions/layout and the exact `STEP_MS` → data, tunable in the loop.

## 7. Review / red-team notes (lens history)

### Pre-M2 hardening (reviewer + red-team + simplify)
- **Red-team (latent panic):** `TilePos::step` must use **`saturating_add`** so `apply_move` is genuinely
  total over arbitrary `CharacterState` (the totality `proptest` generates extreme coords that plain `+`
  would overflow). `wrapping_add` rejected (teleport). The single most important correctness fix this pass.
- **Reviewer (precision/coverage):** promoted the implicit behaviors to explicit **`proptest` invariants**
  (step-distance ≤ 1, bump-keeps-pos, facing==dir, result in-bounds); added a **serde round-trip** property
  (the wire contract); pinned **`move_started_at` is stamped on every call** (bump/hop included); added an
  authoritative **`spawn()`** so the server/tests read the spawn from one source (a v1 pitfall).
- **Reviewer (de-risk M2):** **RESOLVED `Millis` = `i64` unix-epoch ms** (was an open question) and added a
  **"what M2 will consume" boundary preview** — the `convert`/flatten seam, frozen `apply_move` call, and
  the `zone_0()→map_for(zone_id)` generalization — so M2 drafts against a stable surface.
- **Simplify:** kept the queue/predictor/NPC/warps/grass/render deferred; rejected adding a sim-harness
  movement scenario at M1 (it would duplicate the determinism `proptest`; the harness earns its keep at M2
  with a real server loop + latency/loss).
- **ADRs/plans:** no ADR change needed — these are spec-level (impl + data-model) refinements within the
  already-accepted ADR-0003/0007/0010 envelope; PLAN.md's M1 line already points here.

### v1 design-tutorial harvest
Applied from `tutorial-DrEnc_Nk.js`: map → `const` string-art (defer file loading to M11); `Millis` Ord;
`MoveInput` has no position variant (explicit criterion); `is_walkable` = `in_bounds` + `get().unwrap_or`;
tests read `STEP_MS`/spawn from source; start values `STEP_MS=200`,`MOVE_QUEUE_CAP=2`; float-determinism
rationale recorded.

### Lens pass (reviewer + red-team + simplify)
Red-team (integer tiles + injected `now` + native==wasm parity close numeric divergence; `move_started_at`
excluded from reconciliation; bounds-safe `is_walkable`); forward-compat (`apply_move` signature frozen for
M2/M3); simplify (queue/predictor/NPC/warps/grass/render deferred — M1 stays a dense, testable core).
