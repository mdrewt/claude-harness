# 18r-a plan — privacyModel: the busy guard must not spend the armed delete confirmation

Spec: `specs/monster-realm-v2/M-postgate-eighteenth-review-residuals.spec.md` §18r-a.
Gate ledger: `memory/projects/gates/18r-a.gates.md` (B1, one seeded criterion).
Worktree: `.claude/worktrees/18r-a`, branch `slice/18r-a` off `origin/master` (e630386).
touches: `client/src/ui/privacyModel.ts`, `client/src/ui/privacyModel.test.ts`. No ADR (supervisor
assigned number `None`; a bug fix inside the existing ADR-0231 core introduces no new decision).

## The defect (hand-traced, then re-verified by reviewer + red-team)

`begin()` (privacyModel.ts:223-246) applies the CALLER-supplied `confirm` in its no-op guard
branch (`:231-235`). Two of three emitters pass `state.confirm` (identity); `'delete-confirmed'`
(`:275-284`) passes `'none'` to spend the confirmation on delivery. So a `delete-confirmed`
dispatched while `state.inFlight !== 'none'` silently wipes an armed `'delete-armed'` with
`effect: 'none'` and no notice — the delete never happens and the player is silently sent back to
step one. The disconnected branch (`:237-240`) already preserves `confirm` deliberately.

## Fix (option (a) of the spec's two, plus a file-local rename)

```
-    return { next: { ...state, confirm }, effect: 'none' };
+    return { next: state, effect: 'none' };
```
and rename the module-private parameter `confirm` → `confirmOnDelivery` (`:229`, used at `:243`)
so the seam reads correctly at all three call sites.

Rejected — option (b), splitting into delivered-vs-no-op parameters: it WIDENS the legal value
space (a second parameter every caller would pass `state.confirm` to) to encode a distinction no
caller needs. The rename alone makes the no-op spend unrepresentable: there is no value to spend
from on that branch. YAGNI + a 3-line diff instead of a 7-arg signature and three call-site edits.

`{ next: state }`, not `{ next: { ...state } }` (simplify lens): `PrivacyModelState` is fully
`readonly` and never mutated, the module's own `delete-requested` no-op arm already returns
`{ next: state }` (`:271`), and `sessionModel.ts`'s analogous guard does the same. A genuine no-op
returning the same reference is also the change-detection-friendly shape once the s8b shell lands.
The `-fresh object-` reading of the `privacyStep` doc comment (`:249`) means "never mutates its
input", which `{ next: state }` satisfies; an identity assertion would contradict `:271`.

Keep the two `state.confirm` call sites explicit (`:300`, `:310`) rather than dropping the
parameter: forcing every emitter to state its delivery intent IS the guard. Collapsing it to a
boolean `spendsConfirmation` is a wider diff for a two-value type — not this slice.

## Second, latent behavior change — pinned deliberately, not by accident

`!permitted` has two disjuncts. `confirm !== 'delete-armed'` is unobservable (`confirm` is already
`'none'`). But `confirm === 'delete-armed' && !deletePermitted` (a non-active phase,
`S8T-DELETE-NONACTIVE-REFUSED`, test `:662-699`) ALSO spends today and is fixed by the same line.
It is latent (only reachable by direct state construction — `account-changed` disarms on any phase
change), so it gets an explicit assertion in that block rather than being left as a silent side
effect.

## Reachability — the plan's first draft was WRONG and both lenses caught it

Draft claimed "only `inFlight === 'export'` is reducer-reachable while armed". An exhaustive BFS
from `PRIVACY_INITIAL` (red-team; saturates at 43 states by depth 6) gives the true answer:
`confirm === 'delete-armed'` co-occurs with `inFlight ∈ {'export', 'delete'}`, never `'cancel'`.
`'delete'` is reachable because `case 'delete-requested'` (`:269-272`) gates on `deletePermitted`
alone and never on `state.inFlight`, so a player can re-arm while an earlier delete is still in
flight — a double-click, the most realistic manifestation of the bug. `'cancel'` is unreachable
because `cancelPermitted` requires a non-active phase and `account-changed` clears `confirm` on
every phase transition. The PR body and test comments state exactly this, not the draft's claim.

## Teeth (the tester authors the source from the EARS; this is WHAT must be proven)

Extend the EXISTING `it` at `privacyModel.test.ts:701` — reuse the `S8T-DELETE-INFLIGHT-REFUSED`
title verbatim so the exactly-once `fullName` census stays at 1.

1. `deleteStep.next.confirm === 'delete-armed'` for each `busy ∈ ['delete','cancel','export']`.
   This is the leg that reds on HEAD and greens on the fix (measured by the red-team).
2. The `cancelStep`/`exportStep` fixtures get `confirm: 'delete-armed'` and the same assertion.
   MEASURED AND STATED HONESTLY IN THE TEST: these two legs pass on HEAD as well — those emitters
   pass `state.confirm`, so the defect never reaches them. They are UNIFORM-INVARIANT coverage
   ("no emitter's no-op spends"), not defect coverage. Without the fixture change the assertion
   would be permanently red (the fixtures default `confirm` to `'none'`).
3. A REDUCER-BUILT reachable sequence, not a hand-built fixture: `account-changed(active)` →
   `delete-requested` → `export-requested(live)` → `delete-confirmed(live)` ⇒ `effect 'none'`,
   `inFlight 'export'`, `confirm 'delete-armed'`. Kills "the fixture is an unreachable state".
4. The second reducer-built path the reviewer found: arm → `delete-confirmed(live)` (fires) →
   `delete-requested` (re-arm while `inFlight === 'delete'`) → `delete-confirmed(live)` ⇒ same.
5. Local anti-vacuity for the delivered spend: `inFlight 'none'` + armed + active + live ⇒
   `effect 'call-delete-account'` AND `confirm 'none'`. (`:638` already proves this; first-failure-
   wins means a distant tooth cannot be relied on to cover this one — flagged as deliberate
   duplication, not new coverage.)
6. `next.confirm === 'delete-armed'` added to the `S8T-DELETE-NONACTIVE-REFUSED` loop (`:670-690`).
7. NEW property tooth, prefix-free tag `S8T-NOOP-NEVER-SPENDS`: over fast-check-generated
   `(state, event)` pairs, no step with `effect: 'none'` may change `confirm` unless the event is
   `confirm-cancelled` / `delete-requested` / `account-changed`. MEASURED discriminating by the
   red-team: 1112/20000 counterexamples on HEAD, 0 on the fix.

### Wrong implementations the teeth must kill (red-team measured, M-ids from its report)
- current bug `{ ...state, confirm }` — killed by (1), the `deleteStep` leg.
- M3 guard hardcodes `confirm: 'none'` — killed by (1).
- M1 delivery never spends (`state.confirm` instead of the `'none'` literal) — already killed by
  the pre-existing `S8T-DELETE-CONFIRM` `:638`; (5) makes it local.
- M4 guard clobbers `inFlight` — killed by the pre-existing `:712` assertion (retained).
- M5 partial fix covering only one busy value — killed by the three-value loop.
- fixture-overfit impls — killed by (3) and (4).
- half fix that preserves only when `inFlight !== 'none'` and still spends on `!permitted` —
  killed by (6).
- disconnected regression — `S8T-DELETE-OFFLINE-ARMED` (`:641-660`) stays green, untouched.
- M6 (spend moved into the `delete-confirmed` case arm) passes — CORRECT: the teeth test
  behavior, not implementation shape. Recorded, not "fixed".
- M7 (`{ next: state }` vs `{ next: { ...state } }`) is indistinguishable to every test. This plan
  CHOOSES `{ next: state }` (above); identity is explicitly not part of the contract, since
  `:271` already returns the same reference.

## Boy Scout (cap ~40 lines / ≤3 hunks; comments only, both inside `touches:`)
- `privacyModel.ts:232-234` — the guard-branch comment gains the now-load-bearing second half:
  nothing happened, so nothing is SPENT either (citing the disconnected branch's precedent).
- `privacyModel.ts:282-283` — "a refusal leaves it armed (handled inside `begin`)" is FALSE on
  HEAD for the busy refusal; re-worded to name the delivery-only contract.
- `privacyModel.ts:221-222` — one clause on `begin`'s doc comment: the confirm argument applies on
  the DELIVERED path only.
No renames of exported symbols. `IMPURE_TOKENS` (test `:1154-1162`) bans `Date/window/document/
console/globalThis/performance/await import(` in the STRIPPED source, and `:1218` bans a raw
`://` — comment wording must avoid a URL.

## Blast radius / hidden dependencies
`begin` is module-private. `privacyStep`/`PRIVACY_INITIAL` appear in 5 files under `client/src`:
the module, its test, and three PROSE-ONLY mentions (`net/rowConvert.ts:600`,
`net/rowConvert.test.ts:3607,3626,3646,3661`, `net/store.test.ts:4683`). The s8b DOM shell has not
landed, so no consumer can depend on the busy path clearing `confirm`. No eval references
`privacyModel`. `CHANGELOG.md` is `git cliff`-generated. `ARCHITECTURE.md:479` and
`docs/adr/0231-*.md:54` describe the exported seam, which is unchanged — no doc edit owed.
**No hidden-dependency STOP.**
