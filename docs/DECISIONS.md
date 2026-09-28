# Decisions (harness)

Per `standards/decisions.md`: the choices that constrain this workspace today and aren't
re-derivable from the code in minutes. The full pre-2026-09 ADR corpus lives in git history
(`git log -- docs/adr`); its retired process is documented in `docs/revision-2026-09/`.

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
Claude CLI logs report cumulative `total_cost_usd`; per-run cost is reconstructed by
`mr-cost-sum` (the single implementation), and the usage ledger is append-only — a wrong figure
is corrected by appending a signed negative `CORRECTION` row, never by rewriting. Budget
governance is only as good as the ledger, and three naive summation copies measurably drifted
before the SSOT existed.
Rules out: hand-summing costs at call sites and editing ledger rows in place.

## Noisy Bash output is filtered by rewriting the command, not the result
The quiet hook rewrites recognized noisy commands to a tee-to-log wrapper that withholds pass
walls while keeping failures, diagnostics, and summaries whole; the full log path is printed,
and `NOFILTER=1` bypasses. Post-hoc result truncation loses exactly the failure lines that
matter (measured), while command rewriting keeps the complete output recoverable.
Rules out: `| tail -N` habits on gate commands, and filtering that touches piped/complex
commands (they're left alone by design).
