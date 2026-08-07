# EG2 plan memo — essence-graph reducers (branch feat/eg2-essence-graph-reducers, worktree .claude/worktrees/EG2)

Planner output reviewed by red-team + reviewer lenses (both converged); adjudicated plan below.
ADR-0175 (docs/adr/0175-essence-graph-reducers.md in the worktree) records the design decisions; this memo records the build mechanics. Spec: harness specs/monster-realm-v2/M-evolution-essence-graph.spec.md §2 EG2-1..13.

## Scope deltas (gate-forced, PR touches-delta, supervisor pre-noted for S2)
- S1: evals/evolution-reducer-security.eval.mjs — checkDualWriteMirror (~:177) + checkSSOTDelegation (~:274) run against evolve's body; the apply_evolution factoring forces a minimal edit: E1/E2 stay on evolve, E4/E5-transform move to apply_evolution's body, NEW check evolve body calls apply_evolution(, GOOD/BAD fixtures updated. Do NOT add essence_train/consume invariants (EG5-2's job).
- S2: client/src/module_bindings/** regen (bindings-drift eval; 2 new reducers). No client/src hand-edits, NO main.ts (EG4 fan-out safe).
- S3: lib.rs needs NO edit (macro auto-registration; new reducers live in raising.rs). Spec touches line was conservative — note in PR.

## Design decisions (final, post-review)
- D1: accrue_quality_time(ctx: &ReducerContext, monster_id: u64) in raising.rs, pub(crate), returns (), log-and-skip missing rows, never fabricates tier.
- D2: QT semantics = bounded-gap active-playtime. anchor=quality_time_window_start_ms. gap=now-anchor (saturating; now<anchor → re-anchor, no credit). gap<QT_MIN_WRITE_GAP_MS(5000) → NO write, anchor KEPT (sub-threshold time batches). gap>QT_IDLE_GAP_MS(120000) → re-anchor only, credit 0 (first-ever call anchor=0 lands here). Else creditable=min(gap, QT_DAILY_CAP_MS(7_200_000) − window_ms); window_ms=ms credited in current UTC day, reset when day(now)!=day(anchor), day=ms/86_400_000. accum_ms+=creditable; ticks_total saturating+= accum/QT_TICK_MS(60_000); accum%=tick. Constants server-local, playtest-tunable.
- D3: MonsterPub written ONLY when quality_time_tier changes (pub_from_monster derives all; unchanged tier ⇒ identical projection). monster-dual-write eval is textual co-presence — conditional write passes.
- D4: check_and_evolve reads DB evolution_path rows (from_species btree + marshal::evolution_path_from_row); cached_evolution_paths() is #[cfg(test)]-gated (content_cache.rs:68) and out of scope. apply_evolution takes &EvolutionPathRow = &rows[idx].
- D5 (REVISED per review, both lenses HIGH): evaluate_care maps CareError::AtMaxBond → Ok(bond-unchanged-continue); cooldown STILL gates unconditionally (reorder so AtMaxBond can't short-circuit past it, and maxed-bond monsters can't get rate-unlimited Trust). Keeps apply_care( in body → raising-reducer-security g5 green. Test: bond=255 → care still cooldown-gated, still increments trust_favorable_count.
- D6: consume_crystalized_essence is a SIXTH accrue+check_and_evolve call site (spec's "exactly 5" completeness claim is broken — EG2-4 mutates essence; one-shot-unlock intent EG3-8). Spec correction flagged to supervisor, NOT applied to spec (EG1 precedent).
- D7: essence grant = grant_essence(m,&mut, affinity, amount) helper: saturating_add().min(ESSENCE_SOFT_CAP=999); never reject at cap. consume has exactly two rejects (no essence_affinity; cooldown). grant_essence added to GROWTH_WRITERS (deliberate allowlist).
- D8 (REVISED): trust battle credit iff day(now) > trust_favorable_battle_day_epoch (`>` not `!=`: clock rewind = bounded lockout, never double-credit). day=u32::try_from(now/86_400_000).unwrap_or(u32::MAX). UTC-day-granular, deviates from "rolling-24h" prose (u32 column forces it) — ADR'd.
- D9: constants in server-module (raising.rs/battle.rs): ESSENCE_TRAIN_COOLDOWN_MS=18_000_000(5h), ESSENCE_TRAIN_AMOUNT=5, ESSENCE_SOFT_CAP=999, ESSENCE_BST_DIVISOR=30, QT_* four. Cooldown predicate = game_core::is_cooldown_ready.
- D10: chain = ITERATIVE while with explicit counter, MAX_EVOLUTION_CHAIN_STEPS=7 (R11 tier cap 5 + 2, comment links R11), distinct log::error! if cap hit mid-chain (invariant violation signal).
- D11 (REVISED per review MAJOR): no-idle-accrual GROWTH_WRITERS += accrue_quality_time, apply_evolution, essence_train, consume_crystalized_essence, check_and_evolve, grant_essence (evolve STAYS for Check B). GROWTH_FIELDS += ALL new private Monster fields NOW: 8 essence_*, trust_favorable_count, trust_unfavorable_count, trust_favorable_battle_day_epoch, quality_time_ticks_total, quality_time_accum_ms, quality_time_window_ms, quality_time_window_start_ms, last_essence_train_at_ms (names EG1-frozen; deferring = zero Check A coverage until EG5). Pub-side fields + bond removal stay EG5-3. Header refresh; indexOf-only.
- D12 (STRENGTHENED): EG1-11 scan revision: remove eligible_evolution_paths( from file-scoped bans; ADD (a) body-scoped ban in evolve's body, (b) POSITIVE requirement in check_and_evolve's body, (c) exactly-once path_satisfied( in evolve's body, (d) no .collect in evolve's body (closes loop-reimplementation escape), 9 other needles stay file-scoped, exactly-one-#[cfg(test)] kept, vacuity guards extended to apply_evolution/check_and_evolve.
- D13 (HARDENED per red-team): battle write-back: faint-penalty loop (wild-only, per fainted party member, any outcome incl. Fled/disconnect) BEFORE the SideAWins block (early returns :1087/:1104). Win credits: essence(max(1,bst/30) of LOSER species affinity) + trust-favorable(day-capped) computed INDEPENDENT of winner_lvl parse — corrupt winner level skips XP ONLY, not essence/trust/QT/dual-write (RT-WB-CURRENCY-01 discipline; restructure the continue). accrue+check_and_evolve after each monster's own update, fresh-find. is_wild_battle(b)=opponent==WILD_IDENTITY.
- D14: EG2-2 already satisfied at game-core m10a_gating_tests.rs:880 (two paths from_species=1 → vec![0,1]) — cite; server-side check_and_evolve two-eligible-no-op seam test still added.
- Recruit-success stays credit-exempt (routes via write_back_party_hp, no-XP precedent ADR-0047) — deliberate, ADR'd.
- train(): EV logic untouched; nutrition_pct recompute ALREADY free via pub_from_monster (EG1); EG2 adds only accrue+check_and_evolve tails.

## Follow-ups flagged (NOT this slice)
- ItemRow lacks essence_affinity/essence_amount columns (client can't render essence-item info; consume reads content cache) — needs a future additive migration; supervisor call.
- Essence floor max(1,bst/30): no BST<30 content exists (min 318); future content validation nicety.
- QT/trust constants playtest-tunable placeholders.

## Task order (ONE PR)
1. tester: EG1-11 scan revision + EG2-9 companion scan (red) [evolution_tests.rs]
2. tester: apply_evolution/check_and_evolve seam tests (0/1/2-eligible, chain-of-3, chain-stops-at-2, cap/degenerate-cycle, never-battle-guarded, zeroes-essence-preserves-trust-qt, fresh-tier) [evolution_tests.rs]
3. tester: accrue_quality_time (10 cases), essence_train, consume_crystalized_essence (PoT EG2-10), care/train tails [raising_tests.rs]
4. tester: battle write-back (wild win/faint/practice/pvp-exempt PoT, day-cap, corrupt-winner-level-still-grants, fled-writeback-faint) [battle_tests.rs]; enqueue_move party loop (PoT whole-party, None-skip) [movement_tests.rs — 0x22 comment convention!]
5. specialist: evolution.rs impl → raising.rs impl → battle.rs impl → movement.rs impl (red→green, fast targeted gate: cargo clippy -p server-module + cargo test -p server-module)
6. specialist: eval deltas (no-idle-accrual D11; evolution-reducer-security S1) — verify with node evals
7. bindings regen (spacetime generate) S2
8. impl review: reviewer + /simplify + red-team + reducer-security-auditor + desync-guard (parallel) → verifier
9. doc-keeper: ADR-0175 final + adr-digest; knowledge self-heals; ARCHITECTURE.md only if a sentence became false
10. full just ci once → PR → STOP (supervisor merges)

PATH export required: export PATH="$HOME/.asdf/installs/nodejs/24.13.1/bin:$HOME/.asdf/shims:$HOME/.cargo/bin:$PATH"; cd explicitly every command; client npm install once for client checks.
