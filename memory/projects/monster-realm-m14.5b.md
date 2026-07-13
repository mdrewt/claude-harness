---
name: monster-realm-m14.5b
description: StatusApplied event carries target slot + Phase 4.5 drops fainted writes (ADR-0099, PR #149)
metadata:
  type: project
---

M14.5b: Phase 4.5 status write targets the slot hit at emission time, not the post-switch active slot.

**ADR-0099 decisions:**
- D1: `BattleEvent::StatusApplied` now carries `slot: u32` (team-slot captured at emission in Phase 2). Phase 4.5 reads slot from event, not from `state.side_X.active`.
- D2: Phase 4.5 drops the write if `state.side_X.team[slot].is_fainted()`. Sandstorm/Hail chip KO between emission and Phase 4.5 → write dropped.
- D3: Removed stale `active_slot_a/b` early-capture from `run_post_turn_phases`.
- D4: Corrected misleading types.rs doc comment.
- `debug_assert!` added: slot-out-of-bounds fails loud in debug/test builds (invariant: slot was captured from `state.side_X.active` at emission, always in-bounds).

**Key trap (DoT vs chip):** DoT (Phase 3) cannot faint a monster that just received a new StatusApplied — no-stacking rule prevents StatusApplied if the monster already had a status (needed for DoT). The only faint-between-emission-and-Phase-4.5 path is Sandstorm/Hail chip (Phase 3.5). Consciousness guard primarily protects that path.

**BattleEvent is NOT persisted** (ADR-0042); no serde migration for the new `slot` field.

**PR:** https://github.com/mdrewt/monster-realm/pull/149
**Branch:** feat/m14.5b-status-slot-capture, tip 7f704b7
**ADR-0099 CONSUMED. ADR next-free → 0100.**
**Supervisor owns squash-merge.**

Why: [[monster-realm-m14.5a]] introduced early slot-capture for the wrong-slot bug but didn't encode slot in the event (spec required it) and didn't add the consciousness guard. M14.5b formalizes both per EARS criteria.

How to apply: When building any future feature that emits a BattleEvent and later acts on it in a different phase — encode the relevant slot/state in the event at emission time; do not re-read `state.side_X.active` in the handler phase.
