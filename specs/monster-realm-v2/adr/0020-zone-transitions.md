# 0020. Zone transitions (warps) & subscription switching
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M11 design. Builds on ADR-0007 (zoned), 0012 (reconcile), 0013 (smoothness), 0014 (reconnect
  reset).

## Context and problem statement
A multi-zone world needs the player to move *between* zones via warps/doors. M1's `apply_move` is
deliberately **within a single zone**; crossing a boundary is a different operation. It must be
server-authoritative (no client-side teleport), must switch the client's per-zone subscription, and must not
rubberband or stutter — while reusing the existing prediction/reconnect machinery rather than inventing
cross-zone prediction.

## Considered alternatives
- **Server-authoritative warp + reconcile + subscription switch (chosen).** Stepping onto a warp tile is
  resolved by the server (in the per-zone tick): it sets the character's `zone_id` + target tile. The own
  client sees a teleport, which `reconcile` already snaps to truth on (ADR-0012), then **re-subscribes** to
  the new zone and **resets the predictor** to the new own-row (reusing the M4 reconnect-reset path,
  ADR-0014). A brief transition (fade) hides the switch.
- **Client-predicted cross-zone movement** (predict the warp + the new zone). Needs the client to hold
  multiple zones' maps + predict a teleport; complex and a desync surface for a rare event. Rejected — warps
  are infrequent; a server teleport + reconcile is simpler and correct.
- **Free `apply_move` across a zone boundary.** Breaks M1's within-zone invariant and the per-zone tick/
  subscription model. Rejected.
- **Client-authoritative warp.** Lets a client teleport itself anywhere. Rejected (server authority).

## Decision outcome
- Chosen: **warps are a server-authoritative teleport, reconciled by the client, with a subscription switch
  + predictor reset** for the new zone.
- Consequences: no new prediction algorithm (reuses reconcile-on-teleport + the reconnect-reset path); the
  per-zone subscription/tick model (ADR-0007) carries it; a clean transition avoids a visible rubberband.
  Warp tiles + targets are authored data (ADR-0008) validated by `validate_content`.
