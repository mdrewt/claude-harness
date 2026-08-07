# M-postgate-twelfth-review-residuals — verified 2026-08-07 review findings

> **Status:** NEW, queued. Inserted 2026-08-07 after `M-postgate-eleventh-review-residuals`
> (fully merged) and after the in-flight `M-evolution-essence-graph` (EG4/EG5 outstanding),
> per the weekly-review insertion convention (cf. M8.5, M8.6, 11r).
> **Review ordinal:** twelfth multi-lens review.
> **Pinned SHA:** `3c1cf080b522b9d40a54395c1a4bfca33ed4e96a` (short `3c1cf08`), 2026-08-07T00:38Z UTC.
> **Method:** 10 independent sonnet lenses over an isolated `--no-hardlinks` clone; every
> reported finding independently re-verified by separate verifier agents that were given the
> claim and location only, not the finder's framing or confidence. Twelve claims verified,
> zero dropped; four had their severity revised DOWN by the verifier and those revisions are
> the severities recorded here.
> **Scope:** no new game-design surface. One decision is open with Drew (§4) and deliberately
> has NO slice in this milestone.
> All `path:line` citations are @ `3c1cf080b522b9d40a54395c1a4bfca33ed4e96a`.

## 1. Why this milestone exists

The 28-commit delta since the eleventh review (`3063149..3c1cf08`, ~49k insertions) landed the
whole 11r basket plus EG1/EG2/EG3 — the essence-graph rewrite. That work is unusually clean:
six of ten lenses found nothing reportable in their area, and the security, netcode, and
test-integrity lenses each returned an explicit "no findings" after deep passes. The defects
that remain are almost entirely in the **enforcement and documentation layer around** the
code rather than in the code itself: two gates that have quietly stopped covering what they
claim to cover, a tester-facing doc that instructs testers to press deleted keys, and a
basket of residuals that were honestly disclosed at 11r-g but landed in no queue afterwards.

That last class is worth naming. `M-postgate-eleventh-review-residuals` recorded its parked
items faithfully inside the slice text, but recording is not queueing: an exhaustive grep of
`PLAN.md` and every `*.spec.md` in this corpus finds no follow-up slice for any of them. The
same is true of the `lead_party` gap ADR-0175 names in its own Consequences. Disclosure
without a queue entry is how a known defect becomes a forgotten one, and it is the highest-
value finding class this review process keeps producing.

## 2. Slices (ROI order; `touches:` per the M8.9 domain map)

### 12r-a — Append-only id baselines restored + growth guard (HIGH, LIGHT) — `touches: evals/baselines/{species-ids,item-ids,skill-ids}.json, evals/append-only-ids.eval.mjs`
`after:` (nothing — fully disjoint, run first)

Three of the oldest and largest content registries have effectively **no append-only
protection**, because their baselines were never updated as content grew:
- `evals/baselines/species-ids.json` pins `[1, 2, 3]`; `game-core/content/species/*.ron`
  ships 16 ids up to 31 (1,2,3,4,5,6,7,8,9,10,20,21,22,23,30,31).
- `evals/baselines/item-ids.json` pins `[1, 2]`; live items are 1–5 — including items 4/5,
  which ADR-0176 D6 just repurposed as the essence sources.
- `evals/baselines/skill-ids.json` pins `[1..6]`; live skills are 1–11.

The gate only flags ids that *disappear from the baseline*
(`evals/append-only-ids.eval.mjs:158-162`, `removedIds(baselineIds, currentIds)` filters
baseline ids absent from current) — so an id that was never in the baseline is invisible to
it. Deleting or renumbering species 20, item 4, or skill 7 today passes this gate green.
`git log` confirms these three files have not been touched since their original M6a/M6b/M9d
commits, across seven subsequent content-adding commits to `game-core/content/species/`
alone. The sibling baselines added by 11r-i (`abilities`, `shops`, `npcs`) ARE in sync — the
gap is specific to the three registries that predate that slice.

The only backstop is `evals/content-version.eval.mjs` + `evals/baselines/content-hash.json`,
which forces a `CONTENT_VERSION` bump on any content change. That is a visibility tripwire,
not a semantic one: it cannot distinguish "added an id" from "renumbered an existing id", and
a developer bumping the version as part of a normal-looking content PR sails straight through.

- Regenerate all three baselines from the live registries, using the same read-the-RON
  discipline 11r-i used for abilities/shops/npcs.
- Add a guard so this cannot silently regress the same way again: fail when a registry's live
  id set contains ids absent from its baseline (i.e. make the check bidirectional, with an
  explicit "baseline needs regeneration" message), rather than only when baseline ids vanish.
- EARS: E1 with baselines regenerated, `append-only-ids` passes on unmodified content.
  E2 removing any currently-shipped species/item/skill id from its RON turns the gate RED
  (proof-of-teeth, one fixture per registry — this is the case that passes today).
  E3 adding a new id to content WITHOUT updating the baseline turns the gate RED with a
  regeneration message.

### 12r-b — PLAYTEST.md control-table reconciliation (HIGH, docs-only, LIGHT) — `touches: docs/PLAYTEST.md`
`after:` (nothing — fully disjoint, run first)

`docs/PLAYTEST.md` is the tester-facing onboarding doc and states at `:40` that it is "Kept in
sync with the in-client help overlay — `client/src/ui/helpModel.ts`". It is not:
- `:54` documents `H` = "Heal your party" and `:55` documents `G` = "Open the shop". Both
  hotkeys were **deleted by uxd2** — ADR-0161's Decision line says "global KeyG/KeyH are
  removed", `helpModel.ts:11-13` records the deletion, and `client/src/main.ts` has no `KeyG`
  or `KeyH` branch anywhere (verified against the full keydown handler: the live set is
  `KeyB KeyI KeyE KeyQ KeyU KeyP KeyL KeyN KeyO KeyT KeyM`).
- `:74` step 7 still tells the tester to "**Shop** (`G`) and **heal** (`H`) in town."
- `M` — the two-level main menu (ADR-0162), the single most significant discoverability
  addition in this whole delta — appears **nowhere** in PLAYTEST.md.

A tester following this doc literally presses two dead keys for two core loops and never
learns the menu key exists. Every other row in the table was checked and is correct, so the
fix is small and exact.

- Remove the `G`/`H` rows, add the `M` row, and rewrite step 7 to route shop and heal through
  the interact key `T`, matching `helpModel.ts`'s `CONTROLS` list exactly.
- EARS: E1 every key documented in `docs/PLAYTEST.md`'s control table has a corresponding
  entry in `helpModel.ts`'s `CONTROLS`, and vice versa. Prefer wiring this as a real check
  (a client unit test asserting set-equality between the parsed doc table and `CONTROLS`)
  over a one-time hand edit — `helpModel.ts` is already the declared SSOT, and this drift
  recurred silently once already.

### 12r-c — `monster-dual-write` eval recognises `pub(crate) fn` boundaries (MED, LIGHT) — `touches: evals/monster-dual-write.eval.mjs`
`after:` (nothing — fully disjoint)

`splitIntoFnBodies` detects function boundaries with exactly two literal markers
(`evals/monster-dual-write.eval.mjs:53-54`):

```js
const fnMarker = '\nfn ';
const pubFnMarker = '\npub fn ';
```

Neither matches `pub(crate) fn`. Because `readServerModuleSources` (`:363-370`) concatenates
the **entire** `server-module/src` tree into one string before splitting, an unrecognised
declaration is absorbed into the preceding recognised function's span — potentially across
file boundaries. Confirmed absorbed rather than independently checked: `apply_evolution`
(`evolution.rs:123`) and `check_and_evolve` (`:190`), both swallowed by `pub fn evolve`
(`:50`), the file's only recognised boundary; and `write_back_party_hp` (`battle.rs:975`),
`essence_battle_reward` (`:1016`), `write_back_battle_results` (`:1039`) and
`resolve_wild_battle_on_disconnect` (`:1346`), all swallowed by `pub fn use_battle_item`
(`:871`).

The eval **passes today** — every absorbed function happens to be internally compliant, so the
merged span still satisfies the co-presence check. That is exactly what makes it worth fixing
now: the gate no longer verifies each function's own mirror, only that *some* compliant pair
exists somewhere in the blob. A future `pub(crate) fn` with a `monster()` write and no
`monster_pub()` mirror — a very likely shape for EG4/EG5 helpers — would be masked. Dual-write
divergence is the invariant behind a prior CRITICAL in this codebase (the `fuse` bug,
ADR-0072), so this is a gate protecting a proven-expensive failure mode.

Note two sibling evals already do this correctly and can be copied from:
`no-idle-accrual.eval.mjs:319` (`enclosingFnName`, word-boundary-checked `fn ` needle) and
`evolution-reducer-security.eval.mjs:73-74` (targeted per-name lookup). Neither shares the
blind spot — this is an oversight in one file, not a deliberate scope limit.

- Generalise the boundary detection to any visibility modifier (`pub(crate) fn`,
  `pub(super) fn`, `pub(in ...) fn`), ideally by adopting the sibling evals' word-boundary
  approach rather than adding a third literal marker.
- EARS: E1 a fixture declaring a non-compliant `pub(crate) fn` (monster write, no
  `monster_pub` mirror) immediately after a compliant `pub fn` turns the gate RED. This
  fixture passes today — it must start red. E2 the real tree still passes unchanged.

### 12r-d — ADR-0170 disclosed-but-untracked residual closure (MED) — `touches: server-module/src/{schema,content,pvp,taming,battle,npc}.rs, client/module_bindings/*, client/src/net/{store,rowConvert}.ts, client/src/ui/{healModel,healView}.ts`
`after:` 12r-a, 12r-b, 12r-c may run before or in parallel; nothing blocks this slice

11r-g honestly disclosed three parked items and ADR-0170 lists them as residuals — but an
exhaustive grep of `PLAN.md` and every `*.spec.md` in this corpus for `cost_currency`,
`cached_abilities`, `cached_type_chart`, `type_chart_from_rows`, `json_escape`, and `11r-j`
finds **no queued follow-up anywhere**. They are disclosed-but-untracked. This slice is the
queue entry they never got. Line numbers below are re-verified at `3c1cf08` (ADR-0170's own
citations have drifted ~70-75 lines from later growth).

1. **`HealLocationRow.cost_currency` — the silent-debit trap (the load-bearing item).**
   `schema.rs:562-572` has `location_id, zone_id, tile_x, tile_y, cost_item_id, cost_qty,
   cooldown_ms` and no currency column; the seed literal at `content.rs:735` matches; and
   `client/src/ui/healModel.ts:1-30` documents its own `costCurrency` seam as **INERT**
   ("today's store rows never carry it, so absent ⇒ 0 is production's path"). The seam exists
   on the client but nothing can ever feed it. A pure content edit that sets a non-zero heal
   currency cost would therefore charge the player with no UI indication at all. Add the
   additive column (`#[default(0)]` precedent), the seed read, the bindings regen, and the
   client display arm — 11r-g explicitly names the currency-display arm as a non-optional
   pairing, not an optional polish.
2. **`pvp.rs`/`taming.rs` content-cache swaps.** `pvp.rs:280` and `:392` still call
   `load_abilities()` uncached per action, `pvp.rs:383` still rebuilds the type chart via
   `type_chart_from_rows(...)`, and `taming.rs:207` still calls `load_abilities()` (its own
   comment at `:205` marks the park). `battle.rs` was swapped in 11r-g (`:245,424,610,749`
   use `cached_abilities()`; `:588,735` use `cached_type_chart(ctx)`), so this is finishing a
   half-applied change — copy the `battle.rs` call shape exactly.
3. **Unescaped JSON log sites.** `battle.rs:1158, 1240, 1256, 1266, 1384` and `npc.rs:164`
   interpolate `{e}` — RON/serde parse-error text, which routinely contains quotes — directly
   into hand-built JSON log lines. `json_escape` exists at `guards.rs:31-45` precisely for
   this and is not used at any of them. Route all six through it.
- EARS: E1 a heal location authored with a non-zero currency cost debits the stated amount and
  the heal UI displays it (no silent debit). E2 `pvp`/`taming` ability and type-chart reads go
  through the cache — assert zero `load_abilities(`/`type_chart_from_rows(` needles remain in
  those two files outside the cache module. E3 a parse error whose message contains a double
  quote produces a log line that parses as valid JSON (table-driven, mirroring the existing
  `guards_tests.rs` `json_escape` teeth).

### 12r-e — Validator & core hardening tail (LOW-MED) — `touches: game-core/src/content.rs, server-module/src/{content,battle,movement,raising}.rs`
`after:` 12r-d — **SERIAL**, both touch `server-module/src/content.rs` and `battle.rs`

Four independent, individually-cheap items. All were verifier-confirmed as real and all were
verifier-downgraded to Low — none is a live bug today, and each closes a trap rather than a
wound. Bundle them; do not spawn four slices.

1. **R4 "no vacuous path" tests field presence, not gate semantics** (`game-core/src/content.rs:1000-1013`).
   The check rejects an edge only when `min_level <= 1 && essence.is_empty() &&
   min_trust_tier.is_none() && min_quality_time_tier.is_none() && min_nutrition_pct.is_none()`.
   Four encodings are structurally "present" but semantically no gate at all, because each is
   the minimum of its comparison: `essence` with `amount: 0` (`eligibility.rs:56-58` compares
   `>= amount` on a `u32`), `min_trust_tier: Some(TrustTier::Hostile)` (`Hostile` is the
   lowest `Ord` variant), `min_quality_time_tier: Some(0)` (range `0..=4`), and
   `min_nutrition_pct: Some(0)` (range `0..=100`). Any one of them makes R4's `&&` chain
   false while `path_satisfied` returns true for **any** monster. Under EG2-11's
   auto-evolution a content edge authored this way fires at monster creation with no player
   action — the failure mode R4 exists to prevent, and the one ADR-0176 D2/D7 already worry
   about from the other direction. Shipped content is clean (all ten edges use amounts
   100–150 and `Some(Friendly)`), and no existing R4 test probes the degenerate boundary.
   Fix by testing vacuity against the same thresholds `path_satisfied` uses.
2. **`lead_party`'s silent whole-party disable** (`battle.rs:283-296`, consumed at
   `movement.rs:150`). `Level::new(lead.level).ok()?` makes the function return `None` for the
   *entire* party when the lead's level is out of range, with no log line. Pre-EG2 that only
   silenced a wild-encounter roll; EG2 added the `enqueue_move` consumer that drives
   `accrue_quality_time` + `check_and_evolve` for every party monster, so the blast radius is
   now "all Quality-Time and auto-evolution progress for that player, on every move,
   forever". ADR-0175 Consequences item (4) names this exactly and proposes the fix
   ("wants an ids-only helper") — it is in no queue. **Reachability, verified honestly: not
   currently reachable.** Every write to `Monster.level` in this SHA passes through
   `Level::new` or an already-`Level`-typed value (`marshal.rs:63`, `battle.rs:1213`,
   `evolution.rs:145`, `taming.rs:161`), so this is defense-in-depth against a future writer
   or a migration/corruption event, not a live defect. Add the ids-only helper so the growth
   tail does not depend on the lead's level parsing, and add a `log::warn!` on the failure
   path so it can never be silent again.
3. **Dead R1 duplicate-pair backstop** (`server-module/src/content.rs:66-82`). The
   `HashSet<(from_species, to_species)>` scan runs immediately after
   `validate_evolution_paths` returned `Ok`, over the same unmutated `Vec`, in the same
   function, with nothing in between — and game-core's R1 (`game-core/src/content.rs:961-972`)
   is the identical algorithm on the identical key. It is provably unreachable. ADR-0174 D5
   documents the two-checkpoint intent, so this is not an accidental duplicate, but the code
   does not deliver what it claims: its comment calls itself "the LAST line of defense against
   a duplicate edge reaching the DB" when nothing between the two checks could introduce one.
   Either delete it and let R1 be the single enforcement point its own comment already claims
   to be, or move it to run against the **written** `evolution_path` rows post-insert, where
   it would be a real boundary. Update ADR-0174 D5's wording to match whichever is chosen.
4. **Quality-Time cap write amplification** (`raising.rs:531-538`, caller `:574-593`). Once
   `creditable == 0` (daily cap `QT_DAILY_CAP_MS` = 2h exhausted) `apply_quality_time_credit`
   still returns `true`, so `accrue_quality_time` performs an unconditional
   `ctx.db.monster().monster_id().update(m)` that changes only an invisible clock anchor — no
   tick, no tier change, nothing `check_and_evolve` can observe. On `movement.rs:181`, which
   the code's own comment calls "the hottest reducer in the game", that is one wasted row
   write per party monster per ~5s of active play for the rest of the UTC day. The verifier
   ran the falsification test explicitly: persisting the anchor here is **not** load-bearing
   for day-rollover, backwards-clock, or resumed-window correctness, because the idle-gap
   branch (`gap > QT_IDLE_GAP_MS`) already bounds anchor staleness independently. Return
   `false` in this branch (or gate the update on `ticked`).
- EARS: E1 each of the four degenerate R4 encodings is rejected by `validate_evolution_paths`
  (four tests; all four pass-when-they-should-fail today). E2 a party whose lead has an
  out-of-range level still accrues Quality-Time for its valid members, and the failure is
  logged. E3 a cap-exhausted monster produces no `monster` row write on a subsequent
  qualifying `accrue_quality_time` call. E4 duplicate-pair rejection still has exactly one
  enforcement point and its comment describes it accurately.

### 12r-f — Ledger & doc reconciliation (LOW-MED, docs-only) — `touches: CHANGELOG.md, ARCHITECTURE.md, docs/adr/{0151,0162,0163,0174}.md, docs/adr/DIGEST.md, scripts/adr-digest.mjs`
`after:` (nothing — fully disjoint; cheap and compounding, good to run early)

1. **CHANGELOG has re-drifted one delta after 11r-d fixed it.** `ARCHITECTURE.md:259-263`
   states the policy as a bound — "regenerate at every milestone close ... so the ledger can
   lag by at most the open milestone". `CHANGELOG.md`'s highest entry is `#269`; PRs
   `#270`–`#283` (13 numbers, 12 real slices plus one doc-regen chore) are all absent.
   `ARCHITECTURE.md:1240` itself records that 11r-i (`#278`) was that milestone's LAST slice,
   so an entire milestone closed without the regen and a second is now open on top of it —
   the stated bound is breached on the doc's own terms, not on a slice-vs-milestone
   technicality. `cliff.toml` groups every conventional type including `chore`, so none of
   these would be legitimately dropped. Run `just changelog`. (Distinct from open decision
   **D4** in the 11r spec, which asks whether a *mechanical gate* should exist; this is the
   current drift, which needs fixing either way.)
2. **`ARCHITECTURE.md:193` says the `evolution_paths` registry is "empty until EG3 authors
   content".** EG3 landed at `83b4092`/`#282`: `game-core/content/evolution_paths/000-core.ron`
   holds the real ten-edge graph, exercised by `game-core/tests/eg3_evolution_graph.rs`. Drop
   the qualifier. **Overlap note:** EG5-7 owns rewriting ARCHITECTURE.md's hand-authored
   "Evolution/Fusion content" section. This cell is in the content-registry table, not that
   section, so it is not covered — but if EG5 lands first, sweep it there and drop this item
   rather than doing it twice.
3. **Four ADRs are missing the `Amended-by:` back-link `AGENTS.md:31-34` requires.**
   `0163` declares `Amends: 0151, 0162`; `0164` declares `Amends: 0162, 0163`; `0175` and
   `0176` both declare they amend `0174`. Grepping `Amended-by` across `0151`, `0162`, `0163`,
   `0174` returns zero matches. `0119` carries a populated `Amended-by: ADR-0122, ADR-0125,
   ADR-0132`, so the convention works when remembered. Add the four back-links.
4. **The digest gate structurally cannot catch (3).** `scripts/adr-digest.mjs:256-266`
   (`checkRefs`) only verifies that ids inside a *populated* field resolve to real ADRs; all
   four call sites at `:269-272` are one-directional dangling-reference checks. `just
   adr-digest-check` therefore passes green with every back-link missing, and `DIGEST.md`'s
   table (`:10-11`) has no `Amended-by` column, so the omission is invisible there too. Extend
   `checkRefs` (or add a sibling) to fail on a one-directional `Amends`/`Amended-by` mismatch,
   with a proof-of-teeth fixture. Without this the same drift recurs every wave.
- EARS: E1 `CHANGELOG.md` contains every merged PR through HEAD. E2 `just adr-digest-check`
  fails on a fixture corpus where ADR X declares `Amends: Y` and Y has no `Amended-by: X`
  (RED today), and passes on the real corpus once the four back-links are added.

## 3. Sequencing & fan-out

- **12r-a, 12r-b, 12r-c, 12r-f are pairwise disjoint and disjoint from everything else** —
  four independent fan-out candidates, each LIGHT. 12r-b and 12r-f are docs-only; 12r-a and
  12r-c touch only `evals/`. Run whichever pair the governor allows first (N ≤ 2 per
  `docs/routing.md`); 12r-f early, since a stale ledger degrades the next planning pass.
- **12r-d → 12r-e is SERIAL**: both touch `server-module/src/content.rs` and
  `server-module/src/battle.rs`. Do not pair them. 12r-d is the larger of the two (it carries
  a schema column, a bindings regen, and client wiring).
- **Against the live queue:** EG4 and EG5 of `M-evolution-essence-graph` are still outstanding.
  EG5-6 (Migration B) touches `server-module/src/schema.rs`, which **12r-d also touches** —
  coordinate explicitly or land 12r-d first, since Migration A and Migration B must remain
  distinct publishes and a third schema change interleaved between them needs a deliberate
  ordering call. EG5-7 overlaps 12r-f item 2 (see the note there). EG4 is `main.ts`-SERIAL and
  touches no file in this milestone.
- Optionally run `$MEM/mr-disjoint` on the (a, b), (a, c), (b, f), (c, f) pairings before
  fanning out — advisory, NECESSARY-NOT-SUFFICIENT, never overrides toward parallel.
- **Priority:** a, b (HIGH) > c, d > f > e.

## 4. DECISIONS for Drew

One open decision. It has **no slice in this milestone** — no code change is proposed pending
the answer.

- **rev12-1 — Should per-monster raising progress stay world-readable on the public
  `monster_pub` table?** → https://github.com/mdrewt/monster-realm/issues/284
  The EG1 migration appended 12 columns to the public, unfiltered `monster_pub`
  (`schema.rs:310-367`): the 8 `essence_*` pools, `trust_tier`, `quality_time_tier`,
  `nutrition_pct`, `tier`. ADR-0174 D1 justifies them purely functionally and contains zero
  occurrences of privacy/exposure/visibility/leak/scouting — the trade-off was never weighed,
  which is what makes this a decision rather than a defect. Default is (a) ratify and revisit
  at the M25 audit. Recorded here because EG4 is queued but **not yet built**, so option (b)
  — splitting the surface behind an owner-scoped view — is cheaper now than it will ever be
  again. Distinct from the still-open 11r §4 D1 (public `battle` table team-sheet scouting):
  that is battle-time-only, this is persistent and battle-independent; resolving one does not
  resolve the other.

**Still open from the eleventh review** (unanswered, not re-raised, listed so this milestone's
reader has the full picture): 11r §4 D1 battle-table team exposure · D2 unsolicited-trade
escrow griefing · D3 held-key cadence pinned to LAN-class RTT · D4 changelog freshness gate.
The essence-graph tier cap (`Species.tier <= 5`) also remains deliberately provisional.

## 5. Explicitly NOT in scope

- Everything already carried by the 11r spec's own §5 not-in-scope list (shop arbitrage
  validation, dead `setMove`/`clearQueue`, `hp_permille` floor-vs-round, weather `_ =>`
  Affinity arms, clippy ban-list proactive gaps, devLog outer-proxy bind memoization) —
  unchanged, still batch opportunistically.
- EG4 and EG5 of `M-evolution-essence-graph`, including Migration B's removal of the dead
  `bond`/`evolves_to`/`Fusion` members and the fusion-shaped eval rewrites. Their absence at
  this SHA is correct, not a residual.
- `edge_id` cross-revision append-only enforcement — R12 currently checks uniqueness within
  the present content set only, which is genuinely not append-only enforcement, but ADR-0176
  D1 assigns that to EG5-1. 12r-a deliberately does **not** extend to `edge_id`; if EG5-1
  slips, re-raise it rather than absorbing it here.
- `M-postgate-client-coverage`, `M-postgate-roster-wave-3`, and the carried `uxd3-d`
  Escape-tooth boy-scout — all queued elsewhere, order unchanged.
- Production observability, dashboards, SLOs, load testing (M20) and general accessibility
  (M23) — unbuilt capstones, not residuals.

## 6. Notes for the runner

- Six slices, ADR per slice reserved at build time (verify `adr_next_free` in `mr-state.json`
  before reserving — 177 as of 2026-08-05, unconsumed by this spec). No tier hints: derive
  HARD/routine mechanically from `touches:`.
- Every slice is test-first with a proof-of-teeth per ADR-0010. Note that **three slices'
  headline teeth are RED-today by construction** — 12r-a E2, 12r-c E1, and 12r-e E1 all
  describe fixtures that pass at this SHA and must start red. That is the point of those
  slices; a green-from-the-start test there means the fix was not actually applied.
- 12r-b's EARS deliberately asks for a mechanical doc↔`CONTROLS` check rather than a hand
  edit. The hand edit is acceptable if the check proves disproportionate, but say so in the
  ADR rather than silently dropping it — this exact drift already recurred once.
