---
name: context-hygiene
description: Practices to prevent context rot during long sessions. Use when a session is sprawling, mixing tasks, or quality is degrading.
---
Apply `~/.claude/harness/docs/context-hygiene.md`: keep always-on context thin; push exploration
into the researcher subagent via `/deep-research`; read `memory/index.md` then
only the relevant card; `/compact` at task boundaries, `/clear` between unrelated
tasks, `/btw` for throwaway questions; start a fresh context per task to avoid
long-horizon drift.

## Gotchas

_Living log — edge cases, bugs, quirks. Per entry: **symptom/quirk** → cause → **avoid:** action. Append new ones as you hit them._

- **Specifics lost after a long session / compaction** → context rot drops exact strings, paths, and decisions from the running summary. **Avoid:** persist durable facts to `memory/`; re-`Read` a file before acting on it rather than trusting recall.
- **A fresh subagent re-derives cold context (extra tokens, slower)** → a new spawn starts from nothing. **Avoid:** continue an existing agent (SendMessage) when continuity matters; spawn cold only when you need isolation.
