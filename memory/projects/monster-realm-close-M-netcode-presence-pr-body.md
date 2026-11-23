Closes **M-netcode-presence**, a game milestone. Its five slices are all merged on the game's `master`: `np-d` #778, `np-a` #779, `np-c1` #780, `np-c2` #783 and `np-b` #785. PLAN names no unbuilt scope of the spec, so the spec is deleted.

## What changed
- **Notes folded, then harvested.** The 25 pending Build notes were folded into this branch's copy of the spec, one `wip` commit per slice: `np-a` ×5, `np-c1` ×5, `np-d` ×4, `np-c2` ×8, `np-b` ×3. `mr-gates notes harvest` then passed on the folded spec before it was deleted: `NOTES-HARVESTED M-netcode-presence.spec.md (25 note(s), 13 follow-up row(s))` at `865677cb`. Each gap the notes name already has a residual row, so nothing is lost with the spec: `R-np-a-flake`, `R-np-a-np-a.5`, `R-np-b-FWDDIVERGE`, `R-np-b-SLOWLINK`, `R-np-c1-CODED-INPUT-KIND-REJECT`, `R-np-c1-STALE-BUNDLE-RELOAD`, `R-np-c2-late-step-at-window-boundary` (two notes), `R-np-c2-npa9-continuation-tooth-margin`, `R-np-c2-press-model-wording`, `R-np-d-ATTEMPT-WATCHDOG`, `R-np-d-NOTE58586B` and `R-np-d-STALE-TIMER-OVER-LIVE-LINK`.
- **`specs/monster-realm-v2/M-netcode-presence.spec.md` deleted.**
- **PLAN.md**:
  - §9 item 1 is removed and items 2–15 become 1–14.
  - Five references that used to give a number now name the milestone: M25 "alongside M-econ-onboarding and M-identity-handles", M19 "from M-identity-handles", M21b-3 "consumed by M-local-play", and §Built's "§9's M21b-3" and "§9's M-local-play item".
  - The one range left is renumbered: "items 1–11 and 15" becomes "items 1–10 and 14".
  - §Built gains a **Netcode** line for **M-netcode-presence** (`np-*`).
- **structure.spec.md: unchanged.** No close record was stored, so I regenerated it with `mr-prune close` against the game's freshly fetched `origin/master` (`10e738af`). All five slice commits matched and the record has 0 rows and `section: null`, so there is no section to append. The record is now stored at `$MEM/prune/close/M-netcode-presence.json`.
- **$MEM**: deleted the eight uncited records `monster-realm-np-{a,c1,c2,d}-{plan,tester-brief}.md`. They were untracked, and no live file cites them. No live file cites the spec either: not the branch tree, an `mr-*` tool, a `$MEM` markdown file, or the game's `origin/master` (gate X4).

## decisions
Four of the milestone's six lasting decisions already stand title-keyed in the game's `docs/DECISIONS.md` at `10e738af`: the continued walk, the `Face` press rule, the dropped queue and `np-b`'s ruling. So does every `decision-defaulted` row of the spec except the reconnect climb (gate X5):
- **"Remote interpolation: adaptive delay; hold, except a bounded continued walk"** has the continued-walk rule: one snapshot per position, the same-direction two-step predicate and its window, the walk's cadence, the half-tile walkable bound, and the per-remote slew.
- **"Turning in place: `Face` turns, or steps when already facing"** has the `MoveInput::Face` rule: the transport and its rejected alternatives, and the one-movement-slot turn.
- **"Held keys: commit threshold and warp continuity"** has the press rule (a press sends `Face`, continuation sends `Step`) and `np-b`'s ruling that one step stays in flight, citing `docs/send-pipeline-depth.md`.
- **"Battle lifecycle and PvP"** has the rule that queued moves are dropped at battle start, and rules out a client-sent `clear_queue`.

Two are missing: the reconnect backoff climb, and the no-cancel-on-keyup half of the press rule (the nh2 ruling). Neither entry above rules out cancelling a step on keyup. Both are drafted below for the supervisor's game doc-only PR. I have not edited the game repo.

### New entry: Reconnect backoff climbs one rung per failed attempt

```markdown
## Reconnect backoff climbs one rung per failed attempt

**Decision.** The client owns its reconnect policy: a pure state machine in
`client/src/prediction/reconnectPolicy.ts`, driven by `client/src/net/connection.ts`. After `n`
failed attempts in a row, the next attempt waits `min(1000 ms · 2^n, 30 s)`. The ladder has no
give-up rung. Only the session terminals stop retrying (an expired account session, an
unreachable auth service) until the player retries or continues anonymously. Every build path
starts an attempt (the reconnect timer, the first boot, `reconnectNow`, `continueAnonymously`),
and every attempt that fails climbs exactly one rung, whether it ends in a connect error, a drop
after the socket opened, or both in either order. A failed attempt is marked, so a second event
for the same failure changes nothing. Only an applied subscription resets the ladder. A drop from
a connected link does not climb, so its first retry waits the base delay. The "connection lost"
notice shows on the connected-to-disconnected edge only.

**Why.** The SDK does not reconnect on the raw builder path, so the app owns its retries. A
restarting host often accepts the socket and drops it before the subscription applies. If only
a connect error climbed, that client would retry every second for as long as the restart lasts.
The SDK can report one drop as both an error and a close, so the ladder counts failed attempts,
not failure events.

**Rules out.** Resetting the ladder when the socket opens, or on anything but an applied
subscription; climbing once per failure event; a build path that does not start an attempt; a
give-up rung on the ladder.
```

### Amendment: Held keys: commit threshold and warp continuity

The entry is rewritten in place. Three changes:
- In **Decision**, after the sentence ending "a step for one already facing the direction.", insert:

  ```markdown
  A release sends nothing: it only drops the direction from the held set.
  ```
- In **Why**, append:

  ```markdown
  A step sent and then cancelled on keyup would take back steps the predictor has already drawn,
  pulling the own avatar backward.
  ```
- The **Rules out.** paragraph becomes:

  ```markdown
  **Rules out.** Repeat-driven movement or menus; continuation steps while earlier ones
  are in flight; a step cancelled on keyup (`clear_queue` or `set_move` on release);
  resuming a held walk after a frame closes; `Step` on a fresh press (a tap would move
  instead of turning); `Face` from the continuation.
  ```

touches-delta: none
boyscout-delta: none
plan-delta: fold and harvest ran through `mr-gates`'s `cmd_notes` with the corpus pointed at this worktree, because the CLI hardcodes the main checkout's `specs/`, which a run must not edit. Earlier closes (#237) used the same route.
comment-scan: CLEAN
Items: none

## Acceptance
Acceptance: 6/6 met, 0 deferred, 0 unmet — close-M-netcode-presence seed:e3b0c44298fc1c14

Gate: `memory/projects/mr-selfcheck` → SELFCHECK-OK. No `mr-*` tool was touched or added, so no `--selftest` is owed. `just ci` rc=0, which is not the gate. Each PLAN probe also fails when pointed at `origin/main`, so the checks have teeth.

## Risks
- `M-postgate-client-coverage.spec.md:4` still says "PLAN §9 item 1" in its dated 2026-10-01 status line, and cites the deleted `M-postgate-console-controls.spec.md`. That reference was stale before this change and does not cite this milestone's numbering, so I left it alone. It is outside `touches:`, and `mr-touches` refuses spec files.
- The Held keys entry is already about 35 lines, over the 10–25 bar, and the amendment adds about three more. Trimming it is the supervisor's call when the game PR is cut.
- The two decision drafts reach the game repo only when the supervisor ships them. Until then, the reconnect climb and the no-cancel-on-keyup rule live only in code comments and in `np-d`'s notes.

not-verified: the drafted entries' 10–25-line length and wording were not checked by the game's doc gates. Those gates run on the supervisor's game PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
