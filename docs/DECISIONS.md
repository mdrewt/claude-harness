# Decisions (harness)

Per `standards/decisions.md`: the choices that constrain this workspace today and aren't
re-derivable from the code in minutes. The full pre-2026-09 ADR corpus lives in git history
(`git log -- docs/adr`).

## Generated projects ship guard + format hooks
Every template carries the PreToolUse destructive-command guard and the PostToolUse
auto-format hook, and the harness runs the same pair on itself.
Agents with broad Bash permissions need the dangerous tail (force-push, recursive delete,
history rewrite) cut mechanically, and format-on-edit keeps diffs clean without a human
remembering a pre-commit step.
Rules out: relying on prompt instructions for destructive-command safety, and per-project
bespoke hook forks (the copies are synced from `_base`).

## Supply chain: pinned digests + Renovate
GitHub Actions are pinned to digests via a Renovate preset; lockfiles are pinned; dependency
review runs in CI. A tag is a mutable pointer — pinning by digest is the only shape that makes
a workflow reproducible and un-hijackable, and Renovate keeps pins fresh without manual upkeep.
Rules out: `@vN` tag references in workflows.

## One shared research library, consulted through the expert agent
Durable, project-agnostic domain research lives in the harness's `docs/research/` (linted for
purity — no project/milestone leakage), and agents consult it via the `expert` subagent rather
than re-researching. Research is expensive and rots quietly; a single linted library with an
index keeps it reusable, and purity keeps it portable across projects.
Rules out: burying research in per-project docs, and re-running deep research for questions the
library already answers.

## Code intelligence routes by question type across BOTH graphs
CodeGraph and codebase-memory-mcp each have measured blind spots; callers/blast-radius answers
must union both graphs plus a grep for dynamic dispatch, and the `code-intel` skill is the
routing SSOT (vendor "use me first" banners are subordinate). A single-graph caller list has
shipped real misses across marshaling boundaries.
Rules out: trusting either graph alone for impact analysis, and natural-language queries where
symbol names exist.

## Supervisor cost accounting reconstructs per-invocation cost
Claude CLI logs report cumulative `total_cost_usd`, carried across `--resume`; a run's own spend
is reconstructed by `mr-cost-sum` (the single implementation) from each result event's own usage,
or the session transcript's `cost-state` when that reports more; a launch that resumes an
earlier session subtracts what that session had spent before it (`PRIOR=` on its launch marker).
Each build session gets exactly one ledger cost row, keyed by the launch stamp in its pass log
(`mr-record ledger --from-log`), and the usage ledger is append-only — a wrong figure is
corrected by appending a signed `CORRECTION` row, never by rewriting; spend a session makes after
its row is written goes in the same way, as a `CORRECTION(late spend)` row under its run_id. Budget governance
is only as good as the ledger: summing result events or per-attempt totals double-counts a
resumed run, and judging "already recorded" from the slice name and a time window drops the row
of every relaunch.
Rules out: hand-summing costs at call sites, deciding a session is recorded from its slice name
and a time window, and editing ledger rows in place.

## The loop is judged by genuine progress on the game per credit; no figure is a target
The goal is the most genuine, valuable progress on the game per credit spent (operator,
2026-11-27). Time is not a cost: the same work costs the same credit whenever it runs, so
finishing more sooner and running out beats spreading less over the week; the governor's
thresholds exist only so no run starts that the plan's limit would cut off. Quality is fixed: no
gate, test, lens or Definition-of-Done item is weakened to save credit. Slice counts, cost per
slice, tokens, lines and test counts are diagnostics people read, never targets — a target gets
gamed. Scope leaves a slice only as a recorded DEFER or residual; filing one is honest reporting,
not a cost. Figures come from tools reading ground truth (ledger CLI cost events, PR/CI/git state,
mr-audit's own log), count every run — failed, crashed, parked and unmerged included — and say
when the sample is too small: INCONCLUSIVE is a correct reading. Every safeguard costs credit, so a
check is added only where no mechanism already covers it.
What this adds is reporting, not steps: mr-phase-ab notes the slices its figures leave out, and the
weekly review pastes `mr-weekly-rates` (wontfix share of residuals leaving the backlog; merges over
a detector finding of the slice's own audit, read from mr-audit-log.jsonl). Nothing gates on
either. Two wording changes wait for the live phase-split analysis, because the brief also drives
its baseline: mr-brief-template.md's BUDGET line ("a sizing TARGET; self-limit to it" becomes a
ceiling, scope leaving only by DEFER) and a milestone-loop-prompt.md line that slice count is never
a goal. The analysis names them when it is recorded.
Rules out: holding a ready slice to make the budget last (waits that protect quality — CI, green
tree, quiet window, human activity — stay); splitting, shrinking or reordering work to move a
number; picking work because it is cheap; reporting an estimate as a measurement; leaving
unmerged or failed runs out of a figure; a per-slice LLM value judge; a progress-per-credit score
in the bundle or state; new per-run verification steps; a supervisor-prompt goal block (its pick
order and holds are already mechanical, and a blunt "never wait" reads against those waits).

## A credit stop is recorded by the tick wrapper and resumed before any other work
When a build session ends on a `rejected` rate-limit event, `mr-interrupted` records the stopped
slices (tier, model, effort, CLI session, launch vars, reset time, and whether the limit covers
one model or all) before any gate of the tick; the first tick after the reset writes their
launch vars back and its one action is to relaunch all of them, at the tier they were stopped
at, on the stopped CLI session when its transcript is still on disk. The tool, not the prompt,
decides each case: a slice leaves the record only when it is launched again or a lookup shows
nothing to resume (PR merged or open, `blocked:`, spec section gone, 14 days old); a slice still
running is skipped and `mr-spawn` refuses a second launch of it; a resume that fails twice is
capped and raised to the operator once, where a failure is a relaunch the vendor refused again
or a launch `mr-spawn` refused for a cause that does not clear by itself, and an offer nothing
acted on is offered again uncounted; a slice waits while any stop that covers its model does;
a one-model limit stops and gates only that model; and
under the operator hold the scan records and does nothing else. Fan-out launches every ready
candidate that passes a named rule (overlap, structural, `after:`, 4 in flight, memory, quiet
window, the governor's thresholds); spending the weekly credit early is not one of them.
A stop is not a failure, so nothing about the slice is re-decided: the work costs the same
credit whenever it runs, an interrupted run's context and uncommitted step are the most
expensive things to rebuild, and a decision session that has to infer what was stopped — or
that never runs because a hold, the budget stand-down or its own refused session ended the tick
first — leaves the work parked until someone notices. A lookup that cannot answer keeps the
slice and launches nothing, because a wrong resume spends a session and a wrong drop loses work.
Rules out: escalating a credit-stop resume to the hard tier, ranking it behind other picks,
holding a ready slice to spread spend over the week, moving the detection, the leaving rules or
the reset arithmetic back into the supervisor prompt, dropping a slice because its wrapper
exited 0, offering a failed resume without bound, counting an offer nothing acted on as a
failure, and touching a stop flag or starting a watcher under an operator hold.

## The budget governor reads the plan's real utilisation; the dollar calibration is its fallback
`mr-situation` grades the governor (NORMAL, SOFT-PAUSE over 90%, HARD-STOP over 97%) from the
utilisation the CLI's `rate_limit_event` rows report per plan window
(`mr-rate-limit-telemetry.jsonl`), and from the ledger's dollars against `mr-budget-config.json`
only for an axis with no reading in force; `budget.source` in the bundle names which decided.
A window covers one model when its name carries the model or `telemetry_window_models` maps it,
every model otherwise (the scope rule of `mr-interrupted`): the windows every model shares set
`budget.state`, a model's own window sets `budget.model_states.<model>`, and `mr-spawn` refuses a
new launch on a model whose own window is paused while other models launch. A reading is its
window's newest sample among rows whose `resetsAt` is ahead, under the `resetsAt` that sample
carries. It is void once that `resetsAt` has passed, acted on as read for `telemetry_fresh_s`
(3 h), and after that a window still over the soft threshold reads SOFT-PAUSE: `telemetry-stale`
on a shared window, and on a model's own window a pause that `mr-spawn` lets one launch per
`telemetry_fresh_s` through to re-measure, with `fable_ok` false meanwhile. HARD-STOP arms its
reset tick for `budget.resets_at_utc`, the plan's own reset.
The dollar figure is this loop's ledger against a hand-set limit, and the plan has refused credit
while it read 40%; the plan's figure is the one that cuts a run off. The thresholds avoid that
waste (a run started just under the cap dies mid-way) and do not pace spend. The plan's figure
also falls inside a window (measured: 0.95 to 0.77, 0.93 to 0 with the same `resetsAt`), so an
old reading is never held to the reset: a stale HARD-STOP would leave no session to see the
fall, where SOFT-PAUSE lets one decision session run, launch nothing new and leave the next
sample. Only sessions on a model report that model's window, so a stale pause there can be
lifted by nothing but a launch on that model: one launch per freshness period is that probe
(claimed by a `.model-window-probe.<window>.<reset>` marker in `$MEM`), which bounds what a
window still at its limit can cut off to one run per period instead of a whole fan-out. The
newest sample names the window's instance because the plan's latest word is the one in force:
ranking instances by `resetsAt` would let one row with a later reset time void every sample
after it.
The dollar scale itself is fitted to those readings (`mr-budget-calibrate`, 2026-11-26): the
median, over the last 9 closed seven_day windows whose utilisation rose at least 0.20, of the
ledger dollars landing between a window's first and last reading divided by that rise. MERGED and
LAUNCH rows add nothing (since 2026-08 a MERGED row's cost repeats its session's FINISHED row; a
LAUNCH row is an estimate), and an open window is left out (its live runs are not in the ledger
yet). The July anchor's $2,783 was 1.6x the fitted $1,713, so every headroom figure overstated
what a launch could spend before the plan cut it off. `fable_allowance_usd` is scaled by the same
ratio. The tick re-checks the fit weekly and asks the operator when it drifts more than 20%; it
never rewrites the tracked config. Because the dollar scale is now the tighter one, dollars alone
never HARD-STOP a window the plan holds an old, low reading for: that reads SOFT-PAUSE
(`calibration_hard_capped`), so one session runs and resamples while nothing fits past the hard
line — a fitted scale must not be able to stop the loop until a weekly reset. Only a `seven_day`
reading lifts it (a `five_hour` one says nothing about the week). Under the cap a live run's
fable→opus fallback and its next phase also go ahead, as they do on SOFT-PAUSE: they finish work
already started.
Rules out: holding a pause on the highest reading of a window, standing the loop down on a
reading older than the freshness bound, an automatic weekly rewrite of the limit (it compounds and
dirties the main checkout), dropping a model's stale over-threshold reading (the
dollar fallback then reads the model as open), pausing every model for one model's window, and moving
the grading or the window rules into the supervisor prompt.

## Noisy Bash output is filtered by rewriting the command, not the result
The quiet hook rewrites recognized noisy commands to a tee-to-log wrapper that withholds pass
walls while keeping failures, diagnostics, and summaries whole; the full log path is printed,
and `NOFILTER=1` bypasses. Post-hoc result truncation loses exactly the failure lines that
matter (measured), while command rewriting keeps the complete output recoverable.
Rules out: `| tail -N` habits on gate commands, and filtering that touches piped/complex
commands (they're left alone by design).

## Loop tool paths under `memory/projects/` are an external interface
The user crontab, the operator's `~/.local/bin/mr-supervisor-*` commands and the Stop hook in
`~/.claude/settings.json` call `memory/projects/mr-native-tick.sh`, `mr-usage-snap`,
`mr-supervisor-disable`, the `.native-supervisor-disabled` flag and
`.claude/hooks/gates-stop.mjs` by absolute path, so those files keep those paths.
The callers live outside git: a change that moves or renames one cannot update them, and no
check fails — the loop just stops ticking, or every live session references a missing hook.
Rules out: relocating the `mr-*` tools (to `scripts/`, say) or deleting `gates-stop.mjs` as a
repo-only change. The operator repoints the outside caller first.

## A report-only scan lists history-style comments a diff adds
`memory/projects/mr-comment-scan` reads the lines a slice's commits add and lists comments and
doc lines carrying a work-tracking id or history wording. The slice brief runs it before the PR;
a finding is reworded or answered in the PR body. It never fails a build and is not a merge gate.
The documentation rule in `standards/principles.md` is judged by the reviewer, but an agent under
pressure skips prose rules, and the commonest violations (a slice id, "used to") are mechanical
to spot. Scanning added lines only keeps the existing corpus from flagging every diff.
Rules out: promoting it to a failing gate, scanning whole files, or an inline suppression marker
(a comment written for the tool to parse). This scan and the test census (see the entry below)
are the two sanctioned source-text scans; neither licenses others (`standards/testing-tdd.md`).

## The test census is a report: recorded at milestone close, acted on at elaboration
`memory/projects/mr-prune census` reads the game repo's test files at a commit and prints the
suite's size per package and the tests that are exact twins of an earlier test in the same block.
It is a second report-only source-text scan, beside `mr-comment-scan`; it exits 0 whatever it
finds and no gate reads it. A row is a candidate for someone to read, never a reason to delete:
`standards/testing-tdd.md` (Deleting a check is legitimate) stays the only authority for removal.
Twins: same file, same enclosing block, same declaration form, and a token-identical body
(comments and whitespace between tokens ignored, every literal compared as written) that does not
depend on the test's name. The later test is the candidate, the earlier the survivor. A pair whose
path or names carry a protected token is listed apart and follows the standard's protected path.
`mr-prune twin` re-checks a claimed pair at a commit, and only with the candidate as the later test.
A pair that is identical on purpose is recorded with `mr-prune keep` in the tracked
`memory/projects/mr-prune-keep.json`, keyed by file, test name and body hash, and is not listed
again until the test changes. The look is when a milestone closes, when everything it added
exists; a removal is acted on only when a spec is elaborated, in a slice that already lists the
file, or through the structural queue, never in a session of its own.
`mr-prune close` records that look once per milestone. The milestone's commits are the ones whose
subject names one of its slices as `<type>[(<scope>)]: <slice id> — `, less any a later commit says
it reverts: the rule `structure.spec.md` uses for "built". They are a set, not a first-to-last
range, because other milestones, refactors and CI fixes merge between a milestone's slices. Each
candidate in the files those commits changed gets one route: `slice` when an unbuilt slice of
another spec already lists a file of it, so that spec's elaboration acts on it; `structure`, into
one refactor section per close, capped at 6 rows and 12 files so that one run can read every row
before it removes any; `report` for a protected row and for an orphan wider than 12 files, which
is a design question.
Measured on the suite, almost nothing is provably redundant under a rule strict enough to be safe
(the strict count was zero). Mutation results cannot show a test is redundant (a few tests kill
every mutant of a module whose other tests assert different rules) and TypeScript has no mutation
tool. A dedicated prune session costs tens of dollars per milestone to act on a usually empty list.
Rules out: promoting the census to a failing gate or a ratchet on its counts, an inline keep
marker in test source (a comment written for a tool to parse), using a row, a count or a mutation
result as a deletion reason by itself, a first-to-last commit range as what a milestone added, an
uncapped section or one section per candidate, and a per-milestone prune session with its own PR
type: the tester A/B experiment measured test bloat at about $0.20-0.25 a slice, and the tester's
writing rules now cut it where the tests are written.

## The tester runs on Opus at medium effort and files defects apart from questions
The `tester` agent is Opus at effort medium on every tier. It writes tests for behaviour a
criterion states or directly implies (its boundaries and refusals), and reports each finding once, as a defect (one observable wrong outcome with
evidence) or a question (spec silence, an unsure runtime fact, a test-file or brief slip).
Measured by the tester A/B experiment (2026-11-13/14, 16 slices, five arms, a Fable judge): Opus
medium found all 4 confirmed defects whose fixes merged (10 of 11 once confirmed defects not yet
fixed are counted), the two Sonnet arms found 0 of the 4, and high effort found no more than medium
in either model. Every real finding came from the tester's written claims about the base code and
the spec, none from a failing test; a blind review of four slices' tests scored the arms' test code
nearly the same, with Sonnet medium the leanest. Of 132 judged items, about 70 false positives were
spec silence claimed as a defect or claims about test files and the brief, which the two-channel
report separates without losing any real finding (each real one named a concrete wrong outcome).
The game repo's copy of `tester.md` is generated from the harness file (`scripts/sync-agents.mjs`)
and `mr-selfcheck` reports drift against the game's `origin/master` (a FAIL in the main checkout's daily
run): rooted runs start in the game repo, whose agent of the same name
shadows the harness one, and a stale copy (Sonnet, no effort) silently ran 17 tester calls on
Sonnet and the hard tier's at the parent's xhigh before 2026-11-26. Every agent both rosters carry
must also agree on `model:` and `effort:`; their bodies stay project-owned.
Rules out: a Sonnet tester ($1.86 a run against Opus medium's $5.39, but dearer per slice once a
missed defect is priced above $10.35, the experiment's break-even), raising tester effort, and
tests that pin behaviour no criterion states. Untested and cheaper, if cost ever forces it: Sonnet
medium writing the tests beside an Opus medium pass that only files findings.

## A build session may run as three fresh sessions, measured on the first five slices
`mr-phase-ab` assigns eligible slices (game repo, `type: feature`, not ci-fix/close/rv) alternately
within a tier to `phased` or `control` until five assigned slices have merged. A phased slice runs
plan+red tests, build, and finish (lens batch, gate, PR) as separate sessions; each ends by writing
a handoff whose first line names the next phase, and `mr-launch.sh` starts the next one fresh from
the brief plus `mr-phase-protocol.md`. The main thread was 59% of build spend, its context averaged
275k tokens a turn and 87% of its cost was re-reading that context, so a reset at each boundary
targets the dominant cost directly. When the fifth assigned slice merges the tick records the
analysis (`phase-ab/analysis-*.md`, a pre-registered LEANING reading — n is tiny), disables the
experiment in the gitignored jsonl and files a non-blocking operator issue; phased runs stay off
until the changes it recommends are made. The Stop hook records a phase end as
`WOULD-RELEASE-phase-end`, so the arming baseline is not polluted. `mr-cost-sum` sums the transcript
witness over every session a log starts.
Rules out: four phases (a tests-only session pays a fresh prefix for one tester call), phasing
design/docs/refactor slices, and an open-ended experiment.

## A decision session is skipped only when its inputs equal those of a budget-held no-op session
After a decision session whose one DECISION line is a stand-down naming no action and holding every
ready candidate on the budget alone (`held=…:budget`; `mr-tick-fingerprint mark-ok`), the tick
re-reads every input a decision depends on — bundle decision fields, both repos' heads and open PRs
with their check states, specs, ledgers, doctrine and configs, state keys, flags, the date — and,
if nothing changed, writes `.noop-tick`. The next cron tick with the same fingerprint, no event, no
pending event and no credit-stop resume stands down free (`STANDDOWN unchanged-since-noop`), only
within 90 minutes of that session's start and while the plan's utilisation was sampled within 90
minutes: on the hourly cron at most one tick in a row is skipped, so the budget reading cannot go
stale behind skips. An unreadable input never matches. 34 of 245 paid sessions in 14 days only
stood down; the operator asked for free stand-downs only where they are accurate, and to pay rather
than risk stopping work, so only the budget hold is ever marked. Its one blind spot is accepted and
bounded: the plan can restore credit mid-window, and while nothing runs only a paid session takes
the reading that shows it, so with no live run a restore is seen at most one tick (an hour) later.
A window's own reset is never hidden — `mr-reset-watch` fires a `src=reset` tick, which never skips
— and a live run's sample changes the fingerprint. `NOOP_MAX_AGE_S=0` turns skipping off.
Rules out: predicting the session's decision in the wrapper, skipping event or manual ticks,
marking a stand-down whose cause clears with time alone (a human at work, a quiet window, a merge
left for the next tick), and writing the marker from the fingerprint alone (a failed attempt also
leaves the inputs unchanged).

## The residual backlog is worked by a periodic review, never capped
Every residual stays recorded until a documented disposition closes it. Every `every_merges` (12)
merged slices the supervisor launches an `rv-<utc>` review (`mr-residual-review-playbook.md`): a
routine, report-only run that checks the rows whose cited files changed since they were filed or since
an earlier verdict (`mr-residual-history sort`), gives each a verdict with evidence (FIXED needs the PR
and the covering test) in a verdict file later reviews read, and proposes at most two ranked fix
clusters. The supervisor re-checks a sample of the verdicts, applies them, promotes the clusters the
next tick, and builds them through the residual share in Pick work; a cluster's other rows are
dispositioned when its slice merges. Milestone elaboration folds
the open rows on its files into its slices (`mr-residual-history related`) and gives every
multi-slice flow a journey criterion, so fewer gaps become residuals at all. Measured 2026-11-26:
206 open rows (1 HIGH, 46 MED, 159 LOW) and 189 new ids in 14 days against about five fix slices.
A review is not due while an `rv-*` lock or PR is open in either repo (an unreadable harness PR
list counts as open).
Rules out: a ceiling that drops rows, age-based closing, and a review run that writes registry
rows or specs itself.

## Structural work is not ranked by a tool
A proposer/skeptic debate and a judge (2026-11-26) found that ordering structural slices by the
tokens they save decides nothing file order does not: `structure.spec.md`'s open slices are an
`after:` chain plus one ready design slice, and plan extraction lists are fixed-order. Reads are
concentrated (`client/src/main.ts` in 22 of 40 runs at about 73k characters a reading run;
`docs/DECISIONS.md` in 35 of 40 at about 39k: `memory/projects/readshare-2026-11-26.txt`), so st-21
takes that file as an input and the supervisor sections first the plan that moves code out of
`main.ts`.
Revisit when a tick finds more than five independent ready structural candidates, or three or more
refactor plans list extractions at once (the supervisor files the question); st-21's plan names the
extraction after which `main.ts` reads are measured again (a drop under 25% is an operator question,
not a ranking tool).


## The code-index daemon's writes count as human activity only while no build run is live
The tick's human-activity probe ignores `$PROJ/.codegraph/*` while a build run is live or one
ended inside the probe's 6-minute window: the daemon reindexes whatever the agents change, and in
the week to 2026-11-27 its files caused 90 of about 100 recent-writes stand-downs and about two
hours of merge and launch latency in one day (a finished slice waits through 7-minute retries).
With no run live or just ended the writes still count, so they remain the backstop for an edit a
human makes inside a worktree (operator, 2026-11-27).
Rules out: dropping `.codegraph` from the probe outright (mr-spawn's list), which loses that backstop.
