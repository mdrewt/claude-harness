<!-- SSOT: this file is the single source of truth for the weekly monster-realm review
task. The Cowork scheduled task "generate-improvement-plan" is a thin stub
(C:\Users\mdrewt\Claude\Scheduled\generate-improvement-plan\SKILL.md) that loads and executes
THIS file. Make review-process changes HERE (git-tracked), not in the stub.
Rewritten 2026-09-28 (harness revision): bounded output, residual-registry intake only. -->

# WEEKLY REVIEW — monster-realm defect hunt

## Goal and hard limits

Find real product defects in **monster-realm** that the build loop missed, and enter them
into the residual registry. Drew reads the one-page report in the task's chat.

- **At most 5 findings per run.** Each MUST name a protected-category defect
  (`standards/testing-tdd.md` "What earns a check": gameplay, security-privacy,
  data-integrity, netcode-determinism, ux-a11y critical flows, content) with a
  `path:line @ <SHA>` citation.
- **Never** create milestone or spec files, edit `PLAN.md`, or edit `residuals.spec.md` by hand.
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
  Lenses and verifiers run on **sonnet**.

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

## Phase 3 — Enter findings into the registry

For each kept finding (n = 1..5):

```
$MEM/mr-gates residuals add --slice weekly-review-<UTC-date> --gate F<n> \
  --title "<one line>" --target backlog --reason "<path:line @ SHA — defect + proposed fix>" \
  --category <gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content> \
  --severity <LOW|MED|HIGH|CRITICAL>
```

A refusal means the finding was out of bounds: drop it and say so. Only the supervisor promotes.

**Decisions** that are genuinely Drew's (irreversible, architectural, security posture): open
at most 3 issues via `$MEM/mr-ask-drew rev-<UTC-date>-<slug> --question … --recommend … --alts …
--context "Consumer: weekly review. Supervisor: record-and-ignore."` — game impact on the
default repo, process questions with `--repo mdrewt/claude-harness`. Never pass `--blocking`.

## Phase 4 — Report (one page, to chat)

1. Header: local date/time, pinned SHA, the 3 lenses, counts by severity (HIGH/CRITICAL first).
2. The ≤5 findings: title, category/severity, `path:line @ SHA`, short evidence, residual id.
3. Decision issue links, if any.
4. **Stale residuals (visibility only):** run `memory/projects/mr-gates residuals sweep --dry-run` first and include its obsolete-candidates in the report (only the supervisor may `--apply`); then open MED/LOW rows from `mr-gates residuals list`, oldest
   first, one line each (id, age, title). Do not promote, re-prioritize, or re-report them.
5. One line on dropped candidates (count + why).

Then append a short handoff entry via `$MEM/mr-record handoff --title "<title>" --body-file <f>`
(residual ids, issue numbers, cleanup confirmation). No git commits: this review writes no
tracked files.

## Phase 5 — Clean up (every exit path, including aborts)

`case "$RUN_DIR" in /home/mdrewt/mr-review/*) rm -rf -- "$RUN_DIR";; esac` — the guard is
mandatory. Never touch the runner's git state (no worktree prune/remove, branch deletion, gc,
reset, or checkout in `$PROJ` or the harness). Verify `$RUN_DIR` is gone and report any failure.
