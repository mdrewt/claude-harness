# Gates: ts-6b-9

Spec: M-trade-sessions.spec.md#ts-6b-9
Seed: d7e349b46ac3eff7
Seeded: 2026-11-14T01:33:42Z
Repo: project
Scope: Build ts-6b-9 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-9 — announcements and focus: grace and export edges, repeats, French overlay names, the claim result" (type: feature · tier: routine). Closes residuals R-ci-fix-20261109T0400-LATEFOCUS-SCROLL, R-ctl-13-REANNOUNCE, R-polish-1-CLAIMRESULTCATCHREENTRY, R-rb-52-GRACEANNOUNCE, R-rb-53-E1, R-uif-4-REPEATSAY, R-weekly-review-2026-10-02-F4. Note: main.ts was just changed by ts-6b-7 (#767: server-time clock, spoken turn lines in tacticsBattle) — start from origin/master 356d1b7a.
Criteria: 6 seeded, 0 shall-uncaptured
Touches: client/src/main.ts, client/src/main.privacyWiring.test.ts, client/src/ui/liveRegion.ts, client/src/ui/liveRegion.test.ts, client/src/ui/a11yCopy.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/a11yCopy.test.ts, client/src/ui/overlayA11y.test.ts, client/src/ui/overlayA11y.ts, client/src/net/connection.ts, client/src/net/connection.runtime.test.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/catalogShape.test.ts, client/src/ui/i18n/i18nTypes.compile.test.ts, client/src/ui/i18n/resolver.ts, client/src/ui/announcements.ts, client/src/render/world.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-9.1: WHEN the account moves from active to deletion grace, including through another session's request, THE CLIENT SHALL announce the grace deadline once through the live region, and a boot into an existing grace SHALL stay silent — closes `R-rb-52-GRACEANNOUNCE` (`an account entering deletion grace is announced once` in `client/src/main.privacyWiring.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.privacyWiring.test.ts -t "an account entering deletion grace is announced once"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-9.2: WHEN a data export goes from incomplete to complete, THE CLIENT SHALL announce it once through the live region, and a reconnect that replays the chunks SHALL NOT announce it again — closes `R-rb-53-E1` (`a data export that finishes assembling is announced once` in `client/src/main.privacyWiring.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.privacyWiring.test.ts -t "a data export that finishes assembling is announced once"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-9.3: WHEN the same announcement is made again after it was spoken, THE CLIENT SHALL write it to the live region again, while identical announcements inside one coalescing window SHALL still merge — closes `R-uif-4-REPEATSAY` and its duplicate `R-ctl-13-REANNOUNCE` (`a repeated identical announcement after the first was painted is written again` in `client/src/ui/liveRegion.test.ts`; the suite's consecutive-dedup case is rewritten by the tester).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/liveRegion.test.ts -t "a repeated identical announcement after the first was painted is written again"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-9.4: WHILE the locale is fr, THE CLIENT SHALL name and announce every overlay and the world region with the fr catalog copy — closes `R-weekly-review-2026-10-02-F4` (`under the fr locale an opened overlay is named and announced in French` in `client/src/ui/overlayA11y.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/overlayA11y.test.ts -t "under the fr locale an opened overlay is named and announced in French"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-9.5: WHEN the deferred initial focus fires, THE CLIENT SHALL focus the anchor without scrolling the frame — closes `R-ci-fix-20261109T0400-LATEFOCUS-SCROLL` (`the deferred initial focus does not scroll the frame` in `client/src/ui/overlayA11y.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/ui/overlayA11y.test.ts -t "the deferred initial focus does not scroll the frame"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-9.6: IF the claim-success handler throws, THEN THE CLIENT SHALL NOT report the claim as rejected — closes `R-polish-1-CLAIMRESULTCATCHREENTRY` (`a throw in the claim-success handler is not reported as a claim rejection` in `client/src/net/connection.runtime.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/connection.runtime.test.ts -t "a throw in the claim-success handler is not reported as a claim rejection"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending
