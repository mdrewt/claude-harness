# 12r-f — Ledger & doc reconciliation — adjudicated plan

Branch `feat/12r-f-ledger-doc-reconciliation`, worktree `.claude/worktrees/12r-f`, base `5e1a6c0` (#288).
Lenses run on the plan: `planner` (opus) → `reviewer` (opus) + `red-team` (opus) in parallel.
`/simplify` deliberately NOT run on the plan — the reviewer's B1 *was* the simplification pass
(it cut the tolerance set 49 → 5) and a second pass would re-litigate a settled call. `/simplify`
runs on the IMPLEMENTATION instead (step 8), where it has fresh material.

## EARS

- **E1** `CHANGELOG.md` contains every merged PR through HEAD.
- **E2** `just adr-digest-check` FAILS on a fixture corpus with a one-directional
  `Amends`/`Amended-by` mismatch (RED today), and PASSES on the real corpus once the four
  back-links are added.

## Item status

| # | Item | Status |
|---|---|---|
| 1 | CHANGELOG re-drift | **DONE** — commit `8f72bae`, `just changelog`, +27/-0, adds #270–#288 |
| 2 | `ARCHITECTURE.md:193` "empty until EG3" | **PRE-RESOLVED by EG5-7** — verify-only, no edit |
| 3 | Four missing `Amended-by:` back-links | to do |
| 4 | `checkRefs` cannot catch (3) | to do — the real engineering |

## The load-bearing correction to the spec

The spec assumed **4** back-link gaps. Measured with a proper resolver over the real corpus:
**53 forward gaps + 2 reverse** (`0075<-0090`, `0122<-0136`), spanning ~40 ADRs — nearly all
outside `touches:`. A naive corpus-wide error would (a) require editing ~37 out-of-scope ADR
files (hidden-dependency STOP) and (b) break `evals/adr-digest.eval.mjs:273-285` (TOOTH 7),
which pins the real corpus green and is **itself out of scope**. So the gate needs a bounded
scoping rule, and E2's "passes on the real corpus once the four back-links are added" is only
satisfiable with one.

## DECISION — scoping rule: era threshold on BOTH endpoints + a 5-entry shrink-only baseline

Enforce `Amends X→Y ⟹ Y.Amended-by ∋ X` (and the reverse leg) **only when both endpoints are
≥ ADR-0151**, minus an explicit `KNOWN_BACKLINK_GAPS` set. Measured (`/tmp/thresh.mjs`):

| threshold | spec pairs bitten | tolerated fwd | tolerated rev |
|---|---|---|---|
| 0104 | 6/6 | **30** | 1 |
| 0140 | 6/6 | **12** | 0 |
| **0151** | **6/6** | **5** | **0** |
| 0160 / 0162 | 5/6 ✗ | 2 | 0 |

`0151` is forced: one spec pair is `0163->0151`, so the threshold cannot exceed 0151 without
going vacuous; and it is the smallest value that does not drag in out-of-scope debt.
Tolerated set (exactly 5): `0166->0156, 0168->0166, 0169->0154, 0172->0157, 0177->0173`.

**Justification to record:** *both endpoints ≥ 0151 — the oldest ADR this slice repairs. Below
that the corpus predates mechanical enforcement of the ADR-0104 D1 header contract and carries
~48 one-directional links; sweeping them is a separate slice.* An era cutoff is the established
idiom here — ADR-0104 D1 already scopes its own contract to "all new ADRs (≥ 0104)".

**Rejected, with reasons:**
- **Fix all ~40** — hidden-dependency STOP, and 48 semantic claims ("did 0116 really amend
  0103?") nobody in this slice can make. A back-link is a claim, not a formatting fix.
- **49-entry pair-keyed frozen baseline** (the planner's original) — the reviewer's B1 killed
  it: 49 lines of frozen state is a wall nobody reads, and the red-team proved its
  "shrink-only ratchet" does not actually constrain *growth*, so it buys less than it costs.
- **Warn-only corpus-wide** — E2 says *fails*. This is the exact false-green shape the
  `doc-vs-code-ssot-gates` memory warns about.
- **Source-only threshold** (`X >= T`) — the measurement error that made the planner reject
  thresholds. Applying it to both endpoints is the semantically correct form: you can only
  demand a back-link from `Y` if `Y` is in the era where back-links are required.
- **Opt-in set of just the 4 pairs** — zero bite on new drift; item 4's whole point.

## Findings adopted from the review lenses

**Reviewer**
- **B1** era threshold, both endpoints → tolerance 49 → 5. *(verified independently)*
- **B2** resolve ids against the **scanned-file id set**, NOT `allIds` — `allIds`
  (`scripts/adr-digest.mjs:502-508`) also holds harness ids 0002–0034 and all `H-*`, which
  have no local file. Otherwise `0177 Amends ADR-0006` becomes a permanently unfixable
  violation. Keep `allIds` for the pre-existing dangling-ref check only.
- **B3** ratchet must require **both** endpoints present, not just the source — otherwise the
  ratchet fires in fixture dirs and T10 passes for the wrong reason.
- **M1** add a **positive tooth** reading the four real ADR files. T11's source-scan kills one
  cheat shape; it does not kill a second tolerance mechanism, nor going green by *deleting*
  `0151` from 0163's `Amends:`.
- **M2** **ADR-0104 D1 (`docs/adr/0104-m-infra-d-adr-digest.md:45-46`) already states this
  invariant verbatim** — "An ADR that only *amends* another stays `Accepted`; the amended ADR
  gains `**Amended-by:**`." So this slice **mechanizes an existing accepted decision** and
  needs no new ADR. Much stronger than "no number was reserved."
- **M3** resolver hardening (see below). **M4** two-way pin comment for T8.
- **m1** ARCHITECTURE.md paragraph belongs near `:276-282` (where the other generated /
  drift-gated doc policies live), not in the `## Decisions` one-line-per-ADR index.
- **m3** emit the summary through the existing `warnings` array (`:526-528`) so it renders
  with the standard `adr-digest WARN:` prefix. **m5** T9 pins the **exact** tolerated count.
- Corrections: `checkRefs` is `:256-267`; `## Decisions` runs `:308-328` (inserting "after
  :320" would split a sentence); `ARCHITECTURE.md:193` is the content-registry row.

**Red-team (each break reproduced, not hypothesized)**
- **SEV-1 — no negative control on the real corpus.** All 11 proposed teeth go GREEN for
  `if (checkMode) return issues;` or `if (adrs.length > 100) return issues;`. The first is not
  even adversarial — it is a plausible slip. **→ T12 is non-negotiable.**
- **SEV-1 — "baseline the six" reaches green with zero ADR edits**, and T11's literal scan dies
  to `const _P=(a,b)=>a+String.fromCharCode(45,62)+b`. T11 scans a *representation*; T12 tests
  *behaviour*. Same failure shape as the fence-wrapped decoy table from `doc-vs-code-ssot-gates`.
- **SEV-1 — the ratchet does not constrain growth**, only staleness. **→** the eval carries its
  own **frozen copy of the expected key set** (exact count + sorted list, asserted for
  EQUALITY, not containment), so growth needs two edits in two directories and shows in review.
- **SEV-2 — T10 contaminated** by the ratchet (B3). Every tooth must assert the **specific pair
  key** / `obsolete` substring, never just `code !== 0`.
- **SEV-2 — resolver hazards, all reproduced:** `H-0055` collides with project ADR `0055`
  (DIGEST documents that alias space); a 4-digit id inside a parenthetical (`ADR-0913
  (supersedes the 0912 clamp)`) false-REDs; `2026-07-20` in ADR-0137's `Amends:` prose;
  `— (prose…)` means `fieldValue === '—'` is false, so "none" must be detected by *empty
  resolved list*. **→** strip `H-\d+` first; accept bare ids only as standalone comma-separated
  tokens truncated at `(`; exactly-4-digit with non-digit boundaries; dedup.
- **SEV-2 — two real bypasses to fixture:** `**Amended-by:** — (none yet; 0918 deferred…)`, and
  the TOOTH-8-shaped body-block hole (an ADR with only `###` subheads has no `\n## ` boundary,
  so `headerPreamble` treats the whole document as header and a fenced `**Amended-by:**`
  satisfies the check). No current ADR does this, but nothing covered it.
- **SEV-2 — fixture-authoring false green:** an incomplete canonical header makes `validateAdr`
  error, so the tooth passes for a pre-existing reason. **→** every fixture carries a complete
  header, and every fixture dir is RED-proofed against a **pristine** copy of today's script
  (must exit 0 there).
- **SEV-3 — scope deadlock, avoided:** a new ADR would have to `Amends: ADR-0104`, and the new
  gate would then demand a back-link on 0104 — out of scope. We ship no ADR (M2), so this is
  moot. Disclose it: the next ADR that amends 0104 must include 0104's back-link.
- **SEV-3 — E1 / PR #48.** `cliff.toml` sets `filter_unconventional = true`; PR #48
  (`M8.9a — modularization spike … (#48)`, em-dash, no `:`) is unparseable and dropped
  permanently. 265 of 266 merged-PR refs are present. **No E1 gate ships** — ADR-0165
  explicitly rejected the per-PR gate ("a nag that trains people to bypass it") and chose
  nightly, and `.github/**` is out of scope. Disclose #48 as a permanent known exception.
- **SEV-4** validate every baseline key against a literal `/^\d{4}(->|<-)\d{4}$/` at startup and
  hard-error — a typo'd already-fixed entry otherwise rots silently and inertly.

**Deferred (flagged, not built):** the `Amended-by` DIGEST column (rewrites all 143 rows at
`:369-390`, required by neither EARS, and the zero-byte DIGEST diff is itself the evidence);
`Supersedes`/`Superseded-by` bidirectionality; normalizing the 9 bare-form `Amends:` ADRs to
`ADR-NNNN` per ADR-0104 D1; the ~48 sub-threshold gaps.

**Out-of-scope residual for the supervisor:** **ADR-0165 is Accepted but never implemented** —
it says changelog freshness is enforced by a nightly drift check, "implementation defers to
11r-i" (merged as #278). There is no `cliff`/`CHANGELOG` reference anywhere in `.github/`.
That is exactly why CHANGELOG re-drifted a second time. Needs `.github/workflows/**`; not built here.

## Implementation shape — 4 additive edits to `scripts/adr-digest.mjs`

`validateAdr` (`:174`) is per-ADR and structurally cannot do this. Do **not** change its
signature; do **not** touch `checkRefs` (`:256-267`) or `extractAllAdrIds` (`:282-309`) —
TOOTH 5/9 of the unmodifiable `evals/adr-digest.eval.mjs` depend on their exact semantics.

| what | where |
|---|---|
| `BACKLINK_ERA_MIN` + `KNOWN_BACKLINK_GAPS` (5) + key-format validation | new block after `:40`, beside `LEGACY_TOLERANCE` |
| `resolveRelationIds(fieldValue, localIds)` — separate from `extractAllAdrIds` | after `:309` |
| `validateBacklinks(adrs, localIds)` → `[{level,message}]` | after the resolver |
| call site, merging into the existing `errors`/`warnings` arrays | `main()`, after the per-ADR loop ends `:523`, before the warn emit `:526` |

**HARD CONSTRAINT:** no `new RegExp(...)` anywhere (`scripts/adr-digest.mjs:10-11`; Semgrep
`detect-non-literal-regexp` is in `just ci` and has bitten 3×). Literal `/…/`, `indexOf`,
`includes`, char-code only.

## Proof-of-teeth — new `evals/adr-backlink-integrity.eval.mjs` + `evals/fixtures/adr-backlink/`

Brand-new, uniquely-named files only. `evals/adr-digest.eval.mjs` and
`evals/fixtures/adr-digest/` are NOT edited. `evals/run.mjs:8-11` auto-discovers
`evals/*.eval.mjs` non-recursively, so `fixtures/` is safe and no registry needs updating.

| T | what | kills |
|---|---|---|
| T1 | forward gap → fail, msg names the pair key | no forward check |
| T2 | correctly-linked pair → **PASS** | always-red cheat |
| T3 | stderr has `adr-digest ERROR:`, not just WARN | `level:'warn'` downgrade |
| T4 | **bare-form** `Amends: 0915` gap → fail | resolver reuses `extractAllAdrIds` → 0163/0164 invisible |
| T5 | both-bare correct pair → **PASS** | half-normalisation (false-REDs real 0148/0158) |
| T6 | `Amended-by: — (none yet; 0918 deferred…)` → fail | em-dash sentinel + prose-with-id |
| T7 | reverse-only gap → fail | forward-only impl (real shape 0075/0090) |
| T8 | real baselined pair `0168`/`0166` supplied correctly linked → fail `obsolete` | missing ratchet. **Two-way pin comment** |
| T9 | real corpus → **PASS**, output has the summary + **exact count 5** | E2 second half; silent swallow |
| T10 | baselined SOURCE `0166` amending non-baselined `0955` → fail, asserts `0166->0955` | source-keyed baseline |
| T11 | source-scan: none of the 6 spec pair literals in the script | "green by baselining the four" |
| T12 | **NEGATIVE CONTROL** — copy real `docs/adr/` to tmp, strip the 4 added `Amended-by:` lines, run plain **and** `--check`; require exit≠0 **and all six pair keys** | `if(checkMode) return`, corpus-size bypass, obfuscated baseline — the only tooth that survived every red-team cheat |
| T13 | positive: the four real ADR files carry the right `Amended-by:`, and 0163 still declares `Amends: 0151, 0162` | second tolerance mechanism; deleting the `Amends` entry |
| T14 | baseline key set extracted from source **equals** the frozen expected list | baseline growth |
| T15 | body-block bypass: target with only `###` subheads and `**Amended-by:**` in a fenced block → fail | `headerPreamble` hole (TOOTH-8 shape) |

Fixture hygiene: complete canonical headers; ids **≥ 0900** except T8's documented real pair;
every fixture dir RED-proofed against a pristine copy of today's script (must exit 0 there);
assert the specific pair key, never bare `code !== 0`.

## Task order

1. ✅ `just changelog`, first branch commit (`8f72bae`).
2. Verify `ARCHITECTURE.md:193`; no edit.
3. Add the four back-links (`**Amended-by:**` immediately after `**Amends:**`, house position
   per 0119/0122/0090/0155): 0151 → `ADR-0163`; 0162 → `ADR-0163, ADR-0164`;
   0163 → `ADR-0164`; 0174 → `ADR-0175, ADR-0176`.
4. `tester` writes T1–T15 + fixtures (RED).
5. Orchestrator runs the RED proof (the `tester` has no Bash).
6. `specialist` implements the four script edits red→green, without editing the gating tests.
7. `just adr-digest` — assert DIGEST.md diff is **clean** (the deferred-column evidence).
8. ARCHITECTURE.md paragraph near `:276-282`.
9. Impl review: `reviewer` + `red-team` + `/simplify` in parallel → `verifier`.
10. Full `just ci` (explicit PATH export), PR.

Domain auditors (`reducer-security-auditor`, `desync-guard`) deliberately NOT run and recorded
as such: no reducer, no `game-core`, no schema, no wasm boundary, no netcode, no client.
