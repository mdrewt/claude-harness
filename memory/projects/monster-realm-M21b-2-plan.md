# M21b-2 — Plan + Tasks (build slice)

**Repo:** `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm` (worktree `.claude/worktrees/M21b-2`, HEAD `8814416`)
**Authority:** ADR-0182 (D11–D20, G13–G30) implements-as-written; spec `M21-accounts-auth.spec.md` AUTH-39..60.
All anchors below were re-verified by me against the checkout, not transcribed.

---

## 0. Anchor verification (what I confirmed, and what I found that the ADR did not enumerate)

**Confirmed exactly as the ADR states:**

| Claim | Verified |
|---|---|
| `function build(): DbConnection {` | `client/src/net/connection.ts:524` |
| `const buildKind = readAuthKind(globalThis, opts.uri, opts.db);` | `connection.ts:538` |
| `let current = build();` | `connection.ts:708` |
| `get conn() {` | `connection.ts:714` |
| RT-01 try/catch | `connection.ts:138-148` (`current = build()` at `:143`) |
| `joinGame` unconditional inside `.onApplied` | `connection.ts:579-603` |
| `my_account` TRIPWIRE comment | `connection.ts:664-672` |
| `expectUniqueAnchor(src, 'function build(): DbConnection {')` ×3 | `connection.test.ts:265, 297, 454` (plus bare `indexOf` at 269, 279, 300, 458, 479) |
| `expectUniqueAnchor(src, 'let current = build();')` + `bodyRegion` end | `connection.test.ts:1063, 1065` |
| `my_wallet` subscription gate to mirror for G28 | `connection.test.ts:1297, 1313, 1315, 1329-1330, 1359` |
| `accounts.rs` deployment constants | `:48` (`ALLOWED_ISSUERS`, `concat!()` form), `:50` (`ALLOWED_AUDIENCE`), `audience_allowed` `:91-93` |
| 10 unguarded `conn.conn.` sites | `main.ts:885, 2143, 2181, 2196, 2213, 2225, 2237, 2249, 2305, 2327` — exact match |
| `sendGuarded` | `main.ts:664`; `let conn: … \| undefined` already at `main.ts:247` |
| `evals/run.mjs` auto-discovery, no registration | `evals/run.mjs:11` |
| `bindings-drift` CI-fail-loud/local-skip predicate | `evals/bindings-drift.eval.mjs:57-59, 105-124` |
| `ciWiresE2eGate` precedent for a structural gate | `evals/e2e-desync-teeth.eval.mjs:34-39` |
| `.gitleaks.toml` allowlist | `INTERNAL_SECRET_[A-Za-z0-9_]+` at `.gitleaks.toml:24` |
| ADR-0179 already carries `**Amended-by:** ADR-0182` | `docs/adr/0179-…md:12` |

**ADR residual RESOLVED (task-checklist item, verify-before-landing):** I grepped all of `client/e2e/**` for `conn.conn` / `linkFrozen` / any synchronous-connection assumption. **Zero hits.** Every Playwright spec goes through `window.__game()` (`trade.spec.ts:45`, `shop-npc.spec.ts:113`, `pvp-side-b.spec.ts:141`, `rename.spec.ts:66`, `trade-interlock.spec.ts:198`, `trade-propose.spec.ts:94`, `wallet-balance.spec.ts:294`), and every one polls it with a readiness predicate (`if (!w.__game) return false`). `__game` is installed at `main.ts:1946`, *before* `conn = connect(…)` at `main.ts:2396`, and reads the store, not `conn.conn`. **The async `attemptBuild` restructure has no Playwright blast radius.** ADR-0182's Consequences residual can be closed.

### 0.1 — FIVE blast-radius items ADR-0182 and the spec do NOT enumerate

These are load-bearing. Each is inside declared touches (or is a named delta), but none appear in the ADR's Gates table or the spec's task checklist.

**(A) `W-NH4-SAVE-WIRED` is a FOURTH pre-existing tooth that must be re-pinned** (the ADR names only three: G13/G14/G15).
`connection.test.ts:397` hard-codes `const M21B_SAVE_GUARDED = "if (buildKind === 'anon') auth.onConnected(token);"`. D13's build() snippet changes that literal to `if (credential.kind === 'anon') auth.onConnected(token);`. In addition the same tooth asserts, inside the `onConnect`→`onConnectError` region: `countOccurrences(squashedRegion, 'buildKind') === 1` (`:804-810`) and bans `const/let/var buildKind` there (`:811-817`); and file-wide `countOccurrences(wholeSquashed, 'const buildKind') === 1` / `'buildKind' === 2` in `W-M21B-KIND-READ` (`:562-574`). With `buildKind` deleted entirely, all of these break. **Call it G13b and treat it with the same re-pin justification ceremony the file itself demands (`connection.test.ts:595-646`).** New region count: `credential.kind` occurs **3×** inside the onConnect region under D13/D14/D16 (anon gate, `writeAuthKind` gate, `shouldJoin`) — the tester must re-derive, not guess.

**(B) `authToken.test.ts` carries TWO whole-tree teeth that this slice must retire, and one of them has a positive control that breaks silently.**
`W-M21B-WRITE-HAZARD-DOCUMENTED` (`authToken.test.ts:1243-…`):
- Test 1 pins the clauses `'no production caller may write'`, `'until the read-side'`, `'m21b-2'`, `'exercised by tests'` in `writeAuthKind`'s attached doc block, and bans revocation vocabulary (`'lifted'`, `'superseded'`, `'obsolete'`, `'no longer applies'`, …, `:1337-1357`). Its own failure message is the authoritative instruction: *"If M21b-2 has genuinely landed the guard, do not soften this comment: **delete the prohibition, delete this tooth, and re-pin the guard itself**"* (`:1352-1356`). Follow that literally — do NOT edit the clause list.
- Test 2 (`:1360`) asserts the bare identifier `writeAuthKind` appears in **no** shipped `client/src` file. `connection.ts` will now call it (D13/D14). This tooth must be deleted with test 1, and its replacement is G14's new tooth.
- ⚠ **Its anti-vacuity positive control at `:1409-1414` asserts `readAuthKind(` occurs ≥1 in the scanned tree** (which *excludes* `authToken.ts` itself, `:1235`). Under the new design `readAuthKind` moves entirely inside `wasEverAuthenticated` in `authToken.ts`, so that control goes to **0** and reds for the wrong reason. If the tooth is deleted wholesale this is moot; if any part is kept, re-pin the control to `wasEverAuthenticated(`.

**(C) Registering `claimView` in `OVERLAY_IDS` has four extra lockstep consumers, three of them in `main.ts`/`main.wiring.test.ts`:**
- `main.wiring.test.ts:5956` — `expect(OVERLAY_IDS.length, 'the imported manifest must hold 15 overlays').toBe(15)` → **16**.
- `main.wiring.test.ts:5132-5206` (`W-FANOUT-SURFACES-…-PROBE-TABLE`) — main.ts's probe table must carry **one byte-identical `?.visible ?? false` probe per `OVERLAY_IDS` member**, count `=== OVERLAY_IDS.length`. → `main.ts` needs a `claimView` probe entry.
- `main.wiring.test.ts:5937-5992` (`W-UXD3C-HANDLE-TABLE`) — `overlayHandles` must be bidirectional against `OVERLAY_IDS`. → `main.ts` needs a `claimView` hide thunk.
- `overlayRegistry.test.ts:214-224` — `OVERLAY_IDS.length === 15` twice, and `EXPECTED_GUARD_ONLY` is a hard-coded 11-literal (`:83-95`) → 12.
- `overlayRegistry.test.ts:177-190` — `scanned.size === OVERLAY_IDS.length + 1` → must become `+ 2` with an explicit `scanned.has('sessionView')` anti-vacuity assertion and a `scanned.delete('sessionView')`, mirroring `errorOverlayView` exactly (this is G19 as written; the `+2` arithmetic is the part not stated).

**(D) TOUCHES DELTA — `docs/PLAYTEST.md` must gain a `C` row.** `client/src/ui/playtestControlsDoc.test.ts:686-819` pins `docs/PLAYTEST.md` §3 against `helpModel.ts` `CONTROLS` with **bidirectional set equality (A1), exact action-string equality (A2), row-count equality (A3), and a whole-document single-char-code-span scan (A4)**. `CONTROLS` (`helpModel.ts:26-43`) has 16 entries; PLAYTEST.md §3 (`docs/PLAYTEST.md:46-61`) has the matching 16 rows. Adding `{ key: 'C', action: … }` **mechanically forces** a 17th `| \`C\` | <identical action text> |` row. `docs/PLAYTEST.md` is not in the declared Modified list. **Escalate this one-line delta; it is unavoidable and has no in-touches workaround short of dropping the menu leaf (which the spec task checklist mandates).**

**(E) The `my_account` TRIPWIRE comment at `connection.ts:664-672` becomes FALSE on landing.** Exact precedent exists: `connection.test.ts:1373-1405` is a RAW-source tooth that reds if the `player_wallet` "produces no client subscription" comment survives the slice that subscribed it. The tester should add the mirror-image assertion for the `my_account` tripwire text rather than leave comment-rot in the file a reviewer reads to audit privacy.

---

## 1. RIGHT-SIZE VERDICT

**Ship the whole declared slice, as one PR, in two commits.** Splitting into two mergeable PRs fails, and I can name the exact mechanism for each candidate split:

| Candidate split | Why it fails |
|---|---|
| **Pure modules first** (`credentialDecision` + `claimCode` + `oidc` + `wasEverAuthenticated`, no wiring) | Three modules with zero production consumers. The repo has *one* named YAGNI exception for exactly this (`authToken.ts:288-290`, `writeAuthKind` "exercised by tests alone") and it cost a 100-line doc block plus a two-test enforcement family (`authToken.test.ts:1243+`). Three more would need three more. Independently: the supervisor requires G13–G30 green **in this PR**, and G13/G14/G15/G17/G18/G20/G24–G29 all require the wiring. |
| **connection.ts without main.ts** | `Connection.conn` widens to `DbConnection \| undefined` → all 10 `conn.conn.reducers.*` sites are **tsc errors**. Not a style coupling, a compile coupling. |
| **UI (claim/session) without connection.ts** | `claimView` joining `OVERLAY_IDS` is bidirectional with main.ts's probe table and handle table (`main.wiring.test.ts:5175, 5992`) and with the directory scan (`overlayRegistry.test.ts:182`). Dropping `claimView.ts`/`sessionView.ts` on disk without the registry+main.ts edits reds `OR-MANIFEST-COMPLETE` **immediately**. |
| **evals last, separate PR** | Supervisor: G21+G22 must pass in THIS PR. |
| **authToken.ts alone** | Retiring `W-M21B-WRITE-HAZARD-DOCUMENTED` before `connection.ts` calls `writeAuthKind` removes the only live enforcement of a hazard that is still real until the same commit closes it. |

**The one genuinely severable piece** is `ops/auth/**` + `docs/observability-dr-runbook.md` §8 + `docs/adr/0179` pointer: zero code coupling, and G23's enforcement (my proposal below) is a pure doc-scan that ships inside `account-e2e.eval.mjs`. **Recommend commit-level separation, not PR-level:**

- **Commit 1** — client + evals (T1–T15, T17).
- **Commit 2** — `ops/auth/**` + DR runbook §8 + ADR-0179 Amendments pointer (T16).

Both in one PR so G23's doc-scan (which lives in commit 1's eval) is green at merge. This keeps the diff reviewable without breaking any interlock.

**Honest size statement for the orchestrator:** with the five §0.1 items folded in, the true file count is **~14 new + ~19 modified**, of which 4 modified files are pre-existing-tooth surgery (`connection.test.ts`, `authToken.test.ts`, `overlayRegistry.test.ts`, `main.wiring.test.ts`). Budget the test-surgery as first-class work, not as "update the tests."

---

## 2. BUILD-ORDER TASK DAG

Notation: `T# [lane] — files — satisfies — deps`. Lanes A/B are the two implementer agents (N≤2, `docs/routing.md`); tasks in the same phase with different lanes have **zero file overlap**.

### Phase 0 — Spikes (orchestrator, before any test authoring)
**T0** — run §8's spikes S1–S6. Gate: S4/S5 must resolve before T15 is specified in detail.

### Phase 1 — Pure modules (parallel, disjoint)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T1** | A | `client/src/net/credentialDecision.ts` (+`.test.ts`) | AUTH-45/46/47/48/49, **G16**; exports `ConnectCredential`, `RenewalOutcome`, `AUTH_SERVICE_TRANSIENT_THRESHOLD`, `decideConnectCredential` | — |
| **T2** | B | `client/src/net/claimCode.ts` (+`.test.ts`) | AUTH-60, AUTH-58, **G30**(half) | — |
| **T3** | A | `client/src/net/oidc.ts` (+`.test.ts`) | AUTH-39/40/41/42, D11/D12, **G30**(half), totality (G27's precondition) | T1 (imports `RenewalOutcome`) |
| **T4** | B | `client/src/net/authToken.ts` (+`.test.ts`) — add `wasEverAuthenticated`; narrow `readAuthKind`/`writeAuthKind` doc comments; **delete both `W-M21B-WRITE-HAZARD-DOCUMENTED` tests per their own instruction** | AUTH-43/44 (attempt-gating half), §0.1(B) | — |

> **Decision to record (no ADR needed — implementation detail inside D13's stated contract):** `RenewalOutcome` is declared in `credentialDecision.ts` (the pure decision module owns its input alphabet); `oidc.ts` imports the type. This keeps `credentialDecision.ts` importless and makes G16 a zero-mock table test.

### Phase 2 — Store seam (single lane; the two files ping-pong a type)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T5** | A | `client/src/net/rowConvert.ts` (+`.test.ts`) — `SdkAccountRow`/`accountRowToStore`, modelled byte-for-byte on `playerWalletRowToStore` (`rowConvert.ts:537-574`): explicit field mapping, no spread, no coercion, no defaulting | AUTH-50 (ingest half) | — |
| **T6** | A | `client/src/net/store.ts` (+`.test.ts`) — `#ownAccount`, `upsertAccount`, `ownAccount(identity)` (own-identity filter, mirroring `ownWallet` at `store.ts:1050-1053`), cleared in `reset()` (`store.ts:713` is the sibling line) | AUTH-51, **G29**(store half) | T5 |

*(Lane B in Phase 2 runs **T16** — ops/auth + DR runbook — which is fully disjoint.)*

### Phase 3 — connection.ts (CRITICAL PATH, single lane, no parallel partner)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T7** | A | `client/src/net/connection.ts` + `client/src/net/connection.test.ts` | **G13, G13b(new), G14, G15, G17, G18, G24, G25, G26, G27, G28**; AUTH-43/44/45/46/47/48/49/50/52/53; §0.1(A)(E) | T1–T6 |

T7's ordered sub-steps (the implementer must do them in this order or the file will not typecheck between steps):
1. Widen `Connection` interface: `readonly conn: DbConnection \| undefined`, `live(): DbConnection \| undefined`, `continueAnonymously(): void`, `sessionState(): SessionState`.
2. Extend `ConnectionOptions` with `onSessionExpired?`, `onAuthServiceUnreachable?`, `onSignInFailed?(reason)`, `onClaimPending?(code)`, `onClaimAwaitingAccount?`, `onClaimResult?(result)`.
3. connect()-scope declarations `isReturnLegAttempt` / `consecutiveTransientErrors` / `forcedAnon` — **declare and reassign in the same edit** (the format hook will `const`-ify a `let` whose reassignment has not landed yet; see anti-patterns).
4. `build(credential: ConnectCredential): DbConnection | undefined` — move the `buildGen` bump out, delete `buildKind`, re-pin `.withToken(...)`, add `writeAuthKind` gate, add `'SELECT * FROM my_account'` to the subscribe array, add `my_account` `onInsert`+`onUpdate` (deliberately no `onDelete` — carry the tripwire comment, per D15), extract `attemptJoin`, rewrite `.onApplied` with the claim veto.
5. `resolveCredential()` / `attemptBuild()` / `continueAnonymously()`.
6. **Declare `let current: DbConnection | undefined;` immediately after `build()`'s closing brace and before `attemptBuild`** — see §6's W-DEVLOG-WRAP anchor note.
7. Cold start `void attemptBuild();`; `scheduleRebuild()`'s timer body → `void attemptBuild();`.
8. Rewrite the `my_account` TRIPWIRE comment (`:664-672`) — it is now false.

### Phase 4 — UI (two lanes, then two serial tasks)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T8** | A | `client/src/ui/sessionModel.ts` (+`.test.ts`), `client/src/ui/sessionView.ts` | AUTH-46/47/49/56/59; D17 (registry-external) | T7 |
| **T9** | B | `client/src/ui/claimModel.ts` (+`.test.ts`), `client/src/ui/claimView.ts` | AUTH-48/52/54/55/56/59/60; D16 4-way taxonomy; first-run nudge | T2, T7 |
| **T10** | A | `client/src/ui/overlayRegistry.ts` + `.test.ts` | **G19** + §0.1(C) arithmetic | T8, T9 (files must exist on disk) |
| **T11** | B | `client/src/ui/menuModel.ts`(+test), `client/src/ui/helpModel.ts`(+test), **`docs/PLAYTEST.md`** | `'account'` leaf, `KeyC`; §0.1(D) | T10 |

> ⚠ **T8/T9/T10 must land in ONE commit.** The instant `claimView.ts`/`sessionView.ts` exist on disk, `OR-MANIFEST-COMPLETE` (`overlayRegistry.test.ts:177-182`) is red until the registry and its expectation arithmetic change.

### Phase 5 — main.ts (single lane, serial)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T12** | A | `client/src/main.ts` + `client/src/main.wiring.test.ts` | **G20, G26**(consumer side), **G29**(UI side); the 10-site `live()` refactor; `KeyC`; probe/handle table +1 (§0.1(C)) | T7–T11 |

### Phase 6 — config + evals (two lanes)
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T13** | A | `client/vite.config.ts` + `evals/dom-shell-coverage-exclusion.eval.mjs` (**lockstep — either alone reds**) | shell coverage exclusion for `claimView.ts`/`sessionView.ts` | T8, T9 |
| **T14** | A | `evals/client-no-pii-logs.eval.mjs` (new) | **G21**, AUTH-57 | T3, T7 |
| **T15** | B | `evals/account-e2e.eval.mjs` (new) | **G22, G23** | T0 spikes; G23 half depends on T16 |

### Phase 7 — ops + docs
| Task | Lane | Files | Satisfies | Deps |
|---|---|---|---|---|
| **T16** | B (runs during Phase 2–4) | `ops/auth/docker-compose.yml`, `ops/auth/.env.example`, `ops/auth/README.md`, `docs/observability-dr-runbook.md` | D18 invariant doc, D20 DR/custody, OQ5 dev/QA-only note; G23's target text | — |
| **T17** | A | `server-module/src/accounts.rs` (**comment only** — a D18 sequencing-gate pointer above `:48`), `docs/adr/0179-…md` Amendments body entry, `ARCHITECTURE.md`, `just knowledge` / `just adr-digest` regen check | HARD-SCOPE item 1 | after all code |

### Parallelization summary (N≤2, no file overlap at any point)
```
P0  T0                              (orchestrator)
P1  A: T1 → T3            | B: T2, T4
P2  A: T5 → T6            | B: T16
P3  A: T7                 | B: (idle / T15 scaffolding+pure fns)
P4  A: T8 → T10           | B: T9  ── join, then B: T11
P5  A: T12                | B: T15 (live phase)
P6  A: T13, T14           | B: —
P7  A: T17
```

---

## 3. G-GATE ENFORCEMENT MAP (G13–G30)

Every row: **where the tooth lives → what it asserts → the BAD fixture that must red it**.

| G | Home | Assertion | BAD-fixture / proof-of-teeth mechanism |
|---|---|---|---|
| **G13** | `connection.test.ts` — `W-NH4-TOKEN-SUPPLIED` (3 `expectUniqueAnchor` sites re-pinned to `function build(credential: ConnectCredential): DbConnection \| undefined {`) | `squashedBody.includes(".withToken(credential.kind === 'account' ? credential.token : auth.tokenForNextAttempt())")` **and** file-wide `.withToken(` count `=== 1` | Mutate to `credential.kind !== 'anon'` → the exact-contiguous needle reds. Mutate to a second `.withToken(` → the count reds. Both mutations must be **executed and observed RED** by the orchestrator (tester has no Bash). |
| **G13b (NEW — §0.1A)** | `connection.test.ts` — `W-NH4-SAVE-WIRED` re-pin | `M21B_SAVE_GUARDED` → `"if (credential.kind === 'anon') auth.onConnected(token);"`; `.onConnected(` file-wide `=== 1`; identifier `onConnected` `=== 3`; no `else` arm; **all four whole-file storage-reach bans (`sessionStorage`/`localStorage`/`indexedDB`/`document.cookie`) carried forward unchanged**; onConnect-region `credential.kind` count re-derived to **3** | Invert to `=== 'account'`; add `else auth.onConnected(String(token));`; add a bare `globalThis.sessionStorage.setItem(...)` in onConnect. Each must red. Re-pin justification written in the file, per `connection.test.ts:595-646`'s own convention. |
| **G14** | **Split across two files** (the ADR puts it in `connection.test.ts`, which can only read `connection.ts`) | (i) `connection.test.ts`: `countOccurrences(wholeSquashed,'readAuthKind') === 0` and `countOccurrences(wholeSquashed,'wasEverAuthenticated(') === 1`, and the `.withToken(` argument region contains **no** `wasEverAuthenticated`/`readAuthKind`/`AuthKind` token (the write-guard traces only to `credential`). (ii) `authToken.test.ts`: `readAuthKind(` occurs at exactly one call site **inside `wasEverAuthenticated`'s body region**. | BAD (i): `.withToken(readAuthKind(...) === 'account' ? … )` → reds on both the count and the argument-region scan. BAD (ii): a second `readAuthKind(` call in `authToken.ts` outside `wasEverAuthenticated` → reds. Retire `W-M21B-KIND-READ` wholesale. |
| **G15** | `connection.test.ts` — `W-DEVLOG-WRAP` | End anchor re-pinned from `'let current = build();'` to **`'let current: DbConnection \| undefined;'`** (unique). Region `wireTables(conn);` → that anchor must contain `return wrapReducerLogging(conn`. Both joinGame assertions unchanged. | BAD: `return conn;` → reds. BAD: wrap before `wireTables` → reds (region-bounded). ⚠ **Do NOT re-pin to `void attemptBuild();`** as the ADR text suggests — that literal occurs **3×** (timer body, cold start, `continueAnonymously`) and would break `expectUniqueAnchor`. |
| **G16** | `credentialDecision.test.ts` — real behaviour, not source-scan | Full `outcome × everAuthenticated × consecutiveTransientErrors` table, exhaustive over the 4 outcomes × 2 booleans × {0,1,2,3}; explicit `AUTH_SERVICE_TRANSIENT_THRESHOLD` boundary pair (`=1 → 'retry'`, `=2 → 'auth-service-unreachable'`); `sign-in-failed` iff `!everAuthenticated`. Plus a **`fast-check` property**: for every `(outcome, ever, n, tok)`, the result kind is in the 6-member union and `kind==='account' ⇒ typeof token === 'string'` (totality + no undefined-token leak). | BAD: threshold `>` vs `>=` off-by-one → the boundary pair reds. BAD: return `'session-expired'` for `everAuthenticated===false` → the split reds. BAD: return `undefined` on an unhandled outcome → the property reds. |
| **G17** | `connection.test.ts` — `W-M21B2-ANON-NO-NETWORK` | `oidc.renewOrExchange(` occurs exactly once file-wide, and its index is **after** `const attemptGateOpen =` and **after** `if (!attemptGateOpen) {`'s early-return block; `if (forcedAnon) return` appears **before** both, as the first statement of `resolveCredential`'s body region | BAD: hoist the call above the gate → index ordering reds. BAD: delete the `forcedAnon` short-circuit → the "before" assertion reds. Anti-vacuity: assert the region resolved by requiring `wasEverAuthenticated(` inside it. |
| **G18** | `connection.test.ts` — join-gate + reissue, region-bounded to `.onApplied(() => {` → `.onError((ctx)` | (a) `const shouldJoin = credential.kind !== 'account' \|\| !codeUnconsumed;` contiguous, `=== 1`; `claimCode.hasUnconsumed(` occurs **inside the onApplied region** (fresh per applied), not at connect()/build() scope; `ownAccount(` does **not** appear in the `shouldJoin` expression's own line. (b) The `else if (store.ownAccount(identity) !== undefined)` arm contains a contiguous `.reducers.completeGuestClaim({ code })` **and** `opts.onClaimPending?.(`; the reducer call is **not** conditional on `onClaimPending`. | BAD (a): `\|\| store.ownAccount(identity) === undefined` appended to `shouldJoin` → the contiguous pin reds. BAD (a'): hoist `hasUnconsumed` to connect() scope (cache across onApplied) → region-membership reds. BAD (b): delete the reducer call, keep `onClaimPending?.(code)` → the `completeGuestClaim` needle reds. |
| **G19** | `overlayRegistry.test.ts` | `scanned.size === OVERLAY_IDS.length + 2`; `scanned.has('errorOverlayView')` **and** `scanned.has('sessionView')` asserted before deletion (anti-vacuity, mirroring `:184-187`); `OVERLAY_IDS.length === 16`; `EXPECTED_GUARD_ONLY` hard-coded literal gains `'claimView'` (12 entries); `OVERLAY_TIERS.claimView === 'GUARD_ONLY'` | BAD: ship `claimView.ts` unregistered → set-difference `missingFromManifest` reds. BAD: add `'sessionView'` to `OverlayId` → `orphanInManifest`/`scanned.size` arithmetic reds. BAD: register `claimView` as `EXCLUSIVE_TOP` → `OR-TIERS-PARTITION`'s hard-coded literals red (`:214-228`). |
| **G20** | `main.wiring.test.ts` — `W-M21B2-SESSION-GATE-FIRST` | In the comment-stripped `m20cScan(readMainTs()).code`: let `S = indexOf('if (conn?.sessionState() !== \'hidden\')')` (or the pinned contiguous session-gate literal). Assert `S >= 0` and `S <` the index of **each** of: `if (menuView?.visible) {`, `if (e.code === 'Escape' && battleView?.visible)` (`main.ts:1210`), and each of the 5 `anyOverlayVisible` fan-out surfaces already pinned at `main.wiring.test.ts:4923-5071` (surfaces 1/2/3/5 are input paths; surface 4 is the pvp batch listener and is exempted **by name with a written reason**). | BAD: move the session gate below `if (menuView?.visible)` → reds. BAD: move it below the battle Escape branch → reds (this is the literal mutant G20 names: a live battle's Escape firing while session is `expired`). Anti-vacuity: assert all five surface anchors still resolve (`>= 0`) before comparing indices, so a renamed surface is a hard red, not a vacuous pass. |
| **G21** | `evals/client-no-pii-logs.eval.mjs` (new) | Pure exported `findTokenLeaks(fileName, src)` + `findUnclassifiedReason(src)`. Scans `client/src/net/oidc.ts`, `credentialDecision.ts`, `connection.ts` using **`stripComments` imported from `evals/dom-shell-coverage-exclusion.eval.mjs`** (already exported at `:88`, quote-aware, escape-aware — checker-import-reuse precedent, ADR-0121). For each sink (`console.`, `opts.onError(`, `opts.onSend(`, `telemetry.`, `opts.onSignInFailed(`) extract the **balanced-paren** argument text and assert it contains none of `token`, `accessToken`, `access_token`, `refreshToken`, `refresh_token`, `idToken`, `id_token`, `codeVerifier`, `code_verifier`, `jwt`, `credential.token`. Separately: every `opts.onSignInFailed(` argument must begin with `'` (a static literal) **or** contain `classifySignInReason(`. | Inline BAD fixtures the checker MUST flag: `console.warn('renew failed', token);`, `opts.onError('auth', \`renew ${refreshToken} failed\`);`, `opts.onSignInFailed(rawProviderErrorText);`. Inline GOOD fixture it must pass: `opts.onSignInFailed(classifySignInReason(err));` + `console.warn('renew failed');`. **Anti-vacuity:** assert ≥1 sink call is found in each real scanned file, else fail loud — a file that lost all sinks would otherwise pass empty. |
| **G22** | `evals/account-e2e.eval.mjs` (new) | See §4 in full. | See §4.6. |
| **G23** | **`evals/account-e2e.eval.mjs`, phase 1 — an unconditional structural doc-scan** (my proposal; precedent = `ciWiresE2eGate`, `evals/e2e-desync-teeth.eval.mjs:34-39`, and `checkRunbookHasRunnableSteps`, `ops/observability/checks/stack-config-checks.mjs:1065-1095`) | Pure exported `checkDrRunbookBetterAuthSection(text) -> {ok, reason}` requiring, **in fenced code blocks with `#`-comment lines stripped** (the existing helper's discipline): (1) a `restic` command carrying `--tag better-auth`; (2) a runnable command that mints a JWT for a known `sub` from the restored instance; (3) prose containing all of `BLAKE3`, `Identity`, and `from_claims` **inside the Better-Auth section**, so the drill proves identity equality and not mere file presence; (4) a signing-key-custody line item appearing **before** the first `restic` line in that section (D20's "first line item" mandate); (5) `8443`-style port addition present in §7's `ss -tlnp` grep line. | BAD fixtures inline: a runbook section with `restic --tag monster-realm` only (no `better-auth` tag) → flagged; a section whose restore steps mount the file but never mint a JWT → flagged; a section where the custody line sits *after* the backup command → flagged; a section with `BLAKE3` in prose but outside the Better-Auth section boundary → flagged. GOOD fixture: the real `docs/observability-dr-runbook.md` after T16. **Runs unconditionally, before the CLI probe, so a note-skipped live phase never skips G23.** |
| **G24** | `connection.test.ts` — `W-M21B2-RETRY-CLIMBS-LADDER` | In `attemptBuild`'s body region (`async function attemptBuild(): Promise<void> {` → `function continueAnonymously(): void {`): the contiguous `if (credential.kind === 'retry') {` block contains `state = onAttemptFailed(state);` **and** `scheduleRebuild();` **and** `return;`, and its index is **before** the first `build(` reference in that region | BAD: delete the `return;` → the fall-through-to-`build(` ordering reds. BAD: delete the branch entirely → the contiguous needle reds. |
| **G25** | `connection.test.ts` — `W-M21B2-FORCED-ANON-STICKY` + scope | (a) `if (forcedAnon) return { kind: 'anon', token: auth.tokenForNextAttempt() };` contiguous, `=== 1`, and its index is **before** `wasEverAuthenticated(` and before `oidc.renewOrExchange(`. `forcedAnon = false` occurs **zero** times after its declaration (identifier count: declaration + the guard read + the `continueAnonymously` assignment = exactly 3). (b) All three of `let isReturnLegAttempt`, `let consecutiveTransientErrors`, `let forcedAnon` appear **before** `function build(` — the identical ordering assertion `W-NH4-GATE-CONSTRUCTED` already makes at `connection.test.ts:270-277` — and **none** appears inside the `build(`→`wireTables(conn);` or `attemptBuild`→`continueAnonymously` body regions. | BAD (a): remove the `forcedAnon` guard → ordering reds. BAD (a'): add `forcedAnon = false;` in `resolveCredential` → identifier count reds. BAD (b): move any of the three inside `build()`/`attemptBuild()` → region-membership reds (this is the exact mutant `W-NH4-GATE-CONSTRUCTED` was written for). |
| **G26** | **Split — see the residual note below.** `connection.test.ts` (structure) + `client/src/prediction/reconnectPolicy.test.ts` (behaviour, sibling test file) | connection.test.ts: `live(): … => current` body is exactly `return current;` (no second source of truth); `current =` assignment sites counted exactly — `current = build(` `=== 1`, `current = undefined;` `=== 2` (session-expired + auth-service-unreachable), declaration `=== 1`, total identifier occurrences pinned with a written breakdown; `state = onConnected(state)` occurs `=== 1` and **inside the `.onApplied` region** (i.e. only reachable when `current !== undefined`); `linkFrozen: () => linkFrozen(state)` unchanged, `=== 1`. reconnectPolicy.test.ts: `fast-check` property that `linkFrozen(onConnected(s)) === false` and `linkFrozen(onAttemptFailed(s)) === true` and `linkFrozen(onDisconnected(s)) === true` for arbitrary `s`. | BAD: add a second `current = build(...)` outside `attemptBuild` → count reds. BAD: `state = onConnected(state)` moved out of `.onApplied` → region reds (this is the only way `linkFrozen()===false` can be reached with `current===undefined`). **NAMED RESIDUAL:** G26 as the ADR words it ("exercised across five enumerated states") is **not achievable** — `connection.ts` cannot be imported under vitest (DOM/SDK side effects; it is coverage-excluded for exactly this reason, `vite.config.ts:98`). The decomposition above is the strongest mechanical form available inside touches; state it as a residual in the tooth's own comment rather than claiming behavioural coverage. |
| **G27** | `connection.test.ts` — `W-M21B2-RESOLVE-THROW-SAFE` | The contiguous `credential = await resolveCredential();` sits inside a `try {` whose matching `catch` block (balanced-brace scan) contains **all three** of `state = onAttemptFailed(state);`, `scheduleRebuild();`, and the stale re-check `if (gen !== buildGen \|\| teardown) return;`. Separately: `await` occurs in `attemptBuild` exactly once (no second unguarded await). Plus **`oidc.test.ts` behaviour half**: `renewOrExchange()` with an injected `fetch` that throws, an injected `crypto.subtle.digest` that throws, and a `fetch` returning malformed JSON — all three must resolve to `'transient-error'` and **never reject**. | BAD (scan): delete the try/catch → reds. BAD (behaviour): let `oidc.renewOrExchange` propagate → the `.not.toReject()` assertions red. This is the C1 CRITICAL. |
| **G28** | `connection.test.ts` — mirrors `my_wallet`'s gate **byte-for-byte** (`:1297-1335`) | `expectUniqueAnchor(src, '.subscribe([')`; `arrayBody = bodyRegion(src, '.subscribe([', ']);')`; anti-vacuity `countOccurrences(arrayBody, "'SELECT * FROM my_conversation'") === 1`; then `countOccurrences(arrayBody, "'SELECT * FROM my_account'") === 1`. Plus the ingest pins: `conn.db.my_account.onInsert` `=== 1`, `.onUpdate` `=== 1`, `.onDelete` `=== 0`. Plus §0.1(E): the RAW source must no longer contain the `DELIBERATELY ABSENT` tripwire text (mirrors `:1373-1405`). | BAD: park the string in a module-level const → the array-window bound reds. BAD: subscribe twice → `=== 1` reds. BAD: wire `onDelete` → `=== 0` reds (D15: an onDelete is the stale half of an update pair and would wipe the account slot). |
| **G29** | `store.test.ts` (behaviour) + `main.wiring.test.ts` (whole-file negative) | store.test.ts: `ownAccount(identity)` returns `undefined` for a foreign identity even when the slot is populated (mirrors `ownWallet`'s own-identity filter). main.wiring.test.ts: in the comment-stripped `main.ts`, `readAuthKind` / `AuthKind` / `credential.kind` occur **zero** times, and every "signed-in"/claim-eligible predicate traces to `store.ownAccount(` — assert `countOccurrences(code,'store.ownAccount(') >= 1` (anti-vacuity) and the three forbidden identifiers `=== 0`. | BAD: a `main.ts` predicate `if (conn?.credentialKind() === 'account')` → the identifier ban reds. BAD: `readAuthKind(globalThis, …) === 'account'` in a UI branch → reds. |
| **G30** | `oidc.test.ts` + `claimCode.test.ts` (each file scans its own module's source) | In each of `oidc.ts` and `claimCode.ts`: `countOccurrences(stripped, 'localStorage') === 0`, `'indexedDB' === 0`, `'document.cookie' === 0`, and `'globalThis' === 0` (the host is a **parameter**, never reached for). `sessionStorage` may appear only as the injected-host property access (`host?.sessionStorage`) — pin `countOccurrences(stripped,'host?.sessionStorage')` equal to the total `sessionStorage` count. Plus behaviour: every storage path exercised with a *throwing* host and a *blocked* host, asserting no throw escapes (the `authToken.ts` `storageMethod` idiom, `:106-120`). | BAD: `localStorage.setItem(...)` in either file → reds. BAD: `globalThis.sessionStorage.getItem(...)` inside the module → the `globalThis === 0` pin reds. |

---

## 4. G22 — `evals/account-e2e.eval.mjs` ARCHITECTURE

Self-contained by construction (`ci.yml` and `client/e2e/**` are outside touches; the `ci` job does **not** start a SpacetimeDB instance).

### 4.1 Three phases, only the third is conditional

```
PHASE 0 (always)  proof-of-teeth on every exported pure fn (BAD + GOOD fixtures inline)
PHASE 1 (always)  G23 structural doc-scan of docs/observability-dr-runbook.md — fail-loud
PHASE 2           live flow:
                    hasCli                    → RUN, fail-loud on any step
                    !hasCli && CI             → FAIL LOUD ("CLI install step regressed")
                    !hasCli && !CI            → note-skip, pass:true
```
Predicates `shouldRunLive({ci,hasCli})` and `shouldFailLoudNoCli({ci,hasCli})` are exported and get the **exact B/B2/B3 teeth pattern** of `evals/bindings-drift.eval.mjs:73-103` (three inline assertions proving the predicate's own truth table before it is trusted).

### 4.2 Port strategy
Reserve **both** ports up front: `const s = net.createServer(); s.listen(0,'127.0.0.1'); const p = s.address().port; await close(s);` → use `p`. Do it twice (`P_ISSUER`, `P_STDB`). Never 3000 (the `e2e` job's port), never 5290 (vite). Record both in the eval's `detail` string so a CI flake is diagnosable. If either port is re-taken between reserve and bind, fail loud with the port number — never silently retry.

### 4.3 Issuer stub (zero new deps)
`node:http` server on `127.0.0.1:P_ISSUER`, keys from `node:crypto`'s `webcrypto.subtle`:
```
generateKey({name:'ECDSA', namedCurve:'P-256'}, true, ['sign','verify'])
```
- `GET /.well-known/openid-configuration` → `{ issuer, jwks_uri, authorization_endpoint, token_endpoint, id_token_signing_alg_values_supported:['ES256'] }`
- `GET /jwks` → `{keys:[<exported public JWK + kid + alg:'ES256' + use:'sig'>]}`
- JWT minting: hand-rolled `base64url(header).base64url(payload).base64url(sig)`; `subtle.sign({name:'ECDSA',hash:'SHA-256'}, priv, bytes)` returns **raw r‖s**, which is exactly ES256's wire format — no DER conversion, no dependency.
- A **second, distinct key pair + second issuer path** exists solely to mint the negative-control token (§4.6).
- ⚠ Build every URL from parts (`'http:/' + '/127.0.0.1:' + port`), mirroring `accounts.rs:48`'s own `concat!()` idiom. Semgrep `--config auto` matches scheme literals **including inside comments** (memory: semgrep-remote-only-comment-matching), and it is remote-only so `just ci` cannot catch it. **No scheme literal may appear in any comment in this file.**

### 4.4 Patched module publish (committed `accounts.rs` untouched)
1. `mkdtempSync(path.join(os.tmpdir(),'mr-acct-e2e-'))`.
2. Copy the workspace root `Cargo.toml` + `Cargo.lock` + **every directory named in `[workspace] members`** (excluding `target/`) into the temp dir, preserving the relative layout. This is the low-risk choice: it needs **zero** `Cargo.toml` surgery and every `path = "../game-core"` still resolves. (Spike S4 measures the copy cost; source-only is a few MB.)
3. Patch `<tmp>/server-module/src/accounts.rs` with the exported pure `patchAllowedIssuers(src, issuerUrl)` / `patchAllowedAudience(src, clientId)`: a **literal `String.replace` of the exact committed token** `concat!("https:/", "/auth.monster-realm.invalid/")` with `concat!("http:/", "/127.0.0.1:<P>/")` — **preserving `concat!()`**, so the patched file stays safe for any source-scan eval that happens to see it, and so the patcher's own shape mirrors the deployment-time edit. Both functions **throw** if the expected token is absent (a silent no-op patch would make the live flow test nothing).
4. `CARGO_TARGET_DIR=<repoRoot>/target` so the CI job's already-warm dependency graph is reused.
5. `spacetime start --in-memory --listen-addr 127.0.0.1:<P_STDB>` as a detached child (`spawn`, `detached:false`, piped stdio captured into a ring buffer for the failure `detail`). Readiness: poll `GET http://127.0.0.1:<P_STDB>/v1/ping` (or `spacetime server ping <url>` — **positional, never `-s`**, per memory: spacetime-cli-arg-forms), bounded 60 s, 250 ms interval, fail loud on timeout with the captured stderr tail.
6. `spacetime publish --project-path <tmp>/server-module --server http://127.0.0.1:<P_STDB> mr-acct-e2e`.

### 4.5 SDK driver child process
A driver script written to `<tmp>/driver.mjs`, run as `node <tmp>/driver.mjs` with **`cwd = <repoRoot>/client`** so `spacetimedb` resolves from `client/node_modules` and the relative import of `client/src/module_bindings/index.ts` works under node 24's native type-stripping. Driver ↔ eval protocol: **NDJSON on stdout**, one `{step, ok, data}` per milestone; the eval parses and asserts each. Exit non-zero on any driver-side failure, with the reason on stderr.

Driver milestones:
1. **A-connect** — `.withToken(jwt(sub='alice', iss=stub, aud=clientId))` → `onConnect` → emit identity `A`.
2. **A-applied** — subscription incl. `SELECT * FROM my_account` applied; emit `my_account` row count and `auth_issuer`. **Assert: exactly 1 row, `auth_issuer === stubIssuer`** → *account provisioned*.
3. **B-connect** — a second `DbConnection`, **no token** (anonymous) → emit identity `B` (must differ from `A`).
4. **B-join** — `joinGame({name:'guest-e2e'})` → Ok.
5. **B-claim** — mint a client-side 64-lowercase-hex code (`crypto.getRandomValues`, the AUTH-60 shape) → `startGuestClaim({code})` → Ok.
6. **A-complete** — `completeGuestClaim({code})` on connection A → Ok.
7. Teardown both connections.

### 4.6 Re-key verification + PROOF OF TEETH (how we know it bites)
Server truth via `spacetime sql mr-acct-e2e "<query>"` from the eval (SQL-based server-truth e2e is the established idiom — ADR-0121):
- `SELECT * FROM account` → exactly one row, `claimed_from` = identity `B`, `claimed_at_ms` non-null.
- `SELECT * FROM player WHERE identity = <A>` → the guest's `name` moved.
- `SELECT * FROM guest_claim` → **zero rows** (AUTH-34 single-use consumption).

**Four negative assertions inside the same run — this is what makes G22 bite rather than merely pass:**
| N | Injected condition | Required outcome |
|---|---|---|
| **N1** | Connect C with a JWT minted by the **second key pair under a different `iss`** (`http://127.0.0.1:P/other`) | Connection succeeds *anonymously*; `SELECT COUNT(*) FROM account` is **unchanged**; C's identity has **no** `my_account` row. If it provisions, the flow's issuer allowlist is inert and the whole positive result is meaningless. |
| **N2** | `completeGuestClaim({code: 'x'.repeat(64)})` (well-formed but never-existed) | `Err` with exactly `ERR_INVALID_CODE`'s value (`"invalid or already-used code"`, `accounts.rs:61`). |
| **N3** | Replay `completeGuestClaim({code})` with the **now-consumed** code | Same `Err` string as N2, indistinguishable (AUTH-35 no-oracle). |
| **N4** | `patchAllowedIssuers` invoked on a source that lacks the expected token | **Throws** — proving the patcher cannot silently no-op and publish an unpatched module that would make N1's "no account" result vacuously true. |

N1 and N4 together are the anti-vacuity spine: N4 proves the patch happened, N1 proves the patched allowlist is doing work.

### 4.7 Teardown
A single `finally`: SIGTERM the spacetime child → 5 s grace → SIGKILL; `server.close()` on the stub + `unref()`; `rmSync(tmp, {recursive:true, force:true})`. Every step wrapped so a teardown failure cannot mask a real result. The eval's `detail` always names both ports and the temp dir.

### 4.8 Semgrep / gitleaks safety
- Literal regexes only; `String.indexOf` / `.split` / `.includes` for all matching. **No `new RegExp(<dynamic>)`** (`detect-non-literal-regexp`).
- Any fake secret in a fixture uses the `INTERNAL_SECRET_` prefix (`.gitleaks.toml:24`).
- No scheme literal in any comment.

---

## 5. OPS/AUTH FILE PLAN

**Recommendation: option (a) — compose runs the stock `node:24-alpine` image with a pinned bootstrap command, and the app directory is bind-mounted from a deployment-time-created path documented in the README.** No fourth file.

Rationale: Better Auth is a TS library with no official server image, so *something* must supply the app entrypoint. The three options and why (a) wins:

| Option | Verdict |
|---|---|
| **(a) `node:24-alpine` + pinned `npm i better-auth@X @better-auth/oauth-provider@Y better-sqlite3@Z` at start, `command:` running a bind-mounted `./app/auth.mjs`, with the README specifying `auth.mjs` verbatim in a fenced block** | **CHOSEN.** Zero touches-delta. The compose file is complete and reviewable; the one deployment-time artifact (`./app/`) is `.gitignore`-adjacent and its content is fully specified in the README as copy-pasteable text. Matches the repo's existing `ops/observability/` posture (compose + README + config, all reviewable, no committed runtime). |
| (b) Document the app dir as deployment-time-created with no content spec | Rejected — an operator cannot reproduce the deployment from the repo, and G23's DR drill can't be run against an unspecified instance. |
| (c) Add `ops/auth/server.mjs` | Rejected — a **touches-delta** for a file that would be unreachable by any gate (it is neither client TS nor Rust, and no eval scans `ops/auth/*.mjs`). Committing unexecuted, ungated runtime code is exactly the YAGNI shape `standards/principles.md` forbids. If the orchestrator's supervisor prefers a committed entrypoint, this is the one delta worth asking for — but (a) needs no ask. |

### `ops/auth/docker-compose.yml`
- One service, `better-auth`, `image: node:24-alpine` **digest-pinned** (`node:24-alpine@sha256:…`) — matching `evals/observability-stack-config.eval.mjs`'s `ALLOWED_IMAGE_REPOS` pinning discipline, though that eval does not scan this file.
- `ports: - "127.0.0.1:8443:8443"` — **loopback-bound**, the same posture §7 of the runbook enforces. Never `0.0.0.0`.
- All secrets via `env_file: .env` + `${VAR}` indirection. ⚠ `just security` (`scripts/check-secrets.mjs:28`) flags `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` — so **never** write `secret: "…"` in this file; `BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}` is unquoted indirection and passes.
- Named volume for the SQLite file + an explicit mount path the README's restic invocation references by the same literal.

### `ops/auth/.env.example`
- Placeholders only, gitleaks-safe: `BETTER_AUTH_SECRET=INTERNAL_SECRET_REPLACE_ME`, `BETTER_AUTH_URL=<https-origin-of-the-dedicated-subdomain>`, `OAUTH_CLIENT_ID=<client_id-from-adminCreateOAuthClient>`, `DATABASE_PATH=/data/auth.sqlite`, `JWKS_PRIVATE_KEY_PATH=/run/secrets/jwks.key`. `check-secrets.mjs:47` skips `.env.*` entirely, so gitleaks (remote-only) is the real gate — hence the `INTERNAL_SECRET_` prefix on every value that looks credential-shaped.

### `ops/auth/README.md` — required content
1. **Deployment sequence (D18):** stand up Better Auth → `auth.api.adminCreateOAuthClient({token_endpoint_auth_method:'none'})` **server-side only** → the returned `client_id` becomes `ALLOWED_AUDIENCE` → the issuer URL becomes `ALLOWED_ISSUERS`, **preserving `concat!()`**.
2. **The permanent single-client invariant:** `ALLOWED_AUDIENCE` holds exactly one entry — monster-realm's own `client_id` — and is never widened to a list (CRITICAL-2 / D18).
3. **The HARD SEQUENCING GATE, stated verbatim:** the `accounts.rs` value flip + `audience_allowed` exact-equality tightening + the live restore drill are **hard-gated on `13r-c-2` landing** and are explicitly out of this slice.
4. **OQ5 — MANDATORY, called out as its own heading:** *native email+password ships **dev/QA-only** and is **not a public entry point** for the player population.* Include the config note for `sub` opacity.
5. **DR posture (D20), pointing at the runbook:** signing-key custody is the **first** line item (confirm whether the `jwt` plugin's JWKS private key lives in config or in the shared SQLite DB — check Better Auth's own docs at implementation time, assume neither); if in the DB, exclude that table/file from the nightly `restic` sweep and hold the key in a separate narrowly-scoped secret store; if exclusion is infeasible, the documented **mandatory rotation-on-suspected-exposure procedure** is the compensating control. OQ6: the backup destination is a second machine Drew owns — which makes exclusion **more** load-bearing, not less.
6. `restic --tag better-auth`, nightly, 14d/8w/6m.
7. The new loopback port, so §7's `ss -tlnp` grep line can be extended.

### `docs/observability-dr-runbook.md` — new §8 "Better Auth (accounts)"
Extends, does not replace. Must satisfy **both** the pre-existing `checkRunbookHasRunnableSteps` (`ops/observability/checks/stack-config-checks.mjs:1065`) **and** the new G23 scan:
- Fenced, runnable `restic backup --tag better-auth …` using `.backup` / `VACUUM INTO` for the online snapshot (no stop-the-world).
- Signing-key custody as the section's **first** line item (G23 checks the ordering).
- A restore drill that **mints a fresh JWT from the restored instance for a known `sub` and confirms SpacetimeDB accepts it and derives the same `Identity`** — the section must name `Identity`, `from_claims`, and `BLAKE3` (G23 clause 3). Flag in the prose that the `BLAKE3(iss|sub)` construction is cited against the vendored `spacetimedb-lib-1.12.0` source at high confidence and was not byte-verified by any review pass (ADR-0182's own residual — carry it, don't launder it).
- Extend §7's `ss -tlnp | grep -E '3000|…'` with the Better Auth port.
- ⚠ `checkNoQuotedCredential` (`stack-config-checks.mjs:1035`) **already scans this file** (`observability-stack-config.eval.mjs:1599`). Use `${VAR}` / `<PLACEHOLDER>` indirection only — an unquoted `PASSWORD=hunter2` reds C17.

---

## 6. TEST INVENTORY (for the tester agent)

`RED@HEAD` = fails against `8814416` today, for the stated reason. `GREEN@HEAD` = regression guard, stated plainly per this repo's convention.

### New test files
| File | Pins | RED@HEAD reason |
|---|---|---|
| `credentialDecision.test.ts` | G16: full 4×2×4 branch table; threshold boundary pair; `sign-in-failed`↔`session-expired` split; **fast-check property** (result kind ∈ union; `account ⇒ token is string`) | Module does not exist — resolution failure |
| `claimCode.test.ts` | AUTH-60 (exactly 32 bytes → 64 lowercase hex, matching `is_valid_claim_code`, `accounts.rs:80-82`); `mint`/`read`/`hasUnconsumed`/`clear` over `mr.claimCode.v1\|<uri>\|<db>`; per-segment `encodeURIComponent` injectivity (the `authToken.ts:100-102` idiom); first-run-nudge boolean lives in the **same namespace, no new key**; throwing/blocked/quota host degrades silently; **G30** no-localStorage/no-`globalThis` scan | Module does not exist |
| `oidc.test.ts` | AUTH-39 (state 32B + PKCE S256 via injected `crypto.subtle`); AUTH-40 (byte-for-byte state compare; mismatch/absent ⇒ cold start, **no exchange**); AUTH-41 (`history.replaceState` scrub **before** any other work + single-use delete **regardless of outcome**); AUTH-42 (refresh-token persisted **before** the token is used); discovery fetched+cached **once per tab**; **totality** — throwing `fetch`, throwing `subtle.digest`, malformed JSON, non-2xx all → `'transient-error'`, never a rejection (G27's precondition); storage-driven branch selection (verifier present ⇒ exchange; refresh only ⇒ refresh; neither ⇒ `'no-session'`) — **no flag argument**; **G30** scan | Module does not exist |
| `sessionModel.test.ts` | `hidden \| expired \| unreachable` transitions; AUTH-49 decline requires an explicit action; AUTH-56 confirmation step names the irreversible consequence; AUTH-59 no-live-connection feedback | Module does not exist |
| `claimModel.test.ts` | AUTH-54's **4-way reject taxonomy** driven by the 11 exact server strings (`accounts.rs` `ERR_INVALID_CODE` at `:61`; `"code expired"`, `"already has game data"`, `"account already claimed"`, `"cannot claim your own session"`, `"close your other tab, then retry"`, `"already in an ongoing battle"`, `"sign in required"`, `"no account"`, `"account pending deletion"`) → {delete-code-and-permit-join \| retain+destination-terminal \| retain+transient \| retain+not-claim-specific}; AUTH-55 no elapsed-time resumption; `ERR_INVALID_CODE` disambiguated **only** by re-checking `store.ownAccount(identity)?.claimedFrom`; AUTH-48 `sign-in-failed` routes here, **not** to sessionView; first-run nudge shows once per tab | Module does not exist |
| `evals/client-no-pii-logs.eval.mjs` | G21 (§3) | New eval; its BAD fixtures are inline |
| `evals/account-e2e.eval.mjs` | G22 + G23 (§4) | New eval |

### Modified test files — the surgery
| File | Change | RED@HEAD? |
|---|---|---|
| `connection.test.ts` | Re-pin the 3 `expectUniqueAnchor` + 5 bare `indexOf` occurrences of `'function build(): DbConnection {'` (265/269/279/297/300/454/458/479) → `'function build(credential: ConnectCredential): DbConnection \| undefined {'`. Re-pin `W-NH4-TOKEN-SUPPLIED` (G13), `W-NH4-SAVE-WIRED` (G13b), `W-DEVLOG-WRAP` end-anchor (G15). **Retire `W-M21B-KIND-READ` wholesale** and replace with G14(i). Add G17, G18, G24, G25, G26(structural), G27(structural), G28. Carry forward **unmodified**: `W-NH4-GATE-CONSTRUCTED`, `W-NH4-FAILURE-WIRED`, `W-NH4-NO-CLEAR-ON-DROP`, `SDK-DRIFT`, `W-UX2B-*`, `M13_5C_CONVERSATION_INGEST_CONTROL`, and the **`'://' === 0`** fixture at `:1247-1260`. | RED (every re-pinned anchor) |
| `authToken.test.ts` | Add `wasEverAuthenticated` behaviour tests (absent/blocked/throwing host ⇒ `false`; `'account'` ⇒ `true`; both key axes; exact match, no trim/case-fold). Add G14(ii). **Delete both `W-M21B-WRITE-HAZARD-DOCUMENTED` tests** per their own instruction (`:1352-1356`) — and delete the corresponding prohibition block from `authToken.ts`'s `writeAuthKind` doc comment, replacing it with a narrowed comment that names the *new* guard. ⚠ Do not "soften" the clause list; the tooth explicitly forbids that path. | RED once `connection.ts` references `writeAuthKind` |
| `overlayRegistry.test.ts` | G19 + §0.1(C): `scanned.size === OVERLAY_IDS.length + 2`; assert `scanned.has('sessionView')` before deleting it; `OVERLAY_IDS.length` `15 → 16` (two sites, `:223-224`); `EXPECTED_GUARD_ONLY` 11 → 12 literals (`:83-95`) | RED the moment the two `*View.ts` files exist |
| `main.wiring.test.ts` | G20 (session-gate-first); `OVERLAY_IDS.length` `toBe(15) → toBe(16)` at `:5956`; probe-table and handle-table counts follow `OVERLAY_IDS.length` automatically but the **`main.ts` side** needs the two new entries; G29 whole-file negative | RED |
| `menuModel.test.ts` | `MM-KEYGLYPH-FROM-HELP-SSOT` 11-pair table → 12 (`:192`); the `'account'` leaf's `keyGlyph: 'C'` must exist in the `CONTROLS` SSOT | RED |
| `helpModel.test.ts` | The `C` row exists; the exact-key uxd2 assertion (`:145-166`) still shows no `G`/`H` and still shows `T` | RED |
| `playtestControlsDoc.test.ts` | **Unchanged** — it derives from `CONTROLS`. It goes RED automatically until `docs/PLAYTEST.md` gains the `C` row (A1/A3). This is the mechanism that forces §0.1(D). | RED (self-driving) |
| `store.test.ts`, `rowConvert.test.ts` | `upsertAccount`/`ownAccount` own-identity filter; `reset()` clears the slot; `accountRowToStore` explicit-field / no-coercion / no-defaulting contract | RED |
| `reconnectPolicy.test.ts` | G26's behavioural half (property: `linkFrozen ∘ onConnected === false`, `∘ onAttemptFailed === true`, `∘ onDisconnected === true`) | Likely GREEN — state plainly as a regression guard |

### fast-check property candidates (three, all high-value)
1. **G16 totality** — `decideConnectCredential` over the full arbitrary product; result kind ∈ the 6-member union; `kind==='account' ⇒ typeof token === 'string'`; **`kind==='retry'` never returned once `consecutiveTransientErrors >= AUTH_SERVICE_TRANSIENT_THRESHOLD` and `everAuthenticated`**.
2. **claimCode injectivity** — for arbitrary `(uri, db)` pairs, distinct pairs ⇒ distinct storage keys (the `|`-collision argument `authToken.ts:96-99` makes by hand, made mechanical).
3. **G26 link invariant** — arbitrary `ReconnectState`, `linkFrozen` agrees with the transition family.

### Orchestrator-executed proof-of-teeth (tester has no Bash — memory: tester-subagent-has-no-bash)
The orchestrator must **execute and observe RED** at minimum these mutations, then revert:
`.withToken` ternary → `!== 'anon'` (G13) · un-guard `auth.onConnected(token)` (G13b) · hoist `oidc.renewOrExchange` above the gate (G17) · add `|| store.ownAccount(identity) === undefined` to `shouldJoin` (G18) · delete the `completeGuestClaim` call, keep `onClaimPending` (G18b) · `'retry'` falls through to `build(` (G24) · move `forcedAnon` inside `attemptBuild` (G25) · delete the try/catch around `await resolveCredential()` (G27) · duplicate the `my_account` subscribe line (G28) · move the session gate below the battle-Escape branch (G20) · `console.warn('x', token)` in `oidc.ts` (G21) · strip `--tag better-auth` from the runbook (G23) · make `patchAllowedIssuers` a no-op (G22/N4).

---

## 7. ANTI-PATTERNS (named, so a reviewer can grep for them)

1. **Editing a gating test to match the implementation.** The only sanctioned edits are the four re-pins (G13/G13b/G14/G15) and the two deletions (`W-M21B-KIND-READ`, `W-M21B-WRITE-HAZARD-DOCUMENTED`), each with a written justification in the file — the ceremony `connection.test.ts:595-646` already models.
2. **Re-deriving the write-guard from storage (G14).** `readAuthKind(...) === 'account'` must never reach `.withToken(`'s argument or `credential`'s construction. Fail-closed on the permissive value: `=== 'account'`, never `!== 'anon'`.
3. **Caching the claim-code check across `onApplied` (G18).** `claimCode.hasUnconsumed(...)` is read **inside** `onApplied`, fresh per applied snapshot. A connect()-scope or build()-scope read is F2 re-opened.
4. **Consulting `ownAccount` in the veto (G18).** `my_account`'s presence/absence is **never** an OR-branch in `shouldJoin`; it only selects between reissue and the awaiting-account UX arm (AUTH-52).
5. **Putting `sessionView` in `OverlayId` (G19/D17).** `decide()` (`overlayRegistry.ts:140-154`) makes a second `EXCLUSIVE_TOP` behave backwards. `sessionView` stays registry-external and is exempted by name in the manifest scan, exactly as `errorOverlayView` is.
6. **Interpolated tokens in logs (G21).** No template literal or extra argument reaching `console.*`/`opts.onError`/`opts.onSend`/telemetry may name a token variable. `credential.reason` reaches a sink only through a classifier.
7. **`new RegExp(<dynamic>)` anywhere in new evals or tests.** Semgrep `--config auto` (**remote-only**) fires `detect-non-literal-regexp`; `just ci` runs no Semgrep, so this is invisible locally.
8. **A scheme literal in a comment.** Semgrep matches `ws://` in comment text (memory). Independently, `connection.test.ts:1254-1259` asserts `connection.ts` contains **zero** `'://'` — comments included, because `stripLineComments` truncates at the first `//`. Build URLs from parts.
9. **Unpaired `/*` or a bare `"` in a Rust char literal.** Even the comment-only `accounts.rs` edit (T17) must avoid both — the evals' regex-stripper and `movement_tests` helpers misalign on them (memory: server-module-source-scan-gotchas). Use `0x22` constants; no glob-slash-star in comments.
10. **Comment-heavy `main.ts` hunks.** `main.wiring.test.ts`'s collapse teeth punish it. Keep T12's comments lean; put the reasoning in the test file, where it belongs.
11. **`let` without its reassignment in the same edit.** The format hook `const`-ifies a `let` until its reassignment lands (memory: main-wiring-comment-mass-guard). `isReturnLegAttempt` / `consecutiveTransientErrors` / `forcedAnon` / `current` must be declared **and** reassigned in one edit.
12. **Re-pinning `W-DEVLOG-WRAP` to `void attemptBuild();`.** It occurs 3× → `expectUniqueAnchor` breaks. Use `let current: DbConnection | undefined;`.
13. **Adding to `vite.config.ts` without `DOM_SHELLS`, or vice-versa.** `findMissingExclusions` and `findUnsanctionedExclusions` (`dom-shell-coverage-exclusion.eval.mjs:183, 230`) fire in opposite directions; they must land in one commit.
14. **Double-wrapping `wrapReducerLogging`.** `devLog.ts` builds a fresh `Proxy` with no memoization; `connection.test.ts:1122-1127` already reds `wrapReducerLogging(wrapReducerLogging(`. Extract `attemptJoin` once (D16).
15. **Touching `evals/trade-escrow-guards.eval.mjs`, or flipping `ALLOWED_ISSUERS`/`ALLOWED_AUDIENCE`, or tightening `audience_allowed`.** Hard-scope violations. `accounts.rs` gains a comment only.
16. **Adding anything under `client/e2e/**` or `.github/workflows/**`.** Outside touches. G22 is self-contained by design.

---

## 8. VALIDATION SPIKES (orchestrator-run, before test authoring)

Prefix every command with the toolchain PATH export (memory: monster-realm-toolchain-path — default node is v18, cargo is absent).

| # | Question | Command / method | Blocks |
|---|---|---|---|
| **S1** | Does the standalone host accept a **plain-http loopback** issuer, or does it require https? | Start the issuer stub + `spacetime start --in-memory --listen-addr 127.0.0.1:<P>`; publish a module patched to `http://127.0.0.1:<P>/`; connect with a stub-minted ES256 JWT; check the module log for `unrecognized issuer` vs a provisioned `account` row. | **T15 / G22** — if http is rejected, fall back to a self-signed https stub via `node:https` + `NODE_EXTRA_CA_CERTS` for the driver; if the *host* also refuses the CA, G22's live phase must be declared blocked and escalated (do **not** silently note-skip in CI). |
| **S2** | Does `client_connected` fire and provision on WS connect with a JWT? | Same rig; `spacetime sql <db> "SELECT * FROM account"` after the driver's `onConnect`. | T15 |
| **S3** | Node 24 native type-stripping of `client/src/module_bindings/**` | `cd client && node -e "import('./src/module_bindings/index.ts').then(m=>console.log(Object.keys(m).length))"` (node 24.13.1) | T15 driver design |
| **S4** | Workspace-copy publish | `cargo metadata --format-version 1 --no-deps \| jq -r '.workspace_members'` to enumerate members; copy them + `Cargo.toml`/`Cargo.lock` to `mktemp -d`; `CARGO_TARGET_DIR=<repo>/target spacetime publish --project-path <tmp>/server-module --server http://127.0.0.1:<P> mr-spike` — measure copy size and wall-clock | T15 patched-publish |
| **S5** | ES256 JWT acceptance end-to-end | Mint via `node:crypto` webcrypto (raw r‖s), verify SpacetimeDB accepts it. Confirms no DER conversion is needed. | T15 |
| **S6** | Fake sessionStorage host shape under vitest | `cd client && npx vitest run src/net/authToken.test.ts` — read the existing throwing/blocked/quota host fixtures and reuse them verbatim for `oidc.test.ts`/`claimCode.test.ts` (do not invent a parallel family) | T2, T3 |
| **S7** | Baseline green + exact RED inventory | `just ci` at HEAD; then, after each phase, `cd client && npx vitest run <changed files>` and `npx tsc --noEmit` | all |
| **S8** | Comment-mass headroom in `main.ts` | Re-read `main.wiring.test.ts`'s collapse teeth and measure the current stripped/raw ratio before T12 | T12 |

---

## 9. RISK REGISTER

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| **R1** | **SpacetimeDB rejects a plain-http localhost issuer** → G22's whole live phase is unbuildable | Med / High | S1 first. Fallback ladder: self-signed https stub + `NODE_EXTRA_CA_CERTS` → then escalate as blocked. **Never** degrade to a silent skip: `shouldFailLoudNoCli` must still fail in CI. |
| **R2** | **Cargo workspace copy fails to build in the temp dir** | Med / High | S4. Fallback: rewrite `path = "../X"` deps to **absolute** repo paths and append an empty `[workspace]` table to detach the copy. Fallback 2: `spacetime build --project-path` then `publish --bin-path`. |
| **R3** | **The 10-site `live()` refactor regresses a guard** | Med / High | tsc does the heavy lifting (`conn.conn` becomes `DbConnection \| undefined`). Add a `main.wiring.test.ts` count tooth: `conn.conn.` occurs **0** times and `conn?.live()` occurs exactly 10 times, with the breakdown pinned in the message (the file's own self-documenting-count idiom). |
| **R4** | **`docs/PLAYTEST.md` touches-delta is refused** | High / Med | Escalate before T11 starts. If refused, the only in-touches alternative is to drop the `'account'` menu leaf + `KeyC` (a spec task-checklist item) — that is a scope decision, not an implementation one. |
| **R5** | **Semgrep/gitleaks red on a remote-only rule after local green** | Med / Med | Both are remote-only; `just ci` cannot catch them. Pre-flight `~/.local/bin/semgrep --config auto` on the new eval + ops files locally. Force-push is hook-blocked — squash onto a fresh branch if a fix is needed (memory: gitleaks-remote-only-false-positive). |
| **R6** | **Async cold start changes first-paint timing for the anon population** | High / Low | ADR-accepted. `client/e2e` verified clean (§0). The `__game()` readiness polls in every spec absorb the microtask. Named residual, closed. |
| **R7** | **`W-M21B-WRITE-HAZARD-DOCUMENTED` is "softened" instead of deleted** | Med / High | The tooth's own message forbids softening (`authToken.test.ts:1352-1356`). Make deletion an explicit T4 acceptance criterion and have the orchestrator diff-check that neither the clause list nor the revocation list was edited in place. |
| **R8** | **`vitest` fake-storage patterns diverge between the three new modules** | Med / Low | S6 — reuse `authToken.test.ts`'s existing host fixtures verbatim. Do not create a parallel helper family (the exact mistake `connection.test.ts:191-197` records). |
| **R9** | **G26 over-claims behavioural coverage it cannot have** | High / Med | Decomposed in §3 with the residual named in the tooth's own comment. `connection.ts` is coverage-excluded (`vite.config.ts:98`) precisely because it cannot be imported. |
| **R10** | **`account-e2e` port/teardown flake in CI** | Med / Med | Ephemeral-port reservation, bounded readiness polls with captured stderr, SIGTERM→SIGKILL, `finally`-scoped cleanup, and both ports in the `detail` string. The eval runs **serially** in `run.mjs`, so no cross-eval port contention. |
| **R11** | **`spacetime sql` cannot read the private `account` table** | Low / High | The CLI identity is the publisher/owner; ADR-0121's SQL-based server-truth e2e is the precedent. Verify in S2. Fallback: assert re-key through the **public** `monster_pub` / `profile` tables instead, plus `my_account` row counts observed by the driver's own subscription. |
| **R12** | **`ops/auth/README.md` omits the OQ5 dev/QA-only note** | Low / High | It is a hard-scope item (constraint 4). Make it a named acceptance criterion on T16 and have the doc-keeper grep for the literal phrase. |
| **R13** | **The `anon` variant's `token` field is written but never read by `build()`** | High / Low | Real but benign: D13's `.withToken(...)` re-reads `auth.tokenForNextAttempt()` for the anon branch, and G13 pins that exact text. **Do not "fix" it** by making `build()` read `credential.token` for anon — that would change G13's pinned literal. Note it in the implementer's comment; the double read is idempotent. |

---

## 10. BOY SCOUT CANDIDATES

**None.** Two tempting items were evaluated and both are rejected as boy-scout work:

- **`evals/dom-shell-coverage-exclusion.eval.mjs`'s `DOM_SHELLS` list is incomplete** — `leaderboardView.ts`, `renameView.ts`, `tradeProposeView.ts`, `helpView.ts`, `menuView.ts` are real DOM shells that appear in neither `DOM_SHELLS` (`:34-54`) nor `vite.config.ts`'s `coverage.exclude` (`:97-111`). Adding them would change the coverage **denominator** against a ratcheted 96% threshold (`justfile`, ADR-0050 amendment A1). That is a gate-behaviour change, not a cleanup. **Recorded as a finding for a separate slice.**
- **`connection.ts:664-672`'s `my_account` TRIPWIRE comment becomes false on landing** — rewriting it is **in-scope required work** (§0.1(E)), with an exact precedent tooth at `connection.test.ts:1373-1405`. Not opportunistic.

---

## 11. RECOMMENDED WORKFLOW PATTERN

**Solo (test-first, tester → orchestrator-executed RED proof → implementer), with ONE narrowly-scoped red-team pass on `evals/client-no-pii-logs.eval.mjs` and `evals/account-e2e.eval.mjs` only.**

*Cost/benefit, one line:* the design is already the product of a six-lens heavy-ceremony pass plus two finalization reviews (ADR-0182), so re-running brainstorm/debate/compete would burn budget re-deciding settled questions — but the two new evals are the only gates in this slice with **no compiler and no pre-existing tooth behind them**, and this repo's own memory records 23 distinct false-green eval shapes, so ~one agent-pass of adversarial review scoped to those two files is the highest-leverage spend available.

---

## 12. FILE PATHS (absolute)

**Read-first / authority**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/docs/adr/0182-m21b2-oidc-client-claim-ui-better-auth-deployment.md`
- `/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M21-accounts-auth.spec.md`

**Critical-path source**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/connection.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/connection.test.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/authToken.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/authToken.test.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/store.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/net/rowConvert.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/main.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/main.wiring.test.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/ui/overlayRegistry.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/ui/overlayRegistry.test.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/ui/helpModel.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/ui/menuModel.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/src/ui/playtestControlsDoc.test.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/client/vite.config.ts`
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/server-module/src/accounts.rs`

**Eval precedents to imitate**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/bindings-drift.eval.mjs` (CI-fail-loud predicate + its teeth, `:57-103`)
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/e2e-desync-teeth.eval.mjs` (structural gate, `:34-39`)
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/dom-shell-coverage-exclusion.eval.mjs` (exported quote-aware `stripComments`, `:88`)
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/ops/observability/checks/stack-config-checks.mjs` (`checkRunbookHasRunnableSteps`, `:1065`; `checkNoQuotedCredential`, `:1035`)
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/evals/run.mjs`

**Touches-delta to escalate**
- `/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/docs/PLAYTEST.md` (§3 Controls table, `:38-61` — one new `C` row, mechanically forced by `playtestControlsDoc.test.ts:686-819`)
agentId: ac9fd88836e6f95f7 (use SendMessage with to: 'ac9fd88836e6f95f7', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 281643
tool_uses: 69
duration_ms: 913393</usage># M21b-2 Plan ADDENDUM — review + red-team + spike results (binding, supersedes conflicting plan text)

## A. Spike results (empirical, 2026-08-10, worktree @8814416) — G22 fully de-risked
- S1 ✓ standalone host ACCEPTS plain-http loopback issuer (`http://127.0.0.1:<p>/`), fetches
  `/.well-known/openid-configuration` then `jwks_uri`, verifies ES256 (raw r‖s webcrypto sig — S5 ✓).
- S2 ✓ WS connect with JWT fires `client_connected` and provisions exactly 1 `account` row
  (`auth_issuer` = stub issuer). Wrong-issuer JWT (2nd key/2nd iss path): host fetched its discovery
  + jwks (request log proves host-side acceptance), connection accepted, NO provisioning — the module
  allowlist did the work. This IS the N1 disambiguation: emit `C-connect` milestone + assert the
  issuer-stub request log contains the second issuer's discovery+jwks fetches.
- S3 ✓ `node --import <register.mjs>` loader hook (append `.ts` to failing relative specifiers)
  makes `client/src/module_bindings/index.ts` importable from plain node 24 (`DbConnection` exported).
  Reference: /tmp/m21b2-spike/{tsresolve,register,driver,rig}.mjs — WORKING code, reuse mechanics.
- S4 ✓ workspace copy (5 members + Cargo.toml/lock + rust-toolchain.toml, filter target/ and
  node_modules) + `cargo build -p monster-realm-module --release --target wasm32-unknown-unknown`
  with shared CARGO_TARGET_DIR: 6.73s warm. Publish: `spacetime publish -s http://127.0.0.1:<p>
  --bin-path "<target>/wasm32-unknown-unknown/release/monster_realm_module.wasm" -y <db>`.
- R11 ✓ `spacetime sql -s <url> <db> "SELECT identity, auth_issuer FROM account"` owner-reads the
  private table (prints an UNSTABLE warning to stderr — tolerate it, parse stdout).
- Driver detail: `conn.db.myAccount` (camelCase) exists; row field is `authIssuer`. Subscription via
  `subscriptionBuilder().onApplied().subscribe(['SELECT * FROM my_account'])`.

## B. RenewalOutcome contract (pins the G16 table; implementation detail inside D13/D17)
`credentialDecision.ts` owns:
```ts
export type RenewalOutcome =
  | { readonly kind: 'ok'; readonly token: string }
  | { readonly kind: 'no-session' }
  | { readonly kind: 'exchange-failed'; readonly reason: string } // reason ALREADY classifier-mapped by oidc.ts
  | { readonly kind: 'transient-error' };
```
`decideConnectCredential(outcome, everAuthenticated, consecutiveTransientErrors, anonToken)` table
(counter is incremented by resolveCredential BEFORE the call):
- `ok` → `{kind:'account', token}` (any ever/n)
- `no-session` → ever ? `{kind:'session-expired'}` : `{kind:'anon', token: anonToken}`
- `exchange-failed` → `{kind:'sign-in-failed', reason}` (both ever values — an exchange is only
  attempted when a verifier was present; its definitive failure is a failed sign-in, AUTH-48)
- `transient-error` → n < AUTH_SERVICE_TRANSIENT_THRESHOLD ? `{kind:'retry'}`
  : ever ? `{kind:'auth-service-unreachable'}`
  : `{kind:'sign-in-failed', reason:'auth-service-unreachable'}` (static string; AUTH-46 scopes
  `auth-service-unreachable` to previously-authenticated tabs)

## C. Gate-spec strengthenings (red-team F#; ALL binding on the tester)
- **G20 (F1):** `expectUniqueAnchor` the session-gate needle (never bare indexOf), and bound the
  comparison inside each real input-path region; assert all surface anchors resolve (>=0) first.
- **G18 (F2/F18):** the load-bearing needle is the FUSED statement
  `const codeUnconsumed = claimCode.hasUnconsumed(globalThis, opts.uri, opts.db);` — expectUniqueAnchor,
  INSIDE the `.onApplied` region. Then `const shouldJoin = credential.kind !== 'account' || !codeUnconsumed;`
  unique. `attemptJoin` may be DEFINED outside the region; pin file-wide `joinGame(` count === 1
  (inside attemptJoin's body region) and `attemptJoin(` CALL count === 1 inside the onApplied region.
- **G14 (F3):** additionally ban storage reach in connection.ts entirely: whole-squashed counts
  `sessionStorage`===0, `localStorage`===0, `getItem(`===0, `import *`===0 (named imports only).
- **G28 (F4):** add the ingest-body content pin mirroring UX2B_WALLET_INGEST:
  `store.upsertAccount(accountRowToStore(row as unknown as SdkAccountRow)); batcher.schedule();`
  contiguous, + file-wide `store.upsertAccount(` === 2 (onInsert + onUpdate) with written breakdown.
- **G24 (F5):** `expectUniqueAnchor` on `if (credential.kind === 'retry') {`.
- **G26 (F6):** two separately-anchored region-bounded `current = undefined;` needles — one inside the
  session-expired branch region, one inside auth-service-unreachable — not an aggregate count.
- **G27 (F7):** inside the matched catch block, the FIRST statement must be the stale re-check
  `if (gen !== buildGen || teardown) return;` (pin it as the block's first token) and no bare
  `return;`/`throw` may precede `state = onAttemptFailed(state);` + `scheduleRebuild();`.
- **G17 (F8):** pin the FULL contiguous derivation
  `const attemptGateOpen = wasEverAuthenticated(globalThis, opts.uri, opts.db) || isReturnLegAttempt;`
  as a unique anchor (closes `= true`).
- **G21 (F9/F10/F11):** sink list += `opts.onSessionExpired(`, `opts.onAuthServiceUnreachable(`,
  `opts.onClaimPending(`, `opts.onClaimAwaitingAccount(`, `opts.onClaimResult(`, `reportError(`.
  One-hop taint: any `const/let NAME = <rhs containing a banned identifier>` adds NAME to the banned
  set for subsequent sink-arg scans (document multi-hop as a named residual). Scanned files +=
  `client/src/main.ts` (same sinks incl. `reportError(`/`console.`). Claim `code` values: ban the
  identifiers `code`/`claimCode` inside `console.*`/telemetry sink args in connection.ts/oidc.ts/
  claimCode.ts (a live claim secret must not hit the console; reaching claimView's DOM is sanctioned).
  Anti-vacuity: >=1 sink found per scanned file, else fail loud.
- **G23 (F16/F17):** `extractSection(text, betterAuthHeadingLiteral, nextHeadingPattern)` that FAILS
  LOUD if the heading is missing/duplicated (never whole-doc fallback); ALL five clauses run against
  the extracted section text only. Inline BAD fixtures exercise: tag-in-wrong-section,
  Identity-mention-outside-section, custody-after-restic, missing-JWT-mint.
- **G30 (F19):** additionally: import allowlist per file (oidc.ts may import ONLY types from
  './credentialDecision'; claimCode.ts imports nothing runtime); ban `import *`; ban `globalThis`
  (===0) in both files; document bracket/string-splitting evasion as a named residual in the tooth
  comment (same honesty as G26).
- **G22 (F12/F13/F14):** driver milestones += `C-connect` (separate ok + identity) and the eval
  asserts the stub's request log saw `/other/...openid-configuration` + `/other/jwks` (host-side
  acceptance proof) before asserting C-my-account-empty. PID/port marker file in os.tmpdir
  (`mr-acct-e2e.pid`); on startup, scan and SIGKILL a prior orphan carrying the marker. Add a
  ciWiresE2eGate-style READ-ONLY assertion on .github/workflows/ci.yml: the CLI-install step index <
  the `just eval` step index (reading the workflow is allowed; only edits are out of touches).
  No scheme literal in any comment. CARGO_TARGET_DIR = `<repoRoot>/target` (overridable via env).
- **Scan-calibration:** every NEW test/eval file that source-scans a module carries its own
  calibration fixture asserting the scanned source contains zero `'://'` (and notes the
  stripLineComments quote-blindness), OR uses the quote-aware `stripComments` exported by
  `evals/dom-shell-coverage-exclusion.eval.mjs:88`.

## D. Reviewer corrections (binding)
- `main.wiring.test.ts:5609-5816` `UXD3C_OPEN_HANDLERS` 12 → 13 entries (KeyC IS a direct hotkey per
  the spec's "KeyC handler" task line) and `handlersChecked` `toBe(12)` → 13 at `:5933`.
- `overlayRegistry.test.ts`: grep the WHOLE file for hardcoded counts — sites at :223-224, :239,
  :274, :714, :739, :762, :805 (45 → 48 = 16×3), :856, :876 all move 15→16 (and 45→48).
- `connection.test.ts:642`'s "THIS IS THE ONLY PRE-EXISTING TOOTH THIS SLICE CHANGES" (M21b-era
  claim) becomes false — update that sentence as part of the G13b re-pin ceremony.
- Nightly coverage ratchet (justfile, 96%/97.56% current): every new pure module ships a full
  `.test.ts`; DOM shells (`claimView.ts`, `sessionView.ts`) go in BOTH vite.config.ts
  coverage.exclude AND the dom-shell eval's DOM_SHELLS list (lockstep).

## E. Fixed decisions
- KeyC = direct hotkey + menu 'account' leaf + CONTROLS row + docs/PLAYTEST.md row (touches-delta,
  justified: mechanically forced by playtestControlsDoc.test.ts A1/A3; no concurrent sibling exists).
- Commit structure: one PR, commit 1 = client+evals, commit 2 = ops/auth + DR runbook + ADR-0179
  pointer + accounts.rs comment.
- tsc-red window T7→T12 is accepted; interim commits are wip-squash targets, never bisect anchors
  (note in commit messages).
