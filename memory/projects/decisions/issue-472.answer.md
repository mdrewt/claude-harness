# DECISION ANSWER — issue 472 (CLOSED — partial explicit answer + documented default)

## Question (issue title)
DECISION(m23-s8-palette-ruling): M23 S8 blocked 24d: colorblind palette + sprite-tint art-direction
rulings never asked

## Operator response(s)

### 2026-09-19T08:49:32Z
"redesign the default palette CB-safe for everyone (spec's own stated recommendation)"

This answers M23-accessibility.spec.md §8 item 1 only (colourblind palette: redesign default vs. opt-in
theme) — Drew's wording is verbatim the spec's own "Recommended default: (a)" for item 1. Item 2 (canvas
sprite-tint contrast rule) was not addressed in the comment.

## Resolution

- **Item 1 (colourblind palette):** Drew's answer = option (a), redesign the default palette CB-safe for
  everyone. Matches the spec's own recommended default.
- **Item 2 (canvas sprite-tint contrast — ACTION_TINT):** No explicit operator answer. Per BLOCKER
  discipline (reversible art-direction choice, already stalled 24+ days past the residual staleness
  threshold): applying the spec's OWN documented default rather than the issue's ad-hoc alternate
  recommendation (which proposed extending the CB-safe palette to canvas tints — a different, heavier
  option not asked for). Spec §8 item 2 "Recommended default: (a)" = accept ACTION_TINT color-only
  encoding as out-of-scope under the §3.1 partial-conformance declaration, with a tracked art ticket
  filed separately (not part of S8's engineering scope). Recorded here as `decision-defaulted:m23-s8-item2=accept-out-of-scope-per-spec-default`.

**Net effect: S8 is UNBLOCKED** (both `[BLOCKS S8]` items resolved — one by explicit answer, one by
documented default), which also unblocks S9 (`after: S8`). Note: residual R-m23-s10-X16 (previously
`rb-14`, cited in the issue as blocked by this decision) was separately dispositioned `wontfix` on
2026-09-19T01:02:38Z (operator-directive-2026-09-01/ADR-0224 — its contrast criteria are already covered
by ordinary vitest DOM tests, S8 in `battleView.test.ts`, S9 in `evolutionView.test.ts` PR#478) — that
residual does NOT need S8 to land; it is independently closed. S8/S9 are queued as real, still-unbuilt
milestone work in their own right.

**Follow-up owed:** file a tracked art ticket for the ACTION_TINT non-colour cue (spec §8 item 2 option
(b), deferred) — separate from S8's build, do not block S8 on it.
