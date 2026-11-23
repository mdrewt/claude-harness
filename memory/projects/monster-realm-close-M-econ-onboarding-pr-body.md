Closes **M-econ-onboarding**, a game milestone. Both of its slices are merged on the game's `master`: `eo-1` #787 (`11e8cb21`) and `eo-4` #788 (`0c491981`). The sketch's `eo-2` and `eo-3` were rulings with no build. PLAN names no unbuilt scope of the spec, so the spec is deleted.

## What changed
- **Notes folded, then harvested.** The 13 pending Build notes were folded into this branch's copy of the spec, one `wip` commit per slice (`eo-1` ×9, `eo-4` ×4). `mr-gates notes harvest` then passed on the folded spec before it was deleted: `NOTES-HARVESTED M-econ-onboarding.spec.md (13 note(s), 5 follow-up row(s))` at `c9d99110`. Each gap the notes name already has a residual row, so nothing is lost with the spec: `R-rb-132-WALLETSYBIL`, `R-eo-1-TOMBSTONE-ERASURE`, `R-eo-1-TOMBSTONE-CLAIM`, `R-eo-1-BAG-CONTRAST` and `R-eo-4-NOTECD94AD`. The spec's own deferrals were already rows: `R-econ-spec-NOTEDED5DD`, `R-econ-spec-NOTE27294A`, `R-econ-spec-NOTE7D4055` and `R-econ-spec-NOTE241D57`.
- **The two residuals the spec absorbed are dispositioned `fixed`** in the registry, through `mr-gates residuals disposition`:
  - `R-weekly-review-2026-10-23-F1` (the rejoin re-grant), fixed by `eo-1` (#787).
  - `R-weekly-review-2026-10-09-F1` (the practice faucet), fixed by the M-battle-tactics cutover (#671, which removed the reducer that started the 1v1 self battle; #622 and #660 pay a Practice KO and a Practice settle nothing). The game records the ruling in "Tactical battle privacy is structural, and tactical rows are not exportable" ("Practice rates and pays nothing"). The unreachable legacy funnel branch stays a row: `R-econ-spec-NOTE27294A`.
- **`specs/monster-realm-v2/M-econ-onboarding.spec.md` deleted.**
- **PLAN.md**:
  - §9 item 1 is removed and items 2–14 become 1–13.
  - Three passages that depended on the milestone or on item numbers now read without them:
    - M25 "alongside M-econ-onboarding and M-identity-handles" becomes "alongside M-identity-handles".
    - Residual fill-work drops "(econ: 2026-10-09-F1)", since that row is now dispositioned.
    - "Milestone specs for items 1–10 and 14" becomes "for the items through M-battle-tactics depth, and for M-modding".

    PLAN now cites no item number.
  - §Built gains an **Economy** line for **M-econ-onboarding** (`eo-*`). It names where the kit and tuning numbers live and does not restate them.
  - §Risks (live) names free healing as the game's standing decision, where it used to call it an "inert heal sink" gap (boyscout).
- **structure.spec.md**: no close section is due. I regenerated the close record with `mr-prune close` against the game's freshly fetched `origin/master` (`cee8c4f2`). Both slice commits matched. The record has 11 rows and `section: null`, and every row routes to `st-8`. Ten of them are `st-8`'s own `parse_*` wrappers. The eleventh is `clamp_position` in `game-core/src/lib.rs`, which only its own test calls. `st-8` matched it only because it touches `lib.rs`, and its text never named it. So `st-8` gains one paragraph that names it as a candidate, so the row is not lost. The record is now stored at `$MEM/prune/close/M-econ-onboarding.json`.
- **$MEM**: I deleted the five uncited records `monster-realm-eo-1-{plan,tester-brief}.md` and `monster-realm-eo-4-{plan,tester-brief,pr-body}.md`. They were untracked. No live file cites them or the spec: not the branch tree, an `mr-*` tool, a `$MEM` markdown file, or the game's `origin/master` (gate X4). The other files the brief listed (`game-design.md`, `playtest-feedback-2026-10.brief.md`, `M-identity-handles.spec.md`, `structure.spec.md`) name the milestone or its slice ids, not the spec file. The milestone stays named in §Built, so they still resolve, and no touches widen was needed.

## decisions
These lasting decisions already stand title-keyed in the game's `docs/DECISIONS.md` at `cee8c4f2` (gate X5):
- **"The starter is a once-per-identity grant recorded by a marker; ownership is never the test"** covers:
  - the kit's home and contents (`game-core/content/starter_kit.ron`: 200 gold, 2 Lure Berries, 1 Antidote), validated at publish by `validate_starter_kit`;
  - the `sys:starter_claimed` marker, set in the kit's transaction;
  - `starter_grant`'s rule, including the legacy joiner, which gets the kit and no second monster;
  - the whole-kit-or-none headroom check and `starter_kit_skipped`;
  - the fail-loud kit load;
  - the reserved `sys:` namespace;
  - the retired-guest tombstone.
- **"Healing is free, and quests are the recruit loop's faucet"** covers free healing, quest_001 as the recruit loop's faucet, recruit pays nothing (#587) and the worksheet. The entry rules out restating rewards in prose, so the 150 lives in content: `game-core/content/quests/000-core.ron` pays 150 on `master`.
- **"Tactical battle privacy is structural, and tactical rows are not exportable"** covers the practice-faucet-closed ruling.

Three `decision-defaulted` rows are missing: `kit-tradeable`, `kit-ack` and `export-tier-signal`. So is `prices-and-divisor`, which the healing entry implies but never states. They are drafted below as three amendments for the supervisor's game doc-only PR.
- `onboarding-module` is structure, and the starter entry already names `onboarding::starter_grant`.
- `recruit-loop-budget` is a relation that the healing entry leaves to `pt_d3_tuning.rs`. Amendment 2 names its test.
- `kit-tradeable` is drafted as current behaviour, not a ruled-out soulbound flag. `docs/economy-tuning.md` "Shared-economy caveat" still offers untradeable payouts as one way to meet the official server's launch condition.

I have not edited the game repo.

### Amendment: The starter is a once-per-identity grant recorded by a marker; ownership is never the test

The entry is amended in place. Two changes:
- In **Decision**, after the sentence ending "checked at publish by `validate_starter_kit`.", insert:

  ```markdown
  Kit items are ordinary items: they can be traded and sold. The join shows no notice for the
  kit, because the wallet readout and the Bag already show it.
  ```
- In **Why**, append:

  ```markdown
  Making the kit untradeable would need a new item field and a trade rule, and would not stop
  one player farming throwaway identities on its own: each fresh identity already gets a
  tradeable starter monster. How the official server keeps those payouts from reaching a main
  identity is an open launch condition (`docs/economy-tuning.md`, "Shared-economy caveat").
  ```

### Amendment: Healing is free, and quests are the recruit loop's faucet

The entry is amended in place. Two changes:
- At the end of **Decision**, append:

  ```markdown
  Shop prices, the sell price's fraction of the buy price and `BATTLE_CURRENCY_BST_DIVISOR` are
  not the lever for recruit-heavy play; the quest reward is. With a full party, recruit-heavy
  play in zone 0 buys a Lure Berry within a fixed battle budget, a test over the shipped content
  (`recruit_heavy_zone0_battles_buy_a_lure_berry_within_the_battle_budget`).
  ```
- In **Rules out.**, the list item "restating prices, rewards or battle budgets in prose docs." becomes:

  ```markdown
  restating prices, rewards or battle budgets in prose docs; raising battle payouts or cutting
  shop prices to fund recruit-heavy play.
  ```

### Amendment: Account deletion and data export

The entry is amended in place. One change:
- In **Why**, after the sentence ending "with anonymous identities limited before account holders.", insert:

  ```markdown
  The starter kit's currency creates the wallet row at an identity's first join, and only an
  identity with a `player` or `account` row can request an export, so the no-wallet tier holds
  almost no caller and a join alone reaches the anonymous tier. The wallet signal stays: any
  per-identity signal an anonymous identity can earn is cheap, and sign-in is the fix.
  ```

touches-delta: none
boyscout-delta: specs/monster-realm-v2/PLAN.md §Risks (live) first bullet — free healing is now a standing game decision, not an "inert heal sink" gap
plan-delta: fold and harvest ran through `mr-gates`'s `cmd_notes` with the corpus pointed at this worktree, because the CLI hardcodes the main checkout's `specs/`, which a run must not edit. #237 and #239 used the same route. Two things go past the brief's list, both needed so nothing is lost with the spec: the two residual dispositions (the brief asked that 2026-10-09-F1's resolution be recorded, and the registry had both rows still open), and the `st-8` paragraph for the close record's `clamp_position` row.
comment-scan: CLEAN
Items: none

## Acceptance
Acceptance: 7/7 met, 0 deferred, 0 unmet — close-M-econ-onboarding seed:e3b0c44298fc1c14

**Gate:** `memory/projects/mr-selfcheck` prints SELFCHECK-OK (X1). No `mr-*` tool was touched or added, so no `--selftest` is owed. `just ci` exits 0, but it is not the gate. The probe has teeth: X3, X4, X6 and X7 each failed before the edits, and X5 failed until the PR body held the drafts.

**Review:** one independent fact-check lens (the reviewer agent) read the diff and the drafts against the game's files. It found:
- a false export-tier claim in the first draft (an identity must have a `player` or `account` row to export at all), now rewritten and moved to "Account deletion and data export";
- a ruled-out soulbound kit that contradicted the worksheet's open launch condition, now stated as current behaviour;
- a notice ruling with no reason;
- restated numbers in §Built;
- an `st-8` merge check that did not cover `clamp_position`.

All five are fixed.

## Risks
- **Stale text left alone:**
  - `M-identity-handles.spec.md:4` still says "`eo-1` … is in flight".
  - `M-postgate-client-coverage.spec.md:4` still says "PLAN §9 item 1". That reference was stale before this change, and it pointed at a milestone closed long ago.

  Both are other specs, outside `touches:`, and `mr-touches` refuses spec files. Neither cites `M-econ-onboarding.spec.md`.
- **Stale game comments.** `server-module/src/privacy.rs`'s export-tier comments still say the no-wallet tier sheds "join-only sybils". That stopped being true when `eo-1` gave every joiner a wallet. The fix is a comment change in the game repo, filed as `R-close-M-econ-onboarding-PRIVACY-SYBIL-COMMENT` (backlog, security-privacy/LOW). The supervisor may fold it into the game doc-only PR.
- **Entry length.** The starter entry is already about 33 lines, over the 10–25 bar, and amendment 1 adds about 7. Moving the export consequence to the export entry kept the growth down. Trimming is the supervisor's call when the game PR is cut.
- **Drafts not yet live.** Until the supervisor ships them, the kit-tradeable, prices-and-divisor and export-tier rulings live only in `docs/economy-tuning.md` and code comments.

not-verified: the drafted entries' length and wording were not checked by the game's doc gates. Those gates run on the supervisor's game PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
