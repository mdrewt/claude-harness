# Spec: M-postgate-dev-observability — client dev-console event/state toggle

**Status:** queued, post-gate, un-blocked (spawned by r2 playtest feedback 2026-07-26, episode
`r2-2026-07-26`, ledger items 043/045/046) · **Owner:** Drew · **Decision:** ADR at build time.
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** none; complements the
existing pt-b1 client observability work (error overlay + event ring, ADR-0130).

## 1. Problem / intent

Drew wants to see, in the browser dev console, the events the client sends to the server over the
websocket (explicitly NOT the noisy inbound NPC-wander stream by default), plus any other
game-state info useful for playtest debugging — toggleable so it runs in dev and is compiled/config
out of production.

## 2. Acceptance criteria (EARS)

- WHEN a dev-observability flag is enabled (build-time or runtime env toggle, consistent with the
  existing `pt-a1` prod-safe fail-loud pattern), THE client SHALL log outbound reducer calls to the
  dev console.
- WHEN the flag is disabled (default production build), THE system SHALL emit zero additional
  console output and SHALL NOT increase production bundle size materially.
- THE inbound event stream SHALL remain off by default even with the flag enabled (Drew's own
  call — too noisy) — expose it as a SEPARATE, more verbose sub-toggle if useful.
- Reuses the existing `eventRing`/error-overlay substrate (`pt-b1`, ADR-0130) where it fits rather
  than duplicating a second logging mechanism.

## 3. Touches (declared for fan-out eligibility)

Client only: wherever outbound reducer calls are dispatched (likely a thin wrapper/interceptor),
plus a build-time or `import.meta.env`-style flag. No server, no schema.

## 4. Notes

Weight: LIGHT. Disjoint from the battle/movement/UX milestones — a good fan-out candidate.
