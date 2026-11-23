# acs-7 tester brief — write the failing tests; implement nothing

Worktree (the ONLY tree you read or write):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/acs-7`.
Never read or write the main checkout at `projects/monster-realm/` itself. You have no shell: the
orchestrator runs everything and proves each test red on today's code.

Slice: the client asks a player to sign in before playing on a server that admits only players who
own the game. **Read the plan first, whole**:
`/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-acs-7-plan.md`. Its
`## Contracts` section is your contract (names, signatures, data shapes, behaviours C1–C7, the
transition table, M1–M8, the `main.ts` wiring, the catalog table). Its last section, "Plan review",
says what changed after review; where an earlier sentence disagrees with it, the review wins.
Doctrine: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`.

## Criteria (EARS)

- acs-7.1: WHEN the client connects to an enforcing server without an account, THE CLIENT SHALL show the sign-in screen and call `join_game` only after sign-in.
- acs-7.2: WHEN `join_game` is refused for ownership, THE CLIENT SHALL show the not-owned message with the store link and offer sign-in again.
- acs-7.3: WHEN the target is `local` or `private`, THE CLIENT SHALL not show this screen (lpw-15 owns the binding prompt there).
- acs-7.4: WHEN the sign-in screen is shown, THE CLIENT SHALL be navigable with the arrow keys, Enter as A and Escape as B, and every string SHALL come from the catalogs in both locales.

## Rules for every test you write

- Behaviour only: execute the code and assert what it does. No test reads a hand-written source
  file as text, pins prose or comments, counts tests or files, or checks another check.
- A test title leads with the behaviour it proves and ends with exactly one criterion tag as its
  last token: `[acs-7.1]`, `[acs-7.2]`, `[acs-7.3]` or `[acs-7.4]`. The acceptance ledger counts
  passed tests per file by that trailing tag, so every `it(...)` you add carries one, and a test
  that belongs to no criterion (a pure control of unchanged behaviour) takes the tag of the
  criterion it guards. Criterion ids appear nowhere else: not in comments, not in `describe` titles.
- Comments state what the test does now. Never history ("no longer", "the old", "used to", "was",
  "previously"), never a slice id.
- For each contract point, ask what plausible wrong implementation would still pass, and make sure
  one of your tests fails for it. Examples worth killing: the join withheld for account builds too;
  a substring or case-folded match of the refusal string; every join error routed to
  `onOwnershipRefused`; the refusal not remembered across a rebuild; `startSignIn` still minting a
  claim code or clearing a stored one; the gate shown on `local` / `private`; a menu entry key
  accepted by the gate; B or Escape closing the gate; the store row offered before any refusal; a
  string that is the same in both locales.
- Every test must fail today on an assertion about behaviour that does not exist yet (a missing
  export that makes the whole file fail to load proves nothing about each test). Where a new export
  is needed, import the module as a namespace or read the function defensively so each `it` reaches
  its own assertion, or keep all tests of a missing export in one `describe` whose first test names
  that the export exists and behaves; say in your report which tests can only fail at load.
- TypeScript is strict and the test files are type-checked by `tsc` once the implementation exists:
  use the contract's exact names and types. Formatting is biome's (the orchestrator runs it).
- The repository's secret scanner fails any line, tests included, matching
  `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']`: never assign a literal of 8 or more
  characters to something named password, secret or api key. Read such values from variables.
- Never edit an existing test's assertions. If an existing test contradicts the contract, report
  it; do not change it.

## Part A — vitest suites (one tester)

Files (extend the first four; create the fifth):

1. `client/src/net/connection.test.ts` — C1–C7. The file already drives the real `connect()` over
   a mocked SDK builder and a mocked `./oidc` (see its `BuildRec`, the `E1-REJOIN` and `E1-JOIN`
   suites, and how `connection.runtime.test.ts` drives an account credential, a reconnect and
   `startSignIn`). Add one new `describe` for the account gate; reuse the file's harness, do not
   copy the runtime file's. Cover: each of C1–C7; the order of `onAccountRequired` against
   `onReady` and against `onReconnect`; that a withheld join still reports `onReady` and opens the
   connection (subscriptions applied, `linkFrozen()` false); exact-match near misses for C4
   (`'Ownership required'`, `'ownership required.'`, `'join_game: ownership required'`, `''`);
   the superseded-build refusal; the stored-claim-code case of C7 (a code put in storage before
   `startSignIn` is byte-identical after it); and the unchanged claim-flow sign-in when no account
   is required.
2. `client/src/ui/claimModel.test.ts` — the gate model: every cell of the transition table
   (including events while `hidden`), purity (input not mutated, a fresh object or the same state
   only where the table says nothing changes), totality for an unknown failure reason (falls to the
   fallback line, including reasons named like `Object.prototype` members), the projection for
   each phase with and without a failure and with `offer.kind === 'none'`, the row order, the
   provider name in the sign-in label, and every projected string equal to the catalog's in both
   locales (the file already shows how its suites switch locale).
3. `client/src/ui/screens/mainMenuScreen.test.ts` — M1–M8 over views built by
   `buildSignInGateView` (not hand-made literals alone: at least the main cases go through the real
   projection so the two modules are proved together).
4. `client/src/ui/i18n/catalog.test.ts` — the eight `claim.gate.*` keys: present in both catalogs,
   the French value different from the English, and the French bytes exactly as the plan's table
   gives them (transcribe from the plan, never from `catalog.fr.ts`).
5. `client/src/main.signInGate.test.ts` (new) — the real `main.ts` over the real shell. Model the
   boot on `client/src/main.targetKindGate.test.ts` (shell document on the page global, stubbed
   build env, `connectionRecordingMock` capturing the options `main.ts` hands `connect()`, the
   listener recording and teardown) and on `client/src/main.menu.test.ts` for real key events into
   the menu. Prove through the DOM (`#menu-overlay`, its rows `[data-nav-key]` inside `#menu-rows`,
   the frame title and feedback line inside the menu frame) and through the captured options:
   - `accountRequired` is `true` only for kind `official` with an issuer in the build; not for
     `test`, `local`, `private`, nor `official` with no issuer.
   - official: `onAccountRequired()` then `onReady(id)` shows the gate: the sign-in title, exactly
     one row, its text the provider label; no main-menu entry is offered. `[acs-7.1]`
   - Enter starts sign-in (the recording connection's `startSignIn` count); arrows move between the
     rows when there are two; Escape and Backspace leave the gate open and show the stays line; an
     accelerator key and Start leave it open; a click on a row activates it. `[acs-7.4]`
   - `onOwnershipRefused()` after `onReady` shows, with no further event, the not-owned title, the
     sign-in row and the store row; Enter on the store row calls `window.open` with the store URL;
     the document's text never contains `ownership required`. `[acs-7.2]`
   - `local` and `private` (and a build with no issuer): the same callbacks open no menu overlay,
     and the status line shows the catalog's not-owned line, not the raw string. `[acs-7.3]`
   - `onSignInFailed(reason)` on an official target puts that reason's catalog line on the gate and
     does not open the Profile screen; a reconnect (`onAccountRequired()` then `onReconnect(id)`)
     leaves the gate shown; the own `player` row arriving in a batch lowers it and the next menu
     open is the ordinary menu.
   - the same screen under the French locale shows the French strings (see `main.i18nBoot.test.ts`
     for how a boot picks the locale). `[acs-7.4]`

## Part B — the e2e (a second tester)

One file: `client/e2e/signin-gate.spec.ts`, Playwright, self-contained: its rig lives inside it and
it edits or relies on no other file's change. Read `client/playwright.config.ts`,
`client/e2e/global-setup.ts`, `client/e2e/local-identity.spec.ts` (shell-document routing, the
`player` table read, `window.__game()`), `client/e2e/stdb.ts` (`sqlRows`) first. The plan's "e2e
rig" and "Flows" sections are the contract. Measured facts you can rely on:

- Suite environment: `STDB_SERVER` (default `local`; CI gives `http://127.0.0.1:3000`),
  `VITE_STDB_URI` (default `ws://127.0.0.1:3000`), `VITE_STDB_DB` (default `monster-realm`),
  `MR_E2E_PORT` (default `5290`). The gate database is `<VITE_STDB_DB>-signin-gate`; the gate's
  vite port is `MR_E2E_PORT + 100`. Validate every value you pass to a child process (the existing
  helpers show the charsets) and never build a shell string: `execFileSync` / `spawn` with argument
  arrays.
- Repo root is two levels above `client/e2e`. The module build:
  `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown --no-default-features --features dev_issuers --target-dir target/signin-gate`
  run from the repo root; the artefact is
  `target/signin-gate/wasm32-unknown-unknown/release/monster_realm_module.wasm`.
- Publish: `spacetime publish -s <STDB_SERVER> --bin-path <wasm> --delete-data -y <gate db>`.
- Account service: `just account-install` from the repo root, then in `account-service/`
  `node src/server.ts` with env `MR_ACCOUNT_PROFILE=local-dev` and `MR_ACCOUNT_DATA_DIR=<temp dir>`.
  It listens on `127.0.0.1:4455`; its issuer is `http://localhost:4455`; ready when
  `http://localhost:4455/.well-known/openid-configuration` answers 200. Refuse to start (throw,
  naming the port) when that URL or port already answers before you spawn it.
- Admin (same env, cwd `account-service/`): `node src/admin/cli.ts set-client monster-realm http://localhost:<gate port>/`
  (the trailing slash is part of the address); `node src/admin/cli.ts create-account <email>`;
  `node src/admin/cli.ts create-account <email> --not-entitled`. Each `create-account` prints
  lines `sub=…`, `email=…`, `entitled=…`, `password=…`; read the password from that line into a
  variable and never print it.
- The gate's vite: `npm run dev` in `client/` with env `MR_E2E_PORT=<gate port>`,
  `VITE_STDB_URI`, `VITE_STDB_DB=<gate db>`, `VITE_MR_OIDC_ISSUER=http://localhost:4455`,
  `VITE_MR_OIDC_CLIENT_ID=monster-realm`, `VITE_MR_OIDC_REDIRECT_URI=http://localhost:<gate port>/`,
  `VITE_MR_OIDC_PROVIDER_NAME=Dev Account`. Its own `/shell-config.js` names the gate database
  with kind `test`. Pages of this spec use absolute URLs on the gate port, not the config's
  `baseURL`.
- Spawn the two long-lived children detached and stop each by its process group in `afterAll` and
  in a `process.on('exit')` handler. Keep the last few kilobytes of each child's output and put
  them in the error when a readiness wait fails.
- `beforeAll` needs its own timeout (`test.setTimeout(900_000)` inside it): a cold cargo build.
- The issuer's sign-in page: `#email`, `#password`, `button[type=submit]`. An account that is not
  entitled gets a 403 page whose `h1` is `This account does not own Monster Realm` and no redirect.
- The game page: the menu overlay is `#menu-overlay` (inline `display: none` while hidden); its
  rows are `#menu-rows [data-nav-key="signIn"]` and `[data-nav-key="store"]`; the frame title is
  `#menu-overlay .mr-frame-title`, the line under the rows `#menu-overlay .mr-frame-feedback`.
  `window.__game()` gives `{ identity, ownAuthTile }` (`identity` is `''` until the first snapshot,
  `ownAuthTile` is `null` until the player has a character).
- English strings (the default locale): title `Sign in to play`; sign-in row
  `Sign in / create account with Dev Account`; not-owned title
  `You need to own Monster Realm on Steam`; store row `Open the Steam store`; B's line
  `You need to sign in before you can play.`
- The store row opens `https://store.steampowered.com/` in a new tab with `noopener`: wait for the
  context's `page` event (not the opener's `popup`), and route that origin in the context to a
  stub answer so no request leaves the machine.
- Server truth: `spacetime sql -s <STDB_SERVER> <gate db> "SELECT * FROM player"` (parse with
  `sqlRows`); `spacetime logs -s <STDB_SERVER> <gate db>` holds one line per refused reducer, JSON
  with `"reducer":"join_game"`, `"sender":"<identity hex>"`, `"reason":"ownership required"`.
- One browser context per flow, so no storage carries over.

Flows and tags are the plan's: official + entitled (`[acs-7.1]`), official + not entitled
(`[acs-7.1]`), test + anonymous (`[acs-7.2]`). Keyboard only where the plan says a key.

## Report back (both parts)

1. The files you wrote and, per file, the test titles grouped by tag with counts.
2. **Defects**: anything in today's code or in the plan's contract that your tests show cannot work
   as written.
3. **Questions**: anything the contract leaves open that you had to decide; say what you chose.
4. Which tests, if any, can only fail at module load today.
