# rb-34 plan / adjudication memo (2026-09-01)

Slice: rb-34 — residual R-rb-7-X8-residual (guest-claim tombstone value ban, accounts.rs half).
Worktree: `.claude/worktrees/rb-34` @ e321442 (origin/master, CI green). Ledger: `gates/rb-34.gates.md`.

## Decision

The brief's branch-(3) reading ("nothing to guard until S3b; re-defer everything") was tested and
**partially rejected** by an adversarial red-team lens (write-the-cheat, measured):

- accounts.rs already CAUSES a guest-claim tombstone write by delegation:
  `rekey_all` (accounts.rs:376) → `ranking::rekey_profile` → private `tombstoned_profile` →
  `"(claimed guest)"`. rb-7's module-privacy closes only DIRECT symbol reference.
- **Measured PoC**: `crate::ranking::rekey_profile(ctx, args.account_identity, args.account_identity)`
  spliced into the reaper's cascade slot renames a DELETED account to "(claimed guest)" + zeroes
  ladder stats at 686/686 module tests + clippy + guest-claim eval all green (after the
  frozen-body-pin update that pin's own docs instruct S3b to make). The residual's threat is
  therefore live-by-delegation, not hypothetical-by-literal.
- The **closable-now** half: a call-site/census ratchet in accounts_tests.rs (born-green,
  bite-proven by mutation; same class as the file's four shipped G5 ratchets). Ships as X2/X3/X4.
- The **S3b-only** half (ranking.rs second-writer pin, no-name-param helper shape, per-table
  value-equality, literal-forgery battery): DEFER X5 → backlog, folding into R-m22-s3-X13's
  slice. Full buildable list in the ledger DEFER.

Candidates measured and REJECTED (red-team): a `#[should_panic]` debug_assert guard (manufactured
RED, unreachable input, compiled out of release wasm); a header-prose pin (measured useless — the
exploit ships 687/687 green with it in place); raw literal scan for the value (born-green AND
forgeable per rb-7's own measurements); trybuild negative-compile (new dep = Cargo.toml out of
touches); duplicates of RB7-B1/B2.

## Lens record

- red-team (opus, plan phase): premise attack + write-the-cheat + enforcement-state verification
  + DEFER-shape critique. Broke the original all-defer adjudication; produced the PoC and the
  tooth design. (agentId a0835cba6155eb933)
- tester (opus, mandatory): authored the tooth + attempted 9 bypasses of it (F1-F9). Its Bash is
  hook-blocked (guard-tester-bash.mjs permits syntax checks only), so the orchestrator executed
  ALL measurements: count probe (bare=1 qualified=1 fndecl=1 in_body=1 — derivations confirmed),
  green-on-HEAD, and the mutation battery. One REAL bypass found (F5 third-module re-export,
  unclosable from an ACCOUNTS_RS scan) → folded into X5 DEFER item 7 with a census design.
  (agentId a04c4097420b562e0)
- reviewer (opus, post-diff, frozen at 809bbfa): ONE MAJOR (M1) — the one-hop-up route
  (cascade calls `rekey_all` itself, never naming the delegate; ADR-0225 names rekey_all as the
  delegation precedent, and the hop would MATERIALISE the deleted account's ladder history under
  a fresh sentinel-named row). Closed by clause 5 (fan-out site census 2, claim-reducer decl/name
  censuses, call-in-claim-body) + mutants m6-m9, all measured biting on their pinned tags.
  Three minors applied: inert-call attribution corrected (no textual gate owns inertness),
  ZERO-direction sentences added to clauses 2/3, prefix-collision false-RED cost documented,
  ARCHITECTURE.md CI-green qualifier added. (agentId ad13f30dc422c89d9)
- reducer-security-auditor/desync-guard: N/A judged — no reducer/table/schema/game-core change
  (test-only + doc diff); recorded here for the orchestration audit.
- verifier: post-CI (see ledger evidence).

## Notes for the supervisor

- **ADR-225 collision**: assigned number 225 is taken by m22-s3's
  `0225-s3-rightsized-cascade-deferred-g5-write-isolation.md` (merged 09:18Z, after assignment).
  rb-34 ships NO ADR (decision recorded in ledger + PR; ADR-0211 already frames the mechanism).
  If an ADR is wanted for the ratchet-class decision, assign a fresh number to a follow-up.
- ADR-0211:72's residual instruction ("new evals/deletion-completeness.eval.mjs") is policy-dead
  under ADR-0224:76 — the DEFER re-points the vehicle to ordinary Rust tests. ADR-0211's body was
  NOT edited (outside rb-34's doc scope).
- rb-7 X8 EVIDENCE cites ARCHITECTURE.md:213; the mirror now lives at ARCHITECTURE.md:227-241
  (drift noted in the DEFER, historical ledger left untouched).
