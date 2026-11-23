# ci-fix-20261111T1648 — plan (REV 2 — reviewer + red-team folded; see §7)

PR #730's `e2e` job failed 9 consecutive attempts at `Install Playwright chromium`
(`cd client && npx playwright install --with-deps chromium`). CI-infra fix, not ts-3 code.
Worktree `.claude/worktrees/ci-fix-20261111T1648`, branch `slice/ci-fix-20261111T1648` from origin/master b40c8d09.
Touches: `.github/workflows/ci.yml` (the e2e job's install step) ONLY.

> OUTCOME (2026-11-11 18:20 UTC): delivered as PR #732 (https://github.com/mdrewt/monster-realm/pull/732), head 6556b53c; ledger 5/5 met; `just ci` green locally (gate X4, and again by the verifier); the PR's own CI run 43072342848 green on both jobs (gate X5). Artifact lenses (§8) and the verifier approved the diff; their findings tightened the gates only. PR body: monster-realm-ci-fix-20261111T1648-pr-body.md.

## §0 Facts (measured this session unless marked derived)

F1. The failure window: run 43042343178 attempts 1–9, the step started 14:51Z … 16:36Z and failed after
    ~10 min every time (≈2 h of outage). Signature: `E: Failed to fetch … Temporary failure resolving
    'azure.archive.ubuntu.com'` → `Error: Installation process exited with code: 100`.
F2. The runner image (ubuntu24 20261101.360.1) already has the resilience the brief lists as options:
    `/etc/apt/apt-mirrors.txt` = azure.archive.ubuntu.com (priority 1), archive.ubuntu.com (2),
    security.ubuntu.com (3); `Acquire::Retries "1"`; http/https `Timeout "15"`. In the failed log every item
    walks azure → azure (retry) → archive → security at 20 s per attempt and still ends `Err` (apt keeps the
    FIRST error text, hence azure's name on a security.ubuntu.com line). `packages.microsoft.com` fetched fine in
    the same step. ⇒ all three Ubuntu mirror names were unusable for 2 h; the runner's general egress was fine.
F3. ⇒ (derived) bounded retry/backoff, `Acquire::Retries`, and "fall back to a non-azure ubuntu.com mirror" would
    NOT have survived this outage: the image already does all three. Only independence from the ubuntu.com
    mirrors would have (a third-party mirror was not tested during the outage; §2 rejects it on cost).
    Not shown by the evidence: that cdn.playwright.dev was reachable DURING the outage (the browser download was
    never reached); the other network steps of attempt 9 (spacetime installer, cargo, npm ci) succeeded seconds
    before the apt failure, so general egress was fine.
F4. What apt was fetching: NOTHING chromium links against. All 21 packages in Playwright 1.61.1's
    `deps['ubuntu24.04-x64'].chromium` list are "already the newest version" on the image. The 9 NEW packages
    come from Playwright's `tools` group: fonts-freefont-ttf, fonts-ipafont-gothic, fonts-tlwg-loma-otf,
    fonts-unifont, fonts-wqy-zenhei, xfonts-cyrillic, xfonts-scalable (+ xfonts-encodings, xfonts-utils).
F5. Real-runner probe, scratch branch (runs 43063086349 and 43064123729, GitHub-hosted ubuntu-latest):
    after `npx playwright install chromium` with NO apt step — `ldd` "not found" = 0 for both
    `chrome` and `chrome-headless-shell`; chromium 149.0.7827.55 launches and renders. Fonts on the bare image:
    DejaVu (Sans/Sans Mono/Serif), Liberation, Lato, Noto Color Emoji; `fc-match monospace` = DejaVu Sans Mono
    both before and after the 9 packages.
F6. Per-glyph identity (run 43066886550, the complete repertoire): for each of 180 "rendered" code points
    (ASCII printable + every code point above U+007E that a non-unit-test file under client/src,
    client/index.html, client/public, client/e2e, game-core, server-module, client-wasm carries literally or
    through a CSS/JS/Rust/HTML escape or a numeric fromCharCode, closed under upper/lower-casing, plus the Intl
    formatting spaces) × 2 document languages (en, fr) × 6 families (monospace, sans-serif, serif, system-ui,
    Arial, ui-monospace) × 6 styles (400/600/700, upright + italic) × 10 sizes (9–32 px) = 129600 cells:
    the DOM box and the canvas pixel hash + advance (all sizes) and chromium's resolved platform font (CDP
    `CSS.getPlatformFontsForNode`, at 16 px) are IDENTICAL before and after the apt install —
    `PROBE-CLASS rendered: cells=129600 differing=0`. Every rendered cell resolves to an image font (DejaVu Sans
    Mono / DejaVu Sans / DejaVu Serif / Liberation Sans / Liberation Serif / Noto Color Emoji). UA-default
    form-control fonts: identical. Determinism control (same state twice): 0 differing. Sensitivity control: 15
    code points confined to unit-test files (CJK, fullwidth, DEL, …) DO change — the probe can see a difference.
F7. The client's font stacks are the generic `monospace` (styles.css, index.html); no web font, no Pixi
    `Text`/`fontFamily`. The e2e config is `headless: true`. No spec compares a screenshot to a stored golden
    image (`world-art`/`render-context` compare two live frames). The xfonts packages are not unreachable (their
    Type1 faces — Bitstream Charter, Courier 10 Pitch — become visible to fontconfig); they are inert because
    nothing resolves to them, which is what F6 measures.
F8. Cost of the apt step on a healthy runner: 20 s (master run 43019026518) to 71–83 s (the probes).
F9. `--with-deps` appears exactly once in the repo (ci.yml:116); nightly.yml installs no browser.

## §1 Fix (one step, e2e job only)

`run: cd client && npx playwright install chromium` — the browser binaries from Playwright's CDN, no apt.
The comment on the step states the current contract: no `--with-deps`, so no Ubuntu apt mirror is needed; the
image supplies chromium's libraries and the fonts the client's glyphs resolve to (DejaVu, Liberation, Noto Color
Emoji); the fallback fonts `--with-deps` would fetch are unused; a spec that needs one bundles a web font
instead of adding an apt step. No e2e file, config, assertion, timeout or retry is touched.

What the image now owns, and how each would fail on a future image:
- a chromium shared library missing → LOUD: Playwright validates ldd + dlopen libraries at launch and prints
  "Host system is missing dependencies to run browsers … npx playwright install-deps" on the first test.
- a baseline font missing (DejaVu/Liberation/Noto Color Emoji) → SILENT rendering change. Not new in kind:
  DejaVu (the `monospace` every screen uses) always came from the image, never from `--with-deps`; what is
  lost is the FreeFont/Unifont no-tofu floor. No test asserts a font identity.
No self-heal branch and no font-identity guard are added: an apt fallback that only runs on an image change
makes the font set vary by run and re-creates the apt dependency; a `fc-match` guard would turn an image font
change into red CI on every PR for a property no test relies on. The comment names the image fonts instead.

## §2 Rejected (each named by the brief)

- Bounded retry + backoff / `Acquire::Retries` / non-azure Ubuntu mirror: already in the image, already lost (F2/F3).
- A third-party mirror (e.g. kernel.org) appended or probed-and-reordered: 25+ lines of shell that rewrite
  image-owned apt config to keep fetching packages F6 shows are inert.
- Caching the nine .debs (or `~/.cache/ms-playwright`) with actions/cache: same — machinery to preserve inert
  packages; the browser cache addresses a different dependency (cdn.playwright.dev) that did not fail.

## §3 Proof (test-first, through the consumer of the config — GitHub Actions itself)

`standards/testing-tdd.md` forbids a check that reads ci.yml's text or whose subject is CI wiring, so there is
no in-repo test. The red/green is a FAULT INJECTION on a real runner, tester-authored
(`/tmp/cifix-probe-ptCg2K/fault/derive.mjs`), run from scratch branches:

- The deriver turns a given ci.yml into `.github/workflows/zz-fault-injection.yml`: the `e2e` job and header
  VERBATIM, the trigger swapped to `push` on `scratch/ci-fix-20261111T1648-**`, the `ci` job dropped, and two
  marked injected blocks: (A) before `Install Playwright chromium`, step `FAULT: Ubuntu apt mirrors unreachable`
  — blackhole the three mirror names in /etc/hosts (v4+v6), prove a control `apt-get download fonts-unifont`
  fails on fetch, prove cdn.playwright.dev / registry.npmjs.org / packages.microsoft.com still resolve, arm an
  audit wrapper at /usr/local/sbin/apt-get that logs every invocation then execs the real apt-get (self-tested
  as root and as runner, log truncated); (B) last step `ORACLE: apt-get was never invoked` — the log is empty.
- RED (run 43067893386, derived from master's ci.yml, parent b40c8d09): fails AT `Install Playwright chromium`
  with `E: Failed to fetch` ×9 and `Error: Installation process exited with code: 100`; suite skipped.
- GREEN (run 43068278919, derived from the slice's ci.yml, parent = slice HEAD): whole job green under the same
  fault, ORACLE prints `APT-INVOCATIONS=0`, and the suite's JSON report matches master's last green run
  (43019026518, same base commit) test for test.
- The ledger CHECKs bind each run to its commit FROM GIT (whole-tree equality of the scratch parent, the scratch
  commit adds only the fault workflow, the fault workflow minus the marked blocks equals the parent's e2e job
  and header, injected blocks byte-identical red vs green). The injected text itself is reviewed by the
  artifact lenses — an injected step can do anything, so review of those ~85 lines is the honest backstop.

## §4 Gates (ledger X1–X5)

X1 fault-injected RED→GREEN on a hosted runner, no apt invocation · X2 suite parity with master's last green
run + diff confined to the install step's run line · X3 MANUAL: the dropped packages are inert (F5/F6 record) ·
X4 `just ci` · X5 the PR's own e2e run green without Playwright's apt path.

## §5 Lenses

Plan: reviewer + red-team (done, §7). Artifact: reviewer, red-team, verifier. reducer-security-auditor /
desync-guard: N/A — the diff is one CI step (no reducer, table, game-core, wasm or client-runtime surface).

## §6 Scratch artefacts (never merged)

Remote branches `scratch/ci-fix-20261111T1648-probe`, `-probe-b`, `-probe-c` (probe runs), `-red`, `-green`
(fault injection). X1/X2 read the `-red`/`-green` commits and runs: keep them until the PR is merged, then
delete all five. The `e2e-timings` artifacts X2/X5 download expire 14 days after their runs.
Local sandbox `/tmp/cifix-probe-ptCg2K`.

## §7 Plan review outcomes (reviewer: SOUND-WITH-CHANGES; red-team: product change held, proof forgeable) — adopted

- Repertoire hole (both lenses): code points reaching the screen only through CSS `content:` escapes
  (U+1F512, U+25B8, U+2717, U+1F480, U+25C0) were not measured. → generator now decodes CSS/JS/Rust/HTML
  escapes + numeric fromCharCode, closes under case mapping, adds the Intl spaces; probe re-run with weight
  600, italics, 10 sizes, lang en+fr: 129600 rendered cells, 0 differing (F6).
- X1/X2 forgeable (red-team B1, reviewer S1/S2): bound only ci.yml, trusted in-run step names, did not gate
  the failure signature or "fixed". → whole-tree binding from git, marker-stripped derivation equality,
  identical injected blocks, exit-100 + `E: Failed to fetch` on the install step's own log lines, `fixed`
  gated; X2 also bound to the green run's tree and pins the diff to the install `run:` line (red-team S5).
- "Three hostnames blackholed" ≠ "no apt" (red-team S3): → audit wrapper + ORACLE step (zero apt-get
  invocations) instead of an exit-100 shim, so the RED stays the genuine mirror failure.
- "Its own e2e run must pass" had no gate (reviewer S5): → X5.
- F7's Xvfb rationale wrong (reviewer S4): → rests on the measurement. Comment accuracy (reviewer S6): names
  FreeFont + X11, says "bundles it as a web font instead of adding an apt step".
- Silent font degradation on a future image (reviewer S3, red-team S2): NOT guarded, by decision (§1); stated
  in the comment and in the PR's risks.
- Evidence perishability (both): scratch branches kept until merge; artifacts expire in 14 days (§6).
- Not adopted: `install-deps --dry-run` allow-list guard (the library case is already loud at launch); a
  `fc-match` font guard (§1); a docs/DECISIONS.md entry (both lenses: the step comment suffices).

## §8 Artifact review outcomes (reviewer: APPROVE-WITH-CHANGES; red-team: ship the change, fix the X1 pins; verifier: APPROVE)

- No finding against the ci.yml diff or its comment. All changes below are to the ledger gates.
- X1 compared only two slices of the fault workflow and trusted block position/content (reviewer S1, red-team
  SF1/SF2 — forged with the real CHECK code): → exact stripped-file equality against a fixed name/trigger header
  + the parent's header and e2e job, block A directly before the install step, block B last, sha256 pin of the
  injected text, log predicates anchored on output-line endings, `fixed` requires diff status 1 exactly.
- "apt-get SHALL never be invoked" was not shown non-vacuous (the red run stops before the oracle step):
  → gate text narrowed to PATH-resolved apt-get and says the interception is inferred; the conclusive green
  evidence is the job passing while the control download fails. Not adopted: re-running both with an
  always-run oracle (two more runs for supplementary evidence).
- X3 claimed resolved-font identity for all cells; it was measured at 16 px (12960 cells) → gate text corrected.
- X2 pins the added comment-line count (5); X5 gates both jobs, picks the newest non-cancelled run, requires
  the step's own command line in the log, and prints a readable line while the run is in progress.
- X2's recorded evidence was cut at 200 characters (verifier) → labels shortened, gate re-recorded.
- Stated in the PR's risks rather than changed: the fault covers the install step onward (earlier steps by
  inspection); the injected cause is refused connections, not DNS timeouts; the repertoire covers repo-origin
  text only; the image owns libraries and baseline fonts on a floating `ubuntu-latest`.

