# 11r-b — PvP side-B battle overlay — Plan & Tasks

> Slice plan (planner output, reviewed by `reviewer` + `red-team` + `/simplify`).
> Spec: harness `specs/monster-realm-v2/M-postgate-eleventh-review-residuals.spec.md` §2 `11r-b`.
> Closes ADR-0155 D6 (`M-postgate-pvp-side-b-overlay`, disclosed CRITICAL).
> ADR: `docs/adr/0167-pvp-side-b-battle-perspective.md` (supervisor-assigned number).

## 1. The defect

`store.ongoingBattle()` / `store.latestPlayerBattle()` (`client/src/net/store.ts:730-748`)
filter `b.playerIdentity === identity` only. A PvP **accepter** is stored in
`opponent_identity` (`server-module/src/pvp.rs:289-297`), so side B gets **no battle
overlay at all** in production builds — no cards, no skills, no swap — and is frozen
until the 60 s deadline reaper forfeits them. The e2e suite masks this by driving side B
through the DEV-gated role-agnostic `__mrPvp.battleById` hook (`main.ts:1807-1838`):
green CI, broken real path.

## 2. Design

`buildBattleViewModel` (`ui/battleModel.ts:239-271`) and `battleView.#renderOutcome`
(`ui/battleView.ts:430-435`) hardcode **sideA = the local player**. Both files are outside
this slice's `touches:`. So the role normalization lives in `store.ts`:

1. **Role-agnostic accessors** — `ongoingBattle` / `latestPlayerBattle` match
   `playerIdentity === identity || opponentIdentity === identity`, and return the **raw**
   server row (unchanged shape, server truth).
2. **`ownPerspective(battle, identity)`** — a new exported *pure free function* that
   re-expresses a battle so **own side is always sideA**. Returns the argument **by
   reference** when the player is `playerIdentity` (this ordering also covers practice
   battles, where `playerIdentity === opponentIdentity`, ADR-0109) or is in neither role.
   Otherwise swaps `sideA`↔`sideB`, `playerIdentity`↔`opponentIdentity`,
   `partyMonsterIds`↔`opponentMonsterIds`, and permutes `outcome` `SideAWins`↔`SideBWins`.
   `battleId`, `turnNumber`, `weather`, `createdAtMs`, `'Ongoing'`, `'Fled'` and any
   unrecognized outcome string pass through verbatim.
3. **One call site projects** — `refreshBattle` (`main.ts:1262`) binds
   `ownPerspective(store.latestPlayerBattle(identity), identity)`. Projecting at the
   `latest` binding (not at `buildBattleViewModel`) also fixes the PvP opponent-name
   lookup at `main.ts:1309-1313`, which reads `opponentIdentity` off the raw row — on a
   raw side-B row that is side B itself, so B's own name would be painted on the opponent
   card.
4. **Diagnostics stay RAW** — event ring, F9 key-store, `__game`/`__mrPvp` hooks report
   server truth, so two players' bug bundles agree on who won. Recorded in a comment at
   the emit site and in the ADR (otherwise the next reader "fixes" it).

## 3. The 8 call sites — verdict each

| # | Site | Today for side B | After | Verdict |
|---|---|---|---|---|
| 1 | `main.ts:1115` Escape branch | `undefined` → terminal PvP never permanently dismissed | dismisses correctly | correct; perspective-invariant → **raw**, no edit |
| 2 | `main.ts:1262` `refreshBattle` | `undefined` → **no overlay** (the defect) | own cards/skills/bench | **the fix** — wrap in `ownPerspective` |
| 3 | `main.ts:1505` battleStart/battleEnd | side B emits no battle events ever | emits both | correct (ADR-0130 parity); **raw** + comment |
| 4 | `main.ts:1550` rankedMatch | `battleId: ''` on every accepter's delta | correct id | correct; **raw** (id only) |
| 5 | `main.ts:1654` `snapshot()` DEV hook | `ongoingBattle: null` | non-null | correct; **raw** |
| 6 | `main.ts:1855` `projectKeyStore` (F9) | `null` for the frozen player most likely to file a bug | populated | correct; **raw** |
| 7 | `main.ts:1992` `onPvpAttack` | `pvpPendingSubmit` never true for B | correct latch | correct; `turnNumber` invariant → **raw** |
| 8 | `main.ts:2003` `onPvpSwap` | same | same | correct; **raw** |

Only site 2 changes shape. Sites 1, 3–8 change only because the accessor stopped lying.

## 4. EARS acceptance criteria

- **AC-1** WHEN a battle row exists whose `opponentIdentity` equals the local identity and
  whose outcome is `Ongoing`, THE SYSTEM SHALL return that row from `store.ongoingBattle(identity)`.
- **AC-2** WHEN battle rows exist in which the local identity appears in **either** role,
  THE SYSTEM SHALL return the highest-`battleId` such row from `store.latestPlayerBattle(identity)`,
  compared as `bigint`.
- **AC-3** WHEN `identity` is the empty string, THE SYSTEM SHALL return `undefined` from
  both accessors regardless of stored rows.
- **AC-4** WHEN the local identity is `playerIdentity` (including a practice battle where
  both roles are the local identity), THE SYSTEM SHALL return the battle **unchanged** from
  `ownPerspective(battle, identity)`.
- **AC-5** WHEN the local identity is `opponentIdentity` and is **not** `playerIdentity`,
  THE SYSTEM SHALL return a battle in which `sideA`/`sideB`,
  `playerIdentity`/`opponentIdentity` and `partyMonsterIds`/`opponentMonsterIds` are
  exchanged, `outcome` `SideAWins`↔`SideBWins` is exchanged, and `battleId`, `turnNumber`,
  `weather`, `createdAtMs`, `'Ongoing'`, `'Fled'` and any unrecognized outcome string are
  preserved verbatim.
- **AC-6** WHEN the local identity appears in neither role, THE SYSTEM SHALL return the
  battle unchanged (never a fabricated perspective).
- **AC-7** WHEN the local player is the accepter of a PvP battle, THE SYSTEM SHALL render
  the battle overlay showing that player's **own** active monster as the "You" card, that
  monster's skills as `Submit: <name>` buttons, and that player's own bench as the swap options.
- **AC-8** WHEN the local player is the accepter and the battle resolves in the challenger's
  favour (`SideAWins`), THE SYSTEM SHALL display `Defeat...`, and `Victory!` when it
  resolves `SideBWins`.
- **AC-9** WHEN the accepter clicks a `Submit: <skill>` button in the real overlay, THE
  SYSTEM SHALL submit `submit_pvp_action` with a skill id drawn from the accepter's own
  side, and the server SHALL accept it (evidenced by the turn resolving once the challenger
  also submits).
- **AC-10** WHEN diagnostics are captured (event ring, F9 key-store, `__game`/`__mrPvp`
  hooks), THE SYSTEM SHALL report the **raw server-truth** battle row (unswapped sides,
  unremapped outcome) for both roles.
- **AC-11 (negative/scope)** THE SYSTEM SHALL NOT offer a forfeit control to either role in
  this slice (no client-callable forfeit reducer exists); THE SYSTEM SHALL NOT offer Flee or
  Recruit to the accepter (`canFlee`/`canRecruit` remain false in PvP).

## 5. Tasks (dependency order)

### Phase A — RED tests (tester; a different agent than the implementer)

**A1 `client/src/net/store.test.ts`** — parameterize the `battle()` factory (`:569-583`)
with `opponentIdentity` (hardcoded `'npc'` today). Add:
- `T-RA-1` **bites**: `playerIdentity:'alice'`, `opponentIdentity:'bob'`, Ongoing →
  `ongoingBattle('bob')` is that row. Kills a revert to `playerIdentity === identity`.
- `T-RA-2` **bites**: same row → `latestPlayerBattle('bob')!.battleId === 10n`.
- `T-RA-3` **bites**: max across mixed roles — `(5n, player 'bob')` + `(9n, opponent 'bob')`
  → `9n`. Kills an impl that stops at the first `playerIdentity` hit.
- `T-RA-4` **bites**: `ongoingBattle('')` / `latestPlayerBattle('')` → `undefined` even with
  a row whose `opponentIdentity` is `''`. Kills the missing empty-identity guard.
- `T-RA-5` **bites**: a stranger gets `undefined` from both. Kills "return any battle".
- **Update (not delete)** `T1c` (`:878-889`) and the `latestPlayerBattle` header block
  (`:840-851`) — both assert "filters strictly by playerIdentity", which becomes false.
  This is an implementation task, **not** boy-scout.
- `T-OWNP-1..6`: preserved fields; side-A **reference** identity (`.toBe(b)`); practice
  battle `playerIdentity === opponentIdentity` → `.toBe(b)` (the role-check-ordering tooth);
  full side-B swap incl. `partyMonsterIds`↔`opponentMonsterIds`; non-participant → `.toBe(b)`;
  `undefined` in → `undefined` out.
- `T-OWNP-OUTCOME` (fast-check): over `fc.constantFrom('Ongoing','SideAWins','SideBWins','Fled')`
  ∪ `fc.string()` — the remap is an involution; `'Ongoing'`/`'Fled'`/unknown are fixed points.
  Kills a remap that touches `Fled` or coerces unknown tags (which would defeat
  `parseOutcomeTag`'s regen-drift detector at `battleModel.ts:203-213`).
  **No** full arbitrary `StoreBattle` generator — 13 fields with nested teams, poor ROI.

**A2 `client/src/main.wiring.test.ts`** (source-scan teeth; `:583-636` is the
non-`main.ts`-scan precedent):
- `W-PVPB-PROJECT` **bites**: in the `refreshBattle` region, `store.latestPlayerBattle(identity)`
  is wrapped by `ownPerspective(`. Kills **the half-fix** — role-agnostic accessors with no
  projection, which shows side B the *opponent's* cards and skills (strictly worse than a
  blank screen, and invisible to every behavioural test: `refreshBattle` has no covering tests).
- `W-PVPB-RAWDIAG` **bites**: the F9 region (`f9Region()`, `:308`) and the `battleById` hook
  body contain **no** `ownPerspective(`. Kills perspective leakage into diagnostics (AC-10).
- `W-PVPB-E2E-NOHOOK` **bites**: `client/e2e/pvp-side-b.spec.ts` exists, contains **neither**
  `__mrPvp` **nor** `battleById`, and **does** contain `pvp-accept-btn` and `Submit: `. This
  is the tooth that stops the e2e sliding back onto the DEV hook — exactly the failure that
  hid this CRITICAL for a whole milestone.

### Phase B — implementation (specialist; never edits the gating tests)

- **B1** `store.ts:730-748` — both accessors: early-return on `identity === ''`; match either
  role; keep the `bigint >` comparison and its `T1d` comment verbatim; update docstrings.
- **B2** `store.ts` — new exported pure `ownPerspective(battle, identity)` adjacent to the
  accessors, with the contract above **and** the warning: *view-perspective only; never feed
  the result to logs, the event ring, the F9 bundle, or a DEV hook (ADR-0167)*. A free
  function, not a method — keeps the store's accessors honestly "raw server truth" and keeps
  the projection directly unit-testable.
- **B3** `main.ts:1262` — one line + one import.
- **B4** `main.ts:1522-1524` — one comment: the emitted `outcome` is the **server-side** tag
  (SideA = challenger), deliberately not perspective-mapped, so two players' bundles agree.

### Phase C — e2e (`client/e2e/pvp-side-b.spec.ts`, new, ≤260 lines)

`test.describe.serial`, one test, two `chromium.launch()` contexts (tolerant teardown per
`ranked-forfeit.spec.ts:225-248`). **Zero `__mrPvp`.** `__game()` only for readiness + identity.
Setup is a copy of the proven production-DOM challenge→accept sequence at
`ranked-forfeit.spec.ts:289-326`.

1. `gameReady(pageA)`, `gameReady(pageB)`; capture identities; assert distinct.
2. `pageB.keyboard.press('Escape')` + settle — **required**: auto-show needs `!anyOverlayVisible`.
3. `pageA` KeyP → poll `[data-testid="pvp-challenge-player-btn"]` for
   `data-player-identity !== identityA` → click. (Every client joins as `name: 'Player'`
   (`main.ts:2271`), so identity-attribute selection is mandatory, not stylistic.)
4. `pageB.waitForSelector('[data-testid="pvp-accept-btn"]')` → click.
5. **RED today**: `expect(pageB.getByRole('button', { name: /^Submit: / }).first()).toBeVisible()`
   — side B renders no overlay today, so zero elements match (`battleView.ts:252`).
6. **RED today**: `expect(pageB.getByText(/^You: /)).toBeVisible()` (`battleView.ts:172,209`).
7. `pageB` clicks its first `Submit:` → `pvp-status` reads `/Waiting for opponent/`.
8. `pageA` clicks its own first `Submit:`.
9. **RED today**: `expect(pageA.getByTestId('pvp-status')).toBeHidden()` — proves the server
   *accepted* B's action. A skill id taken from the wrong side returns `Err`
   (`pvp.rs:1018-1022`), the turn never resolves, and A's banner never clears.
10. Witness: `pageB` shows `Submit:` buttons again **or** a visible outcome.

Deliberately **not** in the e2e (covered by unit tests instead): swap-button behaviour (both
players hold a single starter → empty bench → would need party seeding; covered by `T-OWNP-4`);
the Victory/Defeat remap (needs a battle played to completion; covered by `T-OWNP-OUTCOME` +
AC-8); an opponent-**name** assertion (impossible while every client is named `'Player'`;
covered by `T-OWNP-4`'s identity swap).

### Phase D — docs

- **D1** `docs/adr/0167-pvp-side-b-battle-perspective.md` (ADR-0104 canonical header),
  `Amends: ADR-0042`, closes ADR-0155 D6. Decisions: role-agnostic accessors return raw rows ·
  projection at the view boundary only · diagnostics stay raw · forfeit explicitly deferred
  with the reducer-list evidence · `battleById` retained.
- **D2** `just adr-digest` → `docs/adr/DIGEST.md` (mechanical generated companion of D1,
  drift-gated in CI per `AGENTS.md:34-36`). **Not** `docs/adr/README.md` — supervisor-owned.
- **D3** `ARCHITECTURE.md` — one line naming `ownPerspective` as the single view-perspective seam.

## 6. Anti-patterns (named, to avoid)

1. **The half-fix** — role-agnostic accessors without the projection. Guarded by `W-PVPB-PROJECT`.
2. **Perspective leakage into telemetry** — projecting inside the event ring, F9 bundle, or
   `battleById`. Guarded by `W-PVPB-RAWDIAG`.
3. **Projecting inside the accessors** — turns the store from a mirror of server truth into an
   opinionated view layer and poisons all 6 diagnostic/observability sites at once.
4. **Scope creep into `battleModel.ts`** — a `selfSide: 'A'|'B'` parameter is arguably purer,
   but is out of `touches:`, changes a signature with many callers, and buys nothing here.
   Recorded as the ADR-0167 considered alternative; not built.
5. **Building forfeit** — needs a new reducer in `server-module/src/pvp.rs` *and* a button in
   `battleView.ts`, both out of scope. See §8.
6. **Deleting the `battleById` DEV hook** — breaks `pvp-full.spec.ts` for zero product value.
   The hook legitimately reads *both* sides, which the production path never will. The
   anti-slide guard is a test, not a deletion.
7. **A `pvp-full.spec.ts` clone** — 780 lines of `spacetime sql` profile parsing for an
   overlay assertion.
8. **`Number()`/`Math.max` on `battleId`** — `T1d` (`store.test.ts:891-905`) guards this;
   do not lose the `bigint >` comparison while editing the loop.
9. **Weakening the e2e to `.toBeAttached()`** — `battleView`'s root toggles
   `display:none/flex` (`:146,151`); real chromium does layout, so `toBeVisible()` is
   meaningful here (unlike the happy-dom unit shells, ADR-0151 D5).

## 7. Pressure-test answers

- **Practice battle** (`playerIdentity === opponentIdentity`, ADR-0109): the `||` matches once
  (same row). `ownPerspective` **must** test `playerIdentity === identity` first and return by
  reference, or the player fights their own mirror from the wrong seat. Load-bearing ordering;
  it gets its own tooth (`T-OWNP-3`).
- **Wild / `WILD_IDENTITY`**: wild rows carry the all-zero identity; a real identity is a
  64-hex hash and is never all-zero. `isPvpBattle(projected)` stays correct — the projection
  preserves the `opponentMonsterIds.length > 0 && identities differ` conjunction (both sides'
  arrays are non-empty in PvP). `canRecruit`/`isWild` stay **false** for side B.
- **`identity === ''` (pre-join)**: explicit early return in both accessors. Role-agnostic
  matching turns "no match" into "possible false match"; this is the 1-line way to make it
  impossible.
- **Can it return a battle the player is not in?** No — `battle` is subscribed unfiltered
  (`connection.ts:554-559`), but matching is exact equality against the two *participant*
  columns.
- **Ordering** (max `battleId` over a larger match set): a side-B player cannot open a
  higher-id wild battle mid-PvP — `guards.rs:248-269` `is_in_ongoing_battle_either_role`
  covers the `opponent_identity` role and `battle.rs:490-496` rejects it. After the PvP battle
  resolves, a newer wild battle legitimately wins — identical to today's side-A semantics.

## 8. Scope decisions

**Forfeit is NOT in this slice.** ADR-0155 D6 says "no forfeit control **anywhere**" — a
both-sides gap, not a side-B parity gap. No client-callable forfeit reducer exists (full
reducer list checked); `flee` is rejected server-side in PvP and is not even rendered
(`canFlee: ongoing && !isPvp`). Forfeit today happens only via `forfeit_on_disconnect` and the
60 s reaper. After this slice **side B has exactly what side A has**, which is the parity
defect closed. Follow-up `M-pvp-forfeit-control` needs `server-module/src/pvp.rs` (new reducer
+ turn-deadline interaction), `client/src/ui/battleView.ts` (button + confirm) and
`client/src/main.ts` — two of three files outside this boundary — plus a ranked-rating design
question (does a manual forfeit apply the same ELO as a disconnect forfeit?) that deserves its
own ADR.

## 9. Risks

- **R1** `main.ts`-SERIAL with uxd3 — satisfied (uxd3-a/b/c all merged). Footprint is 1 line
  + 1 import, so the rebase surface is minimal.
- **R2** e2e flake vs the 60 s `PVP_TURN_DEADLINE_MS`: everything between accept and the last
  submit must finish inside the deadline or the reaper forfeits mid-test and step 9 passes for
  the **wrong reason**. Keep per-step waits ≤15 s and hard-fail if steps 4→9 exceed ~45 s.
- **R3** Side B's new overlay changes side-B input behaviour (ADR-0155 D6's "KeyB works
  mid-PvP for side B" becomes false). Audited: `ranked-forfeit` closes B right after accept;
  `pvp-full` drives B via hooks; `recruit`/`dialogue` are single-context. LOW — re-grep before merge.
- **R4** `__game().ongoingBattle` flips non-null on side B. All existing `=== null` polls run
  on pageA (`pvp-full.spec.ts:672`, `ranked-forfeit.spec.ts:353`). LOW — re-verify by grep.
- **R5** `just e2e`'s `global-setup` republishes with `--delete-data`, wiping local playtest state.
- **R6** The projection allocates one object per batch while a side-B PvP battle is open.
  Negligible — `shouldSkipBattleRefresh` compares field-wise, not by reference.

## 10. Boy-scout candidates (cap ~40 lines / ≤3 hunks) — stale-comment truth repairs

1. `main.ts:1800-1806` — the `battleById` docblock claims `store.ongoingBattle()` "filters
   `playerIdentity === identity`". False after B1. (~3 lines)
2. `client/e2e/ranked-forfeit.spec.ts:328-331` — "B's client has NO battle view … **Do NOT**
   assert B has ongoingBattle" is now actively misleading guidance. (~4 lines)
3. `client/e2e/pvp-full.spec.ts:516-519` — "without `battleById`, B cannot read the battle
   state at all" — no longer true of the production path. (~4 lines)

**Excluded** (gating tests are never boy-scout targets): `store.test.ts:840-851, 878-889` are
implementation task A1. Also excluded (outside the boundary, recorded in the ADR instead):
`battleView.test.ts:2201-2204`, `docs/adr/0151-*.md:116`, `docs/specs/ux1-plan.md:93` carry
the same stale claim.

---

# 11. Plan-review revisions (reviewer + red-team + /simplify, all three closed)

These SUPERSEDE the corresponding items above.

## R-1 (red-team HIGH, reviewer Major) — the three source-scan teeth are defeatable; replace with an ENUMERATED CEILING

Measured precedent in this repo: `main.wiring.test.ts:4240-4279` (`DIALOGUE_VIEW_SITES` +
`DIALOGUE_VIEW_CEILING`) — a whole-file substring ban was beaten CI-green by
`const h = dialogueView; h?.hide();`. Concrete defeats found for the plan's needles:
- `W-PVPB-PROJECT`: `const _proj = ownPerspective(store.latestPlayerBattle(identity), identity);`
  followed by `const latest = store.latestPlayerBattle(identity);` — needle satisfied, RAW value
  rendered, side B shown the **opponent's** cards. Also `import { ownPerspective as op }` beats a
  bare-name needle.
- `W-PVPB-RAWDIAG`: a hand-inlined `{ ...raw, sideA: raw.sideB, sideB: raw.sideA, ... }` in
  `projectKeyStore` reproduces the AC-10 violation without the identifier appearing.
- `W-PVPB-E2E-NOHOOK`: `window['__mr'+'Pvp']['battleById'](id)` — neither literal appears.

**Replacement (implement these, not the §5 A2 forms):**

- **`W-PVPB-PROJECT` → enumerated ceiling on `ownPerspective`, comment-stripped.** In `main.ts`
  (via `stripLineComments` + `countOccurrences`, the file's own helpers):
  - `import { ... ownPerspective ... }` — the UNALIASED named-import form occurs exactly 1×
    (kills `as op`).
  - `ownPerspective(` occurs **exactly 2×** whole-file (1 import mention + 1 call) — a **ceiling**,
    so the `_proj` double-call defeat pushes it to 3 and fails, AND a leak into the F9 /
    `snapshot()` / `battleById` / observability regions also fails. One ceiling closes
    `W-PVPB-PROJECT`'s aliasing defeat and most of `W-PVPB-RAWDIAG` at once.
  - `store.latestPlayerBattle(identity)` occurs exactly 1× inside the `refreshBattle` region
    (kills "compute projected, then re-read raw").
  - the single `refreshBattle` occurrence is the syntactically wrapped form
    `ownPerspective(store.latestPlayerBattle(identity), identity)`.
- **`W-PVPB-RAWDIAG` → subsumed by the ceiling above** for the named-function leak. The
  hand-inlined-swap residual is NOT mechanically closable at proportionate cost (it is a
  code-review concern); **record it as an accepted residual in ADR-0167** rather than building a
  fragile shape-matcher. `f9Region()` (`main.wiring.test.ts:306-325`) does NOT reach
  `mrPvpHook.battleById` (`main.ts:1807-1829`, outside the `F9-BUNDLE` sentinels) — the plan's
  original target was unimplementable as written.
- **`W-PVPB-E2E-NOHOOK` → behavioral, not lexical.** Keep the cheap source scan as a supplement,
  but the LOAD-BEARING guard moves into `pvp-side-b.spec.ts` itself: a `page.addInitScript`
  installed on **pageB before app script runs** that intercepts the `window.__mrPvp` assignment
  and wraps every method in a call counter; assert the counter is **0** at test end. Immune to
  string-concat / dynamic-property / rename obfuscation because it observes the CALL, not the
  source text.
- **Strip comments before every needle match** (`stripLineComments`, `main.wiring.test.ts:4196`) —
  otherwise a `// ownPerspective(...)` comment vacuously satisfies a check.
- The e2e's DOM assertions (steps 5, 7, 9) are the real behavioral teeth for the wiring;
  the source scans are a cheap early-warning supplement, not the primary gate.

## R-2 (red-team MEDIUM) — e2e step 9 can pass for the WRONG reason; make R2's timing mitigation an assertion

`pvp-status` hides both when the turn resolves AND when `outcome !== 'Ongoing'`
(`main.ts:1301-1306`), and the 60 s `pvp_deadline_reaper` (`pvp.rs:1124-1178`) produces a terminal
outcome without advancing the turn. So a silently-rejected side-B action stalls, the reaper fires,
and step 9 still passes.

**Fix (both required):**
- Add a disambiguating witness: poll `pageB.__game().ongoingBattle` and require
  `turnNumber === turnNumber0 + 1` **while `outcome === 'Ongoing'`** — turn-advance-without-terminal
  is unambiguous proof of a legitimate resolve. (This also directly witnesses AC-1 in the real app:
  `__game().ongoingBattle` is non-null on side B ONLY because the accessor became role-agnostic.
  `__game` is a readiness/witness hook, not a driver — the anti-slide guard targets `__mrPvp`.)
- Encode R2's timing ceiling as a real assertion: measure elapsed ms from the accept click to the
  final assertion and `expect(elapsed).toBeLessThan(45_000)`.

## R-3 (/simplify) — cuts

- **Cut `T-RA-5`** (stranger → `undefined`): subsumed by existing `T1b`/`T1c`
  (`store.test.ts:878-889`). Fold its scenario as an extra assertion on the updated `T1c`.
- **Merge `T-OWNP-1` into `T-OWNP-4`**: same fixture, two halves of one outcome.
- **Cut e2e step 6** (`getByText(/^You: /)`): `'You'` is a hardcoded literal
  (`battleView.ts:169`) co-rendered with the skill buttons by the same `refresh()` call — it
  cannot appear when step 5 does not. Step 5 is strictly stronger (it anchors the elements
  steps 7-9 use).
- **Take the optional `#isParticipant(b, identity)` private predicate** in `store.ts`: the two
  accessors otherwise duplicate the either-role condition and can drift (one gets a fix, one
  doesn't).
- Everything else in §5/§10 is KEPT: `T-RA-1..4`, `T-OWNP-2/3/5/6`, `T-OWNP-OUTCOME`
  (fast-check is already pervasive here — zero marginal dependency cost, and it sweeps the
  unknown-tag pass-through), the `identity === ''` guard, all 3 boy-scout comment repairs
  (they fix comments THIS diff falsifies — leaving them is a doc regression introduced by this
  change), the `ARCHITECTURE.md` line, and the B4 telemetry comment.

## R-4 (reviewer, minor) — out-of-boundary stale claims: RECORD, do not edit

`connection.ts:558` ("gates display to own-identity rows via `store.ongoingBattle(identity)`")
joins `battleView.test.ts:2201-2204`, `docs/adr/0151-*.md:116` and `docs/specs/ux1-plan.md:93` in
ADR-0167's "same stale claim, outside this boundary" list. Do NOT edit them — follow-up flags.

## R-5 (reviewer, Major) — surface the forfeit deferral explicitly

The spec bullet literally says "wire the overlay **+ forfeit** for side B", and the deferral is
structurally forced (both files forfeit needs are outside `touches:`). Both reviewers judged the
deferral honest and correct — building forfeit for B alone would be NEW asymmetric game-design
surface, which this milestone's own §4 scoping note forbids. Call it out in the PR body under
its own heading, not only in the ADR.

## R-6 — clean axes (verified, do not re-tread)

Red-team found **no** security or state-machine break: identity normalization is identical on both
sides (`connection.ts:509` and `rowConvert.ts:284-285` both `.toHexString()`), `WILD_IDENTITY` is
all-zero and can never equal a 64-hex identity, `accept_challenge` derives `opponent_identity`
solely from `ctx.sender` (`pvp.rs:812-877`), `submit_pvp_action` resolves the caller's side from
`ctx.sender` independently of any client-side labeling (`pvp.rs:977-1074`), `ownPerspective` swaps
whole side OBJECTS so team indices stay valid, and `resetPredictionState()` (`main.ts:637-663`)
already clears the whole battle lifecycle on reconnect. All 8 call-site verdicts in §3 and the
ordering claim in §7 were independently confirmed TRUE.

**One hardening note (red-team LOW):** `ownPerspective` returns store-owned objects by reference
(fast path) and shallow-swaps nested side objects (slow path), so the raw/projected split relies on
nothing ever mutating a projected view in place. Add an explicit never-mutate line to its docstring.
