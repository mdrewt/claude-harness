# M-infra-d — ADR digest: agent-facing compaction of the decision corpus

**Infra slice (insertable any time after M14.5; disjoint from gameplay slices).** Pure docs/tooling;
no game-design surface, no schema change, no behavior change. One mergeable PR on
`mdrewt/monster-realm`. Build it test-first like any slice — it adds a CI gate, so the
proof-of-teeth is a fixture-corpus eval that proves the gate bites.

## Why

The decision corpus is now 104 ADRs (~620 KB across two locations: design `0002`–`0034` in the
harness spec corpus; implementation `0001`, `0035`+ in `docs/adr/`). Build-loop agents consume it by
grepping prose, and nothing marks which ADRs are still binding — supersession/amendment facts live
only inside individual files, in two different header dialects (bold-field block in newer ADRs,
`- Status:` list style in older ones, e.g. 0055). The 0055–0057 harness/project numbering collision
is tribal knowledge in a README paragraph. Cost: every planner/reviewer pass re-derives "what is
still true" from raw prose, and stale decisions get cited as live.

Fix: compact the *projection*, never the records. ADRs stay append-only and keep their numbers; a
generated, drift-gated `docs/adr/DIGEST.md` becomes the agent entry point (read the ~15 KB digest,
open a full ADR only on a hit) — the same generated-projection pattern as the M8.95 OKF bundle.

## Invariants upheld

- **ADRs are append-only records**: no renumbering, no rewriting history, no deletion. Status
  changes are header-metadata edits only (plus the standard `Superseded by` note convention).
- **`docs/adr/README.md` is NOT touched by this slice or by the generator.** It stays the
  supervisor-owned index and the "Next free number" allocator seed. `DIGEST.md` links to it for
  numbering; ownership of README does not move. (Only exception: the merged ADR authored by this
  slice gets its README row via the normal supervisor reconciliation at merge — not via the
  generator.)
- **Generated file is never hand-edited**: `DIGEST.md` carries a DO-NOT-EDIT banner naming the
  recipe, exactly like the OKF bundle and bindings.
- **Deterministic output**: stable ordering, no wall-clock timestamps in the digest body
  (the okf-export stamp-drift lesson, fixed in m14.5g, applies from day one).
- **No new mechanism overlap with Plan A**: this slice does not introduce doc fragments or touch
  `CHANGELOG.md`/`ARCHITECTURE.md` aggregation — that is `M-infra-b`'s scope. If M-infra-b lands
  later, its `docs-reconcile` recipe should additionally invoke `just adr-digest` (one-line note in
  its spec is a follow-up, not this slice's job).

## EARS acceptance criteria

1. **infra-d-1 (header normalization):** every `docs/adr/[0-9]*.md` SHALL carry the canonical
   header block — `**Status:**`, `**Date:**`, `**Slice:**`, `**Supersedes:**`, `**Amends:**`,
   `**Subsystems:**`, `**Decision:**`, plus the *conditional* fields `**Superseded-by:**` and
   `**Amended-by:**` (present iff applicable; the gate treats these two as the only permitted
   optional fields) — with Status ∈ {Accepted, Superseded, Deprecated}
   (an ADR that only *amends* another stays Accepted; the amended ADR gains `**Amended-by:**`).
   Older list-style headers (e.g. 0055) are mechanically rewritten to the canonical block with
   content preserved. WHEN an ADR is superseded, its header SHALL name the superseder
   (`**Superseded-by:** ADR-00NN`) and the digest SHALL render it struck-through/dead.
2. **infra-d-2 (subsystem tags):** `**Subsystems:**` SHALL take 1–3 values from a controlled
   vocabulary (proposed: `battle`, `evolution-fusion`, `movement-netcode`, `content`,
   `schema-persistence`, `client-ui`, `ci-gates`, `tooling-docs`, `security-authz`,
   `economy-quests`; the slice MAY amend the vocabulary in its ADR). The generator SHALL fail loud
   on values outside the vocabulary.
3. **infra-d-3 (decision one-liner):** `**Decision:**` SHALL be a non-empty single sentence
   (≤ 240 chars) stating the decision — backfilled for all existing ADRs by this slice, reviewed
   by the reviewer lens for fidelity to each ADR's actual Decision section (spot-check depth per
   reviewer judgment; every Superseded/Deprecated ADR and every ADR cited by AGENTS.md checked
   exactly).
4. **infra-d-4 (generator):** `scripts/adr-digest.mjs` (Node, zero deps, `okf-export.mjs`
   conventions — no `new RegExp()`, no wall-clock) SHALL emit `docs/adr/DIGEST.md`: one line per
   ADR — id, status (with supersession pointer), slice, subsystems, decision one-liner — grouped
   by subsystem with a flat numeric master list first; dead ADRs marked. Output SHALL be
   byte-deterministic for a given corpus.
5. **infra-d-5 (design corpus):** the harness design ADRs `0002`–`0034` SHALL be vendored ONCE as
   `docs/adr/design-corpus.json` (id, title, status, decision one-liner) and rendered in DIGEST
   under the `H-` namespace (e.g. `H-0012`), with the 0055–0057 collision encoded as data
   (`H-0055` ↔ `0056`, `H-0056` ↔ `0057`, `H-0057` ↔ `0080`) so the README prose note becomes
   machine-checkable. The corpus is frozen; the file carries a "frozen snapshot 2026-07" banner.
   Project CI never reads the harness repo. Supersedes/Amends references MAY point at `H-` ids;
   the generator resolves them against `design-corpus.json` (a dangling `H-` reference fails the
   gate like any other).
6. **infra-d-6 (drift gate):** `just adr-digest` SHALL regenerate the digest; `just ci` SHALL fail
   if regeneration changes `docs/adr/DIGEST.md` or if any ADR violates infra-d-1/2/3 header rules
   (missing/unknown fields, bad status, empty decision, unknown subsystem, dangling
   supersedes/amends reference). Failure messages SHALL name the offending file and field.
7. **infra-d-7 (proof-of-teeth):** an eval (fixture mini-corpus under `evals/fixtures/adr-digest/`)
   SHALL prove the gate bites: stale digest, missing Status, unknown subsystem, >240-char decision,
   dangling `Superseded-by` → each individually fails with the actionable message; a clean fixture
   passes. Run ≥3× green (test-artifact rigor).
8. **infra-d-8 (convention forward):** `AGENTS.md` SHALL gain a short note: new ADRs must use the
   canonical header block (fields + vocab) and run `just adr-digest` before commit; the digest —
   not raw grep — is the first stop for "is there a decision about X". The `doc-keeper` flow keeps
   authoring ADRs exactly as today otherwise.

## DECISIONS (defaults apply if unresolved when the slice starts)

- **D-infra-d-1:** decision one-liner as explicit backfilled `**Decision:**` field (a) vs extracted
  from the `## Decision` section at generation time (b). **Default (a)** — extraction from
  free prose is brittle and non-deterministic across dialects; an explicit field is gate-checkable.
- **D-infra-d-2:** digest gate in `just ci` (a) vs nightly (b). **Default (a)** — the script is
  sub-second, and drift caught at PR time is the whole point.
- **D-infra-d-3:** subsystem vocabulary as proposed (a) vs amended (b). **Default (a)**; amendments
  go in this slice's ADR.

## Touches

`docs/adr/**` **excluding `docs/adr/README.md`** (header backfill on ~70 files + new `DIGEST.md` +
`design-corpus.json`) · `scripts/adr-digest.mjs` (new) · `justfile` (recipe + ci hook) ·
`evals/fixtures/adr-digest/**` + one new `evals/*.eval.mjs` (do NOT touch `evals/run.mjs` unless
eval registration demands it — if it does, note it: structural, stays serial) · `AGENTS.md` (note) ·
`harness:specs/monster-realm-v2/**` (spec tick). No `Cargo.*`, no schema, no bindings, no client.

## Right-sizing note

If the 70-file backfill makes the PR unwieldy, ship (generator + gate with an explicit
`legacy-tolerance` list + new-ADR convention + fixtures) first and park the backfill as the
follow-up slice — the gate's tolerance list must shrink to empty in the follow-up. Prefer one PR
if reviewable.

## Definition of Done

- [x] All eight EARS criteria demonstrably met (or right-sized park recorded per the note above) — DONE (PR #159; the parked header backfill landed via PR #161)
- [x] `just ci` green locally and remote; digest gate proven to bite via the fixture eval — DONE (PR #159, `adr-digest` eval)
- [x] ADR authored at the supervisor-assigned number documenting the digest convention + vocabulary — DONE (ADR-0104)
- [x] No edit to `docs/adr/README.md`; no renumbering; CHANGELOG via commit messages only — DONE
