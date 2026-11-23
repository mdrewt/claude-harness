# lpw-29 tester brief (RED phase)

You are the `tester` for Monster Realm v2 slice lpw-29. You write the gating tests from the EARS
criteria below; you do NOT implement the feature. You have no shell: the orchestrator runs every test
and proves each fails on the real defect. Write only the test files named under Contracts.

Worktree (write ONLY here): `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-29`
Spec: `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-local-play.spec.md` §lpw-29.
Plan: `/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-lpw-29-plan.md`
(§2 design, §4 the wrong implementations your tests must kill — read both).
Verification SSOT: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`.

## EARS (verbatim)

- **lpw-29.1:** WHEN a PvP battle between two players is Deploying, THE SYSTEM SHALL deliver to each
  participant, through every view, no species, level, stat or skill of the opponent's monsters.
- **lpw-29.2:** WHEN that battle becomes Active, THE SYSTEM SHALL deliver the opponent's side as it
  does today, and a wild or Practice battle SHALL be delivered whole in every phase.
- **lpw-29.3:** WHEN a participant forfeits or disconnects while the battle is Deploying, THE SYSTEM
  SHALL settle and write back HP as it does today.
- **lpw-29.4:** WHEN the client receives a battle row whose opponent team is empty, THE CLIENT SHALL
  show the deploy panel and report no error.

Spec contract: only for a `Pvp` battle whose `battle_tactical` phase is Deploying and whose two
identities differ, `my_battle` returns the caller a copy of the row with the other side's `team`
empty; a wild battle, a Practice battle and every Active or Finished battle are returned as stored.
The stored row is unchanged, so settlement, forfeit and disconnect during Deploying write back as
today. The client's own-perspective conversion and its DEV battle hook accept an empty opponent team.

## Contracts (decided by the builder; your tests call exactly these)

SERVER — `my_battle` (`server-module/src/schema.rs`), run through the shipped view entry point:
`fx.call_view::<crate::schema::Battle>(crate::native_host_tests::VIEW_MY_BATTLE, who)`.
- PvP (`BattleKind::Pvp`), phase `Deploying`, `player_identity != opponent_identity`:
  - caller == `player_identity` (side A) receives the STORED row with `state.side_b` replaced by
    `BattleSide { active: 0, team: vec![] }`; every other field byte-identical to the stored row
    (`battle_id`, both identities, `state.side_a`, `state.outcome`, `state.turn_number`,
    `state.weather`, `party_monster_ids`, `opponent_monster_ids`, `created_at_ms`).
  - caller == `opponent_identity` (side B) receives the stored row with `state.side_a` replaced by
    `BattleSide { active: 0, team: vec![] }`, everything else identical.
- Every other case returns the row byte-identical to the stored one: PvP `Active` / `Finished`,
  `Wild` in any phase (its opponent column is the zero identity), `Practice` in any phase
  (`player_identity == opponent_identity`, delivered exactly once), and an anchor with no
  `battle_tactical` row.
- The stored `battle` row is never changed by any of this: while Deploying it holds both full teams.
- Compare rows by encoding: `enc(&row)` / `row_set(&rows)` (tactics_tests.rs helpers).

SERVER test home: `server-module/src/tactics_tests.rs` (it has every fixture). Names lead with the
behaviour and END with the trailing tag `_lpw29_1`, `_lpw29_2` or `_lpw29_3` (the ledger CHECK
selects `test(/_lpw29_N$/)`; give no other test those suffixes). Fixtures to reuse (read them):
`fixture()`, `world(&fx)`, `deploying_pvp(&fx,&w,a_specs,b_specs,format)`, `live_pvp(...)`,
`deploying_pair(&fx,&w)` (a wild Deploying battle), `live_pair` (a wild Active battle),
`start_pvp(&fx, a(), &[..], a(), &[..], fmt, pvp_seed(7), T0)` (Practice), `deploy(fx, who, t, id,
picks)`, `w.anchor(id)`, `w.tactical(id)`, `w.snapshot()` / `changed()` / `none()`,
`crate::resolve_all_live_interactions(&fx.ctx_at(at(t)), who)` (the disconnect resolve), the forfeit
reducer as `fx.run_as_at(who, at(t), |ctx| super::forfeit(ctx, id))`, `fire_deadline` +
`deadline_args` (the deploy-window expiry), `opponent_views(&fx)` (every view B reads, as bytes),
`a()`, `b()`, the `Spec` arrays (`PAIR`, `B_PAIR`, `A_TRIO`, ...). Use two DISTINGUISHABLE parties
(different species ids, levels and skills per side) so a side swap is visible.

What each gate's tests must prove (minimum; add what the wrong-impl list in plan §4 needs):
- `_lpw29_1`: a Deploying PvP battle — A's `my_battle` row and B's `my_battle` row each equal the
  contract copy above (own side whole as a positive control, the other side `active 0, team []`);
  still hidden after ONE side has locked its deploy (A locked, B not; and B locked, A not) — the
  stage write reveals nothing; across EVERY view each participant reads during Deploying (use and,
  if needed, generalise `opponent_views` for either caller: `my_battle`, `my_tactical_battle`,
  `my_battle_units`, `my_battle_events`, `my_battle_clock`, `my_battle_queue`, `my_battle_deploy`)
  no row carries the encoding of any of the other side's `BattleMonster`s (`enc(&m)` byte-run search
  with `contains_bytes`, the existing helper), with the SAME search finding them once the battle is
  Active (positive control: the search is not vacuous). Both callers. Mark the `active: 0` assertion
  in a comment as this plan's choice (the spec asks for an empty team).
  Also: ONE view call returning TWO rows — the caller is side A of a kept-latest Finished PvP battle
  against C and side B of a Deploying PvP battle against another player (seed what the fixtures
  need: `w.battle.seed`, `w.edit_tactical`, or two real starts) — only the Deploying row is hidden,
  and on the correct side (kills: the tactical row of the wrong battle read; one phase applied to
  every row; the side derived wrongly when the caller holds both roles across rows).
- `_lpw29_2`: after the reveal (`live_pvp`) both callers' `my_battle` rows are byte-identical to the
  stored anchor; a wild battle Deploying (`deploying_pair`) and Active (`live_pair`) is returned whole
  to its player (the wild pack in `side_b` present); a Practice battle Deploying and Active is
  returned whole, exactly once; a Finished PvP battle closed after Active is returned whole to both,
  INCLUDING once its `battle_unit` rows are gone (GC'd or deleted in the fixture: kills a hiding rule
  keyed on "no unit rows"); a PvP battle closed while Deploying (Finished) is returned whole to both
  (the contract: every Finished battle as stored); an anchor whose `battle_tactical` row is absent is
  returned whole; and a `Pvp`-kind tactical row on an anchor whose two identities are EQUAL (seed it:
  a Practice start with its tactical `kind` edited to `Pvp` via `w.edit_tactical`) while Deploying is
  returned whole, exactly once (kills dropping the "two identities differ" conjunct).
- `_lpw29_3`: the CHECK also runs two existing tests unedited
  (`tactics_settle_tests.rs` `a_disconnect_during_deploying_cancels_the_pvp_battle_unrated_bt14_5`,
  `forfeit_refuses_a_stranger_a_wild_battle_and_a_deploying_battle_bt14_5` — read them; do not
  duplicate them). Your new `_lpw29_3` tests cover what they do not: after both participants'
  views ran while Deploying, the STORED anchor (`w.anchor(id)`) is byte-identical to the anchor
  `start_pvp_tactical` wrote (both full teams); a forfeit while Deploying writes nothing at all
  (`changed(&before, &w.snapshot())` is `none()`) and the stored anchor stays whole; a disconnect of
  A, and separately of B, while Deploying closes with the stored anchor equal to the start except
  `state.outcome == Fled` (both teams intact), monsters and `monster_pub` unchanged; the
  deploy-window expiry auto-fill (one side locked, the window fires) reveals with both stored teams
  whole and both `my_battle` rows then byte-identical to the stored anchor. Kills: the stored row
  redacted instead of the copy (e.g. `start_pvp_tactical` writing the hidden copy).

CLIENT — ONE client API change, made by the implementer: the DEV hook
`window.__mrPvp.battleById(id)` (main.ts ~4198) gains `teamSize: number` on each side
(`team.length`), beside `active`, `activeSkillIds`, `hp`. Everything else already exists:
- `AuthoritativeStore` (`reconcileBattlesFromView`, `upsertBattle`, `battle(id)`,
  `latestPlayerBattle`, `onBatchApplied`, `flushBatch`) in `client/src/net/store.ts`; tests in
  `client/src/net/store.test.ts`.
- The booted-main harness of `client/src/main.dispatch.test.ts` (the bt-15 PvP deploy-panel test
  `a Deploying PvP battle shows the deploy panel ... [BT15-1]`, ~7106, and its helpers) for the
  deploy panel and the DEV hook.
Client test titles END with the trailing tag `[LPW29-4]` (the CHECK runs `-t LPW29-4`; no other test
may contain that string).
- store.test.ts `[LPW29-4]`: the store reports the reveal — a battle reconciled with an empty
  opponent team (`{active: 0, team: []}`), then the same `battleId` with the team filled, is a
  change (the batch signal fires and `battle(id)` returns the filled team; `deepRowEq` must not
  suppress it), and the reverse order too. No standalone `ownPerspective` test (it never reads a
  team; the accepter-role main test below runs it).
- main.dispatch.test.ts `[LPW29-4]`: for BOTH roles (booted player as `playerIdentity` with raw
  `sideB` empty; booted player as `opponentIdentity` with raw `sideA` empty), a `Pvp` battle in
  `Deploying` shows the PvP deploy panel listing the booted player's OWN party, and nothing is
  reported: no `console.error` call starting `[screen] paint error`, no error-ring entry (find the
  observable the file already uses), no throw; `__mrPvp.battleById(id)` answers the empty side as
  `{ active: 0, activeSkillIds: [], hp: -1, teamSize: 0 }` and the own side with its real values
  (`teamSize` = the own team's length).
These client tests pass on today's code except the `teamSize` field (the client already tolerates
an empty team). For each, name in your report a deliberate local break that makes it fail (e.g.
dropping the `?.` guard in `battleById`, reading `battle.sideB.team[0]` in the PvP deploy branch).

E2E — `client/e2e/tactics-pvp.spec.ts` (two browsers, production challenge/accept/deploy by
buttons; read its header and controls.ts). Add ONE test, titled with a trailing `[LPW29-4]`, placed
BEFORE the disconnect test (it closes B's browser): open a PvP battle (`challengeAndAcceptByButtons`),
and while it is Deploying assert on B's page `__mrPvp.battleById(id)` → `sideA` is
`{ teamSize: 0, activeSkillIds: [], hp: -1 }` and `sideB.teamSize >= 1, sideB.hp > 0`, and on A's
page `sideB.teamSize === 0` and `sideA.hp > 0`; both pages show the deploy panel; then both deploy by
buttons and, once both pages read phase `Active`, `battleById` reports both sides with
`teamSize >= 1`, `hp > 0` and non-empty `activeSkillIds` on BOTH pages (poll: the row arrives with
the phase flip — this is the live proof that the host re-delivers `my_battle` when only
`battle_tactical` changes). Throughout, collect `page.on('console')`
errors whose text starts `[screen] paint error` and `page.on('pageerror')` on both pages; assert
none. End the battle the way the file's other tests do so the next test starts clean (read T5/T3).
Extend the spec's local `Win` type for the `battleById` fields you read (`teamSize` is the implementer's addition above).

Also in `server-module/src/tactics_tests.rs`: the comment block `ACCEPTED REVEALS (REV 2 H …)` above
`opponent_views` (~6355) names reveal (a), the roster through `my_battle` from Deploying; after this
slice that reveal is closed. Reword that comment to state current behaviour (it is test-file prose:
yours to edit). Do not touch any other existing test body.

## Doctrine (repo scanners that read test files)

- `scripts/check-secrets.mjs` flags `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on any
  line; avoid such literals.
- `mr-comment-scan` flags criterion ids in comments (allowed only as the trailing token of a test
  title) and history wording in comments ("no longer", "the old", "used to", "was"). Comments state
  current behaviour. Do not write `lpw-29` or `LPW29` in a comment.
- Test names lead with the behaviour; the tag is the trailing token only.
- No source-text reading checks, no prose pins, no tests of tests (testing-tdd.md §Forbidden shapes).
- `describe.sequential` trips the client spec-shape tripwire; the e2e file already uses
  `test.describe.serial` — keep its shape.
- Never weaken or edit an existing assertion.

## Report

Return: the files you changed; each new test's name and the wrong implementation(s) it kills; the
expected RED reason of each on today's code (for lpw-29.3 and the client gate, say which tests pass
on today's code — "as today" characterization — and name a deliberate local break that would make
each fail, so the orchestrator can watch it); and, separately, any DEFECT (spec/contract problem) or
QUESTION you found.
