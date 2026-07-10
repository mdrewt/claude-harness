---
name: monster-realm-m13-5c
description: "m13.5c content-lifecycle + player_conversation privacy (ADR-0087, PR"
metadata: 
  node_type: memory
  type: project
  originSessionId: 42b93fbb-f716-46de-8ce9-7521cbd818e5
---

m13.5c (PR #123, branch `feat/m13.5c-content-lifecycle`, tip 54ea4ad, base 8ef8a7f) — M13.5 §2 13.5c-1..5 + D-13.5-3. ADR-0087 CONSUMED (+ ADR-0069 amendment).

- **First `#[spacetimedb::view]`** (`my_conversation`, owner-scoped via `owner_identity().find(ctx.sender)`, lives in schema.rs beside the table). `player_conversation` now PRIVATE. **TRAP: view row UPDATE delivers as UNORDERED `onInsert(new)` + `onDelete(old)` — NO onUpdate** (view table has no PK) → client onDelete must be gated by net-effect `shouldRemoveOnViewDelete` (rowConvert.ts, pure). Identical-value update pair is fundamentally ambiguous client-side (RT-M13.5C-03, documented ADR-0087): unreachable today (KeyT overlay-guarded, no self-loop dialogue trees); durable fix = no-op-skip upserts in npc.rs (follow-up).
- **Rollout trap (T0 spike):** an old bundle subscribing the now-private table errors its WHOLE batch, `onApplied` never fires → blank world + 13.5b rebuild loop re-fails. Self-hosted contract: hard-refresh after visibility republish.
- **NPC sync planner** `plan_npc_sync` (Insert/Update/Remove/Repair): Update PRESERVES entity_id (delete+reinsert would orphan player_conversation.npc_entity_id + break client identity); zone-change → respawn patch; Repair = half-orphan self-heal (old entity_id pushed to removal set → conversation cascade). Cascade uses HashSet join.
- **Zone reap seams:** `stale_zone_def_ids` (content.rs) + `plan_schedule_reconcile` (lib.rs); game-core `validate_zones` REJECTS an empty registry (empty zones RON would otherwise reap every zone_def — world-destroying).
- **write_back_hp clamps to ROW `stat_hp`** (not bm.max_hp); correct ONLY because write-back precedes the XP/level-up re-derive (comment at clamp site).
- **Eval parser traps found this slice:** (1) naive first-`{`-after-`fn` body-walk is blinded by const-generic braces in a return type (`Vec<[T; {1}]>`) — parseViews now angle/paren-depth-aware, tooth T15 bites both directions; (2) double-star glob token in a LINE comment opened a phantom block comment in the eval stripper swallowing all later sources (577dce8); (3) a string literal in content_tests.rs containing `pub fn sync_content(ctx:` shadowed the real reducer in a first-match source scan → `concat!` de-collision (7621e1c); (4) windowed needles need `\b` (`FROM player_conversation` would false-red a future `_archive` sibling).
- **migration-smoke re-anchor:** zone_def delete legal IFF fed by `stale_zone_def_ids`; schedule membership via the `plan_schedule_reconcile` seam.
- Verifier: every gating file UNWEAKENED/STRENGTHENED; `just ci` 853 Rust + 726 client + 52/52 evals; full e2e green (R2 recruit first-run red re-confirmed as the code-independent stochastic grind flake).
- **Follow-ups parked:** npc.rs no-op-skip upserts; OKF exporter has NO `#[view]` support (my_conversation missing from knowledge bundle); `#[cfg(test)] mod test_helpers` consolidation (5× strip_rust_comments copies across [[monster-realm-server-test-extraction-m89c]] sibling test files); RT-M4 stranded player_quest on NPC removal; R2 grind-flake hardening ([[monster-realm-m13.5h]]).
