---
title: Authentication & identity for apps and games — OAuth2/OIDC, sessions vs tokens, guest→account linking, cross-device identity, MFA, and identity as a stable data key
slug: authentication-and-identity
domain: security
tags: [oauth2, oidc, pkce, jwt, sessions, passkeys, webauthn, mfa, guest-linking, identity-provider, account-recovery]
status: active
updated: 2026-06-27
confidence: high
sources: 12
supersedes:
abstract: "Delegate auth to an OIDC IdP, key all data on a stable internal user ID, and treat login method as a swappable attribute — not the primary key."
---

## Scope

A **project-agnostic** deep reference on identity and authentication for web applications and games: why delegating to an external identity provider beats rolling your own; the OAuth 2.0/2.1 authorization-code + PKCE flow; OpenID Connect as the identity layer on top of OAuth; session cookies vs. JWT/bearer tokens and their security tradeoffs; refresh token rotation and the JWT revocation gap; the canonical guest-to-account upgrade pattern without data loss; cross-device identity and recovery; MFA and passkeys (WebAuthn/FIDO2); NIST SP 800-63B assurance levels; and the foundational principle that identity must be an internal stable key that every other data entity references — independent of whatever login method the user happens to use today. Pairs with [[online-game-security-anticheat]] where an authenticated user ID is the root of server-side trust.

---

## Key findings

### 1. The case for delegating to an identity provider — never roll your own

The strongest argument for using a third-party identity provider (IdP) or a managed authentication service is not convenience; it is security through sustained expertise. Correctly implementing password hashing (bcrypt/Argon2 at appropriate cost factors), breach detection, rate limiting, account lockout, TOTP, phishing-resistant MFA, and credential-stuffing defenses is a full-time engineering concern. A large IdP observing millions of daily authentications builds anomaly-detection models that a small team simply cannot replicate.

Microsoft data shows enabling MFA on any provider reduces account-compromise risk by approximately 99.9%. That number is not achievable from password complexity rules alone; it requires the multi-factor infrastructure that a managed IdP provides as a default feature.

The practical cost calculation: the hours saved by not implementing secure password storage, verification emails, session management, TOTP enrollment, WebAuthn registration, and breach-notification pipelines — and the risk avoided from getting any of those wrong — routinely exceeds the cost of a managed service. The rule is: **do not store user passwords; delegate credential verification to a provider you trust to keep up with the threat landscape**. OAuth 2.0 / OpenID Connect is the standard interface for doing so.

### 2. OAuth 2.0 and the authorization-code + PKCE flow

OAuth 2.0 (RFC 6749) is an authorization framework, not an authentication protocol. Its authorization-code flow is the mechanism by which an application (the *relying party* or *client*) obtains an access token from an authorization server, acting on behalf of a user who has consented. OpenID Connect (OIDC) — discussed in §3 — layers identity on top by adding an *ID token*.

**Authorization code flow with PKCE (RFC 7636).** The raw authorization-code flow was vulnerable to authorization-code interception attacks on native and single-page apps because those clients cannot keep a `client_secret` confidential. PKCE closes this: before the auth request the client generates a random `code_verifier`, computes `code_challenge = BASE64URL(SHA-256(code_verifier))`, and sends only the challenge with the auth request. On the token exchange the client sends the original `code_verifier`; the server hashes it and validates the match. An attacker who intercepts the authorization code cannot use it without the verifier they never saw.

**OAuth 2.1** (IETF draft) consolidates best practices: PKCE is mandatory for all clients (not just public ones), the implicit flow and resource-owner password credentials (ROPC) grant are removed, refresh token rotation is required for public clients, bearer tokens in URIs are prohibited, and redirect URI matching must be exact. Many libraries and managed services already enforce these rules; teams starting new projects should treat 2.1 behavior as the baseline.

**Conceptual flow summary:**
1. App redirects user to IdP's authorization endpoint with `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state` (CSRF nonce), and `code_challenge`.
2. User authenticates at the IdP (not at the app — this is the security boundary).
3. IdP redirects back to `redirect_uri` with `code` and the original `state`.
4. App validates `state`, then POSTs to the IdP's token endpoint with `code` + `code_verifier` (+ `client_secret` for confidential clients).
5. IdP returns `access_token` (short-lived), `id_token` (OIDC, signed JWT), and `refresh_token`.
6. App uses the `access_token` as a bearer credential to call APIs; uses `refresh_token` to rotate it when it expires.

The user's password is never seen by the application — only by the IdP. This is the security boundary the flow is designed to protect.

### 3. OpenID Connect — identity federation on top of OAuth

OpenID Connect is the identity layer that makes OAuth useful for authentication. It adds:
- **ID token**: a signed JWT containing the authenticated user's identity claims (`sub`, `email`, `name`, `picture`, `iss`, `aud`, `exp`).
- **UserInfo endpoint**: an OAuth-protected endpoint to fetch additional claims without re-parsing the ID token.
- **Discovery document** (`/.well-known/openid-configuration`): a machine-readable manifest of the provider's endpoints, supported scopes, and public keys — enabling clients to configure themselves dynamically.

**The `sub` claim is the stable identifier.** The `sub` (subject) claim is guaranteed stable and unique per user per IdP. It does not change when the user changes their email address or display name. This is the correct external key to store and link against — not the email. Email is an attribute; sub is the identity assertion.

**Federation.** OIDC's standardized token format allows a relying party to accept identity assertions from multiple IdPs (Google, Apple, Microsoft, GitHub, a custom IdP) using the same token validation logic. The app simply trusts the `iss` (issuer) and validates the signature against the provider's published public keys. This is the mechanism behind "Sign in with Google / Apple / GitHub" buttons.

### 4. Sessions vs. tokens — choosing the right credential transport

There are two canonical approaches to persisting authentication after the initial OIDC handshake; each fits different architectures.

**Server-side sessions (opaque cookie + session store).** The server creates a session record (in-memory, Redis, or database), generates a random opaque token as the session ID, and sets it as an `HttpOnly; Secure; SameSite=Strict` cookie. Every request carries the cookie; the server looks up the session ID and retrieves the authenticated user from the store. Revocation is instant: delete the session record. CSRF is mitigated by SameSite. XSS cannot steal the token because it is HttpOnly.

- **Best fit:** traditional server-rendered web apps, high-security applications (financial, healthcare) where instant revocation is non-negotiable, and environments where a centralized session store is already present.
- **Cost:** horizontal scaling requires a shared session store (Redis is standard); the session lookup adds one read per request.

**JWTs / bearer tokens.** The server issues a cryptographically signed JSON Web Token that encodes the user's identity and permissions. Each request presents the token in the `Authorization: Bearer` header; the server validates the signature without consulting a database. This is stateless and naturally scales horizontally.

- **Best fit:** stateless microservice APIs, mobile apps, cross-domain API access, and any scenario where multiple independent services need to validate the same credential without calling home.
- **Critical pitfalls (see §7):** JWTs cannot be revoked before expiry without introducing a deny list that re-adds server state; the payload is base64-encoded, not encrypted — never put secrets or PII in it; and the `alg: none` attack (stripping the signature) must be defended by hard-coding the expected algorithm in verification code, never trusting the token's own `alg` header.

**Hybrid pattern (recommended for most web apps).** Keep a short-lived access token in memory only (JavaScript variable, never `localStorage`), and keep the refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie. The access token is used for API calls; when it expires, the front-end silently requests a new one using the cookie-carried refresh token. This combines the statelessness of JWTs for API calls with the XSS-resistance of httpOnly cookies for the long-lived credential.

**The session-fixation rule.** Regardless of mechanism: always issue a new session ID / token on successful authentication. Never honor a session identifier that existed before login. This prevents session-fixation attacks where an attacker pre-plants a known session ID.

### 5. Refresh tokens and the revocation gap

Because access tokens are short-lived (5–15 minutes is standard), clients use a long-lived refresh token to obtain new access tokens without re-prompting the user. Refresh tokens introduce both the means of continuous access and the primary revocation surface:

**Refresh token rotation.** Each token-endpoint call with a `refresh_token` returns a new `refresh_token` and invalidates the old one. OAuth 2.1 mandates this for public clients. The consequence of reuse detection: if an already-rotated (old) refresh token is presented to the server, it signals a theft event — the server should revoke the entire token family and force re-authentication.

**The JWT revocation gap.** JWTs are stateless: a server has no way to invalidate an access token before it expires without consulting external state. The practical mitigations are:
1. **Short TTL** (5–15 min): the window of usefulness for a stolen token is small.
2. **Deny list via Redis**: store revoked `jti` (JWT ID) values with TTL matching the token expiry; check on every request. This re-introduces server state but keeps the check fast.
3. **Token families**: group refresh tokens issued from a single login into a family; reuse of any rotated-out token triggers revocation of the entire family.

For most consumer apps a 15-minute access token TTL plus refresh token rotation is sufficient. For higher-risk scenarios (payment, admin actions), require step-up authentication (re-enter password or use passkey) at the action boundary rather than shortening the global TTL further.

### 6. Guest → account linking: preserving data across identity upgrade

Games and apps frequently allow anonymous/guest play before asking for credentials. The canonical pattern:

1. **On first launch, create a stable internal user ID immediately** — before any login interaction. This can be a UUID generated client-side and registered server-side anonymously (Firebase anonymous auth, PlayFab device login, custom UUID + device secret). This ID is the primary key for all data the user generates.
2. **Store all game/app data under that internal user ID**, not under any external identity claim.
3. **When the user links a real account** (Google, Apple, email+password, passkey), record that identity as a credential row pointing to the existing internal user ID. The UID does not change; data does not move.
4. **On subsequent logins**, look up the internal user ID by the external identity credential (provider, sub claim) and load their data. The login method is a lookup key to reach the internal user — not the user itself.

**Conflict resolution.** If the user signs in on a second device with a social identity that already has its own account (i.e., two separate anonymous accounts tried to link to the same social credential), present a merge UI. Let the player choose which data to keep, or merge both lineages, then delete the orphaned anonymous account. Firebase, PlayFab, and Supabase all surface this as a linkable error code (`credential-already-in-use`).

**Cleanup.** Anonymous accounts that were never linked accumulate in the backend. Firebase recommends auto-deleting unlinked anonymous users after 30 days; implement a Cloud Function or cron job that handles cascading data removal. This avoids a long tail of zombie accounts that never converted.

**The key design principle:** the external identity (sub + iss) is a *credential* that proves who the user is. The *internal user ID* is who they are in your system. These are two different things. A user might authenticate with Google today, add Apple Sign-In tomorrow, and change their Google email next year — their internal user ID and all their data survive all of those events unchanged.

### 7. JWT security pitfalls — concrete list

The following failures each have a distinct exploit path:

| Pitfall | Attack vector | Mitigation |
|---|---|---|
| `alg: none` accepted | Attacker strips signature entirely | Hard-code expected algorithm in verification; reject tokens that don't match |
| HS256 with multiple verifiers | Shared secret sprawl; one breach exposes all | Use RS256 or ES256 (asymmetric); only the IdP holds the private key |
| Long-lived access tokens | Stolen token usable for hours/days | Keep access token TTL ≤ 15 min; use refresh rotation |
| Secrets in JWT payload | Payload is base64, not encrypted; anyone with the token reads it | Never store passwords, PII, or API keys in JWT claims |
| Audience (`aud`) not validated | Token issued for service A accepted by service B | Always verify `aud`, `iss`, and `exp` claims |
| Token in URL / query string | Logged in server logs, browser history, Referer headers | Bearer tokens in Authorization header only; OAuth 2.1 bans URI bearer |
| Token in `localStorage` | XSS script reads it directly | httpOnly cookie for refresh; in-memory only for access |
| No `jti` tracking | Stolen token reused after logout | Deny list in Redis; or accept short TTL as the mitigation |

### 8. Cross-device identity and recovery

When a user's device is lost, stolen, or factory-reset, they need a path back to their account that:
- Does not require the lost device.
- Cannot be socially engineered (avoid "email me a magic link" as the only recovery path, since email accounts can be compromised too).
- Does not require the app team to manually intervene for every recovery.

**Passkey sync as the primary cross-device mechanism.** Passkeys (FIDO2/WebAuthn) created on one device are synced by the platform's credential manager: Apple uses iCloud Keychain (encrypted with the user's Apple ID + device secret, escrowed in multi-party threshold HSMs), Google uses Google Password Manager (key split between device and account), and 1Password/Dashlane act as cross-platform sync providers. A user who loses their iPhone but has iCloud configured can sign in on a new iPhone or Mac transparently.

**Device-to-device transfer.** FIDO's multi-device credential standard allows a QR/Bluetooth hybrid flow: the existing trusted device authorizes a new device and transfers the credential material over an authenticated ECDH channel. This is how passkeys "spread" to a new device without going through cloud sync.

**Recovery code / backup factor.** Platform passkey sync depends on the platform account (Apple ID, Google Account) also being intact. Apps targeting higher-assurance scenarios should issue a one-time recovery code at enrollment that the user prints or stores in a password manager. This code allows re-enrollment of a new passkey after identity verification. The code should be single-use, stored as a hash server-side, and irreversible.

**Mandatory multi-factor for recovery.** Any self-service account recovery flow is itself an attack surface. At minimum: verify possession of the registered email (or phone number) AND require the user to answer a second challenge (TOTP, backup code, or identity proofing via a document verification API like Onfido). A recovery flow secured only by "click the link in your email" is as weak as the email account — which is exactly what attackers target.

**Design for account recovery before first launch.** Recovery is a product requirement, not an afterthought. The question "if a player loses their device in a pool, can they get their account back without a support ticket?" must have a tested answer.

### 9. MFA and passkeys (WebAuthn / FIDO2)

**NIST SP 800-63B authenticator assurance levels (AAL)** set the standard vocabulary:
- **AAL1**: single-factor; a memorized secret (password) or OTP qualifies.
- **AAL2**: two factors; proof of possession of a registered authenticator plus either biometric or a second factor. TOTP apps, hardware security keys (not SMS), and passkeys all qualify at AAL2 or higher.
- **AAL3**: hardware-bound, phishing-resistant; requires a hardware authenticator that provides verifier impersonation resistance (hardware security key with PIN, or device-bound passkey on a secure enclave).

NIST 800-63B (rev 4, published 2024) explicitly recognizes syncable passkeys as valid AAL2 authenticators after adding normative guidance for them in April 2024.

**Passkeys / WebAuthn.** A passkey is a FIDO2 credential: a private key stored on the device (or synced via the platform's credential manager), and a public key registered with the relying party. Authentication is a cryptographic challenge-response; the private key never leaves the device or its sync vault. Passkeys are:
- **Phishing-resistant**: the private key is cryptographically bound to the relying party's origin (`rpId`); a fake login page on `evil-example.com` cannot trigger a passkey enrolled on `example.com`.
- **No-shared-secret**: the server never sees the private key; breach of the server's credential table reveals only public keys (useless for impersonation).
- **Cross-device via sync**: see §8 above.

**Implementation minimum viable rules:**
- WebAuthn only works over HTTPS (or `localhost` for development).
- Use a well-maintained library (e.g., `@simplewebauthn/server` for Node) rather than writing your own CBOR/COSE parsing and signature verification.
- Register multiple credentials per user from the start (phone + laptop + backup hardware key), so losing one device does not lock the account.
- Provide TOTP as a fallback — not every device or browser fully supports conditional UI yet.

**SMS OTP is not recommended** for new implementations. SMS is susceptible to SIM-swap attacks and is classified AAL1 by NIST (not phishing-resistant). Use TOTP or passkeys for AAL2.

### 10. Identity as the stable key for all data

This principle connects authentication to data architecture. Every data entity in the system — save files, purchases, inventory, preferences, social graph edges, analytics events — should reference the **internal user ID**, not any external identity attribute. The reasons:

- **Email addresses change.** If purchases are keyed on email, a user who changes their email loses their purchase history. If keyed on internal user ID, the email is just an attribute on the user row.
- **External sub claims are provider-scoped.** A user's Google `sub` is different from their Apple `sub` even if both resolve to the same person. Keying data on a single provider's `sub` prevents multi-provider login.
- **Login methods change.** A player who started with an anonymous account and later linked Google, then added a passkey, then removed Google, should see no disruption in their data.
- **Merging accounts requires a decision point, not a data migration.** If two anonymous accounts link to the same social credential (conflict), a merge operation changes which internal user ID survives — the data itself does not need to move, only the mapping is updated.

**Schema pattern:**
```
users (internal_id PK, created_at, status, ...)
user_identities (id PK, user_id FK -> users.internal_id, provider, provider_sub, email, linked_at, ...)
```
A single `users` row can have many `user_identities` rows. Login resolves `(provider, provider_sub) → user_id`, then all queries use `user_id`. The login method is orthogonal to the data.

**Stable ID corollary for analytics.** Aggregate analytics, A/B experiment assignment, and cohort tracking all benefit from a stable internal ID that does not churn when the user updates their profile. Pseudo-anonymous events can be back-attributed to cohorts when the anonymous device ID is linked to the same internal user ID at account creation.

---

## Concrete examples & references

- **Firebase Anonymous Auth + Account Linking** (Firebase blog, 2023): Zero-friction anonymous login assigns a UID immediately; `linkWithCredential()` attaches a Google/Apple credential to the same UID, which does not change. Auth errors `credential-already-in-use` and `email-already-in-use` signal a merge-required state. Anonymous users auto-deleted after 30 days via Cloud Function. The UID as stable key is explicit in the Firebase design. (https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/)

- **PlayFab Login Basics and Best Practices** (Microsoft Learn): Recommends anonymous device-based login for zero-friction entry, then guided upgrade to a recoverable credential. Warns that paying players must be nudged to link recoverable credentials — account loss for a paying customer is the worst outcome. Server-side APIs are now required for account creation; client-side creation is disabled. (https://learn.microsoft.com/en-us/gaming/playfab/identity/player-identity/login/login-basics-best-practices)

- **Auth0: Authorization Code Flow with PKCE** (Auth0 Docs): Canonical PKCE walkthrough — generates `code_verifier` (43–128 chars random), SHA-256 hashes to `code_challenge`, attaches to auth redirect, sends raw verifier at token exchange. Emphasizes this protects native and SPA clients where a `client_secret` cannot be kept secret. (https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce)

- **OAuth 2.1 vs 2.0 key differences** (Descope blog): Lists OAuth 2.1's consolidation: PKCE mandatory for all, implicit grant removed, ROPC removed, refresh token rotation mandatory for public clients, bearer tokens in URLs forbidden. Several major frameworks already implement these. (https://www.descope.com/blog/post/oauth-2-0-vs-oauth-2-1)

- **OWASP Authentication Cheat Sheet**: Requires TLS for all login pages and subsequent authenticated pages; recommends MFA; bans silent password truncation; advises against forced periodic password rotation (increases predictable suffix-incrementing patterns). Specifies account lockout with exponential backoff and user notification. (https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

- **OWASP Session Management Cheat Sheet**: Session ID must be regenerated at every authentication event (prevents session fixation). Cookies must carry `HttpOnly`, `Secure`, and `SameSite=Strict`. Minimum session ID entropy: 128 bits. Absolute session timeout, idle timeout, and revocation on logout are all required. No single defense is sufficient — defense in depth. (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

- **NIST SP 800-63B-4** (NIST, 2024 final): Defines AAL1/2/3. AAL2 requires two factors; approved cryptography required at AAL2 and above. SMS OTP is downgraded: it is no longer recommended for new deployments (RESTRICTED authenticator, requires risk assessment). Syncable passkeys added as normative AAL2 in April 2024 interim guidance. (https://csrc.nist.gov/pubs/sp/800/63/b/4/final)

- **OpenID Foundation: How OpenID Connect Works**: Explains the ID token as a signed JWT from the authorization server asserting the authenticated user's identity to the relying party. Discovery document (`.well-known/openid-configuration`) enables dynamic client configuration. UserInfo endpoint carries additional claims. `sub` is stable; `email` is mutable and not a safe primary key. (https://openid.net/developers/how-connect-works/)

- **Cross-Device Passkey Sync** (MojoAuth Blog, 2026): Explains the three sync fabrics (iCloud Keychain, Google Password Manager, 1Password); Apple's multi-party HSM escrow model; Google's key-split device+account model. Device-to-device transfer uses QR + Bluetooth ECDH channel. Recovery requires proving control of the platform account AND the original device secret — Apple cannot decrypt unilaterally. (https://mojoauth.com/blog/cross-device-passkey-sync-icloud-google-1password)

- **JWT Best Practices: Storage, Algorithms & Revocation** (env.dev): Covers the `alg: none` vulnerability (validate expected algorithm explicitly); HS256 shared-secret sprawl; aud/iss validation requirements; deny list via Redis with `jti`; localStorage vs httpOnly cookie analysis. Recommends hybrid: in-memory access token + httpOnly refresh cookie. (https://env.dev/guides/jwt-best-practices)

- **JWT Refresh Token Rotation** (Descope blog): Token family concept — all refresh tokens from one login session share a family ID; reuse of a revoked token (theft indicator) triggers full-family revocation. Rotation implemented: each `/token` call returns a new refresh token and invalidates the prior. Public client refresh token rotation is mandated by OAuth 2.1. (https://www.descope.com/blog/post/refresh-token-rotation)

- **Supabase Identity Linking** (Supabase Docs): Real production example of the (provider, sub) → internal user mapping pattern. `linkIdentity()` attaches a new OAuth provider to an existing user; the `user_identities` table stores `(id, user_id, provider, identity_data, last_sign_in_at)`. Removing all identities would orphan the user, so at least one must remain. (https://supabase.com/docs/guides/auth/auth-identity-linking)

---

## Design implications & transferable principles

**1. Make the stable internal user ID the first thing you create, and the last thing you ever change.**
Generate an internal UUID for every session, including anonymous ones. All data rows — inventory, saves, purchases, events — reference this ID as a foreign key from day one. The login method, email address, and external sub claim are attributes. They can all change; the internal ID cannot.

**2. Design login-method change as a first-class operation, not an edge case.**
A user who wants to migrate from password login to passkey, or from Google to Apple, should be able to do so without losing data. This is only possible if external credentials are in a separate linking table. If your schema uses email as a primary key, you have a structural debt item that will surface as a support ticket every time a user changes their email.

**3. Treat the authorization-code + PKCE flow as the mandatory baseline, not an optional enhancement.**
The implicit flow (token in the URL fragment) is deprecated and unsafe. ROPC (sending username/password directly to your backend, which forwards to the IdP) defeats the entire purpose of delegation. Every new OAuth integration should use authorization-code + PKCE, with OAuth 2.1 rules as the target, even if the IdP still allows older grants.

**4. Choose session vs. token based on revocation requirements, not performance folklore.**
"Sessions don't scale" is largely a myth with Redis; a single Redis read per request is negligible. If you need instant token invalidation (staff account termination, suspected compromise, logout-everywhere), sessions are the only clean answer without building a deny list that incurs the same cost. Use JWTs for stateless microservice-to-microservice API calls where no per-user invalidation is needed, and use sessions (or opaque cookies backed by a session store) for user-facing web apps where revocation matters.

**5. The guest → account upgrade is a mapping operation, not a migration.**
Existing data rows do not need to move. Only the `user_identities` table gains a new row linking the external credential to the pre-existing internal user ID. This makes the upgrade instantaneous and atomic. The common failure mode is building a system where the anonymous user's data is stored under a *different* root key than the authenticated user's data, requiring a copy-merge-delete operation on account creation — with the race conditions and partial-failure states that entails.

**6. Never prompt for registration before the user experiences value.**
The correct moment to ask for registration is after the player has invested enough to care about losing their progress — after a tutorial, after the first meaningful session, after a purchase intent. Prompting at launch increases abandonment. Anonymous auth lets you defer this friction while still capturing engagement data under a stable session-scoped ID.

**7. Plan account recovery before launch, not after the first complaint.**
Recovery paths are attack surfaces. Define: (a) what factors does recovery require, (b) what is the support escalation path if all factors fail, (c) are recovery codes issued at enrollment, (d) what is the timeout on recovery codes. For passkey-centric flows, ensure the user has enrolled a second device or a backup code before they leave the enrollment screen. "You can always recover via your iCloud account" is only true if the user has iCloud account recovery configured — which many do not.

**8. Apply NIST AAL levels as a risk-tiering tool, not a compliance checkbox.**
Map your actions to the appropriate AAL: anonymous browsing is AAL0; posting content or casual play is AAL1; account changes (email, password, linked payment method) are AAL2; high-value financial transactions are AAL2 or AAL3. Step-up authentication (re-prompt at the sensitive action, not globally) lets most users stay frictionless while high-value moments require stronger verification.

**9. httpOnly cookies beat localStorage for the long-lived credential in every web deployment.**
localStorage is readable by any JavaScript running on the page; a single XSS vulnerability exposes every token. httpOnly cookies are not accessible to JavaScript at all. SameSite=Strict prevents cross-site request forgery. This tradeoff is not close — use httpOnly cookies for refresh tokens in web applications. For access tokens, in-memory storage (JavaScript variable) is acceptable given the short TTL.

**10. Passkeys are production-ready; add them now, not when you get around to it.**
Every major browser and platform (Chrome, Safari, Firefox, Edge; iOS, Android, Windows, macOS) supports WebAuthn. Platform sync (iCloud Keychain, Google Password Manager) means users don't need to re-register on every device. Passkeys eliminate the password-reset support burden and phishing risk in one move. The WebAuthn spec is stable; the libraries are mature. Defer adoption only if your user base has a known segment on unsupported platforms.

---

## Open questions to resolve per project

- What is the target AAL for different action tiers (browse, play, purchase, admin)? This drives which MFA factors to require and where to insert step-up prompts.
- Which external identity providers will be supported at launch, and in what priority order? (Google and Apple are the practical minimum for mobile; email+password fallback adds coverage for users without those accounts.)
- Is the anonymous-to-account upgrade flow required, or will the app require registration before first use? This determines whether an internal UUID must be created before any login interaction.
- What is the account recovery story if a user loses both their device and access to their sync platform account (Apple ID / Google Account)? Is manual identity-proofing via a support ticket acceptable, or is a backup-code mechanism needed?
- Where will tokens / session IDs be stored on each platform (web, iOS, Android, game client)? Each platform has different secure storage primitives (Keychain, Android Keystore, httpOnly cookies, memory-only).
- Does any microservice-to-microservice call path require validated user identity (e.g., for audit logging or authorization)? If so, JWTs with a shared trust root are the natural transport; plan the key rotation schedule.
- How will anonymous accounts be cleaned up? Define the TTL, the event trigger (device change, inactivity), and the cascading delete policy for all child data.

---

## Sources

1. https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/ — Firebase, "Best Practices for Anonymous Authentication" (2023)
2. https://learn.microsoft.com/en-us/gaming/playfab/identity/player-identity/login/login-basics-best-practices — Microsoft Learn, "PlayFab Login Basics and Best Practices"
3. https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce — Auth0 Docs, "Authorization Code Flow with PKCE"
4. https://www.descope.com/blog/post/oauth-2-0-vs-oauth-2-1 — Descope, "OAuth 2.0 vs OAuth 2.1: Key Differences"
5. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html — OWASP Cheat Sheet Series, "Authentication Cheat Sheet"
6. https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html — OWASP Cheat Sheet Series, "Session Management Cheat Sheet"
7. https://csrc.nist.gov/pubs/sp/800/63/b/4/final — NIST Special Publication 800-63B-4, "Digital Identity Guidelines: Authentication and Authenticator Management" (2024)
8. https://openid.net/developers/how-connect-works/ — OpenID Foundation, "How OpenID Connect Works"
9. https://mojoauth.com/blog/cross-device-passkey-sync-icloud-google-1password — MojoAuth Blog, "Cross Device Passkey Sync Explained: iCloud Keychain, Google Password Manager, and 1Password" (2026)
10. https://env.dev/guides/jwt-best-practices — env.dev, "JWT Best Practices: Storage, Algorithms & Revocation"
11. https://www.descope.com/blog/post/refresh-token-rotation — Descope, "The Developer's Guide to Refresh Token Rotation"
12. https://supabase.com/docs/guides/auth/auth-identity-linking — Supabase Docs, "Identity Linking"
