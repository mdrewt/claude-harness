# acs-1 — tester brief

You write the gating tests for slice `acs-1` of Monster Realm. You do not implement the feature and
you do not write configuration. Everything you write goes under the slice worktree:

`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/acs-1`

(called `WT` below; every path in this brief is relative to it). The package `account-service/`
exists with its manifest, lock file, `tsconfig.json` and `vitest.config.ts`, and `node_modules`
installed. **None of the production modules exists yet**, so every test file fails at import until
the implementer lands them. That is the expected red state. You have no shell; I run everything and
report back.

Verification doctrine: `/home/mdrewt/.claude/harness/standards/testing-tdd.md`. The parts that bind
here: a test executes code; it never reads hand-written source, config, recipes or docs as text,
never pins prose (assert that a message *names the setting*, never its wording), never checks
another check. Deterministic: injected clocks, no sleeping for a result, no fixed ports. Test names
lead with the behaviour they prove; no slice or criterion id in a test name.

## What acs-1 is

A new Node 24 / TypeScript package: an OpenID Connect issuer built on `oidc-provider` 9.15.1. This
slice makes it serve discovery and an ES256 key set on localhost, with a SQLite store behind the
provider and three configuration profiles. Later slices add sign-in and tokens on top. A game server
will trust tokens from this issuer by fetching `<issuer>/.well-known/openid-configuration` and then
the `jwks_uri` it names, so what those two documents say is security-critical.

## The criteria (verbatim from the spec)

- **acs-1.1:** WHEN the service starts, THE SYSTEM SHALL serve `/.well-known/openid-configuration` naming its profile's issuer, and a key set holding only public ES256 keys, each with its `kid`.
- **acs-1.2:** WHEN the `production` profile is loaded with any dev-only setting (the dev password method, a dev issuer, a key file marked dev, an `http:` issuer), or a dev profile is loaded with a production issuer or a Steam publisher key, THE SYSTEM SHALL refuse to start and name the setting.
- **acs-1.3:** WHEN an adapter record is written, read, consumed and expired through `sqliteAdapter.ts`, THE SYSTEM SHALL meet the provider's adapter contract, and a consumed or expired record SHALL read as absent.
- **acs-1.4:** WHEN `just account-dev` runs on a clean checkout, THE SYSTEM SHALL serve discovery at `http://localhost:4455` with keys it generated, and a second start SHALL reuse them.
- **acs-1.5:** WHEN `just ci` runs, THE SYSTEM SHALL run the package's lint, typecheck and tests. (No test of yours: a check of CI wiring is a check of a check.)

### acs-1.3 is adjudicated: write to X1, not to its second clause

"A consumed record SHALL read as absent" contradicts "meet the provider's adapter contract".
oidc-provider 9.15.1 detects a replayed authorization code or refresh token **only** when the
adapter's `find` returns the record carrying a truthy `consumed`; it then revokes the whole grant
(`node_modules/oidc-provider/lib/helpers/grant_source.js`, `lib/actions/grants/refresh_token.js`).
An adapter that hides consumed records turns a replay into a plain "not found" and the chain is
never revoked, which a later criterion (acs-2.4) forbids. The ledger defers acs-1.3 and carries:

- **X1:** WHEN an adapter record is written, read, consumed and expired through `sqliteAdapter.ts`, THE SYSTEM SHALL meet the provider's adapter contract: a consumed record SHALL read back carrying the provider's `consumed` mark and never as an unconsumed record, and an expired record SHALL read as absent.

Test X1. If you think this adjudication is wrong, say so under Findings; do not test the other reading.

## Contracts

These names, signatures and behaviours are fixed. Call exactly these. Relative imports carry the
`.ts` suffix (`import { loadConfig } from './config.ts';`): the sources run under Node's type
stripping.

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

What the `just` recipe does (you only need this for `server.test.ts`): `just --no-deps account-dev`,
run with the repository root as cwd, changes into `account-service/` and runs
`MR_ACCOUNT_PROFILE=local-dev exec node src/server.ts`; every other setting comes from the
environment you give the child. Use `--no-deps` always (the recipe's dependency reinstalls packages
and must never run underneath a test).

## Your files (exactly these five; create no other file)

| File | Proves |
|---|---|
| `account-service/src/config.test.ts` | acs-1.2 at the `loadConfig` level, and the profiles |
| `account-service/src/keys.test.ts` | the key side of acs-1.1 and acs-1.2 |
| `account-service/src/store/sqliteAdapter.test.ts` | X1 |
| `account-service/src/provider.test.ts` | acs-1.1 through `handler` |
| `account-service/src/server.test.ts` | acs-1.4, and acs-1.2 at process level |

No shared helper file: a small helper repeated in two test files is fine.

## Cases that must be there

Each of these is the test that kills a cheap wrong implementation. Add whatever else the criteria
need; do not drop any of these.

`config.test.ts`
- Each profile loads from the smallest valid env and has the issuer, sign-in method, key source and
  listen defaults the table gives (`local-dev` from `{ MR_ACCOUNT_PROFILE: 'local-dev' }` alone;
  `dataDir` equals `LOCAL_DEV_DATA_DIR`, an absolute path ending in `account-service/.data`).
- Production, one fault at a time against a control env that loads (`MR_ACCOUNT_PROFILE=production`,
  `MR_ACCOUNT_ISSUER=https://accounts.example.com`, `MR_ACCOUNT_DATA_DIR=/var/lib/x`): sign-in
  `dev-password`; `MR_ACCOUNT_KEY_FILE` set; issuer `http://accounts.example.com`; issuer equal to each
  dev issuer; `https://localhost`; `https://localhost:4455`; `https://127.0.0.1`; `https://[::1]`;
  `https://auth.monster-realm.spookyowltech.com:8443`; `https://x.auth.monster-realm.spookyowltech.com`;
  `https://accounts.example.com.` (trailing dot); `https://accounts.example.com/` (trailing slash);
  `https://accounts.example.com/path`; `HTTPS://accounts.example.com`; `https://accounts.example.com:443`;
  `https://user:pw@accounts.example.com`; `https://a_b.example.com`; `https://app.localhost`; not a
  URL at all; missing. Each is a `ConfigError` whose `setting` is the right env name.
- Dev profiles (both), one fault at a time: `MR_ACCOUNT_ISSUER` set to a production-looking issuer,
  and set to the profile's own issuer (still refused); `MR_STEAM_PUBLISHER_KEY` set;
  `MR_STEAM_PUBLISHER_KEY_FILE` set; sign-in `steam`. And `MR_STEAM_APP_ID` set alone still loads.
- The refusal for a secret never contains its value: set `MR_STEAM_PUBLISHER_KEY` to a value starting
  `INTERNAL_SECRET_` and assert the message and `String(error)` do not contain it. Likewise the
  userinfo issuer: the message does not contain `pw`'s stand-in (use an `INTERNAL_SECRET_` value as the password).
- Unknown and wrong-case names: `MR_ACCOUNT_SIGNIN`, `mr_account_issuer`, ` MR_ACCOUNT_PORT` (leading
  space in the name) are each refused with `setting` equal to the name as written; an empty-string
  value for any of them is ignored.
- `MR_ACCOUNT_PORT`: `'0'`, `'4455'`, `'65535'` load as numbers; `'65536'`, `'0x1167'`, `'1e3'`,
  `'-0'`, `' 4455'`, `'4455 '`, `'04455'`, `'+1'`, `'٤٤٥٥'`, `''`-is-default. `MR_ACCOUNT_HOST`:
  `'127.0.0.1'`, `'::1'`, `'0.0.0.0'`, `'localhost'` load; `'example.com'`, `'[::1]'`, `' 127.0.0.1'` refused.
- `MR_ACCOUNT_DATA_DIR` / `MR_ACCOUNT_KEY_FILE`: a relative path, a path with `..`, and `/` refused;
  hosted-dev and production without `MR_ACCOUNT_DATA_DIR` refused.
- A polluted prototype does not supply a setting: with `Object.prototype.MR_ACCOUNT_PROFILE`
  temporarily defined (restore it in `finally`), `loadConfig({})` is still refused for the missing
  profile. `MR_ACCOUNT_PROFILE` values `'Production'`, `' production'`, `'prod'` refused.

`keys.test.ts`
- `generateSigningKey()`: a P-256 private JWK with `alg: 'ES256'`, `use: 'sig'`, and a `kid` equal to
  the RFC 7638 thumbprint you compute yourself (`createHash('sha256')` over
  `JSON.stringify({ crv, kty, x, y })` in exactly that member order, base64url). Two calls differ.
  A signature made with it (`crypto.sign('sha256', data, { key: createPrivateKey({ key: jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' })`)
  verifies under the public members alone.
- First load with `generateIfMissing: true` in an empty temp directory, including a parent directory
  that does not exist yet: returns one key, the file exists, parses as `{ profile, keys }` with that
  profile; on POSIX the file is 0600 and a created parent 0700 (guard mode assertions with
  `process.platform !== 'win32'` inside the test body, not with `skip`).
- Second load: the same `kid`, `x`, `y`, `d`, and the file's bytes are unchanged.
- A file the test wrote with two valid keys loads both in order.
- Each refusal in the contract, one at a time, starting from a valid file the test builds from
  `generateSigningKey()` output: absent with `generateIfMissing: false`; not JSON; an array; `profile`
  another profile's name; `profile: 1`; an extra top-level member; `keys: []`; `keys` not an array; a
  key with an extra member (`key_ops`); `kty: 'RSA'`-shaped key; a P-384 key; an Ed25519 key;
  `alg: 'ES384'`; `use: 'enc'`; a public-only key (no `d`); `d` taken from a different generated key;
  `x` with a trailing `=`; `x` with a trailing `\n`; `kid` `''`; `kid` containing `/`; `kid`
  containing a control character; two keys with one `kid`. Every one is a `ConfigError` with
  `setting === 'MR_ACCOUNT_KEY_FILE'`, and neither its message nor `String(error)` contains the `d`,
  `x` or `y` of any key in the file.
- hosted-dev refuses a key file whose mode is 0644 and loads the same file at 0600 (POSIX only, same guard).
  local-dev loads a 0644 file.
- A profile mismatch both ways: a file marked `local-dev` is refused by `hosted-dev` and the reverse.
- `{ kind: 'external' }` is a `ConfigError` with `setting === 'MR_ACCOUNT_PROFILE'`.

`store/sqliteAdapter.test.ts` (inject the clock: `let t = 1_000_000; openAccountStore(':memory:', () => t)`)
- Round trip; absent id → `undefined`.
- Expiry at the exact boundary for all three reads: upsert with `expiresIn = 10`; at `t + 9`
  `find`, `findByUid`, `findByUserCode` return the record; at `t + 10` all three return `undefined`.
- `expiresIn` of `0` and `-5` read as absent at once; `undefined` never expires (advance the clock far);
  `NaN`, `Infinity` and `'60'` reject with a `TypeError` and store nothing.
- Consume: `find` then carries `consumed` equal to the clock's value at the first consume; a second
  consume later does not move it; an upsert after consume keeps the mark and takes the new payload;
  an unconsumed record whose payload is `{ consumed: 'x' }` returns it as stored, and once consumed
  the numeric mark replaces it; consume of an absent id resolves and a later `find` is still `undefined`;
  consuming an expired record does not make it readable.
- `destroy`; `revokeByGrantId` removes every record with that grant id and leaves other grants' records.
- Model isolation in every operation: the same id in two models (find, consume, destroy);
  the same `uid` in two models; the same `grantId` in two models where a revoke in one leaves the other.
- Exact matching: with ids `abc` and `a%`, operations on `a%` and `a_c` do not touch `abc`; same for
  `revokeByGrantId('g%')` against grant `g1`.
- Payload fidelity: nested objects, arrays, unicode, and an own `__proto__` member built with
  `JSON.parse('{"__proto__":{"polluted":true},"a":1}')` come back equal, and `({}).polluted` stays `undefined`.
- Non-string `uid` / `grantId` / `userCode` in a payload (a number, an object) are not found by the
  string lookups and do not break the upsert.
- A file-backed store in a temp directory: records and a consume mark survive `close()` and reopen;
  on POSIX the database file is 0600.
- `purgeExpired()` returns the number removed, removes only expired records (a live one, a
  never-expiring one and a consumed live one all survive and still read back).
- The provider as the oracle: build a real `oidc-provider` `Provider` over `store.adapter` (recipe
  below) and prove through its models: a saved `Grant` is found and destroyed; an `AuthorizationCode`
  is found unconsumed, and after `consume()` a fresh `find` returns it with a numeric truthy
  `consumed`; a `RefreshToken` is gone after `RefreshToken.revokeByGrantId(grantId)` while a token of
  another grant remains; a `Session` is found by `findByUid`. (The provider uses the wall clock for
  its own `exp` check; for these cases open the store with the default clock.)

`provider.test.ts` (start `http.createServer(handler).listen(0, '127.0.0.1')`; send requests with
`node:http` `request` so you control the `Host` header; `fetch` cannot set it)
- With an `https:` issuer (use a made-up one such as `https://issuer.example.test`) and with
  `http://localhost:4455`: discovery is 200, `issuer` is exact, every absolute-URL string member
  starts with `issuer + '/'`, `jwks_uri` is one of them.
- The same holds when the request also carries, one at a time and all together:
  `Forwarded: host=evil.example;proto=http`, `X-Forwarded-Host: evil.example`,
  `X-FORWARDED-HOST: evil.example`, `X-Forwarded-Proto: http`, `X-Forwarded-Port: 1`,
  `X-Original-URL: http://evil.example/`, `X-Rewrite-URL: /jwks`. No response body or header value
  contains `evil.example`.
- Wrong Host → 421: `evil.example`, the issuer's host with another port, the listening socket's own
  `127.0.0.1:<port>`, and (through a raw `node:net` socket) an HTTP/1.0 request with no Host. The
  issuer's host in upper case is accepted.
- An absolute-form target through a raw socket
  (`GET http://evil.example/.well-known/openid-configuration HTTP/1.1` with the right Host) → 400.
- The key set: for two keys from `generateSigningKey()`, `/jwks` has exactly two entries in order,
  each with exactly the seven public members and the right values; the response text contains
  neither key's `d`; a signature made with `keys[0]`'s private JWK verifies with the published entry
  (`createPublicKey({ key: entry, format: 'jwk' })`).
- `id_token_signing_alg_values_supported` equals `['ES256']`; `response_types_supported` equals
  `['code']`; `grant_types_supported` has no `implicit`.
- `GET /interaction/abc` and `GET /session/end` are 404.
- The anonymous-request list in the contract: wrap the adapter factory so every `upsert` is counted;
  after all eight requests the count is 0 and no response had a `set-cookie` header.
- The error page: status 400, content type `text/plain`, and the body has no `http://`/`https://`
  URL that does not start with the issuer.

`server.test.ts`
- In process: `startServer({ MR_ACCOUNT_PROFILE: 'local-dev', MR_ACCOUNT_DATA_DIR: <fresh temp dir path that does not exist yet>, MR_ACCOUNT_PORT: '0' }, lines.push)`
  resolves; `url` is `http://127.0.0.1:<nonzero port>`; discovery fetched from `url` with
  `Host: localhost:4455` names `http://localhost:4455`; the one log line has the documented shape
  and its `kids=` equals the `kid`s `/jwks` serves; `close()` resolves and the port then refuses
  connections. Always `close()` in `finally`/`afterEach`.
- Second start on the same data directory serves the same `kid`, `x`, `y`; the key file's bytes are
  unchanged between the starts.
- On POSIX after a start: the data directory is 0700, `keys.json` and `account.sqlite` have no group
  or other bits, and neither does any other file in the directory.
- Refusals in process, each rejecting with a `ConfigError` naming the setting and leaving the data
  directory absent: production with `MR_ACCOUNT_SIGN_IN=dev-password`; production with an `http:`
  issuer; local-dev with `MR_STEAM_PUBLISHER_KEY`; hosted-dev with a data directory that has no key
  file (`setting === 'MR_ACCOUNT_KEY_FILE'`); production with valid settings
  (`setting === 'MR_ACCOUNT_PROFILE'`: no external signer).
- At process level: `spawn(process.execPath, ['src/server.ts'], { cwd: <account-service dir>, env })`
  with a production env carrying a dev-only setting exits with code 1, stderr contains
  `account-service: refusing to start` and the setting's name, stdout has no `listening=`, and the
  data directory was not created.
- The recipe: `spawn('just', ['--no-deps', 'account-dev'], { cwd: <repo root>, env })` with
  `MR_ACCOUNT_DATA_DIR` a fresh temp path and `MR_ACCOUNT_PORT=0`: wait for the `listening=` line on
  stdout, read the port from it, fetch discovery and `/jwks` with `Host: localhost:4455`, send
  SIGTERM to the child and wait for it to exit (do not assert its code). Start it a second time on
  the same directory: the same `kid`, `x`, `y`. Give every child an explicit env (`PATH` and `HOME`
  from `process.env`, plus the settings); never spread `process.env` into it, so a developer's own
  `MR_*` variables cannot change the result. Kill any child still alive in `afterEach`.

## Facts you need (measured; you cannot run anything)

- Tests run with vitest 4 (`import { afterEach, describe, expect, test } from 'vitest'`), environment
  `node`, 30 s timeout. `tsc --noEmit` typechecks the tests too: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `verbatimModuleSyntax` (use `import type` for types), `erasableSyntaxOnly`
  (no `enum`, no `namespace`, no constructor parameter properties). Biome lints them: single quotes,
  semicolons, 2 spaces, width 100, `node:` import protocol, no `any`, no unused variables; `!` is
  allowed in `*.test.ts`. I format with the pinned biome after you finish; anything beyond formatting
  comes back to you.
- Never write key material or a long random-looking string literal in a test: the repository's secret
  scanner reads every commit. Generate keys at run time. A fake secret starts with `INTERNAL_SECRET_`.
- Temp directories: `mkdtempSync(join(tmpdir(), 'acs1-'))`, removed in `afterEach` with
  `rmSync(dir, { recursive: true, force: true })`.
- A provider for the oracle cases (this exact shape runs):

```ts
import { generateKeyPairSync } from 'node:crypto';
import Provider from 'oidc-provider';

const jwk = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ format: 'jwk' });
const provider = new Provider('http://localhost:4455', {
  adapter: store.adapter,
  jwks: { keys: [jwk] },
  clients: [{
    client_id: 'game',
    redirect_uris: ['http://localhost:5173/cb'],
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    id_token_signed_response_alg: 'ES256',
  }],
  features: { devInteractions: { enabled: false } },
});
const client = await provider.Client.find('game');
const grant = new provider.Grant({ accountId: 'acct-1', clientId: 'game' });
grant.addOIDCScope('openid offline_access');
const grantId = await grant.save();
const code = new provider.AuthorizationCode({
  accountId: 'acct-1', client, grantId, scope: 'openid offline_access',
  redirectUri: 'http://localhost:5173/cb',
});
const codeValue = await code.save();
const found = await provider.AuthorizationCode.find(codeValue);   // found.consumed === undefined
await found.consume();
(await provider.AuthorizationCode.find(codeValue)).consumed;      // a number > 0
const rt = new provider.RefreshToken({ accountId: 'acct-1', client, grantId, scope: 'openid offline_access' });
const rtValue = await rt.save();
await provider.RefreshToken.revokeByGrantId(grantId);
await provider.RefreshToken.find(rtValue);                         // undefined
const session = new provider.Session({ accountId: 'acct-1' });
await session.save(3600);
await provider.Session.findByUid(session.uid);                     // the session
await (await provider.Grant.find(grantId)).destroy();
```

  The library prints `oidc-provider WARNING/NOTICE` lines on stderr; ignore them. Types come from
  `@types/oidc-provider` (`Adapter`, `AdapterPayload`, `Configuration`); where a model constructor's
  typing is narrower than the recipe, narrow with a typed local, not `any`.
- A raw request: `net.connect(port, '127.0.0.1')`, write the request text with `\r\n` line ends and
  `Connection: close`, collect until `end`, read the status from the first line.
- `http.request({ host: '127.0.0.1', port, path, method, headers: { host: 'localhost:4455' } })`
  sends exactly that Host header.

## What you return

1. The five files, written.
2. **Findings**, apart from the tests: each a **defect** in the contract (something that cannot be
   tested as stated, or that you believe is wrong for security) or a **question**. Do not resolve a
   doubt by weakening a test; report it.
3. For each test file, one line: how many tests, and which contract sentence each group covers.
