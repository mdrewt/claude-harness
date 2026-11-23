## acs-7 — the client asks a player to sign in before playing

On a server that admits only players who own the game, an unjoined player now sees a sign-in screen instead of an empty world and the raw line `join: ownership required`.

- **Official target, build with an issuer:** the connection sends no `join_game` until an account connection exists. The first screen offers one row, "Sign in / create account with `<VITE_MR_OIDC_PROVIDER_NAME>`".
- **Any target, `join_game` refused with `ownership required`:** the screen shows "You need to own Monster Realm on Steam", the sign-in row and a row that opens the Steam store in a new tab. The refusal never reaches the status line as raw text. After one refusal no later anonymous connection of the page joins.
- **`local` / `private` (and a build with no issuer):** no screen. A refusal is one catalog status line, kept across reconnects.
- The screen is the main menu frame in a gate mode: arrows move, Enter activates, Backspace (B) and Escape answer "You need to sign in before you can play." and close nothing. It goes down when the own `player` row arrives.

Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-7. Plan and contracts: `memory/projects/monster-realm-acs-7-plan.md`.

### The red e2e shard, and what changed for it (head `a9962c10`)

Run 44983872028, `e2e-shard (1)`: `client/e2e/local-identity.spec.ts` `LPW2-6-CONTROL` timed out waiting for an anonymous `official` page to join. It was deterministic. The suite's build names an issuer (`playwright.config.ts`), so an `official` page is exactly the case acs-7.1 holds at the sign-in screen. The product code is unchanged since `1360639a`; the fix is in two spec files (tester-written) and one sentence of the decision entry.

**No other spec was affected.** `local-identity.spec.ts` and `signin-gate.spec.ts` are the only e2e files that serve an `official` shell document; `shell-config.spec.ts` routes kind `test`, and every other spec uses vite's own `test` document.

`LPW2-6-CONTROL` keeps its place (the file still has three tests; the title still starts `LPW2-6-CONTROL:` and ends `[lpw-2.6]`, which the lpw-2 ledger's CHECK counts) and now has two legs:

| What the control asserted | Where it lives now |
|---|---|
| page 1 joins (identity and own tile) | `test` leg, unchanged. On `official` an anonymous join is what acs-7.1 forbids; an official page joining after sign-in is `signin-gate.spec.ts` flow 1 |
| closing page 1 ends its session (player row gone) | `test` leg, unchanged; flow 1 for the signed-in official page |
| page 2 of the same profile joins | `test` leg, unchanged |
| page 2 is a different identity | **both legs** (`control test: …`, `control official: page 2 is a different identity`); flow 1's new page is neither the earlier anonymous identity nor the account |
| token key in `sessionStorage`, none in `localStorage` | **both legs**, and the official leg checks page 1 as well as page 2 |
| the closed context leaves no player behind | both legs |

New on the `official` leg: the sign-in screen is up with exactly the `signIn` row, the page has no own tile, and over a 5 s hold the `player` table has no row for the identity (the suite's module is open, so "no row" means the client withheld the join). New in `signin-gate.spec.ts` flow 1 (same three tests): after the owning account plays, the signed-in page holds no credential key in `localStorage` (reconnect token, auth-kind marker, sign-in flow record, claim code); once it closes and its row is gone, a new page of the same profile is a third identity at the sign-in screen, token key in `sessionStorage` alone, no row and no `join_game` in the module log.

**Each leg was watched failing** (one exact source replacement per run, applied, run through `just e2e`, reverted; `memory/projects/gates/acs-7.red-proof-r2.log`):

| Mutant | Fails at |
|---|---|
| `tokenPersistenceFor('official')` returns `'device'` | `control official: page 1 keeps its token key in sessionStorage, none on the device`; with that one assertion removed, `control official: page 2 is a different identity`; flow 1 at `owner: the signed-in page keeps no credential key in localStorage` |
| `tokenPersistenceFor('test')` returns `'device'` | `control test: page 2 is a different identity` |
| `ACCOUNT_REQUIRED = false` (the client before this slice) | `control official: page 1: the sign-in screen is up` |
| the join still sent after `onAccountRequired` | the same assertion (the row arrives and lowers the screen) |
| the OIDC flow record written to `localStorage` | flow 1, `owner: the signed-in page keeps no credential key in localStorage` |
| the auth-kind marker written to `localStorage` | the same assertion |

The 5 s no-row hold was not watched failing on its own: under every mutant tried, the screen assertion before it fails first.

**For the supervisor to adjudicate: lpw-2.6's text.** `M-local-play.spec.md` still says a new page for an `official` target "SHALL join as a new identity". After acs-7.1 an anonymous official page of a build that names an issuer joins nothing, and a page that signs in is its account in every tab. The test tagged `[lpw-2.6]` now asserts the per-tab identity on both kinds and the join on `test` only. Note n5 carries wording that matches the build. Nothing exercises an anonymous `official` page joining in a browser any more; for a build with no issuer it is held by `client/src/main.signInGate.test.ts`.

### What changed

| File | Change |
|---|---|
| `client/src/net/connection.ts` | `accountRequired` (given, or learned from the exact refusal, sticky for the page), `onAccountRequired`, `onOwnershipRefused`; an anonymous build withholds its join from the snapshot and from `join()`; a refusal from a superseded build reports nothing; `startSignIn()` begins the OIDC redirect with no claim code while the flag is on |
| `client/src/ui/claimModel.ts` | the gate's state machine (`signInGateStep`) and projection (`buildSignInGateView`), `OWNERSHIP_STORE_URL`, `notOwnedLine` |
| `client/src/ui/screens/mainMenuScreen.ts` | `openSignInGate` and the gate branches of `mainMenuStep`, `mainMenuPick`, `menuViewModel`; effects `signIn` and `store` |
| `client/src/main.ts` | wires the two connection reports and `onSignInFailed` to the gate, opens and holds the menu frame in gate mode, lowers it on the own player row |
| `client/src/ui/i18n/*` | eight `claim.gate.*` strings, en and fr |
| `client/e2e/signin-gate.spec.ts` | the new spec and its rig; flow 1 also covers the signed-in page's device storage and a new page of the same profile |
| `client/e2e/local-identity.spec.ts` | `LPW2-6-CONTROL` in two legs (above); the other two tests untouched |
| `ARCHITECTURE.md`, `docs/DECISIONS.md` | one paragraph; one decision entry |

### Acceptance

```
Acceptance: 4/4 met, 0 deferred, 0 unmet — acs-7 seed:0bf031b80607595b
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- ARCHITECTURE.md — ARCHITECTURE.md 'Connection and store' states when the client joins and where it offers Sign In (the Account section only). After this slice an anonymous connection sends no join while the server needs an account and the menu frame is the sign-in screen, so that paragraph is incomplete without it (reviewer finding 8 on the plan; measured by reading lines 540-553 and 794-797).
```

| Gate | Evidence |
|---|---|
| acs-7.1 | `acs7-g1:GREEN ct=14 cm=10 sg=14` |
| acs-7.2 | `acs7-g2:GREEN ct=10 cm=2 mm=1 sg=4` |
| acs-7.3 | `acs7-g3:GREEN cm=1 sg=9` |
| acs-7.4 | `acs7-g4:GREEN cm=1 cat=3 mm=12 sg=9` |

(`ct` connection.test, `cm` claimModel.test, `mm` mainMenuScreen.test, `cat` catalog.test, `sg` main.signInGate.test: passed tests whose title ends in the gate's tag. Re-run at `a9962c10`.)

### For the supervisor to adjudicate

**acs-7.1 holds to the letter only on an `official` target.** Nothing in the module tells a client whether it enforces before `join_game` answers (acs-6 note n6 (4)). A `test` target may be open (the browser suite, playtests) or enforcing, so there the first anonymous `join_game` is the probe: one refused reducer per page load, and the first screen is the refusal's (the not-owned title, sign-in and the store row). Removing that needs a public value from the module, a schema change outside this slice's files: filed as `R-acs-7-PROBEJOIN` [ux-a11y/LOW].

**lpw-2.6's text** — in the section above.

### plan-delta:

- The screen is the main menu frame in a gate mode, not a new overlay (a new overlay id drags the a11y registries and their count-pinned tests, all outside `touches:`; `MenuView` paints any view model it is given, so `menuView.ts` is untouched).
- `accountRequired` is given for kind `official` only; every other kind learns it from the first refusal. No new build variable ("A target's kind gates telemetry and account sign-in" rules one out).
- Escape is bound to Start in this client, and Start on the menu frame closes every frame: `main.ts` answers it as B while the gate is up, which is how "Escape as B" holds.
- The gate's sign-in mints no claim code and clears none. Both plan reviewers proposed clearing a stored one; it is kept because it is a guest's only way to move progress made before a server enforced.
- The store row opens the Steam store's front page: no app id exists until phase 2 (acs-11 replaces the constant).
- The gate is lowered by the own `player` row, not by a connection being allowed to try: a refusal arrives after `onReady`.
- `claimView.ts` needed no change.
- The lpw-2.6 control stays in `local-identity.spec.ts` on the suite's own server instead of joining through the account service there: the issuer's port 4455 is one per machine, and a second spec file that needs it would collide with `signin-gate.spec.ts` under `just e2e-shards`. The signed-in half went into `signin-gate.spec.ts` flow 1, where the rig already is. Neither file gained or lost a test, so the shards hold the same files as before.

### touches-delta:

- `client/src/main.signInGate.test.ts` — new sibling test of `client/src/main.ts`.
- `client/e2e/local-identity.spec.ts` — named by the resume; the test that went red.
- `docs/DECISIONS.md` — one entry, "The client learns that a server needs an account from its kind or from the first refusal; the menu frame is the sign-in screen" (it constrains lpw-15 and acs-12, and the reason is not in the code). Its "Rules out" sentence now says which of the suite's pages join anonymously (`test`) and which are held (`official`).
- `ARCHITECTURE.md` — widened through `mr-touches` (reason above).

### boyscout-delta:

none

### Tester findings

- *Defect: the catalog's key-count pins and roster go red with eight new keys.* The tester updated them (550 → 558, eight roster entries); no other existing assertion changed (verifier checked the removed lines).
- *Defect: an ordinary menu state must carry no `gate` key; `main.ts` must not name the join reducer.* Both hold.
- *Question: the status line on a target with no sign-in.* Exactly `claim.gate.notOwned.title`, no prefix.
- *Question: an account build with a stored claim code while an account is required.* The claim veto stays: no join, the claim flow runs.
- Found by the orchestrator's runs and fixed by the tester: one test assertion that did not type-check; the e2e rig's issuer keys (below).
- Resume, *question: does a new tab sign in silently from the issuer's session cookie?* No: measured, the new page is anonymous at the sign-in screen (flow 1 asserts it).
- Resume, *question: a trailing `/` on `VITE_STDB_URI` would break the token-key comparison.* True of `local-identity.spec.ts` since lpw-2 as well; the suite's URI has none. Not changed.

### Review lenses

- **Plan** (reviewer + red-team): the refusal arrives after `onReady`, so the first design hid the screen the refusal should raise; Escape is Start, not B; a refusal handler with no superseded-build guard; a foreign process on port 4455 taken for the rig's issuer. All in the plan before any test was written.
- **Code** (reviewer): one real bug, fixed with a red test first: a target with no sign-in lost its not-owned status line on reconnect (the reconnect's feedback reset ran after the report). Not changed, by choice: a repaint in place puts the cursor back on the first row; the not-owned B line says "sign in" to a hypothetical signed-in non-owner (neither dev issuer can produce one).
- **Code** (red-team, about 50 hand-written wrong implementations): the survivors that mattered got tests (an account build's `join()`, a refusal learned from an account build, buttons the gate ignores, the failure that arrives before the first snapshot, frames the gate closes, the cursor under an accelerator and Escape, the announced line). Two reported survivors are killed elsewhere in the suite (`CLAIM-VETO` in `connection.runtime.test.ts`; eight `main.*` tests for the claim overlay's failed sign-in).
- **/simplify:** `raiseSignInGate` folded into the gate's one show path (which is also the reconnect fix).
- **Verifier: PASS.** No pre-existing assertion weakened; `mr-gates verify` 4/4; six mutants of its own choosing all killed.
- `reducer-security-auditor` and `desync-guard` were not run: the diff has no server-module, game-core or client-wasm change.
- **Resume, the two spec files** (reviewer, read-only, given the before and after files and not my reading of them): no blocker. Its table of the old control's assertions matches the one above; `LPW2-5-RESUME`, `LPW2-7-SHARED` and flows 2 and 3 are byte-identical; no vacuous assertion and no race found. Closed:
  - *Major, lpw-2.6's text contradicts its test* — a spec edit, which a run cannot make: note n5, and above for adjudication.
  - *The signed-in page's device check looked only for reconnect-token keys* — fixed by the tester (four credential key families), then watched failing on two mutants the first version passed.
  - *Test timeouts below the sum of the waits inside* — fixed by the tester (360 s and 720 s; a passing run takes 18 s and 15 s).
  - *"the one `official` page" in the decision entry* — fixed.
  - Not changed, with reasons: the official leg knows the screen by its rows (`['signIn']`), not its English title, which `signin-gate.spec.ts` and the unit suite pin; a leg that fails midway skips its "no player left" wait, as all three tests of the file have since lpw-2 (only on a run that is already red); the storage helpers exist in both spec files, because a shared helper file is outside `touches:`.

### Verification

- `just ci` exit 0 at `a9962c10` (15/15 evals, account-service 885 tests, client 252 files / 6471 tests, verify-build OK, observability 9 checks, check-secrets clean). Log: `memory/projects/gates/acs-7.ci.log`. It was also green at `4cd97962`, before the tester's second round.
- **Four `just ci` runs at `a9962c10` were red before the green one, all at the same test outside this diff**: `account-service/src/deployment.test.ts`, "discovery did not answer 200 within 60 s" on the compose stack's published port (`R-acs-7-DEPLOYFLAKE`, filed by the first run of this slice). Measured this time on an unchanged tree, thirteen runs in forty minutes: the suite or the file started straight from the calling shell passed 4 of 4 (the green `just ci` above is one of them); the suite started under `setsid`, `nohup` or a background runner failed 7 of 8; the one test alone, from a background job, passed 2 of 2. I do not know the mechanism. Logs `gates/acs-7.ci-red3.log` to `-red5.log`; notes n6 and n7.
- **The whole e2e suite**, `MR_E2E_SHARDS=5 just e2e-shards` (the five-way split CI uses) against a local SpacetimeDB 2.11.0: 274 passed, 1 skipped, all five shards ok, at `a9962c10` and at `3141a1eb` (`gates/acs-7.e2e-full.log`). The skip is `recruit.spec.ts` R4, a `test.fixme` from before this slice. `local-identity.spec.ts` ran in shard 1 and `signin-gate.spec.ts` in shard 3.
- The CI failure reproduced locally at `1360639a` before any change (same timeout, same line).
- Remote CI at `3141a1eb` (the first version of the fix): every job green, the five e2e shards and the union check included. Remote CI at `a9962c10` was still running when this was written.
- `client/e2e/signin-gate.spec.ts` flows: official + entitled (no `join_game` in the module log and an empty `player` table before sign-in, then the signed-in identity has the one player row; then the device-storage and new-page tail), official + not entitled (the issuer's not-owned page, back at the gate, no row), test + anonymous (exactly one refusal, the not-owned screen, the store row opens a tab with no opener, Escape keeps it up, the raw string nowhere on the page).
- Red first: 68 of the 78 first-round tests failed on `af87edb8` for the missing behaviour (10 are controls of unchanged behaviour); each e2e flow failed at the missing screen with its rig up; the three reconnect tests failed before the lens fix (`gates/acs-7.red-proof.log`).
- `mr-gates check`: 4/4 met. `mr-comment-scan`: CLEAN. `mr-touches scope`: IN-SCOPE, 16 files, none outside.

comment-scan: CLEAN

Items: none

### Risks and follow-ups

- `R-acs-7-PROBEJOIN` [ux-a11y/LOW] — above.
- `R-acs-7-CLAIMSTALL` [data-integrity/MED] — found while probing, **not caused or fixed here**: on a cold OIDC return leg the guest claim never completes ("Finishing your claim" forever). `onApplied` reads `store.ownAccount` before the row callbacks have filled the store, and nothing re-issues `complete_guest_claim` when the row arrives. Measured with master's client against the real `local-dev` issuer. Dormant on enforcing builds.
- `R-acs-7-DEPLOYFLAKE` [loop-ops/LOW] — above. It has now failed six local `just ci` runs of this slice. The diff does not touch that package, and the remote `account-service` job is green.
- The e2e rig adds a cargo build of the dev-enforcing module (18 s here, cold), an `npm ci` of `account-service/` and port 4455 to whichever shard runs the spec. The SpacetimeDB host caches an issuer's key set for a long time and does not refetch on an unknown key id, so the rig keeps the issuer's data in the fixed directory `<tmp>/mr-signin-gate-issuer`; a local host that already cached other keys for `http://localhost:4455` (a developer's own `just account-dev`) fails the spec with an error that says so and how to clear it.
- `local-identity.spec.ts` now depends on the suite's build naming an issuer: if `playwright.config.ts` stops naming one, the `official` leg fails at "the sign-in screen is up" (an anonymous official page joins again), which is the loud outcome.
- The hint bar's B chip reads as it does for the main menu while the gate is up.
- Seven spec notes pending fold (`mr-gates notes list --slice acs-7`); n1 is the contract as built, with inputs for lpw-15, acs-11 and acs-12; n5 is lpw-2.6's wording; n6 and n7 are the flake's measurements.

### not-verified:

- Remote CI at `a9962c10`: still running when this was written (it differs from the green `3141a1eb` by the two spec files' second round and one decision-entry sentence).
- `just e2e-shards` at its default of eight shards, and the nightly single-process run, with these two specs in them. The five-shard split was run.
- The 5 s "no player row" hold of the `official` leg failing on its own (above).
- The flow against the hosted dev issuer (acs-5 is blocked) and against Steam (phase 2).
- A real browser's popup blocker on the store row: the unit and e2e tests observe `window.open` with `noopener` from a key press, in headless Chromium only.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
