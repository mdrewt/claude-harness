# Tester brief — ts-6b-14 (comment, doc and test-infrastructure accuracy)

You are the `tester` for slice `ts-6b-14` of Monster Realm. You own every edit this slice makes
inside test files. You do not implement anything else and you have no shell: the orchestrator runs
every suite after you finish.

**Worktree (edit files here, by absolute path, with Read/Edit only):**
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-14`

Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md`,
section `### ts-6b-14 — comment, doc and test-infrastructure accuracy; closes the sweep` (near the
end of the file). Standard: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`.

## What this slice is

A sweep batch that makes stale comments true and fixes one piece of test infrastructure. No
production logic changes. Your part has exactly two kinds of edit:

1. **One test-infrastructure change** (criterion ts-6b-14.10): seed one `fc.assert`.
2. **Comment and assertion-message truth** in test files (criteria .1, .3, .4, .5, .6, .7, .8).

## Hard rules

- Change ONLY: comments; string literals that are assertion MESSAGES (the second argument of
  `expect(…, 'message')` or a `panic!`/`assert!` message); and the one `seed` option below.
- Change NO assertion, expected value, matcher, test name (`it('…')`, `test('…')`, `describe('…')`,
  Rust `fn` names), fixture, import, selector or control flow. Test names are selected by ledgers:
  leave every one byte-for-byte, even when the name itself mentions something stale.
- Every comment line you ADD or CHANGE states what the code does today, in the present tense, with
  the reason if there is one. On such a line there must be:
  - no slice / milestone / decision / finding id (`ctl-11b`, `ts-3`, `bt-4`, `m23-s5`, `21r-e`,
    `M12c`, `M13.5c`, `ADR-0206`, `RT-M13.5C-03`, `R-ctl-…`). Upper-case test tags such as
    `CTL11B-1-BOOT-OUTSIDE` or `S5T-GATE-ALLOWED-CANVAS` are test names and are fine;
  - none of these history phrasings: "used to", "no longer", "previously", "formerly", "before
    this", "prior to this", "at master", "retired", "the old", "this replaced", "replaces the
    old/previous/former", "was changed/moved/removed/renamed/added/fixed/rewritten/split/merged",
    "since the fix/refactor/rewrite/change/migration", "regressed from", "Was:".
  A scanner reads every line the diff adds, so when you reword one line of a block and the line
  you rewrite also carries an id, the rewritten line must not. Prefer the smallest diff: touch
  only the lines that are wrong, and do not reflow untouched lines.
- Do not delete a comment's still-true content (what a test proves, which wrong implementation it
  kills). Replace the false part with the true statement.
- A comment that only records history ("X was deleted by …", "this case used to assert …") and has
  no present-tense content left is reduced to the present-tense fact it implies, or removed if
  nothing remains.
- Stay inside the worklist. If you find another stale claim in these files that the worklist does
  not name, do NOT fix it: list it in your report. Do not touch any file not listed below.
- TypeScript comments stay within 100 columns and keep the surrounding indentation and comment
  style (`//` vs `/* */`). Rust comments keep their `//` / `///` / `//!` style.
- `client/e2e/wallet-balance.spec.ts` currently holds ONE temporary line containing the text
  `TEMPORARY deliberate failure` — it is the orchestrator's. Leave that line exactly as it is.
- Verify each fact below against the code before you write it (read the cited file). If the code
  disagrees with this brief, the code wins: write what the code does and say so in your report.

## Contracts

No new interface. The tests call only what already exists.

| What | Signature / shape | Where |
|---|---|---|
| fast-check run options | `fc.assert(property, { numRuns: 500, seed: 1 })` — `seed` is fast-check's `Parameters.seed?: number` | `client/src/ui/contextStack.test.ts`, test `reconcile over generated stacks of stamped, unstamped and foreign-battle frames follows the independent oracle and is idempotent` |
| Subject of that property | `reconcile(stack, view)` from `client/src/ui/contextStack.ts` (unchanged) | same |

Test files and (for Rust) module names:

| Path (relative to the worktree) | Runner / module |
|---|---|
| `client/src/ui/contextStack.test.ts` | vitest |
| `client/src/ui/overlayA11y.test.ts` | vitest |
| `client/src/main.accel.test.ts` | vitest |
| `client/src/main.input.test.ts` | vitest |
| `client/src/main.a11yFocus.test.ts` | vitest |
| `client/src/ui/evolutionNotice.test.ts` | vitest |
| `client/src/main.battle-reseed.test.ts` | vitest |
| `client/src/ui/screens/worldScreen.test.ts` | vitest |
| `client/src/ui/screens/requestHost.test.ts` | vitest |
| `client/e2e/wallet-balance.spec.ts` | Playwright |
| `server-module/src/monster_mgmt_tests.rs` | cargo, module `monster_mgmt::monster_mgmt_tests` |
| `game-core/src/tactics/golden_tests.rs` | cargo, module `tactics::golden_tests` |
| `game-core/src/trading/rules.rs` — ONLY inside `#[cfg(test)] mod tests` (from the line `#[cfg(test)]` near line 496 to the end) | cargo, module `trading::rules::tests` |

## Worklist

### A. ts-6b-14.10 — `client/src/ui/contextStack.test.ts`

1. In the test named in Contracts, change the `fc.assert` options from `{ numRuns: 500 }` to
   `{ numRuns: 500, seed: 1 }`. Nothing else in the property, the oracle or the two floors
   (`toBeGreaterThan(50)`) changes.
   Why (measured by the orchestrator, recorded in
   `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/gates/ts-6b-14.red-before.md`):
   unseeded, 5 of 40 000 seeds give 50 or fewer kept stamped frames (seed 271 gives 46) and fail
   the `> 50` floor; with seed 1 the sample is 89 kept and 1730 dropped on every run.
   Add a short comment at the options saying the seed fixes the generated sample, so the two
   floors below read the same counts on every run (89 kept, 1730 dropped), and that the counts
   move if the `scenario` arbitrary or the fast-check version changes.
2. The comment near line 2282 says talk is covered "by the booted KeyT movement-gate test
   CTL2-3-BOOT-B17 in main.input.test.ts". There is no T interact key: at the world base A acts on
   the faced target and Y opens its action sheet. That test's own title says "A does not interact"
   at a battle base. Reword that clause so it names the test without the key.

### B. ts-6b-14.4 — the focus rule (`worldHasFocus` no longer exists anywhere in `client/src`)

The current rule, to state wherever a comment narrates the deleted predicate:
- `client/src/input/router.ts`: `outsideGameScreen(target, screen)` is true for an element outside
  `#game-screen` that is not `<body>`/`<html>`; `ownership()` returns `'target'` for it. main.ts's
  keydown handler returns early on `outsideGameScreen(e.target, gameScreenEl())`. So: a key whose
  target is an element outside `#game-screen` is the browser's, every key.
- Every other key goes through `ownership()`: a text field keeps its typing keys, a focused button
  or link keeps Enter/Space, an IME composition stays with its target; the rest is the router's.
  Do NOT write "a key inside the game screen is the router's" — that is false.
- Nothing reads "does the world have focus". An accelerator or Start works whether focus is on
  `<body>`, the canvas or a control inside `#game-screen`.
- main.ts's frame loop returns focus to the world canvas when the last overlay's close left focus
  adrift, and a keydown first heals focus stranded inside a hidden subtree
  (`focusInsideHiddenSubtree()` → `worldCanvasEl?.focus()`).
- An overlay's initial focus is deferred (`setTimeout(0)` in `ui/overlayA11y.ts`), so in a
  synchronous burst `document.activeElement` is still `<body>` after an open.

Sites (remove every mention of `worldHasFocus` from these five files' comments and messages; do
not rename tests):
- `client/src/ui/overlayA11y.test.ts` ~line 308: the assertion MESSAGE ends "…is what
  worldHasFocus() already treats as world-focused". True statement: with no fallback and a detached
  return target there is no focus call at all, and focus rests on `<body>`, where a key is still
  routed to the game.
- `client/src/main.accel.test.ts` ~line 1203 (the WRONG IMPL KILLED comment of
  `CTL11A-SELECT-HELP-OVER-BATTLE`): it describes "today's toggleHelp arm, which opens only when the
  world has focus (… AND `worldHasFocus()`)". Describe the wrong implementation without the deleted
  name: a Select that opens Help only while focus is on the world, so it does nothing while the
  battle overlay holds focus.
- `client/src/main.input.test.ts` ~lines 1592 and 2341: "…so no overlay's deferred initial focus
  ever fires and `worldHasFocus()` stays true for the next open." True: every case is synchronous
  after boot, so no overlay's deferred initial focus runs and focus stays on `<body>`.
- `client/src/main.a11yFocus.test.ts`: the header HISTORY paragraph (~lines 48-54) and the sites
  near lines 459, 547, 680, 771, 891, 1076, 1108, 1473, 1493 and 1506. For each, keep what the
  test pins today and drop the narration of the deleted predicate. The header paragraph becomes a
  statement of the current rule (above) and of what the suite's "gate" cases pin now. Where a
  comment describes a WRONG IMPL as "a `worldHasFocus()` conjunct", describe it as a focus test on
  the open (any check that refuses an accelerator or a chip because focus is not on the world).
  Do not chase this file's other history notes (for example the `#help-hint` ones): out of scope.

### C. ts-6b-14.5 — `client/src/ui/evolutionNotice.test.ts`

The comment at the top of `20r-d EN-BANNER-LAYOUT BITES …` (~line 578) says z-index 60 sits above
`#help-hint` (50). `#help-hint` does not exist. The element at z-index 50 is the hint bar
(`#hint-bar`, class `mr-hint-bar`, `client/src/styles.css`); overlay shells (`.mr-shell`) are at
100, the battle roots at 110 and the menu/help shells at 120. State the stacking facts that hold:
60 is above the hint bar and below every overlay shell. The comment also says "an open modal's
opaque backdrop covers it" — check `styles.css` (`.mr-shell` is inset from the edges, the dialogue
dock `.mr-dock` is transparent) and keep only what is true; if you cannot confirm that every
overlay covers the banner, say that a shell that paints over the banner's strip sits above it.

### D. ts-6b-14.6 — `client/src/main.battle-reseed.test.ts`

The battleStart/battleEnd latch lives in `client/src/ui/battleEmitModel.ts`:
`BattleEmitState { activeBattleId, reseedPending, reseedPrevBattleId }`, `battleEmitStep(state,
{ hydrated, latest })`, `armReseed(state)`, `resetBattleEmit(state)`. main.ts keeps `battleEmit`
and the flag `hydratedSinceReconnect`; its battle-emit batch listener wraps `battleEmitStep` in
`try { … } catch (err) { console.error('[obs] battle', err) }`; `onReconnect` calls
`armReseed(battleEmit)` and sets `hydratedSinceReconnect = false` unconditionally; `armReseed`
keeps the FIRST capture while a reseed is pending.

Fix, in comments and in the assertion messages near lines 390 and 856:
- every quote of latch code that does not exist: `battleReseedPending`, `if (!battleReseedPending)`,
  the self-arming snippet near lines 740-742. Name the real symbols (`reseedPending` on
  `BattleEmitState`, `armReseed`'s first-capture rule, `battleEmitStep`'s `hydrated` input). A
  comment describing a hypothetical WRONG implementation may keep its sketch, but written against
  the real names.
- every line-number cite: `main.ts:1828-1830`, `main.ts:1828`, `main.ts:2174`, `main.ts:1852`,
  `store.ts:895-900`, `store.ts:602-605`, `connection.ts:659`, `eventRing.ts:19,53`,
  `eventRing.ts:53`, `main.wiring.test.ts:20-21`. Cite the symbol instead: main.ts's battle-emit
  listener; main.ts's ranked-match listener; the `WorldRenderer` construction in main.ts;
  `AuthoritativeStore.latestPlayerBattle` / `upsertBattle` in `net/store.ts` (read the file to
  confirm which symbol each cite meant); the identity assignment in `connect()`
  (`net/connection.ts`); `makeConnect` / the `connect` payload in `ui/eventRing.ts`.
  If you cannot find the symbol a cite meant, drop the cite and keep the sentence true.

### E. ts-6b-14.1 — retired trade reducer names in test comments

Facts: `propose_trade`, `respond_trade` and `confirm_trade` each return one fixed error and read or
write no row (`server-module/src/trading.rs`). Trades run through `open_trade_session`,
`set_trade_offer`, `confirm_trade_session`, `cancel_trade_session`
(`server-module/src/trading_session.rs`); `confirm_trade_session` reaches `execute_swap`, which
calls game-core's `check_headroom` and `build_swap_plan`, and `apply_swap` applies the plan. The
`trade_offer` table is drain-only: `cancel_trade`, the TTL reaper, a disconnect or account deletion
remove a row and nothing inserts one. game-core's `validate_proposal`, `authorize_respond` and
`authorize_confirm` have no caller outside their own tests.

- `client/src/ui/screens/worldScreen.test.ts` ~lines 371-373 and
  `client/src/ui/screens/requestHost.test.ts` ~lines 36-38: each comment ends with a "Was: …
  respondTrade accepted true / false" history sentence and opens with a slice tag. Rewrite each as
  the present fact only: a trade request is an incoming session, its key is `session-<sessionId>`,
  Accept opens the editor (`openTradeEditor`) and Decline cancels the session
  (`cancelTradeSession`).
- `server-module/src/monster_mgmt_tests.rs` ~line 245, the roster row
  `trading.rs confirm_trade -> trading_tests nh_trade_confirm_*`: the trade write site is
  `trading_session.rs apply_swap`, driven by `trading_session_tests ts0a_apply_swap_*` and
  `trading_tests nh_21re_apply_swap_*` (confirm both test-name prefixes exist before writing them;
  keep the column alignment of the neighbouring rows). Do not change the "20 sites in 19
  functions" count.
- `client/e2e/wallet-balance.spec.ts` ~line 86: "A second identity with a DIFFERENT nonzero balance
  IS reachable via `propose_trade`'s currency legs". Today the route is a trade session's currency
  (`set_trade_offer`, then both sides' `confirm_trade_session`). The same block cites `ADR-0169`;
  if you rewrite that line, state the fact without the id.
- Same file ~line 89: "npc.rs:19 `TALK_RANGE = 2`". The constant is game-core's
  (`game-core/src/npc/mod.rs`, `TALK_RANGE`), read by the server's talk check. Cite the symbol.
- `game-core/src/trading/rules.rs`, inside `mod tests` only: comments that name `propose_trade`,
  `respond_trade` or `confirm_trade` as the live caller or as where a check lives (reported near
  lines 857-902, 1078, 1093, 1401, 1436, 1482, 1543, 1558 — search the module for all three names).
  Rewrite each to what is true now: the rule under test and, where the comment names its caller,
  the live one (`trading_session::execute_swap` for `check_headroom` / `build_swap_plan`), or "no
  reducer calls this rule" for `validate_proposal` / `authorize_respond` / `authorize_confirm`.
  Keep each test's explanation of what a wrong rule would let through; only the caller/location
  claims change. Do not edit above the `#[cfg(test)]` line: the orchestrator owns the production
  doc comments in this file.

### F. ts-6b-14.7 — `client/e2e/wallet-balance.spec.ts`, a refused dialogue advance

Fact (`client/src/main.ts`, the `advanceDialogue` dispatch arm): the server refuses a reply chosen
too far from the NPC, in another zone or with the NPC gone, and writes nothing. For exactly those
refusals the client then sends `dismiss_dialogue`; the server's row delete is what hides the
overlay (the client never hides it itself). Any other refusal leaves the dialogue open. So after a
walked-away refusal the overlay closes and the next attempt talks again.

Two comments say the opposite ("the overlay stays open", "the next one re-activates the still-open
dialogue without a fresh talk"):
- the doc comment above `MAX_QUEST_ATTEMPTS` (~lines 816-820) — also re-check the sentence about
  the attempt spending "its full 20 s hidden-wait" against the test body and correct it if the
  refusal now hides the overlay sooner;
- the banner comment above `test('precondition (a): …')` (~lines 932-936).
Rewrite both to the fact above. Read the test body (`if (!(await overlay.isVisible())) await
talkToElder(…)`) so the comment matches what the loop does.

### G. ts-6b-14.3 — `game-core/src/tactics/golden_tests.rs`

The doc comment on `CASE_COUNT` (~line 99) says "Growing it (BT2.5, BT4.8, BT11.7 join the
harness) is a deliberate edit here AND in the vitest." The harness has 18 case kinds (`KINDS`); the
forecast export is checked by its own parity test over this fixture's Pipeline cases and adds no
kind, so the forward reference is false. State only: growing the fixture is a deliberate edit to
this constant and to the matching literal in the vitest
(`client/src/tactics/golden.parity.test.ts`). Leave the rest of the file's header alone.

## Report back

1. Per file: the sites you changed (line and one-line before → after summary).
2. Any fact in this brief that the code contradicted, with the file and line you read.
3. Stale claims you saw in these files but left alone because they are outside the worklist.
4. Confirmation that no assertion, expected value, test name, import or fixture changed.
