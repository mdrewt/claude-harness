---
name: monster-realm-m16b
description: M16b PvP client UI (ADR-0110, PR #176) — challenge overlay, turn-submit UI, frozen-link lock fix, auto-show guard
metadata:
  type: project
---

## m16b — PvP Client UI (ADR-0110, PR #176)

**Status:** PR #176 open, local gates green, remote CI pending. Supervisor owns merge.

**Key files:**
- `client/src/ui/pvpModel.ts` — pure `buildPvpChallengeViewModel` (incoming/outgoing/challengeable)
- `client/src/ui/pvpView.ts` — DOM shell, `refresh(vm, forceVisible)`, show/hide/showFeedback
- `client/src/net/store.ts` — `StoreBattleChallenge`, `allChallenges()`, `allPlayers()`
- `client/src/net/connection.ts` — `battle_challenge` subscribed; `battle_action` NEVER subscribed

**Critical traps:**
1. `pvpPendingTurnNumber` must be set INSIDE the `sendGuarded` lambda — setting it BEFORE the call locks the UI permanently when the link is frozen (the turn never advances). Pattern mirrors `dismissPending` in dialogue dismiss.
2. pvpView auto-show in batch listener must check `anyOverlayVisible` before `forceVisible=true` — otherwise pvpView pops over an active battle on incoming challenge.
3. `challengePvp.target` is `Identity`, not `string` — wrap: `new Identity(targetIdentity)`.
4. `PvpAction` SDK shape: `{ tag: 'Attack' | 'Swap', value: number }` (not `{ Attack: number }`).
5. `makeBattle()` test fixture uses `opponentIdentity: 'alice'` (same as playerIdentity) for PvE — `opponentIdentity: 'npc'` would accidentally classify as PvP.
6. Pre-existing m15b gap closed: KeyQ/KeyH/KeyT were missing `!tradeView?.visible`.

**isPvP detection:** `!isWild && battle.playerIdentity !== battle.opponentIdentity` in `battleModel.ts`. Wild = `opponentMonsterIds.length === 0`. PvE trainer = matching identities, non-empty monsters.

**ADR next-free:** 0111

**Why:** battle_action is PRIVATE (ADR-0015 must-never-leak). pvpPendingTurnNumber is the ONLY client-side signal that the player has submitted — it is cleared when `battle.turnNumber > pvpPendingTurnNumber`.

**How to apply:** For any future PvP client additions — check that battle_action is never subscribed. Follow the pvpPendingTurnNumber-inside-lambda pattern for any state that tracks "pending send."
