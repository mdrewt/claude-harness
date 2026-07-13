---

## 2026-07-13 — m14.5g TERMINAL STATE — PR #157 OPEN, local `just ci` EXIT=0, remote CI running

**Branch:** `feat/m14.5g-ledger-type-rigor`, tip `51cddf3`, **PR:** https://github.com/mdrewt/monster-realm/pull/157
**ADR:** ADR-0104 reserved — **UNUSED** (all changes are in-contract hardening; no new pattern; next-free stays 0104)
**Worktree:** `.claude/worktrees/m14.5g` (supervisor cleans up post-merge). LOW complexity slice.

**What landed (8 ledger + 4 type-rigor + 1 OKF stamp + simplify/review followup):**
- ADR collision note corrected in `docs/adr/README.md` and `AGENTS.md`: harness 0055↔project 0056, 0056↔0057, 0057↔0080
- Dead link `0090-client-ux-correctness.md` → `0090-adaptive-interp-delay.md` in README
- Node pin reference corrected: `AGENTS.md:6` now says `client/package.json engines ≥24.13.1 <25`
- ADR-0091 SpacetimeDB version cite `1.12.0` → `2.6.0` (2 occurrences)
- CHANGELOG regenerated via `just changelog` (M14 ADRs 0092-0097 now present)
- `specs/monster-realm-v2/PLAN.md:3` status updated: Phase A+B complete, M14.5 residuals building
- `M13.5-seventh-review-residuals.spec.md:102` 13.5f checkbox ticked — DONE (PR #132, ADR-0091)
- `M14.5-eighth-review-residuals.spec.md` 14.5g checkbox ticked
- `evals/battle-lifecycle-gc.eval.mjs` stale "RED today" header removed
- `StatusKind::matches` wildcard `_` → exhaustive false OR-pattern (compile-error gate, ADR-0010)
- `TypeChart::classify` silent `_ => Neutral` → `unreachable!()` + proof-of-teeth tests
- `f1_damage_chain_order_matters` wired to real `calc_damage` call
- `compute_evolves_to` drops fake MonsterInstance; takes `(level: u8, bond: u8)` directly (8 call sites updated across evolution.rs/fuse, battle.rs, content.rs, raising.rs, content_tests.rs, content_cache_tests.rs, evolution_tests.rs)
- OKF `gitDate()` UTC-normalizes via `%cI` + `new Date(iso).toISOString()` (post-midnight drift fix)
- EARS-21 truth-table test in `m14c_tests.rs` (pins all 5 StatusKind true arms)
- `marshal.rs` stale "silently maps to Neutral" comment updated to reflect unreachable! panic

**Gates:** local full `just ci` EXIT=0 (846 game-core, 200 server-module, 833 client tests, 54 evals PASS). Reviewer MAJOR (fuse temp Monster) fixed; red-team all CLEARED or addressed.

**Harness changes committed separately:** PLAN.md, M13.5 spec, M14.5 spec (committed to claude-harness main, not part of PR #157).

**Supervisor owns squash-merge** (remote CI running on `51cddf3` at handoff time). ADR-0104 goes unused — can be reclaimed for the next slice requiring a new ADR.

---

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


## 2026-07-13T06:16:05Z — supervisor tick mr-sup-cowork-20260713T060632Z-374696-15801
- Fan-out pair finished: m14.5d (.done EXIT=0 ATTEMPTS=3) and m14.5e (.done EXIT=0 ATTEMPTS=1); no live pids.
- MERGED m14.5e: PR #153 squash -> master d090fcb, CI GREEN post-merge. Audits: orchestration CLEAN (13 Agent invocations incl. tester/reviewer/red-team/verifier; model claude-fable-5), gating-test CLEAN (no removed/skipped tests). Cost $41.53.
- Touches overrun on m14.5e: docs/knowledge/reducers/*.md regen undeclared but disjoint from sibling — merged; brief-tightening follow-up already queued.
- ADR-0089 amended in-slice; no new ADR, 0102 reserved-unused, next_free stays 103. No index chore PR needed for e.
- m14.5e worktree+branch removed. m14.5d worktree/branch/lock kept (open PR #154, CLEAN).
- NEXT TICK: merge m14.5d #154 (update-branch if behind after d090fcb), audits pre-merge, then chore ADR-index PR for 0101.
- Note: supervisor DC shell died mid-CI-poll (session churn); new shell reconciled from live state under same run_id. Merges serial: one merge this tick by design.

## 2026-07-13T08:20:09Z — supervisor tick mr-sup-cowork-20260713T080612Z-375835-29916 — m14.5d MERGED
- PR #154 (feat/m14.5d-client-battle-ux) squash-merged -> dfc0e1f; checks green pre-merge (ci+e2e).
- Audits: orchestration CLEAN (13 Agent invocations; tester/reviewer/red-team/verifier/planner/doc-keeper all present; model claude-fable-5). Gating-test CLEAN: 6 tests rewritten stronger between RED and tip (data-testid selectors; unknown-outcome variants now assert null-VM per new spec), zero dropped, no skip/only/ignore.
- ADR-index chore PR #155 merged -> 3101508 (adds 0101 row, next-free -> 0103; 0102 reserved by m14.5e but unused — burned to match allocator).
- Master CI: dfc0e1f run cancelled by concurrency-group; tip 3101508 GREEN.
- Cleanup: m14.5d worktree + local branch removed; main checkout ff-only to origin/master.
- Note: touches-overrun docs/m14.5d-plan.md (doc-only). Cost ~$43.95 across 3 wrapper attempts.
- Next: m14.5f (republish proof + randomized convergence) — structural/serial (evals/run.mjs); composite launch this tick if final re-probe clean.

## 2026-07-13T08:24:41Z — supervisor tick mr-sup-cowork-20260713T080612Z-375835-29916 — m14.5f IN-PROGRESS
Launching m14.5f (republish proof + randomized convergence) serial, ADR reserved 0103, brief /tmp/mr_pass_m14.5f.md. Detached via mr-launch.sh.

## 2026-07-13 — m14.5f TERMINAL STATE — PR #156 OPEN, local `just ci` EXIT=0, remote CI running

**Branch:** `feat/m14.5f-gates-convergence`, tip `c998d22`, **PR:** https://github.com/mdrewt/monster-realm/pull/156
**ADR:** `docs/adr/0103-m14.5f-gates-convergence.md` (ADR-0103 CONSUMED; **ADR next-free → 0104**)
**Worktree:** `.claude/worktrees/m14.5f` (supervisor cleans up post-merge). Disjoint from all sibling slices (evals/sim-harness only).

**What landed (EARS 14.5f-1..2):**
- **14.5f-1 (BSATN compat — option b):** `evals/bsatn-compat-smoke.eval.mjs` — 4 exported pure predicates, 9 proof-of-teeth. Documents FINDING: `#[serde(default)]` covers serde/RON path only; `BattleMonster`/`BattleState` persist via `SpacetimeType`/BSATN (position-based codec, no missing-field defaults); SpacetimeDB engine handles additive schema on publish. Option (a) — live pre-M14b smoke — infeasible: spacetime 2.6.0 CLI `spacetime build` has no `--features` flag; `dev_reducers` not passable. `hasSerdeDefaultOnField` extracts struct body (opening `{` to first `\n}`), checks exact 2-line co-location pattern. No `new RegExp()` (detect-non-literal-regexp Semgrep rule).
- **14.5f-2 (convergence net):** `ServerWorld.SimChar` gains `battle_locked: bool`; `lock_battle`/`unlock_battle`; `tick_zone` battle-guard (drain skipped, queue intact, ActionState→Idle); mirrors `movement.rs:207-220`. 4 new public lib.rs functions: `random_scenario` (tick_seed only, all 5 variants, `is_multiple_of(11)` burst, both-clients guarantee), `warp_scenario_under_link` (SeqCanonical forward vs reversed, non-vacuity guard), `apply_stream_with_battle_lock`, `battle_lock_scenario`. Binary emits 9 JSON fields. `convergencePasses` checks 7 criteria; teeth E/F/G added.

**Clippy traps hit:** `r % 11 == 0` → `r.is_multiple_of(11)` (Rust 1.96+); `for (&k, _) in &map` → `for &k in map.keys()`; `0x14_5F_0000_CAFE` → `0x145F_0000_CAFE` (unusual byte groupings); `//! last-line` after a list needs blank `//!` line (doc_lazy_continuation). Worktree needs `npm install` in `client/` (node_modules not shared across worktrees).

**Gates:** local full `just ci` EXIT=0: 37/37 sim-harness tests (28 existing + 9 new: RS-1/RS-2/RS-2b/RS-3/WL-1/WL-2/BL-A/BL-B + battle-lock world tests), 833 client tests, 0 eval failures; `eval PASS: bsatn-compat-smoke` + `eval PASS: netcode-convergence` (both carry extended detail). Remote CI running at handoff.

**Orchestration record:** planner → reviewer (inline) → RED tests (tester commit 9203564) → GREEN impl (specialist) → clippy fix pass → doc-keeper (ADR-0103, README →0104, memory card, spec §5 14.5f ticked). Multi-lens impl review agent (reviewer) was dispatched in parallel with `just ci` second run — result pending at handoff.

**Supervisor owns squash-merge.** Next per spec §6: 14.5g (ledger reconciliation + type-rigor micro-fixes).

## 2026-07-13T10:16Z — mr-sup-cowork-20260713T100648Z-407585-2527 (supervisor tick)
- **m14.5f MERGED**: PR #156 (feat/m14.5f-gates-convergence) squash-merged → master `fae0479`. CI+e2e green pre-merge, master CI green post-merge.
- Audits: orchestration CLEAN (tester + review-lens + planner subagents; model claude-sonnet-4-6, cost $12.39, 1 attempt); gating-test CLEAN (RED checkpoint 9203564 intact, no test deletions/skips).
- ADR-0103 + index updated in-branch by the slice (serial run → no chore PR needed). Allocator remains 104.
- Worktree `.claude/worktrees/m14.5f` and local branch removed; remote branch deleted by gh. Main checkout ff'd to fae0479. Pre-existing stashes and untracked strays (`.claire/`, `docs/memory-cards/`) untouched.
- Note: supervisor DC shell died mid CI-poll; recovered in a new shell under same run_id, lock held throughout.
- Next: m14.5g (LOW ledger/docs/type-rigor, serial doc-heavy) — fold in okf-export updated-stamp drift-trap FIX per queue.

## 2026-07-13T10:27Z — mr-sup-cowork-20260713T100648Z-407585-2527 (supervisor tick, cont.)
- IN-PROGRESS: launching m14.5g (LOW ledger/docs/type-rigor reconciliation + okf-export stamp-drift fix folded in) serial, ADR 0104 reserved (may go unused). Brief /tmp/mr_pass_m14.5g.md.
- m14.5g LAUNCHED: leader 409483, detached (PID==SESS), model claude-sonnet-4-6 asserted, rate-limit events flowing status=allowed. Supervisor releasing mutex.
