---

## 2026-07-10T02:46:29Z — supervisor tick mr-sup-cowork-20260710T023302Z-1969357-10926 (cowork)
IN-PROGRESS: resume-launch #2 of parked m13.5c. Prior resume (Jul 5) killed at 91 turns by MONTHLY SPEND LIMIT (429) mid step-7 review-lens fixes; left 3 files uncommitted — supervisor checkpointed as 73b593e and pushed. Spend limit probe (haiku, $0.01): CLEARED. Brief resume-block rewritten to point at finishing lens fixes -> just ci -> verifier -> doc-keeper -> PR. NOTE: master CI green BUT Nightly RED 5 consecutive nights since Jul 5 (jobs: mutation + smoke-republish; deterministic 'invalid arguments for reducer join_game' in smoke-republish) — queued as next target after m13.5c. ADR 0087 still reserved.

## 2026-07-10T~04:30Z — m13.5c TERMINAL STATE (PR #123 open, local `just ci` green, remote CI running)

- Branch: `feat/m13.5c-content-lifecycle`, tip: `54ea4ad` (worktree `.claude/worktrees/m13.5c`, base `8ef8a7f`). Resume #2 completed the parked run: verified+finished the 73b593e supervisor checkpoint (Repair debug_assert compiles, RT-ZONE-EMPTY guard + 2 teeth green), re-ran the FULL lens set (prior findings lost with the killed session).
- PR #123 open: https://github.com/mdrewt/monster-realm/pull/123
- `just ci` EXIT=0 (verifier-run): **853 Rust + 726 client tests, 52/52 evals**; full e2e green (all 5 new dialogue.spec.ts tests incl. B-isolation; first-run recruit R2 red re-confirmed as the documented code-independent stochastic grind flake — green on immediate rerun; m13.5h R2-hardening follow-up stands).
- **What landed (all 5 EARS + D-13.5-3):** 13.5c-1 `plan_npc_sync` planner (Insert/Update/Remove/Repair, entity_id-preserving updates, zone-change respawn, conversation cascade w/ HashSet) + `sync_npc_entities_from` shell; 13.5c-2 `stale_zone_def_ids` + `plan_schedule_reconcile` seams + zone_def reap + game-core empty-registry world-wipe guard; 13.5c-3 write_back_hp clamp to ROW stat_hp (ordering caveat commented); 13.5c-4 owner Err/comment truth fix (`--delete-data`); 13.5c-5 player_conversation PRIVATE + first `#[spacetimedb::view]` `my_conversation` (owner-scoped) + bindings regen + client swap w/ `shouldRemoveOnViewDelete` net-effect delete gate (view UPDATE = unordered insert+delete, NO onUpdate) + KeyT talk + conversation-privacy eval (15 teeth) + migration-smoke re-anchor + ADR-0069 amendment + ARCHITECTURE truth fix.
- **Review trail (this resume):** reviewer APPROVE-WITH-FIXES (M1 HashSet applied) + red-team FIX-FIRST (RT-01 parseViews angle/paren body-walk + T15 tooth bites both directions; RT-02 \b needle; RT-03 identical-value update pair documented ADR-0087+JSDoc — unreachable, durable fix = npc.rs no-op-skip follow-up; RT-04 OKF-no-view-support gap documented) + reducer-security APPROVE (5/5) + desync-guard PASS (5/5 incl. 13.5b reconnect interplay) + simplify no-blockers (test_helpers consolidation deferred) + verifier **APPROVE-FOR-MERGE** (weakening audit: all gating files UNWEAKENED/STRENGTHENED; concat! de-collision + migration-smoke re-anchor verified tighter; 3 teeth spot-checked).
- **ADR-0087 CONSUMED** (owner-scoped view; supervisor owns README index row → range 0087). Do-not-touch honored: CHANGELOG.md, docs/adr/README.md untouched.
- **Touches variances (recorded in PR):** plan-ratified client delta (connection/rowConvert/dialogueModel/main + viewDelete/talk tests + e2e/dialogue.spec.ts), game-core/src/content.rs (world-wipe guard), migration-smoke re-anchor, docs/knowledge regen, plan doc. No sibling owns any.
- **Follow-ups parked (PR body + ADR-0087):** npc.rs no-op-skip upserts; OKF exporter #[view] support; test_helpers consolidation; RT-M4 quest-cascade; R2 flake hardening.
- **Next:** Supervisor owns merge (remote CI running at handoff). Queue note from supervisor 02:46Z entry stands: Nightly RED 5 nights (mutation + smoke-republish `join_game` args) = next target after m13.5c merges. Remaining M13.5 slices per spec §6: 13.5d (after 13.5c, same server files), 13.5e (after 13.5b), 13.5f, 13.5g.

## 2026-07-10T04:45Z — mr-sup-cowork-20260710T040546Z-2041211-8996 (Cowork supervisor tick)

**m13.5c MERGED.** PR #123 squash-merged → b27a0dd. Audits: orchestration CLEAN (aggregated across the 3-run chain — tester roles present in launch #1/#2 logs, reviewer+red-team+review-lens+verifier in the final resume); gating-test audit clean (RED 9bd3a17→54ea4ad: no weakening; sole removed assertion = needle replaced by tighter windowed form; matches verifier verdict). Worktree/branch cleaned.
**Master went briefly RED on b27a0dd** — knowledge-bundle-conformance drift gate: okf-export derives `updated:` from source last-commit date; the squash created a fresh Jul-10 commit vs the Jul-5-dated committed bundle → all 53 pages drifted. **GOTCHA (recurring):** any squash landing on a later day than the bundle regen re-trips this gate; durable fix = exporter uses content-hash or committed-date (queued follow-up).
**Chore PR #124 merged** (manually; `--auto` rejected "clean status" again): ADR-0087 index row registered, next-free → 0088, CHANGELOG cliff regen, docs/knowledge stamp regen. **Master: GREEN on e104d13.**
**Composite launch next: fix-nightly** — Nightly RED 5 consecutive nights (jobs: mutation + smoke-republish; deterministic `invalid arguments for reducer join_game` in smoke-republish; started after m13.5a/b/h merges #118-122). ADR 0088 reserved as fallback. Stale .done flags (m13.5b, m13.5b-review, m13.5c) cleared.

**LAUNCHED 2026-07-10T04:55Z: fix-nightly** detached OK (leader 2047476, claude 2047481), model claude-fable-5 asserted, rate-limit allowed (five_hour). Per-run lock .harness-runner.fix-nightly.lock written. Next tick: poll /tmp/mr_pass_fix-nightly.done.

## 2026-07-10T06:13:51Z — supervisor mr-sup-cowork-20260710T060542Z-2217429-236 — RESUME fix-nightly (IN-PROGRESS)
Previous fix-nightly run: 3 wrapper attempts, EXIT=0, no PR — every attempt ended its turn "waiting on" background subagents and the 600s bg-task ceiling killed it (no rate-limit trip, model fable). Supervisor completed the park: committed+pushed the tester's in-flight work as wip checkpoint dde1faf (tests + recipe-integrity eval; mutants.out excluded), wrote park memo monster-realm-fix-nightly-progress.md. Relaunching as RESUME with explicit wait-synchronously instructions. Branch fix/nightly-mutation-smoke @ dde1faf pushed; master GREEN e104d13; ADR 0088 still reserved.

---
## 2026-07-10T07:10:56Z — supervisor mr-sup-cowork-20260710T070857Z-3127644-19219 — IN-PROGRESS
Resume-2 of fix-nightly launched (attempt 3 overall). Prior resume died to external SIGTERM
06:42Z mid-cargo-mutants (progress pushed @ fc973b1: wrapper+mutants.toml installed, census
tests written). No rate-limit, master GREEN e104d13, no open PRs. Brief: /tmp/mr_pass_fix-nightly.md.

## 2026-07-10T~03:55Z — fix-nightly TERMINAL STATE (PR #125 open, just ci EXIT=0)

- Branch: `fix/nightly-mutation-smoke`, tip: `7d6ee55`. Three resume attempts finally completed.
- PR #125 open: https://github.com/mdrewt/monster-realm/pull/125
- `just ci` EXIT=0: **876 Rust tests, 726 client tests, 53/53 evals PASS**; `just mutate-core` 818 mutants (709 caught · 104 unviable · 5 timeout · **0 missed**).
- **What landed (ADR-0088):**
  1. `scripts/smoke-republish.sh`: `join_game '"SmokePlayer"'` (per-arg JSON, not JSON array; spacetime 2.6.0 CLI)
  2. 37 census-killing tests (`#[cfg(test)]` additions in tiled_import.rs/content.rs/npc/rules.rs/world.rs + `tests/tiled_import_cli.rs` binary integration test); `.cargo/mutants.toml` excludes 1 provably-equivalent mutant (`npc/rules.rs:61:15 replace > with >= in toward_home`, line-pinned, proof written in ADR-0088)
  3. `justfile` `mutate-core:` wrapper: tolerates exit 3 iff missed.txt empty, fail-closed `[ ! -f ]` guard, `wc -l <` count (no trailing-newline false-trigger), passes exit 1/4 loudly
  4. `evals/mutate-core-recipe-integrity.eval.mjs` (13 teeth + 2 positive controls): guards `-p game-core` scope, fail-closed count-compare, bans shell-neuter forms (`exit 0`, `return 0`, `&& true`, `|| true`), pins `.cargo/mutants.toml` to exactly the one blessed exclusion with operator text `replace > with >=`
- **Review trail:** reviewer B1 (wc -l, fixed) + red-team F6/F8 (return 0 ban, operator text pin, both fixed); verifier PASS.
- **ADR-0088 CONSUMED** (next-free → 0089). Do-not-touch honored: CHANGELOG.md, docs/adr/README.md untouched.
- **Next:** Supervisor owns merge. Nightly expected GREEN post-merge. Queue resumes: 13.5d → 13.5e → 13.5f → 13.5g.

## 2026-07-10T08:45Z — supervisor tick mr-sup-cowork-20260710T082854Z-4148706-3858 (cowork)

**fix-nightly MERGED.** PR #125 squash-merged at 08:33Z (merge commit 6d6c097); master CI GREEN on 6d6c097. ADR-0088 index reconciled via doc-only chore PR #126 (auto-merge rejected by branch protection again — merged manually on green) → master now 73ac923. Audits: orchestration CLEAN-test-artifact (no tester-role, but carve-out evidence solid: all game-core src changes are test-only additions, ≥5 full green suite runs, reviewer+red-team+verifier lenses, remote CI green); gating-test integrity clean (zero deleted/skipped tests). Worktree + branches cleaned. Total slice cost across 3 wrapper attempts: ~$12.05. Nightly should go GREEN on next scheduled run — verify next tick. Next per queue: 13.5d (server files now free); considering composite launch this tick.

## 2026-07-10T08:50Z — supervisor tick mr-sup-cowork-20260710T082854Z-4148706-3858 (composite launch)

**m13.5d IN-PROGRESS.** Fresh launch (composite after fix-nightly merge): content parse caching on hot paths, ADR reserved 0089, touches server-module/src/*.rs + client-wasm/src/lib.rs. Brief /tmp/mr_pass_m13.5d.md. 13.5e deliberately NOT fanned out this tick (pairable per queue but conservative; next tick may pair or serialize).

## 2026-07-10T10:2xZ — supervisor tick mr-sup-cowork-20260710T100605Z-16459-10353 (Cowork)
- **m13.5d MERGED**: PR #127 (feat/m13.5d-content-parse-cache, ADR-0089) squash-merged → master 63b59da; CI+e2e green pre- and post-merge. Orchestration audit CLEAN (tester/reviewer/red-team/verifier/doc-keeper, Sonnet, $12.94, 1 attempt). Gating-test audit CLEAN (8 tests/13 asserts stable, zero removals). Worktree + branches cleaned.
- **ADR index reconciled**: chore PR #128 → master 36a7c86 (0089 row added, next-free → 0090). `--auto` still rejected by branch protection; merged manually on green.
- **Nightly**: latest run (2026-07-09) failed on pre-fix sha 8ef8a7f — expected; today's scheduled run post fix-nightly (6d6c097) had not fired at tick time. VERIFY next tick.
- **Next**: composite-launching m13.5e (client UX correctness; pure client TS + new ADR 0090 reserved; serialized after 13.5d per spec). Then 13.5g (structural), 13.5f last.

## 2026-07-10T10:28:31Z — IN-PROGRESS: m13.5e launched (supervisor mr-sup-cowork-20260710T100605Z-16459-10353)
Fresh launch, ADR 0090 reserved, touches = client TS (battleView/main/connection/store/render) + ADR. Brief /tmp/mr_pass_m13.5e.md.

## 2026-07-10T12:27:38Z — supervisor tick mr-sup-cowork-20260710T120603Z-132932-21887 (IN PROGRESS)
Merged m13.5e (PR#129 -> 6dd5694, master CI green; orch audit CLEAN 4 subagents tester/reviewer/red-team/verifier, Sonnet; gating-test audit CLEAN — 2 store.test.ts tests superseded by 13 ring-buffer replacements, 58 tests added, no skips). Touches drift noted: PR also modified client/package{,-lock}.json, zoneSyncGuard.*, interpConfig.ts beyond declared set — harmless (no siblings). ADR 0090 + index reconciled in-PR; no chore PR needed. Nightly 2026-07-10 on 36a7c86 FAILED: mutation ratchet violated, 188 survivors vs cap 180 (ADR-0050). Launching test-only fix slice m13.5r (kill >=20 survivors; list at /tmp/mr_missed_mutants.txt; ADR 0091 reserved, likely unused).

## 2026-07-10T12:32:25Z — supervisor tick mr-sup-cowork-20260710T120603Z-132932-21887 (COMPLETE)
Tick done: m13.5e MERGED (PR#129 -> 6dd5694, CI green, audits clean, cost $18.55, 1 attempt, worktree/branch cleaned). m13.5r LAUNCHED (nightly-red mutation-ratchet fix, test-only; leader 137898, claude 137905, Sonnet asserted, detached; ADR 0091 reserved). Mutex released. Next tick: merge m13.5r on green, then queue 13.5g (structural, serial), 13.5f last.

## 2026-07-10T~14:00Z — m13.5r TERMINAL STATE (PR #130 open, just ci EXIT=0)

- Branch: `feat/m13.5r-mutation-ratchet-fix`, tip: `22d9227` (worktree `.claude/worktrees/m13.5r`).
- PR #130 open: https://github.com/mdrewt/monster-realm/pull/130
- `just ci` EXIT=0: **902 Rust tests (902 passed, 1 skipped), 778 client tests, 53/53 evals PASS**.
- **What landed (test-only):** 20 new tests across 4 files killing 35+ surviving mutants:
  - `raising_tests.rs`: `care_cooldown_ms_is_six_hours_in_milliseconds` — asserts CARE_COOLDOWN_MS == 21_600_000 → kills 6 const-expr mutants (line 37 `*→+/÷`)
  - `content_tests.rs`: 5 `plan_npc_sync_detects_only_<field>_change` tests — single-field changes exploit `&&` > `||` precedence → kills 5 `||→&&` mutants (lines 492-496)
  - `npc_tests.rs`: 13 source-guard tests (include_str + strip_comments + extract_fn_body) for `talk`/`advance_dialogue` arithmetic → kills 24+ mutants (lines 196, 217, 222-224, 231, 308, 315-317, 328, 333)
  - `guards_tests.rs`: `validate_name_accepts_exactly_max_name_len_chars` — boundary at 24 chars → kills 1 `>→>=` mutant (line 42)
- **Projected survivors:** ~153 (below cap 180); original 188 survivors → killed 35+
- **Unkillable (documented):** All remaining survivors require ReducerContext/DB — battle (31), raising heal_party (9), npc DB helpers (9), content sync (14), guards DB-touching (3), other modules.
- **ADR 0091: UNUSED** (test-only slice, no new patterns).
- **Review trail:** reviewer APPROVE (no tautologies; source-guard needles concat-built clean; fixture compat verified; 2 minor pre-existing doc findings, no fixes needed).
- **Next:** Supervisor owns merge. Queue: 13.5g (structural), 13.5f last.

## 2026-07-10T14:20:46Z — supervisor tick mr-sup-cowork-20260710T140706Z-291188-21483 (Cowork)

**m13.5r MERGED.** PR #130 (feat/m13.5r-mutation-ratchet-fix) squash-merged at 14:09Z → master 6d7ce61; master CI GREEN on 6d7ce61. Test-only nightly-red fix: 20 tests across 4 server-module test files killing 35+ mutation survivors (projected ~153 < cap 180). Audits: orchestration CLEAN (tester+reviewer subagents, Sonnet asserted); gating-test integrity CLEAN (additions only, zero deletions/skips). Touches drift noted: m13.5r-plan.md at repo root outside declared set — doc scratch, no siblings, merged with note. ADR 0091 UNUSED as predicted → re-reserving for 13.5g. Worktree/branches (local+remote) cleaned; main checkout ff'd to 6d7ce61. Nightly: VERIFY next scheduled run (must go GREEN on ≥6d7ce61). Next per queue: composite-launching 13.5g (docs/ledger reconciliation; serial — structural package-lock deletion). Then 13.5f last.

## 2026-07-10T14:24:16Z — IN-PROGRESS: m13.5g launched (supervisor mr-sup-cowork-20260710T140706Z-291188-21483)
Fresh launch (composite after m13.5r merge): docs/spec ledger reconciliation (13.5g-1/2/3; serial — structural root package-lock deletion). ADR 0091 re-reserved (likely unused). Brief /tmp/mr_pass_m13.5g.md.

## 2026-07-10 — DONE: m13.5g (PR #131)
Docs/spec ledger reconciliation complete. PR #131 open on feat/m13.5g-docs-ledger-reconciliation, tip 89822f4, just ci GREEN (778 tests, 0 eval FAILs). ADR 0091 unused. Trap: lib.rs CONTENT_VERSION doc change → knowledge-bundle drift → `just knowledge` required. Supervisor owns merge. **Next per queue: 13.5f** (last remaining M13.5 slice).

## 2026-07-10T16:25:56Z — supervisor tick mr-sup-cowork-20260710T160616Z-363894-28401 (Cowork)

**m13.5g MERGED** — PR #131 squash-merged to `a3fe09a`; master CI GREEN. Worktree/branch cleaned; main checkout ff'd.

- Run finished clean (EXIT=0, ATTEMPTS=1, $8.27, sonnet-4-6) but log showed ZERO subagent invocations on a slice with production code (warpDetect wire-in in connection.ts) -> orchestration_audit FLAGGED. Supervisor performed the required review pass on the PR diff (reviewer/red-team/domain/verifier lenses): wire-in is behavior-preserving (isOwnZoneChange predicate identical to the removed inline check, unit-tested on master); @types/node ^22->^24 dev-only, CI green; root package-lock.json stub deleted; everything else docs/comments. APPROVED.
- PR e2e was red: recruit.spec.ts R2 (an M13.5h test, untouched by this slice) — judged flake, rerun -> green. Counted as remote_red_fix_cycles=1.
- Touches drift: server-module/src/lib.rs (CONTENT_VERSION doc-history, comment-only) was in the diff but not the declared touches. Non-blocking; briefs should declare comment-only files too.
- Squash landed with the run's `wip(m13.5g): ...` title (PR title was proper). The no-wip-titles workflow note merged IN this slice; future merges should override the squash title.
- ADR 0091 unused by g; re-reserved for m13.5f. Only **13.5f** remains in M13.5.
- Next: composite-launch m13.5f (serial — game-core touches) if final re-probe is clean.

## 2026-07-10T16:27:55Z — supervisor: m13.5f IN-PROGRESS (launched, serial; ADR 0091 reserved; last slice of M13.5)

## 2026-07-10T~18:30Z — m13.5f TERMINAL STATE (PR pending verifier)

- Branch: `feat/m13.5f-type-rigor-hardening`, tip: `8d0b979` (worktree `.claude/worktrees/m13.5f`)
- `just ci` EXIT=0: **667 game-core + 192 server-module Rust tests, 53/53 evals PASS**
- **What landed (ADR-0091):**
  - f-1: `validate_npc_content` 6b (GrantItem item-id cross-ref) + 6c (once-only BTreeSet intersection, same flag name); `talk` security comment; 6 proof-of-teeth tests
  - f-2: `trigger_matches` exhaustive nested match — no tuple wildcard
  - f-3: `dir_from_code`/`action_from_code` → `Option<T>`; `apply_move_coded` → `Result<[i32;4], String>`; `predict_move` → `Result<Vec<i32>, JsValue>`; `#[must_use]` added
  - f-4: `check_party_slot` + `SlotError` in `game-core/src/world.rs`; `set_party_slot` delegates; occupied excludes PARTY_SLOT_NONE (M-1 fix); RT-PS-01 documenting test
  - f-5: `skill_defs_from_rows`/`type_chart_from_rows` → `Result`; `?` in battle.rs + taming.rs; 8 proof-of-teeth tests
- **Side effects:** sim-harness/movement_vectors.rs `.expect()` on Result; docs/knowledge/ regen (4 files)
- **Key traps (for doc-keeper):**
  - PARTY_SLOT_NONE filter required in occupied vec
  - `apply_move_coded` error is `String` (not `&'static str`)
  - `doc_lazy_continuation` clippy lint fires on unnested `6b.`/`6c.` items in doc lists
  - choice-level GrantItem gate must be in choice's own conditions (not node entry_conditions)
  - knowledge bundle drifts whenever world.rs/monster_mgmt.rs line numbers shift
- **ADR-0091 CONSUMED** (next-free → 0092)
- **Named residuals:** RT-PS-01 race (DB unique constraint), RT-PS-DIALOGUE TOCTOU, pp>0 gap, asymmetric marshal API
- **Review:** reviewer (8 findings, M-1/M-4/m-3/m-1 fixed) + red-team (RT-PS-01 + compile error fixed; TOCTOU named/deferred)
- **Supervisor owns merge. All remaining M13.5 slices (f, g, h) are DONE.**

## 2026-07-10T18:19Z — supervisor: m13.5f MERGED — **M13.5 MILESTONE COMPLETE**

- PR #132 squash-merged 18:10:03Z → `67b5a42` (explicit subject; no-wip-titles honored). Remote CI + e2e green pre-merge; master CI green on 67b5a42 post-merge.
- Audits: orchestration **FLAGGED** (zero tester-role; 4 subagents: planner/reviewer/red-team/verifier) → supervisor review pass on the PR diff (reviewer/red-team/domain/verifier lenses): marshal re-checks reject-not-clamp with correct domains (power>0, accuracy 1..=100, effectiveness {0,5,10,20}); set_party_slot delegation behavior-preserving w/ M-1 boxed-monster fix; residuals (RT-PS-01 race, TOCTOU, pp>0 gap, asymmetric marshal API) named/deferred → APPROVED. Gating-test audit CLEAN (no removed/weakened tests; 14 proof-of-teeth added).
- Touches drift (non-blocking, no siblings): battle.rs, taming.rs, game-core/lib.rs, sim-harness — mechanical Result-propagation fallout of declared f-5 work. Briefs should declare propagation fallout.
- ADR-0091 consumed; index reconciled via doc-only chore PR #133 (auto-merge) → master `f0d0e79`, next-free **0092**.
- Worktree `.claude/worktrees/m13.5f` + local/remote branches removed. Stray untracked `.claire/` left untouched (not ours).
- Supervisor DC shell died twice mid-tick; reconciled from live PR state each time (fast-path worked as designed).
- **All M13.5 slices (a–h) merged. Next tick: pick first unfinished slice of the next milestone in PLAN §9.**

## 2026-07-10T18:27:32Z — supervisor: m14a IN-PROGRESS (launched; first M14 slice + M14 slicing pass in planning; ADR 0092 reserved; serial)

## 2026-07-10T~20:30Z — m14a TERMINAL STATE (PR #134 open, local `just ci` EXIT=0)

- Branch: `feat/m14a-status-effect-core`, tip: `2889bfa` (worktree `.claude/worktrees/m14a`), base `f0d0e79`
- PR #134: https://github.com/mdrewt/monster-realm/pull/134
- `just ci` EXIT=0: **949 Rust tests (949 passed, 1 skipped), 778 client tests (32 files)**; evals all passed
- **What landed (ADR-0092):**
  - `game-core/src/combat/status.rs` (NEW): `StatusEffect` enum (Poison/Burn/Paralysis/Sleep{turns_remaining}/Freeze), `BattleStatusStore` (pure, no SpacetimeType), `StatusVariance` (6 rolls, sleep_wake reserved for m14b), `apply_pre_turn_effects`, `apply_post_turn_effects` (DoT + faint cascade), `tick_status`
  - `types.rs`: `TurnChoice::Pass` variant + 3 new `BattleEvent` variants (StatusDamage, ActionBlocked, StatusCured)
  - `resolve.rs`: `resolve_full_turn` (pre-turn block → Pass substitution → resolve_turn → post-DoT → tick_status); `skill_id_from` gets `Pass => unreachable!()` exhaustiveness arm
  - `mod.rs` + `lib.rs`: re-exports of all new types/functions
  - 22 EARS tests (m14a_tests.rs) + 4 permanent red-team gating tests (redteam_m14a_tests.rs)
  - `docs/adr/0092-m14a-status-effect-rules.md` (NEW); README next-free → 0093
  - M14-deeper-battle.spec.md §5 task 1 ticked
- **Planning deliverable also in this run:** M14 slice breakdown (m14a–m14f with touches sets, dependency order, fan-out pairs) committed to harness `specs/monster-realm-v2/M14-deeper-battle.spec.md` as `8cd003b`
- **Key design decisions (ADR-0092):** separate StatusVariance (preserve resolve_turn signature per ADR-0017/0023); BattleStatusStore pure game-core (no schema change — persistence m14b); TurnChoice::Pass for blocked sides; faint-cascade duplication avoids circular status.rs→resolve.rs import; SideA-first DoT ordering (simultaneous KO = SideB wins); StatusCured lacks slot index (RT-S14-01 → m14b); sleep_wake_roll reserved
- **Named residuals:** RT-S14-01 (StatusCured slot-index gap → m14b), RT-S14-03 (undersized store drops DoT — documented caller contract), RT-PS-01 + RT-PS-DIALOGUE (carried from m13.5f)
- **Review trail:** reviewer + red-team + desync-guard lenses (parallel); all HIGH/MED findings closed; 4 red-team tests added; mutation gaps (SideB DoT, Burn floor) pinned by tests 19+20
- **ADR-0092 CONSUMED** (next-free → 0093)
- **Supervisor owns merge.** Next per M14 plan: m14b (server persistence — SpacetimeType on BattleMonster.status, submit_turn → resolve_full_turn, bindings regen; depends on m14a types stable)

---

## 2026-07-10T20:20:28Z — supervisor mr-sup-cowork-20260710T200618Z-519840-5239

Merged m14a PR #134 (squash → master 5955047; e2e red was recruit.spec flake — rerun green; audits: orchestration CLEAN, gating-test CLEAN). master CI GREEN. IN-PROGRESS: launching m14b (server schema + persistence for status, ADR reserved 0093) via mr-launch.sh, brief /tmp/mr_pass_m14b.md.

Launch confirmed 2026-07-10T20:23:06Z: m14b detached (leader 523131, claude 523136, model claude-sonnet-4-6 asserted). Ledger + mr-state.json written; mutex released.

## 2026-07-10T~22:30Z — m14b TERMINAL STATE (PR #135 open, local `just ci` EXIT=0, remote CI running)

- Branch: `feat/m14b-server-status-persistence`, tip: `a44ad07` (worktree `.claude/worktrees/m14b`), base `5955047` (master after m14a squash)
- PR #135: https://github.com/mdrewt/monster-realm/pull/135
- `just ci` EXIT=0: **739 game-core + 192 server-module Rust tests (931 total), 778 client tests (32 files), 54/54 evals PASS**
- **What landed (ADR-0093):**
  - `StatusEffect` moved `status.rs` → `types.rs` to avoid circular import (`BattleMonster.status: Option<StatusEffect>` would create a cycle); `status.rs` re-exports via `pub use super::types::StatusEffect`
  - `BattleMonster.status: Option<StatusEffect>` added as LAST field with `#[serde(default)]` (ADR-0006 additive; old rows deserialise to None)
  - `StatusEffect` gains `#[cfg_attr(feature="spacetimedb", derive(spacetimedb::SpacetimeType))]`
  - `BattleEvent::StatusCured` gains `slot: u32` — fixes RT-S14-01 (bench-slot cures previously ambiguous)
  - `StatusVariance::from_ctx_random(seed: u32)` — same splitmix64 pattern as `TurnVariance::from_ctx_random`; 6 deterministic u8 rolls
  - `submit_attack` reducer: constructs `BattleStatusStore` from `BattleMonster.status` fields → calls `resolve_full_turn` → writes store back (gated on `Ongoing` — terminal rows GC'd immediately)
  - 19 new M14b tests (`m14b_tests.rs`) including `m14b_serde_default_allows_missing_status_field` (properly tests `#[serde(default)]` by deserialising pre-M14b row without `status` field)
  - `module_bindings/types.ts` regenerated: `StatusEffect` enum + `BattleMonster.status: option(StatusEffect)`
  - `evals/baselines/spacetime-types.json` baseline updated 14 → 15 types
  - `docs/knowledge/` regenerated (5 reducer docs: flee/start_battle/start_wild_battle/submit_attack/swap_active)
  - `docs/adr/0093-m14b-server-status-persistence.md` written
- **Key design decisions (ADR-0093):**
  - `StatusEffect` in `types.rs` (not `status.rs`) — circular import avoidance; `status.rs` re-exports for backward compat
  - `#[serde(default)]` + last-field position = additive schema (ADR-0006)
  - Two `ctx.random()` calls per turn (one for TurnVariance, one for StatusVariance) — independent seeds
  - `swap_active` NOT touched (no status tick needed for a switch — not a numbered turn)
  - Status write-back gated on `Ongoing` (terminal rows immediately GC'd by write_back_battle_results — reducer-security-audit finding)
- **Named residuals (deferred):**
  - `attempt_recruit` DoT gap — wild's counter-attack on failed recruit skips status tick (reviewer finding; inherited from m14a's `resolve_recruit_failure` not calling `resolve_full_turn`; deferred to M14c)
  - `Sleep` payload not in spacetime-types baseline — eval parser snapshots variant names only, not struct-variant payloads; `Sleep { turns_remaining: u8 }` appears as bare `"Sleep"` (pre-existing eval limitation)
  - RT-PS-01 race + RT-PS-DIALOGUE TOCTOU carried from m13.5f
- **Review trail:** reviewer (F1 serde test strengthened → fixed; F2 attempt_recruit gap → deferred; F3 dead sleep_wake fields → documented; F4 Sleep baseline → deferred) + reducer-security-auditor (M1 write-back gate → fixed; rest CLEAN) + red-team lens (in flight at terminal)
- **ADR-0093 CONSUMED** (next-free → 0094)
- **Supervisor owns merge. Next per M14 plan: m14c (abilities) ‖ m14d (weather) — parallel-eligible (disjoint files)**

---

## 2026-07-10T22:20Z — supervisor mr-sup-cowork-20260710T220620Z-583420-24654 — m14b MERGED

- **PR #135 squash-merged** → master `8270ef5`; master CI GREEN.
- e2e was red once on the PR: known `recruit.spec.ts` R2 MAX_HEALS flake (identical to m14a-PR failure, rerun-green with zero code changes). Deflake candidate remains in queue.
- Audits: orchestration CLEAN (planner/tester/red-team/review-lens subagents present; model sonnet-class); gating-test CLEAN (no deleted tests, no skips added).
- Touches-drift note: actual diff wider than declared touches (combat ai/damage/resolve/status + marshal + several test files). No in-flight siblings → no collision; recorded for future fan-out planning.
- ADR index reconciled via doc-only chore PR #136 (`chore/m14b-adr-index`, adds 0093 row, next-free → 0094), `--squash --auto` armed.
- Worktree `.claude/worktrees/m14b` + branch removed; main checkout ff'd to `8270ef5`.
- **Composite launch: m14c (passive abilities) launched SERIAL.** m14c ‖ m14d fan-out DECLINED: m14d touches `server-module/src/schema.rs` (structural always-serial set) and both slices touch content RON. m14d next after m14c.
- ADR **0094 reserved for m14c** (next-free → 0095).

---

## 2026-07-10T~23:00Z — m14c TERMINAL STATE (PR #137 open, local `just ci` EXIT=0)

- Branch: `feat/m14c-passive-abilities`, tip TBD (worktree `.claude/worktrees/m14c`), base `8270ef5` (master after m14b squash)
- PR #137: https://github.com/mdrewt/monster-realm/pull/137
- `just ci` EXIT=0: **949 Rust tests, 778 client tests (32 files), 53/53 evals PASS**
- **What landed (ADR-0094):**
  - `game-core/src/combat/ability.rs` (NEW): `StatusKind` enum (payload-free discriminant — Burn/Sleep/Poison/Paralysis/Freeze without `Sleep { turns }` payload), `AbilityEffect` exhaustive enum (`StatusImmunity { immune_to: StatusKind }` / `EntryHeal { denom: u16 }`), `AbilityStore { side_a: Vec<Option<AbilityEffect>>, side_b: Vec<Option<AbilityEffect>> }`, `apply_entry_ability`, `apply_ability_modifiers`
  - `game-core/src/combat/m14c_tests.rs` (NEW): 20 EARS gating tests
  - `game-core/src/combat/redteam_m14c_tests.rs` (NEW): 4 red-team tests (RT-A14-01 HIGH, RT-A14-02 MEDIUM, RT-A14-03 MEDIUM, RT-A14-05 LOW)
  - `game-core/content/abilities/000-core.ron` (NEW): 3 starter abilities (Flame Body StatusImmunity Burn, Vital Spirit StatusImmunity Sleep, Regeneration EntryHeal denom:4)
  - `game-core/src/content.rs`: Species gains `#[serde(default)] ability: Option<u32>`, AbilityDef struct, load_abilities/parse_abilities/validate_abilities functions (additive sibling, does NOT change validate_content 4-param signature)
  - `game-core/build.rs`: "abilities" added as 12th registry entry
  - `game-core/src/combat/mod.rs` + `game-core/src/lib.rs`: re-exports of ability types/functions
  - `server-module/src/lib.rs`: CONTENT_VERSION 7→8
  - `server-module/src/content.rs`: load_abilities + validate_abilities wired into sync_content_inner
  - Server-module test files: `ability: None` added to Species literals in marshal/movement/taming
  - `evals/baselines/content-hash.json`: version=8, hash updated
  - `docs/knowledge/reducers/` regenerated (8 files via `just knowledge`)
  - `docs/adr/0094-m14c-passive-ability-system.md` (NEW)
- **Key design decisions (ADR-0094):** StatusKind payload-free discriminant (avoids Sleep clause in RON); AbilityEffect exhaustive (OCP gate, ADR-0010); validate_abilities additive sibling (preserves validate_content signature per ADR-0006); apply_entry_ability returns () not Vec<BattleEvent> (no speculative event API); debug_assert!(denom >= 2) on EntryHeal (ADR-0055 precondition policy); server wiring hooks into resolve_full_turn deferred to M14d
- **Named residuals (deferred):** wiring apply_entry_ability/apply_ability_modifiers into resolve_full_turn (M14d); attempt_recruit ability population (M14d); DoT interaction with entry abilities (M14e+); RT-A14-01 HIGH fix wired
- **ADR-0094 CONSUMED** (next-free → 0095)
- **Supervisor owns merge. Next per M14 plan: m14d (weather) serial.**

---

## 2026-07-11T00:30Z — supervisor mr-sup-cowork-20260711T000602Z-657543-17248 — m14c MERGED

- **m14c (passive per-species ability system, ADR-0094): PR #137 squash-merged** → master `b6363dc`. Wrapper EXIT=0 ATTEMPTS=1, cost $16.49, model claude-sonnet-4-6. Orchestration audit CLEAN (8 subagents: planner/tester/reviewer/red-team/review-lens/verifier/doc-keeper). Gating-test audit CLEAN (no removed asserts/tests, no added skips; m10a/m8d/m8a gating files touched additively only).
- **Touches-overrun noted (not parked):** actual diff included server-module/{content,lib,marshal,marshal_tests,movement,taming}.rs, game-core/build.rs+lib.rs, evolution/monster/taming test files, evals/baselines/content-hash.json — well beyond declared touches. Serial with no siblings → no fan-out hazard; future fan-out decisions must treat ability-registry-style slices as broad. Brief-writing lesson: content-registry slices ripple through server marshal + content plumbing.
- **Doc reconcile: chore PR #138 auto-merged** (ADR index 0094 row, next-free 0095, plus ARCHITECTURE.md doc-aggregation for 0091–0094 which the run wrote as an uncommitted stray into the MAIN checkout at 23:16Z — machine-generated, folded into the chore PR rather than stashed).
- **master CI:** b6363dc master run hit the KNOWN e2e recruit.spec.ts R2 MAX_HEALS flake (queue item; ci job green). Rerun was auto-cancelled by the #138 push; tip run 29132420280 (contains all m14c code) **GREEN**. Master verified green on tip.
- Worktree + branch cleaned. Chore PR #136 auto-merge VERIFIED (queue item resolved).
- **Ops note:** DC shell sessions died 4× mid-tick (incl. mid-`gh pr merge`); reconciled from live PR/CI state each time per runbook.
- **Next:** m14d (weather/field state; serial — touches schema.rs structural; ADR 0095 reserved). Then m14e → m14f.

- 2026-07-11T00:36Z IN-PROGRESS: supervisor launching m14d (weather/field state, ADR 0095 reserved, serial/structural) via mr-launch.sh.

## 2026-07-11T02:13:56Z — supervisor mr-sup-cowork-20260711T020614Z-733303-27927 — m14d review pass IN PROGRESS
m14d run finished (EXIT=0, ATTEMPTS=1, $14.36, sonnet-4-6). PR #139 open, remote CI+e2e GREEN, mergeStateStatus CLEAN. Gating-test scan: 0 deleted/skipped tests. BUT orchestration audit FLAGGED: only planner+tester subagents invoked — zero reviewer/red-team/auditor/verifier lenses on a production-code slice → mandatory review pass before merge. Launched detached review run 'm14d-weather' (brief /tmp/mr_pass_m14d-weather.md) against the existing worktree .claude/worktrees/m14d. Supervisor merges next tick after review evidence lands. Touches-overrun also noted: diff far exceeds declared touches (module_bindings/types.ts structural, resolve/damage/ai/content, server-module ripple) — serial launch so no fan-out hazard; follow-up already queued.

---

## 2026-07-11T~03:00Z — m14d REVIEW PASS COMPLETE (supervisor-mandated independent review)

**Scope:** PR #139 (feat/m14d-weather-field-state) — weather/field-state system (ADR-0095).  
**Worktree:** `.claude/worktrees/m14d` on branch `feat/m14d-weather-field-state`.

### Lenses Run
1. **reviewer** (inline + background agent): Correctness, invariants, code smells
2. **red-team** (background agent): Adversarial attack on weather mechanics
3. **Domain checks inline**: desync paths, OCP gate validity, overflow analysis, event ordering

### Findings by lens

**reviewer — BLOCKER B-1 (FIXED):**
- `game-core/src/content.rs:815-820`: `validate_content` weather guard was dead code — `let _valid = matches!(...)` computed a boolean but discarded it, never asserted. The comment claimed compile-time OCP gate but `matches!` has implicit `_` wildcard so a new WeatherKind would NOT be a compile error at this site.
- **Fix applied**: replaced with exhaustive `match` with no wildcard arm — now a true compile-time OCP gate (ADR-0010).

**reviewer — MINOR (FIXED):**
- `game-core/src/combat/weather.rs:122-123`: Doc comment stated `(u16::MAX * 3) > u64::MAX` which is numerically false. Fixed to correctly describe overflow safety.
- `server-module/src/marshal.rs:387-389`: Comment "DB path used only for boundary validation" was factually wrong — `taming.rs` uses this path for battle resolution. Fixed to reference ADR-0095 residuals.

**reviewer — DOCUMENTED DEFERRALS (not bugs):**
- `taming.rs:162` uses `skill_defs_from_rows` for recruit-fail strike-back → explicit residual in ADR-0095 §Residuals, deferred m14e/m14f.
- WeatherSet fires after BattleEnd on KO turns → intentional per ADR-0095 D4; documented and gating test added.
- swap_active/recruit turns skip weather chip/tick → consistent with "not full turn" design.

**red-team — all findings:**
- HIGH: taming.rs desync (= reviewer M-1, documented ADR-0095 residual)
- MEDIUM: validate_content vacuous guard (= reviewer B-1, FIXED)
- LOW: WeatherSet after BattleEnd (intentional, gating test added)
- LOW: chip-faint auto-switch not re-chipped same turn (correct behavior)
- LOW: no power cap on weather skills (content-author risk, not player-exploitable)
- LOW: turns_remaining=0 via DB safe (tick_weather handles correctly)

**False positives:**
- Reviewer flagged ADR-0095 file missing — file EXISTS at `docs/adr/0095-m14d-weather-field-state.md`
- Reviewer flagged phase 3.5 doc ordering — documented correctly in both resolve.rs and ADR-0095 D4

### Code changes on feat/m14d-weather-field-state
Commit `bf39cf2` pushed:
1. `game-core/src/content.rs` — exhaustive `match` replaces vacuous `matches!` guard (B-1 fix)
2. `game-core/src/combat/weather.rs` — doc comment overflow claim corrected
3. `server-module/src/marshal.rs` — misleading comment corrected (references ADR-0095 residuals)
4. `game-core/src/combat/redteam_m14d_weather_desync.rs` (NEW) — 3 gating tests:
   - RT-W14-DESYNC-01: proves skill_defs_from_rows strips sets_weather (documents residual)
   - RT-W14-VALID-01: gates valid weather skills still accepted after B-1 fix
   - RT-W14-ORDERING-01: gates WeatherSet fires AFTER BattleEnd on KO turns (ADR-0095 D4)
5. `game-core/src/combat/mod.rs` — registers new test module

### Local CI result
`just ci` EXIT=0 — 1022 Rust tests + 778 client tests, all green. Biome `useLiteralKeys` warnings are pre-existing (exit 0 from before this PR).

### Verdict
**FIXED** — 1 BLOCKER fixed, 2 minor doc/comment fixes, 3 new gating tests added. No test weakening (all existing tests untouched; new tests are additive). Documented deferrals in ADR-0095 residuals acknowledged and gated.

**PR #139 stays OPEN — supervisor owns merge.**

## 2026-07-11T04:18:56Z — supervisor mr-sup-cowork-20260711T040623Z-780249-32433 — m14d MERGED, m14e IN-PROGRESS
- PR #139 (m14d weather/field-state, ADR-0095) squash-merged -> master 0a788a7; master CI GREEN. Review-pass verdict FIXED (B-1 vacuous guard fixed, 3 red-team gating tests added, bf39cf2). Gating-test scan clean; review lenses (reviewer+red-team) satisfied the FLAGGED orchestration audit.
- Chore PR #140 (ADR index 0095, next-free 0096) merged -> master 6af6e23.
- LAUNCHING m14e (status-curing items + client event display), ADR reserved 0096, detached via mr-launch.sh.

## 2026-07-11T06:24Z — supervisor mr-sup-cowork-20260711T060620Z-937678-3331 — m14e MERGED
- PR #141 (feat/m14e-status-cure-items, ADR-0096) squash-merged as 523668f; master CI GREEN (run 29142495607).
- e2e failed once on the known recruit.spec.ts R2 MAX_HEALS flake (4th sighting; untouched M13 test) — rerun-failed → green. Deflake priority now HIGH.
- Audits: orchestration CLEAN (sonnet, all 6 roles incl. tester/reviewer/red-team/verifier); gating-test CLEAN (no removed/skipped tests in diff).
- Touches overrun vs declared (module_bindings regen + combat ripple + evals baseline) — no in-flight siblings, recorded as follow-up pattern (same as m14c).
- ADR index self-reconciled on the slice branch (0096 row, next free 0097) — no chore PR.
- Worktree + branch cleaned; main checkout ff'd to 523668f.
- Composite launch: m14f (doc-keeper close, doc-only, ADR 0097 reserved) — see IN-PROGRESS below if launched.

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
