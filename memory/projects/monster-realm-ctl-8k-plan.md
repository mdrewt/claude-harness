# ctl-8k plan — the session gate as an in-frame system modal (CTL8K.1)

Worktree `projects/monster-realm/.claude/worktrees/ctl-8k`, branch `ctl-8k`, base fe476b5b.
Planner: agent a3d8812e28e3b6266. Orchestrator amendments marked (ORCH).

## Scope
touches: sessionView.ts, sessionView.test.ts (NEW), sessionModel.ts, sessionModel.test.ts,
catalog.en.ts, catalog.fr.ts, messageIds.ts.
touches-delta (sibling test of the catalogs, spec precedent "as every ctl-8 screen slice will need",
M-postgate-console-controls ctl-8a build note): `client/src/ui/i18n/catalog.test.ts` (roster 283 -> 285
+ EXPECTED_PLAIN/FR pins).
(ORCH) New ids go in a `session.*` namespace, NOT `chrome.session.*`: resolver.test.ts RESOLVER-T
exact-snapshots every plain `chrome.*` value and is outside touches. `session.*` keeps the delta to the
one precedent-blessed sibling test.

## Core / shell
- VM (sessionModel.ts) owns all copy: SessionViewModel gains `retryLabel` (session.retry),
  `confirmYesLabel` (prompt.yes), `confirmNoLabel` (prompt.no), `hint` (session.hint).
  `primaryActionLabel` stays = Continue label (doc comment: Continue is not the default).
- View may NOT import t() (catalogParity.test.ts pins the 25 resolver importers; hardcodedStrings scans
  sessionView.ts). View owns placement, visibility, focus. Armed = vm.confirmPrompt !== undefined.

## DOM contract
- `#session-overlay` in frameAnchor() (#frame-layer ?? #game-screen ?? body); classes
  `mr-frame mr-shell mr-shell--top` (z 120; appended after static menu/help so wins the tie; battle 110).
  Inline style: display only. No role / aria-modal / aria-live.
- Children order: session-title(h2), session-body(p), session-feedback(p), session-confirm(p),
  session-retry-btn, session-continue-btn, session-continue-confirm-btn (Yes),
  session-continue-cancel-btn (No), session-hint(p).
- hidden: root display:none. expired|unreachable unarmed: title, body, hint, Retry, Continue shown with
  text; prompt/Yes/No hidden. armed: title, body, hint, prompt, Yes, No shown; Retry/Continue hidden.
  Feedback iff vm.feedback. Never `disabled`. Every shown node gets display='' explicitly.

## Focus
- Open edge (visible read BEFORE display write): focus armed ? No : Retry (system modal: takes focus).
- Already open: reseatRow(rows, focused, {was, now}, noBtn, continueBtn) behind the precedent guard
  (no-op when focus is outside the frame and not on body). Arm -> No; disarm -> Continue; plain
  re-render moves nothing.

## Copy
- session.retry: EN "Retry" / FR "Réessayer".
- session.hint: EN "B and Start do nothing here. Choose an option above." /
  FR "B et Start sont sans effet ici. Choisissez une option ci-dessus."

## Tests (tester; names end with `:`)
sessionModel.test.ts: CTL8K-1-VM-LABELS, CTL8K-1-VM-FR, CTL8K-1-VM-FIRST-STEP-CLEAN.
sessionView.test.ts: CTL8K-1-RED-EXPIRED, -UNREACHABLE, -IN-GAME-SCREEN, -ORDER, -RETRY-DEFAULT,
-OPEN-ARMED, -NO-STEAL, -ARM-NO-DEFAULT, -UNARMED-HIDDEN, -DISARM-CONTINUE, -HINT, -FEEDBACK, -REOPEN,
-HANDLERS, -NO-LIVE-REGION.

## Gate
CTL8K.1 CHECK = vitest JSON over sessionModel.test.ts + sessionView.test.ts, every tag passed exactly
once, ctl-8h parser form. EXPECT `ctl-8k-CTL8K.1:PASS`.

## Residuals (register after lenses)
- R-ctl-8k-GATEDPAD [ux-a11y/MED]: gamepad A / D-pad arrows never reach the gate (main.ts onKeyDown
  swallows them while sessionGateBlocks()); keyboard Tab + Enter/Space on the focused native button
  works, so the dead end is gone for keyboard. Needs main.ts.
- R-ctl-8k-MODALA11Y [ux-a11y/LOW]: no focus trap / role=dialog (registry-external, D17).

## REV 2 — plan-lens amendments (reviewer a424008739089c34e APPROVE-minor; red-team a4aa5d078af6b9b60)
- Root shown value is `'block'` (the `visible` getter treats '' as hidden); children use ''.
- `wasArmed` is DOM-derived (`No` button shown) and read BEFORE the repaint (privacyView #armed idiom).
- Every button: native <button>, `type="button"`, no aria-label, single text child.
- Open-edge focus happens AFTER every display write (tests wrap HTMLElement.prototype.focus to fail
  if the target or any ancestor is display:none at call time; exactly one focus() per edge).
- Close edge (visible -> hidden): if focus is inside the overlay, blur it (no focus left in a hidden
  subtree).
- Held Enter: the overlay's own keydown listener preventDefaults `e.repeat` keydowns, so a held
  Enter on Retry fires one click, not one per OS repeat (gate returns before main.ts's repeat check).
- Labels re-painted on EVERY render (locale switch + state switch while open).
- Hint copy names the real keys (arrows are swallowed under the gate; Tab is free):
  EN "B and Start do nothing here. Tab moves, Enter chooses."
  FR "B et Start sont sans effet ici. Tab pour changer, Entrée pour choisir."
- Armed hides Retry and defaults to No: intended reading of the spec's sub-bullet.
- Tests added: CTL8K-1-NO-REPEAT, CTL8K-1-LOCALE, CTL8K-1-CLOSE-BLUR, CTL8K-1-Z-ORDER (real
  client/index.html fixture: session root after #menu-overlay/#help-overlay, in #frame-layer).
  Visibility walk checks display, `hidden`, visibility, aria-hidden, inert up to <body>.
  Labels compared per id with distinct strings; focused armed button's text === No label and its
  click fires onConfirmCancelled; ownership(btn, Enter|Space|NumpadEnter) === 'target'.
- Residual add: R-ctl-8k-LOCALESTALE (LOW) — nothing re-renders the gate on a locale change.
