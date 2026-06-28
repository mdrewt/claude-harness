# 0008. Knowledge contract — selective OKF adoption for agent-readable knowledge

- Status: accepted
- Date: 2026-06-27

## Context and problem statement

Google Cloud published the Open Knowledge Format (OKF, 2026-06-12): a convention
for representing knowledge as a directory of markdown files with YAML
frontmatter so agents and humans can read the same files with no translation
layer. The workspace already runs this pattern in two places without naming it —
the research libraries (`docs/research/` + the shared consultant library,
ADR-0007, with `research-index.mjs`/`research-lint.mjs`) and the de-facto
schema/architecture docs in projects.

A full study (`OKF-research-and-impact-analysis.md`) concluded: OKF's
distinctive value (vendor-neutral cross-org interchange) is not a problem this
solo, single-repo workspace has, and its core failure modes (it standardizes
the *container, not the meaning*; v0.1 draft; no provenance/freshness/retrieval;
single-vendor gravity) cut against adopting it wholesale. But three of its ideas
are genuinely useful and align with existing principles. The question: which
pieces, if any, do we adopt, and how do we keep them from violating SSOT?

## Considered alternatives

- **Option A — Adopt OKF wholesale** (its spec, reference producer/visualizer,
  treat bundles as a knowledge layer). Rejected: drags GCP gravity
  (Gemini/BigQuery), the reference tooling contradicts its own spec, and a
  hand-authored bundle is a duplicate of facts that already live in code/ADRs —
  a direct SSOT violation.
- **Option B — Do nothing.** Keep the ad-hoc research convention as-is.
  Rejected: leaves the convention unspecified (no `type`, no registered
  vocabulary, no portability contract) and forgoes a cheap, real win — a
  *generated*, drift-checked projection of schema-like sources for agents.
- **Option C (chosen) — Adopt OKF's conventions as a thin "knowledge contract,"
  generated-from-source, mechanically enforced.** Take the small interoperable
  surface (a required `type` field, bundle-relative link graph, optional
  `index.md` progressive disclosure) and *fix OKF's central weakness* by
  registering a type vocabulary and gating conformance + drift in CI. Knowledge
  that derives from a source of truth is generated; only source-less knowledge
  (research, rationale) is hand-authored.

## Decision outcome

- **Chosen: C.** Codified in `standards/knowledge-format.md`. Concretely:
  - The research libraries become the first conformant instance (add `type`
    additively; keep the richer `confidence`/`sources`/`supersedes`/`status`
    fields — the contract is a *superset* of OKF, never a downgrade).
  - A shared conformance linter (`scripts/okf-lint.mjs`) and the principle that
    generated bundles are drift-checked like generated bindings (regenerate →
    must equal committed; proof-of-teeth fixtures) are workspace tooling any
    project can use.
  - The first generated bundle (monster-realm's SpacetimeDB schema) is specced
    separately as milestone **M8.95** and recorded by the project ADR
    (corpus 0057).
- **Consequences:**
  - **Positive:** portable, diffable agent knowledge with *semantic* interop
    (registered `type` vocabulary — the thing OKF omits); SSOT preserved
    (generated, never hand-copied); future-proof — a managed/graph memory
    backend or an MCP consumer can read the same contract "without changing the
    index contract" (WORKSPACE-PLAN §3); reuses the existing research-index/lint
    machinery.
  - **Negative / follow-ups:** OKF is v0.1 and may churn — the contract is
    deliberately minimal so a breaking OKF change costs little; bundles add a
    producer + a CI gate to maintain (justified only where a bundle pays its
    way — appropriateness-per-project). Security: bundles are untrusted data;
    never ingest third-party bundles (no OKF provenance). Extends ADR-0007.
