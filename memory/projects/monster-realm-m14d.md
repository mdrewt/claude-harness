---
name: monster-realm-m14d
description: M14d weather/field-state (ADR-0095, PR #139) — review pass findings, fixes, gating tests, and residuals
metadata:
  type: project
---

M14d adds weather/field-state to the battle engine (ADR-0095). PR #139 open on `feat/m14d-weather-field-state`.

## What was built (build run, pre-review)
- `game-core/src/combat/weather.rs` (new): WeatherKind/WeatherEffect enums, weather_attack_modifier, apply_weather_damage, tick_weather
- `game-core/src/combat/resolve.rs`: phases 3.5 (weather chip) and 5 (weather tick) in resolve_full_turn; sets_weather fires in resolve_one_attack AFTER damage (ADR-0095 D4)
- `game-core/src/combat/damage.rs`: weather modifier applied after variance: `variance_mod * w_numer / w_denom`
- `game-core/src/combat/types.rs`: BattleState.weather + 3 new BattleEvent variants (WeatherSet/WeatherDamage/WeatherExpired)
- `game-core/src/content.rs`: SkillDef.sets_weather field; validate_content guard
- Skills 7-10 in RON (Rain Dance, Sunny Slam, Sandblast, Hailstrike); CONTENT_VERSION 8→9
- submit_attack + swap_active now use load_skills() instead of skill_defs_from_rows()

## Review pass findings and fixes (commit bf39cf2)

**BLOCKER B-1 (FIXED):** `validate_content` weather guard was vacuous — `let _valid = matches!(...)` discarded the result, never asserted. Fixed: replaced with exhaustive `match { ... }` with no wildcard arm — true compile-time OCP gate (ADR-0010).

**Minor doc fixes (FIXED):**
- weather.rs: false doc claim `u16::MAX * 3 > u64::MAX` corrected
- marshal.rs: misleading "DB path only for validation" comment corrected (taming.rs also uses it for battle resolution — see ADR-0095 residuals)

**Documented deferrals (NOT bugs — see ADR-0095 §Residuals):**
- taming.rs::attempt_recruit uses skill_defs_from_rows (sets_weather=None) — wild weather-setting skills silently dropped during recruit-fail counter-attack. Named gap, deferred m14e/m14f.
- WeatherSet fires AFTER BattleEnd when KO-move sets weather (ADR-0095 D4 intentional)
- swap_active/recruit turns skip weather chip/tick (consistent with "not full turn" design)

## Gating tests added (redteam_m14d_weather_desync.rs)
- RT-W14-DESYNC-01: proves skill_defs_from_rows vs load_skills() diverge on sets_weather (documents taming.rs residual)
- RT-W14-VALID-01: gates that valid weather skills pass validate_content after B-1 fix
- RT-W14-ORDERING-01: gates WeatherSet fires AFTER BattleEnd on KO turns (ADR-0095 D4)

## Key design decisions (ADR-0095)
- D1: skills loaded from content cache (load_skills()) not DB for set_weather population
- D2: WeatherEffect enum-with-payload (not struct) — each variant carries turns_remaining
- D3/D4: sets_weather fires AFTER damage, even on KO (does not boost own hit)
- D5: Earth=Sandstorm-immune, Water=Hail-immune (game-specific approximation)
- D6: integer-only (u64, u64) numer/denom pairs — no floats
- D7: chip = (max_hp / 16).max(1)

## CI result
just ci EXIT=0 — 1022 Rust + 778 client tests green. PR #139 OPEN (supervisor owns merge).

**Why:** ADR-0095 weather/field-state implementation review evidence and residuals tracking.
**How to apply:** Reference when reviewing M14e/M14f to pick up deferred taming.rs + ability wiring residuals.
