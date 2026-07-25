# Playtest Feedback — 2026-07 closed playtest (GATE ARTIFACT)

Drew's full report: `memory/projects/PlaytestReport.md`. Full analysis, root-caused findings, and the
reshaped queue: **`playtest-gate-decision-2026-07-25.md`** (same directory) — that doc is the authoritative
source; this file exists only to satisfy the mechanical gate's wake-file check per
`mr-native-supervisor-README.md`.

## Verdict (fun gate)
- [x] PASS WITH CHANGES — reshape queue per notes below

CONDITIONAL PASS — see `playtest-gate-decision-2026-07-25.md` §7 for full rationale (core loop engaged
despite friction; friction judged a confound on H1-H3, so hardening lands before further conclusions).

## What played well
- Drew completed a full session end to end: wild encounters, a successful recruit, multiple battles,
  fusion menu, inventory, trading (two browser windows), shopping, party management.
- H1 proxy (weaken-before-recruit) 1.0 at n=7 events — directional signal, not yet statistically powered.
- Voluntarily explored menus by trial-and-error rather than giving up — genuine engagement signal.

## What didn't
- UI/UX friction dominated the session: no onboarding, inconsistent overlay design (fusion uses a proper
  overlay; trade/shop are unreadable bottom-of-page panels), no on-screen affordances for how to
  continue/exit a screen, non-responsive viewport, ambiguous sprite recoloring.
- Movement felt "slippery" (overshoot on tap, stutter-then-extra-tile on release).

## Bugs / rough edges observed (root-caused against live code — see the gate decision doc §4 for full detail)
- `main.ts` movement-suppression never calls `preventDefault()` — once any overlay opens, arrow keys get
  hijacked by native browser scroll. → `M-postgate-netcode-hardening.spec.md` nh1.
- Released movement keys never cancel already-queued steps (`predictor.clearQueue()` is never called) —
  root cause of the slippery-movement complaints. → nh2.
- Warp-path predictor epoch gap (already known since ptc5f/ADR-0085) pulled forward into the same
  milestone as nh3.
- Server telemetry (`spacetime logs`, pulled after the initial report) shows the session actually spanned
  **6 separate anonymous identities** — the client never persists a reconnect token, so every reload
  (likely triggered by the nh1 freeze) silently reset all progress to a fresh starter. → nh4. This also
  means the H2 recatch proxy (§ gate decision doc) is likely undercounted.
- `just playtest-up`/`playtest-wipe` have no SpacetimeDB-running preflight check (first thing Drew hit).
  → `M-postgate-ux-hardening.spec.md` ux3.
- `?` help overlay and the battle-result continue affordance both already exist but have no persistent
  on-screen hint (discoverability, not missing features). → ux1.
- Shop shows prices but never the player's own balance (`player_wallet` is deliberately PRIVATE,
  ADR-0081/0040) — fix via an owner-scoped view, same pattern as `player_conversation`. → ux2.
- Battle monster-switch UI already exists in code; likely explanation is recruits landing in the box, not
  the active team (needs repro, not assumed). → ux4.
- Player/NPC "moving together" and sprite recoloring: RE-INVESTIGATED 2026-07-25 (deeper read-only pass) —
  both CLOSED as confirmed non-defects (tile-merge = overlapping independent per-entity sprites + camera-scroll
  illusion, no occupancy system; recolor = intentional action-coded placeholder tint, texture-cache-collision
  disproven). See `playtest-gate-decision-2026-07-25.md` §10. Only residuals are optional design/UX follow-ups
  (server tile-occupancy; placeholder-color legend), neither scheduled.

## Untriaged report items (found in cross-check vs PlaytestReport.md, 2026-07-25 — supervisor: size these into M-postgate-ux-hardening or a feel-tuning slice)
- **Care button has no visible effect** (report Stage 7) — not covered by the gate-decision triage; needs
  investigation (no-op bug vs missing feedback affordance) before fixing.
- **Movement feel tuning** (report Stages 2-3): player walk speed slightly too fast; NPC movement jerky
  (too-fast stop/start bursts) and pathing could be smoother; no walk animation. Feel-class work, separate
  from the nh1/nh2 correctness bugs — schedule after those land so tuning happens on correct netcode.

## Queue changes wanted (if any)
`blocked:playtest-gate` LIFTED for two new front-of-queue milestones only:
`M-postgate-netcode-hardening.spec.md` (promoted from a PLAN bullet, +2 new HIGH slices) and
`M-postgate-ux-hardening.spec.md` (new). Rest of Phase D (`M-postgate-client-coverage`, M20+) stays
post-gate provisional pending a second, cleaner playtest read after the hardening lands.
`M-postgate-overlay-registry` (already parked) gets a scope note, not a new slice.
Fusion-vs-evolution design proposal PARKED pending `/debate` or `/consult` — not queued.
