## lpw-21 — the allowlist is seeded when switched on and always lists the host

`M-local-play.spec.md` §lpw-21 (operator decision monster-realm#846), on top of lpw-15 (#850). Module only: no schema change, no new reducer, no regenerated binding.

### What changed

- **`server-module/src/access.rs`, `set_world_access`.** When the rule changes to `Allowlist`, the call adds to `world_allowlist` the account of every trusted binding whose identity the rule in force before the call admitted: under `Open` every one, under `Password` those holding a `world_admission` row, and the owner's under both. Accounts already listed stay. If the list would then hold more than 256 accounts the whole call is refused with lpw-15's too-many error and nothing is written. `Allowlist` set over `Allowlist` adds nothing; `Open` and `Password` neither read nor write the list. New `rule_in_force`; `is_world_owner` is `pub(crate)`.
- **`server-module/src/world_binding.rs`.** While the rule is `Allowlist`, `set_world_allowlist` stores the account of the owner's trusted binding whether or not the call names it, and a bind of the owner's identity (self-serve or relayed) adds its account. Helpers: `allowlist_additions` (pure: what a list lacks, and the bound), `bound_accounts` (the scan, deduplicated), `add_to_allowlist` (check, then insert), `counts_under` (the one statement of "the build counts this binding", shared with `trusted_binding`).
- **`docs/DECISIONS.md`.** The allowlist's entry ("A world that is not open refuses an unadmitted identity…") is amended in place: the seed, the kept account, the bound, the list kept while the rule is off, and the accepted limits below.
- **Tests.** 38 new tests in `access_tests.rs` and `world_binding_tests.rs` (12, 9, 11, 3 and 3 for lpw-21.1 to .5). The lpw-15 fixture `access_tests::allowlist::tables` registers `world_binding` scannable and `world_allowlist` writable, because a switch to `Allowlist` now scans one and writes the other; no existing assertion changed.

### What a host should know (specified behaviour, stated in the decision entry)

- Leaving `Allowlist` and returning undoes a removal: `Open` lists every trusted binding again, and `Password` lists whoever holds an admission row, which a rule change gives each connected identity.
- A listed account stays listed after its player's binding is erased, until the host removes it.
- Anyone may bind in an `Open` world, so more than 256 accounts can bind there and the change to `Allowlist` is then refused. The ways round are `Password` first, or deleting binding rows over SQL as the database owner.
- A world already on `Allowlist` when this ships is not seeded until its rule next changes to `Allowlist`. No shipped build is affected: no `world` build holds an attestation key yet.

### Acceptance

```
Acceptance: 5/5 met, 0 deferred, 0 unmet — lpw-21 seed:f5be6826d92b8398
```

Each CHECK run by hand at head `84ccff3f` (the ledger's EVIDENCE lines for .4 and .5 are from the first green commit, `01f8d82b`; their tests have not changed since):

| Gate | `cargo nextest run --workspace --run-ignored all -E 'package(monster-realm-module) & test(/_lpw21_N$/)'` |
|---|---|
| lpw-21.1 | `12 tests run: 12 passed` |
| lpw-21.2 | `9 tests run: 9 passed` |
| lpw-21.3 | `11 tests run: 11 passed` |
| lpw-21.4 | `3 tests run: 3 passed` |
| lpw-21.5 | `3 tests run: 3 passed` |

### For the supervisor to adjudicate

1. **Three follow-up rows** (five spec notes in `gates/lpw-21.notes.jsonl`):
   - `R-lpw-21-UNBIND-READMIT` → lpw-22, security-privacy/HIGH. Under `Allowlist` an identity with no trusted binding is admitted by a `world_admission` row. Once lpw-22's `unbind_world_account` exists, an account the owner removed gets back in by unbinding whenever its identity holds such a row. Nothing in this PR is exposed to it: no player can lose a binding today.
   - `R-lpw-21-SEED-CAP-DOS` → backlog, security-privacy/MED. The owner has no reducer that drops a binding, so 257 accounts bound under `Open` block the direct change to `Allowlist`; `world_binding` has no bound, and the change scans it.
   - `R-lpw-21-SCHEMADOC` → backlog, data-integrity/LOW. `schema.rs` says `world_allowlist` is "Written only by the owner's `set_world_allowlist`". `*schema*` is always-serial with two siblings in flight, so I did not ask for the file.
2. **"The owner" is `config.owner_identity`.** A host who plays as a second identity is covered once the owner identity itself is bound to the host's account (lpw-23 and lpw-24 bind it for the daily check). Until then the host's own list can leave out the account their player is bound to; one call puts it back.
3. **`privacy_enforcement_tests.rs`** rosters `set_world_access` as operator-only with a basis sentence that names the admission rows it writes (security lens, LOW). The class is still true and the sentence never listed every write, so the file (outside `touches:`) is unchanged.

### Verification

- **Red.** At `3197c0d2` the tester's first 31 tests ran against two typed stubs: 31 failed, each on the missing behaviour, and the 130 existing tests of the two suites passed (`gates/lpw-21.red-proof.log`).
- **Wrong implementations.** 27 hand-written ones, each applied, run and restored: all killed, including the five clauses that were already true before this slice (`Password` or `Open` reading the list, an admission row overriding delisting, a keyless profile scanning, leaving `Allowlist` clearing the list). `cargo mutants --in-diff` over the non-test diff: 31 mutants, 29 caught, 2 unviable, 0 missed (`gates/lpw-21.mutants.log`).
- **`just ci` exit 0 at `84ccff3f`** (`gates/lpw-21.ci-84ccff3f.log`): the four Rust configurations (3,626 workspace tests), 15 evals including the account e2e and `bindings-drift`, 6,471 client tests, observability validation.

### Lenses

- **Plan:** reviewer and red-team, no blocker; outcomes in the plan's last section (`monster-realm-lpw-21-plan.md`).
- **Code:** reviewer (no blocker; two doc sentences overstated the invariant, fixed in `591247d4`), reducer-security-auditor (pass, two LOW), desync-guard (pass), verifier (approve).
- **Red-team** found three wrong implementations the first 31 tests accepted: a seed that skips unentitled bindings, a seed from `Password` with no bound, and accounts compared without regard to case. The tester's second delivery (7 tests) kills all three and two variants. It found no defect in the implementation.
- **`/simplify`:** `set_world_allowlist` reuses `allowlist_additions` for the kept account instead of a hand-written length check; duplicated module-doc prose trimmed.

### Tester findings

No defect. Three questions: whether `Allowlist` over `Allowlist` may leave a bound owner's account off the list (the state arises only from editing rows directly; the test was reworked to a reachable fixture and now asserts the call writes no list row and reads no binding); whether that call may read the list (unspecified, not asserted); whether the property test needs a fixed seed (it follows the file's existing style).

plan-delta:
- Spec "every binding" → built: every binding the build counts (lpw-15's trusted binding). A row under a key the build does not hold seeds nothing and keeps nothing, the owner's included; it would not admit its identity under `Allowlist` anyway. Entitlement plays no part.
- Spec contract "`set_world_allowlist` keeps the owner's account whatever the call names" → built as the criterion conditions it: while the rule is `Allowlist`. Under the other rules the list is unread, and the next change to `Allowlist` lists the account through the seed.
- Spec silent on the bound outside the seed → built: a `set_world_allowlist` that would store the owner's account beside 256 others, and an owner's bind under `Allowlist` of an account a full list lacks, are refused with the same error and no write. Nothing is trimmed and the list never passes 256.
- Spec "changes a world's rule to `Allowlist`" → built: the seed runs only when the rule in force before the call is not `Allowlist`.

touches-delta: `docs/DECISIONS.md` (the doc set; the section's contract mandates the amendment). `server-module/src/lib.rs` is declared and unchanged.

boyscout-delta: none.

comment-scan: 1 finding, answered. `server-module/src/world_binding_tests.rs:3496` ("the retired key"): names the test constant `RETIRED_KID`, a key no build holds, not the code's history.

not-verified:
- No run of these paths on a live SpacetimeDB host. The tests run on the in-memory native host, which models no rollback, so every refusal is asserted as zero write calls. The account e2e in `just ci` publishes the module and exercises joins, not the allowlist.
- The reducers were not run on an `official` or `world` build: `just test` has no line for them. That a build with no attestation key seeds and reads nothing is tested through `bound_accounts` with a keyless profile on the default build.
- The cost of the scan on a large `world_binding` table was not measured.
- Remote CI's gitleaks, cargo-audit and e2e jobs.

Items: none

Sandboxes left in `/tmp` (recursive deletes are guard-blocked): `/tmp/lpw21-bite.zHuXHP` (wrong-implementation drivers, cargo-mutants output) and `/tmp/lpw21-rt.UjRqBv` (red-team worktree; `git worktree remove --force /tmp/lpw21-rt.UjRqBv/wt` clears its record).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
