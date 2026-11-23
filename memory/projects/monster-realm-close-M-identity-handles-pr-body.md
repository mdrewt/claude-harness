Closes **M-identity-handles**, a game milestone. All four of its slices are merged on the game's `master`: `ih-4` #789 (`5fdc4712`), `ih-1` #790 (`ac8c52c4`), `ih-2` #793 (`124c8e4e`) and `ih-3` #797 (`80e1276c`). PLAN names no unbuilt scope of the spec, so the spec is deleted.

## What changed
- **Notes folded, then harvested.** The 15 pending Build notes were folded into this branch's copy of the spec, one `wip` commit per slice (`ih-4` ×2, `ih-1` ×6, `ih-2` ×4, `ih-3` ×3). `mr-gates notes harvest` then passed on the folded spec before it was deleted: `NOTES-HARVESTED M-identity-handles.spec.md (15 note(s), 4 follow-up row(s))` at `ab153e64`. The four follow-up-worded notes already had residual rows: `R-ih-4-NOTEF01C62`, `R-ih-1-NOTEFF6B04`, `R-ih-2-SCHEMADOC` and `R-ih-2-PLAYERROWFLOOD`. One more gap, in a note not worded as a follow-up, is filed below (the rename finding).
- **The spec's named deferrals now have homes outside it.** Before this PR they lived only in the spec text:
  - The player's own tag on the Profile screen goes to M19. Its PLAN item now names it, along with the `playerTag.ts` helpers M19's friend requests and chat consume (contract C4).
  - Tags on the Rankings tab, the trade editor heading and the PvP challenge rows, plus the Players-tab walk-up line that `ih-3` left name-only, are filed as `R-close-M-identity-handles-TAG-SURFACES` (backlog, ux-a11y/LOW).
  - The low-contrast tag span inside one-line banner text, together with the bidi run-reordering `ih-3` measured in the banner join, is filed as `R-close-M-identity-handles-BANNER-TAG-SPAN` (backlog, ux-a11y/LOW).
  - `ih-3`'s manual pass found that a rename is lost at the next join: the client joins every identity as `Player` and `join_game` writes that name. It is filed as `R-close-M-identity-handles-RENAME-LOST-AT-JOIN` (backlog, gameplay/MED). The review found this; the note had no row behind it, because its wording is not a follow-up.
  - The real OIDC issuer and its server allow-list is a future milestone under #588 D3. It is filed as `R-close-M-identity-handles-REAL-ISSUER` (backlog, security-privacy/LOW) and points at `ops/auth/README.md` "Point the game at it". It needs the operator to choose a provider.
- **`specs/monster-realm-v2/M-identity-handles.spec.md` deleted.**
- **PLAN.md**:
  - §9 item 1 is removed and items 2–13 become 1–12, so M-test-health is now first.
  - M25 loses "Its server-side slices may run alongside M-identity-handles where files are disjoint." No milestone of that kind remains open, and parallel runs on disjoint files are the general fan-out rule.
  - M19's "absorbs the discriminator surfaces from M-identity-handles" becomes what M19 actually takes over: the tag helpers it calls, and the own-tag deferral.
  - §Built gains an **Identity** line for **M-identity-handles** (`ih-*`). It cites the two game DECISIONS entries by their full titles.
  - PLAN cites no item number and no spec file of this milestone.
- **structure.spec.md: no edit is due.**
  - The spec's `## Risks` routed the test-only `HEAL_COOLDOWN_MS` constant to a `type: refactor` section. That section already exists as `st-9` ("server raising: the test-only `HEAL_COOLDOWN_MS` constant goes"), and the constant is still on game `master` (`server-module/src/raising.rs`), so `st-9` stays open.
  - The stored close record `$MEM/prune/close/M-identity-handles.json` was taken at `80e1276c`, which holds all four ih commits. Its trend row already carries the close, so a rerun of `mr-prune close` only prints `PRUNE-CLOSE-SKIP`.
  - The record is not stale. The game's freshly fetched `origin/master` (`e66239ca`) adds only `st-8` and `th-1` after it, and they touch no file an ih slice changed (gate X6 checks this).
  - The record has 4 rows and `section: null`. Its one routed row (`HEAL_COOLDOWN_MS` → `st-9`) is named in that section. The other three (`CLAIM_EVENT_KINDS`, `cldr`, `PRIVACY_PSEUDONYMIZATION_DISCLOSURE`) are `orphan-protected` report rows, which need no action.
- **$MEM**: I deleted the eleven uncited records `monster-realm-ih-{1,2,3}-{plan,tester-brief,pr-body}.md` and `monster-realm-ih-4-{plan,tester-brief}.md`. They were untracked. No live file cites them or the spec: not the branch tree, an `mr-*` tool, a `$MEM` markdown file, or the game's `origin/master` (gate X4).
  - The append-only handoff log mentions `monster-realm-ih-2-pr-body.md` in a dated 2026-11-15 entry, which is history. It is only written through `mr-record handoff`, so I left it alone.
  - `mr-residuals.jsonl` names the spec file inside the wontfix reason of `R-ctl-8g-CTL8G.1`, also history.
  - PLAN.md was the only tree file that cited the spec. It still names the milestone, which resolves through §Built, so no touches widen was needed.

## decisions
These lasting decisions already stand title-keyed in the game's `docs/DECISIONS.md` at `e66239ca` (gate X5):
- **"A player's tag is a minted sequence value: private at rest, mirrored on the public player row while online"** covers:
  - `handle-storage` (the private `player_handle` table plus the public `player.discriminator` mirror, and why neither `player` alone nor `profile` works);
  - `mint` (the `#[unique] #[auto_inc]` sequence, never reissued);
  - `handle-owner` (`onboarding.rs`);
  - `legacy-identity` (`join_game` finds the caller's row or mints one);
  - `deletion` (erase, and zero both mirror columns);
  - `claim-collision` (`account_has_game_data`);
  - `retired-guest` (minted a different value);
  - `lead-level` (`battle::refresh_lead_level`, the seam rule, the rejected view);
  - `tag-format`, `banner-tag-style`, the three tagged surfaces and the name-only rest;
  - export of the handle row;
  - sequence exhaustion.
- **"A target's kind gates telemetry and account sign-in: only servers we operate get either"** covers `provider-label` (the provider name, or else the issuer), `issuer-read-once`, `no-offer-copy` and the hidden-is-presentation rule (`claimSignIn` checks the offer).

Missing: the #588 citation for the operator's answers (D1–D3; D4 is PLAN ordering and stands in M19's item), the label wording and its reason (registration happens at the provider), auth pluggable per build, `level-copy`, `muted-token`, `empty-name-fallback`, `e2e-issuer`, the provider label's no-URL-parsing rule, and three tradeoffs the spec's Risks accepted: the public lead level, a tag telling identities (not people) apart, and the guest-to-account link. They are drafted below as two in-place amendments for the supervisor's game doc-only PR. I have not edited the game repo.

### Amendment: A player's tag is a minted sequence value: private at rest, mirrored on the public player row while online

The entry is amended in place. Four changes:
- In **Decision**, the parenthesis "(name, tag, lead level, Nearby, each its own element, the tag in the muted text colour except on the cursor row)" becomes:

  ```markdown
  (name, tag, lead level, Nearby, each its own element; the tag in the muted text colour
  `--mr-text-muted`, which the accessibility suite checks in both themes, except on the cursor
  row; the level through the battle HUD's `tactics.hud.level` copy so it reads the same in both
  places, and none for 0)
  ```
- In **Decision**, after the sentence "Every other surface shows the name alone: the tactical battle clock, the trade editor heading, the rename view, the Rankings tab.", insert:

  ```markdown
  `playerName` (`client/src/ui/tradeSessionModel.ts`) shows `#` and the first eight hex digits of
  the identity when the store holds no row for it or the row's name is empty. That fallback is not
  a tag: `validate_name` refuses an empty name at join and rename, so only an identity the store
  does not hold reaches it, and that identity has no tag to show.
  ```
- In **Why**, "(the operator's ruling)" becomes:

  ```markdown
  (the operator's ruling, <https://github.com/mdrewt/monster-realm/issues/588>)
  ```
- In **Rules out.**, after the last sentence "once it is spent every identity without a handle is refused at join.", append:

  ```markdown
  Also accepted: any client sees each online player's lead level and its changes as they happen
  (reorders, boxing, level-ups), because the operator chose the lead level for the Players row;
  bucketing the value is the remedy if a playtest finds that matters. A tag tells identities
  apart, not people: anonymous identities cost nothing to mint. And the tag links a claimed guest
  to its account for anyone who saw the guest's tag, which is the ruling's intent; deletion
  zeroes the tag on the surviving row only, not in another player's memory or screenshots.
  ```

### Amendment: A target's kind gates telemetry and account sign-in: only servers we operate get either

The entry is amended in place. Three changes:
- In **Decision**, after the sentence ending "and reads the Sign In control and the connection's sign-in calls).", insert:

  ```markdown
  The control reads "Sign in / create account with <provider>" (`claim.signInWithProvider`),
  because registration happens at the provider (operator ruling,
  <https://github.com/mdrewt/monster-realm/issues/588>). The e2e build sets the server's
  placeholder issuer `https://auth.monster-realm.invalid/` and a provider name
  (`client/playwright.config.ts`), so the browser suite runs the labelled sign-in and its
  fail-safe; the hidden control is proven by the DOM view tests and
  `main.targetKindGate.test.ts`.
  ```
- In **Why**, after the sentence ending "with no issuer the prompt says accounts are not available on that server.", insert:

  ```markdown
  The issuer and the provider name are build values that reach the client at this one seam, and
  no client logic assumes a provider, so each build can point at its own OIDC provider.
  ```
- In **Rules out.**, before the sentence "A per-world telemetry opt-in or per-world sign-in changes these two gates and their tests, not a side path.", insert:

  ```markdown
  Client logic that assumes a provider, or a provider label derived by parsing the issuer URL (the
  OIDC flow already refuses an issuer it cannot use).
  ```

touches-delta: none
boyscout-delta: none
plan-delta: fold and harvest ran through `mr-gates`'s `cmd_notes` with the corpus pointed at this worktree, because the CLI hardcodes the main checkout's `specs/`, which a run must not edit. #237, #239 and #240 used the same route. Two things go past the brief's list, both needed so nothing is lost with the spec. First, the three registry rows for the spec's named deferrals. Second, M19's PLAN item now carries the own-tag deferral. `M19-social.spec.md` is outside `touches:`, so the PLAN item is where that deferral survives.
comment-scan: CLEAN
Items: none

## Acceptance
Acceptance: 7/7 met, 0 deferred, 0 unmet — close-M-identity-handles seed:e3b0c44298fc1c14

**Gate:** `memory/projects/mr-selfcheck` prints SELFCHECK-OK (X1). No `mr-*` tool was touched or added, so no `--selftest` is owed. `just ci` exits 0, but it is not the gate. X2–X7 run through `$MEM/gates/close-M-identity-handles.probe.mjs`. The probe has teeth: X3, X4, X6 and X7 each failed before the edits, and X5 failed until the PR body held the drafts.

**Review:** one independent fact-check lens (the reviewer agent) read the deleted spec, its Build notes, the PLAN diff and the drafts against the game's files. It found:
- one unrecorded gap: a rename is lost at the next join. Now `R-close-M-identity-handles-RENAME-LOST-AT-JOIN`.
- an incomplete `playerName` claim (the empty-name case and `validate_name`'s reason were missing);
- an overclaim in "each client build can bring its own sign-in": the seam takes an OIDC provider only;
- history wording ("where it was owner-only before") and missing reasons for the public lead level, `level-copy` and `muted-token`;
- the unrecorded "a tag tells identities apart, not people" tradeoff;
- two imprecisions in §Built: the world draws no player name, and Sign In also depends on the target kind;
- a nested parenthesis.

All are fixed. The reviewer found every insertion point verbatim in the game entries and checked the rest of the drafted facts against the code.

## Risks
- **Drafts not yet live.** Until the supervisor ships them, the #588 citation, the label's reason, the e2e-issuer rule, the `playerName` fallback rule and the accepted tradeoffs live only in this PR body and the game's code comments.
- **Legacy identities (transient).** `legacy-identity` assumes a publish disconnects every live session, which `ih-1` did not verify against a live upgrade (Build note n6). A `player` row that outlives the publish shows no tag until its session ends, and `join_game`'s "already joined" refusal means nothing can backfill it in place. The effect ends with that session, so no row was filed. The standing rule (a join finds the caller's handle or mints one) is in the tag entry.
- **Stale text left alone.** The closed spec `M-postgate-client-coverage.spec.md:4` still says "PLAN §9 item 1". That reference was already stale, and the file is outside `touches:`. The game's "in the world the name alone" (tag entry, Why) is the operator's ruling wording and stays. No player name is drawn in the world today.
- **Entry length.** The tag entry is already long, and the first amendment adds about 12 lines. Trimming is the supervisor's call when the game PR is cut.

not-verified: the drafted entries' length and wording were not checked by the game's doc gates. Those gates run on the supervisor's game PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
