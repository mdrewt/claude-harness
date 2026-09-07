# rb-60 — plan (ADR-0206:194 stale `main.ts:1574` citation)

Source residual: `R-rb-36-R-rb36-ADR0206CITE` (deferred from rb-36, 2026-09-02).
Repo: project (`mdrewt/monster-realm`). Branch `feat/rb-60-adr0206-citation`.

## Ground truth (measured in the worktree at origin/master 292627e)

- `docs/adr/0206-…:194` cites `` `client/src/main.ts:1574` `` for "renders it unconditionally on
  every store batch"; `:195` cites `` `:1565` `` for the `menuView` force-hide. Both are stale.
- `main.ts:1574` today is an unrelated Escape/`tradeProposeView` branch.
- The real site is main.ts's M12d `store.onBatchApplied` dialogue listener:
  opens `:1837`, `menuView?.hide()` `:1842`, `dialogueView?.render(dialogueVm)` `:1851`.
- The literal `main.ts:1574` occurs exactly ONCE in `docs/adr/0206*.md` (line 194).

## Convention (not invented here)

rb-36 (`318eb70`) established the repair form for this defect class: cite a STABLE LANDMARK (a
named symbol / comment marker) and demote the number to a soft ``(`:N-M` today)`` hedge, e.g.
`` main.ts's M12d `store.onBatchApplied` listener (`:1627-1641` today) ``. rb-60 applies the same
form to the ADR. (rb-36's own hedged numbers have themselves since drifted — which is the point:
the landmark stayed correct, only the hint aged.)

## The edit (one paragraph, one file)

`docs/adr/0206-world-focus-hotkey-gate-and-the-frame-loop-announcer.md` — retarget both `main.ts`
citations in the "Accepted residual — `visibleIds(probes)[0]`" paragraph onto the M12d listener
landmark, with `today`-hedged line hints.

**Added after plan review** (found by the plan red-team lens, not in the original plan): the SAME
paragraph's sibling citation `client/src/ui/overlayRegistry.ts:372-374` is stale the same way — it
lands inside `hideAllExceptPlan`'s JSDoc, not `visibleIds`. Taken as a BOY SCOUT item: same file,
same paragraph, same defect class, one line-number swap, far inside the ~40-line / 3-hunk cap.
Leaving it would mean shipping a paragraph whose first citation is wrong and whose second is
right.

## Explicitly NOT in scope

- **No new eval, no new test, no growing an existing eval.** ADR-0224 bans all three for prose-only
  ADR citation drift; the slice brief confirms it.
- **The other ~35 drifted citations in ADR-0206** (lines 17, 19, 39, 48, 91, 93, 157, 158, 161,
  164, 181, 192, 203, 221, 222, 265, …). A mass recitation is a substantive change well past the
  ~40-line / 3-hunk boyscout cap and deserves its own slice. FLAGGED as a follow-up, not touched.
- Any file other than the one ADR. `client/src/main.ts` is READ ONLY here.

## Acceptance

Ledger `memory/projects/gates/rb-60.gates.md` (0 criteria seeded — the spec section carries an EARS
observation, not a `SHALL`). Two gates authored:

- **X1** — the citations RESOLVE. Proven by `memory/projects/gates/rb-60.oracle.cjs`, which inverts
  the usual direction: it PARSES the line numbers out of the ADR prose and uses `main.ts` as the
  oracle, so the gate holds no drifting copy of the fact and does not red on unrelated main.ts
  edits. Also asserts the stale `1574` is gone ADR-wide and that the rb-36 `today` hedge survives.
  MEASURED RED pre-fix (`rb60-ORACLE FAIL stale main.ts:1574 citation still present`).
- **X2** — DoD: full `just ci` green from this worktree.

## Risks

- **Pinned-marker decoy** (rb-36 hit this in `ARCHITECTURE.md` vs `rekey-contract-surface.eval.mjs`):
  writing a code literal into a doc can break an occurrence-counting gate. Checked by the red-team
  lens before the edit lands.
- Retargeting a citation preserves the prose's CLAIM; if the claim itself has gone false, the fix
  would launder a false statement. Verified against today's main.ts by the red-team lens.
