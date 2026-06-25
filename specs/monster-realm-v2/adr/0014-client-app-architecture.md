# 0014. Client app architecture (read-only store, one-way flow, no UI framework)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M4 design; load-bearing for M4 and every later client milestone (M6+ screens). Complements
  ADR-0004 (PixiJS renderer) and ADR-0013 (smoothness).

## Context and problem statement
The frontend ties together a 60 fps PixiJS canvas, a custom prediction/reconciliation loop, a SpacetimeDB
subscription model, and (later) menu UIs. It owns *no* game state — it is a view over authoritative truth.
The architecture must prevent the renderer/predictor from corrupting truth, keep the hot loop allocation-
free, and not fight a framework's lifecycle. The question: vanilla TS with a hand-driven loop, or a
framework?

## Considered alternatives
- **Vanilla TS: a read-only authoritative store + strict one-way data flow + DOM-overlay menus + a Pixi
  canvas, routed by a tiny enum `ScreenManager` (chosen).** State flows `server → store → render` and
  `input → predictor → net`; the store is written only by subscription callbacks; the renderer/predictor
  only read. Menus are plain DOM overlays; the world is Pixi. KISS, no framework in the loop.
- **A reactive UI framework (React/Vue/Svelte) for the whole app.** Great for menus, **awkward for a 60 fps
  canvas loop** (reconciliation/render cadence fights the framework's render cycle). Rejected for the loop;
  see consequences for the menu carve-out.
- **A game framework (Phaser/Kaboom).** Bundles physics/tweens/scene management, but the custom
  prediction/reconciliation loop and SpacetimeDB subscription model "don't slot neatly into a framework's
  lifecycle." Rejected — a thin renderer we drive fits better than a framework we'd fight.
- **Two-way binding / direct store mutation from the renderer.** Invites the renderer/predictor to corrupt
  truth (a desync source). Rejected — one-way flow is the safeguard.

## Decision outcome
- Chosen: **vanilla TS, read-only store, one-way data flow, DOM-overlay menus, Pixi canvas, enum routing,
  no UI framework in the loop.**
- Consequences: the store is truth-in-only (a review gate forbids renderer/predictor writes); the loop is
  hand-ordered (reconcile-on-batch → input → drain → render) and allocation-free; overlays are handled
  before the movement gate so a hiccup can't trap the player. **Named future option:** if the menu UI grows
  much more complex, wrapping the *menus* (not the canvas) in a small reactive layer is a fair improvement —
  an explicit "an alternative could be better at scale" carve-out, not a reversal of the canvas-loop
  decision.
- Reconnect (M4 review): a connection drop triggers a **clean re-init** — reset the store + predictor and
  re-`join_game`, never merge stale rows into a fresh session (a desync source) and never force a full page
  reload (jarring). Seamless state-preserving reconnect is a named deferral.
