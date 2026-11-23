# Gates: lpg-1

Spec: M-local-play.spec.md#lpg-1
Seed: 953419ddc01eff7f
Seeded: 2026-11-14T13:18:00Z
Repo: project
Scope: Build lpg-1 per specs/monster-realm-v2/M-local-play.spec.md "### lpg-1 — the connection target is run-time configuration" (design section "The shell document (lpg-1)"; runs in parallel with lpg-0, which shares only docs/DECISIONS.md — append your entry, union on merge; lpg-10 follows after merge).
Criteria: 8 seeded, 0 shall-uncaptured
Touches: client/src/net/shellDocument.ts, client/src/net/shellDocument.test.ts, client/src/net/connectionConfig.ts, client/src/net/connectionConfig.test.ts, client/src/shell/config.ts, client/src/shell/config.test.ts, client/src/main.claimCode.test.ts, client/index.html, client/src/indexShell.smoke.test.ts, client/vite.config.ts, scripts/verify-build-hooks.mjs, scripts/verify-build-hooks.test.mjs, justfile, client/e2e/shell-config.spec.ts, client/src/ui/boxView.test.ts, client/src/net/credentialDecision.ts, client/src/main.a11yFocus.test.ts, projects/monster-realm/.claude/skills/spacetimedb-client/SKILL.md, README.md, docs/runbooks/playtest-ops.md, ARCHITECTURE.md, docs/DECISIONS.md

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] lpg-1.1: WHEN the page global holds a document whose `connection` names a `uri` and `db`, THE client SHALL resolve exactly those strings (trimmed, otherwise unchanged), whatever `VITE_STDB_URI`/`VITE_STDB_DB` held at build (`client/src/shell/config.test.ts`, importing `shell/config` with those env names stubbed to other values).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/shell/config.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] lpg-1.2: WHEN a production client starts with no document, or with one whose `db` is the dev default in any letter case, THE import of `shell/config.ts` SHALL throw before `connect` is reachable, with a message naming the missing or refused field (`client/src/net/connectionConfig.test.ts`, `client/src/shell/config.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/connectionConfig.test.ts src/shell/config.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] lpg-1.3: WHEN a document is present but is `null`, an array or a non-object, lacks `connection` or its `uri` or `db`, holds any key other than `connection`, `uri`, `db` and `kind`, has a field of the wrong type, a `uri` that is empty or not an absolute `ws:`/`wss:` URL or that carries userinfo, a query or a fragment, a `db` outside `[A-Za-z0-9_-]+`, or a `kind` outside `TARGET_KINDS`, THE resolver SHALL throw in development and production builds alike and SHALL never substitute a default (`client/src/net/connectionConfig.test.ts`, one table row per rejection).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/connectionConfig.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] lpg-1.4: WHEN a development client starts with no document, THE resolver SHALL return `ws://127.0.0.1:3000`, `monster-realm` and kind `test`; WHEN a valid document omits `kind`, THE resolver SHALL return `test` in a development build and `private` in a production build (`client/src/net/connectionConfig.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/connectionConfig.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] lpg-1.5: FOR every valid document, including strings holding quotes, backslashes, `<`, `</script>`, U+2028, U+2029 and non-ASCII text, `renderShellConfigScript(doc)` SHALL equal `globalThis.__MR_SHELL_CONFIG__=` followed by the document's JSON with `<`, U+2028 and U+2029 written as `\u` escapes and a final `;`, and evaluating it on a fresh global object and reading it back with `readShellDocument` SHALL resolve to the same target (`client/src/net/shellDocument.test.ts`, property test).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/net/shellDocument.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending

- [ ] lpg-1.6: WHEN `verify-build-hooks.mjs` runs over a build directory, IT SHALL fail when `shell-config.js` is missing, does not set a readable document, or names a database other than `MR_PLAYTEST_DB`, SHALL fail when any other `.js` file there contains that database name, and SHALL pass when only `shell-config.js` names it (`scripts/verify-build-hooks.test.mjs`).
      CHECK: PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH node --test scripts/verify-build-hooks.test.mjs > /tmp/lpg-1-vbh.out && grep -E "^ℹ pass [0-9]+$" /tmp/lpg-1-vbh.out
      EXPECT: /^ℹ pass [5-9]$/
      EVIDENCE: pending

- [ ] lpg-1.7: WHEN the page receives a shell document naming a database that does not exist on the suite's server, THE client SHALL report the `connect-failure` error in the feedback hint row and `window.__game()` SHALL show no own character in the suite's world, and WHEN it receives the document the dev server serves, THE client SHALL join the suite's world (`client/e2e/shell-config.spec.ts`, the document replaced through Playwright routing of `/shell-config.js`).
      CHECK: MR_E2E_PORT=5316 VITE_STDB_DB=mr-lpg1 NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$HOME/.local/bin:$HOME/.cargo/bin:$PATH npm --prefix client run e2e -- e2e/shell-config.spec.ts --project=default --reporter=line 2>&1
      EXPECT: /^\s*2 passed \(/
      EVIDENCE: pending

- [ ] lpg-1.8: WHEN `main.ts` boots under a document, `connect` SHALL receive exactly that document's `uri` and `db`, and the claim-code and first-run-nudge storage keys it reads and writes SHALL be the ones derived from that pair; WHEN it boots again under a second document naming another target, no key of the first target SHALL be read or written (`client/src/main.claimCode.test.ts`).
      CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.3/bin:$PATH npx --prefix client vitest run --root client src/main.claimCode.test.ts
      EXPECT: /Tests +\d+ passed \(\d+\)/
      EVIDENCE: pending
