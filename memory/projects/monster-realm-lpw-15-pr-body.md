## lpw-15 — a world's module binds an identity to an account; ownership and the allowlist (module half)

The module half of `M-local-play.spec.md` §lpw-15, built to the access design in `docs/local-play.md` §3 (forks (b), (c), (e)). The client's bind flow is deferred (two gates, below).

### What changed

- **`server-module/src/world_binding.rs` (new).** The verifier and the bind.
  - `verify_attestation(keys, attestation)`: refuses a token over 4096 bytes before decoding; three non-empty segments of strict unpadded base64url; reads only `kid` from the header; takes the key from the build's own list; `ed25519-dalek` `verify_strict`; parses the payload only after the signature verifies.
  - Reducers `request_bind_nonce`, `bind_world_account(attestation)`, the owner-relayed `request_bind_nonce_for(who)` and `bind_world_account_for(who, attestation)`, and the owner-only `set_world_names(names)` and `set_world_allowlist(accounts)`.
  - A bind is refused, each reason its own constant and nothing written, when the attestation does not verify, has expired, names another world (`aud` is not byte for byte one of the world's names), or does not carry the identity's one outstanding nonce. Otherwise the identity's binding is written and the nonce spent.
- **Schema (additive).** Private tables `world_binding`, `world_bind_nonce`, `world_name`, `world_allowlist`; owner-scoped views `my_world_binding` and `my_bind_nonce`; `WorldAccessRule::Allowlist` appended. Lifecycle: the binding and the nonce are `Erase` (the deletion cascade erases both), the names and the list `NotOwned`; none is exported (item 6).
- **`accounts.rs`.** `BuildProfile` gains `attestation_keys`: none on `official`, `default` and `conflict`; the (empty) production list on `world`; the published `local-dev` key on `test` and `dev-enforcing`. `entitled(ctx, profile)` also entitles an identity whose binding the build counts and whose attestation carried `base-game`. The deletion cascade erases a binding and a nonce.
- **`access.rs`.** Under `Allowlist` the owner is admitted; an identity with a binding the build counts is admitted exactly while its account is on the host's list; an identity with no such binding only with a `world_admission` row. A rule change to a rule that is not `Open` carries over only the live identities the rule before the call admitted.
- **Generated.** Client bindings (`just gen`), the four eval baselines.
- **Docs.** Six `docs/DECISIONS.md` entries, `docs/local-play.md` §3 and `ARCHITECTURE.md` state what is built and what is not.

No shipped build's outcome changes: a `world` build refused every join before this PR (it trusts no login issuer) and still does (no production attestation key is published). On a dev-enforcing build a bound, entitled identity joins.

### Acceptance

```
Acceptance: 6/8 met, 2 deferred, 0 unmet — lpw-15 seed:fdcf16a885ee0665
Deferred: lpw-15.6 -> backlog — the client's bind flow is not built here: the slice is two slices (plan: memory/projects/monster-realm-lpw-15-plan.md, "Sizing"). This PR ships every schema change, the verifier, the six reducers and the two owner-scoped views a client reads its nonce and binding through; the flow that asks for an attestation once per world and resumes a bound world with no request to the account service needs net/connection.ts, net/store.ts, shell/session.ts, the shell document's fingerprint field and a development recipe in justfile, none of them in touches (justfile is not grantable), and its naming rules wait on the operator's ruling monster-realm#833 being written into the spec. No shipped build's outcome changes meanwhile: a world build refused every join before this PR (it trusts no login issuer) and still does (no production attestation key is published).
Deferred: lpw-15.8 -> backlog — the client half, with lpw-15.6: the not-owned message for an account the attestation route refuses (acs-7.2's claimModel notOwnedLine) is shown by the client's bind flow, which this PR does not build. The module side it rests on is here: join_game answers 'ownership required' to an unbound caller and to a binding that carried no entitlement.
touches-widened: (files this run granted itself via mr-touches; whoever merges judges each reason)
- client/src/module_bindings/types/reducers.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/bind_world_account_for_reducer.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/my_bind_nonce_table.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/my_world_binding_table.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/request_bind_nonce_for_reducer.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/request_bind_nonce_reducer.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/set_world_allowlist_reducer.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- client/src/module_bindings/set_world_names_reducer.ts — just gen on the lpw-15 schema writes these files (bindings-drift reds without them): the access design (docs/local-play.md §3 forks b, c, e) adds the nonce reducer, the owner-relayed forms, the world-name and allowlist writers and two owner-scoped views beside bind_world_account
- evals/baselines/spacetime-types.json — spacetime-type-snapshot eval reds on drift: WorldAccessRule gains the Allowlist variant the spec names (tail-append; regenerated with the eval's --write)
- evals/baselines/client-visible-tables.json — client-surface-privacy eval (A) reds: the two owner-scoped views my_bind_nonce and my_world_binding are new subscribable accessors and its allowlist has no --write
- server-module/src/movement.rs — review finding (reviewer lens, 78e3971d): the comment on join_game's ownership check says it reads the caller's token and no table; require_entitled reads world_binding since this slice. Comment-only edit.
- server-module/src/guards.rs — review finding (reviewer lens, 78e3971d): the doc of guards::require_subject_not_deleting names its consumers as the two tactics callers with tests in tactics_tests.rs; world_binding.rs's two owner-relayed reducers call it since this slice (the reducer census needs a crate::guards gate there). Doc-only edit.
- docs/local-play.md — review finding (reviewer lens, 78e3971d): docs/local-play.md section 3 says the bind, the attestation key lists and forks (b) and (c) are designed, not built (lines 339, 366, 462, 921); this slice builds their module halves. Doc truth only.
```

**Sizing.** The slice as specified is two slices: the access design added the world's names and their writer, the owner-relayed forms and the two views, and the client half needs files the `touches:` list does not name plus a `justfile` recipe, which a run cannot be granted. All schema lands here (always-serial); lpw-15.6 and lpw-15.8 are deferred to `backlog`.

### For the supervisor to adjudicate

1. **The split.** The spec's DoD reads "lpw-15.1 to lpw-15.8 green". Two of eight are deferred with the reasons above; note n1 is the contract as built for the client slice.
2. **lpw-15.1 and lpw-15.4 are the module's half.** The module refuses an attestation whose `aud` is another world's name (`mod relay_rig`, with the control that the same attestation binds where that name is held). The client's name function (`client/src/net/attestation.ts`) is not built: its rules wait on the ruling on #833. **R-lpg-0-ATTESTRELAY is not closed**; as the access design says, it stays open until the two-host run (R-lpw-8-RELAYRIG).
3. **The `official`-build tests run in no line of `just test`.** `mod official_build` (5 tests) runs only as lpw-15.3's CHECK; `justfile` is not grantable. They are the only tests that kill three mutants (no build guard, the guard after another check, the official build reading a binding). Follow-up R-lpw-15-lpw-15.3 carries the exact line.
4. **`Allowlist` semantics decided here** (plan decision 3): a bound identity is governed by the list alone, so an admission row does not let an unlisted bound identity in; the host's own player gets in by its account being listed. The spec's sentence reads either way.
5. **A binding counts only under a key the build holds** (`key_id` column): added after the plan red-team showed a binding forged under the public `local-dev` key would otherwise survive a republish as `world`.
6. **The binding is not in the data export, where the spec says it is.** The first build exported it and `just ci` went red in the account e2e eval (`[s9/export-extra-table] chunk exists for NON-exportable table world_binding`): the eval holds its own transcription of the exportable tables, and eval scripts are not grantable to a build run. `world_binding` is `Erase`, `exportable: false`; note n5 and follow-up R-lpw-15-NOTEF21B2C carry what the export needs (the exporter, the transcription entry, the sizing pins for a 21-row bundle). Separately, on a `world` build no account row exists, so a player can reach neither erasure nor export there, and there is no unbind reducer: follow-up R-lpw-15-NOTEF43B6E.
7. **R-acs-3-DEVKEY-FORGEABLE** targets this slice and is not closed (note n4): the dev attestation keys are live in `test` and `dev-enforcing` builds since this PR.
8. **Apparatus:** `mr-gates`' DEFER parser rejects the category `ux-a11y` (its pattern allows letters and hyphens only), so lpw-15.8's DEFER is filed as `gameplay/MED`.

### Verification

- **Red first.** Tests were written by `tester` subagents against a typed skeleton: 83 red on the default build, 3 of 4 under `official`, 2 of 5 under `dev_issuers`; the lens-fix round's four contract tests were red before the two fixes; the view test is red with both view bodies gutted. Log: `memory/projects/gates/lpw-15.red-proof.log`.
- **Bite-proofs.** 40 single-edit mutants of `world_binding.rs`, `access.rs` and `accounts.rs`, each killed by a test naming the behaviour (`memory/projects/gates/lpw-15.mutants.log`); the red-team killed 28 more.
- **Interop.** One attestation made by the account service's own `POST /attest` route (`local-dev` profile) binds in the module (`bind_accepts::the_account_services_golden_attestation_binds`).
- **The built module** imports the same 18 host functions as before (no clock, no entropy). Unoptimised release wasm: 3,359,366 bytes at `origin/master` 5616a510, 3,485,583 here (+126,217).
- **Republish over data, on a live 2.11.0 host** (`memory/projects/gates/lpw-15.migrate-probe.sh`): a database published from `origin/master` with a stored `Password` rule took this module with no `--delete-data`; the row read back `password`, the owner then set `allowlist`, and the new tables answered SQL.
- **Local gate:** `just ci` green at `aea8594e` (exit 0, `memory/projects/gates/lpw-15.ci-aea8594e.log`) on the second run; the first was red at `account-service/src/deployment.test.ts:604`, the same Docker bring-up flake as below (`lpw-15.ci-aea8594e.red-deployflake.log`: one compose stack gave no answer in its 60 s wait, the file's other ten tests passed). Before that, green at `fdfe0e61` (`lpw-15.ci.log`), where it took six runs: the first was red at the account e2e eval (the export, item 6, fixed); four were red at `account-service/src/deployment.test.ts`, the Docker bring-up flake R-acs-7-DEPLOYFLAKE, which this PR touches nothing of (the same suite failed the same way on an untouched `origin/master` tree in between, and the file passed alone three times of three; note n6 has the measurements); one run of every other step was green on its own (`lpw-15.ci-rest.log`).
- **Secret scan.** gitleaks' `generic-api-key` rule reads `assert_eq!(key.kid, "<43 characters>")` in the red-tests commit `f5d88f10` as a credential. The literal is the `local-dev` attestation key's public JWK thumbprint, the `kid` in `account-service/attestation-public-keys.json`. `.gitleaksignore` carries that one exact fingerprint (`f5d88f10…:server-module/src/accounts_tests.rs:generic-api-key:12871`, taken from a local run), and at head the `tester` respelled the assertion: `key.kid` is compared with a local holding the same whole literal, a line the rule does not match. Measured with gitleaks 8.30.1 and the repo config: the PR range `5b2e07a6^..aea8594e` is clean (the same command reported exactly that one finding at `fdfe0e61`), and so is the head tree as a single commit on `5616a510`, the shape a squash merge pushes to `master`. The respelled test still bites: with one character of the production `kid` changed it fails on that assertion.
- **Remote CI** at `aea8594e` (run 45004749987): all 11 checks pass, among them the gitleaks step, `cargo audit` over the 11 new packages and the five e2e shards.

### Lenses

- **Plan review (reviewer, red-team):** bindings outlived the key that signed them -> `key_id` and `trusted_binding`; the allowlist read had no keyless guard -> it goes through `trusted_binding`; an admission row overrode delisting -> the list alone governs a bound identity; the relayed forms ignored a deleting `who` -> `require_subject_not_deleting`; unbounded nonce sweep -> at most 32 rows a request; a binding view for the client -> `my_world_binding`.
- **Reducer security audit:** a rule change admitted every live session, which let a delisted or removed identity that was still connected back in -> only identities the old rule admitted are carried over; two requests at one instant drew the same nonce -> the identity is mixed in.
- **Red-team (implementation):** no exploitable defect in 200,000 fuzzed tokens and the reducers; five contracts no test pinned (signature before payload parse, strict verification, every listed key, the build refusal's position, the bounds by value, nonce freshness) -> tests added, each bite-proved.
- **Reviewer:** stale comments in `movement.rs`, `guards.rs`, `access.rs`, `accounts.rs`, `schema.rs` and the three docs -> corrected; simplifications applied (`ListRule`, direct deletes, `Signature::from_slice`).
- **Verifier:** the two views had no behavioural test -> added; the follow-up for the official-build line -> filed. Every change to an existing test adjudicated as at least as strong (rosters, the ownership door's test re-scoped to pin its one read). After the verifier ran, the export was withdrawn (item 6): `privacy.rs` and `privacy_tests.rs` are back to `origin/master`, and the tester restored the twenty-table export pins and added a check that no export chunk carries a binding.
- **desync-guard:** not run. The slice changes no `game-core`, wasm export, movement or render code.

plan-delta:
- `world_binding` is not exported (item 6); the plan had it exportable.
- The first plan refused a bind that moved an identity to another account; built as "the latest attestation an identity presents wins" (the review showed no path to a fresh binding on a `world` build).
- `world_binding` gained `key_id`; `is_admitted` under `Allowlist` reads a trusted binding first.
- A second view, `my_world_binding`, so the client slice needs no module change.
- The nonce mixes in the identity; a rule change carries over only what the old rule admitted (both lens fixes).
- Tester questions answered: an empty segment, a padded payload segment and a float `exp` are malformed; `(Allowlist, Some(""))` takes no password; the owner is admitted before its own binding is read; `mr_ent: null` names no entitlement.

touches-delta:
- `docs/DECISIONS.md`, `ARCHITECTURE.md` — the doc set.
- Widened (`mr-touches`, all granted; reasons in the ledger render above): seven generated binding files and `types/reducers.ts`; `evals/baselines/spacetime-types.json` and `client-visible-tables.json`; `server-module/src/movement.rs` and `server-module/src/guards.rs` (comment and doc only); `docs/local-play.md`.

boyscout-delta: none.

comment-scan: 10 findings, none a history tell or a stray id introduced here.
- `docs/DECISIONS.md:2421` (`acs-3`), `docs/local-play.md:477-478` (`lpw-15`), `:692` (`acs-6`), `:790` (`lpw-12`, `lpw-14`, `lpw-18`): text that names harness work by id, as `docs/local-play.md` does throughout ("Work is named by its id in the harness specs"); the lines are in the diff because neighbouring words changed.
- `server-module/src/accounts_tests.rs:10661` (`sr-3`) and `server-module/src/privacy_enforcement_tests.rs:1460` ("retired"): wording that was there before, on lines the tester re-pinned.
- `server-module/src/access_tests.rs:2430` ("the old salt or hash"): names the row's stored value before the call, not the code's history.

not-verified:
- The `official`-build tests do not run in `just ci` (item 3).
- No bind against a live SpacetimeDB host: the module's tests run on the in-memory native host. On a live host this PR ran only the republish probe above and the account e2e eval of `just ci` (it publishes the dev-enforcing and official artefacts and exercises the join refusals, not the bind).
- `cargo mutants` was not run over the diff; the 40 mutants are hand-written.

Items: none

Sandboxes left in `/tmp` (recursive deletes are guard-blocked): `/tmp/lpw15-golden.QMyUuV` (golden attestation script, mutant driver), `/tmp/lpw15-rt.ZzOvsb` (red-team worktree; `git worktree remove --force /tmp/lpw15-rt.ZzOvsb/wt` clears its record), `/tmp/lpw15-verif.369XiU` (verifier copy), `/tmp/tmp.psIvv5TieN` (gitleaks probes and reports, the two gate logs of `aea8594e`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
