# m14.5e progress memo — ADR-0089 hot-path caching (cached_skills/cached_items)

Status: TERMINAL — PR #153 OPEN (https://github.com/mdrewt/monster-realm/pull/153), local `just ci` EXIT=0, remote CI running. Supervisor owns merge. Nothing left for a resume pass; see handoff entry 2026-07-13 m14.5e TERMINAL STATE.
Branch: `feat/m14.5e-content-cache-skills-items` (worktree `.claude/worktrees/m14.5e`, base origin/master `89f5f80`)
Sibling in flight: m14.5d (client-only, disjoint path-set) — do not touch client/**.

## DONE
- Scope verified: 4 hot-path call sites (spec said 3, written pre-m14.5a; taming.rs:153 added by 14.5a-3 which anticipates the 14.5e cached accessor): battle.rs:528 submit_attack, battle.rs:662 swap_active, battle.rs:808 use_battle_item (items), taming.rs:153 attempt_recruit.
- Verified: no evals pattern-match load_skills/load_items/content_cache (no eval-trap); SkillDef/ItemDef derive PartialEq+Eq (direct assert_eq! transparency tests); marshal.rs:391-392/417-418 comments falsely claim load_skills() is "the content cache" — fix in-slice.
- Master CI green at 89f5f80. Worktree created. Graph index fresh (`ready`).
- Planner output (full plan): 2 statics + 2 accessors in content_cache.rs (SKILLS/ITEMS, same LazyLock<Result<Vec<T>,String>> pattern); 4 call-site switches (&'static Vec, drop `&` at downstream args, deref coercion to &[T]); comment fixes battle.rs:526-527 + 661, taming.rs:151-152, marshal.rs:391-392/417-418; ADR-0089 amended IN PLACE (4 context rows + call-site list + amendment note; NO new ADR number); 5 gating tests in content_cache_tests.rs (2× transparency assert_eq!, 2× std::ptr::eq identity, 1× pick_best_skill cached-vs-loaded parity), red-first via compile failure (13.5d precedent); `just knowledge` regen LAST then single full `just ci`.
- Anti-patterns named: no game-core caches, no owned-Vec re-wrap, no OnceLock::get_or_try_init (unstable), don't touch content.rs validate_content, don't spend ADR 0101/0102.

- Plan review DONE: reviewer APPROVE-WITH-CHANGES (all pass-sites enumerated: 537/584/708/197; parity test DROPPED as redundant); red-team 2 MEDIUM (source-guard test mandated — assertion-RED today; use_battle_item 'content error' map_err wrapper must be preserved + pinned) + residual: load_abilities() same uncached anti-pattern, note in ADR amendment, OUT of scope.
- Plan checkpoint committed (`5f695f4`, --allow-empty, plan in message) + branch pushed.
- Final test set: 4 accessor tests (compile-RED) + 1 source-guard (assertion-RED, pins wrapper). Tester dispatched.

- Red tests written + committed (`9ba5603`), compile-RED verified (6× E0425). Test review (reviewer + red-team on the guard, empirical probe) → strengthenings applied by tester: module-qualified needles `content_cache::cached_*`, two-part use_battle_item pin (`cached_items().map_err` + `content error`), doc fixes. Re-verified RED, committed `dc02624`, pushed.
- Implementer dispatched (general-purpose/sonnet): step 1 accessors-only commit w/ source-guard assertion-RED evidence; step 2 switch 4 call sites (qualified `crate::content_cache::cached_*` form; keep `cached_items().map_err` contiguous one line); step 3 marshal.rs comment fixes; step 4 targeted gate (fmt/clippy/test -p monster-realm-module + game-core untouched check); step 5 push.

- Implementer DONE: RED-evidence commit `0f984b9` (accessors only, source-guard assertion-red), green `b257ce9` (4 call sites switched, qualified form, wrapper kept), doc-lint cleanup `c6f4494` (tester fixed indentation, allow removed). 200/200 module tests.
- Impl review DONE (4 lenses parallel + /simplify inline): reviewer APPROVE-WITH-CHANGES (abilities gap → PARKed w/ comments; phrasing fix applied); red-team no exploitable findings (wasm32 clippy clean, transparency upheld); desync-guard CLEAN ×5; reducer-security CLEAN ×4. Fold commit `3d918d2`.
- doc-keeper DONE: ADR-0089 amended in place (4 context rows, six statics, M14.5e amendment note incl. load_abilities residual at 5 sites); memory card `memory/projects/monster-realm-m14.5e.md` (PR #TBD placeholder). NO new ADR number (next-free 0101).
- INCIDENT fixed in-slice: orphan `/*` in test-file doc comment blinded the shared schema parser (evals/battle-schema-snapshot.eval.mjs stripRustComments naive regex) → okf-export saw 0 tables. Tester reworded to same-line pairs; knowledge regen + knowledge-check green (25 tables/28 reducers). Commit `561836d`. **Follow-up queued: harden the eval's comment-stripper (evals/** outside touches).**
- Consolidated graph memo seeded via manage_adr (was absent).

- Verifier PASS: full `just ci` EXIT=0 (1080 Rust / 53 evals / 778 client); integrity clean; proof-of-teeth bite re-confirmed by live revert.
- PR #153 opened; memory card + MEMORY.md row + spec §5 tick (14.5e) + handoff terminal entry all written.

## REMAINING
- None (terminal). Supervisor: poll remote CI on 561836d → squash-merge PR #153.

## BLOCKERS
- None.

## Exact next step
Collect reviewer/red-team plan verdicts; fold changes; commit plan checkpoint; dispatch tester.

## Notes for resume
- Cargo pkg = `monster-realm-module`. Knowledge regen touches docs/knowledge/** (accepted mechanical overrun, m14.5a precedent — record in handoff). Day-stamp drift trap: if merge slips past midnight UTC after `just knowledge`, master reds (known, fix rides next doc/infra slice — note in PR).
- content.rs:46/48 (validate_content) + test code deliberately keep direct load_*().
