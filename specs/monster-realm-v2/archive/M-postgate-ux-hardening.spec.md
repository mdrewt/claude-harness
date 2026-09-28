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

**DELIVERED (PR #251, ADR-0151).** Persistent `#help-hint` badge (static markup in
`client/index.html`, no new view class) + "Press Esc to continue" hint on battle-result
(victory/flee/defeat) states in `battleView.ts`. 9 files, `main.ts` untouched → ran
fan-out-safe alongside concurrent `nh4`.

- **ux1-1 EXTENDED (disclosed):** the badge advertises an overlay that did not render on
  screen. `#help-overlay` carried **only** `style="display:none"` — a static, in-flow `<div>`
  after a `window.innerHeight`-tall PixiJS canvas in `#app`, and the repo has **zero CSS
  files** — so `show()` painted it below the fold (measured in real Chromium: `top=724` at
  `innerHeight=720`), in default black text on the `#0b0d12` body. ux1-1 therefore also
  viewport-anchors `#help-overlay` (`position:fixed;inset:0` + z-index band on the shell;
  `HelpView.show()` sets `style.display=''`, which removes only that declaration, so no view
  class changed). Without this the slice would have shipped an affordance pointing at a no-op.
- **DEFERRED to `M-postgate-overlay-registry`:** the **nine** remaining in-flow shells in
  `client/index.html` (dialogue, quest-log, heal, shop, trade, pvp-challenge, leaderboard,
  rename, tradepropose) plus the JS-created `errorOverlayView` have the **identical** defect;
  only box/raising/evolution/battle build fixed roots in JS. Direct cause of
  `PlaytestReport.md:81/:85/:97`. This deferral is **load-bearing, not cosmetic**: the new
  badge is **dishonest while any overlay is open**, because `?` is a dead key then (the
  keydown handler's overlay-suppression path owns it) — the badge keeps advertising an action
  that cannot be taken until the registry lands.
- **ux1-3 PARTIALLY MET.** New `client/src/indexShell.test.ts` parses the REAL
  `client/index.html` (via `import.meta.url` + `DOMParser`) rather than the repo's usual
  hand-mirrored inline fixture (vacuous for this claim), and must live under `client/src/`
  because `vite.config.ts` restricts discovery to `src/**/*.test.ts`. But **happy-dom does no
  layout**, so the test proves *present / body-anchored / not-obviously-invisible*, never
  *visible* (`opacity:0`, `visibility:hidden`, `font-size:0`, `left:-9999px`,
  `transform:scale(0)`, `clip-path`, `content-visibility`, the `hidden` attribute and a
  zero-size ancestor all pass). Named follow-up: `client/e2e/help-hint.spec.ts` using
  Playwright `toBeInViewport()`.

### ux2 — MEDIUM: owner-scoped view of the caller's own currency balance

Evidence: `player_wallet` is deliberately PRIVATE (ADR-0081/0040) — `shopModel.ts:6` documents "balance is not accessible via subscription — only reducer-feedback messages are available." Shop items already show individual prices (`shopView.ts:105,125`, "`${item.name} — ${item.buyPrice} gold`") but there is no running balance display anywhere, matching Drew's "a cost is listed, but the amount of money I have is not obvious." The codebase already has a precedented pattern for exactly this shape of problem: an owner-scoped `#[view]` exposing only the caller's own row (used for `player_conversation`, ADR-0087, M13.5c) — the fix should follow that precedent, not invent a client-side balance tally (which would drift on reconnect/multi-tab and duplicate server-authoritative state).

- **ux2-1:** THE server SHALL expose an owner-scoped view over `player_wallet` (mirroring the `#[view]` pattern already used for `player_conversation`) so a client can subscribe to **only its own** balance — no other player's balance SHALL ever be visible through this view (same privacy posture as today, just self-visible instead of fully opaque).
- **ux2-2:** THE shop UI (and anywhere else prices are shown, e.g. a future HUD) SHALL display the player's current balance, sourced from the new view — kept live via the existing subscription/store pattern, not a one-shot fetch.
- **ux2-3 (proof-of-teeth):** a server-side test SHALL assert the view returns only the caller's own row (never another identity's), matching the existing privacy-gate test style used for `player_conversation`. A client-side test SHALL assert the shop view model surfaces the balance field once populated.
- Touches: `server-module/src/*.rs` (new view + schema regen), `client/src/net/store.ts` (bindings), `client/src/ui/shopModel.ts`/`shopView.ts` (+ tests), `evals/*` (privacy gate, mirroring the existing conversation-privacy eval pattern). Server schema change → SERIAL vs any concurrent schema-touching slice; bindings regen required (`just knowledge`).

**DELIVERED (PR #255, ADR-0154) — ux2-1 + ux2-3 COMPLETE, ux2-2 PARTIAL.** `#[view(name =
my_wallet, public)]` over the private table; single-slot store holder; two-arm
`ShopBalanceViewModel`; `#shop-balance` node; new `evals/wallet-privacy.eval.mjs` (24 teeth)
+ 3 Rust teeth. `just ci` green, coverage 97.67%, 1/1 new mutant killed.

- **ux2-2 IS NOT SATISFIED AT RUNTIME — the player still cannot see their gold.** The
  `touches:` line above is incomplete: the runtime path also needs `client/src/net/connection.ts`
  (the `.subscribe([...])` array + `onInsert` handler) and `client/src/net/rowConvert.ts`
  (the SDK→store converter), and `buildShopViewModel` has **TWO** call sites in
  `client/src/main.ts` (`:702` KeyG and `:1269` the batch listener) — patching only the first
  renders the balance once on open and lets the batch listener overwrite it on the next batch,
  which is worse than not shipping it. With a sibling slice potentially owning `main.ts`, ux2
  shipped the seam inert (renders hidden, not a misleading permanent `Gold: —`).
- **→ SPAWN `ux2b` (LOW, mechanical):** `rowConvert.ts` converter + round-trip test ·
  `connection.ts` subscribe + `onInsert` → `store.upsertWallet` (**no `onDelete`, no `onUpdate`**
  — views emit no update and wallet rows are never deleted) · the 5th argument at BOTH `main.ts`
  call sites, with a call-site-count tooth (ADR-0108 RT-SEC-02 idiom) · promote eval check S to
  require `FROM my_wallet` in exactly one subscribe array · `client/e2e/` two-identity spec —
  **the only true behavioral privacy tooth**, and the residual ux2 could not close in-scope.
- **The spec's suggested gate shape was measurably insufficient.** ux2-3 asks for a test
  "matching the existing privacy-gate test style used for `player_conversation`" — that style
  (body-anchored view scanning, presence needles) was broken by four separate leaks in
  adversarial replay: a **decoy line** (`let _ = …find(ctx.sender);` above `…find(victim)`),
  **helper indirection**, a **table-handle hop**, and a **forged `ViewContext::new(victim)`**.
  The shipped gate pins the view body EXACTLY, closes reachability to a transitive fixed point,
  and bans context construction. Threat model correction worth carrying forward: a view handle
  has no `Table` impl, so `.iter()` **cannot compile** in a `ViewContext` — the reachable leak
  is a point lookup on the wrong key, not a whole-table scan. And `public` on a view is a
  mandatory keyword with **no** visibility effect (verified in the 1.12.0 macro source).

### ux3 — LOW: `just playtest-up`/`playtest-wipe` preflight check for a running SpacetimeDB instance

Evidence: confirmed exactly as Drew diagnosed. `justfile` (`playtest-up`, ~line 212-260): the first live action is `spacetime build` then `spacetime publish` (~line 226, 229) — no preflight check of `$STDB_SERVER` reachability anywhere before that. Same gap in `playtest-wipe` (~line 284-306, publish at ~295). `playtest-down` only kills the vite-preview pidfile process and never touches `spacetime start` — confirmed by grep, zero hits for `spacetime start` anywhere in the justfile or `docs/playtest-ops.md`, meaning the SpacetimeDB instance has always been assumed to be a separately-managed, already-running process with no documented "how do I start it" step for a first-time tester.

- **ux3-1:** `playtest-up` and `playtest-wipe` SHALL preflight-check that `$STDB_SERVER` is reachable (e.g. a bounded `curl -sf "$STDB_SERVER/v1/ping"` retry, or a single fail-fast check) before attempting `spacetime build`/`publish`, and SHALL fail with an actionable error message (pointing at `spacetime start`) rather than the current opaque `tcp connect error`.
- **ux3-2:** `docs/playtest-ops.md` SHALL gain a one-line "start SpacetimeDB first: `spacetime start`" step if one doesn't already exist for a first-time tester.
- **ux3-3 (proof-of-teeth):** the existing `playtest-verify.eval.mjs`-style structural-scan pattern (pt-a2) SHALL gain a check that both recipes contain the preflight check before their first `spacetime build`/`publish` call.
- Touches: `justfile`, `docs/playtest-ops.md`, `evals/playtest-verify.eval.mjs` (or a sibling). Tooling-only → parallel-friendly with ux1/ux2.

**DELIVERED (PR #253, ADR-0153).** Shared `playtest-preflight` recipe called from both
`playtest-up` and `playtest-wipe` after their `MR_PLAYTEST_DB` guard and before the first
`spacetime build`/`publish`; `spacetime start` step + preflight step in
`docs/playtest-ops.md`; gate extension in `playtest-verify.eval.mjs`. 7 files, no code
dirs touched → ran fan-out-safe alongside concurrent `nh3`.

- **ux3-1 DEVIATES FROM THE SPEC'S SUGGESTED MECHANISM (disclosed).** The parenthetical
  `curl -sf "$STDB_SERVER/v1/ping"` was measurably wrong: `spacetime publish -s` accepts
  server **nicknames** (`spacetime server list` ships `local` and `maincloud`), so
  `STDB_SERVER=local` publishes fine while a URL-constructing curl probe fails DNS and
  confidently misdiagnoses a healthy server — strictly worse than the opaque error ux3
  exists to remove. Shipped `timeout 10 spacetime server ping "$STDB_SERVER"`, which
  shares `publish -s`'s resolution path. The spec's "e.g." makes this spec-compliant.
- **A SECOND DEFECT, found only by adversarial testing:** `spacetime server ping` exits
  **0 for any completed HTTP round-trip** — trailing slash and path suffix return
  `Server returned 404` at exit 0, and an unrelated service on the port returns
  `Server could not be reached (500 …)` at exit 0, all of which `publish -s` rejects. The
  first implementation shipped exit-code-only and passed them. The probe now matches the
  literal `Server is online` line and echoes the CLI's last output line so the failure
  names the real cause. Also load-bearing: **`timeout 0` disables the timeout** in GNU
  coreutils, and `server ping` has no timeout of its own.
- **ux3-3 EXCEEDED.** A source-scan-only gate (what ux3-3 literally asks for) let **9 of
  19** functionally-broken implementations pass GREEN — two proven to exit 0 against a
  dead server. Four **behavioral** teeth were added: negative (dead port), positive
  control (live stub — without it "the preflight always fails" is a passing
  implementation), non-SpacetimeDB responder (500 stub), and a **call-site** tooth that
  runs both callers with a fake `spacetime` first on PATH and proves they abort without
  invoking it — the only assertion gating that the *callers* honor the preflight rather
  than merely containing the line. Final mutation probe: **13/13 killed**.
- **Deliberate non-scope:** `playtest-report` and `playtest-verify-release` reach the same
  server and keep the opaque failure mode — named rather than silently omitted.

### ux4 — LOW: repro-and-confirm the battle monster-switch discoverability gap (no blind fix)

Evidence: `battleView.ts:246-374`/`battleModel.ts:145,316` already implement a bench-swap UI (`canSwap: bench.length > 0`, rendered swap buttons per bench member) — this contradicts Drew's "no method of switching monsters seemed to exist." The most likely explanation, not yet proven: a newly-recruited monster lands in the **box**, not the active **team**, so `bench` stayed empty and `canSwap` was correctly `false` — meaning the real gap is "how do I add a recruit to my team" being an undiscovered mechanic, not a missing swap button.

- **ux4-1:** a test/repro SHALL confirm (or refute) the hypothesis: start a battle with 2+ **team** monsters (not box-only) and assert swap buttons render. If this passes cleanly (as expected from reading the code), the swap-button UI itself needs NO fix.
- **ux4-2 (conditional on ux4-1 confirming the box/team-separation hypothesis):** the recruit-success flow or the box/party UI SHALL surface a clear, persistent hint when a newly-recruited monster is added to the box rather than the active team (e.g. "added to box — press B to manage your team"), reusing the same discoverability pattern as ux1.
- **ux4-3:** IF ux4-1 instead finds a genuine rendering/state bug (canSwap false when it shouldn't be), THAT bug SHALL be fixed and gated with its own proof-of-teeth — but this is not assumed going in.
- Touches: investigation first (no touches committed until ux4-1's result is known); likely `client/src/ui/{boxView,battleView}.ts` if ux4-2 applies. Small, low-risk either way.

**DELIVERED (PR #256, ADR-0155).** 7 files, client-only + docs; ran fan-out-safe alongside
concurrent `ux2`.

- **ux4-1 CONFIRMED the hypothesis and REFUTED a swap-UI bug ⇒ ux4-2 applies, `ux4-3` does
  NOT.** Chain verified at `4368a07`: `taming.rs:163` grants `PARTY_SLOT_NONE` (a *decided*
  behaviour — ADR-0047 §3 chose box placement to avoid clobbering an occupied party slot) →
  `battle.rs` `lead_party` filters boxed monsters out of side A → `battleModel.ts` computes
  `bench` only when ongoing, `canSwap = bench.length > 0` → `battleView.ts`
  `#renderSwapButtons` renders one `Swap:` button per bench member. The repro shipped as
  executable probes (S1/S2/X2), **measured GREEN on the untouched tree** — that is the
  discharge. S1/S2 are the **first PvE `Swap:` assertions in the repo** (only `Submit Swap:`
  was pinned), and with no TS mutation harness, deleting the PvE arm of the label ternary was
  a green mutant before this slice.
- **ux4-2 discharged in a weakened, always-on form — NOT recruit-triggered.** ADR-0047 §1
  records that the client cannot distinguish a recruit-end from a KO-end by `outcome` alone
  and defers a first-class recruit event to the M14 event log; a recruit-triggered hint needs
  `main.ts`/`battleModel.ts`, both outside the touch-set. Shipped instead: a toggled
  `battleView` hint on the empty-swap case and a static `boxView` hint stating the
  party/box invariant.
- **Every clause of both copies is a gated honesty property, not a style choice** — and three
  of them corrected the spec's own suggested wording. `B` is dead while the battle overlay is
  open (`inputGuards.ts` `!battleVisible`), Escape on an ongoing battle is a bare `hide()`
  whose next batch re-shows the overlay, and a terminal battle row is **not** GC'd — so the
  overlay persists after victory/defeat/flee and B stays dead **until Escape**, which the copy
  therefore names. The copy does **not** advertise healing (`heal_party` is zone-gated, only
  `zone_id: 0`, and a zone-1 encounter table exists). Its claim is scoped **"in this
  battle"** because red-team proved the unscoped claim falsifiable *by a player following the
  hint's own instructions* (Esc un-gates KeyB → `set_party_slot` has no in-battle guard →
  `To Party` accepted → that row-write re-shows the overlay → `sideA.team` is a snapshot so
  `canSwap` stays false). The box copy **describes** the `To Party` button rather than
  commanding a click, because the empty-box branch renders no such button — the fresh-player
  state (one monster, empty box).
- **The 15 sibling unit cases are the ENTIRE gate** (both shells are coverage-excluded DOM
  shells; there is no TS mutation harness), so the suite was attacked rather than assumed. An
  earlier version accepted a **cheating implementation** — show-only toggle with the reset
  laundered into `hide()` — which passed all 12 cases while measurably parking the hint next
  to "Victory!" and beside a live `Swap:` button; **H7** (live-view transitions, no
  `hide()`/`refresh(null)`) exists solely to kill it. Three conjunct mutants
  (`weather`/`status`/`cureItems` constant across every fixture) survived until H1's fixture
  varied those fields; a copy carrying `' Or press ? for help.'` survived at 124 chars until
  `?`/`help` fences and a 140→120 cap landed; a whole-sentence-swapped copy survived until a
  reason-before-remedy ordering assertion landed. Verifier re-ran all ten mutants plus one of
  its own: **11/11 killed**.
- **D6 — CRITICAL pre-existing bug found here, NOT fixed:** the PvP **side-B** player never
  gets a battle overlay (`latestPlayerBattle` skips rows where `playerIdentity !== identity`;
  the accepter is stored as `opponent_identity`), so no cards, no skills, no swap buttons and
  **no forfeit control anywhere** — frozen until the 60s deadline. Warrants its own spec item
  (`M-postgate-pvp-side-b-overlay`). Consequence for ux4: the battle hint is **side-A-only in
  PvP**, and KeyB works mid-PvP for side B. **D7:** `set_party_slot` has no
  `is_in_ongoing_battle` guard — audited as *not exploitable* (HP write-back keys off the
  `party_monster_ids` id snapshot; no mid-battle `party_slot` reader exists) but emergent and
  untested, and it is the mechanism behind the copy's "in this battle" scoping.
- Other deferrals: **D1** server pin for recruit→box (narrower than "unpinned" —
  `guards_tests.rs` already pins `check_monster_in_party(PARTY_SLOT_NONE).is_err()`); **D2**
  `client/e2e/swap-hint.spec.ts` (happy-dom does no layout ⇒ these cases prove *present +
  not display:none*, never *visible*; also `To Party` now matches two nodes, so future specs
  need `getByRole('button', …)`); **D3** party-full `To Party` silent no-op (the copy's "an
  **open** party slot" is the hedge); **D4/D5** unchanged per §3 and ADR-0047 §1; **D8**
  0-indexed party slot labels. Disclosed residual: `battleView`'s root has no `overflow`
  (unlike `boxView`'s `overflow-y:auto`), so ~20px of added height needs a 720p measurement.

## 3. Decisions

- **Why not fix the box/team confusion by auto-adding recruits to the team?** Not decided here — that's a game-design/UX-flow choice (team-size limits, box exists for a reason) beyond this hardening milestone's scope. ux4 only investigates + adds a hint; it does not change where recruits land.
- **ux2's view-based fix vs. a client-side tally:** deliberately rejected the tally approach (drift risk on reconnect/multi-tab, duplicates server-authoritative state) in favor of the codebase's own precedented owner-scoped-view pattern — consistent with the project's privacy-model discipline (ADR-0081/0040/0087).

## 4. Out of scope (deferred, named, owned in `playtest-gate-decision-2026-07-25.md` §8 — NOT this milestone's job)

Responsive viewport scaling (real, bigger design question). Shop-via-NPC-interaction (needs an interaction-target system that doesn't exist yet). Full main-menu redesign (folds into the already-parked `M-postgate-overlay-registry` when that slice is eventually scoped — this milestone does not duplicate it, only notes the corroborating evidence). Player/NPC tile-merge visual bug and sprite-recoloring-over-time — both investigated against live code and NOT reproduced (no coupling/tint mechanism found); flagged for a real repro capture if either recurs, not blind-fixed here. **UPDATE 2026-07-25: both RE-INVESTIGATED (deeper read-only pass) and CLOSED as confirmed non-defects — see `playtest-gate-decision-2026-07-25.md` §10; residuals are optional design/UX follow-ups only, not part of this milestone.** Fusion-vs-evolution design question — Drew's explicit call is evaluate-first via `/debate` or `/consult`, not folded into this triage.

## 5. Notes for the runner

ux1/ux2/ux3 are mutually disjoint touch-sets and fan-out friendly (client-additive, server-schema, tooling respectively) — ux2 is the only one touching schema, so it's SERIAL vs any other concurrent schema-touching slice but not vs ux1/ux3. ux4 should run first among the four if possible (cheap, and its result may change ux1's battle-result-hint scope slightly, e.g. wanting the recruit-to-box hint to reuse the same on-screen-affordance mechanism ux1 builds — sequence ux1 after ux4 if that dependency turns out to matter, otherwise they're independent). Reserve an ADR per slice at build time — verify `adr_next_free` in `mr-state.json` before reserving (146 as of 2026-07-25, unconsumed by this spec or by `M-postgate-netcode-hardening.spec.md`).
