# pgcc-a plan — one feedback-action core (A1, A3, A4)

Base: origin/master efd3f3a0 · worktree `.claude/worktrees/pgcc-a` · branch `pgcc-a`.

## Core (client/src/ui/careAction.ts — generalised in place)
- Keep the names `performCare` / `CareActionDeps`. The spec says "generalised in place", and keeping
  the names leaves raisingView.ts's comment "performCare never rejects" (outside `touches:`) true.
- Change the deps to `{ call, successMessage, where, showFeedback }`:
  - rename `callCare` to `call`;
  - `successMessage: string` is resolved by the CALLER, because the i18n census requires every
    `t()` key to be a literal at its call site;
  - `where: string` is the reduceErrorMessage tag.
- Arms are unchanged:
  - a synchronous throw → `reduceErrorMessage(err, where)`;
  - `undefined` → `t('chrome.feedback.disconnected')`;
  - await then `successMessage`;
  - a rejection → `reduceErrorMessage(err, where)`.
- Delete `CARED_MESSAGE`.

## i18n (A3)
- New key `raising.feedback.cared`, en `Cared!`, plus a fr entry. Add it to the messageIds union and
  to both catalogs with `@desc` and a citation.
- Update the stale citation comments (`careAction.ts:32`, `main.ts:2638 (and 7 sibling…)`).

## Shell (client/src/main.ts)
- `liveReducers()` local accessor: `conn === undefined || conn.linkFrozen() ? undefined : conn.live()?.reducers`.
- One visibility closure per view: shop, trade, rename and tradePropose. RaisingView guards itself.
- The nine sites become `performCare({ call: () => liveReducers()?.X(args), successMessage:
  i18nT('<existing key>'), where: '<existing tag>', showFeedback: <view closure> })`.
- Care passes `i18nT('raising.feedback.cared')` and `'care'`.
- Trade-propose's `new Identity(...)` moves inside `call`, so a throw while building the args lands
  in the core's sync-throw arm.

## Named test changes (spec amended 2026-10-01, A1 sub-bullet)
- careAction.test.ts: call sites pass `call` + care's message + `'care'`.
- catalog.test.ts: EXPECTED_PLAIN gets +1 row (`raising.feedback.cared`).
- catalogParity.test.ts PARITY-02: the main.ts literal set loses `chrome.feedback.disconnected` and
  gains `raising.feedback.cared`.
- New: main.feedbackCore.test.ts, a booted test of the A4 hidden-overlay no-paint for each view
  closure, plus the care fr line through the real raising overlay.

## Anti-patterns avoided
- No second module.
- No wrapper around performCare.
- No dynamic `t(key)` call.
- No source-text scan tests.
