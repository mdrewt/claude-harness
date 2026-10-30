# ctl-10a plan — world A/Y act on what you face; T retired; healing only at the healer (CTL10A.1-4)

Worktree `projects/monster-realm/.claude/worktrees/ctl-10a`, branch `ctl-10a`, base c0c7b3b6.
Planner: agent ab1a7342d4c7539a2 (full text in its transcript). Orchestrator amendments marked (ORCH).

## Scope / hidden deps
- No STOP. touches-delta (sibling tests of declared code files): main.input.test.ts, main.dispatch.test.ts
  (siblings of main.ts), catalog.test.ts + catalogParity.test.ts (siblings of the catalogs),
  screens/worldScreen.test.ts (new sibling), main.controls.test.ts only if the Box focus pin moves.
- Outside touches, worked around (residuals): overlayA11yWiring.test.ts:260 passes onHealParty →
  keep `readonly onHealParty?: () => void` unread (R-ctl-10a-BOXCB); healModel.ts healTargetLocationId
  export stays, main.ts stops importing it, absent locationId → healUnavailable (R-ctl-10a-HEALTARGET;
  types.ts healParty.locationId optional comment "until ctl-10a" stale); stale prose in ARCHITECTURE.md,
  DECISIONS.md, wasm-boundary skill, dialogueModel.ts:4, healScreen.ts:5 (R-ctl-10a-DOCS).
- Untouched wasm mocks (6 screens/*.boot.test.ts + main.chips/controls/dialogueDismiss/feedbackCore/
  menu/social) lack the export → main.ts reads it via a guarded lazy accessor (try/catch around the
  property read AND the call → []); proof = those files green unmodified.

## Design (core/shell)
- Sheet/picker = a main.ts-owned sub-state of the WORLD BASE (FrameId/Command are closed outside
  touches). No new *View.ts, no aria-modal, no new static shell.
- interactModel.ts: marshalInteract(npcs, characters, heals, ownEntityId) → {wire, candidates}
  (parallel, NO zone/range filter, ids decimal strings); resolveCandidates(fn|undefined, own, m) TOTAL
  (throw/non-array/bad index → []); interactChip(cands) → null | single | choose. Actions:
  dialogue NPC→talk, shop NPC→shop (dispatched as talk), heal NPC→heal(loc), heal row→heal, player→[].
  FACING_CODE N0 S1 E2 W3. nearestInteractable/interactPrompt/keyGlyph deleted.
- actionSheetModel.ts: pickerEntries(cands) (entity×action, actionable only), sheetEntries(primary),
  openSheet → null when empty, sheetStep (Up/Down nav; fresh A runs+closes; repeat A swallowed;
  B/Start close).
- screens/worldScreen.ts: worldButton(sheet, cands, btn) → {sheet, result, run?}. A: 0 actionable →
  unhandled (no toast), 1 → run actions[0], ≥2 → picker. Y: sheetEntries(cands[0]) or unhandled.
  0/1/many counted over ACTIONABLE candidates (ctl-10b additive).
- main.ts: delete KeyT block, interactAtNearest→runInteract(action), characterTileMap/TALK_RANGE/
  talk_range import if unused, per-frame resolver. Candidate memo keyed batchSeq|zone|x|y|facing on the
  authoritative own row (one wasm call per key change; chip + A/Y share it). worldBaseLive() =
  movementEnabled(...); movementGate() = worldBaseLive() && worldSheet === null. routeCtx.screen:
  battleButton ?? worldInteract ?? screenHost.button. Consumed press → navHeldCodes.add (held Enter
  can't hit Yes on the heal frame it opened); open → held.clear()+resetRepeat; reconnect → worldSheet=null.
  Chip keeps id `interact-prompt`; text tf('interact.chip',{key,verb,name}) / tf('interact.choose',{key});
  sheet rows via navRender.renderNav (listbox, is-active, aria-selected). Keycap from
  ROUTED_BINDINGS.buttons.A[0] via a Map (Enter/NumpadEnter → key.enter, else raw code).
- boxView.ts: remove #healBtn + box.heal; main.ts drops onHealParty.
- helpModel: drop T row, add Enter interact row.

## Catalog (+8 −1): interact.chip, interact.choose, interact.entry, interact.verb.{talk,shop,heal},
interact.healer, key.enter; remove box.heal. FR: Choisir…, Parler, Boutique, Soigner, Guérisseur, Entrée.
NPC name = npcId (dialogueModel precedent).

## e2e (tester writes, orchestrator runs serially)
controls.ts: safeTile/walkTo/faceTile/interactWithNpc (retry while NPC wanders; poll own facing before A).
dialogue/wallet-balance talkUntilOpen → interactWithNpc. shop-npc: dist-2 now negative; (7,1) facing
(8,1) chip `[Enter] Shop — tideglass_shopkeeper`. recruit healViaBox → heal at zone-0 (8,3) from (7,3)
facing East: A (heal frame, Yes default) then A; retry ≤8 for cooldown; box-title sentinel.

## Tests / gates — see planner §6 (tags CTL10A-<n>-*). CHECK shape = ctl-8k vitest JSON.
## Sizing: shed rule — if A+e2e > ~65% budget, DEFER CTL10A.4 -> backlog [gameplay/LOW].
## Decision (doc-keeper, post-merge since DECISIONS.md is outside touches): world sheet as main.ts
sub-state; 0/1/many over actionable; shop NPC offers Shop only; Box heal retired.

## REV 2 — plan-lens amendments (reviewer a723c6d37f8112ecb, red-team ae3987da225bfab56) (ORCH)
- Sheet state lives in ScreenHost (screens/index.ts), NOT a main.ts variable: router.ts:174 swallows
  the D-pad unless ctx.nav is set, and takesNav drives nav + the :2134 intercept + navHeldCodes.
  ScreenHost.button(stack, btn, ctx, world?: WorldPort) where WorldPort = { candidates(): readonly
  InteractCandidate[]; run(action: InteractAction): void }. World arm: worldButton(#sheet, cands, btn);
  run → world.run(action) + 'consumed'; 'unhandled' → baseButton. takesNav true iff stack is the bare
  world and #sheet !== null. opened()/forget() clear #sheet; closeSheet() for the per-batch observe when
  the stack is not a bare world. `get sheet()` for the render. movementGate() = movementEnabled(..) &&
  screenHost.sheet === null.
- Letter accelerators under the sheet fall through and open their frame → opened() closes the sheet
  (coherent); test that the sheet never returns and movement is live after.
- worldInteract gating: the world arm only runs at a bare world base, so A on a heal frame / battle never
  reaches it (tests: A on an open heal frame confirms once; A on a battle base sends no talk).
- Facing/position = predicted state (what the player sees) with the authoritative row as fallback;
  zone from the authoritative row. Memo key batchSeq|identity|zone|x|y|facing; batchSeq = main.ts
  counter on store.onBatchApplied.
- Sheet A revalidates: runs only if the chosen entry (candidate.key|action.kind) is still among the
  current candidates' actions; else closes, sends nothing.
- Keycap + verbs via LITERAL switches in main.ts (catalogParity dynamic-key + DEAD-KEY rules);
  keycap switch on ROUTED_BINDINGS.buttons.A[0]: Enter/NumpadEnter → i18nT('key.enter'), default raw code.
- resolveCandidates(fn, origin, input, onError?) — total; onError reports (deduped) so a real wasm Err
  is not silent.
- Chip anchor: single → its candidate; choose → first actionable candidate.
- help: drop T; add Enter (interact with what you face) and F (every action for what you face).
- e2e geometry per red-team #6/#7: face by stepping into a standing tile; recruit heal path
  (1,2)→(1,1)→(6,1)→(6,2)→(6,3)→East to (7,3) facing (8,3); heal frame: A opens (Yes default), A heals,
  cursor moves to No; close before KeyB; migrate healViaBox AND restoreHpBeforeEncounter. dialogue/wallet:
  stand at (6,3) facing South, A when elder_oak is on (6,4).
- hardcodedStrings SINK_FLOOR>=169: check the margin after the diff.
- Residuals: R-ctl-10a-BOXCB, R-ctl-10a-HEALTARGET, R-ctl-10a-DOCS (+contextStack.ts:5, rowConvert.ts:523,
  contextStack.test.ts:2130), R-ctl-10a-SHEETA11Y (sheet not announced / no focus) LOW.
