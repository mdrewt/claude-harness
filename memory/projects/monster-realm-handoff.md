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
