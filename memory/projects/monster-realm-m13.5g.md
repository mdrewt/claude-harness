---
name: monster-realm-m13.5g
description: M13.5g docs/spec ledger reconciliation — §5 ticks, spec statuses, ARCHITECTURE/AGENTS/ADR/workflow fixes, warpDetect wire-in
metadata:
  type: project
---

M13.5g DONE — PR #131 open, branch `feat/m13.5g-docs-ledger-reconciliation`, tip `89822f4`, `just ci` GREEN (778 tests, 0 eval FAILs).

**Why:** Accumulation of stale doc state across M7–M13.5 — spec §5 checkboxes, spec statuses, ARCHITECTURE.md counts/signatures, ADR collision ambiguity, code residuals.

**How to apply:** ADR next-free = 0091 (unchanged — docs-only slice). Master at `6d7ce61`, worktree at `89822f4`.

## What was done

**13.5g-1 (doc-keeper):**
- M7/M8.5–M8.9 §5 task checkboxes ticked with PR refs (M7a=commit aae9c56, M7b=#8, M7c=#9, M8.5 5b=#17/5d=#19/5e=#30/5f=#31, M8.6 6a=#32/6b=#33/6c=#34, M8.7 7a=#37/7b=#39/7c=#36/7d=#40, M8.8 8a=#47/8b=#42/8c=#44/8f=#46, M8.9 9a=#48/9b=#50/9c=#51-54/9e=#49/9d=#55)
- M10.5 spec: status → `delivered` + Delivered block (PRs #107–#110)
- M12.5 spec: status → `delivered` + M10.5 references updated from "never implemented" to "subsequently delivered"
- PLAN.md: status header updated, M12.5 bullet updated, M8.9 bare "ADR-0055" → path-prefixed
- ARCHITECTURE.md: 22/22 tables → 24/25; "29-eval suite" → "53-eval suite"; switchZone sig fixed; flushBatch residual closed note; coverage-shell list 7→13; ADR range 0001/0035–0090; ADR collision paragraph
- docs/adr/README.md: range 0035–0090 + ADR-0090 row + collision note
- ADR-0049: pointer note for battle_monster_from_row → marshal.rs (M8.9b)
- AGENTS.md: M3 wasm-pack clause cleaned + ADR collision exception added
- server-module/src/lib.rs: CONTENT_VERSION v3–v7 history added (was only v2)
- client/src/main.ts: 4 stale "no per-listener isolation" → "defense-in-depth (M10.5d)"
- M12 spec: dismiss_dialogue added to reducer list in §5 DONE note
- docs/workflow-loops.md: "no wip(…) merge titles" section added
- CHANGELOG regen (just changelog)

**13.5g-2 (ADR resolution rule):**
- docs/adr/README.md, AGENTS.md, ARCHITECTURE.md all have harness 0055–0057 collision note
- PLAN.md bare "ADR-0055" → "docs/adr/0055 (harness adr/0055 = …)"

**13.5g-3 (code/structural):**
- warpDetect.ts wired into connection.ts (import isOwnZoneChange + call in onUpdate handler)
- Root package-lock.json 92-byte stub deleted (no root package.json)
- @types/node ^22.0.0 → ^24.0.0 + client/package-lock.json updated (resolved 24.13.2)

## Trap: knowledge bundle drift
Updating the CONTENT_VERSION doc comment in lib.rs (which sync_content references) caused knowledge-bundle-conformance eval to fail with drift. Fix: `just knowledge` to regenerate docs/knowledge/ before committing.
