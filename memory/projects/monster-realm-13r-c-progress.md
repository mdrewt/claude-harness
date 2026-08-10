# 13r-c — progress memo

Branch: `feat/13r-c-string-aware-rust-scan` · worktree `.claude/worktrees/13r-c`
Base: `origin/master` @ `30922ca` · ADR: `docs/adr/0181-string-literal-aware-source-scanners.md`

## DONE

- **`evals/rust-scan.mjs` (new, 516 lines)** — SSOT string-aware Rust scanner.
  Extracted from the two verbatim ~450-line copies; took guest-claim's
  **angle-aware `splitArgs`** (the diverged, stricter copy). 12 exports;
  `matchRawString` / `STRIP_ANCHORS` / `independentAnchorCount` kept private
  (no external consumer).
- **Dedupe** — `account-privacy.eval.mjs` 2024→1579, `guest-claim-integrity`
  3524→3075. Both re-run GREEN with byte-identical detail strings.
- **`currency-integrity`** — routed to `stripRustSource`; teeth T1a/T1b green.
  Plus a red-team **BLOCKER fix**: `walletTableIsPrivate` anchored on a raw
  `indexOf('name = player_wallet')`, so a `#[doc = "name = player_wallet"]`
  decoy on any earlier table made a genuinely `public` wallet report PRIVATE.
  Now `parseTables(stripRustSource(...))` + select by parsed name. PoC closed.
- **`ranking-security`** — `stripBoth`/`scanCode` kept as aliases over the shared
  scanner (~25 call sites untouched); tooth T2 green; stale header prose fixed.
- **`conversation-privacy`** — `stripComments` → **`stripTsComments`**, a
  single-pass TS scanner that strips comments ONLY and keeps literal payloads
  VERBATIM. Rust call sites → `stripRustSource`.
- **`wallet-privacy`** — imports split per language; **F18 re-pointed**
  `[B/F5-hidden]` → `[B/3a]` (the forged-comment attack is now closed at the
  lexer, so the count tripwire correctly stays silent and the real clause sees
  the leak directly — strictly stronger).
- **Stripper-soundness gates** in 4 evals — `assertStripperSound` per file,
  **NON-TEST only** (the desync detector is quote-blind, so `*_tests.rs` fixture
  strings holding `#[spacetimedb::` produce 7 phantom anchors).
- **`client/src/main.wiring.test.ts`** — `stripLineComments` delegates to the
  string-aware `m20cScan`; `stripBlockComments` deleted; **0 of 78 call sites
  edited**. New per-file anti-truncation guard in the offenders loop keyed on
  **newline count**, not a size ratio (measured: newline count is preserved
  exactly across all non-test `client/src/**/*.ts`, whereas `interpConfig.ts`
  legitimately strips to 8.5% of raw). 12 comment sites corrected that cited the
  deleted bail-and-drop behaviour as a live property.
- **Semgrep round-trip avoided** — `detect-insecure-websocket` matched the
  websocket-scheme token inside COMMENT text (6 blocking findings, all in prose
  this slice added). Rewritten, not suppressed. Repo-wide re-run: 517 rules /
  990 files / **0 findings**.

## GATES (all local, all green)

- `just ci` → **exit 0**
- `node evals/run.mjs` → **83 PASS / 0 FAIL** (baseline was 83)
- `cd client && npx vitest run` → **76 files / 2163 tests pass**
- Semgrep repo-wide → 0 findings · gitleaks (8 commits) → no leaks

**RED proof captured for every tooth before its fix** (orchestrator-run, since
the `tester` has no Bash): T1a/T1b, T2, T3a, T3b each returned a specific
false-GREEN failure message; T4 was 3 failed / 163 passed in vitest.

## STATUS: TERMINAL — PR OPEN

**https://github.com/mdrewt/monster-realm/pull/309** — local `just ci` green,
remote CI running. `gh pr merge` NOT run (supervisor-owned).

All three implementation lenses closed:
- **verifier: PASS** — re-ran every gate; proved each tooth bites by reverting
  only the fix in a /tmp copy; confirmed no test deleted/skipped/loosened and
  that the ~900-line dedupe is a pure move.
- **reviewer: no blockers**, 2 MAJOR + 3 MINOR — all closed (gate scope, SSOT
  dedup of compactWs/countOccurrences, comment truthfulness in 4 files, scanner
  known-limits documented).
- **red-team: 1 BLOCKER + 2 MAJOR** — BLOCKER closed (regex phantom block
  comment, below); one MAJOR was the same gate-scope issue already fixed; one
  MAJOR disclosed as a dormant residual in ADR-0181.

### Red-team BLOCKER, closed
A regex literal whose CLOSING slash abuts a `*` (`const RE = /ab/*` … `1 */ 2;`)
formed a phantom block-comment opener in BOTH TS scanners, swallowing every line
to the next `*/`. Reproduced: `checkNoPrivateWalletSubscription` returned PASS on
a live banned `FROM player_wallet` subscription, and the newline-count guard was
structurally blind to it. Fixed with a SOUND rule — regex literals are consumed
before the comment arms, but only where a binary `/` is impossible (after
`= ( , [ { : ; ! ? & | + - * % < > ^ ~ }` or start of source). Teeth
`[13r-c/T3c]` + `W-CMT-STRIP-REGEX-PHANTOM-BLOCK` added; both verified to bite.

## BLOCKERS / PARKED → `13r-c-2`

**The `accounts.rs` `concat!()` removal is PARKED — hidden dependency, measured.**
Patching `accounts.rs:48` to the bare `"https://auth.monster-realm.invalid/"`
literal fails **exactly one** eval:

```
eval FAIL: trade-escrow-guards — TR-11: function `start_battle` not found
```

`evals/trade-escrow-guards.eval.mjs` is **NOT in 13r-c's `touches:`**. It
concatenates every `server-module/src/*.rs` into ONE blob (`accounts.rs` sorts
first), strips comments BEFORE strings, so line 48 loses its closing quote and
the orphan inverts quote polarity for the whole crate. Needs a `touches:`
amendment; 13r-h is `after: 13r-c` for overlapping `accounts.rs` edits.

Carry to 13r-c-2: `accounts.rs:48` + its `:33-48` hazard comment, the
`[A/issuer-literal]` regression tooth, and migrating `trade-escrow-guards` onto
`rust-scan.mjs`.

## DISCLOSED RESIDUAL (recorded in ADR-0181)

Measured across `evals/*.eval.mjs`: **26** evals strip `//` with no string pass
at all; **9** have a string pass running after the comment strip. This slice
fixes 3. **~24 + ~8 remain**, several named `*-security` / `*-privacy`. Most are
per-file scrubbers (bounded blast radius); the dangerous shape is the
whole-crate-blob scanner.

## FLAG (pre-existing, not caused by this slice)

`Nightly` workflow `mutation-server` job has been failing on master since
2026-08-09 07:53 (run 31302216601). Off the PR path per `AGENTS.md`; master's
own CI is green.

## NOTES FOR A RESUME

- Toolchain PATH is mandatory:
  `export PATH="$HOME/.cargo/bin:$HOME/.asdf/installs/nodejs/24.13.1/bin:$HOME/.asdf/installs/just/1.55.1/bin:$PATH"`
- ADR-0181 leaves `**Amends:**` EMPTY on purpose: the digest gate demands a
  reciprocal `**Amended-by:**` in ADR-0179/0180, both outside `touches:`.
  Whoever owns them next should add the back-links.
- Do NOT `git stash` in the worktree while a subagent is writing (nearly bit
  this run).
