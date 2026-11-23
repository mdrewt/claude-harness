# DECISION ANSWER — issue 817 (CLOSED)

## Question (issue title)
DECISION(mutex-wedged-by-interactive-session): The chain mutex (.harness-runner.lock.d) is held by pid 685984 — an interactive 'claude 

## Operator response(s)
(closed without comment — treat the Recommendation in the issue body as accepted)

## Issue body (for the recommendation)
## Root issue
A manual tick took the mutex under its own long-lived interactive claude pid instead of a short-lived wrapper pid. The lock tools treat any live owner as an active holder, so the lock stays held until that session exits.

## Question
The chain mutex (.harness-runner.lock.d) is held by pid 685984 — an interactive 'claude --resume 1caddb38…' session on pts/9 that ran a manual supervisor tick at 05:24Z (run mr-sup-native-20261116T052457Z-687509) and has been idle since. Heartbeat is stale (~61 min), but the pid is still running, so mr-lock take / mr-unlock mutex both correctly refuse. sr-3 (PR #816, hard tier, all 9 checks green, CLEAN) can't get its audited merge until the lock is released. Can you exit that session, or run 'mr-unlock own 685984' from inside it?

## Recommendation
Exit session 685984 (or run 'mr-unlock own 685984' from it). The next tick will then audit and merge sr-3. Later fix: have a manual tick release the mutex at its end, the way the wrapper does with 'mr-unlock own'.

## Alternatives
Leave it — sr-3 merges once the session closes on its own.

## Additional context
Ticks 06:38Z and 06:55Z both declined to mutate for this reason. Governor NORMAL (87%).

---
_Answer by commenting (or closing) this issue. A watcher polls every 5 min; your first comment (or close) resumes the loop. Slice/topic: `mutex-wedged-by-interactive-session`._

