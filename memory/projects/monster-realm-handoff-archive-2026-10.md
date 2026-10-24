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
