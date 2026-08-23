# 16r-f plan — battleReseedPending sticky latch (planning checkpoint)

Branch `feat/16r-f-battle-reseed-sticky-latch` (worktree `.claude/worktrees/16r-f`, fork d4fa9fe).
Full plan produced by the planner agent 2026-08-22; this file is the resume-point summary.

## Decision (pending plan review): fix shape (b) — minimal + prev-id refinement
- `let reseedPrevBattleId: bigint | null = null` at module scope (next to battleReseedPending, main.ts:263).
- onReconnect (main.ts:2592): FIRST statement captures `reseedPrevBattleId = activeBattleId` — strictly before
  `resetPredictionState()` (which nulls activeBattleId at :781). `battleReseedPending = true` stays at :2609.
- Listener reseed branch (main.ts:1729-1735) decision table:
  - `latest === undefined` → return, latch stays set (EARS-1).
  - Ongoing && `battleId === reseedPrevBattleId` → clear latch+prev, re-baseline activeBattleId silently, return (EARS-2).
  - any other definite row → clear latch+prev, fall through to unchanged emit logic.
- Rationale: spec's minimal shape (a) leaves the latch armed forever for a battle-row-less player (common; server
  GCs battles) → their next NEW battle's battleStart is swallowed. (b) encodes "survives" literally (same id).
- Residuals documented, not solved: R1 partial my_battle hydration ≥2 rows (needs connection.ts signal — out of
  touches); R2 battle terminal during gap emits no battleEnd (unchanged from master).

## Tests (tester authors; new sibling file client/src/main.battle-reseed.test.ts; runtime import of main.ts)
Harness: `@vitest-environment happy-dom`; vi.mock client_wasm pkg + ./net/connection (capture opts: real store,
onReady, onReconnect; mock conn needs sessionState:()=>'hidden' + linkFrozen:()=>false for the F9 path);
vi.mock telemetry (+ ./render/world if noisy); stub requestAnimationFrame before import; NO #app element;
vi.resetModules() per test; ring observed via buildBugBundle spy on F9 keydown.
VACUITY TRAPS: store.reset() clears #dirty and flushBatch() no-ops when clean — every post-reconnect flush must
first dirty the store (upsertPlayer); assert vi.spyOn(store,'latestPlayerBattle') fired on empty flushes.
- T1 RED-at-fork: baseline B1 start → reset+onReconnect → empty dirty flush → B1 Ongoing flush ⇒ exactly ONE battleStart total.
- T2 GREEN: single post-reconnect flush with B1 ⇒ no second start (pins capture-before-reset ordering).
- T4/T5 GREEN: fresh-login start emit; terminal end emit pairing.
- T6 GREEN (kills shape (a)): empty flush then NEW B2 Ongoing ⇒ B2 start IS emitted.
- T7 GREEN: terminal-only observation clears latch, no end; later B2 emits.
- T8 RED-at-fork: first flush carries different Ongoing B2 ⇒ B2 start IS emitted (master baselines silently).

## Constraints (from planner blast-radius scan)
- Implementer ≠ tester; implementer never edits gating tests. main.wiring.test.ts expected ZERO diff.
- No 2nd `store.latestPlayerBattle(identity)` call site; no new `ownPerspective(` mention (ceiling 2).
- Never write `helpView?.hide` in the onReconnect→onOwnWarp region (W-HELP-NO-RECONNECT-HIDE raw scan).
- Comment-mass: 5 whole-file stripped>raw/2 guards — terse comments only.
- No new RegExp / eval / new Function (Semgrep remote-only). Coverage exclusion list untouched.
- Docs: append-only amendment to docs/adr/0130-client-observability.md (:211 M-1 bullet, :222 residual (c));
  NO new ADR (no number assigned); no CHANGELOG edit. ADR-0198 D7 "assumed" wording → supervisor follow-up flag.

## Plan review CLOSED (reviewer APPROVED-WITH-CHANGES + red-team, both applied)
- Capture guard added to the fix: `if (!battleReseedPending) reseedPrevBattleId = activeBattleId;` first
  statement of onReconnect (double-reconnect would otherwise clobber prev with null → spurious start; found
  by BOTH lenses). Reseed branch clears BOTH pending+prev on any definite observation.
- Tests added: T9 double-reconnect (GREEN at fork; RED under unguarded capture), T10 reseed-then-later-
  terminate ⇒ exactly one battleEnd (GREEN at fork; kills sticky-forever cheats that never null prev),
  T7b empty-then-terminal-same-id (GREEN). RED-at-fork set stays {T1, T8}.
- T11 (zone-switch same-flush interleave) SKIPPED deliberately: its rot-mode (folding prev-null into
  resetPredictionState) is already caught by T2, and zone-switch mid-battle is server-impossible
  (movement.rs is_in_ongoing_battle rejects move+warp). Documented in test header instead.
- Harness BLOCKER fixed structurally: module-scope window/document listeners accumulate across
  vi.resetModules() re-imports (red-team measured 3 bundle calls from 1 F9 after 3 imports). Harness must
  spy addEventListener (window+document) per test, record (type,handler), removeEventListener in afterEach;
  assert bundle spy fires EXACTLY once per F9. vi.waitFor for connect capture (17 dynamic imports precede
  connect()). Mask tMs/tSeq in event assertions (real Date.now clock).
- Follow-ups to record in PR/handoff (NOT fixed, outside touches): stale main.ts `identity` across an
  identity-minting reconnect (latch would stick forever; pre-existing); R1 partial my_battle hydration;
  ADR-0198 D7 "assumed" atomicity wording; runtime-import-of-main.ts precedent departure (sanctioned by
  spec's runtime-test mandate — noted in test header + PR body, wiring-test docblock/coverage untouched).

## Next step at resume
Tester (opus) authors client/src/main.battle-reseed.test.ts to /tmp staging → orchestrator applies + runs
RED proof (expect T1,T8 RED; others GREEN) → wip commit → implement (orchestrator-as-specialist or agent;
NOT the tester) → lenses (reviewer+/simplify+red-team+desync-guard; reducer-security-auditor N/A, no server
change) → verifier → doc-keeper (ADR-0130 append-only amendment) → full `just ci` → PR.
PATH export required: export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH" (node 24.13.1 verified).
