# Gates: ts-6b-8
Spec: M-trade-sessions.spec.md#ts-6b-8
Seed: a3b60057340936f1
Seeded: 2026-11-13T16:13:13Z
Repo: project
Scope: M-trade-sessions slice ts-6b-8 (type: feature, tier: routine, game repo) per specs/monster-realm-v2/M-trade-sessions.spec.md §ts-6b-8 and its Fix-batch contract: list views keep their rows (Shop, Heal, Journal, Evolve). Sole owner of i18n catalog/messageIds among in-flight siblings (ts-6b-2, ts-6b-4 add none). PR lists the residual ids it closes.
Criteria: 4 seeded, 0 shall-uncaptured
Touches: client/src/ui/shopView.ts, client/src/ui/healView.ts, client/src/ui/questLogView.ts, client/src/ui/evolutionView.ts, client/src/ui/shopView.test.ts, client/src/ui/healView.test.ts, client/src/ui/questLogView.test.ts, client/src/ui/evolutionView.test.ts, client/src/ui/screens/shopScreen.ts, client/src/ui/screens/shopScreen.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-8.1: WHEN a store batch re-renders an open Shop, Heal, Journal or Evolve view whose view model is unchanged, THE CLIENT SHALL keep the existing row and control nodes, and a Shop button's disabled lock SHALL survive the batch — closes `R-ci-fix-20261002T0901Z-VIEWREBUILD` (`a batch render with an unchanged view model keeps the same row and button nodes` in `client/src/ui/shopView.test.ts`, with the same case in `healView.test.ts`, `questLogView.test.ts` and `evolutionView.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/shopView.test.ts src/ui/healView.test.ts src/ui/questLogView.test.ts src/ui/evolutionView.test.ts -t "a batch render with an unchanged view model keeps the same row and button nodes"
  EXPECT: /Tests +4 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-8.2: WHEN the shop row under the cursor disappears, THE CLIENT SHALL re-seat the cursor on its nearest neighbour — closes `R-ctl-8a-CTL8A.2` (`selling out the cursor's stack seats the cursor on the neighbouring row, not the first` in `client/src/ui/screens/shopScreen.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/screens/shopScreen.test.ts -t "selling out the cursor's stack seats the cursor on the neighbouring row, not the first"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-8.3: WHEN the shop tab changes while focus is in the list being hidden, THE CLIENT SHALL move focus to the shown list — closes `R-uif-10-SHOPFOCUS` (`switching tabs with focus on the Buy list moves focus to the Sell list` in `client/src/ui/shopView.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/shopView.test.ts -t "switching tabs with focus on the Buy list moves focus to the Sell list"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-8.4: WHEN the heal frame is shown, THE CLIENT SHALL show a localized title bar first — closes `R-uif-10-TITLES` (`the heal frame opens with a localized title` in `client/src/ui/healView.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.13.1/bin:$PATH npx --prefix client vitest run --root client src/ui/healView.test.ts -t "the heal frame opens with a localized title"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending
