# 14r-f — Small-hygiene sweep: routed-but-never-queued residuals — BUILD PLAN

Branch `feat/14r-f-small-hygiene-sweep`, worktree `.claude/worktrees/14r-f`, base `origin/master` @ 4fd3c6e.
ADR number reserved: **0188**.

## RIGHT-SIZING VERDICT (accepted from planner, opus/high)

**Ship items 1–3 (EARS-1/2/3). PARK item 4 (EARS-4, map-shaped id baselines) as `14r-f-2`.**

Rationale (concrete):
- Items 1–3: ~25 lines prod diff + ~890 lines test/eval across 8 files; zero novel policy —
  1 and 2 are mechanical applications of already-decided ADR-0170 D5 / ADR-0122 D1.
- Item 4 alone: 3 new baselines (32 hand-derived bindings), a NEW eval of 600–900 lines
  (its two templates are 1719 and ~1200 lines), and **two undecided policy questions**:
  (a) is a *rename* a rebind? (name-keyed map reds on flavour renames; content-hash key reds
  on every stat tune — neither is obviously right); (b) retired-id semantics conflict —
  `evolution-path-edge-ids.json` permits removal-with-permanent-entry, `species-ids.json`
  forbids removal outright; a map-shaped species baseline must state which rule wins while the
  flat baseline + `BASELINE_ID_FLOORS` + tooth-owned `baselineFloor` keep working unchanged.
- Explicitly NOT taking the middle option (1–3 + species-only item 4): species-only leaves the
  identical disclosed hole open for items and skills, still costs 400–600 lines and both policy
  decisions. Half a gate on a disclosed hole reviews worse than a clean, recorded deferral.

## VERIFIED SEAM FACTS

- `crate::guards::json_escape` @ `guards.rs:31`, `pub(crate)`. `evolution.rs:19` does NOT import it today.
- Raw `{e}` sites in evolution.rs: **`:202-204`, `:220-222`, `:233-235`** (three). `:194-196`
  (constant reason) and `:245-247` (`{steps}`, u32) are NOT in scope.
- `guards::is_in_ongoing_battle` @ `guards.rs:302` → both-role `is_in_ongoing_battle_either_role`
  @ `:286`. Already imported at `movement.rs:16`. Existing call sites: `movement.rs:133,195,358,395` = 4.
- `BattleOutcome` used in movement.rs at EXACTLY ONE place (`:430`, the inline filter) → the
  `movement.rs:29` import must be dropped in the same hunk or `-D warnings` fails.
- `MAX_TRADE_MONSTERS_PER_SIDE: usize = 64` @ `trading.rs:37`; `trading.rs:44` is `n > MAX` →
  **64 is LEGAL, 65 rejects**. Client clause must be `<= 64`, never `< 64`.
- `buildProposeSubmission().canSubmit` already drives `tradeProposeView.ts:225`
  (`#submitBtn.disabled`) and the `#submit()` re-check at `:231` → **no view edit needed**.
- `evals/run.mjs:11` globs `*.eval.mjs` → a NEW eval file auto-discovers; run.mjs NOT touched.

## BUILD STEPS (strict test-first)

### A — Item 2 (both-role grass guard) — do FIRST, it has the mechanical fallout
A1. Ratchet the two count pins (goes RED immediately, by design):
    - `movement_tests.rs:1237-1238` `is_in_ongoing_battle(` 4 → **5**; re-derive the arithmetic
      prose at `:1240-1242` AND the doc block at `:1121-1123`.
    - `movement_tests.rs:464-465` `battle()` file-wide 1 → **0** (STRICTLY STRONGER; the existing
      message at `:476-477` pre-authorises exactly this).
A2. New shape test `grass_encounter_pre_check_uses_the_both_role_ssot` in `movement_tests.rs`,
    modelled on `e3_warp_guard_uses_the_both_role_ssot_with_the_player_identity` (`:358`),
    scoped to the existing `grass_region(&body)` helper (`:1515`):
    contiguous needle `letalready=is_in_ongoing_battle(ctx,player_identity);` ·
    `player_identity()` count == 0 in grass region · `ctx.sender` count == 0 in grass region ·
    `if already{continue;}` survives (anti-vacuity).
A3. Proof-of-teeth: restore the inline filter in a scratch build, observe A1+A2 RED, revert.
A4. Source: `movement.rs:425-430` → `let already = is_in_ongoing_battle(ctx, player_identity);`
    + ADR-0166 R4 / ADR-0122 D1 comment; drop `BattleOutcome` from `:29`.
    **Keep the binding name `already`** — `movement_tests.rs:2434-2439` enumerates every named
    binding in `movement_tick` to justify the `let _`-count-zero teeth at `:2441-2462`.
A5. **MANDATORY eval co-change** — see §W3 below.

### B — Item 1 (json_escape in evolution.rs)
B1. Tests first in `evolution_tests.rs`, porting the STRUCTURE of `battle_tests.rs:3473-3610+`
    with a distinct prefix (`EG14F_*`, not `D12R_*`) so concatenated scan blobs cannot collide.
    Must run over RAW `EVOLUTION_RS_SOURCE` (`evolution_tests.rs:1479`), NOT
    `strip_comments_and_strings` (`:1632`) — the stripper blanks string literals and the format
    string IS the thing under test.
    - C-1 `evolution_reason_log_sites_interpolate_an_escaped_binding`: ASSERTION-RED at HEAD,
      one row per site, `expected_sites` pinned exactly, `raw` = bare `{e}`, `capture` = escaped
      binding name, argument spelling pinned as `&e)` incl. closing paren.
    - C-2 (separate #[test], green-at-HEAD, own bite proof): compose the escaped line for
      adversarial inputs (`"`, `\`, `\n`, control chars); assert HEAD's unescaped composition
      fails at least one oracle.
B2. Source: add `json_escape` to `evolution.rs:19`; at `:202`/`:220`/`:233` bind
    `let reason = crate::guards::json_escape(&e);` (NAMED binding) and interpolate `{reason}`.
B3. Memory-note compliance: spell `"`/`\` as `0x22`/`0x5C` constants; write no `/*` in comments;
    scrub per file. A stray `/*` in a new evolution.rs comment reds movement's tests too.

### C — Item 3 (trade cap client bound)
C1. `tradeProposeModel.test.ts` boundary table on `selectedMonsterIds.length`:
    0, 1, 63 → canSubmit true · **64 → TRUE (cap is inclusive server-side)** · 65 → false,
    `args === null` · 1000 → false. Plus: the const is exported and `=== 64`.
C2. NEW `evals/trade-cap-parity.eval.mjs` (name deliberately NOT `*-security`/`*-privacy` —
    that suffix is the enumeration key for `scanner-migration-audit.eval.mjs:112-124`, whose
    `KNOWN_UNMIGRATED_CAP` is exactly 7 → instant RED):
    reads `trading.rs` via `evals/rust-scan.mjs` `stripRustSource` + `assertStripperSound(`
    (ADR-0181/0186 house standard) · LITERAL regex only (semgrep `detect-non-literal-regexp`) ·
    fail-loud if either side absent · asserts equality AND that the TS const is `export`ed
    (an inlined `64` must not satisfy it) · proof-of-teeth: Rust=128/TS=64 fixture FAILS with
    the mismatch rendered; TS-side-bare-literal fixture FAILS.
C3. Source: `export const MAX_TRADE_MONSTERS_PER_SIDE = 64;` with a doc comment naming
    `trading.rs:37` as SSOT, "MIRROR gated by evals/trade-cap-parity.eval.mjs, not a second
    SSOT", and that the cap is INCLUSIVE. Then add the clause to `canSubmit`; keep TOTAL.

### D — docs
ADR-0188 · `just adr-digest` · `docs/knowledge/**` (run `just knowledge` AFTER the source
commit — it stamps `gitDate(schema.rs)`) · minimal ARCHITECTURE.md touch if warranted.
`CHANGELOG.md` is git-cliff-generated — NEVER hand-edit. `docs/adr/README.md` — supervisor-owned,
do NOT touch.

## §W3 — THE SHARPEST HIDDEN CONSEQUENCE (must not be missed)

`evals/zone-warp-server-runtime.eval.mjs:271-308` `checkWarpBattleGuard` (W3) counts
`is_in_ongoing_battle(` AFTER `warp_at(` and fails only on `=== 0`. Item 2 takes that count
1 → 2, so **W3 does not go red — it goes HOLLOW.** Its docstring (`:251-255`) claims "this check
sees the warp guard and only the warp guard — delete it and the count drops to zero"; after
item 2 that is FALSE (delete the warp guard, the grass block's SSOT call holds the count at 1,
W3 passes with the C1 security finding fully live).
FIX: region-scope the scan to `warp_at(` … `stepped_onto_grass(`, rewrite the docstring, and add
a NEW BAD fixture (warp guard deleted, grass SSOT call present) shown flagged. Re-verify
`BAD_MOVEMENT_TICK_INLINE_SINGLE_ROLE_WARP_GUARD` (`:598-599`) and the `:941-965` bite proof
still bite under the narrowed region.

## PINS THAT RED / MUST CHANGE

| # | Site | Now | Becomes | Kind |
|---|---|---|---|---|
| 3.1 | `movement_tests.rs:1237-1238` | 4 | 5 | arithmetic gains a term |
| 3.2 | `movement_tests.rs:464-465` | 1 | **0** | strictly stronger ratchet |
| 3.3 | `movement_tests.rs` prose `:11,:24,:247-249,:275,:319-321,:324-329,:338,:352-357,:469-472,:2880-2881` | "R4 out of scope" | R4 CLOSED | prose only |
| 3.4 | `evals/zone-warp-server-runtime.eval.mjs:271-308` | unscoped | region-scoped + new BAD fixture | HOLLOWING (see §W3) |
| 3.5 | `movement.rs:29` | imports `BattleOutcome` | drop | `-D warnings` |
| 3.6 | `guards_tests.rs:998` | prose "exactly 4×" | STALE, **out of touches — DO NOT EDIT** | record in ADR |

NOT affected (verified): `append-only-ids.eval.mjs` floors (item 4 parked) ·
`evolution_tests.rs:2387-2414` (`json_escape` is not a banned needle) · `:2718` ·
`movement_tests.rs:2211-2223`, `:2443`.

## ANTI-PATTERNS (named)
1. `let _ = json_escape(&e)` beside a raw interpolation (not a lint error; enumerated at
   `movement_tests.rs:2419-2462`). 2. Placeholder-arg escape `json_escape(&"placeholder")` —
pin the argument INCLUDING its closing paren (`&e)`, not bare `&e` which also matches
`&entity_id`). 3. Shadow-rebind `let e = json_escape(&e);`. 4. Contiguous string-literal
production markers in new tests — fragment-assemble them (evals concatenate `*_tests.rs` into
one scan blob; measured incident at `evolution_tests.rs:2611-2615`). 5. Lowering a pin without
a re-derived arithmetic sentence in the failure message. 6. Silently hollowing W3 (§W3).
7. An ungated magic `64` / un-exported const in the client. 8. Naming the new eval
`*-security`/`*-privacy`. 9. Off-by-one: `< 64` disables a legal 64-monster offer.

## HIDDEN DEPENDENCIES (files outside `touches:`)
- `guards.rs` — NOT required (both helpers exist, `pub(crate)`). No STOP.
- `trading.rs` — READ ONLY by the new parity eval, not edited. STOP if a reviewer asks to move
  the cap to a `guards.rs`/`lib.rs` SSOT home (that is the guards-consolidation slice).
- `tradeProposeView.ts` — NOT required. STOP if the bar widens from "disable submission" to
  "surface a reason".
- `tradeProposeView.test.ts` — out of touches; verify its 4 selection fixtures are all ≤64
  before landing; a red there is a STOP, not an edit.
- `guards_tests.rs:998` — out of touches, stale prose, no red. Do not edit.
- `evals/run.mjs` — not edited (auto-discovery).
- `game-core/content/**` — untouched by 1–3. Pre-flight warning for 14r-f-2: the map-shaped gate
  needs a comment-needle guard like `append-only-ids.eval.mjs:307-372`; a mid-line trailing
  comment carrying an `id: N` needle in any of the 8 RON files makes the remediation a CONTENT
  edit = a `game-core/content/**` STOP. Verify before committing 14r-f-2's path-set.
- harness `specs/.../M-postgate-fourteenth-review-residuals.spec.md` — adding the `14r-f-2` row
  is a harness-repo edit, not covered by any project `touches:` set.

## ADR-0188 DECISION SENTENCE (draft)
Mirror the server's private `MAX_TRADE_MONSTERS_PER_SIDE` cap as an exported client constant
gated as a MIRROR (not a second SSOT) by a new `evals/trade-cap-parity.eval.mjs`; and close
ADR-0166 R4 by routing `movement_tick`'s grass pre-check through the both-role
`guards::is_in_ongoing_battle`, ratcheting movement.rs's inline `battle()` pin 1→0 and its
`is_in_ongoing_battle(` count 4→5, and re-scoping zone-warp W3 to the warp region.
Consequences: (a) ADR-0170 residual 8 closed for evolution.rs, completing the 12r-d E3 sweep;
(b) `guards_tests.rs:998` prose knowingly stale, out of path-set; (c) the species/item/skill
id-rebind blind spot remains OPEN AND DISCLOSED, deferred to `14r-f-2`.

---

# PLAN REVIEW — findings folded in (reviewer + red-team, both read the real source)

Both lenses independently converged on §W3 as the sharpest issue. All findings below are
ACCEPTED and amend the plan above.

## R1 [HIGH, both lenses] §W3's fix can itself go hollow — the anchor does not exist yet
`grep -c stepped_onto_grass evals/zone-warp-server-runtime.eval.mjs` == **0**. Every synthetic
fixture W3 asserts against (`BAD_MOVEMENT_TICK_NO_BATTLE_GUARD`, `GOOD_MOVEMENT_TICK_MAP_FOR`,
`BAD_MOVEMENT_TICK_INLINE_SINGLE_ROLE_WARP_GUARD` `:578-613`, `BAD_MOVEMENT_TICK_GUARD_ONLY_IN_WARP_BRANCH`)
is a TRUNCATED `movement_tick` body that stops after the warp branch — no grass block at all.
So the narrowed-region branch would be exercised by exactly ONE fixture (the new one) and every
other assertion would silently ride the fallback path.

Red-team PoC'd (`/tmp/w3_hollow_poc.mjs`) that (a) the hollowing is real — with the current
unscoped count, deleting the real warp guard while item 2's grass SSOT call is present reports
`PASS (count=1)`; and (b) **a plausible one-line fix reintroduces the bug WORSE**: writing the
fallback as `compact.substring(warpAtIdx, grassIdx)` with `grassIdx === -1` triggers
`String.prototype.substring`'s clamp-and-SWAP semantics, inverting the region to everything
BEFORE `warp_at(` — which then matches the ADR-0168 D1 drain-lock's legitimate
`is_in_ongoing_battle(` call and reports PASS with the warp guard fully deleted.

**MANDATORY:**
- fallback written explicitly as `const end = grassIdx === -1 ? compact.length : grassIdx;`
  then `compact.slice(start, end)` — **never** `substring`, never `slice(x, -1)`;
- **fail-loud** if the start anchor `warp_at(` is absent, and if the extracted region is empty;
- **extend the existing synthetic fixtures** with a trailing `stepped_onto_grass(...)`-shaped
  tail carrying a NON-SSOT call, so the "both anchors real" path is genuinely exercised by more
  than one fixture — and the narrowing is proven to EXCLUDE the downstream call;
- new BAD fixture: warp guard deleted + grass-block SSOT call present → must be FLAGGED.

## R2 [HIGH, red-team] EARS-3 parity eval as specified accepts a const `canSubmit` never reads
C2 checks the *declaration* (`export const MAX_TRADE_MONSTERS_PER_SIDE = 64`). It does not prove
`canSubmit`'s clause *references* that identifier. Shipping
`selectedMonsterIds.length <= 64` (bare literal) beside a disconnected exported const passes both
C1 (behaviour is right today) and C2 (const exists, exported, == 64). Failure mode is silent
future drift: bump `trading.rs` to 128, someone greps and bumps the const, the real gating literal
is never touched, nothing reds.
**MANDATORY:** C2 additionally region-scopes into `buildProposeSubmission`'s body and requires the
contiguous adjacency needle `selectedMonsterIds.length<=MAX_TRADE_MONSTERS_PER_SIDE` (compacted) —
the same "adjacency, not presence" pattern `movement_tests.rs:306-314` already uses.

## R3 [HIGH, red-team] EARS-1's ported needle is evadable by a positional-arg smuggle
The precedent's `d12r_assert_escaped_log_sites` (`battle_tests.rs:3595-3735`) checks two literal
substrings: `raw` (`{e}`) ABSENT and `capture` (`{reason}`) PRESENT. Both are satisfied by:
```
log::warn!("{{\"evt\":\"…\",\"reason\":\"{reason}\",\"raw\":\"{}\"}}", e);
```
— no literal `{e}` anywhere (the raw value enters via positional `{}` + trailing arg), `{reason}`
present, and it still logs the fully unescaped attacker-influenced string. Rust's
"argument never used" rule does NOT stop this. Inherited unmodified from the precedent.
**MANDATORY:** after locating the macro call range, additionally assert that the bare token `e`
(WHOLE WORD — must not match `entity_id`, `enc_row`, `eligible`) appears in the
arguments-after-format-string region **only** inside `json_escape(&e)`: count whole-word `e`
occurrences in that region and require == `n_esc`.

## R4 [MEDIUM, red-team] `capture` must pin the JSON quote-wrapping
`{reason}` matches whether it sits in `\"reason\":\"{reason}\"` or bare `\"reason\":{reason}` —
the latter emits INVALID JSON regardless of escaping, and C-2 misses it (C-2 composes its own
reference line, never reads the real format string).
**MANDATORY:** widen `capture` to include the quote bytes on both sides, assembled from the
`0x22` constants per the file's own convention.

## R5 [MEDIUM, red-team] ADR framing: item 2 is a behavioural NO-OP — say so
VERIFIED INDEPENDENTLY BY THE ORCHESTRATOR against the real source. Three layers:
1. The drain-time battle lock (`movement.rs:352-365`, ADR-0168 D1) already computes
   **both-role** `is_in_ongoing_battle(ctx, p.identity)` for the SAME character and `continue`s —
   and it runs BEFORE the move applies, so a battle-locked player never reaches the grass block.
2. `single-role(as_player)` is literally one disjunct of the both-role OR, so both-role == false
   at the drain lock implies single-role == false at the grass block. Nothing between the two can
   create a Battle row for this identity (`begin_encounter`, the only reachable Battle writer,
   runs AFTER the check).
3. `begin_encounter` (`battle.rs:394-398`) re-guards with the both-role SSOT and rejects.
   ADR-0166 R4 itself says **"Not a hole"** (`docs/adr/0166-pvp-server-guard-parity.md:193-195`).
=> No reachable state distinguishes before/after: not the encounter roll, not the `ctx.random()`
draw count/ordering (so the R-E fairness invariant is untouched — attack E resolves clean).
**CONSEQUENCE:** (a) rewrite the ADR-0188 decision sentence — this is **defensive SSOT-consistency
hygiene** (kill the divergent second implementation so a future removal of the D1 drain lock
cannot silently reopen R4), NOT a patch for a reachable vulnerability. (b) EARS-2's gate is
therefore necessarily a SOURCE-SHAPE test; a behavioural test is impossible because there is no
behaviour to distinguish (one would pass at HEAD for unrelated reasons). Say this plainly in the
ADR and the PR body rather than implying a fix landed.

## R6 [LOW, red-team] Pin the binding name `reason` identically in plan, test and source
If the ported test copies `battle_tests.rs`'s `binding = "escaped"` verbatim it assertion-reds
against a correct implementation. Choose ONE name and pin it in both places.

## R7 [MINOR, reviewer] `tradeProposeView.test.ts` precaution is a no-op
Zero `selectedMonsterIds` occurrences in that file; it renders via `makeLists()` fixtures whose
`offerableMonsters` arrays are 0-2 items. Nothing near the 64/65 boundary. Keep the STOP rule as
a safety net but do not go hunting for "4 selection fixtures" — they don't exist.

## R8 [MINOR, reviewer] `movement_tests.rs` arithmetic prose is at `:1241-1242`, not `:1240-1242`.

## VERIFIED-CLEAN (attacked, no gap found — do not re-litigate)
- Trade cap duplicate ids: `check_trade_side_size` runs on raw `.len()` BEFORE
  `validate_proposal`'s dedup rejection (`trading.rs:221-236`, `game-core/src/trading/rules.rs:62-73`),
  so the client's raw `.length` is a CORRECT mirror of server semantics.
- Mirroring only the initiator side is correct: the real UI submit path hardcodes
  `counterpartyMonsterIds: []` (`client/src/main.ts:2488-2496`, RLS D2 currency-only).
- Off-by-one: `trading.rs:44` is `>`, 64 legal / 65 rejects → `<= 64` confirmed.
- No missed count pins: both lenses swept `server-module/**/*.rs` and `evals/*.eval.mjs` for
  `is_in_ongoing_battle(`, `json_escape(`, `.battle()`, `player_identity()`, `BattleOutcome`
  needles touching movement.rs/evolution.rs. `evolution-reducer-security.eval.mjs` scopes to
  `essence_train`/`consume_crystalized_essence`/`apply_evolution` only — `check_and_evolve` is
  untouched. No eval enumerates `evals/*.eval.mjs` by count/name (`ci-gate-wiring`, `gate-teeth`,
  `gate-hardening-config` all checked; `gate-teeth`'s only `readdirSync` targets `server-module/src`).
- ADR-0188 free (highest existing 0187). `evals/rust-scan.mjs` exports both `stripRustSource`
  (`:158`) and `assertStripperSound` (`:356`) as C2 requires.
