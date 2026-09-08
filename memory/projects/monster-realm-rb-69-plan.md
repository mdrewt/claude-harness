# rb-69 — plan (X9-harness-spec-false-premise)

Residual `R-rb-42-X9-harness-spec-false-premise` (promoted 2026-09-07, source rb-42).
Worktree `/home/mdrewt/projects/ai-apps/claude-harness/.claude/worktrees/rb-69`, branch
`feat/rb-69-backlog-false-premise`, forked from `origin/main@bf0c4bf`.

## 0. Repo: HARNESS, not project (the launch brief mis-routed)

The brief said `REPO: project`. Wrong, mechanically: rb-69's seeded `touches:` is the placeholder
`(inherit from source slice — REVIEW)`, and `mr-repo-of` falls a non-path string through to
`project`. The residual's real target is `specs/**`, which `mr-repo-of` routes `harness`.
`mr-repo-of`'s docstring names this exact failure as its reason to exist ("an **empty-diff PR on
the wrong repo**"). Route per `mr-spawn:864`: harness worktree, harness `just ci`, PR on
`mdrewt/claude-harness`. Precedent: rb-1, 17r-d, 18r-c, rw3a, the m22–m25 ceremony slices.
Baseline `just ci` on `main@bf0c4bf` = **CI-EXIT=0** (adr-lint 12/0/0, research-lint 19/0/19,
`scripts/tests/invariants.test.mjs` = 25 pass / 0 fail).

## 1. The defect

`M-residual-backlog.spec.md:393`, inside `### rb-27`:

    Deferred with reason: no ADR number was reserved for rb-3 (the supervisor-assigned slot is empty)

MOOT since 2026-09-01, though not literally false — a distinction the post-implementation
red-team forced, and the correction matters. ADR-0208 is **rb-4's** reserved number (`**Slice:**
rb-4 … also records the rb-2 / rb-3 decisions`), and every `R-rb-3-X9` row still carries
`"adr": null`, so the reservation the premise names genuinely never happened. What is stale is the
IMPLICATION that work remains: rb-3's decision was recorded inside rb-4's ADR anyway, `R-rb-3-X9`
was adjudicated **closed** (`--force`) that day, and the supervisor's own word was "moot", never
"false". The section nonetheless still reads as launchable work. Harm on record —
`memory/projects/monster-realm-handoff.md:3642`: "will send rb-27's agent to mint a duplicate —
**fix the spec or close rb-27 before launching it.**"

## 2. Design, after the three plan lenses

Two shapes were rejected before the adopted one; both rejections are the load-bearing findings.

**REJECTED A — a ledger-driven invariant** over `mr-residuals.jsonl` + `memory/projects/gates/`.
Both are **gitignored** (`memory/projects/.gitignore:20-26`). Measured: `mr-residuals.jsonl` does
not exist in this worktree; `gates/` holds one stray. The test would go vacuously green in a clean
clone and return *different verdicts for the main checkout and a worktree at the same commit*. The
gitignore comment is also the doctrine: "The DURABLE record of a residual is its promoted spec
section, which IS tracked."

**REJECTED B — a class-wide two-sided oracle** ("heading-marker set === body-paragraph set" over
every section). Killed by the plan lenses, on measurements, not taste:
- **`/simplify` + `red-team` agree it is a tautology.** Measured: set-equality passes on the
  *unfixed* file (`{rb-44}` both sides) and on a file with the convention entirely erased (`{}`
  both sides). It contributes zero discriminating power; every mutation it "catches" is caught by
  a section-scoped assertion.
- It creates false-RED landmines on `main`: `mr-gates:1341` builds each promoted heading from a
  free-text residual title, so a future residual titled `… RESOLVED …` REDs harness CI through
  nobody's fault (red-team F1, proven); `UNRESOLVED` contains `RESOLVED`
  (inside `### rb-14`; cite the section, not the line — the retraction shifts every later line) so a naive body predicate REDs on rb-14 (reviewer B2).
- It lets a future agent **silently kill a live backlog item** by symmetrically marking it
  (red-team X9, proven GREEN).
- A class rule enforced repo-wide over a generated file with **no generator for the shape it
  enforces** would be a new decision needing an ADR — and no number is reserved.

**ADOPTED — a section-scoped, frozen-text oracle on `### rb-27` only**, appended as three tests to
the existing `scripts/tests/invariants.test.mjs`. The convention being followed is `### rb-44`
(`M-residual-backlog.spec.md:229`, `:238-246`), repaired in place 2026-09-04 — a live precedent
that predates this slice, so the shape is copied, not invented. rb-44 is **not edited** and **not
named in an assertion** (naming it would RED this test if an unrelated slice ever re-titles it).

Teeth, in order of what each buys:
1. **Frozen retraction pin** — the whitespace-collapsed retraction paragraph `assert.equal`s a
   literal typed independently in the test. This is the tooth that matters: red-team PROVED that
   a presence/needle oracle goes GREEN on an *inverted* retraction carrying every pinned token
   ("a review of ADR-0208 found it is false that any number was reserved … Build it."), on a
   fabricated date, and on a 6-word stub. Free text is not gateable; frozen text is.
2. **Cross-document ADR correspondence** — the `ADR-\d{4}` id in the retraction must equal the id
   captured from the tracked, pre-existing adjudication in `memory/projects/monster-realm-handoff*.md`
   ("rb-27 (R-rb-3-X9) SHOULD NOT BE BUILT AS SPEC'D. Its substance is already in ADR-0208 D2").
   This is the answer to the frozen pin's classic bypass — re-freezing the literal to mutated text
   now requires a second, independent document to agree. Read as the **union** of
   `monster-realm-handoff*.md` (rotation-robust), never a line number. Measured non-vacuous.
3. **Bounded window + ordering + uniqueness** — window is `[^### rb-27(?![\w.-]), next ^#{1,3} )`;
   the premise literal occurs exactly once **file-scoped**; the retraction's offset exceeds the
   premise's. (File-scoped, never repo-scoped: `monster-realm-handoff-archive-2026-09.md:21`
   quotes the literal verbatim, and this plan quotes it above.)
4. **Inert-text pins** — rb-27's window must contain no `<!--` and no fence. Red-team proved both
   hide a "retraction" from every reader while leaving raw bytes that satisfy any regex.
5. **Parser-safety pins** — the window must contain no `SHALL`, no bullet, and no line starting
   `### `/`touches:`/`EARS:`/`Tests:`, so the annotation can never inject a phantom gate into
   `mr-gates.extract_criteria` or be absorbed into `_ears_span`. Turns §4's authoring constraints
   into assertions rather than author discipline.
6. **Anti-vacuity** — `node --test` exits 0 on a file with zero tests, on a conditionally-registered
   test, and on a loop whose regex matched nothing (all three measured by red-team). So: tests are
   registered unconditionally at module top level, every count is asserted non-zero before use, the
   spec path resolves from `import.meta.url` (never cwd), and the ledger CHECKs pin `# pass N`, not
   just `# fail 0`.

## 3. What was CUT after the lenses (and why that is the right call)

- **No new test file, and NO `justfile` edit.** The reviewer found this was a **routing blocker**:
  `justfile` sits in `mr-repo-of`'s `PROJECT_PREFIXES`, tested before `HARNESS_PREFIXES`, so
  declaring it makes the slice route **MIXED**, which `mr-spawn:866` REFUSES. Appending to
  `scripts/tests/invariants.test.mjs` needs no roster edit (`scripts/` is AMBIGUOUS and inherits
  `harness`). Measured: the adopted set routes `harness`, the justfile variant routes `MIXED`.
- **No roster-drift guard** (asserting every `scripts/tests/*.test.mjs` is in `justfile:5`). It was
  circular — only needed because of the new-file choice — and red-team measured it forgeable four
  ways anyway (a `#` comment on the recipe line, a `-` line prefix that swallows the failure, a
  `.check.mjs` rename). The underlying gap is real; registered as a residual
  at slice close (see the ledger's `DEFER:` line) instead of smuggled in (`standards/principles.md`: cleanups larger
  than the current change are flagged, never ridden along).
- **No ADR.** With the class rule cut there is no new repo-wide mechanism — one pinned assertion in
  an existing invariants suite. No number is reserved, and `just adr-gate` runs
  `--strict-confirmation`. Rationale recorded in the test header comment and the PR body instead.

## 4. The three edits

1. **Heading `:389`**, title slot only (id and `(from …)` suffix untouched):
   `### rb-27 — RESOLVED, do not build (from rb-3 X9, deferred 2026-08-28)`
2. **Retraction**, appended after the `Tests:` line at `:396`, preceded by a blank line — rb-44's
   exact placement. Below `Tests:`, so it is outside `_ears_span`; no bullet, no `SHALL`; and it
   does **not** re-quote the pinned needle (quoting a uniqueness-pinned marker self-breaks the pin).
3. **`:30`** — resolve rb-69's own `touches:` placeholder to the real set.

The `Deferred with reason:` line at `:393` is **left verbatim**. It is a mechanical copy of the
residual row's `reason` (`mr-gates:1346`; measured byte-identical), and the spec's own §1 says
"promotion is a copy, not spec authoring". ADR-0223 D2's correct-in-place rule governs claims a
document makes in its own voice; quoted testimony is marked, not silently rewritten — and rb-44 set
exactly that precedent. The misleading-an-agent harm is carried by the **heading**, which is what a
scanning agent and `mr-gates.find_section` surface first.

## 5. Declared `touches:`

    specs/monster-realm-v2/M-residual-backlog.spec.md, scripts/tests/invariants.test.mjs,
    memory/projects/monster-realm-rb-69-plan.md

Routes `harness` (measured). `memory/projects/gates/rb-69.gates.md` is excluded on purpose:
`gates/` is gitignored, so it never appears in a diff and declaring it would be a false path claim.
Nothing under `projects/`. No `docs/adr/**`, no `justfile`, no CHANGELOG.

## 6. Order of work (RED before GREEN — ADR-0224)

Write and run the three tests **before** the spec edits: `node --test
scripts/tests/invariants.test.mjs` must RED. Then apply the spec hunks and re-run to GREEN. Never
reconstruct the pre-fix state with `git stash` ([[git-stash-in-diagnostic-command-wipes-worktree-impl]]).

## 7. Bite matrix (each applied singly, reverted, `git diff` verified empty between)

| # | Mutation | Must RED on |
|---|---|---|
| M1 | revert the heading title only | heading marker pin |
| M2 | delete the retraction paragraph | presence + ordering |
| M3 | copy rb-44's paragraph verbatim into rb-27 | `--slice rb-27` literal + frozen text |
| M4 | move the retraction above `Deferred with reason:` | ordering index |
| M5 | add a 2nd well-formed retraction inside `### rb-28`, leaving rb-27's intact | window bound |
| M6 | add a 2nd copy of the premise literal elsewhere in the file | file-scoped `=== 1` |
| M7 | delete the `### rb-27` section entirely | section-exists pin |
| M8 | **inverted retraction** carrying every token but affirming the premise | frozen text |
| M9 | fabricated date `2099-12-31` | frozen text |
| M10 | wrap the retraction in `<!-- -->` | inert-text pin |
| M11 | re-freeze the test literal to a mutated ADR id (`ADR-9999`) | handoff correspondence |
| M12 | add `- a SHALL bullet` inside the window | parser-safety pin |

M3, M8 and M11 are mandatory: M3 is the first cheat a red-teamer writes, M8 is the proven bypass
that defeats the slice's entire purpose, M11 is the frozen pin's own classic bypass.

## 8. Disclosed limits (stated because they are real, not to be papered over)

- The oracle cannot verify that ADR-0208 *exists* — it lives in `projects/`, a different repo the
  test is forbidden to read. What it verifies is that rb-27's retraction says exactly what the
  tracked harness-side adjudication says. That is document↔document correspondence, not ground
  truth.
- The fix does **not** mechanically prevent `mr-record queue-add --slice rb-27` (`mr-record:319-321`
  still matches `^### rb-27\b` after the retitle). It is advisory to a reader, which is the harm the
  handoff actually described.
- rb-69's own section will still read as open work after this ships; that is the standing shape of
  every delivered section and is out of criterion.

## 9. Risks

- **R1** a concurrent `mr-gates residuals promote` on `main` appends at the `:27` marker; our hunks
  are at `~:389`. Pin no line numbers and no section counts in the test.
- **R2** `just lint` shells `npx --yes @biomejs/biome@2` (network). Run `just format` first; biome
  config is single-quote / semicolons / width 100 (`templates/_base/biome.json`).
- **R3** headings use U+2014; verify regexes by bytes, not by eye.
