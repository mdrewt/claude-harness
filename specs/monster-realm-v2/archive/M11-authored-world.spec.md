# Spec: M11 — Authored multi-zone world (Tiled → RON)

**Status:** draft · **Owner:** Drew · **Date:** 2026-06-24
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M0–M10. **Opens Phase B.**
**Decisions:** ADR-0006 (schema migration), 0007 (zoned subs/tick), 0008 (Tiled→RON — **accepted here**),
0010 (proof-of-teeth), 0012/0013 (prediction/smoothness across warps), 0020 (zone transitions). **No v1
precedent** — designed from standards + the v2 patterns (data-driven content, server authority, additive
schema). **Workflow:** design → review (§7).

## 1. Problem / intent

Turn the single hand-authored zone into a **real, data-driven world**: multiple zones authored in **Tiled**,
compiled to **RON** that `game-core` consumes, with **warps/doors** between zones, data-driven collision and
encounter-zones, and a **follow-camera**. This is where the zoned schema (indexed `zone_id`, per-zone
subscriptions + per-zone tick) built since M2 becomes user-visible, and where the **schema-migration story
finally bites** (real map content must reach a live DB without `--delete-data`). Success = walk through a
multi-zone world via warps, each zone subscribed/ticked independently, content updated by automigration —
all still server-authoritative and smooth.

## 2. Scope

**In scope**
- **Tiled→RON importer** (ADR-0008): a pure, tested build-time tool converting Tiled maps to the RON zone
  format (`zone_id`, dims, tile/collision layers, grass/encounter-zone tags, **warp** tiles → target
  `(zone_id, tile)`, doors). **No in-engine editor.**
- **`game-core` map → multi-zone data:** `zone_0()` const → `map_for(zone_id)` over a loaded zone registry
  (embedded RON, validated by `validate_content`: every warp targets an existing zone+walkable tile; no
  dangling zone refs; append-only `zone_id`s).
- **Server:** multiple zones live; **per-zone `movement_tick_schedule` rows** + **per-zone subscriptions**
  become real; a **server-authoritative warp** — stepping onto a warp tile (resolved in the per-zone tick)
  changes the character's `zone_id` + tile (and re-targets its tick); cross-zone movement is the warp, never
  free `apply_move` across a boundary (M1 stays within-zone).
- **Schema migration (ADR-0006):** map/content edits reach a live DB via **automigration + `sync_content` +
  re-derive** (no `--delete-data`); a migration smoke-test on a real zone/content change.
- **Frontend:** a **follow-camera** centering on the player (viewport + culling for larger zones); subscribe
  to the **current zone** (+ optional neighbors); **re-subscribe on warp** (a reconnect-lite reset of the
  predictor for the new zone — ADR-0020/M4 reset pattern); render `map_for(current_zone)` from the wasm
  `zone_map(zone_id)` export.

**Out of scope (named deferrals)**
- **NPCs/dialogue/quests/towns** → M12 (warps/doors here enable towns; NPCs populate them next).
- **Cross-zone spatial *prediction*** (predicting through a warp) — warps are a server-authoritative teleport
  the client reconciles to (ADR-0020); no special predicted cross-zone movement.
- **Dynamic/streamed open world** — zones are discrete authored maps; a seamless streamed world is YAGNI.

## 3. Acceptance criteria (EARS)

**Authoring & content (ADR-0008/0006)**
- WHEN a Tiled map is imported THE SYSTEM SHALL produce a RON zone (`zone_id`, layers, warps, grass/
  encounter tags) via a pure, tested importer; the importer adds no in-engine editor.
- IF a zone's warp targets a non-existent zone or a non-walkable tile, OR a `zone_id` is removed/renumbered,
  THEN `validate_content`/the append-only eval SHALL fail (each with a fixture).
- WHEN map content changes and the module is republished THE SYSTEM SHALL reach a live DB via automigration +
  `sync_content` + re-derive — **never** `--delete-data` (migration smoke-test on a real zone change).

**Multi-zone runtime (ADR-0007)**
- WHEN multiple zones exist THE SYSTEM SHALL schedule **one `movement_tick` per zone** and process each
  zone's characters only (the per-zone cost bound from M2 holds), and clients SHALL subscribe to their
  current zone (`WHERE zone_id = ?`).

**Warps (ADR-0020, server-authoritative)**
- WHEN a character steps onto a warp tile THE SYSTEM SHALL (in the per-zone tick) move it to the target
  `(zone_id, tile)` authoritatively, updating its `zone_id` and tick targeting; the client SHALL NOT warp
  itself.
- WHEN the own character warps THE SYSTEM SHALL re-subscribe the client to the new zone and **reset the
  predictor** to the new authoritative own-row (a reconcile/teleport — no rubberband; ADR-0012/0013), with a
  clean transition (e.g. a brief fade), not a stutter.

**Camera & render**
- WHEN the player moves THE SYSTEM SHALL center the follow-camera on the (interpolated) own position and cull
  off-screen tiles/entities; the map is drawn from `zone_map(current_zone)` (wasm), never hard-coded.

> **M11c reconciliation (2026-07-04, ADR-0067 accepted):** the follow-camera and zone-switch warp path are
> IMPLEMENTED (PR #76). The client subscription is **global** (`SELECT * FROM character` — no zone filter),
> per ADR-0067 Option C — SpacetimeDB 2.6 filtered-subscription `onDelete` delivers the OLD zone_id, making
> zone-filtered warp detection unreliable (Option B rejected). The renderer filters by `currentZoneId`
> client-side. Per-zone re-subscription (ADR-0007 goal) is **DEFERRED to M20** (the performance/scalability
> capstone): it requires per-subscription cancellation that SpacetimeDB 2.6 does not yet expose; M20 is the
> natural milestone to revisit subscription scope alongside other scalability optimizations. ADR-0067 moved to
> accepted.
>
> **Off-screen culling DEFERRED:** the "cull off-screen tiles/entities" portion of the Camera & render
> criterion is NOT implemented. Deferral trigger: implement when a zone exceeds ~40×30 tiles OR when headless
> e2e profiling shows render frame time > 16 ms (60fps). Current 2-zone world (well within viewport) produces
> no measurable lag; implementing culling now would be YAGNI. Annotate as deferred; revisit at the M20
> performance capstone or when the size trigger fires.

## 4. Plan (high level)
- **`game-core`** gains a zone registry (`map_for`) over embedded RON; the importer is a separate pure tool
  (tested like any loader). Warps are data on the map; the **warp resolution** is a server rule applied in
  the tick (additive on M2).
- **Prediction across warps (ADR-0020):** a warp is a server-authoritative teleport; the client's reconcile
  already snaps to truth on a teleport (ADR-0012) and re-subscribes — reusing the M4 reconnect-reset path
  for the new zone. No new prediction algorithm.
- **Migration:** the first milestone to *exercise* ADR-0006 under "real content, live DB" — automigration for
  additive zone/content tables, `sync_content` upserts, re-derive where needed.

**Boundary preview — what M12 will consume:** authored **towns** (zones) with **door/warp** tiles for
buildings + interior zones; the multi-zone world NPCs populate; healing locations live in town zones.

## 5. Tasks (M11a importer+content, M11b runtime/warps, M11c camera/subs)
- [x] Tiled→RON importer (pure, tested) + the RON zone format; `validate_content` warp/zone integrity + fixtures. DONE (PR #73, M11a, ADR-0065).
- [x] `game-core` zone registry (`map_for`) + multi-zone embedded content; append-only `zone_id` eval. DONE (PR #73, M11a).
- [x] Server: per-zone schedule rows + per-zone subscriptions live; server-authoritative warp in the tick (ADR-0020); security-auditor. DONE (PR #74, M11b, ADR-0066).
- [x] Migration smoke-test on a real zone/content change (automigration + sync_content + re-derive). DONE: `sync_content` owner-identity guard repaired in M12.5b (PR #86, ADR-0073); nightly republish smoke (no `--delete-data`) added in M12.5b6 (PR #98, ADR-0079).
- [x] Frontend: follow-camera + culling; current-zone subscription + re-subscribe-on-warp + predictor reset; `zone_map(zone_id)` render. DONE (PR #76, M11c, ADR-0067 Option C). **Culling:** annotated as DEFERRED — see §3 reconciliation note below.
- [x] doc-keeper changelog + memory; update M1/M4 boundary notes (warps now exist; camera added). DONE (M12.5g, this pass).

## 6. Risks / decisions
- **ADR-0008 accepted here** (Tiled→RON, pure importer, no in-engine editor) — the const-map YAGNI from
  M1 ends; the swap was localized to `zone_0()→map_for()`.
- **Schema migration is now real** — once authored content + live data exist you can't `--delete-data`;
  automigration + `sync_content` + re-derive is the path; gate it with the smoke-test (ADR-0006).
- **Warp = server-authoritative teleport** (ADR-0020), reconciled, not predicted across the boundary; reuse
  the M4 reset-on-reconnect path for the zone switch to avoid rubberband.
- **Open (flagged for the M14 checkpoint):** the exact Tiled authoring workflow + the warp/door data schema
  details — sensible defaults chosen; revisit at the checkpoint if you want a different pipeline.

## 7. Review / red-team notes
### Design notes (no v1 chapter — v1 kept a const map; designed from standards + v2 patterns)
The zoned schema was built since M2 precisely for this; M11 is largely a *query/data* change, not a
migration of the engine — the payoff of "zoned from day one" (ADR-0007). Tiled→RON keeps content data,
the importer pure/tested (ADR-0008). Warps reuse the existing reconcile/teleport + reconnect-reset paths
rather than inventing cross-zone prediction.
### Red-team
- Dangling warp / renumbered zone → `validate_content` + append-only eval + fixtures. · Live-content edit
  lost → automigration + sync_content smoke-test (no `--delete-data`). · Warp rubberband → reconcile-snap +
  re-subscribe reset (ADR-0020). · Per-zone tick cost → already bounded (M2); a zone exceeding `STEP_MS` is
  the signal to split it.
### Simplify
Discrete authored zones (no streamed open world); warps are server teleports (no cross-zone prediction);
importer is build-time/pure (no in-engine editor).

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
