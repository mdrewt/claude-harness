---
name: monster-realm-m12d
description: M12d client dialogue/quest/heal UI — e2e regression root cause + fix (missing HTML overlay elements + ADR-0014 visibility guards)
metadata:
  type: project
---

M12d (PR #83, `feat/m12d-client-dialogue-quest-ui`) = client dialogue screen, quest log overlay, and heal-location overlay.

## Key deliverables
- `DialogueView` / `QuestLogView` / `HealView` DOM shells (`client/src/ui/`)
- `buildDialogueViewModel` / `buildQuestLogViewModel` / `buildHealViewModel` pure models
- `dialogueContent.ts` static dialogue-tree map (client-side content, no server round-trip)
- SpacetimeDB subscription for 4 new tables: `player_conversation`, `player_quest`, `heal_location_row`, `npc`
- `client/index.html`: 3 overlay element groups (see Bug 1 below)
- ADR-0071 (docs/adr/0071-*.md): M12d design decisions (mutual-exclusion overlay order, client subscription approach, dismissPending guard, cooldownMs bigint)

## e2e regression root cause + fix (commit c177805)

**Bug 1 (rAF crash — primary):** The 3 new Views used `document.getElementById()` to find
pre-existing elements, but `client/index.html` had no such elements. `dialogueView.visible`
accessed `null.style.display` inside the rAF frame loop (no try/catch) → TypeError → loop
died → `sawFractionalOwnMotion` never set → golden.spec.ts:161 timed out.

**Fix:** added `#dialogue-overlay`, `#quest-log-overlay`, `#heal-overlay` (+ children) to
`client/index.html` with `style="display:none"`.

**Bug 2 (always-visible overlays):** `buildQuestLogViewModel([])` and `buildHealViewModel([])`
return non-null VMs for empty data → `render()` sets `display:block` → overlays permanently
"visible" → movement keys suppressed on every batch update.

**Fix:** added `if (!questLogView?.visible) return;` / `if (!healView?.visible) return;`
visibility guards in the batch listeners for quest log and heal (ADR-0014 refresh-when-visible
pattern). Dialogue batch listener intentionally has NO guard (auto-opens server-initiated).

## Design patterns
- Overlay mutual exclusion: battle > box > raising > evolution > dialogue > questLog > heal (ADR-0071)
- Quest log + heal = user-toggled (KeyQ / KeyH); dialogue = server-initiated (auto-shows on conv)
- dismissPending flag prevents double-send of dismiss_dialogue while server processes it
- cooldownMs: typed as number in TS but bigint flows through — documented type-alias gap (ADR-0071)

**Why:** store.flushBatch has no per-listener isolation — all 3 new batch listeners are wrapped in try/catch.
**How to apply:** if adding new user-toggled overlays, use the visibility guard pattern from refreshBox; for server-initiated overlays (like dialogue), render unconditionally.
