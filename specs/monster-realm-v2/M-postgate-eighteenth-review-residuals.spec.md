# M-postgate-eighteenth-review-residuals — verified eighteenth-review findings

**Review ordinal:** 18 (weekly generate-improvement-plan) · **Pinned SHA:** `1e738fd91844c818f2649ef5a3131a0712e24bd3` · **Review UTC:** 2026-09-04T00:40Z
**Provenance:** standard multi-lens review of the `e112ce6..1e738fd` delta (M22 privacy
s3–s9 closing M22, m23-s8 colour independence, rb-22..rb-39 residual-backlog fixes,
17r-a/b/c) plus bounded full-repo sweep. 8 sonnet lenses, 0 lens contradictions, 2
independent verifier agents re-checked all reportable claims (7 CONFIRMED — one with a
severity downgrade, 1 dropped as already tracked in the residual ledger as
`R-m23-s8-postmerge`). Zero decision issues opened this cycle (nothing rose to a
Drew-level call; all findings are mechanical and reversible).

## 1. Why this milestone exists

The delta is structurally clean where it matters most: the server security/privacy lens
returned an explicit "no findings" across the entire M22 deletion/export machinery
(guard ordering, RLS view shape, cascade delegates, tombstone SSOT all verified); the
netcode lens independently re-traced 17r-a/17r-b and confirmed both fixes hold including
the races it went looking for; schema changes are genuinely additive; no test was
weakened, skipped, or `.only`'d anywhere in the delta. What remains is ONE medium
client state-machine bug in the new privacy UI core (an armed delete confirmation
silently spent on a no-op path), a four-site citation/pointer drift sweep (three of the
four introduced by this very delta), and one piece of 17r-c's own deliverable that was
never executed (the M20 spec still states the opposite of the current OBS-48 policy).

## 2. Slices (ROI order)

### 18r-a — privacyModel: busy-guard must not spend the armed delete confirmation (MED state-machine bug, LIGHT)
touches: client/src/ui/privacyModel.ts, client/src/ui/privacyModel.test.ts
after: []
- `begin()`'s double-submit-guard branch (privacyModel.ts:231-235) returns
  `{ ...state, confirm }` using the caller-supplied `confirm` parameter; only the
  `'delete-confirmed'` call site (:275-284) passes `'none'` ("spend the confirmation on
  delivery"). Result: dispatching `delete-confirmed` while `state.inFlight` is
  `'export'` or `'cancel'` — permitted, live connection, confirmation armed — clears
  `confirm` `'delete-armed'` → `'none'` with `effect: 'none'` and NO notice. The delete
  reducer is never called, yet the player's armed confirmation is silently wiped,
  violating the module's own invariant (the disconnected branch at :237-240 deliberately
  preserves `state.confirm`, pinned by S8T-DELETE-OFFLINE-ARMED "an action that never
  happened must not disarm"). Verified by hand-trace; severity MED per independent
  verifier (the guard correctly prevents any wrong server call — the defect is a silent,
  notice-less UX reset in the account-deletion flow, not data loss or authz).
- Coverage gap that let this ship: S8T-DELETE-INFLIGHT-REFUSED
  (privacyModel.test.ts:701-738) asserts `effect` and `next.inFlight` for every busy
  value but never asserts `next.confirm`.
- Fix: the no-op guard branch must always preserve `state.confirm` — either return
  `{ ...state }` there (mirroring the disconnected branch) or split the parameter into
  "confirm on delivered send" vs "confirm on no-op" so no caller can spend a
  confirmation on a path that delivered nothing.
- EARS: WHEN `delete-confirmed` is dispatched while another request is in flight THE
  armed confirmation SHALL remain `'delete-armed'` AND no delete effect SHALL fire AND
  `inFlight` SHALL be unchanged; WHEN `delete-confirmed` is actually delivered
  (`inFlight === 'none'`, permitted, live) THE confirmation SHALL be spent exactly as
  today; WHEN the click is refused for a dead connection THE existing
  S8T-DELETE-OFFLINE-ARMED behavior SHALL be unchanged.
- Tests: extend S8T-DELETE-INFLIGHT-REFUSED to assert
  `next.confirm === 'delete-armed'` for each busy value — authored from these criteria
  by a different agent than the implementer.

### 18r-b — citation/pointer truth micro-sweep (LOW doc-drift, LIGHT)
touches: docs/adr/0231-client-privacy-cores-request-wide-chunk-assembly.md, sim-harness/src/bin/mr_load_driver.rs, ARCHITECTURE.md, AGENTS.md
after: []
- ADR-0231:139-140 cites `main.ts:2756` for "main.ts reads only claimedFrom from
  StoreAccount" — :2756 is an unrelated `onSessionExpired` line; the sole `claimedFrom`
  read is main.ts:2777 (explanatory comment :2773). In-delta ADR (m22-s8). Fix the
  citation, or cite the landmark instead of a raw line per the rb-36 doctrine.
- mr_load_driver.rs:80 claims "on_disconnect (server-module/src/lib.rs:213-239)" —
  those lines are `resolve_all_live_interactions` (extracted above it by m22-s3b,
  shifting on_disconnect to lib.rs:259-272). ADR-0232:51 cites this comment block
  (:76-89) approvingly as "live-verified", so the stale nested citation undermines the
  ADR's evidence chain. Prefer function-name-only citation per rb-36 doctrine.
- ARCHITECTURE.md's four final entries (rb-36/rb-37/17r-a/17r-b, :2128-2134) each end
  "ADR next-free = 0234", but the tip commit (rb-39, `1e738fd`) minted ADR-0234 and
  added no ARCHITECTURE.md entry — the file's own stated next-free number is taken.
  Mitigation: mr-state.json's `adr_next_free` is the operative allocator, so the
  practical collision risk is low, but the prose is load-bearing to readers (four
  slices declined to mint numbers citing exactly this pointer). Append a terminal rb-39
  entry recording ADR-0234 and advance the prose pointer to match the allocator's value
  AT IMPLEMENTATION TIME (do not hardcode from this spec; do not pre-allocate).
- AGENTS.md:7 "pin **2.8.1** in three places" — actual count is FOUR named
  "Pin spacetime 2.8.1" steps (ci.yml:65,143; nightly.yml:167,331). Reword to "four
  places (two per file)".
- EARS: WHEN each cited doc/comment is read THE claim SHALL match the code it
  describes at HEAD. Doc/comment-only; `just ci` green.

### 18r-c — M20 spec OBS-48 reword per Drew ruling #342 (LOW spec-drift, LIGHT; harness repo)
touches: specs/monster-realm-v2/M20-observability-performance.spec.md
after: []
- 17r-c's own spec bullet (M-postgate-seventeenth-review-residuals.spec.md:91-92)
  directed this supervisor doc-follow-up; it was never executed (verified: zero matches
  for OBS-48/require-justification in the backlog queue; the M20 text is unchanged).
  M20-observability-performance.spec.md:551-553 still states the blanket forbid
  ("SHALL NOT enable features = [\"unstable\"] … SHALL NOT define a
  #[spacetimedb::procedure]") — the OPPOSITE of current policy. The code/ADR side is
  already correct (eval A9 justification-manifest gate; ADR-0180 amendment 2026-09-03;
  ADR-0197 cross-ref; runbook:167) — this is the sole remaining stale statement of the
  ruling.
- Fix: reword OBS-48 to require-justification, mirroring ADR-0180's 17r-c amendment
  language and citing issue mdrewt/monster-realm#342. Harness-repo, spec-text-only
  (17r-d precedent); no project code or gate change.
- EARS: WHEN M20's OBS-48 is read THE text SHALL state require-justification citing
  issue #342 and ADR-0180's 17r-c amendment AND SHALL NOT state a blanket forbid.

## 3. Sequencing & fan-out

All three slices are pairwise disjoint. 18r-a/18r-b: `mr-disjoint` verdict SAFE
(file-disjoint; advisory only, recorded 2026-09-04). 18r-c is harness-repo doc-only.
No serial chain. 18r-b's ARCHITECTURE.md append is a file-tail write — normal slice
discipline suffices.

## 4. Decisions

- NONE opened this cycle. No open rev-issues exist from prior cycles (all
  DECISION(rev*) issues in both repos are closed and consumed). Reversible calls this
  review made itself are recorded as decision-defaulted entries in the handoff.

## 5. Explicitly NOT in scope

- OBS-48 `why`-field vacuity (an 80-char floor with no content check; `"x".repeat(80)`
  passes): confirmed real, but the eval's own doc comment (:189-190) records it as a
  deliberate tradeoff ("deliberately NO word denylist … a human reads the rest") — a
  documented design choice, not a defect. Recorded for visibility;
  decision-defaulted:obs48-why-vacuity=no-slice.
- The runtime-vs-CI content-validation split for new enum variants (ADR-0233 calls it
  R-m23-s8-RUNTIME): already tracked in the residual ledger as `R-m23-s8-postmerge`
  (same substance, different id in the ADR's prose) — dropped by verification as
  excluded. The id mismatch is cosmetic; both are discoverable.
- All open residual-ledger items (43 at review time, incl. R-17r-c-OBS48-*, R-m22-*,
  R-m23-s8-postmerge*, R-rb-*), rb-40/rb-41 (in flight), 17r-d/e/f (queued), and
  CHANGELOG freshness (nightly gate owns it): tracked, excluded.

## 6. Notes for the runner

- Insertion point: PLAN §9, directly after `M-postgate-seventeenth-review-residuals`.
- 17r-d/e/f were still queued at review time; nothing here collides with them
  (touches-disjoint from all three; 18r-b touches ARCHITECTURE.md which no queued 17r
  slice touches).
- 18r-b advances the ARCHITECTURE.md next-free pointer from the allocator at
  implementation time — if further ADRs mint between this review and the slice, the
  slice text above already accounts for it.
- Verification provenance: every path:line above was confirmed at the pinned SHA by an
  independent verifier that did not author the finding (review 18, 2026-09-04).
