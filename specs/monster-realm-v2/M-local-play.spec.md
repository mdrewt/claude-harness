# Spec: M-local-play — single-player worlds and friends hosting

**Status:** groundwork elaborated 2026-11-14 (PLAN §9 item 2: LP0, LP1, LP10 as slices `lpg-0`,
`lpg-1`, `lpg-10`, head `lpg-0`) against game master `0e7a089d`; **LP2–LP9 are an unelaborated
sketch** (2026-11-12), elaborated with `milestone-loop-prompt.md` when PLAN §9 item 9 is reached ·
**Project:** monster-realm (client shell, packaging, server-module access rules, auth) · **Design
SSOT:** `game-design.md` §14 · **Target:** the early-access release.

Slice ids use the `lpg-` prefix: `lp-` names the harness loop-infrastructure slices.

## Problem / intent

Early access is the Steam build: a player installs the game, plays a single-player world on a server
the game starts for them, and can open that world to friends or join a friend's. Everything built so
far assumes one server that we operate and a browser client pointed at it. This milestone makes the
same module and the same client run as a local and a privately hosted game, without forking either.

The groundwork (LP0, LP1, LP10) runs ahead of the rest because it is small, unblocks everything
else here, and LP1 and LP10 are true of the official server too: the client learns where to connect
when it starts, not when it is built, and a client connected to a world we do not operate sends
nothing to our observability stack.

## Scope

**In (the groundwork, three slices):**

- `lpg-0` (LP0) — the `type: design` feasibility record: the licence state, the desktop shell, the
  sign-in design's open questions, and a one-player world's measured footprint, from which the
  budgets later slices hold are set.
- `lpg-1` (LP1) — the connection target is run-time configuration: a shell document the page
  receives before the client module runs names the server address, the database and the kind of
  server; no build-time server address remains in shared client code.
- `lpg-10` (LP10) — client telemetry is off whenever the connection target is a single-player
  (`local`) or friends (`private`) world, whatever endpoint the build carries; the official server
  and development/test servers keep it.

**Named deferrals (declared, not dropped):**

| Deferred | Target | Why |
|---|---|---|
| A player opt-in that turns telemetry on in a `local` or `private` world | LP3 (world settings) | It needs a settings surface and a stored choice per world; until then the rule is simply off |
| The bundled and standalone server sending nothing to our stack (server-side half of LP10) | LP2 (bundled server) and LP7 (standalone package) | Our stack only receives what we configure it to scrape; whether the SpacetimeDB host itself sends anything off the machine is measured by `lpg-0` (lpg-0.6) and held by the packaging slices |
| OIDC issuer, client id and redirect as run-time configuration | LP4 / LP6 | A world that is its own issuer (Sign-in design) changes what those values mean; they stay build-time until that design is verified |
| A transport rule for plaintext `ws:` to a non-loopback host | LP5 / LP6 | `lpg-1` keeps today's acceptance (any `ws:`/`wss:` URL); who may serve plaintext is an access-design question |
| The opening notice that a host can read a joiner's data | LP6 | It is part of private-server access (decision-defaulted below) |
| Desktop shell, worlds, offline sign-in, friends, private access, standalone package, unattended upgrade, solo audit | LP2–LP9 (sketch below) | Elaborated when PLAN §9 item 9 is reached, against `lpg-0`'s record |

## Current code this builds on (verified at game master `0e7a089d`)

- **The build-time server address.** `client/src/shell/config.ts` resolves `URI`/`DB` at module
  scope from `import.meta.env.VITE_STDB_URI` / `VITE_STDB_DB` through the pure
  `resolveConnectionConfig(env, isDev)` in `client/src/net/connectionConfig.ts`, whose dev defaults
  are `ws://127.0.0.1:3000` / `monster-realm`; a production build with an empty or dev-default
  database throws at import (kept at module scope so no `try` in `main()` can swallow it).
  `main.ts` reads `URI`/`DB` for `connect({ uri, db, … })` and as the claim-code key
  (`claimCode.clear` / `hasSeenFirstRunNudge` / `markFirstRunNudgeSeen`).
- **Credentials are keyed per target.** `net/authToken.ts` stores the reconnect token under
  `storageKey(uri, db)` and `net/claimCode.ts` keys codes by the same pair, so a token minted for
  one target is never offered to another. `lpg-1` preserves this; it is what makes a run-time
  target safe.
- **Where the env names are set.** `.github/workflows/ci.yml` (e2e job) and `nightly.yml` set
  `VITE_STDB_URI`/`VITE_STDB_DB`; the `justfile` sets `VITE_STDB_DB` per e2e shard
  (`e2e-shards`), for `client-verify-build` and in `playtest-up`; 15 `client/e2e/*` files and
  `global-setup.ts` read `process.env.VITE_STDB_DB` on the Node side to call the database. The
  Playwright `webServer` runs `npm run dev` (vite dev) with the inherited env.
- **The production-bundle check.** `scripts/verify-build-hooks.mjs` (`just client-verify-build`, in
  `just ci` and the CI `client` job) fails a bundle carrying DEV hooks and, via `bundleBakesDb`, one
  that does not bake `db:"<MR_PLAYTEST_DB>"`; `scripts/verify-build-hooks.test.mjs` tests it.
- **The telemetry bootstrap.** `main.ts` resolves `TELEMETRY_CONFIG` at module scope with
  `resolveTelemetryConfig({ endpoint: VITE_MR_OTLP_ENDPOINT, intervalMs: VITE_MR_OTLP_INTERVAL_MS },
  import.meta.env.DEV, Math.random())` (`client/src/observability/config.ts`, a pure total resolver
  returning `disabled | enabled`), then `main()` calls `startClientTelemetry(TELEMETRY_CONFIG, …)`
  (`observability/telemetry.ts`), whose disabled path never loads the SDK. Unset endpoint ⇒ off, so
  dev and CI builds run without telemetry today; a build that sets the endpoint sends from every
  connection, whatever server it joined. `docs/refactors/client-shell.md` keeps "the telemetry
  config" in `main.ts`'s boot prelude.
- **Other off-machine paths.** None in the client besides the SDK connection, the OTLP exporter and
  the OIDC redirect (no other `fetch`/`sendBeacon`/`WebSocket` in `client/src`). The F9 bug bundle is
  a player-initiated local download; `playtest_event` is a private table in the world's own database.
- **Load tooling.** `sim-harness` ships `mr_load_driver` (N anonymous WebSocket clients walking at a
  fixed intent rate against `--server`/`--db`), which `lpg-0` uses for its measurements.
- **Auth.** `server-module/src/accounts.rs` `ALLOWED_ISSUERS` is still the fail-closed
  `https://auth.monster-realm.invalid/` placeholder: no account issuer is deployed, so the Sign-in
  design's attestation question can only be answered against candidate issuers.

## Design (groundwork)

### The shell document (lpg-1)

One JSON-shaped document, supplied by whatever hosts the client, read once at start-up:

```ts
// client/src/shell/runtimeConfig.ts
export const SHELL_CONFIG_GLOBAL = '__MR_SHELL_CONFIG__';   // globalThis property
export const SHELL_CONFIG_SCRIPT = 'shell-config.js';      // served beside index.html
export type TargetKind = 'official' | 'test' | 'local' | 'private';
export interface ShellDocument {
  readonly connection?: { readonly uri?: string; readonly db?: string; readonly kind?: TargetKind };
}
/** The document the page received, or undefined; never throws, never reads import.meta. */
export function readShellDocument(host: object): unknown;
/** The classic-script text that sets the global to `doc` (JSON literal, so no code from config). */
export function renderShellConfigScript(doc: ShellDocument): string;

// client/src/net/connectionConfig.ts
export interface ResolvedConnection { readonly uri: string; readonly db: string; readonly kind: TargetKind }
export function resolveConnectionConfig(doc: unknown, isDev: boolean): ResolvedConnection; // throws on reject
```

- **Delivery is a page global set before the module runs**, never a fetch: `client/index.html`
  loads a classic `<script src="/shell-config.js">` ahead of its module script (classic scripts run
  first). A browser host serves that file; a desktop shell sets the same global from its own
  pre-page hook (which hook is `lpg-0`'s shell question). The read is synchronous, so
  `shell/config.ts` keeps resolving at module scope and keeps the fail-loud throw at import, and the
  36 boot suites that import `main.ts` keep opening no socket (their harness drops `<script>`
  elements, so they see no document and take the development defaults).
- **Resolution (reject, never clamp).** A document present but malformed — not an object, a field of
  the wrong type, a `uri` that is not an absolute `ws:`/`wss:` URL, a `kind` outside the four — is
  rejected in every build. No document: a development build takes `ws://127.0.0.1:3000`,
  `monster-realm`, kind `test`; a production build throws. A production target whose database is
  empty or the dev default (case-insensitive) throws, as today. A missing `kind` is `test` in a
  development build and `private` in production, so a host that never thought about telemetry gets
  none.
- **`kind` is what the host says the server is:** `official` (ours, public), `test` (any server we
  run for development, CI or playtests), `local` (a single-player world the game started),
  `private` (a friends server). The page's host already controls the client code it serves, so the
  claim is trusted to exactly the degree that code is. `shell/config.ts` exports `TARGET_KIND`
  beside `URI` and `DB`.
- **Tooling keeps the env names.** `VITE_STDB_URI`/`VITE_STDB_DB` stop being read by client code and
  become inputs of the vite config: the dev server answers `/shell-config.js` with that target
  (kind `test`), so the e2e shards, CI and `just` recipes keep working with no edit; `vite build`
  writes `dist/shell-config.js` only when `VITE_STDB_DB` is set (the playtest and
  `client-verify-build` builds, kind `test`). A production build without it ships no document and
  its host must supply one. `verify-build-hooks.mjs` checks `dist/shell-config.js` instead of a
  baked `db:` value.

### Telemetry follows the target (lpg-10)

`resolveTelemetryConfig(env, isDev, jitter, kind)`: for kind `local` or `private` it returns
`disabled` (reason naming the kind) before reading the endpoint; for `official` and `test` it is
unchanged. `main.ts` passes `TARGET_KIND`. The OTLP endpoint stays a build value: it is our ingest,
the same for every build, not a game-server address; the decision of whether to use it is the
run-time one. Nothing else in the client sends data off the machine (above), so the gate is this
one resolver.

### Considered and rejected

- **Fetching `shell-config.json` at start-up:** an asynchronous read moves the fail-loud throw out of
  module scope and makes all 36 `main.ts` boot suites attempt a socket at import.
- **Deriving the target from the page URL (`location`):** a desktop shell's page origin is the
  shell's, not the server's, so the browser and desktop builds would diverge.
- **Telemetry on only for a build-declared official host:** that reintroduces a build-time server
  address in shared client code, which LP1 removes.
- **Moving the telemetry endpoint into the shell document instead of adding `kind`:** a friends host
  copying our document would carry it; `kind` also serves LP3/LP5/LP6, which need to know what kind
  of world the client joined.
- **Renaming `VITE_STDB_*` now:** 15 e2e files, two workflows and three recipes for no behaviour.

## Decisions the operator owns (defaults recorded; each reversible)

Each default below stands unless the operator overrules it; none is a groundwork blocker, and no
`mr-ask-drew` is raised (no irreversible or security choice is needed by the groundwork itself).

- `decision-defaulted:local-play-budgets=set-from-lpg-0-measurements` — resource budgets for a
  single-player world and a friends server are set from `lpg-0`'s measurements of one player on a
  modest-machine profile and eight players on one host.
- `decision-defaulted:private-server-idp-unreachable=accept-seen-refuse-new` — when the identity
  provider cannot be reached, a private server accepts players it has already seen and refuses new
  ones (consumed by LP6).
- `decision-defaulted:private-server-host-notice=yes-once-per-server` — a player sees, once per
  server, a notice that its host can read and change their data in that world (consumed by LP6).

Elaboration defaults (the loop's calls, flagged so the operator can object):

- `decision-defaulted:shell-document-delivery=page-global-before-module` — over a fetched JSON file
  (above).
- `decision-defaulted:telemetry-gate=target-kind` — telemetry is off for `local`/`private` targets and
  for a production document that omits `kind`; the endpoint stays a build value.
- `decision-defaulted:telemetry-opt-in=deferred-to-LP3` — no opt-in in the groundwork.

## Cross-slice contracts (each with its post-merge proof)

| Contract | Producer → consumer | Post-merge proof |
|---|---|---|
| The chosen desktop shell can set a page global before the client's module script runs | `lpg-0` → `lpg-1`, LP2 | `lpg-0`'s `docs/DECISIONS.md` entry names the shell's pre-page hook; LP2's first slice sets `__MR_SHELL_CONFIG__` through it |
| Budgets (memory, idle CPU, start-up to playable, disk growth per hour) for one-player and eight-player hosts | `lpg-0` → LP2, LP3, LP5, LP7 | `docs/local-play.md` in the game repo; each consuming slice's EARS cite a number from it |
| The shell document: `__MR_SHELL_CONFIG__`, `shell-config.js`, `connection.{uri,db,kind}`, the resolution rules | `lpg-1` → `lpg-10`, LP2, LP3, LP5 | `runtimeConfig.test.ts` round trip and `connectionConfig.test.ts`; `client/e2e/shell-config.spec.ts` |
| `TARGET_KIND` exported by `shell/config.ts` | `lpg-1` → `lpg-10` | `main.telemetryGate.test.ts` boots the real `main.ts` and reads the kind through it |
| A `local`/`private` target sends no telemetry | `lpg-10` → LP2, LP3 | `main.telemetryGate.test.ts`; LP3's opt-in, when built, is the only path that turns it on |

## Post-integration verification (the integrated whole, after `lpg-10`)

- Full `just ci` green on `master`, including `client-verify-build` against `dist/shell-config.js`;
  no `just gen` diff (`bindings-drift` 0; the groundwork changes no schema).
- `just e2e` green in its sharded form: every shard reaches its own database through the document
  the dev server serves, and `shell-config.spec.ts` shows a different document sends the client
  elsewhere.
- A production build made with no `VITE_STDB_*` set contains no server address in its JavaScript
  and throws at start-up until a `shell-config.js` is supplied; supplying one naming the playtest
  database (`just playtest-up`) joins it. Run once by hand on `master` and recorded in the last
  slice's PR (`not-verified:` if it could not be run).
- Booted with `VITE_MR_OTLP_ENDPOINT` set: kind `official` or `test` loads the telemetry SDK; kind
  `local` or `private` never does.
- `lpg-0`'s budgets are cited by number in the LP2/LP3/LP5/LP7 sections when they are elaborated.

## Risks / flags

- **Licence (operator-owned, open).** Packaging (LP2, LP7) waits on the terms the operator is
  negotiating with the licensor; `lpg-0` records the state and decides nothing. Lifting event: the
  operator records the negotiated terms (or that none are needed). Fallback if the terms do not
  allow bundling: the desktop shell connects to a server the player installs separately (the LP7
  package), which changes LP2's scope but not LP1's contract.
- **A host can claim `official`.** A friends host serving the browser build can set kind `official`
  and so send its players' client metrics to our ingest. They carry no identity (the resource is
  `service.name` only) and the host already controls the code it serves; accepted, not mitigated.
- **`main.ts` and `main.*.test.ts` are shared with `st-7`.** `lpg-1` edits
  `client/src/main.claimCode.test.ts` and `lpg-10` edits `main.ts` and adds
  `client/src/main.telemetryGate.test.ts`; both fall inside `st-7`'s `client/src/main.*.test.ts`
  glob, so `mr-disjoint` serializes each with `st-7`.
- **Docs reopened serially.** `docs/DECISIONS.md` is written by all three slices and `ARCHITECTURE.md`
  by `lpg-1` and `lpg-10`; the chain `lpg-0 → lpg-1 → lpg-10` orders them. Code and test files are
  pairwise disjoint.
- **Stale skill line (follow-up outside this spec).** The game repo's
  `.claude/skills/spacetimedb-client/SKILL.md` says the builder takes the target from
  `VITE_STDB_URI`/`VITE_STDB_DB`; after `lpg-1` that is the dev server's input. Its owner reconciles it.
- **Modest-machine profile.** The measuring machine is a 32-core workstation; `lpg-0` constrains the
  server process (CPU set and memory limit, recorded) to stand in for a modest laptop, and states
  the numbers are a profile, not a laptop measurement.

## Unelaborated sketch — LP2 to LP9 (2026-11-12; NOT buildable, no slice ids)

Elaborate with `milestone-loop-prompt.md` when PLAN §9 item 9 is reached, against the current game
repo and `lpg-0`'s record (`docs/local-play.md`). Nothing below is a slice yet.

- **LP2 Desktop shell.** A shell that hosts the existing web client unchanged, starts and stops the
  bundled server, and owns only shell concerns (window, local server lifecycle, sign-in hand-off,
  save location). It supplies the shell document (`lpg-1`) for each world it opens. The browser
  build stays a full client for every way to play. Waits on the licence terms (`lpg-0.1`).
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

Order: `lpg-0` → `lpg-1` → `lpg-10`. The chain is real: `lpg-1`'s delivery contract relies on
`lpg-0`'s shell choice, and `lpg-10` reads the `kind` `lpg-1` produces. No slice changes a
structural surface (schema, bindings, lockfiles).

### lpg-0 — feasibility: licence state, desktop shell, sign-in questions, one-player footprint
type: design · tier: hard
category: local-play/feasibility · severity: HIGH · size: MODERATE
touches: docs/DECISIONS.md, docs/local-play.md
after: []

Changes no code: no tester, no red run, `moved-tests: none`. `docs/local-play.md` (new) is the
record later slices read: the licence facts, the shell choice and the hook that delivers the shell
document, the sign-in answers, the measurement method (commands, machine, constraints, durations)
with raw numbers, and the budget table. `docs/DECISIONS.md` gets one entry for the shell choice and
what it rules out and one for the budgets. Measurements run against the pinned SpacetimeDB 2.8.1
standalone host, the module built from `master`, and `mr_load_driver`; scratch files stay in a
sandbox outside the repo. A `judge` scores at least two shell alternatives (candidates: Tauri 2,
Electron; a native launcher that opens the system browser may be the third) on: hosts the
unchanged web build, sets a page global before module scripts, starts and stops a child server
process, installer and memory size, Steamworks/overlay integration, licence, signing and update.

- **lpg-0.1:** THE record SHALL state the licence facts as known at the slice's date — Business
  Source License 1.1 read at 2.16.0 on 2026-11-12, the one-production-instance grant, the "Database
  Service" clause and mod-added tables, the conversion to AGPL v3 with a linking exception on
  2031-11-10, and the operator's negotiation with the licensor since 2026-11-12 — and SHALL mark
  LP2 and LP7 as waiting on the negotiated terms without adopting any reading of the licence.

- **lpg-0.2:** THE record SHALL name the chosen desktop shell with the judge's scores over at least
  two alternatives, and the `docs/DECISIONS.md` entry SHALL state what the choice rules out and the
  shell's hook that sets `__MR_SHELL_CONFIG__` before the page's module script runs.

- **lpg-0.3:** FOR each sign-in question — which token claims a module can read at connect, whether
  a standalone server can sign with its own key per world, whether an account issuer can mint an
  attestation as a second token type, and how a world's server verifies an attestation (as the
  connection token or as a reducer argument) — THE record SHALL give an answer at SpacetimeDB 2.8.1
  citing the documentation or source it rests on, or SHALL record the question open with what would
  answer it, and SHALL name which design (own-issuer, or the audience-scoped fallback) LP4 and LP6
  elaborate against.

- **lpg-0.4:** THE record SHALL report, for one player on the stated modest-machine profile, the
  host's resident memory and CPU with nobody connected and with one idle and one walking player,
  the time from server process start to a client's first applied subscription, and commit-log
  growth over at least 15 minutes of one player walking (with the per-hour rate) and over at least
  15 minutes with nobody connected.

- **lpg-0.5:** THE record SHALL report the same host memory, CPU and commit-log growth for eight
  `mr_load_driver` clients walking on one host.

- **lpg-0.6:** THE record SHALL state whether the SpacetimeDB standalone host opens any connection
  off the machine during the measurement runs, with the method used to observe it.

- **lpg-0.7:** THE record and its `docs/DECISIONS.md` entry SHALL set absolute budgets for a
  single-player world and a friends server — memory, idle CPU, start-up to playable and disk growth
  per hour — each derived from a reported measurement with its headroom stated.

### lpg-1 — the connection target is run-time configuration
type: feature · tier: hard
category: local-play/connection · severity: HIGH · size: MODERATE
touches: client/src/shell/runtimeConfig.ts, client/src/shell/runtimeConfig.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/shell/config.ts, client/src/shell/config.test.ts, client/src/main.claimCode.test.ts, client/index.html, client/vite.config.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, justfile, client/e2e/shell-config.spec.ts, README.md, docs/runbooks/playtest-ops.md, ARCHITECTURE.md, docs/DECISIONS.md
after: [lpg-0]

Builds "The shell document" above. `runtimeConfig.ts` (new) owns the global's name, the script's
name, `readShellDocument` and `renderShellConfigScript`; `connectionConfig.ts` keeps the one
resolver, now over the document (`kind` added, the dev-default and production guards kept);
`shell/config.ts` reads the document at module scope and exports `URI`, `DB` and `TARGET_KIND`.
`vite.config.ts` gains a plugin that answers `/shell-config.js` in dev and preview and emits
`dist/shell-config.js` on build, both from `renderShellConfigScript` over the `VITE_STDB_*`
tooling env. `verify-build-hooks.mjs` replaces `bundleBakesDb` with a check of
`dist/shell-config.js`; `justfile` changes only comments on the `client-verify-build` and
`playtest-up` recipes (their env lines already produce the document). `main.ts` is unchanged (its
`URI`/`DB` imports keep their names). `main.claimCode.test.ts` recomputes the target the way
`main.ts` does, so it follows the new resolver signature. Hidden dependencies checked: no generated
bindings, no i18n string (the start-up throw is a developer error before any UI exists, as today),
CI workflow env and the 15 e2e files unchanged (the env names stay as tooling inputs). The new e2e
uses `client/e2e/stdb.ts` and the existing session helpers; it adds no helper. A
`docs/DECISIONS.md` entry records "the connection target is run-time configuration".

- **lpg-1.1:** WHEN the page global holds a document whose `connection` names a `uri` and `db`,
  THE client SHALL resolve exactly that target, whatever `VITE_STDB_URI`/`VITE_STDB_DB` held at
  build (`client/src/shell/config.test.ts`, importing `shell/config` with those env names stubbed to
  other values).

- **lpg-1.2:** WHEN a production client starts with no document, or with one whose `db` is empty or
  the dev default in any letter case, THE import of `shell/config.ts` SHALL throw before `connect`
  is reachable, with a message naming the missing or refused field
  (`client/src/net/connectionConfig.test.ts`, `client/src/shell/config.test.ts`).

- **lpg-1.3:** WHEN a document is not an object, has a field of the wrong type, has a `uri` that is
  not an absolute `ws:` or `wss:` URL, or has a `kind` outside `official`, `test`, `local` and
  `private`, THE resolver SHALL throw in development and production builds alike and SHALL never
  substitute a default (`client/src/net/connectionConfig.test.ts`, table over each rejection).

- **lpg-1.4:** WHEN a development client starts with no document, THE resolver SHALL return
  `ws://127.0.0.1:3000`, `monster-realm` and kind `test`; WHEN a document omits `kind`, THE resolver
  SHALL return `test` in a development build and `private` in a production build
  (`client/src/net/connectionConfig.test.ts`).

- **lpg-1.5:** FOR every valid document, including strings holding quotes, backslashes,
  `</script>`, U+2028 and non-ASCII text, evaluating `renderShellConfigScript(doc)` on a fresh global
  object and reading it back with `readShellDocument` SHALL yield a document that resolves to the
  same target, and the script SHALL contain no expression other than the one assignment of a JSON
  literal (`client/src/shell/runtimeConfig.test.ts`, property test).

- **lpg-1.6:** WHEN `verify-build-hooks.mjs` runs over a build directory, IT SHALL fail when
  `shell-config.js` is missing, unreadable as a shell document or names a database other than
  `MR_PLAYTEST_DB`, and SHALL pass when it names that database
  (`scripts/verify-build-hooks.test.mjs`).

- **lpg-1.7:** WHEN the page receives a shell document naming a database that does not exist on the
  suite's server, THE client SHALL never join the suite's world and SHALL show the session's
  connection-failure state, and WHEN it receives the document the dev server serves IT SHALL join
  the suite's world (`client/e2e/shell-config.spec.ts`, the document replaced through Playwright
  routing of `/shell-config.js`).

- **lpg-1.8:** WHEN the target changes between two documents, THE stored reconnect token and claim
  code of one target SHALL never be offered to the other — the existing `net/authToken.test.ts`
  and `net/claimCode.test.ts` suites pass unedited, and `client/src/main.claimCode.test.ts` passes
  with only its target computation re-pointed.

### lpg-10 — no telemetry from single-player and friends worlds
type: feature · tier: hard
category: local-play/privacy · severity: HIGH · size: LIGHT
touches: client/src/observability/config.ts, client/src/observability/config.test.ts, client/src/main.ts, client/src/main.telemetryGate.test.ts, ARCHITECTURE.md, docs/DECISIONS.md
after: [lpg-1]

Builds "Telemetry follows the target" above: `resolveTelemetryConfig` gains the `kind` parameter
and `main.ts`'s module-scope `TELEMETRY_CONFIG` passes `TARGET_KIND` (imported from
`shell/config.ts`, produced by `lpg-1`). The privacy surface is the reason for `tier: hard`.
`main.telemetryGate.test.ts` (new) boots the real `main.ts` through
`client/test-util/mainBootHarness.ts` (imported, not edited), sets the shell document on the page
global and `VITE_MR_OTLP_ENDPOINT` through the env, and observes the config `startClientTelemetry`
receives and every `fetch`. No e2e: telemetry has no player-visible surface, and CI builds carry no
endpoint. No i18n, bindings, vite or workflow change. Reopens (serial): `ARCHITECTURE.md` and
`docs/DECISIONS.md` after `lpg-1`; the decision entry records "telemetry follows the connection
target".

- **lpg-10.1:** WHILE the target kind is `local` or `private`, `resolveTelemetryConfig` SHALL
  return `disabled` with a reason naming the kind for every endpoint and interval input, including a
  valid `https:` origin (`client/src/observability/config.test.ts`, table over kinds × endpoints).

- **lpg-10.2:** WHEN the target kind is `official` or `test`, `resolveTelemetryConfig` SHALL return
  what it returned before this slice for the same endpoint, interval, build mode and jitter — the
  existing `config.test.ts` cases pass with only the kind argument added.

- **lpg-10.3:** WHEN the client boots with `VITE_MR_OTLP_ENDPOINT` set to a valid origin and a shell
  document of kind `local` (and again `private`), THE client SHALL hand `startClientTelemetry` a
  `disabled` config and SHALL make no request to that origin, and WITH kind `official` it SHALL hand
  it the `enabled` config for that origin (`client/src/main.telemetryGate.test.ts`).
