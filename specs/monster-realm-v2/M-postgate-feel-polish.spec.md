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
