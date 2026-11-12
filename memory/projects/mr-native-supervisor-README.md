# Monster Realm native supervisor — operations guide

**What it is:** a user crontab entry (`0 * * * *` + `@reboot`) runs `mr-native-tick.sh`, which
runs cheap bash gates and, when action may be needed, invokes one headless `claude -p` decision
tick (opus@medium) with `mr-supervisor-prompt-native.md` + a live situation bundle. The tick
picks/launches/merges ONE unit of work; detached "rooted runs" (opus/fable) do the implementation.
Events (slice done/crash, PR checks or a watched `master` run concluding, rate-limit reset) fire
extra ticks; cron is the safety net. A `master` push run on a tree its PR run already passed
fires only when it does not pass.

## Controls (all on PATH)
- `mr-supervisor-disable` — pause (writes the provenance-attributed hold flag). Agents cannot run it.
- `mr-supervisor-enable` — resume (operator-only; removes the flag).
- `mr-supervisor-run` — one forced tick now (`MR_FORCE=1`, bypasses the hold without clearing it;
  proceeds past the human-activity probe with a NOTE since 2026-09).
- `mr-supervisor-status [-f|--pretty]` — state, live runs, budget, decision issues; tail the log.
- `mr-supervisor-chat` — resume the Claude session behind a past slice or tick.

## Scratch cleanup (`memory/projects/mr-clean-scratch`)
The guard hook blocks every recursive `rm`, so agents remove scratch through this tool; its
safety is in code. `mr-clean-scratch PATH...` is a dry run (target, size, action); `--apply`
performs it; `--stale` sweeps for candidates untouched for 60 minutes (a named path is exempt
from that floor only).
- Removable: `/tmp/claude-<uid>/**/scratchpad/*`, `/tmp/mr-*/`, `/tmp/tmp.*/`, and registered
  worktrees of either repo under `/tmp/<name>.<random>/`. Refused: anything else, any path
  through a symlink, main checkouts, the repo checkouts, `$HOME`, and paths naming the hold
  flag, a runner lock or `pending-events`. Deletion follows no symlink and stays on one
  filesystem; nothing goes while a process has its cwd inside.
- A registered worktree goes through unforced `git worktree remove` + `prune`, and only when
  clean, unlocked, and its HEAD is on a remote-tracking branch, on the default branch, or under
  a merged PR. A dirty or unmerged one is reported as `SKIP` with the reason — discarding it is
  the supervisor's `git worktree remove --force` call, for sandboxes a finished run named.
- Deletions are appended to `mr-clean-scratch.log` (untracked). Exit 1 = a named target stayed.

## Health signals (all in `memory/projects/`)
`.native-supervisor-heartbeat` (fresh = ticks running) · `.native-supervisor-last-success` /
`-last-failure` · `mr-native-tick.log` (one DECISION/SKIP line per tick) · `mr-state.json`
(inflight/queue/notes) · budget: `mr-cost-watch`/`mr-usage-snap`, config in `mr-budget-config.json`.

## Verification & rollback
- Dry-run a tick: `MR_TICK_DRYRUN=1 MR_FORCE=1 bash memory/projects/mr-native-tick.sh`
  (assembles the prompt, spawns nothing).
- `memory/projects/mr-selfcheck` — wiring + tool selftests (SELFCHECK-OK expected; NOTES are
  reports, never gates). Individual tools: `mr-gates|mr-audit|mr-spawn|mr-cost-watch --selftest`.
- Rollback: `git revert` whole commits in this repo; a bad prompt/doctrine change reverts cleanly.
  Emergency stop: `mr-supervisor-disable`, then `touch /tmp/mr_stop_all` for live runs.

## Do-not-remove list (each guards a measured failure)
`mr-hold` provenance (an unattributed flag wedges the loop) · `mr-lock`/`mr-unlock` (the only
sanctioned chain-mutex take/heartbeat/reap pair — they agree on one `owner.json` schema so a tick
never hand-rolls the lock file) · the guard-bash hook (blocks destructive commands incl. the flag
file; `mr-clean-scratch` is the recursive delete it leaves open) · `supervisor-disable-teeth.sh` (kill-switch selftest) · the tick's flock + chain mutex pair.
