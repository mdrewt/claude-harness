# M-stdb-2x-module-sdk — bump the Rust module SDK from `spacetimedb` 1.12.0 to 2.8.1

**Status: ✅ EXECUTED 2026-08-16** (slices sdk-a, sdk-b, sdk-c) · **Phase:** post-gate toolchain ·
**Decision:** ADR-0197 (see its "Execution record" for the measured outcome)

> **Closed in the same slice as the CLI upgrade.** This spec was written build-ready and *deferred*,
> on the reasoning that a crate bump could not be verified on CLI 2.6.0. The operator bumped
> `spacetimedb = "2.8.1"` alongside the CLI, which stopped the module compiling — and with the CLI
> at 2.8.1 the whole loop (build → generate → gates) could close locally, so it was executed and
> verified instead of deferred. Every acceptance criterion in §3 was met except **SDK-7's
> "review the diff deliberately"**, which is satisfied by ADR-0197's execution record.
>
> **What actually happened**, against the predictions below:
> - 591 → 0 errors on the three substitutions. **Prediction held.**
> - Schema compatibility (SDK-4): **PARTIALLY MET, and the miss is the headline finding.** 77/77
>   table *names* are byte-identical — but SDK-4 asked the wrong question. Crate 2.8.1 emits enum
>   variant names in **lowerCamelCase** where 1.12.0 emitted **PascalCase**, changing the *column
>   type* of every enum column. Publishing over a pre-bump database **ABORTS** and needs
>   `--delete-data`. Invisible to every source scanner (the Rust identifiers are unchanged), so it
>   surfaced only by publishing over a database created by the OLD module — which is the test SDK-4
>   should have specified in the first place. Client unaffected.
> - Bindings diff: **one file, 202 lines** — exactly as predicted.
> - Teeth: predicted "16", actual **21** (the extra 5 were `ctx.identity()` → `database_identity()`
>   guard needles, which this spec had classified as warning-only and therefore under-counted).
> - New, not predicted: `spacetime describe --json` reducer entries spell the name **`source_name`**
>   in V10, not `name`. §5's fix was necessary *and* the field rename would have silently turned the
>   dev-reducer-leak check into a no-op had its fail-loud guard not caught it.
> - Deliberately NOT done: the npm `spacetimedb` bump (ADR-0197 D2b) — see `sdk-d`.
>
> Retained below as the historical record of the plan and the evidence behind it.

> **Provenance.** Every quantity in this spec was **measured**, not estimated, on 2026-08-16 in an
> isolated `git archive HEAD` copy of the repo with the crate bumped to 2.8.1. Re-measuring is
> cheap and encouraged; the numbers below are the baseline to diff against, not an article of faith.

---

## 1. Problem / intent

The server module builds against `spacetimedb = "1.12"` → crate **1.12.0**, the **last 1.x crate**
(published 2026-02-04, sixteen days before 2.0.0). The CLI/host is **2.8.1**. This is not a
crate/product version decoupling — that belief was false and is corrected in ADR-0197 — it is
simply a pin that never followed the CLI.

It is **not broken**: the module wasm ABI is major `10` on both sides (1.12.0 imports
`spacetime_10.0`…`10.4`; the 2.8.1 host implements `10.5` and accepts any same-major module with a
minor ≤ its own), and `RawModuleDef` still accepts `V8BackCompat | V9 | V10`. So this milestone
buys *correctness of knowledge* and *access to 2.x capability*, not a fix for an outage.

**What being a major behind actually costs today:**

1. **Every fetchable doc describes an API this module does not have.** The gitmcp server, docs.rs
   latest, and the vendor docs site all show the 2.x form (`accessor =`, `ctx.sender()`,
   `ctx.from`, `impl Query<T>`). `M-loop-infrastructure` W0-6 had to record a standing warning to
   agents to *disbelieve the documentation*. That warning is a tax on every server-side loop.
2. **No view primary keys.** `M-postgate-fifteenth-review-residuals` §617-625 and
   `memory/projects/monster-realm-13r-e-plan.md` both record "a 1.12.0 view binding carries no
   primary key" as a constraint shaping the `15r-sec-a` client design. View PKs shipped in 2.6.0
   (Rust/TS/C#) — the constraint is an artifact of the pin, not of the platform.
3. **No 2.x context capabilities** (`CtxDbRead`/`CtxDbWrite`/`CtxWithSender`/… , 2.7.1), no
   `&'static str` column defaults (2.8.1), no granular table traits.

## 2. Measured scope

Bump `spacetimedb = "1.12"` → `"2.8.1"` in the workspace `Cargo.toml`, then:

| Transform | Sites (counted in `server-module/src/*.rs`) | Nature |
|---|---|---|
| `#[table(name = X)]` → `accessor = X` | **45** (of 51 total `#[table(` sites; 38 in non-test files) | mechanical |
| `#[view(name = X)]` → `accessor = X` | **6** (of 8 total `#[view(` sites; 4 in non-test files) | mechanical |
| `#[index(name = X)]` → `accessor = X` | **0** — no index site uses the `name =` form | n/a |
| `ctx.sender` (field) → `ctx.sender()` (method) | **66** compile errors (62 `ReducerContext` + 4 `ViewContext`) | mechanical |
| `ReducerContext::identity()` → `database_identity()` | **7** call sites | deprecation warning only |

**Baseline before transforms:** rustc reports **591 errors**. **542** of those carry an error code
and classify as 469 × E0599 `no method named <table>` on `Local` (all cascading from the failed
`name =` attribute), 66 × E0616 `field sender ... is private`, and 7 × E0277 invalid reducer
signature; the remaining ~49 are uncoded/secondary diagnostics from the same macro failures. The
E0599 cascade is why the raw count looks alarming — fixing 51 attribute sites clears ~469 of it.

**After the two mechanical transforms:** **0 errors.** `cargo check -p monster-realm-module
--target wasm32-unknown-unknown` green. `crates/bindings-macro/src/table.rs` emits the migration
advice in its own compile errors ("If you're migrating from SpacetimeDB 1.*, replace
`name = {sym}` with `accessor = {sym}`"), so the compiler drives this.

**Schema neutrality (load-bearing).** In 2.x, `accessor` names the Rust accessor and `name` (a
*string literal*) optionally overrides the canonical SQL table name. The default canonical name is
the accessor identifier itself — `let table_name = table_ident.unraw().to_string()` in
`bindings-macro/src/table.rs`, with `args.name` used only via `generate_explicit_names_impl`.
Therefore `name = player` (1.x) and `accessor = player` (2.x) produce **the same SQL table
`player`**. No table renames. **This must be re-proved by the acceptance criteria below, not
assumed** — it is the single fact whose failure would be destructive.

> **CORRECTION (post-execution).** The paragraph above is true but was *not sufficient*, and the
> sentence "No migration" that used to end it was wrong. Table-name stability is only one axis;
> crate 2.8.1 also renames every **enum variant** to lowerCamelCase, changing each enum column's
> TYPE. Publishing over a pre-bump database aborts. The lesson for the next bump: a
> schema-compatibility claim is only proved by publishing **over a database created by the previous
> version** — never by inspecting source, generated bindings, or a fresh publish.

**The real work is the gates, not the module.** `cargo test -p monster-realm-module` after the
transforms: **613 passed, 16 failed.** Every failure is a *source-text-scanning* teeth test that
hardcodes the `name =` spelling or pins an exact view body, e.g.:

```
TEETH(M13b EARS-PRIVACY-1): schema.rs must contain `name = shop_row, public` …
vacuity guard(EG5-6): the table-attribute scan found ZERO tables in schema.rs — the scanner
  (or the concat!-assembled marker) has rotted, and a rotted scanner must never read as a
  fusion-free schema
TEETH(ux2 ADR-0154 R1): the `my_wallet` view BODY contains neither `.find(ctx.sender)` nor
  `.find(&ctx.sender)` …
```

The vacuity guards fired correctly rather than passing silently — the gates work, and they are
doing exactly their job. 13 `server-module/src/*_tests.rs` files scan attribute text; several
`evals/*.eval.mjs` scanners do too (`box-view-privacy`, `dev-reducer-gating`, `account-privacy`,
`encounter-privacy`, `battle-schema-snapshot`, `append-only-ids`, `gate-teeth`, … — enumerate by
grepping for `name = ` and `table(` under `evals/`).

**Golden rule #2 applies:** the agent doing the module transform does not also relax the teeth
that gate it. Split into two slices (§4).

## 3. Acceptance criteria (EARS)

- **SDK-1** — THE workspace `Cargo.toml` SHALL pin `spacetimedb = "2.8.1"`, and `Cargo.lock` SHALL
  resolve `spacetimedb`, `spacetimedb-bindings-macro`, `spacetimedb-lib`, `spacetimedb-sats` and
  `spacetimedb-primitives` to `2.8.1`.
- **SDK-2** — WHEN `cargo check -p monster-realm-module --target wasm32-unknown-unknown` runs
  THE SYSTEM SHALL report zero errors AND zero `deprecated` warnings (i.e. `ctx.identity()` has
  been migrated to `ctx.database_identity()`).
- **SDK-3** — THE module SHALL contain no occurrence of `(name = ` inside a `#[table]`, `#[view]`
  or `#[index]` attribute, and no bare `ctx.sender` field access; an eval SHALL enforce both so
  the 1.x spelling cannot silently return.
- **SDK-4 (destructive-change gate — the one that matters)** — ~~WHEN the 2.8.1-built module is
  published to a database carrying the pre-bump schema THE SYSTEM SHALL complete an automatic
  migration with no table renames, no column changes and no `--delete-data`.~~
  **OUTCOME: NOT MET, by design-of-the-platform rather than by defect.** Table names held (77/77),
  but enum variant casing changed every enum column's type and the republish aborts. **Accepted**
  with a `--delete-data` republish because the project is pre-launch and its only databases are
  local playtest/e2e fixtures (ADR-0197 D2a).
  **The proof obligation as originally written was defective** — diffing the table-name set cannot
  see a column-type change. The correct obligation, for any future bump, is: publish the OLD module
  to a scratch database, then publish the NEW module **over it**, and require exit 0 without
  `--delete-data`.
- **SDK-5** — THE 16 failing source-scanning teeth tests SHALL be updated to assert the 2.x
  spelling, preserving their intent and their vacuity guards. A scanner SHALL NOT be weakened to a
  substring that both spellings satisfy; it SHALL assert `accessor = X` specifically, so the gate
  keeps biting.
- **SDK-6** — THE `evals/` scanners keyed on the attribute syntax SHALL be updated in the same
  commit, and `just eval` SHALL be green.
- **SDK-7** — WHEN `just gen` regenerates the TypeScript bindings on CLI 2.8.1 THE resulting diff
  SHALL be reviewed and committed deliberately. Expected shape (measured with a real 2.8.1 CLI
  against this module): **exactly one file changes** — `client/src/module_bindings/index.ts`,
  ~202 lines — no files added or removed. The change is camelCase handles (2.7.0) plus the
  `cliVersion` literal. Client source needs **no** edits: snake_case survives as `@deprecated`
  runtime getters *and* TS types, and `tsc --noEmit` passes on all ~23 existing snake_case
  accessors.
- **SDK-8** — THE bindings-drift eval SHALL be green against the regenerated bindings.
- **SDK-9** — `just ci` SHALL be green, and the recruit e2e (ADR-0086 `--bin-path` path) SHALL
  still publish and pass.
- **SDK-10 (regression guard)** — `scripts/verify-release-reducers.mjs` SHALL parse the **V10**
  `spacetime describe --json` shape (`{"sections":[…]}`) as well as the legacy flat
  `{"reducers":[…]}`, with its fail-loud behaviour preserved. See §5.

## 4. Slices

- **sdk-a — module transform.** The two mechanical transforms + the 7 `database_identity()`
  migrations + `Cargo.toml`/`Cargo.lock`. Leaves the 16 teeth red *on purpose*; sdk-a is not green.
- **sdk-b — gate re-baseline.** Update the 16 Rust scanners and the `evals/` scanners to the 2.x
  spelling (SDK-5/SDK-6), authored by a different agent than sdk-a. Ends green.
- **sdk-c — bindings + client.** `just gen`, review and commit the bindings diff, bindings-drift
  eval, full `just ci`, e2e (SDK-7/8/9).
- **sdk-d — opportunistic follow-ups** (separable; do not block a–c):
  - view **primary keys** are now available — revisit `15r-sec-a`'s client design and the
    "no view PK in 1.12.0" constraint in `M-postgate-fifteenth-review-residuals` §617-625.
  - migrate the client off the `@deprecated` snake_case aliases before they are removed in 3.x.
  - consider bumping npm `spacetimedb` 2.6.0 → 2.8.1 — **independent** of the CLI bump (verified:
    a 2.8.1 SDK typechecks against 2.6.0-generated bindings and vice versa). Note 2.7.1 added SDK
    auto-reconnect on `visibilitychange`/`focus`/`online`/`pageshow`; re-verify the hand-rolled
    reconnect epoch guards (ADR-0085/nh3/nh4) when it lands.

## 5. Known post-upgrade breakages (independent of this spec; fix wherever they surface first)

- **`spacetime describe --json` changed shape at host 2.8.0.** The CLI now requests schema
  `version=10`, emitting `RawModuleDefV10` (`{"sections":[…]}`) instead of flat
  `RawModuleDefV9` (`{"reducers":[…],"tables":[…]}`); reducer entries lose `lifecycle` and gain
  `source_name`/`visibility`/`ok_return_type`/`err_return_type`.
  `scripts/verify-release-reducers.mjs` tries `parsed.reducers` then `parsed.schema.reducers`,
  matches neither, and **throws** — loudly, as designed. `just playtest-publish` →
  `just playtest-verify-release` calls it, so **the playtest publish flow is broken until this is
  fixed**. `evals/playtest-verify.eval.mjs` pins the 2.6.0 shape as its GOOD fixture and must gain
  a V10 fixture alongside it (keep the V9 one — the parser should accept both).
- **2.7.1 made V10 serialization retain column defaults**, shifting `describe`/schema-snapshot
  output again. Re-baseline `battle-schema-snapshot` / `spacetime-type-snapshot` deliberately.
- **2.8.0 quieted routine host logs** ("reduced to quieter levels or module logs" for connection
  lifecycle, SQL queries, JWT lookups, migration planning, reducer errors). `mr-trace-relay`
  (ADR-0191) pairs **module-emitted** `log::` breadcrumbs from `observability.rs`, which should be
  unaffected — **verify, do not assume**. `trace-pair-set.json` is currently an empty scaffold.

## 6. Non-goals

- **RLS.** `#[client_visibility_filter]` is still `unstable`-gated and still carries
  `// TODO: RLS filters are currently unimplemented, and are not enforced.` — verified byte-identical
  at 1.12.0 and 2.8.1. The re-open triggers in M20 OBS-15/OBS-47, `validation-checklist` item 1,
  M6/M16/M19/M25 and `security-threat-model` **do not fire**. Private table + owner-scoped
  `#[view]` stays the pattern. Do not spend a slice re-checking this; ADR-0197 records the check.
- **Procedures.** **NOT a non-goal by default any more, but out of scope for slices a–c.**
  `#[procedure]`/`ProcedureContext` are `#[cfg(feature = "unstable")]` at crate 1.12.0 but
  **ungated at 2.6.0 and 2.8.1** — Procedures are stable in 2.x (ADR-0197 FF4). M20 OBS-48's
  prohibition on `features = ["unstable"]` and ADR-0180's "adopt a BETA API?" framing both rest on
  the 1.12.0 gate. Once the crate bump lands, that premise is gone and the outbound-HTTP question
  must be **re-adjudicated**, not inherited. Do it as its own decision (`sdk-d` or an M20 follow-up)
  — do not quietly enable anything during a–c.
- **Rust submodules.** 2.8.0's submodule support is **TypeScript-only**; ADR-0055/0056's
  intra-crate module split is unaffected.
- **`--features` passthrough.** ADR-0197 corrects the ADR-0054 fact but explicitly does not mandate
  replacing ADR-0086's `--bin-path` machinery.

## 7. Rollback

`git revert` the sdk-a..sdk-c range and `spacetime version use 2.6.0`. Because SDK-4 proves the
schema is unchanged, a revert needs no data migration in either direction — the same wasm ABI major
and the same table names are valid on both hosts. Verify by republishing the reverted module and
re-running `just eval`.
