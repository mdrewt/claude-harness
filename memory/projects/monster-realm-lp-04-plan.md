# lp-04 — adjudicated plan (BINDING)

Slice: `lp-04` — `mr-audit` policy/detector split, plus the disposition check.
Spec: `specs/monster-realm-v2/M-loop-infrastructure.spec.md:224-253`.
Branch `feat/lp-04-audit-policy-detector-split`, worktree `.claude/worktrees/lp-04`, base `25111d5`.

Planner produced a draft; three independent lenses (`reviewer`, `red-team`, `/simplify`) attacked
it. They converged on four findings that **changed the design**, and the draft is superseded by the
amendments below. AM1-AM16 are binding on the tester and the implementer.

## The four design-changing findings

**F1 (all three lenses, independently). Renaming the gating verdict vocabulary strands the only
consumer, and the failure is PERMISSIVE.** `mr-audit`'s sole runtime consumer is the supervisor LLM
reading `mr-supervisor-prompt-native.md:39,:122-123` — a file OUTSIDE this slice's `touches:`. Those
lines key on the literal token `FLAGGED` and on the `gating` block. A draft that emits
`advisory: OK|REVIEW|ERROR` and never emits `FLAGGED` again leaves the supervisor seeing
`orchestration.verdict == CLEAN`, no FLAGGED anywhere, and proceeding — i.e. it deletes the
pre-merge mandatory diff read rather than reclassifying it. It would also break `mr-record`'s
`gating_test_audit` ledger column (filled from the supervisor's free-text `--gating`), the same
death `remote_red_fix_cycles` already suffered, and it invents a THIRD vocabulary against 446 rows
of history and against `mr-audit:3`'s own "treat AUDIT-ERROR as FLAGGED" convention — which
`M-loop-infrastructure.spec.md:235` explicitly requires any new rule to carry.

**F2 (`/simplify`, CUT-1; corroborated by `reviewer` M1).** The draft's bash->python whole-file
rewrite is not earning its keep. Its three stated benefits are refuted: `mr-selfcheck`'s PYHD block
(`:135-183`) already `ast.parse`s every python heredoc daily and fails loudly if it stops
(`:178-181`); heredocs in this corpus routinely define and call their own functions
(`mr-selfcheck:189-579`); and `A_ARGS` leaks only into two `git` children that ignore it. The cost
is decisive: the spec's hardest constraint (`:248`, "SHALL NOT change `:22-38`'s semantics") is
today provable by `git diff` in one second, and a whole-file rewrite destroys that free mechanical
proof and replaces it with "trust the fixtures I wrote". `reviewer` M1 adds the specific hazard:
`:21`'s SINGLE outer `try` means a `--log <directory>` (`:24` uses `os.path.exists`, not `isfile`)
raises and suppresses the ENTIRE gating half; any per-function error handling silently converts
that to `gating: CLEAN` — strictly less conservative.

**F3 (`red-team` KILL-1, proven with a working stub).** The draft's `mr-selfcheck` wiring line
`"$MEM/mr-audit" --selftest >/dev/null 2>&1 || BAD=1` has ZERO teeth, because `mr-audit` is
`rc=0` ALWAYS (`:20`) and ignores unknown flags. The red-team copied `memory/projects/` twice, wired
the line into both, and showed the gate cannot distinguish today's unmodified tool, a full
implementation, and a 10-line stub that just prints the marker. Its output diff was IDENTICAL.

**F4 (`/simplify` CUT-3, measured; `reviewer` B2/B3 and `red-team` MAJOR-4/MAJOR-8 corroborating
from the opposite direction).** The draft's closure-section/list-item/table-row/bold-span parser is
both over-built and wrong. Run faithfully against the live corpus it produces a false positive (the
`## 8. Id dispositions` TABLE HEADER row), false-positives two slice headings that merely contain
the word "parked", audits 53 ADR files as if they were specs, and is BLIND to the corpus's dominant
closure style (`**pt-c1b DELIVERED** ... **Parked -> pt-c1b2:**`). Its orphan half is structurally
INERT: real targets are backticked and punctuated (`` `13r-c-2` ``, `pt-c1b2:**`) and every one of
them fails the draft's bare-id shape test, so the draft's "predicted 0 orphans" is a vacuity
signature, not a clean corpus. `/simplify` found the signal that does all the work in ~8 lines:
**`PARKED` as a status label is always bold in this corpus; `PARKED` as prose never is.** Parity-
splitting a joined item on `**` and testing only the odd (inside-bold) segments reproduces exactly
4 findings with 0 false positives, and correctly rejects all five prose decoys with no section
scoping at all. `red-team` separately confirmed **two genuine live orphans** the draft could not
see: `pt-c1b2` and `pt-c2c` (`M-playtest-c-ux-completion.spec.md:38,:42`), each occurring exactly
once in all of `specs/` — at its own marker.

## Binding amendments

**AM1 (F2). Keep the `#!/bin/bash` + `python3 <<'PY'` shape.** No file conversion. Refactor in
place: wrap the current `:22-38` in `def audit_orchestration(a, out):` with the body BYTE-IDENTICAL
modulo indentation, and `:39-70` in `def audit_gating(a, out):` likewise. The freeze stays provable
by `git diff -w`. The bash->python house-style conversion is **parked -> lp-04e** (behaviour-neutral,
its own slice, per `standards/principles.md` bounded-Boy-Scout).

**AM2 (F2/M1). Keep the SINGLE outer `try`.** The new functions are called from inside the existing
`try` at `:21`, and the existing handler at `:71-73` is unchanged. No per-function error handling.
`--log <a directory>` must keep producing today's degraded shape: `orchestration` with ONLY
`{"verdict":"AUDIT-ERROR"}` (no `reason`/`agent_calls`/`roles`/`models`) and the gating half
carrying the exception text.

**AM3 (F1). Keep the CLEAN | FLAGGED | AUDIT-ERROR vocabulary in the gating half.** Rename the KEY
only: `out["gating"]` -> `out["gating_advisory"]`. That is the EARS "distinct field", and it gives a
reader reaching for `gating.verdict` a visible absence while keeping the token the prompt and the
ledger column key on. Add inside the block: `"advisory": true` and
`"contract": "ADVISORY EVIDENCE ONLY - never a merge predicate; evidence for an LLM diff read."`

**AM4 (F1 + `red-team` MAJOR-7). Hoist the policy signal OUT of the advisory half, to TOP LEVEL.**
New top-level keys `mandatory_read: bool` and `read_reason: [str]`. This is the policy/detector
split made structural: policy sits beside `orchestration`, evidence sits in the advisory blocks.
`mandatory_read` is true when `tier == "hard"` (reason `"hard-tier"`) OR when the advisory inputs
are unavailable (reason `"advisory-inputs-unavailable"`) — the latter carries `mr-audit:3`'s
AUDIT-ERROR-treated-as-FLAGGED convention forward, which the draft dropped: a typo'd `--repo` today
yields AUDIT-ERROR => read, and must not become a silent proceed.

**AM5 (AM4 + `reviewer` M4). Set `mandatory_read`/`read_reason` at dict-init, BEFORE the `try`** —
alongside `slice`/`tier` at `:14` — so the exception path at `:71-73` still carries them. That path
is where distinguishing a mandatory read matters most.

**AM6 (F1). DELETE the hard-tier-by-construction FLAGGED at `:58-59`.** `gating_advisory.verdict`
is computed from the mechanical tripwire counters ALONE. This is the slice's measurable change: it
removes a source that flagged 100% of hard-tier slices regardless of evidence. **Honest reporting,
required in the ADR and the PR:** the red-team measured the SURVIVING tripwire rule firing on
**12/40 (30%)** of the last 40 first-parent monster-realm commits, so "<=2 FLAGGED of the next 5
hard-tier slices" passes with p~=0.84 for this change alone and is weakly discriminating. Do not
claim more than was done. The corpus's own recorded design for the retune (per-file NET assert
delta; `mr-implementation-plan-2026-08-15-evidence.json` step S1, measured 30% -> 2.5%) with its
retrospective 44-range replay falsification is **parked -> lp-04d**; it is a distinct, separately
measurable change and folding it in here would make neither half's falsification readable.

**AM7 (`reviewer` M5). Re-gate the `test_diff_hunks` embed** at `:64-67` on
`mandatory_read or verdict != "CLEAN"`. Without this, removing the hard-tier flag also removes the
pre-filtered evidence exactly where the mandatory read still applies.

**AM8 (F4). The disposition detector is the `**`-parity rule, not a section parser.** For each
logical item (a line joined with its more-indented / non-blank continuation lines), split on `**`
and consider only the ODD-indexed (inside-bold) segments. An item is a PARK if any odd segment
matches `\bPARKED\b` case-insensitively. Report `missing_disposition` when the joined item carries
no `parked\s*(?:->|→)` marker. No closure-section detection, no table-row rules, no bold-span
window. Exclude `specs/**/adr/**` from the scan. Pin in a fixture that the whole-file greedy form
`\*\*[^*]*PARKED[^*]*\*\*` is NOT used — it spans paragraphs and false-positives.

**AM9 (F4). The orphan detector normalizes before shape-testing, and is occurrence-based.** Strip
`` ` ``, `*`, and trailing `,;:.)` from the target. Test id shape as
`^[a-z0-9]+(?:-[a-z0-9]+)+$` (lowercase, at least one hyphen) — which admits `pt-c1b2`, `lp-doc-a`,
`13r-c-2`, `15r-sec-mig-a` and correctly skips `wontfix`, `Wave`, `terminal`, `<queued`, and the
`` `-b` / `-c` `` shorthands. An id EXISTS if it occurs anywhere in the scanned corpus on a line
that is NOT itself a `parked ->` marker line; otherwise it is an `orphan_disposition`. Occurrence-
based is the literal reading of the EARS ("exists in no spec file") and is robust to heading-style
drift, which the draft's declaration-form enumeration was not.

**AM10 (F4 + `red-team` MAJOR-4c). Per-detector vacuity guards, not one whole-run guard.** If zero
`.md` files were scanned -> `AUDIT-ERROR`. If any park markers exist but ZERO id-shaped targets were
resolved -> `AUDIT-ERROR` with reason "orphan tokenizer matched nothing". A tokenizer that matched
nothing must never read as "no orphans" — that is precisely how the draft's inert detector would
have shipped green.

**AM11. The disposition block uses its OWN status vocabulary and is corpus-scoped.**
`disposition.status: OK | FINDINGS | AUDIT-ERROR` — deliberately NOT `verdict`/`FLAGGED`. Rationale
(`reviewer` M6): this is a corpus-wide backlog sweep, not a fact about the audited diff; for a
monster-realm slice `specs/` is in the harness repo and is never in `base..head` at all. Emitting
FLAGGED here would attach ~4 unactionable findings to every merge forever — the decorative-gate
failure this corpus keeps re-learning — and would also corrupt AM6's falsification, which is
measured over `gating_advisory.verdict` ONLY. The block carries `"advisory": true` and a `contract`
string naming its corpus scope explicitly.

**AM12. Specs root is SELF-LOCATED, with no override.** `dirname(realpath($0))/../../specs`, echoed
into the JSON as `specs_root`. No `--specs` flag and no env var: `mr-selfcheck:4-11` argues that an
override on a gate input is a surface for vacuously greening production. The selftest calls the
scanner function in-process on a tempdir instead. Accepted and documented consequences: run from a
worktree it audits that worktree's corpus (correct — a gate attests the corpus it ships beside);
and being a corpus check it is structurally one merge behind for the slice that introduces a park.

**AM13 (F3). The `mr-selfcheck` wiring must have teeth, and is therefore ~15 lines, not one.**
Three parts, all in `mr-selfcheck` (declared `touches-delta:`):
(a) capture stdout and require `^AUDIT-SELFTEST-OK ([0-9]+)$` with `n >= 24` — a shrinking battery
    must red; rc alone proves nothing.
(b) an EXTERNAL behavioural probe a stub cannot fake: write a synthetic log to a tempdir, run
    `mr-audit --slice mr-audit-fixture --log <tmp>`, assert `orchestration.verdict == "FLAGGED"`;
    then a second log carrying `tester` + `reviewer` roles asserting `"CLEAN"`.
(c) assert the probe left no `/tmp/mr_audit_mr-audit-fixture.json` behind, and that the selftest
    wrote no `/tmp/mr_audit_*.json` at all.

**AM14 (F3, third leg). Prove the battery CAN fail.** `--selftest` includes a negative control that
runs the battery's own comparison helper against a deliberately mismatched pair and requires it to
register a failure. Precedent: `mr-selfcheck`'s PYGUARD asserts BOTH directions
(guarded => hazard does not fire, unguarded => it does).

**AM15 (`red-team` KILL-3, reproduced live). Git fixtures build their env from an ALLOWLIST.** The
draft's scrub list omitted `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`/`GIT_OBJECT_DIRECTORY`/
`GIT_COMMON_DIR`/`GIT_NAMESPACE`/`GIT_CEILING_DIRECTORIES`; `git -C <tmp>` does NOT override
`GIT_DIR`. Following the draft literally, the red-team's PoC committed the operator's entire dirty
tree into the live harness repo (reverted). Therefore: construct `env` as a fresh dict containing
only `PATH`, a fake `HOME`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=/dev/null`,
`GIT_TERMINAL_PROMPT=0` and explicit `GIT_AUTHOR_*`/`GIT_COMMITTER_*` — never `dict(os.environ)`
plus updates. Add a hermeticity ASSERTION: `git -C d rev-parse --show-toplevel` must equal
`realpath(d)`, else fail the selftest. `git` unusable => FAIL, never skip. Use `-c
init.defaultBranch=main -c commit.gpgsign=false -c diff.renames=false` and pass SHAs from
`rev-parse`, never branch names.

**AM16 (`/simplify` SHRINK-4 + `reviewer` M11 + `red-team` MINOR-14). ONE shared fixture repo, and
watch the clock.** `mr-selfcheck` runs daily from `mr-native-tick.sh:220` under `timeout 300`, and a
timeout kill yields EMPTY output, logs nothing, and touches `.selfcheck-last` anyway — i.e. a slow
gate fails silently GREEN. Current runtime 28.8s. Build ONE temp git repo and drive every gating
fixture from different `base..head` commit pairs. Record the measured runtime delta in the ADR.

## Cuts (YAGNI — recorded so they are not re-proposed)

- **`--only policy|advisory|all`** and `only_arg_invalid`: CUT. No programmatic consumer exists and
  none is named; the EARS sentence's own second clause defines addressability as distinct fields,
  which distinct top-level keys produced by distinct functions already satisfy.
- **`audit_contract: 2`**: CUT. A schema version nothing dispatches on.
- **`dispositions_multi`, `skipped_large[]`, `scanned.closure_sections`**: CUT. `specs/` is ~116
  markdown files; there is no size cap to need a skip list, and no decision hangs on the counters.
- **`--specs`**: CUT (AM12).
- **Renaming the verdict vocabulary**: CUT (AM3/F1).

## Out of scope, parked with dispositions

- `mr-supervisor-prompt-native.md:39,:123` refresh (the stale "hard-tier is always FLAGGED"
  parenthetical and the `gating` key name) — **parked -> lp-04b**. NOT a hidden-dependency STOP
  under AM3/AM4: the FLAGGED token and the ledger column survive, and the mandatory-read signal is
  hoisted to a MORE prominent top-level key, so behaviour under the stale text stays conservative.
  It is a high-multiplier serial file the supervisor should reconcile.
- The `promoted -> <path>` / `local-only` knowledge-marker half of the same SSOT grammar
  (`docs/workflow-loops.md:35-36`) — **parked -> lp-04c**. Different location, different owner
  (doc-keeper), doubles the parser.
- The tripwire net-delta retune (S1) — **parked -> lp-04d** (AM6).
- The bash->python house-style conversion — **parked -> lp-04e** (AM1).
- `mr-slice-quality.classify_path` counts `memory/projects/mr-audit` as PROD, so this slice's
  in-file fixtures inflate `prod_lines_added` in the column lp-02 shipped one commit ago —
  **parked -> lp-02b** (widen the carve-out to any `mr-*` tool with an in-file `--selftest`).
- A structured sink for disposition findings — **parked -> lp-registry**, which owns it.
- Making either advisory half enforcing — **parked -> wontfix** (permanent spec constraint).
- Checking that the LEFT column ids of an orphan-closure TABLE exist — **parked -> wontfix**,
  refuted: an orphan-closure table is by construction full of ids that exist nowhere.
- The spec's own `M-loop-infrastructure.spec.md` closure/Tests lines — NOT edited here. That file is
  shared by every concurrent `lp-*` sibling; the closure text is handed to the supervisor in the PR
  body and the handoff instead (declared WARN, supervisor reconciles at milestone close).

## Named anti-patterns to avoid

A1 decorative/disabled gate · A2 a tooth bound to a log string instead of behaviour · A3 a selftest
asserting shape not values (lp-01's fabricated-counters cheat) · A4 a hand-maintained list that
drifts (lp-00) · A5 vacuous green when the input is missing · A6 a metric satisfied by renaming
(AM6 names this one out loud) · A7 a tooth that cannot fail (AM14) · A8 polyglot docstring
execution · **A9 (new, from `red-team` MINOR-10/`reviewer` M10): never write a line matching
`^[^\n]*python3[^\n]*<<-?'TAG'` outside a `#`-prefixed comment.** `mr-selfcheck:140-148` skips only
`#` lines, so a docstring narrating "the old `python3 <<'PY'` heredoc" reds the coverage assertion
with `py-heredoc-coverage: mr-audit has 1 opener(s) but the scanner paired 0`.

## Frozen-half divergence surface (the P battery must pin these BY VALUE)

Measured against the live tool by the red-team; each row is an input on which a plausible rewrite
diverges. `--doc-only` + MISSING log => `AUDIT-ERROR` (a hoisted doc-only short-circuit turns a
doc-only slice with zero orchestration evidence into an auto-merge — the highest-value fixture in
the battery) · `--log <a directory>` => the degraded no-`reason` shape (AM2) · `--doc-only true` =>
doc-only silently IGNORED, because `:31` tests `== "1"` · empty log => `FLAGGED`, not AUDIT-ERROR ·
role `preview` satisfies the reviewer arm via `"review" in r` · roles `contester`+`unverified` =>
CLEAN (a substring gauntlet bypass that exists today and is preserved deliberately) · one line
carrying two `"name":"Agent"` blocks => `agent_calls == 1`, because `:27` counts LINES not
occurrences · `--tier HARD` => not normalized, `a.get("tier")=="hard"` is False · `--slice` absent
=> `slice == "?"` and the artifact is `/tmp/mr_audit_?.json` · `--log ""` => `"log missing: "`,
absent `--log` => `"log missing: None"` · `json.dumps(..., indent=1)`, not 2 · the tuple
`("reviewer","verifier","review-lens")` at `:33` is fully subsumed by the substring arms and is
DEAD — keep it byte-identical anyway (AM1 forbids touching the block) and pin the equivalence.
**`argparse` is FORBIDDEN**: it exits 2 on an unknown flag, breaking the `rc=0`-always contract.

## EARS -> test map

| EARS (`:247-250`) | Encoded by |
|---|---|
| The two halves SHALL be separately addressable, advisory half to a distinct field | `S1`: `orchestration` and `gating_advisory` are distinct top-level keys produced by distinct functions; `gating_advisory.advisory is True`; `"gating" not in out`; `contract` non-empty |
| `lp-04` SHALL NOT change `:22-38`'s semantics | `P1..P12` golden battery, expected values captured from `git show <base>:memory/projects/mr-audit`, asserted as exact JSON; plus `git diff -w` on the block reviewed as evidence |
| WHEN a merged slice's closure names a parked item with no disposition marker, SHALL report it | `D1` (bold PARKED, no marker) and the live-corpus probe |
| WHEN a disposition names a spec id that exists in no spec file, SHALL report it | `D3` (orphan REDs), `D4` (resolvable id does not), `D-vacuity` (AM10) |

## Proof-of-teeth (must actually bite)

`D1` a fixture closure with a dispositionless bold park REDs · `D2` the same item with
`parked -> wontfix` passes · `D3` one naming a nonexistent spec id REDs · `D5` free-text
`parked -> Wave 6 SS7 (this spec)` passes (marker PRESENCE is mr-audit's job; marker QUALITY is the
reviewer's, per `docs/workflow-loops.md:37-39`) · `D6` the five real prose decoys copied verbatim
from the corpus must NEVER appear in `findings[]` — assert the FALSE-POSITIVE direction, not an
"exactly 4 findings" count, because prose never gets fixed whereas pinning the 4 true positives
REDs the moment someone does the right thing · `D7` the `` / `-b` / `-c` `` shorthand is NOT an
orphan · `G2` hard tier + a clean diff => `verdict CLEAN` **and** top-level `mandatory_read true`
(the falsification tooth: reinstating hard-tier-FLAGGED REDs here) · `G-error` unusable advisory
inputs => `mandatory_read true` (AM4) · `P-docexempt-requires-a-log` · `P-directory-log-shape` ·
`AM14` the battery's own can-fail control · `AM15` the hermeticity assertion · a degeneracy control
requiring >=3 distinct orchestration verdicts across the battery.

## Pre-registered acceptance (anti-tuning)

Run the disposition scanner on the live corpus once and record the findings **by file:line** in the
PR, not as a count. Expected today: the 4 `missing_disposition` `/simplify` measured, plus the 2
`orphan_disposition` the red-team measured (`pt-c1b2`, `pt-c2c`). **> 15 findings => the parse is
too loose; tighten it before merge, never mute it.** **0 `missing_disposition` => the parser is
broken.** **0 id-shaped targets resolved => AM10 must have fired.**
