# Spec: M-postgate-feel-polish — carried-over r1 feel strays + r2 movement feel

**Status:** queued, post-gate, un-blocked (spawned by r2 playtest feedback 2026-07-26 per the
SSOT's r2-specific addendum, which required sizing two r1 strays; episode `r2-2026-07-26`, ledger
items 087-090) · **Owner:** Drew · **Decision:** ADR at build time.
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** none.

## 1. Problem / intent

Four small feel/polish items, three carried over from r1 (never sized until now — an I-1/I-4
process gap logged as ledger item 091's sibling defect, now closed by this spec existing) plus one
re-confirmed in r2:

- Care button has no visible effect (r1 report, Stage 7).
- Movement feel tuning: player walk speed slightly too fast (r1 Stages 2-3; echoed as still-present
  glitchiness in r2 item 003).
- NPC movement is jerky (too-fast stop/start bursts); pathing could be smoother.
- No walk animation (character is static while moving).

## 2. Acceptance criteria (EARS)

- WHEN the player presses the care-button/action, THE UI SHALL show a visible confirmation (toast,
  animation, or stat-delta feedback) — verify server-side `apply_care` (ADR-0046/pt-c5a) already
  succeeds; this is very likely a client feedback gap, not a server bug — confirm before assuming.
- WHEN tuning walk speed, THE change SHALL be a numeric constant adjustment with a before/after
  comparison, not a structural rewrite — low risk, LIGHT weight.
- WHEN NPCs move, THE npc_decide/movement tick SHALL avoid abrupt stop/start bursts — investigate
  the existing NPC movement cadence (`M12a` npc_decide) before changing it structurally.
- WHEN a character sprite moves, THE renderer SHALL play a walk animation cycle (sprite sheet
  frame-stepping) instead of a static frame — art/asset dependency: confirm sprite sheets already
  have walk frames (per the `pt-d2` art pipeline) before scoping this as code-only.

## 3. Touches (declared for fan-out eligibility)

Client render/movement (`client/src/*` movement + rendering), possibly `game-core`/server NPC
movement cadence for the jerky-NPC item. Independent of battle/UX/evolution milestones.

## 4. Notes

Weight: LIGHT per item; bundle as one small slice (four related, cheap, disjoint-from-everything-
else feel fixes) rather than four separate slices.

## 5. DELIVERED / PARKED (slice `feel-polish`, 2026-07-27, ADR-0159)

Scope verification found the "four LIGHT items" estimate held for only two of the four. Shipped the
two that were genuinely in-scope and light; parked the other two with evidence.

- [x] **DONE — item 087, care-button feedback.** Confirmed NOT a server bug: `care`
  (`server-module/src/raising.rs:69-108`) succeeds and dual-writes bond/`last_care_at_ms`/
  `evolves_to`. Two client causes: `onCare` used `sendGuarded`, which attaches only a `.catch` (no
  success branch at all), and `CARE_COOLDOWN_MS` is **6 hours**, so most playtest clicks are
  legitimate rejections — whose message went to `statusEl`, an unstyled div that the
  `z-index:100; inset:0` raising overlay paints over. Both fixed via the established in-overlay
  `showFeedback` idiom + a `#pending` re-entrancy guard.
- [ ] **PARKED — item 088, walk speed.** HIDDEN DEPENDENCY, needs its own slice. The only lever is
  `pub const STEP_MS: i64 = 200` at **`game-core/src/world.rs:13`**, which is *also the server tick
  interval* (`server-module/src/lib.rs:132-134`) — not a client feel constant, and outside this
  slice's declared `touches:`. Blast radius: 6 client test files hardcode a literal `200`
  (`movementSim`, `renderResolver`, `predictor`, `store`, `heldKeys`, `interpolation`), plus
  `world.rs:1035`'s `assert_eq!(STEP_MS, 200)`, 3 e2e specs, and `evals/hold-commit-step-budget`
  which gates `HOLD_COMMIT_MS + 33.33 + 1 < STEP_MS` — ADR-0158 swept `HOLD_COMMIT_MS = 150`
  against `STEP_MS = 200` with only ~22.9 ms slack. Raising STEP_MS (slower walk) is the safe
  direction; lowering it may force `HOLD_COMMIT_MS` to move too. Land it AFTER ADR-0159 and re-check
  `NPC_CONTINUE_REROLL` — `K × STEP_MS` is the real NPC feel quantity.
- [x] **DONE — item 089, jerky NPC movement.** The "NPCs lack client interpolation" hypothesis was
  REFUTED (they take the identical ADR-0090 path as remote players). Real cause: `npc_decide` chose
  uniformly among all four compass directions with no regard for walls or the wander radius, and
  `elder_oak`'s home (5,5) has a wall directly south — 14.3% of ticks were wall-bumps. Fixed by
  making the rule collision- and radius-aware with a 1-in-6 voluntary re-roll. Measured on the real
  grid: bumps 14.3%→0%, immediate reversals 32.3%→24.1%, mean run 1.14→2.48, and the NPC now reaches
  all 8 of its legal tiles.
- [ ] **PARKED — item 090, walk animation.** Assets are READY (`client/public/assets/hero.png` +
  `hero.json`, 160×128, 20 frames, `walk_{down,up,right,left}` animations already baked in, from
  `client/art-src/generate_art.py:968`) — so this is code-only, NOT blocked on art. But the renderer
  consumes none of it: the only wired `AssetProvider` is `client/src/render/placeholderAssets.ts`,
  which draws procedural rounded rects, and `characterView.ts:47-55` holds one static texture per
  `(action, facing)` with no frame index. Landing this needs a net-new async atlas-loading seam
  (`Assets.load` in `WorldRenderer.init`, a frames-per-AnimKey `AssetProvider`, an injected-clock
  `walkFrameIndex` pure core, and a fallback to `PlaceholderAssets` on load failure so a 404 cannot
  black-screen the game). **ADR-0144 §D7 already deferred exactly this** as "well past a content
  slice". The needed `action`/`facing` signals already reach `world.ts:139`. Do NOT animate the
  placeholders — that pays the whole seam cost and ships no art.
