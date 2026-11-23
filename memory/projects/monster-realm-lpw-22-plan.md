# lpw-22 plan — `unbind_world_account` + the no-readmit rule (closes R-lpw-21-UNBIND-READMIT)

Worktree `.claude/worktrees/lpw-22`, branch `slice/lpw-22`, base origin/master 93052f86.

## Shape (functional core / imperative shell)

No pure core to add: the reducer is a guard sequence over three row deletes. Everything lives in the
two existing shells.

### `server-module/src/world_binding.rs` (new reducer, the fifth binding reducer)

```rust
/// Erase the caller's own binding and bind nonce ...
#[spacetimedb::reducer]
pub fn unbind_world_account(ctx: &ReducerContext) -> Result<(), String> {
    require_binding_build(ctx, &BUILD_PROFILE, "unbind_world_account")?;   // lpw-22.4, reads nothing
    let who = ctx.sender();
    let Some(binding) = ctx.db.world_binding().identity().find(who) else {
        return Ok(());                                                     // lpw-22.2: no write at all
    };
    crate::guards::require_not_deleting(ctx, "unbind_world_account")?;     // DEL-06 census (before writes)
    let list_governed = counts_under(&BUILD_PROFILE, &binding)
        && crate::access::rule_in_force(ctx) == WorldAccessRule::Allowlist;
    ctx.db.world_binding().identity().delete(who);                         // lpw-22.1
    if ctx.db.world_bind_nonce().identity().find(who).is_some() {          // any row, expired or not
        ctx.db.world_bind_nonce().identity().delete(who);
    }
    if list_governed {
        crate::access::withdraw_admission(ctx, who);                       // R-lpw-21-UNBIND-READMIT
    }
    Ok(())
}
```

- NO `require_admitted` (lpw-22.3: the one reducer the rule does not gate).
- "A binding" = the caller's `world_binding` row whatever its `key_id` (a row under a key the build
  no longer holds is erased too: minimal data).
- Nothing else is written: not `world_allowlist` (a listed account stays listed, the existing
  accepted limit), not the attempt record, not player/session rows.

### `server-module/src/access.rs`

```rust
/// Delete `identity`'s admission row, if it holds one. Its wrong-password record stays, so a
/// withdrawal never shortens a lockout.
pub(crate) fn withdraw_admission(ctx: &ReducerContext, identity: Identity)
```
WRITE-ISOLATION kept: `world_admission` is still written only by access.rs. Doc updates: module doc
and `is_admitted` (the unbind exemption; an unbind never admits an identity the rule refused).

### The no-readmit rule (design choice D5; D4 rejected at plan review)

Under `Allowlist` an identity with no trusted binding is admitted by a `world_admission` row
(lpw-15). A delisted identity holding such a row (door, `admit` list, rule-change carry-over) would
be let back in by unbinding — connect, every player reducer, and on a non-enforcing build
`join_game` (`require_entitled` is checked only in `join_game`; a still-connected delisted player
with a live `player` row would get every gameplay reducer back on an enforcing build too).

Rule (D5): **under `Allowlist`, an unbind that erases a binding the build counts takes the caller's
admission row with it.** While such a binding exists the list alone governs the identity and its
admission row is unread; an unbind must not turn that row into a credential. Under `Open` and
`Password`, and for a binding the build does not count (already governed by the row), the row stays.
Alternatives rejected:
- D4 (drop only when the rule refuses the caller at the call): red-team + reviewer, plan review —
  a listed player holding a row unbinds BEFORE the owner delists, keeps the row, and escapes the
  list for good.
- D1 always drop the admission row: breaks lpw-22.1 "write nothing else" in the common case and
  costs a `Password` player the door for an unbind.
- change `is_admitted`'s `Allowlist` arm: a delisted-then-unbound identity is indistinguishable from
  a never-bound admitted one without new state (no new table or column allowed), and dropping the
  arm changes lpw-15/lpw-21 behaviour their tests pin.
- refuse the unbind for a refused caller: contradicts lpw-22.3.

### Other files

- `game-core/src/lib.rs`: `PROTOCOL_VERSION` 2 -> 3 (DECISIONS "The module publishes its protocol
  numbers": it rises with every reducer change; `MIN_CLIENT_PROTOCOL` stays 1, a new reducer).
- bindings via `just gen`: `unbind_world_account_reducer.ts`, `index.ts`, and (measured at gen)
  `types/reducers.ts` -> `mr-touches widen` at that step. `types.ts` expected unchanged.
- `evals/baselines/client-callable-reducers.json`: `"unbind_world_account": []`.
- `server-module/src/privacy_enforcement_tests.rs` `mod admission_roster` (widen, proved red by the
  roster test after gen: 50 generated vs 49 probes): tester adds the ungated kind — exactly
  `{unbind_world_account}`, called by an unadmitted caller it does not answer the admission refusal
  and writes nothing; roster 49 -> 50; player reducers stay 42.
- `docs/DECISIONS.md`: amend in place (a) the world-binding entry "A private world verifies an
  account by a per-world attestation..." — unbind, the exemption, the no-readmit rule, the
  connect-reducer limit; (b) the access entry "A world that is not open refuses an unadmitted
  identity..." — "every reducer of the generated client roster that is not owner-only opens with
  require_admitted" gains the one exception.
- `ARCHITECTURE.md` (doc set): the `world_binding` row lists `unbind_world_account`.
- `lib.rs`, `types.ts`, `client/src/net/wireContract.json` (does not exist): expected untouched.

Deviation: lpw-22.1 / the Contract say "nothing else"; D5 also deletes the admission row under
`Allowlist`. No closing option meets "nothing else" (both reviewers). Spec note + mr-ask-drew
(non-blocking, a default the operator may overrule).

Deletion census: `unbind_world_account` joins `EXPECTED_GATED` (privacy_enforcement_tests.rs:1420).

## Known limits (spec notes)

1. The connect reducer still refuses a delisted identity (every route runs it first, measured
   2.11.0, DECISIONS access entry), so a removed player erases their link only over a connection
   opened while admitted; once disconnected they cannot reach the reducer. Recorded, not changed
   (admitting at connect would open every public table).
2. lpw-22.2 read literally: no binding row -> no write at all, an outstanding nonce stays (it
   expires in 5 min). The contract's "any outstanding nonce" applies when a binding is erased.
3. Deletion gate: a BOUND caller whose account is pending deletion is refused (census DEL-06; the
   cascade erases the binding at fire); an unbound one gets lpw-22.2's `Ok` (the lookup comes
   first). On a `world` build no account row exists, so it never refuses there.
7. Password pre-emption: a bound player under `Password` who unbinds keeps their row; a later
   switch to `Allowlist` admits them by the row like any never-bound admitted identity (lpw-15's
   arm), outside the list. Not a readmit of a delisted account; recorded.
8. Open window: delisted, owner sets `Open`, player unbinds, owner sets `Allowlist` -> the
   carry-over gives the live identity a row. Same outcome as the existing accepted limit "Leaving
   `Allowlist` and returning undoes a removal" (Open re-seeds every binding). Recorded.
4. Build guard: refused on every build that binds nothing (official, default, conflict, and `world`
   today: PRODUCTION_ATTESTATION_KEYS is empty), with lpw-15's REJECT_BUILD_BINDS_NOTHING.
5. `docs/local-play.md:1335` says "there is no unbind reducer" — outside touches, note for the
   supervisor.
6. lpw-22.4's tests run only on the official build, which `just test` does not run
   (R-lpw-15-lpw-15.3, justfile not grantable); the gate CHECK runs that build directly.

## Tests (tester, from EARS; suffix `_lpw22_N`)

- world_binding_tests.rs: new `mod unbind` (default build): .1 admitted bound caller under each rule
  -> binding + nonce gone, every other registered table byte-identical (admission, allowlist,
  others' rows); .2 no binding (with and without a nonce) -> Ok, zero writes; .3 refused callers
  (Password bound no-admission; Allowlist delisted; Allowlist delisted with admission) -> Ok,
  binding + nonce gone; .5 views: two bound identities read only their own, after unbind none.
- `mod official_build` (cfg official): .4 refused `REJECT_BUILD_BINDS_NOTHING`, zero writes.
- `mod acs6_enforcing_unbind` (cfg dev_issuers & !open_join, name matches `/acs6_enforcing/` so
  `just test` line 43 runs it): .6 bound entitled -> unbind -> join_game ERR_OWNERSHIP_REQUIRED no
  write under each rule where still admitted; rebind -> join ok.
- readmit (`_lpw22_6`, build-agnostic, runs in default + dev-enforcing): Allowlist, alice bound to a
  listed account and holding an admission row; owner delists; alice unbinds -> admission row gone;
  connect refused, join_game REJECT_NOT_ADMITTED no write, request_bind_nonce refused; control: an
  admitted (listed) caller's admission row survives an unbind.
- privacy_enforcement_tests.rs admission_roster: ungated kind (above).

## Gate CHECKs

`cargo nextest run --workspace [build flags] -E 'package(monster-realm-module) & test(/_lpw22_N$/)'`
per gate; .4 on `--no-default-features --features monster-realm-module/official`; .6 chains the
dev-enforcing build then the default build with an EXPECT on the default line's distinct count.
