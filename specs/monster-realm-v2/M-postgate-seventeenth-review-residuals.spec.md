# M-postgate-seventeenth-review-residuals — verified seventeenth-review findings

**Review ordinal:** 17 (weekly generate-improvement-plan) · **Pinned SHA:** `e112ce6d8fc46fd47f0ab0d2334cc744905fe442` · **Review UTC:** 2026-08-28T18:09Z
**Provenance:** standard multi-lens review of the `064e627..e112ce6` delta (M23 a11y s0-s11,
M22 privacy s0-s2, roster wave 3, 16r fixes, rb-1/2/3, nightly coverage restoration) plus
bounded full-repo sweep. 8 sonnet lenses, 0 lens contradictions, 2 independent verifier
agents re-checked all 11 reported claims (10 CONFIRMED, 1 PARTIAL-confirmed with corrected
wording, 0 dropped). Drew decision issue #342 (rev16-obs48-procedures) was answered and is
CONSUMED by this review (closed 2026-08-28); its ruling ships as 17r-c.

## 1. Why this milestone exists

The delta is structurally clean where it matters most: the server security/privacy,
test-integrity, and game-core rigor lenses each returned an explicit "no findings" (the M22
manifest census is genuinely live-source-scanned; the nightly coverage restoration is real
and guarded; roster wave 3 honors every band/STAB/graph invariant). What remains is ONE
high-severity wiring gap — the entire M23 reduced-motion feature is inert in production —
plus the disclosed-but-untracked class (ADR-0130's two reconnect residuals, ADR-0206's
requested spec amendment, a flagged-but-unowned stale comment) and Drew's answered OBS-48
ruling, which needs its enforcement site converted.

## 2. Slices (ROI order)

### 17r-a — wire reduced-motion into the render loop (HIGH a11y product defect, LIGHT)
touches: client/src/main.ts, client/src/main.wiring.test.ts
after: []
- `motionPreferenceFromWindow()` (client/src/render/motionPreference.ts:71) has ZERO
  production callers (exhaustive grep; only its own test file). `resolver.resolve({...})`
  at main.ts:2807 never passes `reduceMotion`; `ResolveInput.reduceMotion`
  (renderResolver.ts:63, default false at :83) is therefore permanently false — both
  reduced-motion render paths (own-entity snap arm, `interpolateReducedMotion` for
  remotes) are dead code in the shipped client. S7's own module header names S5 as the
  wiring site, but s5 (3e062c4) landed BEFORE s7 (20c8933) and nothing closed the
  contract afterward. `evals/reduced-motion-purity.eval.mjs` checks matchMedia
  ownership/purity only — it structurally cannot see this gap.
- Fix: instantiate `motionPreferenceFromWindow()` once at module scope near
  `const resolver = new RenderResolver(STEP_MS)` (~main.ts:239); add
  `reduceMotion: motionPreference.reduceMotion` to the resolve call at ~2807.
- EARS: WHEN the OS reports `prefers-reduced-motion: reduce` THE render loop SHALL pass
  `reduceMotion: true` into `RenderResolver.resolve` on every frame; WHEN `reduceMotion`
  is true THE own entity SHALL render at the predicted tile without slide animation AND
  remote entities SHALL render authoritative tiles without interpolation (unit-covered
  already — the new test pins the WIRING, not the resolver).
- Tests: new `main.wiring.test.ts` case stubbing `window.matchMedia` (`matches: true`),
  driving a frame, asserting `reduceMotion: true` reached the resolver — authored from
  these criteria by a different agent than the implementer.

### 17r-b — ADR-0130 reconnect residuals (d)+(e) (MED netcode-telemetry + latent identity bug, MED)
touches: client/src/net/connection.ts, client/src/main.ts, client/src/main.battle-reseed.test.ts
after: [17r-a]  # shares client/src/main.ts — serial by construction
- (d) ADR-0130:273-275 (disclosed 2026-08-22, tracked NOWHERE): `my_battle` is
  `Vec<Battle>` (schema.rs:428-441) and Battle rows are Anonymize-policy (never deleted),
  so ≥2 rows can hydrate across flushes; the 16r-f latch (main.ts:1791-1817) resolves on
  the FIRST defined `latestPlayerBattle()` read against a single `reseedPrevBattleId` —
  an older row observed first burns the latch and the surviving battle still emits a
  spurious `battleStart` into the event ring/F9 bundle. T1-T10 in
  main.battle-reseed.test.ts do not cover wrong-row-first hydration.
  Fix (the ADR's own proposal): resolve the latch on a subscription-applied /
  hydration-complete signal from connection.ts (or a hydration-generation counter), not
  "first defined read".
- (e) ADR-0130:276-278 (disclosed, "Flagged for a follow-up slice", tracked NOWHERE):
  connection.ts:659 reassigns the module-local identity on EVERY connect, but
  `opts.onReconnect()` (connection.ts:699) passes no identity and main.ts only assigns
  `identity` in `onReady` — an identity rotation across reconnect silently deafens every
  identity-gated listener (including the 17r-b latch listener itself).
  Fix: `onReconnect(identity: string)`; main.ts reassigns its module-local `identity`.
- EARS: WHEN a reconnect's first non-empty flush contains only rows other than the
  surviving battle THE reseed latch SHALL NOT resolve until hydration-complete is
  signalled AND the event ring SHALL NOT receive a spurious battleStart; WHEN a
  reconnect completes THE module-local identity in main.ts SHALL equal the SDK identity
  of the new connection.
- Tests: new battle-reseed case "stale terminal row hydrates before the survivor"
  (repro sketch in ADR-0130/review report); identity-refresh unit case in the same file.

### 17r-c — OBS-48 softened to require-justification (Drew ruling via issue #342, MED policy, LIGHT-MED)
touches: evals/observability-log-wrapper.eval.mjs, docs/adr/, docs/spacetimedb-2.8.1-upgrade-runbook.md
after: []
- Drew's answer on mdrewt/monster-realm#342 (2026-08-28, consumed+closed by review 17):
  OBS-48's blanket forbid is a vast overstatement — soften to require-justification.
  General policy (record it): whenever a version bump promotes an unstable feature to
  stable (or adds a new stable feature), that feature is available to improve the design
  wherever genuinely useful, used as intended — for ANY dependency, not just SpacetimeDB.
- Deliver: amend ADR-0180 D14 (+ cross-refs in ADR-0197 and runbook:167's
  re-adjudication note) recording the ruling and citing the issue URL; convert eval
  check A9 (the SOLE mechanical enforcement site — lines 1556-1583: blanket literal
  "unstable" ban across the 6 WORKSPACE_MANIFESTS + `spacetimedb::procedure` ban in
  server-module/src) into a justification-manifest gate: a use passes iff a committed
  manifest entry carries a written justification; an unjustified use still FAILS
  (proof-of-teeth fixture both ways). Leave `.claude/skills/spacetimedb-reducer`'s RLS
  "avoid unstable" advice untouched — it is a separate, still-accurate claim.
- Supervisor doc-follow-up (harness repo, outside this slice's touches, rb-2 precedent):
  reword M20-observability-performance.spec.md OBS-48 (:551-553) to require-justification.
- EARS: WHEN a workspace manifest enables an unstable feature or server-module defines a
  procedure WITHOUT a matching justification entry THE eval SHALL fail; WHEN a justified
  entry exists THE eval SHALL pass and surface the justification in its detail; WHEN a
  reader consults ADR-0180/0197/runbook THE recorded policy SHALL be
  require-justification citing issue #342.

### 17r-d — M23 spec A11Y-19/§2.3/§8.4 amendment per ADR-0206 A1 (LOW doc-drift, LIGHT; harness repo)
touches: specs/monster-realm-v2/M23-accessibility.spec.md
after: []
- ADR-0206:259 explicitly requests this supervisor-side amendment; the spec still carries
  pre-Amendment-A1 wording (§2.3:205, §8.4 item 4, A11Y-19:575 "SHALL NOT open or
  toggle") while the shipped code exempts the toggle-CLOSE half at all 12 hotkey guard
  sites (main.ts:1151-1348, `?.visible || worldHasFocus()`). Verified tracked NOWHERE
  (residual ledger, backlog spec, any slice). rb-1/RW3-08 is the precedent for closing
  criterion-text drift.
- EARS: WHEN M23's §2.3/§8.4/A11Y-19 are read THE text SHALL state the ADR-0206 A1
  self-open exemption (the world-focus gate applies to cross-overlay OPEN transitions;
  same-key toggle-close is exempt) AND SHALL cite "ADR-0206 Amendment A1".
- Tests: doc-only; harness-side, no project CI impact.

### 17r-e — comment-truth micro-sweep (LOW, LIGHT)
touches: client/src/ui/overlayA11y.ts, game-core/content/species/070-wave3.ron, game-core/content/species/071-wave3-derived.ron, evals/playtest-report.eval.mjs
after: []
- overlayA11y.ts:52-53 claims the four `#app` views "share ONE root … CLOSE-BEFORE-OPEN"
  — false (four distinct roots; pinned by `S4-CROSS-VIEW-DISTINCT-ROOTS` in
  boxView.test.ts; ARCHITECTURE.md:1680 flags this very comment for "whoever next opens
  that file" — i.e. disclosed-but-untracked). Correct it to the true shape.
- 070-wave3.ron:17 "Electric resists nothing but its own mirror" — type_chart.ron:25
  has Water→Electric at 0.5x; Electric resists itself AND Water. Correct the claim.
- 071-wave3-derived.ron:36 "Tempestrix owns the Regeneration pivot" — Sproutlet
  (000-core.ron:24) and Stoneward (020-playtest-wave1.ron:64) also carry ability 3.
  Reword to an accurate rationale.
- playtest-report.eval.mjs:47,1358,1393,1419 "EXPECTED RED until the … tightening lands"
  — the coerceRow tightening (scripts/playtest-report.mjs:109-154) landed; both fixtures
  verified GREEN by direct execution. Drop the stale qualifiers (incl. the Section-3
  summary echo at ~:1861 if worded to match).
- EARS: WHEN each cited comment is read THE claim SHALL match the code/content it
  describes. Comment-only; `just ci` green.

### 17r-f — frame-loop errors reach pushError/F9 (LOW-MED observability, LIGHT)
touches: client/src/main.ts, client/src/main.wiring.test.ts
after: [17r-b]  # tail of the shared-main.ts serial chain
- frame()'s catch (main.ts:2891-2892) only `console.error`s; the window
  error/unhandledrejection listeners (:732-733) route to `pushError` (:708), which
  renders the error overlay and feeds the F9 bundle. The M23 a11y block (:2771-2782,
  incl. `t('a11y.world.region')`, designed to throw on a catalog miss) now sits inside
  that swallow zone — contradicting overlayA11y.ts's own loud-failure doctrine (:47-49).
  On a self-hosted deployment nobody tails browser consoles.
- Fix: have the catch also call `pushError('uncaught', err)` (or add a 'frame' source
  variant); KEEP the `finally { requestAnimationFrame(frame) }` re-arm.
- EARS: WHEN the frame loop throws THE error SHALL appear in the error overlay/ring and
  the F9 bundle AND the loop SHALL re-arm on the next frame.
- Tests: wiring case forcing a throw inside the frame body, asserting pushError surfaced
  it and the loop re-armed.

## 3. Sequencing & fan-out

Serial chain 17r-a → 17r-b → 17r-f (all touch client/src/main.ts; `after:` encodes the
real dependency — 17r-b's latch listener reads the identity 17r-b(e) fixes, and 17r-f's
catch change would collide textually with both). 17r-c, 17r-d, 17r-e are pairwise
disjoint from each other and from the chain (touches:-verified by inspection; no
mr-disjoint run recorded — advisory only). 17r-d is harness-repo doc-only; the rest are
project-repo.

## 4. Decisions

- NONE opened this cycle. mdrewt/monster-realm#342 (rev16-obs48-procedures) was answered
  by Drew and CONSUMED by this review (closed with the mr-system comment 2026-08-28);
  its ruling is implemented by 17r-c. Reversible calls this review made itself are
  recorded as decision-defaulted entries in the handoff.

## 5. Explicitly NOT in scope

- CHANGELOG.md staleness (lag=35 entries / 6.5d at the pinned SHA, gate threshold
  15 AND 6d): the nightly `changelog-freshness` job + ADR-0203 red-response policy
  already own this failure class and its remedy (`just changelog`); adding a slice here
  would double-track it. Recorded for visibility only.
- ADR-0196 optional follow-ups #1/#4 — still optional per 16r-c's recorded disposition.
- The "M22-privacy-compliance.spec.md cited but absent from the project tree" note from
  the security lens: the spec legitimately lives in the harness corpus (multi-repo
  convention, AGENTS.md documents it) — not a defect.
- All open residual-ledger items (R-m22-*, R-m23-*, R-rb-*): tracked, excluded by the
  review's exclusion set; nothing here duplicates them.

## 6. Notes for the runner

- Insertion point: PLAN §9, directly after `M-postgate-sixteenth-review-residuals`.
- 17r-b(d)'s severity is bounded to telemetry correctness (event ring/F9), not gameplay
  state — the battle overlay reads independent state. Do not escalate it on merge.
- 17r-c's eval conversion is a GATE change on a security-adjacent surface — treat as the
  slice most deserving of adversarial diff-read at merge (a lenient manifest schema
  would neuter A9 silently).
- Verification provenance: every path:line above was confirmed at the pinned SHA by an
  independent verifier that did not author the finding (review 17, 2026-08-28).
