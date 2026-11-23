# qf-7b tester brief — UNIT (battleView.test.ts + battleScreen.boot.test.ts)

You are the `tester` for slice qf-7b of monster-realm. You write the gating tests (TDD red phase) and
migrate the existing tests that the new behaviour invalidates. You do NOT implement the feature and you
never touch `client/src/ui/battleView.ts`. Your Bash is static-only (`node --check`, `bash -n`); the
orchestrator runs vitest and reports reds back to you.

WORKTREE (edit here, nowhere else): /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/qf-7b
FILES YOU MAY EDIT: client/src/ui/battleView.test.ts, client/src/ui/screens/battleScreen.boot.test.ts.
(Another tester owns the e2e specs in parallel. Do not touch client/e2e.)
STANDARDS: ~/.claude/harness/standards/testing-tdd.md is the verification SSOT (read it first).
Tests execute behaviour through the real view's DOM in happy-dom; never read source text; never pin
prose or counts of process artifacts. Test titles LEAD with the behaviour they prove and end with the
slice tag as a trailing bracket token, e.g.
  it('an ongoing battle renders no skill cell … until Fight is pressed [QF7B-2-NO-SKILLS-AT-REST]', …)

## The spec (specs/monster-realm-v2/M-pt3-quickfix.spec.md, section qf-7b)

- QF7B.2: THE skills/move list SHALL render only after Fight is selected, and THE bait list only after
  Recruit is selected (extending the `#open` command state from qf-7), with battleScreen.boot.test.ts and
  the e2e that clicked a skill/bait straight off battle open migrated to press the command first.
- QF7B.4: THE battle-safety pins SHALL stay green unmodified; no e2e is deleted for convenience.
- QF7B.1 (remove the legacy Flee button) and QF7B.3 (its reachability sweep row) are DEFERRED to a
  follow-up (hidden dependency on the catalog). In THIS slice the legacy Flee button still renders.
  Do not add new teeth that pin its presence; do not remove existing ones either.
- The Bag's cure list (`cure-item-selector`) is NOT in the spec: it stays always visible when
  `cureItems` is non-empty. Do not gate it in tests.

## The view's contract you are testing (the command-first model, mirroring the QF7.2 block's contract
## at battleView.test.ts ≈8900-8950 — read that block: its helpers c8iMount/c8iFresh/c8iCmd/c8iVM/
## c8iPvpVM/c8jRows/makeRaCallbacks/raDeferred are yours to reuse)

At REST — the first render of a battle, every same-turn re-render, a new turn, a new battle, a render after
hide()/refresh(null) — the view shows the command list (Fight, Recruit, Swap, Bag, Run), the cards, the
legacy Flee (unchanged), the cure list when offered, the swap hint when no swap; and NO skill cell
(`[data-battle-list="skills"]`), no button whose text is a skill label (PvE `<name> (<power>) · <aff> · Acc n%`,
PvP `Submit: …`), no `[data-testid="bait-selector"]`, no `[data-battle-list="recruit"]` row, no
`bait-option-none`, no `[data-recruit-bonus]` element, no "No bait" button — anywhere under the mount
(census elements, not visibility: display:none still counts as present).

- Fight (mouse click on `battle-command-fight`, or the D-pad: focus the command and `applyBattleOp({kind:'activate'})`
  / the shape the ctl-8i tests use) opens the grid: exactly one cell per `vm.skills` in order, labelled
  for the mode, with the cursor (aria-current) AND focus on the skill this monster last used in this
  battle (CTL8I.2) else the first; attacks nothing; opens no bait list, no swap rows. A greyed Fight (no
  skills; a PvE call in flight; a PvP wait) opens nothing and the view is unchanged.
- Recruit (mouse / A) opens the bait list: `bait-selector` with `bait-option-none` first then one row per
  `baitOptions` entry carrying `data-recruit-bonus`, cursor+focus on No bait; sends nothing; closes an
  open grid / swap list. A greyed Recruit (canRecruit false; PvP; lock) opens nothing.
- A skill press (mouse, or A on the cursor cell) attacks ONCE with THAT skill id: onAttack(battleId, id) in
  PvE (under the shared lock: every PvE control disabled until settle, then re-enabled), onPvpAttack in
  PvP (the wait then removes the grid; the next turn starts closed on Fight and Fight opens it again).
- A bait row press opens the Recruit confirm (Yes default) beside the still-open bait list (as today); No / B
  returns the cursor to that bait row with the list open; Yes recruits once with that bait id (or
  undefined for No bait) under the lock; after settle on the same turn the list is still open.
- B (`{kind:'back'}`) from a skill cell closes the grid and seats the cursor+focus on Fight; from a bait row
  closes the list, cursor on Recruit; from the confirm → back to the bait row (list stays).
- Another command: Recruit over an open grid closes it and opens the bait list; Fight over an open bait
  list the reverse; Swap closes both and opens the bench; Bag closes both (the cure list is unchanged);
  Run closes both and flees once. Exactly one of {grid, bait list, bench rows} is on screen at any time;
  a pick's second step appears only beside its own list.
- A cure row press (the Bag list, always on screen) over an open grid or bait list closes them and opens
  the Use-item target (the Bag becomes the open command) — mirror of QF7.2-PICK-CLOSES-SWAP.
- A same-turn re-render (an equal VM, the same VM object, a VM whose hp changed) keeps the open grid /
  bait list with the cursor and focus on the SAME cell / row, and steals no focus from a menu over the
  battle (see QF7.2-SAME-TURN-RERENDER-KEEPS-LIST for the focus-elsewhere pattern).
- Closed by: a new turn, an earlier turn number, a new battle on the same turn, hide() / refresh(null)
  then a re-show of the same turn, a PvP wait (pvpPendingSubmit true), and a same-turn render that loses
  the command (skills [] closes the grid; canRecruit false closes the bait list) — and the lost one is NOT
  reopened unasked by a later same-turn render that regains it.
- Lock: while a PvE call is in flight Fight and Recruit are aria-disabled like the other rows; an
  already-open grid or bait list stays on screen with its rows `disabled` and no row (live, or a held
  reference hand-re-enabled) dispatches; after settle the rows re-enable, the list is still open, the
  cursor still on its row. B from a hand-enabled, focused skill cell / bait row under the lock closes the
  list and leaves everything else disabled (mirror of QF7.2-BACK-UNDER-LOCK-STAYS-LOCKED).
- Boot (battleScreen.boot.test.ts, through main.ts over the real adapter table): at rest there is no
  skill cell; Enter on Fight opens the four cells; the existing CTL8I-3 menu-round-trip flow holds (the
  grid stays open across the trip, the same skill under the cursor, one submitAttack with its id).

## MANDATORY ROSTER — these eleven trailing tags must each appear EXACTLY ONCE (the ledger CHECK pins
## them by name; add as many further teeth as you judge necessary with their own distinct tags):

battleView.test.ts (new describe block placed after the QF7.2 block, same style):
  [QF7B-2-NO-SKILLS-AT-REST]        rest census, PvE and PvP: first render, same-turn re-renders, next turn, new battle
  [QF7B-2-FIGHT-OPENS-GRID]         mouse and D-pad; order, labels per mode, cursor+focus (incl. the remembered skill), nothing sent, nothing else opened
  [QF7B-2-NO-BAIT-AT-REST]          rest census for the bait list (wild battle with ≥2 baits), same renders as above
  [QF7B-2-RECRUIT-OPENS-BAIT-LIST]  mouse and D-pad; No bait first, data-recruit-bonus rows in order, cursor on No bait, nothing sent, grid/bench closed
  [QF7B-2-SKILL-AND-BAIT-ACT-ONCE]  skill → onAttack once with its id (PvE) / onPvpAttack (PvP); bait row → confirm → Yes → onRecruit once with its id; No → back to the row, list open
  [QF7B-2-BACK-CLOSES]              B from a cell → Fight (grid gone); B from a bait row → Recruit (list gone); B from the confirm → the bait row (list kept); nothing sent
  [QF7B-2-OTHER-COMMAND-SWITCHES]   Fight⇄Recruit⇄Swap⇄Bag switching: exactly one list on screen; Run closes both and flees; a cure-row press closes an open grid/list
  [QF7B-2-SAME-TURN-RERENDER-KEEPS] open grid and open bait list survive same-turn re-renders with cursor+focus on the same cell/row; no focus stolen from a menu
  [QF7B-2-NEW-TURN-WAIT-HIDE-CLOSE] new turn / earlier turn / new battle / hide()+re-show / PvP wait / lost command (skills [] or canRecruit false) close; a same-turn regain does not reopen
  [QF7B-2-LOCK-AND-GREYED]          greyed Fight/Recruit open nothing (no skills, canRecruit false, PvP wait, lock); lock over an open list: rows disabled, held rows send nothing, settle re-enables, list still open
battleScreen.boot.test.ts:
  [QF7B-2-BOOT-GRID-AFTER-FIGHT]    booted through main.ts: no skill cell at rest; Enter on Fight opens 4 cells; one submitAttack with the chosen id

Each `it` starts with a `// WRONG IMPL KILLED:` comment naming the wrong implementations it catches (the
repo's convention; see QF7.2-NO-ROWS-AT-REST). Think adversarially: an impl that renders the grid but
hides it with display:none; one that gates skills but not bait (or the reverse); one that forgets PvP;
one that opens the grid on ANY command press; one that re-renders the actions row and loses the open
bait list or the pick; one that reopens a lost list on regain; one where a held bait row from a closed
list reopens it (a `recruitConfirm` pick arriving while Recruit is not the open command must be ignored);
one that leaves a stale grid when a cure row is pressed; one that lets a same-turn re-render close the
grid; one where B from the bait list also closes the confirm's pick wrongly, etc.

## MIGRATIONS (existing tests that assume at-rest skills / bait) — press the command first, keep every
## assertion, never delete, never weaken, keep comments honest. Known candidates (read each):
- 20r-a block (≈4521-5340): `raControls` collects the five PvE controls at rest; now the 2 skills need
  Fight open and No bait needs Recruit open, and they cannot all be on screen together. Restructure per
  list (the qf-7 precedent `raExpectSwapLocked` moved the swap lock out of the rest census the same way):
  keep every lock assertion (a pending call disables the controls on screen AND greys all five command
  rows; swallowed clicks even after a hostile re-enable; settle re-enables).
- m24s3 block (≈5643-6050): `battle.recruit.noBait` / `battle.recruit.listLabel` resolve only with Recruit
  open; the sinks test and the `«key»` walk already click Swap (c8iCmd(parent,'swap')) — click Fight and
  Recruit too, in turn. `battle.action.flee` stays (Flee is not removed in this slice).
- rb56 block (≈3321-3600): skill labels at rest → open Fight first.
- e-1 blocks (363, 448): bait selection preserved across re-renders → open Recruit first; the "set exactly
  once" test likewise.
- RT-PVP-DS-01 (1000-1178): Submit buttons present when not pending → open Fight first; the "none when
  pending" assertions stay.
- rb-121 (6057-6470): if it clicks a skill at rest, open Fight first.
- ctl-8i (6894-7795) and ctl-8j (7796-8950): many read c8iSkills / bait rows at rest; CTL8I-1-VIEW-COMMAND-LIST
  describes "five command buttons above the skill grid"; CTL8I-2 (last skill) and the walk tests; the
  ctl-8j Recruit list tests. Press the command first wherever a cell/row is read before the press. The
  ledger pins CTL8I-1-RUN-DISABLED-PVP (battleView.test.ts:7195) — keep its title and meaning intact.
- QF7.2 block: QF7.2-PICK-CLOSES-SWAP's bait half (a bait row is not on screen while Swap is open any more —
  restructure: Recruit closes Swap is already covered by OTHER-COMMAND; keep the cure half);
  QF7.2-BACK-UNDER-LOCK-STAYS-LOCKED's non-vacuity census ("skills, Flee, three bait rows and two cure rows
  on screen") — at rest only Flee + cure rows remain; CTL8J-1x-ACTION-SPENDS-PICK ("a skill, Flee, a swap
  row" over an open confirm: a skill now needs Fight, which itself closes the pick — keep the invariant
  that the held Yes/target and an A at the cursor call nothing after the action settles);
  CTL8J-1x-LOCK-ACROSS-PICK similarly.
- H4 (≈2270-2310) anchors #actionsEl via the Flee button — unchanged (Flee stays).
- Anything else that reads `[data-battle-list="skills"]`, `bait-selector`, `bait-option-none` or a skill
  label before Fight / Recruit is pressed: grep the file for those selectors and check each site.

Do NOT change: the pinned safety tests (CTL8I-1-RUN-DISABLED-PVP in this file; CTL8I-1-COMMAND-ROWS is in
battleModel.test.ts, not yours), the m14.5d cure tests (cure list unchanged), the ux4 swap tests, ctl-7b.

## Working method
1. Read standards/testing-tdd.md, the QF7.2 block (battleView.test.ts 8900-9689) for style and helpers,
   the view (client/src/ui/battleView.ts — read-only: #open at :166, #chooseCommand :538, #renderSkills
   :740, #renderActions :802, #setOpen :841, #choosePick :848, applyBattleOp :463) and the boot test.
2. Write the new block + the boot tooth, then the migrations. `node --check` is not valid for TS; keep
   the TypeScript strict (the suite is typechecked: no `any`, no unused vars; biome formats with 2-space
   indent, single quotes, 100 cols — match the surrounding code).
3. Report: the list of new tags, every migrated test (name + what changed), anything you could not
   resolve, and any contract question for the orchestrator. Do not run vitest (you cannot).
