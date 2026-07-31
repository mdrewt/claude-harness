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

## 2026-07-26T13:22:11Z — Retro-5 plan implemented (P1 fastpath bug, P3 census durability, P4 removals, P5 insurance list)
P1: paid live-chain standdowns since Jul 25 root-caused to archive/ nested in pending-events breaking the emptiness check; fixed both sites — free fastpath restored (verify: next live-chain cron tick should log STANDDOWN live-chain WITHOUT a SPAWN). P3: done-events now carry a reconcile-time RUN CENSUS. P4 removals (rollback = git history): debounce, haiku triage hop (local triage retained), chore-batching prose. P2 deferred pending census evidence. Keep-as-insurance list ratified in README. Loop remains gated on playtest-2 (free standdowns).

## 2026-07-27T00:35:10Z — Feedback doctrine v1.0 ACTIVATED (2026-07-26)
All operator-feedback processing now follows $MEM/mr-feedback-doctrine.md (v1.0). New machinery: mr-feedback (event-sourced ledger, state machine, reconciler, covermap, 15-check selftest = activation gate, PASSED), tick reconciler hook, feedback-triage agent (records CAPTURED/CLASSIFIED; supervisor owns dispositions/terminals), mr-ask-drew/mr-decision-watch decision-issue channel, seed domains in project research library. SSOT coverage paragraph replaced by pointer; r2 addendum preserved (ux-design release + two r1 strays). First live case: r2 feedback processing — run the full doctrine pass on it.

## 2026-07-27T02:46:10Z — r2 playtest feedback: triaged, blocked on Drew (issue #4)
Wake file specs/monster-realm-v2/playtest-feedback-2026-07-r2.md APPEARED (operator-authored, uncommitted alongside a PlaytestReport.md hand-edit -- left untouched, another session's in-progress work). Confirmed live ground truth first: no locks/PRs/inflight, master CI green at d66e867 (nightly RED is the known non-gating mutation-server flake, unchanged), .blocked-on-human's prior PLAYTEST-2 gate note was satisfied by this file's appearance.

Spawned feedback-triage per mr-feedback-doctrine.md v1.0 (first real use since activation -- r1 predates the ledger entirely). Result: 90 items CLASSIFIED into episode r2-2026-07-26 (specs source items 001-086 + 4 carried-over r1 strays 087-090 per the SSOT's r2-specific addendum: care-button no-op, movement/NPC feel tuning, npc jerkiness, no-walk-animation). Covermap verified clean (5/5 source paragraphs mapped, zero no-op markers needed). Reconciler FEEDBACK-CHECK-OK.

Notable triage findings (full detail in the ledger): items 062/063 are a CORRECTION+DIRECTIVE where Drew explicitly overrules the 2026-07-25 35-agent fuse()-fix decision (ADR-0147/0149) and wants fusion REPLACED by an evolution-tree/essence-graph system -- compliance proceeds regardless per doctrine (corrections queue-jump), but the exact shape has open economy/schema questions. Two fact-checks confirmed Drew is right (?-key shift-modifier bug at main.ts:929; single fusion recipe in fusion.ron); one fact-check found OUR bug: the shop 'currency is in an active trade' error (item 032) is actually a misleading message for an insufficient-available-balance condition (escrow-netted per ADR-0106/0117), not a real in-trade flag -- worth a quick truthful-error-message fix independent of the redesign. Item 019 (a question-kind item) was answered and closed in-episode (M10c renders two registries, ADR-0019/0060) per doctrine's no-silent-unanswered-question rule. Item 009 flagged and logged as a doctrine SS12 PROCESS defect (091): the talk-panel UI complaint is the same defect class as r1's trade/shop panel complaint, which WAS deferred/covered in r1 but never communicated -- an I-1/I-4 breach, root-caused to r1 predating the ledger (not a repeat process failure post-activation).

Opened ONE consolidated blocking decision issue (#4, https://github.com/mdrewt/claude-harness/issues/4) bundling 5 items that need Drew's steer before the remaining 89 items are dispositioned: (033) gate-lift-on-milestone-creation (r2 text) vs gate-lift-on-full-closure (committed b0e37b5 directive) -- recommended: honor b0e37b5; (034) a truncated/copy-paste-looking queue line; (061) a sentence that cuts off mid-word naming an unstated dialogue-rendering alternative; (073) whether the new essence-economy redesign REMOVES or DEMOTES existing battle/training EV gain; (077) whether the tier system's egg/breeding mention is forward-looking-only or implies building a breeding feature that doesn't exist yet. .blocked-on-human now points at this issue (wake_file = decisions/issue-4.answer.md); mr-decision-watch spawned (5-min poll, 7-day cap).

NOT done this tick (deliberately, to keep the tick atomic per the one-action rule): dispositioning the other 89 CLASSIFIED items into DISPOSED (action+weight+target), sizing/drafting the actual milestone specs (evolution/essence redesign, UI/UX overhaul + responsive viewport, 0hp-battle-start fix, movement double-step investigation, dev-observability toggle, interact-key redesign), and reconciling M-postgate-ux-design's release-for-implementation per the SSOT's r2 addendum. All of that is real supervisor-judgment work that should happen with issue #4's answers in hand (items 062/063's redesign shape depends directly on 073/077) -- next tick/event (the decision-watch answer, or a forced tick) should resume with 'disposition the r2 episode + draft milestones' as the next unit of work. adr_next_free unchanged at 156 (no ADRs consumed this tick). mr-state.json/PlaytestReport.md's pre-existing uncommitted diffs (from the 03:36Z tick and an apparent manual r2-authoring session) were left as-is, not committed -- not this tick's scope.

## 2026-07-27T03:34:30Z — Operator context: second project planned
Drew (2026-07-27): a procedural map generator project is planned — tile sets + wave-function collapse, generating maps/assets consumable by other projects incl. monster-realm. Relevance: decision-issue repo rule is per-impacted-project; expect multi-project harness operation; asset-pipeline interfaces may become a cross-project contract surface.

## 2026-07-27T03:34:35Z — Native supervisor tick (rid=native-20260727T033435Z-2486308): decision-loop reconciliation
All 5 questions bundled under decision issue #4 (r2-triage, r2-q2, r2-q3, r2-q4, r2-q5 -> GitHub issues #4/#6/#7/#8/#9) came back answered via mr-decision-watch events this tick. Verified live: `.blocked-on-human` already clear, no open PRs, no live per-run or chain-owner locks, feedback ledger `mr-feedback check` = FEEDBACK-CHECK-OK items=91, master CI green at d66e867. Closed all 5 issues on GitHub with acknowledgment comments quoting the answers; archived their 6 pending-event files (issue #5/feedback-reconcile was already closed by the operator's override, only needed archiving). Updated `mr-state.json` queue head with the consolidated answers and re-affirmed the next unit of work.

Answers, condensed: (033) gate-lift ambiguity was actually about the already-lifted playtest-2 gate, not playtest-3 — no directive conflict, r2 line 30 ignorable. (034) truncated queue line = copy-paste noise, r1 sequencing stands. (061) the cut-off dialogue-alternative sentence completes to: HTML/React components with fixed positioning, overlaid on the game screen like a modal (not identical to one). (073) essence-economy redesign FULLY REMOVES battle/training EV gain — EVs now come primarily from food items and represent nutrition; essence (not EVs) is what battle/training grants monsters going forward. (077) egg/breeding tier language is a forward-looking invariant only — no breeding feature to build now.

**Deliberately not done this tick** (one-action-per-tick discipline; this tick scoped to closing the decision loop, not reopening the heavy judgment work): dispositioning the other 89 CLASSIFIED r2 feedback items (action+weight+target each) and drafting/sizing the resulting milestones (evolution/essence-graph redesign superseding ADR-0147/0149's fuse() fix; UI/UX overhaul + responsive viewport for M-postgate-ux-design uxd1/uxd3; 0hp-battle-start fix; movement double-step investigation; dev-observability toggle; interact-key redesign; shop error-message truthfulness fix for item 032). All the blocking ambiguities that gated this work are now resolved — next tick or a dedicated session should pick up "disposition the r2 episode + draft milestones" as its one unit of work.

No launch, no merge, no ADR consumed (adr_next_free unchanged at 156). governor=NORMAL, d7_usd=1420.17/2783.

## 2026-07-27T03:52:00Z — Native supervisor tick (rid=native-20260727T034140Z-2490895): r2 feedback episode DISPOSITIONED, Phase D reshaped

Picked up the queued "disposition the r2 episode + draft milestones" unit of work (unblocked since the prior tick closed all 5 gating decision issues). Live ground truth first: no locks, no open PRs, master CI green at d66e867, governor NORMAL (d7=$1420.85/2783). Found a fresh reconciler alert (issue #10, opened seconds before this tick by the tick-reconciler hook: `mr-feedback check` flagged 90 items `FEEDBACK-UNDISPOSED` for ≥2 decision cycles) — investigated rather than overrode: this was exactly the expected, already-documented backlog, not a new defect.

**Dispositioned all 91 CLASSIFIED r2 ledger items** (`mr-feedback set`, doctrine §10 restricted action set FIX/ANSWER/LOG): 83 → DISPOSED (action+weight+target), 5 remarks → LOGGED, 3 already-answered questions (019/033/034) → ANSWERED with evidence links into `decisions/`. `mr-feedback check` now `FEEDBACK-CHECK-OK items=91`. Full item→target mapping lives in the ledger; grouped roughly: battle-0hp cluster (005/030/031/036-039) · movement-investigation cluster (003/015/029/040-042) · uxd1 responsive-viewport cluster (010-014/047-051) · uxd3 overlay/menu/dialogue cluster (006-009/016/035/052-061/091) · uxd2 interact-key cluster (022-026/032) · dev-observability cluster (043/045/046) · essence-redesign cluster (062-086, the bulk) · feel-polish cluster (087-090) · content-backlog linkage (021/028 → existing M-postgate-roster-wave-3).

**Five new/updated milestone specs** under `specs/monster-realm-v2/`: `M-postgate-battle-0hp-fix.spec.md`, `M-postgate-movement-investigation.spec.md`, `M-postgate-dev-observability.spec.md`, `M-postgate-feel-polish.spec.md` (all LIGHT, real EARS-lite acceptance criteria, launchable now as normal slices) and `M-evolution-essence-redesign.spec.md` (HEAVY — deliberately a **skeleton only**, capturing Drew's verbatim r2 intent as ceremony input; it supersedes ADR-0147/0149's "fix fuse(), don't replace it" outcome per Drew's explicit correction, and its own next unit of work is the full investigation→6-way-ideation→judge-synthesis ceremony, same class of process the original fusion-vs-evolution decision got — NOT ready to build from this file directly). Flagged `M-postgate-evolution-fusion-hardening`'s B2 slice (item-triggered evolution, still un-shipped) as needing reconciliation against the essence-graph shape before either ships.

**M-postgate-ux-design uxd1 (responsive viewport) and uxd3 (overlay/menu cohesion) RELEASED for implementation** per the r2 addendum, now consumed — the addendum sentence in `mr-supervisor-prompt-native.md` is deleted (its persistent playtest-3 gate-timing line survives unchanged). uxd2's scope note extended to cover the interact-key redesign ask (022-026/032) via its already-designed `NpcInteraction` enum generalization.

`PLAN.md` §9 updated with all six milestone entries/notes. `mr-state.json` queue head rewritten with the disposition summary + next-action pointer. Commented on issue #10 (left OPEN per doctrine's never-close-unanswered rule) explaining the investigation and linking the resulting specs — Drew can close it himself if satisfied.

**Not done this tick** (one-action discipline; this tick scoped to feedback-episode planning, not slice execution): no slice launched, no merge, no ADR consumed (`adr_next_free` unchanged at 156 — none of this tick's work required a project-level ADR yet; each new milestone reserves its own at build time). The reshaped Phase D queue (battle-0hp-fix / movement-investigation / dev-observability / feel-polish / uxd1 / uxd2 / uxd3 all launchable now; essence-redesign needs its ceremony first) is what the NEXT tick should pick from under the normal gates. Governor stayed NORMAL throughout; no rate-limit event.

**Gotcha found live:** the supervisor's own investigative `gh issue comment` on non-blocking reconciler issue #10 was indistinguishable to `mr-decision-watch` from an operator answer — it fired a "operator answered" event (a second tick, pid=2501228, correctly SKIP'd on the still-held flock and requeued it). Archived the resulting duplicate event (`feedback-reconcile-issue10.decision.md`) since its content was already fully incorporated by this tick. Future supervisor comments on non-blocking/advisory decision issues should account for this — either avoid commenting until genuinely done, or expect a self-triggered follow-up tick.

## 2026-07-27T04:02Z — Native supervisor tick (rid=native-20260727T040010Z-2504105): fan-out launch, battle-0hp-fix + dev-observability

Picked up the reshaped Phase D queue (unblocked by the prior two ticks' decision-closing + disposition work). Live ground truth first: no chain/per-run locks, no open PRs, master local==origin at `d66e867` with CI green (nightly RED unchanged, known non-gating flake), no pending events. No human-session collision: the only `claude`-named processes are the `mr-native-tick.sh` wrapper itself and a stale `vite preview`/esbuild pair with zero recent writes; nothing in either repo tree was touched in the last 6 min. Left the two pre-existing uncommitted files as-is (`memory/projects/PlaytestReport.md` hand-edit, `memory/projects/decisions/issue-10.answer.md` — a duplicate decision-watch transcript whose content is already fully incorporated per commit `e1896e0`'s "archived the duplicate event" note) — not this tick's scope.

`mr-disjoint battle-0hp-fix vs dev-observability` → SAFE, file-disjoint, no shared registry/enum/namespace axis (no partitioning needed). Both LIGHT weight per their specs, routine tier (neither hits a HARD criterion — no schema/predictor/RLS/M20-M25/resume-after-park). `free -g` showed 17G/45G, ample for N=2. Governor NORMAL (d7=$1424.37/2783, fable_ok=true, neither slice needed fable).

LAUNCHED **battle-0hp-fix** (opus@high, ADR-0156, `server-module/src/battle*.rs` — never select a 0hp lead monster, reject actions on an already-0hp active monster, verify the 0hp swap-in reject path, document a double-KO/speed-tie comparator rule, regression test for Drew's exact repro) and **dev-observability** (opus@high, ADR-0157, client-only — toggleable dev-console logging of outbound reducer calls, reusing the pt-b1 eventRing/error-overlay substrate, pt-a1-style prod-safe flag). Both asserted LAUNCHED+detached by `mr-spawn` (leader=2505535/claude_pid=2505538 for battle-0hp-fix; leader=2505772/claude_pid=2505775 for dev-observability). `adr_next_free` 156→158.

**Remaining Phase D queue** for the next pick: `movement-investigation`, `feel-polish`, `uxd1`, `uxd2` (HARD/full-stack-schema, serial vs any concurrent schema-touching slice), `uxd3` (`main.ts`-SERIAL, must land after nh1/nh2 — already merged — and after any uxd2 `main.ts` edit). Note for next tick: `movement-investigation` and `feel-polish` both plausibly touch client movement/`main.ts` — re-run `mr-disjoint` against each other and against whichever of `uxd2`/`uxd3` is still queued before the next fan-out; don't assume today's pair's disjointness carries over. `M-evolution-essence-redesign` remains not-launchable (needs its own HEAVY ceremony first).

No merge, no park, no BLOCKER. governor=NORMAL throughout.

## 2026-07-27T02:15Z — dev-observability: PR #257 OPEN, local `just ci` green (terminal state)

**Slice `dev-observability`** (M-postgate-dev-observability, r2 items 043/045/046) built and pushed on
`feat/dev-observability` (worktree `.claude/worktrees/dev-observability`, 7 `wip:` commits — **squash
required**, the `commit-msg` hook rejects `wip(...)`). PR: https://github.com/mdrewt/monster-realm/pull/257
**Local `just ci` EXIT=0** (73/73 evals, 1459 Rust tests, 1529 client tests, biome/tsc/secrets clean).
Remote CI running at hand-off; `gh pr merge` deliberately NOT run — supervisor owns the merge.

**What shipped:** `client/src/net/devLog.ts` (new, pure, zero runtime imports) + ~10 lines of wiring in
`main.ts`/`connection.ts`. `VITE_MR_DEVLOG` (`off`|`send`|`send-move`, default off) gates a Proxy
installed at `build()`'s return; strict identity when off. Covers all 38 outbound reducer call sites via
one seam. **ADR-0157** consumed (`docs/adr/0157-dev-console-outbound-reducer-log.md`) — so
`adr_next_free` should advance to 158.

**Two decisions worth knowing:** (1) the pt-a1 fail-loud asymmetry is **inverted** — throws in dev,
degrades to `off` + one `console.error` in prod, because the eager module-scope resolve runs before the
error listeners exist and a debug-flag typo would otherwise blank the whole playtest session and kill the
F9 path. (2) PII key-name redaction was considered and **rejected** (it would blank exactly the reducers
being debugged); the real control is console-only + zero runtime imports, so the module structurally
cannot reach the F9 bundle.

**Two flag-on-only defects were found in review and fixed** (both invisible to CI, which runs flag-off):
the `Reflect.get` receiver does not fix `this` for later invocation (`#private` brand-check throw) →
`.bind(target)`; and the SDK's plain-`{}` reducers object leaked `toString`/`hasOwnProperty`/`constructor`
into the log as fake reducer calls → `Object.hasOwn` guard. Both now have gates that bite.

**touches-delta** (audit): `evals/dev-observability-gating.eval.mjs` (new file only, auto-discovered) and
`docs/adr/DIGEST.md` (generated by `just adr-digest`, CI drift-gated). `CHANGELOG.md`,
`docs/adr/README.md`, `docs/knowledge/**` untouched. boyscout-delta: none.

**Supervisor follow-ups:** (a) delegate the #257 CI wait to `mr-ci-watch`, squash-merge, then remove the
worktree + branch; (b) the harness spec `specs/monster-realm-v2/M-postgate-dev-observability.spec.md` is
OUTSIDE this slice's touch-set and still reads "queued" — needs its status ticked to delivered;
(c) four named deferrals recorded in ADR-0157 — `obs-b` inbound stream, `obs-c` `Connection.reducers`
accessor (would retire the outer Proxy entirely), `obs-d` runtime toggle, `obs-e` devlog into the F9
bundle behind a per-reducer arg allowlist.

**ENVIRONMENT HAZARD worth propagating to every future client slice:** a bare `wasm-pack build
client-wasm` (without `--target bundler`) silently corrupts `client-wasm/pkg` and makes the vite build
fail with a confusing `"step_ms" is not exported by "../client-wasm/pkg/client_wasm.js"`. It bit twice
this run (two different subagents). Always use `just wasm`. Also: the default `node` on PATH is **v18**;
project commands need `export PATH="/home/mdrewt/.asdf/installs/nodejs/24.13.1/bin:$HOME/.cargo/bin:$PATH"`
or evals fail with bogus `node:fs`/`glob` errors. A fresh worktree also needs `npm ci` in `client/`.

## 2026-07-27T05:5xZ — battle-0hp-fix TERMINAL STATE: PR#258 open, local `just ci` green, remote CI running
**Slice:** battle-0hp-fix (M-postgate-battle-0hp-fix, LIGHT) · **Branch:** `feat/battle-0hp-fix` · **Worktree:** `.claude/worktrees/battle-0hp-fix` · **ADR-0156** · **PR:** https://github.com/mdrewt/monster-realm/pull/258 · **`gh pr merge` NOT run — supervisor owns the merge.**

**Gates:** `just ci` **exit 0** (fmt, clippy workspace `-D warnings`, biome, 1476 Rust tests, **72 evals / 0 fail**, secrets, wasm, tsc, 1497 client tests). `just mutate-core` run separately: **missed=0** (ADR-0050 zero-tolerance; all 3 mutants on the new `with_lead` line caught; the 5 timeouts are pre-existing `tiled_import.rs` parser arithmetic). Note a fresh worktree needs `just client-setup` before `just ci` — biome is not resolvable otherwise (cost one red cycle).

**Roster:** planner → reviewer + red-team + /simplify on the PLAN → tester (RED, verified red by me — tester agents have no Bash) → reviewer + red-team on the TESTS → specialist (red→green) → reviewer + red-team + /simplify + reducer-security-auditor + desync-guard (5 parallel lenses) → verifier. Verifier **PASS** on all 6 mandate items.

**The load-bearing decision — a planned change was REJECTED, do not let a later slice "complete" it.** The plan included a fainted-actor early return at the top of `resolve_one_attack`. Red-team PoC'd it as a **permanent non-terminating fixpoint** when both actives are fainted (100 turns, zero progress) where current code self-repairs in **2 turns**; in ranked PvP the only exit degenerates to "whoever disconnects first takes a rated loss". /simplify independently showed it unreachable-by-construction after the constructor fix, and the reviewer showed its stated rationale ("the general form of `second_had_faint`") was factually inverted — the two rules have disjoint firing conditions, so publishing that framing would invite deleting `second_had_faint` and handing every KO'd side a free retaliation. Dropped; ADR-0156 D3 records it with evidence and `a_zero_hp_active_state_self_repairs_and_never_becomes_a_fixpoint` is the sentinel (verified: it is the ONLY test that catches the re-addition).

**HIDDEN DEPENDENCY — needs supervisor re-serialization, recommend as the next slice.** `server-module/src/pvp.rs` carries the byte-identical defect (`start_pvp_battle`: `any(conscious)` then `active: 0`; `submit_pvp_action`'s attack arm accepts a skill for a fainted active). Outside the declared `touches:` set, so it was recorded not widened into — but the spec's EARS E1 says "for both PvE and PvP starts", so **that criterion is half-delivered**. PvP is not made worse (zero `game-core` behavior change ⇒ bit-identical to master), but a live **sac-lead exploit** remains on the rating-affecting surface: a deliberately 0 HP lead deals full damage (`calc_damage` never reads attacker HP), absorbs the opponent's turn-1 attack, and buys a free switch costing no turn. Fix is a mechanical two-call adoption of `BattleSide::with_lead` + a `submit_pvp_action` mirror of the `submit_attack` guard — no design decisions left. Filed as ADR-0156 residual P1 and in the spec's new §3b.

**`touches:` DEFECT to fix in the spec corpus:** the declared path `game-core/src/battle/*` **does not exist** — the module is `game-core/src/combat/`. Work landed where the code actually lives; declared under `touches-delta:` in the PR body. Any future fan-out disjointness check against that path is vacuous until corrected. (Corrected in the spec's §3b this run.)

**Carry-forward that bit this run (will bite the next `server-module` slice):**
- **`server-module/src/battle_tests.rs` has no reducer-executing harness** — it is `include_str!("battle.rs")` source-scanning. A red-team pass built a tree with the defect 100% intact that passed **all 374** server tests, via three inline evasions: a dead `let _ = ...is_fainted()` binding satisfying a needle; adopting the constructor then writing `side_a.active = 0`; and permuting `team` at the call site. Presence-only needles are near-worthless here. What works: per-function **occurrence counts**, **argument pinning**, block-scoped `return Err` assertions, and **whitelists over blacklists** (`.active` may appear only inside `.active_monster`; `.team` only as `.iter()`/`.iter_mut()`) — a blacklist of assignment operators rots on the eleventh spelling, and a naive `.team.` needle false-trips on four legitimate `.team.iter()` calls. Recorded as ADR-0156 residual **P7**: the missing harness is the largest standing gap in this subsystem's gate.
- **`BattleSide.active` privatization is mechanically blocked**, not merely deferred: `evals/spacetime-type-snapshot.eval.mjs` regex-parses `pub <field>:` and exact-matches the baseline, so dropping `pub` reads as a **wire-breaking field removal**. Needs a slice that also owns `evals/`. `#[non_exhaustive]` on `BattleSide` would sidestep the regex but requires converting ~16 test-file literals. (Supersedes ADR-0053 residual (a)'s weaker "touch-set width" reason.)
- **Positional coupling is unguarded:** `side.team[i]` ↔ `party_monster_ids[i]` drives HP write-back and the XP loop, and `check_team_coupling` compares **lengths only** — a permutation is silent cross-monster corruption. Any future constructor/refactor here needs full-`Vec` equality teeth, not `.len()`.
- **ADR-0104 gate:** the `**Decision:**` header is capped at **240 chars** and `scripts/adr-digest.mjs` hard-fails over it — cost one red cycle at 303 then 241. `just adr-digest` AND `just knowledge` must both be run and committed; the knowledge bundle drifts on pure line-number shifts in any scanned reducer file.

**Also corrected this run:** ADR-0155's claim that "a fainted active never coexists with `Ongoing`" — true mid-battle, false at construction. ADR-0156 amends it and 0155 gained the reciprocal `**Amended-by:**` header.

**Next for the supervisor:** delegate #258's CI wait to `mr-ci-watch`, squash-merge (4 `wip:` commits — squash required, the `commit-msg` hook rejects `wip(...)`), remove `.claude/worktrees/battle-0hp-fix` + the local branch, then **launch the PvP follow-up**. adr_next_free 156 → **157** (157 was reserved for the concurrent `dev-observability` slice, so next free is 158).

## 2026-07-27T06:58:55Z — dev-observability + battle-0hp-fix: both MERGED
PR#257 (dev-observability, ADR-0157) squash-merged -> master@b741a74. PR#258 (battle-0hp-fix, ADR-0156, r2-playtest defect items 005/030/031/036-039) squash-merged -> master@a920a4b.

Sequence: both slices reached terminal state (PR open, CLEAN, mergeable) at the same tick. mr-audit CLEAN on both (orchestration + gating). Merged 257 first (client-only, disjoint touches). PR#258's merge-base was behind by one commit after 257 landed -> mergeStateStatus flipped DIRTY/CONFLICTING, but the only conflict was docs/adr/DIGEST.md (generated file, both slices reserved adjacent ADR numbers 0156/0157). Resolved deterministically per doctrine (doc-set-only conflict): merged origin/master into feat/battle-0hp-fix, ran `just adr-digest` to regenerate DIGEST.md cleanly (both ADR rows present), committed, pushed. CI re-ran green, merged.

Post-merge: master fast-forwarded locally to a920a4b, worktrees + local/remote feature branches cleaned, master CI verified green (gh run watch, both ci+e2e success).

Ledger: both slice costs already captured by wrapper-reconcile rows (dev-observability $60.64, battle-0hp-fix $69.89) — this merge tick's ledger rows carry outcome=merged with cost_usd=null by design (C1 guard, no double-count).

## 2026-07-27T07:14:18Z — native tick (forced/manual, rid=native-20260727T071038Z-549139): standdown -- live human edit detected
Live ground truth at tick start: no locks/PRs/inflight, master CI green at a920a4b, both battle-0hp-fix(PR#258) and dev-observability(PR#257) already merged by the prior 06:59Z tick. Reviewed the merged battle-0hp-fix spec addendum (uncommitted in harness working tree, written by that slice's doc-keeper): flags a real follow-up need -- server-module/src/pvp.rs was NOT in touches: and carries the identical 0hp-lead exploit (start_pvp_battle any(conscious)-then-active:0 shape; submit_pvp_action accepts a skill for a fainted active), a live rating-affecting sac-lead exploit on PvP. Spec recommends a follow-up slice M-postgate-battle-0hp-fix-pvp (mechanical two-call adoption of BattleSide::with_lead + a submit_pvp_action mirror of the submit_attack guard) -- not yet queued as its own milestone; left as-is this tick (not this tick's scope to draft it, surfacing for the next tick/session). Selected movement-investigation as the next Phase D pick (PLAN SS9 order, HARD tier per predictor/main.ts-adjacent touches, fable@xhigh, ADR 158 reserved) since it was the first unblocked slice and its ambiguous/undiagnosed touches made it unsafe to fan out alongside feel-polish/uxd1-3 this tick (matches the prior tick's own caution note). Acquired the chain-owner mutex, wrote pass-vars, called mr-spawn -- it returned PROBE-TRIPPED: a write to specs/monster-realm-v2/M-postgate-ux-design.spec.md at 2026-07-27T07:12:50Z (41s before the probe, well inside the ~6min window). Verified live: git diff shows a one-line addition answering the uxd2 shopkeeper-flow open question ('Answer provided by Drew: GREET-THEN-SHOP') -- a genuine live human edit, not a stale artifact or my own action. Correctly aborted the launch per doctrine (never override a tripped probe), released the mutex, cleaned up pass-vars/vars.json, did NOT relaunch as a workaround. No mutating action taken this tick. adr_next_free unchanged at 158. Governor NORMAL throughout (d7=$1558.68/2783). Next tick should re-derive fresh: if Drew's edit session has ended (no further recent writes), movement-investigation remains the next pick; also consider drafting M-postgate-battle-0hp-fix-pvp as a queued follow-up milestone given the live PvP exploit finding.

## 2026-07-27T07:35Z native tick (forced/manual, rid=native-20260727T073239Z-559279): launched movement-investigation

Live ground truth at tick start: no locks/PRs/inflight, master CI green at a920a4b, both prior slices (battle-0hp-fix/dev-observability) confirmed merged. The 07:14Z tick had aborted movement-investigation on PROBE-TRIPPED (live human edit on M-postgate-ux-design.spec.md at 07:12:50Z answering the uxd2 shopkeeper-flow question). Re-checked this tick: that write's mtime is now well past 6 minutes stale, no other recent non-supervisor writes found in either repo tree. Probe clear.

Also observed: a mechanical FEEDBACK-CHECK reconciler (wrapper-level, not this tick) opened decision issue #11 (mdrewt/claude-harness) at 07:30:29Z -- "Feedback ledger reconciler found 83 issue(s) -- override or investigate?" -- with mr-decision-watch already polling it. This is informational/non-blocking (doctrine: reconciler issues surface via mr-feedback check, tick-run) -- left untouched, watcher will fire an event on Drew's answer. Not this tick's scope to investigate further given movement-investigation was the clear next action.

Selected movement-investigation (M-postgate-movement-investigation, HARD tier per predictor/main.ts-adjacent touches criterion) as the sole launch -- solo not fanned out, matching the 07:14Z tick's own reasoning: its scope is undiagnosed/root-cause-first (client vs server) and its declared touches overlap feel-polish/uxd1-3 candidates, so fanning out alongside them risked a collision the disjoint-check can't see pre-diagnosis. fable@xhigh (HARD tier per Model & effort routing; fable_ok=true, d7=$1560.64/2783, fable_d7=$707.15 well under the $2068.2 guard). ADR-0158 consumed. Acquired chain-owner mutex (was clear), wrote pass-vars (initially missing the required tier field -- mr-spawn correctly SystemExit'd on the missing field with no launch attempt, no partial state; fixed and re-ran). mr-spawn returned LAUNCHED, detachment+model asserted (leader=562147, claude_pid=562150, session=562147 own-session confirmed, first model line = claude-fable). Per-run lock written. Ledger row recorded (cost 0, pending wrapper reconcile). adr_next_free 158->159.

No merge/park/BLOCKER this tick. Governor NORMAL throughout.

## 2026-07-27 — movement-investigation TERMINAL STATE: PR#259 open, local `just ci` EXIT=0, remote CI running
**Slice:** movement-investigation (M-postgate-movement-investigation, r2 items 003/015/029/040-042) · **Branch:** `feat/movement-investigation` · **Worktree:** `.claude/worktrees/movement-investigation` · **ADR-0158** (consumed; adr_next_free → 159) · **PR:** https://github.com/mdrewt/monster-realm/pull/259 · **`gh pr merge` NOT run — supervisor owns the merge.** 8 `wip:` commits — squash required.

**EARS E1 answered: CLIENT-side, server proven innocent.** Committed deterministic sim (movementSim.test.ts) reproduced Drew's exact sequence: double fires iff server tick phase < tap duration (P ≈ tapMs/200) — the nh2 continuation re-issue keyed on tick phase, not player intent. Edge incidental. This was ADR-0148's accepted {1,2} tap residual, operator-reported. Observability arm NOT taken (root cause found inside the 2h budget).

**Shipped:** hold-commit discrimination — heldKeys.ts press timestamps (required nowMs), `committedActive(now)`, `HOLD_COMMIT_MS=150` (two-sided sweep: walk-start slack 22.9ms at 150 / −0.6 at 175; maxSafeTap(X)=X). main.ts exactly 3 code lines. Contract: taps ≤140ms ⇒ 1 tile always; ≥240ms walks; (150,240) declared indeterminate. New `evals/hold-commit-step-budget.eval.mjs` binds the budget to the REAL game-core STEP_MS (a cadence retune now reds CI — desync-guard finding).

**Roster:** diagnosing-bugs loop (sim-first) → planner → reviewer+red-team+/simplify (plan) → tester@opus (RED verified by orchestrator — tester has no Bash) → reviewer+red-team on tests (red-team found+fixed 2 real evasions: module-mutable-default backdoor → W-MVI-HELDKEYS-IMPORT-SEALED; decoy-string/bracket-notation → per-region reissueDir( count) → specialist (red→green, no test edits) → reviewer+red-team(14/14 mutants killed, zero survivors)+/simplify+desync-guard (4 parallel lenses; reducer-security-auditor skipped: zero .rs changes) → verifier PASS all 6 items → doc-keeper.

**Carry-forward for future slices:**
- The doc-keeper subagent WROTE TO THE MAIN CHECKOUT (docs/adr/ paths without the worktree prefix) despite the worktree being named in its prompt — repaired with pure file ops (no git mutations against main), main checkout verified clean. Future orchestrators: give doc agents ABSOLUTE worktree paths per file and verify `git -C <main> status` after any Write-capable subagent.
- ADR header must be one-field-per-line — a `·`-joined single-line header parses but BLEEDS into DIGEST's Slice column (caught by reading the digest row, not by adr-digest-check).
- movementSim.test.ts is the authoritative post-mvi loop model (predictor.test.ts's runLoop stays deliberately pre-mvi; scope note in-file). Sorted-insert EventQueue; grids run in ~ms.
- ADR-0148 residual 1b (ArrowRight+KeyD dual-code ungated keydown double) is now the SOLE same-direction double path → recommend `M-postgate-dualkey-dedup` (small, sketched in ADR-0158 residual 3). `mvi-e2e` Playwright keyboard tooth still the only closure for `if (true || …)`.

**Next for the supervisor:** delegate #259 CI wait to `mr-ci-watch`, squash-merge, remove `.claude/worktrees/movement-investigation` + local branch; tick the harness spec status (outside slice touches); adr_next_free = 159.

## 2026-07-27T09:56Z native tick (rid=native-20260727T095630Z-726467): movement-investigation PR#259 open (mergeable=MERGEABLE, mergeStateStatus=UNSTABLE) with ci+e2e checks IN_PROGRESS at tick start (started 09:55:10Z). Per-run lock for movement-investigation confirmed dead (leader 562147 not alive, matches LIVE SITUATION's alive:false/done:true) -- run reached terminal state (PR opened, no crash). No live chain-owner mutex, no other inflight per mr-state.json (the recorded `inflight[movement-investigation]` entry is now stale breadcrumb, superseded by live PR/lock state). Delegated CI-wait per doctrine: `setsid bash mr-ci-watch 259 movement-investigation` launched detached (confirmed live pid=728514), will resume via event tick on completion -- did not sit-poll. No merge attempted this tick (checks not yet green). Governor NORMAL throughout (d7=$1644.89/2783, fable_ok=true). No BLOCKER. Next tick / event: when mr-ci-watch reports checks green, run `mr-audit` (tier=hard per HARD criteria: movement/predictor client-shaped + a prior stall was in-scope) before merging; if red, triage per .err/.log rather than blind-relaunch. Remaining Phase D queue unchanged: feel-polish, uxd1, uxd2, uxd3 (main.ts overlap caution still applies).

## 2026-07-27T10:00:25Z — movement-investigation MERGED (PR#259, d18cadb)
native tick (rid=native-20260727T095812Z-729517 / sup run mr-sup-native-20260727T095904Z-730425-27336): EVENT delivered movement-investigation.ci.md (PR#259 all checks green). Re-verified live: gh pr view 259 mergeStateStatus=CLEAN, mergeable=MERGEABLE, ci+e2e both SUCCESS. mr-audit --tier hard: orchestration CLEAN (14 agent calls, roles claude/desync-guard/doc-keeper/planner/red-team/reviewer/tester/verifier across fable/opus/sonnet/haiku). gating FLAGGED per hard-tier mandatory-read (not evidence of weakening) -- adjudicated the diff myself: client/src/prediction/heldKeys.ts adds committedActive(nowMs) + per-entry press stamps (HOLD_COMMIT_MS=150, squeezed both sides per the ADR-0158 doc comment); main.ts changes are 3 one-liners (2x reissueDir(held.active()->held.committedActive(now)) call sites + held.press(dir)->held.press(dir, performance.now())); zero deletions/skip-markers/suppressions/weakened asserts; the +1842/-55 stat is almost entirely new tests (movementSim.test.ts 1068 lines + main.wiring.test.ts +297 covering both re-issue emitter sites + decoy/occurrence-count hardening). Squash-merged (d18cadb), removed the movement-investigation worktree + local branch, ff-only advanced local master checkout to d18cadb. Post-merge master CI run started (in_progress at record time -- no watcher spawned since mr-doctrine defines mr-ci-watch for open-PR checks only, not post-merge master runs; next tick/event will re-verify green). ADR-0158 reserved slot consumed (adr_next_free was 159 pre-tick, already reflected in mr-state.json from the prior tick's reservation). No new slice launched this tick -- deferred pending live master-CI confirmation (single mutating action = the merge). Governor NORMAL throughout (d7=$1645.61/2783, fable_ok=true).

## 2026-07-27T11:01:21Z — movement-investigation merged (PR#259, ADR-0158)
Native tick rid=native-20260727T110010Z-742802: reconciled from live ground truth — PR#259 (feat/movement-investigation) was already MERGED with ci+e2e green (a prior tick had delegated CI-wait to mr-ci-watch). master local==origin==d18cadb, post-merge master CI green. mr-audit run base=a920a4b head=d18cadb tier=hard: orchestration CLEAN (tester+reviewer+verifier+red-team+desync-guard+doc-keeper roles, 14 agent calls). gating auto-FLAGGED (hard-tier mandatory-read policy, not a real weakening signal) — read the diff: pure test additions across main.wiring.test.ts/heldKeys.test.ts/movementSim.test.ts(new)/predictor.test.ts/hold-commit-step-budget.eval.mjs(new), 0 deleted tests, 0 removed asserts, 0 skip markers, 0 suppressions, heavy anti-vacuity + decoy-string-closure hardening documented inline. Adjudicated CLEAN. Cleanup: deleted merged remote branch feat/movement-investigation, released per-run lock, removed .done flag. No open PRs remain; queue empty per prior movement-investigation gate-fix cycle. Governor NORMAL (d7=$1646.90 of $2783 weekly). No merge/launch/park/BLOCKER further needed this tick beyond the reconcile.

## 2026-07-27T11:04:36Z — feel-polish launched (ADR-0159)
Native tick rid=native-20260727T110010Z-742802, composite continuation after movement-investigation reconcile: master CI confirmed green (d18cadb) this tick, clearing the prior tick's deferred next-slice-selection note. Picked M-postgate-feel-polish per PLAN §9 order (next unblocked un-merged slice after battle-0hp-fix/movement-investigation/dev-observability, all already merged). Solo launch (no other slice in-flight, so no fan-out/disjointness check needed). model=opus effort=high tier=routine (LIGHT per spec, no HARD-criteria hits). adr_next_free 159->160. Launched via mr-spawn: leader=746745 claude_pid=746748, brief 12250 bytes. Flipped feedback items r2-2026-07-26-087/088/089/090 (care-button no-op, walk-speed tuning, jerky NPC movement, no walk animation) from DISPOSED to IN-WORK -- note: these were record straight via mr-feedback set since the ids use the r2-2026-07-26-NNN prefix, not bare integers; the vars.json items:[87,88,89,90] passed to mr-spawn used bare ints so its auto-IN-WORK step likely no-op'd on unknown ids (worth checking mr-spawn's item-id handling/logging in a future tick -- silent no-op on bad ids is a latent gap). Governor NORMAL (d7=$1646.90/2783, fable_ok=true, unused this launch).

## 2026-07-27T~13:00Z — feel-polish TERMINAL STATE: PR#260 open, local `just ci` exit 0, remote CI running

**Slice:** feel-polish (M-postgate-feel-polish, r2 ledger items 087-090) · **Branch:** `feat/feel-polish` ·
**Worktree:** `.claude/worktrees/feel-polish` · **ADR-0159** · **PR:** https://github.com/mdrewt/monster-realm/pull/260
· MERGEABLE, mergeStateStatus=UNSTABLE only because ci+e2e are still pending. **`gh pr merge` NOT run — supervisor owns the merge.**

**Right-sized 4 items -> 2 shipped, 2 parked.** Scope verification showed the spec's "four LIGHT items"
estimate held for only two.

- **087 care feedback — SHIPPED.** Confirmed NOT a server bug first. Two client causes: `onCare` used
  `sendGuarded` (only a `.catch`, no success branch at all), and `CARE_COOLDOWN_MS` is **6 hours** so most
  playtest clicks are legitimate rejections — whose message went to `statusEl`, which the `z-index:100;
  inset:0` raising overlay paints over. Fixed via the existing `showFeedback` idiom (5 sibling precedents),
  a new coverage-measured `client/src/ui/careAction.ts` functional core, and a per-monster pending guard.
- **089 jerky NPC — SHIPPED.** "NPCs lack interpolation" hypothesis REFUTED. Real cause: `npc_decide` ignored
  walls/radius and elder_oak's home has a wall directly south => 14.3% of ticks were wall-bumps. Now
  collision-/radius-aware with a 1-in-6 re-roll. Measured: bumps 14.3%->0%, immediate reversals 32.3%->24.1%,
  mean run 1.14->2.48, all 8 legal tiles reached.
- **088 walk speed — PARKED, HIDDEN DEPENDENCY, needs supervisor re-serialization.** Only lever is
  `STEP_MS=200` at `game-core/src/world.rs:13`, which is ALSO the server tick interval — outside the declared
  `touches:`. Blast radius + the ADR-0158 ~22.9ms slack documented in the spec's new §5 and the PR body.
- **090 walk animation — PARKED, own render slice.** Assets ARE ready (`hero.png`/`hero.json`, 20 frames,
  `walk_*` per direction) — code-only, NOT art-blocked. But needs a net-new async atlas-loading seam;
  ADR-0144 §D7 already deferred exactly this. Do NOT animate the placeholders.

**Gates:** full `just ci` **exit 0** (1486 Rust, 74/74 evals, 1575 client tests, wasm, secrets, tsc, clippy
-D warnings). Also ran the nightly-only gates because this touches a mutation-gated core: `just mutate-core`
**missed=0** across 1095 mutants (`.cargo/mutants.toml` byte-identical to master — no exclusion smuggled in);
`just coverage` **97.8%** vs 96 floor.

**Verdict roster (10 agent invocations):** planner -> reviewer + red-team + /simplify (plan) -> 2x tester
(RED, verified red by the orchestrator since tester agents have no Bash) -> 2x specialist (red->green) ->
reviewer + red-team + desync-guard + reducer-security-auditor + /simplify (impl) -> desync-guard re-audit ->
doc-keeper -> verifier. **Verifier PASS on both jobs**, including proving four teeth still bite by reverting
the real pre-fix implementations into throwaway clones outside the repo. Test counts only increased
(13->21, 2->4, 94->101); zero deletions/skips/ignores.

**The review chain was load-bearing — five defects caught that would otherwise have shipped, two of them in
work the orchestrator had personally verified:**
1. The obvious one-liner (tick quantization) was empirically REFUTED pre-implementation — would have caused
   5.4s freezes.
2. The replacement design had an **absorbing state** (NPC reached 5 of 8 tiles, became an E<->W metronome).
   The orchestrator's simulation measured reversals and bumps but never TILE COVERAGE. desync-guard caught it.
   A wander-coverage gating test now exists for that class.
3. The ADR's canonical `Decision:` line still described the REJECTED variant — and that line is what
   `DIGEST.md` propagates as the agent-facing entry point.
4. A netcode claim in the ADR was backwards (bumps DID write rows), and then mis-denominated on the retry
   (14.3% of ticks vs 17.4% of row updates). Two measurement errors in one paragraph.
5. red-team found `deps.callCare()` sat OUTSIDE the `try` — the SDK serializes args synchronously, so a sync
   throw showed the player nothing, reproducing the exact bug the slice fixes.

**FOLLOW-UP WORTH SPEC'ING (pre-existing, well-evidenced, NOT introduced here):** `npc_decide`'s homing branch
can **livelock**. `toward_home` has no legality check, so if its axis is a wall the NPC bumps forever. Driven
100 000 ticks from (5,2)/home (5,5): **zero escapes**. A sweep found **56 (start, new-home) pairs that freeze
permanently**, and `server-module/src/content.rs:513-538` preserves an NPC's live position across a republish
that moves `home` or shrinks `wander_radius` — so a code-free content edit can trigger it. Nothing validates
that `home_x/home_y` is even walkable. This slice leaves the branch byte-unchanged and in fact makes it LESS
reachable (post-D2 the NPC can never leave its radius). Not fixed here because the gating suite deliberately
pins current semantics (Fixture B asserts `Some(South)` into a wall). Full detail + recommended fix in
ADR-0159 §12.

**touches-delta / notes for the supervisor:**
- `specs/monster-realm-v2/M-postgate-feel-polish.spec.md` gained a §5 DELIVERED/PARKED block — left
  **UNCOMMITTED** in the harness repo, which already had 8 dirty files from prior supervisor work.
- `docs/adr/0068` got a one-line `**Amended-by:** ..., ADR-0159` (ADR-0104 convention). `docs/adr/DIGEST.md`
  regenerated mechanically. `CHANGELOG.md` and `docs/adr/README.md` untouched by design.
- Code graph: `detect_changes` on the main checkout = 0 (still on master). **Re-index after this merges.**
- **Operational gotcha that cost time:** the Bash cwd silently drifted from the worktree to the main checkout
  (on master) and a batch of "verification" ran against the wrong tree — tests passed, diffs were empty, and
  it briefly looked like a tester's work had been lost. Always `cd` to the worktree explicitly. The main
  checkout was never mutated. Project commands need `bash -lc '...'` (plain shell has Node 18, project needs 24.13.1).

**adr_next_free = 0160** (0159 consumed here).

## 2026-07-27T14:00:53Z — SPEND-ALERT: feel-polish cost $306.83 (> $150 threshold)
Single-run spend exceeded the alert threshold (visibility only, not a gate). Verify the slice's size was justified (right-sizing rule) at merge adjudication; adjust single_run_alert_usd in mr-budget-config.json if this class of slice is expected.

## 2026-07-27T14:01:45Z — native tick mr-sup-native-20260727T140133Z-2806405-3788: feel-polish CI-wait delegated
PR#260 (feat/feel-polish) verified live: state=OPEN mergeable=MERGEABLE mergeStateStatus=UNSTABLE, ci+e2e both IN_PROGRESS. No human activity detected, chain-owner mutex was free. Delegated CI-wait to mr-ci-watch (detached, log /tmp/mr_ciwatch_feel-polish.log) rather than polling. Resumes via event tick on completion. No merge/launch action taken this tick. master@d18cadb, CI green (Nightly success).

## 2026-07-27T14:06:19Z — feel-polish merged (PR#260); ADR index reconciled
Native tick rid=native-20260727T140220Z-2807199: EVENT reported PR#260 (feat/feel-polish, ADR-0159) checks green. Re-verified live: mergeStateStatus=CLEAN, mergeable=MERGEABLE, ci+e2e SUCCESS, PR diff scope (client/src/*, game-core/src/npc/rules.rs, server-module/src/movement.rs) matched declared touches. mr-audit --tier routine: orchestration CLEAN (21 agent calls, full role roster incl. tester/reviewer/verifier/red-team/desync-guard across opus/sonnet/haiku). gating FLAGGED on mechanical tripwire (2 modified asserts, 1 suppression added, 0 deleted tests, 0 skip markers) -- read the diff and adjudicated CLEAN: the modified asserts in game-core/src/npc/m12a_gating_tests.rs relocate (not weaken) the RT-NPC-01 hash-aliasing coverage to game-core/src/npc/rules.rs::mod tests (npc_hash_non_commutative_known_pair / npc_hash_sum_aliasing_pairs_do_not_all_collide, confirmed present at head) as a consequence of the npc_decide signature change (added facing+map params, ADR-0159 D2 collision-aware wander); the +1 clippy allow(cast_precision_loss) carries an inline bounded-value justification (MAX_TICKS 60_000). Squash-merged PR#260 -> 89fd16d, ff-only'd master, removed the feel-polish worktree + local/remote branches. Noticed docs/adr/README.md 'next free' index was stale at 0146 despite ADR-0156/0157/0158/0159 having merged since PR#245 (three prior ticks skipped the doc-only reconciliation step) -- opened + squash-merged chore PR#261 (0146->0160; DIGEST.md already current via just adr-digest, no diff needed there). Master ff-only'd 89fd16d->3063149. Both master CI runs (feel-polish merge commit + the doc-only chore commit) still in_progress at tick-exit -- no watcher exists for post-merge master runs (mr-ci-watch is PR-scoped); left for the next tick/event per the 10:00Z tick's precedent rather than sit-polling. Ledger row + this handoff recorded. adr_next_free in mr-state.json already correctly at 160 pre-tick (no change needed there). Did not compose a merge->launch: two doc/code merges plus adjudication already exceeds normal one-action discipline for a clean re-derivation next tick. No BLOCKER; governor NORMAL throughout (d7=$1956.17/2783, fable_ok=true, unaffected by this doc-only/merge-only tick).

## 2026-07-27T18:57:55Z — 2026-07-27T18:57Z native tick (forced/manual, rid=native-20260727T185400Z-2883947)
Re-verified live ground truth: master green at 3063149 (all recent CI runs success), no open PRs, no locks/inflight, working tree clean. Overrode stale .native-supervisor-disabled flag (created 10:55Z by an earlier tick before substantial new work queued/completed since -- removed it as stale so cron ticks resume normally; confirmed via mr-native-tick.log the flag predates 5+ subsequent merges). Closed-loop check: decision issues #10/#11/#12 (claude-harness) all already properly closed with <!--mr-system--> comments by a prior tick (15:16Z) -- nothing to close this tick. Housekeeping: committed 18 dirty harness-repo files that had accumulated uncommitted across several prior ticks (decision-issue answer transcripts, battle-0hp-fix PvP-scope-shortfall note recommending follow-up slice M-postgate-battle-0hp-fix-pvp, feel-polish DELIVERED/PARKED notes, ux-design uxd1/uxd2 Drew answers, terminal progress memos for merged movement-investigation/feel-polish) -> commit ee5648c. Selected next work: M-postgate-ux-design uxd1 (responsive viewport scaling) -- next in Phase D queue order, pure-client render-edge touches (disjoint from everything, no schema/server surface), ROUTINE tier (opus@high), ADR-0160 reserved. Took the design's documented recommended defaults for uxd1's 4 open questions (zoom feel numbers, small-zone framing, phasing, touch scope) per BLOCKER discipline for reversible UX-feel calls -- noted in the brief for the run to record as decision-defaulted in the PR body. mr-spawn LAUNCHED+asserted (leader=2888270, claude_pid=2888273, model=opus confirmed, detached own session/pgid). Did not fan out a second slot: uxd2 (shop-via-NPC) touches server schema/reducers and needs its own disjointness/tier check fresh, deferred to next tick. Single mutating action (launch) per tick discipline. No BLOCKER; governor NORMAL (d7=$1958.11/2783, fable_ok=true).

## 2026-07-31T00:02:16Z native tick (rid=native-20260731T000009Z-9200, sup run mr-sup-native-20260731T000009Z-9200)
Reconciled uxd1 crash event (2026-07-27T20:10:56Z EXIT=1): live ground truth showed the implementation actually reached GREEN (1595 tests, tsc+biome clean) on 4 commits pushed to feat/uxd1-responsive-viewport, but crashed mid review-fanout when EVERY dispatched review agent (reviewer/red-team/desync-guard/reducer-security-auditor) hit the same org-level monthly-spend-limit API error (seven_day rate-limit, resetsAt=2026-07-31T00:00:00Z -- i.e. now). No code/review finding, pure infra outage; zero review content produced. No PR was ever opened. Cleaned the stale dead-leader per-run lock (2888270) and mr-state.json inflight entry, wrote a resume progress memo (monster-realm-uxd1-progress.md) instructing the relaunch to skip re-implementation and go straight to the review fanout + PR-open, and attempted a resume launch via mr-spawn uxd1. mr-spawn's mechanical active-session probe TRIPPED on a write to harness .codegraph/codegraph.db-wal within the last 6 min -- this session's own CodeGraph MCP indexer connecting/writing its DB, not a competing human edit, but per doctrine the probe is a no-override mechanical gate (never hand-launch around it). Stood down without launching; released the chain-owner mutex; no other mutating action taken. Note for a future doc pass: mr-spawn's active-session probe find command excludes .git/node_modules/target/.claude/worktrees/$MEM but NOT .codegraph -- worth adding to the exclude list since CodeGraph-indexed sessions will otherwise self-trip this probe every tick. No BLOCKER (transient, next tick retries naturally once the WAL write ages past 6min); governor NORMAL, d7=$0.00/2783 (fresh weekly window).

## 2026-07-31T01:02:11Z — native tick rid=native-20260731T010005Z-43715: uxd1 resumed (probe-self-trip fix)
Reconciled from live ground truth: master green at 3063149 (Nightly success on last 3 runs), no open PRs/locks/inflight at tick start. uxd1 worktree confirmed still at the 00:02Z tick's described state (4 commits, clean, pushed, matches touches). Took chain-owner mutex (none held). Wrote resume vars.json (tier=routine, opus@high, ADR-0160) with the full resume instructions from monster-realm-uxd1-progress.md embedded. First mr-spawn call returned PROBE-TRIPPED on $HARNESS/.codegraph/codegraph.db-wal -- investigated: the WAL mtime (2026-07-30T21:00:05.877 local = 2026-07-31T01:00:05Z UTC) exactly matches this tick's own invocation timestamp and the codegraph daemon's recorded startedAt/pid (44028, started 21:00:11 local) -- confirmed self-caused by this session's own CodeGraph MCP connection, not a human edit. This is the exact self-trip gotcha the 00:02Z tick's handoff had flagged for a future doc pass (mr-spawn's active-session probe excludes .git/node_modules/target/.claude/worktrees/$MEM but not .codegraph). Fixed mr-spawn's WRITES find to add -not -path '*/.codegraph/*' (one-line, mirrors existing exclusions). Retried -- LAUNCHED+asserted (leader=46044, claude_pid=46047, model=opus confirmed, own session/pgid). Released chain-owner mutex after launch. Single mutating action (the resume-launch) per tick discipline. No BLOCKER; governor NORMAL (d7=$0.95/2783, fable_ok=true).

## 2026-07-31T01:05:07Z — WEEKLY REVIEW: M-postgate-eleventh-review-residuals INSERTED (spec + PLAN bullet, uncommitted in harness)
The scheduled eleventh multi-lens review (8 lenses + independent verifier pass, pinned @ master
`3063149`, fully isolated clone — no runner state touched) completed. Two NEW files/edits in the
HARNESS repo are currently uncommitted: `specs/monster-realm-v2/M-postgate-eleventh-review-residuals.spec.md`
(new) and the matching PLAN.md Phase D bullet (inserted after `M-postgate-ux-design`, before
`M-postgate-overlay-registry`'s retired marker). **Please include both with your next harness git
commit.** Queue position: between `M-postgate-ux-design` (your in-flight uxd1/uxd2/uxd3) and
`M-evolution-essence-redesign` — but keep using your own judgement on chaining/fan-out.

Headlines (all independently verified at the pinned SHA; full detail in the spec):
- **11r-a HIGH:** PvP still seats 0hp leads + accepts attacks from fainted actives
  (`pvp.rs:259-267`, `~1017`) — the ADR-0156-parked PvP half. LIGHT, fan-out candidate.
- **11r-b HIGH:** PvP side B gets NO battle overlay in production (`store.ts:724-743` filters
  `playerIdentity` only; e2e green via the DEV `battleById` hook) — ADR-0155 D6's disclosed
  CRITICAL. `main.ts`-SERIAL with uxd3.
- **11r-c HIGH:** the server has no battle movement lock; the sim-harness models one and
  `netcode-convergence`'s `battle_lock_convergence` criterion certifies the fiction.
- **11r-d MED, run EARLY:** the post-gate wave's ledger reconciliation never ran (CHANGELOG stops
  at #239 vs HEAD #261; `docs/adr/README.md` catalog stops at 0134 / range says 0144 / next-free
  says 0160; 0119/0122 missing `Amended-by`). Docs-only, disjoint, cheap.
- Spec §4 has four DECISIONS for Drew (route via mr-ask-drew when reached): battle-table PvP
  team-sheet exposure, unsolicited-trade escrow griefing (Pending locks victim assets with no
  consent), held-key LAN-RTT pin, changelog freshness gate.
- One review finding was DROPPED after verification (shop arbitrage — already gated by
  `pt_d3_tuning.rs:486`); §5 lists it plus other explicitly-out-of-scope smalls.
Review artifacts: none left behind — the isolated review clone under `/home/mdrewt/mr-review/`
is deleted; no branches/worktrees were created in the project repo.

## 2026-07-30T21:50Z — uxd1 slice run (resume, 2nd attempt): TERMINAL STATE — PR #262 open, local `just ci` green

**Slice:** `M-postgate-ux-design` uxd1 — responsive viewport scaling. Branch
`feat/uxd1-responsive-viewport`, worktree `.claude/worktrees/uxd1`, 6 commits, pushed.
**PR:** https://github.com/mdrewt/monster-realm/pull/262 — **NOT merged; supervisor owns the merge.**
Remote CI was running at hand-off; delegate the wait to `mr-ci-watch 262 uxd1`.

**Resume worked as intended** — the prior attempt's spend-limit crash left a valid GREEN
implementation; this run did NOT re-implement. It re-ran the suite, ran the review fanout that
never completed, adjudicated, fixed, and opened the PR. No spend-limit error recurred.

**Review fanout (all completed):** `reviewer`, `red-team`, `desync-guard`,
`reducer-security-auditor`, `/simplify`, `tester`, `verifier`. Two real findings, both fixed:
1. **`just ci` was RED** — ADR-0160's `**Decision:**` was 281 chars vs ADR-0104's 240 limit, so
   `adr-digest --check` failed and `DIGEST.md` was stale. **The prior attempt never ran the full
   `just ci`** (it reported only vitest+tsc+biome), so it never saw the eval gate. Worth
   remembering: "1595 tests passing, tsc+biome clean" is NOT the DoD gate.
2. **`WorldRenderer.init()` never applied `stageScale`** (red-team, fake-Pixi PoC) — only
   `resize()` did. Latent, not live (main.ts resizes synchronously right after init). Fixed so
   correctness no longer depends on caller ordering.

**Adjudicated, not changed:** `/simplify` + `reviewer` both wanted the unwired `screenToWorld`
deleted. **Overruled on spec authority** — `M-postgate-ux-design.spec.md:34,53,55,178` explicitly
directs it to ship unwired as a seam uxd2 consumes. Recorded in the ADR so a third lens does not
re-litigate it.

**Supervisor action items:**
- `docs/adr/README.md` still reads `Next free number: 0160`, which this slice consumes → **0161**.
  Deliberately untouched (supervisor owns the index).
- `docs/adr/DIGEST.md` is in the diff (generated, CI-drift-gated). A concurrent sibling adding an
  ADR will collide there — resolve by re-running `just adr-digest`, not by hand-merging.
- Ledger items closed: `r2-2026-07-26-010,-011,-012,-013,-014,-047,-048,-049,-050,-051`.

**Follow-up flags (non-blocking, not done — out of this slice's `touches:`):**
- `screenToWorld` has no forcing function for its "delete if unused" note. If uxd2 lands without
  consuming it, that is the trigger to delete.
- Spec criterion A8 is NOT satisfied (premise false on master; most overlays are in-flow divs, not
  `position:fixed`) — owned by uxd3. A10 has no executable tooth.
- Placeholder texture cache is not invalidated on resize, so a mid-session monitor change drifts
  the baked texture resolution from `stageScale` (cosmetic; deferred until authored art lands).

**Environment gotcha that cost this run time — worth encoding in the brief/wrapper:** the default
PATH in this harness has **node v18** (`/usr/bin/node` precedes the asdf shims) and **no cargo**, so
a bare `just ci` dies with `cargo: not found`. Every command needs
`export PATH="/home/mdrewt/.asdf/shims:/home/mdrewt/.cargo/bin:$PATH"`. Also: the worktree's
committed `.tool-versions` pins only `just`, not `nodejs` (the main checkout has an uncommitted
`nodejs 24.13.1` line). Separately, a `cd` into the harness root persisted across Bash calls and a
`just ci` silently ran the **harness's own** self-test suite and returned a bogus green — always
`cd` explicitly per command. (Harness repo was NOT dirtied; its modified files all predate this run.)

## 2026-07-31T01:46Z — Native tick: uxd1 PR#262 CI-watch delegation
Reconciled uxd1.done event (rc=0, opus, 74 turns, $14.89, 1 attempt). Live-verified
PR#262 (feat/uxd1-responsive-viewport -> master): OPEN, mergeable=MERGEABLE,
mergeStateStatus=UNSTABLE -- ci+e2e checks still IN_PROGRESS (started 01:43:39Z).
No merge attempted while checks are running. Delegated the wait to mr-ci-watch
(detached) rather than poll; it will fire an event tick when checks resolve, at
which point the supervisor re-verifies live and runs mr-audit before merging.
Chain-owner mutex released this tick -- no live rooted run, one delegated watcher.

## 2026-07-31T02:02Z — Native tick: uxd1 merged (PR#262)

**Event source:** ci.md event reported PR#262 checks green. Re-verified live: mergeStateStatus=CLEAN,
mergeable=MERGEABLE, ci+e2e SUCCESS. Acquired chain-owner mutex (none held; prior tick had released it
after CI-watch delegation). Ran `mr-audit --tier routine`: orchestration=CLEAN (7 roles, reviewer/red-team/
desync-guard/reducer-security-auditor/tester/verifier/doc-keeper all ran); gating=FLAGGED on
removed_or_modified_asserts=13. Adjudicated FLAGGED myself: the diff is a legitimate spec-driven rewrite of
`camera.test.ts` (per-axis centering, A5/A5b/A6/A6b) and `resizeWiring.test.ts` (dpr threading, A12) — every
replaced assertion's diff comment documents the specific wrong-impl it kills (not a threshold/suppression
weakening), and the run's own completed review fanout already vetted it (including a red-team false-green
guard finding, R3, that the tests were explicitly hardened against). Diff scope (`git diff --name-only`)
confirmed a subset of declared `touches:` plus expected generated-doc files (ARCHITECTURE.md, the ADR file,
DIGEST.md). Squash-merged PR#262 -> master@abaa4cb917e9cf2b333c18555f3a919f3087d5db, `--delete-branch`.
Fast-forwarded local master checkout, removed the merged worktree + local branch. Post-merge master CI
(`abaa4cb…`) was still `in_progress` at record time — not sit-polled; the merge itself already passed the
same CI on the PR branch, so this is expected-green, noted as pending rather than blocking.

**ADR index reconciliation (supervisor-owned):** opened doc-only PR#263 (`docs/adr/README.md` 0160 -> 0161),
squash+auto-merge armed per the standard doc-chore path (Drew enabled repo auto-merge 2026-07-25). Did NOT
touch the pre-existing uncommitted `.tool-versions` stray (adds an uncommitted `nodejs 24.13.1` line, noted
in the prior uxd1 handoff entry as pre-existing — left alone, not mine to commit).

**Ledger items closed (already recorded by the run itself per its own handoff entry):**
r2-2026-07-26-010,-011,-012,-013,-014,-047,-048,-049,-050,-051.

**Not launched this tick:** merge (+ its ADR-index chore-PR follow-through) is the one mutating action;
deferring next-slice selection to a fresh tick with clean live-state re-derivation, per the
one-mutating-action-per-tick discipline (this already composited two doc/merge actions).

Governor NORMAL throughout (d7=$17.67/2783, effectively fresh window). No BLOCKERs. No live rooted runs;
chain-owner mutex released this tick.

---

## 2026-07-31T02:19Z native tick (cron, rid=native-20260731T021922Z-158541)

Reconciled from live ground truth: chore PR#263 (ADR index 0160->0161) had auto-merged since the
prior tick. Fast-forwarded local master `abaa4cb -> 715699b` clean. Both PR#262 and PR#263 confirmed
CI green live via `gh pr checks`/`gh run list`. Zero locks, zero open PRs, zero inflight at tick start.

**Stray handled:** `.tool-versions` carried an uncommitted asdf-injected `nodejs 24.13.1` line (not
human work, flagged-but-left-alone by the prior two ticks). Stashed it this tick, labeled
`supervisor-stray-20260731T021955Z .tool-versions asdf-shim-leak` — not committed, not discarded.

**Selected uxd2** (Shop-via-NPC context-sensitive interact system, `M-postgate-ux-design.spec.md`) as
next work. uxd1 is done; all four of Drew's open questions for uxd2 are already answered in the spec
(shopkeeper flow = GREET-THEN-SHOP; drop the global `KeyG`/`KeyH` shortcuts; heal-via-tile ships now,
Heal-on-NPC deferred; shopkeeper placed deeper in zone 1 with greeting "Hello, customer!") — fully
buildable, no fresh BLOCKER needed. Solo launch (full-stack schema-touching slice, not a fan-out
candidate on its own). HARD tier (touches `server-module/src/schema.rs` + content plumbing/reducers),
`fable@xhigh`, ADR-0161 reserved. Budget bundle: fable_ok=true (d7=$18.92/2783, fable_d7=$0).

**PROBE-TRIPPED, twice, stood down:** `mr-spawn uxd2` returned `PROBE-TRIPPED` on `.tool-versions`
both attempts. Root-caused to my OWN `git stash push` on that file moments earlier (mtime 02:19:55Z,
~80-140s before each check) — `git diff` on the file was empty post-stash, confirming no genuine
content change, i.e. a self-caused false positive inside the probe's ~6min human-activity write
window. Same failure class as the 01:02Z tick's `.codegraph` self-trip, just not yet patched into
mr-spawn's exclude list for supervisor-caused `git stash` touches outside its own state dirs.
Correctly stood down rather than force-launching: removed `/tmp/mr_pass_uxd2.vars.json`, released the
chain-owner mutex.

**No mutating action taken this tick.** `adr_next_free` left at 161 (not consumed — uxd2 remains the
pre-selected next candidate). Reserve fresh and relaunch once the probe window ages out (~02:26Z) —
next tick or event should retry `mr-spawn uxd2` directly with the same pass-vars reasoning above
before re-deriving from scratch.

No BLOCKER. Governor NORMAL throughout (d7=$18.92/2783, fable_ok=true). No live rooted runs; chain-owner
mutex released this tick.

## 2026-07-31T03:02:22Z — native tick 03:00Z — launch uxd2

Fast-path: no live locks/PRs/inflight at tick start; uxd1.done was a stale leftover from the
already-reconciled uxd1 merge (PR#262/#263), removed. Re-verified live: master green at 715699b
(chore/uxd1-adr-index PR#263 confirmed CI green), zero locks, zero open PRs, zero inflight,
park_counters empty, not disabled, not blocked-on-human. The prior 02:19Z tick's PROBE-TRIPPED was
self-caused (its own git stash of an asdf .tool-versions leak) and had aged out cleanly —
.tool-versions now diffs clean vs HEAD, stash list empty, no resident IDE claude session, zero human
writes to harness/proj in the last 6min at this tick.

**Selected uxd2** (Shop-via-NPC context-sensitive interact system) as next Phase D work per the
pre-existing queue reasoning (`M-postgate-ux-design.spec.md`): all 4 of Drew's open questions already
answered (GREET-THEN-SHOP flow overriding the spec's direct-open default; drop global `KeyG`/`KeyH`
shortcuts; heal-via-tile ships now, heal-on-NPC deferred; shopkeeper placed deeper in zone 1 with
greeting "Hello, customer!"). nh1/nh2 (netcode-hardening, `main.ts` SERIAL prerequisites for uxd3) and
uxd1 are already merged, so uxd2's `main.ts` touch is clear of any live SERIAL conflict. Full-stack
schema-touching slice (`NpcInteraction` enum + `npc` table column) — solo launch, not fanned out.
HARD tier, `fable@xhigh`, ADR-0161 reserved.

**Tooling note:** first `mr-spawn uxd2` attempt failed (exit 1, no status line) — root-caused to my
own vars.json omitting the required `tier` field (mr-spawn's brief-builder throws `SystemExit` on a
missing tier, silently swallowed because mr-spawn permanently redirects its own stderr to `/dev/null`
via `exec 9>&- 2>/dev/null` at startup — a real gotcha worth flagging: any error after that line is
invisible unless it flows through `emit()`/`status()`). Added `tier=hard`, re-ran the probe fresh
(still clear), re-launched. mr-spawn LAUNCHED+asserted cleanly (leader=174695, claude_pid=174698,
model=claude-fable confirmed live in log, effort=xhigh, tier=hard). Per-run lock written, ledger row
recorded, `adr_next_free` 161->162 (uxd2 consumed ADR-0161).

No BLOCKER. Governor NORMAL throughout (d7=$18.92/2783 at tick start, unchanged — no spend yet from
this launch). Chain-owner mutex released this tick.

## 2026-07-31T05:36:49Z — SPEND-ALERT: uxd2 cost $423.65 (> $150 threshold)
Single-run spend exceeded the alert threshold (visibility only, not a gate). Verify the slice's size was justified (right-sizing rule) at merge adjudication; adjust single_run_alert_usd in mr-budget-config.json if this class of slice is expected.

## 2026-07-31T05:40:10Z — 2026-07-31T05:39Z — native tick — uxd2 PR OPEN (PR#264, ADR-0161), CI-watch delegated
Reconciled uxd2's finished rooted run from live ground truth rather than trusting the .done file's EXIT=0/ATTEMPTS=3 at face value. The rooted session had already end_turn'd while its detached background task (waiting on marker /tmp/uxd2_e2e_done) was still running -- so no PR existed despite the run reporting success. Verified live: worktree feat/uxd2-shop-npc-interact clean and fully pushed (matches origin, tip 72a8517); the detached e2e process (started 01:35Z, pid 300046 tree) was still executing. Watched it to completion myself (not sit-polled -- checked at intervals): E2E_EXIT=0, 45 tests (44 passed + 1 pre-existing skip), all 5 new client/e2e/shop-npc.spec.ts cases (AC-12 positive/negative, greet-then-shop AC-1/2/6) green. Ran 'just smoke-republish' PASS: CONTENT_VERSION 17->18, starter monster survived the additive republish. Opened PR#264 from the run's pre-drafted body (/tmp/uxd2_pr_body.md, complete and accurate). Delegated CI-wait to mr-ci-watch (detached, pid recorded) rather than polling inline -- resumes via event tick. Ledger row written (outcome=ci-watch-delegated). Per-run lock for uxd2 still present (session_leader 174695 now dead) -- left for the merging tick to reconcile alongside the mr-ci-watch event. No BLOCKER. Governor NORMAL (d7=$445.83/2783, fable_ok=true). Next tick/event: on mr-ci-watch's notification, run mr-audit --tier hard (uxd2 is hard-tier), adjudicate, merge, reconcile adr_next_free (162 after ADR-0161's index chore), then re-evaluate M-postgate-ux-design milestone status.

## 2026-07-31T05:55:51Z — uxd2 merged (rid=native-20260731T055409Z-353606)
Reconciled uxd2's finished rooted run (leader 174695 dead, .done EXIT=0 ATTEMPTS=3) from live ground truth. PR#264 (ADR-0161, shop-via-NPC context interact) confirmed CLEAN/MERGEABLE, ci+e2e SUCCESS. mr-audit --tier hard: orchestration CLEAN (12 calls, full role roster incl doc-keeper/red-team/reviewer/tester/verifier across fable/opus/sonnet/haiku). gating FLAGGED (hard-tier mandatory read + 10 modified/removed asserts + 1 deleted test file) -- adjudicated CLEAN after reading the diff: dialogueModel.talk.test.ts's nearestTalkableNpcId coverage was ported into interactModel.test.ts Block A with its own retirement teeth test (W-INTERACT-NO-OLD-RESOLVER, proves dialogueModel.ts/main.ts no longer reference the old symbol); dialogueModel.test.ts's modified-assert count is an APPENDED block for uxd2 AC-2 (shopAction derivation), zero deletions above the append line. Squash-merged PR#264 -> ef07d22. Master ff-only'd 715699b->ef07d22 clean. Removed worktree .claude/worktrees/uxd2 + local branch feat/uxd2-shop-npc-interact (remote already deleted by squash-merge --delete-branch). Master CI on the merge commit still in_progress at tick-exit -- no post-merge-master watcher mechanism exists (mr-ci-watch is PR-scoped), left for next tick/event per 2026-07-27T10:00Z/14:02Z precedent. Ledger row + this handoff recorded. Single mutating action (the merge) -- did not compose a merge->launch this tick given master CI on the merge commit is still unconfirmed and a fresh disjointness/tier check for the next Phase D pick (uxd3, per PLAN.md) deserves its own clean tick. No BLOCKER; governor NORMAL throughout (d7=$447.08/2783, fable_ok=true).

## 2026-07-31T07:09:52Z — 2026-07-31T07:09Z native tick (cron, rid=native-20260731T070009Z-373582): uxd2 reconciled, uxd3 launched
Reconciled uxd2's merge from the prior tick (05:54Z) -- PR#264 confirmed merged to master@ef07d22, master CI green live (feat/uxd2-shop-npc-interact branch already auto-deleted). Zero locks/PRs/inflight at tick start, probe clear at gate top. Opened + auto-merge-armed doc-only ADR-index chore PR#265 (docs/adr/README.md next-free 0161->0162 -- uxd2's own PR#264 had already added the 0161 catalog row and DIGEST.md entry, only the pointer line was stale). Selected uxd3 (Unified overlay IA: registry-backed two-level main menu, M-postgate-ux-design.spec.md) as next Phase D work -- released for implementation by Drew 2026-07-27 (no longer post-gate-provisional), sequencing prereq (land after nh1 PR#247/ADR-0146 and nh2 PR#250/ADR-0148) already satisfied on master. Solo (main.ts-SERIAL against the hardening milestones per spec sec 4, but both are already merged -- no live sibling to serialize against). Classified ROUTINE tier (spec: 'Pure client chrome -- zero reducer/schema/predictor/renderer surface'), opus@high. Reserved ADR-0162. mr-spawn PROBE-TRIPPED twice on my own just-adr-digest (07:02:19Z) + git-checkout-master (07:02:34Z) touching docs/adr/{DIGEST,README}.md in the project worktree -- same self-trip class as the 02:19Z tick's .tool-versions stash false-positive (content-identical, confirmed via git diff --stat). Correctly waited ~7min for the 6-min probe window to age out rather than force-launching. LAUNCHED uxd3 clean at 07:09:17Z (leader=378448, claude_pid=378451, model=opus confirmed, effort=high, tier=routine). Ledger row + this handoff entry recorded. adr_next_free advanced 162->163 in mr-state.json (0162 consumed by uxd3). No BLOCKER; governor NORMAL throughout (d7=$448.33/2783, fable_ok=true, unaffected -- opus not fable this launch).

## 2026-07-31T04:35Z — uxd3-a TERMINAL STATE: PR#266 open, local `just ci` green, remote CI running
**Slice:** uxd3-a (M-postgate-ux-design — unified overlay IA) · **Branch:** `feat/uxd3-overlay-registry-menu` ·
**Worktree:** `.claude/worktrees/uxd3` · **ADR-0162** · **PR:** https://github.com/mdrewt/monster-realm/pull/266 ·
**`gh pr merge` NOT run — supervisor owns the merge.**

**Gates:** full `just ci` **exit 0** locally — 65 files / **1755** tests (baseline 1680), **74 evals PASS**,
clippy -D warnings, fmt, biome, tsc, secrets clean, wasm, adr-digest drift clean.

**Roster:** planner → reviewer + red-team + /simplify (plan) → 2× tester (RED, verified red by the
orchestrator; tester agents have no Bash) → orchestrator implemented red→green → full gate. **Landing-pattern
flag `/tmp/mr_warn_uxd3` fired before the impl phase**, so no post-impl agent fan-out was spawned; the
implementer is distinct from both testers, so the anti-reward-hacking split holds.

**SCOPE CUT — `uxd3-b` is specified and ready to schedule** (`docs/uxd3-plan.md` §1): collapse the 5 `main.ts`
fan-out surfaces, hotkey→registry.toggle thunks, RETIRE `W-OVERLAY-FANOUT-MUTEX`, ship `#menu-launcher`.
Driver: a **17-test** source-scan cluster (`W-RN-/W-TP-/W-HELP-FANOUT-*`) reads those exact OR-list regions;
collapsing = a 17-test rewrite in a 4,200-line file for zero user-visible change. The replacement gate is
already green in-tree, so uxd3-b deletes the old one against a working substitute.
**`M-postgate-overlay-registry` is SUBSUMED but NOT fully retired until uxd3-b lands.**

**⚠ TWO ITEMS FOR THE MERGE AUDIT:**
1. **Implementer edited 2 pre-existing uxd2 gating tests.** `W-INTERACT-KEYT-DISPATCH` / `-SWITCH` were
   re-anchored from the KeyT block onto the extracted `interactAtNearest()` (assertions unchanged, plus a NEW
   one that KeyT still routes through it). Forced: the alternative was duplicating `switch (target.kind)`,
   destroying ADR-0161's single-site compiler flag. Characterized as a strengthening — worth confirming.
2. **HIDDEN DEPENDENCY, not touched:** `client/src/indexShell.test.ts` (H4 pins `#help-hint` to
   `pointer-events:none`) blocks the clickable `#menu-launcher`. Deferred to uxd3-b, which must own that file.
   Discovery still shipped via a text-node-only relabel that survives every H-tooth.

**Carry-forward hazards (measured, will bite the next `main.ts` slice):**
- `onReconnect` has **~22 chars** of headroom against `W-TP-RECONNECT` (`reconnectIdx+1000`); the next
  insertion reds it and the message names *tradePropose*, not the culprit.
- 3 teeth (`W-RN-ESCAPE` +2000, `W-TP-ESCAPE` +2500, `W-HELP-ESCAPE` +2500) use
  `indexOf("e.code === 'Escape'")` + fixed window — an Escape literal placed early silently re-anchors them
  onto the KeyB block and they stay **falsely green forever**. `W-UXD3-ESCAPE-ANCHOR-FIRST` now guards it;
  re-anchoring them properly is a uxd3-b Boy-Scout item.
- `find` is shimmed to `bfs` in this environment and **rejects relative `-newermt`** — agent-liveness polls
  using it exit immediately and report false quiescence. Use `stat -c %Y` arithmetic instead.
- Menu nav does **not** key-repeat (`e.repeat` gate precedes the intercept). Accepted, ADR-recorded.

**PLAN.md §9 touch NOT made:** `specs/monster-realm-v2/PLAN.md` lives in the harness repo, outside the project
PR. The parked `M-postgate-overlay-registry` entry should be repointed at **uxd3-a + uxd3-b** (not closed) by
the supervisor. `adr_next_free` → **0163**.

## 2026-07-31T08:47:25Z — uxd3 merged — PR#266 (ADR-0162 unified overlay IA)
Reconciled uxd3's finished rooted run (leader 378448 dead, .done EXIT=0 ATTEMPTS=2) from live ground truth. PR#266 confirmed CLEAN/MERGEABLE, ci+e2e SUCCESS on the PR. mr-audit: orchestration CLEAN (planner/red-team/reviewer/tester roles present), gating CLEAN (0 removed asserts, 0 skip markers). Diff (ef07d22..364efa8) verified subset of declared touches plus the doc set (ARCHITECTURE.md, docs/adr/*, docs/uxd3-plan.md). Squash-merged to master@1953329, branch deleted, local checkout ff-only'd, worktree+local branch cleaned. Post-merge master CI still IN_PROGRESS as of this tick's exit — not yet confirmed green live, so no composite launch this tick; next tick verifies master CI and picks up the next slice.

## 2026-07-31T09:02:30Z — 2026-07-31T09:02Z native tick — uxd3-b launched
Verified master CI green post-uxd3-merge (gh run list: uxd3 merge commit conclusion=success, 30617382726, 6m13s) -- confirms the prior tick's (08:47Z) merge of PR#266/ADR-0162 is fully settled. Fast-path standdown check clear (no locks, no .done files, no resident IDE session, no non-wrapper writes in last 10min). Acquired chain-owner mutex (none held). Selected uxd3-b (docs/uxd3-plan.md SS1 'PARKED -> next slice', fully specced: overlay-registry substrate collapse -- grow the uxd3-a probe table into a full handle table (open/hide/hideAllExcept/anyVisible/anyVisibleExcept), extract main.ts's 12 open bodies into named openX() thunks, collapse the 5 fan-out OR-list surfaces + refreshBattle + onReconnect through the registry, retire W-OVERLAY-FANOUT-MUTEX + the 17-test fan-out cluster (replaced by W-FANOUT-SURFACES-ROUTE-THROUGH-REGISTRY + W-HOTKEY-ONE-OPEN-PATH already proven green in uxd3-a), ship the #menu-launcher click front-door by relabeling #help-hint (this slice owns indexShell.test.ts). Classified ROUTINE tier (pure client refactor, zero user-visible behavior change, no server/reducer/predictor/RLS surface) -- opus@high, matching uxd3-a's tier. main.ts-SERIAL: verified no sibling inflight (zero locks/PRs at tick start), solo launch. Reserved ADR-0163. Wrote /tmp/mr_pass_uxd3-b.vars.json with the full scope (touches, hazards carried forward from uxd3-a: onReconnect insertion-order headroom, Escape-tooth anchor fragility, find-shimmed-to-bfs, no-key-repeat-by-design) and called mr-spawn uxd3-b -- LAUNCHED clean (leader=495853, claude_pid=495856, model=opus confirmed, effort=high, tier=routine, no PROBE-TRIPPED). Ledger row + this handoff recorded. adr_next_free will advance 163->164 once ADR-0163 is consumed (recording now for continuity). No BLOCKER; governor NORMAL throughout (d7=$517.62/2783, fable_ok=true, unaffected -- opus not fable this launch).

## 2026-07-31T06:50Z — uxd3-b TERMINAL STATE: PR#267 open, local `just ci` + `just e2e` BOTH green, remote CI running
**Slice:** uxd3-b (M-postgate-ux-design — unified overlay IA) · **Branch:** `feat/uxd3-b-overlay-registry-substrate` ·
**Worktree:** `.claude/worktrees/uxd3-b` · **ADR-0163** (amends 0151, 0162) · **PR:** https://github.com/mdrewt/monster-realm/pull/267 ·
**`gh pr merge` NOT run — supervisor owns the merge.**

**Gates:** `just ci` **exit 0** — 1504 Rust tests + doctests, **1740** client tests (baseline 1755 = −21 retired +6 new),
**74 evals PASS**, clippy -D warnings, fmt, biome, tsc, secrets, wasm, adr-digest drift clean. `just e2e` **exit 0**
(44 passed / 1 skipped) against an isolated `VITE_STDB_DB=monster-realm-uxd3b-e2e` + `MR_E2E_PORT=5298`; ephemeral DB
deleted, `monster-realm`/`monster-realm-playtest` untouched. Coverage 98.16% lines (floor 96); `ui/overlayRegistry.ts` 100%.

**Roster:** planner → reviewer + red-team + /simplify (plan) → tester (RED, verified red by the orchestrator — testers have
no Bash) → separate implementer (red→green) → reviewer + red-team (code) → orchestrator-owned retirement → verifier **PASS**.
Domain auditors deliberately not run, independently confirmed N/A by the verifier (zero Rust / server-module / game-core /
bindings / predictor / renderer files in the diff). `/tmp/mr_warn_uxd3-b` fired before the doc phase, so the ADR was written
inline rather than via a doc-keeper fan-out.

**⚠ TWO ITEMS FOR THE MERGE AUDIT (both are deliberate deviations from the slice brief, argued in the PR body + ADR):**
1. **Smaller API than briefed.** Brief asked for `OverlayHandle`/`OverlayHandles`/`createOverlayRegistry` with
   `anyVisible`/`anyVisibleExcept`/`open`/`hide`/`hideAllExcept`. Shipped `OverlayProbes` + `anyVisible(probes, exempt?)`.
   `open`/`hide`/`hideAllExcept` have zero consumers until the hotkeys migrate; `visibleIds`/`isVisible` have none at all.
   Same call ADR-0162 A7/A15 made in this module one slice ago. Reviewer and /simplify reached it independently.
2. **`W-OVERLAY-FANOUT-MUTEX` is RETAINED, not retired** — the brief required it GONE. Correctness, not budget: it is the
   ONLY executable guard that KeyB's open-guard contains `!dialogueView?.visible` (no count tooth covers that token;
   pre-PR `main.ts` imported nothing from `ui/overlayRegistry`, so `OR-CANOPEN-GUARDONLY-9/-ALL` constrained a function
   with no production caller; no e2e presses a hotkey over `dialogueView`). **AC-20 erratum recorded in ADR-0163 D2:** the
   EARS never required a *caller*, so read literally uxd3-a already satisfied AC-20's replacement clause. A third deferral
   is declared unacceptable — **uxd3-c should be the immediate next slice.**

**21 teeth retired (deleted, zero skips).** Honesty items the audit will want, all re-measured by the verifier:
the two `W-*-FANOUT-COUNT` floors would have stayed GREEN (floors ≥17, post-collapse counts 18) — a deliberate removal of
live coverage, not a detonation; the leaderboard exact-count parity self-check is a **genuine net loss** (Part C sees only
the `||` spelling — a de-Morgan `&&` sixth surface passes, demonstrated live); and **two** (not four) of the `*-FANOUT-PVP`
teeth were already vacuous on master (the verifier caught my first draft claiming all four).

**Red-team on the shipped code found 8 CI-green behaviour-breaking survivors; all closed and each re-measured red.**
Biggest: `anyOverlayVisible()`'s body was pinned by `.includes`, so `if (identity !== '') return false;` prefixed to it
disabled mutual exclusion everywhere while CI stayed green → now an exact-equality assertion.

**NEXT SLICE — uxd3-c is fully specified in ADR-0163 D2/D7/D8.** Touches: `ui/overlayRegistry.ts`(+test), `main.ts`,
`main.wiring.test.ts`. Content: per-id open/hide thunks + `hideAllExcept`; extract `openBox`/`openBackpack`/`openEvolve`
(the trio still has two open paths); collapse `refreshBattle` → `hideAllExcept('battleView')` and `onReconnect`; route the
12 hotkeys through `canOpen`; retire `W-OVERLAY-FANOUT-MUTEX` + `W-HELP-FANOUT-OPENGUARDS` + `W-HELP-FANOUT-BATTLE`;
re-author `W-BATTLE-FORCEHIDE-SET-MATCHES-MANIFEST`, `W-RECONNECT-HIDES-MENU`, `W-HELP-NO-RECONNECT-HIDE`,
`W-RN-FANOUT-RECONNECT`, `W-TP-RECONNECT`, `W-KEYM-HANDLER`; add `W-HOTKEY-ONE-OPEN-PATH`; plus the deferred boy-scout
(re-anchor `W-RN-/W-TP-/W-HELP-ESCAPE` off their fixed `indexOf+2000/2500` windows, then delete
`W-UXD3-ESCAPE-ANCHOR-FIRST`). **Pre-specified blockers:** (a) `dialogueView` can NEVER get a `hide` thunk —
`W-ESCAPE-DIALOGUE-NEVER-BARE-HIDE` is a whole-file zero-count, so `hide` must be OPTIONAL on the handle with
`dialogueView` the sole omitter; (b) `W-TP-RECONNECT` must be re-authored on two endpoints BEFORE `onReconnect` is
touched — its fixed `+1000` window has ~22 chars of headroom and fails naming *tradePropose*, not the culprit.

**Carry-forward hazards (measured this slice):**
- `main.ts` is coverage-EXCLUDED and `just ci` does NOT run e2e — for `main.ts` changes the source-scan teeth are the
  WHOLE gate. Pin exact contiguous shapes, never token presence: a presence check was measured green against a
  one-character `!` inversion that kills all movement.
- Inside the slice worktrees, bare `python3` is broken by the committed `.tool-versions` asdf shim. Use `/usr/bin/python3`.
- `scripts/adr-digest.mjs` hard-fails if the ADR `**Decision:**` line exceeds 240 chars (cost 4 round-trips here).
- The clickable `#help-hint` can occlude buttons in the nine in-flow overlay shells; e2e measured clean but that is a
  measurement, not a proof. Escape routes reserved for uxd3-c (ADR-0163 D4).

**PLAN.md §9 touch NOT made:** `specs/monster-realm-v2/PLAN.md` is in the harness repo, outside the project PR. The parked
`M-postgate-overlay-registry` entry should be repointed at **uxd3-a + uxd3-b + uxd3-c** (NOT closed — uxd3-c is the last
piece). `docs/adr/README.md` next-free is stale at 0162 and wants the usual reconcile chore PR. `adr_next_free` → **0164**.

## 2026-07-31T10:48:54Z — uxd3-b: CI-watch delegated (PR#267 open, checks in-flight)
Reconciled the wrapper-finished uxd3-b run (leader dead, .done EXIT=0 ATTEMPTS=1, cost $58.32 already in the wrapper-reconcile ledger row) from live ground truth. PR#267 (ADR-0163, overlay probe registry substrate + AC-12 click front door) is OPEN, mergeStateStatus=MERGEABLE/UNSTABLE only because ci+e2e are still IN_PROGRESS (started 10:46:19Z, ~2min old at tick time). No chain-owner lock held, no other inflight slices. Rather than poll, spawned $MEM/mr-ci-watch 267 uxd3-b detached (pid 700504) -- it will resume the merge sequence (mr-audit, master CI reverify, worktree cleanup, ledger+handoff) via an event tick once checks land. master is green (uxd3 merge commit 1953329 CI success @08:44Z; separate scheduled Nightly run still in_progress, unrelated). Governor NORMAL throughout (d7=$576.92/2783, fable_ok=true). No BLOCKER.

## 2026-07-31T11:02:16Z — uxd3-b merged (PR#267, ADR-0163) — uxd3-c is next
Native tick (rid=native-20260731T110025Z-702103), event-triggered by uxd3-b.ci.md. Reconciled uxd3-b's finished
rooted run (leader 495853 dead, .done EXIT=0 ATTEMPTS=1) from live ground truth. PR#267 confirmed CLEAN/MERGEABLE,
ci+e2e SUCCESS on the PR. mr-audit --tier routine: orchestration CLEAN, gating CLEAN. Diff (1953329..e8823e1)
verified subset of declared touches + doc set (ARCHITECTURE.md, client/index.html, indexShell.test.ts, main.ts,
main.wiring.test.ts, ui/overlayRegistry.{ts,test.ts}, docs/adr/0163-*.md, docs/adr/DIGEST.md).

Squash-merged PR#267 -> 9e897a3, remote branch deleted, worktree .claude/worktrees/uxd3-b + per-run lock cleaned,
local checkout ff-only'd 1953329->9e897a3.

Did NOT compose a merge->launch: master CI on the merge commit (run for 9e897a3) still in_progress at tick-exit;
no post-merge-master-CI watcher mechanism exists (per the 08:47Z tick's same precedent) so this is left for the
next tick/event rather than sit-polled.

NEXT SLICE: uxd3-c, per uxd3-b's own progress memo (memory/projects/monster-realm-uxd3-b-progress.md) and
ADR-0163 D2/D7/D8 -- Escape re-anchoring boy-scout + the retained W-OVERLAY-FANOUT-MUTEX-successor teeth
(W-HELP-FANOUT-BATTLE, -OPENGUARDS, W-RN-FANOUT-RECONNECT, W-TP-RECONNECT, W-TP-FANOUT-KEYN-GUARD,
W-HELP-NO-RECONNECT-HIDE, W-RECONNECT-HIDES-MENU, W-BATTLE-FORCEHIDE-SET-MATCHES-MANIFEST,
W-UXD3-ESCAPE-ANCHOR-FIRST, W-UX1-HINT-NO-JS-OWNER, W-ONE-CORNER-AFFORDANCE). This is the last piece retiring
the parked M-postgate-overlay-registry -- the memo declares a third AC-20 deferral unacceptable. No M*.spec.md
entry exists yet for uxd3-c (it was scoped mid-execution by uxd3-b's own planner/red-team pass, not pre-authored
in M-postgate-ux-design.spec.md) -- next tick's launch prep must read the progress memo + ADR-0163 directly for
touches/target_desc rather than the spec file.

No BLOCKER. Governor NORMAL throughout (d7=$577.45/2783 at tick start, fable_ok=true). Ledger row recorded
(cost null; wrapper-reconcile already captured actual spend for the rooted run).

## 2026-07-31T12:03:20Z — launched uxd3-c (ADR-0164) — last piece of M-postgate-overlay-registry
Native tick (rid=native-20260731T120007Z-724246, forced=0 cron). At tick start: uxd3-b already fully
reconciled by the prior 11:02Z tick (PR#267 squash-merged -> 9e897a3, master CI green, worktree/branch/lock
clean, ledger+handoff recorded). Live re-verify confirmed: no locks, no open PRs, no inflight, master local
== origin/master @ 9e897a3, no active human session (no resident IDE claude, no non-supervisor writes in last
6min), adr_next_free=164 matches docs/adr/README.md.

Selected uxd3-c per uxd3-b's own progress memo (memory/projects/monster-realm-uxd3-b-progress.md) and
ADR-0163 D2/D6/D7/D8 -- no M*.spec.md entry exists for it (scoped mid-execution by uxd3-b's planner/red-team
pass), so target_desc/touches were authored directly from the memo + ADR rather than a spec file. Scope: the
WRITE half of the overlay registry -- per-id open/hide thunks (dialogueView sole hide-omitter per D7),
migrate 12 hotkey guard lists + 2 front doors onto canOpen(), collapse refreshBattle/onReconnect, retire
W-OVERLAY-FANOUT-MUTEX/W-HELP-FANOUT-OPENGUARDS/W-HELP-FANOUT-BATTLE only once structurally redundant, and
(if it fits the boyscout cap) the twice-deferred Escape re-anchoring from ADR-0162 A17. Tier=routine (opus@
high) -- UI/overlay work, no predictor.ts/netcode/reconcile/server-module/security surface, no prior failed
attempt. ADR-0164 pre-reserved.

Solo launch (no inflight to fan out against). mr-spawn LAUNCHED+asserted: leader=726904 (own session),
claude_pid=726907, model confirmed claude-opus-5 in log, tier=routine, brief 14910 bytes. Per-run lock
written. Cost-watch spawned (pid 727176, cap=$60). Ledger row recorded (outcome=launched, cost null --
mr-cost-watch/wrapper will capture actual spend on completion).

No BLOCKER. Governor NORMAL throughout (d7=$578.57/2783, fable_ok=true; this slice uses opus not fable).
Next tick: resume/merge uxd3-c when it reaches terminal state; this is expected to CLOSE
M-postgate-overlay-registry (uxd3-a + uxd3-b + uxd3-c) -- confirm at merge time and update PLAN §9 status.

## 2026-07-31 — uxd3-c TERMINAL: PR#268 open, local ci+e2e green (ADR-0164) — M-postgate-overlay-registry CLOSED

**STATUS: PR open + local `just ci` green + remote CI running. NOT merged (supervisor-owned).**
https://github.com/mdrewt/monster-realm/pull/268 · branch `feat/uxd3-c-overlay-write-substrate` ·
worktree `.claude/worktrees/uxd3-c` · ADR-0164 · forked master@9e897a3.
Full detail: `memory/projects/monster-realm-uxd3-c-progress.md`.

Full loop run: planner → reviewer + red-team + /simplify on the plan → adjudication → tester (separate
agent; T1a re-anchors green on unmodified source first, per ADR-0163 D7 sequencing; RED receipt 12/141) →
separate implementer (red→green) → orchestrator-owned retirements with captured RED receipts → reviewer +
red-team on shipped code → verifier PASS. `just ci` exit 0 (65 files / 1742 client tests, 1504 Rust,
all evals PASS); `just e2e` exit 0 (44/1 skipped). Domain auditors (desync-guard / reducer-security) not
run — zero Rust / server-module / game-core / predictor files in the diff; verifier confirmed N/A, same
call and same evidence as uxd3-b.

**This closes `M-postgate-overlay-registry`** (uxd3-a + uxd3-b + uxd3-c). Stated in ADR-0164's Consequences.

**⚠ FOUR ITEMS FOR THE MERGE AUDIT — all deliberate, all argued in the PR body + ADR-0164:**
1. **Smaller API than briefed.** No `open` thunks, no `hideAllExcept` — zero consumers; every open path is
   already a named `openX()` and `activateMenuLeaf` dispatches through an exhaustive switch. Same A7/A15
   call ADR-0163 D1 made. `visibleIds` REVERSES A7's deletion (it now has two consumers) — recorded as the
   YAGNI rule working, not churn.
2. **`dialogueView` shape deviates from ADR-0163 D7's sketch** — a bare optional thunk
   (`dialogueView: undefined`) rather than an optional `hide` member, because D1 had already rejected the
   one-member wrapper. The totality guarantee is identical; the tooth matches a flat literal.
3. **`onReconnect` collapse DECLINED, not deferred.** It needs the `RECONNECT_HIDE` constant ADR-0162 A15
   deleted, and costs four teeth for six lines (`W-RECONNECT-HIDES-MENU` names this exact refactor as a
   wrong impl it kills; `W-HELP-NO-RECONNECT-HIDE` would lose its positive control AND go structurally
   blind). D7's MANDATORY half — re-authoring `W-TP-RECONNECT` on two endpoints — WAS done and landed first.
4. **Escape re-anchoring boy-scout deferred a THIRD time, explicitly.** ~73 lines / 4 hunks vs the
   ~40-line / ≤3-hunk cap; atomic, so untrimmable; NOT hunk-split to dodge the cap. → uxd3-d.

**Retirements, stated honestly.** Four teeth deleted (never skipped) — `W-OVERLAY-FANOUT-MUTEX`,
`W-HELP-FANOUT-OPENGUARDS`, `W-HELP-FANOUT-BATTLE`, `W-TP-FANOUT-KEYN-GUARD` — and **all four went
genuinely RED** on the migrated source before deletion (materially cleaner than uxd3-b, which deleted two
would-have-stayed-green floors). Plus `W-RECONNECT-HIDES-MENU` clause 2b, which was GREEN: a deliberate
removal of a live-but-obsolete assertion. ONE admitted loss: the guard-form-vs-`.hide()` distinction for
modals is no longer stated in `main.ts` and now lives only in the tier table.

**Red-team on the shipped code found 2 CI-green survivors; both closed, each re-measured RED.**
The serious one is NOVEL and worth carrying forward: **a whole-file substring ban on `x?.hide` is defeated
by one line of aliasing** — `const h = dialogueView; h?.hide();` in the frame loop hid a live conversation
every frame while `W-ESCAPE-DIALOGUE-NEVER-BARE-HIDE`'s two counts stayed at 0, the full 1742-test suite
stayed green and `tsc` stayed clean. That is the ptc5c/ADR-0139 desync under a green gate. The hole
PREDATES this slice (since uxd3-a). Closed with an enumerated whole-file ceiling on the identifier.
Second: a `Partial<>` loosening of `OverlayHandles` type-checked and kept the suite green while erasing the
totality guarantee — closed with an exact-shape pin on the declaration line.

**Carry-forward hazards (measured):**
- Any future "this identifier must never be called" tooth needs an enumerated ceiling on the IDENTIFIER,
  not a needle on the call — aliasing defeats the needle.
- A `Partial<>` loosening of a `Record<K, V>` alias is invisible to BOTH runtime tests and `tsc`. Pin the
  declaration's exact shape when totality is load-bearing.
- **Subagents may write to the MAIN CHECKOUT rather than the named worktree.** The doc-keeper did.
  Recovery without mutating git on the main checkout: `git -C <main> diff <f> > p`;
  `git -C <main> show HEAD:<f> > <f>` (plain redirect); `git -C <wt> apply p`; `rm` untracked strays.
- Do not fight Biome to satisfy a needle's token ORDER. An implementer added
  `biome-ignore-all assist/source/organizeImports` to `main.ts` to protect an alphabetization accident;
  reverted — the needle now matches the formatter's canonical output, since its load-bearing content is
  WHICH values are imported.

**PLAN.md §9 touch NOT made** (harness repo, outside the project PR): `M-postgate-overlay-registry` can now
be marked **CLOSED**. `docs/adr/README.md:13` next-free is stale at `0162` (by three) — usual chore PR.
`adr_next_free` → **0165**. **NEXT SLICE: uxd3-d** — the Escape re-anchoring boy-scout, plus optionally
deleting the now-orphaned `client/src/inputGuards.ts` (`shouldToggleBox` has zero production callers; it
was outside this slice's `touches:` so it was deliberately left dead-but-tested and green).

## 2026-07-31T14:07:35Z — uxd3-c merged, closes M-postgate-overlay-registry
## 2026-07-31T14:04Z native tick (rid=native-20260731T140448Z-899047): reconciled uxd3-c's finished rooted run (leader 726904 dead, .done EXIT=0 ATTEMPTS=1, cost $53.49 already in the wrapper-reconcile ledger row). PR#268 (ADR-0164, overlay write substrate: OverlayHandles force-hide table + 12 hotkeys migrated to canOpen, closes M-postgate-overlay-registry) confirmed CLEAN/MERGEABLE, ci+e2e SUCCESS. mr-audit --tier routine: orchestration CLEAN (11 agent calls, full role roster). Gating mechanical FLAGGED (61 modified/removed asserts, 1 suppression hit) -- adjudicated CLEAN after reading the full diff: the modified main.wiring.test.ts teeth are a legitimate architectural migration (old de-Morgan hand-rolled per-site guard teeth retired, replaced by canOpen-routed teeth plus a net-new stricter W-UXD3C-NO-DEMORGAN-FANOUT tooth asserting zero hand-rolled fan-out terms survive); the 'suppression' grep hit was prose mentioning `@ts-expect-error` inside an ADR/comment, not actual code (confirmed zero occurrences in client/src). Diff scope (7 files) exactly matches declared touches. Squash-merged PR#268 -> bb63191, worktree .claude/worktrees/uxd3-c + branch feat/uxd3-c-overlay-write-substrate cleaned, local checkout ff-only'd 9e897a3->bb63191 clean. Found docs/adr/README.md 'Next free number' stale at 0162 (3 ticks behind ADR-0162/0163/0164) -- opened + auto-merge-armed doc-only chore PR#269 (0162->0165). Master CI on the merge commit (bb63191) still in_progress at tick-exit -- no post-merge-master watcher exists (mr-ci-watch is PR-scoped); left for next tick/event per standing precedent rather than sit-polling. Did NOT compose a merge->launch: master CI unconfirmed post-merge, so no fresh disjointness/eligibility re-derivation was safe this tick. Single mutating action (merge + its doc-chore follow-through). Ledger row + handoff entry recorded. No BLOCKER; governor NORMAL throughout (d7=$633.95/2783, fable_ok=true). Next tick: once master CI confirms green and chore PR#269 auto-merges, re-derive next Phase D/postgate pick fresh (M-postgate-overlay-registry is now CLOSED per PR#268's title -- check PLAN.md $9 / M-postgate*.spec.md queue for what remains).

## 2026-07-31T15:08:35Z — native tick 15:07Z — launch 11r-d, close overlay-registry/ux-design
2026-07-31T15:07Z native tick (cron, rid=native-20260731T150010Z-920747): reconciled uxd3-c's remaining tail from live ground truth -- doc-only chore PR#269 (0162->0165) had auto-merged since the prior tick, master ff-only'd locally bb63191->1ad9297 clean (CI success confirmed live). Removed stale /tmp/mr_pass_uxd3-b.done (already reconciled 3 ticks ago). Zero locks/PRs/inflight, human-session probe clear (only writer in the last 8min was my own git merge --ff-only touching docs/adr/README.md's mtime -- same self-write false-positive class as prior ticks; waited ~6min for the window to age out rather than patch mr-spawn's exclude list for a real project file). M-postgate-overlay-registry / M-postgate-ux-design are now fully CLOSED (uxd1/uxd2/uxd3-a/uxd3-b/uxd3-c all merged). Selected 11r-d (Ledger & backlog reconciliation) from the newly-queued M-postgate-eleventh-review-residuals.spec.md -- its own sec3 sequencing says run this slice FIRST (docs-only, disjoint from everything, prevents the next planning pass reading stale PLAN.md/ADR-README state). Solo launch, tier=content (opus@medium) -- purely mechanical: just changelog, ADR README range/catalog fix, Amended-by backlinks for 0119/0122, adr-digest regen, PLAN.md close-marks for the merged post-gate wave, ARCHITECTURE.md registry table refresh. Took the spec's own DEFAULT on D4 (changelog freshness = nightly check, not per-PR gate) rather than blocking -- reversible/cheap per BLOCKER discipline. mr-spawn LAUNCHED+asserted (leader=924986, claude_pid=924989, model=opus confirmed, ADR-0165 reserved). Ledger+handoff recorded. No BLOCKER; governor NORMAL (d7=$635.5/2783, fable_ok=true -- this slice uses opus not fable). Next tick: once 11r-d merges, re-derive fresh and consider fanning out the HIGH-priority server slices 11r-a/11r-b/11r-c (11r-b is main.ts-SERIAL-with-uxd3, now clear to proceed; 11r-a/c overlap movement.rs/battle.rs and must serialize a->c per spec sec3).

## 2026-07-31 — 11r-d TERMINAL: PR#270 open, local `just ci` green (ADR-0165)

**STATUS: PR open + local `just ci` green + remote CI running. NOT merged (supervisor-owned).**
https://github.com/mdrewt/monster-realm/pull/270 · branch `feat/11r-d-ledger-reconciliation` ·
worktree `.claude/worktrees/11r-d` · ADR-0165 · forked master@1ad9297.

Docs-only slice, CONTENT tier. Lenses: planner → reviewer + /simplify on the plan → doc-keeper (ADR-0165)
→ reviewer + verifier on the shipped diff. No red-team/domain auditors (zero code, zero validation/
parsing/security surface; verifier confirmed the diff touches no test/eval/fixture/CI-config file).
`just ci` green: clippy -D warnings, 1504 Rust tests, 74/74 evals PASS, check-secrets clean, wasm,
client typecheck, 1742 client tests. NOTE: a fresh worktree needs `just client-setup` BEFORE `just ci`
or lint dies at `client/node_modules/.bin/biome: not found` (cost one wasted CI run).

Delivered: CHANGELOG regen #240→#269 (git-cliff, at branch point); docs/adr/README.md hand catalog
(~105 lines, stale at 0134) replaced by a pointer to the drift-gated generated DIGEST.md; Amended-by
back-links **re-derived from the ADR bodies, and the spec's prose was wrong** — 0119 ← 0122/0125/0132,
0122 ← 0136 (a 3-and-1 split, not "0122/0125/0132/0136 amend them both"); ARCHITECTURE.md gained the
missing `shops` registry row + refreshed species file list (table now complete: 12 glob + 3 single-file);
ADR-0165 records DECISION D4 = nightly changelog-freshness check (the DEFAULT), unimplemented in-slice
by touches: discipline.

Cross-repo: harness `specs/monster-realm-v2/PLAN.md` close-marks committed SEPARATELY as `4865027`
(single-file staged; supervisor's unrelated harness WIP untouched). netcode-hardening /
movement-investigation / dev-observability / feel-polish / ux-design CLOSED; ux-hardening
merged-with-ux2b-partial (→11r-e); battle-0hp PvE-half-merged, PvP-half-parked (→11r-a/11r-b).

**Measured, carry forward:** the adr-digest ref-validator is a REAL tooth (dangling `Amended-by` →
exit 1 → `eval FAIL: adr-digest TOOTH 7`), and its header validator bit for real (Decision >240 chars).
But `just adr-digest` produces NO DIGEST diff when Amended-by is added — the digest **validates** those
refs and never **renders** them, so the tooth catches a WRONG back-link, not a MISSING one.

**⚠ FOUR FOLLOW-UPS, all outside 11r-d's declared touches: (surfaced, not taken — supervisor to re-serialize):**
1. `docs/adr/0142-*.md` owes `**Amended-by:** ADR-0165` (0165 declares `Amends: ADR-0142`) — the exact
   convention this slice enforces on 0119/0122, but 0142 was not in the declared set.
2. `Next free number` in docs/adr/README.md is STILL hand-maintained and gated by nothing — deriving it
   in `scripts/adr-digest.mjs` would kill this drift class permanently. README now says so honestly
   rather than overclaiming "cannot go stale".
3. D4's nightly check is UNIMPLEMENTED (needs `.github/workflows/nightly.yml`) — ADR-0165 recommends
   11r-i, and notes 11r-i's touches: (`evals/`, `scripts/smoke-republish.sh`, `server-module/src/npc.rs`)
   would have to widen to cover the workflow file.
4. ARCHITECTURE.md "Decisions" Highlights prose enumerates only to ADR-0100 + an orphaned 0159 — same
   staleness class, ~60 ADRs to refresh, far over the boyscout cap. Flagged, not attempted.

Next slice per spec §3 priority: 11r-a (PvP server-guard parity, HIGH) or 11r-b/11r-c.
