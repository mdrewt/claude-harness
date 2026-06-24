# 0003. Auto-format edited files via a PostToolUse hook
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
Agent edits that aren't formatted/linted to standard fail late at `just ci`,
wasting a full loop. We want formatting applied immediately after each edit.

## Considered alternatives
- Format only at `just ci` / pre-commit — rejected: failures surface late, after
  the agent has moved on.
- Editor-based formatting — rejected: agents don't run an interactive editor.

## Decision outcome
- Chosen: ship a `PostToolUse` hook (`.claude/hooks/format-edited.mjs`) in `_base`
  that runs the stack formatter (Biome/Ruff/rustfmt) on `Write|Edit|MultiEdit`
  outputs, wired via `_base/.claude/settings.json`.
- Consequences: edits are normalized on the spot; an invariants test asserts the
  hook file and `settings.json` wiring exist so it can't be silently dropped.
