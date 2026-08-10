# 13r-c — String-literal-aware source scanners — PLAN

Branch: `feat/13r-c-string-aware-rust-scan` · worktree `.claude/worktrees/13r-c` · base `origin/master` @ `30922ca`
ADR: `docs/adr/0181-*` (supervisor-assigned 181)

## Scope decision (MEASURED, not assumed)

**The `accounts.rs` `concat!()` removal is PARKED as `13r-c-2` — hidden dependency.**

Empirical probe (node 24.13.1, full `node evals/run.mjs`): patching
`accounts.rs:48` to the bare literal `&["https://auth.monster-realm.invalid/"]`
makes **exactly one** eval fail:

```
eval FAIL: trade-escrow-guards — TR-11 (party + opponent loops):
  function `start_battle` not found in server-module/src/ — reducer may have been renamed
```

`evals/trade-escrow-guards.eval.mjs` is **NOT in this slice's declared `touches:`**.
Its scanner concatenates every `server-module/src/*.rs` into ONE blob
(`:114 readAllRustSources`, `accounts.rs` sorts first), strips comments FIRST
(`:36`), then strings (`:50`), so line 48 loses its tail to the `//`, leaving an
unmatched `"` that the pairing regex marries to the next `"` in the whole crate —
polarity inversion for every later file. This is verbatim the TR-11 incident that
`accounts.rs:43-45` already documents.

Per the slice rules a required file outside `touches:` is a STOP, so Phases 0–4 + 6
land as 13r-c and Phase 5 is parked for the supervisor to re-serialize.

## What LANDS in 13r-c

1. **NEW `evals/rust-scan.mjs`** — SSOT Rust scanner, ported from
   `account-privacy.eval.mjs:182-527` + `:759-884`, with the **angle-aware**
   `splitArgs` body from `guest-claim-integrity.eval.mjs:624-650` (the two copies
   HAD diverged — ADR-0179 §9's claim verified true by diff).
   Exports: `DQ`, `SLASH_STAR`, `STAR_SLASH`, `compactWs`, `countOccurrences`,
   `isWordChar`, `containsIdent`, `matchRawString`, `stripRustSource`,
   `STRIP_ANCHORS`, `independentAnchorCount`, `assertStripperSound`,
   `findFnBody`, `splitArgs`, `findCalls`.
2. **`currency-integrity.eval.mjs`** — delete `stripRustComments` (:48), 10 call
   sites → `stripRustSource`, add `assertStripperSound` on the live scan.
3. **`ranking-security.eval.mjs`** — delete `stripRustComments`/`stripRustStrings`/
   `compactWs`/`countOccurrences`; keep `stripBoth`/`scanCode` as aliases so ~25
   consumers stay untouched; header truthfulness fix at :50-68.
4. **`conversation-privacy.eval.mjs`** — `stripComments` → **`stripTsComments`**,
   rewritten as a single-pass, length-preserving, literal-PRESERVING TS state
   machine; Rust call sites move to `stripRustSource`.
5. **`wallet-privacy.eval.mjs`** — import split per the call-site table; delete
   duplicate `compactWs`/`countOccurrences`; **F18 fixture re-pointed** (the
   forged-comment attack is now closed at the lexer, so `[B/F5-hidden]` correctly
   stops firing for it and a stronger clause fires instead).
6. **`account-privacy.eval.mjs`** / **`guest-claim-integrity.eval.mjs`** — delete
   the ~440-line local copies each, import from `rust-scan.mjs`.
7. **`client/src/main.wiring.test.ts`** — hoist `m20cScan` → `scanTsSource`,
   delegate `m20cScan` to it, rewrite `stripLineComments` to
   `scanTsSource(src).code`, delete the sole-caller `stripBlockComments`.
   **0 of 78 call sites edited.** Plus the offenders-loop collapse guard (:6637)
   and the 9-site anti-vacuity prose truthfulness pass (esp. `:6304-6320`, which
   records ADR-0169 D4's rejection of a TWO-PASS design — the single-pass scanner
   is structurally immune and the prose must say so).

## Critical semantic rule (top risk)

`stripRustSource` **blanks literal payloads** (offset/length preserving).
`stripTsComments` / `scanTsSource` **keep literal text verbatim**.
Using the Rust one on TypeScript would blank `'SELECT * FROM player_wallet'` and
**false-GREEN** `checkNoPrivateWalletSubscription`'s ban. The per-call-site
Rust-vs-TS table is the normative contract.

## Proof-of-teeth (MUST start RED)

T1a/T1b currency-integrity · T2 ranking-security · T3a/T3b conversation+wallet ·
T4 main.wiring.test.ts (`W-13RC-STRIPPER-SELF-TEST`). Each is a `"https://…"`
literal (or a forged `/*` in a literal) followed by a genuine violation LATER that
must still be caught. Hazard sequences built via `String.fromCharCode`, never
written contiguously.

## DISCLOSED RESIDUAL — the bug class is wider than this slice (plan-review finding #1)

Measured across `evals/*.eval.mjs` (script, not eyeball):

- **26 evals** strip `//` comments with **no string pass at all**.
- **9 evals** have a string pass but run it **after** the comment strip (the
  `ranking-security` / `trade-escrow-guards` ordering bug).

13r-c fixes 3 of them (`currency-integrity`, `conversation-privacy`,
`ranking-security`) and consolidates the 2 already-correct ones. **~24 + ~8
remain**, many named `*-security.eval.mjs` / `*-privacy.eval.mjs`. This must be
disclosed in the ADR, the PR body and the handoff so it is tracked forward
rather than silently lost — it is the same false-GREEN class, not a cosmetic
duplication.

Mitigating: most are per-file scrubbers (blast radius bounded to the offending
file) rather than whole-crate-blob scanners like `trade-escrow-guards`.

## Call-site table (normative — Rust vs TypeScript)

| Call site | Argument | Language | → |
|---|---|---|---|
| `conversation-privacy.eval.mjs:238` | `serverSrc` | Rust | `stripRustSource` |
| `conversation-privacy.eval.mjs:276` | `serverSrc` | Rust | `stripRustSource` |
| `conversation-privacy.eval.mjs:392` | `connectionSrc` | **TS** | `stripTsComments` |
| `conversation-privacy.eval.mjs:474` | `connectionSrc` | **TS** | `stripTsComments` |
| `conversation-privacy.eval.mjs:579` | Rust fixture | Rust | `stripRustSource` |
| `wallet-privacy.eval.mjs:307` | `serverSrc` | Rust | `stripRustSource` |
| `wallet-privacy.eval.mjs:344` | `serverSrc` | Rust | `stripRustSource` |
| `wallet-privacy.eval.mjs:544` | `schemaSrc` | Rust | `stripRustSource` |
| `wallet-privacy.eval.mjs:620` | `shopViewSrc` | **TS** | `stripTsComments` |
| `wallet-privacy.eval.mjs:676` | `connectionSrc` | **TS** | `stripTsComments` |
| `wallet-privacy.eval.mjs:1060` | Rust fixture | Rust | `stripRustSource` |

**Measured justification for the split:** `stripRustSource` applied to
TypeScript blanks the ban needle when a SQL literal is DOUBLE-quoted
(`"SELECT * FROM player_wallet"` → payload blanked ⇒ the ban passes vacuously).
It survives today only because the repo's biome style uses single quotes, which
the Rust lexer reads as a char literal and leaves alone. That is luck, not a
guarantee — hence two scanners.

## Notes carried from the plan review

- `parseStrConsts` (`account-privacy.eval.mjs`) **stays local** — it is
  physically inside the ported line range but has no other consumer. (Done: the
  extraction skipped it; it now lives at :427 and still passes.)
- Exports trimmed to 12: `matchRawString`, `STRIP_ANCHORS` and
  `independentAnchorCount` have no external caller and stay module-private.
- Two TS scanners (`scanTsSource` in `client/`, `stripTsComments` in `evals/`)
  is an **accepted toolchain-boundary duplication** — vitest/TS vs node/.mjs.
  `evals/ts-scan.mjs` is the symmetric fast-follow.

## Parked → 13r-c-2

- `server-module/src/accounts.rs:48` `concat!()` removal + `:33-48` comment rewrite.
- The `[A/issuer-literal]` regression tooth in `account-privacy.eval.mjs`.
- **`evals/trade-escrow-guards.eval.mjs`** — needs the same single-pass strip
  (needs a `touches:` amendment from the supervisor).
