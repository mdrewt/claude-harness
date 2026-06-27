---
description: Deep-dive a domain and PERSIST it as a reusable research doc (vs throwaway /deep-research).
argument-hint: <topic/domain>
---
Delegate to the researcher subagent in PERSIST mode (skill: research-protocol) for:
$ARGUMENTS. It explores web + code in its own context and writes
docs/research/<slug>.md with full frontmatter; the index regenerates automatically via
the write hook. Return ONLY the slug + a 5-line abstract — keep the dive out of the main
context. For a throwaway question, use /deep-research instead.
