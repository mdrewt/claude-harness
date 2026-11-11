<!-- SSOT: this file is the single source of truth for the weekly monster-realm review
task. The Cowork scheduled task "generate-improvement-plan" is a thin stub
(C:\Users\mdrewt\Claude\Scheduled\generate-improvement-plan\SKILL.md) that loads and executes
THIS file. Make review-process changes HERE (git-tracked), not in the stub.
Rewritten 2026-09-28 (harness revision): bounded output, residual-registry intake only.
Amended 2026-11-11 (operator directive): verified findings are now also SCHEDULED — one
front-of-roadmap milestone per run, shipped as a doc-only auto-merge PR (Phase 3c) — and the
run triages the backlog, pulling up to ~5 re-verified residuals into it (Phase 3a-pull). -->

# WEEKLY REVIEW — monster-realm defect hunt

## Goal and hard limits

Find real product defects in **monster-realm** that the build loop missed, enter them into
the residual registry, and schedule their fixes — together with up to ~5 re-verified
highest-priority backlog residuals — as a milestone at the front of the harness roadmap so
the hourly supervisor builds them next. Drew reads the one-page report in the task's chat.

- **At most 5 findings per run.** Each MUST name a protected-category defect
  (`standards/testing-tdd.md` "What earns a check": gameplay, security-privacy,
  data-integrity, netcode-determinism, ux-a11y critical flows, content) with a
  `path:line @ <SHA>` citation.
- **At most ~5 pulled residuals per run** (Phase 3a-pull), separate from the 5-finding cap:
  each re-verified against the pinned clone before it is scheduled. Zero is a fine number —
  an empty, obsolete or already-absorbed backlog never becomes manufactured work.
- Tracked writes are EXACTLY the Phase 3c scheduling PR: one new `M-weekly-review-*.spec.md`,
  the matching `PLAN.md` §9 insertion, any "Absorbs residuals" lines added to queued specs, and
  the deletion of a pulled row's `residuals.spec.md` section (that file's own scheduling rule).
  No other `residuals.spec.md` edit, never a game-repo write, no other tracked file.
- **Never** propose checks, tests, gates, evals, or scanners whose subject is the checking
  apparatus (testing-tdd forbids it; `mr-gates` refuses them anyway).
- **Never** spawn or schedule follow-up review generations. One run, one report.
- "No findings" is a valid, good outcome. Never manufacture issues.

## Execution environment (starts cold)

- All file/git/project operations go through Desktop Commander inside WSL (`wsl-harness-exec`
  skill): WSL paths only, never UNC paths or the Cowork sandbox shell.
  `HARNESS=/home/mdrewt/projects/ai-apps/claude-harness`, `PROJ=$HARNESS/projects/monster-realm`,
  `MEM=$HARNESS/memory/projects`.
- The review clone sits outside any connected folder: read it via bash only — ToolSearch-load
  `mcp__desktop-commander__start_process`, then one-shot `bash -lc '<cmd>'` calls. State the
  load step and exact clone path in EVERY subagent prompt, and confirm one test grep works
  before fanning out.
- Graph tools are permitted (routing: `code-intel` skill) but index the live checkout: confirm
  every cited `path:line` in the pinned clone; never run `index_repository`/`detect_changes`.
  Lenses and verifiers run on **sonnet** (pass the model explicitly; the `verifier` agent declares opus).

## Phase 0 — Orient, check courtesy, snapshot

1. Read the current entry points only: `$PROJ/AGENTS.md`, `$PROJ/ARCHITECTURE.md`,
   `$PROJ/docs/DECISIONS.md`, `$HARNESS/specs/monster-realm-v2/PLAN.md`, and
   `$HARNESS/specs/monster-realm-v2/residuals.spec.md`.
2. **Exclusion set:** everything in `$MEM/mr-gates residuals list` and `$MEM/mr-feedback list`
   is already tracked and not re-reportable. Also consume answered decision issues from prior
   runs (`gh issue list --state all --label decision` on both repos, titles starting
   `DECISION(rev`): fold answers in, close consumed ones with a comment starting
   `<!--mr-system-->`, leave unanswered ones open.
3. **Loop courtesy:** run `$MEM/mr-situation`; if a rate-limit park is live, wait (reset <1h)
   or abort with a short chat report.
4. **Snapshot (keep this exact guarded form in ONE bash call):**
   ```
   MRREVIEW_ROOT=/home/mdrewt/mr-review
   case "$MRREVIEW_ROOT" in /home/mdrewt/mr-review) rm -rf -- "$MRREVIEW_ROOT"/* ;; esac
   RUN_DIR="$MRREVIEW_ROOT/<UTC-date>-<short-sha>"
   ```
   `git clone --no-hardlinks "$PROJ" "$RUN_DIR"`, `git checkout --detach <master tip>`, record
   `SHA` + UTC time. Never create a worktree in the runner's repo; avoid `/tmp/mr_*`. The review
   is read-only in the clone and in `$PROJ`.

## Phase 1 — Three lenses, in parallel

Launch **at most 3** lens agents on the pinned clone. Preamble: `$HARNESS/.claude/agents/review-lens.md`
plus the tooling paragraph above (graph tools allowed here, citations verified at the SHA) and the
exclusion set. Pick the 3 riskiest lenses this week from:

- server authority, reject-don't-clamp, table privacy and data leaks;
- netcode determinism and smoothness (prediction, held keys, interpolation);
- data integrity: economy bounds, additive schema, account deletion/export;
- gameplay and content correctness against the spec's EARS criteria;
- critical user flows through the real UI, including accessibility.

Each finding: `path:line @ SHA`, evidence, category, severity, player/data impact, proposed fix.

## Phase 2 — Verify and cut to five

A separate sonnet verifier (not the finder) re-checks each candidate against the pinned clone,
given only the claim and location. HIGH/CRITICAL additionally need a concrete reproduction or a
minimal failing-test sketch. Drop anything unverified. Rank survivors by severity × likely
player impact and keep **at most 5**; genuine contradictions between lenses go to one fresh
**opus** adjudicator running `$HARNESS/.claude/agents/judge.md`'s bias protocol.

## Phase 3 — Enter findings into the registry, then schedule them

**3a — Route and group.** Before filing, decide where each kept finding's FIX will land:

- **Absorbed:** the fix falls in a surface a queued §9 milestone already rebuilds or owns
  (that spec's scope/`touches:` cover it). It joins that spec's "Absorbs residuals" list
  (edited in the 3c PR) and its `--target` below is that milestone's absorbing slice id
  (the milestone name if not yet elaborated). Never double-schedule an absorbed finding.
- **Scheduled:** every other finding goes into THIS run's milestone
  `M-weekly-review-<UTC-date>`, grouped into 1–4 slices `wr<YYMMDD>-a..d` by surface
  (pulled backlog rows included), with pairwise-disjoint `touches:` where possible so the
  loop can fan out.

**3a-pull — Backlog triage (up to ~5 pulled residuals).** Run
`$MEM/mr-gates residuals sweep --dry-run` now (reuse its output in Phase 4), then from
`mr-gates residuals list` pick up to ~5 open rows worth building NOW, ranked by severity,
then category risk (security-privacy / data-integrity first), then age. A row is eligible
only if ALL hold: not `targeted` at a live slice; not named in a queued §9 spec's "Absorbs
residuals" list or annotated "absorbed by … do not build separately"; not one of the
sweep's obsolete candidates; and not HIGH/CRITICAL in security-privacy or data-integrity —
those belong to the supervisor's own promote-first rule, never to this pull. RE-VERIFY each
candidate against the pinned clone before pulling: the cited defect must still be present at
`<SHA>` (re-cite fresh `path:line` where the code drifted). A row that no longer reproduces
is reported as a disposition candidate for the supervisor, never pulled. Pulled rows join the
weekly milestone as their own slice(s) or the matching surface slice from 3a; a pulled row
that has a `residuals.spec.md` section gets that section deleted in the 3c PR (the file's own
hand-scheduling rule). Pull NOTHING when no eligible row survives verification — only
genuinely useful, still-valid work enters the milestone, never filler to reach five.

**3b — Registry intake.** For each kept finding (n = 1..5):

```
$MEM/mr-gates residuals add --slice weekly-review-<UTC-date> --gate F<n> \
  --title "<one line>" --target <its 3a slice id> --reason "<path:line @ SHA — defect + proposed fix>" \
  --category <gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content> \
  --severity <LOW|MED|HIGH|CRITICAL>
```

A refusal means the finding was out of bounds: drop it and say so. Only the supervisor promotes.

**3c — Schedule in the harness plan (doc-only auto-merge PR).** Zero kept findings AND zero
pulled rows → skip 3c entirely; everything absorbed and nothing pulled → skip the new spec
but still PR the "Absorbs" edits.

1. Author `$HARNESS/specs/monster-realm-v2/M-weekly-review-<UTC-date>.spec.md` in the house
   spec shape, sketch+ level: a Status header ("authored by the weekly review, pinned @ <SHA>;
   elaborate via `milestone-loop-prompt.md` when reached if gates ceremony is still needed"),
   `Depends on:`, a 2–3 line Problem/intent, then one section per slice carrying category ·
   severity · size, each finding's or pulled row's EARS line(s), `touches:`, its residual id,
   the `path:line @ <SHA>` evidence (fresh citations for pulled rows) and the proposed fix;
   pulled rows are listed under "Absorbs residuals". Finding detail lives here and in the
   registry — never in PLAN.md.
2. Insert the milestone into `PLAN.md` §9 as the FIRST item — a one-line summary + status
   naming the spec file and the filed residual ids — renumbering the list and fixing any
   intra-§9 "item N" cross-references the renumbering breaks. Exception: when the milestone's
   remaining slices genuinely depend on a queued item, place it immediately AFTER that
   dependency and say why in both the §9 line and the spec header. Front placement is what
   makes the hourly supervisor build it next under its own "first unfinished non-`blocked:`
   item" rule; the supervisor's CI-fix / resume / HIGH-residual / structural priorities still
   rightly run first.
3. Ship it the way the loop ships docs: branch `wr-sched-<UTC-date>` off `origin/main` of the
   HARNESS repo; commit with EXPLICIT paths only (the new spec, `PLAN.md`, any "Absorbs"
   edits, any pulled-row `residuals.spec.md` section deletions — never `git add -A`); push;
   `gh pr create` (subject `docs(spec): weekly-review-<UTC-date> — schedule <k> findings +
   <m> pulled residuals as M-weekly-review-<UTC-date>`);
   `gh pr merge --squash --auto` (doc-only chore PRs auto-merge by loop convention). On a
   conflict (a supervisor doc PR landed first) rebase onto `origin/main`, re-apply, re-push.
   Confirm the merge, or report checks red and leave the PR open — never force. Restore the
   harness checkout to `main` straight after pushing (the loop's own state files may be dirty
   there; never stash, add or clean them) and drop the local `wr-sched-*` branch once the merge
   lands. The review touches nothing else tracked in either repo and leaves every other PR alone.

**Decisions** that are genuinely Drew's (irreversible, security posture, gameplay or player-visible; internal design is never his — it is a `type: design` slice, `standards/spec-driven.md` §Refactor slices): open
at most 3 issues via `$MEM/mr-ask-drew rev-<UTC-date>-<slug> --question … --recommend … --alts …
--context "Consumer: weekly review. Supervisor: record-and-ignore."` — game impact on the
default repo, process questions with `--repo mdrewt/claude-harness`. Never pass `--blocking`.

## Phase 4 — Report (one page, to chat)

1. Header: local date/time, pinned SHA, the 3 lenses, counts by severity (HIGH/CRITICAL first).
2. The ≤5 findings: title, category/severity, `path:line @ SHA`, short evidence, residual id.
3. The scheduled milestone: name, slice ids (and any absorbed-into targets), §9 position, and
   the Phase 3c PR link (merged, or auto-merge pending). Pulled backlog residuals: id,
   severity, one line on why-now — and one line on candidates examined but not pulled (why).
   Decision issue links, if any.
4. **Stale residuals (visibility only):** reuse the 3a-pull `sweep --dry-run` output and include its obsolete-candidates in the report (only the supervisor may `--apply`); then open MED/LOW rows from `mr-gates residuals list`, oldest
   first, one line each (id, age, title). Do not promote, re-prioritize, or re-report them.
5. One line on dropped candidates (count + why).

Then append a short handoff entry via `$MEM/mr-record handoff --title "<title>" --body-file <f>`
(residual ids, milestone + slice ids, scheduling-PR number, issue numbers, cleanup
confirmation). The Phase 3c scheduling PR is this review's ONLY tracked write: commit nothing
else, in either repo.

## Phase 5 — Clean up (every exit path, including aborts)

`case "$RUN_DIR" in /home/mdrewt/mr-review/*) rm -rf -- "$RUN_DIR";; esac` — the guard is
mandatory. Never touch the runner's git state (no worktree prune/remove, gc, reset; no branch
or checkout work in `$PROJ`, and none in the harness beyond Phase 3c's own `wr-sched-*` branch,
which ends checked back out on `main`). Verify `$RUN_DIR` is gone and report any failure.
