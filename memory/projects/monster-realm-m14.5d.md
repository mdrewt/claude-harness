---
name: monster-realm-m14.5d
description: M14.5d client battle UX completeness — weather banner, parity guards, VM-compare (ADR-0101); EARS 14.5d-2/3/4; 14.5d-1 PARKED (spec gap)
metadata:
  type: project
---

# Monster Realm M14.5d — Client Battle UX Completeness

**Status:** TERMINAL — PR #154 open (https://github.com/mdrewt/monster-realm/pull/154), local `just ci` EXIT=0 (1075 Rust / 833 client / 53 evals), remote CI running; supervisor merges + indexes ADR  
**ADR:** 0101 (CONSUMED). ADR next-free = 0102  
**Branch:** `feat/m14.5d-client-battle-ux` tip `dc0a4f6`  
**Touches:** `client/src/**` only (excl. `module_bindings/**`)

## What landed

**Why:** M14.5 spec §14.5d — weather state never reached the client store; no
refresh guard caused repeated re-renders; no exhaustive outcome switch; no
bindings-derived parity checks for status/weather/outcome variants.

### D1 — Weather pipeline: SDK row → store → VM → DOM banner

`StoreWeather { tag: string; turnsRemaining: number }` added to `store.ts`
(mirrors `StoreStatusEffect`). `StoreBattle.weather: StoreWeather | null`.
`SdkBattleRow.state.weather` mapped in `rowConvert.ts` with explicit rename
`value → turnsRemaining` (zero-falsy trap: `!= null` check, never `?.value || null`).
`battleModel.ts` adds `weatherBanner(tag): string` (unknown → `''` + `console.warn`)
and `BattleViewModel.weather: { label, turnsRemaining } | null`.
`battleView.ts` gains `#weatherBannerEl` / `#renderWeatherBanner`
(`data-testid="weather-banner"`, textContent-only); `#renderActions` unchanged.

### D2 — BattleOutcomeTag literal union + exhaustive switch

`BattleOutcomeTag = 'Ongoing' | 'SideAWins' | 'SideBWins' | 'Fled'` in
`battleModel.ts`. `buildBattleViewModel` narrows `StoreBattle.outcome` (string)
at the VM boundary; unknown → `console.warn` + `null` VM. `#renderOutcome`
exhaustive switch with `never`-check default replacing the old string interpolation
arm. `decideBattleOverlay` unchanged (operates on `StoreBattle.outcome: string`).

### D3 — Bindings-derived parity guards (proof-of-teeth)

Tests derive variant lists at runtime from `X.algebraicType.value.variants[].name`.
Each anchors on exact length (StatusEffect=5, WeatherEffect=4, BattleOutcome=4)
AND a known-member, so empty arrays cannot pass vacuously. Test files import
bindings read-only; `store.ts`/`rowConvert.ts` stay SDK-agnostic.

### D4 — VM-compare refresh guard

`battleVMsEqual(a, b)` pure function: field-by-field, bigint via `===`, arrays
length-first, weather `== null` undefined-tolerant. JSON.stringify rejected
(throws on bigint). `shouldSkipBattleRefresh(visible, lastVm, vm)` pure predicate:
`true` only when `visible && vm !== null && lastVm !== null && battleVMsEqual(...)`.
`main.ts refreshBattle()` uses it with `battleView.visible` as primary guard
(hidden → never skip, all hide paths safe including Escape bare-hide).
`lastBattleVM` reset on hide-branch, Escape, and `resetPredictionState`.

### 14.5d-1 PARKED — spec gap (undeclared server dependency)

`cure_status` exists only on `game-core ItemDef` (content.rs:170), deliberately
absent from public `item_row` table (battle.rs:779 doc comment). Classify-by-data
(ADR-0047) requires an additive `cure_status` column on `item_row` + content
seeding + bindings regen — server-module changes outside this slice's declared
touches. Spec's "client/src/** only" declaration is a spec gap. Unblocking: server
slice adds additive column, client slice mirrors bait-selector pattern.

## Documented gaps (consequences)

- Sleep `turnsRemaining` not in `BattleMonsterCardVM` — a future sleep-countdown
  display must add it to both the VM and `battleVMsEqual` or the guard suppresses
  tick re-renders (ADR-0100-D6-style gap note).
- Two unknown weather tags with equal `turnsRemaining` compare equal (via `''`
  labels) — zero visual impact; parity test prevents it for known variants.
- `console.warn` on unknown outcome/weather fires ~20 Hz until bindings regen —
  intentional loudness.

## ADR cross-references
- [[monster-realm-m14.5c]] — ability-system wiring (ADR-0100); ADR next-free=0101
- [[monster-realm-m13.5e]] — bait save/restore (13.5e-1) preserved by this slice
- [[monster-realm-m14e]] — StatusApplied slot/badge (ADR-0096); badge pattern mirrored here for weather
