# m20c build plan — client real OTel Web SDK wiring (planner output, for review)

## Scope
Slice m20c: client/src/observability/** (new), client/src/main.ts, sibling tests; + package.json/lockfile (declared touches-delta); ADR-0180 body-only amendment; ARCHITECTURE.md minimal. NO evals/** (m20e owns), no server/ops changes.
EARS: OBS-16 (OTel Web SDK → OTLP/HTTP → Alloy, NO auth credential), OBS-21 (target m20b Caddy route policy), OBS-25 (fps SLO from mr_client_fps_bucket), OBS-34/35 (no player text / identity in telemetry).
Wire contract (merged m20b): Caddy https://otlp.localhost:8443 → Alloy 127.0.0.1:4318; CORS allows only content-type header; rate limit 120 req/min/IP; 512KB cap; Alloy S4 datapoint-attribute allowlist zone_id(^[0-9]{1,4}$)|build_sha(^[0-9a-f]{7,40}$)|device_class(^(desktop|mobile|tablet)$); prometheus remote-write labelkeep __name__|job|instance|zone_id|build_sha|device_class; recording rule needs series mr_client_fps_bucket verbatim.

## 1. Module layout — client/src/observability/ (7 source + 6 sibling tests)
- names.ts — S4 contract constants: metric names, 3-key attribute allowlist, value-shape predicates as hand-rolled char scans (no RegExp).
- deviceClass.ts — pure classifyDeviceClass(hints) → 'desktop'|'mobile'|'tablet'; never leaks raw UA.
- attributes.ts — pure buildAttributes({zoneId, buildSha, deviceClass}) → validates each value, OMITS non-conforming keys (mirrors Alloy delete_key semantics client-side).
- config.ts — pure resolveTelemetryConfig(env, isDev) → {kind:'disabled', reason} | {kind:'enabled', endpoint, exportIntervalMs} (discriminated union).
- frameWindow.ts — pure injected-clock 1s frame accumulator: tick(state, nowMs) → {state, sample?}, sample={fps, maxFrameMs}; O(1), no alloc on non-boundary path.
- instruments.ts — instrument spec table AS DATA (name/kind/buckets/description); imported by shell AND contract test.
- telemetry.ts — shell: ClientTelemetry façade (recordFrameSample, recordReconcile, recordCorrection, recordIntentReject, recordInterpGap, recordRtt, recordWasmReady), NOOP_TELEMETRY, startClientTelemetry(cfg, deps) — dynamic import() of OTel SDK, MeterProvider+Views+reader+exporter, catches everything.
Sibling tests: config/attributes/deviceClass/frameWindow/instruments/telemetry .test.ts + append-only describe block in main.wiring.test.ts.
Constraint: vitest runs in NODE env (no happy-dom default; vite.config.ts:47-53) — modules must import with no ambient window/document/navigator at module scope; host access injected via deps.

## 2. Metric contract
Global rules: (1) unit UNSET on every instrument, unit lives in the name (_ms) — Alloy otelcol.exporter.prometheus suffixes would break mr_client_fps_bucket otherwise. (2) All dims are DATAPOINT attributes, never Resource attributes (config.alloy:141 context="datapoint"; resource attrs go to target_info and get labelkeep-stripped).
| Signal | Kind | Name | Buckets |
| fps | Histogram | mr_client_fps | [10,20,30,40,45,50,55,58,60,72,90,120,144] |
| frame hitch | Histogram | mr_client_frame_time_max_ms (max per 1s window) | [4,8,12,16,20,25,33,50,100,250,1000] |
| reconcile attempts | Counter | mr_client_reconcile | — |
| reconcile corrections | Counter | mr_client_reconcile_correction | — |
| rejected intents | Counter | mr_client_intent_reject | — |
| remote-interp gap | Histogram | mr_client_interp_gap_ms | [16,25,33,50,66,100,150,200,300,500] |
| RTT | Histogram | mr_client_reducer_rtt_ms | [5,10,20,30,50,75,100,150,250,500,1000,2500] |
| wasm ready | Histogram | mr_client_wasm_ready_ms (once/session) | [50,100,200,400,800,1600,3200,6400] |
Attributes on every datapoint: zone_id, build_sha, device_class (or fewer). One frozen attribute object, rebuilt on zone switch.
SPEC FINDING: §4 names both "prediction-divergence rate" and "reconcile-correction rate" but the predictor exposes ONE boolean (predictor.reconcile() returns true iff corrected tile differs — predictor.ts:261-263, consumed main.ts:776). Ship the decomposition (attempts/corrections/rejects); PromQL derives both rates. Record in ADR as spec-vs-code reconciliation.

## 3. Config / init
- VITE_MR_OTLP_ENDPOINT unset ⇒ telemetry OFF (mirrors VITE_MR_DEVLOG idiom, devLog.ts:39-54); vitest/Playwright inert with zero machinery; OTel chunk never fetched when off.
- Parse reject-don't-clamp: absolute https: origin; DEV-only also http://127.0.0.1:<port>|http://localhost:<port>. Else {kind:'disabled', reason} + exactly one console.error.
- Deliberate divergence from devLog dev-rethrow: telemetry NEVER throws in either mode (record in ADR).
- VITE_MR_OTLP_INTERVAL_MS default 60000, clamped [15000,300000]. Worst case 4 req/min vs Caddy 120/min.
- Fail-silent: startClientTelemetry void, no rejection escapes; exporter failures swallowed (tls internal ⇒ browser may permanently reject cert). Every façade method try/catch-wrapped (idiom main.ts:833-837).
- Temporality CUMULATIVE explicitly.
- Resource: explicit { 'service.name': 'monster-realm-client' }, NO service.instance.id (R-1).

## 4. main.ts wiring (6 hook points, all additive)
1. Module scope after wasm-derived consts (main.ts:180-186): const WASM_READY_MS = performance.now(). (wasm import top-level-awaited by then.)
2. Module scope: TELEMETRY_CONFIG resolve + let telemetry = NOOP_TELEMETRY (F-3 precedent main.ts:147-158).
3. In main() BEFORE conn = connect({: startClientTelemetry fire-and-forget; on success assigns telemetry + recordWasmReady(WASM_READY_MS). Placement keeps it out of DEVLOG_CONNECT_START/END scan region (main.wiring.test.ts:2475-2481).
4. reconcileFromStore (main.ts:776): recordReconcile() + if (diverged) recordCorrection(). Must sit OUTSIDE NH2_RECONCILE_START/END region (main.wiring.test.ts:1781-1782).
5. noteMoveRejection (main.ts:821-838): if (dropped) recordIntentReject() inside existing try.
6. sendIntent (main.ts:850): t0 before call; .then(() => { try { recordRtt(now-t0) } catch {} }) BEFORE the existing .catch( (see R-4).
7. Frame loop (main.ts:2413-2423): after const now = performance.now()/predictor.drain(now), before NH2_RAF_START re-issue comment: const s = frameTick(now); when 1s window closes recordFrameSample(s) + recordInterpGap(maxRemoteGapMs()).
Per-frame cost: reuse of performance.now(), 3 number updates, 1 compare; no alloc, no export, no attr hashing.

## 5. Signal seams (no edits outside touches)
- divergence/correction: local `diverged` at main.ts:776 ✅
- reject class: `dropped` at main.ts:872 → noteMoveRejection ✅
- interp gap: StoredCharacter.jitterEwma public (store.ts:363-365) + adaptiveInterpDelayMs EXPORTED pure fn (interpolation.ts:133), same fn renderResolver.ts:109 uses — import it, never copy. Sampled 1/s, O(remotes). ✅
- RTT: spacetimedb 2.6 #callReducerWithEncodedName returns Promise settled on server Ok/OkEmpty (node_modules/spacetimedb/dist/sdk/index.mjs:6313-6338) — genuine round trip. Measured at enqueueMove seam only (~5/s walking). ✅
- fps/frame-time: rAF body main.ts:2415 ✅ | wasm-init: module-scope mark ⚠ definition = ms from timeOrigin to wasm exports callable (includes doc load) — documented, not isolated (parking 3).
Nothing needs predictor.ts/interpolation.ts/renderResolver.ts/store.ts/connection.ts edits.

## 6. Test plan (mutation each tooth bites)
OBS-16: T-16a fake exporter factory captures config; headers {} or absent (bites Authorization header). T-16b source-scan observability/*.ts: zero authorization|Bearer|token|getToken|credentials:|withCredentials case-folded indexOf (bites SpacetimeDB-token reuse). T-16c resolved URL ends /v1/metrics, origin equals configured endpoint (bites hardcoded fallback).
OBS-21: T-21a fast-check property: PROD accepts only https:; http:/ws:/relative/empty ⇒ disabled (bites permissive parser). T-21b interval clamp property ∈[15000,300000] + at clamp min implied rate < 120/min incl. hypothetical future traces reader ×2 (bites 1s debug interval).
OBS-25: T-25a fps spec name === 'mr_client_fps' AND unit unset (bites rename + unit suffix mutation). T-25b buckets strictly increasing, contain BOTH 50 and 60 (bites bucket simplification that unmeasures the SLO). T-25c property: fps = frames×1000/windowMs ± tol, exactly one sample per elapsed second (bites double-count inflation).
OBS-34/35: T-34a Object.keys(buildAttributes(...)) set-equality vs literal {zone_id,build_sha,device_class} (bites player_name/identity/session_id). T-34b property over hostile inputs (64-hex identity, UTF-8 names, "1;drop", 10-char zone, 'unknown' sha): non-conforming key OMITTED never passed/coerced (bites "let Alloy filter it"). T-35a source-scan observability/*.ts + new main.ts hunks: zero identity|toHexString|nickname|profileName (bites in-scope var leak; identity is module-scope let at main.ts:210). T-35b property: any input → one of three literals (bites return ua.toLowerCase()).
Contract: T-A1 predicates accept/reject same fixtures as config.alloy:156-158 ("0","9999","10000","-1","a1b2c3d","A1B2C3D","unknown","desktop","Desktop","tv"). T-A2 source-scan bans new RegExp.
Perf/robustness: T-P1 throwing factory still yields usable no-op façade (bites init escape). T-P2 throwing instrument.record() not propagated (bites removed try/catch). T-P3 non-boundary tick returns same state identity (bites per-frame object literal). T-P4 wiring tooth: exactly one telemetry call in rAF region, window-boundary-guarded (bites unconditional per-frame record).
Inertness: T-I1 env unset ⇒ disabled, NO console output (bites enabled-by-default fallback).
Wiring: T-W1 six hooks present exactly once at correct anchor sides (expectUniqueAnchor per new needle). T-W2 new .then in sendIntent at index < region.indexOf('.catch(') and contains no .catch(/predictor. (protects W-NH3-DROP-GUARDED :2317-2330). T-W3 'epoch =' count still 1 (:2261-2266).

## 7. Dependencies (touches-delta: client/package.json + package-lock.json)
@opentelemetry/api ^1.9.x · @opentelemetry/sdk-metrics ^2.x · @opentelemetry/resources ^2.x · @opentelemetry/exporter-metrics-otlp-http ^0.22x (experimental 0.x MUST version-align with stable 2.x core). NOT added: sdk-trace-web, context-zone, auto-instrumentations, exporter-trace-otlp-http, instrumentation-*.
No bundle-size gate exists (justfile:376 ci recipe; ci.yml adds gitleaks/cargo-audit/semgrep/SBOM). ~30-40KB gz expected; mitigated by dynamic import() → separate chunk never fetched when off. Record dist delta in ADR.
No postinstall scripts in the four → allowScripts map unchanged (verify with npm ci).

## 8. Risks
R-1 HIGH service.instance.id → instance label: labelkeep PRESERVES instance; default browser resource may inject per-session UUID → per-session series mint (the exact OOM Correction 2 prevents, via a door the datapoint allowlist can't see). Mitigate: explicit resource, never defaultResource().merge(); T-R1 pins resource attr set to literal; ADR amendment extends Correction 2.
R-2 HIGH Alloy v1.18.1 suffix behavior (add_metric_suffixes deprecated → translation_strategy): unit-free naming converges both, but verify live: compose up, POST synthetic OTLP, curl prometheus label values | grep mr_client. Fix would be rename in instruments.ts only.
R-3 HIGH CORS origin default mismatch: MR_OTLP_ALLOWED_ORIGIN default https://localhost:5173 vs vite dev 5290 (vite.config.ts:41) & preview 4173, both http. Client can't edit ops. Document required value in ADR + config.ts header; confirm fail-silent covers CORS rejection; flag to supervisor.
R-4 HIGH main.wiring.test.ts needle minefield: W-NH3-DROP-GUARDED counts predictor. after .catch(; W-NH3-EPOCH-CAPTURED exactly one 'epoch ='; expectUniqueAnchor reds on duplicated anchors. Run npm test after EACH main.ts hunk.
R-5 MED nightly coverage ≥96 lines include src/**/*.ts; CANNOT add exclusion (SANCTIONED_EXCLUDES exact set). Keep shell thin; run just coverage locally pre-merge.
R-6 MED *.localhost DNS + tls internal: browser rejects self-signed until CA trusted; verify game silent+unaffected on failure.
R-7 MED exporter may use sendBeacon on page-hide (text/plain body vs CORS content-type); verify; pin fetch/XHR transport if needed.
R-8 LOW dependency-review/SBOM surface new deps, non-blocking. R-9 LOW semgrep remote-only: no dynamic RegExp/ws:// literals/http:// outside DEV loopback.

## 9. Parkings
1. Browser traces — PARKED (no criterion forces; ingest side live; no consumer; ~2× bundle+requests). Reopen trigger: a dashboard/SLO needing per-interaction causal timing.
2. window.__mrObs DEV hook — PARKED (YAGNI; fingerprint surface adjacent to verify-build-hooks.mjs).
3. wasm-init isolation via resource timing — PARKED; ship "ms from timeOrigin to exports callable", documented precisely in ADR.
4. mr_client_snap/teleport metric — PARKED (snapped at main.ts:2423 is backgrounded-tab artifact; folding it corrupts divergence rate).
5. Per-reducer RTT beyond enqueueMove — PARKED.
6. evals/** — m20e owns.

## 10. Anti-patterns (to name in PR)
1. Re-implementing Alloy filter as second policy (names.ts must mirror config.alloy fixture-for-fixture).
2. Copying adaptiveInterpDelayMs instead of importing.
3. Unbounded label values (omit key, never ship known-doomed value).
4. Resource attributes as cardinality back door (R-1).
5. Per-frame record()/alloc/ObservableGauge doing work.
6. Global mutable singleton meter/provider (breaks vitest isolation).
7. new RegExp anywhere.
8. Telemetry throwing into main() or enqueueMove promise chain (a throw in new .then falls into existing .catch → dropRejected on a SUCCESSFUL move = manufactured desync).
9. .includes-style contract assertions (must be exact set equality).
10. Coverage exclusion instead of thin shell.

## Increments
m20c-1 pure core (6 files + 5 tests, zero deps) → m20c-2 telemetry.ts shell + deps + lockfile → m20c-3 six main.ts hunks ONE AT A TIME each followed by full npm test + wiring describe block → m20c-4 live verification vs compose stack (R-1/2/3/6/7) + ADR amendment + ARCHITECTURE.md.

## Graph findings (blast radius)
main.wiring.test.ts ~3.2k lines of needle-bounded source scans over main.ts = dominant risk. spec-gap-revival.eval.mjs:232 asserts client/src has no .tsx/.spec.ts/.d.ts — do not add those. dom-shell-coverage-exclusion.eval.mjs:34-69 SANCTIONED_EXCLUDES exact set. verify-build-hooks.mjs:30-43 — don't name hooks __game/__mrTrade/__mrPvp. build-ci-hygiene.eval.mjs:123 only checks engines.node.
