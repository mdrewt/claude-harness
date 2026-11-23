# Tester brief — monster-realm slice ts-6b-12 (retired trade and launcher markup)

Worktree (edit ONLY here, absolute paths): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-12`
Never touch the main checkout at `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm` (outside `.claude/worktrees`).

Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md`, section
"### ts-6b-12 — retired trade and launcher markup" (EARS ts-6b-12.1..12.3) and the triage rows
`R-ts-3-STATICSHELL`, `R-ts-4-CLIENTDEADENDS`, `R-ctl-15-LAUNCHERATTR`. Read it first.

This is a DELETIONS-ONLY slice. You write/update the gating tests (red phase); you do NOT edit
production code (`client/index.html`, any non-test `.ts`). The orchestrator runs the tests and proves
they fail on today's code, then deletes the dead code. You have no shell.

## Contracts (what production will look like after the implementer's deletions)

No new API, no new names. Exactly these removals:

1. `client/index.html`
   - `#tradepropose-overlay` keeps ONLY `<button id="tradepropose-submit" data-testid="tradepropose-submit" type="button">`.
     Removed: `#tradepropose-target` (select), `#tradepropose-monsters` (div),
     `#tradepropose-offer-currency`, `#tradepropose-request-currency` (inputs) and their data-testids.
   - `#trade-overlay` keeps ONLY `#trade-status`. Removed: `#trade-my-side`, `#trade-their-side`,
     `#trade-actions`, `#trade-feedback`.
   - `#chip-start` / `#chip-select` lose `data-menu-launcher` / `data-help-launcher`. Each chip's
     attributes become exactly `id`, `class` (`mr-chip`), `type` (`button`), `data-button`
     (`Start` / `Select`). No element in the page carries either launcher attribute.
   - Element ids that remain are unchanged (no renames).
2. `client/src/ui/tradeSessionModel.ts`: `TradeSessionInput.legacyOfferMonsterIds` is deleted (the
   field and its check in `blockOf`). A monster is `inAnotherTrade` iff the viewer offers it in
   another of their sessions; `fainted` / `inBattle` unchanged; first-match order unchanged
   (fainted, inAnotherTrade, inBattle). Callers (`client/src/ui/screens/tradeSessionScreen.ts`) stop passing it.
3. `client/src/ui/feedbackPolicy.ts`: `MessageKind` and `FEEDBACK_POLICY` lose FOUR toast kinds
   that no code produces (all four belonged to the retired offer/wizard path):
   `'trade-answered'`, `'trade-settled'`, `'trade-offer-sent'`, `'trade-propose-rejected'`.
   Counts become: 16 hint, 32 toast, 10 modal, 1 blocking; 43 non-hint; 59 kinds in total.
4. `client/src/ui/careAction.ts`: `CareActionDeps.onRejected` is deleted (no caller passes it).
   `performCare(deps)` behaviour is otherwise unchanged.

## Test edits to make (all files are in the slice's `touches:`; edit nothing else)

Every edit that changes an existing pin gets a one-line `ts-6b-12 (named intentional change): … Was: …`
comment in the house style already used in these files (grep "named intentional change").
Comments you write state current behaviour. Do not add `.skip`/`.only`/`.todo`.

A. `client/src/indexShell.smoke.test.ts` (12.1, 12.3) — the spec says "deletion only, with no new
   roster assertion": the file passes once its pins on the deleted nodes are dropped.
   - `INNER_IDS['tradepropose-overlay']` → `['tradepropose-submit']`;
     `INNER_IDS['trade-overlay']` → `['trade-status']`. `TEST_IDS` drops the four tradepropose wizard ids.
     (The existing exact `[id]` / `[data-testid]` equality in the frame-layer case then goes RED on
     today's markup — that is the red; do not add a separate absence roster.)
   - The descendant-walk floor (`toBeGreaterThanOrEqual(44)`, "33 descendants … 44 elements") drops by
     the eight deleted descendants (→ 36 elements / 25 descendants); verify against the markup
     yourself (count the `#frame-layer` roots' descendants in `client/index.html` minus the eight
     removed) and fix the comment arithmetic.
   - The `UIF4B.5 … #trade-feedback stays as the named residual …` case: drop the
     "#trade-feedback stays" block and its title clause; the four-retired-lines loop stays as is.
     Retitle accordingly (no "residual" wording).
   - `CTL7A-4-CHIPS-SHELL`: drop the `own`/`other` launcher pins and the two
     `[data-menu-launcher]`/`[data-help-launcher]` count lines; replace with: each chip's
     `getAttributeNames().sort()` equals `['class','data-button','id','type']` (this one exact set
     replaces the old own/other + banned-attribute checks' intent; keep the banned loop if you like —
     it becomes redundant, prefer removing it), and `doc.querySelectorAll('[data-menu-launcher],[data-help-launcher]')`
     has length 0 is NOT needed (the exact set covers the chips; no other element ever had them).
     Fix the WRONG-IMPL comment (it narrates a "delegated click listener" that does not exist:
     chips press through `data-button` in the #game-screen pointer dispatcher, `client/src/input/pointerSource.ts`).
B. `client/src/ui/hintBar.test.ts` (12.3): lines ~113-114 and ~204 pin "the launcher is kept".
   Replace with the shipped nodes' `data-button` being kept (`'Start'`/`'Select'`) and the launcher
   attributes absent (`hasAttribute(...)` false) — RED today. Update the header CONTRACT comment
   ("same nodes, ids and launcher attributes kept" → ids and data-button kept).
C. `client/src/main.controls.test.ts`, `client/src/main.reconnectStack.test.ts` (12.3): every
   `document.querySelector('[data-menu-launcher]')` becomes `document.getElementById('chip-start')`
   (error text `#chip-start is not in the shell`). Rewrite comments narrating "the delegated
   [data-menu-launcher] front door" to: the Start chip, pressed through the pointer dispatcher
   (`data-button="Start"`). Same comment rewording in `client/src/main.chips.test.ts` (~274, ~282),
   `client/src/main.a11yFocus.test.ts` (~1212, ~1217, ~1467, ~1486), `client/src/main.input.test.ts`
   (~1139), `client/e2e/a11y.spec.ts` (~746), `client/e2e/movement-input.spec.ts` (~374: "main.ts
   delegates only on [data-menu-launcher] / [data-choice-idx]" — read `client/src/input/pointerSource.ts`
   and say what is actually true). If any of these tests selects a chip by the attribute, select by id.
D. `client/src/main.reconnectStack.test.ts` (12.2): `UIF4B.5 SO1-2-BOOT-OFFSTACK-TRADE` reads
   `byId('trade-feedback')` and pins a sentinel in it. The node is gone: drop the sentinel lines and the
   title clause "and the reset writes nothing into the residual #trade-feedback node"; keep the
   hide()-delta and stack assertions. Fix the `stale` comment (~934) if it now misstates.
   `client/src/main.input.test.ts` ~1754: comment says "the trade one is an unwritten residual" — make it true.
E. `client/src/ui/screens/socialScreen.boot.test.ts` (12.1, widened): `TRADE_PARTS` →
   `['trade-status']` (+ intentional-change comment). Keep `hiddenTradeParts`.
F. `client/src/ui/tradeSessionModel.test.ts` (12.2 eligibility cases): remove
   `legacyOfferMonsterIds` from the `input()` fixture and from the header fixture comment (monster 24
   "in a legacy offer" → 24 is a plain free party monster; 26 is "fainted AND battle"). Update the
   `ts-3.2 a monster the rule refuses …` expectations: 24 becomes eligible (enabled / null block),
   23 and 20 stay `inAnotherTrade` (offered in session 102 — "a monster in another session SHALL stay
   blocked"), 26 stays `fainted`. Fix every other case whose expectation depended on 24/26 being in
   a legacy offer (grep `24n`, `monster-24`, `'24'`). Make sure at least one case still proves a
   monster offered in ANOTHER session is refused as `inAnotherTrade` while the same monster in THIS
   session is not. Today the fixture without the field makes `blockOf` throw (TypeError on
   `undefined.has`) — that is the red.
G. `client/src/ui/screens/tradeSessionScreen.test.ts` (~97) and `client/src/ui/tradeSessionView.test.ts`
   (~148), `client/e2e/ui-screens.spec.ts` (~122): remove the `legacyOfferMonsterIds` property from
   the fixtures (TS excess-property / compile proof). In `tradeSessionView.test.ts` change NOTHING else
   (spec: it passes unedited for 12.1; its own fixture keeps the wizard nodes to prove the editor
   removes them at construction — leave that).
H. `client/src/ui/feedbackPolicy.test.ts` (12.2): drop the four kinds from `EXPECTED_CHANNEL`; counts
   36→32 toast, 47→43 non-hint, 63→59 total (`ANTI-VACUITY` message too), each with an intentional-change
   comment. RED today (exact-table equality).
I. `client/src/ui/careAction.test.ts` (sibling of a declared code file, allowed): add NOTHING unless a
   test there passes `onRejected` (none does today). No absence tooth needed; the compiler proves it.
J. `client/e2e/trade.spec.ts` (12.2): the `trade overlay DOM elements exist` case keeps
   `#trade-overlay` and `#trade-status` count 1 and drops the four retired lines (do not assert their
   absence — indexShell's exact roster already does). The `trade overlay shows empty sides when no
   active trade` case reads `#trade-my-side`/`#trade-their-side`/`#trade-actions` innerHTML: the
   nodes are gone, so rewrite it to what is still true and meaningful (e.g. the trade root with no
   session shows `#trade-status` and contains no `button` / `[data-action]`), or delete the case if
   nothing meaningful remains — explain which in your report. Update the header comment that says the
   tradeView constructor throws if any of the nodes are missing (it needs only root + status).

## Report back
List each file edited with a one-line summary, and for each of A, B, F, H the exact test titles you
expect to be RED on today's code and why. Flag anything in the spec that looks wrong.
