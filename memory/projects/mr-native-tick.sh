#!/bin/bash
# mr-native-tick.sh v3 — NATIVE supervisor tick for Monster Realm v2 (cron watchdog + event-driven).
# Usage: mr-native-tick.sh [event-payload-file]   Env: MR_EVENT_SRC(cron|done|ci|crash|reset|manual)
#        SUP_MODEL(sonnet) SUP_EFFORT(medium) MR_TICK_DRYRUN=1 MR_FORCE=1 MR_NO_TOAST=1
set -u
HARNESS=/home/mdrewt/projects/ai-apps/claude-harness
PROJ=$HARNESS/projects/monster-realm
MEM=$HARNESS/memory/projects
export HOME=/home/mdrewt
export PATH=/home/mdrewt/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/mdrewt/.asdf/shims:/home/mdrewt/bin
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

# (per-tick ollama preflight removed 2026-08-22 by lp-ollama — 803 warm-ups, 0 invocations across two
# generations; the haiku hop it replaced is recorded at mr-launch.sh:94 as "0 invocations ever". mr-ollama
# and the local stack are deliberately RETAINED for manual/experimental use — its consumers still degrade
# on OLLAMA-UNAVAILABLE. Rollback: restore from git history if a real per-tick consumer ever appears.)

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
        # reversal rows are accounting, not evidence that a run was recorded — without this a
        # CORRECTION row would make any rerun of the same slice within 12h look already-backfilled
        # and its real cost would be silently dropped (2026-08-01 cost-correction pass)
        if str(d.get("outcome","")).upper().startswith("CORRECTION"): continue
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
  # lp-02: `--ci not-applicable` because this is a PRE-MERGE row — "master CI after this slice" is
  # not yet a defined property, and leaving it empty is 65.8% of the measured master_ci_after hole.
  # `timeout 60` because this write now derives the slice-size columns via mr-slice-quality: the
  # heartbeats at :21/:25 are already fresh and the flock is ~180 lines below, so a stall here
  # leaves the loop looking alive while nothing progresses. Precedent: the handoff write below.
  timeout 60 "$MEM/mr-record" ledger --run_id "wrapper-reconcile" --slice "$SL" --outcome "FINISHED($(cat "$DF" 2>/dev/null | head -c 40))" \
    --ci not-applicable \
    --model "$MDL" --from-log "$RLOG" --notes "mechanical backfill by tick v3 reconcile" >> "$LOG" 2>&1 && touch "$DF.recorded"
  # P3 durability (2026-07-26): persist the run census into the pending done-event so forensics survive /tmp loss
  EVF="$MEM/pending-events/$SL.done.md"
  if [ -f "$EVF" ] && [ -f "$RLOG" ]; then
    { echo "--- RUN CENSUS (reconcile-time; durable) ---"
      grep -aE "^ATTEMPT=|^ESCALAT" "$RLOG" | head -6
      echo "model event counts:"; grep -ao "\"model\":\"claude-[a-z0-9.-]*\"" "$RLOG" | sort | uniq -c | head -6
      echo "cost: recorded in the ledger FINISHED row"
    } >> "$EVF" 2>/dev/null || true
  fi
  # single-run spend alert (visibility only, never a gate): flag unusually expensive runs same-hour
  # cost via the mr-cost-sum SSOT — total_cost_usd is CUMULATIVE per accumulation run, so the
  # naive sum this replaced overcounted multi-attempt runs (uxd2 $423.65 vs a true $165.65)
  RCOST=$("$MEM/mr-cost-sum" "$RLOG" 2>/dev/null)
  # "-" is a legitimate COST-UNKNOWN (no result events). EMPTY means the helper itself failed
  # (missing, non-executable, truncated) — degrade LOUDLY, because silently substituting 0 would
  # suppress the SPEND-ALERT for a genuinely expensive run.
  [ -z "$RCOST" ] && log "COST-HELPER-FAILED mr-cost-sum produced no output for slice $SL — SPEND-ALERT suppressed this run"
  case "$RCOST" in ''|'-') RCOST=0 ;; esac   # float('-') would raise in the threshold compare below
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
  # lp-02: same pre-merge `--ci not-applicable` and same `timeout 60` bound as the FINISHED write.
  timeout 60 "$MEM/mr-record" ledger --run_id "wrapper-reconcile" --slice "$SL" --outcome "CRASHED(no-done, dead leader $PIDL)" \
    --ci not-applicable \
    --from-log "/tmp/mr_pass_$SL.log" --notes "dead-pid lock reconcile; verify true spend" >> "$LOG" 2>&1 && touch "$MARK"
done

# gate -1: kill-switch (MR_FORCE=1 overrides the pause for on-demand manual runs)
if [ -f "$MEM/.native-supervisor-disabled" ]; then
  # lp-09: report WHO holds and how deep the queue behind it is. The flag used to be a zero-byte
  # file written by two indistinguishable actors, and the backlog behind it was invisible — one
  # done-event once sat 83.9h unprocessed with nothing surfacing that fact.
  HOLD_BY=$("$MEM/mr-hold" status --json 2>/dev/null | /usr/bin/python3 -c "import json,sys;print(json.load(sys.stdin).get('by') or '?')" 2>/dev/null || echo "?")
  # DEPTH ALONE WAS NOT ENOUGH — that is the whole lesson of the 83.9h event. A queue of 1 looks
  # healthy; a queue of 1 that has been sitting for three and a half days does not. `mr-hold queue`
  # owns the arithmetic (one implementation, selftested) and this replaces the two duplicate
  # `find | wc -l` copies that used to live here. The `|| echo` fallback is load-bearing: a broken
  # helper must degrade a log line, never take the cron entrypoint down with it.
  # Degrade on EMPTY, not merely on non-zero: a helper that exits 0 and prints nothing would
  # otherwise emit `SKIP hold by=operator ` with the reporting silently absent — a green-looking log
  # line that reports nothing is exactly the failure class this gate exists to surface. (Caught by
  # the A8 behavioural fixture, whose stub mr-hold does precisely that.)
  qstat(){ QS=$("$MEM/mr-hold" queue 2>/dev/null); [ -n "${QS:-}" ] || QS="queued_events=? oldest_event_age_h=? (mr-hold queue produced no output)"; printf '%s' "$QS"; }
  # lp-11a: ESCALATE AN UNATTRIBUTED HOLD. This is the single change that bounds the damage of every
  # future accident of this shape, including ones nobody has thought of yet.
  #
  # On 2026-08-17 a mis-invoked tool fired the operator's kill switch by accident. The fail-safe
  # below did exactly what it should — no provenance means OPERATOR, and the loop may never clear an
  # OPERATOR hold — but the result was 8 consecutive ticks skipping in SILENCE (13:00Z-20:00Z), one
  # log line each, no notification. The operator found out by asking. An 8-hour outage and a 1-hour
  # outage differ only in whether anyone was told.
  #
  # So: the fail-safe is untouched (we still SKIP, and still never clear), but a hold we cannot
  # ATTRIBUTE now says so out loud, exactly once. `attributed:false` means the flag carries no
  # `by=` record at all — which is precisely the signature of an accidental `touch`, and NOT the
  # signature of an operator pause once `mr-supervisor-disable` routes through `mr-hold set`
  # (shipped alongside this change). Default on helper failure is UNATTRIBUTED: if mr-hold cannot
  # answer, something is wrong with the kill switch and that is itself worth one issue.
  #
  # Deduped on the flag's MTIME, so a long deliberate pause escalates once and stays quiet, while a
  # genuinely new accidental flag escalates again. mr-ask-drew always exits 0 by contract; every
  # call here is `|| true` regardless, because a notification failure must never take the cron
  # entrypoint down — that would trade a visible outage for an invisible one.
  HOLD_ATTR=$("$MEM/mr-hold" status --json 2>/dev/null | /usr/bin/python3 -c "import json,sys;print('1' if json.load(sys.stdin).get('attributed') else '0')" 2>/dev/null || echo 0)
  FMT=$(stat -c %Y "$MEM/.native-supervisor-disabled" 2>/dev/null || echo 0)
  HOLD_AGE_H=$(( ( $(date +%s) - ${FMT:-0} ) / 3600 ))
  # One escalation path, two triggers. Every call is `|| true` and every notification is deduped on
  # the flag's MTIME, so a long deliberate pause produces exactly one issue and then stays quiet,
  # while a genuinely NEW flag escalates again. `timeout` bounds the gh call: mr-ask-drew exits 0 by
  # contract, but contract is not the same as bounded, and this is the cron entrypoint.
  hold_escalate() {  # $1=slug  $2=sentinel  $3=headline  $4=question  $5=recommendation
    [ -e "$2" ] && return 0
    touch "$2" 2>/dev/null || true
    log "$3 $(qstat)"
    timeout 60 "$MEM/mr-record" handoff --title "$3" --body "$4 $5" >> "$LOG" 2>&1 || true
    timeout 90 "$MEM/mr-ask-drew" "$1" --repo mdrewt/claude-harness \
      --question "$4" --recommend "$5" \
      --context "Hold: by=$HOLD_BY attributed=$HOLD_ATTR age=${HOLD_AGE_H}h mtime=$FMT. $(qstat). Escalated once per flag instance; the loop remains held either way — only the operator clears it." \
      >> "$LOG" 2>&1 || true
  }
  if [ "${HOLD_ATTR:-0}" = "0" ]; then
    # TRIGGER 1 — no provenance at all. This is the signature of an accidental `touch`, and it is
    # what wedged the loop for 8 silent hours on 2026-08-17.
    hold_escalate hold-unattributed "/tmp/mr_hold_unattributed_$FMT" \
      "HOLD-UNATTRIBUTED flag carries no provenance record (mtime=$FMT) — escalating once; loop stays held" \
      "The build loop is held by a kill-switch flag with no provenance record. Did you pause it?" \
      "If you did not pause deliberately, something fired the switch by accident — run mr-supervisor-enable. Every tick until then is a skipped hour."
  elif [ "${HOLD_AGE_H:-0}" -ge 6 ]; then
    # TRIGGER 2 — attributed, but old. Attribution is NOT proof of intent: `mr-hold set --by
    # operator` is unrestricted by caller, so a stray session can write a perfectly well-formed
    # OPERATOR hold that the loop may never clear and that trigger 1 would wave straight through.
    # Age catches that, and catches a supervisor self-pause whose clearing condition never arrived.
    # Deliberate multi-day pauses cost exactly one notification, which is the right price for
    # never again losing a day to a hold nobody remembers setting.
    hold_escalate hold-aged "/tmp/mr_hold_aged_$FMT" \
      "HOLD-AGED by=$HOLD_BY in force ${HOLD_AGE_H}h — escalating once; loop stays held" \
      "The build loop has been held for ${HOLD_AGE_H}h (by=$HOLD_BY). Is that still intended?" \
      "If the pause has served its purpose, run mr-supervisor-enable. If it is deliberate, close this — it will not ask again for this hold."
  fi
  if [ "${MR_FORCE:-0}" = "1" ]; then log "NOTE hold overridden by MR_FORCE=1 (manual run; hold by=$HOLD_BY REMAINS set) $(qstat)"; else
    [ -n "$EVFILE" ] && [ -f "$EVFILE" ] && case "$EVFILE" in "$MEM/pending-events/"*) : ;; *) mv "$EVFILE" "$MEM/pending-events/" 2>/dev/null;; esac
    log "SKIP hold by=$HOLD_BY (event requeued: ${EVFILE:-none}) $(qstat)"; exit 0; fi
fi

# gate -0.5: human-gate marker (written by decision runs on gate-class BLOCKERs; makes multi-day
# waits FREE instead of $0.25-1.60/hour of "still waiting" decision runs). Wakes on: the wake_file
# appearing · any event tick (state changed) · manual/forced runs · marker older than 7 days (safety).
# FEEDBACK LEDGER RECONCILER (doctrine §8; cheap, always rc0; dedup'd decision issue on new signature)
FBERR=$("$MEM/mr-feedback" check 2>/dev/null | grep -v "^FEEDBACK-CHECK-OK" | head -4)
[ -n "$FBERR" ] && log "FEEDBACK-CHECK: $(echo "$FBERR" | tr '\n' ' ')"

# DAILY SELFCHECK (mechanical corpus health; 24h marker gate)
if [ ! -f "$MEM/.selfcheck-last" ] || [ $(( $(date +%s) - $(stat -c %Y "$MEM/.selfcheck-last" 2>/dev/null || echo 0) )) -gt 86400 ]; then
  # lp-02: bounded. mr-selfcheck now runs a real git fixture and real mr-record invocations
  # (the lp02-* behavioural block), so it is no longer instantaneous — and it runs in the same
  # post-heartbeat, pre-flock window as the reconcile above.
  SC=$(timeout 300 "$MEM/mr-selfcheck" 2>/dev/null | grep -v "^SELFCHECK-OK" | head -3)
  [ -n "$SC" ] && log "SELFCHECK: $(echo "$SC" | tr '\n' ' ')"
  touch "$MEM/.selfcheck-last"
fi

if [ -f "$MEM/.blocked-on-human" ] && [ "$SRC" = "cron" ] && [ "${MR_FORCE:-0}" != "1" ]; then
  WAKE=$(grep -m1 -oE "wake_file=[^ ]+" "$MEM/.blocked-on-human" 2>/dev/null | cut -d= -f2)
  MAGE=$(( $(date +%s) - $(stat -c %Y "$MEM/.blocked-on-human" 2>/dev/null || echo 0) ))
  if [ -n "$WAKE" ] && [ -e "$WAKE" ]; then
    rm -f "$MEM/.blocked-on-human"; log "GATE-LIFTED wake_file present: $WAKE"
  elif [ "$MAGE" -lt 604800 ]; then
    WI=$(grep -m1 -oE "wake_issue=[0-9]+" "$MEM/.blocked-on-human" 2>/dev/null | cut -d= -f2)
    if [ -n "$WI" ] && ! { OP=$(cat "/tmp/mr_decwatch_$WI.lock.d/pid" 2>/dev/null); [ -n "$OP" ] && kill -0 "$OP" 2>/dev/null; }; then
      WSLUG=$(grep -m1 -oE "DECISION\([^)]+\)" "$MEM/.blocked-on-human" 2>/dev/null | sed 's/DECISION(//;s/)//'); WSLUG=${WSLUG:-decision}
      setsid bash "$MEM/mr-decision-watch" "$WI" "$WSLUG" >/dev/null 2>&1 & disown
      log "DECISION-WATCH respawned issue=$WI (was dead — reboot?)"
    fi
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
# (debounce removed 2026-07-26 — 0 fires in 60+ production ticks; flock + durable-event requeue cover the class. Rollback: restore from git history if paired cron+event spawns ever double-run.)

# gate 1: fast-path — live rooted run and no .done awaiting merge and no pending events -> standdown
LIVE=0; DONE_WAIT=0; LIVE_SLICES=""; LIVE_BARE=""
for L in "$MEM"/.harness-runner.*.lock; do
  [ -e "$L" ] || continue
  SLICE=$(basename "$L"); SLICE=${SLICE#.harness-runner.}; SLICE=${SLICE%.lock}
  PID=$(/usr/bin/python3 -c "import json,sys
try: print(json.load(open('$L')).get('session_leader') or '')
except Exception: print('')" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then LIVE=1; LIVE_SLICES="$LIVE_SLICES $SLICE($PID)"; LIVE_BARE="$LIVE_BARE $SLICE"; fi
  [ -f "/tmp/mr_pass_${SLICE}.done" ] && DONE_WAIT=1
done
PENDING=$(ls -A "$MEM/pending-events" 2>/dev/null | grep -v "^archive$" | head -1)   # archive/ lives inside this dir — excluding it restores the FREE fastpath (bug 2026-07-26: every live-chain standdown was a paid spawn since first archival)
# WATCHER liveness — keyed on a LIVE per-slice lock, NOT on vars.json. Nothing anywhere deletes
# vars.json (decision runs rm the .done and leave it), so the old predicate fired for every
# long-merged slice forever: 199/199 fires in the 48h to 2026-08-01 were false, and 3 of the 5
# lines in the `tail -5` the supervisor reads first each tick were this spam. The lock is written
# at mr-spawn:108 and the watcher spawned at :112, so lock-exists => watcher-was-started holds.
# The .done guard STAYS: mr-cost-watch exits the moment .done appears (mr-cost-watch:67) while
# mr-launch.sh:151 keeps the leader alive through fire_event's mr-ollama summarize-run, so
# lock-alive + no-watcher is EXPECTED for that window and must not alarm.
for LS in $LIVE_BARE; do
  [ -f "/tmp/mr_pass_$LS.done" ] && continue
  CW=$(cat "/tmp/mr_costwatch_$LS.lock.d/pid" 2>/dev/null)
  { [ -n "$CW" ] && kill -0 "$CW" 2>/dev/null; } || log "WATCHER-DEAD costwatch missing for live slice $LS (SPEND-ALERT remains the post-hoc net)"
done
# ORPHAN-RUN — retains the one class the vars.json predicate genuinely covered. mr-spawn writes
# vars.json and launches at :62 but only writes the lock at :97-109, after sleep 4 + up to 90s of
# model-assert polling (doubled on retry), so a PAID run can be live with no lock at all — and if
# mr-spawn is killed in that window the run is invisible to gate 1, mr-situation and the reconcile.
# A fresh pass-log mtime is what separates that from the stale vars.json every merged slice leaves.
for LK in /tmp/mr_pass_*.vars.json; do
  [ -f "$LK" ] || continue; LS=$(basename "$LK" .vars.json); LS=${LS#mr_pass_}
  [ -f "/tmp/mr_pass_$LS.done" ] && continue
  [ -e "$MEM/.harness-runner.$LS.lock" ] && continue
  RL="/tmp/mr_pass_$LS.log"; [ -f "$RL" ] || continue
  RLAGE=$(( $(date +%s) - $(stat -c %Y "$RL" 2>/dev/null || echo 0) ))
  # age must be in [0,600): a FUTURE mtime (clock skew, a restored/copied file) would otherwise
  # satisfy "< 600" forever and recreate exactly the always-on false alarm this pass removed.
  [ "$RLAGE" -ge 0 ] && [ "$RLAGE" -lt 600 ] \
    && log "ORPHAN-RUN $LS: live pass-log but no lock (mr-spawn died between launch and lock?) — verify by hand"
done
# lp-01 RATE-LIMIT TELEMETRY, site (a) — LIVE-STANDDOWN sampler. It sits HERE, above the gate-1
# standdown exit on the next line, on purpose: during a long slice most ticks stand down before they
# ever spawn, so a tick-log-only reader samples nothing at exactly the times budget is burning. Each
# live slice's own pass log is the only place its rate_limit_event rows appear. Non-fatal by
# construction: mr-cost-watch telemetry always exits 0 and prints one line, so nothing here can
# fail the tick. The gate-0 flock serializes the TICK's two sample sites against each other, but it
# says nothing about the telemetry FILE — the tool is also runnable by hand and by any future
# caller, so the file's single-writer property is enforced by mr-cost-watch's own exclusive flock on
# OUTFILE, not by this lock.
NLIVE=$(echo "$LIVE_BARE" | wc -w)
for LS in $LIVE_BARE; do
  TEL=$("$MEM/mr-cost-watch" telemetry "/tmp/mr_pass_$LS.log" live-standdown "$NLIVE" 2>/dev/null)
  # SILENT IN THE STEADY STATE. This site fires once per live slice on EVERY tick, and the
  # supervisor reads `tail -5` of this log first (mr-supervisor-prompt-native.md:66). This exact
  # file already paid for that lesson once — see :252-256, where 3 of those 5 lines were watcher
  # spam. Only `OK rows=0 ...` is suppressed: anything else (new rows, any ERR, or no output at
  # all) is by definition news and is always logged.
  case "$TEL" in
    "OK rows=0 "*) : ;;
    *) log "RATE-LIMIT-TELEMETRY slice=$LS ${TEL:-no-output}" ;;
  esac
done
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
  -not -path "$HARNESS/projects/monster-scraper/*" \
  -not -path "$HARNESS/memory/*" -mmin -6 2>/dev/null | head -1)
# (worktrees are AGENT-owned by design — sibling fan-out writes are not human activity; retro 2026-07-24)
# DELIBERATE DIVERGENCE from mr-spawn:35, which additionally excludes '*/.codegraph/*' (added
# 2026-07-31, commit 8082e5c). Reviewed 2026-08-01 (ADR-0011) and kept: this is the LAST gate
# before an unattended $60-400 run starts, and codegraph daemon writes are the only remaining
# accidental backstop for human edits made INSIDE a worktree (excluded above). The measured cost
# of the false trips is $0 — a standdown exits before any spawn, pending events requeue, and the
# worst observed case was 15 min of merge latency. Do not "unify" these two lists by widening
# this one; if they are ever unified, unify toward the stricter list.
if [ -n "$IDE" ]; then log "STANDDOWN human-ide-session"; exit 0; fi
if [ -n "$WRITES" ]; then
  log "STANDDOWN recent-writes: $WRITES"
  # retry marker is keyed on EVENT identity, not on $SRC: two slices finishing inside the same
  # 7-minute window both carry SRC=done, so the old per-source key silently dropped the second
  # one's retry. Sanitized with `tr -dc` because EVKEY is interpolated into the double-quoted
  # `bash -c` string below and both inputs are caller-supplied ($EVFILE is $1 / mr-launch.sh:24
  # whose slice component is LLM-authored; $SRC is the MR_EVENT_SRC env var) — this is
  # injection hardening, not just filename hygiene.
  EVKEY=$(basename -- "${EVFILE:-$SRC}" 2>/dev/null | tr -dc 'A-Za-z0-9._-'); EVKEY=${EVKEY:-evt}
  if [ "$SRC" != "cron" ] && [ "$SRC" != "manual" ] && [ ! -f "/tmp/mr_evretry_$EVKEY" ]; then
    touch "/tmp/mr_evretry_$EVKEY"
    setsid /bin/bash -c "exec 9>&- 2>/dev/null; sleep 420; rm -f /tmp/mr_evretry_$EVKEY; MR_EVENT_SRC=${SRC} exec /bin/bash '$MEM/mr-native-tick.sh'" </dev/null >/dev/null 2>&1 &
    log "RETRY scheduled in 7min (src=$SRC key=$EVKEY)"
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
cd "$HARNESS" || { log "ERROR cd-harness-failed"; exit 1; }
# lp-09: `env -u MR_FORCE` is the real leak this slice closes. Only the OPERATOR sets MR_FORCE, and
# every child spawner unsets it — but the paid session launched HERE inherited it, and a session that
# can re-enter this script with MR_FORCE=1 can override the operator's hold. The tick needs the
# variable for its own gates above; the session does not — it is TOLD `forced=` as prompt text in the
# TICK PROVENANCE block. Asserted by mr-selfcheck's A3 so it cannot silently regress.
env -u MR_FORCE timeout 5400 claude --model "$SUP_MODEL" --effort "$SUP_EFFORT" --dangerously-skip-permissions \
  --output-format stream-json --verbose \
  -p "$(cat "$PROMPTF")" >> "$TLOG" 2>&1
RC=$?
# cost via the mr-cost-sum SSOT (third and last copy of the old naive sum — see mr-cost-sum's
# header). A tick is a single `claude -p` invocation so this site was never miscounted in
# practice; it calls the helper so the buggy loop exists nowhere in the tree.
COST=$("$MEM/mr-cost-sum" "$TLOG" 2>/dev/null)
[ -z "$COST" ] && log "COST-HELPER-FAILED mr-cost-sum produced no output for tick $RID — SUPERVISOR row will record COST-UNKNOWN"
COST=${COST:--}
TICKMODEL=$(grep -m1 -o '"model":"claude-[a-z0-9.-]*"' "$TLOG" 2>/dev/null | sed 's/.*:"//;s/"$//')
TICKMODEL=${TICKMODEL:--}
[ "$COST" = "-" ] && COST=""
[ "$TICKMODEL" = "-" ] && TICKMODEL="$SUP_MODEL"
log "SPAWN-DONE rc=$RC cost=${COST:-unknown} model=$TICKMODEL rid=$RID"
CEN=$(grep -o '"subagent_type":"[a-z-]*"' "$TLOG" 2>/dev/null | sort | uniq -c | awk '{printf "%s=%s ",$2,$1}' | tr -d '"' | sed 's/subagent_type=//g; s/subagent_type://g')
# NOTE: `grep -c` prints 0 AND exits 1 on no match, so the old `|| echo 0` appended a SECOND
# line and CEN2 became the two-line string "0\n0" — log() echoes it unquoted-expanded, which put
# 39 orphan bare-`0` lines into mr-native-tick.log and broke every ^2026--anchored log parse.
CEN2=$(grep -c '"name":"Skill"' "$TLOG" 2>/dev/null); CEN2=${CEN2:-0}
# monitor= counts session-scoped Monitor waits. REVIEW-ONLY — nothing gates on it. A tick that
# delegates a cross-tick wait to Monitor loses it when the session exits ~2min later (observed
# 2026-08-01T08:00Z: CI-rerun watch never fired, mr-state.json left asserting a stale RED).
CEN3=$(grep -c '"name":"Monitor"' "$TLOG" 2>/dev/null); CEN3=${CEN3:-0}
[ -n "$CEN$CEN2$CEN3" ] && log "CENSUS rid=$RID agents: ${CEN:-none} skills=$CEN2 monitor=$CEN3"

# lp-01 RATE-LIMIT TELEMETRY, site (b) — POST-SPAWN sampler. Deliberately OUTSIDE the `if [ "$RC" ...
# branch below so it samples on success AND on failure: a rate-limited tick is precisely the one
# whose rate_limit_event rows matter most, and that tick fails. It reads $TLOG only; it must not
# touch the arming path further down (the ARMED/PYRL block owns mr-state.json and its trip
# conditions are unchanged by this slice). RC is captured above and consumed below — nothing here
# may disturb it, so the call's rc is swallowed into a command substitution and never tested.
# slices_running_at_sample on these rows is the GATE-1 count (:290), taken before the spawn, so on
# a long tick it can be up to `timeout 5400` = 90 minutes older than the row's `ts`. Read it as
# "slices live when this tick started", which is also the more useful number: the spawn spanned that
# whole window. Recomputing here is NOT one line — it means a second copy of gate 1's liveness
# predicate (a python read of each lock's session_leader plus a kill -0), and a duplicated predicate
# that can drift from the original is a worse defect than a documented-stale column.
# Unconditional, unlike site (a): this fires only on ticks that actually spawned.
TEL=$("$MEM/mr-cost-watch" telemetry "$TLOG" tick-post-spawn "${NLIVE:-0}" 2>/dev/null)
log "RATE-LIMIT-TELEMETRY rid=$RID ${TEL:-no-output}"

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
  # RATE-LIMIT GATE ARMING. Gate 2 is the loop's only SELF-CLEARING standdown, but until
  # 2026-08-01 nothing in the tree ever wrote rate_limit_resets_at — it was read-only at
  # :197 and mr-situation:130 — so every rate-limit lockout fell through to the human-only
  # .native-supervisor-disabled kill switch. That is what made the 2026-07-27 incident a 74h
  # hand-cleared outage instead of a self-clearing standdown.
  # ALLOWLIST on status=="rejected" ONLY. A denylist would be wrong: "allowed_warning" events
  # also carry a resetsAt (seven_day, ~6 days out) and appear in EVERY tick log since
  # 2026-07-31 — arming on one would stand the loop down for days over a routine utilization
  # warning, i.e. reproduce the outage this fix exists to prevent.
  ARMED=$(/usr/bin/python3 - "$TLOG" "$MEM/mr-state.json" <<'PYRL'
import json, sys, time, os, datetime
tlog, state = sys.argv[1], sys.argv[2]
best = None
def walk(o):
    global best
    if isinstance(o, dict):
        if str(o.get("status")) == "rejected" and o.get("resetsAt") is not None:
            # EARLIEST rejection wins, not the last one. A log can carry both a five_hour and a
            # seven_day rejection; last-wins could arm a 6-day standdown when a 2-hour one was
            # correct. The asymmetry is stark: guessing low costs one ~$1 tick that re-stands-down,
            # guessing high costs days of unattended-loop downtime — the exact failure this arming
            # exists to prevent. (Mirrors the SSOT prompt's "prefer five_hour".)
            try:
                v = int(o["resetsAt"])
                best = v if best is None else min(best, v)
            except (TypeError, ValueError): pass
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
try:
    for l in open(tlog, errors="replace"):
        if '"resetsAt"' not in l or '"rejected"' not in l: continue
        try: walk(json.loads(l))
        except Exception: pass
except Exception: pass
if best is None:
    print("NONE"); raise SystemExit(0)
if best > 1e11: best = best / 1000.0            # defensive: epoch ms -> s
now = time.time()
if best <= now:
    print("SKIPPED past(%d)" % best); raise SystemExit(0)
if best > now + 14 * 86400:                      # a bad write here is a silent multi-day outage
    print("SKIPPED implausible(%d)" % best); raise SystemExit(0)
try:
    with open(state) as f: d = json.load(f)      # re-read immediately before write: the Cowork/DC
    if not isinstance(d, dict):                  # fallback writes mr-state.json without our flock
        print("SKIPPED state-not-object"); raise SystemExit(0)
except SystemExit: raise
except Exception:
    print("SKIPPED state-unreadable"); raise SystemExit(0)
iso = datetime.datetime.fromtimestamp(best, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
d["rate_limit_resets_at"] = iso                  # gate 2 parses epoch-or-ISO (:198-203)
d["rate_limit_armed_by"] = "wrapper"             # breadcrumb: wrapper-armed vs LLM-armed
tmp = state + ".tmp.%d" % os.getpid()
try:
    with open(tmp, "w") as f: json.dump(d, f, indent=2)   # indent=2 matches the committed file
    os.replace(tmp, state)
except Exception as e:
    try: os.unlink(tmp)
    except Exception: pass
    print("SKIPPED write-failed(%s)" % type(e).__name__); raise SystemExit(0)
print("ARMED %s" % iso)
PYRL
)
  case "$ARMED" in
    ARMED*)   log "RATE-LIMIT-GATE $ARMED — gate 2 will stand down (free) until then" ;;
    SKIPPED*) log "RATE-LIMIT-GATE-SKIPPED $ARMED" ;;
  esac
  if [ "${MR_NO_TOAST:-0}" != "1" ] && echo "$REASON" | grep -qiE "not logged in|/login"; then
    powershell.exe -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('Claude CLI in WSL is logged out - Monster Realm supervisor is paused. Run: claude /login', 0, 'MR Supervisor', 48)" >/dev/null 2>&1 &
  fi
fi
rm -f "$PROMPTF"
exit 0
