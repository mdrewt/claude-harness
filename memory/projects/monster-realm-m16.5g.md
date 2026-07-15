# Monster Realm — m16.5g (docs-only ledger/docs reconciliation) — TERMINAL: PR #193 open

**Slice:** m16.5g, final M16.5 slice (spec §16.5g-1..4). **PR:** https://github.com/mdrewt/monster-realm/pull/193 (branch `docs/m16.5g-ledger-reconciliation` @ c552a84). Local full `just ci` EXIT=0 (1211+943 tests, 61/61 evals). Harness ledger landed directly on harness main: c6aebc3 + 77a0a25. **ADR 0118 UNUSED** (no new decision) — next-free stays 0118.

## What changed
- ARCHITECTURE.md: module table += economy.rs / trading.rs / content_cache.rs / **pvp.rs**; guards.rs row refreshed (trade-escrow + pvp guard surface); "24 of 25 tables" + "Table=23/Reducer=25" → "generated — see docs/knowledge/"; ADR range → README + DIGEST.md reference (no hard upper bound); "M14.5c PR TBD" → #151. m15c was ALREADY marked complete (verified no-op).
- CHANGELOG regenerated (`just changelog`) to #192.
- Harness: PLAN.md:3 → Phase C reality; M15 §4 + M-infra-d + M14.5 + M16.5(a–f) DoD boxes ticked with PR refs; 14.5h line added; "0104 unused" reworded.

## Non-obvious traps / facts (why this card exists)
- **CHANGELOG byte-identity must be verified against MASTER-history cliff output, not branch HEAD**: `git cliff` at branch HEAD emits lines for the branch's own `wip:` commits, which vanish at squash-merge. Committing them would be wrong; a verifier comparing at branch HEAD reports a false FAIL (happened this slice — resolved by diffing against a main-checkout cliff run). A slice's own squash line lands at the NEXT regen.
- **ADR-0102 hole is deliberate** (reserved-unused by m14.5e, recorded in PR #155 chore). Don't "fix" the README for it.
- **m16b (#176) / m16c (#178) are MERGED** — a launch-brief parenthetical claiming "parked" was stale spec-header text; verify merge state from git, not brief prose.
- Residuals recorded in handoff for supervisor: ARCHITECTURE M14.5 narrative partial (14.5d-1b/e/f/g/h entries never written — M14.5 doc-keeper-close box left unticked); ADR-0094 has no amendment marker → ADR-0100; PR #164 subject cites ADR-0047 erroneously.
- git-cliff "4 commits skipped (parse errors)" warning is pre-existing/benign.

Related: [[monster-realm-m16.5f]], [[monster-realm-m14.5h]], [[monster-realm-m-infra-d]].
