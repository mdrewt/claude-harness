# Gates: ts-6b-11
Spec: M-trade-sessions.spec.md#ts-6b-11
Seed: bc6957e477b960e8
Seeded: 2026-11-14T04:23:26Z
Repo: project
Scope: Build ts-6b-11 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-11 — frame chrome and Profile: one title bar, no Privacy door, the disclosure in the player's language" (type: feature · tier: routine), inheriting the ts-6a Fix-batch contract ("#### Fix-batch contract" section). Implement its EARS criteria exactly; close the residuals it names (R-uif-17-KITPOLISH, R-qf-13-QF13.4, R-21r-b2-E1). Base: origin/master a3177baa (st-6 merged: the boot-built view handles now live in client/src/shell/views.ts and are mounted from main() via mountViews — read/write them through that module, do not re-declare them in main.ts). The disclosure English wording is pinned compliance text and must not change.
Criteria: 3 seeded, 0 shall-uncaptured
Touches: client/src/ui/boxView.ts, client/src/ui/boxView.test.ts, client/src/ui/raisingView.ts, client/src/ui/raisingView.test.ts, client/src/ui/controlsView.ts, client/src/ui/controlsView.test.ts, client/e2e/ui-whole.spec.ts, client/src/ui/claimView.ts, client/src/ui/claimView.test.ts, client/src/ui/claimView.i18n.test.ts, client/src/main.ts, client/src/main.input.test.ts, client/src/main.accel.test.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/privacyView.ts, client/src/ui/privacyView.i18n.test.ts, client/src/ui/privacyBanner.ts, client/src/ui/i18n/catalogParity.test.ts, client/e2e/accounts.spec.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-11.1: WHEN the Monsters, Inventory or Controls frame shows, THE CLIENT SHALL render its title in the one kit title bar, with no repeated in-panel heading — closes `R-uif-17-KITPOLISH` (`the Inventory frame has one title bar and no in-panel heading` in `client/src/ui/raisingView.test.ts`, with the same case in `boxView.test.ts` and `controlsView.test.ts`; `client/e2e/ui-whole.spec.ts` measures the three titles).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/raisingView.test.ts src/ui/boxView.test.ts src/ui/controlsView.test.ts -t "frame has one title bar and no in-panel heading"
  EXPECT: /Tests +3 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-11.2: WHEN Profile shows the Account section, THE CLIENT SHALL offer no separate Privacy door, Privacy staying reachable as its own section — closes `R-qf-13-QF13.4` (`the Account section's rows are its claim actions only, with no privacy door` in `client/src/ui/claimView.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/claimView.test.ts -t "the Account section's rows are its claim actions only, with no privacy door"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-11.3: WHILE the locale is fr, THE CLIENT SHALL show the pseudonymization disclosure in French, and the English text SHALL stay byte-identical to the pinned wording — closes `R-21r-b2-E1` (`the privacy disclosure follows the locale` in `client/src/ui/privacyView.i18n.test.ts`, which replaces that file's stays-raw case; the byte-identity case in `client/src/ui/privacyBanner.test.ts` passes unedited).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/privacyView.i18n.test.ts src/ui/privacyBanner.test.ts -t "the privacy disclosure follows the locale|RB52C-DISCLOSURE-PIN BITES"
  EXPECT: /Tests +2 passed \| \d+ skipped \(/
  EVIDENCE: pending
