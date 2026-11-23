Acceptance: 3/3 met, 0 deferred, 0 unmet — lpw-19 seed:14a4181f040603df

The design for a browser joiner of a friends server is recorded (operator ruling #833): a page a server's gate serves gets an account attestation without ever signing in or holding a login token, at a server with a domain name and at one with a bare public IP address. Doc-only; nothing is built. **Read "For the supervisor to adjudicate" first: lpw-19.2 is shown for the login token, the relay and the proxy, and two of its four address-changes-hands cases are open by design.**

## The design

| The server | How a browser joiner gets an attestation | Its `aud` | What authenticated it |
|---|---|---|---|
| A domain name, certificate a browser trusts | The page posts the world's nonce to a bind route on the account service; the player signs in and consents on the account service's own origin; the service redirects back with a one-use code; the page redeems it | `dns:<host>:<port>/<db>` | The browser's certificate checks: the code exists only in a redirect to that address |
| A bare public IP address, with a publicly trusted certificate for it | The same | `ip:<address>:<port>/<db>` | The same; Let's Encrypt certifies an address for 160 hours at a time, on port 80 or 443 |
| The world's self-signed certificate, any address | None from a browser; the desktop shell binds it by its pin | none | Nothing a browser can use |

The page never names the server: the account service derives the name from the address it sends the browser back to, so a hostile host's page only ever gets an attestation for its own address, which no other world lists. No ID token, code or refresh token is issued in a bind. The module needs no change for a bind (names are opaque strings compared byte for byte).

decided:
- (f) how a page a gate serves obtains an attestation -> the page sends the browser to the account service's own origin; sign-in and consent there; a one-use code comes back by redirect and the page redeems it for an attestation whose `aud` the service derived from the return address (over: the attestation itself in the redirect, which a browser's history keeps; a window that posts the result back; the page signing in with a token scoped to its origin; the page signing in and calling `/attest`; approval on a second device)
- (g) what names a server reached by a bare IP address -> a publicly trusted certificate for the address, issued for the world's own key so the shell's pin still holds; the name is `ip:<address>:<port>/<db>` (over: a public address under the self-signed certificate; a DNS name we issue for the server's key; desktop only; any address under any certificate; the account service connecting and naming the key it saw)

A judge scored each fork from one evidence dossier on a rubric fixed before scoring, after a red-team had attacked the dossier: 51 of 65 for (f), a tie with the attestation-in-the-redirect variant that the judge broke on the unweighted total and on the one measured difference; 61 of 80 for (g), one point ahead of the self-signed variant and seven ahead of the name service. Every table, the reversal conditions and the tests each fork names are in the record.

## What the measurements found

- **A browser's history keeps the whole return address after the page removes the fragment** (Chromium 149, the profile's `History` database). With the attestation in the redirect, the account's id and the server's address stay on the shared computer the ruling is about. That is why the redirect carries a spent code instead.
- **An origin keeps what an earlier server put in it.** A service worker a previous server registered answered the navigation to the return path and read the fragment with no request reaching the new server. This is the first open case below.
- **A cross-origin form post sends `Origin: null`** when the posting page's referrer policy is `no-referrer` or `same-origin`, so the gate's page must send one that discloses its origin.
- **The URL parser gives every address one spelling**, and the bind route takes only that one: of 74 return addresses a prototype signs 11. Two traps for whoever builds it: `net.BlockList` matches a plain IPv4 address against a rule for `::ffff:0:0/96`, and a list of IPv6 blocks to refuse signs addresses outside `2000::/3`.
- **A window that keeps its opener can be sent elsewhere by the page that opened it** in the middle of a sign-in; `Cross-Origin-Opener-Policy: same-origin` stops it. That rules out the pop-up variant.

## What changes

- **`docs/local-play.md` §3:** a new subsection, "A browser binds a friends server it reached by address": the summary and "how a joiner obtains an attestation" tables; fork (f) with the eight steps, the bind route's checks, what the flow hands the page, the attack table, the page's three rules, how often a browser binds, the measurements, the rejected alternatives and the judge's table; fork (g) likewise; what a joiner is shown with no publicly trusted certificate; what the design changes in lpw-15/lpw-24, lpw-17, lpw-18, acs-3, the world's names, lpw-14, lpw-23 and lpw-2. Fork (c)'s sentences that #833 overrules are rewritten in place.
- **`docs/local-play.md` §7:** the method of the browser measurements, and what was not measured.
- **`docs/DECISIONS.md`:** "An attestation names the server as the player's own software authenticated it" rewritten in place (the `ip:` name, who derives a name for a browser, the limits); one new entry, "A browser binds a friends server by a sign-in on the account service's own origin; the attestation names the address the browser is sent back to"; the transport entry's browser sentence corrected.

## For the supervisor to adjudicate

- **lpw-19.2 and an address that changes hands.** The record shows the relay closed by relay and by proxy, and that the page never holds a login token. Of four changed-hands cases two are closed and two are open and bounded, both stated in the attack table and tracked as R-lpw-19-CHANGEDHANDS: (1) a browser that visited an earlier server at the same address and port can still run that server's leftover service worker or cached pages, which then act as the new server's page; (2) a world that moved but still runs configured for its old address keeps accepting that address's name for up to 160 hours (longer if the new holder forwards certificate validations to it). The ledger's check passes with `closed=2 open-and-tracked=2` in its EXPECT; an independent reviewer read the criterion as partly met. No design in which the joiner navigates to the server's address closes these; the one that does (a name service we operate, alternative G2) is a cost and posture call. If you read "stays closed" strictly, lpw-19.2 is unmet in part and the row is its tracking.
- **Three defaults for the operator** (decision issue #855, non-blocking; each default stands unless overruled): accepting those two limits for early access; a browser joiner re-checks the account once a day and when the world needs it, where #848 has every connection (each check is a sign-in and a consent, and the ruling leaves the workflow of each kind of world to judgement); and the public-computer leftovers of lpw-2 (R-lpw-19-SHAREDCOMPUTER: the world's token stays in the browser, and a player in another browser is a new character).
- **R-lpw-8-BROWSERBIND** is the design's residual and this slice answers it. The build is a new row, R-lpw-19-BUILD (note n3 names the slices: a new M-account-service slice for the bind route, and amendments to lpw-24, lpw-17, lpw-18, lpw-14 and lpw-23).
- **The design changes other slices' specified contracts** (notes n3 and n4): lpw-15's "in a browser it signs in to our issuer", lpw-18.7's "without any other origin", lpw-24.1's "before each `join_game`", lpw-17.5 for a host that gives an address, acs-3.5's scope.
- **The two decision entries run 47 and 42 lines**, over `standards/decisions.md`'s 10 to 25, as their neighbours do.
- **Local gate:** `just ci` exit 0 at `940c7eb0` (and earlier at `b0e5649b`). Between them, four runs at the same head went red in `account-service/src/deployment.test.ts` at a Docker bring-up (`ECONNREFUSED`, once `cannot allocate memory` from the Docker CLI) with the file green alone, the known flake of R-acs-7-DEPLOYFLAKE; the diff between the two heads is documentation.
- **`origin/master` moved to `52e202f6` (#851, `docs/DECISIONS.md` only) after the last gate run.** The branch merges cleanly with it (`git merge-tree`); it was not merged in, so the PR head is the tree the gate ran on.

## Lenses

- On the dossier, before judging: a red-team (found the origin-state break, `Origin: null`, the gaps in the name rule, the unconsented redirect) and a reviewer against the spec and the built code.
- Two judges, one per fork; each re-scored once, the first after the history measurement it had named as deciding, the second to score a variant it raised itself.
- On the committed record: a reviewer (criteria, consistency, standards), a fact-check of every number and claim against the raw output and the code, and a second red-team pass on the recorded design. All findings fixed in the record or stated in it as limits; the fact-check re-read the fix diff.
- Not run: `desync-guard` and `reducer-security-auditor` (no code), a tester (`type: design`).

touches-delta:
- `docs/DECISIONS.md` — the slice's definition of done requires the update of "An attestation names the server…"; the doc set.

boyscout-delta:
- none

moved-tests: none

plan-delta:
- No `planner` subagent: the plan of a design slice is its evidence dossier; the independent lenses on it were the red-team and the reviewer, before the judges.
- The chosen flow is a variant the red-team proposed and the judge preferred after a measurement (the code in the redirect), not the form the dossier first put forward.

comment-scan: FLAGGED 40, all one kind: `[id]`, a slice, criterion or residual id in `docs/local-play.md` and one residual id in `docs/DECISIONS.md`. They stand: lpw-19.3 requires the record to list its changes to lpw-15's client bind flow, lpw-17, lpw-18.7 and acs-3's route, the changes table is keyed by the slice whose contract changes, and the two open rows name the row that tracks them. The ids are the harness specs' own section names, as in the access design above it. Three `[history]` findings were reworded.

Items: none

Evidence beside the ledger: `gates/lpw-19.red-proof.log` (the three checks red on the untouched documents, and on 24 mutated copies of the record). Plan and this body: `monster-realm-lpw-19-plan.md`, `monster-realm-lpw-19-pr-body.md`.

not-verified:
- Nothing of the design is built, so nothing of it ran end to end: no bind route, no page flow, no certificate for an address, no gate.
- Browser behaviour was measured in Chromium 149 only, over loopback HTTP; nothing over TLS, in Firefox or in Safari.
- No ACME order for an IP address was placed; only Certbot's support for one was confirmed from documentation.
- What Steam's sign-in pages do with an opener, and when a browser retires a service worker whose script has stopped answering, were not measured.
- The external facts (Let's Encrypt's profiles and rate limits, the Baseline Requirements, the RFCs) were read from primary sources on 2026-11-22 by a research pass; Plex's own pages could not be fetched.
- Remote CI (gitleaks, cargo-audit, the e2e job) has not run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
