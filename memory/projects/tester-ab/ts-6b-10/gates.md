# Gates: ts-6b-10
Spec: M-trade-sessions.spec.md#ts-6b-10
Seed: f6031ca624beb3fb
Seeded: 2026-11-14T02:44:38Z
Repo: project
Scope: Build ts-6b-10 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-10 — Social: the row sheet is the kit sheet, Players opens on its panel, the trade confirm names the bond reset" (type: feature · tier: routine), inheriting the ts-6a Fix-batch contract ("#### Fix-batch contract" section). Implement its EARS criteria exactly; close the residuals it names. Base: origin/master ad877f4d (ts-6b-9 merged; catalog roster is now 545 keys — re-derive any key-count pins from master, with a named-intentional-change comment). Do NOT touch client/src/main.ts or client/src/main.*.test.ts: the st-6 refactor runs in parallel and owns them; if a criterion needs main.ts, park with a memo rather than editing it. PR subject: feat(client): ts-6b-10 — ….
Criteria: 3 seeded, 0 shall-uncaptured
Touches: client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/tradeSessionView.ts, client/src/ui/tradeSessionView.test.ts, client/src/ui/tradeView.ts, client/src/ui/tradeView.test.ts, client/src/ui/screens/socialScreen.ts, client/src/ui/screens/socialScreen.test.ts, client/e2e/pvp.spec.ts, client/src/ui/contextStack.ts, client/src/ui/contextStack.test.ts, client/src/ui/i18n/messageIds.ts, client/src/ui/i18n/catalog.test.ts, client/src/ui/reachability.test.ts, client/src/ui/i18n/catalogParity.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-10.1: WHEN a player is asked to confirm a trade whose own side offers a monster, THE CLIENT SHALL state that the monster's trust and quality time reset and are not restored by trading back, and a side offering no monster SHALL see the plain prompt — closes `R-21r-e-E1` (`the confirm prompt warns of the bond reset only when your offer includes a monster` in `client/src/ui/tradeSessionView.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/tradeSessionView.test.ts -t "the confirm prompt warns of the bond reset only when your offer includes a monster"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-10.2: WHEN the player opens a Social row's sheet, THE CLIENT SHALL render it as the kit ContextSheet ending with a Back row whose A closes the sheet and sends nothing — closes `R-uif-9-UIF9.2` (`the Social row sheet ends with a Back row whose A closes the sheet and sends nothing` in `client/src/ui/screens/socialScreen.test.ts`; `client/e2e/pvp.spec.ts` answers a challenge through the sheet).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/screens/socialScreen.test.ts -t "the Social row sheet ends with a Back row whose A closes the sheet and sends nothing"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending

- [ ] ts-6b-10.3: WHEN the Social frame opens on Players, THE CLIENT SHALL show the leaderboard panel directly, with no trade-root placeholder path — closes `R-ctl-8g-CTL8G.1-DEADPATH` (`socialPanel opens the Players tab on the leaderboard panel` in `client/src/ui/contextStack.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/ui/contextStack.test.ts -t "socialPanel opens the Players tab on the leaderboard panel"
  EXPECT: /Tests +1 passed \| \d+ skipped \(/
  EVIDENCE: pending
