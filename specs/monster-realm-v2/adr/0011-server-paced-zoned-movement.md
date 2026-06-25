# 0011. Server-paced movement via a bounded queue + scheduled per-zone tick
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M2 design; load-bearing for the M2 spec

## Context and problem statement
Movement must be server-authoritative and rate-limited against a hostile client, while staying compatible
with client prediction (ADR-0003) and per-zone scaling (ADR-0007). The question is *how* the server paces
and applies movement: when does it run the rule, how does it stop a client from moving faster than allowed,
and how does pacing scale as zones/players grow.

## Considered alternatives
- **Bounded per-character move queue + scheduled per-zone tick that drains one move/tick and calls
  `apply_move` (chosen).** Clients buffer *intent* (`enqueue_move`); a per-zone scheduled reducer drains at
  most one queued move per character every `STEP_MS` and computes the outcome via the shared `game-core`
  rule. The rate limit is the *cadence × queue cap*, not a per-call check. A flooding client just fills its
  `MOVE_QUEUE_CAP` buffer and gets `Err`. Per-zone scheduling makes each tick O(characters-in-zone).
- **Per-move cooldown rejection** (server checks "has enough time passed?" on each move call) — a second
  timing rule the client must mirror to predict correctly; more state, more desync surface. Rejected.
- **External cron/job runner for the tick** — puts the heartbeat outside the transactional system, adds an
  integration to babysit. The in-database scheduled reducer is transactional, co-located, and guarded.
  Rejected.
- **Global single tick over all characters** (v1's actual M2) — simple but O(all rows) and not zone-scoped;
  v1 itself flagged the missing `zone_id` index as deferred scaling. Rejected for v2 (ADR-0007).
- **Client-authoritative / trust-then-validate position** — strictly more attack surface than never
  accepting a position. Rejected (intent-only).

## Decision outcome
- Chosen: **bounded queue + scheduled per-zone tick draining one move/tick, applying `game-core::apply_move`
  at drain time.** Rate-limit lives in the cadence; pacing is per-zone.
- Consequences: pairs with ADR-0003 (the drained rule is the *same* compiled `apply_move` the client
  predicts) and ADR-0007 (per-zone schedule rows + `zone_id` index). Constants `STEP_MS`/`MOVE_QUEUE_CAP`
  are single-sourced in `game-core` (M1). The tick must snapshot ids before mutating and carry a
  scheduler-only guard (version-sensitive on STDB 2.x — confirm privacy + module-identity accessor).
  Validated by the M2 sim-harness netcode tests (server-paced limit, zoned isolation, convergence).
- Because pacing decouples accept from apply, `last_input_seq` is set at **accept-time** (the ack means
  "received") and `character.move_queue` stays **public**, so the M3 client reconciles its prediction
  against the authoritative state **plus the server's still-undrained queue** (the full reconcile protocol
  is an M3 decision; this ADR only fixes the two server-side inputs it needs).
