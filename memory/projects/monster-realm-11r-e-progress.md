# 11r-e progress memo — ux2b: wallet view completion (ADR-0169)

**Branch:** `feat/11r-e-wallet-view-completion` · **Worktree:** `projects/monster-realm/.claude/worktrees/11r-e`
**Forked from:** `origin/master` @ `90921d1` · **ADR:** 0169 (supervisor-assigned)
**Last updated:** 2026-07-31, during the implementation-review phase.

## DONE

- **Planning.** `planner` (opus/high) → reviewed in parallel by `reviewer` + `red-team` + `/simplify`
  lens. Plan + a binding "PLAN REVISION v2" delta live in
  `memory/projects/monster-realm-11r-e-plan.md`. ADR-0169 written and `just adr-digest` regenerated.
  Committed + pushed as a `wip:` checkpoint before any test was written.
- **Key planning finding:** the e2e does NOT need the stochastic battle-win faucet. `quest_001`
  ("Find the Elder") has `start_conditions: []`, one `Talk(elder_oak)` step and `reward.currency: 50`
  — talk → choose "I seek a quest." → talk again ⇒ exactly 50 gold, zero RNG.
- **Tests (RED-first, 3 `tester` agents on disjoint files).** RED verified by the orchestrator
  (testers have no Bash): **24 failures**, each message naming the absent implementation. Committed +
  pushed.
- **Implementation** (a separate `specialist`-role agent; never touched a gating test). 65 lines
  across `rowConvert.ts` / `connection.ts` / `main.ts`. Green: 278 tests in the gating files, 1787
  full client suite. Committed + pushed.
- **Full `just ci` → EXIT 0** on that tree (clippy, fmt, 1500+ cargo tests, evals, security,
  wasm-pack, tsc, 1787 vitest).
- **Implementation review**, 4 parallel lenses: `reviewer`, `red-team`, `/simplify` (`review-lens`),
  `desync-guard`. Red-team ran the full mandated mutant sweep — **all 11 assigned mutants die**,
  including both relocations of a wallet `onDelete` (the whole-file negative did its job where a
  sentinel-bounded region would have missed it).
- **Review findings closed** (dispatched back to the owning agents so role separation held):
  - red-team **F1** (cross-file hole: a `store.upsertWallet({balance: 0n})` in `main.ts` shipped
    green under `just ci`) → new `W-UX2B-NO-FABRICATED-WALLET` tooth in `main.wiring.test.ts`.
  - red-team **F2** / desync **N1** (a *false* rationale comment the slice itself introduced:
    `flushBatch` DOES have per-listener isolation; the real unguarded loop is the SDK's
    `#dispatchPendingCallbacks`) → rewritten in `rowConvert.ts`.
  - reviewer/red-team/desync all three flagged **`ARCHITECTURE.md:1212`** (ux2 ledger still said the
    client half is inert and named "**both**" call sites) → `doc-keeper` amended it + added the ux2b
    entry; also the R12 Boy Scout fix (`apply_quest_trigger` is called from `talk`, not
    `advance_dialogue`).
  - `/simplify` **SIMPLIFY 3** (collapse the `callArgs`/`callArgsFrom` split to a default parameter)
    and the source-order call-site index NIT → applied.
  - ADR-0169 tightened: D7 rewritten to match the simplified first-paint recorder; D8 demoted from a
    "decision" to a Consequences scope-disclaimer; residuals 6 and 7 added.
- Client suite after fixes: **1788 passing** (the new cross-file tooth). Code graphs verified fresh.

## REMAINING

1. **In flight:** the e2e tester's second pass on `client/e2e/wallet-balance.spec.ts` — 5 changes
   (identity-scoped `spacetime sql` precondition; correct an overclaiming comment; cut the derived
   first-paint *state* channel and its live-DOM fallback; fix the `MAX_TALK_ATTEMPTS` budget
   contradiction; charset-guard the sql query string).
2. Re-run the **full `just ci`** on the final tree (the green run above predates the review fixes).
3. `verifier` pass — must assert the gating tests were not weakened RED→green.
4. `just adr-digest` re-run + final `wip:`/feat commit, push.
5. Open the PR (`Items:` line, `touches-delta:`, `boyscout-delta:`). **`gh pr merge` is FORBIDDEN —
   supervisor-owned.**

## BLOCKERS

None. Nothing is blocked; the remaining work is sequential close-out.

## FOR THE SUPERVISOR

- **Hidden-dependency STOP (non-blocking, not touched):** `evals/wallet-privacy.eval.mjs:37-43` names
  *this slice* as the owner of a strengthening edit (a positive `FROM my_wallet` anchor for its
  check S). `evals/**` is outside the declared `touches:` set, so it was left alone. **Nothing goes
  red** — check S needles `FROM player_wallet` — and the identical windowed anchor ships in
  `connection.test.ts` under `just client-test`. Re-serialize it into a slice that owns `evals/` if
  you want the fold-in. Verified by running the evals: all pass.
- **ADR 0168 is unallocated** (highest on disk is 0167; 0169 was assigned to this slice). Flagging
  the gap rather than self-assigning.
- **Spec correction:** the 11r-e spec text and ADR-0154 D7 both say **two** `buildShopViewModel`
  call sites (`main.ts:719, 1286` / `:701-708, :1265-1279`). There are **three** — uxd2/ADR-0161 D5
  added `buildShopViewModelForShop` after ADR-0154 was written. `doc-keeper` recorded the correction
  in the spec; the original prose was left as a historical record.
- **`PLAN.md:344-345`** ("Close this milestone when 11r-e merges") is now actionable —
  `PLAN.md` is outside the touch-set, so the close-mark is yours.
- **Strongest named follow-up:** a second identity with a *different nonzero* balance IS reachable
  (`propose_trade`'s currency legs have no proximity guard and are already driven from e2e via the
  `__mrTrade` hook) — `A: 50 → 0` / `B: 0 → 50`, which would prove behaviorally that `0n` renders
  `Gold: 0` and not blank (ADR-0154 D6's "broke ≠ dark", still unit-only). Deferred for **cost**
  (a full propose→respond→confirm round trip through the escrow interlock), **not** reachability.
- **Other follow-ups** recorded in ADR-0169 Consequences: no drift gate binding hand-written
  `Sdk*Row` interfaces to the generated bindings (repo-wide convention risk); `main.ts`'s `identity`
  is never refreshed on reconnect while the auth gate can mint a new one (fails safe — blank, never
  another player's number); `wireTables`' row callbacks carry no `stale()` guard. The same false
  `flushBatch`-isolation rationale also pre-exists at `rowConvert.ts:52`/`:72` and in test prose —
  left alone to stay inside the Boy Scout cap; a follow-up should take the whole family at once.

---

## FINAL STATE — 2026-07-31, terminal (not a park)

**PR #273 open:** https://github.com/mdrewt/monster-realm/pull/273 · branch
`feat/11r-e-wallet-view-completion` @ `d19faa0` · **local `just ci` exit 0 AND local `just e2e`
exit 0 (51 passed)** · remote CI running · `gh pr merge` NOT run (supervisor-owned).

Everything in REMAINING above is now DONE. The one addition after that memo was written: the
**verifier FAILED the first gate** on a real defect — `questLogShows` guarded with `toBeVisible()`
on `#quest-log-overlay`, which is 1280×**0** when the quest list is empty, so the helper could never
pass in the `wanted=false` case it exists for. Fixed by asserting `QuestLogView`'s own inline
`style.display` contract. 11r-e-6/7/8/9 had never run green before that; all six e2e tests pass now,
and the suite-wide `just e2e` is green with no sibling perturbation.

Nothing is blocked. Nothing is parked. This memo is retained only as the audit trail.
