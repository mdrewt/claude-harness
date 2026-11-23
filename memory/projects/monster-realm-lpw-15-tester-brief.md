# lpw-15 — tester brief (shared part; each tester's own task is in its prompt)

You write gating tests from acceptance criteria. You do not implement. You have no shell: the
orchestrator compiles and runs your tests and proves each fails on the skeleton. Write only the
files your prompt assigns. Report anything you find wrong in the contract as a **defect** or a
**question**, apart from the tests.

Repo (a git worktree, write here directly):
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpw-15`

Read first: the plan
`/home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-lpw-15-plan.md` (it is
the contract: every name, signature, constant and order below comes from it), then the skeleton
`server-module/src/world_binding.rs` (typed stubs, final signatures), `server-module/src/schema.rs`
(search `WorldBinding`), `server-module/src/accounts.rs` lines 57-160 and the `entitled` function,
`server-module/src/access.rs`.

## The criteria (spec `M-local-play.spec.md` §lpw-15)

- **lpw-15.1:** WHEN `bind_world_account` receives an attestation that verifies, names this world
  as lpw-8 defines it, carries this identity's outstanding nonce and has not expired, THE SYSTEM
  SHALL record the binding for `ctx.sender()` and spend the nonce.
- **lpw-15.2:** WHEN the attestation fails any of those checks, or its nonce was spent or expired,
  THE SYSTEM SHALL refuse it with no write.
- **lpw-15.3:** WHEN `bind_world_account` runs on an official build, THE SYSTEM SHALL refuse it
  with no write.
- **lpw-15.4:** WHEN a hostile-host rig relays to this world an attestation the player's client
  fetched for the rig's own world, THE SYSTEM SHALL refuse it.
- **lpw-15.5:** WHEN a world's rule is `Allowlist`, THE SYSTEM SHALL admit a joiner only with a
  binding whose account is on the list, and a joiner who presents no attestation only if that
  identity was admitted before.
- **lpw-15.7:** WHEN a connection with no binding, or with a binding whose attestation carried no
  `mr_ent`, calls `join_game` in a `local` or `private` world on an enforcing build, THE SYSTEM
  SHALL refuse it with acs-6.1's error (`accounts::ERR_OWNERSHIP_REQUIRED`) and write nothing,
  under `Open`, `Password` and `Allowlist` alike.

## The attestation, exactly as the signer makes it

A compact JWT: `base64url(header) "." base64url(payload) "." base64url(signature)`, unpadded.
Header `{"alg":"Ed25519","kid":"<kid>"}`. Payload claims `iss`, `sub`, `aud` (one string: the
world's name), `nonce`, `mr_ent` (an array, `["base-game"]`), `iat`, `exp` (integer seconds,
`iat + 300`), `jti`. The signature is Ed25519 over the ASCII bytes of
`<header segment>.<payload segment>`, 64 bytes. Signer: `account-service/src/attest.ts`.

The `local-dev` signing key (public, by design): its 32 secret bytes are
`SHA-256("monster-realm local-dev attestation key 1")`; build it with
`ed25519_dalek::SigningKey::from_bytes(&seed)` (`sha2` is a dev-dependency; `ed25519_dalek::Signer`
gives `.sign(bytes)`; `Signature::to_bytes()` is the 64 bytes). Its public half is
`accounts::DEV_ATTESTATION_KEYS[0]` (`kid`
`ZwdbDVawj1m0Ot-iNvOUMykc1_hgr1dD5wRMph3rgWE`). The `base64` crate (0.21,
`base64::engine::general_purpose::URL_SAFE_NO_PAD`, trait `base64::Engine`) is a dependency of the
crate, so tests may encode with it. For keys other than the dev key (an unknown `kid`, a second
listed key, a key swapped under a known `kid`) make your own `SigningKey::from_bytes(&[n; 32])` and
pass an `&[AttestationKey]` to `verify_attestation`, or a `BuildProfile` literal holding them to
`bind_identity` (leak a `Vec` for the `'static` slice).

One golden attestation, made by running the account service's own route (`POST /attest`,
`local-dev` profile, clock fixed at 1 800 000 000 s). Keep the three segments as three separate
constants joined with `.` at run time (a whole JWT literal trips the secret scanner):

- header segment: `eyJhbGciOiJFZDI1NTE5Iiwia2lkIjoiWndkYkRWYXdqMW0wT3QtaU52T1VNeWtjMV9oZ3IxZEQ1d1JNcGgzcmdXRSJ9`
- payload segment: `eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjQ0NTUvYXR0ZXN0Iiwic3ViIjoiZGV2OjZmMWMyYTNiLTBkNGUtNGY1YS04YjZjLTdkOGU5ZjBhMWIyYyIsImF1ZCI6InNwa2k6R09MREVOLWZpbmdlcnByaW50XzAxMjM0NTY3ODlhYmNkZWYvZ29sZGVuLXJlYWxtIiwibm9uY2UiOiIwMDAxMDIwMzA0MDUwNjA3MDgwOTBhMGIwYzBkMGUwZiIsIm1yX2VudCI6WyJiYXNlLWdhbWUiXSwiaWF0IjoxODAwMDAwMDAwLCJleHAiOjE4MDAwMDAzMDAsImp0aSI6IjdmNWUzMDcwLTFhNjUtNDc0NS04ZDJkLTM2MmRkMGY0YjA1ZCJ9`
- signature segment: `IZBrOypA29W-ER2jKbcanTSTjlhMJ3zslC-TcPymsFShHewySggRoTe2iVlz8fq3nuyd4EGespAmiEKxYKOICg`
- it decodes to: `sub` `dev:6f1c2a3b-0d4e-4f5a-8b6c-7d8e9f0a1b2c`, `aud`
  `spki:GOLDEN-fingerprint_0123456789abcdef/golden-realm`, `nonce`
  `000102030405060708090a0b0c0d0e0f`, `mr_ent` `["base-game"]`, `iat` 1800000000, `exp` 1800000300.

## The test host

`server-module/src/native_host_tests.rs` is an in-memory host for native tests: read its header
and `Fixture`'s methods (`fixture()`, `table`, `table_keyed`, `seed`, `rows`, `run_as`,
`run_as_conn_at`, `writes_to`, `reset_writes`, ...). `server-module/src/access_tests.rs` is the
closest pattern (owner, admission, `set_world_access`, connect); `movement_tests.rs`
`mod acs6_enforcing` (line 4590) is the pattern for real `join_game` on an enforcing build. Rules
of that host that decide how a test must be written:

- A read through an index no test registered yields no row; a write to a table no test registered
  aborts the process. Register every table a path under test writes, and register an index
  whenever a refusal depends on what a read finds (otherwise the test passes for the wrong reason).
- Seed rows through the fixture, never with `ctx.db.<table>().insert(` in a test (source scanners
  read `_tests.rs` files and count those accessors).
- Identities in fixtures are `[n; 32]` with n >= 1 (all zeros equals a default sender).
- `ctx.random()` works in the host (it is seeded from the call's timestamp).
- The whole suite is expected green only on the default build (the `test` profile: it holds the
  dev attestation keys and does not enforce ownership). A module meant for another build carries
  the `#[cfg]` the plan names, and must still compile with every feature on at once.

## Doctrine (binding)

- `~/.claude/harness/standards/testing-tdd.md`: tests execute code. No test reads hand-written
  source text (`include_str!` of a `.rs`, `.ts`, manifest or doc is forbidden). Reading a
  *generated* artifact is allowed: `account-service/attestation-public-keys.json` is one.
- Each refusal test starts from a fixture that is valid in every other way, asserts the exact
  constant, and asserts that no table changed (every registered table's rows equal what was
  seeded; the nonce row is still there). A test whose fixture fails a second check proves nothing.
- Each acceptance test asserts the rows by value, not by count alone.
- Test names lead with the behaviour; a criterion id may appear only as the last token of a test
  name (`..._lpw15_2`). No criterion ids, slice ids or history words ("no longer", "the old",
  "used to", "was", "now") in comments: comments state what the code does.
- `scripts/check-secrets.mjs` fails on `(password|secret|api_?key)\s*[:=]\s*["'][^"']{8,}["']` on
  any line, tests included: never assign a literal of 8 or more characters to a binding or field
  whose name contains one of those words.
- `just lint` is clippy with `--all-targets --all-features -D warnings`: no `assert!` on a bare
  constant (bind through `std::hint::black_box`), no doc line starting with `>`, doc lists
  indented correctly. `cargo fmt` reformats your files afterwards; do not fight it.
- Deterministic: no wall clock, no unseeded randomness. No `#[ignore]`.
- Do not edit `server-module/src/world_binding.rs` or any non-test file.
