# ctl-16 plan — server: no talk / advance_dialogue / buy / sell during an Ongoing battle

Spec: harness `specs/monster-realm-v2/M-postgate-console-controls.spec.md` §ctl-16 (CTL16.1–CTL16.4).
Worktree: `projects/monster-realm/.claude/worktrees/ctl-16` (branch `feat/ctl-16`, base `2f5355ea`).
Behaviour only: no schema change, no reducer signature change, no bindings regen, no `client/` edit.

## Functional core / imperative shell

The rule already exists once: `guards::is_in_ongoing_battle(ctx, identity)` (both roles; the
opponent arm skips `WILD_IDENTITY`), a thin ctx wrapper over the pure
`is_in_ongoing_battle_either_role`. This slice adds four call sites and nothing else — no new
helper, no new abstraction (YAGNI: `raising.rs` has five identical inline call sites; a
`reject_if_in_ongoing_battle(ctx, verb)` helper would live in `guards.rs`, outside `touches:`).

| File | Change |
|---|---|
| `server-module/src/npc.rs` `talk` | Immediately after `require_not_deleting(ctx, "talk")?;` and before the character/NPC reads: `if crate::guards::is_in_ongoing_battle(ctx, me) { return Err("cannot talk during an ongoing battle".to_string()); }` |
| `server-module/src/npc.rs` `advance_dialogue` | Immediately after `require_not_deleting(ctx, "advance_dialogue")?;` — BEFORE the NPC/zone/range re-checks, because those branches delete the caller's conversation row (a store change the criterion forbids): `Err("cannot advance dialogue during an ongoing battle")` |
| `server-module/src/npc.rs` `dismiss_dialogue` | Unchanged (CTL16.4). |
| `server-module/src/economy.rs` `buy` / `sell` | Immediately after `require_not_deleting(ctx, "buy"/"sell")?;`, before `qty == 0`: `Err("cannot buy during an ongoing battle")` / `Err("cannot sell during an ongoing battle")`. Doc-comment step lists gain the step. |

Plain `Err`, no log line — the sibling pattern in `raising.rs` (care/train/heal).

## Boundary contracts

- Identity is `ctx.sender()` (`me`) only; no client-supplied identity reaches the predicate.
- Refusal happens before every write and before every destructive branch → store byte-identical.
- Check order after this slice — `talk`: joined → deletion gate → **battle** → character/NPC/zone/range/…;
  `advance_dialogue`: own conversation → joined → deletion gate → **battle** → NPC/zone/range (dismissing) → …;
  `buy`/`sell`: joined → require_owner → deletion gate → **battle** → qty → ….
- Reads over the `battle` table's `player_identity` / `opponent_identity` btree indexes only (two point scans; no table scan).

## Data model

None. No table, column, index, reducer signature, view or binding changes.

## Tests (tester, from the EARS criteria; behavioural native-host tests only)

The SHIPPED reducers run through `crate::native_host_tests` (`fixture()`, `fx.table`/`table_keyed`,
`fx.run_as`). The battle table is registered under BOTH `battle.player_identity` and
`battle.opponent_identity`; a row is seeded ONCE (both indexes share one row store). An index no
fixture registered reads as empty, so every existing native-host test of these four reducers stays
green unmodified. Every table a reducer would WRITE on the admitted path must be registered
`.writable()` with the indexes it uses (an unwritable write aborts the process — the red must be an
assertion failure, not an abort): reuse the shapes in `nh_dialogue_security::world` and
`nh_quest_complete_grants_exactly_the_content_currency_reward` (pq_id index, wallet, inventory).

Battle shapes ("either role", caller = `me`, `other` a real player):
wild side A `(me, WILD)` · PvP side A `(me, other)` · PvP side B `(other, me)` · practice `(me, me)`.
Controls (must be ADMITTED; each in its OWN `fixture()` — the host has no rollback):
no battle row · the caller's battle with every finished outcome, on both sides · a stranger's
Ongoing battle `(other, WILD)` / `(other, third)`.
The local `Battle` row builder takes the outcome as a parameter.

Test names are the ledger CHECK needles (prefix-filtered):

`npc_tests.rs` (new inline module; shipped `elder_oak_talk` tree + `quest_001`, NPC `npc_id: "elder_oak"`):
- `ctl16_1_talk_refused_in_ongoing_battle_either_role_store_unchanged` — every battle shape: exact
  `Err("cannot talk during an ongoing battle")`, every table snapshot byte-identical: a PRE-EXISTING
  conversation row (another NPC / node) is neither replaced nor removed, no `met_elder_oak` flag,
  the caller's active `quest_001` row is not completed, the wallet is not credited the 50 reward.
  Plus one precedence case: in battle AND the NPC does not exist → still the battle refusal
  (the guard precedes the NPC reads).
- `ctl16_1_talk_admitted_without_an_ongoing_battle_of_the_callers` — the controls: `Ok(())` and the
  effects are visible (conversation row, flag, quest completed, +50) — proves the refusal test's
  "unchanged" is not vacuous and the guard is not refuse-everything.
- `ctl16_2_advance_dialogue_refused_in_ongoing_battle_either_role_store_unchanged` — a seeded
  conversation at `greeting`, choice 0 (`StartQuest("quest_001")`); every battle shape: exact
  `Err("cannot advance dialogue during an ongoing battle")`, snapshot identical (conversation kept,
  no quest row, no dialogue-state row). Plus one precedence case: in battle AND the conversation's
  NPC row is absent (the EARLIEST conversation-deleting branch) → still the battle refusal and the
  conversation row survives.
- `ctl16_2_advance_dialogue_admitted_without_an_ongoing_battle_of_the_callers` — the controls: the
  choice applies (quest row started, conversation ended).
- `ctl16_4_dismiss_dialogue_succeeds_during_an_ongoing_battle` — every battle shape: `Ok(())`, the
  caller's conversation row is gone, a stranger's conversation row is untouched.

`economy_tests.rs` (the `ec_world` fixture family + the battle indexes):
- `ctl16_3_buy_refused_in_ongoing_battle_either_role_store_unchanged` — a buy that would succeed
  (funds, stock); every battle shape: exact `Err("cannot buy during an ongoing battle")`; wallets,
  stacks AND trade offers byte-identical. Plus: in battle with `qty == 0` → still the battle
  refusal (the guard precedes the quantity check).
- `ctl16_3_sell_refused_in_ongoing_battle_either_role_store_unchanged` — same for sell, with a live
  trade offer seeded so "no escrow change" is observed on real rows.
- `ctl16_3_buy_and_sell_admitted_without_an_ongoing_battle_of_the_callers` — the controls: both
  succeed and move exactly the server price.

NOT pinned, on purpose (review: both orders refuse with the store unchanged; `rb46`/`rb80` own the
deletion gate): the relative order of the battle guard and `require_not_deleting`; which refusal an
in-battle caller with NO conversation gets from `advance_dialogue`.

Red proof (orchestrator): each `ctl16_1/2/3` refusal test fails at HEAD because the reducer returns
`Ok(())` mid-battle. `ctl16_4` is a preservation pin — green at HEAD by design; its teeth are shown
once by temporarily guarding `dismiss_dialogue` in the worktree.

## Plan review outcome (reviewer + red-team, 2026-10-01)

No blockers. Adopted: the "replaced" observable for `talk`; the practice `(me, me)` shape; controls
over every finished outcome × both sides, one fixture each; the NPC-absent precedence cases; offers
in the economy snapshot; seed the battle row once; a short rationale comment at each guard.
Dropped (over-testing): the deletion-gate-order case. Out of slice, flagged in the PR: items/currency
can still reach an in-battle player through a trade (`trading.rs` checks monsters only) — the guard is
rule consistency, not a closed exploit; the native host has no rollback, so "conversation row
survives" pins refusal precedence, not a production data difference; `mr:guard_reject` does not see
plain-`Err` refusals (spec-mandated, same as `raising.rs`).

## Deviations from the spec text (flag in the PR)

1. **`raising_tests.rs` is NOT touched.** The spec task says to make its private `ongoing_battle()`
   `pub(crate)` and reuse it. `raising.rs` declares `mod raising_tests;` privately (line 749) and
   `raising.rs` is outside `touches:`, so `crate::raising::raising_tests::ongoing_battle` is
   unreachable from `npc_tests`/`economy_tests` (E0603) whatever the fn's own visibility. Each test
   file gets a small local `Battle` row builder — the existing convention (≈20 local builders across
   the `*_tests.rs` files). Not a hidden dependency: no criterion needs the shared helper.
2. **CTL16.2's red uses `StartQuest`, not `GrantItem`.** No shipped dialogue tree carries a
   `GrantItem` choice (the tree cache is compile-time content; adding one is a content edit +
   `CONTENT_VERSION` bump, outside `touches:`). `StartQuest` and `GrantItem` are applied by the same
   `apply_effects_to_db` call that the guard now precedes.

## Anti-patterns to avoid

- No source-text scans / `include_str!` pins of the guard statement, no census of guard call sites, no checks of checks, no new eval.
- No clamp, no silent no-op: refuse with `Err`.
- No second predicate (`reject_if_in_battle` is the per-MONSTER check — wrong tool); no hand-rolled battle scan.
- No edit to `guards.rs`, `raising.rs`, `schema.rs`, `client/**`, `docs/DECISIONS.md` (the "Battle lifecycle and PvP" entry already states the pattern; a fifth call-site family does not meet the decision bar).
- Never `ctx.db.<table>().insert(` in tests (seed through handles).

## Risks

- A battle row stuck `Ongoing` would now also block talking/shopping — same exposure as the existing
  movement/care/train/heal guards; `resolve_all_live_interactions` clears them on last disconnect.
- Nightly `mutate-server` cap: the four new branches are executed by exact-`Err` + control tests, so no
  new survivors are expected; a report, not a gate.
