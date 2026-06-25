# Netcode quality review (M0–M3 + ADRs)

**Date:** 2026-06-24 · **Scope:** the client↔server movement path across M0–M3 and ADRs 0003/0007/0011/0012.
**Trigger:** v1 (`pokemon-mmo`) shipped a correct-but-*unsmooth* overworld — desync, stuttering, skipping
ahead, and rubberbanding degraded the feel. This review traces each symptom to its root cause in a
predict/reconcile + interpolation architecture, checks what the v2 specs already prevent, names the gaps,
and records the resolutions (ADR-0013 + spec refinements). It is the smoothness counterpart to correctness.

## 0. The key distinction v1 missed

v1's specs/tests proved **correctness** (the client converges to authoritative truth) but never asserted
**smoothness** (it converges *without a visible jolt*). Convergence and smoothness are different
properties: a client can be perfectly convergent and still stutter every frame. v2 must gate both. The
architecture has two clocks that v1 conflated and v2 must keep separate:
- a **logical pacing clock** — `STEP_MS` cadence, server-authoritative, drives the drain/tick (correctness);
- a **visual animation clock** — smooth per-frame lerp, local, driven by *state changes* (smoothness).
Coupling the visual clock to server timestamps (which arrive with jitter and are rebased on every
reconcile) is the single largest cause of v1's stutter.

## 1. Symptom → root cause → coverage → gap → resolution

### A. Desync (client and server permanently disagree)
- **Root cause:** two rule implementations, floating-point drift across builds, a stale prediction build,
  or a reconcile bug.
- **Already prevented by:** one shared Rust rule compiled to both sides (ADR-0003); **integer tiles**, no
  floats in the rule (M1); the determinism clippy gate + native==wasm **and** JS-path parity evals
  (M0/M1/M3); the **no-rule-in-wrapper** eval (M3); the **queue-op reconcile** fix (M3 rev2); CI rebuilds
  wasm + bindings-drift gate so a stale build can't ship (M0/M2).
- **Gap:** netcode tests assert convergence on a few *scripted* scenarios, not over long randomized runs.
- **Resolution:** a **soak/property convergence test** — thousands of randomized ops under injected
  latency/loss/reorder must all converge (M2 sim-harness). *(Low residual risk; this is a regression net.)*

### B. Rubberbanding (own character snaps backward)
- **Root cause:** `reconcile` resets the prediction to a *stale* authoritative position when the
  prediction was actually right. Two sub-causes: (1) ignoring the server's still-undrained `move_queue`
  during replay; (2) treating `pending` as raw moves rather than queue-ops; (3) reconciling on a
  **non-atomic** snapshot — the accept-time ack (`last_input_seq`) and the character row (incl.
  `move_queue`) arriving in *different* applied updates, so reconcile runs on a half-updated world.
- **Already prevented by:** reconcile replays unacked **ops** on top of the server's remaining `move_queue`
  (M3 rev2); accept-time ack + public `move_queue` (M2/ADR-0011); the **divergence-return** + the
  **convergence property** (agree ⇒ no tile change) (M3).
- **Gap:** sub-cause (3) — atomicity of the `(last_input_seq, character.move_queue, position)` snapshot at
  the client — is **unspecified**. SpacetimeDB commits them in one transaction, but the SDK may surface
  per-row callbacks; reconciling between them rubberbands.
- **Resolution:** reconcile MUST consume a **transaction-consistent snapshot** — the store applies all of
  an update batch, then triggers at most one reconcile reading a coherent `(ack, row)` (ADR-0013; M3 §3 +
  M4). Confirm the SDK's per-transaction/`onApplied` batch hook against the pinned version.

### C. Stuttering — your own character
- **Root cause:** the slide animation is restarted/perturbed by `reconcile`. v1's renderer derived the
  slide phase from the (rebased, server-origin) `move_started_at`, which `reconcile` rewrites on *every*
  authoritative update — so even a no-divergence reconcile hitches the in-progress slide.
- **Already prevented by:** nothing mechanical — M3 only *asserts* "the slide is smooth on agreement".
- **Gap:** the **visual clock is coupled to server time**. There is no decoupling requirement.
- **Resolution (ADR-0013):** the own-character renderer animates from a **self-owned slide clock** keyed to
  *target-tile changes only*; it does **not** read `move_started_at` for the own character. A no-divergence
  reconcile leaves the target tile unchanged → no slide restart → smooth. The predictor still uses
  `move_started_at` for *drain pacing* (logical), but the renderer never does (visual). M1's "reconciler
  ignores `move_started_at`" is extended: the **own-character renderer ignores it too**.

### D. Stuttering / skipping — other players
- **Root cause:** **no interpolation buffer.** v1 slid a remote character to its new tile over `STEP_MS`,
  starting at the local `receivedAt`. Authoritative updates do **not** arrive exactly every `STEP_MS`
  (scheduler jitter + network jitter), so the remote either finishes early and **pauses** (stutter) or the
  next update arrives mid-slide and it **jumps** (skip).
- **Already prevented by:** nothing — this is the v1 design, and it is inherently jitter-sensitive.
- **Gap:** the largest single cause of v1's *visible* remote stutter, entirely unaddressed.
- **Resolution (ADR-0013):** render remote entities through an **interpolation delay buffer** — draw them
  at `now − interpDelay`, interpolating between the two most recent authoritative snapshots that bracket
  that time (`interpDelay ≈ 1.5–2 × STEP_MS`, or measured jitter). This absorbs jitter up to the delay at
  the cost of showing other players slightly in the past — the standard, correct tradeoff (prediction is
  for *you*; interpolation-in-the-past is for *them*).

### E. Skipping ahead — your own character
- **Root cause:** the local `drain` applies a *backlog* of due moves in one frame after a stall (a
  backgrounded tab, a long GC/frame hitch), teleporting the character; and/or the prediction runs further
  ahead of authority than it should.
- **Already prevented by:** `drain` advances logical time by `step_ms` **per move** (not snapping to
  `now`) (M3 rev2); prediction-ahead is bounded by `MOVE_QUEUE_CAP + pendingCount` (≈2 tiles).
- **Gap:** the large-time-gap case still animates the whole backlog; no explicit prediction-ahead bound.
- **Resolution (ADR-0013):** on a large local time gap (e.g. `> N·STEP_MS`), **snap** the render to the
  predicted tile instead of animating the backlog (acceptable after the tab was hidden); cap prediction so
  the client never runs more than the queue ahead of authority.

### F. (Cross-cutting) no smoothness metrics
- **Root cause:** every gate tests "does it converge / is it correct", none tests "does it *feel* smooth".
- **Resolution (ADR-0013):** add **smoothness evals** (headless, in the sim-harness / predictor tests):
  (1) the predicted tile is **monotonic** along the input path — it never moves backward except on a
  *genuine* divergence; (2) `reconcile` is a **no-op on agreement** (already a property — promoted to a
  gate); (3) the remote interpolation **gap is bounded** (no frame-to-frame jump > one tile under jitter
  below the buffer); (4) bounded reconcile-correction count on a clean stream.

## 2. Summary matrix

| Symptom | Root cause | Covered by | Gap → Resolution |
|---|---|---|---|
| Desync | 2 rule impls / float / stale build | shared core, int tiles, parity+determinism gates, queue-op reconcile, CI | soak convergence test (M2) |
| Rubberband | reconcile vs stale/partial truth | authQueue+op replay, divergence-return, convergence prop | **atomic reconcile snapshot** (ADR-0013, M3/M4) |
| Stutter (own) | slide clock coupled to server time | — | **decoupled self-owned slide clock** (ADR-0013, M4) |
| Stutter (remote) | no interpolation buffer | — | **entity interpolation delay buffer** (ADR-0013, M4) |
| Skip-ahead | drain backlog / unbounded lead | drain step_ms/move, pred bounded by cap | **snap-on-large-gap + lead bound** (ADR-0013, M3) |
| (no feel metric) | tests check correctness only | — | **smoothness evals** (ADR-0013) |

## 3. What does NOT need to change
- The **server-paced, integer-tile, shared-rule** spine (ADR-0003/0011) is correct and is *why* desync is
  designed out — v1's problems were **presentation/timing**, not authority. Keep it.
- The **accept-time ack + public `move_queue`** (M2) is correct and necessary for replay; the fix is to
  consume it *atomically*, not to change it.
- Integer tiles + `apply_move` totality (M1) — unchanged.

## 4. Net effect
Five of the six symptom classes are now closed by **mechanical gates or explicit design decisions** rather
than left to discipline (v1's failure mode). The two highest-impact, previously-unaddressed fixes — the
**remote interpolation buffer** and the **decoupled own-character slide clock** — are captured in
**ADR-0013** and specified as M4 requirements *now*, so M4 builds them in instead of retrofitting. See
ADR-0013 for the decisions and M2/M3 §3 for the new criteria.
