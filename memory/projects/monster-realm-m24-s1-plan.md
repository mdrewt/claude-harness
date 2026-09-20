# m24-s1 plan — i18n module, types only, zero call-site migration (M24 §2.3/§2.7, I18N-6..11)

Worktree `.claude/worktrees/m24-s1` (branch feat/m24-s1-i18n-module @ 0bbb0fc). `touches:` = `client/src/ui/i18n/**` (new) + `docs/adr/0256-*.md` + one ARCHITECTURE.md bullet. Solo workflow + standard lenses.

## 1. Design
- **Resolver state** = frozen registry `CATALOGS = Object.freeze({ en: CATALOG_EN })` + module-level `let current = 'en'`; `setLocale(locale)` throws on an unregistered locale (reject-not-clamp, ADR-0205 D4; state unchanged on throw); `currentLocale()`. `t`/`tf` read `CATALOGS[current]`. Zero IO (no navigator/document/URL — S6). Rejected: factory (SHAPE-05 pins a named module `t`); clamping to `en` (unwired-looks-wired vacuity).
- **a11y fallback**: `export type A11yKey = never` in messageIds.ts with a FOLLOW-UP comment. Do NOT import a11yCopy.ts — its `Readonly<Record<string,string>>` makes `keyof` = `string` and would widen `t`.
- **Compile proof (I18N-6..9)** = mechanism (A), ADR-0205 D6 precedent (`overlayRegistry.test.ts:1109-1168`): one vitest file writes BAD+GOOD fixtures to `mkdtempSync`, spawns `client/node_modules/.bin/tsc --noEmit --strict --noUnusedLocals --noUnusedParameters --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck <files>` ONCE (cwd = tmpdir), hand-parses `name.ts(l,c): error TSnnnn` via indexOf, asserts exact code SETS per BAD fixture + zero diagnostics on GOOD + a control-red fixture (TS2322) proving the spawn works. `@ts-expect-error` rejected (not house style; accepts any error at the line).
- **Key grammar deviation** (ADR-0256 D5): segments `[a-z][a-zA-Z0-9]*`, ≥2 segments — spec §5.4 `[a-z0-9]+` rejects its own `chrome.helpHint`; M23 resolved the identical bug (ADR-0205 D5). `Battle.HPLine` still fails.

## 2. Files (`client/src/ui/i18n/`)
**messageIds.ts** (types only, no imports): `MessageId` literal union; `interface MessageParams { 'chrome.status.disconnected': { readonly where: string } }`; `ParamMessageId = keyof MessageParams`; `PlainMessageId = Exclude<MessageId, ParamMessageId>`; `A11yKey = never`; `Catalog = { readonly [K in MessageId]: K extends ParamMessageId ? (p: MessageParams[K]) => string : string }`; type-level asserts (ParamMessageId ⊆ MessageId; no `a11y.`-prefixed ParamMessageId).
**catalog.en.ts**: `export const CATALOG_EN: Catalog = Object.freeze({ … } satisfies Catalog)` (`satisfies` restores excess-property check under generic freeze). Every entry preceded by `// @desc:` (≥10 non-ws). Seeded `chrome.*` keys (source cited for S5/S6):
| key | en value | shape |
|---|---|---|
| chrome.helpHint | Press ? for help · click or M for menu (38≤47) | plain, index.html:143 |
| chrome.help.title | Controls & Goals | plain, index.html:94 |
| chrome.rename.submit | Rename | plain, index.html:60 |
| chrome.tradePropose.submit | Offer | plain, index.html:80 |
| chrome.status.exportBlocked | data export: download blocked by the browser | plain, main.ts:582 |
| chrome.status.privacyOverlayBusy | privacy: close the other overlay first | plain, main.ts:651 |
| chrome.status.disconnected | (p) => `${p.where}: disconnected — try again` | PARAM, main.ts:961 |
| chrome.status.contentStale | content out of date — reload | plain, main.ts:1040 |
| chrome.status.bugBundleBlocked | bug bundle: download blocked — copy from console | plain, main.ts:2442 |
| chrome.status.healUnavailable | heal: no heal location available | plain, main.ts:2524 |
No plural key: no chrome string carries a count (honest minimum; `oneOther`/`selectPlural` proven in plural.test.ts + I18N-9 fixture). Spec's "main.ts has 4" measured as 6 reportError literals — S6 re-counts.
**resolver.ts**: `CATALOGS`, `DEFAULT_LOCALE='en'`, `setLocale`, `currentLocale`, `t(key: A11yKey | PlainMessageId): string` (exactly one declaration, 1 param, no overload/rest), `tf<K extends ParamMessageId>(key: K, params: MessageParams[K]): string`. Runtime backstops throw naming the key (Object.hasOwn miss; t on fn-valued; tf on string-valued) — never return key or ''.
**plural.ts**: `PluralForms = Readonly<Record<Intl.LDMLPluralRule,string>>` (never Partial); `selectPlural(locale,n,forms) = forms[new Intl.PluralRules(locale).select(n)]`; `fmtNumber`; `oneOther(one, other)` (zero/two/few/many ← other, frozen); `cldr` identity. No cache (YAGNI).
**locale.ts**: `negotiateLocale(requested, available)`: RFC 4647 lookup, per-tag chain in order, case-insensitive, truncation via `lastIndexOf('-')` loop, returns the `available` spelling; no match / empty → `'en'`; `available` lacking `en` → throw. `isRtl(locale)`: primary subtag ∈ frozen Set(ar,he,fa,ur,ps,yi). Zero regex literals in all five modules.

## 3. Tests (literal `describe(`; names `m24s1 <TAG>:`)
- `i18nTypes.compile.test.ts` — memoised compileAll(); fixtures control-red, good (imports every export, `const total: Catalog = CATALOG_EN`, `t('chrome.helpHint')`, `tf(...,{where:'x'})`, `selectPlural('en',1,oneOther('a','b'))`, `cldr({six})`, `const sig: (key: PlainMessageId)=>string = t`), bad-omit (TS2741 naming key), bad-partial (TS2322), bad-params-missing (TS2345 — missing prop on a fresh object-literal arg reports on the arg), bad-params-type (`where: 42` → **TS2322**, measured: a present-but-wrong-typed prop reports on the property value), bad-a11y-tf, bad-plain-tf, bad-param-t (TS2345), bad-plural (TS2345), bad-t-wide (TS2322). Any diagnostic under `/i18n/` abs path or good.ts → fail with full output. Fixture bodies by '\n' concat, no backticks.
- `plural.test.ts` I18N-10: ru 0/1/3/5 → many/one/few/many; en 1→one, 0/2→other; ar six categories; oneOther fills 4 dead cats with other; cldr same ref; fmtNumber('de',1234.5)→'1.234,5'.
- `locale.test.ts` I18N-11: ['fr-CA']→fr; ['de']→en; []→en; ['FR-ca']→fr; ['fr'],['en','FR']→'FR'; exact beats truncation; per-tag chain; ['fr'],['fr'] throws; isRtl.
- `resolver.test.ts`: every plain key resolves via t; tf interpolates; setLocale('xx') throws + state pinned; Object.keys(CATALOGS) = ['en']; miss/prototype/t-on-param/tf-on-plain throw; t.length===1, tf.length===2, exactly one `export function t(` in stripped source (SHAPE-05 runtime side). afterEach setLocale('en').
- `catalog.test.ts`: @desc scan of source, key grammar charCode scan, helpHint ≤47, source-entry count === Object.keys count, isFrozen, no prototype names, values non-empty; SHAPE-06 over each catalog.<locale>.ts in dir with in-memory BAD fixture (ru + oneOther) proving the checker bites.

## 4. Build order
1 compile test → 2 plural → 3 locale → 4 resolver → 5 catalog tests (all RED) → 6 impl messageIds → plural → locale → catalog.en → resolver; `just client-typecheck`, biome, vitest → 7 ADR-0256 + ARCHITECTURE bullet + `just adr-digest` → `just ci`.

## 5. Ledger X1..X10 (see gates file). X8/X9 counts pinned at build time (vitest -t zero-match exits 0).

## 6. Proof-of-teeth: Partial<Catalog> → bad-omit no TS2741; t(key:string) → bad-t-wide compiles; tf<K extends string> → bad-a11y-tf/bad-plain-tf compile; oneOther fills with one → PLURAL-CTORS; selectPlural ignores locale → ru,3→other; PluralForms Partial → bad-plural compiles; negotiateLocale returns requested[0] / never truncates / case-sensitive → I18N-11 cases; missing @desc → SHAPE-01; setLocale clamps / t returns key → RESOLVER throws; freeze/satisfies dropped → isFrozen + count parity + typecheck; tsc spawn broken → control-red.

## 7. Anti-patterns: new RegExp / regex literals in modules; importing a11yCopy; registerCatalog test hook; template-literal fixtures; "non-zero errors" assertions; phantom plural key; try/catch or per-call en fallback in t/tf; `Amends:` on ADR-0256 (use Extends: 0205, 0224).
## 8. Follow-up flags: (a) a11yCopy.ts must export literal-typed A11Y_COPY_EN → flip A11yKey; (b) S6 consumes negotiateLocale/setLocale/isRtl/currentLocale; (c) S7 must edit resolver.ts CATALOGS — absent from S7 touches; (d) S2 lint; (e) spec §5.4 SHAPE-03 camelCase correction upstream. Hidden deps required by S1: none.

## 9. Plan-review amendments (reviewer + red-team, 2026-09-20 — all adopted)
- **Fixture discipline (red-team H1/H3, measured):** one tsc spawn shares GLOBAL scope across script-mode files → every fixture MUST be a module (has an import or `export`) and every binding exported with a fixture-unique name (`export const controlRed: number = 'nope'` → clean single TS2322); diagnostics are bucketed by basename before set-comparison; `--noUnusedLocals/--noUnusedParameters` are KEPT (they mirror client/tsconfig.json:7-8, unlike the ADR-0205 precedent) so a TS6133/TS6196 in a fixture is a fixture bug the exact-set assertion exposes.
- **messageIds.ts type asserts must be `export`ed** (red-team H4: the real `client-typecheck` runs noUnusedLocals over src/**; an unexported alias is TS6196). Keep ONE: `export type AssertNoA11yParamKey = [Extract<ParamMessageId, \`a11y.${string}\`>] extends [never] ? true : never;` — the `ParamMessageId ⊆ MessageId` assert is dropped (/simplify): the resolver's `CATALOGS[current][key]` indexing already fails to compile if a MessageParams key is not a MessageId.
- **plural.test.ts:** assert `oneOther('a','b')` `toEqual({zero:'b',one:'a',two:'b',few:'b',many:'b',other:'b'})` directly (M5); ru/ar fixtures use six DISTINCT strings (M6); `selectPlural` REJECTS a locale ICU has no plural data for — `Intl.PluralRules.supportedLocalesOf([locale]).length === 0` → throw (M10: `new Intl.PluralRules('xx')` silently resolves to en-US; reject-not-clamp) — test `selectPlural('xx', 3, forms)` throws. Same guard in `fmtNumber` via `Intl.NumberFormat.supportedLocalesOf`.
- **locale.test.ts:** add a ≥2-truncation case `['zh-Hant-TW'], ['zh','en']` → `'zh'` (M7); `isRtl` enumerates all six codes + `ar-SA`/`AR-EG` region forms + `en`/`en-US`/`''` false (M8).
- **catalog.test.ts scans:** `@desc` is ADJACENCY-pinned — the contiguous `//` comment block immediately above each entry line must contain a `// @desc:` line with ≥10 non-ws chars after the marker (L11, co-occurrence hole); entry lines are recognised by line-start `'<key>':` (quoted key + colon at line start after indentation) so a key echoed in a comment never counts (L13); the grammar scanner gets boundary fixtures `chrome.`, `.chrome`, `chrome..status`, `a.b` (valid: ≥1 char segments), `Battle.HPLine`, `chrome.help_hint` (L12).
- **Runtime residual (M9, declared not fixed):** a JS caller passing `{where: undefined}` renders `undefined: disconnected`; typed call sites cannot; recorded in ADR-0256 as a named residual, no runtime param-type validation (YAGNI).
- **resolver.ts style (L14):** template literals in throw messages, no `any`.
- **compile test comment (L15):** `bad-t-wide` is the transitive oracle for the a11yCopy-import widening hazard — comment says so.
- **ADR-0256 additions (reviewer M1/M3):** D4 records the `A11yKey = never` deviation from §2.8's "imports A11Y_COPY_EN if it exists" as a decision (the export does not exist; importing `a11yCopy` widens to string); D7 records `MessageParams` as the primary hand-written table with `ParamMessageId = keyof MessageParams` (spec prose has the inverse derivation; isomorphic, one table not two).
- **Follow-up flag (reviewer M2):** spec §4.1's `43+77+45+4 = 169` closure assumes main.ts has 4 chrome strings; measured 6 `reportError` literals (main.ts:582,651,961,1040,2442,2524) — S2's planner must re-measure before seeding `HARDCODED_CEILING`; S6 migrates 6 not 4.
- vitest: resolver.test.ts must never be `.concurrent` (module-level locale cell; per-file isolation only).
