<!-- SSOT: this file is the single source of truth for the weekly monster-realm
review task. The Cowork scheduled task "generate-improvement-plan" is a thin stub
(C:\Users\mdrewt\Claude\Scheduled\generate-improvement-plan\SKILL.md) that loads and
executes THIS file. Make review-process changes HERE (git-tracked), not in the stub.
Rewritten 2026-08-01 (Drew-directed) to align with the native mr-supervisor
conventions: decisions as GitHub issues (mr-ask-drew), mr-record writes, BLOCKER
discipline, fan-out doctrine, model routing. Adversarially reviewed pre-adoption. -->

# WEEKLY REVIEW — monster-realm multi-lens improvement plan

ultracode

## Goal

Produce a valuable, accurate, and *verified* improvement plan for the **monster-realm**
subproject, prioritizing code quality, rigor, best practices, bug fixing, bug prevention,
documentation, and completeness of the implementation against the specs. Drew reads the
plan in the task's chat — optimize the report for that. Decisions that are Drew's to make
are raised as GitHub issues (see §Decisions), NOT resolved silently and NOT parked as
inline report sections.

This task runs concurrently with the native `mr-supervisor` loop (cron/event ticks that
advance `master`, squash-merge PRs, fetch/prune, and reap worktrees). Your review MUST be
fully isolated from that activity (Phase 0 snapshot) and MUST leave no trace behind
(Phase 5). Pin the most recent `master` tip at start.

## Execution environment (this task starts cold — read this first)

- Run ALL file, git, and project operations through Desktop Commander, which runs natively
  inside WSL. Invoke commands directly — do NOT wrap them in `wsl … bash -lc`. See the
  `wsl-harness-exec` skill. Use WSL paths (`/home/mdrewt/...`); NEVER Windows UNC paths
  (`\\wsl.localhost\...` — Glob/Read/Grep time out on them). Do NOT use the Cowork sandbox
  shell for project or git commands; it is a separate Linux that cannot see the toolchain.
- Set `HARNESS=/home/mdrewt/projects/ai-apps/claude-harness`,
  `PROJ=$HARNESS/projects/monster-realm`, `MEM=$HARNESS/memory/projects`.
- The pinned review clone lives OUTSIDE any connected folder, so native Read/Grep/Glob
  cannot reach it and Desktop Commander's `read_file`/`list_directory`/`start_search` are
  unreliable there (historically rejected by allowedDirectories config). Read the clone
  via the bash process ONLY — ToolSearch-load `mcp__desktop-commander__start_process`
  first (DC tools ship deferred; calling unloaded = InputValidationError), then drive
  one-shot `bash -lc '<cmd>'` calls (`sed -n`, `cat`, `grep -rn`, `find`). State this
  explicitly — ToolSearch load step + exact clone path — in EVERY subagent prompt.
- The asdf toolchain (git, node, cargo, etc.) is already on PATH inside WSL.
- Before fanning out (Phase 1), CONFIRM your read path actually works against the review
  clone (one test grep) — the path/tooling specifics have broken silently before.
- **Code-intelligence tools are PERMITTED (Drew directive 2026-08-01):** use
  `codebase-memory-mcp` and CodeGraph freely for impact analysis, caller enumeration, and
  blast-radius (routing/syntax SSOT: the `code-intel` skill). Two caveats: (1) the graphs
  index the CANONICAL checkout, which the runner advances mid-review — every graph-derived
  claim that reaches the report must have its `path:line` confirmed against the pinned
  clone (Phase 3 does this anyway); (2) NEVER run `index_repository`/`detect_changes` —
  graph freshness is runner-owned; consume the index as-is.

## Subagent model routing (harness routing alignment)

Lens reviewers and verifiers: **sonnet**. Conflict adjudicators / judges: **opus**.
Orchestrator (you): as launched. Do not run the whole fleet on the top-tier model.

## Phase 0 — Orient, sweep the prior cycle, snapshot (isolation is mandatory)

1. Read this harness's priorities, standards, and workflows (`AGENTS.md`, `standards/`,
   `docs/`) and the monster-realm project docs (`$PROJ/AGENTS.md`, `ARCHITECTURE.md`,
   `docs/adr/DIGEST.md` as the ADR entry point, `$HARNESS/specs/monster-realm-v2/PLAN.md`).
   Note the real invariants, ADRs, EARS criteria, and PLAN slices — Phase 1 lenses target
   them.

2. **PRIOR-CYCLE SWEEP (new, bounded — not a loop re-audit):**
   a. Decision issues from previous reviews: for BOTH repos run
      `gh issue list --repo <R> --state all --label decision --json number,title,state`
      and filter titles locally for the literal prefix `DECISION(rev` (GitHub's --search
      does no prefix/paren matching — a `--search "DECISION(rev"` query returns nothing;
      also tolerate the un-numbered bootstrap slug `rev-ledger-row`). gh is the SOURCE
      OF TRUTH; `$MEM/decisions/issue-*.answer.md` transcripts are a cache (the watcher
      caps at 7 days — an answer may exist on gh with no transcript). Incorporate answers
      into this review's inputs; close each CONSUMED issue with a comment that MUST start
      with `<!--mr-system-->`; leave unanswered issues open (never close unanswered; no
      comment-bumps).
   b. Runner's handling of the PREVIOUS review's inserted milestone: read the handoff
      TAIL (`tail -c 8000 $MEM/monster-realm-handoff.md`) and the ledger rows for those
      slice names only. Record which slices merged/parked — merged fixes join the
      exclusion set.

3. **EXCLUSION SET (new):** compile a list of already-tracked findings from: delivered/
   parked/deferral notes in the queued milestone specs, ADR deferral sections (DIGEST-
   guided), the previous review's report + milestone, and the tracked feedback items from
   `$MEM/mr-feedback list` (note: `covermap` requires `extract|verify SRC` args — use
   `list` here). Feed it to every lens. A tracked item is NOT re-reportable — EXCEPT when the
   tracking itself is defective ("disclosed-but-untracked": named in a spec/ADR postscript
   but present in no queue — historically the highest-value finding class; still report).

4. **LOOP-COURTESY CHECK (new):** run `$MEM/mr-situation` and read the bundle. If a
   rate-limit park is live (`rate_limit_resets_at` in the future): reset <1h away → wait
   for it; otherwise ABORT with a short report to chat explaining the deferral, and record
   `decision-defaulted:rate-limit-defer=abort` in the handoff entry. Rationale: the review
   and the runner share the same account's five_hour pool; an 8-agent fan-out during a
   parked window starves the loop. `.blocked-on-human` (if present) is context only — a
   human-gated LOOP does not block a read-only review.

5. STARTUP SWEEP + SNAPSHOT (teardown-safe form — the paths here were once corrupted by a
   stray space; keep this exact structure):
   ```
   MRREVIEW_ROOT=/home/mdrewt/mr-review          # never anything else
   case "$MRREVIEW_ROOT" in /home/mdrewt/mr-review)
     rm -rf -- "$MRREVIEW_ROOT"/* ;;             # stale clones from crashed runs
   esac                                          # guard mandatory: an unset/typo'd var
                                                 # must fail safe, never expand to /*
   RUN_DIR="$MRREVIEW_ROOT/<UTC-date>-<short-sha>"
   ```
   Keep assignment + guarded rm in the SAME one-shot bash call (one-shot calls share no
   state; a bare `rm` line re-run without its assignment is the failure mode this guards).
   - `git clone --no-hardlinks` from `$PROJ` into `$RUN_DIR` (shares NO object storage
     with the runner's repo). NEVER create a worktree inside the runner's repo. Avoid the
     `/tmp/mr_*` filename namespace (runner-owned).
   - Guaranteed-teardown backstop if you keep a persistent shell:
     `trap 'case "$RUN_DIR" in /home/mdrewt/mr-review/*) rm -rf -- "$RUN_DIR";; esac' EXIT`
   - Pin: `git checkout --detach <master tip>` (detached — NO branch), record
     `SHA=$(git rev-parse HEAD)` + UTC timestamp for the report header.
   - The review is strictly READ-ONLY in the clone and in `$PROJ`: no edits, no mutating
     builds, no pushes, no scratch files in reviewed repos. All writes happen in the
     HARNESS (spec/PLAN/handoff) per §Phase 6, or in `$RUN_DIR` (disposable).
   - Optional safety net: capture the runner repo's `git worktree list` + `git branch`
     read-only now; confirm unchanged at the end.

## Phase 1 — Fan out across independent lenses

Right-size the fleet to the codebase (survey scale first). Launch **sonnet** subagents
that each review the pinned checkout through ONE lens, in parallel and independently.

**Lens-agent preamble (SSOT):** read `$HARNESS/.claude/agents/review-lens.md` at runtime
and reuse its rules as each lens prompt's preamble, then append the Execution-environment
tooling paragraph (exact clone path, bash-only reads) and the exclusion set. TWO
adjustments when embedding: (1) its "No graph tools here" rule is OVERRIDDEN for this task
(Drew directive 2026-08-01) — graph tools permitted, citations verified at the pinned SHA;
(2) on any other conflict, THIS file wins on Cowork tooling mechanics, review-lens.md wins
on review methodology. If review-lens.md is missing, fall back to its core rules from
memory: read-only; pinned checkout only; stay in your lens; honor the exclusion set;
"no findings" is a valid outcome — never manufacture issues.

Choose lenses from what Phase 0 taught you. Coverage MUST include, at minimum, auditors
for monster-realm's actual invariants/ADRs (confirm specifics against the project's own
docs; group related concerns sensibly):

- server-authoritative / intent-only / reject-not-clamp, and stakes-classified RLS /
  private-table data-leak (per the project's security ADRs);
- netcode smoothness / desync;
- additive-schema and migration safety;
- functional-core / imperative-shell and SSOT (game rules defined once in game-core);
- content-as-data (content is data, not code);
- illegal-states-unrepresentable, parse-don't-validate at boundaries, exhaustive `match`,
  injected clocks/RNG;
- test integrity — gating tests actually bite (proof-of-teeth), none weakened, skipped,
  `.only`'d, or ignored; coverage/mutation meaningful; gates CLAIMED in the Definition of
  Done but not wired into `just ci`/`just lint`;
- spec-vs-code completeness & coverage (bidirectional): EARS criteria and PLAN-closed
  slices vs real implementations + covering tests at the pinned SHA; stubs/placeholders;
  shipped behavior the specs/ADRs don't document;
- doc drift / accuracy (docs wrong about the code — the inverse of completeness).

Plus general lenses: observability, logging, profiling, error handling, error tracking and
tracing, correctness/bugs, security, performance, API & boundary design, dependency
hygiene, over-engineering, scope creep, contract/unit/integration/e2e testing, well-
commented code, SpacetimeDB app design, PixiJS app design, WASM, best practices, and
documentation quality.

Each lens reports findings with: precise location (`path:line @ <SHA>`), evidence,
severity, why it matters, proposed change, confidence — plus a brief "checked, OK" list.

## Phase 2 — Aggregate and resolve conflicts

Collect, aggregate, de-duplicate. Findings from different lenses that AGREE are
corroborating consensus (raise confidence) — NOT conflicts. Only genuine contradictions
go to debate: spawn a FRESH **opus** adjudicator per contradiction (never resume the lens
agents), give it both positions + the code at the pinned SHA + the project's principles/
ADRs, and have it run `$HARNESS/.claude/agents/judge.md`'s STRUCTURAL BIAS PROTOCOL
(pre-commit rubric → evidence before verdict → blind where feasible → falsifiable
verdict). Keep only the winner. Do not let your own judgement silently decide a conflict.

## Phase 3 — Verify (independent pass — drop hallucinations)

Before any finding reaches the report, SEPARATE **sonnet** verifier subagents (not the
original finders) re-check EVERY finding that will be reported against the pinned clone.
Give a verifier only the claim and its location — not the finder's confidence or framing.
Confirm cited file/line/symbol exists and says what is claimed; high-severity findings
additionally need a concrete reproduction or minimal failing-test sketch. Any
graph-derived claim gets its last-mile `path:line` confirmed here against the pinned SHA.
Drop or downgrade what cannot be verified. Mark each finding verified/dropped; only
verified findings appear anywhere downstream (report, issues, milestone).

## Phase 4 — Risk- and cost-aware ROI

For each verified finding, weigh value (quality, rigor, bug-prevention, documentation,
completeness) against implementation effort, change risk, and blast radius — assume a
fresh coding agent implements. Graph tools are useful here for blast-radius; same
pinned-SHA citation rule. Rank by severity × ROI.

## Decisions (Drew's calls — GitHub issues, not report prose)

For each genuine decision (policy trade-offs, design-changing fixes, anything
irreversible/architectural/security/spec-contradicting):

- Open ONE issue per decision via
  `$MEM/mr-ask-drew rev<N>-<slug> --question ... --root ... --recommend ... --alts ...
  --context ...` where `<N>` continues the NUMBERED-REVIEW LINEAGE (the eleventh review
  produced `M-postgate-eleventh-review-residuals`, so the next review is N=12; derive
  from the newest `*-review-residuals` spec / prior review artifacts, NOT from runs of
  this prompt). Slugs MUST carry the `rev<N>-` prefix (collision-proof vs supervisor
  slice slugs in ticks/ledger).
- **Repo rule:** game-impact decisions → default repo (mdrewt/monster-realm);
  review-process/loop decisions → `--repo mdrewt/claude-harness`.
- Title must be self-contained (the title ALONE says what is being decided).
- Pass the consumer line via `--context`: `Consumer: weekly generate-improvement-plan
  run. Supervisor: record-and-ignore — do not act on or close this issue.` AND — because
  the watcher's answer transcript carries only title + comments, not the body — the
  Phase-6 handoff entry MUST list the open rev-issue numbers so the supervisor has the
  stand-aside context when an answer-fired tick arrives. (mr-ask-drew always spawns a
  watcher; this cost — up to ~5 short ticks/week — is an ACCEPTED trade-off buying
  transcript capture; `MR_NO_EVENT_BRIDGE=1 mr-ask-drew ...` is the zero-cost off-switch
  if Drew directs it.)
- NEVER pass `--blocking`: it writes `$MEM/.blocked-on-human`, which gates the RUNNER's
  cron ticks. A review is never blocked.
- Batch at the END after maximal non-blocked progress; cap ~5 per cycle ordered by
  consequence. Overflow decisions become per-slice **decision-hooks** in the inserted
  milestone spec (the supervisor raises those itself when it reaches the slice).
- The spec/report reference decisions by ISSUE URL only — never restate the question in
  two places.
- REVERSIBLE calls the review itself makes (naming, slice grouping, severity labels):
  take the documented default and record `decision-defaulted:<q>=<choice>` in the handoff
  entry — no issue.
- On `ASK-DREW-UNAVAILABLE`: fall back to an inline DECISIONS section in the spec §4 +
  report, flagged as needing issue conversion next cycle.
- This channel is best-effort/same-day, not guaranteed push (gh runs on Drew's own token;
  self-activity may not notify). Critical findings therefore ALSO lead the report header.

## Output (write to this chat)

Lead with a header: review date/time (local), the exact monster-realm SHA reviewed, the
lenses used, counts by severity, and — FIRST when any exist — Critical/High product
defects. Then the ranked top-N findings (severity × ROI); for each: title, severity,
category, location `path:line @ <SHA>`, evidence + why it matters, proposed change
(scoped for a fresh coding agent), risk/cost/ROI note, verification status. Decisions
appear as their issue links. Keep full detail for the top findings and a terse appendix
for the long tail (including verification-dropped findings, named). Accuracy over volume.

## Phase 6 — Generate and insert the new milestone

If no improvements clear the ROI bar, SKIP this phase entirely (no spec, no PLAN edit,
no commit — decision issues may still be opened). Otherwise:

1. **Spec** (`$HARNESS/specs/monster-realm-v2/M-postgate-<review-lineage-name>.spec.md`,
   continuing the review-residuals naming lineage; header records review ordinal + pinned
   SHA + UTC): slices with explicit `touches:` path-sets on the M8.9 domain-module
   boundaries, **`after:` metadata** capturing the real dependency chain per slice
   (advisory for the supervisor's planning read — no mechanical consumer today, but
   structured beats prose sequencing), per-slice test files, EARS acceptance criteria.
   NO tier hints (the supervisor derives HARD/routine mechanically from `touches:`).
   NO ADR number pre-allocation (supervisor-owned via `adr_next_free`). Do NOT edit `mr-state.json` (its `queue[]` is
   a narrative journal, not a work queue — scheduling flows through PLAN §9 order).
   Optionally run `$MEM/mr-disjoint` on proposed sibling pairs and record the verdicts in
   the spec's fan-out notes (advisory: NECESSARY-NOT-SUFFICIENT, never overrides toward
   parallel). Overflow decisions attach as per-slice decision-hooks referencing issue URLs.
2. **PLAN.md**: insert the milestone bullet between the runner's current milestone and
   the next one (check the handoff tail for what is in flight).
3. **Handoff**: append via `$MEM/mr-record handoff --title "<title>" --body-file <f>` —
   never hand-append. Body: what was inserted + where, headline findings, ALL open
   rev-issue numbers with the stand-aside note (the supervisor's answer-tick context —
   see §Decisions), decision-defaulted records, cleanup confirmation.
4. **NO pending-events file.** The runner discovers the milestone via PLAN §9 order +
   the handoff (proven: prior insert was picked up within hours). A file in
   `pending-events/` fires nothing and defeats the runner's free live-chain standdown
   fastpath (paid spawns).
5. **Commit + push (harness repo):** stage EXPLICIT paths only — the new spec file and
   `specs/monster-realm-v2/PLAN.md`. NEVER `git add -A` (sweeps mid-tick supervisor
   state); never commit `memory/` (handoff/ledger/decisions are the supervisor's own
   housekeeping). First `git -C $HARNESS remote -v` (unexpected remote → do not push;
   report). Then commit; on push rejection: fetch + rebase (or ff) + retry ONCE; still
   failing → leave committed, report the push failure. Timing/ordering note: `memory/`
   writes (handoff) and `.git/` operations are probe-EXEMPT; ONLY the spec + PLAN.md
   file writes open a ≤6-min standdown window for the runner. So: prepare all content
   first; the handoff append may happen any time; write the spec + PLAN.md and run the
   commit as the LAST writes, back-to-back (steps 1-2 execute at the end even though
   listed first).

## Phase 5 — Clean up after yourself (guaranteed; runs AFTER Phase 6)

Phase 6 is numbered last but runs BEFORE this teardown (it needs no clone; finish the
report, do Phase 6, then cleanup as the final action — on EVERY exit path, including
aborted runs and skipped Phase 6; the Phase-0 trap and next run's startup sweep are
backstops).

- Remove the clone: `case "$RUN_DIR" in /home/mdrewt/mr-review/*) rm -rf -- "$RUN_DIR";;
  esac` — the guard is mandatory; never spell an inline wildcard rm.
- NEVER touch the runner's git state: no `git worktree prune/remove`, `git branch -D`,
  `git gc`, or any reset/checkout in `$PROJ` or the harness working tree. Cleanup is
  limited to `$RUN_DIR`.
- Verify `$RUN_DIR` is gone; if the Phase-0 safety net was captured, confirm the runner's
  `git worktree list` + `git branch` are unchanged. Report any cleanup failure.

## One-time bootstrap (first run under this prompt; skip if the issue already exists)

Open the deferred process decision via
`$MEM/mr-ask-drew rev-ledger-row --repo mdrewt/claude-harness --question "Should the
weekly review write a visibility-only ledger row?" --recommend "cost-null row, notes
starting tier=review, visibility only" --context "Governor calibration already absorbs
Cowork spend via Drew-reported totals; costed rows would double-count until re-anchor;
mr-metrics buckets by tier= tag, so an untagged row lands in 'untagged'."` — with the
standard consumer line.
