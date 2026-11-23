The access and attestation design for single-player and friends worlds is recorded: how an unadmitted connection is kept off every row and reducer, how the official server refuses attestation binding, what an attestation names so a hostile host cannot relay it, and the build input that enforces ownership. This PR changes two documents and no code; nothing in it is built yet. One default needs the operator's eye: once ownership is enforced, a friend's server is joined from the desktop app only, not a plain browser (#833).

**The measurement (lpw-8.3).** One wrong-audience account token, on a 2.11.0 standalone host, with the issuer rig `evals/account-e2e.eval.mjs` builds and the module at `d6d80547`:

| Token                                         | `POST /v1/database/<db>/call/join_game` | `POST /v1/database/<db>/sql`      |
| --------------------------------------------- | --------------------------------------- | --------------------------------- |
| Account token, wrong audience                 | 403, body `unrecognized audience`       | 403, body `unrecognized audience` |
| Account token, right audience                 | 200                                     | 200, with rows                    |
| Token from an issuer the module does not list | 200                                     | 200, with rows                    |
| The host's own anonymous token                | 200                                     | 200, with rows                    |

Every route that reads a row or calls a reducer (the WebSocket, `call`, `sql`, the MCP tools) runs the module's connect reducer first, and a refusal there is complete. `GET /schema` and module-defined HTTP handlers do not run it. This closes R-lpg-0-HTTPAUDIENCE: the audience check holds on the HTTP routes.

decided:

- (a) how an unadmitted connection is kept off every row and reducer -> the connect reducer refuses an identity the rule has not admitted, every reducer a player can call makes the same check, connections open when the rule changes are admitted, and the owner relays the door (over: row filters on every public table; every table private behind a view; refusing at connect only)
- (b) how the official server refuses attestation binding -> the `official` build holds no attestation key and the `world` build trusts no login issuer, both lists being constants of the build (over: a row or flag in the database; the world-name check and the route alone; a database identity compiled in)
- (c) what the attestation names -> the server as the player's own software authenticated it, `spki:<fingerprint>/<db>` or `dns:<host>:<port>/<db>`, bound from the desktop shell (over: the key that verifies the client's world token; the server's address or database identity; the same names with a browser sign-in flow built now)
- (e) the build input for ownership -> cargo features with enforcement as the default: a build enforces unless it names `open_join`; `official` and `world` are the release builds; one recipe, `just release-module <official|world>`, makes a module to ship and checks the profile the artefact carries (over: a feature that switches enforcement on; an environment variable at build time; a row at run time)

A judge scored each fork from one evidence dossier on a rubric fixed before scoring: 62 of 75 for (a), 55 of 65 for (b), 48 of 65 for (c), 54 of 65 for (e). The record has every table, what each result would reverse on, and the test that proves each answer.

## What the probes found

- **A refusal at connect does nothing to a connection that is already open.** After the owner removed an identity's admission, its new calls, reads and sockets were refused, and on its open WebSocket a reducer call committed, a one-off query returned rows and a new subscription delivered them. So the design checks admission in every reducer too, admits open connections when the rule changes, and has the gate close a removed identity's sockets. On a host with no gate a removed identity keeps reading what it subscribed to until it disconnects.
- **An unadmitted identity cannot call its own door.** The connect reducer's refusal covers the admission reducer as well, so the owner relays it (the gate, on a shipped world).
- **Row filters work in one shape only at 2.11.0**, and that shape makes the admission table readable by every connection. A filter that joins a private table fails every query of the filtered table; one that joins a public table with its own filter breaks every subscription to it.
- **An identity is free.** A request with no token is given a new identity even when it is refused, so a count of wrong passwords against one identity (lpw-9.3) bounds nothing; the gate limits by source address.
- **A page a world's gate serves must never sign in.** An account's login token is good at the official server, and that page may be a hostile host's code. That is what makes binding shell-only for now.

## What changes

- **`docs/local-play.md` §3:** new subsections "What the host's HTTP routes do with a token the connect reducer refuses" and "The access and attestation design" (a summary table of chosen, rejected and proved-by per fork; then for each fork the measurements, the design, the rejected alternatives, the judge's table and the proving test; the order of calls at each kind of world; and a table of what the design changes in the slices as specified). "Can a token a private host receives be replayed…", "Whether an account issuer can mint an attestation…", "What identifies a player between launches" and "The design later work elaborates against" are brought up to date.
- **`docs/local-play.md` §7:** the method and per-run counts of both measurements; "What was not measured" loses the HTTP-route audience check and gains what these measurements leave out.
- **`docs/DECISIONS.md`:** four new entries, one per fork: "A world that is not open refuses an unadmitted identity at connect and in every reducer; the owner relays the door", "The official build holds no attestation key and a world build trusts no login issuer", "An attestation names the server as the player's own software authenticated it", "Ownership is enforced unless a dev feature switches it off". Six older entries are brought in line (below).

## For the supervisor to adjudicate

- **The browser default (#833).** A page a friend's gate serves cannot bind, so on an enforcing build it cannot join. This narrows #821's plain-browser sentence and lpw-18.7. The alternative, a sign-in on the account service's own origin that serves a browser at a domain server, is row R-lpw-8-BROWSERBIND.
- **The design changes several slices' specified contracts.** The record's table "What this changes in the slices as specified" lists them; notes n5 and n6 carry the spec amendments. The largest: lpw-9's admission reducer is owner-relayed, where lpw-9.2 reads as if the joiner's own connection called it; acs-6 gets two release builds and a default build that admits nobody, with edits outside its `touches:` (`scripts/smoke-republish.sh`, `client/e2e/global-setup.ts`, `.github/workflows/nightly.yml`, `server-module/src/pvp.rs` and its tests); lpw-15 needs the shell document's fingerprint field ahead of lpw-18, and builds the world's table of names.
- **R-lpg-0-ATTESTRELAY stays open after lpw-15.** lpw-15.4 proves the module's half and the client's half. The run over two gated hosts (relay, proxy, mixed invites) needs the gate and the pin and has no owning criterion: R-lpw-8-RELAYRIG, targeted at lpw-14. The record says no `world` build is given the production attestation keys before it has run.
- **R-lpw-2-LOCALPLAYDOC is closed by this diff** ("What identifies a player between launches" states the device-kept token).

## Acceptance

Acceptance: 4/4 met, 0 deferred, 0 unmet — lpw-8 seed:40fc92786b8316f5

- **lpw-8.1:** §3 names, for each of (a), (b), (c) and (e), the chosen answer, the rejected alternatives and the test that proves it: `lpw-8.1 RECORDED forks=4`.
- **lpw-8.2:** the official server's refusal derives from the build of the module (its list of attestation keys is empty), which no host can set or unset: `lpw-8.2 DERIVED chosen=B1 from=build host-settable=no`.
- **lpw-8.3:** the measured result is recorded for both routes, with the rig, the host and the per-run counts: `lpw-8.3 MEASURED call=403 sql=403 refusals=10+16`.
- **lpw-8.4:** the build input is named, the recipe is shown unable to omit it (there is nothing to omit: enforcement is the default), and both sides of the switch have a named test for acs-6 and for lpw-15: `lpw-8.4 SWITCH rows=11 open-with-production-trust=0 sides=4`.

Each CHECK is a computation over the record's own tables (node 18, no shell in the documents): 8.1 recomputes every judge total from scores and weights and requires the chosen alternative to be the top gate-passing row of its fork, a proving criterion of lpw-9 or lpw-15 per fork, and the four decision entries; 8.2 derives each (b) alternative's gate from whether a host can set what it derives from; 8.3 requires a status on both routes, the control row, the rig and host named, and the per-run request counts to add up to the stated refusals; 8.4 recomputes every row of the feature table from the stated rule and requires no row with production trust and enforcement off, and a named test in each both-sides cell. All four were watched failing on `origin/master`'s documents and on fifteen mutated copies (`gates/lpw-8.red-proof.log`).

## Review lenses

- **Red-team on the dossier, before judging:** proved by a second probe run that an open socket is not re-checked; found that module HTTP handlers bypass the connect reducer and authentication, that `--all-features` (used by `just lint`) breaks a compile-error guard, that the door's costs apply to every alternative, and the checks a browser flow would need; tried nine ways to relay or proxy against fork (c) and broke none. Each finding changed the dossier before the judges read it.
- **Four judges, one per fork, in parallel:** each re-derived the facts it relied on from the raw output before scoring. They corrected one count of mine (27 of the 41 client reducers call a deletion gate, not 36), added an alternative for (b), and added the requirements the recorded designs now carry: a census of its own for the reducer check, the rule change admitting open connections, the profile carried in the artefact, shell-only binding.
- **Fact-check lens on the committed diff:** every number, table cell, route claim, code name, decision title and spec criterion checked against the raw output and the sources. Four mismatches, all fixed: `spacetime publish` and `spacetime generate` do take features through `--build-options`; the MCP `tools/list` requests were missing from the method; qualified gate verdicts had been flattened to "pass"; "today that is the development origin" had no source.
- **Reviewer on criteria, standards and consistency:** two blockers (the two-host relay proof had no owner; lpw-15 had no client path to build before the shell exists) and eight should-fixes, all applied; a second reviewer re-read the fix diff and found three more gaps in the consumers table, also applied.
- Reducer-security, desync and verifier lenses have no subject: the diff holds no code and no test.

## Gate

`just ci` green locally at `ae05f50d` (the PR head): 3,417 + 1,120 + 3,089 Rust tests, the three node:test doors (141 / 83 / 3), 15 evals, 309 `account-service` tests in 5 files, 6,256 client tests in 245 files, verify-build OK, 9 observability checks, `CI-EXIT=0`. It ran under Node 24.22.3, with the CLI's data directory and the temp directory pointed at a scratch path so that a sibling slice's run could not collide with it. `mr-gates check`: 4/4 met; `mr-gates lint`: clean; `mr-touches scope`: IN-SCOPE (2 files, no widen).

touches-delta:

- `docs/DECISIONS.md` — the spec's definition of done requires an entry per decided fork.

boyscout-delta:

- `docs/local-play.md` "Whether an account issuer can mint an attestation as a second token type" (one paragraph) — it said "Open"; the issuer and the attestation route are decided and not built.
- `docs/local-play.md` "What identifies a player between launches" (one paragraph) — it said nothing does; the client keeps the token on the device for a `local` or `private` target (R-lpw-2-LOCALPLAYDOC).
- `docs/DECISIONS.md`, six older entries, one or two sentences each, so the log does not contradict the new entries: "One game, three ways to play…" (a deployment's module is built to trust the accounts it takes); "Accounts, guest identity and the claim flow" (`on_connect` never rejects a connection for having no account; a world's access rule may refuse an identity it has not admitted); "A private world verifies an account…" (pointers to the two new entries; the reason `BeginAuthSession` was not chosen); "Private servers carry their own encryption…" (the shell is the only way to join on an enforcing build; the fingerprint is what the attestation names); "Every player must own the game on Steam, for now" (the build input, by name); "The account service is our own small OIDC issuer…" (the official module trusts its login tokens, a world's module its attestations).

plan-delta:

- A red-team pass on the dossier ran before the judges, and a second reviewer re-read the lens-fix diff; neither was in the first plan.
- The admission probe gained two row-filter variants after the first two failed, to find whether any shape works.
- The first local `just ci` ran under Node 24.22.3 from a stale note and went red at `account-test`; the repository pins 24.22.3 (row R-lpw-8-NODEKEYCHECK records what that showed).

comment-scan: FLAGGED 61, all one kind, all in `docs/local-play.md`: `[id]`, a slice or criterion id. They stand: lpw-8.1 and lpw-8.4 require the record to name the tests lpw-9, lpw-15 and acs-6 run, and the table of what the design changes is keyed by the slice whose contract changes. The ids are the harness specs' own section and criterion names, introduced in the section's first paragraph. The four new decision entries carry none.

Items: none

Spec notes (`mr-gates notes list --slice lpw-8`): n1 with R-lpw-8-RELAYRIG (target lpw-14), n2 with R-lpw-8-HOSTLOOPBACK (target lpw-12: a page in the player's browser can open a WebSocket to the host's own loopback port), n3 with R-lpw-8-LIVEADMISSION (target acs-6: no test shows an unadmitted identity refused on `call` and `sql`), n4 with R-lpw-8-BROWSERBIND (backlog), n5 (M-local-play amendments), n6 (M-account-service amendments), n7 with R-lpw-8-NODEKEYCHECK (backlog: `account-service` accepts a mismatched key file on Node 24.22.3, inside its `engines` range), n8 (lpw-15 and R-lpg-0-ATTESTRELAY).

Scratch, left in place: `/tmp/lpw-8-sb.6z0WKO/` (both probes, their raw output, the dossier and the judges' results, the ledger checks), `/tmp/lpw-8-rt.bJCDDn/` (the red-team's probe run), `/tmp/lpw-8-judge-*.*/` (the judges' scratch; `-e` holds the feature-table crate).

not-verified:

- Anything the design says a slice will build: none of it is built. In particular that the ownership features leave the schema and the generated bindings unchanged, that `--build-options` carries a feature into a publish (argument parsing only was tried), and that the profile section survives into the module's own artefact (a crate of one file was tried).
- The relay closed end to end over two gated hosts (R-lpw-8-RELAYRIG).
- What a row filter costs a subscription, and any access measurement on a host version other than 2.11.0.
- The MCP tools for the admission probe: they were measured for the audience refusal, which is the same reducer.
- The remote-only CI jobs (gitleaks, cargo-audit, e2e) and the supervisor's `mr-gates verify`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
