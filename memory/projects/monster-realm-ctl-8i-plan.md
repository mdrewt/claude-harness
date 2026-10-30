# ctl-8i plan — Battle I: command list and skill grid (CTL8I.1-3; R-rb-56-FOLLOWUP-ACC)

Worktree: projects/monster-realm/.claude/worktrees/ctl-8i (branch ctl-8i from origin/master f372a234).
Spec: M-postgate-console-controls.spec.md ### ctl-8i. Design: console-controls-design.md §4 (Start in a
battle sub-list), §5 (Battle row). main.ts NOT in touches.

## Ground truth (verified at f372a234)
- The battle is a BASE frame (`{kind:'battle'}`, contextStack.ts:46-48), not a screen. Today
  `ScreenHost.takesNav` is false on it and `ScreenHost.button` answers `baseButton(battle)` (Start/B
  consumed, Select help, rest unhandled) — the D-pad does nothing in a battle; it is Tab/mouse only.
- main.ts routeCtx (≈1954) asks `battleButton` FIRST: Start on a bare battle -> openMenu (CTL8I.3's
  open half already ships); A on the outcome screen -> continue. Only then `screenHost.button`.
- `viewOf('battleView')` already lends the BattleView (main.ts:483), so a host paint reaches it.
- The outcome (world base + `battleView` SCREEN frame) keeps `SCREEN_ADAPTERS.battleView =
  legacyAdapter` — untouched here (outcome A/B is CTL8J.2).
- PROBE (stub nav adapter at the battle base, full client vitest): only two in-touches pins break —
  index.test.ts CTL6B-2-BATTLE-START-INERT and CTL7C-1-NAV-CAPABLE. No main.*.test.ts pins battle-base
  routing -> no hidden dependency in the routing change.
- 6 e2e specs (out of touches: a11y, recruit, encounter-battle, pvp-side-b, my-battle-privacy,
  monster-privacy, trade-interlock) click the skill buttons (`has-text("(")`, `/^Submit: /`), `Flee`,
  `bait-selector`, `recruit-action`, `use-item-action`, and pvp-side-b pins `pvp-status` /Waiting for
  opponent/. a11y.spec CTL7B-E2E-BATTLE mounts the view with a STRING VM (no new field) and measures
  text contrast >= 4.5:1. => every existing control stays rendered, visible and mouse-clickable; the
  VM change must not crash when the new field is absent; new text (incl. disabled) keeps >= 4.5:1.
- Skill label keys/`battle.skill.accuracy`/`battle.pvp.waiting` consumers: only touches files +
  catalog.test.ts (sibling) + battleView.test.ts.

## Design (functional core / imperative shell)
1. battleModel.ts (pure, additive):
   - VM gains `activeIndex: number` (sideA.active) — the monster key for "last skill used by that
     monster"; `battleVMsEqual` compares it.
   - `BATTLE_COMMANDS = ['fight','recruit','swap','bag','run'] as const`; `BattleCommand`.
   - `battleCommands(vm): readonly {id, enabled, reason: 'runPvp' | null}[]` — always 5 rows in order.
     fight: skills.length>0; recruit: canRecruit; swap: canSwap && bench>0; bag: cureItems>0;
     run: canFlee (PvP -> reason 'runPvp'). While `pvpPendingSubmit` every row is disabled.
   - `skillGridStep(index, count, dir)`: 2 columns, row-major, clamps (no wrap); Down from col 1 into a
     row with no col 1 stays.
   - `listStep(index, count, delta)`: clamp.
   - `skillCursor(skills, lastSkillId | undefined)`: index of that id, else 0.
2. screens/battleScreen.ts (pure adapter, profileScreen token precedent): `nav: true`, viewModel null,
   state `{op: BattleOp | null}`, `BattleOp = {kind:'move', dir:'Up'|'Down'|'Left'|'Right'} |
   {kind:'activate'} | {kind:'back'}`, a NEW object per press. onButton: D-pad -> move (repeat
   allowed); A -> activate (repeat -> null op); B -> back (repeat -> null), result 'consumed';
   Start -> openMenu (repeat consumed; main.ts's battleButton answers first in production);
   Select -> toggleHelp; else unhandled. paint -> view.applyBattleOp(op) when op !== null.
3. screens/index.ts: `takesNav` true for a battle base (battleScreen.nav); `button` at a battle base
   steps `battleScreen` under the 'battleView' state/view key (the outcome SCREEN frame keeps the
   table's legacyAdapter). baseButton unchanged for the world.
4. battleView.ts (shell): keeps the cursor `{list: 'commands'|'skills'|'recruit'|'swap'|'bag',
   index}` and `#lastSkill: Map<activeIndex, skillId>` (cleared on a new battleId).
   - New command row (`data-testid="battle-commands"`, role=group, aria-label from catalog) of 5
     buttons above the skills grid; inapplicable ones `aria-disabled="true"` (focusable, click
     no-ops), explicit high-contrast colours (no opacity). Run disabled in PvP shows a visible reason
     line (`data-testid="battle-run-reason"`, aria-describedby). PvP pending: all 5 aria-disabled and
     a caption "Waiting for {name}…" (`data-testid="battle-commands-waiting"`); pvp-status keeps its
     text (pinned by pvp-side-b e2e).
   - Fight -> list 'skills', index skillCursor(lastSkill[activeIndex]); Recruit/Swap/Bag -> that
     group's controls in DOM order (bait select + recruit btn; swap btns; cure select + use btn) — the
     interim until CTL8J.1 replaces the selects with lists; Run -> the flee dispatch (#dispatch lock).
   - Cursor = view state, painted as `aria-current="true"` on exactly one element and DOM focus when
     the view moves it. On an op: if focus is on one of the root's cursor elements, sync the cursor
     from it first (Tab/mouse agree); else use the kept cursor. move: grid step for skills, list step
     otherwise; activate: press the cursor element (a select row -> focus the next row); back:
     sub-list -> commands with the cursor on that sub-list's command; commands -> nothing.
   - A skill press (click, any source) records lastSkill[activeIndex] = skill id.
   - Turn reset (CTL8I.1): a render whose (battleId, turnNumber) differs from the last -> list
     'commands', cursor Fight; focus Fight only when focus is on <body> or inside the root (never
     steal from the menu or another frame). Same turn re-render: cursor re-applied to the rebuilt
     nodes (index clamped), no focus move unless the focused cursor node was replaced while focus
     was inside the root.
   - CTL8I.3: the menu over the battle changes nothing in the view; on close the kept list+cursor are
     intact (and re-seat on the next op). Unit + boot evidence.
   - Skill cell text gains power+accuracy in BOTH modes: pve `{name} ({power}) · {affinity} · Acc
     {accuracy}%`, pvp `Submit: {name} ({power}) · {affinity} · Acc {accuracy}%` (prefixes kept for
     e2e); the hover `title` and `battle.skill.accuracy` go (R-rb-56-FOLLOWUP-ACC closed).
5. i18n: new keys battle.command.{fight,recruit,swap,bag,run}, battle.commands.label,
   battle.commands.waiting {name}, battle.command.runPvpReason; changed params on pvpSubmit/pveLabel;
   removed battle.skill.accuracy. EN+FR+messageIds; catalog.test.ts adjusted (sibling).

## Anti-patterns avoided
- No main.ts edit; no new Command arm; no rule in the view (enablement/stepping are battleModel's).
- No hidden controls (e2e click them); no `disabled` on command rows (cursor must rest on them).
- No focus steal from frames above the battle; never press on a repeat.

## Deviations / follow-ups (to record in PR + spec)
- The skill grid stays visible during the command list (mouse + 7 out-of-touches e2e specs click it);
  "Fight is chosen" moves the cursor into it. The legacy Flee button stays beside Run
  (trade-interlock.spec/recruit.spec click "Flee") — retire in ctl-8j or later.
- "Waiting for {name}…" is the command-list caption; the pvp-status banner keeps "Waiting for
  opponent's action…" (pvp-side-b.spec pin, out of touches).

## Gates
- CTL8I.1: battleView.test.ts CTL8I-1-*, battleModel.test.ts CTL8I-1-*, battleScreen.test.ts CTL8I-1-*.
- CTL8I.2: battleView.test.ts CTL8I-2-*, battleModel.test.ts CTL8I-2-*.
- CTL8I.3: battleView.test.ts CTL8I-3-*, index.test.ts CTL8I-3-*, battleScreen.boot.test.ts CTL8I-3-BOOT-*.

## Amendments after plan review (reviewer + red-team, 2026-10-03)
- Seat-only: an op arriving while focus is NOT on one of the root's cursor elements (title anchor,
  <body>, Flee, a select) only focuses the kept cursor element — A presses nothing and a move does
  not step (profileScreen rowStep precedent; a blind A could attack/flee). Focus on a cursor element
  -> sync {list,index} from the element's owner list first (data-battle-list), then apply.
- Hidden view: applyBattleOp is a no-op while !#visible (reconnect hide / pre-import).
- Held Enter: a root keydown listener preventDefaults Enter/Space keydowns with e.repeat on a
  button inside the root (native repeat would chain Fight -> attack -> next turn's Fight).
- PvE lock (#pending for this battle): the 5 command rows are aria-disabled too; activate no-ops
  during the lock.
- PvP pending: list forced to 'commands', cursor Fight, all rows aria-disabled; caption name falls
  back to t('battle.card.opponent') when pvpOpponentName is null (never "null").
- Outcome != Ongoing: the command row is hidden, no aria-current anywhere, every row disabled;
  battleCommands(terminal VM) all disabled (fight also requires outcome Ongoing).
- Sub-lists contain BUTTONS only (data-battle-list on each): skills -> skill buttons; recruit ->
  [recruit-action]; swap -> swap buttons; bag -> [use-item-action]. The bait/cure <select>s are never
  cursor rows (SELECT owns WASD/arrows/Backspace natively = a trap); they stay mouse/Tab-operable
  until CTL8J.1 turns them into lists. Flee is in no list.
- lastSkill is recorded only on an ACCEPTED press (PvE: when #dispatch takes the lock; PvP: when the
  click is not ignored), keyed by vm.activeIndex; cleared on a new battleId; a remembered id no
  longer in skills -> 0.
- Visible cue: the aria-current element gets an inline outline (2px solid #ffd700, offset 2px);
  exactly one marked element while the row is shown; re-applied after every render.
- Turn reset precedence: a new (battleId, turnNumber) resets to commands/Fight even if the menu was
  opened in a sub-list (design §4 "reset to Fight happens only at a new turn"); same-turn renders keep
  list+index (index clamped; empty list -> commands/Fight).
- Steps: ONE pure fn `cursorStep(index, count, dir, cols)`; skills cols=2 (no wrap, Down from a
  col-1 cell into a row without col 1 stays); every other list cols=1 where Left/Up = -1 and
  Right/Down = +1; count 0 -> 0.
- battleScreen: Start -> 'consumed' and Select -> toggleHelp (= baseButton(battle)); main.ts's
  battleButton answers Start first in production.
- takesNav true ONLY for a bare battle base (top is the battle); the outcome screen frame keeps
  legacyAdapter.
- Gate files beyond the literal touches are sibling tests (battleScreen.test.ts,
  battleScreen.boot.test.ts, index.test.ts, catalog.test.ts) -> touches-delta, allowed.
