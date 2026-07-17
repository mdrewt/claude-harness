---
name: monster-realm-m17b
description: m17b leaderboard client UI (ADR-0120) — profile store mirror, total-order comparator, fully-covered view; fan-out traps and parked set_profile_name
metadata:
  type: project
---

# Monster Realm m17b — ranked leaderboard client UI (ADR-0120, PR #199)

Delivered RL-13 + RL-15: `StoreProfile` mirror (onInsert/onUpdate only — deliberately NO
remove path, RL-2 tripwire), `'SELECT * FROM profile'` subscription, pure total-order
comparator (rating desc → RAW name code-unit asc → identity hex asc, explicit return-0),
zero-callback `LeaderboardView` (KeyL), all 22 main.ts overlay-integration sites.

**Traps (why):**
- **Concurrent-eval file ownership shapes design:** the dom-shell coverage-exclusion eval
  exact-set-guards vite.config excludes; with `evals/**` owned by sibling m17c, the new view
  had to ship 100% happy-dom-covered INSTEAD of excluded (ADR-0120 D3). Check eval ownership
  before assuming a convention (the "every view is excluded" convention was unfollowable here).
- **New overlays need 22 main.ts sites** (inventory in project `docs/specs/m17b-plan.md`),
  incl. two easy misses: `refreshBattle` 'show' branch must hide the new overlay
  (challenger-side battle push while overlay open), and the pvp listener's `anyOverlayVisible`
  must gain the new overlay but must NEVER gain `pvpView` itself — `pvpView.refresh(vm, false)`
  HIDES the view; its absence + the `(pvpView?.visible ?? false)` disjunct preserves a
  manually-opened overlay (a plausible-looking reviewer finding, REFUTED).
- **Comparators:** never `localeCompare`/Intl (platform-dependent); always end with an
  explicit `: 0` (Array.sort contract + total-order claim); tie-break on RAW fields, never on
  display-fallback values.
- **Source-scan tests must THROW on unreadable files** (vacuous-pass = m16.5a class); and
  relative paths in `readFileSync` tests are a real defect source (`../../net` vs `../net` —
  the implementer correctly refused to fix a gating test and routed it back to the tester).
- **RT-PR-06-style absence tests** (no removeProfile) pass green pre-impl by design — verify
  they bite by adding-the-method, not by the RED set.

**Parked (supervisor):** `set_profile_name` does NOT exist server-side (brief assumed it) —
follow-up slice with RL-14 rating delta: server-module ranking.rs + bindings + ADR-0119 D6
RL-7 tooth amendment (evals/** = m17c) + `validate_name` at profile-write + battleModel/View.
Consider bundling with [[monster-realm-m17a]] residual `m17-fix-sideb-guards`.

ADR next-free = 0121.
