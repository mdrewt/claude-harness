# Gates: ts-6b-7

Spec: M-trade-sessions.spec.md#ts-6b-7
Seed: 1fe25f68978f940d
Seeded: 2026-11-14T00:32:01Z
Repo: project
Scope: Build ts-6b-7 per specs/monster-realm-v2/M-trade-sessions.spec.md "### ts-6b-7 — tactical battle client: spoken turn events, server-time countdowns, results after playback" (type: feature · tier: routine). Closes residuals R-weekly-review-2026-11-06-F1, R-weekly-review-2026-11-06-F3, R-bt-15-CLOCKSKEW, R-bt-12-RESULTSDRAIN. Note: main.ts was just changed by st-5 (#766, session constants moved to client/src/shell/config.ts) — rebase-free, start from origin/master ebd5861d.
Criteria: 3 seeded, 0 shall-uncaptured
Touches: client/src/tactics/tacticsBattle.ts, client/src/tactics/tacticsBattle.test.ts, client/src/main.ts, client/src/tactics/strings.ts, client/src/net/serverClock.ts, client/src/net/serverClock.test.ts, client/src/main.dispatch.test.ts

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] ts-6b-7.1: WHEN a visible tactical battle ingests an own-turn start, a KO or the battle end, THE CLIENT SHALL announce it once through the live region, and SHALL NOT announce damage lines or replayed history — closes `R-weekly-review-2026-11-06-F1` (`announces own turn start, a KO and the finish through the announce dep but not damage lines or replayed history` in `client/src/tactics/tacticsBattle.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/tactics/tacticsBattle.test.ts -t "announces own turn start, a KO and the finish through the announce dep but not damage lines or replayed history"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-7.2: WHILE a battle clock window is open, THE CLIENT SHALL compute the Still-there countdown and the PvP clock ring from a server-time estimate, not the raw device clock — closes `R-weekly-review-2026-11-06-F3` and its duplicate `R-bt-15-CLOCKSKEW` (`a client clock 60 s behind still counts the last minute of a window` in `client/src/net/serverClock.test.ts`; a `client/src/main.dispatch.test.ts` case that both pumps read the estimate).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/serverClock.test.ts src/main.dispatch.test.ts -t "a client clock 60 s behind still counts the last minute of a window|the Still-there countdown and the PvP clock ring both read the server-time estimate, not the raw device clock"
      EXPECT: /Tests +2 passed \| \d+ skipped \(/
      EVIDENCE: pending

- [ ] ts-6b-7.3: WHEN a Finished batch arrives while the tactical shell is playing beats, THE CLIENT SHALL show the results panel only after the playback drains — closes `R-bt-12-RESULTSDRAIN` (`a Finished batch waits for the shell playback to drain before the results panel takes the frame` in `client/src/main.dispatch.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.dispatch.test.ts -t "a Finished batch waits for the shell playback to drain before the results panel takes the frame"
      EXPECT: /Tests +1 passed \| \d+ skipped \(/
      EVIDENCE: pending
