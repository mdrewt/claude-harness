# rb-43 — plan memo (R-rb-26-X11-adr-readme-next-free)

Worktree: `projects/monster-realm/.claude/worktrees/rb-43`, branch `slice/rb-43`, forked from
`origin/master` @ 7bb551f. Supervisor-assigned ADR number: **None** (minting one is illegal).

## 1. The criterion

`docs/adr/README.md:16` carries a HAND-MAINTAINED `Next free number: **0184**`. The corpus on disk
runs to `0235`, so the line is 51 numbers stale, and it goes one further stale after every ADR that
lands. Lines 18-22 are a blockquote that admits this and names the sanctioned fix: *"Deriving it in
the digest generator is a known follow-up; it was out of slice 11r-d's declared `touches:` (it needs
`scripts/adr-digest.mjs`)."*

Governing rule: **ADR-0224** — prove it with an ORDINARY test (node --test), never a new
`evals/*.eval.mjs` and never a new clause in an existing one; and "never patch the scanner further".

## 2. Decision — single-source the number, do not detect its staleness

**Chosen:** the digest generator DERIVES `nextFree = max(on-disk project ADR id) + 1` and renders it
into `docs/adr/DIGEST.md`; README stops carrying a digit and points at that line.

The stale copy stops existing, so nothing needs to detect staleness. **No new gate mechanism is
required**: every ADR-adding PR already has to run `just adr-digest` (its own table row is otherwise
missing) and `evals/adr-digest.eval.mjs` TOOTH 7 already runs `--check` byte-exact against the real
corpus inside `just ci`. The next-free line rides that existing gate for free.

**Rejected — a README validator inside `scripts/adr-digest.mjs`** (parse README's claim, error if it
disagrees with the derived value): it guards a shape this slice deletes (README makes no claim
afterwards, so the branch is permanently dead), it IS "patching the scanner further" (ADR-0224:84-85),
and it would need its own fixture-tooth family. ADR-0224:136-141: uncertainty about whether a check
is worth adding resolves toward NOT adding one. The intent survives as one assertion in the ordinary
test (T7).

**Rejected — a hard `README next-free == max+1` equality gate:** it would force every future
ADR-adding PR to edit `docs/adr/README.md`, which the supervised loop forbids to every slice, making
that file a guaranteed sibling-collision point. It converts a docs nit into a standing CI trap.

**Rejected — hand-fixing README:16 to `0236`:** that is exactly the recurring chore the residual is
named for; stale again at the next merge, and satisfies no ADR-0224 test obligation.

## 3. Two doc-truth traps found while planning (in-scope, fixed here)

- `ARCHITECTURE.md:847` says "see `docs/adr/README.md` for the two-location navigation rules **+
  next-free number**" — false the moment README stops carrying it.
- `docs/adr/README.md:45-50` presents an EXHAUSTIVE two-item list of ADRs carrying `## Amendment`
  sections (0041, 0042). **17 files already carry one** (0041 0042 0050 0085 0089 0090 0129 0130
  0152 0156 0179 0180 0182 0197 0206 0222 0224) and this slice adds an 18th (0104). Rewrite it as a
  NON-enumerating sentence — expanding it to 17 items would re-create the very defect class this
  slice removes.

## 4. touches:

```
touches: scripts/adr-digest.mjs, scripts/adr-digest.test.mjs, justfile,
         docs/adr/README.md, docs/adr/DIGEST.md,
         docs/adr/0104-m-infra-d-adr-digest.md, ARCHITECTURE.md
```

Explicitly NOT touched: `evals/**` (ADR-0224), `CHANGELOG.md` (git-cliff), `.github/workflows/**`,
`.claude/**`, the harness repo, and every server/client/game-core source file.

Declared exception: the standing loop rule "do NOT touch `docs/adr/README.md` (the supervisor owns
the ADR index)" exists so parallel siblings never collide there. rb-43's entire subject IS that file
and the supervisor promoted it knowing so; no sibling slice is live (composite launch). Recorded
under `touches-delta:` in the PR body.

Out-of-repo follow-up, NOT taken (harness repo, hidden-dependency STOP): `.claude/commands/adr.md:11-16`
tells `/adr` to read AND update README's "Next free number", and `.claude/agents/doc-keeper.md:45`
forbids touching it. After this slice there is nothing to hand-update. Mitigated in-band by README
saying so; filed as a residual for the harness repo.

## 5. Implementation order

1. `scripts/adr-digest.mjs`: pure `nextFreeAdrId(adrEntries)` (`Math.max` over `Number(id)`,
   `padStart(4,'0')`, empty corpus -> `0001`); render ONE line in `generateDigest()` right after the
   "Generated from N project ADRs" line. No main-guard, no exports.
2. `just adr-digest` -> regenerate `docs/adr/DIGEST.md`.
3. `docs/adr/README.md`: :16 -> pointer at DIGEST.md (stating that the supervisor's
   `mr-state.json .adr_next_free` may be AHEAD while a number is reserved for an in-flight slice, and
   that there is nothing to hand-update here); delete :18-22; de-enumerate :45-50.
4. `ARCHITECTURE.md:847`.
5. `justfile` `test:` — add `scripts/adr-digest.test.mjs` to the existing `node --test` invocation,
   re-MEASURE the combined pass count, bump the `62` floor, generalize the two failure messages.
6. `docs/adr/0104-m-infra-d-adr-digest.md`: append `## Amendment (rb-43)` AFTER `## Consequences`.
   Self-amendment => NO `**Amends:**`/`**Amended-by:**` header field => no reciprocity obligation and
   no back-link STOP (precedent 0041/0042). `headerPreamble()` cuts at the first `\n## `, and 0104's
   first is `## Context` at :11, so an appended body section moves ZERO DIGEST bytes.

## 6. Tests (tester writes `scripts/adr-digest.test.mjs`; RED before any impl)

| id | test | wrong impl it kills |
|----|------|---------------------|
| T1 | fixture `{0100,0180,0235}` -> DIGEST contains the next-free line, `0236` | no line at all |
| T2 | fixture `{0007,0042}` -> `0043` | count+1 (`0003`); unpadded `43` |
| T3 | highest id is `Superseded`, another `Deprecated` -> still max+1 | derivation filtered to Accepted |
| T4 | single `0235` -> `0236`; EMPTY dir -> `0001` | boundary off-by-one; NaN/-Infinity |
| T5 | two corpora differing by one higher ADR render DIFFERENT lines, and `--check` against the first corpus's DIGEST exits non-zero once the higher ADR is added | a constant line; a line computed but written outside the `--check`-compared payload |
| T6 | live `docs/adr/DIGEST.md`'s number == `max(readdirSync('docs/adr'))+1` RECOMPUTED in the test | a hardcoded `0236` in the test (the bug one layer down) |
| T7 | live `docs/adr/README.md`: NO line pairs a case-insensitive `next free` with a 4-consecutive-digit run (scan EVERY line, not first-hit); README does mention `DIGEST.md` | leaving :16's `0184`; deleting the guidance entirely |

RED proof (run from the worktree, before implementation):
`node --test scripts/adr-digest.test.mjs` -> expect ALL 7 failing. A partial red means the tests are
weaker than claimed — investigate before proceeding.

GREEN ladder: `node --test scripts/adr-digest.test.mjs` -> `just adr-digest-check` ->
`node evals/run.mjs` -> `biome check .` -> `just test` -> `just ci`.

## 7. Anti-patterns (all measured in this repo)

- NO `new RegExp(...)` anywhere (Semgrep `detect-non-literal-regexp`, remote-only, has bitten 3x).
  T7's 4-digit-run predicate is a hand-rolled char-range loop or a literal regex.
- NO quoted `NNNN` arrow-pair literal in `scripts/adr-digest.mjs`, not even in a comment:
  `evals/adr-backlink-corpus.eval.mjs` T14 source-scans that file and asserts SET EQUALITY against a
  frozen 5-key baseline; one illustrative literal reds it.
- `node --test` exits 0 on a zero-test, all-`skip`, or 0-byte file. The measured pass floor in the
  `justfile` wrapper is what makes deleting the new file visible — re-measure it, do not guess.
- No hardcoded `0236` in T6. No first-hit `indexOf` in T7. No fixture monoculture in T1-T4 (vary id
  range, gaps, padding, Status).
- Presence != reachability: asserting a string appears in the generator is decoy-satisfiable. T5 is
  the reachability tooth (compare two GENERATED outputs + exercise `--check`).
- Do not change `evals/adr-digest.eval.mjs`'s pass detail string — `.claude/hooks/quiet/fixtures/
  evals-green.txt:5` pins the literal `10/10 teeth bite correctly`.
- No main-guard on `scripts/adr-digest.mjs` (a wrong guard makes `--check` a silent 0-exit no-op).
- Biome formats `.mjs`: single quotes, semicolons, 100 cols, merges same-specifier imports. Run
  `biome check .`; do not hand-format.
- Every Bash call absolute-`cd`s into the rb-43 worktree (a bare `cd` leaks into the main checkout).
  No `git checkout`/`git stash` in diagnostics. The `tester` subagent has no Bash — the orchestrator
  runs the RED.

## 8. Eval-risk audit (concrete, read from source)

- `evals/adr-digest.eval.mjs` 10 teeth: NO risk. T2/3/4/5/8/9/10 exit in `main()`'s error block
  BEFORE `generateDigest()` is reached. T1 (clean fixture, exit 0) and T6 (corrupt-then-`--check`)
  are unaffected by a longer payload. T7 (`--check` on the real corpus) reds only if the specialist
  forgets `just adr-digest` — the intended coupling.
- `evals/adr-backlink-corpus.eval.mjs`: one landmine = T14's source representation-scan (above).
  T9's tolerated-count 5 and the below-era floor read the warn summary, untouched.
- `evals/adr-backlink-integrity.eval.mjs`: no risk — an appended `## Amendment` adds no header
  relation field, so `validateBacklinks()` sees an unchanged graph; the pinned gap entries
  (0168/0166, 0172/0157, 0169/0154) are untouched.
- `evals/ci-gate-wiring.eval.mjs`: no risk from the justfile edit — `ciRecipeBodiesIntact` only
  requires the `test:` body to CONTAIN the two cargo lines; extra lines are legal, and the byte-exact
  region pin covers `a11y-e2e` only.
- Nothing else in the repo reads `DIGEST.md`'s content; no line-number citations into it exist.

## 9. Plan-review deltas (reviewer + red-team + /simplify, all three executed against the worktree)

The design survived all three lenses. Ten changes are ADOPTED; they are what the tester and
specialist must build, superseding §5-§7 where they disagree.

**D1 (red-team S1, BLOCKING as originally specced).** A line-scoped T7 predicate REDS the text this
slice intends to ship: README's next-free clause shares a hard-wrapped line with the resolution rule
`` `0001` or `0035`+ → `docs/adr/` ``. Adopted: the replacement pointer goes in **its own paragraph
with no 4-digit run anywhere in it**, and the predicate is **PARAGRAPH-scoped** (split on blank
lines), matching `next free` / `next-free` / `next_free` case-insensitively. Paragraph scope also
kills red-team's measured false negatives: a digit wrapped onto the next line (shape A) and a digit
in a table row below the phrase (shape B) are both inside the same paragraph.

**D2 (red-team S2).** T5/X3 must be ONE and-ed test with THREE legs — (a) the two corpora render
different lines, (b) `--check` on the MISMATCHED pair is non-zero, (c) `--check` on the MATCHED pair
is **zero**. Leg (c) is the only one that killed the measured `cheat1` (line spliced in at
`writeFileSync` time, outside the `--check`-compared payload). Leg (b) alone is already satisfied at
HEAD with no feature at all.

**D3 (red-team S3).** X2 must assert the **exact trimmed line text** AND that it is the line
**immediately after** the `Generated from N project ADRs` line. Measured: an HTML-comment line
(`cheat5`) and a line rendered at EOF (`cheat6`) both pass a substring/`indexOf` formulation while
being invisible or unfindable to the reader README now points at.

**D4 (red-team S4 + reviewer M4).** The new suite gets its **OWN** `node --test` invocation in the
`justfile` `test:` recipe with its own `mktemp`/`tee`/parse, an explicit `[ -f … ]` existence check
(node silently ignores a NONEXISTENT path in the argument list — measured: exit 0, empty stderr),
`fail -ne 0`, an **equality** on the pass count (not a shared floor — folding into the observability
invocation couples the two suites through one number and hides a deletion the moment the other suite
grows), and `skipped`/`todo` must be 0. The observability `62` floor is LEFT ALONE. Red-team
extracted `ops/observability/validate.test.mjs`'s `testGateResult` predicate (§E12/§E13/§E13b,
`:1519-1605`) and evaluated this exact shape against it: **legal**. `--test-name-pattern` is
**forbidden** by that predicate (a filtered run can select zero tests and exit 0) — do not use it in
the justfile. The floor's justification is `hasFloor` (`:1582-1586`), which REJECTS a `test:` wrapper
with no pass-count comparison — NOT "a meta-check that another check has not decayed", which
ADR-0224:128-136 retires by name.

**D5 (red-team S6).** The derivation must not trust an unconstrained filename namespace. Measured on
fixtures, all with a GREEN generator exit: a date-named `2026-07-13-retro.md` renders next-free
`2027`; `10000-big.md` renders `1001` — *below* the real max. Adopted: the derivation **fails loud**
when a collected id falls outside the documented project band `0001`-`0999` rather than silently
publishing a poisoned number. Verified safe: `docs/adr/` has no non-ADR digit-prefixed file, and
every eval fixture id is in the 0700-0999 bands.

**D6 (reviewer M1 + red-team S7).** `max+1` is a MEASUREMENT, not an allocation: it is non-monotone
(reverting or renaming the top ADR moves it backwards onto a retired id, with CI green), and it
cannot express a reservation (`docs/adr/0221-*.md:88` records "this ADR takes 221 per `mr-state.json
adr_next_free`" — numbers are reserved BEFORE the file exists). Adopted: the rendered line states the
highest id on disk AND the lowest unused number, and both the README pointer and the ADR-0104
amendment state plainly that it is not a reservation and that the supervisor's `adr_next_free` is
authoritative on disagreement.

**D7 (reviewer M2).** Every generate-mode spawn in the test MUST pass BOTH `--adr-dir` and `--out`
into a `mkdtemp` dir. `writeFileSync(DIGEST_PATH, …)` (`scripts/adr-digest.mjs:864`) fires whenever
`--check` is absent and `DIGEST_PATH` defaults to the REAL `docs/adr/DIGEST.md`; `test:` runs BEFORE
`eval:` in `ci:`, so a missing override would rewrite the committed digest mid-CI and mask real drift
from TOOTH 7. X5 is a pure READ of the committed file.

**D8 (reviewer M3).** `LEGACY_TOLERANCE` is empty (`scripts/adr-digest.mjs:40`), so `validateAdr`
errors on any fixture missing `Date`/`Slice`/`Supersedes`/`Amends`/`Subsystems`/`Decision` and
`main()` exits 1 at `:840` BEFORE `generateDigest()` is reached. Fixtures must carry canonical
headers, a `Superseded` fixture needs a real in-dir `**Superseded-by:**` target, and the RED proof
must assert on the ABSENT-LINE reason, not merely on a non-zero exit.

**D9 (red-team S8).** X5 must recompute with a deliberately STRICTER rule than the implementation
(`^\d{4}-` plus an assertion that the value is `< 1000`), so it disagrees with the impl when the
impl's namespace is poisoned. A test that re-implements `collectAdrIds`'s filter is a tautology.

**D10 (/simplify).** `docs/adr/README.md:45-50`'s "one thing it does not render either" list (2 items
named, 17 files actually carrying `## Amendment`) is a SECOND, independent hand-maintained-enumeration
defect that predates rb-43 and is NOT entailed by the criterion. It is fixed here only because this
slice holds the rare write-exception on a supervisor-owned file — so it is attributed under
**`boyscout-delta:`** in the PR body, NOT folded into the X11 closure narrative, and it is explicitly
NOT covered by any gate. Same for `ARCHITECTURE.md:850`'s "drift-gated by `just adr-digest`" (the
regenerator is not the gate; the gate is `just ci` → `just eval` → TOOTH 7's `--check`).

**Also adopted, minor:** `ARCHITECTURE.md:847` is REPOINTED at `DIGEST.md`, not deleted (reviewer m8).
The README replacement sentence must keep `docs/adr/0060-*.md:22`'s inbound pointer ("see
`docs/adr/README.md` for the current next-free number") TRUE by still answering it — otherwise 0060
joins `touches:`. `docs/adr/0166-*.md:234` cites `README.md:16` by line number and survives only if
the replacement sentence stays at :15-16. The 0104 amendment cites the two escalations that recorded
this defect as OPEN (`docs/adr/0202-*.md:314`, `docs/adr/0223-*.md:169`) so the trail closes; those
files are append-only historical record and are NOT edited. A 5-digit-overflow note (reviewer m7) is
subsumed by D5's band guard.

**Eval-risk audit addendum:** a FIFTH gate reads the real `justfile test:` recipe —
`ops/observability/validate.test.mjs` §E12/§E13/§E13b — and a SECOND independent instance of the
real-corpus `--check` exists at `evals/adr-backlink-corpus.eval.mjs:1533-1547` (T9a). A stale derived
line therefore reds CI twice. Red-team applied the whole change end-to-end in a scratch copy: for
the honest implementation, `adr-digest` 10/10, `adr-backlink-corpus` 4/4, `adr-backlink-integrity`
30/30, `ci-gate-wiring` 15/15 all PASS, and `--check` is clean. The T14 landmine is confirmed real
and precise: a quote + exactly 10 chars (4 digits, an arrow, 4 digits) + the same quote, anywhere in
`scripts/adr-digest.mjs` INCLUDING a comment, reds it.

**Baseline measured at the fork (7bb551f, in this worktree, after `npm ci` in `client/`):**
`just eval` rc=0 with 99 `eval PASS` lines; `node --test ops/observability/validate.test.mjs` =
62 pass / 0 fail / 0 skipped / 0 todo; `just adr-digest-check` = `DIGEST.md is up-to-date (no drift).`

## 10. Test-review deltas (reviewer + red-team on `scripts/adr-digest.test.mjs`)

MEASURED RED of the first draft: 0 pass / 6 fail, each for its intended reason, `docs/adr/DIGEST.md`
sha256 unchanged. Then two lenses ran against the suite itself.

**The red-team built TEN wrong implementations that passed the first draft 6/6** (each executed in a
scratch copy under `/tmp/rb43rt/`, with the test file copied in byte-identical and the honest
reference build at 6/6): a README reworded so the digit survives without the phrase; the
`Next available number:` synonym; the README clause DELETED rather than moved (the pre-existing
catalog paragraph already satisfied `readme.includes('DIGEST.md')`); a hard-wrapped `next\nfree`
defeating the phrase match; a band guard wrapped in `if (!checkMode)` — the dangerous half, since
`just ci` reaches the script ONLY through `adr-digest-check`; a band guard checking only the derived
number instead of each collected id (both original poison corpora had the out-of-band id as the max);
a band guard placed AFTER `writeFileSync` (clobbers the committed digest, then exits 1); a line
spliced at write time AND stripped from `committed` before the compare (passes a clean round-trip);
a 4-space-indented line (a CommonMark code block, invisible as prose); an unbalanced `<!--` HTML
block swallowing the whole header region; and a second, contradictory hand-maintained number
elsewhere in the digest. All ten are closed by the revised suite (legs listed in the ledger).

**Wording (both lenses, independently).** The first template said "the lowest unused id". Measured on
the live corpus: max on disk 235 → 236, but the LOWEST UNUSED id is `0002` (the `0002`-`0034` block
lives in the harness spec corpus) and `0102` is missing as well — the sentence was off by 234, in the
file whose own subtitle is "Agent entry point: scan this file first". It now reads "the highest id on
disk (`MMMM`) plus one", says gaps are never reused and why, and replaces the unverifiable
"never hand-maintained" with the checkable "regenerated by `just adr-digest` and drift-gated by
`just ci`". Empty corpus swaps the whole first clause, not just a parenthetical.

**False-RED risk on the README replacement text: SETTLED EMPIRICALLY.** The red-team wrote the real
replacement paragraph and ran the unmodified X6 against it — green, 0 violations. Four authoring
variants RED and are traps for the specialist: putting the clause in the SAME paragraph as the
`0001`/`0035` resolution rule; authoring it as a fourth bullet of the two-location list (README:5-13
is one paragraph, no blank lines); naming the band `0001`-`0999` in the clause; and citing an ADR
number inside the clause. The clause must be its own blank-line-separated, digit-free paragraph.

**Safety re-measured:** an instrumented generator logged every `writeFileSync` target across a full
RED run and a full GREEN run — 0 writes into the repo `docs/adr/`, 0 leaked temp dirs, `docs/adr`
tree hash unchanged in both. One comment in the suite was WRONG and is corrected: `--adr-dir`, not
`--out`, is the flag that keeps a generate-mode spawn away from the committed digest (`DIGEST_PATH`
defaults to `join(ADR_DIR, 'DIGEST.md')`, `scripts/adr-digest.mjs:109`).

**Historical citations that drift by a line or two and are deliberately NOT edited** (append-only ADR
record, all outside `touches:`): `docs/adr/0166-*.md:234` (records this exact defect as R8, "the ADR
index is supervisor-owned", citing `README.md:16`), `docs/adr/0202-*.md:314`, `docs/adr/0223-*.md:169`,
`docs/adr/0185-*.md:307`. `docs/adr/0060-*.md:22` points at README for the number and is kept TRUE by
the replacement paragraph still answering it — that is what X6's "exactly one paragraph mentions
next-free AND names DIGEST.md" leg protects.
