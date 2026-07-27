# feel-polish — slice progress memo

**Updated:** 2026-07-27 · **Branch:** `feat/feel-polish` (pushed) ·
**Worktree:** `projects/monster-realm/.claude/worktrees/feel-polish` · **ADR:** 0159

## DONE

Both shipped items are implemented, green, reviewed, and checkpointed (10 `wip:` commits, all pushed).

- **087 care-button feedback (D1).** Confirmed NOT a server bug first: `care`
  (`server-module/src/raising.rs:69-108`) succeeds and dual-writes. Two client causes — `onCare` used
  `sendGuarded` (only a `.catch`, no success branch at all), and `CARE_COOLDOWN_MS` is **6 hours** so
  most playtest clicks are legitimate rejections whose message went to `statusEl`, an unstyled div
  the `z-index:100; inset:0` overlay paints over. Shipped: new coverage-measured
  `client/src/ui/careAction.ts` (`performCare`), in-overlay `#raising-feedback` node + `showFeedback`
  (textContent only) + `#pending` re-entrancy guard in `raisingView.ts`, `main.ts` rewired through
  `performCare` with the feedback dep gated on `raisingView?.visible`.
- **089 jerky NPC movement (D2).** "NPCs lack interpolation" hypothesis REFUTED. Real cause:
  `npc_decide` chose among all 4 directions ignoring walls/radius; `elder_oak`'s home (5,5) has a wall
  directly south, so 14.3% of ticks were wall-bumps. Shipped: `npc_decide` gains `facing` + `map`,
  picks only legal directions, continues facing unless `(h >> 33) % NPC_CONTINUE_REROLL != 0` (K=6).
  Measured: bumps 14.3%→0%, immediate reversals 32.3%→24.1%, mean run 1.14→2.48, all 8 legal tiles
  reached.

**Gates green locally:** 1572 client tests · 989+374 Rust · 71 evals · lint · security · knowledge +
adr-digest drift checks in sync. `rules.rs:61` mutants line-pin verified intact.

**Lens verdicts:** reviewer(plan) 2 MAJOR fixed · red-team(plan) BLOCKER fixed · red-team(tests)
2 BLOCKER + 1 MAJOR fixed · desync-guard HIGH fixed · reducer-security PASS · /simplify no blockers.

## REMAINING

**Nothing — the slice reached its terminal state.**

**PR #260 is OPEN and MERGEABLE:** https://github.com/mdrewt/monster-realm/pull/260
Local `just ci` **exit 0**; remote ci+e2e were pending at hand-off. `gh pr merge` NOT run — the
supervisor owns the merge.

All lenses closed (10 agent invocations incl. tester/red-team/desync-guard/reducer-security-auditor/
reviewer/verifier/doc-keeper). Verifier **PASS** on both gates and on test integrity. Nightly-only
gates run anyway: `just mutate-core` missed=0 across 1095 mutants; `just coverage` 97.8% vs 96 floor.

Late finds that were fixed after the first green: a synchronous throw from `callCare` showed the
player nothing (it sat outside the `try`, and the SDK serializes args synchronously), and the
view-wide `#pending` flag made a second monster's Care button a silent no-op.

## BLOCKERS

None. Two spec items are deliberately PARKED, not blocked:

- **088 walk speed — HIDDEN DEPENDENCY, needs its own slice + supervisor re-serialization.** The only
  lever is `STEP_MS = 200` at `game-core/src/world.rs:13`, which is *also the server tick interval*
  (`server-module/src/lib.rs:132-134`) — outside this slice's declared `touches:`. Blast radius: 6
  client test files hardcode a literal `200`, `world.rs:1035`'s `assert_eq!`, 3 e2e specs, and
  `evals/hold-commit-step-budget` gating `HOLD_COMMIT_MS + 33.33 + 1 < STEP_MS` (ADR-0158 swept
  `HOLD_COMMIT_MS=150` with only ~22.9 ms slack). Raising STEP_MS is the safe direction. Land it
  AFTER ADR-0159 and re-check `NPC_CONTINUE_REROLL` — `K × STEP_MS` is the real NPC feel quantity.
- **090 walk animation — code-only, but needs a net-new seam.** Assets ARE ready
  (`client/public/assets/hero.png`/`hero.json`, 20 frames, `walk_*` per direction). The renderer
  consumes none of it — the only wired `AssetProvider` is procedural `placeholderAssets.ts`. Needs
  async `Assets.load` in `WorldRenderer.init`, a frames-per-AnimKey provider, an injected-clock
  `walkFrameIndex` pure core, and a `PlaceholderAssets` fallback so a 404 can't black-screen the
  game. **ADR-0144 §D7 already deferred exactly this.** Do NOT animate the placeholders.

## NOTES FOR THE SUPERVISOR

- `specs/monster-realm-v2/M-postgate-feel-polish.spec.md` has a new §5 DELIVERED/PARKED block, left
  **uncommitted** in the harness repo — that repo already had 8 dirty files from prior supervisor
  work, so I did not commit there.
- `docs/adr/0068-*.md` got a one-line `**Amended-by:** ... , ADR-0159` update (ADR-0104 convention).
- Code-knowledge graph: `detect_changes` on the main checkout shows 0 changes (it is still on
  master). A re-index is worth running **after** this PR merges.
- **Operational gotcha that cost time this run:** the Bash cwd silently drifted from the worktree to
  the main checkout (`projects/monster-realm`, on `master`), and a batch of "verification" ran against
  master — tests passed and diffs were empty, which briefly looked like the tester's work had been
  lost. Always `cd` to the worktree explicitly in every command. The main checkout was never mutated.
- Project commands need `bash -lc '...'` — the default shell has Node 18, the project needs 24.13.1
  (asdf provides it via the login shell).
