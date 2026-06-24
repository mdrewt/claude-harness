# Cross-project decisions log

Append-only summary of notable decisions (one line each) with a pointer to the
full ADR in the project repo.

| Date | Project | Decision | ADR |
|------|---------|----------|-----|
| 2026-06-23 | (harness) | Workspace setup per WORKSPACE-PLAN.md v2.1 | — |
| 2026-06-23 | (harness) | Built all 7 stack templates, sync-templates drift tool, harness test suite (5/5), SDD spec template + example | — |
| 2026-06-23 | (harness) | Fixed justfile syntax (just uses indented bodies, not `recipe: ; cmd`); added per-stack CI toolchain setup; added justfile-syntax guard test | — |
| 2026-06-23 | (harness) | Adopted from external CLAUDE.md: tiered+inverted principles, mechanical-enforcement map + /simplify, cost-aware doc routing, compaction/curation/honesty/diff rules, impact-analysis + code-graph MCP note | — |
| 2026-06-24 | (harness) | Ship PreToolUse destructive-command guard hook to generated projects | `docs/adr/0002-pretooluse-destructive-command-guard.md` |
| 2026-06-24 | (harness) | Auto-format edited files via PostToolUse hook (Biome/Ruff/rustfmt) | `docs/adr/0003-posttooluse-auto-format-hook.md` |
| 2026-06-24 | (harness) | Pin GitHub Actions to digests via Renovate preset | `docs/adr/0004-pin-github-actions-digests-via-renovate.md` |
| 2026-06-24 | (harness) | Cancel superseded CI runs via workflow concurrency group | `docs/adr/0005-cancel-superseded-ci-runs.md` |
| 2026-06-24 | (harness) | Mechanically enforce mutation/coverage/SCA gates (CI + invariants tests) | `docs/adr/0006-mechanical-enforcement-of-test-and-supply-chain-gates.md` |
