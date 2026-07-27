# DECISION ANSWER — issue 5 (CLOSED)

## Question (issue title)
DECISION(feedback-reconcile): Feedback ledger reconciler found 90 issue(s) — override or investiga

## Operator response(s)

### 2026-07-27T03:06:32Z
Investigated (operator-delegated): reconciler misfire — old-format 'utc=' tick-log lines phantom-counted as decision runs (lexical sort bug). Fixed; check now returns FEEDBACK-CHECK-OK items=91. Closure here is the documented override; superseded by the real decision batch #4/#6-#9.
