# 0013. Netcode smoothness & feel
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the netcode-quality review (`netcode-quality-review.md`); load-bearing for M3 (large-gap
  drain, atomic snapshot) and M4 (interpolation buffer, decoupled slide clock). Complements ADR-0003
  (shared core), 0011 (server-paced), 0012 (prediction/reconciliation) — those secure *correctness*; this
  secures *feel*.

## Context and problem statement
v1 was server-authoritative and convergent yet felt bad — stutter, skipping, and rubberbanding. Those are
**presentation/timing** failures, not authority failures, and they were never specified or tested
(v1 asserted convergence, never smoothness). v2 must make smoothness a first-class, gated property. The
core mistake to avoid: conflating the **logical pacing clock** (`STEP_MS`, server-driven, drives
drain/tick) with the **visual animation clock** (per-frame lerp, local, driven by state changes).

## Considered alternatives
- **(v1) Slide remote entities over `STEP_MS` starting at `receivedAt`; derive the own-character slide from
  the (rebased) server `move_started_at`; reconcile resets prediction every update.** Simple, convergent,
  and jittery: remote entities stutter/skip whenever updates aren't exactly `STEP_MS` apart, and the own
  slide hitches on every reconcile. Rejected — this *is* the v1 feel bug.
- **Synchronize clocks and timestamp-interpolate.** Fragile; unnecessary with integer tiles + local
  rebasing (ADR-0012). Rejected.
- **No interpolation (snap remote entities to each authoritative tile).** Worst feel. Rejected.

## Decision outcome — the smoothness contract (chosen)
1. **Two clocks, kept separate.** The predictor uses `move_started_at`/`STEP_MS` for *drain pacing*
   (logical). The renderer animates from a **self-owned slide clock** (visual). The own-character renderer
   does **not** read `move_started_at` (extends M1's "reconciler ignores it" to the renderer).
2. **Own character — decoupled slide.** The renderer starts a new slide only when the **target tile
   actually changes**. A no-divergence `reconcile` leaves the target unchanged ⇒ no slide restart ⇒ smooth;
   a genuine divergence (the `reconcile` boolean) restarts the slide from the current interpolated position
   to the corrected tile (a correct, rare, visible correction).
3. **Remote characters — interpolation delay buffer.** Render other entities at `now − interpDelay`,
   interpolating between the two most recent authoritative snapshots bracketing that time
   (`interpDelay ≈ 1.5–2 × STEP_MS`, tunable to measured jitter). Absorbs scheduler/network jitter at the
   cost of showing others slightly in the past — the standard prediction-for-you / interpolation-for-them
   split.
4. **Atomic reconcile snapshot.** `reconcile` runs on a **transaction-consistent** view of
   `(last_input_seq, character incl. move_queue, position)`: the store applies a whole update batch, then
   triggers at most one reconcile. Never reconcile on a half-applied transaction (prevents rubberband).
5. **Bounded prediction + snap-on-gap.** Prediction never leads authority by more than
   `MOVE_QUEUE_CAP + pending`; on a large local time gap (`> N·STEP_MS`, e.g. a backgrounded tab) the
   renderer **snaps** to the predicted tile instead of animating the backlog.
6. **Smoothness is gated.** Headless smoothness evals: predicted tile is **monotonic** along the input path
   (no backward step except a genuine divergence); `reconcile` is a **no-op on agreement**; remote
   interpolation has **no jump > one tile** under sub-buffer jitter; bounded reconcile corrections on a
   clean stream. Each ships a proof-of-teeth fixture (ADR-0010).

## Consequences
- M3 gains: the atomic-snapshot requirement, the snap-on-large-gap rule, the renderer-ignores-
  `move_started_at` contract, and the monotonic/no-op smoothness criteria.
- M4 builds the **interpolation delay buffer** and the **decoupled slide clock** from the start (not a
  retrofit). The `AuthoritativeStore` must expose a per-transaction "batch applied" signal and keep a short
  per-entity snapshot history (two snapshots suffice) for interpolation.
- The sim-harness/predictor tests gain the smoothness evals. Confirm the SpacetimeDB SDK's per-transaction
  update/`onApplied` batch mechanism against the pinned version (it underpins #4).
- No change to the authoritative spine (ADR-0003/0011) — v1's feel bugs were timing/presentation, not
  authority.
- Render split (M4 review): the **own** character is rendered from the predictor (decoupled slide clock),
  **all other** entities from the store interpolation buffer — never both for the same entity, even though
  the own row is also in the subscription (prevents self-ghosting).
