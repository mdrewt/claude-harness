# Monster Realm native supervisor — operations guide

**What it is:** a user crontab entry (`0 * * * *` + `@reboot`) runs `mr-native-tick.sh`, which
runs cheap bash gates and, when action may be needed, invokes one headless `claude -p` decision
tick (opus@medium) with `mr-supervisor-prompt-native.md` + a live situation bundle. The tick
picks/launches/merges ONE unit of work; detached "rooted runs" (opus/fable) do the implementation.
Events (slice done/crash, PR checks or a watched `master` run concluding, a credit reset) fire
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
performs it; `--stale` lists candidates untouched for 60 minutes and is refused with `--apply`,
since the roots hold other live sessions' files — a deletion names its path (a named path is
exempt from that floor only).
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
`-last-failure` · `mr-native-tick.log` (one DECISION/SKIP line per tick; grammar below) · `mr-state.json`
(inflight/queue/notes) · budget: `mr-cost-watch`/`mr-usage-snap`, config in `mr-budget-config.json`.

## Record grammar
**Tick log** (`mr-native-tick.log`). The wrapper writes `<utc> pid=<n> src=<cron|done|ci|crash|
reset|manual|decision> <VERB> …`; a decision session appends one line of its own:

    <utc> <run_id> DECISION <summary>[ held=<slice>:<why>[,<slice>:<why>…]]

The tick launches every ready candidate that passes the fan-out rules, up to 4 in flight; using
the weekly credit early is not a reason to hold one, because the same work costs the same credit
whenever it runs. `held=` is present when a ready candidate was not launched, and names each one
with the rule that held it:

| `<why>` | The candidate was not launched because |
|---|---|
| `overlap` | its code/test `touches:` collide with work in flight (or are undeclared) |
| `structural` | it touches its always-serial structural set or a table/schema/migration |
| `after` | a slice it must follow is not merged |
| `cap` | 4 runs are in flight |
| `budget` | the governor is at SOFT-PAUSE, or this launch's tier cap would cross it (a run started past the threshold is cut off mid-way) |
| `memory` | `free -g` shows less than one full build free |
| `quiet` | a refactor's quiet window covers it |

The session writes one DECISION line, and `held=` on it lists every held candidate. After the
session ends the wrapper reads that line and logs `HELD rid=<rid> n=<count> <field>`, or
`HELD rid=<rid> invalid=<field>` when an entry has no reason or one outside the set (a hold by
judgment), or
`HELD rid=<rid> invalid=decision-lines:<n>` when the session wrote more than one DECISION line
(entries spread over several lines cannot be counted). `grep -a ' HELD '` is the count;
`grep -a ' held='` the raw decisions.

**Usage ledger** (`monster-realm-usage-ledger.jsonl`, append-only). Rows that carry cost:
- **Build session** — exactly one per session that ended (first launch, relaunch, resume, park,
  crash, kill, rate-limit stop), written by `mr-record ledger --from-log <pass log>` from the
  tick's reconcile or, for a session relaunched before a tick saw it end, from `mr-spawn`.
  `run_id` = `run-<slice>-<launch stamp>` (the `TS=` of the log's `ATTEMPT=1` line), so a slice
  with three sessions has three rows; `outcome` = `FINISHED(EXIT=<rc> ATTEMPTS=<n>)` or
  `CRASHED(…)`; `cost_usd` = that session's own spend, read by `mr-cost-sum` as the larger of
  two sources: the sum of each result event's own usage in the pass log (the CLI's
  `total_cost_usd` is cumulative and carries across `--resume`), and the `cost-state` record
  the CLI leaves in the session transcript, which exists even for a session killed or
  rate-limited before any result event. `attempts` = invocations in the log; `notes` carries
  `session=<CLI session id>`, and says so when the figure came from the transcript.
  `cost_usd: null` always comes with `COST-UNKNOWN (<reason>)` in `notes` — neither source
  reports a cost, or the log is gone. `COST-PARTIAL (…)` marks a lower bound: an attempt was
  killed before its first result and the transcript adds nothing.
- **Supervisor tick** — `slice: SUPERVISOR`, `run_id` = the wrapper's `native-<utc>-<pid>`, one
  per decision session that exited 0.
- `CORRECTION(late spend)` — what a build session spent after its row was written (a session
  resumed outside the wrapper after a crash or a rate-limit stop keeps its CLI session id, and
  only its transcript sees the spend). Same `run_id` and `session=<id>` as the session's row;
  `cost_usd` = the transcript's `cost-state` total minus what the slice's rows already carry
  for that session. `mr-record` writes it when the session is offered again and when the
  slice's `MERGED` row is written, so the rows of a `run_id` sum to the session's spend. Spend
  on a slice that is never merged and never offered again stays unrecorded.
- `CORRECTION` — a signed reversal of an earlier row.

Every other row (`LAUNCHED`, `MERGED`, `PARKED`, CI waits) records an event and carries no cost.
A slice's spend is the sum of its build-session and `CORRECTION` rows.

## Credit stops (`mr-interrupted`)
A build session whose pass log ends on a `rate_limit_event` with `status: rejected` has had its
credit refused until that event's `resetsAt` — the short window and the weekly cap arrive the
same way. Every tick, before any gate (so also while held or over budget), the wrapper runs
`mr-interrupted scan`:
- It records the slice in `mr-interrupted.json` (untracked): tier, model, effort, CLI session id,
  launch vars, reset time. While the reset is ahead it records every other live slice too (they
  draw on the same credit) and sets `/tmp/mr_stop_all` + `/tmp/mr_stop_<slice>`, so runs
  checkpoint and stop. The wrapper logs `CREDIT-STOP new=<slices> resets=<epoch> limit=<type>`
  and starts `mr-reset-watch`.
- That tick still runs its decision session, which parks the stopped slices (`wip:` checkpoint,
  memo, `PARKED`). Later ticks log `STANDDOWN credit-stop BLOCKED_UNTIL_<utc>` until a reset passes.
- The first tick after the reset — the watcher's `src=reset` tick, or cron's next one if the
  watcher died; the gate compares the recorded time with the clock — writes each due slice's
  launch vars back (`mr-interrupted vars --due`) and names them as `resume_first=` in the
  prompt's TICK PROVENANCE; the bundle lists them as `interrupted[]`. The session's one action
  is `mr-spawn` for all of them, ahead of everything else including a red `master`. A due
  resume also passes the live-chain fast path and the `.blocked-on-human` gate; the operator
  hold and HARD-STOP still stop it.
- The resume runs at the tier, model and effort the slice was stopped at, and `mr-launch.sh`
  continues the stopped CLI session (`--resume <id>`) when its transcript is on disk; otherwise,
  or when the CLI cannot resume it, it starts a new session from the brief, whose resume block
  points at the `wip:` checkpoint. `mr-spawn` removes the record once the slice is launched.
- A resume refused again (the log's earliest reset was not the last one) is recorded again
  with the later reset.

The tick's own session being refused arms `rate_limit_resets_at` in `mr-state.json` and a reset
watcher. The budget governor's HARD-STOP is separate: it is this loop's dollar estimate
(`weekly_limit_usd` × `hard_stop_frac`), it stops decision sessions and not runs — a live run
finishes and its event waits — and it clears when the weekly window (`budget.window_end_utc`)
rolls over, for which the wrapper arms the same watcher. The estimate and the plan's real limit
are independent: the plan can refuse credit while the governor reads NORMAL.

## Slice scope (`touches:`)
A slice edits the files its spec's `touches:` declares; a run that measures a further file it
needs adds it with `mr-touches widen`, which refuses a file other unmerged work holds and the
files that define the gate or steer the loop. Grants live in `gates/<slice>.widened.jsonl` and are
read by `mr-disjoint`, `mr-gates render` and `mr-audit`'s `scope` block. The rules are in the
`mr-touches` header.

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
