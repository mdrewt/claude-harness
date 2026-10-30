# ctl-13 plan — live hint bar, request banners (no auto-open), error toast, world Y/B on notices

Branch `ctl-13`, worktree `projects/monster-realm/.claude/worktrees/ctl-13` (from origin/master 17ac40f5).

## Sizing
Ship CTL13.1, CTL13.2, CTL13.3 (incl. the toast), CTL13.4. DEFER CTL13.5 (evolution prompt):
a prompt frame needs a new `OverlayId`, which forces `ui/a11yCopy.ts` + count-pinned a11y tests
(a11yCopy / announcements / overlayA11y) outside `touches:` — a hidden dependency (memory:
new-view-ts-file-is-hidden-dependency-stop). Residuals routed to ctl-13 are NOT folded (none is
within this increment's design); they stay recorded.

## Functional core (pure)

### `ui/noticeModel.ts` (new)
```ts
export type RequestKind = 'trade' | 'challenge';
export interface RequestNotice { kind:'request'; key:string /* `trade-<id>` | `challenge-<id>` */;
  request: RequestKind; id: bigint; fromName: string; createdAtMs: bigint }
export interface ErrorNotice { kind:'error'; key:'error' }
export type Notice = RequestNotice | ErrorNotice;
export interface NoticeInput { offers: readonly StoreTradeOffer[]; challenges: readonly StoreBattleChallenge[];
  players: readonly StorePlayer[]; identity: string; errorPending: boolean; dismissed: ReadonlySet<string> }
export function pendingRequests(i: NoticeInput): readonly RequestNotice[]
export function buildNotices(i: NoticeInput): readonly Notice[]
export type RequestAction = 'accept' | 'decline' | 'view';
export const requestSheetLayout: NavLayout;            // list: accept, decline, view (all enabled)
export interface RequestSheet { notice: RequestNotice; nav: NavState }
export function openRequestSheet(n: RequestNotice): RequestSheet   // cursor on 'accept'
export function requestSheetStep(s: RequestSheet, btn: NavInput, live: readonly RequestNotice[]):
  { state: RequestSheet | null; run?: RequestAction }
export function requestCommand(n: RequestNotice, a: 'accept' | 'decline'): Command
```
- `pendingRequests`: the waiting trade = `shownTradeOffer(offers, identity)` when
  `counterparty === identity && status === 'Pending'` (socialModel's `waiting` rule); the incoming
  challenge = `incomingChallenge(challenges, identity)`. Oldest first by `createdAtMs` (tie: trade
  first). NOT filtered by `dismissed`. `fromName` = the proposer/challenger's player name, `#<hex8>`
  when empty or unknown.
- `buildNotices`: TOP FIRST — `{kind:'error'}` when `errorPending`, then the oldest pending request
  whose key is not in `dismissed`. At most one of each (so ≤ 2).
- `requestSheetStep`: B or Start (not repeat) → `{state:null}`; a held B/Start → unchanged; D-pad
  moves via nav.ts `list` rule; A activates the row under the cursor: when `s.notice.key` is still
  among `live` → `{state:null, run}`; else `{state:null}` (nothing run). Any other button → same state.
- `requestCommand`: trade accept → `{kind:'respondTrade', tradeId:id, accepted:true}`; trade decline →
  `accepted:false`; challenge accept → `{kind:'acceptChallenge', challengeId:id}`; decline →
  `{kind:'declineChallenge', challengeId:id}`.

### `ui/screens/worldScreen.ts` — `worldButton` gains notices (back-compatible 4th arg)
```ts
export interface WorldNotices { notices: readonly Notice[]; pending: readonly RequestNotice[];
  request: RequestSheet | null }
worldButton(sheet, cands, btn, n?: WorldNotices): { sheet; request: RequestSheet | null;
  result: 'consumed'|'unhandled'; run?: InteractAction; command?: Command;
  dismiss?: string /* notice key */; view?: RequestNotice }
```
Order: (1) an open request sheet owns every button (`requestSheetStep(request, btn, pending)`;
accept/decline → `command: requestCommand(...)`; view → `view: notice`); (2) an open interact sheet →
unchanged ctl-10a rule; (3) held button → unhandled; (4) A → unchanged; (5) Y → the primary
candidate's sheet when it opens (unchanged), ELSE the first `request` in `notices` opens
`openRequestSheet` (consumed), else unhandled; (6) B → when `notices` is non-empty:
`dismiss: notices[0].key`, consumed; else unhandled. Without `n` the behaviour is exactly today's.
"Target" everywhere = `pickerEntries(cands).length > 0`.

### `ui/hintBarModel.ts` (new)
```ts
export interface HintChip { button: VButton; keycap: string; verb: string; badge: boolean }
export interface HintWorld { target: string | null /* A's verb, localised by the shell */;
  sheetOpen: boolean; requestWaiting: boolean }
export function hintBar(stack: Stack, bindings: Bindings, notices: readonly Notice[], world: HintWorld): readonly HintChip[]
```
- keycap = `glyph(bindings.buttons[button][0])`; an unbound button's chip has keycap `''`. A remap
  changes the keycap on the next call (no caching).
- Chips in this order, by top of stack:
  - world base, no sheet: A(target) when `target !== null`; Y(chrome.chip.view) and
    B(chrome.chip.dismiss) when `notices.length > 0 && target === null`; Start(chrome.chip.menu,
    badge = requestWaiting); Select(chrome.chip.help).
  - world base, sheet open: A(chrome.chip.ok), B(chrome.chip.back), Start(menu, badge), Select(help).
  - battle base: A(ok), Start(menu, badge), Select(help).
  - screen/prompt frame on top: A(ok), B(back), Start(chrome.chip.close), Select(help).
  - textEntry on top: A(ok), Start(chrome.chip.done).
- `badge` is false on every chip but Start.

### `ui/menuModel.ts`
`export function withRequestBadge(labels: Readonly<Record<string,string>>, waiting: boolean): Readonly<Record<string,string>>`
— when waiting and `labels.social` exists, that label gains the suffix `t('menu.badge.request')`
(e.g. " •"); else the SAME object. Pure.

## Imperative shell
- `ui/hintBar.ts` (new): `class HintBarView { constructor(root: HTMLElement /* #hint-bar */); render(chips, banner: string | null) }`.
  Keyed reconcile on `data-button`: the existing `#chip-start` / `#chip-select` buttons are reused
  (keep ids, `data-menu-launcher` / `data-help-launcher`); other chips are `<span class="mr-chip"
  data-button=X>`. Each chip: `.mr-chip-key` (keycap) + `.mr-chip-verb` (verb) via textContent;
  `data-badge` present iff badge. Chip order in the DOM = model order; chips not in the model are
  removed. Banner: one `#notice-banner` child (created once), textContent = banner, `hidden` when
  null; no role=dialog / aria-modal / tabindex; never focuses anything. Render is a no-op when
  (chips, banner) are unchanged (memoised signature).
- `ui/errorOverlayView.ts` → the toast: `#mr-error-overlay` gains class `mr-toast`; main renders it
  with `buildErrorOverlayModel(records, 1)` (newest error only). Footer copy
  (`errorOverlay.footer`) names B and F8. F8 still dismisses.
- `ui/screens/index.ts` `ScreenHost`: holds `#request: RequestSheet | null` (cleared wherever
  `#sheet` is); `get request()`; `takesNav` true at the world when either sheet is open. `WorldPort`
  gains `notices(): readonly Notice[]`, `pending(): readonly RequestNotice[]`, `dismiss(key)`,
  `view(n)`. World case: calls `worldButton(sheet, cands, btn, {notices, pending, request})`; runs
  `run` / `dismiss` / `view` on the port; returns `step.command` when set (the shell's normal
  ScreenResult path dispatches it). `baseButton`'s B comment updated.
- `main.ts`:
  - `dismissedRequests: Set<string>` cleared on forget/reconnect; `currentNotices()` /
    `currentPending()` over the store; WorldPort `dismiss('error')` → `errorOverlayView.dismiss()`,
    else `dismissedRequests.add(key)`; `view(n)` → `openSocial(n.request === 'trade' ? 'trades' : 'challenges')`.
  - DELETE the pvp auto-show (`openSocial('challenges')` in the PvP batch listener); keep the
    visible-panel refresh.
  - Per frame (next to the interact chip): `hintBar(contextStack, bindings, notices, {target, sheetOpen, requestWaiting})`
    → `hintBarView.render(chips, banner)`; banner = top request notice's text
    (`notice.request.trade` / `notice.request.challenge`, `{name}`) or null. Replaces the boot-time
    static chip text writes.
  - Menu render: `labels: withRequestBadge(vm.labels, requestWaiting)`; re-render the visible menu on
    a batch when `requestWaiting` flips.
  - The world sheet render (interact prompt) also paints an open request sheet (rows Accept /
    Decline / View, cursor) at a fixed position (no candidate anchor) — reuse `interactSheetEl`
    path with the request rows.
- i18n (en + fr + messageIds): `chrome.chip.{ok,back,close,view,dismiss,done}`, `menu.badge.request`,
  `notice.request.trade`, `notice.request.challenge`, `notice.sheet.{accept,decline,view}`;
  `errorOverlay.footer` copy.

## e2e
- NEW `e2e/respond-request.spec.ts` (CTL13.4): B proposes a trade to A (hook); A sees
  `#notice-banner`, no overlay opens and focus does not move; A presses Y then A (Enter) → the offer
  goes to `ConfirmedByCounterparty` (read via hook). Same for a challenge: Y, Enter → battle starts.
- `pvp.spec.ts`, `pvp-side-b.spec.ts` ≈315, `ranked-forfeit.spec.ts` ≈344, `monster-privacy.spec.ts`
  ≈464: B no longer waits for the auto-shown `pvp-accept-btn`; it accepts via Y then Enter, or via
  `__mrPvp` where the test is not about the UI (named intentional changes).

## Gating tests (tester) — tags `CTL13-<n>-<NAME>:` in test titles
- CTL13.1: `src/ui/hintBarModel.test.ts`, `src/ui/hintBar.test.ts`, `src/main.hintBar.test.ts` (boot:
  the bar shows live keycaps; a remap shows on the next render; Y/B appear with a notice).
- CTL13.2: `src/ui/noticeModel.test.ts` (notices), `src/ui/menuModel.test.ts` (badge),
  `src/main.notices.test.ts` (incoming challenge: no frame opens, focus unchanged, banner + badges).
- CTL13.3: `src/ui/screens/worldScreen.test.ts`, `src/ui/noticeModel.test.ts` (sheet),
  `src/main.notices.test.ts` (Y then Enter dispatches; B dismisses the toast / banner),
  `src/ui/errorOverlayView.test.ts` (toast).
- CTL13.4: `e2e/respond-request.spec.ts`.

## Anti-patterns
No aria-live on the banner (ui/liveRegion.ts is the sole announcement owner); no focus moves on
arrival; no per-frame DOM writes without a changed signature; no new OverlayId; reject (close with
nothing run) a sheet whose request vanished — never act on a stale id.

## REV 2 — plan-review fixes (reviewer + red-team), SUPERSEDES the sections above where they conflict
1. **Chip markup.** `styles.css` already paints the button name via `.mr-chip::before{content:attr(data-button)}`.
   Each chip's children: `.mr-chip-key` (keycap text), `.mr-chip-verb` (verb text), and, iff badge,
   `.mr-chip-badge` (text `t('chrome.badge.request')`, en "New" / fr "Nouveau"). `main.chips.test.ts`'s
   textContent pins move to `.mr-chip-verb` (touches-delta, named intentional change). Non-Start/Select
   chips are `<span class="mr-chip" data-button=X style="pointer-events:none">` (no click until ctl-15).
2. **Menu badge** is real text: `withRequestBadge(labels, waiting)` → `labels.social` becomes
   `${label} (${t('chrome.badge.request')})`; the SAME object when not waiting or no `social` key.
3. **Y reads `pending`** (not dismiss-filtered): `worldButton` Y with no target opens
   `openRequestSheet(pending[0])`. B dismisses `notices[0]` (spec: at the world base, regardless of target).
   `WorldNotices = { notices, pending, request }` unchanged otherwise.
4. **hintBar(stack, bindings, notices, world?)** — 4th arg optional, default
   `{target:null, sheetOpen:false, requestWaiting:false}`. World, no sheet: Y(view) iff
   `requestWaiting && target === null`; B(dismiss) iff `notices.length > 0 && target === null`.
5. **ScreenHost**: `#request`; `get request()`; `get sheetOpen()` (either sheet); `settleRequest(pending)`
   closes `#request` when its key is not among `pending` (called per frame by main next to `worldBaseLive()`);
   `WorldPort.notices?: { notices(): readonly Notice[]; pending(): readonly RequestNotice[]; dismiss(key: string): void; view(n: RequestNotice): void }`
   — OPTIONAL member so existing literals type-check. On accept/decline the host also calls `dismiss(key)`
   so a second Y cannot re-send before the server row changes.
6. **main.ts seams**: `movementGate()` uses `!screenHost.sheetOpen`; the held/repeat edge in the router's
   `screen` callback compares `sheetOpen`. `view(n)` goes through `overlayVerdict` like `runInteract`'s trade.
   Request-sheet render branches BEFORE the anchor logic: interact chip suppressed; fixed inline
   position (bottom-centre: `left:50%; top:70%`); a heading line `tf('notice.request.trade'|'…challenge', {name})`
   then rows Accept / Decline / View with the cursor; rows + cursor + key in the memo signature.
7. **Banner** (`#notice-banner`) only while the stack is the bare world base; copy is key-free
   ("{name} wants to trade" / "{name} challenges you to a battle"). A NEW request key (first seen) is
   announced once via `liveRegion.announce` with the same text; never re-announced on later batches.
8. **Notices derivation**: own filter — waiting trade = oldest offer with `counterparty === identity &&
   status === 'Pending'` (NOT `shownTradeOffer`, whose oldest-involving pick can hide an incoming offer behind
   an outgoing one); incoming challenge = `incomingChallenge`. Oldest first by createdAtMs, tie → smaller
   key string order ('challenge-…' < 'trade-…'), deterministic under input permutation. `fromName`: player
   name, `#<hex8>` when empty/unknown. `dismissedRequests` cleared on reconnect (intended; pinned).
9. **Toast**: no CSS in scope — the toast is behavioural (newest error only, `displayCap` 1; B at the world
   or F8 hides it; a later distinct error shows it again). `errorPending` = `errorOverlayView.visible`.

## touches-delta (sibling tests of declared files, rewritten as named intentional changes)
`client/src/main.chips.test.ts`, `client/src/main.dispatch.test.ts` (CTL8S-3-BOOT-AUTO-SHOW and the
auto-show half of CTL8S-2-BOOT-SOCIAL-TAB invert: no auto-open), `client/src/ui/screens/worldScreen.test.ts`,
`client/src/ui/screens/index.test.ts`, `client/src/ui/i18n/catalog.test.ts`, `client/src/ui/i18n/catalogParity.test.ts`
(roster count pins), new `client/src/main.hintBar.test.ts`, `client/src/main.notices.test.ts`.
