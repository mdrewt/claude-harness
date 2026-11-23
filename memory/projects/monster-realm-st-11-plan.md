# st-11 plan — client shell: the message sinks get an owner

Spec: `specs/monster-realm-v2/structure.spec.md` §st-11 (type: refactor · tier: hard).
Plan file: `docs/refactors/client-shell.md` (rules 1, 4, 5, 7; "Ports"; "Pumps"; "Owners";
"Registration order" item 3; extraction 4).
Worktree: `projects/monster-realm/.claude/worktrees/st-11`, branch `slice/st-11`, base `16e2cb3c`.
Baseline at base: `tsc --noEmit` clean; `biome check .` exit 0; full client vitest = 247 files,
6309 tests, all passed; `src/main.` + `src/shell/` = 36 files, 837 tests.

## Measured facts

- `client/src/main.ts` (5619 lines at base) declares every name the spec lists, in five places:
  `lastPaintErrorMessage` + `reportPaintError` (661-676); the sinks block from `statusEl` to
  `announceNow` (2272-2405); the rings, `toastDismissedSeq`, `dismissErrorToast`, `handlingError`,
  `pushError` (2433-2481, with `lastFrameErrorMessage` in the middle, which stays);
  `MOVE_REJECT_PREFIX` (2785); `liveRegion` + `lastA11ySnapshot` (3111-3114).
- **`queueNotice` (2318) is not in the spec's list and must move.** It assigns `statusNotice`
  (`showToast` calls it), and rule 1 lets only the owner assign. It has one caller outside the
  moved code: `tacticsShellDeps().announce` (3781), which also READS `statusNotice.queued`. So
  `statusNotice` gains one outside reader the plan's Owners row does not list (the code that
  reads it goes to `battleFrame.ts` in extraction 8). A read through a live import is what rule
  1 prescribes; that body does not change.
- Outside writers, exactly as the plan's Owners table says: `main()` assigns `statusEl` (4953)
  and `toastChrome` (4955); `onReconnect` assigns `statusNotice` (5122); the frame loop assigns
  `lastA11ySnapshot`, `announcedSinceFrame` and `statusNotice` (5427-5460).
- Upward references of the moved code: `hintOnMenu` calls `menuPlace()`; `paintWorldHint` calls
  `renderMenu()`; the frame-loop part reads `topOverlay()`, the local `countdownSaid`, the local
  `now`, and `closeLeftFocusAdrift`, `focusAdrift()`, `worldCanvasEl`. Nothing else.
- The moved code resolves ONE catalog string: `t('a11y.world.region')` (a11yCopy's `t`), inside
  the frame-loop part. It calls neither `i18nT` nor `tf`. `protocolMismatchLine` and `endedLine`
  sit inside the sinks block's line range, resolve i18n keys, are not in the spec's list and stay.
  After the move `main.ts` has no call of a11yCopy's `t` and drops that import.
- No non-test file under `client/src` other than `main.ts` imports both `t` functions
  (`render/world.ts`, `ui/announcements.ts`, `ui/overlayA11y.ts` import a11yCopy's only).
- `new LiveRegion()`, `new EventRing(clock)`, `new ErrorRing(clock)` touch no DOM, storage or
  clock at construction.
- **Probe (measured, then reversed; kept as a patch outside the tree):** the move as planned
  below with no test edit gives `tsc --noEmit` exit 0, `biome check .` exit 0, and the full
  client vitest 246 of 247 files / 6308 of 6309 tests passed. The one failure is the pin the
  spec names: `catalogParity.test.ts` PARITY-02 at its `main.ts a11y-bound literal keys`
  assertion. Its resolver-roster assertion and its `main.ts i18n-bound literal keys` assertion
  both passed unedited (they run first), so the roster does NOT gain `shell/feedback.ts`.
- No eval, script, workflow or e2e helper names a moved symbol. `client/test-util/mainBootHarness.ts`
  needs no edit (`feedback.ts` imports no wasm export). Every `vi.mock` in the `main.*` suites is
  keyed on a `ui/` module path, which `feedback.ts` imports under the same module id
  (`main.dispatch.test.ts` mocks `./ui/toast`).
- Text readers of `main.ts` (`main.dispatch.test.ts`, `net/connection.test.ts`,
  `ui/screens/mainMenuScreen.test.ts`, the two presence rosters) read nothing that moves.
- Comments outside `touches:` that name `main.ts` beside something that moves:
  `client/src/ui/feedbackPolicy.ts:161` ("a sink in main.ts"), `client/src/ui/liveRegion.ts:5-6,14`
  (the rings' construction and the flush "in main.ts"), `client/src/ui/announcements.ts:28-29`
  ("main.ts's frame pump on that edge"), `client/src/tactics/tacticsBattle.ts:143` ("main.ts: the
  status-notice queue"), `client/vite.config.ts:161` ("main.ts's … MOVE_REJECT_PREFIX toast
  filter"). A refactor slice never widens; these are a follow-up note, not edits.

## What is built

### `client/src/shell/feedback.ts` (new) — the contract

Imports `../ui/a11yCopy` (`t`), `../ui/announcements`, `../ui/boxView` (type), `../ui/errorOverlayModel`,
`../ui/errorRing`, `../ui/eventRing`, `../ui/feedbackPolicy`, `../ui/liveRegion`,
`../ui/overlayRegistry` (type), `../ui/statusModel`, `../ui/toast`, and `./views`
(`errorOverlayView`). No other shell module, no wasm export, no i18n resolver.

```ts
// moved, bodies unchanged except the two port calls
export function reportPaintError(err: unknown): void;
export function route(kind: SinkKind, text: string, hintHost?: (text: string) => void): void;
export function reportError(kind: SinkKind, text: string, line?: OutcomeLine): void;
export function showToast(text: string): void;
export function queueNotice(text: string, nowMs: number): void;
export function paintToast(text: string): number;
export function tickToast(nowMs: number): void;
export function setWorldHint(kind: MessageKind, text: string): void;
export function topHint(): string | null;
export function hintOnMenu(): string | null;       // menuPlace() === 'top'  ->  host.menuOnTop()
export function paintWorldHint(): void;            // renderMenu()           ->  host.repaintMenu()
export function resetFeedbackSinks(): void;
export function announceNow(text: string): void;
export function dismissErrorToast(): void;
export function pushError(source: ErrorSource, raw: unknown): void;
export const eventRing: EventRing;                 // new EventRing(() => Date.now())
export const errorRing: ErrorRing;                 // new ErrorRing(() => Date.now())
export const liveRegion: LiveRegion;               // new LiveRegion()
export const MOVE_REJECT_PREFIX = 'movement-reject ';
// every binding is `export let` (rule 1); only this module assigns one
export let statusEl: HTMLElement | undefined;
export let toastChrome: ToastChrome | undefined;
export let toastState: ToastState;                 // NO_TOAST
export let worldHints: ReadonlyArray<{ readonly kind: MessageKind; readonly text: string }>;
export let saidHint: string | null;
export let menuHint: string | null;
export let statusNotice: StatusNoticeState;        // STATUS_NOTICE_INITIAL; read by main.ts
export let announcedSinceFrame: boolean;
export let lastA11ySnapshot: A11ySnapshot;         // { topOverlay: null, message: '' }
export let toastDismissedSeq: number;              // -1
export let handlingError: boolean;
export let lastPaintErrorMessage: string | null;

// owner functions
export interface HintHost {
  readonly menuOnTop: () => boolean;    // whether the main menu is the top frame
  readonly repaintMenu: () => void;     // repaint the main menu
}
export function installHintHost(host: HintHost): void;   // a host read before the install throws
export interface FeedbackMounts { statusEl: HTMLElement; toastChrome: ToastChrome }
export function mountFeedback(mounts: Partial<FeedbackMounts>): void;  // an omitted one keeps its value
export interface AnnouncementFrame {
  readonly now: number;                          // the frame's one clock read
  readonly topOverlay: () => OverlayId | null;   // called once, first
  readonly countdownSaid: string | null;         // the line pumpStillThere returned
  readonly returnFocus: () => void;              // called on a world edge, after its announcement
}
export function pumpAnnouncements(frame: AnnouncementFrame): void;
export function resetStatusNotice(): void;
```

- `pumpAnnouncements` is the frame loop's lines 5432-5460 verbatim, with the focus statement
  replaced by `returnFocus()`. `now` is the frame's one clock read, a local of the frame, so it
  arrives in the parameter object.
- Module scope is inert (rule 5): three constructions and the initial values. No listener, no
  document write, no catalog string (the one `t(...)` call is inside the pump).
- Each moved declaration keeps the comment that describes it; a comment that says "main.ts"
  about the sinks is re-worded for the owner.

### `client/src/main.ts`

- The moved declarations leave. One import from `./shell/feedback` brings what `main.ts` still
  names: `announceNow`, `dismissErrorToast`, `errorRing`, `eventRing`, `hintOnMenu`,
  `installHintHost`, `MOVE_REJECT_PREFIX`, `mountFeedback`, `paintToast`, `paintWorldHint`,
  `pumpAnnouncements`, `pushError`, `queueNotice`, `reportError`, `reportPaintError`,
  `resetFeedbackSinks`, `resetStatusNotice`, `route`, `statusNotice`, `tickToast`.
- Port: `installHintHost({ menuOnTop: () => menuPlace() === 'top', repaintMenu: renderMenu })`
  at module scope, in the boot prelude ahead of `const store` (so ahead of the first listener).
- Mount: in `main()`, `statusEl = status;` becomes `mountFeedback({ statusEl: status });` and
  `toastChrome = createToast(document, gameScreen);` becomes `mountFeedback({ toastChrome:
  createToast(document, gameScreen) });`, each in place, so the order of every statement holds.
- Reset: `statusNotice = STATUS_NOTICE_INITIAL;` in `onReconnect` becomes `resetStatusNotice();`.
- Pump: the frame loop's announcement edge and notice step become one call in the same position:
  `pumpAnnouncements({ now, topOverlay, countdownSaid, returnFocus: () => { if
  (closeLeftFocusAdrift && focusAdrift()) worldCanvasEl?.focus(); } })`.
- The `window` `error` and `unhandledrejection` registrations stay where they are (rule 4,
  "Registration order" item 3); `lastFrameErrorMessage` stays.
- Imports only the moved code used are dropped (`t` from a11yCopy, `announcementsFor`,
  `buildErrorOverlayModel`, `ErrorRing`, `EventRing`, `LiveRegion`, `COALESCE_WINDOW_MS`,
  `channelOf`, `outranks`, the statusModel and toast names the sinks used).

### Docs (all inside `touches:`)

- `docs/refactors/client-shell.md`: extraction line 4 is deleted; the four `feedback.ts` rows
  leave "Owner functions the extractions add" (they exist now); the Owners row for
  `statusNotice` gains its reader; the "Ports" and "Pumps" rows for `feedback.ts` read as built;
  the "Tests and docs" rows about `a11y.world.region` and the DECISIONS entry follow the code.
- `docs/DECISIONS.md` "Four message channels, chosen by one policy table": rewritten in place to
  name `client/src/shell/feedback.ts` and the functions that exist (`showNotice` is gone).
- `ARCHITECTURE.md` §Client: one passage for `shell/feedback.ts` beside the other shell modules.

## Tests (tester; the implementer never edits them)

1. New `client/src/shell/feedback.test.ts` (sibling test of a declared code file). The red run
   is the seam: a real boot of `../main` on the real shell, then `./feedback` read from the same
   registry. At the base it fails at import. Each test must fail against a `main.ts` that keeps
   a private copy of the state (an owner module that exists but is not the one the shell drives).
2. `client/src/ui/i18n/catalogParity.test.ts` PARITY-02 (the pin the spec names): `a11y.world.region`
   is pinned on `shell/feedback.ts`; `main.ts` keeps its i18n key list unedited; the union of the
   keys the two files resolve is what `main.ts` resolved alone.
3. Comments in `client/src/ui/statusModel.test.ts`, `client/src/net/oidc.test.ts` and
   `client/src/ui/i18n/catalogParity.test.ts` that are false after the move are re-pointed.
   No assertion in those two files changes.
4. No `client/src/main.*.test.ts` file and no `client/test-util` file is edited.

## Gates

- ST11.1 CHECK: `npm --prefix client run typecheck && client/node_modules/.bin/biome check . && git diff --exit-code $(git merge-base HEAD origin/master) -- 'client/src/main.*.test.ts' client/test-util && npm --prefix client run test -- src/main. src/shell/`
- ST11.2 CHECK: `npm --prefix client run test`
- EXPECT (both): every file and every test passed, none skipped; exact counts pinned once the
  seam file exists.
- Full `just ci` once, after the lens batch. `just e2e-shards` once locally (the slice moves
  boot mounts and a frame-loop part; the plan asks for the end-to-end run on boot wiring).

## Plan deltas (each goes under `plan-delta:` in the PR)

1. `queueNotice` moves with the sinks and `statusNotice` gains a reader in `main.ts`.
2. The resolver roster does not gain `shell/feedback.ts`: the module resolves only the a11y key.
3. No live file imports both `t` functions after the move, so the two-binding proof cannot move
   to one. The same-file proof is the fixture the test already holds (PARITY-02 fixtures, case
   (j)); the live tree pins each binding in its own file. No new roster is added.
4. The pump's parameter object also carries `now`, the frame's clock reading, which the plan's
   "Pumps" row does not list.
5. The orchestrator wrote the plan from measurement and a probe; no `planner` subagent ran.

## Risks the lenses should attack

- A body that still reads or writes a private copy in `main.ts` (a missed site).
- The pump: any statement reordered, dropped, or run on a second clock read; `returnFocus`
  called anywhere but the world edge; `topOverlay` called more than once.
- The port: a path that reaches `hintOnMenu` or `paintWorldHint` before the install.
- Import-time order: `feedback.ts` and what it imports now evaluate while `main.ts`'s imports
  do, ahead of the locale block.
- The registration order of the `error` pair relative to the batch listeners.
- An import left unused, or one dropped that is still used.
- The built bundle (`scripts/verify-build-hooks.mjs` reads it).

## Review adjustments (reviewer + red-team, plan phase; no blocker)

- Every binding is `export let` (rule 1 and the recorded decision say so); none is module-private.
- `now` is a member of the pump's parameter object ("Pumps": a local of `main()` arrives in it).
- `mountFeedback` takes a partial and is called once per element, in place of each assignment, so
  no statement order changes even if `createToast` threw.
- The port's private binding is `hintPort`, initialised to a host whose members throw; `route`'s
  `hintHost` parameter (the open frame's own strip) no longer shadows it.
- Comments moved to the owner speak for the owner (no "a main.ts sink", no slice history); the
  movement-rejection comment in `main.ts` names where `MOVE_REJECT_PREFIX` lives.
- `docs/DECISIONS.md`: the senders (`sendGuarded` through `SEND_REJECT_KIND`, the battle refusal,
  care) stay named as `main.ts`'s; only the sinks are re-pointed. The plan's bullet about that
  entry then names the `session.ts` extraction alone.
- The out-of-`touches:` comments are filed as a follow-up residual (`mr-gates notes add --followup`).
- catalogParity: no new "imports both" roster (a rule the spec does not ask for). The pin is
  the a11y key on `shell/feedback.ts`, no a11y call left in `main.ts`, main's i18n list unedited,
  and the union across the two files equal to what `main.ts` resolved alone.
- Tester brief: `./feedback` is imported dynamically AFTER the boot, from the same registry, and
  every binding is read through the namespace at each assertion; the pump is also driven
  directly (a counting `topOverlay`, a throwing `returnFocus`); an import-inertness test.
- A retitled PARITY-02 gets a `moved-tests:` row.
