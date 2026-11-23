# lpw-29 plan — a PvP battle's anchor hides the opponent's roster until the battle is Active

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-29 (type feature, tier hard, after []).
Worktree `.claude/worktrees/lpw-29`, branch `slice/lpw-29`, base `origin/master` c3500e1f.

## 1. Scope verified (build-loop step 1)

- The leak: `schema.rs` `my_battle` returns the whole `Battle` row; `tactics.rs` `start_pvp_tactical`
  fills `state.side_a.team` / `state.side_b.team` (`BattleMonster`: species, affinity, level, HP,
  `StatBlock`, `known_skill_ids`, status) at the Deploying start, so each PvP participant reads the
  other's roster from Deploying on.
- Every other participant read path during Deploying, checked:
  `my_battle_units` (no `battle_unit` row exists before `materialize`), `my_battle_events` (events are
  emitted only by executed steps, `tactics.rs` `store`), `my_battle_deploy` / `my_battle_queue`
  (owner-only), `my_tactical_battle` / `my_battle_clock` (no monster column), `my_export_bundle`
  (`privacy.rs` `json_battle` omits `state` and nulls the other side's id list). So `my_battle` is the
  one view to change.
- Outside the views: `player.lead_level` (public table, a recorded decision: the level of the
  owner's lead party monster, always public) still carries one level. Not a view and not in this
  contract — recorded as a spec note, not scope. `battle_challenge.challenger_party_ids` and the
  anchor's two id lists carry monster ids only; no public table maps an id to a species while the
  monster is in a battle (`trade_offer` cards: a party monster in an open trade cannot start a
  battle, and an Ongoing anchor blocks new trades).
- e2e path confirmed: `client/e2e/tactics-pvp.spec.ts` is the tactical PvP spec. No widening.
- No consumer reads the opponent team during Deploying: client `buildDeployPanel` reads
  `battle.sideB.team` only in `wild` mode; the DEV hook `__mrPvp.battleById` already guards
  `team[active]?.` / `?? -1`; `rowConvert.battleRowToStore` maps any array; no e2e/eval reads a team.
- Today's Deploying closes (lpw-29.3 baseline): `tactics::forfeit` refuses a Deploying battle
  ("battle is not active", writes nothing); a disconnect closes it through `close_without_hp` →
  `finish(Close::Deploying)`: the STORED anchor updated with outcome `Fled`, no HP write, unrated;
  the deploy-window expiry auto-fills and reveals (`expire_pvp_deploy` → `materialize`) or cancels.
  All read the stored row, which this slice never changes.

## 2. Design

Functional core / imperative shell, inside `schema.rs` beside the view (the `participant_battle_ids`
convention: a view's private helper lives next to it). No schema, column, type, bindings or
game-core change.

```rust
#[spacetimedb::view(accessor = my_battle, public)]
fn my_battle(ctx: &spacetimedb::ViewContext) -> Vec<Battle> {
    let sender = ctx.sender();
    ctx.db.battle().player_identity().filter(sender).map(|b| (b, SideRow::A))
        .chain(ctx.db.battle().opponent_identity().filter(sender)
            .filter(|b| b.player_identity != sender).map(|b| (b, SideRow::B)))
        .map(|(b, own)| {
            let tactical = ctx.db.battle_tactical().battle_id().find(b.battle_id);
            as_seen_by_side(b, own, tactical.as_ref())
        })
        .collect()
}

/// pure: the anchor as the participant on side `own` receives it.
fn as_seen_by_side(mut row: Battle, own: SideRow, tactical: Option<&BattleTactical>) -> Battle {
    let hidden = match tactical.map(|t| (t.kind, t.phase)) {
        Some((BattleKind::Pvp, Phase::Deploying)) => row.player_identity != row.opponent_identity,
        Some((BattleKind::Pvp, Phase::Active | Phase::Finished))
        | Some((BattleKind::Wild | BattleKind::Practice, _))
        | None => false,
    };
    if hidden {
        // a wire-only copy: the stored row keeps both sides
        let empty = BattleSide { active: 0, team: Vec::new() };
        match own { SideRow::A => row.state.side_b = empty, SideRow::B => row.state.side_a = empty }
    }
    row
}
```

- Exhaustive match (determinism invariant): a new kind or phase must be decided, not defaulted.
- The side comes from WHICH scan matched (structural, not re-derived from identities).
- `active` is zeroed too (plan-delta beyond the contract's "team empty"): the stored `active` is the
  first conscious member's index (`BattleSide::with_lead`), which would tell the viewer that the
  opponent's leading members are fainted. An empty side with `active: 0` is the empty value.
- The own side, outcome, turn, weather, both id lists, identities, `created_at_ms` are untouched
  (the client needs its own id list; for the accepter that is `opponent_monster_ids`).
- A battle with no tactical row (a retired 1v1 anchor, a test fixture) is returned as stored.
- Cost: one primary-key point read per row; `my_battle` holds 0-2 rows per player.
- Host semantics relied on: a view re-evaluates when a table it reads changes. `my_tactical_battle`
  and `my_battle_units` already rely on it (both read `battle`, then a tactical table written
  without an anchor write). The reveal flips `battle_tactical.phase` (+ inserts units) in one
  transaction, so `my_battle` re-delivers the whole row then. Proved live by the e2e below.

Client (`store.ts`, `main.ts`): no behaviour change is needed — measured: every read of the opponent
team is already total. Comments that state the reveal become false and are reworded:
`main.ts` ~3108 / ~3269-3271 (R-bt-14-ROSTERREVEAL), the DEV hook's "EMPTY activeSkillIds means an
abnormal server state" note (~4193). `store.ts` `ownPerspective` doc if it needs it.
`schema.rs` doc comments on `Battle` / `my_battle`. `docs/DECISIONS.md` "Tactical battle privacy is
structural…": the "Accepted reveals" sentence reworded in place (the roster reveal is closed: the
anchor hides the other side's team while Deploying; the stored row stays whole, so every close
reads it), and "Rules out" gains redacting the stored row.

## 3. Gates (CHECK/EXPECT in the ledger; counts filled after the tester's hand-off)

| Gate | Tests (trailing tag) | Runner |
|---|---|---|
| lpw-29.1 | `tactics_tests.rs` `*_lpw29_1` | nextest |
| lpw-29.2 | `tactics_tests.rs` `*_lpw29_2`, then the whole e2e `tactics-pvp.spec.ts` | nextest && playwright |
| lpw-29.3 | `tactics_tests.rs` `*_lpw29_3` + the two existing bt14_5 tests | nextest |
| lpw-29.4 | `store.test.ts` + `main.dispatch.test.ts` `[LPW29-4]` | vitest |

The e2e is the one user-facing flow (two browsers, production challenge/accept/deploy by buttons):
on each page while Deploying, the raw store row's OPPONENT side reads `hp: -1, activeSkillIds: []`
through `__mrPvp.battleById` while the own side is real; the deploy panel shows; no
`[screen] paint error` console error and no page error; after both lock (Active) both sides are real
on both pages (the host re-delivered the row at the flip).

## 4. Wrong implementations the tests must kill

1. Today's code (whole row) — 29.1 red.
2. Redaction keyed on phase only (hides a wild pack / a Practice side) — 29.2.
3. Redaction keyed on kind only (hides an Active PvP opponent) — 29.2.
4. Redaction keyed on "identities differ" only (a wild anchor's opponent is the zero identity) — 29.2.
5. Side chosen wrong (hides the caller's OWN side, or the same side for both callers) — 29.1.
6. The stored row redacted instead of the copy (start writes empty teams, materialize refills) —
   29.3 (stored anchor whole while Deploying; a Deploying disconnect close keeps both teams) and 29.2.
7. Only `team` cleared, `active` kept — 29.1 pins `active: 0`.
8. Client dereferencing the empty opponent team (`team[active].x`) in the deploy build or the DEV
   hook — 29.4 (unit: deploy panel + no reported error; e2e live).
9. Store change detection suppressing the reveal update (empty → full team reported unchanged) — 29.4.

## 4b. Plan review (reviewer + red-team) — folded

- H1 (reviewer): a PvP battle closed while Deploying (disconnect, deploy-window cancel, fallback)
  goes `Finished` with both stored teams; the contract returns every Finished battle as stored, so
  each side then reads the other's roster until the GC. A scout can challenge, be accepted, and
  disconnect (unrated) to read the roster. Hiding it changes the privacy posture beyond the stated
  contract — `spec-driven.md` §Adapting: never the builder's. Built to the contract; filed as a
  follow-up residual (security-privacy) with a spec note; named in the PR for the supervisor.
- M1: `main.dispatch.test.ts` is a sibling test of the declared `main.ts`: allowed, listed under
  `touches-delta:` (no widen).
- M2: lpw-29.3's CHECK runs the two existing "as today" tests unedited
  (`tactics_settle_tests.rs` `a_disconnect_during_deploying_cancels_the_pvp_battle_unrated_bt14_5`,
  `forfeit_refuses_a_stranger_a_wild_battle_and_a_deploying_battle_bt14_5`) plus new `_lpw29_3`
  tests for the new part: the stored anchor stays whole while Deploying and through a Deploying
  close. Teeth: a local never-committed break that stores the hidden copy at `start_pvp_tactical`.
- M3: the client tests pass on today's code (the client already tolerates an empty team). Teeth: a
  local never-committed break (drop the `?.` guard in the DEV hook; read `battle.sideB.team[0]` in
  the PvP deploy branch). The honest red of the slice is lpw-29.1 (server) and the e2e's hiding step.
- M4: only the e2e proves the host re-delivers `my_battle` at the phase flip: the e2e joins
  lpw-29.2's CHECK, run as the whole `tactics-pvp.spec.ts` (its secrecy probes also watch for a
  stray update from the new read).
- M5: the `ACCEPTED REVEALS` comment in `tactics_tests.rs` (~6356) is in the tester brief.
- L1: the hidden side is a fresh `BattleSide { active: 0, team: Vec::new() }`; `active: 0` is this
  plan's delta, not lpw-29.1's.
- L2: `player.lead_level` moved into plan-delta, citing its recorded decision.
- L3/L4: DECISIONS rewording carries the reasons (counter-picking before the lock; settlement reads
  the stored teams positionally against the id lists); the `my_battle` doc names the helper as part
  of the boundary.
- NIT: no standalone `ownPerspective` test (it never reads `team`; the accepter-role main test runs
  it); main.ts ~3108 needs no edit; deployPanel.ts / deployPanel.test.ts cite the closed residual
  only and stay true (named in the PR, no widen).

- Red-team (independent) found the same HIGH (#1; also via the deploy-window cancel,
  `fallback_close`, and an account deletion whose cascade drops the tactical row so the anchor takes
  the `None` arm). Same routing as H1: one follow-up residual.
- Red-team #2 (MED): the other side's id list stays on the copy (and `battle_challenge
  .challenger_party_ids` is public); with an id→species map from earlier battles or trade cards a
  repeat opponent names the party. Beyond the contract (the contract empties the team only) — the
  same follow-up residual, not built.
- Red-team #3: the DECISIONS wording says "hidden while Deploying" and names what remains open
  (the Deploying-close reveal, the id lists, `player.lead_level`), never "closed".
- Red-team #4: tests added to the brief — one view call with two rows of different phases and
  roles; a Finished PvP row with no unit rows returned whole; a Pvp-kind tactical row on an
  equal-identity anchor (seeded) returned whole; every view for both callers with a non-vacuous
  byte-run search; the Deploying forfeit refusal writes nothing.
- Red-team #5: the DEV hook `battleById` gains `teamSize` per side (DEV-only, `main.ts`), so the e2e
  sees the empty team itself, not only `team[active]`.
- Red-team #6: the match spells out every `Phase` for every kind.
- Red-team confirmed host semantics: a PK `find` inside a view is a recorded point read and its
  key's writes refresh the view (`spacetimedb-datastore-2.12.0` `mut_tx.rs:519-604`); the reveal
  writes no anchor, so the refresh comes from the `battle_tactical` write; a lock writes only
  `battle_deploy`, so no timing signal reaches the other side.
- Boy Scout: `schema.rs` `Player` doc says nothing but `join_game` and the cascade write
  `lead_level`; `battle::refresh_lead_level` writes it too — corrected.

## 5. Review plan

Plan: reviewer + red-team (one batch). Post-implementation: reviewer, red-team,
reducer-security-auditor, desync-guard (view-only change: quick), verifier. `/simplify` inline.

## plan-delta

- Planner role folded into the orchestrator: a one-view change whose read surface was fully mapped
  in step 1; the plan is reviewed by reviewer + red-team as step 3 requires.
- `active` zeroed on the hidden side (beyond "team empty"), reason above.
- lpw-29.1 "through every view" read as the participant views: the public `player.lead_level`
  column (its own recorded decision, DECISIONS.md "…lead_level…" ~1212-1216) still carries the
  level of each player's lead party monster at all times; not a view, not this contract.
- A PvP battle closed while Deploying is returned as stored (the contract); the resulting roster
  reveal is a filed follow-up, not built (privacy posture is the supervisor's/operator's).
