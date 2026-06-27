---
description: Grow the SHARED consultant research library by fanning out researcher subagents over a list of topics (batch /research-domain). Verifies each doc landed, regenerates the index, and lints.
argument-hint: <topic1; topic2; topic3 ...>
---
Expand the shared research library (`<harness>/docs/research/`) with the topics in: $ARGUMENTS.

A dynamic fan-out workflow (orchestration depth = 1; subagents never spawn subagents):

1. **Dedupe first.** Read the shared `docs/research/INDEX.md`. For each requested topic decide:
   a NEW slug, or REFRESH an existing entry (reuse its slug, bump `updated` — never a parallel doc).
2. **Fan out.** Dispatch one `researcher` subagent per topic IN PARALLEL (batches of 3-4; cap the
   batch, no recursion), each in PERSIST mode following the `research-protocol` skill and writing to
   the shared library. Give each agent: the topic, its target slug + file path, and the research-protocol
   **Authoring standard** (project-agnostic, consultant voice, verify version-sensitive facts, confirm
   the write landed). Each returns ONLY its slug + a 5-line abstract — keep the dives out of this context.
3. **Verify each file landed.** A dropped/errored subagent can finish without writing and report nothing.
   After each batch, confirm every expected `docs/research/<slug>.md` exists and is complete; re-dispatch
   any that are missing or truncated.
4. **Regenerate + gate ONCE at the end** (not per-agent — avoids index races): `just research-index
   docs/research`, then `just research-index-check docs/research` and `just research-lint docs/research
   --shared`. Resolve any FAIL (project leakage, bad frontmatter, dup slug); WARNs (e.g. an over-long
   abstract) are advisory.
5. **Report** the slugs created/refreshed and any lint findings.

For one durable topic use `/research-domain`; for a throwaway question use `/deep-research`.
