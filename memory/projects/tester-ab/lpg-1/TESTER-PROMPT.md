# Tester brief — lpg-1 (the connection target is run-time configuration)

You are the `tester` for slice `lpg-1` of Monster Realm. You write the gating tests from the
acceptance criteria below, before any implementation exists. You do not implement the feature and
you have no shell: the orchestrator runs every suite after you finish and proves each test fails
for the right reason.

**Worktree (read and write files here, by absolute path, with Read/Grep/Glob/Write/Edit only):**
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpg-1`

Every repo path below is relative to that worktree. Standard that binds:
`/home/mdrewt/.claude/harness/standards/testing-tdd.md` (read it first; it is short).

## What the slice does

Today the client's SpacetimeDB target is fixed at build time: `client/src/shell/config.ts` reads
`import.meta.env.VITE_STDB_URI` / `VITE_STDB_DB` and passes them to
`resolveConnectionConfig(env, isDev)` in `client/src/net/connectionConfig.ts`.

After this slice the page's host supplies a "shell document" at run time. `client/index.html`
loads a classic script, `/shell-config.js`, before the client module; that script assigns the
document to `globalThis.__MR_SHELL_CONFIG__`. `shell/config.ts` reads the global once at import
and resolves it. The env names stop being read by client code: they become inputs of a Vite
plugin that serves `/shell-config.js` in `vite dev` and writes `dist/shell-config.js` on a build.
`scripts/verify-build-hooks.mjs` checks a production build's `shell-config.js` instead of looking
for a baked database name. `client/src/main.ts` does not change.

## Acceptance criteria (EARS, verbatim from the spec; each needs a test you expect to fail today)

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
  written as backslash-u escapes and a final `;`, and evaluating it on a fresh global object and
  reading it back with `readShellDocument` SHALL resolve to the same target
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
  document's `uri` and `db`, and the claim-code and first-run-nudge storage keys it reads and
  writes SHALL be the ones derived from that pair; WHEN it boots again under a second document
  naming another target, no key of the first target SHALL be read or written
  (`client/src/main.claimCode.test.ts`).

## Contracts

Notation used in this section: "LT" is the less-than sign; "LS" is the character U+2028; "PS" is
U+2029. An "escape" is the six ASCII characters backslash, `u`, and four lowercase hex digits
(`003c` for LT, `2028` for LS, `2029` for PS).

Test files and what each calls:

| Test file (worktree-relative) | Kind | Calls |
|---|---|---|
| `client/src/net/shellDocument.test.ts` | new, vitest | `./shellDocument`, `./connectionConfig` |
| `client/src/net/connectionConfig.test.ts` | existing, replaced | `./connectionConfig`, `./shellDocument` (`TARGET_KINDS`) |
| `client/src/shell/config.test.ts` | existing, edited | `./config` (fresh dynamic import), `../net/shellDocument` |
| `client/src/main.claimCode.test.ts` | existing, edited | `./main` (boot), `./net/claimCode`, `./net/shellDocument` |
| `client/src/indexShell.smoke.test.ts` | existing, one case re-pointed | the real `client/index.html` |
| `scripts/verify-build-hooks.test.mjs` | existing, `node --test`, two cases replaced | the CLI `scripts/verify-build-hooks.mjs`; exports `findDevHooks`, `DEV_HOOK_FINGERPRINTS` |
| `client/e2e/shell-config.spec.ts` | new, Playwright | the page; `../src/net/shellDocument`; `./stdb` |

### `client/src/net/shellDocument.ts` (does not exist yet)

```ts
export const SHELL_CONFIG_GLOBAL = '__MR_SHELL_CONFIG__';
export const SHELL_CONFIG_SCRIPT = 'shell-config.js';
export const TARGET_KINDS = ['official', 'test', 'local', 'private'] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];
export interface ShellDocument {
  readonly connection: { readonly uri: string; readonly db: string; readonly kind?: TargetKind };
}
export function readShellDocument(host: object): unknown;
export function renderShellConfigScript(doc: ShellDocument): string;
```

- `readShellDocument(host)`: the value of `host`'s OWN property `__MR_SHELL_CONFIG__`, read once;
  `undefined` when `host` has no such own property (an inherited one is not read). It catches
  nothing: an own accessor that throws makes the call throw that same error.
- `renderShellConfigScript(doc)` returns exactly `'globalThis.__MR_SHELL_CONFIG__=' + J + ';'`
  where `J` is `JSON.stringify(doc)` with every LT replaced by its escape (`003c`), every LS by
  its escape (`2028`) and every PS by its escape (`2029`). It validates nothing and adds nothing
  else. The output therefore holds no LT and no raw LS or PS.
- Round trip: FOR every document `resolveConnectionConfig` accepts, evaluating the output as a
  classic script on a fresh global object and reading it back with `readShellDocument` resolves
  (same `isDev`) to a target equal to resolving `doc` itself. The claim is limited to accepted
  documents (an own `kind: undefined` or an own `__proto__` key does not survive
  `JSON.stringify` or an object literal, and the resolver rejects both).

### `client/src/net/connectionConfig.ts` (exists; signature changes)

```ts
import type { TargetKind } from './shellDocument';
export interface ResolvedConnection { readonly uri: string; readonly db: string; readonly kind: TargetKind }
export function resolveConnectionConfig(doc: unknown, isDev: boolean): ResolvedConnection; // throws Error on reject
```

Resolution (reject, never clamp). "Own key" means `Reflect.ownKeys`, so symbol and non-enumerable
keys count. "An object" means `typeof v === 'object'`, not `null`, not an array; the prototype is
not inspected (a null-prototype or other-realm object is an object; a function is not). Each
field's value is read exactly once, and the value returned is the value validated. An error
thrown by the document's own accessor or Proxy trap propagates unchanged (it is not wrapped).

1. `doc === undefined` (absent): `isDev` true returns `{ uri: 'ws://127.0.0.1:3000',
   db: 'monster-realm', kind: 'test' }`; `isDev` false throws.
2. Otherwise `doc` must be an object whose only own key is `connection`; `connection` must be an
   own property holding an object whose own keys are within `uri`, `db`, `kind`. `uri` and `db`
   must be own properties (an inherited one counts as missing).
3. `uri`: a string; trimmed (`String.prototype.trim`); then ALL of:
   - non-empty;
   - no character in U+0000–U+0020 and no U+007F anywhere (space, tab, LF, CR and the other ASCII
     controls);
   - scheme `ws` or `wss` (any letter case), then `://`, then a non-empty authority holding no
     `/`, backslash, `?`, `#` or `@`, then optionally a path starting with `/`;
   - no `?` and no `#` anywhere (an empty query or fragment is still one); no `@` in the
     authority (an empty userinfo is still one);
   - a path, when present, ends with `/` (the SDK resolves its endpoint relative to the `uri`, so
     a last segment without the slash would be dropped silently);
   - `new URL(uri)` parses (rejects a bad host or port).
   Inside the path any other character is allowed (quotes, backslashes, LT, LS, PS, non-ASCII).
   Accepted examples: `ws://127.0.0.1:3000`, `wss://play.example`, `wss://play.example:443/`,
   `ws://[::1]:3000`, `ws://localhost:3000`, `wss://play.example/stdb/`, `WSS://Play.Example/`.
   Rejected examples: the empty string, whitespace only, `http://h`, `https://h`, `//h:3000`,
   `h:3000`, `/path`, `ws:`, `ws://`, `ws:h`, `ws:/h`, `ws://u@h`, `ws://u:p@h`, `ws://@h`,
   `ws://h?x=1`, `ws://h/?`, `ws://h#f`, `ws://h/#`, `ws://h/stdb`, `ws://h:99999`,
   `ws://h/a b/` (a space).
4. `db`: a string; trimmed; must match `^[A-Za-z0-9_-]+$` (so empty and whitespace-only reject).
   With `isDev` false a `db` whose lowercase form is `monster-realm` throws; with `isDev` true it
   is accepted.
5. `kind`: when `connection` has an own `kind` key its value must be a member of `TARGET_KINDS`
   by strict equality (no trimming, no case folding; `undefined`, `'toString'`, `'constructor'`,
   `'__proto__'`, `'Test'`, `' test'` all reject). When the key is absent: `test` with `isDev`
   true, `private` with `isDev` false.
6. Returns a new object `{ uri, db, kind }`: the document's `uri` and `db` trimmed and otherwise
   unchanged (no case folding, no slash or port normalization; `WSS://Play.Example/` comes back
   as `WSS://Play.Example/`).
7. Rules 2–5 hold identically for `isDev` true and false, except the `isDev`-false refusal of the
   dev-default `db` in rule 4. No default is ever substituted for a present document.

Errors: every rejection the resolver itself raises is an `Error` whose `message` is
`shell document: <subject> <reason>`. `<subject>` is followed by a space and is one of:

| Rejection | `<subject>` |
|---|---|
| absent document with `isDev` false; document not an object; unknown top-level key | `__MR_SHELL_CONFIG__` |
| `connection` missing or not an object; unknown key inside `connection` | `connection` |
| `uri` missing, not a string, or refused by rule 3 | `connection.uri` |
| `db` missing, not a string, or refused by rule 4 | `connection.db` |
| `kind` refused by rule 5 | `connection.kind` |

The reason's wording is free (do not pin it). An unknown key is named in the reason as
`JSON.stringify(String(key).slice(0, 32))`. A document's `uri`, `db` and `kind` VALUES are never
interpolated into a message (a refused `uri` may carry credentials): assert that with distinctive
sentinel values, never with a one-letter value. No message names a database other than the
development default `monster-realm`. Give each rejection row exactly one fault: precedence
between simultaneous faults is unspecified.

### `client/src/shell/config.ts` (exists; edited)

`export const URI: string; export const DB: string; export const TARGET_KIND: TargetKind;` are
resolved at import from `readShellDocument(globalThis)` and `import.meta.env.DEV`. The module
reads neither `import.meta.env.VITE_STDB_URI` nor `import.meta.env.VITE_STDB_DB`. An import under
a rejected document rejects with the resolver's error. Its other exports are unchanged.

A test supplies the document with
`(globalThis as Record<string, unknown>)[SHELL_CONFIG_GLOBAL] = doc` before a fresh import
(`vi.resetModules()` then `await import('./config')`), and MUST delete that property in
`afterEach` (a leak moves every later suite in the worker off the development defaults). A
production build is simulated the way the file already does it: `vi.stubEnv('DEV', false)`.

### `client/index.html` (edited by the implementer)

Exactly two `<script>` elements, both direct `<body>` children, adjacent, in this order:
`<script vite-ignore src="/shell-config.js"></script>` (no `type`, no `async`, no `defer`, no
inline text) and then `<script type="module" src="/src/main.ts"></script>`.

### `scripts/verify-build-hooks.mjs` (CLI contract)

Exports `findDevHooks` and `DEV_HOOK_FINGERPRINTS` are unchanged. The export `bundleBakesDb` is
removed. The rest is the command line:

`node scripts/verify-build-hooks.mjs [distDir]` (default `client/dist`), env `MR_PLAYTEST_DB`
(default `monster-realm-playtest`, trimmed). Exit status 0 and one stdout line starting
`verify-build-hooks: OK` when every check passes; otherwise exit status 1 with stderr lines
starting `verify-build-hooks:`. It fails when:

- `distDir` is missing, or holds no `.js` file other than `<distDir>/shell-config.js`;
- any `.js` file carries a DEV hook fingerprint;
- `MR_PLAYTEST_DB` is empty or `monster-realm` in any letter case;
- `<distDir>/shell-config.js` is missing (stderr names `shell-config.js`);
- running that file sets no readable document: it throws, runs past a time bound, leaves
  `__MR_SHELL_CONFIG__` unset, or sets a value without a string `connection.db` (stderr names
  `__MR_SHELL_CONFIG__`);
- the document's `connection.db` is not exactly `MR_PLAYTEST_DB` (stderr names both);
- any other regular file under `distDir` (any depth, any extension, including a nested
  `shell-config.js` and `index.html`) contains the `MR_PLAYTEST_DB` string (stderr names the
  file's path);
- `<distDir>/index.html` is missing or does not contain the text `src="/shell-config.js"`.

It passes when only `<distDir>/shell-config.js` names the database. A minimal passing directory:
`index.html` holding `<script src="/shell-config.js"></script>`, `assets/app.js` holding ordinary
code, and `shell-config.js` holding
`globalThis.__MR_SHELL_CONFIG__={"connection":{"uri":"ws://127.0.0.1:3000","db":"<MR_PLAYTEST_DB>","kind":"test"}};`.

## Measured facts you can rely on

- The orchestrator added the classic script tag to `client/index.html` as a probe and ran the
  whole client suite: only `indexShell.smoke.test.ts`'s script-count case failed. Every boot
  harness filters `SCRIPT` children out, so no other suite needs an edit for the tag.
- A client pointed at a database that does not exist on a live server (measured in headless
  Chromium): `document.getElementById('status').textContent` is `connect: WebSocket error`,
  `window.__game().identity` is `''` and `window.__game().ownAuthTile` is `null`. The client keeps
  retrying on its backoff ladder, so the text stays.
- The SpacetimeDB SDK opens `<uri>/v1/database/<db>/subscribe`; a missing database answers 404.
- Under vitest `import.meta.env.DEV` is `true`, and nothing sets the page global, so an untouched
  boot suite resolves `ws://127.0.0.1:3000` / `monster-realm`.
- `scripts/*.test.mjs` are run by `node --test` behind a floor on the passing count, and
  `verify-build-hooks.test.mjs` contributes 5 today: keep at least 5 tests in it.

## Work, file by file

### 1. `client/src/net/shellDocument.test.ts` (new) — lpg-1.5 and the `readShellDocument` contract

- A fast-check property over documents the resolver accepts. Build the generator so it really
  reaches the hard strings: the `uri` path (rule 3 allows any character there except `?`, `#`,
  U+0000–U+0020 and U+007F, and the path must end with `/`) must be able to hold a double quote,
  a single quote, a backslash, LT, the text `</script>`, `<!--`, LS, PS and non-ASCII text; `db`
  from the allowed charset; `kind` absent or each member of `TARGET_KINDS`. Include fixed
  examples for each hard string beside the generated ones, so a shrunk generator cannot hide one.
- Assert the exact output string (the prefix, the escaped JSON, the final `;`), computed in the
  test from `JSON.stringify(doc)` with the three replacements; assert it holds no LT and no raw
  LS/PS; evaluate it on a FRESH global object and read it back with `readShellDocument`, then
  compare `resolveConnectionConfig(readBack, isDev)` with `resolveConnectionConfig(doc, isDev)`
  using `toEqual`, for both `isDev` values where the document is accepted. Ways to evaluate on a
  fresh object: `new Function('globalThis', script)(fresh)` (the parameter shadows the real
  global) or `node:vm`'s `runInNewContext(script, fresh)`; with `vm` the value comes from another
  realm, so compare resolved targets, not prototypes.
- Example tests for `readShellDocument`: own value returned as is (identity); absent gives
  `undefined`; an inherited `__MR_SHELL_CONFIG__` (on the prototype) gives `undefined`; an own
  accessor that throws makes the call throw the same error object.
- Build LS and PS with `String.fromCharCode(0x2028)` / `String.fromCharCode(0x2029)` and the
  expected escapes by concatenation (`'\\' + 'u2028'` style or
  `String.fromCharCode(92) + 'u2028'`). NEVER type a backslash-u-hex sequence or a raw LS/PS into
  a file: an editor call can decode it silently. After writing, Grep your file for the regex
  `\\u[0-9a-fA-F]{4}` and for raw U+2028/U+2029 and rewrite any hit.

### 2. `client/src/net/connectionConfig.test.ts` (replace the file's tests) — lpg-1.2, 1.3, 1.4

The existing tests encode the env-shaped resolver (`resolveConnectionConfig({ uri?, db? }, isDev)`)
and cannot survive the signature change. Replace them; you own that deletion. Carry over every
behaviour that still holds, re-expressed over documents (list old → new in your report):
production refuses a dev-default `db` in any letter case and with surrounding whitespace; a
different name that merely starts with `monster-realm` is accepted (`monster-realm-playtest`,
`Monster-Realm-Playtest` returned with its case kept); `uri` and `db` are trimmed; a development
build accepts `monster-realm`.

- lpg-1.3 as ONE table (`it.each`), one row per rejection, each row run with `isDev` true AND
  false, asserting it throws an `Error` whose message starts with `shell document: <subject> `
  for the row's subject. Cover every class the criterion names and the contract's rules: `null`,
  an array, a string, a number, a boolean, a function; `connection` missing, `null`, an array, a
  string; `uri` missing, `db` missing; an unknown top-level key; an unknown key inside
  `connection`; `uri`/`db` of the wrong type (number, `null`, object); every rejected `uri`
  example in the contract; `db` empty, whitespace only, holding a space, `/`, `.`, `?`, a
  non-ASCII letter; `kind` values `'Test'`, `' test'`, `'public'`, `''`, `1`, `null`,
  `undefined` (own key present), `'toString'`, `'constructor'`, `'__proto__'`; an inherited
  `uri`/`db` (document built with `Object.create`).
- "Never substitutes a default": a rejected present document must throw with `isDev` true — it
  must not come back as the development defaults.
- Accepts: every accepted `uri` example, returned unchanged apart from the trim; a null-prototype
  document; `kind` each member of `TARGET_KINDS` returned as given.
- lpg-1.4: absent document with `isDev` true returns exactly the three development values; a
  valid document without `kind` returns `test` with `isDev` true and `private` with `isDev`
  false.
- lpg-1.2 (resolver half): `resolveConnectionConfig(undefined, false)` throws with subject
  `__MR_SHELL_CONFIG__`; a document whose `db` is `monster-realm`, `Monster-Realm`,
  `MONSTER-REALM` or `  monster-realm  ` throws with `isDev` false, subject `connection.db`, and
  is accepted with `isDev` true.
- Message hygiene: a refused `uri` with a sentinel such as `ws://user-SENTINEL:pw-SENTINEL@h` and
  a refused `db` sentinel never appear in the thrown message.
- A property test where it earns its place (for example: for any accepted document the result's
  `uri`/`db` equal the trimmed inputs; for any `db` string the resolver throws exactly when the
  trimmed value is outside the charset or, with `isDev` false, is the dev default).
- Single read: a `connection` whose `uri` is an accessor returning a valid URL on its first read
  and a different string afterwards resolves to the FIRST value.

### 3. `client/src/shell/config.test.ts` (edit) — lpg-1.1 and lpg-1.2

Keep the cases that do not concern the connection target as they are (game-core constants,
dev-log level and loggers, `WASM_READY_MS`, "registers no listeners"). Re-point the three that
do: `resolves URI and DB from the run env through resolveConnectionConfig`, and the two under
`shell config in a production build`.

- lpg-1.1: with the global set to a document and `VITE_STDB_URI` / `VITE_STDB_DB` stubbed
  (`vi.stubEnv`) to OTHER valid-looking values, a fresh import exposes `URI`, `DB` equal to the
  document's strings trimmed (give at least one of them surrounding whitespace and mixed case so
  "trimmed, otherwise unchanged" is observable) and `TARGET_KIND` equal to the document's kind.
  A second case: with the env names stubbed and NO document, a development import exposes the
  development defaults, not the env values.
- lpg-1.2: with `DEV` stubbed false and no document the import rejects with a message naming
  `__MR_SHELL_CONFIG__`; with a document whose `db` is the dev default (two letter cases) it
  rejects naming `connection.db`; with a valid non-default document it imports and exposes the
  document's `URI`, `DB` and, when the document omits `kind`, `TARGET_KIND === 'private'`.
- `afterEach` deletes the global.

### 4. `client/src/main.claimCode.test.ts` (edit) — lpg-1.8

The file recomputes the target from the env at module scope (`const { uri: URI, db: DB } =
resolveConnectionConfig({ uri: import.meta.env.VITE_STDB_URI … })`). Re-point it: the suite sets
the page global to a document before each boot and derives `URI`/`DB` from that document; the
existing `POLISH1-P4-*` cases keep their names, assertions and expected values and now run under
the document. Delete the global in `afterEach`.

Add the lpg-1.8 cases (read `client/src/net/claimCode.ts` for how the claim-code and
first-run-nudge keys derive from `(uri, db)`, and `client/src/main.ts` around lines 940–960 and
1130–1145 for where `main.ts` reads and writes them; find the connection-option callback or
handler that drives the first-run nudge and drive it):

- Under document A the options `connect` received have exactly A's `uri` and `db` (not the
  development defaults, which is what happens today).
- The claim-code key `main.ts` clears and the first-run-nudge key it reads and writes are the
  ones `claimCode` derives from A's pair: observe the storage calls with spies on
  `Storage.prototype.getItem` / `setItem` / `removeItem` and compare key strings.
- Boot again under document B (differing from A in BOTH `uri` and `db`), with A's claim code and
  nudge mark still stored: `connect` receives B's pair, and across the whole second boot and the
  same driven callbacks no storage call names a key of target A; A's stored values are unchanged.
- Make the cases bite on today's code: today `main.ts` ignores the global, so `connect` gets
  `ws://127.0.0.1:3000` / `monster-realm`. Choose A and B so neither equals those.

### 5. `client/src/indexShell.smoke.test.ts` (re-point ONE case, do not extend the file)

The case `mounts #app (inside #game-screen) and loads exactly one module script by src, with no
inline script` pins one script. Re-point it to the `client/index.html` contract above: two
scripts, both direct `<body>` children, adjacent; the first has `src="/shell-config.js"`, no
`type`, no `async`, no `defer` and no inline text; the second is the module script with a `src`
and no inline text. Rename the case so its name states the new behaviour. Touch nothing else in
the file.

### 6. `scripts/verify-build-hooks.test.mjs` (`node:test` + `node:assert/strict`) — lpg-1.6

Keep the three `findDevHooks` tests unchanged. Delete the two `bundleBakesDb` tests (the export is
removed) and the import of it; replace them with tests of the CLI contract over REAL directories:
`fs.mkdtempSync(path.join(os.tmpdir(), '…'))`, write the files, run
`spawnSync(process.execPath, [<absolute path to scripts/verify-build-hooks.mjs>, dir], { env: {
...process.env, MR_PLAYTEST_DB: '…' }, encoding: 'utf8' })`, assert `status` and the stderr/stdout
text named in the contract, and remove the directory afterwards. Cover: the minimal passing
directory passes (status 0, stdout starts `verify-build-hooks: OK`); `shell-config.js` missing;
it throws; it sets nothing; it sets a document without a string `connection.db`; it names another
database; another `.js` file contains the database name (and, separately, a nested
`shell-config.js` does); `index.html` contains the name; `index.html` lacks the script; a DEV
hook in a bundle file still fails with a valid shell config beside it. Use a database name other
than the default (so a hardcoded default fails) and keep at least 5 tests in the file. Resolve
the script path from `import.meta.url`, not from the working directory.

### 7. `client/e2e/shell-config.spec.ts` (new, Playwright) — lpg-1.7

Read `client/playwright.config.ts`, `client/e2e/stdb.ts`, and one or two existing specs for the
idioms (`client/e2e/ui-feedback.spec.ts`: one browser, one context, `ready()` polling
`window.__game()`, closing the context in `afterAll`; `client/e2e/golden.spec.ts` for how a
player joins and how presence is asserted). Rules of this suite: one worker, one shared
database, other files assert EXACT live populations, so close every context you open (the
server deletes the `player` row on disconnect) and leave no player behind; add no helper file;
import `ownerSql` / `sqlRows` from `./stdb` and `renderShellConfigScript` from
`../src/net/shellDocument`; no fixed sleeps, every wait polls a predicate with a bound.

The suite's server is `process.env.VITE_STDB_URI?.trim() || 'ws://127.0.0.1:3000'` and its
database `process.env.VITE_STDB_DB?.trim() || 'monster-realm'`.

Write exactly two tests (the orchestrator's ledger expects `2 passed`):

1. Absent database. Route `**/shell-config.js` to
   `renderShellConfigScript({ connection: { uri: <suite uri>, db: <a name that cannot exist,
   inside the charset>, kind: 'test' } })` (`contentType: 'text/javascript'`), open the page, and
   assert: `#status` text starts with `connect:` (poll); `__game()` exists with `identity === ''`
   and `ownAuthTile === null`; and the suite database's `player` table has the same row count as
   before the page opened (`ownerSql('SELECT * FROM player', …)` + `sqlRows`).
2. The dev server's own document. No routing. Assert the `/shell-config.js` response the page
   loaded is status 200 with a `text/javascript` content type; that the page's own
   `globalThis.__MR_SHELL_CONFIG__` deep-equals `{ connection: { uri: <suite uri>, db: <suite
   db>, kind: 'test' } }` (CI's env equals the development defaults, so without this the case
   would pass with the plugin missing); and that the client joins the suite's world (`__game()`
   identity non-empty and `ownAuthTile` non-null, and its `player` row exists in the suite
   database). Join the way the existing specs do.

### 8. Two comment re-points (no behaviour)

- `client/src/ui/boxView.test.ts` line 8 says `` `src/ui/boxView.ts` is in
  `client/vite.config.ts:103` `coverage.exclude` ``: name `coverage.exclude` in
  `client/vite.config.ts` without a line number.
- `client/src/main.a11yFocus.test.ts` line 919 says `coverage-excluded, client/vite.config.ts:97`:
  same re-point. Change only those words.

## Hard rules

- Tests prove behaviour by executing code. Never read a hand-written source file to assert its
  text (the one existing exception you touch is the `index.html` smoke case, re-pointed and not
  extended). No test of another test.
- Test names lead with the behaviour they prove. Do not put `lpg-1` or a criterion number in a
  new test's name, and do not rename existing tests other than the three re-pointed in
  `shell/config.test.ts` and the one smoke case.
- Comments you add or change state what the code does today, present tense. No slice, milestone
  or decision ids and no history wording ("used to", "no longer", "previously", "formerly",
  "before this", "replaces the old …", "was changed/moved/removed/renamed/added").
- The client lints with biome and typechecks test files with `tsc` (`client/tsconfig.json`
  includes `src` and `e2e`): no `any` without need, no unused imports or variables, 100-column
  lines, single quotes, semicolons, trailing commas, as the neighbouring files do.
- Write only the seven test files and the two comment lines named above. Do not create or edit
  any non-test file (`shellDocument.ts`, `connectionConfig.ts`, `config.ts`, `index.html`,
  `vite.config.ts`, `verify-build-hooks.mjs` are the implementer's).

## Report (your final message)

1. Per file: the tests you wrote or changed, the criterion each covers, and the failure you
   expect today (for example "import of `./shellDocument` fails to resolve", "expected
   `ws://a.example:1/` received `ws://127.0.0.1:3000`").
2. The old → new map for every test you deleted or replaced in `connectionConfig.test.ts`,
   `shell/config.test.ts` and `verify-build-hooks.test.mjs`, naming the surviving test.
3. The commands you want run, and anything you could not check without a shell (say "not
   syntax-checked" where true).
4. Any place the contract was ambiguous or the code disagreed with this brief.
