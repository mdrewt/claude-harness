# 17r-d — M23 spec amendment per ADR-0206 Amendment A1 (progress / plan of record)

**Repo:** harness · **Branch:** `feat/17r-d-m23-a11y19-adr0206-a1` ·
**Worktree:** `.claude/worktrees/17r-d` · **Doc-only.**

## Plan of record (converged through planner + reviewer + red-team + /simplify)

Amend `specs/monster-realm-v2/M23-accessibility.spec.md` so it matches the shipped code, per
**ADR-0206 Amendment A1** (`projects/monster-realm/docs/adr/0206-…-frame-loop-announcer.md:214-261`,
whose *Ripples* paragraph explicitly delegates this spec edit to the harness side).

**Ground truth** (`projects/monster-realm/client/src/main.ts`): all twelve overlay-hotkey guards read
`<verdict>.kind === 'allow' && (<selfView>?.visible || worldHasFocus())` — :1160, :1173, :1185, :1199,
:1213, :1227, :1243, :1261, :1281, :1319, :1341, :1357 (comment at :1070). `worldHasFocus()` therefore
gates only cross-overlay OPEN transitions; the pressed overlay's own same-key toggle-CLOSE is exempt.

### Four edit sites (all inside §2.3 / §8 item 4 / A11Y-19 — all inside `touches:`)

- **S0 — §2.3:197-198.** The compatibility claim "for a sighted player who never Tabs, `activeElement`
  is `<body>` and behaviour is byte-identical" is named **false** verbatim by ADR-0206 A1's own
  Root-cause paragraph (`:226-228`). Hedged, not deleted. *(Added by the `/simplify` lens, M2 — it sits
  four lines above S1, inside the same subsection this slice is chartered to reword.)*
- **S1 — §2.3:205-206.** The "Accepted behaviour change (§8.4)" sentence.
- **S2 — §8 item 4 (:643-646).** `[DEFAULTS…]` → `[OVERTURNED by ADR-0206 Amendment A1, does not block]`.
- **S3 — A11Y-19 (:575).** Reworded EARS criterion (id, `[E2E]` tag and single-`SHALL` shape retained).

### Corrections the plan lenses forced (each verified independently before adoption)

1. **"restores toggle-close for all twelve" was an over-claim.** `canOpen` (`overlayRegistry.ts:325-336`)
   denies over any visible `GUARD_ONLY` blocker *before* self-visibility matters (`decide`, :305-320), and
   `dialogueView` is `GUARD_ONLY` and renders unconditionally. Box open + dialogue underneath + `B` ⇒
   `boxVerdict.kind === 'deny'` ⇒ the whole conjunction is false ⇒ nothing happens. Prose now hedges on
   the registry verdict.
2. **"after clicking a button" is false as evidence.** The three cited merged tests
   (`e2e/movement-input.spec.ts:493`, `e2e/trade.spec.ts:97`, `e2e/pvp.spec.ts:145`) are keyboard-only —
   `grep -c 'click('` is 0/0/1 and the one hit is outside the cited test. Phrase dropped.
3. **The A11Y-19 reword must NOT drop the second half.** The original "SHALL NOT open **or toggle** any
   overlay" also banned an unrelated hotkey force-*closing* the open overlay — the codebase's own
   "modals are GUARDED, NEVER DISMISSED" tenet (`main.ts:1159`). Narrowing to "SHALL NOT open the other
   overlay" would leave a destructive-close implementation conformant. Both SHALL-NOTs retained.
4. **Drop, don't restate, the `closeOverlayA11y` clause.** It is already false independent of A1: all 16
   call sites pass `fallbackFocus = null`, so the canvas branch is unreachable; the real return is the
   frame-loop close edge (`main.ts:2802`), which is ADR-0206 **D4** (main body, cited at ADR `:99`/`:144`)
   — so citing D4 stays inside this slice's charter and does not pull in Amendment A1b.

### Deliberately NOT done (flagged, not fixed)

- **§2.3:184-185 / §4:362** ("applied only to the twelve overlay-OPEN branches, as an additional
  conjunct") — still true; the composite `(<selfView>?.visible || worldHasFocus())` *is* that one
  conjunct. Left byte-identical.
- **`(§8.4)` informal label** kept — there is no literal `### 8.4` heading, but ADR-0206 A1 uses the same
  shorthand twice; renumbering is unrelated cleanup.
- **ADR-0206 Amendment A1b** (Chromium `body.focus()` no-op / `focusInsideHiddenSubtree()`) — out of
  charter. Residual, see below.
- **Boy-scout: none warranted.** A dense, heavily cross-referenced spec; every incidental candidate was
  either not stale or a different disjunct.

### Residuals to file (unpromoted, target `backlog`)

- `R-17r-d-SELFCLOSE-UNSPECCED` — post-A1 there is no `A11Y-*` acceptance id asserting "same-key
  toggle-close SUCCEEDS while focus is inside the pressed overlay". Only unit-tier
  `S5T-GATE-SAMEKEY-CLOSE` / `S5T-GATE-REOPEN-AFTER-SAMEKEY-CLOSE` (`main.a11yFocus.test.ts:587`, `:652`)
  cover it. Adding a new id is scope creep here.
- `R-17r-d-A11Y19-E2E-WEAK` — `e2e/pvp.spec.ts:115-138`, A11Y-19's nominal `[E2E]` oracle, asserts only
  that PvP stayed hidden; it never asserts the box is *still open*. A force-close bug passes it. The
  property is only really pinned at the unit tier (`main.a11yFocus.test.ts:449`, `S5T-GATE-BLOCKED`).
- `R-17r-d-A11Y16-DEADPATH` — A11Y-16's canvas-fallback is exercised only by
  `overlayA11y.test.ts:264`, which calls `closeOverlayA11y` with a synthetic non-null `fallbackFocus`;
  all 16 production call sites pass `null`. The criterion is proven against a dead path.
- `R-17r-d-A1B-SPEC-DRIFT` — Amendment A1b's finding is not reflected anywhere in M23.

## Gate (this slice)

`memory/projects/mr-selfcheck` → `SELFCHECK-OK`, plus harness `just ci` (cheap, not the gate).
No `mr-*` tool touched or added. Acceptance ledger gates B1/B2 are proven by
`memory/projects/gates/17r-d.spec-amend-probe.mjs` (gitignored dir — never lands in the repo tree),
written by a **`tester`** agent, not by the implementer.

## Status — COMPLETE (PR open, gate green, ledger 2/2)

- [x] Worktree + branch from `origin/main` (592e145)
- [x] Plan converged (planner + reviewer + red-team + /simplify); ledger CHECK/EXPECT filled; LINT-CLEAN
- [x] Probe written by a `tester` (never the implementer) and captured RED: B1 6 fails, B2 7 fails, teeth PASS
- [x] Four spec edits applied; probe green
- [x] Implementation lenses (reviewer + red-team) — 2 prose falsehoods found and fixed
- [x] `verifier` PASS after 3 gate-hardening rounds (it FAILED twice on gate robustness; both closed)
- [x] `mr-selfcheck`, harness `just ci` exit 0, `mr-gates check` 2/2 met
- [x] 5 residuals filed to `backlog`
- [x] PR open

## Gate hardening — the part worth remembering

The acceptance probe went through three adversarial rounds. Each `FAIL` was a real, demonstrated
cheat against a *doc* gate, and the fixes generalise:

1. **Token presence is not semantics.** The first probe required the words `cross-overlay OPEN`,
   `toggle-close` and `exempt` in each region. A sentence saying `toggle-close is NOT exempt`
   contains all three and passed. Fixed by dropping `is not gated`/`never gated` from the allowed
   vocabulary (they are lexically indistinguishable from a negation) and adding a polarity guard.
2. **Substring pins are append-tolerant.** Even with exact-substring pins, appending
   `… Caveat: treat the exemption as aspirational, not guaranteed runtime behaviour.` to the
   A11Y-19 line kept every pin matching. Fixed by replacing `includes` with whitespace-collapsed
   **equality** against hardcoded literals — a criterion line and a claim paragraph are bounded
   artifacts, so byte-pinning them whole is the right shape for a doc gate.
3. **Equality on a paragraph does not protect its region.** A contradicting `Addendum:` sentence
   dropped in *after* the pinned paragraph's blank line but before `### 2.4` still passed. Fixed
   structurally, not with more keywords: `B2:§2.3:exact-tail` pins anchor→end-of-region, so nothing
   may follow the claim inside §2.3.

**Accepted limitation (`R-17r-d-B2-GATESCOPE`):** contradicting prose inserted *earlier* in §2.3,
before the pinned compat-correction block, is undetectable without byte-pinning the whole ~60-line
section — brittle against every legitimate future edit. Deliberate stop; not chased.

## Not a 17r-d defect: `mr-selfcheck` flipped to FAIL mid-session

`SELFCHECK-FAIL residual-unpromoted: 3 residual(s) unpromoted past t1=3d — R-m22-s8-X9/X10/X11`.
All three carry `"source_slice": "m22-s8"`, `"owner": "supervisor"`, `"target": "backlog"`,
`"promoted_slice": null`. It printed `SELFCHECK-OK` earlier in this same session and aged over the
threshold since. Promoting a `backlog` residual into a spec section is supervisor-only work outside
this slice's `touches:`. Independently confirmed by the `verifier`. **Supervisor action needed.**
