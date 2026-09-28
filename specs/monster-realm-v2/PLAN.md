# Monster Realm v2 — Plan

> **Status (2026-09-28):** the game is BUILT through its launch-adjacent milestones. Phases A–D
> (M0–M17.5, the playtest replan, and M20–M24) are closed; the 2026-07-25 playtest gate returned
> CONDITIONAL PASS and its hardening milestones are closed; the 2026-09 de-bloat program halved
> the repo and fixed nine player-visible bugs. What remains is the M25 security sign-off, two
> post-gate-provisional content milestones (M18/M19), client-coverage hardening, and open
> residual fill-work. History: every closed milestone's spec is verbatim in `archive/`
> (one-line index in §Done); this file describes only what is true and open today.

## What this is

A cozy 2D multiplayer monster-taming game: a pure deterministic Rust `game-core` shared by the
SpacetimeDB `server-module` and the wasm client-prediction layer, a PixiJS/TS client, and a
headless sim harness. Design intent: `game-design.md` (as amended by the essence-graph redesign —
fusion was replaced by catalyst evolution; the Bond stat was retired). The spine, determinism
rules, privacy model, and all live decisions are the game repo's own docs: `ARCHITECTURE.md` and
`docs/DECISIONS.md` (title-keyed, supersede-in-place — the single decision log).

- Per-slice `touches:` + EARS criteria live in each milestone's `M*.spec.md`, never here.
- §9 lines are one-line summaries + status only.
- Verification doctrine: `standards/testing-tdd.md` (harness-wide SSOT). No eval-script gates,
  no coverage/mutation thresholds, no proof-of-teeth ceremony — those retirements are permanent.
- The standing residual file is `residuals.spec.md` (open items only; 25 at last triage,
  0 HIGH/CRITICAL). Residuals fill idle capacity; they never preempt this roadmap.

## §9 Roadmap (build order — first unfinished, non-`blocked:` item wins)

1. **21r follow-ups** (`M-postgate-twentyfirst-review-residuals.spec.md`, triaged 2026-09-28,
   in progress): 21r-a (taming softlock, MED) and 21r-b (uncatalogued UI strings, HIGH) MERGED
   2026-09-28 as the revision program's rehearsal slices; **21r-e remains** — answered decision
   #479 (trade-time Trust/QT reset) + the two adjudicated DECISIONS gap entries.
2. **M25 Security audit & launch sign-off** (`M25-security-audit.spec.md`, respecced 2026-09;
   S0 done) — `blocked:checkpoint-2-ratification`: S1 rewrites two e2e tests that currently
   assert the trade-oracle leak as intended behavior, and S2 changes a frozen schema; the
   operator ratifies both at the harness-revision Checkpoint 2, which lifts this block.
   Ordinary colocated tests + a human sign-off checklist; **launch is gated on its completion**
   (design ADR-0034's intent, carried forward).
3. **M-postgate-client-coverage** (spec to be authored when reached): extract the inline
   decision logic in `main.ts` / `battleView.ts` / `boxView.ts` into tested pure `*Model.ts`
   cores. The old coverage-denominator framing is retired; the goal is testable cores, judged
   by review, not a percentage.
4. **Residual fill-work** (`residuals.spec.md`): MED items first when a fan-out slot is idle —
   notably rb-128-E1 (avatar lost on reload during deletion grace), R-rb-73-ABORT-PHANTOM
   (phantom session wedge), R-rb-132-WALLETSYBIL (guest-export sybil DoS),
   R-rb-52-GRACEANNOUNCE and R-rb-56-FOLLOWUP-ACC (a11y announcements).
5. **⛩ Playtest-3 gate** — raised when everything above is closed (the standing residual file
   never blocks it; open HIGH/CRITICAL security/data residuals do). Drew plays; findings become
   milestones or residuals.
6. **M18 Co-op raids** (`M18-coop-raids.spec.md`, sketch; design ADR-0027) — post-gate
   provisional: build only after the playtest-3 read confirms it's the right next content.
7. **M19 Guilds/chat/social** (`M19-social.spec.md`, sketch; design ADR-0028) — post-gate
   provisional, after M18. M23's social a11y retrofit scope un-defers with it.
8. **M21b-3 Steam login** — flagged, never scoped; needs an operator decision before any spec.

Milestone specs for 6–8 are sketches: elaborate via `milestone-loop-prompt.md` when reached,
against the CURRENT game repo (never against archived specs).

## Gates and constraints (live)

- **Launch** is gated on M25 completion (human sign-off checklist, operator-approved).
- **Playtest-3** timing per the supervisor doctrine (`memory/projects/mr-supervisor-prompt-native.md`).
- **RLS remains unenforced at SpacetimeDB 2.8.1** — privacy is enforced by the private-table +
  owner-scoped-view pattern (DECISIONS.md "Table privacy"); the RLS re-open triggers recorded in
  `security-threat-model.md` and `validation-checklist.md` still do not fire.
- Frozen surfaces: schema/reducer signatures and `client/src/module_bindings/` per the game
  repo's CONTRIBUTING.md — conductor-grade sign-off + publish-over-data proof to change.
- Toolchain: SpacetimeDB 2.8.1 CLI/host + 2.8.1 module crate; 2.x syntax
  (`#[table(accessor = x)]`, `ctx.sender()`); upgrade runbook in the game repo's
  `docs/runbooks/spacetimedb-upgrade.md`.

## §Done (chronological; every spec verbatim in `archive/`)

Foundations & core loop: **M0** foundation · **M1** movement · **M2** server module ·
**M3** client prediction · **M4** frontend · **M5** integration/e2e · **M6** monsters &
individuality · **M7** battles · **M8** encounters/recruit · **M8.9** server-module
modularization · **M9** raising · **M10** evolution (fusion later replaced) · **M11** authored
world · **M12** NPCs/dialogue/quests · **M13** economy · **M14** deeper battle · **M15** trading ·
**M16** PvP · **M17** ranked ladder.
Review-residual rounds (an artifact of the retired weekly-review machine): M8.5–M8.8, M10.5,
M12.5, M13.5, M14.5, M16.5, M17.5, and the postgate 11th–20th rounds.
Playtest replan (2026-07): **M-playtest-a/b/c/c.5/d** (deployment, observability, UX completion,
pre-gate residuals, content pack) → **playtest gate 2026-07-25: CONDITIONAL PASS**
(`archive/playtest-gate-decision-2026-07-25.md`) → **M-postgate-netcode-hardening** ·
**M-postgate-ux-hardening** · **M-postgate-ux-design** · **M-postgate-movement-investigation** ·
**M-postgate-feel-polish** · **M-postgate-dev-observability** · **M-postgate-battle-0hp-fix** ·
**M-postgate-evolution-fusion-hardening** · **M-evolution-essence-graph** +
**M-evolution-essence-redesign** (fusion → catalyst evolution; Bond retired) ·
**M-postgate-roster-wave-3**.
Platform & compliance (Phase D, greenlit by the 2026-08-08 operator override): **M20**
observability/performance · **M21** accounts/auth (b-3 Steam remains open above) · **M22**
privacy/deletion/export · **M23** accessibility · **M24** i18n (en/fr) · **M25 S0**.
Infra: **M-infra-a** CI caching · **M-stdb-2x** module-SDK 2.8.1 · **M-infra-d** ADR digest and
**M8.95** knowledge bundle (both later retired by the de-bloat) · **M-loop-infrastructure**
(supervisor tooling; superseded by the 2026-09 harness revision).

## Risks (live)

- The two deliberate pre-release economy gaps (heal sink inert; PvP side-B reward) are OWNER
  decisions, not bugs — do not "fix" them without an operator directive.
- M18/M19 build cost is speculative until the playtest-3 read; treat their sketches as intent.
- Any schema change re-opens migration risk: publish-over-data proof required, always.
