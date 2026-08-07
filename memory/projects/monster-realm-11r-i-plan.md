# 11r-i — Gate-coverage extensions — PLAN

**Slice:** 11r-i (M-postgate-eleventh-review-residuals, final slice) · **Tier:** routine · **ADR:** 0173
**Branch:** `feat/11r-i-gate-coverage` · **Worktree:** `.claude/worktrees/11r-i` (off master@713679f)

## touches: (hard boundary)
`evals/**` (incl. `evals/baselines/**`) · `scripts/smoke-republish.sh` · `server-module/src/npc.rs`
(+ sibling `server-module/src/npc_tests.rs`)
Doc companions: `docs/adr/0173-*.md`, `docs/knowledge/**`, `ARCHITECTURE.md` (minimal).
NOT: `docs/adr/README.md`, `CHANGELOG.md` (generated), `.github/workflows/**`, `justfile`,
`server-module/Cargo.toml`, `game-core/**`, `client/**`.
Runtime `sed`-patch-then-restore by `smoke-republish.sh` is NOT a git touch (precedent: it already
patches `server-module/src/lib.rs` under a `trap`).

## EMPIRICAL SPIKE RESULT (2026-08-02, live spacetime 2.6.0 @ 127.0.0.1:3099)

Published the real module (`--features dev_reducers`, `--bin-path`) to a scratch DB and ran:

| Probe | Result |
|---|---|
| `spacetime call join_game '"SpikePlayer"'` then `SELECT * FROM player` | **EMPTY** |
| `SELECT monster_id, party_slot FROM monster` | 1 row survives |
| `SELECT * FROM encounter` | 2 rows, nested `entries` rendered as `(species_id = 1, weight = 10, …)` |

**Conclusion — RT-SR-01 CONFIRMED** (`scripts/smoke-republish.sh:37-39` is correct, not merely
defensive): a one-shot `spacetime call` connects, runs, and disconnects, firing `on_disconnect`
(`server-module/src/lib.rs:189-215`). Therefore:

- `start_wild_battle` in a *later* one-shot call would be rejected ("player not joined"), and even
  if a `battle` row were created, `battle::resolve_wild_battle_on_disconnect` (ADR-0138,
  `battle.rs:1260-1325`) auto-flees and **deletes** it the instant that call's connection closes.
- A held-open SDK client does not help: republish disconnects clients → the same reaper fires.
- PvP is equally unreachable (`pvp::cancel_challenges_on_disconnect` deletes the pending challenge
  before a second identity could accept).

**=> Item (3)'s literal `battle`/`BattleState` subject is INFEASIBLE. Substitute subject:
`encounter.entries: Vec<EncounterEntryRow>` — confirmed live-readable above.**

## Ship-vs-park

**Ship:** T1 (dialogue C6), T2 (numeric append-only), T3 (string-id append-only), T4 (npc.rs warn),
T5 (ADR-0173 + docs) — then **T6 (item 3, substitute subject) LAST**, validated against the live
local server. If T6 does not validate in bounded attempts, it parks to **11r-j** with its full
design already recorded in ADR-0173 (so 11r-j is execution, not re-investigation).

Rationale for sequencing T6 last: it is the only item that cannot be validated by `just ci` alone
(nightly-only phase), and the only one carrying sed/live-server fragility. Core lands green first.

## Hidden-dependency STOP list (do not silently include)
- `.github/workflows/nightly.yml`, `justfile`, `server-module/Cargo.toml`, `server-module/src/battle.rs`
  — were only required by the abandoned battle-row route. The substitute phase needs **none** of them.
- `game-core/tests/pt_d1_roster.rs:146/361/741` and `pt_d3_tuning.rs:718/803` assert *properties of*
  `evals/append-only-ids.eval.mjs` (whole-line comment stripping; the "id 7 authored twice across two
  part files" trap). **T2 may only ADD registries — never alter `parseIds`/`readRegistryDir`
  semantics.** A semantic change is a STOP.
- `evals/npc-dialogue-quest-security.eval.mjs` (C5), `evals/economy-sinks-sources.eval.mjs`
  (QUEST_GRANT), `server-module/src/economy_tests.rs:696` all slice the `apply_quest_trigger` body by
  brace matching + comment stripping. T4 must keep them green **without edits**: balanced `{{`/`}}`,
  no block comments in added lines, no double-quote inside a Rust char literal.

## Tasks

### T1 — `evals/dialogue-client-integrity.eval.mjs` C6: whole-directory read + TEXT comparison
Read every `*.ron` in `game-core/content/dialogue_trees/` **as independent parts** in sorted
filename order (mirrors `game-core/build.rs:29` glob + `content.rs:1172` `parse_dialogue_trees_parts`,
which parses each part separately — do NOT concatenate).

Root-cause finding: the `nodesBlockStart = ronSrc.indexOf('nodes:')` guard is **already wrong on the
committed single file** (two trees; the 2nd tree's tree-level id is not skipped; both trees define a
node id `greeting` so `findStandaloneIdPos` first-occurrence-matches the wrong one). Fix by
**segmenting per tree** before any position logic. Node ids are tree-scoped, never global.

Normalization policy: **escape decoding only** (`\\ \" \' \n \r \t`, `\uXXXX`), then byte-for-byte
compare. NO trimming / whitespace collapsing / case folding / Unicode normalization. Unsupported
string forms (TS template literals, string concatenation, RON raw strings, unknown escapes) **fail
loud** — never skip. Compare node `text` and the **ordered list of choice texts** (subsumes the old
count check), plus the **reverse direction** (bundle entry absent from RON is drift too).
No `new RegExp(` anywhere (Semgrep `detect-non-literal-regexp`; has bitten 3×).
Residual to name in the ADR: `next_node`/`nextNodeId` linkage comparison is out of scope.

EARS: E1-1 read all parts sorted · E1-2 node in a non-`000` part missing from bundle ⇒ FAIL naming
file+id · E1-3 node text drift ⇒ FAIL reporting both · E1-4 choice text/order/length drift ⇒ FAIL
naming tree/node/index · E1-5 duplicate node id across trees compared per-tree, not first-occurrence
· E1-6 unsupported string form ⇒ explicit `unsupported string form` failure, never a skip · E1-7
duplicate tree id across parts ⇒ FAIL · E1-8 no normalization beyond escape decoding · E1-9 no
`new RegExp(` · E1-10 passes against the committed tree.

Teeth: T1-a synthetic `010-*` part w/ bundle-missing node (PASSes under old single-file read) ·
T1-b one-char node-text drift · T1-c same choice count, different text · T1-d `"It's here."` vs
`'It\'s here.'` PASS but vs `'Its here.'` FAIL · T1-e TS template literal ⇒ `unsupported string form`
· T1-f duplicate node id across trees, B's text swapped for A's ⇒ FAIL · T1-g bundle node absent
from RON ⇒ FAIL. Also fix the stale header (lines 5, 13-14) still saying "000-core.ron".

### T2 — numeric append-only: add `abilities`, `shops`, `npcs`
Extend `evals/append-only-ids.eval.mjs` **in place** (table-driven registry list at :57-82; same
mechanism ⇒ same file). New baselines `evals/baselines/{ability,shop,npc}-ids.json`.
`evals/run.mjs` auto-discovers `evals/*.eval.mjs` (`run.mjs:8-11`) — **no edit** (fan-out doctrine).
Verified `parseIds` (`/\bid:\s*(\d+)/g`) is safe: `item_id:`/`zone_id:`/`sprite_id:`/`npc_id:`/
`buy_price:`/`denom:` all fail the `\b` boundary or are non-numeric. Current: abilities=[1,2,3],
shops=[1], npcs=[1,2].

EARS: E2-1/2/3 dropped baseline id in abilities/shops/npcs ⇒ FAIL naming it · E2-4 empty baseline
array ⇒ FAIL (not a vacuous pass) · E2-5 non-`id` numeric fields never counted · E2-6 whole-line-only
comment-strip semantics preserved.
Teeth: shops fixture w/ `stock: [( item_id: 42, buy_price: 5 )]` extracts only the entry id ·
abilities fixture w/ `EntryHeal(denom: 4)` · npcs fixture w/ `zone_id: 5, sprite_id: 11` ·
empty-baseline ⇒ FAIL.
**Boy Scout (in cap):** empty-baseline guard in `checkRegistry` (`removedIds([], …) === []` passes
vacuously today), ~4 lines / 1 hunk.

### T3 — NEW `evals/append-only-string-ids.eval.mjs` + deliberate `heal_locations` exclusion
New sibling file (different extraction mechanism; must not perturb the numeric eval that two
`game-core/tests/*.rs` files assert properties of). Baselines
`evals/baselines/{quest,dialogue-tree,npc-string}-ids.json`.

Spec-premise corrections to record in the ADR:
- **`npcs` ids are numeric, not strings.** `npcs/000-core.ron` has `id: 1` *and* `npc_id: "elder_oak"`.
  Both are stable: numeric `id` = entity key (T2); string `npc_id` is what `quests`
  (`Talk(npc_id: "elder_oak")`) and `schema.rs:367` (`Npc.npc_id`, `#[unique]`) key on ⇒ T3.
  `npcs` therefore lands in **both** gates.
- **`dialogue_trees`: pin TREE ids only.** Node ids are tree-scoped and duplicated (`greeting` in both
  trees) ⇒ a flat node-id baseline is ambiguous; node-level drift is T1's job.
Persistence justification: `schema.rs:401` `PlayerQuestRow.quest_id: String`, `:414`
`PlayerConversation.current_node_id: String`, `:373` `Npc.dialogue_tree_id: String` — **live player
rows key on these strings.** This is the same defect class T4 detects at runtime.

**`heal_locations` exclusion comment (verified, must be truthful):**
> Deliberately excluded. (a) No persistent row keys on `location_id` — `heal_cooldown`'s primary key
> is `owner_identity` (`server-module/src/schema.rs:445-450`), and `raising.rs` treats an unlisted
> `location_id` as a free heal rather than an error. (b) ADR-0140 §ptc5e-2 gave
> `seed_heal_locations_from` a stale-delete via the pure `stale_heal_location_ids` seam
> (`server-module/src/content.rs:397`, delete loop at `:690-691`), so a heal location removed from RON
> is *deleted* from `heal_location_row` by design. Removal is a supported content operation, not drift.

EARS: E3-1/2/3 dropped string id in quests / dialogue-tree ids / `npc_id` ⇒ FAIL naming it · E3-4
extractor returns only top-level entry ids (never nested dialogue node `id:`, never
`Talk(npc_id:)` references) · E3-5 reads all `*.ron` parts sorted · E3-6 empty baseline ⇒ FAIL ·
E3-7 the `heal_locations` exclusion comment is present and cites ADR-0140 §ptc5e-2 +
`stale_heal_location_ids` · E3-8 no `new RegExp(`.
Teeth: dropped id ⇒ FAIL · quests `Talk(npc_id: "elder_oak")` NOT extracted · dialogue node
`id: "greeting"` NOT extracted while both tree ids ARE · npcs `dialogue_tree_id:` NOT extracted as an
`npc_id` · id declared only in a `010-*` part is found · empty baseline ⇒ FAIL.

### T4 — `server-module/src/npc.rs` unknown-quest `log::warn` (once-per-sync)
One `log::warn!` in the `else` arm at `npc.rs:157-160`; `continue` stays. NOT a reducer/schema change.

**"Once-per-sync" realized as a process-static `RateLimiter` with a 60 s window**, reusing the
existing `pub(crate) struct RateLimiter` / `check(now, window_ms) -> Option<suppressed>` in
`server-module/src/movement.rs:185-224` (ADR-0170 D4) — `pub(crate)`, so **no `movement.rs` edit**.
Justification: (a) no sync-generation counter exists to hang a literal "per sync" on, and reading
`config.content_version` per call adds a DB hit on the dialogue path; (b) quest content can only
change via a **republish**, which reinstantiates the wasm module and resets process statics — so
"once per window per process" *is* "at least once per content sync"; (c) established precedent,
already unit-tested (`movement_tests.rs:1535-1580`), and it reports the suppressed count so the warn
is never silently lossy. Clock via `crate::marshal::now_ms(ctx)` (ADR-0003 injected clock).
Rejected: per-invocation `bool` (loses cross-call visibility); `OnceLock` fire-once-per-process (a
genuinely new occurrence becomes invisible forever).
Event name `quest_def_missing`, structured-JSON style matching `npc.rs:147`, `quest_id` through
`crate::guards::json_escape` (ADR-0170 D5 — content-authored text crossing into hand-built JSON),
plus `suppressed`.

EARS: E4-1 unknown `quest_id` ⇒ `log::warn` event `quest_def_missing` w/ escaped `quest_id` ·
E4-2 further unknowns inside the window suppressed, count reported on the next emitted warn ·
E4-3 control flow unchanged (remaining rows still processed) · E4-4 `json_escape` applied ·
E4-5 an ungated `let _ = LIMITER.check(…); log::warn!(…)` must fail the gating test ·
E4-6 exactly one `log::warn!` site in the body · E4-7 `npc-dialogue-quest-security` C5,
`economy-sinks-sources` QUEST_GRANT and `economy_tests.rs::apply_quest_trigger_calls_grant_currency`
stay green **without modification** · E4-8 `docs/knowledge/**` line anchors regenerated
(`reducers/talk.md:8` pins `npc.rs#L195`; `advance_dialogue.md#L289`, `dismiss_dialogue.md#L375` all
shift) and `knowledge-bundle-conformance` passes.

Testing: log capture in SpacetimeDB reducer tests is unavailable ⇒ compensating control is a
source-scan test in the existing `server-module/src/npc_tests.rs` (repo's established mechanism,
pattern at `npc_tests.rs:292-332`; anti-cheat concatenated-needle discipline from
`movement_tests.rs:2095-2135`). Do NOT duplicate `RateLimiter` semantics tests.
Teeth: `quest_def_missing` present (kills deletion) · `log::warn!` not `info!`/`debug!` (kills
severity downgrade) · whitespace-compacted concatenated-needle pin that `check(` is immediately
followed by `log::warn!` (kills the ungated-`let _ =` cheat 11r-g had to kill) · `json_escape(`
present AND `let _ = json_escape(` absent · exactly-one-`log::warn!` count pin · `continue` present.

**Source-scan authoring gotchas (recorded memory):** evals' regex strippers misalign on unpaired
`/*` in comments and on double-quotes inside Rust char literals — use `0x22` constants, avoid
glob-slash-star sequences in comments, scrub per file not globally.

### T5 — ADR-0173 + docs
`docs/adr/0173-<slug>.md` with the ADR-0104 canonical header (`Status/Date/Slice/Supersedes/Amends/
Subsystems/Decision`), subsystems from `ci-gates` · `content` · `schema-persistence`.
Decisions worth recording (nothing else): (1) `heal_locations` exclusion rationale; (2) string-id gate
design incl. the `npcs`-ids-are-numeric correction; (3) the C6 redesign — per-part reading, per-tree
segmentation, the finding that the `nodes:`-position guard is already wrong today, the
escape-decoding-only normalization policy, and the `next_node` residual; (4) **the item-(3) viability
finding + empirical spike result + the substitute-subject design**; (5) the once-per-sync log
semantics and rejected alternatives.
`just adr-digest` is drift-gated — MUST re-run. Do NOT touch `docs/adr/README.md` or `CHANGELOG.md`.
`ARCHITECTURE.md`: one targeted addition near line 221 (which already documents the
`build.rs` ↔ `append-only-ids` lexicographic-sort coupling).

### T6 (LAST, droppable to 11r-j) — BSATN additive-nested-schema nightly phase
Subject: **`encounter.entries: Vec<EncounterEntryRow>`** (`EncounterEntryRow` at
`server-module/src/schema.rs:177-183`, column at `:193`). Why it beats `battle.state`:
- nested struct inside a `Vec` inside the row (strictly a superset of the flat-nested case);
- **survives disconnect** — `encounter` is session-independent (listed at
  `evals/smoke-republish-on-disconnect-compat.eval.mjs:49`; confirmed live in the spike);
- readable via `spacetime sql` despite being private (owner identity reads private tables — the
  script already does this for `monster`); confirmed live in the spike;
- **not re-seeded during the test**: `sync_content_inner` early-returns on a version match and `init`
  does not re-run on republish, so a phase running *after* the existing Phase 5 that bumps nothing
  inspects rows written by the *previous* module build ⇒ a genuine old-row migration;
- **sed is trivially safe**: exactly ONE non-test construction site (`server-module/src/marshal.rs:101`)
  vs 81 for `BattleState`. Two seds (struct def in `schema.rs`, ctor in `marshal.rs`) + grep verify.

Proof-of-teeth (a nightly phase that can only pass is not a gate) — three independent checks:
1. **Source-liveness:** grep that the sed landed in BOTH files (pattern: the existing
   `CONTENT_VERSION` grep at `smoke-republish.sh:69-70`). Without it a silently-failed sed leaves the
   phase asserting "rows survive an unchanged republish" — the vacuous version.
2. **Schema-liveness:** after republish, `spacetime describe` must show the new field on the nested
   type — proves the patched module is what is live.
3. **Migration, not wipe:** capture `zone_id` + `entries` for all rows before; require exact match of
   pre-existing values after, row count unchanged and non-zero. Failure is detectable both ways —
   either `spacetime publish` exits non-zero (script dies under `set -euo pipefail`) or rows vanish.

**Restore hazard:** the `trap` at `smoke-republish.sh:28` restores ONLY `server-module/src/lib.rs`.
Extend it to `schema.rs` + `marshal.rs`, else a local run leaves the tree patched and `just ci` red
for unrelated-looking reasons. Runtime-only ⇒ does not widen `touches:`.

**Self-contained:** needs NO `dev_reducers`, NO `--bin-path`, NO `nightly.yml`, NO `justfile` change.

**`evals/nightly-smoke-wiring.eval.mjs` MUST be extended** — it pins job/script/recipe/ADR wiring plus
shebang/`set -euo pipefail`/length, but **enumerates no phase by name**, so a new phase could be
deleted with zero gate signal. Add one pure predicate (e.g. `smokeScriptHasAdditiveSchemaPhase`)
requiring the phase marker, both sed targets, the post-sed grep verification, the field-liveness
probe, and the extended `trap` — with bad/good inline fixtures per the file's TEETH A-L convention.

## `just ci` attention
`just ci` = lint · typecheck · test · eval · security · wasm · client-typecheck · client-test
(`justfile:355`). Nightly smoke does NOT gate CI.
- `just eval` — new/changed evals + six new baseline JSONs must be exact.
- `just lint` — `biome check .` on new `.mjs`; `cargo fmt --check` + `clippy -D warnings --all-features`
  on `npc.rs`.
- `just test` — `cargo nextest run --workspace` runs `npc_tests.rs` AND the out-of-scope readers.
- **`just knowledge` mandatory after T4** (line-anchor drift; drift-gated).
- **`just adr-digest` mandatory after T5** (drift-gated).
- Not triggered: `content-version.eval.mjs` / `baselines/content-hash.json` — no `game-core/content/**`
  edits. Adding a content file WOULD require a `CONTENT_VERSION` bump; keep this true.

## Anti-patterns to avoid
Vacuous assertions (empty or extractor-generated baselines; a text comparison that skips what it
cannot parse) · gates that cannot fail (no negative control; a tooth that would also pass against the
OLD implementation — T1-a/T1-b exist precisely to fail old code) · over-broad normalization (trim,
case fold, whitespace collapse, Unicode NFC — each a silent drift channel) · tests coupled to
implementation detail (pin the observable contract, not line numbers or private helper names) ·
scope creep outside `touches:` (especially the `nightly.yml`/`justfile`/`Cargo.toml` trio, and editing
the three out-of-scope body-parsers instead of writing `npc.rs` code they already accept) · silently
widening a shared helper (`parseIds`/`readRegistryDir`) instead of a purpose-built extractor ·
hand-editing generated artifacts (`CHANGELOG.md`, `DIGEST.md`, `docs/knowledge/**`).

## Boy Scout ledger (cap ~40 lines / ≤3 hunks)
- **Taken:** empty-baseline guard in `append-only-ids.eval.mjs` `checkRegistry` (~4 lines, 1 hunk);
  stale C6 header in `dialogue-client-integrity.eval.mjs` lines 5/13-14 (~6 lines, 1 hunk).
- **Spotted, NOT taken (follow-up flag):** `readRegistryDir` is duplicated three times
  (`append-only-ids.eval.mjs:21`, `zone-id-append-only.eval.mjs:10`,
  `evolution-fusion-content-integrity.eval.mjs:213`) with **divergent** comment-strip semantics
  (whole-line vs all `//`). De-duping would change zone-map scanning semantics and cross into the
  game-core-test blast radius.

## Risks
1. **T1 is the subtlest item** — a hand-rolled RON segmenter without `RegExp` is where a vacuous
   shortcut is most tempting ("skip nodes whose text we cannot parse"). E1-6 + tooth T1-e mitigate;
   make it the red-team focus.
2. **Escape-decoding asymmetry** — RON and TS escape sets are close but not identical. A decoder that
   silently passes an unknown escape through creates false PASSes. E1-6 must cover unknown escapes.
3. **T2 collateral** — additive-only is safe; any `parseIds`/`readRegistryDir` semantic change is a STOP.
4. **T4 body-parser collateral** — three out-of-scope gates brace-match the `apply_quest_trigger` body.
5. **`docs/knowledge` regen churn** — review the diff, don't accept blind.
6. **Baseline correctness** — a baseline generated *from* the extractor under test is self-confirming.
   Derive by reading the RON, then cross-check against the extractor; a mismatch is signal.
7. **T6 fragility** — sed against real source + nightly-only feedback. Bounded attempts, then park.

---

# PLAN ADDENDUM (post plan-review: reviewer + red-team + empirical repros)

## A. EMPIRICAL SCHEMA-MIGRATION MATRIX (spacetime 2.6.0, live @127.0.0.1:3099, verified by me)

| Shape attempted on a live DB, republish WITHOUT `--delete-data` | Result |
|---|---|
| Field appended to **nested** struct `BattleState` (`Option<u8>` + `#[serde(default)]`) — the SPEC'S OWN SUBJECT | **REJECTED**: `Changing the type of column state in table battle from (...) to (..., smoke_probe: (some: U8 \| none: ())), with fewer fields, requires a manual migration` |
| Field appended to nested `EncounterEntryRow` inside `Vec<>` column (red-team repro) | **REJECTED**, same class |
| Top-level column inserted **mid-struct**, no default annotation | **REJECTED**: `Reordering table battle requires a manual migration` + `Adding a column smoke_probe to table battle requires a default value annotation` |
| Top-level column **appended at END** with `#[default(0)]` | **ACCEPTED** — publish succeeds; pre-existing rows survive (verified `monster_id 1` intact after) |

`#[default(expr)]` is a real column annotation in the pinned bindings macro
(`spacetimedb-bindings-macro-1.12.0/src/table.rs:597,722-762,851-865`).

**Consequences:**
1. `evals/bsatn-compat-smoke.eval.mjs:6-7` states *"SpacetimeDB handles additive schema at the ENGINE
   level when publishing without --delete-data"* — **empirically FALSE** for nested struct columns and
   for un-annotated/reordered top-level columns. This false claim is the single most valuable thing
   this slice fixes.
2. The ADR-0006 additive promise holds ONLY for: a column **appended at the end** of a table struct,
   carrying an explicit `#[default(...)]`.
3. `BattleState` is already pinned by `evals/spacetime-type-snapshot.eval.mjs` via
   `evals/baselines/spacetime-types.json` — so a nested-type widening already fails CI today, but with
   a drift message that does not tell the author it is an unmigratable change.
4. The spec's proposed nightly phase ("republish with one additive BattleState field while a live
   battle row exists, asserting the row survives") is **unbuildable as written** — the publish aborts
   before any row assertion, and no live `battle` row can exist anyway (RT-SR-01 confirmed).

## B. REVISED SHIP / PARK

**SHIP in 11r-i:** T1, T2, T3, T4, T5 **+ T6-lite** (the item-(3) *finding*):
correct the false header/finding in `evals/bsatn-compat-smoke.eval.mjs`, add a machine-visible
criterion pinning the verified matrix and naming `spacetime-type-snapshot` as the enforcing gate for
nested types, and record everything in ADR-0173. This satisfies the spec's actual goal — *"converts
the engine-level assumption into a tested fact"* — the tested fact being that the assumption is false.

**PARK to 11r-j:** the `scripts/smoke-republish.sh` **Phase 7** itself (append-at-end +
`#[default(...)]` + republish + row-survival assertion) and its `nightly-smoke-wiring` predicate.
The verified recipe is in §A so 11r-j is execution, not investigation.

## C. RED-TEAM FIXES — MANDATORY, fold into the tasks

- **T1 / HIGH (live false-PASS proven):** `extractRonChoiceCounts` counts `[`/`]` with no
  string-literal awareness; an unbalanced `]` inside authored choice text (e.g. `"Rank 1] Accept"`)
  desynchronizes the scan and a bundle **missing an entire choice** reports as matching. The redesign
  MUST track "inside a string literal" (honoring escaped quotes) before counting ANY structural
  character. **New E1-11** + mandatory tooth: an unbalanced bracket/paren inside a `text:` value must
  not corrupt segmentation or choice extraction.
- **T1 / MEDIUM (escape grammar wrong in the plan):** RON 0.8.1's real escape set is
  `\' \" \\ \n \r \t \0 \xHH \u{1..6 hex}` (braced) — **not** JS-style bare `\uXXXX`
  (`ron-0.8.1/src/parse.rs:836-886`). Correct the decoder spec; add a tooth that a malformed/
  missing-brace unicode escape fails LOUD rather than mis-consuming trailing characters.
- **T1 / LOW:** E1-7 (duplicate tree id across parts) has no tooth — add one. Add an explicit
  positional (not membership) tooth for ordered choice-text equality (reorder + duplicate-text swap
  must FAIL).
- **T2 / HIGH (live false-PASS proven):** `readRegistryDir` strips only WHOLE-LINE `//` comments, so a
  mid-line trailing comment mentioning `id: 99` keeps a **genuinely deleted** id "present" and
  `removedIds` never flags it. `game-core/tests/{pt_d1_roster,pt_d3_tuning}.rs::comment_needle_violations`
  defends species/evolutions/encounters/items/shops — but **NOT `abilities` or `npcs`**, the two new
  registries. `game-core/**` is outside `touches:`, so the gap cannot be closed there in this slice.
  **In-scope countermeasure (mandatory):** add an eval tooth — a fixture RON with exactly this
  trailing-comment pattern must still FAIL for a really-removed id — for all new registries, and
  record the residual in ADR-0173 as a named follow-up.
- **T3 / MEDIUM (plan text is FACTUALLY FALSE):** the drafted exclusion comment claims *"raising.rs
  treats an unlisted location_id as a free heal rather than an error."* Actual code
  (`server-module/src/raising.rs:295-298`) returns `Err("heal location not found")`. **Rewrite the
  rationale** to: (a) no persistent row keys on `location_id` (`heal_cooldown` PK is `owner_identity`,
  `schema.rs:445-450`); (b) ADR-0140 §ptc5e-2's `stale_heal_location_ids` seam (`content.rs:397`,
  delete loop `:690-691`) deletes removed locations by design; (c) a removed id fails closed with a
  bounded `Err` at the reducer boundary, not silent corruption. **E3-7 must become falsifiable** —
  source-scan that `raising.rs` really contains `heal location not found`, so the comment's claim is
  checked against the code it describes, not merely citation-present.
- **T4 / HIGH (cheat proven to pass every planned tooth):** `let _escaped = json_escape(&row.quest_id);`
  (unused, leading-underscore so clippy is silent, placed BEFORE the `check(` gate) satisfies
  `json_escape(` present, `let _ = json_escape(` absent, the contiguous `check(...){log::warn!(` needle,
  the single-`warn` count and `continue` — while logging the RAW `quest_id`. **Fix the teeth:** pin the
  escape call's *output binding name* and require that exact identifier to be the interpolated argument
  inside `log::warn!(...)`; assert `row.quest_id` is NOT an argument of the warn.
- **T4 / MEDIUM:** one process-global `RateLimiter` is not keyed by `quest_id`, so in the burst case
  this feature exists to catch (a bad content sync introducing several broken refs at once) only the
  FIRST offender's id is ever logged; the rest collapse into an anonymous `suppressed` count. Document
  the trade-off explicitly in ADR-0173 (do not silently inherit the movement.rs single-key design).
- **T1 / MINOR (reviewer):** `extractRonChoiceCounts` has a third, unnamed defect — unlike
  `extractRonNodeIds` it does not check the char before `id: "`, so it also matches inside
  `root_node_id: "greeting"`. Name it in the ADR's root-cause section for a complete record.
- **T2 / MINOR (reviewer):** the spec's "5/14 registries" only reconciles if `type_chart` and
  `evolutions` (single-file, NOT glob-loaded — `build.rs:21-34` globs exactly 12) are counted. One ADR
  line so a future reviewer doesn't think 2 registries were silently dropped.
- **Self-confirming baselines (both T2 and T3):** derive each baseline by reading the RON, then
  cross-check against the extractor. A mismatch at authoring time is SIGNAL, not noise.
