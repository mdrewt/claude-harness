# st-12 plan — client shell: the server link gets an owner

Spec: `specs/monster-realm-v2/structure.spec.md` §st-12 (type: refactor · tier: hard).
Plan file: `docs/refactors/client-shell.md` (rules 1, 3, 4, 5, 7; "Owners" §Session and claim;
"Owner functions the extractions add"; "Registration order" item 12; extraction 5).
Worktree: `projects/monster-realm/.claude/worktrees/st-12`, branch `slice/st-12`, base `af4d5bf2`.
Baseline at base: `tsc --noEmit` exit 0; `biome check .` exit 0 (30 warnings, 111 infos); full
client vitest = 250 files, 6364 tests, all passed; `src/main.` + `src/shell/` = 38 files, 866 tests.

## Measured facts

- `client/src/main.ts` (5411 lines at base) declares every name the spec lists, in six places:
  `store` (438); `identity`, `battleEmit`, `lastOwnRating`, `hydratedSinceReconnect`, `conn`
  (468-477); `sessionGateBlocks` (935); `privacyLinkLive` (1083); `sendGuarded`,
  `SEND_REJECT_KIND`, `SendWhere`, `liveReducers` (2317-2368); `resolveReady`, `ready` (2375-2378);
  the two emit-latch listeners (3948-3980). `worldRevealed` sits between `liveReducers` and
  `resolveReady`, is named by no extraction line, and stays.
- Outside writers, exactly as the plan's Owners table says: `main()` assigns `conn` (4879);
  `onReady` assigns `identity` and calls `resolveReady` (4895, 4904); `onHydrated` assigns
  `hydratedSinceReconnect` (4919); `onReconnect` assigns `identity`, `battleEmit`,
  `hydratedSinceReconnect` (4924, 4933, 4934); `resetPredictionState` assigns `battleEmit` and
  `lastOwnRating` (2415-2416). No other assignment of any of them exists in `main.ts`.
- **The spec's sentence "None of the moved bodies resolves a catalog key at `16e2cb3c`" is false.**
  `sendGuarded`'s frozen-link arm calls `tf('chrome.status.disconnected', { where })`, at
  `16e2cb3c` (line 2511 there) and at the base (2324). It is `main.ts`'s only call site of that
  key. The spec's next clause covers it: "a build that finds one adds
  `client/src/ui/i18n/catalogParity.test.ts` under the plan's row for it". No other moved body
  resolves a key.
- **Probe (measured, then reversed; kept as a patch outside the tree,
  `/tmp/st12-probe.VThZTM/{move-main.patch,session.ts}`):** the move as planned below with no
  test edit gives `tsc --noEmit` exit 0, `biome check .` exit 0 (same 30 warnings, 111 infos), and
  the full client vitest 249 of 250 files / 6363 of 6364 tests passed. The one failure is
  `catalogParity.test.ts` PARITY-02 at its first assertion, the resolver-importing roster
  (`shell/session.ts` is received and not expected). Behind it, unreached: `main.ts`'s i18n key
  list still names `chrome.status.disconnected`, and the union is computed over `main.ts` and
  `shell/feedback.ts` only.
- `new AuthoritativeStore(STEP_MS)` stores one number: no DOM, storage, locale or clock read.
  `new Promise` runs its executor synchronously, which assigns `resolveReady`.
- An imported binding narrows on a condition (`if (conn === undefined || conn.linkFrozen())
  return; … conn.live()` type-checks through the import); no statement of `main()` after the
  mount reads `conn` un-optionally, so nothing depended on assignment narrowing.
- `net/connection.ts` is imported by `session.ts` as a type only (`ReturnType<typeof connect>`),
  so every `vi.mock('./net/connection', …)` in the `main.*` suites still replaces the one runtime
  import, `main.ts`'s. `session.ts` imports no wasm export, so
  `client/test-util/mainBootHarness.ts` needs no edit.
- Text readers of `main.ts` (`main.dispatch.test.ts`, `net/connection.test.ts`,
  `ui/screens/mainMenuScreen.test.ts`, the two presence rosters) read nothing that moves; the
  probe confirms it. No eval, script, workflow or e2e helper names a moved symbol
  (`client/e2e/wallet-balance.spec.ts:1007` names `sendGuarded` in a comment, without a home).
- No open PR exists on `mdrewt/monster-realm` (measured with `gh pr list`), so nothing else holds
  `catalogParity.test.ts`.
- Comments outside `touches:` that name a moved symbol: `client/src/ui/sessionView.ts:7`
  (`sessionGateBlocks()`, no home named). Nothing to re-point there.

## What is built

### `client/src/shell/session.ts` (new) — the contract

Imports `../net/connection` (type only), `../net/store`, `../ui/battleEmitModel`, `../ui/boxView`
(type), `../ui/feedbackPolicy` (type), `../ui/i18n/resolver` (`tf`), `../ui/statusModel`,
`./config` (`STEP_MS`) and `./feedback` (`eventRing`, `reportError`). No other shell module.

```ts
export const store: AuthoritativeStore;            // new AuthoritativeStore(STEP_MS), at import
export let identity: string;                       // ''
export let conn: ReturnType<typeof connect> | undefined;
export let hydratedSinceReconnect: boolean;        // false
export let resolveReady: () => void;               // assigned by ready's executor, at import
export const ready: Promise<void>;
export let battleEmit: BattleEmitState;            // BATTLE_EMIT_INITIAL
export let lastOwnRating: number | null;           // null

// moved, bodies unchanged
export function sessionGateBlocks(): boolean;
export function privacyLinkLive(): boolean;
export function liveReducers(): /* the live handle's reducers */ | undefined;
export function sendGuarded(
  where: SendWhere,
  call: () => Promise<void> | undefined,
  onRejected?: () => void,
  line?: OutcomeLine,
): Promise<void>;
export type SendWhere = keyof typeof SEND_REJECT_KIND;   // SEND_REJECT_KIND itself is not exported

// owner functions (the plan's proposed names)
export function adoptIdentity(id: string): void;                         // identity = id
export function adoptConnection(link: ReturnType<typeof connect>): void; // conn = link
export function noteHydrated(): void;       // hydratedSinceReconnect = true
export function clearHydration(): void;     // hydratedSinceReconnect = false
export function markReady(): void;          // resolveReady()
export function armEmitReseed(): void;      // battleEmit = armReseed(battleEmit)
export function resetEmitLatches(): void;   // battleEmit = resetBattleEmit(battleEmit); lastOwnRating = null

// the two batch-listener bodies, named (rule 4); main.ts registers them
export function stepBattleEmit(): void;
export function stepRankedEmit(): void;
```

- Module scope is inert (rule 5): the store construction, the promise and the initial values. No
  listener, no document write, no catalog string (the one `tf(...)` call is inside `sendGuarded`).
- Each moved declaration keeps the comment that describes it, re-worded for the owner where it
  named a `main.ts` neighbour or carried a finding id.

### `client/src/main.ts`

- The moved declarations leave. One import from `./shell/session` brings what `main.ts` still
  names: `adoptConnection`, `adoptIdentity`, `armEmitReseed`, `clearHydration`, `conn`,
  `hydratedSinceReconnect`, `identity`, `liveReducers`, `markReady`, `noteHydrated`,
  `privacyLinkLive`, `ready`, `resetEmitLatches`, `sendGuarded`, `sessionGateBlocks`,
  `stepBattleEmit`, `stepRankedEmit`, `store`.
- Mount: `conn = connect({ … });` becomes `const link = connect({ … });` followed at once by
  `adoptConnection(link);` (rule 3: `main()` builds into a local and mounts it). `connect` still
  returns before the handle is mounted, as before.
- Events: `onReady`'s `identity = id;` becomes `adoptIdentity(id);` and its `resolveReady();`
  becomes `markReady();`; `onHydrated`'s body becomes `noteHydrated();`; `onReconnect`'s
  `identity = id;` becomes `adoptIdentity(id);`, and its `battleEmit = armReseed(battleEmit);
  hydratedSinceReconnect = false;` becomes `armEmitReseed(); clearHydration();`. Each in place,
  so every statement keeps its position. The lpw-9 host notice in `onReady` is untouched.
- Reset: the last two statements of `resetPredictionState` become `resetEmitLatches();`.
- Registration (rule 4, item 12): the two inline listeners become
  `store.onBatchApplied(stepBattleEmit); store.onBatchApplied(stepRankedEmit);` in the same
  position, between the leaderboard listener and the evolution-notice listener.
- Imports only the moved code used are dropped (`AuthoritativeStore`, the six
  `./ui/battleEmitModel` names).

### Docs (all inside `touches:`)

- `docs/refactors/client-shell.md`: extraction line 5 is deleted; the three `session.ts` rows
  leave "Owner functions the extractions add" (they exist now); the Owners rows for the six
  session bindings read as built (`resolveReady` has no outside reader: `main` calls
  `markReady`); the `catalogParity` row and the DECISIONS bullet under "Tests and docs that
  follow the code" follow the code.
- `docs/DECISIONS.md` "Four message channels, chosen by one policy table": `sendGuarded` and its
  `SEND_REJECT_KIND` table are named as `client/src/shell/session.ts`'s; the care, shop and
  rename outcomes and the battle refusal stay `main.ts`'s.
- `ARCHITECTURE.md` §Client: one passage for `shell/session.ts` after `shell/feedback.ts`.

## Tests (tester; the implementer never edits them)

1. New `client/src/shell/session.test.ts` (sibling test of a declared code file). The red run is
   the seam: a real boot of `../main` on the real shell, then `./session` read from the same
   registry. At the base it fails at import. Each test must fail against a `main.ts` that keeps a
   private copy of the state (an owner module that exists but is not the one the shell drives).
2. `client/src/ui/i18n/catalogParity.test.ts` PARITY-02 (the pin the spec names, by its
   conditional clause): the resolver roster gains `shell/session.ts`; `chrome.status.disconnected`
   is pinned on `shell/session.ts` and leaves `main.ts`'s list; the union of the i18n keys the
   files resolve is what `main.ts` resolved alone at the base.
3. Comments in `client/src/main.battle-reseed.test.ts` and
   `client/src/main.privacyCountdown.test.ts` that name `main.ts` as the home of a moved symbol
   are re-pointed. No assertion, import, mock or fixture in a `main.*` suite changes.
4. `client/test-util/mainBootHarness.ts` is not edited.

## Gates

- ST12.1 CHECK: `npm --prefix client run typecheck && client/node_modules/.bin/biome check . &&
  git diff --exit-code -I'^\s*//' -I'^\s*/?\*' $(git merge-base HEAD origin/master) --
  'client/src/main.*.test.ts' client/test-util && npm --prefix client run test -- src/main.
  src/shell/`. The `-I` pair makes the diff step pass only while every changed line of a `main.*`
  suite or a boot stub is a whole-line comment (measured on git 2.43.0 in a sandbox repo: a
  comment-only edit exits 0, an edited or added assertion exits 1), so the comment re-points the
  spec orders pass and an edited assertion, import, mock or fixture does not.
- ST12.2 CHECK: `npm --prefix client run test`.
- EXPECT (both): every file and every test passed, none skipped; exact counts pinned once the
  seam file exists.
- Full `just ci` once, after the lens batch. `just e2e-shards` once locally (the slice moves the
  connection mount and the `connect` callbacks, which is boot wiring; the plan asks for the
  end-to-end run on boot wiring, and `window.__game().ready` is the moved promise).

## Plan deltas (each goes under `plan-delta:` in the PR)

1. `client/src/ui/i18n/catalogParity.test.ts` joins the diff under the spec's conditional
   clause: `sendGuarded` resolves `chrome.status.disconnected`. It goes under `touches-delta:`
   with the probe as its proof. No `mr-touches` call (a refactor slice does not widen; the
   spec's own sentence is the authority).
2. `SEND_REJECT_KIND` is declared in `session.ts` and not exported: nothing outside reads it.
   `SendWhere` is exported because it types `sendGuarded`'s first parameter.
3. `markReady` takes over the `resolveReady()` call (the plan's proposal), so `main.ts` does not
   read `resolveReady`; the Owners row says so as built.
4. The orchestrator wrote the plan from measurement and a probe; no `planner` subagent ran.

## Risks the lenses should attack

- A body that still reads or writes a private copy in `main.ts` (a missed site).
- Any callback statement reordered: `adoptIdentity` must stay first in `onReady` and
  `onReconnect`; `armEmitReseed` then `clearHydration` must stay ahead of `resetPredictionState`
  in `onReconnect`.
- The mount: a path that reads `conn` between `connect(...)` returning and `adoptConnection`.
- The two listeners' position among the batch listeners, and their order (battle, then ranked).
- Import-time order: the store and the promise are now constructed while `main.ts`'s imports
  evaluate, ahead of the locale block; `ui/battleEmitModel` evaluates earlier than before.
- An import left unused, or one dropped that is still used.
- The built bundle (`scripts/verify-build-hooks.mjs` reads it).

## Review adjustments (reviewer + red-team, plan phase; no blocker, no behaviour difference)

- The red-team built a runnable copy with the probe applied, ran the 34 `main.*` suites green
  (808 tests) and wrote 15 mutants. Nine are killed by existing suites. Six survive every
  `main.*` suite and are the seam file's job: the two listeners registered in the other order;
  `resetEmitLatches` keeping `lastOwnRating`; a latch step letting its exception out; a wrong
  `SEND_REJECT_KIND` row; the ranked step without its empty-identity guard; `markReady` not
  resolving `ready`. No existing `main.*` suite reaches the ranked step at all.
- `catalogParity.test.ts` PARITY-02: the expected union is a literal (`main.ts`'s list at the base),
  not a value computed from the files it is compared with; `shell/session.ts` is pinned as
  resolving exactly `chrome.status.disconnected` through the i18n resolver and nothing through
  a11yCopy.
- More comments in the `main.*` suites name `main.ts` for something that moved than the two files
  the spec lists: `main.a11yFocus.test.ts` (the store's construction), and further sites in
  `main.battle-reseed.test.ts` (`identity = id`). The tester sweeps every `main.*` suite; an
  `expect` message string is not a comment and stays as it is.
- The ST12.1 diff step no longer excludes files: it ignores whole-line comment changes instead.
- Comments outside `touches:` that are false after the move (`ui/battleEmitModel.ts:2-3`,
  `ui/sessionModel.ts:16`, `ui/sessionModel.test.ts:751`, `ui/sessionView.ts:6-7`) are filed as a
  follow-up residual; a refactor slice never widens for a comment.
- The Owners rows read as built: `resolveReady` and `battleEmit` have no outside reader in
  `main.ts` (`markReady`, and the owner functions, are what `main.ts` calls).
- `catalogParity.test.ts` stays out of `mr-touches`: the spec's conditional clause is its
  authority, it goes under `touches-delta:`, and a spec note records the false sentence.
