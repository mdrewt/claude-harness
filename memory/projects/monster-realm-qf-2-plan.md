# qf-2 plan — care feedback routes to the invoking surface

Worktree: projects/monster-realm/.claude/worktrees/qf-2 (branch slice/qf-2, from origin/master f7f2a531).
Spec: specs/monster-realm-v2/M-pt3-quickfix.spec.md §qf-2 (QF2.1–QF2.3). Size LIGHT.

## Delivered code it builds on (verified)
- main.ts `dispatch` arm `care` (≈1615): `performCare({..., showFeedback: (m) => raisingView?.showFeedback(m)})`.
  Both care invokers funnel here: the Monsters sheet (screenHost button → monstersScreen `care`
  command → dispatch) and the Raising card's `onCare` callback (main.ts ≈3481).
- RaisingView.showFeedback no-ops while hidden (raisingView.ts ≈378). With the Monsters frame on top,
  raising is hidden → every sheet care outcome is swallowed (pt3-2026-10-048).
- main.ts arm `train` → `sendGuarded('train', …)` → rejection on the global status line via
  `reportError`, never on the sheet. Success already shows via the screen's pending-feed "Fed {name}".
- BoxView feedback line renders only `MonstersPaint.feedback` (movedToParty/movedToBox/fed), set from
  monstersScreen state (out of touches) — no external-message entry point.
- Command type lives in ui/screens/types.ts (OUT of touches) → no `origin` field on the command.
- No catalog key for the care cooldown exists: the rejection line is `reduceErrorMessage(err,'care')`
  = `care: care cooldown not yet elapsed` (server SenderError pass-through) — the same line the
  Raising screen shows today (pt3-2026-10-057 positive remark). catalog.* is out of touches (qf-3
  owns the catalogued cooldown hint). QF2.2's "existing keys" is read as: no new keys; the line is
  the existing performCare rejection path. Spec note to add.

## Design (imperative shell only; no game rule touched)
1. boxView.ts — an outcome line beside the screen's feedback:
   - `feedbackLine(): (message: string, kind: 'ok' | 'error') => void` — returns a sink BOUND TO THE
     CURRENT OPEN (an open counter bumped on the hidden→visible edge). The sink no-ops when the view
     is hidden or a later open has happened (stale-message guard, stronger than raising's: a
     reopen-before-settle never inherits the old line).
   - kept `#outcome: {text, kind} | null`; `#apply` renders `p.feedback` when non-null (kind ok),
     else `#outcome`, else hides + clears the line. textContent only (server reason text).
   - `paint(p)` clears `#outcome` (a screen repaint = a button or a state change; "every button ends
     the last line"); `refresh()` keeps it (a batch must not wipe the answer); `hide()` clears it.
2. main.ts:
   - `const sheetLine = () => upperIds().at(-1) === 'boxView' ? boxView?.feedbackLine() : undefined`
     — the invoking surface is decided AT THE SEND (top frame), not at the settle.
   - care arm: `const cared = i18nT('raising.feedback.cared'); const line = sheetLine();`
     `showFeedback: line !== undefined ? (m) => line(m, m === cared ? 'ok' : 'error')
                                       : (m) => raisingView?.showFeedback(m)` — raising path unchanged
     (QF2.3: its hidden no-op guard stays).
   - train arm: `sendGuarded` gains an optional 4th param `report: (text) => void = reportError`; the
     train arm passes `(t) => line(t, 'error')` when the sheet invoked it (rejection + disconnected
     arms land on the sheet line). Raising/Bag-invoked train unchanged (status line).
3. boxModel.ts: no change expected (no pure logic gained). Declared, unused if so.

## Anti-patterns avoided
- Sink chosen at settle time (a close/reopen between send and settle would misroute) → chosen at send.
- Visibility-only selection (`boxView.visible`) → top-of-stack is the invoker (both could be shown).
- Optimistic success → performCare ordering untouched.
- innerHTML → textContent only.
- New catalog keys / Command fields → out of touches; not needed.

## Tests (tester; gating, named QF2-…)
boxView.test.ts (unit, happy-dom):
- QF2-1-VIEW-OUTCOME-LINE: a sink from an open view paints ONE `.mr-frame-feedback` line with the
  exact text and data-feedback ok|error per kind; markup in the message stays literal text.
- QF2-1-VIEW-HIDDEN-NOOP: a sink called while hidden paints nothing; hide() clears a painted
  outcome; a sink from a previous open no-ops after hide()+show() (no stale line on reopen).
- QF2-1-VIEW-PAINT-CLEARS: a later paint() ends the outcome line (screen feedback wins / null clears);
  a refresh() keeps it.
main.controls.test.ts (runtime boot, real dispatch), with a test-local way to make the care/train
reducer reject with a SenderError-shaped error:
- QF2-1-BOOT-SHEET-CARE-OK: V → A on the monster → Down to Care → A; after settle the Monsters
  frame's feedback line reads i18nT('raising.feedback.cared') (data-feedback ok); the raising
  view's line stays empty; nothing on #status.
- QF2-2-BOOT-SHEET-CARE-COOLDOWN: care rejects with "care cooldown not yet elapsed" → the box line
  reads `care: care cooldown not yet elapsed` (data-feedback error). Also under ?locale=fr if the
  harness supports it cheaply (the success line's fr value).
- QF2-1-BOOT-SHEET-TRAIN-REJECT: Feed… → A on a food → train rejects → the box line shows
  `train: <reason>` error; the status line does not.
- QF2-3-BOOT-RAISING-OWN-LINE: care from the Raising card (KeyI or the menu, click Care) paints on
  raising's own line, not on the box line (box hidden); the hidden-raising no-op guard stays.

## Gate CHECKs (filled after red tests exist; counts pinned)
- QF2.1: vitest boxView.test.ts + main.controls.test.ts -t "QF2-1-"
- QF2.2: vitest main.controls.test.ts -t "QF2-2-"
- QF2.3: vitest main.controls.test.ts (or main.dispatch.test.ts) -t "QF2-3-"

## Risks
- A batch that changes monstersScreen state repaints and clears the outcome early (only when the
  screen's own state moved — acceptable; documented).
- train's pending feed stays pending after a rejection until the next button (screen-owned, out of
  touches) — harmless: it only resolves to "Fed" if the count drops.

## Plan review (reviewer+red-team, sonnet) — adopted revisions
- R1 (major): care success rewrites monster_pub (trust/quality-time → evolution `met`/`unmetReason`
  in monstersScreen's `shown` signature) → observe repaints → "paint clears outcome" would erase the
  line in the common case. REVISED: `paint()` and `refresh()` both KEEP the outcome; it ends only on
  `clearOutcome()`, which main.ts's router `screen:` callback calls before `screenHost.button`
  (every routed button ends the last line), and on hide(). `#apply` shows `p.feedback` first, else
  the outcome.
- R2 (major): the sink is chosen at the CALL SITE: `dispatch(command, line?)` — only
  `applyRouterEffect`'s `command` arm passes `line` (= boxView.feedbackLine() when
  `upperIds().at(-1) === 'boxView'`). View callbacks (raising onCare/onTrain) never pass it.
- R3: sheet train rejections keep `console.error` + `pushError('reducer', …)` — `reportError(text,
  line?)` paints the sheet line INSTEAD of #status when given one, ring/console always.
- R6: name the success constant; ok iff message === successMessage.
- QF2.2 wording: no cooldown catalog key exists; the line is the existing performCare rejection
  (`care: <server reason>`, untranslated in fr). Spec note + qf-3 owns the catalogued hint.
