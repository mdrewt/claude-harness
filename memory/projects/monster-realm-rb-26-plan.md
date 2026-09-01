# rb-26 plan — R-rb-2-X9 stale typeof-inference consumer prose + ADR-0223

Base: origin/master 11cac7e. Worktree `.claude/worktrees/rb-26`, branch `fix/rb-26-x9-stale-typeof-refs`.
Assigned ADR number: 223. Slice is PROSE + ADR + one additive eval tooth. Zero production code.

## Verified findings that reframe the launch brief (all independently checked)

1. **Consumers 1 and 2 are ALREADY FIXED** by rb-4 / PR #380 / commit 4b43dd9.
   - `evals/rekey-contract-surface.eval.mjs:41-48` already carries past-tense framing + `ADR-0208 D1`.
   - `server-module/src/accounts_tests.rs:3991-3996` likewise.
   => ZERO prose edits needed in either. (Confirmed with `git log -L` on both regions.)

2. **ADR-0208 ALREADY RECORDS both (a) and (b)** the brief asks ADR-0223 to cover.
   - Title names "an explicit policy discriminator, an own-property boundary".
   - `**Slice:**` line: "also records the rb-2 / rb-3 decisions both sibling ledgers deferred to this ADR".
   - D1 (:97) = rb-2 discriminator. D2 (:111) = rb-3 own-property boundary AND the FG72c
     `Object.prototype` write-hygiene rationale verbatim. References cite PR #378 and #379.
   - Corroborated twice in harness memory: `monster-realm-rb-4-plan.md:65` and
     `monster-realm-handoff.md:2336` both say "R-rb-2-X9 and R-rb-3-X9 can be closed against PR #380".
   => The residual's premise ("no ADR number was ever reserved") is FALSE. R-rb-2-X9 was simply
      never closed administratively, so the supervisor promoted a stale residual.

3. **ADR-0179 has NO stale typeof text.** The brief's `0179:708-710` citation is a misattribution;
   the real "add a *string* key" instruction is `ADR-0207:109`. `0179:705-713` is mechanism-agnostic
   and true today. => ZERO edits to 0179. Do not manufacture one; `0179:712-713` deliberately records
   that this file carries no mechanical doc-tie.

4. **The brief's "back-pointers to ADR-0222" is also a misattribution.** ADR-0222 is rb-25's
   needle<->key correspondence. The correct back-pointer target is ADR-0208 D1/D2.

5. **`ADR-0207:109`'s obligation is already DISCHARGED** — rb-24 / ADR-0221 shipped
   `AccountDeletionReaperSchedule` and its manifest entry, in the OBJECT form
   (`accounts_tests.rs:4018-4019`, "rb-24 adds account_deletion_reaper_schedule.account_identity for 25").

6. **`:19` and `:158` name `[G6/consumed]` CORRECTLY for their era.** `[G6/policy]` did not exist
   until rb-2 created it (ADR-0208:30-34 confirms the pre-rb-2 failure surfaced at `[G6/consumed]`).
   Renaming the clause would falsify the historical record — the same defect from the other direction.

7. **Precedent found: `docs/adr/0202-obsolete-residual-prose-corrected.md`** — an Accepted ADR whose
   whole decision is prose correction + doc routing. Supplies the `**[<STATE> — ...]**` mark convention
   (D2, four-value set: CLOSED / PARTLY CLOSED / STILL OPEN / RETIRED), the in-place-rewrite rule for a
   live instruction (D6), and a pre-measured mention-vs-use census trap (11 hits at HEAD).

8. **ORACLE PROBED AND CONFIRMED (gating unknown, resolved).**
   `checkRekeyCompleteness(treeSrcs, accountsSrc, manifest = REKEY_MANIFEST)` is ALREADY exported from
   `evals/guest-claim-integrity.eval.mjs:2727` with an injectable manifest. Measured live:
   - STRING entry  -> returns (no throw) a string containing `[G6/policy]` and
     `is of type string, not an object`.
   - OBJECT control -> returns a string containing NO `[G6/policy]`.
   => the retirement can be EXECUTED as an oracle with ZERO changes to guest-claim-integrity.eval.mjs.

## The work (one coherent mergeable increment)

- **A. ADR-0207, four regions.** End-of-line appends + one in-place rewrite; ZERO whole-line deletions,
  ZERO line inserts (so nothing below moves).
  - `:8` header: `**Amended-by:** 0221` -> `0221, 0223` (in place).
  - `:19`  preserve verbatim + end-of-line `**[RETIRED — ...; recorded by ADR-0223]**`. Keep `[G6/consumed]`.
  - `:109` IN-PLACE REWRITE: `its ``REKEY_MANIFEST`` string key` -> the object-entry form + ADR-0208 D1 +
    "a string entry now reds `[G6/policy]`" + the rb-24/ADR-0221 discharge note. Keep `T3/[G6/declared]`.
  - `:113` preserve + end-of-line RETIRED mark stating the inversion explicitly.
  - `:158` preserve + end-of-line RETIRED mark. Do NOT rename `[G6/consumed]`.
- **B. `docs/adr/0223-*.md`** — a CORPUS-INTEGRITY decision, NOT a second technical record.
  `**Amends:** ADR-0207` ONLY (never 0208 — reciprocity would force an out-of-touches header edit).
  Cites 0208 in body/References. `**Extends:** ADR-0208` (free — only Amends/Amended-by are reciprocal).
  D1 one-home · D2 the 0207 corrections · D3 the annotation form · D4 rb-27's disposition ·
  D5 the ADR-0179 reconciliation (why this doc-tie does not contradict 0179:712-713).
  Decision line <=240 chars.
- **C. ARCHITECTURE.md** — two in-place parentheticals: the rb-2 paragraph (:112) and rb-3 paragraph
  (:136) are the ONLY two in that run with no ADR citation. Add `(ADR-0208 D1)` / `(ADR-0208 D2)`.
  Zero lines added. Plausibly WHY the false premise survived.
- **D. Proof of teeth: additive `T4` tooth in `evals/rekey-contract-surface.eval.mjs`** (in touches;
  the seam-freeze eval for this exact contract). T1/T2/T3 byte-unchanged; T4 appended to `results`.
  - `[T4/live-oracle]` executes the retirement (string entry REDs `[G6/policy]`) + object positive control.
  - `[T4/anchor]`   each 0207 region anchored by a mechanism-free substring occurring EXACTLY once
                    (throw on 0 AND on >1 — first-hit anchors are forgeable).
  - `[T4/instruction]` D5 region contains ZERO string-key-instruction shapes and >=1 object-entry statement.
  - `[T4/escort]`   `:19`/`:113`/`:158`: if the retired phrase is present it must be escorted ON THE SAME
                    LINE by a RETIRED mark AND `ADR-0208`.
  - `[T4/arch]`     ARCHITECTURE.md rb-2 + rb-3 paragraphs both cite ADR-0208.
- **E. Probes (harness repo, not project touches):** `rb-26.doc-tie-probe.mjs` (per-mutant tag pin),
  `rb-26.scope-probe.mjs` (pinned base SHA 11cac7e, never a ref).

## Anti-patterns (priority order)
1. Do NOT restate ADR-0208 D1/D2 technical content in ADR-0223 (the exact SSOT violation this slice fixes).
2. Do NOT rename `[G6/consumed]` at :19/:158 — correct for its era.
3. Do NOT write a `docs/adr/`-wide phrase census — guaranteed non-zero at HEAD (ADR-0208:31) and 0223 adds hits.
4. Do NOT add a new `evals/*.eval.mjs` (auto-discovery + outside touches).
5. Do NOT insert lines above any existing ADR-0207 line.
6. Do NOT touch `docs/adr/README.md` or `CHANGELOG.md`.
7. Do NOT invent a fifth `<STATE>` value for ADR-0202 D2's mark set.

## Trap defences (each maps to a measured memory card)
- No `new RegExp` (Semgrep `detect-non-literal-regexp` is a CI gate) — `String.indexOf`/`split` only.
- Needles contain backticks -> build from concatenated single-quoted pieces / `String.fromCharCode(0x60)`,
  never inside a template literal (stray backtick silently terminates it).
- Strip `<!-- ... -->` before any markdown count.
- Every count in T4's note DERIVED from the run; the existing `(3 teeth verified)` literal must become derived.
- Self-source uniqueness assert on the T4 success fragment; it must appear in NO failure string.
- Commit gate work BEFORE mutation probing (bite-proof revert destroys uncommitted gate work).

## Hidden-dependency STOPs (surface, do not widen into)
- S1 `**Amends:** ADR-0208` would force a header edit to 0208 (outside touches) -> use Amends: 0207 only.
- S2 `specs/monster-realm-v2/M-residual-backlog.spec.md:65/:73` carry the false premise for rb-26 AND
     rb-27. Harness repo, supervisor-owned generator output -> ESCALATE + DEFER, do not edit.
- S3 RESOLVED by probe (oracle returns, does not throw).
- S4 PostToolUse format hook runs unpinned `npx biome` -> run `just lint` right after the eval edit.
- S5 `just ci` runs account-e2e which holds a global spacetime lock -> check `ps` before blaming the diff.

## DEFERs to author (4)
- general retired-mechanism prose detector across `docs/adr/` -> backlog (ADR-0202 measured 11 mention-not-use hits)
- R-rb-3-X9 (FG72c write hygiene) -> rb-27 (substance already at ADR-0208 D2; honest exit = close-as-already-recorded)
- the false "no ADR number was reserved" premise in M-residual-backlog.spec.md:65/:73 -> backlog (escalate)
- docs/adr/README.md stale next-free-number -> backlog (forbidden file)

---

# PLAN REVIEW OUTCOME (reviewer + red-team + /simplify, all three closed)

## Corrections to the plan itself
- **Citation fix (reviewer, minor):** "no ADR number was ever reserved" is `M-residual-backlog.spec.md:65`
  and belongs to **R-rb-3-X9 (rb-27's residual)**, NOT R-rb-2-X9. rb-26's own defer reason is `:73`
  ("the corrections are doc/comment-only edits in four files OUTSIDE the declared touches").
  The conclusion (ADR-0208 already owns the content) is independently correct — proven by reading 0208.
- Baseline measured in the worktree: `just lint` exit 0; `node evals/run.mjs` = **99 PASS / 0 FAIL**
  (a fresh worktree has NO `client/node_modules`; without `npm ci` in `client/`, `account-e2e` FAILs
  with a `tsresolve.mjs` error that reads like a real red. Install deps first.)
- Remote master CI confirmed **green** at 11cac7e — master is not red, slice scope stands.

## CUT: `[T4/live-oracle]` — all three lenses agreed; red-team PROVED it
`checkRekeyCompleteness([], '', {...})` returns `[G6/policy]` for a string entry and no `[G6/policy]`
for an object entry **regardless of any file this slice touches**. It tests rb-2/rb-3/rb-4 code already
covered by FG50-FG72 inside guest-claim-integrity.eval.mjs. As a STANDING tooth it is theatre w.r.t.
this slice's RED->GREEN contract. **Demoted to a one-time corroborating probe** (it justifies the
prose correction; it does not prove the correction landed).

## KEEP `[T4/arch]` — but paragraph-scoped. Red-team PROVED the naive form is already-true.
`ARCHITECTURE.md` ALREADY contains `ADR-0208` at `:147` (rb-4 para) and `:187` — so a whole-file
`includes('ADR-0208')` check is TRUE TODAY, before any edit, and stays true forever.
Hardening: locate the rb-2 / rb-3 paragraphs by their own unique `**rb-2**` / `**rb-3**` bold markers,
slice to the NEXT `**rb-N**` marker, assert `ADR-0208` inside that slice only. Fail loud if a marker
is missing or non-unique. (Noted: no other eval gates ARCHITECTURE.md — new precedent, cheap, and the
alternative is an entirely ungated edit.)

## `[T4/anchor]` — anchor the D5 region on the HEADING, never on rewritten prose
Measured occurrence counts in 0207 today (red-team):
  1x `JS \`REKEY_MANIFEST\` object entries`   -> good anchor for :19
  1x `the parked R-m22-s0-X1 trap`            -> good anchor for :113
  1x `Why not the JS path:`                   -> good anchor for :158
  1x `### D5`                                 -> good anchor for :109, SURVIVES the rewrite
  1x `\`REKEY_MANIFEST\` string key`          -> UNIQUE NOW but the rewrite DELETES it. NEVER use it
                                                 as the D5 locator: a correct "throw on 0" anchor
                                                 would then FAIL after the legitimate fix (own-goal).
  3x `R-m22-s0-X1`, 2x `accounts.rs\` manifest region only` -> NOT usable, they collide.
Every anchor: count occurrences, throw on 0 AND on >1. Unconditional — never `if (idx !== -1)` first.

## `[T4/escort]` — SAME-LINE, derived from the anchor's line index
Red-team: implementing it as three whole-file `includes()` checks (the shape ADR-0202 D2's own
corpus-wide grep sanctions) lets ONE genuine mark anywhere satisfy escort for all three regions.
Hardening: derive the line via `lastIndexOf('\n', anchorIdx)` / `indexOf('\n', anchorIdx)` — NEVER a
literal line number (the tooth outlives this slice; a later amendment above :19 would mis-target it).
Check that ONE line contains BOTH the exact ADR-0202 D2 mark prefix AND `ADR-0208`. Pin the exact mark
shape, not loose word presence (else `<!-- RETIRED ADR-0208 -->` on the line satisfies it).
Deletion interlock verified sound: deleting the retired phrase reds `[T4/anchor]`'s unconditional
zero-check, so escort may be vacuous on absence by design.

## `[T4/instruction]` — closed diff-based, NOT a semantic blacklist
Red-team: "zero string-key-instruction shapes" is an unclosable blacklist, AND the plan's own required
fixed text ("a string entry now reds `[G6/policy]`") contains `string`+`entry` — a blind ban would make
the tooth PERMANENTLY UNSATISFIABLE after the correct fix (a self-red gate).
Hardening, two halves, both closed:
  (a) POSITIVE: the D5 region must contain `ADR-0208 D1` and an object-shape marker (`policy:`).
  (b) NEGATIVE: the EXACT literal pre-fix sentence fragment occurs exactly 0 times.
This turns an open-ended semantic detector into a tractable diff-based one.

## T4 must ACCUMULATE, not early-return
T1/T2 accumulate via `failures.push`; T3 early-returns. If T4 early-returns, a first-clause bug masks
whether the other clauses are load-bearing (shadowed-tooth trap). Write T4 in the accumulate style AND
run the RED proof once PER SUB-CLAUSE IN ISOLATION, not only against a full revert.

## Other required fixes
- `evals/rekey-contract-surface.eval.mjs:752` `(3 teeth verified)` is a hardcoded literal over a
  length-3 `results` array -> derive from `results.length` (never a hand-incremented counter).
- Extend the eval's header comment block to document T4 in the same style as T1/T2/T3 (reviewer Major #2).
- ADR-0223: FOLD "Considered alternatives" into the D-point prose (neither ADR-0202 (338 lines) nor
  ADR-0222 (137 lines) uses a discrete section). COLLAPSE D3 to one sentence citing ADR-0202 D2.
  Target well under 137 lines. `Amends: ADR-0207` + `Extends: ADR-0208` both have direct precedent
  (ADR-0221 and ADR-0222 respectively).
- Acceptance gates: collapse from 8 toward ~5 distinct observable outcomes (lint-clean and
  eval-suite-green are sub-facts of one `just ci`, not separate gates).

## Red-team bottom line (the bypass this design exists to kill)
With `[T4/arch]` and `[T4/escort]` implemented in their natural whole-file form, the slice could ship
with docs/adr/0207-*.md and ARCHITECTURE.md COMPLETELY UNEDITED, T4 green, CI green. The whole tooth's
integrity rests on getting the SCOPE BOUNDARY right on exactly those two clauses.
