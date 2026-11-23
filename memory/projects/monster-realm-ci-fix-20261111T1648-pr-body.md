## ci-fix — the e2e job installs chromium without apt, so an Ubuntu mirror outage cannot fail it (PR #730's 9× red)

PR #730's `e2e` job failed 9 consecutive attempts (run 43042343178, 14:51Z–16:46Z) at `Install Playwright chromium` (`npx playwright install --with-deps chromium`): `E: Failed to fetch … Temporary failure resolving 'azure.archive.ubuntu.com'` → `Installation process exited with code: 100`. Infra, not ts-3 code. PR #730 and `slice/ts-3` are untouched.

### Diagnosis
- **The runner already retries and falls back, and it lost anyway.** The image's mirror list is azure.archive.ubuntu.com → archive.ubuntu.com → security.ubuntu.com with `Acquire::Retries "1"`; in the failed log every item walks all three (20 s each) and still ends `Err`. `packages.microsoft.com` fetched fine in the same step and the job's other network steps passed seconds earlier. All three ubuntu.com names were unusable for ~2 h — a bounded retry, `Acquire::Retries` or another ubuntu.com mirror would not have survived it.
- **apt was fetching nothing chromium needs.** All 21 chromium libraries in Playwright 1.61.1's dependency list are preinstalled on the image ("already the newest version"). The 9 packages apt wanted are fallback fonts from Playwright's `tools` group: fonts-freefont-ttf, fonts-ipafont-gothic, fonts-tlwg-loma-otf, fonts-unifont, fonts-wqy-zenhei, xfonts-cyrillic, xfonts-scalable (+ xfonts-encodings, xfonts-utils).

### Change (`.github/workflows/ci.yml`, the e2e job's install step only)
`run: cd client && npx playwright install chromium` — browser binaries from Playwright's CDN, no `--with-deps`, no apt. A comment on the step states the contract. No e2e spec, config, assertion, timeout or retry is touched. The step also gets faster (11 s on the runner vs 20–83 s with the apt install).

Not done, on purpose: retry/backoff, `Acquire::Retries`, another Ubuntu mirror (the image already does all three — see above); a third-party mirror or a `.deb`/browser cache (machinery to keep fetching packages measured to be inert).

### Proofs (all on GitHub-hosted runners, from scratch branches — nothing below is in the repo)
- **The dropped fonts are inert for this suite** (run 43066886550, image ubuntu24 20261101.360.1). With no apt step `ldd` reports no missing library for `chrome` or `chrome-headless-shell` and chromium launches. For every code point the client source, game content or e2e specs can put on screen — literal or through a CSS/JS/Rust/HTML escape, closed under case mapping, plus the Intl spaces: 180 code points × en/fr × 6 font families × 6 styles × 10 sizes = 129 600 cells — the layout box and canvas pixels are identical before and after the apt install; at 16 px chromium's resolved font is identical too and is always an image font (DejaVu, Liberation, Noto Color Emoji). Sensitivity control: 15 code points that exist only in unit-test files (CJK, fullwidth …) do change.
- **Red** (run 43067893386): the tester's fault injection — the three mirror names blackholed in `/etc/hosts`, a control `apt-get download` proven to fail — on master's e2e job fails at `Install Playwright chromium` with `E: Failed to fetch` ×9 and `Installation process exited with code: 100`; the suite never runs. Same symptom as PR #730 (the injected cause is refused connections, the original was DNS timeouts).
- **Green** (run 43068278919): the same fault on this branch's e2e job — the whole job passes, `242 passed, 1 skipped`, the audit wrapper around `apt-get` logged zero invocations. Its Playwright JSON report matches master's last green run (43019026518, same base commit) test for test: 243 titles, same outcome and per-attempt statuses, 0 unexpected, 0 flaky.
- **This PR's own CI** (run 43072342848): `ci` and `e2e` green; the install step downloaded the browsers with no `Installing dependencies` phase; `242 passed, 1 skipped`.
- The fault workflow is the commit's own `ci.yml` e2e job plus two marked injected steps; the ledger checks bind each run to its commit from git (whole-tree parent equality, derivation equality, sha256 of the injected text).
- No in-repo test: `standards/testing-tdd.md` forbids checks that read `ci.yml` or whose subject is CI wiring; the config is exercised through its consumer, GitHub Actions.
- Lenses: reviewer + red-team on the plan (found the CSS-escape hole in the first glyph probe and four ways to forge the first gate drafts — both closed before implementation); reviewer + red-team on the artifact (diff approved; further gate tightening only); verifier APPROVE (re-executed X1/X2 under the supervisor's Node 18, read the injected steps, ran `just ci` itself: 3115 + 932 Rust tests, 5464 client tests, validate 8/8). `reducer-security-auditor` / `desync-guard` not applicable (one CI step). Details: `memory/projects/monster-realm-ci-fix-20261111T1648-plan.md`, `memory/projects/gates/ci-fix-20261111T1648.x3-proofs.md`.

### Acceptance ledger
@@LEDGER@@

### touches-delta:
none — the diff is exactly the declared `.github/workflows/ci.yml`.

### boyscout-delta:
none.

### comment-scan:
`COMMENT-SCAN CLEAN`.

### Decisions
none (`standards/decisions.md` bar not met; the step comment carries the why on the line a maintainer would revert).

### Risks / follow-up flags
- **The runner image now owns chromium's libraries and the baseline fonts**, and `runs-on: ubuntu-latest` floats. A missing library is loud (Playwright names it at the first launch). A missing baseline font changes rendering silently — DejaVu, the `monospace` every screen uses, always came from the image, never from `--with-deps`; what is given up is the FreeFont/Unifont no-tofu floor. No font-identity guard and no apt fallback were added: the first would turn an image font change into red CI on every PR for a property no test relies on, the second makes the font set vary by run and brings the apt dependency back.
- The inertness measurement covers text that originates in the repo. Strings produced outside it (SpacetimeDB host or npm-package error text) are not in the repertoire; a future spec that needs CJK/Thai/Unifont glyph shapes must bundle a web font.
- "No Ubuntu apt mirror needed" is fault-tested from the install step onward; the earlier steps were checked by inspection (none uses apt). The job still depends on cdn.playwright.dev, the npm registry, the spacetime installer and the Actions/rust toolchain downloads — none of those failed in the outage and none is changed here.
- The audit wrapper's interception of Playwright's own apt calls is inferred (sudo + runner self-tests), not observed: the red run stops before the oracle step.
- **Scratch branches to delete after merge** (gates X1/X2 read the `-red`/`-green` commits and runs until then): `scratch/ci-fix-20261111T1648-probe`, `-probe-b`, `-probe-c`, `-red`, `-green`. The `e2e-timings` artifacts X2/X5 download expire 14 days after their runs.
- After this merges: rerun PR #730's CI (supervisor).

Items: none

🤖 Generated with [Claude Code](https://claude.com/claude-code)
