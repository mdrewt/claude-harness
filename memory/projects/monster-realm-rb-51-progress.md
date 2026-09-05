# rb-51 PROGRESS MEMO — TERMINAL STATE (PR open + local `just ci` green), 2026-09-05

STATUS: **DONE — supervisor owns the merge.** PR https://github.com/mdrewt/monster-realm/pull/432
Branch `feat/rb-51-privacy-countdown-view` @ 63fead1 (4 `wip:` commits, all pushed), worktree
`.claude/worktrees/rb-51`, forked from origin/master@1d8d2dd (master CI verified green).
`gh pr merge` NOT run.

DONE
- Ledger: **1/1 met, 0 deferred, 0 unmet** — `Acceptance: 1/1 met, 0 deferred, 0 unmet — rb-51 seed:c7ab9fd8d4aed23e`
  E1 CHECK: `npm --prefix client run test -- src/ui/privacyBanner.test.ts src/main.privacyCountdown.test.ts src/main.wiring.test.ts`
  EXPECT: `Tests  233 passed (233)` — **run `mr-gates check|verify` FROM the worktree**, the CHECK is cwd-relative.
- Local full `just ci` GREEN (CI-EXIT=0): 102 spec files / 2987 tests + the whole eval suite.
- 11 mutants applied to the shipped source and all killed (register in the PR body).
- Files: NEW client/src/ui/privacyBanner.ts(+test), NEW client/src/main.privacyCountdown.test.ts,
  EDIT client/src/main.ts, client/src/main.wiring.test.ts, client/src/ui/privacyModel.ts(+test),
  docs/adr/0231-*.md (Amendment A1), ARCHITECTURE.md. No evals/, no schema, no reducer.

REMAINING (supervisor)
- Poll PR #432 CI; `mr-gates verify --slice rb-51` FROM `.claude/worktrees/rb-51` (needs
  `just wasm` + `cd client && npm ci` on a fresh clone; ~1 s otherwise); squash-merge as ONE
  Conventional Commit; `mr-gates residuals close --slice rb-51 --pr 432` (closes R-m22-s8-X9);
  reconcile ARCHITECTURE/ADR index; re-index codegraph + cbm.

FOLLOW-UPS TO QUEUE (named, not dropped)
1. **One-shot a11y announcement** on the `active -> grace` edge (ADR-0231 A1-D4 defers it to rb-52;
   gate-legal today — `[A11Y-05b]` only bans other modules naming `#a11y-live`, and there is NO
   count pin on `liveRegion.announce(`). Needs a copy-catalog entry, which rb-52 owns.
2. **No ADR number was reserved** for rb-51 (assigned: `None`), so D1-D5 live as an ADR-0231
   self-amendment (ADR-0104 precedent). Promote to a standalone ADR if desired.
3. **rb-52 still pays the ~17-file `*View.ts` overlay fan-out** (OR-MANIFEST-COMPLETE +
   `evals/overlay-a11y-manifest.eval.mjs` KNOWN_VIEW_FILES, the latter outside `client/**`) —
   seed its `touches:` with `evals/overlay-a11y-manifest.eval.mjs` and
   `evals/dom-shell-coverage-exclusion.eval.mjs`, or it parks on the same wall.
4. Red-team leftovers accepted as non-blocking: memo write-count unpinned; a TZ-offset mutant on
   `nowMs` survives on a UTC runner (no TZ pin in the harness); `#app`-fallback append survives
   because the runtime harness boots without `#app`.

BLOCKERS: none.

---

## PLAN (as executed; v2, post reviewer + red-team)

# rb-51 PLAN v2 — PRV1-1 deletion-grace ticking countdown (residual R-m22-s8-X9)
# (v1 revised after reviewer + red-team lenses; changes marked [R#]/[RT#])

Worktree: /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/rb-51
Branch: feat/rb-51-privacy-countdown-view (from origin/master@1d8d2dd)
Declared touches: client/** (+ sibling *.test.ts, docs/adr/**, docs/knowledge/**, ARCHITECTURE.md)
Env: export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH" ; `just wasm` DONE,
     `cd client && npm ci` DONE.

## E1 (the one seeded acceptance criterion)
[PRV1-1 UI surface] WHEN the deletion grace window is live THE PLAYER SHALL see a ticking
countdown to the reaper fire in a rendered surface (DOM shell + main.ts frame tick + the
deletion_grace_ms_default() wasm read)

## D1 — the countdown ships as a passively-visible HUD banner, not a registry overlay
LEAD WITH THE DESIGN ARGUMENT [R1]: E1 says "WHEN the window is live THE PLAYER SHALL see" — a
passive-visibility requirement. A modal only satisfies it after the player opens something.
Sibling residual rb-52's EARS is the modal ("WHEN the player OPENS the privacy surface ... expose
reachable delete/cancel controls"). So the banner is the correct shape for THIS criterion and the
modal is correct for that one.
SECONDARY (mechanical): a new `client/src/ui/*View.ts` would force edits to
`evals/overlay-a11y-manifest.eval.mjs` (KNOWN_VIEW_FILES frozen roster, :66-85/:671-676 — hard RED)
and, once it needs a coverage exclusion, `evals/dom-shell-coverage-exclusion.eval.mjs` — both
OUTSIDE the declared `client/**` touches, i.e. a hidden-dependency STOP.
HONESTY [R1]: this DEFERS the ~17-file overlay fan-out to rb-52; it does not abolish it. Say so in
the PR body and the ADR amendment.

## D2 — change-detection key is the RENDERED LABEL, for DOM-WRITE ECONOMY [RT-A4]
v1 claimed a `remainingMs` memo is behaviourally weaker. Red-team refuted that: `remainingMs` is
strictly finer than the label, so it survives every tooth too. The honest reason to key on the
label is economy — `remainingMs` changes 60x/s, the label 1x/s. Do NOT put the false claim in the
PR body.

## D3 — grace is read ONCE at module scope, named DELETION_GRACE_MS_DEFAULT [R-M4]
`const DELETION_GRACE_MS_DEFAULT = deletion_grace_ms_default();` placed AFTER `PARTY_SLOT_NONE`
(main.ts:213) and BEFORE `let rawMap` (:214) — satisfies W-M20C-WASM-MARK (main.wiring.test.ts:8291,
requires WASM_READY_MS index > `const STEP_MS = step_ms();` index).
NOT `DELETION_GRACE_MS`: ADR-0230:44-60 declares that exact spelling a deliberate PHANTOM ("No such
symbol ... exists in this codebase") and `evals/account-e2e.eval.mjs:1841-1846` pins that sentence.
The wasm dependency is proven BEHAVIOURALLY (a distinctive mocked grace moves the label), never by
a call-site text pin.

## D4 — deliberately NOT a live region; the one-shot edge announcement is DEFERRED, named
No `aria-live`, no `role=status|alert|log|timer|marquee`: a per-second region spams assistive tech.
Reviewer M6 correctly notes a ONE-SHOT announce on the active->grace edge would be gate-legal
(`[A11Y-05b]` only bans other modules naming `#a11y-live`; there is NO count pin on
`liveRegion.announce(` — main.wiring.test.ts:11034 only requires the M23S5 region to CONTAIN one).
It is deferred anyway: it needs an `a11yCopy.ts` catalog entry whose orphan-check belongs to the
slice that owns the consumer, and the player-facing privacy copy is rb-52's. RECORDED as a named
follow-up in the ADR amendment + PR body + handoff, never dropped silently.
CONSTRAINT: nothing may be added INSIDE the `M23S5-A11YSNAPSHOT` region — main.wiring.test.ts:11122
pins it to an EXACT comment-stripped literal.

## D5 — no NEW numbered ADR; ADR-0231 self-amendment "Amendment A1" [R-M5, adjusted]
The supervisor reserved NO ADR number for this slice (assigned number = `None`), and minting one
unilaterally races a concurrent sibling (measured: an assigned 225 was taken 45 min later).
Reviewer M5 is right that D1-D4 are real decisions needing a durable record, so they go into
`docs/adr/0231-*.md` as a dated **Amendment A1**, following the ADR-0104:125 self-amendment
precedent ("Self-amendment; no new ADR number was minted"). No header field changes -> no
`just adr-digest` drift. Flagged in the handoff so the supervisor may promote it to a standalone ADR.

## Label grammar (was UNSPECIFIED — reviewer B1 BLOCKER)
`privacyBannerLabel(c: DeletionCountdown): string | null`
- phase `active` | `unknown` | `terminal`                -> `null`
- phase `grace` and `remainingMs === undefined` (DARK)   -> `'Account deletion pending — time remaining unavailable'`   [R-B2]
- phase `due`  (computed zero)                           -> `'Account deletion is due now'`
- phase `grace` with computed remainingMs                -> `'Account deletion in ' + duration`
`duration` ALWAYS renders down to SECONDS so the banner ticks at every magnitude [R-B1]:
  >=1d `6d 23h 59m 58s` · >=1h `23h 59m 58s` · >=1m `59m 58s` · else `58s`
Unit constants are DERIVED (`60n * MS_PER_SECOND`, ...), never a pure-numeric chain, so
`findNumericDuplicates` sees no fold [RT-B2]. Negative input clamps to 0 (the function is TOTAL
even though the core never emits negatives).

## Files
1. NEW `client/src/ui/privacyBanner.ts` — pure, DOM-free, clock-free, REGEX-FREE [RT-B6],
   no MOTION/READ-BACK tokens anywhere incl. comments [RT-B3], no `!` non-null assertions [RT-B5].
2. NEW `client/src/ui/privacyBanner.test.ts` — literal `describe(` required [RT-B6].
3. EDIT `client/src/main.ts`:
   (a) wasm import: `deletion_grace_ms_default,` as the SECOND specifier, between `apply_move` and
       `move_queue_cap` (biome organizeImports assist) [RT-B5];
   (b) `./ui/privacyBanner` then `./ui/privacyModel` imports BETWEEN main.ts:152
       (`} from './ui/overlayRegistry';`) and :153 (`from './ui/pvpModel'`) [RT-B5];
   (c) `const DELETION_GRACE_MS_DEFAULT = ...` after :213, before :214;
   (d) create `#privacy-countdown` at runtime beside `#interact-prompt` (~:2632), `display:none` AT
       CREATION, seed `let lastCountdownLabel: string | null = null` [R-m4];
   (e) the per-frame block goes IMMEDIATELY AFTER `// M23S5-A11YSNAPSHOT-END` (main.ts:2806) and
       BEFORE `predictor.drain(` [R-M1] — a recurring throw in the render path below must not
       freeze a legally significant deadline. Order-only nh2 tooth (main.wiring.test.ts:1979-1996)
       is unaffected (drain still precedes the re-issue block).
   (f) the write MUST have an `else` branch that clears (`textContent = ''`, `display = 'none'`)
       — a missing else is the measured survivor [RT-A3].
4. NEW `client/src/main.privacyCountdown.test.ts` — happy-dom; harness modelled on
   `main.a11yFocus.test.ts` / `main.reducedMotionWiring.test.ts`; `sessionState: () => 'hidden'`
   [RT-A2]; `afterEach` does `document.body.innerHTML = ''` [RT-A5];
   `runFrame(perfMs, wallMs)` drives `vi.spyOn(performance,'now')` AND `vi.spyOn(Date,'now')`
   separately [RT-A1] — NOT `vi.useFakeTimers()` (repo anti-pattern; may replace rAF).
5. EDIT `client/src/main.wiring.test.ts` — source-scan pins (import present; exactly ONE
   `deletion_grace_ms_default(` call site; `deriveDeletionCountdown(` present; nothing added inside
   the DEV gate).
6. EDIT `docs/adr/0231-*.md` — Amendment A1 (D1-D4 + the deferred edge-announcement) and a dated
   correction to the two now-false Consequences bullets ("`terminalAtMs` is write-only until
   m22-s8b"; "the file's sole non-comment `store.ownAccount(identity)` read").
7. EDIT `ARCHITECTURE.md` [R-M2, REQUIRED not optional] — :72 ("No TS consumer ships in this slice
   — S8 owns the countdown and will import it") and :501-505 ("The DOM overlay, the `main.ts`
   wiring, the `deletion_grace_ms_default()` wasm read and the `my_export_bundle` subscription are
   DEFERred to m22-s8b (X9/X10/X11)") — rb-51 discharges X9's half; X10/X11 stay deferred.
8. EDIT `client/src/ui/privacyModel.ts:9-12` + `privacyModel.test.ts:18` [R-M3] — both narrate
   "The DOM shell ... the `main.ts` wiring ... and the wasm read itself all ship in m22-s8b" in the
   present tense. After rb-51 the shell and the wasm read HAVE shipped; only the reducer calls
   remain. One-line dated correction each.

DO NOT TOUCH: client/index.html, client/src/styles.css, client/vite.config.ts, justfile, evals/**.

## Proof-of-teeth (revised)
(a) TICKING — a PAIR, because runFrame's clocks are independent [RT-A1 CRITICAL]:
    (a1) wall clock +2000ms, perf clock HELD -> label decreases by exactly 2s (kills a frozen countdown);
    (a2) wall clock HELD, perf clock +2000ms -> label UNCHANGED (kills the `performance.now()`-as-nowMs
         wrong impl, which otherwise passes v1's tooth (a) and ships a 53,000-year countdown).
    Plus a DAY-SCALE grace arm so a two-largest-units formatter cannot pass on a 123s mock [R-B1].
(b) HIDDEN for Active / terminal(0n) / no row / unknown tag — as TRANSITIONS, not statics [RT-A3]:
    each arm first injects a LIVE PendingDeletion row, frames, asserts display==='block' AND
    textContent!=='' (the per-arm anti-vacuity control), THEN upserts the arm's row, frames, and
    asserts display==='none' AND textContent===''. Fifth arm: the CANCEL path (grace -> Active).
(c) WASM READ — mocked grace `123_000n`, requested = wall-T minus 3_000n; only the 120s label is
    correct. Second arm with a DIFFERENT grace under `vi.resetModules()` + re-import (the module-scope
    hoist freezes the value at import) [RT-A5], plus
    `expect(document.querySelectorAll('#privacy-countdown').length).toBe(1)`.
(d) WIRING PRESENT — runtime: `#privacy-countdown` exists and is a direct `document.body` child.
    Source-scan: import present, exactly one call site, `deriveDeletionCountdown(` present.
    Free extra tooth: `noUnusedLocals` is ON for main.ts, so an imported-and-unused symbol reds
    `just client-typecheck`.
(e) MEMO does not suppress a real update — grace -> terminal at an UNCHANGED wall clock hides the
    banner (this is what kills the missing-`else`, per RT-A3; it is NOT a memo-key discriminator).
(f) FORMATTER — exact-string table (never a shape/regex match, which would let a clock-reading
    formatter through [RT-A4]): remainingMs 0n / 999n / 1000n / 59_999n / 60_000n / 3_600_000n /
    86_400_000n / negative / undefined(DARK) x each phase. Plus fast-check totality + monotonicity.
    fc bigInt bound must NOT be 604_800_000n [RT-B2] — use 999_999_999n.
(g) ANTI-VACUITY — the rAF re-arm assertion proves only that the callback ran, because the
    `sessionGateBlocks()` early return also re-arms [RT-A2]. The real control is (b)'s per-arm
    positive assertion, which observes an effect produced BELOW the session gate.

## Gates the diff must satisfy (measured)
- COMMENT MASS [RT-B1 CRITICAL]: 9 sites assert `stripLineComments(main.ts) > raw/2`. Measured
  today: raw=137451 stripped=69458 raw/2=68725.5 -> SLACK 732.5 chars. Budget:
  `newCommentChars < 1465 + newCodeChars`. Keep main.ts comments MINIMAL; all rationale goes in
  `privacyBanner.ts`'s header (no such guard) and the ADR amendment.
- G5 numeric-duplicate scan reads client `.ts` RAW, COMMENTS INCLUDED [RT-B2]: no literal or
  pure-numeric chain folding to 604800000 anywhere under `client/` — not in a doc comment, not in
  a fast-check bound. `86_400_000n` is safe; `7 * 86_400_000` is not.
- REDUCED-MOTION PURITY RM2a/RM2f scan RAW incl. comments [RT-B3]: no `matchMedia`,
  `prefers-reduced-motion`, `getComputedStyle`, `styleSheets`, `cssRules`, `getAnimations`,
  `transitionend`, `animationend`, `transitionrun`, ... in `privacyBanner.ts` or the new main.ts
  block, INCLUDING comments. Write D4's rationale without naming any of those tokens.
- expectUniqueAnchor: do not repeat `const frame = `, `const ownEntityId =`, `predictor.drain(`,
  `Re-issue the held dir`, the reconcile anchors — even in a comment.
- M23S5-A11YSNAPSHOT region is EXACT-literal pinned (main.wiring.test.ts:11122) — insert nothing in it.
- F-5a..F-5f DEV gate: nothing new inside `if (import.meta.env.DEV)`, no second occurrence.
- W-UX1-HINT-NO-JS-OWNER: `help-hint` must not appear in main.ts, even commented.
- whole-file exact-N token censuses (`held.committedActive(`=2, `new HeldDirections()`=1,
  `let moveRejectLimit`=1, `let lastSentSeq`, `epoch =`, `resetPredictionState();`=2,
  `held.snapshot(`=1, `worldHasFocus()`=13, `new LiveRegion(`=1) — introduce none of these tokens.
- W-14RC-BRACE-REGEX-STAR-CEILING + the per-file newline-preservation assertion
  (main.wiring.test.ts:6799) -> keep `privacyBanner.ts` free of regex literals and of any `/*`
  inside a string.
- S7T-SCAN: both new spec files need the literal `describe(` after comment stripping.
- biome: `style/noNonNullAssertion` is ON for non-test modules; `organizeImports` assist is ON.
- NOT gates (verified, do not spend budget): OR-MANIFEST-COMPLETE and overlay-a11y-manifest filter
  `endsWith('View.ts')` only; dom-shell-coverage-exclusion fires on unsanctioned `coverage.exclude`
  ENTRIES, not on new files; the 96% coverage threshold is `just coverage` (NIGHTLY), not `just ci`;
  `W-ONE-CORNER-AFFORDANCE` parses index.html only; `store.ownAccount(` is pinned `>= 1`, not exact;
  no gate on the file count under client/src/ui/ (only floors, which a new file only helps).

## Ledger E1 CHECK/EXPECT
CHECK: cd client && npx vitest run src/ui/privacyBanner.test.ts src/main.privacyCountdown.test.ts src/main.wiring.test.ts
EXPECT: a literal `Tests  <N> passed (<N>)` count, filled once the teeth are authored.
Prereqs (already satisfied in this worktree, re-run needed on a fresh clone): `just wasm`,
`cd client && npm ci` — main.ts imports `../../client-wasm/pkg/client_wasm.js` and vitest RESOLVES
the specifier even when `vi.mock` intercepts the load [RT-B4].

## Risks
1. main.ts comment-mass headroom is 732 chars today. Verify with
   `cd client && npx vitest run src/main.wiring.test.ts` before committing.
2. Client specs are NOT typechecked — write fixtures against the real `StoreAccount` shape
   (`client/src/net/store.ts:240-250`; `status` is a BARE string, no `.tag` unwrap).
3. rb-51 ships a NOTIFICATION of a state the player can neither enter nor cancel from the client
   (ADR-0231:149 "no half-reachable deletion state") — defensible, mirrors ADR-0231's own accepted
   "no production caller" cost, but must be STATED in the ADR amendment and the PR body [R-M7].
4. `sessionGateBlocks()` freezes the banner while the session terminal is up — consistent with
   `#interact-prompt`, deliberate, recorded [R-m1].
