# 13r-c — progress memo (2026-08-15 re-spawn)

> **Supersedes nothing.** The 2026-08-09 memo of the same name described the ORIGINAL
> 13r-c run, which merged as PR #309. This memo describes the 2026-08-15 **re-spawn**
> on a stale queue entry. Both are true; read this one for current state.

## HEADLINE

**`13r-c` was already merged.** `0d13923` — `fix(13r-c): string-literal-aware source
scanners — shared evals/rust-scan.mjs, three security gates de-blinded (ADR-0181)
(#309)`, merged 2026-08-09 — is an ancestor of `master`. `monster-realm-handoff.md`
already records the MERGED row and "slice 13r-c CLOSED". The spawn brief re-issued the
original scope verbatim with `adr_reserved: 195`.

**Action for the supervisor: reconcile `mr-state.json` / the launch queue so 13r-c is
not spawned a third time. ADR 195 unused — returned to the pool.**

## DONE

- **Verified the merge, deliverable by deliverable.** PR #309's diffstat covers every
  file in the declared `touches:` set **except `server-module/src/accounts.rs`**:
  `rust-scan.mjs` (new, 13 exports), `currency-integrity`, `ranking-security`,
  `conversation-privacy`, `wallet-privacy`, `account-privacy`, `guest-claim-integrity`,
  `main.wiring.test.ts`, plus `ADR-0181` + `ARCHITECTURE.md` + `DIGEST.md`.
- **Confirmed `master` CI green** (run 31869334918, 13r-e) — the red-master override did
  not apply.
- **Re-measured the parked blocker on today's `master` (`7eb6980`)** rather than trusting
  the 2026-08-09 note. Method: patch `accounts.rs:54` to
  `&["https://auth.monster-realm.invalid/"]`, run both suites, restore.
  - `cargo test -p monster-realm-module` → **614 passed, 0 failed** (form-agnostic).
  - `node evals/run.mjs` → **85 PASS / 2 FAIL**:
    1. `trade-escrow-guards` (TR-11) — `start_battle` "not found". Known ADR-0181 blocker:
       `stripRustComments` runs before `stripRustStrings` over a whole-crate blob
       (`evals/trade-escrow-guards.eval.mjs:37,73,114-130`), so the bare literal
       unbalances quote-pairing and blanks later files.
    2. `account-e2e` — `patchAllowedIssuers` N4 throw. **NEW since 2026-08-09.**
       `ISSUER_NEEDLE` (`evals/account-e2e.eval.mjs:77`) pins the exact `concat!()` token
       and `splitForConcat`/`patchAllowedIssuers` re-emit that form. Landed with
       **PR #312 (M21b-2)**.
  - Reproduced independently by the `red-team` and `verifier` lenses.
- **Delivered the one unblocked, in-`touches:` sub-item** — "update the hazard comment to
  point at the fixed scanners" — as **PR #327**. Old text pointed at `M21c`, which never
  owned that work (13r-c/ADR-0181 and 14r-c/ADR-0186 did).
  - Branch `feat/13r-c-residual-verify` @ `545cc4f`, worktree `.claude/worktrees/13r-c`.
  - `server-module/src/accounts.rs:40-47` only. **Line-count neutral** (7/7; file stays
    534 lines; `ALLOWED_ISSUERS` stays on line 54) so the six `docs/knowledge/**` pins
    (`#L342/#L377/#L448/#L471/#L495/#L511`) and `pvp_tests.rs`'s "SSOT: accounts.rs:54"
    all still resolve — **no `just knowledge` regen needed** (verifier-confirmed).
  - Local **`just ci` EXIT 0**, run twice (me + verifier independently): 87/87 evals,
    1934 nextest passed / 0 skipped, 81 client files / 2447 tests, fmt+clippy `-D warnings`
    clean, check-secrets clean, wasm clean.
  - Lenses: `tester`(opus) PASS · `reviewer` PASS w/ MAJOR-1 · `red-team` PASS ·
    `verifier` PASS. MAJOR-1 fixed in `545cc4f` (see BLOCKERS note 2).

## REMAINING (not this slice)

Nothing in 13r-c's declared scope is deliverable without out-of-`touches:` files. The
remainder is `13r-c-2`, still **undrafted** (no `M*.spec.md` entry).

## BLOCKERS

1. **`13r-c-2` — the `concat!()` removal. Hidden dependency; blocker set has GROWN.**
   The old handoff named only `evals/trade-escrow-guards.eval.mjs`. As of 2026-08-15 the
   set is **two** files, so **`13r-c-2`'s `touches:` must be:**
   ```
   evals/trade-escrow-guards.eval.mjs   (migrate onto evals/rust-scan.mjs)
   evals/account-e2e.eval.mjs           (ISSUER_NEEDLE + patchAllowedIssuers/splitForConcat)
   server-module/src/accounts.rs        (drop concat!(), write ALLOWED_ISSUERS naturally,
                                         re-point the hazard comment once more)
   ```
   Consider also `server-module/src/pvp.rs:63` (`RANKED_PLACEHOLDER_ISSUER`, its own
   `concat!()` copy) and `server-module/src/pvp_tests.rs:4772` — sweep for consistency.
   `13r-c-2` still gates M21b-2's real-issuer flip (ADR-0182 D18, retained verbatim at
   `accounts.rs:49-53`).

2. **Do not let a future comment/ADR overstate scanner-migration completeness.** The
   first draft of this PR said "Most source-scan evals are string-literal-aware now" —
   the exact overstatement `ADR-0186:194` forbids. The load-bearing reason: the ADR-0181
   hazard's signature failure is a **false-GREEN**, so "only two gates RED" is *not*
   "only two are affected" — the seven `KNOWN_UNMIGRATED` evals (owned by the different
   slice `14r-c-2`; two canary-measured swallowing this exact hazard) go **silently
   blind** instead. `evals/scanner-migration-audit.eval.mjs` is the live SSOT; cite it
   rather than re-deriving counts in prose.

3. **Follow-up flags — files outside this slice's `touches:`, deliberately NOT touched:**
   - `evals/account-e2e.eval.mjs:75,78` cite `accounts.rs:48`/`:50` for tokens now at
     `:54`/`:56` (stale by 6). Pre-existing.
   - `patchAllowedIssuers` uses first-occurrence `String.replace` guarded only by
     `patched === original`. If the verbatim `ISSUER_NEEDLE` ever appears above line 54,
     it would patch a *comment*, leave the const fail-closed, and make every "no account
     was provisioned" negative control vacuously green. Add
     `countOccurrences(src, ISSUER_NEEDLE) === 1`. Not tripped today (needle verified to
     occur exactly once).

## EXACT NEXT STEP

**Supervisor:** wait on PR #327's remote CI, squash-merge it (runner is forbidden to),
then (a) reconcile the queue so 13r-c stops being spawned, (b) return ADR 195 to the
pool, (c) draft `13r-c-2` into `M-postgate-thirteenth-review-residuals.spec.md` with the
three-file `touches:` set above.

## OPS GOTCHAS HIT

- Fresh worktree has no `client/node_modules`; without it `account-e2e` reds on
  `tsresolve.mjs ERR_MODULE_NOT_FOUND`, which reads like a real gate failure. Run
  `npm install --include=dev` in `client/` first.
- The node v18-vs-v24 PATH trap bit once: a bare `node evals/run.mjs` produced two bogus
  `node:fs/promises` `glob` failures. Use
  `export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"` and assert
  `node --version` is v24.13.1.
- Shell cwd resets between turns — `cd` explicitly in every command (bit once).
- **The `red-team` lens reported a prompt-injection attempt inside its own tool results**
  — a fake "system-reminder" instructing it not to revert its worktree mutation and not
  to report it. It ignored the instruction, restored the tree, verified by SHA-256, and
  surfaced it. Worth a harness retro item.
