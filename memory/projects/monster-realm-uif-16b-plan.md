# uif-16b — Profile: one combined screen — build plan (resume run, 2026-11-09)

Worktree: `projects/monster-realm/.claude/worktrees/uif-16b` (branch `slice/uif-16b`, base `619f060d`).
Spec: `specs/monster-realm-v2/M-ui-foundation.spec.md` § uif-16b (UIF16B.1–.7). All paths below are under `client/`.

## Shape (one sentence)

A new `ProfileView` (`ui/profileView.ts`, OverlayId `profileView`) owns ONE dialog (`#profile-overlay`): title,
focus trap, a11y open/close, the Close row. `RenameView`, `ClaimView`, `PrivacyView` keep their files, models,
handlers and element ids but become **sections** of it: no a11y of their own, no frame classes, never shown alone.

## DOM (constructed by `ProfileView`, in `#frame-layer` ?? `#game-screen` ?? `<body>`)

```
#profile-overlay   class="mr-frame mr-shell"   style.display 'none' | 'block'
  .mr-frame-titlebar > #profile-title.mr-frame-title      t('menu.profile.title')
  #rename-overlay   (Name section, re-parented; class mr-button-rows)
      h2#rename-title.mr-section-header                   t('menu.profile.name.title')
      #rename-current  #rename-input  #rename-submit
  #claim-overlay    (Account section; class mr-button-rows; separator above)
      h2#claim-frame-title.mr-section-header              t('menu.profile.account.title')
      h2#claim-title p#claim-body … the five action buttons, #claim-privacy-btn   (unchanged ids, order)
  #privacy-overlay  (Privacy section; class mr-button-rows; separator above)
      h2#privacy-title.mr-section-header                  t('privacy.title')
      p#privacy-status, #privacy-delete-btn … (unchanged ids, order; `#privacy-close-btn` RETIRES)
  #profile-close-row (class mr-button-rows; separator above) > button#profile-close-btn   t('privacy.close')
```

- Separators are inline token styles written by `ProfileView` on the 2nd/3rd section roots and the close row:
  `borderTop = 'var(--mr-border-thin) solid var(--mr-separator)'` (+ token padding). `styles.css` is out of touches.
- Section order = Name, Account, Privacy, Close (wf-1 verdict). `mr-button-rows` stacks every button as a column,
  so the D-pad axis matches the layout (102).
- `index.html`: `#rename-overlay` loses `mr-frame mr-shell role="dialog" aria-modal="true"`, gains `mr-button-rows`.

## `ui/profileView.ts` (new)

```ts
// `ProfileSection` lives in ui/screens/profileScreen.ts (pure; router.ts imports the type)
export interface ProfileSectionView extends RowSection { show(): void; hide(): void }
export class ProfileView implements RowsView, RowSection {
  constructor(sections: Readonly<Record<ProfileSection, ProfileSectionView>>)
  get visible(): boolean                       // root display === 'block'
  show(section: ProfileSection = 'name'): void
  hide(): void
  focusSection(section: ProfileSection): void  // (section.defaultRow() ?? closeRow).focus()
  sectionOf(el: Element | null): ProfileSection | undefined   // the section holding `el`, if any
  get closeRow(): HTMLButtonElement            // always shown, never disabled
  applyRowOp(op: RowOp): void                  // one token applied once (identity dedup)
  get sectionRoot(): HTMLElement; sectionRows(): readonly HTMLElement[]; defaultRow(): HTMLElement | undefined; get armed(): boolean
}
```

- `show(section)`: reads `wasVisible`; writes title + Close label (every call); calls every section's `show()`;
  `display = 'block'`. **Only on the hidden→visible edge**: `openOverlayA11y('profileView', root)`, then for
  `'account'`/`'privacy'` a SYNCHRONOUS `focusSection(section)` (overlayA11y's deferred focus skips when focus is
  already inside the root). For `'name'` nothing more: overlayA11y's deferred anchor `#rename-input` lands one
  macrotask later (the KeyN-not-typed defer stays). A `show()` on an already-visible frame moves no focus.
- `hide()`: `display = 'none'`; every section's `hide()` (rename clears draft + releases its lock; privacy's
  `hide()` runs `onDismissed` → disarm); `closeOverlayA11y('profileView', null)` UNGUARDED.
- `sectionRows()` = name rows ++ account rows ++ privacy rows ++ `[closeRow]` (each section's shown, enabled rows,
  read afresh). `armed` = any section armed. `defaultRow()` = the armed section's own `defaultRow()` (privacy
  before account when both), else the first row of the column.
- `applyRowOp(op)`: `walkSection(this, document.activeElement, op)`; a pressed row is clicked only when it is an
  `HTMLButtonElement` (A on the name field presses nothing; Enter in the field commits through the field's own
  listener as today). Close's click = `this.hide()` (the stack's `hiddenPops` then pops the frame).

## Sections (`renameView.ts`, `claimView.ts`, `privacyView.ts`)

All three: drop `openOverlayA11y`/`closeOverlayA11y` and the `mr-frame`/`mr-shell` classes; the frame title bar
becomes the `h2.mr-section-header` above; drop `applyRowOp`, `#lastOp` and `implements RowsView` (the frame
walks); keep `RowSection` and gain `readonly armed: boolean` (rename: `false`; claim/privacy: the public form
of today's private `#armed`). `show()` = labels + display; `hide()` = display none (+ each view's own reset).
- **rename**: the input's own keydown no longer hides on Escape (a section never hides alone; main.ts's typing
  rule already owns Escape). Enter still submits; stopPropagation stays.
- **claim**: `render(vm)` NO LONGER writes the root's `display` (a section is shown iff the frame is: `show()` /
  `hide()` own it; `vm.visible` is only main.ts's auto-open signal). The reseat (`reseatRow`) stays; the privacy
  door stays as a jump row (`onPrivacy`). New REQUIRED handler `onDismissed`, called from `hide()` on every close
  path (the privacy precedent): main.ts disarms an armed decline there (plan review RT-1: one column makes an
  armed "Yes" reachable from the Name field, so a decline no longer stays armed behind a closed frame).
- **privacy**: `#privacy-close-btn` retires (the frame's Close replaces it). New optional handler
  `fallbackRow?: () => HTMLElement | undefined` (main.ts wires the frame's `closeRow`): it takes the retired close
  anchor's place as the reseat target when a render hides/disables the FOCUSED control and the confirm is not
  armed (`reseatRow`'s third rule) — a safe row, never the section's first action, which a second Enter would
  press. Arm seats Keep, disarm seats Delete while it is a row: unchanged. `hide()` still calls `onDismissed`.
- `ui/screens/profileScreen.ts`: `RowSection` gains `armed`; the three adapter exports collapse to
  `export const profileScreen = rowsScreen();`.

## Rosters (each row changes once; every count change named in a test comment)

| Table | Change |
|---|---|
| `OVERLAY_TIERS`/`OVERLAY_IDS` | 18 → 16: −renameView −claimView −privacyView, +`profileView: 'GUARD_ONLY'` at renameView's slot |
| `OVERLAY_A11Y.profileView` | `{ role:'dialog', labelKey:'a11y.overlay.profileView.title', initialFocusSelector:'#rename-input', dismissible:true }` |
| `a11yCopy` | −3 keys, +`'a11y.overlay.profileView.title': 'Profile'` |
| `SCREEN_POLICY.profileView` | `PLAYER_DROP` (all three were) |
| `RECONNECT_CLOSES.profileView` | `true` (rename's wins) |
| `SCREEN_ADAPTERS.profileView` | `profileScreen` |
| `MENU_ENTRIES` | `profile` becomes `{ kind:'open', key:'profile', target:'profileView' }`; `MenuTarget` −3 +1; `MenuGroupKey = 'options'`; `mainMenuScreen` `FRAME_IDS` drops `profile: 'menuProfile'` |
| `ACCEL_PATHS` | `N: { menu:['profile'], frame:'profileView', tab:'name' }`, `C: { …, tab:'account' }`; `AccelPath.tab` union widens by `ProfileSection` (the uif-15b `SocialTab` precedent) — data + its type, no router rule changes |
| catalog (en, fr, messageIds) | retire `menu.profile.name.desc`, `menu.profile.account.desc`, `menu.profile.privacy.desc`, `menu.profile.privacy.title`, `chrome.status.privacyOverlayBusy` (−5) |
| `feedbackPolicy` | the `privacy-busy` kind retires (WF1-A10) |
| `OR-MANIFEST-COMPLETE` | the three `*View.ts` files become a NAMED exclusion (sections, not overlays); `profileView.ts` joins |
| PARITY-02 resolver roster | +`ui/profileView.ts` |

## `main.ts`

- `let profileView`; built after the three sections: `new ProfileView({ name: renameView, account: claimView, privacy: privacyView })`.
- `showProfile(section)` = `openFrame('profileView', profileOpen, thunk)`; the thunk paints rename, paints claim
  with `claimView.render(vm)` DIRECTLY (never `renderClaim()`: no re-entry), `renderPrivacy()`, then
  `profileView.show(section)`.
- `openProfile(section)` (the player's open: menu leaf, N, C) replaces `openRename`/`openClaim`/`openPrivacy`.
  When `section === 'account'` or the claim phase is still `'hidden'` it steps the claim model with
  `claim-ui-opened` through `claimStep` directly — NO paint, so the step cannot auto-open on Account first
  (plan review B-1) — plus `markFirstRunNudgeSeen`, as `openClaim` did; then `showProfile(section)`.
- `renderClaim()`: a visible claim phase with Profile CLOSED is the auto-open → `showProfile('account')`; otherwise
  it paints the section only (no focus move: a claim event must not pull a player out of the name field).
  The old `claimRenderPending` privacy deferral goes (one dialog).
- Claim lifecycle order: `connection.ts` calls `onClaimPending` / `onClaimAwaitingAccount` just BEFORE
  `onReady` / `onReconnect`, and `onReconnect`'s sweep closes Profile (`RECONNECT_CLOSES.profileView = true`). Those
  two callbacks paint at once (auto-open on Account) and set `claimRaised`; the tail of `onReconnect` shows the
  prompt again when its cycle raised one (`renderClaim()`); `onReady` only clears the mark. A reconnect that raised
  nothing re-shows nothing. (Build note: a held-back paint was tried first and dropped — a mark that is never
  flushed would block every claim paint.)
- `onSignInFailed` → `applyClaim(sign-in-failed)` (its paint opens Profile on Account); with Profile already
  open it also `focusSection('account')`.
- Claim `onDismissed` → when the decline is armed, step `decline-cancelled` and paint the section (no auto-open).
- The claim section's privacy door → `profileView.focusSection('privacy')`. `openPrivacy`'s verdict and
  `reportError('privacy-busy', …)` go.
- Accelerators: `openMenuTarget('profileView', tab)` opens on `tab` when it is a `ProfileSection`, else Name.
  With Profile already the top frame both N and C decide `start`; `runAccel` then moves to the pressed
  accelerator's section when focus is not already in it, and only otherwise routes Start (N on Name, C on
  Account still close). Before join (`identity === ''`) only `C` opens Profile (on Account), no menu beneath.
- `RECONNECT_RESETS`: the rename row becomes `() => profileView?.hide()` (the owning view; a section never
  hides alone).
- `stopTyping`: the next focus target must be SHOWN (ancestor walk, the existing hidden-subtree idiom) as well
  as enabled; in an armed Profile frame it is the armed default row (No / Keep), never a confirm's Yes.
- `docs/DECISIONS.md`: one entry, "Profile is one dialog with three sections" (the shape, `privacy-busy`
  retired, rename's reconnect row winning, a decline disarming on close).

## Behaviour kept (UIF16B.4)

Same commands through the same handlers (`setProfileName`, `claimSignIn`/`claimJoin`/`claimDecline`,
`deleteAccount`/`cancelAccountDeletion`/`requestDataExport`); decline and delete stay two-step, arming seats
No/Keep, disarming seats the armer; with no row focused a token only seats the default row (never presses);
privacy AND an armed decline disarm on every close (B, Start, Close row, battle, reconnect, conversation); the name field types
every key but Enter/Escape; `account-e2e` eval untouched and green.

## Out-of-touches finding (flagged, not silently taken)

`src/ui/announcements.test.ts:94,106` pins `OVERLAY_IDS.length` at 18 (anti-vacuity). It reds at 16. It sits
beside the declared `ui/overlayRegistry.ts` / `ui/a11yCopy.ts` and its only edit is their roster count
(18 → 16, named) — taken as a sibling roster-pin test under `touches-delta:` (the ctl-12b catalog-sibling
precedent), recorded in the handoff before the build.

## Gating-test tags

Every new or rewritten gating test title starts with its criterion tag and a space: `UIF16B.1 ` … `UIF16B.7 `.
