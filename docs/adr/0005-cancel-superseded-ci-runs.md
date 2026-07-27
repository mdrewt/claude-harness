# 0005. Cancel superseded CI runs via a concurrency group
- Status: accepted
- Date: 2026-06-24

## Context and problem statement
Pushing several commits in quick succession leaves stale CI runs executing,
burning runner minutes and producing confusing, out-of-date statuses.

## Considered alternatives
- Let every run finish — rejected: wastes runner minutes and clutters status.
- Manually cancel old runs — rejected: error-prone and easy to forget.

## Decision outcome
- Chosen: add a workflow `concurrency` group keyed by ref with
  `cancel-in-progress: true` so a new run supersedes the prior one.
- Consequences: only the newest commit's CI runs to completion; in-flight runs on
  the same ref are cancelled automatically.

## Confirmation
The concurrency group ships in `templates/_base/.github/workflows/ci.yml`
(`cancel-in-progress: true`); no test asserts it stays — beyond the file itself,
unenforced — review-only.
