# 0015. Owner-scoped row privacy via RLS (the third visibility mode)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M6 design; load-bearing for every owner-private table (monster, player_item, battle).

## Context and problem statement
A monster has **hidden** state (genes/`Potential`, server-derived stats) that its owner must see but no
other client may read — a cheater who reads another player's genes/odds gains an unfair edge. SpacetimeDB
tables are either `public` (every client subscribes) or private (no client). Neither fits "visible to the
owner only." A third mode is needed. Note: STDB's row-level security was **experimental** in the 2.6-era
crate, so the mechanism must be confirmed against the pinned version and have a fallback.

## Considered alternatives
- **Public table + RLS `client_visibility_filter` scoping rows to `owner_identity = :sender` (chosen).**
  One table, transported over the owner's subscription only; hidden fields never cross to others. Enforced
  by a privacy eval + proof-of-teeth (a second client receives none of the first's rows).
- **Make the table fully `public`** — leaks genes/derived stats/odds to everyone. Rejected.
- **Server-curated public projection** (a separate public table mirroring only non-sensitive fields, owner
  reads a private full table) — more tables + write fan-out, but **the fallback** if RLS is too immature in
  the pinned version.
- **Client-side filtering** of a public table — insecure (the data already left the server). Rejected.

## Decision outcome
- Chosen: **RLS owner-scoped filter as defense-in-depth — not a hardened boundary.** The v1 tutorial is
  explicit (and the pinned crate labels the filter "not yet fully enforced"; the API "may change"): treat
  `client_visibility_filter` as **defense-in-depth, verified per-version, never a guarantee**. Therefore
  classify owner-private data by **stakes**:
  - **Scout-level** (a rival could *scout* your team — hidden monster genes/derived stats, item counts):
    RLS is an acceptable, **documented risk trade-off** — the cost of a leak is competitive scouting, not a
    breach. Use RLS + a privacy eval, and **confirm it actually filters on the pinned STDB version**.
  - **Must-never-leak** (a true secret — spawn weights, and competitively-decisive data like a ranked PvP
    pending pick): the unambiguous tool is a **private (non-`public`) table** the client can't subscribe to
    at all, or a server-curated public projection of only non-sensitive fields. Do **not** rely on RLS here.
- **Confirm RLS enforcement against the pinned version before M6 build**; the private-table / server-
  projection fallback is the path when RLS is insufficient or the stakes are too high.
- Consequences: a stakes-classified privacy posture for `monster`/`player_item`/`battle`/`trade_offer`
  (scout-level → RLS), the private `encounter` table (must-never-leak → already private), and the M16 PvP
  `battle_action` pending picks (competitively-decisive → confirm RLS or use a private table). Each ships a
  privacy eval + proof-of-teeth; the client never receives hidden state, so it can never leak or recompute it.
