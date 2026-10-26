# Spec: M-pt3-quickfix — Playtest-3 bug-fix + low-hanging-fruit wave

**Status:** specced 2026-10-24 · build-ready · **Project:** monster-realm · **Episode:**
pt3-2026-10 (`playtest-feedback-2026-10.md` + `.covermap`) · **Depends on:** the queued
corrective slices **ttd-1 → so-1 → so-2** (M-test-truth, M-stack-ownership) all merged — several
slices here touch `client/src/main.ts`, and so-2 rewrites the roster pins exactly once; this
milestone must not force a second rewrite · **Doctrine:** `standards/testing-tdd.md`. Evidence
anchors cite file + symbol with line numbers as of 2026-10-24 (fact-check pass) — **anchors are
symbols, not lines**.

**Feedback items:** pt3-2026-10-028, -036, -037, -041, -042, -043, -044, -048, -050, -051, -052,
-054, -059, -060, -061, -062, -063, -065, -066, -068, -069, -070, -071, -072, -073, -074, -078,
-090, -091, -093, -096, -098, -100, -101, -102, -103, -104, -108, -112, -115, -116, -117, -119,
-132, -133, -156, -163; **partial:** -126 (only the contextual-submenu half that ctl-8i/8j
already built — the sprites/background half belongs to the battle overhaul), -157 (visibility of
the existing faucet only — faucet/starter-kit redesign is the economy milestone).

**Absorbs residuals:** `R-ci-fix-20261002T0501Z-WALKEDAWAYROLLBACK` (promoted by qf-6),
`R-ctl-11b-RAISINGCARDS` (absorbed by qf-9).

## Problem / intent

The 2026-10 playtest returned PASS WITH CHANGES and ordered "bug fixes and low-hanging fruit"
first, before the battle overhaul (feedback Verdict). This milestone is that wave: seventeen
FEATHER/LIGHT slices, each a confirmed defect against an already-shipped ruling or a cheap polish
item whose root cause the fact-check pass pinned to a file and symbol. Nothing here is a
redesign; every structural ask from the feedback (tab-component rework, menu IA, scaling policy,
trade/battle/netcode redesigns, economy faucets, name discriminator) is deliberately OUT and
owned by its own milestone or decision batch.

Representative root causes (fact-check evidence):

- The "rectangular box" on five menus is the unstyled UA focus ring on the M23 initial-focus
  anchors — `styles.css` has ZERO `:focus`/`:focus-visible` rules (overlayRegistry.ts
  `initialFocusSelector` anchors; overlayA11y.ts focuses one macrotask after open).
- Care from the Monsters sheet is silently swallowed: `main.ts` hard-wires
  `showFeedback: (message) => raisingView?.showFeedback(message)` (≈1510–1518) and
  `RaisingView.showFeedback` no-ops while hidden (raisingView.ts ≈385–388). The 6 h per-monster
  cooldown (game-core `CARE_COOLDOWN_MS`) is invisible because `monster_pub` carries no care
  field (schema.rs ≈244 "Stays OFF monster_pub (YAGNI)" — the operator need has now arrived).
- `advance_dialogue` deletes `player_conversation` then returns `Err`, so the delete rolls back
  (npc.rs ≈402–410) — the known residual WALKEDAWAYROLLBACK; the NPC wander block never reads
  `player_conversation` (movement.rs ≈503–545) and decides up to 5×/s, which is why "walked too
  far away" fires at all.
- The ctl-8i battle command list shipped ON TOP of the legacy always-visible controls instead of
  replacing them (battleView.ts: legacy Flee ≈793–805, per-member swap ≈806–808, skills grid
  ungated ≈735–739, bait rows ≈813–818) — a strangler-rule violation, not a design gap.
- Seven mouse-only native buttons are each a legacy duplicate of an action that later gained a
  nav-kit path (agent findings, enumerated in qf-8) — defects against the standing "no UI element
  reachable only by the mouse" ruling (DECISIONS.md, controls doctrine).

## Scope

IN: the seventeen slices below — focus-ring styling, care feedback routing + cooldown surfacing,
journal chrome, NPC conversation pinning + wander cadence, the advance_dialogue wedge + quest
visibility, battle legacy-control retirement, mouse-only duplicate removal, raising→inventory
with stats preserved, terminology renames, tab-strip CSS, footer chrome, profile polish, a
Controls accelerator, a zone-transition cue, rankings presentation, and reward visibility.

### Non-goals (each is its own milestone or decision batch — do not scope-creep into them)

- Tab/frame **component redesign** and the shared UI-chrome system (visual distinctness,
  spacing tokens, fake-modal feedback presentation, mini-menu border/placement, outside-click
  close-then-process — the last conflicts with shipped CTL15.2 and is a decision, not a fix).
- **Menu IA** changes (Social/Profile/Options flatten, combined Profile screen, Help tab roster
  rework) — folded into the so-2 `mr-ask-drew` gate and the menu-IA decision batch.
- **Scaling policy** (integer world scale vs smooth DOM scale; text-size setting) — conflict
  with the standing integer-scaling decision; operator decision pending.
- **Trade, battle (tactical overhaul), netcode (remote extrapolation), economy
  (faucets/starter kit), discriminator, auth register, heal-landmark art, placeholder-art and
  map-content** work — sibling pt3 milestones.
- PARTY_SIZE and anything in `game-core` combat rules.
- No new frames, no context-stack ownership changes (so-2 owns that), no `PLAN.md` edits.

### Milestone-wide rules

- House rules bind every slice: game rules live once in game-core (deterministic, integer,
  seeded); content is RON under `game-core/content/` with a CONTENT_VERSION bump; SpacetimeDB
  schema changes are ADDITIVE-ONLY (appended `#[default]` columns, appended enum variants);
  tables stay private behind owner-scoped views; client bindings are generated-only; every UI
  string goes through the typed i18n catalog (en+fr, total); the virtual-button/context-stack
  controls doctrine stands; `Tab` stays the browser focus key — never bound.
- If a fix needs a file outside its `touches:`, that is a hidden-dependency STOP — do not widen
  silently.
- Byte-pinned test updates are values-only: key ids (`box.*`, `raising.*`) keep their legacy
  names; renames change catalog VALUES, never ids, unless a slice says otherwise.

## Open decisions — RESOLVED 2026-10-24

- The battle **"Bag" command label** rename is DECIDED (#586 `pt3-ui-policy` D4,
  `memory/projects/decisions/issue-586.answer.md`): the battle command renders **"Items"**
  (value-only change on `battle.command.bag`, en+fr; the key id keeps its legacy name per
  this spec's rename rule). qf-10 now ships it with the other renames (QF10.5).

## Sequencing & fan-out

The i18n catalogs, `styles.css`, `boxView.ts` and `main.ts` are shared across most client
slices, so this milestone is **mostly serial by design** — the slices are FEATHER/LIGHT, so
serialization is cheap and safe. Sanctioned parallelism (bounded N≤2, `docs/routing.md`):
qf-5 (server/game-core only) and qf-7 (battleView only) may run beside the main client chain;
qf-1 ‖ qf-2 are file-disjoint. Everything else follows its `after:` list. The whole milestone
starts only once so-2 has merged (header dependency).

Chain summary: (qf-1 ‖ qf-2) → qf-3 → qf-4 → qf-6 → qf-9 → qf-8 (also needs qf-7) → qf-10 →
qf-11 → qf-12 → qf-16 → qf-13 → qf-14 → qf-15 → qf-17, with qf-5 feeding qf-6.

---

### qf-1 — focus-ring policy: design the ring, keep the anchors
category: ux-a11y (presentation of the M23 focus feature) · severity: LOW · size: FEATHER
touches: client/src/styles.css, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/ui/overlayA11yWiring.test.ts
after: [so-2]
Feedback items: pt3-2026-10-036, -059, -078, -096, -108

- Evidence: the box is the browser's default UA focus ring on the dialog initial-focus anchors —
  headings with `tabindex="-1"` (boxView.ts ≈209–215, raisingView.ts ≈180–186) and the
  `#menu-rows` listbox (`tabindex="0"`, index.html ≈122; re-focused on open/uncover,
  menuView.ts ≈108–114). `styles.css` contains no `:focus`/`:focus-visible` rule at all. It is a
  feature AND a presentation bug: the trap, screen-reader announcement and D-pad-free keyboard
  support depend on the anchors (overlayA11y.ts module header) — do NOT remove them.

- **QF1.1:** WHEN programmatic initial focus lands on a NON-INTERACTIVE heading anchor
  (`tabindex="-1"`), THE CLIENT SHALL NOT paint the browser default focus ring on it — either a
  designed `:focus-visible` treatment or explicit outline suppression on those anchors, styled
  in `styles.css`.
- **QF1.2:** WHEN the interactive nav container (`#menu-rows` and sibling listbox anchors)
  receives focus, THE CLIENT SHALL paint a DESIGNED focus indicator that is visually distinct
  from the `.mr-nav-item.is-active` selected-row highlight.
- **QF1.3:** WHEN qf-1 lands, THE a11y machinery SHALL be unchanged: every
  `initialFocusSelector` anchor still exists and still receives focus on open, the focus trap
  and live-region announcements stay, and `overlayA11yWiring.test.ts` stays green (updated only
  where it pins the unstyled state).

### qf-2 — care feedback routes to the invoking surface
category: gameplay defect (silent swallow; vs CTL8C.1/CTL4.3/pgcc-a A1) · severity: MED · size: LIGHT
touches: client/src/main.ts, client/src/main.controls.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts
after: [so-2]
Feedback items: pt3-2026-10-048

- Evidence: both care surfaces dispatch one handler (monstersScreen.ts ≈514–515 → main.ts
  ≈1510–1518) whose feedback sink is hard-wired to `raisingView?.showFeedback(message)`; that
  method no-ops while the view is hidden (raisingView.ts ≈385–388) — correct as a stale-message
  guard, wrong as the only sink. boxView's feedback line today renders only
  movedToParty/movedToBox/fed kinds (boxView.ts ≈124–133).

- **QF2.1:** WHEN a care (or train/feed) action is invoked from the Monsters sheet, THE CLIENT
  SHALL render the action's success or rejection feedback on boxView's own feedback line — the
  INVOKING surface — never on the hidden raisingView sink.
- **QF2.2:** WHEN the care cooldown rejection arrives for a Monsters-sheet care, THE CLIENT
  SHALL show the catalogued cooldown message (en+fr, existing keys) on that line — no silent
  swallow of either success or rejection.
- **QF2.3:** WHILE the Raising/Inventory screen still invokes care (until qf-9), ITS feedback
  SHALL keep painting on its own line — the hidden-view no-op guard stays; only the sink
  SELECTION becomes invoking-surface-aware.
- Build note (qf-2, 2026-10-25): no catalog key for the care cooldown exists, so QF2.2's
  "catalogued … existing keys" is met by performCare's existing rejection line
  (`reduceErrorMessage(err, 'care')` = `care: care cooldown not yet elapsed`, the server reason
  passed through, untranslated under fr) — the same line the Raising screen shows. The catalogued
  en+fr cooldown hint is qf-3's (QF3.3). The sink is chosen at the SEND (the router's screen
  command with the Monsters frame on top) and bound to that open; the next routed button ends the
  line, a store batch does not. A Monsters-sheet train REJECTION paints on the sheet line too (its
  success stays the screen's "Fed" line); one that settles after the frame was left falls back to
  the status line.

### qf-3 — care cooldown surfaced to the owner
category: ux + server (owner-scoped data) · severity: MED · size: LIGHT
touches: server-module/src/schema.rs, server-module/src/marshal.rs, server-module/src/raising.rs, server-module/src/raising_tests.rs, server-module/src/privacy_tests.rs, client/src/net/store.ts, client/src/net/store.test.ts, client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/screens/monstersScreen.ts, client/src/ui/screens/monstersScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, server-module/src/privacy.rs, server-module/src/marshal_tests.rs, client-wasm/src/lib.rs, client/src/net/rowConvert.ts, client/src/net/rowConvert.test.ts, client/src/ui/monstersModel.ts, client/src/ui/monstersModel.test.ts, evals/baselines/table-schemas.json, client/src/main.accel.test.ts, client/src/main.controls.test.ts, client/src/main.dispatch.test.ts, client/src/main.feedbackCore.test.ts, client/src/main.input.test.ts, client/src/main.partyFull.test.ts, client/src/ui/bagModel.test.ts, client/src/ui/evolutionModel.test.ts, client/src/ui/evolutionModel.parity.test.ts, client/src/ui/raisingModel.test.ts, client/src/ui/tradeProposeModel.test.ts, client/src/ui/screens/bagScreen.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/src/ui/screens/tradeProposeScreen.boot.test.ts, client/src/ui/screens/types.ts, client/src/main.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/screens/index.test.ts, client/test-util/mainBootHarness.ts, server-module/src/content_tests.rs
after: [qf-2]
Feedback items: pt3-2026-10-065, -066
- Touches widened again (supervisor, 2026-10-26, from the qf-3 resume-1 MEASURED park): `ScreenContext.now` is
  `performance.now()` (main.ts:1531), not an epoch clock, so the remaining-cooldown hint needs a new injected
  `wallNowMs: () => number` on `ScreenContext` (`ui/screens/types.ts`, wired `() => Date.now()` in `main.ts`; the 16
  ScreenContext test fixtures are casts — zero blast radius). `ui/i18n/catalog.test.ts` pins the exact key roster
  + SAMPLE_PARAMS bijection and is edited by every key-adding commit. Retracts the earlier "`ScreenContext.now()` is
  the clock seam" line (unverified, wrong).
- Touches widened (supervisor, 2026-10-26, from the qf-3 park memo's MEASURED hidden-dependency STOP): the new
  column must cross `privacy.rs` (DECISIONS "Schema changes are additive" — export-or-omit in the serializer),
  `rowConvert.ts` (the only my_monster_pub→StoreMonsterPub path), `monstersModel.ts` (`sheetLayout` hardcodes
  Care enabled) and the 14 `StoreMonsterPub` fixture files (field-add, no assertion change — qf-2
  dispatch.test.ts precedent); `table-schemas.json` rides the schema-snapshot `--write` regen.
  decision-defaulted:qf3-fork=B — mirror `last_care_at_ms` verbatim on `monster_pub` and export the cooldown
  from `client-wasm/src/lib.rs` over `game_core::is_cooldown_ready` (AGENTS.md invariant 5, SSOT); no stored
  derived `care_ready_at_ms`. Reversible.

- Evidence: `CARE_COOLDOWN_MS` = 6 h (game-core raising/rules.rs:79); `last_care_at_ms` lives
  only in the private `monster` table; `monster_pub` has no care field, so the client cannot
  compute readiness. The schema comment "Stays OFF monster_pub (YAGNI)" (schema.rs ≈244) is
  superseded by this operator report — update it. Rejection never burns the cooldown
  (raising.rs ≈91–93) — pin that stays.
- Mechanism: an APPENDED `#[default]` column on `monster_pub` (e.g. `last_care_at_ms` or a
  derived `care_ready_at_ms`) read through the existing owner-scoped `my_monster_pub` view —
  additive-only; regenerate client bindings (generated-only).

- **QF3.1:** THE server SHALL expose per-monster care readiness to the OWNER only, as an
  appended `#[default]` column on `monster_pub` flowing through `my_monster_pub` — no other
  player can read it (privacy test extends the existing owner-scoping pins).
- **QF3.2:** WHEN any reducer path writes or mirrors `monster_pub` (care in raising.rs, spawn,
  trade swap, evolution, content resync), THE new column SHALL be kept correct — care updates
  it; the other mirror sites preserve it.
- **QF3.3:** WHILE a monster's care cooldown has not elapsed, THE Monsters sheet SHALL render
  Care disabled-with-reason (the Feed pattern; CTL4.3 — A on a disabled item speaks its reason)
  including a remaining-cooldown hint (catalogued en+fr).
- **QF3.4:** WHEN the cooldown has elapsed, THE sheet SHALL render Care enabled, and a failed
  attempt SHALL NOT reset the cooldown (server pin: reject-never-burns stays green).
- Build note (qf-3, 2026-10-26, increment #1 of 2): the server column, its verbatim copy in
  `pub_from_monster`, the GDPR export row, the `care_remaining_ms` client-wasm export (0 ⟺
  `game_core::is_cooldown_ready`; else the remaining ms clamped to `1..=CARE_COOLDOWN_MS`, so a
  skewed client clock reads one full cooldown, never more) and `StoreMonsterPub.lastCareAtMs`
  landed first; the sheet half (QF3.3 + QF3.4's client leg) follows once `touches:` includes
  `client/src/ui/screens/index.test.ts` (its untyped Monsters fixture drives the real screen and
  needs `lastCareAtMs: 0n` + a `wallNowMs`; measured 2026-10-25). Known, accepted: live
  `monster_pub` rows written BEFORE this column read anchor 0 until their next rewrite (care, train,
  evolve, a tier crossing, or the next `CONTENT_VERSION` resync — qf-15's bump backfills them all); a
  monster cared shortly before the deploy shows Care READY until then and the press is rejected by
  the server's own check on the private row (fail-open, at most one cooldown). Readiness on the
  client is the wall clock vs the server anchor: a clock AHEAD enables Care early (the server's
  rejection line speaks); a clock BEHIND keeps it disabled for the skew (bounded, self-clearing). A
  traded monster carries the previous owner's anchor (the cooldown survives the trade, as before;
  the instant is now owner-visible — LOW).
- Build note (qf-3, 2026-10-26, increment #2 of 2 — the sheet half): `ScreenContext.wallNowMs`
  (`Date.now()` in main.ts) is the client's wall clock; the Monsters screen maps every own monster to
  `care_remaining_ms(lastCareAtMs, wallNow)` on each view-model build and hands the map to the model
  (`MonstersVm.careRemainingMs`, 0n = ready; a monster with no entry reads READY). A cooling Care is
  the Feed pattern exactly: `sheetLayout(canFeed, canEvolve, canCare)` disables the row, the view
  appends the catalogued hint `box.sheet.careCooldown` (en `Ready in {hours}h {minutes}m`, fr
  `Prêt dans {hours} h {minutes} min`, rounded UP to the minute so a disabled row never reads 0h 0m)
  and A is consumed with nothing sent. Because no batch or button moves the wall clock, main.ts
  re-observes the open Monsters frame once a second (the host's same-object contract keeps a still
  readiness paint-free), so a cooldown that elapses while the player idles flips the row enabled
  within a second. CTL4.3's "speaks its reason" is met the way Feed meets it — the reason is the row's
  trailing text, read with the row by AT; there is no live-region announcement on A (residual
  `R-qf-3-QF3.3-announce`, ux-a11y/LOW, sibling of `R-qf-2-SHEETLINEPARITY`). The content-resync leg
  of QF3.2 is now pinned by a native-host test that seeds pre-column pubs (anchor 0) and proves the
  re-derive pass backfills the anchor from the monster row (residual `R-qf-3-QF3.2-resync` closed).

### qf-4 — journal chrome + list-style sweep
category: ux polish (empty-state + UA list markers) · severity: LOW · size: FEATHER
touches: client/index.html, client/src/ui/questLogView.ts, client/src/ui/questLogView.test.ts, client/src/ui/questLogView.i18n.test.ts, client/src/styles.css, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [qf-1, qf-3]
Feedback items: pt3-2026-10-068, -090

- Evidence: `#quest-log-overlay` ships a bare `<ul>` with no heading (index.html ≈28–30) and
  questLogView renders no empty-state row (contrast `leaderboard.empty`). `styles.css` clears
  `list-style` only on `.mr-frame-breadcrumb`, so every nav-ified `<ul>` paints UA disc markers;
  the selected row's marker inherits the inverted color and vanishes — the Rankings
  "bullets on all non-selected rows" artifact (leaderboardView.ts ≈138–151).

- **QF4.1:** THE Journal overlay SHALL render a visible title (frame-chrome heading, catalogued
  en+fr), matching the shells that already have one (leaderboard/shop/help).
- **QF4.2:** WHEN the player has no active quests, THE Journal SHALL render an empty state
  giving the reason, a cue, and the next step (catalogued en+fr) — never a blank dialog.
- **QF4.3:** THE nav-ified list containers (`#quest-log-list`, `#leaderboard-list`,
  `#help-controls`/`#help-goals`, `#heal-list`) SHALL NOT paint UA list markers
  (`list-style: none` sweep), with a boot-level test or snapshot pinning the class/rule.

- Build note (qf-4, 2026-10-26): `client/src/ui/i18n/catalog.test.ts` (exact en key roster) is
  edited as the sibling test of the catalogs (touches-delta). The title key is `journal.title`,
  not `chrome.journal.title`, because `resolver.test.ts` pins the exact plain `chrome.*` roster.
  The title and empty state are built at runtime because `indexShell.smoke.test.ts` pins the
  static inner-id roster. The sweep is the class `.mr-nav-list` on all nine static `<ul>`s;
  styles.css bans `#id` selectors. The runtime `#help-screen` list is left to qf-11
  (`R-qf-4-HELPSCREENUL`).

### qf-5 — NPC conversation pinning + wander cadence
category: gameplay (server movement; game-core rules) · severity: MED · size: LIGHT
touches: game-core/src/npc/rules.rs, game-core/src/npc/rules_tests.rs, server-module/src/movement.rs, server-module/src/movement_tests.rs
after: []
Feedback items: pt3-2026-10-070, -071

- Evidence: every `movement_tick` (STEP_MS = 200 ms) runs `npc_decide` per NPC with a 1-in-5
  stay roll (game-core npc/rules.rs ≈121–150; server movement.rs ≈503–545) — up to 5
  decisions/s, ~4 tiles/s, and the wander block never reads `player_conversation`, so the elder
  wanders out of TALK_RANGE(2) mid-dialogue. The permissive-range ruling (DECISIONS.md "latency
  margin") stays as backstop; this fixes the cause.
- Build note (qf-5, 2026-10-26): "active" = the row's owner is joined, in the NPC's zone and
  within TALK_RANGE of it (game-core `in_talk_range`) — a row left by a player who walked off
  must not freeze the NPC for everyone (security lens). Cadence: `npc_step_due` /
  `NPC_STEP_TICKS = 5`, phase offset by NPC entity id.

- **QF5.1:** WHILE an active `player_conversation` row references an NPC, THE server SHALL NOT
  move that NPC (the wander step for it is skipped each tick).
- **QF5.2:** THE wander cadence SHALL become walk-pause-per-tile at roughly one step per second
  — an integer tick-count rule in game-core (e.g. one step at most every N ticks with
  N·STEP_MS ≈ 1000 ms), deterministic and seeded; the server consumes the rule, never
  reimplements it.
- **QF5.3:** WHEN qf-5 lands, THE standing NPC pins SHALL stay green: NPCs never warp and never
  leave their home zone, and wander stays inside `wander_radius`.

### qf-6 — advance_dialogue: persistent dismissal, clear copy, visible quests
category: gameplay defect + i18n (promotes R-ci-fix-20261002T0501Z-WALKEDAWAYROLLBACK) · severity: MED · size: LIGHT
touches: server-module/src/npc.rs, server-module/src/npc_tests.rs, client/src/ui/statusModel.ts, client/src/ui/statusModel.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/e2e/dialogue.spec.ts
after: [qf-4, qf-5]
Feedback items: pt3-2026-10-069, -072, -073, -074

- Evidence: `advance_dialogue` deletes `player_conversation` then returns `Err` in the
  npc-missing / wrong-zone / walked-away branches — the `Err` rolls the delete back, the
  dialogue stays open, and the log line lies (the promoted residual). The raw reducer error
  surfaces as "advance: walked too far away" via statusModel's `${where}: ${message}` format.
  StartQuest already inserts `player_quest` (npc.rs ≈141–157) and the Journal already lists
  active rows; quest completion DELETES the row and grants the reward silently (npc.rs
  ≈240–249) — the operator received 50 gold without ever seeing it.
- qf-5 first: pinning the NPC removes most walked-away occurrences; this slice fixes the wedge
  and the copy for the residue.

- **QF6.1:** WHEN advance_dialogue's distance, zone or npc-existence check fails, THE
  conversation dismissal SHALL PERSIST (no delete-then-`Err` rollback wedge) and the client's
  dialogue overlay SHALL close — the mechanism (commit-then-Ok with a signal, or an explicit
  dismissal path) is the slice's call, but the net effect is pinned by a server test and the
  e2e.
- **QF6.2:** WHEN a conversation ends because the parties are too far apart, THE player-facing
  message SHALL be catalogued copy (en+fr) that states the conversation ended and why — the raw
  "advance: walked too far away" string SHALL NOT reach the player.
- **QF6.3:** WHEN a dialogue step applies StartQuest, THE accepted quest SHALL be visible in
  the Journal immediately (the `player_quest` row round-trips to questLogView; e2e proof).
- **QF6.4:** WHEN a quest completes, THE CLIENT SHALL acknowledge completion with the reward
  amount (feedback/toast through the catalog), replacing the silent row delete — any
  server-side data needed for the amount arrives through an ADDITIVE channel (appended column
  or ack row; the slice decides).

### qf-7 — battle legacy-control retirement
category: ux defect (strangler-rule violation vs CTL8I.1/CTL8J.1) · severity: MED · size: LIGHT
touches: client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/e2e/encounter-battle.spec.ts
after: [so-2]
Feedback items: pt3-2026-10-119, -132, -133 (and the already-built contextual-submenu half of -126)

- Evidence: the ctl-8i command row (Fight/Recruit/Swap/Bag/Run, battleView.ts ≈260–284) renders
  ALONGSIDE the legacy `#actionsEl` Flee button (≈793–805, in no cursor list — also mouse-only),
  legacy per-member swap buttons (≈806–808, 1008), an always-visible skills grid (≈735–739,
  ungated on Fight) and always-visible bait rows (≈813–818). The second steps (Recruit Yes/No,
  Bag target, Swap picker) are already contextual — the asked-for model is half-built.

- **QF7.1:** THE legacy Flee button SHALL NOT render — the command list's Run is the only flee
  affordance.
- **QF7.2:** THE legacy per-member swap buttons SHALL NOT render — Swap → party picker is the
  only swap path.
- **QF7.3:** THE skills/move list SHALL render only after Fight is selected, and THE bait list
  only after Recruit is selected (command-first, contextual second step), matching the existing
  second-step pattern.
- **QF7.4:** WHEN qf-7 lands, THE battle-safety pins SHALL stay green unmodified (B17
  battle-never-hidden, outcome grace, disabled-command reasons), and any e2e that drove a
  retired button migrates to the command-list path in this slice.

### qf-8 — mouse-only duplicate removal
category: ux-a11y doctrine defect ("no mouse-only element") · severity: MED · size: LIGHT
touches: client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/evolutionView.ts, client/src/ui/evolutionView.test.ts, client/src/ui/reachability.test.ts, client/e2e/trade.spec.ts, client/e2e/pvp.spec.ts, client/e2e/pvp-side-b.spec.ts, client/e2e/evolution.spec.ts, client/e2e/recruit.spec.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/styles.css, client/src/main.partyFull.test.ts, client/src/main.controls.test.ts, client/src/main.feedbackI18n.test.ts, client/src/main.feedbackCore.test.ts, client/src/ui/screens/socialScreen.boot.test.ts, client/e2e/monster-privacy.spec.ts, client/e2e/ranked-forfeit.spec.ts
after: [qf-7, qf-9]
Feedback items: pt3-2026-10-050, -051, -052, -062, -093

- Evidence: seven mouse-only legacy duplicates, each with a shipped nav-kit path (agent7
  finding 6): (1) `To Box`/`To Party` cards (boxView.ts ≈663–679; nav path: sheet Move);
  (2) raising per-monster Care buttons and (3) Train/feed buttons (deleted wholesale by qf-9's
  section removal); (4) legacy battle Flee (retired by qf-7); (5) trade-row buttons in
  `#trade-actions` (tradeView.ts ≈350–373; nav path: social sheet); (6) PvP incoming
  Accept/Decline + outgoing Cancel (pvpView.ts ≈259–297; nav path: social sheet);
  (7) evo-choice buttons (evolutionView.ts ≈311–331; nav path: Monsters Evolve flow). This
  slice deletes (1), (5), (6), (7) and sweeps the whole set.

- **QF8.1:** THE four remaining mouse-only duplicates — `To Box`/`To Party` cards, trade-row
  action buttons, PvP accept/decline/cancel buttons, evo-choice buttons — SHALL be deleted,
  with each action still reachable through its nav-kit path by D-pad AND by pointer (clicks on
  `[data-nav-key]` rows; CTL15.2 unchanged).
- **QF8.2:** A reachability-style sweep SHALL assert that none of the seven enumerated
  duplicates renders any longer and that no native button outside the nav model remains in the
  touched views (regression teeth for the whole set, including qf-7's and qf-9's deletions).
- **QF8.3:** WHEN an e2e previously drove a deleted button, IT SHALL be migrated to the nav
  path in this slice — never deleted for convenience.
- **Build note (qf-8, 2026-10-26):** the `touches:` above is short for every deletion. qf-8 shipped
  only the sweep scaffold (`reachability.test.ts`: raising Care/Train row, Evolve pointer route, e2e
  reference scan); QF8.1/QF8.2 are DEFERred. A follow-up needs, in addition: evo-choice →
  `client/src/ui/i18n/{catalog.en,catalog.fr,messageIds}.ts` (PARITY-04 DEAD-KEY on
  `evolution.card.choosePrompt`/`evolution.choice.evolve`) + `client/src/styles.css`
  (`--mr-evo-button`); To Box/To Party → `client/src/main.partyFull.test.ts` and the `box.hint` copy;
  trade rows → `client/src/main.{controls,feedbackI18n,feedbackCore}.test.ts`; PvP →
  `client/src/ui/screens/socialScreen.boot.test.ts`, `client/e2e/{monster-privacy,ranked-forfeit}.spec.ts`;
  QF8.2's Flee row needs qf-7b (QF7.1) first.

### qf-9 — raising screen becomes Inventory; full stats move to the Monsters Summary
category: ux restructure (absorbs R-ctl-11b-RAISINGCARDS) · severity: MED · size: LIGHT
touches: client/src/ui/boxModel.ts, client/src/ui/boxModel.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/raisingView.feedbackGate.test.ts, client/src/ui/raisingModel.ts, client/src/ui/raisingModel.test.ts, client/src/main.ts, client/src/main.controls.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [qf-6]
Feedback items: pt3-2026-10-054, -061

- Evidence: the raising root still renders the per-monster Care/Train cards (the absorbed
  residual) AND it is today's ONLY full-stats display (`raising.card.stats`
  attack/defense/speed/spAttack/spDefense, raisingView.ts ≈445–464); the Monsters Summary pane
  re-renders only the card line (species · level · HP, boxView.ts ≈516–528). Deleting the cards
  before the Summary shows stats would lose the game's only stats display — this slice does
  BOTH, stats first.

- **QF9.1:** THE Monsters Summary pane SHALL render the monster's full stats — attack, defense,
  speed, spAttack, spDefense and trust — sourced from the owner's own data (my_monster_pub via
  the store), BEFORE the raising section is removed; the merged slice has no interim state
  where no screen shows full stats.
- **QF9.2:** THE raising screen SHALL NOT render the Monsters/care section — its root becomes
  inventory-only (tabs: bait/food/medicine/other), absorbing `R-ctl-11b-RAISINGCARDS`.
- **QF9.3:** THE care-feedback test rows whose intent was the raising card path (PGCCA-A4/A1
  care rows, PGCCA-A4-CARE-BOOT-FR) SHALL be rewritten against the Monsters-sheet path and
  qf-2's invoking-surface sink — intent preserved, not deleted.

### qf-10 — terminology + label relocation (catalog values, en+fr+a11yCopy)
category: i18n polish (operator naming rulings) · severity: LOW · size: LIGHT
touches: client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/a11yCopy.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.test.ts, client/src/ui/liveRegion.test.ts, client/src/ui/announcements.test.ts, client/src/ui/battleView.test.ts, client/src/ui/helpView.i18n.test.ts
after: [qf-8]
Feedback items: pt3-2026-10-041, -042, -043, -044, -063, -112

- Evidence: every player-facing string is already catalog-resolved (rename cost LOW: catalog
  values + `a11yCopy.ts` literals + byte-pinned test updates; zero view-code changes —
  fact-check finding 14 enumerates the keys: `box.title`, `box.tab.*`, `box.section.*`,
  `menu.monsters.title`, `menu.bag.title`, `raising.title`, `chrome.help.title`, …). The
  box-vs-party hint and section labels sit between the tab strip and the panels (boxView.ts DOM
  order ≈217–308); the stale e2e-selector comment pinning that position no longer binds
  (recruit.spec.ts locates by data-testid).

- **QF10.1:** THE renames SHALL land in BOTH catalogs and in `a11yCopy.ts`: the monsters
  overlay titled "Monsters" (not "Party & Box"), "Storage" replacing "Box" in every
  player-facing value, the inventory screen titled "Inventory" (not "Bag" / "Raising &
  Inventory"), the help screen titled "How to Play" (not "Controls & Goals") — with menu entry
  labels matching their screen titles.
- **QF10.2:** THE redundant in-panel tab-name labels (a "Party"/"Storage" heading inside the
  already-labelled active tab) SHALL NOT render.
- **QF10.3:** THE box-vs-party help text SHALL NOT sit between the tab strip and the tab
  contents — it moves inside the content area or below it.
- **QF10.4:** THE byte-pinned tests SHALL be updated to the new literals as values-only
  changes: catalog key ids (`box.*`, `raising.*`) keep their legacy names, and the stale
  boxView comments claiming e2e resolves by English title are corrected.
- **QF10.5:** (unblocked 2026-10-24 — #586 D4) THE battle "Bag" command label
  (`battle.command.bag`) SHALL render as "Items" (en; fr equivalent), as a values-only
  catalog change with the key id unchanged.

### qf-11 — tab-strip CSS: uniform fixed-height horizontal labels
category: ux layout defect · severity: LOW · size: FEATHER
touches: client/src/styles.css, client/src/ui/boxView.ts, client/src/ui/helpView.ts, client/src/ui/raisingView.ts, client/src/ui/controlsView.ts, client/src/ui/frame.test.ts
after: [qf-10]
Feedback items: pt3-2026-10-037, -060, -115, -116

- Evidence: `.mr-frame-tabstrip { flex: 1 1 auto }` was designed for the horizontal titlebar
  row; boxView/helpView mount it as a direct child of the column-flex frame root where it grows
  VERTICALLY to absorb leftover height — tab labels grow with panel content. raisingView's
  `#bag-tabs` and controlsView's `#controls-tabs` are plain divs with NO tabstrip class, so
  their tabs stack vertically (fact-check finding 3).

- **QF11.1:** THE `.mr-frame-tabstrip` SHALL NOT flex-grow vertically in column contexts — tab
  labels render at one fixed, uniform height independent of the active panel's content, in
  every screen that mounts a tab strip.
- **QF11.2:** THE bag (`#bag-tabs`) and controls (`#controls-tabs`) tab containers SHALL adopt
  the shared horizontal tab-strip class — tab labels lay out horizontally everywhere.
- **QF11.3:** WHEN qf-11 lands, THE tab semantics SHALL be unchanged: LB/RB switching, the
  active-tab indicator and the nav-tab roles stay as shipped (CSS-only reshaping plus class
  attachment; no new tab component — that is the chrome milestone).

### qf-12 — footer + chrome: collapse the empty feedback line, drop the dead hints div
category: ux polish · severity: LOW · size: FEATHER
touches: client/src/ui/frame.ts, client/src/ui/frame.test.ts, client/src/styles.css
after: [qf-11]
Feedback items: pt3-2026-10-028

- Evidence: `frame.ts` creates `.mr-frame-feedback` unconditionally (≈77) and `styles.css`
  gives it `min-height: 1.5em` + a top border, so it paints as a visible empty strip; it is
  NOT dead — Y-descriptions and disabled-entry reasons paint there (CTL5.4, mainMenuScreen.ts
  ≈151–156). A second invisible `mr-frame-hints` div (≈78) has no CSS and no writer.

- **QF12.1:** WHILE the frame's feedback line holds no content (kind 'none'), IT SHALL NOT
  paint as a visible bordered strip — collapsed or hidden, restyled not deleted.
- **QF12.2:** WHEN feedback or a Y-description paints, THE line SHALL render exactly as before
  (CTL5.4 and the pgcc-a feedback-core pins stay green).
- **QF12.3:** THE dead `mr-frame-hints` div SHALL be removed from the frame kit.

### qf-13 — profile polish: titles, layout-matched nav, Close at bottom, one Privacy door
category: ux polish · severity: LOW · size: LIGHT
touches: client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/ui/renameView.ts, client/src/ui/renameView.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.test.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/screens/profileScreen.test.ts, client/src/ui/overlayRegistry.ts, client/src/ui/overlayRegistry.test.ts, client/src/styles.css, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [qf-16]
Feedback items: pt3-2026-10-098, -100, -101, -102, -103, -104

- Evidence: claimView appends six inline-flowing native buttons while the accountScreen adapter
  maps only Up/Down (profileScreen.ts rowStep ≈33–43, ≈81–90) — a layout/axis mismatch;
  `#privacy-close-btn` is deliberately FIRST as the a11y anchor for all five phases
  (privacyView.ts ≈91–93, overlayRegistry.ts A2-D10 ≈264–277); the Account screen's "Privacy &
  Account Data" door duplicates the Profile-level entry (claimView.ts ≈66–70). The Sign-In/
  no-register question is an auth decision batch (fail-closed OIDC + pluggable-auth rulings),
  NOT this slice.

- **QF13.1:** THE Name and Account screens SHALL render visible frame titles (catalogued
  en+fr), matching the frame-chrome convention.
- **QF13.2:** THE Account screen's claim buttons SHALL lay out as a column navigated Up/Down —
  OR the adapter gains Left/Right matching a horizontal layout — so the D-pad axis always
  matches the visual orientation.
- **QF13.3:** THE Privacy screen's Close option SHALL sit at the BOTTOM of its list, and the
  overlay SHALL keep a valid initial-focus anchor in all five phases (the A2-D10 roster is
  updated to a heading anchor styled per qf-1, never deleted).
- **QF13.4:** THE redundant Privacy door on the Account screen SHALL be removed — Privacy stays
  reachable from the Profile level.

### qf-14 — Controls accelerator
category: ux (one accel row) · severity: LOW · size: FEATHER
touches: client/src/input/bindings.ts, client/src/input/bindings.test.ts, client/src/main.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts
after: [qf-13]
Feedback items: pt3-2026-10-117

- Evidence: the accel table is B,I,V,J,U,P,L,N,C,F9,F8 (bindings.ts ≈32–44); none opens the
  Controls screen (menu-only, main.ts openControls). Tab is RESERVED (controls ruling: "Keep
  Tab for focus"); the remap store already supports accels (`{v:1, buttons, accels}`).

- **QF14.1:** ONE new accelerator row SHALL open Options › Controls directly, bound by default
  to a free key that is NOT Tab and NOT any reserved code.
- **QF14.2:** THE new accelerator SHALL be remappable like every other accel and SHALL appear
  automatically in the generated hint/help surfaces (no hand-written help rows).
- **QF14.3:** THE reachability pin SHALL be updated by hand as a literal manifest change, with
  the intentional count change named in the test comment (the `15 -> 16 with controlsView`
  model).

### qf-15 — zone transition cue + warp tile relocation
category: ux + content (silent warp) · severity: LOW · size: FEATHER
touches: game-core/content/zone_maps/000-core.ron, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/net/store.ts, client/src/net/store.test.ts
after: [qf-14]
Feedback items: pt3-2026-10-156, -163

- Evidence: zone 0 (5,5) ↔ zone 1 (5,5) is a real warp between two byte-identical placeholder
  maps, unrendered and unannounced — the operator read it as an NPC-toggling bug and concluded
  "there is only one map". Aggravator: (5,5) is ALSO elder_oak's home tile, so chasing the
  quest NPC teleports the player (fact-check findings 5–6).

- **QF15.1:** WHEN the player's own character changes zone, THE CLIENT SHALL announce the
  destination zone's display name (toast/feedback line, with the announcement template
  catalogued en+fr; the zone name itself stays content-sourced data) — the mechanism for
  reading the zone name (wasm export or an additive public registry surface) is the slice's
  call, additive-only.
- **QF15.2:** THE zone-0↔zone-1 warp pair SHALL move OFF elder_oak's home tile (5,5) to a floor
  tile that is no NPC's home and not the heal-location tile — a content RON edit with the
  CONTENT_VERSION bump, `validate_content` green.
- **QF15.3:** WHEN qf-15 lands, NPCs SHALL still skip warps (the existing server pin stays
  green).

### qf-16 — rankings presentation: display-only rows
category: ux polish (read-only list treatment) · severity: LOW · size: FEATHER
touches: client/src/ui/leaderboardView.ts, client/src/ui/leaderboardView.test.ts, client/src/styles.css
after: [qf-12]
Feedback items: pt3-2026-10-091

- Evidence: Rankings is read-only by design ("A there does nothing", socialScreen.ts ≈13–15);
  the cursor exists for scrolling (scrollIntoView + aria-activedescendant), but the rows use
  the same `.mr-nav-item.is-active` treatment as actionable rows, implying an interaction that
  does not exist. The stray UA bullets are already fixed by qf-4.

- **QF16.1:** THE ranking rows SHALL render as display-only — a read-only selected-row
  treatment visually distinct from actionable nav rows' active style, implying no A-press
  affordance.
- **QF16.2:** WHEN the ranking list overflows, THE list SHALL show a visible scroll affordance,
  and D-pad Up/Down SHALL still scroll the list (the cursor-as-scroll mechanism stays).

### qf-17 — reward visibility: battle payout feedback + wallet in shop
category: ux (invisible faucet) · severity: MED · size: LIGHT
touches: client/src/ui/shopModel.ts, client/src/ui/shopModel.test.ts, client/src/ui/shopView.ts, client/src/ui/shopView.test.ts, client/src/ui/battleView.ts, client/src/ui/battleView.test.ts, client/src/main.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, server-module/src/schema.rs, server-module/src/battle.rs, server-module/src/battle_tests.rs
after: [qf-15]
Feedback items: pt3-2026-10-157 (visibility half), -074 (battle-win half; quest ack is QF6.4)

- Evidence: battle KO-wins DO grant currency (`write_back_battle_results` grants loser_BST/10,
  battle.rs ≈1232–1249) and XP (≈1276–1312), both silently; the wallet reached the client via
  the owner-scoped `my_wallet` view since ADR-0154, but no shop surface shows it — "the
  operator never noticed owning 50 gold". The faucet REDESIGN (recruit payouts, starter kit)
  is the economy milestone, not here.

- **QF17.1:** WHEN a battle ends in a KO win, THE CLIENT SHALL show the currency payout amount
  in the outcome feedback (catalogued en+fr); any server data needed for the amount arrives
  through an ADDITIVE channel (e.g. an appended `#[default]` column on the battle row written
  at write-back, read via `my_battle`) — the slice picks the channel, additive-only.
- **QF17.2:** WHEN a battle ends in a KO win, THE outcome feedback SHALL also state that XP was
  gained (amounts per monster if the chosen channel carries them; a qualitative line
  otherwise).
- **QF17.3:** THE shop overlay SHALL display the player's current wallet balance (sourced from
  the store's existing `my_wallet` ingest), updating when the balance changes while the shop is
  open.

---

## Risks / notes

- **Deletion slices vs e2e:** qf-7/qf-8/qf-9 delete DOM the e2e suites may drive; each slice
  migrates affected e2e to the nav path in the same PR (QF7.4, QF8.3) — deleting a test to make
  a deletion pass is a BLOCK.
- **qf-13's Close move vs the a11y anchor roster:** `#privacy-close-btn` is the overlayRegistry
  anchor for five phases; QF13.3 names the replacement (heading anchor per qf-1's policy). If
  the slice finds the anchor cannot move safely, that goes to a decision note, not a silent
  revert of the operator's ask.
- **Catalog churn:** eight slices touch `catalog.en.ts`/`catalog.fr.ts`; the serial chain
  exists to keep parity/shape tests from cross-slice conflicts. Values-only renames; key ids
  stable (QF10.4).
- **so-2 interaction:** this milestone opens/closes no frames by new paths and must not touch
  `openFrame`/mirror machinery; if a slice finds it needs to, that is a hidden-dependency STOP
  (it belongs to M-stack-ownership's scope, not here).
- **Superseded in-code comments:** qf-3 updates the schema.rs "YAGNI" comment; qf-10 corrects
  the stale boxView e2e-selector comments — comments lie after the change otherwise.

## Post-integration verification

After all seventeen slices merge (serial, verifier-gated): full `just ci` green;
`bindings-drift = 0` (qf-3/qf-17 regenerate); schema snapshot additive-only; CONTENT_VERSION
bumped exactly once per content edit (qf-15); one manual pass of the operator's reported flows
recorded in the closing PR — open each menu and confirm no stray focus box and no empty footer;
care from the Monsters sheet with visible feedback and a visible cooldown reason; accept
quest_001 with the elder standing still, see it in the Journal, complete it and see the reward;
a wild KO win showing the payout; the shop showing the balance; a battle with command-first
lists and no legacy buttons; both zone warps announcing the zone name. The covermap rows for
the items in the header move to covered-by:M-pt3-quickfix in the episode ledger, and the two
absorbed residual rows are closed with `disposition: absorbed` pointing at qf-6/qf-9.
