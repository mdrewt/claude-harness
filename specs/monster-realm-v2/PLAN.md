# Monster Realm v2 — Plan

> **Status (2026-10-24):** the game is BUILT through its launch-adjacent milestones. Phases A–D
> (M0–M17.5, the playtest replan, and M20–M24) are closed; the console-controls redesign and
> client-coverage milestones are merged. **Playtest-3 returned PASS WITH CHANGES**
> (`playtest-feedback-2026-10.md`, episode pt3-2026-10: 186 ledger items, dispositioned
> 2026-10-24) and reshaped this queue: a quickfix wave first, then the tactical-combat overhaul
> (the operator's top priority), then the remaining feedback milestones. **All seven Playtest-3
> decision batches were ANSWERED 2026-10-24** (monster-realm #583–#588 + harness #160; verbatim
> answers under `memory/projects/decisions/`, rulings folded into each spec): battle cutover is
> BIG-BANG (wild+PvP at once) with the operator's new action-queue/idle-clock mechanic; next
> playtest = ONE strict §10 gate after everything; recruit pays nothing; trade/UI/econ/identity
> recommendations accepted with small additions. Still open: the two 2026-10-15 corrective
> milestones (queued first), the M25 security sign-off (blocked), controller support before
> launch, and residual fill-work.
> This file describes only what is true and open today. A closed milestone's spec is deleted once
> its lasting decisions are recorded (the game repo's `docs/DECISIONS.md`; the harness's for loop
> tooling); git history holds the rest. §Built names what the closed milestone ids refer to.

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
  2026-10-15 — the 25 triage survivors plus 4 LOW rows the 21r-a run disclosed; 0 HIGH/CRITICAL
  among its sections, but ONE HIGH ledger row is open:
  R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD (ux-a11y; verified fixed by ctl-7b GAME #550,
  operator ACCEPTED the fixed disposition 2026-10-24 by closing issue monster-realm#580 without
  comment — row closable in the acceptance ledger). The HIGH S-overlay-anchor
  item lived only in an archived catalogue and was delivered by the console-controls slices
  ctl-7a/ctl-7b, GAME #549/#550). Residuals
  fill idle capacity and never preempt this roadmap; triage-carried rows are scheduled by hand
  (mr-gates promote is closed to follow-up chains).

## §9 Roadmap (build order — first unfinished, non-`blocked:` item wins)

1. **M-world-art-pass** (`M-world-art-pass.spec.md`, specced 2026-10-24; **elaborated 2026-11-09 —
   build-ready, 11 slices**): staged placeholder upgrade per `docs/research/hd2d-modern-retro-art-direction.md`.
   S0 `wap-0` locks the style guide + a provenance art registry (no ai-placeholder asset ships); S1 adds the
   ten-class terrain grammar in game-core `wap-1`, the terrain-kit atlas with animated water + shore band `wap-2`,
   the battle placeholder set (missing sheets, registry URLs, integer art scale, backdrop) `wap-3`, the terrain
   renderer `wap-4` and hero atlas `wap-5`; S3 draws heal landmarks + warp markers from data `wap-6` and grows
   both zones (distinct coastal Tideglass Cove `wap-7`; Verdant Hollow with a non-grass healer `wap-8`); S2 is
   the `pixi-filters` post stack + fixture look-dev scene `wap-9`; `wap-10` proves the integrated flow. After
   `wap-0`, `wap-1`/`wap-2`/`wap-3` fan out, then the content chain runs beside the render chain. No table,
   reducer or binding change. Art direction ANSWERED (#587 D5: keep ¾/32px/storybook, 2D-HD as a post stack).
   First slice to launch: `wap-0`.
2. **M-trade-sessions** (`M-trade-sessions.spec.md`, specced 2026-10-24): multi-stage trade
   redesign (blank session → per-side edits → confirm-with-reset → atomic execute), new
   eligibility rules, absorbs residuals R-weekly-review-2026-10-02-F5 / 2026-10-16-F1 /
   R-ctl-PROXGUARD. Scope rules ANSWERED (#585: all three asset classes tradable, no gifts +
   simple soft-lock guards, face-to-face initiation + one session per pair, arrive-in-party-else-
   Storage, lock-at-confirm).
3. **M-netcode-presence** (`M-netcode-presence.spec.md`, specced 2026-10-24): remote-player
   continued-walk extrapolation (operator-ruled; Idle-debounce + staleness timeout; own-path
   predictor machinery untouched) and tap-to-turn facing (never cancel-on-keyup — ADR-0148).
4. **M-econ-onboarding** (`M-econ-onboarding.spec.md`, specced 2026-10-24): starter kit,
   faucet/sink tuning (fixes the uncapped practice-battle faucet), heal-cost timing. Decisions
   ANSWERED (#587): kit = ~200g + 2–3 items once-only; recruit pays NOTHING (quest faucets
   compensate in eo-4); healing free until eo-4; monster-sink gap accepted (GDD §7 note).
5. **M-identity-handles** (`M-identity-handles.spec.md`, specced 2026-10-24): minted name
   discriminator (survives the M22 re-key cascade), Players-tab info (name + discriminator +
   lead-monster level + nearby), Sign-In hidden until an issuer exists. All four decisions
   ANSWERED (#588, recommendations accepted). Feeds M19.
6. **M25 Security audit & launch sign-off** (`M25-security-audit.spec.md`, respecced 2026-09;
   S0 done) — `blocked:checkpoint-2-ratification`: S1 rewrites two e2e tests that currently
   assert the trade-oracle leak as intended behavior, and S2 changes a frozen schema; the
   operator ratifies both at the harness-revision Checkpoint 2, which lifts this block. Its
   server-side slices may run alongside items 1–5 where files are disjoint (note: item 2
   rebuilds the trade surface S1 touches — re-check S1's test targets when both are live).
   **Launch is gated on its completion.**
7. **M-gamepad** (`M-gamepad.spec.md`, sketch) — controller support on the virtual-button
   layer, consuming the context-stack ownership design, plus the hold/long-press edges the
   tactical battle defers (Hold Y cancel-and-clear, Hold B skip playback). **Must land before launch** (operator,
   2026-10-01). Ordered after the tactical battle UI (M-battle-tactics, built) — operator-CONFIRMED
   (#583 D4, 2026-10-24).
8. **M19 Guilds/chat/social** (`M19-social.spec.md`, sketch) — absorbs the
   discriminator surfaces from item 5; ordered AHEAD of M18 — operator-CONFIRMED (#588 D4,
   2026-10-24). M23's social a11y retrofit scope un-defers with it.
9. **M18 Co-op raids** (`M18-coop-raids.spec.md`, sketch) — the playtest-3
   read did NOT confirm it as next content; its 1v1 "additive resolve_coop_turn" premise dies
   with the tactical overhaul. Re-sketch on the tactical engine (M-battle-tactics P2 is built; tactical sides natively support
   allies).
10. **M-battle-tactics depth** (unspecced) — `blocked:playtest-4-read`: the operator-deferred tactical
   features, specced after the Playtest-4 read. Obstacles/cover blocking movement and ranged/AoE
   (pt3-2026-10-138; the `blocks_los` tile column and LoS(blockers) signature are already in place),
   tile elevation with attack bonuses (-139; `elevation` column, default 0), line/cone AoE (-141;
   reserved `Line`/`Cone` shape variants), and the depth re-enable waves (D583.1, each re-running
   the Playtest-4 gates): D1 entry abilities on deploy + 4-AP Swap/reserve, D2 weather/field
   (upkeep slot 3), D3 signature wave + one 2×2-footprint line. Design SSOT:
   `M-battle-tactics-design.md`. Hold-to-act inputs (Hold Y cancel, Hold B skip) belong to M-gamepad.
11. **Residual fill-work** (`residuals.spec.md`): MED items first when a fan-out slot is idle —
   notably rb-128-E1 (avatar lost on reload during deletion grace), R-rb-73-ABORT-PHANTOM,
   R-rb-132-WALLETSYBIL and R-rb-52-GRACEANNOUNCE. Rows absorbed by pt3 milestones are marked
   in each spec (trade: F5, 2026-10-16-F1,
   PROXGUARD; econ: 2026-10-09-F1).
12. **M21b-3 Steam login** — flagged, never scoped; needs an operator decision before any spec.
   Steam Input maps onto the virtual buttons.
13. **Structural work** (`structure.spec.md`, standing): open `type: refactor` slices
   (`standards/spec-driven.md` §Refactor slices). The supervisor's structural share schedules it
   ahead of this position; when no earlier item has a launchable slice, its slices launch in
   file order. Its `type: design` slices decide internal-design questions; those are not operator
   decisions. An empty file is a finished item once no plan file under the game's
   `docs/refactors/` lists an extraction still to make. With no section open and a plan file
   listing extractions, the tick's action is to section the next three.

Milestone specs for items 1–10 are sketches or ceremony-pending where marked: elaborate via
`milestone-loop-prompt.md` when reached, against the CURRENT game repo. ⛩ **Playtest-4 gate** is DECIDED (#583 D5, 2026-10-24 — strict §10, alternative A):
ONE gate after every coverage milestone closes. No interim playtest.

## Gates and constraints (live)

- **Launch** is gated on M25 completion (human sign-off checklist, operator-approved) and on
  M-gamepad (operator, 2026-10-01).
- **Playtest-3** completed (PASS WITH CHANGES, 2026-10). **Playtest-4** = strict §10: ONE gate
  after all coverage milestones close (operator ruling 2026-10-24, #583 D5 — no interim gate).
- **RLS remains unenforced at SpacetimeDB 2.8.1** — privacy is enforced by the private-table +
  owner-scoped-view pattern (DECISIONS.md "Table privacy"); the RLS re-open triggers recorded in
  `security-threat-model.md` and `validation-checklist.md` still do not fire.
- Frozen surfaces: `client/src/module_bindings/` is generated-only (game repo AGENTS.md) and
  schema changes are additive-only (DECISIONS.md "Schema changes are additive"); any schema
  change needs bindings regen + a publish-over-data proof (docs/debloat/REPORT.md §maintainer).
- Toolchain: SpacetimeDB 2.8.1 CLI/host + 2.8.1 module crate; 2.x syntax
  (`#[table(accessor = x)]`, `ctx.sender()`); upgrade runbook in the game repo's
  `docs/runbooks/spacetimedb-upgrade.md`.

## §Built (what the closed milestone ids name)

Open specs and code comments name closed milestones by id. The record of a closed milestone is
the code plus the game repo's `ARCHITECTURE.md` and `docs/DECISIONS.md`.

- Core loop: **M0** foundation · **M1** movement · **M2** server module · **M3** client
  prediction · **M4** frontend · **M5** integration/e2e · **M6** monsters & individuality ·
  **M7** battles · **M8** encounters/recruit · **M8.9** server-module modularization · **M9**
  raising · **M10** evolution (fusion since replaced by catalyst evolution) · **M11** authored
  world · **M12** NPCs/dialogue/quests · **M13** economy · **M14** deeper battle · **M15**
  trading · **M16** PvP · **M17** ranked ladder.
- Platform & compliance: **M20** observability/performance · **M21** accounts/auth (Steam login
  is §9 item 12) · **M22** privacy/deletion/export · **M23** accessibility · **M24** i18n
  (en/fr) · **M25 S0** threat-model consolidation.
- Client: **M-postgate-console-controls** (`ctl-*`; the virtual-button controls, design SSOT
  `console-controls-design.md`) · **M-postgate-client-coverage** (`pgcc-*`) ·
  **M-pre-playtest-polish** · **M-ui-foundation** (`wf-1`, `uif-*`; the shared menu kit — tokens,
  one scale authority, TabBar/ContextSheet/EmptyState/RowCard, four feedback channels — and the
  flattened menu IA; design SSOT `M-ui-foundation-wireframes.md`).
- Combat: **M-battle-tactics** (`bt-*`; the tile-grid tactical battle engine, wild and PvP, and
  the big-bang cutover that removed the 1v1 system; design SSOT `M-battle-tactics-design.md`).
- Playtest-3 fixes: **M-pt3-quickfix** (`qf-*`; the playtest-3 bug-fix and
  low-hanging-fruit wave).
- Corrective: **M-test-truth** (`ttd-1`; one whole-tree i18n scan replaces the per-file
  scans) · **M-stack-ownership** (`so-*`; the context stack owns player-opened frames).
- Follow-up rounds: an `N.5` milestone, an "Nth review residuals" milestone and an `NNr-*`
  slice id each name a review follow-up to the numbered work; **M-playtest-a…d** prepared the
  2026-07 playtest and the other **M-postgate-\*** / **M-evolution-essence-\*** milestones
  acted on it.
- Infra: **M-infra-a** CI caching · **M-stdb-2x** module SDK 2.8.1 · **M-loop-infrastructure**
  (the supervisor tooling, `memory/projects/mr-*`).

## Risks (live)

- The two deliberate pre-release economy gaps (heal sink inert; PvP side-B reward) are OWNER
  decisions, not bugs — do not "fix" them without an operator directive.
- M18/M19 build cost is speculative until the playtest-3 read; treat their sketches as intent.
- Any schema change re-opens migration risk: publish-over-data proof required, always.
