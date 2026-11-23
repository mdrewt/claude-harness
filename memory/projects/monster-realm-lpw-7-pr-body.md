The attestation verifier is Ed25519: the `ed25519-dalek` crate, called through `verify_strict`. An ES256 verifier (`p256`) and an Ed25519 one both build for the module's `wasm32-unknown-unknown` target with no clock and no source of randomness, and both cost well under the 5 ms budget for one check, so the audience-scoped fallback is not the route. This PR changes two documents and no code; the spike's code stayed in a scratch directory.

| Verifier | Builds for the module target | Module size change (one codegen unit, over a reducer with no check) | Median of 101 checks inside one reducer, 2.11.0 standalone host | Against 5 ms |
|---|---|---|---|---|
| ES256: `p256` 0.14.0, `ecdsa` only | yes | +70,435 bytes | 593.3 µs | 8.4 times under |
| Ed25519: `ed25519-dalek` 3.0.0, no default features | yes | +58,156 bytes | 108.4 µs | 46 times under |

A judge scored Ed25519 55 and ES256 45 of 65 (26 and 21 of 30 unweighted) on a rubric fixed before scoring. One thing reverses the choice: if the production host's key service cannot hold an Ed25519 key, ES256 is the verifier (it fits the budget too). That host is not chosen yet.

decided:
- which verifier checks an attestation inside the module -> Ed25519, `ed25519-dalek` 3.0.0 with no default features, through `verify_strict` (over: ES256 with `p256` 0.14.0)
- whether the fallback is the route -> no, both candidates build and cost under 5 ms (over: audience-scoped tokens from the account issuer)
- which `ed25519-dalek` configuration -> no default features (over: `fast`, 4 percent faster for 10,909 bytes more)

## What changes

- **`docs/local-play.md` §3:** a new subsection, "What a signature check costs inside a reducer": the answer table above, what one check is, the cost of a token that fails (the same as a valid one), one check per call, the cost against token length, the judge's scores and what decided each criterion, the fact the choice turns on, and what the bind must add to the check. "How a world server verifies an attestation" names the verifier where it left the question open. "The design later work elaborates against" lists three open conditions, where it listed four, and says the fallback is not the route.
- **`docs/local-play.md` §7:** the method, the ten per-call medians per variant, the one-check-per-call and token-length runs, and the argument-size probe. "What was not measured" loses the in-module verifier and gains what this measurement leaves out.
- **`docs/local-play.md` intro and §3 intro:** the second measurement date and commit, the third decision, and "measured" no longer tied to one date.
- **`docs/DECISIONS.md`:** a new entry, "The attestation is signed with Ed25519 and checked by `ed25519-dalek` compiled into the module". Two older entries are brought in line with it (below).

## What the measurement found beyond the two criteria

- **The cost grows with the token's length.** Both verifiers hash the whole token: a check passes 5 ms at about 430 KiB (ES256) and 688 KiB (Ed25519), a token that fails costs what a valid one costs, and the host's HTTP call route takes a 1.5 MiB argument. The budget therefore holds only if the bind refuses an over-long token before decoding it. The record and the decision entry say so, and a targeted row for lpw-15 carries it (`R-lpw-7-BINDCAP`).
- **The module's size change cannot be read from the shipped profile.** There a reducer with no verifier alone adds 110,197 bytes, more than either verifier, because adding any code to the module crate changes how unrelated functions are inlined. The size column is from one-codegen-unit builds against that control.
- **`p256`'s `precomputed-tables` feature is a trap and no gain.** Through `std` it enables `getrandom` 0.4.3, which refuses the target at compile time; through `critical-section` it builds and is no faster (603.0 µs against 585.2 µs).
- **The account-service spec does not yet say Ed25519.** acs-1's `keys.ts` loads ES256 keys only and acs-3 names no algorithm for the attestation key. A targeted row for acs-3 carries it (`R-lpw-7-ATTESTKEY`), with the production key service's Ed25519 support as the condition to confirm.

## Acceptance

Acceptance: 2/2 met, 0 deferred, 0 unmet — lpw-7 seed:3c91c7dbd007dfe0

- **lpw-7.1:** `docs/local-play.md` §3 states, for both verifiers, that it builds, the size change and the median of 101 checks. The ledger CHECK recomputes each stated median from the ten per-call medians in §7 and requires all three cells for both rows: `lpw-7.1 STATED`.
- **lpw-7.2:** neither condition holds (a candidate builds, and its median is under 5 ms), and the record says the fallback is not the route. The ledger CHECK derives that from the recorded cells and requires the conclusion and the decision entry to agree with it: `lpw-7.2 CONSISTENT verifier-fits=true rows=2`.

Both CHECKs were watched failing first: on `origin/master`'s documents, on a copy with one stated median changed, on a copy with both medians over budget and the conclusion unchanged, and on a copy with the decision entry renamed and a size cell blank.

## Review lenses

- **Red-team on the method and the artefacts** (before the judge): confirmed the 101 checks are real work (energy scales linearly with the count; tampered and wrong-key tokens accept nothing and cost the same), recomputed the medians, and found the token-length finding above, the unfair "does not build" wording for `p256`'s tables, the missing cold single-check numbers, the noisy shipped-profile size column, and the lenient base64url decoder in the spike. Each was re-measured or reworded; the dossier the judge read had them.
- **Judge:** recomputed the medians and the size changes from the raw data before scoring; scores and overturn condition are in the record.
- **Fact-check lens** on the committed diff: every number in both files recomputed from the raw data, no mismatch.
- **Reviewer** on criteria coverage, standards and consistency: no blocker; seven should-fix items, all applied (the size column's qualifier, "the host exports no clock or entropy function" in place of "offers a reducer no clock", the bind marked as not built, replay keyed on the spent nonce, key-service claims marked as read and not tried, the `alg` name, the dated meaning of "measured").
- Reducer-security, desync and verifier lenses have no subject: the diff holds no code and no test.

## Gate

`just ci` green locally at `fbd4d94b` (the PR head): 3,417 + 1,120 + 3,089 Rust tests, 15 evals, 6,192 client tests in 245 files, 9 observability checks, `CI-EXIT=0`.

touches-delta:
- `docs/DECISIONS.md` — the spec's definition of done requires an entry naming the chosen verifier.

boyscout-delta:
- `docs/local-play.md` "How a world server verifies an attestation" (one line) — "the attestation key as module data" read as a single key; the design holds a `kid`-keyed list.
- `docs/DECISIONS.md` "A private world verifies an account by a per-world attestation our account service signs" (one sentence) — it listed the verifier spike as an open condition; it now points at the new entry.
- `docs/DECISIONS.md` "The account service is our own small OIDC issuer; Steam is the only player sign-in" (one clause) — "a separate key" is now "a separate Ed25519 key", with a pointer to the entry that says when ES256 replaces it.

plan-delta:
- Three runs were added after the red-team: the cost against token length, one check per reducer call on fresh hosts, and `p256`'s tables through `critical-section`; plus a probe of the largest argument the HTTP call route takes.
- The ledger gates carry executable consistency CHECKs, as lpg-0's do for the same document, in place of the `MANUAL:` citations the plan named: `mr-gates verify` flags a ledger in which no command runs.

comment-scan: CLEAN

Items: none

Spec notes (`mr-gates notes list --slice lpw-7`): n1 with `R-lpw-7-BINDCAP` (target lpw-15), n2 with `R-lpw-7-ATTESTKEY` (target acs-3), n3 (the spec's "Sign-in design" still lists the verifier spike as open).

Scratch, left in place: `/tmp/lpw-7-spike.MwfDS2/` (the spike module, drivers, raw spans, the dossier) and `/tmp/lpw-7-lockprobe.*`.

not-verified:
- The verifier on any machine but one fast desktop processor (AMD Ryzen 9 9950X under WSL2); slower hardware is not measured.
- The largest reducer argument a WebSocket call carries (only the HTTP call route was probed).
- An Ed25519 key in any key service (AWS KMS and Google Cloud KMS document it; Azure Key Vault unconfirmed), and a JOSE library writing either `alg` name: read, not tried.
- Whether `p256` 0.14.0 and `ed25519-dalek` 3.0.0 (both published July 2026) have been audited.
- The remote-only CI jobs (gitleaks, cargo-audit, e2e) and the supervisor's `mr-gates verify`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
