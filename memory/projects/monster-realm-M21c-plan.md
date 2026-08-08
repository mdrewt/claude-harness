# M21c — adjudicated build plan (accounts/auth eval gates + hardening extensions)

Branch `feat/m21c-accounts-evals`, worktree `.claude/worktrees/M21c`, base `b5bbe1d` (master, M21a merged).
HARD tier. Sibling **M21b runs CONCURRENTLY on `client/**`** — nothing under `client/` may be touched.
Raw planner draft: `monster-realm-M21c-plan-draft.md`. **Where this memo and the draft differ, THIS memo wins.**

This memo records the ADJUDICATED decisions after planner → reviewer + red-team + /simplify (3 parallel
lenses). The red-team ran **live PoCs**: it patched `accounts.rs` with three real security defects and got
**78/78 evals PASS, 547/547 Rust tests PASS, clippy+fmt clean, line-count neutral** — then implemented the
draft's own T2/T3/T4 clauses and got **all five checkers PASS**. Every CRITICAL below is a proven bypass,
not a hypothesis.

## Verified ground truth (re-checked by the orchestrator)
- `evals/battle-schema-snapshot.eval.mjs:45` **exports `parseTableSchemas(rawSrc)`** → `{table:{pk,columns:{field:type}}}`,
  parsed from `#[spacetimedb::table(...)] pub struct` field lists. This is exactly G6's required parser. It already
  exists and is already enforced tree-wide against `evals/baselines/table-schemas.json`.
- `server-module/src/` is **FLAT** — no subdirectories; **20** non-test `*.rs` files.
- The tree declares **exactly 3 views**: `my_conversation` (`schema.rs:536`), `my_wallet` (`:655`),
  `my_account` (`:708`).
- Worktree clean at adjudication time.

---

## A. The three decisions the lenses overturned

### A1 — G6 (REKEY_COMPLETENESS) **SHIPS IN M21c**. Do not park it.
The planner wanted G6 parked to M21d on the premise it "needs a novel table-struct field-list parser" and is
"the only structural gate covering `rekey_inventory`/`rekey_npc_state`". **Both premises are false:**
- The parser exists (`parseTableSchemas`, above) — G6 is ~50 lines and the CHEAPEST checker in the slice.
- `accounts_tests.rs:1320-1345` (`auth21_rekey_all_delegates_every_table_in_order`) already pins all six
  helper calls in D6 order. CodeGraph's "no covering tests" is a *call-graph* signal, not a scan-gate signal.

**The genuinely uncovered half — and G6's real value — is `account_has_game_data` existsHelper
completeness** (`accounts_tests.rs` never enumerates the six exists-helpers) **plus declaration-completeness
for a FUTURE table**. The spec §4 checkbox names REKEY_COMPLETENESS *inside* `guest-claim-integrity.eval.mjs`;
parking it would leave an uncloseable checkbox and an ADR gate row with no owner.

### A2 — Whitespace compaction is MANDATORY (reviewer BLOCKER B1)
The live tree is **rustfmt-wrapped**: `ranking.rs:209-221` is `ctx.db\n.profile()\n.identity()\n.update(`;
`accounts.rs:430-433`, `:316-324`, `:455-458`, `:477-480` likewise. Every needle in the draft is
whitespace-contiguous, so `[G8/two-updates]`, `[S/before-provenance]` and **every `[W/*]` clause false-RED on
day one** (and `[W/non-vacuous]` fires). Both donors already solve this and the draft cited neither:
`accounts_tests.rs:153-161` (`squash_ws(strip_comments(strip_strings(src)))`) and
`wallet-privacy.eval.mjs:400-447` (`compactWs`).
**Every ordering/count/token clause runs against `compactWs(stripRustSource(src))`; all needles written in
squashed form.** Add a machinery self-tooth proving the squash bites (`accounts_tests.rs:1618-1638` shape).

**Corollary (reviewer H1) — this is the REAL `pvp_tests` gap, not the file list.** `pvp_tests.rs:1446`'s
needle is matched against `strip_rust_comments` output with **no squash**, so a `profile` delete written in
this repo's own rustfmt style evades it *and* `ranking-security.eval.mjs:803/827` today. Widening the file
set without squashing is motion, not coverage. Squash in **both** (both are in `touches:`).
Verified green first: no non-test `server-module/src/*.rs` contains either needle in any spacing.

### A3 — Cut the reader-closure; pin the VIEW INVENTORY instead (simplify S2, kills red-team F6)
Red-team **proved** the draft's `[A/3b]` transitive reader-closure is defeated by a function pointer
(`const HOPS: [fn(&ViewContext)->Vec<Row>;1] = [roster];` … `HOPS[0](ctx)`) — rustfmt-stable, clippy-clean,
and it beats the **live donor** `wallet-privacy.eval.mjs:279-300` too. The fixed point grows only on
`${reader}(`; a fn *value* never emits that token.
**Replace `[A/3a]`+`[A/3b]`+`[A/3d]` with one clause:**
```js
const EXPECTED_VIEWS = ['my_account', 'my_conversation', 'my_wallet']; // sorted, exact equality
```
Strictly STRONGER (a laundering view cannot exist at all, rather than being detected), ~12 lines instead of
~120, and immune to F6. Any new view is a privacy-relevant event that must be re-reviewed here.

---

## B. Proven bypasses that MUST be closed (red-team CRITICAL/HIGH)

### B1 (F1, CRITICAL) — stripper desync blinds every BAN clause
`r"C:\"` (zero-hash raw string — `\"` eaten as an escape), `r##"use "code""##` (2 hashes unrecognised),
`br##"a"b"##` all invert quote polarity for the rest of the file. All rustfmt-stable and clippy-clean.
One such const added to `schema.rs` between `my_account` and the `guest_claim` table made
`[A/priv-guest-claim]` report **TABLE NOT FOUND (clause cannot fire)** while `guest_claim, public` was
live in the raw source. In `accounts.rs` one line blanks **14,572 code characters**, zeroing `[N/rng]` and
`[W/write-target]` needles while presence needles stay satisfied.
**The asymmetry is the danger: a desync GREENS every ban clause and reds only presence clauses.**
Required hardening:
- (a) recognise `r` / `br` + **any** number of `#`, match the close by hash count;
- (b) raw strings never go through escape processing;
- (c) lex char literals properly (`'\''`, `'\u{..}'`, `b'\\'`) and disambiguate **lifetimes** (`&'a T`);
- (d) **desync self-check clause**: `stripRustSource` is idempotent, AND structural-anchor counts
  (`fn `, `#[spacetimedb::table(`, `pub struct`) in the stripped text equal an independently-derived count;
- (e) **fail loud, never skip**: every required table/fn anchor must resolve or the checker goes RED.
  (This is what turns the presence clauses into a desync canary.)
NOTE: this overrules /simplify C3 ("just import `conversation-privacy`'s `stripComments`") — that stripper
is comment-only and carries the documented `//`-inside-a-string limitation that is exactly the M21a landmine
(`accounts.rs:41-48`). Keep the local stripper, but make it correct.

### B2 (F2, CRITICAL) — NO_CLIENT_IDENTITY is beaten two ways
Both compile and pass `clippy --all-targets -D warnings`:
```rust
#[derive(spacetimedb::SpacetimeType)] pub struct ClaimTarget { pub guest_identity: Identity }
#[spacetimedb::reducer] pub fn complete_guest_claim_for(ctx: &ReducerContext, target: ClaimTarget)
    -> Result<(),String> { rekey_all(ctx, target.guest_identity, ctx.sender) }      // E1: struct arg
#[spacetimedb::reducer] pub fn adopt_guest(ctx: &ReducerContext, guest_hex: String)
    -> Result<(),String> { let g = Identity::from_hex(&guest_hex)…; rekey_all(ctx, g, ctx.sender) } // E2
```
Unauthenticated, code-less transfer of ANY identity's monsters/inventory/wallet/NPC state/profile.
`Identity::from_hex` is `pub` (`spacetimedb-lib-1.12.0/src/identity.rs:245`).
**The shipped Rust twin cannot see these**: `accounts_tests.rs:1517-1525` iterates a **hardcoded five-name
list** of reducer needles, so a *new* reducer is invisible. Porting it to JS reproduces a gate with zero
coverage of the additive case. The draft's GOOD fixture ("the scheduled-reducer shape must PASS") is what
entrenches E1.
Required: **enumerate reducers from source** (never a fixed list); `[R/name-set]` pins the reducer NAME SET
exactly (not `>= 5`) so an added reducer is itself the failure; each param type must be a wire-safe scalar
**or** the reducer is the `scheduled(<name>)` target of a table declared in the same file AND its body
contains the `ctx.sender != ctx.identity()` guard (`accounts.rs:509`); plus a flat ban in `accounts.rs` on
`Identity::from_hex(`, `Identity::from_byte_array(`, `Identity::from_be_byte_array(`, `Identity::from_str(`.

### B3 (F3, CRITICAL) — one-token arg swap kills single-use
`consume_claim_and_disarm(ctx, me)` (was `guest`) deletes nothing — `me` has no `guest_claim` row — so the
guest's claim row and armed reaper survive and the 64-hex code stays redeemable until TTL. AUTH-34/35 dead.
`[S/count]`, `[S/success-region]`, `[S/before-provenance]` **all PASS**.
Required: pin the ARGUMENT — compacted body must contain `consume_claim_and_disarm(ctx,guest)` — and require
the call at **brace-depth 0** of the fn body (also closes the `if cond { consume… }` dead-branch variant).

### B4 (F4, HIGH) — G12 leaks the raw `iss` through argument 1
`guards.rs:47` is `log_reject(reducer: &str, sender: Identity, reason: &str)` — the FIRST param is a `&str`
and `guards.rs:48-51` documents that a name literal there is "an unenforced convention".
`let src_tag = claims.issuer(); log_reject(src_tag, ctx.sender, REJECT_UNRECOGNIZED_ISSUER);` writes the raw
`iss` to the structured warn log while `[G12/not-literal]` (3rd arg only), `[G12/value-pin]` and
`[G12/no-format]` all PASS. The rename also beats the shipped Rust twin (identifier list
`["issuer","subject","audience","claims"]`, `accounts_tests.rs:918`).
**As drafted, M21c would ship a REGRESSION** (JS clause narrower than the Rust one it ports).
Required: not-literal applies to **EVERY** argument of `log_reject(` / `reject(` (arg1 = bare literal or
literal const; arg2 = exactly `ctx.sender` or `me`); keep the Rust identifier list as a belt; add
`[G12/claim-binding]` — the scoped bodies may not bind `claims.issuer()/.audience()/.subject()` to a local
that is later passed to any `log`/`reject` call (**track the binding name, don't pin the spelling**).

### B5 (F5, HIGH) — the `;`-span rule alone is a NET REGRESSION on G5
`let presence = ctx.db.player(); presence.identity().delete(from);` becomes **undetected** with the `;`-span
hardening, while the shipped Rust twin (plain `rfind`, `accounts_tests.rs:1569`) **does** catch it today.
The draft's own GOOD fixture legitimises the hole (one token from the attack).
Required: keep the `;`-span rule **and** pair it with (a) `[W/split-binding]` — ban `= ctx.db.<t>()` for `t`
outside the owned set (the exact needle `ranking-security.eval.mjs:827` / `pvp_tests.rs` already use);
(b) `[W/handle-type]` — ban `<t>__TableHandle` in signatures (seed from `wallet-privacy.eval.mjs:242`);
(c) accessor→verb span must match only chain characters `[A-Za-z0-9_.()&,:<>\s]`, rejecting UFCS
`UniqueColumn::delete(&ctx.db.player().identity(), …)` where the verb precedes the accessor.
**Follow-up flag (out of scope):** fix the same unbounded `rfind` in `accounts_tests.rs:1581` — it is a
false-RED risk, not a false-green, so it is a residual, not a blocker.

### B6 (F7, HIGH) — subdirectory bypass
`server-module/src/accounts/economy.rs` deleting wallet rows was **invisible to both** `currency-integrity`
(ACCESSOR_BYPASS's `base.endsWith('/'+X)` tolerance auto-allowlists it) and to T7's **non-recursive**
`read_dir`. Verified live: `currency-integrity: PASS`, `wallet-privacy: PASS`.
Required: T7 **recurses**; and `currency-integrity`'s allowlist match becomes **exact relative path**, not
suffix-tolerant. `server-module/src/` is flat today (verified), so this is green on arrival.

### B7 (F8, MEDIUM-HIGH) — AUTH-25 re-donation stays open at 78/78 green
```rust
let (rating,wins,losses) = (guest.rating,guest.wins,guest.losses);
let tomb = tombstoned_profile(guest);
ctx.db.profile().identity().update(profile_with_carried_stats(tomb, rating, wins, losses));
```
Guest row is renamed to the tombstone but **keeps its rating/W/L** — the same identity can donate the same
stats to unbounded fresh accounts, the precise hole `ranking.rs:178-181` says the zero exists to close.
`[G8/copy-forward]`, `[G8/zero-in-place]`, `[G8/two-updates]`, `[G8/never-delete]` all PASS; 547 Rust tests
and 78 evals green. **`ranking_tests.rs:636-646` pins the update COUNT (==2), which this preserves — so
nothing in the repo catches it today.**
Required: value-exact pin — the second update's compacted argument must be **exactly**
`tombstoned_profile(guest)`; plus a fixture where `tombstoned_profile(` is present but its result is
rewrapped. (This is the ONE G8 clause that survives the /simplify cut — see C1.)

### B8 (F9, MEDIUM) — `[I/aud]` passes while empty-`aud` provisions an account
`if !claims.audience().is_empty() && !audience_allowed(…)` inverts AUTH-3 (an empty `aud` must reject,
`accounts.rs:89-90`). All four `[I/*]` clauses PASS. Variants: `&& issuer.is_empty()`, or swapping the
allowlist const (`issuer_allowed(issuer, ALLOWED_AUDIENCE)` type-checks — both are `&[&str]`).
Required: pin the guard SHAPE exactly (as `[A/2c]` does) — compacted condition must be
`if!audience_allowed(claims.audience(),ALLOWED_AUDIENCE){` — plus `[I/const-pin]` asserting `issuer_allowed`
is called with `ALLOWED_ISSUERS` and `audience_allowed` with `ALLOWED_AUDIENCE`.

---

## C. Cuts (adopted from /simplify + reviewer M1)

- **C1 — CUT most of T5.** `checkRekeyProfileInvariant`'s `[G8/copy-forward]`, `[G8/two-updates]`,
  `[G8/never-delete]`, `[G8/not-a-reducer]` are weaker JS re-encodings of shipped Rust
  (`ranking_tests.rs:636-646` + `:651-659` backstop; `accounts_tests.rs:1396`; `ranking-security.eval.mjs:188`
  already requires reducer-attr count `===1`). `[G8/tombstone]`'s "≥1 non-alphanumeric char" is a drift-prone
  restatement of `guards::validate_name`, which `ranking_tests.rs:1548` already executes for real.
  ADR-0179 G8 asks only for "a positive fixture proving `rekey_profile` stays green under A2 and doesn't
  change A1's reducer count" — **ship exactly that**, plus B7's value-exact tombstone-arg pin (the one
  genuinely uncovered hole). Drop mutations M15/M16 (they trip pre-existing Rust tests, so RED proves
  nothing about the new clause).
- **C2 — CUT `[A/2b]` iter-ban, `[A/2d]` AnonymousViewContext, `[A/2e]` no-`Vec<`, `[A/2f]` `Option<Account>`.**
  Given `[A/2c]`'s exact body pin these are compiler-forbidden; `wallet-privacy.eval.mjs:12-19` keeps them
  as *parser guards*, a rationale discharged once in the file that owns `parseViews`' health. Merge
  `[A/2a]` into `[A/2c]` (view-exists + exact-body = one clause, two messages).
- **C3 — CUT `[A/3c-forged-ctx]`, `[A/hidden]`, `[A/M2-shortform]` (and mutation M3).** All three already run
  **tree-wide** in `wallet-privacy.eval.mjs` (`:469-481`, `:327`, `:343`) over the whole concatenated non-test
  glob (`:1221-1238`), which includes `schema.rs` and `accounts.rs`. M3 would go RED under wallet-privacy
  regardless of what M21c ships. Replace with an OWNERSHIP line in the header (idiom `wallet-privacy:23-43`).
  *(Also: `[A/hidden]` as drafted false-REDs the moment `#[spacetimedb::view(` appears in a doc comment —
  it already does at `docs/adr/0179:153`.)*
- **C4 — CUT `[G12/no-format]`** — the draft itself calls it non-load-bearing, and `accounts_tests.rs:913`
  already bans `format!` inside every `log_reject` span. (Also avoids reviewer M3's `.to_string()` false-RED.)
- **C5 — CUT `[I/order]`.** No security rationale in a JS checker that does no branch-window analysis. Direct
  precedent for cutting exactly this: `accounts_tests.rs:962-964` ("Per /simplify: NO guard-ordering pin
  here — ordering has no security rationale").
- **C6 — CUT T7's `>= 20` count guard and the per-file non-empty guard.** There are exactly 20 non-test files
  today — zero headroom, false-REDs on the first legitimate module removal. The **anchor-set guard alone**
  is the whole non-vacuity story.
- **C7 — CUT the Q2 doc-tie** (assert `**D6 —` occurs once in RAW ADR text + verbatim helper-path matching).
  A doc-freshness check wearing a security gate's clothes: fails on a legitimate reword, passes on a wrong
  manifest. The manifest const is the SSOT; B-section code cross-checks keep it honest.
- **C8 — CUT the `hasProfileAccess` extraction (T5) and the `ACCESSOR_BYPASS_ALLOWLIST` const extraction as
  the PRIMARY mechanism.** `checkExactlyOneNameReducer` (`ranking-security.eval.mjs:185`) is *already* a pure
  `src`-taking function — the A1 fixture needs no refactor. A2 already covers `accounts.rs` automatically
  (`findProfileAccessOutsideRanking` walks `readdirSync`), so prove it with the LIVE mutation instead of
  extracting a predicate to fixture it. **Keep** a minimal named allowlist const only because the spec §4
  checkbox explicitly contracts for "a negative assertion that `accounts.rs` is not added to the
  ACCESSOR_BYPASS allowlist" — ship it as a cheap belt, and be honest in the header that the load-bearing
  part is B6's exact-path matching + the live-scan-set assertion (reviewer L4: additionally assert the live
  scan set CONTAINS `'accounts.rs'` — one line, unbypassable, also covers a `readdirSync` recursion regression).

---

## D. Final task list

| T | File | Content |
|---|---|---|
| T1 | `evals/account-privacy.eval.mjs` (NEW) | hardened `stripRustSource` (B1 a–e) + `compactWs`; `[A/2c]` exact body pin (merged 2a); `[A/priv-account|guest-claim|sched]` **per-file strip, fail-loud** (`guest_claim_reaper_schedule` lives in `accounts.rs:489`, NOT schema.rs — reviewer M4); `[A/view-set]` exact view-inventory pin (A3); `[C/*]` bindings via injected `fsProbe`; `[A/0-table]` non-vacuity |
| T2 | same file | G12: `[G12/scope]` (fail loud on empty extraction), `[G12/not-literal]` **on every arg** (B4), `[G12/value-pin]` exact `===` set equality, `[G12/claim-binding]` binding-tracking |
| T3 | `evals/guest-claim-integrity.eval.mjs` (NEW) | same stripper; G2 `[R/name-set]` + per-param wire-type check + scheduled-reducer carve-out + `Identity::from_*` ban (B2); G3 `[I/anon-first]` (explicit token set `{accounts::, ctx.db., Err(}` — reviewer M2), `[I/anon-no-err]`, `[I/iss]`, `[I/aud]` exact guard-shape pin + `[I/const-pin]` (B8), `[I/before-insert]`; G4 `[N/rng]`/`[N/random]` |
| T4 | same file | G5 `[W/write-target]` + `[W/split-binding]` + `[W/handle-type]` + chain-char span + `[W/battle-literal]` + `[W/non-vacuous]` (B5); G11 `[S/count]` + `[S/arg-pin]` + `[S/depth0]` + `[S/success-region]` (B3) |
| T5 | same file | **G6 via `import { parseTableSchemas } from './battle-schema-snapshot.eval.mjs'`**: `[G6/declared]` every `Identity`/`Option<Identity>` column has a manifest policy; `[G6/live]` every manifest key resolves to a live column (bidirectional); `[G6/consumed]` each REKEY entry's `rekey` needle in `rekey_all` (`accounts.rs:221-229`) **and** its `exists` needle in `account_has_game_data` (`:209-216`) — *the second half is the only part not already covered*; `[G6/anchors]` `{account.identity, playtest_event.identity, profile.identity, player_wallet.owner_identity}` resolve and `playtest_event`→EXEMPT |
| T6 | `evals/ranking-security.eval.mjs` | **squash whitespace in C1a/C1b** (A2 corollary); A1-GOOD + A2 fixtures per ADR G8's literal text; `[G8/tombstone-arg-pin]` value-exact second-update argument (B7) |
| T7 | `evals/currency-integrity.eval.mjs` | allowlist match → **exact relative path** (B6); live-scan-set must CONTAIN `accounts.rs`; minimal `ACCESSOR_BYPASS_ALLOWLIST` const + `[6b/allowlist-negative]` element-wise `!==` (spec-checkbox contract, honestly labelled as a belt) |
| T8 | `server-module/src/pvp_tests.rs` | `m17a_rl2_profile_never_deleted_scan`: **recursive** `read_dir` from `concat!(env!("CARGO_MANIFEST_DIR"),"/src")` (precedent `:1157`), drop `*_tests.rs`; **squash whitespace before needle match** (reviewer H1 — the real gap); anchor-set guard only (C6); needle-2 `ranking.rs` exemption **scoped** to the exact `match ctx.db.profile().identity().find(` form, not blanket; fix the stale `:1411-1415` comment; `.expect(...)` on every read (no silent `continue`) |
| T9 | docs | `docs/adr/0179-*.md` **body-only** Amendments: G6 ships in M21c w/ manifest in the eval + `parseTableSchemas` reuse; the **G9 mechanism deviation** (derive vs hardcoded `include_str!` — reviewer M5, ADR's literal text says "hardcoded"); D6's stale "Self-scan note" (`:321` says the manifest must land in m21a — it did not); named residuals. `ARCHITECTURE.md` eval inventory (+2). **No `CHANGELOG.md`. No `docs/adr/README.md`.** |

**No `docs/knowledge/**` regen** — M21c changes no schema. **No `evals/run.mjs` edit** — `:11` auto-globs.

## E. Mutation set (live-source; orchestrator executes + reverts PER FILE, never a directory checkout)
`M1` `[A/2c]` (decoy line in `schema.rs:710`) · `M2` `[A/priv-guest-claim]` (`schema.rs:722` `, public`) ·
`M5` `[G12/not-literal]` rename evasion · `M5b` `[G12/not-literal]` **arg-1** leak (B4) · `M6` `[G12/value-pin]` ·
`M7` `[R/identity-param]` · `M7b` `[R/name-set]` add reducer `adopt_guest` w/ `Identity::from_hex` (B2) ·
`M8` `[I/anon-no-err]` (`lib.rs:205`) · `M9` `[I/aud]` (delete audience block — **also delete the now-unused
const or clippy reds for the wrong reason**) · `M9b` `[I/aud]` empty-aud short-circuit (B8) ·
`M10` `[N/rng]` · `M11` `[W/write-target]` · `M11b` `[W/split-binding]` (B5 evasion) ·
`M12` `[W/battle-literal]` (**needs `use crate::schema::battle;`**) · `M14` `[S/success-region]` ·
`M14b` `[S/arg-pin]` `guest`→`me` (B3) · `M18` existing ACCESSOR_BYPASS names `accounts.rs`
(**needs `use crate::schema::player_wallet;`**) · `M20` T8 widening names `accounts.rs`
(**needs `use crate::schema::profile;`**) · `M20b` rustfmt-WRAPPED profile delete (proves the A2-corollary
squash) · `M21` T8 anchor-set guard · `M22` **delete `crate::npc::has_quest_or_dialogue_state(ctx, identity)`
from `accounts.rs:214`** → `[G6/consumed]` fires (*the one invariant nothing in the repo covers today*) ·
`M23` stripper-desync PoC const (B1) → the desync self-check must fire.
**Dropped:** M3, M4, M13, M15, M16, M17, M19 (each duplicated by an existing gate or by a stronger sibling).
**Rule:** every mutation is verified by running the SPECIFIC eval and asserting the TAG appears in the detail
string — never "CI went red" (reviewer M7).

## F. Anti-patterns (unchanged from the draft §4, plus)
`new RegExp()` banned (Semgrep `detect-non-literal-regexp`) · no `*_KEY`/`*_TOKEN`/`*_SECRET` fixture names
beside high-entropy literals (**gitleaks is remote-only**; build the 64-hex fixture as
`'0123456789abcdef'.repeat(4)`) · exact `===`, never `.includes`, where equality is meant · every checker
needs a GOOD fixture (an always-red checker is indistinguishable from a working one) · BAD fixtures assert
by **tag**, not "some error" · strip **per file**, never a concatenated blob · **revert mutations by inverse
per-file edit, never `git checkout -- <dir>`** (harness memory: it silently wipes a live subagent's work).

## G. Named residuals (flag, do NOT touch — outside `touches:`)
1. `server-module/src/evolution_tests.rs:2591-2604` — hardcoded 10-file `scheduled_scan_sources()` **already
   under-covers**: `accounts.rs` hosts the scheduled `guest_claim_reaper` (`:489`,`:505`) and is absent, so
   EG2-9's invariant does not scan it. Same derive-from-`read_dir` fix.
2. `accounts_tests.rs:1581` — `write_target_accessors`' unbounded `rfind` (the Rust twin of B5); false-RED
   risk. *(Sibling `*_tests.rs` of a declared file is technically in-scope — take it ONLY if free.)*
3. Several server-module scan evals strip `//` comments BEFORE strings — a real OQ1 issuer URL trips it
   (`accounts.rs:41-48`). Making those strippers literal-aware is a separate slice.
4. `accounts_tests.rs:1517` G2 / `:918` G12 hardcoded lists — blind to a NEW reducer / a renamed binding
   (B2/B4). M21c's JS gates cover this; the Rust twins should be brought up to parity.
5. Harness spec §4 M21c checkboxes — the spec lives in the **harness** repo, not monster-realm, so it cannot
   be in this PR. **Supervisor ticks them at merge.**

## H. Toolchain
PATH: `export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"`.
Package `monster-realm-module`; fast gate `just ci-fast monster-realm-module`; eval only: `node evals/run.mjs`.
Run `just lint` BEFORE the mutation round so lint noise cannot masquerade as a red gate.
