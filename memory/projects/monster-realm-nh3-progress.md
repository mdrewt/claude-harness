# nh3 progress memo — TERMINAL: PR OPEN, awaiting supervisor merge (2026-07-25)

**Status:** ✅ Slice complete to terminal state — **PR #254 open**
(https://github.com/mdrewt/monster-realm/pull/254), **local `just ci` fully green**, remote CI
in_progress (run 30178617174). Merge is SUPERVISOR-owned (`mr-ci-watch` → squash). Do NOT
`gh pr merge` from a build-loop session.

**Branch:** `feat/nh3-predictor-epoch-guard` @ `78898a5` (pushed; worktree `.claude/worktrees/nh3`,
based on `origin/master` = `cfbf59e`, which is still master tip at PR time — no rebase needed).

## DONE (this session — resumed from plan checkpoint 79956bf per plan v2 §3)
- Tester (opus, separate agent) Phase A: mechanical 2-arg `dropRejected` call-site threading
  (16 sites, intent-derived epochs, A9), suite green → commit `2417a4b`.
- Tester Phase B: 12 RED gating teeth — N1–N6, ptc5f pin restructured to nh3-2 survival arms,
  signature/brand/no-getter source-scans, 4 `W-NH3-*` wiring teeth → commit `5253682`.
- Implementer (separate agent): branded `PredictorEpoch` guard + `lastSentSeq`→`seedSeq` floor,
  exactly `predictor.ts` + `main.ts` → 12 red→green, full suite 1452/1452 → commit `629b70c`.
- Reviews: reviewer (clean, 1 nit), red-team (ALL §7 mutations + 2 invented live-run, every one
  killed, zero blockers), desync-guard lens (2 medium comment-accuracy findings), /simplify
  (already minimal). Fixes → commit `736c6c8`.
- **Desync-lens correction folded into docs (do not regress this):** "rebuild immediately
  followed by reconcile" is TRUE ONLY for `switchZone`; on RECONNECT the reconcile is deferred
  (server `on_disconnect` deletes player/character rows → `reconcileFromStore` early-returns
  until `joinGame` round-trips) and safety rests on ADR-0085 ordering + `held.clear()` ALONE.
- Docs: ADR-0152 (new), ADR-0085 append-only amendment (`Amended-by: ADR-0142, ADR-0152`),
  ARCHITECTURE.md note, DIGEST regen (`just adr-digest`; Decision-line 240-char gate bit once —
  trimmed) → commit `78898a5`. Memory card `monster-realm-nh3.md` + MEMORY.md line written.
- Verifier: PASS — no-weakening proven (RED state reproduced byte-exact: 12 fail → 217/217;
  `expect(` counts identical), full `just ci` step-by-step green (nextest 1456/1456, evals
  71/71, vitest 1452/1452, tsc, clippy -D, biome, secrets, wasm), teeth spot-kills live, digest
  no-op, zero `.rs` → no `just knowledge`.

## REMAINING (supervisor)
- Merge PR #254 on remote-CI green (squash; title is the Conventional Commit).
- ADR index (`docs/adr/README.md`), CHANGELOG reconciliation, spec §nh3 DELIVERED annotation
  (spec file had in-flight supervisor edits — deliberately untouched by this run).
- Worktree/branch cleanup post-merge.

## FLAGS FOR SUPERVISOR (out of nh3 scope, recorded in ADR-0152 residuals + PR body)
- **nh5 candidate (build next?):** `resetPredictionState()` → `held.clear()` (`main.ts:293`)
  stops held movement dead across every warp/reconnect until release+re-press. Deterministic,
  worse feel defect than nh3 itself. ⚠ nh5 MUST revisit the reconnect-arm residual accounting
  (`held.clear()` is now documented as LOAD-BEARING there — predictor.ts outstandingSteps
  comment + ADR-0152).
- **Parked nh3-e2e:** must script `warp → release → re-press` (+ induced pre-warp rejection);
  bare hold-through-warp is vacuous-green. Home: `client/e2e/zoneSync.spec.ts`.
- Pre-existing, named, unfixed: first-connection pre-reconcile window (≤1 swallowed keypress,
  self-heals); `switchZone`-fail → `reconcileFromStore` early-returns until reload.

## EXACT NEXT STEP (if resumed)
Nothing for a build session unless remote CI reds — then: fix in the worktree, push, keep PR
open. Environment traps for any resume: Node via `export PATH="$HOME/.asdf/installs/nodejs/
24.13.1/bin:$PATH"` (default shell has v18); `gh` via `$HOME/bin:$HOME/.asdf/shims`.
