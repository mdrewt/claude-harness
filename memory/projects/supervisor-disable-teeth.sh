#!/bin/bash
# supervisor-disable-teeth.sh — proof-of-teeth harness for memory/projects/mr-supervisor-disable
# (the operator's provenance-recording kill-switch wrapper, lp-11a, adopted 2026-08-22).
#
# Usage: supervisor-disable-teeth.sh [path-to-real-mr-supervisor-disable]
#   default: the wrapper sitting next to this script, so a worktree copy proves the WORKTREE's
#   wrapper and never the live one.
#
# COPIES THE REAL WRAPPER into a fixture dir rather than reconstructing its logic, so this harness
# cannot drift from what ships (same rule as lp-brief-cost-teeth.sh). The wrapper is self-locating
# via `readlink -f "$0"`, so dropping it into a sandbox next to a STUB `mr-hold` isolates it
# completely: no env override exists, and none should — mr-hold rejected `MR_SELFCHECK_MEM` for the
# same reason (an override is a surface for greening production vacuously).
#
# NEVER runs against the real $MEM. Every case works inside a mktemp -d.
#
# NOT named mr-* on purpose: mr-selfcheck globs `mr-*` executables and would otherwise
# shebang-classify and syntax-check this fixture as a corpus tool (mr-selfcheck:697-710).
set -u
BAD=0
HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
WRAPPER="${1:-$HERE/mr-supervisor-disable}"
[ -f "$WRAPPER" ] || { echo "TEETH-FAIL wrapper not found: $WRAPPER"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

DEFAULT_REASON="operator paused the pipeline manually; ticks stay held until the operator runs mr-supervisor-enable"

ok(){ if [ "$2" = 1 ]; then echo "  ok   $1"; else echo "TEETH-FAIL $1"; BAD=1; fi; }

# Fresh sandbox holding a copy of the REAL wrapper. $2 (optional) = stub mr-hold body.
mkcase(){
  D="$WORK/$1"; mkdir -p "$D"
  cp "$WRAPPER" "$D/mr-supervisor-disable"; chmod 755 "$D/mr-supervisor-disable"
  if [ "${2:-__none__}" != "__none__" ]; then
    { echo '#!/bin/bash'; echo "$2"; } > "$D/mr-hold"; chmod 755 "$D/mr-hold"
  fi
  FLAG="$D/.native-supervisor-disabled"
}
# A stub that mimics mr-hold's real cmd_set contract (atomic write of by=/at=/reason=/pid=).
GOOD='R=""; while [ $# -gt 0 ]; do [ "$1" = "--reason" ] && R="$2"; shift; done
B="$(dirname "$0")"; F="$B/.native-supervisor-disabled"
printf "by=operator\nat=2026-01-01T00:00:00Z\nreason=%s\npid=%d\n" "$R" $$ > "$F"
echo "HOLD-SET by=operator"'

# T1 — happy path: provenance recorded, default reason is the generic manual-pause text.
mkcase t1 "$GOOD"; OUT="$("$D/mr-supervisor-disable" 2>&1)"; RC=$?
ok "T1 exit 0"                        "$([ $RC -eq 0 ] && echo 1 || echo 0)"
ok "T1 flag created"                  "$([ -f "$FLAG" ] && echo 1 || echo 0)"
ok "T1 records by=operator"           "$(grep -qx 'by=operator' "$FLAG" && echo 1 || echo 0)"
ok "T1 default reason is the generic manual-pause text" \
                                      "$(grep -qxF "reason=$DEFAULT_REASON" "$FLAG" && echo 1 || echo 0)"
ok "T1 prints DISABLED"               "$(printf '%s' "$OUT" | grep -q DISABLED && echo 1 || echo 0)"
ok "T1 prints no FALLBACK notice"     "$(printf '%s' "$OUT" | grep -q FALLBACK && echo 0 || echo 1)"

# T2 — a free-text reason reaches mr-hold verbatim.
mkcase t2 "$GOOD"; "$D/mr-supervisor-disable" holding while I refactor the hooks >/dev/null 2>&1
ok "T2 custom reason passed through"  "$(grep -qxF 'reason=holding while I refactor the hooks' "$FLAG" && echo 1 || echo 0)"

# T3 — FAIL-SAFE, NOT FAIL-OPEN (defect 1). No mr-hold at all: the loop must still be paused.
mkcase t3; OUT="$("$D/mr-supervisor-disable" 2>&1)"; RC=$?
ok "T3 exit 0 with mr-hold absent"    "$([ $RC -eq 0 ] && echo 1 || echo 0)"
ok "T3 flag STILL created"            "$([ -f "$FLAG" ] && echo 1 || echo 0)"
ok "T3 announces the FALLBACK"        "$(printf '%s' "$OUT" | grep -q FALLBACK && echo 1 || echo 0)"

# T4 — mr-hold present but failing.
mkcase t4 'echo "HOLD-REFUSED boom" >&2; exit 1'; "$D/mr-supervisor-disable" >/dev/null 2>&1
ok "T4 flag created when mr-hold fails" "$([ -f "$FLAG" ] && echo 1 || echo 0)"

# T5 — mr-hold hangs. The real file bounds this at `timeout 30`; the fixture rewrites ONLY that
# literal to keep the gate fast. Every other case runs the byte-identical wrapper.
mkcase t5 'sleep 60'
sed -i 's/timeout 30/timeout 2/' "$D/mr-supervisor-disable"
grep -q 'timeout 2 ' "$D/mr-supervisor-disable" || { echo "TEETH-FAIL T5 anchor drift: 'timeout 30' no longer present in the wrapper"; BAD=1; }
S=$(date +%s); "$D/mr-supervisor-disable" >/dev/null 2>&1; E=$(( $(date +%s) - S ))
ok "T5 bounded by timeout (${E}s)"    "$([ "$E" -lt 10 ] && echo 1 || echo 0)"
ok "T5 flag created after a hang"     "$([ -f "$FLAG" ] && echo 1 || echo 0)"

# T6 — a LYING helper: exits 0, writes nothing. The banner must not claim success.
mkcase t6 'echo "HOLD-SET by=operator"; exit 0'; OUT="$("$D/mr-supervisor-disable" 2>&1)"; RC=$?
ok "T6 exit 1"                        "$([ $RC -eq 1 ] && echo 1 || echo 0)"
ok "T6 says FAILED"                   "$(printf '%s' "$OUT" | grep -q FAILED && echo 1 || echo 0)"
ok "T6 does NOT print DISABLED"       "$(printf '%s' "$OUT" | grep -q DISABLED && echo 0 || echo 1)"

# T7 — argument smuggling. A reason that looks like a flag must not change provenance.
mkcase t7 'P=""; while [ $# -gt 0 ]; do [ "$1" = "--by" ] && P="$2"; shift; done
B="$(dirname "$0")"; F="$B/.native-supervisor-disabled"
printf "by=%s\n" "$P" > "$F"'
"$D/mr-supervisor-disable" --by supervisor >/dev/null 2>&1
ok "T7 a '--by supervisor' reason cannot forge supervisor provenance" \
                                      "$(grep -qx 'by=operator' "$FLAG" && echo 1 || echo 0)"

# T8 — the fallback must not DOWNGRADE a hold mr-hold already wrote (touch does not truncate).
mkcase t8 'B="$(dirname "$0")"; F="$B/.native-supervisor-disabled"
printf "by=operator\nreason=written before the late failure\n" > "$F"; exit 1'
OUT="$("$D/mr-supervisor-disable" 2>&1)"
ok "T8 late mr-hold failure does not erase written provenance" \
                                      "$(grep -qx 'by=operator' "$FLAG" && echo 1 || echo 0)"
# T8b -- and the message must not LIE about it. Reporting "unattributed, will escalate" when
# provenance is on disk sends the operator hunting an escalation that will never fire.
ok "T8b message does not falsely claim the hold is unattributed" \
                                      "$(printf '%s' "$OUT" | grep -q 'is unattributed' && echo 0 || echo 1)"
ok "T8b message reports provenance IS on disk" \
                                      "$(printf '%s' "$OUT" | grep -q 'provenance IS on disk' && echo 1 || echo 0)"

# T9 — REGRESSION for defect 2: invoked through a SYMLINK from another directory, the wrapper must
# still resolve MEM to its real home. Before `readlink -f` this created nothing at all (fail-open).
mkcase t9 "$GOOD"; mkdir -p "$WORK/t9bin"; ln -sf "$D/mr-supervisor-disable" "$WORK/t9bin/mr-supervisor-disable"
"$WORK/t9bin/mr-supervisor-disable" >/dev/null 2>&1
ok "T9 symlink invocation still writes the flag to the REAL dir" \
                                      "$([ -f "$FLAG" ] && echo 1 || echo 0)"
ok "T9 symlink invocation does NOT write beside the symlink" \
                                      "$([ -f "$WORK/t9bin/.native-supervisor-disabled" ] && echo 0 || echo 1)"

# T10 — shell metacharacters in a reason are data, never code.
mkcase t10 "$GOOD"; "$D/mr-supervisor-disable" 'paused $(id -u) `hostname`' >/dev/null 2>&1
ok "T10 metacharacters stored literally" \
                                      "$(grep -qF 'reason=paused $(id -u) `hostname`' "$FLAG" && echo 1 || echo 0)"

[ "$BAD" = 0 ] && echo "TEETH-ALL-OK"
exit $BAD
