# qf-7b plan — battle legacy-control retirement, remainder (2026-10-30)

Worktree `.claude/worktrees/qf-7b`, branch `slice/qf-7b` from `origin/master` b75c28e9 (deps campaign
merged: Node 24.22.0, spacetime 2.11.0 — the machine matches, no PATH shim needed this time).

## Scope decision (measured, not assumed)

**Ship:** QF7B.2 (skills grid only after Fight; bait list only after Recruit) + QF7B.4 (pins green, no
e2e deleted) + the in-`touches:` half of QF7B.1/QF7.4: every e2e that clicked the legacy Flee by text
migrates to the command list's Run (`battle-command-run`) now, so the follow-up is view + catalog only.

**DEFER (hidden dependency):**
- **QF7B.1** — removing the Flee button leaves `battle.action.flee` with zero literal requesters.
  `catalogParity.test.ts` PARITY-04 (`walkClientSrc` reads every non-test `.ts` under `client/src`;
  `DEAD_KEY_EXEMPT` is pinned to `[]`) then reds in `just ci`. Closing it needs
  `client/src/ui/i18n/messageIds.ts:151`, `catalog.en.ts:438`, `catalog.fr.ts:463` and
  `catalog.test.ts:482` (its byte-identical roster, pinned at exactly 362 keys at :1474 and :1563) —
  all outside `touches:`. Same shape as qf-8's evo-choice orphaning (`R-qf-8` park, 2026-10-26).
- **QF7B.3** — the `QF8_RETIRED` Flee row asserts the Flee is gone; it can only land with QF7B.1.

Deferred 2/4 = exactly half (the sizing cap is "more than half").

## Design — `client/src/ui/battleView.ts` only (functional core untouched: no battleModel change)

`#open: BattleCommand | null` (QF7.2) becomes the single source for all three contextual lists:

| `#open` | skills grid (`#skillsEl`) | bait list (`#actionsEl`) | bench rows | cure list |
|---|---|---|---|---|
| null | — | — | — | as today (ungated; spec silent) |
| fight | rendered | — | — | as today |
| recruit | — | rendered (+ confirm when picked) | — | as today |
| swap | — | — | rendered | as today |
| bag | — | — | — | as today (+ target when picked) |

- `#renderSkills(vm)`: early-return unless `this.#open === 'fight'` (keeps the existing `!ongoing`,
  `skills.length === 0`, `pvpPendingSubmit` returns).
- `#renderActions(vm)`: `if (vm.canRecruit && this.#open === 'recruit') this.#renderRecruit(vm)`.
- `#setOpen(command)`: if unchanged return; set; if a VM is held, `#renderSkills(vm)` then
  `#setPick(this.#pick)` (re-renders the actions row and re-applies the PvE lock to BOTH containers —
  `#setActionButtonsDisabled` already walks `#skillsEl` and `#actionsEl`).
- `refresh()`: replace `(this.#open === 'swap' && !vm.canSwap)` with "the open command is no longer
  enabled" from `battleCommands(vm)` (fight: skills>0, recruit: canRecruit, swap: canSwap; a PvP wait and
  a terminal outcome disable all) — a lost command closes its list; a same-turn regain does not reopen.
- `#choosePick(pick)`: a `recruitConfirm` pick arriving while `#open !== 'recruit'` is a held row from a
  closed list → ignore. Otherwise set `#open` to the pick's command; if it changed, `#renderSkills(vm)`
  (closes the grid) before `#setPick(pick)`.
- `applyBattleOp('back')` already routes skills→fight / recruit→recruit through `#setOpen(null)`.
- `#chooseCommand`, `hide()`, `#commitPick`, `#cancelPick`, `#seatOnPickedRow`: unchanged.

Anti-patterns to avoid: a second state flag beside `#open`; display:none instead of not rendering (the
sweeps census elements); re-rendering from `#choosePick` twice; touching the catalog; touching
`battleModel.ts`; any change to Flee (deferred), the cure list (spec silent — residual), the swap hint.

## Tests (tester-owned; the implementer never edits them)

- `battleView.test.ts`: a new `QF7B.2` describe block (contract mirrors QF7.2's header), titles
  behaviour-first with a trailing `[QF7B-2-…]` token; mandatory roster of 10 tags (ledger CHECK pins
  them by name, each exactly once). Existing tests that assume at-rest skills / bait press Fight /
  Recruit first — no assertion dropped (20r-a census, m24s3 roster, rb56, e-1, ctl-8i/8j, rb-121,
  RT-PVP-DS-01, QF7.2-PICK-CLOSES-SWAP, QF7.2-BACK-UNDER-LOCK, CTL8J-1x-ACTION-SPENDS-PICK).
- `battleScreen.boot.test.ts`: at rest no skill cell; Enter on Fight opens 4; CTL8I-3 flow kept;
  `[QF7B-2-BOOT-GRID-AFTER-FIGHT]`.
- e2e (QF7.4 migration, never deletion): recruit.spec (R1 bait after Recruit; R2 Fight before each
  skill, Recruit before each No-bait, Flee→Run ×4), trade-interlock:681 Flee→Run, encounter-battle
  (huntNonWaterEncounter Flee→Run, attackOnce Fight first), my-battle-privacy:484 Fight first,
  pvp-side-b (:335/:402 witness = `battle-commands` visible then Fight → Submit; :362/:371 Fight then
  Submit), monster-privacy:480-483 (`battle-commands` visible both sides, Fight, Submit visible).
  battle-dpad already drives Fight→A→skill and Recruit→A→bait: run, migrate only if red.

## Gates — see `gates/qf-7b.gates.md` (CHECKs are vitest JSON roster pins + git no-deletion + 2 e2e)

## Risks / follow-ups
- `client/e2e/a11y.spec.ts` CTL7B-E2E-BATTLE (outside touches) mounts a BattleView at 640x360 and
  requires the ongoing battle to SCROLL (`scrollable: true`). Without the skills grid at rest the frame is
  ~47 px shorter. MEASURE with a live server after the implementation; if red → hidden dependency
  (one-line fixture change: press Fight after show), record it, do not edit.
- The cure list (Bag) stays always-visible: QF7B.2 names skills and bait only. Residual, LOW.
- PvP: every turn starts closed on Fight (CTL8I.1), so a player presses Fight each turn before a Submit.
  That is the command-first model the feedback (-133) asks for; the e2e witnesses move accordingly.

## Evidence log (2026-10-30)
- RED (unit): bfd011cc — 33 failures on origin/master's view, every one an absence-at-rest assertion
  (12 new teeth + migrated 20r-a/rb-121/ctl-8i/QF7.2/boot); tsc + biome clean.
- GREEN: a2f83bfb — 141/141 (battleView.test.ts + battleScreen.boot.test.ts), tsc + biome clean,
  7/7 QF7B.4 pins green.
- e2e GREEN (live spacetime 2.11.0, --data-dir sandbox, --in-memory): the 7 migrated specs 17 passed /
  1 skipped (R4 fixme, pre-existing) in 3.0 min; a11y CTL7B-E2E-BATTLE 1 passed (the 640x360 scroll
  assertion holds without the grid — red-team measured scrollHeight 427 vs clientHeight 308).
- e2e RED PROOF: scratch worktree at origin/master + the migrated encounter-battle / recruit /
  pvp-side-b specs → exactly 3 failed: E1 "no skill cell before Fight is pressed" (received 2),
  R1 "no bait list before Recruit is pressed" (received 1), pvp-side-b "the next turn starts with
  the skill grid closed" (received 2 Submit buttons); E0 passed; E2/E3, R2/R3 serial-skipped.
  Sandbox left at /tmp/qf-7b-e2ered.leKhSp (registered as a detached worktree; recursive deletes
  are guard-blocked).
- Plan review (reviewer): no BLOCK; H1 (ledger ran 2/7 e2e specs) closed by the X1 gate; M2/M3/D1/D3/D4
  closed by the hardened CHECKs (floor 141, passed===total, todo 0, base-title tokens kept,
  CTL8I-1-RUN-DISABLED-PVP body equality, comment-stripped e2e counts + describe.skip + expect counts).
- Code review (reviewer): no BLOCK/HIGH. M1 (recruit.spec openSkillGrid swallows a grid regression as
  "battle ended") → tester round 2. L1/L3/L5 applied in the /simplify pass (a2f83bfb).
