# Disposition Brief — Playtest-3 feedback (episode pt3-2026-10, 2026-10-24)

Your PASS WITH CHANGES verdict is consumed and the queue is reshaped. This brief is the §9
accounting: every statement in `playtest-feedback-2026-10.md`, what it became, what was answered,
what needs your decision, and what happens next.

**Reconciliation: 186 items received, 186 accounted** (31 logged remarks · 133 queued into
milestones · 22 answered/closed in this brief and the decision issues). Covermap: 113/113
paragraphs mapped (`playtest-feedback-2026-10.covermap`, verified `--strict`). Ledger:
`memory/projects/feedback-ledger.jsonl`, reconciler green. The per-item table is in the appendix.

---

## What happens next (the reshaped queue — PLAN.md §9)

1. **ttd-1 → so-1 → so-2** — the already-queued corrective slices (test-truth, stack-ownership).
2. **M-pt3-quickfix** — 17 bug-fix/low-hanging-fruit slices from your feedback, build-ready
   (focus-ring, care feedback + cooldown display, journal, NPC/quest chain, battle legacy-button
   cleanup, mouse-only duplicates, naming sweep, tab CSS, profile polish, zone cue, reward
   visibility…).
3. **M-battle-tactics** — the tactical combat overhaul, your top priority. Design ceremony starts
   when you answer #583/#584; P1 = tactical wild battles, P2 = PvP/ranked, P3 = your
   "(a future feature)" items (obstacles, elevation, line/cone AoE — deferred on your own text).
4. Then **M-ui-foundation** (shared menu components + wireframes first), **M-world-art-pass**
   (runs alongside as content work; feeds battle sprites), **M-trade-sessions**,
   **M-netcode-presence**, **M-econ-onboarding**, **M-identity-handles** — then M25 (blocked on
   Checkpoint-2 as before), M-gamepad, M19, M18 (re-sketched on the tactical engine).

All eight milestone specs are drafted in `specs/monster-realm-v2/`. The supervisor loop is still
under your hold; building starts when you lift it (the corrective slices run first either way).

## Decisions waiting on you (7 issues, batched 1–5 related decisions each, per your directive)

Ordered by consequence — each has a recommendation; closing an issue without comment accepts its
recommendations; you can answer any numbered subset:

1. monster-realm **#583** — battle overhaul scope: M14 depth carry-over, PvP phasing, cutover,
   M-gamepad order, **next-playtest timing** (gates the design ceremony).
2. monster-realm **#584** — tactical design parameters: AP vs move+act, turn order, recruit %,
   undo/forecast, PvP clock (gates the design ceremony).
3. monster-realm **#585** — trade redesign rules: tradable assets, gifts, initiation locus,
   arrival slot, escrow window.
4. monster-realm **#586** — UI policy: scaling method (a real conflict with your crisp-pixel
   ruling), mini-menu shape, menu flattening, battle "Bag" rename, footer.
5. monster-realm **#587** — economy & art: recruit payout, starter kit, heal-cost timing,
   monster sink, art-direction re-base.
6. monster-realm **#588** — identity & roadmap: discriminator format, Players-tab info, Sign-In
   UI, M19 before M18.
7. claude-harness **#160** — doctrine: whether "quality over quantity" adjusts the §5 cost caps;
   decision-batching v1.6 confirmation.

## Answered (fact-checks you asked for — "fact-check his assertions honestly in both directions")

- **Care cooldown (you suspected a bug):** it is 6 hours per monster (`CARE_COOLDOWN_MS`,
  game-core raising rules), and a rejected click does NOT reset it — the reducer checks before it
  stamps, and an error rolls the write back. Your playtest DB shows care succeeded twice (two
  monsters, 3.5 h apart). It felt broken because (a) from the Monsters mini-menu both success and
  rejection are silently swallowed — the feedback message is hard-wired to the Raising overlay,
  which was hidden — and (b) nothing shows the cooldown. Both are quickfix slices (qf-2, qf-3).
- **The quest "never worked":** it did — invisibly. The DB shows you accepted AND completed
  `quest_001` and were paid its 50-gold reward (your wallet held exactly 50g). The journal row
  only exists between acceptance and your next talk to the elder, which auto-completed and
  deleted it silently. The "walked too far away" failures happen because NPC wander ignores
  conversations (the elder moves ~4 tiles/s inside talk range 2). Quickfix pins NPCs during
  conversation, slows wander to walk-pause-per-tile, journals quests visibly, and acknowledges
  completion + reward (qf-5, qf-6).
- **"Water tiles heal" (you called it a misread of the heal-point decision):** pushing back with
  evidence — there are no water tiles at all (the renderer draws wall/floor/grass only), and
  healing is exactly ONE authored landmark location (zone 0, tile (8,3), 30 s cooldown, free),
  which matches your Pokecenter model. The real defect is that the heal tile renders as plain
  grass with zero marker — your own "indistinguishable" observation. Fix is landmark art +
  signage (M-world-art-pass), not a healing redesign. Free-vs-paid healing is #587-D3.
- **"Only one map / no way to travel":** two zones exist (Verdant Hollow, Tideglass Cove) and the
  "NPC-swapping tile" IS the working warp between them — but both zones ship byte-identical
  placeholder maps, so travel is invisible. The warp tile is also the quest elder's home tile,
  which is why you kept hitting it. Quickfix adds a zone-name cue and moves the warp; distinct
  zone art lands in the art pass.
- **"No way to earn money":** faucets exist — battle KO-wins pay ~31g and the quest paid 50g —
  but your playstyle was recruiting, and **successful recruits currently pay nothing: no
  currency, no XP, no essence** (the "level-ups" you saw were recruits arriving at higher spawn
  levels). That plus invisible payouts made the economy feel faucet-less. Recruit payout is
  #587-D1; payout visibility is quickfix qf-17.
- **Party slots:** capacity is 6 (one constant, `PARTY_SIZE`), not 5 — worth a recount next time
  you're in the menu; if it renders 5 slots that's a new bug we couldn't reproduce from source.
- **The "rectangular box" on five menus:** it's the browser's default focus ring on the
  accessibility focus anchors (M23) — a real feature with zero styling. Quickfix designs a proper
  focus indicator; the anchors stay (screen-reader + keyboard support depend on them).
- **The "empty footer":** it's the reserved line where Y-button descriptions and disabled-reasons
  paint. Quickfix collapses it when empty (deleting it would break those) — confirm in #586-D5.
- **Rankings scrolling (your question):** rows are selectable purely so the cursor can scroll the
  list. Better way: display-only rows + a visible scroll affordance — queued (qf-16).
- **Your 8 libraries, vetted** (`docs/research/pixijs-ecosystem-ui-and-assets.md`):
  **use** pixi-filters (bloom/god-rays/LUT grading for the 2D-HD path, profile-gated);
  **defer** @assetpack/core, @pixi/layout, @pixi/tilemap (and @pixi/ui except HUD widgets) — they
  target in-canvas UI, while the client's menus are an accessible DOM layer that already does
  flexbox/a11y natively; **avoid** @pixi/react (no React in the client; it would fight the
  imperative render loop), @pixijs-userland/spine-layout (days-old, unlicensed, 1-star), and
  **Spine Runtimes — licensing flag:** integrating them legally requires a paid per-seat Spine
  Editor license; frame-by-frame spritesheets (Aseprite-style) fit the art direction without it.
- **Research you ordered** is persisted and indexed in `docs/research/`:
  `tactical-rpg-combat-design` (honest premise-check: FFTA/Triangle Strategy/Sword of Convallaria
  use move+act, not AP pools; FFTA monsters aren't deployable units — the closer precedents are
  Pokemon Conquest/Devil Survivor; details in #584), `retro-rpg-menu-ui-design`,
  `hd2d-modern-retro-art-direction`, `reference-games-pixel-mmo-tamers`, plus the library vetting.

## Deferred (your own text authorizes it)

- Tile obstacles/cover, tile elevation, line/cone AoE — your "(a future feature)" markers →
  M-battle-tactics P3 (items 138, 139, 141).

## Declined

- None. (Library exclusions above follow your "exclude if not useful" instruction and are
  recorded as answers, not declines.)

## Parked

- None new. 49 prior-episode items stay open as not-exercisable-this-playtest (below).

## Prior episodes closed by this playtest (I-5)

Your playtest was the verification vehicle for 139 open items from the July-r2 and October
controls episodes: **74 closed SHIPPED-VERIFIED** (controls redesign broadly validated — "the
control changes were good"; per-item evidence in the ledger), **1 operator-closed** (Tab/Select —
your own earlier answer superseded it), **14 recurred** and are carried by new pt3 items
(UI consistency → 094/175, scaling → 164, care no-op → 048, NPC speed → 070, map size → 162,
placeholder art → 155), **49 held** (their surfaces weren't exercisable this run — e.g. 0-HP
battle entry, evolution paths, the `?` overlay).

## Process notes

- Doctrine bumped to v1.6: decision issues now batch 1–5 related decisions (your L7 directive);
  partial answers resume what they unblock.
- "Quality over quantity" interpretation raised as harness #160 rather than silently re-reading
  the §5 caps.
- The §11 process audit of this episode is complete: all six criteria PASS, **zero confirmed
  breaches** (31 items sampled; covermap re-verified `--strict` independently). Two closures rest
  on weaker absence-of-recurrence evidence and are flagged here per the auto-close rule —
  **closing r2-2026-07-26-032 (shop error message) and op-2026-10-01-controls-051 (face-to-face
  trade range); object to reopen** — the auditor's notes are on both ledger rows.

---

## Appendix — mechanical per-item table

(generated by `mr-feedback brief --episode pt3-2026-10`; regenerate any time for current state)
# Disposition Brief — episode pt3-2026-10 (2026-10-24)
<!-- mechanically rendered by mr-feedback brief; supervisor: add reasons for Declined/Deferred, decision-defaulted records, and the manifest prose -->

## In progress (155)
- `pt3-2026-10-001` I prefer generalizable solutions over specific solutions. When example — ev: applied: systemic milestones (M-ui-foundation, M-battle-tactics...) over point fixes tgt: standing preference: episode conduct + spec constraints
- `pt3-2026-10-002` Also, look at the feedback as a whole and consider if any parts are sy — ev: whole-feedback analysis done: 19 clusters -> 8 milestones; symptoms traced to shared root causes (focus-ring, tabstrip CSS, feedback-sink routing) tgt: pt3-disposition-pass
- `pt3-2026-10-003` Try to implement and integrate systematic solutions that are modular/r — ev: encoded as the M-ui-foundation mandate + quickfix root-cause fixes tgt: standing constraint: M-ui-foundation shared component system
- `pt3-2026-10-004` I would like solutions to be well thought out, well designed, simple a — ev: recorded; governs milestone design tgt: standing preference: episode conduct
- `pt3-2026-10-005` When it comes to how much work to put into fixes, improvements, refact — ev: interpretation + confirm question raised (quality bar vs SS5 caps) tgt: decision issue pt3-process-quality (claude-harness repo)
- `pt3-2026-10-006` I want this game to be both well-architected (easy to develop, reliabl — ev: recorded; governs milestone design tgt: standing preference: episode conduct
- `pt3-2026-10-007` Use your own judgement about what is best for the project. You are fre — ev: scope = this episode's dispositions; divergences raised as decision issues, never silent tgt: episode conduct: SS3 DELEGATION honored
- `pt3-2026-10-008` However, do not do so silently. If what you think is best aligns with  — ev: every divergence/judgment fork raised in the 7 decision issues tgt: episode conduct: decision issues
- `pt3-2026-10-009` Create a list of these decision points as they come up and then group  — ev: doctrine amended: decisions batch 1-5 related per issue (supersedes v1.1 one-issue-per-decision) tgt: mr-feedback-doctrine v1.6 SS9 amendment
- `pt3-2026-10-010` Ensure that something is in place to find, retrieve and incorporate my — ev: watcher polls each issue 5min/7d, writes $MEM/decisions/issue-N.answer.md, fires event tick; answers are a SS2 intake channel tgt: verified: mr-ask-drew + mr-decision-watch channel
- `pt3-2026-10-011` You should also read the previous playtest feedback (in the harness re — ev: prior-constraint scan executed over 07/07-r2/controls artifacts + DECISIONS.md; conflicts raised in decision issues tgt: pt3-disposition-pass
- `pt3-2026-10-012` Consider industry standards and common conventions that are appropriat — ev: industry-convention research persisted to the shared library tgt: docs/research/retro-rpg-menu-ui-design.md + tactical-rpg-combat-design.md
- `pt3-2026-10-013` If changes need to be made to the UI design or layout, try creating a  — ev: wireframe deliverable is the milestone's first slice tgt: M-ui-foundation (wireframes-first slice)
- `pt3-2026-10-014` The UI borrows some principles from reactive and responsive web design — ev: responsive-design principles encoded; policy pends pt3-ui-policy tgt: M-ui-foundation (scaling policy)
- `pt3-2026-10-015` Then compare and contrast those wireframes to the current design, as w — ev: compare-to-current+reference-games step included tgt: M-ui-foundation (wireframes-first slice)
- `pt3-2026-10-016` However, while you should use other sources for inspiration, you shoul — ev: inspire-don't-copy: CC0 kitbash + provenance manifest required tgt: standing constraint: M-world-art-pass provenance rules
- `pt3-2026-10-017` You should research the following games thoroughly in preparation for  — ev: 4 research docs persisted 2026-10-24 covering all 7 named games tgt: docs/research/: tactical-rpg-combat-design, retro-rpg-menu-ui-design, hd2d-modern-retro-art-direction, reference-games-pixel-mmo-tamers
- `pt3-2026-10-018` However, I want the `monster-realm` project to implement a similar sty — ev: risk-promoted (battle schema, net protocol, save data) tgt: M-battle-tactics
- `pt3-2026-10-019` The things I DON'T want to take are any of the "pay to win", "microtra — ev: recorded in spec constraints tgt: standing constraint: M-battle-tactics (no P2W/gacha/microtransactions)
- `pt3-2026-10-020` The main difference between `monster-realm` and Coromon Remastered is  — ev: recorded; reference study in reference-games doc tgt: standing preference: design input (distinctness vs Coromon)
- `pt3-2026-10-021` Its lighting, shadows, and depth effects are a benchmark for the "2D-H — ev: 2D-HD benchmark drives the staged art path (S0-S2) tgt: M-world-art-pass
- `pt3-2026-10-022` Sea of Stars: A modern retro-inspired indie RPG with excellent pixel a — ev: Sea of Stars benchmark recorded tgt: M-world-art-pass (rides 021)
- `pt3-2026-10-025` The main menu has a "Close" menu item for easy navigation, even in the — ev: recorded as component-system rule tgt: standing preference: M-ui-foundation (explicit Close/Back everywhere, at bottom)
- `pt3-2026-10-028` There is a visible footer in the main menu that is empty and unnecessa — ev: root cause: .mr-frame-feedback min-height+border paints empty (frame.ts:77, styles.css:200-204); it is the load-bearing Y-description line tgt: M-pt3-quickfix
- `pt3-2026-10-030` adjusting the alignment and layout of the elements — ev: alignment/layout pass inside the shared component rework tgt: M-ui-foundation
- `pt3-2026-10-031` adjusting the text size (or allowing a setting that would scale the te — ev: text-size setting (user pref and/or screen-size driven) tgt: M-ui-foundation
- `pt3-2026-10-036` - There is a visual bug where a rectangular box is visible around the  — ev: root cause CONFIRMED: unstyled UA :focus-visible ring on a11y initial-focus anchors (overlayRegistry.ts:155-185, zero :focus rules in styles.css); one styled-indicator fix clears all 5 screens tgt: M-pt3-quickfix
- `pt3-2026-10-037` - The tab labels are not a consistent height.   - The `Party` tab alwa — ev: root cause: .mr-frame-tabstrip flex:1 grows vertically in column contexts (styles.css:177-186) tgt: M-pt3-quickfix
- `pt3-2026-10-038` The tab contents section should grow to fit the available space (up to — ev: content area grows to available space (component rework) tgt: M-ui-foundation
- `pt3-2026-10-039` For the `Storage` tab, having a lot of monsters may cause the section  — ev: pseudo-scroll for grid overflow (D-pad scroll-into-view) tgt: M-ui-foundation
- `pt3-2026-10-040` For compatibility with mice, support for the scroll wheel might also b — ev: wheel support (pointerSource has no wheel path today) tgt: M-ui-foundation
- `pt3-2026-10-041` There is help/info text between the tab labels and the tab contents. H — ev: root cause: append-order DOM; stale e2e-selector constraint no longer binds (boxView.ts:276-285) tgt: M-pt3-quickfix
- `pt3-2026-10-042` - Inconsistent terminology.   - The main menu calls this submenu "Mons — ev: catalog rename en+fr+a11yCopy; byte-pinned tests updated tgt: M-pt3-quickfix
- `pt3-2026-10-043` "Box" and "Storage" are used interchangeably. There should be one cons — ev: 'Storage' replaces 'Box' everywhere (catalog keys stay legacy ids) tgt: M-pt3-quickfix
- `pt3-2026-10-044` Redundant labels. When the "Party" tab is selected the tab contents al — ev: remove in-panel duplicate tab-name labels tgt: M-pt3-quickfix
- `pt3-2026-10-045` The menu itself grows to fit the whole screen, but the menu's tabs and — ev: interior-expands layout per operator's stated leaning tgt: M-ui-foundation
- `pt3-2026-10-046` - In both tabs, there is a miniature menu that appears when I interact — ev: close-then-route outside-click (reshapes ctl-15 CTL15.2 pointer rule) tgt: M-ui-foundation
- `pt3-2026-10-047` - It does not have a visible border and it appears in an awkward locat — ev: bordered corner-anchored context sheet per genre convention (research doc) tgt: M-ui-foundation
- `pt3-2026-10-048` It is unclear what the `Care` menu item is intended to do. When I inte — ev: root cause CONFIRMED: care feedback sink hard-wired to hidden raisingView (main.ts:1517, raisingView.ts:385-388) - both success and rejection silently swallowed from Monsters sheet tgt: M-pt3-quickfix
- `pt3-2026-10-049` While the B button works for backing out of the mini-menu, there shoul — ev: explicit Back/Close row in sheets (component rule) tgt: M-ui-foundation
- `pt3-2026-10-050` The `Move` menu item's functionality is duplicated by the `To Box` but — ev: remove To Box/To Party duplicates (sheet Move is the nav path) tgt: M-pt3-quickfix
- `pt3-2026-10-051` - These buttons are not reachable if the player tries to navigate sole — ev: mouse-only duplicates enumerated (agent7 finding 6); all 7 removed/nav-wired tgt: M-pt3-quickfix
- `pt3-2026-10-052` No UI element should only be reachable by the mouse, even if a workaro — ev: rule already standing (controls doctrine, DECISIONS.md:503-505); this is a defect sweep, enumerated+bounded; reachability gate rides the slice tgt: M-pt3-quickfix
- `pt3-2026-10-053` I am considering whether the miniature menu should be replaced by a sm — ev: his in-slot-buttons+detail-page alternative weighed in pt3-ui-policy tgt: M-ui-foundation
- `pt3-2026-10-054` Despite being the screen you are brought to when the `Monsters` option — ev: full stats (atk/def/spd/spA/spD/trust) rendered in Summary; data already client-side for own monsters tgt: M-pt3-quickfix
- `pt3-2026-10-055` It is functional and works, but the UI and layout could be better desi — ev: rides shared design language tgt: M-ui-foundation
- `pt3-2026-10-058` While I like that the message exists, I don't like how it's designed.  — ev: four-channel feedback policy (toast/dialog/hint/textbox) replaces layout-shifting flash tgt: M-ui-foundation
- `pt3-2026-10-059` - There is a visual bug where a rectangular box is visible around the  — ev: rides 036 (same root cause) tgt: M-pt3-quickfix
- `pt3-2026-10-060` - The tab labels for the `Inventory` section are not consistent with o — ev: root cause: #bag-tabs is a plain div without the shared tabstrip class (raisingView.ts:223) so tabs stack vertically tgt: M-pt3-quickfix
- `pt3-2026-10-061` - This menu is trying to do two unrelated things.   - It is showing a  — ev: remove Monsters/care section from raising screen (absorbs R-ctl-11b-RAISINGCARDS); pairs with 054 stats-in-Summary tgt: M-pt3-quickfix
- `pt3-2026-10-062` - The `Care` button's functionality is duplicated by the `Care` action — ev: raising Care/Train/feed buttons are mouse-only legacy duplicates - removed tgt: M-pt3-quickfix
- `pt3-2026-10-063` - Inconsistent terminology.   - The main menu calls this submenu "Bag" — ev: 'Inventory' replaces 'Bag'/'Raising & Inventory' (catalog en+fr) tgt: M-pt3-quickfix
- `pt3-2026-10-064` I have no items, so I cannot test item functionality. Every new player — ev: risk-promoted (economy balance + once-only grant integrity, ADR-0091 pattern + rejoin-regrant trap) tgt: M-econ-onboarding
- `pt3-2026-10-065` The "care" action hasn't come off cooldown since the first time I clic — ev: verified from code+playtest DB: 6h per-monster cooldown (rules.rs:79), NO reset on failed attempt (reject-never-burns), care succeeded twice during playtest; his 3 hypotheses answered tgt: answered in pt3 disposition brief
- `pt3-2026-10-066` Additionally, there's no visual indication of how long the cooldown is — ev: owner-scoped care-readiness exposure + disabled-with-reason + remaining-cooldown hint tgt: M-pt3-quickfix
- `pt3-2026-10-068` The journal menu is a completely empty menu. I think that's because I  — ev: root cause: #quest-log-overlay shell has no heading and no empty-state (index.html:28-30, questLogView.ts:91-116) tgt: M-pt3-quickfix
- `pt3-2026-10-069` I tried to accept a quest but wasn't able to. — ev: root cause: quest WAS accepted AND auto-completed invisibly (playtest DB: done_quests=[quest_001], wallet=50 reward); advance usually failed due to NPC wander tgt: M-pt3-quickfix
- `pt3-2026-10-070` The NPC that offers a quest runs around very fast and is hard to inter — ev: NPC wander = up to 5 decisions/s (~4 tiles/s) vs operator's walk+1s-pause ruling; server npc_decide cadence change tgt: M-pt3-quickfix
- `pt3-2026-10-071` When I do interact with the NPC he continues to move around the map ev — ev: CONFIRMED: npc_decide never reads player_conversation (movement.rs:503-545); add conversation pinning tgt: M-pt3-quickfix
- `pt3-2026-10-072` When I tried to tell the NPC that I seek a quest I initially got a mes — ev: message copy + promote R-ci-fix-20261002T0501Z-WALKEDAWAYROLLBACK (delete+Err rollback wedge on same reducer) tgt: M-pt3-quickfix
- `pt3-2026-10-073` Messages should be clear and easy for the player to understand. — ev: player-facing Err copy pass (i18n catalog; Err(String) channel) tgt: M-pt3-quickfix
- `pt3-2026-10-074` No quest was ever added to my journal. Even if the quest would require — ev: player_quest visible in Journal at StartQuest; done-quest completion acknowledged with reward toast instead of silent delete tgt: M-pt3-quickfix
- `pt3-2026-10-078` Another visual glitch similar to the previously mentioned one occurs w — ev: rides 036 tgt: M-pt3-quickfix
- `pt3-2026-10-079` - Inconsistent behavior. The other menu options bring me to a new menu — ev: menu IA: Social opens the 4-tab screen directly (matches code structure already - socialScreen is one screen) tgt: M-ui-foundation
- `pt3-2026-10-080` When offering trades you can't view the other player's monsters. That  — ev: risk-promoted (trade protocol + schema); privacy model itself REINFORCED by operator tgt: M-trade-sessions
- `pt3-2026-10-081` - Instead of the current flow (where one player proposes a trade and a — ev: multi-stage session flow per operator design; protocol redesign (immutable offer -> mutable document) tgt: M-trade-sessions
- `pt3-2026-10-082` - Monsters can only be in one active trade at a time, must have at lea — ev: new eligibility rules (in-party, >=1HP, 1-trade-per-monster, auto-cancel) encoded reject-don't-clamp tgt: M-trade-sessions
- `pt3-2026-10-083` Players cannot confirm any offer if one side of the offer is empty. Th — ev: no-empty-side confirm; kills one-sided gifts tgt: M-trade-sessions
- `pt3-2026-10-084` This allows players to trade without having access to a list of everyt — ev: rationale recorded as acceptance criteria in spec tgt: M-trade-sessions
- `pt3-2026-10-085` The trade UI listed things other than monsters (implying they were tra — ev: UI-vs-rules mismatch absorbed by redesign; asset scope pends pt3-trade-scope tgt: M-trade-sessions
- `pt3-2026-10-086` Each active trade in the `Trades` tab should be its own UI component t — ev: per-trade row component - rebuilt by redesign, not patched before tgt: M-trade-sessions
- `pt3-2026-10-087` - I like that players can choose whatever name they want, but if names — ev: names confirmed non-unique (no uniqueness query in set_profile_name) tgt: M-identity-handles
- `pt3-2026-10-088` - One option to allow players to differentiate each other is to use a  — ev: risk-promoted (schema + save data; must survive M22 re-key cascade) tgt: M-identity-handles
- `pt3-2026-10-089` The padding and margins across contents of the four tabs in the `Socia — ev: spacing/padding tokens in the component system tgt: M-ui-foundation
- `pt3-2026-10-090` The `Rankings` tab lists every ranked player except the currently sele — ev: root cause: missing list-style:none on nav <ul>s; selected row's marker paints dark-on-dark (styles.css:223-228) tgt: M-pt3-quickfix
- `pt3-2026-10-091` Additionally, there is no available interaction when a player's rankin — ev: read-only rows get display-only treatment + scroll affordance (A deliberately no-ops today) tgt: M-pt3-quickfix
- `pt3-2026-10-092` If it's for scrolling purposes, is there a better way? — ev: selection exists for scrolling (cursor doubles as scroll + aria-activedescendant); better way = display-only rows + visible scroll affordance, queued in quickfix tgt: answered in pt3 disposition brief
- `pt3-2026-10-093` Similar to previous menus, there are UI buttons that are only reachabl — ev: trade-row/pvp buttons are mouse-only legacy duplicates - removed (nav sheet path exists) tgt: M-pt3-quickfix
- `pt3-2026-10-094` It feels like the layout of each menu is subtly different from all the — ev: shared component system hardening (frame.ts/navRender as THE system) tgt: M-ui-foundation
- `pt3-2026-10-096` Another visual glitch similar to the previously mentioned one occurs w — ev: rides 036 tgt: M-pt3-quickfix
- `pt3-2026-10-097` - Inconsistent behavior. The other menu options bring me to a new menu — ev: combine Name/Account/Privacy into one screen per operator proposal tgt: M-ui-foundation
- `pt3-2026-10-098` The `Name` and `Account` screens lack a menu title. — ev: titles added (defect vs CTL4.6 title bar) tgt: M-pt3-quickfix
- `pt3-2026-10-099` The `Account` screen has a "Sign In" button, but no way to register. H — ev: registration happens at the OIDC IdP; ALLOWED_ISSUERS is fail-closed placeholder today - UI must say so or hide Sign In tgt: M-identity-handles
- `pt3-2026-10-100` The `Account` screen has a button leading to the `Privacy & Data` scre — ev: redundant Privacy door removed per operator (was deliberate; reversible) tgt: M-pt3-quickfix
- `pt3-2026-10-101` The buttons in the `Account` screen are aligned horizontally, but sele — ev: claim buttons laid out as column (or nav axis matched to layout) tgt: M-pt3-quickfix
- `pt3-2026-10-102` The button directions used to select components should correspond to t — ev: nav-axis-matches-layout recorded as component-system rule; instance fixed in quickfix (101) tgt: M-ui-foundation
- `pt3-2026-10-103` On the `Privacy & Account Data` screen, the `Close` option is at the t — ev: Close moved to bottom; a11y-anchor role preserved via focus order tgt: M-pt3-quickfix
- `pt3-2026-10-104` If a close/back option is in a menu, it should be located at the botto — ev: close-at-bottom recorded as component-system rule tgt: M-ui-foundation
- `pt3-2026-10-107` Other than the layout issues, I actually like the `Controls` screen an — ev: recorded tgt: standing preference: Controls screen + remapping kept as-is
- `pt3-2026-10-108` Another visual glitch similar to the previously mentioned one occurs w — ev: rides 036 tgt: M-pt3-quickfix
- `pt3-2026-10-109` Inconsistent behavior. The other menu options bring me to a new menu r — ev: menu IA (Options flatten) tgt: M-ui-foundation
- `pt3-2026-10-110` The `How to play` option has a tab for controls, but that need is alre — ev: All Controls tab removed in Help rework (duplicates Controls screen - confirmed same model rows) tgt: M-ui-foundation
- `pt3-2026-10-111` Since the middle (navigational) sub-menu only has 2 options (`How to p — ev: How to play + Controls promoted to main menu tgt: M-ui-foundation
- `pt3-2026-10-112` Inconsistent naming. The `How to Play` option leads to a screen called — ev: screen title becomes 'How to Play' (catalog) tgt: M-pt3-quickfix
- `pt3-2026-10-113` The `This Screen` tab in the `Controls & Goals` screen is blank. I thi — ev: 'This Screen' -> 'Introduction' with real game-blurb content tgt: M-ui-foundation
- `pt3-2026-10-114` - Instead of a simple `Goals` tab that only has three bullet points in — ev: encyclopedia tab + pseudo-modal detail (new prompt-frame OverlayId; a11y roster cost known from ctl-13 CTL13.5) tgt: M-ui-foundation
- `pt3-2026-10-115` - The tab labels are not a consistent height in the `How to play` scre — ev: rides 037 (same tabstrip root cause) tgt: M-pt3-quickfix
- `pt3-2026-10-116` In the `Controls` screen the two tab labels (`Buttons` and `Shortcuts` — ev: #controls-tabs missing shared horizontal class (controlsView.ts:113) tgt: M-pt3-quickfix
- `pt3-2026-10-117` The `Controls` screen doesn't have a shortcut, but it's probably more  — ev: one accelerator row (never Tab - reserved) tgt: M-pt3-quickfix
- `pt3-2026-10-121` I like the red and green info boxes that show information (Name, Level — ev: keep-signal: info boxes carried into tactical HUD (spec constraint) tgt: M-battle-tactics
- `pt3-2026-10-122` The health bar is good. — ev: keep-signal: health bar carried into tactical HUD tgt: M-battle-tactics
- `pt3-2026-10-126` - The graphics are extremely bare-bones and the layout is very basic.  — ev: presentation rebuilt inside overhaul; legacy-button retirement ships earlier in quickfix tgt: M-battle-tactics
- `pt3-2026-10-127` There is no background image to show the battlefield or the terrain. I — ev: shared battlefield background placeholder (asset from M-world-art-pass) tgt: M-battle-tactics
- `pt3-2026-10-128` There is no animation of any kind accompanying the actions taken by ei — ev: action animations via frame spritesheets (Spine AVOIDED - paid editor license; see research) tgt: M-battle-tactics
- `pt3-2026-10-129` The boxes representing the monsters are simply stacked on top of each  — ev: superseded by tactical layout tgt: M-battle-tactics
- `pt3-2026-10-130` There is no visual distinction between the part of the screen that the — ev: battle-area vs menu-area separation in tactical layout tgt: M-battle-tactics
- `pt3-2026-10-131` Everything remains the same size, no matter how big my screen is (reso — ev: battle screen joins the single-scale-authority policy tgt: M-ui-foundation
- `pt3-2026-10-132` There are redundant buttons for Run, Flee, and Swap. — ev: CONFIRMED: legacy Flee + per-member swap buttons never retired when ctl-8i command row landed tgt: M-pt3-quickfix
- `pt3-2026-10-133` - Almost all the buttons are present on the screen at the same time. I — ev: contextual submodel half-built (command row + second steps exist); quickfix hides always-visible skills/bait lists behind selection tgt: M-pt3-quickfix
- `pt3-2026-10-134` The combat itself is a little simplistic and boring. — ev: rides 135/148 tgt: M-battle-tactics
- `pt3-2026-10-135` - Instead of Pokemon-style combat where it's mostly 1v1 battles withou — ev: risk-promoted (battle schema, net protocol, combat rules); supersedes 1v1 core (game-design.md:107) per later-beats-earlier tgt: M-battle-tactics
- `pt3-2026-10-136` I want to start simple with the new battle system and gradually add ne — ev: start-simple phasing encoded as P1->P3 tgt: M-battle-tactics
- `pt3-2026-10-137` The battlefield should be made up of tiles and be large enough for eac — ev: 1-3 per side / 2-6 total; well-precedented (research: Into the Breach, Devil Survivor, FEH) tgt: M-battle-tactics
- `pt3-2026-10-138` The tiles may or may not have obstacles (a future feature) that impair — ev: operator's own '(a future feature)' text authorizes deferral (SS10) tgt: M-battle-tactics P3 (DEFERRED)
- `pt3-2026-10-139` The tiles may be different heights (a future feature), which may add a — ev: operator-authorized future feature tgt: M-battle-tactics P3 (DEFERRED)
- `pt3-2026-10-140` - Attacks should have a range, an origin, a target, and an area-of-eff — ev: range/origin/target/AoE as separate data fields + LoS + friendly-fire filters (Mewgenics model) tgt: M-battle-tactics
- `pt3-2026-10-141` Attacks with line and cone areas-of-effect (a future feature) would wo — ev: operator-authorized future feature (line/cone AoE) tgt: M-battle-tactics P3 (DEFERRED)
- `pt3-2026-10-142` Monsters should get a certain number of action points that they can sp — ev: AP economy - precedent check: FFTA/TS/SoC use move+act, not AP; true-AP precedents are Dofus/DOS2 tgt: M-battle-tactics
- `pt3-2026-10-143` The cost of moving depends on the distance moved, the type of terrain  — ev: move cost by distance/terrain/type/speed - integer, deterministic, game-core tgt: M-battle-tactics
- `pt3-2026-10-144` The cost of an attack depends on how powerful it is. Powerful attacks  — ev: cost curve: strong attack more cost-efficient than weak spam (balance content) tgt: M-battle-tactics
- `pt3-2026-10-145` Using an item should cost somewhere between a weak and strong attack,  — ev: flat item AP cost; price balancing lands in M-econ-onboarding (cross-link) tgt: M-battle-tactics
- `pt3-2026-10-146` A monster's full turn's worth of action points can be used to make a r — ev: full-turn AP recruit on adjacent wild; bait helps rate not cost; seed-rebuild/weaken-lever rulings stand tgt: M-battle-tactics
- `pt3-2026-10-147` This game's combat system will be one of its cornerstone gameplay elem — ev: cornerstone framing recorded in spec header tgt: M-battle-tactics
- `pt3-2026-10-148` I would like to overhaul this UI and the related battle system more th — ev: risk-promoted; flagship milestone tgt: M-battle-tactics
- `pt3-2026-10-153` I like the control hints located at the bottom of the screen. — ev: recorded; M-ui-foundation constraint tgt: standing preference: control hints kept
- `pt3-2026-10-155` The placeholder sprites and tilesets are extremely basic. They're good — ev: staged placeholder path (style guide -> terrain kit -> look-dev) per research doc tgt: M-world-art-pass
- `pt3-2026-10-156` There is one tile at the bottom of the map that causes the wandering N — ev: CONFIRMED: unmarked warp (5,5)<->(5,5) between byte-identical zones; also elder_oak's home tile - quickfix adds zone-entry cue + moves warp off NPC home tgt: M-pt3-quickfix
- `pt3-2026-10-157` I did not have enough currency to buy anything from the NPC shopkeeper — ev: faucets EXIST (KO-win ~31g, quest 50g, sell 40%) but recruit-dominant play pays NOTHING and rewards are invisible - balance + recruit yields + visibility tgt: M-econ-onboarding
- `pt3-2026-10-158` When a second player joined, their movement was jerky instead of smoot — ev: risk-promoted (net protocol); root cause: gappy authoritative stream (one-in-flight gate + per-tick drain + transient Idle writes) + HOLD-never-extrapolate remote rendering tgt: M-netcode-presence
- `pt3-2026-10-159` - I think this is a flaw in the netcode and the client's predictor.    — ev: operator-ruled design supersedes hold-don't-extrapolate for the REMOTE path only; own-path ADR-0152/0141 machinery untouched; Idle-debounce + <=1-tile cap + staleness timeout per fact-check tgt: M-netcode-presence
- `pt3-2026-10-160` - There's apparently a "water" tile that heals monsters. That has seve — ev: counter-record with evidence: NO water tiles exist; healing is ONE authored landmark (heal_locations/000-core.ron, zone0 (8,3), 30s cooldown) exactly matching his landmark model; the tile just renders as plain grass with no marker tgt: answered in pt3 disposition brief
- `pt3-2026-10-161` As a separate issue, the water tile's placeholder art is indistinguish — ev: heal landmark sprite/signage + real water art with distinct value band (research recipe) tgt: M-world-art-pass
- `pt3-2026-10-162` The map is pretty small. It would be good to have a larger one with mo — ev: larger/more varied authored maps (append-only zone content); gated on terrain kit per his own conclusion tgt: M-world-art-pass
- `pt3-2026-10-163` There is only one map. I need another to test traveling between areas. — ev: refuted with evidence: TWO zones + working warp travel exist; they are byte-identical placeholder maps so travel is invisible - fix = distinct zone art (M-world-art-pass) + transition cue (quickfix 156) tgt: answered in pt3 disposition brief
- `pt3-2026-10-164` - The UI seems like it's following reactive design principles instead  — ev: single-scale-authority policy; genuine integer-vs-smooth conflict with crisp-pixel ruling tgt: M-ui-foundation
- `pt3-2026-10-165` I would like to be able to change the direction I'm facing without act — ev: risk-promoted (movement protocol); tap-to-turn as Turn op through predictor op model + game-core facing rule - NEVER send-step-cancel-on-keyup (ADR-0148 ruled measurably wrong) tgt: M-netcode-presence
- `pt3-2026-10-166` The assets, graphics, and UI will all need an upgrade soon in order to — ev: art upgrade gates further map/story/shader work per his conclusion tgt: M-world-art-pass
- `pt3-2026-10-167` [x] PASS WITH CHANGES — reshape queue per notes below — ev: queue reshaped per PLAN SS9 edit this episode tgt: gate consumed: PASS WITH CHANGES
- `pt3-2026-10-169` In some menus, it is not obvious that the tabs containing different se — ev: tab affordance (visually distinct labels, LB/RB indicators); quickfix CSS is the stopgap tgt: M-ui-foundation
- `pt3-2026-10-170` Making good use of visual elements. For example, horizontal lines, box — ev: visual-elements technique recorded as design-language input tgt: M-ui-foundation
- `pt3-2026-10-171` Making good use of typography. For example, different font sizes (or w — ev: typography technique recorded (bitmap-font integer-scale rules in research) tgt: M-ui-foundation
- `pt3-2026-10-172` Using good layout and organization. For example, having the tab labels — ev: horizontal-tabs-above-content recorded (NN/g-backed) tgt: M-ui-foundation
- `pt3-2026-10-173` Using color, contrast, and value well. For example, a slightly darker  — ev: color/contrast/value state rules recorded (3:1 state indicators) tgt: M-ui-foundation
- `pt3-2026-10-175` I think the menus need to take advantage of shared, re-usable, and mod — ev: shared modular component mandate - the milestone's core tgt: M-ui-foundation
- `pt3-2026-10-176` I have found some libraries that might be useful for improving the UI. — ev: all 8 libraries vetted with use/avoid/defer verdicts; summarized in brief + pt3-ui-policy tgt: docs/research/pixijs-ecosystem-ui-and-assets.md
- `pt3-2026-10-177` `@assetpack/core`: This tool organizes, packages, and loads assets eff — ev: nothing to pack while art is procedural; pixel-art-hostile defaults; revisit at M-world-art-pass asset volume tgt: vetted: DEFER (assetpack)
- `pt3-2026-10-178` `@pixi/react`: A thin wrapper around Pixi.js, allowing it to be expres — ev: client is imperative TS with no React; reconciler would be a second scene-graph owner tgt: vetted: AVOID (@pixi/react)
- `pt3-2026-10-179` `@pixi/layout`: Built on top of Facebook's Yoga Flexbox layout engine, — ev: only pays off if UI moves in-canvas; DOM overlay (current architecture) does flexbox natively tgt: vetted: DEFER (@pixi/layout)
- `pt3-2026-10-180` `@pixi/ui`: A library that contains commonly used UI components, that  — ev: no a11y story, no gamepad/spatial focus - conflicts with shipped DOM a11y stack tgt: vetted: AVOID as menu foundation / DEFER for HUD (@pixi/ui)
- `pt3-2026-10-181` `@pixi/tilemap`: This package provides a low-level rectangular tilemap — ev: open v8 bugs incl. roundPixels ignore; plain sprites + atlas suffice at current map sizes tgt: vetted: DEFER (@pixi/tilemap)
- `pt3-2026-10-182` `pixi-filters`: An extensive collection of high-performance effects in — ev: AdvancedBloom/Godray/ColorMap LUT serve the 2D-HD path; profile-gated; wired into M-world-art-pass S2 tgt: vetted: USE selectively (pixi-filters)
- `pt3-2026-10-183` `@pixijs-userland/spine-layout`: A spine composition framework built o — ev: days-old repo, 1 star, no license, npm publication unconfirmed tgt: vetted: AVOID (@pixijs-userland/spine-layout)
- `pt3-2026-10-184` Spine Runtimes: The Spine Runtimes which are needed to use Spine 2D sk — ev: requires paid per-seat Spine Editor license (License SS2.1(b)); conflicts with open-source non-commercial repo; frame spritesheets are the path tgt: vetted: AVOID (Spine Runtimes)
- `pt3-2026-10-185` Work needs to be done immediately to overhaul and redesign the battle  — ev: battle overhaul is the first post-quickfix milestone tgt: queue reshaped: quickfix -> battle overhaul ordering in PLAN SS9
- `pt3-2026-10-186` After that, milestones should be created to address all the other issu — ev: next-playtest timing question in pt3-battle-scope tgt: 8 milestones drafted covering every Bad-section cluster; listed in brief

## Logged remarks (31)
- `pt3-2026-10-023` I conducted the playtest by running the `just playtest-up` command and — ev: — tgt: —
- `pt3-2026-10-024` The main menu has a header that is visually distinct from the menu ite — ev: — tgt: —
- `pt3-2026-10-026` The main menu highlights which menu item is currently selected. — ev: — tgt: —
- `pt3-2026-10-027` Navigation works as intended with both the mouse and the virtual butto — ev: — tgt: —
- `pt3-2026-10-029` It is a little basic and bare-bones, but it is functional and works as — ev: — tgt: —
- `pt3-2026-10-032` The `Party & Box` menu makes a minimum effort (could be better) to vis — ev: — tgt: —
- `pt3-2026-10-033` The sub-menus for interacting with the player's current party and thei — ev: — tgt: —
- `pt3-2026-10-034` The tab labels are arranged horizontally, as expected. — ev: — tgt: —
- `pt3-2026-10-035` Navigation works as intended with both the mouse and the virtual butto — ev: — tgt: —
- `pt3-2026-10-056` The `Raising & Inventory` menu makes a minimum effort (could be better — ev: — tgt: —
- `pt3-2026-10-057` Pressing the `care` button on this page shows a message with feedback  — ev: — tgt: —
- `pt3-2026-10-067` It is functional and works, but has a worse overall design than the `P — ev: — tgt: —
- `pt3-2026-10-075` I could not confirm that it was functional and its design was lacking  — ev: — tgt: —
- `pt3-2026-10-076` The tabs in the full-screen version of the menu seem to be aligned hor — ev: — tgt: —
- `pt3-2026-10-077` Challenges, active trades, player rankings, and nearby players show up — ev: — tgt: —
- `pt3-2026-10-095` The menus are readable and functional. — ev: — tgt: —
- `pt3-2026-10-105` It still feels like the layout of each menu is subtly different from a — ev: — tgt: —
- `pt3-2026-10-106` The menus are readable and functional. — ev: — tgt: —
- `pt3-2026-10-118` Similar issues as the other menus, still needs some polish work. — ev: — tgt: —
- `pt3-2026-10-119` *(The duplicated `Swap` entry and the overlapping `Run`/`Flee` entries — ev: — tgt: —
- `pt3-2026-10-120` The menu is readable and functional. — ev: — tgt: —
- `pt3-2026-10-123` All the necessary actions are present. — ev: — tgt: —
- `pt3-2026-10-124` Invalid actions (like `Bag` when you don't have any items) are visuall — ev: — tgt: —
- `pt3-2026-10-125` All currently built features are working and I can battle and recruit  — ev: — tgt: —
- `pt3-2026-10-149` I think there's potential for great synergy between the tactical RPG a — ev: — tgt: —
- `pt3-2026-10-150` The map has enough placeholder assets that I can test most of the curr — ev: — tgt: —
- `pt3-2026-10-151` I can walk around while finding, battling, and recruiting monsters. — ev: — tgt: —
- `pt3-2026-10-152` The virtual buttons are working well. — ev: — tgt: —
- `pt3-2026-10-154` The map reacts to changes in the window size, scaling when the window  — ev: — tgt: —
- `pt3-2026-10-168` Overall, this was a significant improvement over the previous playtest — ev: — tgt: —
- `pt3-2026-10-174` The UI is already changing the background color to designate what is c — ev: — tgt: —

**Reconciliation: 186 items in episode, 186 accounted.**
