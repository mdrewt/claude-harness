# 11r-e build plan — ux2b: wallet view completion (ADR-0154 D7 → ADR-0169)

Branch `feat/11r-e-wallet-view-completion`, worktree `.claude/worktrees/11r-e`, forked from
origin/master @ 90921d1.

**Verdict:** one clean PR. Production code ~15 lines across three files, mechanically dictated
by ADR-0154 D7; the weight is entirely in four test surfaces.

---

## STOP #1 (hidden dependency, NOT blocking) — `evals/wallet-privacy.eval.mjs`

`evals/wallet-privacy.eval.mjs:37-43` names *this slice* as the owner of a strengthening edit:

> "When ux2b wires the subscription it MUST add the positive anchor — `FROM my_wallet` present
> in exactly one `.subscribe([...])` array — which is the same absence-only trap
> conversation-privacy's check D already closed (m2+RT-8: absence-only is concat-bypassable)."

`evals/**` is outside the declared `touches:` set. Two facts bound the damage:

1. **Nothing goes red.** Check S is `checkNoPrivateWalletSubscription(connSrc)` — it asserts
   `FROM player_wallet` appears in no `.subscribe([...])` array. Adding `'SELECT * FROM my_wallet'`
   keeps it green. We decline to *strengthen* an eval; we do not break one.
2. **The in-scope substitute has equal kill power.** The positive anchor goes into
   `client/src/net/connection.test.ts` (sibling test of an in-scope code file), windowed to the
   `.subscribe([` array exactly as `evals/conversation-privacy.eval.mjs:396-420` windows check D.
   Same needle, same anti-vacuity, different runner (`just test` vs `just eval`).

**Decision:** ship the in-scope tooth; record the eval fold-in as a named residual in ADR-0169,
the PR body, and the handoff. Do NOT silently drop it — the eval's own header would otherwise
contain a false claim about who did what.

**No other hidden dependency.** Verified already-sufficient and NOT edited: `client/src/net/store.ts`
(`upsertWallet`/`ownWallet`/`reset`), `client/src/ui/shopModel.ts` (optional 5th/6th param),
`client/src/ui/shopView.ts` (`#shop-balance` + `dataset.balanceState`),
`client/src/module_bindings/my_wallet_table.ts` (exists, no regen),
`client/playwright.config.ts` (`testDir: './e2e'` + default `testMatch` ⇒ new spec auto-discovered),
`justfile`. `docs/knowledge/tables/player_wallet.md` is GENERATED — never hand-edit.

---

## Key discovery — the e2e needs no battle win

The stochastic battle-win faucet was the feared path. There is a **deterministic** one:

- `game-core/content/quests/000-core.ron` — `quest_001` "Find the Elder": one step,
  `trigger: Talk(npc_id: "elder_oak")`, `reward: (xp: 0, items: [], currency: 50)`.
- `game-core/content/dialogue_trees/000-core.ron` — `elder_oak_talk` choice `"I seek a quest."`
  has `effects: [StartQuest("quest_001")]`.
- `server-module/src/npc.rs:270-277` — `talk` fires `apply_quest_trigger(… Talked{npc_id} …)`;
  `npc.rs:174-183` `QuestAdvance::QuestComplete` deletes the `player_quest` row **and** calls
  `grant_currency(ctx, owner, reward.currency)`.
- `server-module/src/economy.rs:29-45` — `grant_currency` inserts the `PlayerWallet` row when absent.

⇒ **talk → pick the quest choice → talk again → exactly 50 gold, zero RNG.**
`client/e2e/dialogue.spec.ts:310-449` already proves every step of that machinery.
The recruit.spec grass/encounter/heal apparatus is NOT needed.

Second useful fact: movement collision is tile-kind only (`game-core/src/world.rs:129`,
`types.rs:113`) — characters and NPCs do not block each other.

---

## 1. Task decomposition

**T0 (tester, red-first).** Author every gate below from the §2 EARS. All four surfaces red for
the right reason before T1.

**T1 — pure converter — `client/src/net/rowConvert.ts`** (next to the `my_conversation` block at
:405-452):
- `export interface SdkPlayerWalletRow { readonly ownerIdentity: { toHexString(): string }; readonly balance: bigint }`
  — **exported** (the dominant convention: `SdkProfileRow`, `SdkTradeOfferRow`, …), unlike the
  anomalous locally-declared `SdkConversationRow`.
- `export function playerWalletRowToStore(row: SdkPlayerWalletRow): StoreWallet` →
  `{ ownerIdentity: row.ownerIdentity.toHexString(), balance: row.balance }`.
- Pass-through ONLY. No `BigInt()`/`Number()` coercion, no `?? 0n`, no clamping — the
  `unknown`-vs-`0n` distinction ADR-0154 D1/D6 protects dies here if anything fabricates a balance.
- Doc comment states: no `shouldRemoveOnViewDelete` sibling — D4 forbids a delete gate for wallets.

**T2 — imperative shell — `client/src/net/connection.ts`:**
- Import `playerWalletRowToStore` + `type SdkPlayerWalletRow` into the alphabetized `./rowConvert`
  import block (:28-62).
- **Subscription** (:576-579): insert `'SELECT * FROM my_wallet',` after `'SELECT * FROM shop_item_row',`;
  **rewrite the now-false comment at :576-577** ("player_wallet … produces no client subscription —
  excluded") into the `my_conversation` form at :569-571.
- **Ingest**, adjacent to the shop block (:419-432), inside sentinel comments
  `// UX2B-WALLET-INGEST-BEGIN` / `// UX2B-WALLET-INGEST-END` (the `UXD2-SHOPOPEN-BEGIN/END` idiom,
  so the source scan can `regionOrThrow` + `expectUniqueAnchor`):
  `conn.db.my_wallet.onInsert((_ctx, row) => { store.upsertWallet(playerWalletRowToStore(row as unknown as SdkPlayerWalletRow)); batcher.schedule(); });`
  and **nothing else** — plus a TRIPWIRE comment in the `profile` idiom (:470-476): deliberately NO
  `onDelete` (ADR-0154 D4; `economy_tests.rs::player_wallet_rows_are_never_deleted` is the soundness
  gate; `store.reset()` on disconnect is the sole clearing path) and no `onUpdate` (a view delivers
  updates as insert+delete, ADR-0087).

**T3 — composition — `client/src/main.ts`** — all THREE sites append `store.ownWallet(identity)`:
- `:1377-1385` `buildShopViewModelForShop(openShopId, …)` — dialogue listener's deferred
  greet-then-shop open (`UXD2-SHOPOPEN` region).
- `:1436-1442` `buildShopViewModelForShop(boundShopId, …)` — shop batch listener, bound arm.
- `:1443-1448` `buildShopViewModel(…)` — unbound arm of the same ternary.

On `:1377`'s `identity`: the dialogue listener (:1345) has **no** `identity === ''` guard (the shop
listener at :1428 does). None is needed — `store.ownWallet('')` returns `undefined`
(`store.ts:992-995`) → `{kind:'unknown'}` → hidden node. Never a wrong balance. **Do not add a
guard** — untested dead code.

**T4 — behavioral e2e** — new `client/e2e/wallet-balance.spec.ts` (§5).

**T5 — docs** — `docs/adr/0169-*.md`; one targeted line in `ARCHITECTURE.md` §"Economy client"
(~:656). NOT `CHANGELOG.md`, NOT `docs/adr/README.md`.

---

## 2. EARS acceptance criteria

- **11r-e-1** — WHEN the client builds its subscription set, the connection SHALL include
  `SELECT * FROM my_wallet` **inside** the `.subscribe([...])` array, and SHALL NOT name
  `player_wallet` in any subscription string anywhere in `connection.ts`.
- **11r-e-2** — WHERE an SDK `my_wallet` row is supplied, `playerWalletRowToStore` SHALL return
  `{ownerIdentity: <hex string>, balance: <the same bigint>}`, SHALL preserve `0n` and
  `18446744073709551615n` byte-identically, and SHALL NOT throw for any well-typed input.
- **11r-e-3** — WHEN a `my_wallet` row insert arrives, the connection SHALL convert it, call
  `store.upsertWallet(...)`, and call `batcher.schedule()`.
- **11r-e-3b** — The connection SHALL register **no** `onDelete` and **no** `onUpdate` handler for
  `my_wallet`, SHALL call no wallet-removal API, and SHALL construct no fallback/default wallet row.
- **11r-e-4** — WHERE `main.ts` builds a shop view model, EVERY `buildShopViewModel(` /
  `buildShopViewModelForShop(` call site SHALL pass `store.ownWallet(identity)` as its wallet argument.
- **11r-e-5** — The wiring test SHALL fail when the total number of shop-view-model call sites in
  `main.ts` differs from **3**, or when any one of them omits the wallet argument; counting SHALL
  ignore occurrences inside comments and string literals.
- **11r-e-6** — WHEN a player whose server-side balance is 50 opens the shop overlay, the client
  SHALL render `#shop-balance` visible, with `data-balance-state="known"` and text exactly `Gold: 50`.
- **11r-e-7** — WHILE that shop overlay remains open and further store batches are applied, the
  readout SHALL remain `Gold: 50` (SHALL NOT blank to the `unknown` arm).
- **11r-e-8** — WHERE a second identity that has no wallet row opens the shop overlay **while
  another identity's wallet row exists on the server**, the client SHALL render `#shop-balance`
  hidden with `data-balance-state="unknown"` and empty text, and the `#shop-overlay` subtree SHALL
  NOT contain the substring `Gold:`.
- **11r-e-9** — WHERE the shop overlay is open for either identity, the catalogue SHALL be populated
  (shop title + ≥1 priced row) — the anti-vacuity precondition for 11r-e-6 and 11r-e-8.

---

## 3. Proof-of-teeth — the concrete wrong implementation each gate kills

**11r-e-1** (`connection.test.ts`, windowed to `.subscribe([`…`]);` via `regionOrThrow`):
(a) subscribes `player_wallet` — errors the whole batch, `onApplied` never fires, blank world for
every player; (b) subscribes nothing (ships converter + handler, client stays dark — today's ux2
state); (c) parks the string in a dead constant or comment OUTSIDE the array (hence windowed +
comment-stripped, cf. conversation-privacy Finding 5); (d) subscribes `my_conversation` twice.

**11r-e-2** (`rowConvert.test.ts`, real imports — the file is pure):
(a) `Number(row.balance)` — silent precision loss near MAX_BALANCE and a type lie;
(b) `row.balance ?? 0n` — fabricates "broke" from "dark", the exact D6 collapse;
(c) `String(row.ownerIdentity)` → `"[object Object]"`, permanently defeating `ownWallet`'s owner
filter (readout always `unknown`); (d) a throwing converter — it runs inside a subscription callback
and would starve sibling ingest.

**11r-e-3 / 3b** (`connection.test.ts`, region-bounded by the sentinels, comment-stripped):
(a) an `onDelete` that removes — D4's `I(50) I(100) D(100) D(50)` then wipes the LIVE row on `D(100)`
and the player's gold vanishes mid-session; (b) an `onDelete` gated by `shouldRemoveOnViewDelete`
(copy-paste from the `my_conversation` block at :335-341) — dead AND wrong, compiles, reads
plausible; (c) omits `batcher.schedule()` — the row lands but nothing re-renders until an unrelated
batch; (d) calls `store.upsertWallet` with the RAW SDK row — `ownerIdentity` stays an `Identity`
object and the owner filter never matches.

**11r-e-4** (`main.wiring.test.ts`, per-call-site argument slice): passing the wallet at **2 of 3**
sites — ADR-0154 D7's named catastrophe (patch only :1377 ⇒ renders once on open then blanks on the
next batch, worse than not shipping; patch only the listener ⇒ blanks on open then pops in). The
gate slices each call from its `(` to the matching `)` by paren-balance walk over string-stripped
source and requires `store.ownWallet(identity)` inside EACH slice. Argument *order* needs no
assertion — TypeScript rejects a `StoreWallet` in the `readonly StoreInventory[]` position.

**11r-e-5** (count tooth + its OWN fixture teeth): (a) a future FOURTH call site with no wallet
argument silently shipping a blank readout — the reason D7 mandates this tooth; (b) a counter that
matches the `import { buildShopViewModel, buildShopViewModelForShop }` line (count the needle WITH
the open paren; `buildShopViewModel(` and `buildShopViewModelForShop(` are disjoint needles, 1+2=3);
(c) a counter that counts a call site inside a string literal or comment — the RT-SEC-02 class. The
tester MUST hand-roll `stripTsStringLiterals` (single/double/backtick, escape-aware, **no
`new RegExp`** — Semgrep bans it repo-wide) AND prove it on fixtures: `'buildShopViewModel(' as a
string → 0`, `// buildShopViewModel(…) → 0`, one real call → 1. Without the fixture teeth the tooth
is itself unproven.

**11r-e-6** (e2e, A): the entire slice being inert (today: `#shop-balance` exists, hidden,
`unknown` forever); a subscription wired but the store never fed; a store fed but no call site
passing it.

**11r-e-7** (e2e, A, after B's walk generates batches): **the 2-of-3 patch** — the runtime witness
for 11r-e-4, the one assertion a source scan cannot fake.

**11r-e-8** (e2e, B): a client rendering someone else's balance — any future widening of the view,
a `Map<identity, StoreWallet>` store (D5), or dropping the owner filter.

**11r-e-9** (e2e, both): a "green" run where the overlay never opened, the selector is dead, or the
test asserted on a detached node — every negative assertion above would pass vacuously.

---

## 4. Named anti-patterns (this codebase)

1. **Do not add the wallet to `window.__game()`** (`main.ts:1628-1683`). It is in the touch-set and
   tempting. 11r-b exists *because* a DEV-gated hook made an e2e green while production was broken.
   Assert on `#shop-balance` in the DOM — the only surface proving view→subscription→converter→
   store→model→shell.
2. **Do not assert absence of the substring `50`** in B's overlay — catalogue prices are 200/300/**150**
   and `'150'.includes('50')`. Assert `#shop-balance` textContent `=== ''` + `data-balance-state="unknown"`,
   plus absence of `Gold:` in `#shop-overlay`.
3. **Do not copy the `my_conversation` onDelete block.** Nearest precedent, wrong here (D4). The
   single most likely implementation mistake.
4. **`new RegExp(...)` is banned repo-wide by Semgrep.** Source scanning uses
   `indexOf`/`includes`/`split`/`startsWith` only.
5. **Never import from or modify a sibling e2e spec.** `recruit.spec.ts`/`dialogue.spec.ts` are
   frozen regression nets; `shop-npc.spec.ts:44-46` set the re-implement-verbatim-in-spirit precedent.
6. **No fixed sleeps in e2e** — every wait polls a DOM or `__game()` predicate with a bounded timeout.
7. **Physical key codes only** — `page.keyboard.press('KeyT')`, never `'t'`.
8. **Exact-presence discipline** — two contexts ⇒ wait `presenceCount === 2` on both pages in
   `beforeAll`, `browser.close()` in `afterAll`, or the NEXT spec file's presence wait hangs
   (`workers: 1`).
9. **Do not "simplify" the zone-1 route** — `(4,3)`/`(5,3)` are walls; x=6 is the only clean
   northward lane (`shop-npc.spec.ts:88-97`).
10. **Do not fabricate a 0 balance anywhere in the client** — `economy::wallet_balance`'s
    `.unwrap_or(0)` is exactly what ADR-0154 D1 refused to let reach the UI.

---

## 5. e2e design — `client/e2e/wallet-balance.spec.ts`

`test.describe.serial`, one browser, TWO contexts (A, B) — the `dialogue.spec.ts:237-299` pattern.
Local `snap`/`ready`/`stepOne`/`walk`/`talkUntilOpen` helpers, re-implemented, not imported.

**World facts pinned in the file header (re-derived, cited):** `quest_001` reward `currency: 50`
(the only deterministic gold amount reachable in e2e); `elder_oak_talk` choice `"I seek a quest."`;
`elder_oak` zone 0 home (5,5) radius 2 (**wanders** ⇒ retry loops); `tideglass_shopkeeper` zone 1
(8,1) radius 0 (**stationary** ⇒ no retry loops in zone 1); shop 1 "Pebble Town Shop" cheapest stock
150 ⇒ **A cannot buy anything with 50 gold**, so the balance never changes after the grant (which is
why the A/B differentiator is *known vs unknown*, not two amounts); `npc.rs:174-183` — the
`player_quest` row delete and `grant_currency` are the SAME `QuestComplete` arm and that is the ONLY
delete path for a `player_quest` row ⇒ "quest_001 left the quest log" is an exact server-side witness
that 50 gold was granted.

**Selectors:** `#shop-overlay`, `#shop-balance` (text + `data-balance-state`, `shopView.ts:93-100`),
`#dialogue-overlay`, `#dialogue-node-text`, `#dialogue-npc-name`, `#dialogue-choices`,
`[data-shop-id]`, `#quest-log-overlay`, `#quest-log-list`, `#interact-prompt`.

**Routes (grass-free, encounter-free by construction):**
- A zone 0 spawn (1,1) → talk pocket (5,4): `E,E,E,E,E,S,S,S,W`.
- A (5,4) → warp: `E`(6,4), `S`(6,5), `W`(5,5)=warp → zone 1 (5,5).
- Both zone 1 (5,5) → shopkeeper boundary tile (6,1): `N,E,N,N,N`.
- B zone 0 spawn (1,1) → warp: `E,E,E,E,E,S,S,S,S,W`. **B presses no key in zone 0** — B must never
  talk to elder_oak.

**Sequence:**
| # | Test | Assertions |
|---|---|---|
| T1 | setup | `ready(a)`, `ready(b)`, `presenceCount === 2` on both, capture both `ownEntityId`. |
| T2 | A earns 50 gold from quest_001 (`setTimeout(300_000)`) | walk to (5,4); bounded loop ≤8 iterations of { `talkUntilOpen` (≤20 KeyT attempts, poll for an in-range non-player character first); click `"I seek a quest."` if visible; wait overlay hidden ≤20 s; `KeyQ`; read `#quest-log-list`; `Escape` }. **Success = the log was observed containing `quest_001` at some iteration AND now does not** — the two-phase form deliberately tolerates the race where a retry talk completes the quest before the log was re-read. Fail message names `quests/000-core.ron` + `npc.rs:174-183`. |
| T3 | A: shop shows own real balance (11r-e-6, 11r-e-9) (`180_000`) | walk to warp, poll `map.zone_id === 1`, walk to (6,1); `KeyT`; `#dialogue-node-text` = `Hello, customer!`; click `[data-shop-id]`; `#shop-overlay` visible ≤20 s, `#dialogue-overlay` hidden. Catalogue populated (title + ≥1 buy row) AND `#shop-balance` visible, `data-balance-state="known"`, `toHaveText('Gold: 50')` (15 s). **Leave A's overlay open.** |
| T4 | B: another player's balance never appears (11r-e-8, 11r-e-9) (`180_000`) | B walks its route, opens the shop identically. Catalogue populated; `#shop-balance` present but hidden, `data-balance-state="unknown"`, textContent `''`; `#shop-overlay` textContent excludes `Gold:`. |
| T5 | A: readout survives the batch listener (11r-e-7) (`60_000`) | **Batch witness first**: on A's page assert via `__game().characters` that B's entity id moved ≥1 tile since T3 (B's T4 walk generates character updates on the global `character` subscription → `store.flushBatch` → the M13d shop batch listener re-renders A's OPEN overlay). Then re-assert `#shop-balance` still visible / `known` / `Gold: 50`. Fail message names the 3-call-site rule + ADR-0154 D7. |

**Vacuity analysis (state in the file header):** B's `unknown` alone proves little. Three things make
it non-vacuous: (i) the SAME `readBalance(page)` helper returns `known`/`Gold: 50` for A and
`unknown`/`''` for B in ONE run against ONE module, so the machinery demonstrably distinguishes the
states; (ii) 11r-e-9 proves B's overlay rendered a live catalogue, so `unknown` is not "nothing
happened"; (iii) A's row provably exists server-side at the moment B looks. The stronger form — B
earning its own differently-sized balance — is **not reachable**: quest_001 is once-per-identity and
grants exactly 50 to everyone, and the cheapest sink is 150. Explicitly deferred + disclosed.

**Flake budget.** Zero RNG: no grass, no encounters, no recruit rolls, no heals. The only stochastic
element is elder_oak's wander, handled by two proven bounded loops that `dialogue.spec.ts` has run in
CI for months. ~30 steps at ≤8 s + two dismiss round-trips at ≤20 s ⇒ expected 3–5 min, worst case
~12 min. `just e2e` is a merge gate, so if the file ever exceeds budget the deflake lever is to run
A's and B's WALKS concurrently (`Promise.all`), never to weaken an assertion.

**Rejected alternative (recorded):** the battle-win faucet (`battle.rs:1055-1074`, `loser_bst/10`
≈ 31 gold) needs recruit.spec's shuttle walk, encounter loop, HP-restore loop and flee heuristics —
hundreds of lines of stochastic machinery for a WORSE assertion (a non-deterministic amount).

---

## 6. Boy Scout candidates — essentially none

- `connection.ts:576-577` false comment: **required by the change**, not boyscout.
- `connection.ts:326-330` `SdkConversationRow` declared locally while every sibling imports its
  `Sdk*Row` from `rowConvert.ts`: genuine inconsistency, but unifying touches the `my_conversation`
  handler and buys nothing. **Skip** — just don't copy the anomaly.
- `main.ts:1345` dialogue listener lacks the `identity === ''` guard its shop sibling has: not a
  defect for wallets, and adding it is untested behavior change. **Skip.**
- `main.wiring.test.ts:244-265` (F-5f `if (gateIdx >= 0)` + trailing `expect(true)`) is a real defect
  but is **11r-h's declared scope**. Do not poach.

Spend the budget on the count tooth's fixture teeth instead.

---

## 7. Risks & deferrals

1. **`main.ts`-SERIAL** with uxd3 and 11r-b — both merged (uxd3 through PR#268, 11r-b through
   PR#271). Re-run the call-site count tooth after ANY rebase; it exists precisely to catch a fourth
   site arriving from a sibling branch.
2. **Deployment ordering.** Once `'SELECT * FROM my_wallet'` ships, a client pointed at a module
   published BEFORE ux2 gets a subscription error on the whole batch ⇒ `onApplied` never fires ⇒
   blank world. The view is on master (`schema.rs:534-537`) and e2e republishes with `--delete-data`,
   so CI is safe; local devs must `just publish`. Record in ADR consequences.
3. **Inherited below-the-fold defect** (ADR-0154 accepted risk 2): `#shop-overlay` is a known
   in-flow shell (ADR-0151), so the newly-live balance is still below the fold until
   `M-postgate-overlay-registry`. Playwright's `toBeVisible()` does not require in-viewport, so the
   e2e passes while a human still has to scroll. **Disclose; do not fix here.**
4. **New e2e is a merge gate for every future slice** — mitigated by the deterministic quest faucet.
5. **Toolchain:** `just ci` needs the explicit PATH export (default node is v18, cargo absent).

**Deferrals:** the `evals/wallet-privacy.eval.mjs` check-S positive anchor (STOP #1); a second
identity with a different nonzero balance (unreachable without the stochastic battle loop); a
HUD/always-visible gold readout (`balanceViewModel` stays module-private per D6); `removeWallet` in
the store (never, until the server gains a wallet-delete path).

**Smallest coherent increment if it must shrink:** T1+T2+T3 with the three source-level gates,
parking the e2e. **Not recommended** — ADR-0154 accepted risk 1 assigns the behavioral two-identity
proof to THIS slice.

---
---

# PLAN REVISION v2 — BINDING (post reviewer + red-team + /simplify, 2026-07-31)

Three independent lenses reviewed v1. Every delta below **overrides** the corresponding v1 text.
The tester and implementer follow v1 **as amended here**.

## R1 (CUT) — NO string-literal stripper. Comment-stripping only.

v1 §3 (11r-e-5c) mandated a hand-rolled escape-aware `stripTsStringLiterals` + fixture teeth.
**Cut it.** Verified: no such helper exists anywhere in the repo; every existing count tooth
(`main.wiring.test.ts:2657, 2663, 2751, 2788, 4203-4272, 5023, 5039, 5070`) uses
`stripLineComments`/`stripBlockComments` only; and a string literal containing the needle can only
*increase* the count past 3 → **hard red**, never a false green. The stripper defended a false-RED
that does not exist (zero such literals in `main.ts` today), at the cost of machinery that itself
needs machinery.

This also **dissolves red-team S1 (CRITICAL)**: S1's kill was a strings-then-comments ordering
desync (≈40 unpaired apostrophes in `main.ts` `//` comments — `:113` "Biome's", `:1430`
"shopkeeper's", … — collapse the count 3 → 1 and leave only `:1378`, the worst site, standing).
With no string stripper there is no ordering. `main.ts` contains no `://`, so `stripLineComments`
is sound.

**Required disclosure comment** (copy the `callArgs` precedent at `main.wiring.test.ts:2326-2347`):
an unmatched `)` inside a string literal could terminate a paren walk early — accepted residual,
same as the existing helper.

## R2 (SIMPLIFY) — reuse the existing paren walker; one loop yields 11r-e-4 AND 11r-e-5

`main.wiring.test.ts:2326-2347` already has `callArgs(src, needle)` — "the ARGUMENT LIST of the
first `needle` call, by balanced-paren scan". Add a `from` offset (2-token change); do NOT add a
parallel implementation (SSOT within the file):

```ts
const stripped = stripLineComments(stripBlockComments(readMainTs()));
const sites: string[] = [];
for (const needle of ['buildShopViewModelForShop(', 'buildShopViewModel(']) {
  for (let i = stripped.indexOf(needle); i !== -1; i = stripped.indexOf(needle, i + 1)) {
    sites.push(callArgsFrom(stripped, needle, i));
  }
}
expect(sites.length, '<D7 call-site-count tooth message>').toBe(3);
for (const args of sites) expect(squashWhitespace(args)).toContain('store.ownWallet(identity)');
```

Needle disjointness verified: `buildShopViewModel` at `:1378`/`:1436` is followed by `F`, and the
import at `:133` has no `(`. 1 + 2 = 3.

## R3 (CUT) — NO `UX2B-WALLET-INGEST-BEGIN/END` sentinels. Whole-file contiguous needle instead.

v1 T2's sentinel region made the tooth **weaker**: 11r-e-3b is a whole-file negative, and a
region-bounded negative cannot see a relocated handler (red-team **S4, HIGH** — the `my_conversation`
delete-gate copy-paste moved 200 lines down passes a sentinel scan and D4's `I(50) I(100) D(100)
D(50)` then wipes the live row mid-session). Replace with, on the whole comment-stripped file
(`connection.test.ts:170-190` `createAuthTokenGate` idiom):

```ts
const S = squashWhitespace(stripLineComments(stripBlockComments(readConnectionTs())));
expect(countOccurrences(S,
  'conn.db.my_wallet.onInsert((_ctx, row) => { store.upsertWallet(playerWalletRowToStore(row as unknown as SdkPlayerWalletRow)); batcher.schedule(); });'
)).toBe(1);
expect(countOccurrences(S, 'conn.db.my_wallet.onDelete')).toBe(0);
expect(countOccurrences(S, 'conn.db.my_wallet.onUpdate')).toBe(0);
expect(countOccurrences(S, 'shouldRemoveOnViewDelete')).toBe(1); // still ONLY my_conversation's
```

The single contiguous needle pins shape, argument, conversion, `batcher.schedule()`, order AND
uniqueness in one assertion. The 4th line is a free tooth against anti-pattern #3 that no region
form can express.

**This also dissolves reviewer M1 (MAJOR)** — the "balance freezes after first delivery" bug
(`if (store.ownWallet(identity) === undefined) { … }` guarding the upsert) passed every v1
criterion, because the e2e is deliberately designed so the balance never changes (cheapest sink
150 > 50 gold). The contiguous needle admits no `if`/`?:`/`&&`.

The TRIPWIRE comment naming `onDelete`/`onUpdate`/`shouldRemoveOnViewDelete` still goes in
`connection.ts` (the `profile` idiom at `:470-482`) — it is comment-stripped before the scan, so it
cannot trip the negatives. **Do not** duplicate that tripwire in `rowConvert.ts` (v1 T1); the
converter doc comment carries only the no-coercion rule, which is what `rowConvert.test.ts`
enforces. (SIMPLIFY S2 — one fact, one file.)

## R4 (ADD) — kill the `:1436`-only 2-of-3 patch at runtime (red-team S2, CRITICAL)

v1 §3 claimed 11r-e-7 was "the one assertion a source scan cannot fake". **It was false.**
`game-core/src/world.rs:13` `STEP_MS = 200` + `server-module/src/lib.rs:134-136` per-zone
`movement_tick` + the **globally unfiltered** `'SELECT * FROM character'` subscription
(`connection.ts:550`) mean the M13d shop batch listener re-renders A's open overlay **every ~200 ms
with no player input**. So a `:1436`-only patch (blank on open, pops in ≤200 ms) sails past T3's
retrying `toHaveText` AND past T5. Truth table:

| patched | T3 | T5 | verdict |
|---|---|---|---|
| all 3 | pass | pass | correct |
| `:1378` only | may pass | FAIL | caught |
| **`:1436` only** | **pass** | **pass** | **GREEN, BROKEN** |
| `:1443` only | fail | fail | caught |

**Required:** a `ctxA` `addInitScript` first-paint latch (the `dialogue.spec.ts:242-273` idiom) —
a `MutationObserver` on `#shop-overlay` that, on the transition to visible, **synchronously**
records `window.__mrFirstBalanceOnOpen = { state: el.dataset.balanceState, text: el.textContent }`.
T3 asserts `__mrFirstBalanceOnOpen.text === 'Gold: 50'` **in addition to** the polled `toHaveText`.

## R5 (ADD) — B sticky "never known" latch (red-team S5) + a real batch witness (red-team S6)

- **S5:** v1's T4 reads `#shop-balance` once and never returns to B; any leak arriving later is
  invisible (and `store.upsertWallet` is unconditional — `store.ts:985-987` — so a delayed foreign
  row would be stored silently). Mirror the `dialogue.spec.ts:242-273` sticky latch on `ctxB`:
  `__mrBalanceEverKnown` set true by a `MutationObserver` on `#shop-balance` when
  `dataset.balanceState === 'known' || textContent !== ''`. Assert `false` in T4 **and again** in
  T5/`afterAll`.
- **S6:** v1's T5 "batch witness" (`__game().characters` shows B moved) proves nothing about the
  shop listener — `store.characters()` is written by the row callback directly, and
  `main.ts:1428-1452` swallows listener throws in a `catch`. Replace with a **render counter**: the
  same `ctxA` observer counts writes to `#shop-balance`'s `data-balance-state` (written on EVERY
  `render()`, `shopView.ts:100`, unconditionally, before the no-shop early return). T5 asserts
  `renderCount_T5 > renderCount_T3` before re-asserting the text.

R4 + R5 collapse into **one** `addInitScript` block per context (~30 lines total).

## R6 (CORRECT) — 11r-e-8 proves the CLIENT filter, not server view scoping (red-team S3, HIGH)

v1 §3 claimed 11r-e-8 kills "any future widening of the view". **False.** `store.upsertWallet`
(`store.ts:985-987`) stores unconditionally; `ownWallet(identity)` (`:992-995`) filters on read. If
the view were widened, B's client **receives and stores** A's row and still renders `unknown` —
observably identical to correct behaviour, while another player's balance sits in B's browser memory
(the ADR-0015 must-never-leak condition).

**Required, zero-cost:** state the split honestly in the spec-file header AND in ADR-0169
consequences — 11r-e-8 gates the **client-side owner filter and render path**; **server-side view
scoping is owned by `evals/wallet-privacy.eval.mjs` `[B/2c]` and
`economy_tests.rs::my_wallet_view_is_owner_scoped`**. Nobody may later cite this e2e as the privacy
gate. **SHOULD (cheap, precedent `recruit.spec.ts:956`, `pvp-full.spec.ts:624`):** in T4, one
`spacetime sql "SELECT * FROM player_wallet"` asserting **exactly one row exists server-side** at
the moment B looks — turns v1's prose vacuity-argument (iii) into an assertion. Drop it only if the
invocation proves environment-fragile.

## R7 (ADD) — close the count tooth's cross-file and alias bypasses (red-team S7, MEDIUM)

The tooth reads `main.ts` only. Two real bypasses survive: `import { buildShopViewModel as buildShop }`,
and a future production call site in another `client/src` file. Using the existing
`readClientSrc(relPath)` (`main.wiring.test.ts:3091`), add:
- walk `client/src/**/*.ts`, excluding `*.test.ts` and `ui/shopModel.ts` (its `ForShop` delegation
  at `:160` is legitimate) — assert `main.ts` is the ONLY file containing either needle;
- assert the import specifier text `import { buildShopViewModel, buildShopViewModelForShop }` is
  contiguous in `main.ts` (the `as` alias form does not match).

## R8 (FIX) — subscription-tooth wording and anchors

- **Reviewer m2:** 11r-e-1's negative clause as worded ("SHALL NOT name `player_wallet` … anywhere
  in `connection.ts`") invites a whole-file `not.toContain('player_wallet')`, which goes **RED** on
  the rewritten comment — the `my_conversation` form being copied (`connection.ts:569-571`)
  explicitly names its private table. **Reword: "…inside the `.subscribe([...])` array."**
- **Reviewer m1:** the required comment rewrite is otherwise ungated. Add to 11r-e-1: the **RAW**
  (un-stripped) `connection.ts` SHALL NOT contain `produces no client subscription`.
- **Red-team S8:** add `expectUniqueAnchor(src, '.subscribe([')` (`connection.test.ts:124-131`)
  before windowing.

## R9 (FIX) — e2e details

- **Reviewer m4:** T2's `setTimeout(300_000)` is copied from `dialogue.spec.ts:385-451`, which
  budgets that for **one** talk+advance round trip. T2 needs **two**. **Raise T2 to 480_000** (or
  split into "start the quest" + "complete the quest", 300 s each).
- **SIMPLIFY S3:** drop the "observed containing … AND now does not" latch. Two sequential bounded
  loops: loop A talks/chooses until the log **contains** `quest_001`; loop B talks until it **does
  not**. Same race tolerance, no latch state.
- **Red-team S11:** the `Gold:`-absence check MUST use `textContent` on `#shop-overlay`, never
  `innerText` — `#shop-balance` is `hidden`, and `innerText` would omit it, making the exclusion
  vacuous.
- **Reviewer n7:** T3 must explicitly capture the baseline (B's tile / the render count) that T5
  diffs against.
- **Reviewer m5:** the flake-budget text must NOT claim the `QuestComplete → grant_currency` half is
  CI-proven. `dialogue.spec.ts:436-438` proves talk → advance → `StartQuest` and asserts the quest
  **still active at step 0**; `quest_001` appears in no other spec. The *completion* half is new.
- **Reviewer n2:** A's `(5,4) → E,S,W → (5,5)` detour is 2 steps longer than a single `S`; nothing
  blocks the direct step (`world.rs:129` is tile-kind only). Either is fine — drop the note implying
  otherwise.

## R10 (SCOPE) — 11r-e-7 is a 2-of-3 runtime witness; :1443 is source-scan-only

`main.ts:1443` (the unbound `buildShopViewModel(` arm) is **unreachable at runtime**: `boundShopId`
is set at `:1376` before every open and the overlay only opens bound (`:1432-1433`). Say so in
ADR-0169 rather than claiming a 3-of-3 behavioral proof. Correspondingly — and this is why no later
reviewer may cut the source scan as "e2e-redundant" — **11r-e-3 (`batcher.schedule()`) and 11r-e-3b
(no `onDelete`) are structurally unreachable by ANY e2e**: with `schedule()` omitted the next NPC
wander tick re-renders and T3/T5 self-heal, and D4's catastrophe needs a wallet *update*, which the
150-gold price floor makes impossible in this run.

## R11 (DEFER, with the CORRECT reason) — the trade-leg extension

Reviewer M2 established that v1 §5's "a second identity with a different nonzero balance is **not
reachable**" is **factually wrong**: `propose_trade` (`server-module/src/trading.rs:221-229`) takes
`initiator_currency`/`counterparty_currency`, has **no** proximity/zone guard, routes
`spend_currency` → `grant_currency` (`:693, :716`), and is already driven from e2e via the
`__mrTrade` hook (`main.ts:1701+`, precedent `client/e2e/trade-full.spec.ts`). `A: 50 → 0` and
`B: 0 → 50` is deterministic and RNG-free, and would additionally prove `0n` renders **`Gold: 0`,
not blank** — ADR-0154 D6's central "broke ≠ dark" distinction, behaviorally unproven after this
slice (unit-only, `shopModel.test.ts:701-777`).

**Decision: DEFER to a follow-up.** Reason — it costs a full multi-step trade round trip
(propose → respond → confirm) through the escrow/`has_active_trade` interlock machinery, which is a
materially larger and riskier e2e than this slice's budget supports. It is **not** deferred because
it is unreachable. Record it that way in ADR-0169 and in the handoff as the strongest named
follow-up. The reviewer-M1 hole it would have closed behaviorally is closed structurally by R3.

## R12 (BOY SCOUT, in-cap) — `ARCHITECTURE.md` factual error

`ARCHITECTURE.md:645` says `apply_quest_trigger` is "called from `advance_dialogue` reducer in
`npc.rs`". It is called from **`talk`** (`npc.rs:270-277`); `advance_dialogue` (`:288-371`) fires no
trigger. `ARCHITECTURE.md` is in the touch-set and we are already editing the adjacent §"Economy
client" (`:648-658`). One-line fix, attributed under `boyscout-delta:`.

Everything else in v1 §6 stays **skipped** (the `SdkConversationRow` local-declaration
inconsistency; the `main.ts:1345` missing `identity === ''` guard; `main.wiring.test.ts:244-265`
F-5f, which is **11r-h's** declared scope — do not poach).

## R13 (BOOKKEEPING)

- ADR number is **0169**, supervisor-assigned. ADR **0168** is unallocated on disk (highest is
  0167) — flag the gap to the supervisor in the handoff; do NOT self-assign it.
- The slice spec's `main.ts:719, 1286` and ADR-0154 D7's `main.ts:701-708 / 1265-1279` are both
  **stale**, and both say TWO call sites. There are **three** (`:1378`, `:1436`, `:1443`). Record
  the correction in ADR-0169; the spec line is the supervisor's to reconcile.
- STOP #1 residual wording: both runners are in `just ci` (`justfile:355`), but the client tooth
  runs under **`just client-test`** (`justfile:143-144`), not `just test` (which is
  `cargo nextest`, `justfile:24-26`). Fix the label in ADR-0169.
- Reviewer n4: "Semgrep bans `new RegExp` repo-wide" is inaccurate (no Semgrep config in-repo;
  `detect-non-literal-regexp` is run ad-hoc per `docs/adr/0064-*.md`). The no-`RegExp` rule is a
  real **per-file convention** (`main.wiring.test.ts:2524, 2557, 5186`) — follow it, cite it
  correctly.

## Verified-clean (do not re-tread)

Three call sites at `main.ts:1378/1436/1443`, no others in `client/src` production code (both code
graphs agree). `quest_001` has `start_conditions: []`, one step, `currency: 50`; `StartQuest` is
idempotent against `done_quests` (`npc.rs:105-119`); the `Talked` trigger fires in **`talk`**, not
`advance_dialogue`; `npc.rs:175` is the module's only `player_quest` delete; `join_game` grants no
gold and no items, so B genuinely has **no wallet row** (`economy.rs:29-32`'s zero-guard prevents a
phantom row). Routes verified tile-by-tile; shop prices 200/300/**150**. `shopView.ts:97-100`
writes text + `hidden` + `dataset.balanceState` on every render before the no-shop early return, and
no CSS anywhere touches `#shop-balance` — so `data-balance-state="unknown"` positively proves
`render()` ran. `store.ts` / `shopModel.ts` / `shopView.ts` / `module_bindings` all sufficient
as-is. `playwright.config.ts:13` auto-discovers the new spec; no `retries`, so a T4 failure cannot
false-green T5. Adding `'SELECT * FROM my_wallet'` breaks no existing eval
(`wallet-privacy` check S needles `FROM player_wallet`; `conversation-privacy` check D unaffected;
`currency-integrity` is server-tree only; mutation cap untouched — no server code in scope).
`vite.config.ts:99-100` excludes `main.ts` + `connection.ts` from the coverage denominator;
`rowConvert.ts` gains a covered exported function. Argument-order needs no assertion — tsc rejects
`StoreWallet | undefined` in the `readonly StoreInventory[]` slot at both signatures.
