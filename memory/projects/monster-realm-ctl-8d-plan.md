# ctl-8d plan — Social I: tabs, and responding to trades and challenges (rev 2, after plan lenses)

Spec: `specs/monster-realm-v2/M-postgate-console-controls.spec.md#ctl-8d` (+ the "ctl-8d seam map"
in the ctl-8s build note). Base: origin/master bff037e7 (ctl-8s merged). Worktree
`.claude/worktrees/ctl-8d`, branch `ctl-8d`, draft PR mdrewt/monster-realm#556.
Pattern: ctl-8a shop (`shopScreen` / `ShopView.paint`: cursor on legacy rows, kept paint re-applied
after a batch render) and ctl-8b/8c Monsters (`monstersScreen`: sheet + Yes/No confirm, No default).
Plan lenses (constraint survey, reviewer, red-team; 2026-10-03) are folded in; their findings are
marked [L].

## Scope (right-sized: all three gates are built, none deferred)

- **CTL8D.1** tabs Players | Trades | Challenges | Rankings; open on the requested tab, else the
  oldest waiting request's tab with the cursor on it, else the remembered tab, else Players.
- **CTL8D.2** A on a trade / challenge row → a sheet of that row's legal actions; Decline and the
  final trade Confirm ask Yes/No, defaulting to No.
- **CTL8D.3** U / P / L (and the three menu leaves, and the challenge auto-show) open Social on
  Trades / Challenges / Rankings: `ctx.socialTab` wins over the waiting-request rule and memory.
- NOT built (later slices own them): Players list and a Rankings nav list (ctl-8g), request
  banners / badges and the plain open (ctl-13), the hotkeys' retirement (ctl-11a), initiation from
  Social (ctl-10b).

## Seam dry-run (verified on bff037e7)

- `main.ts` is untouched. `openSocial(tab)` binds `ctx.socialTab`, shows `socialPanel(tab)`,
  syncs the stack (push edge → `screenHost.opened`, which moves a `remember` adapter's kept state
  into the per-frame memory) and `screenHost.seat(frame, ctx)` → `init(vm, remembered)` + one paint.
- The lent view is `SocialFrameView { trades, challenges, rankings, chrome, show(panel) }`
  (`screens/types.ts`, frozen). `show` is a no-op for the panel already shown or under a cover.
- Commands exist: `respondTrade {tradeId, accepted}`, `confirmTrade`, `cancelTrade`,
  `acceptChallenge`, `declineChallenge`, `cancelChallenge`. No new arm.
- LB/RB reach an adapter from PageUp/PageDown only (CTL6B.6); Enter = A, Backspace = B,
  Escape = Start, R = Select. U/P/L are not virtual buttons: they stay the legacy ladder's
  (`SOCIAL_HOTKEYS`). With Social open they only close it (the shown panel's key and the opening
  key) or do nothing; they never switch tabs. [L]
- Enter on a Tab-focused native button never reaches the adapter (`keyboardSource.ts:39`). [L]
- MEASURED (throwaway spike, reverted): a `nav + remember + observe + paint` stand-in on
  `SCREEN_ADAPTERS.social` whose paint THROWS at every seat fails only two tests, both in
  `screens/index.test.ts` (`CTL6B-1-ADAPTERS-TOTAL`, `CTL7C-1-NAV-CAPABLE`: sibling tests, named
  intentional changes). All 20 `main.*.test.ts` files stay green, so the stub views of
  `main.dispatch.test.ts` (no `paintSocial`) force no edit outside touches.
- [L] Constraints tests OUTSIDE touches enforce (so the build must hold them):
  - B in the list phase answers `pop`, Start answers `popToBase` in EVERY phase (the e2e
    `closeAll` presses Start), repeats are swallowed.
  - The legacy buttons stay in the DOM and clickable: `#trade-actions button[data-action]`,
    `pvp-accept-btn`, `pvp-decline-btn`, `pvp-cancel-btn`, `pvp-challenge-player-btn`.
  - No focus move at open: focus lands on `#trade-status` / `#pvp-challenge-status`.
  - The roots' direct children stay exactly the shell children plus the chrome (first child):
    every new part is created INSIDE the chrome, lazily, never in a root.
  - `viewModel` is total over an empty store and identity `''`; the adapter never calls
    `refresh`.
  - No new failing hardcoded-string sink, no HTML sink, no new `*View.ts`, no new CSS selector.
- No production open path binds a null tab yet (the menu's Social entry is still a group of three
  bound leaves), so the waiting-request rule's tab choice and the remembered tab are reachable only
  at the adapter / host tier today; the cursor-on-request half is live through the challenge
  auto-show. Residual → ctl-13 (owns `menuModel.ts`, `main.ts` and the badges).

## Functional core / imperative shell

### `ui/tradeModel.ts`, `ui/pvpModel.ts` (pure; additive exports, the view-model shapes unchanged)
- `shownTradeOffer(offers, identity): StoreTradeOffer | undefined` — the offer the trade panel
  shows (a party to it; lowest `tradeId`). `buildTradeViewModel` selects through it. (Not
  `ownTradeOffer`: the store has one with another tie-break. [L])
- `tradeActions(offer, identity): readonly TradeAction[]` — the existing role × status table.
- `incomingChallenge(challenges, identity)` — the OLDEST Pending challenge targeting the viewer
  (lowest `challengeId`; was: the first in store order, the same row in practice [L]);
  `outgoingChallenge(challenges, identity)` — the viewer's highest-id Pending challenge. Both
  return the raw `StoreBattleChallenge | undefined`; `buildPvpChallengeViewModel` selects through
  them. One selection rule per panel, so a Social row is always the block its root shows.

### `ui/socialModel.ts` (new, pure: no DOM, resolver, clock or module state; total, never throws)
```ts
export const SOCIAL_TABS: readonly SocialTab[];  // players, trades, challenges, rankings (derived
                                                 // from a Record<SocialTab, …>, so it is exhaustive)
export type SocialAction = 'accept' | 'decline' | 'confirm' | 'cancel';
export type SocialRowKind = 'trade' | 'incoming' | 'outgoing';
export interface SocialRow {
  readonly key: string;            // `trade-<tradeId>` | `challenge-<challengeId>`
  readonly kind: SocialRowKind;
  readonly id: bigint;             // tradeId or challengeId
  readonly actions: readonly SocialAction[]; // legal now, in sheet order; never empty
  readonly waiting: boolean;       // an incoming request the viewer has not answered
  readonly createdAtMs: bigint;
}
export interface SocialVm {
  readonly requested: SocialTab | null;      // ctx.socialTab
  readonly trades: readonly SocialRow[];     // 0..1 (the offer the trade root shows)
  readonly challenges: readonly SocialRow[]; // incoming first, then outgoing (0..2)
}
export function buildSocialVm(requested, offers, challenges, identity): SocialVm;
export function socialLayout(vm: SocialVm): NavLayout;   // tabs(SOCIAL_TABS), rows on two of them
export function oldestWaiting(vm): { tab: 'trades' | 'challenges'; key: string } | null;
```
- Trade actions (from `tradeActions`, `reject` shown as `decline`): counterparty/Pending
  `[accept, decline]` (waiting); initiator/Pending `[cancel]`; initiator/ConfirmedByCounterparty
  `[confirm, cancel]`; counterparty/ConfirmedByCounterparty `[cancel]`.
- Challenge rows: incoming `[accept, decline]` (waiting); outgoing `[cancel]`.
- "Waiting request" = an incoming request not yet answered (design §4: the notice kind). A trade
  awaiting the viewer's own final Confirm is not one.
- `oldestWaiting`: the waiting row with the smaller `createdAtMs` (bigint `<`, never a
  subtraction [L]); a tie goes to the trade.

### `ui/screens/socialScreen.ts` (new, pure adapter)
`export const socialScreen: ScreenAdapter<SocialVm, SocialScreenState, SocialFrameView>` with
`nav: true`, `remember: true`.
```ts
export type SocialPhase =
  | { readonly kind: 'list' }
  | { readonly kind: 'sheet'; readonly row: string; readonly actions: readonly SocialAction[];
      readonly action: SocialAction;
      /** The Yes/No prompt over the cursor action (Decline, a trade's Confirm), or null. */
      readonly confirm: { readonly yes: boolean } | null };
export interface SocialScreenState { readonly nav: NavState; readonly phase: SocialPhase }
```
- `viewModel(ctx)` = `buildSocialVm(ctx.socialTab, ctx.store.allTradeOffers(),
  ctx.store.allChallenges(), ctx.identity)`.
- `init(vm, remembered)`: tab = `vm.requested ?? oldestWaiting(vm)?.tab ?? remembered tab ??
  'players'`; per-tab cursors come from `remembered.nav` (`navInit`); the cursor goes to the
  waiting row OF THE OPENED TAB when it has one. The phase always starts at `list` (a remembered
  sheet or confirm never carries into the next open).
- `onButton` (every step first settles):
  - any phase: Start → `popToBase`, Select → `toggleHelp` (their repeats: `consumed`).
  - `list`: LB/RB switch tabs, Up/Down move the cursor (`navStep`: a fresh press wraps, a repeat
    clamps), Left/Right consumed, B → `pop` (repeat: consumed), A on a row → `sheet` on its FIRST
    action (Accept for a request: design §5 counts "U, Enter, Enter" to respond, and ctl-13's
    sheet opens "with Accept active"), A with no row or a repeat → consumed, anything else
    `unhandled`.
  - `sheet` (no prompt): Up/Down move over the legal actions through `navStep(list(actions))`
    (fresh wraps, repeat clamps: a held Down never wraps from Decline back onto Accept [L]);
    B → `list`; A on Accept / Cancel issues the command and returns to `list`; A on Decline, or
    on a trade's Confirm, opens the prompt with `yes: false`; everything else consumed.
  - prompt open: a fresh Up/Down flips Yes/No (a repeat never does); A on Yes issues the command
    and returns to `list`; A on No, or B, closes the prompt (the sheet stays on that action).
  - A repeat never acts. A press whose phase the settle just changed only paints (the shop's
    rule).
- Commands: trade accept → `respondTrade {tradeId, accepted: true}`; decline → `respondTrade
  {…, accepted: false}`; confirm → `confirmTrade`; cancel → `cancelTrade`; incoming accept →
  `acceptChallenge`; decline → `declineChallenge`; outgoing cancel → `cancelChallenge`.
- `settle` / `observe`: re-seat the cursor by key (`navReconcile`); a sheet whose row is gone,
  whose tab is no longer the active one, or whose legal actions changed (compared BY VALUE)
  closes to `list` — never re-pointed, so a prompt-gated action cannot become an immediate one
  under the cursor [L]. The SAME state object (and the same `phase` object) when nothing changed,
  so a fresh view model per press never deadens A [L].
- `paint(view, vm, state)` follows `state` only (never `vm.requested`): `view.show(socialPanel(
  tab))` FIRST (a later throw still leaves the right panel up), then
  `view.trades?.paintSocial(view.chrome, paint)`, then `view.challenges?.paintCursor(row)`. Never
  `hostChrome` directly.
- Accepted, as the shop's: an A-driven command has no in-flight lock (the views' locks guard
  their own buttons); the reducers are the authority and duplicate-safe.

### Views (imperative shell; strings via thunks `() => t('lit.id')`)
`ui/tradeView.ts` gains the frame's one painter (it is the declared view the seam map names; a
`socialView.ts` would be a new `*View.ts`):
```ts
export type SocialQuestion = 'declineTrade' | 'confirmTrade' | 'declineChallenge';
export interface SocialPaint {
  readonly tab: SocialTab;
  readonly tradeCursor: boolean;   // the trade row holds the cursor (Trades tab, a trade listed)
  readonly sheet: { readonly actions: readonly SocialAction[]; readonly active: SocialAction } | null;
  readonly confirm: { readonly question: SocialQuestion; readonly yes: boolean } | null;
}
paintSocial(chrome: HTMLElement, p: SocialPaint): void
```
- The chrome half is a stateless module function (`paintSocialChrome(chrome, p)`), run on EVERY
  `paintSocial`, whether or not the trade root is shown (on Challenges and Rankings it is hidden)
  [L]. Parts are located-or-created by id INSIDE `chrome`:
  - `#social-tabs` (`.mr-frame-tabstrip`, `renderTabs`, frame `social`): four `role="tab"`
    children `#social-tab-<tab>`, the active one `.is-active` + `aria-selected="true"`.
  - `#social-sheet` (`renderNav`, frame `socialSheet`, labelled by the active tab): one
    `[data-nav-key=<action>]` row per legal action, the cursor row `.is-active` +
    `aria-selected="true"`; `hidden` and EMPTY when there is no sheet. It stays painted under
    its prompt.
  - `#social-prompt` > `#social-prompt-text` + `#social-confirm` (`renderNav`, frame
    `socialConfirm`, rows `yes` / `no`); `hidden` and empty when there is no prompt.
  - A part hidden while it holds the focus hands the focus to the hosting root's anchor (its
    `[tabindex="-1"]`), so it is never stranded on `<body>` (boxView's rule) [L].
- The root half is ONE total `#applySocial()` over (the kept paint or null, the status text the
  last `render` wrote) [L]:
  - Players tab: `#trade-status` reads the placeholder; `#trade-my-side`, `#trade-their-side`
    and `#trade-actions` are `hidden`. `#trade-status` stays shown (the dialog's focus anchor)
    and `#trade-feedback` stays shown (a trade result must not vanish [L]).
  - Any other tab, or no paint: the cached status text, nothing hidden.
  - `tradeCursor` on Trades: `#trade-status` carries `.mr-nav-item.is-active` +
    `aria-current="true"`; otherwise none of the three.
  - `render(vm)` caches the status text it writes and calls `#applySocial()` on BOTH branches
    (the `no-trade` early return included); `hide()` drops the paint and calls it, so a hidden
    root holds no placeholder, no `hidden` part and no mark. The paint is kept only while the
    root is visible. It never repaints the chrome (no per-batch churn of the sheet).
`ui/pvpView.ts`: `paintCursor(row: 'incoming' | 'outgoing' | null): void` marks
`#pvp-challenge-incoming` / `#pvp-challenge-outgoing` (`.mr-nav-item.is-active` +
`aria-current="true"`); `hide()` clears it. The marks sit on the containers, which survive
`#renderIfChanged`.

### Catalog (+12 ids, en + fr + `messageIds.ts`; all plain strings, each with its `@desc`)
`social.tab.players|trades|challenges|rankings` = Players / Trades / Challenges / Rankings;
`social.players.placeholder` = "The player list is not available yet.";
`social.action.accept|decline|confirm|cancel` = Accept / Decline / Confirm / Cancel;
`social.confirm.declineTrade` = "Decline this trade?";
`social.confirm.confirmTrade` = "Complete this trade? It cannot be undone.";
`social.confirm.declineChallenge` = "Decline this challenge?".
fr: Joueurs / Échanges / Défis / Classement; « La liste des joueurs n’est pas encore
disponible. »; Accepter / Refuser / Confirmer / Annuler; « Refuser cet échange ? »; « Conclure
cet échange ? Cette action est irréversible. »; « Refuser ce défi ? ».

### `ui/screens/index.ts`
`social: socialScreen` (and the table comment).

## Anti-patterns avoided
- No module state: the tab memory is the host's (`remember`), the kept paint is the view's.
- No rule re-implemented: actions come from `tradeActions` and the two challenge selectors.
- No `hostChrome` call from the adapter; no DOM, resolver or clock in the screen or the model.
- No tolerance for partial test fakes in production code.

## Tests (the tester writes them; each tag is the prefix of exactly one test title, `TAG: …`)

Unit tier (vitest; these carry the criteria and are the gate CHECKs):
- `ui/socialModel.test.ts` (new): `CTL8D-1-MODEL-ROWS`, `CTL8D-1-MODEL-OLDEST-WAITING`,
  `CTL8D-2-MODEL-ACTIONS`.
- `ui/tradeModel.test.ts`, `ui/pvpModel.test.ts`: the new selectors ride in the socialModel cases
  (no new tag); the existing cases must stay green unchanged.
- `ui/screens/socialScreen.test.ts` (new; node env, a recording fake `SocialFrameView`, a FRESH
  view model per press):
  `CTL8D-1-INIT-WAITING-TAB`, `CTL8D-1-INIT-REMEMBERED-TAB`, `CTL8D-1-TABS-LBRB`,
  `CTL8D-2-SHEET-TRADE`, `CTL8D-2-SHEET-CHALLENGE`, `CTL8D-2-CONFIRM-DEFAULT-NO`,
  `CTL8D-2-COMMANDS`, `CTL8D-2-REPEAT-NEVER-ACTS`, `CTL8D-2-SETTLE`,
  `CTL8D-3-REQUESTED-TAB-WINS`, `CTL8D-3-PAINT-PANEL`.
- `ui/screens/index.test.ts`: `CTL8D-1-HOST-REMEMBERS` (the real `SCREEN_ADAPTERS` through
  `ScreenHost.opened` / `seat` / `button` / `forget`: the tab left on is the tab the next plain
  open shows, and a command issued through the real host).
- `ui/tradeView.test.ts` (happy-dom): `CTL8D-1-VIEW-TABS`, `CTL8D-1-VIEW-PLACEHOLDER`,
  `CTL8D-2-VIEW-SHEET`, `CTL8D-2-VIEW-TRADE-CURSOR`.
- `ui/pvpView.test.ts`: `CTL8D-2-VIEW-CHALLENGE-CURSOR`.
- `ui/screens/socialScreen.boot.test.ts` (new; main.ts booted over the real index.html and the
  REAL views and adapter table, main.social.test.ts's harness plus a recording connection):
  `CTL8D-1-BOOT-TABS`, `CTL8D-2-BOOT-RESPOND`, `CTL8D-3-BOOT-HOTKEYS`. Each asserts what only the
  real adapter paints (`#social-tab-<tab>` selected, the cursor mark, the sheet), never just the
  panel shown (that is ctl-8s's, green on master) [L]; the auto-show case (an incoming challenge
  opens Challenges with the cursor on the request) rides in `CTL8D-1-BOOT-TABS`.
- `ui/i18n/catalog.test.ts` (+ `catalogParity.test.ts` if a roster there needs it): the 12 ids
  join the existing rosters (237 → 249); no new tag, the files must pass.

e2e (Playwright; one per user-facing flow; run locally against a live server and by remote CI,
not a gate CHECK because `mr-gates check` has no server):
- `e2e/trade.spec.ts`: U opens Social on Trades with the four tabs; PageDown / PageUp switch
  the panel; the strip follows the shown root.
- `e2e/pvp.spec.ts`: two players; B is challenged, Social opens on Challenges with the cursor on
  the request; B answers Decline from the sheet with the keyboard (No is the default) and the
  request is gone for both. (Decline, not Accept: it leaves no battle behind for later specs; it
  closes by answering, because the auto-show re-opens while a request is pending [L].)

Wrong implementations the cases must kill [L]: an adapter that ignores `requested` (three
distinct tabs: requested, waiting, remembered), or whose paint reads `vm.requested`; a challenge
Decline that defaults to Yes or skips the prompt; `respondTrade` with the wrong `accepted`, or a
wrong / swapped id (distinct ids per row kind, `toEqual` on all 7 commands); a row kind chosen by
position (an outgoing-only fixture offers `[cancel]`); selectors that take a third party's row,
a non-Pending row, or another pair's trade; an `oldestWaiting` that picks the newest, or throws
on bigint; a sheet with no cursor (exactly one `.is-active` row); an `init` that carries a
remembered sheet; a held Down that wraps Decline → Accept; a settle that re-points instead of
closing, or deadens A by rebuilding an unchanged phase; a `paintSocial` that returns early on a
hidden trade root; a placeholder that survives Players → Trades with no render, a `no-trade`
render, or a `hide()`; a boot case that passes on the legacy adapter.

Named intentional changes: `screens/index.test.ts` `CTL6B-1-ADAPTERS-TOTAL` (Social holds
`socialScreen`; 13 legacy ids), `CTL7C-1-NAV-CAPABLE` (Social is nav-capable), and the rosters
there derived from `CONVERTED` / `LEGACY_IDS` (e.g. `CTL7D-6-OBSERVE-SKIPS`);
`i18n/catalog.test.ts` roster 237 → 249.

## Gates
CHECK per gate: the ctl-8s template (vitest `--reporter=json` over the gate's files; every tag
passes exactly once (`fullName` contains `TAG:`); no failed / pending / todo; no `.fails(`; every
file seen). Files: CTL8D.1 = socialModel, socialScreen, screens/index, tradeView, catalog,
catalogParity, socialScreen.boot; CTL8D.2 = socialModel, socialScreen, tradeView, pvpView,
socialScreen.boot; CTL8D.3 = socialScreen, socialScreen.boot.

## Residuals to register after the lenses (not built here)
- R-ctl-8d-CTL8D.1-PLAINOPEN → ctl-13 [ux-a11y/MED]: no production open path binds a null tab,
  so the waiting-request tab choice and the remembered tab never fire for a player yet.
- R-ctl-8d-CTL8D.2-FEEDBACK → ctl-13 [ux-a11y/LOW]: a trade command's result line shows only
  while the trade panel is the shown one; a challenge command has no result line (both `main.ts`).
- Known limits recorded in the build note, not residuals: the announcer names the Players tab
  "Trade" until ctl-8g; the sheet and prompt are not announced (focus stays on the anchor, as the
  shop's); Enter on a Tab-focused legacy Reject button rejects with no prompt (until ctl-13/15).

## Lenses at step 7
reviewer, /simplify, red-team (the artifact), verifier. `reducer-security-auditor` and
`desync-guard` have no surface here (no reducer, table, game-core or wasm change).
