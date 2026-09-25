# rb-110 plan — rename EXPORT_REAP_MAX_DELETE_PER_TICK → EXPORT_REAP_MAX_READ_PER_TICK

Slice: rb-110 (residual R-rb-86-READCAP-NAME, source rb-86). Worktree `.claude/worktrees/rb-110`, branch `rb-110`. ADR reserved: 0267.
Touches: server-module/src/privacy.rs, server-module/src/privacy_tests.rs, docs/adr/0238-*.md, docs/adr/0231-*.md, ARCHITECTURE.md
(+ companions docs/adr/0267-*.md, docs/knowledge/** if knowledge-check reds). touches-delta: docs/adr/0265-*.md (rb-109 precedent).
NOT touched: client/src/net/connection.test.ts:5062, client/src/net/store.test.ts:5548 (comments) → residual R-rb-110-CLIENTCITE.

## 1. Name: `EXPORT_REAP_MAX_READ_PER_TICK`
Family shape `EXPORT_REAP_MAX_<quantity>_PER_TICK`; READ parallels STAMPS and matches the comments' own vocabulary
("bounds the READ at 256 rows / WRITE at 16 stamps", privacy.rs:1932-1934) and `ExportReapTick.read`. 29 chars vs 31: both
wrapped sites (`EXPORT_LIVE_ROW_CAP` :1705-1706, the `.take` chain :1973-1980) stay wrapped → privacy.rs stays line-neutral.
Rejected: ROWS_READ_PER_TICK (breaks the one-token parallel), READ_WINDOW_ROWS (drops _PER_TICK), any alias/compat const (keeps the misnomer reachable, beats a census).

## 2. Tasks
### Tester (owns privacy_tests.rs; in-place, line-neutral re-freezes; new tests appended at EOF)
Value reads → new name: :9084, :12164, :15708, :16199, :16773, :19803, :21890, :21895, :22113, :22120.
Frozen-text pins → new name: :8500 (rb48 seam census array), :11770 (rb85_nd_take), :11844 (squashed body equality), :11959 (rustfmt-shaped body), :16851 ([rb86/cap-wiring] take-arg equality).
Prose retruths (no assertion change): :9038-9045 (doc says residual deliberately open — now false), :9064, :9086-9094, :11544, :13604, :14999, :15023, :18876-18879, :21515.
:22261 is NOT a rename — "E1 (`no more than …DELETE_PER_TICK`, the WRITE bound)" should name EXPORT_REAP_MAX_STAMPS_PER_TICK.
New tests:
- T1 rb110_read_cap_constant_is_named_for_the_read_and_valued_256 — [rb110/value] crate::privacy::EXPORT_REAP_MAX_READ_PER_TICK == 256; [rb110/decl] squashed privacy.rs declares `pub(crate) const EXPORT_REAP_MAX_READ_PER_TICK: usize = 256;` exactly once.
- T2 rb110_the_delete_named_read_cap_is_gone_from_the_crate — [rb110/census-prod] old name ×0 in PRIVACY_RS; [rb110/census-tests] ×0 in PRIVACY_TESTS_RS; [rb110/no-alias] declared `EXPORT_REAP_MAX_*` set == {READ_PER_TICK, STAMPS_PER_TICK}. Needle via concat!("EXPORT_REAP_MAX_", "DELETE_PER_TICK"); failure messages print counts only. Anti-vacuity: needle len 31 AND the same helper finds ≥1 NEW-name occurrence in both files.
- T3 rb110_docs_name_the_read_cap_correctly — include_str! ADR-0238/0231/0265 + ARCHITECTURE.md (precedent rb74_citation_tests.rs:117, privacy_tests.rs:10470): [rb110/doc-new-name] each contains the new name ≥1; [rb110/doc-old-name] old-name lines == exactly 1 across the four files and that line contains `rb-86` and `R-rb-86-READCAP-NAME`. Never scans client/**.
- T4 extend rb-107/rb-109 closed-roster clauses (label census, declaration count, body floor, dependency roster) for rb110_.
### Implementer (never edits privacy_tests.rs)
privacy.rs (line-neutral): :1662, :1674 decl, :1692, :1705, :1846, :1908, :1932, :1978; rewrite :1670-1673 to the SAME 4 lines (no cross-file meta-claim "pinned in N places"; zero double-quote bytes — rb22p_no_bare_quote_in_privacy allows one pair file-wide).
ADR-0238: rename :59, :302, :423, :537; :437 → bracket-note `[rb-110: renamed to EXPORT_REAP_MAX_READ_PER_TICK — see the amendment below]` + dated `## Amendment (2026-09-21, rb-110 — residual R-rb-86-READCAP-NAME closed)`.
ADR-0231:435: rename + minimal retruth (whole-bundle stamp deletes since rb-86; "cut across one owner's request" is false).
ADR-0265 :18/:44/:46/:52 (+:202 mentions only STAMPS — verify): rename; touches-delta.
ARCHITECTURE.md: rename in place :2293 (rb-85), :2303 (rb-107); :2295 (rb-86) keeps ONE historical mention carrying `rb-86`, `R-rb-86-READCAP-NAME` and the new name; new `**rb-110**` paragraph after :2307.
ADR-0267: header per ADR-0266:1-12; Status Accepted; Extends 0238; Subsystems schema-persistence, tooling-docs; D1 name, D2 rejects alias const, D3 docs retruthed with exactly one dated historical mention; Confirmation names T1/T2/T3 + re-frozen [rb86/cap-wiring], [rb85/helper-body-exact]. Re-check 0267 free. `just adr-digest`.
Gates in order: `just ci-fast server-module` · `cargo fmt --check` · `just knowledge-check` (green WITHOUT regen = line-neutrality proof; anchors privacy.rs#L1740/#L1827/#L1514 in docs/knowledge) · `just adr-digest-check` · full `just ci` once.

## 3. RED/GREEN
Stage 1 (runtime RED, unrenamed tree, new-symbol items cfg-stripped): T2/T3 fail on their labels (census-prod 8, census-tests 24, doc census 13 unmarked lines). Stage 2 (build RED): E0425 ×11 on the new name. GREEN after the rename with zero test edits. Record: memory/projects/gates/rb-110.red-before.md.
Verifier asserts: every re-frozen site still assert_eq! (no contains/<=); the four text-equality pins unchanged in kind; assertion count not decreased; no #[ignore]/new #[cfg] on rb110_ or re-frozen tests; declaration census == 1; anti-vacuity clauses present; privacy.rs line count unchanged; zero old-name occurrences repo-wide except the marked ARCHITECTURE.md line + the two client comments.

## 4. Risks
client comments outside touches (residual); ADR-0265 touches-delta; knowledge anchors below the edit; one-double-quote ban; self-gating roster clauses; :22261 double falsehood; ADR-0267 reservation race; anti-patterns: alias const, meta-claim comment, scope creep into rb-111/112/113, any client/** edit.
Workflow: solo tester/implementer split + bounded plan red-team on the census tests.
