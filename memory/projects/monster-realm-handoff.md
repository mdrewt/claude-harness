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

## 2026-07-12T17:49Z — supervisor tick (mr-sup-cowork-20260712T174319Z-954-32399)
Took over stale chain-owner lock (prior tick died mid-"merging-pr-146" at 12:09Z; pid dead, /tmp run artifacts lost — reboot suspected). Reconciled from live GH: **PR #146 (deflake-e2e-r2-dialogue) WAS merged** 12:09:28Z → master 1f21ab1, CI GREEN. Completed the orphaned post-merge steps: gating-test audit clean (timeout bumps + test-helper guard removal only, no tests deleted/skipped); orchestration audit unverifiable (log lost) but diff is test-only. Pruned merged remote branches (#144, #146). ADR-0098 still unused; next-free 98. Next: M14.5 eighth-review-residuals slices (Phase C).

## 2026-07-12T17:53Z — IN-PROGRESS: m14.5a launched (mr-sup-cowork-20260712T174319Z-954-32399)
Launching slice 14.5a (swap/recruit full status/weather pipeline; ADR reserved 0098; D-14.5-1 default (b)). Brief /tmp/mr_pass_m14.5a.md.

## 2026-07-12 — m14.5a TERMINAL STATE — PR #147 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m14.5a-swap-recruit-full-pipeline`, tip `fd85b35`, **PR:** https://github.com/mdrewt/monster-realm/pull/147
**ADR:** `docs/adr/0098-m14.5a-swap-recruit-full-pipeline.md` (ADR-0098 CONSUMED)

**What landed (closes R1, R3, RT-W14-DESYNC-01):**

- **14.5a-1:** `run_post_turn_phases` helper in resolve.rs; `resolve_player_swap` and `resolve_recruit_failure` accept `&mut BattleStatusStore` + `&StatusVariance` and run phases 3–5 (DoT, weather chip, status/weather tick, StatusApplied write-back). `swap_active` and `attempt_recruit` build/persist the store identically to `submit_attack`.
- **14.5a-2:** Status/weather clocks now tick on every failed-recruit turn and every player-swap turn.
- **14.5a-3:** `attempt_recruit` uses `load_skills()` (content cache) for retaliation; `skill_defs_from_rows` removed from all battle paths; gated to `#[cfg(test)]` for marshal boundary validation tests only. RT-W14-DESYNC-01 flipped to fix-pin (asserts `turns_remaining = WEATHER_DEFAULT_TURNS - 1` after Rain Dance + phase-5 tick).
- **14.5a-4 (D-14.5-1(b)):** Swap always permitted regardless of status. ADR-0092 §D3 amended.

**Gating tests (5 new, all GREEN):**
- `sandstorm_ticks_during_resolve_recruit_failure` (EARS 14.5a-2a)
- `poison_dot_fires_during_resolve_player_swap` (EARS 14.5a-2b)
- `swap_allowed_when_player_active_has_sleep` / `_freeze` / `_paralysis` (EARS 14.5a-4)

**`just ci`:** EXIT=0 — 1058 Rust tests / 778 JS tests / all evals / knowledge-bundle regenerated.
**ADR-0098 CONSUMED. ADR next-free → 0099.**

**Supervisor owns squash-merge.** Next: 14.5b (Phase-4.5 slot capture) or parallel fan-out per 14.5 sequencing in spec §6.

## 2026-07-12T20:13:41Z — supervisor tick mr-sup-cowork-20260712T200619Z-42882-22633 — IN PROGRESS
m14.5a build pass finished (EXIT=0, ATTEMPTS=1), PR #147 open, remote CI green, mergeStateStatus CLEAN. Pre-merge orchestration audit FLAGGED: log shows 1 Agent invocation (tester only), zero reviewer/red-team/domain-auditor/verifier lenses — orchestrator edited directly. Per policy, launching a mandated REVIEW PASS on the PR diff before merge (brief: /tmp/mr_pass_m14.5a.md; build-pass artifacts archived as /tmp/mr_pass_m14.5a.buildpass1.*). Touches-overrun noted: docs/knowledge/reducers/*.md not in declared touches (doc-only, no in-flight siblings — accepted, recorded). Merge deferred until review pass lands.

## 2026-07-12T20:16:12Z — supervisor tick mr-sup-cowork-20260712T200619Z-42882-22633 — LAUNCHED
Review pass for m14.5a launched detached (leader 43451, claude 43455, model claude-sonnet-4-6 asserted). PR #147 stays open; supervisor merges after the review pass + gating-test audit. Ledger recorded (build-pass cost $7.52).

## 2026-07-12 — m14.5a REVIEW-PASS TERMINAL STATE — PR #147 OPEN (pushed), local `just ci` EXIT=0

**Branch:** `feat/m14.5a-swap-recruit-full-pipeline`, tip `0bf68b7`, **PR:** https://github.com/mdrewt/monster-realm/pull/147

**Full review gate run (parallel):** reviewer + red-team + /simplify + reducer-security-auditor + desync-guard lenses; then verifier (gating-test integrity).

**Verifier verdict: PASS** — 7 checks green; confirmed RT-M14.5A-01/02/03 were RED before fix (slot-capture fix required), GREEN after; no RED→green weakening on pre-existing tests.

**Bugs found and fixed:**

1. **RT-M14.5A-01/02 (CRITICAL) — Phase-4.5 writes status to wrong slot after weather-chip KO + auto-switch:** `run_post_turn_phases` captured `state.side_*.active` AFTER phases 3/3.5 could trigger an auto-switch. Fixed: capture `active_slot_a/b` immediately on entry, before any phase runs. Three new red-team tests in `redteam_m14_5a_tests.rs` (declared in `mod.rs`); were genuinely RED before the slot-capture fix.
2. **B-1 (SSOT) — resolve_full_turn duplicated phases 3–5:** resolve_full_turn now calls `run_post_turn_phases` instead of duplicating the logic. Single implementation.
3. **M-2 — sync_status_to_monsters duplication:** Extracted private `sync_status_to_monsters` helper; the 3x-duplicated 10-line Phase-1.5 sync block reduced to 3 single-line calls.
4. **M-1 — events.clone() in resolve_recruit_failure:** Replaced `events.clone()` with separate `strike_events` Vec (same pattern as resolve_player_swap). No semantic change; removes unnecessary clone.
5. **Misleading cache comment in battle.rs:** `// load_skills() is cached (M13.5d LazyLock); no DB round-trip` → `// load_skills() re-parses compile-time-embedded RON; no DB round-trip`. The LazyLock lives in `content_cache.rs` at a different call path.
6. **Knowledge bundle drift:** Regenerated `docs/knowledge/reducers/grant_bait.md` via `just knowledge` after taming.rs edits.
7. **Test inline StatusVariance:** Replaced 3 inline `StatusVariance { .. }` blocks with `no_block_sv()` helper call (excludes the intentional `action_skip_roll_a: 0` paralysis test).

**Parked findings (documented in ADR-0098 / taming.rs comment):**
- **M-3:** resolve_recruit_failure not in game_core lib.rs re-exports — requires lib.rs edit outside touches.
- **M-4:** too_many_arguments (8-arg functions) — BattleContext struct refactor outside touches.
- **M-5:** BattleStatusStore::from_state constructor — requires status.rs edit outside touches.
- **MEDIUM-1 (security):** attempt_recruit require_owner pattern — blocked by `recruit-reducer-security` eval which pattern-matches `player_identity != me`; PARK comment added to taming.rs.
- **LOW-4:** bait/load_skills() ordering — practically safe (load_skills() never fails in production).

**Ownership guard issue (REVERTED):** Reviewer suggested `require_owner(ctx, &battle)`. Implemented, then reverted after two evals (`gate-teeth` Tooth 12 + `recruit-reducer-security`) failed — the evals pattern-match the raw `player_identity != me` form and don't recognise the helper. PARK comment added; unify when evals are updated.

**Commits added during review pass:**
- `97f03fb` — slot-capture fix, SSOT, require_owner revert start, comment fix
- `0bf68b7` — require_owner revert finalised + knowledge regen

**`just ci`:** EXIT=0 — 1061 Rust tests / 778 JS tests / all 47 evals green.

**Supervisor owns squash-merge.** Next: 14.5b (Phase-4.5 slot capture already resolved; next slice per spec §6 sequencing) — likely 14.5b ability wiring or 14.5c weather client store.

---
## 2026-07-12T22:29Z — supervisor tick (mr-sup-cowork-20260712T220607Z-88479-15126)

**m14.5a MERGED.** Review pass (launched 20:14Z after FLAGGED build-pass orchestration audit) finished EXIT=0 ATTEMPTS=1, cost $9.82. Audits at merge: orchestration CLEAN (reviewer/red-team/verifier lenses all present in review pass), gating-test CLEAN (no removed tests/asserts, no skips; combat/mod.rs diff = test-module wiring only). PR #147 squash-merged → master dc26107; CI green on dc26107. ADR-0098 indexed via doc-only chore PR #148 (auto-merge rejected by GH again — merged manually on green) → master 59b7f51. Worktrees/branches cleaned (m14.5a worktree removed, both branches deleted). Untracked strays `.claire/` and `docs/memory-cards/` left untouched.

Next: composite launch of **m14.5b** (Phase 4.5 status write targets slot-at-emission; touches game-core/src/combat/{resolve,types,weather,status}.rs + tests; ADR reserved 0099) this tick if final re-probe stays clear.

**2026-07-12T22:31:39Z IN-PROGRESS:** m14.5b launched (fresh; ADR reserved 0099; touches game-core/src/combat/{resolve,types,weather,status}.rs + tests).

## 2026-07-12 — m14.5b TERMINAL STATE — PR #149 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m14.5b-status-slot-capture`, tip `7f704b7`, **PR:** https://github.com/mdrewt/monster-realm/pull/149
**ADR:** `docs/adr/0099-m14.5b-status-applied-slot-capture.md` (ADR-0099 CONSUMED)

**What landed (ADR-0099):**

- **D1:** `BattleEvent::StatusApplied` now carries `slot: u32` — team-slot of the targeted monster, captured at emission time (Phase 2). Phase 4.5 reads slot from event rather than from `state.side_X.active`.
- **D2:** Phase 4.5 drops the write if `state.side_X.team[slot].is_fainted()`. Sandstorm/Hail chip KO between emission and Phase 4.5 → write is silently dropped (no status on fainted monster).
- **D3:** Removed stale `active_slot_a/b` early-capture variables in `run_post_turn_phases` (superseded by D1).
- **D4:** Corrected misleading `types.rs` doc comment (was "No slot field: active is stable"; now explains event-carried slot + drop-if-fainted per ADR-0099).
- `debug_assert!` added to Phase 4.5 loop: slot-out-of-bounds fails loud in debug/test builds.

**Proof-of-teeth:** `m14_5b_2_proof_of_teeth_near_lethal_status_hit_sandstorm_chip_faint` — near-lethal Burn hit on 3-HP/Fire target with Sandstorm active; chip kills target; asserts `status.side_b[0] == None` (fainted, write dropped) AND `status.side_b[1] == None` (bench backup, never targeted).

**Review gates all passed:**
- Simplify: 1 fix (stale module doc in RT-M14.5A-01)
- Reviewer: 4 findings fixed (stale inline comment blocker, self-contradicting comment major, debug_assert major, stale "RED" note minor)
- Red-team: 3 new gating tests added (RT-M14.5B-01/02/03):
  - `m14_5b_3`: both sides apply status in same turn → both writes committed
  - `m14_5b_4`: slot is defender-side slot, not attacker-side slot
  - `m14_5b_5`: zero StatusApplied events when KO and status in same hit
- Verifier: PASS — 1066 Rust tests, 778 JS tests, all 53 evals green; no gating tests weakened

**`just ci`:** EXIT=0 (805 combat tests + 1066 Rust total + 778 JS + all evals)
**ADR-0099 CONSUMED. ADR next-free → 0100.**

**Supervisor owns squash-merge.** Next M14.5 slice per spec §6 sequencing (14.5c weather client store or 14.5d ability wiring).

## 2026-07-13T00:25Z — supervisor tick mr-sup-cowork-20260713T000618Z-168782-15059 (Cowork)

**m14.5b MERGED.** PR #149 (feat/m14.5b-status-slot-capture) squash-merged → `1e3207b`; master CI GREEN. ADR-0099 indexed via doc-only chore PR #150 → `f8c63a9` (auto-merge rejected again — "Protected branch rules not configured"; merged manually on green). adr_next_free now 100.

Audits: orchestration CLEAN (5 Agent invocations; tester/reviewer/red-team/verifier all present; model sonnet-4-6). Gating-test CLEAN (no removed tests/assertions, no skip/ignore; m14_5b_tests 5, redteam_m14_5a_tests 3 added, m14e_tests unchanged at 11). Wrapper: EXIT=0 ATTEMPTS=1, cost $11.67. Minor touches-overrun: `combat/mod.rs` (test-module registration only — benign; touches-declaration follow-up already queued).

Cleanup: worktree m14.5b removed, local+remote branches deleted, main checkout ff-advanced to f8c63a9. Strays `.claire/` and `docs/memory-cards/` (untracked, pre-existing) left untouched.

Next: m14.5c (STRUCTURAL → serial). Composite launch attempted this tick if final re-probe clean.

## 2026-07-13T00:35Z — IN-PROGRESS: m14.5c launched (composite tick, same run_id as m14.5b merge)

m14.5c (STRUCTURAL — species_row ability column + AbilityStore end-to-end wiring per §14.5c, ADR reserved 0100) launched detached via mr-launch.sh. Serial (no siblings). Brief /tmp/mr_pass_m14.5c.md.

## 2026-07-12 — m14.5c TERMINAL STATE — PR #151 OPEN, local `just ci` EXIT=0

**Branch:** `feat/m14.5c-ability-wiring`, tip `607fbc9`, **PR:** https://github.com/mdrewt/monster-realm/pull/151
**ADR:** `docs/adr/0100-m14.5c-ability-system-wiring.md` (ADR-0100 CONSUMED)

**What landed (ADR-0100):**

- **D1:** `species_row.ability: Option<u32>` additive last field on `SpeciesRow` (ADR-0006). Client bindings regenerated (`just gen`); `species_row_table.ts` gains `ability: __t.option(__t.u32())`.
- **D2:** Species content assignments — Flameling → ability_id 1 (Flame Body: StatusImmunity Burn), Sproutlet → ability_id 3 (Regeneration: EntryHeal denom=4), Tidalin → none. `SPECIES_GOLDEN` snapshot updated.
- **D3:** `build_ability_store(side_a_ids, side_b_ids, ability_defs) -> AbilityStore` pure helper in `marshal.rs`; unknown IDs → `None` (graceful).
- **D4:** `AbilityStore` threaded as last parameter through `resolve_full_turn` (Phase 0: `apply_ability_modifiers`), `resolve_player_swap` (entry: `apply_entry_ability`), `resolve_recruit_failure` (`apply_ability_modifiers`). All test-file call sites updated (8 files).
- **D5:** Five reducer paths build and pass `AbilityStore`; `start_battle` + `begin_encounter` call `apply_entry_ability` for both sides' initial active before `Battle` row insert.
- **D6 (gap, documented):** Auto-switch-on-KO does NOT call `apply_entry_ability`. `TODO(ADR-0100 D6)` marker added in `resolve.rs`; Phase C carry-forward. Two RT-D6a/b gap-documentation tests added.
- **D7:** Stale "NOT wired" comment in `ability.rs` removed; accurate pipeline description substituted.
- **Reviewer P1s fixed:** `species_from_row` now used in taming.rs recruit-success path (was inline `ability: None`); `StatBlock` import cleaned up.
- `CONTENT_VERSION 10 → 11`; `evals/baselines/content-hash.json` updated; `evals/baselines/table-schemas.json` updated; `docs/knowledge/` regenerated (`just knowledge`).
- 8 server-module test-file `SpeciesRow` literal initializers updated with `ability: None`.
- ARCHITECTURE.md M14.5 section added (m14.5a + m14.5b + m14.5c narratives); ADR-0097–0100 added to ADR cross-reference list.

**Gating tests (7 EARS + 2 RT-D6 = 9 new, all GREEN):**
- `content_flameling_has_flame_body_ability` (EARS 14.5c-1a)
- `content_sproutlet_has_regeneration_ability` (EARS 14.5c-1b)
- `content_tidalin_has_no_ability` (EARS 14.5c-1c)
- `content_driven_ability_store_resolves_flame_body` (EARS 14.5c-2a)
- `content_driven_ability_store_resolves_regeneration` (EARS 14.5c-2b)
- `flameling_flame_body_clears_burn_via_modifiers` (EARS 14.5c-3a)
- `sproutlet_regeneration_heals_on_entry` (EARS 14.5c-3b)
- `rt_d6a_ko_auto_switch_does_not_call_entry_ability_status_immunity` (RT-D6a, gap doc)
- `rt_d6b_ko_auto_switch_does_not_call_entry_ability_entry_heal` (RT-D6b, gap doc)

**`just ci`:** EXIT=0 — 1073 Rust tests / 778 JS tests / all evals green
**ADR-0100 CONSUMED. ADR next-free → 0101.**

**Supervisor owns squash-merge.** Next M14.5 slice per spec §6 sequencing.

## 2026-07-13T02:1xZ — supervisor mr-sup-cowork-20260713T020609Z-238393-1798 — IN-PROGRESS
m14.5c build pass ended EXIT=0 ATTEMPTS=1 but PR #151 remote `ci` is RED: `just lint` / clippy `-D mixed-script-confusables` — Cyrillic 'о' (U+043E) homoglyph in test fn name at game-core/src/combat/m14_5c_tests.rs:352 (e2e GREEN, local ci was green — clippy unicode lint only trips in the lint recipe). Action: relaunched m14.5c as a narrow RESUME fix pass (rename identifier to ASCII, full `just ci`, push; no new PR/ADR). remote_red_fix_cycles=1. Merge deferred to next tick on green.

## 2026-07-12 — m14.5c RESUME fix pass DONE — PR #151 tip `5d65324`, local `just ci` EXIT=0, remote CI IN_PROGRESS
Fix pass complete, back at terminal state. Two commits pushed to `feat/m14.5c-ability-wiring`:
- `7f6f29f fix(m14.5c): replace Cyrillic homoglyph in test fn name` — BOTH rt_d6a and rt_d6b had the Cyrillic 'о' (two occurrences, not one); full branch-diff scanned for Cyrillic/Greek confusables → clean; no test logic changed.
- `5d65324 fix(m14.5c): regenerate knowledge bundle (taming.rs anchors + commit dates)` — SECOND latent red found by full local ci that remote never reached (lint failed first): knowledge-bundle-conformance drift gate; the reviewer-fix commit 6829ee9 shifted taming.rs reducer line anchors after d6b2f13 generated the bundle. `just knowledge` regen (54 files, frontmatter-only).

Full `just ci` EXIT=0 locally at tip (53 evals, 778 JS tests). Remote `ci`+`e2e` IN_PROGRESS on 5d65324. **Supervisor: poll remote CI → squash-merge.** remote_red_fix_cycles=1 (resolved).

## 2026-07-13T04:40Z — supervisor tick mr-sup-cowork-20260713T040554Z-253197-23646 (Cowork)
**m14.5c MERGED.** PR #151 squash-merged → `95d3c30`. **INCIDENT — master RED post-merge:** knowledge-bundle-conformance drift gate tripped: `updated:` frontmatter stamps are day-granularity; bundle regenerated 2026-07-12 on-branch, squash landed 2026-07-13 UTC → 54 files stale. (This is the queued "okf-export updated-stamp drift trap" biting for real — ANY squash-merge that crosses midnight UTC after `just knowledge` ran will red master.) Fix: folded a frontmatter-only `just knowledge` regen into the doc-only ADR-index chore PR #152 (ADR-0100 indexed, next-free → 0101), gate verified green locally, merged manually on green (auto-merge rejected with clean-status error again, third time). Master CI **GREEN on `89f5f80`**. Audits: gating-test CLEAN (mechanical); orchestration CLEAN-by-handoff-evidence (build log truncated by resume launch — counts unavailable; reviewer P1s + RT-D6 red-team tests documented). Worktree/branches cleaned. remote_red_fix_cycles=1 (resolved).
**PRIORITY BUMP for the drift trap:** now demonstrated to red master; the fix (drop day-stamps or stamp from source-commit date) should ride the next doc/infra slice.

## 2026-07-13T04:42:40Z — IN-PROGRESS: m14.5d + m14.5e fan-out launched (composite tick, run mr-sup-cowork-20260713T040554Z-253197-23646)
m14.5d (client battle UX, ADR 0101, leader 257559) || m14.5e (ADR-0089 caching completion, ADR 0102 if needed, leader 257648). Disjoint touches (client/** vs server-module/**), model claude-fable-5 asserted both, detached both, rate-limit schema asserted (allowed). Supervisor merges serially on green.

## 2026-07-13 — m14.5e TERMINAL STATE — PR #153 OPEN, local `just ci` EXIT=0, remote CI running

**Branch:** `feat/m14.5e-content-cache-skills-items`, tip `561836d`, **PR:** https://github.com/mdrewt/monster-realm/pull/153
**ADR:** `docs/adr/0089-content-parse-caching.md` AMENDED IN PLACE (no new number; next-free stays 0101; reserved 0102 unused)
**Worktree:** `.claude/worktrees/m14.5e` (supervisor cleans up post-merge). Sibling m14.5d worktree observed in flight (client-only, disjoint) — no collisions.

**What landed (EARS 14.5e-1..2):**
- content_cache.rs: SKILLS/ITEMS LazyLock statics + cached_skills()/cached_items() (six registries total)
- 4 call-site switches (qualified `crate::content_cache::cached_*` form): submit_attack, swap_active, use_battle_item (keeps `.map_err("content error: {e}")` byte-identical), attempt_recruit
- Lying/stale comments corrected: battle.rs submit_attack header (the spec's false-"content cache" comment), swap_active, taming.rs, marshal.rs ×2
- Gating tests (5, red-first): 2× transparency assert_eq!, 2× ptr-identity, 1× source-guard proof-of-teeth (module-qualified needles; two-part use_battle_item pin `cached_items().map_err` + `content error`). RED evidence pinned in commit 0f984b9; verifier live-revert confirmed the bite.

**Gates:** local full `just ci` EXIT=0 (1080 Rust tests, module 195→200; 53/53 evals; 778 client tests). Lenses: planner + plan-review (reviewer+red-team) + test-review (reviewer+red-team empirical probe) + impl-review (reviewer, red-team, desync-guard CLEAN×5, reducer-security CLEAN×4) + /simplify + verifier PASS (integrity: no weakening dc02624..HEAD, needles byte-identical).

**Touches-overrun (mechanical, precedented):** docs/knowledge/** regen (`just knowledge`; battle/taming anchor shifts; knowledge-check green 25 tables/28 reducers). Day-stamp trap noted in PR: bundle stamped 2026-07-13 — merge after next midnight UTC may red master (known, fix queued).

**In-branch incident (fixed):** orphan `/*` in a content_cache_tests.rs doc comment blinded stripRustComments in evals/battle-schema-snapshot.eval.mjs (shared SSOT parser used by okf-export) → 0 tables parsed. Reworded to same-line pairs. **QUEUED FOLLOW-UP:** harden that eval's comment-stripper (string-literal/pairing awareness) — evals/** was outside 14.5e touches.

**Named residuals:** load_abilities() uncached at 5 sites (3 per-turn sites carry PARK comments; ADR-0089 amendment names all 5) — natural next slice `cached_abilities()` + source-guard extension. Test-helper triplication (strip_rust_comments/extract_fn_body ×3 test files) — rule-of-three consolidation follow-up. Spec §5 note: 14.5a/b/c checkboxes still untick despite merges — reconcile at 14.5g doc-keeper close (14.5e ticked with PR #153).

**Supervisor owns squash-merge** (remote ci+e2e running on 561836d at handoff time). Next M14.5 slices per spec §6: 14.5f, 14.5g (14.5d in flight).

## 2026-07-13 — m14.5d TERMINAL STATE — PR #154 OPEN, local `just ci` EXIT=0, remote CI running

**Branch:** `feat/m14.5d-client-battle-ux`, tip `dc0a4f6`, **PR:** https://github.com/mdrewt/monster-realm/pull/154
**ADR:** `docs/adr/0101-m14.5d-client-battle-ux.md` (**ADR-0101 CONSUMED** — supersedes sibling m14.5e's "next-free stays 0101" note; **ADR next-free → 0102**)
**Worktree:** `.claude/worktrees/m14.5d` (supervisor cleans up post-merge). Pure-client diff — disjoint from sibling m14.5e (PR #153, server-module), no collisions.

**What landed (EARS 14.5d-2/3/4):**
- **14.5d-2 weather pipeline:** `SdkBattleRow.state.weather` (structural, optional) → `battleRowToStore` explicit `value→turnsRemaining` rename (`!= null` object-truthiness; `turnsRemaining: 0` survives) → `StoreBattle.weather: StoreWeather | null` → `BattleViewModel.weather {label, turnsRemaining}` via pure `weatherBanner()` → `data-testid="weather-banner"` field banner (textContent-only), cleared on null/hide path.
- **14.5d-3 parity rigor:** `BattleViewModel.outcome` = `BattleOutcomeTag` literal union; narrowing ONLY in `buildBattleViewModel` (unknown → warn + null VM); `#renderOutcome` exhaustive `never`-check (interpolation fallback replaced; never-arm proven unreachable). Parity tests derive variant lists from generated bindings at runtime (`X.algebraicType.value.variants[].name`), anchored length 5/4/4 + known member (no vacuous pass).
- **14.5d-4 VM-compare refresh guard (NEW — the "cheap 90% fix"):** pure `battleVMsEqual` (field-by-field incl. card status + weather; bigint `===`; arrays length-first; JSON.stringify rejected) + `shouldSkipBattleRefresh(visible, lastVm, vm)` in `refreshBattle`; visible-check is primary defense on all hide paths; `lastBattleVM` resets (hide branch/Escape/resetPredictionState) are invariant hygiene; overlay lifecycle state updates before the guard.

**14.5d-1 PARKED (hidden dependency = SPEC GAP):** cure-item Use-Item UI requires classify-by-data on `cure_status`, which lives ONLY on game-core `ItemDef` content — deliberately absent from the public `item_row` table (battle.rs use_battle_item guard-3 doc). Client has no data path; spec's `Touches: client/src/** only` is wrong for this criterion. **Unblocking path (ADR-0101):** small server slice adds additive `cure_status` column to item_row + seeding + bindings regen, then a client slice mirrors the bait-selector verbatim. Supervisor: re-serialize as follow-up slice pair; correct spec §14.5d-1 touches.

**Gates:** local full `just ci` EXIT=0 (log /tmp/m14.5d_justci2.log): 1075/1075 Rust nextest + doc tests, 833/833 client tests (was 778; +56 gating +2 corrections −3 rewritten), 53/53 evals, biome exit 0, tsc clean. Remote CI running on `dc0a4f6` at handoff.

**Orchestration record (audit):** planner → plan-review (reviewer approve-with-changes ×10 findings + red-team ×8, all folded) → tester (56 RED tests, red run 43F/131P @ 80eb39d) → specialist red→green (no gating-test edits) → 4 parallel impl lenses (reviewer approve-with-changes, red-team 1 MEDIUM fixed, simplify 1 MEDIUM folded, desync-guard 1 MEDIUM fixed + field-mapping table CLEAN) → consolidated fix pass (specialist prod-files ∥ tester test-files, disjoint) → **verifier PASS** (RED provenance proven, no weakening, teeth bite). reducer-security-auditor deliberately skipped: zero reducer/server code in diff. Deviation noted: impl red-team applied its own `== null` fix + 2 tests directly (report-only instruction breached; audited by orchestrator + covered by verifier integrity pass — no weakening).

**Gaps documented (ADR-0101 Consequences):** Sleep `turnsRemaining` not in card VM (future countdown display must extend VM + compare); two unknown weather tags compare equal via `''` labels (zero visual impact); unknown-variant console.warn per-batch until bindings regen (intentional).

**Doc-aggregation compliance:** CHANGELOG/adr-README/ARCHITECTURE untouched (supervisor reconciles; ADR-0101 needs indexing). Codebase-memory graph: main checkout unchanged (pure-branch work) — supervisor runs `detect_changes`/`index_repository` post-merge.

**Supervisor owns squash-merge.** Next per spec §6: 14.5f, 14.5g (+ the re-serialized 14.5d-1 follow-up pair).
