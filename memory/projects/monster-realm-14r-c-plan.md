# 14r-c — Scanner-migration wave onto rust-scan — PLAN

Branch `feat/14r-c-scanner-migration`, worktree `.claude/worktrees/14r-c`, off master `be8a612`.
ADR reserved: **0186**. Budget $60.

## Right-sizing (decided)

**IN:** the 11 `*-security`/`*-privacy` evals still on the naive strip, + a new
RED-first measurement gate, + residual (a). Closes EARS-2 **fully** and EARS-1 for
the migrated set.

**PARKED as 14r-c-2:** residual (b) BOTH halves + the 20-file non-security tail.
- (b) part 1 (`scan_helpers` in `lib.rs` + 11 `*_tests.rs`) is in `touches:` but is
  pure dedup with **zero EARS progress**, a different toolchain and a 12-file blast
  radius — YAGNI for this slice.
- (b) part 2 (trade-size cap → `guards.rs`) is a **HIDDEN DEPENDENCY**: requires
  `server-module/src/trading.rs` + `guards.rs`, both OUTSIDE the declared `touches:`
  set. Flagged for supervisor re-serialization; NOT attempted.

## Corrections to the brief (verified at slice head)

1. `currency-integrity` + `ranking-security` are **already fully migrated** (kept
   wrapper names over `stripRustSource`). EARS-2 set is **11, not 13**.
2. `playtest-event-privacy.eval.mjs:36` imports `stripComments`/`parseTables` from
   `encounter-privacy` — `*-privacy`-named and *transitively* naive. A "defines its
   own regex" measurement cannot see it. Closes for free IF those export names survive.
3. `trade-escrow-guards` is `*-guards`-named → already outside the name predicate.
   **No exclusion clause needed** — inventing one is what would create a permanent hole.
4. Cross-file export contracts that MUST survive:
   - `gate-teeth.eval.mjs:86-116` pins 4 `recruit-reducer-security` exports.
   - `zone-warp-server-runtime.eval.mjs:50` imports `stripRustStrings` from
     `battle-reducer-security` — and zone-warp is PARKED, so the symbol must survive.
   - `playtest-event-privacy.eval.mjs:36` (above).
5. 12 duplicated Rust `strip_rust_comments` helpers exist, not ADR-0166 R5's claimed 4.

## Task 0 evidence (measured, orchestrator-run)

`compactWs(naive comments→strings)` vs `compactWs(stripRustSource)` over all 39
`server-module/src/*.rs`: 18 identical, 17 differ but anchor-neutral, **4 where the new
stripper sees FEWER anchors — all 4 are `*_tests.rs`** (`accounts_tests`,
`evolution_tests`, `npc_tests`, `observability_tests`), where the anchors sit inside
fixture STRING literals. Blanking them is CORRECT (ADR-0181 already measured "7 phantom
anchors across 9 files" from exactly this). **Zero non-test files regress**, and the
migrated evals scan non-test sources only ⇒ the migration is behavior-neutral on the
real ban surface. `compactWs` removes ALL whitespace, so blank-vs-delete collapses
identically for every compacted needle.

## PLAN REVIEW RESOLUTIONS (reviewer + red-team, both ran pre-implementation)

The gate design below is **superseded** by these resolutions. Recorded because the
original design shipped a PoC'd false-GREEN.

- **[CRITICAL, red-team, PoC'd] Export-reflection Leg 2 is defeated by dead code.**
  A file that adds a correct-but-never-called `stripCanaryOnly` export while the real
  ban clause keeps a private unexported naive helper passes both legs and stays blind.
  **RESOLUTION — Leg 2 is replaced by a REACHABILITY requirement:** each migrated eval
  must carry an **in-file ADR-0181 canary tooth** — a fixture whose Rust text holds an
  issuer-URL literal followed by a genuine violation — asserted through **the eval's own
  ban clause**, i.e. its real `default()` code path. Export reflection is abandoned: it
  is a side channel a decoy satisfies independently. The audit gate verifies the canary
  tooth is WIRED; the eval's own suite (already run by `run.mjs`) executes it.
- **[HIGH, red-team] The name predicate is not an anti-hole property.** Already-naive,
  security-relevant evals escape it today: `trade-escrow-guards:37`, `pvp-handshake-guards:34`,
  `trade-conservation:27`, `no-idle-accrual:142`, `pvp-challenge-reaper:34`,
  `pvp-deadline-disconnect:31`, `ranking-pve-exclusion:91`. **RESOLUTION —** ENFORCE on the
  name set (18 files); additionally **REPORT** the content-detected set (any eval reading
  `server-module/src` that defines its own strip helper) and **ratchet the migrated count
  monotonically** so the tail can only shrink. Drop the "anti-hole" claim; disclose the
  gap honestly in ADR-0186 in ADR-0181's own residual style.
- **[HIGH, red-team] `KNOWN_UNMIGRATED` can deadlock across slices.** If
  `trade-escrow-guards` were listed and 13r-c-2 then migrated it, this gate REDs on a file
  13r-c-2 has no reason to touch and 14r-c has already shipped. **RESOLUTION —** teeth-checked
  invariant: **every debt entry must be a member of the name-derived gated set**, making the
  offending entry structurally impossible.
- **[HIGH, red-team] Leg 1 is spoofable by a string-literal decoy** — `stripTsComments` is
  literal-PRESERVING by design (ADR-0181 D4), so a decoy string containing the import text
  satisfies a substring check. **RESOLUTION —** anchor the import check per-LINE to a real
  static `import` statement, and run the presence checks over a literal-**blanking** pass.
- **[BLOCKER, reviewer] Task 0's "non-test sources only" premise is FALSE** for
  `encounter-privacy:333`, `inventory-privacy:623`, `wild-individuality-privacy:426`
  (unfiltered `glob('server-module/src/**/*.rs')`) and `raising-reducer-security:2219-2227`.
  Contrast `evolution-reducer-security:1666-1677`, which DOES filter `_tests.rs`.
  **RESOLUTION —** the behavior-neutrality claim is re-grounded: the 4 anchor-losing files
  are all `*_tests.rs` and the lost anchors sit inside fixture STRING literals (phantoms,
  exactly ADR-0181's "7 phantom anchors across 9 files"). Verify empirically per file that
  each eval still passes AND its proof-of-teeth still bite — the teeth are the real proof,
  not the premise.
- **[MEDIUM, red-team, PoC'd] Residual (a) is NOT unambiguously safe.** Dropping `}`
  re-opens ADR-0181 D8 for the compound shape `} /ab/* … */` — measured
  `FROM player_wallet survives WITH } : true / WITHOUT } : false`, i.e. a live false-GREEN
  on an ADR-0015 leak ban. It is dormant in both corpora today but nothing pins it.
  **RESOLUTION —** implement the spec's direction (drop `}`), AND add a standing corpus
  tooth asserting no `}`-then-regex-abutting-`*` construct exists in the scanned corpora,
  converting the dormancy measurement into an enforced property. Record the trade-off in
  ADR-0186.
- **[MEDIUM, red-team] The cited residual-(a) tooth is vacuous as stated.** `x = {} / 2 / 3`
  produces byte-identical `code`/`literals` either way, because `m20cScan` keeps swallowed
  text verbatim (`main.wiring.test.ts:7953-7973`) — a misdetected division is relabeled, not
  deleted. **RESOLUTION —** the tooth must place a needle INSIDE the misdetected span
  (`x = {} / "keep-me" / 3;`) and assert against `.literals`.
- **[MEDIUM, red-team] T2's `>= 15` floor has 3 files of slack** vs the true count of **18**.
  **RESOLUTION —** monotonic ratchet at 18, not a static floor.
- **[reviewer, /simplify] Leg 3 is deleted.** Explicitly non-load-bearing by its own design,
  and an unclosable literal blacklist of exactly the shape this repo has been burned by.
  Both lenses agree. T1–T6 otherwise kept: no redundancy found.
- **[reviewer] Tier 1's "already blanking" label is wrong** — all four strip comments only,
  with zero string handling. LOW risk because of what the needle targets, not because they blank.
- **[reviewer] `shop-reducer-security:53-55` `stripRustStrings` is length-CHANGING**
  (`"…"` → `""`), violating ADR-0181 D2's offset-preservation. Confirm no raw-offset consumer
  before swapping the engine for criteria 6-7.

## Gate design — `evals/scanner-migration-audit.eval.mjs` (RED first) — AS ORIGINALLY DRAFTED, see resolutions above

- **Name-derived gated set**, never a hardcoded list: `readdirSync('evals')` +
  `endsWith('-security.eval.mjs') || endsWith('-privacy.eval.mjs')`. A future
  `*-security` eval is gated the day it lands. This is the anti-hole property.
- **Leg 1 (structural):** over `stripTsComments`-stripped source, require a static
  `./rust-scan.mjs` import AND an `assertStripperSound(` call site. Stripping first
  kills the commented-out-import decoy.
- **Leg 2 (behavioral — the real teeth):** `await import()` each gated file, reflect
  over `Object.keys(mod)`, and for every export named `strip*`/`scan*`/`prepare*`/
  `blank*`, feed an ADR-0181 canary (an issuer-URL literal + a `ctx.db…delete(` needle,
  built from `String.fromCharCode`). Assert **length preserved** (kills delete-based
  strippers) and **code needle survives** (kills comment-before-string ordering).
  Reflection over ALL exports closes "add a fresh naive helper beside the migrated one".
- **Leg 3 (defence-in-depth, explicitly labelled NON-load-bearing):** literal-fragment
  count over comment-stripped source, string-literal occurrences exempt. Header states
  legs 1+2 are the contract — an unlabelled blacklist invites future reliance.
- **`KNOWN_UNMIGRATED` self-retiring debt** (not an exclusion): each entry must exist on
  disk, must STILL FAIL leg 2 (**migrated ⇒ gate REDs demanding the entry be deleted**),
  and `length <= 1`. Cap shape mirrors 14r-a's named debt.
- **Teeth:** T1 injected-naive-stripper; T2 gated-set `>= 15` (vacuity: empty
  `readdirSync` on wrong cwd); T3 commented-import decoy; T4 fixture-literal decoy;
  T5 debt self-retirement (point an entry at an already-migrated file → RED);
  T6 synthetic `zzz-security.eval.mjs` classifies as gated (proves not a list).
  `detail` prints `N gated / M migrated / K debt` so the measurement is legible in CI.
- Auto-wired by `run.mjs` glob discovery — no `ci.yml`/`lefthook.yml` edit.

## Migration shape

Exemplar `ranking-security.eval.mjs:103-105` / `currency-integrity.eval.mjs:72-74`:
**keep the local wrapper name, swap only the engine underneath.** Downstream needle
call sites stay out of the diff — that is what makes 11 files reviewable in one pass.

## Risk tiers

- **Tier 0 — residual (a):** drop `}` from `startsRegexLiteral`'s preceding-char set at
  `conversation-privacy.eval.mjs:129` + `main.wiring.test.ts:~7924`. Measured **dormant
  in both corpora** (both scanners consume template literals wholesale, so `${x}/` is
  never seen in CODE mode). Trade-off for the ADR: drops recognition of a
  statement-position regex after a block `}` — under-detection is the documented-safe
  direction (ADR-0181 D8). Tooth = scanner unit fixture `x = {} / 2 / 3; "keep"`.
- **Tier 1 (LOW, already blanking):** `encounter-privacy`, `inventory-privacy`,
  `wild-individuality-privacy`, `pvp-action-privacy`. Check: no needle targets text
  living inside a Rust string literal (would go vacuous). Keep `encounter-privacy`'s
  `stripComments`+`parseTables` exports.
- **Tier 2 (MED):** `evolution-reducer-security`, `raising-reducer-security` — already
  have an offset-preserving blanker; `stripRustSource` is strictly stronger (their
  `blankStringLiterals` has no `cr"…"` arm). Confirm every live site goes through
  `prepareRustSource`.
- **Tier 3 (HIGH):** `trade-reducer-security` (4 coupled un-compacted call sites,
  `:426-429` says convert together), `battle-reducer-security` (parked-consumer export),
  `recruit-reducer-security` (gate-teeth 4-export contract),
  `npc-dialogue-quest-security` (lowest-risk T3), `shop-reducer-security` = **park
  valve**: `:63-70` deliberately splits criteria 1–5 (comments-only) from 6–7; if
  migrating flips criteria 1–5, it parks and becomes the 2nd debt entry (cap → 2).

## Ordering

Serial first: Task 0 (done) → audit eval RED-proved by the orchestrator (the `tester`
has no Bash). Then fan out 3 disjoint specialists (T1 / T2 / T3a), then serial single
owner for the judgment files (battle, trade, shop) + residual (a). Never two agents in
one worktree at once; never two `just eval` runs concurrently (account-e2e holds a
global spacetime lock). Docs last.

## Anti-patterns

Weakening an existing eval's assertions to make a migration pass (any weakened
assertion must be named + measured in the ADR); a vacuously-green audit gate;
hunk-splitting a file's call sites; touching `trade-escrow-guards`; hand-editing
`CHANGELOG.md` or `docs/adr/README.md`; deleting an export a parked file imports;
pointing `stripRustSource` at TypeScript (ADR-0181 D4); writing hazard characters
contiguously in new file text (use `String.fromCharCode`); assuming local green ⇒
remote green (gitleaks + Semgrep are remote-only).
