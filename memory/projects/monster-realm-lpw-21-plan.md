# lpw-21 — plan: the allowlist is seeded when switched on and always lists the host

Spec: `specs/monster-realm-v2/M-local-play.spec.md` §lpw-21 (operator decision monster-realm#846) ·
base `origin/master` 88a3c8cb (lpw-15, #850) · worktree `.claude/worktrees/lpw-21` · branch
`slice/lpw-21`. No schema change, no new reducer, no binding regeneration.

## Sizing

One slice, whole. Three write paths change (`set_world_access`, `set_world_allowlist`,
`bind_identity`), all in two files; the rest is tests and one `docs/DECISIONS.md` entry amended in
place. Nothing is deferred.

## What changes

The invariant: **while the rule is `Allowlist`, the list holds the account of the owner's trusted
binding.** Three writes could break it, and each now keeps it: the switch to `Allowlist`, the
owner's `set_world_allowlist`, and a bind of the owner's identity. Under `Open` and `Password` the
list is stored exactly as the owner names it and is not read (lpw-21.5); the next switch to
`Allowlist` seeds it again.

"A binding" means a binding the build counts (`world_binding::trusted_binding`, lpw-15): a row
signed by a key the build does not hold counts for nothing, so it seeds nothing and keeps nothing.
A build with no attestation key reads no binding and seeds nothing.

### `server-module/src/world_binding.rs` (owns `world_binding` and `world_allowlist`)

```rust
/// The account of every binding the build counts whose identity `of` accepts, each once, in
/// ascending byte order. A build with no key answers none without reading.
pub(crate) fn bound_accounts(
    ctx: &ReducerContext,
    profile: &BuildProfile,
    of: impl Fn(Identity) -> bool,
) -> Vec<String>

/// Pure. The accounts of `wanted` that `listed` lacks, each once, in ascending byte order.
/// `Err(REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS)` when `listed` and those additions together number
/// more than `MAX_ALLOWLIST_ACCOUNTS`.
pub(crate) fn allowlist_additions(listed: &[String], wanted: &[String])
    -> Result<Vec<String>, &'static str>

/// Add `accounts` to the stored list, keeping every row it holds. Refused with nothing
/// written when the list would then hold more than `MAX_ALLOWLIST_ACCOUNTS`.
pub(crate) fn add_to_allowlist(ctx: &ReducerContext, accounts: &[String])
    -> Result<(), &'static str>
```

`bound_accounts` streams the table (one row per identity that ever bound, unbounded) and keeps
only the distinct accounts, so the switch holds no copy of the table.
`add_to_allowlist` is the imperative shell of `allowlist_additions`: it reads the stored list
whole (`.iter()`, at most 256 rows through reducers), asks the pure function, and inserts.

- `set_world_allowlist(accounts)`: after the owner check and `check_entries` (unchanged, same
  refusals in the same order), when `access::rule_in_force(ctx)` is `Allowlist` and the caller
  (the owner) holds a trusted binding whose account `accounts` omits, that account is appended.
  If that makes 257, `REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS`, nothing written. Then the stored set
  is replaced, as today. Under `Open` and `Password` the set is stored as named.
- `bind_identity(ctx, profile, who, attestation, reducer)`: after its last existing check and
  before its first write, when `who` is the world's owner and the rule in force is `Allowlist`,
  `add_to_allowlist(ctx, &[subject])`; its refusal refuses the bind (no binding written, the
  nonce not spent). A bind of anyone else, or under another rule, never touches the list.

### `server-module/src/access.rs` (owns the rule)

- `pub(crate) fn rule_in_force(ctx) -> WorldAccessRule` (the stored row's rule, or `Open`);
  `is_admitted` reads through it. `is_world_owner` becomes `pub(crate)`.
- `set_world_access`: when `rule` is `Allowlist` and the rule in force before the call is not,
  the seed runs after the password validation and the carry-over read, and before any write:

  ```rust
  // The rule still in force decides: the row written below replaces it.
  let seed = crate::world_binding::bound_accounts(ctx, &BUILD_PROFILE, |identity| {
      is_admitted(ctx, identity)
  });
  crate::world_binding::add_to_allowlist(ctx, &seed)  // Err -> reject(..), nothing written
  ```

  `is_admitted` is the one statement of who a rule admits, so the seed is the spec's sentence
  with no second copy of the rule: under `Open` every trusted binding; under `Password` those of
  identities holding an admission row, and the owner's. The owner's bound account needs no
  separate clause: `is_admitted` admits the owner under every rule.
  `Allowlist` set over `Allowlist` does not touch the list. `Open` and `Password` neither read
  nor write it. The `admit` argument plays no part in the seed. lpw-15's carry-over (an admission
  row for each live identity the rule in force admitted) is unchanged.

### `server-module/src/lib.rs`

In `touches:`; no edit is planned (`live_session_identities` is unchanged).

### `docs/DECISIONS.md`

The entry "A world that is not open refuses an unadmitted identity at connect and in every
reducer; the owner relays the door" (the allowlist's entry, written by lpw-15) is amended in
place: the seed, the owner's account, the list kept while the rule is off, the cap.

## Decisions taken here

1. **The seed and the kept account count trusted bindings only.** The spec says "every binding";
   lpw-15 already rules that a binding under a key the build does not hold counts for nothing.
   Seeding from such a row would list an account nothing vouches for today, and would not admit
   its identity anyway (under `Allowlist` it is treated as unbound). plan-delta, and a spec note.
2. **The owner's account is kept while the rule is `Allowlist`, not under the other rules.** The
   criterion is conditioned that way; under `Open` and `Password` the list is unread, an owner
   bind that had to add to a full list would be refused for a rule that is not in force, and the
   switch to `Allowlist` restores the invariant through the seed.
3. **The cap is never exceeded; a write that would exceed it is refused, never trimmed.** The
   seed (lpw-21.2), a `set_world_allowlist` of 256 accounts that omits the bound owner's, and an
   owner bind onto a full list all answer `REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS` with no write.
4. **Seed only when the rule changes to `Allowlist`.** Setting `Allowlist` again adds nothing:
   every identity that rule admits through a binding is already listed, and the owner's account
   is kept by the invariant.
5. **One check-then-write helper, no plan/apply pair.** Every refusal of `set_world_access`
   precedes its first write already; the seed's refusal joins them and the list rows are the
   call's first write. The native test host models no rollback, so "writes nothing" is asserted
   as no write call at all.
6. **An owner who binds to another account keeps both on the list.** The spec says the account
   is added; removing the earlier one is the owner's call (`set_world_allowlist`).

## Tests (the tester writes them; the trailing token is the ledger's selector)

`server-module/src/access_tests.rs` and `server-module/src/world_binding_tests.rs`, native host.
Each test name ends `_lpw21_<n>`; the ledger selects `test(/_lpw21_<n>$/)` across both files.

- lpw-21.1: the seed from `Open` (no row and an `Open` row), from `Password`, kept rows kept,
  distinct accounts once, untrusted bindings ignored, `Allowlist` over `Allowlist` untouched, the
  admit list not seeded, a non-`Allowlist` target leaves the list alone.
- lpw-21.2: 257 distinct refused with no write call on any table; exactly 256 accepted; the
  count is of the union with the kept list; the pure `allowlist_additions`.
- lpw-21.3: `set_world_allowlist` omitting the owner's account; naming it; the 256 + 1 refusal;
  the other rules store as named; an unbound or untrusted owner keeps nothing; the owner's bind
  (self-serve and relayed) under `Allowlist` adds; under other rules, or for another identity,
  does not; a full list refuses the bind with no write.
- lpw-21.4: after a seeded switch, removing an account refuses each identity bound to it (two
  identities, one connected, one not) at `require_admitted`, at connect and at the real
  `join_game`; adding it back admits at the next call.
- lpw-21.5: `Allowlist` to `Open` and to `Password` admit as lpw-9 defines with the list unread
  (`Fixture::rows_read`), the list kept, and the switch back adds the seed to the kept list.

Existing lpw-15 tests keep their assertions. The fixture `access_tests::allowlist::tables`
registers `world_binding` and `world_allowlist` read-only; the seed scans one and writes the
other, so the tester makes them scannable and writable there (four tests switch to `Allowlist`).

Clauses already true on `master` (lpw-21.4's refusal after delisting, lpw-21.5's "unread") cannot
fail red on the defect; each test reaches them through the seeded switch, which does fail on
`master`, and the orchestrator bite-proofs the already-true clauses against a local mutant that
is never committed.

## Ledger

Each gate: `cargo nextest run --workspace --run-ignored all -E 'package(monster-realm-module) &
test(/_lpw21_<n>$/)'`, EXPECT the exact `N tests run: N passed` of the tester's delivered count.

## Outside `touches:`, not edited

`server-module/src/schema.rs` says `world_allowlist` is "Written only by the owner's
`set_world_allowlist`"; after this slice the seed and the owner's bind write it too (all inside
`world_binding.rs`). `*schema*` is always-serial and two siblings are in flight (st-13, lpw-19),
so the comment is a follow-up note, not a widen.

For lpw-22 (a spec note): under `Allowlist` an identity with no trusted binding is admitted by a
`world_admission` row. Once a player can unbind, an account the owner removed gets back in by
unbinding whenever it holds such a row (from the door, or from the carry-over at a rule change).

## Comments and docs inside `touches:` that this change makes stale (rewritten in the build)

`access.rs` module doc (the `Allowlist` paragraph and the write-isolation paragraph) and the doc
of `set_world_access`; `world_binding.rs` module doc (write-isolation: what it reads through
`crate::access`), the docs of `set_world_allowlist`, `bind_identity` and
`REJECT_TOO_MANY_ALLOWLIST_ACCOUNTS`' three callers.

## Plan review: what each finding became

Reviewer (no blocker). (1) `config.owner_identity` may not be the identity the host plays as (a
shell keeps its own owner token and admits its player): built as the criterion says, the owner
identity's binding; a spec note says the host's player is covered once the owner identity is
bound to the host's account (lpw-23 and lpw-24 bind it for the daily check), and until then the
host can delist their own player and re-add it with one call. (2) A removal does not survive a
rule round trip (`Open` re-seeds every binding; `Password` re-seeds whoever holds an admission
row, and the carry-over gave every live identity one): specified
(`allowlist-reenable=union-with-kept-list`); stated in `docs/DECISIONS.md` and the PR, spec note.
(3) A seeded account outlives its player's erasure (`world_allowlist` is `NotOwned`): stated in
`docs/DECISIONS.md`; the manifest basis ("written only by the module owner") stays true, since
every write is in a call the owner makes. (4) The 256 + 1 refusal of `set_world_allowlist` is a
new refusal: decision 3, named in `docs/DECISIONS.md`. (5) A world with more than 256 bound
accounts cannot switch from `Open`: red-team (1). (6) Comment drift: the list above.

Red-team (no critical). (1) HIGH: a joiner blocks the switch from `Open` by binding 257
identities to 257 accounts; the owner has no reducer that drops a binding. Specified (lpw-21.2
forbids trimming). The way round is `Password` first (it seeds only identities holding an
admission row), or deleting binding rows over SQL as the database owner. Stated in
`docs/DECISIONS.md` and the PR; a follow-up row asks for an owner-side way to drop a binding.
(2) MED: the round trip, as reviewer (2). (3) MED: lpw-22's unbind plus an admission row
re-admits a removed account: the spec note for lpw-22. (4) LOW-MED: the scan is unbounded
(`world_binding` has one row per identity that bound, and one account may bind many identities):
`bound_accounts` streams and dedups instead of collecting rows; the table's growth is lpw-15's
and goes in the same follow-up row. (5) LOW: the invariant after a republish under other keys
(the owner's binding stops counting, a `set_world_allowlist` then drops the account, and a
republish back leaves it off until the next owner write): the owner identity is admitted
whatever the list holds, so only the host's other identities of that account are affected;
stated in the PR. The red-team's test scenarios go in the tester's brief.
