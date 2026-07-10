# fix-nightly — COMPLETE (PR #125)

## Status
PR #125 opened 2026-07-10. Branch `fix/nightly-mutation-smoke` tip `7d6ee55`. AWAITING MERGE.

## What was done
1. `scripts/smoke-republish.sh`: `join_game '"SmokePlayer"'` (per-arg JSON; spacetime 2.6.0 CLI)
2. 37 census-killing tests in tiled_import.rs / content.rs / npc/rules.rs / world.rs + `tests/tiled_import_cli.rs`
3. `.cargo/mutants.toml`: 1 provably-equivalent exclusion (`npc/rules.rs:61:15 replace > with >= in toward_home`)
4. `justfile` `mutate-core:` wrapper: tolerates exit 3 iff missed=0, `wc -l <` count, fail-closed guard
5. `evals/mutate-core-recipe-integrity.eval.mjs`: 13 teeth + 2 positive controls
6. `docs/adr/0088-nightly-mutate-core-timeout-tolerance.md`

## Gates proven
- `just mutate-core`: 818 mutants, **0 missed**, 5 timeout (tolerated), 709 caught, 104 unviable
- `just ci` EXIT=0: 876 Rust tests, 726 client tests, 53/53 evals PASS

## Lessons from the 3 resume attempts
- NEVER end turn while background subagents run — poll synchronously within turn
- Bash comment with backtick formatting (`` `wc -l` ``) inside a JS template literal terminates the string early — use plain text in embedded bash comments
- `grep -c ''` counts ALL lines including blank; use `wc -l <` for empty-file safety
- SIGTERM source unknown (attempts 2 died mid-cargo-mutants, not bg-ceiling)

## Next
Supervisor merges PR #125. Nightly expected GREEN post-merge. Queue: 13.5d → 13.5e → 13.5f → 13.5g.
