# acs-7 plan — the client asks a player to sign in before playing

Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-7. Worktree
`projects/monster-realm/.claude/worktrees/acs-7`, branch `slice/acs-7`, base `af87edb8`.

## Measured before planning (sandbox `/tmp/acs7-sb.KYEbwH`)

- Master's client toward a dev-enforcing database shows the raw line `join: ownership required` on
  the status line, the hint and the error overlay, and offers nothing. The SDK delivers the
  reducer error as `err.message === 'ownership required'` exactly.
- `start_guest_claim` refuses a caller with no player row (`not joined`), so today's
  `startSignIn()` (claim code first) cannot start a sign-in for a connection the server never
  admitted.
- The existing OIDC flow (`net/oidc.ts`) works unchanged against the real `local-dev` account
  service: discovery, `/auth`, the password form, `/token` 200, an account connection whose
  `account` row carries `auth_issuer = http://localhost:4455`.
- `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown
  --no-default-features --features dev_issuers --target-dir target/signin-gate` gives the
  dev-enforcing artefact (`just module-profile`: `profile=dev-enforcing`,
  `enforces_ownership=true`) in 18 s here without touching the suite's own wasm.
- `vite dev` always serves a shell document of kind `test`; a spec serves another kind by routing
  `**/shell-config.js` (as `local-identity.spec.ts` does).
- Nothing tells a client whether a server enforces before `join_game` (acs-6 note n6 (4), lpw-8
  note n6). A public value would be a schema change, outside this slice's files.
- The default keymap binds Enter to A, Backspace to B and Escape to Start. Under the uncovered
  menu the router sends the D-pad, A, B and Y to `mainMenuStep`; Start goes to the menu frame's
  adapter, which answers `popToBase`, and Select answers `toggleHelp`.
- The reducer rejection of a join settles after `onReady` / `onReconnect` have run (the call is
  made inside the applied-snapshot callback and is not awaited).

## Decisions (each reversible; recorded in the PR `plan-delta:` and as spec notes)

1. **How the client knows.** Two sources, both in `connect`:
   - *Given*: `accountRequired`, which `main.ts` sets for an `official` target whose build names
     an issuer. The official module always enforces (the `official` release build), so the client
     calls no `join_game` there before an account connection: acs-7.1 to the letter.
   - *Learned*: the first `join_game` the server refuses with `ownership required`. A `test`
     target may or may not enforce (the e2e suite and playtests are `test` and open), so there the
     first anonymous join is the probe; after one refusal every later anonymous connection of the
     page withholds its join. No new build variable, no schema change.
2. **Where the screen lives.** The main menu frame in a gate mode, not a new overlay: a new
   `OverlayId` drags the a11y registries and count-pinned tests outside this slice's files, and the
   menu frame already has the nav kit (D-pad, A, B, Y through the input router), pointer picks,
   focus handling and the feedback line. `MenuView` paints `menuViewModel(state)` generically, so
   `menuView.ts` is untouched.
3. **Sign-in from the gate carries no claim code.** A connection the server never admitted has no
   guest progress, and `start_guest_claim` would refuse it.
4. **The store link** is a row that opens `https://store.steampowered.com/` in a new tab. The
   game's Steam app id does not exist until phase 2; acs-11 replaces the constant with the app page.
5. **`local` / `private`** never get the screen (acs-7.3). A refusal there is one catalog line on
   the status channel instead of the raw reducer string; lpw-15 replaces it with the binding prompt.
6. **A stored claim code is left alone.** The gate's sign-in mints none and clears none. A code
   left by a guest session from before the server enforced is that guest's only way to move its
   progress to an account, so the account connection it comes back as follows the existing claim
   flow (the join veto, the Account section) instead of losing it. On the official server no code
   can exist: no guest ever joins there.
7. **The gate goes down when the player has joined**: the own `player` row is in the store. It is
   not lowered by a connection merely being allowed to try, because a refusal arrives after
   `onReady`.
8. **Escape answers as B on the gate.** Escape is Start, and Start on the menu frame is "close
   every frame". While the gate holds the screen that command is answered with B's line instead.

## Functional core / imperative shell

| File | Role |
|---|---|
| `ui/claimModel.ts` (pure) | The gate's state machine and projection: phases, events, the view (title, standing line, rows, B's line), the store URL |
| `ui/screens/mainMenuScreen.ts` (pure) | The menu in gate mode: nav over the gate's rows, A / B / Y, pick, view model |
| `net/connection.ts` (shell) | Withhold the join, learn from the refusal, route the refusal, start sign-in without a claim |
| `main.ts` (shell) | Wire the callbacks to the gate state, open / hold / lower the menu frame in gate mode |
| `ui/i18n/*` | Eight new `claim.gate.*` strings, en + fr |
| `ui/claimView.ts` | No change planned |

## Contracts

### `net/connection.ts`

```ts
export interface ConnectionOptions {
  // … existing …
  /** The server admits no player without an account. Absent or false: an anonymous connection
   *  joins as before. */
  readonly accountRequired?: boolean;
  /** An anonymous connection's join was withheld because the server needs an account. Called on
   *  each such applied snapshot, just before onReady / onReconnect. */
  readonly onAccountRequired?: () => void;
  /** joinGame was refused with the server's ownership error. Reported here, never through
   *  onError. */
  readonly onOwnershipRefused?: () => void;
}
```

"Account is required" below means: `accountRequired === true`, or this `connect()` has seen an
ownership refusal (sticky for the page).

- C1. Required + anonymous build: the applied snapshot calls no `joinGame`; `onAccountRequired`
  fires once per applied snapshot, before `onReady` (first) / `onReconnect` (later).
- C2. Required + account build (no unconsumed claim code): `joinGame` is called;
  `onAccountRequired` is not.
- C3. Not required + anonymous build: `joinGame` is called (today's behaviour, the control).
- C4. `joinGame` rejects with `Error('ownership required')`: `onOwnershipRefused` once, `onError`
  not called for it. Exact match only: any other message (other case, trailing text, a substring
  match) still goes to `onError('join', message)`; `already joined` stays silent. The routing is
  in the one join path (`attemptJoin`), so the applied snapshot's join, `join()` and the
  cancel-deletion re-join all get it. A refusal that settles after its connection was superseded
  by a newer build reports nothing (neither callback) and teaches nothing.
- C5. After C4, a later anonymous build of the same `connect()` (a reconnect) behaves as C1; a
  later account build still joins.
- C6. `join()` on an anonymous build while an account is required calls no `joinGame`.
- C7. `startSignIn()` while an account is required: no claim code is minted, no `startGuestClaim`
  call, a claim code already in storage is left exactly as it is, and the OIDC redirect begins
  (`beginSignIn` → `location.assign`) whether or not the link is live. With sign-in off it still
  reports `'sign-in-off'` and does nothing else. When no account is required it is unchanged (live
  link, claim code, `startGuestClaim`, then the redirect).

### `ui/claimModel.ts`

```ts
/** Where the store row leads. */
export const OWNERSHIP_STORE_URL = 'https://store.steampowered.com/';

export type SignInGatePhase = 'hidden' | 'sign-in' | 'not-owned';
export interface SignInGateState {
  readonly phase: SignInGatePhase;
  /** Why the last sign-in attempt failed, until the next one starts. */
  readonly failure: string | undefined;
}
export const SIGN_IN_GATE_INITIAL: SignInGateState; // { phase: 'hidden', failure: undefined }

export type SignInGateEvent =
  | { readonly kind: 'account-required' }   // a join was withheld
  | { readonly kind: 'ownership-refused' }  // join_game answered the ownership error
  | { readonly kind: 'sign-in-failed'; readonly reason: string }
  | { readonly kind: 'joined' };            // the own player row arrived

/** Pure and total; a fresh state, the input never mutated. */
export function signInGateStep(state: SignInGateState, event: SignInGateEvent): SignInGateState;

export interface SignInGateRow {
  readonly key: 'signIn' | 'store';
  readonly label: string;
  readonly description: string;
}
export interface SignInGateView {
  readonly title: string;
  /** The standing line: why the screen is up, or why the last sign-in failed. */
  readonly line: { readonly kind: 'info' | 'error'; readonly text: string };
  /** `signIn` first; `store` only in the not-owned phase. */
  readonly rows: readonly SignInGateRow[];
  /** What B answers: the screen stays until the player signs in. */
  readonly stays: string;
}
/** `undefined` while hidden, and for a build that offers no sign-in (`offer.kind === 'none'`). */
export function buildSignInGateView(
  state: SignInGateState,
  offer: SignInOffer,
): SignInGateView | undefined;
```

| Event | From `hidden` | From `sign-in` | From `not-owned` | `failure` |
|---|---|---|---|---|
| `account-required` | `sign-in` | `sign-in` | `not-owned` | kept |
| `ownership-refused` | `not-owned` | `not-owned` | `not-owned` | kept |
| `sign-in-failed` | `hidden` | `sign-in` | `not-owned` | the reason |
| `joined` | `hidden` | `hidden` | `hidden` | cleared |

View: `title` is `claim.gate.signIn.title` in `sign-in` and `claim.gate.notOwned.title` in
`not-owned`. `line` is `{ error, <the claim.signInFailed.* line for the reason> }` when `failure`
is set (same mapping as the claim overlay's failed sign-in, unknown reasons to the fallback), else
`{ info, claim.gate.signIn.body }` in `sign-in` and `{ error, claim.gate.notOwned.body }` in
`not-owned`. Row `signIn`: label `tf('claim.signInWithProvider', { provider: offer.name })`,
description `claim.gate.signIn.desc`. Row `store`: label `claim.gate.store.title`, description
`claim.gate.store.desc`. `stays` is `claim.gate.stays`. Every string is resolved at projection
time.

### `ui/screens/mainMenuScreen.ts`

```ts
export interface MainMenuState {
  // … existing …
  /** Present: the menu is the sign-in gate and offers these rows instead of its entries. */
  readonly gate?: SignInGateView;
}
export type MenuEffect =
  | { readonly kind: 'none' }
  | { readonly kind: 'open'; readonly target: MenuTarget }
  | { readonly kind: 'close' }
  | { readonly kind: 'signIn' }
  | { readonly kind: 'store' };

/** The menu as the sign-in gate: the cursor on its first row, nothing remembered. */
export function openSignInGate(memory: NavMemory, gate: SignInGateView): MainMenuState;
```

With `gate` present:
- M1. `openSignInGate`: cursor on `signIn`; `memory` is returned unchanged (and no later step
  writes the gate's cursor into it); no feedback; `battle` false.
- M2. Up / Down / Left / Right move over the gate's rows by the nav kit's list rules; a move clears
  a transient feedback line. With one row no move happens and the state is returned as it was.
- M3. A (not a repeat) on `signIn` → effect `signIn`; on `store` → effect `store`; state unchanged.
- M4. B (not a repeat) → effect `none`, feedback `{ info, gate.stays }`. No input in gate mode
  yields `close` or `open`.
- M5. Y (not a repeat) → feedback `{ info, <the row's description> }`.
- M6. `mainMenuPick(state, key)`: the key of a row the gate shows now moves the cursor there and
  activates it (M3); any other key does nothing: a main-menu entry key (`monsters`, `close`, …),
  and `store` while the gate shows only `signIn`.
- M7. `menuViewModel`: `frameId` `'menu'`, `title` the gate's, no crumbs, `layout` the gate's rows
  (all enabled), `labels` by row key, `feedback` the transient line when there is one, else the
  gate's standing `line`.
- M8. Without `gate` every existing behaviour is unchanged (the existing suite is the control).

### `main.ts`

- `connect` receives `accountRequired: true` only for kind `official` with sign-in mode `'oidc'`.
- The gate has a view only when the build offers sign-in (`SIGN_IN_OFFER.kind === 'provider'`,
  which is the same condition as sign-in mode `'oidc'`). "The gate is up" means it has a view.
- `onAccountRequired` → gate event `account-required`. It arrives before `onReady` /
  `onReconnect`, whose tail shows the gate when it is up (after the reconnect sweep, which closes
  the menu frame like every other).
- `onOwnershipRefused` → gate event `ownership-refused`, and the gate is shown at once: the
  refusal arrives after `onReady`.
- Without a view (`local`, `private`, a build with no issuer) nothing opens; `onOwnershipRefused`
  and `onAccountRequired` report the catalog line `claim.gate.notOwned.title` as a
  `connect-failure`.
- Showing the gate: pop every player frame to the base, open the menu frame in gate mode
  (`openMenu` picks the mode from the gate, so any path that opens the menu while it is up gets the
  gate), and announce the standing line when it changed. A gate already open is repainted in
  place with its new view.
- Lowering: a batch that finds the own `player` row while the gate state is not `hidden` is the
  `joined` event; a menu frame open in gate mode is closed and the menu state is the ordinary
  menu's again.
- While the gate is up: `popToBase` with the menu on top is answered as the gate's B (M4), so
  Escape gives B's line and closes nothing; `popToBase` under another frame (Help opened with
  Select) closes down to the base and shows the gate again; an accelerator does nothing.
- Effect `signIn` → the existing `claimSignIn` command (`conn.startSignIn()`). Effect `store` →
  `window.open(OWNERSHIP_STORE_URL, '_blank', 'noopener')`.
- `onSignInFailed(reason)` always feeds the gate (`sign-in-failed`) and repaints it when it is up.
  It also takes today's claim-overlay path only when the target does not require an account up
  front and the gate is not up. On a `test` target a return leg that fails is therefore shown by
  the claim overlay first and, once the refused join raises the gate, on the gate's line.
- A standing world hint (connection lost, a connect failure) still outranks the menu frame's line
  as it does for the main menu; the not-owned message is the frame title, which no hint replaces.
- Help may open above the gate (Select); B there returns to it.

### Catalog (en / fr), all eight under `claim.gate.*`

| Key | en | fr |
|---|---|---|
| `claim.gate.signIn.title` | Sign in to play | Connectez-vous pour jouer |
| `claim.gate.signIn.body` | This server needs an account. Sign in to start playing. | Ce serveur demande un compte. Connectez-vous pour commencer à jouer. |
| `claim.gate.signIn.desc` | Opens the sign-in page, then brings you back here. | Ouvre la page de connexion, puis vous ramène ici. |
| `claim.gate.notOwned.title` | You need to own Monster Realm on Steam | Vous devez posséder Monster Realm sur Steam |
| `claim.gate.notOwned.body` | Get the game on Steam, then sign in with the account that owns it. | Procurez-vous le jeu sur Steam, puis connectez-vous avec le compte qui le possède. |
| `claim.gate.store.title` | Open the Steam store | Ouvrir la boutique Steam |
| `claim.gate.store.desc` | Opens the Steam store in a new tab. | Ouvre la boutique Steam dans un nouvel onglet. |
| `claim.gate.stays` | You need to sign in before you can play. | Vous devez vous connecter avant de pouvoir jouer. |

The sign-in row reuses `claim.signInWithProvider` and the failure lines reuse
`claim.signInFailed.*`.

## Tests (tester-owned; the orchestrator runs the red proofs)

| File | Proves |
|---|---|
| `client/src/net/connection.test.ts` | C1–C7 against the faked SDK builder |
| `client/src/ui/claimModel.test.ts` | the transition table, the projection, totality, both locales |
| `client/src/ui/screens/mainMenuScreen.test.ts` | M1–M8 |
| `client/src/ui/i18n/catalog.test.ts` | the eight keys in en and fr, fr differing from en, the French bytes from the table above |
| `client/src/main.signInGate.test.ts` (new sibling of `main.ts`) | the real `main.ts` over the real shell: `accountRequired` per kind and build; the gate shown with only the sign-in row and the provider's name; arrows / Enter / Escape through real key events; Start and an accelerator do not close it; the refusal shows the not-owned title and the store row at once and never the raw string; `local` / `private` show no gate and a catalog line; a failed sign-in's line; the reconnect re-show; the lowering when the own player row arrives |
| `client/e2e/signin-gate.spec.ts` | one flow per surface against the real stack (below) |

Test names lead with the behaviour and end with the criterion tag (`[acs-7.1]` … `[acs-7.4]`),
which the ledger CHECKs select on.

### e2e rig (inside the spec file; nothing else is edited)

`test.describe.serial`, `beforeAll` with its own long timeout:
1. Build the dev-enforcing module with the cargo line above (`--target-dir` under the repo's
   `target/signin-gate`, so the suite's prebuilt wasm is never overwritten).
2. `spacetime publish -s $STDB_SERVER --bin-path <that wasm> --delete-data -y <suite db>-signin-gate`.
3. Refuse to start when something already answers on port 4455 (a clear error naming the port:
   never a silent skip, never a foreign issuer taken for the rig's own). Then `just
   account-install`, and start `node src/server.ts` in `account-service/` with
   `MR_ACCOUNT_PROFILE=local-dev` and `MR_ACCOUNT_DATA_DIR=<a temp dir>`; wait for
   `http://localhost:4455/.well-known/openid-configuration` while the child is still alive. Port
   4455 is the issuer the module trusts, one instance on a machine.
4. `node src/admin/cli.ts set-client monster-realm http://localhost:<gate port>/`,
   `create-account <email>` and `create-account <email> --not-entitled`; read each `password=` line.
5. Start a second vite dev server (`npm run dev` in `client/`) on `<suite port> + 100` with
   `MR_E2E_PORT`, `VITE_STDB_URI`, `VITE_STDB_DB=<gate db>`, `VITE_MR_OIDC_ISSUER=http://localhost:4455`,
   `VITE_MR_OIDC_CLIENT_ID=monster-realm`, `VITE_MR_OIDC_REDIRECT_URI=http://localhost:<gate port>/`,
   `VITE_MR_OIDC_PROVIDER_NAME`.
`afterAll` stops the two process groups it started, and a process `exit` handler does the same for
a run that ends without it.

Flows:
- **official, entitled** (shell document routed to kind `official`): the first screen is the gate
  with one row naming the provider; the `player` table of the gate database is empty and the
  module log holds no refused `join_game` for this identity; Enter leads to the issuer's form; the
  entitled account signs in; back in the game the gate is gone and the player has a row and an own
  tile.
- **official, not entitled**: the same until the form; the issuer answers its not-owned page and
  issues nothing; back at the game the gate is up again and the `player` table gained no row.
- **test, anonymous** (vite's own document; tagged `[acs-7.2]`, never `[acs-7.1]`): the refused
  join shows the not-owned title, the store row and the sign-in row; the page text never holds
  `ownership required`; Down then Enter on the store row opens `OWNERSHIP_STORE_URL` in a new page;
  Escape leaves the gate up.

## Acceptance ledger

Each gate's CHECK runs the named vitest files with the JSON reporter and counts the passed tests
whose title ends in that gate's tag, per file; EXPECT pins the counts. The e2e needs a running
SpacetimeDB and minutes of wall clock, so it is run by the orchestrator and reported in the PR
body with its log beside the ledger, not wired as a CHECK.

## Risks

- **acs-7.1 on `test` targets.** A `test` target that enforces is probed by one anonymous
  `join_game` per page load (one refusal line in the module log each), and its first screen is the
  refusal's (the not-owned title, sign-in and the store row). Only the official kind calls no
  `join_game` before sign-in. Closing that needs a public value from the module (a schema change):
  filed as a follow-up and stated in the PR for the supervisor to adjudicate.
- The hint bar's B chip still reads as it does for the main menu while the gate is up.
- The e2e adds a cargo build, an `npm ci` of `account-service/` and port 4455 to whichever shard
  runs it.
- Found while probing, outside this slice: on a cold return leg the guest claim stays at
  "Finishing your claim" (`onApplied` reads `store.ownAccount` before the row callbacks have
  filled the store, and nothing re-issues `complete_guest_claim` when the row arrives). Filed as a
  follow-up note. It is also what a player with a stored claim code meets after the gate's sign-in
  (decision 6); Decline in the Account section is the way through until it is fixed.
- A signed-in account that does not own the game is offered sign-in again and nothing else; whether
  that lands on another account is the issuer's sign-in step (the dev service asks every time).

## Plan review (reviewer + red-team, 2026-11-21) — what changed

Both found that a refusal arrives after `onReady`, so "lower when nothing was raised" hid the gate
the refusal should raise: the gate is now shown by the refusal itself and lowered by the own
player row. The reviewer found Escape is bound to Start, not B: the gate now answers Start's
`popToBase` as B. Both found a stored claim code vetoes the account's join after the gate's
sign-in and proposed clearing it; the plan keeps the code instead (decision 6) and says what the
player meets. The red-team found the join's rejection handler has no superseded-build guard (now
in C4), that the lowered gate left `menuState` in gate mode (now reset), and that a foreign process
on 4455 would be taken for the rig's issuer (the rig now refuses). Removed as unneeded: the
`admitted` and `sign-in-started` events, `notOwnedMessage()`, the `pop` guard.
