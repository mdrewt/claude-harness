# Shadow tests failing after the lens fixes: ts-6b-11

Each is a test written blind from this slice's criteria that fails against the current tree. Rule on each: a real defect in the implementation is fixed through the normal lens-fix path; a wrong test needs no action.

For each one that is a real defect: fix the defect. Add at most ONE test for it, the smallest that catches it, and prefer extending an existing test to writing a new one; add none if the gating tests already catch it after the fix. Put the trailer `AB-Adopt: <its id>` (the `k...` heading in the file) on the fix commit.

## k11d0c9472c

```
  it('CTL8H-3-VIEW-ROW-OPS: the section walk covers the shown buttons in DOM order with focus as the cursor (hidden buttons skipped, clamped, no wrap), no row focused seats the default row (the first, or No when armed), activate clicks the focused button once and fires nothing when no row is focused', () => {
    // WRONG IMPL KILLED: rows that include a display:none button (focus() on it is a no-op: the
    // cursor sticks); a wrap; a move from nothing that lands on the second row; an activate that
    // fires the default row when nothing is focused (an armed reopen would CONFIRM the decline
    // on a stray A); an activate that clicks twice or clicks the wrong button; a default that is
    // the first row while armed (Confirm); and an op re-applied by shape instead of identity.
    const { view, handlers } = freshVisible(PROMPT_VM);

    // --- no row focused: the default row, for either direction ---------------------------------
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'move +1 with nothing focused: the first row').toBe('claim-signin-btn');
    blurAll();
    walk(view, moveOp(-1));
    expect(focusedId(), 'move -1 with nothing focused: the first row').toBe('claim-signin-btn');

    // --- the walk: hidden join / confirm / cancel buttons are skipped, the ends clamp ---------
    const down: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(1));
      down.push(focusedId());
    }
    expect(down, 'down, then clamped on the last row').toEqual([
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
    ]);
    const up: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(-1));
      up.push(focusedId());
    }
    expect(up, 'up, then clamped on the first row').toEqual([
      'claim-decline-btn',
      'claim-signin-btn',
      'claim-signin-btn',
      'claim-signin-btn',
    ]);

    // --- activate clicks the focused button, once ----------------------------------------------
    walk(view, moveOp(1));
    expect(focusedId()).toBe('claim-decline-btn');
    walk(view, activateOp());
    expect(firedNames(handlers), 'A on Decline').toEqual(['onDeclineRequested']);
    expect(handlers.onDeclineRequested).toHaveBeenCalledTimes(1);
    walk(view, moveOp(1));
    expect(focusedId(), 'down from the last row stays on it').toBe('claim-decline-btn');

    // --- activate with no row focused: seat the default row, fire nothing ------------------------
    for (const name of Object.keys(handlers) as (keyof ClaimViewHandlers)[]) {
      vi.mocked(handlers[name]).mockClear();
    }
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'A with no row focused seats the first row').toBe('claim-signin-btn');
    expect(firedNames(handlers), 'and fires nothing').toEqual([]);

    // --- armed: the default row is No, never Confirm ------------------------------------------
    view.render(ARMED_VM);
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'armed, nothing focused: move seats No, not the first row').toBe(
      'claim-decline-cancel-btn',
    );
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'armed, nothing focused: A seats No').toBe('claim-decline-cancel-btn');
    expect(firedNames(handlers), 'and neither confirms nor cancels').toEqual([]);
    walk(view, moveOp(-1));
    expect(focusedId(), 'up from No: Confirm').toBe('claim-decline-confirm-btn');
    walk(view, moveOp(1));
    walk(view, moveOp(1));
    expect(focusedId(), 'down past No: clamped on No, the last row').toBe(
      'claim-decline-cancel-btn',
    );

    // uif-16b: the identity-memo segment that stood here moved with `applyRowOp` to the frame:
    // ui/profileView.test.ts UIF16B.2 "a token is applied once".
  });
```

Failure output:

```
up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

AssertionError: up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

- Expected
+ Received

  [
-   "claim-decline-btn",
+   "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
  ]

 ❯ src/ui/claimView.test.ts:651:53
```

## k46a725d01b

```
  it('CTL8H-3-VIEW-ROW-OPS: the section walk covers the shown buttons in DOM order with focus as the cursor (hidden buttons skipped, clamped, no wrap), no row focused seats the default row (the first, or No when armed), activate clicks the focused button once and fires nothing when no row is focused', () => {
    // WRONG IMPL KILLED: rows that include a display:none button (focus() on it is a no-op: the
    // cursor sticks); a wrap; a move from nothing that lands on the second row; an activate that
    // fires the default row when nothing is focused (an armed reopen would CONFIRM the decline
    // on a stray A); an activate that clicks twice or clicks the wrong button; a default that is
    // the first row while armed (Confirm); and an op re-applied by shape instead of identity.
    const { view, handlers } = freshVisible(PROMPT_VM);

    // --- no row focused: the default row, for either direction ---------------------------------
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'move +1 with nothing focused: the first row').toBe('claim-signin-btn');
    blurAll();
    walk(view, moveOp(-1));
    expect(focusedId(), 'move -1 with nothing focused: the first row').toBe('claim-signin-btn');

    // --- the walk: hidden join / confirm / cancel buttons are skipped, the ends clamp ---------
    const down: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(1));
      down.push(focusedId());
    }
    expect(down, 'down, then clamped on the last row (Decline)').toEqual([
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
    ]);
    const up: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(-1));
      up.push(focusedId());
    }
    expect(up, 'up, then clamped on the first row').toEqual([
      'claim-decline-btn',
      'claim-signin-btn',
      'claim-signin-btn',
      'claim-signin-btn',
    ]);

    // --- activate clicks the focused button, once ----------------------------------------------
    walk(view, moveOp(1));
    expect(focusedId()).toBe('claim-decline-btn');
    walk(view, activateOp());
    expect(firedNames(handlers), 'A on Decline').toEqual(['onDeclineRequested']);
    expect(handlers.onDeclineRequested).toHaveBeenCalledTimes(1);
    walk(view, moveOp(1));
    expect(focusedId(), 'down past Decline: clamped, no further row').toBe('claim-decline-btn');
    expect(firedNames(handlers), 'moving fires nothing').toEqual(['onDeclineRequested']);
    expect(handlers.onDeclineRequested, 'and nothing fired again').toHaveBeenCalledTimes(1);

    // --- activate with no row focused: seat the default row, fire nothing ------------------------
    for (const name of Object.keys(handlers) as (keyof ClaimViewHandlers)[]) {
      vi.mocked(handlers[name]).mockClear();
    }
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'A with no row focused seats the first row').toBe('claim-signin-btn');
    expect(firedNames(handlers), 'and fires nothing').toEqual([]);

    // --- armed: the default row is No, never Confirm ------------------------------------------
    view.render(ARMED_VM);
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'armed, nothing focused: move seats No, not the first row').toBe(
      'claim-decline-cancel-btn',
    );
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'armed, nothing focused: A seats No').toBe('claim-decline-cancel-btn');
    expect(firedNames(handlers), 'and neither confirms nor cancels').toEqual([]);
    walk(view, moveOp(-1));
    expect(focusedId(), 'up from No: Confirm').toBe('claim-decline-confirm-btn');
    walk(view, moveOp(1));
    walk(view, moveOp(1));
    expect(focusedId(), 'down past No: clamped, no further row').toBe('claim-decline-cancel-btn');

    // uif-16b: the identity-memo segment that stood here moved with `applyRowOp` to the frame:
    // ui/profileView.test.ts UIF16B.2 "a token is applied once".
  });
```

Failure output:

```
up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

AssertionError: up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

- Expected
+ Received

  [
-   "claim-decline-btn",
+   "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
  ]

 ❯ src/ui/claimView.test.ts:650:53
```

## k994a016831

```
  it('CTL8H-3-VIEW-ROW-OPS: the section walk covers the shown buttons in DOM order with focus as the cursor (hidden buttons skipped, clamped, no wrap), no row focused seats the default row (the first, or No when armed), activate clicks the focused button once and fires nothing when no row is focused', () => {
    // WRONG IMPL KILLED: rows that include a display:none button (focus() on it is a no-op: the
    // cursor sticks); a wrap; a move from nothing that lands on the second row; an activate that
    // fires the default row when nothing is focused (an armed reopen would CONFIRM the decline
    // on a stray A); an activate that clicks twice or clicks the wrong button; a default that is
    // the first row while armed (Confirm); and an op re-applied by shape instead of identity.
    const { view, handlers } = freshVisible(PROMPT_VM);

    // --- no row focused: the default row, for either direction ---------------------------------
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'move +1 with nothing focused: the first row').toBe('claim-signin-btn');
    blurAll();
    walk(view, moveOp(-1));
    expect(focusedId(), 'move -1 with nothing focused: the first row').toBe('claim-signin-btn');

    // --- the walk: hidden join / confirm / cancel buttons are skipped, the ends clamp ---------
    const down: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(1));
      down.push(focusedId());
    }
    expect(down, 'down, then clamped on the last row (Decline)').toEqual([
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
      'claim-decline-btn',
    ]);
    const up: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      walk(view, moveOp(-1));
      up.push(focusedId());
    }
    expect(up, 'up, then clamped on the first row').toEqual([
      'claim-decline-btn',
      'claim-signin-btn',
      'claim-signin-btn',
      'claim-signin-btn',
    ]);

    // --- activate clicks the focused button, once ----------------------------------------------
    walk(view, moveOp(1));
    expect(focusedId()).toBe('claim-decline-btn');
    walk(view, activateOp());
    expect(firedNames(handlers), 'A on Decline').toEqual(['onDeclineRequested']);
    expect(handlers.onDeclineRequested).toHaveBeenCalledTimes(1);
    walk(view, moveOp(1));
    expect(focusedId(), 'down from the last row stays on it').toBe('claim-decline-btn');
    walk(view, activateOp());
    expect(handlers.onDeclineRequested, 'A on the last row presses it again').toHaveBeenCalledTimes(
      2,
    );

    // --- activate with no row focused: seat the default row, fire nothing ------------------------
    for (const name of Object.keys(handlers) as (keyof ClaimViewHandlers)[]) {
      vi.mocked(handlers[name]).mockClear();
    }
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'A with no row focused seats the first row').toBe('claim-signin-btn');
    expect(firedNames(handlers), 'and fires nothing').toEqual([]);

    // --- armed: the default row is No, never Confirm ------------------------------------------
    view.render(ARMED_VM);
    blurAll();
    walk(view, moveOp(1));
    expect(focusedId(), 'armed, nothing focused: move seats No, not the first row').toBe(
      'claim-decline-cancel-btn',
    );
    blurAll();
    walk(view, activateOp());
    expect(focusedId(), 'armed, nothing focused: A seats No').toBe('claim-decline-cancel-btn');
    expect(firedNames(handlers), 'and neither confirms nor cancels').toEqual([]);
    walk(view, moveOp(-1));
    expect(focusedId(), 'up from No: Confirm').toBe('claim-decline-confirm-btn');
    walk(view, moveOp(1));
    walk(view, moveOp(1));
    expect(focusedId(), 'down past No: clamped on No, the last row').toBe(
      'claim-decline-cancel-btn',
    );
```

Failure output:

```
up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

AssertionError: up, then clamped on the first row: expected [ 'claim-signin-btn', …(3) ] to deeply equal [ 'claim-decline-btn', …(3) ]

- Expected
+ Received

  [
-   "claim-decline-btn",
+   "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
    "claim-signin-btn",
  ]

 ❯ src/ui/claimView.test.ts:651:53
```

## kc7c5c8acae

```
  it('[21R-B2-WIRING-FR] booted with ?locale=fr, an already-erased account opens onto the French terminal notice, status line and disclosure', async () => {
    // WRONG IMPL KILLED (1) ★: privacyBanner.ts copy resolved at MODULE LOAD. main.ts imports
    //   privacyBanner.ts before its own module-scope `setLocale(LOCALE)` runs, so a module-level
    //   `t(...)` freezes English and the painted notice/status stay English under fr.
    // WRONG IMPL KILLED (2): the terminal notice / status left as raw English literals.
    // WRONG IMPL KILLED (3): the notice wired to the status key or vice versa — each node is
    //   compared with its OWN key.
    // WRONG IMPL KILLED (4): a disclosure left as the raw English §9 sentence under fr, or one
    //   blanked or dropped from the surface — the French catalogue value must be on it.
    document.documentElement.removeAttribute('lang');
    await bootMain('/?locale=fr');
    const resolver = await import('./ui/i18n/resolver');
    // ANTI-VACUITY FIRST: the boot really negotiated fr. Without these, an un-awaited or
    // en-negotiated boot would make every assertion below a comparison against the wrong locale.
    expect(
      document.documentElement.lang,
      'main.ts must have negotiated fr from ?locale=fr and stamped <html lang>',
    ).toBe('fr');
    expect(resolver.currentLocale(), "main.ts's resolver must be switched to fr").toBe('fr');

    const noticeFr = catalogString(FR_CATALOG, 'fr', 'privacy.notice.terminal');
    const statusFr = catalogString(FR_CATALOG, 'fr', 'privacy.status.terminal');

    // The RB52T-TERMINAL-ROW-NO-CLICK flow: terminal row, one frame, open, no privacy click.
    H.account = ACCOUNT_TERMINAL;
    runFrame(0);
    openPrivacySurface();
    expectOnlyReducer('none');

    const notice = byId('privacy-notice');
    expect(notice.textContent, 'the terminal notice must render in French').toBe(noticeFr);
    expect(hiddenAncestorOf(notice), 'and it must be ON SCREEN').toBeNull();
    expect(byId('privacy-status').textContent, 'the status line must render in French').toBe(
      statusFr,
    );
    const disclosureFr = catalogString(FR_CATALOG, 'fr', 'privacy.disclosure');
    expect(disclosureFr, 'ANTI-VACUITY: the fr disclosure is a translation').not.toBe(
      PRIVACY_PSEUDONYMIZATION_DISCLOSURE,
    );
    expect(
      byId('privacy-disclosure').textContent,
      'the section 9 disclosure must render in French',
    ).toBe(disclosureFr);
    expect(
      byId('privacy-overlay').textContent ?? '',
      'and the English sentence is not on the surface under fr',
    ).not.toContain(PRIVACY_PSEUDONYMIZATION_DISCLOSURE);
  });
```

Failure output:

```
the Account & Sign-in overlay must contain EXACTLY ONE button whose id names the privacy surface; found 0 (). Zero means the surface has no front door and the criterion`s "WHEN the player opens" precondition is unreachable; two means a rename left a dead duplicate behind: expected +0 to be 1 // Object.is equality

AssertionError: the Account & Sign-in overlay must contain EXACTLY ONE button whose id names the privacy surface; found 0 (). Zero means the surface has no front door and the criterion`s "WHEN the player opens" precondition is unreachable; two means a rename left a dead duplicate behind: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 ❯ privacyOpener src/main.privacyWiring.test.ts:363:5
 ❯ openPrivacySurface src/main.privacyWiring.test.ts:375:3
 ❯ src/main.privacyWiring.test.ts:1335:5
```

## k99d9c7773e

```
  it('UIF16B.1 show() shows the frame and all three sections at once; hide() hides the frame and every section', async () => {
    // WRONG IMPL KILLED: a frame that shows only the chosen section (the sub-list in disguise);
    // a hide() that only hides the root (a section left `display:block` re-appears alone the
    // next time its view is shown); a `visible` that reads a shadow field.
    const b = build();
    expect(b.profile.visible, 'constructed hidden').toBe(false);
    for (const section of ['name', 'account', 'privacy'] as const) {
      b.profile.show(section);
      expect(b.profile.visible, `${section}: visible`).toBe(true);
      // uif-16b (named change): 'block' -> 'flex'. Measured in Chromium: an inline `display: block`
      // overrides `.mr-frame`'s flex column, so #profile-body gets no bounded height and the whole
      // shell scrolls instead of the body. An open root is inline flex (hidden: none).
      expect(b.root().style.display, `${section}: the root is flex`).toBe('flex');
      for (const id of [
        'rename-overlay',
        'claim-overlay',
        'privacy-overlay',
        'profile-close-row',
      ]) {
        expect(hiddenAncestorOf(byId(id)), `${section}: #${id} on screen`).toBeNull();
      }
      for (const id of ['rename-input', 'privacy-delete-btn', 'profile-close-btn']) {
        expect(hiddenAncestorOf(byId(id)), `${section}: #${id} on screen`).toBeNull();
      }
      await flush();
      b.profile.hide();
      expect(b.profile.visible, `${section}: hidden again`).toBe(false);
      expect(b.root().style.display).toBe('none');
      for (const id of ['rename-overlay', 'claim-overlay', 'privacy-overlay']) {
        expect(byId(id).style.display, `${section}: hide() hid #${id}`).toBe('none');
      }
    }
  });
```

Failure output:

```
name: #privacy-delete-btn on screen: expected '#privacy-delete-btn' to be null

AssertionError: name: #privacy-delete-btn on screen: expected '#privacy-delete-btn' to be null

- Expected:
null

+ Received:
"#privacy-delete-btn"

 ❯ src/ui/profileView.test.ts:532:76
```
