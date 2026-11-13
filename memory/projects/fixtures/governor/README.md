# Governor fixtures

`rate-limit-events.stream` holds three `rate_limit_event` lines as the CLI wrote them
(`rate_limit_info` and `uuid` verbatim), one per shape the budget governor reads. The
`governor` cases of `mr-selfcheck`'s credit-stop block rewrite their utilisation and reset times,
pass them through the real `mr-cost-watch telemetry` writer into a sandbox file and read the
bundle `mr-situation` makes of it.

| Line | Source | Shape |
|---|---|---|
| 1 | a supervisor tick on opus | `allowed_warning` on `seven_day`; that window alone in `unifiedWindows` |
| 2 | a Fable build session | status `allowed`: no top-level `utilization`, the figures only inside `unifiedWindows` (`five_hour`, `seven_day`, `seven_day_overage_included`) |
| 3 | a Fable build session | `seven_day` at 0.83 with the Fable allowance `seven_day_overage_included` at 0.93 |

The rejected Fable-limit event is `../run-cost/rate-limit-rejected.stream`, line 3.
