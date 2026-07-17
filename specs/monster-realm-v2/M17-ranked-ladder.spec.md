# M17 — Ranked ladder (persistent Elo)

**Status:** design sketch → **elaborated at build time** (m17a, 2026-07-16) · **Phase C** · **Decision:** ADR-0026 + ADR-0119 · **Mirrors:** v1 M11.3.

> Provisional sketch promoted to build-ready spec. The granular EARS criteria + slice breakdown
> were drafted during m17a per `PLAN.md §9` (same convention as the M14/M15 slicing passes).

## Problem / intent
Make PvP matter over time with a **persistent** ranked rating + a leaderboard. The key point is
**persistence**: the rating must survive disconnects, so it lives on a `profile` keyed by identity that —
unlike the ephemeral `player` presence row — is **never deleted**.

## Scope (condensed)
- **`profile`** table (world-readable for the leaderboard): identity-keyed `name`/`rating: i32`/`wins`/
  `losses`, never deleted. `get_or_init_profile` makes the rating path total.
- **`game-core` `apply_elo`** — a pure, **integer linear approximation** of Elo (floats break determinism):
  zero-sum, an upset swings more, a win is always ≥ 1, everyone starts at 1000. Isolated so the system is
  swappable.
- Ranked outcomes call `apply_pvp_rating` **exactly once** per decisive result (structurally guarded;
  friendly battles don't count).
- **Ranked-integrity closure of the PvE reducer paths** (build-time discovery, ADR-0119): `submit_attack`,
  `swap_active`, `flee`, and `use_battle_item` in `battle.rs` carry owner-only guards but **no PvP
  exclusion** — side A could drive a PvP battle to a decisive outcome with the server AI playing the human
  opponent's side, or `flee` to dodge a rating loss. Exactly-once is unsatisfiable without excluding PvP
  battles from these paths, so the guards ship **in m17a** (`attempt_recruit` is already structurally safe:
  it requires the wild-only `battle_wild` row).
- **Out of scope:** seasons/decay/rating-based matchmaking (additive later); an unranked/friendly PvP
  challenge flag (additive later — today "friendly" = practice self-battles, which never rate).

## Key design + boundary (ADR-0119)
- Presence (ephemeral `player`) vs progression (persistent `profile`) are separate tables — the whole point.
  **→ M18/M19** may surface leaderboards/guild rankings from the world-readable `profile`.
- **Battle-kind taxonomy is structural, no new flag (YAGNI):** wild = `opponent_identity == WILD_IDENTITY`;
  practice/friendly = `player_identity == opponent_identity` (self-battle, M12.5e2); **ranked PvP** =
  distinct players, non-wild. `is_ranked_pvp(&Battle)` is the single classifying predicate.
- **Once-only is a structural funnel, not a flag:** the two terminal-commit sites in `pvp.rs`
  (`resolve_pvp_turn_if_ready` terminal branch; `apply_pvp_forfeit`) share identical commit ordering
  (RT-M16-08/-05) and are unified into ONE settle function — the only caller of `apply_pvp_rating`.
- **Module-write-only:** `apply_pvp_rating` / `get_or_init_profile` are `pub(crate)` functions, NOT
  reducers. No client-callable reducer writes `profile` in m17a (name edit / profile creation-on-join are
  m17b concerns at most).
- **No CONTENT_VERSION bump:** `profile` is a runtime table (not seeded content) — mirrors `trade_offer`
  (ADR-0106 D7).

## EARS acceptance criteria

### m17a — spine (server + rules)
- **RL-1** — WHEN `apply_pvp_rating` runs for a winner/loser identity with no `profile` row THE SYSTEM
  SHALL create the row via `get_or_init_profile` (rating = 1000, wins = losses = 0, name seeded from the
  `player` row if present, else empty) — the rating path is total.
- **RL-2** — The `profile` table SHALL be public (world-readable), identity-keyed (PK = identity), and
  never deleted: no code path deletes `profile` rows (structural proof-of-teeth; `on_disconnect` does not
  touch it).
- **RL-3** — `apply_elo(winner_rating, loser_rating)` SHALL be pure integer math (no floats, no RNG, no
  clock): zero-sum (winner gains exactly what loser loses), delta ≥ 1 always, equal ratings → K/2, an
  upset (winner rated below loser) swings strictly more than the mirror non-upset, delta bounded ≤ K−1.
- **RL-4** — Everyone starts at 1000 (`INITIAL_RATING` const in `game-core`, the SSOT used by
  `get_or_init_profile`).
- **RL-5** — WHEN a ranked PvP battle reaches a decisive outcome (`SideAWins`/`SideBWins`) via ANY path
  (both-submit resolution, deadline-reaper forfeit, disconnect forfeit) THE SYSTEM SHALL apply the rating
  exactly once: winner rating += Δ, wins += 1; loser rating −= Δ, losses += 1.
- **RL-6** — Friendly battles SHALL never rate: practice self-battles (`player == opponent`) and wild
  battles (`opponent == WILD_IDENTITY`) produce no profile change even when routed through the forfeit
  paths (disconnect mid-practice-battle → no rating change).
- **RL-7** — Module-write-only: no client-callable reducer writes `profile` (structural proof-of-teeth:
  `ranking.rs` declares no `#[spacetimedb::reducer]`; no reducer body writes the table).
- **RL-8** — `Fled` SHALL apply no rating change, AND the server SHALL reject `flee` on a PvP battle
  (reject-not-clamp) so a rating loss cannot be dodged (client `canFlee=false` is not authoritative).
- **RL-9** — `submit_attack`, `swap_active`, and `use_battle_item` SHALL reject PvP battles (distinct-
  player battles) — closes the AI-plays-side-B hole; every decisive PvP outcome flows through the
  `pvp.rs` funnel.
- **RL-10** — Exactly ONE function commits terminal PvP outcomes, and it is the ONLY caller of
  `apply_pvp_rating` (call-site-count proof-of-teeth, RT-SEC-02 style).
- **RL-11** — Rating conservation: the sum of the two ratings is invariant across any rating
  application on the practical domain (|rating| ≤ ~10^6), proven on the pure
  `compute_rating_update` (zero-sum at the application layer, not just in `apply_elo`); the
  saturating behavior at the unreachable i32 extremes is pinned by a boundary spot test and
  documented as tolerated (ADR-0119 D2).
- **RL-12** — Determinism: `apply_elo` yields identical output for identical input across repeated calls
  (property test; no ambient entropy — ADR-0055 gates still apply to the new module).

### m17b — client leaderboard UI (deferred slice)
- **RL-13** — Leaderboard overlay subscribes to `profile`, sorts by rating desc (stable tie-break: name,
  then identity), shows rating/W/L; own row highlighted. Mutual-exclusion with other overlays per the
  KeyB/KeyI/KeyE guard pattern (M15b).
- **RL-14** — Post-battle rating delta surfaced in the PvP end-of-battle UI (reads own profile row change).
- **RL-15** — No client write path to `profile` (UI is pure subscription view — ADR-0014 discipline).

### m17c — evals tail (deferred slice)
- **RL-16** — `ranking-security` eval: module-write-only (RL-7) + once-only call-site count (RL-10) +
  never-deleted scan (RL-2) enforced as evals with proof-of-teeth fixtures that bite.
- **RL-17** — PvE-path PvP-exclusion eval: the four battle.rs guards (RL-8/9) are pinned by an
  extension of `battle-reducer-security.eval.mjs` **in m17a itself** (review finding B-1: deferring
  the teeth would leave a window where a battle.rs refactor silently drops a security control);
  m17c re-verifies and may harden the needles.
- **RL-18** — e2e: two-context ranked flow (challenge → accept → forfeit) asserts both profiles moved
  zero-sum (mirrors the M16.5d two-context trade e2e harness).

## §5 Slice decomposition (m17a / m17b / m17c)

| Slice | Touches | Notes |
|-------|---------|-------|
| **m17a (spine)** | `game-core/src/ranking.rs` (new single-file pure module, inline tests — currency.rs precedent, plan-review N-1), `game-core/src/lib.rs` (re-export), `server-module/src/schema.rs` (`profile` table), `server-module/src/ranking.rs` (NEW domain module — extends the M8.9 `touches:` vocabulary: `get_or_init_profile`, `apply_pvp_rating`), `server-module/src/ranking_tests.rs`, `server-module/src/guards.rs` (`is_ranked_pvp` — guard-family home, plan-review M-4) + `guards_tests.rs`, `server-module/src/pvp.rs` (+`pvp_tests.rs`) settle-funnel unification, `server-module/src/battle.rs` (+`battle_tests.rs`) PvE-path PvP guards (RL-8/9), `evals/battle-reducer-security.eval.mjs` (PvP-reject criterion, RL-17 in-slice), `client/src/module_bindings/**` (generated), table-schemas baseline + `docs/knowledge/**` (generated), `docs/adr/0119-*.md` | Schema + shared battle-path guards = structural → **SERIAL** (no sibling). ADR-0119. |
| **m17b (client UI)** | `client/src/ui/leaderboard*.ts`, `client/src/main.ts`, `client/src/net/store.ts`, sibling `*.test.ts` | Depends on m17a bindings. Parallelizable with m17c after m17a merges. |
| **m17c (evals tail)** | `evals/ranking-*.eval.mjs`, `client/e2e/**` (ranked two-context spec) | Depends on m17a. **Fan-out pair: m17b ‖ m17c** (disjoint `client/src` vs `evals`+`e2e`). |

**Dependency order:** m17a → (m17b ‖ m17c). m17a is fan-out-ineligible (schema change + ADR + new module
vocabulary). m17b/m17c may run concurrently per `docs/routing.md` N≤2 after m17a merges.

**Post-integration verification (after m17b + m17c merge):** full `just ci` green-and-meaningful ·
bindings-drift = 0 · schema-snapshot includes `profile` (append-only direction, M16.5e) · e2e ranked flow
(RL-18) green against the integrated whole · cross-slice contracts held: `Profile` generated binding shape
(m17a → m17b), `profile` public visibility (m17a → m17b subscription), the four battle.rs guard strings
(m17a → m17c source-scan evals), `apply_pvp_rating` single call site (m17a → m17c call-site count).

## Risks / decisions
- Rating lost on disconnect → persistent never-deleted profile (RL-2).
- Double-count → once-only structural funnel + proof-of-teeth (RL-5/10).
- Client writing its own rating → module-write-only, no reducer surface (RL-7).
- **Rating-loss dodge via PvE paths** (build-time discovery) → RL-8/9 server-side rejects; client-only
  `canFlee=false` was never authoritative.
- Integer-division asymmetry around negative diffs → `div_euclid` (or equivalent) + property tests pin
  exact behavior; zero-sum proven at both the rule layer (RL-3) and persistence layer (RL-11).
- Mutual KO has no `Draw` outcome (combat engine yields a deterministic winner) — Elo consumes the recorded
  outcome as-is; no draw handling (documented in ADR-0119).
