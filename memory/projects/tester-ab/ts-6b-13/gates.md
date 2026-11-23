# Gates: ts-6b-13

Spec: M-trade-sessions.spec.md#ts-6b-13
Seed: 42a91927c7274784
Seeded: 2026-11-14T06:23:26Z
Repo: project
Scope: Build ts-6b-13 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-13 — unread view members and the heal fallback" (deletions only; the compiler proves each member has no reader). Closes R-ctl-10a-HEALTARGET, R-ctl-10a-BOXCB, R-ctl-10b-PVPCB, R-ctl-10b-PVPPLAYERS, R-qf-9-RAISINGVESTIGES.
Criteria: 5 seeded, 0 shall-uncaptured
Touches: client/src/ui/healModel.ts, client/src/ui/healModel.test.ts, client/src/ui/screens/types.ts, client/src/main.ts, client/src/main.dispatch.test.ts, client/src/ui/feedbackPolicy.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/boxView.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/boxView.test.ts, client/src/ui/pvpView.ts, client/src/ui/pvpView.test.ts, client/src/ui/pvpModel.ts, client/src/ui/pvpModel.test.ts, client/src/ui/raisingView.ts, client/src/main.controls.test.ts, client/src/ui/feedbackPolicy.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/resolver.test.ts, client/src/ui/reachability.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-13.1: WHEN a heal frame issues `healParty`, THE CLIENT SHALL always carry the bound location id, with no first-location fallback path — closes `R-ctl-10a-HEALTARGET` (`npm --prefix client run typecheck` with `locationId` required; `client/src/main.dispatch.test.ts`, `client/src/ui/screens/healScreen.test.ts` and the catalog parity suite pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.dispatch.test.ts src/ui/screens/healScreen.test.ts src/ui/healModel.test.ts src/ui/feedbackPolicy.test.ts src/ui/i18n/catalog.test.ts src/ui/i18n/catalogParity.test.ts src/ui/i18n/resolver.test.ts src/ui/contextStack.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-13.2: THE Box view SHALL declare no heal callback, the Box Heal Party control being retired — closes `R-ctl-10a-BOXCB` (`npm --prefix client run typecheck`; `client/src/ui/boxView.test.ts` and `client/src/ui/overlayA11yWiring.test.ts` pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/boxView.test.ts src/ui/overlayA11yWiring.test.ts src/main.dispatch.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-13.3: THE PvP view SHALL declare no challenge-initiate callback, a challenge starting only face to face — closes `R-ctl-10b-PVPCB` (`npm --prefix client run typecheck`; `client/src/ui/pvpView.test.ts` and `client/src/ui/overlayA11yWiring.test.ts` pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/pvpView.test.ts src/ui/overlayA11yWiring.test.ts src/main.dispatch.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-13.4: THE CLIENT SHALL compute challenge-busy players in one place, `interactModel.pendingChallengeIdentities` — closes `R-ctl-10b-PVPPLAYERS` (`npm --prefix client run typecheck`; `client/src/ui/pvpModel.test.ts` and `client/src/ui/pvpView.test.ts` pass without `challengeablePlayers`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/pvpModel.test.ts src/ui/pvpView.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] ts-6b-13.5: THE CLIENT SHALL construct `RaisingView` from its parent element only — closes `R-qf-9-RAISINGVESTIGES` (`npm --prefix client run typecheck`; `client/src/ui/raisingView.test.ts` and `client/src/ui/overlayA11yWiring.test.ts` pass).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/raisingView.test.ts src/ui/overlayA11yWiring.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending
