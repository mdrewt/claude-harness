# Sketch: M-playtest-c — Playtest UX completion & tester onboarding

**Status:** design sketch (scheduled — playtest replan 2026-07) · **Pre-gate** · **Decision:** ADR at
build time · Resolves D-17.5-C and D-17.5-D (see `M17.5-tenth-review-residuals.spec.md` §3 +
`playtest-replan-2026-07.md` §3). Subsumes the parked `m17b-2` (`set_profile_name`).

## Problem / intent
Two fun-hypotheses are structurally untestable and the first session is unguided: **H3** is blocked
because `propose_trade` has no human entry point (M15's headline feature reachable only via the
`__mrTrade` test hook); **H2** attachment is weakened because players cannot rename (the m17b UI
references a `set_profile_name` that does not exist server-side). And a tester who joins sees a game
with zero in-client guidance and no tester-facing doc. Close the loop-completeness gaps; onboard testers.

## Scope (condensed)
- **Trade propose UI:** thin form on the existing trade overlay (target player, offer/request rows) →
  `reducers.proposeTrade`; keeps the M15 escrow semantics untouched; two-context e2e for the full
  propose→confirm happy path (coordinates with 17.5f's PvP e2e infra).
- **Profile rename:** `set_profile_name` reducer (server-side `validate_name` at the profile-write
  layer, same rules as `join_game`); RL-7 tooth amendment per D-17.5-C; rename UI in the profile/
  leaderboard overlay; 17.5d's mirror keeps the leaderboard honest.
- **In-client help overlay:** one keypress (pick a free key — KeyQ/KeyH/KeyG/KeyL/KeyU taken; audit the
  full map first) listing controls + session goals; shown once on first join (store-flagged).
- **Tester onboarding doc:** `docs/PLAYTEST.md` — how to launch locally (`just playtest-up`, M-playtest-a), controls, "your first 15
  minutes", known issues, the F9 bug-bundle ritual (M-playtest-b), feedback channel, the
  anonymous-identity caveat (progress is per-browser until M21).
- **Out of scope:** trade browse/discovery UX (post-gate if H3 passes), chat (M19), any new battle UX.

## Candidate slices (build-time slicing pass finalizes)
| slice | summary | candidate touches |
|---|---|---|
| pt-c1 | `set_profile_name` reducer + validate + tests + rename UI + RL-7 amendment | `server-module/src/ranking.rs` (+tests), `client/src/ui/leaderboard*`, evals needle |
| pt-c2 | trade propose form + e2e; help overlay + first-join hint; `docs/PLAYTEST.md` | `client/src/ui/trade*`, `client/src/ui/help*` (new), `client/src/main.ts`, `client/e2e/*`, `docs/PLAYTEST.md` |
Pairing: pt-c1 (server+leaderboard UI) ‖ M-playtest-d content OK. pt-c2 overlaps `main.ts` with pt-a1
and possibly pt-b1 → SERIAL vs those two; fine vs content.

## Risks / decisions
Key-map collision audit before picking the help key (record in the slice ADR). Rename abuse: reuse the
join_game validation + consider a rename cooldown (in-milestone decision; default = validation only for
a closed test). `PLAYTEST.md` launch section lands after M-playtest-a's `just playtest-up` exists.
