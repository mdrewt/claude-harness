# rb-73 — progress memo (TERMINAL: PR #457 open, local ci green, ledger 9/9, verifier PASS; 2026-09-11 ~02:30Z)

Slice: rb-73 — Disconnect side effects are client-triggerable on demand by any identity token holder
(residual R-18r-b-DISCONNECTSELF, MED/security). Tier HARD, fable@xhigh, ADR 0245.
Branch: `feat/rb-73-disconnect-session-guard` @ 67ff868 (pushed) · worktree `.claude/worktrees/rb-73` (from master 9434dfb).
PR: https://github.com/mdrewt/monster-realm/pull/457 (open; supervisor owns the merge and the widening decision). WARN flag `/tmp/mr_warn_rb-73` present since ~02:05Z → landing pattern (no new scope/fan-outs).

## DECISION (after two forced auto-resumes of a verified park)
Proceeded under a DISCLOSED scope widening: no sibling in flight (worktree list, open PRs, mr-state inflight/queue
all checked), the spec's own touches line is `(inherit — REVIEW)`, the ledger's scope text anticipates
"server-module schema/reducers". Every out-of-touches file goes in the PR body's `touches-delta:` with its
forcing gate; the supervisor may reject.

## DONE
- Fix shipped: private `player_session {pk connection_id, btree identity}` (schema.rs) + manifest entry
  (Erase, not exportable); lib.rs `open_player_session` (before the anonymous early return, hoisted JWT bool),
  `has_live_session`, `erase_player_sessions`, hooks rewired ("last connection out"); accounts.rs cascade 6e.
- Census/roster pins updated (accounts_tests.rs 41→42/13→14/17→18/21→22/22→23, privacy_tests floor 22→23,
  trading_tests prose, stale "thirteen/41" prose); evals: T-VIS 18/24 + pinned roster + baseline regenerated,
  REKEY_MANIFEST row (+ cross-ref comment), S9 transcription 42 + teeth fixture 14 + `n_parts` 42,
  guest-claim TEETH_PINNED 352; generated `client/src/module_bindings/types.ts` (PlayerSession row type only).
- Tests: 9 `rb73_*` tests (tester, opus) GREEN; module 885/885; clippy -D warnings clean; fmt clean.
- Lenses on the artifact: reviewer (approve pending prose — done), red-team (CRITICAL: helper body shape-pinned
  only → tester now exact-pinning it), reducer-security-auditor (PASS; M-1 ABORT-PHANTOM residual recorded in
  schema comment + ADR), desync-guard (H1: `dismissPending` reconnect self-heal → fixed in client/src/main.ts
  onReconnect; client comment truth in authToken/connection/predictor/store fixed; main.wiring 205/205).
- Docs: ADR-0245 finalized (Amends 0232+0228 with reciprocal Amended-by; residuals PVP-HOLD/WILD-HOLD/
  TOKEN-WEDGE/ABORT-PHANTOM/NOEXEC/HOSTWRITES; challenge_pvp online semantics; deploy window; X8 note),
  ADR-0232 D2 amendment below its cited line 51, ADR-0228 6e, ADR-0180 twin claim, driver AM25 (76-89 kept),
  ARCHITECTURE lib.rs row, `just knowledge` + `just adr-digest` regenerated.
- X6 mutant register (`memory/projects/gates/rb-73.x6-mutants.mjs`): 12/14 killed; M13/M14 (insert dropped /
  wrong identity) survive until the exact pin lands — rerun pending.
- X8 live proof GREEN (`memory/projects/gates/rb-73.x8-live-proof.md`; ledger X8 ticked): WS session + HTTP call
  with A's token → player row survives; WS close → cleanup. The "extra" session row is the reading `spacetime
  sql` connection's own row (measured three ways), not a leak.
- Evals run 2: only account-e2e red on its own teeth fixture (41→42) → fixed; full rerun pending in `just ci`.

## REMAINING
None for the run: terminal state reached (steps 1-5 of the previous list all done — tester pass 2 spliced, X6 14/14, `just ci` CI-EXIT=0, `mr-gates check` 9/9, verifier PASS, PR #457, residuals registered, handoff written). Supervisor: adjudicate the widening, run `mr-gates verify`, squash-merge, refresh the code graphs.

## BLOCKERS
None open. (The original hidden-dependency STOP is superseded by the disclosed widening above.)
