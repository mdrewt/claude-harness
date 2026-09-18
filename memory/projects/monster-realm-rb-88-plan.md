# rb-88 plan — retract the false "S4 must close-before-open" prescription in focusTrap.ts

Slice: rb-88 · residual: R-17r-e-E3 · repo: project (`mdrewt/monster-realm`) · branch `fix/rb-88-focustrap-stale-close-before-open`
Worktree: `projects/monster-realm/.claude/worktrees/rb-88` · base `bc45236` (origin/master 2026-09-18)
Touches: `client/src/ui/focusTrap.ts` (+ sibling `focusTrap.test.ts`; `ARCHITECTURE.md` entry via doc-keeper). No ADR (none assigned; ADR-0224 — comment-only fix). No new eval.

## Defect (verified)
`focusTrap.ts:58-62` repeats the claim 17r-e retracted at `overlayA11y.ts:51-54`: that the four `#app`-mounted
views share ONE root so an open-before-close wiring stacks two capture traps on one node → "S4 must
close-before-open". Truth: each view `createElement`s its OWN root (battleView.ts:81→225, boxView.ts:60→120,
raisingView.ts:78→124, evolutionView.ts:68→97); `OPEN_OVERLAYS` keys four distinct ids; `installTrap(root)`
binds the PASSED root (`focusTrap.ts:150`), never the mount, so sibling roots never stack. Stacking needs the
SAME root twice, which `openOverlayA11y`'s same-id branch (`overlayA11y.ts:106-113`) already tears down.
`S4-CROSS-VIEW-DISTINCT-ROOTS` (boxView.test.ts:287) pins the view-level half.

## Design
A. **Comment fix, LINE-COUNT NEUTRAL** (5 in / 5 out, confined to :58-62, ≤100 cols). focusTrap.ts is cited by
   line number at :52-56, :64, :65-73, :88-94, :136, :150 (overlayA11yWiring.test.ts:134-135,
   overlayA11y.test.ts:388, menuView.test.ts:51/1353, liveRegion.test.ts:246, ADR-0214:104/115,
   evals/keyboard-operable-rows.eval.mjs:857/2631) — a line insert drifts all of them silently (17r-e E3 discipline).
   Must-survive content: RETRACTED + cite overlayA11y.ts:52-54 · distinct roots under shared mount · installTrap
   binds the passed root · stacking needs the SAME root twice · openOverlayA11y same-id teardown prevents it ·
   "S4 must NOT close-before-open" · cite `S4-CROSS-VIEW-DISTINCT-ROOTS`. Verify columns with `awk '{print length}'`.
B. **Tests** — one additive `describe` appended to `focusTrap.test.ts` (baseline 19 → 22). Real topology: shared
   `<div id="app">` mount + two sibling roots, ≥3 buttons each.
   - T1 `rb-88-SIBLING-ROOTS-NO-STACK`: installTrap(A) then installTrap(B) with A live; Tab in B → exactly one
     step (identity) + defaultPrevented; Tab in A → one step; uninstall A → Tab in B still one step.
     Kills: attach-to-parentElement/mount, attach-to-document, module-singleton "already installed" guard.
   - T2 `rb-88-SAME-ROOT-TWICE-STACKS`: same root installed twice → one Tab moves TWO steps (the real per-NODE
     mechanic the comment mis-attributed to sibling roots). Kills a global node-dedupe over-correction.
   - T3 `rb-88-ONE-LISTENER-PER-ROOT-ZERO-ON-MOUNT`: `vi.spyOn(addEventListener)` — each root exactly one
     `keydown` capture listener, the mount ZERO. Directly refutes "installs TWO capture listeners on ONE node".
   No happy-dom layout reliance (`activeElement`, spies, structure only). Existing 19 tests untouched.
C. **Ledger** (0 seeded SHALL → X-gates, rb-84 precedent): X1 file count 22/22 · X2 neutrality + hunk shape +
   needles (negative `installs TWO capture listeners on ONE node`, positive `S4-CROSS-VIEW-DISTINCT-ROOTS`) ·
   X3 harness-side mutant register `gates/rb-88.mutants.mjs` on a scratch copy (m1 parentElement, m2 document,
   m3 module singleton guard; controls pristine/whitespace/comment-elsewhere) · X4 `just ci` · X5 touches ⊆
   {focusTrap.ts, focusTrap.test.ts, ARCHITECTURE.md}, no docs/adr file, exactly one `**rb-88**` ARCHITECTURE entry.
D. **Anti-patterns**: no widening into overlayA11y.ts/views (rb-89 owns VIEWHDR); no eval; no ADR; no edits to
   the 19 existing tests; no production code change; no layout-dependent fixtures; X3 never runs concurrently
   with `just ci` in the same worktree.
E. **Risks**: 5×100-col budget is tight — trim, never spill to 6 lines; first test with two concurrently
   installed traps (happy-dom event ordering — assert identities, not toHaveFocus); mutant runner must copy
   test + impl, settle ≥1s, restore on exit.
