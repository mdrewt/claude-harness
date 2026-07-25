# Spec: M-postgate-ux-hardening — discoverability, own-balance visibility, playtest-up preflight

**Status:** scheduled (spawned by `playtest-gate-decision-2026-07-25.md` §7-8) · **Post-gate, un-blocked** (was `blocked:playtest-gate`; the gate has now run) · **Owner:** Drew · **Decision:** ADR at build time
**Stack:** spacetimedb-game · **Project:** monster-realm · **Depends on:** M-playtest-a/b/c/c.5/d CLOSED; playtest gate run 2026-07-25.
**Companion:** `M-postgate-netcode-hardening.spec.md` (input/movement bugs from the same playtest report — split by touch-set: that spec is `main.ts`/predictor-internals SERIAL work, this one is mostly-disjoint UI/tooling).

## 1. Problem / intent

Drew's closed playtest (`memory/projects/PlaytestReport.md`, analyzed in `playtest-gate-decision-2026-07-25.md`) surfaced UI/UX friction as the dominant complaint. Grounding each specific complaint against live code (2026-07-25, `master` @ `bbc7a28`) found that most are **discoverability gaps around features that already exist**, not missing features — the fix is a small, targeted affordance, not a rebuild. One (`playtest-up`) is a genuine tooling gap. One (battle swap) needs a repro-and-confirm step before deciding whether any code changes at all. This milestone deliberately does NOT include the larger design questions Drew's report also raised (responsive viewport scaling, shop-via-NPC-interaction, full main-menu redesign) — those are real but bigger, and are recorded as separately-owned, deferred work in the gate decision doc §8 rather than bundled here.

## 2. Slices, acceptance criteria (EARS) + located evidence (@ `bbc7a28`, verified 2026-07-25)

### ux1 — MEDIUM: persistent on-screen hint advertising the existing help overlay

Evidence: a `?`-bound help overlay already exists (`client/src/main.ts:877-899`, `HelpView`, shipped at `pt-c2b`/ADR-0135) with real content (`#help-title` "Controls & Goals", `client/index.html:80`). Grepped `client/index.html` and `main.ts` for any persistent, always-visible hint text (e.g. "Press ? for help") — zero hits. Drew found the overlay only by pressing random keys, and separately got stuck on the victory/flee battle-result screen not knowing Escape would dismiss it (same root cause: no persistent affordance anywhere on screen).

- **ux1-1:** THE game screen SHALL display a small, persistent, always-visible hint (e.g. a corner badge) reading something like "Press ? for controls & help," visible during normal play (not just on first load) — so a new player can self-serve without key-mashing.
- **ux1-2:** Battle-result states specifically (victory / flee / defeat) SHALL show a persistent "Press Esc to continue" (or equivalent) hint for as long as that overlay is showing — this is the acute panic moment Drew flagged ("I thought I'd have to restart the game").
- **ux1-3 (proof-of-teeth):** a test SHALL assert the persistent hint element exists and is visible under normal play state, and a battle-result-specific test SHALL assert the continue-hint renders on victory/flee/defeat view models.
- Touches: `client/index.html`, `client/src/main.ts` or a small new `client/src/ui/*.ts` (hint rendering), `client/src/ui/battleView.ts` (+ sibling tests). Client, mostly-additive → parallel-friendly with ux2/ux3.

### ux2 — MEDIUM: owner-scoped view of the caller's own currency balance

Evidence: `player_wallet` is deliberately PRIVATE (ADR-0081/0040) — `shopModel.ts:6` documents "balance is not accessible via subscription — only reducer-feedback messages are available." Shop items already show individual prices (`shopView.ts:105,125`, "`${item.name} — ${item.buyPrice} gold`") but there is no running balance display anywhere, matching Drew's "a cost is listed, but the amount of money I have is not obvious." The codebase already has a precedented pattern for exactly this shape of problem: an owner-scoped `#[view]` exposing only the caller's own row (used for `player_conversation`, ADR-0087, M13.5c) — the fix should follow that precedent, not invent a client-side balance tally (which would drift on reconnect/multi-tab and duplicate server-authoritative state).

- **ux2-1:** THE server SHALL expose an owner-scoped view over `player_wallet` (mirroring the `#[view]` pattern already used for `player_conversation`) so a client can subscribe to **only its own** balance — no other player's balance SHALL ever be visible through this view (same privacy posture as today, just self-visible instead of fully opaque).
- **ux2-2:** THE shop UI (and anywhere else prices are shown, e.g. a future HUD) SHALL display the player's current balance, sourced from the new view — kept live via the existing subscription/store pattern, not a one-shot fetch.
- **ux2-3 (proof-of-teeth):** a server-side test SHALL assert the view returns only the caller's own row (never another identity's), matching the existing privacy-gate test style used for `player_conversation`. A client-side test SHALL assert the shop view model surfaces the balance field once populated.
- Touches: `server-module/src/*.rs` (new view + schema regen), `client/src/net/store.ts` (bindings), `client/src/ui/shopModel.ts`/`shopView.ts` (+ tests), `evals/*` (privacy gate, mirroring the existing conversation-privacy eval pattern). Server schema change → SERIAL vs any concurrent schema-touching slice; bindings regen required (`just knowledge`).

### ux3 — LOW: `just playtest-up`/`playtest-wipe` preflight check for a running SpacetimeDB instance

Evidence: confirmed exactly as Drew diagnosed. `justfile` (`playtest-up`, ~line 212-260): the first live action is `spacetime build` then `spacetime publish` (~line 226, 229) — no preflight check of `$STDB_SERVER` reachability anywhere before that. Same gap in `playtest-wipe` (~line 284-306, publish at ~295). `playtest-down` only kills the vite-preview pidfile process and never touches `spacetime start` — confirmed by grep, zero hits for `spacetime start` anywhere in the justfile or `docs/playtest-ops.md`, meaning the SpacetimeDB instance has always been assumed to be a separately-managed, already-running process with no documented "how do I start it" step for a first-time tester.

- **ux3-1:** `playtest-up` and `playtest-wipe` SHALL preflight-check that `$STDB_SERVER` is reachable (e.g. a bounded `curl -sf "$STDB_SERVER/v1/ping"` retry, or a single fail-fast check) before attempting `spacetime build`/`publish`, and SHALL fail with an actionable error message (pointing at `spacetime start`) rather than the current opaque `tcp connect error`.
- **ux3-2:** `docs/playtest-ops.md` SHALL gain a one-line "start SpacetimeDB first: `spacetime start`" step if one doesn't already exist for a first-time tester.
- **ux3-3 (proof-of-teeth):** the existing `playtest-verify.eval.mjs`-style structural-scan pattern (pt-a2) SHALL gain a check that both recipes contain the preflight check before their first `spacetime build`/`publish` call.
- Touches: `justfile`, `docs/playtest-ops.md`, `evals/playtest-verify.eval.mjs` (or a sibling). Tooling-only → parallel-friendly with ux1/ux2.

### ux4 — LOW: repro-and-confirm the battle monster-switch discoverability gap (no blind fix)

Evidence: `battleView.ts:246-374`/`battleModel.ts:145,316` already implement a bench-swap UI (`canSwap: bench.length > 0`, rendered swap buttons per bench member) — this contradicts Drew's "no method of switching monsters seemed to exist." The most likely explanation, not yet proven: a newly-recruited monster lands in the **box**, not the active **team**, so `bench` stayed empty and `canSwap` was correctly `false` — meaning the real gap is "how do I add a recruit to my team" being an undiscovered mechanic, not a missing swap button.

- **ux4-1:** a test/repro SHALL confirm (or refute) the hypothesis: start a battle with 2+ **team** monsters (not box-only) and assert swap buttons render. If this passes cleanly (as expected from reading the code), the swap-button UI itself needs NO fix.
- **ux4-2 (conditional on ux4-1 confirming the box/team-separation hypothesis):** the recruit-success flow or the box/party UI SHALL surface a clear, persistent hint when a newly-recruited monster is added to the box rather than the active team (e.g. "added to box — press B to manage your team"), reusing the same discoverability pattern as ux1.
- **ux4-3:** IF ux4-1 instead finds a genuine rendering/state bug (canSwap false when it shouldn't be), THAT bug SHALL be fixed and gated with its own proof-of-teeth — but this is not assumed going in.
- Touches: investigation first (no touches committed until ux4-1's result is known); likely `client/src/ui/{boxView,battleView}.ts` if ux4-2 applies. Small, low-risk either way.

## 3. Decisions

- **Why not fix the box/team confusion by auto-adding recruits to the team?** Not decided here — that's a game-design/UX-flow choice (team-size limits, box exists for a reason) beyond this hardening milestone's scope. ux4 only investigates + adds a hint; it does not change where recruits land.
- **ux2's view-based fix vs. a client-side tally:** deliberately rejected the tally approach (drift risk on reconnect/multi-tab, duplicates server-authoritative state) in favor of the codebase's own precedented owner-scoped-view pattern — consistent with the project's privacy-model discipline (ADR-0081/0040/0087).

## 4. Out of scope (deferred, named, owned in `playtest-gate-decision-2026-07-25.md` §8 — NOT this milestone's job)

Responsive viewport scaling (real, bigger design question). Shop-via-NPC-interaction (needs an interaction-target system that doesn't exist yet). Full main-menu redesign (folds into the already-parked `M-postgate-overlay-registry` when that slice is eventually scoped — this milestone does not duplicate it, only notes the corroborating evidence). Player/NPC tile-merge visual bug and sprite-recoloring-over-time — both investigated against live code and NOT reproduced (no coupling/tint mechanism found); flagged for a real repro capture if either recurs, not blind-fixed here. **UPDATE 2026-07-25: both RE-INVESTIGATED (deeper read-only pass) and CLOSED as confirmed non-defects — see `playtest-gate-decision-2026-07-25.md` §10; residuals are optional design/UX follow-ups only, not part of this milestone.** Fusion-vs-evolution design question — Drew's explicit call is evaluate-first via `/debate` or `/consult`, not folded into this triage.

## 5. Notes for the runner

ux1/ux2/ux3 are mutually disjoint touch-sets and fan-out friendly (client-additive, server-schema, tooling respectively) — ux2 is the only one touching schema, so it's SERIAL vs any other concurrent schema-touching slice but not vs ux1/ux3. ux4 should run first among the four if possible (cheap, and its result may change ux1's battle-result-hint scope slightly, e.g. wanting the recruit-to-box hint to reuse the same on-screen-affordance mechanism ux1 builds — sequence ux1 after ux4 if that dependency turns out to matter, otherwise they're independent). Reserve an ADR per slice at build time — verify `adr_next_free` in `mr-state.json` before reserving (146 as of 2026-07-25, unconsumed by this spec or by `M-postgate-netcode-hardening.spec.md`).
