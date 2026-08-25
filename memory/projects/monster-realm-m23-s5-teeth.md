# m23-s5 — proof-of-teeth, MEASURED by the orchestrator (the tester has no Bash)

Method: mutate a scratch copy of the shipped tree, run the owning spec with `--reporter=json`,
count failing assertions whose `fullName` contains the tooth's needle, restore from backup.
All twelve mutants BITE (>=1 matched assertion failing).

| # | Mutant | Tooth | Verdict |
|---|---|---|---|
| B1 | `worldHasFocus` loses `\|\| a === document.body` | `W-M23S5-WORLDHASFOCUS` | BITES |
| B2 | `liveRegion.flush(now)` -> `liveRegion.flush(0)` | `W-M23S5-LIVEREGION-PUMP` | BITES |
| B3 | second `let worldCanvasEl` shadowed inside `main()` | `W-M23S5-WORLDHASFOCUS` | BITES |
| B4 | the `worldCanvasEl = mount.querySelector('canvas')` assignment deleted | `W-M23S5-WORLDHASFOCUS` | BITES |
| B5 | conjunct removed from ONE of the twelve (leaderboardView) | `W-UXD3C-OPENGUARDS` | BITES |
| B6 | conjunct ADDED to KeyT (a thirteenth site) | `W-UXD3C-OPENGUARDS` | BITES |
| B7 | `#help-hint` `padding:0 50vw` | `H4b` | BITES |
| B8 | `#help-hint` `border:50vw solid transparent` | `H4b` | BITES |
| B9 | `#help-hint` `font:900px/1 monospace` (red-team #2's pre-existing hole) | `H4b` | BITES |
| B10 | a second corner affordance as `<a style="position:fixed;top:8px;right:8px">` | `W-ONE-CORNER-AFFORDANCE` | BITES |
| B11 | a second corner affordance as a NESTED `<div><button style="position:fixed;...">` | `W-ONE-CORNER-AFFORDANCE` | BITES |
| B12 | `#help-hint` reverted to a `<div>` | `S5T-HINT-BUTTON` | BITES |

B10 and B11 were INVISIBLE to the fork's `body > div` selector — they are the measured
justification for the tag-/depth-agnostic widening (plan-lens adjudication A5, red-team #6).
B9 closes a hole that existed BEFORE this slice (`font` was allow-listed with no value clause).
