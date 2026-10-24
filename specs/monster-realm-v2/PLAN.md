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
> History: every closed milestone's spec is verbatim in `archive/` (one-line index in §Done);
> this file describes only what is true and open today.

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

1. **M-test-truth** (`M-test-truth.spec.md`, specced 2026-10-15 — corrective C3b): retire the 17
   per-file `scanSource` blocks whose surfaces the sentinel runtime pairs already guard
   (adjudicated per file in the spec body), and de-ratchet the i18n tree scan to one plain
   zero-failing-sinks assertion with a tightened `SINK_FLOOR` (the tree scan itself is kept).
   One slice (ttd-1), ordered before item 2's roster-pin rewrite.
2. **M-stack-ownership** (`M-stack-ownership.spec.md`, specced 2026-10-15 — corrective C2b):
   the context stack becomes the owner of player-opened frames. Two serialized slices (both
   touch `main.ts`; no fan-out): so-1 routes the reconnect block's ten direct hides through the
   stack while the unconditional view-state resets survive; so-2 (atomic-or-reverted, and gated
   on an `mr-ask-drew` operator answer BEFORE merge) inverts to push-then-show `openFrame` with
   frame-level dedup and Social-panel routing, shrinks the mirror to the server-owned trio and
   rewrites the roster pins once. A **named design input of M-gamepad** and of item 5's menu-IA
   work, and ordered before both. The pt3 menu-IA flatten (Social direct-open, Profile combine)
   is now ANSWERED (#586 D3, 2026-10-24); so-2's own SO2.0 design-presentation gate still runs
   at build time with that answer on record.
3. **M-pt3-quickfix** (`M-pt3-quickfix.spec.md`, specced 2026-10-24 from episode pt3-2026-10):
   the playtest's bug-fix + low-hanging-fruit wave — focus-ring styling, care feedback routing +
   cooldown surfacing, journal chrome/empty state, NPC conversation pinning + wander cadence,
   `advance_dialogue` rollback + quest-acceptance visibility, battle legacy-control retirement,
   mouse-only duplicate removal, raising→Inventory split with stats-in-Summary, terminology
   sweep, tab-strip CSS, profile polish, zone-transition cue, reward visibility. Runs after so-2
   (shared `main.ts` surface); slices are FEATHER/LIGHT and fan-out friendly.
4. **M-battle-tactics** (`M-battle-tactics.spec.md`, specced 2026-10-24; rulings folded
   2026-10-24 — the operator's TOP priority, "immediately after any bug fixes and low-hanging
   fruit"): combat overhaul to tile-grid tactical battles (1–3 monsters per side, tuned-AP
   move/attack/item/recruit actions, range/origin/target/AoE attack data, round-based speed
   order, the operator's action-queue + idle-clock mechanic). P0 design ceremony is UNBLOCKED
   (#583/#584 answered; reception-research pre-step directed); P1 = tactical wild battles and
   P2 = PvP/ranked conversion are BUILD phases behind ONE big-bang cutover (#583 D2/D3 — the
   1v1 system is hard-replaced when both are done); P3 = operator-deferred future features
   (obstacles, elevation, line/cone AoE). Battle presentation (sprites/background/animation
   placeholders) lands inside it; placeholder assets come from item 6.
5. **M-ui-foundation** (`M-ui-foundation.spec.md`, specced 2026-10-24): the shared menu
   design-language milestone — one tab-bar component, bordered context sheet, four-channel
   feedback policy, wheel + pseudo-scroll, text-size setting, single-scale-authority scaling,
   menu-IA restructure, Help rework (Introduction + encyclopedia), spacing tokens. Wireframes
   first (operator directive, reaffirmed #586 D2). Decisions ANSWERED (#586): hybrid scaling,
   IA flatten all-three, mini-menu design delegated (wireframe-driven), battle Bag→"Items",
   footer collapse-when-empty. Builds after so-2 and is ordered after item 4's P1 so the
   tactical battle UI lands on the final component system rather than being rebuilt.
6. **M-world-art-pass** (`M-world-art-pass.spec.md`, specced 2026-10-24): staged placeholder
   upgrade (style guide → terrain kit → look-dev lighting scene per
   `docs/research/hd2d-modern-retro-art-direction.md`), real water art + heal-location landmark,
   distinct zone-1 art, larger authored maps, battle placeholder sprites (feeds item 4 P1).
   Content-heavy and file-disjoint from items 4–5: fills idle fan-out capacity throughout; the
   art-direction question is ANSWERED (#587 D5: keep ¾/32px/storybook, 2D-HD as a post stack) —
   S0 unblocked.
7. **M-trade-sessions** (`M-trade-sessions.spec.md`, specced 2026-10-24): multi-stage trade
   redesign (blank session → per-side edits → confirm-with-reset → atomic execute), new
   eligibility rules, absorbs residuals R-weekly-review-2026-10-02-F5 / 2026-10-16-F1 /
   R-ctl-PROXGUARD. Scope rules ANSWERED (#585: all three asset classes tradable, no gifts +
   simple soft-lock guards, face-to-face initiation + one session per pair, arrive-in-party-else-
   Storage, lock-at-confirm).
8. **M-netcode-presence** (`M-netcode-presence.spec.md`, specced 2026-10-24): remote-player
   continued-walk extrapolation (operator-ruled; Idle-debounce + staleness timeout; own-path
   predictor machinery untouched) and tap-to-turn facing (never cancel-on-keyup — ADR-0148).
9. **M-econ-onboarding** (`M-econ-onboarding.spec.md`, specced 2026-10-24): starter kit,
   faucet/sink tuning (fixes the uncapped practice-battle faucet), heal-cost timing. Decisions
   ANSWERED (#587): kit = ~200g + 2–3 items once-only; recruit pays NOTHING (quest faucets
   compensate in eo-4); healing free until eo-4; monster-sink gap accepted (GDD §7 note).
10. **M-identity-handles** (`M-identity-handles.spec.md`, specced 2026-10-24): minted name
   discriminator (survives the M22 re-key cascade), Players-tab info (name + discriminator +
   lead-monster level + nearby), Sign-In hidden until an issuer exists. All four decisions
   ANSWERED (#588, recommendations accepted). Feeds M19.
11. **M25 Security audit & launch sign-off** (`M25-security-audit.spec.md`, respecced 2026-09;
   S0 done) — `blocked:checkpoint-2-ratification`: S1 rewrites two e2e tests that currently
   assert the trade-oracle leak as intended behavior, and S2 changes a frozen schema; the
   operator ratifies both at the harness-revision Checkpoint 2, which lifts this block. Its
   server-side slices may run alongside items 3–10 where files are disjoint (note: item 7
   rebuilds the trade surface S1 touches — re-check S1's test targets when both are live).
   **Launch is gated on its completion** (design ADR-0034's intent, carried forward).
12. **M-gamepad** (`M-gamepad.spec.md`, sketch) — controller support on the virtual-button
   layer, consuming item 2's stack-ownership design. **Must land before launch** (operator,
   2026-10-01). Ordered after item 4's tactical battle UI stabilizes — operator-CONFIRMED
   (#583 D4, 2026-10-24).
13. **M19 Guilds/chat/social** (`M19-social.spec.md`, sketch; design ADR-0028) — absorbs the
   discriminator surfaces from item 10; ordered AHEAD of M18 — operator-CONFIRMED (#588 D4,
   2026-10-24). M23's social a11y retrofit scope un-defers with it.
14. **M18 Co-op raids** (`M18-coop-raids.spec.md`, sketch; design ADR-0027) — the playtest-3
   read did NOT confirm it as next content; its 1v1 "additive resolve_coop_turn" premise dies
   with the tactical overhaul. Re-sketch AFTER item 4's P2 (tactical sides natively support
   allies).
15. **Residual fill-work** (`residuals.spec.md`): MED items first when a fan-out slot is idle —
   notably rb-128-E1 (avatar lost on reload during deletion grace), R-rb-73-ABORT-PHANTOM,
   R-rb-132-WALLETSYBIL and R-rb-52-GRACEANNOUNCE. Rows absorbed by pt3 milestones are marked
   in each spec (quickfix: WALKEDAWAYROLLBACK, R-ctl-11b-RAISINGCARDS; trade: F5, 2026-10-16-F1,
   PROXGUARD; ui-foundation: R-ctl-14-*, R-ctl-11a-MONSTERSTAB, 2026-10-02-F3, R-ctl-SETRATIO;
   econ: 2026-10-09-F1).
16. **M21b-3 Steam login** — flagged, never scoped; needs an operator decision before any spec.
   Steam Input maps onto the virtual buttons.

Milestone specs for items 4–14 are sketches or ceremony-pending where marked: elaborate via
`milestone-loop-prompt.md` when reached, against the CURRENT game repo (never against archived
specs). ⛩ **Playtest-4 gate** is DECIDED (#583 D5, 2026-10-24 — strict §10, alternative A):
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
#527, 21r-e #532, 21r-b2 #530 — merged 2026-09-28..30).
Console controls (operator directive 2026-10-01): **M-postgate-console-controls** (ctl-1..ctl-16
+ pgcc-c/d, monster-realm PRs #542–#577; design SSOT `console-controls-design.md`) ·
**M-postgate-client-coverage** (pgcc-a #535, pgcc-c/d) → **⛩ Playtest-3 gate** raised via
decision issue monster-realm#578, acked 2026-10-15 → **played 2026-10** → verdict **PASS WITH
CHANGES** (`playtest-feedback-2026-10.md`; episode pt3-2026-10, 186 items dispositioned
2026-10-24; queue reshaped above).
Pre-playtest polish: **M-pre-playtest-polish** (polish-1, GAME #579 — built, merged 2026-10-05;
P1/P2/P4/P5 shipped, P3/P6 closed by re-measure; its six folded residuals dispositioned fixed).
Infra: **M-infra-a** CI caching · **M-stdb-2x** module-SDK 2.8.1 · **M-infra-d** ADR digest and
**M8.95** knowledge bundle (both later retired by the de-bloat) · **M-loop-infrastructure**
(supervisor tooling; superseded by the 2026-09 harness revision).

## Risks (live)

- The two deliberate pre-release economy gaps (heal sink inert; PvP side-B reward) are OWNER
  decisions, not bugs — do not "fix" them without an operator directive.
- M18/M19 build cost is speculative until the playtest-3 read; treat their sketches as intent.
- Any schema change re-opens migration risk: publish-over-data proof required, always.
