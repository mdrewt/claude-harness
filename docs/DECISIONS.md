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
Rules out: holding a pause on the highest reading of a window, standing the loop down on a
reading older than the freshness bound, dropping a model's stale over-threshold reading (the
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
(a comment written for the tool to parse). This is the one sanctioned source-text scan; it does
not license others (`standards/testing-tdd.md`).
