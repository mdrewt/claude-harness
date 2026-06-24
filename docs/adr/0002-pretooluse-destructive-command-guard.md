# 0002. Ship PreToolUse destructive-command guard to generated projects
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
The permission deny-list blocks some dangerous shell operations, but not all
(e.g. `drop database`, `truncate table`, `reset --hard origin`). The README
promises every generated project "carries a minimal copy of those guardrails."
We need defense-in-depth that travels with each project and cannot be silently
dropped.

## Considered alternatives
- Rely on the permission deny-list alone — rejected: incomplete coverage of
  destructive commands.
- A shell hook (`guard-bash.sh`) — rejected: not portable; POSIX shell/grep is
  absent on Windows, so the guard would silently no-op (the same trap that
  motivated moving validators to Node).

## Decision outcome
- Chosen: ship a portable Node `PreToolUse` hook (`.claude/hooks/guard-bash.mjs`)
  in `_base`, wired via `_base/.claude/settings.json`, matching `Bash` calls.
- Consequences: destructive commands are blocked across platforms; an invariants
  test asserts the hook file and its `settings.json` wiring exist so it can't be
  dropped from a new stack.
