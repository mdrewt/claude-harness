# ttd-1 plan — delete the 17 per-file scanSource blocks; de-ratchet to one zero-failing-sinks assertion

Spec: specs/monster-realm-v2/M-test-truth.spec.md §ttd-1. Worktree `.claude/worktrees/ttd-1` from origin/master 1c0d393b.

## Measured facts (2026-10-24, real scanner + stripComments, whole non-test client/src tree)
- 261 sinks, 0 failing, 213 files → SINK_FLOOR 251 (TT2; matches the spec's authoring measurement).
- Baseline: all 17 rows' `*-01`/`*-02`/`*-03` present and green (18 files, 427 tests, 0 failed/pending).
  So no row keeps its block (TT3 escape hatch unused).
- `__fixtures__/` holds only `i18n-hardcoded.json`; nothing outside `hardcodedStrings.test.ts` reads it
  (only the historical `docs/debloat/baseline/rosters/vitest-list.txt` roster names the test titles; ungated, not touched).

## Changes
1. Tester (gating tests, `hardcodedStrings.test.ts` only):
   - I18N-17: `expect(SINK_FLOOR).toBe(251)`; in-test statement that the floor and the 19-file
     SCAN_TARGETS roster are anti-vacuity guards, not ratchets, edited consciously when UI text shrinks.
   - I18N-18: rewritten to `expect(tree.failing.map(describeSink), message).toEqual([])` — failure lists
     every sink as `file:line kind [segments]`. Title drops HARDCODED_CEILING.
   - Delete I18N-18x, `readCeiling`, `CEILING_PATH`, `CEILING_AT_S2`; header comment de-ratcheted.
   - RED: I18N-17 fails on `SINK_FLOOR` 169 ≠ 251.
2. Implementer (orchestrator): `hardcodedStrings.ts` SINK_FLOOR 169→251 + doc comment (anti-vacuity, not a
   ratchet) + header line "and the ceiling" fixed; delete `__fixtures__/i18n-hardcoded.json`; delete the 17
   `*-03` describe blocks + now-unused imports (scanSource, stripComments, fs/path/url where unused);
   fix header comments that narrate the deleted `*-03` (comment accuracy).
3. docs/DECISIONS.md "Client UI: virtual buttons, one context stack, one overlay frame": supersede in place —
   one tree scan asserts zero raw-string sinks; rules out per-file source scans and ceiling ratchets
   (touches-delta, mandated by the task scope).

## Out of scope (spec)
CTL7B-1-FRAME-CSS-ROSTER, EXPECTED_PATHS, indexShell pins, roster-pin derivation (so-2), evals/, harness ledgers.
Prior BLOCKER: 11 red full-client vitest tests outside touches — disclose, do not fix.

## Gates (CHECKs are in-repo vitest/git invocations; mr-gates bans out-of-repo probe scripts)
- TT1: hardcodedStrings.test.ts 9/9 passed, then `git ls-files --error-unmatch` on the fixture must error.
- TT2: `-t I18N-17` → 1 passed | 8 skipped (9). Measurement 261→251 recorded in PR.
- TT3: 17 view files `-t "m24s[345] [A-Z]{2}-0[12]:"` → 34 passed | 366 skipped (400) (the 17 -03s gone).
- TT4: pairs green AND the diff vs 1c0d393b adds no non-comment/non-import line to the 17 files.
- TT5: `npm run typecheck` && biome check on the 19 files && 18-file vitest 409/409.
- TT1 red demonstration: plant one raw textContent sink in a scanned view, run, see I18N-18 RED listing it, revert.

## Lenses
reviewer + red-team on the diff; verifier last (no gating test weakened). reducer-security-auditor and
desync-guard: N/A (no server-module / game-core / wasm change).
