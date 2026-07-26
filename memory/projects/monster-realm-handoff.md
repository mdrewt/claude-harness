# monster-realm v2 — supervisor handoff (rolling; older entries in monster-realm-handoff-archive-2026-07.md)

---

## 2026-07-26T00:07:54Z — OPERATOR RESOLUTIONS (Drew-delegated 2026-07-26) + PLAYTEST-2 GATE DIRECTIVE
RESOLVED: (1) harness branch reconciled — strays committed, main fast-forwarded to the docs branch tip (28 commits), pushed to origin; checkout rests on main. (2) Cowork fallback cadence cut hourly->6-hourly (native failure latch + toast cover fast detection; model switch to Sonnet remains a Drew UI option, now low-stakes at 4 runs/day). (3) legacy ornith:35b removed (21GB freed; hermes shared -fixed tag intact).
TIMING CALLS: (4) loop RE-ENABLED now — first tick merges pending nh3+ux3 events, then proceeds per PLAN. (5) PLAYTEST-2 GATE (directive): when the two released hardening milestones (M-postgate-netcode + M-postgate-ux, incl. the untriaged care-button/feel-tuning follow-ups if sized in) are CLOSED, do NOT start further Phase D work — raise the gate-class BLOCKER per discipline with wake_file=/home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/playtest-feedback-2026-07-r2.md (template: /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/playtest-feedback-TEMPLATE.md). Rationale: gate-decision doc S7 — a clean second read before committing Phase D; also produces the first escaped-defect data for the quality metrics.

## 2026-07-26T00:21:25Z — native tick 2026-07-26T00:17Z — ux3 merged, nh3 merge-pending CI
Two terminal events (ux3, nh3) reconciled this tick.

ux3 (PR#253, M-postgate-ux-hardening): mr-audit CLEAN both dims. Squash-merged (37e8b26). master CI green post-merge.

nh3 (PR#254, M-postgate-netcode-hardening, ADR-0152): mr-audit orchestration CLEAN; gating FLAGGED (hard-tier mandatory read, 11 modified asserts) — adjudicated CLEAN: every change is the dropRejected(seq)->dropRejected(seq,epoch) signature migration forced by the new required epoch param, assertions strengthened (added positive-control + flipped vacuous-eviction check to prove real fix), none weakened/removed/skipped.

Merging nh3's PR against tip after ux3 landed produced mergeStateStatus=DIRTY/CONFLICTING. Investigated with git merge-tree --write-tree: the ONLY conflicting file was the auto-generated docs/adr/DIGEST.md (ARCHITECTURE.md auto-merged clean). Per the doc-set conflict-resolution exception, merged origin/master into the nh3 worktree branch, regenerated DIGEST.md mechanically via 'node scripts/adr-digest.mjs' (no hand-edit), committed (e13f09f) and pushed. No code/test files touched by the resolution. PR#254 now MERGEABLE, CI running on the merge commit — delegated to mr-ci-watch (PID detached), will resume via event tick rather than polling.

ADR bookkeeping: 0152 (nh3) and 0153 (ux3) both now on master via ux3's merge + nh3's rebase-in. adr_next_free remains 0154 per prior handoff.

Ledger rows written for both slices (ux3=merged; nh3=audited-CLEAN pending CI). Chain-owner mutex released this tick after nh3 CI resolves (or immediately since work is delegated).

## 2026-07-26T00:28:04Z — nh3 merged (PR#254, ADR-0152) — M-postgate-netcode-hardening CLOSED
2026-07-26T00:27Z native tick (CI-triggered, run_id=native-20260726T002302Z-1916853): reconciled from live ground truth -- both nh3 and ux3 .done files present, no live locks, no resident-session collision. gh pr list showed ux3/PR#253 already MERGED (prior tick handled it; stale .done/lock cleaned, no re-record). nh3/PR#254 was OPEN/CLEAN/MERGEABLE, ci+e2e SUCCESS. Ran mr-audit --tier hard: orchestration CLEAN (10 agent calls, full role roster incl tester/red-team/review-lens/reviewer/verifier/doc-keeper); gating FLAGGED per mandatory hard-tier read policy. Adjudicated CLEAN by reading the complete main.ts/predictor.ts diff plus test diffs: the 11 flagged asserts are all mechanical dropRejected(seq)->dropRejected(seq,epoch) signature-follow updates in predictor.test.ts, not weakenings. Implementation delivers exactly the resume_block's two mechanisms -- Case M1 (cross-generation eviction) via a branded PredictorEpoch guard in dropRejected, and Case M2 (post-rebuild stale-seq collision) via a lastSentSeq floor fed through seedSeq on resetPredictionState -- and the ADR-0152 doc + ADR-0085 amendment accurately narrate both. The pre-existing outstandingSteps under-count residual is explicitly named as NOT fixed by this slice (deliberate scope boundary, held.clear() carries the reconnect arm). Squash-merged PR#254 -> 4368a07. Master ff-only'd cfbf59e->4368a07 (also picked up ux3's prior merge content already present). Removed worktrees .claude/worktrees/{nh3,ux3} and their local branches; remote branches already auto-deleted. Verified master CI green on the merge commit via a backgrounded gh run watch (not sit-polled inline) -- ci+e2e both SUCCESS. M-postgate-netcode-hardening is now CLOSED: nh1+nh2+nh4+nh3 all merged (nh3 was the deferred-from-gate-decision slice, closing the ADR-0085 accepted-risk window per ADR-0152). M-postgate-ux-hardening: ux1+ux3 merged; ux2 (owner-scoped player_wallet view) and ux4 (battle-swap discoverability repro-and-confirm) remain. Ledger row written. adr_next_free unchanged at 154 (152/153 already consumed by nh3/ux3 at launch). No composite launch this tick -- kept atomic since master-CI confirmation landed via a background watch after the merge decision itself; next tick/event should pick up ux2/ux4 or the evolution-fusion milestone (A1/B follow-ons) fresh.

## 2026-07-26T01:03:19Z — native tick — ux2+ux4 launched (M-postgate-ux-hardening tail)
Reconciled stale nh3/ux3 .done artifacts (both already merged and ledgered by the 00:21-00:29Z ticks; no re-record). Verified live: master local==origin at 4368a07, zero open PRs, no resident-session collision. M-postgate-netcode-hardening is CLOSED; M-postgate-ux-hardening still has ux2 (owner-scoped player_wallet view) and ux4 (battle-swap discoverability repro-and-confirm) remaining, so the PLAYTEST-2 GATE directive does not fire yet (requires BOTH hardening milestones closed). mr-disjoint verdict SAFE for the ux2/ux4 pair (file-disjoint, no shared registry axis). Fan-out N=2: LAUNCHED ux2 (opus@high, routine, ADR-0154, server-module #[view]+shopModel/shopView) and ux4 (opus@high, routine, ADR-0155, boxView/battleView repro-first). Both asserted LAUNCHED+detached via mr-spawn. Ledger rows written. adr_next_free 154->156. Next tick/event should reconcile whichever finishes first; remaining M-postgate-ux-hardening slices after these two clear the milestone -- then check whether M-postgate-netcode-hardening's companion is also fully closed to evaluate the PLAYTEST-2 GATE.

## 2026-07-26T03:05Z — ux2 PR OPEN (PR#255, ADR-0154) — terminal state, supervisor owns the merge
Slice ux2 (M-postgate-ux-hardening, owner-scoped `my_wallet` view over the private
`player_wallet` table). Branch `feat/ux2-wallet-view`, worktree
`projects/monster-realm/.claude/worktrees/ux2`. **Local `just ci` green (exit 0)**; remote CI
running at hand-off (run 30185482819). `gh pr merge` NOT run — supervisor-owned.

**Verdict roster:** planner → reviewer + red-team + /simplify (plan) → 2× tester (RED, verified
red by the orchestrator since tester agents have no Bash) → specialist (red→green) → reviewer +
red-team + review-lens/reducer-security-auditor + verifier. Verifier: **PASS** — CI exit 0,
coverage 97.67% (thr 96), mutation 1/1 new mutant killed (cap 299 has zero headroom; verified,
not assumed), no test weakened RED→green, scope clean.

**ux2-2 IS PARTIAL — needs a follow-up slice `ux2b` before the milestone can close.** The spec's
`touches:` line for ux2 was incomplete: the runtime path also needs `connection.ts` +
`rowConvert.ts`, and `buildShopViewModel` has TWO `main.ts` call sites (`:702`, `:1269`).
Treated as a hidden dependency and NOT touched (ux4 was live and may own `main.ts`); the seam
ships inert (renders hidden, not a misleading `Gold: —`). ux2b is specified file-by-file in
ADR-0154 D7 and in the spec's new DELIVERED block. **ux2b also owns the only true behavioral
privacy tooth** (a two-identity `client/e2e/` spec) — ux2's proof is structural only.

**Carry forward (bit the gate design, will bite the next `#[view]` slice):**
- A view handle has **no `Table` impl** — `.iter()` cannot compile in a `ViewContext`. The
  reachable leak is a **point lookup on the wrong key**, so a presence check for
  `find(ctx.sender)` is defeated by a dead decoy line. Pin the view body EXACTLY.
- `public` on `#[spacetimedb::view]` is a **mandatory keyword with no visibility effect**
  (`view.rs:13-14` `#[allow(unused)]`; omitting it is a compile error). Scoping comes from the
  host ABI supplying `sender`.
- `ViewContext::new()` is a **pub constructor** — a view can forge a context and call another
  view with a victim identity. Ban context construction in module source.
- Reachability must be a **transitive closure**; a 1-hop derivation loses `view → roster() → census()`.
- ADR-0087's body-anchored view scanning is **not** a sufficient template — 4 distinct leaks
  passed it in replay.
- `tester` agents have **no Bash tool** — they cannot verify their own red/green. The
  orchestrator must run and paste the red state, or the TDD gate is unproven.

Next: supervisor merges #255 after remote CI, then ux2b (LOW, mechanical) closes ux2-2. ux4 was
running concurrently and is unaffected (disjoint file sets — confirmed by the scope audit).
adr_next_free unchanged at 156 (154 consumed here, 155 reserved for ux4).

## 2026-07-26T03:15:17Z — ux2 MERGED (PR#255, ADR-0154)
Squash-merged f8f50cb2 to master (ff-only local checkout updated). Audits CLEAN (orchestration + gating). Diff (92 files: shopModel/View wiring, my_wallet view+bindings regen, wallet-privacy eval, ADR-0154) matched declared touches; docs/knowledge bulk regen is expected bindings-regen noise. Disjoint from concurrent ux4 (still live at tick-exit, leader pid 1930229, no .done). Master CI on merge commit was still in_progress (~2.5min) at tick-exit — same diff already passed PR CI green, low risk; next tick should confirm master green before opening any new launch slot. No new launch opened this tick (kept N=1 in-flight: ux4 only) pending that confirmation. M-postgate-ux-hardening remaining: ux4 (in flight).

## 2026-07-26T04:40Z — ux4 TERMINAL STATE: PR#256 open, local `just ci` + `just e2e` BOTH green, remote CI running
**Slice:** ux4 (M-postgate-ux-hardening, LOW) · **Branch:** `feat/ux4-swap-discoverability` · **Worktree:** `.claude/worktrees/ux4` · **ADR-0155** · **PR:** https://github.com/mdrewt/monster-realm/pull/256 · **MERGEABLE**, mergeStateStatus=UNSTABLE only because `ci`+`e2e` are still pending. **`gh pr merge` NOT run — supervisor owns the merge.**

**Verdict on the slice's own question:** ux4-1 **CONFIRMED** the box/team-separation hypothesis and **REFUTED** a swap-UI bug, so **ux4-3 does not apply** and no swap-path fix shipped. Chain: `taming.rs:163` grants `PARTY_SLOT_NONE` (decided, ADR-0047 §3) → `lead_party` filters boxed monsters out of side A → `bench`/`canSwap` correctly empty/false → `#renderSwapButtons` is correct. The repro shipped as executable probes (S1/S2/X2) measured GREEN on the untouched tree — S1/S2 are the **first PvE `Swap:` assertions in the repo**, and with no TS mutation harness, deleting the PvE arm of the label ternary was a green mutant before this slice.

**Shipped:** 2 persistent hints (toggled `#swapHintEl` in battleView on `outcome==='Ongoing' && !canSwap`; static `#hintEl` in boxView). 15 gating cases across the two sibling test files. Both shells are coverage-EXCLUDED and there is no TS mutation gate, so those cases are the entire gate — and an earlier version of them accepted a **cheating implementation** (show-only toggle with the reset laundered into `hide()`) that measurably parked the hint next to "Victory!" and beside a live `Swap:` button. H7 (live-view transitions, no `hide()`/`refresh(null)`) exists solely to kill it. Verifier independently re-ran all 10 mandated mutants **plus one of its own** — 11/11 killed; assertion-level diff across all 4 authoring passes found 5 removals, each a documented strictly-stronger replacement; +101 assertions net; no skip/only/deleted test.

**Gates:** full `just ci` **exit 0** on the post-merge tree (57 files / **1497** client tests, 1456 Rust + doctests, **71 evals / 0 fail**, clippy `-D warnings`, fmt, biome, secrets clean, wasm, tsc). Nightly coverage re-measured **97.65% lines** vs 96 floor. Zero changed Rust lines ⇒ empty cargo-mutants scope. **`just e2e` ALSO run locally: 39 passed / 1 skipped / exit 0** — deliberately against an isolated `VITE_STDB_DB=monster-realm-ux4-e2e` + `MR_E2E_PORT=5297`, because the default e2e DB is `monster-realm` with `--delete-data` and would have **wiped Drew's playtest state**; the ephemeral DB was deleted afterwards (`monster-realm`/`monster-realm-playtest` verified intact). e2e was worth running locally here because this slice's only risk surface is DOM that `recruit.spec.ts` text-scans.

**ux2 collision RESOLVED in-branch (do not re-resolve):** ux2/PR#255 merged mid-run, and PR#256 went DIRTY/CONFLICTING on exactly the two predicted doc-set files. Fixed per the doc-set exception (nh3 precedent) in merge commit `8110628`: `ARCHITECTURE.md` keeps **BOTH** section paragraphs (ux2 first, then ux4, each retaining its own historical `ADR next-free` marker, matching the ux1/ux3 idiom — so the section now reads 0152/0154/0155/0156); `docs/adr/DIGEST.md` regenerated **mechanically** from origin/master's version via `just adr-digest` (121 project ADRs, both 0154 and 0155 present, `adr-digest-check` no drift). **No code or test file touched by the resolution.** ADR-0155 status was `Proposed` at first draft, which hard-fails `scripts/adr-digest.mjs` and made `just ci` red — now `Accepted`.

**adr_next_free = 0156** (0154 ux2, 0155 ux4).

**M-postgate-ux-hardening: all four slices now delivered** — ux1 (#251), ux3 (#253), ux2 (#255), ux4 (#256 pending merge). Per the 2026-07-26 PLAYTEST-2 GATE directive, once #256 merges BOTH released hardening milestones (M-postgate-netcode CLOSED, M-postgate-ux) are closed ⇒ **do NOT start further Phase D work; raise the gate-class BLOCKER** with wake_file=`specs/monster-realm-v2/playtest-feedback-2026-07-r2.md`.

**NEW SPEC ITEM WARRANTED (ux4's biggest find, deliberately NOT fixed — out of touch-set):** `M-postgate-pvp-side-b-overlay` — the PvP **side-B** player never gets a battle overlay at all. `refreshBattle` reads `store.latestPlayerBattle(identity)`, which skips rows where `playerIdentity !== identity`, and the accepting player is stored as `opponent_identity` (`pvp.rs:291`). The codebase documents the workaround only on the debug surface (`main.ts:1596-1598`) and `client/e2e/pvp-full.spec.ts:352-353` bypasses the UI for B. Consequences: **no cards, no skills, no swap buttons, and no forfeit control anywhere** (zero `forfeit` hits in `pvpView.ts`/`pvpModel.ts`) — the challenged player is frozen until the 60s turn deadline forfeits them. Also means "B is dead while the battle overlay is open" is a **side-A-only** statement (KeyB works mid-PvP for side B). This is a real playtest-visible defect in a shipped feature; recommend scoping it before/with the playtest-2 gate.

**Second deferral worth queueing:** `set_party_slot` has no `is_in_ongoing_battle` guard (`monster_mgmt.rs`), unlike care/train/heal_party. Domain audit traced it as **NOT exploitable** (HP write-back pairs `side_a.team` positionally with the `battle.party_monster_ids` **id snapshot** and never reads `party_slot`; all nine server-side `party_slot` readers are battle-start or unrelated; `accept_challenge` re-validates via `build_pvp_team`; escrow guards match ids not slots; `check_party_slot` caps the party at 6) — but the safety is **emergent, not guarded, and untested** (there is no `monster_mgmt_tests.rs` at all). It is also the mechanism that forced ux4's copy to be scoped "in this battle".

**Residual risks on the PR (all disclosed in ADR-0155 + PR body):** `battleView`'s root has no `overflow` (unlike `boxView`'s `overflow-y:auto`), so ~20px of added height needs a 720p measurement — happy-dom does no layout, folds into deferral D2 (`client/e2e/swap-hint.spec.ts`). `To Party` now matches TWO nodes (hint div + real button) ⇒ future specs must use `getByRole('button', …)`. Copy hardcodes `Esc`/`B` and nothing pins `boxView?.toggle()` as KeyB's effect. Pre-existing `client/e2e/recruit.spec.ts` citations into both shells were shifted by these insertions but `client/e2e/**` is out of touch-set; two stale citations also left in the pre-ux4 ux1-2 region of `battleView.test.ts` (`battleView.ts:401` → `:421`).

**Next for the supervisor:** delegate the #256 CI wait to `mr-ci-watch`, squash-merge on the event (6 commits incl. 3 `wip:` — squash is required, the repo's `commit-msg` hook rejects `wip(...)`), then remove `.claude/worktrees/ux4` + the local branch, and raise the playtest-2 gate BLOCKER.

## 2026-07-26T03:36Z — ux4 MERGED, PLAYTEST-2 GATE raised

PR#256 squash-merged as `dd51bde` (both audits CLEAN: orchestration 16 agent calls incl. tester/red-team/reviewer/verifier; gating-test integrity clean, no removed asserts/skips). `docs/adr/DIGEST.md` + `ARCHITECTURE.md` carried through as-merged. Local `master` fast-forwarded to `dd51bde`; remote CI on the merge commit was still `in_progress` at tick-exit (PR's own checks had already passed green: ci 2m49s, e2e 3m42s — same diff, low risk, not re-polled per no-babysit-CI rule).

Cleaned up both the `ux4` worktree/branch (merged this tick) and the orphaned `ux2` worktree/branch (PR#255 had merged in a prior tick but its worktree was left behind — removed now, no PR was open on it).

**M-postgate-netcode-hardening and M-postgate-ux-hardening are BOTH now closed** (ux4 was the last of the four ux slices: ux1 #251, ux3 #253, ux2 #255, ux4 #256). Per the 2026-07-26 PLAYTEST-2 GATE directive, no further Phase D work starts. Raised `.blocked-on-human` with wake_file=`specs/monster-realm-v2/playtest-feedback-2026-07-r2.md` (does not yet exist — verified live). No launch this tick.

**Queued for whoever picks up Phase D next** (from ux4's own findings, not yet spec'd):
- `M-postgate-pvp-side-b-overlay` — PvP side-B player gets no battle overlay at all (`store.latestPlayerBattle` misses `opponent_identity`-keyed rows); no cards/skills/swap/forfeit until 60s timeout. Real playtest-visible defect.
- `set_party_slot` missing `is_in_ongoing_battle` guard — traced NOT exploitable (HP write-back keys off id snapshot, not slot) but emergent/untested; no `monster_mgmt_tests.rs` exists yet.
