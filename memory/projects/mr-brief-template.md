Build exactly ONE mergeable Monster Realm v2 slice — `<SLICE>` (<TARGET_DESC>) — then stop. Follow `specs/monster-realm-v2/build-loop-prompt.md`, the project `AGENTS.md`, and `~/.claude/harness/standards/` (`testing-tdd.md` is the verification SSOT). Right-size: if planning shows the slice is large, ship the smallest coherent increment and DEFER the rest.

**Scope:** your diff ⊆ `touches:` — <TOUCHES> — plus sibling tests of declared code files and a `docs/DECISIONS.md` entry ONLY at `standards/decisions.md`'s bar (mandatory if `touches:` names it). List extras under PR-body `touches-delta:`. Need another file (proved by probe, red test, compile error or named pin; any stage; never insurance)? Unless your spec forbids widening: `$MEM/mr-touches widen --slice <SLICE> --why "<proof>" <path>…`; REFUSED = hidden dependency: stop + handoff note.
**Boy Scout (within `touches:` only):** bounded in-file cleanups (file-local names, dead code, comment accuracy), ≤ ~40 lines / 3 hunks, attributed under `boyscout-delta:` (`file:lines — why`); excess is a follow-up flag, never a blocker; no cleanup in gating tests or interface-freeze slices.
**`type: refactor` slice:** `standards/spec-driven.md` §Refactor slices binds (PR title `refactor(<scope>): <SLICE> — …`; `moved-tests:` rows; whole or parked, no DEFER, no `mr-touches`); the Boy Scout cap never limits the declared move.
**Only a `ci-fix-*` slice fixes/reverts a red `master`** (over scope and Boy Scout); others keep building.

**Facts:** the spec corpus is `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/`. Decisions live in `docs/DECISIONS.md` only; an `ADR-NNNN` in a comment names nothing. `$MEM` = `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects`. `mr-*` flags: each tool's header comment (no `--help`). Scratch/PoC files go in a `mktemp -d` sandbox: recursive deletes are guard-blocked in EVERY spelling — leave it, name it in the report, never retry.

**Worktree:** resume a parked worktree/branch named in the handoff; else `git worktree add` a fresh one at `<WT_ROOT>/<SLICE>` from the latest `origin/<BASE_BRANCH>`, leaving the main checkout on that branch. NEVER run mutating git (`stash`, `checkout`, `commit`, `reset`, `clean`, …) against the main checkout. Cwd resets between tool calls: run repo commands and `mr-gates check` as `cd <WT_ROOT>/<SLICE> && …`; `git worktree add` runs from the main checkout.

<RESUME_BLOCK>

<TIER_BLOCK><REPO_BLOCK>

**Checkpoint + stop flags:** commit and immediately `git push` a `wip:` checkpoint at every phase boundary (after the plan, after tests, after each green increment, before long waits). Between phases and while waiting, check `/tmp/mr_stop_<SLICE>` and `/tmp/mr_stop_all`: if either exists, finish the current atomic step, commit + push `wip(<SLICE>): checkpoint — rate-limit stop`, record the exact resume point via `$MEM/mr-record handoff --title "<SLICE> parked" --body "..."` (never edit the handoff file directly), and exit cleanly.

**Test-first, gated:** run the build-loop per-slice procedure; a `tester` (never the implementer) writes the gating tests from the EARS criteria (the orchestrator runs them to prove each fails — the tester's Bash is static-only), the implementer never edits them, and every non-doc slice needs a tester invocation (`type: design`: none).<SKILLS_BLOCK>

**Acceptance ledger** `$MEM/gates/<SLICE>.gates.md` (seeded by the supervisor from the spec; you do not choose or delete criteria): in the PLAN phase give each gate a `CHECK:` that is a real test-runner invocation of named in-repo tests or an `mr-*` tool, plus an `EXPECT:` that only matches on success; run `$MEM/mr-gates check --slice <SLICE>` after each green increment (never flip a box by hand — the supervisor re-executes every CHECK).
`DEFER: <gate-id> -> <slice id | backlog | wontfix> [category/SEVERITY] — <reason>` is the only other legal exit; deferring more than half is a sizing failure.
Put `mr-gates render --slice <SLICE> --format pr` output in the PR body.

**Definition of done:** this slice's gate (REPO above) green, honestly, per `testing-tdd.md` · review lenses closed · comments/docs you add or touch state current behaviour, never history (once committed, `$MEM/mr-comment-scan --repo <WT_ROOT>/<SLICE>`: CLEAN or each finding answered under PR-body `comment-scan:`) · spec gaps/follow-ups: `$MEM/mr-gates notes add`, never a main-checkout edit. **Budget: the weekly plan allowance — prefer lenses catching distinct defect classes over re-runs; never trade a lens for cost.**

**Merge is supervisor-owned:** get this slice's gate green locally, open the PR on `<PR_REPO>`, then STOP. `gh pr merge` is FORBIDDEN to you. After ~4–5 red→fix cycles without local green, PARK (commit + push, leave the PR open, document the blocker).

**Valid stopping points (exhaustive):** (1) PR open + local gate green + every acceptance gate met with evidence or DEFERred; (2) a stop-flag park; (3) the fix-cycle PARK above (blocker in the handoff). On any park, write `$MEM/mr-gates render --slice <SLICE> --format park` to `$MEM/monster-realm-<SLICE>-progress.md`. A mid-slice progress summary is a failure, not a stop — keep working.

End with: slice · merged|parked|blocked|stopped · PR URL · CI · what changed · decisions · risks.

**Foreground only:** run every subagent, build, and test in the foreground; never end a turn with work in flight. For long waits, poll within the turn or checkpoint and exit at a valid stopping point. A subagent you resume (SendMessage) runs in the background: `rm -f /tmp/<SLICE>-<role>.done` first, have it create that file last, poll it with a bounded wait (≤10 min); never poll mtimes.

The PR description MUST include `Items: <feedback-ledger ids, or none>`.

**BUDGET: $<CAP_USD> for this slice — a sizing TARGET; self-limit to it.** Before every subagent spawn and new top-level task check: `/tmp/mr_warn_<SLICE>` = converge on finishing, no new scope or fan-outs; `/tmp/mr_stop_<SLICE>` = spawn nothing, park per Checkpoint. Blowing the cap parks the slice (sizing failure).
