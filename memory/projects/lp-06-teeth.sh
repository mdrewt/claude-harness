#!/bin/bash
# lp-06-teeth.sh — proof-of-teeth harness for slice lp-06 (mr-backup + the stray-handoff rule).
#
# WHAT THIS PROVES: the S/B/W matrices below are the tester's gating fixtures for lp-06's three
# touched files -- mr-backup (new), mr-selfcheck's new "lp-06" block, and mr-record's backup
# trigger. Every case is either (a) a behavioural probe against the REAL subject binaries, driven
# as real subprocesses (never re-implemented in this harness's own logic, which would let the
# harness pass against a stub that merely LOOKS right), or (b) a content-anchor EXTRACTION of a
# block out of the real subject file (never hand-copied, so the extraction cannot drift from what
# actually ships).
#
# ANTI-REWARD-HACKING RATIONALE (why this shape, not a simpler one):
#   - The stray-handoff predicate is extracted from the REAL mr-selfcheck by content anchor, run
#     against hermetic fixture git repos WE build, not against synthetic re-implementations of the
#     predicate. A stub that never fires, or one that always fires, is caught by the S1/S3 vacuity
#     pair (see the comment above the S cases).
#   - mr-backup is driven as a real external subprocess for every B case: a marker-printing stub
#     cannot fake a byte-for-byte restore, a 14-directory prune, or an illegal-root refusal.
#   - The W cases exist because logic-in-isolation is not enough (the lp-brief-cost lesson, see
#     that slice's own teeth script): W1 pins that no later `BAD=0` can silence every FAIL above
#     it; W2/W3 prove the mr-record trigger fires in the right direction and ONLY the right
#     direction; W4 proves a backup failure can never cost a ledger row or leave an orphan; W5
#     proves the stray-handoff FAIL actually reaches mr-selfcheck's real exit path, not just the
#     extracted block in isolation; W6 pins the lock-ordering statically; W7 is the safety net that
#     proves this whole battery never mutated the real corpus.
#   - B5(c) (restore refusing to clobber a live canonical source) is the one place a naive test
#     would need to point `--to` at the REAL corpus paths to get a true positive. This script never
#     does that -- see the comment above B5(c) for the copy+sed technique used instead, which is
#     the same "copy the real tool, sed-patch one hardcoded constant, assert the substitution count"
#     pattern already used for mr-record in W2, applied here to mr-backup's two canonical
#     constants so a buggy implementation can never actually reach a real file.
#
# Usage: lp-06-teeth.sh [MEM_DIR]
#   MEM_DIR defaults to the directory this script itself lives in (self-locating, like every other
#   mr-* tool in this corpus), so a worktree copy proves the worktree's code and never the live
#   corpus's. $1 overrides it so the orchestrator/verifier can point this at any copy.
#   Subjects resolved from MEM_DIR: mr-selfcheck, mr-record, mr-backup.
#
# NOT named mr-*: mr-selfcheck's tool enumeration globs `mr-*` executables and would shebang-
# classify this as a corpus tool (lp-brief-cost-teeth.sh states the same precedent).
#
# RED TODAY: mr-backup does not exist yet and mr-selfcheck carries no "# lp-06:" block, and
# mr-record's write path never mentions mr-backup -- every case below is designed to FAIL loudly
# and specifically against that state (never silently skip), which is the honest RED this script
# is required to start in.
set -u
BAD=0
ok()   { echo "TEETH-OK $1"; }
fail() { echo "TEETH-FAIL $1: $2"; BAD=1; }

HERE="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MEM_DIR="${1:-$HERE}"
SELFCHECK="$MEM_DIR/mr-selfcheck"
RECORD="$MEM_DIR/mr-record"
BACKUP="$MEM_DIR/mr-backup"

[ -f "$SELFCHECK" ] || { echo "TEETH-FAIL setup: mr-selfcheck not found at $SELFCHECK"; exit 1; }
[ -f "$RECORD" ]    || { echo "TEETH-FAIL setup: mr-record not found at $RECORD"; exit 1; }
if [ ! -f "$BACKUP" ]; then
  echo "TEETH-FAIL setup: mr-backup not found at $BACKUP -- expected pre-implementation; every B"
  echo "TEETH-FAIL setup: case below will also fail loudly for the same reason (honest RED)"
fi
command -v git >/dev/null 2>&1 || { echo "TEETH-FAIL setup: git not found on PATH"; exit 1; }
[ -x /usr/bin/python3 ] || { echo "TEETH-FAIL setup: /usr/bin/python3 not found"; exit 1; }

REAL_HOME="$HOME"

WORK="$(mktemp -d)"
GITHOME="$WORK/git-home"
mkdir -p "$GITHOME"

# W5 may create exactly one stray file in the REAL repo tree (see the W5 comment for why that is
# the sanctioned, explicitly-scoped exception to "never touch production state"). Tracked here so
# the exit trap can remove it under every exit path, including a mid-script abort.
W5_STRAY_CREATED=0
W5_STRAY_PATH=""

final_cleanup() {
  if [ "$W5_STRAY_CREATED" = "1" ] && [ -n "$W5_STRAY_PATH" ]; then
    rm -f -- "$W5_STRAY_PATH"
  fi
  [ -n "${WORK:-}" ] && [ -d "$WORK" ] && rm -rf -- "$WORK"
}
trap final_cleanup EXIT

# Hermetic git: the operator's real ~/.gitconfig, /etc/gitconfig, and any ambient
# GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE must never decide these results -- S6/S8 specifically
# depend on git's ignore behaviour being determined ONLY by the fixture repo's own .gitignore.
git_h() {
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE \
      GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null HOME="$GITHOME" \
      git "$@"
}

hash_file() {
  if [ -f "$1" ]; then
    if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
    else shasum -a 256 "$1" | awk '{print $1}'
    fi
  else
    echo "ABSENT"
  fi
}

# =====================================================================================
# W7 setup (capture BEFORE). The compare-after runs as the very last case in the file.
# This script must never touch production state -- this is the mechanical proof of that.
# =====================================================================================
REAL_LEDGER="$MEM_DIR/monster-realm-usage-ledger.jsonl"
REAL_HANDOFF="$MEM_DIR/monster-realm-handoff.md"
DEFAULT_BACKUP_ROOT="${XDG_STATE_HOME:-$REAL_HOME/.local/state}/mr-backup"
W7_LEDGER_BEFORE=$(hash_file "$REAL_LEDGER")
W7_HANDOFF_BEFORE=$(hash_file "$REAL_HANDOFF")
if [ -d "$DEFAULT_BACKUP_ROOT" ]; then
  W7_ROOT_BEFORE=$(find "$DEFAULT_BACKUP_ROOT" -printf '%p %s %T@\n' 2>/dev/null | sort)
else
  W7_ROOT_BEFORE="ABSENT"
fi

# =====================================================================================
# --- S cases: the stray-handoff predicate, extracted by content anchor from the REAL
# mr-selfcheck (never hand-copied) and run against hermetic fixture git repos.
#
# EXTRACTION: the banner comment `# lp-06: mr-backup + the stray-handoff rule` through the
# closing heredoc tag `PYLP06` bounds the whole block; the python body is the text strictly
# between the `<<'PYLP06'` opener line and the bare `PYLP06` terminator line. Guarded against
# both a zero-line match (anchor drifted / block absent -- the honest pre-implementation RED)
# and a runaway match (terminator never matched, sed ran to EOF).
# =====================================================================================
RAW="$WORK/lp06-raw.txt"
sed -n '/^# lp-06: mr-backup + the stray-handoff rule/,/^PYLP06$/p' "$SELFCHECK" > "$RAW"
RAW_LINES=$(wc -l < "$RAW")
EXTRACTION_OK=1
if [ "$RAW_LINES" -eq 0 ]; then
  echo "TEETH-FAIL extraction: sed matched ZERO lines of the lp-06 block in $SELFCHECK -- the banner"
  echo "TEETH-FAIL extraction: anchor '# lp-06: mr-backup + the stray-handoff rule' or the 'PYLP06'"
  echo "TEETH-FAIL extraction: terminator is missing (expected pre-implementation)"
  BAD=1; EXTRACTION_OK=0
elif [ "$RAW_LINES" -gt 400 ]; then
  echo "TEETH-FAIL extraction: matched $RAW_LINES lines (>400) -- the PYLP06 terminator did not"
  echo "TEETH-FAIL extraction: match and sed ran to EOF"
  BAD=1; EXTRACTION_OK=0
fi

PYBLOCK="$WORK/lp06.py"
if [ "$EXTRACTION_OK" = 1 ]; then
  mapfile -t PYTAGLINES < <(grep -n 'PYLP06' "$RAW" | cut -d: -f1)
  if [ "${#PYTAGLINES[@]}" -ne 2 ]; then
    echo "TEETH-FAIL extraction: expected exactly 2 occurrences of the literal token PYLP06 (the"
    echo "TEETH-FAIL extraction: heredoc opener and its terminator) inside the extracted range, found"
    echo "TEETH-FAIL extraction: ${#PYTAGLINES[@]} -- extraction has drifted"
    BAD=1; EXTRACTION_OK=0
  else
    OPEN_LN=${PYTAGLINES[0]}
    CLOSE_LN=${PYTAGLINES[1]}
    sed -n "$((OPEN_LN+1)),$((CLOSE_LN-1))p" "$RAW" > "$PYBLOCK"
    PY_LINES=$(wc -l < "$PYBLOCK")
    if [ "$PY_LINES" -eq 0 ]; then
      echo "TEETH-FAIL extraction: the python body between the PYLP06 opener and terminator is empty"
      BAD=1; EXTRACTION_OK=0
    fi
  fi
fi

run_pylp06() {
  # $1 = fixture MEM directory (repo-root-relative memory/projects)
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE \
      GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null HOME="$GITHOME" \
      timeout 60 /usr/bin/python3 "$PYBLOCK" "$1" 2>&1
}

mk_repo() {
  # $1 = target dir (must not already exist). Seeds a single committed placeholder so every
  # fixture repo has a real HEAD, then leaves memory/projects/ ready for the case to populate.
  local d="$1"
  mkdir -p "$d/memory/projects"
  git_h -C "$d" init -q
  git_h -C "$d" config user.email "lp06-tester@example.invalid"
  git_h -C "$d" config user.name "lp06 tester"
  printf 'seed\n' > "$d/memory/projects/.seed"
  git_h -C "$d" add -A
  git_h -C "$d" commit -q -m "seed"
}

LAST_S_OUT=""
check_s_case() {
  # $1=id $2=fixture MEM dir $3=present|absent (expected stray-handoff FAIL)
  local id="$1" mem="$2" expect="$3" hit
  LAST_S_OUT=$(run_pylp06 "$mem")
  hit=$(printf '%s\n' "$LAST_S_OUT" | grep -c 'SELFCHECK-FAIL stray-handoff')
  if [ "$expect" = present ]; then
    if [ "$hit" -ge 1 ]; then ok "$id"
    else fail "$id" "expected a SELFCHECK-FAIL stray-handoff line, got none. output: $(printf '%s' "$LAST_S_OUT" | tr '\n' '|' | cut -c1-400)"
    fi
  else
    if [ "$hit" -eq 0 ]; then ok "$id"
    else fail "$id" "expected NO stray-handoff FAIL, got: $(printf '%s\n' "$LAST_S_OUT" | grep 'stray-handoff' | tr '\n' '|' | cut -c1-400)"
    fi
  fi
}

if [ "$EXTRACTION_OK" != 1 ]; then
  for id in S0 S1 S2 S3 S4 S6 S7 S8; do
    echo "TEETH-FAIL $id: skipped -- PYLP06 extraction failed (see the TEETH-FAIL extraction lines above)"
    BAD=1
  done
else
  # S0: the day-one baseline. TRACKED rolling handoff + both TRACKED archives + a TRACKED
  # wrong-path file (memory/monster-realm-handoff.md, tracked) must NOT false-positive. Folding
  # in the tracked-wrong-path case here (rather than a separate S5) is deliberate: it is what
  # proves the predicate's `untracked` clause is doing real work, not just the path clause.
  S0="$WORK/s0"; mk_repo "$S0"
  printf 'rolling handoff\n' > "$S0/memory/projects/monster-realm-handoff.md"
  printf 'archive 07\n' > "$S0/memory/projects/monster-realm-handoff-archive-2026-07.md"
  printf 'archive 08\n' > "$S0/memory/projects/monster-realm-handoff-archive-2026-08.md"
  printf 'wrong path but tracked\n' > "$S0/memory/monster-realm-handoff.md"
  git_h -C "$S0" add -A
  git_h -C "$S0" commit -q -m "s0: tracked handoff + archives + tracked wrong-path file"
  check_s_case S0 "$S0/memory/projects" absent

  # S1: UNTRACKED memory/monster-realm-handoff.md -- must FAIL, message names the exact path.
  S1="$WORK/s1"; mk_repo "$S1"
  printf 'stray untracked\n' > "$S1/memory/monster-realm-handoff.md"
  check_s_case S1 "$S1/memory/projects" present
  printf '%s\n' "$LAST_S_OUT" | grep 'SELFCHECK-FAIL stray-handoff' | grep -q 'memory/monster-realm-handoff.md' \
    || fail S1-path "the stray-handoff FAIL line did not name memory/monster-realm-handoff.md: $(printf '%s\n' "$LAST_S_OUT" | grep 'stray-handoff')"

  # S2: UNTRACKED notes/deep/2026-08-handoff.md -- must FAIL, naming that path.
  S2="$WORK/s2"; mk_repo "$S2"
  mkdir -p "$S2/notes/deep"
  printf 'x\n' > "$S2/notes/deep/2026-08-handoff.md"
  check_s_case S2 "$S2/memory/projects" present
  printf '%s\n' "$LAST_S_OUT" | grep 'SELFCHECK-FAIL stray-handoff' | grep -q 'notes/deep/2026-08-handoff.md' \
    || fail S2-path "the stray-handoff FAIL line did not name notes/deep/2026-08-handoff.md: $(printf '%s\n' "$LAST_S_OUT" | grep 'stray-handoff')"

  # S3: UNTRACKED memory/projects/scratch-handoff.md -- the sanctioned home, must NOT fail.
  # S1-and-S3 TOGETHER are the vacuity proof named in the contract: a predicate that never fires
  # fails S1/S2/S4 (they expect a FAIL and get none); a predicate that always fires fails S0/S3/S6
  # (they expect no FAIL and get one). Passing every case in this matrix is only possible for a
  # predicate that actually implements untracked-AND-outside-memory/projects/.
  S3="$WORK/s3"; mk_repo "$S3"
  printf 'x\n' > "$S3/memory/projects/scratch-handoff.md"
  check_s_case S3 "$S3/memory/projects" absent

  # S4: UNTRACKED archive-shaped file at the WRONG path -- still stray, must FAIL.
  S4="$WORK/s4"; mk_repo "$S4"
  printf 'x\n' > "$S4/memory/monster-realm-handoff-archive-2026-09.md"
  check_s_case S4 "$S4/memory/projects" present
  printf '%s\n' "$LAST_S_OUT" | grep 'SELFCHECK-FAIL stray-handoff' | grep -q 'monster-realm-handoff-archive-2026-09.md' \
    || fail S4-path "the stray-handoff FAIL line did not name the archive-shaped stray path: $(printf '%s\n' "$LAST_S_OUT" | grep 'stray-handoff')"

  # S6: gitignored projects/x/handoff.md, with a root-anchored /projects/ ignore rule (mirrors the
  # real repo's own top-level projects/ .gitignore entry). Documented blind spot, PINNED so a
  # future change to it is a deliberate decision, not a silent regression -- must NOT fail.
  S6="$WORK/s6"; mk_repo "$S6"
  printf '/projects/\n' > "$S6/.gitignore"
  git_h -C "$S6" add .gitignore
  git_h -C "$S6" commit -q -m "s6: add gitignore"
  mkdir -p "$S6/projects/x"
  printf 'x\n' > "$S6/projects/x/handoff.md"
  check_s_case S6 "$S6/memory/projects" absent

  # S7: fixture MEM whose repo root is NOT a git repo at all -- "unverifiable is not clean" must FAIL.
  S7_MEM="$WORK/s7/memory/projects"
  mkdir -p "$S7_MEM"
  if git_h -C "$S7_MEM" rev-parse --show-toplevel >/dev/null 2>&1; then
    fail S7 "setup: the fixture tmp tree unexpectedly resolved inside a git repository -- cannot construct the 'not a git repo' fixture in this environment"
  else
    check_s_case S7 "$S7_MEM" present
  fi

  # S8: S1's fixture PLUS a `.gitignore` line `*handoff*.md` -- the laundering attack.
  # --exclude-standard now hides the stray file from `git ls-files --others`, so the STRAY-HANDOFF
  # check itself cannot fire (this is exactly the silent, zero-error bypass red-team M9 proved) --
  # the separate ignore-laundering probe (contract item 2) must be what catches it. The contract
  # does not name that probe's exact FAIL id, only that "an ignore rule matching *handoff*.md is
  # laundering handoff-shaped files" (plan.md 7.7) is what must be reported, so this assertion is
  # deliberately anchored on that vocabulary (`/ignor/i`) rather than a specific id -- broad enough
  # to survive minor renames, narrow enough that an unrelated FAIL elsewhere cannot satisfy it.
  S8="$WORK/s8"; mk_repo "$S8"
  printf '*handoff*.md\n' > "$S8/.gitignore"
  git_h -C "$S8" add .gitignore
  git_h -C "$S8" commit -q -m "s8: add laundering gitignore"
  printf 'stray untracked\n' > "$S8/memory/monster-realm-handoff.md"
  LAST_S_OUT=$(run_pylp06 "$S8/memory/projects")
  if printf '%s\n' "$LAST_S_OUT" | grep -i 'SELFCHECK-FAIL' | grep -qi 'ignor'; then
    ok S8
  else
    fail S8 "expected a SELFCHECK-FAIL line about the ignore-laundering probe (matching /ignor/i); got: $(printf '%s\n' "$LAST_S_OUT" | grep -i 'SELFCHECK-FAIL' | tr '\n' '|' | cut -c1-400)"
  fi
fi

# =====================================================================================
# --- B cases: mr-backup driven as a real external subprocess (never re-implemented here).
# All roots are tmp-only; MR_BACKUP_ROOT is always set except where the case is specifically
# about its ABSENCE (B4), and B5(c) never points at a real corpus path (see its own comment).
# =====================================================================================
if [ ! -f "$BACKUP" ]; then
  for id in B0 B1 B2 B3a B3b B3c B4 B5a B5b B5c B5d B6; do
    echo "TEETH-FAIL $id: skipped -- mr-backup not found at $BACKUP"
    BAD=1
  done
else

# B0: byte-for-byte restore. >=1000 lines, non-ASCII, trailing partial line with no newline.
B0_SRC="$WORK/b0-src/monster-realm-usage-ledger.jsonl"
mkdir -p "$(dirname "$B0_SRC")"
/usr/bin/python3 - "$B0_SRC" <<'PYGEN'
import sys
path = sys.argv[1]
with open(path, "wb") as f:
    for i in range(1000):
        f.write(('{"i": %d, "note": "café ☃ 日本語"}' % i).encode("utf-8"))
        f.write(b"\n")
    f.write(b'{"partial": true, "trailing": "no newline here"')
PYGEN
B0_PRISTINE="$WORK/b0-pristine.jsonl"
cp "$B0_SRC" "$B0_PRISTINE"
B0_ROOT="$WORK/b0-root/mr-backup"
timeout 30 env MR_BACKUP_ROOT="$B0_ROOT" "$BACKUP" snapshot --file "$B0_SRC" >"$WORK/b0-snap.out" 2>"$WORK/b0-snap.err"
RC=$?
if [ "$RC" -ne 0 ]; then
  fail B0 "snapshot exited $RC: $(tail -c 300 "$WORK/b0-snap.err")"
else
  rm -f "$B0_SRC"
  B0_OUT="$WORK/b0-out"; mkdir -p "$B0_OUT"
  timeout 30 env MR_BACKUP_ROOT="$B0_ROOT" "$BACKUP" restore --file monster-realm-usage-ledger.jsonl --to "$B0_OUT" >"$WORK/b0-restore.out" 2>"$WORK/b0-restore.err"
  RC2=$?
  if [ "$RC2" -ne 0 ]; then
    fail B0 "restore exited $RC2: $(tail -c 300 "$WORK/b0-restore.err")"
  elif [ ! -f "$B0_OUT/monster-realm-usage-ledger.jsonl" ]; then
    fail B0 "restore reported success but $B0_OUT/monster-realm-usage-ledger.jsonl does not exist"
  elif cmp -s "$B0_OUT/monster-realm-usage-ledger.jsonl" "$B0_PRISTINE"; then
    ok B0
  else
    fail B0 "restored file is NOT byte-identical to the pristine pre-corruption copy (cmp mismatch)"
  fi
fi

# B1: idempotence -- two snapshot runs, no change, exactly one copy, one day-directory.
B1_ROOT="$WORK/b1-root/mr-backup"
B1_SRC="$WORK/b1-src/monster-realm-handoff.md"
mkdir -p "$(dirname "$B1_SRC")"; printf 'fixture handoff\n' > "$B1_SRC"
timeout 15 env MR_BACKUP_ROOT="$B1_ROOT" "$BACKUP" snapshot --file "$B1_SRC" >/dev/null 2>"$WORK/b1-1.err"
timeout 15 env MR_BACKUP_ROOT="$B1_ROOT" "$BACKUP" snapshot --file "$B1_SRC" >/dev/null 2>"$WORK/b1-2.err"
B1_DAYDIRS=$(find "$B1_ROOT" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
B1_COPIES=$(find "$B1_ROOT" -type f -name "monster-realm-handoff.md" 2>/dev/null | wc -l)
if [ "$B1_DAYDIRS" -eq 1 ] && [ "$B1_COPIES" -eq 1 ]; then
  ok B1
else
  fail B1 "expected 1 day-dir and 1 copy after two identical snapshots, got $B1_DAYDIRS day-dirs / $B1_COPIES copies"
fi

# B2: prune bound. 20 fabricated 8-digit day-dirs (20200101..20200120) + a non-matching decoy
# DIRECTORY ("keepme") + a decoy FILE with an 8-digit name ("20260199") that must survive
# untouched. After a real snapshot (which lands in TODAY's real UTC day-dir, always newest),
# exactly 14 8-digit directories must remain: today + the newest 13 fabricated ones.
B2_ROOT="$WORK/b2-root/mr-backup"
mkdir -p "$B2_ROOT"
for d in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20; do
  mkdir -p "$B2_ROOT/202001$d"
  : > "$B2_ROOT/202001$d/monster-realm-handoff.md"
done
mkdir -p "$B2_ROOT/keepme"
: > "$B2_ROOT/keepme/dummy"
: > "$B2_ROOT/20260199"
B2_SRC="$WORK/b2-src/monster-realm-handoff.md"; mkdir -p "$(dirname "$B2_SRC")"; printf 'b2\n' > "$B2_SRC"
timeout 30 env MR_BACKUP_ROOT="$B2_ROOT" "$BACKUP" snapshot --file "$B2_SRC" >"$WORK/b2.out" 2>"$WORK/b2.err"
RC=$?
if [ "$RC" -ne 0 ]; then
  fail B2 "snapshot exited $RC: $(tail -c 300 "$WORK/b2.err")"
else
  TODAY=$(date -u +%Y%m%d)
  EXPECTED=$(printf '%s\n' "$TODAY" 20200108 20200109 20200110 20200111 20200112 20200113 20200114 20200115 20200116 20200117 20200118 20200119 20200120 | sort)
  ACTUAL=$(find "$B2_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | grep -E '^[0-9]{8}$' | sort)
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    fail B2 "prune did not keep exactly the newest 14 8-digit day-dirs. expected: $(echo "$EXPECTED" | tr '\n' ' ') got: $(echo "$ACTUAL" | tr '\n' ' ')"
  elif [ ! -d "$B2_ROOT/keepme" ] || [ ! -f "$B2_ROOT/keepme/dummy" ]; then
    fail B2 "the non-matching decoy directory keepme/ did not survive the prune untouched"
  elif [ ! -f "$B2_ROOT/20260199" ]; then
    fail B2 "the decoy FILE with an 8-digit name (20260199) did not survive -- prune must only ever touch directories"
  else
    ok B2
  fi
fi

# B3a: illegal root -- basename is not literally "mr-backup" -- non-zero exit, nothing written.
B3A_ROOT="$WORK/b3a/notbackup"
B3A_SRC="$WORK/b3a-src/monster-realm-handoff.md"; mkdir -p "$(dirname "$B3A_SRC")"; printf 'x\n' > "$B3A_SRC"
timeout 15 env MR_BACKUP_ROOT="$B3A_ROOT" "$BACKUP" snapshot --file "$B3A_SRC" >"$WORK/b3a.out" 2>"$WORK/b3a.err"
RC=$?
if [ "$RC" -eq 0 ]; then
  fail B3a "expected non-zero exit for a root whose basename is not 'mr-backup', got 0"
elif [ -e "$B3A_ROOT" ]; then
  fail B3a "illegal root was created on disk despite the non-zero exit"
else
  ok B3a
fi

# B3b: illegal root -- correctly named "mr-backup" but INSIDE a git working tree -- non-zero exit.
B3B_REPO="$WORK/b3b-repo"; mkdir -p "$B3B_REPO"
git_h -C "$B3B_REPO" init -q
B3B_ROOT="$B3B_REPO/mr-backup"
B3B_SRC="$WORK/b3b-src/monster-realm-handoff.md"; mkdir -p "$(dirname "$B3B_SRC")"; printf 'x\n' > "$B3B_SRC"
timeout 15 env MR_BACKUP_ROOT="$B3B_ROOT" "$BACKUP" snapshot --file "$B3B_SRC" >"$WORK/b3b.out" 2>"$WORK/b3b.err"
RC=$?
if [ "$RC" -eq 0 ]; then
  fail B3b "expected non-zero exit for a root inside a git working tree, got 0"
elif [ -e "$B3B_ROOT" ]; then
  fail B3b "illegal root was created on disk despite the non-zero exit"
else
  ok B3b
fi

# B3c: illegal root -- basename CONTAINS the token "backup" (a plausible near-miss) but is NOT
# literally "mr-backup" -- must still be refused. The contract's rule is literal-name EQUALITY,
# not a substring/token match: a token match would admit MR_BACKUP_ROOT=$HOME/backup (or
# $HOME/backup-old, etc.), which defeats the whole point of the basename check -- bounding what
# the prune loop is allowed to unlink to directories it can prove are this tool's own. Pinned here
# so a future relaxation to "contains backup as a -/_ delimited token" reds instead of shipping.
B3C_ROOT="$WORK/b3c/backup-scratch"
B3C_SRC="$WORK/b3c-src/monster-realm-handoff.md"; mkdir -p "$(dirname "$B3C_SRC")"; printf 'x\n' > "$B3C_SRC"
timeout 15 env MR_BACKUP_ROOT="$B3C_ROOT" "$BACKUP" snapshot --file "$B3C_SRC" >"$WORK/b3c.out" 2>"$WORK/b3c.err"
RC=$?
if [ "$RC" -eq 0 ]; then
  fail B3c "expected non-zero exit for a root whose basename ('backup-scratch') contains the token 'backup' but is not literally 'mr-backup', got 0"
elif [ -e "$B3C_ROOT" ]; then
  fail B3c "illegal root was created on disk despite the non-zero exit -- basename equality is not being enforced literally"
else
  ok B3c
fi

# B4: boundary -- non-canonical source with NO MR_BACKUP_ROOT anywhere in the environment.
# The fixture-pollution firewall: exit 0, a skip: line on stderr, and the DEFAULT root under a
# tmp HOME must never come into existence.
B4_HOME="$WORK/b4-home"; mkdir -p "$B4_HOME"
B4_SRC="$WORK/b4-src/some-file.txt"; mkdir -p "$(dirname "$B4_SRC")"; printf 'not canonical\n' > "$B4_SRC"
timeout 15 env -u MR_BACKUP_ROOT -u XDG_STATE_HOME HOME="$B4_HOME" "$BACKUP" snapshot --file "$B4_SRC" >"$WORK/b4.out" 2>"$WORK/b4.err"
RC=$?
if [ "$RC" -ne 0 ]; then
  fail B4 "expected exit 0 (skip, not error) for a non-canonical source with no MR_BACKUP_ROOT, got $RC"
elif ! grep -q 'skip:' "$WORK/b4.err"; then
  fail B4 "expected a 'skip:' line on stderr, got: $(cat "$WORK/b4.err")"
elif [ -e "$B4_HOME/.local/state/mr-backup" ]; then
  fail B4 "the default backup root came into existence under a tmp HOME -- the fixture-pollution firewall failed"
elif grep -q 'snapshot:' "$WORK/b4.out"; then
  fail B4 "stdout claims a snapshot happened despite the non-canonical source: $(cat "$WORK/b4.out")"
else
  ok B4
fi

fi # mr-backup exists

if [ ! -f "$BACKUP" ]; then
  : # B5/B6 already reported "skipped" above
else

# B5a/b/d: restore refusals that need no special canonical-path handling.
B5_ROOT="$WORK/b5-root/mr-backup"
timeout 15 env MR_BACKUP_ROOT="$B5_ROOT" "$BACKUP" restore --file '../../etc/passwd' --to "$WORK/b5-out-a" >"$WORK/b5a.out" 2>"$WORK/b5a.err"
RC=$?
if [ "$RC" -eq 0 ]; then fail B5a "restore --file '../../etc/passwd' must be refused (path separators/.. are outside the closed vocabulary), got exit 0"
else ok B5a
fi

timeout 15 env MR_BACKUP_ROOT="$B5_ROOT" "$BACKUP" restore --file 'some-other-name.md' --to "$WORK/b5-out-b" >"$WORK/b5b.out" 2>"$WORK/b5b.err"
RC=$?
if [ "$RC" -eq 0 ]; then fail B5b "restore --file 'some-other-name.md' must be refused (not one of the two canonical basenames), got exit 0"
else ok B5b
fi

timeout 15 env MR_BACKUP_ROOT="$B5_ROOT" "$BACKUP" restore --file 'monster-realm-usage-ledger.jsonl' --to "$WORK/b5-out-d" >"$WORK/b5d.out" 2>"$WORK/b5d.err"
RC=$?
if [ "$RC" -eq 0 ]; then fail B5d "restore with NO snapshot ever taken under this root must be refused, got exit 0"
else ok B5d
fi

# B5c: restore refusing to write over a live canonical SOURCE path.
#
# A true positive of this rule needs the resolved --to/<basename> to equal one of the two
# hardcoded canonical absolute paths -- which are the REAL corpus's ledger/handoff. This script
# must never touch production state, so it never passes those real paths to mr-backup. Instead:
# copy mr-backup to a tmp file and sed-patch BOTH literal canonical-path constants to point at
# tmp fixture files -- the same "copy the real tool, sed one hardcoded constant" technique already
# used on mr-record in W2 above, applied to mr-backup's two constants. The patched copy then runs
# with the SAME logic against a canonical path that is 100% disposable, so a buggy implementation
# can corrupt only a tmp fixture, never the real ledger.
#
# Because mr-backup does not exist pre-implementation, the SHAPE of these constants cannot be
# verified in advance -- so both the pre-sed presence count AND the post-sed landing are asserted
# mechanically: exactly 1 occurrence of each real path (2 total, one per canonical path) before
# the patch, and after `sed -i`, the fixture paths must be present and NO trace of either real
# path may remain in the copy. A drifted/renamed/duplicated constant reds loudly here instead of
# the patch silently no-op'ing into a vacuous B5c pass.
REAL_LEDGER_PATH="/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-usage-ledger.jsonl"
REAL_HANDOFF_PATH="/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-handoff.md"
FIX_LEDGER_CANON="$WORK/b5c-canon/monster-realm-usage-ledger.jsonl"
FIX_HANDOFF_CANON="$WORK/b5c-canon/monster-realm-handoff.md"
BACKUP_COPY="$WORK/mr-backup-b5c"
cp "$BACKUP" "$BACKUP_COPY"
CNT_L=$(grep -cF "$REAL_LEDGER_PATH" "$BACKUP")
CNT_H=$(grep -cF "$REAL_HANDOFF_PATH" "$BACKUP")
if [ "$CNT_L" != "1" ] || [ "$CNT_H" != "1" ]; then
  fail B5c "expected exactly 1 occurrence each of the two hardcoded canonical path constants in the real mr-backup (2 total: ledger hits=$CNT_L, handoff hits=$CNT_H) -- the contract's hardcoded-path rule is missing, duplicated, or has drifted (expected pre-implementation)"
else
  sed -i "s|$REAL_LEDGER_PATH|$FIX_LEDGER_CANON|g; s|$REAL_HANDOFF_PATH|$FIX_HANDOFF_CANON|g" "$BACKUP_COPY"
  CNT_L_LANDED=$(grep -cF "$FIX_LEDGER_CANON" "$BACKUP_COPY")
  CNT_H_LANDED=$(grep -cF "$FIX_HANDOFF_CANON" "$BACKUP_COPY")
  CNT_REAL_REMAINING=$(( $(grep -cF "$REAL_LEDGER_PATH" "$BACKUP_COPY") + $(grep -cF "$REAL_HANDOFF_PATH" "$BACKUP_COPY") ))
  if [ "$CNT_L_LANDED" -lt 1 ] || [ "$CNT_H_LANDED" -lt 1 ] || [ "$CNT_REAL_REMAINING" -ne 0 ]; then
    fail B5c "the sed patch did not land as expected in the copy (ledger-fixture-hits=$CNT_L_LANDED handoff-fixture-hits=$CNT_H_LANDED real-path-remnants=$CNT_REAL_REMAINING) -- refusing to run the patched copy"
  else
    mkdir -p "$WORK/b5c-canon"
    printf 'canon ledger content\n' > "$FIX_LEDGER_CANON"
    B5C_HOME="$WORK/b5c-home"; mkdir -p "$B5C_HOME"
    timeout 15 env -u MR_BACKUP_ROOT -u XDG_STATE_HOME HOME="$B5C_HOME" "$BACKUP_COPY" snapshot --file "$FIX_LEDGER_CANON" >"$WORK/b5c-snap.out" 2>"$WORK/b5c-snap.err"
    SNAP_RC=$?
    CANON_BEFORE=$(cat "$FIX_LEDGER_CANON")
    timeout 15 env -u MR_BACKUP_ROOT -u XDG_STATE_HOME HOME="$B5C_HOME" "$BACKUP_COPY" restore --file monster-realm-usage-ledger.jsonl --to "$WORK/b5c-canon" >"$WORK/b5c-restore.out" 2>"$WORK/b5c-restore.err"
    RESTORE_RC=$?
    CANON_AFTER=$(cat "$FIX_LEDGER_CANON")
    if [ "$SNAP_RC" -ne 0 ]; then
      fail B5c "setup: the patched copy's own snapshot of the fixture 'canonical' file failed (exit $SNAP_RC) -- cannot proceed to the restore-refusal assertion: $(tail -c 300 "$WORK/b5c-snap.err")"
    elif [ "$RESTORE_RC" -eq 0 ]; then
      fail B5c "restore --to resolving onto the (patched) canonical SOURCE path must be refused, got exit 0"
    elif [ "$CANON_BEFORE" != "$CANON_AFTER" ]; then
      fail B5c "the canonical source file's content CHANGED despite the non-zero exit -- refusal happened too late, after the write"
    else
      ok B5c
    fi
  fi
fi

# B6: mr-backup --selftest.
timeout 60 "$BACKUP" --selftest >"$WORK/b6.out" 2>"$WORK/b6.err"
RC=$?
N=$(grep -oE 'BACKUP-SELFTEST-OK [0-9]+' "$WORK/b6.out" | awk '{print $2}')
if [ "$RC" -ne 0 ]; then
  fail B6 "mr-backup --selftest exited $RC: $(tail -c 300 "$WORK/b6.err")"
elif [ -z "$N" ]; then
  fail B6 "mr-backup --selftest did not print 'BACKUP-SELFTEST-OK <n>': $(tail -c 300 "$WORK/b6.out")"
elif [ "$N" -lt 6 ]; then
  fail B6 "BACKUP-SELFTEST-OK reported $N fixtures, floor is 6"
else
  ok B6
fi

fi # mr-backup exists (B5/B6)

# =====================================================================================
# --- W cases: wiring. Logic-in-isolation is not enough (the lp-brief-cost lesson) -- these
# prove a FAIL/trigger/refusal actually reaches the real exit path of the real subject files.
# =====================================================================================

# W1a: exactly one BAD=0 initialiser in mr-selfcheck -- a later reset would silence every FAIL
# above it while SELFCHECK-OK still printed.
W1_BADCOUNT=$(grep -cE '^[[:space:]]*BAD=0' "$SELFCHECK")
if [ "$W1_BADCOUNT" = "1" ]; then ok W1-bad-count
else fail W1-bad-count "expected exactly 1 'BAD=0' initialiser in $SELFCHECK, found $W1_BADCOUNT"
fi

# W1b: lp-brief-cost-teeth.sh's own sed extraction range must still match exactly one bounded
# region, and the lp-06 block's banner must NOT land inside it.
LPCOST_RANGE=$(sed -n '/^# lp-brief-cost:/,/^grep -F .Definition of done/p' "$SELFCHECK")
LPCOST_RANGE_LINES=$(printf '%s\n' "$LPCOST_RANGE" | wc -l)
if [ -z "$LPCOST_RANGE" ]; then
  fail W1-lpcost-range "the lp-brief-cost sed anchor range matched ZERO lines in $SELFCHECK -- its anchor has drifted or been removed"
elif [ "$LPCOST_RANGE_LINES" -gt 60 ]; then
  fail W1-lpcost-range "the lp-brief-cost sed anchor range matched $LPCOST_RANGE_LINES lines (>60) -- its closing anchor likely failed to match"
elif printf '%s\n' "$LPCOST_RANGE" | grep -q '^# lp-06: mr-backup'; then
  fail W1-lpcost-range "the lp-06 block banner was found INSIDE the lp-brief-cost sed extraction range -- lp-06 landed inside lp-brief-cost's anchor window"
else
  ok W1-lpcost-range
fi

assert_last_row_json() {
  # $1 = ledger file, $2 = expected slice value. Prints OK or a diagnostic; caller checks $?.
  /usr/bin/python3 - "$1" "$2" <<'PYCHK'
import json, sys
path, want = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        lines = [l for l in f if l.strip()]
    if not lines:
        print("EMPTY"); sys.exit(1)
    row = json.loads(lines[-1])
except Exception as e:
    print("PARSE-ERROR: %s" % e); sys.exit(1)
if row.get("slice") != want:
    print("SLICE-MISMATCH got=%r want=%r" % (row.get("slice"), want)); sys.exit(1)
print("OK")
PYCHK
}

# W2: positive mr-record direction. sed a COPY's hardcoded MEM= to a fixture dir, asserting the
# substitution count is exactly 1 first (the single-pass-substitution trap). The anchor is
# TIGHTENED to ^MEM=/home/mdrewt (not the looser ^MEM=): the file also contains
# `MEM=os.environ["MEM"]; ...` inside the quoted python heredoc (mr-record:46), which a looser
# `^MEM=.*` anchor matches too -- confirmed by running this exact check against the real file,
# which found 2 hits, not 1. A blind sed with the loose anchor would silently rewrite THAT line as
# well and corrupt the tool, so a wrong/loosened anchor here must be caught mechanically, not just
# by inspection: after the substitution we additionally assert (a) it actually landed, (b) the
# patched copy still parses (`bash -n`), and (c) the python heredoc's own `MEM=os.environ["MEM"]`
# line is still byte-intact -- so a future re-loosened anchor reds HERE, loudly, instead of
# silently shipping a broken fixture that then fails every downstream W2 assertion for the wrong
# reason.
W2_SUBCOUNT=$(sed -n 's|^MEM=/home/mdrewt.*|MEM=X|p' "$RECORD" | wc -l)
W2_BUILD_OK=0
if [ "$W2_SUBCOUNT" != "1" ]; then
  fail W2-subst-trap "expected exactly 1 line matching ^MEM=/home/mdrewt in $RECORD (the bash MEM= assignment, tightly anchored so mr-record:46's python MEM=os.environ[\"MEM\"] line is never touched), sed matched $W2_SUBCOUNT -- refusing to build the fixture copy"
else
  W2_FIXMEM="$WORK/w2-mem"; mkdir -p "$W2_FIXMEM"
  W2_RECORD="$WORK/mr-record-w2"
  sed "s|^MEM=/home/mdrewt.*|MEM=$W2_FIXMEM|" "$RECORD" > "$W2_RECORD"
  chmod +x "$W2_RECORD"
  if ! grep -qF "MEM=$W2_FIXMEM" "$W2_RECORD"; then
    fail W2-subst-trap "the substitution did not land: no line 'MEM=$W2_FIXMEM' found in the patched copy"
  elif ! bash -n "$W2_RECORD" >"$WORK/w2-bashn.err" 2>&1; then
    fail W2-subst-trap "the patched copy fails bash -n after substitution: $(tail -c 300 "$WORK/w2-bashn.err")"
  elif ! grep -qF 'MEM=os.environ["MEM"]' "$W2_RECORD"; then
    fail W2-subst-trap "the python heredoc's MEM=os.environ[\"MEM\"] line was corrupted by the substitution -- the anchor is not tight enough"
  else
    ok W2-subst-trap
    W2_BUILD_OK=1
  fi
fi

if [ "$W2_BUILD_OK" != 1 ]; then
  fail W2-ledger "skipped -- the patched mr-record copy failed to build correctly (see W2-subst-trap above)"
  fail W2-handoff "skipped -- the patched mr-record copy failed to build correctly (see W2-subst-trap above)"
else
  W2_ROOT="$WORK/w2-root/mr-backup"
  W2_FIXLEDGER="$W2_FIXMEM/monster-realm-usage-ledger.jsonl"
  W2_FIXHANDOFF="$W2_FIXMEM/monster-realm-handoff.md"
  timeout 30 env -u MR_RECORD_LEDGER -u MR_RECORD_HANDOFF -u MR_RECORD_STATE MR_BACKUP_ROOT="$W2_ROOT" MR_BACKUP_BIN="$BACKUP" \
    "$W2_RECORD" ledger --run_id w2 --slice w2-fixture --outcome MERGED >"$WORK/w2-ledger.out" 2>"$WORK/w2-ledger.err"
  W2L_RC=$?
  W2L_CHK=$(assert_last_row_json "$W2_FIXLEDGER" "w2-fixture" 2>&1)
  if [ "$W2L_RC" -ne 0 ]; then
    fail W2-ledger "mr-record (patched copy) ledger subcommand exited $W2L_RC: $(tail -c 300 "$WORK/w2-ledger.err")"
  elif [ "$W2L_CHK" != "OK" ]; then
    fail W2-ledger "the fixture ledger row was not appended correctly: $W2L_CHK"
  elif ! find "$W2_ROOT" -type f -name "monster-realm-usage-ledger.jsonl" 2>/dev/null | grep -q .; then
    fail W2-ledger "mr-record wrote the ledger row but no snapshot of it appeared under MR_BACKUP_ROOT -- the trigger did not fire (expected pre-implementation)"
  else
    ok W2-ledger
  fi

  timeout 30 env -u MR_RECORD_LEDGER -u MR_RECORD_HANDOFF -u MR_RECORD_STATE MR_BACKUP_ROOT="$W2_ROOT" MR_BACKUP_BIN="$BACKUP" \
    "$W2_RECORD" handoff --title "w2 fixture" --body "hello from lp-06 teeth" >"$WORK/w2-handoff.out" 2>"$WORK/w2-handoff.err"
  W2H_RC=$?
  if [ "$W2H_RC" -ne 0 ]; then
    fail W2-handoff "mr-record (patched copy) handoff subcommand exited $W2H_RC: $(tail -c 300 "$WORK/w2-handoff.err")"
  elif [ ! -f "$W2_FIXHANDOFF" ]; then
    fail W2-handoff "the fixture handoff file was not written at all"
  elif ! find "$W2_ROOT" -type f -name "monster-realm-handoff.md" 2>/dev/null | grep -q .; then
    fail W2-handoff "mr-record wrote the handoff but no snapshot of it appeared under MR_BACKUP_ROOT -- the trigger did not fire (expected pre-implementation)"
  else
    ok W2-handoff
  fi
fi

# W3: negative direction. The REAL, unmodified mr-record (hardcoded MEM stays the real corpus
# MEM, matching production) with MR_RECORD_LEDGER at a fixture path, HOME at a tmp dir, and
# MR_BACKUP_ROOT explicitly REMOVED from the environment -- the row must still be appended, and
# NO default backup root may come into existence under that HOME (mr-backup's own canonical-
# source boundary is what makes this true: the fixture ledger path is non-canonical in
# production mode, so even a correctly-firing trigger is a no-op skip here).
W3_HOME="$WORK/w3-home"; mkdir -p "$W3_HOME"
W3_FIXLEDGER="$WORK/w3-ledger.jsonl"
timeout 30 env -u MR_BACKUP_ROOT -u XDG_STATE_HOME MR_RECORD_LEDGER="$W3_FIXLEDGER" HOME="$W3_HOME" \
  "$RECORD" ledger --run_id w3 --slice w3-fixture --outcome MERGED >"$WORK/w3.out" 2>"$WORK/w3.err"
W3_RC=$?
W3_CHK=$(assert_last_row_json "$W3_FIXLEDGER" "w3-fixture" 2>&1)
if [ "$W3_RC" -ne 0 ]; then
  fail W3 "real mr-record ledger subcommand exited $W3_RC: $(tail -c 300 "$WORK/w3.err")"
elif [ "$W3_CHK" != "OK" ]; then
  fail W3 "the fixture ledger row was not appended correctly: $W3_CHK"
elif [ -e "$W3_HOME/.local/state/mr-backup" ]; then
  fail W3 "a default backup root came into existence under the tmp HOME even though MR_BACKUP_ROOT was unset -- fixture ledgers must never be backed up"
else
  ok W3
fi

# NOTE on W3 and this whole W4 block: they PASS pre-implementation, and that is expected, not a
# hole. They are isolation/regression guards on mr-record's write path (never lose a row, never
# hang, never leak an env override) -- properties that hold trivially when mr-record calls
# mr-backup NOT AT ALL, and can only start biting once the call exists. Their green here is not
# evidence the trigger is wired; W2 (which fails loudly pre-implementation) is what proves that.
#
# W4: failure isolation via MR_BACKUP_BIN. In ALL three: mr-record exits 0, the row is appended
# and parses as JSON, and elapsed stays well under the tick's 60s (and specifically the 10s+grace
# bound for (b)). No sleep-based synchronization is used here except the stub's OWN sleep in (b),
# which is the fixture, not a wait WE impose.
run_w4() {
  # $1=id $2=bin $3=bound_seconds
  local id="$1" bin="$2" bound="$3" ledger start end elapsed rc chk
  ledger="$WORK/w4-$id-ledger.jsonl"
  start=$(date +%s)
  timeout 40 env MR_BACKUP_BIN="$bin" MR_RECORD_LEDGER="$ledger" "$RECORD" ledger --run_id "w4-$id" --slice "w4-$id-fixture" --outcome MERGED >"$WORK/w4-$id.out" 2>"$WORK/w4-$id.err"
  rc=$?
  end=$(date +%s)
  elapsed=$((end - start))
  chk=$(assert_last_row_json "$ledger" "w4-$id-fixture" 2>&1)
  if [ "$rc" -ne 0 ]; then
    fail "W4$id" "mr-record exited $rc (expected 0 -- a backup failure must never propagate): $(tail -c 300 "$WORK/w4-$id.err")"
  elif [ "$chk" != "OK" ]; then
    fail "W4$id" "the ledger row was not appended intact: $chk"
  elif [ "$elapsed" -gt "$bound" ]; then
    fail "W4$id" "elapsed ${elapsed}s exceeds the ${bound}s bound -- the backup failure was not isolated fast enough"
  else
    ok "W4$id"
  fi
}

W4A_STUB="$WORK/w4-stub-a"
printf '#!/bin/bash\nexit 1\n' > "$W4A_STUB"; chmod +x "$W4A_STUB"
run_w4 a "$W4A_STUB" 15

W4B_STUB="$WORK/w4-stub-b"
printf '#!/bin/bash\nsleep 60\n' > "$W4B_STUB"; chmod +x "$W4B_STUB"
run_w4 b "$W4B_STUB" 28

# W4b orphan check: the stub must not still be running once mr-record has returned. No sleep here
# either -- if mr-record returned, a correct implementation has already killed the child; a buggy
# one leaves it running RIGHT NOW, which this check catches immediately.
if ps -eo args 2>/dev/null | grep -F "$W4B_STUB" | grep -v grep >/dev/null 2>&1; then
  fail W4b-orphan "the stub process spawned for W4b is STILL RUNNING after mr-record returned -- an orphaned backup child"
else
  ok W4b-orphan
fi

run_w4 c "$WORK/w4-stub-does-not-exist" 15

# W5: reachability -- the FAIL must reach mr-selfcheck's real exit path, not just the extracted
# block in isolation. CHOSEN APPROACH (of the two the contract offers): create the S1-shaped
# stray file DIRECTLY in the REAL repo's memory/ directory (outside memory/projects/), run the
# REAL mr-selfcheck, assert the FAIL prints and SELFCHECK-OK does not, remove the file, run again
# and assert SELFCHECK-OK returns. Chosen over "mirror the whole corpus into a fixture" because
# that mirror is itself a large, easy-to-get-subtly-wrong reimplementation of the corpus's own
# tool-discovery glob -- a second surface for exactly the kind of silent drift this script exists
# to catch. Made safe by: an absolute path, a refuse-if-already-exists guard (never overwrites or
# hides a real file), and a trap-based removal (final_cleanup, top of file) that fires on every
# exit path including a mid-script abort -- so a stray file can never survive this script's run
# regardless of where it fails.
#
# CAVEAT, stated plainly: the second assertion (SELFCHECK-OK returns after removal) depends on
# every OTHER mr-selfcheck check in the corpus already being green. If some unrelated gate is
# already red for an unrelated reason, W5-restored will fail even though lp-06 is not the cause.
# W5-present (the FAIL appears / SELFCHECK-OK is absent while the stray file exists) does NOT have
# this problem -- it is robust regardless of the rest of the corpus's health, and is the primary
# gating half of this case.
W5_REPO_ROOT=$(git -C "$MEM_DIR" rev-parse --show-toplevel 2>/dev/null)
if [ -z "$W5_REPO_ROOT" ]; then
  fail W5 "setup: could not resolve a git repo root from $MEM_DIR -- cannot construct the reachability probe"
else
  W5_STRAY_PATH="$W5_REPO_ROOT/memory/probe-w5-lp06-stray-handoff.md"
  if [ -e "$W5_STRAY_PATH" ]; then
    fail W5 "setup: $W5_STRAY_PATH already exists -- refusing to run (would clobber or hide a real file)"
  else
    printf 'lp-06 teeth W5 probe -- if this file survives a run, final_cleanup did not fire\n' > "$W5_STRAY_PATH"
    W5_STRAY_CREATED=1
    W5_OUT1=$(timeout 300 bash "$SELFCHECK" 2>&1)
    W5_FAIL_PRESENT=$(printf '%s\n' "$W5_OUT1" | grep -c 'SELFCHECK-FAIL stray-handoff')
    W5_OK_PRESENT=$(printf '%s\n' "$W5_OUT1" | grep -c '^SELFCHECK-OK$')
    if [ "$W5_FAIL_PRESENT" -ge 1 ] && [ "$W5_OK_PRESENT" -eq 0 ]; then
      ok W5-present
    else
      fail W5-present "with the stray file present, expected a stray-handoff FAIL and no SELFCHECK-OK; got FAIL-count=$W5_FAIL_PRESENT OK-count=$W5_OK_PRESENT"
    fi

    rm -f -- "$W5_STRAY_PATH"
    W5_STRAY_CREATED=0
    W5_OUT2=$(timeout 300 bash "$SELFCHECK" 2>&1)
    W5_OK_RESTORED=$(printf '%s\n' "$W5_OUT2" | grep -c '^SELFCHECK-OK$')
    if [ "$W5_OK_RESTORED" -ge 1 ]; then
      ok W5-restored
    else
      fail W5-restored "after removing the stray file, expected SELFCHECK-OK to print (see the caveat above this case if the corpus has an unrelated red check): $(printf '%s\n' "$W5_OUT2" | grep 'SELFCHECK-FAIL' | tr '\n' '|' | cut -c1-500)"
    fi
  fi
fi

# W6: structural lock-ordering pin. The handoff-path backup invocation must appear, BY LINE
# NUMBER, strictly AFTER the handoff block's `fcntl.flock(lf, fcntl.LOCK_UN)` release -- a
# refactor that "helpfully" moves the call inside the flock (rotation deadlock / read-half-
# rotated-file risk) must red. Bounded to the handoff block specifically (between `if
# SUB=="handoff":` and the lp-queue section marker) because mr-record's OTHER flock (state,
# for queue-add/-remove) also contains a LOCK_UN line the naive first-match would otherwise hit.
#
# ANCHOR TIGHTENED (Hole 2, red-team-proven): the bare word `mr-backup` also matches the block's
# own rationale COMMENTS (e.g. "snapshot via mr-backup only AFTER the flock is released"), which
# sit textually AFTER LOCK_UN regardless of whether the real _backup(HANDOFF) call line survives
# a refactor -- a mutation that deletes ONLY the call and leaves the prose would still pass a
# bare-word anchor. Anchoring on the literal call expression `_backup(HANDOFF)` closes that: a
# comment can say anything, it can never contain that exact call syntax by accident.
W6_START=$(grep -n '^if SUB=="handoff":' "$RECORD" | head -1 | cut -d: -f1)
W6_END=$(grep -n 'lp-queue: queue-add' "$RECORD" | head -1 | cut -d: -f1)
if [ -z "$W6_START" ] || [ -z "$W6_END" ] || [ "$W6_END" -le "$W6_START" ]; then
  fail W6 "extraction: could not locate the handoff-block content anchors in $RECORD (if SUB==\"handoff\": .. lp-queue: queue-add) -- extraction has drifted"
else
  W6_BLOCK="$WORK/w6-handoff-block.txt"
  sed -n "${W6_START},${W6_END}p" "$RECORD" > "$W6_BLOCK"
  W6_LOCKUN=$(grep -n 'fcntl.flock(lf, fcntl.LOCK_UN)' "$W6_BLOCK" | head -1 | cut -d: -f1)
  W6_BACKUP=$(grep -n '_backup(HANDOFF)' "$W6_BLOCK" | head -1 | cut -d: -f1)
  if [ -z "$W6_LOCKUN" ]; then
    fail W6 "the LOCK_UN anchor was not found inside the handoff block -- extraction has drifted"
  elif [ -z "$W6_BACKUP" ]; then
    fail W6 "no call to _backup(HANDOFF) was found inside the handoff block -- the trigger has not been wired yet (expected pre-implementation), or a refactor deleted the call while leaving its rationale comments behind"
  elif [ "$W6_BACKUP" -gt "$W6_LOCKUN" ]; then
    ok W6
  else
    fail W6 "_backup(HANDOFF) is called at block-relative line $W6_BACKUP, at or before LOCK_UN at line $W6_LOCKUN -- the backup call has moved INSIDE the flock"
  fi
fi

# W8: anti-vacuity pin for mr-selfcheck's ROOT-SAFETY verification (Hole 1, CRITICAL, red-team-
# proven). Check 3 in the extracted PYLP06 block verifies mr-backup's root-safety invariant only
# through `mr-backup --selftest`'s OWN self-report (a marker + a count it prints itself), and
# check 4 (the external round-trip probe) always uses a validly-named tmp root, so it never
# exercises an illegal one either. Red-team built a stubbed mr-backup whose `_root_illegal()`
# always returns None (both the literal-basename check AND the in-git-tree check gone) and whose
# `--selftest` is a bare `print("BACKUP-SELFTEST-OK 11"); return 0` -- the whole lp-06 block still
# exits 0, zero FAIL lines, and that stub's `_prune()` (untouched, still real) would `shutil.rmtree`
# whatever 8-digit-named directories happen to sit under a misdirected root like $HOME. This case
# builds that exact stub as a disposable COPY (never the repo's own mr-backup) and asserts the
# extracted PYLP06 block, run against a fixture MEM containing it, reports a FAIL naming the
# root-safety failure -- the gate must verify root safety OUT OF PROCESS, because a self-reported
# marker+count is one `print` away from being faked, and the consequence of that fake is an
# `rmtree` loose in $HOME.
if [ "$EXTRACTION_OK" != 1 ]; then
  fail W8 "skipped -- PYLP06 extraction failed (see the TEETH-FAIL extraction lines above)"
elif [ ! -f "$BACKUP" ]; then
  fail W8 "skipped -- mr-backup not found at $BACKUP"
else
  W8_ANCHOR1_BEFORE=$(grep -cxF 'def _root_illegal(root):' "$BACKUP")
  W8_ANCHOR2_BEFORE=$(grep -cxF 'def selftest():' "$BACKUP")
  if [ "$W8_ANCHOR1_BEFORE" != "1" ] || [ "$W8_ANCHOR2_BEFORE" != "1" ]; then
    fail W8 "expected exactly 1 occurrence each of 'def _root_illegal(root):' and 'def selftest():' in $BACKUP (found $W8_ANCHOR1_BEFORE / $W8_ANCHOR2_BEFORE) -- the contract's function shape has drifted; refusing to build the stub"
  else
    W8_LINE1='    return None  # W8 stub: root-safety disabled unconditionally (Hole 1 fixture)'
    W8_LINE2='    print("BACKUP-SELFTEST-OK 11"); return 0  # W8 stub: fabricated marker+count (Hole 1 fixture)'
    W8_STUB="$WORK/mr-backup-w8"
    sed -e '/^def _root_illegal(root):$/a\    return None  # W8 stub: root-safety disabled unconditionally (Hole 1 fixture)' \
        -e '/^def selftest():$/a\    print("BACKUP-SELFTEST-OK 11"); return 0  # W8 stub: fabricated marker+count (Hole 1 fixture)' \
        "$BACKUP" > "$W8_STUB"
    chmod +x "$W8_STUB"
    W8_LANDED1=$(grep -cxF "$W8_LINE1" "$W8_STUB")
    W8_LANDED2=$(grep -cxF "$W8_LINE2" "$W8_STUB")
    if [ "$W8_LANDED1" != "1" ] || [ "$W8_LANDED2" != "1" ]; then
      fail W8 "the sed insertion did not land as expected (root-illegal-stub-lines=$W8_LANDED1 selftest-stub-lines=$W8_LANDED2) -- refusing to run the stub"
    elif ! /usr/bin/python3 -c "import ast,sys;ast.parse(open(sys.argv[1]).read())" "$W8_STUB" >"$WORK/w8-ast.err" 2>&1; then
      fail W8 "the stubbed mr-backup copy fails to parse as python: $(tail -c 300 "$WORK/w8-ast.err")"
    else
      W8_REPO="$WORK/w8-repo"
      mk_repo "$W8_REPO"
      W8_MEM="$W8_REPO/memory/projects"
      cp "$W8_STUB" "$W8_MEM/mr-backup"; chmod +x "$W8_MEM/mr-backup"
      cp "$RECORD" "$W8_MEM/mr-record"; chmod +x "$W8_MEM/mr-record"
      git_h -C "$W8_REPO" add -A
      git_h -C "$W8_REPO" commit -q -m "w8 fixture: root-safety-disabled mr-backup stub"
      W8_OUT=$(run_pylp06 "$W8_MEM")
      # Anchored on TWO required keyword classes ("root" AND one of illegal/literal/basename/
      # safety) rather than a specific FAIL id, since the id the implementer's fix uses is not
      # dictated by the current contract -- but both classes together are specific enough that
      # nothing else in the block's existing vocabulary (stray-handoff, ignore-laundering,
      # backup-missing/-selftest/-selftest-marker/-selftest-count, backup-drift, backup-wiring,
      # backup-root-pollution) can satisfy them by accident.
      if printf '%s\n' "$W8_OUT" | grep -i 'SELFCHECK-FAIL' | grep -i 'root' | grep -Eqi 'illegal|literal|basename|safety'; then
        ok W8
      else
        fail W8 "expected a SELFCHECK-FAIL naming a root-safety failure when mr-backup's _root_illegal() always returns None and --selftest fabricates its own marker+count; today's check 3 trusts the self-report and check 4 never exercises an illegal root, so nothing catches this -- got: $(printf '%s\n' "$W8_OUT" | grep -i 'SELFCHECK-FAIL' | tr '\n' '|' | cut -c1-500)"
      fi
    fi
  fi
fi

# W9: anti-vacuity pin for mr-selfcheck's static WIRING check (Hole 2, MAJOR, red-team-proven).
# Check 6 in the extracted PYLP06 block is `if "mr-backup" not in record_text: fail(...)`, but
# mr-record carries rationale COMMENTS naming "mr-backup" right beside both call sites (and
# _backup_bin() itself constructs a literal "mr-backup" path string) -- so a refactor that deletes
# ONLY the two _backup(LEDGER)/_backup(HANDOFF) CALL lines, leaving every comment intact, still
# satisfies a bare substring check. This case builds that exact mutation on a disposable COPY
# (never the repo's own mr-record), asserting the prose demonstrably survives the mutation, and
# checks the extracted PYLP06 block reports SELFCHECK-FAIL backup-wiring against it.
if [ "$EXTRACTION_OK" != 1 ]; then
  fail W9 "skipped -- PYLP06 extraction failed (see the TEETH-FAIL extraction lines above)"
else
  W9_CALL_H='    _backup(HANDOFF)'
  W9_CALL_L='_backup(LEDGER)'
  W9_CNT_H_BEFORE=$(grep -cxF "$W9_CALL_H" "$RECORD")
  W9_CNT_L_BEFORE=$(grep -cxF "$W9_CALL_L" "$RECORD")
  if [ "$W9_CNT_H_BEFORE" != "1" ] || [ "$W9_CNT_L_BEFORE" != "1" ]; then
    fail W9 "expected exactly 1 occurrence each of the call lines '_backup(HANDOFF)' and '_backup(LEDGER)' in $RECORD (handoff hits=$W9_CNT_H_BEFORE, ledger hits=$W9_CNT_L_BEFORE) -- the contract's call-site shape has drifted; refusing to build the mutated fixture"
  else
    W9_MUTANT="$WORK/mr-record-w9"
    grep -vxF -e "$W9_CALL_H" -e "$W9_CALL_L" "$RECORD" > "$W9_MUTANT"
    chmod +x "$W9_MUTANT"
    W9_CNT_H_AFTER=$(grep -cxF "$W9_CALL_H" "$W9_MUTANT")
    W9_CNT_L_AFTER=$(grep -cxF "$W9_CALL_L" "$W9_MUTANT")
    W9_PROSE_SURVIVES=$(grep -c 'mr-backup' "$W9_MUTANT")
    if [ "$W9_CNT_H_AFTER" != "0" ] || [ "$W9_CNT_L_AFTER" != "0" ]; then
      fail W9 "the mutation did not remove both call lines cleanly (handoff-remaining=$W9_CNT_H_AFTER ledger-remaining=$W9_CNT_L_AFTER)"
    elif [ "$W9_PROSE_SURVIVES" -lt 1 ]; then
      fail W9 "setup: no occurrence of the substring 'mr-backup' survives in the mutated copy -- this would no longer be pinning the 'prose survives, trigger gone' defect Hole 2 describes"
    elif ! bash -n "$W9_MUTANT" >"$WORK/w9-bashn.err" 2>&1; then
      fail W9 "setup: the mutated mr-record copy fails bash -n: $(tail -c 300 "$WORK/w9-bashn.err")"
    else
      W9_REPO="$WORK/w9-repo"
      mk_repo "$W9_REPO"
      W9_MEM="$W9_REPO/memory/projects"
      cp "$W9_MUTANT" "$W9_MEM/mr-record"; chmod +x "$W9_MEM/mr-record"
      if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$W9_MEM/mr-backup"; chmod +x "$W9_MEM/mr-backup"
      fi
      git_h -C "$W9_REPO" add -A
      git_h -C "$W9_REPO" commit -q -m "w9 fixture: mutated mr-record, calls deleted, prose survives"
      W9_OUT=$(run_pylp06 "$W9_MEM")
      if printf '%s\n' "$W9_OUT" | grep -q 'SELFCHECK-FAIL backup-wiring'; then
        ok W9
      else
        fail W9 "expected SELFCHECK-FAIL backup-wiring when both _backup(LEDGER)/_backup(HANDOFF) CALL lines are deleted but the surrounding rationale comments (which still mention 'mr-backup') survive -- the static wiring check must not be satisfiable by prose alone; got: $(printf '%s\n' "$W9_OUT" | grep -i 'SELFCHECK-FAIL' | tr '\n' '|' | cut -c1-500)"
      fi
    fi
  fi
fi

# W7: corpus-pollution guard. Compare-after for the hashes/listing captured at the very top of
# this script. This is the mechanical proof that the whole battery above never mutated production
# state -- every fixture ledger/handoff/root used above was a tmp path; this is what confirms it.
W7_LEDGER_AFTER=$(hash_file "$REAL_LEDGER")
W7_HANDOFF_AFTER=$(hash_file "$REAL_HANDOFF")
if [ -d "$DEFAULT_BACKUP_ROOT" ]; then
  W7_ROOT_AFTER=$(find "$DEFAULT_BACKUP_ROOT" -printf '%p %s %T@\n' 2>/dev/null | sort)
else
  W7_ROOT_AFTER="ABSENT"
fi
if [ "$W7_LEDGER_BEFORE" = "$W7_LEDGER_AFTER" ] && [ "$W7_HANDOFF_BEFORE" = "$W7_HANDOFF_AFTER" ] && [ "$W7_ROOT_BEFORE" = "$W7_ROOT_AFTER" ]; then
  ok W7
else
  fail W7 "production state changed during the battery -- ledger:[$W7_LEDGER_BEFORE -> $W7_LEDGER_AFTER] handoff:[$W7_HANDOFF_BEFORE -> $W7_HANDOFF_AFTER] backup-root-listing-changed=$([ "$W7_ROOT_BEFORE" = "$W7_ROOT_AFTER" ] && echo no || echo YES)"
fi

[ "$BAD" = 0 ] && echo "TEETH-ALL-OK"
exit $BAD
