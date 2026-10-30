# ctl-6c plan — battle semantics: Start over an ongoing battle, outcome continue, the battle-safe policy

Worktree `projects/monster-realm/.claude/worktrees/ctl-6c`, branch `feat/ctl-6c`, from master `2f5355ea`.

## What is already there (ctl-6b)
- `screens/index.ts` `baseButton(battle, Start)` → `'consumed'` (B17); `screenButton` asks the top frame only.
- Terminal outcome = `[world, screen battleView]`; `legacyAdapter` B → `pop`, Start → `popToBase`, A → `unhandled`.
  `closeFrame(battleView)` latches `dismissedBattleId` via `continuedBattleId`. So B and Start already continue; **A does not**.
- `reconcile` drops every `onBattle:'drop'` frame while `battleUp` (battle base, outcome shown, or battleView frame) —
  so a menu opened over a battle would be closed by the next batch (ctl-3 build note: "ctl-6c's battleSafe refines that").
- `dispatch('openMenu')` requires `overlayVerdict('menuView')==='allow'` (denied: battleView is EXCLUSIVE_TOP) and `worldHasFocus()`.
- `SCREEN_POLICY.battleSafe`: true for battleView, questLogView, leaderboardView, helpView, menuView; false for the rest.

## Touches discipline
`screens/index.ts` and `screens/types.ts` are NOT in `touches:`. Nothing here REQUIRES them:
- the battle button rule lives in `contextStack.ts` as a pure `battleButton(stack, btn)` that main.ts consults BEFORE
  `screenButton` in `routeCtx().screen`. `baseButton`'s battle arm stays (now shadowed for Start). Follow-up flag: fold
  `battleButton` into `baseButton`/the battleView adapter when a slice touches `screens/index.ts` (ctl-8i/8j).
- the command battle policy is a total `Record<ScreenCommand['kind'], …>` in `contextStack.ts` (type-only import of
  `Command` from `./screens/types`), so a new Command arm (talk ctl-10a, bag use ctl-8f) fails client-typecheck until it
  is classified — that is how later screens "inherit the rule".
Sibling test files of `main.ts` that change (touches-delta): `main.controls.test.ts` (new CTL6C booted cases + the named
intentional change to CTL6B-2-MAIN-ONGOING-BATTLE), `main.input.test.ts` (CTL2-3-BOOT-B17's Escape step: Escape now opens
the menu over the battle; the assertion becomes "battle still shown, base still battle, menu above it", then close it).

## Design (functional core / imperative shell)

### contextStack.ts (pure)
1. **Stamp frames opened over a battle.** `UpperFrame` screen gains optional `readonly overBattle?: string`.
   `mirrorEdges` pushes `{kind:'screen', id, overBattle: base.battleId}` when the base is a battle (property omitted at
   the world, so existing `toEqual` shapes hold). `frameKey`/`stackDiff`/dedup stay id-based.
2. **reconcile refinement (CTL6C.1).** Under `battleUp`, a frame is KEPT iff `base.kind==='battle' &&
   f.kind==='screen' && f.overBattle===base.battleId && SCREEN_POLICY[id].battleSafe`. Everything else unchanged
   (a world-opened menu still drops when a battle appears — CTL3.2; a stamped frame drops when the outcome shows or a
   different battle id is the base). Still idempotent and pop-only.
3. **`battleButton(stack, btn): ScreenCommand | 'consumed' | undefined`** (undefined = not a battle case; fall through to
   `screenButton`):
   - bare battle base (`stack.length===1`, kind battle) + Start (not repeat) → `{kind:'openMenu'}`; Start repeat → 'consumed'.
   - terminal outcome on top (`base world`, top is `screen battleView`) + A or B → `{kind:'popToBase'}` (exactly Start's
     command, CTL6C.2); repeat → 'consumed'.
   - otherwise undefined.
4. **Command battle policy (CTL6C.3).** `COMMAND_BATTLE_POLICY: Readonly<Record<ScreenCommand['kind'], 'safe' | (() => string)>>`
   — thunks `() => t('battle.refused.notInBattle')` etc. (literal ids at call site, per catalogParity).
   Safe: pop, popToBase, openMenu, toggleHelp, attack, flee, swap, recruit, useItem, pvpAttack, pvpSwap, dismissDialogue
   (ending a conversation is not guarded server-side and Start pops a suspended dialogue).
   Refused (generic reason): care, train, evolve, setNickname, setPartySlot, healParty, buy, sell, respondTrade,
   confirmTrade, cancelTrade, proposeTrade, challenge, acceptChallenge, declineChallenge, cancelChallenge,
   setProfileName, advanceDialogue, claimSignIn, claimJoin, claimDecline, deleteAccount, cancelAccountDeletion,
   requestDataExport. (Read-only menu: nothing but the battle's own actions and the stack moves.)
   `battleRefusal(stack, command): string | undefined` → the resolved reason iff `stack[0].kind==='battle'` and not safe.
   Talk and Bag Use have no Command arm yet: the total Record makes their arms (ctl-10a, ctl-8f) classify themselves.

### mainMenuScreen.ts (pure)
5. `MainMenuState` gains `battle: boolean`; `openMainMenu(memory, battle = false)`. Layouts become
   `layoutAt(level, battle)`: world layouts are the static ones (unchanged); battle layouts are built on demand with
   `enabled:false, reason` for every `open` entry whose `SCREEN_POLICY[target].battleSafe` is false — reason
   `t('menu.disabled.battleBag')` ("Use items from the battle Bag command") for the Bag entry (`raisingView`), else
   `t('menu.disabled.inBattle')`; a `group` is disabled iff all its children are; `close` stays enabled.
   Over a battle: Monsters, Bag, Social›Trades, Social›Challenges, Profile (all three children → group disabled) disabled;
   Journal, Social (Rankings), Options›How to play, Close enabled.
6. `activate`: a disabled row → no effect, feedback `info` with its reason (CTL6C.3 "showing its catalogued reason").
   `mainMenuPick` same. `menuViewModel` passes the battle layout so navRender paints `aria-disabled`/`is-disabled`.

### main.ts (shell)
7. `routeCtx().screen = (btn) => battleButton(contextStack, btn) ?? screenButton(contextStack, btn, screenCtx)`.
8. `dispatch` first line: `const refusal = battleRefusal(contextStack, command); if (refusal !== undefined) { showStatus(refusal); return DONE; }`
   where showStatus writes the status line only (a refusal is not an error: no errorRing push, no console.error).
9. `dispatch('openMenu')`: at a bare battle base, open regardless of the overlay verdict (battleView EXCLUSIVE_TOP) and
   `worldHasFocus()` (focus is in the battle). `openMenu()` passes `battle = contextStack[0].kind==='battle'` and then
   `syncStack()` so the menu is mirrored (stamped) at once.
10. Closing the menu over the battle: B at root / Start / Close already hide it; mirror pops → `[battle]`; battleView
    stays visible. Verify focus lands back in the battle overlay (a11y top is battleView, not the canvas).

### i18n (catalog.en/fr + messageIds)
`menu.disabled.inBattle` "Not during a battle" / "Impossible pendant un combat";
`menu.disabled.battleBag` "Use items from the battle Bag command" / "Utilisez les objets via la commande Sac du combat";
`battle.refused.notInBattle` — reuse `menu.disabled.inBattle` if catalogParity allows one id in two modules (prefer ONE id,
both call sites literal). Follow the `@desc` + call-site comment convention.

## Deferred / residual
- CTL6C.1 sub-bullet "PvP turn timer shows in the menu header": the battle view (and its timer) stays visible beside the
  right-hand menu panel, but the menu header does not repeat it. menuView.ts is outside touches → residual
  `R-ctl-6c-PVPTIMER` → ctl-8j (battle-dpad slice) [ux-a11y/LOW].
- `baseButton`'s battle Start arm in `screens/index.ts` is shadowed by `battleButton` → fold in when a slice touches it.
- Menu "Close" description says "return to the world" also over a battle (menuModel.ts outside touches) — LOW, note.

## Gates (tags, one passing test each)
- CTL6C.1: contextStack `CTL6C-1-BATTLE-START-OPENS-MENU`, `CTL6C-1-RECONCILE-KEEPS-SAFE-OVER-BATTLE`;
  main.controls `CTL6C-1-MAIN-START-MENU-OVER-BATTLE`.
- CTL6C.2: contextStack `CTL6C-2-OUTCOME-A-B-CONTINUE`; main.controls `CTL6C-2-MAIN-A-B-CONTINUE`.
- CTL6C.3: contextStack `CTL6C-3-REFUSAL-TABLE`; mainMenuScreen `CTL6C-3-MENU-DISABLED-OVER-BATTLE`;
  main.controls `CTL6C-3-MAIN-REFUSED-COMMAND`, `CTL6C-3-MAIN-MENU-DISABLED`.

## Amendments after plan review (reviewer + red-team, 2026-10-01) — these OVERRIDE the items above
- A1 (stale stamp): `reconcile` drops any frame with `overBattle` unless base is `battle` with that same id —
  regardless of `battleUp` (battle row gone with no outcome). The conversation rule (player frames drop while a
  conversation row exists) is unchanged and still applies to stamped frames.
- A2 (click race): `mirrorEdges(stack, visible, prevBase = stack[0])` stamps a pushed screen frame only when the stack's
  base is a battle AND `prevBase` was the same battle (the base did not flip in this sync). `syncStack` passes the
  pre-sync base. A menu click-opened at the world and first mirrored in the batch that brings the battle is unstamped
  and dropped (CTL3.2).
- A3 (outcome A): `battleButton` maps A on a terminal outcome (`[world, …, screen battleView]` top) to `{kind:'pop'}`
  (closes only the outcome, latches via closeFrame; a suspended dialogue below survives), and only once the outcome has
  been up `OUTCOME_CONTINUE_GRACE_MS = 400` (anti-mash: an Enter mashed at the battle's last turn must not skip the
  result); earlier → 'consumed'. B is NOT remapped (legacy `pop` already continues). main.ts tracks when the
  battleView frame was first mirrored over the world. Hint copy becomes "Press Enter or Esc to continue".
- A4 (Start + suspended dialogue): Start with `[battle, dialogueView]` stays CTL6B.2's popToBase (dismisses the dialogue);
  the menu opens only from the bare battle base. Pinned, not changed.
- A5 (purity): `COMMAND_BATTLE_POLICY: Record<Command['kind'], 'safe'|'refuse'>` + `battleRefused(stack, cmd): boolean`;
  no `t()` in contextStack.ts. main.ts resolves `i18nT('menu.disabled.inBattle')`, writes the status line AND
  `liveRegion.announce`s it; no errorRing push. `dispatch` calls `syncStack()` first only for a 'refuse' command.
- A6 (disabled rows enforced): `activate`/`mainMenuPick` on a disabled row → effect none + feedback info with reason;
  `applyMenuStep`'s `open` arm also refuses a non-battleSafe target at a battle base (belt).
- A7: `dispatch('openMenu')` bypasses verdict/focus ONLY at a bare battle base, keeps `identity !== ''`.
- A8 (talk): `interactAtNearest` returns early at a battle base (belt; KeyT is already movement-gated). Bag Use is covered
  by the disabled Bag row with the `menu.disabled.battleBag` reason; talk by CTL2-3-BOOT-B17's KeyT assertion.
- Residuals to register after lenses: PvP timer in menu header (→ ctl-8j); Monsters read-only instead of disabled
  (→ ctl-8b); Select (Help) inert over a battle while helpView is battleSafe (→ ctl-8j); `baseButton` battle-Start arm
  shadowed by `battleButton` (→ next slice touching screens/index.ts); menu Close description says "world" over a battle.
