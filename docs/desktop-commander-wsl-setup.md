# Desktop Commander → WSL: setup & autostart runbook

Move Desktop Commander (DC) from the Windows DXT extension to running **inside Ubuntu/WSL**,
and keep WSL warm so it's always ready. This removes the whole class of problems hit on
Windows: the `defaultShell` resetting to PowerShell, the PowerShell→wsl quote-mangling, the
`wsl -d Ubuntu bash -lc "…"` wrapper, and the `\\wsl.localhost\…` UNC path juggling.

> Execute this **after** you're ready to restart Claude Desktop (a couple of steps require a
> full restart, which ends the current chat). This file lives in the harness so it's still
> here after the restart.

---

## Read first — how the model actually works

DC is a **stdio MCP server**: Claude Desktop launches it as a child process and talks to it
over stdin/stdout. It is **not** a background daemon. So "autostart DC when WSL begins" isn't
literally possible — Claude Desktop starts DC on demand. What we *do* make autostart is the
**Ubuntu distro itself** (boot at login + a keep-alive), so the distro is always warm and DC
launches into it instantly. That also keeps your detached build loop alive when Claude
Desktop is closed.

## Verified facts about your machine (so the steps below are exact)

- Distro name: **`Ubuntu`** (24.04.4 LTS), default user **`mdrewt`**, **systemd enabled**
  (`/etc/wsl.conf` has `[boot] systemd=true`).
- A child of a `bash -lc` login shell inherits the **full toolchain**: `node v24.13.1`
  (asdf shims), `cargo`/`rustc`/`wasm-pack` (`~/.cargo/bin`), `spacetime` + `claude`
  (`~/.local/bin`), `just`, `git`. → DC started via `bash -lc` passes all of this to every
  command it runs.
- `claude_desktop_config.json` currently has **no `mcpServers`** section — DC is installed as
  a DXT extension (managed in Settings → Extensions), so the switch is "disable the extension
  + add a manual `mcpServers` entry."
- A `bash -lc` startup produces clean stdout (MCP-safe).

---

## Step 0 — Pre-flight (so rollback is trivial)

- **Disable** the Desktop Commander DXT (don't uninstall yet) so you can re-enable it in
  seconds if needed.
- Back up the config: copy
  `C:\Users\mdrewt\AppData\Roaming\Claude\claude_desktop_config.json` to `…\claude_desktop_config.json.bak`.

## Step 1 — Install Desktop Commander inside WSL

Open an Ubuntu terminal and run:

```bash
npm install -g @wonderwhy-er/desktop-commander
asdf reshim nodejs          # REQUIRED: global npm bins land in the asdf node dir; reshim exposes them on PATH
which desktop-commander     # expect: /home/mdrewt/.asdf/shims/desktop-commander
# if the name differs, find it:
ls "$(npm config get prefix)/bin" | grep -i desktop
desktop-commander --version
```

The `asdf reshim` step is the one easy-to-miss detail on an asdf setup — without it the binary
exists but isn't on `PATH`.

**Alternative (no install):** skip this step and use `npx -y @wonderwhy-er/desktop-commander`
in the config below. Simpler, but each launch re-resolves the package (slower, needs network).
The global install is faster, offline-capable, and pins the version until you reinstall.

## Step 2 — Point Claude Desktop at the WSL server

1. **Settings → Extensions** → disable Desktop Commander (the DXT).
2. **Settings → Developer → Edit Config** (opens `claude_desktop_config.json`). Add a top-level
   `mcpServers` key as a sibling of `coworkUserFilesPath`/`preferences`:

   ```json
   "mcpServers": {
     "desktop-commander": {
       "command": "wsl.exe",
       "args": ["-d", "Ubuntu", "bash", "-lc", "exec desktop-commander"]
     }
   },
   ```

   - If you skipped Step 1, make the last arg `"exec npx -y @wonderwhy-er/desktop-commander"`.
   - Mind the JSON commas — it must be valid JSON (e.g. add a trailing comma after the
     `mcpServers` block if it's not the last key).
3. **Fully quit** Claude Desktop (tray icon → Quit, or Ctrl+Q) and reopen. Closing the window
   is not enough — the MCP servers only reload on a real restart.

## Step 3 — Verify

In a new chat, confirm DC is healthy and now native:

- DC tools are present.
- Ask it to run: `uname -a` → Linux; `node -v` → **v24.13.1**; `pwd` → `/home/mdrewt…`.
- Check `get_config` → `defaultShell` is a Linux shell (e.g. `/bin/bash`), **not**
  `powershell.exe`.
- Restart Claude Desktop once more and re-check `get_config` → it should **still** be bash.
  That's the persistence problem fixed: a Linux DC defaults to bash, and its config now lives
  in your WSL home so it survives restarts.
- Note the behavior change: DC file ops (`read_file`/`write_file`) now take **Linux paths**
  (`/home/mdrewt/…`), not `\\wsl.localhost\…` UNC.

## Step 4 — Autostart Ubuntu at login + keep it warm

Two pieces, both optional but recommended (especially if you want the build loop to keep
running while Claude Desktop is closed):

**(a) Boot Ubuntu at Windows login — Task Scheduler**
- Task Scheduler → Create Task… → General: name "Start Ubuntu (WSL)", "Run whether user is
  logged on or not" is fine; check "Hidden".
- Triggers → New → "At log on" (your account).
- Actions → New → Program/script: `wsl.exe`, Arguments: `-d Ubuntu -e true`.
- This boots the distro at login, which starts systemd.

**(b) Keep it warm — systemd (already enabled)**
This is the literal "autostart when WSL begins": an enabled service that runs on every distro
boot and holds the distro open so WSL doesn't idle it out. In Ubuntu:

```bash
sudo tee /etc/systemd/system/wsl-keepalive.service >/dev/null <<'EOF'
[Unit]
Description=Keep WSL (Ubuntu) warm for Desktop Commander and the build loop
After=multi-user.target

[Service]
ExecStart=/bin/sleep infinity
Restart=always

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now wsl-keepalive
systemctl status wsl-keepalive --no-pager
```

**(c) Optional belt-and-suspenders:** prevent the WSL2 VM idle shutdown globally by adding to
`C:\Users\mdrewt\.wslconfig`:

```ini
[wsl2]
vmIdleTimeout=-1
```

(Then `wsl --shutdown` once to apply. Only needed if you still see the distro stopping.)

## Step 5 — Post-switch follow-ups (I can do these for you afterward)

- **Harness docs:** with DC native in WSL there is no PowerShell fallback and no
  `wsl -d Ubuntu bash -lc` wrapper *at all*. The `wsl-harness-exec` skill and the
  `monster-realm-v2-milestone-runner` task SKILL should be simplified to "DC runs natively in
  WSL — run commands directly." (We kept the wrapper as a documented fallback precisely because
  the Windows setup was flaky; once you're on WSL it's dead weight.)
- **`start_process` timeout quirk** may *improve* — a native bash gives DC a prompt to detect
  command completion on, so the cosmetic "timed out" may stop happening. Re-test after switching.
- **Build loop** (native `claude` in WSL) is unaffected — it never used DC.

## Rollback

If DC doesn't connect after the restart:
1. Re-enable the Desktop Commander DXT (Settings → Extensions).
2. Remove the `mcpServers` block from `claude_desktop_config.json` (or restore the `.bak`).
3. Restart Claude Desktop.

If it connects but a command can't find a tool (e.g. wrong node), the cause is almost always a
non-login shell — confirm the config uses `bash -lc` (login), not `bash -c`.

## Why this is the right fix (not a patch)

The reset-to-PowerShell was never really a "setting won't save" bug: on Windows DC defaults
`defaultShell` to `powershell.exe` by design, and your Claude Desktop kept restarting DC and
re-deriving that default. Running DC as a **Linux** process makes the default **bash** — so
even with frequent restarts the default is already correct, the config persists in WSL home,
and the whole PowerShell→wsl translation layer (with its quote-mangling) disappears.
