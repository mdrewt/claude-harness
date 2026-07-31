# uxd2 progress memo (updated 2026-07-31, post-implementation, WARN flag active)

**Slice:** uxd2 — Shop-via-NPC context-sensitive interact (M-postgate-ux-design §uxd2, ADR-0161)
**Branch:** `feat/uxd2-shop-npc-interact` · **Worktree:** `.claude/worktrees/uxd2` · **Pushed through:** 3a67735
**Budget state:** `/tmp/mr_warn_uxd2` appeared after implementation → landing pattern (min roster, serial).

## DONE
- Plan of record `docs/specs/uxd2-plan.md` + ADR-0161 (Accepted, digest green) — commit 2639f59.
- Red gating tests (18 Rust + ~95 TS + e2e shop-npc.spec.ts), reviewed by reviewer+red-team; 3 findings
  fixed by tester (counter recalibration 19→18/20→19, SHOPBTN dead-code hardening, FRAME anchor) — e59a011, 25189c8.
- Implementation red→green (77d2e24): NpcInteraction enum (types.rs) + NpcDef serde-default field +
  validate_npc_interactions + npc column + npc_row_stale diff + CONTENT_VERSION 17 + RON seeds
  (tideglass_shopkeeper zone1 (8,1) wander0 Shop(1); inert greeting "Hello, customer!") + bindings regen +
  3 baselines + rowConvert/store/interactModel/dialogueModel(shopAction)/shopModel(ForShop)/
  healModel(ForLocation)/helpModel(G,H removed)/dialogueView(Shop btn)/dialogueContent mirror +
  world.screenFor + main.ts (KeyG/KeyH deleted; KeyT switch; UXD2-SHOPBTN/-SHOPOPEN sentinel regions;
  pendingShopId lifecycle; #interact-prompt frame-loop). onHealParty + buy/heal_party byte-identical
  (verified `git diff origin/master -- economy.rs raising.rs` empty).
- HANDLED_ENUM_VARIANTS entry + tester-recalibrated 9-key pin + knowledge regen — 3a67735.
- Local gates: game-core 1078 pass · module 379 pass · client 1680/1680 · typecheck clean ·
  74/74 evals · knowledge in sync · fmt/clippy/biome clean.

## REMAINING (in order)
1. Reviewer (impl diff, domain-auditor checklist folded in) → fix findings.
2. Verifier (gates + RED→green integrity: no weakened tests; reducer byte-identity; mutation on changed
   Rust lines via `just mutate-core` if time).
3. doc-keeper: ARCHITECTURE.md targeted addition, spec §uxd2 reconciliation/DELIVERED note (harness repo),
   memory cards, graph refresh (`detect_changes`+`index_repository` on MAIN checkout path).
4. Full `just ci` once (worktree, PATH export mandatory: /home/mdrewt/.asdf/shims + ~/.cargo/bin).
5. `just e2e` — MUST use isolated DB (ux4 precedent): `VITE_STDB_DB=monster-realm-uxd2-e2e MR_E2E_PORT=5297 just e2e`,
   then delete the ephemeral DB. NEVER default DB (wipes Drew's playtest state).
6. `just smoke-republish` (needs live spacetime at STDB_SERVER).
7. PR on mdrewt/monster-realm. Body MUST include: touches-delta (rowConvert.ts+test, connection.ts (1-line
   SdkNpcRow mirror), dialogueContent.ts, dialogueView.ts, helpModel.ts+test, main.wiring.test.ts,
   world.ts (screenFor), evals/baselines/{spacetime-types,table-schemas,content-hash}.json,
   dialogueModel.talk.test.ts DELETED, docs/knowledge regen churn), boyscout-delta (main.ts:2089 stale
   KeyG comment reword — 1 line), `Items: r2-2026-07-26-022,-023,-024,-025,-026,-032` (verify ledger ids
   before writing). NO `gh pr merge` — supervisor-owned.

## BLOCKERS
None. WARN flag only (landing pattern). If STOP appears: commit+push WIP, update handoff, exit.

## KEY FACTS FOR RESUME
- PATH: `export PATH="/home/mdrewt/.asdf/shims:/home/mdrewt/.cargo/bin:$PATH"`; cd explicitly EVERY command
  (cwd resets between turns → main-checkout bogus greens).
- Deviations already adjudicated: greet-then-shop reconciliation, KeyG/KeyH removal supersedes spec AC line 94,
  heal SEND unbound (view-only binding; ADR-0161 residual), trade.spec.ts KeyG/H blocks vacuous (follow-up),
  HANDLED_ENUM_VARIANTS order is DECLARATION order ['Dialogue','Shop','Heal'].
- Tester agent id a2e719b148458ed00 (TS) / a5e3e92a687e7b3f4 (Rust) own the gating tests — any test change
  routes through them.
- Do NOT touch: dialogue.spec.ts, trade.spec.ts, economy.rs, raising.rs, evals/*.eval.mjs, evals/run.mjs.
