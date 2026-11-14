# Spec: M-local-play — single-player worlds and friends hosting

**Status:** groundwork elaborated 2026-11-14 (PLAN §9 item 2: LP0, LP1, LP10 as slices `lpg-0`,
`lpg-1`, `lpg-10`; heads `lpg-0` ‖ `lpg-1`, then `lpg-10`) against game master `0e7a089d`;
**LP2–LP9 are an unelaborated sketch** (2026-11-12), elaborated with `milestone-loop-prompt.md` when
PLAN §9 item 9 is reached · **Project:** monster-realm (client shell, packaging, server-module
access rules, auth) · **Design SSOT:** `game-design.md` §14 · **Target:** the early-access release.

Slice ids use the `lpg-` prefix: `lp-` names the harness loop-infrastructure slices.

## Problem / intent

Early access is the Steam build: a player installs the game, plays a single-player world on a server
the game starts for them, and can open that world to friends or join a friend's. Everything built so
far assumes one server that we operate and a browser client pointed at it. This milestone makes the
same module and the same client run as a local and a privately hosted game, without forking either.

The groundwork (LP0, LP1, LP10) runs ahead of the rest because it is small, unblocks everything
else here, and LP1 and LP10 are true of the official server too: the client learns where to connect
when it starts, not when it is built, and a client connected to a world we do not operate sends
nothing to our observability stack and no account token to its host.

## Scope

**In (the groundwork, three slices):**

- `lpg-0` (LP0) — the `type: design` feasibility record: the licence state, the desktop shell, the
  sign-in design's questions, and the measured footprint of a one-player world and an eight-player
  host, from which the budgets later slices hold are set.
- `lpg-1` (LP1) — the connection target is run-time configuration: a shell document the page
  receives before the client module runs names the server address, the database and the kind of
  server; no build-time server address remains in shared client code.
- `lpg-10` (LP10) — client telemetry is on only when the connection target is the official server
  or a development/test server, and a single-player (`local`) or friends (`private`) target is
  never offered an account token.

**Named deferrals (declared, not dropped):**

| Deferred | Target | Why |
|---|---|---|
| A player opt-in that turns telemetry on in a `local` or `private` world | LP3 (world settings) | It needs a settings surface and a stored choice per world; until then the rule is simply off |
| The bundled and standalone server sending nothing to our stack (server-side half of LP10) | LP2 (bundled server) and LP7 (standalone package) | Our stack only receives what we configure it to scrape; whether the SpacetimeDB host itself sends anything off the machine is measured by `lpg-0` (lpg-0.6) and held by the packaging slices |
| Account sign-in toward a `local` or `private` world | LP4 / LP6 | Today's account token is the account issuer's id_token, addressed to the build-wide client id; a host that received it could replay it. `lpg-10` withholds it until the attestation design (Sign-in design) is built |
| OIDC issuer, client id and redirect as run-time configuration | LP4 / LP6 | A world that is its own issuer changes what those values mean; they stay build-time until that design is verified |
| A transport rule for plaintext `ws:` to a non-loopback host | LP5 / LP6 | `lpg-1` keeps today's acceptance (any `ws:`/`wss:` URL); who may serve plaintext is an access-design question |
| A stable world address across launches (a fixed port or a world key independent of the port) | LP2 / LP3 | The reconnect token is keyed by the exact `uri` and `db` strings; a local server on a new port each launch would orphan the player's identity |
| A friends-server footprint under battles and trades, not walking alone | LP5 | `mr_load_driver` drives movement only; `lpg-0` states its numbers as a walking-only floor |
| The opening notice that a host can read a joiner's data | LP6 | Part of private-server access (decision-defaulted below) |
| Desktop shell, worlds, offline sign-in, friends, private access, standalone package, unattended upgrade, solo audit | LP2–LP9 (sketch below) | Elaborated when PLAN §9 item 9 is reached, against `lpg-0`'s record |

## Current code this builds on (verified at game master `0e7a089d`)

- **The build-time server address.** `client/src/shell/config.ts` resolves `URI`/`DB` at module
  scope from `import.meta.env.VITE_STDB_URI` / `VITE_STDB_DB` through the pure
  `resolveConnectionConfig(env, isDev)` in `client/src/net/connectionConfig.ts`, whose dev defaults
  are `ws://127.0.0.1:3000` / `monster-realm`; an empty `uri` falls back to the localhost default
  in every build, and a production build with an empty or dev-default database throws at import
  (kept at module scope so no `try` in `main()` can swallow it). `main.ts` reads `URI`/`DB` for
  `connect({ uri, db, … })` and as the claim-code key (`claimCode.clear` /
  `hasSeenFirstRunNudge` / `markFirstRunNudgeSeen`).
- **Credentials keyed per target.** `net/authToken.ts` stores the reconnect token under
  `storageKey(uri, db)`; `net/claimCode.ts` and the OIDC flow state key by the same pair, each
  through `encodeURIComponent`, so a token minted for one spelling of a target is never offered to
  another. The OIDC id_token is not keyed: `connection.ts` hands whichever target is configured the
  id_token the issuer returned (`aud` = the build-wide client id). No issuer is deployed
  (`server-module/src/accounts.rs` `ALLOWED_ISSUERS` is the `.invalid` placeholder), so no account
  can exist yet.
- **Where the env names are set.** `.github/workflows/ci.yml` (e2e job) and `nightly.yml` set
  `VITE_STDB_URI`/`VITE_STDB_DB`; the `justfile` sets only `VITE_STDB_DB` per e2e shard
  (`e2e-shards`), for `client-verify-build` and in `playtest-up`'s build subshell (its `vite
  preview` runs without it); 13 spec/helper files under `client/e2e/` and `global-setup.ts` read
  `process.env.VITE_STDB_DB` on the Node side to call the database. The Playwright `webServer` runs
  `npm run dev` (vite dev) with the inherited env.
- **The production-bundle check.** `scripts/verify-build-hooks.mjs` (`just client-verify-build`, in
  `just ci` and the CI `client` job) fails a bundle carrying DEV hooks and, via `bundleBakesDb`, one
  that does not bake `db:"<MR_PLAYTEST_DB>"`; `scripts/verify-build-hooks.test.mjs` tests it under
  `node --test` (the `door "scripts node suites"` floor in the `justfile`).
- **`index.html`'s scripts are pinned.** `client/src/indexShell.smoke.test.ts` asserts exactly one
  `<script>`, of `type="module"`, with no inline text. The boot mounters drop direct `<body>`
  `SCRIPT` children.
- **The telemetry bootstrap.** `main.ts` resolves `TELEMETRY_CONFIG` at module scope with
  `resolveTelemetryConfig({ endpoint: VITE_MR_OTLP_ENDPOINT, intervalMs: VITE_MR_OTLP_INTERVAL_MS },
  import.meta.env.DEV, Math.random())` (`client/src/observability/config.ts`, a pure total resolver
  returning `disabled | enabled`), then `main()` calls `startClientTelemetry(TELEMETRY_CONFIG, {
  loadSdk: loadOtelSdk, … })` (`observability/telemetry.ts`), whose disabled path never calls the
  loader. Unset endpoint ⇒ off, so dev and CI builds run without telemetry today; a build that sets
  the endpoint sends from every connection, whatever server it joined.
  `docs/refactors/client-shell.md` keeps "the telemetry config" in `main.ts`'s boot prelude, and its
  rule 7 forbids `net/` and `observability/` from importing `shell/`.
- **Other off-machine paths.** None in the client besides the SDK connection, the OTLP exporter
  (loaded only through the loader) and the OIDC flow (no other `fetch`/`sendBeacon`/`WebSocket` in
  `client/src`). The F9 bug bundle is a player-initiated local download; `playtest_event` is a
  private table in the world's own database.
- **A failed connect** reaches the player as `onConnectError` → `opts.onError('connect')`
  (`net/connection.ts`) → `reportError('connect-failure')` in `main.ts` → the feedback hint row
  (`ui/feedbackPolicy.ts`); the session overlay has no connect-failure kind.
- **Load tooling.** `sim-harness` ships `mr_load_driver` (N anonymous WebSocket clients walking at a
  fixed intent rate against `--server`/`--db`), which `lpg-0` uses for its measurements.

## Design (groundwork)

### The shell document (lpg-1)

One JSON-shaped document, supplied by whatever hosts the client, read once at start-up. Its module
lives under `net/` so `shell/config.ts` and `observability/config.ts` both import it downward
(client-shell rule 7):

```ts
// client/src/net/shellDocument.ts
export const SHELL_CONFIG_GLOBAL = '__MR_SHELL_CONFIG__';   // own property of globalThis
export const SHELL_CONFIG_SCRIPT = 'shell-config.js';      // served beside index.html
export const TARGET_KINDS = ['official', 'test', 'local', 'private'] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
export interface ShellDocument {
  readonly connection: { readonly uri: string; readonly db: string; readonly kind?: TargetKind };
}
/** The global's own value, `undefined` when absent. Never swallows: a throwing getter throws. */
export function readShellDocument(host: object): unknown;
/** `globalThis.__MR_SHELL_CONFIG__=<JSON>;` with `<`, U+2028 and U+2029 escaped; nothing else. */
export function renderShellConfigScript(doc: ShellDocument): string;

// client/src/net/connectionConfig.ts
export interface ResolvedConnection { readonly uri: string; readonly db: string; readonly kind: TargetKind }
export function resolveConnectionConfig(doc: unknown, isDev: boolean): ResolvedConnection; // throws on reject
```

- **Delivery is a page global set before the module runs**, never a fetch: `client/index.html`
  loads `<script vite-ignore src="/shell-config.js"></script>` as a direct `<body>` child immediately
  before its module script (classic scripts run before module scripts; `vite-ignore` keeps Vite 6
  from warning that it cannot bundle a classic script). Never `type="module"` (Vite would bundle it,
  fixing the document at build time) and never a `client/public/shell-config.js` (it would ship in
  every build). A browser host serves the file; a desktop shell sets the same global from its own
  pre-page hook (named by `lpg-0`). The read is synchronous, so `shell/config.ts` keeps resolving
  at module scope with the fail-loud throw at import. The 36 boot suites that import `main.ts` see
  no document (nothing sets the global; the mounters drop body scripts) and take the development
  defaults.
- **Resolution (reject, never clamp).**
  - *Absent* (`undefined`): a development build takes `ws://127.0.0.1:3000`, `monster-realm`, kind
    `test`; a production build throws.
  - *Present*: it must be an object holding exactly the key `connection`, itself an object holding
    `uri` and `db` and optionally `kind`, each read as an own property, and no other key. `uri` is an
    absolute `ws:`/`wss:` URL with no userinfo, query or fragment (a path is allowed); `db` matches
    `[A-Za-z0-9_-]+` (the charset `client/e2e/global-setup.ts` already enforces); `kind` is one of
    `TARGET_KINDS`. Anything else — `null`, an array, a missing or empty `uri` or `db`, an unknown
    key, a wrong type — throws in development and production alike. A production `db` equal to the
    dev default in any letter case throws, as today. A missing `kind` is `test` in a development
    build and `private` in production, so a host that never thought about telemetry sends none.
  - The returned `uri` and `db` are the document's strings, trimmed and otherwise unchanged (no
    normalization), so a target spelled as the old build spelled it keeps its stored reconnect
    token and claim code.
- **`kind` is what the host says the server is:** `official` (ours, public), `test` (any server we
  run for development, CI or playtests), `local` (a single-player world the game started),
  `private` (a friends server). The page's host already controls the client code it serves, so the
  claim is trusted exactly as far as that code is. `shell/config.ts` exports `TARGET_KIND` beside
  `URI` and `DB`.
- **Tooling keeps the env names.** `VITE_STDB_URI`/`VITE_STDB_DB` stop being read by client code and
  become inputs of a plugin in `vite.config.ts`. In `vite dev` it answers `/shell-config.js`
  (`Content-Type: text/javascript`, `Cache-Control: no-store`) with `uri` = `VITE_STDB_URI` trimmed,
  or `ws://127.0.0.1:3000` when unset or blank, `db` = `VITE_STDB_DB` trimmed, or `monster-realm`,
  and kind `test`. On `vite build` it writes `dist/shell-config.js` the same way only when
  `VITE_STDB_DB` is set and non-blank (the playtest and `client-verify-build` builds); otherwise the
  build ships no document and its host supplies one. `vite preview` gets no hook: it serves the
  built `dist/shell-config.js` as a static file. The e2e shards, CI and `just` recipes keep working
  unedited.
- **The bundle check follows.** `verify-build-hooks.mjs` reads `dist/shell-config.js` by running it
  in a `node:vm` context and reading `__MR_SHELL_CONFIG__` (the global's name is repeated there:
  the script runs under plain Node and cannot import client TypeScript), checks it names
  `MR_PLAYTEST_DB`, and fails a build whose other `.js` files contain that database name — the
  regression gate for an address baked back into the bundle (the start-up error's example text
  therefore names no real database).

### Target-kind gates (lpg-10)

- **Telemetry is an allow-list.** `resolveTelemetryConfig(env, isDev, jitter, kind)` takes a
  required `kind`; an exhaustive `switch` over `TargetKind` lets only `official` and `test` reach
  the endpoint checks, and every other kind returns `disabled` with a reason naming it, so a kind
  added later stays off until someone classifies it. For `official` and `test` the result is what
  it is today. The OTLP endpoint stays a build value (our ingest, the same for every build); the
  run-time decision is whether to use it.
- **No account token toward a world we do not operate.** For kind `local` or `private`, `main.ts`
  passes an empty `authIssuer` and `authClientId` to `connect`, the configuration under which the
  OIDC flow contacts no network and supplies no account token (AUTH-44). Players there play under
  the anonymous reconnect token keyed to that target. LP4/LP6 replace this with the attestation
  design.
- `main.ts` passes `TARGET_KIND` (from `shell/config.ts`) to both. Nothing else in the client sends
  data off the machine (above), so these are the gates.

### Considered and rejected

- **Fetching `shell-config.json` at start-up:** an asynchronous read moves the fail-loud throw out of
  module scope and makes all 36 `main.ts` boot suites issue an HTTP request at import.
- **Deriving the target from the page URL (`location`):** a desktop shell's page origin is the
  shell's, not the server's, so the browser and desktop builds would diverge.
- **Telemetry on only for a build-declared official host:** that reintroduces a build-time server
  address in shared client code, which LP1 removes.
- **Moving the telemetry endpoint into the shell document instead of adding `kind`:** a friends host
  copying our document would carry it; `kind` also serves LP3/LP5/LP6, which need to know what kind
  of world the client joined.
- **Normalizing `uri` (case, trailing slash, default port):** every existing reconnect key is the raw
  trimmed string, so normalizing would orphan identities whose spelling it changes.
- **Renaming `VITE_STDB_*` now:** 14 e2e files, two workflows and three recipes for no behaviour.

## Decisions the operator owns (defaults recorded; each reversible)

Each default below stands unless the operator overrules it; none blocks the groundwork, and no
`mr-ask-drew` is raised (the groundwork needs no irreversible or security choice: the one security
call it makes, withholding account tokens from `local`/`private` targets, only narrows today's
behaviour).

- `decision-defaulted:local-play-budgets=set-from-lpg-0-measurements` — resource budgets for a
  single-player world and a friends server are set from `lpg-0`'s measurements of one player on a
  modest-machine profile and eight players on one host.
- `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new` — when the identity
  provider cannot be reached, a private server accepts players it has already seen and refuses new
  ones (consumed by LP6).
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by LP6).

Elaboration defaults (the loop's calls, flagged so the operator can object):

- `decision-defaulted:shell-document-delivery=page-global-before-module` — over a fetched JSON file.
- `decision-defaulted:telemetry-gate=target-kind-allow-list` — on for `official`/`test` only; off for
  a production document that omits `kind`; the endpoint stays a build value.
- `decision-defaulted:account-sign-in-on-local-private=withheld-until-LP6` — no account token is
  offered to a `local` or `private` target.
- `decision-defaulted:telemetry-opt-in=deferred-to-LP3` — no opt-in in the groundwork.

## Cross-slice contracts (each with its post-merge proof)

| Contract | Producer → consumer | Post-merge proof |
|---|---|---|
| The chosen desktop shell's hook that sets a page global before the client's module script runs | `lpg-0` → LP2 | `lpg-0`'s `docs/DECISIONS.md` entry names it; LP2's first slice sets `__MR_SHELL_CONFIG__` through it |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for one-player and eight-player hosts | `lpg-0` → LP2, LP3, LP5, LP7 | `docs/local-play.md` in the game repo; each consuming slice's EARS cite a number from it |
| The shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, the resolution rules | `lpg-1` → `lpg-10`, LP2, LP3, LP5 | `shellDocument.test.ts` round trip and `connectionConfig.test.ts`; `client/e2e/shell-config.spec.ts` |
| `TargetKind` / `TARGET_KINDS` (`net/shellDocument.ts`) and `TARGET_KIND` (`shell/config.ts`) | `lpg-1` → `lpg-10` | `observability/config.test.ts` iterates `TARGET_KINDS`; `main.targetKindGate.test.ts` boots the real `main.ts` |
| A `local`/`private` target gets no telemetry and no account token | `lpg-10` → LP2, LP3, LP4, LP6 | `main.targetKindGate.test.ts`; LP3's opt-in and LP6's attestation are the only paths that may change it |

## Post-integration verification (the integrated whole, after `lpg-10`)

- Full `just ci` green on `master`, including `client-verify-build` (the document names the playtest
  database; no other bundle file does); no `just gen` diff (`bindings-drift` 0; the groundwork
  changes no schema).
- `just e2e` green in its sharded form: every shard reaches its own database through the document
  the dev server serves, and `shell-config.spec.ts` shows a different document sends the client
  elsewhere.
- A production build made with no `VITE_STDB_*` set carries no server address in its JavaScript
  other than the development-default constants of `connectionConfig.ts`, and throws at start-up
  until a `shell-config.js` is supplied; `just playtest-up` (which writes one naming the playtest
  database) joins it. Run once by hand on `master` and recorded in `lpg-10`'s PR (`not-verified:`
  if it could not be run).
- Booted with `VITE_MR_OTLP_ENDPOINT` set: kind `official` or `test` calls the telemetry loader;
  kind `local` or `private` never does and passes `connect` no OIDC issuer.
- `lpg-0`'s budgets are cited by number in the LP2/LP3/LP5/LP7 sections when they are elaborated.

## Risks / flags

- **Licence (operator-owned, open).** Packaging (LP2, LP7) waits on the terms the operator is
  negotiating with the licensor; `lpg-0` records the state and decides nothing. Lifting event: the
  operator records the negotiated terms (or that none are needed). Fallback if the terms do not
  allow bundling: the desktop shell connects to a server the player installs separately (the LP7
  package), which changes LP2's scope but not LP1's contract.
- **A host can claim `official` or `test`.** A friends host serving the browser build can set either
  and so send its players' client metrics to our ingest. The metrics carry no account identity (the
  resource is `service.name` only), though the ingest sees the client's address, timing, build sha
  and device class; the host already controls the code it serves. Accepted, not mitigated.
- **Identity continuity at cutover.** The reconnect key is the raw `(uri, db)` pair, so a host whose
  document spells the target differently from the build it replaces (case, trailing slash, port)
  gives every returning anonymous player a new identity. No official server runs yet; the playtest
  recipes write the same strings the old builds baked. Each deployment's document is checked
  against the previous spelling.
- **`main.ts` and `main.*.test.ts` are shared with `st-7`.** `lpg-1` edits
  `client/src/main.claimCode.test.ts` and `client/src/main.a11yFocus.test.ts` (a comment);
  `lpg-10` edits `main.ts` and adds `client/src/main.targetKindGate.test.ts`. All fall inside
  `st-7`'s `client/src/main.*.test.ts` glob, so `mr-disjoint` serializes each with `st-7`.
- **Docs reopened.** `docs/DECISIONS.md` is written by all three slices and `ARCHITECTURE.md` by
  `lpg-1` and `lpg-10`; `mr-disjoint` treats both as the merge-reconciled doc set, so `lpg-0` and
  `lpg-1` may run side by side. Code and test files are pairwise disjoint.
- **Modest-machine profile.** The measuring machine is a 32-core workstation; `lpg-0` constrains the
  server process (CPU set and memory limit, recorded) to stand in for a modest laptop and states
  that clock speed and disk speed are not modelled. One run on real low-end hardware, when one is
  available, replaces the profile.

## Unelaborated sketch — LP2 to LP9 (2026-11-12; NOT buildable, no slice ids)

Elaborate with `milestone-loop-prompt.md` when PLAN §9 item 9 is reached, against the current game
repo and `lpg-0`'s record (`docs/local-play.md`). Nothing below is a slice yet.

- **LP2 Desktop shell.** A shell that hosts the existing web client unchanged, starts and stops the
  bundled server, and owns only shell concerns (window, local server lifecycle, sign-in hand-off,
  save location). It supplies the shell document (`lpg-1`) for each world it opens, at an address
  that stays the same across launches. The browser build stays a full client for every way to
  play. Waits on the licence terms (`lpg-0.1`).
- **LP3 Worlds.** Create, list, open and delete single-player worlds; each world is one database with
  its own save directory. Publishing the module into a new world and upgrading an existing one happen
  without the player seeing a tool. Owns the telemetry opt-in deferred from `lpg-10`.
- **LP4 Sign in once, then offline.** A world is bound to the account at creation; later sessions
  start with no connection. The auth seam stays pluggable per build (the browser build, the dev
  build and the Steam build each supply their own protocol).
- **LP5 Open to friends.** A running single-player world accepts other players and can be closed
  again; joiners get their own characters in that world. Joining is by address or invite link.
- **LP6 Private-server access.** A private server confirms each joiner holds a valid account with the
  identity provider, then applies the host's rule: allowlist, password, or open. A token a private
  host receives must be useless against the official server; prove that with a test before a private
  server ever sees a real account token. Design in "Sign-in design" below.
- **LP7 Standalone server package.** The server runs by itself for an always-on host, installed
  outside the Steam store, with the same access rule and a documented way to back up and upgrade.
  Waits on the licence terms (`lpg-0.1`).
- **LP8 Unattended upgrade.** A world saved by an older build opens in a newer one: schema and
  content migration run without an operator, and a client refuses a server it cannot speak to with a
  message that says which side to update.
- **LP9 Alone is complete.** Audit content against the solo rule in `game-design.md` §14 (nothing
  needed to progress or complete the collection requires another player) and fix or list each
  exception. Multiplayer-only screens show a clear empty state in a one-player world.

## Sign-in design (proposed 2026-11-12; `lpg-0.3` verifies it against SpacetimeDB's auth, the operator is open to alternatives)

The protocol stays **OpenID Connect** — OAuth 2.0 authorization code with PKCE, tokens as signed
JWTs. It is what SpacetimeDB consumes (an identity is derived from a token's issuer and subject) and
what the account issuer already speaks. SAML is not a fit: it is browser-redirect XML for workplace
single sign-on, SpacetimeDB does not accept it, and it has no good desktop or offline flow.

The isolation comes from **who issues the token a server accepts**, not from a new protocol:

- **Official server:** accepts only tokens from the account issuer, addressed to it (`aud`), as today.
- **Private server and single-player world:** each world's server is its own issuer. To join, the
  client asks the account issuer for a short-lived **attestation** — "this account is valid" —
  addressed to that one server and bound to a nonce the server chose. The server checks it, applies
  the host's access rule, and then issues its **own** token for that world. The player's identity in
  that world is derived from the world's issuer, so it is a different identity from the official
  one by construction, and nothing the host ever holds is a login anywhere else.
- **Offline single-player** falls out of the same shape: the attestation is needed once, when the
  world is bound to the account; afterwards the local server issues its own tokens with no
  connection.
- The attestation is signed under an issuer name the official server does not trust, so even a
  server that ignores `aud` cannot be fooled by a replayed one. `aud` and the nonce are the second
  and third locks.

Fallback if a world cannot be its own issuer: audience-scoped tokens from the account issuer, with
the official server rejecting any other audience.

## Notes

- Private worlds run the official rules until `M-modding`; a host controls only who may join.
- **Idle rule (operator, 2026-11-12):** a zone with no player in it does not update, or updates as
  little as possible. Built (game #745, #750, #751): with nobody connected a world runs one
  write-free heartbeat call a minute and writes nothing to disk, and a player who returns appears
  on the tile they left. `lpg-0.4` measures what is left.
- Costs that matter more on a player's machine than on ours, found on 2026-11-12: commit-log growth
  (the log grows ~6 MB per hour of one player walking and is not compacted), `battle_summary` never
  reaped (`M-scale-readiness` SR7), the device-resolution terrain bake (SR8).
- The privacy model (private tables behind owner-scoped views) still keeps one player's data from
  another player's client in every world. It does not keep it from the host, who owns the database.
- `M21b-3 Steam login` (PLAN §9 item 16) is the Steam build's sign-in protocol and is consumed here.
- **Tester A/B experiment:** `lpg-1` and `lpg-10` (the tester-bearing groundwork slices) are listed
  in `required_slices` of `memory/projects/mr-tester-ab.config.json`; `lpg-0` is `type: design` and
  has no tester.

## Slices

Order: `lpg-0` ‖ `lpg-1`, then `lpg-10` after `lpg-1`. `lpg-1` does not wait on `lpg-0`: the
browser path needs no shell choice, and the desktop hook is LP2's to use. `lpg-10` reads the kind
`lpg-1` produces. No slice changes a structural surface (schema, bindings, lockfiles).

### lpg-0 — feasibility: licence state, desktop shell, sign-in questions, one-player footprint
type: design · tier: hard
category: local-play/feasibility · severity: HIGH · size: MODERATE
touches: docs/DECISIONS.md, docs/local-play.md
after: []

Changes no code: no tester, no red run, `moved-tests: none`. `docs/local-play.md` (new) is the
record later slices read: the licence facts, the shell choice and its pre-page hook, the sign-in
answers, the measurement method (commands, machine, constraints, durations, run count) with raw
numbers, and the budget table. `docs/DECISIONS.md` gets one entry for the shell choice and what it
rules out and one for the budgets. Measurements run against the SpacetimeDB host version the game
pins (2.8.1 standalone at this writing) with the module built from `master`, `mr_load_driver` for
load and the Playwright client for start-up; scratch files stay in a sandbox outside the repo. A
`judge` scores at least two shell alternatives (candidates: Tauri 2, Electron; a native launcher
that opens the system browser may be the third) on: hosts the unchanged web build, sets a page
global before module scripts, starts and stops a child server process, installer and memory size,
Steamworks/overlay integration, licence, signing and update.

- **lpg-0.1:** THE record SHALL state the licence facts as known at the slice's date — Business
  Source License 1.1 read at 2.16.0 on 2026-11-12 against the 2.8.1 host the game pins, the
  one-production-instance grant, the "Database Service" clause and mod-added tables, the conversion
  to AGPL v3 with a linking exception on 2031-11-10, and the operator's negotiation with the
  licensor since 2026-11-12 — and SHALL mark LP2 and LP7 as waiting on the negotiated terms without
  adopting any reading of the licence.

- **lpg-0.2:** THE record SHALL name the chosen desktop shell with the judge's scores over at least
  two alternatives, and the `docs/DECISIONS.md` entry SHALL state what the choice rules out and the
  shell's hook that sets `__MR_SHELL_CONFIG__` before the page's module script runs.

- **lpg-0.3:** FOR each sign-in question — which token claims a module can read at connect, whether
  a standalone server can sign with its own key per world, whether an account issuer can mint an
  attestation as a second token type, and how a world's server verifies an attestation (as the
  connection token or as a reducer argument) — THE record SHALL give an answer at the pinned
  SpacetimeDB version citing the documentation or source it rests on, or SHALL record it open with
  what would answer it; and THE record SHALL answer, for both the own-issuer design and the
  audience-scoped fallback, whether a token a private host receives can be replayed to the
  official server, and SHALL name the design LP4 and LP6 elaborate against.

- **lpg-0.4:** THE record SHALL report, for one player on the stated modest-machine profile and as
  the median and range of three runs each, the host's resident memory and CPU with nobody connected
  over at least 60 minutes and with one idle and one walking player over at least 30 minutes, the
  time from server process start to the client's first frame with its own character drawn, and the
  commit-log growth per hour for the walking and the empty-world runs.

- **lpg-0.5:** THE record SHALL report the same host memory, CPU and commit-log growth for eight
  `mr_load_driver` clients walking on one host over at least 30 minutes, stated as a walking-only
  floor.

- **lpg-0.6:** THE record SHALL state whether the SpacetimeDB standalone host attempts any connection
  off the machine across start-up and a run of at least 60 minutes, observed by a method that sees
  every attempt over the whole run (a packet capture, or a network namespace with no route plus the
  host's own log), not a point-in-time socket listing.

- **lpg-0.7:** THE record and its `docs/DECISIONS.md` entry SHALL set absolute budgets for a
  single-player world and a friends server — memory, idle CPU, start-up to playable and disk growth
  per hour — each derived from a reported median with its headroom stated and at most twice that
  median unless the entry gives the reason.

### lpg-1 — the connection target is run-time configuration
type: feature · tier: hard
category: local-play/connection · severity: HIGH · size: MODERATE
touches: client/src/net/shellDocument.ts, client/src/net/shellDocument.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/shell/config.ts, client/src/shell/config.test.ts, client/src/main.claimCode.test.ts, client/index.html, client/src/indexShell.smoke.test.ts, client/vite.config.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, justfile, client/e2e/shell-config.spec.ts, client/src/ui/boxView.test.ts, client/src/net/credentialDecision.ts, client/src/main.a11yFocus.test.ts, projects/monster-realm/.claude/skills/spacetimedb-client/SKILL.md, README.md, docs/runbooks/playtest-ops.md, ARCHITECTURE.md, docs/DECISIONS.md
after: []

Builds "The shell document" above. `net/shellDocument.ts` (new) owns the global's name, the
script's name, `TARGET_KINDS`/`TargetKind`, `readShellDocument` and `renderShellConfigScript`;
`connectionConfig.ts` keeps the one resolver, now over the document; `shell/config.ts` reads the
document at module scope and exports `URI`, `DB` and `TARGET_KIND`. `vite.config.ts` gains the
dev-serve and build-emit plugin (no preview hook); `verify-build-hooks.mjs` replaces
`bundleBakesDb` with the `dist/shell-config.js` and bundle checks, and its tests are replaced at
least one for one so the `justfile`'s `door "scripts node suites"` floor holds. The `justfile`
changes only comments (the `db :=` comment, `client-verify-build`, `playtest-up`); their env lines
already produce the document. `main.ts` is unchanged (its `URI`/`DB` imports keep their names).

Pins and dispositions: `indexShell.smoke.test.ts` pins one module script — re-pointed to the two
scripts (the classic `/shell-config.js` with no inline body, then the module script), a named
intentional change. `main.claimCode.test.ts` recomputes the target from the env — re-pointed to set
the document. Comments citing `vite.config.ts` line numbers in `ui/boxView.test.ts`,
`net/credentialDecision.ts` and `main.a11yFocus.test.ts` are re-pointed to name `coverage.exclude`
instead of a line. The game repo's `.claude/skills/spacetimedb-client/SKILL.md` line on
`VITE_STDB_*` states the new source. Hidden dependencies checked: no generated bindings; no i18n
string (the start-up throw is a developer error before any UI exists, as today); CI workflow env and
the e2e files that read `VITE_STDB_DB` unchanged (the names stay tooling inputs). The new e2e uses
`client/e2e/stdb.ts`; it adds no helper and closes every context it opens (the suite asserts exact
live populations). A `docs/DECISIONS.md` entry records "the connection target is run-time
configuration".

- **lpg-1.1:** WHEN the page global holds a document whose `connection` names a `uri` and `db`,
  THE client SHALL resolve exactly those strings (trimmed, otherwise unchanged), whatever
  `VITE_STDB_URI`/`VITE_STDB_DB` held at build (`client/src/shell/config.test.ts`, importing
  `shell/config` with those env names stubbed to other values).

- **lpg-1.2:** WHEN a production client starts with no document, or with one whose `db` is the dev
  default in any letter case, THE import of `shell/config.ts` SHALL throw before `connect` is
  reachable, with a message naming the missing or refused field
  (`client/src/net/connectionConfig.test.ts`, `client/src/shell/config.test.ts`).

- **lpg-1.3:** WHEN a document is present but is `null`, an array or a non-object, lacks
  `connection` or its `uri` or `db`, holds any key other than `connection`, `uri`, `db` and `kind`,
  has a field of the wrong type, a `uri` that is empty or not an absolute `ws:`/`wss:` URL or that
  carries userinfo, a query or a fragment, a `db` outside `[A-Za-z0-9_-]+`, or a `kind` outside
  `TARGET_KINDS`, THE resolver SHALL throw in development and production builds alike and SHALL
  never substitute a default (`client/src/net/connectionConfig.test.ts`, one table row per
  rejection).

- **lpg-1.4:** WHEN a development client starts with no document, THE resolver SHALL return
  `ws://127.0.0.1:3000`, `monster-realm` and kind `test`; WHEN a valid document omits `kind`, THE
  resolver SHALL return `test` in a development build and `private` in a production build
  (`client/src/net/connectionConfig.test.ts`).

- **lpg-1.5:** FOR every valid document, including strings holding quotes, backslashes, `<`,
  `</script>`, U+2028, U+2029 and non-ASCII text, `renderShellConfigScript(doc)` SHALL equal
  `globalThis.__MR_SHELL_CONFIG__=` followed by the document's JSON with `<`, U+2028 and U+2029
  written as `\u` escapes and a final `;`, and evaluating it on a fresh global object and reading
  it back with `readShellDocument` SHALL resolve to the same target
  (`client/src/net/shellDocument.test.ts`, property test).

- **lpg-1.6:** WHEN `verify-build-hooks.mjs` runs over a build directory, IT SHALL fail when
  `shell-config.js` is missing, does not set a readable document, or names a database other than
  `MR_PLAYTEST_DB`, SHALL fail when any other `.js` file there contains that database name, and
  SHALL pass when only `shell-config.js` names it (`scripts/verify-build-hooks.test.mjs`).

- **lpg-1.7:** WHEN the page receives a shell document naming a database that does not exist on the
  suite's server, THE client SHALL report the `connect-failure` error in the feedback hint row and
  `window.__game()` SHALL show no own character in the suite's world, and WHEN it receives the
  document the dev server serves, THE client SHALL join the suite's world
  (`client/e2e/shell-config.spec.ts`, the document replaced through Playwright routing of
  `/shell-config.js`).

- **lpg-1.8:** WHEN `main.ts` boots under a document, `connect` SHALL receive exactly that
  document's `uri` and `db`, and the claim-code and first-run-nudge storage keys it reads and writes
  SHALL be the ones derived from that pair; WHEN it boots again under a second document naming
  another target, no key of the first target SHALL be read or written
  (`client/src/main.claimCode.test.ts`).

### lpg-10 — single-player and friends worlds: no telemetry, no account token
type: feature · tier: hard
category: local-play/privacy · severity: HIGH · size: LIGHT
touches: client/src/observability/config.ts, client/src/observability/config.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: [lpg-1]

Builds "Target-kind gates" above: `resolveTelemetryConfig` gains the required `kind` parameter
(type-only import of `TargetKind` from `net/shellDocument.ts`) and its exhaustive switch;
`main.ts` passes `TARGET_KIND` (from `shell/config.ts`, produced by `lpg-1`) to the module-scope
`TELEMETRY_CONFIG` and, for `local`/`private`, passes `connect` an empty `authIssuer` and
`authClientId`. The privacy and credential surface is the reason for `tier: hard`.
`main.targetKindGate.test.ts` (new) boots the real `main.ts` through
`client/test-util/mainBootHarness.ts` (imported, not edited; the harness's `telemetryMock` stubs
`startClientTelemetry`, so this file mocks the telemetry module itself: the real
`startClientTelemetry` with `loadOtelSdk` replaced by a spy) and the recording connection factory,
setting the shell document on the page global and `VITE_MR_OTLP_ENDPOINT` and the OIDC variables
through the env. No e2e: telemetry and the withheld token have no player-visible surface, and CI
builds carry neither an endpoint nor an issuer. No i18n, bindings, vite or workflow change.
Reopens `ARCHITECTURE.md` (the telemetry and accounts paragraphs) and `docs/DECISIONS.md` after
`lpg-1`; the decision entry records "a target's kind gates telemetry and account sign-in".

- **lpg-10.1:** FOR every member of `TARGET_KINDS` other than `official` and `test`,
  `resolveTelemetryConfig` SHALL return `disabled` with a reason naming the kind for every endpoint
  and interval input, including a valid `https:` origin; the `kind` parameter SHALL be required
  (`client/src/observability/config.test.ts`, iterating `TARGET_KINDS` so an unclassified new kind
  fails).

- **lpg-10.2:** WHEN the target kind is `official` or `test`, `resolveTelemetryConfig` SHALL return
  what it returned before this slice for the same endpoint, interval, build mode and jitter — the
  existing `config.test.ts` cases pass with only the kind argument added.

- **lpg-10.3:** WHEN the client boots with `VITE_MR_OTLP_ENDPOINT` set to a valid origin and a shell
  document of kind `local` or `private`, THE telemetry loader SHALL never be called
  (`client/src/main.targetKindGate.test.ts`).

- **lpg-10.4:** WHEN the client boots with `VITE_MR_OTLP_ENDPOINT` set to a valid origin and a shell
  document of kind `official` or `test`, THE telemetry loader SHALL be called once with the exporter
  URL `<origin>/v1/metrics` (`client/src/main.targetKindGate.test.ts`).

- **lpg-10.5:** WHEN the client boots with the OIDC issuer and client id variables set and a shell
  document of kind `local` or `private`, `connect` SHALL receive an empty `authIssuer` and
  `authClientId`, and WHEN the kind is `official` or `test` IT SHALL receive the configured values
  (`client/src/main.targetKindGate.test.ts`).
