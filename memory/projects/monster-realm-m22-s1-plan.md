# m22-s1 plan (planner output, 2026-08-24)

Slice: M22 privacy/compliance S1 — game-core deletion rules. Pure Rust, no schema, no reducers.

## Files
1. `game-core/src/accounts/deletion.rs` (new) — the six S1 items + colocated `#[cfg(test)] mod deletion_tests`
   (mirrors `game-core/src/combat/pvp.rs:117` `mod pvp_tests`).
2. `game-core/src/accounts/mod.rs` (new) — `pub mod deletion; pub use deletion::{...};`
   (modelled on `game-core/src/npc/mod.rs:1-8`).
3. `game-core/src/lib.rs` (edit, 2 additive hunks) — `pub mod accounts;` first in the alphabetical
   module list (:14) + a `pub use accounts::{...};` block first in the re-export run (:32).
   All 14 existing modules have a matching `pub use`; omitting it is a convention break.
4. `game-core/tests/m22_s1_deletion_surface.rs` (new) — proves the ROOT re-export from OUTSIDE the
   crate (an in-crate test can reach `crate::accounts::deletion::X` regardless of the `pub use`).

## Items
| Item | Shape |
|---|---|
| `DELETION_GRACE_MS_DEFAULT: i64` | placeholder + honest basis comment (spec §8.1 #1 UNRESOLVED). No GDPR / "industry standard" / borrowed figure. `_DEFAULT` = "the literal the operator replaces", NOT a runtime override. |
| `is_deletion_due(Option<i64>, i64) -> bool` | `Some(t) => now.saturating_sub(t) >= DELETION_GRACE_MS_DEFAULT`; `None => false`. |
| `TOMBSTONE_IDENTITY_BYTES: [u8; 32]` | `[0xFF; 32]`. game-core has no spacetimedb dep. |
| (private) `WILD_IDENTITY_BYTES: [u8;32]` | `[0u8;32]` proof anchor, cites `server-module/src/lib.rs:84`. |
| `TOMBSTONE_AUTH_ISSUER: &str` | `"account-deleted-tombstone"` — no `/`, no `:` (remote-only Semgrep/gitleaks match raw text incl. comments). |
| `EXPORT_CHUNK_ROWS: usize` | `500`, non-zero load-bearing (`slice::chunks(0)` panics). Spec §5. |
| `STATE_TRANSITION_OWNERS: &[&str]` | exactly the 3 §4.7 reducer names. |

## Key decisions / justifications
- **`None => false`**: §4.5 reaper no-ops unless due; PRV1-3 CLEARS `deletion_requested_at_ms` on
  cancel, so `None` IS the cancelled state. `None => true` would cascade every cancelled account.
  Fail-safe direction: `false` leaves a recoverable stuck state; `true` is unrecoverable destruction.
- **Sub-form not add-form**: `now.saturating_sub(t) >= G`, never `t.saturating_add(G) <= now`
  (the `claim_expires_at` shape at `server-module/src/accounts.rs:102-109` saturates the deadline
  DOWN near `i64::MAX` and reads a far-future request as due).
- **`_BYTES` naming deviation** from the scope line's `TOMBSTONE_IDENTITY`: in game-core the value is
  a `[u8;32]`, not an `Identity`. `_BYTES` is a substring superset so any grep on `TOMBSTONE_IDENTITY`
  still matches.
- **No feature gate**: `game-core/Cargo.toml:16` `default = []`, so an `Identity`-typed cfg-gated
  const would be invisible to `cargo test -p game-core` and to `client-wasm`.
- **No eval file** (spec §7.2's per-slice-eval convention): out of S1's `touches:`; S1's teeth are
  native `cargo test` + the nightly zero-tolerance `cargo mutants` gate; S6 owns the eval.
- **No ADR** — M22 is governed by ADR-0031; ledger says none needed.

## BLOCKER handed forward to S3 (found this pass, not in the spec)
`evals/guest-claim-integrity.eval.mjs:138-139,419-424` `[R/identity-ctor]` FLATLY BANS
`Identity::from_byte_array(` in `accounts.rs` — where spec §4.4 puts the reaper. The `Identity`-typed
`TOMBSTONE_IDENTITY` must be declared in `server-module/src/lib.rs` beside `WILD_IDENTITY` (:81-84,
not scanned by that clause); `accounts.rs` may only reference `crate::TOMBSTONE_IDENTITY`.
Recorded in the `TOMBSTONE_IDENTITY_BYTES` doc comment so S3 reads it before burning a CI cycle.

## Proof-of-teeth headline
The survivor a naive suite misses: an impl that IGNORES `requested_at_ms` and compares `now` to the
grace window as an ABSOLUTE instant is byte-identical to the correct fn on every `Some(0)` case.
Killer: `due_is_relative_to_the_request_not_the_epoch` at `t = 1_000_000`.
Suite rules: >=half the cases use a non-zero `requested_at_ms`; NO case spells a numeric grace
literal (every boundary is `DELETION_GRACE_MS_DEFAULT ± 1`, the pvp.rs:280/292/305 idiom).
Tombstone tautology to avoid: comparing two consts that both live in `deletion.rs`. X4 clause (b)
reads the zero literal out of `server-module/src/lib.rs` instead.

## Gates X1..X8 — see memory/projects/gates/m22-s1.gates.md
