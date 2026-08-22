# lp-brief-cost — plan (adjudicated after planner + reviewer + red-team + /simplify)

**Slice:** delete the false premise in the brief's budget line, keep the preference.
**Tier:** routine · **ADR:** none (loop-infra) · **Gate:** `mr-selfcheck` prints `SELFCHECK-OK` (+ harness `just ci`).
**touches:** `memory/projects/mr-brief-template.md` · **touches-delta:** `mr-selfcheck` (the prescribed
gating tooth), `lp-brief-cost-teeth.sh` (the proof-of-teeth fixture, ADR-0010), this plan memo.

## Verified ground truth

- `mr-budget-config.json` sets `"costwatch_enforce": false` → MONITOR mode.
- `mr-cost-watch:552` WARN(80%) `touch`es `/tmp/mr_warn_<slice>` **unconditionally** — mechanical today.
- `mr-cost-watch:555` STOP(100%) and `:561` HARD(125% → grace/TERM/KILL) are both gated on
  `[ "$ENFORCE" = 1 ]` → today they only log `STOP-MONITOR` / `HARD-MONITOR`.
- Live proof: `COSTWATCH M21b-2 HARD-MONITOR 125% (raw $187.7660/$150) — enforce=false or log-stalled`,
  and the run continued to $274.37 (183% of cap).
- ⇒ `mr-brief-template.md:33`'s "only the 125% hard ceiling is mechanical" is false.

## EARS

- **E1** The brief SHALL NOT assert that budget is ample.
- **E2** The brief SHALL retain the distinct-lenses-over-redundant-re-runs instruction.
- **E3** The brief SHALL NOT quote an unmeasured ceiling figure.

## Final text (locked)

**L21** — replace only the trailing bold sentence of the Definition-of-done paragraph, verbatim per
`mr-implementation-plan-2026-08-15.md:347-348` (the SSOT):

    **Budget is bounded by the weekly plan allowance — prefer lenses that catch distinct defect classes over redundant re-runs; never trade a review lens for cost (D3).**

**L33**:

    **BUDGET: $<CAP_USD> for this slice — a sizing TARGET, not a hard ceiling; self-limit to it.**

**Lines 34-36 stay byte-identical.** `<CAP_USD>` survives exactly once.

### Why L33 deviates from the evidence file's longer prescription

`mr-implementation-plan-2026-08-15-evidence.json:6081` prescribes a ~380-char replacement. Three
independent lenses falsified it against the neighbouring lines:

1. **reviewer (BLOCKER)** — its clause "the only mechanical signal is the warn flag below" is a NEW
   false claim. `/tmp/mr_stop_<SLICE>` *is* mechanically armed, just not by cost: the supervisor
   `touch`es it on a rate-limit `status=="rejected"` trip
   (`mr-supervisor-prompt-native.md:118`) and `mr-launch.sh:135` gates every spawn on it. Replacing
   one false enforcement claim with another is the exact defect class this slice removes.
2. **red-team (HIGH)** — its clause "if the work is genuinely larger, keep working" contradicts
   `mr-brief-template.md:1` (outgrown scope ⇒ ship the smallest increment and park the remainder) and
   `:36` (blowing the cap parks the slice), three lines below, in the same rendered document. It also
   reads as self-assessed, unfalsifiable permission to overrun.
3. **/simplify** — 380 chars vs 102 today, on **every** rendered brief, and three of its four clauses
   restate `:25`/`:36`. The short form is 91 chars — shorter than the line it replaces.

The short form is also **enforce-mode agnostic**: `$CAP` is not the hard ceiling in either mode (armed,
the kill point is 1.25×`$CAP`), so the sentence cannot go stale when `costwatch_enforce` is flipped.
"self-limit to it" preserves the postmortem's actual ask (`mr-postmortem-2026-08-15-report.md:234`:
"self-limit") — removing the false brake without it would be a net regression.

## Gating tooth — `mr-selfcheck`, inserted after line 422

House form: bash one-liners in the `mr-feedback-doctrine` grep neighbourhood (NOT the file tail —
sibling slice `lp-06` appends there; disjoint regions ⇒ no merge conflict). `mr-selfcheck` is `set -u`
only (no `set -e`), and `MEM` (`:11`) / `BAD` (`:12`) are in scope at 422. Path is derived from the
self-locating `MEM`, never hardcoded, so a worktree copy gates that copy.

| # | kind | assertion | what its absence would let through |
|---|---|---|---|
| A1 | anchor | template exists AND contains `BUDGET: $<CAP_USD>` | `mr-spawn:263` only catches a *surviving* placeholder, never a *missing* one — dropping `<CAP_USD>` silently renders a brief with no cap. Also stops A2-A4 passing vacuously on a renamed file. |
| A2 | negative (E1) | NOT `Budget is ample` | the false premise restored |
| A3 | negative (E1) | NOT `favor thoroughness over frugality` | a partial revert that A2 alone would miss |
| A4 | negative (E3) | NOT `125%` | the ceiling figure restored |
| A5 | positive (E2) | contains `distinct defect classes over redundant re-runs` | the retained instruction silently deleted |

All `grep -qF` (fixed-string: `$`, `<`, `%` carry no regex surprises) against the **single explicit
path**. Never a derived or corpus-wide scan: the banned phrases legitimately survive in
`mr-brief-template.md.bak.v2.*`, `monster-realm-handoff-archive-2026-07.md:1061` and
`M-loop-infrastructure.spec.md:290` (which *quotes* the defect as its own justification), and would
also match this block's own comment text — the self-reference hazard `mr-selfcheck:378-382` already
documents.

### Config coupling (`costwatch_enforce`) — considered and CUT

The planner proposed asserting `costwatch_enforce` is still `false`. Cut, for three reasons:

- its only job was to protect the long L33's absolute claim; the short L33 is enforce-agnostic, so
  there is no claim left to protect;
- **red-team (HIGH)** proved the corpus's own idiom for reading that key
  (`mr-cost-watch:521`) **fails open** — malformed JSON, a missing key, and a missing file all print
  `0`, indistinguishable from a legitimate `false`. The obvious DRY implementation would have shipped
  a gate that passes on a corrupted config;
- **red-team (LOW)** it is an unguarded tripwire on the *global* merge gate: `mr-native-tick.sh:220`
  runs `mr-selfcheck` daily against the main checkout, and arming enforcement — an explicitly
  road-mapped future change — would red every harness slice's gate until someone threaded the needle.

## Proof of teeth

**Layer 1 (logic, isolated).** `sed`-EXTRACT the shipped block out of the real `mr-selfcheck` into a
throwaway `/tmp` harness with `MEM` pointed at a 2-file fixture dir — extraction, not hand-copying, so
the demo cannot drift from what ships. Do NOT copy all of `memory/projects/` and run full
`mr-selfcheck`: `HARNESS` is `dirname(dirname(MEM))`, so a `/tmp` copy reds unrelated node/settings
blocks and the signal is unreadable.

| | mutation | expect |
|---|---|---|
| M0 | unmutated fixture | PASS — guards against an always-failing tooth |
| M1 | re-insert `Budget is ample` | FAIL (A2) |
| M2 | re-insert `favor thoroughness over frugality` | FAIL (A3) |
| M3 | re-insert `only the 125% hard ceiling is mechanical` | FAIL (A4) |
| M4 | delete the retained E2 clause | FAIL (A5) |
| M5 | `rm` the fixture template | FAIL (A5; grep rc=2 leaves the `&&`-form A2-A4 inert) |
| M5b | keep the file, delete the `BUDGET: $<CAP_USD>` anchor | FAIL (A1) |
| M6 | gut the DoD sentence to unrestricted-spend language, leave a **fossil copy** of the E2 phrase elsewhere in the file | FAIL (anchored A5) |

**Layer 2 (wiring, once).** Apply M1 to the **worktree's** real template, run the real `mr-selfcheck`,
confirm the FAIL line prints and `SELFCHECK-OK` is suppressed, then `git -C <worktree> checkout --`.
Proves `BAD` is actually reached. **Never mutate the main checkout** — the live loop renders briefs
from that copy, so an injected `Budget is ample` would reach a real spawn.

**Role note (non-standard, must appear in the PR body).** The `tester` authors the tooth and the
matrix but **cannot execute either**: `.claude/hooks/guard-tester-bash.mjs:130-138` allowlists the
tester's Bash to a few syntax-check shapes, of which only `bash -n <path>` applies here. Execution of
Layers 1-2 is the specialist's; the `verifier` independently re-runs Layer 1.

## Post-implementation revision (after reviewer + red-team + /simplify on the shipped diff)

Three findings were actioned; each was a **strengthening**, never a weakening, and the gating files
were byte-identical to the RED checkpoint (`7807cb8`) before this pass:

1. **red-team HIGH — A5 went green on a fossil.** The original A5 grepped the whole file, so gutting
   the Definition-of-done sentence back to *"Spend what you judge necessary."* while leaving a stray
   copy of the phrase in an HTML comment elsewhere passed the gate. This is *subtractive* and needs no
   paraphrasing skill, so it is distinct from — and worse than — the accepted paraphrase residual, and
   is a plausible bad-merge artifact. A5 is now anchored to the Definition-of-done LINE. Proven: the
   old form PASSES that fixture, the new form FAILS it; regression-pinned as matrix case **M6**.
2. **red-team MEDIUM — the matrix was blind to gate wiring.** It sources the extracted block with its
   own fresh `BAD=0`, so a stray `BAD=0` later in `mr-selfcheck` (plausibly from sibling `lp-06`,
   which also edits this file) would silence every FAIL while `SELFCHECK-OK` still printed. Added a
   **wiring guard**: exactly one `BAD=0` initialiser must exist in `mr-selfcheck`. Proven to bite.
3. **/simplify — the fixture was committed but never run**, and dodges the `mr-*` tool glob so it was
   not even syntax-checked. `mr-selfcheck` now **invokes** it (house form, as with every `--selftest`).
   Also cut ~7 lines of comment that duplicated the plan memo and the lp-09 boilerplate six lines
   below, and cut the extraction needle loop (empirically dominated by M1-M5b).

The runaway guard earned its keep during this pass: re-anchoring A5 broke the `sed` terminator, the
guard caught the 1331-line run-to-EOF, and the gate went red rather than silently sourcing the rest of
`mr-selfcheck`. The extraction range must stop at A5 and must **not** reach the line that invokes the
fixture — `run_case` sources the block, so including it would re-enter the harness and break M0.

**Not actioned, by decision:** a single zero-width or homoglyph codepoint inside a banned phrase
defeats `grep -qF` on A2/A3/A4 while rendering identically (red-team HIGH). Unicode normalisation is
not worth building into five greps for an anti-regression pin; it is folded into the accepted residual
below rather than silently ignored. **A4's bare `125%` ban** was kept over `/simplify`'s over-breadth
objection — it is the most direct encoding of E3 — but its failure message now says to NARROW the
assertion if a legitimate unrelated `125%` ever appears, never to delete it.

## Accepted residual

**The tooth is anti-regression, not anti-paraphrase — and not anti-evasion.** Red-team demonstrated a working bypass: insert
*"On any trade-off between spend and rigor, choose rigor … do not economize on lenses to save money"*
anywhere in the template and A1-A5 all pass green while the spend-more meaning is fully restored.
The same holds for a zero-width space or a Cyrillic homoglyph inside a banned phrase: the text renders
identically and `grep -qF` misses it. Accepted for this slice — the general doctrine linter
(`mr-doctrine-lint`) is separately queued as `lp-16`, and building it here would steal that slice. **Nobody may read "A2-A4 green" as "the doctrine
is enforced."**

## Follow-up flags (outside `touches:` — do NOT touch, hand to the supervisor)

1. `memory/projects/mr-feedback-doctrine.md:120` carries the same false "only the 125% hard ceiling"
   claim. Until it is fixed, the template and the doctrine disagree.
2. `specs/monster-realm-v2/M-loop-infrastructure.spec.md:295-297` has an **inverted quote**: it says
   to *delete* the sentence that is in fact the prescribed *replacement*, and which A5 requires to be
   present. A future spec-compliance read will flag the correctly-shipped change, or "fix" the drift
   by deleting the good sentence.
3. `(D3)` in the new L21 is the template's first citation that does not resolve from the repo the
   build agent reads (it is defined at `mr-implementation-plan-2026-08-15.md:707`, "no tier demotion
   under credit pressure"). Kept verbatim here because the SSOT prescribes it literally and because
   adding textual drift would worsen flag 2. Resolve it together with flag 2.
4. `mr-selfcheck` is also declared by queued sibling `lp-06` — **serialize**. The insertion point was
   chosen (after `:422`, not the tail) so the two produce no textual conflict.

## Boy Scout: NONE

The template is executable policy, not code: every prose line is an instruction to every future run,
so a "harmless tidy" is a behavioural change with no test to catch a regression in intent. Placeholder
edits are cross-file (validated by `mr-spawn`) and therefore out of scope regardless. The cap reads as
zero, not as unused headroom.

## Tasks

1. **tester** — author the A1-A5 block at `mr-selfcheck:422` + the M0-M5b matrix script. Starts RED
   (A2/A3/A4 fire against today's template; A5 fires; A1 passes).
2. **specialist** — apply the two literal line replacements; run the real `mr-selfcheck` to
   `SELFCHECK-OK`; execute Layers 1 and 2.
3. **reviewer + red-team + /simplify** — impl review; confirm no gating assertion was weakened.
4. **verifier** — re-run Layer 1 + the full gate; assert the tests were not weakened RED→green.

Domain auditors (`reducer-security-auditor`, `desync-guard`) are **N/A**: no reducers, no schema, no
client/server determinism surface — this slice touches only harness prose and a bash gate.
