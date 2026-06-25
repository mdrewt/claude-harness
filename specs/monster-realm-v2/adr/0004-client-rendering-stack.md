# 0004. Client rendering stack
- Status: accepted
- Date: 2026-06-24
- Decided via: `/debate` (see PLAN.md "Debate 3"), ratified by Drew 2026-06-24

## Context and problem statement
v1 rendered with **PixiJS v8 + TypeScript** (2D top-down, pixel-art). The harness already vendors a full
PixiJS skill set (`templates/pixijs-game/.claude/skills/`) and a `pixijs-game` template, lowering cost.
v2 re-opens the choice given the "open re-evaluation" mandate. The renderer is the imperative shell — it
must never own authoritative state.

## Considered alternatives
- **PixiJS v8 (recommended)** — proven in v1; vendored skills + template; excellent 2D sprite/tilemap
  performance; clean separation from the rule core.
- **Phaser** — batteries-included game framework (input, tilemaps, scenes); heavier, more opinionated,
  no vendored skills.
- **Rust/`bevy` → wasm client** — one language end-to-end (shares `game-core` natively, no TS
  marshaling); larger wasm bundle, less mature web tooling, loses the PixiJS skill investment.
- **Custom WebGL/WebGPU** — maximal control; rejected as YAGNI for a 2D pixel-art game.

## Decision outcome
- Chosen: **PixiJS v8 + TypeScript** — wins decisively on bundle size (~200KB vs bevy/wasm's 15–30MB),
  2D pixel-art fit, and harness tooling (a full vendored PixiJS v8 skill set + template already exist).
  Render stays a pure view of authoritative + predicted state and never owns state.
- Rejected: bevy → wasm (1–2 orders more bundle weight, no wasm multithreading, discards the vendored
  skills; the single-language/no-bindings win is outweighed and the bindings boundary is already
  drift-gated in ADR-0009); Phaser (bigger builds, batteries don't help when net is STDB + rules are
  Rust); Defold (closed toolchain fights the workspace conventions); custom WebGL/WebGPU (YAGNI for 2D).
- Revisit trigger: a native/desktop client goal would reopen this (bevy's single-language win would then
  apply).
- Consequences: determines the `frontend/` shape; the TS↔Rust boundary stays thin and bindings-drift-
  gated.

## Art-tech evolution: flat pixel art now, HD-2D-ready (addendum)
**Decision:** ship the art as **detailed pixel art rendered flat**, but keep an upgrade path to **HD-2D**
(normal-mapped dynamic lighting + post-processing like bloom/depth-of-field/colour-grading + parallax — the
"2.5D lit pixel-art" look, all within PixiJS; *not* a 3D-environment renderer, which would reopen this ADR).
HD-2D is then an **additive, `render/`-only upgrade** (no game-core/server/netcode impact — the renderer is a
pure view, ADR-0013/0014), achievable by adding asset map-channels + a lighting/post pass via the PixiJS
ecosystem (`pixi-lights`-style normal maps, `pixi-filters`). The **dominant cost is art** (a normal map ±
height/emissive per asset ≈ 1.5–2× per-asset work), bounded by the lean content scope (game-design §5) and
mitigated by auto-normal-map tools.
**Three cheap, low-regret hedges adopted now (M4) so the upgrade wastes no effort:**
1. **Neutrally-lit assets** — author sprites/tiles flat/ambient with **no baked directional shadows**, so
   they are normal-map-ready (baked lighting would force a redraw later).
2. **Extensible renderer material model** — a sprite is "albedo" today but can carry normal/material channels;
   lighting + post-processing is an **additive render mode**, not a rewrite.
3. **Configurable visual resolution decoupled from the logical grid** — pixels-per-tile (`TILE_PX`) is one
   constant the renderer reads; `game-core` uses abstract **integer tiles** and is resolution-agnostic, so
   resolution can be chosen/raised freely without touching rules or netcode.
- Resolution roadmap (decided): **32×32 px tiles for the MVP**, with a planned upgrade to **48×48 or 64×64
  later** once there are art resources to spend. The engineering side is a one-constant change (`TILE_PX`);
  the art side is a **redraw at the higher resolution** (unlike HD-2D's *additive* normal maps, pixel art
  can't be losslessly upscaled) — so the resolution bump and the HD-2D pass should be done as **one art
  investment** when resources allow. Because the MVP art is already authored **neutrally-lit** (hedge #1), the
  later high-res redraw can go straight to HD-2D without a second pass.
