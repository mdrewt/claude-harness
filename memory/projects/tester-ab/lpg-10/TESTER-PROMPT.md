# Tester brief — lpg-10 (single-player and friends worlds: no telemetry, no account token)

You are the `tester` for slice `lpg-10` of Monster Realm. You write the gating tests from the
acceptance criteria below, before any implementation exists. You do not implement the feature and
you have no shell: the orchestrator runs every suite after you finish and proves each test fails
for the right reason.

**Worktree (read and write files here, by absolute path, with Read/Grep/Glob/Write/Edit only):**
`/home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/lpg-10`

Every repo path below is relative to that worktree. Standard that binds:
`/home/mdrewt/.claude/harness/standards/testing-tdd.md` (read it first; it is short).

## What the slice does

The client learns what kind of server it joined from the shell document the page's host sets
before the client module runs (`client/src/net/shellDocument.ts`: `TARGET_KINDS = ['official',
'test', 'local', 'private']`, `TargetKind`). `client/src/shell/config.ts` resolves the document
at import and exports `URI`, `DB` and `TARGET_KIND`. Nothing reads `TARGET_KIND` yet.

Today `client/src/main.ts` resolves the telemetry config at module scope with
`resolveTelemetryConfig({ endpoint: VITE_MR_OTLP_ENDPOINT, intervalMs: VITE_MR_OTLP_INTERVAL_MS },
import.meta.env.DEV, Math.random())` (`client/src/observability/config.ts`), and `main()` calls
`startClientTelemetry(TELEMETRY_CONFIG, { loadSdk: loadOtelSdk, … })`
(`client/src/observability/telemetry.ts`; a disabled config never calls the loader). It passes
`connect({ …, authIssuer: import.meta.env.VITE_MR_OIDC_ISSUER ?? '', authClientId:
import.meta.env.VITE_MR_OIDC_CLIENT_ID ?? '', … })`. So a build that sets the endpoint sends
telemetry from every connection, and a build that sets the issuer offers account sign-in toward
every server, whatever its kind.

After this slice: `resolveTelemetryConfig` takes the target kind as a required fourth argument
and enables telemetry only for `official` and `test`; `main.ts` passes `TARGET_KIND` to it and,
for a `local` or `private` target, passes `connect` an empty `authIssuer` and `authClientId`.

## Acceptance criteria (EARS, verbatim from the spec)

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

Which of these can fail today: lpg-10.1, lpg-10.3 and the `local`/`private` half of lpg-10.5 fail
on the real defect. lpg-10.2, lpg-10.4 and the `official`/`test` half of lpg-10.5 describe
behaviour the slice must keep: at run time they pass today (lpg-10.2's four-argument calls fail
only the typecheck today), and the orchestrator shows each biting once against a deliberate local
break that is never committed (a gate that disables every kind; one that empties the issuer for
every kind). Write them all.

## Contracts

Test files and what each calls:

| Test file (worktree-relative) | Kind | Calls |
|---|---|---|
| `client/src/observability/config.test.ts` | existing, vitest, edited | `./config` (`resolveTelemetryConfig` and the four interval constants), `../net/shellDocument` (`TARGET_KINDS`, type `TargetKind`) |
| `client/src/main.targetKindGate.test.ts` | new, vitest, `// @vitest-environment happy-dom` | `./main` (a fresh boot per case), `../test-util/mainBootHarness` (imported, never edited), `./net/shellDocument` (`SHELL_CONFIG_GLOBAL`, `TARGET_KINDS`, types `ShellDocument`, `TargetKind`), `./observability/telemetry` (mocked: the real module with `loadOtelSdk` replaced) |

### `client/src/observability/config.ts` (exists; the signature gains one parameter)

```ts
import type { TargetKind } from '../net/shellDocument';

export type TelemetryConfig =
  | { readonly kind: 'disabled'; readonly reason: string }
  | { readonly kind: 'enabled'; readonly endpoint: string; readonly exportIntervalMs: number };

export interface TelemetryEnv {
  readonly endpoint?: string;
  readonly intervalMs?: string;
}

export function resolveTelemetryConfig(
  env: TelemetryEnv,
  isDev: boolean,
  jitter: number,
  kind: TargetKind, // REQUIRED: not optional, no default
): TelemetryConfig;
```

(`TelemetryConfig`, `TelemetryEnv` and the exported constants `OTLP_METRICS_PATH`,
`TELEMETRY_INTERVAL_MIN_MS`, `TELEMETRY_INTERVAL_MAX_MS`, `TELEMETRY_INTERVAL_DEFAULT_MS`,
`TELEMETRY_JITTER_FRACTION` are unchanged. Note the two meanings of `kind`: the fourth PARAMETER
is the target kind; the RESULT's `kind` member is `'disabled' | 'enabled'`.)

- Target kind `official` or `test`: exactly the value today's three-argument resolver returns for
  the same `env`, `isDev` and `jitter` (every rule the existing cases in this file pin).
- Target kind `local` or `private` — that is, every member of `TARGET_KINDS` other than `official`
  and `test`: `{ kind: 'disabled', reason }`, where `reason` contains that target kind's name as a
  whole word and contains no other member of `TARGET_KINDS` as a whole word. The result does not
  depend on `env`, `isDev` or `jitter`: it is the same value (deep-equal, same `reason` string)
  for an unset endpoint, an empty one, a malformed one and a valid `https:` origin, with any
  interval, in dev and prod, with any jitter.
- A run-time value outside `TargetKind` (reachable only through a cast, or by a caller that omits
  the argument, which is `undefined` at run time): `disabled` with a non-empty reason. It never
  throws.
- It never writes to the console, for any input (as today).

### `client/src/main.ts` (exists; observed only by booting it)

- Module scope: the telemetry config is `resolveTelemetryConfig({ endpoint:
  import.meta.env.VITE_MR_OTLP_ENDPOINT, intervalMs: import.meta.env.VITE_MR_OTLP_INTERVAL_MS },
  import.meta.env.DEV, Math.random(), TARGET_KIND)`.
- `main()` calls `startClientTelemetry(TELEMETRY_CONFIG, { loadSdk: loadOtelSdk, buildSha, hints })`
  once, before `connect(...)`, never awaited. `loadOtelSdk` is the named export of
  `./observability/telemetry` that `main.ts` imports; `startClientTelemetry` (same module) calls
  `deps.loadSdk(init)` exactly when the config is enabled, synchronously before its first
  `await`, with `init: TelemetryInit = { exporterUrl: <config endpoint> + '/v1/metrics',
  exportIntervalMillis, resourceAttributes, temporality }`. The loader returns
  `Promise<TelemetryMeter>` (`{ createHistogram(spec): Histogram; createCounter(spec): Counter }`,
  `Histogram = { record(value, attributes): void }`, `Counter = { add(value, attributes): void }`).
- `connect(opts: ConnectionOptions)` (`./net/connection`):
  - target kind `local` or `private`: `opts.authIssuer === ''` and `opts.authClientId === ''`;
  - target kind `official` or `test`: `opts.authIssuer` is `import.meta.env.VITE_MR_OIDC_ISSUER ??
    ''` and `opts.authClientId` is `import.meta.env.VITE_MR_OIDC_CLIENT_ID ?? ''`.
  - `opts.authRedirectUri` is not part of this contract: assert nothing about it.
  - `opts.uri` / `opts.db` are the document's (already covered by `main.claimCode.test.ts`).

### The shell document on the page global (exists, from lpg-1)

`main.ts` imports `./shell/config`, which at import reads the OWN property
`globalThis[SHELL_CONFIG_GLOBAL]` (`'__MR_SHELL_CONFIG__'`) and resolves it with
`resolveConnectionConfig(doc, import.meta.env.DEV)`. A valid document is exactly
`{ connection: { uri, db, kind? } }`: `uri` an absolute `ws:`/`wss:` URL whose path, if any, ends
in `/` (for example `wss://alpha.example:4443/`), `db` matching `[A-Za-z0-9_-]+`, `kind` a member
of `TARGET_KINDS`. With no document a development build (vitest: `import.meta.env.DEV` is true)
resolves the development defaults with kind `test`; a document that omits `kind` is also `test`
under vitest. So every case that means `local` or `private` must name the kind in the document.

## Measured facts you can rely on

- `client/src/main.shopBalance.test.ts` lines 1-118 is the smallest boot precedent built on
  `client/test-util/mainBootHarness.ts`: `vi.hoisted` state, `vi.mock` of the wasm pkg
  (`wasmPkgWalkingMock({ interact: () => [] })`), `./net/connection`
  (`connectionRecordingMock(H)`, which records the options in `H.connectOpts`),
  `./observability/telemetry` and `./render/world` (`worldRendererMock()`), a
  `recordListeners`/`teardown` pair (main.ts registers window and document listeners at module
  scope; a second boot in one file needs the first one's listeners detached), and a boot that
  mounts the real `index.html` shell, stubs rAF, calls `vi.resetModules()`, awaits
  `import('./main')` and polls with `vi.waitFor` until `H.connectOpts` is set.
- `client/src/main.claimCode.test.ts` lines 182-218 shows a boot under a shell document: it
  assigns `(globalThis as Record<string, unknown>)[SHELL_CONFIG_GLOBAL] = doc` before the import.
- The harness's `telemetryMock` replaces `startClientTelemetry` with a no-op and makes
  `loadOtelSdk` throw. Do NOT use it in the new file: with it "the loader is never called" is
  true for every implementation. Mock the module yourself, keeping the real
  `startClientTelemetry`:

  ```ts
  vi.mock('./observability/telemetry', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./observability/telemetry')>()),
    loadOtelSdk: H.loadSdk, // a vi.fn created inside vi.hoisted
  }));
  ```

  The spy must resolve a meter whose `createHistogram` and `createCounter` return instruments with
  no-op `record` / `add` (main.ts calls `recordWasmReady` and `setZone` on the facade once it
  resolves).
- `vi.stubEnv(name, value)` changes `import.meta.env` for modules imported afterwards
  (`client/src/shell/config.test.ts` uses it the same way); `vi.unstubAllEnvs()` restores it.
  Stub BEFORE `vi.resetModules()` and the `./main` import: `main.ts` reads
  `VITE_MR_OTLP_ENDPOINT` at module scope.
- Client test files are typechecked by `npm --prefix client run typecheck` (`tsc --noEmit` over
  `src`), and linted by biome. An unused `// @ts-expect-error` is a compile error (TS2578).
- A valid PROD-and-DEV telemetry endpoint is an absolute `https:` origin with no path, query,
  fragment or userinfo (this file already uses `https://otlp.localhost:8443` and
  `https://127.0.0.1:8443`). Keep the file's existing rule about insecure-scheme literals: build
  `http` + `://` and `ws` + `://` from parts as the file does (the header note says why). In the
  NEW boot file a `wss://` document `uri` is fine, and so is an `https://` endpoint.

## Work, file by file

### 1. `client/src/observability/config.test.ts` (edit) — lpg-10.1 and lpg-10.2

lpg-10.2 — keep every existing case, with its assertions unchanged, and pass the target kind as
the fourth argument. Each existing case must run under BOTH `official` and `test` (for example an
outer loop over the two allowed kinds that wraps the three existing `describe` blocks, the kind
appearing in each block's title so failures say which kind broke). Do not weaken, merge or
delete an existing assertion. Update the header comment so it describes the four-parameter
contract in the present tense.

lpg-10.1 — add cases that prove, FOR every member of `TARGET_KINDS` other than `official` and
`test` (derive the gated list by filtering `TARGET_KINDS` against the two allowed names, so a
kind added to `TARGET_KINDS` later is tested as gated until someone classifies it):

- with a valid `https:` origin (the inputs that resolve `enabled` under `official`: assert that
  control in the same test so the fixture is known-good), in dev and in prod, the result is
  `disabled`;
- the `reason` names the target kind as a whole word and names no other member of `TARGET_KINDS`
  as a whole word, and two different gated kinds get different reasons;
- the result is the same value for every endpoint and interval input: a property over arbitrary
  `endpoint` (include `undefined`, `''`, malformed strings, `fc.webUrl()`, the valid https
  origins and the dev loopback), arbitrary `intervalMs`, both `isDev` values and arbitrary
  `jitter`, each deep-equal to the result for the valid `https:` origin (fixed seed, as the
  file's other properties do);
- a value outside `TargetKind`, passed through a cast, resolves `disabled` with a non-empty
  reason and does not throw, even with a valid `https:` origin;
- "the `kind` parameter SHALL be required": a three-argument call under a `// @ts-expect-error`
  comment (the typecheck fails if the parameter is optional or has a default, because the
  directive is then unused), and the same call's run-time result is `disabled` even with a valid
  `https:` origin;
- the resolver still writes nothing to the console for any target kind (extend the existing
  console property to draw the kind from `TARGET_KINDS`).

### 2. `client/src/main.targetKindGate.test.ts` (new) — lpg-10.3, lpg-10.4, lpg-10.5

Boot the REAL `main.ts` once per case through `mainBootHarness.ts` (see the precedent above),
with the real views. Each boot: put the shell document on the page global, stub the env, reset
modules, import `./main`, wait until the mocked `connect` has recorded its options.

Hold these in the file:

- One expectation table typed `Record<TargetKind, …>` (which kinds get telemetry and sign-in), and
  cases generated from `TARGET_KINDS`, so adding a kind is a compile error here until it is
  classified. The allowed set is `official` and `test`; every other kind is gated.
- Every case names its `kind` in the document. Use a `uri`/`db` that is not the development
  default.
- lpg-10.3 / lpg-10.4 stub `VITE_MR_OTLP_ENDPOINT` to a valid `https:` origin (and leave
  `VITE_MR_OTLP_INTERVAL_MS` unset or set, your choice). For `official` and `test`: the loader
  spy was called exactly once and its argument's `exporterUrl` is exactly the origin followed by
  `/v1/metrics`. For `local` and `private`: the loader spy was never called. Assert "never
  called" only AFTER `connect` was observed (main.ts starts telemetry before it calls `connect`,
  and the loader call is synchronous inside `startClientTelemetry`), and let the facade settle
  (flush pending microtasks) before the count is read. The `official`/`test` cases in the same
  file, under the same stubs and the same mock, are what proves the spy is the binding `main.ts`
  imports and that the env stub took effect.
- lpg-10.5 stubs `VITE_MR_OIDC_ISSUER` and `VITE_MR_OIDC_CLIENT_ID` to two DIFFERENT non-empty
  values. For `local` and `private`: `authIssuer` is `''` and `authClientId` is `''`, asserted
  separately. For `official` and `test`: each equals its stubbed value, asserted separately.
- Clear the loader spy and the recorded connect options before every boot. After every test:
  delete the page global, `vi.unstubAllEnvs()`, detach the boot's recorded listeners, restore
  mocks and globals, empty the body. A leaked global or env stub would boot the next case under
  the wrong kind.
- No fixed sleeps: wait on a predicate with a bound.

## Hard rules

- Tests prove behaviour by executing code. Never read a hand-written source file to assert its
  text. No test of another test.
- Test names lead with the behaviour they prove. Do not put `lpg-10` or a criterion number in a
  new test's name. Do not rename existing tests beyond what the outer kind loop needs.
- Comments you add or change state what the code does today, present tense. No slice, milestone
  or decision ids and no history wording ("used to", "no longer", "previously", "formerly",
  "before this", "replaces the old …", "was changed/moved/removed/renamed/added", "now").
- The client lints with biome and typechecks test files with `tsc`: no `any` without need, no
  unused imports or variables, 100-column lines, single quotes, semicolons, trailing commas, as
  the neighbouring files do.
- Write only the two test files named above. Do not create or edit any non-test file
  (`observability/config.ts` and `main.ts` are the implementer's) and do not edit
  `client/test-util/mainBootHarness.ts`.

## Report (your final message)

1. Per file: the tests you wrote or changed, the criterion each covers, and for each whether you
   expect it red today and with what failure (for example "expected 'disabled', received
   'enabled'"), or green today (preserved behaviour) and which wrong implementation it kills.
2. Confirmation that every pre-existing assertion in `config.test.ts` survives unchanged, or the
   exact list of those you altered and why.
3. The commands you want run, and anything you could not check without a shell (say "not
   syntax-checked" where true).
4. Any place the contract was ambiguous or the code disagreed with this brief.
