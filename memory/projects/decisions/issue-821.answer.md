# DECISION ANSWER — issue 821 (CLOSED)

## Question (issue title)
DECISION(lp-spec): DECISION(lp-spec): who signs world attestations, and may a friends server serve plaintext 

## Operator response(s)
(closed without comment — treat the Recommendation in the issue body as accepted)

## Issue body (for the recommendation)
## Root issue
(not stated)

## Question
Two operator-owned calls the M-local-play spec cannot default. (1) Account binding for single-player and friends worlds (lpw-15) needs an account service that signs a short-lived attestation ('this account is valid', addressed to one world, bound to its nonce) with a key and issuer name the official server does NOT trust. No account issuer is deployed (ALLOWED_ISSUERS is the .invalid placeholder). Which service signs it, and where? (2) A friends server on a LAN has no TLS certificate. May it serve plaintext ws: (the world token and all traffic in clear on that network)?

## Recommendation
(1) A small attestation endpoint beside the account service we deploy, with its own signing key and issuer name; the account service itself unchanged. (2) Plaintext ws: only to loopback and private-range (RFC 1918 / ULA) addresses; wss: required for anything else. Until you answer, lpw-15 stays blocked:account-service (worlds stay unbound, friends servers get open/password rules only) and lpw-14 (open to friends) waits on (2); lpw-1 to lpw-9 build meanwhile.

## Alternatives
(1) An account issuer with OAuth token exchange (RFC 8693) instead of a separate endpoint; or no account binding at early access (device-kept identity only). (2) wss: everywhere (hosts must provision certificates); or plaintext anywhere with a warning.

## Additional context
Spec: specs/monster-realm-v2/M-local-play.spec.md (harness PR from branch lp-spec), section 'Operator questions'. Evidence: the game's docs/local-play.md section 3.

---
_Answer by commenting (or closing) this issue. A watcher polls every 5 min; your first comment (or close) resumes the loop. Slice/topic: `lp-spec`._

