# 15r-a2 — Scanner-audit cap: advisory, not exact-equality — PLAN

Worktree: `projects/monster-realm/.claude/worktrees/15r-a2`
Branch: `feat/15r-a2-scanner-audit-cap-advisory` (base `origin/master` = 1aa99d0)
`touches:` `evals/scanner-migration-audit.eval.mjs` (ONLY file edited)

## Measured live state at 1aa99d0
Eval PASSES. `18 gated / 10 migrated / 7 debt / 1 not-applicable`.
`KNOWN_UNMIGRATED.length === 7`, `KNOWN_UNMIGRATED_CAP === 7`.

## Blast radius (union of cbm + CodeGraph + grep)
- `validateKnownUnmigratedEntries` callers: `runProofOfTeeth` (T5 :794, T5b :817), `scannerMigrationAuditEval` (:1057). All in-file.
- `KNOWN_UNMIGRATED_CAP` textual uses (grep, authoritative — graphs reported only 2): `:805`, `:828`, `:1062`, `:1138`.
- Cross-file: `evals/trade-cap-parity.eval.mjs:95` imports `blankJsLiterals` (UNTOUCHED by this slice) and carries *comment-only* line citations (`:124`, `:246`) — verified: no assertion reads our cap. Not a hidden dependency.

## Decision (a) — Option C: `capAdvisoryNote(entryCount, cap) -> string`
Returns the detail fragment itself; `''` means silence. Placed after
`validateKnownUnmigratedEntries` (after :571). Called from the `tail` assembly
(:1149) and from teeth T10a/T10b/T10d.

```js
const capNote = capAdvisoryNote(KNOWN_UNMIGRATED.length, KNOWN_UNMIGRATED_CAP);
const tail = `${naNote}${debtNote}${capNote}${corroborationNote}${contentNote}`;
```

`tail` is appended in BOTH branches of the `detail` ternary (:1150-1153), so the
advisory is reachable on a passing run. `pass` is computed from `failures.length`
alone (:1155) and is untouched — the advisory can never fail the gate.

Rejected: Option A (widening `validateKnownUnmigratedEntries` to
`{problems, advisories}`) breaks all 3 call sites, two of which are teeth whose
job is to be a stable oracle, and puts a non-failure in a "list of REDs".
Rejected: Option B (`-> string|null`) leaves a null-check branch and makes
silence testable only as `=== null`, not as the emitted text.

Complementarity over the integers: exactly one of {failure `count > cap`,
advisory `count < cap`, silence `count === cap`} fires.

`''` rather than `' | cap-advisory: none'` (unlike sibling notes) because E2
demands SILENCE at cap — the at-cap state is the legal steady state and printing
there is permanent noise. T10b pins `=== ''` exactly.

## Decision (b) — corrected over-cap message
Predicate `>` UNCHANGED. New text reports measured numbers + a signed arithmetic
identity (`entries - cap = D`, true for any integer pair) instead of asserting a
relation as prose. Anchored by teeth on `entries - cap = 1`.

## Decision (c) — corrected `:121-123` comment
Old text was wrong twice: "eleventh" implies a cap of 10, and "EXACTLY the
number ... so the debt list can only ever shrink" is a non-sequitur (exact
equality FORBIDS shrinking). New text keys off `cap + 1` ("an EIGHTH park"), not
the live entry count, so it stays true as the four queued migration slices drive
the count 7 -> 3.

## Decision — NO new ADR
Supervisor assigned no number, and the doc-aggregation rule forbids picking one.
The rationale lives in the spec (`M-postgate-fifteenth-review-residuals.spec.md`
§15r-a2) and in `capAdvisoryNote`'s JSDoc. ADR-0186 D3's "the cap equals the
entry count (7)" is still literally true at land time; its retirement belongs to
`15r-sec-mig-d`. Disclosed in the PR body.

## Teeth (mutation matrix — every tooth has a unique kill)
| mutation | T10a (6/7) | T10b (7/7) | T10c (8/7) | T10d (adv@8/7) |
|---|---|---|---|---|
| `>` -> `>=` | survives | **KILLS** | survives | survives |
| `>` -> `!==` | **KILLS** | survives | survives | survives |
| cap check deleted | survives | survives | **KILLS** | survives |
| message reverted to "exceeding the cap of" | survives | survives | **KILLS** | survives |
| advisory `<` -> `!==` | survives | survives | survives | **KILLS** |
| advisory `<` -> `<=` | survives | **KILLS** | survives | survives |
| `capAdvisoryNote` always `''` | **KILLS** | survives | survives | survives |

Fixture numbers 6/7/8 are LITERALS on purpose — never reads of
`KNOWN_UNMIGRATED.length` / `KNOWN_UNMIGRATED_CAP`. That coupling IS the
cross-slice race this slice exists to remove.

Message anchor sets are DISJOINT (both land in the same `detail` string on a
failing run): failure carries `entries - cap = ` and never `NON-BLOCKING`;
advisory carries `NON-BLOCKING` + `N below the cap of C` and never
`entries - cap = `.

## Anti-patterns named
1. `new RegExp` / dynamic regex — Semgrep `detect-non-literal-regexp` is a hard
   remote-only gate; this slice needs ZERO regex.
2. Hazard sequences (`//`, `/*`, `*/`, `://`) written CONTIGUOUSLY in this
   file's own text — it is scanned by other repo scanners; every such sequence
   is built from `String.fromCharCode` (:197-238). Semgrep matches comments too.
3. A loose substring assertion that cannot distinguish advisory from failure.
4. Coupling the advisory or its teeth to the LIVE entry count.
5. Making the advisory reachable only when some other failure exists.
6. Renaming/re-numbering anything EXPORTED — four queued slices build against them.
7. Growing the file above :245 (line-citation neutrality, T0).

## Boy scout (RECOMMENDED, 1 hunk, 3 lines, line-count-neutral)
Header `:19-21` claims the gate "is expected to be RED at 14r-c HEAD". Measured
at 1aa99d0 it PASSES. Rewrite 3 lines -> 3 lines, carrying NO counts (counts
would re-create the staleness coupling this slice removes).

FLAGGED, NOT TOUCHED: `checkGatedFloorProblem` defined ~280 lines below first use
(hoisting); `REGEX_START_OPERATOR_CHARS` outside its section banner;
`trade-cap-parity.eval.mjs:82` off-by-one citation (OUT of `touches:`).

## Risks
- **R1 (escalate):** `15r-sec-mig-d`'s spec text enumerates the cap's uses and
  deletes the array + constant + `validateKnownUnmigratedEntries` + T5/T5b. It
  must ALSO delete `capAdvisoryNote`, its `tail` call site, and T10a-d, or the
  file throws `ReferenceError` at import. Recorded in the JSDoc and the PR body.
- R2 biome lineWidth 100 reflow; R3 Semgrep remote-only; R4 gitleaks vacuous in a
  worktree; R5 eval has NO main guard (use the `node -e` incantation);
  R6 `account-e2e` holds a global spacetime lock — `ps` before full `just ci`;
  R7 line-citation drift; R9 merge conflicts with the four migration slices are
  structurally near-zero (they edit only the array body :135-192).

## Tasks
T0 line-count-neutrality contract · T1 comment :121-123 · T2 failure message
:546-548 · T3 add `capAdvisoryNote` · T4 splice into `tail` · T5 add T10a-d ·
T6 boy scout :19-21 · T7 RED-proof teeth by mutation · T8 biome + single-eval +
full `just ci` · T9 PR-body disclosures.

---

# PLAN ADDENDUM — reconciliation of the three plan-review lenses
(reviewer + red-team + /simplify, run in parallel; this addendum SUPERSEDES the
sections above where they conflict.)

## A1. CRITICAL (red-team, MEASURED) — computed-but-unwired advisory
Red-team built a `capAdvisoryNote` that satisfies every proposed tooth while
never reaching `detail` (the `tail` splice simply omitted). Measured:
`pass=true`, `detail has NON-BLOCKING: -1`. All teeth green, gate permanently
silent. This is the 15r-sec-vis `computeViolations`/`T-VIS-WIRED` hole verbatim.

**CLOSE — two changes:**
1. Do NOT assemble `tail` with an inline template. Add a second tiny pure export
   and CALL it, so the wiring lives in executable code (visible to
   `blankJsLiterals`, which blanks template payloads and could not see it
   otherwise):
   ```js
   export function buildDetailTail(naNote, debtNote, capNote, corroborationNote, contentNote)
   ```
   Default export becomes:
   ```js
   const capNote = capAdvisoryNote(KNOWN_UNMIGRATED.length, KNOWN_UNMIGRATED_CAP);
   const tail = buildDetailTail(naNote, debtNote, capNote, corroborationNote, contentNote);
   ```
2. Add **T10-WIRED**, two sub-checks:
   - (a) `buildDetailTail('A', 'B', 'ZZ_CAP_MARKER', 'C', 'D')` must contain the
     marker AND preserve order — kills a tail assembler that drops its capNote
     argument.
   - (b) SELF-SOURCE adjacency, the file's own `checkLeg1` idiom: read this
     file, `blankJsLiterals` it, `compactWs` it, and require BOTH compacted
     needles to be present in EXECUTABLE code —
     `capAdvisoryNote(KNOWN_UNMIGRATED.length,KNOWN_UNMIGRATED_CAP)` and
     `buildDetailTail(naNote,debtNote,capNote,corroborationNote,contentNote)`.
     Blanking is what makes this sound: the needles' own string literals in this
     file blank away, so the tooth cannot satisfy itself, and a decoy in a
     comment/string cannot satisfy it either. Kills: an advisory computed from
     hardcoded values, or never called, or never spliced.
   `compactWs` is added to the existing `./rust-scan.mjs` import (additive).

## A2. MAJOR (reviewer) — "the cap is a redundant third pin" is FALSE; do not ship it
`classifyGatedFile` (:507-521) hard-codes `migrated:false` for
`CLASS_NOT_APPLICABLE`, so `migratedFileSet` (:1053) can never contain such a
file; a debt entry naming one (e.g. `box-view-privacy.eval.mjs`) passes the
membership check, never self-retires, and the `uncovered` check (:1072-1080)
only flags UNMIGRATED files that LACK cover — never EXTRA entries. So the cap is
genuinely load-bearing **as an upper bound against list-padding**.
The code decision is unchanged (keep `>`, add the advisory); only the RATIONALE
is corrected. Ship the accurate framing: *the cap is an upper bound that guards
against list-padding; what it must never become is an exact equality, because
that turns one shared line into cross-slice load-bearing state.* Flag to whoever
scopes `15r-sec-mig-d` so it does not inherit the false premise.

## A3. MAJOR (reviewer) — explicit line-count-neutrality acceptance check
`evals/trade-cap-parity.eval.mjs:82-83` and the spec itself cite
`scanner-migration-audit.eval.mjs:124`. Landing gate, not a hope:
`grep -n 'KNOWN_UNMIGRATED_CAP = 7'` must still report **124** and
`grep -n 'export function isGatedName'` must still report **245** after the edit.

## A4. /simplify cuts (accepted)
- **CUT T10d** as a separate tooth — merge its `capAdvisoryNote(8,7) === ''`
  assertion into T10c (same 8/7 fixture, second assertion).
- **CUT the `capEntries`/`runCap` helper PAIR** — one minimal local helper only.
- **SHORTEN the over-cap message** to one line, matching the file's existing
  one-sentence `problems.push` convention:
  `KNOWN_UNMIGRATED has ${entries.length} entries (cap ${cap}); entries - cap = ${entries.length - cap}`
- **SHORTEN the JSDoc** on `capAdvisoryNote` to ~1 line + a 1-line
  `15r-sec-mig-d` deletion pointer. Rationale lives in the spec, not duplicated
  in-code (comment-mass-guard hazard; drift risk).
- **KEEP** `capAdvisoryNote` as an export (only way to test E1/E2 in isolation
  without touching the live array; mirrors `validateKnownUnmigratedEntries`'s
  existing `cap` parameterization) and **KEEP** the boy-scout header fix.
- `buildDetailTail` is added AGAINST /simplify's minimalism on purpose: it is
  the 3 lines that close A1's CRITICAL. Tradeoff recorded.

## A5. Smaller findings folded in
- **red-team MED:** T10c's `entries - cap = 1` anchor alone is satisfiable by a
  message naming neither number (measured green). T10c must ALSO require the
  literal entry count and the literal cap in the message.
- **reviewer MINOR 1:** T10a must assert the advisory's CONTENT
  (`NON-BLOCKING` and `1 below the cap of 7`), never mere non-emptiness.
- **reviewer MINOR 2:** T10b asserts `problems.length === 0` (the isolated
  equivalent of "exit 0") **and** `capAdvisoryNote(7,7) === ''`. It must NOT
  assert the live run's overall `pass` — that would couple to live state.
- **reviewer MINOR 3:** one-line comment at the splice site recording that `''`
  (rather than the siblings' `'| X: none'`) is deliberate, so a future
  consistency edit does not reintroduce noise at cap.
- **red-team LOW, NOT this slice:** `validateKnownUnmigratedEntries` has no
  duplicate-entry check; the cap literal itself has no guard against being
  raised arbitrarily. Both pre-existing, both out of `touches:`. PR follow-ups.

## A6. Honest negative results (measured by red-team — do not re-litigate)
- The 7-mutation matrix is VERIFIED against real runs; no predicate mutation
  survives all teeth **once wiring is closed**.
- Cross-slice sabotage: deleting 1, 2, or 4 entries with the cap untouched keeps
  the gate GREEN with the advisory firing. **No combination REDs for doing more
  migration.**
- The teeth-coupling trap was reproduced concretely: a tooth reading the live
  constants passes at 7/7 and REDs at 6/7. The prohibition is load-bearing.
- Scanner self-hazard: this file is excluded from its own gated set (:1030) and
  from `detectContentOnlyCandidates` (:684); `capAdvisoryNote` does not match
  `STRIP_EXPORT_PREFIXES` (:598). No interaction.
