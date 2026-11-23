# lpw-8 plan — the access and attestation design

type: design · tier: hard · doc-only PR on `mdrewt/monster-realm` · worktree `.claude/worktrees/lpw-8`
from `origin/master` `d6d80547`.

## Scope

- `touches:` docs/local-play.md. Plus `docs/DECISIONS.md` (the spec's DoD mandates an entry per
  decided fork; listed under `touches-delta:`).
- No code, no tester, no red run (`type: design`). A `judge` scores at least two alternatives for
  each of forks (a), (b), (c) and (e); (d) is operator-decided.
- Scratch lives in `/tmp/lpw-8-sb.6z0WKO/` (never merged): `p1/` the lpw-8.3 measurement, `p2/` the
  admission probe module and its drivers, `judge/DOSSIER.md` the evidence the judges scored,
  `ledger/` the ledger checks and their red proof.

## Method

1. **lpw-8.3 (a measurement, never an assumption).** `evals/account-e2e.eval.mjs` loaded as a
   module with its rig functions exported (stub issuer, `mintJwt`, the two patchers); the module at
   `d6d80547` patched by it, built, published to a fresh `spacetimedb-standalone` 2.11.0; four
   tokens (right audience, wrong audience, unlisted issuer, the host's own) sent three times each to
   `/call/join_game` and `/sql`, plus `/schema`, a WebSocket and the MCP tools; two runs.
2. **Fork (a) probe.** A one-file module in five cargo-feature variants on a 2.11.0 host: refuse at
   connect; four row-filter shapes. Records what an unadmitted identity can read and call over every
   route, the door, and removal while connected.
3. **Red-team on the dossier before judging** (attack each candidate; recheck every measured claim
   against the raw output), then **four judges in parallel**, one per fork, each with a rubric whose
   weights are fixed in the dossier.
4. **Record** in `docs/local-play.md` §3: the HTTP-route measurement; "The access and attestation
   design" (summary table: chosen, rejected, proved by; per fork the design, the rejected
   alternatives, the judge's table, the reversal conditions and the test lpw-9 or lpw-15 runs); §7
   the method and per-run counts. `docs/DECISIONS.md`: one entry per fork, and the sentences in four
   older entries that pointed at lpw-8 as open.
5. **Lenses on the committed diff:** reviewer (criteria coverage, standards, consistency) and a
   fact-check lens (every number and claim against the raw output and the sources).

## Acceptance ledger

Four seeded gates, each an executable consistency check over the record's own tables (`node -e`,
node 18, no shell in the doc): 8.1 recomputes every judge total from scores and weights, requires
the chosen alternative to be the top gate-passing row of its fork, a proved-by criterion of lpw-9
or lpw-15 per fork, and the four decision entries; 8.2 derives each (b) alternative's gate from
whether a host can set what it derives from, and requires the chosen one to derive from the build;
8.3 requires a status for the wrong-audience token on both routes, the control row, the rig and
host named, and the per-run request counts to add up to the stated refusals; 8.4 recomputes every
row of the feature table from the stated rule, requires no row with production trust and
enforcement off, and a named test in each of the four both-sides cells. Each was watched failing on
`origin/master`'s documents and on fourteen mutated copies (`gates/lpw-8.red-proof.log`).

## Gate

`just ci` green locally, then `mr-gates check --slice lpw-8`, `mr-comment-scan`, PR open, stop.
