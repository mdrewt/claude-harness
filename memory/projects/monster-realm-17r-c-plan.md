# 17r-c — PLAN (post plan-review, frozen 2026-09-03)

Branch `feat/17r-c-obs48-justification`; worktree
`projects/monster-realm/.claude/worktrees/17r-c`. Repo: project (`mdrewt/monster-realm`).

## What ships

OBS-48 goes from BLANKET FORBID to REQUIRE-JUSTIFICATION (Drew's ruling on
`https://github.com/mdrewt/monster-realm/issues/342`, 2026-08-28). All code changes live in
`evals/observability-log-wrapper.eval.mjs`; all doc changes in `docs/adr/**` +
`docs/spacetimedb-2.8.1-upgrade-runbook.md`. No new ADR (supervisor-assigned number: None).

## Plan-review outcome (reviewer + red-team, run in parallel)

**Reviewer's "BLOCKER" (a live `ops-agent/` crate enabling `unstable`) was a TORN READ** of the
red-team's concurrent in-worktree experiment. Verified after both closed: `git status --porcelain`
empty, `ls -d ops-agent` → no such directory, and `WORKSPACE_MANIFESTS` (6) == root `[workspace]
members` (5) + root. Dismissed. (Recorded failure mode: review-lens torn reads on a live worktree.)

The red-team's findings are EXECUTED, not speculative, and stand. Triage:

| id | finding | disposition |
|---|---|---|
| S7 | file-granular `site` ⇒ one honest entry permanently licenses every further use in that file | **FIX — `occurrences` exact-count key.** This regression is *created by this slice* (today ANY use fails) |
| S8 | a needle inside a comment makes an entry permanently non-stale ⇒ two-step bypass | **FIX — closed by `occurrences`** (PR-B becomes a 1→2 mismatch). No comment stripping (that would LOOSEN vs. today) |
| S3/S4 | `features = ['unstable']`, `"spacetimedb/unstable"` passthrough, bare `[features]` key all dodge `indexOf('"unstable"')` | **FIX — detect the bare substring `unstable`.** Strict superset of today; measured 0 occurrences in all 7 manifests, so no false red |
| S1 | `use spacetimedb::{procedure, ProcedureContext};` + `#[procedure]` compiles and dodges `spacetimedb::procedure` (repo's OWN idiomatic import style) | **FIX — 3 needles:** `spacetimedb::procedure`, `#[procedure]`, `ProcedureContext`. Measured 0 occurrences today |
| S6 | a `#[spacetimedb::procedure]` in `game-core/src` registers into the shipped cdylib (`nm -D` proof) and is never scanned | **FIX — extend the sweep to `game-core/src`** |
| S5 | `WORKSPACE_MANIFESTS` is hand-maintained; an unlisted manifest is never detected ⇒ never needs justification ⇒ never stale. This slice *entrenches* the list (`site` must be an exact member) | **FIX — derive from root `[workspace] members` and hard-fail on set drift** |
| S11/S14 | `Proxy` / `__proto__`-only / getter entries defeat "exactly N keys" | **FIX — prototype + own-data-descriptor + key-count, all three** |
| S9 | stale=FAIL false-RED teaches "delete the entry", which lands an unjustified live use | **FIX — message points at the DETECTOR, not the entry**; `occurrences` converts most stale cases into count mismatches |
| S10 | `EXPECT: A9-OBS48-OK 6/6` pins array LENGTH, not identity (swap a member, still 6/6) | **FIX — set-equality (S5) + EXPECT the full landing tail** |
| S12 | schema validates syntax not semantics; `why` denylist is leaky (`wip` ⊂ `wipe`) and false-reds | **PARTIAL — drop the denylist** (keep ≥80 trimmed chars); `decision` must resolve to a real ADR, `issue` must be a monster-realm issue URL. `why` quality is review's job; do not pretend otherwise |
| S13 / reviewer M3 | A9b's two whole-file `indexOf`s are satisfied by an HTML comment, a fenced block, a struck-through line, or a REJECTED-alternative sentence | **FIX, narrowed — keep A9b but strip fenced blocks + HTML comments and require both literals ON THE SAME LINE.** Kills 4 of the 5 measured inert placements. Semantic inversion is not defeatable by any presence check — that is review's job, stated as an accepted residual |
| S2 | `procedure` / `HttpClient` are NOT `unstable`-gated in 2.8.1 — the two A9 arms are independent, and the PASS detail asserting both "in one breath" encodes a false premise | **FIX in prose** — PASS detail and the ADR amendment say so explicitly. Adding an `HttpClient` needle is DISCLOSED-NOT-FIXED (out of the EARS) |
| S15 | `RUSTFLAGS`/`build.rs`/CWD/non-array/homoglyph attacks all fail closed | no action (verify-only) |
| reviewer M4 | `evals/observability-stack-config.eval.mjs:32` and `:6988` cite `…eval.mjs:1589` (A10); this slice shifts A10. That file is OUTSIDE `touches:` | **DISCLOSE + follow-up flag.** Not touched |
| reviewer m9 | recording the general cross-dependency policy in ADR-0180 duplicates the harness `standards/` SSOT | **OVERRIDDEN by explicit slice scope** ("General policy to record"). Recorded in ADR-0180 + escalated as a `standards/` follow-up |

## Design (frozen)

### Manifest
`export const UNSTABLE_JUSTIFICATIONS = []` in the eval, before the PROOF-OF-TEETH banner.
Entry = EXACTLY 6 own data keys `{ kind, site, occurrences, decision, issue, why }`:

- prototype `=== Object.prototype`; every key an own **data** descriptor (no getters ⇒ no TOCTOU,
  no `Proxy`, no `__proto__`-only); `Object.keys(e).length === 6`; `UNSTABLE_JUSTIFICATIONS` must
  be a real `Array`.
- `kind` ∈ `'unstable-feature' | 'procedure'` (exact).
- `site`: for `unstable-feature`, an exact member of the DERIVED manifest set; for `procedure`, an
  exact key of the scanned Rust map. Both repo-relative (`server-module/src/lib.rs`).
- `occurrences`: a safe integer ≥ 1 that must **exactly** equal the detected hit count at that site.
- `decision`: `ADR-` + 4 digits, and `docs/adr/<digits>-*.md` must exist (injected `adrExists`,
  defaulting to the real FS impl so the un-overridden path is the production one).
- `issue`: starts `https://github.com/mdrewt/monster-realm/issues/`, non-empty all-digit suffix.
- `why`: trimmed length ≥ 80. No token denylist.
- duplicate `(kind, site)` ⇒ schema error. STALE (site detected 0 times) ⇒ FAIL.

Three properties jointly make a blanket allow-list unrepresentable: exact-site membership,
stale-fails (bounds `entries ≤ detected sites`), and exact `occurrences` (bounds *per site*).

### Detection — strictly ⊇ today, no comment stripping
- manifests: count occurrences of the substring `unstable`.
- Rust src (`server-module/src` **incl. `_tests.rs`**, plus `game-core/src`): summed occurrences of
  `spacetimedb::procedure`, `#[procedure]`, `ProcedureContext`.
- Missing manifest ⇒ hard fail (unchanged). Derived-vs-committed manifest-set drift ⇒ hard fail.

### Exported pure functions (teeth and the real check call the SAME ones)
`deriveWorkspaceManifests(rootCargoText)` · `detectUnstableSites({manifests, srcFiles})` ·
`auditUnstable({manifests, srcFiles, entries, adrExists})` · `formatJustifiedDetail(justified)`.
`validateJustifications` stays module-private (one caller — YAGNI).
`ok` = every bucket empty. Conservation asserted **inside `auditUnstable` on real inputs** (not only
in a tooth): `violations + justified === detected` and `entries === justified + stale`.

### A9b (doc policy, EARS-3)
For each of `docs/adr/0180-…md`, `docs/adr/0197-…md`,
`docs/spacetimedb-2.8.1-upgrade-runbook.md`: strip ``` fenced blocks and `<!-- -->` comments, then
require ≥1 surviving line containing BOTH `require-justification` and
`https://github.com/mdrewt/monster-realm/issues/342`. `docsCited` derived from the loop; 3/3 required.

### PASS detail (every number derived from the run)
Replaces the now-false tail `…no unstable feature, no Procedures, $trace_pair_set empty`:

```
A9-OBS48-OK <mScanned>/<derived.length> manifests + <srcScanned> rust src scanned,
<detected> site(s), <justified> justified, policy cited in <docsCited>/3 docs[: <why…>],
$trace_pair_set empty
```

`A9-OBS48-OK` is a RESERVED token: banned from every failure string (grep must find exactly one
occurrence outside the teeth).

## Teeth (13, appended to the existing in-file `TEETH` array, which runs FIRST + UNCONDITIONALLY)

`T-obs48-clean` (non-vacuity: derived counts match fixture sizes) · `-unjustified-manifest`
(EARS-1 manifest arm) · `-unjustified-procedure` (EARS-1 procedure arm, incl. `_tests.rs`) ·
`-justified-passes` (EARS-2: `why` + issue surfaced verbatim) · `-occurrence-ratchet` (S7/S8 killer) ·
`-stale` (pre-seed neuter) · `-entry-shape` (Proxy / `__proto__` / getter / extra key / missing key /
non-array) · `-duplicate` · `-bad-refs` (bad ADR + bad issue + short `why`; asserts the injected
`adrExists` was actually CALLED) · `-wrong-site-or-kind` · `-detection-not-softened` (single-quote,
`/unstable` passthrough, bare feature key, all 3 procedure spellings) · `-manifest-set-drift` (S5/S10) ·
`-doc-policy` (A9b: fenced block / HTML comment / different-lines all REJECTED; same-line accepted).

Plus a mutation bite-proof matrix pinned by TOOTH ID (not exit code), and two real-tree bite-proofs
(enable `unstable` in a real manifest ⇒ FAIL; add a valid entry ⇒ PASS with the `why` in the detail).
Revert every mutation with `Edit`/`sed`, **never** `git checkout`/`git stash`.

## Docs (append-only; in-body edits preserve line count exactly, `wc -l` verified)

- **ADR-0180 EOF**: `## Amendment — 2026-09-03 (17r-c: OBS-48 is REQUIRE-JUSTIFICATION…)`. P1 the
  ruling (literal `require-justification` + the issue URL **on one line**). P2 the general
  cross-dependency policy (ANY dependency; a gate may require justification, may not forbid on
  once-was-unstable grounds) + the `standards/` escalation. P3 the mechanism + the S2 correction
  (`procedure`/`HttpClient` are NOT `unstable`-gated in 2.8.1 — the two arms are independent).
  P4 the ADR-0224 tension. P5 disclosed residuals. **No `**Amends:**` relation line**; no header edit.
- **ADR-0197**: in-place bracket at `:103`, `[CLOSED …]` at `:300-301`, EOF amendment section.
- **runbook `:167`**: extend the existing single-line table cell in place.
- **ADR-0199 `:129`** (boyscout, in `touches:`): retarget the `…eval.mjs:1629` citation to a landmark.

## Order of work

1. wip: plan + ledger. 2. tester authors teeth+fixtures → apply → confirm RED. 3. specialist
implements pure fns + rewrites A9/A9b + PASS detail + header comments. 4. green; commit **before**
the bite-proof loop. 5. doc edits. 6. bite-proofs. 7. `just lint`, `just adr-digest-check` (must be a
no-op), `just ci` once. 8. `mr-gates check`. 9. review lenses + verifier. 10. PR.

## Accepted residuals (disclosed, NOT fixed here)

- `unstable` TOML escapes and `[patch]`-to-a-forked-crate remain undetected (absurd-obfuscation
  tier; a text scan cannot close them — `cargo metadata` could, at the cost of a cargo invocation).
- No `HttpClient`/outbound-HTTP needle (S2) — outside the EARS.
- `evals/observability-stack-config.eval.mjs:32,:6988` cite `…eval.mjs:1589`; this slice shifts A10.
  Out of `touches:` ⇒ follow-up flag, not touched.
- A9b cannot defeat a deliberately inverted sentence that contains both literals on one line.
- The general cross-dependency policy's canonical home is the harness `standards/` tree (out of repo).
