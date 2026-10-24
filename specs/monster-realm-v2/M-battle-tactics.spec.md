# Spec: M-battle-tactics — tactical combat overhaul (SKETCH + ceremony plan)

**Status:** sketch, 2026-10-24 (Playtest-3 episode) · **Project:** monster-realm (game-core +
server-module + client + content) · **Priority:** the operator's top priority — "I would like to
overhaul this UI and the related battle system more than anything else" (feedback :423) —
scheduled immediately after the quickfix wave ("immediately after any bug fixes and low-hanging
fruit", :492). · **DECISIONS ANSWERED 2026-10-24** — both gating batches are answered (monster-realm
#583 `pt3-battle-scope`, #584 `pt3-battle-design`; verbatim answers at
`memory/projects/decisions/issue-583.answer.md` / `issue-584.answer.md`). The P0 ceremony is
UNBLOCKED; the rulings below are BINDING and the answer files are their SSOT.

**Feedback items:** pt3-2026-10-018, pt3-2026-10-121, pt3-2026-10-122, pt3-2026-10-126,
pt3-2026-10-127, pt3-2026-10-128, pt3-2026-10-129, pt3-2026-10-130, pt3-2026-10-131,
pt3-2026-10-132, pt3-2026-10-133, pt3-2026-10-134, pt3-2026-10-135, pt3-2026-10-136,
pt3-2026-10-137, pt3-2026-10-138, pt3-2026-10-139, pt3-2026-10-140, pt3-2026-10-141,
pt3-2026-10-142, pt3-2026-10-143, pt3-2026-10-144, pt3-2026-10-145, pt3-2026-10-146,
pt3-2026-10-147, pt3-2026-10-148, pt3-2026-10-149, pt3-2026-10-185. The battle-presentation
subset (-126…-131) is scoped INSIDE this milestone (see Backlog reconciliation for the -132
carve-out to the quickfix wave).

**Absorbed residuals:** rb-104 (R-rb-73-WILD-HOLD: no reaper bounds a stalled wild battle),
R-21r-a-FAINTPENALTY, R-21r-a-TERMINALSWEEP, R-21r-a-CONTENTLOAD — these stay valid as
*invariants*, but their fix sites move into the new resolve pipeline; schedule them inside this
milestone, not before it.

## Problem / intent

The operator ruled the 1v1 Pokemon-style core superseded: "Instead of Pokemon-style combat where
it's mostly 1v1 battles without any kind of positioning, I want to move toward a style of combat
closer to 'Sword of Convallaria' and 'Final Fantasy Tactics Advance'" (:404), with a tile
battlefield, 1–3 deployed monsters per side, attacks modeled as range/origin/target/AoE, and a
costed action economy (:404–419). "Start simple with the new battle system and gradually add new
features and mechanics" (:406). The quality bar is explicit: combat is a cornerstone — "It has to
be fun, interesting, novel, and rewarding" (:423) — and the tactical-RPG × monster-taming synergy
is the stated differentiator (:423). This supersedes game-design.md:107's "1v1-active readable
core first" (later beats earlier; the operator's own precedent, controls-feedback :21).

This sketch fixes the phase plan, the binding constraints, and the open decisions. Full EARS
criteria and slicing are drafted at elaboration, AFTER the P0 ceremony synthesizes the design.

## Research input — premise checks (read before ideating)

`docs/research/tactical-rpg-combat-design.md` (2026-10-24) is the design substrate. Its premise
checks matter and are reflected honestly rather than papered over:

- **None of the operator's three anchor games uses a per-turn AP pool.** FFTA, Triangle Strategy
  and Sword of Convallaria are all *move + one action* with a side resource (FFTA regenerating MP,
  TS TP, SoC NRG + cooldowns). True AP pools are the Dofus/Wakfu/Divinity/MENACE lineage. The
  operator's AP directive (:415–419) therefore specifies a deliberate *hybrid* — "FFTA/SoC feel +
  AP economy" — not a copy of either anchor. Honest framing goes to the operator in
  pt3-battle-design (feedback :6 invites exactly this push-back), with the cost-curve levers the
  research names if AP wins (fixed heavy tiers, per-turn/per-target caps, cooldowns).
- **FFTA monsters are not deployable units** (captured by a Hunter, raised in a Monster Bank).
  The real precedents for monsters-as-deployed-units are Pokemon Conquest, Devil Survivor,
  Brigandine, Disgaea and Mewgenics — ideation lenses should draw from those, not from a
  misremembered FFTA.
- **Mewgenics' range/area data model** is the cleanest public reference for the operator's
  attack model: range and area as independent fields, shaped areas, LoS blocking, per-effect
  ally/caster/others filters, Manhattan metric matched to 4-way movement. This matches the
  operator's own fireball worked example (:411–413).
- **A type chart on a grid is not enough** (Pokemon Conquest's shallow-tactics reception):
  positional levers must be designed in, and per-species *shape/reach/movement*, not just stats,
  is the identity lever.
- **Pacing:** small squads (1–3/side), Move 3–4, maps ~8×8 or smaller keep fights joinable in ~2
  turns; budget total match length explicitly (a 3v3 × 8 rounds ≈ 48 unit-turns). Tedium comes
  from length, enemy-phase waiting and UI friction, not from depth.
- **PvP clock models** (for P2): side-alternating + banked clock is the lowest-friction default;
  per-unit initiative queue with a per-turn cap (Wakfu's 30 s) and simultaneous
  plan-commit-resolve (Frozen Synapse) are the alternatives. Never allow recruiting in PvP.

## Operator rulings 2026-10-24 (#583 + #584 — BINDING; answer files are SSOT)

**Scope & sequencing (#583, pt3-battle-scope):**

- **D1 — M14 depth carry-over (recommendation accepted):** carry the DATA and rules forward but
  re-enable gradually — the tactical core ships with types/stats/status only; abilities and
  weather re-enable in later phases once the grid core is fun.
- **D2 — cutover is BIG-BANG (alternative A):** wild battles AND PvP/ranked convert to tactical
  in ONE cutover — there is no player-facing phase where tactical wild coexists with 1v1 PvP.
  P1/P2 below remain internal BUILD phases, but nothing ships to players until both are done.
  PLUS a new operator-designed mechanic — the **per-monster action queue + idle-only turn clock**
  (full text in D583.2 of the answer file; design section below). The ceremony must integrate it
  "so everything feels like one coherent battle system."
- **D3 — hard replacement (recommendation accepted):** at cutover the 1v1 system is GONE (no
  parallel modes, no toggle); the schema stays additive (new tables/columns, old ones retired
  from use, never reordered).
- **D4 — M-gamepad ordering (recommendation accepted):** M-gamepad runs AFTER the tactical battle
  UI stabilizes (battle is the biggest new input surface).
- **D5 — next playtest is STRICT §10 (alternative A):** ONE gate after every coverage milestone
  closes. No interim playtest. (PLAN §9 gate note updated accordingly.)

**Design parameters (#584, pt3-battle-design):**

- **Inspiration set (preamble):** ALL SIX games are valid sources — FFTA, Triangle Strategy,
  Sword of Convallaria AND Pokemon Conquest, Devil Survivor, Brigandine. A source "doesn't have
  to perfectly match up… to be a good source of inspiration." DIRECTED RESEARCH: find out what
  players liked and disliked about each of the six, take the best concepts from each, and use
  that to "plan, design, and build a new cohesive battle system that is both fun, rewarding, and
  unique." This research is a ceremony input (§7 persist-mode).
- **D1 — tuned AP accepted** (costs tuned so a typical turn resolves as move + one attack), PLUS
  directed research: what people like/dislike about AP battle systems vs simpler move+act systems
  like FFTA; design/implementation specifics are delegated to our best judgment informed by it.
- **D2 — round-based speed order accepted** (every unit acts once per round, ordered by speed —
  "very close to what I originally intended"). A visible turn-order bar follows.
- **D3 — recruit percentage SHOWN on the preview** (accepted; "transparency beats superstition"
  endorsed as a principle). Failure still consumes the turn.
- **D4 — forecast & undo accepted, but INTEGRATED with the action queue:** the forecast panel and
  free pre-commit move-undo must be designed together with queue submit/cancel semantics (an
  undo inside a queued-but-unsubmitted plan is cheap; a submitted queue is cancel-and-clear).
- **D5 — PvP clock = per-UNIT 30 s cap with AFK auto-pass, then forfeit** (hybrid of the
  recommendation and alternative A), replacing the 60 s secret-pick deadline — combined with the
  idle-only clock semantics of D583.2 (the cap counts only while the battle is idle waiting on
  that player; it resets on submit; animation/resolution time never counts against either player).

**Cross-batch ruling that lands here (#587 D1):** successful recruiting pays NOTHING (alternative
A) — no currency, no XP, no essence; the monster is the reward. This closes this spec's former
recruit-yield open question; the GDD §7 note records the faucet consequence (quest faucets
compensate, owned by M-econ-onboarding).

## Action queue + idle-only clock (operator design input, D583.2 — ceremony integrates)

The operator's own mechanic, quoted semantics (answer file is SSOT):

- A player may queue up each of their monsters' NEXT turn's worth of actions at any time —
  during the opponent's turn, while animations play, or during other events.
- Submitting a queue marks it **ready**. A queued plan begins executing, in order, as soon as
  BOTH hold: the queue is ready AND it is that monster's turn.
- The player can **cancel/clear** a monster's queue at any time before that monster's turn.
- Any INVALID actions still in a submitted queue when the monster's turn starts are **wasted**
  (the exact waste semantics — skip vs consume — are ceremony territory; "wasted" is the
  operator's word).
- The turn clock **counts only while the battle is idle on the player's turn** and **resets the
  moment they submit a monster's actions**; time spent on animations or other non-instantaneous
  resolution never counts against either player. With instant resolution this is nearly
  invisible; it exists so future animations don't eat clock.
- Intent: skilled players spend very little clock; monsters begin acting as soon as possible.
  The ceremony must fit this seamlessly with the other tactical mechanics (AP economy,
  round-based speed order, forecast/undo) so it reads as ONE coherent system.

Design implications the ceremony must resolve (not pre-decided): queue validation timing
(client preview vs server at execution), how a queue interacts with reaction/interrupt-free
round order (queue ≠ simultaneous resolution — execution still happens on the monster's turn),
secret-ness of a submitted queue in PvP (no client read path for the opponent, like
`battle_action` today), and the forecast's data source for actions queued against a future
board state (forecasts are necessarily provisional — surface that honestly in the UI).

## Binding constraints (prior rulings; these bind the ceremony and every phase)

Reproduced from the prior-ruling scan so no brainstormer re-litigates them:

1. **Turn-based, not real-time/action (ADR-0017).** "Knowledge & mastery, not twitch." The
   tactical proposal is still turn-based; this ruling stands and is reinforced.
2. **Rules once · determinism · integer · content-as-data.** Every game rule lives in `game-core`
   exactly once; wall-clock and unseeded RNG are clippy-banned workspace-wide; same inputs produce
   byte-identical output natively (server) and in wasm (client); damage is integer-only with
   seeded TurnVariance — float combat math is ruled out. AP costs, movement/terrain costs,
   range/AoE geometry and turn resolution are all game-core rules; attack data, battle maps and
   species battle identities are RON under `game-core/content/` with CONTENT_VERSION bumps.
3. **Privacy + server authority.** Battle tables are PRIVATE; the sole client read path is the
   participant-scoped `my_battle` view. A public battle table is a CRITICAL defect (standing
   harness finding). `battle_action` (secret picks) and `battle_wild` (the wild's seed) have no
   client read path. Reducers validate sender, call game-core, write tables. The operator
   restates the privacy doctrine approvingly (:237) — reinforced, not under challenge.
4. **0-HP rulings (r2).** Deployment limited to conscious monsters; fainted units cannot act or
   be deployed; mid-turn-KO and double-KO semantics defined. Must be re-proven in the tactical
   system, not assumed.
5. **Interlocks + disconnect GC.** One predicate, `guards::is_in_ongoing_battle`, blocks
   movement/trading/evolution/care everywhere; battle↔trade interlock (ADR-0112) and care/train
   guard (ADR-0136) keep wiring in; last-connection disconnect auto-resolves live battles and
   PERSISTS damaged HP (ADR-0138). Multi-unit battles raise new GC questions (partial deployment
   on disconnect) but the pattern — auto-resolve, persist damage, key on last session — stands.
6. **Recruit rulings.** Weakening is the lever, never pure luck; success rebuilds the exact wild
   from the private seed, at full HP, awards no XP; re-rolling at catch time and exposing wild
   genes to the client are ruled out; wild-only, never PvP. The operator's new rule — a full
   turn's action budget spent on an ADJACENT wild, bait raises odds without raising cost (:419) —
   slots onto this machinery; adjacency is the new spatial gate.
7. **Essence-from-defeat pathway (r2 ruling).** Monsters acquire essence from defeating others in
   battle; the resolve-pipeline replacement must preserve this acquisition hook (fusion stays
   dead).
8. **No gacha / P2W / microtransactions** — the operator's own carve-out on Sword of Convallaria
   (:14). SoC's energy system that gates grinding is a named anti-pattern, not a model.
9. **Controls/UI doctrine.** The battle screen is a base under the ONE context stack; upper
   frames ride SCREEN_POLICY and the B17 battle-never-hidden rule; every element is
   D-pad-reachable (mouse is never the only path); all strings come from the typed i18n catalog
   (en+fr); schema changes are ADDITIVE-ONLY; client bindings are generated-only.

**Keep-signals (operator praise to carry forward):** "I like the red and green info boxes that
show information (Name, Level, Health, Type)" (pt3-2026-10-121) and "The health bar is good"
(pt3-2026-10-122) — the tactical HUD keeps per-unit info boxes and health bars, re-laid-out for
multiple units.

## Scope (sketch) — phases

### P0 — design ceremony: **DONE 2026-10-24** (doctrine §6)

The full ceremony ran 2026-10-24: reception-research pre-step persisted as
`docs/research/tactical-combat-player-reception.md` (operator-directed, #584); 6 lensed
brainstormers (unbiased / investigation / monsters-as-units / pacing / design-research /
reception-research), each refined against its own adversarial critic; `judge` synthesis with
the required attribution table; independent adversarial review (2 BLOCKER + 5 MAJOR findings,
all dispositioned); judge-final revision.

**Output (BINDS elaboration): [`M-battle-tactics-design.md`](M-battle-tactics-design.md)** —
core rules with integer numbers (6-pip AP, strides, Light 2/Heavy 4/item 3/recruit 6, Exert),
queue + idle-clock state machine (literal reset-on-submit per D583.2; halt-don't-waste pop
validation), round flow, grid/terrain/deployment, species identity levers, wild AI, tactical
recruit, PvP clock/secrecy/forfeit, rewards, data model, battle UI, match-length arithmetic,
build-phase plan, risks, attribution table (§13), pre-committed criteria (§14). Its §12 lists
the operator options where the LITERAL ruling was adopted as default — surfaced on the closed
decision issues; elaboration proceeds on the defaults.

Line-level slicing, `touches:` and full EARS are still drafted at ELABORATION against the
then-current game repo (the quickfix wave and so-2 move battle/UI files before this milestone
builds; slicing against today's tree would rot).

### P1 — tactical core for WILD battles (BUILD phase — does not ship alone; see D583.2)

The minimal fun core, per the operator's "start simple" (:406). Everything below is sketch-level;
the ceremony owns the final shape. **Cutover note (D583.2/D583.3):** P1 is an internal build
phase — the player-facing cutover is ONE big-bang release after P2, at which point the 1v1
system (wild AND PvP) is hard-replaced. "Start simple, add gradually" now governs the DEPTH
re-enable sequence (D583.1: types/stats/status first; abilities/weather in later phases) and the
build order, not a staged player rollout.

- **Battle maps as content:** tile battlefields are RON files under `game-core/content/`
  (CONTENT_VERSION-pinned, validated like zone maps), with terrain types on tiles (the move-cost
  input of :416). Sized so 1–3 units per side can "position and maneuver" (:407) — research
  guidance: ≤~8×8, Move 3–4.
- **Deployment:** 1–3 conscious party monsters per side (0-HP ruling re-proven; PARTY_SIZE=6 in
  game-core is consistent with a 1–3 pick and does not change here).
- **Action economy:** per-unit move+act or AP, per pt3-battle-design. Whatever wins: move cost =
  f(distance, terrain, monster type, speed) (:416); attack cost scales with power, one strong
  attack more cost-efficient than several weak (:417); flat item-use cost between weak and strong
  attack, items also usable out of combat without cost (:418) — all integer game-core rules +
  content data.
- **Attack data model (Mewgenics-style):** range, origin, target mode, AoE shape and
  friendly-fire filter as SEPARATE content fields on skills; range 0 = self, 1 = melee, >1 =
  ranged; radius 0 = target tile only (:410–413). ONE shared geometry function serves the
  authoritative server validator and the client highlighter; the server recomputes target sets
  and never trusts client-sent ones. The shape enum and map schema are designed extensible so P3
  (line/cone, obstacles, elevation) is additive content, not a schema rework.
- **Resolution:** integer, seeded, deterministic, in game-core exactly once; client predicts and
  previews via the wasm build (byte-identical rule).
- **Wild-side AI:** a minimal deterministic stance set (charge / attack-in-range) in game-core —
  NEW surface the 1v1 system never needed; telegraph threat ranges rather than be clever.
- **Recruit:** adjacent wild target, full turn's action budget, bait raises displayed odds
  without raising cost (:419); seed-rebuild / full-HP / no-XP / seed-privacy rulings stand.
  The H1/H2 playtest proxies (`scripts/playtest-report.mjs` weaken-first/recatch/success rates)
  must keep reporting across the mechanic change (item -146 note). Re-prove the absorbed
  R-21r-a invariants here: faint trust penalty on recruit success, terminal-row sweep,
  content-load-before-bait-spend ordering; and give wild battles a reaper (rb-104).
- **Battle UI on the existing stack machinery:** tile cursor with memory; move/attack/danger
  overlays; a forecast panel (damage, odds, lethal marker) computed from the same wasm rule;
  move-undo before the action commits (PvE only); a hierarchical command menu (general options →
  contextual sub-lists) — which natively delivers item -133's floating-menu intent. All of it as
  frames over the battle base (SCREEN_POLICY, B17), D-pad-first, i18n-cataloged (en+fr).
- **Presentation floor (items -126…-131):** a shared placeholder monster sprite (species sprite
  assets already exist under `client/public/assets` — reuse before authoring new ones) and ONE
  shared battlefield background, positioned units instead of stacked text boxes, visual
  separation of field vs command areas, basic action feedback that respects the shipped
  reduced-motion wiring. Info boxes + health bar carried forward (keep-signals). Resolution
  scaling (-131) follows whatever the separate UI-chrome/scaling decision picks — no
  battle-only scaling fork.
- **Schema:** new PRIVATE tables (battle map instance, per-unit position/budget state) behind
  participant-scoped views, additive-only; regenerate bindings; the typed client unions keep
  their satisfies-never exhaustiveness pattern.

### P2 — PvP tactical (BUILD phase — ships together with P1 at the big-bang cutover)

- Clock model DECIDED (D584.5 + D583.2): per-UNIT 30 s cap, counting only while the battle is
  idle waiting on that player (reset on submit; animation/resolution time never counts), AFK
  auto-pass, then forfeit — replaces the 60 s secret-pick deadline reaper. Submitted action
  queues stay secret rows with no client read path; explicit forfeit semantics and disconnect
  auto-resolve carry over.
- Ranked mapping: how a tactical win/loss feeds the M17 ladder (expected: unchanged rating
  machinery, new outcome source).
- No recruiting in PvP (standing ruling + research consensus).
- Budget match length explicitly (per-turn cap × unit count); animation skip from day one.
- **M18 re-sketch hook:** a multi-unit battlefield natively supports allies — after P2, M18
  co-op raids re-sketches against this substrate (its 2026-08-23 recency note about `my_battle`'s
  two-identity limit still applies and transfers to any 2-ally view design).

### P3 — DEFER-authorized future features

The operator's own "(a future feature)" text authorizes DEFER (doctrine §10) for:

- obstacles/cover that impair movement and block ranged/AoE (pt3-2026-10-138);
- tile elevation with attack bonuses (pt3-2026-10-139);
- line/cone AoE with propagation direction (pt3-2026-10-141).

P1's data model must leave these additive (shape enum extensible, defaultable height/blocker
columns on map tiles) — deferred features, not foreclosed ones.

## Non-goals

- Real-time/action combat (ADR-0017 stands).
- Gacha / P2W / microtransactions / energy-gated grinding (operator carve-out, :14).
- The legacy 1v1 battle-button defect (duplicated Run/Flee/Swap, always-visible lists,
  pt3-2026-10-132): that is a quickfix-wave defect slice against shipped CTL8I.1/8J.1 — fixed on
  the current layout BEFORE this overhaul deletes it; not duplicated here.
- Economy design (starter grants, faucets, item prices): a sibling milestone. Interaction: the
  flat item AP cost (:418) makes item PRICES a combat-balance lever — name the dependency, don't
  own it.
- An animation framework (Spine carries a license flag, item -184 note): P1 ships basic action
  feedback only; framework adoption is its own decision.
- Final art: shared placeholders explicitly suffice "until a professional artist can be hired"
  (:391–392).
- M18 raid content (re-sketch hook only) and M19 social surfaces.

## Backlog reconciliation

- **Absorbs:** rb-104 (wild-battle reaper), R-21r-a-FAINTPENALTY, R-21r-a-TERMINALSWEEP,
  R-21r-a-CONTENTLOAD — invariants re-proven inside the new pipeline (fix sites move).
- **Lifts a fence:** M-postgate-console-controls' "no visual redesign" non-goal is lifted by the
  operator for battle presentation; that work lands HERE, not as a second pass on the 1v1 layout
  the overhaul deletes. Only placeholder-asset production is safely parallel.
- **Does not duplicate:** the -132 legacy-button defect slice (quickfix wave); the UI-chrome/tab
  milestone (frame visuals); the scaling-methodology decision (R-ctl-SETRATIO conflict batch).
- **Reshapes:** M18 (re-sketch after P2; PLAN §9 items 9–10 need the operator's re-sequencing
  answer in pt3-battle-scope) and the M14 depth systems (port/defer/retire per pt3-battle-scope).

## Acceptance sketch (P1 only; full EARS drafted at elaboration, post-ceremony)

- **BT1:** WHEN a wild battle starts, THE SYSTEM SHALL build the battlefield from a content RON
  battle map and deploy 1–3 conscious party monsters per side; a 0-HP monster SHALL NOT be
  deployable or act (r2 rulings re-proven on the new substrate).
- **BT2:** WHEN any unit acts, THE SYSTEM SHALL resolve movement, targeting geometry
  (range/origin/target/AoE + LoS + friendly-fire filter) and damage as integer, seeded,
  deterministic game-core rules — byte-identical natively and in wasm — and the server SHALL
  recompute legality and target sets, never trusting client-sent tiles.
- **BT3:** WHEN the player aims a move or attack, THE CLIENT SHALL show range/AoE overlays and a
  forecast computed from the same wasm rule the server runs, and SHALL allow move-undo before the
  action commits.
- **BT4:** WHEN a recruit attempt is made, THE SYSTEM SHALL require an adjacent wild target and a
  full turn's action budget, apply the bait bonus to displayed odds, and on success rebuild the
  exact wild from the private seed at full HP with no XP — with the faint-penalty, terminal-sweep
  and load-before-spend invariants (R-21r-a-*) proven, and H1/H2 telemetry still reporting.
- **BT5:** WHILE a tactical battle is live, ITS state SHALL live in private tables readable only
  through participant-scoped views, every `is_in_ongoing_battle` interlock SHALL hold, disconnect
  GC SHALL auto-resolve and persist damaged HP, and a reaper SHALL bound a stalled wild battle
  (rb-104).
- **BT6:** THE tactical HUD SHALL carry forward per-unit info boxes (name/level/HP/type) and
  health bars, with every string from the typed i18n catalog (en+fr) and every element
  D-pad-reachable.
- **BT7:** WHEN a player submits a monster's action queue, THE SYSTEM SHALL execute it in order
  at that monster's turn, SHALL allow cancel/clear at any time before that turn, SHALL treat
  invalid remaining actions per the ceremony's waste rule, and SHALL count clock time only while
  the battle is idle on that player's turn (reset on submit; resolution/animation time never
  counts against either player) — D583.2 semantics, proven in both PvE and PvP.

## Open questions (ceremony territory — the former decision blockers are ANSWERED above)

- ~~Recruit yield~~ — ANSWERED (#587 D1): recruit stays yield-free; the monster is the reward.
- Action-queue semantics the ceremony must settle: waste rule for invalid queued actions,
  PvP queue secrecy mechanics, provisional-forecast presentation, queue-vs-undo interaction
  (see the Action queue section's "Design implications").
- Deployment UX: pre-battle placement phase (Wakfu-style) vs fixed spawn tiles per map.
- Which per-species identity levers ship in P1 content (shape/reach/movement type per species vs
  stats-only start) — the research warns stats-only + type chart plays shallow.
- Multi-unit wild encounter generation: how many wilds spawn per encounter, and does the
  `battle_wild` seed pattern extend per-unit?
- Match-length target for the online queue (research hypothesis: a few minutes; unmeasured).

## Fan-out & integration note (for the slicing agent, at elaboration)

M18-coop-raids.spec.md's fan-out note applies verbatim: slice along game-core rule modules /
server-module domain modules / client / content / evals with disjoint `touches:`; expect a serial
rule→reducer spine with a parallel client ‖ evals tail; this milestone is large enough that it
MUST extend the M8.9 domain-module vocabulary (a new `tactics` or `battle_map` domain module)
rather than grow `battle.rs`; keep tables additive and bindings regenerated per slice; and the
definition-of-done includes integrated-whole verification (full `just ci`, bindings-drift = 0,
schema snapshot intact, e2e green, combined EARS proven end-to-end), not just per-slice green.
