# Plan — m24-s4: i18n migration batch B (evolution · raising · box · trade · shop → `t()`/`tf()`) (planner output, 2026-09-20)

Worktree `projects/monster-realm/.claude/worktrees/m24-s4` · branch `feat/m24-s4-i18n-migration-b` · ADR-0260 (`**Extends:** 0256, 0257, 0259`) · after S3 (8e71e5d). Pattern = S3 verbatim unless a decision below says otherwise.

## Measured census (real S2 scanner at HEAD 8e71e5d; census file: memory/projects/m24-s4-scan-census.txt)
evolutionView 13 sinks / 11 failing · raisingView 16/10 · boxView 15/12 · tradeView 16/4 · shopView 17/9 → **77 sinks, 46 FAILING → HARDCODED_CEILING 57 → 11**. (Spec's per-file split 13+17+15+16+16 is wrong; measured 13+16+15+16+17.)
Scanner-invisible hoisted literals: tradeView 'You offer'/'You receive' (#renderSide args), #actionLabel returns 'Accept'|'Reject'|'Confirm Trade'|'Cancel'; boxView prompt('New nickname:'). 7 total, zero ratchet effect.

## Files
| File | Change |
|---|---|
| evolutionView.ts | 11 failing sinks → 12 keys; `import { t, tf } from './i18n/resolver'`; title/hint → fields, resolved in `show()` |
| raisingView.ts | 10 sinks → 10 keys; title/`Monsters`/`Inventory` h3 → fields, resolved in `show()` |
| boxView.ts | 12 sinks + `prompt()` hoisted → 13 keys; title/heal/hint/`Party`/`Box` → fields, resolved in `show()` |
| tradeView.ts | 4 sinks + 6 hoisted → 10 keys; no constructor-time strings |
| shopView.ts | 9 sinks → 9 keys; `emptyRow(t('…'))` (helper kept — `m24s0 I18N-5` pins exactly one `createElement('li')`) |
| messageIds.ts | +54 MessageId members, +17 MessageParams rows (ONE table) |
| catalog.en.ts | +54 entries with `// @desc:`; bytes transcribed from source |
| __fixtures__/i18n-hardcoded.json | 57 → **11** |
| Tests (tester) | 5 view tests (+3 its each, `vi.mock('./i18n/resolver',{spy:true})`), catalog.test.ts (roster 42→96, +CAT-03) |
| Docs | docs/adr/0260-*.md (new) · DIGEST.md (`just adr-digest`) · ARCHITECTURE.md one paragraph under M24 after m24-s3 |
| Harness | spec §4 S4 row as-built bracket; gates ledger X1..X8 |

## Key roster (54 new → 96 total; ★ = MessageParams row). English value = CURRENT source bytes.
evolution.* (12): evolution.title 'Evolution' · evolution.hint (ONE string, `+`-join collapsed) · evolution.monsters.empty 'No monsters yet.' · ★evolution.card.stats {level,stage,trust,qualityTime,nutrition} `Lv.${level} · Stage ${stage} · Trust ${trust} · Quality time ${qualityTime} · Nutrition ${nutrition}%` · evolution.card.noPaths 'No evolution paths.' · ★evolution.card.ready {species} `Ready — evolves into ${species} on your next action.` · evolution.card.choosePrompt 'Two or more paths are ready — pick one:' · ★evolution.path.heading {species} `→ ${species}` · evolution.path.allMet 'All requirements met.' · ★evolution.gate.metRow {label,current,required} `✓ ${label}: ${current} / ${required}` · ★evolution.gate.unmetRow (same) `• ${label}: ${current} / ${required}` · ★evolution.choice.evolve {species} `Evolve into ${species}`.
raising.* (10): raising.title 'Raising & Inventory' · raising.monsters.heading 'Monsters' · raising.inventory.heading 'Inventory' · raising.monsters.empty 'No monsters.' · ★raising.card.status {level,trust,current,max} `Lv${level} · Trust ${trust} · HP ${current}/${max}` · ★raising.card.stats {attack,defense,speed,spAttack,spDefense} `ATK ${} · DEF ${} · SPD ${} · SP.ATK ${} · SP.DEF ${}` · raising.card.care 'Care' · ★raising.card.train {name,count} `Train: ${name} (x${count})` (ASCII x) · raising.inventory.empty 'No items.' · ★raising.inventory.item {name,count} `${name} (x${count})`.
box.* (13): box.title 'Party & Box' · box.heal 'Heal Party' · box.hint (ONE string incl. "To Party" quotes) · box.section.party 'Party' · box.section.box 'Box' · ★box.party.emptySlot {slot} `Slot ${slot}: (empty)` · box.box.empty 'No monsters in box.' · box.card.rename 'Rename' · ★box.card.stats {species,level,current,max,percent} `${species} · Lv${level} · HP ${current}/${max} (${percent}%)` · box.card.evolveBadge '★ Ready to evolve — choose a path' · box.card.toBox 'To Box' · box.card.toParty 'To Party' · box.rename.prompt 'New nickname:' (hoisted).
trade.* (10): trade.status.none 'No active trade' · trade.side.offer 'You offer' · trade.side.receive 'You receive' · ★trade.side.card {nickname,species,level,current,max} `${nickname} (${species}) Lv.${level} HP:${current}/${max}` · ★trade.side.currency {amount: bigint} `${amount} gold` · trade.side.nothing '(nothing)' · trade.action.accept 'Accept' · trade.action.reject 'Reject' · trade.action.confirm 'Confirm Trade' · trade.action.cancel 'Cancel'.
shop.* (9): shop.title 'Shop' · shop.noShop 'No shop available.' · shop.forSale.empty 'Nothing for sale.' · shop.inventory.empty 'No items to sell.' · ★shop.buy.row {name,price: bigint} `${name} — ${price} gold ` (TRAILING SPACE) · shop.buy.submit 'Buy' · ★shop.sell.row {name,count,price: bigint} `${name} (×${count}) — ${price} gold ` (trailing space) · shop.sell.submit 'Sell' · ★shop.sell.unsellable {name,count} `${name} (×${count}) — Cannot sell`.
Untouched (PASS, tier-(e)): evolution `${nick} (${species})`; raising mon.nickname, item.description; box `card.nickname || card.speciesName`; trade `${item.name} ×${item.qty}`, vm.statusLabel; shop vm.shopName, vm.balance.label; showFeedback(msg); '' clears; replaceChildren().

## Decisions
1 Scope = 46 failing + 7 hoisted; byte-identical English. Population correction → ADR.
2 Gate row = two ★ keys, ternary OUTSIDE the call (`gate.met ? tf('evolution.gate.metRow', p) : tf('evolution.gate.unmetRow', p)`); whole-row keys, one text node in one element (m23s9 census `root.children.length === 3` must not change).
3 Constructor-time strings resolve in `show()` (S3 R1): node kept as `readonly #xEl` field, textContent assigned in `show()` after the `wasVisible` read, before the display write. evolutionView #titleEl/#hintEl; raisingView #titleEl/#monstersLabelEl/#inventoryLabelEl; boxView #titleEl/#healBtn/#hintEl/#partyLabelEl/#boxLabelEl. COST: six pre-show `e2eBoxRootOf` sites in boxView.test.ts (:160,172,200,215,247,264) → tester adds `s4BoxRootOf(parent) = parent.firstElementChild` with loud null guard; post-show sites keep the text anchor. Rejected: constructor write + show() re-write (redundant).
4 Model data are params, never catalogued; params keep model TYPES (bigint for trade currency / shop prices). Sentinel JSON.stringify needs a bigint replacer in TV-02/SV-02.
5 Every t(/tf( first arg literal; no wrapper; no dynamic key; no unused key; no resolver/scanner/main.ts/Model edit; emptyRow helper stays.
6 Routing oracle = spy + sentinel with per-surface `«key|params»` containment pins for every ★ surface (verifier M10). Per-file scan pin failing===[] exact, sinks>= floor.
7 catalog.test.ts: EXPECTED_42_KEYS → EXPECTED_KEYS; it-title prefixes kept; CAT-03 per-namespace exact census (chrome 10, battle 23, pvp 9, evolution 12, raising 10, box 13, trade 10, shop 9 = 96) + code-point/whitespace pins (— → ★ ✓ • ×, ASCII x in raising.*, endsWith(' ') on shop.*.row, "To Party" in box.hint).
8 ADR-0260: Subsystems client-ui, ci-gates; population correction, taxonomy, D2–D4, boxView test-anchor consequence, residuals (glyph-only rows; `Slot ${i}` 0-based, native prompt(), `(x${count})` pre-existing).

## Tests (RED at HEAD)
Per view V ∈ {EV,RV,BX,TV,SV}: V-01 routing (spy, exact key+params per site, pre-show negative for constructed views' titles, DOM byte-identical; shop pins li.firstChild.textContent) · V-02 sentinel (construct BEFORE mockImplementation; try/finally + mockRestore + post-restore control; explicit VM matrix per view; whole-subtree walk; SplitSentinels forged-span guard; roster-word absence; containment pins; fixture collision rule — EV must NOT reuse FIVE_GATES; BX stubs prompt) · V-03 scan (copy BV-03 exactly; floors 13/16/15/16/17). catalog.test.ts grown (+37 plain, +17 ★ with two sets differing in EVERY field, transcribed from CURRENT source) + CAT-03. JSON 57→11.
Mutants: (a) literal beside t() (b) constant closure (c) ternary key swap (d) JSON-only (e) key aliasing (f) param dropped (g) void tf + inline template (h) constructor-only t() (i) hoisted literal left raw (j) trailing space dropped (k) local shadow t (l) view-local wrapper.

## Ledger X1..X8
X1 ratchet (I18N-18 + CEILING=11) · X2 EV 3 passed · X3 RV · X4 BX · X5 TV · X6 SV · X7 catalog.test.ts 8 passed (8) · X8 typecheck.

## Tasks
T1 tester RED — two parallel agents: A = evo/raising/box tests + catalog.test.ts; B = trade/shop tests → T2 reviewer ∥ red-team on tests → T3 specialist (messageIds → catalog → views → measure → JSON → typecheck/biome/vitest/eval; never edits a test) → T4 ADR-0260 + adr-digest + ARCHITECTURE + ledger + spec bracket → T5 reviewer(+simplify) ∥ verifier → docs.

## Risks
bigint in sentinel JSON.stringify · six pre-show e2eBoxRootOf sites · EV fixture roster collisions · prompt absent in happy-dom · long-literal lines >100 cols · shop.*.row trailing space · S6‖S4 ceiling race · boxView.test.ts vi.mock also spies BattleView show() (mockClear) · m23s9 census if a migrated node gains a child.

## Hidden-dependency flags: NONE requiring out-of-touches edits (wallet-privacy.eval anchors balance.label/kind; keyboard-operable-rows tabindex '-1'; overlay-a11y-manifest export class; e2e/test pins are rendered-output, byte-identical; a11yCopy.ts M23 copies untouched).

## Anti-patterns
`t(cond ? 'a':'b')` · view-local wrapper · keying glyph-only rows · fixing Slot ${i}/(x${count})/prompt() "while here" · exact sink counts · per-element spot checks · editing S3 it-title prefixes · resolving in refresh() for constructed views · clearAllMocks inside sentinel try · reusing FIVE_GATES/knownBalance · second MessageParams list.

## Right-sizing: ONE PR (trade+shop are the simplest files; a split doubles fixed cost and still serialises on messageIds/catalog). Fallback: park trade+shop as S4b only if tester B finds a static-shell dependency.

## /simplify (orchestrator lens, 2026-09-20)
S1 CUT CAT-03: the per-namespace census is implied by the exact sorted `EXPECTED_KEYS` roster (`toEqual`), and the code-point/trailing-space pins are implied by CAT-01's exact-bytes equality on every plain value and both ★ outputs. Second oracle for the same property → YAGNI. X7 EXPECT stays `/Tests +7 passed \(7\)/`. D7 amended accordingly.
S2 Keep D2/D4/D6/two testers. D3 kept pending the reviewer's answer on a cheaper shape.

## Revisions after reviewer (plan lens, 2026-09-20)
R1 (M1) e2e pre-show h2 lookups: NONE — every recruit.spec.ts `h2['Party & Box']` query sits inside a waitForFunction that already requires `root.style.display !== 'none'`, and `getByText('Heal Party').isVisible()` is the open-check (pre-show = not visible today too). D3 stands; only the six boxView.test.ts sites need the structural helper.
R2 (N1) ADR-0260 one-liner: `*.row`/`*.line` name a formatted text unit (parallel to `battle.card.hpLine`), not an HTML tag — survives R3's "semantic not mechanism" test.
R3 (N2) ADR-0260 footnote: `replaceChildren(emptyRow(t('…')))` passes the scanner because `exemptCallOpenAt` (hardcodedStrings.ts:416-426) tests only the char before `t`/`tf`, so a nested resolver call inside a sink argument zeroes its segments.
R4 (N3) X1 chained `node -e` CHECK re-linted for THIS ledger: `mr-gates lint --slice m24-s4` → LINT-CLEAN.
Confirmed by the reviewer: D2 safe vs the m23s9 census (`root.children.length === 3` counts title/hint/list only; gate rows are deeper); all 54 keys pass the D5 grammar, no collision with S5's `tradePropose.*`; bigint types real (tradeModel.ts:37, shopModel.ts:27/35), S3 sentinel uses JSON.stringify → replacer needed; one PR agreed.

## Revisions after red-team (plan lens, 2026-09-20)
RT1 (MAJOR, shared infra, OUT of touches) `exemptCallOpenAt` (hardcodedStrings.ts:416-426) does not reject `#` before `t`/`tf`, so `this.#t('raw English')` scans as an exempt call — PoC'd: sinks 1 / failing 0. NOT fixed here (hardcodedStrings.ts is outside `touches:`); closed for S4 by V-01's exhaustive exact-key spy pins (a private `#t` never calls the imported `t`). → register residual after the lenses (`mr-gates residuals add`), fix = one `before === '#'` reject.
RT2 (MAJOR) Repeated `show()` must RE-resolve: V-01 for EV/RV/BX calls `show()` a second time (no hide) after `mockClear()` and asserts the title/hint/heading keys are requested again — kills an `if (!wasVisible)`-gated write (stale text after a mid-session locale switch).
RT3 (MAJOR) D6 reworded: containment pins for EVERY migrated surface, plain AND ★ (S3's BV-02 already pins all plain keys). The 7 hoisted literals (trade.side.offer/receive, trade.action.accept/reject/confirm/cancel, box.rename.prompt) are REQUIRED individual sentinel pins.
RT4 (MAJOR) `box.rename.prompt` has no existing test scaffolding: BX-01/BX-02 author the flow from scratch — `vi.stubGlobal('prompt', vi.fn(() => null))` (PoC'd under happy-dom), click Rename, assert prompt's first arg (English bytes in BX-01, `«box.rename.prompt»` in BX-02), restore in finally.
RT5 (MINOR, policy-only) `t(cond ? 'a' : 'b')` / pass-through local wrapper are indistinguishable to every planned oracle — enforced by reviewer diff inspection; S7's DYNAMIC-KEY gate is the future mechanical closer.
RT6 (MINOR) tradeModel returns mutually exclusive action sets (['confirm','cancel'] / ['cancel'] / ['accept','reject']) — TV-01/TV-02 need ≥2 VM states to reach all four `trade.action.*` labels.
Non-issues PoC'd: I18N-18x self-consistency alone admits a wrong ceiling, but X1's `/CEILING=11$/m` re-executed by `mr-gates check`/`verify` pins it; recruit.spec.ts lookups are post-show; the six boxView.test.ts pre-show sites are exactly the enumerated set; JSON.stringify(bigint) throws loudly (replacer needed in BOTH TV-02 and SV-02); FIVE_GATES collision rule is belt-and-braces (spans are elided whole), kept because cheap.

## Test-phase lenses (2026-09-20) — reviewer (pinned clone @35359cf) ∥ red-team-writes-the-cheat
Reviewer: READY, no blockers. All 54 keys have -01 spy pin + -02 containment pin + catalog byte pin; 7 hoisted literals pinned; RT2 repeat-show pinned in EV/RV/BX; forged-span guards per-view; floors are floors; catalog roster rename complete, 7 `it(`. MINOR: EV/RV/BX WalkSubtree lacks the `<option>` branch (inert — no <select> in those views). MEDIUM (inherited from m24-s3): -02 JSON containment pins are param-key-ORDER sensitive; not changed (would diverge from m24-s3's shipped shape) — specialist brief mandates the plan's field order.
Red-team (16 mutants, worktree restored clean): no BLOCKER survives the -01/-02/-03 trio. KILLED: void-t/tf beside literal (×2), literal assigned after t(), trailing space, ternary swap, constructor-only + !wasVisible-gated (BX-01), aliasing, hoisted raw, non-trainable Train, wrong ceiling (I18N-18x), private #t (SV-01/02; SV-03 alone survives = RT1). MAJOR-1 APPLIED: shop fixture buyPrice 10n → 17n / sellPrice 4n → 23n (a `10 gold` decoy closure coincided with the fixture; catalog CAT-01 caught it, shopView alone did not). MAJOR-2 accepted: SV-02 alone launders a forged `«shop.title»` literal (valid key inside brackets) — the trio (SV-01 spy + SV-03 scan) closes it, same shape as S3. MAJOR-3 = the order-sensitivity above (accepted/inherited).

## Implementation + verification (2026-09-20)
Specialist: 8 touches files, no test edits; measured 11 before the JSON edit; found RV-02's `'Cared for Kiri!'` fixture contains roster word `Care` (jointly unsatisfiable) → orchestrator fixed to `'Tended Kiri!'`; biome format on 2 tester files. /simplify inline: show() rationale canonical in evolutionView, 3-line pointers in raising/box. Verifier PASS (detached copy): X1–X8 reproduced, 3303/3303, RED→green integrity clean over 7cda839..a192179, mutants M1–M8 all KILLED (M8 own-choice: param-key reorder killed only by -02 → the inherited order-sensitivity, confirmed). Full `just ci` GREEN at a192179 (CI-EXIT 0, /tmp/m24-s4-ci1.log). Ledger 8/8. Residual R-m24-s4-RT1 registered. PR #490.
