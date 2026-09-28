# 0021. Dialogue & quest system (data-driven trees + flag-based state)
- Status: accepted
- Date: 2026-06-24
- Surfaced by: M12 design. No v1 precedent (NPCs partial; quests new).

## Context and problem statement
The world needs purpose: NPCs that talk, branching dialogue, and quests that track progress and grant
rewards. This must be **data-driven** (a content game scales by data, not code), **server-authoritative**
(a client must not grant itself a reward or skip a gate), **owner-private** (your quest state is yours), and
deterministic. The open question is how rich the quest model is.

## Considered alternatives
- **Data-driven dialogue trees + flag/progress quest state in `game-core`, server-evaluated (chosen).**
  Dialogue = RON trees (nodes/choices/conditions-on-flags/effects); quests = definitions (steps/conditions/
  rewards) over a per-player flag+progress set; pure advance rules in `game-core/quest`; the server evaluates
  and applies effects/rewards. Handles fetch/talk/defeat quests; owner-private (RLS).
- **Scripted/code dialogue & quests** (logic in reducers/TS). Not data → every quest is a code change and a
  desync/duplication risk. Rejected (violates data-driven + SSOT).
- **A full embedded scripting language** for quests. Powerful but over-engineered for the scope and a large
  security surface. Rejected (YAGNI) — flags + data trees suffice.
- **A richer state-machine / branching-cutscene quest engine.** A possible later enhancement; flagged for the
  user at the Phase B checkpoint. Deferred.

## Decision outcome
- Chosen: **data-driven dialogue trees + flag/progress quest state, pure rules in `game-core`, evaluated
  server-side**, with quest state owner-private (RLS) and rewards routed through the M9/M13 item/currency
  helpers.
- Consequences: dialogue/quest content is validated (`validate_content`: no dangling node/flag/reward refs;
  append-only ids); rewards are cheat-proof (server-evaluated); the system grows by content. A richer quest
  engine remains an additive future option.
