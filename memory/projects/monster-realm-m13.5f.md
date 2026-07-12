---
name: monster-realm-m13.5f
description: m13.5f type-rigor hardening — GrantItem gate, quest match, coded decode, party-slot core check, marshal re-checks (ADR-0091)
metadata:
  type: project
---

M13.5f DONE (branch `feat/m13.5f-type-rigor-hardening`, tip `8d0b979`, PR pending).

**f-1** `validate_npc_content` 6b (GrantItem item-id cross-ref) + 6c (once-only gate via BTreeSet intersection of NotFlag/SetFlag same flag name); `talk` security comment; choice-level GrantItem must have gate in choice's own conditions+effects (NOT satisfied by node-level entry_conditions gate — intentionally strict).

**f-2** `trigger_matches` exhaustive nested match — no tuple wildcard.

**f-3** `dir_from_code`/`action_from_code` → `Option<T>`; `apply_move_coded` → `Result<[i32;4], String>`; `predict_move` → `Result<Vec<i32>, JsValue>`.

**f-4** `check_party_slot` + `SlotError` in `game-core/src/world.rs`; `set_party_slot` delegates; **occupied_slots must exclude PARTY_SLOT_NONE boxed monsters** (contract); RT-PS-01 documenting test.

**f-5** `skill_defs_from_rows`/`type_chart_from_rows` → `Result` with range checks; `?` in battle.rs + taming.rs.

**Key traps:**
- PARTY_SLOT_NONE filter: caller must filter boxed monsters from occupied slice
- `apply_move_coded` error type is `String` (not `&'static str`)
- `doc_lazy_continuation`: blank `///` lines needed before `6b.`/`6c.` in doc list
- knowledge bundle drifts when line numbers shift in monster_mgmt/world — run `just knowledge`

**Named residuals:** RT-PS-01 race (DB constraint needed), RT-PS-DIALOGUE TOCTOU, pp>0 gap, API asymmetry

**ADR:** 0091. Next-free: 0092.
