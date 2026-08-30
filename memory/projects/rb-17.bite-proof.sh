#!/usr/bin/env bash
# rb-17 mutation bite-proof (acceptance gate X5).
#
# Six mutants, each of which MUST red a DISTINGUISHABLE tag of evals/reduced-motion-purity.eval.mjs:
#   M1..M4 — the four red-team findings that survived this slice's FIRST draft. Every one of them
#            was CI-green at teeth=42/42 AND green on the independent 65-fixture probe.
#   M5/M6  — the two ESCAPES the promoted residual R-m23-s10-X20 itself names (RMCSS and RMEXT).
#            These are the slice's actual deliverable; before rb-17 both were silently green.
#
# Runs entirely inside a throwaway clone from a mktemp dir: the slice worktree is never written,
# and there is no `rm -rf` of a fixed path to get wrong. Prints ONE summary line.
set -u
WT="${1:-/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-17}"
C="$(mktemp -d /tmp/rb17-bite-XXXXXX)/c"
git clone -q --local --no-hardlinks "$WT" "$C" || { echo "RB17-BITE-ERR clone failed"; exit 1; }
git -C "$C" checkout -q slice/rb-17 || { echo "RB17-BITE-ERR checkout failed"; exit 1; }
E="$C/evals/reduced-motion-purity.eval.mjs"

verdict() {
  (cd "$C" && node -e "import('./evals/reduced-motion-purity.eval.mjs').then(m=>m.default()).then(r=>console.log(r.pass?'GREEN':('RED::'+r.detail))).catch(e=>console.log('RED::THREW '+e.message))")
}
# Which named tooth / clause tag did the mutant red? Empty means it did not red at all.
tagof() { case "$1" in *"TEETH e17"*) echo e17;; *"TEETH f9"*) echo f9;; *"TEETH f10"*) echo f10;;
  *"TEETH g8"*) echo g8;; *"[A11Y-RM2e]"*) echo RM2e;; *"[A11Y-RM2a]"*) echo RM2a;; *) echo "";; esac }

sub() { # file, python-literal old, python-literal new
  python3 - "$1" "$2" "$3" <<'PY'
import io,sys
p,old,new=sys.argv[1],sys.argv[2],sys.argv[3]
s=io.open(p,encoding='utf-8').read()
if s.count(old)!=1:
    sys.stderr.write("ANCHOR-MISS %d\n"%s.count(old)); sys.exit(2)
io.open(p,'w',encoding='utf-8').write(s.replace(old,new,1))
PY
}

BIT=0; TAGS=""; UNEXPECTED=0; APPLIED=0
probe() { # name, verdict-text
  local out="$2" tag; tag="$(tagof "$out")"
  case "$out" in GREEN) UNEXPECTED=$((UNEXPECTED+1)); echo "  $1 UNEXPECTED-GREEN";;
    *) if [ -n "$tag" ]; then BIT=$((BIT+1)); TAGS="$TAGS $tag"; echo "  $1 RED tag=$tag";
       else echo "  $1 RED but UNTAGGED: ${out:0:90}"; fi;; esac
}

base="$(verdict)"; [ "$base" = "GREEN" ] || { echo "RB17-BITE-ERR baseline not green: ${base:0:160}"; exit 1; }

# M1 — the @import refusal made case-SENSITIVE again. CSS at-keywords are ASCII case-insensitive,
# so @IMPORT is the same rule to a browser; the whole ban moves into an un-walked stylesheet.
sub "$E" "clean.slice(i, i + 7).toLowerCase() === '@import'," "clean.startsWith('@import', i)," \
  && { APPLIED=$((APPLIED+1)); probe M1-import-case "$(verdict)"; }
git -C "$C" checkout -q -- evals/reduced-motion-purity.eval.mjs

# M2 — one of the fifteen read-back tokens swapped for a harmless decoy. A length-only roster
# check keeps reporting 15 and stays green.
sub "$E" "  'transitioncancel',
]);" "  'zzHarmlessDecoyToken',
]);" && { APPLIED=$((APPLIED+1)); probe M2-token-swap "$(verdict)"; }
git -C "$C" checkout -q -- evals/reduced-motion-purity.eval.mjs

# M3 — the read-back scan stops narrowing by isCensusSource (wrong impl W8). Before the f10 tooth
# the ONLY thing catching this was an incidental comment in client/src/indexShell.test.ts.
sub "$E" "    if (!isCensusSource(rel)) continue;
" "" && { APPLIED=$((APPLIED+1)); probe M3-census-filter "$(verdict)"; }
git -C "$C" checkout -q -- evals/reduced-motion-purity.eval.mjs

# M4 — the walker follows symlinks again, so one link widens every scan driven by the roster.
sub "$E" "    if (stat.isSymbolicLink()) {" "    if (false) {" \
  && { APPLIED=$((APPLIED+1)); probe M4-symlink "$(verdict)"; }
git -C "$C" checkout -q -- evals/reduced-motion-purity.eval.mjs

# M5 — THE RMCSS ESCAPE ITSELF: a JS-readable custom property planted in the live stylesheet's
# reduced-motion block, exactly as residual R-m23-s10-RMCSS describes it.
sub "$C/client/src/styles.css" "@media (prefers-reduced-motion: reduce) {
  .hp-fill {" "@media (prefers-reduced-motion: reduce) {
  :root {
    --mr-reduce: 1;
  }
  .hp-fill {" && { APPLIED=$((APPLIED+1)); probe M5-RMCSS-escape "$(verdict)"; }
git -C "$C" checkout -q -- client/src/styles.css

# M6 — THE RMEXT ESCAPE ITSELF: a .js module under client/src reading the preference. Invisible to
# a .ts-only census; visible to the reconciled one.
printf "export const q = window.matchMedia('(prefers-reduced-motion: reduce)');\n" > "$C/client/src/rogueReader.js"
APPLIED=$((APPLIED+1)); probe M6-RMEXT-escape "$(verdict)"
rm -f "$C/client/src/rogueReader.js"

final="$(verdict)"
DISTINCT=$(echo $TAGS | tr ' ' '\n' | grep -c . )
DISTINCT=$(echo $TAGS | tr ' ' '\n' | sort -u | grep -c . )
echo "RB17-BITE-OK mutants=$APPLIED/6 bit=$BIT distinct=$DISTINCT restored=$final unexpected-green=$UNEXPECTED"
[ "$APPLIED" = 6 ] && [ "$BIT" = 6 ] && [ "$DISTINCT" = 6 ] && [ "$final" = GREEN ] && [ "$UNEXPECTED" = 0 ]
