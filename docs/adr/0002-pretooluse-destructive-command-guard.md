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

- **Flag rules are anchored at COMMAND POSITION** (`rm`/`mv` naming the flag,
  `mr-supervisor-enable`, the write verbs). An unanchored match blocked merely *writing about* the
  kill switch, including this slice's own tests and docs. An over-firing guard gets switched off,
  which is how decorative gates are born.
- **The anchor's definition of "command position" was wrong, and it was a real bypass.** It read
  `(^|[;&|(]\s*)`; these regexes carry no `m` flag, so `^` is *string-start only* and the separator
  class omits `\n`. A single leading space, or an ordinary two-line Bash call (`ls -la` ⏎
  `rm …/.native-supervisor-disabled`, no `;`), therefore matched **nothing** — for the pre-existing
  `rm`/`mv` rules as much as the new ones. Two independent review lenses found it by execution. Now
  `(^\s*|[;&|(\n]\s*)`, with fixtures pinning the leading-space, leading-tab and newline-separated
  cases for `rm`, `touch` and `cp`. Widening an anchor can only block more, which is the fail-safe
  direction for a spend control.
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
- **Known, unclosed gaps, every one pinned by a `--selftest` fixture** so the list can never quietly
  diverge from the code, and so nobody mistakes this hook for a sandbox:
  `settings.json` wires it to the **Bash tool only**, so `Write`/`Edit` bypass every rule; and the
  pattern cannot see through indirection — `bash -c '…'`, `xargs rm`, `find -exec rm {} +`,
  `F=…; rm "$F"`, `python3 -c "os.remove(...)"`, a glob instead of the literal name, or
  `git clean -fdx` (the flag is gitignored). What the hook buys is that the *casual* route — the one
  a session takes without meaning to defeat anything — is closed; the primary control remains
  `mr-hold`'s provenance check. Closing the Write/Edit gap needs a `.claude/settings.json` matcher —
  outside lp-09's declared touches, filed as a follow-up. An `env`/`sudo`/`command`/`nohup`/`time`/
  `exec` prefix IS tolerated by the verb rules (those are one-token wrappers an agent reaches for
  casually), and `dd`/`install`/`rsync`/`shred` are in the verb list for the same reason `cp` is.
- **`templates/_base/.claude/hooks/guard-bash.mjs` intentionally does NOT carry these rules.**
  Generated projects have no `.native-supervisor-disabled`. The divergence is correct in both
  directions; do not "sync" it.
## Amendment 2026-08-22 (red-team) — the anchor tolerated no path prefix, so every rule was bypassable

The lp-09 amendment above says the fail-safe "lets the unchanged `~/.local/bin/mr-supervisor-disable`
(a bare `touch`, outside version control) keep working with no out-of-repo change." **Both halves of
that are now superseded.** `lp-11a` had already vendored a tracked, provenance-recording wrapper at
`memory/projects/mr-supervisor-disable` on 2026-08-17; only its `ln -sf` adoption step was never run,
which is why the bare `touch` stayed live for five days. It is adopted as of 2026-08-22, and
`mr-selfcheck` check **B2** now fails while `~/.local/bin/mr-supervisor-disable` does not resolve to
the tracked file.

**The guard defect, which is the reason this amendment exists.** Every rule is built by the shared
`at()` helper, whose anchor was `(?:^|[;&|(\n])\s*` — start-of-line or a separator, then only
WHITESPACE before the verb. A path prefix puts a `/` there, so the rule matched nothing. Verified by
feeding literal strings to the hook's stdin (executing nothing): the absolute-path form of **every
rule in the file** was allowed, including `rm -rf`, force-push to `main`, write verbs on the hold
flag, and — worst — the operator's kill-switch clear. That last one falsified the guarantee in
`memory/projects/mr-native-supervisor-README.md` that "an agent session cannot clear an operator
hold": a session needed only `which mr-supervisor-enable` and then that literal path. No indirection,
no adversarial sophistication, and `.claude/settings.json`'s `permissions.deny` carries no
`mr-supervisor-*` entry to catch it, so this hook was the sole control.

**This was NOT one of the KNOWN, UNCLOSED GAPS** enumerated in the hook (`bash -c`, `xargs`,
`find -exec`, variable indirection, `os.remove`, globs, `git clean`). Those are all indirection. This
was the direct route, undocumented and unpinned — 81 selftest fixtures, not one of which invoked a
rule by path. **A gap list is only as honest as the fixtures behind it**, which is why the fix ships
with pins for every closed route *and* for the reads and prose that must stay allowed.

Decisions:

- **Tolerate a path prefix ONCE, in `at()`** (`PFX`), never per-rule — the same reason `WRAP` lives
  there. Per-rule tolerance is what let the anchor drift between rules the first time.
- **Shell names join `WRAP`** (`bash|sh|zsh|dash|ksh`), closing `bash <path-to-guarded-wrapper>`,
  which ran the tracked copy of the operator's pause straight past the rule written to stop it.
  **Accepted cost, measured during this very change rather than discovered later.** Two shapes now
  trip the guard that did not before: syntax-checking a guarded wrapper (`bash -n <it>`), and any
  command whose CONTINUATION LINE begins with a path to one — a multi-line `git add` listing the
  tracked wrapper is blocked, because a line start is a command position and the path now matches.
  Both have one-line workarounds (copy the file first; keep the paths on a single line). Widening
  blocks more, which is the fail-safe direction for a spend control, and silently launching the kill
  switch is not recoverable as cheaply as an extra `cp`. Recorded because an over-firing guard whose
  costs are undocumented is the kind that gets switched off — and that is how decorative gates are
  born.
- **Reads and prose stay allowed**, pinned by must-NOT-block fixtures (`echo`/`ls`/`grep`/`cat` of
  the very same paths). An over-firing guard gets switched off, which is how decorative gates are
  born — the same reasoning that anchored these rules at command position originally.

**Not fixed here:** `projects/monster-realm/.claude/hooks/guard-bash.mjs` carries the identical
helper and the identical defect. It is a separate repository and needs its own PR.
`templates/_base/.claude/hooks/guard-bash.mjs` predates the `at()` helper and is unaffected.

## Confirmation

`node .claude/hooks/guard-bash.mjs --selftest` in `claude-harness` — **96 fixtures**, up from 81,
with the 15 additions pinning each bypass closed and each read still open. `memory/projects/mr-selfcheck`
runs the hook's selftest as check A7, so a regression reds the loop's daily corpus gate.
