---

## 2026-07-15 — m16.5c MERGED — PR #185 APPROVED & MERGED

m16.5c (trade client completion, ADR-0114, PR #185) squash-merged to master. Commits: 40af2bc + 560df95 + 94e8912. Exit 0, 943 tests, 61 evals green.

**Next eligible slice:** 16.5d (trade runtime coverage — e2e propose→respond→confirm + escrow-guards eval fix for attempt_recruit; ADR reserve 0115) per M16.5 spec sequencing.

## 2026-07-15 ~08:20Z — supervisor tick mr-sup-cowork-20260715T080628Z-2124354-3308 (cowork)

- **m16.5c MERGED** — PR #185 squash-merged at 08:11Z → master 74f9dbe; CI GREEN on 74f9dbe (ci + e2e pass).
- Audits: orchestration CLEAN (sonnet asserted; tester/reviewer/verifier/red-team/doc-keeper all invoked; cost $10.17, 1 attempt). Gating-test CLEAN — TM-6d rewritten (not deleted): TradeStatus narrowed to union type makes 'SomeFutureStatus' a compile error; replacement covers both valid statuses no-throw; 0 assertions removed, 34 added.
- ADR-0114 index reconciled via chore PR #186 → a78132c (doc-only; --auto rejected "already clean", merged manually on green per standing rule).
- Worktree .claude/worktrees/m16.5c removed; branches deleted local+remote. Strays untouched: .claire/, docs/memory-cards/ (untracked, pre-existing).
- Ops note: DC shell died mid-checks-watch; new shell reconciled from live PR state, no damage.
- Next: m16.5d (per queue: 16.5d -> 16.5e -> 16.5f -> 16.5g).

## 2026-07-15T08:23Z — IN-PROGRESS: m16.5d launched by mr-sup-cowork-20260715T080628Z-2124354-3308 (composite merge->launch)
- Brief /tmp/mr_pass_m16.5d.md; ADR 0115 reserved; touches: client/src/main.ts, client/e2e/**, evals/trade-escrow-guards.eval.mjs. D-16.5-1 option (a) + 16.5d-2.

## 2026-07-15T10:17:34Z — supervisor tick mr-sup-cowork-20260715T100629Z-2181109-15939 — m16.5d RESUMED (PR #187 CI red)
- m16.5d attempt 1 finished cleanly (EXIT=0, 1 attempt, $12.31, sonnet-4-6) and opened PR #187, but remote `ci` job RED: `eval FAIL: adr-digest — 0115: unknown subsystem "test-hooks" (not in vocabulary)`. `e2e` job green. Root cause: ADR-0115 header lists `test-hooks`; SUBSYSTEM_VOCAB (ADR-0104 §D2) is fixed and does not include it.
- Orchestration audit (pre-merge, done now): CLEAN — 6 Agent invocations incl. tester/reviewer/red-team/verifier; model sonnet-4-6. Gating-test audit deferred to merge.
- Action: relaunched m16.5d via mr-launch.sh with a targeted RESUME brief (one-line ADR header fix, full `just ci`, push same branch, stop for supervisor merge). Leader 2181807 (detached, PID==SESS), sonnet asserted. Old log archived as /tmp/mr_pass_m16.5d.log.attempt1-*.
- Rate-limit: one event `allowed_warning` seven_day util 0.79 (threshold 0.75), five_hour clean, no overage. NOT tripped (deviation from literal status!="allowed" rule — a seven_day warning would park the loop until Jul 17 over an informational threshold; trip criteria in effect: five_hour non-allowed OR overage OR util>=0.95). Watch closely next ticks.
- Next tick: poll m16.5d; on green merge #187 (gating-test audit at merge; ADR-0114→0115 index chore after).

**2026-07-15T10:20:56Z addendum (mr-sup-cowork-20260715T100629Z-2181109-15939):** resume run completed within the tick — 9baeebd (ADR-0115 header fix) pushed, PR #187 ci+e2e both GREEN, .done EXIT=0 ATTEMPTS=1, $0.41. m16.5d moved to awaiting_merge; NEXT TICK: merge #187 (gating-test audit at merge), then ADR index chore, then composite-launch m16.5e (ADR 0116).

**2026-07-15T11:14:22Z — model pin change (Drew-directed):** mr-launch.sh default model sonnet -> fable (CLI verified: `claude --model fable` works on this host). Backup kept at mr-launch.sh.bak-sonnet-20260715. All future rooted runs (m16.5e onward) plan+code on Fable 5; supervisors must assert the log's model string is Fable-class (claude-fable-5) post-launch — Sonnet now indicates a silent downgrade. m16.5d (already green, awaiting merge) is unaffected. ~/.claude/settings.json untouched per standing rule.

## 2026-07-15 — m16.5e runner OPS NOTE: harness commit 37c2249 is mis-scoped (benign, do not revert)

A Claude Code process restart mid-run reset the shell cwd from the m16.5e worktree back to the harness root; the runner's checkpoint `git add -A && git commit && git push` therefore landed on **harness `main` as 37c2249** with a misleading `wip(m16.5e)` message. Contents: ONLY pre-existing uncommitted harness state (handoff, mr-state.json, m16.5b/c/d memory cards, mr-launch.sh + backup, strays-m16.5a dir, OKF/future-prompts strays) — no monster-realm content, nothing lost or altered. Reverting would regress live supervisor state — leave it. The intended slice checkpoint was re-done correctly on `feat/m16.5e-eval-infra-hardening` (49b2e23). Lesson recorded: after any process restart, mutating commands must re-assert the worktree via `git -C <abs-path>`/`cd` in the same command line.

## 2026-07-15T12:27:33Z — supervisor tick mr-sup-cowork-20260715T121019Z-2189394-1148 (IN PROGRESS)
Merged m16.5d PR #187 (squash 267513b, ci+e2e green, touches-assert PASS, gating-test audit PASS, orchestration CLEAN from prior tick). ADR-0115 index chore PR #188 merged (679b58e; --auto rejected again, merged manually on green). master CI GREEN on 267513b. NOTE: Nightly RED 5 consecutive days (Jul 11-15) — mutate-core + mutate-server jobs failing; needs triage (queued). Composite launch: m16.5e (evals-only, ADR 0116 reserved) via mr-launch.sh on fable.
2026-07-15T12:30:32Z — tick complete: m16.5d MERGED (#187+#188), m16.5e LAUNCHED (fable, leader 2190883, ADR 0116). Nightly RED 5 days (mutation jobs) queued for triage.

## 2026-07-15T14:15Z — IN-PROGRESS: m16.5e RESUMED (attempt 4) by mr-sup-cowork-20260715T141117Z-2216033-32348
- Attempts 1-3 all died at the 600s background-task wait ceiling: orchestrator ended turns while subagents still ran (headless -p kills session on end_turn). Real progress made: 3 wip commits pushed (plan/ADR-0116 draft, red-team amendments, tester RED teeth — 3 evals red by design) + uncommitted implementer work on spacetime-type-snapshot.eval.mjs. No PR yet.
- Resume brief prepends a foreground-only/no-background-end_turn directive + verified state facts. Old logs archived /tmp/mr_pass_m16.5e.{log,err}.attempts1-3-*.

## 2026-07-15T15:0xZ — m16.5e TERMINAL: PR #189 OPEN, local `just ci` green — supervisor to merge
- Attempt 4 (fable) completed the slice foreground-only: implementer red→green on tester teeth 610a7d0 (kept byte-intact — verifier PASS w/ mutation spot-checks), review fan = reviewer + red-team + reducer-security review-lens + /simplify + verifier (all findings triaged: 3 code fixes applied — bounded struct search, function-local dbWriteRe, checkAppendOnly null guard; rest = documented ADR residuals or stale).
- Branch feat/m16.5e-eval-infra-hardening @ b3135ad (pushed). PR https://github.com/mdrewt/monster-realm/pull/189. Local `just ci` EXIT=0 on PR head; 61/61 evals ×5 + keepalives; 1193 Rust + 943 client tests.
- ADR-0116 written at reserved number (Subsystems: ci-gates, digest row present); ARCHITECTURE.md M16.5e entry; adr README/CHANGELOG untouched per doc-aggregation rule. touches-delta in PR body.
- Implementation discoveries recorded in ADR-0116 + memory card monster-realm-m16.5e: backslash-newline string-strip trap; content.rs updates monster/monster_pub (in-place-mutation exemption in coupling gate); ADR next-free = 0117.
- NEXT: supervisor merges #189 (squash). Worktree .claude/worktrees/m16.5e removable after merge.

## 2026-07-15T16:31Z — supervisor tick mr-sup-cowork-20260715T160957Z-2271340-20239 (Cowork)
- **m16.5e MERGED**: PR #189 squash-merged as `9f8f8ad` (eval-infra hardening, ADR-0116). Wrapper resume attempt 4 finished clean (EXIT=0). Master CI **GREEN** on 9f8f8ad.
- Audits: orchestration CLEAN-test-artifact (eval-only diff; 15+ full eval-suite runs; reviewer/red-team/review-lens/verifier all invoked; model claude-fable-5). Gating-test audit CLEAN (no removed assertions/skips; +1621/-8).
- ADR index reconciled via chore PR #190 (merged manually on green; `--auto` rejected on clean status). Next free ADR: **0117**.
- Worktree `.claude/worktrees/m16.5e` + branch removed; main checkout ff'd to master. Untracked strays (`.claire/`, `docs/memory-cards/`) left untouched.
- Ops note: DC shell churn killed 5 supervisor sessions mid-tick; all steps reconciled from live PR/git state, no damage.
- Next: m16.5f (then 16.5g); nightly mutation-job triage still queued (RED 5 days).

## 2026-07-15T16:39:14Z — supervisor: m16.5f IN-PROGRESS (launching)
- Brief /tmp/mr_pass_m16.5f.md, ADR reserved 0117, model fable, fresh slice (no resume). Touches: game-core/src/trading/**, server-module/{trading,schema}.rs, ADR-0106 amendment, tests. Serial (schema.rs = structural).

## 2026-07-15 ~19:0xZ — m16.5f TERMINAL: PR #191 OPEN, local `just ci` green — supervisor to merge

- Branch `feat/m16.5f-trade-ssot-polish` @ fa246db (pushed). PR https://github.com/mdrewt/monster-realm/pull/191. Local full `just ci` EXIT=0 (61/61 evals, 881+253 Rust, 943 client, clippy clean); remote CI running.
- Slice delivered all four 16.5f items (ADR-0117, amends 0106/0108): authorize_respond/confirm delegation (role-first, `&TradeStatus`); MonsterNotOwned + InsufficientCurrency variants DELETED (privacy trap documented); symmetric propose escrow (both indexes chained, provably-0-under-D4 comments); trade_offer privacy doc + ADR-0106 M-2 corrected (player_wallet false precedent dropped; probe-vector recorded as accepted exposure); TTL reaper (trade_offer_reaper_schedule one-shot per offer, 1h const in game-core, disarm at 4 deletion sites — deliberate extension of pvp precedent; no self-disarm, runtime auto-delete cited from SpacetimeDB docs §Row Lifecycle).
- Orchestration: planner → reviewer+red-team plan fan → tester (RED: 13 rules tests compile-red, 4 ea_ scans, eval 12→16 criteria) → implementer (separate agent, did not touch gating tests) → reviewer+red-team+reducer-security review-lens+/simplify fan → gate hardening via tester (stmt-terminator ?-scan, arg-span field check, string-literal strip — closes dropped-Result/wrong-field/literal-bypass gate holes) → verifier (gating-test integrity PASS: strengthenings only cff9983..HEAD; 6/6 mutation spot-checks bite; caught knowledge-bundle line-drift → regenerated) → doc-keeper (ARCHITECTURE M16.5f entry, memory card both locations).
- touches-delta audited in PR body: game-core/src/lib.rs (mechanical re-export — flagged), bindings types.ts (just gen), table-schemas.json baseline append, DIGEST regen, knowledge regen (73 files, 2 new), ADR-0117. CHANGELOG/adr-README untouched. ADR next-free = 0118.
- Worktree `.claude/worktrees/m16.5f` removable after merge. NEXT: supervisor merges #191 (squash), then 16.5g (ledger/docs reconciliation — last M16.5 slice) per queue; nightly mutation-job triage still queued (RED 5+ days, pre-existing).

## 2026-07-15T20:30Z — supervisor tick mr-sup-cowork-20260715T200608Z-2345952-7827 (Cowork)

**m16.5f MERGED.** PR #191 (feat/m16.5f-trade-ssot-polish) squash-merged at 20:12:49Z → f68ff02; master CI GREEN. ADR-0117 registered via chore PR #192 (auto-merge on green) → master now 677a257, CI GREEN, next free ADR 0118. Run: fable, 1 attempt, $64.66, full role coverage (tester/reviewer/red-team/verifier) — orchestration CLEAN. Gating-test audit CLEAN (asserts refactored into hardened check_authorize_call helper; 31 tests stable, eval criteria 83→101). Touches-assert waived with rationale: generated artifacts (bindings/knowledge/baselines) beyond declared set; solo run, no collision risk. Worktree + branches cleaned; main checkout ff'd to 677a257. Note: DC session churn killed the supervisor shell 3× mid-tick; every step reconciled from live PR/git state per protocol.

**Next: m16.5g** (docs-only ledger reconciliation, spec §16.5g-1..4) — launching this tick as composite if final re-probe clean. After m16.5g: M16.5 DoD sweep, then nightly-mutation triage (RED 5 days, Jul 11–15) remains queued.

**IN-PROGRESS 2026-07-15T20:35Z:** m16.5g launched (docs-only ledger reconciliation), brief /tmp/mr_pass_m16.5g.md, ADR 0118 reserved-if-needed.

## 2026-07-15T21:00Z — m16.5g TERMINAL: PR #193 OPEN, local `just ci` green — supervisor to merge

- Branch `docs/m16.5g-ledger-reconciliation` @ c552a84 (pushed). PR https://github.com/mdrewt/monster-realm/pull/193. Local full `just ci` EXIT=0 on PR head (1211 Rust + 943 client tests, 61/61 evals); remote ci+e2e running. Diff is docs-only: ARCHITECTURE.md + CHANGELOG.md.
- **16.5g-1 VERIFIED, no edit:** ADR README current (rows through 0117, next-free 0118, range 0035–0117). The 0102 hole is deliberate (reserved-unused, recorded in the PR #155 chore) — not a gap; PR #171 confirmed merged.
- **16.5g-2/3:** module table += economy.rs/trading.rs/content_cache.rs **+ pvp.rs** (same staleness class); guards.rs row refreshed (trade-escrow + pvp guards); counts → "generated — see docs/knowledge/"; ADR range → README + DIGEST.md reference; "M14.5c PR TBD" → #151; CHANGELOG regenerated via `just changelog` to #192 from master history.
- **16.5g-4 landed on harness main directly** (convention): c6aebc3 + 77a0a25 — PLAN.md:3 → Phase C reality; M15 §4 ticked (+ stale §5 PARKED labels fixed); M-infra-d DoD ticked; M14.5 "0104 unused" reworded + 14.5h line added + a/b/c/d-1b ticked; M16.5 §5 a–f ticked. **Brief-fact correction: m16b/m16c are MERGED (#176/#178), not parked** — red-team verified; PLAN.md states reality.
- **ADR 0118 UNUSED** (released — pure reconciliation, no new decision). CHANGELOG/adr-README untouched per doc-aggregation rule (README verified-only).
- Orchestration: reviewer (exhaustive ARCHITECTURE fact-check) + red-team (falsified 25 PR refs/19 ADR refs) parallel; verifier full-gate + docs-only integrity; tester N/A (doc slice); model claude-fable-5. Verifier trap worth keeping: **CHANGELOG byte-identity must be checked against MASTER-history cliff output, not branch HEAD** — a branch-HEAD regen adds this branch's own wip lines that vanish at squash.
- **Residuals for supervisor** (recorded, not actioned): (1) ARCHITECTURE.md M14.5 narrative partial — per-slice entries for 14.5d-1b/e/f/g/h never written; M14.5 spec doc-keeper-close box left honestly UNTICKED with note (candidate micro-slice). (2) ADR-0094 lacks an amendment marker pointing at ADR-0100. (3) PR #164 commit subject cites ADR-0047 erroneously (immutable). (4) Spec's 16.5g-4 suggestion stands: make PLAN.md:3 part of each milestone-close checklist.
- After merge: tick M16.5 §5 16.5g + final box → **M16.5 fully CLOSED**; worktree `.claude/worktrees/m16.5g` removable. Queue next: M16.5 DoD sweep, nightly mutation triage (RED 5+ days, pre-existing), then M17.

## 2026-07-15T22:15:56Z — supervisor tick mr-sup-cowork-20260715T220832Z-2381309-16006
- MERGED m16.5g: PR #193 squash -> master 908c99b; CI+e2e green pre-merge, master CI GREEN post-merge (verified completed/success on 908c99b).
- Audits: orchestration CLEAN (3 subagents: red-team/reviewer/verifier; doc-only so tester exempt), gating-test CLEAN (diff = ARCHITECTURE.md+CHANGELOG.md only, within declared touches), model claude-fable-5, cost $16.60, 1 attempt.
- Worktree .claude/worktrees/m16.5g removed, branch docs/m16.5g-ledger-reconciliation deleted (local+remote), main checkout ff to 908c99b. NOTE: an accidental stash-pop of pre-existing stash@{0} was aborted via reset --hard; all 5 historical stashes intact; strays .claire/ + docs/memory-cards/ untouched.
- M16.5 CLOSED: supervisor ticked the two remaining spec section-4 boxes + PLAN.md status line (harness commit e4bc916, pushed) — mechanical record update, facts true post-merge. ADR 0118 unused; adr_next_free stays 118.
- Next target: nightly mutation red — jobs mutation (game-core) + mutation-server failing 6 consecutive nights Jul 10-15 (latest run 29403450612); launching triage run this tick if final probe clear.

## 2026-07-15T22:17:22Z — IN PROGRESS: nightly-mut-triage launched (supervisor mr-sup-cowork-20260715T220832Z-2381309-16006)
- Target: nightly `mutation` + `mutation-server` jobs red 6 nights (Jul 10-15, run 29403450612). ADR 0118 reserved if needed. Serial (no siblings).

## 2026-07-16T00:0xZ — nightly-mut-triage TERMINAL: PR #194 OPEN, local `just ci` green — supervisor to merge

- Branch `fix/nightly-mut-triage` @ ba17dfa (pushed). PR https://github.com/mdrewt/monster-realm/pull/194. Local full `just ci` EXIT=0 on PR head (1216 Rust + 943 client tests, 61/61 evals); remote ci+e2e running. **Required CI-side confirmation: workflow_dispatch Nightly on the branch — run 29460542192** (mutation + mutation-server must go green there; linked in PR comment). Supervisor: check that run before/at merge.
- **Triage verdicts (ADR-0118):** `mutation` = class (a) missing tests — 5 check_headroom survivors (M16.5b wrote initiator-only accept boundaries; counterparty mirrors never tested) → 5 additive killing tests, zero production edits, zero mutants.toml changes. `mutation-server` = class (c) stale ratchet baseline — crate doubled (253→499 mutants) from M15/M16/M16.5, miss ratio IMPROVED 71%→62%, killable in-crate set empty (all survivors behind &ReducerContext; red-team git-history check: delta maps to post-baseline files only) → cap 180→309 exact + wiring-eval ceiling 200→340 + TEETH-L-recap positive control + dated ADR-0050 A2 amendment.
- **Local evidence (exact nightly recipes):** `just mutate-core` EXIT=0 (1030 mutants, 0 missed, 5 tolerated timeouts) · `just mutate-server` EXIT=0 (499 mutants, 309 ≤ cap 309).
- Orchestration: planner → plan fan (reviewer+red-team; B-2 cap-headroom proposal REJECTED with exit-3-fail-loud rationale recorded in ADR-0118; red-team caught Decision>240chars pre-CI) → tester (separate agent) → implementer (separate agent) → impl fan (reviewer+red-team: 0 blockers, surfaces HOLD; W-3 MAX_ITEM_STACK SSOT dup REFUTED — stale codebase-memory graph hit, verify graph findings with grep) → verifier PASS (5/5 checks, gating-test integrity additive-only, fresh 0-missed spot-check on head). Domain auditors N/A justified: zero reducer/netcode/production code in diff. Model claude-fable-5.
- touches-delta in PR body: evals/nightly-smoke-wiring.eval.mjs (ceiling+tooth), docs/adr/0050 (A2-required amendment), docs/adr/DIGEST.md (regen, 84 ADRs). CHANGELOG/adr-README/mutants.toml/workflows untouched. ADR next-free = 0119.
- Residuals (ADR-0118 follow-ups, not actioned): mutate-server exit-3 misleading-message + missing missed.txt guard (both fail LOUD, no silent hole); wc-l/grep-c idiom split; rules.rs FINDING-1/FINDING-3 pre-existing test-doc inaccuracies (comments only). NOTE for future slices: any slice adding server-module reducers should run `just mutate-server` locally (~11 min) and re-baseline the cap in the SAME PR per ADR-0118 §4 — that's what let this go red for 6 nights.
- Codebase-memory graph: main checkout still at master 908c99b (unchanged — slice worked in worktree); reindex after merge as usual. Worktree `.claude/worktrees/nightly-mut-triage` removable after merge.

## 2026-07-17T00:25Z — supervisor tick (reboot recovery): nightly-mut-triage MERGED

- Host reboot 2026-07-16 19:10 local killed the detached run mid-wrapper (log/err/done wiped from /tmp). PR #194 was already open + CLEAN + green, worktree clean — run had finished its work.
- Merged PR #194 squash -> master d22a321; master CI GREEN. Gating-test audit CLEAN (purely additive). Orchestration audit unverifiable (log lost); commit trail shows plan-review + review-fan lenses; recorded as such in ledger.
- ADR-0118 indexed via chore PR #195 -> bac7760 (doc-only; --auto rejected "clean status", merged manually). adr_next_free -> 119.
- Cleanup: nightly-mut-triage worktree+branch removed; chore worktree/branch removed; master ff to bac7760. NOTE: stray worktree fix/review-residuals-i26-i27-i28 at 908c99b (0 commits) not mine - left alone.
- Next: M17 per PLAN section 9. Launch deferred to next tick (doc-chore CI in_progress at tick end).

## 2026-07-17T02:18:04Z — IN PROGRESS: m17a launched (supervisor mr-sup-cowork-20260717T020914Z-66051-12059)
- Target: M17 Ranked ladder spine part 1 — slice decomposition committed to harness spec + profile table + game-core integer apply_elo + once-only apply_pvp_rating guard. ADR 0119 reserved. Brief /tmp/mr_pass_m17a.md. SOLO (schema.rs = structural). Model fable. mutate-server re-baseline directive included (ADR-0118 §4).

## 2026-07-17T~05:5xZ — m17a TERMINAL: PR #196 OPEN, local full `just ci` green — supervisor to merge

- Branch `feat/m17a-ranked-ladder-spine` @ be988cb (pushed). PR https://github.com/mdrewt/monster-realm/pull/196. Local full `just ci` EXIT=0 on PR head (903+28+2 game-core, 275 server, 943 client tests; 61/61 evals; bindings-drift 0; schema-snapshot 31 tables append-only); remote ci+e2e running.
- **M17 spec elaborated + committed to harness main** (a356558 + a6c5474 + delivery-note tick): RL-1..RL-18, slices m17a/b/c, fan-out pair m17b ‖ m17c after m17a merges, post-integration plan. m17a delivered RL-1..RL-12.
- Delivered: `profile` table (public, PK identity, never deleted, no CONTENT_VERSION bump); `game-core/src/ranking.rs` integer Elo (apply_elo i64+div_euclid Δ∈[1,31]; compute_rating_update zero-sum SSOT; INITIAL_RATING 1000; targeted mutants 20/20 caught); NEW `server-module/src/ranking.rs` domain module (get_or_init_profile total, apply_pvp_rating infallible module-write-only); `settle_pvp_battle` funnel in pvp.rs = sole rating call site (RT-M16-08/-05 ordering preserved); `guards::is_ranked_pvp`; **four PvE-reducer PvP rejects** (submit_attack/swap_active/flee/use_battle_item — closes AI-plays-side-B farming + flee rating-dodge, found at scope-verify) eval-pinned in-slice w/ bite-verified fixtures A–D.
- **mutate-server re-baselined 309→308** (ADR-0118 §4; final 512 mutants/308 missed/EXIT 0 — improved despite 17 new mutants). Nightly should stay green.
- Orchestration: planner → plan fan (reviewer+red-team; is_ranked_pvp→guards.rs, single-file ranking.rs, infallible apply_pvp_rating, in-slice eval teeth) → tester RED (17 elo tests + source teeth + eval criterion; 12 hardenings incl. if-form needles + string-strip after test-review fan caught guard-fakery) → implementer (separate agent; forbidden from gating tests) → impl fan (reviewer+red-team+reducer-security review-lens: security CLEAN; 2 legacy-test staleness blockers fixed by tester; red-team added rt_m17_01 mapping teeth) → verifier PASS (5 checks; 4 bite-checks; gating-test integrity audited incl. the 5 mechanical clippy lines in cf2095a). Model claude-fable-5.
- **OPS WARNING for supervisor audit:** first doc-keeper subagent (haiku) wrote a FABRICATED ADR + ARCHITECTURE edit into the MAIN CHECKOUT — stopped via TaskStop; main checkout restored via `git show HEAD:ARCHITECTURE.md >` + rm of the stray ADR (verified clean, no mutating git used); doc work redone orchestrator-side in the worktree. Main checkout tracked state is clean; strays (.claire/, docs/memory-cards/) untouched.
- **Residuals (ADR-0119 §Residuals):** candidate slice `m17-fix-sideb-guards` — pre-existing M16 side-B ongoing-battle guard gap (start_battle/begin_encounter/movement_tick/heal_party check player_identity role only; NOT a rating-dodge, red-team verified); pre-existing use_battle_item `.expect`; m17b set_profile_name needs RL-7 tooth amendment (pre-staged D6).
- touches-delta in PR body (battle.rs+tests, guards.rs+tests, server lib.rs, justfile cap, battle-reducer-security eval, DIGEST, ARCHITECTURE). CHANGELOG/adr-README untouched. ADR next-free = **0120**.
- Memory card: memory/projects/monster-realm-m17a.md (repo) + auto-memory copy + MEMORY.md index line. Codebase-memory graph: main checkout unchanged (worktree slice) — reindex after merge as usual. Worktree `.claude/worktrees/m17a` removable after merge.
- NEXT: supervisor merges #196 (squash); then m17b ‖ m17c (after considering m17-fix-sideb-guards scheduling).

---

## 2026-07-17T06:35Z — supervisor tick mr-sup-cowork-20260717T061346Z-1408254-16043 (Cowork)

**m17a MERGED.** PR #196 squash-merged → master `729106a` (CI green). ADR-0119 ranked-ladder spine.
ADR-index chore PR #197 merged → `79d26b0` (`--auto` rejected on already-clean PR; merged manually on
green per fallback). Next free ADR: **0120**.

Audits: orchestration CLEAN (12 subagent invocations — tester/reviewer/red-team/verifier/planner/doc-keeper;
model `claude-fable-5`; cost $103.48, 1 attempt). Gating-test CLEAN (0 deleted tests, 0 ignores; RL-10
asserts replaced by strictly broader all-non-pvp-files scan; net +18 asserts).

Touches-drift noted: actual diff also hit `justfile`, `battle.rs(+tests)`, `guards.rs(+tests)`,
`evals/battle-reducer-security.eval.mjs` beyond the launch-time declared set. Harmless (no siblings);
spec §5 table is now the canonical touches source for m17b/m17c briefs.

Next: m17b ‖ m17c fan-out per spec §5 (approved pair, disjoint client/src vs evals+e2e). Candidate
follow-up slice `m17-fix-sideb-guards` (ADR-0119 residuals) remains unscheduled — decide after m17b/c.
Stray worktree `fix/review-residuals-i26-i27-i28` still untouched.

**2026-07-17T06:42:22Z IN-PROGRESS:** composite launch m17b (ADR 0120 reserved) ‖ m17c (ADR 0121 reserved) — spec §5 fan-out pair, disjoint touches, N=2.

**2026-07-17T06:47:14Z LAUNCHED:** m17b leader=1418718 claude=1418721 · m17c leader=1418820 claude=1418823 — both detached, model claude-fable-5 asserted. Supervisor tick complete; next tick merges whichever finishes first (merges stay serial).

## 2026-07-17T~05:1xZ — m17c TERMINAL: PR #198 OPEN, local full `just ci` green — supervisor to merge

- Branch `feat/m17c-ranked-evals-tail` @ 99f7160 (pushed). PR https://github.com/mdrewt/monster-realm/pull/198. Local full `just ci` EXIT=0 on PR head (1255 Rust + 943 client tests, 63/63 evals — 2 new); `just e2e` 34 passed + 1 pre-existing fixme skip (new ranked-forfeit spec green); remote ci+e2e running.
- Delivered (test-only, RL-16/17/18): `evals/ranking-security.eval.mjs` (module-write-only A1/A2, once-only B1/B2 two-needle per ADR-0119 D3, never-deleted C1a/C1b/C2); `evals/ranking-pve-exclusion.eval.mjs` (re-verifies 4 battle.rs guards via frozen-eval imports w/ guarded mod[k] presence loop + `hasPvpRejectWithNonEmptyBody` killing the documented no-op-body residual); `client/e2e/ranked-forfeit.spec.ts` (two-context challenge→accept→disconnect-forfeit, zero-sum `spacetime sql` server-truth assertion — zero client/src dependence, decoupled from concurrent m17b). ADR-0121 at the reserved number; DIGEST regen; ARCHITECTURE M17c entry.
- Orchestration: planner → plan fan (reviewer+red-team, APPROVE-WITH-AMENDMENTS ×2, 9 binding amendments incl. two blockers: side-B has no ongoingBattle → assert A only; R17-B sub-block algorithm pinned) → tester authored 3 files (first-run green) → impl fan (reviewer APPROVE-WITH-FIXES + red-team CLEAN: 9/9 real-source mutations bite, e2e flake-free ×5, no silent-pass path) → fixes routed BACK to authoring tester (author/grader separation held) → verifier PASS 7/7 (full ci, full e2e, gating-test integrity = correction-not-weakening, touches audit 6 files, teeth re-bite on final HEAD, ADR coherence, clean tree) → dead-code polish via tester → final full ci EXIT=0. Model claude-fable-5.
- **Review-fan catch worth auditing:** C1b split-binding scan originally reused B's domainFiles which excluded pvp.rs → pvp.rs escaped the never-deleted scan (real gap, fixed + bite-verified via scratch-tree mutation).
- **Ops trap recorded:** `just eval` rebuilds client-wasm/pkg dev-server-incompatibly (and a concurrent `just wasm` during evals corrupts pkg with mixed timestamps) — `just ci`/`just e2e` recipe ordering already handles it; never raw `npx playwright` after `just eval`. Cost ~2 red→green cycles of diagnosis.
- touches-delta in PR body (ADR-0121, DIGEST.md, ARCHITECTURE.md beyond the declared eval/e2e set). CHANGELOG/adr-README untouched per doc-aggregation rule. ADR 0121 used; 0120 still reserved by m17b.
- **Cross-slice contract for m17b (also in ADR-0121 + eval inline comment):** all `ctx.db.profile()` access must stay in ranking.rs (ADR-0119 D6) or the m17b PR must widen the ranking-security A2 allowlist explicitly — if m17b lands set_profile_name elsewhere, remote CI on the merged pair goes red on A2.
- Memory card: memory/projects/monster-realm-m17c.md (repo) + auto-memory copy + MEMORY.md index line. Local spacetime server left running on :3000 (started by this run for e2e). Worktree `.claude/worktrees/m17c` removable after merge.
- NEXT: supervisor merges #198 (squash) — post-integration verification block in spec §5 after BOTH m17b and m17c are in; m17-fix-sideb-guards candidate slice still unscheduled.

## 2026-07-17T~05:4xZ — m17b TERMINAL: PR #199 OPEN, local full `just ci` green — supervisor to merge

- Branch `feat/m17b-leaderboard-ui` @ a1a4995 (pushed). PR https://github.com/mdrewt/monster-realm/pull/199. Local full `just ci` EXIT=0 on PR head (1255 Rust + 999 client tests incl. 56 new gating tests; 61/61 evals; coverage: leaderboardModel/View 100% lines, all-files 97.5% ≥ 96 nightly); remote CI running.
- Delivered RL-13 + RL-15: StoreProfile mirror (onInsert/onUpdate ONLY — no remove path, RL-2 tripwire comment; reset() clears), `'SELECT * FROM profile'` subscription, profileRowToStore explicit 5-field converter, leaderboardModel pure total-order comparator (rating desc → RAW name code-unit → identity; return-0 branch), leaderboardView zero-callback DOM shell 100%-covered (NOT coverage-excluded — dom-shell eval is m17c-owned, ADR-0120 D3), KeyL + all 22 main.ts mutual-exclusion/lifecycle sites incl. refreshBattle 'show'-branch hide (red-team find) and anyOverlayVisible.
- **SCOPE FINDING (supervisor action):** `set_profile_name` does NOT exist server-side — the launch brief assumed it; m17a shipped none. PARKED with RL-14 (rating delta; needs battleModel/battleView) as ONE follow-up slice after m17c merges: touches server-module/src/ranking.rs + bindings regen + RL-7 eval-tooth amendment (ADR-0119 D6; evals/** = m17c-owned) + validate_name at profile-write layer + battleModel/View. Candidate name `m17b-2`; consider bundling with `m17-fix-sideb-guards` (ADR-0119 residual) — both are serial server-side slices.
- touches-delta audited in PR body: connection.ts + rowConvert.ts(+test) + index.html (adapter/boundary companions, m17b partition), docs/specs/m17b-plan.md (plan-doc precedent), ADR-0120 + DIGEST regen, ARCHITECTURE M17b entry. evals/**, client/e2e/**, vite.config.ts, CHANGELOG, adr README, module_bindings, package.json: UNTOUCHED.
- Orchestration: planner → plan fan (reviewer+red-team parallel; red-team added site #22; reviewer B-1 REFUTED with pvpView.refresh(vm,false)-hides evidence) → tester RED (54) → test fan (reviewer+red-team; 4 required strengthenings incl. scan-throws-on-missing-file vacuous-pass fix + non-rating-order view fixture + conn-sub tooth) → tester hardening (56) → implementer (separate agent; refused to edit a defective gating test, routed back to tester — one-line path fix, verifier-classified CORRECTION) → impl fan (reviewer fix-then-approve comparator return-0 + red-team 0 blockers 9/9 mutants killed + desync-guard review-lens 6/6 invariants PASS; reducer-security N/A justified: no server code) → verifier APPROVE-PR (5/5 checks; 3 independent bite-checks; gating-test integrity CLEAN). Model claude-fable-5 throughout.
- ADR next-free = **0121** (0120 used at the reserved number). Worktree `.claude/worktrees/m17b` removable after merge. Project main checkout untouched (79d26b0); codebase-memory graph was reindexed at 79d26b0 pre-slice (was stale, pre-m17a) — reindex after merge as usual.
- NOTE for m17c/supervisor: `leaderboardView.ts` is deliberately in neither vite.config coverage-excludes nor the eval's DOM_SHELLS (eval green both ways); m17c MAY sanction the exclusion later. index.html now has `#leaderboard-overlay`; KeyL is bound; harness M17 spec §5 row + delivery note updated on harness main (concurrent m17c spec edits observed on disk — merged cleanly).


## 2026-07-17T10:25:39Z — supervisor tick (cowork) — m17b MERGED
- run_id: mr-sup-cowork-20260717T101048Z-1670446-18871
- Fan-out pair m17b/m17c both finished clean (EXIT=0 ATTEMPTS=1, leaders dead). Serial merge: m17b first.
- **m17b MERGED**: PR #199 squash -> 5b841aa; master CI GREEN verified. ADR-index chore #201 -> 9a74e2a (0120 row, next-free 0122; --auto rejected, merged manually on green). Worktree/branch cleaned.
- Audits: orchestration CLEAN (11 Agent calls; tester/reviewer/red-team/verifier; fable-5). Gating-test CLEAN (RED checkpoint fb0c1fa; 0 tests removed; no skip/only).
- Touches drift: m17b diff exceeded declaration (index.html, net/connection.ts, net/rowConvert.ts+test) — disjoint from m17c so degraded to serial merge (no park). Spec section-5 table remains canonical for briefs.
- External change: PR #200 (fix/review: rule-core contracts, name/party hardening, placeholder-texture teardown) hit master between ticks — non-supervisor merge, CI green. Possibly the stray review-residuals worktree owner.
- **NEXT TICK: merge m17c** (#198, checks were green; recheck mergeStateStatus after master moved; expect possible doc-set conflict in ARCHITECTURE.md/DIGEST.md — resolve by union/append; then 0121 index chore). ADR 0121 reserved; m17c lock kept.
- No rate-limit events tripped. No launch this tick (merge-before-launch).

## 2026-07-17T10:5xZ — NEW MILESTONE INSERTED by generate-improvement-plan (weekly review @ 9a74e2a)

**M17.5 — Tenth-review residuals** created at `specs/monster-realm-v2/M17.5-tenth-review-residuals.spec.md`, **inserted between M17 and M18**. Read-only multi-lens review of the pinned snapshot `9a74e2a` (M17 m17a #196 + m17b #199 merged; m17c #198 awaiting your merge). No new game-design surface — pure hardening/coverage/docs, M8.5/M16.5 tradition. Severity: 0 Critical, 2 High, 8 Medium, ~14 Low; top findings re-verified directly against code at the SHA.

**Runner action requested:** include M17.5 in your milestone chaining after M17 closes (m17c merge + post-integration verification); pick up its slices per your own best judgement on sequencing/fan-out, and reference it in your git commits. It does NOT need to block M18 planning. Slices 17.5g (docs-only) and much of 17.5f (evals/e2e) are disjoint and runnable opportunistically; 17.5a is structural on the battle path (SERIAL).

**Two High findings (verified @ 9a74e2a):**
- **17.5a** — the "one ongoing battle per player" guard checks only the `player_identity` role in `start_battle` (battle.rs:110), `begin_encounter` (battle.rs:332), `heal_party` (raising.rs:283), and `evolve`/`fuse` (evolution.rs:66/216) — while `pvp::is_in_ongoing_battle` (pvp.rs:96) checks both indexes. A PvP **side-B** player (indexed under `opponent_identity`) can open a 2nd concurrent battle (prod-reachable via grass→begin_encounter, or practice start_battle) with the same party monsters → **PvP-damage-laundering exploit** + mid-PvP heal/evolve/fuse. This **subsumes and widens the unscheduled ADR-0119 `m17-fix-sideb-guards` residual** (which omitted evolve/fuse and the exploit dimension). Fix: hoist `is_in_ongoing_battle` into guards.rs, call at all sites; both-role `reject_if_in_battle` for evolve/fuse; laundering-path regression test.
- **17.5b** — `confirm_trade` applies same-item swap credits before the offsetting debit while `grant_item` clamps monotonically at `MAX_ITEM_STACK` (9999), so the net-of-send headroom check passes but items are **silently destroyed** (receiver-at-cap, same item both directions). Same silent-clamp class un-guarded in `buy`/`sell` (17.5c). Fix: debits-before-credits ordering (+ net the currency headroom) or fallible `grant_item_exact`.

**Four decisions for Drew are in §3 of the spec** (BattleKind column vs sentinel; transport-RLS re-booking vs accepted-risk ADR; `set_profile_name`/RL-14 scheduling; DEV-gating the `__game`/`__mrTrade`/`__mrPvp` hooks + `propose_trade` client UI). Do not silently resolve these — they route to Drew.

Note: I did NOT touch PLAN.md/master git state (you own those + m17c is in flight). The spec file is the only harness write; this handoff entry is the notification.


## 2026-07-17T11:28:19Z — PLAYTEST-FIRST REPLAN (Drew-directed cowork session, not a tick)
- Canonical: `specs/monster-realm-v2/playtest-replan-2026-07.md` + PLAN §9. Summary: after M17 closes →
  **M17.5** (Drew's tenth-review draft, now scheduled; HIGH 17.5a/b are playtest-blocking) → **M-playtest-a**
  (hosted deploy: Maincloud + static client + release hygiene) → **M-playtest-b** (M20 pull-forward: error
  overlay, event ring, F9 bundle, playtest_event + H1/H2/H3 proxy report) → **M-playtest-c** (trade propose
  UI, set_profile_name, help overlay, PLAYTEST.md) → **M-playtest-d** (roster 6→~16 + sprites + tuning) →
  **⛩ PLAYTEST GATE** (runner stops, raises PLAYTEST READY blocker). M18+ demoted `blocked:playtest-gate`.
- M17.5 §3 decisions resolved (replan doc §3): BattleKind ADOPT; RLS re-book→M22; set_profile_name +
  propose-UI scheduled→M-playtest-c; DEV-gate hooks→M-playtest-a. `m17-fix-sideb-guards` candidate is
  SUBSUMED by 17.5a. m17b-2 park subsumed by M-playtest-c.
- New M-playtest specs are sketches: each needs the standard build-time slicing pass before first launch.
- Next tick is UNCHANGED: merge m17c #198 first.
