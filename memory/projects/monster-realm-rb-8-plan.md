# rb-8 — plan (residual R-m22-s1-X3): expose DELETION_GRACE_MS_DEFAULT to TS via a wasm accessor

Fork: `origin/master` b7ce98a. Worktree `.claude/worktrees/rb-8`, branch `slice/rb-8`.
Lenses run on the PLAN before any test: `planner` (high) + `reviewer` + `red-team` (write-the-cheat),
`/simplify` applied inline by the orchestrator. Both review lenses found BLOCKER-class defects in the
planner's first gate design; the shipped design below is the corrected one.

## The residual, restated

`DELETION_GRACE_MS_DEFAULT: i64 = 604_800_000` lives once at `game-core/src/accounts/deletion.rs:32`.
A later slice S8 (deletion/cancel countdown UX, M22 spec §7.2) has no way to read it: `client-wasm/pkg`
exports 10 functions and none of them is this constant, and the schema carries only
`deletion_requested_at_ms`. The path of least resistance for S8 is therefore a second, hand-typed
TypeScript literal that silently drifts the moment the operator resolves spec §8.1 escalation #1 and
replaces the placeholder 7 days.

MEASURED on the fork: **no TS file hardcodes the literal today**. `grep -rn "604_800_000\|604800000"`
over `*.ts *.rs *.mjs *.js *.md` hits only `deletion.rs:23` (prose) and `:32` (the const);
`grep -rni grace client/src` finds only unrelated "gracefully". The residual is therefore PREVENTIVE
and there is no TS consumer to update. That fact is load-bearing for two decisions below.

## Decisions

**D1 — the accessor.** `#[wasm_bindgen] #[must_use] pub fn deletion_grace_ms_default() -> i64` in
`client-wasm/src/lib.rs`, appended to the existing constant-accessor cluster after `party_slot_none()`
(:196-201), body exactly `game_core::DELETION_GRACE_MS_DEFAULT`. Name keeps `_default` because
`deletion.rs:23-31` is explicit that `_DEFAULT` means "the literal an operator replaces" and NOT that a
runtime override exists; dropping the suffix would assert the opposite to a TS reader. Four in-file
precedents (`step_ms`, `move_queue_cap`, `party_size`, `party_slot_none`) fix the shape.

**D2 — return `i64` (JS `BigInt`), not `u32`/`f64`.** `deletionRequestedAtMs` is
`__t.option(__t.i64())` (`client/src/module_bindings/my_account_table.ts:25`), i.e. `bigint | undefined`
in TS. S8's countdown is `requestedAt + grace - now`; a `number` accessor makes that a runtime
`TypeError: Cannot mix BigInt and other types`, and `main.ts` is coverage-excluded so no unit test would
see it. `u32` additionally caps the window at ~49.7 days, silently truncating an operator who picks 60
days. Measured by red-team: `-> i64` under `--target nodejs` really does arrive as `typeof === 'bigint'`
with value `604800000n`. 64-bit returns are already an established pattern here (`predict_tick -> u64`,
consumed as BigInt at `evals/prediction-parity.eval.mjs:54`).

**D3 — NO game-core change.** The const is already `pub` and root-re-exported (proven externally by
`game-core/tests/m22_s1_deletion_surface.rs:40`). `game-core/src/accounts/deletion.rs` and
`game-core/tests/m22_s1_deletion_surface.rs` are inside `touches:` but end the slice UNMODIFIED — that
empty diff is deliberate, not an omission. Do not touch the value; spec §8.1 escalation #1 is the
operator's call.

**D4 — no TS consumer is added.** None exists to update (measured above), and `client/tsconfig.json:7`
sets `noUnusedLocals: true`, so an unused import fails `just client-typecheck`. The only way to
manufacture a consumer is to write S8's countdown, which is out of scope. Reachability is instead proven
EXECUTABLY: the gate builds the wasm and calls the export from Node (`[G3]`), which is a strictly
stronger claim than an import statement (house card:
`self-source-needle-proves-presence-not-reachability`).

**D5 — the two `vi.mock` factories DO get the new key.** `client/src/main.battle-reseed.test.ts:64-78`
and `client/src/main.a11yFocus.test.ts:99-123` both carry the comment "every name main.ts imports, plus
the [three] other exports of the real module (a sibling importer of the same specifier must not get
`undefined`)". Shipping an 11th export without updating them leaves that documented invariant silently
false and hands S8 a `deletion_grace_ms_default is not a function` under a shared module mock, with no
obvious link back to this slice. Two lines, both files inside `client/src/**` (declared `touches:`).
A *mechanical* mock-vs-pkg exhaustiveness gate is a different concern and a new gate class — recorded as
a follow-up flag, not built here (YAGNI).

**D6 — the gate lives in ONE new eval file, `evals/deletion-grace-wasm-ssot.eval.mjs`.** In-scope by
necessity, declared as `touches-delta`: the residual's own text makes a gate a required deliverable, the
file is auto-discovered by `evals/run.mjs:11` so it forces ZERO edits to any shared suite, and a
brand-new uniquely-named file cannot collide with a concurrent sibling.

## The gate — corrected after two review lenses

The planner's first design had two defects both lenses independently measured; both are fixed here.

**FIXED-1 (both lenses, BLOCKER): the `files >= 100` anti-vacuity floor was dead on arrival.** The real
scanned population is 188 (`client/src/**/*.ts` minus `module_bindings/**`), or 92 if `*.test.ts` is also
excluded as first drafted — under the floor. A correct implementation would have shipped permanently
RED. Floor is now `>= 150`, measured, with the count printed.

**FIXED-2 (red-team, CRITICAL): a full 5-clause bypass.** `\{([^}]*)\}` is not brace-matching, so

```rust
pub fn deletion_grace_ms_default() -> i64 {
    let _ = { game_core::DELETION_GRACE_MS_DEFAULT };
    0x240c_8400i64
}
```

captured only `"let _ = { game_core::DELETION_GRACE_MS_DEFAULT "` — delegate substring present, no digit,
no `*`/`+` — and passed G1; passed G2/G3; passed G4 because the hex literal *equals* the current value;
and passed G5 because none of the five enumerated decimal regexes match hex. rustfmt-stable and
`clippy -D warnings` clean (the bare-block form is caught by `clippy::no_effect`, but `let _ = {...};`
evades it). That is exactly the SSOT drift this slice exists to prevent, fully green. Two changes kill it:

- **G1 becomes an EXACT-SHAPE pin over a BRACE-BALANCED extraction.** The body, comment-stripped and
  whitespace-normalized, must EQUAL `game_core::DELETION_GRACE_MS_DEFAULT` — not "contain" it. A
  "contains + no digit" heuristic is a denylist and denylists are unclosable (house card:
  `abort-construct-blacklists-are-unclosable`). Plus two alias guards, because a path-qualified
  `game_core::X` can only be redirected by re-binding `game_core` itself: `lib.rs` must contain no
  `as game_core` and no local `const`/`static`/`use ... as DELETION_GRACE_MS_DEFAULT`.
- **G5 stops enumerating literal forms and NORMALIZES NUMBERS instead.** Red-team evaded the five-regex
  denylist with `6_048_00_000` (legal JS separators) and `6048 * 100000` in seconds. The scanner now
  tokenizes every numeric literal (decimal, `_`-separated, exponent, hex, BigInt `n` suffix) and every
  maximal pure-numeric `*`/`+` chain, evaluates them, and flags any that EQUAL the target value.

**FIXED-3 (both lenses): the `*.test.ts` exemption is dropped.** Red-team reproduced the house failure
mode `test-suffix-exemption-admits-disguised-production` on this very tree: a `client/src/x.test.ts`
exporting the literal and imported by a normal `.ts` typechecks clean and bundles, while a
filename-based exemption never scans it. G5 scans every `client/src/**/*.ts` except generated
`module_bindings/**`.

**FIXED-4 (red-team, MEDIUM): `client-wasm/src/lib.rs` is scanned COMMENT-STRIPPED, not raw.** Raw
scanning reds an honest doc comment that mentions the value in prose — actively discouraging the
explanatory comments this codebase favours. The accessor's own doc comment therefore does NOT restate
the number (it would be a third copy anyway), and the clause pins code, not prose.

**REJECTED (red-team, MEDIUM — verified wrong):** "the plan cites a nonexistent `#[cfg(test)] mod tests`
at :257". That was read against `game-core/src/accounts/deletion.rs`. The anchor is
`client-wasm/src/lib.rs:256-257`, which does have one (`grep -n "cfg(test)" client-wasm/src/lib.rs` →
235, 243, 249, 256). No change.

**ACCEPTED KNOWN LIMITS, stated in the eval header and ADR-0212:**
- G4 reads the expected value by parsing Rust source rather than running a compiled binary (the
  `evals/prediction-parity.eval.mjs:45` pattern). Mitigated by exactly-one-match + fail-loud fixtures,
  and cross-checked by the COMPILED `[G6]` native `assert_eq!`. Adding a `sim-harness` bin for this
  would be a change outside `touches:`.
- G5 remains a duplicate DETECTOR, not a proof of absence. Numeric normalization closes the arithmetic
  and radix families; it cannot close `Number('60480'+'0000')`, base-36, or a value fetched from a JSON
  fixture. The closing tooth is the positive one S8 owns: its countdown must READ the accessor. Said
  plainly in-file; never claimed as closure.

### Shipped clause set

| tag | proves | bites |
|---|---|---|
| `[G1/delegates]` | body is EXACTLY the game-core path, brace-balanced, comment-stripped; no `game_core`/const alias | re-typed literal (any radix), arithmetic re-encode, wrong-const delegation, decoy comment, the `let _ = {…}` truncation cheat |
| `[G2/bindgen]` | `#[wasm_bindgen]` in the attribute run immediately preceding the fn | attribute deleted (compiles, native test passes, exports nothing) |
| `[G3/js-reachable]` | fresh `wasm-pack --dev --target nodejs` build, `createRequire`, `typeof === 'function'`, and CALLED | non-`pub`, name typo, `cfg`-gated away, attribute deleted |
| `[G4/value-parity=<n>ms bigint]` | called value is `bigint` AND `===` the value parsed from `deletion.rs` (exactly one match, fail-loud) | `-> u32`/`-> f64` signature change (arrives as `number`), wrong-const delegation, stale pkg |
| `[G5/no-ts-dup files=<k>]` | no numeric literal or pure-numeric `*`/`+` chain in any `client/src/**/*.ts` (tests included) or comment-stripped `lib.rs` evaluates to the target; `k >= 150` | a TS duplicate in any radix/separator/arithmetic form, incl. one hidden behind a `.test.ts` suffix |
| `[G6/native-parity]` | compiled `assert_eq!(deletion_grace_ms_default(), game_core::DELETION_GRACE_MS_DEFAULT)` in `client-wasm`'s own `mod tests` | wrong-const delegation and future drift, on the compiled path rather than a text oracle |
| `[teeth N/N fixtures bit]` | every in-eval GOOD/BAD fixture produced its expected verdict; the count is COMPUTED, never a literal | a hollowed predicate |

### RED-before / GREEN-after (the residual's explicit requirement)

Never `git stash`, never `git checkout -- <path>` (house cards:
`git-stash-in-diagnostic-command-wipes-worktree-impl`, `bite-proof-revert-destroys-gate-work`). Commit the
gate FIRST, revert only by deleting the exact file / re-editing the exact hunk, and verify each mutation
LANDED (`git diff --stat`) before reading its verdict (`first-occurrence-replace-voids-bite-proof`).

1. Commit the eval alone → tree is pre-fix + gate.
2. **RED-A** (reachability): run the eval via `node -e "import(...)"` — evals have no main guard and
   `node evals/<f>.eval.mjs` exits 0 vacuously (`battle-schema-snapshot-eval-no-main-guard`). Expect
   `FAIL [G3/js-reachable]`.
3. **RED-B** (the literal premise the residual names but which does not exist on this tree): add
   `client/src/net/__rb8_red_probe.ts` = `export const GRACE = 604_800_000;` → expect
   `FAIL [G5/no-ts-dup]` naming it; `rm` that exact file. Honest substitute for a precondition that is
   factually absent.
4. Apply the fix → GREEN, then `cargo nextest run -p client-wasm`, then the single full `just ci`.
5. Mutation bite-proofs, asserting on the FG TAG (never exit code — `mutant-tooth-pin-is-load-bearing`):
   M1 body→hex literal ⇒ G1 RED (this is red-team's CRITICAL cheat; G4/G6 stay GREEN, which is exactly
   why G1 must be exact-shape) · M2 body→`game_core::EXPORT_CHUNK_ROWS as i64` ⇒ G1+G4+G6 RED ·
   M3 `-> u32 { … as u32 }` ⇒ G4 RED on the bigint assert · M4 delete `#[wasm_bindgen]` ⇒ G2+G3 RED ·
   M5 `6048 * 100000` in a TS file ⇒ G5 RED · **M6 NEGATIVE CONTROL** `deletion.rs:32` → `604_800_001`
   ⇒ ALL GREEN, proving the gate pins DELEGATION and not the value (red-team independently confirmed no
   other symbol in the repo hardcodes the digits and all 24 game-core deletion tests survive it).

## Anti-patterns named (do not do these)

1. Self-source needle — never "prove reachability" by grepping for the call site.
2. A third copy of `604_800_000` — not in the eval, not in the Rust doc comment, not normatively in the ADR.
3. Claiming G5 closes TS duplication.
4. Editing `evals/run.mjs` / `run-completeness` / `ci-gate-wiring` (auto-discovery makes it unnecessary).
5. A dead TS import (fails `noUnusedLocals`).
6. Changing the constant's value or inventing a runtime-override column (`deletion.rs:29-31` forbids it).
7. `as u32`/`f64` marshaling.
8. `println!`/`dbg!` anywhere in Rust (a text scan that fires on print macros reds bindings-drift).
9. A dynamic `RegExp` in the eval (Semgrep `detect-non-literal-regexp` is remote-only and has bitten twice).
10. Inserting a header line into an existing ADR (inbound `ADR-NNNN:<line>` cites drift). 0212 is new and append-only.
11. A non-gitignored `--out-dir` for wasm-pack (only `pkg` is ignored).
12. Running the eval concurrently with vite/e2e — the wasm build clobbers `client-wasm/pkg`.

## Right-sizing / parked

IN: accessor (~8 lines) · native test (~6) · two mock keys (~2) · one new eval (~250 with fixtures) ·
ADR-0212 + DIGEST regen · one ARCHITECTURE.md sentence.
OUT (S8 or later, explicit): any TS consumer, countdown formatter, `deletionRequestedAtMs` read, or
cancel UX — **nothing in this slice may read `deletionRequestedAtMs`**; a mechanical mock-vs-pkg export
exhaustiveness gate; a wasm export-set snapshot/count pin (nothing pins it today); a general
"every game-core constant TS needs has an accessor" census; resolving spec §8.1 escalation #1.
