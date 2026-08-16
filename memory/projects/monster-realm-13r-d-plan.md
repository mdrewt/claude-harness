# 13r-d — Append-at-end schema-gate generalization — PLAN (locked after 3 review lenses)

Branch `feat/13r-d-schema-gate-order`, worktree `.claude/worktrees/13r-d`, ADR **0193**.
`touches:` evals/battle-schema-snapshot.eval.mjs, evals/baselines/table-schemas.json,
evals/bsatn-compat-smoke.eval.mjs (+ docs/adr/0193-*.md, docs/adr/DIGEST.md (generated),
ARCHITECTURE.md minimal).

## Problem
`checkSchemaDrift` compares columns as an unordered name→type map. Live spacetime 2.6.0
accepts an automigration ONLY as tail-appended columns each carrying `#[default(...)]`.
A mid-struct insert + the sanctioned re-baseline is GREEN today.

## What the review lenses killed (v1 design)
- **Dead rules (red-team C1, measured):** any rule keyed on "parsed columns absent from the
  *working-tree* baseline" is empty by construction after a re-baseline — the regenerator
  writes the new column into `order` first. A no-default tail append was GREEN on 33/38 tables.
- **Strawman tooth (reviewer B-3):** the file's own documented regeneration says "re-derive
  from source", so a hand-built half-regenerated baseline is a state the workflow never
  produces. An append-only-by-discipline ledger is not a gate.
- ⇒ the previous baseline must come from **git**, not the working tree. In-repo precedent,
  same directory, already green in CI: `evals/spacetime-type-snapshot.eval.mjs:174-314`
  (`checkAppendOnly` + `readPrevBaseline`, ADR-0116 D2/D3, fail-open-LOUD).

## Locked design (v2)

### Parse once, project twice (kills two-parser divergence)
File-local `parseTableFields(rawSrc)` → `{table: {pk, fields:[{name,type,hasDefault}]}}`.
`parseTableSchemas` becomes a thin projection over it — **return shape and `columns` key
insertion order unchanged** (load-bearing for scripts/okf-export.mjs:276 → docs/knowledge/**,
evals/gate-teeth.eval.mjs, evals/guest-claim-integrity.eval.mjs — all out of scope).
`hasDefault` is derived from the field's own pending attribute lines (never a file-level
scan: content_tests.rs/marshal_tests.rs carry `#[default(` inside string literals).

### Rules (all always-on, all pure functions, all tagged in the message)
- `[parse-shape]` P1 — any non-blank, non-`#[` line inside a table body that does not match
  the field regex is a hard fail (measured: 0 such lines today). Also rejects same-line
  attr+field and a second ` pub ` on one line. Closes: one-line attr+field, two fields per
  line, `r#type`, multi-line `#[default(...)]` bodies, multi-line types.
- `[table-count]` P2 — occurrences of `#[spacetimedb::table(name` in **string-and-comment
  stripped** source (`stripRustSource` from the existing shared `evals/rust-scan.mjs`; import
  only, never modified) must equal the parsed table count. Measured 38 == 38 today (a naive
  strip gives 40 — two decoys in economy_tests.rs string literals). Closes: a table hidden by
  `columns = [...]` in the table attribute, a two-table struct, and a stray `/*` swallowing
  a struct. The parser itself keeps its existing stripper — okf-export behaviour is untouched.
- `[order-shape]` S1 — every baseline table carries `order`: an array of unique strings that
  is an exact permutation of `Object.keys(columns)`. Missing/short/dup/non-array = fail loud.
- `[order-mismatch]` S2 — for tables in both parsed and baseline, source field order must
  equal `baseline.order` element-wise (intersection-filtered, so a removal does not cascade).
- `[order-append]` S3 — parsed columns absent from `baseline.order` must sit after every
  ledger-known column AND carry `#[default(`.
- `[defaults-not-suffix]` B1 — within **baseline-known** tables only, no non-defaulted column
  may follow a `#[default(`-annotated one. Message names the two sanctioned escapes (move the
  column to the tail / give it a default; or a delete-data migration per the ADR-0177 runbook
  that also drops the stale defaults). **No allowlist** — an exemption mechanism is unclosable.
- `[append-only]` G1 — **the re-baseline-proof half.** Resolve the previous committed baseline
  via git (merge-base HEAD origin/master → origin/master → give up), then per table present in
  both: `prev.order` must be a positional **prefix** of `new.order`, and every column beyond
  that prefix must carry `#[default(` in source. A table present in prev and gone from new is
  flagged (a table drop is a live-DB break, ADR-0177 runbook). **Fail-open-LOUD** when git or
  the prior blob is unavailable — the reason is stated in `detail` (ADR-0116 D2 precedent).
  G1 is what makes a mid-struct insert / reorder / removal / rename / no-default append RED
  *after* a full, sanctioned re-baseline.

### Baseline format (spec mandate: "extend the baseline format to record column order")
Per table, nested and written **after** `columns`: `"order": ["col", ...]`.
Top-level table key order preserved; `JSON.stringify(x, null, 2) + "\n"` round-trips the
current file byte-identically (verified). JSON is excluded from biome, so no formatter churn.
Regeneration = re-derive from source (unchanged workflow); G1 is what polices the result, so
no `mergeColumnOrder` and no append-only-by-discipline fiction. (Reviewer M-1 argued `order`
duplicates the `columns` key order and should be dropped; the spec mandates recording order
explicitly, S1 polices the two copies' agreement, and G1 needs a stable explicit record —
recorded as a considered alternative in ADR-0193.)

## Proof-of-teeth (all pure-function fixtures; no git needed to bite)
1. **T-MANDATE** mid-struct insert + FULL re-baseline (columns AND order re-derived) →
   `[append-only]` RED via G1 against the prior baseline; asserts `checkSchemaDrift` returns
   `[]` for the same input, proving the bite comes from the new gate.
2. **T-B1** same fixture through the defaults-suffix rule with no baseline at all → RED.
3. **T-NODEFAULT** tail append without `#[default(` + FULL re-baseline → `[append-only]` RED
   (the exact class red-team measured GREEN on 33/38 tables), on a table with no other defaults.
4. **T-LEGAL** legal tail append WITH a default + full re-baseline → GREEN from every rule
   (false-RED guard; asserts table/column counts first so it cannot pass vacuously).
5. **T-SWAP** two existing columns swapped, name→type map byte-identical → `[order-mismatch]`;
   asserts `checkSchemaDrift` returns `[]` (a capability the old gate structurally lacked).
6. **T-SHAPE** `order` truncated / duplicated (`["id","alpha","alpha"]`, right length) →
   `[order-shape]`; kills a length-only check.
7. **T-REMOVE** a column removed vs the prior baseline → `[append-only]` (prefix shrink).
8. **T-PARSE** a table body line that is neither blank, attribute, nor a field → `[parse-shape]`;
   and a table hidden by `columns = [...]` in the attribute → `[table-count]`.
9. **T-IDEMPOTENT** each parser called twice on the same source returns deep-equal results
   (kills a module-level `/g` regex `lastIndex` leak).
10. **T-REAL** real source vs the committed baseline: every rule clean; `detail` reports the
    number of order-checked tables and the G1 prev-baseline source (or the loud fail-open reason).
Every tooth asserts the **rule tag**, never merely `length > 0`.

## Non-negotiable constraints (verified against the files)
- `checkSchemaDrift` semantics/signature unchanged (gate-teeth feeds it synthetic `{pk,columns}`).
- `parseTableSchemas` return shape + `columns` insertion order unchanged.
- Never throw: malformed baseline / missing table / non-array `order` return a tagged string.
- `execFileSync('git', [constant args])` only — never a shell string; no `new RegExp`
  (Semgrep detect-non-literal-regexp is remote-only).
- ADR-0193 carries **no `**Amends:**` header** (reciprocity would drag an out-of-scope ADR file
  into the diff); ADR-0173/0174/0116/0006 are cited in prose only.

## Known residuals (record in the ADR / PR, do not fix here)
- Adding `order` to the same JSON object weakens the *name-only* needle in
  `server-module/src/content_tests.rs:2500` and `m14_5d_1a_tests.rs:264` (both retain a typed
  assertion that still bites). Out of scope → follow-up flag.
- `#[default (0)]` (space) and `cfg_attr`-wrapped defaults are not recognised; the repo's 32
  sites all use `#[default(`. Documented in the failure message.
- G1 fails open (loudly) with no git / no origin/master; the in-tree rules remain the teeth.

## Task order
1. tester: teeth T-* into evals/battle-schema-snapshot.eval.mjs (RED).
2. orchestrator: run `node evals/run.mjs` → capture RED.
3. specialist: implement parseTableFields + the six checkers, wire into the default export.
4. orchestrator: regenerate the baseline (one-shot), verify the diff is purely additive.
5. specialist: header regeneration comment + the two bsatn-compat-smoke cross-reference comments.
6. auditors + verifier; full `just ci`; manual bite-proof on schema.rs (path-scoped revert).
7. doc-keeper: ADR-0193, ARCHITECTURE.md, DIGEST regen.
