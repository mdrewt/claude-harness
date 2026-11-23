# lpw-22 tester brief — gating tests for `unbind_world_account` and the no-readmit rule

You write FAILING tests from the EARS criteria below; you do not implement the feature. Worktree:
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-22`
(edit files there only; never the main checkout). You have no shell: the orchestrator compiles and
runs everything and will send compile errors back.

## Spec (source of truth)

`/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-local-play.spec.md`
lines 730-749 (lpw-22). Related: lpw-15.7 (line 669), lpw-21.4 (line 725).

- lpw-22.1 WHEN a bound identity calls `unbind_world_account` in a `local` or `private` world, THE
  SYSTEM SHALL delete that identity's binding and outstanding nonce and write nothing else.
- lpw-22.2 WHEN the caller has no binding, THE SYSTEM SHALL succeed with no write.
- lpw-22.3 WHEN the world's rule (`Open`, `Password` or `Allowlist`) refuses the caller, including
  an account the owner removed from the list, THE SYSTEM SHALL still run `unbind_world_account`
  for that caller.
- lpw-22.4 WHEN `unbind_world_account` runs on an official build, THE SYSTEM SHALL refuse it with
  no write.
- lpw-22.5 WHEN an identity reads the owner-scoped binding view, THE SYSTEM SHALL return only that
  identity's own binding, and after lpw-22.1 none.
- lpw-22.6 WHEN an unbound identity later calls `join_game` on an enforcing build, THE SYSTEM SHALL
  refuse it as lpw-15.7 defines, until it binds again.

Plus residual R-lpw-21-UNBIND-READMIT (HIGH, closed here): an unbind must never let in an identity
the `Allowlist` rule would refuse — see "The no-readmit rule" below.

## Contracts (decided; the implementation will match these exactly)

Reducer, in `server-module/src/world_binding.rs` (already exists as an inert skeleton returning
`Ok(())`, so your tests compile now):

```rust
#[spacetimedb::reducer]
pub fn unbind_world_account(ctx: &ReducerContext) -> Result<(), String>
```

Behaviour, in this order:
1. A build that binds nothing (no attestation key: the official build among them) refuses with
   `world_binding::REJECT_BUILD_BINDS_NOTHING` ("this server takes no world binding") before it
   reads or writes anything (lpw-22.4).
2. NO admission check: the caller is never refused with `access::REJECT_NOT_ADMITTED` (lpw-22.3).
3. No `world_binding` row for `ctx.sender()` -> `Ok(())` with no write call at all, even when the
   caller holds a nonce row (that row stays) and even when its account is pending deletion
   (lpw-22.2).
4. The deletion gate `guards::require_not_deleting`: a BOUND caller whose account is pending
   deletion is refused with that gate's error and no write (the crate's DEL-06 census requires the
   gate before the first write; `unbind_world_account` joins `EXPECTED_GATED`).
5. Otherwise: the caller's `world_binding` row is deleted whatever its `key_id` (a row under a key
   the build does not hold is deleted too), and the caller's `world_bind_nonce` row, if it holds
   one (expired or not), is deleted. No other table is written except by rule 6: not
   `world_allowlist` (a listed account stays listed), not `world_admission_attempt`, not any other
   identity's rows, not `player`/`player_session`.
6. The no-readmit rule (REVISED after the red round): when the erased binding is one the build
   counts (its `key_id` is the `kid` of one of the build's attestation keys, what
   `world_binding::trusted_binding` answers `Some` for), the caller's `world_admission` row, if it
   holds one, is deleted too, UNDER EVERY RULE (`Open`, `Password`, `Allowlist`), whether the caller
   was listed, delisted or admitted at the call. For a binding the build does not count
   (`RETIRED_KID`), under any rule, the admission row stays (that identity was already governed by
   the row). The wrong-password record (`world_admission_attempt`) is never touched. Consequence:
   after unbinding a counted binding, an identity is let back into a `Password` or `Allowlist`
   world only by an owner action (the door `admit`, `set_world_access`'s admit list or carry-over,
   or the relayed bind); under `Open` it is admitted as everyone is.

New helper in `server-module/src/access.rs` (the only writer of `world_admission`):
`pub(crate) fn withdraw_admission(ctx: &ReducerContext, identity: Identity)` — deletes the row if
present. You need not call it directly; test through the reducer.

Why rule 6: under `Allowlist`, `access::is_admitted` (access.rs:168) governs a trusted-bound
identity by the list alone, and an identity with no trusted binding by its `world_admission` row.
Without rule 6, (a) a delisted identity holding an admission row (from the door, the owner's
`admit` list, or `set_world_access`'s carry-over of live admitted identities) unbinds and is let
back in; (b) a still-listed identity holding a row unbinds BEFORE the owner delists it and so
escapes the list for good; (c) the same through a `Password` interlude: under `Allowlist` a
listed identity holds a row, the owner switches to `Password`, it unbinds, the owner delists the
account and switches back to `Allowlist` — it is in by the row. Only a rule-independent
withdrawal closes (c).

## Where the tests go (file and module names)

- `server-module/src/world_binding_tests.rs` (huge; reuse its helpers: `owned_world`,
  `valid_world`, `world`, `binding_row`, `nonce_row`, `admission_row`, `rule_row`, `seed_allowed`,
  `footprint`, `assert_refused`, `call`, `bind`, `ask`, `ask_for`, `bind_for`, `set_allow`,
  `passes`, `bindings`, `nonces`, `allowed`, `dev_kid`, `RETIRED_KID`, `dev_attestation`,
  `Claims`, `nonce_of`, `join_fixture::{join, join_world, join_footprint, joined}`; the
  `list_edits::switchable_world` pattern re-registers `world_admission` writable — `world()`
  registers it READ-ONLY, so a test where the reducer deletes an admission row needs that
  re-registration). Add a call helper `fn unbind(fx, who, ms) -> Result<(), String>`.
  - new `mod unbind` (no cfg; runs in every build): lpw-22.1, .2, .3, .5 and the no-readmit tests.
  - the existing `#[cfg(all(feature = "official", not(feature = "world")))] mod official_build`:
    add lpw-22.4 there (that build holds no attestation key).
  - a new `#[cfg(all(feature = "dev_issuers", not(feature = "open_join")))] mod
    acs6_enforcing_unbind` for lpw-22.6's ownership half: the module path MUST contain
    `acs6_enforcing`, because `just test` runs the dev-enforcing build only for
    `test(/acs6_enforcing/)`. Mirror `mod acs6_enforcing_bound` (line 3146).
- `server-module/src/privacy_enforcement_tests.rs` `mod admission_roster` (line 2337): the roster
  is the generated bindings' file names, now 50 with `unbind_world_account`
  (`every_generated_reducer_has_exactly_one_admission_probe` is RED right now: no probe). Add a
  third probe kind for the one reducer the access rule does not gate, pin that set exactly as
  `{unbind_world_account}`, update the roster count to 50 and its message, keep the player count
  at 42, and add a test that the ungated reducer, called by the unadmitted non-owner on the
  `Password` world, does NOT answer `REJECT_NOT_ADMITTED`, answers `Ok(())`, and writes nothing
  (that caller has no binding). The rosters are GATING: change only what this reducer forces.
- `server-module/src/privacy_enforcement_tests.rs` `EXPECTED_GATED` (line 1420, exact set, GATING):
  add `unbind_world_account` (sorted), so `real_crate…` census test pins its gate.
- `server-module/src/access_tests.rs` only if a connect-level assertion is clearer there
  (`require_admitted_at_connect` / `crate::on_connect`); otherwise leave it.

Test naming: every gating test's fn name ENDS with `_lpw22_N` for the criterion it gates
(`..._lpw22_1`, ..., `..._lpw22_6`). The no-readmit tests end `_readmit_lpw22_6` (they count in
lpw-22.6's gate and have their own gate, selected by `/_readmit_lpw22_6$/`). Gate CHECKs select
by `test(/_lpw22_N$/)`. Controls that are not gates may end otherwise.

## What to cover (minimum)

- .1 under `Open`, `Password` (caller admitted by a row) and `Allowlist` (caller listed, NO
  admission row): binding and nonce gone, every other registered table byte-identical with zero
  write calls on it (use `footprint`-style per-table comparison), a bystander's binding/nonce
  untouched. Also: a binding under `RETIRED_KID` is erased; a caller with a binding and no nonce
  -> only `world_binding` written.
- .2 no binding, with and without a nonce row: `Ok(())`, footprint unchanged, zero writes.
- .3 refused callers still run it: `Password`, bound, no admission row; `Allowlist`, bound to an
  account the owner removed (`set_allow` without it), with and without an admission row. Assert
  refused before (`passes` answers `REJECT_NOT_ADMITTED`) and `Ok(())` from the unbind with the
  rows gone. (`Open` admits everyone, so it can only appear as a control.)
- .4 official build: seeded binding + nonce (+ admission) stay, `REJECT_BUILD_BINDS_NOTHING`, no
  write (`assert_refused`).
- .5 `my_world_binding` (see `mod views`, line 3330, and `native_host_tests::VIEW_MY_WORLD_BINDING`):
  two bound identities each read only their own row; after one unbinds it reads none and the
  other still reads its own.
- .6 ownership half (dev-enforcing): a caller bound with the entitlement under `Open`, under
  `Password` holding an admission row, and under `Allowlist` the world's OWNER (always admitted;
  rule 6 refuses any other trusted-bound caller there, so lpw-15.7's ownership error is reached
  only by the owner or by a caller whose binding the build does not count and who holds a row):
  after unbinding, `join_game` answers
  `accounts::ERR_OWNERSHIP_REQUIRED` with no write (join footprint too); after binding again
  (nonce + dev attestation, the real flow as in `the_real_flow_binds_and_then_joins_lpw15_7`),
  `join_game` succeeds. Do not join before the unbind in the same session (a double join is
  refused for another reason), or disconnect in between.
- .6 no-readmit (no cfg; must pass in the default `open_join` build, where `join_game` has NO
  ownership check — that is what makes a readmit visible there):
  (a) the residual's own case: `Allowlist`, alice bound (dev kid) to a listed account AND holding
  an admission row; the owner delists the account; alice unbinds -> `Ok`, binding, nonce and
  admission row gone; afterwards alice is refused by `passes`, by the real `join_game`
  (`REJECT_NOT_ADMITTED`, no write to any join table), and by `request_bind_nonce`; and the
  connect reducer refuses her (`crate::access::require_admitted_at_connect` or `crate::on_connect`
  over a connection).
  (b) unbind-before-delist: same world but alice unbinds while still listed -> admission row gone,
  refused at once; the owner then delists the account and she is still refused.
  (c) controls: under `Password` a bound caller holding a row keeps the row and stays admitted
  after unbinding; under `Allowlist` a caller whose binding is under `RETIRED_KID` and who holds a
  row keeps the row and stays admitted; the attempt record is never touched (seed one under
  `Password` and assert it byte-identical).
  (d) "until it binds again": after (a), the owner relays a fresh bind (`ask_for` +
  `bind_for`) to a listed account and alice is admitted again.

## Rules

- Test behaviour through the public reducers; no mocks of world_binding/access internals.
- Every "no write" claim is asserted as zero write calls AND byte-identical rows.
- Each test must fail against the inert skeleton OR against the wrong implementation "erases
  binding + nonce but never the admission row" (say which in a one-line `/// kills:` doc, the
  file's existing style). Pure controls are fine but say so.
- Comments state current behaviour, never history; no ticket narration. No literal that looks like
  a secret (8+ char strings next to the words `secret`/`password`/`token`/`key` trip the repo's
  secret scan; reuse the file's existing constants).
- Report separately (not in code): every DEFECT you believe the contract has, and every QUESTION.
