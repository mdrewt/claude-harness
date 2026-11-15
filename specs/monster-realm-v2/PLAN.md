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

A cozy 2D monster-taming game played three ways — a single-player world, a private server for
friends, or the one official server (`game-design.md` §14; the same module, rules and client in all
three): a pure deterministic Rust `game-core` shared by the SpacetimeDB `server-module` and the wasm
client-prediction layer, a PixiJS/TS client, and a headless sim harness. Design intent: `game-design.md` (as amended by the essence-graph redesign —
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

1. **M-scale-readiness** (`M-scale-readiness.spec.md`, sketch 2026-11-12): the costs a static
   scaling audit and load run found growing faster than the population. Built: private movement
   intent, idle empty zones, per-zone `character` subscriptions, resuming a session where it
   left off and on-demand reapers. Open: the per-input owned-monster scan, whole-table `player_quest` and `profile` subscriptions, the unreaped
   `battle_summary`, the device-resolution terrain bake, and
   a load tool that reports fan-out. Sized to the operator's official-server target (2026-11-12):
   ~100 zones, 8–12 players per zone on average and ~50 at peak, ~600 concurrent world-wide and
   ~1,000 at peak. Must land before any playtest above ~20 concurrent players, and before launch.
2. **M-local-play** (`M-local-play.spec.md`, LP2–LP9 sketch 2026-11-12): the early-access shape —
   single-player worlds on a server the game starts, opening a world to friends, private-server
   access (valid account, then the host's allowlist or password), the standalone server package,
   sign-in once then offline, unattended upgrade, and the solo-completeness audit. Its groundwork
   is built (§Built); elaborate LP2–LP9 against `lpg-0`'s record (the game's
   `docs/local-play.md`). **Early access is gated on it.**
3. **M25 Security audit & launch sign-off** (`M25-security-audit.spec.md`, respecced 2026-09;
   S0 done) — `blocked:checkpoint-2-ratification`: S2 changes a frozen schema and waits for the
   operator's ratification at the harness-revision Checkpoint 2, which lifts this block. S1 as
   written has nothing left to change: `propose_trade`, `respond_trade` and `confirm_trade` return
   one fixed error and read nothing, and `trade-zz-negative.spec.ts` cases 1b and 3b are session
   no-oracle cases (M-trade-sessions `ts-4`); the M25 spec's S1 text is rewritten when M25 is
   re-elaborated.
   **Opening the official server is gated on its completion.**
4. **M-gamepad** (`M-gamepad.spec.md`, sketch) — controller support on the virtual-button
   layer, consuming the context-stack ownership design, plus the hold/long-press edges the
   tactical battle defers (Hold Y cancel-and-clear, Hold B skip playback). **Must land before launch** (operator,
   2026-10-01). Ordered after the tactical battle UI (M-battle-tactics, built) — operator-CONFIRMED
   (#583 D4, 2026-10-24).
5. **M19 Guilds/chat/social** (`M19-social.spec.md`, sketch) — its friend requests and
   chat show players through the tag helpers M-identity-handles built (`formatTag` and
   `taggedName` in the game's `client/src/ui/playerTag.ts`), and it owns the player's own tag on
   the Profile screen, which no surface shows yet; ordered AHEAD of M18 — operator-CONFIRMED
   (#588 D4, 2026-10-24). M23's social a11y retrofit scope un-defers with it.
6. **M18 Co-op raids** (`M18-coop-raids.spec.md`, sketch) — the playtest-3
   read did NOT confirm it as next content; its 1v1 "additive resolve_coop_turn" premise dies
   with the tactical overhaul. Re-sketch on the tactical engine (M-battle-tactics P2 is built; tactical sides natively support
   allies).
7. **M-battle-tactics depth** (unspecced) — `blocked:playtest-4-read`: the operator-deferred tactical
   features, specced after the Playtest-4 read. Obstacles/cover blocking movement and ranged/AoE
   (pt3-2026-10-138; the `blocks_los` tile column and LoS(blockers) signature are already in place),
   tile elevation with attack bonuses (-139; `elevation` column, default 0), line/cone AoE (-141;
   reserved `Line`/`Cone` shape variants), and the depth re-enable waves (D583.1, each re-running
   the Playtest-4 gates): D1 entry abilities on deploy + 4-AP Swap/reserve, D2 weather/field
   (upkeep slot 3), D3 signature wave + one 2×2-footprint line. Design SSOT:
   `M-battle-tactics-design.md`. Hold-to-act inputs (Hold Y cancel, Hold B skip) belong to M-gamepad.
8. **Residual fill-work** (`residuals.spec.md`): MED items first when a fan-out slot is idle. A
   row a pt3 milestone absorbs is marked in its spec.
9. **M21b-3 Steam login** — the Steam build's sign-in protocol, consumed by M-local-play;
   scoped when that milestone is elaborated. Steam Input maps onto the virtual buttons.
10. **Structural work** (`structure.spec.md`, standing): open `type: refactor` slices
   (`standards/spec-driven.md` §Refactor slices). The supervisor's structural share schedules it
   ahead of this position; when no earlier item has a launchable slice, its slices launch in
   file order. Its `type: design` slices decide internal-design questions; those are not operator
   decisions. An empty file is a finished item once no plan file under the game's
   `docs/refactors/` lists an extraction still to make. With no section open and a plan file
   listing extractions, the tick's action is to section the next three.
11. **M-modding** (`M-modding.spec.md`, sketch) — `blocked:early-access-release`: host-moddable
   private worlds, part of the official release. Until it opens, its standing constraint binds
   every slice: content is loaded data, one seam per kind of extension, no content id named in
   rules or views.

Milestone specs for the items through M-battle-tactics depth, and for M-modding, are sketches or
ceremony-pending where marked: elaborate via `milestone-loop-prompt.md` when reached, against the CURRENT game repo. ⛩ **Playtest-4 gate** is DECIDED (#583 D5, 2026-10-24 — strict §10, alternative A):
ONE gate after every coverage milestone closes. No interim playtest.

## Gates and constraints (live)

- **Release order** (operator, 2026-11-12; `game-design.md` §14): early access = the Steam build
  with single-player worlds and friends hosting → the official server opens → official release adds
  modding. **Early access** is gated on M-local-play and on M-gamepad (operator, 2026-10-01;
  "before early access" confirmed 2026-11-13).
  **Opening the official server** is gated on M25 completion (human sign-off checklist,
  operator-approved) and M-scale-readiness.
- **Three ways to play, one codebase** (`game-design.md` §14): every slice must work with one player
  and nobody else online, must not assume we operate the server (no fixed server address, no
  hand-run upgrade step, no telemetry leaving the machine without consent), and must hold at the
  official server's population. Client code is shared across shells, never forked. The
  `M-modding.spec.md` standing constraint binds now.
- **Playtest-4 includes a single-player pass:** one player, nobody else online, from a new world to
  the end of the available content, checked against the solo rule in `game-design.md` §14.
- **Playtest-3** completed (PASS WITH CHANGES, 2026-10). **Playtest-4** = strict §10: ONE gate
  after all coverage milestones close (operator ruling 2026-10-24, #583 D5 — no interim gate).
- **RLS remains unenforced at SpacetimeDB 2.11.0** — privacy is enforced by the private-table +
  owner-scoped-view pattern (DECISIONS.md "Table privacy"); the RLS re-open triggers recorded in
  `security-threat-model.md` and `validation-checklist.md` still do not fire.
- Frozen surfaces: `client/src/module_bindings/` is generated-only (game repo AGENTS.md) and
  schema changes are additive-only (DECISIONS.md "Schema changes are additive"); any schema
  change needs bindings regen + a publish-over-data proof (docs/debloat/REPORT.md §maintainer).
- Toolchain: SpacetimeDB 2.11.0 CLI/host + 2.11.0 module crate; 2.x syntax
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
  is §9's M21b-3) · **M22** privacy/deletion/export · **M23** accessibility · **M24** i18n
  (en/fr) · **M25 S0** threat-model consolidation.
- Client: **M-postgate-console-controls** (`ctl-*`; the virtual-button controls — one binding
  table, the context stack, D-pad screens, face-to-face interaction, remapping, the generated
  hint bar, pointer and touch; design SSOT `console-controls-design.md`) · **M-postgate-client-coverage** (`pgcc-*`) ·
  **M-pre-playtest-polish** · **M-ui-foundation** (`wf-1`, `uif-*`; the shared menu kit — tokens,
  one scale authority, TabBar/ContextSheet/EmptyState/RowCard, four feedback channels — and the
  flattened menu IA; design SSOT `M-ui-foundation-wireframes.md`) · **M-world-art-pass** (`wap-*`;
  the provenance art registry and style guide, the ten-class terrain kit and renderer, the hero
  atlas, data-drawn landmarks and warps, the two larger zones, and the `pixi-filters` world post
  stack — off in the live game; style SSOT the game's `docs/art/style-guide.md`).
- Combat: **M-battle-tactics** (`bt-*`; the tile-grid tactical battle engine, wild and PvP, and
  the big-bang cutover that removed the 1v1 system; design SSOT `M-battle-tactics-design.md`).
- Trading: **M-trade-sessions** (`ts-*`; trade sessions opened face to face — each side edits its
  own offer, confirms the revision it reviewed, locks its assets at confirm, and the last confirm
  executes — with auto-cancel, the propose path reduced to a fixed-error stub, and server range
  checks on trades, challenges, shops and heals; the `ts-6` sweep triaged every open residual and
  fixed the survivors).
- Local play: **M-local-play** groundwork (`lpg-0`, `lpg-1`, `lpg-10`; the feasibility record
  `docs/local-play.md` — licence state, the Electron shell and its preload hook, the sign-in
  answers, the measured footprint and the budgets set from it — the connection target as a
  run-time shell document, and the target-kind gate that keeps telemetry and the build's account
  sign-in to servers we operate). LP2–LP9 are §9's M-local-play item.
- Netcode: **M-netcode-presence** (`np-*`; one snapshot per position in the store and a
  bounded continued walk for remote players, slewed at walking speed; `MoveInput::Face`, so a
  press of a direction you do not face turns and a press you face steps; a battle start drops
  the battlers' queued moves; the reconnect backoff climbs one rung per failed attempt; and the
  send-depth study that keeps one step in flight, the game's `docs/send-pipeline-depth.md`).
- Economy: **M-econ-onboarding** (`eo-*`; a first join grants the starter kit, data in the game's
  `game-core/content/starter_kit.ron`, and the starter monster once per identity, behind the
  `sys:starter_claimed` marker in the owner's dialogue state, with a tombstone left to the retired
  guest of a claim; then one tuning pass: healing is free, quest_001 is the recruit loop's faucet,
  and the relations between the numbers are tests in the game's `game-core/tests/pt_d3_tuning.rs`,
  explained in its `docs/economy-tuning.md`).
- Identity: **M-identity-handles** (`ih-*`; a minted, never-reissued tag per identity, private
  at rest and mirrored onto the public `player` row while online, carried by the guest claim,
  erased at deletion and exported to its owner; the lead monster's level kept live on `player`;
  the Players tab, the request banners and the Trades-tab row show the tag, battles show the name
  alone and the world draws no player name; Sign In shows only where `connect` receives an issuer
  (a server we operate, on a build that has one), labelled with its provider; the game's `docs/DECISIONS.md` "A player's tag is a minted sequence value: private at
  rest, mirrored on the public player row while online" and "A target's kind gates telemetry and
  account sign-in: only servers we operate get either").
- Playtest-3 fixes: **M-pt3-quickfix** (`qf-*`; the playtest-3 bug-fix and
  low-hanging-fruit wave).
- Corrective: **M-test-truth** (`ttd-1`; one whole-tree i18n scan replaces the per-file
  scans) · **M-stack-ownership** (`so-*`; the context stack owns player-opened frames).
- Follow-up rounds: an `N.5` milestone, an "Nth review residuals" milestone and an `NNr-*`
  slice id each name a review follow-up to the numbered work; **M-playtest-a…d** prepared the
  2026-07 playtest and the other **M-postgate-\*** / **M-evolution-essence-\*** milestones
  acted on it.
- Test health: **M-test-health** (`th-*`; the CI `e2e` job lists each test that passed only on
  a rerun, as a job-summary table and one warning annotation per test, and passes or fails as
  before; the dev-only `dev_expire_tactical_window` reducer, callable by the module owner alone,
  so the PvP AFK e2e takes one strike in real time and three through it; the game's
  `docs/e2e-flakes.md` register of e2e flakes with no merged fix; the low-end frame-time record,
  `docs/art/style-guide.md` §Low-end frame times; the game's `docs/DECISIONS.md` "Dev-only
  reducers never ship" and "The world post stack is `pixi-filters`, on the world layer only,
  planned from injected time", which holds the software-rasteriser rule).
- Infra: **M-infra-a** CI caching · **M-stdb-2x** module SDK 2.8.1 · **M-loop-infrastructure**
  (the supervisor tooling, `memory/projects/mr-*`) · **M-test-pruning** (`tp-*`; the `mr-prune`
  test census: run at milestone close from `mr-record`'s MERGED-row hook and shown to the close
  tick by `mr-situation`'s `prune_close`, run at elaboration by the structure pass of
  `milestone-loop-prompt.md`; a row is a candidate, never a reason; harness `docs/DECISIONS.md`
  "The test census is a report: recorded at milestone close, acted on at elaboration").

## Risks (live)

- Free healing (the game's `docs/DECISIONS.md`) and the PvP side-B reward gap are OWNER
  decisions, not bugs — do not "fix" them without an operator directive.
- M18/M19 build cost is speculative until the playtest-3 read; treat their sketches as intent.
- Any schema change re-opens migration risk: publish-over-data proof required, always.
