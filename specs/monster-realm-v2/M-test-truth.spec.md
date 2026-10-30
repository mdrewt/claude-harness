# Spec: M-test-truth — retire the redundant per-file source scans, de-ratchet the i18n tree scan

**Status:** specced 2026-10-15 · build-ready · **Project:** monster-realm. Client test files only.
Corrective C3b of the 2026-10 corrective wave. The contract of this spec: the spec BODY carries
each deletion's adjudication as Evidence prose (reason class + survivors by path and test name);
the EARS criteria pin SURVIVING runtime behavior; falsification is one-time `Red:` demonstration
lines, never ledger CHECKs that plant strings. **Doctrine:** `standards/testing-tdd.md` (no new
source-text scans, no checks-of-checks; an existing scan is kept only where no runtime test can
stand in for it).

## Problem / intent

M24's i18n enforcement left two layers doing one job:

- The whole-tree scan (`client/src/ui/i18n/hardcodedStrings.test.ts` I18N-17/18/18x) walks every
  non-test `client/src/**/*.ts`, pins the 19-file `SCAN_TARGETS` roster and
  `SINK_FLOOR = 169` (`hardcodedStrings.ts:58`, exact-pinned at `hardcodedStrings.test.ts:736`),
  and ratchets the failing-sink count through `__fixtures__/i18n-hardcoded.json`
  (`HARDCODED_CEILING`, exact-equality in I18N-18x, capped by `CEILING_AT_S2 = 81`).
- SEVENTEEN per-file `scanSource(stripComments(<view>.ts))` blocks repeat the same scan file by
  file, each with its own floor (the 17 floors sum to 145).

Each of those 17 files ALSO carries the sentinel runtime pair — `*-01` (every migrated sink calls
`t()`/`tf()` with the exact key and params) and `*-02` (under «key» sentinels every rendered
surface shows resolver output, never a raw English roster word) — runtime tests that catch the
same defect at the surface the player sees. The per-file scan blocks are redundant apparatus, and
the ceiling ratchet is a dead mechanism: measured at authoring (2026-10-15, the real scanner run
over the real tree via vite-node) — **212 non-test files, 261 sinks, 0 failing**;
`HARDCODED_CEILING` sits at 0. A ratchet whose value is 0 is a plain zero assertion wearing a
fixture, a `readCeiling` parser, nine shape teeth and a baseline file.

## Scope

IN: delete the 17 per-file scan blocks (adjudicated per file below); de-ratchet I18N-18/18x to one
plain zero-failing-sinks assertion (fixture, `readCeiling`, `CEILING_AT_S2` and their shape teeth
retired with it); tighten `SINK_FLOOR` to current-measured-minus-margin; re-justify the floor and
the `SCAN_TARGETS` roster in-test as anti-vacuity guards, not ratchets. **The tree scan itself is
KEPT** — it is the only mechanical protection for the scanned files that have no runtime pair
(`ui/menuView.ts`, `ui/sessionView.ts`, `ui/evolutionView.ts`, `ui/controlsView.ts`, `ui/frame.ts`,
`ui/navRender.ts`, `render/world.ts`, `ui/hintBar.ts`, `ui/liveRegion.ts`, and every future file
the walk picks up).

OUT of scope — stated here so the loop cannot scope-creep. Do NOT touch:

- the CSS roster test `CTL7B-1-FRAME-CSS-ROSTER` (`client/src/ui/battleView.test.ts:6574`):
  KEEP — survivor gap verified, no runtime pair reads the stylesheet;
- the router accel-path pin `EXPECTED_PATHS` (`client/src/input/router.test.ts:1505`): KEEP;
- the `client/src/indexShell.smoke.test.ts` exact-set pins (frame-layer roots, live region,
  CTL7A rows): KEEP;
- roster-pin derivation (how `PLAYER_IDS`/`FRAME_IDS` pins are spelled): DEFERRED to
  `M-stack-ownership.spec.md` slice so-2, whose one-time rewrite owns it;
- `evals/` and the merged harness gate ledgers: not this milestone's to edit.

## Risks / decisions

- The deleted battleView block's `describe` cites ADR-0259 (m24s3); per-file scans elsewhere cite
  their m24s4/m24s5 plans. The build slice's `docs/DECISIONS.md` entry records the supersession
  (title-keyed, supersede-in-place); no numbered records are minted.
- A DEFER of any TT gate has the checking apparatus as its subject — under the mr-gates admission
  rules it is recordable only as `wontfix`, never a tracked residual. If a sentinel pair turns out
  missing for some file, its block STAYS (TT3) and the gap is disclosed in the gate evidence.
- `SINK_FLOOR` margin trade-off: margin 10 under the authored measurement of 261 (floor 251).
  Small enough that a whole mid-size file going dark to the scanner trips the floor; large enough
  for routine string churn. A deliberate UI-text removal larger than the margin edits the floor
  consciously in the same PR — that edit is a reviewed, named change, not a ratchet turn.

### ttd-1 — delete the 17 per-file scanSource blocks; one plain zero-failing-sinks tree assertion
category: test-truth (redundant apparatus) · severity: MED · size: MODERATE
touches: client/src/ui/battleView.test.ts, client/src/ui/shopView.test.ts, client/src/ui/tradeView.test.ts, client/src/ui/raisingView.test.ts, client/src/ui/boxView.test.ts, client/src/ui/pvpView.test.ts, client/src/ui/helpView.i18n.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/ui/privacyView.i18n.test.ts, client/src/ui/healView.i18n.test.ts, client/src/ui/tradeProposeView.i18n.test.ts, client/src/ui/errorOverlayView.i18n.test.ts, client/src/ui/questLogView.i18n.test.ts, client/src/ui/dialogueView.i18n.test.ts, client/src/ui/evolutionNotice.i18n.test.ts, client/src/ui/leaderboardView.i18n.test.ts, client/src/ui/renameView.i18n.test.ts, client/src/ui/i18n/hardcodedStrings.ts, client/src/ui/i18n/hardcodedStrings.test.ts, client/src/ui/i18n/__fixtures__/i18n-hardcoded.json
after: []

- Deletion adjudication — reason class `source-scan` for every row (a per-file source-text scan
  whose surface a runtime pair already guards). Each row deletes that file's whole per-file scan
  `describe`/`it` block plus its now-unused `scanSource`/`stripComments` imports; survivors are
  that file's named runtime pair AND the kept tree scan (`hardcodedStrings.test.ts` I18N-17 plus
  the de-ratcheted I18N-18/18x single assertion):
  - `client/src/ui/battleView.test.ts` — delete m24s3 BV-03 (lines ≈5898–5923, floor ≥25);
    survivors m24s3 BV-01/BV-02 (battleView runtime i18n) + I18N-17/18.
  - `client/src/ui/shopView.test.ts` — delete m24s4 SV-03 (floor ≥17); survivors m24s4
    SV-01/SV-02 + I18N-17/18.
  - `client/src/ui/tradeView.test.ts` — delete m24s4 TV-03 (floor ≥16); survivors m24s4
    TV-01/TV-02 + I18N-17/18.
  - `client/src/ui/raisingView.test.ts` — delete m24s4 RV-03 (floor ≥16); survivors m24s4
    RV-01/RV-02 + I18N-17/18.
  - `client/src/ui/boxView.test.ts` — delete m24s4 BX-03 (floor ≥15); survivors m24s4
    BX-01/BX-02 + I18N-17/18.
  - `client/src/ui/pvpView.test.ts` — delete m24s3 PV-03 (floor ≥13); survivors m24s3
    PV-01/PV-02 + I18N-17/18.
  - `client/src/ui/privacyView.i18n.test.ts` — delete m24s5 PV-03 (floor ≥7; same id text as
    pvpView's, different file); survivors m24s5 PV-01/PV-02 + I18N-17/18.
  - `client/src/ui/tradeProposeView.i18n.test.ts` — delete m24s5 TP-03 (floor ≥7); survivors
    m24s5 TP-01/TP-02 + I18N-17/18.
  - `client/src/ui/claimView.i18n.test.ts` — delete m24s5 CV-03 (floor ≥6); survivors m24s5
    CV-01/CV-02 + I18N-17/18.
  - `client/src/ui/dialogueView.i18n.test.ts` — delete m24s5 DV-03 (floor ≥5); survivors m24s5
    DV-01/DV-02 + I18N-17/18.
  - `client/src/ui/leaderboardView.i18n.test.ts` — delete m24s5 LB-03 (floor ≥4); survivors
    m24s5 LB-01/LB-02 + I18N-17/18.
  - `client/src/ui/renameView.i18n.test.ts` — delete m24s5 RN-03 (floor ≥4); survivors m24s5
    RN-01/RN-02 + I18N-17/18.
  - `client/src/ui/errorOverlayView.i18n.test.ts` — delete m24s5 EO-03 (floor ≥3); survivors
    m24s5 EO-01/EO-02 + I18N-17/18.
  - `client/src/ui/healView.i18n.test.ts` — delete m24s5 HL-03 (floor ≥2); survivors m24s5
    HL-01/HL-02 + I18N-17/18.
  - `client/src/ui/questLogView.i18n.test.ts` — delete m24s5 QL-03 (floor ≥2); survivors m24s5
    QL-01/QL-02 + I18N-17/18.
  - `client/src/ui/evolutionNotice.i18n.test.ts` — delete m24s5 EN-03 (floor ≥2); survivors
    m24s5 EN-01/EN-02 + I18N-17/18.
  - `client/src/ui/helpView.i18n.test.ts` — delete m24s5 HV-03 (floor ≥1); survivors m24s5
    HV-01/HV-02 + I18N-17/18.
- Residual per-file-floor loss, named and accepted in the same change: deleting the 17 floors
  removes the per-file "the scanner still sees THIS file" tripwire (summed floors 145). After
  this slice, a single file going dark to the scanner is caught mechanically only when the
  whole-tree total falls below `SINK_FLOOR` — which is why the floor tightens from 169 to
  measured-minus-margin (TT2); a sub-margin per-file blindness is accepted residual risk, carried
  by the runtime pairs (behavior, not source text) and by I18N-17's per-target
  present-and-non-empty assertions, which stay. Build note (ttd-1, 2026-10-24): 8 of the 17 views
  hold ≤10 sinks (privacyView 7, questLogView 6, dialogueView/healView/helpView/renameView 5,
  errorOverlayView 3, evolutionNotice 2), so each can go fully dark under the margin; "non-empty"
  is file bytes, not sink visibility; and `privacyView.ts`/`evolutionNotice.ts` are not
  SCAN_TARGETS (I18N-17 asserts only that the walk contains them). For those, the runtime pair
  is the only carrier, and it checks only the sinks it renders.
- De-ratchet evidence: `__fixtures__/i18n-hardcoded.json` holds `{"HARDCODED_CEILING": 0}`; the
  migration finished, so I18N-18's "never raise" ratchet and I18N-18x's exact-equality +
  `CEILING_AT_S2` cap now encode a plain "zero failing sinks" behind three indirections. The
  fixture file, `readCeiling`, its shape teeth and `CEILING_AT_S2` go; the direct assertion stays.
- Out of scope for this slice (restated from the milestone Scope): `CTL7B-1-FRAME-CSS-ROSTER`,
  `EXPECTED_PATHS`, the indexShell pins, roster-pin derivation (so-2's), `evals/`, harness ledgers.
  If a fix needs a file outside `touches:`, that is a hidden-dependency STOP — do not widen.

- **TT1:** WHEN any non-test `client/src/**/*.ts` renders a player-facing string outside
  `t()`/`tf()`, THE TREE SCAN SHALL fail by asserting the failing-sink list empty directly —
  no ceiling fixture, no `readCeiling`, no `CEILING_AT_S2`, no
  `__fixtures__/i18n-hardcoded.json` left in the tree — and the failure message SHALL list each
  surviving sink by file, kind and line.
  - Red (one-time demonstration, then reverted — never a ledger CHECK that plants a string):
    plant one raw-English `textContent` sink in a scanned view, run
    `npx vitest run src/ui/i18n/hardcodedStrings.test.ts`, see the de-ratcheted assertion RED
    with the sink listed, revert the plant.
- **TT2:** THE SLICE SHALL re-measure the whole-tree sink total with the real scanner and set
  `SINK_FLOOR` to that measurement minus a margin of 10 (authoring measurement 2026-10-15:
  261 sinks → floor 251), and I18N-17 SHALL state in-test that the floor and the 19-file
  `SCAN_TARGETS` roster are anti-vacuity guards (the scan still sees the tree), not ratchets —
  the floor is edited consciously when UI text legitimately shrinks, never auto-tightened.
- **TT3:** WHEN a per-file `scanSource` block is deleted, THAT FILE's sentinel runtime pair (the
  `*-01`/`*-02` tests named in its adjudication row above) SHALL be verified present and green
  in the same slice — a file whose pair is missing or red keeps its block, and the gap is
  disclosed in the gate evidence.
- **TT4:** WHEN any of the 17 adjudicated views renders under «key» sentinels, THE VIEW SHALL
  show resolver output only, and WHEN it renders with the real catalog, every migrated sink
  SHALL call `t()`/`tf()` with the exact key and params — the surviving `*-01`/`*-02` pairs stay
  green, unmodified, after the deletions.
- **TT5:** WHEN the touched spec files run (`npx vitest run` over the 17 view test files plus
  `src/ui/i18n/hardcodedStrings.test.ts`) and the client typechecks (`tsc --noEmit` with the
  config that includes tests), THE SUITE SHALL be green with the 17 blocks gone and no unused
  `scanSource`/`stripComments` import left behind (biome-clean).

- Post-integration verification: full `just ci` green (the orchestrator runs it — never from a
  shared checkout mid-session); the combined behavior satisfies TT1–TT5 end-to-end: tree scan
  still RED on a planted sink, per-file pairs green, no fixture file in `__fixtures__/`.
