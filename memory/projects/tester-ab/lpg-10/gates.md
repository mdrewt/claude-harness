# Gates: lpg-10
Spec: M-local-play.spec.md#lpg-10
Seed: f0258c344356ccfd
Seeded: 2026-11-14T14:50:29Z
Repo: project
Scope: Build lpg-10 per specs/monster-realm-v2/M-local-play.spec.md "### lpg-10 — single-player and friends worlds: no telemetry, no account token" (design section "Target-kind gates (lpg-10)"). Builds on lpg-1, merged as #775 (ae19aa79): TargetKind/TARGET_KINDS in client/src/net/shellDocument.ts, TARGET_KIND exported from client/src/shell/config.ts. lpg-0 (docs-only: docs/DECISIONS.md, docs/local-play.md) runs in parallel; DECISIONS.md conflicts union by title. Gates lpg-10.1..lpg-10.5.
Criteria: 5 seeded, 0 shall-uncaptured
Touches: client/src/observability/config.ts, client/src/observability/config.test.ts, client/src/main.ts, client/src/main.targetKindGate.test.ts, ARCHITECTURE.md, docs/DECISIONS.md

<!-- Fill CHECK/EXPECT during the PLAN phase. A seeded gate's CHECK must invoke a
     real gate runner (cargo/just/npm/npx/pnpm/node/vitest/pytest or an mr-* tool),
     or be declared MANUAL: with a resolvable `path:line` citation as EVIDENCE.
     Not met? The ONLY legal exit is a DEFER line with a resolvable target:
       DEFER: <gate> -> <existing slice id | backlog> [<category>/<SEVERITY>] — <reason>
       DEFER: <gate> -> wontfix — <reason>
     category: gameplay|security-privacy|data-integrity|netcode-determinism|ux-a11y|content|loop-ops; SEVERITY: LOW|MED|HIGH|CRITICAL.
     Findings about the checking apparatus are wontfix only; a slice promoted from a
     residual may not DEFER to `backlog`. -->

- [ ] lpg-10.1: FOR every member of `TARGET_KINDS` other than `official` and `test`, `resolveTelemetryConfig` SHALL return `disabled` with a reason naming the kind for every endpoint and interval input, including a valid `https:` origin; the `kind` parameter SHALL be required (`client/src/observability/config.test.ts`, iterating `TARGET_KINDS` so an unclassified new kind fails).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/observability/config.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] lpg-10.2: WHEN the target kind is `official` or `test`, `resolveTelemetryConfig` SHALL return what it returned before this slice for the same endpoint, interval, build mode and jitter — the existing `config.test.ts` cases pass with only the kind argument added.
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npm --prefix client run typecheck && NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/observability/config.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] lpg-10.3: WHEN the client boots with `VITE_MR_OTLP_ENDPOINT` set to a valid origin and a shell document of kind `local` or `private`, THE telemetry loader SHALL never be called (`client/src/main.targetKindGate.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/main.targetKindGate.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] lpg-10.4: WHEN the client boots with `VITE_MR_OTLP_ENDPOINT` set to a valid origin and a shell document of kind `official` or `test`, THE telemetry loader SHALL be called once with the exporter URL `<origin>/v1/metrics` (`client/src/main.targetKindGate.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/main.targetKindGate.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending

- [ ] lpg-10.5: WHEN the client boots with the OIDC issuer and client id variables set and a shell document of kind `local` or `private`, `connect` SHALL receive an empty `authIssuer` and `authClientId`, and WHEN the kind is `official` or `test` IT SHALL receive the configured values (`client/src/main.targetKindGate.test.ts`).
  CHECK: NO_COLOR=1 PATH=$HOME/.asdf/installs/nodejs/24.22.0/bin:$PATH npx --prefix client vitest run --root client src/main.targetKindGate.test.ts
  EXPECT: /Tests +\d+ passed \(\d+\)/
  EVIDENCE: pending
