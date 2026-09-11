# rb-74 — plan (residual R-18r-b-LIBRSCITES)

Branch `feat/rb-74-librs-citations`, worktree `.claude/worktrees/rb-74`, base `origin/master@c0d102e`.

## Measurement (ground truth, all verified in-tree)
`server-module/src/lib.rs` = 349 lines. M8.9 / ADR-0056 split the monolith into domain
submodules, so every four-digit `lib.rs:NNNN` citation dangles. Live homes: `pub fn
start_wild_battle(` battle.rs:543 · `pub fn grant_bait(` taming.rs:282 · `pub fn movement_tick(`
movement.rs:291 · `pub(crate) fn grant_item(` inventory.rs:31 · `pub struct Config {` schema.rs:58
(`pub content_version: u32,` :61) · `pub struct Inventory {` schema.rs:473 · `pub struct
EncounterEntryRow {` schema.rs:183 · `pub(crate) fn resolve_all_live_interactions(` lib.rs:258 ·
`pub(crate) fn erase_character_rows(` lib.rs:271. All 11 anchors are EXACTLY-ONCE in their file.

| site | citation | verdict |
|---|---|---|
| adr/0230:176,180 | declaration-shaped | ALREADY FIXED by rb-68; already pinned by accounts_tests.rs:9768/:10684/:16863 — no edit, no new tooth |
| adr/0221:94 | `lib.rs:214-231` | STALE (was on_disconnect's body at 5962b7a) |
| adr/0054:31,37,86,92,131,147,160,238 | 1484/2064/939/1492-1502/940/1868/67/273-274 | all STALE; `:67` and (in m8.7d) `:152` are STALE-BUT-IN-RANGE, so a bounds-only check misses them |
| m8.7b-plan:7,11,54 | 1483+2063 / 1492-1502 / 273-274 | STALE |
| m8.7d-plan:19,30 | 275-276 / 152 | STALE |
| specs/nh2-plan:73, adr/0148:188 | `sim-harness/src/lib.rs:222-226` | ACCURATE — assertion is at 223-225, inside the range. Confirm, do not edit |

Every historical number was TRUE at its own declared base commit (`6187102` for m8.7b/ADR-0054,
`d0c265e` for m8.7d, `5962b7a` for ADR-0221) — verified with `git show <base>:server-module/src/lib.rs`.

## Fix — in-place dated retarget (NOT an appended note; see ledger D-E)
Each of the 15 in-roster citation tokens keeps its historical number, now attributed to the base
at which it was true, and gains a declaration-shaped live anchor in the same parenthetical.
Doctrine: ARCHITECTURE.md:2226; shipped form: rb-68 at adr/0230:176.

## Oracle — `server-module/src/rb74_citation_tests.rs` (tester-owned)
Wired from lib.rs with `#[cfg(test)] #[path]` beside lib.rs:47-57. Docs via `include_str!("../../docs/…")`.
Legs after the simplify cut: RESOLUTION (anchor exactly-once in an allow-listed file derived from
lib.rs's own `mod` list) · CENSUS (exact prefix-free per-doc counts; foreign-`lib.rs` bucket counted
exact) · ADJACENCY (anchor within a fixed byte window after its citation token — replaces the
markdown-paragraph parser) · RANGE (MOVE_QUEUE_CAP containment, fragments derived from the doc's own
ellipsis-split quote) · ROSTER-FREEZE. CUT: a duplicate ADR-0230 leg; per-doc byte floors.

## Parked (residuals, registered after the lenses)
R-rb-74-LIBRSCITES-REST (~19 stale cites outside touches, incl. ARCHITECTURE.md:2232) ·
R-rb-74-ADR0245CITES (adr/0245:40,53,69 already stale) · R-rb-74-ACCTESTSCITE
(accounts_tests.rs:20277 cites `lib.rs:259-263` for erase_character_rows, live at :271).
