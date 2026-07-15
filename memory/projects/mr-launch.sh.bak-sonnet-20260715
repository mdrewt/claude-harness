#!/usr/bin/env bash
# mr-launch.sh <slice> [model] — detached rooted-run wrapper with bounded auto-resume.
#
# Contract (relied on by the monster-realm-v2-milestone-runner supervisor):
#   - reads brief from /tmp/mr_pass_<slice>.md
#   - writes stream-json to /tmp/mr_pass_<slice>.log, stderr to .err (appends on retries)
#   - pins --model (default sonnet; a global ~/.claude/settings.json haiku override
#     otherwise silently downgrades the orchestrator — see supervisor gotchas)
#   - auto-resumes the run (<= MAX_ATTEMPTS total) via `claude --resume <last session_id>`:
#       * RC==0 (premature end_turn)              -> resume with "continue" nudge
#       * RC!=0 AND stderr/log tail looks like a   -> backoff (60s*attempt), then resume
#         TRANSIENT API failure (Overloaded/5xx/
#         network) — 2026-07-04 fix: previously
#         only RC==0 resumed, so an Overloaded
#         crash sat dead until the next cron tick
#       * RC!=0 otherwise (real failure)           -> stop, write .done
#     NEVER resumes if: /tmp/mr_stop_<slice> or /tmp/mr_stop_all exists (rate-limit /
#     supervisor stop — must stay parked) | an open PR's head branch matches the slice
#     id (case-insensitive) | no session_id found in the log.
#   - always finishes by writing /tmp/mr_pass_<slice>.done = "EXIT=<rc> ATTEMPTS=<n>"
#
# Caller MUST launch detached and assert it:  setsid bash mr-launch.sh <slice> & disown
set -u
S="${1:?usage: mr-launch.sh <slice> [model]}"
MODEL="${2:-sonnet}"
MAX_ATTEMPTS=3
HARNESS=/home/mdrewt/projects/ai-apps/claude-harness
B="/tmp/mr_pass_$S.md"; L="/tmp/mr_pass_$S.log"; E="/tmp/mr_pass_$S.err"; D="/tmp/mr_pass_$S.done"

fail() { echo "EXIT=$1 ATTEMPTS=${A:-0}" >"$D"; exit "$1"; }
cd "$HARNESS" || fail 127
[ -r "$B" ] || fail 66

terminal_pr_open() {
  gh pr list -R mdrewt/monster-realm --state open --json headRefName \
    -q '.[].headRefName' 2>/dev/null | grep -qi "$S"
}

# Transient API failure heuristic — checked ONLY when RC != 0.
# Looks at the tails of stderr and the stream log for Overloaded/5xx/network
# signatures. Deliberately does NOT match rate-limit exhaustion (429 /
# "usage limit") — rate limits are the supervisor's stop-flag domain, and
# every stream event carries a benign "rate_limit_info" field, so generic
# 'rate.?limit' grepping would false-positive (see supervisor gotchas).
transient_failure() {
  { tail -c 4096 "$E" 2>/dev/null; tail -n 3 "$L" 2>/dev/null; } | grep -qiE \
    'overloaded|api error: 5[0-9][0-9]|"type":"overloaded_error"|internal server error|econnreset|etimedout|socket hang up|fetch failed|network error|connection (refused|reset)'
}

A=1
claude --model "$MODEL" --dangerously-skip-permissions -p "$(cat "$B")" \
  --output-format stream-json --verbose </dev/null >"$L" 2>"$E"
RC=$?

while [ "$A" -lt "$MAX_ATTEMPTS" ] \
      && [ ! -f "/tmp/mr_stop_$S" ] && [ ! -f /tmp/mr_stop_all ] \
      && ! terminal_pr_open; do
  if [ "$RC" -eq 0 ]; then
    P="You stopped before a valid stopping point (no open PR for this slice, no stop-flag; if you parked you must have pushed the branch + documented the blocker — verify you did). Do not summarize and stop. Push the branch if unpushed, then continue the brief from where you left off."
  elif transient_failure; then
    sleep $((60 * A))
    P="Your previous session was interrupted by a transient API/network error mid-work. Re-verify the worktree and branch state (git status, git log) before assuming anything completed, then continue the brief from where you actually left off. Push any unpushed commits first."
  else
    break  # real failure — leave for the supervisor to triage
  fi
  A=$((A+1))
  SID=$(grep -o '"session_id":"[^"]*"' "$L" | tail -1 | cut -d'"' -f4)
  [ -n "$SID" ] || break
  claude --model "$MODEL" --dangerously-skip-permissions --resume "$SID" \
    -p "$P" \
    --output-format stream-json --verbose </dev/null >>"$L" 2>>"$E"
  RC=$?
done

echo "EXIT=$RC ATTEMPTS=$A" >"$D"
