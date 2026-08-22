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

# --- EXTRACT: banner comment through the last (A5) assertion, by CONTENT not line number, so the
# extraction survives unrelated edits to mr-selfcheck. ---
BLOCK="$WORK/block.sh"
sed -n '/^# lp-brief-cost:/,/^grep -qF .distinct defect classes over redundant re-runs./p' "$SELFCHECK" > "$BLOCK"
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
for needle in 'BUDGET: $<CAP_USD>' 'Budget is ample' 'favor thoroughness over frugality' '125%' 'distinct defect classes over redundant re-runs'; do
  grep -qF -- "$needle" "$BLOCK" || { echo "TEETH-FAIL extraction: assertion for '$needle' is absent from the extracted block -- an assertion was deleted or reworded"; exit 1; }
done

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

[ "$BAD" = 0 ] && echo "TEETH-ALL-OK"
exit $BAD
