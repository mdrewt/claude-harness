# lpw-19 plan — a browser binds a friends server it reached by address

type: design · tier: hard · doc-only PR on `mdrewt/monster-realm` · worktree `.claude/worktrees/lpw-19`
from `origin/master` `88a3c8cb` (lpw-15 merged as #850).

## Scope

- `touches:` docs/local-play.md. Plus `docs/DECISIONS.md` (the spec's DoD mandates the update of "An
  attestation names the server as the player's own software authenticated it"; listed under
  `touches-delta:`).
- No code, no tester, no red run (`type: design`). A `judge` scores at least two alternatives for
  each of two forks: (f) how a page a gate serves obtains an attestation; (g) what names a server a
  browser reached by a bare IP address.
- Scratch lives in `/tmp/lpw-19-sb.jRhuAJ/` (never merged): `p1/` the name-derivation prototype and
  its output under Node 24.22.3; `p2/` the headless-Chromium probes (fragment, redirect, opener,
  history); `p3/` copies of the red-team's probes (a previous holder's service worker and cache,
  `Origin` under each referrer policy); `judge/DOSSIER.md` the evidence the judges scored
  (`DOSSIER.v1.md` is what the red-team and reviewer read); `ledger/` the ledger checks.

## Method

1. **Ground.** The spec section, ruling monster-realm#833, lpw-8's record and note n4, and the code
   as built: `server-module/src/world_binding.rs` (names are opaque strings compared byte for byte),
   `account-service/src/attest.ts` (the caller names the world), the sign-in and its pages.
2. **External facts** from primary sources (a researcher): Let's Encrypt certificates for IP
   addresses, its rate limits, the Baseline Requirements on reserved addresses, HSTS and addresses,
   fragments across redirects, the public suffix list's default rule.
3. **Measure, never assume:** P1 how the account service's runtime spells each address; P2 what a
   browser does with a fragment, a redirecting return path and an opener; P4 what the browser's
   history keeps.
4. **Red-team and reviewer on the dossier before judging**, then **two judges in parallel**, one
   per fork, each with a rubric whose weights are fixed in the dossier; a re-score when a
   measurement the judge named as deciding came in.
5. **Record** in `docs/local-play.md` §3, a new subsection "A browser binds a friends server it
   reached by address": the summary table (chosen, rejected, proved by); how a joiner at a domain
   and at an address obtains an attestation, its `aud` and what authenticated it; per fork the
   design, the rejected alternatives, the judge's table, the reversal conditions and the tests; what
   the flow hands the page; the attack table (relay, proxy, an address that changes hands); what a
   joiner is shown with no publicly trusted certificate; the changes to the slices as specified;
   §7 the method. Fork (c)'s sentences that the ruling overrules are rewritten in place.
   `docs/DECISIONS.md`: "An attestation names the server…" rewritten in place, one new entry for the
   browser flow, and the sentences in other entries that became false.
6. **Lenses on the committed diff:** reviewer (criteria coverage, standards, consistency), a
   fact-check lens (every number and claim against the raw output and the sources), and a red-team
   pass on the recorded design.

## Acceptance ledger

Three seeded gates, each an executable consistency check over the record's own tables (`node -e`,
node 18): 19.1 requires a chosen answer, at least two rejected ones and a named test file for each
fork, recomputes every judge total from scores and weights, requires the chosen alternative to be
the top gate-passing row, requires the domain and the address rows of the "obtains" table with
their `aud`, and the two decision entries; 19.2 requires that no row of "what the flow hands the
page" is a login token, a closed outcome for relay and for proxy, and for each row of "an address
that changes hands" either a closed outcome or a named, tracked limit; 19.3 requires a row for
lpw-15's client bind flow, lpw-17, lpw-18.7, acs-3's route and the world's names, and the
"what a joiner is shown" table with an enforcing row that sends nothing to the account service.
Each was watched failing on `origin/master`'s documents (`gates/lpw-19.red-proof.log`).

## plan-delta

- No `planner` subagent: the plan of a design slice is its evidence dossier; the independent lenses
  on it were the red-team and the reviewer, before the judges.

## Gate

`just ci` green locally, then `mr-gates check --slice lpw-19`, `mr-comment-scan`, PR open, stop.
