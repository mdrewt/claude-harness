---
description: Deep-dive a domain and PERSIST it as a reusable research doc (vs throwaway /deep-research).
argument-hint: <topic/domain>
---
Delegate to the researcher subagent in PERSIST mode (skill: research-protocol) for:
$ARGUMENTS. **Pick the tier:** general/reusable domain knowledge → the **shared harness
library** (`<harness>/docs/research/`, the default); genuinely project-specific findings →
the project's `docs/research/`. FIRST check that library's INDEX.md: if the topic is already
covered, refresh that doc in place (reuse its slug) instead of creating a new one — no
duplicate research. Otherwise it explores web + code in its own context and writes
`docs/research/<slug>.md` with full frontmatter (general docs use "Design implications &
transferable principles"); the index regenerates automatically via the write hook. Return
ONLY the slug + a 5-line abstract — keep the dive out of the main context. For a throwaway
question, use /deep-research instead.
