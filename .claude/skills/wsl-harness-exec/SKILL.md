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
