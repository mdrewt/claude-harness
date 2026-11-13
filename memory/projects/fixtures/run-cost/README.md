# Run-cost fixtures

Excerpts of real `/tmp/mr_pass_<slice>.log` files, read by `mr-cost-sum --selftest` and the
`run-cost` and `credit-stop` blocks of `mr-selfcheck`. Marker lines (`ATTEMPT=…`) are verbatim. Each stream-json
event keeps only the fields a cost reader could use (`total_cost_usd`, `modelUsage`,
`model_usage_since_last_result`, session id, turn counts); values are unedited.
`transcripts/<project>/<session id>.jsonl` holds the `cost-state` records of the matching
session transcript, whole.

| File | Source run | Shape |
|---|---|---|
| `single-attempt.stream` | ts-5 | one invocation, one result event |
| `resume-cumulative.stream` | ts-3 | two attempts; the `--resume` counter carries attempt 1's total; transcript agrees |
| `resume-zero-turn.stream` | bt-8 | two attempts; repeated totals and a zero-turn result after `--resume` |
| `relaunch-first.stream` | ts-4, first session | three attempts on one carried counter |
| `relaunch-second.stream` | ts-4, relaunch | a new session of the same slice 17 minutes later |
| `killed-no-result.stream` | bt-7 | killed (EXIT=143) before any result event; transcript cost-state $64.30 |
| `rate-limit-stop.stream` | bt-12, second session | stopped by a 429 at $28.84; the session was resumed outside the wrapper, transcript cost-state $53.36. The transcript's first `cost-state` record is the session as it stood at the stop, which is what the late-spend cases of `mr-selfcheck` record first |
| `rate-limit-rejected.stream` | bt-12, second session | the same stop with the events it ended on: the `rate_limit_event` whose `status` is `rejected` (weekly cap, `resetsAt` 2026-11-06T00:00Z, verbatim) and the CLI's synthetic limit message. Read by the `credit-stop` block of `mr-selfcheck` |

## Per-role transcripts

`by-role/<project>/<session id>/subagents/` holds the twelve subagent transcripts of the ts-5
session whose pass log is `single-attempt.stream`, read by the `--by-role` cases of
`mr-cost-sum --selftest`. Each `agent-*.jsonl` keeps only the assistant events, cut down to
`timestamp`, `effort`, `version` and the message's `id`, `model` and `usage`; values are
unedited. The three sonnet transcripts keep every event, so a message id repeats once per
content block; the opus ones keep the last event of each message id. Each `.meta.json` keeps
`agentType`, `description` and `toolUseId`. The session's own transcript is left out, so the
fable model has a log figure and no priced one.
