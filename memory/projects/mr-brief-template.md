Build exactly ONE mergeable Monster Realm v2 slice — `<SLICE>` (<TARGET_DESC>) — then stop. Follow `specs/monster-realm-v2/build-loop-prompt.md` (procedure, lenses, invariants), the project `AGENTS.md`, and `~/.claude/harness/standards/` (`testing-tdd.md` is the verification SSOT — not restated here). Right-size: if planning shows the slice is large, ship the smallest coherent increment and DEFER the rest.

**Scope:** your diff ⊆ the declared `touches:` — <TOUCHES> — plus sibling test files of declared code files, plus a `docs/DECISIONS.md` entry ONLY when `standards/decisions.md`'s bar is met (most slices: none — but a spec that names `docs/DECISIONS.md` in `touches:` mandates its edits; the spec wins). List every file beyond the literal declared set under a `touches-delta:` PR-body heading. A file outside that set that the task REQUIRES is a hidden dependency: stop, record it in the handoff, let the supervisor re-serialize.
**Boy Scout (within `touches:` only):** bounded in-file cleanups (file-local names, dead code, comment accuracy), attributed under `boyscout-delta:` (`file:lines — why`); same review as everything else.
Cap ~40 lines / ≤3 hunks; excess becomes a follow-up flag, never a blocker. Gating tests and interface-freeze slices are exempt from cleanup.
**If `master` CI is red, fix/revert it to green instead and stop** — this overrides scope and Boy Scout.

**Facts (skip the lookup churn):** the spec corpus is `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/` — specs live in the harness repo, never under the project. `ADR-NNNN` tokens in code comments are historical; live decisions are `docs/DECISIONS.md` only (`docs/adr/` does not exist — never search for it). Scratch/PoC files go in a `mktemp -d` sandbox: recursive deletes inside the repo are guard-blocked by design.

**Worktree:** resume a parked worktree/branch named in the handoff; else `git worktree add` a fresh one at `<WT_ROOT>/<SLICE>` from the latest `origin/<BASE_BRANCH>`, leaving the main checkout on that branch. NEVER run mutating git (`stash`, `checkout`, `commit`, `reset`, `clean`, …) against the main checkout — read-only commands only there.

<RESUME_BLOCK>

<TIER_BLOCK><REPO_BLOCK>

**Checkpoint + stop flags:** commit and immediately `git push` a `wip:` checkpoint at every phase boundary (after the plan, after tests, after each green increment, before long waits). Between phases and while waiting, check `/tmp/mr_stop_<SLICE>` and `/tmp/mr_stop_all`: if either exists, finish the current atomic step, commit + push `wip(<SLICE>): checkpoint — rate-limit stop`, record the exact resume point via `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-record handoff --title "<SLICE> parked" --body "..."` (never edit the handoff file directly), and exit cleanly.

**Test-first, gated:** run the build-loop per-slice procedure; a `tester` (never the implementer) writes the gating tests from the EARS criteria (the orchestrator runs them to prove each fails — the tester's Bash is static-only), the implementer never edits them, and every non-doc slice needs a tester invocation (the supervisor audits it).<SKILLS_BLOCK>

**Acceptance ledger** `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/gates/<SLICE>.gates.md` (seeded by the supervisor from the spec; you do not choose or delete criteria): in the PLAN phase give each gate a `CHECK:` that is a real test-runner invocation of named in-repo tests or an `mr-*` tool, plus an `EXPECT:` that only matches on success; run `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-gates check --slice <SLICE>` after each green increment (never flip a box by hand — the supervisor re-executes every CHECK).
`DEFER: <gate-id> -> <slice id | backlog | wontfix> [category/SEVERITY] — <reason>` is the only other legal exit; deferring more than half is a sizing failure.
Put `mr-gates render --slice <SLICE> --format pr` output in the PR body.

**Definition of done (the authority):** this slice's gate (see REPO above) green, honestly, per `testing-tdd.md` · review lenses closed · a `docs/DECISIONS.md` entry only when the bar is met · spec reflects reality. **Budget is bounded by the weekly plan allowance — prefer lenses that catch distinct defect classes over redundant re-runs; never trade a review lens for cost (D3).**

**Merge is supervisor-owned:** get this slice's gate green locally, open the PR on `<PR_REPO>`, then STOP. `gh pr merge` is FORBIDDEN to you. After ~4–5 red→fix cycles without local green, PARK (commit + push, leave the PR open, document the blocker).

**Valid stopping points (exhaustive):** (1) PR open + local gate green + every acceptance gate met with evidence or DEFERred; (2) a stop-flag park (checkpoint pushed, handoff updated); (3) a PARK after the bounded fix cycles (progress pushed, blocker in the handoff). On any park, write `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-gates render --slice <SLICE> --format park` to `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-<SLICE>-progress.md`. A mid-slice progress summary is a failure, not a stop — keep working.

End with: slice · merged|parked|blocked|stopped · PR URL · CI · what changed · decisions (usually none) · risks.

**Foreground-only execution:** run every subagent, build, and test in the foreground of your turn; never end a turn with work in flight. For long waits, poll within the turn or checkpoint and exit at a valid stopping point.

The PR description MUST include `Items: <feedback-ledger ids, or none>`.

**BUDGET: $<CAP_USD> for this slice — a sizing TARGET; self-limit to it.** Before every subagent spawn and new top-level task check: `/tmp/mr_warn_<SLICE>` = converge on finishing, no new scope or fan-outs; `/tmp/mr_stop_<SLICE>` = spawn nothing, commit + push WIP, write the handoff, exit. Blowing the cap parks the slice (sizing failure).
