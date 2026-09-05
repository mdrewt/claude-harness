# 17r-e — plan (post-lens, frozen 2026-09-05)

Worktree `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/17r-e`
Branch `feat/17r-e-comment-truth`, forked from `origin/master` @ `0ed602f`.
Lenses closed: `planner`, `reviewer`, `red-team`, `/simplify`.

## Scope decision

Four cited false/stale comments. **Items 2 and 3 (the two `.ron` comment fixes) are DEFERRED**
as a hidden-dependency STOP; items 1 and 4 ship.

### Why 2+3 are blocked (verified independently 3×: orchestrator, planner, reviewer, red-team)

`evals/content-version.eval.mjs:31-40` (`hashContentDir`) hashes the **raw bytes** of every file
under `game-core/content/` — recursive, sorted, no comment stripping, no `.ron` parse — and compares
to the committed baseline `evals/baselines/content-hash.json` (`{"version":21,"hash":"acd9b136…"}`),
which must also equal `CONTENT_VERSION` in `server-module/src/lib.rs:79` (= 21).

A one-character comment edit in either `.ron` changes the digest. Landing it therefore **requires**
editing `evals/baselines/content-hash.json` and/or `server-module/src/lib.rs` — both outside this
slice's declared `touches:`, and doctoring the baseline is exactly the shape that eval's own TEETH B
(`:70-82`) exists to catch. The eval's failure message at `:109` advertises a `--update` flag the
file does not implement (zero `argv` handling) — the baseline is hand-edited. Every historical
commit touching `game-core/content/` also bumped `CONTENT_VERSION` + the baseline.

**Corrected facts, recorded for the successor slice:**
- `game-core/content/type_chart.ron:9` Electric→Electric 5; `:25` Water→Electric 5. Electric resists
  **Electric AND Water**. (`:24` Electric→Water 20, `:26` Earth→Electric 20, `:27` Electric→Earth 5.)
- `ability: Some(3)` (Regeneration) is carried by **three** species: Sproutlet `000-core.ron:24`,
  Stoneward `020-playtest-wave1.ron:64`, Tempestrix `051-wave2-derived.ron:39`.

## Dominant constraint (planner finding, reviewer-measured)

`client/src/ui/overlayA11y.ts` is cited **by line number 102 times across 18 files**, all outside
`touches:` (`:55-59` from a dozen `*View.test.ts` + ADR-0214; `:100-113`, `:126-128`, `:142-149`
from `main.a11yFocus.test.ts`, `overlayA11yWiring.test.ts`, ADR-0206). The item-1 edit is therefore
**strictly line-count neutral**: 4 lines in, 4 lines out, confined to lines 51-54. No existing
citation overlaps 51-54 (closest are `:41-45` and `:55-59`) — grep-verified by red-team.

## Edit 1 — `client/src/ui/overlayA11y.ts`, lines 51-54 (1 hunk, ±0 lines)

Replaces the header's contract-(a)/A12 item. Lines 55-69 stay byte-identical.

Truth constraints adopted from the lenses:
- **red-team [MEDIUM]:** "FOUR records" overclaims — `OPEN_OVERLAYS` (`overlayA11y.ts:83`) is a
  runtime map; entries exist only between open and close, and `battleView` is `EXCLUSIVE_TOP` while
  the other three are `HIDE_SWITCH` (`overlayRegistry.ts:77-80`), so 0-4 are live at any moment.
  The defensible claim is that the ids **key independent, never-colliding** records.
- **red-team [MEDIUM]:** `S4-CROSS-VIEW-DISTINCT-ROOTS` (`boxView.test.ts:287-332`) behaviourally
  covers only the **BattleView + BoxView** pair; raisingView/evolutionView follow by code identity
  (all four: `document.createElement` → `parent.appendChild`, distinct literal id). The citation must
  not read as "all four proven by test".
- The literal token `"share ONE root"` **stays inside the retraction** so the four sibling view
  headers (`battleView.ts:29-33`, `boxView.ts:29-33`, `raisingView.ts:30-34`,
  `evolutionView.ts:40-44`) and `ARCHITECTURE.md:2032`, which quote it as the thing being corrected,
  still resolve.

## Edit 4 — `evals/playtest-report.eval.mjs`, 5 sites

Drop the stale `EXPECTED RED until the specialist's identity-contract tightening lands` qualifier at
`:46-48` (header), `:1358-1363` (T3p comment — also falsely names "the current
`typeof rawIdentity === 'string'` branch"), `:1385` (T3p detail string), `:1393-1397` (T3q comment),
`:1419` (T3q detail string). The tightening landed: `scripts/playtest-report.mjs:132-154` requires
`identity` to be a one-element array holding a non-empty string, and the accept branch is gone.

- **`:1861` MUST NOT be touched** — the Section-3 summary echo is already accurate.
- No line citations into this file exist repo-wide, so line drift here is safe.
- biome `quoteStyle: single` / `lineWidth: 100`: author the shortened detail strings single-quoted.
  Red-team confirmed the removed apostrophe is inside the deleted phrase, so no `\'` text-scan hazard.

## Acceptance ledger (6 rows after `/simplify`)

`/simplify` dropped the planner's E2 (`overlayA11yWiring.test.ts` green) — fully covered by E6's
`just ci` and adding no independent signal — and folded E7 (`.ron` byte-identity) into E3 as one
diff-hygiene gate. Runner: `memory/projects/17r-e.claim-truth.mjs` (node 24, no dynamic `RegExp`,
marker printed only on the success path, `cd`s into the worktree).

| id | proves | note |
|----|--------|------|
| B1 | seeded umbrella, all four claims | **DEFERRED → backlog** (content-hash coupling). CHECK written now so the successor slice flips it to 4/4. |
| E1 | the four views really do get distinct roots | drives the **existing** pinned test; guards the vitest `numTotalTests:0`-exits-0 trap by requiring a title match |
| E3 | diff hygiene | `overlayA11y.ts` line-count-neutral + every line outside 51-54 byte-identical vs the **fork SHA `0ed602f`** (reviewer MINOR: not the moving `origin/master`), AND both `.ron` files byte-identical (proves the deferral was honored) |
| E4 | item 4's claim is a live fact | real `coerceRow` throws on both T3p/T3q fixtures; the `typeof rawIdentity === 'string'` accept branch occurs 0× in the script; eval default export returns `pass:true` |
| E5 | the qualifier is gone AND the teeth survive | 0 × `EXPECTED RED` in the file; `:1861` byte-unchanged; **plus the red-team [HIGH] anti-deletion clause** — the T3p and T3q marker comments must each still occur exactly once |
| E6 | full `just ci` green | detached-run + `CI-EXIT` marker idiom |

### red-team [HIGH] bypass closed by E5's anti-deletion clause

Without it, the cheapest way to satisfy E4/E5/B1/E6 is to **delete the T3p and T3q blocks
wholesale** (`:1358-1425`): `pass:true` already holds today, `'EXPECTED RED'` trivially hits 0, and
`evals/run.mjs` only knows filenames — it cannot see sub-checks. Unlike `decodeSqlJson`'s
self-counted `buildMustThrowCases()` table (`:978-986`), nothing counts T3p/T3q. E5 now pins both
marker comments at exactly one occurrence each.

### Honest limit (stated in the ledger, not papered over)

"This comment's prose is true" is not machine-checkable in general. E1/E4 prove the **underlying
properties**; E3/E5 prove **diff hygiene** and that the specific old falsehood is gone. The step from
that to "the new sentence is true" is a reviewer read of 9 changed lines.

## Boy Scout (verify-only, ≤3 lines, well under cap)

Verify — do not rewrite — that `overlayA11y.ts:47-49`'s `ui/overlayRegistry.ts:358-362` citation and
`:44-45`'s `ui/overlayRegistry.ts:24-30` citation still resolve. Retarget **in place** only if stale
(line-count neutral). Everything else skipped: reflowing any paragraph in this file is a citation
break, and `evals/content-version.eval.mjs:109`'s phantom `--update` flag is out of `touches:`.

## Dropped by the lenses

- **R-17r-e-VIEWHDR is NOT a real residual.** The planner claimed the four view headers quote the
  false "share ONE root" as a live antecedent. Red-team read all four: they **already** say *"That is
  a misstatement of this code: each view creates its OWN root … four distinct roots, four distinct
  `OverlayId`s and four distinct records … Pinned by `S4-CROSS-VIEW-DISTINCT-ROOTS`."* No follow-up
  work exists there. `ARCHITECTURE.md:2032` independently predicts this very slice.

## Residuals to register after the impl lenses (`mr-gates residuals add` is add-only, not upsert)

- `R-17r-e-RON-COMMENTS` — items 2+3, blocked by the content-hash coupling; the successor's
  `touches:` must add `evals/baselines/content-hash.json` + `server-module/src/lib.rs`.
- `R-17r-e-CONTENT-UPDATE-FLAG` — `evals/content-version.eval.mjs:109` advertises a `--update` flag
  the file does not implement.

## ADR

**None.** No new dependency and no shipped pattern; the DEFER rationale lives in the ledger and the
`ARCHITECTURE.md` block. ADR-0224's ratchet cuts against manufacturing one for a comment sweep.

## Anti-patterns (named, to avoid)

1. Changing `overlayA11y.ts`'s line count — 102 citations across 18 out-of-scope files.
2. "Fixing" the four view headers / `boxView.test.ts:287` / the historical `**m23-s4**`
   `ARCHITECTURE.md` block for consistency. Out of `touches:`; the ARCHITECTURE blocks are
   append-only slice records.
3. Editing `evals/baselines/content-hash.json` or `CONTENT_VERSION` "just for two comments".
4. Touching `playtest-report.eval.mjs:1861`.
5. A grep-for-the-new-wording gate — rejected by `mr-gates lint` and pure theatre.
6. Dynamic `RegExp` in the runner (Semgrep `detect-non-literal-regexp`).
7. A scratch `.test.ts` under `client/src/` to "prove" the four-root property — leftovers poison
   `npm test`. Drive the existing pinned test.
8. Reflowing a comment paragraph for tidiness (biome does not reflow comments; every reflow is a
   manual line-count change).
