# ci-fix-20261002T0501Z plan — master e2e red at fb81c649 (wallet-balance `precondition (a)`)

Worktree: `projects/monster-realm/.claude/worktrees/ci-fix-20261002T0501Z` (branch `ci-fix-20261002T0501Z`, base `fb81c649`).
Test-only. No `server-module/`, `game-core/`, `client/src/` edit. No revert of #546.

## Diagnosis (measured — the brief's hypothesis is refuted)

The brief guessed "a preceding test leaves the player in a battle, so ctl-16's guard refuses `talk`".
That is not what happened:

1. **Same failure predates ctl-16.** Master run 36325744282 (2026-09-27, `988c9732`) failed the
   identical assertion with the identical timing signature. PR #546's own e2e run (36957312230)
   passed on the identical merged tree. The spec's player A is a fresh identity created in its
   own `beforeAll`; its `setup` test asserts `ongoingBattle === null`. The `17.5f-2 interlock`
   log line is `trade-interlock.spec.ts`'s expected rejection and prints in green runs too.
2. **The choice click never reached the server.** Every `spacetime sql` call prints a stderr
   warning in real time. The failing log has none after the trade specs: no attempt reached
   `walletBalanceFor`, so all 5 attempts took the `if (!hidden) continue` arm. Phase (a) ran
   ≈125 s = 5 × (5 s swallowed click timeout + 20 s hidden-wait).
3. **Mechanism reproduced locally.** `DialogueView.render()` rebuilds every choice `<button>` on
   every store batch (measured 3.5–5 rebuilds/s with no player input — `movement_tick` NPC
   wander). Playwright's pointer click needs one node attached and stable across animation
   frames. Under CDP `Emulation.setCPUThrottlingRate`: 16× → 1/6 trial clicks time out at 5 s,
   32× → 4/6, call log `element was detached from the DOM, retrying`. The UNMODIFIED spec logic
   with 80× throttle on A during precondition (a) fails with the exact CI message after 5
   attempts, with zero reducer rejections logged (the advance was never sent). Unthrottled the
   whole spec is `6 passed (8.8s)` locally; CI takes ~75 s for it (the runner is that starved).
4. **A second false belief in the spec, also measured.** The spec says a rejected advance
   (`walked_away`) "also deletes the row, so the overlay hides either way". It does not:
   `advance_dialogue` deletes the conversation and then returns `Err`, and SpacetimeDB rolls the
   whole transaction back. PoC: after `advance: walked too far away` the overlay stays open; the
   next click (NPC back in range) succeeds. Not the cause of this red (5 consecutive wander
   rejections ≈ 3e-5 unthrottled, ≈ 1.6e-4 starved — red-team replica of `npc_decide`), but the
   comment is wrong and the retry loop's cost model depends on it.

**Revert-first:** not applicable. Reverting #546 changes nothing the failing path executes (the
advance never reached a reducer) — it would only re-roll the dice. The correct fix is clear,
small and test-only.

## Change (revised after the plan review — reviewer M1/M2/M4, red-team 1/4/6)

The first draft added a `client/e2e/helpers/dialogueChoice.ts` helper plus its own gating spec.
Dropped: a spec whose subject is a test helper is a test of a test (`testing-tdd.md`), and there
is one call site. The fix is one statement in the spec that is red.

| File | Change (authored by the **tester** — it is a test edit) |
|---|---|
| `client/e2e/wallet-balance.spec.ts` precondition (a) | `locator.click({ timeout: 5_000 }).catch(…)` → `locator.dispatchEvent('click', undefined, { timeout: 5_000 })` on the same `getByText(QUEST_CHOICE, { exact: true })` locator. Playwright resolves the node and dispatches a bubbling click in ONE page task, so no rebuild can fall between "found" and "clicked" (measured: 100/100 delivered at 1×–80× throttle, where the pointer click starves). The click still enters production through main.ts's document-level `[data-choice-idx]` delegation → `advance_dialogue`. |
| same test | A per-attempt trail quoted in the failure message: activation delivered or not, overlay hid or not, and every `[status] …` line the client logged DURING that attempt (`reportError` → `console.error('[status]', text)`, captured with `page.on('console')` — a delta by construction; `#status` itself is sticky and would misattribute an older refusal). It separates the four ways this phase can stall: never delivered · refused by the server (reason) · link frozen ("disconnected") · accepted but the row delete never reached the client. No page call is made while composing the failure message. |
| same file, comments | The claims the measurements contradict: "both outcomes of an advance delete the conversation row" (a rejected advance is rolled back; the overlay stays open); the `MAX_QUEST_ATTEMPTS` arithmetic that budgets "5 click"; "the ONLY stochastic element is elder_oak's wander". A call-site note on why this one activation is not a pointer click. |

Unchanged on purpose: the attempt bound (5), the 20 s hidden-wait, the escape valve, every
assertion, and the two `[data-shop-id]` pointer clicks later in the file — those ARE the
user-facing shop-open flow this spec exists to prove, and they carry no 5 s cap (Playwright
retries them up to the test timeout, which absorbs the starvation that reddens (a); the red-team
lens measured that they starve too from roughly 56× CPU throttle — recorded in the red-before file).

Not touched: `server-module/**` (the ctl-16 guards stay byte-identical), `client/src/**`,
`dialogue.spec.ts`, `shop-npc.spec.ts`, `client/e2e/helpers` (declared, not needed).

What the swap gives up, stated: the pointer click also asserted the choice is visible, stable and
hit-testable. That is not this spec's subject (the shop balance is; the dialogue is its
precondition). `dialogue.spec.ts` 13.5c-5 still presses the same choice with a real pointer — but
with the same swallowed 5 s click, so it is exposed to the same starvation (follow-up below), not
an independent net.

## Verification

The gating test is the red test itself: `wallet-balance.spec.ts › precondition (a)`.
- RED on the real defect, watched: master run 36961955966, and locally the legacy spec with 80×
  CDP CPU throttle on A during precondition (a) → the exact CI message.
- GREEN: the tester's spec under the same 80× throttle, and unthrottled end to end.
Recorded in `gates/ci-fix-20261002T0501Z.red-before.md`. No permanent throttle knob and no
test-of-the-test are added — the red run happens once.

What is and is not proven: the mechanism is measured; that it is what happened on the CI runner
is inferred (the job uploads no Playwright artifacts and the swallowed `.catch` discarded the
call log). Timing and frequency are consistent with it — with software GL at the runner's measured
~8× slowdown, 1 in 6 pointer clicks already times out locally. If a rival cause exists (frozen
link, undelivered row delete), the trail above names it on the next red.

## Gates (ledger X1–X3)

- X1 (MANUAL, red-before record) — legacy RED / fixed GREEN under the same starvation.
- X2 the red spec is green end to end, nothing failed/skipped — `npm --prefix client run e2e -- e2e/wallet-balance.spec.ts`, exactly `6 passed`.
- X3 the ctl-16 guards are in force — `cargo nextest run -p monster-realm-module -E 'test(/ctl16_/)'`, `8 tests run: 8 passed`.
Slice gate: full `just ci` with NO server running, then the browser gate with a live server.

## Follow-ups to register after the lenses (none is required for green)

- `DialogueView.render` rebuilds identical choice buttons every store batch (`client/src/ui/` —
  forbidden this slice): keyboard focus on a choice is dropped each batch, and it is the root of
  the pointer-click starvation.
- `dialogue.spec.ts` 13.5c-5 has the same swallowed 5 s pointer click (8 attempts) and repeats
  the false "a rejected advance deletes the row" comment; outside `touches:`.
- `advance_dialogue`'s delete-then-`Err` branches are no-ops (rollback): a walked-away player
  keeps an open conversation although the code, its log line and two specs say it is dismissed.
- The CI e2e job uploads no Playwright artifacts on failure.

## Outcome (2026-10-02)

Shipped as planned in the revised form: one file, tester-authored in two rounds (round 2 = lens
fixes: `dispatched` wording, progressive stdout trail, comments naming what stays a pointer click).
Lenses: plan reviewer + plan red-team; artifact reviewer (no blockers), red-team (3 mediums — two
folded in, one accepted and recorded), verifier PASS with its own mutants. `reducer-security-auditor`
and `desync-guard` not run: the diff has no server, game-core or client/src line. `/simplify` not
run: test-only change. Full `just ci` exit 0; ledger 3/3 met. Four residuals registered
(DIALOGUEREBUILD, DIALOGUESPECCLICK, WALKEDAWAYROLLBACK, E2EARTIFACTS).
