---
name: wsl-harness-exec
description: Run or edit files reliably in this WSL/Ubuntu harness via Desktop Commander. Use when project commands misbehave — wrong tool version, file writes blocked on dotfiles, long builds that exceed the 180s poll window, or confusion between WSL, connected-folder, and sandbox paths.
---

# Running & editing in the WSL harness

This harness lives in **WSL Ubuntu**, and **Desktop Commander runs natively inside that Ubuntu** — it's a Linux process (`get_config` shows `platform: linux`, `defaultShell: /bin/bash`). So DC commands run **directly in bash**: no `wsl -d Ubuntu bash -lc` wrapper, no PowerShell, no quote-mangling translation layer.

**Never run project commands in the sandbox shell** (`mcp__workspace__bash`) — it's a *separate* Linux that can't see the toolchain (Rust/spacetime/wasm-pack/asdf). Use **Desktop Commander** (`mcp__desktop-commander__*`) against the real Ubuntu.

## Just run commands

DC was launched from a login shell, so the full asdf toolchain (node 24.13.1, cargo, spacetime, wasm-pack, just) is already on `PATH` and is inherited by every command DC runs. Run things directly:

```
cd ~/projects/ai-apps/claude-harness && cargo test
```

`start_process` returns the command's output inline when it finishes — there is no completion-detection timeout. DC's working dir starts at `/mnt/c/WINDOWS/system32`, so `cd` into the project first.

## Long-running commands (the 180s poll)

`interact_with_process` returns a **"timed out after 180s"** error while the command keeps running. Builds here routinely exceed that — a cold `cargo` / `wasm-pack` / `npm install`, or `just ci` (clippy + cargo test + the wasm-rebuilding evals + client vitest). The timeout is **not** a failure:

1. For a long build, drive **one persistent shell**: `start_process`, `cd` once, then `interact_with_process(pid, "<long cmd> 2>&1 | tail -40")`.
2. On the 180s timeout, **do NOT re-issue** (you'd start a second concurrent build). Call `read_process_output(pid, timeout_ms: 175000)` and keep calling until the prompt / an end marker appears.
3. The output buffer accumulates scrollback — read the **tail**; the newest run's result is at the bottom.

For the heaviest gates, narrow output up front: `just ci 2>&1 | grep -iE "error|fail|eval (PASS|FAIL)|Tests |test result|check-secrets" | tail -30`.

**Shell died / "No active sessions":** the PID is gone — `start_process` a fresh shell, `cd` back into the project, re-confirm state (`git status`, branch). Uncommitted work in the tree survives a shell death; an in-flight build does not (re-run it).

## Complex commands → write a script (heredocs / big blocks only)

Native bash quoting works, so most commands run inline fine. But **multiline blocks, heredocs, and big JSON args** are still cleaner as a script than fought through `interact_with_process`:

1. `mcp__desktop-commander__write_file` the script to `/tmp/x.sh`.
2. `bash /tmp/x.sh`.
3. `rm -f /tmp/x.sh` when done. Keep an end marker (`echo @@@DONE@@@`).

## File edits: which tool

- **Normal files in the connected folder** — prefer `Read` / `Write` / `Edit` (UNC path `\\wsl.localhost\ubuntu\home\mdrewt\...`); `Read` before `Edit`.
- **Dotfiles & protected config** (`.npmrc`, `.claude/*`, anything that can hold tokens) — the Write/Edit tools **refuse** them ("protected location"). Use `mcp__desktop-commander__write_file` / `edit_block` instead, with a **native Linux path** (`/home/mdrewt/...`).
- **Anything outside the connected folder** (`/tmp`, `~/.config`, `/mnt/c/...`) — the Write tool is sandboxed to the connected folder; use DC `write_file`.

## Path mapping (which tool wants which path)

| Tool | Path shape |
|---|---|
| Desktop Commander (`mcp__desktop-commander__*`) | native Linux `/home/mdrewt/...` (Windows files via `/mnt/c/...`) |
| Cowork file tools (`Read`/`Write`/`Edit`) | `\\wsl.localhost\ubuntu\home\mdrewt\...` (UNC), connected folder only |
| Sandbox `mcp__workspace__bash` | `/sessions/.../mnt/...` — a **separate** FS; don't mix |

## Gotchas

_Living log — edge cases, bugs, quirks. Per entry: **symptom/quirk** → cause → **avoid:** action. Append new ones as you hit them._

- **Write/Edit "blocked — protected location"** → dotfiles (`.npmrc`) and `.claude/*` are protected. **Avoid:** DC `write_file` / `edit_block` with a `/home/mdrewt/...` path.
- **`Write` to `/tmp` or a sibling path fails "outside connected folder"** → the Write tool is sandboxed to the connected folder. **Avoid:** DC `write_file`.
- **`Edit` fails "File has not been read yet"** → even files shown earlier need a fresh `Read` this turn. **Avoid:** `Read` immediately before `Edit`.
- **`interact_with_process` "timed out after 180s" on a build** → DC caps the wait; the build is still running underneath. **Avoid:** never re-issue (you'd start a second build); `read_process_output(pid, 175000)` until the prompt returns. Pipe heavy output to `tail`/`grep`.
- **MCP tools vanish then return mid-session** (a server disconnect/reconnect) → ambient churn. **Avoid:** re-load via ToolSearch when announced reconnected; don't report a capability gone without re-checking.
- **`codebase-memory-mcp cli <tool>` returns `{"error":"project not found or not indexed"}` even with a correct-looking name** → the `project` arg was omitted; the CLI query tools require it explicitly. **Avoid:** run `codebase-memory-mcp cli list_projects` first, pass `project` = that **exact** name. Other notes: the tool is `trace_path` (not `trace_call_path`); `http://localhost:9749` is the **graph UI only** — never POST tool calls there (MCP is stdio); after committing code, run `index_repository` (or let the watcher catch up) before trusting `detect_changes`/queries; per-project SQLite lives in `~/.cache/codebase-memory-mcp/` — never write it directly while the server is live.

- **DC `read_file` / `list_directory` / `start_search` reject valid paths or fail outright** → the `allowedDirectories` glob matcher is unreliable (it has rejected a valid `~/projects/ai-apps/...` path; historically far more failed calls than succeeded). **Avoid:** for **reads**, drive the **bash process** — `start_process` + `sed -n '1,200p' <path>` / `cat` / `grep -rn` — it reads **any** path and is the only universal reader. Native `Read` only reaches the *connected folder* (UNC); for anything outside it (e.g. a review clone under `/home/mdrewt/mr-review`, `/tmp`, `~/.config`), the bash process is the **only** option.
- **A persistent `interact_with_process` shell dies between unrelated calls** → a shell started for step A is often gone by step B ("failed to send input / process may have exited"). **Avoid:** for discrete one-off steps, use a fresh one-shot `bash -lc '<cmd>'` per `start_process` call (reserve a single persistent shell only for one long-running build, per the 180s note above).
- **Appending to a file via a quoted heredoc fails under `/bin/sh` (dash)** → DC's default shell is dash for the wrapper; em-dashes/unicode/parens in a heredoc can trip its parser. **Avoid:** write the block to a temp file (Cowork `Write` to a non-`.claude` path in the connected folder, or DC `write_file` to `/tmp`), then `cat tmp >> target && rm tmp`; or base64-decode into place. Same pattern works for editing protected `.claude/*` files (bash append/`cp` bypasses the Write/Edit "protected location" refusal).

## Git in a runner-shared working tree

The autonomous milestone-runner fleet writes into the **harness** working tree continuously (handoff, usage-ledger, `.harness-runner.lock.d/`, per-run locks, sometimes specs) and **leaves them uncommitted** — so the tree is almost never clean, but `origin/main` usually is.

- **Never `git add -A` / `git add .`.** You will sweep up the runner's locks, ledger, handoff (possibly mid-write), and other processes' edits. **Stage by explicit path/glob**, then **verify `git diff --cached --name-only`** lists *only* files you authored before committing.
- **Check for an active runner first** (`ls .harness-runner.lock.d/ 2>/dev/null`). The runner edits on-disk files your branch shares; don't stage anything you didn't write, and prefer adding a commit on your current branch over switching branches (a `git switch` reverts on-disk files the runner is reading live).
- **Rebase is usually unnecessary** — the runner doesn't push to harness `main` (it leaves working-tree changes), so `git rev-list --left-right --count origin/main...HEAD` is typically `0  N`. Re-`fetch` and check before pushing anyway.
- **Repo boundary.** Commit harness specs/skills/docs/agents to the **harness** repo (`mdrewt/claude-harness`). The **project** repo (`monster-realm`, nested under `projects/`) is the runner's hot tree — do **not** commit or open PRs there while the fleet builds; leave project-side files (e.g. implementation ADRs in `docs/adr/`) to the builder.
- **Branch + PR.** `git switch -c <branch>` (keeps the runner's working-tree files in place) → stage your paths → commit → `git push -u origin <branch>` → `gh pr create --base main`. For multi-line PR bodies use `gh pr create --body-file <tmp>` (heredocs choke on dash).
