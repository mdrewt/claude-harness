# 0012. Client prediction & reconciliation protocol
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M3 design; load-bearing for the M3 spec. Builds on ADR-0003 (shared core) + ADR-0011
  (server-paced movement / accept-time ack + public queue).

## Context and problem statement
The browser must move the player instantly while the server stays authoritative, with no visible jolt when
the two agree (almost always) and a clean correction when they don't. This needs a defined client-side
**reconciliation algorithm** and a **time strategy** (the server's clock and the browser's `performance.now()`
are never synchronized). The protocol is non-obvious and has a documented v1 edge case (a held key stalling
one step after a *correcting* reconcile), so it is recorded here.

## Considered alternatives
- **Predict-and-reconcile against authoritative state + the server's remaining queue (chosen).** On each
  authoritative own-row update: (1) drop pending ops with `seq ≤ ackedSeq`; (2) rebuild the local queue
  from the server's still-undrained `move_queue` and replay the unacked pending ops; (3) reset predicted to
  the authoritative baseline; (4) re-drain to now. `reconcile` returns whether the corrected tile diverged
  so the loop can re-issue a held key. Time: **rebase at the boundary, never sync clocks** — translate the
  server's epoch `move_started_at` to a local-time baseline ("two steps ago").
- **Reconcile against authoritative position only (ignore the server queue)** — mispredicts during the
  paced drain (the server has accepted moves it hasn't applied yet); rejected.
- **Synchronize client/server clocks (NTP-style) and predict on absolute time** — fragile, more moving
  parts; integer tiles + local rebasing make it unnecessary. Rejected.
- **No client prediction (await server confirmation)** — laggy at any real latency; rejected for the
  real-time overworld (battles, by contrast, are server-resolved with no prediction — ADR-0011).
- **Reimplement the rule in TS for prediction** — two sources of truth = guaranteed desync; rejected (the
  whole reason for the wasm bridge / ADR-0003).

## Decision outcome
- Chosen: the four-step predict-and-reconcile protocol above, running the **identical compiled
  `game-core::apply_move`** via wasm; `reconcile` returns a divergence boolean; time is rebased at the
  `convert` boundary, never synchronized.
- Consequences: depends on M2 exposing an **accept-time `last_input_seq`** and a **public `move_queue`**
  (ADR-0011). The reconcile + rebasing + divergence-return are unit-tested (vitest, faked auth stream) and
  the marshaled wasm path is covered by the JS-path parity eval. The "no logic in the wrapper" rule is an
  eval. Remote-entity interpolation (M4) reuses the same no-clock-sync principle (rebase by local
  `receivedAt`).
- Implementation invariants (M3 review): the predictor's `pending` records **queue operations**
  (`Enqueue`/`SetMove`/`Clear`), not raw moves, so reconcile's replay reconstructs the local queue
  correctly (a mid-flight `SetMove` replays as a replace); `drain` advances logical time by `step_ms` per
  applied move (not snapping to `now`), giving deterministic catch-up after a backgrounded tab. Because the
  client and server share the same map + rule, walkability never mispredicts — divergence comes only from
  message loss/reorder, teleport/warp, or a server rejection the client didn't model.
