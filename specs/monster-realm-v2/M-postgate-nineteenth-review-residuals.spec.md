# M-postgate-nineteenth-review-residuals — verified nineteenth-review findings

**Review ordinal:** 19 (weekly generate-improvement-plan) · **Pinned SHA:** `9434dfb5dfa60140e2d46b1aef561eea858b0563` · **Review UTC:** 2026-09-11T00:39Z
**Provenance:** standard multi-lens review of the `1e738fd..9434dfb` delta (rb-40..rb-72
residual-backlog fixes incl. the M22 privacy completion surface rb-46/47/48/51/52/53, a11y
rb-9/rb-56..59, 18r-a/b, 17r-e/f) plus bounded full-repo sweep. 8 sonnet lenses, 0 lens
contradictions, 2 independent verifier agents re-checked all 4 reportable claims (4 CONFIRMED,
one with a minor line-citation correction; 0 dropped). Zero decision issues opened this cycle
(nothing rose to a Drew-level call; all findings are mechanical and reversible).

## 1. Why this milestone exists

The delta is structurally clean where it matters most: the server security/privacy lens
returned an explicit "no findings" across the whole rb-46/47/48 deletion-gate + reaper surface
(gate placement, stamp-boundary semantics, private-table classification, terminal-line
placement all verified); schema changes are strictly additive (one new scheduled table); no
test was weakened, skipped, or `.only`'d anywhere in the delta; the spec-vs-code lens confirmed
the closure claims of rb-46/47/48/51/52/53/9 are genuinely satisfied; the dependency delta is
empty and the M8.9 module boundaries hold. What remains: ONE medium view-model defect in the
new privacy UI (the delete-confirm control presents as live while another request is in flight
and the click is silently swallowed — the same "looks live but is refused" class 18r-a fixed at
the model layer), one disclosed-but-untracked observability gap (the two rb-65 audit events
have no dashboard/rule consumer and the ADR pins the gap to a residual that rb-66 closed for a
different event), and two small truth fixes (a stale "last statement" invariant claim in
ADR-0238/ARCHITECTURE.md, and an unthrottled per-frame recomputation in the countdown HUD).

## 2. Slices (ROI order)

### 19r-a — privacy view-model: the delete-confirm control must not present as live while a request is in flight (MED state-machine/UI, LIGHT)
touches: client/src/ui/privacyBanner.ts, client/src/ui/privacyView.ts, client/src/ui/privacyBanner.test.ts, client/src/ui/privacyView.test.ts
after: []
- Evidence @ 9434dfb: `buildPrivacyViewModel` gates `deleteEnabled`/`cancelEnabled`/
  `exportEnabled` on `state.inFlight === 'none'` (privacyBanner.ts:330-332) but computes
  `confirmPrompt` from `state.confirm === 'delete-armed'` alone (:333); privacyView.ts:182-189
  derives the confirm buttons' enablement purely from `vm.confirmPrompt !== undefined`. The
  state `{confirm:'delete-armed', inFlight:'export'}` is reachable (account-changed →
  delete-requested → export-requested; the export arm passes `confirmOnDelivery=state.confirm`
  through by design). Clicking "Confirm deletion" then hits `begin()`'s busy guard
  (privacyModel.ts:237-244) → `{next: state, effect:'none'}`: no reducer call, no notice — the
  exact "a control that looks live but is refused teaches the player the client is broken"
  defect buildPrivacyViewModel's own comment forbids. The MODEL layer is correct and
  deliberately pinned (S8T-DELETE-INFLIGHT-REFUSED asserts the armed confirmation survives);
  the defect is confined to the view-model/DOM presentation. No existing test combines the
  confirm control with a busy `inFlight` (verified across privacyBanner.test.ts,
  privacyView.test.ts, main.privacyWiring.test.ts — RB52C-ENABLED-MIRRORS-PERMISSIONS
  deliberately filters to `inFlight === 'none'` and covers only the three action buttons).
- EARS: WHEN `state.confirm` is `'delete-armed'` AND `state.inFlight` is not `'none'`, the
  rendered delete-confirm affordance SHALL NOT present as actionable (disabled or hidden — the
  slice chooses the shape and documents it), AND the armed confirmation SHALL remain armed, AND
  the disarm affordance ("Keep my account", a pure local transition with no server round-trip)
  SHALL remain actionable. WHEN the in-flight request settles with the confirmation still
  armed, the confirm affordance SHALL present as actionable again without re-arming.
- Failing-test seed (fails today): derive state via `privacyStep` (account-changed →
  delete-requested → export-requested), then assert the view model does not offer an actionable
  confirm (`buildPrivacyViewModel(state).confirmPrompt` — or the slice's replacement field —
  must not render an enabled "Confirm deletion").

### 19r-b — recording rules + panels for the rb-65 audit events (MED observability/compliance, LIGHT)
touches: ops/observability/rules/recording.rules.yml, ops/observability/grafana/dashboards/monster-realm.json, ops/observability/checks/stack-config-checks.mjs, ops/observability/checks/stack-config-checks.redteam.test.mjs, docs/adr/0243-cascade-and-export-purge-observable.md
after: []
- Evidence @ 9434dfb: server emits `evt=account_deletion_cascade` (accounts.rs:1068,
  account_deletion_reaper) and `evt=data_export` (privacy.rs:1571, request_data_export) —
  the two audit-critical signals of the M22 privacy machinery. recording.rules.yml carries
  rules only for `reject`/`chat`/`heartbeat`/`guest_claim_export_purge`; the dashboard has no
  panel for either evt. ADR-0243:209 discloses the gap but pins it to `R-rb-40-DASH`, which
  rb-66 (#450) CLOSED — for `guest_claim_export_purge` only. No open residual covers these two
  events (verified against the gates ledger): the disclosed-but-untracked class.
- EARS: WHEN the observability stack config is deployed, a recording rule SHALL exist for each
  of `account_deletion_cascade` and `data_export` (same `or vector(0)` shape and provenance-
  comment discipline as `mr:guest_claim_export_purge:rate5m`), AND a dashboard panel SHALL
  consume each rule, AND the stack-config check roster (checkEventHasQueriedConsumer / RT-14
  discipline) SHALL cover both events so silent drift regresses red. ADR-0243's §honest-limits
  disclosure SHALL be updated to reflect the closed R-rb-40-DASH and this slice's consumers.

### 19r-c — ADR-0238 D4 + ARCHITECTURE.md "last statement" truth fix (LOW doc-drift, LIGHT)
touches: docs/adr/0238-rb48-export-bundle-ttl-reaper-interval-singleton.md, ARCHITECTURE.md, docs/adr/DIGEST.md
after: []
- Evidence @ 9434dfb: ARCHITECTURE.md:492 ("arms the singleton as its last statement") and
  ADR-0238:74 D4 ("as its last statement before `Ok(())`") are both false since rb-65:
  privacy.rs:1565-1572 places the terminal `mr_log(data_export)` emission AFTER
  `ensure_export_bundle_reaper`, and the code comment states the corrected invariant itself
  ("The arm is the last WRITE; this is the last STATEMENT"). ADR-0243 documents the new
  ordering but never amended ADR-0238's text. An agent reasoning from ADR-0238 D4 about what
  may safely follow the arm would be misled.
- EARS: WHEN ADR-0238 D4 and ARCHITECTURE.md describe `request_data_export`'s tail, they SHALL
  state the arm is the last WRITE and the ADR-0243 emission is the last STATEMENT (or
  equivalent truthful ordering), AND ADR-0238 SHALL carry an explicit amendment note pointing
  at ADR-0243 per the ADR-0104 header discipline (`just adr-digest` re-run, digest drift-clean).

### 19r-d — bound the per-frame recomputation of the privacy countdown label (LOW perf, LIGHT)
touches: client/src/main.ts, client/src/main.privacyWiring.test.ts
after: []
- Evidence @ 9434dfb: main.ts:3079-3092 (rAF `frame()` body) calls `deriveDeletionCountdown`
  (fresh object per call) and `privacyBannerLabel` (per-call `groups: string[]` + template
  strings via `formatDuration` in the `grace` phase) unconditionally every frame, unthrottled,
  for the full multi-day grace window; the only memo is at the DOM-write boundary
  (renderPrivacyCountdown, main.ts:2882). The human-visible label changes at most once per
  second.
- EARS: WHEN the rendered countdown's whole-second value is unchanged since the last frame,
  the frame tick SHALL NOT re-derive the label (recompute at seconds granularity or ≤1 Hz),
  AND the displayed label SHALL remain correct across grace→due transitions and reconnects
  (existing wiring tests stay green; add one test pinning the recompute bound).

## 3. Sequencing & fan-out

All four slices are pairwise disjoint by `touches:` (19r-d is deliberately scoped to main.ts +
its wiring test to stay disjoint from 19r-a's ui/ files). `after:` is empty everywhere — no
real dependency chain; any order, any parallelism the supervisor's own doctrine allows.
mr-disjoint not run (advisory; disjointness is by construction — recorded as
decision-defaulted in the handoff).

## 4. Decisions

None. Zero rev19 decision issues opened — nothing in this cycle is a policy trade-off,
design-changing fix, or irreversible/architectural/security/spec-contradicting call.
Reversible calls taken with defaults are recorded as `decision-defaulted:` entries in the
2026-09-11 handoff entry. No per-slice decision-hooks.

## 5. Explicitly NOT in scope

- Everything in the open residual ledger at review time (95 open items, e.g. R-rb-48-OBS/
  PARTIALREAP/SCANCOST/SLOCLASS, R-rb-52-*, R-rb-53-E1*, R-18r-b-*, R-rb-9-X1/X3/X4/X5) — all
  tracked; the review re-reports none of them. 19r-b is NOT R-rb-48-OBS (that one is about the
  reaper emitting nothing on a quiet tick; 19r-b is about consumers for the two lines that DO
  emit) and NOT R-rb-48-SLOCLASS (SLO-roster classification of reaper functions).
- rb-73 / R-18r-b-DISCONNECTSELF (in flight at review time).
- The accept_challenge blanket-vs-stamp gate asymmetry — self-disclosed and accepted in
  ADR-0237:108; not re-opened.
- Any change to privacyModel.ts's begin() guard — the model is correct and pinned; 19r-a is
  view-model-only by design.

## 6. Notes for the runner

Findings and evidence are stated at the pinned review SHA `9434dfb`; re-derive line numbers at
implementation time (the cited files are active). 19r-a's failing-test seed is expected RED at
HEAD before the fix — keep it as the slice's proof-of-teeth. No new dependencies anticipated in
any slice; if one appears, it needs its own ADR per workspace rules. No tier hints per
convention (derive HARD/routine mechanically from `touches:`). No ADR numbers pre-allocated
(supervisor-owned via adr_next_free); 19r-c amends ADR-0238 in place rather than minting.
