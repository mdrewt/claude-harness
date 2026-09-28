# Monster Realm native supervisor — operations guide

**What it is:** a user crontab entry (`0 * * * *` + `@reboot`) runs `mr-native-tick.sh`, which
runs cheap bash gates and, when action may be needed, invokes one headless `claude -p` decision
tick (sonnet@medium) with `mr-supervisor-prompt-native.md` + a live situation bundle. The tick
picks/launches/merges ONE unit of work; detached "rooted runs" (opus/fable) do the implementation.
Events (slice done/crash, CI, rate-limit reset) fire extra ticks; cron is the safety net.

## Controls (all on PATH)
- `mr-supervisor-disable` — pause (writes the provenance-attributed hold flag). Agents cannot run it.
- `mr-supervisor-enable` — resume (operator-only; removes the flag).
- `mr-supervisor-run` — one forced tick now (`MR_FORCE=1`, bypasses the hold without clearing it;
  proceeds past the human-activity probe with a NOTE since 2026-09).
- `mr-supervisor-status [-f|--pretty]` — state, live runs, budget, decision issues; tail the log.
- `mr-supervisor-chat` — resume the Claude session behind a past slice or tick.

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
`mr-hold` provenance (an unattributed flag wedges the loop) · `mr-unlock` (the only sanctioned
lock reaper) · the guard-bash hook (blocks destructive commands incl. the flag file) ·
`supervisor-disable-teeth.sh` (kill-switch selftest) · the tick's flock + chain mutex pair.
