# 0016. Monster individuality & progression model (IV / EV / nature)
- Status: accepted
- Date: 2026-06-24 (rev 2 — richer model chosen at the Phase A checkpoint)
- Surfaced by: M6 design; deepened by user direction at the Phase A checkpoint.

## Context and problem statement
"Every monster is a unique individual" is the emotional core. The model must make two players' same-species
monsters genuinely different, keep the individuality **hidden** (ADR-0015) and **server-authoritative** (no
spoofing/spoiling), stay deterministic (seeded rolls) and data-driven (species as content), and reward
long-term raising. At the Phase A checkpoint the user chose a **richer** model than v1's simpler genes-and-
temperament; this records that decision.

## Considered alternatives
- **IV / EV / nature model (chosen).** Per-stat **IVs** (hidden innate genes, rolled in a fixed range);
  per-stat **EVs** (effort values gained by raising, with a per-stat cap *and* a total cap — the long-term
  investment lever, M9); a **Nature** (raises one stat, lowers another); plus species base stats, level
  scaling, and a **`bond`** axis (a v2 addition beyond the Pokémon model). Stats are derived by a single
  **integer** formula `derive_stats(base, IVs, EVs, nature, level)`. Deep, familiar, deterministic, hidden.
- **v1's simpler model** (a single `Potential` gene block + a `Temperament` stat-pair nudge + `training`).
  Lower complexity, but less depth/replayability and less raising payoff. **Superseded** by this rev.
- **Visible fixed per-species stats (no individuality).** Throws away the core. Rejected.
- **Client-visible IVs/EVs.** Cheatable and spoils discovery. Rejected (also violates ADR-0015).

## Decision outcome
- Chosen: **per-stat IVs (hidden, rolled) + per-stat EVs (trained, dual-capped) + a Nature (+stat/−stat) +
  bond + level**, all feeding one **integer** `derive_stats` formula; derive-on-write, stored, read-only to
  the client.
- Consequences: `derive_stats` is the single source of truth (re-run on level-up, EV training M9, evolution
  M10). Rolls (IVs + nature) are seeded/deterministic. EV training (M9) grants per-stat EVs respecting the
  per-stat and total caps. The integer formula keeps stats float-free (determinism). Content carries species
  base stats + nature/EV-yield data. Hidden state stays owner-private (ADR-0015). M6 and M9 reflect this
  model; the formula weights/caps are tunable data.
- **Canonical naming (corpus-wide):** the domain types are **`IVs`** (per-stat hidden genes), **`EVs`**
  (trained, dual-capped), and **`Nature`** (the +stat/−stat personality). Any field carrying rolled
  individuality uses these names (e.g. the wild's individuality stashed on the `battle` row is
  `wild_ivs`/`wild_nature`) — superseding v1's `Potential`/`Temperament`/`Training` names so the corpus is
  consistent.
