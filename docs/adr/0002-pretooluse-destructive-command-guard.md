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

## Confirmation
`scripts/tests/invariants.test.mjs` asserts `templates/_base/.claude/hooks/guard-bash.mjs`
exists and that `templates/_base/.claude/settings.json` wires PreToolUse → guard-bash.mjs;
runs in `just test` (in `just ci`). The harness-local hook's own rules are covered separately by
`.claude/hooks/guard-bash.mjs --selftest` (31 fixtures, both must-block and must-NOT-block),
which `memory/projects/mr-selfcheck` runs as check A7 — `just ci` never exercised the root hook.

## Amendment 2026-08-17 (lp-09) — the harness-local kill switch

`memory/projects/.native-supervisor-disabled` is the operator's only control over autonomous spend
while loop pacing is manual. `memory/projects/mr-hold` makes it provenance-aware: provenance is
checked on **clear**, never on **set**; absent, empty or unparseable provenance defaults to
**OPERATOR** and is never auto-cleared. That fail-safe is what lets the unchanged
`~/.local/bin/mr-supervisor-disable` (a bare `touch`, outside version control, so a `git revert`
here could not undo an edit to it) keep working with no out-of-repo change.

Decisions recorded here because they are guard-hook decisions:

- **Three flag rules are anchored at COMMAND POSITION** (`rm`/`mv` naming the flag,
  `mr-supervisor-enable`). An unanchored match blocked merely *writing about* the kill switch,
  including this slice's own tests and docs. An over-firing guard gets switched off, which is how
  decorative gates are born.
- **Write verbs are blocked too** (`tee`/`sed`/`chmod`/`truncate`/`cp`/`ln`/`unlink`/`touch` naming
  the flag, and any `>`/`>>` redirect onto it). Provenance lives in file *content*, so `rm` was never
  the only route: a session could write `by=supervisor` itself and then clear the hold through the
  perfectly sanctioned `mr-hold clear --by supervisor`. No local secret closes that — an adversary
  with the filesystem reads it too — so the mitigation is to make the write itself unavailable to a
  Bash call. `touch` is blocked for the mirror-image reason: a bare touch creates an *unattributed*
  hold that the fail-safe reads as OPERATOR, which the loop may then never clear, so a session could
  wedge the loop permanently by accident. Doctrine now orders `mr-hold set --by supervisor`.
- **REJECTED: narrowing the anchors with a `(?<!\\)` lookbehind.** The proposal was to stop the
  measured false positive where a `grep` pattern's BRE alternation `\|` reads as a shell pipe. The
  premise ("`\|` is always an escaped, literal pipe") is false for `\\|`: bash consumes `\\` as an
  escaped backslash, leaving a **real** pipe — verified, `bash -c 'true \\| echo X'` prints `X`. The
  lookbehind would therefore have let `true \\| rm …flag` through, trading an annoying false positive
  for a genuine bypass. The over-fire is accepted as fail-safe and pinned by a `--selftest` fixture
  whose comment carries this reasoning, so nobody re-opens the hole as a "cleanup".
- **Known, unclosed gaps, asserted as such by fixtures** so the guard is not misread as a sandbox:
  `settings.json` wires this hook to the **Bash tool only**, so `Write`/`Edit` bypass every rule;
  and `rm .native*` (glob), `python3 -c "os.remove(...)"` and `git clean -fdx` (the flag is
  gitignored) are not matched. The primary control remains `mr-hold`'s provenance check. Closing the
  Write/Edit gap needs a `.claude/settings.json` matcher — outside lp-09's declared touches, filed as
  a follow-up.
- **`templates/_base/.claude/hooks/guard-bash.mjs` intentionally does NOT carry these rules.**
  Generated projects have no `.native-supervisor-disabled`. The divergence is correct in both
  directions; do not "sync" it.
