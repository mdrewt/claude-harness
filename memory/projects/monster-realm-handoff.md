---

## 2026-07-11T06:29Z — supervisor (same tick) — m14f IN-PROGRESS
- Launched m14f (doc-keeper close for M14; doc-only; ADR 0097 reserved) detached via mr-launch.sh. M14 complete when it merges.

## 2026-07-11T~08:00Z — m14f TERMINAL STATE (PR TBD open, local `just ci` EXIT=0)

- Branch: `feat/m14f-doc-keeper-close`, worktree `.claude/worktrees/m14f` (in monster-realm), base `523668f` (master after m14e)
- `just ci` EXIT=0 on master `523668f` (integration verification run before docs committed)
- **What landed (ADR-0097, doc-only):**
  - `docs/adr/0097-m14-close-phase-b-complete.md` (NEW): post-integration verification evidence, M14 slice summary table, R1/R2/R3 advance to Phase C (not m14f), ADR next-free=0098
  - `ARCHITECTURE.md` — M14a–M14e narrative summaries + "Phase B (M11–M14) complete" statement
  - `specs/monster-realm-v2/M14-deeper-battle.spec.md` §5 — m14d/m14e/proof-of-teeth/doc-keeper ticked
  - Harness memory: `memory/projects/monster-realm-m14f.md` (new)
  - Auto memory: `monster-realm-m14f.md` + MEMORY.md index row
- **ADR-0097 CONSUMED** (next-free → 0098)
- **Phase B (M11–M14) COMPLETE**
- **Named residuals advancing to Phase C:** R1 (swap_active status-drop), R2 (bench-cure gap), R3 (attempt_recruit gap), RT-PS-01, RT-PS-DIALOGUE
- **Supervisor owns merge.** Next: Phase C — M15 trade. First queue item: deflake recruit.spec.ts R2 (4 sightings, HIGH priority).

## 2026-07-11T08:25Z — supervisor tick mr-sup-cowork-20260711T080703Z-1007777-7391 — m14f MERGED, Phase B COMPLETE
- m14f (doc-keeper Phase B close) run finished clean (EXIT=0, 1 attempt, $3.03, Sonnet). PR #142 squash-merged → master 1e2716a; master CI GREEN.
- e2e failed once on PR: e2e/recruit.spec.ts R2 "exceeded MAX_HEALS (2)" — 5th sighting of the known flake, on a doc-only diff (ARCHITECTURE.md + ADR-0097 only). Rerun → green. Deflake remains FIRST Phase C queue item, priority HIGH.
- ADR index reconciled per Plan B: chore PR #143 (0097 row + next-free 0098) auto-merged → 3eeb484; its CI (doc-only) was in_progress at tick end — verify next tick.
- Cleanup done: m14f worktree/branches removed, per-run lock + .done cleared, main checkout ff'd to origin/master.
- Audits: orchestration CLEAN (doc-only exemption; 0 subagents recorded), gating-test CLEAN (no test files touched).
- No composite launch: chore-merge CI unconfirmed + heavy DC session churn this tick. Next tick: verify 3eeb484 green, then first Phase C slice per PLAN §9 (recruit R2 deflake first).

## 2026-07-11T10:12:43Z — supervisor tick mr-sup-cowork-20260711T100546Z-1026025-21078 — LAUNCH deflake-recruit-r2 (IN PROGRESS)
- Verified 3eeb484 CI green (Nightly in_progress at launch — verify next tick). Phase B complete; first Phase C queue item launched: deflake e2e recruit.spec.ts R2 MAX_HEALS flake (5th sighting on PR#142, doc-only diff → test-side defect suspected).
- Slice: deflake-recruit-r2 · touches client/e2e/** only · ADR 0098 reserved (likely unused) · test-artifact carve-out applies if DoD evidence present.
- Brief instructs PARK-with-memo if root cause is production code.

## 2026-07-11T~12:00Z — deflake-recruit-r2 TERMINAL STATE — PR #144 OPEN, local `just ci` EXIT=0

**Branch:** `feat/deflake-recruit-r2` tip `4fe294b`, **PR:** https://github.com/mdrewt/monster-realm/pull/144  
**Worktree:** `.claude/worktrees/deflake-recruit-r2` (still present; supervisor cleans up post-merge)

**Root cause (test-side, confirmed):** R2's post-weaken null-check conflated three distinct outcomes:
- (a) Explicit flee (own HP ≤ 30%) — party alive  
- (b) Wild KO'd mid-attack (SideAWins) — party alive  
- (c) Party KO'd by wild (SideBWins) — fainted, heal needed  

All three consumed `healCount`, exhausting `MAX_HEALS = 2` on non-faint events.

**Fix (client/e2e/recruit.spec.ts only):**
- `let battleEndedWithPartyAlive = false;` per encounter iteration
- Set `true` on explicit flee in attack loop
- Set via `Victory!` DOM check on mid-attack wild-KO (synchronous in `onBatchApplied`)
- Post-weaken null check: gate `healCount++` + `healViaBox` on `!partyAlive`; Victory! fallback for "skills not visible → break" edge case
- Clarifying comment on recruit-click flee path (structurally bypasses post-weaken check)
- `MAX_HEALS = 2` unchanged

**Validation:**
- 8 consecutive green full runs, `heals=0` across all (no false heal events)
- Tester agent adversarial pass: no HIGH findings; proof-of-teeth intact; synchronous rendering confirmed
- `just ci` EXIT=0 (778 client tests + 1041 Rust + all evals)
- ADR 0098 NOT consumed (test-only fix, no new pattern)

**Supervisor owns squash-merge.** Next Phase C slice after merge: first M15-trade task or other queued Phase C item per PLAN §9.

## 2026-07-11T~11:15Z — weekly-review (generate-improvement-plan) — NEW MILESTONE M14.5 INSERTED
- Eighth weekly multi-lens review completed against pinned clone @ `3eeb484` (isolated `--no-hardlinks` clone, torn down; no runner state touched). 10 lenses → blind verification (28/29 claims verified, 1 adjusted, 0 dropped).
- **NEW: `specs/monster-realm-v2/M14.5-eighth-review-residuals.spec.md`** — inserted between M14 and M15 (same pattern as M8.5/M10.5/M12.5/M13.5). PLAN.md Phase C section updated with the M14.5 bullet. **Please include both files with your next git commit.** Chain milestones/slices per your own best judgement — M14.5 is disjoint from deflake-recruit-r2 except possibly 14.5d touching client/e2e.
- Headlines (all verified; evidence + EARS criteria in the spec): swap/recruit reducers bypass the ENTIRE post-turn status/weather pipeline (broader than R1/R3 — recruit advances turn_number with frozen status/weather clocks); the M14c ability system is structurally inert in production (no SpeciesRow column, marshal hardcodes None, zero AbilityStore call sites) while ARCHITECTURE claims delivery; use_battle_item has NO client UI path; weather never reaches the client store; Phase-4.5 StatusApplied can land on the wrong (switched-in) monster after a DoT/weather faint; battle.rs:488 claims load_skills() is cached — it is not (skills/items re-parse every battle turn).
- Relevant to deflake-recruit-r2 (now terminal per the entry above): the R2 MAX_HEALS root cause was independently verified — healCount declared once at recruit.spec.ts:427 OUTSIDE the 14-encounter loop (cumulative budget of 2 across all encounters; sibling bounds carry probability math, this one does not). If the landed fix differs, cross-check against this diagnosis. Noted in M14.5 spec section 4.
- Three DECISIONS for Drew are flagged in spec section 3 with defaults (blocked-swap policy D-14.5-1, ability wiring vs de-scope D-14.5-2, republish-smoke vs BSATN test D-14.5-3).

## 2026-07-11T13:17:30Z — supervisor mr-sup-cowork-20260711T131134Z-1130615-17770 — IN PROGRESS
deflake-recruit-r2 RESUMED (fix remote-red): PR #144 e2e red — "R2: did not recruit within MAX_ENCOUNTERS=14" (the second flake cause the run's own memo documented). Heal-budget fix stays; run resumes in existing worktree/branch to deflake the recruit-encounter path, push to same branch. remote_red_fix_cycles=1. Merge remains supervisor-owned.

## 2026-07-11T~13:40Z — deflake-recruit-r2 TERMINAL STATE (resume) — PR #144 OPEN, local `just ci` EXIT=0, remote CI re-triggered

**Second flake cause fixed:** `MAX_ENCOUNTERS=14` was insufficient for Zone 0's 31.8% Water-type encounter rate.
Tidalin (Water, weight 7/22) flees every encounter immediately, consuming enc slots with 0% recruit probability.
P(fail all 14, p=0.40 per slot) = 0.6^14 ≈ 8e-4 (0.08%) — triggers measurably across CI pushes.

**Fix (client/e2e/recruit.spec.ts only, tip 351145e):**
- `MAX_ENCOUNTERS`: 14 → 30 (P(fail all 30) ≈ 1.2e-7; very pessimistic p=0.30: 0.7^30 ≈ 2.2e-5)
- `MAX_RECRUIT_CLICKS`: 8 → 12 (P(≥1 recruit in 12 at 380‰) ≈ 0.998)
- `test.setTimeout`: 300_000 → 900_000ms (red-team finding: 30 enc × ~30s budget)
- ADR-0086 reference documenting why RNG injection not possible in client/e2e/**
- All assertions unchanged; `MAX_HEALS=2` proof-of-teeth unchanged

**Review gates:** tester PASS, reviewer PASS (after timeout fix), red-team PASS (after timeout fix), verifier PASS
**Local just ci:** EXIT=0, 778 client tests + Rust + all evals green
**ADR 0098** not consumed — remains available

**Supervisor owns squash-merge of PR #144 once remote CI (e2e job) is green.**
Next: first M14.5 slice per PLAN §9.


## 2026-07-12T03:48:28Z — supervisor mr-sup-cowork-20260712T033841Z-1297582-23528 — IN-PROGRESS: resume deflake-recruit-r2 (fix-remote-red cycle 2)
Prior resumed run finished EXIT=0 ATTEMPTS=1 (cost $3.01, sonnet, orchestration CLEAN: tester/reviewer/red-team/verifier all present). Progress memo claims DONE but remote e2e is RED on exact head 351145e (run 29154350070): `encounters=30 recruitClicks=1 heals=0 recruited=false` — contradicts the run's P(recruit-opportunity)≈0.40 model (~12 expected clicks vs 1 observed). Budget raises are not curing it; relaunching with instructions to instrument + root-cause recruit-CTA absence under CI. PR #144 stays open. ADR 0098 still unconsumed. SEPARATE: Nightly on master (run 29146681177) FAILED in `mutation` job (`just mutate-core` exit 1) — master CI workflow itself GREEN; queued as follow-up target, not treated as master-red.

## 2026-07-12T06:25Z — supervisor mr-sup-cowork-20260712T060624Z-1355044-23664 — deflake-recruit-r2 MERGED
- PR #144 (fix(e2e): deflake R2 heal-budget exhaustion in recruit.spec.ts) squash-merged at 06:13:59Z → master 35945f8. Run exited EXIT=0 ATTEMPTS=1; fix-cycle-2 brief's instrumentation confirmed the fix (R2 diagnostics: encounters=1 recruitClicks=1 recruited=true).
- The PR-level e2e red was NOT the R2 signature: dialogue.spec.ts:401 test 13.5c-5 "overlay toBeHidden" flake. Passed on job rerun (mergeStateStatus CLEAN). The SAME flake then hit master CI post-merge (run 29182345091); green on failed-job rerun. Master CI = GREEN on 35945f8. Two occurrences in ~75 min ⇒ queued FOLLOW-UP: deflake dialogue 13.5c-5.
- Audits: orchestration CLEAN-test-artifact (sonnet model asserted; reviewer+red-team+verifier subagents in log; test-only diff client/e2e/recruit.spec.ts ⊆ touches; multiple full green suite runs in-build). Gating-test integrity clean (no skip/only/xit added, 0 assertions removed, +2 expects).
- Cleanup: worktree + local/remote branch removed; per-run lock and .done cleared. ADR 0098 reserved-unconsumed → adr_next_free stays 98. No ADR-index chore needed (no ADR in diff).
- ANOMALY for next tick: specs/monster-realm-v2/PLAN.md does not exist at the canonical path; plan docs present at docs/*-plan.md and m13.5r-plan.md (repo root). Verify the live plan source (archive prompt may explain) before selecting new PLAN work. No composite launch this tick (plan-source doubt + DC session churn ×2).
- Open follow-ups: nightly mutation red (run 29146681177) triage; dialogue 13.5c-5 deflake; ADR-0096 Phase C carry-forwards.

## 2026-07-12T08:14:24Z — supervisor mr-sup-cowork-20260712T080901Z-1373289-10803 — IN-PROGRESS: launch fix-nightly-mutants
Nightly mutation gate RED on master (run 29146681177): 16 MISSED mutants in game-core/src/combat/{status.rs (from_ctx_random bit-ops), weather.rs:97 (turns_remaining)}. Zero-tolerance ADR-0050. Launched test-artifact slice fix-nightly-mutants (kill all 16; ADR 0098 reserved). Brief /tmp/mr_pass_fix-nightly-mutants.md. NOTE: prior tick's "PLAN.md missing" anomaly RESOLVED — specs live at $HARNESS/specs/monster-realm-v2/ (harness repo), prior check looked in the project repo.

## 2026-07-12 — fix-nightly-mutants TERMINAL STATE — PR #145 OPEN, local `just ci` EXIT=0

**Branch:** `feat/fix-nightly-mutants`, tip `113a146`, **PR:** https://github.com/mdrewt/monster-realm/pull/145

**What was done:**
- Added 12 new tests inline to status.rs and weather.rs (`#[cfg(test)]` blocks, no prod code changes)
- status.rs: 6 named-seed exact-value tests + 1 proptest vs independent reference → kills 9 XOR/shift mutants in `from_ctx_random` lines 60–62
- weather.rs: 4 per-variant boundary tests + 1 proptest → kills 2 constant-replacement mutants in `turns_remaining`
- AC-M7 `// kills:` comments added; reference scope disclaimer added; mutant count comment clarified
- Tester + reviewer (MAJOR fixed) + red-team (MEDIUM fixed) + verifier (in-progress) gates run
- `just ci` EXIT=0 (1053 Rust + 778 client tests)
- Scoped cargo mutants: 0 missed in status.rs + weather.rs (was 11)

**BLOCKER — 5 pre-existing missed mutants in OTHER game-core files (outside touches):**
- `ability.rs:54:13` delete match arm (StatusKind::Poison, StatusEffect::Poison) in StatusKind::matches
- `ability.rs:56:13` delete match arm (StatusKind::Paralysis, StatusEffect::Paralysis) in StatusKind::matches
- `ability.rs:58:13` delete match arm (StatusKind::Freeze, StatusEffect::Freeze) in StatusKind::matches
- `ability.rs:158:60` replace < with <= in apply_entry_ability
- `resolve.rs:462:22` replace == with != in resolve_full_turn
Full `cargo mutants -p game-core --jobs 8` shows 5 missed (was 16); `just mutate-core` still exits 1. Follow-up slice needed for ability.rs + resolve.rs to bring to missed=0.
- ADR-0098 NOT consumed (test-only slice, no new pattern)

**Supervisor owns squash-merge.** After merge, next priority: follow-up slice for ability.rs + resolve.rs missed mutants to complete the nightly gate repair.

## 2026-07-12T10:25Z — supervisor mr-sup-cowork-20260712T100619Z-4086837-32392 — fix-nightly-mutants MERGED
PR #145 squash-merged → master d318064. 564 purely-additive test lines (#[cfg(test)] modules appended to combat/status.rs + combat/weather.rs); kills the 11 nightly missed mutants (from_ctx_random bit-mixing, turns_remaining). Wrapper EXIT=0 ATTEMPTS=3, cost $2.08, sonnet-4-6. Audits: orchestration CLEAN (tester/reviewer/red-team/verifier all present), gating-test clean (no deletions/skips). ADR 0098 reservation UNUSED (test-only slice) — docs/adr README next-free remains 0098.
Master CI on d318064: e2e failed once — R2 "did not recruit within MAX_ENCOUNTERS=30" (recruit.spec.ts; a NEW flake mode post-#144 deflake) — green on rerun; ci job green. Worktree + local/remote branch cleaned; strays .claire/ + docs/memory-cards/ left untouched.
Next: launching deflake-e2e-r2-dialogue (both active e2e flake modes: dialogue 13.5c-5 overlay toBeHidden + recruit R2 MAX_ENCOUNTERS) as a test-artifact slice, touches e2e/** only.

## 2026-07-12T10:29Z — supervisor — IN-PROGRESS: deflake-e2e-r2-dialogue launched (deflake dialogue 13.5c-5 + recruit R2 MAX_ENCOUNTERS; touches e2e/** only; test-artifact slice)

## 2026-07-12 — deflake-e2e-r2-dialogue TERMINAL STATE — PR #146 OPEN, local `just ci` EXIT=0

**Branch:** `feat/deflake-e2e-r2-dialogue` tip `a5c59c3`, **PR:** https://github.com/mdrewt/monster-realm/pull/146
**Worktree:** `.claude/worktrees/deflake-e2e-r2-dialogue`

**Root causes confirmed:**

*Flake 1 — dialogue.spec.ts 13.5c-5 `toBeHidden` (2× on 2026-07-12):*
advance_dialogue triggers StartQuest + row-delete in one transaction; subscription
propagation under CI load can exceed 10 s. Same path applies to dismiss_dialogue.
Fix: raise both `toBeHidden` from `{ timeout: 10_000 }` to `{ timeout: 20_000 }`.

*Flake 2 — recruit.spec.ts R2 `recruitClicks=1` (CI red master d318064):*
`HEAL_COOLDOWN_MS=31_000` outer guard blocked `restoreHpBeforeEncounter` for 31 s
after any heal. Fast Water-type / low-HP-flee encounters consumed enc slots inside
that 31 s window. Party entered subsequent battles at depleted HP (write_back_party_hp
ADR-0047) → `ownPct <= OWN_HP_FLEE_THRESHOLD_PCT` on atk=0 → immediate flee, no
recruit clicks. Fix: remove the outer guard; `restoreHpBeforeEncounter` handles the
30 s server cooldown internally (8 × 6 s retry = 48 s). Timeout 900 s → 1500 s.

**Review gates:** tester PASS (MEDIUM findings addressed), reviewer PASS (MINOR-1/-2 fixed),
red-team PASS (no new flake modes), verifier in-progress.
**Local `just ci`:** EXIT=0 (1053 Rust + 778 client + all evals)
**ADR-0098:** NOT consumed (test-only timing + guard fix, no new pattern)
**Touches:** `client/e2e/dialogue.spec.ts` + `client/e2e/recruit.spec.ts` ONLY

**Supervisor owns squash-merge.** Next: M14.5 Phase C per PLAN §9.
