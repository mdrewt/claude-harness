# Why the harness produced the bloat — retrospective and diagnosis

Extracted from the approved revision-program plan (2026-09-28). Part 1 classifies what the
monster-realm de-bloat (PRs #520–#526) fixed; Part 2 traces each class to the harness artifact
that caused it. Citations were verified against the live tree on 2026-09-28.

## Part 1 — Issue classes the de-bloat resolved (evidence: `docs/debloat/ledger.ndjson`, 1,122 rows; REPORT.md)

| # | Class | Scale (measured) |
|---|---|---|
| I1 | **Meta-gates / gate-of-gates** — checks whose subject is another check or CI plumbing (`ci-gate-wiring`, `gate-teeth`, `run-completeness`, `mutate-core-recipe-integrity`…) | ~15 evals + the "nightly decay ratchet"; all DELETE-none-needed |
| I2 | **Source-text assertion instead of behavior** — regex/`readFileSync`/`include_str!` over production source to "prove" invariants | `privacy_tests.rs` 30k lines; ~54% of server tests; 9 `main.*.test.ts` scan suites (21k); ~10 regex privacy evals |
| I3 | **Self-referential pinning web** — byte-pinned justfile recipes, line-pinned AGENTS.md, EOF-placement to protect sibling line pins, comments written for eval parsers | evals 99→15; 601 ledger DELETEs |
| I4 | **Armor arms race** — anti-self-match armor + red-team "residual" closure loop breeding gates that fight their own CI | 2,108 `concat!` needle-breakers; decoy defenses; bite-proof fixtures; 308 residual IDs harness-side |
| I5 | **Ratchets & count floors** — one-directional numbers (96% coverage, i18n SINK_FLOOR, "exactly 9"/"floor 62" parsers) incentivizing assertion stuffing | coverage demoted to report-only; mutate-server cap 324→34 after honest triage |
| I6 | **Vacuous green CI masking real bugs** — huge checking volume, yet 9 player/production bugs shipped (world-readable inventory; doubly-unreachable guest-claim). Test drivers bypassed the player path: account-e2e called the reducer directly while the real browser flow was broken twice over | 22 `kind:bug` ledger rows; e2e oracle gaps (no evolution/battle/accounts smokes) |
| I7 | **Process vocabulary in the artifact** — ADR-NNNN/rb-NN/milestone tags in production comments, identifiers, strings; reviewer-argument comments | ~25–40k comment lines stripped; comment:code >0.30 files |
| I8 | **Constant duplication + text-parity guards** instead of SSOT boundary exports | trade cap, TALK_RANGE, evolution-eligibility TS port → wasm exports + executable parity |
| I9 | **Over-engineering** — single-use seams, 12× hand-copied dual-write blocks, wrapper layers | 12 SIMP ledger rows; `update_monster_synced` helper |
| I10 | **Append-only doc sprawl** — 240 ADRs (mostly micro-records), 647KB ARCHITECTURE milestone log, 60+ slice plans, machine-only knowledge bundle/digest | docs 514 files → 12; docs-md −93% |
| I11 | **Doc falsehoods persisting** — structure-gated docs (headers/backlinks/counts) whose *claims* were never re-verified | "no accounts yet"; stale "battle table public" digest line |
| I12 | **Test organization by process, not feature** — 36 milestone/rb-named test files | reorganized to feature files, 395 tests parity-exact |

## Part 2 — Root-cause diagnosis (issue class → harness artifact, verified citations)

| Cause | Harness artifact(s) | Produces |
|---|---|---|
| C1. **Proof-of-teeth mandated per gate, recursively** — "a meta-test asserting the gate fails on it"; new eval without a teeth fixture fails review | `specs/monster-realm-v2/adr/0010`; `milestone-loop-prompt.md:82,169-190`; `build-loop-prompt.md:40-41,57,68`; `.claude/agents/tester.md:49-52` | I1, I4 |
| C2. **The 2026-09-01 correction never propagated.** The only real anti-bloat rule (no new scanner evals; teeth once, non-recursively; "default to NOT adding a check") lives solely in `memory/projects/mr-supervisor-prompt-native.md:30-92` — while standards, agents, brief, and build-loop still mandate the old doctrine; it also cites the now-deleted `$PROJ/docs/adr/0224` | doctrine contradiction across layers | all of I1–I5 persisting |
| C3. **No definition of a good eval.** `standards/evals.md` (19 lines) never says an eval must execute the product; "strengthen evals first" (WORKSPACE-PLAN §6) + a bare `*.eval.mjs` template loader made source-scanning the cheapest compliant artifact | `standards/evals.md`; `templates/_base/evals/run.mjs`; `WORKSPACE-PLAN.md:154,167` | I2, I3 |
| C4. **Deletion is structurally illegal.** Verifier: dropped test/fixture or loosened expectation = "WEAKENING → FAIL"; ambiguity = FAIL. `/simplify` must "still clear the eval gate". The anti-bloat counter-role could never subtract | `.claude/agents/verifier.md:16-29`; `commands/simplify.md`; `principles.md:68` | I3, I4, I5 accumulation |
| C5. **ADR-per-slice minting.** Pre-assigned ADR number in every brief (`adr_next_free`=275); "record every non-obvious 'why' as an ADR"; ADR required for "any decision a future maintainer would ask why" | `mr-brief-template.md:15,19`; `build-loop-prompt.md:9,46,72`; `standards/adr-process.md:9-13`; supervisor prompt §6 | I10 |
| C6. **Append-only doc DoD.** Every slice must update ARCHITECTURE.md ("minimal, section-local" = append-only in practice), memory, changelog; doc gates check structure, never truth | `mr-brief-template.md:17,25`; `.claude/agents/doc-keeper.md:20-49`; `hooks/check-docs-updated.mjs` | I10, I11 |
| C7. **Residual perpetual-motion machine.** Every DEFER → residual → aging promotion (3d/14d) that *preempts roadmap work* → rb-NN slice in a "standing, never closed" backlog spec → new DEFERs; weekly multi-lens review spawns whole residual milestones (21 generations). rb-2..rb-32 measured 100% self-referential | supervisor prompt gate 3 (`:148`); `mr-gates` (t1/t2 aging); `M-residual-backlog.spec.md:3`; `mr-weekly-review-prompt.md:139-250` | I4, plus 49.5% of slice spend in remediation |
| C8. **Ratchet doctrine.** "Ratchets once backfilled"; coverage/mutation thresholds in CI standard; gate-of-gates milestone ("guarded from birth") | `adr-process.md:62-63`; `standards/ci-cd.md:5-13`; `testing-tdd.md:21-28`; M13.5/M24 specs | I5 |
| C9. **No boundary between process metadata and artifact.** Criterion IDs seeded into ledgers; tester names "which wrong implementation it kills"; per-slice ADR numbers; no rule keeps slice/ADR vocabulary out of source | `mr-brief-template.md:21`; `tester.md:52`; absence of any rule | I7 |
| C10. **mr-gates lint arms race.** "a static grep proves nothing and is rejected" → text scans got wrapped in `node` scripts to satisfy the lint | `mr-brief-template.md:21`; `mr-gates` lint (~:432-519) | I2 via laundering |
| C11. **Stale world-model.** PLAN.md §9 (977 lines) + M25 spec built on deleted eval architecture; `mr-state.json` resource_locations → `$PROJ/docs/adr/`; 110/179 open residual rows name deleted surfaces; `just adr-digest` (189 refs), `just knowledge` (132), `just changelog` (50) — recipes deleted; `scripts/workspace-review.mjs` flags projects missing `docs/adr/` | specs/, mr-state.json, tools | broken pipeline on re-enable |
| C12. **The harness has the disease too.** `scripts/tests/invariants.test.mjs` pins spec prose char-for-char (RB27_SECTION_FROZEN); 516-line harness ADR; `memory/projects/` = 1,381 files/200k lines of run exhaust; 42KB supervisor prompt with inline war stories; ~15k lines of mr-* Python; repo git identity is a leaked test fixture (`lp04 fixture <lp04@fixture.invalid>`, 411 commits); `main` ahead of origin | harness repo itself | credibility + context rot for every future agent |

**What already worked (keep and build on):** the budget governor, human-activity standdowns, rate-limit parks, `mr-ask-drew` decision issues, fan-out safety with `mr-disjoint`, event-driven ticks, `mr-hold` provenance, `guard-bash` hook, the 2026-09-01 directive's *content*, test-ownership split, worktree isolation, `/simplify` + reviewer roles (once unshackled), and the spec-driven EARS model itself.

---

