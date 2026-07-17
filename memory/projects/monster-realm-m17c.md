---
name: monster-realm-m17c
description: m17c ranked evals tail (ADR-0121, PR #198) — sql server-truth e2e, checker-import reuse, no-op-body hardening; traps for eval/e2e slices
metadata:
  type: project
---

# Monster Realm m17c — ranked evals tail (ADR-0121, PR #198 open at write time)

Delivered (test-only): `evals/ranking-security.eval.mjs` (RL-16: A1/A2 module-write-only,
B1/B2 once-only two-needle per ADR-0119 D3, C1a/C1b/C2 never-deleted);
`evals/ranking-pve-exclusion.eval.mjs` (RL-17: re-verify 4 battle.rs guards via frozen-eval
imports + `hasPvpRejectWithNonEmptyBody` killing the documented `if is_ranked_pvp(&battle) {}`
no-op residual); `client/e2e/ranked-forfeit.spec.ts` (RL-18: challenge→accept via M16b DOM
testids → forfeit by closing B's browser → zero-sum `spacetime sql` assertion). 63 evals;
e2e suite 34+1; red-team: 9/9 real-source mutations bite, flake-free ×5.

**Traps (why):**
- `just eval` rebuilds `client-wasm/pkg` in a dev-server-incompatible shape (prediction-parity
  /js-path-parity evals). `just ci` orders `wasm` AFTER `eval`; `just e2e` depends on `wasm`.
  NEVER run raw `npx playwright` after `just eval` without `just wasm` between — symptom is
  gameReady timeout + pageerror "does not provide an export named 'apply_move'". Also: never
  run `just wasm` CONCURRENTLY with the eval suite (mixed-timestamp pkg, same symptom).
- Scan-set reuse across eval criteria leaks exclusions: C1b initially iterated B's
  `domainFiles` which excluded pvp.rs (for the B1/B2 count) — pvp.rs escaped the split-binding
  scan. Verify each criterion's scan set independently; the fix appends pvp.rs explicitly.
- Side B (acceptor) is `opponent_identity`: client `store.ongoingBattle`/`latestPlayerBattle`
  match `player_identity` only — B has NO battle view/ongoingBattle. e2e asserts battle-live on
  A only; B's accept-success signal = pvpView auto-hide.
- Forfeit has NO client-callable reducer — only `forfeit_on_disconnect` (browser close) or the
  60s deadline reaper. Disconnect is the e2e trigger; sub-minute test can't race the deadline.
- `spacetime sql` renders Identity as `0x` + 64 LOWERCASE hex, un-truncated; client SDK hex may
  lack the prefix — normalize both + identify winner by `wins===1`, hard-fail with raw output.
- Frozen-eval checker reuse: import from `battle-reducer-security.eval.mjs` (m17a staged the
  exports); validate ALL exports via `mod[k]` typeof loop (no unused destructured bindings —
  biome) and return RED, never throw, on missing export.
- Scratch-tree mutation testing for evals: symlink all of server-module/src except a mutated
  file copy, run the eval's default export with cwd at the scratch root (evals resolve
  'server-module/src' relative to cwd). Cheap real-source bite verification.

**Cross-slice contract:** m17b must keep ALL `ctx.db.profile()` access inside ranking.rs
(ADR-0119 D6) or explicitly widen the A2 allowlist in its PR — inline-commented in the eval.
Post-integration (m17b+m17c): spec §5 verification block. [[monster-realm-m17a]]
