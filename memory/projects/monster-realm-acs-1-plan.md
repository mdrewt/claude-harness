# acs-1 plan — the account service: a provider that serves discovery and keys, runnable on localhost

Spec: `specs/monster-realm-v2/M-account-service.spec.md` §acs-1 (EARS acs-1.1 to acs-1.5).
Worktree: `projects/monster-realm/.claude/worktrees/acs-1`, branch `slice/acs-1`, base `origin/master` a5b783f2.
Tier: hard (a new authentication surface). Sandbox: `/tmp/acs-1-sb.hJBE1z` (probes, left in place).

## What is measured (probes in the sandbox, nothing committed)

- `oidc-provider` latest is 9.15.1 (MIT; dependencies `koa`, `jose`, `debug`; no install script in the
  tree). It ships no types: `@types/oidc-provider` 9.13.1 typechecks under TypeScript 7.0.2, including
  `ExternalSigningKey`. vitest 4.1.12 imports `node:sqlite` and `.ts`-suffixed relative imports.
- Node 24.22.0 (the repo pin): `node:sqlite` loads with no warning (SQLite 3.53.4); `node file.ts` runs
  TypeScript by type stripping; `import.meta.main` is true for the entry file. On 24.13.1 the same code
  runs and `node:sqlite` prints an ExperimentalWarning.
- **Discovery follows the request, not the issuer.** A default provider answers
  `GET /.well-known/openid-configuration` with `Host: evil.example` by publishing
  `jwks_uri: http://evil.example/jwks` (the `issuer` field stays right). An absolute-form request
  target (`GET http://abs.example/... HTTP/1.1`) does the same. A handler that rejects a target not
  starting with `/`, deletes `forwarded` and every `x-forwarded-*` header, sets `host` to the issuer's
  host and `x-forwarded-proto` to the issuer's scheme, with `provider.proxy = true`, publishes every
  URL under the issuer whatever the request carries.
- **Defaults that must not ship:** `devInteractions` is on (a sign-in form that accepts any name);
  `rpInitiatedLogout` is on, and an anonymous `GET /session/end` writes a Session record and sets an
  unsigned cookie. With both off, no anonymous request writes to the adapter or sets a cookie
  (11 routes tried). Default `responseTypes` advertise implicit and hybrid flows. The default client
  `id_token_signed_response_alg` is RS256, which a provider holding only an ES256 key refuses at
  client load (`id_token_signed_response_alg must be 'ES256'`).
- **The provider's adapter contract needs a consumed record to be found, carrying `consumed`.**
  `lib/helpers/grant_source.js` (`if (source.consumed) { await revoke(ctx, source.grantId); throw
  InvalidGrant('… already consumed') }`) and `lib/actions/grants/refresh_token.js`
  (`if (refreshToken.consumed) { destroy; revoke(grantId); throw 'refresh token already used' }`) are
  the replay detection acs-2.1 and acs-2.4 rest on. An adapter whose consumed records read as absent
  turns a replay into a plain "not found": refused, but the chain is never revoked.
- The provider's models can be driven directly (no HTTP): `new provider.Grant(...)`,
  `AuthorizationCode`, `RefreshToken`, `Session` save, find, consume, destroy, `revokeByGrantId` and
  `findByUid` all reach the adapter (call log in the sandbox, `probe/p3.mjs`).
- Node's JWK import refuses an EC key whose `d` does not match `x`/`y` (`ERR_CRYPTO_INVALID_JWK`).
- `just` 1.58.0 forwards SIGTERM to a recipe's `exec`ed child; the recipe exits 143.
- `scripts/check-secrets.mjs` flags a PEM private key and `(password|secret|api_?key) = "…8+ chars"`;
  a JWK file trips neither. Remote gitleaks scans every commit of the PR range: no key material and
  no high-entropy literal beside a `key`/`token`/`secret` name is ever committed, tests generate keys
  at run time, fake secrets use the `INTERNAL_SECRET_` prefix (`.gitleaks.toml`).

## Design

Functional core: `config.ts` (`loadConfig(env)`, pure over an env record) and the key-file parser.
Imperative shell: `server.ts` (reads `process.env`, makes the data directory, opens the store, loads
keys, listens, handles signals). `provider.ts` owns the provider's configuration and the one request
handler that pins every published URL to the issuer. `store/sqliteAdapter.ts` is the only module that
touches `node:sqlite`. No build step: Node runs the sources (`erasableSyntaxOnly`).

Dependencies: `oidc-provider` 9.15.1 (exact). Dev: `typescript`, `vitest`, `@types/node`,
`@types/oidc-provider`. No SQLite package (Node's own), no `jose` yet (acs-3 signs with it), no
second biome (the root `just lint` already lints the package with the client's pinned binary).

### Contracts (the tester writes to these; the implementer builds to them)

```ts
// account-service/src/config.ts
export type Profile = 'local-dev' | 'hosted-dev' | 'production';
export type SignInMethod = 'dev-password' | 'steam';
export type KeySource =
  | { readonly kind: 'file'; readonly path: string; readonly generateIfMissing: boolean }
  | { readonly kind: 'external' };
export interface Config {
  readonly profile: Profile;
  readonly issuer: string;
  readonly listen: { readonly host: string; readonly port: number };
  readonly dataDir: string;        // absolute
  readonly databasePath: string;   // path.join(dataDir, 'account.sqlite')
  readonly keys: KeySource;
  readonly signIn: SignInMethod;
}
export const LOCAL_DEV_ISSUER = 'http://localhost:4455';
export const HOSTED_DEV_ISSUER = 'https://auth.monster-realm.spookyowltech.com';
export const LOCAL_DEV_DATA_DIR: string;   // absolute: <account-service>/.data, derived from this module's own location
export class ConfigError extends Error {
  readonly setting: string;        // the env name at fault
  constructor(setting: string, problem: string);   // message: `${setting}: ${problem}`
}
export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config;
```

`loadConfig` reads only own properties of `env`. A setting whose value is `undefined` or `''` is
unset. A set value is taken exactly as written (never trimmed, never normalised). Every refusal is a
`ConfigError` whose `setting` is the env name at fault. **No message ever carries a setting's value.**

| Setting | local-dev | hosted-dev | production |
|---|---|---|---|
| `MR_ACCOUNT_PROFILE` | required for every profile; exactly one of the three names, anything else refused | | |
| `issuer` | `LOCAL_DEV_ISSUER` | `HOSTED_DEV_ISSUER` | the value of `MR_ACCOUNT_ISSUER` |
| `MR_ACCOUNT_ISSUER` | refused when set | refused when set | required; rule below |
| `MR_ACCOUNT_SIGN_IN` | unset or `dev-password` → `dev-password`; anything else refused | same | unset or `steam` → `steam`; anything else refused (so `dev-password` is) |
| `MR_ACCOUNT_DATA_DIR` | default `LOCAL_DEV_DATA_DIR` | required | required |
| `MR_ACCOUNT_KEY_FILE` | default `path.join(dataDir, 'keys.json')`; `keys = { kind: 'file', path, generateIfMissing: true }` | same default; `generateIfMissing: false` | refused when set; `keys = { kind: 'external' }` |
| an env name matching `/^MR_STEAM_.*KEY/i` (the publisher key is `MR_STEAM_PUBLISHER_KEY`) | refused when set, `setting` = that name | same | not read |
| `MR_ACCOUNT_HOST` | default `127.0.0.1`; a value must satisfy `net.isIP(v) !== 0 \|\| v === 'localhost'` | same | same |
| `MR_ACCOUNT_PORT` | default `4455`; a value must match `/^(0\|[1-9]\d{0,4})$/` and be ≤ 65535 (0 = the OS picks) | same | same |
| any other set name whose `trim().toUpperCase()` starts with `MR_ACCOUNT_` | refused, `setting` = the name as written (a misspelt or wrong-case setting never falls back to a default) | | |

- A set `MR_ACCOUNT_DATA_DIR` or `MR_ACCOUNT_KEY_FILE` must be absolute and normalised
  (`path.resolve(v) === v`) and not the filesystem root.
- Production `MR_ACCOUNT_ISSUER`: `new URL(v)` parses, `protocol` is `https:`, and `v === url.origin`
  (so no userinfo, path, query, fragment, default port, upper case or trailing slash). Its hostname is
  two or more dot-separated labels of `[a-z0-9-]`, none empty (so no trailing dot), none starting or
  ending with `-`, the last not all digits (so no IP literal). The hostname is not `localhost`, does not
  end in `.localhost`, and is neither a dev issuer's hostname nor under one
  (`auth.monster-realm.spookyowltech.com`, `x.auth.monster-realm.spookyowltech.com`, with or without a port).
- When several settings are at fault the first refusal reported is unspecified; tests give one fault at a time.

```ts
// account-service/src/keys.ts
export interface SigningJwk {
  readonly kty: 'EC'; readonly crv: 'P-256'; readonly alg: 'ES256'; readonly use: 'sig';
  readonly kid: string; readonly x: string; readonly y: string; readonly d: string;
}
export interface SigningKeys { readonly keys: readonly SigningJwk[] }   // keys[0] signs; every key is published
export function generateSigningKey(): SigningJwk;   // fresh P-256 key; kid = RFC 7638 thumbprint (SHA-256, base64url) of its public JWK
export function loadSigningKeys(config: Pick<Config, 'profile' | 'keys'>): SigningKeys;
```

- Key file: JSON, exactly `{ "profile": "<the profile it was made for>", "keys": [ <key>, ... ] }`.
  A key is an object with exactly `kty`, `crv`, `x`, `y`, `d`, `kid`, and optionally `alg` and `use`.
- `kind: 'file'`, file absent, `generateIfMissing: true`: creates the parent directory if absent
  (recursive, mode 0700), writes one generated key (file mode 0600) so that no reader ever sees a
  partial file and an existing file is never replaced (temp file, then `link`; if the path already
  exists by then, the existing file is loaded instead), and returns it.
- `kind: 'file'`, file absent, `generateIfMissing: false`: `ConfigError('MR_ACCOUNT_KEY_FILE', …)`.
- `kind: 'file'`, file present: returns its keys in file order. Refused with
  `ConfigError('MR_ACCOUNT_KEY_FILE', …)` when: it is not JSON of exactly that shape; `profile` is not
  the string `config.profile`; `keys` is empty; a key has a member outside the list; `kty` is not
  `EC` or `crv` is not `P-256`; `alg` is present and not `ES256`; `use` is present and not `sig`;
  `x`, `y` or `d` does not match `/^[A-Za-z0-9_-]{43}$/`; `kid` does not match
  `/^[A-Za-z0-9_-]{1,64}$/`; two keys share a `kid`; Node refuses to import the key (`d` not the
  private half of `x`,`y`); or, for `hosted-dev` on a non-Windows platform, the file's mode has any
  group or other bit (`mode & 0o077`). No refusal message carries any part of a key.
- `kind: 'external'`: `ConfigError('MR_ACCOUNT_PROFILE', …)`; this build holds no external signer.

```ts
// account-service/src/store/sqliteAdapter.ts
import type { Adapter } from 'oidc-provider';
export interface AccountStore {
  readonly adapter: (model: string) => Adapter;   // what the provider's `adapter` option takes
  purgeExpired(): number;                          // deletes expired records, returns how many
  close(): void;
}
export function openAccountStore(path: string, now?: () => number): AccountStore;
// path: a file path or ':memory:'. now: epoch seconds; default the wall clock.
```

`openAccountStore` on a file path creates the file with mode 0600 when it is absent. Per model name
(records of two models never see each other, in any operation):
- `upsert(id, payload, expiresIn)`: stores the payload. `expiresIn` a finite number: the record
  expires at `now() + expiresIn` (zero or negative: already expired). `undefined`: it never expires.
  Any other `expiresIn` (NaN, Infinity, a string) rejects with a `TypeError` and stores nothing. A
  second upsert of the same id replaces payload and expiry and keeps a consume mark.
- `find(id)`: `undefined` when the record is absent or expired (`now() >= expiry`). An unconsumed
  record returns its payload as stored. A consumed record returns the payload with `consumed` set to
  the epoch seconds of its first `consume` (replacing any `consumed` member the payload carried).
- `findByUid(uid)` / `findByUserCode(userCode)`: the same read, for the record of this model whose
  payload has that string `uid` / `userCode`.
- `consume(id)`: marks the record consumed at `now()`; a second consume keeps the first time; it
  resolves for an absent or expired id and creates nothing.
- `destroy(id)`: removes the record; resolves for an absent id.
- `revokeByGrantId(grantId)`: removes every record of this model whose payload's `grantId` is that string.
- Ids, uids and grant ids are matched as exact strings (`a%` is not `abc`).
- A file-backed store keeps records and consume marks across `close()` and a new `openAccountStore(path)`.
- `purgeExpired()` removes exactly the expired records.

```ts
// account-service/src/provider.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import type Provider from 'oidc-provider';
export interface AccountProvider {
  readonly provider: Provider;
  readonly handler: (req: IncomingMessage, res: ServerResponse) => void;
}
export function createAccountProvider(options: {
  readonly issuer: string;
  readonly keys: SigningKeys;
  readonly adapter: (model: string) => Adapter;
}): AccountProvider;
```

Through `handler` (an `http.createServer(handler)` on any port):
- A request whose `Host` header is not the issuer's host (`new URL(issuer).host`, compared
  case-insensitively; a missing Host counts as different) gets **421** and a `text/plain` body; the
  provider never sees it. A request target that does not start with `/` gets **400**.
- For a request with the right Host: `GET /.well-known/openid-configuration` is 200 JSON whose
  `issuer` is `issuer` exactly, and every string member that parses as an absolute URL starts with
  `issuer + '/'`, whatever `Forwarded`, `X-Forwarded-Host`, `X-Forwarded-Proto`, `X-Forwarded-Port`,
  `X-Original-URL` or `X-Rewrite-URL` header the request also carries (for an `https:` issuer the URLs
  are `https:` though the socket is plain).
- `GET /jwks` is 200 with one entry per key of `keys`, in order, each with exactly the members `kty`,
  `crv`, `x`, `y`, `kid`, `alg`, `use` (`EC`, `P-256`, the key's own `x`, `y`, `kid`, `ES256`, `sig`).
- Discovery's `id_token_signing_alg_values_supported` is `['ES256']`, `response_types_supported` is
  `['code']`, and `grant_types_supported` does not contain `implicit`.
- No client is registered and there is no sign-in step: `GET /interaction/<anything>` and
  `GET /session/end` are 404.
- None of these anonymous requests calls the adapter's `upsert` or sets a cookie: `GET /session/end`,
  `GET /auth?client_id=x&response_type=code&scope=openid`, `GET /me`, `POST /token`, `POST /request`,
  `GET /interaction/abc`, `GET /jwks`, `GET /.well-known/openid-configuration`.
- The error page (`GET /auth?client_id=x&response_type=code&scope=openid`, status 400) is
  `text/plain` and its body contains no `http://` or `https://` URL outside the issuer.

```ts
// account-service/src/server.ts
export interface RunningServer {
  readonly config: Config;
  readonly url: string;            // what is actually bound: http://127.0.0.1:<port>, IPv6 as http://[::1]:<port>
  close(): Promise<void>;          // stops listening, stops the purge timer, closes the store
}
export function startServer(
  env: Readonly<Record<string, string | undefined>>,
  log?: (line: string) => void,
): Promise<RunningServer>;
```

- Order: `loadConfig` → `loadSigningKeys` → `openAccountStore(config.databasePath)` (after creating
  `dataDir`, recursive, mode 0700, when absent) → listen. A `ConfigError` rejects the promise before
  anything listens; one from `loadConfig`, or from a missing or refused key file, leaves no file or
  directory written.
- One start line through `log` (default: stdout):
  `account-service: profile=<profile> issuer=<issuer> listening=<url> kids=<kid>[,<kid>…]`.
- It calls `store.purgeExpired()` once a minute on an unref'd timer.
- Run as the entry file (`node src/server.ts`) it calls `startServer(process.env)`. A refusal prints
  `account-service: refusing to start: <ConfigError message>` on stderr and exits 1. SIGINT or SIGTERM
  closes it and the process exits 0 (through `just`, the recipe reports 143).

```
# justfile (every recipe a bash shebang body)
account-install    # skip when account-service/node_modules is a symlink; else `npm ci` when
                   # node_modules/.package-lock.json is absent or older than package-lock.json
account-dev        # depends on account-install; cd account-service && MR_ACCOUNT_PROFILE=local-dev exec node src/server.ts
                   # (every other MR_ACCOUNT_* comes from the caller's environment)
account-typecheck  # depends on account-install; cd account-service && npm run typecheck
account-test       # depends on account-install; cd account-service && npm test
ci: … account-typecheck account-test      # lint is the existing `lint` recipe (biome over the tree)
```

`.github/workflows/ci.yml`: a fifth job `account-service` (setup-node keyed on the package's lock
file, the tools action, `- run: just account-typecheck`, `- run: just account-test`). The existing
`scripts/ci-parity.test.mjs` already fails when a `ci:` recipe has no single-line workflow step.

`docs/account-service.md` (a deliverable of this slice): what the service is, the three profiles, the
settings table, what it refuses, keys, storage, how requests are answered, `just account-dev` and the
tests, the operator inputs, and the runbook headings.

`docs/DECISIONS.md`: one clause added in place to "The account service is our own small OIDC issuer…":
the SQLite file is opened with Node's built-in `node:sqlite`, no native SQLite package.

### Tests (the tester's files)

| File | Carries |
|---|---|
| `src/config.test.ts` | acs-1.2: each refused setting alone against a control that loads; the three profiles' issuers and defaults; the issuer spellings; port and host shapes; unknown and wrong-case names; no value in any message |
| `src/keys.test.ts` | acs-1.1 (keys by `kid`) and acs-1.2 (the key-file mark): generation, reuse, modes, every refusal in the contract, no key material in a message, `external` refused |
| `src/store/sqliteAdapter.test.ts` | X1: the contract above under an injected clock, and the provider's own models (`Grant`, `AuthorizationCode`, `RefreshToken`, `Session`) driven through the store; persistence across reopen; `purgeExpired` |
| `src/provider.test.ts` | acs-1.1: discovery, the key set, the Host rule and the forwarded headers, the closed defaults |
| `src/server.test.ts` | acs-1.4: the real `just --no-deps account-dev` against a temp data directory and port 0, twice (same `kid`, `x`, `y`; key file bytes unchanged); acs-1.2 at process level (exit 1, the setting on stderr, nothing written); file modes |

## Plan review (reviewer + red-team, both read-only; no blocker)

Adopted into the contracts above: hostname-based issuer rule with the IP, trailing-dot, `localhost`
and under-a-dev-host cases; canonical base64url and `kid` shapes for key-file members (Node imports
`x` with trailing `=` or a newline and the provider would publish it verbatim); a hard Host check
(421) in place of rewriting Host; plain-text error page (the library default links Google Fonts);
port regex; wrong-case and misspelt names refused; no value in any message; data directory and key
file paths normalised; the database file created 0600 (SQLite alone makes it 0644, and its `-wal`
and `-shm` files copy the main file's mode); `expiresIn` semantics for NaN and Infinity; a stored
consume mark wins over a payload's own `consumed`; `startServer`'s order; `--no-deps` for the recipe
test; the symlink guard and the hidden-lock-file freshness test in `account-install`;
`docs/account-service.md` named as a deliverable; the `DECISIONS.md` amendment cut to one clause.

Answered, not adopted:
- "Refuse `0.0.0.0` for local-dev": acs-4.2 runs the `local-dev` profile in a container, which must
  bind the wildcard; the default stays loopback and a wider bind is an explicit setting.
- "Refuse or tighten a loose data directory": a mounted volume's mode is the operator's. The files the
  service creates are 0600/0700; a `hosted-dev` key file readable by group or others is refused.
- "A `git check-ignore` test of the default data directory": dropped; a check of repository
  configuration that fails outside a git checkout.
- "A test of two simultaneous first starts": the link-into-place write removes the window by
  construction; a timing test would be a flake.
- "A keygen command for hosted-dev": `generateSigningKey()` is exported; the command belongs with the
  runbook that uses it (note filed for acs-4, whose `touches:` lack `keys.ts`).

## Acceptance ledger

- acs-1.1: `provider.test.ts` + `keys.test.ts`.
- acs-1.2: `config.test.ts`.
- acs-1.3: **DEFER → wontfix**, with X1 carrying what is built. Its second clause asks that a consumed
  record read as absent; its first asks for the provider's adapter contract, which needs a consumed
  record to be found carrying `consumed` (the measurement above). The intent (a spent record can never
  be used as a live one, and a replay is seen) is met by X1.
- X1: `store/sqliteAdapter.test.ts`: a consumed record reads back carrying `consumed`, never as an
  unconsumed one; an expired record reads as absent; the rest of the adapter contract.
- acs-1.4: `server.test.ts`.
- acs-1.5: `just --dry-run ci` lists the package's typecheck and test commands and the tree-wide
  biome line; `scripts/ci-parity.test.mjs` (existing) holds the workflow to the `ci:` list. The bite proof is run once by hand and recorded in the PR body: a type error, a failing
  test and a lint error planted in the package each turn the matching `ci` step red.

## plan-delta (for the PR body)

- acs-1.3's "a consumed … record SHALL read as absent" → a consumed record reads back carrying the
  provider's `consumed` mark (never as unconsumed); expired reads as absent. Evidence: oidc-provider
  9.15.1 `grant_source.js` / `refresh_token.js`; acs-2.4 needs the revocation this enables.
- "an external signer (production)" → the config names the source (`keys: { kind: 'external' }`) and
  the service refuses to start with it. The signer itself belongs to the slice that knows the key
  service (acs-11's contract already names it). No abstraction for an implementation that cannot run.
- Not in the spec's plan, built because the measurement demands it: the issuer-pinned request handler;
  `devInteractions` and `rpInitiatedLogout` off; `responseTypes: ['code']`; ES256 as the only ID-token
  algorithm and the client default.
- `biome.json` is in `touches:` and needs no change (the root config already covers the package and
  honours `.gitignore`).

## Notes to file (`mr-gates notes add`), not built here

- acs-2 must set `cookies.keys` (sessions and interactions are unsigned without them). Any new
  `MR_ACCOUNT_*` setting is refused until `config.ts` knows it, and acs-2's `touches:` lack `config.ts`
  and `keys.ts`. It registers its client with `id_token_signed_response_alg` left to the ES256 default.
- acs-2: two parallel refreshes of one token can both pass the provider's `consumed` test (awaits sit
  between find and consume), so both get a fresh chain with no replay seen.
- acs-4: the runbook needs a key generation and rotation command (`generateSigningKey()` is exported;
  acs-4's `touches:` lack `keys.ts` and `server.ts`); a health check must send the issuer's Host; a
  hosted profile reached over plain HTTP still marks cookies Secure.
- Tests that need a module to fetch discovery over HTTP must run the service on its real port 4455
  (one at a time on a machine); everything else drives `handler` in-process.
- Token ids are stored as the provider hands them over: the SQLite file and its backups hold live
  refresh tokens once acs-2 issues them. Hashing ids at rest needs `Session.findByUid` handled; weigh
  it in acs-2 or acs-4 (security-privacy/MED follow-up).
- The handler drops every forwarded header, so `ctx.ip` is the proxy's address: acs-9's per-IP limit
  needs a trusted-proxy rule.
- `ARCHITECTURE.md`, `AGENTS.md` and `README.md` do not name `account-service/` or its recipes (outside `touches:`).
- acs-1.3's text should be amended to the provider's contract.
