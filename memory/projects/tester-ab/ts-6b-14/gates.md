# Gates: ts-6b-14

Spec: M-trade-sessions.spec.md#ts-6b-14
Seed: d692b34e94aee0cb
Seeded: 2026-11-14T07:10:34Z
Repo: project
Scope: Build ts-6b-14 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-14 — comment, doc and test-infrastructure accuracy; closes the sweep" (last batch of the ts-6b residual sweep; runs alone — edits comment text in structural server-module/src/schema.rs, no table/column/reducer signature change). Closes R-ts-4-STALECOMMENTS, R-21r-e-E2, R-bt-11-DOCROT, R-ctl-11b-STALENARRATION, R-ctl-7a-CTL7A.4, R-pgcc-c-RESEEDDOCBLOCK, R-qf-6-QF6.1, R-ctl-10a-DOCS, R-ci-fix-20261002T0501Z-E2EARTIFACTS, R-ci-fix-20261101T0505-CTXSTACK-FLOOR. ts-6b-14.11: every ts-6a triage-table residual must be closed (fixed w/ PR or wontfix w/ reason) at merge.
Criteria: 11 seeded, 0 shall-uncaptured
Touches: server-module/src/guards.rs, server-module/src/movement.rs, server-module/src/schema.rs, server-module/src/monster_mgmt_tests.rs, game-core/src/trading/rules.rs, client/e2e/wallet-balance.spec.ts, client/index.html, client/src/ui/screens/worldScreen.test.ts, client/src/ui/screens/requestHost.test.ts, .claude/skills/spacetimedb-client/SKILL.md, ops/observability/rules/recording.rules.yml, ARCHITECTURE.md, game-core/src/tactics/golden.rs, game-core/src/tactics/golden_tests.rs, client/src/ui/overlayA11y.ts, client/src/ui/overlayA11y.test.ts, client/src/main.accel.test.ts, client/src/main.input.test.ts, client/src/main.a11yFocus.test.ts, client/src/ui/evolutionNotice.ts, client/src/ui/evolutionNotice.test.ts, client/src/ui/menuView.ts, client/src/main.battle-reseed.test.ts, client/src/ui/dialogueModel.ts, client/src/ui/screens/healScreen.ts, client/src/net/rowConvert.ts, client/src/ui/contextStack.test.ts, game-core/src/npc/mod.rs, .github/workflows/ci.yml, client/playwright.config.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-14.1: WHEN a comment, skill file or recording rule names a trade reducer, IT SHALL name a live trade-session reducer or the drain-only offer path — closes `R-ts-4-STALECOMMENTS` (`mr-comment-scan` is CLEAN on the diff; the observability rules check the repository runs on `recording.rules.yml` passes; the server, game-core and client suites pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-comment-scan --repo . 2>&1 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH node ops/observability/validate.mjs --require-docker 2>&1
      EXPECT: /COMMENT-SCAN CLEAN[\s\S]*^validate PASS: promtool check rules$/
      EVIDENCE: pending

- [ ] ts-6b-14.2: THE comments on the `Npc` table and the NPC wander step SHALL describe an NPC's zone as fixed at its home zone — closes `R-21r-e-E2` (comment-only; `mr-comment-scan` CLEAN and the server `movement_tests` suite passes).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-comment-scan --repo . 2>&1 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module -E 'test(/^movement::movement_tests::/)' 2>&1
      EXPECT: /COMMENT-SCAN CLEAN[\s\S]* \d+ tests run: \d+ passed, \d+ skipped/
      EVIDENCE: pending

- [ ] ts-6b-14.3: THE client-wasm section of `ARCHITECTURE.md` SHALL name the export families client-wasm ships, and the golden harness docs SHALL describe the harness as it is — closes `R-bt-11-DOCROT` (doc-only; `mr-comment-scan` CLEAN and the game-core `golden_tests` suite passes).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/mr-comment-scan --repo . 2>&1 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH cargo nextest run -p game-core -E 'test(/^tactics::golden_tests::/)' 2>&1
      EXPECT: /COMMENT-SCAN CLEAN[\s\S]* \d+ tests run: \d+ passed, \d+ skipped/
      EVIDENCE: pending

- [ ] ts-6b-14.4: THE focus-rule comments and the assertion message in the overlay a11y files SHALL state the current rule and name no deleted function — closes `R-ctl-11b-STALENARRATION` (comment-only; `client/src/ui/overlayA11y.test.ts` and `client/src/main.a11yFocus.test.ts` pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npx --prefix client vitest run --root client src/ui/overlayA11y.test.ts src/main.a11yFocus.test.ts src/main.accel.test.ts src/main.input.test.ts 2>&1
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-14.5: THE comments in the evolution notice and menu view files SHALL name only elements that exist — closes `R-ctl-7a-CTL7A.4` (comment-only; `client/src/ui/evolutionNotice.test.ts` passes).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npx --prefix client vitest run --root client src/ui/evolutionNotice.test.ts 2>&1
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-14.6: THE comments in the battle reseed test SHALL describe the latch code that exists and cite symbols, not line numbers — closes `R-pgcc-c-RESEEDDOCBLOCK` (comment-only; `client/src/main.battle-reseed.test.ts` passes).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npx --prefix client vitest run --root client src/main.battle-reseed.test.ts 2>&1
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-14.7: THE wallet-balance e2e comments SHALL describe a refused advance as dismissing the overlay — closes `R-qf-6-QF6.1` (comment-only; `client/e2e/wallet-balance.spec.ts` passes).
      CHECK: MR_E2E_PORT=5314 VITE_STDB_DB=mr-ts6b14 NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npm --prefix client run e2e -- e2e/wallet-balance.spec.ts --project=default --reporter=line 2>&1
      EXPECT: /^\s*6 passed \(/
      EVIDENCE: pending

- [ ] ts-6b-14.8: THE interact comments in the client and in game-core `npc` SHALL describe the face-and-Y interact flow and name no removed key or function — closes `R-ctl-10a-DOCS` (comment-only; `cargo nextest run -p game-core` and the client vitest suite pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH cargo nextest run -p game-core 2>&1 && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npx --prefix client vitest run --root client 2>&1
      EXPECT: / \d+ tests run: \d+ passed, \d+ skipped[\s\S]*Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-14.9: WHEN an e2e shard fails, THE CI job SHALL keep the Playwright traces and the SpacetimeDB log as a run artifact — closes `R-ci-fix-20261002T0501Z-E2EARTIFACTS` (CI config; the PR links a deliberately failed shard run on the branch that carries the artifact).
      MANUAL: the criterion's own proof is a real failed CI shard, which no local runner can produce; the cited line is the recorded run (URL, job, artifact name and its listing) of the deliberately failed e2e shard on this branch.
      EVIDENCE: pending

- [ ] ts-6b-14.10: THE reconcile property test SHALL run from a fixed seed, so its generated sample and its non-vacuity floors are the same on every run — closes `R-ci-fix-20261101T0505-CTXSTACK-FLOOR` (test infrastructure: the seed is passed in the `fc.assert` options of `reconcile over generated stacks of stamped, unstamped and foreign-battle frames follows the independent oracle and is idempotent` in `client/src/ui/contextStack.test.ts`, and the suite passes).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npx --prefix client vitest run --root client src/ui/contextStack.test.ts 2>&1
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-14.11: WHEN this batch merges, NO residual in the ts-6a triage table SHALL still be open in `mr-gates residuals list --json` (each closed as fixed with a PR or as wontfix with a reason), and `just ci` and `just e2e` SHALL be green on `master`; that merge closes the milestone.
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH just ci 2>&1
      EXPECT: /^validate\.mjs: \d+ check\(s\), 0 failed, 0 skipped$/
      EVIDENCE: pending
