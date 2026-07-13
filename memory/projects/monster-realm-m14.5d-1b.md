---
name: monster-realm-m14.5d-1b
description: m14.5d-1b cure-item Use-Item battle UI — CureItem classify-by-data, bait-selector mirror, parseInt/NaN guard, data-cure-status DOM attribute, @ts-expect-error cleanup pattern
metadata:
  type: project
---

m14.5d-1b DONE — PR #164, client-only. ADR-0106 reservation released (unused — extends ADR-0047/0101).

**Key decisions & traps:**

- **Classify-by-data at two layers**: `main.ts` pre-filters (`def.cureStatus !== null`), model defends independently (`c.cureStatus !== null && c.count > 0`). `CureItem` types `cureStatus: string` (non-null) so the model check is vacuous at the type level — it exists for runtime defense against untyped callers (e.g., test fixtures via `as never`). Comment explains this.

- **Available in ANY ongoing battle**: NOT gated on `canRecruit`/wild. Deliberate divergence from bait (which is wild-only). Documented in both code and PR.

- **No bare use**: Unlike bait's "No bait" option, Use Item with empty select is a no-op. Guard: `parseInt(raw, 10)` + `!Number.isNaN(parsed)` (upgraded from `raw !== ''` per reviewer).

- **TS narrowing cast trap**: After `this.#cureSelectEl = null`, TypeScript narrows the field to `null` through any subsequent method call. Must cast `as HTMLSelectElement | null` to re-open the union before the null guard. Same pattern as `#baitSelectEl`.

- **`data-cure-status` attribute**: Set on each cure option via `opt.setAttribute('data-cure-status', item.cureStatus)` — the ADR-0047 classify-by-data DOM contract surface. Test asserts it.

- **@ts-expect-error cleanup**: Tester adds `@ts-expect-error` as RED markers. After implementation, all must be removed — test files are excluded from `tsconfig.json` ("exclude": ["**/*.test.ts"]) so stale suppressors won't fail CI tsc, but they hide future regressions and mislead readers. Remove them at GREEN.

- **`CureItem.cureStatus` type vs runtime**: Interface says `string` (non-null), but model filter checks `!== null`. This is intentional defense-in-depth; RT-CI-01 locks this invariant with 2 gating tests in `battleModel.test.ts`.

- **`SdkItemRowRow.cureStatus`**: `{ readonly tag: string } | undefined` (SpacetimeDB 2.6 decodes `Option<StatusKind>` as `{tag}` for Some, `undefined` for None). Mapped via `?.tag ?? null`.

- **`battleVMsEqual` must cover `cureItems`**: Length-first, then per-element (itemId, name, cureStatus, count). Count check is essential — inventory change must trigger re-render.

**Why:** closes EARS 14.5d-1; builds on m14.5d-1a (PR #162, ADR-0105) which added `cure_status: Option<StatusKind>` to `item_row` server-side.
