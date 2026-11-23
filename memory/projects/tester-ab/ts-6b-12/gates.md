# Gates: ts-6b-12
Spec: M-trade-sessions.spec.md#ts-6b-12
Seed: 1542e8ad9299df94
Seeded: 2026-11-14T05:32:08Z
Repo: project
Scope: Build ts-6b-12 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-12 — retired trade and launcher markup" (type: feature · tier: routine), inheriting the ts-6a Fix-batch contract ("#### Fix-batch contract" section). Implement its EARS criteria ts-6b-12.1..12.3 exactly; close R-ts-3-STATICSHELL, R-ts-4-CLIENTDEADENDS, R-ctl-15-LAUNCHERATTR and list them in the PR body. Deletions only; keep the shell element ids. Base: origin/master 783003e0 (ts-6b-11 merged: the Account section has no Privacy door; catalog roster is 544 keys). PR subject: feat(client): ts-6b-12 — ….
Criteria: 3 seeded, 0 shall-uncaptured
Touches: client/index.html, client/src/indexShell.smoke.test.ts, client/src/ui/screens/profileScreen.ts, client/src/ui/careAction.ts, client/src/ui/screens/bagScreen.boot.test.ts, client/src/ui/screens/journalScreen.boot.test.ts, client/src/ui/tradeSessionModel.ts, client/src/ui/tradeSessionModel.test.ts, client/src/ui/screens/tradeSessionScreen.ts, client/src/ui/screens/tradeSessionScreen.test.ts, client/src/ui/tradeSessionView.test.ts, client/src/ui/feedbackPolicy.ts, client/e2e/trade.spec.ts, client/src/main.controls.test.ts, client/src/main.chips.test.ts, client/src/main.a11yFocus.test.ts, client/e2e/movement-input.spec.ts, client/e2e/a11y.spec.ts, client/src/ui/feedbackPolicy.test.ts, client/e2e/ui-screens.spec.ts, client/src/main.input.test.ts, client/src/main.reconnectStack.test.ts, client/src/ui/hintBar.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-12.1: WHEN the page loads, THE CLIENT SHALL ship the trade editor shell with no retired wizard control — closes `R-ts-3-STATICSHELL` (deletion only, with no new roster assertion: `client/src/indexShell.smoke.test.ts` passes once its pins on the deleted nodes are dropped, and `tradeSessionView.test.ts` and `client/e2e/trade-session.spec.ts` pass unedited).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/indexShell.smoke.test.ts src/ui/tradeSessionView.test.ts src/ui/screens/socialScreen.boot.test.ts src/ui/screens/bagScreen.boot.test.ts src/ui/screens/journalScreen.boot.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] ts-6b-12.2: THE CLIENT SHALL carry no input, message kind or DOM node that only the retired offer path produced, and a monster in another session SHALL stay blocked from an offer — closes `R-ts-4-CLIENTDEADENDS` (the eligibility cases in `client/src/ui/tradeSessionModel.test.ts`; `npm --prefix client run typecheck`; `client/e2e/trade.spec.ts` passes without the four retired nodes).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/tradeSessionModel.test.ts src/ui/screens/tradeSessionScreen.test.ts src/ui/feedbackPolicy.test.ts src/ui/careAction.test.ts src/main.reconnectStack.test.ts src/main.input.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] ts-6b-12.3: THE hint-bar chips SHALL carry no markup attribute that no code reads, and a click on a chip SHALL still press its button — closes `R-ctl-15-LAUNCHERATTR` (`client/src/main.chips.test.ts`, `client/src/main.controls.test.ts` and `client/e2e/a11y.spec.ts` pass selecting the chips by id).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/main.chips.test.ts src/main.controls.test.ts src/main.a11yFocus.test.ts src/ui/hintBar.test.ts src/indexShell.smoke.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending
