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


## 2026-07-04T19:05Z — weekly review: NEW MILESTONE M13.5 inserted (generate-improvement-plan task)

- Seventh weekly multi-lens review completed on a pinned `--no-hardlinks` clone @ `15bd08b` (master tip at review start; fully isolated from runner state; clone torn down). 8 lenses → aggregate (zero contradictions) → 3 blind verifiers (45/45 claims verified, 0 dropped) → ROI triage.
- **NEW: `specs/monster-realm-v2/M13.5-seventh-review-residuals.spec.md`** — inserted between M13 and M14 (PLAN.md §9 bullet added). Include it with your git commits. Land after M13 closes, or opportunistically: 13.5a (gate-of-gates CI wiring guards, the one High), 13.5g (docs/ledger), 13.5h (recruit-e2e revival) are disjoint from M13's touch-set today.
- Headline findings: ci `just eval`/`just test` steps + nightly mutation/coverage jobs are removable with zero mechanical bite (self-sealing guard gap); verified silent 1-tile prediction desync when a server-rejected enqueue_move is the last input of a burst (no reducer-status callbacks registered anywhere in client); NPC seeding is insert-only (ADR-0073 dead-path class reintroduced); PLAN/spec ledger under-reports M10.5/M7/M8.x as undelivered — do NOT re-schedule M10.5, it is fully landed (PRs #107–#110); 13.5g fixes the ledger.
- 3 DECISIONS for Drew are in spec §3 (interp buffer depth, server-module mutation scope, player_conversation privacy timing) — defaults stated, safe to proceed on defaults.
- Runner discretion preserved: chain milestones/slices per your own judgement; M13.5 slices declare `touches:` and sequencing in spec §6.


## 2026-07-04T19:15:06Z — supervisor tick mr-sup-cowork-20260704T190539Z-2479422-41: m13a merge BLOCKED by audits; launch aborted (foreign task active)

- m13a fix-remote-red run finished EXIT=0/ATTEMPTS=1; PR #111 OPEN, mergeStateStatus CLEAN, remote ci+e2e GREEN.
- Pre-merge audits found: (1) **`client/node_modules` symlink committed** (absolute local path; `.gitignore` `node_modules/` dir-form misses symlinks — same class as the `client-wasm/pkg` fix in 9906439); (2) **orchestration audit FLAGGED** — resume overwrote the original build log (1 init, 0 Agent invocations recorded), so review-lens evidence is unverifiable → mandatory review pass before merge. Gating-test grep clean.
- Corrective resume brief written + validated at `/tmp/mr_pass_m13a.md` (symlink removal + bare `node_modules` gitignore form + reviewer/red-team/domain-auditors/verifier pass over the PR diff). Stale `.done` cleared.
- **Launch ABORTED at the final re-probe**: generate-improvement-plan task wrote PLAN.md, M13.5 spec, and this handoff at 19:08Z (<6 min). Cross-task standdown (rule 7). consecutive_standdowns=1.
- Next tick: probe → launch the pre-written m13a brief → merge only after review pass + remote green. master GREEN @ 15bd08b.


## 2026-07-04T20:30Z — m13a post-hoc review pass COMPLETE (branch e020be5, remote CI running)

**5 lenses run in parallel: reviewer / red-team / reducer-security-auditor / desync-guard / verifier**

All findings fixed, `just ci` EXIT=0 (801 Rust + 574 client + 48 evals), pushed `e020be5`.

**Verdicts:**
- **Reviewer:** 2 MAJOR fixed (missing `#[must_use]` on `apply_grant`; `spend_currency` zero-guard was mutation survivor → new test), 3 MINOR fixed (economy_tests.rs added to eval exclusion list; "no wallet" error documented in ADR-0081). APPROVE.
- **Red-team:** 3 real eval weaknesses found and fixed: RT-C1-01 (`hasSaturatingCap` accepted wrong `.min()` arg), RT-C2-01/02 (`saturating_sub`/`wrapping_sub` bypass), RT-C4-01 (zero-guard scoped to file, not `grant_currency` body). APPROVE.
- **Reducer-security-auditor:** APPROVE with forward conditions (all M13b obligations, not M13a defects): every M13b spend-reducer must call `require_owner` before `spend_currency` and pass `ctx.sender` as owner; remove `#[allow(dead_code)]` when first caller lands.
- **Desync-guard:** PASS. Private table correctly produces no client subscription in STDB 2.6 (codegen skip confirmed via ADR-0040). Helpers-only slice; all desync deferred by design (ADR-0046/ADR-0040 precedent).
- **Verifier:** PASS. 14 game-core + 5 economy_tests (was 4, new zero-guard spend test added) intact. No tests weakened between RED-phase (5f3f4b6) and tip. Eval changes were all strengthening.

**Terminal state: PR #111 open, local ci green, remote CI running. Supervisor owns merge.**
**Next:** After m13a merge → M13b (shops: buy/sell reducers). M13b must gate every spend call with `require_owner` (ADR-0081 forward obligation).


## 2026-07-04T19:4xZ — M13.5 DECISIONS resolved by Drew (all three)

- Spec `M13.5-seventh-review-residuals.spec.md` §3 updated from open DECISIONS to DECIDED; new criteria added. Implement the decided options, NOT the former defaults:
  - **D-13.5-1 → 13.5e-5:** ADAPTIVE interpolation delay (jitter-scaled), not fixed 1.0×/depth-2 and not fixed deepening. Mandatory rider: comment every part with what it does AND why (jitter estimator, delay derivation/bounds, snapshot-depth interaction, clamp/hold-vs-snap). Supersede/amend ADR-0075. Smoothness tooth: burst-delivery test RED on the current scheme.
  - **D-13.5-2 → 13.5a-6:** nightly gating `cargo mutants -p server-module` shards, no continue-on-error, threshold from a baseline run (ADR-0050 ratchet + amendment); must be covered by the new 13.5a-2 nightly wiring guards from its first commit.
  - **D-13.5-3 → 13.5c-5:** make `player_conversation` private NOW (structural schema.rs touch → serial slice), verify client dialogue UI hydrates from own row, re-baseline schema snapshot, ADR-0069 note, RLS eval tooth.
- DoD checklist in spec §5 extended with the three items.


## 2026-07-04T19:59:39Z — m13a MERGED (user-directed supervisor tick mr-sup-cowork-20260704T192856Z-2487085-390)

- Both merge blockers resolved per Drew's instruction: (1) supervisor untracked the `client/node_modules` symlink (kept on disk; bare `node_modules` gitignore form added — dir-form misses symlinks) → c516cc3; (2) detached review-pass-only rooted run executed all 5 lenses over the PR diff → e020be5 (2 MAJOR, 3 MINOR, 3 eval weaknesses found+fixed; verifier confirmed no test weakening RED→tip; `just ci` green 801 Rust + 574 client + 48 evals).
- PR #111 squash-merged → `969e1be`; master CI **GREEN**. ADR-0081 registered via chore PR #112 → `7c7e568` (next free: 0082). Worktree + local/remote branches removed; main checkout on master.
- **Forward obligation for m13b** (reducer-security-auditor): every spend-reducer must call `require_owner` with `ctx.sender` before `spend_currency`; remove `#[allow(dead_code)]` when the first caller lands.
- Next: m13b (shops). M13.5 spec decisions all DECIDED by Drew — see 19:4xZ entry.

## 2026-07-04T20:09:50Z — m13b IN-PROGRESS (supervisor tick mr-sup-cowork-20260704T200432Z-2563911-31400)

- Launching m13b (shops: RON content + validate_content + buy/sell reducers, atomic server-priced). ADR reserved: 0082. Detached via mr-launch.sh. Brief: /tmp/mr_pass_m13b.md. ADR-0081 require_owner-before-spend obligation encoded in the brief.


## 2026-07-04T~21Z — m13b TERMINAL STATE (PR #113 open, remote CI running)

- Branch: `feat/m13b-shop-content-reducers`, tip: `98503c3`
- PR #113 open: https://github.com/mdrewt/monster-realm/pull/113
- `just ci` EXIT=0: 820 Rust tests + 574 client tests + 50 evals all PASS
- **What landed:** `ShopDef`/`ShopStockEntry` + `load_shops`/`validate_shops` in game-core; `sell_price: u64` on `ItemDef`/`ItemRow` (#[serde(default)]); `shop_row`/`shop_item_row` public tables; `buy`/`sell` reducers in `economy.rs`; CONTENT_VERSION 5→6; bindings regen; ADR-0082; `evals/shop-reducer-security.eval.mjs` (5 teeth)
- **ADR-0081 obligation SATISFIED:** `require_owner` before every spend/consume in both reducers; `#[allow(dead_code)]` removed
- **Review pass:** 3 lenses (reviewer + red-team + reducer-security-auditor). Findings fixed: buy_price==0 free-item exploit (HIGH) → `validate_shops` guard added; sell total reordered before consume loop (LOW); 2 missing negative tests added (dup shop_id, dup item_id).
- **ADR next-free: 0083**
- **Worktree:** `.claude/worktrees/m13b` (retained until merge)
- **Next:** Supervisor owns merge. After merge → M13c (economy sinks) or M13.5 slices per PLAN §9.

## 2026-07-04T21:26:17Z — m13b MERGED; m13c ‖ m13d LAUNCHING (supervisor tick mr-sup-cowork-20260704T210533Z-2625451-13404)

- m13b: PR #113 squash-merged → e60374d; master CI GREEN. ADR-0082 registered via chore PR #114 → 3c284e5 (--auto rejected by branch protection again → merged manually on green). Worktree/branches removed. Audits: orchestration CLEAN (sonnet; tester+review-lens+red-team present), gating-test CLEAN (18 tests added, none weakened). Cost $11.10, 1 attempt. Note: diff contained game-core/build.rs + docs/knowledge/** marginally outside declared touches — no siblings in flight, accepted, noted.
- FAN-OUT: launching m13c (sinks/sources wiring; server-side; ADR 0083) ‖ m13d (client shop UI + wallet; pure client; ADR 0084). Touches disjoint (server/game-core/evals vs client-minus-bindings); approved server ‖ client pair shape; 39G free, load 0.04; final re-probe clean. Briefs: /tmp/mr_pass_m13c.md, /tmp/mr_pass_m13d.md.
- ADR next free after reservations: 0085.

## 2026-07-04T21:3xZ — m13d TERMINAL STATE (PR #115 open, `just ci` green)

- Branch: `feat/m13d-shop-client-ui`, tip: `c5d6b39`
- PR #115 open: https://github.com/mdrewt/monster-realm/pull/115
- `just ci` EXIT=0: 626 tests (Rust + client combined) + 52 evals all PASS
- **What landed:** `shop_row`/`shop_item_row` store subscriptions via `MicrotaskBatcher`; `buildShopViewModel` pure function (ADR-0016, lowest-shopId-wins sort, itemId inventory aggregate); `shopView.ts` DOM shell (KeyG trigger, mutual-exclusivity with all overlays per ADR-0014, `#pending` bool + `btn.disabled` in-flight lock); `SHOP_QTY = 1` const (ADR-0082 D5 single-unit MVP); `player_wallet` **NOT subscribed** (private table, ADR-0081/0040); transaction feedback via async/await Promise rejection (spec gap "wallet display" documented in ADR-0084); ARCHITECTURE.md M13d section added.
- **ADR-0084:** shop client view; spec gap (wallet privacy) documented with follow-up recommendation; next-free = 0085.
- **Spec tick:** M13 §5 task 4 marked DONE (PR #115).
- **Worktree:** `.claude/worktrees/m13d` (retained until merge)
- **Next:** Remote CI + merge. M13 spec §5 all 4 tasks done (M13a/b/d shipped, M13c concurrent sibling status TBD).
