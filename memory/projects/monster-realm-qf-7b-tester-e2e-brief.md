# qf-7b tester brief — E2E migrations (Playwright specs under client/e2e)

You are the `tester` for slice qf-7b of monster-realm, e2e half. You migrate the Playwright specs that
drove the battle's retired/relocated controls to the command-list path. You do NOT implement the feature;
you never touch client/src. Your Bash is static-only; the orchestrator runs Playwright and reports reds.

WORKTREE (edit here, nowhere else): /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/qf-7b
FILES YOU MAY EDIT (and ONLY these): client/e2e/encounter-battle.spec.ts, client/e2e/recruit.spec.ts,
client/e2e/trade-interlock.spec.ts, client/e2e/my-battle-privacy.spec.ts, client/e2e/pvp-side-b.spec.ts,
client/e2e/monster-privacy.spec.ts, client/e2e/battle-dpad.spec.ts. (client/e2e/controls.ts and every
other file are OUT of scope — inline any helper you need in the spec that uses it.)
RULE (QF7B.4 / testing-tdd.md): never delete, skip, fixme or weaken a test; every assertion survives;
comments stay honest (update stale `Source: battleView.ts:…` notes you touch).

## What changes in the view (QF7B.2, shipped by this slice)
The battle's command list (`[data-testid="battle-commands"]`, rows `battle-command-fight|recruit|swap|bag|run`,
each a <button>, aria-disabled="true" when greyed) is the first step of every action:
- the skills grid (PvE cells "<name> (<power>) · <affinity> · Acc n%", PvP cells "Submit: …") renders ONLY
  after Fight is pressed, and closes again on every new turn (CTL8I.1: a new turn starts on Fight), on a
  PvP wait, on B, and when another command is pressed. So EVERY attack is: click `battle-command-fight`,
  wait for a skill cell (`[data-battle-list="skills"]`) to be visible, click the cell.
- the bait list (`[data-testid="bait-selector"]` with `[data-testid="bait-option-none"]` first and one
  `[data-recruit-bonus]` row per bait) renders ONLY after Recruit is pressed, and closes on a new turn.
  So every recruit attempt is: click `battle-command-recruit`, wait for `bait-option-none` visible, click
  it (or a bait row), then `[data-testid="recruit-action"]` (Yes).
- The legacy Flee button is NOT removed in this slice (deferred), but the command list's Run is the
  sanctioned flee path and every spec migrates to it now (QF7.4): replace every
  `getByText('Flee', { exact: true })` / `getByRole('button', { name: t('battle.action.flee') … })` click
  with `getByTestId('battle-command-run').click({ timeout: 5_000 })` and keep the wait that follows.
  Run is greyed in a PvP battle (aria-disabled, with a reason) — every site here is a wild battle.
- The Swap bench rows already render only after Swap (qf-7, shipped). The Bag cure list is unchanged.

## Call sites to migrate (line numbers as of origin/master b75c28e9 — re-read, they may drift)
- client/e2e/recruit.spec.ts
  - R1 (:549-614): the bait-selector / No-bait assertions must press `battle-command-recruit` first; ADD
    the new-contract witness before the press (no `bait-selector` attached before Recruit is pressed —
    `toHaveCount(0)` on the locator); keep every existing assertion after the press. Flee cleanup :611 → Run.
  - R2 (:700-930): the Water-type flee :732 → Run; the low-HP flee :776 → Run; the skill attack loop :792
    (`button:has-text("(")`) must press `battle-command-fight` on EVERY iteration (the grid closes each
    turn) and wait for the cell before clicking — keep the existing "skills not visible → break"
    semantics (if Fight is aria-disabled or the battle ended, break as before); the recruit loop :893 flee
    → Run; the recruit click :908 (`bait-option-none`) must press `battle-command-recruit` on EVERY attempt
    (a failed attempt advances the turn and closes the list) before `bait-option-none` then `recruit-action`.
  - :1106 is a comment in a TODO test (no code) — update the comment.
- client/e2e/trade-interlock.spec.ts :681 (cleanup flee) → Run.
- client/e2e/encounter-battle.spec.ts: huntNonWaterEncounter :180 (flee Water wilds) → Run; attackOnce
  :196-210 (`button:visible` filtered `/\(\d+\) · /`) → press `battle-command-fight` first, wait for the
  cell, then click. Read the whole file: E0/E1… tests may count buttons or hit-test the grid — keep
  every assertion true under the new contract (press Fight where the grid is expected on screen).
- client/e2e/my-battle-privacy.spec.ts :484 (`button:has-text("(")` on pageA) → press
  `battle-command-fight` on pageA first, wait for the cell, keep the bounded retry and its assertion.
- client/e2e/pvp-side-b.spec.ts: the "overlay came up" witness :335 (B's `Submit:` visible) → B's
  `battle-commands` visible, then press B's `battle-command-fight` and expect `Submit:` visible (the
  renders-fully witness survives); B submits :362 (already open from the step above) ; A submits :371 →
  press A's `battle-command-fight` first; the next-turn witness :402 ("Submit buttons visible again") →
  the next turn starts closed: expect B's `battle-command-fight` to be live (aria-disabled "false") and
  pressing it shows `Submit:` again. Keep the DEV-hook anti-slide assertion.
- client/e2e/monster-privacy.spec.ts :480-483 (both overlays up = `Submit:` visible) → `battle-commands`
  visible on both pages, then press `battle-command-fight` on both and expect `Submit:` visible on both
  (keeps the "overlay renders FULLY" witness that follows).
- client/e2e/battle-dpad.spec.ts: already drives Fight→A→skill (fightToOutcome) and Recruit→A→bait
  (CTL8J-2-DPAD-BATTLE-A). Read it; change nothing unless a step assumes the grid or bait list on
  screen before its command is pressed. Its header comment (:25) may need a sentence.
- Also grep all seven files for `Flee`, `has-text("(")`, `Submit: `, `\(\d+\) · `, `bait-option-none`,
  `bait-selector`, `data-battle-list="skills"` and check each hit.

## Style
Playwright TS, strict; 2-space indent, single quotes, 100 cols (biome). No new shared helpers outside the
spec file; a small inline `async function pressFight(p: Page)` per file is fine. No bare sleeps: wait
on locators / `expect.poll`. No `new RegExp(` (Semgrep gate). Keep the bounded-retry patterns.

Report: every edit (file:what), anything ambiguous, anything you decided NOT to change and why.
Do not run Playwright (you cannot).
