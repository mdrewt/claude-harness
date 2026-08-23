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
unset MR_FORCE MR_TICK_DRYRUN 2>/dev/null || true   # operator-forced-ness must NOT propagate to event ticks (pause semantics)
# lp-gates: MR_SLICE binds a session to its acceptance ledger for the Stop hook. It is
# PREFIX-SCOPED on each `claude` invocation below and deliberately NOT exported at script scope:
# fire_event() spawns mr-native-tick.sh with this wrapper's environment, so a script-scope export
# would hand a SUPERVISOR decision tick a slice's MR_SLICE — the same leak class the line above
# exists to prevent. mr-native-tick.sh additionally scrubs it (`env -u MR_SLICE`) as belt-and-braces.
S="${1:?usage: mr-launch.sh <slice> [model] [effort] [repo]}"
MODEL="${2:-opus}"
EFFORT="${3:-high}"
MAX_ATTEMPTS=3
HARNESS=/home/mdrewt/projects/ai-apps/claude-harness
PROJDIR="$HARNESS/projects/monster-realm"  # cwd for rooted runs: project-level .claude (31 domain skills, desync-guard, reducer-security-auditor) is only discovered from inside PROJ; harness .claude still inherited via ancestor walk (probe-verified 2026-07-26)
MEM=$HARNESS/memory/projects
# lp-00 repo routing. $4 is authoritative (mr-spawn passes it, derived from declared touches via
# mr-repo-of); absent, fall back to the lock, then to `project` — so a hand-run mr-launch.sh keeps
# its pre-lp-00 behaviour exactly. RUNDIR is the cwd (and therefore which .claude is discovered);
# PRREPO is what terminal_pr_open polls. Getting PRREPO wrong is the expensive one: polling the
# wrong repo makes terminal_pr_open permanently false, which burns all 3 attempts on a finished run.
REPO="${4:-}"
if [ -z "$REPO" ] && [ -r "$MEM/.harness-runner.$S.lock" ]; then
  REPO=$(/usr/bin/python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get('repo','') or '')" "$MEM/.harness-runner.$S.lock" 2>/dev/null || echo "")
fi
case "${REPO:-project}" in
  harness) RUNDIR="$HARNESS"; OTHERDIR="$PROJDIR"; PRREPO="mdrewt/claude-harness" ;;
  *)       REPO=project; RUNDIR="$PROJDIR"; OTHERDIR="$HARNESS"; PRREPO="mdrewt/monster-realm" ;;
esac
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
      WT=$(git -C "$RUNDIR" worktree list 2>/dev/null | grep -i "$S" | awk '{print $1}' | head -1)
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
  # Terminal = PR OPEN or MERGED (2026-07-24). FAIL-SAFE (2026-07-25 gh outage): gh itself failing
  # (missing shim/auth/network) means we CANNOT know -> treat as TERMINAL: stop resumes, let the
  # supervisor triage from .done + crash event. Blind resumes cost attempts; early stop is cheap.
  local out rc
  out=$(gh pr list -R "$PRREPO" --state all -L 40 --json headRefName,state \
    -q '.[] | select(.state=="OPEN" or .state=="MERGED") | .headRefName' 2>/dev/null); rc=$?
  if [ "$rc" -ne 0 ]; then echo "TERMINAL-CHECK-INDETERMINATE gh rc=$rc" >>"$L" 2>/dev/null; return 0; fi
  # ANCHORED match (2026-07-25): unanchored grep cross-matched slice ids (pt-c1 hit pt-c1b's branch;
  # slice 'B' matched any branch containing 'b') — false terminal states mask premature stops.
  printf '%s\n' "$out" | grep -qiE "(^|/|-|_)${S}([-_]|$)"
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
# (haiku triage hop removed 2026-07-26 — 0 invocations ever; the local-model triage below covers the identical ambiguous-failure class for $0 and works during API outages. Rollback: git history.)

A=1
echo "ATTEMPT=$A MODEL=$MODEL EFFORT=$EFFORT REPO=$REPO RUNDIR=$RUNDIR PRREPO=$PRREPO TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
( cd "$RUNDIR" && MR_SLICE="$S" claude --model "$MODEL" --effort "$EFFORT" --dangerously-skip-permissions -p "$(cat "$B")" \
  --add-dir "$OTHERDIR" --output-format stream-json --verbose ) </dev/null >>"$L" 2>"$E"
RC=$?
PREV_SIG=""
while [ "$A" -lt "$MAX_ATTEMPTS" ] \
      && [ ! -f "/tmp/mr_stop_$S" ] && [ ! -f /tmp/mr_stop_all ] \
      && ! terminal_pr_open; do
  if [ "$RC" -ne 0 ] && auth_failure; then break; fi   # auth: dead now; supervisor/toast handles
  CUR_SIG=$(tail -c 1024 "$E" 2>/dev/null | md5sum | cut -d' ' -f1)
  if [ "$RC" -eq 0 ]; then
    P="You stopped before a valid stopping point (no open PR for this slice, no stop-flag; if you parked you must have pushed the branch + documented the blocker — verify you did). Do not summarize and stop. Push the branch if unpushed, then continue the brief from where you left off. If you reach the point where the PR is OPEN with local ci green: STOP — that IS your terminal state; NEVER run gh pr merge (supervisor-only)."
  elif [ "$RC" -ne 0 ] && [ -n "$PREV_SIG" ] && [ "$CUR_SIG" = "$PREV_SIG" ]; then
    break  # identical failure signature twice: deterministic bug — real failure, stop
  elif transient_failure; then
    sleep $((60 * A))
    P="Your previous session was interrupted by a transient API/network error mid-work. Re-verify the worktree and branch state (git status, git log) before assuming anything completed, then continue the brief from where you actually left off. Push any unpushed commits first."
  elif [ "$("$MEM/mr-ollama" triage "$S" 2>/dev/null | head -1 | grep -io "^transient" || echo real)" = "transient" ]; then
    sleep $((60 * A))
    P="Your previous session was interrupted by what appears to be a transient infrastructure error. Re-verify worktree/branch state before assuming anything completed, then continue the brief from where you actually left off."
  else
    break  # real failure — leave for the supervisor to triage
  fi
  PREV_SIG="$CUR_SIG"
  A=$((A+1))
  # escalate-on-final-attempt: opus -> fable@xhigh (quality-first; budget-guarded)
  if [ "$A" -eq "$MAX_ATTEMPTS" ] && [ "$RC" -ne 0 ] && [ "$MODEL" = "opus" ] && [ "${MR_NO_ESCALATE:-0}" != "1" ]; then
    # escalate only on REAL failure — an rc=0 premature stop is finishing, not failing (retro 2026-07-24: two $12 fable confirm-exits)
    if [ "$(fable_budget_ok)" = "OK" ]; then
      MODEL=fable; EFFORT=xhigh
      echo "ESCALATED final attempt to fable@xhigh TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
      /usr/bin/python3 -c "import json;print(json.load(open('$MEM/mr-budget-config.json')).get('escalation_headroom_usd',60))" > "/tmp/mr_cap_topup_$S" 2>/dev/null || true   # cost-watch cap top-up (review F12: rescue attempt gets headroom, not crumbs)
    else
      echo "ESCALATION-SKIPPED fable 7d spend over guard TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
    fi
  fi
  SID=$(grep -o '"session_id":"[^"]*"' "$L" | tail -1 | cut -d'"' -f4)
  [ -n "$SID" ] || break
  { [ -f "/tmp/mr_stop_$S" ] || [ -f /tmp/mr_stop_all ]; } && break   # mechanical gate before EVERY spawn (cost-watch review cond i)
  echo "ATTEMPT=$A MODEL=$MODEL EFFORT=$EFFORT TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
  ( cd "$RUNDIR" && MR_SLICE="$S" claude --model "$MODEL" --effort "$EFFORT" --dangerously-skip-permissions --resume "$SID" \
    -p "$P" \
    --add-dir "$OTHERDIR" --output-format stream-json --verbose ) </dev/null >>"$L" 2>>"$E"
  RC=$?
done

# ===== cost-cap wrap pass (plan v2: watcher retired; unpoliced-but-bounded; stop flag PERSISTS through wrap — cleanup happens only at next spawn, review cond iii) =====
RC=${RC:-1}
if grep -q "cost-cap" "/tmp/mr_stop_$S.reason" 2>/dev/null && [ "$RC" -ne 0 ] && ! terminal_pr_open; then
  touch "/tmp/mr_wrap_$S"   # F-E: watcher retires instead of killing the wrap
  WSID=$(grep -o '"session_id":"[^"]*"' "$L" | tail -1 | cut -d'"' -f4)
  ACT=$(head -c 120 "/tmp/mr_stop_$S.reason" 2>/dev/null | tr '\n' ' ')
  if [ -n "$WSID" ]; then
    echo "COST-CAP-WRAP start TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
    WRAPP="Cost-cap shutdown ($ACT). Do NOT start new work, new scope, or ANY new subagents (the stop flag is active and stays active). If .git/index.lock is stale in the worktree, remove it. Commit all WIP on the slice branch as wip($S): cost-cap park, push the branch, then write the handoff (mr-record handoff): state of work, exactly what remains, and the SIZING LESSON — why this slice exceeded its cap. Any local-model summary you include must be labeled UNVERIFIED advisory. Then stop. NEVER run gh pr merge."
    ( cd "$RUNDIR" && MR_SLICE="$S" timeout 900 claude --model "$MODEL" --effort low --dangerously-skip-permissions --resume "$WSID" -p "$WRAPP" \
      --add-dir "$OTHERDIR" --output-format stream-json --verbose ) </dev/null >>"$L" 2>>"$E" || true
    echo "COST-CAP-WRAP end rc=$? TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$L"
  fi
  if [ -f "$MEM/.costpark-$S" ]; then
    "$MEM/mr-ask-drew" "costpark2-$S" --repo mdrewt/claude-harness --question "Slice $S hit its cost cap a SECOND time ($ACT). Resize (cap_override in pass-vars), split, or abandon?" --root "Repeated cost-cap park = sizing failure (doctrine §5)" --recommend "Split the slice; review both handoffs for the seam" >/dev/null 2>&1 || true
  else
    "$MEM/mr-ask-drew" "costpark-$S" --repo mdrewt/claude-harness --question "FYI: slice $S was cost-cap parked ($ACT; wrap-pass WIP committed). It will NOT relaunch without cap_override in pass-vars." --root "Fire-time cost-cap notification (review F14)" --recommend "None needed now; the supervisor proposes next steps at reconcile" >/dev/null 2>&1 || true
  fi
  echo "$ACT parked=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$MEM/.costpark-$S"
  rm -f "/tmp/mr_wrap_$S"
fi
echo "EXIT=$RC ATTEMPTS=$A" >"$D"
if [ "$RC" -eq 0 ] || terminal_pr_open; then fire_event done "run finished rc=$RC attempts=$A model=$MODEL"
else fire_event crash "run ended rc=$RC attempts=$A model=$MODEL (real failure or stop-flag)"; fi
exit 0
