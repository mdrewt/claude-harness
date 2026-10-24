# Spec: M-netcode-presence — remote-player smoothness + movement feel (SKETCH)

**Status:** sketch, 2026-10-24 (Playtest-3 processing). Elaborate with `milestone-loop-prompt.md`
when PLAN §9 reaches it, against the CURRENT game repo · **Project:** monster-realm ·
**Depends on:** nothing queued (client render/input + one small server/game-core seam); runs
independently of the menu/UI wave. **Sequencing:** correctness BEFORE feel — the July ruling
(`playtest-feedback-2026-07.md`, movement-feel tuning scheduled after correctness) applies again:
NPC wander cadence lands in M-pt3-quickfix (NOT here) and walk-speed tuning (R-ctl-RUN) stays
parked until this milestone's slices land. Anchors below are **symbols, not lines**; line numbers
are orientation as of 2026-10-24.

**Feedback items:** pt3-2026-10-158, pt3-2026-10-159, pt3-2026-10-165.
**Absorbs residuals:** R-weekly-review-2026-10-02-F1 (pre-battle move_queue self-executes),
R-weekly-review-2026-10-23-F2 (reconnect backoff frozen rung) — bundled as np-d, final
bundling call at elaboration. **Cross-links (NOT absorbed):** R-ctl-RUN (walk speed /
hold-to-run — feel-tuning, explicitly AFTER this milestone).

## Problem / intent

Two presence-quality defects the operator ruled on directly:

1. **Remote players render jerky** — pausing on every tile — while own-player movement is
   smooth (item 158). Root cause is two stacked causes (fact-check vs the game repo): the
   one-in-flight send gate (`predictor.outstandingSteps === 0` before the held-key loop
   re-issues, `client/src/main.ts` held-continuation block; `predictor.ts` "bounds the
   pipeline to one in-flight step") plus the server's one-move-per-tick drain with transient
   `action = Idle` writes between steps (`server-module/src/movement.rs`, `movement_tick`
   drain) make the AUTHORITATIVE row stream for a continuously walking character inherently
   gappy; and the remote renderer deliberately HOLDs at the newest snapshot
   (`client/src/render/interpolation.ts` — "Past the latest snapshot we HOLD — never
   extrapolate"), with the idle-gap re-anchor (`REANCHOR_SPAN_STEPS`) rendering longer gaps
   as stand-then-hop. Every gap becomes a visible pause.
2. **No way to turn in place** (item 165, directive): interaction targets the faced tile
   (`DECISIONS.md` "Interaction target": `pos.step(facing)`), so players must be able to face
   a tile without stepping onto another one. Operator design: a press turns when not facing,
   steps when already facing; a quick tap turns without walking; a hold turns then walks.

The operator's extrapolation proposal (item 159) is an explicit ruling that **supersedes the
"hold rather than extrapolate" DECISIONS entry for the REMOTE render path only** — with his
own bounds: server stays truth, short window keyed to update recency, then settle to idle.
The own-player machinery is untouched. The research library agrees with the bounded shape:
dead reckoning is "best limited to the fill-in window between two late packets, not as the
primary display strategy" (`docs/research/netcode-authoritative-multiplayer.md` §4).

## Scope (sketch)

- **np-a** — bounded continuation extrapolation on the remote render arm (operator-ruled).
- **np-b** — send-pipeline depth **study** (optional; evidence + go/no-go, not a committed
  behavior change): smoothing the authoritative stream itself for all viewers.
- **np-c** — tap-to-turn / turn-in-place as a first-class game-core facing rule + predictor
  op (operator directive).
- **np-d** — bundled movement-pipeline hygiene: the two absorbed residuals above.

## Non-goals

- Own-player prediction changes: epoch guard + send-seq floor (ADR-0152), own-path
  divergence snap (ADR-0141), `MOVE_QUEUE_CAP`, op-based replay — all stand unmodified.
- Remote **zone-warp** prediction: warps resolve server-side only (standing ruling); an
  extrapolated remote character never crosses a zone edge client-side.
- NPC wander cadence / pause-per-tile / freeze-mid-conversation: M-pt3-quickfix owns it.
- Feel-tuning: walk speed, hold-to-run (R-ctl-RUN), STEP_MS retuning — after this lands.
- Scaling/presentation, interest management, transport/protocol changes.

## Prior rulings that BIND the design

- **ADR-0148 (nh2):** send-step-then-cancel-on-keyup was measured wrong (backward teleport).
  np-c MUST be a Turn op before the first step, never a cancelled step.
- **ADR-0146 (nh1):** `e.repeat` stays ignored; refcounted virtual D-pad edges; every push of
  a non-base frame clears the held set. np-c keeps all three.
- **ADR-0152 / ADR-0141:** remote smoothing is render-side; it must not touch predictor
  epoch/seq or the own-path snap rule. Keep the two paths architecturally separate.
- **Rules-once / determinism:** the facing rule (when a press turns vs steps, turn duration)
  lives once in game-core, integer, deterministic, seeded; client predicts via wasm.
- **Additive-only schema; generated-only bindings:** any reducer/arg change regenerates
  bindings (flagged below); schema changes are append-only.
- **Trade/battle interlocks and movement gates** (`movementEnabled`, battle locks in
  `movement.rs` intake + drain) are consumed as-is.

### np-a — remote continued-walk extrapolation (bounded, recency-keyed)
category: netcode-render (operator-ruled design) · severity: HIGH (perceived quality) · size: MODERATE
touches (sketch): client/src/render/interpolation.ts, client/src/render/renderResolver.ts,
client/src/render/config.ts, client/src/net/store.ts, their test files, docs/DECISIONS.md

- Placement (fact-checked): the remote arm of `RenderResolver.resolve` + `interpolation.ts`
  only. `StoreCharacter` already carries `action`/`facing`/`moveStartedAtMs` (store.ts).
- **TRAP (load-bearing):** the server writes transient `action = Idle` between steps of the
  gappy pipeline (`movement_tick` drain). Naive "last action was walking" extrapolation dies
  mid-walk. The continuation predicate MUST key off **row-update recency** (position-update
  freshness, debouncing transient Idle), not the raw `action` field — the operator's timeout,
  applied to row updates.
- **TRAP (nh2 class):** `shouldSnap` in store.ts only snaps >1-tile corrections, so a 1-tile
  wrong-direction overshoot would glide BACK — a backward-teleport look-alike. The correction
  rule for extrapolated overshoot needs its own snap-or-fast-converge arm.
- **NPA.1:** WHILE a remote character's row updates show walking within the recency window,
  WHEN the interpolation buffer runs past the newest snapshot, THE CLIENT SHALL continue the
  walk in the last authoritative direction, bounded to at most 1 tile beyond the newest
  authoritative tile AND never onto a tile the game-core walkability check (wasm) rejects
  (cap-and-check both, unless elaboration proves one bound sufficient — see Open decisions).
- **NPA.2:** WHEN no row update arrives within the staleness window, THE CLIENT SHALL settle
  the character to idle at the newest authoritative position (extrapolation ends; the
  operator's treat-as-idle rule).
- **NPA.3:** WHEN an authoritative update contradicts the extrapolated position or direction,
  THE CLIENT SHALL converge to server truth without rendering a glide-back longer than the
  overshoot bound (direction-change corrections snap or fast-converge; never the v1
  rubberband).
- **NPA.4:** Transient Idle rows between steps of a continuous walk SHALL NOT terminate the
  continuation (recency-keyed debounce), and a genuine stop SHALL settle within the window.
- **NPA.5:** THE own-player path SHALL be untouched: predictor, epoch/seq (ADR-0152),
  own-path snap (ADR-0141) — their existing suites stay green unmodified; no extrapolation
  ever predicts a remote zone warp.
- `docs/DECISIONS.md` "Remote interpolation" entry superseded in place: HOLD stays the rule
  outside the recency window; bounded continuation inside it; cite item 159.
- Acceptance sketch: unit tests on the interpolation arm (gap spans with/without recency);
  a two-context e2e (ADR-0115 precedent) where one client holds a walk and the other asserts
  the remote sprite advances without per-tile pauses.

### np-b — send-pipeline depth (STUDY; flagged optional)
category: netcode-supply (study) · severity: MED · size: SMALL-MODERATE (evidence first)
touches (sketch): instrumentation only until go/no-go; then client/src/prediction/predictor.ts,
client/src/main.ts (held-continuation gate), their tests

- Question: deepening the one-in-flight gate (`outstandingSteps === 0` → e.g. `<= 1`;
  `MOVE_QUEUE_CAP` = 2 already allows one banked move) would smooth the AUTHORITATIVE stream
  for ALL viewers and shrink how much extrapolation np-a ever does — attacking the supply-side
  cause, not the symptom.
- **Hard constraint:** the gate bounds the press-phase teleport fix (88% → ~2%). Any depth
  change MUST re-measure that metric and preserve the fix, or it does not ship.
- Deliverables: measured span distribution of the authoritative stream for a held walk at
  depth 1 vs depth 2 (playtest harness), teleport-metric re-run, and a go/no-go write-up. If
  the tradeoff is real rather than dominated, raise it as an mr-ask-drew decision instead of
  deciding silently.

### np-c — tap-to-turn: facing is a rule, a press turns before it steps
category: movement/input (operator directive, item 165) · severity: HIGH · size: MODERATE-HEAVY
touches (sketch): game-core/src (facing/turn rule), server-module/src/movement.rs (turn
intake), client/src/prediction/predictor.ts + heldKeys.ts, client/src/main.ts, generated
bindings (REGEN FLAGGED), their tests, docs/DECISIONS.md

- Operator design: press turns when not facing; steps when already facing; a quick tap turns
  without walking; a hold turns, then walks. Facing must reach the SERVER because
  `interact_candidates` reads the server-side faced tile.
- Implement as a **Turn op through the predictor op model** (alongside Enqueue/SetMove/Clear)
  + a game-core facing rule (turn duration as an integer game-core constant) + a reducer path
  for facing-only changes (new reducer or additive arg — Open decisions) — **NEVER** as
  send-step-then-cancel-on-keyup (ADR-0148: measurably wrong, backward teleport).
- Amends the "Held keys" DECISIONS entry's "a press sends one step immediately" for the
  not-facing case only; the smoothness-contract pins (BOOT-MOVE/14R-E family) are amended
  deliberately and re-pinned, not silently broken.
- **NPC.1:** WHEN the player presses a direction they are not facing, THE CLIENT SHALL
  predict and send a Turn (facing change only) and SHALL NOT enqueue a step for that press.
- **NPC.2:** WHEN the player presses a direction they already face, THE CLIENT SHALL step
  immediately (today's behavior, preserved).
- **NPC.3:** WHILE a direction is held from a non-facing start, THE CLIENT SHALL turn and
  then begin walking without a re-press (held continuation picks up after the turn).
- **NPC.4:** WHEN a tap-turn completes and the player interacts, THE interaction SHALL target
  the newly faced tile on the server (facing round-trips; no client-only facing state).
- **NPC.5:** THE standing input guardrails SHALL hold: `e.repeat` ignored, refcounted edges,
  held-clear-on-frame-push, no cancel-on-keyup anywhere in the turn path; nh1/nh2 pins green.
- Acceptance sketch: game-core unit tests for the facing rule; predictor op replay tests for
  Turn; an e2e: tap (turn only) → tap again (step) → face NPC → interact hits the faced tile.

### np-d — movement-pipeline hygiene (bundled residuals)
category: netcode-determinism · severity: MED · size: SMALL (two contained fixes)
touches (sketch): client/src/prediction/predictor.ts or main.ts (queue clear on battle push),
client/src/prediction/reconnectPolicy.ts + client/src/net/connection.ts, their tests

- **NPD.1** (R-weekly-review-2026-10-02-F1): WHEN a battle base is pushed, THE CLIENT SHALL
  clear the pending move queue (client `clearQueue` + server-side queue disposition per the
  residual's analysis), so queued pre-battle steps never self-execute after the battle ends.
- **NPD.2** (R-weekly-review-2026-10-23-F2): WHEN a connection opens and then drops before
  the first applied subscription, THE CLIENT SHALL still advance the reconnect backoff rung
  (no frozen 1s retry hammering a restarting host).
- Elaboration may split NPD.2 out (connection-layer, not render) if `touches:` disjointness
  favors it; name the move in the PLAN note if so.

## Risks / open decisions

- **Open (np-a):** extrapolation bound — 1-tile cap, wasm walkability check, or both. Default
  in NPA.1 is both (conservative); elaboration may relax with evidence. Design freedom, not
  an operator block.
- **Open (np-a):** staleness/recency window length — derive from existing vocabulary
  (`JITTER_IDLE_GAP_STEPS` = 3, adaptive delay bounds) rather than a new magic number.
- **Open (np-c):** transport for the Turn — additive arg on the existing enqueue path vs a
  new facing reducer; either way bindings regenerate (generated-only) and schema stays
  additive. Also: does the turn duration reuse `HOLD_COMMIT_MS` (150 ms, client constant) or
  a new game-core integer constant? Rules-once says game-core owns it.
- **Open (np-b):** ship-or-close is evidence-gated; if genuinely contested, mr-ask-drew — no
  slug exists yet; do not merge a depth change on study evidence alone.
- **Risk:** np-a reverses a codified invariant (interpolation.ts header comment). The
  DECISIONS supersede-in-place and the header comment must land in the same slice as the
  behavior, or the docs lie.
- **Risk:** np-c touches the most regression-prone area of the game (nh1/nh2/ADR-0152
  history). Elaborate with the full pin inventory before coding; any `touches:` widening is a
  hidden-dependency STOP.
- i18n: no new UI strings expected; if a hint-bar or help string appears (e.g. turn-in-place
  in How to Play), it goes through the typed catalog (en+fr) like everything else.

## Post-integration verification (sketch)

Full `just ci` green; bindings-drift = 0 after np-c's regen; schema snapshot intact; the
two-context e2e green; one manual playtest pass with two clients confirming: remote walker
smooth under a held key, tap turns / tap-again steps, no backward teleport on direction
change, pre-battle queue does not self-execute. Record in the PR per house practice.
