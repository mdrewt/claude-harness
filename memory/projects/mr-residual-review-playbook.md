# Residual review — playbook for an `rv-<utc>` run

Operator, 2026-11-26: every residual stays documented — nothing is dropped, capped or closed without
evidence — and the loop periodically works the backlog down. This run READS the code and the registry
and writes one report plus its verdict file. It changes no code, no spec and no registry row: the
supervisor applies the report after merging it.

## Launch (supervisor)
When the bundle's `residual_review.due` is true (cadence and limits: `mr-residual-review.json`), the
residual share launches `rv-<utc>`: routine tier, `type: docs`, touches
`memory/projects/residual-reviews/` (a harness slice; its gate is `mr-selfcheck`), target_desc "follow
`$MEM/mr-residual-review-playbook.md`". A parked or failed rv run is resumed under its own id, never
relaunched under a new one; its second failure is a non-blocking `mr-ask-drew`.

## Inputs
- `memory/projects/mr-residual-history sort --json` — every open residual with its cited `paths`, a
  `state` (`unchanged` / `changed` / `gone` / `no-paths`), the latest earlier verdict (`reviewed`)
  and whether it still needs one (`recheck`), the spec files that already name it (`named_in`),
  whether it came from a follow-up slice (`followup`) and a `cluster` key.
- The game repo at `origin/master` (read-only: `git -C projects/monster-realm show origin/master:<path>`)
  and the harness at `origin/main` for `loop-ops` rows.

## Procedure
1. **What to check.** Rows with `recheck` true and `state` other than `unchanged`, oldest first, up to
   `batch`. A row whose earlier verdict still stands (`recheck` false) is not re-read: an earlier
   STILL-REAL stays STILL-REAL. An `unchanged` row with no verdict is STILL-REAL without a re-read.
2. **One verdict per checked row, with evidence:**
   - **FIXED** — a merged change fixed it: the PR number or commit AND the test that now covers the
     behaviour (file and test name). No covering test → STILL-REAL with a note.
   - **STILL-REAL** — the file:line that shows the defect today.
   - **OBSOLETE** — the code it describes is gone and nothing replaced it: what removed it.
   - **UNSURE** — what would settle it. UNSURE rows are re-checked by a later review only when a cited
     path changes, so name what to look for.
3. **Fix clusters, at most `max_clusters`.** From STILL-REAL rows (this review's and earlier ones'),
   group rows one slice can fix together (same files or module). Never a member or lead: a row with
   `named_in` set, status `promoted` or `targeted` (already owned), or `followup` true (mr-gates refuses
   follow-ups of follow-ups — list it for a wontfix or a fold instead). Rank: security-privacy and
   data-integrity, then what a player sees (gameplay, ux-a11y, netcode-determinism), then content, then
   loop-ops. Per cluster write the section BODY in `residuals.spec.md`'s format: `type: feature ·
   tier: routine|hard`, a measured `touches:` (grep, never guess), the `category · severity` line, the
   ids it closes, EARS criteria — one per row, each testable as an ordinary test — and a `Tests:` line.
4. **Folds.** A STILL-REAL row that an unbuilt milestone slice should absorb: name the slice.

## Deliverable (the run's harness worktree)
- `memory/projects/residual-reviews/<slice>.md`: a table (id · severity · category · verdict ·
  evidence), the ranked cluster bodies, the fold list, and one summary line (checked N, FIXED a,
  STILL-REAL b, OBSOLETE c, UNSURE d, clusters k).
- `memory/projects/residual-reviews/<slice>.verdicts.json`:
  `{"reviewed_at": "<utc>", "verdicts": {"<id>": "FIXED|STILL-REAL|OBSOLETE|UNSURE", …}}` — every row
  this review gave a verdict. Later reviews and the bundle's `unreviewed` count read it.
- A doc-only PR `docs(residuals): <slice> — …`. Do not run `mr-gates residuals disposition|promote|close`
  and do not edit `residuals.spec.md` or any milestone spec: those are the supervisor's.

## After merge (supervisor; each step is one tick's action)
1. **The merge tick — dispositions only.** Re-check at least two FIXED and one OBSOLETE verdict against
   the cited evidence (all of them when any fails); a verdict that does not hold is STILL-REAL. MED/LOW
   FIXED: `mr-gates residuals disposition --id R --as fixed --reason '#<PR> <test>'`; OBSOLETE: `--as
   wontfix --reason 'obsolete: <what removed it>'`. HIGH/CRITICAL: one NON-blocking `mr-ask-drew`
   listing their verdicts; nothing is dispositioned until it is answered.
2. **The next tick — clusters.** Per cluster: `mr-gates residuals promote --id <lead>`, then replace
   only the generated section's BODY with the proposed one (keep its `### rb-N — …` heading and its
   `after:`/`residual:` line, which `close` keys on), and `mr-record queue-add`; one doc-only chore PR.
   Folds: `mr-gates notes add --slice S --text … --residual R`, only for a slice not in flight.
3. **When a cluster slice merges:** its lead closes through `mr-gates residuals close`; every other id its
   section names whose criterion is met (not DEFERred) is a MED/LOW `disposition --as fixed --reason '#N'`.
