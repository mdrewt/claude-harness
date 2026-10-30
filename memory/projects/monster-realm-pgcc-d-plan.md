# pgcc-d plan — battle/pvp/box decisions → battleModel, boxModel

Base: origin/master 156d5b9c. Worktree `.claude/worktrees/pgcc-d`, branch `pgcc-d`.

## Re-verified evidence (main.ts @156d5b9c)
- `refreshBattle` (main.ts ≈2648-2686): inline bait-item list (inventory × `store.itemDef`, missing
  def dropped, NO recruitBonus filter here — `buildBattleViewModel` classifies), inline cure-item list
  (`!def || def.cureStatus === null` dropped), inline pending-clear rule
  (`pending !== null && (turn > pending || outcome !== 'Ongoing')`). STILL INLINE → D1, D2.
- `onPvpAttack`/`onPvpSwap` already collapsed into `sendPvpAction` (main.ts ≈1769-1785, ctl milestone).
  Capture `latest?.turnNumber ?? null`, rejection writes `null`. STILL INLINE → D2.
  battleModel `battleCommands` disables submit while `pvpPendingSubmit` (≈645), so the pending value
  before a submit is `null` on every reachable path: "restore prior" ≡ today's `null` — no reachable
  behaviour change.
- `dispatch` case `setPartySlot` (main.ts ≈1518-1532): `slot === -1` literal → `nextFreePartySlot` or
  `chrome.status.partyFull`. STILL INLINE → D4.
- `-1` emitters: `boxView.ts` `#renderCard` To Party (≈651, IN touches) and
  `ui/screens/monstersScreen.ts:537` (`toParty ? -1 : …`, NOT in touches) → residual (see below).
- vite.config.ts KNOWN FOLLOW-UP: Escape terminal latch is gone (`continuedBattleId`, a pure core),
  bait-id parse is gone (ctl-8j nav rows keyed by id). Still inline after this slice: boxView's
  nickname-changed guard (boxView.ts ≈377), main.ts pvp opponent-name lookup, MOVE_REJECT_PREFIX
  toast filter, `projectKeyStore`.

## Design (functional core / imperative shell)
battleModel.ts (pure, imports only `type` store rows):
- `buildBaitItems(inventory: readonly StoreInventory[], itemDefs: ReadonlyMap<number, StoreItemRow>): BaitItem[]`
  one row per stack whose def exists (missing def → dropped, never throws), order = inventory order.
- `buildCureItems(inventory, itemDefs): CureItem[]` — def present AND `cureStatus !== null`.
- `pvpPendingAfterBatch(pending: number | null, latest: { turnNumber: number; outcome: string }): number | null`
  null→null (no-op); clears on `turnNumber > pending` or `outcome !== 'Ongoing'`; else keeps pending.
- `pvpSubmitPending(prior: number | null, latest: { turnNumber: number } | undefined): { pending: number | null; onReject: number | null }`
  pending = `latest?.turnNumber ?? null`; onReject = prior. ONE rule for attack and swap.
boxModel.ts:
- `export const NEXT_FREE_PARTY_SLOT = -1;`
- `export type PartySlotResolution = { kind: 'send'; slot: number } | { kind: 'partyFull' }`
- `resolvePartySlot(requested: number, ownMonsters: readonly StoreMonsterPub[], partySize: number)`
  requested ≠ sentinel → send(requested) (explicit slot or the box sentinel, unchanged — server
  validates); sentinel → send(nextFreePartySlot) or partyFull.
Shells:
- main.ts `refreshBattle`: `const inventory = store.ownInventory(identity); const itemDefs = store.itemDefs();`
  → builders; `pvpPendingTurnNumber = pvpPendingAfterBatch(pvpPendingTurnNumber, r.action.battle)`.
- main.ts `sendPvpAction`: `const submit = pvpSubmitPending(pvpPendingTurnNumber, store.latestPlayerBattle(identity))`;
  set `submit.pending` inside the sendGuarded lambda (frozen check stays first); `.catch` sets `submit.onReject`.
- main.ts `setPartySlot`: `resolvePartySlot(command.slot, store.ownMonsters(identity), PARTY_SIZE)`;
  `partyFull` → reportError(partyFull) + DONE; else send `r.slot`. Drop now-unused imports.
- boxView.ts: `onSetPartySlot(card.monsterId, NEXT_FREE_PARTY_SLOT)`; doc comment names the constant.
- vite.config.ts: rewrite KNOWN FOLLOW-UP to the verified still-inline list; drop the stale
  "(this slice does not touch client/src logic)" clause.

## Anti-patterns avoided
No source-text scans/evals/thresholds; no wrapper module; no new export from main.ts; no change to
pre-existing tests (main.partyFull, boxView.test's `-1` emission, main.dispatch partyFull).

## Residual (out of touches)
- monstersScreen.ts:537 still emits the `-1` literal; switching it to `NEXT_FREE_PARTY_SLOT` needs
  `client/src/ui/screens/monstersScreen.ts` (not in touches). Value is identical (-1, pinned by the
  D4 test), so no behaviour gap — a one-token Boy Scout follow-up.

## Gates (filled in the ledger after the tester's red run fixes test counts)
- D1: `npm --prefix client run test -- src/ui/battleModel.test.ts -t PGCCD-D1`
- D2: `npm --prefix client run test -- src/ui/battleModel.test.ts -t PGCCD-D2`
- D4: `npm --prefix client run test -- src/ui/boxModel.test.ts -t PGCCD-D4`
EXPECT pins `Tests  N passed | M skipped`.

## Lenses
Plan: reviewer + red-team (one batch). Post-impl: reviewer, red-team, /simplify, verifier.
desync-guard / reducer-security-auditor: N/A (no game-core, no server-module, no bindings).
