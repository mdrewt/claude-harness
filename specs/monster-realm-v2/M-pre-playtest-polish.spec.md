# Spec: M-pre-playtest-polish — client focus/rebuild, hidden-overlay and accessibility residuals

**Status:** specced 2026-10-05 · build-ready · **Project:** monster-realm. Client-only. Requested by the operator on 2026-10-05 (before Playtest-3). Folds MED/LOW residuals that a player feels in a playtest: dropped focus, lost clicks, a hidden screen, a stale claim code. **Anchors are symbols, not lines.** **Doctrine:** `standards/testing-tdd.md` (no new eval scripts; no source-text scans).

## Problem / intent

Several measured client defects survive the controls redesign:
- Views that rebuild identical buttons on every store batch drop keyboard focus and starve pointer clicks.
- Some measurements predate ctl-7a/8d/15 and may already be fixed. **Re-measure first; a residual that no longer reproduces is closed with a one-line note, not re-fixed.**

### polish-1 — stop needless view rebuilds, keep Social visible, clear the claim code, announce menu feedback
category: ux-a11y · severity: MED · size: LIGHT
touches: client/src/ui/dialogueView.ts, client/src/ui/dialogueView.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/frame.ts, client/src/ui/frame.test.ts, client/src/ui/screens/mainMenuScreen.ts, client/src/ui/screens/mainMenuScreen.test.ts, client/src/ui/claimModel.ts, client/src/ui/claimModel.test.ts, client/src/ui/sessionView.ts, client/src/ui/sessionView.test.ts, client/src/main.ts, client/src/main.claimCode.test.ts
after: []
- Residuals folded: R-ci-fix-20261002T0501Z-DIALOGUEREBUILD, R-ctl-7b-BOXVIEWREBUILD, R-ci-fix-20261002T0901Z-MENUPVPHIDDEN, R-R-rb-128-E1-CLAIMCODERETAINED, R-weekly-review-2026-10-02-F3, R-ctl-8k-LOCALESTALE.
- Shape to copy: `pvpView` / `raisingView` `#renderIfChanged` (skip when the view model is unchanged, per-container render keys).
- Out of scope, do NOT touch: server code, `module_bindings`, `Cargo.lock`, `package-lock.json`.
- If a fix needs a file outside `touches:`, DEFER it as a residual; do not widen.

- **P1:** WHEN the dialogue view model is unchanged across a store batch, THE CLIENT SHALL keep the existing choice and Shop button nodes (same DOM nodes, focus kept).
  - Red: a unit test that renders twice with an equal model and asserts node identity and `document.activeElement`.
  - Re-measure first; if already fixed, record it and close the residual.
- **P2:** WHEN the box view model is unchanged across a store batch, THE CLIENT SHALL keep its card and button nodes.
  - Red: the same identity-and-focus test shape on `boxView`.
- **P3:** WHEN Social is opened from the main menu and a store batch arrives, THE CLIENT SHALL keep the Challenges panel visible while its frame is on the context stack.
  - The batch listener's `anyVisible` computation must count a covered-but-stacked menu frame as visible.
  - Red: a `main.*` test opening Menu → Social → Challenges and delivering a batch. Re-measure first.
- **P4:** WHEN a guest claim succeeds, THE CLIENT SHALL clear the stored claim code, so the next account-build connect does not re-issue `complete_guest_claim`.
  - Red: a `claimModel` test asserting a delete-code effect on claim-succeeded, plus the `main.ts` wiring test.
- **P5:** WHEN a menu entry's Y description or ok/error/pending frame feedback is rendered, THE CLIENT SHALL announce it through the live region (`aria-live` or `liveRegion.announce`), once per change.
  - Red: a `frame` / `mainMenuScreen` test asserting the feedback node's live-region role or an announce call.
- **P6:** WHEN the locale changes while the session gate is open, THE CLIENT SHALL repaint the gate's labels in the new locale.
  - Red: a `sessionView` test switching locale with the gate open.
