# 14r-b plan — Trading reducer behavioral negative-path suite (planner output, 2026-08-14)

Slice: 14r-b · branch `feat/14r-b-trade-negative-suite` · worktree `.claude/worktrees/14r-b` (from c85010d) · ADR-0184 reserved · tier HARD · budget $150.

## Vehicle decision (planner, opus)
**Playwright multi-context e2e — new `client/e2e/trade-negative.spec.ts`** driving `window.__mrTrade` + `spacetime sql` for server truth.
- ci.yml:97-170 `e2e` job runs `just e2e` → playwright testDir `./e2e` auto-discovers new `*.spec.ts` → **gates PRs with ZERO justfile/.github edits** (both out of touches — this dissolves the hidden-dependency risk; decisive argument).
- Multi-identity solved: one browser, 3 `newContext()` = 3 identities (precedent wallet-balance.spec.ts:825-857, golden.spec.ts:89-105).
- Reducer `Err` observable: SDK rejects with `SenderError` carrying the server string (statusModel.ts:38-49, main.ts:746); `__mrTrade` returns the promise raw (main.ts:1910-1955, all four reducers + item/currency legs exposed).
- REJECTED scripts/ CLI harness: one identity only; on_disconnect deletes player row (smoke-republish.sh:37-39 RT-SR-01); propose_trade needs joined counterparty (trading.rs:246-250); would need justfile+workflow wiring (out of touches).
- REJECTED node-SDK harness: doesn't solve item seeding (grant_bait dev-gated, taming.rs:280-282; committed bindings exclude dev reducers per ci.yml:140-143); YAGNI. Future unblocker shape: non-spec driver module under client/e2e/ (globbed only *.spec.ts). 14r-g inherits the PATTERN (3-context + errorOf) via existing `__mrPvp` hook — no new harness needed.

## Scenario reachability
1 propose qty>on-hand → Err: ✅ ×2 sites (:330/:355), zero seeding (0 on hand, qty 1)
2 item qty==available → Ok: ❌ PARKED — no item faucet for session identity (recruit.spec.ts:988-1002 documents blocker; unblocker = client/src grant hook, OUT of touches)
2′ currency exact boundary (:287) via quest_001 50-gold faucet: reachable, +90-120s, wander retry — orchestrator decision pending review
3 insufficient currency → Err: ✅ ×2 sites (:287/:304), zero seeding
4 respond(false) → row deleted + reaper disarmed: ✅ (reaper = PRIVATE trade_offer_reaper_schedule; read via `spacetime sql` as owner; assert armed-after-propose AND gone-after-decline — anti-vacuity)
5 non-party cancel → Err + counterparty cancel → Ok: ✅ (3rd context)
6 wrong-role respond/confirm → Err: ✅ (:433/:472)
7 multi-item near receiver cap: ❌ PARKED (same blocker + ~9999 stacks)
MAX_ITEM_STACK=9999 (game-core/src/trading/rules.rs:15), MAX_BALANCE=999,999,999 (currency.rs:7).

## Deliverables
- NEW client/e2e/trade-negative.spec.ts (3 contexts A/B/C; serial blocks AUTH{4,5,6} + QUANTITY{1,3}; errorOf() helper catching inside page.evaluate returning plain {name,message}; spacetime sql guarded helper shape per wallet-balance.spec.ts:597-662; presence==3 convergence + browser.close())
- MOD evals/trade-reducer-security.eval.mjs: hasCancelPartyCheck [^{]*? → anchored \s*&&\s* (both orders), + `||` BAD fixture, + comment update
- NEW docs/adr/0184-*.md (D1-D8 outline in planner output §10) + just adr-digest
- NO trading_tests.rs changes (in-process kills already taken; a third static scanner = the flagged anti-pattern) — state in PR body as decision
- NO scripts/ changes

## Proof-of-teeth register (orchestrator runs; ONE inversion at a time; restore via exact inverse edit; NEVER dir-wide git checkout; verify `git diff --exit-code -- server-module/src/trading.rs` after each)
B1 :433 `==`→`!=` → 6a red · B2 :472 `==`→`!=` → 6b red · B3 :747 both `!=`→`==` → 5a red · B4 :747 `&&`→`||` → 5b red + tightened eval red (E1) · B5 :439 `!accepted`→`accepted` → 4a red · B6 :442 delete disarm line → 4b red while 4a green · B7 :330 `>`→`<` → 1a red · B8 :355 same → 1b red · B9 :287 `>`→`<` → 3a red · B10 :304 same → 3b red · E1 `||` fixture: new regex false / old regex true (demonstrate both).
Bite-proof runs use ONLY the target spec: `cd client && npm run e2e -- e2e/trade-negative.spec.ts -g "<title>"`. globalSetup republishes from ../server-module each run — no manual publish.
HONEST GAP: `>`→`>=` at :330/:287 not killed unless 2′ lands (record in ADR D4).

## Mutation gate: CANNOT ratchet (record in ADR D6)
Out-of-process tests invisible to cargo-mutants; :330/:433/:472/:747 mutants are legitimate-shell survivors priced into cap 324; cap(justfile)+ceiling(nightly-smoke-wiring.eval.mjs) both out of touches; do NOT run just mutate-server (multi-hour null result).

## Landmines
★ NO `test.fixme` in the new spec (spec-gap-revival.eval.mjs file-level tripwires: fixme+dev_reducers/grantBait/M9c tokens fire when workflow publishes dev reducers — TRUE today per ci.yml:145/:169). Park in prose+ADR only.
Vacuous negatives: every Err test needs a paired Ok positive control in same run/helper. Assert state via spacetime sql (server truth), driver via __mrTrade only. No new RegExp(dynamic) (Semgrep, bitten 3×). No ws://http:// in comments (Semgrep matches comments). spacetime call = per-arg JSON literals; server ping positional, match "Server is online" text. PATH export + node --version check per worktree. Multi-line commit msgs via -F heredoc. Don't import from/modify frozen sibling specs.
errorOf risk (MEDIUM): no existing e2e awaits reducer rejection — prove idiom on FIRST test before writing the rest; fallback = state-only + #error-overlay DOM channel (weaker; record in ADR if used).

## Tasks
T0 preflight (PATH, spacetime ping) → T1 tester: eval tighten → T2 orch: E1 bite-proof both directions + eval PASS on real source → T3 tester: AUTH block → T4 orch: GREEN baseline (errorOf idiom proven here) → T5 orch: B1-B6 → T6 tester: QUANTITY block → T7 orch: green + B7-B10 → T8 doc-keeper: ADR-0184 + digest → T9 full just ci + e2e → PR.
Runtime budget: spec ~60-90s inside existing e2e job. test.setTimeout(120_000) on AUTH flow test.

## Parks (named deferrals for handoff)
P1 scenario 2 (item exact boundary) — unblocker: client/src grant hook slice (revives recruit.spec R4 too).
P2 scenario 7 (near-cap bilateral) — same + SDK harness with dev bindings.
P3 scenario 2′ (currency boundary) — orchestrator decision after plan review: include as increment 2 if EARS "exact full stack → accept" clause must be dynamically gated this slice.
P4 reusable SDK harness — 14r-g needs only the pattern, not a harness.

## AMENDMENTS after plan review (reviewer aa0da3b + red-team aecf659, both opus — adopted 2026-08-14)
1. FILE NAME: `client/e2e/trade-zz-negative.spec.ts` (sorts AFTER trade-propose.spec.ts whose :288/:307/:321 does global allTradeOffers()[0] reads; before trade.spec.ts since '-'<'.'; m17.5f-plan T3 precedent). Teardown: explicitly cancel live offers + await gone BEFORE browser.close(); close unswallowed (no try/catch).
2. 2′ PARKED (P3). Real cost 4-6min (wallet-balance.spec.ts:234-236 own budget), flake history redded master 2026-08-01 (handoff:75), doesn't literally satisfy "full available STACK" clause. Park note carries red-team F10 three-point design (B-1 Ok / B Ok / B+1 Err, read balance from sql, never hardcode 50). EARS exact-boundary clause = explicitly partially-gated; ADR-0184 D4 carries reviewer's exhaustive faucet-search table (shop floor 150g not 200; quest 50g no items; no starter items; no battle drops; dialogue GrantItem route exists but zero content uses it; grant_bait self-scoped to CLI identity; qty==0 rejected upstream rules.rs:93).
3. trading_tests.rs IS edited (planner premise false): check_authorize_call (trading_tests.rs:886-974) is operator-blind — add required `== me` operator needle in the extracted arg_span (4th check), + bad fixture proving the pin bites (`!= me` variant must flag). Converts B1/B2 into in-process kills (mutate-server survivors drop; cap 324 NOT edited — out of touches; record direction in ADR D6). B1/B2 bite-proofs now expected DOUBLE-RED (e2e + in-process static pin).
4. e2e job is NOT branch-protection-required (PR#287 UNSTABLE precedent, handoff:267) — merge-doctrine-enforced. Reword "gates PRs" in ADR D1.
5. errorOf(): hook methods return Promise|undefined (main.ts:1919-1938) — must hard-fail on undefined before awaiting; catch INSIDE evaluate; return {name:String(e?.name??''),message:String(e?.message??'')}|null. Assertions three-part: not-null + name==='SenderError' + message toBe EXACT server string (never toContain — "insufficient inventory for item N" emitted by BOTH trading.rs:331 AND types.rs:114-116 qty==0 path → F3 differential-control design mandatory: same proposal minus the offending leg → Ok+cancel, plus leg → Err). Fallback channel if idiom fails at T4: tid-scoped sql state assertion + #mr-error-overlay (NOT #error-overlay; __mrTrade bypasses sendGuarded so #status never written).
6. Scenario 6 role-first pins (F4): 6b = B confirms PENDING offer → exact "only the trade initiator can perform this action" (under B2 mutant message flips to status string → red). 6a = wrong-role/non-party responds to ConfirmedByCounterparty offer → exact "only the trade counterparty can perform this action". Read exact strings from game-core/src/trading/types.rs.
7. NEW 5c: initiator cancels own offer → Ok + row gone. Register B11: :747 first clause →`true` → 5c red (F5: without it a realistic mutant survives whole suite).
8. Every scenario = ONE self-contained test() (propose→act→assert→cleanup) so `-g` bite-proofs run a complete world (F1). Separate describe blocks / no cross-test state (F16: .serial failure skips siblings; register records expected status of EVERY test per mutation incl. cascades — B5 cascades 4a+4b+6a-setup). Hard-fail empty tradeId (BigInt('')===0n → cancel_trade(0) → 'not found' vacuous-green engine).
9. All state assertions via own-copy sql helpers (parseSqlTable THROW-on-unrecognized shape, wallet-balance:632-660 style, NOT trade-interlock's silent-skip; handle header+separator+zero-rows as valid empty — untested branch), identity-pair/tid-scoped in JS, never allTradeOffers()[0]/global counts. Reaper: two-sided (armed-after-propose count 1 → gone-after-decline count 0). Charset guard admits `SELECT * FROM trade_offer_reaper_schedule`; no WHERE/comma → SELECT * + JS filter; if ScheduleAt cell renders '|' the column-count check throws loud → fix at T4 with real output.
10. Eval: stripRustStrings(stripRustComments(body)) (F7 — string-literal bypass; helper already in file ~:900); anchored regex per reviewer m3 EXACT form (with \(? \)? tolerance both clauses); fixtures: RT-SEC-02 `||` BAD + RT-SEC-03 string-literal BAD; comment records shape-tripwire doctrine ("semantic authority = trade-zz-negative 5a/5b/5c; refactors may update regex in same PR iff 5a-5c green"), known survivors (`&& false`, dead-code if false, empty body) + known false-flags (let is_party/De Morgan/matches!/interposed clause) named explicitly.
11. Every __mrTrade call awaited inside its evaluate (F12 — unhandled rejection raises persistent #mr-error-overlay, intercepts later clicks). Presence: Promise.all 3× ===3 (never >=), 30s each, beforeAll timeout 150s, pairwise-distinct identity assert. Offers in 4/5/6 use starter monster as the ≥1-asset (EmptyOffer guard rules.rs:57-61); positive controls must NOT execute a full swap (don't confirm — cancel instead) so later tests keep A's monster.
12. HONEST-GAP register (ADR D4): `>`→`>=` AND `>`→`!=` at :330/:355/:287/:304 survive (no boundary probe possible); saturating_sub-dropped at 4 sites = EQUIVALENT mutant under ADR-0106 D4 (escrow provably 0, one-active-offer rule); :180 reaper scheduler guard = static-eval-only coverage (no binding exists).
13. PR body: note 14r-c touch-glob overlap (evals/*.eval.mjs + *_tests.rs cover our two MOD files — keep hunks surgical/rebase-friendly); paste raw preflight sql output of reaper schedule table.
