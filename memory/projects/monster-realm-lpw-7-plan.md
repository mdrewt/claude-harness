# lpw-7 plan — an attestation verifier compiled into the module (spike)

type: design · tier: hard · doc-only PR on `mdrewt/monster-realm` · worktree `.claude/worktrees/lpw-7`
from `origin/master` `5ceb483e`.

## Scope

- `touches:` docs/local-play.md. Plus a `docs/DECISIONS.md` entry (the spec's DoD mandates it;
  listed under `touches-delta:`).
- No code, no tester, no red run (`type: design`). A `judge` scores the two candidates.
- Spike code lives in `/tmp/lpw-7-spike.MwfDS2/` (scratch, never merged).

## Method (what is measured, and how)

1. Copy of the real module (export of `5ceb483e`) with one reducer `spike_verify(rounds, jwt,
   key_hex)` behind cargo features: `spike_noop` (control), `spike_es256` (`p256` 0.14.0, `ecdsa`
   feature only), `spike_ed25519` (`ed25519-dalek` 3.0.0, no default features),
   `spike_ed25519_fast` (adds precomputed tables), and an attempted `spike_es256_tables`.
2. Builds for the module target: `cargo build --release --target wasm32-unknown-unknown`; the wasm
   import section of each variant is compared with the baseline's (a clock or randomness source
   would be a new host import; the 2.11.0 ABI has none).
3. Size: bytes against the pristine baseline in the shipped profile; a no-op control; a
   one-codegen-unit rebuild of every variant as the controlled comparison; code attributed to crates
   the baseline lacks.
4. Cost: 101 checks in one reducer call, each inside a host-timed `LogStopwatch` span; tokens signed
   by Node's `crypto`; the host is `spacetimedb-standalone` 2.11.0 confined as `docs/local-play.md`
   §7 (systemd scope, 2 GiB, two threads of one core); two passes in opposite order, five calls per
   case per pass; valid, tampered-payload, wrong-key and truncated-signature cases with the accepted
   count asserted.
5. Red-team reads the method and the artefacts; the judge scores from the dossier
   (`DOSSIER.md` in the scratch directory) against a rubric whose weights are fixed there.

## Record

- `docs/local-play.md` §3 "How a world server verifies an attestation": replace the open part with
  the measured answer (builds, size change, median of 101, the budget, the judge's scores, the
  choice); §3 "The design later work elaborates against": three open conditions, not four; §7: the
  spike's method and per-call numbers, and "an in-module signature verifier" leaves "What was not
  measured"; the intro's date and decision list.
- `docs/DECISIONS.md`: one new title-keyed entry naming the verifier (or the fallback), and the
  "per-world attestation" entry's list of open conditions brought in line.

## Acceptance ledger

Both criteria are statements the record must make (doc truth). `standards/testing-tdd.md` forbids a
check that reads a hand-authored doc's text, so each gate is `MANUAL:` with a `path:line` citation
into `docs/local-play.md` (two gates: the manual-ratio rule needs three or more live gates).

## Gate

`just ci` green locally, then `mr-gates check --slice lpw-7`, `mr-comment-scan`, PR open, stop.
