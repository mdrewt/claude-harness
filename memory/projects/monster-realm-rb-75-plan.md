# rb-75 plan — annotate five measured `ADR next-free` anomalies in ARCHITECTURE.md (R-18r-b-LOGORDER)

Worktree: `projects/monster-realm/.claude/worktrees/rb-75` (branch `feat/rb-75-archlog-nextfree-notes`, base efcc457).
touches (inherited from 18r-b): `docs/adr/0231-*.md, sim-harness/src/bin/mr_load_driver.rs, ARCHITECTURE.md, AGENTS.md`.
Files this slice edits: `ARCHITECTURE.md`, `sim-harness/src/bin/mr_load_driver.rs`. No ADR (none reserved; rb-71/72/74 precedent — ruling recorded in the ARCHITECTURE.md entry). CHANGELOG.md not hand-edited.

## Measured facts (git-verified 2026-09-11; the residual's line numbers drifted +62 since 18r-b)
Note sequence in file order (line = numeral): 1564 `**11r-c**`=0169 → 1599 uxd2=0162 → 1601 uxd3-a=0163 → 1603 uxd3-b=0164 → 1784 `**M14.5b**`=0100 → …
- **P1** `**11r-c**` :1551-1564 (=0169, PR #274, merged 2026-07-31, ADR-0168) is the FIRST note in the file and sits in the M8-M12 subsystem section above `## M14` (:1711), because 11r-c amends the M11 movement lock. The residual's "1502 vs 1722" (= :1564 vs :1784 `**M14.5b**`=0100 — that note was written by 95d3c30 PR #151 M14.5c 2026-07-13, not by #149) are NOT adjacent notes — three notes (0162–0164) lie between. **CORRECTION to the residual text**: register `R-rb75-RESIDUALTEXT` (harness repo).
- **P2** :1930 `**11r-h**`=0173 (PR #276, 2026-08-01, minted ADR-0172) immediately followed by :1932 `**11r-f**`=0172 (PR #277, 2026-08-01, minted the PRE-RESERVED ADR-0171). 11r-f computed 0171+1 before 11r-h consumed 0172; 11r-f merged after 11r-h. Adjacent entries.
- **P3** :2208 `**rb-17**`=0218 (PR #393, 2026-08-30) immediately followed by :2210 `**rb-15**`=0217 (PR #391, 2026-08-30). rb-17 merged AFTER rb-15 but its entry was inserted ABOVE rb-15's. Adjacent entries.
- **M15a** :1806-1816 (=0107): added PR #165 `c5fddc4` 2026-07-13 as "PR TBD) in-progress"; rewritten next day by PR #168 `a20507a` (M15b, 2026-07-14) to "PR #165 merged) complete". Numeral unchanged.
- **ux2** :1922 (=0155): added PR #255 `f8f50cb` 2026-07-25; rewritten by PR #273 `9c1f75e` (11r-e = ux2b, 2026-08-01) adding the "DISCHARGED by ux2b — ADR-0169" clause. Numeral unchanged.
- Three further non-monotonic note pairs exist (:1564→:1599, :1603→:1784, :1904 `15r-sec-a`=0199 → :1918 `ux1`=0152). NOT annotated — annotating the class is what 18r-b cut. Register `R-rb75-MOREPAIRS`.
- Entries :2216/:2218/:2220 contain the token twice (prose quote + trailing note): the parser takes the LAST match per entry.
- `mr_load_driver.rs:76-89` is cited by range from `docs/adr/0232-*.md:52` and `docs/adr/0245-*.md:13,144` → the test module is appended at EOF (after :7020), nothing above shifts.

## 1. Doc edits (ARCHITECTURE.md) — bracket appended on the same line, right after the entry's trailing note; historical numerals byte-preserved; NO sentence states a rule over the class
- **11r-c :1564** after `= 0169.`: `[rb-75: 0169 is 11r-c's own value (PR #274, merged 2026-07-31); this is the first next-free note in this file and it sits here, not at the tail, because 11r-c amends the M11 movement lock. The notes below it — **uxd2**/**uxd3-a**/**uxd3-b** (0162–0164) and **M14.5b** (= 0100, PR #149, merged 2026-07-12) under \`## M14.5\` — all predate it.]`
- **11r-f :1932** after `= 0172.`: `[rb-75: 0172 = 11r-f's pre-reserved ADR-0171 + 1, computed before **11r-h** (= 0173, PR #276, merged 2026-08-01, minted ADR-0172) merged; 11r-f merged after it as PR #277 the same day, so the 0173 immediately above is the later value.]`
- **rb-15 :2210** after `… amended in-body).`: `[rb-75: **rb-17** (= 0218, PR #393) merged 2026-08-30 AFTER rb-15 (0217, PR #391, same day) but its entry was inserted above this one, so the higher numeral precedes the lower.]`
- **M15a :1816** after `= 0107.`: `[rb-75: added by PR #165 (\`c5fddc4\`, 2026-07-13) reading "PR TBD) in-progress"; rewritten the next day by **M15b**, PR #168 (\`a20507a\`, 2026-07-14), to "PR #165 merged) complete". 0107 was unchanged by that rewrite.]`
- **ux2 :1922** after `= 0155.`: `[rb-75: added by PR #255 (\`f8f50cb\`, 2026-07-25); the "DISCHARGED by ux2b" clause above was written into this entry by PR #273 (\`9c1f75e\`, 11r-e = **ux2b**, 2026-08-01), not by ux2. 0155 was unchanged by that rewrite.]`
- Terminal `**rb-75**` entry after :2263 recording the ruling (no ADR; the P1 residual-text correction; the two disclosed residuals; where the test lives), ending `ADR next-free = 0246.` (max docs/adr = 0245).

## 2. Test — `mod rb75_archlog_tests`, appended at EOF of `sim-harness/src/bin/mr_load_driver.rs`
Std-only; loads `concat!(env!("CARGO_MANIFEST_DIR"), "/../ARCHITECTURE.md")` (rb-71 idiom :6525). Non-short-circuiting labelled collector `rb75_violations(doc) -> Vec<String>`. Reuses `rb71_hidden_ranges`/`rb71_in_hidden_range` (:6130/:6172) by widening them to `pub(super)` (2 tokens; harness-only rb-71 mutants unaffected — the CI gate is nextest).
Parser: entry opens at a column-0 `**label**` line outside hidden ranges; an entry ends at the next column-0 `**`-led or `#`-led line. Duplicate label → `[rb75/label-ambiguous]`. Trailing numeral = LAST `ADR next-free` `*?` `[=:]` ws 4-digits in the entry. Bracket: exactly one `[rb-75:` … `]` per site entry, outside hidden ranges, on the trailing note's line and after it → else `[rb75/bracket-missing]` / `[rb75/bracket-placement]`; a `[rb-75:` in any non-site entry → `[rb75/bracket-foreign]`; whole-file count == 5 → `[rb75/bracket-roster]`. Numeral claims in a bracket: 4-digit runs whose neighbours are not `[0-9A-Za-z#-]` (excludes `ADR-0171`, `#274`, dates, SHAs); each binds to the nearest preceding `**label**` inside the bracket, else self; must equal that entry's LIVE trailing numeral → `[rb75/numeral-mismatch]`; unknown label → `[rb75/named-entry-missing]`.
Site table (5 rows): 11r-c (SectionCrossing: 11r-c index < `## M14` header index < M14.5b index; 11r-c is the first entry carrying a note; 0169 > 0100); 11r-f←11r-h and rb-15←rb-17 (PrecededBy: neighbour index == self−1 and neighbour numeral > self numeral → `[rb75/not-adjacent]` / `[rb75/inequality]`); M15a (RewrittenBy: next entry is `**M15b**` whose heading line contains `PR #168`; bracket contains `PR #168` and `PR #165`); ux2 (RewrittenBy: bracket contains `PR #273` and `PR #255`; the clause `DISCHARGED by ux2b` occurs in the entry BEFORE the bracket → `[rb75/claim-correspondence]`).
Tests (3 separate `#[test]`s): `rb75_archlog_sites_are_annotated` (live), `rb75_no_historical_numeral_changed` (live; the five numerals hand-typed ONCE as the anti-lockstep anchor), `rb75_archlog_oracle_control` (synthetic, `RB75_FIXTURE_FLOOR = 8`: clean; bracket-missing; numeral-mismatch; not-adjacent; bracket on neighbour (→ missing + foreign); col-0 decoy label (→ ambiguous); bracket inside `<!-- -->` (→ missing); bracket before the note (→ placement)). Capped there — ADR-0224 amendment.
**RED-before**: `rb75_archlog_sites_are_annotated` fails with `[rb75/bracket-missing:…]` ×5 + `[rb75/bracket-roster] 0 != 5`; the other two are green before and after. Captured to `memory/projects/gates/rb-75.red-before.md`.

## RULINGS (orchestrator right-sizing, before lenses)
- R-A. CUT the planner's `rb75_archlog_terminal_note_is_max_plus_one` test: it would institute a per-slice obligation (every future slice must append a correct note) — a rule over the class, exactly what 18r-b measured unsupportable; ARCHITECTURE.md:905-915 names DIGEST.md the sole enumeration. 18r-b's harness-side I4 already covers this PR's terminal entry.
- R-B. Mutant roster trimmed to 7 (M0 strip all brackets = RED-before replay; M1 wrong numeral; M2 bracket moved to neighbour; M3 swap 11r-h/11r-f; M4 col-0 decoy label; M5 HTML-comment wrap; M6 M15b heading `#168`→`#169`) + 2 benign controls.
- R-C. Boy-scout: NONE. `mr_load_driver.rs:6067` says 0232 `:51` but the live cite is `:52`; `memory/projects/rb-72.gates.mjs` X3 re-derives from the driver's claim, so editing it could move a sibling's gate — disclose as `R-rb75-DRIVERHEADER`, do not edit.

## 3. Acceptance ledger (seeded 0 → authored)
- X1 `cargo nextest run -p sim-harness -E 'test(rb75_)' --no-fail-fast 2>&1 | tail -3` → `3 tests run: 3 passed`
- X2 `node memory/projects/rb-75.gates.mjs <wt> mutants` → `RB75-MUTANTS 7/7 KILLED 2/2 CONTROLS-GREEN TREE-RESTORED`
- X3 `node memory/projects/rb-75.gates.mjs <wt> diffset` → `RB75-DIFFSET OK 2 declared files, 0 eval files, numerals byte-preserved, 76-89 intact`
- X4 `node memory/projects/rb-75.gates.mjs <wt> redbefore` → `RB75-REDBEFORE CONFIRMED missing=5 roster=fired TREE-RESTORED`
- X5 MANUAL — git-history facts (dates, PRs, SHAs `c5fddc4 a20507a f8f50cb 9c1f75e`, merge order #276<#277, #391<#393); EVIDENCE: `memory/projects/gates/rb-75.x5-git-history.md:<deciding line>`
- X6 `just ci 2>&1 | tail -3` → `check(s), 0 failed, 0 skipped`

## Red-team bypass shapes to try on the artifact
bracket on the wrong entry; col-0 decoy heading (and one inside a fence — must NOT count); bracket inside `<!-- -->`; numeral bound wrongly by mention order; first-match note extraction beaten by the :2216 prose quote; bracket mid-entry; lockstep numeral+bracket edit (disclosed bound, caught by X3 in this PR only); decoy `PR #168` with M15b heading changed; deleting ux2's DISCHARGED clause; `= 0173` inside a code span in the bracket; dropping a `#[test]`/fixture floor (X1 count pin).

---
# Plan-review adjudication (reviewer FAIL→fixed + red-team, 2026-09-11)

## Findings accepted
- **reviewer BLOCKER + red-team item 3/finding2 (same root cause): implicit "nearest preceding label" numeral binding** mis-binds 4 of 5 proposed brackets (rb-15's `0217` → rb-17; M15a's `0107` → M15b; ux2's `0155` → ux2b; 11r-c's en-dash range `0162–0164` → uxd3-b). **RULING R-1: binding is EXPLICIT.** A numeral claim is recognised ONLY in the form `**label** (= NNNN` (bold label, space, `(=`, space, 4 digits). Every other 4-digit run inside a bracket whose neighbours are not `[0-9A-Za-z#-]` is `[rb75/unbound-numeral]`. No ranges, no bare numerals. All five bracket texts rewritten below in that form.
- **red-team finding3 (pre-existing col-0 bold phrases `**17r-a**` :2055, `**per axis**` :1592, :1985 would false-red a bare-label parser).** RULING R-2: an entry opens/closes ONLY at a column-0 line matching `**<label>** (` (label chars `[A-Za-z0-9.-]`, then space, then `(`). Measured: 124 such lines, zero duplicate labels; all 10 site/neighbour labels occur exactly once. `[rb75/label-ambiguous]` is checked only for the labels the site table names, never file-wide.
- **red-team finding4 + reviewer: "11r-c is the first entry carrying a note" is a rule over the class.** RULING R-3: CUT from the check AND from the prose. SectionCrossing keeps only: index(11r-c) < index(`## M14` header) < index(M14.5b), and 0169 > 0100.
- **red-team finding6: "because 11r-c amends the M11 movement lock" is un-gated narrative.** RULING R-4: dropped.
- **red-team finding5 / rb-15 placement ambiguity.** RULING R-5: the bracket must START after the entry's trailing-note match on that line AND be the LAST thing on the line (line ends with `]`); the bytes between the note match and the bracket must contain no `<`. Closes "bracket before the parenthetical" and the `</span>` tail of finding1.
- **red-team finding1 (display:none HTML wrapper).** Partially closed by R-5 (a closing tag after `]` fails last-on-line; an opening tag between note and bracket fails the `<` ban). An opening tag placed EARLIER on the line (before the note) and closed on a later line is NOT caught — disclosed as `R-rb75-HTMLWRAP`; this file is consumed as raw bytes by agents, so the residual risk is reader-renderer-specific. ADR-0224: uncertainty resolves toward not adding a check.
- **reviewer /simplify:** `[rb75/bracket-foreign]` MERGED into per-site missing + whole-file roster == 5 (M2 now expects `[rb75/bracket-missing:11r-f]`); mutant M0 CUT (X4 redbefore covers it) → 6 mutants + 2 controls. Everything else KEEP.
- **reviewer minor:** a hard-wrapped continuation line starting `**x** (` would split an entry — not present in any site entry; disclosed, not gated.

## FINAL bracket texts (each appended, preceded by one space, as the last thing on the site's trailing-note line)
- 11r-c :1564 → ` [rb-75: **11r-c** (= 0169) is this entry's own value (PR #274, merged 2026-07-31); it sits in this subsystem section, not at the file's tail. The notes below it — **uxd2** (= 0162), **uxd3-a** (= 0163), **uxd3-b** (= 0164) and, under \`## M14.5\`, **M14.5b** (= 0100, a note written 2026-07-13 by PR #151) — all predate it.]`
- 11r-f :1932 → ` [rb-75: **11r-f** (= 0172) is this entry's pre-reserved ADR-0171 + 1, computed before **11r-h** (= 0173, PR #276, merged 2026-08-01, minted ADR-0172) merged; 11r-f merged after it as PR #277 the same day, so the numeral immediately above is the later value.]`
- rb-15 :2210 → ` [rb-75: **rb-15** (= 0217, PR #391) and **rb-17** (= 0218, PR #393) both merged 2026-08-30; rb-17 merged AFTER rb-15, but its entry was inserted ABOVE this one, so the higher numeral precedes the lower.]`
- M15a :1816 → ` [rb-75: **M15a** (= 0107) was added by PR #165 (\`c5fddc4\`, 2026-07-13) reading "PR TBD) in-progress"; rewritten the next day by **M15b** (= 0108, PR #168, \`a20507a\`, 2026-07-14) to "PR #165 merged) complete". The numeral was unchanged by that rewrite.]`
- ux2 :1922 → ` [rb-75: **ux2** (= 0155) was added by PR #255 (\`f8f50cb\`, 2026-07-25); the "DISCHARGED by ux2b" clause above was written into this entry by PR #273 (\`9c1f75e\`, 11r-e = **ux2b** (= 0170), 2026-08-01), not by ux2. The numeral was unchanged by that rewrite.]`
Neighbour live numerals verified: M15b :1818 = 0108, ux2b :1926 = 0170, 11r-h = 0173, rb-17 = 0218, M14.5b = 0100, uxd2/uxd3-a/uxd3-b = 0162/0163/0164.

## Site table (final)
| site | relation | checks |
| 11r-c | SectionCrossing(M14.5b, header `## M14`) | idx(11r-c) < idx(header) < idx(M14.5b); num(11r-c) > num(M14.5b) |
| 11r-f | PrecededBy(11r-h) | idx(11r-h) == idx(11r-f) − 1; num(11r-h) > num(11r-f) |
| rb-15 | PrecededBy(rb-17) | idx(rb-17) == idx(rb-15) − 1; num(rb-17) > num(rb-15) |
| M15a | RewrittenBy(M15b, "PR #168", own "PR #165") | idx(M15b) == idx(M15a) + 1; M15b's label line contains `PR #168`; bracket contains `PR #168` and `PR #165` |
| ux2 | RewrittenBy(ux2b, "PR #273", own "PR #255") + claim `DISCHARGED by ux2b` before the bracket | bracket contains both PR tokens; clause present in entry text before the bracket |
Common: exactly one bracket per site (placement per R-5); whole-file `[rb-75:` count == 5; every `**label** (= NNNN` claim in a bracket equals that label's live trailing numeral; `[rb75/unbound-numeral]` for any other bare 4-digit run.
Fixtures (floor 8): clean; bracket-missing; numeral-mismatch; unbound-numeral; not-adjacent; label-ambiguous (duplicate site label); bracket inside `<!-- -->` (→ missing); bracket not last on line (→ placement).
Mutants (6): M1 wrong numeral (11r-f bracket `= 0173`→`= 0174`); M2 bracket moved to 11r-h (→ missing:11r-f); M3 swap 11r-h/11r-f entries (→ not-adjacent); M4 col-0 decoy `**11r-f** (` (→ label-ambiguous); M5 rb-15 bracket in HTML comment (→ missing:rb-15); M6 M15b heading `#168`→`#169` (→ rewrite-correspondence:M15a); M7 ux2 DISCHARGED clause deleted (→ claim-correspondence:ux2). [7 listed — M0 cut; ledger X2 expects 7/7.]
