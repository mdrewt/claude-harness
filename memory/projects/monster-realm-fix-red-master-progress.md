---
name: monster-realm-fix-red-master
description: fix-red-master slice — UTC date rollover knowledgebundle regen, PR #166
metadata:
  type: project
---

# fix-red-master — DONE (PR #166 OPEN)

## DONE
- Diagnosed root cause: UTC date rollover. m15a squash-merge (c5fddc4) landed at 2026-07-13T22:13:26-04:00 = 2026-07-14T02:13Z. `gitDate(schema.rs)` in `scripts/okf-export.mjs` normalises the git commit ISO timestamp to UTC via `new Date(iso).toISOString().slice(0,10)`, producing `2026-07-14`. All 59 committed bundle files had `updated: 2026-07-13` from when the m15a branch regenerated them pre-merge.
- Created worktree `fix/fix-red-master` from `origin/master` at `.claude/worktrees/fix-red-master`
- Ran `just knowledge` (= `node scripts/okf-export.mjs docs/knowledge`) → 59 files updated, each a 1-line date change `2026-07-13 → 2026-07-14`
- Verified `--check` passes: "bundle in sync (no drift)"
- Committed + pushed: `5f3f6e8 wip(fix-red-master): regen knowledge bundle — UTC date rollover`
- Ran local `just ci` → EXIT=0 (all 60 evals pass, `knowledge-bundle-conformance` PASS)
- Opened PR #166: https://github.com/mdrewt/monster-realm/pull/166

## REMAINING
- Remote CI on PR #166 (supervisor owns merge)
- ADR-0106 index chore PR still deferred (was waiting for master green)

## BLOCKERS
None.

## EXACT NEXT STEP
Supervisor: merge PR #166 when remote CI green → master restores GREEN. Then open ADR-0106 index chore PR (row for ADR-0106, next-free 0107). Then continue m15b (trading client UI).

**Why:** The UTC-rollover trap was documented in the m14.5e handoff note but not fully guarded. The generator always uses the git commit date of schema.rs, which advances when a squash-merge lands past midnight UTC. This is expected behaviour (the bundle accurately reflects when schema.rs last changed). No fix to the generator is needed; the regen cadence is correct.
