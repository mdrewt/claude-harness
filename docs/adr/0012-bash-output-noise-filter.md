# 0012. Filter noisy Bash output by rewriting the command, not the result
- Status: accepted
- Date: 2026-08-22

## Context and problem statement

Agents in this workspace read an enormous amount of tool ceremony. Mining every
supervisor run log (`/tmp/mr_pass_*.log`) and every session/subagent transcript
under `~/.claude/projects/**` — 1,837 files, 977 MB — turned up **41,455 Bash
calls carrying 92,725,518 result characters, roughly 23.2M tokens**.

Those numbers are already *post*-filter. 80–99% of the heavy invocations were
hand-filtered by the agent that ran them (`just ci 2>&1 | tail -60`,
`node evals/run.mjs 2>&1 | grep -c PASS`, `cargo nextest run … | tail -25`).
Agents have effectively built a bad version of this feature by hand, one blind
`tail` at a time — blind because a fixed tail keeps whatever happens to be last,
which on a failing run is often not the failure.

Measured raw cost of a single green run of the common commands:

| command | raw | after |
|---|---|---|
| `cargo nextest run --workspace` | 227,406 B / 1,949 lines (1,942 of them `PASS`) | 176 B |
| `node evals/run.mjs` (87 evals) | 53,285 B, mean line 611 chars | 68 B |
| `client/node_modules/.bin/biome check .` | 16,641 B / 369 lines **at exit 0** | 2,691 B |
| `node --test ops/observability/validate.test.mjs` | 7,316 B (62 `✔` lines) | 674 B |
| `just ci` (composite, measured by summing its steps) | ~313,415 B / ~2,610 lines | — |

`BASH_MAX_OUTPUT_LENGTH` defaults to 30,000 characters, so the biggest of these
are *already* being truncated — in the middle, which is where the summary lives.

## Considered alternatives

- **A PostToolUse hook that rewrites the result — impossible.** Verified against
  the installed binary's own schema: a PostToolUse hook may return `decision`,
  `reason`, `systemMessage`, `suppressOutput` and `additionalContext`. There is no
  output-replacement field, and `additionalContext` *adds* tokens. Rejected on
  fact, not preference.
- **Lower `BASH_MAX_OUTPUT_LENGTH`.** Blunt, and it truncates the tail — deleting
  the verdict while keeping the compile wall. Strictly worse than the status quo.
- **An opt-in wrapper (`just quiet <cmd>`) plus AGENTS.md guidance.** No rewriting,
  no surprise. Rejected: the savings would depend on agents remembering, and the
  same corpus shows agents reaching for ad-hoc `| tail` instead of any documented
  convention.
- **Filter `cat` / `head` / `sed -n`.** They are the single largest family (32.3%
  of all result characters). Rejected: each names one file and one range, so every
  byte was individually asked for. Capping them would misrepresent file contents
  rather than trim tool ceremony.

## Decision outcome

Chosen: a **PreToolUse(Bash) hook that rewrites the command** to run under a
filtering wrapper — `.claude/hooks/quiet/`, four modules plus a gate.

- `quiet-bash.mjs` — the hook. Rewrites only commands it can read literally.
- `quiet-run.mjs` — runs the command, streams the signal, tees the complete raw
  output to a log whose path it prints, exits with the child's code.
- `quiet-lib.mjs` — matching + filtering engine.
- `quiet-profiles.mjs` — the rule tables, every one written against a captured
  sample committed under `fixtures/`.

Design commitments, each forced by something measured:

1. **Fail open everywhere.** A line matching no rule is KEPT; a command whose shape
   is not literally readable (pipes, `&&` chains, redirects, command substitution,
   unbalanced quotes) is not rewritten at all. This is what makes the adversarial
   findings survivable: nextest `LEAK` lines, compile-failure "false greens" that
   print no summary, and multi-line `eval THREW:` continuations are all preserved
   without any rule naming them.
2. **The rewrite is one operator-free command.** The *rewritten* command is
   re-parsed by the permission layer — a probe rewrite containing `;` came back as
   "This Bash command contains multiple operations. The following part requires
   approval". So the rewrite is `node <abs>/quiet-run.mjs --profile=… --sid=…
   --b64=…`, and base64url carries no shell metacharacter.
3. **Rewriting can launder permissions, and is contained.** A `cargo` call reaches
   the permission layer as a `node` call. `quiet-run.mjs` therefore refuses any
   decoded command that matches no profile, and re-invokes the sibling
   `guard-bash.mjs` on the decoded command — reusing the real guard rather than
   duplicating a rule table that has already rotted into three divergent copies.
4. **Targeted runs keep their passing lines.** Scope is derived from the command,
   not the output: `cargo nextest run -p game-core` and
   `node evals/foo.eval.mjs` show their passes; `--workspace` and bare
   `evals/run.mjs` withhold them. A run scoped to what was just worked on has
   passes that confirm the fix.
5. **Nothing is destroyed.** Every run tees its complete output to
   `$TMPDIR/claude-quiet-logs/<session>/`, and the banner names the file and the
   `NOFILTER=1` re-run.

Consequences: the executed command differs from the literal command the model
emitted (visible in the transcript, and `description` carries the original). Two
places gained a filter that must not eat signal, so the gate replays committed
real-output fixtures and asserts that specific debugging anchors — the panic
message, the `file:line`, the assertion diff, `ℹ pass N` — survive.

### Changed by the adversarial review pass

A four-lens review (correctness, signal loss, integration, abuse) with every finding
independently reproduced by execution returned **21 confirmed, 0 refuted**. Most were
already neutralised by fail-open; these were real and are fixed here:

- **A test filter that matched nothing looked green.** `cargo test some_typo` exits 0,
  and the only line distinguishing it from success is `… N filtered out`. That whole
  shape was dropped. Now only the genuinely empty `0 filtered out` ceremony is
  withheld, as a defer.
- **`Running unittests …` was dropped**, so on a workspace sweep a crate whose tests
  all compiled out vanished without trace. It is libtest's only per-binary
  attribution; now deferred, so the count survives.
- **Withheld lines were replayed after a failure verdict**, reading as though the
  passes happened last. Replay is now green-runs-only.
- **`Adding`/`Removing`/`Locking`/`Updating` were dropped as build progress.** They
  report a dependency-graph change, which this workspace treats as a decision
  requiring an ADR. Removed from the rule.
- **`biome/prose` matched `✖` and `⚠`** — glyphs belonging to *other* tools' failure
  and warning lines, and that rule is unioned into the `just` composite.
- **`templates/_base/biome.json` lints `**`**, so the hook's own files made
  `just lint` fail in every freshly scaffolded node project. Reproduced with the real
  scaffolder; the files are now biome-clean under that config.
- **`npm install <pkg>` and `cargo --config …` were wrapped.** Both are decisions
  rather than gates, and both are laundering vectors. Only the argument-free restore
  forms are covered now.
- **The wiring granted `Bash(node:*)`** to monster-realm and to `~/.claude`, where no
  Bash allow rule existed before — far wider than the wrapper. Reverted; the wrapper
  relies on whatever already governs the session.
- **`NOFILTER=1` was ignored after a `cd <dir> &&` prefix.** An escape hatch that does
  not escape is worse than none.
- **The `search` profile collapsed blank runs**, contradicting its "removes nothing"
  contract and editing `grep -C` record separators.
- **A raw NUL byte** made `quiet-run.mjs` binary to git and grep — no line diff, no
  `git grep`, in a repo whose review workflow is diffs.
- **`process.exit()` discarded queued stdout**, truncating the hook's JSON for
  commands past the pipe buffer. Now flushed through the write callback.
- **The gate ran against the live `/tmp/claude-quiet-logs`** and pruned other
  sessions' raw logs, from a lefthook pre-commit hook. It now uses an isolated root.

### Rejected during implementation, recorded so they are not re-tried

- **A "always keep the last N lines" guard.** It resurrected the very lines the
  drop rules had removed (both `Compiling` lines of a 3-line fixture came back).
  Fail-open plus explicit per-profile summary rules covers the same risk.
- **Verbose mode promoting withheld lines back to keeps.** On a re-run after a
  failure it restored all 200 passing lines of a 201-test fixture — i.e. re-running
  a red 1,590-test suite would return the entire pass wall.
- **Deriving the withheld count as `total − emitted`.** Synthesised summary lines
  are counted in one and not the other, so the banner could claim "nothing
  withheld" on a run that dropped lines.
- **A "verbose on re-run after a failure" mode.** Every safe version of it changed
  zero output bytes, while the banner announced it as active — a banner that lies
  about what the filter did is worse than no mode at all. Removed. The per-command
  `NOFILTER=1` escape hatch covers the same need explicitly.
- **An always-keep-the-last-N-lines guard** (see above) and **promoting withheld
  lines on verbose** (see above).

### Accepted limitations

- On a green sweep, `eval PASS:` detail strings are withheld. They are recoverable
  from the raw log, **not** by re-running a single eval — 75 of the 87 eval files
  print nothing when run individually.
- biome `format` and `deserialize` diagnostics carry no `line:col` in their header,
  so those two kinds reduce to a filename. `lint/*` diagnostics keep their location.
- Under the `just` composite, biome's code-frame rule can also match an esbuild-style
  frame, costing the rendered source line. The error message and its `file:line:col`
  survive via the source-location guard.
- `scripts/sync-templates.mjs` only updates files a project already has, so it cannot
  seed the hook into the five sub-projects that lack it. Those are covered by the
  user-level `~/.claude` wiring instead.

## Confirmation

`.claude/hooks/quiet/quiet.test.mjs` (33 tests) runs in `just test`, and therefore
in `just ci`. It drives the hook and the wrapper as real processes through their
actual entry points, and replays the committed fixtures in
`.claude/hooks/quiet/fixtures/` to assert both directions: that green sweeps
collapse, and that every debugging anchor of a failing run survives.

`scripts/tests/invariants.test.mjs` asserts that `templates/_base` ships the hook,
that `_base/.claude/settings.json` wires it, that the harness and `_base` copies
are byte-identical, and that the rewrite contains no shell operator.

`just setup-claude --check` verifies the `~/.claude/hooks/quiet` link.
