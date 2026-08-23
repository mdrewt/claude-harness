# lp-gates — Stop-hook contract, established EMPIRICALLY (2026-08-22)

Claude Code **2.1.240**, WSL. Probes run in an isolated scratch dir with its own
`.claude/settings.json`; nothing in the pipeline was touched. These facts are the foundation of
`gates-stop.mjs`; re-run the probes if the CLI major version changes.

Probe tree: `<scratch>/hookprobe/` (settings.json + .claude/hooks/*.mjs, throwaway).

## 1. Stop hooks DO fire in headless `claude -p`

`claude --model haiku -p '...' --output-format json` with a `Stop` hook registered → the hook fired
on the natural end of the print-mode turn. This was the single riskiest assumption; it holds.

## 2. Hooks inherit the parent process environment

`export MR_SLICE=probe-slice PROBE_VAR=probe-value` before invoking `claude` → both were visible in
`process.env` inside the hook (72 env vars total). **The `MR_SLICE` binding in `mr-launch.sh` works.**

## 3. Stop payload fields actually delivered (2.1.240)

```
background_tasks · cwd · hook_event_name · last_assistant_message · permission_mode ·
prompt_id · session_crons · session_id · stop_hook_active · transcript_path
```

`cwd` and `stop_hook_active` are both present. `CLAUDE_PROJECT_DIR` is exported into the hook's env
and resolved to the session's project dir.

## 4. Blocking works, and the model actually does the work

Hook returning `{"decision":"block","reason":"..."}` on stdout with **exit 0**:

| stop | `stop_hook_active` | outcome |
|---|---|---|
| 1 | `false` | blocked → model wrote `step 1` |
| 2 | `true` | blocked → model wrote `step 2` |
| 3 | `true` | blocked → model wrote `step 3` |
| 4 | `true` | released (no `decision`) → session ended `subtype=success is_error=false` |

7 turns, **$0.037 on haiku** for the whole 3-block sequence on a trivial task. The `reason` string
is delivered to the model as the continuation instruction — it followed it precisely each time.

**Design consequence, load-bearing:** `stop_hook_active` flips to `true` on every stop AFTER the
first block. The existing advisory hook `check-docs-updated.mjs` bails on it, and the upstream
`unlazy` stop-hook ignores it entirely. If `gates-stop.mjs` bailed on it, it would block **exactly
once per session** and the enforcement would be nearly worthless. So: **do not bail on
`stop_hook_active`** — carry a bounded, progress-aware counter of our own instead. Record the flag
for forensics.

## 5. Multiple Stop hooks compose; a crashing hook is isolated

Three hooks registered (advisory `systemMessage` → a hook that `throw`s → a blocking hook):
all three fired in declaration order on every stop, the crash did **not** suppress the later hooks
and did **not** wedge the session, and the block won while the advisory message was still emitted.
Session ended `subtype=success is_error=false`.

**Design consequences:** the new hook can be added alongside `check-docs-updated.mjs` without
touching it; and a defect in `gates-stop.mjs` degrades to "no enforcement", not "wedged loop" —
provided it always exits 0, which is the rule.

## 6. What was NOT tested

- Claude Code's own force-release ceiling on consecutive blocks (upstream `unlazy` documents 8).
  Not probed: our own cap is 3, well below it, so the ceiling is never reached.
- Behaviour under `--resume` (the wrapper's auto-resume path). The hook is stateless per stop and
  keys off the gates file, so a resume is just another session with the same `MR_SLICE`; the
  block counter is keyed to the gates-file hash, not to a session id.
