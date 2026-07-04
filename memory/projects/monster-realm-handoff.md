---

## 2026-07-04T15:21:43Z — IN-PROGRESS: m10.5d launched (mr-sup-cowork-20260704T150628Z-2280652-17492)

- Composite tick: after m10.5c merge, launching M10.5d (mechanical gate hardening per M10.5 spec §3/10.5d). ADR 0081 reserved (likely unused). Structural touch (evals/run.mjs) -> serial, no fan-out.

## 2026-07-04T17:00:00Z — CLOSED: m10.5d terminal state (PR #110)

- Branch: `feat/m10.5d-gate-hardening`, tip: `92d3d45`
- PR #110 open: https://github.com/mdrewt/monster-realm/pull/110
- All 3 EARS criteria met: vite.config.ts allowOnly:false (10.5d-1), playwright.config.ts forbidOnly:!!process.env.CI (10.5d-2), store.ts flushBatch per-listener try/catch closes M8.8e residual (10.5d-3)
- New eval: evals/gate-hardening-config.eval.mjs (4 criteria, 11 bad fixtures, brace-depth matching for Criterion D)
- run.mjs: per-eval try/catch + synthetic pass:false; zero-eval guard count updated to 40+
- Gate: just ci EXIT=0; 574 client tests pass; 41 evals all PASS
- No new ADR (spec says mechanical hardening needs none); ADR next-free=0081 unchanged
- Worktree: .claude/worktrees/m10.5d (symlinks: client/node_modules→main, client-wasm/pkg→main)
- **Next:** M10.5 milestone CLOSED. Supervisor to determine next milestone.


## 2026-07-04T16:22:06Z — supervisor tick mr-sup-cowork-20260704T160624Z-2337718-28130 (cowork)

- **m10.5d MERGED**: PR #110 (gate hardening — allowOnly:false in vite, forbidOnly in playwright, per-eval isolation in run.mjs, flushBatch per-listener isolation) squash-merged at ~16:08Z -> master 15bd08b. PR CI+e2e green pre-merge; master CI GREEN post-merge on 15bd08b.
- Audits: orchestration CLEAN (sonnet-4-6 asserted, 5 subagent invocations incl. tester+reviewer+red-team; 1 attempt, $9.11); gating-test clean (no removed tests, +3 tests; .only hits = the hardening target). Diff note: evals/gate-hardening-config.eval.mjs (new) was outside declared touches — adjacent to declared evals/run.mjs, no siblings in flight, accepted with note.
- ADR 0081 released unused (mechanical slice; next-free stays 0081). Cleanup: worktree .claude/worktrees/m10.5d removed, local+remote branch deleted, main checkout ff'd to 15bd08b. Strays untouched (.claire/, 3 labeled stashes).
- **M10.5 milestone CLOSED (a/b/c/d all merged).** Queue re-derived: M12.5 (a-g) and M8.95 (a-d) fully merged; next per PLAN §9 Phase B = **M13 Economy & inventory** (M13-economy.spec.md, corpus ADR-0022). Composite-launching M13a (currency primitive) this tick.

## 2026-07-04T16:26:54Z — IN-PROGRESS: m13a launched (mr-sup-cowork-20260704T160624Z-2337718-28130)

- Composite tick: after m10.5d merge (master 15bd08b GREEN), launched **M13a** (currency primitive — owner-private balance + grant/spend helpers, saturating/reject-on-insufficient, RLS + overflow fixtures; M13-economy.spec.md section 3+5 task 1). First slice of M13 Economy & inventory (Phase B).
- STRUCTURAL touches (schema.rs + bindings) -> ALWAYS SERIAL, no fan-out. ADR **0081** reserved for m13a; adr_next_free -> 82.
- Leader 2343886 (own session, detachment asserted), claude 2343889, model claude-sonnet-4-6 asserted, codebase-memory-mcp up.
- Next tick: fast-path liveness on 2343886; on .done -> audits (orchestration: tester+reviewer roles required; gating-test integrity; touches-subset) then merge; then M13b (shops) / M13c (sinks) / M13d (client) — b/c serial after a; d (pure client) may fan out with c per pair rules.

## 2026-07-04T18:0xZ — supervisor tick mr-sup-cowork-20260704T180521Z-2441824-21863 — IN PROGRESS
m13a run finished (EXIT=0, ATTEMPTS=1) with PR #111 open, but remote CI RED on both jobs: shared root cause `wasm-pack build` -> "File exists (os error 17)" in `just wasm` (justfile:34); 3 wasm-parity evals fail in ci job, all else green. master@15bd08b remote-green at 16:08Z -> suspect runner toolchain drift (unpinned jetli/wasm-pack-action) or slice interaction. Action: RESUME-launch m13a with fix-remote-red brief (touches extended for this resume: justfile, .github/workflows/**, client-wasm/**). remote_red_fix_cycles=1. Never merging red.

## 2026-07-04T18:17Z — m13a CI-fix resume (this session)

Root cause diagnosed: the worktree setup had created a symlink `client-wasm/pkg -> .../monster-realm/client-wasm/pkg` which was accidentally committed in the m13a branch. In CI (fresh checkout) the symlink exists but its target doesn't; wasm-pack tries to `create_dir("client-wasm/pkg")` → EEXIST (os error 17).

Fix: `git rm --cached client-wasm/pkg` + `rm client-wasm/pkg` + added `client-wasm/pkg` (no trailing slash) to `.gitignore` (the existing `client-wasm/pkg/` with slash only matches directories, not symlinks).

- Commit: 9906439 `fix(m13a): remove accidentally-committed client-wasm/pkg symlink`
- local `just ci` EXIT=0 (801 Rust + 574 client + 41 evals all green)
- Pushed to `feat/m13a-currency-primitive`; remote CI run #28715339830 in_progress
- **Terminal state: PR #111 open, remote CI running. Supervisor owns merge.**
- No new ADR needed (not a behavior/design change, just a gitignore/worktree artifact fix).
