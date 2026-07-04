---
name: monster-realm-m12.5a
description: M12.5a DONE — fuse dual-write bug fixed, PR #84 open, just ci green
metadata:
  type: project
---

M12.5a COMPLETE: fuse offspring `monster_pub` dual-write ordering bug fixed (ADR-0072, PR #84).

**Why:** `fuse` reducer called `pub_from_monster(&offspring_monster)` before `ctx.db.monster().insert()`, so `monster_pub.monster_id=0` on every fuse offspring; second fuse aborted on PK-0 collision.

**Fix:** `let inserted = ctx.db.monster().insert(offspring_monster); ctx.db.monster_pub().insert(pub_from_monster(&inserted));` — mirrors movement.rs:104-105 and taming.rs:136-137.

**Seam:** `TestEvolutionDb::insert_monster` now returns `Monster` (auto-assigns id when `monster_id==0`); `fuse_seam` starts with `monster_id:0` and uses insert-return pattern.

**Gates:** `CAPTURE_INSERT='= ctx.db.monster().insert('` + `DISCARD_INSERT='let _ = ctx.db.monster().insert('` in monster-dual-write.eval.mjs (TEETH D + TEETH E). Rust test `fuse_offspring_pub_id_matches_monster_id` (4 assertions). 38/38 evals GREEN, 694 Rust tests pass, just ci EXIT=0.

**How to apply:** Next slice is M12.5b (sync_content path repair) or M10.5 (still unlanded). ADR next-free = 0073 (0072 consumed by M12.5a).
