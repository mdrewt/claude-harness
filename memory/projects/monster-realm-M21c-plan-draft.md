# M21c — planner plan DRAFT (raw output, pre-adjudication)

Slice: M21c (accounts/auth evals + hardening extensions). Branch `feat/m21c-accounts-evals`,
worktree `.claude/worktrees/M21c`, base `b5bbe1d` (master; M21a merged).
This is the RAW planner output. The adjudicated memo is `monster-realm-M21c-plan.md`.

---

## 0. Ground truth established (files actually read)

| Fact | Evidence |
|---|---|
| `my_account` body is one expression | `schema.rs:708-711` — `ctx.db.account().identity().find(ctx.sender)` |
| `account` / `guest_claim` declared PRIVATE | `schema.rs:684`, `schema.rs:722` (no `public` in attr) |
| `on_connect` lives in **lib.rs**, not accounts.rs | `lib.rs:202-208` |
| G12's value-pin anchors exist | `accounts.rs:64-65` consts; call sites `accounts.rs:305`, `:310` |
| Scheduled reaper's args struct is the G2 hazard | `accounts.rs:489-497` (struct) vs `:505-508` (reducer sig carries **no** `: Identity`) |
| **G7 already fully shipped** | `accounts_tests.rs` — `g2_no_reducer_takes_identity_parameter:1517`, `g5_writes_only_owned_tables:1549`, `auth36_reject_logs_carry_no_pii:904`, + 4 machinery self-teeth (`:1618/:1644/:1678/:1704`). **No G6 mirror exists** |
| M21a wrote the G6 manifest policies as prose, not code | `accounts_tests.rs:30-36` |
| The 13-file hardcoded list | `pvp_tests.rs:1429-1443`; consts `:54-57`, `:739-753`; fs-at-test-time precedent already in this file at `:1157` |
| ACCESSOR_BYPASS allowlist is an **inline filter chain**, not a named const | `currency-integrity.eval.mjs:460-473` |
| `findProfileAccessOutsideRanking` is **fs-coupled**, not fixture-able | `ranking-security.eval.mjs:208-231` |
| `stripComments` blanks **in place** (offsets preserved) | `conversation-privacy.eval.mjs:77-83` — drop-in replacement is parser-compatible |
| Bindings live-tree state already correct | `my_account_table.ts` present; `account_table.ts`, `guest_claim_table.ts`, `guest_claim_reaper_schedule_table.ts` absent |

**Blast radius (UNION of both graphs + grep for dynamic dispatch):**
- cbm: `currency-integrity.eval.mjs` exports have **zero importers**. `ranking-security.eval.mjs` has
  **no named exports at all**. `conversation-privacy.eval.mjs` exports imported by exactly one file
  (`wallet-privacy.eval.mjs:127`).
- CodeGraph: every `rekey_*` / `has_*` helper has exactly **one** caller — `accounts.rs`. Nothing outside
  `accounts.rs` + `evals/` + `pvp_tests.rs` is in the impact set. CodeGraph flags `rekey_npc_state` /
  `rekey_inventory` as **"no covering tests found"** — G6's consumption-completeness clause is the *only*
  structural gate that would notice if either were dropped from `rekey_all`.
- Dynamic invocation grep: `evals/run.mjs:29` (`await import(pathToFileURL(...))` auto-discovery — **no
  registration edit needed anywhere**) and `evals/gate-teeth.eval.mjs:36/64/86` (dynamic-imports only
  battle-schema-snapshot / zoned-schema / recruit-reducer-security — none of ours).

**Conclusion: no hidden dependency. Every edit lands inside `touches:`.** Refactoring
`currency-integrity`'s allowlist into an exported const and `ranking-security`'s dir-walker into a pure
predicate is safe — nothing imports either.

---

## 1. Complexity triage + right-sizing verdict (PLANNER'S RECOMMENDATION — CONTESTED, see adjudication)

**Planner verdict: ship all five declared files, but park exactly one checker — G6
(REKEY_COMPLETENESS) — as M21d.**

Planner's reasoning:
- Everything except G6 is **template-following**: `wallet-privacy.eval.mjs` is a near-line-for-line donor
  for G1/G12, and `accounts_tests.rs` (M21a) already contains a *working Rust implementation* of G2, G3,
  G4, G5, G11 and G12's extractor. Porting a proven algorithm to JS is low-risk.
- G6 has **no Rust twin to cross-check against**, needs a **novel table-struct field-list parser**, and
  carries an unresolved design decision (manifest SSOT location + how it stays honest vs ADR-0179 D6).
  It is the one gate whose "looks right, bites nothing" failure mode has no independent oracle.
- Mutation budget is the binding constraint at $60. Non-G6 work is ~23 clauses / ~13 live mutations.
  G6 adds ~5 clauses + ~5 mutations + a doc-SSOT sub-design.

Planner's tripwire: if T1–T7 land with mutation proofs green and >40% of budget remains, pull G6 forward
rather than opening M21d — it is an *extension* of a file M21c creates, so no `touches:` conflict.

**ORCHESTRATOR CONTEST (to be adjudicated by the review lenses):** G6 is explicitly named in the
supervisor's slice brief, and by the planner's own blast-radius finding it is the ONLY structural gate
covering the untested `rekey_inventory`/`rekey_npc_state` delegations. Parking the single
highest-value gate to save ~20% of the slice looks like the wrong trade. Default = build G6 in-slice;
park only if it proves genuinely intractable.

---

## 2. Ordered task list

### T1 — `evals/account-privacy.eval.mjs` (NEW), checks A + B (G1)
`stripRustSource(src)` — **single-pass**, string- and comment-aware, blanks in place (offset-preserving,
so `parseTables`/`parseViews` consume it unchanged). Handles `"…"`, `r#"…"#`, skips `'x'`/`b'x'` char
literals as 3-char units. `String.fromCharCode(0x22)` for the quote constant.

`checkAccountViewsSafe(rawServerSrc)` tagged clauses: `[A/0-table]` (non-vacuity), `[A/priv-account]` +
`[A/priv-guest-claim]` + `[A/priv-sched]`, `[A/M2-shortform]`, `[A/hidden]` (raw-vs-stripped
`#[spacetimedb::view(` count), `[A/2a]`, `[A/2b]` iter-ban, `[A/2d]` AnonymousViewContext, `[A/2e]` no
`Vec<`, `[A/2f]` `Option<Account>`, **`[A/2c]` body-EXACT pin**, `[A/3a]` no other view names `account`,
`[A/3b]` transitive reader-closure, `[A/3c-forged-ctx]` (`ViewContext::new(` / `ViewContext{` banned
across `accounts.rs`+`schema.rs`), `[A/3d]` verbatim-ctx call form.

`checkBindings(fsProbe)` — `[C/legacy-account]`, `[C/legacy-guest-claim]`, `[C/legacy-sched]` absent;
`[C/missing-view]` `my_account_table.ts` present.

Reuses (imports, does not edit): `parseTables`, `parseViews` from `./conversation-privacy.eval.mjs` —
but **not** its `stripComments` (the trap-#1 stripper).

### T2 — `evals/account-privacy.eval.mjs`, check G (G12 value-pin)
`collectLiteralStrConsts(strippedAccountsSrc)` → `Map<constName, literalValue>`;
`checkNoPiiInRejectLogs(accountsSrc, libSrc)`:
- `[G12/scope]` — the two scoped fn bodies located; **fail loud** if either extraction is empty.
- `[G12/not-literal]` — **load-bearing**: every 3rd argument of every `log_reject(` **and** `reject(`
  call inside those bodies is either a bare `"…"` literal or an identifier resolving in the literal-const
  map. `let s = claims.issuer(); log_reject(.., s)` fails here — the rename-evadable hole M21a flagged.
- `[G12/value-pin]` — the resolved value set **exactly equals** `{"unrecognized issuer",
  "unrecognized audience"}` (exact equality, never `.includes`).
- `[G12/no-format]` — belt: no `format!` / `to_string()` / `{}` in any scoped arg span (documented as
  *not* load-bearing).

### T3 — `evals/guest-claim-integrity.eval.mjs` (NEW), checks R + I + N (G2, G3, G4)
Own copy of `stripRustSource`, `extractFnBody`, `extractFnSig`, `parseReducerFns(stripped)`.
- `checkNoClientIdentity(accountsSrc)` — `[R/identity-param]`: **only reducer fn parameter lists** are
  scanned. The scheduled-table **struct** field list is explicitly out of scope, reason inline:
  `guest_claim_reaper(ctx, args: GuestClaimReaperSchedule)` derives identity from a row the *scheduler*
  wrote, guarded by `ctx.sender != ctx.identity()` (`accounts.rs:509`). `[R/non-vacuous]`: ≥5 reducers.
- `checkAnonPassthrough(libSrc)` — `[I/anon-first]` `has_jwt(` index < every other token in `on_connect`'s
  body; `[I/anon-no-err]` body contains no `Err(`.
- `checkIssuerAndAudience(accountsSrc)` — `[I/iss]`, `[I/aud]`, `[I/order]`, `[I/before-insert]`.
- `checkNoServerRng(accountsSrc)` — `[N/rng]` / `[N/random]`.

### T4 — same file, checks W + S (G5, G11)
- `checkModuleWriteIsolation(accountsSrc)` — port of `accounts_tests.rs::write_target_accessors:1569`,
  **plus one hardening the Rust twin lacks**: the span between the `ctx.db.` accessor and the write verb
  must contain no `;`, so a `Vec::insert` after an unrelated `ctx.db.player()` read cannot be
  misattributed. `[W/write-target]`, `[W/battle-literal]`, `[W/non-vacuous]`.
- `checkSingleUseConsumed(accountsSrc)` — `[S/count]` exactly one `consume_claim_and_disarm(` in
  `complete_guest_claim`; `[S/success-region]` it lies between `rekey_all(` and the final `Ok(())`;
  `[S/before-provenance]` it precedes `account().identity().update(`.

### T5 — extend `evals/ranking-security.eval.mjs` (G8)
- **Refactor (safe — zero importers):** extract `export function hasProfileAccess(src)` out of
  `findProfileAccessOutsideRanking`, which then calls it. This is what makes A2 fixture-able at all.
- **Add** `export function checkRekeyProfileInvariant(rankingSrc)` — AUTH-25 in five clauses:
  `[G8/copy-forward]` `profile_with_carried_stats(`; `[G8/zero-in-place]` `tombstoned_profile(`;
  `[G8/two-updates]` **exactly two** `profile().identity().update(` in the body (what makes the zero step
  load-bearing, not cosmetic); `[G8/never-delete]` no `.delete(` in the body; `[G8/tombstone]`
  `PROFILE_TOMBSTONE_NAME` declared, value exact-equals `"(claimed guest)"`, `length <= 24`, contains ≥1
  non-alphanumeric char (so `guards::validate_name` can never mint it).
- **Add** `[G8/not-a-reducer]`: `#[spacetimedb::reducer` does not precede `fn rekey_profile`.
- Wire into the live-source scan alongside A1/A2.

### T6 — extend `evals/currency-integrity.eval.mjs` (G10)
- **Refactor (safe — zero importers):** `export const ACCESSOR_BYPASS_ALLOWLIST = ['economy.rs',
  'schema.rs', 'economy_tests.rs'];` + `export function isAccessorAllowlisted(relPath)` preserving the
  existing subdirectory semantics at `:462-472` (`base === X || base.endsWith('/' + X)`).
- **Add** criterion 6b: `[6b/allowlist-negative]` — the allowlist contains no element **exactly equal**
  to `'accounts.rs'` (element-wise `===`, never `.includes` on a joined string), rationale inline:
  `accounts.rs` must delegate to `economy::wallet_exists` (`economy.rs:296`), never read the wallet.

### T7 — extend `server-module/src/pvp_tests.rs::m17a_rl2_profile_never_deleted_scan` (G9)
**Derive, don't hand-maintain.** Replace the hardcoded 13-tuple array with a runtime-derived file set,
using the `env!("CARGO_MANIFEST_DIR")` precedent already in this file at `:1157`:
1. `std::fs::read_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/src"))` → keep `*.rs`, drop `*_tests.rs`.
2. Leave the existing `include_str!` consts (`:54-57`, `:739-753`) **untouched** — other tests depend on
   them; only this one test changes its source of truth.
3. **Three non-vacuity guards:** derived set length `>= 20` (actual count in the panic message); a
   hardcoded anchor set `{accounts.rs, ranking.rs, schema.rs, pvp.rs, economy.rs}` all present; every read
   source non-empty, asserted per file.
4. **Needle scoping matched to the eval:** needle 1 (`profile().identity().delete`) applies to **all**
   derived files; needle 2 (`= ctx.db.profile()`, split-binding evasion) applies to all **except
   `ranking.rs`** — mirroring `ranking-security.eval.mjs` C1b at `:827-837`. Without this scoping the
   widening false-reds the first legitimate `ranking.rs` refactor. Verified: `ranking.rs::rekey_profile:201-222`
   reads via `match ctx.db.profile()…` deliberately and contains **neither** needle today; `accounts.rs`
   contains neither. The widening is green on the unmutated tree.
5. Update the doc comment: the "GREEN-vacuous today (profile table absent)" note at `:1411-1415` is stale.

**`evolution_tests.rs` — FLAGGED, NOT PLANNED.** `evolution_tests.rs:2591-2604` (`scheduled_scan_sources()`)
is a hardcoded 10-file list **already under-covering**: `accounts.rs` hosts the scheduled reducer
`guest_claim_reaper` (`accounts.rs:489`, `:505`) and is not in the list, so EG2-9's invariant does not scan
it today. Out of `touches:` → M21d follow-up, same derive-from-`read_dir` fix. Do NOT edit.

### T8 — docs
- `docs/adr/0179-*.md` body-only Amendments line (G6 disposition, `evolution_tests.rs` gap, the
  string-literal-unaware-stripper follow-up as a named owned residual).
- `ARCHITECTURE.md` — add the two new evals to the eval inventory (it already carries one at `:1205`).
- `CHANGELOG.md` NEVER hand-edited. `docs/knowledge/**` — no regen (M21c changes no schema).

---

## 3. Proof-of-teeth plan

Every checker gets ≥1 tagged BAD fixture (asserted by **tag**, not "some error" — the F-4 discipline at
`wallet-privacy.eval.mjs:755-761`) and ≥1 GOOD fixture that must PASS. Fixtures run **before** live-tree
checks.

### 3a. Fixtures

| Clause | BAD fixture (must flag, by tag) | GOOD fixture (must pass) |
|---|---|---|
| `[A/2c]` | decoy-line leak: `let _d = …find(ctx.sender); let v = Identity::from_byte_array([7u8;32]); …find(v)` | canonical `my_account` body with `iter`/`public` appearing only in a comment (hostile-GOOD) |
| `[A/priv-*]` | `#[spacetimedb::table(name = guest_claim, public)]` | all three attrs private |
| `[A/2b]/[A/2e]/[A/2f]/[A/2d]` | `Table::iter(&…)` UFCS + dead conforming decoy; `-> Vec<Account>` with a scoped `find` and no `iter`; `-> Option<Acct>`; `&AnonymousViewContext` | (shared GOOD above) |
| `[A/3a]/[A/3b]/[A/3c]/[A/3d]` | second view reading `account`; **two-hop** `roster → census → accessor` using the spaced `account ()` form; `my_account(&ViewContext::new(victim))`; `my_account(laundered)` via helper | second view calling `my_account(ctx)` with its own ctx (the HUD allowance) |
| `[A/hidden]/[A/M2-shortform]` | forged comment via `const OPEN: &str = "/*";` … `"*/"`; `#[view(name = all_accounts, public)]` | — |
| `[C/*]` | injected `fsProbe` returning `true` for `account_table.ts`; `false` for `my_account_table.ts` | probe: view present + all three legacy absent |
| `[G12/not-literal]` | **`let s = claims.issuer(); log_reject("client_connected", ctx.sender, s);`** — the exact rename evasion | the real M21a shape: two `&'static str` consts referenced by name |
| `[G12/value-pin]` | consts renamed *and* revalued to `"rejected iss=x"` | consts revalued only in whitespace/comments around them |
| `[G12/no-format]` | `log_reject(.., &format!("issuer {} bad", issuer))` | — |
| `[G12/scope]` | source with no `provision_or_touch_account` at all (empty-target blind spot) | — |
| `[R/identity-param]` | `pub fn complete_guest_claim(ctx: &ReducerContext, guest: Identity, code: String)` | **the scheduled-reducer shape** (table struct with `guest_identity: Identity` + `fn r(ctx, args: S)`) — **must PASS** |
| `[I/anon-first]` | `on_connect` calling `provision_or_touch_account(ctx)` before the `has_jwt` gate | the real lib.rs shape |
| `[I/anon-no-err]` | `on_connect` whose JWT-less branch returns `Err("no jwt")` | — |
| `[I/aud]` | **issuer-only** `provision_or_touch_account` (the ADR's named BAD fixture) | asymmetric D1″ shape |
| `[I/order]` | audience checked before issuer | — |
| `[N/rng]` | `let code = ctx.rng().gen::<u64>();` inside `start_guest_claim` | accounts-shaped source with `rng` only in a doc comment |
| `[W/write-target]` | `ctx.db.monster().monster_id().update(m)` inside a fn | body with a bare **read** `ctx.db.player().identity().find(g)` + owned-table writes — **must PASS** |
| `[W/battle-literal]` | `ctx.db.battle().battle_id().find(1)` | `is_in_ongoing_battle(ctx, g)` |
| `[W/;-scoping]` | — | `ctx.db.player().identity().find(g); ids.insert(0, x);` — **must PASS** (proves the `;`-span hardening; a naive rfind would falsely name `player`) |
| `[S/count]/[S/success-region]` | consume present **only** in the expiry reject branch; consume twice | real shape: exactly one, in the success region, before the provenance update |
| `[G8/two-updates]/[G8/zero-in-place]` | `rekey_profile` that copies forward but omits the tombstone update (the AUTH-25 re-donation hole) | real `ranking.rs:201-222` shape |
| `[G8/never-delete]` | `rekey_profile` that deletes the guest row | — |
| `[G8/tombstone]` | `PROFILE_TOMBSTONE_NAME = "ClaimedGuest"` (typable → impersonable); 30-char value | `"(claimed guest)"` |
| A1 under G8 | ranking-shaped source where `rekey_profile` carries `#[spacetimedb::reducer]` → must return **false** | one `set_profile_name` reducer + non-reducer `rekey_profile` with two updates → **true** |
| A2 under G8 | accounts-shaped source with `ctx.db.profile().identity().find(from)` inlined → `hasProfileAccess` **true** | accounts-shaped source delegating via `crate::ranking::rekey_profile(` + `profile_exists(` → **false** |
| `[6b/allowlist-negative]` | in-test copy of the allowlist with `'accounts.rs'` appended | `isAccessorAllowlisted('economy.rs')===true`, `('sub/economy.rs')===true`, `('accounts.rs')===false` |
| ACCESSOR_BYPASS on accounts | `ctx.db.player_wallet().owner_identity().find(me)` → `hasWalletAccessorBypass` true | `use crate::economy::wallet_exists;` → false |

### 3b. Live-source mutations (orchestrator executes, observes RED, reverts per-file)

| # | File:line | Mutation | Expect |
|---|---|---|---|
| M1 | `schema.rs:710` | insert `let _d = ctx.db.account().identity().find(ctx.sender);` above the return expr | `[A/2c]` |
| M2 | `schema.rs:722` | `name = guest_claim` → `name = guest_claim, public` | `[A/priv-guest-claim]` |
| M3 | `schema.rs:709` | insert `let _c = spacetimedb::ViewContext::new(ctx.sender);` into `my_account` | `[A/3c-forged-ctx]` |
| M4 | `accounts.rs:305` | `…, REJECT_UNRECOGNIZED_ISSUER)` → `…, issuer)` | `[G12/not-literal]` |
| M5 | `accounts.rs:299,305` | `let s = claims.issuer();` … `log_reject(…, s)` — the rename evasion | `[G12/not-literal]` |
| M6 | `accounts.rs:64` | value → `"rejected iss"` | `[G12/value-pin]` |
| M7 | `accounts.rs:336` | add `, _who: Identity` to `start_guest_claim` | `[R/identity-param]` |
| M8 | `lib.rs:205` | `return Ok(());` → `return Err("no jwt".to_string());` | `[I/anon-no-err]` |
| M9 | `accounts.rs:309-312` | delete the whole audience block | `[I/aud]` |
| M10 | `accounts.rs:337` | insert `let _r = ctx.rng();` | `[N/rng]` |
| M11 | `accounts.rs:227` | insert `ctx.db.player().identity().delete(from);` into `rekey_all` | `[W/write-target]` names `player` |
| M12 | `accounts.rs:420` | insert `let _b = ctx.db.battle().battle_id().find(1);` | `[W/battle-literal]` |
| M13 | `accounts.rs:429` | delete `consume_claim_and_disarm(ctx, guest);` | `[S/success-region]` + `[S/count]` |
| M14 | `accounts.rs:429` | move that line into the expiry branch at `:402` | `[S/success-region]` only (count stays 1 — clause-separation proof) |
| M15 | `ranking.rs:218-221` | delete the `.update(tombstoned_profile(guest))` block | `[G8/two-updates]` + `[G8/zero-in-place]` |
| M16 | `ranking.rs:161` | `"(claimed guest)"` → `"ClaimedGuest"` | `[G8/tombstone]` |
| M17 | `currency-integrity.eval.mjs` (new const) | append `'accounts.rs'` to the allowlist | `[6b/allowlist-negative]` |
| M18 | `accounts.rs:212` | replace `economy::wallet_exists` delegation with a direct `ctx.db.player_wallet()` read | existing `ACCESSOR_BYPASS` names `accounts.rs` |
| M19 | `ranking.rs:221` | `.update(tombstoned_profile(guest))` → `.delete(from)` | **`pvp_tests::m17a_rl2_profile_never_deleted_scan` fails naming `ranking.rs`** — load-bearing proof T7's widening added NEW coverage |
| M20 | `accounts.rs:237` | add `ctx.db.profile().identity().delete(guest);` | same test fails naming `accounts.rs` |
| M21 | `pvp_tests.rs` (T7 derive step) | narrow the `read_dir` filter to `f == "pvp.rs"` | the `>=20` / anchor-set non-vacuity guard fires |

**Not proved by live mutation (deliberate):** `[C/*]` bindings. Creating
`client/src/module_bindings/account_table.ts` even temporarily reaches into the concurrently-running M21b
slice's file space. Prove `[C/*]` with injected `fsProbe` fixtures only, plus a live assertion that both
probed paths are real repo-relative strings.

---

## 4. Anti-patterns to avoid (named)

1. **Comment-then-string stripping.** `ranking-security.eval.mjs:83` does `stripRustStrings(stripRustComments(src))`
   — comments **first**. A literal containing `//` truncates, unbalances quote pairing, cascades into
   unrelated files (`accounts.rs:41-48` documents the trade-escrow-guards TR-11 incident). **Both new
   evals must use a single-pass string-aware stripper.** Fixing the OTHER evals' strippers is out of
   `touches:` → flagged follow-up, not work.
2. **Rust char-literal / unpaired `/*` misalignment.** Skip `'x'`/`b'x'` as 3-char units; never write a
   literal `/*` or a contiguous scanner needle in a comment; `String.fromCharCode(0x22)` for the quote;
   scrub **per file**, never on a concatenated blob.
3. **Empty-target / vacuous-green.** Every checker needs a non-vacuity clause that fires when its target
   is missing: `[A/0-table]`, `[R/non-vacuous]`, `[W/non-vacuous]`, `[G12/scope]`, T7's three guards.
   Corollary: **every checker needs a GOOD fixture** — "an always-red checker is indistinguishable from a
   working one" (`wallet-privacy.eval.mjs:119-121`; ux3 postmortem: 9 of 19 broken impls passed a
   scan-only gate).
4. **Untagged fixtures.** A BAD fixture asserting only "some error" cannot distinguish a live clause from
   a deleted one whose neighbour shares a word (red-team F-4). Use `expectTag(err, '[X/y]', 'Fn')`.
5. **`.includes` where equality is meant.** G10's negative assertion and G12's value-pin must be
   element-wise / exact `===`. A substring test on a joined allowlist greens on `'not-accounts.rs'`.
6. **Presence-only where exact is meant.** `[A/2c]` must be `compactBody === SANCTIONED`.
7. **`new RegExp()`.** Banned (Semgrep `detect-non-literal-regexp`, bitten twice). Literal `/…/` and
   `String.indexOf` only.
8. **gitleaks-tripping names.** No fixture/const named `*_KEY`, `*_TOKEN`, `*_SECRET` beside a
   high-entropy literal. Name the 64-hex fixture `FIXTURE_CLAIM_CODE`, built as
   `'0123456789abcdef'.repeat(4)` (low entropy, matches `accounts_tests.rs:458`). gitleaks is
   **remote-only** — local `just ci` cannot catch it.
9. **Widening a scan without scoping its needles.** T7's split-binding needle must **exempt `ranking.rs`**
   (matching `ranking-security.eval.mjs:827-837`).
10. **Treating the scheduled-reducer args struct as a client identity.** A G2 checker scanning struct
    field lists rather than reducer parameter lists false-fails `accounts.rs:489-497` on day one.
11. **Editing shared/undeclared files.** `evals/run.mjs` (never — and unnecessary),
    `evals/conversation-privacy.eval.mjs` (import only), `server-module/src/evolution_tests.rs` (out of
    `touches:`), anything under `client/` (M21b runs concurrently), `CHANGELOG.md`.
12. **`git checkout`-style directory reverts during mutation proofs.** Harness memory: a directory-wide
    revert silently wipes a live subagent's uncommitted work. Revert each mutation by re-applying the
    inverse edit to the single file.

---

## 5. Open questions / risks — planner's recommended default

| # | Question | Recommended default (no pause) |
|---|---|---|
| Q1 | Where does the G6 manifest literal live? | A `const REKEY_MANIFEST` in `evals/guest-claim-integrity.eval.mjs`, keyed `"table.field" → {policy, rekeyHelper, existsHelper}`. M21a shipped no Rust const (`/simplify #7`); ADR-0179 D6 rejected a macro registry. |
| Q2 | Does G6 cross-check the manifest against ADR-0179 D6's markdown table? | **No full table parse.** D6's table has merged rows (`monster` + `monster_pub`), an N/A row, and **two rows keyed `account`** with different columns — a parser hits genuine ambiguity, and fail-loud would fire constantly. **Bounded tie instead:** assert the `**D6 —` heading occurs exactly once in the **RAW** doc text, and every `rekeyHelper` path string appears verbatim in the doc. |
| Q3 | G6's honesty against the code, then? | **Bidirectional + code-anchored:** every `: Identity`/`: Option<Identity>` field inside a `#[spacetimedb::table(…)]` struct field list must have a manifest entry, **and** every manifest key must resolve to a field that still exists. Plus consumption-completeness: each REKEY entry's `rekeyHelper` referenced from `rekey_all` (`accounts.rs:221-229`) **and** its `existsHelper` from `account_has_game_data` (`:209-216`). Anchor set for non-vacuity: `{account.identity, playtest_event.identity, profile.identity, player_wallet.owner_identity}`; `playtest_event` must resolve to EXEMPT. |
| Q4 | T7: keep the hardcoded list with an assertion, or derive from `read_dir`? | **Derive.** The stated gap is "silently under-covers when a new module lands"; a hardcoded-list-plus-assertion only converts a silent gap into a manual chore. |
| Q5 | Should the two new evals share a stripper module? | **No.** Repo convention is per-file local copies (`ranking-security:51`, `currency-integrity:147`); `ci-gate-wiring.eval.mjs:342-346` explicitly documents rejecting exactly that coupling. Duplicate ~60 lines. |
| Q6 | `[G12/value-pin]` pins two exact strings — brittle? | Accept + document. A deliberate wording change must be re-reviewed at the gate; that is the point. Failure message quotes expected and found sets. |
| Q7 | `[A/2c]`/`[G8/tombstone]` couple evals to exact literals. | Accept. Precedent `wallet-privacy.eval.mjs:438-447` ("exact ON PURPOSE"), `accounts_tests.rs:717-722`. |
| Q8 | Importing `parseTables`/`parseViews` while substituting the stripper — safe? | **Yes** — `stripComments` blanks in place (`conversation-privacy.eval.mjs:79-81`), offsets preserved. **Tester must add an assertion proving this** (parse the same fixture through both strippers, compare name sets). |
| Q9 | `evolution_tests.rs:2591-2604` under-covers `accounts.rs`'s scheduled reducer. | **Flag only** — out of `touches:`. Record in the ADR note. Do NOT edit. |
| Q10 | CodeGraph: `rekey_inventory`/`rekey_npc_state` have "no covering tests". | Real; **G6 is the gate that would catch a dropped delegation.** |
| Q11 | Do the new files need registering anywhere? | **No.** `evals/run.mjs:11` globs `*.eval.mjs`. No justfile/lefthook/ci.yml edit. |
| Q12 | JSDoc / lint on new eval files? | Every exported checker gets `@param`/`@returns`, matching `wallet-privacy.eval.mjs`. Run `just lint` before the mutation round so lint noise does not masquerade as a red gate. |

---

## 6. File-by-file structure sketch — see the planner's §6 (reproduced in the adjudicated memo).

## 7. Planner's recommended workflow
Solo implementer + a single red-team pass on the finished checkers. ~1.2x solo cost buys a pass targeting
the exact failure this repo has been burned by three times (ux3: 9/19 broken impls green; corpus gates: 23
implementations beat a full teeth suite; G12's current form exists only because a red-teamer found the
M21a identifier-scan rename-evadable).
