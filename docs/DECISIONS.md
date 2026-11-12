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
or the session transcript's `cost-state` when that reports more.
Each build session gets exactly one ledger cost row, keyed by the launch stamp in its pass log
(`mr-record ledger --from-log`), and the usage ledger is append-only — a wrong figure is
corrected by appending a signed negative `CORRECTION` row, never by rewriting. Budget governance
is only as good as the ledger: summing result events or per-attempt totals double-counts a
resumed run, and judging "already recorded" from the slice name and a time window drops the row
of every relaunch.
Rules out: hand-summing costs at call sites, deciding a session is recorded from its slice name
and a time window, and editing ledger rows in place.

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
