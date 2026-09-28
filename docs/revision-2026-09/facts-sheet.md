# Game-repo facts sheet (monster-realm @ master 4f36de2, post-de-bloat)

Read-only reference for every phase of the harness revision program. Re-derived from the live
repo on 2026-09-28 — never from harness docs.

## docs/DECISIONS.md
- **Unnumbered**, title-keyed entries (`## <decision title>`), 22 entries, each 10–25 lines:
  decision / why / what it rules out. Supersede-in-place (no Amends/Supersedes chains).
- Replaces `docs/adr/` entirely (deleted). There is no ADR numbering anywhere in the repo;
  `adr_next_free` has no meaning against this repo.
- Entries: rules-once-in-game-core · determinism (integer math, injected time/rng) · integer
  damage formula · content-as-data · server authority (thin reducers) · reject-don't-clamp ·
  table privacy (private + owner-scoped views) · bounded prediction · held keys · remote
  interpolation · integer pixel scaling · evolution graph + auto-evolve rule · recruiting ·
  economy bounds · battle lifecycle + PvP · accounts/guest/claim · deletion + data export ·
  dev-only reducers never ship · SpacetimeDB lockstep · additive schema · observability ·
  client UI overlay registry.
- **Design-ADR coverage gaps to adjudicate in Phase 3** (harness design ADRs 0002–0034 with no
  obvious DECISIONS entry; may be adequately covered by ARCHITECTURE.md or be code-evident):
  0007 zoned subscriptions/per-zone tick, 0020 zone transitions, 0026 ranked Elo profile,
  0032 accessibility, 0033 i18n. ADRs 0027 (raids) / 0028 (social) describe **unbuilt** M18/M19 —
  design intent, not decisions about existing code. 0009/0010/0034 are process ADRs (superseded
  or spec-corpus material).

## The 15 evals (`evals/*.eval.mjs` — the adjudicated machine-contract + behavioral tier; KEEP)
Behavioral (execute game code): `js-path-parity`, `movement-parity`, `prediction-parity`,
`netcode-determinism`, `netcode-convergence`, `determinism-fail-loud`.
Machine-contract (generated-artifact checks): `bindings-drift` (real `spacetime generate` diff),
`client-surface-privacy` (bindings-derived table/view/reducer allowlist — the privacy surface pin),
`append-only-ids`, `battle-schema-snapshot`, `spacetime-type-snapshot` (migration freezes),
`content-version` (content-hash pair), `monster-spritesheet-format`, `feature-isolation`,
`account-e2e` (live two-identity account/claim driver; holds a global spacetime lock).
`evals/run.mjs` is a ~25-line discover-and-run loop — still a fan-out structural-set member.

## justfile (283 lines, 31 recipes)
`build cache-on ci ci-fast client-test client-typecheck client-verify-build coverage db e2e eval
gen lint mutate mutate-core mutate-server(cap=34) observability-validate perf-budget playtest-down
playtest-preflight playtest-report playtest-up playtest-verify-build playtest-verify-release
playtest-wipe publish security setup smoke-republish test typecheck wasm`
- **Deleted recipes the harness still references:** `changelog`, `adr-digest`, `adr-digest-check`,
  `knowledge`, `knowledge-check`, `i18n-completion-check`, `a11y-e2e`, `security-signoff`.
- `just ci` = 10 steps, needs NO spacetime server; e2e needs one (exclusive). Coverage is
  report-only. Semgrep/SBOM are gone from CI. Nightly: mutate-core zero-tolerance, mutate-server
  cap 34, smoke-republish, perf-budget.

## Docs tree (12 files, current-state)
Root: `README.md`, `ARCHITECTURE.md` (~450 lines), `AGENTS.md` (48 lines), `CONTRIBUTING.md`,
`CHANGELOG.md` (generated), `CODE_OF_CONDUCT.md`. `docs/`: `DECISIONS.md`, `PLAYTEST.md`,
`runbooks/{playtest-ops,observability-dr,spacetimedb-upgrade}.md`, plus `docs/debloat/` (the
de-bloat audit trail — keep) and `docs/research/SEED-DOMAINS.md` (pending user relocation).

## CHANGELOG
`CHANGELOG.md` + `cliff.toml` exist; the `just changelog` recipe is **deleted** — regenerate via
`git cliff` directly, on demand. No freshness gate.

## Test/CI shape
nextest 1,954 · vitest 3,130 (client tests ARE typechecked now) · Playwright 90 listed (89 run +
1 permanent skip) in 24 files · warm `just ci` ≈ 87 s. Native-host reducer tests live in
`server-module/src/native_host_tests.rs`. Milestone-named test files no longer exist (feature
files). Zero process vocabulary (rb-NN / ADR-NNNN / milestone tags) in production source or docs
outside `docs/debloat/`.

## Frozen surfaces (unchanged by the de-bloat)
`client/src/module_bindings/` generated only (`just gen`); schema/reducer signatures frozen by
default (live-DB migration compatibility) — changes need bindings regen + publish-over-data proof;
the client-visible surface is pinned by `client-surface-privacy` + `evals/baselines/`.
