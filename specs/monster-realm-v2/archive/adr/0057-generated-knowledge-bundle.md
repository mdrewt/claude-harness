# 0057. Generated knowledge bundle — OKF-conformant schema projection for agents

- Status: proposed
- Date: 2026-06-27

> Harness corpus ADR (design-level), authored alongside milestone **M8.95**.
> The project-side implementation ADR is mirrored into `projects/monster-realm/docs/adr/`
> at the confirmed next-free number at build (M8.9 consumes 0055/0056 first —
> **confirm before creating**). Upholds harness **ADR-0008** (knowledge contract)
> and `standards/knowledge-format.md`.

## Context and problem statement

Agents working in monster-realm most need to understand the **SpacetimeDB schema
and reducer surface** — what tables exist, their columns/PKs, which are
public vs. private, the privacy split (ADR-0040), and how they relate. Today that
knowledge is spread across `server-module/src/` (post-M8.9: `schema.rs` +
domain modules), `ARCHITECTURE.md`, ~20 ADRs, and the schema-snapshot baseline
(`evals/baselines/table-schemas.json`). It is well-organized but not in a single,
portable, agent-navigable surface — and the schema is the *exact* artifact OKF
was designed to catalog (its reference producer emits one concept per table).

Harness ADR-0008 adopts a "knowledge contract": generate such knowledge from the
source of truth, never hand-author it, and gate it mechanically. This ADR records
how monster-realm realizes that contract. The hard constraint is **SSOT**: the
bundle must not become a second, drifting copy of the schema.

## Considered alternatives

### Source of the bundle
- **Option A (chosen) — Generate from `server-module/src/schema.rs`** by reusing
  the **already-exported** `parseTableSchemas()` from
  `evals/battle-schema-snapshot.eval.mjs` (plus a reducer-signature pass and ADR
  cross-references). The same parser that *gates* schema drift *feeds* the
  bundle, so they cannot disagree. Reducers and visibility are read from source +
  the relevant ADRs.
- **Option B — Hand-author the concept files.** Rejected: a hand-maintained
  duplicate of the schema is exactly the SSOT violation AGENTS.md rule #3
  forbids; it would drift on the next additive migration.
- **Option C — Use Google's reference enrichment agent (Gemini/BigQuery).**
  Rejected: wrong source system; needs GCP; non-deterministic; over-built for a
  schema this size.

### Freshness / trust
- **Option F1 (chosen) — Commit the bundle as a generated artifact and
  drift-check it** (regenerate in `--check` → must equal committed), mirroring
  `bindings-drift` and the schema snapshot. Producer is the sole writer.
- **Option F2 — Generate on demand, don't commit.** Rejected: loses diff review
  and the drift gate; a reader can't trust freshness.

### Conformance
- **Option G1 (chosen) — Reuse the harness `okf-lint.mjs` + a
  `knowledge-bundle-conformance` eval with proof-of-teeth** (a malformed concept
  and a stale bundle must both be flagged), wired into `just eval`/`just ci`.
- **Option G2 — Trust the producer, no gate.** Rejected (ADR-0010: every
  mechanical gate ships a known-bad fixture it must reject).

## Decision outcome

- **Chosen: A + F1 + G1.** A generated, committed, drift-checked OKF-conformant
  bundle at `docs/knowledge/` — one `SpacetimeDB Table` concept per table (cols,
  PK, `visibility`, `resource:` → source line, FK links to related table
  concepts), `SpacetimeDB Reducer` concepts for the reducer surface, a generated
  `index.md`, and the existing `docs/research/` library brought to conformance by
  adding `type:` (fields otherwise unchanged). Produced by
  `scripts/okf-export.mjs`; linted/drift-gated under `just eval`. Full plan,
  acceptance criteria, and slices in **M8.95**.
- **Depends on M8.9** (the producer parses the post-M8.9 `schema.rs` and the
  domain-module reducer layout; running before M8.9 would target the
  soon-to-be-moved `lib.rs`).
- **Consequences:**
  - **Positive:** agents get one portable, navigable schema surface generated
    from truth; SSOT intact (drift fails CI); the privacy posture (public vs.
    private tables, ADR-0040) is made explicit and machine-checkable in the
    bundle; reuses the schema-snapshot parser and the research-index/lint
    machinery; portable to a future memory backend or viewer.
  - **Negative (accepted):** one more generated artifact + CI gate to maintain
    (cost bounded — the producer reuses existing parsing; the gate is one eval);
    the bundle is a *projection*, never a source of truth — ADRs and
    `ARCHITECTURE.md` remain authoritative for rationale; OKF v0.1 churn risk
    absorbed by keeping the concept shape minimal.
