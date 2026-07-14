---
name: monster-realm-m16c
description: m16c PvP evals tail — ADR-0111, PR #178. Evals-only; M16 PvP CLOSED.
metadata:
  type: project
---

M16c PvP eval harness shipped (ADR-0111, PR #178, branch `feat/m16c-pvp-evals`).

**Why:** M16a/m16b shipped PvP spine + client UI with Rust tests but no JS eval coverage. Three defect classes required JS evals: cross-language `battle_action` privacy (schema.rs + connection.ts), challenge lifecycle guard completeness (role+status+GC per reducer), and liveness invariants (scheduler guard, stale-turn, disconnect handling).

**How to apply:** M16 PvP is CLOSED. ADR next-free = 0112. No open structural slices remain in M16.

## Key decisions / traps

- ADR canonical header format (`**Status:**`, `**Date:**`, etc.) required for `adr-digest --check`. Table-format triggers "missing field" errors.
- Subsystem vocabulary for adr-digest: `battle`, `evolution-fusion`, `movement-netcode`, `content`, `schema-persistence`, `client-ui`, `ci-gates`, `tooling-docs`, `security-authz`, `economy-quests`. No others accepted.
- `**Decision:**` field capped at 240 characters by adr-digest.mjs.
- DIGEST.md must be regenerated via `node scripts/adr-digest.mjs` after adding any ADR ≥ 0104.
- Tester review added CANCEL_DELETE as 11th criterion to pvp-handshake-guards (cancel_challenge should GC the row — was in the docblock but not the real-source check).

## Final state

- Eval count: 61 (58 → 61; 3 new PvP evals)
- Criteria: 20 (4 privacy + 11 lifecycle guards + 5 liveness)
- `just ci` EXIT=0: Rust 1176/1176, client 938/938, evals 61/61
- PR #178 open; supervisor owns squash-merge
- Worktree: `.claude/worktrees/m16c`
