# 11r-a — PvP server-guard parity — BUILD PLAN (planner output, 2026-07-31)

> **REVISION 2 (post plan-review: `reviewer` + `red-team` + simplify lens, all three
> verified against source).** The sections below are the ORIGINAL planner output; this
> block OVERRIDES it where they conflict. Read this block first.
>
> **R1 — NO new test helpers. The pipeline already exists.** `pvp_tests.rs` already has
> `strip_rust_comments:64`, `extract_pvp_fn_body:759`, `strip_rust_strings:1829`,
> `squash_ws:1864`, `stripped_pvp_for_scan():1872`, and `ea_chr_01:1894-1898` already
> demonstrates the exact composition. `trading_tests.rs` has `strip_rust_comments_trading:457`,
> `strip_rust_strings_trading:498`, `TRADING_RS:529`. Adding `strip_rust_strings_pvp` would be
> an SSOT violation and a hard `E0428`. Only `movement_tests.rs` (a genuinely new file) needs
> one local `strip_rust_comments` copy — the house convention (`taming_tests.rs:42`,
> `trading_tests.rs:457`, `economy_tests.rs:936` all keep a local copy on purpose).
> **Net-new helper code: ~105 lines → ~26.**
>
> **R2 — D2: CUT the `reject_if_active_fainted(state, side)` helper. Inline 5 lines on
> `my_team` instead**, mirroring `battle.rs:549-559` verbatim in shape. Three independent
> reasons converged: (a) both-role coverage is ALREADY structurally proven by the exhaustive
> match at `pvp.rs:1012-1015` that binds `my_team` from `my_side` — a `SideId` param re-derives
> a selection the call site already made (an SSOT *regression*); (b) the red-team built the
> resulting evasion and it passed EVERY proposed test —
> `reject_if_active_fainted(&battle.state, SideId::SideA)` compiles, leaves side B's corpse
> dealing full damage in ranked, and no assertion looks at the argument; (c) a helper test
> would assert only the `match` arms — a tautology. **Cutting the helper kills that
> evasion structurally, for free.** The needle `my_team.active_monster().is_fainted(){`
> cannot be satisfied by a side-hardcoded implementation.
>
> **R3 — the error string must NOT be copied from `battle.rs:556`.** PvP has **no flee** —
> `PvpAction` is Attack|Swap only; the exit is `forfeit`. Use
> `"your active monster has fainted — swap to another monster or forfeit"` and assert it
> verbatim. This is load-bearing, not cosmetic: a legacy corpse-active PvP row is exitable
> only by Swap, and a player who retries Attack gets reaped at 60s into a **ranked rating
> loss** (`pvp.rs:54` → `apply_pvp_forfeit` → `settle_pvp_battle` → `ranking.rs:92`).
>
> **R4 — D4 caps are 64/64, not 6/16.** The planner's "nothing upstream fixes a size" check
> missed the client: `client/src/ui/tradeProposeModel.ts:91-96` builds `offerableMonsters`
> from **all** `ownMonsters` (not party-filtered, `store.ts:702`) and `buildProposeSubmission`
> has no selection-count gate; `propose_trade` never checks `party_slot`, so **boxed monsters
> are tradeable today**. A cap of 6 would reject legitimate existing UI flows with an opaque
> server error. These are DoS bounds, not game rules — generous is correct. Residual: the
> client has no selection-count gate, so >64 still yields an opaque reject (route to a client
> slice; do not fix here).
>
> **R5 — needle sets must pin ARGUMENTS, not just presence.** The red-team built 5 evasions
> and **all 5 passed the plan's needles as specified**. The plan inherited `battle_tests.rs`
> C1's layers 1-2 and dropped layer 3 (the argument pin) for E2/E3/E4 — the exact layer the
> repo's own history says was needed. Required:
> - **E1** — pin the BINDING, not the call: `letside_a=BattleSide::with_lead(team_a)` and
>   `letside_b=BattleSide::with_lead(team_b)` (squashed). Presence-only `contains` lets the
>   **swapped-argument** evasion through, which in PvP is catastrophic: `party_monster_ids` /
>   `opponent_monster_ids` (`pvp.rs:294-295`) stay un-swapped, so each player plays the
>   OTHER's monsters and `write_back_*` writes one player's post-battle HP onto the other
>   player's rows. `check_team_coupling` (`guards.rs:124`) compares lengths only — invisible
>   when both parties are the same size.
> - **E3** — pin `p.identity`. `movement_tick` is scheduler-only, so `ctx.sender` is the
>   MODULE identity: `is_in_ongoing_battle(ctx, ctx.sender)` passes all three proposed
>   assertions and is **worse than the bug** — every player warps out of every battle, PvE and
>   PvP alike. Use ONE composite adjacency needle on the squashed body (per the
>   `raising_tests.rs:883-914` precedent) instead of a brace-matched block extractor:
>   `.map(|p|is_in_ongoing_battle(ctx,p.identity)).unwrap_or(true)`. It is simultaneously
>   simpler (no extractor, no block scoping — `player_identity()` at `movement.rs:254` stops
>   being a hazard to design around) and STRONGER (pins adjacency, not co-occurrence).
> - **E4** — pin both argument tuples verbatim. "Two call sites before `validate_proposal`" is
>   satisfied by a copy-pasted `initiator` call twice, leaving the counterparty vectors — the
>   ones an attacker fully controls — unbounded.
>
> **R6 — `log_reject` in D1 must use `challenger` / `opponent`, NOT `ctx.sender`.**
> `start_pvp_battle` is reached only from `accept_challenge`, where `ctx.sender` is the
> **acceptor** — so a side-A rejection would be audited against the opponent's identity. The
> sibling helper in the same file already does it right (`build_pvp_team` takes an `owner`
> param, `pvp.rs:195/200/205/216`).
>
> **R7 — test count 8 → 5.** CUT: the verbatim-error-string half of the E1 audit test (the
> strings have no consumer outside `pvp.rs`; pinning them turns any future rewording red — but
> KEEP the per-call-site `log_reject` half, which has a real consumer and the
> `battle_tests.rs:1428-1430` precedent); the standalone `..._has_no_leftover_conscious_precheck`
> test (FOLD its `is_fainted` count into the main E1 forbidden-needle set — it is the strongest
> thing in the E1 set because it kills the `team_a.retain(|m| !m.is_fainted())` mutant — and
> **scope it to the `start_pvp_battle` body**, since `pvp.rs:1031` and the new D2 guard both
> use `is_fainted` legitimately); the standalone Swap anti-regression test (FOLD into E2 as a
> one-line "guard needle count == 1 across the whole body" assertion; the durable record is
> ADR-0166's anti-decision); and merge E2's ordering test into the main E2 test.
>
> **R8 — "each step independently green" is FALSE against full `just ci`.** The knowledge
> bundle embeds LINE NUMBERS (`docs/knowledge/reducers/propose_trade.md:8` is
> `resource: server-module/src/trading.rs#L192`) and drift fails CI. EVERY step shifts lines.
> Per-step gate is `just ci-fast server-module`; regenerate `just knowledge` + `just adr-digest`
> once at step 5, before the single full `just ci`.
>
> **R9 — honest framing, required in the ADR.** After D1 lands, **D2 is defence-in-depth, not
> a live standalone exploit**: `resolve_full_turn` auto-switches on KO
> (`game-core/src/combat/resolve.rs:447-452`), and the red-team disproved the submit-time
> TOCTOU hypothesis (`resolve.rs:328-342` `second_had_faint` suppresses the slower side's
> persisted Attack; swaps resolve before attacks at `:271-286`; all four `battle.rs` mutators
> reject PvP via `is_ranked_pvp`). D2's real job is **legacy rows** — exactly as ADR-0156 D2
> framed the PvE half. D1 by contrast is **confirmed exploitable with a PoC**: a 0 HP lead
> passed the current pre-check, swept a 3-monster party and WON a ranked battle (the row only
> self-repairs when the corpse is actually hit, so an out-speeding lead never gets hit).
> Three assertions are also GREEN at HEAD (`.unwrap_or(true)`, `truncate(==0`, the Swap
> anti-regression) — label them ANTI-REGRESSION in their docstrings so green is not mistaken
> for teeth.
>
> **R10 — ADR-0166: 8 decisions → 4 + a `### Residuals` section** (the ADR-0156 structure,
> `docs/adr/0156-*.md:221`). Decisions: D1 with_lead adoption + pre-check dedup + the
> corrected `log_reject`; D2 the anti-decision that **Swap gets no guard** (the single most
> important entry — without it the next security pass adds the symmetric guard and soft-locks a
> ranked player into a rating loss); D3 cap values + "DoS bound, not a game rule" + the `n==0`
> carve-out + "chose `battle.rs`'s bound-before-DB-read ordering, noting `pvp.rs`'s own
> siblings bound later (`:694`, `:853`)"; D4 `unwrap_or(true)` means *skip warp*, not
> *in battle*. Residuals: the vacuous W3 eval (→11r-c), the grass-encounter single-role RNG
> wrinkle (→11r-c/11r-g), the `guards.rs` SSOT home for the cap fn (→11r-c/11r-g), a shared
> `scan_helpers` module (needs `lib.rs`), the `challenge_pvp` griefable-Pending-challenge hole
> (see R11), legacy corpse-active PvP rows, the client's missing selection-count gate, and the
> `README.md` "next free number" staleness.
> ADR must also record: **the caps cannot bound BSATN decode** (the host materialises the `Vec`
> before the reducer's first statement — what the caps stop is `validate_proposal`'s HashSet at
> `game-core/src/trading/rules.rs:63-90` and the O(items × inventory) DB loops at
> `trading.rs:278-329`); **there is no rate limiting anywhere in the module** and the "no active
> offer" guard bounds *concurrent offers*, not call rate; **the `ability_ids_* ↔ team_*`
> positional coupling becomes load-bearing for the first time** (with_lead makes
> `abilities.side_a[active]` depend on the alignment `build_pvp_team` happens to satisfy);
> and that `trading` has no entry in the subsystem vocabulary (`scripts/adr-digest.mjs:22-33`),
> nearest is `economy-quests`.
>
> **R11 — NOT fixed here, recorded as a residual:** `challenge_pvp` (`pvp.rs:746-771`) never
> validates party consciousness — only `start_pvp_battle` does, and a reducer `Err` rolls the
> transaction back, so the `battle_challenge` row survives as Pending. Challenging with an
> all-fainted party makes the target's `accept_challenge` always error while guard 5b
> (`pvp.rs:716`) blocks the target from opening their own challenge for the 120s TTL.
> Repeatable at zero cost. It is in `pvp.rs` (in-touches) but it is a BEHAVIOUR change beyond
> EARS E1-E4 on a security-relevant slice — record, do not fix.
>
> **R12 — verify, do not break:** `npc_tests.rs:351-371` (NOT in touches) `include_str!`s
> `movement.rs` and asserts `.unwrap_or(true)` is present and
> `".unwrap_or(false); // NPCs have no player row"` is absent. The `in_battle`→`skip_warp`
> rename and comment rewrite keep it green ONLY because `.unwrap_or(true)` survives verbatim.
> Confirm explicitly after the edit.


Slice: `M-postgate-eleventh-review-residuals.spec.md` §2 slice 11r-a (HIGH/LIGHT).
Branch `feat/11r-a-pvp-server-guard-parity`, worktree `.claude/worktrees/11r-a`, off `faa3b0c`.
ADR number reserved: **0166**.

## Declared touches (HARD)
`server-module/src/{pvp,movement,trading}.rs` + sibling `*_tests.rs`
(declared via `#[cfg(test)] #[path="x_tests.rs"] mod x_tests;` INSIDE the source file —
so a NEW `movement_tests.rs` needs only a `movement.rs` edit, **not** `lib.rs`).
Companions: `docs/adr/0166-*.md`, `docs/knowledge/**`, `ARCHITECTURE.md`, CHANGELOG (generated).

## Complexity triage
Production code is LIGHT (~35 lines / 3 files, no schema or signature change). Tests + docs are MEDIUM.
Risk order: **D4** (must invent cap numbers — no upstream rule exists) > **D1** (the source-text scan
has a documented history of evasions) > **D2** (trap: over-guarding Swap) > **D3** (one-line swap).

## The four fixes

### D1 / E1 — `pvp.rs:240-304` `start_pvp_battle` seats a raw `active: 0` lead on both sides
Adopt `game_core::BattleSide::with_lead(team_a)` / `(team_b)` with `.ok_or_else(..)?`, exactly as
`battle.rs:218-231`. **DECIDED: remove** the two `any(|m| !m.is_fainted())` pre-checks at
`pvp.rs:252-257` — `with_lead`'s `None` *is* that precondition (ADR-0156 D1 established the pattern
and the wording). Error strings preserved **character-for-character**. **ADD** `log_reject(
"start_pvp_battle", ctx.sender, &e)` in both closures — the current pre-checks reject silently,
unlike every other rejection in `pvp.rs` and unlike `battle.rs:224/229`.

### D2 / E2 — `pvp.rs:1017` Attack arm has no fainted-active reject
`calc_damage` never reads attacker HP ⇒ a corpse deals FULL damage in ranked.
**DECIDED: a file-local pure helper**, not an inline copy of `battle.rs:555`:
`fn reject_if_active_fainted(state: &BattleState, side: SideId) -> Result<(), String>`
(exhaustive `match side`; no ctx, no logging — caller does `log_reject` then `return Err`).
Rationale: PvP has **two roles**; a `SideId` parameter makes "both roles covered" *provable*
instead of asserted. Sited as the FIRST statement of the Attack arm, **before** the moveset check
(so a corpse doesn't yield the misleading "skill N not in active monster's moveset") and well
before Guard 7's irreversible `BattleAction` insert.
**The `Swap` arm deliberately gains NO such guard** — a fainted active must still be able to swap
out, else the player is soft-locked; in PvP the 60s deadline reaper (`pvp.rs:54`) would launder that
soft-lock into a *ranked rating loss*.

### D3 / E3 — `movement.rs:209-223` warp guard checks only the `player_identity` role
Replace the inline filter with the ADR-0122 SSOT `crate::guards::is_in_ongoing_battle(ctx, identity)`
(`guards.rs:264`, both roles, excludes WILD_IDENTITY on the opponent side).
**PRESERVE `.unwrap_or(true)`** — no `player` row (an NPC) ⇒ skip the warp (ADR-0070).

### D4 / E4 — `trading.rs:192-238` `propose_trade` runs unbounded O(N) dedup before any size bound
`validate_proposal` (`game-core/src/trading/rules.rs:63-90`) HashSet-dedups four client vectors with
no prior bound; worse, `trading.rs:278-329` does a full inventory scan **per listed item** (O(items ×
inventory rows)). Add O(1) caps as the first statement after `let me = ctx.sender;` — before the two
joined-player lookups, matching `battle.rs:62-75` "bound before any DB read".
**DECIDED cap values** (verified: no spec, ADR-0106, or game-core rule fixes a trade size):
```rust
const MAX_TRADE_MONSTERS_PER_SIDE: usize = 6;   // == PARTY_SIZE by coincidence, NOT by reference
const MAX_TRADE_ITEMS_PER_SIDE:    usize = 16;  // ~3x the whole 5-item registry
```
File-local (guards.rs / lib.rs are out of scope) and deliberately NOT `MAX_PARTY_SIZE` — a trade is
not a party; box-monster trading will bump *this* constant. **`n == 0` must be OK** (one-sided
trades are legal; emptiness is `validate_proposal`'s `EmptyOffer` rule — do not restate it).
Currency args are `u64` scalars, already balance-checked at `trading.rs:242-275` — no cap.

## Ordered steps (each independently green)
`just lint` = `clippy --all-targets -D warnings` ⇒ **an unused test helper fails the build**; never
land a scanning helper in a step that doesn't consume it.
1. **D3/E3**: new `movement_tests.rs` (RED) → `movement.rs` import + guard swap + `in_battle`→
   `skip_warp` rename → `#[cfg(test)] #[path]` mod decl at EOF (precedent `battle.rs:1316-1321`).
2. **D4/E4**: consts + pure `check_trade_side_size` → `trading_tests.rs` (RED) → call both sides
   before `validate_proposal` → update the numbered guard doc-comment (`trading.rs:176-186`).
3. **D1/E1**: `pvp_tests.rs` helpers (`strip_rust_strings_pvp`, stripped-source body locator) + tests
   (RED) → `pvp.rs:252-271` rewrite → doc-comment.
4. **D2/E2**: pure helper → `pvp_tests.rs` tests (RED) → call site → guard-order doc list
   (`pvp.rs:968-976`).
5. **Docs**: ADR-0166 → `just adr-digest` (MANDATORY, gate-checked) → `just knowledge` (MANDATORY —
   steps 2/4 changed docstrings the exporter projects) → `ARCHITECTURE.md:854-856` one sentence →
   full `just ci`.

## Tests per EARS criterion
Why any source-text pins: these reducers need a live `ReducerContext` and the crate has no
reducer-executing harness (`battle_tests.rs:2151-2153`). House pattern = push the provable part into
a pure fn + unit-test it, then scan **only** for the residue a scan uniquely sees (call-site
adoption, guard ordering). Every needle must be `concat!`-assembled or the test self-matches.

- **E1** — behavioural half already green in game-core (`with_lead_*` tests); residue is adoption.
  - `e1_start_pvp_battle_constructs_both_sides_via_with_lead` (mirror `battle_tests.rs:1747`):
    L1 `with_lead(` count **== 2**; L2 forbidden `BattleSide {` == 0, `set_active(` == 0, bare
    `.active` == 0 (whitelist `.active_monster`), `.team` only as `.iter()`/`.iter_mut()`
    (verified exact on `pvp.rs:277-287`); L3 verbatim args `with_lead(team_a)` / `(team_b)`.
    **Kills:** half-applied fix (side B left literal — a presence-only `contains` cannot see it);
    adopt-then-overwrite via the still-`pub` `active` field incl. compound assignment
    (`active -= active`, a *verified* prior evasion); permuted argument (`t.swap(0,i)` — would
    silently misroute HP write-back, `check_team_coupling` compares lengths only);
    post-construction `team.swap(0,1)`; `set_active(0)` masquerading as lead selection.
  - `e1_..._preserves_the_reject_strings_and_audits_them`: both strings verbatim; per-call-site
    window contains `log_reject(`; site count == 2. **Kills** an `ok_or_else` that returns the right
    `Err` but drops the audit (invisible to the rest of `just ci` — cf. `battle_tests.rs:1892`).
  - `e1_..._has_no_leftover_conscious_precheck`: `is_fainted` count == 0. Pins the *decision*, not a
    defect — the docstring must say so.
- **E2**
  - `e2_fainted_active_is_rejected_for_either_side` (BEHAVIOURAL, fixture per `guards_tests.rs:235-260`):
    side-A corpse ⇒ `guard(&s, SideA).is_err()` **and** `guard(&s, SideB).is_ok()`; mirror image
    swaps. Err string must mention swapping. **Kills** no-guard, inverted condition, and — the most
    likely PvP mutation — a guard hardcoded to `side_a` (D3's bug shape reappearing).
  - `e2_fainted_guard_is_sited_before_the_moveset_check_and_before_the_insert` (ordering is not
    behaviourally observable): `guard < known_skill_ids < battle_action().insert( < resolve_…`;
    plus shape (inside `if let Err`/`?` with `return Err`, not a dead `let _`).
    "No damage dealt" is discharged by inference and the docstring must say it: the `Err` returns
    before the action insert and a reducer `Err` rolls back the whole txn.
  - `e2_swap_arm_deliberately_has_no_fainted_active_guard` (ANTI-regression): Swap arm must not call
    the guard and must keep its *target* check (`pvp.rs:1031`). Docstring carries the
    soft-lock→ranked-loss argument.
- **E3** — behavioural half owned by `guards_tests.rs:489-600`; residue is the call site.
  - `e3_warp_branch_uses_the_both_role_ssot_guard`, scoped to the brace-matched
    `if let Some(warp) = map.warp_at(..)` block (**scoping is load-bearing** — `player_identity()`
    legitimately reappears at `movement.rs:254`, so a whole-body assertion is structurally incapable
    of failing; the exact mistake `battle_tests.rs:1960-1966` records): contains
    `is_in_ongoing_battle(`, `player_identity()` count == 0, contains `.unwrap_or(true)`.
    **Kills** the single-role revert, a flip to `unwrap_or(false)` (would teleport NPCs out of their
    home zone), and a call that keeps the old filter as the effective condition.
- **E4**
  - `e4_check_trade_side_size_boundaries` (BEHAVIOURAL): (6,0) Ok, (7,0) Err, (0,16) Ok, (0,17) Err,
    **(0,0) Ok**. That last one kills the most likely implementer error — copy-pasting
    `check_party_size` (`guards.rs:105`), which rejects `n == 0` and would break every legal
    one-sided trade.
  - `e4_propose_trade_bounds_both_sides_before_validate_proposal`: two call sites, both at an index
    `< body.find("validate_proposal")`; `truncate(` count == 0 (reject-not-clamp).

## ADR-0166 must record
D1 with_lead adoption + pre-check dedup + the *added* `log_reject`; D2 the pure `(state, side)`
helper as a deliberate divergence from `battle.rs:555` (SSOT home is arguably `guards.rs` —
deferred, out of scope; residual for 11r-c/11r-g); D3 the anti-decision that Swap gets no guard
(+ the ranked-loss escalation); D4 cap values, derivations, "DoS bound not a game rule", the `n==0`
carve-out; D5 `unwrap_or(true)` means *skip warp*, not *in battle*; D6–D8 the disclosures below.
Header per ADR-0104 (`Amends: ADR-0156, ADR-0122, ADR-0106`; Subsystems: security-authz, battle,
movement-netcode; Decision ≤240 chars — `scripts/adr-digest.mjs:220-235` hard-validates).

## Anti-patterns (named)
Over-guarding `Swap`; auto-swap/clamp instead of reject; factoring the two `with_lead` calls into a
shared `build_side()` (zeroes the per-body count and fails a *correct* fix); SSOT-ing the new consts
or the fainted helper into `guards.rs`/`lib.rs` (out of scope — the ADR records the deferral);
restating `validate_proposal`'s rules in the cap fn; `.truncate()` near the trade lists; verbatim
needles in the test file; brace-counting on string-bearing source (`start_pvp_battle` ends with a
`log::info!` whose `{{`/`}}` balance by accident); whole-body windows for block-scoped claims;
editing `lib.rs` for the new test module; `#[allow(dead_code)]` to land helpers early; fixing the
vacuous W3 eval "while we're here"; touching `game-core`.

## STOPs & disclosures
- **STOP-1 (soft):** `docs/adr/DIGEST.md` is generated and gate-checked (`evals/adr-digest.eval.mjs`
  → `scripts/adr-digest.mjs --check`), so adding `0166-*.md` *forces* a DIGEST diff. No in-scope
  alternative. Treat it as an implied member of the `docs/adr/0166-*` deliverable; declare in
  `touches-delta:`.
- **STOP-2 (informational):** `docs/adr/README.md:16` "Next free number: 0165" is *already* stale and
  is gated by nothing. Leave it; record as a residual (do not bump silently).
- **Disclosure 1:** `evals/zone-warp-server-runtime.eval.mjs:171-206` (W3) is *already* a paper
  tooth — its docstring assumes the grass guard precedes `warp_at`, but at HEAD `warp_at` is
  `movement.rs:205` and the grass guard `:251`. Our change takes its count 2→1; it passes either
  way, even with the warp guard deleted. Real protection moves to `movement_tests.rs`. Residual →
  **11r-c** (owns both `movement.rs` and `evals/`).
- **Disclosure 2:** nightly `mutate-server` survivor cap 299 (`justfile:83`, nightly-only, not
  `just ci`). If it trips, bump the cap + update ADR-0050 — never weaken tests.
- **Disclosure 3 (a FIFTH single-role defect, do NOT fix here):** the grass-encounter pre-check
  `movement.rs:251-256` has the same `player_identity()`-only bug. **Not** a security hole —
  `begin_encounter` calls the both-role SSOT and rejects — but `ctx.random()` is drawn at `:272` for
  a player who cannot get an encounter, weakening the R-E fairness rationale at `:239-242`. Fixing
  it changes encounter RNG-draw ordering, outside this slice's EARS. Route to **11r-c**/11r-g.
- **Checked, NOT triggered:** no reducer signature change ⇒ `evals/baselines/table-schemas.json` and
  `spacetime-types.json` untouched; no schema/BSATN change; no predictor/netcode/RLS surface.
  `evals/trade-reducer-security.eval.mjs:115-120` only requires `validate_proposal` to be *present*.
  `evals/battle-reducer-security.eval.mjs:1696-1757` pins only the `opponent_identity:` RHS.

## Boy Scout (file-local only; ~12 lines, 2 hunks — well under the ~40-line / ≤3-hunk cap)
1. `movement.rs:209-223` rename `in_battle` → `skip_warp` + a one-line why-comment. Highest-value 3
   lines in the slice: the current name makes `unwrap_or(true)` read as a bug, which is how a future
   "cleanup" flips it to `false` and teleports NPCs.
2. The three guard/doc comments updated alongside their fixes — **required**, not optional: they are
   the input to the generated knowledge bundle.
**Declined:** renaming `my_team` (`pvp.rs:1012`, it is a `&BattleSide`, not a team) — ~6 uses across
both match arms; would inflate a security-relevant diff in the exact function under review.
