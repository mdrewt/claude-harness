# 21r-b plan — route 15 raw-English feedback/session strings through the i18n catalog

Base: origin/master 4f36de2. Worktree `.claude/worktrees/21r-b`, branch `slice/21r-b`.

## Live sites (re-verified @4f36de2 — spec line numbers are exact)
- main.ts showFeedback: 8x 'disconnected — try again' (:2638 :2653 :2670 :2682 :2694 :2706 :2824 :2847)
  + 'Purchase complete!' :2643, 'Sale complete!' :2658, 'Trade accepted!' :2675, 'Trade rejected.' :2687,
  'Trade complete!' :2699, 'Trade cancelled.' :2711, 'Name updated!' :2829, 'Offer sent!' :2860.
  main.ts already imports `t as i18nT, tf` from './ui/i18n/resolver' (:132) — reuse `i18nT`.
- sessionModel.ts:31 SESSION_DISCONNECTED_FEEDBACK (used :96 :108) + :124-134 six overlay constants
  consumed in buildSessionViewModel (:137).
- careAction.ts:32 DISCONNECTED_MESSAGE.

## Keys (15 new; roster 112 -> 127). `{where}` does NOT fit: every site prints the bare line,
## and tf('chrome.status.disconnected') would change the English bytes -> parameterless sibling.
| key | en (byte-identical) |
|---|---|
| chrome.feedback.disconnected | disconnected — try again |
| shop.feedback.purchased | Purchase complete! |
| shop.feedback.sold | Sale complete! |
| trade.feedback.accepted | Trade accepted! |
| trade.feedback.rejected | Trade rejected. |
| trade.feedback.completed | Trade complete! |
| trade.feedback.cancelled | Trade cancelled. |
| chrome.rename.updated | Name updated! |
| tradePropose.feedback.sent | Offer sent! |
| chrome.session.expired.title | Session expired |
| chrome.session.expired.body | Your sign-in has expired. … (verbatim) |
| chrome.session.unreachable.title | Sign-in service unavailable |
| chrome.session.unreachable.body | We could not reach … (verbatim, incl. `—`) |
| chrome.session.continue | Continue as guest |
| chrome.session.confirmPrompt | Continuing as a guest gives up … (verbatim) |

French: fresh translations following catalog.fr.ts conventions (`’` U+2019, space before `!`/`?`/`:`).
All plain (PlainMessageId) — no MessageParams rows.

## Functional core / shell
- LAZY resolution only: `t()` reads the module-level locale cell that boot sets AFTER import, so a
  module-scope `const X = t(...)` would freeze English. sessionModel resolves the disconnected line
  inside `sessionStep` (event time) and the six overlay strings inside `buildSessionViewModel`
  (projection time); careAction resolves inside `performCare`. `SESSION_DISCONNECTED_FEEDBACK`
  export is removed (its only consumers are sessionModel.ts + its test).
- No new abstraction in main.ts: each literal becomes `i18nT('<key>')` in place.

## Sibling-test fallout (touches-delta; all in client/src/ui/i18n/, siblings of the declared catalogs)
- catalog.test.ts — EXPECTED_PLAIN roster/112 count -> 127 + byte-identical English pins.
- catalogParity.test.ts — resolver-importing roster gains ui/careAction.ts + ui/sessionModel.ts;
  main.ts i18n literal-key roster gains the 9 main.ts keys; ">=100/112" fr-differs tally.
- resolver.test.ts — chrome.* plain snapshot gains 8 chrome keys (feedback.disconnected, rename.updated, 6x session.*).
These are roster pins that MUST grow with the catalog (they are the catalog's own totality tests).

## Tests (tester, red-first)
- sessionModel.test.ts / careAction.test.ts: replace by-value literal pins with catalog assertions;
  add a fr representative: under setLocale('fr'), buildSessionViewModel(expired).title ===
  CATALOG_FR['chrome.session.expired.title'] (and !== en), sessionStep disconnected feedback === fr.
- New `client/src/main.feedbackI18n.test.ts` (sibling of main.ts, main.partyFull harness pattern):
  boot real main.ts under fr, drive one shop/trade feedback site, assert the #*-feedback text equals
  the fr catalog value. Fallback if the harness cannot reach a shop/trade site cheaply: document why.
- afterEach setLocale('en') everywhere (module-level cell leaks across tests in one file).

## Out of scope -> follow-ups (not in touches)
- claimModel.ts:93 CLAIM_DISCONNECTED_FEEDBACK — a fourth copy of the disconnected line.
- careAction.ts 'Cared!' — raw English, not in the spec's 15.
- sessionView.ts button labels (retry/cancel/confirm) if raw.

## Gate B1 CHECK
`npm --prefix client run test -- <the touched spec files>`; EXPECT pins `Tests  N passed (N)`.

## Plan-review outcome (reviewer, sonnet)
- ACCEPTED: count fix (8 chrome.* keys); @desc on chrome.feedback.disconnected cross-references chrome.status.disconnected.
- REJECTED (spec-bound): moving t() into sessionView.ts (outside touches; spec names careAction.ts/sessionModel.ts
  sites as the t() consumers) and a new top-level `session.*` namespace (spec: "existing namespaces").
- MITIGATION for the purity finding: sessionModel.ts / careAction.ts header comments are amended to name the
  i18n locale cell (set once at boot, read via t()) as their sole ambient input; tests pin behavior under
  both locales via setLocale. Flagged as a PR risk.
