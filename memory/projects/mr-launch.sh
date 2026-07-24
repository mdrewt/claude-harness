#!/usr/bin/env bash
# mr-launch.sh v2 <slice> [model] [effort] — detached rooted-run wrapper with bounded auto-resume.
# v2 (2026-07-24): --effort pass-through (default high) · ATTEMPT markers · auth fast-fail ·
# same-signature dead-stop · haiku triage for ambiguous failures · escalate-on-final-attempt
# opus->fable@xhigh (MR_NO_ESCALATE=1 disables; skipped if fable 7d spend > guard) ·
# done/crash event bridge -> pending-events + tick spawn (MR_NO_EVENT_BRIDGE=1 disables).
# Contract preserved from v1: brief /tmp/mr_pass_<slice>.md · stream-json log/err · stop-flags ·
# terminal_pr_open · transient auto-resume · .done = "EXIT=<rc> ATTEMPTS=<n>".
# Caller MUST launch detached: setsid bash mr-launch.sh <slice> [model] [effort] & disown
set -u
exec 9>&- 2>/dev/null || true   # drop inherited tick-flock fd (prevents lock wedge)
S="${1:?usage: mr-launch.sh <slice> [model] [effort]}"
MODEL="${2:-opus}"
EFFORT="${3:-high}"
MAX_ATTEMPTS=3
HARNESS=/home/mdrewt/projects/ai-apps/claude-harness
MEM=$HARNESS/memory/projects
B="/tmp/mr_pass_$S.md"; L="/tmp/mr_pass_$S.log"; E="/tmp/mr_pass_$S.err"; D="/tmp/mr_pass_$S.done"

fire_event(){ # $1=src(done|crash) $2=headline
  [ "${MR_NO_EVENT_BRIDGE:-0}" = "1" ] && return 0
  EV="$MEM/pending-events/$S.$1.md"
  EVT="$EV.building.$$"
  { echo "EVENT src=$1 slice=$S at=$(date -u +%Y-%m-%dT%H:%M:%SZ) — $2"
    echo "--- .done ---"; cat "$D" 2>/dev/null
    echo "--- log tail (40) ---"; tail -n 40 "$L" 2>/dev/null | cut -c1-400
    echo "--- err tail (20) ---"; tail -n 20 "$E" 2>/dev/null | cut -c1-400
    if [ "$1" = "crash" ]; then
      WT=$(git -C "$HARNESS/projects/monster-realm" worktree list 2>/dev/null | grep -i "$S" | awk '{print $1}' | head -1)
      [ -n "$WT" ] && { echo "--- worktree status ($WT) ---"; git -C "$WT" status --short 2>/dev/null | head -20; }
    fi
  } > "$EVT" 2>/dev/null
  # advisory local-model summary (free; we are already detached). Never gates anything.
  # Assembled into the temp file and mv'd atomically so a concurrent tick can never consume a half-built event.
  if [ "${MR_NO_OLLAMA:-0}" != "1" ] && [ -x "$MEM/mr-ollama" ]; then
    SUMM=$("$MEM/mr-ollama" summarize-run "$S" 2>/dev/null | head -c 3000)
    case "$SUMM" in
      OLLAMA-UNAVAILABLE*|"") : ;;
      *) { echo "--- LOCAL-MODEL SUMMARY (ornith, ADVISORY ONLY — verify against ground truth) ---"; echo "$SUMM"; } >> "$EVT" 2>/dev/null ;;
    esac
  fi
  mv "$EVT" "$EV" 2>/dev/null || true
  MR_EVENT_SRC=$1 setsid /bin/bash "$MEM/mr-native-tick.sh" "$EV" >/dev/null 2>&1 &
}
fail() { echo "EXIT=$1 ATTEMPTS=${A:-0}" >"$D"; fire_event crash "wrapper-fail rc=$1"; exit "$1"; }
cd "$HARNESS" || fail 127
[ -r "$B" ] || fail 66

terminal_pr_open() {
  gh pr list -R mdrewt/monster-realm --state open --json headRefName \
    -q '.[].headRefName' 2>/dev/null | grep -qi "$S"
}
transient_failure() {
  { tail -c 4096 "$E" 2>/dev/null; tail -n 3 "$L" 2>/dev/null; } | grep -qiE \
    'overloaded|api error: 5[0-9][0-9]|"type":"overloaded_error"|internal server error|econnreset|etimedout|socket hang up|fetch failed|network error|connection (refused|reset)'
}
auth_failure() {
  { tail -c 2048 "$E" 2>/dev/null; tail -n 3 "$L" 2>/dev/null; } | grep -qiE 'not logged in|please run /login|invalid api key|unauthorized'
}
fable_budget_ok() {
  # Single-source budget math: delegate to mr-situation (45s cache; --no-gh keeps it <1s).
  # Empty/parse-failure -> OVER (skip escalation; budget-conservative; wrapper logs the skip).
  "$MEM/mr-situation" --no-gh 2>/dev/null | /usr/bin/python3 -c '
import json,sys
try:
    ok=json.load(sys.stdin).get("budget",{}).get("fable_ok")
    print("OK" if ok is True else "OVER")
except Exception:
    print("OVER")' 2>/dev/null || echo OVER
}
haiku_triage(){ # -> transient|real
  OUT=$(timeout 120 claude --model haiku --effort low --dangerously-skip-permissions -p \
"A headless coding session exited non-zero. Classify the cause as exactly one word, 'transient' (API/network/infrastructure blip worth an automatic resume) or 'real' (code/logic/config failure needing triage). Evidence follows.
--- stderr tail ---
$(tail -c 2000 "$E" 2>/dev/null)
--- log tail ---
$(tail -n 5 "$L" 2>/dev/null | cut -c1-300)
Respond with exactly one word." 2>/dev/null)
  if echo "$OUT" | grep -qi '^ *transient'; then echo transient; return; fi
  if [ -z "$OUT" ] || ! echo "$OUT" | grep -qiE 'transient|real'; then
    # claude CLI unavailable (e.g. auth outage) -> local-model fallback triage
    LOUT=$("$MEM/mr-ollama" triage "$S" 2>/dev/null | head -1)
    case "$LOUT" in [Tt]ransient*) echo transient; return;; esac
  fi
  echo real
}

A=1
echo "ATTEMPT=$A MODEL=$MODEL EFFORT=$EFFORT TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
claude --model "$MODEL" --effort "$EFFORT" --dangerously-skip-permissions -p "$(cat "$B")" \
  --output-format stream-json --verbose </dev/null >>"$L" 2>"$E"
RC=$?
PREV_SIG=""
while [ "$A" -lt "$MAX_ATTEMPTS" ] \
      && [ ! -f "/tmp/mr_stop_$S" ] && [ ! -f /tmp/mr_stop_all ] \
      && ! terminal_pr_open; do
  if [ "$RC" -ne 0 ] && auth_failure; then break; fi   # auth: dead now; supervisor/toast handles
  CUR_SIG=$(tail -c 1024 "$E" 2>/dev/null | md5sum | cut -d' ' -f1)
  if [ "$RC" -eq 0 ]; then
    P="You stopped before a valid stopping point (no open PR for this slice, no stop-flag; if you parked you must have pushed the branch + documented the blocker — verify you did). Do not summarize and stop. Push the branch if unpushed, then continue the brief from where you left off."
  elif [ "$RC" -ne 0 ] && [ -n "$PREV_SIG" ] && [ "$CUR_SIG" = "$PREV_SIG" ]; then
    break  # identical failure signature twice: deterministic bug — real failure, stop
  elif transient_failure; then
    sleep $((60 * A))
    P="Your previous session was interrupted by a transient API/network error mid-work. Re-verify the worktree and branch state (git status, git log) before assuming anything completed, then continue the brief from where you actually left off. Push any unpushed commits first."
  elif [ "$(haiku_triage)" = "transient" ]; then
    sleep $((60 * A))
    P="Your previous session was interrupted by what appears to be a transient infrastructure error. Re-verify worktree/branch state before assuming anything completed, then continue the brief from where you actually left off."
  else
    break  # real failure — leave for the supervisor to triage
  fi
  PREV_SIG="$CUR_SIG"
  A=$((A+1))
  # escalate-on-final-attempt: opus -> fable@xhigh (quality-first; budget-guarded)
  if [ "$A" -eq "$MAX_ATTEMPTS" ] && [ "$MODEL" = "opus" ] && [ "${MR_NO_ESCALATE:-0}" != "1" ]; then
    if [ "$(fable_budget_ok)" = "OK" ]; then
      MODEL=fable; EFFORT=xhigh
      echo "ESCALATED final attempt to fable@xhigh TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
    else
      echo "ESCALATION-SKIPPED fable 7d spend over guard TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
    fi
  fi
  SID=$(grep -o '"session_id":"[^"]*"' "$L" | tail -1 | cut -d'"' -f4)
  [ -n "$SID" ] || break
  echo "ATTEMPT=$A MODEL=$MODEL EFFORT=$EFFORT TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
  claude --model "$MODEL" --effort "$EFFORT" --dangerously-skip-permissions --resume "$SID" \
    -p "$P" \
    --output-format stream-json --verbose </dev/null >>"$L" 2>>"$E"
  RC=$?
done

echo "EXIT=$RC ATTEMPTS=$A" >"$D"
if [ "$RC" -eq 0 ] || terminal_pr_open; then fire_event done "run finished rc=$RC attempts=$A model=$MODEL"
else fire_event crash "run ended rc=$RC attempts=$A model=$MODEL (real failure or stop-flag)"; fi
exit 0
