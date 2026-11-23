# st-13 plan — client shell: what a screen adapter reads gets an owner

Spec: `specs/monster-realm-v2/structure.spec.md` §st-13 (type: refactor · tier: hard).
Plan file: `docs/refactors/client-shell.md` (rules 1, 3, 4, 5, 7; "Owners" §Per-feature view
state; "Owner functions the extractions add"; extraction 6).
Worktree: `projects/monster-realm/.claude/worktrees/st-13`, branch `slice/st-13`, base `88a3c8cb`.
Baseline at base: `tsc --noEmit` exit 0; `biome check .` exit 0 (35 warnings, 143 infos); full
client vitest = 252 files, 6471 tests, all passed; `src/main.` + `src/shell/` = 40 files, 919 tests.

## Measured facts

- `client/src/main.ts` (5393 lines at base) declares the seven names in three places:
  `motionPreference` (472); `boundShopId`, `boundHealLocationId`, `boundSocialTab`,
  `boundMonstersTab`, `boundTradeSessionId` (585-594); `screenCtx` (1804-1834).
- Outside writers, all in `main.ts`: `openPendingShop` binds the shop (3701); `runInteract`'s heal
  arm binds the location (1427); `openSocial` binds the tab (1315); `openMenuTarget`'s Monsters arm
  binds the tab (1660); `openTradeEditor` binds the session (1330); `resetTradeSessionState` clears
  the session (607; called by `onReady` at 4870 and by `onReconnect` at 4956); the trade-session
  batch listener clears a session that closed (3866); `onReconnect` clears the other four
  (4951-4955). No other assignment of any of them exists.
- Readers left in `main.ts` after the move: `boundShopId` and `boundHealLocationId` (the shop and
  heal refresh listeners), `boundTradeSessionId` (the closed-session listener), `motionPreference`
  (the tactics shell deps and two frame-loop reads), `screenCtx` (five `screenHost` calls).
  `boundSocialTab` and `boundMonstersTab` are read only by `screenCtx`.
- `boundProposeTarget` and `openPropose` do not exist in `main.ts` (ts-3 replaced them).
- **Probe (measured, then reversed; kept outside the tree,
  `/tmp/st13-probe.RjnZoY/{move-main.patch,screenContext.ts}`):** the move as planned below, with
  no test edit, gives `tsc --noEmit` exit 0, `biome check .` exit 0 (same 35 warnings, 143 infos)
  and the full client vitest 252 of 252 files / 6471 of 6471 tests passed. No pin reads what moves.
- No test mocks `./render/motionPreference`; the suites that drive the preference stub
  `window.matchMedia` before they import `./main`, so the stub is in place when the owner
  constructs the preference at import.
- `screenContext.ts` imports no wasm export, so `client/test-util/mainBootHarness.ts` needs no edit.
- No eval, script, workflow or config names a moved symbol. `client/e2e/reduced-motion.spec.ts`
  names `motionPreferenceFromWindow()` in comments only.
- `ARCHITECTURE.md` names no owner of the seven names; its §Client paragraph describes each shell
  module in turn and ends at `shell/session.ts`.
- `client/src/render/motionPreference.ts` names `main.ts` twice in its header (lines 13 and 18).
  The same header says a source scan in `motionPreference.test.ts` pins the one `matchMedia`
  caller; that test file reads no source today.

## What is built

### `client/src/shell/screenContext.ts` (new) — the contract

Imports `../render/motionPreference`, `../ui/monstersModel` (type), `../ui/screens/types` (types),
`./inputState` (`bindings`) and `./session` (`identity`, `store`). No other shell module.

```ts
export const motionPreference: MotionPreference;   // motionPreferenceFromWindow(), at import
export let boundShopId: number | null;             // null
export let boundHealLocationId: number | null;     // null
export let boundSocialTab: SocialTab | null;       // null
export let boundMonstersTab: MonstersTab | null;   // null
export let boundTradeSessionId: bigint | null;     // null
export const screenCtx: ScreenContext;             // body unchanged: getters over the live bindings

// owner functions
export function bindShop(shopId: number): void;               // boundShopId = shopId
export function bindHealLocation(locationId: number): void;   // boundHealLocationId = locationId
export function bindSocialTab(tab: SocialTab | null): void;   // boundSocialTab = tab
export function bindMonstersTab(tab: MonstersTab): void;      // boundMonstersTab = tab
export function bindTradeSession(sessionId: bigint): void;    // boundTradeSessionId = sessionId
export function unbindTradeSession(): void;                   // boundTradeSessionId = null
export function unbindForReconnect(): void;   // the four clears of onReconnect: shop, heal, social, monsters
```

- Module scope is inert but for the one sanctioned listener (rule 5): it constructs the motion
  preference (one `matchMedia` query, one `change` listener on that query object) and the
  `screenCtx` object. Nothing on `store`, `window` or `document`, no document write, no catalog
  string.
- `screenCtx.identity` and `screenCtx.bindings` read `./session`'s and `./inputState`'s bindings
  through live imports (rule 1); `store` is a `const` and is held by reference.
- `unbindForReconnect` clears four bindings, not five: the fifth clear of `onReconnect` sits inside
  `resetTradeSessionState`, which `onReady` also calls, so it becomes its own owner function
  (`unbindTradeSession`), which the closed-session listener calls too. One outside write, one owner
  call, in the same position.

### `client/src/main.ts`

- The three declaration blocks leave. One import from `./shell/screenContext` brings what
  `main.ts` still names: the five `bind*` functions, `unbindForReconnect`, `unbindTradeSession`,
  `boundHealLocationId`, `boundShopId`, `boundTradeSessionId`, `motionPreference`, `screenCtx`.
- Each outside write becomes the owner call in place: `openPendingShop` → `bindShop(shopId)`;
  `runInteract` → `bindHealLocation(action.locationId)`; `openSocial` → `bindSocialTab(tab)`;
  `openMenuTarget` → `bindMonstersTab(tab === 'storage' ? 'storage' : 'party')`;
  `openTradeEditor` → `bindTradeSession(sessionId)`; `resetTradeSessionState` and the
  closed-session listener → `unbindTradeSession()`; `onReconnect`'s four clears →
  `unbindForReconnect()`, still ahead of `resetTradeSessionState()` and `screenHost.forget()`.
- Imports only the moved code used are dropped (`motionPreferenceFromWindow`, the `MonstersTab`
  and `ScreenContext` types).
- No registration moves: `main.ts` registered nothing for these names. The media-query listener
  is created while `main.ts`'s imports evaluate, which is ahead of every statement of `main.ts`
  and so ahead of its first `store.onBatchApplied`.

### Docs (all inside `touches:`)

- `docs/refactors/client-shell.md`: extraction line 6 is deleted; the `boundProposeTarget` Owners
  row becomes `boundTradeSessionId` with its real writers (`openTradeEditor`: event;
  `resetTradeSessionState`: reset; the batch listener that drops a closed session: event) and its
  reader (`screens`, the module "Registration order" item 9 gives that listener to); the
  `screenContext.ts` row leaves "Owner functions the extractions add" (the functions exist).
- `ARCHITECTURE.md` §Client: one passage for `shell/screenContext.ts` after `shell/session.ts`.
- `client/src/render/motionPreference.ts`: the header comments that name `main.ts` as the caller
  name `shell/screenContext.ts`.

## Tests (tester; the implementer never edits them)

1. New `client/src/shell/screenContext.test.ts` (sibling test of a declared code file). The red
   run is the seam: a real boot of `../main` on the real shell, then `./screenContext` read from
   the same registry. At the base it fails at import. Each test must fail against a `main.ts`
   that keeps a private copy of the state (an owner module that exists but is not the one the
   shell drives). A second block drives the owner on a fresh registry.
2. No `main.*` suite is edited at all, comments included (the spec orders no re-point there).
3. `client/test-util/mainBootHarness.ts` is not edited.

## Gates

- ST13.1 CHECK: `npm --prefix client run typecheck && client/node_modules/.bin/biome check . &&
  git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts'
  client/test-util && npm --prefix client run test -- src/main. src/shell/`. The diff step is
  byte for byte: no `main.*` suite and no boot stub changes at all in this slice.
- ST13.2 CHECK: `npm --prefix client run test`.
- EXPECT (both): every file and every test passed, exact counts pinned once the seam file exists
  (41 files and 253 files; 919 and 6471 tests plus the seam file's).
- Full `just ci` once, after the lens batch. The slice moves no `main()` boot wiring and no DEV
  hook, so the plan's end-to-end rule does not bind; `client/e2e/reduced-motion.spec.ts` is run
  locally if a private SpacetimeDB starts, because it is the one spec that drives the moved
  preference in a real browser. The remote e2e job runs the whole suite.

## Plan deltas (each goes under `plan-delta:` in the PR)

1. `unbindForReconnect` clears four bindings and `unbindTradeSession` the fifth (the plan proposed one
   function for five clears, written when all five sat in `onReconnect`).
2. The plan's proposed `bindProposeTarget` is `bindTradeSession`.
3. The orchestrator wrote the plan from measurement and a probe; no `planner` subagent ran.

## Risks the lenses should attack

- A body that still reads or writes a private copy in `main.ts` (a missed site).
- A reordered statement: each bind must stay ahead of the open it precedes (`bindSocialTab`
  before `openSeated`, `bindTradeSession` after `held.clear()` and before `openSeated`,
  `bindMonstersTab` before `openSeated`, `bindShop` after the `blocksPlayerOpen` return and before
  `openFrame`, `bindHealLocation` before `openFrame`); `unbindForReconnect` must stay ahead of
  `resetTradeSessionState` and `screenHost.forget` in `onReconnect`.
- Import-time order: the preference is now constructed while `main.ts`'s imports evaluate, ahead
  of the locale block, the text-step apply and the hint-host install; `render/motionPreference`
  evaluates later than before (it has no import-time effect).
- A getter of `screenCtx` turned into a snapshot.
- An import left unused, or one dropped that is still used.
- The built bundle (`scripts/verify-build-hooks.mjs` reads it).

## Review adjustments (reviewer + red-team, plan phase; no blocker, no behaviour difference)

- **Gate (reviewer, major):** st-12's diff step ignored whole-line comment changes with
  `-I'^\s*/?\*'`, which also skips a hunk that only adds `/*` and `*/` around assertions. This
  slice orders no comment re-point in a `main.*` suite, so ST13.1's diff step compares those
  suites and the boot stubs byte for byte. The hole in st-12's step is filed as a spec note.
- **Name (reviewer):** `unbindScreens` reads as "all five". It is `unbindForReconnect`, and its
  comment says the trade session is not touched there.
- **`render/motionPreference.ts` header (reviewer):** a rewrite, not a file-name swap. The reason
  for two functions is stated as it holds now; "main.ts has no teardown path" names the shell; the
  claim that a source scan pins the one `matchMedia` caller is replaced by what holds it today
  (the two boot tests that count the queries).
- **Plan-file drift beyond line 6 (reviewer):** `pendingTradeOpen`, `knownSessionIds` and other
  module-level `let`s have no Owners row; extraction 12 names `openPropose`; the trade-session
  functions belong to no extraction; "What `main.ts` keeps" counts three bindings. Which module
  owns them is a design choice no slice has recorded, so it is filed as a spec note and not
  decided here. The module map's row 6 says "the id each open bound" where two are tabs: reworded.
- **Red-team:** 40 mutants on the probe in a private worktree; no observable difference between
  the base and the move. 12 survive the full client suite and are the seam file's brief: `main.ts`
  keeping private copies (the key one); a reconnect that leaves the Social tab or the Monsters tab
  bound; the closed-session listener not unbinding; the reconnect unbind also clearing the trade
  session, and the trade unbind also clearing the other four; `screenCtx.bindings` snapshotted;
  the preference built lazily on first read; the owner registering on `store` or `window` at
  import; `bindTradeSession(0n)` read as none. Two more survive at the base as well and are not
  the seam's (`bindShop` or `bindHealLocation` after its `openFrame`: the open renders from the
  explicit id).
- A comment the move adds carries no finding id (`A11Y-28` is dropped from `screenCtx`'s comment).
