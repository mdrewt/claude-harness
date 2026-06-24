# 0004. Pin GitHub Actions to digests via Renovate preset
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
Referencing third-party GitHub Actions by mutable tags (e.g. `@v2`) lets an
upstream tag be re-pointed at malicious code (supply-chain risk). We want
immutable, auditable action references that still receive managed updates.

## Considered alternatives
- Float on major tags (`@v2`) — rejected: tags are mutable; no supply-chain
  guarantee.
- Manually pin SHAs — rejected: pins rot and nobody updates them by hand.

## Decision outcome
- Chosen: enable Renovate's `helpers:pinGitHubActionDigests` preset in
  `_base/renovate.json` so actions are pinned to commit digests and bumped by
  managed PRs.
- Consequences: CI runs immutable action versions with an upgrade path;
  depends on Renovate being enabled for the repo.
