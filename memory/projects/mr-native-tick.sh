#!/bin/bash
# mr-native-tick.sh v3 — NATIVE supervisor tick for Monster Realm v2 (cron watchdog + event-driven).
# Usage: mr-native-tick.sh [event-payload-file]   Env: MR_EVENT_SRC(cron|done|ci|crash|reset|manual)
#        SUP_MODEL(sonnet) SUP_EFFORT(medium) MR_TICK_DRYRUN=1 MR_FORCE=1 MR_NO_TOAST=1
set -u
HARNESS=/home/mdrewt/projects/ai-apps/claude-harness
PROJ=$HARNESS/projects/monster-realm
MEM=$HARNESS/memory/projects
export HOME=/home/mdrewt
export PATH=/home/mdrewt/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
LOG=$MEM/mr-native-tick.log
SUP_MODEL=${SUP_MODEL:-sonnet}
SUP_EFFORT=${SUP_EFFORT:-medium}
SRC=${MR_EVENT_SRC:-cron}
EVFILE="${1:-}"
TS(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
log(){ echo "$(TS) pid=$$ src=$SRC $*" >> "$LOG"; }
if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt 1000000 ]; then mv "$LOG" "$LOG.1"; fi

# tick-alive marker — always bumped when the tick body runs (pure cron/loop liveness)
date -u +%s > "$MEM/.native-supervisor-tick-alive"
# health heartbeat — suppressed while the last decision run failed and hasn't since succeeded (v2 semantics)
_hb_fail=$(cat "$MEM/.native-supervisor-last-failure-epoch" 2>/dev/null || echo 0)
_hb_ok=$(cat "$MEM/.native-supervisor-last-success" 2>/dev/null || echo 0)
if [ "${_hb_fail:-0}" -le "${_hb_ok:-0}" ]; then date -u +%s > "$MEM/.native-supervisor-heartbeat"; fi

# OLLAMA PREFLIGHT (best-effort, bounded, never blocks the loop): verify/start the local model server,
# fire a DETACHED warm-up so event summaries hit a warm model. Any failure -> marker only; all consumers
# of mr-ollama already degrade to pre-ollama behavior on OLLAMA-UNAVAILABLE.
if [ "${MR_NO_OLLAMA:-0}" != "1" ] && command -v ollama >/dev/null 2>&1; then
  if ! curl -s -m 2 http://localhost:11434/api/version >/dev/null 2>&1; then
    setsid ollama serve </dev/null >>/tmp/mr_ollama_serve.log 2>&1 &
    for i in 1 2 3 4 5; do sleep 2; curl -s -m 2 http://localhost:11434/api/version >/dev/null 2>&1 && break; done
  fi
  if curl -s -m 2 http://localhost:11434/api/version >/dev/null 2>&1; then
    OLM=$("$MEM/mr-ollama" model 2>/dev/null); OLM=${OLM:-hrbrmstr/ornith-35b-fixed}
    if ollama list 2>/dev/null | grep -q "^${OLM%%:latest}"; then
      # detached warm-up + 30m keep_alive; tick does NOT wait for the 21GB load
      setsid curl -s -m 300 http://localhost:11434/api/generate -d "{\"model\":\"$OLM\",\"prompt\":\"ok\",\"stream\":false,\"think\":false,\"options\":{\"num_predict\":1},\"keep_alive\":\"30m\"}" </dev/null >/dev/null 2>&1 &
      log "OLLAMA preflight: server up, $OLM present, warm-up dispatched"
    else
      printf '%s preflight MODEL-MISSING\n' "$(TS)" > "$MEM/.ollama-last"; log "OLLAMA preflight: model missing — advisory features degrade"
    fi
  else
    printf '%s preflight SERVER-DOWN\n' "$(TS)" > "$MEM/.ollama-last"; log "OLLAMA preflight: server down, start failed — advisory features degrade"
  fi
fi

# RECONCILE (accounting; runs even when disabled/over-budget): backfill ledger for finished runs
for DF in /tmp/mr_pass_*.done; do
  [ -e "$DF" ] || continue
  [ -e "$DF.recorded" ] && continue
  SL=$(basename "$DF"); SL=${SL#mr_pass_}; SL=${SL%.done}
  # age cap: never blind-backfill ancient done files
  DAGE=$(( $(date +%s) - $(stat -c %Y "$DF" 2>/dev/null || echo 0) ))
  [ "$DAGE" -gt 604800 ] && { touch "$DF.recorded"; continue; }
  # skip if the ledger already carries a cost-bearing row for this slice near/after the done time
  ALREADY=$(DF="$DF" SL="$SL" /usr/bin/python3 - <<'PYCHK'
import json, os, datetime
sl=os.environ["SL"]; dm=os.path.getmtime(os.environ["DF"])
hit="NO"
try:
    for l in open("/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-usage-ledger.jsonl"):
        try: d=json.loads(l)
        except Exception: continue
        if d.get("slice")!=sl or not d.get("cost_usd"): continue
        try: e=datetime.datetime.strptime(str(d.get("ts",""))[:19],"%Y-%m-%dT%H:%M:%S").timestamp()
        except Exception: continue
        if e >= dm - 12*3600: hit="YES"; break
except Exception: hit="ERR"
print(hit)
PYCHK
)
  [ "$ALREADY" = "YES" ] && { touch "$DF.recorded"; continue; }
  RLOG="/tmp/mr_pass_$SL.log"
  MDL=$(/usr/bin/python3 -c "import json;print(json.load(open('$MEM/.harness-runner.$SL.lock')).get('model','n/a'))" 2>/dev/null || echo "n/a")
  grep -q "^ESCALATED" "$RLOG" 2>/dev/null && MDL="escalated:${MDL}-to-fable"
  "$MEM/mr-record" ledger --run_id "wrapper-reconcile" --slice "$SL" --outcome "FINISHED($(cat "$DF" 2>/dev/null | head -c 40))" \
    --model "$MDL" --from-log "$RLOG" --notes "mechanical backfill by tick v3 reconcile" >> "$LOG" 2>&1 && touch "$DF.recorded"
  # single-run spend alert (visibility only, never a gate): flag unusually expensive runs same-hour
  RCOST=$(/usr/bin/python3 - "$RLOG" <<'PYC'
import json,sys
t=0.0
try:
    for l in open(sys.argv[1],errors="replace"):
        if '"type":"result"' in l:
            try: t+=float(json.loads(l).get("total_cost_usd") or 0)
            except Exception: pass
except Exception: pass
print(round(t,2))
PYC
)
  THRESH=$(/usr/bin/python3 -c "import json;print(json.load(open('$MEM/mr-budget-config.json')).get('single_run_alert_usd',150))" 2>/dev/null || echo 150)
  if /usr/bin/python3 -c "import sys;sys.exit(0 if float('$RCOST'or 0)>float('$THRESH') else 1)" 2>/dev/null; then
    log "SPEND-ALERT slice=$SL cost=\$$RCOST exceeds single_run_alert_usd=\$$THRESH"
    "$MEM/mr-record" handoff --title "SPEND-ALERT: $SL cost \$$RCOST (> \$$THRESH threshold)" --body "Single-run spend exceeded the alert threshold (visibility only, not a gate). Verify the slice's size was justified (right-sizing rule) at merge adjudication; adjust single_run_alert_usd in mr-budget-config.json if this class of slice is expected." >> "$LOG" 2>&1 || true
  fi
done

# RECONCILE part 2: dead-pid locks with no .done (SIGKILL/reboot class) -> CRASHED row, cost unknown
for LK in "$MEM"/.harness-runner.*.lock; do
  [ -e "$LK" ] || continue
  SL=$(basename "$LK"); SL=${SL#.harness-runner.}; SL=${SL%.lock}
  [ -f "/tmp/mr_pass_$SL.done" ] && continue
  PIDL=$(/usr/bin/python3 -c "import json;print(json.load(open('$LK')).get('session_leader') or '')" 2>/dev/null)
  { [ -n "$PIDL" ] && kill -0 "$PIDL" 2>/dev/null; } && continue
  SUTC=$(/usr/bin/python3 -c "import json;print(json.load(open('$LK')).get('started_utc','x'))" 2>/dev/null | tr -dc 'A-Za-z0-9')
  MARK="/tmp/mr_crash_rec_${SL}_${SUTC}"
  [ -e "$MARK" ] && continue
  "$MEM/mr-record" ledger --run_id "wrapper-reconcile" --slice "$SL" --outcome "CRASHED(no-done, dead leader $PIDL)" \
    --from-log "/tmp/mr_pass_$SL.log" --notes "dead-pid lock reconcile; verify true spend" >> "$LOG" 2>&1 && touch "$MARK"
done

# gate -1: kill-switch (MR_FORCE=1 overrides the pause for on-demand manual runs)
if [ -f "$MEM/.native-supervisor-disabled" ]; then
  if [ "${MR_FORCE:-0}" = "1" ]; then log "NOTE disabled-flag overridden (MR_FORCE=1 manual run)"; else
    [ -n "$EVFILE" ] && [ -f "$EVFILE" ] && case "$EVFILE" in "$MEM/pending-events/"*) : ;; *) mv "$EVFILE" "$MEM/pending-events/" 2>/dev/null;; esac
    log "SKIP disabled-flag (event requeued: ${EVFILE:-none})"; exit 0; fi
fi

# gate -0.5: human-gate marker (written by decision runs on gate-class BLOCKERs; makes multi-day
# waits FREE instead of $0.25-1.60/hour of "still waiting" decision runs). Wakes on: the wake_file
# appearing · any event tick (state changed) · manual/forced runs · marker older than 7 days (safety).
if [ -f "$MEM/.blocked-on-human" ] && [ "$SRC" = "cron" ] && [ "${MR_FORCE:-0}" != "1" ]; then
  WAKE=$(grep -m1 -oE "wake_file=[^ ]+" "$MEM/.blocked-on-human" 2>/dev/null | cut -d= -f2)
  MAGE=$(( $(date +%s) - $(stat -c %Y "$MEM/.blocked-on-human" 2>/dev/null || echo 0) ))
  if [ -n "$WAKE" ] && [ -e "$WAKE" ]; then
    rm -f "$MEM/.blocked-on-human"; log "GATE-LIFTED wake_file present: $WAKE"
  elif [ "$MAGE" -lt 604800 ]; then
    log "STANDDOWN gated-on-human ($(head -c 100 "$MEM/.blocked-on-human" | tr '\n' ' '))"; exit 0
  else
    log "NOTE human-gate marker >7d old — proceeding for a fresh look"
  fi
fi

# gate 0: tick-overlap lock — on contention, REQUEUE the event (never drop it)
exec 9>/tmp/mr_native_tick.flock
if ! flock -n 9; then
  [ -n "$EVFILE" ] && [ -f "$EVFILE" ] && case "$EVFILE" in "$MEM/pending-events/"*) : ;; *) mv "$EVFILE" "$MEM/pending-events/" 2>/dev/null;; esac
  log "SKIP flock-held (event requeued: ${EVFILE:-none})"; exit 0
fi
# debounce: cron-source only, and only when nothing is pending
if [ "$SRC" = "cron" ] && [ -z "$(ls -A "$MEM/pending-events" 2>/dev/null)" ]; then
  LSE=$(cat "$MEM/.last-tick-spawn-epoch" 2>/dev/null || echo 0)
  LSE=${LSE:-0}; case "$LSE" in ""|*[!0-9]*) LSE=0;; esac
  if [ $(( $(date +%s) - LSE )) -lt 120 ]; then log "SKIP debounce (<120s since last spawn)"; exit 0; fi
fi

# gate 1: fast-path — live rooted run and no .done awaiting merge and no pending events -> standdown
LIVE=0; DONE_WAIT=0; LIVE_SLICES=""
for L in "$MEM"/.harness-runner.*.lock; do
  [ -e "$L" ] || continue
  SLICE=$(basename "$L"); SLICE=${SLICE#.harness-runner.}; SLICE=${SLICE%.lock}
  PID=$(/usr/bin/python3 -c "import json,sys
try: print(json.load(open('$L')).get('session_leader') or '')
except Exception: print('')" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then LIVE=1; LIVE_SLICES="$LIVE_SLICES $SLICE($PID)"; fi
  [ -f "/tmp/mr_pass_${SLICE}.done" ] && DONE_WAIT=1
done
PENDING=$(ls -A "$MEM/pending-events" 2>/dev/null | head -1)
if [ "$LIVE" -eq 1 ] && [ "$DONE_WAIT" -eq 0 ] && [ -z "$PENDING" ]; then log "STANDDOWN live-chain:$LIVE_SLICES"; exit 0; fi

# gate 2: rate-limit reset-time from mr-state.json
# (ACCEPTED DUPLICATION: mr-situation also surfaces rate_limit_resets_at as data; THIS gate is the sole
#  mechanical enforcement. If the epoch-or-ISO parse below changes, it is the only parser that matters.)
RLGATE=$(/usr/bin/python3 - <<'PY'
import json, time
try:
    d = json.load(open("/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-state.json"))
    r = d.get("rate_limit_resets_at")
    def to_epoch(v):
        try: return float(v)
        except (TypeError, ValueError): pass
        import datetime
        try: return datetime.datetime.strptime(str(v).replace("Z","+0000"), "%Y-%m-%dT%H:%M:%S%z").timestamp()
        except Exception: return None
    e = to_epoch(r) if r else None
    if e and e > time.time():
        print("BLOCKED_UNTIL_%s" % r)
    else:
        print("CLEAR")
except Exception as e:
    print("CLEAR")
PY
)
case "$RLGATE" in BLOCKED_UNTIL_*) log "STANDDOWN rate-limit $RLGATE"; exit 0;; esac

# gate 3: human-activity probe
IDE=$(ps -eo cmd 2>/dev/null | grep -F -- '--replay-user-messages' | grep -F -- '--input-format' | grep -v grep | head -1)
WRITES=$(find "$HARNESS" "$PROJ" -type f \
  -not -path '*/.git/*' -not -path '*/node_modules/*' -not -path '*/target/*' \
  -not -path '*/.claude/worktrees/*' \
  -not -path "$HARNESS/memory/*" -mmin -6 2>/dev/null | head -1)
# (worktrees are AGENT-owned by design — sibling fan-out writes are not human activity; retro 2026-07-24)
if [ -n "$IDE" ]; then log "STANDDOWN human-ide-session"; exit 0; fi
if [ -n "$WRITES" ]; then
  log "STANDDOWN recent-writes: $WRITES"
  if [ "$SRC" != "cron" ] && [ "$SRC" != "manual" ] && [ ! -f "/tmp/mr_evretry_$SRC" ]; then
    touch "/tmp/mr_evretry_$SRC"
    setsid /bin/bash -c "exec 9>&- 2>/dev/null; sleep 420; rm -f /tmp/mr_evretry_$SRC; MR_EVENT_SRC=${SRC} exec /bin/bash '$MEM/mr-native-tick.sh'" </dev/null >/dev/null 2>&1 &
    log "RETRY scheduled in 7min (src=$SRC)"
  fi
  exit 0
fi

# gate 4: chain-owner mutex freshness (TTL 600s)
if [ -d "$MEM/.harness-runner.lock.d" ]; then
  HB=$(stat -c %Y "$MEM/.harness-runner.lock.d/owner.json" 2>/dev/null || echo 0)
  AGE=$(( $(date +%s) - HB ))
  if [ "$AGE" -lt 600 ]; then log "STANDDOWN chain-mutex-fresh age=${AGE}s"; exit 0; fi
  log "NOTE stale chain-mutex age=${AGE}s — LLM tick will evaluate takeover"
fi

# situation bundle + governor
SIT=$("$MEM/mr-situation" 2>/dev/null || echo '{"error":"situation-unavailable"}')
GSTATE=$(echo "$SIT" | /usr/bin/python3 -c "import json,sys
try: print(json.load(sys.stdin).get('budget',{}).get('state','UNKNOWN'))
except Exception: print('UNKNOWN')")
if [ "$GSTATE" = "HARD-STOP" ]; then log "STANDDOWN budget-hard-stop (>97% of weekly); pending events retained"; exit 0; fi

# assemble prompt (SSOT + situation + pending events + event arg)
RID="native-$(date -u +%Y%m%dT%H%M%SZ)-$$"
PROMPTF="/tmp/mr_tick_prompt_$RID.md"
cat "$MEM/mr-supervisor-prompt-native.md" > "$PROMPTF"
{ echo; echo "## TICK PROVENANCE"; echo "src=$SRC forced=${MR_FORCE:-0} invoked_at=$(TS) rid=$RID"; } >> "$PROMPTF"
{ echo; echo "## LIVE SITUATION (HINTS-ONLY — mechanically generated; re-verify anything you are about to mutate; governor state: $GSTATE$([ "$GSTATE" = UNKNOWN ] && echo ' — BUDGET UNCOMPUTABLE, flag this as a BLOCKER in your records'))"; echo '```json'; echo "$SIT"; echo '```'; } >> "$PROMPTF"
CONSUMED=""
for EV in "$MEM"/pending-events/*.md; do
  [ -e "$EV" ] || continue
  { echo; echo "## EVENT ($(basename "$EV"))"; cat "$EV"; } >> "$PROMPTF"
  CONSUMED="$CONSUMED $EV"
done
if [ -n "$EVFILE" ] && [ -f "$EVFILE" ]; then
  case "$CONSUMED" in *"$EVFILE"*) : ;; *) { echo; echo "## EVENT (direct)"; cat "$EVFILE"; } >> "$PROMPTF"; CONSUMED="$CONSUMED $EVFILE";; esac
fi
TLOG="/tmp/mr_native_tick_${RID}.log"
if [ "${MR_TICK_DRYRUN:-0}" = "1" ]; then
  log "DRYRUN would-spawn model=$SUP_MODEL effort=$SUP_EFFORT governor=$GSTATE prompt_bytes=$(stat -c %s "$PROMPTF") events=$(echo $CONSUMED | wc -w)"
  echo "DECISION-NEEDED (dryrun) prompt=$PROMPTF"; exit 0
fi
log "SPAWN model=$SUP_MODEL effort=$SUP_EFFORT governor=$GSTATE rid=$RID tlog=$TLOG events=$(echo $CONSUMED | wc -w)"
date +%s > "$MEM/.last-tick-spawn-epoch"
cd "$HARNESS" || { log "ERROR cd-harness-failed"; exit 1; }
timeout 5400 claude --model "$SUP_MODEL" --effort "$SUP_EFFORT" --dangerously-skip-permissions \
  --output-format stream-json --verbose \
  -p "$(cat "$PROMPTF")" >> "$TLOG" 2>&1
RC=$?
read -r COST TICKMODEL <<< "$(/usr/bin/python3 - "$TLOG" <<'PYX'
import json,sys,re
t=0.0; f=False; model=""
try:
    for l in open(sys.argv[1],errors="replace"):
        if not model:
            m=re.search(r'"model":"(claude-[a-z0-9.-]+)"', l)
            if m: model=m.group(1)
        if '"type":"result"' in l:
            try:
                c=json.loads(l).get("total_cost_usd")
                if c is not None: t+=float(c); f=True
            except Exception: pass
except Exception: pass
print((str(round(t,4)) if f else "-"), (model or "-"))
PYX
)"
[ "$COST" = "-" ] && COST=""
[ "$TICKMODEL" = "-" ] && TICKMODEL="$SUP_MODEL"
log "SPAWN-DONE rc=$RC cost=${COST:-unknown} model=$TICKMODEL rid=$RID"

if [ "$RC" -eq 0 ]; then
  date -u +%s > "$MEM/.native-supervisor-last-success"
  rm -f "$MEM/.native-supervisor-last-failure" "$MEM/.native-supervisor-last-failure-epoch"
  date -u +%s > "$MEM/.native-supervisor-heartbeat"
  mkdir -p "$MEM/pending-events/archive"
  for EV in $CONSUMED; do [ -f "$EV" ] && mv "$EV" "$MEM/pending-events/archive/$(date -u +%s).$(basename "$EV")" 2>/dev/null; done
  MR_RECORD_WRAPPER=1 "$MEM/mr-record" ledger --run_id "$RID" --slice SUPERVISOR --outcome "tick-ok src=$SRC" \
    ${COST:+--cost "$COST"} --model "$TICKMODEL" --notes "governor=$GSTATE" >> "$LOG" 2>&1 || true
else
  REASON=$(grep -m1 -iE 'not logged in|please run /login|invalid api key|api key|authentication|unauthorized|forbidden' "$TLOG" 2>/dev/null | tr -d '\r' | head -c 200)
  [ -z "$REASON" ] && REASON=$(tail -n 3 "$TLOG" 2>/dev/null | tr '\r\n' '  ' | head -c 200)
  date -u +%s > "$MEM/.native-supervisor-last-failure-epoch"
  printf '%s\trc=%s\trid=%s\treason=%s\n' "$(TS)" "$RC" "$RID" "$REASON" > "$MEM/.native-supervisor-last-failure"
  log "SPAWN-FAIL rc=$RC rid=$RID reason=${REASON}"
  if [ "${MR_NO_TOAST:-0}" != "1" ] && echo "$REASON" | grep -qiE "not logged in|/login"; then
    powershell.exe -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('Claude CLI in WSL is logged out - Monster Realm supervisor is paused. Run: claude /login', 0, 'MR Supervisor', 48)" >/dev/null 2>&1 &
  fi
fi
rm -f "$PROMPTF"
exit 0
