#!/bin/bash
# lp-brief-cost-teeth.sh — proof-of-teeth harness for the mr-selfcheck A1-A5 block (lp-brief-cost).
#
# Layer 1 only (logic, isolated) — see monster-realm-lp-brief-cost-plan.md "Proof of teeth".
# EXTRACTS the shipped A1-A5 block out of the REAL mr-selfcheck with sed (never hand-copied, so this
# demo cannot drift from what ships), runs it against a fixture MEM whose mr-brief-template.md is the
# REAL project template (never a synthetic reconstruction), then applies the M1-M5b mutation matrix
# to disposable copies of that fixture.
#
# Usage: lp-brief-cost-teeth.sh [path-to-real-mr-selfcheck]
#   default: the mr-selfcheck sitting next to this script (self-locating, like mr-selfcheck itself,
#   so a worktree copy proves the worktree's block and never the live corpus's).
#
# M0-design note: this harness deliberately does NOT reconstruct a synthetic "fixed" template by
# re-applying the two line replacements itself — that would let the harness pass against a fix that
# does not match what was actually shipped. It reads the REAL template as-is for M0. Consequence: run
# BEFORE the fix lands, M0 correctly FAILS (that IS the RED state); run after, all seven cases pass.
#
# SCOPE LIMIT, state it plainly: M0-M5b prove the block's LOGIC in isolation. They do NOT prove that
# a FAIL still reaches mr-selfcheck's exit path -- that is the STRAY wiring guard below, plus the
# one-time manual Layer 2 (inject `Budget is ample` into the real template, run the real
# mr-selfcheck, confirm the FAIL prints and SELFCHECK-OK does not, then `git checkout --`).
#
# NOT named mr-* on purpose: mr-selfcheck's tool enumeration globs `mr-*` executables and would
# otherwise shebang-classify and syntax-check this fixture as a corpus tool (mr-selfcheck:20-22).
set -u
BAD=0

HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SELFCHECK="${1:-$HERE/mr-selfcheck}"
[ -f "$SELFCHECK" ] || { echo "TEETH-FAIL setup: real mr-selfcheck not found at $SELFCHECK"; exit 1; }
TEMPLATE="$(dirname -- "$SELFCHECK")/mr-brief-template.md"
[ -f "$TEMPLATE" ] || { echo "TEETH-FAIL setup: real mr-brief-template.md not found at $TEMPLATE"; exit 1; }

WORK="$(mktemp -d)"
cleanup(){ [ -n "${WORK:-}" ] && [ -d "$WORK" ] && find "$WORK" -mindepth 0 -delete; }
trap cleanup EXIT

# --- EXTRACT: banner comment through A5, by CONTENT not line number, so the extraction survives
# unrelated edits to mr-selfcheck. The range MUST stop at A5 and must NOT reach the line that
# invokes THIS script: run_case sources the extracted block, so including it would re-enter the
# harness with MEM pointed at a fixture dir and break M0. ---
BLOCK="$WORK/block.sh"
sed -n '/^# lp-brief-cost:/,/^grep -F .Definition of done/p' "$SELFCHECK" > "$BLOCK"
LINES=$(wc -l < "$BLOCK")
if [ "$LINES" -eq 0 ]; then
  echo "TEETH-FAIL extraction: sed matched ZERO lines of the lp-brief-cost block in $SELFCHECK -- the banner anchor has drifted or the block was removed"
  exit 1
fi
# Runaway guard: an unmatched terminator makes sed print to EOF, which would source the REST of
# mr-selfcheck (heredocs and all) instead of the block. Bound it, and require all five assertions.
if [ "$LINES" -gt 40 ]; then
  echo "TEETH-FAIL extraction: matched $LINES lines (>40) -- the terminator did not match, sed ran to EOF"
  exit 1
fi
# WIRING guard. The matrix below tests the extracted block in ISOLATION with its own fresh BAD=0,
# so it is blind to anything in mr-selfcheck that RESETS BAD after the block -- a stray `BAD=0`
# (plausibly from sibling slice lp-06, which also edits this file) would silence every FAIL above it
# while mr-selfcheck still printed SELFCHECK-OK. mr-selfcheck's tail is `[ "$BAD" = 0 ] && echo
# SELFCHECK-OK; exit 0`, so there must be exactly ONE BAD=0 -- the initialiser at :12.
STRAY=$(grep -cE '^[[:space:]]*BAD=0' "$SELFCHECK")
if [ "$STRAY" != "1" ]; then
  echo "TEETH-FAIL wiring: expected exactly 1 'BAD=0' initialiser in $SELFCHECK, found $STRAY -- a later reset would silence every SELFCHECK-FAIL above it while SELFCHECK-OK still printed"
  exit 1
fi

run_case() {
  # $1 = case id, $2 = template source path (possibly nonexistent), $3 = expected BAD
  id="$1"; tmpl="$2"; expect="$3"
  FIXDIR="$WORK/fix-$id"
  mkdir -p "$FIXDIR"
  [ -f "$tmpl" ] && cp "$tmpl" "$FIXDIR/mr-brief-template.md"
  # The block echoes SELFCHECK-FAIL lines to stdout; silence them so $BAD is the ONLY thing captured.
  got=$(MEM="$FIXDIR" BAD=0 bash -c 'source "$1" >/dev/null 2>&1; echo "$BAD"' _ "$BLOCK")
  if [ "$got" = "$expect" ]; then
    echo "TEETH-OK $id"
  else
    echo "TEETH-FAIL $id expected=$expect got=$got"
    BAD=1
  fi
}

M0="$WORK/m0.md"; cp "$TEMPLATE" "$M0"
run_case M0 "$M0" 0

M1="$WORK/m1.md"; cp "$TEMPLATE" "$M1"; printf '\nBudget is ample\n' >> "$M1"
run_case M1 "$M1" 1

M2="$WORK/m2.md"; cp "$TEMPLATE" "$M2"; printf '\nfavor thoroughness over frugality\n' >> "$M2"
run_case M2 "$M2" 1

M3="$WORK/m3.md"; cp "$TEMPLATE" "$M3"; printf '\nonly the 125%% hard ceiling is mechanical\n' >> "$M3"
run_case M3 "$M3" 1

M4="$WORK/m4.md"
sed 's/distinct defect classes over redundant re-runs/[E2 CLAUSE REMOVED]/' "$TEMPLATE" > "$M4"
run_case M4 "$M4" 1

# M5: the template is absent entirely -- pass a path that never existed.
run_case M5 "$WORK/does-not-exist.md" 1

M5b="$WORK/m5b.md"
sed 's/BUDGET: \$<CAP_USD>/BUDGET anchor removed/' "$TEMPLATE" > "$M5b"
run_case M5b "$M5b" 1

# M6 -- the case a bare file-wide A5 grep went GREEN on (red-team, HIGH). The Definition-of-done
# sentence is gutted back to unrestricted-spend language while a FOSSIL copy of the required phrase
# survives elsewhere in the file. Anchoring A5 to the DoD line is what makes this bite.
M6="$WORK/m6.md"
sed 's/\*\*Budget is bounded by the weekly plan allowance.*$/**Spend what you judge necessary.**/' "$TEMPLATE" > "$M6"
printf '\n<!-- archived draft: distinct defect classes over redundant re-runs -->\n' >> "$M6"
run_case M6 "$M6" 1

[ "$BAD" = 0 ] && echo "TEETH-ALL-OK"
exit $BAD
