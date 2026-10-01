# Monster Realm v2 — Plan

> **Status (2026-10-01):** the game is BUILT through its launch-adjacent milestones. Phases A–D
> (M0–M17.5, the playtest replan, and M20–M24) are closed; the 2026-07-25 playtest gate returned
> CONDITIONAL PASS and its hardening milestones are closed; the 2026-09 de-bloat program halved
> the repo and fixed nine player-visible bugs. What remains is the console-controls redesign
> (operator directive 2026-10-01, front of the queue), the M25 security sign-off, client-coverage
> hardening, controller support before launch, two post-gate-provisional content milestones
> (M18/M19), and open residual fill-work. History: every closed milestone's spec is verbatim in `archive/`
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
  no coverage/mutation thresholds (except the grandfathered nightly mutation config: game-core
  zero-miss and the server cap — that project decision stands), no proof-of-teeth ceremony.
- The standing residual file is `residuals.spec.md` (open items only; 29 sections as of
  2026-10-01 — the 25 triage survivors plus 4 LOW rows the 21r-a run disclosed; 0 HIGH/CRITICAL
  in the file. The HIGH S-overlay-anchor item lived only in an archived catalogue and is now
  scheduled in the console-controls milestone). Residuals
  fill idle capacity and never preempt this roadmap; triage-carried rows are scheduled by hand
  (mr-gates promote is closed to follow-up chains).

## §9 Roadmap (build order — first unfinished, non-`blocked:` item wins)

1. **M-postgate-console-controls** (`M-postgate-console-controls.spec.md`, design
   `console-controls-design.md`, specced 2026-10-01 from the operator's directive
   `operator-feedback-2026-10-01-controls.md`): the client's PRIMARY interface becomes a virtual
   D-pad + A/B/X/Y/LB/RB/Start/Select with contextual meanings, one context stack (B back one level,
   Start opens the main menu and closes everything), D-pad navigation of every screen, remappable
   per-browser bindings, game-screen pointer = A/B, one overlay frame over the game screen (closes
   the orphaned S-overlay-anchor HIGH and the bottom-of-page panels), and the validated UI bug
   cleanup. Letter hotkeys stay as optional accelerators. Moved to the front: nothing critical or
   unblocked is ahead of it (master green; M25 is blocked and server-side). Supersedes the
   uxd2/uxd3 reading of playtest feedback r2-023 and the DECISIONS entry "Client UI: one overlay
   registry, keyboard first".
2. **M25 Security audit & launch sign-off** (`M25-security-audit.spec.md`, respecced 2026-09;
   S0 done) — `blocked:checkpoint-2-ratification`: S1 rewrites two e2e tests that currently
   assert the trade-oracle leak as intended behavior, and S2 changes a frozen schema; the
   operator ratifies both at the harness-revision Checkpoint 2, which lifts this block. Once
   unblocked its server-side slices may run alongside item 1 (file overlap is limited to the
   trade-propose copy; sequence per the controls spec). **Launch is gated on its completion**
   (design ADR-0034's intent, carried forward).
3. **M-postgate-client-coverage** (`M-postgate-client-coverage.spec.md`, re-scoped 2026-10-01):
   after item 1, extract the remaining inline decision logic in `main.ts` into tested pure cores —
   pgcc-a (feedback core + the uncatalogued care string), pgcc-c (battle event-emit latches),
   pgcc-d (battle/pvp/box decisions). pgcc-b is superseded by item 1.
4. **Residual fill-work** (`residuals.spec.md`, 29 open sections plus 3 unpromoted ledger rows as
   of 2026-10-01): MED items first when a fan-out slot is idle — notably rb-128-E1 (avatar lost on
   reload during deletion grace), R-rb-73-ABORT-PHANTOM (phantom session wedge),
   R-rb-132-WALLETSYBIL (guest-export sybil DoS) and R-rb-52-GRACEANNOUNCE. R-rb-56-FOLLOWUP-ACC
   and R-rb-121-DEFER-FOCUS-RECHECK are absorbed by item 1.
5. **⛩ Playtest-3 gate** — raised when everything above is closed (the standing residual file
   never blocks it; open HIGH/CRITICAL security/data residuals do). Drew plays; findings become
   milestones or residuals.
6. **M-gamepad** (`M-gamepad.spec.md`, sketch) — controller support as one more input source on
   item 1's virtual-button layer. **Must land before launch** (operator, 2026-10-01).
7. **M18 Co-op raids** (`M18-coop-raids.spec.md`, sketch; design ADR-0027) — post-gate
   provisional: build only after the playtest-3 read confirms it's the right next content.
8. **M19 Guilds/chat/social** (`M19-social.spec.md`, sketch; design ADR-0028) — post-gate
   provisional, after M18. M23's social a11y retrofit scope un-defers with it; chat input uses
   item 1's typing mode.
9. **M21b-3 Steam login** — flagged, never scoped; needs an operator decision before any spec.
   Steam Input maps onto item 1's virtual buttons.

Milestone specs for 6–9 are sketches: elaborate via `milestone-loop-prompt.md` when reached,
against the CURRENT game repo (never against archived specs).

## Gates and constraints (live)

- **Launch** is gated on M25 completion (human sign-off checklist, operator-approved) and on
  M-gamepad (operator, 2026-10-01).
- **Playtest-3** timing per the supervisor doctrine (`memory/projects/mr-supervisor-prompt-native.md`).
- **RLS remains unenforced at SpacetimeDB 2.8.1** — privacy is enforced by the private-table +
  owner-scoped-view pattern (DECISIONS.md "Table privacy"); the RLS re-open triggers recorded in
  `security-threat-model.md` and `validation-checklist.md` still do not fire.
- Frozen surfaces: `client/src/module_bindings/` is generated-only (game repo AGENTS.md) and
  schema changes are additive-only (DECISIONS.md "Schema changes are additive"); any schema
  change needs bindings regen + a publish-over-data proof (docs/debloat/REPORT.md §maintainer).
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
Postgate review follow-ups: **M-postgate-twentyfirst-review-residuals** (21r-a #528, 21r-b
#527, 21r-e #532, 21r-b2 #530 — merged 2026-09-28..30; spec file still live in this directory,
pending its move to `archive/`).
Infra: **M-infra-a** CI caching · **M-stdb-2x** module-SDK 2.8.1 · **M-infra-d** ADR digest and
**M8.95** knowledge bundle (both later retired by the de-bloat) · **M-loop-infrastructure**
(supervisor tooling; superseded by the 2026-09 harness revision).

## Risks (live)

- The two deliberate pre-release economy gaps (heal sink inert; PvP side-B reward) are OWNER
  decisions, not bugs — do not "fix" them without an operator directive.
- M18/M19 build cost is speculative until the playtest-3 read; treat their sketches as intent.
- Any schema change re-opens migration risk: publish-over-data proof required, always.
