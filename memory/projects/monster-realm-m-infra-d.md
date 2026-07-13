---
name: monster-realm-m-infra-d
description: ADR digest slice (ADR-0104, PR #159) — generator+gate+fixtures; header backfill parked; key traps for future slices
metadata:
  type: project
---

ADR-0104 consumed by M-infra-d (PR #159). Next-free → **0105**.

**Why:** Agent-facing compaction of 100+ ADR corpus into a single scannable DIGEST.md; canonical header block standard for new ADRs going forward.

**How to apply:** New ADRs must have all 7 canonical fields (Status/Date/Slice/Supersedes/Amends/Subsystems/Decision). Run `just adr-digest` before committing any ADR. Read `docs/adr/DIGEST.md` first for "is there a decision about X?" — open full ADR only on a hit.

## Key artifacts

- **`scripts/adr-digest.mjs`**: generator; `--check` mode for CI drift gate
- **`docs/adr/DIGEST.md`**: DO-NOT-EDIT generated index (70 project + 36 H-)
- **`docs/adr/design-corpus.json`**: frozen harness design ADRs H-0002–H-0034 + H-0055/H-0056/H-0057
- **`evals/adr-digest.eval.mjs`**: 10 teeth; TOOTH 7 = real-corpus `--check` (drift gate in CI)
- **`evals/fixtures/adr-digest/`**: 8 fixtures (0900-0907)

## LEGACY_TOLERANCE

All 69 pre-infra-d project ADRs (0001, 0035–0103 excluding 0102) are in the set. Missing canonical fields are **warnings, not errors** for these. Header backfill (EARS infra-d-1..3) is a **parked follow-up slice** — remove entries from the set until empty.

## Design decisions / traps

- **Field extraction is preamble-only** (`headerPreamble` = before first `\n## `). A body code block containing `**Status:** Accepted` does NOT satisfy the header requirement (TOOTH 8).
- **H- references in Supersedes/Amends**: `extractAllAdrIds` scans for both `ADR-NNNN` and `H-NNNN`. `allIds` is populated from `designCorpus.entries[].id` (e.g. `"H-0002"`). A reference to `H-0099` (non-existent) fails as dangling (TOOTH 9).
- **`Status=Superseded` requires a real pointer**: `Superseded-by: —` (em-dash) is rejected — must reference an actual ADR or H- ID (TOOTH 10).
- **No `new RegExp()`**: detect-non-literal-regexp Semgrep rule; use literal `/regex/` or `String.indexOf`/`String.includes`.
- **Subsystem vocabulary** (10 values): `battle` · `evolution-fusion` · `movement-netcode` · `content` · `schema-persistence` · `client-ui` · `ci-gates` · `tooling-docs` · `security-authz` · `economy-quests`
- **Decision ≤240 chars**: enforced on canonical (non-legacy) ADRs.
- **H- collision map**: H-0055 = project 0056; H-0056 = project 0057; H-0057 = project 0080. Encoded in `design-corpus.json`.
