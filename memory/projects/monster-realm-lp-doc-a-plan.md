# lp-doc-a — plan (2026-08-21)

Slice: `lp-doc-a` — Close the obsolete residual prose. Repo: mdrewt/monster-realm.
Branch `feat/lp-doc-a-close-obsolete-residual-prose`, worktree `.claude/worktrees/lp-doc-a` from origin/master a5179ac.
ADR reserved: **0202**. touches: `docs/adr/` (+ ARCHITECTURE.md as an always-in-scope companion).

## Measured facts (planner-verified)

### m20e-2 / m20b-2 — 5 of 6 parked items SHIPPED, 1 remains
Closed by 13r-b, commit `7bba44e`, ADR-0191.
| # | parked item (ADR-0180:1020) | state |
|---|---|---|
| 1 | docker-compose relay service | SHIPPED (ADR-0191 D1-D4; eval G9n) |
| 2 | `:ro` module-logs mount | SHIPPED (ADR-0191 D2) |
| 3 | prometheus `job="mr-trace-relay"` | SHIPPED (G9o) |
| 4 | Grafana dead-man's-switch rule | SHIPPED (G9p) |
| 5 | `/health` endpoint | SHIPPED (daemon.mjs:93-103) |
| 6a | tail-follow daemon | SHIPPED (D5/D6) |
| 6b | **OTLP POST client** | **STILL OPEN** — re-parked as P5, `evals/observability-stack-config.eval.mjs:179-199` |

### ADR-0180:1032 four boot defects — MISFILED in the slice brief
Owner is **13r-a / ADR-0190**, not 13r-b/ADR-0191. alloy(D2), caddy setcap(D3), grafana interval(D4) FIXED;
tempo undefined flag (D1) and a 5th defect caddy port-80 redirect (D3b) STILL PARKED.

### nh5 — SHIPPED by 13r-f, commit `7e08d36`, ADR-0192. ADR-0192 carries 4 of its own follow-ups.

### 14r-f-2 — REAL, STILL OPEN. Sole repo mention `docs/adr/0188-*.md:137`. Verified open
(`evals/baselines/species-ids.json` + item/skill siblings still flat id arrays ⇒ id reuse stays green).
No slice exists in any spec; creating one = harness `specs/` edit = HIDDEN DEPENDENCY. Record + escalate.

### 11r-e-1/-3/-9 — NOT residuals. EARS acceptance criteria of shipped slice 11r-e (ADR-0169),
with live passing tests (`client/src/net/connection.test.ts:1428,1584,1704`, `client/e2e/wallet-balance.spec.ts:13,1053-1064,1152`).
Recorded reason: "never residuals — an EARS-id/residual-id namespace collision".

### ADR-0186:177-180 — false. Gate is GREEN: `18 gated / 10 migrated / 7 debt / 1 not-applicable`.
Eval's own header (`evals/scanner-migration-audit.eval.mjs:20-21`) is already correct past tense.

### design-corpus.json is an INPUT, never generated (`scripts/adr-digest.mjs:110,777-781`; sole write is `:864` → DIGEST.md).
The spec's "regenerate ... design-corpus.json via just adr-digest" is factually wrong.

## Task list
T1 NEW `docs/adr/0202-residual-corpus-closure.md` — Amends 0180, 0152, 0186, 0188. Decision line ≤240 chars.
T2 ADR-0180: `:11` append `, ADR-0202`; end-of-line clauses at `:1020` and `:1032`; EOF amendment with
   `### Residuals — closure status` table. **ZERO inserted lines above :1032** (13 external line citations point in).
T3 ADR-0152: `:8` append `, ADR-0202`; end-of-line clauses at `:68`, `:74`. No renumbering (tests cite "residual #4").
T4 ADR-0085: `:271` end-of-line REVISITED clause. No header relation (below BACKLINK_ERA_MIN).
T5 ADR-0186: insert `**Amended-by:** ADR-0202` after `:8`; **rewrite** `:177-180` in place. Leave `:194`.
T6 ADR-0188: insert `**Amended-by:** ADR-0202` after `:7`; append 14r-f-2 triage clause to the `:134-145` paragraph.
T7 re-grep `ADR-0180:`/`0186:`/`0188:`/`0152:` repo-wide — no cited line number moved.
T8 RED capture: `just adr-digest-check` must exit 1.
T9 `just adr-digest` (never hand-edit DIGEST.md; never touch design-corpus.json).
T10 GREEN capture + Evidence B (temp-dir corpus copy) + C (`import().then(m=>m.default())`, no main guard) + D (`just ci`).
T11 ARCHITECTURE.md: append one `**lp-doc-a**` entry after `:1439`, ending `ADR next-free = 0203.`
T12 Escalate: 14r-f-2 ownership, P5 remainder, ADR-0190 D1/D3b parked, 4 doc-drift sites.

## Corpus-gate contract (scripts/adr-digest.mjs)
Required header fields all at column 0 above the first `## `: Status(Accepted/Superseded/Deprecated),
Date, Slice, Supersedes, Amends, Subsystems(1-3 from the 10-value vocab :22-33), Decision(≤240 chars, one line).
Amends↔Amended-by reciprocity enforced both directions when BOTH ids ≥ 0151. `KNOWN_BACKLINK_GAPS` is
shrink-only and its count (5) is asserted by `evals/adr-backlink-corpus.eval.mjs` T9 — do not perturb.

## Proof of teeth
`evals/adr-digest.eval.mjs` TOOTH 6 (`:206-258`) already builds the stale-digest RED. Demonstrate, don't build.
Evidence A = natural in-tree RED→GREEN; B = temp-dir corpus copy with an un-regenerated DIGEST + anti-vacuity control.

## Hidden dependencies (record, do NOT edit)
`docs/specs/nh3-plan.md:251` · `client/src/prediction/predictor.ts:~390` ·
`ops/observability/tempo/tempo-config.yml:5` + `grafana/provisioning/datasources/datasources.yml:16` (stale m20b-2 labels) ·
`evals/scanner-migration-audit.eval.mjs:137-185` (14r-c-2 owner field — assigned to 15r-sec-mig-a) ·
harness `specs/**` (creating slice 14r-f-2) · `docs/adr/README.md` (FORBIDDEN) · `CHANGELOG.md` (FORBIDDEN).
`docs/knowledge/**`: no action — this slice touches no reducers/modules.

## Top anti-patterns
Blanket "m20e-2 SHIPPED" hiding P5 · misattributing the boot defects to ADR-0191 · inserting lines above 0180:1032 ·
deleting historical park prose instead of annotating · filing the closure under 0180:991 (that's m20c's list) ·
renumbering 0152's residuals · appending rather than rewriting 0186:177 · regenerating design-corpus.json ·
hand-editing DIGEST.md · touching the ratchets · >240-char Decision · indented `**Amended-by:**` ·
running eval files directly (no main guard) · promising a fictional owner slice for 14r-f-2.
