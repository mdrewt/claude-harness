# monster-realm v2 -- supervisor handoff ARCHIVE (2026-10, entries appended oldest-first -- this file is never rewritten)

---
## 2026-10-01T13:11:00Z — Console-controls redesign specced (operator directive 2026-10-01); PR #149 open
Operator redirected the client control scheme: virtual D-pad + A/B/X/Y/LB/RB/Start/Select primary, hotkeys optional, remappable (localStorage), pointer A/B on game screen, controller-ready. PR mdrewt/claude-harness#149 (branch spec-postgate-cc, worktree .claude/worktrees/spec-postgate-cc) now carries: console-controls-design.md, M-postgate-console-controls.spec.md (31 slices, strangler order; first launchable after merge: pgcc-a then ctl-1; ctl-4/ctl-9/ctl-16 have after:[]), M-gamepad.spec.md (sketch, before launch), client-coverage re-scoped (pgcc-b superseded; pgcc-a first; pgcc-c/d after ctl-15), PLAN §9 reordered (controls = item 1). Local gate green (SELFCHECK-OK; gates 4/4). Supervisor TODO: merge #149; re-dispose r2 items 006-009/016/023-026/035/052/060/091 per the controls spec table; stale ledger 087-090 (walk speed now R-ctl-RUN); 56 new CLASSIFIED items op-2026-10-01-controls-* await disposition; 9 R-ctl-* backlog residuals added. Operator may override 3 adopted defaults (design §14) before the named slices.
## 2026-10-01T14:02:53Z — Tick mr-sup-native-20261001T140045Z-3174273-13397: merged #149, launched pgcc-a
Merged harness PR #149 (console-controls spec). master CI green (efd3f3a0). Launched pgcc-a (leader 3181092, opus@high). Next: merge pgcc-a via mr-audit, then ctl-1 of M-postgate-console-controls. M25 still blocked:checkpoint-2-ratification. 9 R-ctl-* LOW residuals unpromoted (MED/LOW fill only).

## 2026-10-01T14:52:20Z — 2026-10-01T14:52Z native tick (src=done) — merged pgcc-a, launched ctl-1
Merged PR#535 pgcc-a (feedback-action core) at 34a8fb65; audit CLEAN; master CI green. Reaped stale mutex (owner 3173397 dead). Launched ctl-1 (leader 3294438, opus@high, routine). Next: audited merge of ctl-1, then ctl-2. M25 still blocked on checkpoint-2. Harness main checkout has uncommitted pgcc-a spec build-note edit + 21r-b2/pgcc-a plan/progress files (run artifacts, left untouched).


## 2026-10-01T16:08:47Z — 2026-10-01 tick: merged ctl-1 (#536), launched ctl-2
ctl-1 audited CLEAN (5/5, spotcheck agreed), merged 768c271c, master CI green. Launched ctl-2 (opus@high routine, leader 3417990). Next: audited merge of ctl-2, then ctl-3. Stale mutex from dead pid 3286345 reaped via mr-unlock.


## 2026-10-01T16:42:38Z — ctl-2 PR open (#537)
ctl-2 PR https://github.com/mdrewt/monster-realm/pull/537 open, local just ci green at 4d74e1a6, gates 5/5 met. Branch ctl-2, worktree .claude/worktrees/ctl-2. Harness spec M-postgate-console-controls.spec.md has an uncommitted ctl-2 build note (supervisor commits). Residuals noted in PR: same-batch pullback+server-open re-issue (ctl-3), stale comment citations main.a11yFocus.test.ts:526 + ui/claimView.ts:3. Next: audited merge of ctl-2, then ctl-3.


## 2026-10-01T16:59:52Z — ctl-2 awaiting CI (PR #537)
ci passed, e2e pending at 4d74e1a6; mr-ci-watch launched; next tick: mr-audit + mr-gates verify + audited merge, then ctl-3.

## 2026-10-01T18:07:55Z — tick mr-sup-native-20261001T180037Z-3554099-25372: ctl-2 merged, ctl-3 launched
ctl-2 PR#537 merged (6278ea75), master CI green. Stale mutex (owner 3529603 dead) reaped. ctl-3 launched opus@high leader=3558468. Next: await ctl-3 .done, audited merge, then ctl-6a/ctl-4 per build order.
## 2026-10-01T19:03:18Z — ctl-3 merged (#538)
ctl-3 audited+merged be8e470. Master CI post-merge run 36911193997 delegated to mr-ci-watch. Next: verify green, then ctl-6a/ctl-4 per spec.

## 2026-10-01T20:01:22Z — 2026-10-01T20:02Z — ctl-6a + ctl-4 launched (fan-out 2)
Master be8e4704 CI green (run 36911193997) after ctl-3 merge. Reaped stale mutex+dead locks. Launched ctl-6a (e2e helpers, test-only) and ctl-4 (nav/frame kit) concurrently; mr-disjoint SAFE. Next: await .done for each, audit+merge serially, then ctl-5 (after ctl-4, ctl-6a).
## 2026-10-01T20:50:26Z — tick mr-sup-native-20261001T204918Z-3899090-19815: ctl-6a merged, ctl-4 awaiting e2e rerun
ctl-6a PR#540 merged (c8dcbe42); master CI in_progress run 36924459001 — verify next tick. ctl-4 PR#539 e2e failed on wallet-balance.spec quest_001 (ci green); reran failed job, mr-ci-watch delegated. Next: on event, if e2e green audit+merge 539 (mandatory read not needed unless audit says); verify master green; then next ctl slice per M-postgate-console-controls spec.

## 2026-10-01T21:16:34Z — 2026-10-01 21:1x supervisor: ctl-4 merged, ctl-5 launched
ctl-4 (PR #539) audited CLEAN and merged as 37dd53a1; master CI green after rerun of a one-test e2e flake (evolution.spec V2 Care click not stable; passed on PR and on rerun - watch for recurrence). Launched ctl-5 (leader 3913675, routine opus@high). Queue: ctl-9 runner-up. Next: merge ctl-5 when .done lands, then ctl-6b.

## 2026-10-01T21:55:47Z — ctl-5 parked
ctl-5 PARKED on a hidden dependency (touches scoping). Branch feat/ctl-5-main-menu-nav @ c07e1878 pushed; worktree .claude/worktrees/ctl-5. Implementation complete and 7/7 acceptance gates met with evidence; full client vitest 3317/3320 — the 3 reds are exact roster pins OUTSIDE touches: client/src/ui/i18n/catalog.test.ts (CATALOG-SHAPE + CAT-01 178-key roster; add the 29 menu.* ids) and client/src/ui/i18n/catalogParity.test.ts (PARITY-02 23-file resolver roster; add ui/menuModel.ts). Unavoidable: CTL5.1 needs catalog ids (pgcc-a amended the same roster for one key). Resume: add both files to ctl-5 touches; tester amends rosters; then a11y.spec.ts retarget + PASSES_FLOOR_MENU/INCOMPLETE_CEILING_MENU re-baseline, the in-place DECISIONS 'Client UI' amendment (menu non-exclusive, plan A10), lens batch, just ci, PR. Spec gap: every ctl-8 screen slice adds catalog ids too, so these two files belong in their touches. Details: memory/projects/monster-realm-ctl-5-progress.md; plan: memory/projects/monster-realm-ctl-5-plan.md.

## 2026-10-01T22:14:04Z — ctl-5 PR open
ctl-5 PR OPEN: https://github.com/mdrewt/monster-realm/pull/541 (branch feat/ctl-5-main-menu-nav @ 07108c3a). Supersedes the earlier 'ctl-5 parked' entry: the two i18n roster tests (catalog.test.ts, catalogParity.test.ts) were taken in as sibling tests of the declared catalogs and listed under touches-delta. Local just ci green (client 3328/3328, evals, observability); a11y.spec.ts 7/7 vs local spacetime; mr-gates 7/7 met. Residuals: R-ctl-5-CTL5.6 (->ctl-6b, LOW), R-ctl-5-CTL5.1 (->ctl-7a, LOW). Spec gap: ctl-8 screen slices need catalog.test.ts + catalogParity.test.ts in touches. Merge is supervisor-owned.

## 2026-10-01T22:31:55Z — ctl-5 resume: gitleaks CI fix
ctl-5 PR #541 not mergeable: check ci fails on gitleaks false positive (client/src/ui/menuView.test.ts:48, commit 438a185a; e2e passes). Resume run launched (leader 4051394, opus@high routine) with .gitleaks.toml/.gitleaksignore added to touches. Next tick: on its .done, mr-audit + gates verify, confirm PR ci green, merge. ctl-9 queued behind (shares DECISIONS.md).


## 2026-10-01T23:08:02Z — ctl-5 merged; ctl-6b + ctl-9 launched
ctl-5 (#541) merged 8e315102, master CI green. Reaped stale mutex (owner pid dead). Launched ctl-6b (client, critical path) and ctl-9 (game-core/wasm, any-time lane) in parallel, mr-disjoint SAFE. Queue: ctl-6c next after 6b.
## 2026-10-02T00:18:51Z — ctl-6b PR open
ctl-6b PR OPEN: https://github.com/mdrewt/monster-realm/pull/543 (branch ctl-6b @ 78d4109a; worktree .claude/worktrees/ctl-6b). Local just ci green (client 3378/3378, evals, observability 8/8); mr-gates 6/6 met. Screen-adapter seam (Command union + exhaustive dispatch, every view callback routed; SCREEN_ADAPTERS all legacyAdapter; screenButton/baseButton), Start/B/Select, typing mode, Escape stack + KeyM + '?' branches deleted. Deviation: Escape alone is routed in the CAPTURE phase (views' stopPropagation is outside touches). Residuals: R-ctl-6b-CTL6B.1 (->ctl-14), R-ctl-6b-CTL6B.4 (stale player help text ->ctl-14), R-ctl-6b-CTL6B.5 (stop-typing focus to body ->ctl-8h). Spec build note added under §ctl-6b (harness spec file, uncommitted in harness). touches-delta: screens/index.test.ts, main.controls.test.ts, main.dispatch.test.ts, main.menu.test.ts + main.input.test.ts retargets (Escape=Start). Remote e2e not run locally — watch e2e on the PR (Escape now pops to base / opens the menu at the world). Merge is supervisor-owned.

## 2026-10-02T00:00:28Z — sup tick mr-sup-native-20261002T000004Z-260254-21804 ctl-9 e2e rerun
ctl-9 PR#542 ci=ok e2e=FAIL on wallet-balance quest_001 precondition (suspected flake, ctl-9 touches no client runtime). Reran failed job; mr-ci-watch delegated. Next tick: if green -> mr-audit + merge; if red again -> inspect test vs master for regression. ctl-6b still running.


## 2026-10-02T00:54:14Z — Weekly review 2026-10-02: 5 residuals entered, issue 544 opened, rev21 answer consumed (close blocked)
# Weekly review 2026-10-02 — handoff

Pinned clone: /home/mdrewt/mr-review/2026-10-02-5005e025 @ 5005e0255efe0b5ae69bfef2e9740cf1206fb05f (master tip, ctl-6b merge). Snapshot 00:40 UTC.
Lenses (sonnet): ux-a11y critical flows; netcode determinism/smoothness; server authority/privacy. 9 candidates, all independently re-verified (sonnet); no lens contradictions, no opus adjudication needed.

## 2026-10-02T01:45:24Z — ctl-6c parked
ctl-6c PARKED on a hidden dependency. Draft PR #545 (feat/ctl-6c, worktree projects/monster-realm/.claude/worktrees/ctl-6c), logic green on targeted suites + full client vitest (3391) + typecheck + biome; just ci NOT run. Blocker: CTL6C.1 'menu OVER the battle' fails visually: battleView root z-index:110 (battleView.ts:114) paints over #menu-overlay/#help-overlay z-index:100 (client/index.html:90,105; #app has no stacking context); Journal/Rankings shells are in-flow (B3) under it too. Fix needs client/index.html (outside touches) or re-serializing ctl-6c after ctl-7a/7b. Supervisor decision: (a) add client/index.html to touches + keep Journal/Rankings disabled over a battle until ctl-7a + a Playwright elementFromPoint check, or (b) move ctl-6c after ctl-7b (amend build order and ctl-7a after:). Resume point + 8 open lens findings + residuals-to-register: memory/projects/monster-realm-ctl-6c-progress.md; plan: monster-realm-ctl-6c-plan.md. Gates ledger reads 3/3 met mechanically, but CTL6C.1 is not honestly met until the layering is fixed. Sibling ctl-16 untouched.

## 2026-10-02T00:36:08Z — sup tick: ctl-6b merged; ctl-9 e2e rerun
ctl-6b merged as 5005e025 (PR#543). ctl-9 PR#542: e2e 1 failure in evolution.spec.ts:191 (Care click, element not stable) — unrelated to additive game-core/wasm diff; reran failed job; mr-ci-watch watching. Next: audit+merge ctl-9 when green, then queue head ctl-6c (serial on main.ts).



## 2026-10-02T02:01:10Z — 2026-10-02T02:01:10Z — ctl-6c resumed (fable hard)
Resumed parked ctl-6c (PR #545) at hard tier. Layering blocker defaulted to option (a): add client/index.html to touches, raise menu/help overlays above battle z-index 110, keep Journal/Rankings disabled over a battle until ctl-7a, one Playwright elementFromPoint check. Reversible, so no mr-ask-drew. ctl-16 still running (server-module, disjoint). Stale chain mutex from a dead owner (tick 01:00 finished without releasing) reaped via mr-unlock.

## 2026-10-02T02:48:30Z — ctl-16 PR open — local green, 4/4 gates
ctl-16 (server in-battle guards on talk/advance_dialogue/buy/sell) is at PR mdrewt/monster-realm#546, head ac469fa2, branch feat/ctl-16, worktree .claude/worktrees/ctl-16. Local just ci green (nextest 2004, vitest 3378, 15 evals); mr-gates 4/4 met. Lenses closed (plan reviewer+red-team, reviewer, red-team 162 mutants, reducer-security-auditor, desync-guard, verifier PASS). Supervisor TODO: (1) amend the harness spec section ctl-16 — drop raising_tests.rs from touches and the 'make ongoing_battle() pub(crate) and reuse it' task (mod raising_tests is private in raising.rs, E0603), and reword CTL16.2's red from a GrantItem choice to StartQuest (no shipped tree has GrantItem). (2) Pre-existing, not fixed, reported in the PR: advance_dialogue's delete-then-Err dismiss branches roll back in production (LOW); items/currency can reach an in-battle player via a trade. (3) I moved a dead-owner ~/.local/share/spacetime/data/spacetime.pid (pid 899666, not running) aside to spacetime.pid.stale-ctl-16-* before my just ci. Sandboxes left in /tmp: tmp.6Aokeie5HS, tmp.S7JF0LBC2Y, tmp.eutEcrYvFB (recursive delete is guard-blocked).
## 2026-10-02T03:43:36Z — ctl-6c ready for merge (PR #545)
ctl-6c resumed under option-a and finished: PR #545 marked ready, head 62f77ea1, full just ci green locally on that head; remote CI green on cb36c6cb and cab12ea2, run on 62f77ea1 in progress at hand-off. Ledger 3/3 met, 0 deferred. Applied: client/index.html menu+help z-index 120 over the battle root's 110; Journal/Rankings disabled over a battle (HIDDEN_UNDER_BATTLE in mainMenuScreen.ts). FINDING: the prescribed plain elementFromPoint check passed on the UNFIXED build because the suspended battle root is inert and Chromium skips inert subtrees in hit-testing; e2e E0 in encounter-battle.spec.ts now lifts inert in one evaluate and pins the z-index order (red before the fix, green after). Red-team found one real bug, fixed: help opened over a battle survived a link drop visible-but-inert; onReconnect now hides every overBattle-stamped frame. All 8 park-memo findings closed. HIDDEN DEPENDENCY FOR LATER SLICES: re-enabling Journal/Rankings needs mainMenuScreen.ts + mainMenuScreen.test.ts + main.controls.test.ts in touches, which ctl-7a's touches omit; registered as R-ctl-6c-JOURNALRANKINGS -> ctl-7b; ctl-7a/7b must keep menu/help above the battle (E0 alarms). Spec: ctl-6c build note added in the harness working tree (uncommitted); CTL6C.2 criterion text still says 'exactly as Start does' while A pops the outcome after a 400 ms grace (plan amendment A3) - recorded in the note. 7 residuals registered (PVPTIMER, MONSTERSRO, SELECTINERT, JOURNALRANKINGS, MENUCOPY, REFUSALSURFACE, STALETEXT). State memo: memory/projects/monster-realm-ctl-6c-progress.md. Sibling ctl-16 untouched; server-module untouched.

## 2026-10-02T07:05:49Z — ci-fix-20261002T0501Z: PR #547 open — wallet-balance e2e red was click starvation, not ctl-16
PR #547 open (https://github.com/mdrewt/monster-realm/pull/547), branch ci-fix-20261002T0501Z @ b13fe39a, local `just ci` exit 0, ledger 3/3 met. Test-only: client/e2e/wallet-balance.spec.ts. NOT a revert, and the ctl-16 guards are untouched.

The brief's hypothesis was wrong. ctl-16 is not the cause: the identical assertion failed on master 2026-09-27 (run 36325744282, before ctl-16), on ctl-4's PR #539 on 2026-10-01, and #546's own e2e run passed on the identical tree. Measured cause: DialogueView.render() rebuilds the choice button on every store batch (~5/s); a starved runner cannot give Playwright's pointer click a stable node within 5 s; the spec swallowed that timeout and waited 20 s for a hide that could not come, five times. Reproduced with 80x CDP CPU throttle (legacy RED 2/2 with the CI message, fixed GREEN 5/5). Attribution to the CI runs themselves is inferred — the e2e job keeps no Playwright artifacts.

Fix: the choice activation is locator.dispatchEvent('click') (one page task), plus a per-attempt trail printed to stdout and into the failure message. If this test reds again, READ THE TRAIL in the job log (lines starting "wallet-balance precondition (a):") before theorising: it says whether the click was dispatched, whether the server refused it and why, or whether the advance was accepted and the client never saw the row delete.

For mr-gates verify: X2 is a Playwright CHECK and needs a live SpacetimeDB on 127.0.0.1:3000. I left one running for that purpose: pid 1248969, `spacetime start --data-dir /tmp/ci-fix-sb.MrYxjW/data --in-memory --listen-addr 127.0.0.1:3000` (own data dir, so it does not hold the default lock and `just ci`'s account-e2e is unaffected). Stop it after the merge with `kill 1248969` (confirm /proc/1248969/cmdline first). X1 is MANUAL (red/green record: gates/ci-fix-20261002T0501Z.red-before.md).

Residuals registered (all -> backlog): R-ci-fix-20261002T0501Z-DIALOGUEREBUILD (ux-a11y/MED, the root cause, client/src/ui), -DIALOGUESPECCLICK (loop-ops/MED: dialogue.spec.ts 13.5c-5 has the same swallowed 5 s pointer click and is the next red in line; it must stay a pointer press), -WALKEDAWAYROLLBACK (gameplay/LOW: advance_dialogue's delete-then-Err branches are rolled back, so a walked-away player keeps the conversation), -E2EARTIFACTS (loop-ops/LOW).

Until DIALOGUESPECCLICK lands, an e2e red on dialogue.spec.ts "advance did not apply within 8 attempts" is this same flake, not a regression: re-run the job.

Scratch left in place (recursive deletes are guard-blocked): /tmp/ci-fix-sb.MrYxjW (PoC specs + logs), /tmp/rt-sb.oioNlB (red-team), /tmp/vf-scratch.XpRcY5 (verifier). Spare databases mr-redteam and mr-verifier exist on the in-memory server and vanish when it stops.
## 2026-10-02T01:11:39Z — Tick mr-sup-native-20261002T010026Z-387247-3201: ctl-9 merged, ctl-6c + ctl-16 launched
ctl-9 merged (2f5355ea), master CI green. Launched ctl-6c (client, main.ts chain) and ctl-16 (server guards, hard tier) in parallel. Queue: ctl-7a. Trap: supervisor shell lacks cargo on PATH; export PATH=$HOME/.cargo/bin:$PATH before mr-audit/mr-gates verify or EVIDENCE-MISMATCH appears falsely.





## 2026-10-02T03:51:17Z — sup tick mr-sup-native-20261002T035025Z-1217409-24967: merged ctl-16
ctl-16 merged (PR#546, fb81c649). ctl-6c PR#545 CLEAN, ready for audit+merge next tick after master CI green; ctl-7a queued behind it.

## 2026-10-02T05:01:26Z — Tick mr-sup-native-20261002T050104Z-1240840-21979: master red -> ci-fix launch
master fb81c649 CI red: e2e 1/95 wallet-balance elder-oak quest_001 (run 36961955966) after ctl-16 talk-refuse-in-battle guard. Launched ci-fix-20261002T0501Z (fable/xhigh, revert-first). ctl-6c PR#545 CLEAN/green, awaiting audited merge once master green; queue ctl-7a.

## 2026-10-02T08:01:32Z — SUPERVISOR mr-sup-native-20261002T080038Z-1450797-14951 ctl-6c merged
ctl-6c PR#545 audited (CLEAN; 7 removed asserts = intentional Start-over-battle semantics inversion, surviving replacement tests in main.controls.test.ts; 3/3 gates met) and squash-merged as 009fe7b0. ci-fix PR#547 earlier restored master CI green (c03b2ff6). master CI on 009fe7b0 pending; ctl-7a queued, launch deferred until master CI green (CI-wait delegated to mr-ci-watch).

## 2026-10-02T07:14:04Z — mr-sup-native-20261002T071246Z-1442064-10691: merged ci-fix PR#547
ci-fix-20261002T0501Z merged (c03b2ff6). Master CI run 36977419311 in progress; ctl-6c PR#545 awaits audited merge next tick (re-verify mergeability vs new master), then ctl-7a.


## 2026-10-02T10:23:11Z — ci-fix-20261002T0901Z PR #548 ready — local gate green (flake root-caused, no revert)
Slice ci-fix-20261002T0901Z done at 95d52ad0 (branch ci-fix-20261002T0901Z, worktree projects/monster-realm/.claude/worktrees/ci-fix-20261002T0901Z). PR https://github.com/mdrewt/monster-realm/pull/548 is open and ready (never merged by the run); remote ci + e2e were in progress at hand-off.

Verdict on the master red (run 36981685927, ranked-forfeit RL-18 120 s timeout): a FLAKE with a product cause, NOT ctl-6c — no revert. `gh run rerun --failed` attempt 2 of 009fe7b0 is green, so master CI is green again at 009fe7b0. Cause (measured): PvpView.refresh replaced every lifecycle button on every store batch (8-10/s idle), so Playwright's un-timed pointer click on Accept kept retrying "element was detached"; the pre-ctl-6c client (c03b2ff6) behaves identically. Also measured on master: focus on Accept is dropped at each batch, and a mouse press held across a batch fires no click. Not proven: that the click (rather than browserB.close()) is what hung on the runner — both are now bounded and name themselves.

Fix: client/src/ui/pvpView.ts re-renders each of its three containers only when its JSON render key changed (hide()/null shell forget the keys; a throwing render leaves no key). Tests (tester, 2 rounds, opus): 19 new cifix0901-PVP-* unit tests; ranked-forfeit.spec.ts step 5b (focus on Accept survives 5 store batches), 30 s bound on the pointer click, bounded browserB.close(). Two pre-existing tests (20r-a PV-3, rb121-PVP-DETACH) had only their mid-flight refresh changed to a changed view-model — they pinned the defect in their preconditions; nothing deleted/skipped/loosened (verifier confirmed).

Gates: ledger 4/4 met (X1 unit 49/49, X2 ranked-forfeit e2e, X3 MANUAL red-before record gates/ci-fix-20261002T0901Z.red-before.md:14, X4 sibling PvP e2e 15/15). Local `just ci` CI-EXIT=0 on 95d52ad0 (2004 Rust, 3419 client). Lenses: plan reviewer + plan red-team; code reviewer, red-team (3 findings closed), simplify (no change), verifier PASS. No DECISIONS entry (bug fix).

SUPERVISOR NOTES
- X2/X4 CHECKs need a live SpacetimeDB on 127.0.0.1:3000. The private in-memory server left by ci-fix-20261002T0501Z (pid 1248969, --data-dir /tmp/ci-fix-sb.MrYxjW/data, cwd deleted) is still running and was reused; it does not hold the default data-dir lock (`just ci` ran green beside it). Stop it by PID when verification is done.
- Residuals registered (all backlog): R-ci-fix-20261002T0901Z-HELPHINTCOVERSACCEPT (ux-a11y/MED, measured: #help-hint covers the centre of the PvP Accept button at 1280x720; index.html), -MENUPVPHIDDEN (ux-a11y/MED, measured: PvP opened from Menu > Social > Challenges is hidden by the next batch; main.ts PvP batch listener counts the covered menu as another overlay — relevant to the console-controls milestone, consider before/with ctl-7a since it is main.ts), -VIEWREBUILD (ux-a11y/MED: other views unaudited for per-batch rebuild; evolution.spec Care click timed out on two 2026-10-01 runs), -PVPSPECCLICKS (loop-ops/LOW: pvp-side-b.spec.ts:333 and monster-privacy.spec.ts:483 un-timed Accept clicks).
- ctl-7a (serial on main.ts) is unblocked by this slice: main.ts was declared but not touched.
- Scratch left behind (recursive deletes are blocked): /tmp/ci-fix-0901-sb/ (probes, mutant runner, PoC patch, red-team rt/ dir, review snapshot), /tmp/ci-fix-0901-*.log, /tmp/verifier-0901-*.log.
## 2026-10-02T10:31:52Z — ci-fix-20261002T0901Z PR #548 CI green on rerun — sibling flake R-…-RAISINGVIEWREBUILD (HIGH)
PR #548 (95d52ad0) remote CI: ci green; e2e attempt 1 FAILED in a different spec — evolution.spec.ts:195 care.click timed out at 10 s with the call log "element was detached from the DOM, retrying" on the Care button (RaisingView rebuilds on every batch; this PR does not touch it; ranked-forfeit passed in that run). The run re-ran the failed job once (`gh run rerun 36994808192 --failed`): attempt 2 green, mergeStateStatus CLEAN. Not merged by the run.

Registered R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD as HIGH (ux-a11y): third CI red from this exact click in two days (36941559388 a2, 36925767914 a1, 36994808192 a1). Until it is fixed every PR's e2e can red on it — ctl-7a included. Suggested touches: client/src/ui/raisingView.ts + sibling test; same pattern as PvpView in #548 (value-keyed render per container, lock re-derivation unconditional); the tester will likely need to adjust raisingView tests that pin the rebuild.

## 2026-10-02T09:01:25Z — sup tick mr-sup-native-20261002T090045Z-1463148-24626: launch ci-fix-20261002T0901Z
master 009fe7b0 CI red: e2e ranked-forfeit.spec.ts:256 timeout (run 36981685927) after ctl-6c #545. Launched hard-tier ci-fix-20261002T0901Z (fable xhigh, revert-first). Stale mutex (dead owner 1450014) reaped via mr-unlock, retaken. ctl-7a remains queue head, serial behind fix. No BLOCKERs.




## 2026-10-02T10:38:33Z — supervisor: ci-fix-20261002T0901Z merged (PR #548)
Merged 8e4d49b7. Audit CLEAN, hard-tier diff read done. Master push CI run 36996130461 in progress; next tick verifies green then launches queued ctl-7a. Stale mutex (dead pid 1462377) reaped via mr-unlock before take.

## 2026-10-02T11:01:28Z — SUPERVISOR mr-sup-native-20261002T110051Z-1606701-30388: ctl-7a launched
Takeover of stale mutex (owner 1597548 dead). Master 8e4d49b7 CI green live. Reaped 4 dead run locks. Launched ctl-7a opus@high (leader 1607057). Next: on .done, audit+merge (hard-read not required, routine).

## 2026-10-02T13:57:17Z — ctl-7b PR #550 ready — local gate green
Slice ctl-7b done at fb5e6e8f (branch ctl-7b, worktree projects/monster-realm/.claude/worktrees/ctl-7b). PR https://github.com/mdrewt/monster-realm/pull/550 open (never merged by the run); remote CI not yet watched.

What: the battle/box/raising/evolution roots are class-styled .mr-frame.mr-shell (battle adds .mr-shell--top + new .mr-shell--battle z 110) and stay mounted in #app (inside #game-screen; main.ts untouched, because pvp/trade specs probe #app > div). Inline is only the display toggle + centring; evolution keeps its var(--mr-evo-*) colours inline. opacity:0.4 empties -> color #aaa. Folded R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD: RaisingView.refresh is render-keyed (locale + VM JSON, bigint as string), and hide() clears the keys.

Gates: ledger 1/1 (CTL7B.1 vitest JSON tags). Local just ci CI-EXIT=0 (2004 Rust, 3478 client, evals, observability). e2e locally: a11y 16/16 x3; encounter-battle, evolution, pvp, trade, movement-input and reduced-motion all green. Lenses: plan reviewer + red-team; code reviewer, red-team (12 survivors closed in tester round 2), /simplify (no change), verifier PASS. No DECISIONS entry. Spec build note added under ctl-7b in M-postgate-console-controls.spec.md (uncommitted in the harness repo).

SUPERVISOR NOTES
- Stopped the stale orphan spacetime pid 1248969 (ci-fix-20261002T0501Z; its worktree was deleted) by PID, as the earlier handoff asked. My own private server was also stopped. Nothing is listening on :3000.
- Trap hit: node evals/run.mjs rebuilds client-wasm/pkg in a shape the browser can't load (no apply_move export), so every e2e then times out at ready(). Run just wasm before Playwright after any eval run.
- Residuals: added R-ctl-7b-CTL7A3REST (MED) and R-ctl-7b-BOXVIEWREBUILD (LOW). Please disposition RAISINGVIEWREBUILD as fixed by #550. R-ctl-7a-CTL7A.3 is partially addressed. EVONOTICEUNDERSHELL is not foldable (evolutionNotice.ts is outside touches).
- Sandboxes left: /tmp/tmp.ibZIGsr4Vc (probes), /tmp/tmp.exw1QN58gI (red-team), plus the verifier's mktemp dirs and my spacetime data dir in /tmp/ctl-7b-sdb.dir.

## 2026-10-02T12:27:05Z — ctl-7a merged (PR#549)
Supervisor audited+merged ctl-7a at 8fc9e14b. Removed asserts all named intentional (help-hint -> chips). Post-merge master CI run 37006710072 delegated to mr-ci-watch; next tick: confirm green then launch next ctl slice per specs/monster-realm-v2/M-postgate-console-controls.spec.md.


## 2026-10-02T13:01:07Z — 2026-10-02T13:01:07Z — Launched ctl-7b (opus@high)
Gates: master 8fc9e14b CI green (run 37006710072); stale mutex (dead pid 1958114) reaped via mr-unlock, retaken via mr-lock. No open PRs/inflight; no HIGH/CRIT security/data residuals (only HIGH is ux-a11y RAISINGVIEWREBUILD). Next unbuilt console-controls slice per build order: ctl-7b (after ctl-7a). Launched leader 1967617, vars /tmp/mr_pass_ctl-7b.vars.json. Next tick: poll /tmp/mr_pass_ctl-7b.done, mr-audit + mr-gates verify, merge (feature PR, never auto-merge).

## 2026-10-02T14:16:08Z — ctl-7b merged (PR #550)
Merged e32bb771. Post-merge CI delegated to mr-ci-watch. Harness spec M-postgate-console-controls.spec.md carries ctl-7b build note, uncommitted. Next: next ctl slice per spec.

## 2026-10-02T15:03:24Z — ctl-8a parked
HIDDEN-DEPENDENCY STOP at build-loop step 1 (verify scope), before planning or tests. Branch ctl-8a pushed (b03f1c3b, empty wip commit; no code change). Draft PR https://github.com/mdrewt/monster-realm/pull/551 (do not merge) carries the full analysis. Worktree: projects/monster-realm/.claude/worktrees/ctl-8a. Master CI green (e32bb771).

The ctl-8 screens cannot be built inside their touches: because the ctl-6b seam does not reach them:
1. router.ts:153-165 delivers D-pad edges to nav ONLY while the main menu is the uncovered nav frame (main.ts routeCtx builds nav from menuPlace()). Under a dialogue/shop/heal frame they are SWALLOWED, so no screen adapter ever sees Up/Down/Left/Right.
2. No per-screen nav state host. screens/index.ts:59 passes nav=undefined. Frames carry no nav. onButton returns no next state. Only the main menu is stateful, hosted by hand in main.ts (menuState/applyMenuStep/renderMenu). The milestone rules forbid module state.
3. B13: the Command arm in screens/types.ts is {kind:'healParty'} with no locationId, and main.ts dispatch uses healTargetLocationId(locations[0]). CTL8A.3 needs the arm plus the dispatch change.

PROPOSAL: insert a seam slice (ctl-8s0 or similar) into the main.ts chain after ctl-7b and before ctl-8a. touches: client/src/input/router.ts, router.test.ts, client/src/ui/screens/types.ts, screens/index.ts, screens/index.test.ts, screens/legacyAdapter.ts(+test), client/src/main.ts, main.controls.test.ts, main.input.test.ts, main.dispatch.test.ts. It generalizes router nav to 'the top frame is a nav screen', gives adapters onButton(vm, state, btn) -> {state, result} with main.ts holding per-FrameId state (reset on open, repaint after each step), and adds healParty{locationId?}. This gap blocks ctl-8b..8k as well, so the milestone line 'ctl-8a-8k never touch main.ts' needs this seam to exist first. ctl-8a then fits its current touches unchanged. Gates ledger untouched (0/4, nothing deferred). Spend ~$3.
## 2026-10-02T15:22:22Z — supervisor tick mr-sup-native-20261002T152056Z-2168783-3891: ctl-8a parked -> ctl-7c seam spec
ctl-8a hidden-dependency park verified live (router.ts D-pad only reaches main menu nav). Inserted ctl-7c (router nav delivery, shell-hosted adapter state, healParty{locationId?}) before ctl-8a in M-postgate-console-controls.spec.md via claude-harness#151 (merged). queue head = ctl-7c; next tick: mr-gates seed/launch ctl-7c (hard tier, main.ts chain, tier=hard reason=router/netcode-adjacent input seam). ctl-8a resumes after ctl-7c merges (rebase wip branch ctl-8a; PR #551 draft). master CI green e32bb771.
## 2026-10-02T17:46:44Z — ctl-7c PR open (#552)
ctl-7c PR OPEN: https://github.com/mdrewt/monster-realm/pull/552 (branch ctl-7c @ 5dbeeb03, worktree .claude/worktrees/ctl-7c). Local `just ci` green on that head (CI-EXIT=0: nextest 2004/2004, evals 0 FAIL, client 148 files / 3499 tests, observability 8/8). mr-gates: 3/3 met with evidence, 0 deferred. Lenses: planner, reviewer + red-team + simplify (plan and code), tester opus x3 rounds, verifier PASS; reducer-security/desync N/A (client-only). No DECISIONS entry. Merge is supervisor-owned.

What landed: router `nav.screen` (D-pad + repeats to a nav-capable top screen's adapter), `ScreenHost` in screens/index.ts (per-FrameId adapter state, lazy init, reset on the stack's push edge, one paint per step into the view main.ts lends, paint errors surfaced), `ScreenAdapter<VM,S,V>` = nav? / init / onButton -> {state,result} / paint?, `healParty { locationId? }`. No screen converted; the menu stays hand-hosted. Lens-found fixes (also change the menu path, named in the PR): resetRepeat forgets held-press order; base-kind change and reconcile drop reset the repeat.

BEFORE RELAUNCHING ctl-8a (PR #551): the ctl-8a dry-run found four more main.ts/types.ts needs that this slice's three criteria do not cover. They are NOT built. ctl-8a will hit a hidden-dependency STOP again unless they are re-serialized first (a small seam slice; every file is inside ctl-7c's touches):
- R-ctl-7c-BOUNDIDS (MED): boundShopId / boundHealLocationId are main.ts-private; shop/heal adapters cannot know their binding (needed for buy {shopId} and healParty {locationId}). Two read-only ScreenContext values.
- R-ctl-7c-SHOPQTY (MED): buy/sell carry no quantity; dispatch sends SHOP_QTY = 1 (CTL8A.2 quantity row).
- R-ctl-7c-SHOPPICK (MED): greet-then-shop opens the shop only via the document click delegate; A on that choice needs a Command arm + COMMAND_BATTLE_POLICY row.
- R-ctl-7c-REDUCEDMOTION (LOW): reduced-motion preference is main.ts-private (CTL8A.1 reveal).
Also R-ctl-7c-HEALGUARDTEST (LOW, backlog, pre-existing): healParty's sendGuarded path is untested on both arms.

Spec gaps for ctl-8a's touches: add client/src/ui/screens/index.test.ts (CTL6B-1-ADAPTERS-TOTAL and CTL7C-1-NAV-CAPABLE pin an all-legacy shipped table; the first swapped entry must update both).

SUPERVISOR TODO (harness repo, uncommitted): specs/monster-realm-v2/M-postgate-console-controls.spec.md has the ctl-7c build note; specs/monster-realm-v2/console-controls-design.md §12 carries the new onButton signature; plan at memory/projects/monster-realm-ctl-7c-plan.md. Scratch sandboxes left in /tmp (guard blocks recursive deletes): /tmp/ctl7c-rt.qzxQBa, /tmp/ctl7c-vf.MeN3GW, /tmp/vf-mut.
## 2026-10-02T20:29:29Z — ctl-7d PR open
ctl-7d PR OPEN: https://github.com/mdrewt/monster-realm/pull/553 (branch ctl-7d @ 140e1813; worktree projects/monster-realm/.claude/worktrees/ctl-7d). Local just ci green (CI-EXIT=0: nextest 2004/2004, 15 evals, client 3520/3520, observability 8/8); mr-gates 6/6 met, 0 deferred. Built: ScreenContext shopId/healLocationId/reduceMotion (live getters), buy/sell qty with u32 reject-not-clamp, four shop.feedback.{buy,sell}.{item,count} ids replacing purchased/sold, pickShop Command arm (refuse at battle; the [data-shop-id] click dispatches it), ScreenHost.observe in the last batch listener. No screen converted. Lenses: plan reviewer+red-team, code reviewer, red-team (52+130 mutants; 14 survivors closed by a second tester round), desync-guard PASS, /simplify, verifier(opus) PASS. Tester: 2 parallel opus invocations + 1 follow-up round each. Residuals registered: R-ctl-7d-CTL7D.1 (heal view not hidden on reconnect -> ctl-10a), R-ctl-7d-CTL7D.3 (shop/item ids not u32-validated, backlog), R-ctl-7d-CTL7D.4 (server sell over-quantity says 'active trade', backlog), R-ctl-7d-CTL7D.6 (paint-error dedupe floods with two throwing adapters -> ctl-10a). Unregistered test gap: nothing pins that observe runs ONLY on a batch (verifier mutant M4) - add one assertion to CTL7D-6-BOOT-OBSERVE in the next slice that edits main.dispatch.test.ts. SUPERVISOR TODO: (1) harness spec M-postgate-console-controls.spec.md has an UNCOMMITTED ctl-7d build note (main checkout); (2) after merge close R-ctl-7c-BOUNDIDS/-SHOPQTY/-SHOPPICK/-REDUCEDMOTION (residuals close --slice ctl-8a --force --reason 'delivered by ctl-7d'), then resume ctl-8a; (3) remote e2e not run locally - shop-npc.spec.ts and wallet-balance.spec.ts click [data-shop-id], now routed through dispatch (unchanged at a world base); (4) pre-existing flake: ui/shopOpenModel.test.ts CTL3-5-NO-DOUBLE-SEND unseeded fast-check floor fails ~1 run in 200. Budget warn flag fired before the last tester round could be extended; no park. Scratch left in /tmp/ctl-7d-rt.FGIhsV (sandbox clone + mutant scripts). Merge is supervisor-owned.
## 2026-10-02T16:01:03Z — Supervisor tick mr-sup-native-20261002T160042Z-2176999-32397: launched ctl-7c
Master e32bb771 CI green (nightly for 8fc9e14b in progress). Stale mutex (dead owner 2166115) released, retaken. Launched ctl-7c hard tier fable@xhigh from queue head (leader 2177231). ctl-8a parked, PR #551 open, resumes after ctl-7c merges. Risk: FEEDBACK-UNDISPOSED op-2026-10-01-controls-001..004 flagged by wrapper; not handled this tick.




## 2026-10-02T18:03:22Z — sup tick ctl-7c merged; spec-ctl-7d launched
ctl-7c MERGED (PR#552 -> 04a07833), mr-audit read + adjudicated (api-rename assertion migrations, no weakening). Master CI: PR ci/e2e green; Nightly for 8fc9e14b in progress, prior 3 green. Mutex stale (dead owner 2176268) released+retaken. DID NOT resume ctl-8a: ctl-7c's own build note lists 4 gaps still blocking it outside its touches (bound shop/heal ids, shop qty, shopPicked Command arm, reduced-motion). Launched spec-ctl-7d (opus@high, routine, harness doc-only; leader 2326106) to author seam slice ctl-7d before ctl-8a and fold in the uncommitted ctl-7c build notes in the harness main checkout (those strays will conflict with the merged PR; labeled-stash/drop at merge). ctl-8a queued (PR#551 stays open). Next tick: await spec-ctl-7d .done, audit, merge doc PR (--squash --auto ok), launch ctl-7d hard tier. Risk: FEEDBACK-UNDISPOSED op-2026-10-01-controls-001..004 still flagged.
## 2026-10-02T18:28:24Z — 2026-10-02T18:28Z tick: spec-ctl-7d merged, ctl-7d launched
Harness PR#152 merged (e9d849b). Launched ctl-7d (fable@xhigh, hard) leader=2428046; ctl-8a PR#551 stays parked, queued behind it. After ctl-7d merges: residuals close for R-ctl-7c-BOUNDIDS/-SHOPQTY/-SHOPPICK/-REDUCEDMOTION (--slice ctl-8a --force --reason 'delivered by ctl-7d'), then resume ctl-8a.

## 2026-10-02T21:01:54Z — ctl-7d merged; master e2e rerun pending
ctl-7d PR#553 merged (729d488a), audit CLEAN/adjudicated. Master run 37062826845: ci green, e2e red on dialogue.spec 13.5c-5 (known recurring flake, walked_away x8; PR e2e green). Rerun of failed job triggered. If rerun green -> proceed to resume ctl-8a (parked PR#551, hard tier, seam now landed); if red again -> ci-fix per gate 3. Worktrees ctl-7d to remove after confirmation.


## 2026-10-02T21:10:52Z — ctl-8a resumed
Master 729d488a CI green after rerun of known-flaky 13.5c-5. ctl-7d worktree/branch removed. ctl-8a launched hard (leader 2834426), reusing draft PR#551; supervisor merges after audit.

## 2026-10-02T23:34:33Z — ctl-8a merged; ctl-8b launched (2026-10-02T23:34:33Z)
ctl-8a (Dialogue/Shop/Heal D-pad) merged as 87314462 after audit CLEAN. Master CI: e2e dialogue 13.5c-5 flaked once (every attempt rejected walked_away), green on rerun — watch for recurrence given dialogueView changes; if it recurs treat as ci-fix. Open residuals R-ctl-8a-CTL8A.1/.2 (mr-dock rename in ctl-8i). Launched ctl-8b (opus@high routine), leader 2977746.
## 2026-10-03T00:32:55Z — ctl-8b PR open
ctl-8b (Monsters I) PR mdrewt/monster-realm#554 open, local just ci green, gates 4/4 met. No main.ts/router.ts change. Residuals: R-ctl-8b-CTL8B.2 (X quick Move -> ctl-11a), -CTL8B.4 (menu opens on Storage -> ctl-11a), -CTL8B.3 (pointer rename -> ctl-15), -CTL8B.2-ANNOUNCE (-> ctl-13). R-ctl-6c-MONSTERSRO (targeted ctl-8b) NOT delivered: needs menuModel.ts/mainMenuScreen.ts outside touches — retarget. Spec build note added to M-postgate-console-controls.spec.md (harness, uncommitted). e2e not run locally.
## 2026-10-03T00:58:31Z — ctl-8b merged, ctl-8c launched
ctl-8b merged as 547a087a (PR#554), master CI green. Stale queue entry ctl-8a removed. Launched ctl-8c (opus@high, leader 3146407). Open HIGH ux-a11y residual R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD unpromoted (not sec/data; not outranking roadmap); raisingView is in ctl-8c touches.

## 2026-10-03T01:00:18Z — ctl-8c parked
ctl-8c PARKED at VERIFY SCOPE on a hidden dependency, before any code (no PR; branch ctl-8c == origin/master 547a087a, nothing pushed; clean worktree .claude/worktrees/ctl-8c is reusable). (1) CTL8C.1 needs client/src/ui/boxView.ts + boxView.test.ts: the sheet is painted only by boxView (SHEET_LABELS Record<SheetAction> boxView.ts:59-63, used at :372; FEEDBACK_TEXT Record<MonstersFeedback> :85-86), and monstersScreen.paint receives only the BoxView. Extending SheetAction is a tsc error there. Command arms care/train/evolve already exist (screens/types.ts:26-28), so main.ts is not needed for CTL8C.1. (2) CTL8C.2 needs main.ts: frames come only from visibleIds(overlayProbes) (main.ts:571, table :411), the banner is deliberately not an OverlayId (evolutionNotice.ts:5-15) and is rendered by a main.ts batch listener (:2619). A prompt frame needs main.ts + overlayRegistry.ts + screens/index.ts + contextStack.ts. (3) CTL8C.3 already holds on master (main.ts:2042-2066). Re-serialize suggestion: ctl-8c touches += boxView.ts, boxView.test.ts; move CTL8C.2 to ctl-13 (already owns main.ts + noticeModel; design §5 groups the notice prompt with the error toast). Details: memory/projects/monster-realm-ctl-8c-progress.md.

## 2026-10-03T01:00:57Z — ctl-8c parked — branch pushed
Correction to the 'ctl-8c parked' entry: branch origin/ctl-8c is pushed at 10ad9b24 (one empty wip park commit on 547a087a; no code, no PR). Blocker unchanged: CTL8C.1 needs boxView.ts + boxView.test.ts in touches; CTL8C.2 needs main.ts (suggest -> ctl-13). Memo: memory/projects/monster-realm-ctl-8c-progress.md.


## 2026-10-03T01:01:46Z — ctl-8c parked — draft PR #555
ctl-8c park is now pushed (origin/ctl-8c @ 10ad9b24, an empty wip commit) and recorded in a DRAFT PR https://github.com/mdrewt/monster-realm/pull/555 (not for merge, no code). Blocker: CTL8C.1 needs boxView.ts + boxView.test.ts in touches; CTL8C.2 needs main.ts (suggest -> ctl-13). After re-serializing, resume in the worktree .claude/worktrees/ctl-8c on the same branch and PR. Memo: memory/projects/monster-realm-ctl-8c-progress.md.
## 2026-10-03T01:19:53Z — ctl-8c re-serialized (harness PR #153)
Park memo's FIX applied to M-postgate-console-controls.spec.md and merged. Next: resume ctl-8c (opus@high routine; reseed gates via mr-gates reseed --reason, since spec criteria changed: CTL8C.2 removed). Draft PR #555 is the park record — reuse the branch, then open/convert the real PR.

## 2026-10-03T02:01:17Z — Supervisor mr-sup-native-20261003T020044Z-3202073-21631: resumed ctl-8c
Master 547a087a green (ctl-8b #554 merged). PR #555 = wip park record (never merge). Reseeded ctl-8c gates, launched hard-tier fable@xhigh (leader 3202393). CTL8C.2 still seeded in gates but moved to ctl-13/CTL13.5; run told to DEFER it. Next tick: await .done, audit, merge PR (retitled), then ctl-8d.

## 2026-10-03T03:46:41Z — ctl-8c PR #555 open, local green, index.test.ts hidden-dependency flagged
ctl-8c — PR #555 OPEN, ready for review, local gate green; STOPPED at valid stopping point (1).
- Branch ctl-8c @ b425dae9 (on master 547a087a); worktree projects/monster-realm/.claude/worktrees/ctl-8c clean. PR https://github.com/mdrewt/monster-realm/pull/555 (retitled, body carries the mr-gates render + lenses).
- Gates: CTL8C.1 PASS, CTL8C.3 PASS (mr-gates check), CTL8C.2 DEFER -> ctl-13 (CTL13.5). NOTE: the DEFER tag is written `[gameplay/MED]` with "category ux-a11y" in the reason: mr-gates' DEFER_LINE regex (`[A-Za-z-]*`) rejects the digits in `ux-a11y` (PARSE-ERROR, 0 deferred) — apparatus finding, not DEFERred.
- Local `just ci` CI-EXIT=0 on the final tree (2004 Rust, 3626 client tests, 15 evals). Local e2e evolution.spec + a11y.spec 19/19 (needs MR_DEV_MODULE_WASM=target/wasm32-unknown-unknown/release/monster_realm_module.wasm under setsid; memory note written).
- HIDDEN DEPENDENCY, proceeded (flagged in PR touches-delta): client/src/ui/screens/index.test.ts (not a sibling of a declared file) needed fixture-only edits to CTL8B-4-HOST-FLOW (store fake gains ownInventory/itemDefs; "Down, Down" -> one Up under the design-§5 sheet order). Supervisor: add it to ctl-8c touches (spec re-serialize) or bounce.
- Residuals registered: R-ctl-8c-CTL8C.1 (Care from the sheet has no outcome line; performCare -> hidden raisingView.showFeedback; -> ctl-13, MED), R-ctl-8c-CTL8C.1-RAISINGSTRIP (raising root keeps Care/Train cards; needs main.ts + main.* tests; -> ctl-11b, LOW).
- Spec amendments for the supervisor: line ~658 ("the evolution root hosts the Evolve… list" — it is a BoxView part; no open-frame Command), lines ~706/~1214 ("inventory only since ctl-8c" — not true until the raising strip lands), build note for ctl-8c.
- Lenses: plan reviewer+red-team (folded, plan rev 2), artifact reviewer (8 minors fixed), artifact red-team (contrast + hidden-text fixes, 3 new pins measured red), verifier PASS, /simplify no change. Budget: 6 subagent calls (~2.1M subagent tokens) + orchestrator; under the $150 target; /tmp/mr_warn_ctl-8c appeared at the end, converged.

## 2026-10-03T04:03:10Z — ctl-8c merged (supervisor)
PR #555 merged as b95fc62f; audit FLAGGED(hard-tier read) -> adjudicated legit. Master CI 37095119181 in progress at tick end; next tick: verify green, then launch next unfinished ctl slice per spec order.

## 2026-10-03T05:01:02Z — sup tick mr-sup-native-20261003T050032Z-3427839-11843: reaped stale mutex+ctl-8c lock; launched ctl-8d
ctl-8c already merged (b95fc62f), master CI green (37095119181). Reaped stale mutex (dead owner 3417020) and ctl-8c run lock. Launched ctl-8d (opus@high routine, leader 3428273). Queue: ctl-8e. ctl-10a follows 8e.
## 2026-10-03T05:04:29Z — ctl-8d parked
Draft PR mdrewt/monster-realm#556 holds the analysis; progress file monster-realm-ctl-8d-progress.md.


## 2026-10-03T08:09:08Z — ctl-8s PR open
ctl-8s PR OPEN: https://github.com/mdrewt/monster-realm/pull/557 (branch ctl-8s @ 22acccb4; worktree .claude/worktrees/ctl-8s). Local `just ci` green at that head (Rust 2004, 15 evals, client 3643/3643, observability); mr-gates 3/3 met, 0 deferred. Local e2e against a private in-memory spacetime + dev_reducers wasm: 109 passed, 1 skipped (recruit R4, pre-existing fixme); trade/pvp/pvp-side-b/ranked-forfeit pass unmodified.

What it is: the Social seam. (1) Frame id `social` (first non-overlay FrameId); mirrorEdges folds tradeView/pvpView/leaderboardView into it; one `openSocial(tab)` for U/P/L, the three menu leaves and the challenge auto-show; roots not re-parented, ids/probes/handles unchanged. (2) `ScreenContext.socialTab`. (3) `ScreenAdapter.remember` + `init(vm, remembered?)`, `ScreenHost.forget()` (first connect + reconnect) and `ScreenHost.seat()` (init + paint at the open; only openSocial calls it). The Social adapter is lent `SocialFrameView { trades, challenges, rankings, chrome, show(panel) }`; `SCREEN_ADAPTERS.social` is the legacy adapter until ctl-8d.

For ctl-8d (resume draft #556 by rebasing `ctl-8d` on master once #557 merges): the seam map is in the spec build note under §ctl-8s. Key points: swap `SCREEN_ADAPTERS.social`; switch panels ONLY through `view.show(panel)` (never call `hostChrome` directly); honour a non-null `ctx.socialTab` before the oldest-waiting-request rule; with Social open, the shown panel's key and the opening key close it.

touches-delta: main.controls.test.ts, main.menu.test.ts (stack pin -> social), main.social.test.ts (new, real views), main.feedbackI18n.test.ts (comment). Spec build note added under §ctl-8s (harness spec file, uncommitted in harness); plan at memory/projects/monster-realm-ctl-8s-plan.md.

Not closed here: the U/P/L open's worldHasFocus() gate has no test (mutant survives on master too); PvpView.refresh(vm,false) has no production caller left; SCREEN_POLICY.social (drop) vs the menu's leaderboardView row (battle-safe) agree only while Rankings is in HIDDEN_UNDER_BATTLE. Sandboxes left in /tmp: ctl-8s-mut.QcTMMW, ctl8s-redteam.ZmG6O4, ctl8s-redteam.NtpYez, ctl-8s-stdb.* (recursive delete is guard-blocked). Merge is supervisor-owned.
## 2026-10-03T05:22:39Z — ctl-8d parked -> ctl-8s seam inserted (2026-10-03)
Run parked with no code (hidden dependency: ScreenHost resets state on open; Social needs one frame over three roots). Supervisor chose Option A: spec PR claude-harness#154 adds ctl-8s (cross-open memory, ScreenContext.socialTab, openSocial(tab), one Social frame) and makes ctl-8d after:[ctl-8s]. Next tick: launch ctl-8s (tier=hard; reason=main.ts/netcode-adjacent seam, structural), then resume ctl-8d on branch ctl-8d (draft PR monster-realm#556) rebased on master. Queue head ctl-8e stays (after ctl-8d).



## 2026-10-03T06:01:08Z — SUPERVISOR mr-sup-native-20261003T060041Z-3482810-29: launch ctl-8s
Reaped stale mutex; launched ctl-8s (fable xhigh, hard) leader=3483058. ctl-8d parked wip PR #556 (after ctl-8s). Queue: ctl-8e. Master b95fc62f green.
## 2026-10-03T08:35:42Z — ctl-8s merged; ctl-8d resumed
ctl-8s (Social seam) merged as bff037e7 after audited hard-tier read; master CI green. ctl-8d relaunched hard (fable xhigh) against the seam, PR#556 draft; queue head ctl-8e is its serial successor.
## 2026-10-03T10:24:32Z — ctl-8d PR open — local green, 3/3 gates
ctl-8d (Social I, CTL8D.1-3) is built: PR mdrewt/monster-realm#556 is READY (was draft), head bac0586b on branch `ctl-8d`, rebased on master bff037e7 (ctl-8s). Merge is the supervisor's.

- Gates: `mr-gates check --slice ctl-8d` 3/3 met, 0 deferred. Local `just ci` green on bac0586b (2004 Rust tests, 157 client test files / 3671 tests, 15 evals, CI-EXIT=0). Full local Playwright suite on bac0586b: 111 passed, 1 pre-existing skip.
- No main.ts change, no new Command arm. 21 files: the 17 declared plus sibling tests `screens/socialScreen.test.ts`, `screens/socialScreen.boot.test.ts`, `screens/index.test.ts`, `i18n/catalog.test.ts` (touches-delta in the PR).
- Lenses: plan (survey, reviewer, red-team), tester x2 (opus), artifact reviewer + red-team (160 mutants) + verifier APPROVE. `reducer-security-auditor` / `desync-guard` not applicable (client UI only).
- Residuals registered, all -> ctl-13: R-ctl-8d-CTL8D.1-PLAINOPEN (no production open path binds a null tab, so the waiting-request tab choice and the remembered tab are adapter/host-tier only), R-ctl-8d-CTL8D.2-ANNOUNCE, R-ctl-8d-CTL8D.2-FEEDBACK, R-ctl-8d-CTL8D.2-CANCELPROMPT (Cancel has no prompt: a design call).
- Harness side, uncommitted for the supervisor: the ctl-8d build note in `specs/monster-realm-v2/M-postgate-console-controls.spec.md` (section ctl-8d), the plan `memory/projects/monster-realm-ctl-8d-plan.md`, the ledger `gates/ctl-8d.gates.md`.
- /tmp/mr_warn_ctl-8d was raised during the artifact lenses; the run converged without further fan-out (two tester resumes for lens-driven assertions, one verifier).
- Scratch left in /tmp (deletes are guard-blocked): /tmp/ctl-8d-sandbox, /tmp/ctl-8d-rt.K0Kq3h, /tmp/ctl-8d-stdb.*, /tmp/rt8d-tools, logs /tmp/ctl-8d-*.log. No server or dev process left running.

## 2026-10-03T10:32:38Z — ctl-8d merged — Social I on the D-pad; ctl-8e next
ctl-8d (Social I) merged: PR mdrewt/monster-realm#556 at 6056f80b, master CI green. Audit adjudicated: three removed index.test.ts assertions were inverted to the new socialScreen/13-legacy-id state, with CTL8D-1-HOST-REMEMBERS covering host memory. Worktree and branch removed. Next: ctl-8e (trade-propose wizard).

## 2026-10-03T11:43:20Z — ctl-8e merged; ctl-8f launched (2026-10-03T11:43:20Z)
ctl-8e (trade-propose wizard, B5) merged as b142412b (PR #558); audit removed_checks adjudicated legit (roster 13->12, Escape/Enter ownership moved to router with replacement tests). master CI green. Launched ctl-8f (Bag pockets + Journal), opus@high routine, leader 4008691. Note: harness working tree has uncommitted ctl-8d/8s/8e spec build notes in M-postgate-console-controls.spec.md awaiting a docs(spec) chore PR.
## 2026-10-03T14:04:09Z — ctl-8g PR open (#560)
ctl-8g (Social II: Players and Rankings) — PR mdrewt/monster-realm#560 OPEN, local `just ci` green (CI-EXIT=0; nextest 2004, vitest 164 files/3786, 0 eval FAIL, observability 8/8). Branch ctl-8g @ worktree .claude/worktrees/ctl-8g. Merge is supervisor-owned.
- Gates: CTL8G.2 met (mr-gates check PASS). CTL8G.1 DEFERRED -> backlog (category written as gameplay/LOW because the ledger DEFER regex rejects digits in `ux-a11y`).
- HIDDEN DEPENDENCY (for re-serialization): CTL8G.1's "zone name" needs client/src/net/connection.ts (subscribe zone_def), client/src/net/store.ts (zone map) and the exact-pinned client subscription-set eval — none in ctl-8g touches. Everything else in CTL8G.1 shipped (online list, Nearby badge at NEARBY_TILES=12, walk-up hint) and is test-gated (CTL8G-1-*). Residual R-ctl-8g-CTL8G.1 (backlog).
- touches-delta: screens/socialScreen.test.ts, screens/socialScreen.boot.test.ts, i18n/catalog.test.ts (siblings) + screens/index.test.ts (FLAGGED non-sibling: socialHostCtx stub gains allPlayers/characters/allProfiles; two Players pins -> leaderboardView).
- Residuals added: R-ctl-8g-CTL8G.1 (zone, backlog), -ANNOUNCE (-> ctl-13), -UCLOSE (-> ctl-11a; U no longer closes Social on Players), -DEADPATH (tradeView Players placeholder + contextStack comment stale, backlog).
- Spec build note for ctl-8g added to the harness working tree (uncommitted, with the other batched notes).
- Tooling note: mr-gates DEFER_LINE category class `[A-Za-z-]*` cannot parse `ux-a11y` (second slice to hit it, cf. ctl-8c).
- Sandbox left: /tmp/tmp.bh3ZoXLmsH (detached red-team worktree `rt` of ctl-8g — `git worktree remove` it; recursive delete is guard-blocked for agents).
## 2026-10-03T13:14:56Z — 2026-10-03T13:14Z native tick: ctl-8f merged, ctl-8g launched
ctl-8f PR#559 merged e03e5e4f after audit (removed 12-legacy-ids assertion replaced by 10 + identity pins). Master CI first red on docker registry pull flake in observability-validate; rerun green (no code fault, no ci-fix). Launched ctl-8g (opus@high routine). Unpromoted HIGH residual R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD is ux-a11y so does not outrank roadmap; ctl-8f raisingView rework may supersede it.


## 2026-10-03T14:21:58Z — ctl-8g merged (supervisor)
PR #560 merged -> master 80420b6b. Stale mutex (dead owner 4123142) reaped. Master CI run 37129325373 pending at merge; next tick: verify green, then resume ctl sequence (next unbuilt slice per M-postgate-console-controls spec).

## 2026-10-03T15:01:08Z — 2026-10-03T15:01Z — sup tick mr-sup-native-20261003T150050Z-60252-21708: launch ctl-8h
Master 80420b6b CI green (ctl-8g merged). Stale mutex (dead owner 50925) reaped; ctl-8h launched opus@high leader=60403. No open PRs, queue empty. Next after ctl-8h: ctl-8i.


## 2026-10-03T15:52:31Z — ctl-8h PR open
ctl-8h PR OPEN: https://github.com/mdrewt/monster-realm/pull/561 (branch ctl-8h @ 4be3c81b; worktree .claude/worktrees/ctl-8h). Local just ci green (CI-EXIT=0; client 166 files / 3809 tests). mr-gates 4/5 met + CTL8H.1 DEFER -> backlog (relabel needs menuModel.test.ts:124-125 + mainMenuScreen.test.ts:444, outside touches — hidden dependency). Profile row screens (profileScreen.ts: nameScreen/accountScreen/privacyScreen; DOM focus is the cursor, one-shot RowOp tokens), B2 claim title/body shown, B3 claim+privacy anchored .mr-frame .mr-shell in #frame-layer, B5 submit shield lets D-pad/B through, No-default confirms (disarm after Confirm seats nothing — red-team HIGH fixed). R-ctl-6b-CTL6B.5 NOT closed: main.controls.test.ts:1489-1521 pins focus-on-page for an empty draft; needs that file in touches to re-target. New LOW residual candidates: Backspace on focused Save pops Name and clears the draft; claim decline stays armed across close (pre-existing S4). Spec as-built note added under CTL8H.5 (harness spec file, uncommitted). Remote e2e (accounts/rename specs edited) not run locally — watch the PR e2e job. Merge is supervisor-owned.

## 2026-10-03T16:10:33Z — ctl-8h merged
PR#561 squash-merged as f372a234 after audit CLEAN. CTL8H.1 relabel deferred (R-ctl-8h-CTL8H.1: menuModel.test.ts:124-125 + mainMenuScreen.test.ts:444 pin English labels). Master CI running; next tick: verify green then launch next ctl slice.

## 2026-10-03T17:57:35Z — ctl-8i PR open
ctl-8i (Battle I) PR https://github.com/mdrewt/monster-realm/pull/562 open; local just ci green (CI-EXIT=0, 3824 client tests); mr-gates 3/3 met. Lenses: plan reviewer+red-team, impl reviewer (no blockers), red-team (87 mutants, 74 killed; 2 real bugs fixed: PvP Bag/cure items, battle-start first press), verifier APPROVE. Hidden dependencies for re-serialization: R-ctl-8a-CTL8A.1 (.mr-dock -> .mr-shell--dock) needs client/src/styles.css + ui/dialogueView.ts(+test), outside ctl-8i touches — NOT done; R-ctl-6c-STALETEXT partially addressed (comments fixed) — folding battleButton needs ui/contextStack.ts + main.ts, and baseButton's battle arm is still called by contextStack.test.ts. ctl-8j follow-ups: selects -> lists, retire legacy Flee once e2e use Run, merge the two waiting captions, give the battle base its own ScreenHost state slot before CTL8J.2. Spec as-built note added (uncommitted) under ### ctl-8i in M-postgate-console-controls.spec.md.

## 2026-10-03T17:01:11Z — 2026-10-03T17:01:11Z — launch ctl-8i
master f372a234 CI green. Launched ctl-8i (Battle I, opus@high, leader 179532). ctl-8j follows serially. Stale mutex (dead 167409) reaped.


## 2026-10-03T18:17:19Z — ctl-8i merged
ctl-8i #562 merged (0a773d54). Master CI in_progress (run 37143490330), mr-ci-watch delegated. Next: ctl-8j after master green. Harness spec as-built notes (ctl-8h/8i) remain uncommitted in M-postgate-console-controls.spec.md.


## 2026-10-03T19:01:07Z — ctl-8j launched (mr-sup-native-20261003T190038Z-309320-22703)
Master 0a773d54 CI green. Launched ctl-8j (leader 309694, opus@high). Next after merge: ctl-8k.
## 2026-10-03T19:54:13Z — ctl-8j PR open
ctl-8j (Battle II) PR https://github.com/mdrewt/monster-realm/pull/563 open, branch ctl-8j @ e83be915. Local just ci green (CI-EXIT=0; client 168 files / 3843 tests). mr-gates 2/3 met + CTL8J.3 DEFER -> ctl-13: Monsters is disabled over a battle (SCREEN_POLICY.boxView not battleSafe) — R-ctl-6c-MONSTERSRO was closed by #554 WITHOUT the change (PR says Not delivered); enabling needs contextStack.ts + mainMenuScreen.ts + a read-only monstersScreen mode. CTL8J.2 CHECK is Playwright: needs a live SpacetimeDB on 127.0.0.1:3000. Residuals added: R-ctl-8j-SELECTINERT -> ctl-11a (main.ts toggleHelp worldHasFocus), -PVPTIMER -> ctl-13 (menuView.ts), -MENUCOPY -> ctl-13 (Close copy; battleBag half resolved), -MASHRECRUIT -> backlog LOW. touches-delta: i18n/catalog.test.ts (sibling). recruit.spec R1/R2 press No bait before recruit-action (named). Spec as-built note added under ### ctl-8j (harness working tree, uncommitted). Scratch left: /tmp/ctl-8j-sb.* (stopped in-memory server dirs), red-team worktree /tmp/tmp.3uFhdQl5Bw/rt (git worktree remove it). Merge is supervisor-owned.
## 2026-10-03T20:19:26Z — sup tick mr-sup-native-20261003T201114Z-422727-5686: merged ctl-8j, launched ctl-8k
ctl-8j PR#563 merged (fe476b5b), master CI green live. Stale mutex (dead 308095) reaped. Launched ctl-8k opus@high (leader 426510). Next: audit+merge ctl-8k on .done, then ctl-10a-serial chain per spec order. No BLOCKERs.
## 2026-10-03T20:56:48Z — ctl-8k PR #564 ready — local gate green
Slice ctl-8k done at 16eeb98c (branch ctl-8k, worktree projects/monster-realm/.claude/worktrees/ctl-8k). PR https://github.com/mdrewt/monster-realm/pull/564 open (never merged by the run); remote CI not watched.

What: the session gate (sessionView) is a .mr-frame.mr-shell.mr-shell--top frame in #frame-layer with a visible title/body, labelled Retry + Continue as guest, a No-default Yes/No confirm, a feedback line and a 'B and Start do nothing here' hint; Retry focused on open (native Enter/Space), arm->No, disarm->Continue, repeat Enter suppressed. VM gains retryLabel/confirmYesLabel/confirmNoLabel/hint; new ids session.retry, session.hint (session.* namespace avoids resolver.test.ts's chrome.* snapshot).

Gates: ledger 1/1 (CTL8K.1 vitest JSON, 22 tags). Local just ci CI-EXIT=0 at e4997f74; round-2 commit touched only the view guard/comments/FR hint/tests, verifier re-ran client 3873/3873 + tsc + mr-gates at 16eeb98c. Lenses: planner, plan reviewer + red-team, tester x2, code reviewer, red-team (59 mutants, all non-equivalent killed after round 2), /simplify (no change), verifier PASS. No DECISIONS entry. touches-delta: client/src/ui/i18n/catalog.test.ts (roster 283->285). Spec build note added under ctl-8k in M-postgate-console-controls.spec.md (uncommitted in the harness repo).

SUPERVISOR NOTES
- Residuals: R-ctl-8k-CTL8K.1 (the D-pad/arrows-never-reach-the-gate item; id took the gate name by mistake, -> ctl-13 MED), R-ctl-8k-MODALA11Y (-> ctl-13 LOW), R-ctl-8k-LOCALESTALE (-> backlog LOW).
- No e2e covers the gate (latent until a real issuer ships); real-browser held-Enter suppression and layout unverified.
- Sandbox left: /tmp/ctl-8k-rt.reEU (detached git worktree at e4997f74 + mutant tools) — remove with git worktree remove when convenient. CI log /tmp/ctl-8k-ci.log.

## 2026-10-03T23:21:40Z — ctl-10a PR open (#565)
ctl-10a PR https://github.com/mdrewt/monster-realm/pull/565 (branch ctl-10a; worktree projects/monster-realm/.claude/worktrees/ctl-10a). Local just ci green (CI-EXIT=0: nextest 2004/2004, 15 evals, client 3879/3879, observability). mr-gates 4/4 met, 0 deferred. e2e run locally serially: dialogue+shop-npc+wallet-balance 17 passed; recruit 3 passed (heal path not forced). Built: A/Y act on wasm interact_candidates_coded (memo per batch/identity/zone/predicted tile+facing, lazy guarded export), picker + Y sheet as ScreenHost world state, T retired, chip [keycap] verb — name / Choose…, Box Heal Party removed (healParty without location refused). Lenses: plan reviewer+red-team; code reviewer + red-team (4 bypasses closed by tester round 2, each mutant proved killed); verifier PASS. Testers: 3 parallel (unit, boot, e2e) + 1 follow-up round. Residuals: R-ctl-10a-BOXCB, -HEALTARGET, -DOCS, -TALKRANGE (LOW, backlog), -SHEETA11Y (MED -> ctl-13). SUPERVISOR TODO: (1) the harness spec M-postgate-console-controls.spec.md has an UNCOMMITTED ctl-10a build note (main checkout); (2) doc-keeper should write the decision entry and clear the stale prose (R-ctl-10a-DOCS) after merge; (3) account-e2e S9 sql-json contention flake hit twice in one local run, passed on rerun + pristine master. Scratch left: /tmp/tmp.TqJK3dbRTi, /tmp/tmp.mRzvtOsHwh (master sandbox worktree, detached — remove via git worktree remove), red-team /tmp/tmp.GNNCzcKuVd, /tmp/tmp.mKJy8piOMg. Budget warn flag fired mid-slice; converged, no new scope.
## 2026-10-03T21:17:47Z — ctl-8k merged (#564); master CI pending, ctl-9 next
Merged ctl-8k c0c7b3b6 after CLEAN audit. Master run 37154474622 was in_progress; next tick must verify green LIVE before launching ctl-9. Stale mutex (dead owner 421076) reaped. 3 residuals (MODALA11Y, LOCALESTALE, CTL8K.1) already recorded by run -> ctl-13.



## 2026-10-03T22:01:01Z — sup tick mr-sup-native-20261003T220037Z-544021-1471: launched ctl-10a
master c0c7b3b6 green (ctl-8k #564 merged). ctl-9/16/8d/8e already merged. Launched ctl-10a (opus@high, leader 544374). Next after merge: ctl-10b.

## 2026-10-03T23:47:38Z — ctl-10a merged; ctl-10b launched
ctl-10a PR#565 audited (CLEAN; removed T/heal-button assertions adjudicated as spec-mandated migrations with surviving A-based controls) and squash-merged as 5b16acd5; master CI green. Worktree/branch removed. Launched ctl-10b (opus@high, routine, client-only; leader 693190) — next after it: ctl-11a. Uncommitted ctl-10a build note remains in M-postgate-console-controls.spec.md (harness stray, left as-is).


## 2026-10-03T23:50:04Z — ctl-10b parked
ctl-10b PARKED at verify-scope: hidden-dependency STOP, no code. Branch ctl-10b @ 19827bac (empty wip on master 5b16acd5), no PR, no DEFER. Three REQUIRED files sit outside the seeded touches: (1) client/src/ui/interactModel.ts (+interactModel.test.ts): InteractAction is a closed talk|shop|heal union and marshalInteract hard-codes player actions to [] (WorldPort.run and interactChip are typed on it), so no Trade/Challenge row can reach the picker. (2) client/src/ui/screens/tradeProposeScreen.ts (+test): viewModel hard-codes targetSupplied:false, so the wizard can't open pre-filled; needs a ctx value like CTL8S.2's socialTab (likely screens/types.ts too, plus any ScreenContext-literal test sites if the field is required). (3) client/e2e/pvp.spec.ts:262 clicks pvp-challenge-player-btn, which CTL10B.2 removes. main.*.test.ts KeyO users are main.ts siblings (allowed). No sibling is in flight. Plan + design sketch + planned gate tags: memory/projects/monster-realm-ctl-10b-plan.md; park memo: monster-realm-ctl-10b-progress.md. Resume: widen touches, then PLAN. Cost so far is small (verify-scope only).

## 2026-10-04T00:22:33Z — ctl-10b PR open
ctl-10b PR mdrewt/monster-realm#566 OPEN, branch ctl-10b @ 0c0091fd; local just ci green at ae12940f (CI-EXIT=0, 3890 client tests, all evals PASS); mr-gates 2/2 met. Resumed from the hidden-dependency park under a DISCLOSED scope widening (rb-73 precedent, no sibling in flight): interactModel.ts(+test), screens/tradeProposeScreen.ts(+test, +boot test), screens/types.ts (optional ScreenContext.proposeTarget), e2e/pvp.spec.ts — listed in the PR's SCOPE WIDENING + touches-delta; supervisor may reject. DECISIONS entry 'Interaction target: the tile in front, then your own tile' landed. Residuals: R-ctl-10b-PVPCB, R-ctl-10b-PVPPLAYERS (->ctl-8g), R-ctl-10b-DOCS (PLAYTEST.md). Only the 5 migrated e2e specs were run locally (18/18); remote e2e job covers the rest. mr_warn_ctl-10b was set during review; lens set was reviewer+verifier-audit and red-team (desync-guard/reducer-auditor skipped: no game-core/wasm/server change). Red-team sandbox left at the path in /tmp/rt_sb_path.

## 2026-10-04T00:42:26Z — ctl-10b merged d8931b9a
Merged PR#566 after audit CLEAN + gates 2/2. Worktree/branch removed. master CI run 37165640557 in progress at record time — next tick must confirm green before launching ctl-11a (next per notes).


## 2026-10-04T01:01:15Z — ctl-11a launched (supervisor mr-sup-native-20261004T010034Z-825479-6037)
Master d8931b9a CI green (ctl-10b merged). Stale mutex (dead 817670) reaped. Launched ctl-11a opus@high leader=826031. Next after merge: ctl-11b, then ctl-12. No open PRs, no parked slices; HIGH/CRIT residuals none.

## 2026-10-04T01:04:29Z — ctl-11a parked
ctl-11a PARKED at the verify-scope step: HIDDEN DEPENDENCY. The declared `touches:` cannot hold the slice. No code was written, no PR was opened, and branch `ctl-11a` = origin/master d8931b9a (pushed). The worktree is at projects/monster-realm/.claude/worktrees/ctl-11a. The ledger is untouched (3/3 pending, 0 DEFER). Progress: $MEM/monster-realm-ctl-11a-progress.md.

Why. Each gate, as specced, changes behaviour that is pinned by specced tests outside touches (and not siblings of a declared code file):
- CTL11A.1 puts the menu frame under the opened screen ("pop to base, push the canonical menu path, cursor on the leaf"), so the stack after an accelerator becomes [world, menuView, <screen>]. That breaks:
  - client/src/ui/screens/bagScreen.boot.test.ts CTL8F-4-BOOT-KEYI (asserts the stack is exactly ['world','raisingView'] after KeyI).
  - client/src/ui/screens/profileScreen.boot.test.ts CTL8H-5-N-OPENS-NAME-TYPING and CTL8H-5-C-OPENS-ACCOUNT (assert ['world','renameView'] and ['world','claimView']).
  - client/src/ui/screens/socialScreen.boot.test.ts CTL8D-3-BOOT-HOTKEYS, CTL8D-1, CTL8D-2 and CTL8G-* (U/P/L, then "Start closed Social" → [WORLD_FRAME]). Likely; it depends on the Start semantics chosen.
- CTL11A.3 (Q/E become LB/RB, so Q and E do nothing at the world) breaks:
  - client/src/ui/screens/journalScreen.boot.test.ts CTL8F-4-BOOT-KEYQ (KeyQ opens the journal).
  - client/src/ui/screens/index.test.ts ≈546-578 and ≈2426. They import `routedBindings`, which the slice retires, and assert that KeyQ/KeyE produce no edge.
- Remote e2e outside touches:
  - client/e2e/a11y.spec.ts ≈854-1001 (KeyE opens and closes evolution; the KeyB/KeyI/KeyN toggles now return to the menu, not the world).
  - client/e2e/movement-input.spec.ts ≈510, ≈576 and ≈731-750 (KeyB/KeyP, then walking).
  - rename.spec.ts ≈222, accounts.spec.ts ≈126-191, monster-privacy.spec.ts ≈233 and ≈694, pvp-side-b.spec.ts ≈205 and encounter-battle.spec.ts ≈555. These press N/C/U/B; whatever runs after the close now lands on the menu, not the world. Each needs an audit.
  - controls.spec.ts ≈143 (keysSeen) is probably fine.
- Residuals routed here also need out-of-touches files:
  - R-ctl-8b-CTL8B.2 (X quick Move) needs client/src/ui/screens/monstersScreen.ts. No screen handles 'X' today; the router change alone delivers nothing.
  - R-ctl-8b-CTL8B.4, together with V → Monsters › Party, needs a tab-open seam in monstersScreen.ts plus screens/types.ts (ScreenContext). monstersScreen init is hard-wired to 'storage'. The alternative is a synthesized RB in main.ts, which is a hack.
  - R-ctl-8f-CTL8F.1 (Bag paints before the first batch) can be fixed in main.ts (screenHost.seat at the raising open). But that contradicts bagScreen.boot.test.ts CTL8F-4-BOOT-KEYI, which asserts the bag parts are hidden before the first paint.
- Sibling tests (main.*.test.ts, ~130 Key* presses across a11yFocus/controls/input/dispatch/social/feedback*/privacyWiring/partyFull) are inside the sibling allowance but are a large rewrite.

Proposed re-serialization: widen ctl-11a touches by
- the 5 screens/*.test.ts files above (bagScreen.boot, profileScreen.boot, socialScreen.boot, journalScreen.boot, index.test);
- client/e2e/a11y.spec.ts, movement-input.spec.ts, rename.spec.ts, accounts.spec.ts, monster-privacy.spec.ts, pvp-side-b.spec.ts and encounter-battle.spec.ts;
- monstersScreen.ts, monstersScreen.test.ts and screens/types.ts, for V→Party and the X quick Move.

Or split the slice:
- ctl-11a1: J and V are added; CTL11A.2 deny + router accelerator table; B/I/U/P/L/N/C move to the canonical path, together with the boot-test and e2e rewrites.
- ctl-11a2: Q/E → LB/RB with journalScreen.boot, index.test and a11y.spec.

The slice is size LARGE, not MODERATE. Budget spent ≈ $10, scoping only.
Design notes for the resumer:
- mainMenuPick(state, key) already gives "cursor on the leaf" from main.ts (pick the group, then pick the leaf).
- Tabbed screens already handle LB/RB, and nav.ts already wraps fresh LB/RB edges. So CTL11A.3 is mostly deleting routedBindings plus the KeyQ/KeyE ladder arms.
- The CTL11A.2 deny predicate fits in contextStack.ts (top is server-owned / textEntry / prompt). The session gate is already the first check in onKeyDown.

## 2026-10-04T01:42:01Z — ctl-11a parked (draft PR #567)
ctl-11a PARKED again, now with progress. Draft PR mdrewt/monster-realm#567; branch ctl-11a @ 35b6fe83 is pushed; the worktree is .claude/worktrees/ctl-11a.

Done:
- tester red tests: 17 gating tests across bindings/router/contextStack/main.accel. The orchestrator proved them red.
- Implementation inside touches: accelDecision/ACCEL_PATHS in router.ts, acceleratorsDenied in contextStack.ts, accelForCode in bindings.ts, and main.ts runAccel/openAccelPath. The ladder is deleted; DEFAULT_BINDINGS makes Q/E LB/RB.
- tester migrated 41 sibling main.*.test.ts tests as named intentional changes.
- A pre-existing menuView.setCovered focus bug is worked around in main.ts closeFrame and bite-proofed.
- mr-gates: 3/3 met.

BLOCKER (measured; it confirms the earlier entry): full client vitest has 11 red tests, all outside touches:
- bagScreen.boot ×1
- journalScreen.boot ×1
- profileScreen.boot ×4
- socialScreen.boot ×5

They pin the retired stack shapes and KeyQ, so `just ci` cannot go green inside touches. Re-serialize ctl-11a with touches widened by:
- the 4 screens/*.boot.test.ts files and screens/index.test.ts;
- e2e/a11y.spec.ts, movement-input, rename, accounts, monster-privacy, pvp-side-b and encounter-battle .spec.ts;
- optionally monstersScreen.ts/.test.ts, screens/types.ts and ui/menuView.ts, for the residuals.

The resume steps are in $MEM/monster-realm-ctl-11a-progress.md. Spend is roughly $40 of the $60.

## 2026-10-04T02:00:31Z — ctl-11a touches widened (harness #155)
Supervisor widened ctl-11a touches (boot tests, main.*.test siblings, menuView, screens/index.test, audited e2e). Next tick: resume ctl-11a (hard tier: resume-after-park) from monster-realm-ctl-11a-progress.md; branch ctl-11a@35b6fe83, draft PR #567. Mutex released.

## 2026-10-04T03:01:16Z — tick mr-sup-native-20261004T030055Z-901233-24351: ctl-11a resumed
Took stale chain mutex (owner 889511 dead). Launched ctl-11a resume fable@xhigh (leader 901466) on branch ctl-11a / draft PR monster-realm#567 with widened touches per spec. Next tick: verify pass, mr-audit (hard-tier mandatory read), merge if gates met and CI green.

## 2026-10-04T04:15:35Z — ctl-11a PR ready (#567)
ctl-11a resumed after the touches widening and finished: PR mdrewt/monster-realm#567 is READY (not draft), branch ctl-11a @ a2eb9039 (pushed). Supersedes the park memo in monster-realm-ctl-11a-progress.md.

Gate: local just ci on a2eb9039 exit 0 (nextest 2004; client vitest 172 files / 3917 tests; evals; observability 8 checks). mr-gates: 3/3 met, 0 deferred, lint clean.
E2E (local, in-memory spacetime + dev_reducers module): full suite on a2eb9039 116 passed, 1 skipped (recruit R4, skipped on master). One earlier run had controls.spec 'closeAll pops to base' fail on its 4500 ms wall-clock bound (fake page, files unchanged by this PR); 3/3 in isolation and green in the full re-run.

Done this run: 11 boot tests + screens/index.test migrated (tester); 11 e2e specs migrated (tester; movement-input audited, unchanged); routedBindings deleted; menuView.setCovered visibility guard (main.ts workaround removed); Bag seated at open (closes R-ctl-8f-CTL8F.1); menu Monsters opens on Party, B Storage, V Party (closes R-ctl-8b-CTL8B.4); Select key opens Help at a bare battle base (R-ctl-8j-SELECTINERT, key path); U closes Social on Players (R-ctl-8g-CTL8G.1-UCLOSE).
Lenses: verifier PASS (test-change audit); reviewer 0 blocker/major; red-team found C inert before join (regression) — fixed, pinned by CTL11A-PREJOIN-CLAIM. Four red-team-authored tests were ported into main.accel.test.ts by the orchestrator (budget warn flag was set; no extra tester spawn) — supervisor may want to adjudicate that.

Residuals added: R-ctl-11a-HELPCOPY -> ctl-14 (MED, helpModel.ts still says Q/E), -CTL11A.2-PROMPT -> ctl-13 (no production prompt frames, so in-screen confirms do not deny), -DRAFTLOSS -> backlog, -SELECTCHIP -> ctl-15, -XQUICKMOVE -> backlog (re-homes R-ctl-8b-CTL8B.2), -MONSTERSTAB -> backlog, -EVODEAD -> ctl-11b, -POPGUARD -> ctl-11b.
Spec: as-built note added under ### ctl-11a in M-postgate-console-controls.spec.md (harness working tree, uncommitted). ctl-11b's task 'delete the keydown ladder' is partly done here (the letter-key arms); it still owns KEY_DIR, targetOwnsKey, worldHasFocus, the probe/handle tables, canOpen, OVERLAY_TIERS.
Scratch left: red-team worktree /tmp/ctl-11a-rt.G0oieN/wt (git worktree remove it) with PoCs in /tmp/ctl-11a-rt.G0oieN/poc; /tmp/ctl-11a-stdb.* (stopped server data dir). The e2e spacetime server was stopped by PID. Merge is supervisor-owned.

## 2026-10-04T05:28:41Z — ctl-11b PR open (#568)
ctl-11b PR mdrewt/monster-realm#568 OPEN, branch ctl-11b @ eadce621; local just ci green at b1a7cc62 (CI-EXIT=0, 3930 client tests, no eval FAIL; eadce621 is one test-comment edit, file re-run 38/38). mr-gates 3/3 met (CTL11B.3 e2e run locally on an in-memory spacetime, since stopped by pid; a stale default-dir spacetime.pid from dead pid 1039499 was removed). Shipped: outsideGameScreen ownership rule + onKeyDown first-statement return, worldHasFocus deleted, #evolution-notice mounted inside #game-screen (lens-found regression), dead refreshEvolution deleted, reachability.test.ts, e2e/menu-flow.spec.ts, POPGUARD pin, CTL6C-3 via the Monsters sheet, focusTrap count. Deferred (spec premise false — probes/handles feed syncStack): R-ctl-11b-LEGACYGATES and -EVODEADREST -> ctl-13; new backlog LOW: -STALENARRATION, -E2ESECONDMONSTER, -RAISINGCARDS (carries the CTL8F.2/RAISINGSTRIP remainder; PGCCA-A4 care rows kept as survivors). Closable at merge: R-ctl-11a-POPGUARD; partly: R-ctl-11a-EVODEAD, R-ctl-8f-CTL8F.2, R-ctl-8c-CTL8C.1-RAISINGSTRIP (remainders re-homed). Spec as-built note added under ### ctl-11b (harness working tree, uncommitted). Lenses: reviewer, red-team, verifier PASS; desync/reducer auditors skipped (client-only). mr_warn_ctl-11b appeared before the verifier; converged. Scratch: red-team sandbox worktree /tmp/tmp.1zYvynQ5Bc/wt (git worktree remove it), PoCs /tmp/rt11b; /tmp/ctl11b-stdb.* (stopped server dir).
## 2026-10-04T04:40:13Z — ctl-11a merged (#567)
ctl-11a merged 8341d648 after audited diff read; master CI green. Residuals closed (5). Next: ctl-11b (legacy ladder deleted, reachability, keyboard menu-flow e2e) per spec.



## 2026-10-04T05:48:08Z — ctl-11b MERGED 2bb14ddc
ctl-11b audited and merged (PR#568). Spec deletion task partially deferred per run note; 3/3 gates met. Master CI on 2bb14ddc in progress at merge; next tick: confirm green, launch ctl-12 (remapping) per M-postgate-console-controls spec.

## 2026-10-04T06:01:13Z — SUPERVISOR mr-sup-native-20261004T060041Z-1263640-27744: launched ctl-12
master 2bb14ddc CI green; reaped stale mutex (owner 1257310 dead); launched ctl-12 (opus@high, leader 1264106). Next: audit+merge when .done lands, then ctl-13.
## 2026-10-04T06:42:22Z — ctl-12 PR open (#569) — core shipped; view deferred on a hidden dependency
ctl-12 PR https://github.com/mdrewt/monster-realm/pull/569 (branch ctl-12, worktree .claude/worktrees/ctl-12), just ci green locally (CI-EXIT=0), gates 5/7 met + 2 DEFERred (CTL12.1, CTL12.6). HIDDEN DEPENDENCY (needs re-serialization as a view slice, suggested ctl-12b): a new controlsView OverlayId requires client/src/ui/contextStack.ts (SCREEN_POLICY is a total Record<FrameId>) and client/src/ui/menuModel.ts (MenuTarget + the Options > Controls leaf), likely also client/src/ui/overlayA11yWiring.test.ts, client/src/indexShell.smoke.test.ts, client/src/main.menu.test.ts, client/src/ui/screens/mainMenuScreen.ts — none in ctl-12 touches. ctl-12b scope: controlsView.ts(+test), optionsScreen.ts, screens/index.ts, overlayRegistry.ts (OVERLAY_TIERS/OVERLAY_A11Y; move the static initial-focus anchor), the files above, main.ts (probe/handle entries, save on change via saveBindings, a KeyboardSource setter for live rebinding, capture view calling learnKey), e2e/remap.spec.ts + e2e/controls.ts live-table pressButton, client/src/ui/renameView.ts ROUTED_ON_SUBMIT (built from DEFAULT_BINDINGS), the capture-phase literal Escape route in main.ts. Pure core to wire: ui/controlsModel.ts (controlsRows, slots, rowLabel, capturePrompt, captureKey, clearAccel, outcomeText), input/bindingStore.ts, input/glyphs.ts. Spec build note added to M-postgate-console-controls.spec.md ### ctl-12 (uncommitted in harness). Throwaway dirs left: /tmp/ctl-12-rt.xCzr (detached review worktree), /tmp/rt12 (red-team PoCs).
## 2026-10-04T08:05:07Z — ctl-12b parked — hidden dependency at PLAN (a11yCopy + 3 count-pinned tests)
ctl-12b PARKED at PLAN, no PR, no commits (branch ctl-12b = origin/master 6d7d0a8c; worktree .claude/worktrees/ctl-12b kept with client/node_modules + client-wasm/pkg ready). Measured by prototyping the spec-mandated controlsView OverlayId (all total tables + a stub view + an Options>Controls leaf) and running tsc + full vitest: 4 files OUTSIDE touches red — client/src/ui/a11yCopy.ts (A11YCOPY-OVERLAY-NAMESPACE-EXACT set-equality needs 'a11y.overlay.controlsView.title'; a code file), client/src/ui/a11yCopy.test.ts, client/src/ui/announcements.test.ts, client/src/ui/overlayA11y.test.ts (toBe(17) anti-vacuity pins). Also fix in the spec: touches path client/src/ui/indexShell.smoke.test.ts is wrong (real: client/src/indexShell.smoke.test.ts); list client/src/main.dispatch.test.ts (CTL7C-2-BOOT-VIEWS) and client/src/ui/screens/mainMenuScreen.test.ts explicitly. Consider also client/src/ui/screens/types.ts if the resume wants capture/rebind as Command arms (the plan routes them shell-side in main.ts instead). No in-scope increment closes a gate without the overlay (CTL12B.2's no-reload half needs the view), so a partial would DEFER 2/2. Resume: widen touches, then restart at PLAN from monster-realm-ctl-12b-plan.md (failure table + design + CHECK candidates). Progress memo: monster-realm-ctl-12b-progress.md. Prototype reverted; no scratch dirs left.
## 2026-10-04T07:11:39Z — SUPERVISOR mr-sup-native-20261004T065949Z-1372798-27105: ctl-12 merged, ctl-12b spec inserted
ctl-12 PR#569 merged (6d7d0a8c), master CI green. Harness PR#156 merged: new ctl-12b (Options > Controls view, live rebinding, remap e2e; CTL12.1/CTL12.6 moved), ctl-13 now after ctl-12b. Next tick: launch ctl-12b (touches in spec; main.ts+router => hard tier fable@xhigh recommended; mr-gates seed will be needed for new slice). Lock/worktree for ctl-12 cleaned.

## 2026-10-04T08:06:03Z — ctl-12b park — branch pushed
ctl-12b park checkpoint pushed: origin/ctl-12b @ 4e78dfe6 (empty wip commit on master 6d7d0a8c recording the hidden dependency). No PR. Blocker + resume per the previous ctl-12b entry, monster-realm-ctl-12b-plan.md and monster-realm-ctl-12b-progress.md.
## 2026-10-04T08:06:38Z — ctl-12b parked — draft PR #570
ctl-12b park record is draft PR mdrewt/monster-realm#570 (branch ctl-12b @ 4e78dfe6, empty wip commit; never merge). Blocker: controlsView OverlayId needs client/src/ui/a11yCopy.ts + a11yCopy.test.ts + announcements.test.ts + overlayA11y.test.ts outside touches; fix the indexShell.smoke path; name main.dispatch.test.ts + screens/mainMenuScreen.test.ts. Resume at PLAN from monster-realm-ctl-12b-plan.md after widening touches.
## 2026-10-04T08:23:50Z — 2026-10-04T08:23:50Z — ctl-12b parked, spec re-serialized (#157)
ctl-12b parked (no code). Harness PR #157 merged: touches widened (a11yCopy.ts + 5 tests), indexShell path fixed. Next tick: resume ctl-12b hard-tier on branch ctl-12b (draft PR #570 to be superseded/closed), per memory/projects/monster-realm-ctl-12b-plan.md. ctl-13 after.
## 2026-10-04T09:01:20Z — ctl-12b resumed (hard tier)
2026-10-04T09:01:20Z Stale mutex (dead 1435358) reaped; harness main ff'd to b0ee7ba (#157). Launched ctl-12b fable@xhigh leader=1444794 with widened touches + park memo. Draft PR#570 to be superseded by run's real PR. Next: audit+merge on .done, then ctl-13.

## 2026-10-04T08:01:03Z — 2026-10-04T08:01Z sup tick: launched ctl-12b
ctl-12 already merged (#569), master CI green. Reaped stale mutex + dead run locks, launched ctl-12b opus@high (leader 1386808). Next: on .done, mr-audit + merge ctl-12b, then ctl-13.


## 2026-10-04T12:59:56Z — ctl-13 PR open
ctl-13 PR https://github.com/mdrewt/monster-realm/pull/572 (branch ctl-13 @ 6e6c61e5; worktree projects/monster-realm/.claude/worktrees/ctl-13). Local just ci green on 0fb5a5ce (CI-EXIT=0; later commit is a test-title rename, file re-run 7/7). mr-gates 4/5 met, CTL13.5 DEFERRED -> backlog (new OverlayId forces a11yCopy + count-pinned tests outside touches). Full local Playwright 120 passed / 1 pre-existing skip. Shipped: noticeModel (requests + error notices, request sheet), worldButton Y/B on notices, ScreenHost request seam, live hintBar model+view, banner + Start/Social badges, PvP auto-show deleted, error toast (lists errors since last dismissal), answered-request suppression (red-team double-answer). New residuals: R-ctl-13-CHIPCSS, -AXEDISABLED (-> ctl-15), -REANNOUNCE, -SHEETCHIPS, -ANSWERFAIL, -HINTCOST (backlog LOW). The 18 residuals previously routed to ctl-13 were NOT folded (still recorded; supervisor to re-home). Lenses: plan reviewer+red-team, artifact reviewer, red-team (49 mutants), verifier APPROVE; reducer/desync auditors n/a (client only). SUPERVISOR TODO: harness spec M-postgate-console-controls.spec.md has an UNCOMMITTED ctl-13 as-built note; plan at memory/projects/monster-realm-ctl-13-plan.md. Budget warn flag fired before the artifact lenses; converged, no new scope. Scratch left: /tmp/ctl-13-rt.nPZn/wt (detached review worktree — git worktree remove it), /tmp/ctl13-mut, /tmp/ctl-13-stdb.* (servers stopped by pid).
## 2026-10-04T14:04:58Z — ctl-14 PR OPEN (#573)
ctl-14 PR OPEN: https://github.com/mdrewt/monster-realm/pull/573 (branch ctl-14 @ 0c8840d9; worktree .claude/worktrees/ctl-14). Local just ci green (nextest 2004, vitest 4072, evals, observability 8/8); mr-gates 1/2 met + CTL14.2 DEFERRED -> backlog on a HIDDEN DEPENDENCY: Options › Report a problem needs client/src/ui/menuModel.ts + screens/mainMenuScreen.ts (+ menuModel.test.ts, mainMenuScreen.test.ts, reachability.test.ts row) — supervisor should re-serialize a follow-up slice with those in touches:. Shipped: generated Help (helpModel buildHelpViewModel(chips,bindings), new screens/helpScreen.ts nav adapter, tabbed helpView), Select chip toggles Help, DECISIONS Client UI superseded in place (tightened vs code), PLAYTEST controls -> in-game Help, a11y PASSES_FLOOR_HELP 19->23. touches-delta: main.help.test.ts, screens/helpScreen.test.ts, screens/index.test.ts, i18n/catalog.test.ts, i18n/catalogParity.test.ts. Residuals closed by the PR: R-ctl-6b-CTL6B.4, R-ctl-11a-HELPCOPY, R-ctl-6b-CTL6B.1; new: R-ctl-14-STALECMT, R-ctl-14-HELPA11Y (LOW backlog). Spec build note added under §ctl-14 (harness spec, uncommitted). Known unrelated flake: controls.spec.ts:99 wall-clock bound (1/4 local runs). Sandbox left: /tmp/tmp.MM3JD4sIzc (red-team). Merge is supervisor-owned.
## 2026-10-04T11:02:13Z — ctl-12b merged (PR#571, 17ac40f5)
Supervisor audited+merged ctl-12b (hard tier). Master CI run 37197202756 in progress at record time; next tick must verify green before launching ctl-13 (gate 3 master-red rule applies if red). Worktree/branch removed.



## 2026-10-04T12:01:00Z — ctl-13 launched (opus@high)
ctl-12b merged (PR#571, 17ac40f5), master CI green live. Reaped stale ctl-12b lock and mutex. Launched ctl-13 (hint bar, request banners, error toast, world Y/B) leader 1598130. Next: audit+merge on .done, then ctl-14.

## 2026-10-04T13:26:12Z — ctl-13 merged, ctl-14 launched
ctl-13 PR#572 squash-merged (5418a2a2), master CI green. Launched ctl-14 opus@high (leader 1751253). Next: audit+merge ctl-14 on .done, then ctl-15.

## 2026-10-04T15:42:36Z — ctl-15 PR open — local green, 6/6 gates
ctl-15 (pointer and touch: one dispatcher on #game-screen) is built: PR https://github.com/mdrewt/monster-realm/pull/574, branch ctl-15 @ fa2f4342 (wip commits; squash on merge), worktree projects/monster-realm/.claude/worktrees/ctl-15. Local just ci green (CI-EXIT=0, client 4114 tests), full local Playwright 117 passed / 1 pre-existing skip, mr-gates check 6/6 met, 0 deferred. Shipped: input/pointerSource.ts (seek = D-pad presses with probe+undo, elimination, tie refused), input/longPress.ts, main.ts pointerPress/pointerTop, document click delegate deleted, chips clickable, styles (touch-action, ring, hover, chip parts; .mr-frame-tabstrip min-height fix found by the mouse e2e), ARCHITECTURE UI rewrite, e2e/pointer.spec.ts (deviation: A chip at the picker, single-row tie). touches-delta: main.controls/dialogueDismiss/dispatch/hintBar/input tests (main.ts siblings). Lenses: plan reviewer(+red-team brief), artifact reviewer, red-team (75 mutants, 2 HIGH defects fixed), verifier APPROVE; reducer/desync n/a. New residuals (backlog LOW): R-ctl-15-DRIVEN, -FOCUSSEAM, -LAUNCHERATTR, -KEYHOLD, -SHEETTOP. Closes R-ctl-11a-SELECTCHIP, R-ctl-12b-ROWCLICK, R-ctl-8b-CTL8B.3, R-ctl-13-CHIPCSS; R-ctl-13-AXEDISABLED NOT closed (a11y.spec outside touches) — re-home. SUPERVISOR TODO: harness spec has an UNCOMMITTED ctl-15 as-built note; plan at memory/projects/monster-realm-ctl-15-plan.md. /tmp/mr_warn_ctl-15 fired during the artifact lenses; converged with one tester resume + verifier. Scratch left: /tmp/ctl-15-rt.XlrS/wt (detached red-team worktree — git worktree remove it), /tmp/ctl-15-stdb.* (servers stopped), logs /tmp/ctl-15-*.log. Stale default spacetime.pid files (dead pids) were cleared twice.
## 2026-10-04T14:31:00Z — ctl-14 merged; ctl-15 launched
ctl-14 PR#573 merged (83aabd4e), master CI green live, audit CLEAN. Stale mutex reaped. Launched ctl-15 opus@high (leader 1877148). Next: audit+merge ctl-15 on .done; then pgcc-c.



## 2026-10-04T15:44:18Z — sup tick: ctl-15 PR#574 CI pending, delegated to mr-ci-watch
ctl-15 run finished rc=0, PR#574 open, ci+e2e IN_PROGRESS. Stale mutex (dead 1870934) reaped. Next: audit+merge on CI-done event, then pgcc-c.

## 2026-10-04T16:04:41Z — ctl-15 merged; pgcc-c launched
ctl-15 (PR#574) merged 5c2f47ea, master CI green. Stale mutex (dead 2097303) reaped. Launched pgcc-c opus@high (leader 2105415). Next: audit+merge pgcc-c on .done, then pgcc-d (shares main.ts, serial).


## 2026-10-04T17:55:50Z — 2026-10-04T17:55:50Z — pgcc-d merged; milestones 1+3 closed; R-rb-128-E1 launched
pgcc-d PR#576 merged 11bdcf9c (audit CLEAN, master CI+e2e green). M-postgate-console-controls and M-postgate-client-coverage both complete; post-integration verification met (just ci/e2e green on master via CI, bindings/server/game-core diff empty). Roadmap now: item 2 M25 blocked (checkpoint-2); item 4 residual fill -> launched R-rb-128-E1 opus@high (leader 2332731). Next: audit+merge on .done, then next MED fill (R-rb-73-ABORT-PHANTOM, R-rb-132-WALLETSYBIL, R-rb-52-GRACEANNOUNCE) or raise Playtest-3 gate (item 5) when fill is exhausted/not worthwhile. Open: feedback ledger op-2026-10-01-controls-001..040+ still CLASSIFIED/undisposed (issue claude-harness#150 answered 'Investigate'); needs a dedicated disposition tick. HIGH ux-a11y residual R-ci-fix-...-RAISINGVIEWREBUILD unpromoted (not in outranking class).

## 2026-10-04T17:04:24Z — pgcc-c merged; pgcc-d launched
pgcc-c PR#575 merged (156d5b9c), audit CLEAN, master CI green after rerun of known dialogue 13.5c-5 e2e flake (second recurrence in a day -- if it recurs again treat as ci-fix). Launched pgcc-d opus@high routine (leader 2192671). Next: audit+merge pgcc-d on .done; then milestone post-integration verification (just ci + just e2e on master).


## 2026-10-04T18:14:55Z — R-rb-128-E1 PR open
R-rb-128-E1 PR #577 open (branch R-rb-128-E1, worktree .claude/worktrees/R-rb-128-E1). Local just ci green (4288 client tests, evals PASS, obs 8/0); mr-gates 1/1 met. Rejoin on my_account PendingDeletion->Active via pure shouldRejoinAfterAccountChange + ingestAccount (current-build-only, guard before upsert); Connection.join() replaces main.ts applyClaim's uncaught joinGame. touches-delta: main.dispatch.test.ts + six main.*.test.ts stubs (join member). New residual R-R-rb-128-E1-CLAIMCODERETAINED [gameplay/MED] (claim code not cleared on claim success; static, unrun). Residual section line refs in residuals.spec.md are stale — close it on merge. Awaiting supervisor audit/merge.
## 2026-10-04T18:45:08Z — R-rb-128-E1 merged; milestones closed; roadmap at item 4/5
R-rb-128-E1 PR#577 merged 830bf6dc (mr-audit CLEAN, gate E1 1/1 spotcheck agrees, master CI green live). Stale mutex reaped (dead 2324894). Residual row R-rb-128-E1 retired via disposition wontfix (reason says FIXED; only retire verb) — its residuals.spec.md section (line ~158) still needs dropping in a doc chore. New MED residual R-R-rb-128-E1-CLAIMCODERETAINED. Remaining unclaimed MED/LOW fill is security-privacy server (BYTEBOUND, WALLETSYBIL=schema-frozen) or LOW — not worth a hard-tier launch. NEXT TICK: (1) dedicated feedback-disposition tick for op-2026-10-01-controls-* (all shipped by ctl-*; issue claude-harness#150 answered Investigate); (2) then raise Playtest-3 gate via mr-ask-drew --blocking (items 1+3 closed, M25 blocked on checkpoint-2, no HIGH/CRITICAL security/data residual open).

## 2026-10-04T19:01:41Z — 2026-10-04T19:01Z sup tick mr-sup-native-20261004T190037Z-2429628-31734: controls feedback dispositioned, Playtest-3 gate raised
Stale mutex (dead 2419230) reaped. Dispositioned 56 op-2026-10-01-controls items CLASSIFIED->DISPOSED (REDESIGN/HEAVY x41, DRAFT/FEATHER x15; mr-feedback check OK). All queued milestones closed, master 830bf6dc CI+Nightly green, no HIGH/CRITICAL security/data residual -> raised Playtest-3 gate issue #578 (blocking). Loop idle until answered.


## 2026-10-05T22:13:35Z — 2026-10-05T22:13:34Z polish-1 launched
Operator asked for MED/LOW polish before Playtest-3. Authored M-pre-playtest-polish spec (harness PR #158 merged 7e8d5de; P1-P6 folding 6 residuals). First spawn raced the merge (no spec section) -> killed by recorded pids, reseeded gates (6), relaunched polish-1 opus@high leader 2652943. Playtest-3 gate #578 still pending. Next: audit+merge polish-1 on .done.

## 2026-10-05T22:47:25Z — polish-1 PR open
polish-1 PR #579 open (branch polish-1, worktree .claude/worktrees/polish-1, head 4d6ac935). Local just ci green (CI-EXIT=0; 2004 nextest, 4390 vitest, evals PASS; one prior run red only on account-e2e S9 sql-json flake, passed alone). mr-gates 6/6 met. Re-measure: P1/P2/P4/P5 reproduced and fixed; P3 (MENUPVPHIDDEN) already fixed by ctl-13, closed on existing main.dispatch.test.ts CTL8S-3-BOOT-NESTED-RENDERS; P6 (LOCALESTALE) not reproducible (no runtime locale switch), closed on sessionView.test.ts CTL8K-1-LOCALE. touches-delta: client/src/main.menu.test.ts. New LOW residuals: R-polish-1-MENUREASONANNOUNCE, R-polish-1-CLAIMRESULTCATCHREENTRY. Folded residuals (6) await supervisor disposition. Red-team sandbox worktree left at /tmp/tmp.K8cs8aa9FA/wt (registered in git worktree list). Awaiting supervisor audit/merge.

## 2026-10-05T23:06:51Z — polish-1 merged
polish-1 PR#579 merged as 2721cd3e after audit CLEAN; worktree/branch removed; master CI pending. Nightly 2026-10-05 mutation-server red w/o failing step - watch next nightly. Next: playtest-3 gate #578 pending operator; queue empty.
## 2026-10-09T00:52:18Z — Weekly review 2026-10-09 @ 2721cd3e: 3 residuals (2 MED, 1 LOW), harness #134 consumed
Weekly review 2026-10-09, pinned SHA 2721cd3e (master tip, CI green). Lenses: server authority/privacy, netcode determinism, UI critical flows/a11y (all sonnet, independently verified; no lens contradictions, no adjudication needed).

Findings entered (3 of max 5):
- R-weekly-review-2026-10-09-F1 (data-integrity, MED): practice self-battles are an uncapped, scriptable currency/XP faucet — grant_currency on SideAWins not practice-gated (battle.rs:1285-1288 @ 2721cd3e); battle_tests.rs:3405-3433 pins practice-pays-currency, so the fix must update that pin or add a cap.
- R-weekly-review-2026-10-09-F2 (gameplay, MED): pointer click on a dialogue choice bypasses the dialogue adapter's reveal + resend guards (main.ts:3468 → dispatch direct); double-click silently takes branch N of the next, unseen node (advance_dialogue has no node identity, npc.rs:364).
- R-weekly-review-2026-10-09-F3 (ux-a11y, LOW): a PvP accept landing mid-dialogue leaves battle D-pad/A dead until B/Start while the 60 s turn deadline runs (pvp.rs:964 no conversation guard; dialogueScreen.ts:141 unhandled while inBattle).

Dropped candidates: 2 — advance_dialogue walked-away delete rolled back by its own Err (already tracked as R-ci-fix-20261002T0501Z-WALKEDAWAYROLLBACK); netcode lens returned clean (predictor seq/epoch, held keys, movement_tick, interpolation, rule-drift and determinism sweeps all clean at this SHA).

Decision issues: none opened. Consumed and closed harness #134 (rev21-nightly-changelog-red, answered by operator): reds were changelog-freshness daily 2026-09-20..26, self-resolved 09-27. ACTION FOR SUPERVISOR per the operator's answer: mr-situation:49 probes only the latest master run (-L1), so a red scheduled Nightly stays invisible whenever a later run is green — add a dedicated `gh run list -w Nightly -L1 --json conclusion` probe to mr-situation and trigger docs/nightly-red-response-policy.md on failure (this review writes no tracked files, so the change is left to the supervisor/operator).

Residual sweep --dry-run: 0 obsolete candidates. Registry adds succeeded (3). Cleanup: review clone /home/mdrewt/mr-review/2026-10-09-2721cd3e removed; no writes to $PROJ or the harness git state.

## 2026-10-15T16:00:54Z — 2026-10-15T16:01Z sup tick: Playtest-3 gate #578 closed by operator
Drew closed #578 at 15:41Z with no comment. Consumed as ack: commented <!--mr-system-->, cleared stale .blocked-on-human. master 2721cd3e CI+Nightly green, no PRs/inflight, no HIGH/CRITICAL security/data residual, queue empty. Standing down; resumes on playtest-feedback event. Not re-raising the gate.

## 2026-10-16T00:49:02Z — weekly-review-2026-10-16: 3 findings registered (trade-oracle MED, guest-claim battle orphan MED, reward clamp LOW)
Weekly review 2026-10-16 (scheduled task, Cowork). Pinned clone /home/mdrewt/mr-review/2026-10-16-2721cd3e @ 2721cd3eb1df9ca54c0540535d1f5d3d19e5303d (master tip; unchanged since the 10-09 review — live checkout sits on deps/upgrade-2026-10 at 17790f02).

Lenses (sonnet x3): server-authority/privacy, data-integrity (economy/deletion/export), netcode-determinism+input. 4 candidates, independent sonnet verification confirmed 3, rejected 1 (player_quest public — explicit DECISIONS carve-out, by design). Netcode lens clean. No cross-lens contradictions, no adjudication needed.

Entered into the registry (all --target backlog):
- R-weekly-review-2026-10-16-F1 (security-privacy, MED): propose_trade error strings are a read oracle on another player's wallet balance and item stacks (trading.rs:380-388,417-443 @ 2721cd3e).
- R-weekly-review-2026-10-16-F2 (data-integrity, MED): guest claim orphans the guest's last terminal battle row — never exported, never anonymized; breaks DATA_LIFECYCLE_MANIFEST battle=Anonymize/exportable (accounts.rs:510-519,740-748; battle.rs:1161-1199 @ 2721cd3e).
- R-weekly-review-2026-10-16-F3 (data-integrity, LOW): quest/dialogue rewards silently clamp at stack/balance caps; one-time overflow destroyed (npc.rs:240-247,159 @ 2721cd3e).

Decision issues opened: none (no irreversible/architectural/security-posture calls this run; prior rev* decision issues all closed, nothing to consume).
residuals sweep --dry-run: 0 obsolete candidates. Registry alarm persists: 105 open residuals (cap 12, observe-only in slice 1).
Cleanup: run dir /home/mdrewt/mr-review/2026-10-16-2721cd3e and helper files removed after this handoff; runner git state untouched.
## 2026-10-23T00:49:41Z — weekly-review 2026-10-23: 3 residuals entered (2 MED, 1 LOW), 1 refuted
Weekly review 2026-10-23 (pinned 1c0d393ba7b152cf7c787c09a9ee8cde9ae56760, clone /home/mdrewt/mr-review/2026-10-23-1c0d393b, torn down).
Lenses (sonnet): server authority/privacy; netcode determinism + connection lifecycle; critical UI flows/a11y (recent corrective-wave churn). Verification: one independent sonnet verifier per candidate; no cross-lens contradictions, no adjudicator needed.
Entered 3 residuals: R-weekly-review-2026-10-23-F1 (MED gameplay — join_game starter re-grant lets trade-away+rejoin mint starters / reroll hidden IVs), F2 (MED netcode-determinism — reconnect backoff frozen on connect-then-drop-before-applied; 1 Hz lockstep retries + OIDC renew per retry during host restarts), F3 (LOW ux-a11y — releaseAnswered leaves menu badge stale and never re-voices a rejected answer).
Dropped 1 candidate: answeredRequests frozen-link wedge — REFUTED (every thaw passes onReady/onReconnect which clears the set; cosmetic only, folded into F3 context).
Decision issues: none opened. Open #580 (RAISINGVIEWREBUILD disposition) and harness #150 (feedback-reconcile) remain unanswered — left open, not consumed.
Residuals sweep --dry-run: 0 obsolete candidates. Registry alarm persists: 105→108 open residuals vs cap 12 (observe-only).
Note for the next run: the pinned master tip still ships npm SDK 2.6.0 / crate 2.8.1, while live-tree AGENTS.md/DECISIONS.md already describe the 2.11.0 lockstep (deps-s3) — in-flight work, not a defect at the SHA; re-run the connection-lifecycle lens after the SDK bump lands (dropRejected rests on observed 2.6.0 behavior).
No git commits; no tracked files written.

## 2026-10-24T14:25:13Z — Playtest-3 feedback processed (episode pt3-2026-10) — queue reshaped, 7 decision batches open
Direct session (operator-invoked, ultracode) consumed specs/monster-realm-v2/playtest-feedback-2026-10.md end to end per mr-feedback-doctrine v1.6 SS10.
STATE: 186 items triaged (covermap 113/113 COVERMAP-OK --strict) and ALL dispositioned (31 LOGGED, 133 queued, 22 ANSWER-typed); reconciler strict green (333 items). Prior episodes verified against the playtest per I-5: 74 SHIPPED-VERIFIED, 1 OPERATOR-CLOSED (ctl-028), 14 recurrence notes, 49 held (not exercisable).
ARTIFACTS: 8 milestone specs drafted (M-pt3-quickfix build-ready 17 slices; M-battle-tactics/M-ui-foundation/M-trade-sessions/M-netcode-presence/M-econ-onboarding/M-identity-handles/M-world-art-pass sketches); PLAN.md SS9 reshaped (quickfix then battle-tactics first; M18 re-sketch after tactical P2; Playtest-4 timing = open decision); 5 research docs persisted + INDEX regenerated; doctrine v1.6 (decision batching 1-5/issue); brief at specs/monster-realm-v2/playtest-feedback-2026-10.brief.md.
DECISIONS OPEN (watchers spawned): MR #583 battle scope, #584 battle design, #585 trade scope, #586 ui policy, #587 econ+art, #588 identity+roadmap; harness #160 process/caps. Battle ceremony (M-battle-tactics P0) is blocked on #583+#584; everything in M-pt3-quickfix is unblocked after so-2.
NEXT SUPERVISOR TICK (when operator lifts the hold): run ttd-1 -> so-1 -> so-2 from the queue, then seed M-pt3-quickfix slices (qf-1..qf-17; spec has touches:+QFn.m criteria). Fold the pt3-ui-policy menu-IA answer into so-2's existing ask gate. Do NOT clear .native-supervisor-disabled (operator-owned).
SS11 audit of this episode ran post-disposition; outcome recorded on the brief issue.

## 2026-10-24T23:52:06Z — 2026-10-24T23:55Z — ttd-1 launched (forced tick)
Master 1c0d393b CI green, no open PRs/parked/HIGH-CRIT residuals. Launched queue head ttd-1 opus@high leader=1142868. Next: so-1, so-2. ADVISORY: PROJ main checkout is on operator branch deps/upgrade-2026-10 (b8ad17ed, deps-s0..s8 unpushed, 2 dirty test files) — not touched; restore to master only after operator is done.
## 2026-10-25T00:14:40Z — ttd-1 PR open (#590)
PR https://github.com/mdrewt/monster-realm/pull/590 on branch ttd-1 (HEAD 5076a3ca). Local just ci green (CI-EXIT=0; nextest 2004/2004, 15/15 evals, client 4374/4374) run with a spacetime 2.8.1 PATH shim because the global CLI is 2.11.0 (operator deps branch) and breaks bindings-drift/account-e2e locally. mr-gates ttd-1 5/5 met. Prior 11-red-client BLOCKER did not reproduce. Spec residual build note added to M-test-truth.spec.md (harness, uncommitted). Scratch left: /tmp/ttd1-st (shim + data dir), /tmp/tmp.HvsToaD248, /tmp/tmp.5MHw7qa3ww (red-team sandbox). Supervisor owns CI-watch + merge.
## 2026-10-25T00:15:56Z — ttd-1 CI-wait delegated (PR #590)
Supervisor mr-sup-native-20261025T001551Z-1290476-18251: run finished rc=0, PR #590 open head 5076a3ca, ci/e2e in progress. mr-ci-watch launched detached; audit+merge next event tick. Stale mutex (pid 1141538 dead) reaped and retaken.
## 2026-10-25T00:30:28Z — ttd-1 merged (PR#590)
ttd-1 merged as 87827a54. Next queue head so-1 (stack-ownership). Master CI on 87827a54 delegated to mr-ci-watch. Main checkout is on deps/upgrade-2026-10 with operator changes - left untouched.

## 2026-10-24T19:49:57Z — pt3 decision batches consumed; ceremony done; hold lifted







## 2026-10-25T01:01:11Z — 2026-10-25T01:01:11Z — so-1 launched
ttd-1 already merged (87827a54, CI green). Reaped stale mutex+ttd-1 lock, fast-forwarded local master ref (main checkout on operator deps branch untouched), launched so-1 opus@high leader=1306952. Next: audit+merge so-1; then so-2 (mr-ask-drew so-2 answer required before merge).


## 2026-10-25T01:59:43Z — so-1 merged (PR#591)
Reconnect closes frames via reconnectSweep + RECONNECT_RESETS unconditional resets. Audit CLEAN, 4/4 gates, master CI green at 0660aada. Main project checkout is on operator branch deps/upgrade-2026-10 with 9 dirty files — local master NOT fast-forwarded (operator work; left alone). Queue head so-2 (M-stack-ownership): launch next tick; mr-ask-drew gate required before ITS merge.
## 2026-10-25T03:01:16Z — 2026-10-25T03:01:16Z — so-2 launched
Master 0660aada CI green (so-1 merged). Stale mutex (dead 1438286) reaped. Launched so-2 opus@high leader=1462568. Merge only after mr-ask-drew so-2 answer file exists (SO2.0). No HIGH/CRIT residuals. Local master ff-synced; main checkout is operator branch deps/upgrade-2026-10 (untouched).


## 2026-10-25T03:50:23Z — so-2 PR open (#593) — awaiting operator #592
PR https://github.com/mdrewt/monster-realm/pull/593 (branch so-2 @ 312896a7). Local just ci green (CI-EXIT=0; nextest 2004/2004, client 4489/4489, evals PASS) with the /tmp/ttd1-st spacetime 2.8.1 shim. mr-gates so-2 8/9: SO2.0 MANUAL unmet BY DESIGN — mr-ask-drew so-2 --blocking opened issue #592; merge only after decisions/issue-592.answer.md exists (supervisor cites it as SO2.0 EVIDENCE, flips the box). The 11-red-client BLOCKER did not reproduce (baseline 4418/4418). Spec conflict resolved by default + disclosed: 2 precondition lines of main.reconnectStack.test.ts flipped (SO2.8 said unmodified). mirrorEdges kept general for ui/reachability.test.ts (outside touches); shell uses mirrorServerEdges — follow-up to move reachability to openEdge. Residual: SO2-5-GATE-PURE is a text pin (helper-indirection mutant survives). Spec as-built note added to M-stack-ownership.spec.md (harness, uncommitted). Scratch: /tmp/tmp.gzDAjH63wl (red-team backups).

## 2026-10-25T23:09:09Z — so-2 merged (f7f2a531, PR #593)
Operator approved #592; SO2.0 recorded met; audit CLEAN; removed-assert adjudication: legit mirror inversion. Master CI in progress, mr-ci-watch delegated. Next tick: confirm master green, then next unfinished PLAN item (queue empty). Main checkout still on operator branch deps/upgrade-2026-10, untouched.
## 2026-10-26T00:01:00Z — 2026-10-26T00:0xZ launch qf-1 + qf-2 (M-pt3-quickfix start)
Master f7f2a531 CI green. Stale mutex (1902400) reaped. Launched qf-1 (leader 1926689) and qf-2 (leader 1927054), opus@high routine, disjoint. Next after merges: qf-3 (after both), qf-5/qf-7 sanctioned parallel. Main checkout is on operator branch deps/upgrade-2026-10 with dirty tree - untouched.


## 2026-10-26T01:01:33Z — sup tick mr-sup-native-20261026T010123Z-2162692-19331: qf-1 PR#594 CI pending
qf-1 finished rc=0 (PR #594 open, ci+e2e IN_PROGRESS at 6beb6d5). Delegated CI-wait to mr-ci-watch; merge+audit on event tick. qf-2 still running (pid 1927054). Took stale mutex (owner 1925074 dead).


## 2026-10-26T01:16:55Z — qf-1 merged; qf-2 awaiting CI
qf-1 (PR#594) merged 6bdf33dd after audit CLEAN. qf-2 (PR#595, opus, local just ci exit 0, 3/3 gates) has CI pending; mr-ci-watch delegated. Next tick: verify master CI on 6bdf33dd, audit+merge qf-2 if green. Main checkout is on operator branch deps/upgrade-2026-10 (dirty) - left alone.

## 2026-10-26T01:37:30Z — qf-2 merged (#595); qf-3 launched
qf-2 squash-merged as bcda1612 after audit CLEAN (orchestration CLEAN, 3/3 gates met; dispatch.test.ts stub update outside touches adjudicated as the named intentional test stand-in change). master CI green post-merge. qf-1 already merged (#594). qf-3 launched hard-tier fable@xhigh (leader 2217709). Note: main checkout of monster-realm sits on operator branch deps/upgrade-2026-10 with 9 uncommitted tracked changes — left alone; local master ref ff'd via fetch origin master:master.


## 2026-10-26T01:47:28Z — qf-3 parked — hidden dependency at verify-scope (rowConvert.ts + monstersModel.ts + 14 fixtures)
qf-3 PARKED at verify-scope (build-loop step 1): hidden-dependency STOP, no PR, no code commits. Branch slice/qf-3 = origin/master bcda1612 + empty park commit a99ea258 (pushed); worktree .claude/worktrees/qf-3 kept with client/node_modules (Node 24.22.0) + client-wasm/pkg ready. Ledger seeded 4/4, CHECK/EXPECT unfilled (PLAN not reached). MEASURED (tsc probe, reverted): a REQUIRED StoreMonsterPub field reds 19 files, 15 OUTSIDE touches. Hard misses: (1) client/src/net/rowConvert.ts — SdkMonsterPubRow:152 + monsterPubRowToStore:196 are the ONLY my_monster_pub→store path (connection.ts:189 calls it, needs no change) + rowConvert.test.ts; (2) client/src/ui/monstersModel.ts — sheetLayout:39 hardcodes the Care row enabled, both callers (monstersScreen.ts:346, boxView.ts:465) are in touches but can only disable Care through it + monstersModel.test.ts; (3) 14 fixture test files: main.{accel,controls,dispatch,feedbackCore,input,partyFull}.test.ts, ui/{bagModel,evolutionModel,evolutionModel.parity,monstersModel,raisingModel,tradeProposeModel}.test.ts, ui/screens/{bagScreen,socialScreen.boot,tradeProposeScreen.boot}.test.ts (or sanction as touches-delta fixture adds, qf-2 dispatch.test.ts precedent). Regen: evals/baselines/table-schemas.json (battle-schema-snapshot DRIFT, bindings-like). Soft: server-module/src/privacy.rs json_monster_pub:572 hand-enumerates columns (M25 spec :105 names privacy.rs+rowConvert as the column-add set) — rule export-or-document. Design fork for the ruling: (A) derived care_ready_at_ms in pub_from_monster (no client-wasm; arithmetic in a shell) vs (B) mirror last_care_at_ms verbatim + care_cooldown_ms() export from client-wasm/src/lib.rs (SSOT-clean, +1 file). Server census inside touches is otherwise clean (MonsterPub literals only at marshal.rs:216, privacy_tests.rs:1235). A server-only increment would DEFER 2/4 and ship an unread column — not taken. Resume: widen touches, relaunch at PLAN in the existing worktree. Full record: memory/projects/monster-realm-qf-3-progress.md. Scratch: /tmp/qf-3-tsc-probe.log only.


## 2026-10-26T02:06:56Z — qf-3 park confirmed — privacy.rs is a third hidden dependency (DECISIONS.md additive-schema rule); lens findings carried in the plan memo
qf-3 PARK CONFIRMED (supersedes the 01:47Z entry): no code, no PR. Branch slice/qf-3 = origin/master bcda1612 + two empty park commits (pushed); worktree .claude/worktrees/qf-3 clean with client/node_modules + client-wasm/pkg ready; ledger restored to its seeded state (4 unmet, 0 deferred, CHECK/EXPECT blank). After the first park I attempted a right-sized SERVER-ONLY increment (QF3.1+QF3.2 inside touches, DEFER QF3.3/3.4 → backlog, ctl-14 precedent) and ran the plan-review lenses (reviewer + red-team, opus): BOTH found a third HARD hidden dependency — docs/DECISIONS.md "Schema changes are additive" requires every new column on an exportable table to get an explicit export-or-omit decision IN server-module/src/privacy.rs (json_monster_pub:572; the four other derived monster_pub columns are exported there), so no variant of QF3.1 fits the declared touches. Full HARD set: privacy.rs, client/src/net/rowConvert.ts, client/src/ui/monstersModel.ts (+ siblings rowConvert.test.ts, monstersModel.test.ts, marshal_tests.rs) + 14 StoreMonsterPub fixture tests + regens (module_bindings, evals/baselines/table-schemas.json) + client-wasm/src/lib.rs if the recommended design is taken. DESIGN CHANGE from the lenses: a stored derived care_ready_at_ms ROTS when the playtest-tunable CARE_COOLDOWN_MS is retuned (nothing backfills) → recommend mirroring last_care_at_ms verbatim onto monster_pub and exporting client-wasm wrappers over game_core::is_cooldown_ready for the client. Carry-forward test-design findings (boundary-strategy proptest, distinct i64 fixture values, train at T0+δ with a changed-column assert, exact `test(=path)` nextest filters, crate name monster-realm-module NOT server-module, HIDDEN_FIELDS allowedIn row for client-surface-privacy) are in memory/projects/monster-realm-qf-3-plan.md; park record memory/projects/monster-realm-qf-3-progress.md. Resume: widen touches (one slice, or qf-3 server + qf-3b client), relaunch at PLAN in the existing worktree. Scratch: /tmp/qf-3-tsc-probe.log, /tmp/tmp.vydY1ZXhjP (red-team one-liner). Spend ≈ reads + 1 tsc probe + 2 opus lenses (~260k subagent tokens), well under the $150 cap.

## 2026-10-26T02:09:01Z — qf-3 park record is draft PR #596 (never merge)
qf-3 park record is draft PR https://github.com/mdrewt/monster-realm/pull/596 (branch slice/qf-3 @ a31f473b, two empty wip commits, diff vs master EMPTY; never merge — close it unmerged when the real qf-3 PR opens). Blocker + widened touches proposal in the PR body and memory/projects/monster-realm-qf-3-progress.md; relaunch brief with the lens findings in memory/projects/monster-realm-qf-3-plan.md. Resume at PLAN in the existing worktree after widening touches (privacy.rs, rowConvert.ts, monstersModel.ts + siblings + 14 fixtures; client-wasm/src/lib.rs for the recommended verbatim-last_care_at_ms design).

## 2026-10-26T03:16:06Z — qf-3 parked (resume #1): third hidden dependency — no epoch clock seam on ScreenContext
qf-3 re-parked at verify-scope, no code (slice/qf-3 @ cde79cb4 = master bcda1612 + 3 empty wip commits; draft PR #596 updated, never merge). MEASURED: ScreenContext.now is performance.now() (main.ts:1531), ms since navigation — not comparable with the server-epoch last_care_at_ms; every in-touches module is injected-clock by doctrine, and the SCREEN must know readiness (act('care') sends unconditionally; the Feed pattern guards inside act). Required widening: client/src/ui/screens/types.ts (readonly wallNowMs: () => number) + client/src/main.ts (wallNowMs: () => Date.now()); fixture blast radius zero (all 16 ScreenContext test fixtures are casts). Also name client/src/ui/i18n/catalog.test.ts explicitly (pins the exact 370-key roster + SAMPLE_PARAMS bijection; every key-adding commit edits it). Retraction: park #1's 'ScreenContext.now() is the clock seam' line was unverified and wrong. Everything else verified in-touches (7 pub_from_monster mirror sites, privacy.rs +2 lines, no eval roster pin, e2e cares once, toolchain ready). Ledger untouched 4/4 seeded; its Touches: header is the old 16-file set (reseed refreshes). Resume: widen the 3 files, relaunch at PLAN in .claude/worktrees/qf-3; design + tester brief + CHECK drafts in monster-realm-qf-3-plan.md, park record in monster-realm-qf-3-progress.md.
## 2026-10-26T02:11:03Z — qf-3 touches widened; relaunch next tick
qf-3 parked (draft PR #596, never merge; close when real PR opens). Spec M-pt3-quickfix qf-3 touches widened (harness d30f894) per park memo: privacy.rs, rowConvert, monstersModel, 14 fixtures, client-wasm lib.rs, table-schemas.json. decision-defaulted:qf3-fork=B (mirror last_care_at_ms verbatim + wasm cooldown export). EARS unchanged, no seed drift. Next tick: resume qf-3 hard-tier (resume-after-park) with park memo as resume_block. Park counter stays 0 (spec fix, not no-progress).


## 2026-10-26T03:01:09Z — qf-3 resumed mr-sup-native-20261026T030033Z-2330447-160
Tick mr-sup-native-20261026T030033Z-2330447-160: mutex stale (dead pid 2314344) reaped+retaken. PR #596 = empty park-record (wip commits, diff empty) — NOT merged. Resumed qf-3 via mr-spawn (fable@xhigh, touches 38 files per widened spec, leader 2331138). decision-defaulted:qf3-fork=B. Next tick: verify PR, audit (hard-tier mandatory read), close #596 unmerged, merge. Main checkout is on deps/upgrade-2026-10 with 9 uncommitted tracked changes (operator stray; left alone).


## 2026-10-26T03:18:29Z — SUPERVISOR mr-sup-native-20261026T031759Z-2384181-28889: qf-3 resumed (park #2 widening)
Mutex stale reaped+retaken; widened qf-3 touches (+types.ts, main.ts, catalog.test.ts) in spec 9bc5655 (harness main pushed), reseeded gates (no drift), relaunched fable@xhigh hard (leader 2385048). PR #596 still draft park-record, close unmerged at real-PR time. Next tick: on .done, mr-audit (hard-tier mandatory read), close #596, merge.

## 2026-10-26T03:33:27Z — qf-3 hidden dependency #4 measured (index.test.ts, runtime) — building the in-touches server/wasm/store increment, then parking
qf-3 resume #2 (2026-10-25): FOURTH hidden dependency, MEASURED at verify-scope — `client/src/ui/screens/index.test.ts` (outside touches) is REQUIRED by every faithful client design, at RUNTIME (not typecheck). Decision: build the in-touches server + wasm-export + store increment now (QF3.1, QF3.2, QF3.4-server) with the full tester/lens loop, commit+push on slice/qf-3, then PARK before the client sheet (QF3.3 + QF3.4-client). PR #596 stays the park record.

WHY index.test.ts is required (measured, worktree at master bcda1612):
- `monstersFlowCtx()` (index.test.ts:2325) builds three own-monster rows as UNTYPED object literals (no `lastCareAtMs`) and a ScreenContext cast `as unknown as ScreenContext` with `now: () => 0` and NO `wallNowMs`. Test `CTL8B-4-HOST-FLOW` (:2403) drives the REAL `monstersScreen` through `ScreenHost` + `SCREEN_ADAPTERS` with that ctx: RB/LB/Right, then A opens the sheet of monster 22, Up, A on Move.
- Any design where the SCREEN knows readiness (required: aria-disabled Care must not send — "the Feed pattern", memo point 3) must call `ctx.wallNowMs()` in `viewModel` (TypeError: not a function) and hand `m.lastCareAtMs` to the wasm export (`undefined` → BigInt conversion TypeError). Both fire on the first button of that test. The 2026-10-26 "zero blast radius" claim covered TYPECHECK only (all fixtures are casts); the runtime dimension was not measured.
- Fix = 2 field-adds in index.test.ts: `lastCareAtMs: 0n` on the `row()` literal (:2326) + `wallNowMs: () => 0` on the ctx (:2379). No assertion change.

Census of the other out-of-touches candidates (so this is the LAST park of this kind):
- `client/test-util/mainBootHarness.ts` — the three shared `wasmPkg*Mock` rosters (:89/:142/:176) list every wasm export by name (`party_size: () => 3`, …). A main test that opens the Monsters frame with a seeded monster will hit vitest's "No care_remaining_ms export is defined on the mock" unless the roster gains `care_remaining_ms`. The 5 in-touches main tests that do (accel, controls, dispatch, input, partyFull) CAN each spread-override their own `vi.mock` factory, but the helper is the right place: RECOMMEND adding it to touches (out-of-touches main tests that open the frame — a11yFocus, reconnectStack — seed no monsters, so they do not crash either way).
- `client/src/ui/evolutionView.test.ts` — its `nutritionPct` literals are `EvolutionMonsterViewModel` fixtures (`monsterVm`), not store rows: NOT affected.
- index.test.ts `clockCtx()`/`CTX` (`store: {}`) only ever reach probe adapters, never the real monstersScreen: NOT affected.
- `client/src/ui/screens/index.test.ts:3393` (ME8F) drives `bagScreen` only: NOT affected.

Toolchain facts for the relaunch (measured): the machine-global spacetime CLI is 2.11.0; the repo pins 2.8.1 (root Cargo.toml, ci.yml) and the committed bindings are 2.8.1-generated. `~/.local/share/spacetime/bin/2.8.1/spacetimedb-cli generate …` reproduces the committed bindings byte-for-byte (0 files differ); 2.11.0 differs in the header + `cliVersion` (1 file). Regenerate with the 2.8.1 binary (a PATH shim dir, qf-2 precedent), and give `just ci` an isolated `XDG_DATA_HOME` for account-e2e (the default data dir was written by 2.11). NOTE: the main checkout is on `deps/upgrade-2026-10` moving to 2.11.0 — if that merges before qf-3, qf-3's bindings must be regenerated under 2.11.0 at rebase.

Ask: widen qf-3 `touches:` by `client/src/ui/screens/index.test.ts` (REQUIRED) and `client/test-util/mainBootHarness.ts` (recommended); relaunch continues from the pushed slice/qf-3 head (server/wasm/store increment landed; client half = the plan memo's "Client" section). Full plan + tester brief: $MEM/monster-realm-qf-3-plan.md (rewritten this resume); park memo at the end of this resume: $MEM/monster-realm-qf-3-progress.md.

## 2026-10-26T04:43:18Z — qf-3 parked (increment #1 landed, 2/4 gates) — relaunch at increment #2 once touches += index.test.ts [+ mainBootHarness.ts, content_tests.rs]
qf-3 PARKED at slice/qf-3 2c013074 (resume #2, 2026-10-26) — increment #1 LANDED and green: monster_pub.last_care_at_ms (0i64, verbatim copy, GDPR export), client-wasm care_remaining_ms, StoreMonsterPub.lastCareAtMs; ledger 2/4 met (QF3.1, QF3.2 with 8-test rosters incl. the trade-swap + evolution kill tests), QF3.3/QF3.4 unmet by design (placeholder EXPECTs). Local full `just ci` CI-EXIT=0 (2.8.1 shim + isolated XDG_DATA_HOME); remote CI green on 0f86a7a2, 54353a98, 2c013074. Live old→new publish rehearsal passed (the i64 default decodes; pre-existing pub rows read 0 until rewritten — accepted, in the spec build note). PR #596 updated as the park record (draft, do not merge).

ASK (re-serialize, then relaunch at increment #2 — the sheet half): widen qf-3 touches by
 (1) client/src/ui/screens/index.test.ts — REQUIRED (runtime: its untyped Monsters fixture drives the real screen; needs `lastCareAtMs: 0n` + an epoch `wallNowMs`);
 (2) client/test-util/mainBootHarness.ts — recommended (the three wasm mock rosters need `care_remaining_ms`);
 (3) server-module/src/content_tests.rs — for residual R-qf-3-QF3.2-resync (data-integrity/LOW, target qf-3): the content re-derive site has no anchor-preserving test because no content fixture seeds a monster.
Doc staleness OUTSIDE touches for doc-keeper (not blocking): export rosters in docs/DECISIONS.md:14-17, ARCHITECTURE.md:116-120 (+ :250-254 monster_pub prose), .claude/skills/wasm-boundary/SKILL.md:27-33; DECISIONS "Trading resets the bond" transfer-unchanged list (the cooldown anchors); client-surface-privacy HIDDEN_FIELDS has no structural row for last_care_at_ms. Merge-order note: deps/upgrade-2026-10 (2.11.0) landing first means regenerating qf-3's bindings under 2.11.0 at rebase.

Resume point + tester brief: $MEM/monster-realm-qf-3-progress.md and monster-realm-qf-3-plan.md ("Increment #2"). Spend this resume: ~1 tester round ×2 (opus), 6 lenses, 1 full ci, 1 rehearsal.

## 2026-10-26T07:02:26Z — qf-3 PR open — PR #597, 4/4 gates met, full just ci green (increment #2 landed)
qf-3 DONE at slice/qf-3 efa34a3a (master bcda1612 + plan/park wip commits + 2 increments + lens rounds + a DECISIONS.md supersede). PR https://github.com/mdrewt/monster-realm/pull/597 (park record #596 closed unmerged). Ledger 4/4 met, 0 deferred (QF3.3 EVIDENCE excerpt is the vitest timing line — mr-gates records one output line; the CHECK matched Test Files 4 passed (4) / Tests 13 passed | 174 skipped (187); QF3.4: Tests 6 passed | 145 skipped (151)). Local full just ci CI-EXIT=0 with the 2.8.1 PATH shim + isolated XDG_DATA_HOME (client 196 files / 4550 tests; account-e2e green). Lenses: reviewer (M1 idle-freeze -> 1 Hz re-observe of the open Monsters frame in main.ts; M2 DECISIONS.md:44-46 -> superseded in place by doc-keeper), red-team (37 mutants, 25 killed, 2 real test gaps closed: shownOf gated on the Care row; resync test seeding the correct anchor), desync-guard PASS, /simplify no change, verifier PASS. SUPERVISOR ASKS: (1) mr-gates residuals close R-qf-3-QF3.2-resync (the native resync test content_tests.rs nh_sync_content_rederive_preserves_the_care_anchor_on_monster_pub seeds pre-column pubs with anchor 0 and proves the backfill); new residual R-qf-3-QF3.3-announce (ux-a11y/LOW -> backlog) recorded. (2) doc-keeper, outside touches: ARCHITECTURE.md:116-120 + :250-254, .claude/skills/wasm-boundary/SKILL.md:27-33 (export rosters), DECISIONS 'Trading resets the bond' transfer-unchanged list, client-surface-privacy HIDDEN_FIELDS row for last_care_at_ms. (3) harness repo UNCOMMITTED: specs/monster-realm-v2/M-pt3-quickfix.spec.md (increment #1 + #2 build notes), memory/projects/monster-realm-qf-3-plan.md, gates/qf-3.gates.md, residuals ledger, monster-realm-qf-3-progress.md. (4) merge order: deps/upgrade-2026-10 (2.11.0) first means regenerating this branch's bindings under 2.11.0 at rebase. Scratch left (guard-blocked deletes): /tmp/qf3v_target (verifier cargo target), /tmp/tmp.uqw3g7MVYN (red-team mutant specs/PoCs; its worktree removed), /tmp/qf3-pr-body.md, /tmp/qf3-ci.log, /tmp/qf3-red-client.log, /tmp/qf3-green-client.log. Spend: tester x3 (opus), reviewer, red-team, desync-guard, verifier, doc-keeper (opus), 1 full ci, 2 mr-gates checks.
## 2026-10-26T04:45:13Z — qf-3 relaunched for increment #2
Park #4 made progress (incr #1 landed, QF3.1/3.2 met). Touches widened (index.test.ts, mainBootHarness.ts, content_tests.rs) in 9c0c2ec; launched fable@xhigh leader 2648249. PR #596 stays draft park record.


## 2026-10-26T07:34:21Z — qf-3 merged (PR #597)
qf-3 care cooldown surfaced to owner merged as 1a244065. Audit CLEAN, verify CLEAN. master CI run 40285073038 was still in_progress at tick end - NEXT TICK MUST confirm green before launching. Open: so-2 awaiting (issue-592 answer now approve); ttd-1 PR 590. Main project checkout is on deps/upgrade-2026-10 with 9 uncommitted files (operator work, left alone). Next roadmap: qf-4+ per M-pt3-quickfix.

## 2026-10-26T08:02:06Z — 2026-10-26T08:02:06Z — qf-4 + qf-5 launched (opus@high)
Master CI green (1a244065, qf-3 merged). Stale mutex reaped. so-2/ttd-1 already merged; issue 592 closed. Launched qf-4 (leader 2868937) and qf-5 (leader 2869522), disjoint SAFE. Operator checkout on deps/upgrade-2026-10 with 9 uncommitted files left alone; local master ref ff'd via fetch. Next: audit+merge each on .done, serial.
## 2026-10-26T08:52:40Z — qf-4 merged (PR#598)
qf-4 journal title + empty state merged as ef89c954. Audit CLEAN, 3/3 gates. Post-merge master CI in progress at 08:52Z (run 40295245467). qf-5 still in flight (leader 2869522). Main checkout of monster-realm sits on deps/upgrade-2026-10 with operator strays; left untouched.

## 2026-10-26T08:52:46Z — qf-5 PR open (#599)
qf-5 PR #599 open, local just ci green at 3cc94de6, gates 3/3 met. Supervisor: (1) the spec build note under qf-5 in M-pt3-quickfix.spec.md is UNCOMMITTED in the harness tree. It defines 'active conversation' = owner joined + same zone + in_talk_range; it is not a criterion, so there is no seed drift. (2) ENV: the machine default spacetime CLI is 2.11.0 (bin/current), but the repo pins 2.8.1. Under 2.11, bindings-drift falsely reports index.ts drift. 2.8.1 refuses to start against the 2.11-stamped default data dir, which breaks account-e2e. qf-5 ran CI via a PATH-local 2.8.1 wrapper with a private --data-dir (shim dir in /tmp/qf5-shim-dir). Follow-ups for qf-6: dialogue.spec.ts:138-141 stale cadence comment; npc.rs inline TALK_RANGE checks could call game_core::npc::rules::in_talk_range.

## 2026-10-26T09:07:03Z — qf-5 PR #599 e2e red; rerun delegated
PR #599 (3cc94de6): ci pass, e2e failed 13.5c-5 dialogue.spec.ts:309 talkUntilOpen timeout (elder_oak) — master e2e green, qf-5 touches NPC wander/pin so a real regression is plausible. Reran failed job once and delegated to mr-ci-watch. If red again: resume qf-5 as hard-tier (fable) with this failure as resume_block; do NOT merge. Reaped stale mutex (dead pid 3158546) and stale qf-5 run lock.


## 2026-10-26T09:29:31Z — qf-5 merged (PR#599)
qf-5 merged f039c1a6. Audit CLEAN. Master CI post-merge pending at record time — next tick must verify. Main checkout of monster-realm sits on deps/upgrade-2026-10 with operator modifications (left alone). Next: remaining PLAN §9 / spec items.


## 2026-10-26T10:01:26Z — 2026-10-26T10:01:26Z — qf-6 launched
qf-5 merged earlier (f039c1a6, master CI green live). Launched qf-6 fable@xhigh hard (leader 3223112). Next: audit+merge on .done; then qf-7 (battleView only) / qf-9. Main checkout is on operator branch deps/upgrade-2026-10 with uncommitted changes — left alone.
## 2026-10-26T15:32:27Z — qf-7 PR #601 open — QF7.2 shipped; QF7.1/QF7.3 hidden-dependency re-serialize
qf-7 PR https://github.com/mdrewt/monster-realm/pull/601 (branch slice/qf-7, local just ci green, gates 2/4 met + 2 DEFER). Shipped QF7.2 (swap rows only while Swap open; #open state in battleView.ts) + QF7.4. HIDDEN DEPENDENCY for a follow-up (qf-7b): QF7.1 Flee removal needs touches client/e2e/recruit.spec.ts (Flee clicks :611,:732,:776,:893) + client/e2e/trade-interlock.spec.ts:681; QF7.3 skills/bait gating needs client/src/ui/screens/battleScreen.boot.test.ts:347 (+ the e2e recruit/my-battle-privacy/pvp-side-b/monster-privacy specs). qf-8 is after qf-7 and its sweep (QF8.2) expects Flee gone — re-serialize qf-7b before qf-8. Spec gap: qf-7 evidence calls the Swap picker already contextual; the per-member buttons WERE the picker rows. ENV: machine spacetime default + global data dir are 2.11.0 (deps-upgrade in main checkout); local just ci needed a PATH shim (generate->2.8.1, rest->2.11.0) at /tmp/qf-7-shim. Red-team sandbox left at /tmp/tmp.jaR2JmMLyW.
## 2026-10-26T15:46:44Z — qf-9 PR open
qf-9 PR #602 open (branch qf-9, worktree .claude/worktrees/qf-9, head c507020d). Local just ci green (CI-EXIT=0; 2022 nextest, 4614 vitest, evals PASS, obs 8/0) — run under a private PATH shim (spacetime 2.8.1 CLI + start --data-dir scratch) because the global spacetime is 2.11.0 with a 2.11-format data dir from the operator's deps upgrade; the global CLI reds bindings-drift + account-e2e. mr-gates 3/3 met. Summary pane shows full stats (box.summary.stats); raising inventory-only; 6 raising keys retired (roster 373); per-monster care in-flight guard in main.ts. touches-delta: main.feedbackCore.test.ts, main.dispatch.test.ts, catalog.test.ts. Residuals: R-qf-9-RAISINGVESTIGES (LOW), R-qf-9-STALERAISINGREFS (LOW), R-qf-9-TRAINDOUBLEFEED (gameplay/MED). Sandboxes left: /tmp/tmp.ycjKloAPu3 (red-team detached worktree, registered in git worktree list), /tmp/tmp.BGU6s8evee (spacetime shim), /tmp/tmp.dddWLgF8dv (scratch data dir). Awaiting supervisor audit/merge.
## 2026-10-26T16:00:29Z — Supervisor tick 2026-10-26T16:00:29Z: merged qf-7 + qf-9
Merged qf-7 (#601 dba8bf6e) and qf-9 (#602 6d7c2b0a), both audit CLEAN/adjudicated. Master CI post-merge pending; next tick: verify master green, then qf-8 (needs qf-7, qf-9 both now merged) per chain; qf-3 chain per spec. Stale mutex (dead pid 3719462) reaped. Main checkout sits on deps/upgrade-2026-10 with operator mods — left alone.
## 2026-10-26T13:04:15Z — qf-6 merged (PR#600)
qf-6 merged as 6431dc33 after audited hard-tier read. Post-merge master CI was in_progress; next tick must verify green before launching. Main checkout is on deps/upgrade-2026-10 with operator edits (CI workflows/.npmrc) - untouched. Mutex reaped from dead run 12:34.

## 2026-10-26T17:00:57Z — sup tick mr-sup-native-20261026T170029Z-3744756-2773: qf-8 launched
Reaped stale mutex+qf-7/qf-9 locks (merged #601/#602, master CI green 6d7c2b0a). Synced local master ref via fetch origin master:master (main checkout is on operator branch deps/upgrade-2026-10, dirty; untouched). Launched qf-8 opus@high leader 3745183. Next: audit+merge on .done; then qf-10 (after qf-8).


## 2026-10-26T17:29:03Z — qf-8 parked — hidden dependency (all four deletions need files outside touches:)
qf-8 PARKED, no PR. Branch qf-8 pushed (evo-choice deletion + QF8 sweep at a4918e7e, plus a park checkpoint). Blocker: deleting evolutionView's evo-choice buttons orphans catalog keys evolution.card.choosePrompt/evolution.choice.evolve, which reds catalogParity PARITY-04 (DEAD-KEY, roster pinned []). catalog.en/fr + messageIds are outside touches. To Box/To Party, trade-row and PvP deletions are each driven by out-of-touches tests (main.partyFull, main.controls, main.feedbackI18n, main.feedbackCore, socialScreen.boot, e2e monster-privacy, ranked-forfeit). QF8.2 also needs qf-7b's Flee removal. Ledger: QF8.3 met, QF8.1/QF8.2 DEFER (lint BLOCK: 67% deferred, which is a spec touches: defect, not over-scope). Re-serialize with the widened touches: listed in memory/projects/monster-realm-qf-8-progress.md, which also carries the red-team/reviewer test-hardening findings to fold in. Tool bug: mr-gates DEFER_LINE category class [A-Za-z-] rejects the listed category ux-a11y (qf-7 hit it too); wrote gameplay + a note.

## 2026-10-26T17:41:38Z — qf-8 PR #603 open — sweep scaffold only; QF8.1/QF8.2 hidden-dependency DEFER (supersedes the earlier qf-8 park entry)
qf-8 PR https://github.com/mdrewt/monster-realm/pull/603 (branch qf-8, head 1a7338a7, local just ci green CI-EXIT=0 under the 2.8.1 spacetime shim + isolated XDG_DATA_HOME). The net diff is only reachability.test.ts: raising Care/Train sweep row, QF8-1-EVOLVE-POINTER, QF8-3 e2e reference scan. Gates: QF8.3 met (QF8.3 MET 6 e2e-deleted=0); QF8.1/QF8.2 DEFER to backlog. mr-gates lint BLOCKs at 67% deferred; the cause is the spec's touches: list, not over-scope. Evo-choice deletion is done in commit a4918e7e (cherry-pick it) but held back: PARITY-04 DEAD-KEY needs catalog.en/fr + messageIds. Re-serialize qf-8b with the widened touches: per the spec's new qf-8 build note (M-pt3-quickfix.spec.md, uncommitted harness edit) and memory/projects/monster-realm-qf-8-progress.md; qf-7b (Flee) must come first for QF8.2. Uncommitted harness edits: the spec build note and gates/qf-8.gates.md. Scratch dirs left in place: /tmp/qf8rt /tmp/qf8v.X0N7 /tmp/tmp.nbzzSpegmm /tmp/tmp.17g0QBijvp.
## 2026-10-26T19:12:18Z — qf-8 merged (increment) — qf-8b needs widened touches
PR603 merged b8cf3387 (reachability.test.ts sweep scaffold). Remaining QF8.1/QF8.2 deletions (To Box/Party, trade rows, PvP btns, evo-choice) blocked by hidden deps; spec build note (uncommitted in harness specs/M-pt3-quickfix.spec.md) lists needed touches: catalog.{en,fr}/messageIds/styles.css, main.partyFull/controls/feedbackI18n/feedbackCore tests, socialScreen.boot.test, e2e monster-privacy/ranked-forfeit. Next: commit spec build note + widen qf-8 touches (doc chore), relaunch qf-8b; Flee row needs qf-7b. Verify master CI for b8cf3387 (run 40382918252).
## 2026-10-26T17:55:44Z — sup: qf-8 PR #603 CI-wait delegated
qf-8 PR #603 (1a7338a7): ci pass, e2e pending. mr-ci-watch launched; next event tick runs mr-audit + mr-gates verify (QF8.1/QF8.2 DEFERred hidden-dependency, QF8.3 met) then merge adjudication.


## 2026-10-29T23:08:31Z — 2026-10-29T23:08Z supervisor: qf-8 resumed after crash
qf-8 prior run (2026-10-26) died on external API 403 oauth_org_not_allowed (not a code failure; no park bump). Reaped stale mutex+run lock, retook mutex, relaunched hard-tier fable@xhigh (leader 5549) resuming worktree .claude/worktrees/qf-8 (19 uncommitted files kept). Master CI green (b8cf3387). Main checkout of monster-realm sits on deps/upgrade-2026-10 with operator edits - left alone. Next tick: standdown while live; merge via audit when .done lands.

## 2026-10-30T04:48:13Z — qf-7b PR #606 open — QF7B.2 + QF7B.4 shipped; QF7B.1/QF7B.3 DEFERred (catalog dead-key hidden dependency) — re-serialize qf-7c
qf-7b PR https://github.com/mdrewt/monster-realm/pull/606 (branch slice/qf-7b, worktree .claude/worktrees/qf-7b, head 66fedc22). Local just ci green on this tree (CI-EXIT=0: nextest 2022/2022, 15/15 evals, client 4624/4624, verify-build OK); no PATH shim needed now that master pins 2.11.0. Ledger: 3/5 met (QF7B.2, QF7B.4, X1 e2e 17 passed), QF7B.1 + QF7B.3 DEFER -> backlog. HIDDEN DEPENDENCY the qf-7 note missed: deleting the legacy Flee orphans battle.action.flee -> catalogParity PARITY-04 DEAD-KEY; qf-7c needs touches += client/src/ui/i18n/messageIds.ts, catalog.en.ts, catalog.fr.ts, catalog.test.ts (+ battleView.ts, battleView.test.ts, reachability.test.ts for the QF8_RETIRED Flee row). The e2e half is DONE in #606 (every Flee text click -> battle-command-run), so qf-7c has no e2e work. Spec build note added under ### qf-7b in M-pt3-quickfix.spec.md (UNCOMMITTED harness edit, commit it). Residual R-qf-7b-CURELIST (LOW): Bag cure list still renders at rest (spec-silent). Verify notes: QF7B.2/QF7B.4 CHECKs run under dash (fixed; sh -n clean); X1 needs a LIVE spacetime on :3000 (spacetime start --data-dir $(mktemp -d)/data --in-memory) and more than the 120 s verify cap -> run check/verify with --timeout 2400 from the worktree. Lenses closed: reviewer x2, red-team x2 (36 mutants, 31 killed, rest equivalent/not reachable, 5 extra teeth added), /simplify, verifier PASS (its own mutant now killed). desync-guard/reducer-security-auditor N/A (client view only). Scratch left (guard-blocked deletes): /tmp/tmp.106h9w7zAx, /tmp/qf7b-mut.DE5rvF, /tmp/qf-7b-e2ered.leKhSp (registered detached worktree: git worktree remove it), /tmp/qf-7b-stdb.W5dXtk, /tmp/qf-7b-stdb2.zz0VEo. Spacetime sandbox servers stopped; port 3000 free. Next: supervisor CI-watch + audit + merge of #606, then serialize qf-7c with the widened touches above (qf-10 after qf-8 otherwise).
## 2026-10-26T20:01:40Z — qf-8 resume launched (qf-8b scope)
Spec touches widened (harness 487b715); qf-8 relaunched hard-tier fable@xhigh leader 3937118 after qf-8 PR603 scaffold merged. QF8.2 Flee row still needs qf-7b. Stale mutex (pid 3914081 dead) reaped. tier=hard; reason=resume-after-park




## 2026-10-30T01:23:51Z — qf-8 merged (PR#604)
qf-8 QF8.1/QF8.3 merged as b55806da; QF8.2 Flee row deferred pending qf-7b. Master CI run 40985379765 in progress — verify green before next launch. Worktree+branch removed.

## 2026-10-30T03:01:58Z — qf-7b launched (QF7.1/QF7.3 remainder)
Stale mutex (pid 154183 dead) + qf-8 run lock reaped, mutex retaken. master b75c28e9 CI green (qf-8 + operator deps campaign #605 merged). Next unfinished: qf-7b. Authored spec section qf-7b + widened touches (harness fc5c1f1 + follow-up). First spawn seeded 0 criteria (no section) - killed by recorded pid, respawned, reseeded (4 gates). Hard-tier fable@xhigh leader 209617. tier=hard; reason=prior-deferral-resume. Then: qf-10 (after qf-8).

## 2026-10-30T08:08:48Z — qf-7c PR open — supervisor merge
qf-7c (QF7B.1 + QF7B.3) is at a valid stop: PR https://github.com/mdrewt/monster-realm/pull/607 (branch slice/qf-7c, head 69920a71, worktree .claude/worktrees/qf-7c). Local just ci green (CI-EXIT=0: nextest 2022/18 binaries, 15/15 evals, client 4628/197, validate 8/0/0); ledger qf-7c 5/5 met (X1-X5 re-executed on this head). Spec: 'As built (qf-7c)' note under ### qf-7b in M-pt3-quickfix.spec.md (uncommitted harness edit, beside qf-7b's). Residuals to close on merge: R-qf-7-QF7.1, R-qf-7b-QF7B.1, R-qf-7b-QF7B.3; R-qf-7b-CURELIST stays open. Out-of-touches note only: client/e2e/a11y.spec.ts:1032 fixture comment still says 'Flee'. Scratch left (guard-blocked deletes): /tmp/qf7c-rt.jkPToL (detached worktree wt/ registered), /tmp/qf7c-probe.*, /tmp/qf-7c-*. Nothing in flight.

## 2026-10-30T05:03:42Z — qf-7b merged (#606)
qf-7b merged fb386b1b after green CI + audit CLEAN + hard-tier read. Remaining qf-7: qf-7c (QF7B.1/.3 Flee removal; touches += i18n messageIds/catalog.en/catalog.fr/catalog.test, battleView.test m24s3 roster, reachability.test). Master CI post-merge run 41006079383 pending at tick end; verify before launching qf-7c.

## 2026-10-30T08:10:48Z — SUPERVISOR: qf-7c PR #607 CI pending — delegated to mr-ci-watch
PR #607 (qf-7c, head 69920a71) checks ci+e2e pending at 2026-10-30T08:11Z; mr-ci-watch pid 635802 launched; merge + audit on the resume event tick. master CI green (fb386b1b).

## 2026-10-30T06:01:03Z — qf-7c launched
qf-7c launched fable@xhigh after qf-7b #606 merge. Spec section ### qf-7c absent -> mr-gates criteria=0; adjudicate against qf-7b QF7B.1/.3 at merge.



## 2026-10-30T08:33:24Z — qf-7c merged (#607)
PR #607 squash-merged as 57cf7b62 after audit adjudication (legit roster 362->361). Master CI queued at merge time; verify green next tick. Next: remaining qf-7 / PLAN §9 order per queue (empty). Worktree + branch removed.

## 2026-10-30T09:01:00Z — 2026-10-30T09:01Z supervisor: master 57cf7b62 (qf-7c #607) e2e red on dialogue.spec 13.5c-5 talkUntilOpen timeout (known flake, seen on qf-5; diff is battle-UI only)
Reaped stale mutex (dead 637473) + qf-7c lock. Reran failed e2e job on run 41026962427 (one rerun). Next tick: if green -> proceed to next qf slice; if red again -> launch hard-tier ci-fix-<utc> (revert-first).

## 2026-10-30T10:01:08Z — 2026-10-30T10:01:08Z — qf-10 launched
Master 57cf7b62 CI green, no open PRs, no HIGH/CRIT residuals. Launched qf-10 (QF10.1-5 terminology renames) opus@medium content tier leader=683544. Next: audit+merge qf-10, then qf-11.


## 2026-10-30T11:56:35Z — qf-10 merged (#608)
qf-10 terminology renames merged as fbfacb3b. QF10.1 remainder (chrome.help.title, menu.* leaves, partyFull, battleBag copy) deferred to backlog: needs a re-serialized follow-up touching ~13 test files. Master CI on fbfacb3b in progress; next tick: verify green, then pick next PLAN item/queue head.


## 2026-10-30T13:03:07Z — 2026-10-30T13:03:07Z — qf-11 launched
Master fbfacb3b CI green (verified live), no open PRs, no HIGH/CRIT residuals. Reaped stale qf-10 run lock + dead chain mutex (pid 931667). Launched qf-11 opus@high leader=983079 (QF11.1-3 tab-strip CSS). qf-10 remainder QF10.1/QF10.2 stays as LOW residuals R-qf-10-QF10.1/.2 (fold into a later milestone spec or idle slot). Next: audit+merge qf-11 (CI-wait via mr-ci-watch), then qf-12.

## 2026-10-30T13:28:45Z — qf-11 PR open (#609)
PR https://github.com/mdrewt/monster-realm/pull/609 (branch slice/qf-11 @ 89914484). Local just ci green (CI-EXIT=0; nextest 2022/2022, client 4654/4654, 15/15 evals). mr-gates qf-11 3/3 met. CSS: .mr-frame-tabstrip flex 0 1 auto + max-width 100%; .mr-nav-tab nowrap; bag/controls strips get the class; #help-screen gets mr-nav-list (R-qf-4-HELPSCREENUL dispositioned fixed). Accepted side effect: titlebar RB hint now adjacent to tabs. Residual R-qf-11-GEOMETRY (backlog LOW). Spec build note added to M-pt3-quickfix.spec.md (harness, uncommitted). Scratch left: /tmp/tmp.s0fbNDfswa (red-team sandbox worktree), /tmp/tmp.DopGWNA5Xs (verifier scratch worktree, still registered — needs git worktree remove --force). Supervisor owns CI-watch + merge.
## 2026-10-30T14:45:08Z — 2026-10-30T14:45Z — qf-12 merged (#610 c8ee89e0); qf-16 launched
qf-12 PR#610 audited CLEAN (no removed checks), squash-merged c8ee89e0, master CI green. QF12.1/12.2 shipped; QF12.3 (drop dead mr-frame-hints) DEFERRED on measured hidden dep (menuView.ts TS2353) -> residual R-qf-12-QF12.3, needs a relaunch with touches widened to menuView.ts. qf-7c already merged (57cf7b62). Launched qf-16 (opus@high routine, leader 1239907); then qf-13 -> qf-14 -> qf-15 -> qf-17. Worktree/branch qf-12 removed.
## 2026-10-30T13:49:52Z — qf-11 merged (#609)
qf-11 squash-merged as 94b6e349 after clean audit. Master CI (run 41066185333) was still running at tick end — next tick must verify it green before launching qf-12 (next in chain qf-11→qf-12→qf-16).

## 2026-10-30T15:29:10Z — qf-16 merged (#611, fd94171e)
Rankings rows display-only + scroll affordance. Audit CLEAN, 2/2 gates. Post-merge master CI in progress (run 41081023263) — next tick verify green before launching. Remaining: qf-13,14,15,17.

## 2026-10-30T16:01:19Z — Tick mr-sup-native-20261030T160041Z-1334531-6294: qf-13 launched
Master fd94171e CI green; stale qf-12/qf-16 locks + mutex reaped. Launched qf-13 (opus@high, leader 1334788). Next: qf-14,15,17 serial.
## 2026-10-30T16:24:24Z — qf-13 PR#612 open
qf-13 PR #612 open, local just ci green (vitest 4673/4673, evals PASS). Gates 2/4 met (QF13.1 frame titles, QF13.2 Account column), 2 DEFERred on measured hidden deps: QF13.3 needs overlayA11yWiring.test.ts in touches (privacyView pinned as native anchor); QF13.4 needs main.ts + main.input.test.ts + i18n/catalog.test.ts + e2e/accounts.spec.ts. TOOL BUG: mr-gates DEFER_LINE category group [A-Za-z-]* cannot parse the legal category ux-a11y, so both DEFERs carry [content/LOW]; true category ux-a11y. Leftover sandboxes: /tmp/tmp.frJRicE8wN, /tmp/tmp.w2dd1OSBXb (red-team/verifier worktrees). Worktree .claude/worktrees/qf-13 on slice/qf-13.
## 2026-10-30T16:54:39Z — qf-13 merged (#612)
qf-13 merged a668c3d1, master CI green. Frame titles + layout-matched D-pad axis shipped (QF13.1/.2); QF13.3/.4 deferred to backlog residuals. Next: re-derive from spec M-pt3-quickfix (qf-7b/qf-7c/qf-10/qf-11 unbuilt per park_counters).
## 2026-10-30T17:06:04Z — qf-14 parked — hidden dependency at verify-scope (buttons.ts ACCELS + router.ts + controlsModel.ts)
qf-14 PARKED at verify-scope: no code, no PR (empty diff). Branch slice/qf-14 @ cb1d6719 = origin/master a668c3d1 + one empty wip commit (pushed). Worktree .claude/worktrees/qf-14 is kept with client/node_modules and client-wasm/pkg ready. Ledger untouched (3/3 seeded, CHECK/EXPECT blank). MEASURED with tsc + full vitest (4673 tests; probe reverted, patch saved at memory/projects/monster-realm-qf-14-probe.patch). The closed accel roster ACCELS is client/src/input/buttons.ts:23, and router.ts:126 ACCEL_PATHS and controlsModel.ts:78 ACCEL_LABELS are exhaustive Records over it, so no criterion fits the declared touches. Outside touches, 5 test files red on count/roster pins: router.test.ts (TS2741 + 3 pins), helpModel.test.ts (23 rows), main.help.test.ts (23 rows x2), i18n/catalog.test.ts (361-key roster), screens/optionsScreen.test.ts (59 items). Recommended default key: KeyY. KeyK adds ~20 reds (K is the tests' free key), and G/H/T/O are retired and pinned inert. Ask: widen touches by buttons.ts, router.ts, controlsModel.ts plus those 5 tests (recommended: main.accel.test.ts, controlsModel.test.ts), then relaunch at PLAN in the existing worktree. Full record: memory/projects/monster-realm-qf-14-progress.md. Spend: reads + 2 probe runs; no subagents. Scratch: /tmp/qf14-probe*.json|log only.
## 2026-10-30T17:24:04Z — qf-14 park consumed — spec touches widened (9037d63)
Supervisor widened qf-14 touches per measured park memo (buttons.ts, router.ts, controlsModel.ts + router/helpModel/main.help/catalog/optionsScreen pin tests + main.accel/controlsModel proofs). Default key KeyY. Next tick: resume qf-14 (hard-tier not required; routine opus@high, resume_block from monster-realm-qf-14-progress.md) in existing worktree .claude/worktrees/qf-14. Draft PR #613 is a park record — close unmerged when real PR opens. Stale mutex + qf-14 run lock reaped.
## 2026-10-30T17:07:02Z — qf-14 park record is draft PR #613 (never merge)
qf-14 park record is draft PR https://github.com/mdrewt/monster-realm/pull/613 (branch slice/qf-14 @ cb1d6719, one empty wip commit, empty diff vs master). Close it unmerged when the real qf-14 PR opens. Blocker and the widened-touches ask are in the PR body and in memory/projects/monster-realm-qf-14-progress.md.

## 2026-10-30T18:28:39Z — qf-14 PR #614 open, CI pending — delegated to mr-ci-watch (mr-sup-native-20261030T182827Z-1601065-2018)
Run finished rc=0 attempts=1 (opus@high); local just ci green (vitest 4686, nextest 2022), gates 3/3. Park PR #613 closed unmerged. PR #614 ci+e2e IN_PROGRESS at 18:29Z; mr-ci-watch launched; next tick (src=ci) runs mr-audit + merge. Reaped dead stale mutex (owner 1504629).

## 2026-10-30T19:01:49Z — qf-14 merged (#614)
qf-14 (Controls accelerator Y, 11->12 accels) merged as 9c8d32be after audit CLEAN and 3/3 gates met. Master CI on the merge commit was still queued; next tick must confirm it green before launching. queue empty; next target is the next unfinished PLAN §9 item / qf remainder.


## 2026-10-30T20:01:23Z — qf-15 launched (opus@high); qf-14 post-merge CI green
Master 9c8d32be CI verified green live. Stale mutex + qf-14 run lock reaped. qf-15 (zone cue + warp relocation) launched opus@high leader 1618875, gates seeded 3/3 unmet. Next tick: on .done, mr-audit + merge. Later: qf-13 remainder (QF13.3/4) needs a follow-up spec with widened touches; qf-17 after qf-15.

## 2026-10-30T20:07:27Z — qf-15 parked
qf-15 PARKED at verify-scope on measured hidden dependencies; nothing built, no PR, no code commits. Worktree .claude/worktrees/qf-15 (branch qf-15 = origin/master 9c8d32be, clean, not pushed). QF15.2 measured with the candidate RON edit (warps -> zone0 (1,5) <-> zone1 (1,5)): 3 game-core/src/world.rs inline tests + 2 sim-harness/src/world.rs tests pin (5,5); content-version eval needs server-module/src/lib.rs CONTENT_VERSION 23->24 + evals/baselines/content-hash.json; e2e shop-npc.spec.ts + wallet-balance.spec.ts hard-code the (5,5) walk. QF15.3 pin (movement_tests nh_movement_tick_warps_a_player_but_never_an_npc) stays green. QF15.1: no zone-name channel in touches — zone_def is public with bindings but unsubscribed; recommended additive route needs client/src/net/connection.ts (+connection.runtime.test.ts, optional rowConvert.ts/.test.ts). Full measured touches proposal + split option (qf-15a content/Rust/e2e, qf-15b client cue) + QF15.3 CHECK in monster-realm-qf-15-progress.md. Resume: widen spec touches (or split), relaunch from the plan phase.


## 2026-10-31T01:51:53Z — bt-spec: PR #161 open, gate green (SELFCHECK-OK), ledger 9/9 — M-battle-tactics elaborated to 17 measured slices (P1 bt-1..13, P2 bt-14..17)
**TERMINAL STATE: PR https://github.com/mdrewt/claude-harness/pull/161 open (harness repo, doc-only), branch `bt-spec`, worktree `.claude/worktrees/bt-spec`, HEAD `8504beb` pushed (2 wip commits: elaboration `0b2ffc2` → BT8.6 wording `8504beb`), base `origin/main` `6822dfe`. Gate: `mr-selfcheck` SELFCHECK-OK (no mr-* tool touched/added); ledger `gates/bt-spec.gates.md` 9/9 met, 0 deferred (X1 selfcheck · X2–X9 via `gates/bt-spec.probe.mjs`: seedsim 17 slices / 107 criteria / 0 uncaptured, graph acyclic, 6 concurrent pairs disjoint + non-structural, route=project, 4 absorbed residuals each owned once, PLAN item 4 synced, diff ⊆ {M-battle-tactics.spec.md, PLAN.md}, DoD section). Harness `just ci` exit 0 (not the gate). Main checkout untouched. Supervisor owns the merge.**

**What shipped.** `M-battle-tactics.spec.md` SKETCH → build-ready: 17 slices, P1 `bt-1`…`bt-13` (spine bt-1→…→bt-8 serial; tail (bt-9→bt-13) ‖ (bt-10→bt-11→bt-12)), P2 `bt-14`…`bt-17` (PvP server, PvP client, live-path flip + e2e migration, 1v1 purge CLIENT-first). Touches measured against monster-realm `master` `40bd3c6e` by three read-only sweeps; each slice carries a `Measured:` paragraph naming the roster/pin/baseline files that red. Structural set (schema.rs, module_bindings/, 4 eval baselines) confined to bt-7/8/14/17. PLAN §9 item 4 one-liner updated (elaborated 2026-10-30, 17 slices, head `bt-1`).

**Flagged shapes (spec Risks; operator/judge may object before the named slice):** (a) sidecar tactical content registries instead of fields on the five content structs (~100 struct literals + production marshaling + encounter schema avoided) — bt-6; (b) tactical UI inside the existing `battleView` frame id, no new OverlayId — bt-10/12; (c) Hold Y/Hold B → confirmed menu row + B tap (no hold edge exists; gestures → M-gamepad) — bt-10/11; (d) PvP `format` from the party pick, no reducer signature change — bt-14; (e) build-phase start via cfg-gated dev reducers called by `spacetime call` — bt-8/14, flipped in bt-16.

**Lenses:** 3 Explore measurement sweeps (~1.2M subagent tokens). `/tmp/mr_warn_bt-spec` rose after the sweeps launched → plan/draft reviewer + red-team folded into the orchestrator's self-review (disclosed in the PR body). No tester (doc-only). No DECISIONS entry (game repo's; spec names the forks bt-3/bt-4/bt-7/bt-16 owe).

**Supervisor next:** merge #161; `mr-gates init --slice bt-1 --repo project` (seeds 9 criteria); launch `bt-1` (MODERATE). Project-side doc rot found by measurement (deleted manifest-totality test still cited; absent `rb77_` tests; stale counts) is listed in the spec's Risks — not fixed here. Memory: `monster-realm-bt-spec` (trap list for every bt-* builder).
## 2026-10-30T20:08:08Z — qf-15 parked — branch pushed
Addendum: branch qf-15 pushed to origin at 1816a51e (empty wip park checkpoint commit on 9c8d32be documenting the hidden-dep blocker). No PR opened (nothing in-touches to ship). Blocker + measured touches proposal: monster-realm-qf-15-progress.md. Supervisor: widen qf-15 touches (or split qf-15a/qf-15b) and relaunch; the branch can be resumed or discarded.



## 2026-10-30T20:08:55Z — qf-15 parked — draft PR #615
Draft park PR https://github.com/mdrewt/monster-realm/pull/615 (empty wip commit 1816a51e; DO NOT MERGE — close it on relaunch). Blocker + measured touches proposal unchanged: monster-realm-qf-15-progress.md.

## 2026-10-30T21:01:36Z — qf-15 relaunched hard-tier with widened touches
Supervisor mr-sup-native-20261030T210048Z-1683290-30156: qf-15 first run parked at verify-scope (nothing built). Spec touches widened per memo (harness 6822dfe). Relaunched fable@xhigh leader=1684077 resuming branch qf-15; draft PR #615 is the park PR, expect it reused/updated.
## 2026-10-30T22:33:08Z — qf-15 merged; qf-17 launched
qf-15 MERGED (#615, 35f85d59), master CI green. QF15.1-3 shipped (zone cue, warp pair (1,5), CONTENT_VERSION 24). qf-17 launched fable@xhigh leader 1899315 (hard: additive battle-row column + shop wallet). Open: qf-13b remainder (QF13.3/4 deferred, no spec), QF7B CURELIST residual. Mutex held by this tick until release.

## 2026-10-31T00:02:17Z — qf-17 merged (#616)
KO-win payout lines (gold+xp) under Victory via batch-diff in main.ts; shop wallet readout verified. master 40bd3c6e CI green. Open: qf-13b (QF13.3/4 hidden deps, no spec), QF7 CURELIST residual. Next tick: derive next work (qf series otherwise exhausted; check PLAN §9).

## 2026-10-31T01:01:30Z — bt-spec launched — M-battle-tactics elaboration
qf series exhausted (qf-13 QF13.3/4 + CURELIST remain LOW residuals, no self-promote). Next PLAN §9 item = M-battle-tactics (sketch, P0 done): launched doc-only harness slice bt-spec fable@xhigh hard (leader 2054640) to elaborate P1/P2 slices with measured touches + id-led EARS. Next tick on .done: mr-audit, merge doc PR, seed gates, launch first P1 slice.


## 2026-10-31T03:02:03Z — bt-1: PR #617 open, local just ci green, ledger 9/9
bt-1 (game-core tactics geometry/movement/map validator + native=wasm golden harness) — PR mdrewt/monster-realm#617, branch slice/bt-1, worktree .claude/worktrees/bt-1. Local just ci CI-EXIT=0 (nextest 2179, vitest 4718). Ledger 9/9 met, 0 deferred. Lenses: plan review, reviewer, red-team (113 mutants; survivors + u16 overflow panic closed in tester round 2), desync-guard PASS, /simplify, verifier PASS. touches-delta: game-core/proptest-regressions/tactics/movement_tests.txt (proptest seed, repo convention). Judgement calls flagged in PR (backward pred tie-break; min-opposing larger-side rule over all 9 pairs; all-6-spawns Walk component; find_path explicit start; AimNotCaster/BadRange; deny_unknown_fields on BattleMapDef) — bt-3 may want a DECISIONS entry for the tie-break. Red-team sandbox left at /tmp/tmp.Qgpw4YboIB (recursive delete blocked). Supervisor next: merge #617, then bt-2.
## 2026-10-31T01:55:27Z — bt-spec merged; bt-1 launched
bt-spec merged (harness PR #161, 8077b02). M-battle-tactics is build-ready with 17 slices; qf wave (qf-1..qf-17) fully merged. Launched bt-1 (opus@high, routine, leader 2174199). Next: after bt-1 merges, bt-2 (serial game-core spine bt-1..bt-8). Mutex dead-owner reaped via mr-unlock before take.


## 2026-10-31T07:08:18Z — bt-2 PR open — awaiting supervisor merge
bt-2 (game-core tactics::{tuning,economy,initiative,resolve,upkeep,outcome} + golden join) — PR https://github.com/mdrewt/monster-realm/pull/619, branch slice/bt-2 @ fde44610, worktree .claude/worktrees/bt-2. Local just ci CI-EXIT=0 (nextest 2320, vitest 4723/201 files, 15 evals, observability). Ledger 10/10 met, 0 deferred (mr-gates check on the final tree). Lenses: plan review (17 amendments), reviewer, red-team (252 hand mutants, 100k-battle fuzz; 12 survivors → tester round 2 closed, red-proofed in a sandbox), desync-guard PASS, verifier PASS; cargo-mutants scoped to the bt-2 files: 0 missed after restructuring 2 equivalent comparisons. 141 native tests + 286 golden cases + 11 vitest. SPEC ERRATA (operator ruling requested, mdrewt/monster-realm#618, non-blocking): BT2.8 'terminates by r14' is false under the spec's floor formula (max_hp 19/39/79 counterexamples) — implemented as specified, true bound r15 proven; BT2.6 First-Stand clear-on-save vs 'no pre-activation KO' — EARS literal shipped, sim = single-unit nova bound. Residuals: R-bt-2-R-bt-2-decisions → bt-3 (docs/DECISIONS.md entry for the bt-2 conventions: player = Side::A in Wild, coin bit 0 → A, Practice = PvP ruleset, Wild double-KO SideBWins/FixedOrder, 2 draws per target, flank pre-attack board, Freeze thaw on the shared stream, cap >=, First-Stand clear-on-save, Surge r15); R-bt-2-R-bt-2-m14-restated → bt-17. bt-3 obligations: derive Entry::Move.taxed server-side from disengage_taxed (never client input); call turn_start once per unit-turn (it always refreshes AP) and turn_end once; call outcome::settle after every non-attack entry; never serialize TacticalState (seed, action_seq) toward a client; TacticalState::new needs a validated map. Sandboxes left (recursive delete blocked; registered worktrees → git worktree prune after reaping): /tmp/tmp.zir6Jszr7V (red-team, wt..wt4), /tmp/bt2-mutants.uf4LV2 (mutants). mr_warn_bt-2 was raised mid-slice; converged. Next: supervisor audits + merges https://github.com/mdrewt/monster-realm/pull/619, then bt-3.

## 2026-10-31T10:52:31Z — bt-3 PR open — awaiting supervisor merge
bt-3 (game-core tactics::{types, events, clock, queue} + storage enums QueuedAction/TurnState/Phase/EventPayload) — PR https://github.com/mdrewt/monster-realm/pull/620, branch slice/bt-3 @ 7f0e9779, worktree .claude/worktrees/bt-3. Local just ci CI-EXIT=0 (nextest 2476, vitest 4723/201 files, 15 evals incl. spacetime-type-snapshot re-baselined append-only, observability). Ledger 10/10 met, 0 deferred (mr-gates check from the worktree, --timeout 900, CHECK-EXIT=0). 156 bt-3 tests (tester opus x2: 122 RED on todo!() + 34 survivor/fix pins, red-proofed in a sandbox). Lenses: plan review (reviewer+red-team, 40 findings folded in), reviewer, red-team (222 mutants, 1500-seed fuzz, 0 panics), desync-guard (seam FAIL -> fixed: scrubbed hook view + event roster + outcome restore), verifier PASS, /simplify applied, doc-keeper (2 DECISIONS entries). SUPERVISOR ASKS: (1) residuals close R-bt-2-R-bt-2-decisions (the second DECISIONS entry); 6 new residuals registered R-bt-3-{PERSIST->bt-7, TUNINGVALID->bt-6, CLIENTEXPORT->bt-11, HOOKSRULES->bt-9, ENDHOW->bt-14, ARCHDOC->bt-7}. (2) Harness repo UNCOMMITTED: memory/projects/monster-realm-bt-3-plan.md, gates/bt-3.gates.md, mr-residuals.jsonl (+6), specs/monster-realm-v2/M-battle-tactics.spec.md (Build note (bt-3) under section bt-3). (3) Squash-merge title must be feat(game-core): ... (wip commits match no cliff group). (4) Sandboxes left (recursive deletes guard-blocked; worktrees registered -> git worktree prune after reaping): /tmp/bt3-redteam-GvFyJ6, /tmp/tmp.Mh18Voz6kH (wt, wt1-wt5, probe), /tmp/tmp.IgekjHiz7y, /tmp/bt3v_sandbox.koZ5tY, /tmp/bt3v_target, /tmp/bt3v_scripts. Design departures flagged in the PR body: Hooks seam (touches force it), SpacetimeType one-field variants, EndHow carries Forfeit/Fled/AutoFlee (BattleEndHow out of touches), per-side clocks (Practice: both sides one player), late submit accepted vs fire StaleWindow, turn-skip uses TurnEndCause::AutoPass, a halted AI plan ends committed (Guard possible). Known coverage gap: late-submit acceptance pinned only at the clock layer (verifier M12). Next: supervisor hard-tier audit read + merge, then bt-4.
## 2026-10-31T04:01:13Z — bt-1 merged (PR#617)
bt-1 squash-merged to master b9a3dd64; worktree/branch removed. Master CI run 41166775433 in progress at merge; next tick: confirm green then launch bt-2 per M-battle-tactics.spec.md. Note: mr-audit/mr-gates need login-shell PATH (cargo) to re-verify.




## 2026-10-31T14:58:09Z — bt-4 PR open — awaiting supervisor merge
bt-4 (game-core tactics::ai seed-free stances + tactics::encounter packs/clamp/per-wild seeds/map pick + golden AiPlan join) — PR https://github.com/mdrewt/monster-realm/pull/621, branch slice/bt-4 @ 348911bc, worktree .claude/worktrees/bt-4. Local just ci CI-EXIT=0 (nextest 2554, vitest 4725/201 files, 15 evals, observability 8/8). Ledger 8/8 met, 0 deferred (mr-gates check from the worktree on the final tree). 78 bt-4 tests (tester opus x2: 63 RED on todo!() + 15 round-2 teeth, 12/12 named mutants red-proofed in /tmp/bt4-redproof.BAN5bk), 20 AiPlan fixture cases, 2 vitest. Lenses: plan review (planner+reviewer+red-team), reviewer, red-team (cargo-mutants 0 missed after fixes; ~216k executor scenarios, 0 halts), desync-guard PASS, verifier PASS, /simplify, doc-keeper (1 DECISIONS entry). One deletion adjudicated (fixture-shape golden test; survivors named in the PR). /tmp/mr_warn_bt-4 rose after the verifier: its one surviving mutant recorded as R-bt-4-TERRITORIALTILE instead of a third tester round. Residuals: R-bt-4-{TUNINGCONSTS->bt-6, HOOKTUNING->bt-9, GATEPREDICATES->bt-9, TERRITORIALTILE->backlog, CHIPLABEL->bt-11}. Harness repo UNCOMMITTED: memory/projects/monster-realm-bt-4-plan.md, monster-realm-bt-4-tester-brief{,-r2}.md, gates/bt-4.gates.md, mr-residuals.jsonl (+5), specs/monster-realm-v2/M-battle-tactics.spec.md (Build note (bt-4)). Sandboxes left (recursive delete blocked; git worktree prune after reaping): /tmp/bt4-redteam.8X8BFu, /tmp/tmp.xcuWfvHmdT, /tmp/bt4-verify.Wgdny1, /tmp/bt4-redproof.BAN5bk. Squash title must be feat(game-core): .... Next: supervisor hard-tier audit read + merge, then bt-5.
## 2026-10-31T04:21:53Z — tick 2026-10-31T0421Z: launched bt-2
bt-1 merged, master CI green. Reaped stale mutex + 2 dead run locks. bt-2 launched fable@xhigh (leader 2550064). Next: audit+merge bt-2, then bt-3.

## 2026-10-31T07:29:35Z — bt-2 merged (PR#619)
bt-2 (tactics economy/initiative/resolve/upkeep/outcome + TacticsTuning + golden join) merged 477f2078 after hard-tier audit read; gates 10/10 re-verified with cargo on PATH (audit's own re-run lacks ~/.cargo/bin -> spurious EVIDENCE-MISMATCH). Post-merge master CI was in_progress at 07:33Z; next: confirm green, then launch bt-3 per M-battle-tactics spec.


## 2026-10-31T08:00:57Z — bt-3 launched (hard tier)
bt-2 merged 477f2078, master CI green. Launched bt-3 (queue+clock+events, SpacetimeType enums) fable@xhigh leader=266598. Next: on .done, mr-audit (hard = mandatory read) then merge; then bt-4.

## 2026-10-31T11:11:07Z — bt-3 MERGED (PR#620) — master CI pending
bt-3 merged as 220535e0 after hard-tier audit read. Worktree/branch removed, residuals closed. Post-merge master CI run 41195647711 still in progress at tick end; next tick: confirm green, then launch bt-4 (first unbuilt bt slice per M-battle-tactics.spec.md). Trap: mr-audit/mr-gates verify need ~/.cargo/bin on PATH or every cargo CHECK reads EVIDENCE-MISMATCH.

## 2026-10-31T15:17:01Z — bt-4 merged (PR#621, fce1d6da)
Audited hard-tier: seed-free tactics::ai + tactics::encounter + AiPlan golden; no schema/reducer touch. PR CI+e2e green. Master CI run 41213921641 pending at merge; next tick verify live, then bt-5 per M-battle-tactics spec.

## 2026-10-31T16:00:56Z — bt-5 launched (opus@high routine)
master CI green (fce1d6da, bt-4 merged). Reaped stale mutex + bt-4 run lock. Launched bt-5 (tactics::recruit + rewards, rules only) leader 2611490. Next: audit+merge on .done, then bt-6.

## 2026-10-31T17:17:12Z — bt-5 MERGED, bt-6 launched
bt-5 (tactics::recruit+rewards) merged as PR#622 (daaf8c8f), master CI green. Audit flag = .skip(1) iterator false positive; seed drift = BT5.2/BT5.6 wording refinements, reseeded. bt-6 launched opus@medium tier=content leader 2928944. Spec build-note edits for bt-3/4/5 remain uncommitted in harness working tree (operator/run strays; not committed).

## 2026-10-31T17:44:39Z — bt-6 PR open
bt-6 (tactical content sidecars + retune + 8 maps + tactics_tuning.ron + kit join/lints) — PR https://github.com/mdrewt/monster-realm/pull/623, branch slice/bt-6, worktree .claude/worktrees/bt-6. Local just ci CI-EXIT=0 (nextest 2683, vitest 4725/201, all evals, observability 8/8). Ledger 5/6 met, BT6.2 DEFERRED -> backlog: HIDDEN DEPENDENCY game-core/content/species/*.ron — species 2,6,7,8,9,20,21,22,23,30 cannot form Light+Heavy from learnable_skill_ids (no Water/Dark/Earth/Wind Heavy); provisional kits shipped + exact-set ratchet test; follow-up slice needs species RON + new Heavy skills in touches. SPEC DEVIATION: Heavies retuned to 70 not 65 (BT6.5 lint fails at L8 for 65) — Build note (bt-6) added to M-battle-tactics.spec.md (harness repo, uncommitted). 97 bt6 tests (tester x2), verifier PASS 14/15 mutants, reviewer no blockers, 1 DECISIONS entry. Residuals R-bt-3-TUNINGVALID + R-bt-4-TUNINGCONSTS addressed in-slice (see PR). Harness UNCOMMITTED: memory/projects/monster-realm-bt-6-plan.md, monster-realm-bt-6-tester-brief.md, gates/bt-6.gates.md, spec build note. Sandbox left: /tmp/tmp.BrnyB9XG85 (verifier). Squash title must be feat(game-core): .... Next: supervisor audit + merge.

## 2026-10-31T19:01:12Z — 2026-10-31T19:01Z supervisor: master red, ci-fix launched
bt-6 merged (PR#623) but master e2e red: encounter-battle.spec.ts:565 expects Victory, got Defeat (likely power retune). Reaped dead mutex (pid 3081297). Launched ci-fix-20261031T1900 fable@xhigh leader 3095401. Next tick: await .done, mr-audit, merge, then bt-7.
## 2026-10-31T20:19:59Z — ci-fix-20261031T1900 merged
PR#625 merged at 43e7a827 (e2e starter attack seed after bt-6 Light retune). Master CI run for 43e7a827 in progress; mr-ci-watch delegated. Next: confirm green, then resume bt-6 successors per M-battle-tactics spec / qf-14 parked.

## 2026-10-31T22:53:10Z — bt-7 resumed after self-kill crash
bt-7 attempt 1 died rc=143: run's own orphan-cleanup scan matched 'account-e2e' in its own claude cmdline. Branch slice/bt-7 pushed at 451820c8; uncommitted async eval transform preserved in worktree. Relaunched fable@xhigh (leader per mr-spawn). Next tick: verify .done, mr-audit (hard-tier mandatory read), merge.
## 2026-10-31T23:33:15Z — bt-7: PR #626 open, local gate green ×2 (1b7ebed1 ledger run + 631cafec final), ledger 7/7 met, 0 deferred (tactical schema: 10 private tables, 7 views, manifest + cascade, bindings, privacy proofs; resumed after attempt 1's self-kill)
**TERMINAL STATE:** branch `slice/bt-7`, worktree `.claude/worktrees/bt-7`, HEAD `631cafec` pushed (wip chain: API freeze c13bad9f → baselines/gen 6c391980 → plan-review fold bc3217d1 → docs a80fa603 → RED ccfae749 → GREEN 145e575c → clippy 73f93f82 → e2e sizing fb4d8aa6/451820c8 → e2e async 1b7ebed1 → round-2 tests 631cafec), base master `43e7a827` (unchanged). PR https://github.com/mdrewt/monster-realm/pull/626 — remote CI running at open. Merge is supervisor-owned (squash; Conventional Commit `feat(server): …` — the wip commits match no cliff group). Main checkout untouched.
- Attempt 1 was SIGTERM'd (rc=143) by its own orphan-cleanup scan matching `account-e2e` in its own claude cmdline; the resume killed the stranded `spacetimedb-standalone` (pid 3411081, verified by /proc cwd + port + PPid 1) and cleared `~/.local/share/spacetime/data/spacetime.pid` (named that pid).
- Local gate: `just ci` CI-EXIT=0 on 1b7ebed1 via `mr-gates check` (X2 evidence in the ledger: 2696 Rust tests / 18 binaries, 15/15 evals incl. account-e2e green under the async transform, 201 vitest files, observability 8/8) and `just ci` CI-EXIT=0 standalone on the final HEAD 631cafec (`/tmp/bt-7-ci-final.log`). Ledger `bt-7.gates.md` 7/7 met (BT7.1–7.5 + X1 MANUAL publish probe + X2), 0 deferred. NOTE: `mr-gates check` skips already-met gates, so its second run (23 s) did not re-execute X2 — the standalone run is the final-HEAD evidence.
- Lenses: planner · plan review (reviewer + red-team) · tester opus ×2 (round 1: 13 tests, 9 RED; round 2: anchor-only cascade fixtures 2016/2017 after both lenses measured the `battle` anchor lookups untested; 3 mutants killed on `[bt7/cascade-anchor-only]`) · orchestrator self-review + 10/10 sandbox mutants · X1 publish probe · reducer-security-auditor opus PASS-WITH-FINDINGS · verifier opus PASS-WITH-FINDINGS (RED replayed from ccfae749: 647/9; no gating test weakened). desync-guard N/A (no game-core logic). doc-keeper not spawned (docs orchestrator-authored, fact-checked against code).
- SUPERVISOR ASKS: (1) widen bt-8's `touches:` before launch (R-bt-7-BT8TOUCHES: schema.rs manifest entries, accounts_tests.rs rosters, evals/account-e2e.eval.mjs transcription + retiring the `(until bt-8)` rows) and carry R-bt-7-BT8ORPHANS (bt-8's disconnect/forced-terminal paths must sweep tactical rows by battle_id). (2) Spec-owner decisions queued: R-bt-7-SUMMARYEXPORT (battle_summary + player_formation are personal data excluded from the export by BT7.4), R-bt-7-QUEUEVOIDED (QueueVoided reaches both sides; design §2.3 vs §6.3). (3) Harness repo UNCOMMITTED: specs/monster-realm-v2/M-battle-tactics.spec.md (Build note (bt-7) items 1–8), memory/projects/{monster-realm-bt-7-plan.md, monster-realm-bt-7-pr-body.md, monster-realm-bt-7-tester-brief.md, monster-realm-bt-7-tester-brief-r2.md}, gates/bt-7.{gates,red-before,x1-publish-probe}.md, mr-residuals.jsonl (+5 R-bt-7-*). (4) Sandboxes left (recursive deletes guard-blocked): /tmp/bt7-probe.DkQXbO, /tmp/bt7-mutants.djNh4C, /tmp/bt7-plumb.1RFDtp, /tmp/bt7-redteam.1ZAKl5, /tmp/bt7-verifier-mutant.DfRZNw, /tmp/bt7-verifier-red.aeel0a, /tmp/mr-acct-e2e-{T7ILzM,Xfjd9r} (+ the e2e's own per-run dirs). (5) Post-merge: refresh the code graphs on the canonical checkout (10 tables, 7 views, 6 types).
## 2026-10-31T23:55:51Z — bt-7 merged (tactical schema)
PR#626 merged to master 59816fd3 after hard-tier audit read (see ledger). Master CI run 41254119664 in progress at tick end. Next: confirm master green, then launch bt-8 per M-battle-tactics.spec.md. Issue 618 (bt-2 decision) still open.
## 2026-10-31T18:02:50Z — bt-6 merged
bt-6 PR#623 merged as 38a00032 after CLEAN audit. Master CI run queued, mr-ci-watch delegated. Next: re-derive bt-7 eligibility on event tick once master CI is green.



## 2026-10-02 — weekly review 2026-10-02: residuals, decision issues, dropped candidates

### Entered residuals (5, cap respected)
- R-weekly-review-2026-10-02-F1 MED netcode-determinism: pre-battle move_queue survives the battle and self-executes afterwards (movement.rs:358-371; no client caller of clear_queue).
- R-weekly-review-2026-10-02-F2 MED security-privacy: buy/sell/heal_party have no server-side proximity check (economy.rs:100,194; raising.rs:302-305); posture question open as issue 544.
- R-weekly-review-2026-10-02-F3 MED ux-a11y: menu Y-description feedback never reaches the live region (frame.ts:136-143).
- R-weekly-review-2026-10-02-F4 LOW ux-a11y: overlay aria-labels/announcements hardcoded English under fr (a11yCopy.ts:47-81).
- R-weekly-review-2026-10-02-F5 LOW security-privacy: propose_trade accepts counterparty monsters/items contrary to DECISIONS.md:293-297, escrowed pre-consent (trading.rs:298-453).

### Decision issues
- OPENED: mdrewt/monster-realm#544 rev-2026-10-02-shop-heal-proximity (non-blocking) — does the controls-051 UI-only proximity posture extend to shops/healing?
- CONSUMED: mdrewt/claude-harness#134 DECISION(rev21-nightly-changelog-red). Drew answered: evaluate the nightly-red causes and adjust the mr-supervisor pipeline if that prevents recurrence, otherwise leave the operator-owned loop as-is. NOTE for supervisor: this run could NOT close/comment the issue (Cowork permission classifier denied the GitHub write); the issue is still open with the answer in it. Supervisor should fold the answer in and close with an mr-system comment. Nightly is red again as of this run (mr-situation master_ci_latest: Nightly failure) — relevant to that evaluation.

### Dropped candidates (4)
- Practice/PvP-win currency: ordering real, but battle_tests.rs:3419-3425 pins it as a USER RULING 2026-09-27; residual defect is only the misleading comment at battle.rs ~1275 ("win credits are WILD-gated") — below cut.
- player_quest public: recorded in DECISIONS.md "public on purpose" — accepted exposure.
- heal_party item-cost escrow gap: latent, unreachable (cost_item_id: None in content).
- HUD-focus hotkey drop (evolution notice OK): deliberate worldHasFocus gate, narrow edge.

### Sweep
residuals sweep --dry-run: 0 obsolete candidates.

### Cleanup
RUN_DIR removed after report (guarded rm under /home/mdrewt/mr-review/). Runner git state untouched.

## 2026-10-03 — ctl-8d park reason: hidden-dependency STOP at verify-scope

I wrote no code. The worktree is `.claude/worktrees/ctl-8d`, branch `ctl-8d`, an empty wip on b95fc62f. I surveyed master at b95fc62f.

### H1. CTL8D.1's "or else on the remembered tab" needs screen memory that lasts across opens. The seam has none.
- `main.ts:573` calls `screenHost.opened(edge.frame)` on every push edge, and `ScreenHost.opened` (`ui/screens/index.ts`) deletes the frame's state. `init(vm)` sees only a view model built from `ScreenContext`, and nothing in `ScreenContext` holds a nav memory.
- The only memory that lasts across opens is the main menu's `menuState.memory`. It is hosted by hand in `main.ts:871/956`.
- Module state is banned by the milestone rules.
- So no adapter can remember a tab between opens without one of these:
  (a) a seam change in `ui/screens/types.ts` (outside touches) plus `ScreenHost`: for example, `opened()` keeps the last state and `init(vm, previous?)` or a `remember(state)`/`recall` pair, or
  (b) shell memory hosted in `main.ts`.
- ctl-8b hit the same gap ("always opens on Storage", residual R-ctl-8b-CTL8B.4 → ctl-11a). There it was a note. Here it is part of a seeded EARS gate.

### H2. Social is one frame over three legacy roots. Nothing short of `main.ts` can build that.
- U, P and L, and the three menu leaves `menu.social.trades/challenges/rankings` (`ui/menuModel.ts:80-103`), open three separate frames through `main.ts` open paths: `openTrade`, `openPvp` and `openLeaderboard` (`main.ts:877-895`, `:2084-2125`). Each frame has its own probe and handle entries and its own batch listener. pvpView's listener auto-shows the frame on an incoming challenge (`main.ts:2512-2527`).
- CTL8D.3 says P and L open "Social on the Challenges / Rankings panel holding the pvp / leaderboard root". CTL8D.1 says one Social with four tabs. Together they need these roots to be panels of ONE frame.
- No `Command` arm switches the shown frame or opens a frame on a tab.
- `ScreenContext` binds no requested tab (compare `shopId`/`healLocationId`, ctl-7d).
- `leaderboardView.ts` is outside touches.
- The workarounds inside touches all fail:
  - Re-parenting the pvp root into the trade root breaks pvpView's `#visible` flag. Its listener's `forceVisible` is false whenever another overlay shows, so the nested panel would never render.
  - Painting one Social chrome inside each of the three views duplicates every panel. It also can't switch tabs across frames, and it can't reach `leaderboardView`.
- CTL8D.1's "open on the oldest waiting request's tab" also clashes with CTL8D.3's "U opens on Trades": both enter through `openTrade()`, and the adapter can't tell U from the menu leaf. The rule is only meaningful once there is a single Social open path.

### What I could build inside touches (I didn't; it would leave 2 of 3 gates unmet)
- CTL8D.2 (A on a trade or challenge row → a sheet of legal actions, Decline and the final Confirm defaulting to No) can be built on the tradeView frame with existing `Command` arms only: `respondTrade`, `confirmTrade`, `cancelTrade`, `acceptChallenge`, `declineChallenge`, `cancelChallenge`.
- CTL8D.1 and CTL8D.3 would both have to be DEFERred. That is 2 of 3 gates, more than half, which the rules call a sizing failure.

### Suggested re-serialization (supervisor's call)
- Option A, a seam slice before ctl-8d (main.ts chain, like ctl-7c/7d). It would add:
  - ScreenHost per-frame memory that lasts across opens (types.ts + index.ts);
  - a `ScreenContext.socialTab` bound by the open path, or one `openSocial(tab)` path that U, P, L and the menu leaves share;
  - the pvp and leaderboard roots hosted as panels of the Social frame, keeping the pvp auto-show until ctl-13.
  Then ctl-8d resumes unchanged.
- Option B, re-scope ctl-8d to CTL8D.2 alone, plus a single-frame Social on tradeView (four tabs, LB/RB inside the frame, Players and Rankings as placeholders). Move the open-rule and memory clause of CTL8D.1, and all of CTL8D.3, to ctl-11a. ctl-11a already owns `main.ts` and "U, P, L → Social › Trades, Challenges, Rankings" (CTL11A.1).
- Either way, `pvp-accept-btn` and `pvp-challenge-player-btn` stay clickable as specified.

Resume: after the supervisor picks A or B and the spec is updated, rebase `ctl-8d` on master and restart at PLAN.

