# Spec: M4 — The frontend (PixiJS + the prediction loop + debug HUD)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M3 (gates, rule, server,
prediction layer).
**Decisions:** ADR-0004 (PixiJS), 0007 (zoned subscriptions), 0010 (proof-of-teeth), 0012 (prediction/
reconcile), 0013 (netcode smoothness), 0014 (client app architecture). See `netcode-quality-review.md`.
**Workflow:** harvest v1 M4 chapter → plan/design → draft → review/red-team (see §7). This is the largest,
most integration-heavy milestone — *where all the pieces meet* — so it is split into **M4a** (data
plumbing) → **M4b** (rendering) → **M4c** (input + the loop + HUD).

## 1. Problem / intent

Give the world **eyes and hands**: subscribe to authoritative truth, predict the player's movement so it
feels instant, reconcile smoothly against the server, and render it — building in the **ADR-0013
smoothness layer from the start** (remote interpolation buffer + decoupled own-character slide clock), the
exact fixes for v1's stutter/rubberband. The frontend is the rest of the imperative shell: it owns **no**
game state — it is a *view* (server → store → render; input → predictor → net). Success = open the page,
enter a name, and your character moves the instant you press a key with no perceptible lag; a second
window shows you a beat later; walking into a wall bumps and turns identically on both; and the motion is
**smooth** (no stutter, no rubberband, no skip) — verified by headless smoothness/store/loop tests and a
dev introspection hook (the two-window e2e that *proves* sync is M5).

## 2. Scope

**In scope (`frontend/`)**
- **Connect & subscribe** (`net/connection.ts`): open `DbConnection` to SpacetimeDB; **per-zone**
  subscription (`SELECT * FROM character WHERE zone_id = ?`, `SELECT * FROM player`); `onConnect` →
  `join_game(name)`; `onApplied`/per-transaction batch, `onError`, `onDisconnect`; a `call(p)` reducer
  seam that surfaces *action* rejections to a toast (movement-reducer rejections stay silent — M2 §3).
- **`AuthoritativeStore`** (`net/store.ts`): a **read-only** mirror of subscription truth — keyed `Map`s
  (idempotent on reconnect), each `StoredCharacter` records `receivedAt` (local `performance.now`) **and a
  2-snapshot history** for interpolation; exposes a **per-transaction "batch applied" signal** (ADR-0013
  atomic reconcile trigger). Written only by reducer callbacks; never by render/predict.
- **Own-character identification:** connection `identity` → `player` row → `entity_id` → `character` row.
- **Rendering** (`render/`): a PixiJS v8 app; the **tile map drawn from `zone_map()`** (M3 wasm export,
  read once — never hard-coded in TS); **sprite pooling** (one `CharacterView` per entity, mutate-in-place,
  never recreate); animation texture swap (idle/walk/jump × facing); the **own character** animated from a
  **self-owned slide clock** keyed to target-tile changes (does *not* read `move_started_at`); **remote
  characters** through an **interpolation delay buffer** (render at `now − interpDelay` between the two
  latest snapshots; hold, never extrapolate, past the latest); **snap** (no slide) on the predictor's
  large-gap signal.
- **Art-tech readiness (flat now, HD-2D-ready — ADR-0004):** render detailed pixel art **flat** for now, but
  adopt three cheap hedges so an HD-2D (lit-pixel-art) upgrade is later additive and `render/`-only:
  (1) **pixels-per-tile is one configurable `TILE_PX` constant** (default ~32), decoupled from the abstract
  integer-tile grid (`game-core` is resolution-agnostic — never hard-code a tile size); (2) the renderer's
  **asset/material model is extensible** (a sprite is "albedo" today, can carry normal/material channels
  later; lighting + post-processing is an additive render mode); (3) assets are authored **neutrally-lit**
  (no baked directional shadows — a documented art convention so sprites are normal-map-ready).
- **Input + the per-frame loop** (`input/`, `main.ts`): keyboard → held direction → intent
  (`setMove`/`enqueue`/`clearQueue`) + send via net, flow-controlled against `MOVE_QUEUE_CAP`; reconcile
  once per applied own-row batch; `drain`; render — gated on (wasm ready AND own row present); the
  `committedDir` + divergence-return handling (a held key re-issues from a corrected position).
- **Debug HUD + introspection** (`ui/hud.ts`): a **dev-only** overlay + a `window.__game()` plain-data
  snapshot exposing **predicted vs authoritative** tile, `pendingCount`, ack/`last_input_seq`, a running
  **divergence count**, fps, and the interp delay — so stutter/rubberband are *visible* in dev and the M5
  e2e can assert on state, never pixels.
- **Screen-routing scaffold** (`ui/screen.ts`): a minimal enum `ScreenManager` (`overworld` only now;
  later screens plug in) with overlay input handled **before the movement gate** (so a transient
  predictor/own-row hiccup can never trap the player).
- **Entry & lifecycle UX:** a name-entry screen → `join_game` → connecting → overworld; a reconnect that
  **resets store+predictor and re-joins** (clean re-init, no stale merge); blur-clears-input; canvas
  resize. The own character renders from the predictor, all others from the store (no self double-render).
- **Tests:** vitest for the store (keyed-Map idempotency, batch signal, snapshot history), the
  interpolation-buffer math, the slide-clock decoupling, input→intent + flow-control, and the loop's
  reconcile-on-batch wiring; the **ADR-0013 smoothness evals** (monotonic predicted tile, reconcile no-op
  on agreement, bounded remote interp gap, snap-on-gap, bump ⇒ predicted==authoritative). **No pixel tests.**

**Out of scope (named deferrals)**
- **Two-window Playwright e2e** + the smoothness evals running end-to-end against a live module → **M5**
  (M4 builds the `window.__game()` hook M5 consumes).
- **Battle / box / trade / challenge screens** → M6+ (the `ScreenManager` enum is scaffolded so they slot in).
- **Real art / spritesheets / audio** → placeholder sprites at M4 (the renderer is asset-agnostic).
- **NPC rendering specifics** → trivial once NPCs exist (M12); M4 renders whatever characters are subscribed.

## 3. Acceptance criteria (EARS)

**Connect & subscribe (ADR-0007)**
- WHEN the client connects THE SYSTEM SHALL subscribe to its zone's `character` rows (`WHERE zone_id = ?`)
  and `player`, call `join_game(name)`, and start the loop only after the initial subscription is applied.
- WHEN a reducer call rejects THE SYSTEM SHALL route *action* rejections to a user toast via the `call(p)`
  seam, while *movement* rejections (queue-full/stale-seq) stay silent (flow control — M2 §3).

**Store — read-only mirror (ADR-0013/0014)**
- WHEN subscription rows arrive THE SYSTEM SHALL upsert them into keyed `Map`s (idempotent — a reconnect
  re-insert overwrites, never duplicates), recording `receivedAt` and keeping the **last two** authoritative
  snapshots per character.
- THE SYSTEM SHALL expose a **per-transaction batch-applied** signal so the loop reconciles once on a
  coherent `(last_input_seq, character incl. move_queue, position)` snapshot (never mid-batch — ADR-0013).
- IF the renderer or predictor writes to the store THEN review SHALL reject it (the store is truth-in-only;
  one-way data flow).

**Rendering (ADR-0013, ADR-0004)**
- WHEN the world is drawn THE SYSTEM SHALL draw the tile map from `zone_map()` (read once from wasm), and
  SHALL reuse one pooled `CharacterView` per entity (mutate-in-place; never recreate per frame).
- THE SYSTEM SHALL render the **own** character from the **predictor** (`predicted`) and **all other**
  entity ids from the **store** (interpolation buffer) — never both for the same entity (no double-render /
  ghosting of yourself), even though your own row is also in the subscription.
- WHEN two characters occupy the same tile THE SYSTEM SHALL draw them in a **stable z-order** (e.g. by
  `entity_id`/`y`) so overlapping sprites don't flicker.
- WHEN a `character` row is deleted (despawn/disconnect) THE SYSTEM SHALL tear down its `CharacterView`
  (return/destroy the pooled sprite) and prune its snapshot history — no leaked views, no ghost sprite.
- WHEN the **own** character's predicted tile changes THE SYSTEM SHALL start a new slide from its current
  interpolated position to the new tile over `STEP_MS` using a **self-owned local clock**; it SHALL NOT read
  `move_started_at`; a no-divergence reconcile SHALL NOT restart the slide (no stutter).
- WHEN a **remote** character is drawn THE SYSTEM SHALL render it at `now − interpDelay`, interpolating
  between the two bracketing authoritative snapshots, holding (not extrapolating) past the latest
  (`interpDelay ≈ 1.5–2 × STEP_MS`, tunable to measured jitter).
- WHEN the predictor signals a large time gap THE SYSTEM SHALL **snap** the own character to the predicted
  tile rather than animating the backlog.
- WHEN a character's `action`/`facing` changes THE SYSTEM SHALL swap the sprite's texture set in place
  (idle/walk/jump × direction), not allocate a new sprite.
- THE renderer SHALL read pixels-per-tile from a single configurable `TILE_PX` constant (default ~32) and
  SHALL NOT hard-code a tile size anywhere; the logical grid stays the `game-core` integer tiles (resolution-
  agnostic). IF a tile/sprite pixel size is hard-coded outside that constant THEN review SHALL reject it.
- THE sprite/asset model SHALL be **extensible** (an albedo texture today; normal/material channels + a
  lighting/post-processing pass are an additive future render mode — ADR-0004 HD-2D-readiness), and the asset
  convention SHALL be **neutrally-lit** (no baked directional shadows) so assets are normal-map-ready.

**Input + the loop (ADR-0012)**
- WHILE wasm is ready AND the own-character row exists THE SYSTEM SHALL run the per-frame loop in order:
  (1) apply the subscription batch; if the own row changed, `reconcile(coherentSnapshot)` once, and if it
  diverged, clear `committedDir`; (2) read held input → on a direction change `setMove` (+ send), on a
  sustained hold whose current step is complete and with queue **room** (`authQueue.len + pendingCount <
  cap`) `enqueue` (+ send), on release stop issuing; (3) `drain(now)`; (4) render.
- WHEN a held key is released THE SYSTEM SHALL stop the character cleanly with no overshoot (the ≤cap
  buffered moves drain and stop; `clear_queue` is available for an immediate halt).
- WHEN the own-character row has not yet arrived THE SYSTEM SHALL render the rest of the world and accept
  no movement input (no prediction before seeded), while still handling any overlay input.

**Debug HUD & introspection**
- WHEN the dev build runs THE SYSTEM SHALL expose `window.__game()` returning a plain-data snapshot
  (predicted vs authoritative tile per character, `pendingCount`, ack, divergence count, fps, interpDelay)
  and render a dev HUD from it; the hook SHALL be absent/no-op in production builds.

**Robustness & routing (ADR-0014)**
- WHILE any future overlay is open THE SYSTEM SHALL handle its input (incl. exit) **before** the movement/
  predictor gate, so a transient predictor/own-row hiccup can never trap the player.

**Lifecycle, robustness & entry UX**
- WHEN the page loads THE SYSTEM SHALL show a **name-entry** screen → on submit call `join_game(name)` →
  show a connecting state → enter the overworld on the own-row's arrival; IF `join_game` rejects (bad name
  / already joined) THEN THE SYSTEM SHALL surface the server's message on the entry screen (via the
  `call(p)` seam).
- WHEN the connection drops THE SYSTEM SHALL show a reconnecting indicator and stop issuing input; on
  reconnect THE SYSTEM SHALL **reset the store and the predictor and re-`join_game`** (a clean re-init —
  pruning stale rows/views), never merge stale state into a fresh session (prevents stale-row desync).
  Seamless state-preserving reconnect is a named deferral.
- WHEN the window loses focus (blur) THE SYSTEM SHALL clear the held input so the character stops cleanly —
  a missed key-up while unfocused must not leave movement "stuck on" (which would read as skip-ahead).
- WHEN the viewport resizes THE SYSTEM SHALL refit the canvas (keep the zone visible) without recreating
  the scene; M4 renders the **full zone with no scrolling camera** (a follow-camera is deferred to M11's
  larger/multi-zone worlds).
- THE `window.__game()` hook and dev HUD SHALL be gated by build mode (present in dev, tree-shaken from
  production).

**Smoothness evals (ADR-0013) + proof-of-teeth (ADR-0010)**
- THE SYSTEM SHALL pass headless smoothness evals: predicted tile **monotonic** (no backward step except a
  genuine divergence); `reconcile` a **no-op on agreement**; remote interpolation **no jump > one tile**
  under sub-buffer jitter; **bump ⇒ predicted == authoritative**. Each ships a proof-of-teeth fixture
  (e.g. a renderer that reads `move_started_at` reintroduces stutter and fails the decoupling test; a
  remote renderer without the buffer fails the jitter test).

**No pixel testing**
- THE SYSTEM SHALL assert on *state* via the introspection hook / store, never on canvas pixels.

## 4. Plan (high level)

One-way data flow (ADR-0014): `server → store → render` and `input → predictor → net`. Module layout:
`net/{connection,store}.ts` · `render/{app,characterView,interpolation,map}.ts` · `input/keyboard.ts` ·
`prediction/` (from M3) · `convert/` (from M3) · `ui/{hud,screen}.ts` · `main.ts` (the loop).

Key mechanics:
- **Atomic reconcile (ADR-0013):** the store buffers a transaction's row callbacks and emits one
  batch-applied event; the loop reconciles once per batch on a coherent snapshot — never mid-update
  (the rubberband race). *Confirm the SpacetimeDB SDK's per-transaction/`onApplied` batch mechanism against
  the pinned version* (it underpins this).
- **Two clocks (ADR-0013):** the predictor drains on `STEP_MS` (logical); the renderer animates on its own
  local slide clock (visual). The own `CharacterView` ignores `move_started_at`; remote views use the
  interpolation buffer. This is the core anti-stutter decision.
- **Flow-control (ADR-0012):** the loop only `enqueue`s when `authQueue.len + pendingCount < cap`, so the
  server never rejects a movement for a full queue; `setMove` (replace) is always allowed.
- **Held-key re-issue:** track `committedDir`; a diverging reconcile clears it so a still-held key re-issues
  from the corrected position (the documented v1 stall bug — already gated by M3's divergence-return).
- **Performance:** the render loop allocates nothing per frame; sprites/textures are pooled and mutated
  (the PixiJS performance skill). Sub-tile position is render-only (never stored/sent).

**Boundary preview — what M5 (two-window e2e) will consume:**
- The `window.__game()` snapshot to assert: both windows see each other; movement syncs both directions;
  jump advances a tile; a wall bump leaves **predicted == authoritative** (the desync regression net);
  prediction converges; a disconnect despawns the character in the other window. Plus the **smoothness**
  assertions (no backward jump on a clean/jittered stream). Spawn tiles are read from the snapshot (never
  hard-coded); `STEP_MS` from the hook; a global setup republishes with `--delete-data` for known
  preconditions.

## 5. Tasks (vertical slices)

**M4a — data plumbing (truth in)**
- [ ] `net/connection.ts`: connect, per-zone subscribe, `join_game`, lifecycle handlers, the `call(p)` seam.
- [ ] Name-entry screen + connecting/disconnected states; surface `join_game` rejection; **reconnect = reset store+predictor + re-join**.
- [ ] `net/store.ts`: keyed-Map store, `receivedAt` + 2-snapshot history, per-transaction batch-applied signal; vitest (idempotency, batch, history).
- [ ] Own-character identification (identity → player → entity_id → character).

**M4b — rendering (eyes)**
- [ ] PixiJS app + pooled `CharacterView` (mutate-in-place) + texture-swap animation; map drawn from `zone_map()`.
- [ ] Own-character self-owned slide clock (decoupled from `move_started_at`) + snap-on-gap.
- [ ] Remote-entity interpolation delay buffer (hold-not-extrapolate) + vitest on the interp math.

**M4c — input, loop, HUD (hands + feel)**
- [ ] `input/keyboard.ts` → held dir; the `main.ts` loop (reconcile-on-batch → input/intent+send → drain → render), flow-control, `committedDir`/divergence handling.
- [ ] `ui/screen.ts` enum routing scaffold + overlay-before-gate structure.
- [ ] Own-vs-remote render split (own from predictor; others from store); CharacterView teardown on despawn; stable z-order.
- [ ] Robustness: blur clears held input; canvas resize refit; no-camera full-zone render.
- [ ] `ui/hud.ts` + `window.__game()` introspection (dev-only, build-gated); the ADR-0013 smoothness evals + proof-of-teeth.
- [ ] doc-keeper: changelog + memory; link the frontend in `ARCHITECTURE.md`.

## 6. Risks / decisions

- **SDK per-transaction batch mechanism** (underpins the atomic reconcile) — confirm against the pinned
  SpacetimeDB version; if only per-row callbacks exist, coalesce them within a microtask/frame before
  reconciling.
- **Vite + wasm** — `vite-plugin-wasm` + `vite-plugin-top-level-await` (one-time config, from M3).
- **interpDelay tuning** — start `1.5–2 × STEP_MS`; expose it in the HUD and tune to measured jitter; too
  small → remote stutter, too large → others feel laggy.
- **Overlay-before-gate robustness** — structure input routing now so M6+ overlays (battle/box) can always
  be exited even if the predictor is briefly uninitialized (a v1 trap).
- **Reactive menus at scale (named future option)** — vanilla TS + DOM-overlay menus are right now; if the
  UI grows much more complex, wrapping the *menus* (not the canvas) in a small reactive layer is a fair
  future improvement (ADR-0014).
- **Accessibility** — keyboard control is native; note the PixiJS-accessibility skill for menus later
  (canvas a11y is out of scope at M4).
- **Reconnect = clean re-init (decided this pass)** — reset store+predictor + re-join on reconnect, rather
  than merging stale rows (a desync source) or forcing a full page reload (jarring). Seamless
  state-preserving reconnect is a named deferral until there's session state worth preserving (matches v1's
  "no `Scene` teardown / reconnect-without-reload is YAGNI", but done cleaner: an explicit reset path).
- **No camera at M4** — render the full single zone; a follow-camera arrives with M11's larger/multi-zone
  worlds. Avoids building viewport/culling machinery before a zone needs it.
- Open: exact `interpDelay`, placeholder sprite set, HUD layout → settle in the loop.

## 7. Review / red-team notes

### Pre-M5 hardening (reviewer + red-team + simplify)
Most finds are lifecycle/robustness gaps that would *present as* the v1 symptoms:
- **Own-vs-remote render split** — render yourself from the predictor and everyone else from the store
  interpolation buffer; never both for the same entity (your row is also in the subscription) → no
  self-ghosting. The single most important rev-2 correctness fix.
- **Reconnect = reset store+predictor + re-join** — a stale-row merge after a drop reads exactly like
  desync/rubberband; a clean re-init prevents it. Seamless reconnect deferred.
- **Blur clears held input** — a missed key-up while unfocused leaves movement "stuck on," which reads as
  skip-ahead/runaway. Clear held keys on window blur.
- **CharacterView teardown on despawn** (no leaked views/ghosts) + **stable z-order** for overlaps.
- **Entry UX completeness** — name-entry → join → connecting → overworld, with `join_game` rejection
  surfaced; **canvas resize**; **no camera** (full-zone render); **HUD/`window.__game()` build-gated**.
- **ADRs/plans:** light consequences added to ADR-0013 (own-from-predictor / remote-from-buffer render
  split) and ADR-0014 (reconnect = clean re-init). No new ADR; PLAN unchanged (M4 line already points here).

### Tutorial harvest (`tutorial-DrEnc_Nk.js`, M4 chapter)
Adopted: connect/subscribe + the `onApplied` start gate; the **read-only keyed-Map store** with
`receivedAt`; marshaling via `convert` (M3); **sprite pooling** (mutate-in-place); the prediction loop
order (**drain after input**); reconciliation that **replays pending on truth** (never overwrite-and-stop);
the `committedDir` + divergence re-issue; the **enum `ScreenManager`** with overlays handled **before the
movement gate**; the **dev-only `window.__game()`** introspection (assert state, never pixels). The
five v1 pitfalls (mutate-store, recreate-Pixi, overwrite-reconcile, array-store, forget-time-rebase) are
each closed by an explicit criterion. v2 upgrades over v1: the **ADR-0013 smoothness layer is built in from
M4** (remote interpolation buffer + decoupled own slide clock + atomic reconcile snapshot) rather than
shipped as the basic, jitter-prone v1 approach; smoothness is **gated by evals**, not just felt.

### Red-team
- **Mid-batch reconcile** → rubberband: closed by the per-transaction batch signal (ADR-0013).
- **Per-frame allocation / recreate sprites** → frame drops: pooling criterion + the perf skill.
- **Renderer/predictor writing the store** → desync of truth: one-way-flow review gate.
- **Remote extrapolation past latest snapshot** → overshoot/rubberband on others: hold-not-extrapolate.
- **Trapped in a menu on a hiccup** → overlay-before-gate structure.

### Simplify
No UI framework for the 60 fps loop (ADR-0014); placeholder art; battle/box/trade screens deferred (enum
scaffolded); e2e is M5. M4 stays a thin, driven renderer over the M3 prediction layer.
