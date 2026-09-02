# m22-s8 — plan (M22 S8, client half of the privacy surface)

**Branch:** `slice/m22-s8` · **Worktree:** `.claude/worktrees/m22-s8` · **ADR:** 0231
**Spec:** `specs/monster-realm-v2/M22-privacy-compliance.spec.md` §4.3/§4.5 (grace, cancel),
§5 (export + chunking), §7.2 S8 row, §7.3 cross-slice contracts, §7.4 PRV1-1/3/4/11/12/13.

## Right-sizing (decided in the plan phase, before any test was written)

The S8 row's full scope is: the client data path for the S2/S4 surfaces + the pure decision
cores + a `ui/privacyView.ts` overlay + `main.ts` wiring. Two measurements forced a split:

1. **The overlay half is a ~17-file mechanical fan-out.** `OR-MANIFEST-COMPLETE`
   (`client/src/ui/overlayRegistry.test.ts:184`) pins `OVERLAY_IDS` to the EXACT
   `client/src/ui/*View.ts` file set (minus two by-name exemptions), so one new `*View.ts`
   forces `overlayRegistry.ts`, `menuModel.ts`, `menuView.ts`, `a11yCopy.ts`,
   `overlayA11yWiring.test.ts`, `index.html`, ~20 sites in `main.ts` and ~30 in
   `main.wiring.test.ts`. That is a second reviewable PR, not a hunk.
2. **The export data path needs an edit OUTSIDE `touches: client/**`.**
   `evals/monster-privacy.eval.mjs:1292-1319` `EXPECTED_SUBSCRIPTIONS` is an exact-set
   allowlist over connection.ts's one `.subscribe([...])` array; adding
   `'SELECT * FROM my_export_bundle'` reds `[S/set]` unless that array gains the literal too.
   The eval's own text says this is meant to be "a deliberate edit … in the PR that
   privacy-reviews it" — i.e. it is a *designed companion*, not a surprise — but it is still
   outside this slice's declared path-set, so this run does not touch it.

**This slice therefore ships the smallest coherent mergeable increment:** the
`terminal_at_ms` data path (which is reachable TODAY through the already-wired `my_account`
view) plus the two PURE decision cores that hold every rule this milestone's client half
owns. The export *transport* (converter + store collection + subscription +
`EXPECTED_SUBSCRIPTIONS`) and the overlay/wiring are one coherent follow-up, **m22-s8b**.
Nothing shipped here is dead-ended: `terminalAtMs` flows end-to-end on merge, and both pure
cores are the frozen seam s8b builds against.

## Files

| File | Change |
|---|---|
| `client/src/net/rowConvert.ts` | `SdkAccountRow` + `accountRowToStore` gain `terminalAtMs: bigint \| undefined` — pass-through, **never `?? 0n`** (ADR-0154 broke-vs-dark). REACHABLE today. |
| `client/src/net/store.ts` | `StoreAccount` gains `terminalAtMs`. REACHABLE today. |
| `client/src/ui/privacyModel.ts` | NEW, pure: `deriveDeletionCountdown` + the `privacyStep` reducer + `buildPrivacyViewModel`. |
| `client/src/ui/exportAssembly.ts` | NEW, pure: `assembleExportBundle` — request-wide chunk assembly. |
| `client/src/net/rowConvert.test.ts` | RC-AC-04a key set 8→9; RC-AC-04b optional-present 3→4; broke-vs-dark cases; `makeSdkAccountRow`. |
| `client/src/net/store.test.ts` | contract comment block + `makeAccount` factory + a `terminalAtMs` tooth. |
| `client/src/ui/privacyModel.test.ts`, `client/src/ui/exportAssembly.test.ts` | NEW, tester-owned. |
| `docs/adr/0231-*.md`, `ARCHITECTURE.md` | The split + the two contract readings below. |

## The two contract readings the ADR must record (spec §7.3: build verbatim, no re-derivation)

1. **`chunk_index`/`total_chunks` are REQUEST-WIDE, not per-table** —
   `server-module/src/privacy.rs:1092-1094` ("chunk_index is globally contiguous 0..N-1 in
   input order and total_chunks … is the request's whole chunk count") and the insert loop at
   `:1519-1531`. PRV1-13's prose ("split *that table's* payload") reads per-table; the shipped
   producer is request-wide. A per-table completeness check passes on real data by accident.
2. **`exportable` is a SERVER-side axis.** `request_data_export` filters
   `DATA_LIFECYCLE_MANIFEST` on `entry.exportable` (`privacy.rs:1496-1498`) before any row is
   written, so a non-exportable table can never appear as a chunk. The client core surfaces
   exactly what arrived and applies **no allowlist of its own** — a client-side filter would
   be a second SSOT for PRV1-12.

## Post-review revisions (reviewer + red-team, plan phase — 2 BLOCKERs, 8 MAJORs, 13 attacks)

The interfaces below are the REVISED ones. Changes from the first draft, each with its reason:

- **B1 (BLOCKER, reviewer).** `PendingDeletion` with an ABSENT `deletionRequestedAtMs` first mapped
  to `'unknown'`, which made `cancelPermitted` false — the client would refuse a cancel the server
  ACCEPTS (`needs_cancel_write(PendingDeletion)` is true, `server-module/src/accounts.rs:233-235`,
  reached at `:820`). That is the plan's own banned second-SSOT sin in the irreversible direction,
  and it is reachable because `accountRowToStore` is deliberately fail-soft on degenerate rows
  (`client/src/net/rowConvert.ts:598-601`). FIXED: the phase comes from `status`; a missing
  timestamp only makes the DEADLINE unknown, never the permission.
- **B2 (BLOCKER, reviewer).** The reducer state carried no phase, so nothing could disarm an armed
  delete confirmation when the account went terminal. FIXED: the derived `DeletionCountdown` lives
  IN the state, `account-changed` is its sole writer, and it clears `confirm` whenever the phase
  leaves `'active'` — illegal states unrepresentable rather than merely guarded.
- **RT1 (HIGH, red-team, measured).** `if (terminalAtMs)` passes every planned terminal tooth while
  inverting PRV1-4 at `terminalAtMs === 0n` (a valid i64). And the codebase has already seen `null`
  from an SDK Option column (the `claimedFrom` guard, `rowConvert.ts:611-614`) — a raw `null` would
  make `!== undefined` true for EVERY account and kill delete AND cancel globally. FIXED: an
  explicit `!== undefined && !== null` marker predicate, `0n` IS terminal, and `accountRowToStore`
  normalises a `null` `terminalAtMs` to `undefined`.
- **RT7 (MED, red-team, measured).** `deriveDeletionCountdown` was claimed total but throws
  `TypeError: Cannot mix BigInt and other types` on a non-bigint `graceMs`/`nowMs` — and s8b puts
  this call in a per-frame tick, so the failure mode is a dead render loop. FIXED: non-bigint or
  missing inputs degrade to `'unknown'`, never throw.
- **RT6 (MED-HIGH, red-team).** `message === SERVER_ALREADY_DELETED_MESSAGE` is DEAD at the real
  call site: `client/src/ui/statusModel.ts:38-58` `reduceErrorMessage` returns
  `` `${where}: ${message}` ``. FIXED: match with `endsWith`, which fires on BOTH the raw and the
  prefixed shape, plus a negative tooth proving an unrelated reject does NOT reach the terminal
  notice.
- **M6 + RT11 (compliance).** `buildPrivacyViewModel` and the feedback strings shipped
  player-facing COPY in a slice with no surface to render it, which drags in spec §9 residual-risk-1's
  verbatim-language requirement with nothing gating it. **CUT.** The model now emits a `PrivacyNotice`
  CODE plus the verbatim server `rejectMessage`; all copy lives in s8b's view, gated there.
- **M5 (reviewer).** Mirroring the server's export precondition is NOT a second SSOT (it is
  bit-identical to `should_reject_for_deletion`, `accounts.rs:424-430`, called at
  `privacy.rs:1481-1483`) and a button that silently fails "teaches the player the client is broken"
  (`claimModel.ts:157-161`). ADDED: `exportPermitted` to the derivation.
- **Simplify (reviewer, applied).** CUT `buildPrivacyViewModel`, `tables`, `suggestedFilename`,
  `missingIndices` (its default-sort ordering hazard goes with it) and `PRIVACY_EVENT_KINDS` (the
  exhaustive `switch` already gives compile-time totality and no totality loop is shipped).
  KEPT `receivedChunks` (§5's own wait rule made legible) and the `'due'` phase (it names the
  distinct server condition at `is_deletion_due`'s `>=` boundary). KEPT `inFlight` but applied it to
  ALL THREE emitters — the reviewer's objection was that it guarded only one, which is what made it
  incoherent; red-team measured that dropping it lets a double-submit hit
  `request_data_export`'s cooldown and show the player a spurious rejection.
- **M7 (reviewer).** `terminalAtMs` is converted and stored but read by no production code until
  s8b: write-only, not end-to-end. Recorded honestly in ADR-0231 rather than claimed otherwise.
- **M8 (reviewer).** The reviewer proposed moving `exportAssembly.ts` to s8b as well. REJECTED, with
  the reviewer's own counter-argument: spec §7.3 names `export_bundle`'s chunk fields as THE frozen
  cross-slice contract (S2↔S4↔S8), so the seam is derivable rather than guessed — and PRV1-13 is the
  most defect-dense rule in the client half (red-team broke 3 of its 5 planned teeth). Landing the
  assembly core BEFORE the transport is what gets it adversarial fixtures before it ever sees a live
  row. Mitigation taken: M4 — every `ExportChunkInput` field type is pinned from the binding below.
- **Ledger wording (reviewer).** Calling the one-line `EXPECTED_SUBSCRIPTIONS` addition a
  "hidden-dependency scope breach" overstated it; the eval invites that edit by name. Softened —
  it is still outside the declared `touches:`, which is why it is deferred, but it is a designed
  companion, not a surprise.

## Interfaces (frozen seam for s8b) — REVISED

### `client/src/ui/privacyModel.ts`

```ts
export type PrivacyPhase = 'unknown' | 'active' | 'grace' | 'due' | 'terminal';

/** Every field is an INPUT. No clock, no wasm, no DOM, no SDK, no store import. */
export interface DeletionStatusInput {
  readonly status: string | undefined;               // bare AccountStatus tag
  readonly deletionRequestedAtMs: bigint | undefined;
  readonly terminalAtMs: bigint | undefined;
  readonly nowMs: bigint;
  readonly graceMs: bigint;                          // INJECTED (s8b reads deletion_grace_ms_default())
}

export interface DeletionCountdown {
  readonly phase: PrivacyPhase;
  readonly deadlineAtMs: bigint | undefined;
  readonly remainingMs: bigint | undefined;
  readonly cancelPermitted: boolean;
  readonly cancelPermanentlyRejected: boolean;
  readonly deletePermitted: boolean;
  readonly exportPermitted: boolean;
}

export function deriveDeletionCountdown(input: DeletionStatusInput): DeletionCountdown;
```

Phase rules — TOTAL, never throws. **The PHASE never depends on the clock; the clock affects only
the countdown.** (Revised after the tester found the first draft's rule 1 contradicted the
permission table AND re-introduced B1 through the back door: `nowMs` is `BigInt(Date.now())` at
s8b's call site, so a wiring slip passing a raw `number` would have put EVERY `PendingDeletion`
account into `'unknown'` with `cancelPermitted === false` — refusing a cancel the server accepts.)

1. `terminalAtMs !== undefined && terminalAtMs !== null` → `'terminal'`, checked FIRST, before
   status (fail-closed on the illegal `Active` + marker shape, mirroring
   `server-module/src/accounts.rs:812-818`). **`0n` IS a marker** (RT1). Returns early:
   `deadlineAtMs` and `remainingMs` are `undefined` — a deadline is meaningless once the marker
   exists.
2. `status === 'Active'` → `'active'`.
3. `status === 'PendingDeletion'` → `'grace'` or `'due'`.
4. any other tag, or `status === undefined` → `'unknown'`.

Countdown rules, orthogonal to the phase:
- `deadlineAtMs`/`remainingMs` are computed ONLY when `deletionRequestedAtMs`, `nowMs` and
  `graceMs` are ALL bigints; otherwise BOTH are `undefined` — a DARK countdown, never a synthesized
  `0n` (RT7 totality: a non-bigint input degrades, it never throws `Cannot mix BigInt`).
- When computable: `deadline = requested + graceMs`;
  `remaining = deadline > now ? deadline - now : 0n`.
- A `'PendingDeletion'` row with a DARK countdown resolves to **`'grace'`**, never `'due'` — both
  are cancel-permitted and `'grace'` is the non-alarming one. `'due'` is only ever reached from a
  computed `remainingMs === 0n`.

Permissions:
- `cancelPermitted = phase === 'grace' || phase === 'due'` — **`'due'` IS permitted**: the server
  accepts a late cancel until `terminal_at_ms` is `Some` (`accounts.rs:812-822`). A client-side
  pre-reject would invent a second SSOT and cost the player their real cancel window.
- `cancelPermanentlyRejected = phase === 'terminal'`.
- `deletePermitted = phase === 'active'`.
- `exportPermitted = phase === 'active' || phase === 'unknown'` — the negative mirrors
  `should_reject_for_deletion` (`accounts.rs:424-430`) exactly: pending-or-terminal is refused.
  The server stays authoritative; this only avoids a control that silently fails.

```ts
export type PrivacyConfirm = 'none' | 'delete-armed';
export type PrivacyRequest = 'none' | 'delete' | 'cancel' | 'export';
export type PrivacyNotice =
  | 'none'
  | 'disconnected'          // could not be delivered; an armed confirmation STAYS armed
  | 'permanently-deleted'   // PRV1-4
  | 'request-rejected';     // any other server reject; see rejectMessage

export interface PrivacyModelState {
  readonly countdown: DeletionCountdown;   // B2: derived state lives HERE
  readonly confirm: PrivacyConfirm;
  readonly inFlight: PrivacyRequest;
  readonly notice: PrivacyNotice;
  readonly rejectMessage: string | undefined;  // the VERBATIM server string, for s8b to render
}
export const PRIVACY_INITIAL: PrivacyModelState;

export type PrivacyEvent =
  | { readonly kind: 'account-changed';           readonly countdown: DeletionCountdown }
  | { readonly kind: 'delete-requested' }
  | { readonly kind: 'delete-confirmed';          readonly hasLiveConnection: boolean }
  | { readonly kind: 'confirm-cancelled' }
  | { readonly kind: 'cancel-deletion-requested'; readonly hasLiveConnection: boolean }
  | { readonly kind: 'export-requested';          readonly hasLiveConnection: boolean }
  | { readonly kind: 'request-succeeded';         readonly which: PrivacyRequest }
  | { readonly kind: 'request-failed';            readonly which: PrivacyRequest; readonly message: string };

export type PrivacyEffect =
  | 'none' | 'call-delete-account' | 'call-cancel-account-deletion' | 'call-request-data-export';

export interface PrivacyStep { readonly next: PrivacyModelState; readonly effect: PrivacyEffect; }
export function privacyStep(state: PrivacyModelState, event: PrivacyEvent): PrivacyStep;

/** `REJECT_ALREADY_DELETED` (server-module/src/accounts.rs, module-private const), returned
 *  VERBATIM by `reject()`. Duplicated by value because the symbol is private; the row's own
 *  `terminalAtMs` is the PRIMARY route to the terminal state, so a drift here degrades a
 *  redundant second route, never the only one. */
export const SERVER_ALREADY_DELETED_MESSAGE = 'this account has already been permanently deleted';
```

Reducer rules:
- `account-changed` is the SOLE writer of `state.countdown`. It clears `inFlight` and, whenever the
  new phase is not `'active'`, clears `confirm` (B2).
- `delete-requested` arms ONLY when `countdown.deletePermitted`.
- `delete-confirmed` emits `'call-delete-account'` only when `confirm === 'delete-armed'` AND
  `deletePermitted` AND `hasLiveConnection` AND `inFlight === 'none'`. Not live → `notice`
  `'disconnected'` and the confirmation **stays ARMED** (`sessionModel.ts:93-97`, AUTH-59).
- `cancel-deletion-requested` emits `'call-cancel-account-deletion'` only when `cancelPermitted`
  AND `hasLiveConnection` AND `inFlight === 'none'`. When `cancelPermanentlyRejected` → effect
  `'none'` and `notice` `'permanently-deleted'`.
- `export-requested` emits `'call-request-data-export'` only when `exportPermitted` AND
  `hasLiveConnection` AND `inFlight === 'none'`.
- Every emitting arm sets `inFlight` to its own request; `request-succeeded`/`request-failed`
  clear it. The guard is applied to ALL THREE emitters or it is not a double-submit guard at all.
- A successful `delete-confirmed` SPENDS the confirmation (`confirm` → `'none'`, the
  `claimModel.ts` `decline-confirmed` precedent). A REFUSED non-active `delete-confirmed` sets NO
  notice — the control should not have been reachable, so there is nothing to tell the player.
- `request-succeeded` clears BOTH `notice` (→ `'none'`) and `rejectMessage` (→ `undefined`).
- `PRIVACY_INITIAL.countdown` is the derivation over an all-absent input: `'unknown'`, both
  countdown fields `undefined`, delete/cancel false, `exportPermitted` TRUE.
- `request-failed{which:'cancel'}` reaches `'permanently-deleted'` iff
  `message.endsWith(SERVER_ALREADY_DELETED_MESSAGE)` — `endsWith`, not `===`, because
  `statusModel.ts`'s `reduceErrorMessage` prefixes `` `${where}: ` `` (RT6). Any other message →
  `'request-rejected'` with the verbatim `rejectMessage`. **`which` alone must never route to the
  terminal notice.**
- **s8b constraint (frozen here):** the wiring must hand `privacyStep` the RAW reducer `err.message`
  (or a `${where}: ${message}` composition of it) — never a classified/normalised string.

### `client/src/ui/exportAssembly.ts`

```ts
/** Field types pinned from client/src/module_bindings/my_export_bundle_table.ts (M4).
 *  `ownerIdentity` is the HEX string — the caller (s8b's converter) does `toHexString()`. */
export interface ExportChunkInput {
  readonly chunkId: bigint;      // u64
  readonly ownerIdentity: string;
  readonly requestId: bigint;    // u64
  readonly tableName: string;
  readonly chunkIndex: number;   // u32 — REQUEST-WIDE 0..totalChunks-1
  readonly totalChunks: number;  // u32 — the REQUEST's whole chunk count
  readonly payloadJson: string;  // verbatim server JSON
  readonly createdAtMs: bigint;  // i64
}

export type ExportAssemblyStatus = 'none' | 'incomplete' | 'inconsistent' | 'complete';

export interface ExportAssembly {
  readonly status: ExportAssemblyStatus;
  readonly requestId: bigint | undefined;
  readonly receivedChunks: number;
  readonly totalChunks: number | undefined;
  readonly artifact: string | undefined;   // only when 'complete'
}

export function assembleExportBundle(
  chunks: readonly ExportChunkInput[],
  ownerIdentity: string,
): ExportAssembly;
```

Algorithm — TOTAL, never throws, no `JSON.parse`:
1. `ownerIdentity` must be a non-empty string, else `'none'` (RT13).
2. Keep only `c.ownerIdentity === ownerIdentity` — exact, no case folding, no trimming. **This
   filter runs BEFORE request selection and its result is the ONLY array that reaches the
   artifact** (RT2: filtering only to *select* the request and then splicing the raw input leaks a
   co-request foreign chunk into the player's download — measured).
3. Empty → `'none'`.
4. `requestId = max(...)` by **bigint comparison in a reduce**, never `.sort()` (RT8: the default
   sort is a STRING compare, so `9n` beats `10n` and the client serves the PREVIOUS export as
   fresh — measured). Keep only that request's chunks; older ones are DROPPED, never merged.
5. `'inconsistent'` if: the selected chunks disagree on `totalChunks`; `totalChunks` is not a
   positive integer (`2.5` otherwise yields `"total_chunks":2.5` in the artifact — measured);
   any `chunkIndex` is not an integer (a bare `< 0 || >= total` comparison admits `NaN` and
   fractions, producing a silent FALSE-COMPLETE — measured, RT3) or is outside `0..totalChunks-1`;
   or a `chunkIndex` repeats.
6. Fewer distinct indices than `totalChunks` → `'incomplete'`.
   On `'inconsistent'`, `requestId` IS the selected request but `totalChunks` is `undefined` — the
   delivered values disagree or are invalid, so there is no defensible number to report.
   `receivedChunks` counts the own-owner chunks OF THE SELECTED REQUEST.
7. Else sort by `chunkIndex` ascending and build the artifact by **string splicing only**:
   `{"request_id":"<decimal>","total_chunks":<n>,"chunks":[<payloadJson>,…]}`.
   The server hand-rolls its JSON with every 64-bit integer as a QUOTED decimal string
   (`json_u64_into`/`json_i64_into`, `server-module/src/privacy.rs:113-127`) precisely so the client
   never re-encodes; and `json_escape_into` (`:85-105`) escapes `"`, `\` and every codepoint
   `< 0x20`, so a player-authored name cannot break the envelope (red-team tried and could not).
   A `JSON.parse` round trip is BYTE-IDENTICAL on well-formed server output (measured), so the ban
   is enforced by a source scan plus a malformed-payload no-throw tooth, never by byte equality.

## Named anti-patterns (revised)

1. **`terminalAtMs: row.terminalAtMs ?? 0n`, or a truthiness test `if (terminalAtMs)`.** `0n` is a
   valid i64 marker; truthiness inverts PRV1-4 on it (measured). And a raw `null` from the SDK
   Option makes `!== undefined` true for every account.
2. **Any numeric grace literal anywhere in `client/**`, test fixtures included** —
   `evals/deletion-grace-wasm-ssot.eval.mjs` G5 scans the whole tree and does not exempt `.test.ts`.
   Fixtures use synthetic values (`1_000n`, `60_000n`). Do NOT re-implement that scan in a spec:
   G5 is the SSOT and a weaker in-spec copy is a second one.
3. **Client-side re-derivation of a server DECISION** — pre-rejecting a `'due'` cancel, or refusing
   a cancel because the deadline passed. (Distinct from mirroring a server PRECONDITION as a
   disabled control, which is legitimate and shipped as `exportPermitted`; the server stays
   authoritative in both cases.)
4. **`JSON.parse(payloadJson)` anywhere in `exportAssembly`.** Byte equality cannot detect it
   (measured); the source scan and the malformed-payload tooth are what enforce it.
5. **Reading `total_chunks`/`chunk_index` as per-table.** They are REQUEST-WIDE
   (`server-module/src/privacy.rs:1092-1094,1519-1531`); a per-table completeness check passes on
   real data by accident.
6. **A range check without an integer check.** `idx < 0 || idx >= total` admits `NaN` and fractions
   — a silent false-complete export (measured).
7. **`.sort()` or `Number()` on `requestId`.** The default sort is a string compare (`9n` beats
   `10n`, measured); `Number()` on a bigint mixes types and reopens the 2^53 hole.
8. **Any player-facing COPY in either core.** The model emits notice CODES; copy ships with the
   view in s8b, where spec §9 residual-risk-1's verbatim-language requirement is gated.
9. **Deriving anything from inside `payloadJson`** (the embedded `"table"` name, a row count).
   The `tableName` COLUMN is the authority; the two agree on real data, which is exactly why a
   fixture must make them disagree.
10. **Copying `my_conversation`'s `shouldRemoveOnViewDelete` gate or `my_monster_pub`'s
    reconcile-from-cache rule.** Both are countermeasures for update-as-insert+delete aliasing that
    `export_bundle` does not have — and neither file is touched by this slice anyway.

## Deferred to m22-s8b (must be declared in its brief)

- The export transport: `exportBundleRowToStore`, the `#exportChunks` store collection,
  `conn.db.my_export_bundle` onInsert/onDelete (NO onUpdate — `export_bundle` has no server
  update path, and `chunk_id` is `#[auto_inc]` unique so key-addressed removal is order-immune),
  the `'SELECT * FROM my_export_bundle'` subscription **and** the matching
  `EXPECTED_SUBSCRIPTIONS` entry in `evals/monster-privacy.eval.mjs`.
  **s8b's `touches:` MUST include `evals/monster-privacy.eval.mjs`.**
- `ui/privacyView.ts` + `OVERLAY_IDS`/`OVERLAY_TIERS` membership + `menuModel`/`menuView` entry +
  `a11yCopy` title + `index.html` shell + `styles.css` + the `main.ts` wiring (hotkey, probes,
  handles, handlers, the per-frame countdown tick, the `deletion_grace_ms_default()` read, and
  the `Blob`/`URL.createObjectURL` download) + the `client/vite.config.ts` coverage exclusion
  for the new DOM shell.
- The live e2e export/download assertion belongs to S9, not s8b.
