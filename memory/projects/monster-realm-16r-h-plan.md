# 16r-h — Nightly red-response policy for mutation/coverage jobs (PLAN)

Branch `feat/16r-h-nightly-red-response-policy`, worktree
`projects/monster-realm/.claude/worktrees/16r-h`, from `origin/master` @ `367b3f7`.

Single seeded EARS criterion (**B1**): *WHEN a mutation or coverage nightly job goes red THE
repo SHALL contain a written policy naming the required response and its owner; WHEN the
policy file drifts from the wired workflow THE nightly-smoke-wiring eval SHALL fail (extend
its fixtures).*

## 0. Ground-truth corrections established during planning

- **`15r-tst-i` has NOT shipped.** `justfile:142` still reads `mutate-server cap="324"` — an
  absolute-count ratchet. 15r-tst-i (rate-based `missed / viable`) is a Wave-5 `blocked:`
  slice in the still-in-flight fifteenth-review milestone. **Consequence: the policy doc
  must name RECIPES, never numbers/caps/rates.** The cap is already a three-way coupled
  constant (`justfile:142` / `MUTATE_SERVER_CAP_BASELINE` / `justfileCapEqualsCeiling`); a
  fourth coupled site would be actively harmful and is what "do not duplicate the substrate"
  means operationally.
- **ADR-0079:42-45 already names the owner** and is the precedent to mirror: "Any nightly
  failure is inserted into the milestone slice queue as the NEXT slice… same tier as
  fix-red-master, below it in ordering. The supervisor picks it up as a priority target on
  the next supervision tick."
- **ADR back-links are relation-field-only** (`evals/adr-backlink-integrity.eval.mjs:11-15`
  fires on `**Amends:**` / `**Amended-by:**` only). ADR-0203 therefore ships with
  `**Amends:** —`; declaring an `Amends:` would demand a reciprocal edit in a pre-0203 ADR
  — a hidden-dependency STOP.
- `docs/adr/README.md` "Next free number" is STALE at 0184 (0202 exists). README is
  supervisor-owned and MUST NOT be touched; ADR-0203 is the number this slice takes.

## 1. The policy file

**`docs/nightly-red-response-policy.md`** — a standalone operational doc, not an ADR and not
an ADR-0079/0050 amendment. Rationale: the EARS names a *policy file* as the coupling target;
an ADR is a dated decision record, while this changes whenever a nightly job is added.
`docs/observability-dr-runbook.md` / `docs/playtest-ops.md` are the in-repo precedent for the
class.

Structure (headings are load-bearing where noted):

```
# Nightly red-response policy
## Why this exists                 (prose — 14r-a's five silent red nights; ADR-0200's
                                    notify says WHICH job, this says WHAT NEXT and WHO)
## Job response matrix             (GATED ANCHOR — exactly one, counted in RAW text)
| Job | Response | Owner | Escalation |
| --- | --- | --- | --- |
… one row per job declared in nightly.yml …
## Escalation ladder               (prose — ADR-0118 §4 re-baseline procedure, ADR-0183
                                    lockstep cap+ceiling rule, ADR-0088 kill-first rule)
## Measurement substrate           (GATED — names `just mutate-core`, `just mutate-server`,
                                    `just coverage`; states this file defines RESPONSE,
                                    never MEASUREMENT)
## This file is gated              (prose — names the eval + the two-way coupling, and the
                                    authoring constraint: no illustrative copy of the matrix)
```

Gated: the anchor heading's raw-text count, the matrix header row's raw-text count, the
separator, every row's cell count, the Job key SET, per-row Response/Owner/Escalation
content, and the `## Measurement substrate` heading + its three recipe names. Everything else
is prose. The gate proves the policy is *present, complete, attributed and non-vacuous* — not
that it is semantically wise (the same accepted limitation `jobHasFailurePolicyComment`
already concedes at `evals/nightly-smoke-wiring.eval.mjs:1933-1937`).

## 2. The owner — a closed two-member enum

```js
export const POLICY_OWNERS = ['build-loop supervisor', 'operator (Drew)'];
```

Matched by **exact array membership on the trimmed cell**, never substring. Grounding — each
owner names an actor with an already-mechanised action in this repo:

- **`build-loop supervisor`** — ADR-0079:44-45 already assigns nightly reds to it; queue
  insertion into the milestone spec is what it does every tick, unaided.
- **`operator (Drew)`** — needed because two responses are provably outside supervisor
  authority: a `mutate-server` cap re-baseline requires an ADR-0050 A2 dated amendment plus a
  lockstep cap+ceiling move (ADR-0118 §4 / ADR-0183), an operator-visible ceremony by
  construction; and a red `notify` means the loop's own feedback path is down, so only the
  human closes it. If both rows said "supervisor" the column would be a constant, and a
  constant column is a vacuous column.

An exact enum rather than "non-empty string" because non-empty passes `TBD`, `TODO`, `-`.

## 3. Drift gate — predicate contracts (all new, all pure, all `{ok, reason}`)

Reuses existing internal helpers (`declaredJobKeys`, `POLICY_ROUTING_KEYWORDS`) **without
modifying them**.

- `POLICY_DOC_PATH`, `POLICY_OWNERS`, `POLICY_MATRIX_ANCHOR = '## Job response matrix'`,
  `POLICY_MATRIX_HEADER_CELLS = ['Job','Response','Owner','Escalation']` — exported consts.

**A. `parseNightlyPolicyMatrix(docText) -> {ok, reason, rows}`** — parser lives in the eval
file (12r-b lesson). Never returns `ok:true` with empty rows. Clauses in order:
A1 exactly one RAW line equal to the anchor (**no fence stripping anywhere** — raw counting
makes the fenced-decoy false-green unreachable by construction) · A2 exactly one line in the
WHOLE doc normalising to the header cells (scan the whole document, not just the table) ·
A3 the header must sit inside the anchor's section · A4 separator: pipe-delimited, exactly 4
cells, each `/^:?-{3,}:?$/` · A5 data rows until blank/`#`; any non-pipe line inside the
section fails with its 1-based line number · A6 zero data rows = FAIL (vacuous table) ·
A7 any empty cell fails naming job+column · A8 Job cell must match ``/^`[a-z0-9-]+`$/`` ·
A9 duplicate Job key fails.

**B. `policyMatrixCoversNightlyJobs(docText, nightlyYml) -> {ok, reason}`** — parse, then
`declaredJobKeys(nightlyYml)`; **zero declared keys = FAIL** (fail-closed against an
unreadable workflow); then **EXACT SET EQUALITY** — compute `missing = declared \ rows` and
`extra = rows \ declared` and name **both** directions in the reason. Order-insensitive.

**C. `policyMatrixRowsAreSubstantive(docText) -> {ok, reason}`** — per row:
C1 Response contains one of `POLICY_ROUTING_KEYWORDS` (`next slice`/`queue`/`priority` — the
same vocabulary `adrHasFailurePolicy` and `jobHasFailurePolicyComment` accept, so the repo has
one policy vocabulary) · C2 `POLICY_OWNERS.includes(owner)` exact · C3 Escalation cites a
literal `ADR-<4 digits>`.

**D. `policyDocDeclaresMeasurementSubstrate(docText) -> {ok, reason}`** — D1 exactly one raw
`## Measurement substrate` line · D2 its section body contains all three of `just mutate-core`,
`just mutate-server`, `just coverage`. This is the anti-duplication clause: it forces the doc
to *point at* the recipes and makes it a named consumer 15r-tst-i must update, without ever
restating a number.

**E. `jobPreambleCitesPolicyDoc(yaml, jobName) -> {ok, reason}`** — the workflow→doc back-edge,
so a reader of `nightly.yml` (the artefact a red night points at) can reach the policy.
Implemented as a **separate predicate with `jobHasFailurePolicyComment` left byte-identical** —
widening a predicate whose clauses are pinned by teeth M1-M10 and ADR-0183:212 would require
re-proving all of them ("widening a gate matcher can loosen it"). Clauses: anchor at top-level
`jobs:` · find `  <jobName>:` · walk upward over contiguous 2-space `#` lines · at least one
must contain the literal `docs/nightly-red-response-policy.md`.

Driven over `declaredJobKeys(nightlyYml)`, never a hardcoded job list — a seventh job added
tomorrow REDs until it is both cited and rowed.

## 4. Where it slots in

**Checks append as 31-35** (the eval returns on FIRST failure, so appending means the new
ratchet never masks an existing wiring regression, and Checks 1-30's documented numbering —
referenced by the file header, ADR-0196:302, ADR-0183 — stays valid). There is also a hard
ordering dependency: Check 24 (`nightlyJobStructureIsUnambiguous`) must precede anything
trusting `declaredJobKeys`, because a duplicated job key makes the derived set first-wins
while GitHub is last-wins. **Record that reason in the code comment.**

- Prologue (after the `adrContent` read): read `POLICY_DOC_PATH`, loud early failure if absent.
- 31 `parseNightlyPolicyMatrix` · 32 `policyMatrixCoversNightlyJobs` ·
  33 `policyMatrixRowsAreSubstantive` · 34 `policyDocDeclaresMeasurementSubstrate` ·
  35 loop `jobPreambleCitesPolicyDoc` over `declaredJobKeys` — **with a zero-iteration guard**
  (a loop that never executes and falls through to `return {pass:true}` is the classic vacuous
  green).

**Teeth: a new `TEETH X` block** appended after `TEETH W17c`, immediately before the REAL FILE
CHECKS banner. TEETH A-W untouched. Plus a dated section in the file's header comment block
documenting 16r-h's expected-RED location and the GREEN edit.

## 5. Proof-of-teeth (negatives kill a bypass; controls prevent a false RED)

Structure/ambiguity: X1 no anchor · X2 anchor twice · **X2b anchor duplicated inside a fence**
(the fence-decoy that scored 22/22 GREEN in 12r-b) · X3 heading-only · X4 3-column header ·
X4b right count wrong names · X5 second matrix header in prose · X6 no separator · X7 2-cell
separator · X7b pipe-less separator · X8 3-cell data row · X9 empty Owner cell · X10 vacuous
table (header+separator, no rows) · X11 duplicate job row · X12 un-backticked Job cell ·
X12b garbage line between rows.

Drift both directions: **X13 workflow has 6 jobs, doc has 5** (kills doc→workflow containment)
· **X14 doc row for a job the workflow no longer declares** (kills the other direction — the
12r-b headline case) · X15 workflow with no `jobs:` anchor · X15b job key at 4-space indent.

Substance: X16 Response `under investigation` · X17 Owner `TBD` · **X18 Owner
`the build-loop supervisor and friends`** (the exact-enum proof against a substring check) ·
X18b Owner case-drift · X19 Escalation `see the ADR`.

Substrate: X20 no section · X21 section names no recipe · X21b section heading twice.

Back-edge: X22 preamble with policy prose but no path · X23 path separated by a blank line ·
X24 path at 4-space indent inside `steps:` · X25 path only in the neighbouring job's preamble
(attribution laundering) · X26 job key absent must fail loudly, not skip.

Positive controls: X1c faithful replica of the real doc + a 6-job workflow, all four
predicates ok · X2c ragged whitespace + `:---:` alignment colons · X3c an unrelated fenced
block present · X4c extra `##` sections after the matrix · X5c a row with Owner
`operator (Drew)` (proves both enum members are live) · **X6c a preamble carrying both the
existing policy phrase AND the new path line — assert `jobPreambleCitesPolicyDoc` ok AND
`jobHasFailurePolicyComment` still ok on the same fixture** (the "widening loosens" guard run
in reverse) · X7c doc rows and workflow jobs in different order.

## 6. ADR-0203 — `docs/adr/0203-nightly-red-response-policy.md`

**Decision:** The nightly red-response policy lives in one machine-checked file,
`docs/nightly-red-response-policy.md`, whose job-response matrix must be key-set-EQUAL (never
merely containment-compatible) to the workflow's derived job keys and which every job preamble
must cite back — because 14r-a's five silent red nights were not a missing *notification*
(ADR-0200 fixed that) but a missing *owner*, and a policy that lives only in comments can be
gated in one direction at best.

Also record: D1 why a `docs/` file, not an ADR amendment · D2 the two-member owner enum and its
grounding · D3 why `jobHasFailurePolicyComment` was NOT widened · D4 why the doc names recipes,
never numbers (15r-tst-i owns the substrate) · D5 why the checks append at 31-35 · D6 the
accepted limitation (a keyword gate cannot detect negated prose).

Header: `**Status:** Accepted`, `**Slice:** 16r-h`, `**Supersedes:** —`, `**Amends:** —`,
`**Subsystems:** ci-gates`. Then `just adr-digest` regen of `docs/adr/DIGEST.md`, and
`git status` to confirm `docs/adr/README.md` did NOT move.

## 7. Right-sizing

**Ships:** the policy doc · one citation comment line in each declared job's preamble in
`nightly.yml` · 5 predicates + 4 consts · TEETH X · Checks 31-35 + prologue + header-block
section · ADR-0203 · DIGEST regen · one `ARCHITECTURE.md` line.

**Parked (record in ADR-0203 Follow-ups, do not action):** extending
`jobHasFailurePolicyComment`'s guarded-job set to `smoke-republish` and `notify` — both carry
preambles today but `smoke-republish`'s reads `# Failure policy:` rather than the anchored
`` Failure policy for `smoke-republish`: `` form, so adding it would force a rewrite of prose
ADR-0079 quotes. Check 35 already gives those two jobs a policy gate by another route.
Anything touching the cap/rate substrate → 15r-tst-i.

## 8. Anti-patterns named for this slice

1. `.includes` / one-directional set comparison for the job keys — the highest-value failure
   mode; X13/X14 exist only to kill it.
2. Widening `jobHasFailurePolicyComment` instead of adding a predicate.
3. Fence-stripping anywhere in the parser.
4. A parser returning `[]` / `null` / `{ok:true, rows:[]}` on an unrecognised shape.
5. Putting a number (`324`, `96`, a rate) in the doc.
6. A zero-iteration loop in Check 35 falling through to `pass:true`.
7. Hardcoding the six job names anywhere.
8. `new RegExp` (literal regex only — three prior ReDoS/semgrep bites).
9. Inserting checks mid-sequence and renumbering 24-30.
10. Declaring `**Amends:**` on ADR-0203.
11. Touching `docs/adr/README.md` (verify with `git status`).
12. `git checkout -- <dir>` during bite-proofs (revert only the mutated path); a stray `cd`
    landing a commit on master instead of the slice worktree.
13. An illustrative copy of the matrix inside the policy doc (A2/A5 correctly fail it).

## 9. Task order

1. Predicates + consts + TEETH X + Checks 31-35 + header-block section — **one commit, teeth
   and predicates together** (teeth-before-predicates throws `ReferenceError` instead of
   returning a clean `{pass:false}`; the file header documents that hazard at `:57-59`).
2. **Commit the gate work before running any bite-proof** (a prior slice's `git checkout --
   evals/` wiped uncommitted gate clauses).
3. Author the doc + the citation lines → `node evals/run.mjs` green.
4. Mutation bite-proofs, **run by the orchestrator** (the `tester` has no Bash and cannot write
   into slice worktrees — stage via `/tmp`): delete a doc row · add a stale row · delete the
   anchor heading · duplicate the anchor inside a fence · Owner → `TBD` · delete one job's
   citation comment. Each must RED, each for its own reason. Revert only the mutated path.
5. ADR-0203 → `just adr-digest` → full `just ci` (explicit PATH export; default node is v18).

---

# ROUND 2 — plan-review deltas (reviewer + red-team + /simplify, 2026-08-23)

All three lenses ran against `origin/master` @ `367b3f7`. The red-team worked **by
construction** (a prototype of all five predicates at `/tmp/16r-h-attack/proto.mjs`, 16 crafted
fixtures) rather than by reading, and found one BLOCKER the reading lenses missed. Deltas below
are BINDING on the tester and the specialist.

## D-R1 (BLOCKER, red-team) — new clause A10: no stray pipe-table anywhere in the doc

**Measured bypass:** the real 6-row table, then a BLANK LINE, then
`(update 2026-08-20, supersedes the table above)`, then a second header row whose cells are
re-CASED (`| job | response | owner | escalation |`) plus its own separator and rows saying
`notify → ignore, self-heals / nobody / see slack`. Prototype output:
`parse: true parsed 6 rows · coverage ok · substantive ok`. A5 stops at the blank line so the
decoy is never scanned; A2's exact-cell-text match does not recognise the re-cased header as a
duplicate. The decoy is *invisible to the parser and more prominent to a human* (it says
"supersedes"), for exactly the two jobs (`mutation-server`, `notify`) this slice exists for.
This also falsifies plan anti-pattern #13 — A2/A5 only reject an EXACT-header copy.

**Clause A10:** after the recognised header/separator/data-row line indices are known, scan the
**whole document** and FAIL if any other line, once trimmed, starts with `|`. No pipe-table
content may exist outside the one recognised table. Failure reason must name the 1-based line
number and quote the offending line.

**Teeth (new, mandatory):** `X27` blank line + re-cased decoy header + decoy rows inside the
matrix section · `X27b` a decoy pipe table in a LATER `##` section · `X27c` positive control —
a doc containing a pipe character inside a normal prose sentence (not at line start) must still
PASS, so A10 is line-anchored, not a global `|` ban.

## D-R2 (MAJOR, red-team) — `jobPreambleCitesPolicyDoc` must be boundary-aware

**Measured bypasses**, both PASS against a bare `indexOf`:
`# notdocs/nightly-red-response-policy.md is unrelated, do not confuse it`, and
``# Failure policy for `mutation`: do NOT read docs/nightly-red-response-policy.md, it is stale``.

**Fix:** reject a match whose immediately-preceding character is `[A-Za-z0-9_/.-]` (a bounded
token, not a substring). The NEGATION case stays an **accepted limitation** — identical in kind
to the one `jobHasFailurePolicyComment` already concedes in-file — and must be stated in
ADR-0203, not left implicit.
**Teeth:** `X22b` the `notdocs/...` prefix decoy · `X22c` positive control — the path at the
very start of the comment body (`# docs/nightly-red-response-policy.md …`) must still PASS.

## D-R3 (MAJOR, red-team) — a cited ADR must actually exist

`ADR-9999` passes `/ADR-\d{4}/`. Add clause **C4**: `policyMatrixRowsAreSubstantive(docText,
knownAdrIds)` takes a REQUIRED `Set` of 4-digit ADR ids; every id cited in an Escalation cell
must be a member. The default export builds the set with `readdirSync('docs/adr')` filtered to
`/^\d{4}.*\.md$/`. Teeth pass an explicit set — never `undefined` (an optional argument would
reintroduce the bypass).
**Teeth:** `X19b` Escalation cites `ADR-9999` with a known-set that lacks it · `X19c` positive
control with the real id present.

## D-R4 (MINOR, reviewer) — the owner column must not degenerate to a constant

C2 is per-cell, so a matrix where all six rows say `build-loop supervisor` passes — re-creating
the unowned-job failure. Add matrix-level clause **C5:** every member of `POLICY_OWNERS` must
appear in at least one row. **Teeth:** `X17b` all-rows-same-owner must FAIL · X5c already covers
the positive control.

## D-R5 (MAJOR, reviewer) — ADR-0203 header needs `**Date:**` and `**Decision:**`

`scripts/adr-digest.mjs:40` has an EMPTY `LEGACY_TOLERANCE` set, and `validateAdr`
(`:269-316`) throws `level:'error'` on a missing `**Date:**` or `**Decision:**`.
`adr-digest-check` is wired into `just ci` (justfile:326-328), so the plan §6 header list as
originally written would have red'd CI. Both fields are now in the authored ADR.

## D-R6 (MINOR, red-team) — normalise CRLF + BOM, and say so

CRLF line endings, a trailing space on the anchor, or an ATX closing `#` each yield
`found 0 anchors` — a confusing false RED on legitimate content (all fail CLOSED, so none is a
bypass). **Fix:** the parser strips a leading BOM and normalises `\r\n` → `\n` before any
comparison; that is orthogonal to the no-fence-stripping decision. Trailing-space is handled by
comparing `trimEnd()`. A trailing-`#` heading stays a loud RED whose reason quotes the exact
required heading text. **Teeth:** `X1d` a CRLF-throughout doc must PASS.

## D-R7 (/simplify) — accepted, with one amendment

- **Un-export** `POLICY_MATRIX_ANCHOR` / `POLICY_MATRIX_HEADER_CELLS` (module-private, matching
  the existing `POLICY_ROUTING_KEYWORDS` precedent). Only `POLICY_DOC_PATH` and `POLICY_OWNERS`
  stay exported.
- **Keep the 4-column table** (merging Response+Escalation loses per-column diagnostics for no
  clause saving).
- **Keep predicate E** and all five back-edge teeth (the existing preamble gate proves a policy
  *exists*, never that a reader at the failing artefact can *find* it — 14r-a's actual defect).
- **REJECTED: cutting predicate D.** /simplify was right that D as planned was ceremony ("it
  never checks those recipes still exist in the justfile"). The fix is to make it real, not to
  delete it: **D3 (new) — every recipe name in the `## Measurement substrate` section must
  exist as a recipe declaration in the committed `justfile`** (already read by the eval; all
  three — `mutate-core:`, `mutate-server cap="324":`, `coverage:` — are present today at
  `justfile:100/142/195`). A renamed recipe now reds the doc, which is genuine drift protection
  and is what discharges the spec's "do not duplicate the substrate" instruction.
  **Teeth:** `X21c` the section names `just mutate-kore` (absent from the justfile) must FAIL.
- **Keep X7b** (pipe-less separator) despite the same-branch argument — it is a named case in
  the 12r-b lesson and costs five lines.

## D-R8 (MINOR, reviewer) — coverage is every DECLARED job, not the three the EARS names

Justified in ADR-0203 D5: a hardcoded job list is the failure mode
`nightlyJobStructureIsUnambiguous`/`nightlyNotifyIsWired` were both written to avoid.

## Accepted limitations (must appear in ADR-0203, not be left implicit)

1. Six byte-identical boilerplate rows pass every clause (C5 blocks the Owner column
   degenerating, but Response/Escalation prose may repeat). The gate proves attribution and
   format, never per-job semantic distinctness.
2. Negated citation prose ("do NOT read <path>") satisfies the back-edge check.
3. A well-formed but semantically wrong Response cell is undetectable — the same limitation
   `jobHasFailurePolicyComment` concedes at `evals/nightly-smoke-wiring.eval.mjs:1933-1937`.

## Clean axes the red-team verified BY CONSTRUCTION (do not re-litigate)

Fence-decoy anchor → RED (2 raw matches) · job renamed → RED naming both directions · job
deleted, stale row kept → RED · 7th job added → RED · zero declared keys → fails closed ·
citation laundered to a neighbouring job → RED · pseudo-header disguised as a data row → RED
via A8 · BOM and tab-separators → harmless.

## Final shape after Round 2

4 exported/…: `POLICY_DOC_PATH`, `POLICY_OWNERS` exported; anchor/header-cells module-private.
Predicates: `parseNightlyPolicyMatrix` (A1-A10), `policyMatrixCoversNightlyJobs` (B),
`policyMatrixRowsAreSubstantive` (C1-C5, takes `knownAdrIds`),
`policyDocDeclaresMeasurementSubstrate` (D1-D3, takes the justfile text),
`jobPreambleCitesPolicyDoc` (E, boundary-aware). Checks 31-35 + prologue. TEETH X, ~44 fixtures.
