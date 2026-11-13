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
(inflight/queue/notes) · budget: `mr-cost-watch`/`mr-usage-snap`, config in `mr-budget-config.json`
(governor: "Budget governor" below).

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
| `budget` | the governor is at SOFT-PAUSE, this launch's tier cap would cross it, or its model's own plan window is paused (a run started past the threshold is cut off mid-way) |
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
A build session that ended on a `rate_limit_event` with `status: rejected` has had its credit
refused until that event's `resetsAt` — the short window and the weekly cap arrive the same
way. "Ended on" means nothing but the CLI's own limit message and error result follows the
rejection in that invocation; a session that went on working, or that was on overage, is not
stopped. Every tick, before any gate, the wrapper runs `mr-interrupted scan`:
- It records the slice in `mr-interrupted.json` (untracked): tier, model, effort, CLI session id,
  launch vars, reset time, and the rejection's **scope** — one model when the limit type or the
  CLI's limit message names it and no general window is rejected, otherwise all models. While
  the reset is ahead it also records every live slice on a model the stop covers and sets
  `/tmp/mr_stop_<slice>` for each (`/tmp/mr_stop_all` too when it covers all models), so runs
  checkpoint and stop. The wrapper logs `CREDIT-STOP new=<slices> resets=<epoch> limit=<type>
  scope=<all|model>` and starts `mr-reset-watch`. Slices on other models carry on.
- A `resetsAt` that is missing, non-positive, more than an hour before the stop or more than 14
  days ahead is not a reset time: the slice waits one hour instead.
- **Under the operator hold** the scan only records the rejected slices: no stop flag, no
  watcher, nothing offered (`gate` prints `HELD`). Once the hold is lifted the recorded slices
  meet the rules below like any other, and the first scan that finds one still waiting on its
  reset starts the watcher then (`CREDIT-STOP-WATCH watch=<epoch>` in the tick log).
- That tick still runs its decision session, which parks the stopped slices (`wip:` checkpoint,
  memo, `PARKED`). Later ticks log `STANDDOWN credit-stop BLOCKED_UNTIL_<utc>` while a stop that
  covers the supervisor's own model (`SUP_MODEL`) waits; a stop on another model does not stand
  the tick down, and `mr-spawn` refuses (`CREDIT-STOPPED`) any launch on the stopped model until
  the reset.
- The first tick after the reset — the watcher's `src=reset` tick, or cron's next one if the
  watcher died; the gate compares the recorded time with the clock — writes each due slice's
  launch vars back (`mr-interrupted vars --due`) and names them as `resume_first=` in the
  prompt's TICK PROVENANCE; the bundle lists them as `interrupted[]` with a `state`. The
  session's one action is `mr-spawn` for all of them, ahead of everything else including a red
  `master`. A due resume also passes the live-chain fast path and the `.blocked-on-human` gate;
  the operator hold and HARD-STOP still stop it.
- The resume runs at the tier, model and effort the slice was stopped at, and `mr-launch.sh`
  continues the stopped CLI session (`--resume <id>`) when its transcript is on disk; otherwise,
  or when the CLI cannot resume it, it starts a new session from the brief (one
  `RESUME-FALLBACK`/`RESUME-FAILED` line in the pass log says so), whose resume block points at
  the `wip:` checkpoint. `mr-spawn` removes the record once the slice is launched.

**When a slice is offered.** Its reset has passed, no other recorded stop that covers its model
is still waiting for a reset (`gate`, `vars --due` and `mr-spawn`'s `launch-check` ask the same
question, so a slice is never offered into a `CREDIT-STOPPED` refusal), its session_leader is
dead (a slice still running is `live` and skipped; `mr-spawn` itself refuses a slice whose
lock names a live leader: `ALREADY-RUNNING`), and a lookup finds something to resume. The lookup removes the slice when
its PR is merged or open (`gh pr list`), its spec section carries `blocked:`, or the section it
had when it stopped is gone; a slice also leaves 14 days after its stop. A slice that
checkpointed on the stop flag and exited 0 stays: that is the stop working. A lookup that fails
keeps the slice and offers nothing (`unverified`) until it succeeds.

**Resume attempts.** A resume fails in two cases only. The slice was launched again and the
vendor refused it again: a new terminal rejection within an hour of the launch or with a reset
no later than the one already waited for. Or `mr-spawn` refused the launch for a reason that
does not clear by itself: `FAIL`, `REPO-MIXED`, `REPO-EXTERNAL`, `REPO-UNRESOLVED`,
`REPO-OUT-OF-SYNC`, `COSTPARK-GATE`, or a brief that does not render. `HOLD-PRESENT`,
`PROBE-TRIPPED`, `ALREADY-RUNNING`, `CREDIT-STOPPED` and a `--dry` probe never count: each
clears by itself, and each also keeps the slice from being `due` or stands the tick down before
a session is paid for. A failed resume waits an hour (or for the strictly later reset the
refusal names). After 2 failed resumes the slice is `capped`: never offered again, no longer
`DUE` for the gate, no reset watcher, and `mr-interrupted` opens one
`DECISION(credit-resume-<slice>)` issue through `mr-ask-drew`. `mr-interrupted drop <slice>`
clears it by hand.

**Ignored offers.** An offer no session saw — a hold, a stand-down or a dry run ended the tick
before a decision session started — counts for nothing: the slice stays `due` and the next tick
offers it again. An offer a session did see is counted, because each such tick is paid for.
After a decision session that exited 0, the wrapper calls `mr-interrupted ignored <slices>` with
that tick's `resume_first`; each named slice that is still offered and `due` (not launched, not
dropped, no failed resume counted) gets one ignored offer and a `CREDIT-RESUME-IGNORED` line in
the tick log. Ignored offers and failed resumes are separate counts and neither resets the
other. After 3 ignored offers the slice is `capped` exactly as above, and the one
`DECISION(credit-resume-<slice>)` issue says the session did not act on the offer.

The tick's own session being refused arms `rate_limit_resets_at` in `mr-state.json` and a reset
watcher. The budget governor's HARD-STOP is separate: it stops decision sessions and not runs —
a live run finishes and its event waits — and it clears when the window it was read from resets
(`budget.resets_at_utc`), for which the wrapper arms the same watcher.

## Budget governor
`mr-situation` computes it into the bundle's `budget`: NORMAL, SOFT-PAUSE (over
`soft_pause_frac`, 90%) or HARD-STOP (over `hard_stop_frac`, 97%); UNKNOWN when the ledger
cannot be read. The thresholds keep a run from being started just under the cap and cut off
mid-way; they do not spread spend over the week.

`budget.source` names what decided:

| `source` | The state is graded from |
|---|---|
| `telemetry` | the plan's real utilisation: the newest reading of a plan window in `mr-rate-limit-telemetry.jsonl` (the `rate_limit_event` rows `mr-cost-watch telemetry` samples from tick and slice logs), read within `telemetry_fresh_s` (3 h) |
| `telemetry-stale` | a reading older than that, still over the soft threshold, on a window whose reset is ahead. It reads SOFT-PAUSE whatever its figure: the decision session that runs launches nothing new and leaves a fresh sample |
| `calibration` | the ledger's dollars this week (plus estimates for runs not yet recorded) against `weekly_limit_usd` in `mr-budget-config.json`. In force only when no reading is |

Rules for a reading:
- **Window.** `five_hour`, `seven_day` and any window not known to belong to one model cover
  every model and set `budget.state`; the highest one in force decides. A window covers one
  model when its name carries the model or `telemetry_window_models` in the config maps it
  (`seven_day_overage_included` is the Fable allowance). Such a window sets
  `budget.model_states.<model>` — the worse of it and `budget.state` — and `budget.fable_ok`,
  which gates the wrapper's escalation to Fable.
- **Reset.** A reading is void once its window's `resetsAt` has passed: the next window starts
  empty, so a pause never outlives the window it was read from. The window's newest sample
  decides which `resetsAt` that is, so a reset time the plan moves earlier takes effect with
  the sample that reports it.
- **Freshness.** The plan's figure moves both ways inside a window, so only a reading younger
  than `telemetry_fresh_s` is acted on as read. An older one under the soft threshold is not in
  force; an older one over it reads SOFT-PAUSE. A model's own window is reported only by
  sessions on that model, so its older reading (`stale` in `budget.model_states.<model>`) keeps
  `fable_ok` false and `mr-spawn` lets one new launch on the model through per
  `telemetry_fresh_s` to measure it, refusing the rest. The launch that went is recorded by
  `$MEM/.model-window-probe.<window>.<reset>`; deleting that file allows another.
- **Launches.** A pause on every model is the decision session's rule (SOFT-PAUSE: only
  `resume_first` slices). A pause on one model alone is `mr-spawn`'s: it refuses a new launch on
  that model with `BUDGET-MODEL-PAUSED` (`held=budget`) and launches other models and credit-stop
  resumes.

On telemetry `effective_usd` is the utilisation × `weekly_limit_usd`, so the per-launch check
(`effective_usd` + `tier_caps_usd` ≤ `soft_pause_usd`) reads one scale under either source;
`utilisation`, `window` and `sample_utc` carry the reading itself.

## Slice scope (`touches:`)
A slice edits the files its spec's `touches:` declares; a run that measures a further file it
needs adds it with `mr-touches widen`, which refuses a file other unmerged work holds and the
files that define the gate or steer the loop. Grants live in `gates/<slice>.widened.jsonl` and are
read by `mr-disjoint`, `mr-gates render` and `mr-audit`'s `scope` block. The rules are in the
`mr-touches` header.

## Spec notes (`mr-gates notes`)

The spec corpus a run reads is the harness main checkout, where a run cannot commit. What a build
learns about its spec goes to `gates/<slice>.notes.jsonl` (`mr-gates notes add`), and a follow-up
in a note is a residual row (`--followup` files it), so the drain sees it.

- **Pending is read from the spec:** a note is pending while its paragraph is absent from the
  slice's section at HEAD of the spec checkout. No row records a fold, so an edit that is written
  and then stashed or discarded before it is committed is pending again.
- **At merge:** `mr-gates residuals close` prints `NOTES-PENDING` when the merged slice has pending
  notes. `mr-gates notes fold --slice S` writes them as `Build note (S): …` at the end of the
  slice's section; the edit ships as the tick's doc-only spec PR. Fold refuses a spec with
  uncommitted edits.
- **A Build note found uncommitted in a spec file** (a run wrote into the checkout):
  `residuals close` prints `NOTES-STRAY <file>: mr-gates notes adopt --slice S before stashing it`.
  Adopt stores it (with `--followup …` or `--residual R-…` when it names a follow-up) before the
  labeled stash. After the file is back at HEAD and fast-forwarded, `notes fold` writes it again.
- **At milestone close:** `mr-gates notes harvest --spec-file F` must exit 0 before `F` is deleted.
  It blocks on a pending note, an uncommitted edit, or a follow-up-worded Build note with no
  residual row; `notes adopt` gives a committed Build note its row, one paragraph per call.

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
