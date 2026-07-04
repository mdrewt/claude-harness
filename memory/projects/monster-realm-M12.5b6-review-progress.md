---
name: monster-realm-M12.5b6-review-progress
description: M12.5b6 mandatory pre-merge review — verdict and lens summary
metadata:
  type: project
---

# M12.5b6 Review Progress

**VERDICT: APPROVE-FOR-MERGE**

**Branch:** `feat/m12.5b6-nightly-smoke-republish`  
**Final tip:** `a92d73e` (post-review fix commit)  
**PR:** #98  
**Date:** 2026-07-04

## Lens verdicts

| Lens | Verdict | Notes |
|------|---------|-------|
| tester | CLEAN (ADEQUATE) | RED checkpoint `ec1cd6f` genuine. A1–A5 EARS covered. TEETH E bad-fixture vacuous by design (real-file check is production gate). |
| reviewer + red-team | FIXED | 2 HIGH + 4 MEDIUM + 4 LOW found; all fixable items applied in `a92d73e`. M-1 (installer checksum) and M-3 (ADR README row) open items — non-blocking. |
| reducer-security-auditor | NOT_APPLICABLE | No new reducers. `sync_content` owner guard (ADR-0073) confirmed correct in committed code. |
| desync-guard | NOT_APPLICABLE | No client/sim-harness/wasm changes. |
| verifier | APPROVE | `just ci` EXIT=0 (45 evals / 777 Rust / 571 client tests). No tests weakened. All TEETH biting. ADR-0079 complete. |

## Fixes applied in a92d73e

- **H-1**: Pre-initialize `MONSTER_ROWS`/`MONSTER_ROWS_AFTER` before poll loops (`set -u` safety)
- **H-2**: Word-boundary anchoring on `grep -qE "(^|[^0-9])${BUMP_VERSION}([^0-9]|$)"` — prevents substring false-positives
- **M-2**: EXIT trap warns instead of `|| true` silently swallowing restore failure
- **M-4**: `if ! SYNC_OUT=$(cmd)` form — `VAR=$(cmd)` alone suppresses `set -e` on non-zero exit
- **L-1**: ADR-0079 step 6 "V+100" → "V+1" copy-paste fix
- **L-2**: macOS GNU sed requirement documented in justfile comment
- **L-4**: `set -euo pipefail` presence check added to `nightly-smoke-wiring` eval

## Open items (non-blocking)

- **M-1**: SpacetimeDB installer at `https://install.spacetimedb.com` has no SHA checksum — supply-chain gap per standards/security.md. No known fix path (SpacetimeDB doesn't publish a detached checksum for their installer script). Flag for future hardening.
- **M-3**: ADR README missing row for 0079, next-free still 0079 not 0080. Pre-existing documentation debt tracked under 12.5g-1 doc-keeper pass. Instructions prohibit touching `docs/adr/README.md` in this slice.
- **TEETH E**: Vacuous bad-fixture direction (minor structural observation; real file check is the production gate).

## CI state

Remote CI green before review (`9ac5357`). All 45 evals green after fixes (`a92d73e` — eval-and-doc-only changes, no Rust/TS code touched).

**Why:** Mandatory post-build tester-role gap review ordered by supervisor. ADR next-free = 0080.
