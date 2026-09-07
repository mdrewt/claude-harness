# rb-61 — plan (PLAN-PHASE CHECKPOINT)

Slice: retarget the stale `main.ts:1574` citation at `client/src/main.a11yFocus.test.ts:782`
onto the M12d `store.onBatchApplied` dialogue-listener landmark. Closes
`R-rb-36-R-rb36-FOCUSCITE`. Prose-only; no new eval, no new test (ADR-0224).

Worktree: `.claude/worktrees/rb-61`, branch `feat/rb-61-focus-citation`, from origin/master@0064f19
(master CI verified green).

## Measured ground truth (0064f19)

- `main.ts:1574` = `if (e.code === 'Escape' && tradeProposeView?.visible) {` — unrelated (pt-c2 / ADR-0134 D7).
- `dialogueView?.render(null)` occurs NOWHERE in the repo except the defective comment itself.
- M12d listener: opener `store.onBatchApplied(() => {` at **:1837**, indent-0 close `});` at **:1887**,
  catch tag `'[M12d] dialogue batch listener error'` at :1885 (the ONLY unique disambiguator —
  `store.onBatchApplied(` occurs 15x in main.ts).
- `:1842` `menuView?.hide()`; `:1850` `const dialogueVm = buildDialogueViewModel(...)`;
  **`:1851` `dialogueView?.render(dialogueVm);`** — the real trigger.
- `buildDialogueViewModel` is TOTAL, returns `null` when there is no conversation (`ui/dialogueModel.ts:31`).
- `ui/dialogueView.ts:49-55` `render(vm)`: `if (!vm) { this.overlay.style.display = 'none'; ... }`;
  choice `<button>`s are appended to `this.choicesContainer` INSIDE that overlay.
  **The mechanism claim in the comment is TRUE — only the citation and the quoted call text are wrong.**

## Deliverables

1. `client/src/main.a11yFocus.test.ts` — replace the 5-line rationale at :779-783 with a corrected
   ~9-line block. rb-36/rb-60 doctrine: named landmark authoritative, line number a `today`-hedged hint.
   Fixes BOTH defects (line number AND phantom call text).
2. `memory/projects/gates/rb-61.oracle.cjs` (HARNESS repo, not the project — this is how ADR-0224's
   no-new-eval/no-new-test rule is honoured while still having a runnable CHECK; rb-60 precedent).
   INVERTED DIRECTION: the comment is the INPUT, `main.ts`/`dialogueView.ts` are the ORACLE.
   Teeth T0-T10 (+T11 if boyscout taken) — see the lens findings below.
3. `memory/projects/gates/rb-61.gates.md` — X1 (oracle) + X2 (full `just ci` from the worktree),
   `Touches:` filled in.

## Boy Scout candidate (in-file, decided after lenses)

`ui/overlayA11y.ts:111` is cited 6x in this file (:37, :465, :593, :623, :785, :975) for the
deferred-focus `setTimeout(0)`; `:111` is actually `previous.uninstall();` — the real macrotask is
**:134-136**. All six are the SAME defect. Partial fixing is worse than none (internally
contradictory file). Constraint: any edit ABOVE :313 must be LINE-COUNT-NEUTRAL — `ARCHITECTURE.md:2125`
and `overlayA11yWiring.test.ts:108/:159` back-cite into this file.

## NOT touched (hidden-dependency / follow-up flags)

- H1 `R-rb-61-MENUVIEW-PREMISE` — :316 / :570-571 claim `MenuView.show()` "does not call
  `openOverlayA11y` at all today"; m23-s6 falsified it (`ui/menuView.ts:135`). `ARCHITECTURE.md:2125`
  records the same premise as an accepted residual assigned to S10. Fixing it here pre-empts S10.
- H2 `R-rb-61-DIALOGUEVIEW-CITE` — `ui/dialogueView.ts:17` (+ `ui/dialogueView.test.ts:243,:290,:374`,
  `ARCHITECTURE.md:1997`) cite the listener as `:1627-1641`. Outside `touches:`. SECOND-generation
  drift: rb-36 wrote `:1627-1641` correctly and main.ts grew ~210 lines in four days.
- H3 `overlayA11yWiring.test.ts:291,:296` — already owned by rb-62 (running concurrently). Do not touch.
- H4 `main.a11yFocus.test.ts:308`'s `overlayA11y.ts:106`/`:143` pair — a paragraph rewrite, not a
  citation swap. Out of boyscout scope.

## Anti-patterns named

1. Hard-coding `1837`/`1851` in the oracle (a second copy of the drifting fact).
2. Containment-only range checks (rb-60 measured 3 CI-clean forgeries) — use exact-extent, never brace-count.
3. `store.onBatchApplied` alone as the disambiguator (15 occurrences).
4. Fixed-width hedge windows (rb-60 mutant M12) — terminate at the next backtick.
5. Paragraph-wide `today` presence (rb-60 mutant M5) — check each citation individually.
6. Silently-unmatched patterns / missing files treated as skip rather than FAIL.
7. Literal claim fragments in the PASS line — every token must be a computed count.
8. Promoting the comment to an assertion (ADR-0224).
9. Partial de-drift of the 6 boyscout sites.
10. Line-count changes above :313.

---

## PLAN-LENS RESOLUTIONS (reviewer + red-team + /simplify, run in parallel on the plan)

**All three lenses independently re-verified the measured ground truth above. No fabricated line
numbers found.** Three changes to the plan, one of them blocking:

### R1 (CRITICAL, red-team, MEASURED) — T0's span-walk direction was inverted; the oracle could never pass
The rationale comment is NOT above `it('S5T-BODY-BLUR`; it is the first statements INSIDE the
callback (`:775-783`), and `:773` (directly above the `it(`) is BLANK. Walking upward from `it(`
collects ZERO lines unconditionally, so X1 would have FAILed on the correct fix. Red-team proved this
with a faithful re-implementation (`/tmp/rb61-rt/mini_oracle.js`) against the plan's own proposed
replacement text: `T0: collected span = 0 lines`.
**Resolution:** anchor the span on the literal `WRONG IMPL KILLED:` marker and walk OUTWARD over
contiguous `^\s*//` lines in both directions — robust to the two paragraphs inside the callback being
re-ordered later.

### R2 (red-team, MEASURED) — a mechanism description that is exactly BACKWARDS was CI-clean
A mutant keeping every numeric citation correct but swapping the branches ("the non-null path is what
display:nones the overlay ... the `!vm` branch is what blurs that button") passed every planned tooth,
because T6 was presence-only / bag-of-words.
**Resolution:** the mechanism tooth asserts ORDER, not presence — the `!vm` clause must PRECEDE the
display:none clause, and the `<button>`/blur clause must follow — cross-checked against the real
`ui/dialogueView.ts` render body.

### R3 (red-team, MEASURED) — T9 must be exact-index, never a windowed/fuzzy search
A windowed variant misses a +/-1 drift and silently desyncs `overlayA11yWiring.test.ts:108/:159`.
Use literal 0-indexed array access. (Red-team also corrected the plan's write-up: `ARCHITECTURE.md:2125`
back-cites `:313`/`:568`, not `:242-261`; both are now covered.)

### R4 (/simplify + reviewer) — BOY SCOUT DEFERRED, not taken
The six `overlayA11y.ts:111` sites are non-contiguous => **6 hunks** against this loop's <=3-hunk cap.
`standards/principles.md` scopes the rule to "improve what you are already editing ... cleanups larger
than the current change get FLAGGED SEPARATELY, never smuggled inline" — the core change is ONE hunk.
Two in-repo precedents deferred the same class rather than go over cap: ADR-0163 D8 and ADR-0164 D7
("will not be hunk-split to dodge the cap"). Three aggravators: the six sites are not identical
(`:593` cites the range `:111-113`); `:37` sits above the `:313` line-count-neutrality threshold while
the other five sit below it; and `overlayA11yWiring.test.ts` back-cites into this file at `:108`/`:159`
while **rb-62 owns that file concurrently**.
**Resolution:** DEFER as ONE file-wide citation-sweep residual covering H1 + H2 + H4 + the six
`overlayA11y.ts:111` sites. Boy Scout for this slice: **none**. (Also removes the 12th tooth.)

### R5 (/simplify) — prose trimmed from +4 lines to +2; the bare `:1851` back-citation is CUT
A second line number is a second copy of the same drifting fact — the plan's own oracle anti-pattern
#1 applied to the prose. The quoted call `dialogueView?.render(dialogueVm)` is verbatim, unique and
greppable inside the cited 50-line range, and the merged tooth verifies it AGAINST that range, so the
number buys nothing a grep does not. `#dialogue-overlay` also cut (adds no fact; avoids planting a
census/uniqueness decoy). Cutting `:1851` deletes T4's subject and collapses the per-citation hedge
windowing to a single check.

### FINAL replacement prose (5 lines -> 7, +2)
```ts
    // WRONG IMPL KILLED: dropping the `=== document.body` disjunct from worldHasFocus() —
    // every hotkey stays dead from this point forward for the rest of the session, exactly
    // the "dead hotkeys forever after a dialogue ends" bug spec §2.3 names. The real trigger
    // is the M12d `store.onBatchApplied` dialogue listener (`client/src/main.ts:1837-1887`
    // today), which calls `dialogueView?.render(dialogueVm)` on EVERY batch — `dialogueVm` is
    // null once the conversation row is gone, and `render`'s `!vm` branch display:nones the
    // overlay, blurring a focused choice <button> the same way this test simulates here.
```

### FINAL oracle roster — 7 teeth + machinery (plan had 11+1; /simplify argued 5)
- **Machinery (not a tooth):** span located on `WRONG IMPL KILLED:`, walked OUTWARD over contiguous
  `//` lines (R1). Anti-vacuity folded in: every input file must exist and every "exactly one" count
  is enforced — a miss is FAIL, never skip.
- **T1** whole-file census: `main.ts:1574` and bare `` `:1574` `` == 0.
- **T2** (merged, INVERTED, the core tooth) every backticked `dialogueView(?)\.render(X)` token
  quoted anywhere in the FILE must occur verbatim INSIDE the cited listener range in `main.ts`.
  Strictly stronger than the plan's T2+T5: kills the phantom `render(null)` (not in range), any
  invented spelling, AND a surviving second copy elsewhere in the file.
- **T3** exactly one `` `client/src/main.ts:N-M` `` in the span + rb-60's exact-extent structural rule
  (N indent-0 `^store\.onBatchApplied\(` ending `{`; M indent-0 `});`; none swallowed strictly
  between) + the range body must contain `dialogueView?.render(` AND `[M12d] dialogue batch listener
  error` (the only unique disambiguator among 15 `store.onBatchApplied(` sites). Never brace-count.
- **T4** mechanism, INVERTED + ORDERED (R2) — re-derived from `ui/dialogueView.ts`.
- **T5** hedge: the single numeric citation carries `today` in a backtick-terminated window.
- **T6** framing/role preserved; every span line is `//`; no `expect(` / `it(` in the span.
- **T7** anti-collateral, EXACT-INDEX (R3): `:243`/`:242-261` (overlayA11yWiring.test.ts:108,:159)
  and `:313`/`:568` (ARCHITECTURE.md:2125) still hold what their citers claim.
- **PASS line** — every token a computed count, no literal claim fragments:
  `rb61-ORACLE PASS listener=<N>-<M> quoted=<q>/<q> stale1574=<c> hedge=<h>/1 mech=<m> inbound=<i>`

### Kept over /simplify's objection
X2 (full `just ci`) stays: biome trailing-whitespace, string-census collision and the +2-line inbound
shift are all real for a comment-only edit, and carving a DoD exception for "just a comment" is the
reasoning that has burned this loop. A separate eval sweep confirmed no `just ci` gate READS this
file's text (every `client/src` walker excludes `*.test.ts`) — which is exactly why the oracle has to
exist, and is recorded as the honest bound in the PR.
