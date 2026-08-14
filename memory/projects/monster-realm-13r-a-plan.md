# 13r-a — adjudicated plan (BINDING)

Slice: `M-postgate-thirteenth-review-residuals` 13r-a (CRITICAL, LIGHT).
Branch `feat/13r-a-observability-boot-fixes`, worktree `.claude/worktrees/13r-a`, base `origin/master` f9cd611.
ADR number reserved: **190**.

Source: `planner` (opus, high) output of 2026-08-14, adjudicated by the orchestrator below.
Rulings **AM1–AM14 are binding**; where they contradict the raw planner output, these win.

---

## Ground truth (live-reproduced by the orchestrator BEFORE planning — do not re-derive)

| # | Defect | Repro (verbatim) | Fix (verified) |
|---|---|---|---|
| D1 | tempo | `docker run --entrypoint /tempo grafana/tempo:2.10.7 -server.http-listen-address=127.0.0.1` → `flag provided but not defined: -server.http-listen-address`. `-help` shows tempo 2.10.7 has NO listen-**address** flag at all (only `-server.http-listen-port`, `-server.grpc-listen-port`). | **PARKED** — see AM1. |
| D2 | alloy | image runs uid 0; `/var/lib/alloy` + `/var/lib/alloy/data` are `drwxrwx--- 473:473` (`alloy:x:473:473`). Root + `--cap-drop ALL` has no `CAP_DAC_OVERRIDE` → `mkdir: cannot create directory '/var/lib/alloy': Permission denied`. | `--user 473:473 --cap-drop ALL --security-opt no-new-privileges:true` boots clean (full graph evaluation, HTTP server up). |
| D3 | caddy | `getcap /usr/bin/caddy` = `cap_net_bind_service=ep` on BOTH stock `caddy:2.11.4-alpine` and the built `observability-caddy:latest`. `docker run --user 10001:10001 --cap-drop ALL --security-opt no-new-privileges:true` → `exec /usr/bin/caddy: operation not permitted`, exit 255. Also fails WITHOUT `no-new-privileges`. | `RUN setcap -r /usr/bin/caddy` in the final stage before `USER` → prints `v2.11.4 h1:XKxkMTgNSizEvKG6QHue6cAsFOteU2qA61w2tKkCWi0=`. `setcap` already ships in the image (`/usr/sbin/setcap`, `libcap-setcap-2.78-r0`) — no `apk add`. |
| D4 | grafana | real provisioning dir mounted into `grafana/grafana:13.1.3` → `level=error msg="Failed to provision alerting" error="alert rules: invalid alert rule: interval (15s) should be non-zero and divided exactly by scheduler interval: 10"`, container exits. | `interval: 20s` (see AM5). |
| D5 | alloy `build_sha` | `config.alloy:157` accepts any `^[0-9a-f]{7,40}$`. Client emits `git rev-parse --short HEAD` = **7 chars** (`client/vite.config.ts:13-19` → `net/buildInfo.ts` → `main.ts` → `observability/attributes.ts:27`). | deployed-SHA allowlist, AM6/AM7 — **config-load verified**: the real `config.alloy` + the added statement boots clean 4/4 (env set and unset), zero errors. |

---

## Binding rulings

**AM1 — D1 (tempo) is a hidden-dependency PARK; the slice ships the other four.**
`checkListenAddrsLoopback` (`ops/observability/checks/stack-config-checks.mjs:456-512`) fails any compose service with no `LISTEN_FLAGS` entry. It runs as **C6** at `evals/observability-stack-config.eval.mjs:1556` and again as the "REAL FILES" test at `ops/observability/checks/stack-config-checks.test.mjs:1647` (executed by the eval's G9k `node --test` spawn). Both files are OUTSIDE the declared `touches:` set. There is **no honest in-touches fix**: no tempo flag matches the allowlist, and minting a `GF_SERVER_HTTP_ADDR=`/`MR_CADDY_BIND_ADDR=`-shaped variable on tempo purely to satisfy the scanner is a scanner cheat this repo's red-team doctrine forbids. → STOP, record, hand to the supervisor (follow-up prescription in AM2).

**AM2 — the tempo follow-up prescription** must appear verbatim in three places: ADR-0190 D1, the G12a failure message, and the eval header's PARKED block (as `P5`).
1. `checks/stack-config-checks.mjs` — `checkListenAddrsLoopback` stops being a flat `LISTEN_FLAGS` scan and gains per-service binding sources: for `tempo`, read `http_listen_address`/`grpc_listen_address` from `ops/observability/tempo/tempo-config.yml:9,11`. Its signature gains the tempo config text → **two call sites move**: the eval's C6 and the checks suite's REAL-FILES test.
2. `checks/stack-config-checks.test.mjs` — new teeth: tempo with no flag + config binding `0.0.0.0` FAILS; + config binding `127.0.0.1` PASSES; a **missing/unreadable tempo config FAILS** (absence is not loopback). Re-derive `NODE_TEST_PASS_FLOOR` (currently 181).
3. `docker-compose.yml` — delete the `-server.http-listen-address=127.0.0.1` item.
4. the eval — convert G12a from park form to post-fix form (expected list = `-config.file=…` only); delete the `P5` PARKED entry.
5. Proof: `docker compose up -d tempo` non-restarting; re-run `/tempo -help` if the image digest moved.

**AM3 — the slice EARS is re-scoped (stated assumption, not a question to the user).** Original: "…all seven services." Delivered: *WHEN `docker compose up -d --build` is run with a populated `.env`, THE SYSTEM SHALL reach a non-restarting running state for six of the seven services; **tempo** remains parked on AM1 and its boot is demonstrated separately under an uncommitted flag-drop override; **node_exporter**'s `/` bind mount is a documented WSL2/Docker-Desktop environment caveat (ADR-0180:1031 precedent), not a config defect.* Record in ADR-0190 D6 + the PR body.

**AM4 — D2 fix is `user: "473:473"`, NOT `cap_add: [DAC_OVERRIDE]`.** Quoted (bare `473:473` is a YAML mapping). Numeric on purpose — compose passes the string through and a name is resolved in-container against `/etc/passwd`, which an image rebuild can renumber silently (the `65534` prometheus/node_exporter precedent). Comment must name: the 0770 473:473 image dirs, the missing `CAP_DAC_OVERRIDE`, the rejected `cap_add` alternative, and the operator precondition that uid 473 now needs host-side `r-x` traverse on `${MR_SPACETIME_DATA_DIR}/replicas` (**not a regression** — root had no DAC_OVERRIDE either). **Do NOT add `read_only: true` to alloy** (unverified; its failure mode is the exact crash-loop this slice exists to end).

**AM5 — D4 is a three-number change, all coupled, no prose left lying.**
`interval: 15s` → **`20s`** (smallest 10s-divisible value ≥ the original). `for: 45s` → **`60s`** (Grafana transitions state only on an evaluation boundary, so `for: 45s` under a 20s interval fires at 60s regardless — leaving 45 makes the YAML lie about its own behaviour). The `:23-26` comment AND the `:34` annotation are rewritten together and must name all three distinct numbers with their owners: Prometheus scrape 15s (`prometheus.yml:14` — a **different** number, unchanged, not this file's), Grafana group evaluation 20s (forced by the fixed 10s scheduler tick), pending period 60s. Phrase the annotation as elapsed time, never a scrape count. Second rule (`:58-93`): `for: 10m` = 600s is an exact multiple of 20s and its comment carries no interval numbers → **verified no change needed**.

**AM6 — D5: the brief's "fixed 40-hex length" is REJECTED on evidence; a 7-hex pin is REJECTED as theatre.**
40-hex would silently drop `build_sha` from 100% of production datapoints (client emits 7) and would drift `client/src/observability/names.ts:51-63` + `names.test.ts:7`, both out of touches. A length pin changes no attacker capability (16^7 = 268M legal values; the real bound is Caddy's 120/min).

**AM7 — D5 ships the deployed-SHA allowlist (the brief's other option), additively and non-regressively.**
Keep `config.alloy:157` **byte-identical** (`checkS4AttributeValuesBounded` needs the `IsMatch(attributes["build_sha"]` substring, and the client mirror must not drift). ADD one statement after the `device_class` line:
```
`delete_key(attributes, "build_sha") where "` + sys.env("MR_BUILD_SHA") + `" != "" and attributes["build_sha"] != "` + sys.env("MR_BUILD_SHA") + `"`,
```
plus `- MR_BUILD_SHA=${MR_BUILD_SHA:-}` on the alloy service — **defaulted (`:-`), never `:?`** (`ops/observability/validate.mjs:27-33` hard-codes the `:?` set and is out of touches; there is also no `.env.example`). Unset ⇒ the first conjunct is constant-false ⇒ byte-identical behaviour to today. Set ⇒ cardinality 1. **Config-load verified live**: real `config.alloy` + this statement, `--user 473:473 --cap-drop ALL`, boots clean with the var set and unset (zero errors, 4/4). Behavioural drop semantics are NOT live-proven (no OTLP client reachable on this box — Docker Desktop VM networking, see memory) — record that honestly in ADR-0190 D5 as a named residual.

**AM8 — five new tripwires, exported pure functions in the eval, `T-h..T-l` teeth first, `G12a–G12e` against real files.**

| id | detector | assertion |
|---|---|---|
| G12a | `checkTempoCommandParked(compose)` | tempo's `command:` list is **exactly, in order** `-config.file=/etc/tempo/tempo-config.yml`, `-server.http-listen-address=127.0.0.1` — two-directional exact equality (SUBSET ⇒ "the parked flag was removed, convert this gate per AM2"; SUPERSET ⇒ "a new, possibly undefined flag appeared"). **Plus** the tempo image string equals a pinned constant so a digest bump forces re-verification of the park's premise. Fail-loud when the block / `command:` / items are absent. |
| G12b | `checkAlertGroupIntervals(rules)` | every group declares exactly one `interval:`; it parses, is **non-zero**, and is ≡0 (mod 10s). Every rule's `for:` (when present) parses, is non-zero, and is an **exact multiple of its own group's interval** — this is the anti-drift half that makes `for: 45s` under a 20s interval illegal. Fail if zero groups or zero rules were scanned. |
| G12c | `checkCaddySetcapBeforeUser(dockerfile)` | a `RUN` line contains both `setcap -r` and `/usr/bin/caddy` **and its index is less than** the `USER ` line's. Fail if no `USER`, no `RUN`, or if `cap_net_bind_service` is re-added anywhere. |
| G12d | `checkAlloyRunsUnprivileged(compose)` | the **alloy block** declares `user:` matching `<digits>:<digits>` with **non-zero** uid; still declares `cap_drop:` → `- ALL` and `no-new-privileges:true`; and declares **no `cap_add:`**. Property-based, not literal-pinned. |
| G12e | `checkBuildShaBounded(alloy, compose)` | (1) the `IsMatch(attributes["build_sha"], "^[0-9a-f]{7,40}$")` statement present character-for-character (widening OR a 40-hex narrowing both red, failure naming `client/src/observability/names.ts:51-63` as the mirror); (2) the AM7 allowlist statement present character-for-character AND `MR_BUILD_SHA` declared on the alloy service; (3) **exposure clause** — if compose's `MR_CADDY_BIND_ADDR` value does not start with `127.0.0.1`, `MR_BUILD_SHA` must be a REQUIRED (`:?`) var, else fail naming ADR-0190 D5. |

**AM9 — eval housekeeping (each omission silently weakens a gate).** add `dockerfile = readReal(...Dockerfile)` to the real-file try block (`:1460-1479`); bump `FILE_FLOOR` **14 → 15** (`:174`); extend the header stage list (`:4-51`) with G12a–G12e and T-h..T-l; add the tempo park to the header PARKED block **verbatim** as `P5` (the header forbids paraphrasing into a TBD); extend the terminal success `detail` (`:1904-1912`). `NODE_TEST_PASS_FLOOR` (181) is **unchanged** — no `checks/*.test.mjs` edits.

**AM10 — eval code constraints (from the eval's own binding header).** NO `new RegExp(`, no regex at all — String methods and hand-rolled walkers only (reuse `stripHashComments`, `indentOf`, `subBlock`, `keyIndices`, `scalarOf`, `listItems`, `toInt`). No fixture files on disk — inline strings only. `spawnSync` array args only. No `Date.now` in assertions. The `checks/stack-config-checks.mjs` predicates are imported, never re-implemented.

**AM11 — remote-only gate hygiene (both have red-ed this repo; local `just ci` cannot catch either).** No `:` + `//` scheme/separator sequence in ANY new comment text (Semgrep `--config auto` matches raw comment text). No high-entropy hex literal adjacent to the words `key`/`token`/`secret`/`hash` in new fixtures (gitleaks); build any long hex fixture by repeating a short literal.

**AM12 — proof-of-teeth (T-h..T-l).** Follow the existing `TEETH` contract exactly: every tooth asserts the GOOD fixture is **accepted** as well as the BAD one rejected (a detector that rejects everything is not a tooth), and no tooth may pass because the detector *threw*. Required BAD fixtures, minimum:
- **T-h**: flag removed (detail must contain BOTH `stack-config-checks.mjs` and `tempo-config.yml`); extra flag added; items reordered; `command:` key absent; no `tempo:` service; image digest changed by one character.
- **T-i**: `interval: 15s`; `interval: 0s` (the `0 % 10 === 0` hole); `interval: 20s` + `for: 45s`; `for: 0s`; unparseable `interval: twenty` / unit-less `for: 45` (fail LOUD, never coerce/skip); a group with two `interval:` keys; `groups:` empty; `rules: []`.
- **T-j**: `RUN setcap` deleted; **`setcap` placed AFTER `USER`** (the one a naive `.includes('setcap -r')` misses — and a real build failure); `setcap -r` only inside a `#` comment; `RUN setcap cap_net_bind_service=+ep …` (re-add); no `USER` line.
- **T-k**: `user:` absent; `user: "0:0"`; `cap_add: - DAC_OVERRIDE` alongside a correct `user:`; `cap_drop: - ALL` removed; `no-new-privileges:true` removed; `user:` set on the **prometheus** block but not alloy (proves block scoping, not a file-wide `includes` — the T-e blind spot).
- **T-l**: grammar widened to `{1,40}`; grammar narrowed to `{40}` (**this tooth is what stops a future author applying the brief's original 40-hex instruction**); the whole `delete_key` removed; the statement present only inside a comment; the AM7 allowlist statement removed; `MR_CADDY_BIND_ADDR=0.0.0.0` with `MR_BUILD_SHA` still `:-`-defaulted.

**AM13 — Boy Scout: take exactly two 1-line stale-label fixes, both in touches, both a forward obligation ADR-0180:1019 already declares.** `docker-compose.yml:26` `m20b-2` → `m20e-2`; `rules.yml:11-13` `m20b-2` → `m20e-2`. **Decline**: resizing the honestly-labelled PLACEHOLDER resource caps (a behaviour change needing its own measurement); `.env.example` creation and `prometheus.yml`'s twin stale label (both out of touches → PR follow-up flags only).

**AM14 — docs.** New `docs/adr/0190-observability-stack-boot-fixes.md` in the 0189 header shape with `Amends: ADR-0180`; add `**Amended-by:** ADR-0190` to ADR-0180's header (machine-gated by `evals/adr-backlink-integrity.eval.mjs` for pairs ≥ 0151); regenerate `docs/adr/DIGEST.md` via `just adr-digest` (**never** hand-edit). `CHANGELOG.md` NOT touched (git-cliff). `docs/adr/README.md` NOT touched. `docs/knowledge/**` — no schema change, no regen. `ARCHITECTURE.md` — check for a now-false stack statement; expect no change.

---

## Anti-patterns named (from the planner, all adopted)

1. **Scanner cheat** — a fake `GF_SERVER_HTTP_ADDR=`/`MR_CADDY_BIND_ADDR=` var on tempo to satisfy `LISTEN_FLAGS`. It lies about what binds the socket.
2. **Vacuous-green tripwire** — a detector that passes when it cannot find its input. All five must fail loud on missing service / missing `command:` / zero groups / zero rules / no `USER` line. "Silence is the trap" applies to the new code too.
3. **Comment/number drift** — changing `interval:` and leaving `45s`, "3 consecutive intervals", or the operator-facing annotation behind. G12b's `for`-is-a-multiple clause is the mechanical guard; the prose is the human one. Both.
4. **Boot-untested config** — shipping any of these four on a static green alone. All four were invisible to 1869 lines of predicates + 18 checks; that is the whole lesson of ADR-0180:1031.
5. **Over-broad allowlist** — a tempo tripwire built as a *denylist of known-bad flags* cannot catch flag #3. Exact set equality, both directions.
6. **Park rot** — a park comment with no tripwire; a tripwire that survives a tempo image bump (hence the digest pin); a follow-up prescription living only in a PR body instead of the ADR + the failure message.
7. **Theatre fix** — the 7-hex pin: changes the config, changes nothing about the threat, then reads as "residual closed".
8. **Scope creep into a boot-critical service** — `read_only: true` on alloy, resource-cap resizing, unverified OTTL.
9. **Semgrep/gitleaks comment traps** — see AM11.
10. **Silent touch-set widening** — `checks/*.mjs`, `checks/*.test.mjs`, `prometheus.yml`, `README.md`, `observability-dr-runbook.md`, `docs/adr/README.md`, `CHANGELOG.md` are each a STOP-and-surface.

## Boot-evidence protocol (manual, G11 precedent — ADR-0190 D6)

1. `docker compose down -v` **first** — the m20e-era override booted alloy as root **with** `+DAC_OVERRIDE`, so a pre-existing `alloy-data` volume on this box is likely root-owned and uid 473 cannot write into it. A fresh volume inherits `473:473` from the image path. Record as the operator remediation in D2.
2. Author `.env` by hand (no `.env.example` exists despite `README.md:37`). Required (`:?`): `GF_SECURITY_ADMIN_PASSWORD`, `MR_ALERT_WEBHOOK_URL`, `MR_GRAFANA_BASIC_AUTH_HASH`. Defaulted: `MR_SPACETIME_DATA_DIR`, `MR_GRAFANA_BASIC_AUTH_USER`, `MR_OTLP_ALLOWED_ORIGIN`, and now `MR_BUILD_SHA`. **Never commit `.env`.**
3. `docker compose up -d --build` — the `--build` is required; the Dockerfile fix is invisible to a cached image.
4. Record `docker compose ps` verbatim after ≥2 min + the absence of `Failed to provision alerting` + alloy's startup line + `caddy version` under the hardened flags.
5. Record the two honest gaps, unmassaged: tempo still crash-loops on the parked flag (additionally boot tempo once under a `/tmp` override that drops the flag, proving the only remaining blocker is the checker, not tempo's config); node_exporter cannot bind-mount `/` on WSL2/Docker Desktop.
6. Concurrency traps: an `account-e2e` run holds a global spacetime lock; a concurrent `evals/run.mjs` rebuilds `client-wasm` under a live vite server. Check `ps` before blaming a red on this diff.

## Residuals for the PR body / supervisor

- **R2** the tempo park (AM1/AM2) — needs a serial follow-up slice owning `ops/observability/checks/**`.
- **R3** `build_sha`: the allowlist mechanism ships **off by default**; the bound is real only once the operator sets `MR_BUILD_SHA`. Trigger for making it mandatory is `MR_CADDY_BIND_ADDR` widening (M-playtest-a2), now mechanically enforced by G12e clause 3.
- **R3b** the allowlist statement's *drop* semantics are config-load-verified but not behaviourally live-proven (no OTLP client reachable on this box).
- **R4** alloy operator precondition: uid 473 needs host-side `r-x` traverse on `${MR_SPACETIME_DATA_DIR}/replicas`. If wrong, the failure is a **silent tail stall**, not a crash — which is exactly what `AlloyIngestStalled` (`rules.yml:64`) catches. Say so; close the loop.
- **R6** out-of-touches drift surfaced, not fixed: `README.md:37` references a non-existent `.env.example`; `prometheus.yml:43` still says `m20b-2`; `docs/observability-dr-runbook.md` to be grep-confirmed clean of a `45s`/`15s` restatement.
- **R5** G12a's image-digest pin makes a tempo digest bump edit two files (mildly against C4's one-file principle) — accepted deliberately: the park's premise is image-specific.

---

# ADJUDICATION ROUND 2 — plan-review lens batch (reviewer + red-team + /simplify, 2026-08-14)

All three lenses ran in parallel against the plan above. **AM15–AM28 AMEND AM1–AM14 and win where they conflict.**

## AM15 — **AM7 is WITHDRAWN. D5 ships plan-option 5-A: `ops/observability/alloy/config.alloy` is functionally UNCHANGED.**
Three independent lenses converged, each with a distinct disqualifying reason:
- **red-team C3 (live-proven):** `MR_BUILD_SHA` is string-concatenated into an OTTL program. `MR_BUILD_SHA='a"b'` → `failed to evaluate config … statement has invalid syntax: 1:46: unexpected token "b"`, **exit 1**; `MR_BUILD_SHA='abc1234\'` → `lexer: invalid input text`, **exit 1**. Under `restart: unless-stopped` that is an infinite crash-loop — *the exact defect class this slice exists to end* — triggered by a `.env` typo in a `:-`-defaulted var that `validate.mjs` does not validate and a static gate cannot inspect. (`string.format("%q", …)` was proven to fix the escaping; `encoding.to_json` does NOT — it fails config decode. Recorded for the follow-up.)
- **reviewer B2:** `MR_BUILD_SHA` **already exists** with a different owner — `client/vite.config.ts:14` reads it as the client build-time SHA override (ADR-0128). Two `.env` files, two read-times, one name. An operator pasting a 40-char full SHA stack-side against a 7-char client build drops `build_sha` from **100%** of datapoints, silently — precisely the outcome AM6 rejected the 40-hex option for, re-entering through the back door.
- **reviewer B1:** `ops/observability/.env.example` **DOES exist** (the planner's Read/Glob/rg are all blind to dotfiles; proof: `.gitignore:49` `!.env.example`, `checks/stack-config-checks.redteam.test.mjs:292-296` reads it un-try/catch'd in a REAL-FILES test that is green on master, `ADR-0180:988`). A new operator-facing env var belongs there — and that file is **out of touches**. Shipping the var without it is a discoverability failure; shipping it there is a touch-set violation.
- **/simplify:** off-by-default mechanism, behaviourally unproven, zero change to attacker capability today; not worth the surface in a LIGHT boot-critical slice.

**Delivered instead:** ADR-0190 D5 records that **both** options the brief named are rejected on evidence (40-hex silently breaks production because the client emits 7 chars; the deployed-SHA allowlist is an OTTL injection + a cross-owner name collision + needs an out-of-touches file), mechanizes the residual via G12e so it cannot be "closed" by a theatre fix, and re-scopes the real work to the follow-up slice that also gets a reachable OTLP client to prove drop semantics. `MR_BUILD_SHA` is NOT added to compose. **This is a deliberate, evidence-backed deviation from the slice brief — flag it in the PR body.**

## AM16 — **G12e clause 3 (the `MR_CADDY_BIND_ADDR` exposure clause) is CUT.** Three reasons, any one sufficient:
/simplify: `MR_CADDY_BIND_ADDR=` is already in `LISTEN_FLAGS`, so C6 fails any widening unconditionally — clause 3 guards a state no green build can reach. reviewer M3: its prescribed remedy (`:?`) immediately reds `validate.mjs:27-33`'s hard-coded `RENDER_ENV`, which is out of touches — a gate whose remedy is another gate's failure. red-team M5: it gates a proxy anyway — the real listener is `bind {$MR_CADDY_BIND_ADDR}` in each Caddyfile site block (`Caddyfile:31,47`), which **nothing** gates (`checkCaddyDualPosture:759-835` never reads `bind`; Caddy's no-`bind` default is all interfaces, live-verified). → cut clause 3; surface the Caddyfile-`bind` gap as an out-of-touches residual (R8).

## AM17 — **every new detector resolves its compose service block SCOPED INSIDE `services:`, with an exactly-one-match requirement.**
red-team C1 (live-proven, CRITICAL): the shipped `composeServiceBlock` (`checks/stack-config-checks.mjs:98-111`) does `lines.findIndex(l => l.trimEnd() === '  ' + name + ':')` over the **whole file** while `parseComposeServices` scopes to `services:`. A 6-line `x-decoy:` top-level key holding a benign `alloy:` shadows the real one: a compose with `--server.http.listen-addr=0.0.0.0:12345` **and** a `/bin/sh -c 'tail -F … | nc …'` entrypoint passes C4/C5/C6/C7/C11 today. The new detectors must NOT inherit this: locate `services:`, take its sub-block, `keyIndices(body, name, 2)`, and **fail loud unless exactly one match**. The shipped-module defect is out of touches → **R7, surfaced not fixed** (it is a live security hole in a merged gate; the supervisor should schedule it with AM2's tempo slice, which owns the same file).

## AM18 — **G12c is stage-aware and last-writer-aware, not index-aware.**
red-team C2 built two Dockerfiles that keep `RUN setcap -r /usr/bin/caddy` textually before `USER` and still ship `cap_net_bind_service=ep` + `exec … operation not permitted` exit 255: (a) the `setcap` in an earlier `AS builder` stage the final image discards; (b) a `COPY --from=…` **after** the setcap in the final stage — buildkit **preserves file capabilities across `COPY --from`** (verified; that is exactly how the cap arrives on `observability-caddy:latest` today via the committed `Dockerfile:16`). Detector contract:
1. split on `FROM`; analyse **only the final stage**; fail loud if the stage structure is ambiguous;
2. the `setcap -r /usr/bin/caddy` `RUN` must be the **last instruction in the final stage that writes `/usr/bin/caddy`** — no `COPY`/`ADD`/`RUN` mentioning that path may follow it;
3. **exactly one** `USER` line in the final stage, after the setcap (a trailing `USER root` undoes everything);
4. ban the `cap_net_bind_service` substring anywhere, and ban `ONBUILD`.
Plus **AM18b (in-image belt)**: make the final-stage line `RUN setcap -r /usr/bin/caddy && ! getcap /usr/bin/caddy | grep -q cap_` so a wrong-order Dockerfile fails `docker build` itself — static text alone cannot close this. Boot evidence additionally records `getcap` on the built image.

## AM19 — **G12b directory-scans, and its `for:` clause is re-labelled a repo convention.**
- red-team H1 (live-proven): compose mounts the whole `provisioning/` tree and Grafana loads **every** `*.yml` under `alerting/`. A sibling `rules-extra.yml` with `interval: 15s` reproduced `Failed to provision alerting … divided exactly by scheduler interval: 10`, grafana **exit 1**, while a `rules.yml`-only detector stayed green. → G12b enumerates `ops/observability/grafana/provisioning/alerting/*.yml|*.yaml`, gates every alert-rule document found, **fails on zero**, and holds an **exact expected file set** (`contact-points.yml`, `notification-policies.yml`, `rules.yml` — the G9j anti-smuggling shape) so a new file is a red, not a silent widening.
- reviewer M1: "`for` must be an exact multiple of its group interval" is **NOT a Grafana invariant** — Grafana validates `for >= 0` and rounds a non-multiple **up** to the next boundary. Keep the clause (it is what makes `for: 45s` under a 20s interval a lie about its own behaviour) but the failure message must say **"repo convention (ADR-0190), not a Grafana restriction"** and print the computed effective value `ceil(for/interval)*interval`. Group-interval divisibility by 10s and non-zero-ness stay **fail-loud** — those ARE Grafana's rules. Drop the "`for` non-zero" clause: `for: 0s` is legal and meaningful.
- red-team L4: pin the **grafana image string** in G12b the way G12a pins tempo's, since the 10s tick is image-dependent (three `GF_UNIFIED_ALERTING_*` env overrides were tried on 13.1.3 and none moved it — image-bump risk, not env-injection risk).

## AM20 — **G12e is PATH-SCOPED into the `s4_keep` component, not file-scoped.**
red-team H2 (live-proven): moving both `build_sha` statements character-for-character into a new `otelcol.processor.transform "parked_bounds"` whose `output {}` forwards nowhere keeps G12e **and** the shipped `checkS4AttributeValuesBounded` green while `s4_keep`'s effective statement list loses `build_sha` entirely — the public-ingest cardinality bomb, fully reopened. → G12e locates `otelcol.processor.transform "s4_keep"` → its `metric_statements` → its `statements = [` list, requires the pinned strings to be **elements of that list**, requires `keep_matching_keys(...)` to be element **[0]** of the same list (clause 1 as originally specified gated the key allowlist not at all), and fails loud if the component/block/list cannot be found.

## AM21 — **G12d is a KEY ALLOWLIST for the alloy service block, not a four-property checklist.**
red-team M1 (measured): `privileged: true` alone passes the four properties and hands the container `CapBnd 000001ffffffffff` + 185 host `/dev` entries (vs `0000000000000000` / 15 at baseline). Same for `group_add: ["0"]` (verified `groups=0(root),473`), `pid: host`, `ipc: host`, `volumes: - /:/host:ro`, extra `security_opt` items. → enumerate the keys the alloy block MAY declare and red on any other, in the same "exact set equality, both directions" doctrine as G12a. Explicit reds at minimum: `privileged`, `group_add`, `pid`, `ipc`, `userns_mode`, `devices`, `extends`, `entrypoint`, and any `security_opt` item other than `no-new-privileges:true`.

## AM22 — **G12a additionally pins tempo's VISIBILITY, and the image TAG not the digest.**
- red-team M2 (live-proven): `profiles: [parked]` on tempo removes it from `docker compose config --services` entirely — six-of-six healthy, park reads as closed, G12a green. `restart: "no"` is the softer version. → G12a asserts tempo declares **no `profiles:`**, **no `extends:`**, and `restart: unless-stopped`. The park is honest only while the failure stays visible in `ps`.
- reviewer m2: pin `grafana/tempo:2.10.7` (the **tag**), not the digest — a same-version CVE rebuild does not change the flag set, so a digest pin would red for nothing (R5's cost incurred gratis) while a *version* bump still forces re-verification, which is the actual intent.
- red-team H3: `extends:` (and an auto-loaded `docker-compose.override.yml`) smuggle arbitrary keys past every single-file detector — proven: `cap_add: [DAC_OVERRIDE, SYS_ADMIN]` with G12d **green**. → the eval also asserts **no `docker-compose.override.yml` / `compose.override.yml` exists** in `ops/observability/`. Gating `docker compose config` output is the durable fix and is out of touches → **R9**.

## AM23 — **AM3's node_exporter caveat is DELETED. It boots fine.**
red-team M4 ran the exact committed configuration (`--network host --user 65534:65534 --read-only --cap-drop ALL --security-opt no-new-privileges:true -v /:/host:ro,rslave … --path.rootfs=/host --web.listen-address=127.0.0.1:9100`) → `msg="Listening on" address=127.0.0.1:9100`, ran to timeout. Shipping a pre-written excuse for a working service is the "boot-untested config" anti-pattern pointed the other way. **Revised EARS (supersedes AM3):** *WHEN `docker compose up -d --build` is run with a populated `.env`, THE SYSTEM SHALL reach a non-restarting running state for six of the seven services; **tempo alone** remains parked on the AM1/AM2 hidden dependency, and its boot is demonstrated separately under an uncommitted flag-drop override.* Any node_exporter failure observed during the boot run is recorded **as observed**, never pre-excused.

## AM24 — **state the tempo park's uncomfortable truth plainly** (red-team L1). The committed `-server.http-listen-address=127.0.0.1` is a flag tempo cannot parse, so C6's `"all 7 services … bind 127.0.0.1 only"` is **vacuous for tempo** — tempo's real binding lives in `tempo-config.yml:9,11`, which no gate reads. G12a's job is to pin a known-false statement in place until AM2 lands. That sentence must appear in the G12a failure message, in ADR-0190 D1, and in the eval's PARKED block; otherwise the next reader takes C6's green as proof. (red-team also confirmed `grafana/tempo:3.0.2` rejects the flag too, and that loki's identical flag IS genuine — so AM1 stands and an image bump is not an escape hatch.)

## AM25 — **the park block is SEPARATE** (reviewer M4). The eval's `// PARKED — m20e-2 (verbatim …)` block at `:52` is scoped to m20e-2 and G9g's message at `:1715` literally says "P1-P4". Adding a `P5` there makes the header lie and desynchronises G9g. → add a **new** `// PARKED — 13r-a (verbatim):` block carrying the AM2 prescription; leave the m20e-2 block byte-identical.

## AM26 — **ADR-0190 D4 must quote and correct `ADR-0180:196`** (reviewer M5): "*up* is 0 for more than **3 consecutive scrape intervals**" — scrape stays 15s, but the pending period becomes 60s = **4** scrape intervals (3 *evaluation* intervals). ADR-0180's body is not editable here (AM14 permits only the `Amended-by:` header line), so the correction lands in ADR-0190 by line reference. Reviewer grepped the rest of the repo clean: the dashboard JSON has no `45`/`15s`/`AlloyDown`, the DR runbook has no 15s/45s restatement, and `recording.rules.yml:15,61,72` / `datasources.yml:32` / `prometheus.yml:14-15` are Prometheus-side 15s numbers that stay true. **AM5's rewritten comment must name both `prometheus.yml:14` (`scrape_interval`) and `:15` (`evaluation_interval`), or neither** (reviewer m6).

## AM27 — **AM4's `read_only:` rationale is corrected** (red-team L2): with the committed `alloy-data:/var/lib/alloy/data` volume present, `read_only: true` boots clean (exit 124, running); it only fails without the volume. So the honest wording is "**not attempted, out of scope for this slice**", NOT "unverified, its failure mode is the crash-loop this slice exists to end". Also (red-team M3): the boot protocol's `down -v` **destroys all seven named volumes**, and only an *empty* root-owned volume self-heals — a populated one reproduces `failed to create the remotecfg service: mkdir … permission denied`, **exit 1**, with G12d green. Say both in ADR-0190 D2.

## AM28 — smaller corrections adopted verbatim
- **m1:** `ADR-0180:1019` names the stale-`m20b-2` obligation for `docker-compose.yml` **and `prometheus.yml`** only; `rules.yml:11` is the same class but unnamed. Taking compose+rules while declining prometheus (out of touches) leaves the named pair half-closed → one sentence in ADR-0190 saying so. Boy Scout stays 2 lines (AM13).
- **m3:** add a park comment at `docker-compose.yml:110` naming ADR-0190 D1 + the AM2 prescription — anti-pattern 6's inverse (a tripwire with no note at the site).
- **m4 → R10:** `checks/stack-config-checks.test.mjs:1079-1083`'s inline GOOD alert fixture will encode `interval: 15s` + `for: 45s` — a config Grafana 13 refuses — after this slice. Inline, so it will not red; out of touches → surfaced, not fixed.
- **m5:** record the `MR_BUILD_SHA` allowed shape and the `string.format("%q", …)` escaping requirement in ADR-0190 D5 for the follow-up (moot in-slice under AM15).
- **/simplify Q5:** T-l's "whole `delete_key` removed" and "AM7 statement removed" were the same fixture; under AM15 T-l reduces to: grammar widened `{1,40}`, grammar **narrowed `{40}`** (the tooth that stops a future author applying the brief's original 40-hex instruction), statement present only inside a comment, `keep_matching_keys` not element [0], and the AM20 unwired-component move.
- **/simplify Q3:** five separate detectors is the right granularity — do NOT collapse (a merged detector reporting one failure for five distinct defects is a real diagnostic loss, and the shipped module already splits `checkS4MetricLabelsBounded` from `checkS4AttributeValuesBounded` for exactly this reason).
- **NITs:** `client/vite.config.ts` `resolveBuildSha` is `:13-20`; `NODE_TEST_PASS_FLOOR` lives at eval `:167` (not `:181` — 181 is its VALUE) and its arithmetic is the doc comment at `:157-160`.

## Residuals added this round (PR body + handoff)
- **R7** `composeServiceBlock` is unscoped in the shipped `checks/stack-config-checks.mjs:98-111` — a live gate bypass (AM17). Out of touches; schedule with AM2 (same file).
- **R8** no gate reads the Caddyfile's `bind {$MR_CADDY_BIND_ADDR}` directives (`Caddyfile:31,47`); a deleted `bind` exposes Caddy on all interfaces with every gate green (AM16).
- **R9** `extends:` / `docker-compose.override.yml` bypass every single-file compose detector; the durable fix is gating `docker compose config` output (AM22).
- **R10** `checks/stack-config-checks.test.mjs:1079-1083`'s GOOD fixture becomes Grafana-invalid (AM28 m4).
- **R11** `MR_BUILD_SHA` name collision between `client/vite.config.ts:14` and any future stack-side allowlist (AM15/reviewer B2) — the follow-up must pick a distinct name or reconcile the two owners.
